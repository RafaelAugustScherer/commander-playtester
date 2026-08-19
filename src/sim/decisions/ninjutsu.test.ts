import { describe, it, expect } from "vitest";
import { ninjutsuBySource } from "./ninjutsu";

// Real ActivateNinjutsu actions captured from the phase-rs priority legal
// actions during combat: one entry per (ninja, returnable attacker) pair.
const LEGAL_ACTIONS = [
  { type: "PassPriority" },
  { type: "ActivateNinjutsu", data: { ninjutsu_object_id: 74, creature_to_return: 8 } },
  { type: "ActivateNinjutsu", data: { ninjutsu_object_id: 74, creature_to_return: 41 } },
  { type: "ActivateNinjutsu", data: { ninjutsu_object_id: 199, creature_to_return: 8 } },
];

describe("ninjutsuBySource", () => {
  it("groups ActivateNinjutsu actions by the ninja that would enter", () => {
    const map = ninjutsuBySource(LEGAL_ACTIONS);
    expect([...map.keys()].sort((a, b) => a - b)).toEqual([74, 199]);
    expect(map.get(74)!.map((o) => o.creatureId)).toEqual([8, 41]);
    expect(map.get(199)!.map((o) => o.creatureId)).toEqual([8]);
    expect(map.get(74)![0].action.data.creature_to_return).toBe(8);
  });

  it("ignores non-ninjutsu actions and malformed entries", () => {
    expect(ninjutsuBySource(undefined).size).toBe(0);
    expect(
      ninjutsuBySource([{ type: "ActivateAbility", data: { source_id: 1 } }]).size,
    ).toBe(0);
    expect(
      ninjutsuBySource([{ type: "ActivateNinjutsu", data: {} }]).size,
    ).toBe(0);
  });
});
