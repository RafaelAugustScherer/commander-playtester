import type { Card } from "../lib/types";
import { TRIBAL_SATURATION, saturate } from "./curves";
import { BUCKET_NAMES, bucketFit, type BucketName } from "./fundamentals";
import type { ThemeProfile } from "./themes";
import { fitsToken, namedTribes, servesTribe, tokenStrengths } from "./tokens";

const CURVE_FIT_WEIGHT = 2;
const REMOVAL_GAP_WEIGHT = 2;
// The tribal payoff bonus at full strength (`deck-draft/ADR-0006`).
const TRIBAL_PAYOFF_WEIGHT = 6;
// Tribal mode: what a card that names or is Kindred of a selected tribe gets.
const SELECTED_TRIBE_WEIGHT = 5;

export interface CandidateScore {
  total: number;
  themeScore: number;
  curveScore: number;
  removalScore: number;
  /** What each `fundamentals bucket` the card fills adds (`deck-draft/ADR-0013`). */
  bucketScores: Record<BucketName, number>;
  tribalScore: number;
  /** Tokens the candidate shares with the deck's profile, for rationale chips. */
  matchedTokens: string[];
}

/**
 * Score a candidate's fit against a deck's `ThemeProfile`: shared theme
 * tokens, plus a term for filling thin spots in the mana curve, plus a term
 * for removal the deck is short of, plus what each fundamentals bucket the
 * card fills adds, plus a term for rewarding a tribe the deck already has.
 * Pure and deterministic.
 */
export function scoreCandidate(card: Card, profile: ThemeProfile): CandidateScore {
  const { themeScore, matchedTokens } = themeFit(card, profile);
  const curveScore = curveFit(card, profile);
  const removalScore = removalGapFit(card, profile);
  const tribalScore = tribalPayoffFit(card, profile);
  const bucketScores = {
    ramp: bucketFit("ramp", card, profile),
    protection: bucketFit("protection", card, profile),
    cardAdvantage: bucketFit("cardAdvantage", card, profile),
  };
  const bucketTotal = BUCKET_NAMES.reduce((sum, name) => sum + bucketScores[name], 0);

  return {
    total: themeScore + curveScore + removalScore + bucketTotal + tribalScore,
    themeScore,
    curveScore,
    removalScore,
    bucketScores,
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
  for (const [token, weight] of profile.tokenWeights) {
    if (!fitsToken(card, token)) continue;
    themeScore += weight * (strengths.get(token) ?? 1);
    matchedTokens.push(token);
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

function removalGapFit(card: Card, profile: ThemeProfile): number {
  if (!card.roles.includes("removal")) return 0;
  return REMOVAL_GAP_WEIGHT / (profile.removalCount + 1);
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
      tribalScore += TRIBAL_PAYOFF_WEIGHT * share * saturate(count, TRIBAL_SATURATION);
    }
  }
  if (profile.tribes.length > 0 && servesTribe(card, profile.tribes)) {
    tribalScore += SELECTED_TRIBE_WEIGHT;
  }
  return tribalScore;
}
