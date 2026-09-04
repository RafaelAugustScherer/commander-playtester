import { describe, it, expect } from "vitest";
import { extractThemeProfile, COMMANDER_WEIGHT } from "./themes";
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

describe("extractThemeProfile", () => {
  it("weights a commander's tokens by COMMANDER_WEIGHT", () => {
    const commander = card({
      name: "Commander",
      typeLine: "Legendary Creature — Goblin",
    });
    const profile = extractThemeProfile([commander], []);
    expect(profile.tokenWeights.get("goblin")).toBe(COMMANDER_WEIGHT);
  });

  it("accumulates weight across commander and library copies of the same token", () => {
    const commander = card({ typeLine: "Legendary Creature — Goblin" });
    const others = [
      card({ typeLine: "Creature — Goblin" }),
      card({ typeLine: "Creature — Goblin" }),
    ];
    const profile = extractThemeProfile([commander], others);
    expect(profile.tokenWeights.get("goblin")).toBe(COMMANDER_WEIGHT + 2);
  });

  it("builds a mana-value curve histogram, capping at 7+", () => {
    const others = [
      card({ manaValue: 1 }),
      card({ manaValue: 1 }),
      card({ manaValue: 9 }),
    ];
    const profile = extractThemeProfile([], others);
    expect(profile.curve[1]).toBe(2);
    expect(profile.curve[7]).toBe(1);
    expect(profile.curve.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("counts roles from the resolved cards", () => {
    const others = [
      card({ roles: ["ramp"] }),
      card({ roles: ["ramp"] }),
      card({ roles: ["draw"] }),
    ];
    const profile = extractThemeProfile([], others);
    expect(profile.roleCounts.ramp).toBe(2);
    expect(profile.roleCounts.draw).toBe(1);
    expect(profile.roleCounts.removal).toBe(0);
  });

  it("derives color identity from the commanders' colorIdentity only, not colors", () => {
    const commander = card({ colors: [], colorIdentity: ["R", "G"] });
    const others = [card({ colors: [], colorIdentity: ["U"] })];
    const profile = extractThemeProfile([commander], others);
    expect(profile.colorIdentity).toEqual(["G", "R"]);
  });

  it("does not throw on an empty deck", () => {
    expect(() => extractThemeProfile([], [])).not.toThrow();
    const profile = extractThemeProfile([], []);
    expect(profile.tokenWeights.size).toBe(0);
    expect(profile.curve.every((n) => n === 0)).toBe(true);
    expect(profile.colorIdentity).toEqual([]);
  });
});
