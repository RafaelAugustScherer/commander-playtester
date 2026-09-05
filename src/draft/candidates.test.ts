import { describe, it, expect } from "vitest";
import { suggestCandidates, suggestCommanders } from "./candidates";
import type { DraftEngine, CardResolver, DraftDeckNames } from "./candidates";
import { extractThemeProfile } from "./themes";
import type { Card } from "../lib/types";
import type {
  BracketDeckInput,
  BracketEstimate,
  CommanderCandidateData,
  SearchCardRow,
  SearchCardsResult,
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

function row(overrides: Partial<SearchCardRow> = {}): SearchCardRow {
  return {
    name: "Row",
    oracle_id: "id",
    mana_value: 2,
    color_identity: ["G"],
    legalities: { commander: "legal" },
    ...overrides,
  };
}

function commanderData(candidate: Card): CommanderCandidateData {
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

  const rows: SearchCardRow[] = [
    row({ name: "In Identity Elf", color_identity: ["G"] }),
    row({ name: "Off Identity Elf", color_identity: ["R", "G"] }),
    row({ name: "Colorless Elf Artifact", color_identity: [] }),
    row({ name: "Banned Elf", color_identity: ["G"], legalities: { commander: "banned" } }),
    row({ name: "In Deck Elf", color_identity: ["G"] }),
    row({ name: "Shown Elf", color_identity: ["G"] }),
    row({ name: "Plain Elf", color_identity: ["G"] }),
    row({ name: "Bracket Heavy Elf", color_identity: ["G"] }),
  ];

  function makeEngine(opts?: { bracketFor?: (names: string[]) => BracketEstimate }): DraftEngine {
    return {
      searchCards: async (): Promise<SearchCardsResult> => ({
        results: rows,
        total: rows.length,
      }),
      estimateBracket: async (deck: BracketDeckInput): Promise<BracketEstimate | null> => {
        if (opts?.bracketFor) return opts.bracketFor(deck.main_deck ?? []);
        return {
          tier: "exhibition",
          axes: {},
          axis_caps_at_tier: {},
          contributing: {},
          violations: {},
          data_version: "test",
        };
      },
      commanderCandidates: async () => [],
    };
  }

  const allCards = rows.map((r) => card({ name: r.name }));
  const resolver = makeResolver(allCards);

  const deck: DraftDeckNames = { commanders: ["Commander Elf"], mainboard: ["In Deck Elf"] };

  it("keeps in-identity and colorless candidates, and filters out identity/legality/dedupe violations", async () => {
    const results = await suggestCandidates(deck, profile, {
      engine: makeEngine(),
      resolver,
      target: "focused",
      exclude: new Set(["Shown Elf"]),
    });
    const names = results.map((r) => r.card.name);

    // Kept: within the commander's color identity, or colorless (always allowed).
    expect(names).toContain("In Identity Elf");
    expect(names).toContain("Colorless Elf Artifact");

    // Filtered: outside color identity, not Commander-legal, already in the
    // deck, or already shown this round.
    expect(names).not.toContain("Off Identity Elf");
    expect(names).not.toContain("Banned Elf");
    expect(names).not.toContain("In Deck Elf");
    expect(names).not.toContain("Shown Elf");
  });

  it("sinks a candidate that would push the deck past the bracket target below an equal-fit one at target", async () => {
    const engine = makeEngine({
      bracketFor: (names) => {
        const overTarget = names.includes("Bracket Heavy Elf");
        return {
          tier: overTarget ? "cedh" : "exhibition",
          axes: {},
          axis_caps_at_tier: {},
          contributing: {},
          violations: {},
          data_version: "test",
        };
      },
    });
    const results = await suggestCandidates(deck, profile, {
      engine,
      resolver,
      target: "focused",
      exclude: new Set(["Shown Elf"]),
    });
    const plain = results.find((r) => r.card.name === "Plain Elf")!;
    const heavy = results.find((r) => r.card.name === "Bracket Heavy Elf")!;
    expect(plain.score.total).toBe(heavy.score.total); // equal theme/curve/role fit
    expect(heavy.bracketTilt).toBeLessThan(0);
    expect(heavy.total).toBeLessThan(plain.total);
    expect(results.indexOf(plain)).toBeLessThan(results.indexOf(heavy));
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
      searchCards: async (): Promise<SearchCardsResult> => ({ results: [], total: 0 }),
      estimateBracket: async (): Promise<BracketEstimate | null> => null,
      commanderCandidates: async () => commanderPool.map(commanderData),
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
      searchCards: async (): Promise<SearchCardsResult> => ({ results: [], total: 0 }),
      estimateBracket: async (): Promise<BracketEstimate | null> => null,
      commanderCandidates: async () => candidates.map(commanderData),
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
      searchCards: async () => ({ results: [], total: 0 }),
      estimateBracket: async () => null,
      commanderCandidates: async () => [broad, exact].map(commanderData),
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
      searchCards: async (): Promise<SearchCardsResult> => ({ results: [], total: 0 }),
      estimateBracket: async (): Promise<BracketEstimate | null> => null,
      commanderCandidates: async () => cards.map(commanderData),
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
