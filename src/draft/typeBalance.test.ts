import { describe, it, expect } from "vitest";
import type { CardFaceData } from "../engine/draftQueries";
import { COMMANDER_WEIGHT } from "./themes";
import {
  DRAFT_CARD_TYPES,
  allocateSlots,
  basicLandCount,
  basicLandSplit,
  cardTypeSignals,
  isBasicLandName,
  primaryType,
  targetMix,
  typeWeights,
  zeroCounts,
  type DraftCardType,
  type TypeBalance,
  type TypeCounts,
} from "./typeBalance";

function counts(partial: Partial<TypeCounts> = {}): TypeCounts {
  return { ...zeroCounts(), ...partial };
}

function engineFace(raw: Record<string, unknown>): CardFaceData {
  return { name: "Test Face", ...raw } as unknown as CardFaceData;
}

function sum(values: TypeCounts): number {
  return DRAFT_CARD_TYPES.reduce((total, type) => total + values[type], 0);
}

const SUBTYPE_TYPES: ReadonlyMap<string, DraftCardType> = new Map([
  ["aura", "enchantment"],
  ["equipment", "artifact"],
  ["vehicle", "artifact"],
  ["elf", "creature"],
]);

const instantFilter = { type: "Typed", type_filters: ["Instant"] };
const sorceryFilter = { type: "Typed", type_filters: ["Sorcery"] };

const strongFace = engineFace({
  triggers: [
    { mode: "SpellCast", valid_card: instantFilter, valid_target: { type: "Controller" } },
  ],
});
const mediumFace = engineFace({
  abilities: [
    {
      cost: {
        costs: [
          {
            filter: {
              type: "Typed",
              type_filters: [{ Subtype: "Elf" }],
              controller: "You",
            },
          },
        ],
      },
    },
  ],
});

const STRONG_SIGNAL = cardTypeSignals(strongFace, SUBTYPE_TYPES).instant;
const MEDIUM_SIGNAL = cardTypeSignals(mediumFace, SUBTYPE_TYPES).creature;

describe("zeroCounts", () => {
  it("has a zero for every draft card type", () => {
    const zero = zeroCounts();
    expect(Object.keys(zero).sort()).toEqual([...DRAFT_CARD_TYPES].sort());
    expect(Object.values(zero).every((n) => n === 0)).toBe(true);
  });

  it("returns a fresh object each call", () => {
    const first = zeroCounts();
    first.land = 5;
    expect(zeroCounts().land).toBe(0);
  });
});

describe("primaryType", () => {
  it.each([
    ["Land Creature — Forest Dryad", "land"],
    ["Artifact Creature — Golem", "creature"],
    ["Enchantment Creature — Nymph", "creature"],
    ["Kindred Instant — Elf", "instant"],
    ["Legendary Planeswalker — Teferi", "planeswalker"],
    ["Instant // Land", "instant"],
    ["Land // Instant", "land"],
    ["Basic Land — Island", "land"],
    ["Artifact — Equipment", "artifact"],
    ["Legendary Enchantment — Saga", "enchantment"],
    ["Sorcery", "sorcery"],
  ] as const)("maps %s to %s", (typeLine, expected) => {
    expect(primaryType(typeLine)).toBe(expected);
  });

  it("returns null for a type outside the draft types", () => {
    expect(primaryType("Battle — Siege")).toBeNull();
  });

  it("ignores type words that only appear in the subtypes", () => {
    expect(primaryType("Creature — Land Mine")).toBe("creature");
  });
});

describe("isBasicLandName", () => {
  it.each(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"])(
    "recognises %s",
    (name) => {
      expect(isBasicLandName(name)).toBe(true);
    },
  );

  it("ignores case and surrounding whitespace", () => {
    expect(isBasicLandName("  fOrEsT ")).toBe(true);
    expect(isBasicLandName("ISLAND")).toBe(true);
  });

  it("does not manage snow-covered or other lands", () => {
    expect(isBasicLandName("Snow-Covered Island")).toBe(false);
    expect(isBasicLandName("Forest of Dean")).toBe(false);
    expect(isBasicLandName("Command Tower")).toBe(false);
    expect(isBasicLandName("")).toBe(false);
  });
});

