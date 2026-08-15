import { describe, it, expect } from "vitest";
import { totalCards, deckToText } from "./model";
import type { SavedDeck } from "./model";
import { parseDecklist } from "../lib/decklist";

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
});
