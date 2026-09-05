// Paying a Phyrexian mana cost — a spell with one or more Phyrexian mana
// symbols ({W/P}, {U/P}, …) asks the controller how to pay each shard: with
// the colored mana, or with 2 life instead. The engine surfaces a
// `PhyrexianPayment` waiting_for whose `data` carries the acting `player`,
// the `spell_object` (the spell on the stack), and `shards`: an ordered
// list of `PhyrexianShard { shard_index, color, options }`, where `options`
// is `ManaOrLife` (either), `ManaOnly`, or `LifeOnly` (the shard is locked).
// The seat answers by submitting `SubmitPhyrexianChoices` with one
// `ShardChoice` (`PayMana` or `PayLife`) per shard, index-aligned to the
// `shards` order.
// Shapes confirmed against phase-rs client/src/adapter/types.ts at v0.71.0.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ManaColor = "White" | "Blue" | "Black" | "Red" | "Green";

export type PhyrexianShardOptionType = "ManaOrLife" | "ManaOnly" | "LifeOnly";

export interface PhyrexianShardPrompt {
  color: ManaColor;
  optionType: PhyrexianShardOptionType;
}

export type PhyrexianShardChoice = "PayMana" | "PayLife";

export interface PhyrexianPaymentPrompt {
  player: number;
  /** The spell whose cost is being paid, for the prompt (may be empty). */
  sourceName: string;
  shards: PhyrexianShardPrompt[];
}

const MANA_COLORS: ManaColor[] = ["White", "Blue", "Black", "Red", "Green"];

function isManaColor(value: unknown): value is ManaColor {
  return typeof value === "string" && MANA_COLORS.includes(value as ManaColor);
}

function isShardOptionType(value: unknown): value is PhyrexianShardOptionType {
  return value === "ManaOrLife" || value === "ManaOnly" || value === "LifeOnly";
}

/** Read a "pay a Phyrexian mana cost" decision aimed at the human, or null. */
export function parsePhyrexianPaymentPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): PhyrexianPaymentPrompt | null {
  if (!wf || wf.type !== "PhyrexianPayment") return null;
  const d: any = wf.data ?? {};
  const rawShards = Array.isArray(d.shards) ? d.shards : [];

  const shards: PhyrexianShardPrompt[] = [];
  for (const shard of rawShards) {
    const color = shard?.color;
    const optionType = shard?.options?.type;
    if (!isManaColor(color) || !isShardOptionType(optionType)) return null;
    shards.push({ color, optionType });
  }
  if (shards.length === 0) return null;

  const sourceName = objects?.[d.spell_object]?.name ?? "";

  return {
    player: typeof d.player === "number" ? d.player : 0,
    sourceName,
    shards,
  };
}

/** Per-shard default choice, for the initial pick-state. */
export function defaultPhyrexianChoices(
  shards: PhyrexianShardPrompt[],
): PhyrexianShardChoice[] {
  return shards.map((shard) =>
    shard.optionType === "LifeOnly" ? "PayLife" : "PayMana",
  );
}

/** Submit the per-shard mana/life choices back to the engine. */
export function submitPhyrexianAction(choices: PhyrexianShardChoice[]): {
  type: string;
  data: { choices: { type: PhyrexianShardChoice }[] };
} {
  return {
    type: "SubmitPhyrexianChoices",
    data: { choices: choices.map((c) => ({ type: c })) },
  };
}
