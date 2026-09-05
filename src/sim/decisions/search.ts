// Browsing a tutor/search, a fetch-land partition, or an outside-game pool
// (Wish effects) — letting the human pick the results themselves instead of
// the AI. The engine surfaces three waiting_for shapes:
// - `SearchChoice` { player, cards: ObjId[], count, up_to?, allows_partial_find?,
//   constraint? } — a tutor-style search: browse `cards` and pick up to (or
//   exactly) `count` of them.
// - `SearchPartitionChoice` { player, cards, primary_destination, primary_count,
//   primary_enter_tapped, rest_destination, source_id } — split the pool into
//   a primary destination (exactly `primary_count` of them) and a rest
//   destination (everything else), as with a fetch land.
// - `OutsideGameChoice` { player, source_id, choices: OutsideGameChoiceEntry[]
//   { source, count, name }, count, destination } — pick from outside the
//   game (sideboard or face-up exile).
// Both search kinds answer with `SelectCards { cards: ObjId[] }`; the
// outside-game choice answers with `ChooseOutsideGameCards { selections }`,
// where each selection echoes the chosen entry's `source` verbatim
// (`{type:"Sideboard",data:{sideboard_index}}` or
// `{type:"FaceUpExile",data:{object_id}}`). Shapes confirmed against
// phase-rs client/src/adapter/types.ts at v0.71.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A card offered up for a search/tutor or fetch-land partition. */
export interface SearchCard {
  id: number;
  name: string;
}

export interface SearchPrompt {
  kind: "search";
  player: number;
  cards: SearchCard[];
  /** How many cards to pick. */
  count: number;
  /** True when fewer than `count` may be picked. */
  upTo: boolean;
}

export interface SearchPartitionPrompt {
  kind: "partition";
  player: number;
  cards: SearchCard[];
  /** Exactly this many go to `primaryDestination`; the rest go to `restDestination`. */
  count: number;
  upTo: false;
  primaryDestination: string;
  restDestination: string;
}

/** One outside-the-game option (a sideboard card or a face-up exiled card). */
export interface OutsideGameEntry {
  label: string;
  source: unknown;
}

export interface OutsideGamePrompt {
  kind: "outside";
  player: number;
  entries: OutsideGameEntry[];
  count: number;
  destination: string;
}

export type SearchDecisionPrompt =
  | SearchPrompt
  | SearchPartitionPrompt
  | OutsideGamePrompt;

function toSearchCards(ids: unknown, state?: GameState): SearchCard[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => ({ id, name: state?.objects?.[id]?.name ?? "" }));
}

function parseSearchChoice(d: any, state?: GameState): SearchPrompt | null {
  const cards = toSearchCards(d.cards, state);
  if (cards.length === 0) return null;
  return {
    kind: "search",
    player: typeof d.player === "number" ? d.player : 0,
    cards,
    count: typeof d.count === "number" ? d.count : 1,
    upTo: !!(d.up_to || d.allows_partial_find),
  };
}

function parseSearchPartitionChoice(
  d: any,
  state?: GameState,
): SearchPartitionPrompt | null {
  const cards = toSearchCards(d.cards, state);
  if (cards.length === 0) return null;
  return {
    kind: "partition",
    player: typeof d.player === "number" ? d.player : 0,
    cards,
    count: typeof d.primary_count === "number" ? d.primary_count : 0,
    upTo: false,
    primaryDestination:
      typeof d.primary_destination === "string" ? d.primary_destination : "",
    restDestination:
      typeof d.rest_destination === "string" ? d.rest_destination : "",
  };
}

function parseOutsideGameChoice(d: any): OutsideGamePrompt | null {
  const rawChoices = d.choices;
  if (!Array.isArray(rawChoices) || rawChoices.length === 0) return null;
  const entries: OutsideGameEntry[] = rawChoices.map((c: any) => ({
    label: typeof c?.name === "string" ? c.name : "",
    source: c?.source,
  }));
  return {
    kind: "outside",
    player: typeof d.player === "number" ? d.player : 0,
    entries,
    count: typeof d.count === "number" ? d.count : 1,
    destination: typeof d.destination === "string" ? d.destination : "",
  };
}

/** Read a search/tutor, fetch-land partition, or outside-game decision aimed at the human, or null. */
export function parseSearchPrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): SearchDecisionPrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "SearchChoice":
      return parseSearchChoice(d, state);
    case "SearchPartitionChoice":
      return parseSearchPartitionChoice(d, state);
    case "OutsideGameChoice":
      return parseOutsideGameChoice(d);
    default:
      return null;
  }
}

/** Submit the chosen card ids for a search or fetch-land partition decision. */
export function selectSearchCardsAction(ids: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: ids } };
}

/** One outside-game pick, echoing an `OutsideGameEntry.source` verbatim. */
export type OutsideGameSelection =
  | { type: "Sideboard"; data: { sideboard_index: number } }
  | { type: "FaceUpExile"; data: { object_id: number } };

/** Submit the chosen outside-game entries back to the engine. */
export function chooseOutsideGameAction(
  selections: OutsideGameSelection[],
): { type: string; data: { selections: OutsideGameSelection[] } } {
  return { type: "ChooseOutsideGameCards", data: { selections } };
}
