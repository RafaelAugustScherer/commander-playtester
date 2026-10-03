import type { Card } from "../lib/types";
import type { ThemeProfile } from "./themes";
import { isLastingRamp } from "./ramp";
import { cardTokens, namedTribes, servesTribe, tokenStrengths } from "./tokens";

const CURVE_FIT_WEIGHT = 2;
const ROLE_GAP_WEIGHT = 2;
// The tribal payoff bonus at full strength (`deck-draft/ADR-0006`), and how
// many creatures of a type it takes to get most of the way there.
const TRIBAL_PAYOFF_WEIGHT = 6;
const TRIBAL_SATURATION = 3;
// Tribal mode: what a card that names or is Kindred of a selected tribe gets.
const SELECTED_TRIBE_WEIGHT = 5;
export const RAMP_WEIGHT = 25;
export const RAMP_APPETITE_THRESHOLD = 2.5;
const RAMP_APPETITE_SPAN = 2;
const RAMP_TOO_SLOW_MV = 4;
const RAMP_CHEAP_MV = 2;
const RAMP_TARGET = 10;
const NONLAND_TARGET = 63;
const RAMP_PACE_SLACK = 2;
const TRIBAL_RAMP_STRENGTH = 1.5;
const CREATURE_RAMP_WITHOUT_GREEN = 0.25;

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

export function rampFit(card: Card, profile: ThemeProfile): number {
  if (!isLastingRamp(card)) return 0;
  const need = clamp01((profile.manaAppetite - RAMP_APPETITE_THRESHOLD) / RAMP_APPETITE_SPAN);
  const speed = clamp01(
    (RAMP_TOO_SLOW_MV - card.manaValue) / (RAMP_TOO_SLOW_MV - RAMP_CHEAP_MV),
  );
  const tribal = namedTribes(card).some((tribe) => hasTribe(profile, tribe))
    ? TRIBAL_RAMP_STRENGTH
    : 1;
  const colour =
    /\bCreature\b/.test(card.typeLine) && !profile.colorIdentity.includes("G")
      ? CREATURE_RAMP_WITHOUT_GREEN
      : 1;
  const pace = (RAMP_TARGET * Math.min(profile.nonlandCount, NONLAND_TARGET)) / NONLAND_TARGET;
  const room = clamp01(1 + (pace - profile.rampCount) / RAMP_PACE_SLACK);
  return RAMP_WEIGHT * need * speed * tribal * colour * room;
}

function hasTribe(profile: ThemeProfile, tribe: string): boolean {
  return profile.tribes.includes(tribe) || (profile.creatureTypes.get(tribe) ?? 0) > 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
