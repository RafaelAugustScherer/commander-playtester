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
