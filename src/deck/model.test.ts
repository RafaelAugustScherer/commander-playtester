import { describe, it, expect } from "vitest";
import { totalCards, isHundredCards, deckToText } from "./model";
import type { SavedDeck } from "./model";
import { parseDecklist } from "../lib/decklist";
import { SAMPLE_DECK } from "../lib/sampleDeck";

const deck: SavedDeck = {
  id: "x",
  name: "Test",
  commanders: [{ quantity: 1, name: "Atraxa, Praetors' Voice" }],
  mainboard: [
    { quantity: 1, name: "Sol Ring" },
    { quantity: 2, name: "Forest" },
  ],
  createdAt: 0,
  updatedAt: 0,
};

describe("deck model", () => {
  it("totals commanders plus mainboard by quantity", () => {
    expect(totalCards(deck)).toBe(4);
  });

  it("deckToText round-trips through the parser", () => {
    const parsed = parseDecklist(deckToText(deck));
    expect(parsed.commanders).toEqual(deck.commanders);
    expect(parsed.mainboard).toEqual(deck.mainboard);
  });

  it("the sample deck is a legal 100-card Commander deck", () => {
    const parsed = parseDecklist(SAMPLE_DECK);
    const total = [...parsed.commanders, ...parsed.mainboard].reduce(
      (n, e) => n + e.quantity,
      0,
    );
    expect(total).toBe(100);
    expect(parsed.warnings).toEqual([]);
  });

  it("a deck short of 100 cards is not playable", () => {
    expect(isHundredCards(deck)).toBe(false);
  });

  it("a deck with exactly 100 cards is playable", () => {
    const full: SavedDeck = {
      ...deck,
      mainboard: [{ quantity: 99, name: "Forest" }],
    };
    expect(isHundredCards(full)).toBe(true);
  });
});
