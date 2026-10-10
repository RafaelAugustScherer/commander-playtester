import { ruleClauses } from "../lib/rulesText";
import type { Card } from "../lib/types";
import { isNoncreatureSpell } from "./cardTypes";

/** One phrase, or several alternatives. */
export type TextTest = RegExp | readonly RegExp[];
type CardTest = (card: Card) => boolean;

/**
 * One curated theme token and how a card bears on it (`deck-draft/ADR-0001`).
 * Its `signal` adds the token to a deck's theme and fits it. `fitsText` and
 * `fitsCard` only fit it: fodder a theme wants, which makes no theme of its own
 * (`deck-draft/ADR-0005`). `rewards` makes a commander reward it without
 * signalling it. A token and its `partners` fit each other.
 */
export interface TokenRule {
  token: string;
  signal: TextTest;
  /**
   * What signals the token in a commander's own text, read with every name it
   * calls itself as "~" (`asSelf`), when that is not `signal`; "never" when a
   * commander's own effect never seeds it (`deck-draft/ADR-0014`).
   */
  commander?: TextTest | "never";
  /** Text that fits the token, on a card whose type line matches `typeLine` when that is set. */
  fitsText?: { text: TextTest; typeLine?: RegExp };
  /** Card data that fits the token, such as a type line or an {X} mana cost. */
  fitsCard?: CardTest;
  /** Rules text, or card data, that makes a commander reward the token. */
  rewards?: TextTest | CardTest;
  /** Free-text searches that together reach every match; defaults to the token. */
  search?: string[];
  partners?: string[];
}

const typeLineHas =
  (pattern: RegExp): CardTest =>
  (card) =>
    pattern.test(card.typeLine);

const PERMANENT_ETB_MULTIPLIER = /\bentering\b[^.]*\btriggers? an additional time\b/i;
const ETB_ENABLER = /\bwhen\b(?![^.,]*\blands?\b)[^.,]*\benters\b/i;
const ARTIFACT_TOKEN_MAKER = [
  /\bcreates?\b[^.]*\b(?:artifact|treasure|clue|food|blood|gold|powerstone|map|junk|incubator|lander)\b[^.]*\btokens?\b/i,
  /\b(?:investigates?|incubates?)\b/i,
];

