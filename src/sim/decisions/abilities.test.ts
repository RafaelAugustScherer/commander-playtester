import { describe, it, expect } from "vitest";
import { abilitiesBySource } from "./abilities";

// Real ActivateAbility actions captured from the phase-rs priority legal actions.
const LEGAL_ACTIONS = [
  { type: "PassPriority" },
  { type: "PlayLand", data: { object_id: 23, card_id: 23 } },
  { type: "ActivateAbility", data: { source_id: 27, ability_index: 0 } },
  { type: "ActivateAbility", data: { source_id: 61, ability_index: 2 } },
  { type: "ActivateAbility", data: { source_id: 61, ability_index: 0 } },
];

describe("abilitiesBySource", () => {
  it("groups ActivateAbility actions by their source permanent", () => {
    const map = abilitiesBySource(LEGAL_ACTIONS);
    expect([...map.keys()].sort((a, b) => a - b)).toEqual([27, 61]);
    expect(map.get(27)).toHaveLength(1);
    expect(map.get(61)).toHaveLength(2);
    expect(map.get(61)!.map((a) => a.data.ability_index)).toEqual([2, 0]);
  });

  it("ignores non-ability actions and malformed entries", () => {
    expect(abilitiesBySource(undefined).size).toBe(0);
    expect(abilitiesBySource([{ type: "CastSpell", data: {} }]).size).toBe(0);
    expect(
      abilitiesBySource([{ type: "ActivateAbility", data: {} }]).size,
    ).toBe(0);
  });
});
