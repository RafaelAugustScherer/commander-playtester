import type { Card, CardRole } from "../lib/types";
import { rulesLines } from "./lands";
import { activationMana, isLastingRamp } from "./ramp";
import { creatureTypesOf, themeTokens, rewardedTokens } from "./tokens";

/** How many times a commander's tokens count against the same token from the 99. */
export const COMMANDER_WEIGHT = 3;

/**
 * Extra weight, on top of `COMMANDER_WEIGHT`, for what a commander rewards: the
 * mechanic its "whenever …" trigger conditions name and the tribes its text
 * names. Calibrated so over half of Hylda of the Icy Crown's offers tap
 * creatures (`deck-draft/ADR-0005`).
 */
export const REWARD_WEIGHT = 5;

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
  let nonlandCount = 0;
  let rampCount = 0;

  for (const card of commanders) {
    addTokenWeights(tokenWeights, themeTokens(card), COMMANDER_WEIGHT);
    addTokenWeights(tokenWeights, rewardedTokens(card), REWARD_WEIGHT);
    addCurveAndRoles(curve, roleCounts, card);
    if (!isLandCard(card)) {
      appetiteSum += COMMANDER_WEIGHT * manaSpent(card);
      appetiteWeight += COMMANDER_WEIGHT;
    }
  }
  for (const card of others) {
    addTokenWeights(tokenWeights, themeTokens(card), 1);
    addCurveAndRoles(curve, roleCounts, card);
    if (isLandCard(card)) continue;
    nonlandCount++;
    if (isLastingRamp(card)) {
      rampCount++;
    } else {
      appetiteSum += manaSpent(card);
      appetiteWeight++;
    }
  }
  for (const card of [...commanders, ...others]) {
    if (!/\bCreature\b/.test(card.typeLine)) continue;
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
    nonlandCount,
    rampCount,
  };
}

function isLandCard(card: Card): boolean {
  return /\bLand\b/.test(card.typeLine);
}

function manaSpent(card: Card): number {
  let spent = card.manaValue;
  for (const line of rulesLines(card)) {
    spent = Math.max(spent, activationMana(line));
  }
  return spent;
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
