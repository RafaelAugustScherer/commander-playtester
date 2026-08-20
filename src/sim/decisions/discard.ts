// A forced discard. When an effect (or the cleanup hand-size rule) makes the
// human discard, the engine surfaces a `DiscardChoice` waiting_for whose `data`
// carries the acting `player`, the `count` to discard, and `cards` — the ids
// eligible to discard (normally the whole hand). The seat answers by submitting
// `SelectCards` with exactly `count` of those ids, the same action the London
// mulligan uses to bottom cards.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A card eligible for a forced discard. */
export interface DiscardCard {
  id: number;
  name: string;
}

export interface DiscardPrompt {
  player: number;
  /** How many cards must be discarded now. */
  count: number;
  /** The cards this seat may choose from. */
  cards: DiscardCard[];
}

/**
 * Read a forced-discard decision for `seat`, or null if this waiting_for is not
 * a `DiscardChoice` aimed at that seat.
 */
export function parseDiscardPrompt(
  wf: WaitingFor | undefined,
  state: GameState,
  seat: number,
): DiscardPrompt | null {
  if (!wf || wf.type !== "DiscardChoice") return null;
  const d: any = wf.data ?? {};
  if (d.player !== seat) return null;

  const ids: number[] = Array.isArray(d.cards) ? d.cards : [];
  const count: number = typeof d.count === "number" ? d.count : 1;
  const cards = ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" }));
  return { player: seat, count, cards };
}

/** Discard the chosen cards. */
export function discardCardsAction(cards: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards } };
}
