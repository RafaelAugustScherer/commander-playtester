import type { Card } from "../lib/types";
import { rampFit } from "./rampScore";
import { TRIBAL_SATURATION, type ThemeProfile } from "./themes";
import { cardTokens, namedTribes, servesTribe, tokenStrengths } from "./tokens";

const CURVE_FIT_WEIGHT = 2;
const ROLE_GAP_WEIGHT = 2;
// The tribal payoff bonus at full strength (`deck-draft/ADR-0006`).
const TRIBAL_PAYOFF_WEIGHT = 6;
// Tribal mode: what a card that names or is Kindred of a selected tribe gets.
const SELECTED_TRIBE_WEIGHT = 5;

export interface CandidateScore {
  total: number;
  themeScore: number;
  curveScore: number;
  roleScore: number;
  rampScore: number;
  tribalScore: number;
  /** Tokens the candidate shares with the deck's profile, for rationale chips. */
  matchedTokens: string[];
}

/**
 * Score a candidate's fit against a deck's `ThemeProfile`: shared theme
 * tokens, plus a term for filling thin spots in the mana curve, plus a term
 * for filling role gaps, plus a term for ramp the deck's mana appetite calls
 * for, plus a term for rewarding a tribe the deck already has. Pure and
 * deterministic.
 */
export function scoreCandidate(card: Card, profile: ThemeProfile): CandidateScore {
  const { themeScore, matchedTokens } = themeFit(card, profile);
  const curveScore = curveFit(card, profile);
  const roleScore = roleGapFit(card, profile);
  const rampScore = rampFit(card, profile);
  const tribalScore = tribalPayoffFit(card, profile);

  return {
    total: themeScore + curveScore + roleScore + rampScore + tribalScore,
    themeScore,
    curveScore,
    roleScore,
    rampScore,
    tribalScore,
    matchedTokens,
  };
}

function themeFit(
  card: Card,
  profile: ThemeProfile,
): { themeScore: number; matchedTokens: string[] } {
  let themeScore = 0;
  const matchedTokens: string[] = [];
  const strengths = tokenStrengths(card);
  for (const token of cardTokens(card)) {
    const weight = profile.tokenWeights.get(token);
    if (weight) {
      themeScore += weight * (strengths.get(token) ?? 1);
      matchedTokens.push(token);
    }
  }
  matchedTokens.sort();
  return { themeScore, matchedTokens };
}

function curveFit(card: Card, profile: ThemeProfile): number {
  const bucket = Math.max(
    0,
    Math.min(profile.curve.length - 1, Math.floor(card.manaValue)),
  );
  return CURVE_FIT_WEIGHT / (profile.curve[bucket] + 1);
}

function roleGapFit(card: Card, profile: ThemeProfile): number {
  let roleScore = 0;
  for (const role of card.roles) {
    if (role === "other" || role === "ramp") continue;
    roleScore += ROLE_GAP_WEIGHT / (profile.roleCounts[role] + 1);
  }
  return roleScore;
}

/**
 * A bonus for each tribe the card's rules text names, growing with that tribe's
 * share of the deck's creatures and saturating as their number grows: five
 * Elves in eight creatures make an Elf lord worth far more than five incidental
 * Humans in thirty make a Human lord. In tribal mode, a card that names or is
 * Kindred of a selected tribe gets `SELECTED_TRIBE_WEIGHT` on top.
 */
function tribalPayoffFit(card: Card, profile: ThemeProfile): number {
  let tribalScore = 0;
  if (profile.creatureCount > 0) {
    for (const tribe of namedTribes(card)) {
      const count = profile.creatureTypes.get(tribe) ?? 0;
      const share = count / profile.creatureCount;
      tribalScore +=
        TRIBAL_PAYOFF_WEIGHT * share * (1 - Math.exp(-count / TRIBAL_SATURATION));
    }
  }
  if (profile.tribes.length > 0 && servesTribe(card, profile.tribes)) {
    tribalScore += SELECTED_TRIBE_WEIGHT;
  }
  return tribalScore;
}
