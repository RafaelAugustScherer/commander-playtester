const SEVERAL = String.raw`(?:two|three|four|five|six|seven|x|\d+|that many)`;

const DRAWS_SEVERAL = [
  new RegExp(String.raw`\bdraws? ${SEVERAL}(?: additional)? cards\b`, "i"),
  /\bdraws? (?:cards equal to|a card for each)\b/i,
];

/**
 * Card-draw wordings: "draw a card", "draws two additional cards", "draw cards
 * equal to …". The one reading of draw, shared by goldfishing's draw role and
 * the deck draft's tokens and card advantage.
 */
export const DRAW_WORDINGS: RegExp[] = [
  /\bdraws? (?:a|an additional|one|one additional) card\b/i,
  ...DRAWS_SEVERAL,
];

export function drawsCards(text: string): boolean {
  return DRAW_WORDINGS.some((wording) => wording.test(text));
}

/** Whether the text draws two cards or more at once. */
export function drawsSeveral(text: string): boolean {
  return DRAWS_SEVERAL.some((wording) => wording.test(text));
}
