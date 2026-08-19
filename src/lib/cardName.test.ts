import { describe, it, expect } from "vitest";
import { normalizeCardName, frontFace } from "./cardName";

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

  it("keeps a two-sided name whole, with the canonical ' // ' separator", () => {
    // Split, MDFC, transform, and adventure cards are stored in full; the
    // engine and Scryfall boundaries collapse to the front face themselves.
    expect(normalizeCardName("Never // Return")).toBe("Never // Return");
    expect(normalizeCardName("Malakir Rebirth // Malakir Mire")).toBe(
      "Malakir Rebirth // Malakir Mire",
    );
    // Still normalizes when Moxfield appends set + collector metadata.
    expect(normalizeCardName("Connive // Concoct (GRN) 222")).toBe(
      "Connive // Concoct",
    );
  });

  it("rewrites Moxfield's bare-slash split shorthand to ' // '", () => {
    // Moxfield exports some split cards as a bare slash between space-free faces.
    expect(normalizeCardName("Commit/Memory")).toBe("Commit // Memory");
    expect(normalizeCardName("Rags/Riches")).toBe("Rags // Riches");
    expect(normalizeCardName("Discovery/Dispersal (GRN) 223")).toBe(
      "Discovery // Dispersal",
    );
  });

  it("keeps a slash that is part of the real name (not a face separator)", () => {
    // Real names with a slash are never a bare token/token pair.
    expect(normalizeCardName("SP//dr, Piloted by Peni")).toBe(
      "SP//dr, Piloted by Peni",
    );
    expect(normalizeCardName("Summon: Choco/Mog")).toBe("Summon: Choco/Mog");
  });
});

describe("frontFace", () => {
  it("returns the front face of a two-sided name", () => {
    expect(frontFace("Commit // Memory")).toBe("Commit");
    expect(frontFace("Valki, God of Lies // Tibalt, Cosmic Impostor")).toBe(
      "Valki, God of Lies",
    );
  });

  it("leaves a plain name and a real slashed name untouched", () => {
    expect(frontFace("Sol Ring")).toBe("Sol Ring");
    expect(frontFace("Summon: Choco/Mog")).toBe("Summon: Choco/Mog");
    expect(frontFace("SP//dr, Piloted by Peni")).toBe("SP//dr, Piloted by Peni");
  });
});
