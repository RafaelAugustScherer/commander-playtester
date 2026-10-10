import { describe, it, expect } from "vitest";
import {
  extractThemeProfile,
  COMMANDER_WEIGHT,
  DECK_TOKEN_CAP,
  REWARD_WEIGHT,
  deckTokenWeight,
} from "./themes";
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
    expect(profile.tokenWeights.get("sacrifice")).toBe(COMMANDER_WEIGHT + deckTokenWeight(2));
  });

  it("levels off what the 99 add to a token, however many carry it", () => {
    const sacrificer = (n: number) =>
      card({ name: `Sacrificer ${n}`, oracleText: "Sacrifice a creature: Scry 1." });
    const weightWith = (count: number) =>
      extractThemeProfile([], Array.from({ length: count }, (_, n) => sacrificer(n)))
        .tokenWeights.get("sacrifice") ?? 0;
    expect(weightWith(1)).toBeCloseTo(deckTokenWeight(1));
    expect(weightWith(3)).toBeGreaterThan(weightWith(1));
    expect(weightWith(40)).toBeLessThanOrEqual(DECK_TOKEN_CAP);
    expect(weightWith(40) - weightWith(20)).toBeLessThan(0.01);
  });

  it("keeps what a commander rewards above any token the 99 build up", () => {
    const commander = card({
      typeLine: "Legendary Creature — Human Warlock",
      oracleText: "Whenever you tap an untapped creature an opponent controls, draw a card.",
    });
    const flyers = Array.from({ length: 40 }, (_, n) =>
      card({ name: `Flyer ${n}`, oracleText: "Flying" }),
    );
    const profile = extractThemeProfile([commander], flyers);
    expect(profile.tokenWeights.get("tap creature")).toBeGreaterThan(
      profile.tokenWeights.get("flying") ?? 0,
    );
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
    expect(profile.tokenWeights.get("tap creature")).toBe(deckTokenWeight(1));
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

  it("counts removal from the resolved cards, commanders included", () => {
    const commander = card({ roles: ["removal"] });
    const others = [card({ roles: ["removal"] }), card({ roles: ["draw"] })];
    expect(extractThemeProfile([commander], others).removalCount).toBe(2);
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
      expect(profile.buckets.ramp.count).toBe(1);
      expect(profile.nonlandCount).toBe(2);
    });

    it("is 0 for a deck without nonland cards", () => {
      expect(extractThemeProfile([], []).manaAppetite).toBe(0);
    });
  });
});
