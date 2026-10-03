import { describe, it, expect } from "vitest";
import {
  cardTokens,
  creatureTypesOf,
  isOfTribe,
  servesTribe,
  mentionsSubtype,
  themeTokens,
  tokenSearches,
  rewardedTokens,
} from "./tokens";
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

describe("cardTokens", () => {
  it("parses a single subtype", () => {
    const tokens = cardTokens(card({ typeLine: "Creature — Goblin" }));
    expect(tokens).toContain("goblin");
  });

  it("parses multiple subtypes", () => {
    const tokens = cardTokens(card({ typeLine: "Creature — Elf Warrior" }));
    expect(tokens).toContain("elf");
    expect(tokens).toContain("warrior");
  });

  it("has no subtype tokens when the type line carries none", () => {
    const tokens = cardTokens(card({ typeLine: "Sorcery" }));
    expect(tokens.size).toBe(0);
  });

  it("parses subtypes from both faces of a DFC-ish type line", () => {
    const tokens = cardTokens(
      card({ typeLine: "Creature — Human Werewolf // Creature — Werewolf" }),
    );
    expect(tokens).toContain("human");
    expect(tokens).toContain("werewolf");
  });

  it("lowercases subtypes", () => {
    const tokens = cardTokens(card({ typeLine: "Artifact — Vehicle" }));
    expect(tokens).toContain("vehicle");
  });

  it("matches an oracle-text pattern", () => {
    const tokens = cardTokens(
      card({ oracleText: "Put a +1/+1 counter on target creature." }),
    );
    expect(tokens).toContain("+1/+1 counter");
  });

  it("matches multiple independent oracle-text patterns", () => {
    const tokens = cardTokens(
      card({
        oracleText:
          "Sacrifice a creature. If you do, create a 1/1 white Spirit creature token and draw a card.",
      }),
    );
    expect(tokens).toContain("sacrifice");
    expect(tokens).toContain("create token");
    expect(tokens).toContain("draw a card");
  });

  it("is case-insensitive on oracle text", () => {
    const tokens = cardTokens(card({ oracleText: "GAIN 3 LIFE." }));
    expect(tokens).toContain("gain life");
  });

  it("does not match an unrelated oracle-text pattern", () => {
    const tokens = cardTokens(card({ oracleText: "Vigilance." }));
    expect(tokens).not.toContain("landfall");
    expect(tokens).not.toContain("mill");
  });

  it("does not throw on empty oracle text and type line", () => {
    const blank = card({ typeLine: "", oracleText: "" });
    expect(() => cardTokens(blank)).not.toThrow();
    expect(cardTokens(blank).size).toBe(0);
  });

  it("combines subtype and oracle-text tokens", () => {
    const tokens = cardTokens(
      card({
        typeLine: "Creature — Zombie",
        oracleText: "When this creature dies, mill two cards.",
      }),
    );
    expect(tokens).toContain("zombie");
    expect(tokens).toContain("mill");
  });
});

const HYLDA_TEXT =
  "Whenever you tap an untapped creature an opponent controls, you may pay {1}. When you do, choose one —\n• Create a 4/4 white and blue Elemental creature token.\n• Put a +1/+1 counter on each creature you control.\n• Scry 2, then draw a card.";

describe("mechanic tokens", () => {
  it.each([
    ["tap creature", "Tap target creature. It doesn't untap during its controller's next untap step."],
    ["tap creature", "Tap all creatures your opponents control."],
    ["tap creature", "Creatures your opponents control enter tapped."],
    ["tap creature", HYLDA_TEXT],
    ["etb", "Whenever another creature you control enters, scry 1."],
    ["etb", "Exile target creature you control, then return that card to the battlefield."],
    ["dies", "Whenever another nontoken creature you control dies, each opponent loses 1 life."],
    ["attacks", "Whenever this creature attacks, draw a card."],
    ["targets", "Whenever you cast a spell that targets this creature, put a +1/+1 counter on it."],
    ["aura", "Whenever you cast an Aura spell, draw a card."],
    ["equipment", "Equipped creature gets +2/+0."],
    ["vehicle", "Crew 2"],
    ["defender", "Defender"],
    ["goad", "Goad target creature."],
    ["scry", "Surveil 2."],
    ["clue", "Investigate."],
    ["food", "Create a Food token."],
    ["blood", "Create a Blood token."],
    ["copy spell", "Whenever you copy an instant spell, draw a card."],
    ["energy", "You get {E}{E}."],
    ["experience counter", "You get an experience counter."],
    ["counters", "Put a charge counter on this artifact."],
    ["legendary", "Whenever you cast a legendary spell, draw a card."],
  ])("signals %s", (token, oracleText) => {
    expect(themeTokens(card({ oracleText }))).toContain(token);
  });

  it("does not count tapping your own creature as a cost", () => {
    const tokens = cardTokens(
      card({ oracleText: "Tap an untapped creature you control: Add one mana of any color." }),
    );
    expect(tokens).not.toContain("tap creature");
  });

  it("lets an enabler fit a theme without signalling it", () => {
    const etbCreature = card({ oracleText: "When this creature enters, draw a card." });
    expect(cardTokens(etbCreature)).toContain("etb");
    expect(themeTokens(etbCreature)).not.toContain("etb");

    const legend = card({ typeLine: "Legendary Creature — Human Knight" });
    expect(cardTokens(legend)).toContain("legendary");
    expect(themeTokens(legend)).not.toContain("legendary");
  });
});

