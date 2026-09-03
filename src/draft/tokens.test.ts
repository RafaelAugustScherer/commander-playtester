import { describe, it, expect } from "vitest";
import { cardTokens } from "./tokens";
import type { Card } from "../lib/types";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Creature — Bear",
    oracleText: "",
    colors: [],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

describe("cardTokens", () => {
  it("parses a single subtype", () => {
    const tokens = cardTokens(card({ typeLine: "Creature — Goblin" }));
    expect(tokens).toContain("goblin");
  });

  it("parses multiple subtypes", () => {
    const tokens = cardTokens(card({ typeLine: "Creature — Elf Warrior" }));
    expect(tokens).toContain("elf");
    expect(tokens).toContain("warrior");
  });

  it("has no subtype tokens when the type line carries none", () => {
    const tokens = cardTokens(card({ typeLine: "Sorcery" }));
    expect(tokens.size).toBe(0);
  });

  it("parses subtypes from both faces of a DFC-ish type line", () => {
    const tokens = cardTokens(
      card({ typeLine: "Creature — Human Werewolf // Creature — Werewolf" }),
    );
    expect(tokens).toContain("human");
    expect(tokens).toContain("werewolf");
  });

  it("lowercases subtypes", () => {
    const tokens = cardTokens(card({ typeLine: "Artifact — Vehicle" }));
    expect(tokens).toContain("vehicle");
  });

  it("matches an oracle-text pattern", () => {
    const tokens = cardTokens(
      card({ oracleText: "Put a +1/+1 counter on target creature." }),
    );
    expect(tokens).toContain("+1/+1 counter");
  });

  it("matches multiple independent oracle-text patterns", () => {
    const tokens = cardTokens(
      card({
        oracleText:
          "Sacrifice a creature. If you do, create a 1/1 white Spirit creature token and draw a card.",
      }),
    );
    expect(tokens).toContain("sacrifice");
    expect(tokens).toContain("create token");
    expect(tokens).toContain("draw a card");
  });

  it("is case-insensitive on oracle text", () => {
    const tokens = cardTokens(card({ oracleText: "GAIN 3 LIFE." }));
    expect(tokens).toContain("gain life");
  });

  it("does not match an unrelated oracle-text pattern", () => {
    const tokens = cardTokens(card({ oracleText: "Vigilance." }));
    expect(tokens).not.toContain("landfall");
    expect(tokens).not.toContain("mill");
  });

  it("does not throw on empty oracle text and type line", () => {
    const blank = card({ typeLine: "", oracleText: "" });
    expect(() => cardTokens(blank)).not.toThrow();
    expect(cardTokens(blank).size).toBe(0);
  });

  it("combines subtype and oracle-text tokens", () => {
    const tokens = cardTokens(
      card({
        typeLine: "Creature — Zombie",
        oracleText: "When this creature dies, mill two cards.",
      }),
    );
    expect(tokens).toContain("zombie");
    expect(tokens).toContain("mill");
  });
});
