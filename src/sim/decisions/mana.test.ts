import { describe, it, expect } from "vitest";
import {
  parseManaPrompt,
  chooseManaColorAction,
  tapManaSourceAction,
  readManaPool,
} from "./mana";
import type { WaitingFor } from "../../engine/types";

// Real ChooseManaColor waiting_for captured from the phase-rs WASM build (trimmed).
const REAL_COLOR: WaitingFor = {
  type: "ChooseManaColor",
  data: {
    choice: {
      type: "SingleColor",
      data: { options: ["White", "Blue", "Black", "Red", "Green"] },
    },
    player: 0,
  },
};

// Real ManaSourceSelection waiting_for captured from the phase-rs WASM build.
const REAL_SOURCE: WaitingFor = {
  type: "ManaSourceSelection",
  data: {
    player: 0,
    options: [
      {
        ability_index: 0,
        mana_type: "Blue",
        output: { type: "Concrete", data: "Blue" },
        penalty: "None",
        source: { incarnation: 2, object_id: 54 },
        taps_for_mana: [],
      },
      {
        ability_index: 0,
        mana_type: "Colorless",
        output: { type: "DeferredColorChoice" },
        penalty: "Sacrifices",
        source: { incarnation: 1, object_id: 203 },
        taps_for_mana: [],
      },
    ],
  },
};

describe("parseManaPrompt", () => {
  it("parses a ChooseManaColor prompt into its color options", () => {
    const p = parseManaPrompt(REAL_COLOR)!;
    expect(p.kind).toBe("color");
    if (p.kind !== "color") return;
    expect(p.player).toBe(0);
    expect(p.options).toEqual(["White", "Blue", "Black", "Red", "Green"]);
  });

  it("parses a ManaSourceSelection into tappable sources", () => {
    const p = parseManaPrompt(REAL_SOURCE)!;
    expect(p.kind).toBe("source");
    if (p.kind !== "source") return;
    expect(p.sources.map((s) => s.objectId)).toEqual([54, 203]);
    expect(p.sources[0].concrete).toBe(true);
    expect(p.sources[1].concrete).toBe(false);
  });

  it("returns null for unrelated waiting_for", () => {
    expect(parseManaPrompt(undefined)).toBeNull();
    expect(parseManaPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("mana action builders", () => {
  it("builds ChooseManaColor matching the engine's own submission", () => {
    expect(chooseManaColorAction("Blue")).toEqual({
      type: "ChooseManaColor",
      data: { choice: { type: "SingleColor", data: "Blue" }, count: 1 },
    });
  });

  it("taps a concrete source with TapLandForMana and a deferred one with ActivateManaSource", () => {
    const p = parseManaPrompt(REAL_SOURCE);
    if (p?.kind !== "source") throw new Error("expected source prompt");
    expect(tapManaSourceAction(p.sources[0]).type).toBe("TapLandForMana");
    expect(tapManaSourceAction(p.sources[1]).type).toBe("ActivateManaSource");
    expect(tapManaSourceAction(p.sources[0]).data.selection).toBe(
      p.sources[0].option,
    );
  });
});

describe("readManaPool", () => {
  it("counts recognised colors in the pool, ignoring unknowns", () => {
    const player = {
      mana_pool: {
        units: [
          { mana_type: "Blue" },
          { mana_type: "Blue" },
          { mana_type: "Red" },
          { mana_type: "Mystery" },
        ],
      },
    };
    const pips = readManaPool(player);
    expect(pips).toContainEqual({ color: "Blue", count: 2 });
    expect(pips).toContainEqual({ color: "Red", count: 1 });
    expect(pips.some((p) => p.color === "Mystery")).toBe(false);
  });

  it("returns an empty list when the pool is empty or absent", () => {
    expect(readManaPool({ mana_pool: { units: [] } })).toEqual([]);
    expect(readManaPool({})).toEqual([]);
    expect(readManaPool(null)).toEqual([]);
  });
});
