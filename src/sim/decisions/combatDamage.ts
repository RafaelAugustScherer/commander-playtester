// Assigning combat damage: an attacker splitting its damage among its
// blockers (with optional trample spillover), or a blocker splitting its
// damage among the attackers it blocks. The engine surfaces two
// waiting_for shapes:
// - `AssignCombatDamage` { player, attacker_id, total_damage,
//   blockers: [{blocker_id, lethal_minimum}], trample: TrampleKind|null,
//   defending_player, attack_target, pw_loyalty?, pw_controller? } — the
//   attacker deals `total_damage`; each blocker needs `lethal_minimum` to
//   die, and any leftover may spill over when `trample` is not null. The
//   spillover goes to the attack target's controller when it is a
//   planeswalker (`pw_loyalty`/`pw_controller` present), otherwise to the
//   defending player. Answered with `AssignCombatDamage { assignments:
//   [blocker_id, number][], trample_damage, controller_damage }` —
//   `assignments` index-aligned to `blockers`, and
//   sum(assignments) + trample_damage + controller_damage === total_damage.
// - `AssignBlockerDamage` { player, blocker_id, total_damage,
//   attackers: number[] } — a blocker splits its `total_damage` among the
//   attackers it blocks. Answered with `AssignBlockerDamage { assignments:
//   [attacker_id, number][] }` index-aligned to `attackers`, summing to
//   `total_damage`.
// Shapes confirmed against phase-rs v0.71.0 (issue #47).

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One blocker an attacker must assign lethal (or more) damage to. */
export interface AttackerDamageBlocker {
  id: number;
  name: string;
  lethalMinimum: number;
}

export interface AttackerDamagePrompt {
  kind: "attacker";
  player: number;
  attackerName: string;
  totalDamage: number;
  blockers: AttackerDamageBlocker[];
  hasTrample: boolean;
  /** True when trample spillover goes to a planeswalker's controller rather than the defending player. */
  tramplesToController: boolean;
}

/** One attacker a blocker must split its damage among. */
export interface BlockerDamageAttacker {
  id: number;
  name: string;
}

export interface BlockerDamagePrompt {
  kind: "blocker";
  player: number;
  blockerName: string;
  totalDamage: number;
  attackers: BlockerDamageAttacker[];
}

export type CombatDamagePrompt = AttackerDamagePrompt | BlockerDamagePrompt;

function parseAssignCombatDamage(
  d: any,
  state?: GameState,
): AttackerDamagePrompt | null {
  const rawBlockers = Array.isArray(d.blockers) ? d.blockers : [];
  const blockers = rawBlockers
    .filter((b: any) => typeof b?.blocker_id === "number")
    .map((b: any) => ({
      id: b.blocker_id,
      name: state?.objects?.[b.blocker_id]?.name ?? "",
      lethalMinimum:
        typeof b.lethal_minimum === "number" ? b.lethal_minimum : 0,
    }));
  if (blockers.length === 0) return null;
  return {
    kind: "attacker",
    player: typeof d.player === "number" ? d.player : 0,
    attackerName: state?.objects?.[d.attacker_id]?.name ?? "",
    totalDamage: typeof d.total_damage === "number" ? d.total_damage : 0,
    blockers,
    hasTrample: d.trample != null,
    tramplesToController: d.pw_loyalty != null || d.pw_controller != null,
  };
}

function parseAssignBlockerDamage(
  d: any,
  state?: GameState,
): BlockerDamagePrompt | null {
  const rawAttackers = Array.isArray(d.attackers) ? d.attackers : [];
  const attackers = rawAttackers
    .filter((id: any) => typeof id === "number")
    .map((id: number) => ({ id, name: state?.objects?.[id]?.name ?? "" }));
  if (attackers.length === 0) return null;
  return {
    kind: "blocker",
    player: typeof d.player === "number" ? d.player : 0,
    blockerName: state?.objects?.[d.blocker_id]?.name ?? "",
    totalDamage: typeof d.total_damage === "number" ? d.total_damage : 0,
    attackers,
  };
}

/** Read a combat-damage-assignment decision aimed at the human, or null. */
export function parseCombatDamagePrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): CombatDamagePrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "AssignCombatDamage":
      return parseAssignCombatDamage(d, state);
    case "AssignBlockerDamage":
      return parseAssignBlockerDamage(d, state);
    default:
      return null;
  }
}

/** Submit an attacker's damage split among its blockers, plus any trample spillover. */
export function assignCombatDamageAction(
  assignments: [number, number][],
  trampleDamage: number,
  controllerDamage: number,
): {
  type: string;
  data: {
    assignments: [number, number][];
    trample_damage: number;
    controller_damage: number;
  };
} {
  return {
    type: "AssignCombatDamage",
    data: {
      assignments,
      trample_damage: trampleDamage,
      controller_damage: controllerDamage,
    },
  };
}

/** Submit a blocker's damage split among the attackers it blocks. */
export function assignBlockerDamageAction(
  assignments: [number, number][],
): { type: string; data: { assignments: [number, number][] } } {
  return { type: "AssignBlockerDamage", data: { assignments } };
}
