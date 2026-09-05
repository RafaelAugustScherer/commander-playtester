// A commander that would leave the battlefield (or another zone change that
// checks the commander's ownership) may go to the command zone instead. When
// this applies, the engine surfaces a `CommanderZoneChoice` waiting_for whose
// `data` carries the acting `player`, the `commander_id`, and the
// `current_zone` the commander would otherwise end up in (graveyard, exile,
// hand, ...). The seat answers by submitting `DecideOptionalEffect` — `accept:
// true` sends the commander to the command zone, `accept: false` leaves it in
// `current_zone`.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CommanderZonePrompt {
  player: number;
  /** The commander's name, for the prompt (may be empty). */
  commanderName: string;
  /** The zone the commander would go to if left alone (raw engine string). */
  currentZone: string;
}

/** Read a "send commander to the command zone?" decision aimed at the human, or null. */
export function parseCommanderZonePrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): CommanderZonePrompt | null {
  if (!wf || wf.type !== "CommanderZoneChoice") return null;
  const d: any = wf.data ?? {};
  const currentZone: string =
    typeof d.current_zone === "string" ? d.current_zone : "";
  if (!currentZone) return null;

  const commanderId = d.commander_id;
  const commanderName = objects?.[commanderId]?.name ?? "";

  return {
    player: typeof d.player === "number" ? d.player : 0,
    commanderName,
    currentZone,
  };
}

/** Submit the command-zone/leave-in-place answer back to the engine. */
export function commanderZoneAction(toCommandZone: boolean): {
  type: string;
  data: { accept: boolean };
} {
  return { type: "DecideOptionalEffect", data: { accept: toCommandZone } };
}
