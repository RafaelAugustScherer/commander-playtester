import { describe, it, expect } from "vitest";
import { DraftSession, DraftSessionError } from "./draftSession";
import type { DraftEngine, CardResolver } from "./candidates";
import type { Card } from "../lib/types";
import { parseDecklist } from "../lib/decklist";
import type {
  BracketEstimate,
  SearchCardRow,
  SearchCardsResult,
} from "../engine/draftQueries";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 3,
    typeLine: "Creature — Bear",
    oracleText: "",
    colors: ["G"],
    colorIdentity: ["G"],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

function row(name: string, colorIdentity: string[] = ["G"]): SearchCardRow {
  return {
    name,
    oracle_id: name,
    mana_value: 3,
    color_identity: colorIdentity,
    legalities: { commander: "legal" },
  };
}

// A small deterministic elf-tribal card pool the fake engine/resolver share.
const BASE_CARDS: Card[] = [
  card({ name: "Timberwatch Elf", typeLine: "Creature — Elf", manaValue: 2 }),
  card({ name: "Elvish Archer", typeLine: "Creature — Elf", manaValue: 2 }),
  card({ name: "Wellwisher", typeLine: "Creature — Elf", manaValue: 1 }),
];

// Ordered so ties in score break predictably (stable sort preserves this order).
const POOL_CARDS: Card[] = [
  card({ name: "Elvish Champion", typeLine: "Legendary Creature — Elf" }),
  card({ name: "Marwyn, the Nurturer", typeLine: "Legendary Creature — Elf Druid" }),
  card({ name: "Imperious Perfect", typeLine: "Legendary Creature — Elf Warrior" }),
  card({ name: "Elvish Clancaller", typeLine: "Legendary Creature — Elf" }),
  card({ name: "Craterhoof Behemoth", typeLine: "Legendary Creature — Elemental" }),
];

const POOL_ROWS: SearchCardRow[] = POOL_CARDS.map((c) => row(c.name));
const ELIGIBLE_COMMANDERS = new Set(POOL_CARDS.map((c) => c.name));

function makeEngine(): DraftEngine {
  return {
    searchCards: async (): Promise<SearchCardsResult> => ({
      results: POOL_ROWS,
      total: POOL_ROWS.length,
    }),
    estimateBracket: async (): Promise<BracketEstimate | null> => ({
      tier: "exhibition",
      axes: {},
      axis_caps_at_tier: {},
      contributing: {},
      violations: {},
      data_version: "test",
    }),
    isCommanderEligible: async (name: string) => ELIGIBLE_COMMANDERS.has(name),
    commanderCandidates: async () => POOL_ROWS,
  };
}

function makeResolver(): CardResolver {
  const byName = new Map(
    [...BASE_CARDS, ...POOL_CARDS].map((c) => [c.name.toLowerCase(), c]),
  );
  return {
    resolve: async (names) => {
      const out = new Map<string, Card>();
      for (const name of names) {
        const found = byName.get(name.trim().toLowerCase());
        if (found) out.set(name.trim().toLowerCase(), found);
      }
      return out;
    },
  };
}

function makeSession(): DraftSession {
  return new DraftSession({ engine: makeEngine(), resolver: makeResolver() });
}

const BASE_NAMES = BASE_CARDS.map((c) => c.name);

