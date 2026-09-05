// Ordering simultaneous triggers — when two or more of the acting player's
// triggered abilities go on the stack at the same time, that player chooses
// the order they're put on the stack in. The engine surfaces an
// `OrderTriggers` waiting_for whose `data` carries the acting `player` and
// the pending `triggers` (each a `PendingTriggerSummary`: `source_id`,
// `source_name`, `description`). The seat answers by submitting
// `OrderTriggers` with an `order`: a permutation of the indices
// `0..triggers.length-1` into that array. The engine puts them on the stack
// in that order, so the first index goes on first and resolves last (LIFO).

import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PendingTriggerSummary {
  sourceId: number;
  sourceName: string;
  description: string;
}

export interface OrderTriggersPrompt {
  player: number;
  triggers: PendingTriggerSummary[];
}

/** Read an "order your triggers" decision aimed at the human, or null. */
export function parseOrderTriggersPrompt(
  wf: WaitingFor | undefined,
): OrderTriggersPrompt | null {
  if (!wf || wf.type !== "OrderTriggers") return null;
  const d: any = wf.data ?? {};
  const rawTriggers = d.triggers;
  if (!Array.isArray(rawTriggers) || rawTriggers.length === 0) return null;

  const triggers: PendingTriggerSummary[] = rawTriggers.map((t: any) => ({
    sourceId: typeof t?.source_id === "number" ? t.source_id : 0,
    sourceName: typeof t?.source_name === "string" ? t.source_name : "",
    description: typeof t?.description === "string" ? t.description : "",
  }));

  return {
    player: typeof d.player === "number" ? d.player : 0,
    triggers,
  };
}

/** Submit the chosen stack order back to the engine. */
export function orderTriggersAction(order: number[]): {
  type: string;
  data: { order: number[] };
} {
  return { type: "OrderTriggers", data: { order } };
}
