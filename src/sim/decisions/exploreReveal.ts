// Choosing a creature to explore, and deciding whether to keep a card found
// by a reveal-until-you-find effect. The engine surfaces two waiting_for
// shapes:
// - `ExploreChoice` { player, source_id, choosable: ObjId[], remaining: ObjId[],
//   pending_effect } — pick which creature (among `choosable`) explores next.
//   Answered with `ChooseTarget { target: { Object: id } }`.
// - `RevealUntilKeptChoice` { player, hit_card, source_id, accept_zone,
//   decline_zone, enter_tapped, enters_attacking, revealed_misses,
//   rest_destination } — keep the found `hit_card` (goes to `accept_zone`) or
//   decline it (goes to `decline_zone`). Answered with
//   `DecideOptionalEffect { accept }`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts (TargetingOverlay,
// RevealUntilKeptChoiceModal) at v0.71.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One creature offered up to explore. */
export interface ExploreCreature {
  id: number;
  name: string;
}

export interface ExplorePrompt {
  kind: "explore";
  player: number;
  sourceName: string;
  creatures: ExploreCreature[];
}

export interface RevealUntilPrompt {
  kind: "reveal";
  player: number;
  sourceName: string;
  hitCardName: string;
  /** Zone the found card goes to if kept. */
  acceptZone: string;
  /** Zone the found card goes to if declined. */
  declineZone: string;
}

export type ExploreRevealPrompt = ExplorePrompt | RevealUntilPrompt;

function parseExploreChoice(d: any, state?: GameState): ExplorePrompt | null {
  const choosable = Array.isArray(d.choosable) ? d.choosable : [];
  if (choosable.length === 0) return null;
  return {
    kind: "explore",
    player: typeof d.player === "number" ? d.player : 0,
    sourceName: state?.objects?.[d.source_id]?.name ?? "",
    creatures: choosable.map((id: number) => ({
      id,
      name: state?.objects?.[id]?.name ?? "",
    })),
  };
}

function parseRevealUntilKeptChoice(
  d: any,
  state?: GameState,
): RevealUntilPrompt | null {
  const acceptZone = typeof d.accept_zone === "string" ? d.accept_zone : "";
  const declineZone = typeof d.decline_zone === "string" ? d.decline_zone : "";
  if (!acceptZone || !declineZone) return null;
  return {
    kind: "reveal",
    player: typeof d.player === "number" ? d.player : 0,
    sourceName: state?.objects?.[d.source_id]?.name ?? "",
    hitCardName: state?.objects?.[d.hit_card]?.name ?? "",
    acceptZone,
    declineZone,
  };
}

/** Read an explore or reveal-until-you-find decision aimed at the human, or null. */
export function parseExploreRevealPrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): ExploreRevealPrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "ExploreChoice":
      return parseExploreChoice(d, state);
    case "RevealUntilKeptChoice":
      return parseRevealUntilKeptChoice(d, state);
    default:
      return null;
  }
}

/** Submit the chosen creature id for an explore decision. */
export function exploreCreatureAction(id: number): {
  type: string;
  data: { target: { Object: number } };
} {
  return { type: "ChooseTarget", data: { target: { Object: id } } };
}

/** Submit the keep/decline answer for a reveal-until-you-find decision. */
export function revealUntilAction(accept: boolean): {
  type: string;
  data: { accept: boolean };
} {
  return { type: "DecideOptionalEffect", data: { accept } };
}
