import type { Card } from "../lib/types";
import { cardTokens } from "./tokens";

/**
 * Jaccard similarity of two cards' theme tokens, in [0, 1]. Used to pick the
 * closest replacement when a `refresh` swaps out a suggested card.
 */
export function cardSimilarity(a: Card, b: Card): number {
  const tokensA = cardTokens(a);
  const tokensB = cardTokens(b);

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
