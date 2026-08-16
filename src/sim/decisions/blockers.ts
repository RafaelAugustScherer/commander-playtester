// Declaring blockers is a `DeclareBlockers` waiting_for. The engine lists which
// of your creatures may block and, per blocker, which attackers it may block.
// We submit a flat list of [blocker_id, attacker_id] assignments.

import type { WaitingFor } from "../../engine/types";

export interface BlockersPrompt {
  player: number;
  /** Blocker object id -> attacker object ids it may block. */
  blockers: Map<number, number[]>;
}

/** Read a DeclareBlockers waiting_for, or null if it isn't one / has no blockers. */
export function parseBlockersPrompt(
  wf: WaitingFor | undefined,
): BlockersPrompt | null {
  if (!wf || wf.type !== "DeclareBlockers") return null;
  const d = wf.data ?? {};
  const ids: unknown = d.valid_blocker_ids;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const byBlocker = d.valid_block_targets ?? {};
  const blockers = new Map<number, number[]>();
  for (const id of ids) {
    if (typeof id !== "number") continue;
    const attackers = byBlocker[id];
    blockers.set(
      id,
      Array.isArray(attackers)
        ? attackers.filter((x): x is number => typeof x === "number")
        : [],
    );
  }
  if (blockers.size === 0) return null;
  return { player: typeof d.player === "number" ? d.player : 0, blockers };
}

/** Build the DeclareBlockers action from chosen [blocker_id, attacker_id] pairs. */
export function declareBlockersAction(assignments: [number, number][]): {
  type: string;
  data: { assignments: [number, number][] };
} {
  return { type: "DeclareBlockers", data: { assignments } };
}
