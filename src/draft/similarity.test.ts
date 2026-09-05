import { describe, it, expect } from "vitest";
import { cardSimilarity } from "./similarity";
import type { Card } from "../lib/types";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Creature — Bear",
    oracleText: "",
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

describe("cardSimilarity", () => {
  it("is 1 for identical cards", () => {
    const a = card({ typeLine: "Creature — Goblin", oracleText: "Sacrifice a creature." });
    const b = card({ typeLine: "Creature — Goblin", oracleText: "Sacrifice a creature." });
    expect(cardSimilarity(a, b)).toBe(1);
  });

  it("is 0 for cards sharing no tokens", () => {
    const a = card({ typeLine: "Creature — Goblin", oracleText: "" });
    const b = card({ typeLine: "Creature — Elf", oracleText: "" });
    expect(cardSimilarity(a, b)).toBe(0);
  });

  it("is symmetric", () => {
    const a = card({ typeLine: "Creature — Goblin Warrior", oracleText: "Sacrifice a creature." });
    const b = card({ typeLine: "Creature — Goblin", oracleText: "Draw a card." });
    expect(cardSimilarity(a, b)).toBe(cardSimilarity(b, a));
  });

  it("stays within [0, 1]", () => {
    const a = card({ typeLine: "Creature — Goblin Warrior", oracleText: "Sacrifice a creature. Draw a card." });
    const b = card({ typeLine: "Creature — Goblin", oracleText: "Sacrifice a creature." });
    const similarity = cardSimilarity(a, b);
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it("scores partial overlap between 0 and 1", () => {
    const a = card({ typeLine: "Creature — Goblin Warrior" });
    const b = card({ typeLine: "Creature — Goblin" });
    const similarity = cardSimilarity(a, b);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it("is 0 for two cards with no tokens at all", () => {
    const a = card({ typeLine: "Sorcery", oracleText: "" });
    const b = card({ typeLine: "Instant", oracleText: "" });
    expect(cardSimilarity(a, b)).toBe(0);
  });
});
