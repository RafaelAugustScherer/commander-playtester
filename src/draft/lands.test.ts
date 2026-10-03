import { describe, it, expect } from "vitest";
import { isUtilityLand } from "./lands";
import type { Card } from "../lib/types";

function land(name: string, oracleText: string): Card {
  return {
    name,
    manaValue: 0,
    typeLine: "Land",
    oracleText,
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["land"],
  };
}

describe("isUtilityLand", () => {
  it.each([
    ["Command Tower", "{T}: Add one mana of any color in your commander's color identity."],
    [
      "Evolving Wilds",
      "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
    ],
    [
      "Path of Ancestry",
      "This land enters tapped.\n{T}: Add one mana of any color in your commander's color identity. When that mana is spent to cast a creature spell that shares a creature type with your commander, scry 1.",
    ],
    [
      "Thriving Bluff",
      "This land enters tapped. As it enters, choose a color other than red.\n{T}: Add {R} or one mana of the chosen color.",
    ],
    [
      "City of Brass",
      "Whenever City of Brass becomes tapped, it deals 1 damage to you.\n{T}: Add one mana of any color.",
    ],
    ["Ash Barrens", "{T}: Add {C}.\nBasic landcycling {1} ({1}, Discard this card: Search your library for a basic land card, reveal it, put it into your hand, then shuffle.)"],
  ])("counts %s as a colour fixer", (name, text) => {
    expect(isUtilityLand(land(name, text))).toBe(false);
  });

  it.each([
    ["Rogue's Passage", "{T}: Add {C}.\n{4}, {T}: Target creature can't be blocked this turn."],
    [
      "Bojuka Bog",
      "This land enters tapped.\nWhen this land enters, exile target player's graveyard.\n{T}: Add {B}.",
    ],
    ["Ancient Tomb", "{T}: Add {C}{C}. This land deals 2 damage to you."],
    [
      "Myriad Landscape",
      "This land enters tapped.\n{T}: Add {C}.\n{2}, {T}, Sacrifice this land: Search your library for up to two basic land cards that share a land type, put them onto the battlefield tapped, then shuffle.",
    ],
    [
      "Cavern of Souls",
      "As this land enters, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered.",
    ],
  ])("counts %s as a utility land", (name, text) => {
    expect(isUtilityLand(land(name, text))).toBe(true);
  });
});
