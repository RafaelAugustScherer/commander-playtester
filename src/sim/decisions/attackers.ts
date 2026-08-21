// Declaring attackers is a `DeclareAttackers` waiting_for. The engine lists the
// creatures that may attack and, per attacker, the legal things it may attack
// (a player, planeswalker, or battle). We echo those target refs straight back
// in the submitted action, so we never have to construct them ourselves.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The vendored engine lists creatures with Defender in `valid_attacker_ids`
// regardless of the keyword, so we drop them here — a Defender creature is
// never a legal attacker. (A temporary "can attack as though it had no
// defender" grant does not clear the keyword, so those stay filtered too.)
function hasDefender(o: GameObject | undefined): boolean {
  return Array.isArray(o?.keywords) && o.keywords.includes("Defender");
}

/** An attack target ref as the engine phrases it, e.g. `{type:"Player",data:1}`. */
export type AttackTargetRef = any;

export interface AttackerOption {
  attackerId: number;
  /** Legal things this creature may attack (echo one back when declaring). */
  targets: AttackTargetRef[];
}

export interface AttackersPrompt {
  player: number;
  attackers: AttackerOption[];
}

/** Read a DeclareAttackers waiting_for, or null if it isn't one / has no attackers. */
export function parseAttackersPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): AttackersPrompt | null {
  if (!wf || wf.type !== "DeclareAttackers") return null;
  const d = wf.data ?? {};
  const ids: unknown = d.valid_attacker_ids;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const byAttacker = d.valid_attack_targets_by_attacker ?? {};
  const attackers: AttackerOption[] = ids
    .filter((id): id is number => typeof id === "number")
    .filter((id) => !hasDefender(objects?.[id]))
    .map((id) => ({
      attackerId: id,
      targets: Array.isArray(byAttacker[id]) ? byAttacker[id] : [],
    }));
  if (attackers.length === 0) return null;
  return {
    player: typeof d.player === "number" ? d.player : 0,
    attackers,
  };
}

/** Build the DeclareAttackers action from chosen [attackerId, targetRef] pairs. */
export function declareAttackersAction(attacks: [number, AttackTargetRef][]): {
  type: string;
  data: { attacks: [number, AttackTargetRef][]; bands: [] };
} {
  return { type: "DeclareAttackers", data: { attacks, bands: [] } };
}
