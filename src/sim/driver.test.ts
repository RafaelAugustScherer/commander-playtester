import { describe, it, expect } from "vitest";
import { parseTargetPrompt, selectTargetsAction } from "./driver";
import type { WaitingFor } from "../engine/types";

// A real TriggerTargetSelection captured from the phase-rs WASM build (trimmed).
const REAL_TRIGGER: WaitingFor = {
  type: "TriggerTargetSelection",
  data: {
    description:
      "When ~ enters, exile another target creature or artifact until ~ leaves the battlefield.",
    player: 1,
    selection: {
      current_legal_targets: [{ Object: 222 }, { Object: 37 }],
      current_slot: 0,
    },
    source_id: 128,
    target_slots: [
      {
        effect_kind: "ChangeZone",
        legal_targets: [
          { Object: 222 },
          { Object: 37 },
          { Object: 27 },
          { Object: 100 },
        ],
        optional: false,
      },
    ],
  },
};

describe("parseTargetPrompt", () => {
  it("parses a real TriggerTargetSelection from its target_slots", () => {
    const p = parseTargetPrompt(REAL_TRIGGER);
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("TriggerTargetSelection");
    expect(p!.player).toBe(1);
    expect(p!.multi).toBe(false);
    expect(p!.min).toBe(1);
    expect(p!.max).toBe(1);
    expect(p!.slots).toHaveLength(1);
    expect(p!.slots[0].optional).toBe(false);
    expect(p!.slots[0].legalTargets).toEqual([
      { Object: 222 },
      { Object: 37 },
      { Object: 27 },
      { Object: 100 },
    ]);
  });

  it("handles a spell TargetSelection with multiple slots and a player target", () => {
    const wf: WaitingFor = {
      type: "TargetSelection",
      data: {
        player: 0,
        description: "Deal 3 damage to any target, then draw.",
        target_slots: [
          { legal_targets: [{ Object: 10 }, { Player: 2 }], optional: false },
          { legal_targets: [{ Object: 10 }], optional: true },
        ],
      },
    };
    const p = parseTargetPrompt(wf)!;
    expect(p.multi).toBe(false);
    expect(p.slots).toHaveLength(2);
    expect(p.min).toBe(2);
    expect(p.slots[0].legalTargets).toContainEqual({ Player: 2 });
    expect(p.slots[1].optional).toBe(true);
  });

  it("falls back to selection.current_legal_targets when target_slots is absent", () => {
    const wf: WaitingFor = {
      type: "TargetSelection",
      data: {
        player: 0,
        selection: { current_legal_targets: [{ Object: 5 }], current_slot: 0 },
      },
    };
    const p = parseTargetPrompt(wf)!;
    expect(p.slots[0].legalTargets).toEqual([{ Object: 5 }]);
  });

  it("parses MultiTargetSelection with min/max and bare object ids", () => {
    const wf: WaitingFor = {
      type: "MultiTargetSelection",
      data: { player: 0, legal_targets: [105, 106, 107], min_targets: 1, max_targets: 2 },
    };
    const p = parseTargetPrompt(wf)!;
    expect(p.multi).toBe(true);
    expect(p.min).toBe(1);
    expect(p.max).toBe(2);
    expect(p.slots[0].legalTargets).toEqual([
      { Object: 105 },
      { Object: 106 },
      { Object: 107 },
    ]);
  });

  it("returns null for non-target waiting_for and for empty target pools", () => {
    expect(parseTargetPrompt({ type: "Priority", data: { player: 0 } })).toBeNull();
    expect(parseTargetPrompt(undefined)).toBeNull();
    expect(
      parseTargetPrompt({ type: "TargetSelection", data: { target_slots: [] } }),
    ).toBeNull();
  });
});

describe("selectTargetsAction", () => {
  it("builds a SelectTargets action from chosen target refs", () => {
    expect(selectTargetsAction([{ Object: 222 }, { Player: 1 }])).toEqual({
      type: "SelectTargets",
      data: { targets: [{ Object: 222 }, { Player: 1 }] },
    });
  });
});
