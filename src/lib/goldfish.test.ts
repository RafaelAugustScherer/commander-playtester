import { describe, it, expect } from "vitest";
import { goldfish, analyzeComposition, DEFAULT_CONFIG } from "./goldfish";
import type { Card, ResolvedDeck } from "./types";

function land(): Card {
  return {
    name: "Forest",
    manaValue: 0,
    typeLine: "Basic Land — Forest",
    oracleText: "{T}: Add {G}.",
    colors: [],
    colorIdentity: ["G"],
    producedMana: ["G"],
    roles: ["land"],
  };
}

function spell(mv: number, ramp = false): Card {
  return {
    name: ramp ? `Rock${mv}` : `Spell${mv}`,
    manaValue: mv,
    typeLine: ramp ? "Artifact" : "Creature — Bear",
    oracleText: ramp ? "{T}: Add {C}." : "Vanilla.",
    colors: [],
    colorIdentity: [],
    producedMana: ramp ? ["C"] : [],
    roles: ramp ? ["ramp"] : ["other"],
  };
}

/** Build a 99-card library: `lands` lands, some ramp, rest filler spells. */
function makeDeck(lands: number, ramp: number): ResolvedDeck {
  const library: Card[] = [];
  for (let i = 0; i < lands; i++) library.push(land());
  for (let i = 0; i < ramp; i++) library.push(spell(2, true));
  while (library.length < 99) library.push(spell((library.length % 5) + 1));
  return { commanders: [], library, unresolved: [] };
}

describe("analyzeComposition", () => {
  it("counts lands, ramp, and curve", () => {
    const deck = makeDeck(38, 10);
    const c = analyzeComposition(deck);
    expect(c.librarySize).toBe(99);
    expect(c.lands).toBe(38);
    expect(c.ramp).toBe(10);
    // Curve only counts nonland cards.
    expect(c.curve.reduce((a, b) => a + b, 0)).toBe(99 - 38);
  });
});

describe("goldfish", () => {
  it("is deterministic for a fixed seed", () => {
    const deck = makeDeck(38, 10);
    const a = goldfish(deck, { ...DEFAULT_CONFIG, iterations: 500 });
    const b = goldfish(deck, { ...DEFAULT_CONFIG, iterations: 500 });
    expect(a.avgOpeningLands).toBe(b.avgOpeningLands);
    expect(a.avgManaByTurn).toEqual(b.avgManaByTurn);
  });

  it("produces opening land counts near the hypergeometric mean", () => {
    const deck = makeDeck(38, 0);
    const result = goldfish(deck, { ...DEFAULT_CONFIG, iterations: 5000 });
    // Without mulligans the mean would be 7 * 38/99 ≈ 2.69; the mulligan
    // heuristic pulls it toward the keepable band, so expect a bit higher.
    expect(result.avgOpeningLands).toBeGreaterThan(2.4);
    expect(result.avgOpeningLands).toBeLessThan(4.0);
  });

  it("gives a land-heavy deck a higher turn-4 mana average", () => {
    const landLight = goldfish(makeDeck(30, 0), {
      ...DEFAULT_CONFIG,
      iterations: 3000,
    });
    const landHeavy = goldfish(makeDeck(42, 0), {
      ...DEFAULT_CONFIG,
      iterations: 3000,
    });
    expect(landHeavy.avgManaByTurn[3]).toBeGreaterThan(
      landLight.avgManaByTurn[3],
    );
  });

  it("ramp raises available mana versus no ramp", () => {
    const noRamp = goldfish(makeDeck(36, 0), {
      ...DEFAULT_CONFIG,
      iterations: 3000,
    });
    const withRamp = goldfish(makeDeck(36, 15), {
      ...DEFAULT_CONFIG,
      iterations: 3000,
    });
    expect(withRamp.avgManaByTurn[4]).toBeGreaterThan(noRamp.avgManaByTurn[4]);
    expect(withRamp.rampByTurn3Rate).toBeGreaterThan(0);
  });

  it("throws on an empty library", () => {
    expect(() =>
      goldfish({ commanders: [], library: [], unresolved: [] }),
    ).toThrow();
  });
});