describe("named creature types", () => {
  it("takes a tribe the rules text names", () => {
    const tokens = themeTokens(
      card({
        name: "Kaalia of the Vast",
        typeLine: "Legendary Creature — Human Cleric",
        oracleText:
          "Whenever Kaalia of the Vast attacks an opponent, you may put an Angel, Demon, or Dragon creature card from your hand onto the battlefield.",
      }),
    );
    expect(tokens).toContain("angel");
    expect(tokens).toContain("demon");
    expect(tokens).toContain("dragon");
  });

  it("reads plurals, including irregular ones", () => {
    expect(themeTokens(card({ oracleText: "Elves you control get +1/+1." }))).toContain("elf");
    expect(themeTokens(card({ oracleText: "Mice you control have haste." }))).toContain("mouse");
  });

  it("ignores the card's own name, the tokens it creates, and non- exclusions", () => {
    const tokens = themeTokens(
      card({
        name: "Goblin Recruiter",
        typeLine: "Creature — Bear",
        oracleText:
          "When Goblin Recruiter enters, create a 1/1 white Soldier creature token. Non-Human creatures can't block. Other non-Elf creatures get -1/-1.",
      }),
    );
    expect(tokens).not.toContain("goblin");
    expect(tokens).not.toContain("soldier");
    expect(tokens).not.toContain("human");
    expect(tokens).not.toContain("elf");
  });

  it("ignores an uncapitalised ordinary word", () => {
    expect(themeTokens(card({ oracleText: "Destroy target wall." }))).not.toContain("wall");
  });
});

describe("rewardedTokens", () => {
  it("takes what a whenever trigger rewards, not what it gives", () => {
    const tokens = rewardedTokens(card({ oracleText: HYLDA_TEXT }));
    expect([...tokens]).toEqual(["tap creature"]);
  });

  it("takes a tribe the rules text names", () => {
    const tokens = rewardedTokens(
      card({
        name: "Lathril, Blade of the Elves",
        typeLine: "Legendary Creature — Elf Noble",
        oracleText:
          "Whenever Lathril, Blade of the Elves deals combat damage to a player, create that many 1/1 green Elf Warrior creature tokens.\n{T}, Tap ten untapped Elves you control: Each opponent loses 10 life and you gain 10 life.",
      }),
    );
    expect([...tokens]).toEqual(["elf"]);
  });

  it("ignores one-shot when triggers", () => {
    const tokens = rewardedTokens(
      card({ oracleText: "When this creature enters, tap target creature." }),
    );
    expect(tokens.size).toBe(0);
  });
});

describe("tokenSearches", () => {
  it("gives a curated token's own searches, or the token itself", () => {
    expect(tokenSearches("tap creature")).toEqual(["tap"]);
    expect(tokenSearches("+1/+1 counter")).toEqual(["+1/+1 counter"]);
  });

  it("is null for a subtype token", () => {
    expect(tokenSearches("goblin")).toBeNull();
  });
});

describe("mentionsSubtype", () => {
  it("finds a subtype named in the singular", () => {
    expect(mentionsSubtype("create a 1/1 red Goblin creature token", "goblin")).toBe(true);
  });

  it("finds regular and irregular plurals", () => {
    expect(mentionsSubtype("Goblins you control get +1/+1.", "goblin")).toBe(true);
    expect(mentionsSubtype("Tap ten untapped Elves you control", "elf")).toBe(true);
    expect(mentionsSubtype("Allies you control gain lifelink", "ally")).toBe(true);
    expect(mentionsSubtype("other Sphinxes you control", "sphinx")).toBe(true);
  });

  it("ignores the subtype inside another word", () => {
    expect(mentionsSubtype("Sacrifice this creature itself", "elf")).toBe(false);
    expect(mentionsSubtype("Angelfire burns on", "angel")).toBe(false);
  });

  it("is false when the text never names the subtype", () => {
    expect(
      mentionsSubtype("Instant and sorcery spells you cast cost {1} less to cast.", "wizard"),
    ).toBe(false);
  });
});

describe("tribe membership", () => {
  it("reads the creature types of creature faces only", () => {
    expect(creatureTypesOf(card({ typeLine: "Creature — Elf Druid" }))).toEqual(["elf", "druid"]);
    expect(creatureTypesOf(card({ typeLine: "Kindred Instant — Elf" }))).toEqual([]);
  });

  it("counts a creature of a tribe, and a Changeling as every tribe", () => {
    expect(isOfTribe(card({ typeLine: "Creature — Elf" }), ["elf"])).toBe(true);
    expect(isOfTribe(card({ typeLine: "Creature — Bear" }), ["elf"])).toBe(false);
    expect(
      isOfTribe(card({ typeLine: "Creature — Shapeshifter", oracleText: "Changeling" }), ["elf"]),
    ).toBe(true);
    expect(isOfTribe(card({ typeLine: "Kindred Instant — Elf" }), ["elf"])).toBe(false);
  });

  it("serves a tribe by naming it or being Kindred of it", () => {
    expect(servesTribe(card({ oracleText: "Elves you control get +1/+1." }), ["elf"])).toBe(true);
    expect(servesTribe(card({ typeLine: "Kindred Sorcery — Elf" }), ["elf"])).toBe(true);
    expect(servesTribe(card({ typeLine: "Creature — Elf" }), ["elf"])).toBe(false);
  });
});
