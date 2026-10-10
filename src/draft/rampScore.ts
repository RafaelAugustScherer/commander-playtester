import { isCreature, type Card } from "../lib/types";
import { manaAbilityLines } from "../lib/ramp";
import { TRIBAL_SATURATION, clamp01, linearStep, saturate } from "./curves";
import type { ThemeProfile } from "./themes";
import { namedCreatureTypes } from "./tokens";

export const RAMP_WEIGHT = 25;
/** Lasting ramp a deck should hold by its sixty-third nonland card (`deck-draft/ADR-0009`). */
export const RAMP_TARGET = 10;
const RAMP_APPETITE_THRESHOLD = 2.5;
const RAMP_APPETITE_SPAN = 2;
const RAMP_TOO_SLOW_MV = 4;
const RAMP_CHEAP_MV = 2;
const RAMP_PACE_SLACK = 2;
const TRIBAL_RAMP_STRENGTH = 1.5;
const CREATURE_RAMP_WITHOUT_GREEN = 0.25;

/**
 * What a lasting ramp card earns at pace: more the more mana the deck wants to
 * spend, the cheaper the ramp, the more its mana ability names the deck's tribe,
 * and a quarter for creature ramp outside green (`deck-draft/ADR-0009`).
 */
export function rampBonus(card: Card, profile: ThemeProfile): number {
  const need = linearStep(
    profile.manaAppetite,
    RAMP_APPETITE_THRESHOLD,
    RAMP_APPETITE_THRESHOLD + RAMP_APPETITE_SPAN,
  );
  const speed = 1 - linearStep(card.manaValue, RAMP_CHEAP_MV, RAMP_TOO_SLOW_MV);
  const tribal = 1 + (TRIBAL_RAMP_STRENGTH - 1) * tribeScaling(card, profile);
  const colour =
    isCreature(card) && !profile.colorIdentity.includes("G")
      ? CREATURE_RAMP_WITHOUT_GREEN
      : 1;
  return RAMP_WEIGHT * need * speed * tribal * colour;
}

/** Ramp's room: whole at or behind pace, fading to nothing two cards ahead. */
export function rampRoom(count: number, pace: number): number {
  return clamp01(1 + (pace - count) / RAMP_PACE_SLACK);
}

function tribeScaling(card: Card, profile: ThemeProfile): number {
  let scaling = 0;
  for (const line of manaAbilityLines(card)) {
    for (const tribe of namedCreatureTypes(line, card.name)) {
      const count = profile.creatureTypes.get(tribe) ?? 0;
      const strength = profile.tribes.includes(tribe) ? 1 : saturate(count, TRIBAL_SATURATION);
      scaling = Math.max(scaling, strength);
    }
  }
  return scaling;
}
