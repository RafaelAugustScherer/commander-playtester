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

export function rulesLines(card: { oracleText: string }): string[] {
  return card.oracleText.split("\n").map(withoutReminder).filter(Boolean);
}
