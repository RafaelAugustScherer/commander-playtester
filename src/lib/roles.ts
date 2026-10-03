import type { Card, CardRole } from "./types";
import { isLand } from "./types";
import { rampKind } from "./ramp";

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

  if (!land && isRamp(input)) roles.push("ramp");
  if (isDraw(text)) roles.push("draw");
  if (isRemoval(text)) roles.push("removal");

  if (roles.length === 0) roles.push("other");
  return roles;
}

function isRamp(input: {
  typeLine: string;
  oracleText: string;
  manaValue: number;
  producedMana: string[];
}): boolean {
  const kind = rampKind(input);
  const isCheapPermanent =
    /Artifact|Creature|Enchantment/.test(input.typeLine) && input.manaValue <= 4;
  if (kind === null) return isCheapPermanent && input.producedMana.length > 0;
  if (kind === "mana") return isCheapPermanent;
  return true;
}

function isDraw(text: string): boolean {
  // "draw a card", "draw two cards", "draw X cards". Exclude pure "draw step".
  return /draw (a|one|two|three|four|five|\d+|x) cards?/.test(text);
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
