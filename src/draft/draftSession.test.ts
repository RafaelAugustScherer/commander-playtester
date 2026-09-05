import { describe, it, expect } from "vitest";
import { DraftSession, DraftSessionError } from "./draftSession";
import type { DraftEngine, CardResolver } from "./candidates";
import type { Card } from "../lib/types";
import { parseDecklist } from "../lib/decklist";
import type { DraftCandidateData } from "../engine/draftQueries";

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

function makeEngine(): DraftEngine {
  const byName = new Map(
    [...BASE_CARDS, ...POOL_CARDS].map((c) => [c.name.toLowerCase(), c]),
  );
  return {
    commanderCandidates: async () => POOL_CARDS.map(commanderData),
    rankCardCandidates: async ({ exclude }) =>
      POOL_CARDS.filter((candidate) => !exclude.includes(candidate.name.toLowerCase()))
        .slice(0, 3)
        .map(({ name }) => ({ name, bracketTilt: 0 })),
    resolveCards: async (names) =>
      names.flatMap((name) => {
        const found = byName.get(name.trim().toLowerCase());
        return found ? [commanderData(found)] : [];
      }),
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
        return [{ name: picks[inputs.length - 1], bracketTilt: 0 }];
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
      rankCardCandidates: async () => [],
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
      rankCardCandidates: async () => [],
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
