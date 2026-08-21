import { describe, it, expect } from "vitest";
import { toBoardView } from "./boardView";
import type { GameStateEnvelope } from "../engine/types";

function envelope(): GameStateEnvelope {
  return {
    state: {
      turn_number: 1,
      phase: "Main1",
      active_player: 0,
      waiting_for: { type: "Priority" },
      players: [{ id: 0, life: 40, hand: [], library: [], graveyard: [1, 2] }],
      objects: {
        1: {
          id: 1,
          name: "Tapped Attacker",
          zone: "Graveyard",
          owner: 0,
          tapped: true,
          card_types: { core_types: ["Creature"] },
        },
        2: {
          id: 2,
          name: "Dead Spell",
          zone: "Graveyard",
          owner: 0,
          tapped: false,
          card_types: { core_types: ["Instant"] },
        },
      },
      battlefield: [],
      command_zone: [],
      stack: [],
      eliminated_players: [],
    },
    derived: {},
  } as GameStateEnvelope;
}

describe("toBoardView graveyard", () => {
  it("projects the graveyard cards in order with the right count", () => {
    const view = toBoardView(envelope(), [{ name: "You", commander: "" }]);
    const gy = view.seats[0].graveyard;
    expect(view.seats[0].graveyardSize).toBe(2);
    expect(gy.map((o) => o.name)).toEqual(["Tapped Attacker", "Dead Spell"]);
  });

  it("renders every graveyard card untapped without mutating the source", () => {
    const env = envelope();
    const gy = toBoardView(env, [{ name: "You", commander: "" }]).seats[0].graveyard;
    expect(gy.every((o) => o.tapped === false)).toBe(true);
    expect(env.state.objects[1].tapped).toBe(true);
  });
});
