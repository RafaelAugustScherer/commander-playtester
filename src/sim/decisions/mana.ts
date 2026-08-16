// The engine taps lands only while paying for a spell, and auto-picks sources
// unless there is a real choice. When it needs the human, it surfaces one of two
// waiting_fors: ChooseManaColor (which color an any-color source makes) or
// ManaSourceSelection (which of several sources to tap). We route those to the
// player and echo the engine's own option objects back in the submitted action.

import type { WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ManaSource {
  objectId: number;
  manaType: string;
  /** Concrete-color sources tap directly; deferred/penalty ones activate. */
  concrete: boolean;
  option: any;
}

export type ManaPrompt =
  | { kind: "color"; player: number; options: string[] }
  | { kind: "source"; player: number; sources: ManaSource[] };

/** Read a mana-payment decision aimed at the human, or null if it isn't one. */
export function parseManaPrompt(wf: WaitingFor | undefined): ManaPrompt | null {
  if (!wf) return null;

  if (wf.type === "ChooseManaColor") {
    const choice = wf.data?.choice;
    const options = choice?.data?.options;
    if (choice?.type !== "SingleColor" || !Array.isArray(options)) return null;
    const colors = options.filter((c: unknown): c is string => typeof c === "string");
    if (colors.length === 0) return null;
    return { kind: "color", player: wf.data?.player ?? 0, options: colors };
  }

  if (wf.type === "ManaSourceSelection") {
    const options = wf.data?.options;
    if (!Array.isArray(options) || options.length === 0) return null;
    const sources: ManaSource[] = options
      .map((o: any) => ({
        objectId: o?.source?.object_id,
        manaType: o?.mana_type,
        concrete: o?.output?.type === "Concrete",
        option: o,
      }))
      .filter((s: ManaSource) => typeof s.objectId === "number");
    if (sources.length === 0) return null;
    return { kind: "source", player: wf.data?.player ?? 0, sources };
  }

  return null;
}

/** Submit the chosen color for an any-color source. */
export function chooseManaColorAction(color: string): {
  type: string;
  data: { choice: { type: string; data: string }; count: number };
} {
  return {
    type: "ChooseManaColor",
    data: { choice: { type: "SingleColor", data: color }, count: 1 },
  };
}

/** Tap a chosen source: TapLandForMana for concrete color, else ActivateManaSource. */
export function tapManaSourceAction(source: ManaSource): {
  type: string;
  data: { selection: any };
} {
  return {
    type: source.concrete ? "TapLandForMana" : "ActivateManaSource",
    data: { selection: source.option },
  };
}

export interface ManaPip {
  color: string;
  count: number;
}

const MANA_COLORS = new Set([
  "White",
  "Blue",
  "Black",
  "Red",
  "Green",
  "Colorless",
]);

function unitColor(unit: any): string | null {
  if (typeof unit === "string") return MANA_COLORS.has(unit) ? unit : null;
  for (const key of ["mana_type", "color", "type"]) {
    const v = unit?.[key];
    if (typeof v === "string" && MANA_COLORS.has(v)) return v;
  }
  return null;
}

/** Read a player's floating mana pool into per-color pips (empty when none). */
export function readManaPool(player: any): ManaPip[] {
  const units = player?.mana_pool?.units;
  if (!Array.isArray(units) || units.length === 0) return [];
  const counts = new Map<string, number>();
  for (const u of units) {
    const color = unitColor(u);
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return [...counts.entries()].map(([color, count]) => ({ color, count }));
}
