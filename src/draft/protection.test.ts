import { describe, it, expect } from "vitest";
import {
  PROTECTION_EXTRA,
  PROTECTION_FLOOR,
  SHIELDED_NEED,
  commanderProtectionNeed,
  isProtection,
  protectionTarget,
  wantsToConnect,
} from "./protection";
import type { Card } from "../lib/types";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Instant",
    oracleText: "",
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

function commander(manaValue: number, oracleText = "", name = "Test Commander"): Card {
  return card({ name, manaValue, typeLine: "Legendary Creature — Human", oracleText });
}

describe("isProtection", () => {
  it.each([
    ["Equipped creature has shroud and haste.\nEquip {0}", "Artifact — Equipment"],
    ["Equipped creature has hexproof and haste.\nEquip {1}", "Artifact — Equipment"],
    ["Creatures you control gain hexproof and indestructible until end of turn.", "Instant"],
    ["Target creature you control gains hexproof and indestructible until end of turn.", "Instant"],
    ["Target creature gains protection from the color of your choice until end of turn.", "Instant"],
    [
      "Until your next turn, your life total can't change and you gain protection from everything. All permanents you control phase out.",
      "Instant",
    ],
    ["Choose one —\n• Permanents you control gain indestructible until end of turn.", "Instant"],
    ["You may choose new targets for target spell or ability.", "Instant"],
    ["Enchant creature\nEnchanted creature gets +2/+2.\nUmbra armor", "Enchantment — Aura"],
  ])("reads %j as protection", (oracleText, typeLine) => {
    expect(isProtection(card({ oracleText, typeLine }))).toBe(true);
  });

  it("does not read a creature's own keyword as protection", () => {
    expect(
      isProtection(card({ typeLine: "Creature — Troll", oracleText: "Hexproof\n{1}{G}: Regenerate this creature." })),
    ).toBe(false);
  });

  it("does not read removal that phases out an opponent's permanent as protection", () => {
    expect(
      isProtection(card({ oracleText: "Target creature an opponent controls phases out." })),
    ).toBe(false);
  });

  it("leaves lands out", () => {
    expect(
      isProtection(card({ typeLine: "Land", oracleText: "Creatures you control gain hexproof until end of turn." })),
    ).toBe(false);
  });
});

describe("commanderProtectionNeed", () => {
  it("grows with mana value, from none at 3 to full at 6", () => {
    expect(commanderProtectionNeed(commander(3))).toBe(0);
    expect(commanderProtectionNeed(commander(5))).toBeCloseTo(2 / 3);
    expect(commanderProtectionNeed(commander(7))).toBe(1);
  });

  it.each([
    ["Hexproof"],
    ["Ward {2}"],
    ["Indestructible"],
    ["Protection from black"],
    ["Commander ninjutsu {U}{B}"],
    ["Dash {2}{R}"],
    ["Eminence — Whenever you cast a Vampire spell, create a 1/1 Vampire token."],
    ["{5}{G}{W}: Put Test Commander onto the battlefield from the command zone."],
  ])("needs a quarter as much for a commander with %j", (oracleText) => {
    expect(commanderProtectionNeed(commander(7, oracleText))).toBe(SHIELDED_NEED);
  });

  it("needs full protection for a commander that wants to connect, whatever its cost", () => {
    expect(commanderProtectionNeed(commander(2, "Whenever Sir Voltron attacks, draw a card.", "Sir Voltron"))).toBe(1);
  });
});

describe("wantsToConnect", () => {
  it.each([
    ["Whenever Kaalia attacks an opponent, you may put a creature card onto the battlefield.", "Kaalia, Test"],
    ["Whenever Ragavan deals combat damage to a player, create a Treasure token.", "Ragavan, Test"],
    ["Whenever a creature you control attacks alone, it gains double strike until end of turn.", "Rafiq, Test"],
    ["Whenever you cast an Aura or Equipment spell, draw a card.", "Sram, Test"],
    ["Test gets +2/+2 for each Aura attached to it.", "Test"],
    ["Whenever Edgar attacks, put a +1/+1 counter on each Vampire you control.", "Edgar Markov"],
  ])("reads %j as a commander that wants to connect", (oracleText, name) => {
    expect(wantsToConnect(commander(3, oracleText, name))).toBe(true);
  });

  it("does not read a go-wide combat trigger as wanting to connect", () => {
    expect(
      wantsToConnect(
        commander(4, "Whenever one or more creatures you control deal combat damage to a player, draw a card."),
      ),
    ).toBe(false);
  });
});

describe("protectionTarget", () => {
  it("is the floor for a cheap commander, and floor plus extra at full need", () => {
    expect(protectionTarget([commander(2)])).toBe(PROTECTION_FLOOR);
    expect(protectionTarget([commander(7)])).toBe(PROTECTION_FLOOR + PROTECTION_EXTRA);
  });

  it("follows the needier of two commanders", () => {
    expect(protectionTarget([commander(2), commander(7)])).toBe(PROTECTION_FLOOR + PROTECTION_EXTRA);
  });

  it("is zero before there is a commander", () => {
    expect(protectionTarget([])).toBe(0);
  });
});
