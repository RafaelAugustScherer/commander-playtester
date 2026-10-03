import { describe, it, expect } from "vitest";
import {
  parseCostReductionOrderPrompt,
  orderCostReductionsAction,
  manaCostText,
} from "./costReductionOrder";
import type { WaitingFor } from "../../engine/types";

const ORDER: WaitingFor = {
  type: "OrderCostReductions",
  data: {
    player: 0,
    reductions: [
      {
        amount: { type: "Cost", shards: ["Blue"], generic: 0 },
        multiplier: 1,
        provenance: { type: "Affinity" },
        display_name: "Reducer A",
      },
      {
        amount: { type: "Cost", shards: [], generic: 2 },
        multiplier: 2,
        reach: "ColoredManaOnly",
        provenance: { type: "Undaunted" },
        display_name: "Reducer B",
      },
    ],
    hybrid_symbols: ["WhiteBlue"],
    outcomes: [
      {
        order: [1, 0],
        hybrid_announcement: ["White"],
        locked_cost: { type: "Cost", shards: ["White"], generic: 1 },
      },
      {
        order: [0, 1],
        locked_cost: { type: "Cost", shards: ["White", "Blue"], generic: 1 },
      },
    ],
    pending_cast: {},
  },
};

describe("parseCostReductionOrderPrompt", () => {
  it("parses reductions and each distinct outcome", () => {
    const p = parseCostReductionOrderPrompt(ORDER)!;
    expect(p.player).toBe(0);
    expect(p.reductions).toEqual([
      { name: "Reducer A", amount: "{U}", multiplier: 1 },
      { name: "Reducer B", amount: "{2}", multiplier: 2 },
    ]);
    expect(p.outcomes).toEqual([
      { order: [1, 0], hybridAnnouncement: ["White"], cost: "{1}{W}" },
      { order: [0, 1], hybridAnnouncement: [], cost: "{1}{W}{U}" },
    ]);
  });

  it("returns null without outcomes", () => {
    const wf: WaitingFor = {
      type: "OrderCostReductions",
      data: { player: 0, reductions: [], outcomes: [], pending_cast: {} },
    };
    expect(parseCostReductionOrderPrompt(wf)).toBeNull();
  });

  it("returns null for other decisions", () => {
    const wf: WaitingFor = { type: "OrderTriggers", data: { player: 0, triggers: [] } };
    expect(parseCostReductionOrderPrompt(wf)).toBeNull();
  });
});

describe("manaCostText", () => {
  it("renders hybrid, two-generic and phyrexian shards", () => {
    expect(
      manaCostText({
        type: "Cost",
        shards: ["WhiteBlue", "TwoGreen", "PhyrexianBlack", "PhyrexianRedWhite"],
        generic: 0,
      }),
    ).toBe("{W/U}{2/G}{B/P}{R/W/P}");
  });

  it("renders a free cost as {0}", () => {
    expect(manaCostText({ type: "Cost", shards: [], generic: 0 })).toBe("{0}");
    expect(manaCostText({ type: "NoCost" })).toBe("{0}");
  });
});

describe("orderCostReductionsAction", () => {
  it("echoes the chosen outcome's order and hybrid announcement", () => {
    const p = parseCostReductionOrderPrompt(ORDER)!;
    expect(orderCostReductionsAction(p.outcomes[0])).toEqual({
      type: "OrderCostReductions",
      data: { order: [1, 0], hybrid_announcement: ["White"] },
    });
  });
});
