import { describe, it, expect } from "vitest";
import {
  parseExploreRevealPrompt,
  exploreCreatureAction,
  revealUntilAction,
} from "./exploreReveal";
import type { GameState, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (TargetingOverlay)
// at v0.71.0: ExploreChoice { player, source_id, choosable, remaining, pending_effect }.
const REAL_EXPLORE: WaitingFor = {
  type: "ExploreChoice",
  data: {
    player: 0,
    source_id: 90,
    choosable: [12, 34],
    remaining: [56],
    pending_effect: { type: "Explore" },
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (RevealUntilKeptChoiceModal) at v0.71.0: RevealUntilKeptChoice { player,
// hit_card, source_id, accept_zone, decline_zone, enter_tapped,
// enters_attacking, revealed_misses, rest_destination }.
const REAL_REVEAL: WaitingFor = {
  type: "RevealUntilKeptChoice",
  data: {
    player: 0,
    hit_card: 78,
    source_id: 90,
    accept_zone: "Battlefield",
    decline_zone: "Graveyard",
    enter_tapped: false,
    enters_attacking: false,
    revealed_misses: [11, 22],
    rest_destination: "Graveyard",
  },
};

const STATE: GameState = {
  turn_number: 1,
  phase: "Main1",
  active_player: 0,
  waiting_for: { type: "Priority" },
  players: [],
  objects: {
    12: { id: 12, name: "Elvish Mystic", zone: "Library" },
    34: { id: 34, name: "Nyxbloom Ancient", zone: "Library" },
    56: { id: 56, name: "Sol Ring", zone: "Library" },
    78: { id: 78, name: "Kodama's Reach", zone: "Library" },
    90: { id: 90, name: "Ranger of Eos", zone: "Battlefield" },
  },
  battlefield: [],
  command_zone: [],
  stack: [],
  eliminated_players: [],
};

describe("parseExploreRevealPrompt", () => {
  describe("ExploreChoice", () => {
    it("parses the player, source name and choosable creatures", () => {
      const p = parseExploreRevealPrompt(REAL_EXPLORE, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "explore") throw new Error("expected an explore prompt");
      expect(p.player).toBe(0);
      expect(p.sourceName).toBe("Ranger of Eos");
      expect(p.creatures).toEqual([
        { id: 12, name: "Elvish Mystic" },
        { id: 34, name: "Nyxbloom Ancient" },
      ]);
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseExploreRevealPrompt(REAL_EXPLORE);
      if (p?.kind !== "explore") throw new Error("expected an explore prompt");
      expect(p.sourceName).toBe("");
      expect(p.creatures.map((c) => c.name)).toEqual(["", ""]);
    });

    it("returns null when choosable is empty", () => {
      const wf: WaitingFor = {
        type: "ExploreChoice",
        data: { player: 0, source_id: 90, choosable: [], remaining: [] },
      };
      expect(parseExploreRevealPrompt(wf)).toBeNull();
    });
  });

  describe("RevealUntilKeptChoice", () => {
    it("parses the player, source/hit names and both zones", () => {
      const p = parseExploreRevealPrompt(REAL_REVEAL, STATE)!;
      expect(p).not.toBeNull();
      if (p.kind !== "reveal") throw new Error("expected a reveal prompt");
      expect(p.player).toBe(0);
      expect(p.sourceName).toBe("Ranger of Eos");
      expect(p.hitCardName).toBe("Kodama's Reach");
      expect(p.acceptZone).toBe("Battlefield");
      expect(p.declineZone).toBe("Graveyard");
    });

    it("falls back to empty names when state is omitted", () => {
      const p = parseExploreRevealPrompt(REAL_REVEAL);
      if (p?.kind !== "reveal") throw new Error("expected a reveal prompt");
      expect(p.sourceName).toBe("");
      expect(p.hitCardName).toBe("");
    });

    it("returns null when accept_zone is missing", () => {
      const wf: WaitingFor = {
        type: "RevealUntilKeptChoice",
        data: {
          player: 0,
          hit_card: 78,
          source_id: 90,
          decline_zone: "Graveyard",
        },
      };
      expect(parseExploreRevealPrompt(wf)).toBeNull();
    });

    it("returns null when decline_zone is missing", () => {
      const wf: WaitingFor = {
        type: "RevealUntilKeptChoice",
        data: {
          player: 0,
          hit_card: 78,
          source_id: 90,
          accept_zone: "Battlefield",
        },
      };
      expect(parseExploreRevealPrompt(wf)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseExploreRevealPrompt(undefined)).toBeNull();
    expect(parseExploreRevealPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("exploreCreatureAction", () => {
  it("builds the ChooseTarget action", () => {
    expect(exploreCreatureAction(12)).toEqual({
      type: "ChooseTarget",
      data: { target: { Object: 12 } },
    });
  });
});

describe("revealUntilAction", () => {
  it("builds the accept action", () => {
    expect(revealUntilAction(true)).toEqual({
      type: "DecideOptionalEffect",
      data: { accept: true },
    });
  });

  it("builds the decline action", () => {
    expect(revealUntilAction(false)).toEqual({
      type: "DecideOptionalEffect",
      data: { accept: false },
    });
  });
});
