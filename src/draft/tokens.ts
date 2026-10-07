import { cardKey, isCreature, type Card } from "../lib/types";
import { CREATURE_TYPES } from "./creatureTypes";
import { fitsPowerCondition, powerConditions } from "./powerTokens";
import { rulesLines, withoutReminder } from "../lib/rulesText";

/**
 * One curated oracle-text signal. Matching `pattern` contributes `token` to the
 * deck's theme and fits it; matching `enabler` (or `typeLineEnabler`) only fits
 * it — fodder a theme wants, which does not make a theme of its own
 * (`deck-draft/ADR-0005`). `enabler` fits only where `enablerTypeLine` matches
 * too, when it is set. Matching `reward` makes a commander reward the token
 * without making it a theme signal. A token and its `partners` fit each other.
 */
export interface OracleTextPattern {
  token: string;
  /** One phrase, or several alternatives. */
  pattern: RegExp | RegExp[];
  enabler?: RegExp;
  enablerTypeLine?: RegExp;
  typeLineEnabler?: RegExp;
  reward?: RegExp;
  /** Free-text searches that together reach every match; defaults to the token. */
  search?: string[];
  partners?: string[];
}

const PERMANENT_ETB_MULTIPLIER = /\bentering\b[^.]*\btriggers? an additional time\b/i;
const ETB_ENABLER = /\bwhen\b(?![^.,]*\blands?\b)[^.,]*\benters\b/i;
const ARTIFACT_TOKEN_MAKER =
  /\bcreates?\b[^.]*\b(?:artifact|treasure|clue|food|blood|gold|powerstone|map|junk|incubator|lander)\b[^.]*\btokens?\b/i;

