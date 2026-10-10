import { describe, it, expect } from "vitest";
import { isNoncreatureSpell, primaryType } from "./cardTypes";

describe("primaryType", () => {
  it.each([
    ["Land Creature — Forest Dryad", "land"],
    ["Artifact Creature — Golem", "creature"],
    ["Enchantment Creature — Nymph", "creature"],
    ["Kindred Instant — Elf", "instant"],
    ["Legendary Planeswalker — Teferi", "planeswalker"],
    ["Instant // Land", "instant"],
    ["Land // Instant", "land"],
    ["Basic Land — Island", "land"],
    ["Artifact — Equipment", "artifact"],
    ["Legendary Enchantment — Saga", "enchantment"],
    ["Sorcery", "sorcery"],
  ] as const)("maps %s to %s", (typeLine, expected) => {
    expect(primaryType(typeLine)).toBe(expected);
  });

  it("returns null for a type outside the draft types", () => {
    expect(primaryType("Battle — Siege")).toBeNull();
  });

  it("ignores type words that only appear in the subtypes", () => {
    expect(primaryType("Creature — Land Mine")).toBe("creature");
  });
});

describe("isNoncreatureSpell", () => {
  it.each([
    ["Instant", true],
    ["Legendary Planeswalker — Teferi", true],
    ["Artifact — Equipment", true],
    ["Kindred Enchantment — Elf", true],
    ["Artifact Creature — Golem", false],
    ["Land", false],
    ["Artifact Land", false],
    ["Sorcery // Land", true],
  ] as const)("reads %s as %s", (typeLine, expected) => {
    expect(isNoncreatureSpell(typeLine)).toBe(expected);
  });
});
