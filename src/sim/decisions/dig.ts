// Choosing which cards to keep on an impulse draw or a dig effect. The
// engine surfaces this as a `DigChoice` waiting_for:
// { player, cards: ObjId[], keep_count, up_to?, selectable_cards?,
//   kept_destination?: Zone, rest_destination?: Zone }.
// Only the cards in `selectable_cards` (defaulting to all of `cards` when
// absent) may be kept; the player toggles a subset of up to `keep_count` of
// them. When `up_to` is set, fewer than `keep_count` may be kept; otherwise
// exactly `keep_count` must be. The kept subset is submitted back as
// `SelectCards { cards }`. Shapes confirmed against phase-rs
// client/src/adapter/types.ts (DigModal) at v0.71.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A card dug up for an impulse draw or dig effect. */
export interface DigCard {
  id: number;
  name: string;
}

export interface DigPrompt {
  player: number;
  cards: DigCard[];
  /** Ids among `cards` that may actually be kept. */
  selectableIds: number[];
  /** How many cards to keep. */
  keepCount: number;
  /** True when fewer than `keepCount` may be kept. */
  upTo: boolean;
  /** Where the kept cards go, e.g. "Library" (top), "Battlefield", "Hand". */
  keptDestination: string;
  /** Where the rest of the cards go. */
  restDestination: string;
}

/** Read a dig/impulse-draw decision aimed at the human, or null. */
export function parseDigPrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): DigPrompt | null {
  if (!wf || wf.type !== "DigChoice") return null;
  const d: any = wf.data ?? {};
  const rawCards = d.cards;
  if (!Array.isArray(rawCards) || rawCards.length === 0) return null;
  const cards: DigCard[] = rawCards.map((id: number) => ({
    id,
    name: state?.objects?.[id]?.name ?? "",
  }));
  const selectableIds = Array.isArray(d.selectable_cards)
    ? d.selectable_cards
    : rawCards;
  return {
    player: typeof d.player === "number" ? d.player : 0,
    cards,
    selectableIds,
    keepCount: typeof d.keep_count === "number" ? d.keep_count : 1,
    upTo: !!d.up_to,
    keptDestination:
      typeof d.kept_destination === "string" ? d.kept_destination : "",
    restDestination:
      typeof d.rest_destination === "string" ? d.rest_destination : "",
  };
}

/** Submit the kept card ids for a dig/impulse-draw decision. */
export function keepDigCardsAction(ids: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: ids } };
}
