import { describe, it, expect } from "vitest";
import { isCommanderLegal, isLegendaryCreature, isCommanderEligible } from "./cardLegality";
import type { SearchCardRow, CardFaceData } from "../engine/draftQueries";

function row(commander: string | undefined): SearchCardRow {
  return {
    name: "X",
    oracle_id: "x",
    mana_value: 0,
    color_identity: [],
    legalities: commander === undefined ? {} : { commander },
  };
}

function face(supertypes: string[], coreTypes: string[]): CardFaceData {
  return { name: "X", card_type: { supertypes, core_types: coreTypes } };
}

describe("isCommanderLegal", () => {
  it("is true only for an explicit legal", () => {
    expect(isCommanderLegal(row("legal"))).toBe(true);
    expect(isCommanderLegal(row("banned"))).toBe(false);
    expect(isCommanderLegal(row(undefined))).toBe(false);
    expect(isCommanderLegal(undefined)).toBe(false);
  });
});

describe("isLegendaryCreature", () => {
  it("needs both Legendary and Creature", () => {
    expect(isLegendaryCreature(face(["Legendary"], ["Creature"]))).toBe(true);
    expect(isLegendaryCreature(face([], ["Creature"]))).toBe(false);
    expect(isLegendaryCreature(face(["Legendary"], ["Artifact"]))).toBe(false);
    expect(isLegendaryCreature(null)).toBe(false);
  });
});

describe("isCommanderEligible", () => {
  it("accepts an engine-eligible card even without a legendary-creature face", () => {
    expect(isCommanderEligible(true, null)).toBe(true);
  });

  it("accepts a legendary creature the engine util misses", () => {
    // Ancient Copper Dragon: a real legendary creature the engine returns false for.
    expect(isCommanderEligible(false, face(["Legendary"], ["Creature"]))).toBe(true);
  });

  it("rejects a non-legendary creature", () => {
    expect(isCommanderEligible(false, face([], ["Creature"]))).toBe(false);
  });
});
