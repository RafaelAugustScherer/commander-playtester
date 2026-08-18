import { describe, it, expect } from "vitest";
import { normalizeCardName } from "./cardName";

describe("normalizeCardName", () => {
  it("leaves a plain name untouched", () => {
    expect(normalizeCardName("Atraxa, Praetors' Voice")).toBe(
      "Atraxa, Praetors' Voice",
    );
  });

  it("strips Moxfield set + collector and foil suffixes", () => {
    expect(normalizeCardName("Sol Ring (C21) 263")).toBe("Sol Ring");
    expect(normalizeCardName("Sol Ring (C21) 263 *F*")).toBe("Sol Ring");
  });

  it("strips a trailing category tag in brackets", () => {
    expect(normalizeCardName("Sol Ring [Ramp]")).toBe("Sol Ring");
  });

  it("collapses two-sided 'Front // Back' names to the front face", () => {
    // Split, MDFC, transform, and adventure cards all export this way; Scryfall
    // and the engine only key the front face.
    expect(normalizeCardName("Never // Return")).toBe("Never");
    expect(normalizeCardName("Malakir Rebirth // Malakir Mire")).toBe(
      "Malakir Rebirth",
    );
    expect(normalizeCardName("Valki, God of Lies // Tibalt, Cosmic Impostor")).toBe(
      "Valki, God of Lies",
    );
    // Still collapses when Moxfield appends set + collector metadata.
    expect(normalizeCardName("Connive // Concoct (GRN) 222")).toBe("Connive");
  });

  it("keeps a slash that is part of the real name (not a face separator)", () => {
    // The face separator is always " // " with surrounding spaces.
    expect(normalizeCardName("SP//dr, Piloted by Peni")).toBe(
      "SP//dr, Piloted by Peni",
    );
    expect(normalizeCardName("Summon: Choco/Mog")).toBe("Summon: Choco/Mog");
  });
});
