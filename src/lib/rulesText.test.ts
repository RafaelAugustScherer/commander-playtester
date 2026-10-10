import { describe, it, expect } from "vitest";
import { activationCost, ownNames, ruleClauses, withOwnName } from "./rulesText";

describe("ownNames", () => {
  it("gives a legend its short name, before the comma or else its first word", () => {
    const kroxa = { name: "Kroxa, Titan of Death's Hunger", typeLine: "Legendary Creature — Elder Giant" };
    expect(ownNames(kroxa, true)).toEqual(["Kroxa, Titan of Death's Hunger", "Kroxa"]);
    expect(ownNames({ name: "Edgar Markov", typeLine: "Legendary Creature — Vampire Knight" }, true)).toEqual([
      "Edgar Markov",
      "Edgar",
    ]);
    expect(ownNames({ name: "The Ur-Dragon", typeLine: "Legendary Creature — Dragon Avatar" }, true)).toEqual([
      "The Ur-Dragon",
    ]);
  });

  it("gives other cards, and readers without short names, only full names", () => {
    expect(ownNames({ name: "Sliver Overlord", typeLine: "Legendary Creature — Sliver Mutant" })).toEqual([
      "Sliver Overlord",
    ]);
    expect(ownNames({ name: "Mind Stone", typeLine: "Artifact" }, true)).toEqual(["Mind Stone"]);
  });

  it("reads every face of a split or double-faced card", () => {
    expect(ownNames({ name: "Fire // Ice" })).toEqual(["Fire", "Ice"]);
  });
});

describe("withOwnName", () => {
  it("reads the card's names as ~", () => {
    const edgar = { name: "Edgar Markov", typeLine: "Legendary Creature — Vampire Knight" };
    expect(withOwnName("Whenever Edgar attacks, …", edgar, true)).toBe("Whenever ~ attacks, …");
    expect(withOwnName("Whenever Edgar attacks, …", edgar)).toBe("Whenever Edgar attacks, …");
  });
});

describe("activationCost", () => {
  it("reads the cost of an activated ability, after an ability word", () => {
    expect(activationCost("{2}, {T}: Draw a card.")).toBe("{2}, {T}");
    expect(activationCost("Channel — {1}{U}, Discard this card: Draw two cards.")).toBe(
      " {1}{U}, Discard this card",
    );
    expect(activationCost("When this creature enters, draw a card.")).toBeNull();
  });
});

describe("ruleClauses", () => {
  it("marks triggers and activated abilities on a permanent as repeating, with their cost", () => {
    const clauses = ruleClauses({
      typeLine: "Artifact",
      oracleText: "When this enters, draw a card.\n{1}, {T}: Scry 1. (Look at the top card.)",
    });
    expect(clauses.map(({ repeats, cost }) => ({ repeats, cost }))).toEqual([
      { repeats: false, cost: null },
      { repeats: true, cost: "{1}, {T}" },
    ]);
  });

  it("never repeats on an instant or sorcery", () => {
    const [clause] = ruleClauses({ typeLine: "Sorcery", oracleText: "Whenever you draw, … " });
    expect(clause.repeats).toBe(false);
  });
});
