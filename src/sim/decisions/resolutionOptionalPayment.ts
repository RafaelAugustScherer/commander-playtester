// "You may pay X or Y" at resolution (CR 118.9 disjunctive optional costs).
// Arrives as `ResolutionOptionalPaymentChoice`: `data.costs` lists the branches
// the engine has already filtered down to what's currently payable, each
// tagged with its original `index` (so a declined/unaffordable branch doesn't
// shift the others' indices). Submit `ChooseResolutionOptionalPaymentBranch`
// with either `{type:"Decline"}` or `{type:"Pay",data:{index}}`, echoing the
// branch's own index back — never re-deriving it from array position.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ResolutionOptionalPaymentOption {
  index: number;
  /** Human-readable label for the cost branch (e.g. "Pay {2}", "Discard 1 card"). */
  label: string;
}

export interface ResolutionOptionalPaymentPrompt {
  player: number;
  options: ResolutionOptionalPaymentOption[];
  /** The permanent/spell asking for the choice, for the prompt (may be empty). */
  sourceName: string;
}

/** Render a single serialized AbilityCost as a short player-facing label. */
/** Render a `{2}{U}` style bracket cost from a serialized ManaCost, or "{0}". */
function formatManaCost(mc: any): string {
  if (!mc || mc.type === "Free") return "{0}";
  const parts: string[] = [];
  if (typeof mc.generic === "number" && mc.generic > 0) parts.push(`{${mc.generic}}`);
  for (const shard of mc.shards ?? []) {
    if (typeof shard === "string") parts.push(`{${shard[0]}}`);
  }
  return parts.join("") || "{0}";
}

/** A cost's `count` field is either a bare number or `{ value }` (QuantityExpr::Fixed). */
function costCount(cost: any): number {
  return cost.count?.value ?? cost.count ?? 1;
}

const COST_FORMATTERS: Record<string, (cost: any) => string> = {
  Mana: (cost) => formatManaCost(cost.cost),
  PayLife: (cost) => `Pay ${typeof cost.amount === "number" ? cost.amount : 1} life`,
  Discard: (cost) => {
    const count = costCount(cost);
    return `Discard ${count} card${count === 1 ? "" : "s"}`;
  },
  Exile: (cost) => {
    const count = costCount(cost);
    return `Exile ${count} card${count === 1 ? "" : "s"}`;
  },
  Sacrifice: () => "Sacrifice",
  Tap: () => "{T}",
};

/** Render a single serialized AbilityCost as a short player-facing label. */
function formatCost(cost: any): string {
  const type = cost?.type;
  const formatter = typeof type === "string" ? COST_FORMATTERS[type] : undefined;
  if (formatter) return formatter(cost);
  return typeof type === "string" ? type : "Pay a cost";
}

/** Read a "choose an optional payment branch" decision aimed at the human, or null. */
export function parseResolutionOptionalPaymentPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): ResolutionOptionalPaymentPrompt | null {
  if (!wf || wf.type !== "ResolutionOptionalPaymentChoice") return null;
  const d: any = wf.data ?? {};
  const raw = Array.isArray(d.costs) ? d.costs : [];
  const options: ResolutionOptionalPaymentOption[] = raw
    .filter((c: any) => typeof c?.index === "number")
    .map((c: any) => ({ index: c.index, label: formatCost(c.cost) }));
  if (options.length === 0) return null;

  const sourceName = objects?.[d.source_id]?.name ?? "";
  return {
    player: typeof d.player === "number" ? d.player : 0,
    options,
    sourceName,
  };
}

/** Decline every branch of the optional payment. */
export function declineResolutionOptionalPaymentAction(): {
  type: string;
  data: { choice: { type: string } };
} {
  return {
    type: "ChooseResolutionOptionalPaymentBranch",
    data: { choice: { type: "Decline" } },
  };
}

/** Pay the branch at `index`, echoing the engine's own index back. */
export function payResolutionOptionalPaymentAction(index: number): {
  type: string;
  data: { choice: { type: string; data: { index: number } } };
} {
  return {
    type: "ChooseResolutionOptionalPaymentBranch",
    data: { choice: { type: "Pay", data: { index } } },
  };
}
