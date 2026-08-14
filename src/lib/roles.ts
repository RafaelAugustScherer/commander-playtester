import type { Card, CardRole } from "./types";
import { isLand } from "./types";

/**
 * Infer card roles from type line + oracle text. These are deliberately
 * simple heuristics — good enough to describe a deck's composition for
 * goldfishing and a first-pass power read, not a rules-accurate classifier.
 */
export function classifyRoles(input: {
  typeLine: string;
  oracleText: string;
  manaValue: number;
  producedMana: string[];
}): CardRole[] {
  const roles: CardRole[] = [];
  const text = input.oracleText.toLowerCase();
  const typeLine = input.typeLine;

  const land = /\bLand\b/.test(typeLine);
  if (land) roles.push("land");

  if (!land && isRamp(input, text)) roles.push("ramp");
  if (isDraw(text)) roles.push("draw");
  if (isRemoval(text)) roles.push("removal");

  if (roles.length === 0) roles.push("other");
  return roles;
}

function isRamp(
  input: { typeLine: string; manaValue: number; producedMana: string[] },
  text: string,
): boolean {
  // Mana rocks / dorks: a non-land permanent that taps for mana.
  const producesMana = input.producedMana.length > 0;
  const tapsForMana = /\{t\}[^.]*add \{/.test(text) || /add \{[wubrgc]/.test(text);
  const isCheapPermanent =
    /Artifact|Creature|Enchantment/.test(input.typeLine) && input.manaValue <= 4;

  if (isCheapPermanent && (producesMana || tapsForMana)) return true;

  // Land ramp: "search your library for a ... land ... put ... onto the battlefield".
  if (/search your library for .*land/.test(text) && /battlefield/.test(text)) {
    return true;
  }

  // Treasure / extra-land effects.
  if (/create .*treasure token/.test(text)) return true;
  if (/play an additional land/.test(text)) return true;

  return false;
}

function isDraw(text: string): boolean {
  // "draw a card", "draw two cards", "draw X cards". Exclude pure "draw step".
  if (/draw (a|one|two|three|four|five|\d+|x) cards?/.test(text)) return true;
  return false;
}

function isRemoval(text: string): boolean {
  return (
    /destroy target/.test(text) ||
    /exile target/.test(text) ||
    /counter target/.test(text) ||
    /deals? \d+ damage to (target|any target)/.test(text) ||
    /(each|target) (opponent|player) sacrifices/.test(text)
  );
}

/** Convenience: does a resolved card have a given role? */
export function hasRole(card: Card, role: CardRole): boolean {
  return card.roles.includes(role);
}

export { isLand };
