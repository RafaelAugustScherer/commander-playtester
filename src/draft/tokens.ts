import { cardKey, isCreature, type Card } from "../lib/types";
import { CREATURE_TYPES } from "./creatureTypes";
import { fitsPowerCondition, powerConditions } from "./powerTokens";
import {
  asSelf,
  escapeRegExp,
  ruleClauses,
  rulesLines,
  rulesText,
  withOwnName,
  withoutReminder,
} from "../lib/rulesText";
import { RULES_KEYWORDS, TOKEN_RULES, type TextTest, type TokenRule } from "./tokenRules";

const RULES_BY_TOKEN = new Map(TOKEN_RULES.map((rule) => [rule.token, rule]));

const PARTNERS = new Map<string, Set<string>>();
for (const { token, partners = [] } of TOKEN_RULES) {
  for (const partner of partners) {
    PARTNERS.set(token, (PARTNERS.get(token) ?? new Set()).add(partner));
    PARTNERS.set(partner, (PARTNERS.get(partner) ?? new Set()).add(token));
  }
}

type Signal = readonly [token: string, test: TextTest];

/** What signals each token in a card's text. */
const CARD_SIGNALS: readonly Signal[] = TOKEN_RULES.map(({ token, signal }) => [token, signal]);
/** What signals each token in a commander's own text (`TokenRule.commander`). */
const COMMANDER_SIGNALS: readonly Signal[] = TOKEN_RULES.flatMap(({ token, signal, commander }) =>
  commander === "never" ? [] : [[token, commander ?? signal] as const],
);

function subtypesFromTypeLine(typeLine: string): string[] {
  const tokens = new Set<string>();
  for (const face of typeLine.split("//")) {
    const parts = face.split("—");
    if (parts.length < 2) continue;
    for (const word of parts[parts.length - 1].trim().split(/\s+/)) {
      const cleaned = word.toLowerCase();
      if (cleaned) tokens.add(cleaned);
    }
  }
  return [...tokens];
}

const IRREGULAR_PLURALS: Record<string, string> = {
  cyclops: "cyclopes",
  fungus: "fungi",
  homunculus: "homunculi",
  mouse: "mice",
  ox: "oxen",
};

function subtypeForms(subtype: string): string[] {
  const irregular = IRREGULAR_PLURALS[subtype.toLowerCase()];
  return [
    subtype,
    `${subtype}s`,
    `${subtype}es`,
    subtype.replace(/fe?$/, "ves"),
    subtype.replace(/y$/, "ies"),
    ...(irregular ? [subtype[0] + irregular.slice(1)] : []),
  ];
}

export function mentionsSubtype(text: string, subtype: string): boolean {
  const forms = subtypeForms(subtype.toLowerCase()).map(escapeRegExp);
  return new RegExp(`\\b(?:${forms.join("|")})\\b`, "i").test(text);
}

