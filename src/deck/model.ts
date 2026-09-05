import type { DecklistEntry } from "../lib/types";

/** A named, reusable deck the user has entered by hand. */
export interface SavedDeck {
  id: string;
  name: string;
  commanders: DecklistEntry[];
  mainboard: DecklistEntry[];
  createdAt: number;
  updatedAt: number;
}

function sumQuantities(entries: DecklistEntry[]): number {
  return entries.reduce((total, entry) => total + entry.quantity, 0);
}

/** Total physical cards in the deck (commanders + the 99). */
export function totalCards(deck: SavedDeck): number {
  return sumQuantities(deck.commanders) + sumQuantities(deck.mainboard);
}

/** All card names in the deck, deduplicated, commanders first. */
export function uniqueCardNames(deck: SavedDeck): string[] {
  const names = [
    ...deck.commanders.map((e) => e.name),
    ...deck.mainboard.map((e) => e.name),
  ];
  return [...new Set(names)];
}

/**
 * Commander legality is exactly 100 cards (1-2 commanders + the rest),
 * matching what the engine enforces at game start. The single source of
 * truth for whether a saved deck is playable (`deck-library/ADR-0002`).
 */
export function isHundredCards(deck: SavedDeck): boolean {
  return totalCards(deck) === 100;
}

/** Serialize a deck back into paste-able decklist text (round-trips the parser). */
export function deckToText(deck: Pick<SavedDeck, "commanders" | "mainboard">): string {
  const line = (e: DecklistEntry) => `${e.quantity} ${e.name}`;
  const parts: string[] = [];
  if (deck.commanders.length > 0) {
    parts.push("Commander", ...deck.commanders.map(line), "");
  }
  parts.push("Deck", ...deck.mainboard.map(line));
  return parts.join("\n");
}
