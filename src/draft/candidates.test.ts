import { describe, it, expect } from "vitest";
import { suggestCandidates, suggestCommanders } from "./candidates";
import type { DraftEngine, CardResolver, DraftDeckNames } from "./candidates";
import { extractThemeProfile } from "./themes";
import type { Card } from "../lib/types";
import type {
  DraftCandidateData,
  RankCardCandidatesInput,
} from "../engine/draftQueries";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Creature — Elf",
    oracleText: "",
    colors: ["G"],
    colorIdentity: ["G"],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

function commanderData(candidate: Card): DraftCandidateData {
  return {
    name: candidate.name,
    manaValue: candidate.manaValue,
    typeLine: candidate.typeLine,
    oracleText: candidate.oracleText,
    colorIdentity: candidate.colorIdentity,
  };
}

function makeResolver(cards: Card[]): CardResolver {
  const byName = new Map(cards.map((c) => [c.name.toLowerCase(), c]));
  return {
    resolve: async (names) => {
      const out = new Map<string, Card>();
      for (const name of names) {
        const found = byName.get(name.toLowerCase());
        if (found) out.set(name.toLowerCase(), found);
      }
      return out;
    },
  };
}

describe("suggestCandidates", () => {
  const commander = card({ name: "Commander Elf", typeLine: "Legendary Creature — Elf" });
  const profile = extractThemeProfile([commander], []);
  const selected = [
    card({ name: "In Identity Elf" }),
    card({ name: "Colorless Elf Artifact", colorIdentity: [] }),
    card({ name: "Bracket Heavy Elf" }),
  ];
  const resolver = makeResolver(selected);
  const deck: DraftDeckNames = { commanders: ["Commander Elf"], mainboard: ["In Deck Elf"] };

  it("resolves only the three names selected by local ranking", async () => {
    const rankedInputs: RankCardCandidatesInput[] = [];
    let resolvedNames: string[] = [];
    const baseResolver = makeResolver(selected);
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async (input) => {
        rankedInputs.push(input);
        return selected.map(({ name }) => ({ name, bracketTilt: 0 }));
      },
      resolveCards: async () => [],
    };
    const results = await suggestCandidates(deck, profile, {
      engine,
      resolver: {
        resolve: async (names) => {
          resolvedNames = names;
          return baseResolver.resolve(names);
        },
      },
      target: "focused",
      exclude: new Set(["Shown Elf"]),
    });
    expect(results).toHaveLength(3);
    expect(resolvedNames).toEqual(selected.map(({ name }) => name));
    expect(rankedInputs[0].exclude).toEqual(
      expect.arrayContaining(["commander elf", "in deck elf", "shown elf"]),
    );
    expect(rankedInputs[0].profile.tokenWeights).toEqual([...profile.tokenWeights]);
  });

  it("includes the locally computed bracket tilt in the displayed total", async () => {
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async () => [
        { name: "In Identity Elf", bracketTilt: 0 },
        { name: "Bracket Heavy Elf", bracketTilt: -4 },
      ],
      resolveCards: async () => [],
    };
    const results = await suggestCandidates(deck, profile, {
      engine,
      resolver,
      target: "focused",
    });
    const plain = results.find((r) => r.card.name === "In Identity Elf")!;
    const heavy = results.find((r) => r.card.name === "Bracket Heavy Elf")!;
    expect(heavy.bracketTilt).toBe(-4);
    expect(heavy.total).toBe(heavy.score.total - 4);
    expect(plain.total).toBe(plain.score.total);
  });
});

