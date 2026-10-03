import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CostReduction {
  name: string;
  amount: string;
  multiplier: number;
}

export interface CostReductionOutcome {
  order: number[];
  hybridAnnouncement: string[];
  cost: string;
}

export interface CostReductionOrderPrompt {
  player: number;
  reductions: CostReduction[];
  outcomes: CostReductionOutcome[];
}

const SHARD_WORDS: Record<string, string> = {
  White: "W",
  Blue: "U",
  Black: "B",
  Red: "R",
  Green: "G",
  Colorless: "C",
  Snow: "S",
  X: "X",
  Two: "2",
};

function shardSymbol(shard: string): string {
  const words = shard.match(/[A-Z][a-z]*/g) ?? [shard];
  const phyrexian = words[0] === "Phyrexian";
  const parts = (phyrexian ? words.slice(1) : words).map(
    (w) => SHARD_WORDS[w] ?? w,
  );
  if (phyrexian) parts.push("P");
  return `{${parts.join("/")}}`;
}

export function manaCostText(cost: any): string {
  if (!cost || cost.type !== "Cost") return "{0}";
  const generic =
    typeof cost.generic === "number" && cost.generic > 0
      ? `{${cost.generic}}`
      : "";
  const shards: string[] = Array.isArray(cost.shards)
    ? cost.shards.filter((s: unknown): s is string => typeof s === "string")
    : [];
  return generic + shards.map(shardSymbol).join("") || "{0}";
}

function parseOutcome(o: any): CostReductionOutcome | null {
  if (!Array.isArray(o?.order)) return null;
  return {
    order: o.order.filter((i: unknown): i is number => typeof i === "number"),
    hybridAnnouncement: Array.isArray(o.hybrid_announcement)
      ? o.hybrid_announcement.filter((s: unknown): s is string => typeof s === "string")
      : [],
    cost: manaCostText(o.locked_cost),
  };
}

export function parseCostReductionOrderPrompt(
  wf: WaitingFor | undefined,
): CostReductionOrderPrompt | null {
  if (!wf || wf.type !== "OrderCostReductions") return null;
  const d: any = wf.data ?? {};
  const rawOutcomes: any[] = Array.isArray(d.outcomes) ? d.outcomes : [];
  const outcomes = rawOutcomes
    .map(parseOutcome)
    .filter((o): o is CostReductionOutcome => o !== null);
  if (outcomes.length === 0) return null;
  const rawReductions: any[] = Array.isArray(d.reductions) ? d.reductions : [];
  return {
    player: typeof d.player === "number" ? d.player : 0,
    reductions: rawReductions.map((r) => ({
      name: typeof r?.display_name === "string" ? r.display_name : "",
      amount: manaCostText(r?.amount),
      multiplier: typeof r?.multiplier === "number" ? r.multiplier : 1,
    })),
    outcomes,
  };
}

export function orderCostReductionsAction(outcome: CostReductionOutcome): {
  type: string;
  data: { order: number[]; hybrid_announcement: string[] };
} {
  return {
    type: "OrderCostReductions",
    data: { order: outcome.order, hybrid_announcement: outcome.hybridAnnouncement },
  };
}
