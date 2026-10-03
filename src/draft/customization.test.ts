import { describe, it, expect } from "vitest";
import { DEFAULT_CUSTOMIZATION, isSuggestable } from "./customization";

const creature = (oracleText: string) => ({
  typeLine: "Creature — Dwarf",
  oracleText,
});

describe("isSuggestable", () => {
  it("leaves out planeswalkers and dungeon cards by default", () => {
    expect(
      isSuggestable(
        { typeLine: "Legendary Planeswalker — Jace", oracleText: "" },
        DEFAULT_CUSTOMIZATION,
      ),
    ).toBe(false);
    expect(
      isSuggestable(
        creature("When this enters, venture into the dungeon."),
        DEFAULT_CUSTOMIZATION,
      ),
    ).toBe(false);
    expect(
      isSuggestable(
        creature("When this enters, you take the initiative."),
        DEFAULT_CUSTOMIZATION,
      ),
    ).toBe(false);
    expect(
      isSuggestable(
        creature("As long as you've completed a dungeon, this gets +2/+2."),
        DEFAULT_CUSTOMIZATION,
      ),
    ).toBe(false);
  });

  it("keeps cards that are neither", () => {
    expect(isSuggestable(creature("Flying"), DEFAULT_CUSTOMIZATION)).toBe(true);
  });

  it("offers each kind once it is turned on", () => {
    const walker = {
      typeLine: "Legendary Planeswalker — Jace",
      oracleText: "",
    };
    const dungeon = creature("Venture into the dungeon.");

    expect(
      isSuggestable(walker, { planeswalkers: true, dungeons: false, ramp: true }),
    ).toBe(true);
    expect(
      isSuggestable(dungeon, { planeswalkers: true, dungeons: false, ramp: true }),
    ).toBe(false);
    expect(
      isSuggestable(dungeon, { planeswalkers: false, dungeons: true, ramp: true }),
    ).toBe(true);
  });

  it("offers lasting ramp by default and leaves it out once turned off", () => {
    const dork = creature("{T}: Add {G}.");
    const treasure = creature("When this creature enters, create a Treasure token.");
    const noRamp = { ...DEFAULT_CUSTOMIZATION, ramp: false };

    expect(isSuggestable(dork, DEFAULT_CUSTOMIZATION)).toBe(true);
    expect(isSuggestable(dork, noRamp)).toBe(false);
    expect(isSuggestable(treasure, noRamp)).toBe(true);
  });
});
