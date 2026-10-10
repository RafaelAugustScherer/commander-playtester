export const DRAFT_CARD_TYPES = [
  "land",
  "creature",
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
  "planeswalker",
] as const;

export type DraftCardType = (typeof DRAFT_CARD_TYPES)[number];

const PRIMARY_TYPE_ORDER: Array<[DraftCardType, RegExp]> = [
  ["land", /\bLand\b/],
  ["creature", /\bCreature\b/],
  ["planeswalker", /\bPlaneswalker\b/],
  ["instant", /\bInstant\b/],
  ["sorcery", /\bSorcery\b/],
  ["artifact", /\bArtifact\b/],
  ["enchantment", /\bEnchantment\b/],
];

/** The one type a card counts as: its front face's, Land first, then Creature, then the rest. */
export function primaryType(typeLine: string): DraftCardType | null {
  const types = typeLine.split("//")[0].split("—")[0];
  for (const [type, pattern] of PRIMARY_TYPE_ORDER) {
    if (pattern.test(types)) return type;
  }
  return null;
}

/** Whether a card is a noncreature spell by the rules, as prowess counts one: planeswalkers too. */
export function isNoncreatureSpell(typeLine: string): boolean {
  const type = primaryType(typeLine);
  return type !== null && type !== "land" && type !== "creature";
}
