import { describe, it, expect } from "vitest";
import {
  parseSearchPrompt,
  selectSearchCardsAction,
  chooseOutsideGameAction,
} from "./search";
import type { GameState, WaitingFor } from "../../engine/types";

// Shapes confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// SearchChoice { player, cards, count, up_to?, allows_partial_find? }.
const REAL_SEARCH: WaitingFor = {
  type: "SearchChoice",
  data: {
    player: 0,
    cards: [12, 34, 56],
    count: 1,
    up_to: true,
  },
};

// SearchPartitionChoice { player, cards, primary_destination, primary_count,
// primary_enter_tapped, rest_destination, source_id }.
const REAL_PARTITION: WaitingFor = {
  type: "SearchPartitionChoice",
  data: {
    player: 0,
    cards: [12, 34, 56],
    primary_destination: "Battlefield",
    primary_count: 1,
    primary_enter_tapped: true,
    rest_destination: "Graveyard",
    source_id: 78,
  },
};

// OutsideGameChoice { player, source_id, choices: { source, count, name }[],
// count, destination }.
const REAL_OUTSIDE: WaitingFor = {
  type: "OutsideGameChoice",
  data: {
    player: 0,
    source_id: 90,
    choices: [
      { source: { type: "Sideboard", data: { sideboard_index: 2 } }, count: 1, name: "Beast Within" },
      { source: { type: "FaceUpExile", data: { object_id: 44 } }, count: 1, name: "Regrowth" },
    ],
    count: 1,
    destination: "Hand",
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

describe("parseSearchPrompt", () => {
  describe("SearchChoice", () => {
    it("parses the player, cards, count and upTo (up_to)", () => {
      const p = parseSearchPrompt(REAL_SEARCH, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "search") throw new Error("expected a search prompt");
      expect(p.player).toBe(0);
      expect(p.count).toBe(1);
      expect(p.upTo).toBe(true);
      expect(p.cards).toEqual([
        { id: 12, name: "Sol Ring" },
        { id: 34, name: "Arcane Signet" },
        { id: 56, name: "Command Tower" },
      ]);
    });

    it("falls back to empty card names when state is omitted", () => {
      const p = parseSearchPrompt(REAL_SEARCH);
      if (p?.kind !== "search") throw new Error("expected a search prompt");
      expect(p.cards.map((c) => c.name)).toEqual(["", "", ""]);
    });

    it("treats allows_partial_find as upTo too", () => {
      const wf: WaitingFor = {
        type: "SearchChoice",
        data: { player: 1, cards: [1], count: 2, allows_partial_find: true },
      };
      const p = parseSearchPrompt(wf);
      if (p?.kind !== "search") throw new Error("expected a search prompt");
      expect(p.upTo).toBe(true);
    });

    it("is not upTo when neither up_to nor allows_partial_find is set", () => {
      const wf: WaitingFor = {
        type: "SearchChoice",
        data: { player: 1, cards: [1], count: 1 },
      };
      const p = parseSearchPrompt(wf);
      if (p?.kind !== "search") throw new Error("expected a search prompt");
      expect(p.upTo).toBe(false);
    });

    it("returns null when cards is empty", () => {
      const wf: WaitingFor = {
        type: "SearchChoice",
        data: { player: 0, cards: [], count: 1 },
      };
      expect(parseSearchPrompt(wf)).toBeNull();
    });
  });

  describe("SearchPartitionChoice", () => {
    it("parses the player, cards, primary_count as count, and both destinations", () => {
      const p = parseSearchPrompt(REAL_PARTITION, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "partition") throw new Error("expected a partition prompt");
      expect(p.player).toBe(0);
      expect(p.count).toBe(1);
      expect(p.upTo).toBe(false);
      expect(p.primaryDestination).toBe("Battlefield");
      expect(p.restDestination).toBe("Graveyard");
      expect(p.cards).toEqual([
        { id: 12, name: "Sol Ring" },
        { id: 34, name: "Arcane Signet" },
        { id: 56, name: "Command Tower" },
      ]);
    });

    it("returns null when cards is empty", () => {
      const wf: WaitingFor = {
        type: "SearchPartitionChoice",
        data: {
          player: 0,
          cards: [],
          primary_destination: "Battlefield",
          primary_count: 1,
          rest_destination: "Graveyard",
        },
      };
      expect(parseSearchPrompt(wf)).toBeNull();
    });
  });

  describe("OutsideGameChoice", () => {
    it("parses the player, entries (label + source), count and destination", () => {
      const p = parseSearchPrompt(REAL_OUTSIDE)!;
      expect(p).not.toBeNull();
      expect(p.kind).toBe("outside");
      expect(p.player).toBe(0);
      expect(p.count).toBe(1);
      if (p.kind === "outside") {
        expect(p.destination).toBe("Hand");
        expect(p.entries).toEqual([
          {
            label: "Beast Within",
            source: { type: "Sideboard", data: { sideboard_index: 2 } },
          },
          {
            label: "Regrowth",
            source: { type: "FaceUpExile", data: { object_id: 44 } },
          },
        ]);
      }
    });

    it("returns null when choices is empty", () => {
      const wf: WaitingFor = {
        type: "OutsideGameChoice",
        data: { player: 0, choices: [], count: 1, destination: "Hand" },
      };
      expect(parseSearchPrompt(wf)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseSearchPrompt(undefined)).toBeNull();
    expect(parseSearchPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("selectSearchCardsAction", () => {
  it("builds the SelectCards action", () => {
    expect(selectSearchCardsAction([12, 34])).toEqual({
      type: "SelectCards",
      data: { cards: [12, 34] },
    });
  });

  it("builds the action for an empty selection", () => {
    expect(selectSearchCardsAction([])).toEqual({
      type: "SelectCards",
      data: { cards: [] },
    });
  });
});

describe("chooseOutsideGameAction", () => {
  it("builds the ChooseOutsideGameCards action with a Sideboard selection", () => {
    expect(
      chooseOutsideGameAction([
        { type: "Sideboard", data: { sideboard_index: 2 } },
      ]),
    ).toEqual({
      type: "ChooseOutsideGameCards",
      data: { selections: [{ type: "Sideboard", data: { sideboard_index: 2 } }] },
    });
  });

  it("builds the action with a FaceUpExile selection", () => {
    expect(
      chooseOutsideGameAction([
        { type: "FaceUpExile", data: { object_id: 44 } },
      ]),
    ).toEqual({
      type: "ChooseOutsideGameCards",
      data: { selections: [{ type: "FaceUpExile", data: { object_id: 44 } }] },
    });
  });
});
