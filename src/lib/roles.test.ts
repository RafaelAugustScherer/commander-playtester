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
