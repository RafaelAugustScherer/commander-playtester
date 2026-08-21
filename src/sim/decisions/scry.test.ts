import { describe, it, expect } from "vitest";
import { parseScryPrompt, scryAction } from "./scry";
import type { GameState, WaitingFor } from "../../engine/types";

function stateWithLibrary(): GameState {
  const objects: GameState["objects"] = {};
  for (const id of [13, 67, 81]) {
    objects[id] = { id, zone: "Library", name: `Card ${id}` };
  }
  return {
    turn_number: 3,
    phase: "Upkeep",
    active_player: 0,
    waiting_for: { type: "ScryChoice" },
    players: [
      { id: 0, life: 40, hand: [], library: [13, 67, 81], graveyard: [] },
      { id: 1, life: 40, hand: [], library: [], graveyard: [] },
    ],
    objects,
    battlefield: [],
    command_zone: [],
    stack: [],
    eliminated_players: [],
  } as unknown as GameState;
}

// Shapes captured from the vendored phase-rs WASM by headless introspection.
const SCRY: WaitingFor = { type: "ScryChoice", data: { cards: [13, 67], player: 0 } };
const SURVEIL: WaitingFor = { type: "SurveilChoice", data: { cards: [13], player: 0 } };

describe("parseScryPrompt", () => {
  it("reads scry cards, top of library first", () => {
    const prompt = parseScryPrompt(SCRY, stateWithLibrary(), 0);
    expect(prompt).not.toBeNull();
    expect(prompt!.mode).toBe("scry");
    expect(prompt!.player).toBe(0);
    expect(prompt!.cards.map((c) => c.id)).toEqual([13, 67]);
    expect(prompt!.cards[0].name).toBe("Card 13");
  });

  it("tags a SurveilChoice as surveil", () => {
    expect(parseScryPrompt(SURVEIL, stateWithLibrary(), 0)!.mode).toBe("surveil");
  });

  it("returns null when the decision targets another seat", () => {
    expect(parseScryPrompt(SCRY, stateWithLibrary(), 1)).toBeNull();
  });

  it("returns null for an unrelated waiting_for", () => {
    expect(parseScryPrompt({ type: "DiscardChoice" }, stateWithLibrary(), 0)).toBeNull();
  });

  it("returns null when no cards are looked at", () => {
    const wf: WaitingFor = { type: "ScryChoice", data: { cards: [], player: 0 } };
    expect(parseScryPrompt(wf, stateWithLibrary(), 0)).toBeNull();
  });
});

describe("scryAction", () => {
  it("submits the kept ids as a SelectCards action, topmost first", () => {
    expect(scryAction([67, 13])).toEqual({
      type: "SelectCards",
      data: { cards: [67, 13] },
    });
  });

  it("keeps nothing on top with an empty selection", () => {
    expect(scryAction([])).toEqual({ type: "SelectCards", data: { cards: [] } });
  });
});
