import { describe, it, expect } from "vitest";
import {
  cardTokens,
  creatureTypesOf,
  commanderThemeTokens,
  fitsPowerToken,
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

describe("fitsPowerToken", () => {
  it("fits a creature by its printed power", () => {
    const bear = card({ power: 2 });
    expect(fitsPowerToken(bear, "base power 2")).toBe(true);
    expect(fitsPowerToken(bear, "base power 1")).toBe(false);
    expect(fitsPowerToken(bear, "power 2 or less")).toBe(true);
    expect(fitsPowerToken(bear, "power 1 or less")).toBe(false);
    expect(fitsPowerToken(bear, "power 2 or greater")).toBe(true);
    expect(fitsPowerToken(bear, "power 3 or greater")).toBe(false);
  });

  it("does not fit a creature whose power is not a fixed number", () => {
    const star = card({ typeLine: "Creature — Elemental" });
    expect(fitsPowerToken(star, "base power 1")).toBe(false);
    expect(fitsPowerToken(star, "power 4 or greater")).toBe(false);
  });

  it("fits a card that creates a creature token of that power", () => {
    const makesSoldiers = card({
      typeLine: "Sorcery",
      oracleText: "Create two 1/1 white Soldier creature tokens.",
    });
    expect(fitsPowerToken(makesSoldiers, "base power 1")).toBe(true);
    expect(fitsPowerToken(makesSoldiers, "power 2 or greater")).toBe(false);
  });

  it("fits a card with offspring through its token copy", () => {
    expect(fitsPowerToken(card({ oracleText: ZINNIA_TEXT }), "base power 1")).toBe(true);
  });

  it("does not fit a non-creature by its power", () => {
    const vehicle = card({ typeLine: "Artifact — Vehicle", power: 1 });
    expect(fitsPowerToken(vehicle, "base power 1")).toBe(false);
  });

  it("does not fit a token that is not a power condition", () => {
    expect(fitsPowerToken(card({ power: 1 }), "elf")).toBe(false);
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

  it("strengthens an effect that reaches every opponent", () => {
    expect(
      strength({ typeLine: "Instant", oracleText: "Tap all creatures your opponents control." }, "tap creature"),
    ).toBe(MULTIPLAYER_STRENGTH);
    expect(
      strength({ typeLine: "Instant", oracleText: "Tap target creature." }, "tap creature"),
    ).toBe(1);
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
