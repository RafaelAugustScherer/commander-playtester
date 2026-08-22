import { describe, it, expect } from "vitest";
import {
  parseManaPrompt,
  chooseManaColorAction,
  tapManaSourceAction,
  priorityManaSources,
  canPayFromPool,
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

// A real legalActionsByObject slice for manual-mana priority: a basic taps for
// one color, a dual offers two, a rock defers its color. Captured live (trimmed).
const LEGAL_BY_OBJECT = {
  legalActionsByObject: {
    "48": [
      {
        type: "TapLandForMana",
        data: {
          selection: {
            source: { object_id: 48, incarnation: 2 },
            mana_type: "Green",
            output: { type: "Concrete", data: "Green" },
          },
        },
        interactionActionId: "abc123",
      },
    ],
    "77": [
      {
        type: "TapLandForMana",
        data: { selection: { source: { object_id: 77 }, mana_type: "White" } },
      },
      {
        type: "TapLandForMana",
        data: { selection: { source: { object_id: 77 }, mana_type: "Black" } },
      },
    ],
    "90": [
      {
        type: "ActivateManaSource",
        data: {
          selection: {
            source: { object_id: 90 },
            output: { type: "DeferredColorChoice" },
          },
        },
      },
    ],
    // A non-mana ability must not be offered as a mana source.
    "5": [{ type: "ActivateAbility", data: { source_id: 5, ability_index: 0 } }],
  },
};

describe("priorityManaSources", () => {
  it("groups each permanent's tap-for-mana actions, skipping non-mana ones", () => {
    const map = priorityManaSources(LEGAL_BY_OBJECT);
    expect([...map.keys()].sort((a, b) => a - b)).toEqual([48, 77, 90]);
    expect(map.get(77)!.map((o) => o.manaType)).toEqual(["White", "Black"]);
    expect(map.get(90)![0].manaType).toBe(""); // deferred any-color
  });

  it("strips interactionActionId, echoing only type+data the engine accepts", () => {
    const opt = priorityManaSources(LEGAL_BY_OBJECT).get(48)![0];
    expect(Object.keys(opt.action)).toEqual(["type", "data"]);
    expect(opt.action.type).toBe("TapLandForMana");
  });

  it("returns an empty map when there are no per-object actions", () => {
    expect(priorityManaSources(undefined).size).toBe(0);
    expect(priorityManaSources({}).size).toBe(0);
  });
});

describe("canPayFromPool", () => {
  const pool = (colors: string[]): { color: string; count: number }[] => {
    const counts = new Map<string, number>();
    for (const c of colors) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].map(([color, count]) => ({ color, count }));
  };
  const cost = (generic: number, shards: string[]) => ({
    type: "Cost",
    generic,
    shards,
  });

  it("pays each colored pip from its own color and generic from the rest", () => {
    expect(canPayFromPool(pool(["Green", "Black"]), cost(1, ["Green"]))).toBe(true);
    expect(canPayFromPool(pool(["White", "White"]), cost(0, ["White", "White"]))).toBe(true);
  });

  it("rejects when a required color is not floating", () => {
    expect(canPayFromPool(pool(["White", "Black"]), cost(1, ["Green"]))).toBe(false);
  });

  it("rejects when there is not enough total mana for the generic part", () => {
    expect(canPayFromPool(pool(["Green"]), cost(1, ["Green"]))).toBe(false);
  });

  it("does not spend a colored pip's mana on the generic part", () => {
    // {1}{G} with exactly G + G: one G pays the pip, the other covers generic.
    expect(canPayFromPool(pool(["Green", "Green"]), cost(1, ["Green"]))).toBe(true);
    // {1}{G} with only two generic-usable but no second mana fails.
    expect(canPayFromPool(pool(["Green"]), cost(1, ["Green"]))).toBe(false);
  });

  it("treats a free cost (or none) as always payable", () => {
    expect(canPayFromPool([], cost(0, []))).toBe(true);
    expect(canPayFromPool([], null)).toBe(true);
  });
});

describe("readManaPool", () => {
  it("reads the engine's mana_pool.mana entries by color", () => {
    const player = {
      mana_pool: {
        mana: [
          { color: "Blue" },
          { color: "Blue" },
          { color: "Red" },
          { color: "Mystery" },
        ],
      },
    };
    const pips = readManaPool(player);
    expect(pips).toContainEqual({ color: "Blue", count: 2 });
    expect(pips).toContainEqual({ color: "Red", count: 1 });
    expect(pips.some((p) => p.color === "Mystery")).toBe(false);
  });

  it("returns an empty list when the pool is empty or absent", () => {
    expect(readManaPool({ mana_pool: { mana: [] } })).toEqual([]);
    expect(readManaPool({})).toEqual([]);
    expect(readManaPool(null)).toEqual([]);
  });
});
