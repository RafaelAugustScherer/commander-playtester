import { describe, it, expect } from "vitest";
import {
  parseEquipCrewPrompt,
  equipAction,
  activateStationAction,
  crewVehicleAction,
  saddleMountAction,
} from "./equipCrew";
import type { GameObject, WaitingFor } from "../../engine/types";

const OBJECTS: Record<string, GameObject> = {
  1: { id: 1, name: "Bonesplitter", zone: "Battlefield" },
  2: {
    id: 2,
    name: "Grizzly Bears",
    zone: "Battlefield",
    power: 2,
    toughness: 2,
  },
  3: {
    id: 3,
    name: "Runeclaw Bear",
    zone: "Battlefield",
    power: 2,
    toughness: 2,
  },
  4: { id: 4, name: "Skysovereign, Consul Flagship", zone: "Battlefield" },
  5: { id: 5, name: "Smuggler's Copter", zone: "Battlefield" },
  6: {
    id: 6,
    name: "Elite Vanguard",
    zone: "Battlefield",
    power: 1,
    toughness: 1,
  },
  7: {
    id: 7,
    name: "Loyal Pegasus",
    zone: "Battlefield",
    power: 1,
    toughness: 1,
  },
  8: { id: 8, name: "Winged Temple of Orazca", zone: "Battlefield" },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (EquipTargetModal) at v0.71.0: EquipTarget { player, equipment_id, valid_targets }.
const REAL_EQUIP: WaitingFor = {
  type: "EquipTarget",
  data: { player: 0, equipment_id: 1, valid_targets: [2, 3] },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (StationTargetModal) at v0.71.0: StationTarget { player, spacecraft_id,
// eligible_creatures }.
const REAL_STATION: WaitingFor = {
  type: "StationTarget",
  data: { player: 0, spacecraft_id: 4, eligible_creatures: [2, 3] },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (CrewVehicleModal) at v0.71.0: CrewVehicle { player, vehicle_id,
// crew_power, eligible_creatures, contributions? }. Here `contributions`
// differs from the creatures' raw power (e.g. an anthem or Menace-style
// crew bonus applies only while crewing).
const REAL_CREW_WITH_CONTRIBUTIONS: WaitingFor = {
  type: "CrewVehicle",
  data: {
    player: 0,
    vehicle_id: 5,
    crew_power: 3,
    eligible_creatures: [6, 7],
    contributions: [2, 4],
  },
};

const REAL_CREW_WITHOUT_CONTRIBUTIONS: WaitingFor = {
  type: "CrewVehicle",
  data: {
    player: 0,
    vehicle_id: 5,
    crew_power: 2,
    eligible_creatures: [6, 7],
  },
};

// Shape confirmed against phase-rs client/src/adapter/types.ts
// (SaddleMountModal) at v0.71.0: SaddleMount { player, mount_id,
// saddle_power, eligible_creatures, contributions? }.
const REAL_SADDLE: WaitingFor = {
  type: "SaddleMount",
  data: {
    player: 0,
    mount_id: 8,
    saddle_power: 3,
    eligible_creatures: [6, 7],
  },
};

describe("parseEquipCrewPrompt", () => {
  describe("EquipTarget", () => {
    it("parses the equipment, source name and creature targets", () => {
      const p = parseEquipCrewPrompt(REAL_EQUIP, OBJECTS);
      expect(p).not.toBeNull();
      if (p?.kind !== "equip") throw new Error("expected an equip prompt");
      expect(p.player).toBe(0);
      expect(p.sourceId).toBe(1);
      expect(p.sourceName).toBe("Bonesplitter");
      expect(p.creatures).toEqual([
        { id: 2, name: "Grizzly Bears", power: 2, toughness: 2 },
        { id: 3, name: "Runeclaw Bear", power: 2, toughness: 2 },
      ]);
    });

    it("returns null when valid_targets is empty", () => {
      const wf: WaitingFor = {
        type: "EquipTarget",
        data: { player: 0, equipment_id: 1, valid_targets: [] },
      };
      expect(parseEquipCrewPrompt(wf, OBJECTS)).toBeNull();
    });
  });

  describe("StationTarget", () => {
    it("parses the spacecraft, source name and eligible creatures", () => {
      const p = parseEquipCrewPrompt(REAL_STATION, OBJECTS);
      expect(p).not.toBeNull();
      if (p?.kind !== "station") throw new Error("expected a station prompt");
      expect(p.player).toBe(0);
      expect(p.sourceId).toBe(4);
      expect(p.sourceName).toBe("Skysovereign, Consul Flagship");
      expect(p.creatures).toEqual([
        { id: 2, name: "Grizzly Bears", power: 2, toughness: 2 },
        { id: 3, name: "Runeclaw Bear", power: 2, toughness: 2 },
      ]);
    });

    it("returns null when eligible_creatures is empty", () => {
      const wf: WaitingFor = {
        type: "StationTarget",
        data: { player: 0, spacecraft_id: 4, eligible_creatures: [] },
      };
      expect(parseEquipCrewPrompt(wf, OBJECTS)).toBeNull();
    });
  });

  describe("CrewVehicle", () => {
    it("uses contributions (index-aligned) over raw power when present", () => {
      const p = parseEquipCrewPrompt(REAL_CREW_WITH_CONTRIBUTIONS, OBJECTS);
      expect(p).not.toBeNull();
      if (p?.kind !== "crew") throw new Error("expected a crew prompt");
      expect(p.player).toBe(0);
      expect(p.sourceId).toBe(5);
      expect(p.sourceName).toBe("Smuggler's Copter");
      expect(p.threshold).toBe(3);
      expect(p.creatures).toEqual([
        { id: 6, name: "Elite Vanguard", power: 2 },
        { id: 7, name: "Loyal Pegasus", power: 4 },
      ]);
    });

    it("falls back to the object's power when contributions is absent", () => {
      const p = parseEquipCrewPrompt(REAL_CREW_WITHOUT_CONTRIBUTIONS, OBJECTS);
      expect(p).not.toBeNull();
      if (p?.kind !== "crew") throw new Error("expected a crew prompt");
      expect(p.creatures).toEqual([
        { id: 6, name: "Elite Vanguard", power: 1 },
        { id: 7, name: "Loyal Pegasus", power: 1 },
      ]);
    });

    it("returns null when eligible_creatures is empty", () => {
      const wf: WaitingFor = {
        type: "CrewVehicle",
        data: {
          player: 0,
          vehicle_id: 5,
          crew_power: 3,
          eligible_creatures: [],
        },
      };
      expect(parseEquipCrewPrompt(wf, OBJECTS)).toBeNull();
    });
  });

  describe("SaddleMount", () => {
    it("parses the mount, source name, threshold and creature power", () => {
      const p = parseEquipCrewPrompt(REAL_SADDLE, OBJECTS);
      expect(p).not.toBeNull();
      if (p?.kind !== "saddle") throw new Error("expected a saddle prompt");
      expect(p.player).toBe(0);
      expect(p.sourceId).toBe(8);
      expect(p.sourceName).toBe("Winged Temple of Orazca");
      expect(p.threshold).toBe(3);
      expect(p.creatures).toEqual([
        { id: 6, name: "Elite Vanguard", power: 1 },
        { id: 7, name: "Loyal Pegasus", power: 1 },
      ]);
    });

    it("returns null when eligible_creatures is empty", () => {
      const wf: WaitingFor = {
        type: "SaddleMount",
        data: {
          player: 0,
          mount_id: 8,
          saddle_power: 3,
          eligible_creatures: [],
        },
      };
      expect(parseEquipCrewPrompt(wf, OBJECTS)).toBeNull();
    });
  });

  it("returns null for a non-matching waiting_for", () => {
    expect(parseEquipCrewPrompt(undefined)).toBeNull();
    expect(parseEquipCrewPrompt({ type: "Priority", data: {} })).toBeNull();
  });
});

describe("equipAction", () => {
  it("builds the Equip action", () => {
    expect(equipAction(1, 2)).toEqual({
      type: "Equip",
      data: { equipment_id: 1, target_id: 2 },
    });
  });
});

describe("activateStationAction", () => {
  it("builds the ActivateStation action", () => {
    expect(activateStationAction(4, 2)).toEqual({
      type: "ActivateStation",
      data: { spacecraft_id: 4, creature_id: 2 },
    });
  });
});

describe("crewVehicleAction", () => {
  it("builds the CrewVehicle action", () => {
    expect(crewVehicleAction(5, [6, 7])).toEqual({
      type: "CrewVehicle",
      data: { vehicle_id: 5, creature_ids: [6, 7] },
    });
  });
});

describe("saddleMountAction", () => {
  it("builds the SaddleMount action", () => {
    expect(saddleMountAction(8, [6, 7])).toEqual({
      type: "SaddleMount",
      data: { mount_id: 8, creature_ids: [6, 7] },
    });
  });
});
