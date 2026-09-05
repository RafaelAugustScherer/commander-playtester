// Keeping coin-flip results, and redistributing life totals. The engine
// surfaces two waiting_for shapes:
// - `CoinFlipKeepChoice` { player, results: boolean[], keep_count } — a set
//   of coin flips already made (`results[i]` true = heads, false = tails);
//   keep exactly `keep_count` of them. Answered with `SelectCoinFlips
//   { keep_indices }`, the indices (into `results`) to keep.
// - `RedistributeLifeTotals` { player, options: { assignment: [PlayerId,
//   number][] }[] } — each option is one full permutation of life totals
//   across seats; pick one. Answered with `SubmitLifeRedistribution
//   { option_index }`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts
// (CoinFlipKeepModal, LifeRedistributionModal) at v0.71.0.

import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CoinFlipPrompt {
  kind: "coinFlip";
  player: number;
  results: boolean[];
  keepCount: number;
}

/** One seat's life total under a life-redistribution option. */
export interface LifeAssignment {
  seat: number;
  life: number;
}

export interface LifeRedistributionPrompt {
  kind: "life";
  player: number;
  options: LifeAssignment[][];
}

export type CoinFlipLifePrompt = CoinFlipPrompt | LifeRedistributionPrompt;

function parseCoinFlipKeepChoice(d: any): CoinFlipPrompt | null {
  const results = Array.isArray(d.results) ? d.results : [];
  if (results.length === 0) return null;
  return {
    kind: "coinFlip",
    player: typeof d.player === "number" ? d.player : 0,
    results: results.map((r: unknown) => !!r),
    keepCount: typeof d.keep_count === "number" ? d.keep_count : 0,
  };
}

function parseRedistributeLifeTotals(d: any): LifeRedistributionPrompt | null {
  const options = Array.isArray(d.options) ? d.options : [];
  if (options.length === 0) return null;
  return {
    kind: "life",
    player: typeof d.player === "number" ? d.player : 0,
    options: options.map((option: any) => {
      const assignment = Array.isArray(option?.assignment)
        ? option.assignment
        : [];
      return assignment.map(([seat, life]: [number, number]) => ({
        seat,
        life,
      }));
    }),
  };
}

/** Read a coin-flip-keep or life-redistribution decision aimed at the human, or null. */
export function parseCoinFlipLifePrompt(
  wf: WaitingFor | undefined,
): CoinFlipLifePrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "CoinFlipKeepChoice":
      return parseCoinFlipKeepChoice(d);
    case "RedistributeLifeTotals":
      return parseRedistributeLifeTotals(d);
    default:
      return null;
  }
}

/** Submit the indices (into `results`) of the coin flips to keep. */
export function selectCoinFlipsAction(keepIndices: number[]): {
  type: string;
  data: { keep_indices: number[] };
} {
  return { type: "SelectCoinFlips", data: { keep_indices: keepIndices } };
}

/** Submit the chosen life-redistribution option by its index. */
export function submitLifeRedistributionAction(optionIndex: number): {
  type: string;
  data: { option_index: number };
} {
  return {
    type: "SubmitLifeRedistribution",
    data: { option_index: optionIndex },
  };
}
