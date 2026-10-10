import { describe, it, expect } from "vitest";
import {
  cardTokens,
  creatureTypesOf,
  commanderThemeTokens,
  fitsToken,
  isOfTribe,
  servesTribe,
  mentionsSubtype,
  themeTokens,
  tokenSearches,
  rewardedTokens,
  tokenStrengths,
  REPEATABLE_STRENGTH,
  MULTIPLAYER_STRENGTH,
} from "./tokens";
import { fitsPowerCondition } from "./powerTokens";
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
    const tokens = cardTokens(card({ typeLine: "Enchantment" }));
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
    ["tap creature", "Tap an untapped creature you control: Tap target artifact, creature, or land."],
    ["tap creature", "Tap target artifact or creature."],
    ["tap creature", "Draw a card for each tapped creature target opponent controls."],
    ["tap creature", "Whenever a creature an opponent controls becomes tapped, you may draw a card."],
    ["creature etb", "Whenever another creature you control enters, scry 1."],
    ["etb", "Whenever another permanent enters, scry 1."],
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

  it("does not take tapping a list of your own permanents for tapping opponents' creatures", () => {
    const tokens = themeTokens(
      card({ oracleText: "Tap target artifact or creature you control: Add {C}." }),
    );
    expect(tokens).not.toContain("tap creature");
  });

  it("lets an enabler fit a theme without signalling it", () => {
    const etbCreature = card({ oracleText: "When this creature enters, draw a card." });
    expect(cardTokens(etbCreature)).toContain("etb");
    expect(themeTokens(etbCreature)).not.toContain("etb");
    expect(cardTokens(etbCreature)).toContain("creature etb");
    expect(themeTokens(etbCreature)).not.toContain("creature etb");

    const etbEnchantment = card({
      typeLine: "Enchantment",
      oracleText: "When this enchantment enters, draw a card.",
    });
    expect(cardTokens(etbEnchantment)).toContain("etb");
    expect(cardTokens(etbEnchantment)).not.toContain("creature etb");

    const legend = card({ typeLine: "Legendary Creature — Human Knight" });
    expect(cardTokens(legend)).toContain("legendary");
    expect(themeTokens(legend)).not.toContain("legendary");
  });

  it("takes a token entering for token making, not for enters triggers", () => {
    const tokens = themeTokens(
      card({
        oracleText:
          "Whenever a token you control enters, tap target nonland permanent an opponent controls.",
      }),
    );
    expect(tokens).toContain("create token");
    expect(tokens).not.toContain("etb");
  });

  it("lets artifacts and artifact token makers fit an artifact theme without signalling it", () => {
    const rock = card({ typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });
    expect(cardTokens(rock)).toContain("artifact");
    expect(themeTokens(rock)).not.toContain("artifact");

    const investigator = card({
      oracleText:
        "When this creature enters, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")",
    });
    expect(cardTokens(investigator)).toContain("artifact");
    expect(themeTokens(investigator)).not.toContain("artifact");

    const soldierMaker = card({ oracleText: "Create a 1/1 white Soldier creature token." });
    expect(cardTokens(soldierMaker)).not.toContain("artifact");
  });

  it("reads tapping several targets, and a payoff for tapping several creatures", () => {
    expect(themeTokens(card({ typeLine: "Instant", oracleText: "Tap X target creatures." }))).toContain(
      "tap creature",
    );
    expect(
      themeTokens(
        card({
          oracleText: "Whenever you tap one or more untapped creatures your opponents control, draw a card.",
        }),
      ),
    ).toContain("tap creature");
  });

  it("does not take an opponent tapping their own creature for tapping", () => {
    const tokens = themeTokens(
      card({
        oracleText:
          "At the beginning of each combat, if this creature is untapped, any opponent may tap an untapped creature they control. If they do, tap this creature.",
      }),
    );
    expect(tokens).not.toContain("tap creature");
  });

  it("does not take tapping a listed permanent type they control for tapping", () => {
    const tokens = themeTokens(
      card({ oracleText: "Tap target artifact or creature they control." }),
    );
    expect(tokens).not.toContain("tap creature");
  });
});