describe("cardTypeSignals", () => {
  it("gives instants and sorceries one strong signal per context for a cast trigger plus cost reducer", () => {
    const orFilter = { type: "Or", filters: [instantFilter, sorceryFilter] };
    const mizzix = engineFace({
      triggers: [
        {
          mode: "SpellCast",
          valid_card: {
            type: "And",
            filters: [orFilter, { type: "Typed", properties: [] }],
          },
          valid_target: { type: "Controller" },
        },
      ],
      static_abilities: [
        {
          mode: { ModifyCost: { mode: "Reduce", spell_filter: orFilter } },
          affected: { type: "Typed", type_filters: ["Card"], controller: "You" },
        },
      ],
    });

    expect(cardTypeSignals(mizzix, SUBTYPE_TYPES)).toEqual(
      counts({ instant: 2 * STRONG_SIGNAL, sorcery: 2 * STRONG_SIGNAL }),
    );
    expect(STRONG_SIGNAL).toBeGreaterThan(MEDIUM_SIGNAL);
  });

  it("maps subtype filters through the subtype table, counting each filter as its own strong signal", () => {
    const sram = engineFace({
      triggers: [
        {
          mode: "SpellCast",
          valid_card: {
            type: "Or",
            filters: [
              { type: "Typed", type_filters: [{ Subtype: "Aura" }] },
              { type: "Typed", type_filters: [{ Subtype: "Equipment" }] },
              { type: "Typed", type_filters: [{ Subtype: "Vehicle" }] },
            ],
          },
          valid_target: { type: "Controller" },
        },
      ],
    });

    expect(cardTypeSignals(sram, SUBTYPE_TYPES)).toEqual(
      counts({ artifact: 2 * STRONG_SIGNAL, enchantment: STRONG_SIGNAL }),
    );
  });

  it("gives a medium signal to a type a card only asks you to control", () => {
    expect(cardTypeSignals(mediumFace, SUBTYPE_TYPES)).toEqual(counts({ creature: 1 }));
  });

  it("ignores subtypes missing from the subtype table", () => {
    expect(cardTypeSignals(mediumFace, new Map())).toEqual(zeroCounts());
  });

  it("ignores spells cast by opponents", () => {
    const kambal = engineFace({
      triggers: [
        {
          mode: "SpellCast",
          valid_card: { type: "Typed", type_filters: ["Card", { Non: "Creature" }] },
          valid_target: { type: "Typed", controller: "Opponent" },
        },
      ],
    });

    expect(cardTypeSignals(kambal, SUBTYPE_TYPES)).toEqual(zeroCounts());
  });

  it("ignores cost increases", () => {
    const thalia = engineFace({
      static_abilities: [
        {
          mode: {
            ModifyCost: {
              mode: "Raise",
              spell_filter: { type: "Typed", type_filters: [{ Non: "Creature" }] },
            },
          },
          affected: { type: "Typed", type_filters: ["Card"] },
        },
      ],
    });

    expect(cardTypeSignals(thalia, SUBTYPE_TYPES)).toEqual(zeroCounts());
  });

  it("ignores a cast trigger whose spell filter belongs to the opponent", () => {
    const face = engineFace({
      triggers: [
        {
          mode: "SpellCast",
          valid_card: { type: "Typed", type_filters: ["Instant"], controller: "Opponent" },
          valid_target: { type: "Controller" },
        },
      ],
    });

    expect(cardTypeSignals(face, SUBTYPE_TYPES)).toEqual(zeroCounts());
  });

  it("treats non-creature as the four non-creature spell types, leaving creatures at zero", () => {
    const kykar = engineFace({
      triggers: [
        {
          mode: "SpellCast",
          valid_card: { type: "Typed", type_filters: [{ Non: "Creature" }] },
          valid_target: { type: "Controller" },
        },
      ],
    });

    expect(cardTypeSignals(kykar, SUBTYPE_TYPES)).toEqual(
      counts({
        instant: STRONG_SIGNAL,
        sorcery: STRONG_SIGNAL,
        artifact: STRONG_SIGNAL,
        enchantment: STRONG_SIGNAL,
      }),
    );
  });

  it("expands an AnyOf filter under your control into medium signals for each member", () => {
    const face = engineFace({
      abilities: [
        {
          cost: {
            filter: {
              type: "Typed",
              type_filters: [{ AnyOf: [{ Subtype: "Aura" }, { Subtype: "Equipment" }] }],
              controller: "You",
            },
          },
        },
      ],
    });

    expect(cardTypeSignals(face, SUBTYPE_TYPES)).toEqual(
      counts({ enchantment: MEDIUM_SIGNAL, artifact: MEDIUM_SIGNAL }),
    );
  });

  it("keeps a strong signal instead of adding a medium one for the same type", () => {
    const face = engineFace({
      triggers: [
        { mode: "SpellCast", valid_card: instantFilter, valid_target: { type: "Controller" } },
      ],
      abilities: [
        { cost: { filter: { type: "Typed", type_filters: ["Instant"], controller: "You" } } },
      ],
    });

    expect(cardTypeSignals(face, SUBTYPE_TYPES).instant).toBe(STRONG_SIGNAL);
  });

  it("returns zeros for a face with no abilities", () => {
    expect(cardTypeSignals(engineFace({}), SUBTYPE_TYPES)).toEqual(zeroCounts());
  });
});

