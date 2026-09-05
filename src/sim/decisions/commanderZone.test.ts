import { describe, it, expect } from "vitest";
import {
  parseCommanderZonePrompt,
  commanderZoneAction,
} from "./commanderZone";
import type { GameObject, WaitingFor } from "../../engine/types";

// Shape confirmed against phase-rs client/src/adapter/types.ts (v0.71.0):
// CommanderZoneChoice { player, commander_id, current_zone }.
const REAL_COMMANDER_ZONE: WaitingFor = {
  type: "CommanderZoneChoice",
  data: {
    player: 0,
    commander_id: 12,
    current_zone: "Graveyard",
  },
};

const OBJECTS: Record<string, GameObject> = {
  12: { id: 12, name: "Atraxa, Praetors' Voice", zone: "Graveyard" },
};

describe("parseCommanderZonePrompt", () => {
  it("parses the player, commander name and current zone", () => {
    const p = parseCommanderZonePrompt(REAL_COMMANDER_ZONE, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(0);
    expect(p.commanderName).toBe("Atraxa, Praetors' Voice");
    expect(p.currentZone).toBe("Graveyard");
  });

  it("falls back to an empty commander name when the object is unknown", () => {
    const p = parseCommanderZonePrompt(REAL_COMMANDER_ZONE);
    expect(p?.commanderName).toBe("");
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseCommanderZonePrompt(undefined)).toBeNull();
    expect(
      parseCommanderZonePrompt({ type: "Priority", data: {} }),
    ).toBeNull();
  });

  it("returns null when the current zone is missing", () => {
    const wf: WaitingFor = {
      type: "CommanderZoneChoice",
      data: { player: 0, commander_id: 12 },
    };
    expect(parseCommanderZonePrompt(wf)).toBeNull();
  });
});

describe("commanderZoneAction", () => {
  it("builds the send-to-command-zone action", () => {
    expect(commanderZoneAction(true)).toEqual({
      type: "DecideOptionalEffect",
      data: { accept: true },
    });
  });

  it("builds the leave-in-current-zone action", () => {
    expect(commanderZoneAction(false)).toEqual({
      type: "DecideOptionalEffect",
      data: { accept: false },
    });
  });
});
