import { describe, it, expect } from "vitest";
import {
  parseRipplePrompt,
  rippleRevealAction,
  rippleBottomOrderAction,
} from "./ripple";
import type { GameState, WaitingFor } from "../../engine/types";

function stateWithLibrary(): GameState {
  const objects: GameState["objects"] = {};
  for (const id of [21, 34, 55]) {
    objects[id] = { id, zone: "Library", name: `Card ${id}` };
  }
  return {
    turn_number: 5,
    phase: "Main1",
    active_player: 0,
    waiting_for: { type: "RippleBottomOrder" },
    players: [
      { id: 0, life: 40, hand: [], library: [21, 34, 55], graveyard: [] },
      { id: 1, life: 40, hand: [], library: [], graveyard: [] },
    ],
    objects,
    battlefield: [],
    command_zone: [],
    stack: [],
    eliminated_players: [],
  } as unknown as GameState;
}

// Shapes confirmed against phase-rs client/src/adapter/types.ts (RippleReveal
// Choice, RippleBottomOrder) at v0.86.0.
const REVEAL: WaitingFor = {
  type: "RippleRevealChoice",
  data: { player: 0, source_id: 99, count: 4 },
};
const BOTTOM: WaitingFor = {
  type: "RippleBottomOrder",
  data: { player: 0, source_id: 99, cards: [21, 34] },
};

describe("parseRipplePrompt", () => {
  it("parses the reveal offer's count", () => {
    const p = parseRipplePrompt(REVEAL, stateWithLibrary())!;
    expect(p).not.toBeNull();
    if (p.kind !== "reveal") throw new Error("expected a reveal prompt");
    expect(p.player).toBe(0);
    expect(p.count).toBe(4);
  });

  it("parses the bottom-order cards with names", () => {
    const p = parseRipplePrompt(BOTTOM, stateWithLibrary())!;
    expect(p).not.toBeNull();
    if (p.kind !== "bottomOrder") throw new Error("expected a bottomOrder prompt");
    expect(p.cards.map((c) => c.id)).toEqual([21, 34]);
    expect(p.cards[0].name).toBe("Card 21");
  });

  it("returns null when the bottom-order pile is empty", () => {
    const wf: WaitingFor = {
      type: "RippleBottomOrder",
      data: { player: 0, source_id: 99, cards: [] },
    };
    expect(parseRipplePrompt(wf, stateWithLibrary())).toBeNull();
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseRipplePrompt(undefined, stateWithLibrary())).toBeNull();
    expect(
      parseRipplePrompt({ type: "Priority", data: {} }, stateWithLibrary()),
    ).toBeNull();
  });
});

describe("rippleRevealAction", () => {
  it("reveals with a Cast choice", () => {
    expect(rippleRevealAction(true)).toEqual({
      type: "RippleChoice",
      data: { choice: { type: "Cast" } },
    });
  });

  it("declines with a Decline choice", () => {
    expect(rippleRevealAction(false)).toEqual({
      type: "RippleChoice",
      data: { choice: { type: "Decline" } },
    });
  });
});

describe("rippleBottomOrderAction", () => {
  it("builds the SelectCards action with the chosen order", () => {
    expect(rippleBottomOrderAction([34, 21])).toEqual({
      type: "SelectCards",
      data: { cards: [34, 21] },
    });
  });
});
