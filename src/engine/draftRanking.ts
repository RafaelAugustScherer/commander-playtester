import type {
  CardFaceData,
  DraftCandidateData,
  DraftQueryExports,
  EngineThemeProfile,
  RankCardCandidatesInput,
  RankCardCandidatesResult,
  RankedCardName,
  SearchCardRow,
} from "./draftQueries";
import { frontFace } from "../lib/cardName";
import { bracketTilt } from "../draft/bracket";
import {
  draftCandidateCard,
  rankLocalCandidates,
  type LocallyRankedCandidate,
} from "../draft/localCandidates";
import type { ThemeProfile } from "../draft/themes";
import { isUtilityLand } from "../draft/lands";
import { isSuggestable } from "../draft/customization";
import { cardTokens, isOfTribe, mentionsSubtype, tokenSearches } from "../draft/tokens";
import {
  DRAFT_CARD_TYPES,
  allocateSlots,
  cardTypeSignals,
  isBasicLandName,
  primaryType,
  targetMix,
  typeWeights,
  zeroCounts,
  type DraftCardType,
  type TypeBalance,
  type TypeCounts,
} from "../draft/typeBalance";

const THEME_COUNT = 8;
// A theme token's matches are sorted by popularity, then the top slice kept.
// The scan pulls every match first so the slice is the most-played matches,
// not an alphabetical prefix (a common token like "graveyard" has thousands).
const TOKEN_MATCH_SCAN = 100_000;
const THEME_CANDIDATES_PER_TOKEN = 250;
const TYPE_CANDIDATES_PER_TYPE = 250;
const BRACKET_SHORTLIST_SIZE = 12;
const ROUND_SIZE = 3;
// How hard reprint frequency (our only in-data popularity proxy) tilts the
// ranking. Applied to log2(1 + printings), so it nudges ties toward staples
// without overriding a clearly better theme fit. Calibrated (0.75) against
// EDHREC staple lists for popular commanders (deck-draft/ADR-0002).
const POPULARITY_WEIGHT = 0.75;
const LAND_FIXING_WEIGHT = 1;

const TYPE_LINE_FILTER: Record<DraftCardType, string> = {
  land: "Land",
  creature: "Creature",
  instant: "Instant",
  sorcery: "Sorcery",
  artifact: "Artifact",
  enchantment: "Enchantment",
  planeswalker: "Planeswalker",
};

interface CardRecord {
  card_type?: CardFaceData["card_type"];
  metadata?: { source_printing_ids?: unknown };
}

export interface DraftRanker {
  rankCardCandidates(input: RankCardCandidatesInput): RankCardCandidatesResult;
}

export function cardTypeLine(cardType: CardFaceData["card_type"]): string {
  const types = [...(cardType?.supertypes ?? []), ...(cardType?.core_types ?? [])];
  const subtypes = cardType?.subtypes ?? [];
  return subtypes.length > 0 ? `${types.join(" ")} — ${subtypes.join(" ")}` : types.join(" ");
}

export function candidateData(
  queries: DraftQueryExports,
  card: SearchCardRow,
): DraftCandidateData | null {
  const face = queries.get_card_face_data(card.name);
  if (!face) return null;
  return {
    name: card.name,
    manaValue: card.mana_value,
    typeLine: cardTypeLine(face.card_type),
    oracleText: face.oracle_text ?? "",
    colorIdentity: card.color_identity,
  };
}

function isDraftableAs(typeLine: string, type: DraftCardType): boolean {
  return primaryType(typeLine) === type && !/\bBasic\b/.test(typeLine);
}

function themeProfile(profile: EngineThemeProfile): ThemeProfile {
  return {
    ...profile,
    tribes: profile.tribes ?? [],
    tokenWeights: new Map(profile.tokenWeights),
    creatureTypes: new Map(profile.creatureTypes),
  };
}

