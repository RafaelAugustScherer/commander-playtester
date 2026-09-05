// Equipping, stationing, crewing and saddling — attaching Equipment/Fortifications,
// staffing a Spacecraft ability, or crewing a Vehicle/saddling a Mount. The engine
// surfaces four waiting_for shapes:
// - `EquipTarget` { player, equipment_id, valid_targets } — pick one creature
//   from `valid_targets` to equip. Answered with `Equip { equipment_id, target_id }`.
// - `StationTarget` { player, spacecraft_id, eligible_creatures } — pick one
//   creature to station. Answered with `ActivateStation { spacecraft_id, creature_id }`.
// - `CrewVehicle` { player, vehicle_id, crew_power, eligible_creatures,
//   contributions? } — pick any number of `eligible_creatures` whose summed
//   power meets `crew_power`. A creature's contribution is `contributions[i]`
//   (index-aligned to `eligible_creatures`) when present, else its own power.
//   Answered with `CrewVehicle { vehicle_id, creature_ids }`.
// - `SaddleMount` { player, mount_id, saddle_power, eligible_creatures,
//   contributions? } — same shape as crewing, for a Mount. Answered with
//   `SaddleMount { mount_id, creature_ids }`.
// Shapes confirmed against phase-rs client/src/adapter/types.ts at v0.71.0.

import type { GameObject, WaitingFor } from "../../engine/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A creature offered as an equip/station target, with display-only P/T. */
export interface EquipCrewCreature {
  id: number;
  name: string;
  power?: number | null;
  toughness?: number | null;
}

/** A creature offered to crew/saddle, with its power contribution toward the threshold. */
export interface CrewSaddleCreature {
  id: number;
  name: string;
  power: number;
}

export interface EquipPrompt {
  kind: "equip";
  player: number;
  sourceId: number;
  sourceName: string;
  creatures: EquipCrewCreature[];
}

export interface StationPrompt {
  kind: "station";
  player: number;
  sourceId: number;
  sourceName: string;
  creatures: EquipCrewCreature[];
}

export interface CrewPrompt {
  kind: "crew";
  player: number;
  sourceId: number;
  sourceName: string;
  threshold: number;
  creatures: CrewSaddleCreature[];
}

export interface SaddlePrompt {
  kind: "saddle";
  player: number;
  sourceId: number;
  sourceName: string;
  threshold: number;
  creatures: CrewSaddleCreature[];
}

export type EquipCrewPrompt =
  EquipPrompt | StationPrompt | CrewPrompt | SaddlePrompt;

function nameOf(id: number, objects?: Record<string, GameObject>): string {
  return objects?.[id]?.name ?? "";
}

function toEquipCrewCreature(
  id: number,
  objects?: Record<string, GameObject>,
): EquipCrewCreature {
  const obj = objects?.[id];
  return {
    id,
    name: obj?.name ?? "",
    power: obj?.power,
    toughness: obj?.toughness,
  };
}

function contributionOf(
  id: number,
  index: number,
  contributions: unknown,
  objects?: Record<string, GameObject>,
): number {
  if (
    Array.isArray(contributions) &&
    typeof contributions[index] === "number"
  ) {
    return contributions[index];
  }
  return objects?.[id]?.power ?? 0;
}

function parseEquipTarget(
  d: any,
  objects?: Record<string, GameObject>,
): EquipPrompt | null {
  const validTargets = Array.isArray(d.valid_targets) ? d.valid_targets : [];
  if (validTargets.length === 0) return null;
  const equipmentId = typeof d.equipment_id === "number" ? d.equipment_id : 0;
  return {
    kind: "equip",
    player: typeof d.player === "number" ? d.player : 0,
    sourceId: equipmentId,
    sourceName: nameOf(equipmentId, objects),
    creatures: validTargets.map((id: number) =>
      toEquipCrewCreature(id, objects),
    ),
  };
}