describe("suggestCommanders", () => {
  const baseCards = [
    card({ name: "Base Elf One" }),
    card({ name: "Base Elf Two" }),
    card({ name: "Base Elf Three" }),
  ];

  const commanderPool = [
    card({ name: "Eligible Elf Lord", typeLine: "Legendary Creature — Elf" }),
    card({ name: "Base Elf One", typeLine: "Legendary Creature — Elf" }),
  ];

  function makeEngine(): DraftEngine {
    return {
      commanderCandidates: async () => commanderPool.map(commanderData),
      rankCardCandidates: async () => [],
      resolveCards: async () => [],
    };
  }

  const resolver = makeResolver([...baseCards, ...commanderPool]);

  it("offers candidates from the engine's legal commander pool", async () => {
    const results = await suggestCommanders(baseCards, {
      engine: makeEngine(),
      resolver,
    });
    expect(results.map((r) => r.card.name)).toContain("Eligible Elf Lord");
  });

  it("never offers one of the base cards as a commander candidate", async () => {
    const results = await suggestCommanders(baseCards, {
      engine: makeEngine(),
      resolver,
    });
    expect(results.map((r) => r.card.name)).not.toContain("Base Elf One");
  });

  it("ranks the full local pool and resolves only the top three cards", async () => {
    const candidates = [
      card({ name: "Alpha Elf", typeLine: "Legendary Creature — Elf" }),
      card({ name: "Beta Elf", typeLine: "Legendary Creature — Elf" }),
      card({ name: "Gamma Elf", typeLine: "Legendary Creature — Elf" }),
      card({ name: "Delta Elf", typeLine: "Legendary Creature — Elf" }),
    ];
    let resolvedNames: string[] = [];
    const cardResolver = makeResolver([...baseCards, ...candidates]);
    const engine: DraftEngine = {
      commanderCandidates: async () => candidates.map(commanderData),
      rankCardCandidates: async () => [],
      resolveCards: async () => [],
    };
    const results = await suggestCommanders(baseCards, {
      engine,
      resolver: {
        resolve: async (names) => {
          resolvedNames = names;
          return cardResolver.resolve(names);
        },
      },
    });

    expect(results).toHaveLength(3);
    expect(resolvedNames).toHaveLength(3);
    expect(resolvedNames).toEqual(results.map((candidate) => candidate.card.name));
  });

  it("prefers a tighter color identity when synergy scores are equal", async () => {
    const exact = card({
      name: "Exact Simic Elf",
      typeLine: "Legendary Creature — Elf",
      colorIdentity: ["G", "U"],
    });
    const broad = card({
      name: "Five Color Elf",
      typeLine: "Legendary Creature — Elf",
      colorIdentity: ["W", "U", "B", "R", "G"],
    });
    const blueBase = card({ name: "Blue Base", colorIdentity: ["U"] });
    const engine: DraftEngine = {
      commanderCandidates: async () => [broad, exact].map(commanderData),
      rankCardCandidates: async () => [],
      resolveCards: async () => [],
    };
    const results = await suggestCommanders([...baseCards, blueBase], {
      engine,
      resolver: makeResolver([broad, exact]),
    });
    expect(results.map(({ card }) => card.name)).toEqual([
      "Exact Simic Elf",
      "Five Color Elf",
    ]);
  });
});

describe("suggestCommanders color identity coverage", () => {
  // Union of the base cards' color identities: green + blue.
  const greenCard = card({ name: "Green Base Card", colorIdentity: ["G"] });
  const blueCard = card({ name: "Blue Base Card", colorIdentity: ["U"] });
  const blueBackground = card({
    name: "Blue Background",
    typeLine: "Legendary Enchantment — Background",
    colorIdentity: ["U"],
  });

  function makeEngine(cards: Card[]): DraftEngine {
    return {
      commanderCandidates: async () => cards.map(commanderData),
      rankCardCandidates: async () => [],
      resolveCards: async () => [],
    };
  }

  it("excludes a candidate whose color identity doesn't cover the base cards", async () => {
    const baseCards = [greenCard, blueCard];
    const offColor = card({
      name: "Mono Black Legendary",
      typeLine: "Legendary Creature — Zombie",
      colorIdentity: ["B"],
    });
    const covering = card({
      name: "Simic Legendary",
      typeLine: "Legendary Creature — Merfolk",
      colorIdentity: ["G", "U"],
    });
    const resolver = makeResolver([...baseCards, offColor, covering]);

    const results = await suggestCommanders(baseCards, {
      engine: makeEngine([offColor, covering]),
      resolver,
    });
    const names = results.map((r) => r.card.name);
    expect(names).toContain("Simic Legendary");
    expect(names).not.toContain("Mono Black Legendary");
  });

  it("includes a Choose-a-Background candidate when candidate + Background union covers the base cards", async () => {
    const baseCards = [greenCard, blueBackground];
    const partnerCommander = card({
      name: "Green Choose-a-Background Commander",
      typeLine: "Legendary Creature — Human",
      colorIdentity: ["G"],
      oracleText: "Choose a Background (You can have a Background as a second commander.)",
    });
    const resolver = makeResolver([...baseCards, partnerCommander]);

    const results = await suggestCommanders(baseCards, {
      engine: makeEngine([partnerCommander]),
      resolver,
    });
    expect(results.map((r) => r.card.name)).toContain("Green Choose-a-Background Commander");
  });

  it("excludes a Choose-a-Background candidate when even the union with the Background doesn't cover", async () => {
    const baseCards = [greenCard, blueBackground];
    const offColorPartner = card({
      name: "Black Choose-a-Background Commander",
      typeLine: "Legendary Creature — Zombie",
      colorIdentity: ["B"],
      oracleText: "Choose a Background (You can have a Background as a second commander.)",
    });
    const resolver = makeResolver([...baseCards, offColorPartner]);

    const results = await suggestCommanders(baseCards, {
      engine: makeEngine([offColorPartner]),
      resolver,
    });
    expect(results.map((r) => r.card.name)).not.toContain(
      "Black Choose-a-Background Commander",
    );
  });

  it("excludes a legendary lacking Choose a Background even when a Background base card is present", async () => {
    const baseCards = [greenCard, blueBackground];
    const plainGreenCommander = card({
      name: "Plain Green Commander",
      typeLine: "Legendary Creature — Elf",
      colorIdentity: ["G"],
    });
    const resolver = makeResolver([...baseCards, plainGreenCommander]);

    const results = await suggestCommanders(baseCards, {
      engine: makeEngine([plainGreenCommander]),
      resolver,
    });
    expect(results.map((r) => r.card.name)).not.toContain("Plain Green Commander");
  });
});
