import { cardKey, isCreature, type Card } from "../lib/types";
import { CREATURE_TYPES } from "./creatureTypes";
import { fitsPowerCondition, powerConditions } from "./powerTokens";
import { ruleClauses, rulesLines, rulesText, withOwnName, withoutReminder } from "../lib/rulesText";

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
  enabler?: RegExp | RegExp[];
  enablerTypeLine?: RegExp;
  typeLineEnabler?: RegExp;
  /** Fits the token from card data rather than text, such as an {X} mana cost. */
  cardEnabler?: (card: Card) => boolean;
  reward?: RegExp;
  /**
   * What seeds the token from a commander's own text, read with its short name
   * as "~", when that differs from `pattern`; empty when a commander's own
   * effect never does (`deck-draft/ADR-0014`).
   */
  commanderPattern?: RegExp | RegExp[];
  /** Free-text searches that together reach every match; defaults to the token. */
  search?: string[];
  partners?: string[];
}

const PERMANENT_ETB_MULTIPLIER = /\bentering\b[^.]*\btriggers? an additional time\b/i;
const ETB_ENABLER = /\bwhen\b(?![^.,]*\blands?\b)[^.,]*\benters\b/i;
const ARTIFACT_TOKEN_MAKER = [
  /\bcreates?\b[^.]*\b(?:artifact|treasure|clue|food|blood|gold|powerstone|map|junk|incubator|lander)\b[^.]*\btokens?\b/i,
  /\b(?:investigates?|incubates?)\b/i,
];

const INSTANT_OR_SORCERY = /\b(?:Instant|Sorcery)\b/;
// A noncreature, nonland spell: the front face's types before its subtypes.
const NONCREATURE_SPELL =
  /^(?![^—/]*\b(?:Creature|Land)\b)[^—/]*\b(?:Instant|Sorcery|Artifact|Enchantment|Planeswalker|Battle)\b/;
