import { describe, it, expect } from "vitest";
import {
  parseLibraryOrderPrompt,
  libraryOrderCanMove,
  libraryOrderAction,
} from "./libraryOrder";
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
    waiting_for: { type: "DigRestSplitChoice" },
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

const REVEAL_UNTIL: WaitingFor = {
  type: "RevealUntilBottomOrder",
  data: { player: 0, source_id: 99, cards: [21, 34], clear_markers: [21, 34] },
};

function split(scope: string): WaitingFor {
  return {
    type: "DigRestSplitChoice",
    data: {
      player: 0,
      library_owner: 0,
      cards: [21, 34, 55],
      top_count: 1,
      bottom_count: 2,
      scope,
      source_id: 99,
    },
  };
}

describe("parseLibraryOrderPrompt", () => {
  it("parses a reveal-until bottom order as an all-bottom pile", () => {
    const p = parseLibraryOrderPrompt(REVEAL_UNTIL, stateWithLibrary())!;
    expect(p.kind).toBe("revealUntilBottom");
    expect(p.cards).toEqual([
      { id: 21, name: "Card 21" },
      { id: 34, name: "Card 34" },
    ]);
    expect(p.topCount).toBe(0);
    expect(p.bottomCount).toBe(2);
    expect(p.splitLocked).toBe(false);
  });

  it("parses a dig rest split with its top count", () => {
    const p = parseLibraryOrderPrompt(
      split("partition_and_order"),
      stateWithLibrary(),
    )!;
    expect(p.kind).toBe("digRestSplit");
    expect(p.topCount).toBe(1);
    expect(p.bottomCount).toBe(2);
    expect(p.splitLocked).toBe(false);
  });

  it("locks the split for an order-only prompt", () => {
    const p = parseLibraryOrderPrompt(split("order_only"), stateWithLibrary())!;
    expect(p.splitLocked).toBe(true);
  });

  it("returns null for an empty pile", () => {
    const wf: WaitingFor = {
      type: "RevealUntilBottomOrder",
      data: { player: 0, source_id: 99, cards: [] },
    };
    expect(parseLibraryOrderPrompt(wf, stateWithLibrary())).toBeNull();
  });

  it("returns null for other decisions", () => {
    const wf: WaitingFor = {
      type: "RippleBottomOrder",
      data: { player: 0, source_id: 99, cards: [21, 34] },
    };
    expect(parseLibraryOrderPrompt(wf, stateWithLibrary())).toBeNull();
    expect(parseLibraryOrderPrompt(undefined, stateWithLibrary())).toBeNull();
  });
});

describe("libraryOrderCanMove", () => {
  it("lets a card cross the split when the partition is open", () => {
    const p = parseLibraryOrderPrompt(
      split("partition_only"),
      stateWithLibrary(),
    )!;
    expect(libraryOrderCanMove(p, 0, 1)).toBe(true);
    expect(libraryOrderCanMove(p, 2, 3)).toBe(false);
  });

  it("keeps cards on their side when the split is locked", () => {
    const p = parseLibraryOrderPrompt(split("order_only"), stateWithLibrary())!;
    expect(libraryOrderCanMove(p, 0, 1)).toBe(false);
    expect(libraryOrderCanMove(p, 1, 2)).toBe(true);
    expect(libraryOrderCanMove(p, 0, -1)).toBe(false);
  });
});

describe("libraryOrderAction", () => {
  it("submits the full arrangement as SelectCards", () => {
    expect(libraryOrderAction([34, 21, 55])).toEqual({
      type: "SelectCards",
      data: { cards: [34, 21, 55] },
    });
  });
});
