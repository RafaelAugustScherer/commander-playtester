import { describe, it, expect } from "vitest";
import { parseDiscardPrompt, discardCardsAction } from "./discard";
import type { GameState, WaitingFor } from "../../engine/types";

// Names the popup renders for the discard candidates.
function stateWithHand(): GameState {
  const objects: GameState["objects"] = {};
  for (const id of [45, 65, 87, 86, 69, 91]) {
    objects[id] = { id, zone: "Hand", name: `Card ${id}` };
  }
  return {
    turn_number: 5,
    phase: "Cleanup",
    active_player: 0,
    waiting_for: { type: "DiscardChoice" },
    players: [
      { id: 0, life: 40, hand: [45, 65, 87, 86, 69, 91], library: [], graveyard: [] },
      { id: 1, life: 40, hand: [], library: [], graveyard: [] },
    ],
    objects,
    battlefield: [],
    command_zone: [],
    stack: [],
    eliminated_players: [],
  } as unknown as GameState;
}

// Forced discard captured from the phase-rs WASM build (v0.55.0): seat 0 must
// discard two of the six eligible cards.
const DISCARD: WaitingFor = {
  type: "DiscardChoice",
  data: {
    cards: [45, 65, 87, 86, 69, 91],
    count: 2,
    effect_kind: "Discard",
    player: 0,
    source_id: 127,
  },
};

describe("parseDiscardPrompt", () => {
  it("reads the count and the eligible cards for the acting seat", () => {
    const prompt = parseDiscardPrompt(DISCARD, stateWithHand(), 0);
    expect(prompt).not.toBeNull();
    expect(prompt!.player).toBe(0);
    expect(prompt!.count).toBe(2);
    expect(prompt!.cards.map((c) => c.id)).toEqual([45, 65, 87, 86, 69, 91]);
    expect(prompt!.cards[0].name).toBe("Card 45");
  });

  it("returns null when the decision targets another seat", () => {
    expect(parseDiscardPrompt(DISCARD, stateWithHand(), 1)).toBeNull();
  });

  it("returns null for a non-discard waiting_for", () => {
    const wf: WaitingFor = { type: "MulliganDecision" };
    expect(parseDiscardPrompt(wf, stateWithHand(), 0)).toBeNull();
  });

  it("defaults count to 1 when the engine omits it", () => {
    const wf: WaitingFor = {
      type: "DiscardChoice",
      data: { cards: [45, 65], player: 0 },
    };
    expect(parseDiscardPrompt(wf, stateWithHand(), 0)!.count).toBe(1);
  });
});

describe("discardCardsAction", () => {
  it("submits the chosen ids as a SelectCards action", () => {
    expect(discardCardsAction([45, 69])).toEqual({
      type: "SelectCards",
      data: { cards: [45, 69] },
    });
  });
});
