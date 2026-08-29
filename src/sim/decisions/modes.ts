// "Choose one or more —" modal spells and abilities (Cryptic Command, Kaya's
// Guile, charm/command cycles…) arrive as `ModeChoice` (spells, carrying
// `pending_cast`) or `AbilityModeChoice` (activated abilities, carrying
// `source_id`) — same `modal` shape either way: `mode_descriptions` (oracle
// text per mode, "~" standing in for the source's own name), `min_choices`/
// `max_choices`, and `allow_repeat_modes`. Submit the picked indices as a
// `SelectModes` action.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ModesPrompt {
  player: number;
  /** Oracle text per mode, in engine order — index is what SelectModes echoes back. */
  modes: string[];
  minChoices: number;
  maxChoices: number;
  allowRepeatModes: boolean;
  /** The spell/permanent asking for the choice, for the prompt (may be empty). */
  sourceName: string;
}

const MODE_KINDS = new Set(["ModeChoice", "AbilityModeChoice"]);

function sourceObjectId(wf: WaitingFor): number | null {
  const d: any = wf.data ?? {};
  if (wf.type === "AbilityModeChoice") {
    return typeof d.source_id === "number" ? d.source_id : null;
  }
  const id = d.pending_cast?.object_id;
  return typeof id === "number" ? id : null;
}

/** Read a "choose modes" decision aimed at the human, or null. */
export function parseModesPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): ModesPrompt | null {
  if (!wf || !MODE_KINDS.has(wf.type)) return null;
  const d: any = wf.data ?? {};
  const modal = d.modal ?? {};
  const descriptions: string[] = Array.isArray(modal.mode_descriptions)
    ? modal.mode_descriptions.filter((m: unknown): m is string => typeof m === "string")
    : [];
  if (descriptions.length === 0) return null;

  const srcId = sourceObjectId(wf);
  const sourceName = (srcId != null && objects?.[srcId]?.name) || "";
  const modes = sourceName
    ? descriptions.map((m) => m.replaceAll("~", sourceName))
    : descriptions;

  return {
    player: typeof d.player === "number" ? d.player : 0,
    modes,
    minChoices: typeof modal.min_choices === "number" ? modal.min_choices : 1,
    maxChoices:
      typeof modal.max_choices === "number" ? modal.max_choices : descriptions.length,
    allowRepeatModes: !!modal.allow_repeat_modes,
    sourceName,
  };
}

/** Submit the chosen mode indices back to the engine. */
export function selectModesAction(indices: number[]): {
  type: string;
  data: { indices: number[] };
} {
  return { type: "SelectModes", data: { indices } };
}
