import { describe, it, expect } from "vitest";
import { DraftSession, DraftSessionError } from "./draftSession";
import type { DraftEngine, CardResolver } from "./candidates";
import type { Card } from "../lib/types";
import { parseDecklist } from "../lib/decklist";
import type {
  DraftCandidateData,
  RankCardCandidatesInput,
  RankCardCandidatesResult,
} from "../engine/draftQueries";
import { basicLandCount, primaryType, zeroCounts, type TypeBalance } from "./typeBalance";

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

function commanderData(candidate: Card): DraftCandidateData {
  return {
    name: candidate.name,
    manaValue: candidate.manaValue,
    typeLine: candidate.typeLine,
    oracleText: candidate.oracleText,
    colorIdentity: candidate.colorIdentity,
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
    have: zeroCounts(),
    basicLands: 0,
  };
}

function emptyRanking(): RankCardCandidatesResult {
  return { candidates: [], balance: fixedBalance() };
}

interface FakeEngineOptions {
  pool?: Card[];
  known?: Card[];
  balance?: TypeBalance;
  inputs?: RankCardCandidatesInput[];
}

function makeEngine({
  pool = POOL_CARDS,
  known = [],
  balance = fixedBalance(),
  inputs = [],
}: FakeEngineOptions = {}): DraftEngine {
  const byName = new Map(
    [...BASE_CARDS, ...POOL_CARDS, ...pool, ...known].map((c) => [c.name.toLowerCase(), c]),
  );
  return {
    commanderCandidates: async () => POOL_CARDS.map(commanderData),
    rankCardCandidates: async (input) => {
      inputs.push(input);
      const available = pool.filter((c) => !input.exclude.includes(c.name.toLowerCase()));
      if (!input.slotTypes) {
        return {
          candidates: available.slice(0, 3).map((c) => ({
            name: c.name,
            bracketTilt: 0,
            slotType: primaryType(c.typeLine) ?? "creature",
          })),
          balance,
        };
      }
      const taken = new Set<string>();
      const candidates = input.slotTypes.flatMap((slotType) => {
        const match = available.find(
          (c) => primaryType(c.typeLine) === slotType && !taken.has(c.name),
        );
        if (!match) return [];
        taken.add(match.name);
        return [{ name: match.name, bracketTilt: 0, slotType }];
      });
      return { candidates, balance };
    },
    resolveCards: async (names) =>
      names.flatMap((name) => {
        const found = byName.get(name.trim().toLowerCase());
        return found ? [commanderData(found)] : [];
      }),
  };
}

