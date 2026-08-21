// Scry and Surveil. When the human scries or surveils, the engine surfaces a
// `ScryChoice` / `SurveilChoice` waiting_for whose `data` carries the acting
// `player` and `cards` — the ids looked at, ordered top-of-library first. The
// seat answers by submitting `SelectCards` with the ids to KEEP ON TOP (in the
// order they should sit, topmost first). The engine sends the rest to the
// bottom of the library (scry) or to the graveyard (surveil). Shapes captured
// from the vendored WASM by headless introspection.

import type { GameState, WaitingFor } from "../../engine/types";

/** Scry sends the unkept cards to the library bottom; surveil to the graveyard. */
export type ScryMode = "scry" | "surveil";

/** One card being looked at during a scry/surveil. */
export interface ScryCard {
  id: number;
  name: string;
}

export interface ScryPrompt {
  player: number;
  mode: ScryMode;
  /** The looked-at cards, top of library first. */
  cards: ScryCard[];
}

const MODE_BY_TYPE: Record<string, ScryMode> = {
  ScryChoice: "scry",
  SurveilChoice: "surveil",
};

/**
 * Read a scry/surveil decision for `seat`, or null if this waiting_for is not
 * one aimed at that seat (or reveals no cards).
 */
export function parseScryPrompt(
  wf: WaitingFor | undefined,
  state: GameState,
  seat: number,
): ScryPrompt | null {
  if (!wf) return null;
  const mode = MODE_BY_TYPE[wf.type];
  if (!mode) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = wf.data ?? {};
  if (d.player !== seat) return null;

  const ids: number[] = Array.isArray(d.cards) ? d.cards : [];
  if (ids.length === 0) return null;
  const cards = ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" }));
  return { player: seat, mode, cards };
}

/** Keep `keptOnTop` on top of the library, topmost first; the rest go away. */
export function scryAction(keptOnTop: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: keptOnTop } };
}
