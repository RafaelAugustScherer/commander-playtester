import { drawsCards, drawsSeveral } from "../lib/draw";
import { ruleClauses, withOwnName } from "../lib/rulesText";
import { isLand, memoizeByCard, type Card } from "../lib/types";

// A Clue is a card drawn later.
const INVESTIGATES = /\binvestigates?\b/i;
const OTHERS_DRAW =
  /\b(?:each player|each opponent|each other player|target opponent|that player|its controller|defending player|an opponent)(?: may)? draws?\b/i;
// Card selection rather than advantage: looting, and drawing for a discard.
const LOOTS = /\bthen discards?\b/i;
const DISCARDS = /\bdiscard\b/i;
// An ability that uses the card itself up draws once, however it is worded.
const SPENDS_ITSELF = /\b(?:sacrifice|exile) (?:this\b|~)/i;

/**
 * How much card advantage a card brings: 1 for draw that repeats (a trigger or
 * an activated ability on a permanent — Rhystic Study, Skullclamp), ½ for a
 * one-shot that draws two or more (Harmonize), and nothing for a cantrip,
 * looting, or draw that goes to opponents.
 */
export const cardAdvantageValue = memoizeByCard((card: Card): number => {
  if (isLand(card)) return 0;
  const ownText = { typeLine: card.typeLine, oracleText: withOwnName(card.oracleText, card, true) };
  let value = 0;
  for (const { text, repeats, cost } of ruleClauses(ownText)) {
    if (!(drawsCards(text) || INVESTIGATES.test(text)) || OTHERS_DRAW.test(text)) continue;
    if (LOOTS.test(text) || (cost && DISCARDS.test(cost))) continue;
    if (repeats && !(cost && SPENDS_ITSELF.test(cost))) return 1;
    if (drawsSeveral(text)) value = 0.5;
  }
  return value;
});
