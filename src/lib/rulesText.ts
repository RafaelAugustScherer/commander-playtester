/** A line without its parenthesised reminder text. */
export function withoutReminder(line: string): string {
  let text = "";
  let depth = 0;
  for (const ch of line) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0) text += ch;
  }
  return text.split(" ").filter(Boolean).join(" ");
}

const rulesLinesCache = new Map<string, readonly string[]>();

export function rulesLines(card: { oracleText: string }): readonly string[] {
  let lines = rulesLinesCache.get(card.oracleText);
  if (!lines) {
    lines = card.oracleText.split("\n").map(withoutReminder).filter(Boolean);
    rulesLinesCache.set(card.oracleText, lines);
  }
  return lines;
}