function subtypeTypesOf(records: Record<string, CardRecord>): Map<string, DraftCardType> {
  const votes = new Map<string, TypeCounts>();
  for (const record of Object.values(records)) {
    const type = primaryType(cardTypeLine(record?.card_type));
    if (!type) continue;
    for (const subtype of record.card_type?.subtypes ?? []) {
      const key = subtype.toLowerCase();
      const counts = votes.get(key) ?? zeroCounts();
      counts[type]++;
      votes.set(key, counts);
    }
  }
  const subtypeTypes = new Map<string, DraftCardType>();
  for (const [subtype, counts] of votes) {
    subtypeTypes.set(
      subtype,
      DRAFT_CARD_TYPES.reduce((best, type) => (counts[type] > counts[best] ? type : best)),
    );
  }
  return subtypeTypes;
}

// Lowercase card name -> number of printings, our proxy for how played a card
// is (EDHREC-style play-rate data is not in the card database). Built once from
// the same card-data JSON the engine loads — no network, no Scryfall.
function printingCountsOf(records: Record<string, CardRecord>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key, record] of Object.entries(records)) {
    const ids = record?.metadata?.source_printing_ids;
    counts.set(key.toLowerCase(), Array.isArray(ids) ? ids.length : 0);
  }
  return counts;
}

