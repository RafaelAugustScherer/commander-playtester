import { describe, it, expect } from "vitest";
import {
  parseMulliganPrompt,
  mulliganKeepAction,
  mulliganTakeAction,
  bottomCardsAction,
} from "./mulligan";
import type { GameState, WaitingFor } from "../../engine/types";

// A minimal state carrying two seven-card hands, enough for the parser to read
// the acting seat's cards. Object names are what the popup renders.
function stateWithHands(): GameState {
  const objects: GameState["objects"] = {};
  const mkHand = (base: number) =>
    Array.from({ length: 7 }, (_, i) => {
      const id = base + i;
      objects[id] = { id, zone: "Hand", name: `Card ${id}` };
      return id;
    });
  return {
    turn_number: 1,
    phase: "Untap",
    active_player: 0,
    waiting_for: { type: "MulliganDecision" },
    players: [
      { id: 0, life: 40, hand: mkHand(10), library: [], graveyard: [] },
      { id: 1, life: 40, hand: mkHand(20), library: [], graveyard: [] },
    ],
    objects,
    battlefield: [],
    command_zone: [],
    stack: [],
    eliminated_players: [],
  } as unknown as GameState;
}

// Opening decision captured from the phase-rs WASM build (v0.55.0): both seats
// pending, declaring, with the Commander free first mulligan.
const OPENING: WaitingFor = {
  type: "MulliganDecision",
  data: {
    free_first_mulligan: true,
    pending: [
      { mulligan_count: 0, phase: { type: "Declare" }, player: 0 },
      { mulligan_count: 0, phase: { type: "Declare" }, player: 1 },
    ],
  },
};

describe("parseMulliganPrompt — declare", () => {
  it("reads the opening decision, its hand, and the free first mulligan", () => {
    const p = parseMulliganPrompt(OPENING, stateWithHands(), 0)!;
    expect(p).not.toBeNull();
    expect(p.stage).toBe("declare");
    expect(p.player).toBe(0);
    expect(p.mulliganCount).toBe(0);
    expect(p.freeFirstMulligan).toBe(true);
    expect(p.hand.map((c) => c.id)).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(p.hand[0].name).toBe("Card 10");
    // Keeping now (or after one free mulligan) still keeps all seven.
    expect(p.keepSize).toBe(7);
    expect(p.nextKeepSize).toBe(7);
  });

  it("shrinks the kept hand only from the second mulligan on (free first)", () => {
    const at = (count: number, free: boolean) =>
      parseMulliganPrompt(
        {
          type: "MulliganDecision",
          data: {
            free_first_mulligan: free,
            pending: [{ mulligan_count: count, phase: { type: "Declare" }, player: 0 }],
          },
        },
        stateWithHands(),
        0,
      )!;
    // Free first mulligan: 0→keep 7, 1→keep 7, 2→keep 6, 3→keep 5.
    expect(at(0, true).keepSize).toBe(7);
    expect(at(0, true).nextKeepSize).toBe(7);
    expect(at(1, true).keepSize).toBe(7);
    expect(at(1, true).nextKeepSize).toBe(6);
    expect(at(2, true).keepSize).toBe(6);
    expect(at(2, true).nextKeepSize).toBe(5);
    // Without the free first mulligan the first mulligan already costs a card.
    expect(at(1, false).keepSize).toBe(6);
    expect(at(1, false).nextKeepSize).toBe(5);
  });

  it("returns the entry for the requested seat", () => {
    const p1 = parseMulliganPrompt(OPENING, stateWithHands(), 1)!;
    expect(p1.player).toBe(1);
    expect(p1.hand[0].id).toBe(20);
  });
});

describe("parseMulliganPrompt — bottom", () => {
  // After keeping with three mulligans and a free first, two cards are owed.
  const BOTTOM: WaitingFor = {
    type: "MulliganDecision",
    data: {
      free_first_mulligan: true,
      pending: [
        {
          mulligan_count: 3,
          phase: { type: "BottomCards", count: 2, then: { type: "Keep" } },
          player: 0,
        },
      ],
    },
  };

  it("reads the bottom stage and how many cards are owed", () => {
    const p = parseMulliganPrompt(BOTTOM, stateWithHands(), 0)!;
    expect(p.stage).toBe("bottom");
    expect(p.bottomCount).toBe(2);
    expect(p.keepSize).toBe(5);
    expect(p.hand).toHaveLength(7);
  });
});

describe("parseMulliganPrompt — non-matching", () => {
  it("returns null when the seat already kept (not in pending)", () => {
    const onlySeat1: WaitingFor = {
      type: "MulliganDecision",
      data: {
        free_first_mulligan: true,
        pending: [{ mulligan_count: 0, phase: { type: "Declare" }, player: 1 }],
      },
    };
    expect(parseMulliganPrompt(onlySeat1, stateWithHands(), 0)).toBeNull();
  });

  it("ignores other waiting_for kinds and empty input", () => {
    expect(parseMulliganPrompt(undefined, stateWithHands(), 0)).toBeNull();
    expect(
      parseMulliganPrompt({ type: "Priority", data: { player: 0 } }, stateWithHands(), 0),
    ).toBeNull();
  });
});

describe("mulligan action builders", () => {
  it("builds the exact actions the engine accepts", () => {
    expect(mulliganKeepAction()).toEqual({
      type: "MulliganDecision",
      data: { choice: { type: "Keep" } },
    });
    expect(mulliganTakeAction()).toEqual({
      type: "MulliganDecision",
      data: { choice: { type: "Mulligan" } },
    });
    expect(bottomCardsAction([32, 53])).toEqual({
      type: "SelectCards",
      data: { cards: [32, 53] },
    });
  });
});