describe("commanderThemeTokens", () => {
  const commanderTokens = (overrides: Partial<Card>) => commanderThemeTokens(card(overrides));

  it("leaves out the commander's own keyword lines and type-line subtypes", () => {
    const tokens = commanderTokens({
      typeLine: "Legendary Creature — Bird Bard",
      oracleText: ZINNIA_TEXT,
    });
    expect(tokens).toContain("create token");
    expect(tokens).toContain("base power 1");
    expect(tokens).not.toContain("flying");
    expect(tokens).not.toContain("bird");
    expect(tokens).not.toContain("bard");
  });

  it("leaves out a line of several keywords, with or without reminder text", () => {
    const tokens = commanderTokens({
      oracleText:
        "Flying, first strike, lifelink\nWard {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)\nProtection from red, hexproof",
    });
    expect([...tokens]).toEqual([]);
  });

  it("keeps a keyword on a line that does more than list keywords", () => {
    const tokens = commanderTokens({ oracleText: "Creatures you control have flying." });
    expect(tokens).toContain("flying");
    expect(commanderTokens({ oracleText: "Flying, haste\nWhenever this attacks, draw a card." })).toContain(
      "draw a card",
    );
  });

  it("keeps a tribe the rules text names", () => {
    const tokens = commanderTokens({
      typeLine: "Legendary Creature — Elf Druid",
      oracleText: "Other Elves you control get +1/+1.",
    });
    expect(tokens).toContain("elf");
    expect(tokens).not.toContain("druid");
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

  it("does not read ward's reminder text as rewarding spells that target", () => {
    const tokens = rewardedTokens(
      card({
        oracleText:
          "Ward {2} (Whenever this creature becomes the target of a spell or ability an opponent controls, counter it unless that player pays {2}.)",
      }),
    );
    expect(tokens.has("targets")).toBe(false);
  });
});

describe("reminder text", () => {
  it("reads no tokens from a token's reminder text", () => {
    const treasureMaker = card({
      oracleText:
        "When this creature enters, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")",
    });
    expect(themeTokens(treasureMaker).has("treasure")).toBe(true);
    expect(themeTokens(treasureMaker).has("sacrifice")).toBe(false);
    const clueMaker = card({
      oracleText: "When this creature enters, investigate. (Create a Clue token. It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")",
    });
    expect(themeTokens(clueMaker).has("draw a card")).toBe(false);
    expect(themeTokens(clueMaker).has("clue")).toBe(true);
  });

  it.each([
    ["Persist (When this creature dies, if it had no -1/-1 counters on it, return it.)", "-1/-1 counter"],
    ["Undying (When this creature dies, if it had no +1/+1 counters on it, return it.)", "+1/+1 counter"],
    ["Fabricate 2 (When this creature enters, put two +1/+1 counters on it or create two 1/1 Servo tokens.)", "create token"],
    ["Afterlife 1 (When this creature dies, create a 1/1 white and black Spirit creature token with flying.)", "create token"],
    ["Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1.)", "attacks"],
    ["Flashback {2}{B} (You may cast this card from your graveyard for its flashback cost. Then exile it.)", "cast from graveyard"],
    ["Cycling {2} ({2}, Discard this card: Draw a card.)", "discard a card"],
    ["Madness {R} (If you discard this card, discard it into exile.)", "discard a card"],
    ["Bestow {4}{W} (If you cast this card for its bestow cost, it's an Aura spell.)", "aura"],
  ])("keeps the signal of a keyword worded %j", (oracleText, token) => {
    expect(themeTokens(card({ oracleText })).has(token)).toBe(true);
  });

  it("does not read a token from the card's own name", () => {
    const named = card({
      name: "Sacrifice Engine",
      oracleText: "Whenever Sacrifice Engine attacks, scry 1.",
    });
    expect(themeTokens(named).has("sacrifice")).toBe(false);
  });

  it("does not read a keyword in the card's own name", () => {
    const named = card({
      name: "Chronomantic Escape",
      typeLine: "Sorcery",
      oracleText: "Until your next turn, creatures can't attack you. Exile Chronomantic Escape with three time counters on it.",
    });
    expect(themeTokens(named).has("cast from graveyard")).toBe(false);
  });

  it("drops what a keyword's reminder only mentions on the way", () => {
    const flashback = card({
      typeLine: "Sorcery",
      oracleText: "Draw two cards.\nFlashback {2}{U} (You may cast this card from your graveyard for its flashback cost. Then exile it.)",
    });
    expect(themeTokens(flashback).has("exile")).toBe(false);
  });
});

