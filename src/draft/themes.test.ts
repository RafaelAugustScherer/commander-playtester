import { describe, it, expect } from "vitest";
import { extractThemeProfile, COMMANDER_WEIGHT, REWARD_WEIGHT } from "./themes";
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
      oracleText: "Sacrifice another creature: Gain 1 life.",
    });
    const profile = extractThemeProfile([commander], []);
    expect(profile.tokenWeights.get("sacrifice")).toBe(COMMANDER_WEIGHT);
  });

  it("leaves a commander's own keywords and creature types out of its theme", () => {
    const commander = card({
      name: "Commander",
      typeLine: "Legendary Creature — Bird Bard",
      oracleText:
        "Flying, first strike\nCommander gets +1/+0 for each other creature you control.\nCreature spells you cast gain offspring {2} as you cast them. (You may pay an additional {2} as you cast a creature spell. If you do, when that creature enters, create a 1/1 token copy of it.)",
    });
    const profile = extractThemeProfile([commander], []);
    expect([...profile.tokenWeights.keys()].sort()).toEqual([
      "create token",
      "creature etb",
    ]);
    expect(profile.creatureTypes.get("bird")).toBe(1);
    expect(profile.creatureCount).toBe(1);
  });

  it("keeps a keyword the commander gives to other creatures", () => {
    const commander = card({ oracleText: "Creatures you control have flying." });
    const profile = extractThemeProfile([commander], []);
    expect(profile.tokenWeights.get("flying")).toBe(COMMANDER_WEIGHT);
  });

  it("keeps a tribe the commander's rules text names", () => {
    const commander = card({ oracleText: "Other Elves you control get +1/+1." });
    const profile = extractThemeProfile([commander], []);
    expect(profile.tokenWeights.get("elf")).toBe(COMMANDER_WEIGHT + REWARD_WEIGHT);
  });

  it("accumulates weight across commander and library copies of the same token", () => {
    const commander = card({
      typeLine: "Legendary Creature — Goblin",
      oracleText: "Sacrifice another creature: Gain 1 life.",
    });
    const others = [
      card({ typeLine: "Creature — Goblin", oracleText: "Sacrifice a Food: Draw a card." }),
      card({ typeLine: "Creature — Goblin", oracleText: "Sacrifice a Clue: Draw a card." }),
    ];
    const profile = extractThemeProfile([commander], others);
    expect(profile.tokenWeights.get("sacrifice")).toBe(COMMANDER_WEIGHT + 2);
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

    it("leaves lasting ramp out and counts it apart", () => {
      const rock = card({ manaValue: 1, roles: ["ramp"], oracleText: "{T}: Add {C}{C}." });
      const profile = extractThemeProfile([], [rock, card({ manaValue: 4 })]);
      expect(profile.manaAppetite).toBe(4);
      expect(profile.rampCount).toBe(1);
      expect(profile.nonlandCount).toBe(2);
    });

    it("is 0 for a deck without nonland cards", () => {
      expect(extractThemeProfile([], []).manaAppetite).toBe(0);
    });
  });
});