// Capitalised forms only: rules text capitalises a creature type, which keeps
// ordinary words ("wall", "spirit") from counting.
const CREATURE_TYPE_BY_FORM = new Map(
  CREATURE_TYPES.flatMap((type) =>
    subtypeForms(type).map((form) => [form, type.toLowerCase()] as const),
  ),
);
const CAPITALISED_WORD = /(?<![\w'-])[A-Z][\w'-]*/g;

/**
 * Creature types the rules text names as a tribe to reward ("Elves you
 * control", "an Angel, Demon, or Dragon creature card"). Mentions in the card's
 * own name, in tokens it creates, and in "non-" exclusions don't count.
 */
export function namedCreatureTypes(text: string, name: string): string[] {
  return typesNamedIn(withOwnName(text, { name }));
}

/** `namedCreatureTypes` of text whose own name is already read as "~". */
function typesNamedIn(ownText: string): string[] {
  const rules = ownText
    .replace(/\bcreates?\b[^.]*?\btokens?\b/gi, "")
    .replace(/\b[Nn]on-?[A-Z][\w'-]*/g, "");
  const types = new Set<string>();
  for (const [word] of rules.matchAll(CAPITALISED_WORD)) {
    const type = CREATURE_TYPE_BY_FORM.get(word);
    if (type) types.add(type);
  }
  return [...types];
}

function matches(test: TextTest, text: string): boolean {
  return test instanceof RegExp ? test.test(text) : test.some((pattern) => pattern.test(text));
}

function signalled(text: string, signals: readonly Signal[]): string[] {
  return signals.flatMap(([token, test]) => (matches(test, text) ? [token] : []));
}

/**
 * The tokens a card's text signals: the tribes it names, its curated signals and
 * its power conditions, read from rules text without reminder text
 * (`deck-draft/ADR-0013`) and with the card's own name read as "~", so a name
 * signals nothing.
 */
function textThemeTokens(text: string, card: Card): Set<string> {
  const own = withOwnName(text, card);
  return new Set([...typesNamedIn(own), ...signalled(own, CARD_SIGNALS), ...powerConditions(own)]);
}

const KEYWORD_ABILITY = new RegExp(
  `^(?:${RULES_KEYWORDS.join("|")}|hexproof from .+|ward\\b.*|protection from .+)$`,
  "i",
);

function isKeywordLine(line: string): boolean {
  const abilities = withoutReminder(line).split(/,\s*/);
  return abilities.every((ability) => KEYWORD_ABILITY.test(ability));
}

// The same cards are scored round after round, so their tokens are kept.
const themeTokenCache = new Map<string, ReadonlySet<string>>();
const commanderTokenCache = new Map<string, ReadonlySet<string>>();
const cardTokenCache = new Map<string, ReadonlySet<string>>();

/**
 * The tokens a card adds to a deck's theme: its permanent subtypes, the
 * creature types its rules text names, and its oracle-text signals.
 */
export function themeTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = themeTokenCache.get(key);
  if (!tokens) {
    const found = textThemeTokens(rulesText(card), card);
    for (const subtype of subtypesFromTypeLine(card.typeLine)) found.add(subtype);
    tokens = found;
    themeTokenCache.set(key, tokens);
  }
  return tokens;
}

/**
 * The tokens a commander asks for: its oracle-text signals and the tribes its
 * rules text names, but not its own keyword lines or type-line subtypes, which
 * describe the commander rather than the deck it wants. Its signals are read
 * as its own effects (`asSelf`, `TokenRule.commander`).
 */
export function commanderThemeTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = commanderTokenCache.get(key);
  if (!tokens) {
    const text = rulesLines(card)
      .filter((line) => !isKeywordLine(line))
      .join("\n");
    const own = withOwnName(text, card);
    tokens = new Set([
      ...typesNamedIn(own),
      ...signalled(asSelf(text, card), COMMANDER_SIGNALS),
      ...powerConditions(own),
    ]);
    commanderTokenCache.set(key, tokens);
  }
  return tokens;
}

function textFits({ fitsText }: TokenRule, text: string, typeLine: string): boolean {
  return (
    !!fitsText &&
    matches(fitsText.text, text) &&
    (!fitsText.typeLine || fitsText.typeLine.test(typeLine))
  );
}

/**
 * The tokens a card fits: its `themeTokens`, their partners, and those it only
 * fits, such as a creature with an enters trigger for a blink deck.
 */
export function cardTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = cardTokenCache.get(key);
  if (!tokens) {
    const found = new Set(themeTokens(card));
    for (const token of themeTokens(card)) {
      for (const partner of PARTNERS.get(token) ?? []) found.add(partner);
    }
    for (const rule of TOKEN_RULES) {
      if (rule.fitsCard?.(card) || textFits(rule, rulesText(card), card.typeLine)) {
        found.add(rule.token);
      }
    }
    tokens = found;
    cardTokenCache.set(key, tokens);
  }
  return tokens;
}

export const REPEATABLE_STRENGTH = 2;
export const MULTIPLAYER_STRENGTH = 1.5;

const MULTIPLAYER_CLAUSE =
  /\b(?:each opponent|your opponents|all opponents|each other player|whenever an opponent|at the beginning of each)\b/i;

function clauseStrength(clause: string, repeatable: boolean): number {
  let strength = repeatable ? REPEATABLE_STRENGTH : 1;
  if (MULTIPLAYER_CLAUSE.test(clause)) strength *= MULTIPLAYER_STRENGTH;
  return strength;
}

function clauseTokens(clause: string, card: Card): Set<string> {
  const tokens = textThemeTokens(clause, card);
  for (const rule of TOKEN_RULES) {
    if (textFits(rule, clause, card.typeLine)) tokens.add(rule.token);
  }
  return tokens;
}

