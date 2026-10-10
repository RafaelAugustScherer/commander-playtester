import { describe, it, expect } from "vitest";
import { classifyRoles } from "./roles";

describe("classifyRoles", () => {
  it("flags a basic land as land only", () => {
    const roles = classifyRoles({
      typeLine: "Basic Land — Forest",
      oracleText: "({T}: Add {G}.)",
      manaValue: 0,
      producedMana: ["G"],
    });
    expect(roles).toEqual(["land"]);
  });

  it("flags a mana rock as ramp", () => {
    const roles = classifyRoles({
      typeLine: "Artifact",
      oracleText: "{T}: Add {C}{C}.",
      manaValue: 1,
      producedMana: ["C"],
    });
    expect(roles).toContain("ramp");
  });

  it.each([
    ["{T}: Add one mana of any color in your commander's color identity.", "Artifact", 2],
    ["{T}: Add an amount of {G} equal to this creature's power.", "Creature — Elf Druid", 3],
    ["{T}, Tap an untapped creature you control: Add one mana of any color.", "Creature — Elf", 1],
    ["You may play two additional lands on each of your turns.", "Legendary Creature — Human Druid", 3],
    ["Whenever enchanted land is tapped for mana, its controller adds an additional {G}.", "Enchantment — Aura", 1],
  ])("flags a mana producer worded %j as ramp", (oracleText, typeLine, manaValue) => {
    expect(classifyRoles({ typeLine, oracleText, manaValue, producedMana: [] })).toContain("ramp");
  });

  it("does not flag a mana filter as ramp", () => {
    const roles = classifyRoles({
      typeLine: "Artifact",
      oracleText: "When this enters, draw a card.\n{1}, {T}: Add one mana of any color.",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).not.toContain("ramp");
  });

  it("flags a search for a basic land type as ramp", () => {
    const roles = classifyRoles({
      typeLine: "Sorcery",
      oracleText:
        "Search your library for a Forest card, put that card onto the battlefield, then shuffle.",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).toContain("ramp");
  });

  it("flags a land-fetch spell as ramp", () => {
    const roles = classifyRoles({
      typeLine: "Sorcery",
      oracleText:
        "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).toContain("ramp");
  });

  it("flags a card-draw spell", () => {
    const roles = classifyRoles({
      typeLine: "Sorcery",
      oracleText: "Draw two cards. You lose 2 life.",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).toContain("draw");
  });

  it("flags targeted removal", () => {
    const roles = classifyRoles({
      typeLine: "Instant",
      oracleText: "Destroy target creature. It can't be regenerated.",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).toContain("removal");
  });

  it.each([
    ["Instant", "Exile up to one target creature or planeswalker."],
    ["Instant", "Return target nonland permanent you don't control to its owner's hand."],
    ["Instant", "The owner of target permanent shuffles it into their library, then reveals the top card of their library."],
    ["Sorcery", "Target creature you control fights target creature you don't control."],
    ["Instant", "Fireball deals X damage to any target."],
    ["Instant", "Target creature gets -3/-3 until end of turn."],
    ["Sorcery", "Destroy all creatures. They can't be regenerated."],
    ["Sorcery", "Return all nonland permanents to their owners' hands."],
  ])("flags a %s worded %j as removal", (typeLine, oracleText) => {
    expect(classifyRoles({ typeLine, oracleText, manaValue: 3, producedMana: [] })).toContain(
      "removal",
    );
  });

  it.each([
    ["Instant", "Put target creature you control on top of its owner's library."],
    ["Sorcery", "Exile all cards from your graveyard. You gain 1 life for each card exiled this way."],
    ["Sorcery", "Reveal the top five cards of your library. Put one into your hand and exile all other cards revealed this way."],
  ])("does not flag a %s worded %j as removal", (typeLine, oracleText) => {
    expect(classifyRoles({ typeLine, oracleText, manaValue: 2, producedMana: [] })).not.toContain(
      "removal",
    );
  });

  it("does not flag returning your own creature to hand as removal", () => {
    const roles = classifyRoles({
      typeLine: "Instant",
      oracleText: "Return target creature you control to its owner's hand.",
      manaValue: 1,
      producedMana: [],
    });
    expect(roles).not.toContain("removal");
  });

  it("does not read draw from a token's reminder text", () => {
    const roles = classifyRoles({
      typeLine: "Creature — Human",
      oracleText: "When this creature enters, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")",
      manaValue: 2,
      producedMana: [],
    });
    expect(roles).not.toContain("draw");
  });

  it("defaults to other when nothing matches", () => {
    const roles = classifyRoles({
      typeLine: "Creature — Human Soldier",
      oracleText: "Vigilance.",
      manaValue: 3,
      producedMana: [],
    });
    expect(roles).toEqual(["other"]);
  });
});
