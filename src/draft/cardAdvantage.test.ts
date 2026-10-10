import { describe, it, expect } from "vitest";
import { cardAdvantageValue } from "./cardAdvantage";
import type { Card } from "../lib/types";

function card(typeLine: string, oracleText: string): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine,
    oracleText,
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["other"],
  };
}

describe("cardAdvantageValue", () => {
  it.each([
    ["Enchantment", "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}."],
    ["Enchantment", "At the beginning of your upkeep, you draw a card and you lose 1 life."],
    ["Artifact — Equipment", "Equipped creature gets +1/-1.\nWhenever equipped creature dies, draw two cards.\nEquip {1}"],
    ["Enchantment", "At the beginning of your draw step, you may draw two additional cards."],
    ["Creature — Elf", "Whenever you cast a creature spell, draw a card."],
    ["Creature — Human", "Whenever a land you control enters, investigate."],
  ])("counts a %s that draws again and again as 1", (typeLine, oracleText) => {
    expect(cardAdvantageValue(card(typeLine, oracleText))).toBe(1);
  });

  it.each([
    ["Sorcery", "Draw three cards."],
    ["Sorcery", "You draw two cards and you lose 2 life."],
    ["Creature — Elemental", "Flying\nWhen this creature enters, draw two cards.\nEvoke {2}{U}"],
    ["Instant", "Target player draws X cards."],
  ])("counts a one-shot %s that draws two or more as ½", (typeLine, oracleText) => {
    expect(cardAdvantageValue(card(typeLine, oracleText))).toBe(0.5);
  });

  it.each([
    ["Sorcery", "Look at the top three cards of your library. Put one into your hand.\nDraw a card."],
    ["Creature — Human", "When this creature enters, draw a card."],
    ["Sorcery", "Draw two cards, then discard two cards.\nFlashback {2}{R}"],
    ["Creature — Human", "{T}, Discard a card: Draw a card."],
    ["Artifact", "At the beginning of each player's draw step, that player draws an additional card."],
    ["Land", "{T}: Add {C}.\n{2}, {T}: Draw a card."],
    ["Artifact — Clue", "{2}, Sacrifice this artifact: Draw a card."],
  ])("counts a %s cantrip, loot or shared draw as nothing", (typeLine, oracleText) => {
    expect(cardAdvantageValue(card(typeLine, oracleText))).toBe(0);
  });

  it("counts an ability that sacrifices the card by name as a one-shot", () => {
    const rock = card("Artifact", "{T}: Add {C}.\n{1}, {T}, Sacrifice Test Card: Draw a card.");
    expect(cardAdvantageValue(rock)).toBe(0);
  });
});
