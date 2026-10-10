import { isLastingRamp, manaSpent } from "../lib/ramp";
import { isCreature, isLand, type Card } from "../lib/types";
import { saturate } from "./curves";
import { measureBuckets, type BucketName, type BucketState } from "./fundamentals";
import { commanderThemeTokens, creatureTypesOf, themeTokens, rewardedTokens } from "./tokens";

export { TRIBAL_SATURATION } from "./curves";

/** How many times a commander's tokens count against the same token from the 99. */
export const COMMANDER_WEIGHT = 3;

/**
 * Extra weight, on top of `COMMANDER_WEIGHT`, for what a commander rewards: the
 * mechanic its "whenever …" trigger conditions name and the tribes its text
 * names. Calibrated so over half of Hylda of the Icy Crown's offers tap
 * creatures (`deck-draft/ADR-0005`).
 */
export const REWARD_WEIGHT = 5;

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
  /** Removal in the deck, commanders included. */
  removalCount: number;
  colorIdentity: string[];
  /** Creatures in the deck by creature type, commanders included. */
  creatureTypes: Map<string, number>;
  /** Creatures in the deck, commanders included. */
  creatureCount: number;
  /** The tribes the author selected in tribal mode, lowercase; empty when off. */
  tribes: string[];
  manaAppetite: number;
  nonlandCount: number;
  /** Each `fundamentals bucket`'s target and count (`deck-draft/ADR-0013`). */
  buckets: Record<BucketName, BucketState>;
}

/**
 * Summarize a deck so far into the profile candidates get scored against:
 * weighted theme tokens (`commander weighting` applied, and more again for
 * what a commander rewards), the mana curve, the removal count, the
 * commanders' color identity, the deck's creatures by type, the tribes
 * selected in tribal mode, its mana appetite and its fundamentals buckets.
 */
export function extractThemeProfile(
  commanders: Card[],
  others: Card[],
  tribes: readonly string[] = [],
): ThemeProfile {
  const deck = [...commanders, ...others];
  const nonland = others.filter((card) => !isLand(card));
  const creatures = deck.filter(isCreature);
  return {
    tokenWeights: themeWeights(commanders, others),
    curve: manaCurve(deck),
    removalCount: deck.filter((card) => card.roles.includes("removal")).length,
    colorIdentity: colorIdentityOf(commanders),
    creatureTypes: countBy(creatures.flatMap(creatureTypesOf)),
    creatureCount: creatures.length,
    tribes: [...new Set(tribes.map((tribe) => tribe.toLowerCase()))],
    manaAppetite: manaAppetite(commanders, nonland),
    nonlandCount: nonland.length,
    buckets: measureBuckets(commanders, nonland),
  };
}

/**
 * The deck's theme: each commander's tokens at `COMMANDER_WEIGHT` and what it
 * rewards at `REWARD_WEIGHT` more, plus what the 99 add, levelling off.
 */
function themeWeights(commanders: Card[], others: Card[]): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (token: string, weight: number) =>
    weights.set(token, (weights.get(token) ?? 0) + weight);
  for (const card of commanders) {
    for (const token of commanderThemeTokens(card)) add(token, COMMANDER_WEIGHT);
    for (const token of rewardedTokens(card)) add(token, REWARD_WEIGHT);
  }
  for (const [token, count] of countBy(others.flatMap((card) => [...themeTokens(card)]))) {
    add(token, deckTokenWeight(count));
  }
  return weights;
}

/**
 * How much mana the deck wants to spend (`deck-draft/ADR-0009`): the average of
 * each nonland card's priciest spend, lasting ramp left out and the commanders
 * counted `COMMANDER_WEIGHT` times.
 */
function manaAppetite(commanders: Card[], nonland: Card[]): number {
  const spends = [
    ...commanders
      .filter((card) => !isLand(card))
      .map((card) => ({ spent: manaSpent(card), weight: COMMANDER_WEIGHT })),
    ...nonland
      .filter((card) => !isLastingRamp(card))
      .map((card) => ({ spent: manaSpent(card), weight: 1 })),
  ];
  const weight = spends.reduce((sum, s) => sum + s.weight, 0);
  return weight > 0 ? spends.reduce((sum, s) => sum + s.spent * s.weight, 0) / weight : 0;
}

/** The weight `count` cards of the 99 give a token: it levels off at `DECK_TOKEN_CAP`. */
export function deckTokenWeight(count: number): number {
  return DECK_TOKEN_CAP * saturate(count, DECK_TOKEN_SATURATION);
}

function manaCurve(deck: Card[]): number[] {
  const curve = new Array(CURVE_BUCKETS).fill(0);
  for (const card of deck) {
    curve[Math.max(0, Math.min(CURVE_BUCKETS - 1, Math.floor(card.manaValue)))]++;
  }
  return curve;
}

function countBy(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function colorIdentityOf(commanders: Card[]): string[] {
  const colors = new Set<string>();
  for (const commander of commanders) {
    for (const color of commander.colorIdentity) colors.add(color);
  }
  return [...colors].sort();
}
