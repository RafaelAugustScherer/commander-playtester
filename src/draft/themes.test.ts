import { describe, it, expect } from "vitest";
import { activationMana, extractThemeProfile, COMMANDER_WEIGHT, REWARD_WEIGHT } from "./themes";
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

  it("weights what a commander rewards above its other tokens", () => {
    const commander = card({
      typeLine: "Legendary Creature — Human Warlock",
      oracleText:
        "Whenever you tap an untapped creature an opponent controls, you may pay {1}. When you do, draw a card.",
    });
    const profile = extractThemeProfile([commander], []);
    expect(profile.tokenWeights.get("tap creature")).toBe(
      COMMANDER_WEIGHT + REWARD_WEIGHT,
    );
    expect(profile.tokenWeights.get("draw a card")).toBe(COMMANDER_WEIGHT);
  });

  it("gives a non-commander's trigger condition no extra weight", () => {
    const other = card({ oracleText: "Whenever you tap an untapped creature an opponent controls, scry 1." });
    const profile = extractThemeProfile([], [other]);
    expect(profile.tokenWeights.get("tap creature")).toBe(1);
  });

  it("leaves tokens a card only enables out of the theme", () => {
    const commander = card({ typeLine: "Legendary Creature — Human Knight" });
    const others = [card({ oracleText: "When this creature enters, draw a card." })];
    const profile = extractThemeProfile([commander], others);
    expect(profile.tokenWeights.has("legendary")).toBe(false);
    expect(profile.tokenWeights.has("etb")).toBe(false);
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

  describe("mana appetite", () => {
    it("averages nonland mana values with the commander counted COMMANDER_WEIGHT times", () => {
      const commander = card({ manaValue: 6 });
      const others = [card({ manaValue: 2 }), card({ manaValue: 0, typeLine: "Land" })];
      const profile = extractThemeProfile([commander], others);
      expect(profile.manaAppetite).toBe((6 * COMMANDER_WEIGHT + 2) / (COMMANDER_WEIGHT + 1));
    });

    it("counts a card's priciest activated ability when it costs more than the card", () => {
      const sink = card({ manaValue: 2, oracleText: "{5}{G}{G}: Creatures you control get +2/+2." });
      expect(extractThemeProfile([], [sink]).manaAppetite).toBe(7);
    });

    it("is 0 for a deck without nonland cards", () => {
      expect(extractThemeProfile([], []).manaAppetite).toBe(0);
    });
  });
});

describe("activationMana", () => {
  it.each([
    ["{2}{G}, {T}: Add {G}{G}.", 3],
    ["{X}{R}: Deal X damage to any target.", 4],
    ["{G/W}{G/W}: Untap it.", 2],
    ["{T}: Add {G}.", 0],
    ["+1: Draw a card.", 0],
    ["Flying", 0],
    ["When this enters, choose one: draw a card; or gain 3 life.", 0],
  ])("reads %j as %d", (line, mana) => {
    expect(activationMana(line)).toBe(mana);
  });
});
