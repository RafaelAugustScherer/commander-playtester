import { describe, it, expect } from "vitest";
import { parseModesPrompt, selectModesAction } from "./modes";
import type { GameObject, WaitingFor } from "../../engine/types";

// Real ModeChoice (a modal spell, e.g. a charm) captured from the phase-rs
// WASM build (trimmed to the fields the parser reads).
const REAL_MODE_CHOICE: WaitingFor = {
  type: "ModeChoice",
  data: {
    modal: {
      allow_repeat_modes: false,
      chooser: { type: "Controller" },
      max_choices: 1,
      min_choices: 1,
      mode_count: 2,
      mode_descriptions: [
        "~ deals 3 damage to target creature or planeswalker.",
        "Destroy target artifact or enchantment.",
      ],
    },
    pending_cast: { object_id: 161, card_id: 161 },
    player: 1,
  },
};

// Real AbilityModeChoice (a modal activated ability) captured the same way.
const REAL_ABILITY_MODE_CHOICE: WaitingFor = {
  type: "AbilityModeChoice",
  data: {
    is_activated: false,
    modal: {
      allow_repeat_modes: false,
      chooser: { type: "Controller" },
      max_choices: 1,
      min_choices: 1,
      mode_count: 2,
      mode_descriptions: ["Put a +1/+1 counter on ~.", "~ phases out."],
    },
    mode_abilities: [],
    player: 1,
    source_id: 137,
  },
};

const OBJECTS: Record<string, GameObject> = {
  161: { id: 161, name: "Prismari Command", zone: "Stack" },
  137: { id: 137, name: "Some Permanent", zone: "Battlefield" },
};

describe("parseModesPrompt", () => {
  it("parses a spell ModeChoice, substituting ~ with the source name", () => {
    const p = parseModesPrompt(REAL_MODE_CHOICE, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.player).toBe(1);
    expect(p.sourceName).toBe("Prismari Command");
    expect(p.minChoices).toBe(1);
    expect(p.maxChoices).toBe(1);
    expect(p.allowRepeatModes).toBe(false);
    expect(p.modes).toEqual([
      "Prismari Command deals 3 damage to target creature or planeswalker.",
      "Destroy target artifact or enchantment.",
    ]);
  });

  it("parses an ability AbilityModeChoice off source_id", () => {
    const p = parseModesPrompt(REAL_ABILITY_MODE_CHOICE, OBJECTS)!;
    expect(p).not.toBeNull();
    expect(p.sourceName).toBe("Some Permanent");
    expect(p.modes).toEqual([
      "Put a +1/+1 counter on Some Permanent.",
      "Some Permanent phases out.",
    ]);
  });

  it("leaves ~ untouched when the source name is unknown", () => {
    const p = parseModesPrompt(REAL_MODE_CHOICE, {})!;
    expect(p.sourceName).toBe("");
    expect(p.modes[0]).toBe("~ deals 3 damage to target creature or planeswalker.");
  });

  it("returns null for unrelated or empty waiting_for", () => {
    expect(parseModesPrompt(undefined)).toBeNull();
    expect(parseModesPrompt({ type: "Priority", data: {} })).toBeNull();
    expect(
      parseModesPrompt({
        type: "ModeChoice",
        data: { modal: { mode_descriptions: [] }, player: 0 },
      }),
    ).toBeNull();
  });
});

describe("selectModesAction", () => {
  it("builds the SelectModes action the engine expects", () => {
    expect(selectModesAction([0])).toEqual({
      type: "SelectModes",
      data: { indices: [0] },
    });
    expect(selectModesAction([0, 2])).toEqual({
      type: "SelectModes",
      data: { indices: [0, 2] },
    });
  });
});