export function createDraftRanker(
  queries: DraftQueryExports,
  cardDataJson: string,
): DraftRanker {
  const records = JSON.parse(cardDataJson) as Record<string, CardRecord>;
  const printingCounts = printingCountsOf(records);
  const subtypeTypes = subtypeTypesOf(records);
  const wholeCardNames = new Set(
    queries.search_cards_js({ limit: TOKEN_MATCH_SCAN }).results.map((row) => row.name.toLowerCase()),
  );
  const themeCache = new Map<string, DraftCandidateData[]>();
  const typeCache = new Map<string, DraftCandidateData[]>();
  const subtypeCache = new Map<string, DraftCandidateData[]>();
  const faceCache = new Map<string, CardFaceData | null>();
  const signalCache = new Map<string, TypeCounts>();

  function popularityBonus(name: string): number {
    const printings = printingCounts.get(name.trim().toLowerCase()) ?? 0;
    return POPULARITY_WEIGHT * Math.log2(1 + printings);
  }

  function faceOf(name: string): CardFaceData | null {
    const key = name.trim().toLowerCase();
    if (!faceCache.has(key)) {
      faceCache.set(
        key,
        queries.get_card_face_data(name) ?? queries.get_card_face_data(frontFace(name)),
      );
    }
    return faceCache.get(key) ?? null;
  }

  function signalsOf(name: string): TypeCounts {
    const key = name.trim().toLowerCase();
    let signals = signalCache.get(key);
    if (!signals) {
      const face = faceOf(name);
      signals = face ? cardTypeSignals(face, subtypeTypes) : zeroCounts();
      signalCache.set(key, signals);
    }
    return signals;
  }

  function deckBalance(
    commanders: string[],
    mainboard: string[],
    colorCount: number,
    planeswalkers: boolean,
  ): TypeBalance {
    const have = zeroCounts();
    let basicLands = 0;
    for (const name of mainboard) {
      const face = faceOf(name);
      const type = face ? primaryType(cardTypeLine(face.card_type)) : null;
      if (type) have[type]++;
      if (isBasicLandName(name)) basicLands++;
    }
    const weights = typeWeights(
      commanders.map(signalsOf),
      [...new Set(mainboard)].map(signalsOf),
    );
    const { counts, nonbasicLands } = targetMix(
      weights,
      colorCount,
      100 - commanders.length,
      planeswalkers,
    );
    return { target: counts, nonbasicLandTarget: nonbasicLands, have, basicLands };
  }

  // A curated oracle-text token searches its own words, then keeps only the
  // rows its pattern really matches, so the slice is the most-played fits
  // rather than every card that happens to say "tap" (deck-draft/ADR-0005).
  function textCandidates(token: string): DraftCandidateData[] {
    let candidates = themeCache.get(token);
    if (!candidates) {
      const searches = tokenSearches(token);
      const seen = new Set<string>();
      const rows = (searches ?? [token])
        .flatMap((text) => queries.search_cards_js({ text, limit: TOKEN_MATCH_SCAN }).results)
        .filter((card) => {
          const name = card.name.toLowerCase();
          if (seen.has(name)) return false;
          seen.add(name);
          return card.legalities?.commander === "legal" && wholeCardNames.has(name);
        })
        .sort((a, b) => popularityBonus(b.name) - popularityBonus(a.name));
      candidates = [];
      for (const row of rows) {
        if (candidates.length >= THEME_CANDIDATES_PER_TOKEN) break;
        const candidate = candidateData(queries, row);
        if (!candidate) continue;
        if (searches && !cardTokens(draftCandidateCard(candidate)).has(token)) continue;
        candidates.push(candidate);
      }
      themeCache.set(token, candidates);
    }
    return candidates;
  }

  function typeLineRows(typeLine: string, identity: string[]): SearchCardRow[] {
    const seen = new Set<string>();
    return queries
      .search_cards_js({ type_line: typeLine, legal_format: "commander", limit: TOKEN_MATCH_SCAN })
      .results.filter((row) => {
        const name = row.name.toLowerCase();
        if (seen.has(name) || !wholeCardNames.has(name)) return false;
        seen.add(name);
        return row.color_identity.every((color) => identity.includes(color));
      })
      .sort((a, b) => popularityBonus(b.name) - popularityBonus(a.name));
  }

  function subtypeCandidates(subtype: string, identity: string[]): DraftCandidateData[] {
    const key = `${subtype}|${[...identity].sort().join("")}`;
    let candidates = subtypeCache.get(key);
    if (!candidates) {
      candidates = typeLineRows(subtype, identity)
        .slice(0, THEME_CANDIDATES_PER_TOKEN)
        .flatMap((row) => {
          const candidate = candidateData(queries, row);
          return candidate ? [candidate] : [];
        });
      subtypeCache.set(key, candidates);
    }
    return candidates;
  }

  function themeCandidates(profile: ThemeProfile, rulesTexts: string[]): DraftCandidateData[] {
    const tokens = [...profile.tokenWeights]
      .sort((a, b) => b[1] - a[1])
      .slice(0, THEME_COUNT)
      .map(([token]) => token);
    const candidates = new Map<string, DraftCandidateData>();
    for (const token of tokens) {
      const tribal =
        subtypeTypes.has(token) && rulesTexts.some((text) => mentionsSubtype(text, token))
          ? subtypeCandidates(token, profile.colorIdentity)
          : [];
      for (const candidate of [...textCandidates(token), ...tribal]) {
        candidates.set(candidate.name.toLowerCase(), candidate);
      }
    }
    return [...candidates.values()];
  }

  // Tribal mode: every selected tribe's most-printed members, the cards that
  // name it, and the Changelings, whatever the theme tokens say.
  function tribalCandidates(profile: ThemeProfile): DraftCandidateData[] {
    if (profile.tribes.length === 0) return [];
    return [
      ...profile.tribes.flatMap((tribe) => [
        ...subtypeCandidates(tribe, profile.colorIdentity),
        ...textCandidates(tribe),
      ]),
      ...textCandidates("changeling"),
    ];
  }

  function typeCandidates(type: DraftCardType, identity: string[]): DraftCandidateData[] {
    const key = `${type}|${[...identity].sort().join("")}`;
    const cached = typeCache.get(key);
    if (cached) return cached;
    const candidates: DraftCandidateData[] = [];
    for (const row of typeLineRows(TYPE_LINE_FILTER[type], identity)) {
      if (candidates.length >= TYPE_CANDIDATES_PER_TYPE) break;
      const candidate = candidateData(queries, row);
      if (candidate && isDraftableAs(candidate.typeLine, type)) candidates.push(candidate);
    }
    typeCache.set(key, candidates);
    return candidates;
  }

  function slotFit(
    { card, score }: LocallyRankedCandidate,
    slotType: DraftCardType,
    identity: string[],
  ): number {
    if (slotType !== "land") return score.total + popularityBonus(card.name);
    const colorsMade = card.colorIdentity.filter((color) => identity.includes(color)).length;
    return popularityBonus(card.name) + LAND_FIXING_WEIGHT * Math.max(0, colorsMade - 1);
  }

  function bestForSlot(
    ranked: LocallyRankedCandidate[],
    slotType: DraftCardType,
    taken: Set<string>,
    input: RankCardCandidatesInput,
  ): RankedCardName | null {
    const identity = input.profile.colorIdentity;
    const tribes = input.profile.tribes ?? [];
    const shortlist = ranked
      .filter(
        ({ card }) =>
          !taken.has(card.name.toLowerCase()) &&
          isDraftableAs(card.typeLine, slotType) &&
          (slotType !== "creature" || tribes.length === 0 || isOfTribe(card, tribes)) &&
          // A one-colour deck has nothing to fix: only lands that do something else.
          (slotType !== "land" || identity.length > 1 || isUtilityLand(card)),
      )
      .map((candidate) => ({ card: candidate.card, fit: slotFit(candidate, slotType, identity) }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, BRACKET_SHORTLIST_SIZE);
    let best: { name: string; tilt: number; total: number } | null = null;
    for (const { card, fit } of shortlist) {
      const estimate = queries.estimate_bracket_for_deck({
        commander: input.commanders.map(frontFace),
        main_deck: [...input.mainboard, card.name].map(frontFace),
      });
      const tilt = bracketTilt(estimate, input.target);
      const total = fit + tilt;
      if (!best || total > best.total) best = { name: card.name, tilt, total };
    }
    return best ? { name: best.name, bracketTilt: best.tilt, slotType } : null;
  }

  function rankCardCandidates(input: RankCardCandidatesInput): RankCardCandidatesResult {
    const profile = themeProfile(input.profile);
    const excluded = new Set(input.exclude.map((name) => name.toLowerCase()));
    const suggestable = (candidate: DraftCandidateData) =>
      isSuggestable(candidate, input.customization);
    const balance = deckBalance(
      input.commanders,
      input.mainboard,
      profile.colorIdentity.length,
      input.customization.planeswalkers,
    );
    const typePools = new Map(
      DRAFT_CARD_TYPES.map((type) => [
        type,
        typeCandidates(type, profile.colorIdentity).filter(suggestable),
      ]),
    );
    const eligible = DRAFT_CARD_TYPES.filter((type) =>
      typePools.get(type)?.some((candidate) => !excluded.has(candidate.name.toLowerCase())),
    );
    const slotTypes = input.slotTypes ?? allocateSlots(balance, ROUND_SIZE, eligible);

    const rulesTexts = [...input.commanders, ...new Set(input.mainboard)].map(
      (name) => faceOf(name)?.oracle_text ?? "",
    );
    const pool = new Map<string, DraftCandidateData>();
    const slotPools = [...new Set(slotTypes)].flatMap((type) => typePools.get(type) ?? []);
    for (const candidate of [
      ...themeCandidates(profile, rulesTexts),
      ...tribalCandidates(profile),
      ...slotPools,
    ]) {
      if (suggestable(candidate)) pool.set(candidate.name.toLowerCase(), candidate);
    }
    const ranked = rankLocalCandidates([...pool.values()], profile, excluded, popularityBonus);

    const taken = new Set<string>();
    const candidates: RankedCardName[] = [];
    for (const slotType of slotTypes) {
      const best = bestForSlot(ranked, slotType, taken, input);
      if (!best) continue;
      taken.add(best.name.toLowerCase());
      candidates.push(best);
    }
    return { candidates, balance };
  }

  return { rankCardCandidates };
}
