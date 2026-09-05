import { describe, it, expect } from "vitest";
import {
  parseCombatDamagePrompt,
  assignCombatDamageAction,
  assignBlockerDamageAction,
} from "./combatDamage";
import type { GameState, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs v0.71.0 (issue #47): AssignCombatDamage
// { player, attacker_id, total_damage, blockers: [{blocker_id,
// lethal_minimum}], trample: TrampleKind|null, defending_player,
// attack_target, pw_loyalty?, pw_controller? }.
const REAL_ASSIGN_COMBAT_DAMAGE: WaitingFor = {
  type: "AssignCombatDamage",
  data: {
    player: 0,
    attacker_id: 12,
    total_damage: 6,
    blockers: [
      { blocker_id: 34, lethal_minimum: 2 },
      { blocker_id: 56, lethal_minimum: 3 },
    ],
    trample: { type: "Regular" },
    defending_player: 1,
    attack_target: { Player: 1 },
  },
};

// Shape confirmed against phase-rs v0.71.0 (issue #47): AssignBlockerDamage
// { player, blocker_id, total_damage, attackers: number[] }.
const REAL_ASSIGN_BLOCKER_DAMAGE: WaitingFor = {
  type: "AssignBlockerDamage",
  data: {
    player: 0,
    blocker_id: 34,
    total_damage: 4,
    attackers: [12, 78],
  },
};

const STATE: GameState = {
  turn_number: 1,
  phase: "Combat",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    12: { id: 12, name: "Ghalta, Primal Hunger", zone: "Battlefield" },
    34: { id: 34, name: "Elvish Mystic", zone: "Battlefield" },
    56: { id: 56, name: "Runeclaw Bear", zone: "Battlefield" },
    78: { id: 78, name: "Llanowar Elves", zone: "Battlefield" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

describe("parseCombatDamagePrompt", () => {
  describe("AssignCombatDamage", () => {
    it("parses the attacker, blockers, and trample fields for a player-defender attack", () => {
      const p = parseCombatDamagePrompt(REAL_ASSIGN_COMBAT_DAMAGE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "attacker") throw new Error("expected attacker");
      expect(p.player).toBe(0);
      expect(p.attackerName).toBe("Ghalta, Primal Hunger");
      expect(p.totalDamage).toBe(6);
      expect(p.blockers).toEqual([
        { id: 34, name: "Elvish Mystic", lethalMinimum: 2 },
        { id: 56, name: "Runeclaw Bear", lethalMinimum: 3 },
      ]);
      expect(p.hasTrample).toBe(true);
      expect(p.tramplesToController).toBe(false);
    });

    it("routes trample to the controller when the attack target is a planeswalker", () => {
      const wf: WaitingFor = {
        type: "AssignCombatDamage",
        data: {
          player: 0,
          attacker_id: 12,
          total_damage: 6,
          blockers: [{ blocker_id: 34, lethal_minimum: 2 }],
          trample: { type: "Regular" },
          defending_player: 1,
          attack_target: { Object: 99 },
          pw_loyalty: 5,
          pw_controller: 1,
        },
      };
      const p = parseCombatDamagePrompt(wf, STATE)!;
      if (p.kind !== "attacker") throw new Error("expected attacker");
      expect(p.tramplesToController).toBe(true);
    });

    it("has hasTrample false when trample is null", () => {
      const wf: WaitingFor = {
        type: "AssignCombatDamage",
        data: {
          player: 0,
          attacker_id: 12,
          total_damage: 5,
          blockers: [{ blocker_id: 34, lethal_minimum: 2 }],
          trample: null,
          defending_player: 1,
          attack_target: { Player: 1 },
        },
      };
      const p = parseCombatDamagePrompt(wf, STATE)!;
      if (p.kind !== "attacker") throw new Error("expected attacker");
      expect(p.hasTrample).toBe(false);
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseCombatDamagePrompt(REAL_ASSIGN_COMBAT_DAMAGE);
      if (p?.kind !== "attacker") throw new Error("expected attacker");
      expect(p.attackerName).toBe("");
      expect(p.blockers.map((b) => b.name)).toEqual(["", ""]);
    });

    it("returns null when blockers is empty", () => {
      const wf: WaitingFor = {
        type: "AssignCombatDamage",
        data: {
          player: 0,
          attacker_id: 12,
          total_damage: 6,
          blockers: [],
          trample: null,
          defending_player: 1,
          attack_target: { Player: 1 },
        },
      };
      expect(parseCombatDamagePrompt(wf)).toBeNull();
    });
  });

  describe("AssignBlockerDamage", () => {
    it("parses the blocker and attackers with labels", () => {
      const p = parseCombatDamagePrompt(REAL_ASSIGN_BLOCKER_DAMAGE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "blocker") throw new Error("expected blocker");
      expect(p.player).toBe(0);
      expect(p.blockerName).toBe("Elvish Mystic");
      expect(p.totalDamage).toBe(4);
      expect(p.attackers).toEqual([
        { id: 12, name: "Ghalta, Primal Hunger" },
        { id: 78, name: "Llanowar Elves" },
      ]);
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseCombatDamagePrompt(REAL_ASSIGN_BLOCKER_DAMAGE);
      if (p?.kind !== "blocker") throw new Error("expected blocker");
      expect(p.blockerName).toBe("");
      expect(p.attackers.map((a) => a.name)).toEqual(["", ""]);
    });

    it("returns null when attackers is empty", () => {
      const wf: WaitingFor = {
        type: "AssignBlockerDamage",
        data: { player: 0, blocker_id: 34, total_damage: 4, attackers: [] },
      };
      expect(parseCombatDamagePrompt(wf)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseCombatDamagePrompt(undefined)).toBeNull();
    expect(parseCombatDamagePrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("assignCombatDamageAction", () => {
  it("echoes each blocker_id verbatim with its assigned amount plus spillover", () => {
    expect(
      assignCombatDamageAction(
        [
          [34, 2],
          [56, 3],
        ],
        1,
        0,
      ),
    ).toEqual({
      type: "AssignCombatDamage",
      data: {
        assignments: [
          [34, 2],
          [56, 3],
        ],
        trample_damage: 1,
        controller_damage: 0,
      },
    });
  });
});

describe("assignBlockerDamageAction", () => {
  it("echoes each attacker_id verbatim with its assigned amount", () => {
    expect(
      assignBlockerDamageAction([
        [12, 1],
        [78, 3],
      ]),
    ).toEqual({
      type: "AssignBlockerDamage",
      data: {
        assignments: [
          [12, 1],
          [78, 3],
        ],
      },
    });
  });
});
