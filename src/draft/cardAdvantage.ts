import { isLand, type Card } from "../lib/types";
import { ruleClauses } from "./tokens";

const SEVERAL = String.raw`(?:two|three|four|five|six|seven|x|\d+|that many)`;
const DRAWS_SEVERAL = [
  new RegExp(String.raw`\bdraws? ${SEVERAL}(?: additional)? cards\b`, "i"),
  /\bdraws? (?:cards equal to|a card for each)\b/i,
];
const DRAWS = [
  ...DRAWS_SEVERAL,
  /\bdraws? (?:a|an additional|one|one additional) card\b/i,
  /\binvestigates?\b/i,
];
const OTHERS_DRAW =
  /\b(?:each player|each opponent|each other player|target opponent|that player|its controller|defending player|an opponent)(?: may)? draws?\b/i;
// Card selection rather than advantage: looting, and drawing for a discard.
const SELECTS = /\bthen discards?\b/i;
const DISCARD_COST = /^[^:."—•]*\bdiscard\b[^:."—•]*:/i;
// An ability that uses the card itself up draws once, however it is worded.
const SPENDS_ITSELF = /^[^:."—•]*\b(?:sacrifice|exile) (?:this\b|~)[^:."—•]*:/i;

function selfReferencing(text: string, name: string): string {
  return name
    .split("//")
    .map((face) => face.trim())
    .filter(Boolean)
    .reduce((out, face) => out.split(face).join("~"), text);
}

/**
 * How much card advantage a card brings: 1 for draw that repeats (a trigger or
 * an activated ability on a permanent — Rhystic Study, Skullclamp), ½ for a
 * one-shot that draws two or more (Harmonize), and nothing for a cantrip,
 * looting, or draw that goes to opponents.
 */
export function cardAdvantageValue(card: Card): number {
  if (isLand(card)) return 0;
  let value = 0;
  for (const clause of ruleClauses(card)) {
    const text = selfReferencing(clause.text, card.name);
    if (!DRAWS.some((draw) => draw.test(text)) || OTHERS_DRAW.test(text)) continue;
    if (SELECTS.test(text) || DISCARD_COST.test(text)) continue;
    if (clause.repeats && !SPENDS_ITSELF.test(text)) return 1;
    if (DRAWS_SEVERAL.some((draw) => draw.test(text))) value = 0.5;
  }
  return value;
}
