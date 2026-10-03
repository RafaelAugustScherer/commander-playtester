import { describe, it, expect } from "vitest";
import { parseEmpowerJacePrompt, empowerJaceAction } from "./empowerJace";
import type { GameState, WaitingFor } from "../../engine/types";

function stateWithJaces(): GameState {
  return {
    turn_number: 7,
    phase: "Main1",
    active_player: 0,
    waiting_for: { type: "EmpowerJaceChoice" },
    players: [],
    objects: {
      40: { id: 40, zone: "Battlefield", name: "Jace" },
      41: { id: 41, zone: "Battlefield", name: "Jace" },
    },
    battlefield: [40, 41],
    command_zone: [],
    stack: [],
    eliminated_players: [],
  } as unknown as GameState;
}

const EMPOWER: WaitingFor = {
  type: "EmpowerJaceChoice",
  data: { player: 0, source_id: 99, choices: [40, 41], count: 2 },
};

describe("parseEmpowerJacePrompt", () => {
  it("parses the candidate tokens and loyalty count", () => {
    const p = parseEmpowerJacePrompt(EMPOWER, stateWithJaces())!;
    expect(p.player).toBe(0);
    expect(p.count).toBe(2);
    expect(p.choices).toEqual([
      { id: 40, name: "Jace" },
      { id: 41, name: "Jace" },
    ]);
  });

  it("returns null without candidates", () => {
    const wf: WaitingFor = {
      type: "EmpowerJaceChoice",
      data: { player: 0, source_id: 99, choices: [], count: 2 },
    };
    expect(parseEmpowerJacePrompt(wf, stateWithJaces())).toBeNull();
  });

  it("returns null for other decisions", () => {
    const wf: WaitingFor = {
      type: "BeholdChoice",
      data: { player: 0, choices: [40] },
    };
    expect(parseEmpowerJacePrompt(wf, stateWithJaces())).toBeNull();
  });
});

describe("empowerJaceAction", () => {
  it("submits exactly one token as SelectCards", () => {
    expect(empowerJaceAction(41)).toEqual({
      type: "SelectCards",
      data: { cards: [41] },
    });
  });
});
