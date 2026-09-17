// "Roll N dice and ignore some" (Barbarian Class, Wyll, planar/attraction die
// tricks). The engine surfaces a `DieKeepChoice` whose `results` are the natural
// rolls in roll order, `ignorable_indices` are the roll indices the player may
// ignore (CR 706.6 — the engine decides which are ignorable; the client must
// never compute "the lowest"), and `ignore_count` is how many to ignore.
// Answered with `SelectDieRolls { ignore_indices }`, exactly `ignore_count`
// indices drawn from `ignorable_indices`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts (DieKeepChoice,
// SelectDieRolls) at v0.86.0.

import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DieKeepPrompt {
  player: number;
  /** Natural results, in roll order. */
  results: number[];
  /** Roll indices the player is allowed to ignore. */
  ignorableIndices: number[];
  /** How many rolls must be ignored. */
  ignoreCount: number;
}

/** Read a "roll dice, ignore some" decision aimed at the human, or null. */
export function parseDieKeepPrompt(
  wf: WaitingFor | undefined,
): DieKeepPrompt | null {
  if (!wf || wf.type !== "DieKeepChoice") return null;
  const d: any = wf.data ?? {};
  const results: number[] = Array.isArray(d.results)
    ? d.results.filter((r: unknown): r is number => typeof r === "number")
    : [];
  const ignorableIndices: number[] = Array.isArray(d.ignorable_indices)
    ? d.ignorable_indices.filter((i: unknown): i is number => typeof i === "number")
    : [];
  const ignoreCount = typeof d.ignore_count === "number" ? d.ignore_count : 0;
  if (results.length === 0 || ignoreCount === 0) return null;
  return {
    player: typeof d.player === "number" ? d.player : 0,
    results,
    ignorableIndices,
    ignoreCount,
  };
}

/** Submit the roll indices (into `results`) to ignore. */
export function selectDieRollsAction(ignoreIndices: number[]): {
  type: string;
  data: { ignore_indices: number[] };
} {
  return { type: "SelectDieRolls", data: { ignore_indices: ignoreIndices } };
}
