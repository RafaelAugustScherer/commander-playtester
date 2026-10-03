import { describe, it, expect } from "vitest";
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
      card({ roles: ["ramp"] }),
      card({ roles: ["ramp"] }),
      card({ roles: ["ramp"] }),
    ];
    const profile = extractThemeProfile([], others);

    const drawCandidate = card({ roles: ["draw"] });
    const rampCandidate = card({ roles: ["ramp"] });

    const drawScore = scoreCandidate(drawCandidate, profile);
    const rampScore = scoreCandidate(rampCandidate, profile);

    expect(drawScore.roleScore).toBeGreaterThan(rampScore.roleScore);
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
});
