import { describe, it, expect } from "vitest";
import {
  parseCopyChoicePrompt,
  chooseCopyTargetAction,
  keepAllCopyTargetsAction,
} from "./copyChoice";
import type { GameState, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (TargetingOverlay) at v0.71.0: CopyTargetChoice { player, source_id,
// valid_targets, max_mana_value?, purpose? }.
const REAL_COPY_TARGET: WaitingFor = {
  type: "CopyTargetChoice",
  data: {
    player: 0,
    source_id: 90,
    valid_targets: [12, 34],
    max_mana_value: 5,
    purpose: { type: "BecomeCopy" },
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (TargetingOverlay) at v0.71.0: CopyRetarget { player, copy_id,
// target_slots: CopyTargetSlot[], current_slot? }, where CopyTargetSlot is
// { current?: TargetRef | null, legal_alternatives: TargetRef[] }.
const REAL_RETARGET: WaitingFor = {
  type: "CopyRetarget",
  data: {
    player: 0,
    copy_id: 56,
    current_slot: 1,
    target_slots: [
      { current: { Object: 12 }, legal_alternatives: [{ Object: 12 }] },
      {
        current: null,
        legal_alternatives: [{ Object: 34 }, { Player: 1 }],
      },
    ],
  },
};

const REAL_RETARGET_KEEP_ALL: WaitingFor = {
  type: "CopyRetarget",
  data: {
    player: 0,
    copy_id: 56,
    current_slot: 0,
    target_slots: [
      { current: { Object: 12 }, legal_alternatives: [{ Object: 12 }] },
      { current: { Player: 0 }, legal_alternatives: [{ Player: 0 }] },
    ],
  },
};

const STATE: GameState = {
  turn_number: 1,
  phase: "Main1",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    12: { id: 12, name: "Clone", zone: "Battlefield" },
    34: { id: 34, name: "Nyxbloom Ancient", zone: "Battlefield" },
    56: { id: 56, name: "Lightning Bolt Copy", zone: "Stack" },
    90: { id: 90, name: "Vesuvan Doppelganger", zone: "Battlefield" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

describe("parseCopyChoicePrompt", () => {
  describe("CopyTargetChoice", () => {
    it("parses the player, source name and target options", () => {
      const p = parseCopyChoicePrompt(REAL_COPY_TARGET, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "copyTarget") throw new Error("expected copyTarget");
      expect(p.player).toBe(0);
      expect(p.sourceName).toBe("Vesuvan Doppelganger");
      expect(p.targets).toEqual([
        { id: 12, name: "Clone" },
        { id: 34, name: "Nyxbloom Ancient" },
      ]);
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseCopyChoicePrompt(REAL_COPY_TARGET);
      if (p?.kind !== "copyTarget") throw new Error("expected copyTarget");
      expect(p.sourceName).toBe("");
      expect(p.targets.map((t) => t.name)).toEqual(["", ""]);
    });

    it("returns null when valid_targets is empty", () => {
      const wf: WaitingFor = {
        type: "CopyTargetChoice",
        data: { player: 0, source_id: 90, valid_targets: [] },
      };
      expect(parseCopyChoicePrompt(wf)).toBeNull();
    });
  });

  describe("CopyRetarget", () => {
    it("parses the current slot's options, labeling objects and players", () => {
      const p = parseCopyChoicePrompt(REAL_RETARGET, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "retarget") throw new Error("expected retarget");
      expect(p.player).toBe(0);
      expect(p.slotIndex).toBe(1);
      expect(p.slotCount).toBe(2);
      expect(p.canKeepAll).toBe(false);
      expect(p.options).toEqual([
        { ref: { Object: 34 }, label: "Nyxbloom Ancient" },
        { ref: { Player: 1 }, label: "Seat 1" },
      ]);
    });

    it("labels seat 0 as You", () => {
      const wf: WaitingFor = {
        type: "CopyRetarget",
        data: {
          player: 0,
          copy_id: 56,
          current_slot: 0,
          target_slots: [
            { current: null, legal_alternatives: [{ Player: 0 }] },
          ],
        },
      };
      const p = parseCopyChoicePrompt(wf)!;
      if (p.kind !== "retarget") throw new Error("expected retarget");
      expect(p.options).toEqual([{ ref: { Player: 0 }, label: "You" }]);
    });

    it("defaults the current slot to 0 when current_slot is absent", () => {
      const wf: WaitingFor = {
        type: "CopyRetarget",
        data: {
          player: 0,
          copy_id: 56,
          target_slots: [
            { current: null, legal_alternatives: [{ Object: 12 }] },
          ],
        },
      };
      const p = parseCopyChoicePrompt(wf, STATE)!;
      if (p.kind !== "retarget") throw new Error("expected retarget");
      expect(p.slotIndex).toBe(0);
    });

    it("allows keeping all proposed targets once every slot has a current", () => {
      const p = parseCopyChoicePrompt(REAL_RETARGET_KEEP_ALL, STATE)!;
      if (p.kind !== "retarget") throw new Error("expected retarget");
      expect(p.canKeepAll).toBe(true);
      expect(p.options).toEqual([{ ref: { Object: 12 }, label: "Clone" }]);
    });

    it("returns null when the current slot has no alternatives and not every slot has a current", () => {
      const wf: WaitingFor = {
        type: "CopyRetarget",
        data: {
          player: 0,
          copy_id: 56,
          current_slot: 0,
          target_slots: [
            { current: null, legal_alternatives: [] },
            { current: null, legal_alternatives: [{ Object: 34 }] },
          ],
        },
      };
      expect(parseCopyChoicePrompt(wf)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseCopyChoicePrompt(undefined)).toBeNull();
    expect(parseCopyChoicePrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("chooseCopyTargetAction", () => {
  it("wraps an object id as a ChooseTarget action", () => {
    expect(chooseCopyTargetAction({ Object: 12 })).toEqual({
      type: "ChooseTarget",
      data: { target: { Object: 12 } },
    });
  });

  it("echoes a player TargetRef verbatim", () => {
    expect(chooseCopyTargetAction({ Player: 1 })).toEqual({
      type: "ChooseTarget",
      data: { target: { Player: 1 } },
    });
  });
});

describe("keepAllCopyTargetsAction", () => {
  it("builds the KeepAllCopyTargets action", () => {
    expect(keepAllCopyTargetsAction()).toEqual({ type: "KeepAllCopyTargets" });
  });
});
