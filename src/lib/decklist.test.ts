import { describe, it, expect } from "vitest";
import { parseDecklist, cleanCardName } from "./decklist";

describe("cleanCardName", () => {
  it("strips Moxfield set + collector suffixes", () => {
    expect(cleanCardName("Sol Ring (C21) 263")).toBe("Sol Ring");
    expect(cleanCardName("Sol Ring (C21) 263 *F*")).toBe("Sol Ring");
  });

  it("strips Archidekt category brackets", () => {
    expect(cleanCardName("Sol Ring [Ramp]")).toBe("Sol Ring");
  });

  it("leaves a plain name untouched", () => {
    expect(cleanCardName("Atraxa, Praetors' Voice")).toBe(
      "Atraxa, Praetors' Voice",
    );
  });

  it("collapses two-sided 'Front // Back' names to the front face", () => {
    // Split, MDFC, transform, and adventure cards all export this way.
    expect(cleanCardName("Never // Return")).toBe("Never");
    expect(cleanCardName("Malakir Rebirth // Malakir Mire")).toBe(
      "Malakir Rebirth",
    );
    expect(cleanCardName("Valki, God of Lies // Tibalt, Cosmic Impostor")).toBe(
      "Valki, God of Lies",
    );
    // Still collapses when Moxfield appends set + collector metadata.
    expect(cleanCardName("Connive // Concoct (GRN) 222")).toBe("Connive");
  });

  it("keeps a slash that is part of the real name (not a face separator)", () => {
    // The face separator is always " // " with surrounding spaces.
    expect(cleanCardName("SP//dr, Piloted by Peni")).toBe(
      "SP//dr, Piloted by Peni",
    );
    expect(cleanCardName("Summon: Choco/Mog")).toBe("Summon: Choco/Mog");
  });
});

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
});
