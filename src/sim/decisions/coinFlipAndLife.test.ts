import { describe, it, expect } from "vitest";
import {
  parseCoinFlipLifePrompt,
  selectCoinFlipsAction,
  submitLifeRedistributionAction,
} from "./coinFlipAndLife";
import type { WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (CoinFlipKeepModal) at v0.71.0: CoinFlipKeepChoice { player, results, keep_count }.
const REAL_COIN_FLIP: WaitingFor = {
  type: "CoinFlipKeepChoice",
  data: {
    player: 0,
    results: [true, false, true],
    keep_count: 2,
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (LifeRedistributionModal) at v0.71.0: RedistributeLifeTotals
// { player, options: { assignment: [PlayerId, number][] }[] }.
const REAL_LIFE_REDISTRIBUTION: WaitingFor = {
  type: "RedistributeLifeTotals",
  data: {
    player: 0,
    options: [
      {
        assignment: [
          [0, 20],
          [1, 30],
        ],
      },
      {
        assignment: [
          [0, 30],
          [1, 20],
        ],
      },
    ],
  },
};

describe("parseCoinFlipLifePrompt", () => {
  describe("CoinFlipKeepChoice", () => {
    it("parses the player, results and keep count", () => {
      const p = parseCoinFlipLifePrompt(REAL_COIN_FLIP)!;
      expect(p).not.toBeNull();
      if (p.kind !== "coinFlip") throw new Error("expected a coinFlip prompt");
      expect(p.player).toBe(0);
      expect(p.results).toEqual([true, false, true]);
      expect(p.keepCount).toBe(2);
    });

    it("returns null when results is empty", () => {
      const wf: WaitingFor = {
        type: "CoinFlipKeepChoice",
        data: { player: 0, results: [], keep_count: 0 },
      };
      expect(parseCoinFlipLifePrompt(wf)).toBeNull();
    });
  });

  describe("RedistributeLifeTotals", () => {
    it("parses each option's per-seat life assignment", () => {
      const p = parseCoinFlipLifePrompt(REAL_LIFE_REDISTRIBUTION)!;
      expect(p).not.toBeNull();
      if (p.kind !== "life") throw new Error("expected a life prompt");
      expect(p.player).toBe(0);
      expect(p.options).toEqual([
        [
          { seat: 0, life: 20 },
          { seat: 1, life: 30 },
        ],
        [
          { seat: 0, life: 30 },
          { seat: 1, life: 20 },
        ],
      ]);
    });

    it("returns null when options is empty", () => {
      const wf: WaitingFor = {
        type: "RedistributeLifeTotals",
        data: { player: 0, options: [] },
      };
      expect(parseCoinFlipLifePrompt(wf)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseCoinFlipLifePrompt(undefined)).toBeNull();
    expect(parseCoinFlipLifePrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("selectCoinFlipsAction", () => {
  it("builds the SelectCoinFlips action", () => {
    expect(selectCoinFlipsAction([0, 2])).toEqual({
      type: "SelectCoinFlips",
      data: { keep_indices: [0, 2] },
    });
  });
});

describe("submitLifeRedistributionAction", () => {
  it("builds the SubmitLifeRedistribution action", () => {
    expect(submitLifeRedistributionAction(1)).toEqual({
      type: "SubmitLifeRedistribution",
      data: { option_index: 1 },
    });
  });
});
