// "Choose X" — casting an X spell (or activating an X ability) asks the
// controller to pick X's value before the cost is paid or the effect
// resolves. The engine surfaces a `ChooseXValue` waiting_for whose `data`
// carries the acting `player`, an optional `min` (defaults to 0 when
// absent), the `max` X may be, the `pending_cast` naming the spell, and
// optionally `x_cost_previews` (the mana each candidate X would cost). The
// seat answers by submitting `ChooseX` with the chosen `value`.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface XValuePrompt {
  player: number;
  /** The spell or ability offering X, for the prompt (may be empty). */
  sourceName: string;
  /** The lowest value X may take. */
  min: number;
  /** The highest value X may take. */
  max: number;
}

/** Read a "choose X" decision aimed at the human, or null. */
export function parseXValuePrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): XValuePrompt | null {
  if (!wf || wf.type !== "ChooseXValue") return null;
  const d: any = wf.data ?? {};
  if (typeof d.max !== "number") return null;

  const srcId = d.pending_cast?.object_id;
  const sourceName =
    (typeof srcId === "number" && objects?.[srcId]?.name) || "";

  return {
    player: typeof d.player === "number" ? d.player : 0,
    sourceName,
    min: typeof d.min === "number" ? d.min : 0,
    max: d.max,
  };
}

/** Submit the chosen X value back to the engine. */
export function chooseXAction(value: number): {
  type: string;
  data: { value: number };
} {
  return { type: "ChooseX", data: { value } };
}