describe("typeWeights", () => {
  const deckWeightAfter = (cards: number): number =>
    typeWeights(
      [],
      Array.from({ length: cards }, () => counts({ instant: STRONG_SIGNAL })),
    ).instant;

  it("scales commander signals by the commander weight", () => {
    const weights = typeWeights([counts({ instant: 2, land: 1 })], []);
    expect(weights.instant).toBe(COMMANDER_WEIGHT * 2);
    expect(weights.land).toBe(COMMANDER_WEIGHT);
    expect(weights.creature).toBe(0);
  });

  it("adds up the signals of several commanders", () => {
    const weights = typeWeights([counts({ sorcery: 1 }), counts({ sorcery: 2 })], []);
    expect(weights.sorcery).toBe(COMMANDER_WEIGHT * 3);
  });

  it("does not cap commander signals", () => {
    const heavy = typeWeights([counts({ instant: 100 })], []);
    expect(heavy.instant).toBe(COMMANDER_WEIGHT * 100);
  });

  it("ignores medium signals on deck cards", () => {
    const weights = typeWeights(
      [],
      Array.from({ length: 50 }, () => counts({ creature: MEDIUM_SIGNAL })),
    );
    expect(weights).toEqual(zeroCounts());
  });

  it("counts strong deck signals per type independently", () => {
    const weights = typeWeights(
      [],
      [counts({ instant: STRONG_SIGNAL }), counts({ artifact: STRONG_SIGNAL })],
    );
    expect(weights.instant).toBeGreaterThan(0);
    expect(weights.artifact).toBe(weights.instant);
    expect(weights.sorcery).toBe(0);
  });

  it("grows with each strong deck card until it hits a cap", () => {
    const series = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55].map(deckWeightAfter);

    expect(series[0]).toBe(0);
    expect(series[1]).toBeGreaterThan(series[0]);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeGreaterThanOrEqual(series[i - 1]);
    }
    expect(series[series.length - 1]).toBe(series[series.length - 2]);
    expect(series[series.length - 1]).toBeLessThan(55 * STRONG_SIGNAL);
  });

  it("ignores deck signals when a commander has a signal of its own", () => {
    const deck = Array.from({ length: 55 }, () => counts({ instant: STRONG_SIGNAL }));
    const commanderOnly = typeWeights([counts({ enchantment: 1 })], []);

    expect(typeWeights([counts({ enchantment: 1 })], deck)).toEqual(commanderOnly);
  });

  it("uses the capped deck signals when the commanders have none", () => {
    const deck = Array.from({ length: 55 }, () => counts({ instant: STRONG_SIGNAL }));

    expect(typeWeights([zeroCounts()], deck).instant).toBe(deckWeightAfter(55));
  });
});

