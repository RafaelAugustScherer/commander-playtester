import { describe, it, expect } from "vitest";
import { parseDigPrompt, keepDigCardsAction } from "./dig";
import type { GameState, WaitingFor } from "../../engine/types";

// Shapes confirmed against phase-rs client/src/adapter/types.ts (DigModal)
// at v0.71.0: DigChoice { player, cards, keep_count, up_to?,
// selectable_cards?, kept_destination?, rest_destination? }.
const REAL_DIG: WaitingFor = {
  type: "DigChoice",
  data: {
    player: 0,
    cards: [12, 34, 56],
    keep_count: 1,
    up_to: true,
    kept_destination: "Hand",
    rest_destination: "Graveyard",
  },
};

// A dig where the engine restricts which of the dug cards are actually
// eligible to keep (selectable_cards is a strict subset of cards).
const REAL_DIG_RESTRICTED: WaitingFor = {
  type: "DigChoice",
  data: {
    player: 0,
    cards: [12, 34, 56],
    selectable_cards: [12, 56],
    keep_count: 1,
    kept_destination: "Battlefield",
    rest_destination: "Library",
  },
};

const STATE: GameState = {
  turn_number: 1,
  phase: "Main1",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    12: { id: 12, name: "Sol Ring", zone: "Library" },
    34: { id: 34, name: "Arcane Signet", zone: "Library" },
    56: { id: 56, name: "Command Tower", zone: "Library" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

describe("parseDigPrompt", () => {
  it("parses the player, cards, keepCount, upTo and destinations", () => {
    const p = parseDigPrompt(REAL_DIG, STATE);
    expect(p).not.toBeNull();
    expect(p?.player).toBe(0);
    expect(p?.keepCount).toBe(1);
    expect(p?.upTo).toBe(true);
    expect(p?.keptDestination).toBe("Hand");
    expect(p?.restDestination).toBe("Graveyard");
    expect(p?.cards).toEqual([
      { id: 12, name: "Sol Ring" },
      { id: 34, name: "Arcane Signet" },
      { id: 56, name: "Command Tower" },
    ]);
  });

  it("defaults selectableIds to all cards when selectable_cards is absent", () => {
    const p = parseDigPrompt(REAL_DIG, STATE);
    expect(p?.selectableIds).toEqual([12, 34, 56]);
  });

  it("restricts selectableIds to selectable_cards when it is a subset of cards", () => {
    const p = parseDigPrompt(REAL_DIG_RESTRICTED, STATE);
    expect(p).not.toBeNull();
    expect(p?.selectableIds).toEqual([12, 56]);
    expect(p?.upTo).toBe(false);
    expect(p?.keptDestination).toBe("Battlefield");
    expect(p?.restDestination).toBe("Library");
  });

  it("falls back to empty card names when state is omitted", () => {
    const p = parseDigPrompt(REAL_DIG);
    expect(p?.cards.map((c) => c.name)).toEqual(["", "", ""]);
  });

  it("defaults keepCount to 1 and upTo to false when absent", () => {
    const wf: WaitingFor = {
      type: "DigChoice",
      data: { player: 1, cards: [1] },
    };
    const p = parseDigPrompt(wf);
    expect(p?.keepCount).toBe(1);
    expect(p?.upTo).toBe(false);
  });

  it("returns null when cards is empty", () => {
    const wf: WaitingFor = {
      type: "DigChoice",
      data: { player: 0, cards: [], keep_count: 1 },
    };
    expect(parseDigPrompt(wf)).toBeNull();
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseDigPrompt(undefined)).toBeNull();
    expect(parseDigPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("keepDigCardsAction", () => {
  it("builds the SelectCards action with the kept ids", () => {
    expect(keepDigCardsAction([12, 56])).toEqual({
      type: "SelectCards",
      data: { cards: [12, 56] },
    });
  });

  it("builds the action for an empty selection", () => {
    expect(keepDigCardsAction([])).toEqual({
      type: "SelectCards",
      data: { cards: [] },
    });
  });
});