const ZINNIA_TEXT =
  "Flying\nZinnia gets +X/+0, where X is the number of other creatures you control with base power 1.\nCreature spells you cast gain offspring {2} as you cast them. (You may pay an additional {2} as you cast a creature spell. If you do, when that creature enters, create a 1/1 token copy of it.)";
const PANHARMONICON_TEXT =
  "If an artifact or creature entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.";
const TEYSA_TEXT =
  "Whenever a creature you control dies, create a 1/1 white Spirit creature token with flying.\nIf a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.";

describe("power conditions", () => {
  it("takes a base power the rules text names", () => {
    expect(themeTokens(card({ oracleText: ZINNIA_TEXT }))).toContain("base power 1");
    expect(rewardedTokens(card({ oracleText: ZINNIA_TEXT }))).toContain("base power 1");
  });

  it("takes a power bound with its direction", () => {
    const text = "Whenever a creature with power 4 or greater enters the battlefield under your control, draw a card.";
    expect(themeTokens(card({ oracleText: text }))).toContain("power 4 or greater");
    expect(rewardedTokens(card({ oracleText: text }))).toContain("power 4 or greater");
    expect(
      themeTokens(card({ oracleText: "Creatures you control with power 2 or less have flying." })),
    ).toContain("power 2 or less");
  });

  it("ignores a power that picks a target, an opponent's creature or a blocker", () => {
    const texts = [
      "Destroy target creature with power 4 or greater.",
      "Creatures your opponents control with power 2 or less can't attack.",
      "Creatures with power 3 or greater can't block this creature.",
    ];
    for (const oracleText of texts) {
      expect([...themeTokens(card({ oracleText }))].filter((t) => t.includes("power"))).toEqual([]);
    }
  });

  it("ignores a total power", () => {
    const text = "Whenever you attack, if creatures you control have total power 6 or greater, draw a card.";
    expect([...themeTokens(card({ oracleText: text }))].filter((t) => t.includes("power"))).toEqual([]);
  });

  it("ignores a bare power number", () => {
    expect(themeTokens(card({ oracleText: "Target creature has power 3 until end of turn." }))).not.toContain("power 3");
    expect(themeTokens(card({ oracleText: "Creatures you control have power 3." }))).not.toContain("power 3");
  });

  it("does not add power facts to a card's own tokens", () => {
    const bear = card({ typeLine: "Creature — Bear", power: 1 });
    expect([...cardTokens(bear)].filter((t) => t.includes("power"))).toEqual([]);
  });
});

