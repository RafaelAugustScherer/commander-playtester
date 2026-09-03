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
});