// Evasion a creature carries: a keyword that keeps blockers off, or being unblockable.
const EVASIVE = [
  /(?:^|, )(?:fear|intimidate|shadow|skulk|horsemanship)\b/im,
  /\b(?:island|swamp|forest|mountain|plains|desert|land)walk\b/i,
  /\bcan't be blocked\b/i,
];
// Spells cast or copied by you, not countered, targeted or taxed.
const NOT_YOUR_SPELL = String.raw`(?<!\b(?:counter|targets|can't cast|opponents? casts?)\b[^.,]{0,40})`;
const COMBAT_DAMAGE_TO_A_PLAYER = String.raw`deals? combat damage to (?:a player|an opponent|(?:one of )?your opponents|one or more (?:players|opponents)|that player|defending player)\b`;
// A non-mana activated ability with {T} in its cost ("{2}, {T}, Sacrifice …: …").
const TAP_ABILITY = /^(?:(?:\{[^}]+\})+, )?\{T\}(?:, [^:\n]+)?: (?!add\b)/im;
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
const EVASION_KEYWORDS = ["fear", "intimidate", "shadow", "skulk", "horsemanship", String.raw`\w+walk`];
const RULES_KEYWORDS = [...COMBAT_KEYWORDS, FLASH, DEFENDER, "reach", ...EVASION_KEYWORDS];

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
const CURATED_PATTERNS: OracleTextPattern[] = [
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
    pattern: [/\bwhenever (?:a|an|another|one or more)\b[^.,]*\bdie(?:s)?\b/i, /\bcreature dying\b/i],
    enabler: /\bwhen\b[^.,]*\bdies\b/i,
    reward: /\bdying causes\b/i,
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
  // Mechanics added in `deck-draft/ADR-0014`.
  {
    token: "combat damage",
    pattern: new RegExp(String.raw`\b${COMBAT_DAMAGE_TO_A_PLAYER}`, "i"),
    // A commander's own trigger asks for protection (`protectionTarget`), not for payoffs.
    commanderPattern: new RegExp(String.raw`(?<!~ )\b${COMBAT_DAMAGE_TO_A_PLAYER}`, "i"),
    enabler: EVASIVE,
    enablerTypeLine: /\bCreature\b/,
    partners: ["evasion"],
    search: ["combat damage"],
  },
  {
    token: "evasion",
    pattern: /\bcan't be blocked\b/i,
    search: ["can't be blocked"],
  },
  { token: "ninjutsu", pattern: /\bninjutsu\b/i, partners: ["evasion"] },
  {
    token: "noncreature spell",
    pattern: new RegExp(String.raw`${NOT_YOUR_SPELL}\bnoncreature spells?\b(?![^.]*\bcosts? \{\d+\} more\b)`, "i"),
    typeLineEnabler: NONCREATURE_SPELL,
    search: ["noncreature"],
  },
  {
    token: "second spell",
    pattern: /\bsecond spell\b/i,
    partners: ["cost reduction"],
    search: ["second spell"],
  },
  {
    token: "extra draw",
    pattern: /\bsecond card\b/i,
    partners: ["draw a card"],
    search: ["second card"],
  },
  {
    token: "anthem",
    pattern: /\b(?:creatures|creature tokens|tokens) you control get \+(?:\d+|x)\/\+(?:\d+|x)/i,
    partners: ["create token"],
    search: ["you control get"],
  },
  {
    token: "drain",
    pattern: [
      /\b(?:each opponent|target opponent|each other player|target player|that player|defending player) loses? (?:\d+|x|that much|half their) life\b/i,
      /\bloses? life equal to\b/i,
    ],
    search: ["loses life", "lose life"],
  },
  {
    token: "impulse draw",
    pattern: [/\bexile the top\b[^\n]*\byou may (?:play|cast)\b/i, /\b(?:play|cast)s? (?:a card|cards|a spell|spells) from exile\b/i],
    search: ["exile the top", "from exile"],
  },
  {
    token: "lands matter",
    pattern: [/\blands you control\b/i, /\bland cards? from your graveyard\b/i, /\bplay lands? from\b/i],
    partners: ["landfall"],
    search: ["lands you control", "land cards"],
  },
  {
    token: "clone",
    pattern: [/\bcopy of (?:target|another|a|any|up to \w+ target)\b[^.]*\bcreature\b/i, /\btokens? that's a copy\b/i],
    search: ["copy"],
  },
  {
    token: "x spell",
    pattern: /\{X\} in (?:its|their) mana costs?\b|\bspells? with \{X\}/i,
    cardEnabler: (card) => !!card.hasXCost,
    search: ["X"],
  },
  {
    token: "untap",
    pattern: /\buntap (?:target|all|another|each|up to \w+|two|three|x)\b/i,
    // Untapping pays off a commander's tap ability, not its own untap effect.
    commanderPattern: [],
    reward: TAP_ABILITY,
    search: ["untap"],
  },
  {
    token: "tutor",
    pattern:
      /\bsearch your library for (?:an?|up to \w+|any number of) (?!(?:basic )?(?:land|forest|plains|island|swamp|mountain))[^.]*\bcards?\b/i,
    // A commander that tutors is the tutor its deck wants, as ramp is (`deck-draft/ADR-0009`).
    commanderPattern: [],
    search: ["search your library"],
  },
  { token: "mutate", pattern: /\bmutates?\b/i },
  { token: "explore", pattern: /\bexplores?\b/i },
];

/**
 * Keywords whose meaning lives in their reminder text, which token reading
 * skips: each signals the tokens its own effect is about, so persist still
 * reads as -1/-1 counters while a Treasure's reminder no longer reads as
 * sacrifice (`deck-draft/ADR-0013`).
 */
const KEYWORD_TOKENS: Array<[RegExp, string[]]> = [
  [/\b(?:persist|wither)\b/i, ["-1/-1 counter"]],
  [/\binfect\b/i, ["-1/-1 counter", "counters"]],
  [/\btoxic\b/i, ["counters"]],
  [
    /\b(?:undying|megamorph|backup|bloodthirst|renown|riot|unleash|reinforce|tribute|ravenous|amplify|adapt|monstrosity|bolster|support|outlast|modular|explores?|awaken)\b/i,
    ["+1/+1 counter"],
  ],
  [/\b(?:evolve|graft)\b/i, ["+1/+1 counter", "creature etb"]],
  [/\bdevour\b/i, ["+1/+1 counter", "sacrifice"]],
  [/\b(?:fabricate|amass)\b/i, ["+1/+1 counter", "create token"]],
  [/\b(?:mentor|training|dethrone)\b/i, ["+1/+1 counter", "attacks"]],
  [/\b(?:exalted|battle cry|melee|provoke|annihilator|firebending)\b/i, ["attacks"]],
  [/\b(?:myriad|mobilize)\b/i, ["attacks", "create token"]],
  [
    /\b(?:afterlife|offspring|living weapon|squad|job select|populate|investigate|incubate)\b|\bfor mirrodin!/i,
    ["create token"],
  ],
  [/\b(?:embalm|eternalize|encore)\b/i, ["create token", "graveyard"]],
  [
    /\b(?:flashback|escape|disturb|retrace|jump-start|harmonize|mayhem)\b/i,
    ["cast from graveyard", "graveyard"],
  ],
  [/\b(?:unearth|scavenge|soulshift|recover)\b/i, ["graveyard"]],
  [/\bdredge\b/i, ["mill", "graveyard"]],
  [/\bmadness\b/i, ["discard a card", "graveyard"]],
  [/\bcycling\b/i, ["draw a card", "discard a card"]],
  [/\b\w+cycling\b/i, ["discard a card"]],
  [/\bconnives?\b/i, ["draw a card", "discard a card"]],
  [/\b(?:exploit|bargain|offering|blitz|evoke)\b/i, ["sacrifice"]],
  [/\bcasualty\b/i, ["sacrifice", "copy spell"]],
  [/\bepic\b/i, ["copy spell"]],
  [
    /\b(?:cumulative upkeep|level up|station|read ahead|vanishing|fading|suspend|impending)\b/i,
    ["counters"],
  ],
  [/\bbestow\b/i, ["aura"]],
  [/\bextort\b/i, ["gain life"]],
  [/\bprowess\b/i, ["noncreature spell"]],
  [new RegExp(String.raw`\b(?:${EVASION_KEYWORDS.join("|")})\b`, "i"), ["evasion"]],
  [/\bimprovise\b/i, ["artifact"]],
];

const CURATED_TOKENS = new Set(CURATED_PATTERNS.map(({ token }) => token));
for (const [keyword, tokens] of KEYWORD_TOKENS) {
  const unknown = tokens.find((token) => !CURATED_TOKENS.has(token));
  if (unknown) throw new Error(`KEYWORD_TOKENS: ${keyword} signals no curated token "${unknown}"`);
}

/**
 * The oracle-text patterns tokens are read with: the curated ones, each with
 * the keywords that signal its token (`KEYWORD_TOKENS`) folded in.
 */
export const ORACLE_TEXT_PATTERNS: OracleTextPattern[] = CURATED_PATTERNS.map((entry) => {
  const keywords = KEYWORD_TOKENS.filter(([, tokens]) => tokens.includes(entry.token)).map(
    ([keyword]) => keyword,
  );
  return keywords.length === 0 ? entry : { ...entry, pattern: [entry.pattern, ...keywords].flat() };
});

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

function matches(pattern: RegExp | RegExp[], text: string): boolean {
  return Array.isArray(pattern) ? pattern.some((p) => p.test(text)) : pattern.test(text);
}

/**
 * The tokens a text signals, read from rules text without reminder text
 * (`deck-draft/ADR-0013`) and with the card's own name read as "~", so a name
 * signals nothing. A commander's text is read with each `commanderPattern`.
 */
function textThemeTokens(text: string, card: Card, asCommander = false): Set<string> {
  const rules = withOwnName(text, card);
  const commanderRules = asCommander ? withOwnName(text, card, true) : rules;
  const tokens = new Set<string>(typesNamedIn(rules));
  for (const { token, pattern, commanderPattern } of ORACLE_TEXT_PATTERNS) {
    const own = asCommander ? commanderPattern : undefined;
    if (own ? matches(own, commanderRules) : matches(pattern, rules)) tokens.add(token);
  }
  for (const condition of powerConditions(rules)) tokens.add(condition);
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
 * describe the commander rather than the deck it wants.
 */
export function commanderThemeTokens(card: Card): ReadonlySet<string> {
  const key = cardKey(card);
  let tokens = commanderTokenCache.get(key);
  if (!tokens) {
    const text = rulesLines(card)
      .filter((line) => !isKeywordLine(line))
      .join("\n");
    tokens = textThemeTokens(text, card, true);
    commanderTokenCache.set(key, tokens);
  }
  return tokens;
}

function enablerFits(
  { enabler, enablerTypeLine }: OracleTextPattern,
  text: string,
  typeLine: string,
): boolean {
  return (
    !!enabler && matches(enabler, text) && (!enablerTypeLine || enablerTypeLine.test(typeLine))
  );
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
        pattern.cardEnabler?.(card) ||
        enablerFits(pattern, rulesText(card), card.typeLine)
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

const MULTIPLAYER_CLAUSE =
  /\b(?:each opponent|your opponents|all opponents|each other player|whenever an opponent|at the beginning of each)\b/i;

function clauseStrength(clause: string, repeatable: boolean): number {
  let strength = repeatable ? REPEATABLE_STRENGTH : 1;
  if (MULTIPLAYER_CLAUSE.test(clause)) strength *= MULTIPLAYER_STRENGTH;
  return strength;
}

function clauseTokens(clause: string, card: Card): Set<string> {
  const tokens = textThemeTokens(clause, card);
  for (const pattern of ORACLE_TEXT_PATTERNS) {
    if (enablerFits(pattern, clause, card.typeLine)) tokens.add(pattern.token);
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

/**
 * The tokens a card rewards, as opposed to what its rewards are: those named in
 * its "whenever …" trigger conditions, the tribes its rules text names, and the
 * mechanics it carries as keyword abilities (`ownMechanics`).
 * Hylda of the Icy Crown's "Whenever you tap an untapped creature an opponent
 * controls" yields `tap creature`, not the token, counter or card her trigger
 * gives; Lathril's "Tap ten untapped Elves you control" yields `elf`.
 */
export function rewardedTokens(card: Card): Set<string> {
  const text = rulesText(card);
  const tokens = new Set<string>(namedCreatureTypes(text, card.name));
  for (const condition of powerConditions(text)) tokens.add(condition);
  for (const { token, reward } of ORACLE_TEXT_PATTERNS) {
    if (reward?.test(text)) tokens.add(token);
  }
  for (const [clause] of text.matchAll(/\bwhenever\b[^.,]*/gi)) {
    for (const token of textThemeTokens(clause, card, true)) tokens.add(token);
  }
  for (const mechanic of ownMechanics(card)) tokens.add(mechanic);
  return tokens;
}

// A keyword ability alone on its line, with its mana cost if it has one.
const KEYWORD_WITH_COST = /^(?:commander )?(\w+)(?: (?:\{[^}]+\})+)?$/i;

/**
 * The mechanics a card carries as keyword abilities named after a token
 * ("Mutate {2}{U/B}{G}{G}", "Commander ninjutsu {U}{B}"), leaving out those that
 * only describe it: a commander built on one rewards it (`deck-draft/ADR-0014`).
 */
function ownMechanics(card: Card): string[] {
  return rulesLines(card).flatMap((line) => {
    const keyword = KEYWORD_WITH_COST.exec(line)?.[1].toLowerCase();
    return keyword && CURATED_TOKENS.has(keyword) && !isKeywordLine(line) ? [keyword] : [];
  });
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
  const pattern = PATTERNS_BY_TOKEN.get(token);
  if (!pattern) return null;
  const partnerSearches = [...(PARTNERS.get(token) ?? [])].flatMap(
    (partner) => PATTERNS_BY_TOKEN.get(partner)?.search ?? [partner],
  );
  return [...new Set([...(pattern.search ?? [token]), ...partnerSearches])];
}
