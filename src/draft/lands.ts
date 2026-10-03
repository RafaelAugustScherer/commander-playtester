import type { Card } from "../lib/types";

// The lines of a land that only make or find mana: a single-mana ability
// (one coloured or colourless mana, or one of any colour), an "enters tapped"
// clause, a colour choice, or a search for one basic land. A land made only of such lines is a colour fixer, worthless in a
// one-colour deck (`deck-draft/ADR-0007`).
const MANA = String.raw`(?:\{[WUBRGC]\}|one mana of (?:any color|any type|the chosen color)[^.]*)`;
const MANA_RIDER = String.raw`(?: (?:spend this mana only|activate only|when that mana is spent|if you spend this mana|this land deals \d+ damage to you)[^.]*\.)*`;

const FIXER_LINES: RegExp[] = [
  /\benters?(?: the battlefield)? tapped\b/i,
  /\bsacrifice it unless you pay\b/i,
  new RegExp(
    String.raw`^(?:\{[^}]+\}, )*\{T\}(?:, pay \d+ life)?: add ${MANA}(?: or ${MANA})*\.${MANA_RIDER}$`,
    "i",
  ),
  /^whenever [^,]+ becomes tapped, it deals \d+ damage to you\.$/i,
  /^as [^,]+ enters, choose a (?:color|basic land type|creature type)\b/i,
  /\bsearch your library for (?:a|an) (?:basic land|(?:plains|island|swamp|mountain|forest)\b[^.]*) card\b/i,
  /^basic landcycling\b/i,
];

/** A line without its parenthesised reminder text. */
function withoutReminder(line: string): string {
  let text = "";
  let depth = 0;
  for (const ch of line) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0) text += ch;
  }
  return text.split(" ").filter(Boolean).join(" ");
}

function rulesLines(card: Card): string[] {
  return card.oracleText.split("\n").map(withoutReminder).filter(Boolean);
}

// A rider that makes a mana ability worth playing on its own (Cavern of Souls).
const UTILITY_RIDER = /\bcan't be countered\b/i;

/** A land with an ability beyond making or finding mana (`deck-draft/ADR-0007`). */
export function isUtilityLand(card: Card): boolean {
  return rulesLines(card).some(
    (line) => UTILITY_RIDER.test(line) || !FIXER_LINES.some((pattern) => pattern.test(line)),
  );
}