const strengthCache = new Map<string, ReadonlyMap<string, number>>();

function clauseStrengths(card: Card): Map<string, number> {
  const found = new Map<string, number>();
  for (const { text, repeats } of ruleClauses(card)) {
    const strength = clauseStrength(text, repeats);
    for (const token of clauseTokens(text, card)) {
      found.set(token, Math.max(found.get(token) ?? 1, strength));
    }
  }
  return found;
}

export function tokenStrengths(card: Card): ReadonlyMap<string, number> {
  const key = cardKey(card);
  let strengths = strengthCache.get(key);
  if (!strengths) {
    strengths = themeTokens(card).has("overload")
      ? new Map([...cardTokens(card)].map((token) => [token, MULTIPLAYER_STRENGTH]))
      : clauseStrengths(card);
    strengthCache.set(key, strengths);
  }
  return strengths;
}

function rewards({ rewards: test }: TokenRule, card: Card, text: string): boolean {
  if (!test) return false;
  return typeof test === "function" ? test(card) : matches(test, text);
}

const WHENEVER_CLAUSE = /\bwhenever\b[^.,]*/gi;

/**
 * The tokens a card rewards, as opposed to what its rewards are: those named in
 * its "whenever …" trigger conditions, read as its own effects (`asSelf`), the
 * tribes its rules text names, and each token's `rewards`.
 * Hylda of the Icy Crown's "Whenever you tap an untapped creature an opponent
 * controls" yields `tap creature`, not the token, counter or card her trigger
 * gives; Lathril's "Tap ten untapped Elves you control" yields `elf`.
 */
export function rewardedTokens(card: Card): Set<string> {
  const text = rulesText(card);
  const tokens = new Set<string>(namedCreatureTypes(text, card.name));
  for (const condition of powerConditions(text)) tokens.add(condition);
  for (const rule of TOKEN_RULES) {
    if (rewards(rule, card, text)) tokens.add(rule.token);
  }
  for (const [clause] of asSelf(text, card).matchAll(WHENEVER_CLAUSE)) {
    for (const token of signalled(clause, COMMANDER_SIGNALS)) tokens.add(token);
  }
  return tokens;
}

/** The creature types on a card's creature faces, lowercased. */
export function creatureTypesOf(card: Card): string[] {
  const faces = card.typeLine.split("//").filter((face) => /\bCreature\b/.test(face));
  return [...new Set(faces.flatMap(subtypesFromTypeLine))];
}

/**
 * Whether a card is a creature of one of `tribes` (lowercase) — a Changeling
 * is every creature type, so it belongs to any tribe.
 */
export function isOfTribe(card: Card, tribes: readonly string[]): boolean {
  if (!isCreature(card)) return false;
  if (/\bchangeling\b/i.test(card.oracleText)) return true;
  return creatureTypesOf(card).some((type) => tribes.includes(type));
}

/**
 * Whether a card's rules text names one of `tribes`, or it is a Kindred card
 * of one ("Kindred Instant — Elf").
 */
export function servesTribe(card: Card, tribes: readonly string[]): boolean {
  if (namedTribes(card).some((type) => tribes.includes(type))) return true;
  return (
    !isCreature(card) &&
    subtypesFromTypeLine(card.typeLine).some((type) => tribes.includes(type))
  );
}

/**
 * The creature types a card's rules text names as a tribe — the lords and
 * payoffs a tribal deck wants (`deck-draft/ADR-0006`).
 */
export function namedTribes(card: Card): string[] {
  return namedCreatureTypes(rulesText(card), card.name);
}

/**
 * Whether a card fits a theme token: a token it has, or a power condition one of
 * its creatures, or the creature tokens it makes, meets.
 */
export function fitsToken(card: Card, token: string): boolean {
  return cardTokens(card).has(token) || fitsPowerCondition(card, token);
}

/**
 * The free-text searches that reach a curated oracle-text token's matches, or
 * null when `token` is not one (a subtype, searched as itself).
 */
export function tokenSearches(token: string): string[] | null {
  const rule = RULES_BY_TOKEN.get(token);
  if (!rule) return null;
  const partnerSearches = [...(PARTNERS.get(token) ?? [])].flatMap(
    (partner) => RULES_BY_TOKEN.get(partner)?.search ?? [partner],
  );
  return [...new Set([...(rule.search ?? [token]), ...partnerSearches])];
}
