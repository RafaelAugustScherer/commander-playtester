import { describe, it, expect } from "vitest";
import { parseXValuePrompt, chooseXAction } from "./xValue";
import type { GameObject, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// ChooseXValue { player, min?, max, pending_cast, x_cost_previews? }.
const REAL_CHOOSE_X: WaitingFor = {
  type: "ChooseXValue",
  data: {
    player: 0,
    min: 1,
    max: 6,
    pending_cast: { object_id: 12, card_id: 900 },
    x_cost_previews: [
      [1, { generic: 1 }],
      [2, { generic: 2 }],
    ],
  },
};

const OBJECTS: Record<string, GameObject> = {
  12: { id: 12, name: "Fireball", zone: "Stack" },
};

describe("parseXValuePrompt", () => {
  it("parses the player, source name, min and max", () => {
    const p = parseXValuePrompt(REAL_CHOOSE_X, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.sourceName).toBe("Fireball");
    expect(p.min).toBe(1);
    expect(p.max).toBe(6);
  });

  it("falls back to an empty source name when the object is unknown", () => {
    const p = parseXValuePrompt(REAL_CHOOSE_X);
    expect(p?.sourceName).toBe("");
  });

  it("defaults min to 0 when absent", () => {
    const wf: WaitingFor = {
      type: "ChooseXValue",
      data: { player: 1, max: 10, pending_cast: { object_id: 3 } },
    };
    const p = parseXValuePrompt(wf)!;
    expect(p.min).toBe(0);
    expect(p.max).toBe(10);
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseXValuePrompt(undefined)).toBeNull();
    expect(parseXValuePrompt({ type: "Priority", data: {} })).toBeNull();
  });

  it("returns null when max is missing", () => {
    const wf: WaitingFor = {
      type: "ChooseXValue",
      data: { player: 0, pending_cast: {} },
    };
    expect(parseXValuePrompt(wf)).toBeNull();
  });
});

describe("chooseXAction", () => {
  it("builds the ChooseX action", () => {
    expect(chooseXAction(3)).toEqual({
      type: "ChooseX",
      data: { value: 3 },
    });
  });

  it("builds the action for a zero X", () => {
    expect(chooseXAction(0)).toEqual({
      type: "ChooseX",
      data: { value: 0 },
    });
  });
});
