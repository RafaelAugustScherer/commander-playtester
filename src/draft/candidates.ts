import type { Card } from "../lib/types";
import type {
  BracketDeckInput,
  BracketEstimate,
  SearchCardRow,
  SearchCardsQuery,
  SearchCardsResult,
} from "../engine/draftQueries";
import { getEngine } from "../engine/EngineClient";
import { fetchCardsCached } from "../lib/scryfallCache";
import { frontFace } from "../lib/cardName";
import { extractThemeProfile, type ThemeProfile } from "./themes";
import { scoreCandidate, type CandidateScore } from "./scoring";
import { bracketTilt, type BracketTarget } from "./bracket";

/** The engine calls the draft pipeline needs — narrow enough to fake in tests. */
export interface DraftEngine {
  searchCards(query: SearchCardsQuery): Promise<SearchCardsResult>;
  estimateBracket(deck: BracketDeckInput): Promise<BracketEstimate | null>;
  isCommanderEligible(name: string): Promise<boolean>;
  commanderCandidates(): Promise<SearchCardRow[]>;
}

/** Card-name resolution the draft pipeline needs — narrow enough to fake in tests. */
export interface CardResolver {
  resolve(names: string[]): Promise<Map<string, Card>>;
}

/** Real `DraftEngine`, wrapping the shared engine worker client. */
export const engineDraftEngine: DraftEngine = {
  searchCards: (query) => getEngine().searchCards(query),
  estimateBracket: (deck) => getEngine().estimateBracket(deck),
  isCommanderEligible: (name) => getEngine().isCommanderEligible(name),
  commanderCandidates: () => getEngine().commanderCandidates(),
};

/** Real `CardResolver`, wrapping the Scryfall localStorage cache. */
export const scryfallCardResolver: CardResolver = {
  resolve: async (names) => (await fetchCardsCached(names)).cards,
};

export interface RankedCandidate {
  card: Card;
  score: CandidateScore;
  bracketTilt: number;
  total: number;
}

/** The deck-so-far's card names, for exclusion and bracket-estimate calls. */
export interface DraftDeckNames {
  commanders: string[];
  mainboard: string[];
}

const TOP_TOKEN_COUNT = 8;
const SEARCH_LIMIT_PER_TOKEN = 40;
const PRE_RANK_LIMIT = 40;
const BRACKET_SHORTLIST_SIZE = 12;
const COMMANDER_ROUND_SIZE = 3;

/** Per-session cache of `search_cards_js` rows by token — the card database is static. */
export type TokenSearchCache = Map<string, SearchCardRow[]>;

export function createTokenSearchCache(): TokenSearchCache {
  return new Map();
}

function topTokens(tokenWeights: Map<string, number>, count: number): string[] {
  return [...tokenWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([token]) => token);
}

async function searchToken(
  engine: DraftEngine,
  cache: TokenSearchCache,
  token: string,
): Promise<SearchCardRow[]> {
  const cached = cache.get(token);
  if (cached) return cached;
  const result = await engine.searchCards({ text: token, limit: SEARCH_LIMIT_PER_TOKEN });
  cache.set(token, result.results);
  return result.results;
}

/** Every letter of `identity` is in `allowed`; colorless (`[]`) always passes. */
function isWithinColorIdentity(identity: string[], allowed: string[]): boolean {
  return identity.every((color) => allowed.includes(color));
}

function isCommanderLegal(row: SearchCardRow): boolean {
  return row.legalities?.commander === "legal";
}

/** A legendary Background (e.g. "Legendary Enchantment — Background"). */
export function isBackground(card: Card): boolean {
  return /\bBackground\b/.test(card.typeLine);
}

/** Carries the "Choose a Background" keyword, printed verbatim on the card. */
export function hasChooseABackground(card: Card): boolean {
  return /\bchoose a background\b/i.test(card.oracleText);
}