describe("targetMix", () => {
  const weightCases: Array<[string, TypeCounts]> = [
    ["no signals", zeroCounts()],
    ["instants and sorceries", counts({ instant: 12, sorcery: 12 })],
    ["lands", counts({ land: 9 })],
    ["creatures", counts({ creature: 20 })],
    ["everything", counts({ land: 6, creature: 6, instant: 6, artifact: 6, planeswalker: 6 })],
  ];

  it.each(weightCases)("sums to the deck size for %s", (_name, weights) => {
    for (const deckSize of [99, 98]) {
      for (const colorCount of [0, 1, 3, 5]) {
        expect(sum(targetMix(weights, colorCount, deckSize, true).counts)).toBe(deckSize);
      }
    }
  });

  it("never produces a negative count", () => {
    for (const [, weights] of weightCases) {
      const { counts: mix } = targetMix(weights, 2, 99, true);
      expect(DRAFT_CARD_TYPES.every((type) => mix[type] >= 0)).toBe(true);
    }
  });

  it("makes creatures the largest non-land type and keeps at least 33 lands with no signals", () => {
    const { counts: mix } = targetMix(zeroCounts(), 2, 99, true);
    const nonLand = DRAFT_CARD_TYPES.filter((type) => type !== "land");

    expect(mix.land).toBeGreaterThanOrEqual(33);
    for (const type of nonLand.filter((t) => t !== "creature")) {
      expect(mix.creature).toBeGreaterThan(mix[type]);
    }
  });

  it("leans toward instants and sorceries over creatures when both are strongly signalled", () => {
    const { counts: mix } = targetMix(counts({ instant: 12, sorcery: 12 }), 2, 99, true);
    const baseline = targetMix(zeroCounts(), 2, 99, true).counts;

    expect(mix.instant + mix.sorcery).toBeGreaterThan(mix.creature);
    expect(mix.instant).toBeGreaterThan(baseline.instant);
    expect(mix.sorcery).toBeGreaterThan(baseline.sorcery);
    expect(mix.creature).toBeLessThan(baseline.creature);
  });

  it("leans toward creatures when creatures are strongly signalled", () => {
    const { counts: mix } = targetMix(counts({ creature: 20 }), 2, 99, true);
    expect(mix.creature).toBeGreaterThan(targetMix(zeroCounts(), 2, 99, true).counts.creature);
  });

  it("plans more lands when lands are signalled, never fewer", () => {
    const plain = targetMix(zeroCounts(), 2, 99, true).counts.land;
    const light = targetMix(counts({ land: 2 }), 2, 99, true).counts.land;
    const heavy = targetMix(counts({ land: 9 }), 2, 99, true).counts.land;

    expect(heavy).toBeGreaterThan(plain);
    expect(light).toBeGreaterThanOrEqual(plain);
    expect(heavy).toBeGreaterThanOrEqual(light);
  });

  it("stops adding lands once the land signal saturates", () => {
    const high = targetMix(counts({ land: 1000 }), 2, 99, true).counts.land;
    const higher = targetMix(counts({ land: 100000 }), 2, 99, true).counts.land;
    expect(higher).toBe(high);
  });

  it("plans more nonbasic lands as colours grow, never above the land total", () => {
    const one = targetMix(zeroCounts(), 1, 99, true);
    const three = targetMix(zeroCounts(), 3, 99, true);
    const five = targetMix(zeroCounts(), 5, 99, true);

    expect(three.nonbasicLands).toBeGreaterThan(one.nonbasicLands);
    expect(five.nonbasicLands).toBeGreaterThan(three.nonbasicLands);
    for (const mix of [one, three, five]) {
      expect(mix.nonbasicLands).toBeGreaterThan(0);
      expect(mix.nonbasicLands).toBeLessThanOrEqual(mix.counts.land);
    }
  });

  it("treats colour counts beyond five like five", () => {
    expect(targetMix(zeroCounts(), 9, 99, true).nonbasicLands).toBe(
      targetMix(zeroCounts(), 5, 99, true).nonbasicLands,
    );
  });
});
  it("gives the planeswalker share to the other types when planeswalkers are off", () => {
    const withPlaneswalkers = targetMix(zeroCounts(), 2, 99, true).counts;
    const without = targetMix(zeroCounts(), 2, 99, false).counts;

    expect(withPlaneswalkers.planeswalker).toBeGreaterThan(0);
    expect(without.planeswalker).toBe(0);
    expect(sum(without)).toBe(99);
  });


