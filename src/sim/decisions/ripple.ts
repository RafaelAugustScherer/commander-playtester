// Ripple N (CR 702.60a). Casting a spell with ripple surfaces two decisions in
// sequence:
// - `RippleRevealChoice` { player, source_id, count } — "you MAY reveal the top
//   N cards of your library." A binary choice, answered with `RippleChoice
//   { choice: { type: "Cast" } }` to reveal or `{ type: "Decline" }` not to.
// - `RippleBottomOrder` { player, source_id, cards } — after revealing and
//   casting the same-named cards, put the rest on the bottom of the library in
//   any order. Answered with `SelectCards { cards }`, the full permutation in
//   the order they go to the bottom (topmost first).
// Shapes confirmed against phase-rs client/src/adapter/types.ts (RippleReveal
// ChoiceModal, RippleBottomOrderModal) at v0.86.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface RippleRevealPrompt {
  kind: "reveal";
  player: number;
  count: number;
}

/** One card to place on the bottom of the library after ripple. */
export interface RippleCard {
  id: number;
  name: string;
}

export interface RippleBottomOrderPrompt {
  kind: "bottomOrder";
  player: number;
  cards: RippleCard[];
}

export type RipplePrompt = RippleRevealPrompt | RippleBottomOrderPrompt;

function parseReveal(d: any): RippleRevealPrompt | null {
  const count = typeof d.count === "number" ? d.count : 0;
  if (count === 0) return null;
  return {
    kind: "reveal",
    player: typeof d.player === "number" ? d.player : 0,
    count,
  };
}

function parseBottomOrder(
  d: any,
  state: GameState,
): RippleBottomOrderPrompt | null {
  const ids: number[] = Array.isArray(d.cards)
    ? d.cards.filter((i: unknown): i is number => typeof i === "number")
    : [];
  if (ids.length === 0) return null;
  return {
    kind: "bottomOrder",
    player: typeof d.player === "number" ? d.player : 0,
    cards: ids.map((id) => ({ id, name: state.objects?.[id]?.name ?? "" })),
  };
}

/** Read a ripple reveal / bottom-order decision aimed at the human, or null. */
export function parseRipplePrompt(
  wf: WaitingFor | undefined,
  state: GameState,
): RipplePrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "RippleRevealChoice":
      return parseReveal(d);
    case "RippleBottomOrder":
      return parseBottomOrder(d, state);
    default:
      return null;
  }
}

/** Answer the reveal offer: reveal the top N cards, or decline. */
export function rippleRevealAction(reveal: boolean): {
  type: string;
  data: { choice: { type: "Cast" | "Decline" } };
} {
  return {
    type: "RippleChoice",
    data: { choice: { type: reveal ? "Cast" : "Decline" } },
  };
}

/** Submit the uncast cards in the order they go to the bottom (topmost first). */
export function rippleBottomOrderAction(order: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: order } };
}
