import { describe, it, expect } from "vitest";
import { DEFAULT_CUSTOMIZATION } from "./customization";
import { suggestCandidates, suggestCommanders } from "./candidates";
import type { DraftEngine, CardResolver, DraftDeckNames } from "./candidates";
import { extractThemeProfile } from "./themes";
import type { Card } from "../lib/types";
import type {
  DraftCandidateData,
  RankCardCandidatesInput,
  RankCardCandidatesResult,
} from "../engine/draftQueries";
import { zeroCounts, type DraftCardType, type TypeBalance } from "./typeBalance";

function fixedBalance(): TypeBalance {
  return {
    target: {
      land: 36,
      creature: 30,
      instant: 10,
      sorcery: 8,
      artifact: 8,
      enchantment: 6,
      planeswalker: 1,
    },
    nonbasicLandTarget: 12,
    have: { ...zeroCounts(), creature: 2 },
    basicLands: 0,
  };
}

function ranking(
  names: Array<{ name: string; bracketTilt?: number; slotType?: DraftCardType }>,
): RankCardCandidatesResult {
  return {
    candidates: names.map(({ name, bracketTilt = 0, slotType = "creature" }) => ({
      name,
      bracketTilt,
      slotType,
    })),
    balance: fixedBalance(),
  };
}

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
        return ranking(selected);
      },
      resolveCards: async () => [],
    };
    const { candidates: results } = await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
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
      rankCardCandidates: async () =>
        ranking([
          { name: "In Identity Elf", bracketTilt: 0 },
          { name: "Bracket Heavy Elf", bracketTilt: -4 },
        ]),
      resolveCards: async () => [],
    };
    const { candidates: results } = await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
      target: "focused",
    });
    const plain = results.find((r) => r.card.name === "In Identity Elf")!;
    const heavy = results.find((r) => r.card.name === "Bracket Heavy Elf")!;
    expect(heavy.bracketTilt).toBe(-4);
    expect(heavy.total).toBe(heavy.score.total - 4);
    expect(plain.total).toBe(plain.score.total);
  });

  it("passes the requested slot types through to the engine input", async () => {
    const rankedInputs: RankCardCandidatesInput[] = [];
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async (input) => {
        rankedInputs.push(input);
        return ranking([]);
      },
      resolveCards: async () => [],
    };
    await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
      target: "focused",
      slotTypes: ["instant", "land", "creature"],
    });
    expect(rankedInputs[0].slotTypes).toEqual(["instant", "land", "creature"]);
  });

  it("leaves slot types undefined in the engine input when none are requested", async () => {
    const rankedInputs: RankCardCandidatesInput[] = [];
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async (input) => {
        rankedInputs.push(input);
        return ranking([]);
      },
      resolveCards: async () => [],
    };
    await suggestCandidates(deck, profile, {
      engine,
      resolver,
      target: "focused",
      customization: DEFAULT_CUSTOMIZATION,
    });
    expect(rankedInputs[0].slotTypes).toBeUndefined();
  });

  it("carries each engine slot type onto the matching resolved candidate", async () => {
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async () =>
        ranking([
          { name: "In Identity Elf", slotType: "instant" },
          { name: "Colorless Elf Artifact", slotType: "artifact" },
          { name: "Bracket Heavy Elf", slotType: "land" },
        ]),
      resolveCards: async () => [],
    };
    const { candidates } = await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
      target: "focused",
    });
    expect(candidates.map((c) => [c.card.name, c.slotType])).toEqual([
      ["In Identity Elf", "instant"],
      ["Colorless Elf Artifact", "artifact"],
      ["Bracket Heavy Elf", "land"],
    ]);
  });

  it("returns the engine's type balance alongside the candidates", async () => {
    const balance = fixedBalance();
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async () => ({ candidates: [], balance }),
      resolveCards: async () => [],
    };
    const round = await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
      target: "focused",
    });
    expect(round.balance).toBe(balance);
    expect(round.candidates).toEqual([]);
  });

  it("drops engine names the resolver cannot find without disturbing the others", async () => {
    const engine: DraftEngine = {
      commanderCandidates: async () => [],
      rankCardCandidates: async () =>
        ranking([
          { name: "Unknown Card", slotType: "sorcery" },
          { name: "In Identity Elf", slotType: "creature" },
        ]),
      resolveCards: async () => [],
    };
    const { candidates } = await suggestCandidates(deck, profile, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
      target: "focused",
    });
    expect(candidates.map((c) => c.card.name)).toEqual(["In Identity Elf"]);
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
      rankCardCandidates: async () => ranking([]),
      resolveCards: async () => [],
    };
  }

  const resolver = makeResolver([...baseCards, ...commanderPool]);

  it("offers candidates from the engine's legal commander pool", async () => {
    const results = await suggestCommanders(baseCards, {
      engine: makeEngine(),
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
    });
    expect(results.map((r) => r.card.name)).toContain("Eligible Elf Lord");
  });

  it("never offers one of the base cards as a commander candidate", async () => {
    const results = await suggestCommanders(baseCards, {
      engine: makeEngine(),
      customization: DEFAULT_CUSTOMIZATION,
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
      rankCardCandidates: async () => ranking([]),
      resolveCards: async () => [],
    };
    const results = await suggestCommanders(baseCards, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
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
      rankCardCandidates: async () => ranking([]),
      resolveCards: async () => [],
    };
    const results = await suggestCommanders([...baseCards, blueBase], {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver: makeResolver([broad, exact]),
    });
    expect(results.map(({ card }) => card.name)).toEqual([
      "Exact Simic Elf",
      "Five Color Elf",
    ]);
  });
  it("leaves out planeswalker and dungeon commanders unless they are turned on", async () => {
    const pool = [
      card({ name: "Plain Elf Lord", typeLine: "Legendary Creature — Elf" }),
      card({ name: "Walker Commander", typeLine: "Legendary Planeswalker — Elf" }),
      card({
        name: "Dungeon Delver",
        typeLine: "Legendary Creature — Elf",
        oracleText: "When this creature enters, venture into the dungeon.",
      }),
    ];
    const engine: DraftEngine = {
      commanderCandidates: async () => pool.map(commanderData),
      rankCardCandidates: async () => ranking([]),
      resolveCards: async () => [],
    };
    const poolResolver = makeResolver([...baseCards, ...pool]);

    const byDefault = await suggestCommanders(baseCards, {
      engine,
      customization: DEFAULT_CUSTOMIZATION,
      resolver: poolResolver,
    });
    const allowed = await suggestCommanders(baseCards, {
      engine,
      customization: { planeswalkers: true, dungeons: true },
      resolver: poolResolver,
    });

    expect(byDefault.map((r) => r.card.name)).toEqual(["Plain Elf Lord"]);
    expect(allowed.map((r) => r.card.name).sort()).toEqual([
      "Dungeon Delver",
      "Plain Elf Lord",
      "Walker Commander",
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
      rankCardCandidates: async () => ranking([]),
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
      customization: DEFAULT_CUSTOMIZATION,
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
      customization: DEFAULT_CUSTOMIZATION,
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
      customization: DEFAULT_CUSTOMIZATION,
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
      customization: DEFAULT_CUSTOMIZATION,
      resolver,
    });
    expect(results.map((r) => r.card.name)).not.toContain("Plain Green Commander");
  });
});