describe("allocateSlots", () => {
  const ALL_TYPES = [...DRAFT_CARD_TYPES];

  function balanceOf(overrides: Partial<TypeBalance> = {}): TypeBalance {
    return {
      target: counts({
        land: 36,
        creature: 28,
        instant: 10,
        sorcery: 8,
        artifact: 10,
        enchantment: 7,
        planeswalker: 1,
      }),
      nonbasicLandTarget: 14,
      have: zeroCounts(),
      basicLands: 0,
      ...overrides,
    };
  }

  function haveAtTarget(balance: TypeBalance, behind: Partial<TypeCounts> = {}): TypeCounts {
    return {
      ...balance.target,
      land: balance.nonbasicLandTarget + balance.basicLands,
      ...behind,
    };
  }

  it("gives the first slot of an empty deck to the type with the largest target", () => {
    expect(allocateSlots(balanceOf(), 1, ALL_TYPES)).toEqual(["creature"]);
  });

  it("gives the first slot to a type far behind its target", () => {
    const base = balanceOf();
    const balance = balanceOf({ have: haveAtTarget(base, { enchantment: 0 }) });

    expect(allocateSlots(balance, 1, ALL_TYPES)).toEqual(["enchantment"]);
  });

  it("only returns eligible types", () => {
    const slots = allocateSlots(balanceOf(), 8, ["instant", "sorcery"]);

    expect(slots).toHaveLength(8);
    expect(slots.every((type) => type === "instant" || type === "sorcery")).toBe(true);
  });

  it("returns no slots when nothing is eligible", () => {
    expect(allocateSlots(balanceOf(), 3, [])).toEqual([]);
  });

  it("returns no slots when none are requested", () => {
    expect(allocateSlots(balanceOf(), 0, ALL_TYPES)).toEqual([]);
  });

  it("does not count basic lands as drafted lands", () => {
    const base = balanceOf();
    const withBasics = balanceOf({
      have: { ...haveAtTarget(base), land: 20 },
      basicLands: 20,
    });
    const withNonbasics = balanceOf({
      have: { ...haveAtTarget(base), land: 20 },
      basicLands: 0,
    });

    expect(allocateSlots(withBasics, 1, ALL_TYPES)).toEqual(["land"]);
    expect(allocateSlots(withNonbasics, 1, ALL_TYPES)).not.toContain("land");
  });

  it("stops offering lands once the land target is filled", () => {
    const base = balanceOf();
    const filled = balanceOf({
      have: { ...haveAtTarget(base, { creature: 0 }), land: base.target.land },
      basicLands: base.target.land,
    });

    expect(allocateSlots(filled, 3, ALL_TYPES)).not.toContain("land");
  });

  it("repeats a type when it trails its target by more than one card", () => {
    const base = balanceOf();
    const balance = balanceOf({ have: haveAtTarget(base, { sorcery: 0 }) });

    expect(allocateSlots(balance, 3, ALL_TYPES)).toEqual(["sorcery", "sorcery", "sorcery"]);
  });

  it("spreads slots across types when none trails by more than one card", () => {
    const slots = allocateSlots(balanceOf(), 3, ALL_TYPES);

    expect(new Set(slots).size).toBeGreaterThan(1);
  });
});

