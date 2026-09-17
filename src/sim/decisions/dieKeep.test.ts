import { describe, it, expect } from "vitest";
import { parseDieKeepPrompt, selectDieRollsAction } from "./dieKeep";
import type { WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (DieKeepChoice)
// at v0.86.0: { player, results, ignorable_indices, ignore_count }.
const REAL_DIE_KEEP: WaitingFor = {
  type: "DieKeepChoice",
  data: {
    player: 0,
    results: [3, 3, 6],
    ignorable_indices: [0, 1],
    ignore_count: 1,
  },
};

describe("parseDieKeepPrompt", () => {
  it("parses the player, results, ignorable indices and ignore count", () => {
    const p = parseDieKeepPrompt(REAL_DIE_KEEP)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.results).toEqual([3, 3, 6]);
    expect(p.ignorableIndices).toEqual([0, 1]);
    expect(p.ignoreCount).toBe(1);
  });

  it("returns null when nothing may be ignored", () => {
    const wf: WaitingFor = {
      type: "DieKeepChoice",
      data: { player: 0, results: [4], ignorable_indices: [], ignore_count: 0 },
    };
    expect(parseDieKeepPrompt(wf)).toBeNull();
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseDieKeepPrompt(undefined)).toBeNull();
    expect(parseDieKeepPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("selectDieRollsAction", () => {
  it("builds the SelectDieRolls action", () => {
    expect(selectDieRollsAction([1])).toEqual({
      type: "SelectDieRolls",
      data: { ignore_indices: [1] },
    });
  });
});