function makeResolver(extra: Card[] = []): CardResolver {
  const byName = new Map(
    [...BASE_CARDS, ...POOL_CARDS, ...extra].map((c) => [c.name.toLowerCase(), c]),
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

  it("uses the updated deck and theme profile for the next round", async () => {
    const inputs: Array<Parameters<DraftEngine["rankCardCandidates"]>[0]> = [];
    const picks = ["Imperious Perfect", "Elvish Clancaller"];
    const byName = new Map(
      [...BASE_CARDS, ...POOL_CARDS].map((c) => [c.name.toLowerCase(), c]),
    );
    const engine: DraftEngine = {
      commanderCandidates: async () => POOL_CARDS.map(commanderData),
      rankCardCandidates: async (input) => {
        inputs.push(input);
        return {
          candidates: [
            { name: picks[inputs.length - 1], bracketTilt: 0, slotType: "creature" },
          ],
          balance: fixedBalance(),
        };
      },
      resolveCards: async (names) =>
        names.flatMap((name) => {
          const found = byName.get(name.trim().toLowerCase());
          return found ? [commanderData(found)] : [];
        }),
    };
    const session = new DraftSession({ engine, resolver: makeResolver() });
    await session.start(
      ["Elvish Champion", "Timberwatch Elf", "Elvish Archer"],
      "Elvish Champion",
    );
    await session.addCard(0);

    expect(inputs).toHaveLength(2);
    expect(inputs[1].mainboard).toContain("Imperious Perfect");
    const firstElfWeight = new Map(inputs[0].profile.tokenWeights).get("elf") ?? 0;
    const nextElfWeight = new Map(inputs[1].profile.tokenWeights).get("elf") ?? 0;
    expect(nextElfWeight).toBe(firstElfWeight + 1);
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

const DRAFT_BASE_NAMES = ["Elvish Champion", "Timberwatch Elf", "Elvish Archer"];

const MIXED_POOL: Card[] = [
  card({ name: "Fierce Empath", typeLine: "Creature — Elf" }),
  card({ name: "Opt", typeLine: "Instant" }),
  card({ name: "Giant Growth", typeLine: "Instant" }),
  card({ name: "Brainstorm", typeLine: "Instant" }),
  card({ name: "Rampant Growth", typeLine: "Sorcery" }),
  card({ name: "Llanowar Elves", typeLine: "Creature — Elf Druid" }),
  card({ name: "Heritage Druid", typeLine: "Creature — Elf Druid" }),
];

async function draftingSession(inputs: RankCardCandidatesInput[]): Promise<DraftSession> {
  const session = new DraftSession({
    engine: makeEngine({ pool: MIXED_POOL, inputs }),
    resolver: makeResolver(MIXED_POOL),
  });
  await session.start(DRAFT_BASE_NAMES, "Elvish Champion");
  return session;
}

describe("DraftSession type-aware refresh", () => {
  it("carries the engine's slot type onto each round candidate", async () => {
    const session = await draftingSession([]);
    expect(session.round.map((c) => [c.card.name, c.slotType])).toEqual([
      ["Fierce Empath", "creature"],
      ["Opt", "instant"],
      ["Giant Growth", "instant"],
    ]);
  });

  it("keeps the engine's type balance on the session while drafting", async () => {
    const session = await draftingSession([]);
    expect(session.balance).toEqual(fixedBalance());
  });

  it("has no type balance during commander selection", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    expect(session.balance).toBeNull();
  });

  it("replaces a slot with a candidate of the same type, requesting that type from the engine", async () => {
    const inputs: RankCardCandidatesInput[] = [];
    const session = await draftingSession(inputs);

    await session.refreshSlot(1);

    expect(session.round[1].card.name).toBe("Brainstorm");
    expect(session.round[1].slotType).toBe("instant");
    expect(inputs[inputs.length - 1].slotTypes).toEqual(["instant", "instant", "instant"]);
  });

  it("refreshes a creature slot with another creature even when other types are unshown", async () => {
    const session = await draftingSession([]);

    await session.refreshSlot(0);

    expect(session.round[0].slotType).toBe("creature");
    expect(["Llanowar Elves", "Heritage Druid"]).toContain(session.round[0].card.name);
  });

  it("leaves the slot unchanged when no unshown candidate of its type remains", async () => {
    const session = await draftingSession([]);
    await session.refreshSlot(0);
    await session.refreshSlot(1);
    const roundBefore = session.round.map((c) => c.card.name);

    await session.refreshSlot(1);

    expect(session.round.map((c) => c.card.name)).toEqual(roundBefore);
    expect(session.round[1].card.name).toBe("Brainstorm");
  });

  it("never repeats a card within the round across several refreshes of different slots", async () => {
    const session = await draftingSession([]);

    await session.refreshSlot(1);
    await session.refreshSlot(0);
    await session.refreshSlot(2);
    await session.refreshSlot(1);

    const names = session.round.map((c) => c.card.name);
    expect(new Set(names).size).toBe(names.length);
    expect(session.round.map((c) => c.slotType)).toEqual(["creature", "instant", "instant"]);
  });
});

describe("DraftSession refresh blacklist", () => {
  it("never offers a refreshed-away card again in later rounds", async () => {
    const inputs: RankCardCandidatesInput[] = [];
    const session = await draftingSession(inputs);

    await session.refreshSlot(0);
    await session.refreshSlot(1);
    const laterRounds: string[] = [];
    for (let i = 0; i < 2; i++) {
      await session.addCard(0);
      laterRounds.push(...session.round.map((c) => c.card.name));
    }

    expect(laterRounds).not.toContain("Fierce Empath");
    expect(laterRounds).not.toContain("Opt");
    expect(inputs[inputs.length - 1].exclude).toEqual(
      expect.arrayContaining(["fierce empath", "opt"]),
    );
  });

  it("does not blacklist a card that no candidate could replace", async () => {
    const inputs: RankCardCandidatesInput[] = [];
    const session = await draftingSession(inputs);
    await session.refreshSlot(0);
    await session.refreshSlot(1);
    await session.refreshSlot(1);
    expect(session.round[1].card.name).toBe("Brainstorm");

    await session.addCard(0);

    expect(inputs[inputs.length - 1].exclude).not.toContain("brainstorm");
  });

  it("keeps a commander refreshed away out of the drafting rounds", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);
    await session.refreshSlot(1);
    await session.pickCommander("Elvish Champion");

    expect(session.round.map((c) => c.card.name)).not.toContain("Marwyn, the Nurturer");
  });
});

describe("DraftSession basic lands", () => {
  const simicCommander = card({
    name: "Simic Commander",
    typeLine: "Legendary Creature — Merfolk",
    colorIdentity: ["G", "U"],
  });
  const greenOne = card({ name: "Green One", colorIdentity: ["G"] });
  const greenTwo = card({ name: "Green Two", colorIdentity: ["G"] });
  const greenThree = card({ name: "Green Three", colorIdentity: ["G"] });
  const blueOne = card({ name: "Blue One", colorIdentity: ["U"] });

  async function monoGreenSession(
    balance: TypeBalance,
    inputs: RankCardCandidatesInput[] = [],
  ): Promise<DraftSession> {
    const session = new DraftSession({
      engine: makeEngine({ balance, inputs }),
      resolver: makeResolver(),
    });
    await session.start(DRAFT_BASE_NAMES, "Elvish Champion");
    return session;
  }

  function quantityOf(session: DraftSession, name: string): number {
    return session.mainboard
      .filter((e) => e.name.toLowerCase() === name.toLowerCase())
      .reduce((sum, e) => sum + e.quantity, 0);
  }

  it("sums quantities across commanders and mainboard in cardCount", async () => {
    const session = await monoGreenSession(fixedBalance());
    expect(session.cardCount()).toBe(3);

    session.mainboard.push({ quantity: 4, name: "Forest" });

    expect(session.cardCount()).toBe(7);
  });

  it("expands mainboard entries by quantity in mainboardNames", async () => {
    const session = await monoGreenSession(fixedBalance());
    session.mainboard.push({ quantity: 3, name: "Forest" });

    const names = session.mainboardNames();

    expect(names.filter((n) => n === "Forest")).toHaveLength(3);
    expect(names).toHaveLength(5);
  });

  it("adds basics matching the planned count for the deck's single colour", async () => {
    const balance = fixedBalance();
    const session = await monoGreenSession(balance);
    const planned = basicLandCount(balance, 100 - session.cardCount());

    await session.fillBasicLands();

    expect(planned).toBe(24);
    expect(session.mainboard).toContainEqual({ quantity: planned, name: "Forest" });
    expect(session.cardCount()).toBe(3 + planned);
  });

  it("counts drafted nonbasic lands against the planned basics", async () => {
    const balance = { ...fixedBalance(), have: { ...zeroCounts(), land: 15 } };
    const session = await monoGreenSession(balance);

    await session.fillBasicLands();

    expect(quantityOf(session, "Forest")).toBe(36 - 15);
  });

  it("never plans more basics than the open deck slots", async () => {
    const session = await monoGreenSession(fixedBalance());
    session.mainboard.push({ quantity: 85, name: "Filler Card" });

    await session.fillBasicLands();

    expect(quantityOf(session, "Forest")).toBe(12);
    expect(session.cardCount()).toBe(100);
  });

  it("splits basics across the deck's colours in proportion to their cards", async () => {
    const session = new DraftSession({
      engine: makeEngine({
        known: [simicCommander, greenOne, greenTwo, greenThree, blueOne],
      }),
      resolver: makeResolver([simicCommander, greenOne, greenTwo, greenThree, blueOne]),
    });
    await session.start(
      [simicCommander, greenOne, greenTwo, greenThree, blueOne].map((c) => c.name),
      simicCommander.name,
    );

    await session.fillBasicLands();

    expect(session.mainboard.filter((e) => ["Forest", "Island"].includes(e.name))).toEqual([
      { quantity: 17, name: "Forest" },
      { quantity: 7, name: "Island" },
    ]);
  });

  it("replaces earlier basics on a re-run instead of stacking them", async () => {
    const session = await monoGreenSession(fixedBalance());
    await session.fillBasicLands();
    expect(quantityOf(session, "Forest")).toBe(24);

    session.balance = { ...fixedBalance(), target: { ...fixedBalance().target, land: 30 } };
    await session.fillBasicLands();

    expect(session.mainboard.filter((e) => e.name === "Forest")).toEqual([
      { quantity: 18, name: "Forest" },
    ]);
    expect(session.cardCount()).toBe(3 + 18);
  });

  it("removes a hand-added basic before adding the planned ones", async () => {
    const session = await monoGreenSession(fixedBalance());
    session.mainboard.push({ quantity: 5, name: "forest" });

    await session.fillBasicLands();

    expect(quantityOf(session, "Forest")).toBe(24);
    expect(session.mainboard.filter((e) => e.name.toLowerCase() === "forest")).toHaveLength(1);
  });

  it("sends the expanded mainboard, basics included, to the engine on the next round", async () => {
    const inputs: RankCardCandidatesInput[] = [];
    const session = await monoGreenSession(fixedBalance(), inputs);

    await session.fillBasicLands();

    const lastInput = inputs[inputs.length - 1];
    expect(lastInput.mainboard.filter((n) => n === "Forest")).toHaveLength(24);
    expect(lastInput.mainboard).toHaveLength(2 + 24);
  });

  it("throws not-in-drafting during commander selection", async () => {
    const session = makeSession();
    await session.start(BASE_NAMES, null);

    await expect(session.fillBasicLands()).rejects.toMatchObject({
      name: "DraftSessionError",
      kind: "not-in-drafting",
    });
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

  function makeBgEngine(cards: Card[]): DraftEngine {
    const byName = new Map(
      [background, partnerCommander, otherGreenCard, thirdGreenCard, ...cards].map((c) => [
        c.name.toLowerCase(),
        c,
      ]),
    );
    return {
      commanderCandidates: async () => cards.map(commanderData),
      rankCardCandidates: async () => emptyRanking(),
      resolveCards: async (names) =>
        names.flatMap((name) => {
          const found = byName.get(name.trim().toLowerCase());
          return found ? [commanderData(found)] : [];
        }),
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
      engine: makeBgEngine([]),
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
    const session = new DraftSession({
      engine: makeBgEngine(pool),
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

describe("DraftSession base card color identity", () => {
  it("commander-selection uses the engine's color identity, not the resolver's", async () => {
    const baseCardNames = ["Sylvan Base", "Aquatic Base", "Neutral Base"];
    const engineIdentities: Record<string, string[]> = {
      "sylvan base": ["G"],
      "aquatic base": ["U"],
      "neutral base": [],
    };

    const simicCommander = card({
      name: "Simic Commander",
      typeLine: "Legendary Creature — Merfolk",
      colorIdentity: ["G", "U"],
    });
    const monoGreenCommander = card({
      name: "Mono Green Commander",
      typeLine: "Legendary Creature — Elf",
      colorIdentity: ["G"],
    });
    const selesnyaCommander = card({
      name: "Selesnya Commander",
      typeLine: "Legendary Creature — Human",
      colorIdentity: ["G", "W"],
    });
    const commanderPool = [simicCommander, monoGreenCommander, selesnyaCommander];

    const engine: DraftEngine = {
      commanderCandidates: async () => commanderPool.map(commanderData),
      rankCardCandidates: async () => emptyRanking(),
      resolveCards: async (names) =>
        names.flatMap((name) => {
          const identity = engineIdentities[name.trim().toLowerCase()];
          return identity
            ? [
                {
                  name,
                  manaValue: 2,
                  typeLine: "Creature — Bear",
                  oracleText: "",
                  colorIdentity: identity,
                },
              ]
            : [];
        }),
    };

    // Stands in for Scryfall resolving the base cards with empty color identity.
    const commanderByName = new Map(commanderPool.map((c) => [c.name.toLowerCase(), c]));
    const resolver: CardResolver = {
      resolve: async (names) => {
        const out = new Map<string, Card>();
        for (const name of names) {
          const key = name.trim().toLowerCase();
          const commanderCard = commanderByName.get(key);
          if (commanderCard) {
            out.set(key, commanderCard);
          } else if (key in engineIdentities) {
            out.set(key, card({ name, colorIdentity: [] }));
          }
        }
        return out;
      },
    };

    const session = new DraftSession({ engine, resolver });
    await session.start(baseCardNames, null);

    expect(session.phase).toBe("commander-selection");
    const names = session.round.map((c) => c.card.name);
    expect(names).toContain("Simic Commander");
    expect(names).not.toContain("Mono Green Commander");
    expect(names).not.toContain("Selesnya Commander");
  });
});
