import { describe, it, expect } from "vitest";
import {
  parseOptionalCostPrompt,
  decideOptionalCostAction,
} from "./optionalCost";
import type { GameObject, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// OptionalCostChoice { player, cost: AdditionalCost, times_kicked, pending_cast }.
const REAL_OPTIONAL_COST: WaitingFor = {
  type: "OptionalCostChoice",
  data: {
    player: 0,
    cost: { type: "Kicker", data: { costs: [], repeatable: true } },
    times_kicked: 1,
    pending_cast: { object_id: 12, card_id: 900 },
  },
};

const OBJECTS: Record<string, GameObject> = {
  12: { id: 12, name: "Rite of Replication", zone: "Stack" },
};

describe("parseOptionalCostPrompt", () => {
  it("parses the cost kind, source name and kick count", () => {
    const p = parseOptionalCostPrompt(REAL_OPTIONAL_COST, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.sourceName).toBe("Rite of Replication");
    expect(p.costKind).toBe("Kicker");
    expect(p.timesKicked).toBe(1);
    expect(p.repeatable).toBe(true);
  });

  it("falls back to an empty source name when the object is unknown", () => {
    const p = parseOptionalCostPrompt(REAL_OPTIONAL_COST);
    expect(p?.sourceName).toBe("");
  });

  it("marks a non-repeatable optional cost", () => {
    const wf: WaitingFor = {
      type: "OptionalCostChoice",
      data: {
        player: 1,
        cost: { type: "Optional", data: { cost: { type: "Mana" } } },
        times_kicked: 0,
        pending_cast: { object_id: 3 },
      },
    };
    const p = parseOptionalCostPrompt(wf)!;
    expect(p.costKind).toBe("Optional");
    expect(p.repeatable).toBe(false);
    expect(p.timesKicked).toBe(0);
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseOptionalCostPrompt(undefined)).toBeNull();
    expect(parseOptionalCostPrompt({ type: "Priority", data: {} })).toBeNull();
  });

  it("returns null when the cost has no kind", () => {
    const wf: WaitingFor = {
      type: "OptionalCostChoice",
      data: { player: 0, cost: {}, times_kicked: 0, pending_cast: {} },
    };
    expect(parseOptionalCostPrompt(wf)).toBeNull();
  });
});

describe("decideOptionalCostAction", () => {
  it("builds the pay action", () => {
    expect(decideOptionalCostAction(true)).toEqual({
      type: "DecideOptionalCost",
      data: { pay: true },
    });
  });

  it("builds the decline action", () => {
    expect(decideOptionalCostAction(false)).toEqual({
      type: "DecideOptionalCost",
      data: { pay: false },
    });
  });
});
