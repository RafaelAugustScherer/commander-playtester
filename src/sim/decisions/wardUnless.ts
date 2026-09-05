// Paying a Ward or an "unless" cost — discarding a card, sacrificing a
// permanent, bouncing a permanent to hand, or choosing which of several
// costs to pay. The engine surfaces four waiting_for shapes:
// - `WardDiscardChoice` { player, cards: ObjId[], remaining, filter? } —
//   pick one card from `cards` to discard. Answered with
//   `SelectCards { cards: [chosenId] }`.
// - `WardSacrificeChoice` { player, permanents: ObjId[], remaining,
//   min_total_power?: number | null } — when `min_total_power` is absent
//   or null, pick one permanent to sacrifice immediately; otherwise pick
//   any number of `permanents` whose summed power meets or exceeds
//   `min_total_power`. Answered with `SelectCards { cards }`.
// - `UnlessBounceChoice` { player, permanents: ObjId[], remaining } —
//   pick one permanent from `permanents` to return to hand. Answered with
//   `SelectCards { cards: [chosenId] }`.
// - `UnlessPaymentChooseCost` { player, costs: UnlessCost[], pending_effect,
//   effect_description? } — pick which of several costs to pay, or decline
//   to pay any of them. `UnlessCost` is one of: `Fixed { cost }`,
//   `DynamicGeneric { quantity }`, `PayLife { amount }`, `DiscardCard`,
//   `Sacrifice { count, filter }`, `ReturnToHand { count, filter }`.
//   Answered with `ChooseUnlessCostBranch { choice }`, where `choice` is
//   `{ type: "Decline" }` or `{ type: "Pay", data: { index } }` (the
//   position of the chosen cost in `costs`).
// Shapes confirmed against phase-rs client/src/adapter/types.ts at v0.71.0.

