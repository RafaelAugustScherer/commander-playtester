import type { Card, CardRole } from "./types";
import { isLand } from "./types";
import { drawsCards } from "./draw";
import { rampKind } from "./ramp";
import { aimsAtYourOwn, rulesText, sentences } from "./rulesText";

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
  const text = rulesText(input).toLowerCase();
  const typeLine = input.typeLine;

  const land = /\bLand\b/.test(typeLine);
  if (land) roles.push("land");

  if (!land && isRamp(input)) roles.push("ramp");
  if (drawsCards(text)) roles.push("draw");
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


const REMOVAL = [
  // Destroy or exile, one target or up to a few.
  /\b(?:destroy|exile) (?:up to (?:one|two|three|x) )?(?:other )?target\b/,
  /\bcounter target\b/,
  /\bdeals? (?:\d+|x) damage to (?:any target|(?:up to \w+ )?(?:other )?target)/,
  /\b(?:each|target) (?:opponent|player) sacrifices\b/,
  /\btarget creature (?:an opponent controls )?gets -(?:\d+|x)\/-(?:\d+|x)\b/,
  // Fight and bite.
  /\bfights? (?:up to one |another )?target\b/,
  /\bdeals damage equal to its power to (?:up to one |another )?target\b/,
  // Board wipes: every creature or permanent of a kind, not cards in a zone.
  /\b(?:destroy|exile) all (?:other )?(?:nonland |non-[\w-]+ |attacking |tapped )?(?:creatures|permanents|artifacts|enchantments|planeswalkers)\b/,
  /\beach (?:other )?creature gets -/,
  /\bdeals? (?:\d+|x) damage to each creature\b/,
  /\breturn all (?:nonland )?(?:creatures|permanents)\b/,
];

// Answers that count only when they point away from your own things.
const AIMED_REMOVAL = [
  /\breturn (?:up to \w+ )?target (?:nonland )?(?:creature|permanent|artifact|enchantment|planeswalker)s?\b[^.]* to (?:its|their) owner's hand\b/,
  /\b(?:shuffles?|puts?) target (?:nonland )?(?:creature|permanent|artifact|enchantment)\b[^.]* (?:into|on (?:the )?(?:top|bottom) of) (?:its|their) owner's library\b/,
  /\bthe owner of target (?:nonland )?(?:creature|permanent)\b[^.]* shuffles it into\b/,
];

function isRemoval(text: string): boolean {
  if (REMOVAL.some((pattern) => pattern.test(text))) return true;
  return sentences(text).some(
    (sentence) =>
      !aimsAtYourOwn(sentence) && AIMED_REMOVAL.some((pattern) => pattern.test(sentence)),
  );
}

/** Convenience: does a resolved card have a given role? */
export function hasRole(card: Card, role: CardRole): boolean {
  return card.roles.includes(role);
}

export { isLand };
