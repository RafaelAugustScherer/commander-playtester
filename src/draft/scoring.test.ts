import { describe, it, expect } from "vitest";
import { RAMP_WEIGHT, scoreCandidate } from "./scoring";
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
    const commander = card({ typeLine: "Legendary Creature — Goblin" });
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
    const commander = card({ typeLine: "Legendary Creature — Goblin" });
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

  it("favors a candidate filling a role the deck is short on", () => {
    const others = [
      card({ roles: ["removal"] }),
      card({ roles: ["removal"] }),
      card({ roles: ["removal"] }),
    ];
    const profile = extractThemeProfile([], others);

    const drawCandidate = card({ roles: ["draw"] });
    const removalCandidate = card({ roles: ["removal"] });

    const drawScore = scoreCandidate(drawCandidate, profile);
    const removalScore = scoreCandidate(removalCandidate, profile);

    expect(drawScore.roleScore).toBeGreaterThan(removalScore.roleScore);
  });

  it("gives no role-gap credit for the catch-all 'other' role", () => {
    const profile = extractThemeProfile([], [card({ roles: ["other"] })]);
    const candidate = card({ roles: ["other"] });
    expect(scoreCandidate(candidate, profile).roleScore).toBe(0);
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
    const rampScoreIn = (commanderMv: number, candidate = dork, others: Card[] = []) =>
      scoreCandidate(
        candidate,
        extractThemeProfile([card({ name: "Commander", manaValue: commanderMv })], others),
      ).rampScore;

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

    it("fades as the deck's ramp count grows", () => {
      const ramp = (n: number) =>
        Array.from({ length: n }, (_, i) => card({ name: `Ramp ${i}`, manaValue: 7, roles: ["ramp"], oracleText: tapForG }));
      expect(rampScoreIn(7, dork, ramp(3))).toBeLessThan(rampScoreIn(7, dork, ramp(1)));
      expect(rampScoreIn(7, dork, ramp(10))).toBe(0);
    });

    it("leaves ramp out of the role-gap term", () => {
      const profile = extractThemeProfile([card({ name: "Commander", manaValue: 7 })], []);
      expect(scoreCandidate(dork, profile).roleScore).toBe(0);
    });
  });
});
