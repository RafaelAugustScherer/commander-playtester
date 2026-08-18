import { describe, it, expect } from "vitest";
import { parseDecklist } from "./decklist";

describe("parseDecklist", () => {
  it("parses quantities in both '1' and '1x' forms", () => {
    const { mainboard } = parseDecklist("1 Sol Ring\n2x Forest");
    expect(mainboard).toEqual([
      { quantity: 1, name: "Sol Ring" },
      { quantity: 2, name: "Forest" },
    ]);
  });

  it("defaults quantity to 1 when absent", () => {
    const { mainboard } = parseDecklist("Sol Ring");
    expect(mainboard).toEqual([{ quantity: 1, name: "Sol Ring" }]);
  });

  it("routes commander-section cards to commanders", () => {
    const parsed = parseDecklist(
      "Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring",
    );
    expect(parsed.commanders).toEqual([
      { quantity: 1, name: "Atraxa, Praetors' Voice" },
    ]);
    expect(parsed.mainboard).toEqual([{ quantity: 1, name: "Sol Ring" }]);
  });

  it("ignores sideboard/maybeboard sections", () => {
    const parsed = parseDecklist(
      "Deck\n1 Sol Ring\n\nMaybeboard\n1 Mana Crypt",
    );
    expect(parsed.mainboard).toEqual([{ quantity: 1, name: "Sol Ring" }]);
  });

  it("skips comments and blank lines", () => {
    const parsed = parseDecklist("// my deck\n\n1 Sol Ring\n# note");
    expect(parsed.mainboard).toEqual([{ quantity: 1, name: "Sol Ring" }]);
    expect(parsed.warnings).toEqual([]);
  });

  it("normalizes a pasted Moxfield export, two-sided cards included", () => {
    const paste = [
      "Commander",
      "1 Yuriko, the Tiger's Shadow (C18) 47",
      "",
      "Deck",
      "1 Sol Ring (C21) 263 *F*",
      "1 Never // Return (2X2) 456",
      "1 Discovery // Dispersal (GRN) 223",
    ].join("\n");
    const parsed = parseDecklist(paste);
    expect(parsed.commanders).toEqual([
      { quantity: 1, name: "Yuriko, the Tiger's Shadow" },
    ]);
    expect(parsed.mainboard.map((e) => e.name)).toEqual([
      "Sol Ring",
      "Never",
      "Discovery",
    ]);
    expect(parsed.warnings).toEqual([]);
  });
});