/** The one Background among `cards`, or null if there are zero or several (ambiguous). */
export function singleBackgroundAmong(cards: Card[]): Card | null {
  const backgrounds = cards.filter(isBackground);
  return backgrounds.length === 1 ? backgrounds[0] : null;
}

interface CandidatePool {
  /** Row + summed weight of the tokens whose queries surfaced it, by lowercase name. */
  rows: Map<string, { row: SearchCardRow; weight: number }>;
}

async function collectCandidateRows(
  engine: DraftEngine,
  cache: TokenSearchCache,
  tokens: string[],
  tokenWeights: Map<string, number>,
  isAllowed: (row: SearchCardRow) => boolean,
): Promise<CandidatePool> {
  const rows = new Map<string, { row: SearchCardRow; weight: number }>();
  for (const token of tokens) {
    const weight = tokenWeights.get(token) ?? 0;
    const results = await searchToken(engine, cache, token);
    for (const row of results) {
      if (!isAllowed(row)) continue;
      const key = row.name.toLowerCase();
      const existing = rows.get(key);
      if (existing) existing.weight += weight;
      else rows.set(key, { row, weight });
    }
  }
  return { rows };
}

function preRankSlice(
  pool: CandidatePool,
  excluded: Set<string>,
  limit: number,
): SearchCardRow[] {
  return [...pool.rows.values()]
    .filter(({ row }) => !excluded.has(row.name.toLowerCase()))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(({ row }) => row);
}

async function enrichAndScore(
  resolver: CardResolver,
  rows: SearchCardRow[],
  profile: ThemeProfile,
): Promise<Array<{ card: Card; score: CandidateScore }>> {
  const resolved = await resolver.resolve(rows.map((row) => row.name));
  const out: Array<{ card: Card; score: CandidateScore }> = [];
  for (const row of rows) {
    const card = resolved.get(row.name.toLowerCase());
    if (!card) continue;
    out.push({ card, score: scoreCandidate(card, profile) });
  }
  return out;
}

async function withBracketTilt(
  engine: DraftEngine,
  deck: DraftDeckNames,
  target: BracketTarget,
  scored: Array<{ card: Card; score: CandidateScore }>,
): Promise<RankedCandidate[]> {
  const byTheme = [...scored].sort((a, b) => b.score.total - a.score.total);
  const shortlist = byTheme.slice(0, BRACKET_SHORTLIST_SIZE);
  const rest = byTheme.slice(BRACKET_SHORTLIST_SIZE);

  const ranked: RankedCandidate[] = [];
  for (const { card, score } of shortlist) {
    const estimate = await engine.estimateBracket({
      commander: deck.commanders.map(frontFace),
      main_deck: [...deck.mainboard, card.name].map(frontFace),
    });
    const tilt = bracketTilt(estimate, target);
    ranked.push({ card, score, bracketTilt: tilt, total: score.total + tilt });
  }
  for (const { card, score } of rest) {
    ranked.push({ card, score, bracketTilt: 0, total: score.total });
  }
  return ranked.sort((a, b) => b.total - a.total);
}

export interface SuggestCandidatesOptions {
  engine: DraftEngine;
  resolver: CardResolver;
  target: BracketTarget;
  /** Names to leave out beyond the deck's own cards (e.g. shown-this-round), lowercase or not. */
  exclude?: Set<string>;
  tokenCache?: TokenSearchCache;
}

/**
 * Rank candidates for the deck's 99: engine search on the deck's top theme
 * tokens, filtered to the commander's color identity and Commander legality,
 * pre-ranked by matched-token weight, then scored and bracket-tilted for a
 * bounded shortlist. Sorted highest-fit first.
 */
