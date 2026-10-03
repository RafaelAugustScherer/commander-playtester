import type { Card } from "../lib/types";
import { isLastingRamp, manaAbilityLines } from "../lib/ramp";
import { TRIBAL_SATURATION, type ThemeProfile } from "./themes";
import { namedCreatureTypes } from "./tokens";

export const RAMP_WEIGHT = 25;
const RAMP_APPETITE_THRESHOLD = 2.5;
const RAMP_APPETITE_SPAN = 2;
const RAMP_TOO_SLOW_MV = 4;
const RAMP_CHEAP_MV = 2;
const RAMP_TARGET = 10;
const NONLAND_TARGET = 63;
const RAMP_PACE_SLACK = 2;
const TRIBAL_RAMP_STRENGTH = 1.5;
const CREATURE_RAMP_WITHOUT_GREEN = 0.25;

export function rampFit(card: Card, profile: ThemeProfile): number {
  if (!isLastingRamp(card)) return 0;
  const need = clamp01((profile.manaAppetite - RAMP_APPETITE_THRESHOLD) / RAMP_APPETITE_SPAN);
  const speed = clamp01(
    (RAMP_TOO_SLOW_MV - card.manaValue) / (RAMP_TOO_SLOW_MV - RAMP_CHEAP_MV),
  );
  const tribal = 1 + (TRIBAL_RAMP_STRENGTH - 1) * tribeScaling(card, profile);
  const colour =
    /\bCreature\b/.test(card.typeLine) && !profile.colorIdentity.includes("G")
      ? CREATURE_RAMP_WITHOUT_GREEN
      : 1;
  const pace = (RAMP_TARGET * Math.min(profile.nonlandCount, NONLAND_TARGET)) / NONLAND_TARGET;
  const room = clamp01(1 + (pace - profile.rampCount) / RAMP_PACE_SLACK);
  return RAMP_WEIGHT * need * speed * tribal * colour * room;
}

function tribeScaling(card: Card, profile: ThemeProfile): number {
  let scaling = 0;
  for (const line of manaAbilityLines(card)) {
    for (const tribe of namedCreatureTypes(line, card.name)) {
      const count = profile.creatureTypes.get(tribe) ?? 0;
      const strength = profile.tribes.includes(tribe)
        ? 1
        : 1 - Math.exp(-count / TRIBAL_SATURATION);
      scaling = Math.max(scaling, strength);
    }
  }
  return scaling;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
