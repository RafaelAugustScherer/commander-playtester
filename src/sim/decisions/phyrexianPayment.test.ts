import { describe, it, expect } from "vitest";
import {
  parsePhyrexianPaymentPrompt,
  defaultPhyrexianChoices,
  submitPhyrexianAction,
} from "./phyrexianPayment";
import type { GameObject, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// PhyrexianPayment { player, spell_object, shards: PhyrexianShard[]
// { shard_index, color: ManaColor, options: ShardOptions } }, where
// ShardOptions is one of ManaOrLife / ManaOnly / LifeOnly.
const REAL_PHYREXIAN: WaitingFor = {
  type: "PhyrexianPayment",
  data: {
    player: 0,
    spell_object: 45,
    shards: [
      { shard_index: 0, color: "Black", options: { type: "ManaOrLife" } },
      { shard_index: 1, color: "Black", options: { type: "ManaOnly" } },
      { shard_index: 2, color: "Blue", options: { type: "LifeOnly" } },
    ],
  },
};

const OBJECTS: Record<string, GameObject> = {
  45: { id: 45, name: "Gitaxian Probe", zone: "Stack" },
};

describe("parsePhyrexianPaymentPrompt", () => {
  it("parses the player, source name and shard options in order", () => {
    const p = parsePhyrexianPaymentPrompt(REAL_PHYREXIAN, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.sourceName).toBe("Gitaxian Probe");
    expect(p.shards).toEqual([
      { color: "Black", optionType: "ManaOrLife" },
      { color: "Black", optionType: "ManaOnly" },
      { color: "Blue", optionType: "LifeOnly" },
    ]);
  });

  it("falls back to an empty source name when the object is unknown", () => {
    const p = parsePhyrexianPaymentPrompt(REAL_PHYREXIAN);
    expect(p?.sourceName).toBe("");
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parsePhyrexianPaymentPrompt(undefined)).toBeNull();
    expect(
      parsePhyrexianPaymentPrompt({ type: "Priority", data: {} }),
    ).toBeNull();
  });

  it("returns null when shards is empty", () => {
    const wf: WaitingFor = {
      type: "PhyrexianPayment",
      data: { player: 0, spell_object: 45, shards: [] },
    };
    expect(parsePhyrexianPaymentPrompt(wf)).toBeNull();
  });

  it("returns null when a shard has a malformed color or option type", () => {
    const wf: WaitingFor = {
      type: "PhyrexianPayment",
      data: {
        player: 0,
        spell_object: 45,
        shards: [{ shard_index: 0, color: "Colorless", options: {} }],
      },
    };
    expect(parsePhyrexianPaymentPrompt(wf)).toBeNull();
  });
});

describe("defaultPhyrexianChoices", () => {
  it("defaults ManaOnly and ManaOrLife shards to PayMana, LifeOnly to PayLife", () => {
    const p = parsePhyrexianPaymentPrompt(REAL_PHYREXIAN)!;
    expect(defaultPhyrexianChoices(p.shards)).toEqual([
      "PayMana",
      "PayMana",
      "PayLife",
    ]);
  });
});

describe("submitPhyrexianAction", () => {
  it("builds one ShardChoice per shard, in order", () => {
    expect(submitPhyrexianAction(["PayMana", "PayLife"])).toEqual({
      type: "SubmitPhyrexianChoices",
      data: { choices: [{ type: "PayMana" }, { type: "PayLife" }] },
    });
  });
});
