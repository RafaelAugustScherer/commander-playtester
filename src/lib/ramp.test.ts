import { describe, it, expect } from "vitest";
import { activationMana, isLastingRamp, manaSpent, rampKind } from "./ramp";

const card = (typeLine: string, oracleText: string) => ({ typeLine, oracleText });

describe("activationMana", () => {
  it.each([
    ["{2}{G}, {T}: Add {G}{G}.", 3],
    ["{X}{R}: Deal X damage to any target.", 4],
    ["{G/W}{G/W}: Untap it.", 2],
    ["Channel — {1}{G}, Discard this card: Add {G}{G}{G}.", 2],
    ["Equip {8}", 8],
    ["Outlast {1}{W}", 2],
    ["Ward {2}", 0],
    ["{T}: Add {G}.", 0],
    ["+1: Draw a card.", 0],
    ["Flying", 0],
    ["When this enters, choose one: draw a card; or gain 3 life.", 0],
  ])("reads %j as %d", (line, mana) => {
    expect(activationMana(line)).toBe(mana);
  });
});

describe("manaSpent", () => {
  it("is the higher of mana value and the priciest ability, keyword costs included", () => {
    expect(manaSpent({ manaValue: 4, oracleText: "Equip {8}" })).toBe(8);
    expect(manaSpent({ manaValue: 4, oracleText: "{1}: Untap this." })).toBe(4);
  });
});

describe("isLastingRamp", () => {
  it.each([
    ["Artifact", "{T}: Add {C}{C}."],
    ["Artifact", "{1}, {T}: Add {W}{U}."],
    ["Artifact", "{T}, Sacrifice this artifact: Add one mana of any color."],
    ["Creature — Elf Druid", "{T}: Add an amount of {G} equal to this creature's power."],
    ["Legendary Creature — Human Druid", "You may play two additional lands on each of your turns."],
    ["Enchantment — Aura", "Whenever enchanted land is tapped for mana, its controller adds an additional {G}."],
    ["Enchantment — Aura", "Whenever enchanted land is tapped for mana, its controller adds an additional one mana of any color."],
    ["Sorcery", "Search your library for a Forest card, put that card onto the battlefield, then shuffle."],
  ])("counts a %s worded %j", (typeLine, oracleText) => {
    expect(isLastingRamp(card(typeLine, oracleText))).toBe(true);
  });

  it.each([
    ["Artifact", "{1}, {T}: Add one mana of any color."],
    ["Artifact", "{1}, {T}: Add {R} or {G}."],
    ["Artifact", "Whenever you draw your second card each turn, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this artifact: Add one mana of any color.\")"],
    ["Instant", "Add {R}{R}{R}."],
    ["Sorcery", "Draw a card. You may play an additional land this turn."],
    ["Creature — Snake", "Channel — {1}{G}, Discard this card: Add {G}{G}{G}."],
    ["Artifact", "Search your library for an artifact card, put it into your hand. (Then put a land onto the battlefield.)"],
  ])("does not count a %s worded %j", (typeLine, oracleText) => {
    expect(isLastingRamp(card(typeLine, oracleText))).toBe(false);
  });
});

describe("rampKind", () => {
  it("tells Treasure makers and one-shot extra land drops from lasting ramp", () => {
    expect(rampKind(card("Instant", "Draw a card, then create a Treasure token."))).toBe("treasure");
    expect(rampKind(card("Sorcery", "You may play an additional land this turn."))).toBe("extra land");
    expect(rampKind(card("Land", "{T}: Add {G}."))).toBeNull();
  });
});
