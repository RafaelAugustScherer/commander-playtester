// The engine taps lands only while paying for a spell, and auto-picks sources
// unless there is a real choice. When it needs the human, it surfaces one of two
// waiting_fors: ChooseManaColor (which color an any-color source makes) or
// ManaSourceSelection (which of several sources to tap). We route those to the
// player and echo the engine's own option objects back in the submitted action.
//
// With the "tap mana manually" setting on, the player instead pools mana ahead
// of casting: at their priority every mana permanent is tappable (its tap action
// rides legalActions().legalActionsByObject), and floated mana lives at
// players[seat].mana_pool.mana. A spell is then only offered when that reserve
// already covers its cost, so casting it (payment_mode Auto) spends the pool
// without tapping anything extra.

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

/** One way a permanent can be tapped for mana, ready to submit at priority. */
export interface ManaSourceOption {
  /** The color/type this option produces ("" for a deferred any-color source). */
  manaType: string;
  /** Ready-to-submit tap action. */
  action: { type: string; data: any };
}

/**
 * Tappable mana sources at the human's priority, grouped by permanent, for
 * manual-mana mode. The engine lists each source's tap action(s) under
 * legalActions().legalActionsByObject; a permanent with more than one entry
 * (a dual land, say) offers a color choice on tap.
 */
export function priorityManaSources(
  legal: any,
): Map<number, ManaSourceOption[]> {
  const map = new Map<number, ManaSourceOption[]>();
  const byObject = legal?.legalActionsByObject;
  if (!byObject) return map;
  for (const [key, actions] of Object.entries(byObject)) {
    const objectId = Number(key);
    if (!Number.isInteger(objectId) || !Array.isArray(actions)) continue;
    const options: ManaSourceOption[] = [];
    for (const a of actions) {
      if (a?.type !== "TapLandForMana" && a?.type !== "ActivateManaSource") {
        continue;
      }
      options.push({
        manaType: a?.data?.selection?.mana_type ?? "",
        // Echo only type+data; the engine rejects unknown top-level fields.
        action: { type: a.type, data: a.data },
      });
    }
    if (options.length > 0) map.set(objectId, options);
  }
  return map;
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
  for (const key of ["color", "mana_type", "type"]) {
    const v = unit?.[key];
    if (typeof v === "string" && MANA_COLORS.has(v)) return v;
  }
  return null;
}

/** Read a player's floating mana pool into per-color pips (empty when none). */
export function readManaPool(player: any): ManaPip[] {
  const pool = player?.mana_pool;
  const units = pool?.mana ?? pool?.units;
  if (!Array.isArray(units) || units.length === 0) return [];
  const counts = new Map<string, number>();
  for (const u of units) {
    const color = unitColor(u);
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return [...counts.entries()].map(([color, count]) => ({ color, count }));
}

/**
 * Whether a floating pool already covers a mana cost — each colored pip paid by
 * its own color, generic by whatever is left. Used to gate which spells the
 * player may cast in manual-mana mode, so casting never taps extra lands. A pip
 * whose color is not floating (including hybrids we do not model) reads as
 * unpayable, keeping the check safe rather than over-permissive.
 */
export function canPayFromPool(pool: ManaPip[], cost: any): boolean {
  if (!cost || typeof cost !== "object") return true;
  const generic = typeof cost.generic === "number" ? cost.generic : 0;
  const shards: unknown[] = Array.isArray(cost.shards) ? cost.shards : [];
  const avail = new Map<string, number>();
  for (const p of pool) avail.set(p.color, (avail.get(p.color) ?? 0) + p.count);
  for (const shard of shards) {
    if (typeof shard !== "string" || (avail.get(shard) ?? 0) <= 0) return false;
    avail.set(shard, avail.get(shard)! - 1);
  }
  const remaining = [...avail.values()].reduce((a, b) => a + b, 0);
  return remaining >= generic;
}