const INSTANT_OR_SORCERY = /\b(?:Instant|Sorcery)\b/;
// A lookbehind: the spells that follow are ones you cast, not ones countered,
// targeted, kept from being cast or cast by opponents.
const CAST_BY_YOU = String.raw`(?<!\b(?:counter|targets|can't cast|opponents? casts?)\b[^.,]{0,40})`;
const COMBAT_DAMAGE_TO_A_PLAYER = String.raw`\bdeals? combat damage to (?:a player|an opponent|(?:one of )?your opponents|one or more (?:players|opponents)|that player|defending player)\b`;
const STORM = /^storm(?:$| \()/im;
const KICKER = /^(?:multi)?kicker\b/im;
const OVERLOAD = /^overload\b/im;
const COST_REDUCTION =
  /(?:^|[.:]\s+|\b(?:sorcery|noncreature|white|blue|black|red|green|multicolored) )spells (?:you cast )?cost\b[^.]*\bless\b/im;
const MANA_ABILITY = /^[^:]*:\s*add\b/i;

/** Whether a card has a non-mana activated ability with {T} in its cost, which untapping pays off. */
function hasTapAbility(card: Card): boolean {
  return ruleClauses(card).some(
    ({ text, cost }) => !!cost?.includes("{T}") && !MANA_ABILITY.test(text),
  );
}

const COMBAT_KEYWORDS = [
  "flying", "deathtouch", "lifelink", "trample", "menace", "first strike", "double strike",
  "haste", "vigilance", "indestructible", "hexproof",
];
const FLASH = "flash";
const DEFENDER = "defender";
// Evasion a creature carries as a keyword; "can't be blocked" is the `evasion` signal.
const EVASION_KEYWORDS = ["fear", "intimidate", "shadow", "skulk", "horsemanship", String.raw`\w+walk`];
/** Keywords that describe a creature rather than the deck it wants. */
export const RULES_KEYWORDS = [...COMBAT_KEYWORDS, FLASH, DEFENDER, "reach", ...EVASION_KEYWORDS];

function keywordRule(keyword: string): TokenRule {
  return { token: keyword, signal: new RegExp(`\\b${keyword}\\b`, "i") };
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
const CURATED_RULES: TokenRule[] = [
  { token: "+1/+1 counter", signal: /\+1\/\+1 counters?\b/i },
  { token: "-1/-1 counter", signal: /-1\/-1 counters?\b/i },
  { token: "sacrifice", signal: /\bsacrifice[sd]?\b/i },
  {
    token: "create token",
    signal: [
      /\bcreates?\b[^.]*\btokens?\b/i,
      /\bwhenever (?:a|an|another|one or more)\b[^.,]*\btokens?\b[^.,]*\benters?\b/i,
    ],
  },
  {
    token: "draw a card",
    signal: /\bdraws?\b (?:a|one|two|three|four|five|\d+|x) cards?/i,
  },
  { token: "discard a card", signal: /\bdiscards?\b[^.]*\bcards?\b/i },
  {
    token: "landfall",
    signal: /\blandfall\b|\bwhenever (?:a|one or more) lands? (?:you control )?enters?\b/i,
  },
  { token: "graveyard", signal: /\bgraveyard\b/i },
  { token: "gain life", signal: /\bgains?\b[^.]*\blife\b/i },
  { token: "mill", signal: /\bmill(?:s|ed|ing)?\b/i },
  {
    token: "artifact",
    signal: /\bartifacts? you control\b|\bwhenever an(?:other)? artifact\b/i,
    fitsText: { text: ARTIFACT_TOKEN_MAKER },
    fitsCard: typeLineHas(/\bArtifact\b/),
  },
  {
    token: "enchantment",
    signal: /\benchantments? you control\b|\bwhenever an(?:other)? enchantment\b/i,
  },
  { token: "treasure", signal: /\btreasure tokens?\b/i },
  { token: "exile", signal: /\bexile\b/i },
  { token: "proliferate", signal: /\bproliferate\b/i },
  {
    token: "reanimate",
    signal: /return target creature card from (?:your|a) graveyard to the battlefield/i,
  },
  {
    token: "cast from graveyard",
    signal: /\bcast\b[^.]* from (?:your|a) graveyard/i,
  },
  ...COMBAT_KEYWORDS.map(keywordRule),
  {
    token: "extra combat step",
    signal: /\badditional combat phase\b|\bextra combat\b/i,
  },
  { token: "equip", signal: /\bequip\b/i },
  keywordRule(FLASH),
  { token: "convoke", signal: /\bconvoke\b/i },
  {
    token: "tap creature",
    signal: [
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
    signal: [
      /\bwhenever (?:a|an|another|one or more)\b(?![^.,]*\b(?:land|creature|token)s?\b)[^.,]*\benters?\b/i,
      /\bexile\b[^.]*\breturn (?:it|that card|them|those cards|the exiled cards?)\b[^.]* to the battlefield\b/i,
      PERMANENT_ETB_MULTIPLIER,
    ],
    fitsText: { text: ETB_ENABLER },
    rewards: PERMANENT_ETB_MULTIPLIER,
    search: ["enter", "return battlefield"],
  },
  {
    token: "creature etb",
    signal: /\bwhenever (?:a|an|another|one or more)\b[^.,]*\bcreatures?\b[^.,]*\benters?\b/i,
    fitsText: { text: ETB_ENABLER, typeLine: /\bCreature\b/ },
    rewards: /\boffspring\b|\btokens? (?:that's a |that are )?cop(?:y|ies) of\b/i,
    search: ["enter"],
  },
  {
    token: "dies",
    signal: [/\bwhenever (?:a|an|another|one or more)\b[^.,]*\bdie(?:s)?\b/i, /\bcreature dying\b/i],
    fitsText: { text: /\bwhen\b[^.,]*\bdies\b/i },
    rewards: /\bdying causes\b/i,
    search: ["dies"],
  },
  {
    token: "attacks",
    signal: /\bwhenever\b[^.,]*\battacks?\b/i,
    search: ["attack"],
  },
  {
    token: "targets",
    signal:
      /\bspells? that targets?\b|\bbecomes the target of (?:a|an)\b[^.,]*\bspell\b|\bheroic\b/i,
    fitsText: { text: /\btarget creature (?:you control )?(?:gets \+|gains\b)/i },
    search: ["target"],
  },
  keywordRule(DEFENDER),
  { token: "aura", signal: /\bauras?\b/i },
  { token: "equipment", signal: /\bequipment\b|\bequipped\b/i },
  { token: "vehicle", signal: /\bvehicles?\b|\bcrew(?:s|ed)?\b/i, search: ["vehicle", "crew"] },
  { token: "goad", signal: /\bgoad(?:s|ed)?\b/i },
  { token: "scry", signal: /\bscry\b|\bsurveil\b/i, search: ["scry", "surveil"] },
  { token: "clue", signal: /\bclues?\b|\binvestigates?\b/i, search: ["clue", "investigate"] },
  { token: "food", signal: /\bfood\b/i },
  { token: "blood", signal: /\bblood tokens?\b/i },
  {
    token: "copy spell",
    signal: [/\bcop(?:y|ies)\b[^.]*\bspells?\b/i, STORM],
    search: ["copy", "storm"],
  },
  {
    token: "instant or sorcery",
    signal: [
      new RegExp(String.raw`${CAST_BY_YOU}\binstant (?:or|and) sorcery spells?\b`, "i"),
      /\bmagecraft\b/i,
    ],
    fitsCard: typeLineHas(INSTANT_OR_SORCERY),
    search: ["instant sorcery", "magecraft"],
  },
  {
    token: "cost reduction",
    signal: COST_REDUCTION,
    fitsText: { text: KICKER, typeLine: INSTANT_OR_SORCERY },
    search: ["cost less", "kicker"],
  },
  {
    token: "storm",
    signal: STORM,
    partners: ["cost reduction", "instant or sorcery"],
  },
  { token: "delve", signal: /^delve\b/im, partners: ["mill", "discard a card"] },
  {
    token: "kicker",
    signal: [KICKER, /\bkicked\b/i],
    fitsText: { text: COST_REDUCTION },
    search: ["kicker", "kicked", "cost less"],
  },
  { token: "overload", signal: OVERLOAD, partners: ["cost reduction"] },
  { token: "energy", signal: /\{E\}|\benergy counters?\b/i },
  { token: "experience counter", signal: /\bexperience counters?\b/i, search: ["experience"] },
  {
    token: "counters",
    signal: new RegExp(`\\b(?:${OTHER_COUNTER_KINDS.join("|")}) counters?\\b`, "i"),
    fitsText: { text: /\bproliferate\b/i },
    search: ["counter"],
  },
  {
    token: "legendary",
    signal: /\blegendary (?:creatures?|spells?|permanents?|cards?)\b|\bhistoric\b/i,
    fitsCard: typeLineHas(/\bLegendary\b/),
    search: ["legendary", "historic"],
  },
  // Mechanics added in `deck-draft/ADR-0014`.
  {
    token: "combat damage",
    signal: new RegExp(COMBAT_DAMAGE_TO_A_PLAYER, "i"),
    // A commander's own trigger ("Whenever ~ deals", "Whenever ~ enters or deals",
    // "When ~ enters and whenever it deals") asks for protection
    // (`wantsToConnect`), not for payoffs; "~ or another Spirit" still seeds.
    commander: new RegExp(String.raw`(?<!\bwhenever (?:~|it)(?: \w+ or)? )${COMBAT_DAMAGE_TO_A_PLAYER}`, "i"),
    partners: ["evasion"],
    search: ["combat damage"],
  },
  {
    token: "evasion",
    signal: /\bcan't be blocked\b/i,
    search: ["can't be blocked"],
  },
  {
    token: "ninjutsu",
    signal: /\bninjutsu\b/i,
    rewards: /^(?:commander )?ninjutsu\b/im,
    partners: ["evasion"],
  },
  {
    token: "noncreature spell",
    signal: new RegExp(
      String.raw`${CAST_BY_YOU}\bnoncreature spells?\b(?![^.]*\bcosts? \{\d+\} more\b)`,
      "i",
    ),
    fitsCard: (card) => isNoncreatureSpell(card.typeLine),
    search: ["noncreature"],
  },
  {
    token: "second spell",
    signal: /\bsecond spell\b/i,
    partners: ["cost reduction"],
    search: ["second spell"],
  },
  {
    token: "extra draw",
    signal: /\bsecond card\b/i,
    partners: ["draw a card"],
    search: ["second card"],
  },
  {
    token: "anthem",
    signal: /\b(?:creatures|creature tokens|tokens) you control get \+(?:\d+|x)\/\+(?:\d+|x)/i,
    partners: ["create token"],
    search: ["you control get"],
  },
  {
    token: "drain",
    signal: [
      /\b(?:each opponent|target opponent|each other player|target player|that player|defending player) loses? (?:\d+|x|that much|half their) life\b/i,
      /\bloses? life equal to\b/i,
    ],
    search: ["loses life", "lose life"],
  },
  {
    token: "impulse draw",
    signal: [
      /\bexile the top\b[^\n]*\byou may (?:play|cast)\b/i,
      /\b(?:play|cast)s? (?:a card|cards|a spell|spells) from exile\b/i,
    ],
    search: ["exile the top", "from exile"],
  },
  {
    token: "lands matter",
    signal: [/\blands you control\b/i, /\bland cards? from your graveyard\b/i, /\bplay lands? from\b/i],
    partners: ["landfall"],
    search: ["lands you control", "land cards"],
  },
  {
    token: "clone",
    signal: [
      /\bcopy of (?:target|another|a|any|up to \w+ target)\b[^.]*\bcreature\b/i,
      /\btokens? that's a copy\b/i,
    ],
    search: ["copy"],
  },
  {
    token: "x spell",
    signal: /\{X\} in (?:its|their) mana costs?\b|\bspells? with \{X\}/i,
    fitsCard: (card) => card.hasXCost,
    search: ["X"],
  },
  {
    token: "untap",
    signal: /\buntap (?:target|all|another|each|up to \w+|two|three|x)\b/i,
    // Untapping pays off a commander's tap ability, not its own untap effect.
    commander: "never",
    rewards: hasTapAbility,
    search: ["untap"],
  },
  {
    token: "tutor",
    signal:
      /\bsearch your library for (?:an?|up to \w+|any number of) (?!(?:basic )?(?:land|forest|plains|island|swamp|mountain))[^.]*\bcards?\b/i,
    // A commander that tutors is the tutor its deck wants, as ramp is (`deck-draft/ADR-0009`).
    commander: "never",
    search: ["search your library"],
  },
  { token: "mutate", signal: /\bmutates?\b/i, rewards: /^mutate\b/im },
  { token: "explore", signal: /\bexplores?\b/i },
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

const CURATED_TOKENS = new Set(CURATED_RULES.map(({ token }) => token));
for (const [keyword, tokens] of KEYWORD_TOKENS) {
  const unknown = tokens.find((token) => !CURATED_TOKENS.has(token));
  if (unknown) throw new Error(`KEYWORD_TOKENS: ${keyword} signals no curated token "${unknown}"`);
}

/**
 * The rules tokens are read with: the curated ones, each with the keywords
 * that signal its token (`KEYWORD_TOKENS`) folded into its `signal`.
 */
export const TOKEN_RULES: readonly TokenRule[] = CURATED_RULES.map((rule) => {
  const keywords = KEYWORD_TOKENS.filter(([, tokens]) => tokens.includes(rule.token)).map(
    ([keyword]) => keyword,
  );
  return keywords.length === 0 ? rule : { ...rule, signal: [rule.signal, ...keywords].flat() };
});
