// The opening mulligan. At game start the engine surfaces a `MulliganDecision`
// waiting_for whose `data.pending` lists every seat still deciding (it is a
// simultaneous decision), each with a `mulligan_count` and a per-seat `phase`:
//
//   - Declare      → the seat chooses Keep or Mulligan. Legal actions are
//                    { MulliganDecision, choice: Keep | Mulligan }. A mulligan
//                    redraws seven and bumps the count.
//   - BottomCards  → after a keep that owes cards (London mulligan), the seat
//                    puts `count` cards on the bottom. Legal actions are
//                    { SelectCards, cards: [...] }, one per legal combination.
//
// Commander grants a free first mulligan (`free_first_mulligan`): the Nth keep
// bottoms max(0, mulligan_count - 1) cards, so the kept hand shrinks only from
// the second mulligan on. We read the acting seat's own entry and its hand.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A card in the deciding seat's hand, for rendering and bottom-selection. */
export interface MulliganCard {
  id: number;
  name: string;
}

export type MulliganStage = "declare" | "bottom";

export interface MulliganPrompt {
  player: number;
  stage: MulliganStage;
  /** Mulligans this seat has already taken (0 = the original seven). */
  mulliganCount: number;
  /** Commander's free first mulligan: the first mulligan bottoms nothing. */
  freeFirstMulligan: boolean;
  /** BottomCards: how many cards must go on the bottom now (0 while declaring). */
  bottomCount: number;
  /** Cards kept if the seat keeps now (declare) or after bottoming (bottom). */
  keepSize: number;
  /** Cards that would be kept after taking one more mulligan (declare only). */
  nextKeepSize: number;
  /** The seat's current hand. */
  hand: MulliganCard[];
}

/** How many cards a keep bottoms at `mulliganCount` under the free-first rule. */
function owedBottoms(mulliganCount: number, freeFirst: boolean): number {
  return Math.max(0, mulliganCount - (freeFirst ? 1 : 0));
}

function readHand(state: GameState, seat: number): MulliganCard[] {
  const players = state.players ?? [];
  const p = players.find((pl) => pl?.id === seat) ?? players[seat];
  const ids: number[] = Array.isArray(p?.hand) ? p!.hand : [];
  return ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" }));
}

/**
 * Read the opening mulligan decision for `seat`, or null if this waiting_for is
 * not a mulligan aimed at that seat (e.g. it already kept and dropped out of
 * `pending`).
 */
export function parseMulliganPrompt(
  wf: WaitingFor | undefined,
  state: GameState,
  seat: number,
): MulliganPrompt | null {
  if (!wf || wf.type !== "MulliganDecision") return null;
  const d: any = wf.data ?? {};
  const pending: any[] = Array.isArray(d.pending) ? d.pending : [];
  const entry = pending.find((p) => p?.player === seat);
  if (!entry) return null;

  const mulliganCount: number = entry.mulligan_count ?? 0;
  const freeFirstMulligan = !!d.free_first_mulligan;
  const hand = readHand(state, seat);
  const handSize = hand.length;

  if (entry.phase?.type === "BottomCards") {
    const bottomCount: number =
      typeof entry.phase.count === "number"
        ? entry.phase.count
        : owedBottoms(mulliganCount, freeFirstMulligan);
    return {
      player: seat,
      stage: "bottom",
      mulliganCount,
      freeFirstMulligan,
      bottomCount,
      keepSize: Math.max(0, handSize - bottomCount),
      nextKeepSize: Math.max(0, handSize - bottomCount),
      hand,
    };
  }

  // Declare stage (the default): choose Keep or Mulligan.
  return {
    player: seat,
    stage: "declare",
    mulliganCount,
    freeFirstMulligan,
    bottomCount: 0,
    keepSize: Math.max(0, handSize - owedBottoms(mulliganCount, freeFirstMulligan)),
    nextKeepSize: Math.max(
      0,
      handSize - owedBottoms(mulliganCount + 1, freeFirstMulligan),
    ),
    hand,
  };
}

/** Keep the current hand. */
export function mulliganKeepAction(): {
  type: string;
  data: { choice: { type: string } };
} {
  return { type: "MulliganDecision", data: { choice: { type: "Keep" } } };
}

/** Draw a fresh seven (take a mulligan). */
export function mulliganTakeAction(): {
  type: string;
  data: { choice: { type: string } };
} {
  return { type: "MulliganDecision", data: { choice: { type: "Mulligan" } } };
}

/** Put the chosen cards on the bottom to complete a London keep. */
export function bottomCardsAction(cards: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards } };
}
