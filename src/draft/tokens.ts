import type { Card } from "../lib/types";

/** One curated oracle-text signal: matching `pattern` contributes `token`. */
export interface OracleTextPattern {
  token: string;
  pattern: RegExp;
}

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
];

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

/** Extract a card's theme tokens: permanent subtypes plus oracle-text signals. */
export function cardTokens(card: Card): Set<string> {
  const tokens = new Set<string>(subtypesFromTypeLine(card.typeLine));
  for (const { token, pattern } of ORACLE_TEXT_PATTERNS) {
    if (pattern.test(card.oracleText)) tokens.add(token);
  }
  return tokens;
}
