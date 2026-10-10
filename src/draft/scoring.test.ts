import { describe, it, expect } from "vitest";
import { RAMP_WEIGHT } from "./rampScore";
import { scoreCandidate } from "./scoring";
import { extractThemeProfile } from "./themes";
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

describe("scoreCandidate", () => {
  it("scores higher for a candidate matching a commander-only token than a non-commander one of equal strength", () => {
    const commander = card({
      typeLine: "Legendary Creature — Goblin",
      oracleText: "Other Goblins you control get +1/+1.",
    });
    const nonCommander = card({ typeLine: "Creature — Elf" });
    const profile = extractThemeProfile([commander], [nonCommander]);

    const goblinCandidate = card({
      name: "Goblin Candidate",
      typeLine: "Creature — Goblin",
    });
    const elfCandidate = card({
      name: "Elf Candidate",
      typeLine: "Creature — Elf",
    });

    const goblinScore = scoreCandidate(goblinCandidate, profile);
    const elfScore = scoreCandidate(elfCandidate, profile);

    expect(goblinScore.themeScore).toBeGreaterThan(elfScore.themeScore);
    expect(goblinScore.total).toBeGreaterThan(elfScore.total);
  });

  it("reports matched tokens for rationale chips", () => {
    const commander = card({
      typeLine: "Legendary Creature — Goblin",
      oracleText: "Other Goblins you control get +1/+1.",
    });
    const profile = extractThemeProfile([commander], []);
    const candidate = card({ typeLine: "Creature — Goblin" });

    const score = scoreCandidate(candidate, profile);
    expect(score.matchedTokens).toEqual(["goblin"]);
  });

  it("favors a candidate that fills a thin spot in the curve", () => {
    const others = [
      card({ manaValue: 2 }),
      card({ manaValue: 2 }),
      card({ manaValue: 2 }),
    ];
    const profile = extractThemeProfile([], others);

    const thinSpotCandidate = card({ manaValue: 5 });
    const crowdedSpotCandidate = card({ manaValue: 2 });

    const thinScore = scoreCandidate(thinSpotCandidate, profile);
    const crowdedScore = scoreCandidate(crowdedSpotCandidate, profile);

    expect(thinScore.curveScore).toBeGreaterThan(crowdedScore.curveScore);
  });

  it("favors removal while the deck is short of it", () => {
    const others = [
      card({ roles: ["removal"] }),
      card({ roles: ["removal"] }),
      card({ roles: ["removal"] }),
    ];
    const profile = extractThemeProfile([], others);

    const fresh = extractThemeProfile([], []);
    const removalCandidate = card({ roles: ["removal"] });

    expect(scoreCandidate(removalCandidate, fresh).removalScore).toBeGreaterThan(
      scoreCandidate(removalCandidate, profile).removalScore,
    );
  });

  it("leaves draw to the card-advantage bucket, not the removal gap", () => {
    const candidate = card({ roles: ["draw"], oracleText: "Draw two cards." });
    expect(scoreCandidate(candidate, extractThemeProfile([], [])).removalScore).toBe(0);
  });

  it("gives no removal-gap credit to a card that is not removal", () => {
    const profile = extractThemeProfile([], [card({ roles: ["other"] })]);
    const candidate = card({ roles: ["other"] });
    expect(scoreCandidate(candidate, profile).removalScore).toBe(0);
  });

  it("does not throw scoring against an empty deck profile", () => {
    const profile = extractThemeProfile([], []);
    expect(() => scoreCandidate(card(), profile)).not.toThrow();
  });

  it("does not throw for a card with empty oracle text and type line", () => {
    const profile = extractThemeProfile([], []);
    const blank = card({ typeLine: "", oracleText: "" });
    expect(() => scoreCandidate(blank, profile)).not.toThrow();
  });

  describe("power conditions", () => {
    const commander = card({
      name: "Power Commander",
      typeLine: "Legendary Creature — Human",
      oracleText: "Other creatures you control with base power 1 get +1/+1.",
    });
    const profile = extractThemeProfile([commander], []);
    const withPower = (power: number) =>
      card({ name: `Power ${power}`, typeLine: "Creature — Bear", power });

    it("ranks a creature of the named power above an otherwise identical one", () => {
      const fit = scoreCandidate(withPower(1), profile);
      const miss = scoreCandidate(withPower(2), profile);
      expect(fit.themeScore).toBeGreaterThan(miss.themeScore);
      expect(fit.total).toBeGreaterThan(miss.total);
    });

    it("reports the power token as matched", () => {
      expect(scoreCandidate(withPower(1), profile).matchedTokens).toContain("base power 1");
      expect(scoreCandidate(withPower(2), profile).matchedTokens).not.toContain("base power 1");
    });

    it("counts a card that creates a creature token of that power", () => {
      const maker = card({
        name: "Soldier Maker",
        typeLine: "Sorcery",
        oracleText: "Create two 1/1 white Soldier creature tokens.",
      });
      expect(scoreCandidate(maker, profile).matchedTokens).toContain("base power 1");
    });
  });

  describe("tribal payoffs", () => {
    const elf = (name: string) => card({ name, typeLine: "Creature — Elf" });
    const lord = card({
      name: "Elf Lord",
      typeLine: "Creature — Elf",
      oracleText: "Other Elves you control get +1/+1.",
    });
    const vanilla = card({ name: "Plain Elf", typeLine: "Creature — Elf" });

    it("ranks a card naming a tribe above one that only is of it", () => {
      const profile = extractThemeProfile([], [elf("A"), elf("B"), elf("C")]);
      expect(scoreCandidate(vanilla, profile).tribalScore).toBe(0);
      expect(scoreCandidate(lord, profile).tribalScore).toBeGreaterThan(0);
    });

    it("grows with the tribe's numbers and saturates", () => {
      const scoreWith = (n: number) =>
        scoreCandidate(
          lord,
          extractThemeProfile([], Array.from({ length: n }, (_, i) => elf(`Elf ${i}`))),
        ).tribalScore;
      const gains = [scoreWith(2) - scoreWith(1), scoreWith(10) - scoreWith(9)];
      expect(scoreWith(10)).toBeGreaterThan(scoreWith(3));
      expect(gains[1]).toBeLessThan(gains[0]);
    });

    it("weighs a tribe by its share of the deck's creatures", () => {
      const bears = Array.from({ length: 20 }, (_, i) => card({ name: `Bear ${i}` }));
      const elves = [elf("A"), elf("B"), elf("C")];
      const focused = scoreCandidate(lord, extractThemeProfile([], elves)).tribalScore;
      const diluted = scoreCandidate(
        lord,
        extractThemeProfile([], [...elves, ...bears]),
      ).tribalScore;
      expect(diluted).toBeLessThan(focused);
    });

    it("adds a bonus in tribal mode for cards that name or are Kindred of a chosen tribe", () => {
      const kindred = card({ name: "Elf Spell", typeLine: "Kindred Instant — Elf" });
      const off = extractThemeProfile([], []);
      const on = extractThemeProfile([], [], ["Elf"]);
      expect(scoreCandidate(kindred, off).tribalScore).toBe(0);
      expect(scoreCandidate(kindred, on).tribalScore).toBeGreaterThan(0);
      expect(scoreCandidate(lord, on).tribalScore).toBeGreaterThan(0);
      expect(scoreCandidate(vanilla, on).tribalScore).toBe(0);
    });
  });

  describe("ramp", () => {
    const tapForG = "{T}: Add {G}.";
    const dork = card({ name: "Dork", manaValue: 1, roles: ["ramp"], oracleText: tapForG });
    const rampScoreIn = (
      commanderMv: number,
      candidate = dork,
      others: Card[] = [],
      colorIdentity = ["G"],
    ) =>
      scoreCandidate(
        candidate,
        extractThemeProfile(
          [card({ name: "Commander", manaValue: commanderMv, colorIdentity })],
          others,
        ),
      ).bucketScores.ramp;

    it("gives nothing while the deck's mana appetite is low", () => {
      expect(rampScoreIn(2)).toBe(0);
    });

    it("grows with the commander's mana value up to RAMP_WEIGHT", () => {
      expect(rampScoreIn(4)).toBeGreaterThan(rampScoreIn(3));
      expect(rampScoreIn(7)).toBe(RAMP_WEIGHT);
    });

    it("favors cheap ramp and gives slow ramp nothing", () => {
      const slow = card({ name: "Slow", manaValue: 3, roles: ["ramp"], oracleText: tapForG });
      const big = card({ name: "Big", manaValue: 4, roles: ["ramp"], oracleText: tapForG });
      expect(rampScoreIn(7, slow)).toBeLessThan(rampScoreIn(7));
      expect(rampScoreIn(7, big)).toBe(0);
    });

    it("counts a spell that puts a land onto the battlefield but not one-shot or Treasure-only ramp", () => {
      const landSearch = card({
        name: "Land Search",
        typeLine: "Sorcery",
        roles: ["ramp"],
        oracleText:
          "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
      });
      const ritualTreasure = card({
        name: "One Shot",
        typeLine: "Instant",
        roles: ["ramp"],
        oracleText: "Draw a card, then create a Treasure token.",
      });
      const treasureOnly = card({
        name: "Treasure Maker",
        typeLine: "Artifact",
        roles: ["ramp"],
        oracleText:
          "Whenever you draw your second card each turn, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this artifact: Add one mana of any color.\")",
      });
      expect(rampScoreIn(7, landSearch)).toBe(RAMP_WEIGHT);
      expect(rampScoreIn(7, ritualTreasure)).toBe(0);
      expect(rampScoreIn(7, treasureOnly)).toBe(0);
    });

    it("favors ramp that scales with a tribe the deck has", () => {
      const priest = card({
        name: "Priest",
        manaValue: 1,
        roles: ["ramp"],
        oracleText: "{T}: Add {G} for each Elf on the battlefield.",
      });
      const elves = [card({ name: "Elf", typeLine: "Creature — Elf" })];
      expect(rampScoreIn(5, priest, elves)).toBeGreaterThan(rampScoreIn(5, dork, elves));
    });

    it("grows the tribe bonus with the tribe, only for a tribe its mana names", () => {
      const priest = card({
        name: "Priest",
        manaValue: 1,
        roles: ["ramp"],
        oracleText: "{T}: Add {G} for each Elf on the battlefield.",
      });
      const elfMention = card({
        name: "Mention",
        manaValue: 1,
        roles: ["ramp"],
        oracleText: "Other Elves you control get +1/+1.\n{T}: Add {G}.",
      });
      const elves = (n: number) =>
        Array.from({ length: n }, (_, i) => card({ name: `Elf ${i}`, manaValue: 5, typeLine: "Creature — Elf" }));
      expect(rampScoreIn(5, priest, elves(6))).toBeGreaterThan(rampScoreIn(5, priest, elves(1)));
      expect(rampScoreIn(5, elfMention, elves(6))).toBe(rampScoreIn(5, dork, elves(6)));
    });

    it("follows the deck's ramp pace instead of its raw ramp count", () => {
      const ramp = (n: number) =>
        Array.from({ length: n }, (_, i) => card({ name: `Ramp ${i}`, roles: ["ramp"], oracleText: tapForG }));
      const spells = (n: number) =>
        Array.from({ length: n }, (_, i) => card({ name: `Spell ${i}`, manaValue: 7 }));
      expect(rampScoreIn(7, dork, ramp(3))).toBe(0);
      expect(rampScoreIn(7, dork, [...ramp(5), ...spells(20)])).toBeGreaterThan(0);
      expect(rampScoreIn(7, dork, [...ramp(5), ...spells(20)])).toBeLessThan(
        rampScoreIn(7, dork, spells(20)),
      );
    });

    it("gives creature ramp a quarter in a deck without green, and other ramp all of it", () => {
      const rock = card({ name: "Rock", typeLine: "Artifact", roles: ["ramp"], oracleText: tapForG });
      expect(rampScoreIn(7, dork, [], ["B"])).toBe(RAMP_WEIGHT / 4);
      expect(rampScoreIn(7, rock, [], ["B"])).toBe(RAMP_WEIGHT);
    });

    it("leaves ramp out of the removal-gap term", () => {
      const profile = extractThemeProfile([card({ name: "Commander", manaValue: 7 })], []);
      expect(scoreCandidate(dork, profile).removalScore).toBe(0);
    });
  });
});
