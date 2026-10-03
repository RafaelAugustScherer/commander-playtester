import type { Card } from "../lib/types";
import { CREATURE_TYPES } from "./creatureTypes";

/**
 * One curated oracle-text signal. Matching `pattern` contributes `token` to the
 * deck's theme and fits it; matching `enabler` (or `typeLineEnabler`) only fits
 * it — fodder a theme wants, which does not make a theme of its own
 * (`deck-draft/ADR-0005`).
 */
export interface OracleTextPattern {
  token: string;
  /** One phrase, or several alternatives. */
  pattern: RegExp | RegExp[];
  enabler?: RegExp;
  typeLineEnabler?: RegExp;
  /** Free-text searches that together reach every match; defaults to the token. */
  search?: string[];
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
  { token: "create token", pattern: /\bcreates?\b[^.]*\btokens?\b/i },
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
  { token: "flying", pattern: /\bflying\b/i },
  { token: "deathtouch", pattern: /\bdeathtouch\b/i },
  { token: "lifelink", pattern: /\blifelink\b/i },
  { token: "trample", pattern: /\btrample\b/i },
  { token: "menace", pattern: /\bmenace\b/i },
  { token: "first strike", pattern: /\bfirst strike\b/i },
  { token: "double strike", pattern: /\bdouble strike\b/i },
  { token: "haste", pattern: /\bhaste\b/i },
  { token: "vigilance", pattern: /\bvigilance\b/i },
  { token: "indestructible", pattern: /\bindestructible\b/i },
  { token: "hexproof", pattern: /\bhexproof\b/i },
  {
    token: "extra combat step",
    pattern: /\badditional combat phase\b|\bextra combat\b/i,
  },
  { token: "equip", pattern: /\bequip\b/i },
  { token: "flash", pattern: /\bflash\b/i },
  { token: "convoke", pattern: /\bconvoke\b/i },
  {
    token: "tap creature",
    pattern: [
      /\btap (?:an untapped|(?:another )?target|all|each) (?:\w+ )?(?:creatures?|permanents?)\b(?! you control)/i,
      /\btap (?:up to \w+|any number of) (?:other )?target (?:\w+ )?(?:creatures?|permanents?)\b/i,
      /\btapped creatures? (?:your opponents|an opponent|defending player) controls?\b/i,
      /\bcreatures? (?:your opponents|an opponent) controls? enters? (?:the battlefield )?tapped\b/i,
      /\bdoesn't untap during (?:its|their) controller's untap step\b/i,
    ],
    search: ["tap"],
  },
  {
    token: "etb",
    pattern: [
      /\bwhenever (?:a|an|another|one or more)\b(?![^.,]*\blands?\b)[^.,]*\benters?\b/i,
      /\bexile\b[^.]*\breturn (?:it|that card|them|those cards|the exiled cards?)\b[^.]* to the battlefield\b/i,
    ],
    enabler: /\bwhen\b(?![^.,]*\blands?\b)[^.,]*\benters\b/i,
    search: ["enter", "return battlefield"],
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
  { token: "defender", pattern: /\bdefender\b/i },
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
    pattern: /\bcop(?:y|ies)\b[^.]*\bspells?\b|\bstorm\b/i,
    search: ["copy", "storm"],
  },
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
function namedCreatureTypes(text: string, name: string): string[] {
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
  return tokens;
}

// The same cards are scored round after round, so their tokens are kept.
const themeTokenCache = new Map<string, ReadonlySet<string>>();
const cardTokenCache = new Map<string, ReadonlySet<string>>();

function cacheKey(card: Card): string {
  return `${card.name}\u0000${card.typeLine}\u0000${card.oracleText}`;
}

/**
 * The tokens a card adds to a deck's theme: its permanent subtypes, the
 * creature types its rules text names, and its oracle-text signals.
 */
export function themeTokens(card: Card): ReadonlySet<string> {
  const key = cacheKey(card);
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
 * The tokens a card fits: its `themeTokens` plus those it only enables, such as
 * a creature with an enters trigger for a blink deck.
 */
export function cardTokens(card: Card): ReadonlySet<string> {
  const key = cacheKey(card);
  let tokens = cardTokenCache.get(key);
  if (!tokens) {
    const found = new Set(themeTokens(card));
    for (const { token, enabler, typeLineEnabler } of ORACLE_TEXT_PATTERNS) {
      if (enabler?.test(card.oracleText) || typeLineEnabler?.test(card.typeLine)) {
        found.add(token);
      }
    }
    tokens = found;
    cardTokenCache.set(key, tokens);
  }
  return tokens;
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
  for (const [clause] of card.oracleText.matchAll(/\bwhenever\b[^.,]*/gi)) {
    for (const token of textThemeTokens(clause, card.name)) tokens.add(token);
  }
  return tokens;
}

/**
 * The free-text searches that reach a curated oracle-text token's matches, or
 * null when `token` is not one (a subtype, searched as itself).
 */
export function tokenSearches(token: string): string[] | null {
  const pattern = PATTERNS_BY_TOKEN.get(token);
  if (!pattern) return null;
  return pattern.search ?? [token];
}
