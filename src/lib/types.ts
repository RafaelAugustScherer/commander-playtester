// Core domain types for the Commander playtester.

/** A card role inferred heuristically from oracle text / type line. */
export type CardRole = "land" | "ramp" | "draw" | "removal" | "other";

/** Minimal card data we need for parsing + goldfishing. */
export interface Card {
  name: string;
  /** Converted mana cost / mana value. */
  manaValue: number;
  typeLine: string;
  oracleText: string;
  /** Printed power, only when it is a fixed number. */
  power?: number;
  colors: string[];
  /** True MTG color identity (mana cost + rules text), from Scryfall's `color_identity`. */
  colorIdentity: string[];
  /** Colors of mana this permanent can produce (from Scryfall produced_mana). */
  producedMana: string[];
  /** Scryfall image URL (normal), when available. */
  imageUrl?: string;
  roles: CardRole[];
}

/** One entry in a parsed decklist: a card name plus a quantity. */
export interface DecklistEntry {
  quantity: number;
  name: string;
}

/** Result of parsing raw decklist text. */
export interface ParsedDecklist {
  /** The commander(s), if the list marked them (e.g. Moxfield's Commander section). */
  commanders: DecklistEntry[];
  /** Everything else (the 99). */
  mainboard: DecklistEntry[];
  /** Lines we could not parse, surfaced to the user. */
  warnings: string[];
}

/** A fully resolved deck: entries joined with Scryfall card data. */
export interface ResolvedDeck {
  commanders: Card[];
  /** Library cards, expanded by quantity (one Card ref per physical copy). */
  library: Card[];
  /** Names Scryfall could not find. */
  unresolved: string[];
}

export function isLand(card: Card): boolean {
  return /\bLand\b/.test(card.typeLine);
}

export function isCreature(card: Card): boolean {
  return /\bCreature\b/.test(card.typeLine);
}

/** Identifies a card's name, type line and rules text, for keeping what is computed from them. */
export function cardKey(card: { name?: string; typeLine: string; oracleText: string }): string {
  return `${card.name ?? ""}\u0000${card.typeLine}\u0000${card.oracleText}`;
}

/** `read`, remembered per card (`cardKey`): for readings of card text rerun every round. */
export function memoizeByCard<C extends { name?: string; typeLine: string; oracleText: string }, T>(
  read: (card: C) => T,
): (card: C) => T {
  const cache = new Map<string, T>();
  return (card) => {
    const key = cardKey(card);
    if (!cache.has(key)) cache.set(key, read(card));
    return cache.get(key) as T;
  };
}