const INSTANT_OR_SORCERY = /\b(?:Instant|Sorcery)\b/;
const STORM = /^storm(?:$| \()/im;
const KICKER = /^(?:multi)?kicker\b/im;
const OVERLOAD = /^overload\b/im;
const COST_REDUCTION =
  /(?:^|[.:]\s+|\b(?:sorcery|noncreature|white|blue|black|red|green|multicolored) )spells (?:you cast )?cost\b[^.]*\bless\b/im;

const COMBAT_KEYWORDS = [
  "flying", "deathtouch", "lifelink", "trample", "menace", "first strike", "double strike",
  "haste", "vigilance", "indestructible", "hexproof",
];
const FLASH = "flash";
const DEFENDER = "defender";
const RULES_KEYWORDS = [...COMBAT_KEYWORDS, FLASH, DEFENDER, "reach"];

function keywordEntry(keyword: string): OracleTextPattern {
  return { token: keyword, pattern: new RegExp(`\\b${keyword}\\b`, "i") };
}

const OTHER_COUNTER_KINDS = [
  "age", "blaze", "bounty", "charge", "coin", "corpse", "credit", "death", "delay",
  "despair", "divinity", "doom", "dream", "echo", "egg", "elixir", "ember", "eon",
  "fade", "fate", "flood", "fuse", "gem", "gold", "growth", "hatchling", "hit",
  "hourglass", "hunger", "husk", "ice", "incarnation", "infection", "intel",
  "javelin", "judgment", "ki", "level", "lore", "luck", "mine", "muster", "night",
  "oil", "omen", "page", "pain", "petal", "plague", "poison", "polyp", "pupa", "quest",
  "rad", "ritual", "shell", "shield", "silver", "sleep", "slime", "slumber", "spore",
  "stash", "storage", "strife", "study", "stun", "tide", "time", "tower", "training",
  "trap", "unity", "valor", "velocity", "verse", "wind", "wish",
];

/**
 * The tunable lever of synergy quality (`deck-draft/ADR-0001`): salient
 * oracle-text phrases mapped to the theme token they signal. Case-insensitive,
 * no `g` flag (so `.test()` stays stateless across cards).
 */
export const ORACLE_TEXT_PATTERNS: OracleTextPattern[] = [
  { token: "+1/+1 counter", pattern: /\+1\/\+1 counters?\b/i },
  { token: "-1/-1 counter", pattern: /-1\/-1 counters?\b/i },
  { token: "sacrifice", pattern: /\bsacrifice[sd]?\b/i },
  {
    token: "create token",
    pattern: [
      /\bcreates?\b[^.]*\btokens?\b/i,
      /\bwhenever (?:a|an|another|one or more)\b[^.,]*\btokens?\b[^.,]*\benters?\b/i,
    ],
  },
  {
    token: "draw a card",
    pattern: /\bdraws?\b (?:a|one|two|three|four|five|\d+|x) cards?/i,
  },
  { token: "discard a card", pattern: /\bdiscards?\b[^.]*\bcards?\b/i },
  {
    token: "landfall",
    pattern: /\blandfall\b|\bwhenever (?:a|one or more) lands? (?:you control )?enters?\b/i,
  },
  { token: "graveyard", pattern: /\bgraveyard\b/i },
  { token: "gain life", pattern: /\bgains?\b[^.]*\blife\b/i },
  { token: "mill", pattern: /\bmill(?:s|ed|ing)?\b/i },
  {
    token: "artifact",
    pattern: /\bartifacts? you control\b|\bwhenever an(?:other)? artifact\b/i,
    enabler: ARTIFACT_TOKEN_MAKER,
    typeLineEnabler: /\bArtifact\b/,
  },
  {
    token: "enchantment",
    pattern: /\benchantments? you control\b|\bwhenever an(?:other)? enchantment\b/i,
  },
  { token: "treasure", pattern: /\btreasure tokens?\b/i },
  { token: "exile", pattern: /\bexile\b/i },
  { token: "proliferate", pattern: /\bproliferate\b/i },
  {
    token: "reanimate",
    pattern: /return target creature card from (?:your|a) graveyard to the battlefield/i,
  },
  {
    token: "cast from graveyard",
    pattern: /\bcast\b[^.]* from (?:your|a) graveyard/i,
  },
  ...COMBAT_KEYWORDS.map(keywordEntry),
  {
    token: "extra combat step",
    pattern: /\badditional combat phase\b|\bextra combat\b/i,
  },
  { token: "equip", pattern: /\bequip\b/i },
  keywordEntry(FLASH),
  { token: "convoke", pattern: /\bconvoke\b/i },
  {
    token: "tap creature",
    pattern: [
      /\btap (?:an untapped|one or more untapped|(?:another )?target|all|each) (?:\w+ )?(?:creatures?|permanents?)\b(?! (?:you|they) control)/i,
      /\btap (?:up to \w+|any number of|x|two|three|four) (?:other )?target (?:\w+ )?(?:creatures?|permanents?)\b/i,
      /\btap (?:another )?target (?:[\w-]+(?:,| or) )+(?:or )?(?:creatures?|permanents?)\b(?! (?:you|they) control)/i,
      /\btapped creatures? (?:your opponents|an opponent|target opponent|defending player) controls?\b/i,
      /\bcreatures? (?:your opponents|an opponent) controls? enters? (?:the battlefield )?tapped\b/i,
      /\bcreatures? (?:your opponents|an opponent) controls? becomes? tapped\b/i,
      /\bdoesn't untap during (?:its|their) controller's untap step\b/i,
    ],
    search: ["tap"],
  },
  {
    token: "etb",
    pattern: [
      /\bwhenever (?:a|an|another|one or more)\b(?![^.,]*\b(?:land|creature|token)s?\b)[^.,]*\benters?\b/i,
      /\bexile\b[^.]*\breturn (?:it|that card|them|those cards|the exiled cards?)\b[^.]* to the battlefield\b/i,
      PERMANENT_ETB_MULTIPLIER,
    ],
    enabler: ETB_ENABLER,
    reward: PERMANENT_ETB_MULTIPLIER,
    search: ["enter", "return battlefield"],
  },
  {
    token: "creature etb",
    pattern: /\bwhenever (?:a|an|another|one or more)\b[^.,]*\bcreatures?\b[^.,]*\benters?\b/i,
    enabler: ETB_ENABLER,
    enablerTypeLine: /\bCreature\b/,
    reward: /\boffspring\b|\btokens? (?:that's a |that are )?cop(?:y|ies) of\b/i,
    search: ["enter"],
  },
  {
    token: "dies",
    pattern: /\bwhenever (?:a|an|another|one or more)\b[^.,]*\bdie(?:s)?\b/i,
    enabler: /\bwhen\b[^.,]*\bdies\b/i,
    search: ["dies"],
  },
  {
    token: "attacks",
    pattern: /\bwhenever\b[^.,]*\battacks?\b/i,
    search: ["attack"],
  },
  {
    token: "targets",
    pattern:
      /\bspells? that targets?\b|\bbecomes the target of (?:a|an)\b[^.,]*\bspell\b|\bheroic\b/i,
    enabler: /\btarget creature (?:you control )?(?:gets \+|gains\b)/i,
    search: ["target"],
  },
  keywordEntry(DEFENDER),
  { token: "aura", pattern: /\bauras?\b/i },
  { token: "equipment", pattern: /\bequipment\b|\bequipped\b/i },
  { token: "vehicle", pattern: /\bvehicles?\b|\bcrew(?:s|ed)?\b/i, search: ["vehicle", "crew"] },
  { token: "goad", pattern: /\bgoad(?:s|ed)?\b/i },
  { token: "scry", pattern: /\bscry\b|\bsurveil\b/i, search: ["scry", "surveil"] },
  { token: "clue", pattern: /\bclues?\b|\binvestigates?\b/i, search: ["clue", "investigate"] },
  { token: "food", pattern: /\bfood\b/i },
  { token: "blood", pattern: /\bblood tokens?\b/i },
  {
    token: "copy spell",
    pattern: [/\bcop(?:y|ies)\b[^.]*\bspells?\b/i, STORM],
    search: ["copy", "storm"],
  },
  {
    token: "instant or sorcery",
    pattern: [
      /(?<!\b(?:counter|targets|can't cast|opponents? casts?)\b[^.,]{0,40})\binstant (?:or|and) sorcery spells?\b/i,
      /\bmagecraft\b/i,
    ],
    typeLineEnabler: INSTANT_OR_SORCERY,
    search: ["instant sorcery", "magecraft"],
  },
  {
    token: "cost reduction",
    pattern: COST_REDUCTION,
    enabler: KICKER,
    enablerTypeLine: INSTANT_OR_SORCERY,
    search: ["cost less", "kicker"],
  },
  {
    token: "storm",
    pattern: STORM,
    partners: ["cost reduction", "instant or sorcery"],
  },
  { token: "delve", pattern: /^delve\b/im, partners: ["mill", "discard a card"] },
  {
    token: "kicker",
    pattern: [KICKER, /\bkicked\b/i],
    enabler: COST_REDUCTION,
    search: ["kicker", "kicked", "cost less"],
  },
  { token: "overload", pattern: OVERLOAD, partners: ["cost reduction"] },
  { token: "energy", pattern: /\{E\}|\benergy counters?\b/i },
  { token: "experience counter", pattern: /\bexperience counters?\b/i, search: ["experience"] },
  {
    token: "counters",
    pattern: new RegExp(`\\b(?:${OTHER_COUNTER_KINDS.join("|")}) counters?\\b`, "i"),
    enabler: /\bproliferate\b/i,
    search: ["counter"],
  },
  {
    token: "legendary",
    pattern: /\blegendary (?:creatures?|spells?|permanents?|cards?)\b|\bhistoric\b/i,
    typeLineEnabler: /\bLegendary\b/,
    search: ["legendary", "historic"],
  },
];

const PATTERNS_BY_TOKEN = new Map(ORACLE_TEXT_PATTERNS.map((p) => [p.token, p]));

const PARTNERS = new Map<string, Set<string>>();
for (const { token, partners = [] } of ORACLE_TEXT_PATTERNS) {
  for (const partner of partners) {
    PARTNERS.set(token, (PARTNERS.get(token) ?? new Set()).add(partner));
    PARTNERS.set(partner, (PARTNERS.get(partner) ?? new Set()).add(token));
  }
}

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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  let rules = text;
  for (const face of name.split("//")) {
    const trimmed = face.trim();
    if (trimmed) rules = rules.split(trimmed).join("~");
  }
  rules = rules
    .replace(/\bcreates?\b[^.]*?\btokens?\b/gi, "")
    .replace(/\b[Nn]on-?[A-Z][\w'-]*/g, "");
  const types = new Set<string>();
  for (const [word] of rules.matchAll(CAPITALISED_WORD)) {
    const type = CREATURE_TYPE_BY_FORM.get(word);
    if (type) types.add(type);
  }
  return [...types];
}

function matches(pattern: RegExp | RegExp[], text: string): boolean {
  return Array.isArray(pattern) ? pattern.some((p) => p.test(text)) : pattern.test(text);
}

function textThemeTokens(text: string, name: string): Set<string> {
  const tokens = new Set<string>(namedCreatureTypes(text, name));
  for (const { token, pattern } of ORACLE_TEXT_PATTERNS) {
    if (matches(pattern, text)) tokens.add(token);
  }
  for (const condition of powerConditions(text)) tokens.add(condition);
  return tokens;
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
    const found = textThemeTokens(card.oracleText, card.name);
    for (const subtype of subtypesFromTypeLine(card.typeLine)) found.add(subtype);
    tokens = found;
    themeTokenCache.set(key, tokens);
  }
  return tokens;
}

/**
 * The tokens a commander asks for: its oracle-text signals and the tribes its
 * rules text names, but not its own keyword lines or type-line subtypes, which
 * describe the commander rather than the deck it wants.
 */
export function commanderThemeTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = commanderTokenCache.get(key);
  if (!tokens) {
    const text = card.oracleText
      .split("\n")
      .filter((line) => !isKeywordLine(line))
      .join("\n");
    tokens = textThemeTokens(text, card.name);
    commanderTokenCache.set(key, tokens);
  }
  return tokens;
}

function enablerFits(
  { enabler, enablerTypeLine }: OracleTextPattern,
  text: string,
  typeLine: string,
): boolean {
  return !!enabler?.test(text) && (!enablerTypeLine || enablerTypeLine.test(typeLine));
}

/**
 * The tokens a card fits: its `themeTokens`, their partners, and those it only
 * enables, such as a creature with an enters trigger for a blink deck.
 */
export function cardTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = cardTokenCache.get(key);
  if (!tokens) {
    const found = new Set(themeTokens(card));
    for (const token of themeTokens(card)) {
      for (const partner of PARTNERS.get(token) ?? []) found.add(partner);
    }
    for (const pattern of ORACLE_TEXT_PATTERNS) {
      if (
        pattern.typeLineEnabler?.test(card.typeLine) ||
        enablerFits(pattern, card.oracleText, card.typeLine)
      ) {
        found.add(pattern.token);
      }
    }
    tokens = found;
    cardTokenCache.set(key, tokens);
  }
  return tokens;
}

export const REPEATABLE_STRENGTH = 2;
export const MULTIPLAYER_STRENGTH = 1.5;

const TRIGGERED_CLAUSE = /^(?:whenever\b|at the beginning of (?!(?:the |your )?next\b))/i;
const ACTIVATED_CLAUSE = /^[^:."—•]*:/;
const MULTIPLAYER_CLAUSE =
  /\b(?:each opponent|your opponents|all opponents|each other player|whenever an opponent|at the beginning of each)\b/i;

const MODE_LABEL = /^•\s*(?:[^—.]{1,30}—\s*)?/;

function isRepeatable(clause: string): boolean {
  return TRIGGERED_CLAUSE.test(clause.trimStart()) || ACTIVATED_CLAUSE.test(clause);
}

function clauseStrength(clause: string, repeatable: boolean): number {
  let strength = repeatable ? REPEATABLE_STRENGTH : 1;
  if (MULTIPLAYER_CLAUSE.test(clause)) strength *= MULTIPLAYER_STRENGTH;
  return strength;
}

function clauseTokens(clause: string, card: Card): Set<string> {
  const tokens = textThemeTokens(clause, card.name);
  for (const pattern of ORACLE_TEXT_PATTERNS) {
    if (enablerFits(pattern, clause, card.typeLine)) tokens.add(pattern.token);
  }
  return tokens;
}

const strengthCache = new Map<string, ReadonlyMap<string, number>>();

function clauseStrengths(card: Card): Map<string, number> {
  const found = new Map<string, number>();
  const oneShotCard = INSTANT_OR_SORCERY.test(card.typeLine);
  let headerRepeats = false;
  for (const line of rulesLines(card)) {
    const isMode = line.startsWith("•");
    const clause = isMode ? line.replace(MODE_LABEL, "") : line;
    const repeats: boolean = isRepeatable(clause) || (isMode && headerRepeats);
    if (!isMode) headerRepeats = repeats;
    const strength = clauseStrength(clause, !oneShotCard && repeats);
    for (const token of clauseTokens(clause, card)) {
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

/**
 * The tokens a card rewards, as opposed to what its rewards are: those named in
 * its "whenever …" trigger conditions, and the tribes its rules text names.
 * Hylda of the Icy Crown's "Whenever you tap an untapped creature an opponent
 * controls" yields `tap creature`, not the token, counter or card her trigger
 * gives; Lathril's "Tap ten untapped Elves you control" yields `elf`.
 */
export function rewardedTokens(card: Card): Set<string> {
  const tokens = new Set<string>(namedCreatureTypes(card.oracleText, card.name));
  for (const condition of powerConditions(card.oracleText)) tokens.add(condition);
  for (const { token, reward } of ORACLE_TEXT_PATTERNS) {
    if (reward?.test(card.oracleText)) tokens.add(token);
  }
  for (const [clause] of card.oracleText.matchAll(/\bwhenever\b[^.,]*/gi)) {
    for (const token of textThemeTokens(clause, card.name)) tokens.add(token);
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
  return namedCreatureTypes(card.oracleText, card.name);
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
  const pattern = PATTERNS_BY_TOKEN.get(token);
  if (!pattern) return null;
  const partnerSearches = [...(PARTNERS.get(token) ?? [])].flatMap(
    (partner) => PATTERNS_BY_TOKEN.get(partner)?.search ?? [partner],
  );
  return [...new Set([...(pattern.search ?? [token]), ...partnerSearches])];
}
