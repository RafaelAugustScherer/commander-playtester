import { describe, it, expect } from "vitest";
import { parseCreatureTypePrompt, chooseOptionAction } from "./creatureType";
import type { WaitingFor } from "../../engine/types";

// Real NamedChoice (CreatureType) captured from the phase-rs WASM build (trimmed).
const REAL_CREATURE_TYPE: WaitingFor = {
  type: "NamedChoice",
  data: {
    choice_type: "CreatureType",
    options: ["Advisor", "Aetherborn", "Elf", "Goblin", "Zombie"],
    player: 1,
    source: {
      prompt: { display_name: "Secluded Courtyard" },
    },
  },
};

// Real NamedChoice used for a color choice — same waiting_for, different choice_type.
const REAL_COLOR: WaitingFor = {
  type: "NamedChoice",
  data: {
    choice_type: { Color: { excluded: ["Red"] } },
    options: ["White", "Blue", "Black", "Green"],
    player: 1,
    source: { prompt: { display_name: "Thriving Bluff" } },
  },
};

describe("parseCreatureTypePrompt", () => {
  it("parses a creature-type NamedChoice into its options and source", () => {
    const p = parseCreatureTypePrompt(REAL_CREATURE_TYPE)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(1);
    expect(p.sourceName).toBe("Secluded Courtyard");
    expect(p.options).toContain("Elf");
    expect(p.options.length).toBe(5);
  });

  it("also matches a constrained (object) CreatureType choice_type", () => {
    const wf: WaitingFor = {
      type: "NamedChoice",
      data: {
        choice_type: { CreatureType: { excluded: ["Wall"] } },
        options: ["Elf", "Goblin"],
        player: 0,
      },
    };
    expect(parseCreatureTypePrompt(wf)?.options).toEqual(["Elf", "Goblin"]);
  });

  it("ignores color and other NamedChoice kinds", () => {
    expect(parseCreatureTypePrompt(REAL_COLOR)).toBeNull();
  });

  it("returns null for unrelated or empty waiting_for", () => {
    expect(parseCreatureTypePrompt(undefined)).toBeNull();
    expect(parseCreatureTypePrompt({ type: "Priority", data: {} })).toBeNull();
    expect(
      parseCreatureTypePrompt({
        type: "NamedChoice",
        data: { choice_type: "CreatureType", options: [], player: 0 },
      }),
    ).toBeNull();
  });
});

describe("chooseOptionAction", () => {
  it("builds the ChooseOption action the engine expects", () => {
    expect(chooseOptionAction("Elf")).toEqual({
      type: "ChooseOption",
      data: { choice: "Elf" },
    });
  });
});