export async function suggestCandidates(
  deck: DraftDeckNames,
  profile: ThemeProfile,
  opts: SuggestCandidatesOptions,
): Promise<RankedCandidate[]> {
  const { engine, resolver, target } = opts;
  const cache = opts.tokenCache ?? createTokenSearchCache();
  const excluded = new Set(
    [...deck.commanders, ...deck.mainboard, ...(opts.exclude ?? [])].map((n) =>
      n.toLowerCase(),
    ),
  );

  const tokens = topTokens(profile.tokenWeights, TOP_TOKEN_COUNT);
  const pool = await collectCandidateRows(
    engine,
    cache,
    tokens,
    profile.tokenWeights,
    (row) =>
      isWithinColorIdentity(row.color_identity, profile.colorIdentity) &&
      isCommanderLegal(row),
  );
  const slice = preRankSlice(pool, excluded, PRE_RANK_LIMIT);
  const scored = await enrichAndScore(resolver, slice, profile);
  return withBracketTilt(engine, deck, target, scored);
}

export interface SuggestCommandersOptions {
  engine: DraftEngine;
  resolver: CardResolver;
  exclude?: Set<string>;
  tokenCache?: TokenSearchCache;
}

/**
 * Rank commander-eligible candidates for a seed of base cards (no color
 * identity is known yet, since no commander has been chosen). A candidate is
 * only offered if the union of the base cards' color identities fits inside
 * its own — the same hard rule that governs a real Commander deck — unless
 * exactly one base card is a Background and the candidate has "Choose a
 * Background", in which case the candidate's identity may union with the
 * Background's to cover the base cards. Sorted highest fit to the base cards
 * first.
 */
export async function suggestCommanders(
  baseCards: Card[],
  opts: SuggestCommandersOptions,
): Promise<RankedCandidate[]> {
  const { engine, resolver } = opts;
  const cache = opts.tokenCache ?? createTokenSearchCache();
  const excluded = new Set(
    [...baseCards.map((c) => c.name), ...(opts.exclude ?? [])].map((n) =>
      n.toLowerCase(),
    ),
  );

  const profile = profileFromBaseCards(baseCards);
  const tokens = topTokens(profile.tokenWeights, TOP_TOKEN_COUNT);
  const pool = await collectCandidateRows(
    engine,
    cache,
    tokens,
    profile.tokenWeights,
    isCommanderLegal,
  );
  const slice = preRankSlice(pool, excluded, PRE_RANK_LIMIT);

  const eligible: SearchCardRow[] = [];
  for (const row of slice) {
    if (await engine.isCommanderEligible(row.name)) eligible.push(row);
  }

  const requiredIdentity = [...new Set(baseCards.flatMap((c) => c.colorIdentity))];
  const background = singleBackgroundAmong(baseCards);
  const coversBaseCards = (card: Card) => {
    if (isWithinColorIdentity(requiredIdentity, card.colorIdentity)) return true;
    return (
      background !== null &&
      hasChooseABackground(card) &&
      isWithinColorIdentity(requiredIdentity, [
        ...card.colorIdentity,
        ...background.colorIdentity,
      ])
    );
  };

  const scored = await enrichAndScore(resolver, eligible, profile);
  const covering = scored.filter(({ card }) => coversBaseCards(card));

  if (covering.length < COMMANDER_ROUND_SIZE) {
    const themedNames = new Set(covering.map(({ card }) => card.name.toLowerCase()));
    const fallbackRows = (await engine.commanderCandidates()).filter(
      (row) =>
        !excluded.has(row.name.toLowerCase()) &&
        !themedNames.has(row.name.toLowerCase()) &&
        (isWithinColorIdentity(requiredIdentity, row.color_identity) ||
          (background !== null &&
            isWithinColorIdentity(requiredIdentity, [
              ...row.color_identity,
              ...background.colorIdentity,
            ]))),
    );
    const fallback = await enrichAndScore(resolver, fallbackRows, profile);
    covering.push(...fallback.filter(({ card }) => coversBaseCards(card)));
  }

  return covering
    .map(({ card, score }) => ({ card, score, bracketTilt: 0, total: score.total }))
    .sort((a, b) => b.total - a.total);
}

function profileFromBaseCards(baseCards: Card[]): ThemeProfile {
  return extractThemeProfile([], baseCards);
}