describe("DraftSession", () => {
  it("refuses fewer than three base cards", async () => {
    const session = makeSession();
    await expect(
      session.start(["Timberwatch Elf", "Elvish Archer"], null),
    ).rejects.toThrow(DraftSessionError);
  });

  it("opens with the base cards in the deck when a commander is flagged", async () => {
    const session = makeSession();
    await session.start(
      ["Marwyn, the Nurturer", "Timberwatch Elf", "Elvish Archer"],
      "Marwyn, the Nurturer",
    );

    expect(session.phase).toBe("drafting");
    expect(session.commander?.name).toBe("Marwyn, the Nurturer");
    expect(session.commanders).toEqual([{ quantity: 1, name: "Marwyn, the Nurturer" }]);
    expect(session.mainboard.map((e) => e.name).sort()).toEqual(
      ["Elvish Archer", "Timberwatch Elf"].sort(),
    );
    expect(session.profile.colorIdentity).toEqual(["G"]);
  });

  it("offers commander-eligible candidates first when no base card is flagged", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);

    expect(session.phase).toBe("commander-selection");
    expect(session.round.length).toBeLessThanOrEqual(3);
    expect(session.round.map((c) => c.card.name)).toEqual([
      "Elvish Champion",
      "Marwyn, the Nurturer",
      "Imperious Perfect",
    ]);
  });

  it("picking a commander fixes color identity and opens the drafting round", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    await session.pickCommander("Elvish Champion");

    expect(session.phase).toBe("drafting");
    expect(session.commander?.name).toBe("Elvish Champion");
    expect(session.commanders).toEqual([{ quantity: 1, name: "Elvish Champion" }]);
    expect(session.profile.colorIdentity).toEqual(["G"]);
    expect(session.round.length).toBeGreaterThan(0);
    expect(session.round.length).toBeLessThanOrEqual(3);
    // Base cards stay in the deck; the drafting round never re-offers the commander.
    expect(session.round.map((c) => c.card.name)).not.toContain("Elvish Champion");
  });

  it("a round never shows more than three cards", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    expect(session.round.length).toBeLessThanOrEqual(3);

    await session.pickCommander("Elvish Champion");
    expect(session.round.length).toBeLessThanOrEqual(3);
  });

  it("refresh replaces a slot with the closest unshown candidate and never repeats within the round", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    // round = [Champion, Marwyn{elf,druid}, Imperious]; unshown pool = [Clancaller{elf}, Craterhoof{elemental}]

    await session.refreshSlot(1);
    // Clancaller shares "elf" with Marwyn; Craterhoof shares nothing — Clancaller is closer.
    expect(session.round[1].card.name).toBe("Elvish Clancaller");
    expect(session.round.map((c) => c.card.name)).toEqual([
      "Elvish Champion",
      "Elvish Clancaller",
      "Imperious Perfect",
    ]);

    await session.refreshSlot(1);
    // Only Craterhoof is left unshown.
    expect(session.round[1].card.name).toBe("Craterhoof Behemoth");

    const names = session.round.map((c) => c.card.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain("Marwyn, the Nurturer");
  });

  it("addCard ends the round and opens a fresh one where a previously shown card may recur", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    await session.pickCommander("Elvish Champion");
    const roundBefore = session.round.map((c) => c.card.name);

    await session.addCard(0);

    expect(session.mainboard.map((e) => e.name)).toContain(roundBefore[0]);
    expect(session.round.length).toBeGreaterThan(0);
    // A card offered in the previous round but not picked can reappear now.
    const stillAvailable = roundBefore.slice(1);
    expect(session.round.some((c) => stillAvailable.includes(c.card.name))).toBe(true);
  });

  it("setBracketTarget updates the target used for subsequent rounds", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    session.setBracketTarget("cedh");
    expect(session.target).toBe("cedh");
  });

  it("exportText round-trips through the decklist parser", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    await session.pickCommander("Elvish Champion");
    await session.addCard(0);

    const text = session.exportText();
    const parsed = parseDecklist(text);

    expect(parsed.commanders).toEqual(session.commanders);
    expect(parsed.mainboard.map((e) => e.name).sort()).toEqual(
      session.mainboard.map((e) => e.name).sort(),
    );
  });

  it("toSavedDeck builds a partial deck without enforcing 100 cards", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    await session.pickCommander("Elvish Champion");

    const deck = session.toSavedDeck("My Elf Draft");
    expect(deck.name).toBe("My Elf Draft");
    expect(deck.commanders).toEqual(session.commanders);
    expect(deck.mainboard).toEqual(session.mainboard);
    expect(typeof deck.id).toBe("string");
  });
});

