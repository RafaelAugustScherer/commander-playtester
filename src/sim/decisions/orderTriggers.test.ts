import { describe, it, expect } from "vitest";
import { parseOrderTriggersPrompt, orderTriggersAction } from "./orderTriggers";
import type { WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// OrderTriggers { player, triggers: PendingTriggerSummary[] } where each
// PendingTriggerSummary is { source_id, source_name, description }.
const REAL_ORDER_TRIGGERS: WaitingFor = {
  type: "OrderTriggers",
  data: {
    player: 0,
    triggers: [
      {
        source_id: 12,
        source_name: "Blood Artist",
        description: "Target player loses 1 life and you gain 1 life.",
      },
      {
        source_id: 34,
        source_name: "Zulaport Cutthroat",
        description: "Each opponent loses 1 life and you gain 1 life.",
      },
      {
        source_id: 56,
        source_name: "Cruel Celebrant",
        description: "Target opponent loses 1 life and you gain 1 life.",
      },
    ],
  },
};

describe("parseOrderTriggersPrompt", () => {
  it("parses the player and each pending trigger", () => {
    const p = parseOrderTriggersPrompt(REAL_ORDER_TRIGGERS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.triggers).toEqual([
      {
        sourceId: 12,
        sourceName: "Blood Artist",
        description: "Target player loses 1 life and you gain 1 life.",
      },
      {
        sourceId: 34,
        sourceName: "Zulaport Cutthroat",
        description: "Each opponent loses 1 life and you gain 1 life.",
      },
      {
        sourceId: 56,
        sourceName: "Cruel Celebrant",
        description: "Target opponent loses 1 life and you gain 1 life.",
      },
    ]);
  });

  it("falls back to empty strings when a trigger has no name or description", () => {
    const wf: WaitingFor = {
      type: "OrderTriggers",
      data: { player: 1, triggers: [{ source_id: 7 }] },
    };
    const p = parseOrderTriggersPrompt(wf)!;
    expect(p.triggers).toEqual([
      { sourceId: 7, sourceName: "", description: "" },
    ]);
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseOrderTriggersPrompt(undefined)).toBeNull();
    expect(parseOrderTriggersPrompt({ type: "Priority", data: {} })).toBeNull();
  });

  it("returns null when triggers is missing or empty", () => {
    expect(
      parseOrderTriggersPrompt({ type: "OrderTriggers", data: { player: 0 } }),
    ).toBeNull();
    expect(
      parseOrderTriggersPrompt({
        type: "OrderTriggers",
        data: { player: 0, triggers: [] },
      }),
    ).toBeNull();
  });
});

describe("orderTriggersAction", () => {
  it("builds the OrderTriggers action with the chosen permutation", () => {
    expect(orderTriggersAction([2, 0, 1])).toEqual({
      type: "OrderTriggers",
      data: { order: [2, 0, 1] },
    });
  });

  it("builds the identity order", () => {
    expect(orderTriggersAction([0, 1, 2])).toEqual({
      type: "OrderTriggers",
      data: { order: [0, 1, 2] },
    });
  });
});
