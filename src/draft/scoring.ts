import type { Card } from "../lib/types";
import type { ThemeProfile } from "./themes";
import { cardTokens } from "./tokens";

const CURVE_FIT_WEIGHT = 2;
const ROLE_GAP_WEIGHT = 2;

export interface CandidateScore {
  total: number;
  themeScore: number;
  curveScore: number;
  roleScore: number;
  /** Tokens the candidate shares with the deck's profile, for rationale chips. */
  matchedTokens: string[];
}

/**
 * Score a candidate's fit against a deck's `ThemeProfile`: shared theme
 * tokens, plus a term for filling thin spots in the mana curve, plus a term
 * for filling role gaps. Pure and deterministic.
 */
export function scoreCandidate(card: Card, profile: ThemeProfile): CandidateScore {
  const { themeScore, matchedTokens } = themeFit(card, profile);
  const curveScore = curveFit(card, profile);
  const roleScore = roleGapFit(card, profile);

  return {
    total: themeScore + curveScore + roleScore,
    themeScore,
    curveScore,
    roleScore,
    matchedTokens,
  };
}

function themeFit(
  card: Card,
  profile: ThemeProfile,
): { themeScore: number; matchedTokens: string[] } {
  let themeScore = 0;
  const matchedTokens: string[] = [];
  for (const token of cardTokens(card)) {
    const weight = profile.tokenWeights.get(token);
    if (weight) {
      themeScore += weight;
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
    if (role === "other") continue;
    roleScore += ROLE_GAP_WEIGHT / (profile.roleCounts[role] + 1);
  }
  return roleScore;
}
