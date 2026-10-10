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

/** Rules text without its reminder text, one ability per line. */
export function rulesText(card: { oracleText: string }): string {
  return rulesLines(card).join("\n");
}

const NOT_A_SHORT_NAME = new Set(["The", "A", "An"]);

/**
 * The names a card's rules text calls it by: each face's full name and, with
 * `short`, a legend's short name — the part before its comma ("Kroxa") or else
 * its first word ("Edgar"), as Oracle text now shortens legends. A short name
 * can be a word the text means otherwise ("Sliver" in "Sliver Overlord"), so
 * readers of tribes leave it off.
 */
export function ownNames(card: { name: string; typeLine?: string }, short = false): string[] {
  const legend = short && /\bLegendary\b/.test(card.typeLine ?? "");
  return card.name.split("//").flatMap((face) => {
    const full = face.trim();
    if (!full) return [];
    if (!legend) return [full];
    const beforeComma = full.split(",")[0];
    const firstWord = full.split(" ")[0];
    if (beforeComma !== full) return [full, beforeComma];
    if (firstWord !== full && !NOT_A_SHORT_NAME.has(firstWord)) return [full, firstWord];
    return [full];
  });
}

/** `text` with the card's own names (`ownNames`) read as "~". */
export function withOwnName(
  text: string,
  card: { name: string; typeLine?: string },
  short = false,
): string {
  return ownNames(card, short).reduce((out, name) => out.split(name).join("~"), text);
}

/** The sentences of a text, split at full stops and line breaks. */
export function sentences(text: string): string[] {
  return text.split(/[.\n]/);
}

/** Whether a sentence points at your own things ("target creature you control"). */
export function aimsAtYourOwn(sentence: string): boolean {
  return /\byou (?:control|own)\b/i.test(sentence);
}

/** Whether a sentence points at an opponent's things or at opponents. */
export function aimsAtOpponents(sentence: string): boolean {
  return /\b(?:an opponent controls|you don't control|target opponent|each opponent)\b/i.test(sentence);
}

/**
 * The cost of an activated ability ("{2}, {T}: …" gives "{2}, {T}"), after any
 * ability word ("Channel — …"); null when the line is not an activated ability.
 */
export function activationCost(line: string): string | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const cost = line.slice(0, colon).split("—").pop() ?? "";
  return /[."•]/.test(cost) ? null : cost;
}

const ONE_SHOT_SPELL = /\b(?:Instant|Sorcery)\b/;
const TRIGGERED_CLAUSE = /^(?:whenever\b|at the beginning of (?!(?:the |your )?next\b))/i;
const ACTIVATED_CLAUSE = /^[^:."—•]*:/;
const MODE_LABEL = /^•\s*(?:[^—.]{1,30}—\s*)?/;

export interface RuleClause {
  text: string;
  /** A trigger or activated ability on a permanent, which works turn after turn. */
  repeats: boolean;
  /** The clause's activation cost (`activationCost`), or null. */
  cost: string | null;
}

function isRepeatable(clause: string): boolean {
  return TRIGGERED_CLAUSE.test(clause.trimStart()) || ACTIVATED_CLAUSE.test(clause);
}

/**
 * A card's rules lines (reminder text dropped) as clauses. A mode ("•") takes
 * the repeatability of the line that introduces it, after a short mode label is
 * dropped; an instant's or sorcery's clauses never repeat.
 */
export function ruleClauses(card: { typeLine: string; oracleText: string }): RuleClause[] {
  const oneShotCard = ONE_SHOT_SPELL.test(card.typeLine);
  const clauses: RuleClause[] = [];
  let headerRepeats = false;
  for (const line of rulesLines(card)) {
    const isMode = line.startsWith("•");
    const text = isMode ? line.replace(MODE_LABEL, "") : line;
    const repeats: boolean = isRepeatable(text) || (isMode && headerRepeats);
    if (!isMode) headerRepeats = repeats;
    clauses.push({ text, repeats: !oneShotCard && repeats, cost: activationCost(text) });
  }
  return clauses;
}
