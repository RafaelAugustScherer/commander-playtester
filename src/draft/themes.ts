import { isLastingRamp, manaSpent } from "../lib/ramp";
import { isCreature, isLand, type Card, type CardRole } from "../lib/types";
import { cardAdvantageValue } from "./cardAdvantage";
import { isProtection, protectionTarget } from "./protection";
import { commanderThemeTokens, creatureTypesOf, themeTokens, rewardedTokens } from "./tokens";

/** How many times a commander's tokens count against the same token from the 99. */
export const COMMANDER_WEIGHT = 3;

/**
 * Extra weight, on top of `COMMANDER_WEIGHT`, for what a commander rewards: the
 * mechanic its "whenever …" trigger conditions name and the tribes its text
 * names. Calibrated so over half of Hylda of the Icy Crown's offers tap
 * creatures (`deck-draft/ADR-0005`).
 */
export const REWARD_WEIGHT = 5;

/** How many creatures of a type it takes to get most of the way to a tribe's full bonus. */
export const TRIBAL_SATURATION = 3;

/**
 * The most weight a token draws from the 99, however many of them carry it, so
 * the theme stops growing as the deck fills and broad tokens cannot bury what
 * the commander asks for (`deck-draft/ADR-0013`).
 */
export const DECK_TOKEN_CAP = 3;
/** How many cards carrying a token it takes to reach most of `DECK_TOKEN_CAP`. */
export const DECK_TOKEN_SATURATION = 3;

/** Number of mana-value buckets in a curve histogram (0..6, plus a 7+ bucket). */
const CURVE_BUCKETS = 8;

export interface ThemeProfile {
  tokenWeights: Map<string, number>;
  /** Mana-value histogram, index 0..6 plus a 7+ bucket at index 7. */
  curve: number[];
  roleCounts: Record<CardRole, number>;
  colorIdentity: string[];
  /** Creatures in the deck by creature type, commanders included. */
  creatureTypes: Map<string, number>;
  /** Creatures in the deck, commanders included. */
  creatureCount: number;
  /** The tribes the author selected in tribal mode, lowercase; empty when off. */
  tribes: string[];
  manaAppetite: number;
  nonlandCount: number;
  rampCount: number;
  /** Protection pieces the deck aims for, set by its commanders (`deck-draft/ADR-0013`). */
  protectionTarget: number;
  /** Protection pieces among the 99. */
  protectionCount: number;
  /** Card advantage among the 99: draw engines count 1, big draw spells ½. */
  cardAdvantageCount: number;
}

/**
 * Summarize a deck so far into the profile candidates get scored against:
 * weighted theme tokens (`commander weighting` applied, and more again for
 * what a commander rewards), the mana curve, role
 * counts, the commanders' color identity, the deck's creatures by type, and the
 * tribes selected in tribal mode.
 */
export function extractThemeProfile(
  commanders: Card[],
  others: Card[],
  tribes: readonly string[] = [],
): ThemeProfile {
  const tokenWeights = new Map<string, number>();
  const curve = new Array(CURVE_BUCKETS).fill(0);
  const roleCounts: Record<CardRole, number> = {
    land: 0,
    ramp: 0,
    draw: 0,
    removal: 0,
    other: 0,
  };

  const creatureTypes = new Map<string, number>();
  let creatureCount = 0;
  let appetiteSum = 0;
  let appetiteWeight = 0;

  for (const card of commanders) {
    addTokenWeights(tokenWeights, commanderThemeTokens(card), COMMANDER_WEIGHT);
    addTokenWeights(tokenWeights, rewardedTokens(card), REWARD_WEIGHT);
    addCurveAndRoles(curve, roleCounts, card);
    if (!isLand(card)) {
      appetiteSum += COMMANDER_WEIGHT * manaSpent(card);
      appetiteWeight += COMMANDER_WEIGHT;
    }
  }
  const deckTokenCounts = new Map<string, number>();
  for (const card of others) {
    addTokenWeights(deckTokenCounts, themeTokens(card), 1);
    addCurveAndRoles(curve, roleCounts, card);
  }
  for (const [token, count] of deckTokenCounts) {
    tokenWeights.set(token, (tokenWeights.get(token) ?? 0) + deckTokenWeight(count));
  }
  const library = countLibrary(others);
  appetiteSum += library.appetiteSum;
  appetiteWeight += library.appetiteWeight;
  for (const card of [...commanders, ...others]) {
    if (!isCreature(card)) continue;
    creatureCount++;
    for (const type of creatureTypesOf(card)) {
      creatureTypes.set(type, (creatureTypes.get(type) ?? 0) + 1);
    }
  }

  return {
    tokenWeights,
    curve,
    roleCounts,
    colorIdentity: colorIdentityOf(commanders),
    creatureTypes,
    creatureCount,
    tribes: [...new Set(tribes.map((tribe) => tribe.toLowerCase()))],
    manaAppetite: appetiteWeight > 0 ? appetiteSum / appetiteWeight : 0,
    nonlandCount: library.nonlandCount,
    rampCount: library.rampCount,
    protectionTarget: protectionTarget(commanders),
    protectionCount: library.protectionCount,
    cardAdvantageCount: library.cardAdvantageCount,
  };
}

interface LibraryCounts {
  nonlandCount: number;
  rampCount: number;
  protectionCount: number;
  cardAdvantageCount: number;
  /** Mana spent over the nonland cards other than lasting ramp, for `manaAppetite`. */
  appetiteSum: number;
  appetiteWeight: number;
}

/** What the 99's nonland cards hold: the fundamentals buckets and the mana they spend. */
function countLibrary(others: Card[]): LibraryCounts {
  const counts: LibraryCounts = {
    nonlandCount: 0,
    rampCount: 0,
    protectionCount: 0,
    cardAdvantageCount: 0,
    appetiteSum: 0,
    appetiteWeight: 0,
  };
  for (const card of others) {
    if (isLand(card)) continue;
    counts.nonlandCount++;
    if (isProtection(card)) counts.protectionCount++;
    counts.cardAdvantageCount += cardAdvantageValue(card);
    if (isLastingRamp(card)) {
      counts.rampCount++;
    } else {
      counts.appetiteSum += manaSpent(card);
      counts.appetiteWeight++;
    }
  }
  return counts;
}

/** The weight `count` cards of the 99 give a token: it levels off at `DECK_TOKEN_CAP`. */
export function deckTokenWeight(count: number): number {
  return DECK_TOKEN_CAP * (1 - Math.exp(-count / DECK_TOKEN_SATURATION));
}

function addTokenWeights(
  weights: Map<string, number>,
  tokens: ReadonlySet<string>,
  weight: number,
): void {
  for (const token of tokens) {
    weights.set(token, (weights.get(token) ?? 0) + weight);
  }
}

function addCurveAndRoles(
  curve: number[],
  roleCounts: Record<CardRole, number>,
  card: Card,
): void {
  const bucket = Math.max(0, Math.min(CURVE_BUCKETS - 1, Math.floor(card.manaValue)));
  curve[bucket]++;
  for (const role of card.roles) roleCounts[role]++;
}

function colorIdentityOf(commanders: Card[]): string[] {
  const colors = new Set<string>();
  for (const commander of commanders) {
    for (const color of commander.colorIdentity) colors.add(color);
  }
  return [...colors].sort();
}