describe("fitsPowerCondition", () => {
  it("fits a creature by its printed power", () => {
    const bear = card({ power: 2 });
    expect(fitsPowerCondition(bear, "base power 2")).toBe(true);
    expect(fitsPowerCondition(bear, "base power 1")).toBe(false);
    expect(fitsPowerCondition(bear, "power 2 or less")).toBe(true);
    expect(fitsPowerCondition(bear, "power 1 or less")).toBe(false);
    expect(fitsPowerCondition(bear, "power 2 or greater")).toBe(true);
    expect(fitsPowerCondition(bear, "power 3 or greater")).toBe(false);
  });

  it("does not fit a creature whose power is not a fixed number", () => {
    const star = card({ typeLine: "Creature — Elemental" });
    expect(fitsPowerCondition(star, "base power 1")).toBe(false);
    expect(fitsPowerCondition(star, "power 4 or greater")).toBe(false);
  });

  it("fits a card that creates a creature token of that power", () => {
    const makesSoldiers = card({
      typeLine: "Sorcery",
      oracleText: "Create two 1/1 white Soldier creature tokens.",
    });
    expect(fitsPowerCondition(makesSoldiers, "base power 1")).toBe(true);
    expect(fitsPowerCondition(makesSoldiers, "power 2 or greater")).toBe(false);
  });

  it("fits a card with offspring through its token copy", () => {
    expect(fitsPowerCondition(card({ oracleText: ZINNIA_TEXT }), "base power 1")).toBe(true);
  });

  it("does not fit a non-creature by its power", () => {
    const vehicle = card({ typeLine: "Artifact — Vehicle", power: 1 });
    expect(fitsPowerCondition(vehicle, "base power 1")).toBe(false);
  });

  it("does not fit a token that is not a power condition", () => {
    expect(fitsPowerCondition(card({ power: 1 }), "elf")).toBe(false);
  });
});

describe("fitsToken", () => {
  it("fits a token the card has or a power condition it meets", () => {
    const elf = card({ typeLine: "Creature — Elf", power: 2 });
    expect(fitsToken(elf, "elf")).toBe(true);
    expect(fitsToken(elf, "base power 2")).toBe(true);
    expect(fitsToken(elf, "base power 1")).toBe(false);
    expect(fitsToken(elf, "goblin")).toBe(false);
  });
});

const EZURI_TEXT =
  "Whenever another creature you control enters, you get an experience counter.\nAt the beginning of combat on your turn, put a +1/+1 counter on up to one target creature you control with power less than or equal to the number of experience counters you have.";

