import type { Card } from "../lib/types";
import type {
  DraftCandidateData,
  RankCardCandidatesInput,
  RankedCardName,
} from "../engine/draftQueries";
import { getEngine } from "../engine/EngineClient";
import { fetchCardsCached } from "../lib/scryfallCache";
import { extractThemeProfile, type ThemeProfile } from "./themes";
import { scoreCandidate, type CandidateScore } from "./scoring";
import type { BracketTarget } from "./bracket";
import { draftCandidateCard } from "./localCandidates";

/** The engine calls the draft pipeline needs — narrow enough to fake in tests. */
export interface DraftEngine {
  commanderCandidates(): Promise<DraftCandidateData[]>;
  rankCardCandidates(input: RankCardCandidatesInput): Promise<RankedCardName[]>;
  resolveCards(names: string[]): Promise<DraftCandidateData[]>;
}

/** Card-name resolution the draft pipeline needs — narrow enough to fake in tests. */
export interface CardResolver {
  resolve(names: string[]): Promise<Map<string, Card>>;
}

/** Real `DraftEngine`, wrapping the shared engine worker client. */
export const engineDraftEngine: DraftEngine = {
  commanderCandidates: () => getEngine().commanderCandidates(),
  rankCardCandidates: (input) => getEngine().rankCardCandidates(input),
  resolveCards: (names) => getEngine().resolveCards(names),
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

const COMMANDER_ROUND_SIZE = 3;
const EXTRA_COMMANDER_COLOR_PENALTY = 2;

/** Every letter of `identity` is in `allowed`; colorless (`[]`) always passes. */
function isWithinColorIdentity(identity: string[], allowed: string[]): boolean {
  return identity.every((color) => allowed.includes(color));
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

export interface SuggestCandidatesOptions {
  engine: DraftEngine;
  resolver: CardResolver;
  target: BracketTarget;
  /** Names to leave out beyond the deck's own cards (e.g. shown-this-round), lowercase or not. */
  exclude?: Set<string>;
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
  const excluded = new Set(
    [...deck.commanders, ...deck.mainboard, ...(opts.exclude ?? [])].map((n) =>
      n.toLowerCase(),
    ),
  );
  const ranked = await engine.rankCardCandidates({
    commanders: deck.commanders,
    mainboard: deck.mainboard,
    profile: {
      ...profile,
      tokenWeights: [...profile.tokenWeights],
    },
    target,
    exclude: [...excluded],
  });
  const resolved = await resolver.resolve(ranked.map(({ name }) => name));
  return ranked.flatMap(({ name, bracketTilt }) => {
    const card = resolved.get(name.toLowerCase());
    if (!card) return [];
    const score = scoreCandidate(card, profile);
    return [{ card, score, bracketTilt, total: score.total + bracketTilt }];
  });
}

export interface SuggestCommandersOptions {
  engine: DraftEngine;
  resolver: CardResolver;
  exclude?: Set<string>;
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
  const excluded = new Set(
    [...baseCards.map((c) => c.name), ...(opts.exclude ?? [])].map((n) =>
      n.toLowerCase(),
    ),
  );

  const profile = profileFromBaseCards(baseCards);
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

  const ranked = (await engine.commanderCandidates())
    .map(draftCandidateCard)
    .filter(
      (card) => !excluded.has(card.name.toLowerCase()) && coversBaseCards(card),
    )
    .map((card) => {
      const score = scoreCandidate(card, profile);
      const identity =
        background !== null && hasChooseABackground(card)
          ? [...new Set([...card.colorIdentity, ...background.colorIdentity])]
          : card.colorIdentity;
      const extraColors = identity.filter(
        (color) => !requiredIdentity.includes(color),
      ).length;
      return {
        card,
        score,
        bracketTilt: 0,
        total: score.total - extraColors * EXTRA_COMMANDER_COLOR_PENALTY,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, COMMANDER_ROUND_SIZE);

  const resolved = await resolver.resolve(ranked.map(({ card }) => card.name));
  return ranked.flatMap((candidate) => {
    const card = resolved.get(candidate.card.name.toLowerCase());
    return card ? [{ ...candidate, card }] : [];
  });
}

function profileFromBaseCards(baseCards: Card[]): ThemeProfile {
  return extractThemeProfile([], baseCards);
}
