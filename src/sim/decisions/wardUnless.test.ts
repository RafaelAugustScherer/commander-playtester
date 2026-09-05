import { describe, it, expect } from "vitest";
import {
  parseWardUnlessPrompt,
  selectWardUnlessCardsAction,
  chooseUnlessCostBranchAction,
} from "./wardUnless";
import type { GameState, WaitingFor } from "../../engine/types";

const STATE: GameState = {
  turn_number: 1,
  phase: "Main1",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    10: { id: 10, name: "Cancel", zone: "Hand" },
    11: { id: 11, name: "Lightning Bolt", zone: "Hand" },
    20: {
      id: 20,
      name: "Grizzly Bears",
      zone: "Battlefield",
      power: 2,
      toughness: 2,
    },
    21: {
      id: 21,
      name: "Runeclaw Bear",
      zone: "Battlefield",
      power: 2,
      toughness: 2,
    },
    22: { id: 22, name: "Winged Temple of Orazca", zone: "Battlefield" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

// Shape confirmed against phase-rs client/src/adapter/types.ts at v0.71.0:
// WardDiscardChoice { player, cards, remaining, filter? }.
const REAL_WARD_DISCARD: WaitingFor = {
  type: "WardDiscardChoice",
  data: { player: 0, cards: [10, 11], remaining: 1 },
};

// WardSacrificeChoice { player, permanents, remaining, min_total_power?: number|null }
// with no threshold: pick a single permanent immediately.
const REAL_WARD_SACRIFICE_SINGLE: WaitingFor = {
  type: "WardSacrificeChoice",
  data: {
    player: 0,
    permanents: [20, 21],
    remaining: 1,
    min_total_power: null,
  },
};

// Same shape, this time with a power threshold: pick any number of
// permanents whose summed power meets min_total_power.
const REAL_WARD_SACRIFICE_THRESHOLD: WaitingFor = {
  type: "WardSacrificeChoice",
  data: {
    player: 0,
    permanents: [20, 21],
    remaining: 1,
    min_total_power: 4,
  },
};

// UnlessBounceChoice { player, permanents, remaining }.
const REAL_UNLESS_BOUNCE: WaitingFor = {
  type: "UnlessBounceChoice",
  data: { player: 0, permanents: [20, 22], remaining: 1 },
};

// UnlessPaymentChooseCost { player, costs: UnlessCost[], pending_effect,
// effect_description? }. UnlessCost variants confirmed against
// phase-rs client/src/adapter/types.ts at v0.71.0.
const REAL_UNLESS_COST: WaitingFor = {
  type: "UnlessPaymentChooseCost",
  data: {
    player: 0,
    effect_description: "Counter unless its controller pays {3} or sacrifices a creature",
    costs: [
      { type: "DynamicGeneric", quantity: 3 },
      { type: "Sacrifice", count: 1, filter: "Creature" },
      { type: "PayLife", amount: 5 },
      { type: "DiscardCard" },
      { type: "ReturnToHand", count: 1, filter: "Permanent" },
      { type: "Fixed", cost: { generic: 2 } },
    ],
  },
};

describe("parseWardUnlessPrompt", () => {
  describe("WardDiscardChoice", () => {
    it("parses the offered cards", () => {
      const p = parseWardUnlessPrompt(REAL_WARD_DISCARD, STATE);
      expect(p).not.toBeNull();
      if (p?.kind !== "wardDiscard") throw new Error("expected wardDiscard");
      expect(p.player).toBe(0);
      expect(p.cards).toEqual([
        { id: 10, name: "Cancel" },
        { id: 11, name: "Lightning Bolt" },
      ]);
    });

    it("returns null when cards is empty", () => {
      const wf: WaitingFor = {
        type: "WardDiscardChoice",
        data: { player: 0, cards: [], remaining: 1 },
      };
      expect(parseWardUnlessPrompt(wf, STATE)).toBeNull();
    });
  });

  describe("WardSacrificeChoice", () => {
    it("parses a single-pick prompt when min_total_power is null", () => {
      const p = parseWardUnlessPrompt(REAL_WARD_SACRIFICE_SINGLE, STATE);
      expect(p).not.toBeNull();
      if (p?.kind !== "wardSacrifice") throw new Error("expected wardSacrifice");
      expect(p.minTotalPower).toBeNull();
      expect(p.permanents).toEqual([
        { id: 20, name: "Grizzly Bears", power: 2, toughness: 2 },
        { id: 21, name: "Runeclaw Bear", power: 2, toughness: 2 },
      ]);
    });

    it("parses a threshold prompt when min_total_power is set", () => {
      const p = parseWardUnlessPrompt(REAL_WARD_SACRIFICE_THRESHOLD, STATE);
      expect(p).not.toBeNull();
      if (p?.kind !== "wardSacrifice") throw new Error("expected wardSacrifice");
      expect(p.minTotalPower).toBe(4);
      expect(p.permanents).toEqual([
        { id: 20, name: "Grizzly Bears", power: 2, toughness: 2 },
        { id: 21, name: "Runeclaw Bear", power: 2, toughness: 2 },
      ]);
    });

    it("returns null when permanents is empty", () => {
      const wf: WaitingFor = {
        type: "WardSacrificeChoice",
        data: { player: 0, permanents: [], remaining: 1, min_total_power: null },
      };
      expect(parseWardUnlessPrompt(wf, STATE)).toBeNull();
    });
  });

  describe("UnlessBounceChoice", () => {
    it("parses the offered permanents", () => {
      const p = parseWardUnlessPrompt(REAL_UNLESS_BOUNCE, STATE);
      expect(p).not.toBeNull();
      if (p?.kind !== "unlessBounce") throw new Error("expected unlessBounce");
      expect(p.player).toBe(0);
      expect(p.permanents).toEqual([
        { id: 20, name: "Grizzly Bears", power: 2, toughness: 2 },
        { id: 22, name: "Winged Temple of Orazca", power: undefined, toughness: undefined },
      ]);
    });

    it("returns null when permanents is empty", () => {
      const wf: WaitingFor = {
        type: "UnlessBounceChoice",
        data: { player: 0, permanents: [], remaining: 1 },
      };
      expect(parseWardUnlessPrompt(wf, STATE)).toBeNull();
    });
  });

  describe("UnlessPaymentChooseCost", () => {
    it("labels each cost variant and preserves its index", () => {
      const p = parseWardUnlessPrompt(REAL_UNLESS_COST, STATE);
      expect(p).not.toBeNull();
      if (p?.kind !== "unlessCost") throw new Error("expected unlessCost");
      expect(p.player).toBe(0);
      expect(p.description).toBe(
        "Counter unless its controller pays {3} or sacrifices a creature",
      );
      expect(p.costs).toEqual([
        { hint: { type: "dynamicGeneric" }, index: 0 },
        { hint: { type: "sacrifice", count: 1 }, index: 1 },
        { hint: { type: "payLife", amount: 5 }, index: 2 },
        { hint: { type: "discardCard" }, index: 3 },
        { hint: { type: "returnToHand", count: 1 }, index: 4 },
        { hint: { type: "fixed" }, index: 5 },
      ]);
    });

    it("returns null when costs is empty", () => {
      const wf: WaitingFor = {
        type: "UnlessPaymentChooseCost",
        data: { player: 0, costs: [], pending_effect: {} },
      };
      expect(parseWardUnlessPrompt(wf, STATE)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseWardUnlessPrompt(undefined)).toBeNull();
    expect(parseWardUnlessPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("selectWardUnlessCardsAction", () => {
  it("builds the SelectCards action", () => {
    expect(selectWardUnlessCardsAction([10])).toEqual({
      type: "SelectCards",
      data: { cards: [10] },
    });
  });

  it("supports multiple ids for a threshold sacrifice", () => {
    expect(selectWardUnlessCardsAction([20, 21])).toEqual({
      type: "SelectCards",
      data: { cards: [20, 21] },
    });
  });
});

describe("chooseUnlessCostBranchAction", () => {
  it("builds a Pay branch for a chosen index", () => {
    expect(chooseUnlessCostBranchAction(2)).toEqual({
      type: "ChooseUnlessCostBranch",
      data: { choice: { type: "Pay", data: { index: 2 } } },
    });
  });

  it("builds a Decline branch for a null index", () => {
    expect(chooseUnlessCostBranchAction(null)).toEqual({
      type: "ChooseUnlessCostBranch",
      data: { choice: { type: "Decline" } },
    });
  });
});
