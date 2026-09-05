// "You may pay an additional cost" — kicker, buyback, entwine, escalate and the
// like. When a spell offers one, the engine surfaces an `OptionalCostChoice`
// waiting_for whose `data` carries the acting `player`, the `cost`
// (an `AdditionalCost`: Optional / Kicker / Required / Choice), how many times
// it has been paid already (`times_kicked`, for repeatable kickers), and the
// `pending_cast` naming the spell. The seat answers by submitting
// `DecideOptionalCost` with `pay` true or false.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OptionalCostPrompt {
  player: number;
  /** The spell offering the cost, for the prompt (may be empty). */
  sourceName: string;
  /** The kind of additional cost — "Kicker", "Optional", "Required", "Choice". */
  costKind: string;
  /** How many times this repeatable cost has already been paid. */
  timesKicked: number;
  /** True when the cost may be paid more than once (multikicker-style). */
  repeatable: boolean;
}

/** Read a "pay an optional cost" decision aimed at the human, or null. */
export function parseOptionalCostPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): OptionalCostPrompt | null {
  if (!wf || wf.type !== "OptionalCostChoice") return null;
  const d: any = wf.data ?? {};
  const cost = d.cost ?? {};
  const costKind: string = typeof cost.type === "string" ? cost.type : "";
  if (!costKind) return null;

  const srcId = d.pending_cast?.object_id;
  const sourceName =
    (typeof srcId === "number" && objects?.[srcId]?.name) || "";

  return {
    player: typeof d.player === "number" ? d.player : 0,
    sourceName,
    costKind,
    timesKicked: typeof d.times_kicked === "number" ? d.times_kicked : 0,
    repeatable: !!cost.data?.repeatable,
  };
}

/** Submit the pay/don't-pay answer back to the engine. */
export function decideOptionalCostAction(pay: boolean): {
  type: string;
  data: { pay: boolean };
} {
  return { type: "DecideOptionalCost", data: { pay } };
}
