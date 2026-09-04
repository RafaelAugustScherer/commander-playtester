import type { Card, CardRole } from "../lib/types";
import { cardTokens } from "./tokens";

/** How many times a commander's tokens count against the same token from the 99. */
export const COMMANDER_WEIGHT = 3;

/** Number of mana-value buckets in a curve histogram (0..6, plus a 7+ bucket). */
const CURVE_BUCKETS = 8;

export interface ThemeProfile {
  tokenWeights: Map<string, number>;
  /** Mana-value histogram, index 0..6 plus a 7+ bucket at index 7. */
  curve: number[];
  roleCounts: Record<CardRole, number>;
  colorIdentity: string[];
}

/**
 * Summarize a deck so far into the profile candidates get scored against:
 * weighted theme tokens (`commander weighting` applied), the mana curve, role
 * counts, and the commanders' color identity.
 */
export function extractThemeProfile(
  commanders: Card[],
  others: Card[],
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

  for (const card of commanders) {
    addTokenWeights(tokenWeights, card, COMMANDER_WEIGHT);
    addCurveAndRoles(curve, roleCounts, card);
  }
  for (const card of others) {
    addTokenWeights(tokenWeights, card, 1);
    addCurveAndRoles(curve, roleCounts, card);
  }

  return {
    tokenWeights,
    curve,
    roleCounts,
    colorIdentity: colorIdentityOf(commanders),
  };
}

function addTokenWeights(
  weights: Map<string, number>,
  card: Card,
  weight: number,
): void {
  for (const token of cardTokens(card)) {
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
