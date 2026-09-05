// Distributing counters/damage/life among targets, proliferating, and
// populating a token. The engine surfaces three waiting_for shapes:
// - `DistributeAmong` { player, total, targets: TargetRef[], unit } — split
//   `total` among `targets`, each receiving at least 1, summing to `total`.
//   `unit` is `{type:"Damage"}` | `{type:"EvenSplitDamage"}` |
//   `{type:"Counters", data: string}` (the counter type name) | `{type:"Life"}`.
//   Answered with `DistributeAmong { distribution: [TargetRef, number][] }`
//   (index-aligned to `targets`, each `TargetRef` echoed verbatim).
// - `ProliferateChoice` { player, eligible: TargetRef[] } — choose any
//   subset (including none) of `eligible` to proliferate. Answered with
//   `SelectTargets { targets }` (the chosen `TargetRef`s, echoed verbatim).
// - `PopulateChoice` { player, source_id, valid_tokens: ObjId[] } — pick one
//   token among `valid_tokens` to copy. Answered with
//   `ChooseTarget { target: { Object: id } }`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts
// (DistributeAmongModal, ProliferateModal, TargetingOverlay) at v0.71.0.
//
// Two rarer counter-move shapes — `MoveCountersDistribution` and
// `RemoveCountersChoice` — are a deliberate second pass (see the feature
// doc's Open Questions) and are left to the AI: this parser returns null
// for them.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single legal target: an object on the board, or a player seat. */
export type CounterTargetRef = { Object: number } | { Player: number };

/** One target offered up, with a display label. */
export interface CounterTargetOption {
  ref: CounterTargetRef;
  label: string;
}

/** What is being distributed among the targets. */
export type DistributionUnitKind =
  | "Damage"
  | "EvenSplitDamage"
  | "Counters"
  | "Life";

export interface DistributePrompt {
  kind: "distribute";
  player: number;
  total: number;
  unitKind: DistributionUnitKind;
  /** The counter type name (e.g. "+1/+1"), present only when unitKind is "Counters". */
  counterLabel?: string;
  targets: CounterTargetOption[];
}

export interface ProliferatePrompt {
  kind: "proliferate";
  player: number;
  options: CounterTargetOption[];
}

/** One token offered up to populate (copy). */
export interface PopulateToken {
  id: number;
  name: string;
}

export interface PopulatePrompt {
  kind: "populate";
  player: number;
  sourceName: string;
  tokens: PopulateToken[];
}

export type CountersPrompt =
  | DistributePrompt
  | ProliferatePrompt
  | PopulatePrompt;

function toRef(t: any): CounterTargetRef | null {
  if (t && typeof t === "object") {
    if (typeof t.Object === "number") return { Object: t.Object };
    if (typeof t.Player === "number") return { Player: t.Player };
  }
  return null;
}

function refLabel(ref: CounterTargetRef, state?: GameState): string {
  if ("Object" in ref) return state?.objects?.[ref.Object]?.name ?? "";
  return ref.Player === 0 ? "You" : `Seat ${ref.Player}`;
}

function toRefOption(t: any, state?: GameState): CounterTargetOption | null {
  const ref = toRef(t);
  if (!ref) return null;
  return { ref, label: refLabel(ref, state) };
}

const DISTRIBUTION_UNIT_KINDS = new Set<DistributionUnitKind>([
  "Damage",
  "EvenSplitDamage",
  "Counters",
  "Life",
]);

function parseDistributeAmong(
  d: any,
  state?: GameState,
): DistributePrompt | null {
  const rawTargets = Array.isArray(d.targets) ? d.targets : [];
  const targets = rawTargets
    .map((t: any) => toRefOption(t, state))
    .filter(
      (o: CounterTargetOption | null): o is CounterTargetOption => o !== null,
    );
  if (targets.length === 0) return null;
  const unit = d.unit ?? {};
  const unitKind: DistributionUnitKind = DISTRIBUTION_UNIT_KINDS.has(
    unit.type,
  )
    ? unit.type
    : "Damage";
  return {
    kind: "distribute",
    player: typeof d.player === "number" ? d.player : 0,
    total: typeof d.total === "number" ? d.total : 0,
    unitKind,
    counterLabel:
      unitKind === "Counters" && typeof unit.data === "string"
        ? unit.data
        : undefined,
    targets,
  };
}

function parseProliferateChoice(
  d: any,
  state?: GameState,
): ProliferatePrompt | null {
  const eligible = Array.isArray(d.eligible) ? d.eligible : [];
  const options = eligible
    .map((t: any) => toRefOption(t, state))
    .filter(
      (o: CounterTargetOption | null): o is CounterTargetOption => o !== null,
    );
  if (options.length === 0) return null;
  return {
    kind: "proliferate",
    player: typeof d.player === "number" ? d.player : 0,
    options,
  };
}

function parsePopulateChoice(
  d: any,
  state?: GameState,
): PopulatePrompt | null {
  const validTokens = Array.isArray(d.valid_tokens) ? d.valid_tokens : [];
  if (validTokens.length === 0) return null;
  return {
    kind: "populate",
    player: typeof d.player === "number" ? d.player : 0,
    sourceName: state?.objects?.[d.source_id]?.name ?? "",
    tokens: validTokens.map((id: number) => ({
      id,
      name: state?.objects?.[id]?.name ?? "",
    })),
  };
}

/** Read a distribute/proliferate/populate decision aimed at the human, or null. */
export function parseCountersPrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): CountersPrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "DistributeAmong":
      return parseDistributeAmong(d, state);
    case "ProliferateChoice":
      return parseProliferateChoice(d, state);
    case "PopulateChoice":
      return parsePopulateChoice(d, state);
    default:
      return null;
  }
}

/** Submit the amount assigned to each target (index-aligned, summing to `total`). */
export function distributeAmongAction(
  distribution: [CounterTargetRef, number][],
): { type: string; data: { distribution: [CounterTargetRef, number][] } } {
  return { type: "DistributeAmong", data: { distribution } };
}

/** Submit the chosen subset of eligible permanents/players to proliferate. */
export function proliferateAction(refs: CounterTargetRef[]): {
  type: string;
  data: { targets: CounterTargetRef[] };
} {
  return { type: "SelectTargets", data: { targets: refs } };
}

/** Submit the chosen token id to copy for populate. */
export function populateAction(
  id: number,
): { type: string; data: { target: { Object: number } } } {
  return { type: "ChooseTarget", data: { target: { Object: id } } };
}