function parseStationTarget(
  d: any,
  objects?: Record<string, GameObject>,
): StationPrompt | null {
  const eligible = Array.isArray(d.eligible_creatures)
    ? d.eligible_creatures
    : [];
  if (eligible.length === 0) return null;
  const spacecraftId =
    typeof d.spacecraft_id === "number" ? d.spacecraft_id : 0;
  return {
    kind: "station",
    player: typeof d.player === "number" ? d.player : 0,
    sourceId: spacecraftId,
    sourceName: nameOf(spacecraftId, objects),
    creatures: eligible.map((id: number) => toEquipCrewCreature(id, objects)),
  };
}

function parseCrewVehicle(
  d: any,
  objects?: Record<string, GameObject>,
): CrewPrompt | null {
  const eligible = Array.isArray(d.eligible_creatures)
    ? d.eligible_creatures
    : [];
  if (eligible.length === 0) return null;
  const vehicleId = typeof d.vehicle_id === "number" ? d.vehicle_id : 0;
  return {
    kind: "crew",
    player: typeof d.player === "number" ? d.player : 0,
    sourceId: vehicleId,
    sourceName: nameOf(vehicleId, objects),
    threshold: typeof d.crew_power === "number" ? d.crew_power : 0,
    creatures: eligible.map((id: number, i: number) => ({
      id,
      name: nameOf(id, objects),
      power: contributionOf(id, i, d.contributions, objects),
    })),
  };
}

function parseSaddleMount(
  d: any,
  objects?: Record<string, GameObject>,
): SaddlePrompt | null {
  const eligible = Array.isArray(d.eligible_creatures)
    ? d.eligible_creatures
    : [];
  if (eligible.length === 0) return null;
  const mountId = typeof d.mount_id === "number" ? d.mount_id : 0;
  return {
    kind: "saddle",
    player: typeof d.player === "number" ? d.player : 0,
    sourceId: mountId,
    sourceName: nameOf(mountId, objects),
    threshold: typeof d.saddle_power === "number" ? d.saddle_power : 0,
    creatures: eligible.map((id: number, i: number) => ({
      id,
      name: nameOf(id, objects),
      power: contributionOf(id, i, d.contributions, objects),
    })),
  };
}

/** Read an equip/station/crew/saddle decision aimed at the human, or null. */
export function parseEquipCrewPrompt(
  wf: WaitingFor | undefined,
  objects?: Record<string, GameObject>,
): EquipCrewPrompt | null {
  if (!wf) return null;
  const d: any = wf.data ?? {};
  switch (wf.type) {
    case "EquipTarget":
      return parseEquipTarget(d, objects);
    case "StationTarget":
      return parseStationTarget(d, objects);
    case "CrewVehicle":
      return parseCrewVehicle(d, objects);
    case "SaddleMount":
      return parseSaddleMount(d, objects);
    default:
      return null;
  }
}

/** Submit the creature to equip a piece of Equipment onto. */
export function equipAction(
  equipmentId: number,
  targetId: number,
): { type: string; data: { equipment_id: number; target_id: number } } {
  return {
    type: "Equip",
    data: { equipment_id: equipmentId, target_id: targetId },
  };
}

/** Submit the creature to station at a Spacecraft ability. */
export function activateStationAction(
  spacecraftId: number,
  creatureId: number,
): { type: string; data: { spacecraft_id: number; creature_id: number } } {
  return {
    type: "ActivateStation",
    data: { spacecraft_id: spacecraftId, creature_id: creatureId },
  };
}

/** Submit the creatures crewing a Vehicle. */
export function crewVehicleAction(
  vehicleId: number,
  creatureIds: number[],
): { type: string; data: { vehicle_id: number; creature_ids: number[] } } {
  return {
    type: "CrewVehicle",
    data: { vehicle_id: vehicleId, creature_ids: creatureIds },
  };
}

/** Submit the creatures saddling a Mount. */
export function saddleMountAction(
  mountId: number,
  creatureIds: number[],
): { type: string; data: { mount_id: number; creature_ids: number[] } } {
  return {
    type: "SaddleMount",
    data: { mount_id: mountId, creature_ids: creatureIds },
  };
}
