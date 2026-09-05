import { describe, it, expect } from "vitest";
import {
  parseCountersPrompt,
  distributeAmongAction,
  proliferateAction,
  populateAction,
} from "./counters";
import type { GameState, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (DistributeAmongModal) at v0.71.0: DistributeAmong { player, total,
// targets: TargetRef[], unit: DistributionUnit }, where DistributionUnit is
// {type:"Damage"} | {type:"EvenSplitDamage"} | {type:"Counters", data:
// string} | {type:"Life"}.
const REAL_DISTRIBUTE: WaitingFor = {
  type: "DistributeAmong",
  data: {
    player: 0,
    total: 3,
    targets: [{ Object: 12 }, { Player: 1 }],
    unit: { type: "Counters", data: "+1/+1" },
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (ProliferateModal) at v0.71.0: ProliferateChoice { player, eligible: TargetRef[] }.
const REAL_PROLIFERATE: WaitingFor = {
  type: "ProliferateChoice",
  data: {
    player: 0,
    eligible: [{ Object: 12 }, { Object: 34 }, { Player: 0 }],
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (TargetingOverlay) at v0.71.0: PopulateChoice { player, source_id, valid_tokens: ObjId[] }.
const REAL_POPULATE: WaitingFor = {
  type: "PopulateChoice",
  data: {
    player: 0,
    source_id: 90,
    valid_tokens: [12, 34],
  },
};

const STATE: GameState = {
  turn_number: 1,
  phase: "Main1",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    12: { id: 12, name: "Saproling Token", zone: "Battlefield" },
    34: { id: 34, name: "Elvish Mystic", zone: "Battlefield" },
    90: { id: 90, name: "Rite of Replication", zone: "Stack" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

describe("parseCountersPrompt", () => {
  describe("DistributeAmong", () => {
    it("parses the player, total, unit and targets with labels", () => {
      const p = parseCountersPrompt(REAL_DISTRIBUTE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "distribute") throw new Error("expected distribute");
      expect(p.player).toBe(0);
      expect(p.total).toBe(3);
      expect(p.unitKind).toBe("Counters");
      expect(p.counterLabel).toBe("+1/+1");
      expect(p.targets).toEqual([
        { ref: { Object: 12 }, label: "Saproling Token" },
        { ref: { Player: 1 }, label: "Seat 1" },
      ]);
    });

    it("labels seat 0 as You and omits counterLabel for Damage", () => {
      const wf: WaitingFor = {
        type: "DistributeAmong",
        data: {
          player: 0,
          total: 5,
          targets: [{ Player: 0 }],
          unit: { type: "Damage" },
        },
      };
      const p = parseCountersPrompt(wf)!;
      if (p.kind !== "distribute") throw new Error("expected distribute");
      expect(p.unitKind).toBe("Damage");
      expect(p.counterLabel).toBeUndefined();
      expect(p.targets).toEqual([{ ref: { Player: 0 }, label: "You" }]);
    });

    it("parses EvenSplitDamage and Life units", () => {
      const evenSplit = parseCountersPrompt({
        type: "DistributeAmong",
        data: { player: 0, total: 4, targets: [{ Object: 12 }], unit: { type: "EvenSplitDamage" } },
      })!;
      if (evenSplit.kind !== "distribute") throw new Error("expected distribute");
      expect(evenSplit.unitKind).toBe("EvenSplitDamage");

      const life = parseCountersPrompt({
        type: "DistributeAmong",
        data: { player: 0, total: 2, targets: [{ Object: 12 }], unit: { type: "Life" } },
      })!;
      if (life.kind !== "distribute") throw new Error("expected distribute");
      expect(life.unitKind).toBe("Life");
    });

    it("returns null when targets is empty", () => {
      const wf: WaitingFor = {
        type: "DistributeAmong",
        data: { player: 0, total: 3, targets: [], unit: { type: "Damage" } },
      };
      expect(parseCountersPrompt(wf)).toBeNull();
    });
  });

  describe("ProliferateChoice", () => {
    it("parses the eligible targets with labels", () => {
      const p = parseCountersPrompt(REAL_PROLIFERATE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "proliferate") throw new Error("expected proliferate");
      expect(p.player).toBe(0);
      expect(p.options).toEqual([
        { ref: { Object: 12 }, label: "Saproling Token" },
        { ref: { Object: 34 }, label: "Elvish Mystic" },
        { ref: { Player: 0 }, label: "You" },
      ]);
    });

    it("returns null when eligible is empty", () => {
      const wf: WaitingFor = {
        type: "ProliferateChoice",
        data: { player: 0, eligible: [] },
      };
      expect(parseCountersPrompt(wf)).toBeNull();
    });
  });

  describe("PopulateChoice", () => {
    it("parses the source name and valid tokens", () => {
      const p = parseCountersPrompt(REAL_POPULATE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "populate") throw new Error("expected populate");
      expect(p.player).toBe(0);
      expect(p.sourceName).toBe("Rite of Replication");
      expect(p.tokens).toEqual([
        { id: 12, name: "Saproling Token" },
        { id: 34, name: "Elvish Mystic" },
      ]);
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseCountersPrompt(REAL_POPULATE);
      if (p?.kind !== "populate") throw new Error("expected populate");
      expect(p.sourceName).toBe("");
      expect(p.tokens.map((tk) => tk.name)).toEqual(["", ""]);
    });

    it("returns null when valid_tokens is empty", () => {
      const wf: WaitingFor = {
        type: "PopulateChoice",
        data: { player: 0, source_id: 90, valid_tokens: [] },
      };
      expect(parseCountersPrompt(wf)).toBeNull();
    });
  });

  it("returns null for MoveCountersDistribution and RemoveCountersChoice (second pass, AI-driven)", () => {
    const moveCounters: WaitingFor = {
      type: "MoveCountersDistribution",
      data: {
        player: 0,
        source_id: 12,
        available: [["+1/+1", 3]],
        destinations: [34],
        pending_effect: {},
      },
    };
    const removeCounters: WaitingFor = {
      type: "RemoveCountersChoice",
      data: {
        player: 0,
        source_id: 12,
        available: [["+1/+1", 3]],
        pending_effect: {},
      },
    };
    expect(parseCountersPrompt(moveCounters)).toBeNull();
    expect(parseCountersPrompt(removeCounters)).toBeNull();
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseCountersPrompt(undefined)).toBeNull();
    expect(parseCountersPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("distributeAmongAction", () => {
  it("echoes each TargetRef verbatim with its assigned amount", () => {
    expect(
      distributeAmongAction([
        [{ Object: 12 }, 2],
        [{ Player: 1 }, 1],
      ]),
    ).toEqual({
      type: "DistributeAmong",
      data: {
        distribution: [
          [{ Object: 12 }, 2],
          [{ Player: 1 }, 1],
        ],
      },
    });
  });
});

describe("proliferateAction", () => {
  it("wraps the chosen refs as a SelectTargets action", () => {
    expect(proliferateAction([{ Object: 12 }, { Player: 0 }])).toEqual({
      type: "SelectTargets",
      data: { targets: [{ Object: 12 }, { Player: 0 }] },
    });
  });

  it("allows an empty subset", () => {
    expect(proliferateAction([])).toEqual({
      type: "SelectTargets",
      data: { targets: [] },
    });
  });
});

describe("populateAction", () => {
  it("wraps the chosen token id as a ChooseTarget action", () => {
    expect(populateAction(34)).toEqual({
      type: "ChooseTarget",
      data: { target: { Object: 34 } },
    });
  });
});