describe("ETB multipliers", () => {
  it.each([
    ["offspring", ZINNIA_TEXT],
    ["a token copy", "When this creature enters, create a token that's a copy of it."],
    ["token copies", "Whenever you cast a creature spell, create two tokens that are copies of it."],
    ["a creature entering trigger", EZURI_TEXT],
  ])("rewards creature etb for %s, not etb", (_, oracleText) => {
    const rewarded = rewardedTokens(card({ oracleText }));
    expect(rewarded).toContain("creature etb");
    expect(rewarded).not.toContain("etb");
  });

  it("does not make offspring or token copies a theme token", () => {
    const texts = [
      ZINNIA_TEXT,
      "When this creature enters, create a token that's a copy of it.",
      "Whenever you cast a creature spell, create two tokens that are copies of it.",
    ];
    for (const oracleText of texts) {
      expect(themeTokens(card({ oracleText }))).not.toContain("creature etb");
    }
  });

  it("rewards etb for a doubled trigger of any permanent", () => {
    const rewarded = rewardedTokens(card({ oracleText: PANHARMONICON_TEXT }));
    expect(rewarded).toContain("etb");
    expect(rewarded).not.toContain("creature etb");
  });

  it("rewards etb for a trigger on any permanent entering", () => {
    const rewarded = rewardedTokens(
      card({ oracleText: "Whenever another permanent enters under your control, scry 1." }),
    );
    expect(rewarded).toContain("etb");
    expect(rewarded).not.toContain("creature etb");
  });

  it("makes etb a theme token for an enters-trigger doubler", () => {
    expect(themeTokens(card({ oracleText: PANHARMONICON_TEXT }))).toContain("etb");
  });

  it("makes creature etb, not etb, a theme token for a creature entering trigger", () => {
    const tokens = themeTokens(card({ oracleText: EZURI_TEXT }));
    expect(tokens).toContain("creature etb");
    expect(tokens).not.toContain("etb");
  });

  it("does not take a dying trigger doubler for an etb one", () => {
    expect(themeTokens(card({ oracleText: TEYSA_TEXT }))).not.toContain("etb");
    expect(rewardedTokens(card({ oracleText: TEYSA_TEXT }))).not.toContain("etb");
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

describe("tokenStrengths", () => {
  const strength = (overrides: Partial<Card>, token: string) =>
    tokenStrengths(card(overrides)).get(token) ?? 1;

  it("counts a one-shot effect once", () => {
    expect(strength({ oracleText: "When this creature enters, draw a card." }, "draw a card")).toBe(1);
    expect(
      strength({ typeLine: "Sorcery", oracleText: "At the beginning of your upkeep, draw a card." }, "draw a card"),
    ).toBe(1);
  });

  it("strengthens a repeatable trigger or activated ability on a permanent", () => {
    expect(
      strength(
        { oracleText: "Whenever another creature you control enters, tap target creature an opponent controls." },
        "tap creature",
      ),
    ).toBe(REPEATABLE_STRENGTH);
    expect(
      strength(
        { typeLine: "Enchantment", oracleText: "Tap an untapped creature you control: Tap target artifact, creature, or land." },
        "tap creature",
      ),
    ).toBe(REPEATABLE_STRENGTH);
  });

  it("strengthens the modes of a repeating trigger, whatever their label", () => {
    expect(
      strength(
        {
          oracleText:
            "At the beginning of combat on your turn, choose up to one —\n• Tap target creature.\n• Target creature doesn't untap during its controller's next untap step.",
        },
        "tap creature",
      ),
    ).toBe(REPEATABLE_STRENGTH);
    expect(
      strength(
        {
          typeLine: "Enchantment",
          oracleText:
            "As this enchantment enters, choose Khans or Dragons.\n• Khans — At the beginning of combat on your turn, put two +1/+1 counters on target creature you control.\n• Dragons — At the beginning of combat on each opponent's turn, tap target creature that player controls.",
        },
        "tap creature",
      ),
    ).toBe(REPEATABLE_STRENGTH * MULTIPLAYER_STRENGTH);
    expect(
      strength({ typeLine: "Instant", oracleText: "Choose one —\n• Tap target creature.\n• Draw a card." }, "tap creature"),
    ).toBe(1);
  });

  it("ranks a repeatable engine over a one-shot that reaches every opponent", () => {
    const engine = strength(
      { typeLine: "Enchantment", oracleText: "Tap an untapped creature you control: Tap target artifact, creature, or land." },
      "tap creature",
    );
    const burst = strength({ typeLine: "Instant", oracleText: "Tap all creatures your opponents control." }, "tap creature");
    expect(engine).toBeGreaterThan(burst);
  });

  it("strengthens an effect that reaches every opponent", () => {
    expect(
      strength({ typeLine: "Instant", oracleText: "Tap all creatures your opponents control." }, "tap creature"),
    ).toBe(MULTIPLAYER_STRENGTH);
    expect(
      strength({ typeLine: "Instant", oracleText: "Tap target creature." }, "tap creature"),
    ).toBe(1);
  });

  it("strengthens creature etb by its clause", () => {
    const repeating = "Whenever another creature you control enters, you gain 1 life.";
    expect(strength({ oracleText: repeating }, "creature etb")).toBe(REPEATABLE_STRENGTH);
    expect(
      strength({ oracleText: "When this creature enters, you gain 1 life." }, "creature etb"),
    ).toBe(1);
    expect(
      strength(
        {
          oracleText:
            "Whenever another creature you control enters, you gain 1 life.\nWhenever an opponent's creature enters, each opponent loses 1 life.",
        },
        "creature etb",
      ),
    ).toBe(REPEATABLE_STRENGTH * MULTIPLAYER_STRENGTH);
  });

  it("ranks each end step over your end step over your next end step", () => {
    const at = (when: string) =>
      strength({ typeLine: "Enchantment", oracleText: `At the beginning of ${when}, draw a card.` }, "draw a card");

    expect(at("each end step")).toBe(REPEATABLE_STRENGTH * MULTIPLAYER_STRENGTH);
    expect(at("your end step")).toBe(REPEATABLE_STRENGTH);
    expect(at("the next end step")).toBe(1);
  });

  it("takes the strongest clause that carries a token, and ignores reminder text", () => {
    const tokens = tokenStrengths(
      card({
        oracleText:
          "When this creature enters, draw a card.\nWhenever an opponent casts a spell, draw a card. (Reminder: it's a trigger.)",
      }),
    );
    expect(tokens.get("draw a card")).toBe(REPEATABLE_STRENGTH * MULTIPLAYER_STRENGTH);
  });

  it("does not strengthen a symmetric effect", () => {
    expect(
      strength({ typeLine: "Sorcery", oracleText: "Each player draws two cards." }, "draw a card"),
    ).toBe(1);
  });
});

const MIZZIX_TEXT =
  "Whenever you cast an instant or sorcery spell with mana value greater than the number of experience counters you have, you get an experience counter.\nInstant and sorcery spells you cast cost {1} less to cast for each experience counter you have.";
const GRAPESHOT_TEXT =
  "Grapeshot deals 1 damage to any target.\nStorm (When you cast this spell, copy it for each spell cast before it this turn. You may choose new targets for the copies.)";
const TREASURE_CRUISE_TEXT =
  "Delve (Each card you exile from your graveyard while casting this spell pays for {1}.)\nDraw three cards.";
const BLUSTERSQUALL_TEXT =
  "Tap target creature you don't control.\nOverload {3}{U} (You may cast this spell for its overload cost. If you do, change \"target\" in its text to \"each.\")";

describe("spell keywords", () => {
  const sorcery = (oracleText: string) => card({ typeLine: "Sorcery", oracleText });

  it("reads casting instants and sorceries, and reducing their cost, from a commander", () => {
    const tokens = commanderThemeTokens(card({ oracleText: MIZZIX_TEXT }));
    expect(tokens).toContain("instant or sorcery");
    expect(tokens).toContain("cost reduction");
    expect(rewardedTokens(card({ oracleText: MIZZIX_TEXT }))).toContain("instant or sorcery");
  });

  it("fits every instant and sorcery to a deck that casts them", () => {
    expect(fitsToken(card({ typeLine: "Instant" }), "instant or sorcery")).toBe(true);
    expect(fitsToken(card({ typeLine: "Enchantment" }), "instant or sorcery")).toBe(false);
  });

  it("does not take an instant or sorcery card in a graveyard for casting them", () => {
    const text = "Sacrifice this creature: You may cast target instant or sorcery card from your graveyard.";
    expect(themeTokens(card({ oracleText: text }))).not.toContain("instant or sorcery");
  });

  it("does not take stopping or punishing instants and sorceries for casting them", () => {
    const texts = [
      "When Azor enters, each opponent can't cast instant or sorcery spells during that player's next turn.",
      "Sacrifice this creature: Counter target red instant or sorcery spell.",
      "Whenever an opponent casts or copies an instant or sorcery spell, they lose 1 life.",
      "This spell costs {1}{U} less to cast if it targets an instant or sorcery spell. Counter target spell.",
    ];
    for (const oracleText of texts) {
      expect(themeTokens(card({ oracleText }))).not.toContain("instant or sorcery");
    }
    expect(themeTokens(card({ oracleText: "Copy target instant or sorcery spell." }))).toContain(
      "instant or sorcery",
    );
  });

  it("takes only cost reductions that reach instants and sorceries", () => {
    const reduces = (oracleText: string) => themeTokens(card({ oracleText })).has("cost reduction");
    expect(reduces("Instant and sorcery spells you cast cost {1} less to cast.")).toBe(true);
    expect(reduces("Blue spells you cast cost {1} less to cast.")).toBe(true);
    expect(reduces("Spells cost {1} less to cast.")).toBe(true);
    expect(reduces("Goblin spells you cast cost {1} less to cast.")).toBe(false);
    expect(reduces("Creature spells you cast cost {1} less to cast.")).toBe(false);
  });

  it("reads storm as a keyword, not as a word in a card's name", () => {
    expect(themeTokens(sorcery(GRAPESHOT_TEXT))).toContain("storm");
    const seeker = themeTokens(card({ oracleText: "Storm Seeker deals damage to target player equal to the number of cards in that player's hand." }));
    expect(seeker).not.toContain("storm");
    expect(seeker).not.toContain("copy spell");
    const comet = themeTokens(card({ typeLine: "Instant", oracleText: "Comet Storm deals X damage to each of them." }));
    expect(comet).not.toContain("storm");
    expect(comet).not.toContain("copy spell");
  });

  it("fits storm to what feeds it, and what feeds it to storm", () => {
    expect(fitsToken(sorcery(GRAPESHOT_TEXT), "cost reduction")).toBe(true);
    const electromancer = card({ oracleText: "Instant and sorcery spells you cast cost {1} less to cast." });
    expect(fitsToken(electromancer, "storm")).toBe(true);
    expect(fitsToken(electromancer, "overload")).toBe(true);
    expect(fitsToken(electromancer, "kicker")).toBe(true);
    const guttersnipe = card({ oracleText: "Whenever you cast an instant or sorcery spell, this creature deals 2 damage to each opponent." });
    expect(fitsToken(guttersnipe, "storm")).toBe(true);
    expect(tokenSearches("cost reduction")).toEqual(
      expect.arrayContaining(["cost less", "kicker", "storm", "overload"]),
    );
  });

  it("fits delve to milling, and milling to delve", () => {
    expect(fitsToken(sorcery(TREASURE_CRUISE_TEXT), "mill")).toBe(true);
    expect(fitsToken(sorcery(TREASURE_CRUISE_TEXT), "discard a card")).toBe(true);
    expect(fitsToken(card({ oracleText: "When this creature enters, mill three cards." }), "delve")).toBe(true);
    expect(fitsToken(card({ oracleText: "{T}: Draw a card, then discard a card." }), "delve")).toBe(true);
    expect(tokenSearches("mill")).toContain("delve");
  });

  it("reads a kicked-spell payoff as rewarding kicker", () => {
    const verazol = card({
      oracleText: "Whenever you cast a kicked spell, you may remove two +1/+1 counters from this creature. If you do, copy that spell.",
    });
    expect(rewardedTokens(verazol)).toContain("kicker");
    expect(themeTokens(sorcery("Kicker {2}{G}\nSearch your library for a basic land card."))).toContain("kicker");
  });

  it("fits only a kicked instant or sorcery to cost reduction", () => {
    const text = "Multikicker {2}\nThis artifact enters with a charge counter on it for each time it was kicked.";
    expect(fitsToken(sorcery(text), "cost reduction")).toBe(true);
    expect(fitsToken(card({ typeLine: "Artifact", oracleText: text }), "cost reduction")).toBe(false);
    const trickery = card({ typeLine: "Instant", oracleText: "Counter target spell if it was kicked." });
    expect(fitsToken(trickery, "cost reduction")).toBe(false);
  });

  it("counts everything an overloaded spell fits as reaching every opponent", () => {
    const blustersquall = card({ typeLine: "Instant", oracleText: BLUSTERSQUALL_TEXT });
    expect(fitsToken(blustersquall, "cost reduction")).toBe(true);
    expect(tokenStrengths(blustersquall).get("tap creature")).toBe(MULTIPLAYER_STRENGTH);
    expect(tokenStrengths(blustersquall).get("instant or sorcery")).toBe(MULTIPLAYER_STRENGTH);
    expect(tokenStrengths(blustersquall).get("cost reduction")).toBe(MULTIPLAYER_STRENGTH);
  });
});
