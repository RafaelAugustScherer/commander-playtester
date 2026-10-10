import { describe, it, expect } from "vitest";
import { drawsCards, drawsSeveral } from "./draw";

describe("draw wordings", () => {
  it.each([
    "Draw a card.",
    "Target player draws X cards.",
    "you may draw two additional cards",
    "Draw cards equal to the greatest power among creatures you control.",
  ])("reads %j as drawing", (text) => {
    expect(drawsCards(text)).toBe(true);
  });

  it("does not read a draw step or withdrawing as drawing", () => {
    expect(drawsCards("Skip your draw step.")).toBe(false);
    expect(drawsCards("withdraw a card")).toBe(false);
  });

  it("tells drawing two or more from drawing one", () => {
    expect(drawsSeveral("Draw three cards.")).toBe(true);
    expect(drawsSeveral("Draw a card.")).toBe(false);
  });
});