import type { GameState, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A hand card offered up for a Ward discard. */
export interface WardUnlessCard {
  id: number;
  name: string;
}

/** A permanent offered for a Ward sacrifice or an "unless" bounce, with display-only P/T. */
export interface WardUnlessPermanent {
  id: number;
  name: string;
  power?: number | null;
  toughness?: number | null;
}

export interface WardDiscardPrompt {
  kind: "wardDiscard";
  player: number;
  cards: WardUnlessCard[];
}

export interface WardSacrificePrompt {
  kind: "wardSacrifice";
  player: number;
  permanents: WardUnlessPermanent[];
  /** Null means pick a single permanent; otherwise pick until this much power is met. */
  minTotalPower: number | null;
}

export interface UnlessBouncePrompt {
  kind: "unlessBounce";
  player: number;
  permanents: WardUnlessPermanent[];
}

/**
 * A localization-agnostic description of one `UnlessCost` variant, for the
 * panel to map onto a fixed, statically-keyed message.
 */
export type UnlessCostHint =
  | { type: "fixed" }
  | { type: "dynamicGeneric" }
  | { type: "payLife"; amount: number }
  | { type: "discardCard" }
  | { type: "sacrifice"; count: number }
  | { type: "returnToHand"; count: number };

export interface UnlessCostOption {
  hint: UnlessCostHint;
  /** Position of this cost in the engine's `costs` array — echoed back on Pay. */
  index: number;
}

export interface UnlessCostPrompt {
  kind: "unlessCost";
  player: number;
  description: string;
  costs: UnlessCostOption[];
}

export type WardUnlessPrompt =
  | WardDiscardPrompt
  | WardSacrificePrompt
  | UnlessBouncePrompt
  | UnlessCostPrompt;

function toCard(id: number, state?: GameState): WardUnlessCard {
  return { id, name: state?.objects?.[id]?.name ?? "" };
}

function toPermanent(id: number, state?: GameState): WardUnlessPermanent {
  const obj = state?.objects?.[id];
  return {
    id,
    name: obj?.name ?? "",
    power: obj?.power,
    toughness: obj?.toughness,
  };
}

function costHint(cost: any): UnlessCostHint {
  switch (cost?.type) {
    case "PayLife":
      return {
        type: "payLife",
        amount: typeof cost.amount === "number" ? cost.amount : 0,
      };
    case "DiscardCard":
      return { type: "discardCard" };
    case "Sacrifice":
      return {
        type: "sacrifice",
        count: typeof cost.count === "number" ? cost.count : 1,
      };
    case "ReturnToHand":
      return {
        type: "returnToHand",
        count: typeof cost.count === "number" ? cost.count : 1,
      };
    case "DynamicGeneric":
      return { type: "dynamicGeneric" };
    case "Fixed":
    default:
      return { type: "fixed" };
  }
}

function parseWardDiscard(
  d: any,
  state?: GameState,
): WardDiscardPrompt | null {
  const cards = Array.isArray(d.cards) ? d.cards : [];
  if (cards.length === 0) return null;
  return {
    kind: "wardDiscard",
    player: typeof d.player === "number" ? d.player : 0,
    cards: cards.map((id: number) => toCard(id, state)),
  };
}

function parseWardSacrifice(
  d: any,
  state?: GameState,
): WardSacrificePrompt | null {
  const permanents = Array.isArray(d.permanents) ? d.permanents : [];
  if (permanents.length === 0) return null;
  return {
    kind: "wardSacrifice",
    player: typeof d.player === "number" ? d.player : 0,
    permanents: permanents.map((id: number) => toPermanent(id, state)),
    minTotalPower:
      typeof d.min_total_power === "number" ? d.min_total_power : null,
  };
}

function parseUnlessBounce(
  d: any,
  state?: GameState,
): UnlessBouncePrompt | null {
  const permanents = Array.isArray(d.permanents) ? d.permanents : [];
  if (permanents.length === 0) return null;
  return {
    kind: "unlessBounce",
    player: typeof d.player === "number" ? d.player : 0,
    permanents: permanents.map((id: number) => toPermanent(id, state)),
  };
}

function parseUnlessCost(d: any): UnlessCostPrompt | null {
  const costs = Array.isArray(d.costs) ? d.costs : [];
  if (costs.length === 0) return null;
  return {
    kind: "unlessCost",
    player: typeof d.player === "number" ? d.player : 0,
    description:
      typeof d.effect_description === "string" ? d.effect_description : "",
    costs: costs.map((cost: any, index: number) => ({
      hint: costHint(cost),
      index,
    })),
  };
}

/** Read a Ward/unless payment decision aimed at the human, or null. */
export function parseWardUnlessPrompt(
  wf: WaitingFor | undefined,
  state?: GameState,
): WardUnlessPrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "WardDiscardChoice":
      return parseWardDiscard(d, state);
    case "WardSacrificeChoice":
      return parseWardSacrifice(d, state);
    case "UnlessBounceChoice":
      return parseUnlessBounce(d, state);
    case "UnlessPaymentChooseCost":
      return parseUnlessCost(d);
    default:
      return null;
  }
}

/** Submit the chosen card/permanent ids for a Ward discard, sacrifice, or unless bounce. */
export function selectWardUnlessCardsAction(ids: number[]): {
  type: string;
  data: { cards: number[] };
} {
  return { type: "SelectCards", data: { cards: ids } };
}

/** Submit which unless cost to pay (by its index in `costs`), or decline all of them. */
export function chooseUnlessCostBranchAction(index: number | null): {
  type: string;
  data: {
    choice: { type: "Decline" } | { type: "Pay"; data: { index: number } };
  };
} {
  if (index === null) {
    return {
      type: "ChooseUnlessCostBranch",
      data: { choice: { type: "Decline" } },
    };
  }
  return {
    type: "ChooseUnlessCostBranch",
    data: { choice: { type: "Pay", data: { index } } },
  };
}
