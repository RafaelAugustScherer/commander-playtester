// Choosing what a copy effect copies, and how a copy is retargeted. The
// engine surfaces two waiting_for shapes:
// - `CopyTargetChoice` { player, source_id, valid_targets: ObjId[],
//   max_mana_value?, purpose? } — pick one object among `valid_targets` for
//   the copy to become. Answered with `ChooseTarget { target: { Object: id } }`.
// - `CopyRetarget` { player, copy_id, target_slots: CopyTargetSlot[],
//   current_slot? } — `CopyTargetSlot` is `{ current?: TargetRef | null,
//   legal_alternatives: TargetRef[] }`. The engine fills one slot at a time
//   (`current_slot`, default 0); pick a target for that slot from its
//   `legal_alternatives`, answered with `ChooseTarget { target }` (the chosen
//   `TargetRef` echoed verbatim). Once every slot already has a `current`,
//   the player may instead accept every proposed target with
//   `KeepAllCopyTargets`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts
// (TargetingOverlay) at v0.71.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single legal target: an object on the board, or a player seat. */
export type CopyTargetRef = { Object: number } | { Player: number };

/** One object offered up to become the copy. */
export interface CopyTargetOption {
  id: number;
  name: string;
}

export interface CopyTargetPrompt {
  kind: "copyTarget";
  player: number;
  sourceName: string;
  targets: CopyTargetOption[];
}

/** One legal alternative for the current retarget slot. */
export interface CopyRetargetOption {
  ref: CopyTargetRef;
  label: string;
}

export interface CopyRetargetPrompt {
  kind: "retarget";
  player: number;
  /** 0-based index of the slot the engine is currently filling. */
  slotIndex: number;
  slotCount: number;
  options: CopyRetargetOption[];
  /** True when every slot already has a current target, so all may be kept at once. */
  canKeepAll: boolean;
}

export type CopyChoicePrompt = CopyTargetPrompt | CopyRetargetPrompt;

function toRef(t: any): CopyTargetRef | null {
  if (t && typeof t === "object") {
    if (typeof t.Object === "number") return { Object: t.Object };
    if (typeof t.Player === "number") return { Player: t.Player };
  }
  return null;
}

function refLabel(ref: CopyTargetRef, state?: GameState): string {
  if ("Object" in ref) return state?.objects?.[ref.Object]?.name ?? "";
  return ref.Player === 0 ? "You" : `Seat ${ref.Player}`;
}

function parseCopyTarget(d: any, state?: GameState): CopyTargetPrompt | null {
  const validTargets = Array.isArray(d.valid_targets) ? d.valid_targets : [];
  if (validTargets.length === 0) return null;
  return {
    kind: "copyTarget",
    player: typeof d.player === "number" ? d.player : 0,
    sourceName: state?.objects?.[d.source_id]?.name ?? "",
    targets: validTargets.map((id: number) => ({
      id,
      name: state?.objects?.[id]?.name ?? "",
    })),
  };
}

function parseCopyRetarget(d: any, state?: GameState): CopyRetargetPrompt | null {
  const slots = Array.isArray(d.target_slots) ? d.target_slots : [];
  const canKeepAll =
    slots.length > 0 && slots.every((s: any) => s?.current != null);
  const slotIndex = typeof d.current_slot === "number" ? d.current_slot : 0;
  const currentSlot = slots[slotIndex];
  const legalAlternatives = Array.isArray(currentSlot?.legal_alternatives)
    ? currentSlot.legal_alternatives
    : [];
  const options = legalAlternatives
    .map(toRef)
    .filter((r: CopyTargetRef | null): r is CopyTargetRef => r !== null)
    .map((ref: CopyTargetRef) => ({ ref, label: refLabel(ref, state) }));
  if (options.length === 0 && !canKeepAll) return null;
  return {
    kind: "retarget",
    player: typeof d.player === "number" ? d.player : 0,
    slotIndex,
    slotCount: slots.length,
    options,
    canKeepAll,
  };
}

/** Read a copy-choice or copy-retarget decision aimed at the human, or null. */
export function parseCopyChoicePrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): CopyChoicePrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "CopyTargetChoice":
      return parseCopyTarget(d, state);
    case "CopyRetarget":
      return parseCopyRetarget(d, state);
    default:
      return null;
  }
}

/** Submit the chosen target for a copy choice or a single retarget slot. */
export function chooseCopyTargetAction(target: CopyTargetRef): {
  type: string;
  data: { target: CopyTargetRef };
} {
  return { type: "ChooseTarget", data: { target } };
}

/** Accept every proposed target on a retarget where all slots already have one. */
export function keepAllCopyTargetsAction(): { type: string } {
  return { type: "KeepAllCopyTargets" };
}
