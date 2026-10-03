import { describe, it, expect } from "vitest";
import { activationMana, isLastingRamp } from "./ramp";
import type { Card } from "../lib/types";

function ramp(typeLine: string, oracleText: string): Card {
  return {
    name: "Ramp",
    manaValue: 2,
    typeLine,
    oracleText,
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["ramp"],
  };
}

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

describe("isLastingRamp", () => {
  it.each([
    ["Artifact", "{T}: Add {C}{C}."],
    ["Artifact", "{1}, {T}: Add {W}{U}."],
    ["Artifact", "{T}, Sacrifice this artifact: Add one mana of any color."],
    ["Creature — Elf Druid", "{T}: Add an amount of {G} equal to this creature's power."],
    ["Creature — Dryad", "You may play an additional land on each of your turns."],
    ["Sorcery", "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle."],
  ])("counts a %s worded %j", (typeLine, oracleText) => {
    expect(isLastingRamp(ramp(typeLine, oracleText))).toBe(true);
  });

  it.each([
    ["Artifact", "{1}, {T}: Add one mana of any color."],
    ["Artifact", "Whenever you draw your second card each turn, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this artifact: Add one mana of any color.\")"],
    ["Instant", "Add {R}{R}{R}."],
    ["Sorcery", "Draw a card. You may play an additional land this turn."],
  ])("does not count a %s worded %j", (typeLine, oracleText) => {
    expect(isLastingRamp(ramp(typeLine, oracleText))).toBe(false);
  });

  it("does not count a card without the ramp role", () => {
    expect(isLastingRamp({ ...ramp("Artifact", "{T}: Add {C}."), roles: ["other"] })).toBe(false);
  });
});
