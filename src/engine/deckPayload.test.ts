import { describe, it, expect } from "vitest";
import { buildDeckList, toPlayerDeck } from "./deckPayload";
import type { SavedDeck } from "../deck/model";

function deck(
  name: string,
  commander: string,
  cards: Array<[number, string]>,
): SavedDeck {
  return {
    id: name,
    name,
    commanders: [{ quantity: 1, name: commander }],
    mainboard: cards.map(([quantity, n]) => ({ quantity, name: n })),
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("toPlayerDeck", () => {
  it("expands quantities into a flat name list", () => {
    const p = toPlayerDeck(
      deck("A", "Cmd A", [
        [2, "Island"],
        [1, "Sol Ring"],
      ]),
    );
    expect(p.commander).toEqual(["Cmd A"]);
    expect(p.main_deck).toEqual(["Island", "Island", "Sol Ring"]);
  });

  it("collapses a stored two-sided name to its front face for the engine", () => {
    const p = toPlayerDeck(deck("A", "Cmd A", [[1, "Commit // Memory"]]));
    expect(p.main_deck).toEqual(["Commit"]);
  });
});

describe("buildDeckList", () => {
  it("maps seats to player / opponent / ai_decks in order", () => {
    const dl = buildDeckList(
      [
        deck("A", "CA", []),
        deck("B", "CB", []),
        deck("C", "CC", []),
        deck("D", "CD", []),
      ],
      "Medium",
    );
    expect(dl.player.commander).toEqual(["CA"]);
    expect(dl.opponent.commander).toEqual(["CB"]);
    expect(dl.ai_decks.map((d) => d.commander[0])).toEqual(["CC", "CD"]);
    expect(dl.ai_difficulties).toEqual([
      "Medium",
      "Medium",
      "Medium",
      "Medium",
    ]);
  });

  it("fills an empty opponent when only one deck is given", () => {
    const dl = buildDeckList([deck("A", "CA", [])], "Easy");
    expect(dl.opponent.main_deck).toEqual([]);
    expect(dl.ai_decks).toEqual([]);
  });
});