describe("DraftSession Choose-a-Background pairing", () => {
  const background = card({
    name: "Blue Background",
    typeLine: "Legendary Enchantment — Background",
    colorIdentity: ["U"],
  });
  const partnerCommander = card({
    name: "Green Choose-a-Background Commander",
    typeLine: "Legendary Creature — Human",
    colorIdentity: ["G"],
    oracleText: "Choose a Background (You can have a Background as a second commander.)",
  });
  const otherGreenCard = card({ name: "Other Green Card", colorIdentity: ["G"] });
  const thirdGreenCard = card({ name: "Third Green Card", colorIdentity: ["G"] });

  function makeBgEngine(rows: SearchCardRow[], eligible: Set<string>): DraftEngine {
    return {
      searchCards: async (): Promise<SearchCardsResult> => ({ results: rows, total: rows.length }),
      estimateBracket: async (): Promise<BracketEstimate | null> => ({
        tier: "exhibition",
        axes: {},
        axis_caps_at_tier: {},
        contributing: {},
        violations: {},
        data_version: "test",
      }),
      isCommanderEligible: async (name: string) => eligible.has(name),
      commanderCandidates: async () => rows,
    };
  }

  function makeBgResolver(cards: Card[]): CardResolver {
    const byName = new Map(cards.map((c) => [c.name.toLowerCase(), c]));
    return {
      resolve: async (names) => {
        const out = new Map<string, Card>();
        for (const name of names) {
          const found = byName.get(name.trim().toLowerCase());
          if (found) out.set(name.trim().toLowerCase(), found);
        }
        return out;
      },
    };
  }

  it("start() pairs a flagged Choose-a-Background commander with the base cards' Background", async () => {
    const baseCards = [partnerCommander, background, otherGreenCard];
    const session = new DraftSession({
      engine: makeBgEngine([], new Set()),
      resolver: makeBgResolver(baseCards),
    });

    await session.start(
      baseCards.map((c) => c.name),
      partnerCommander.name,
    );

    expect(session.phase).toBe("drafting");
    expect(session.commander?.name).toBe(partnerCommander.name);
    expect(session.background?.name).toBe(background.name);
    expect(session.commanders.map((e) => e.name).sort()).toEqual(
      [partnerCommander.name, background.name].sort(),
    );
    // The Background is a commander now, not a mainboard card.
    expect(session.mainboard.map((e) => e.name)).toEqual([otherGreenCard.name]);
    expect(session.profile.colorIdentity).toEqual(["G", "U"]);
  });

  it("pickCommander() pairs a picked Choose-a-Background commander with the base cards' Background", async () => {
    const baseCards = [background, otherGreenCard, thirdGreenCard];
    const pool = [partnerCommander];
    const rows = pool.map((c) => row(c.name, c.colorIdentity));
    const session = new DraftSession({
      engine: makeBgEngine(
        rows,
        new Set(pool.map((c) => c.name)),
      ),
      resolver: makeBgResolver([...baseCards, ...pool]),
    });

    await session.start(
      baseCards.map((c) => c.name),
      null,
    );
    expect(session.phase).toBe("commander-selection");
    expect(session.round.map((c) => c.card.name)).toContain(partnerCommander.name);

    await session.pickCommander(partnerCommander.name);

    expect(session.phase).toBe("drafting");
    expect(session.commander?.name).toBe(partnerCommander.name);
    expect(session.background?.name).toBe(background.name);
    expect(session.commanders.map((e) => e.name).sort()).toEqual(
      [partnerCommander.name, background.name].sort(),
    );
    expect(session.mainboard.map((e) => e.name).sort()).toEqual(
      [otherGreenCard.name, thirdGreenCard.name].sort(),
    );
    expect(session.profile.colorIdentity).toEqual(["G", "U"]);
  });
});