describe("basicLandCount", () => {
  function balanceOf(overrides: Partial<TypeBalance> = {}): TypeBalance {
    return {
      target: counts({ land: 36, creature: 30 }),
      nonbasicLandTarget: 12,
      have: zeroCounts(),
      basicLands: 0,
      ...overrides,
    };
  }

  it("fills every land missing from the target", () => {
    expect(basicLandCount(balanceOf(), 90)).toBe(36);
  });

  it("leaves room for the nonbasic lands already drafted", () => {
    expect(basicLandCount(balanceOf({ have: counts({ land: 15 }) }), 90)).toBe(21);
  });

  it("replaces the basics already in the deck rather than adding to them", () => {
    const balance = balanceOf({ have: counts({ land: 20 }), basicLands: 8 });
    expect(basicLandCount(balance, 90)).toBe(24);
  });

  it("clamps to the open slots", () => {
    expect(basicLandCount(balanceOf(), 10)).toBe(10);
  });

  it("clamps to zero when nonbasics already cover the land target", () => {
    expect(basicLandCount(balanceOf({ have: counts({ land: 40 }) }), 90)).toBe(0);
  });

  it("clamps to zero when no slots are open", () => {
    expect(basicLandCount(balanceOf(), 0)).toBe(0);
    expect(basicLandCount(balanceOf(), -3)).toBe(0);
  });
});

describe("basicLandSplit", () => {
  const total = (entries: Array<{ quantity: number }>) =>
    entries.reduce((n, entry) => n + entry.quantity, 0);

  it("splits proportionally to the colour weights with largest remainders", () => {
    expect(basicLandSplit(24, ["G", "U"], { G: 3.5, U: 1.5 })).toEqual([
      { quantity: 17, name: "Forest" },
      { quantity: 7, name: "Island" },
    ]);
  });

  it("hands the leftover land to the largest remainder", () => {
    expect(basicLandSplit(7, ["W", "U", "B"], { W: 5, U: 3, B: 2 })).toEqual([
      { quantity: 4, name: "Plains" },
      { quantity: 2, name: "Island" },
      { quantity: 1, name: "Swamp" },
    ]);
  });

  it("always adds up to the requested count", () => {
    const weights = { W: 7.3, U: 1.1, B: 4.9, R: 0.4, G: 12.2 };
    for (const count of [1, 2, 5, 17, 24, 37]) {
      expect(total(basicLandSplit(count, ["W", "U", "B", "R", "G"], weights))).toBe(count);
    }
  });

  it("uses the right basic for each colour and follows identity order", () => {
    const entries = basicLandSplit(10, ["G", "R", "B", "U", "W"], {
      W: 1,
      U: 1,
      B: 1,
      R: 1,
      G: 1,
    });

    expect(entries.map((entry) => entry.name)).toEqual([
      "Forest",
      "Mountain",
      "Swamp",
      "Island",
      "Plains",
    ]);
  });

  it("falls back to Wastes for a colourless identity", () => {
    expect(basicLandSplit(10, [], {})).toEqual([{ quantity: 10, name: "Wastes" }]);
  });

  it("falls back to Wastes when the identity has no basic-land colours", () => {
    expect(basicLandSplit(4, ["X"], { X: 5 })).toEqual([{ quantity: 4, name: "Wastes" }]);
  });

  it("splits evenly when every colour has zero weight", () => {
    expect(basicLandSplit(9, ["W", "U", "B"], {})).toEqual([
      { quantity: 3, name: "Plains" },
      { quantity: 3, name: "Island" },
      { quantity: 3, name: "Swamp" },
    ]);
    const uneven = basicLandSplit(10, ["W", "U", "B"], {});
    const quantities = uneven.map((entry) => entry.quantity);
    expect(total(uneven)).toBe(10);
    expect(Math.max(...quantities) - Math.min(...quantities)).toBeLessThanOrEqual(1);
  });

  it("omits a colour with no share", () => {
    expect(basicLandSplit(8, ["G", "U"], { G: 10 })).toEqual([{ quantity: 8, name: "Forest" }]);
  });

  it("returns nothing for a count of zero or less", () => {
    expect(basicLandSplit(0, ["G"], { G: 1 })).toEqual([]);
    expect(basicLandSplit(-2, ["G"], { G: 1 })).toEqual([]);
  });
});
