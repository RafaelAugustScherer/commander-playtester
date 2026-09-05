import { describe, expect, it } from "vitest";
import type { DraftCandidateData } from "../engine/draftQueries";
import type { Card } from "../lib/types";
import { rankLocalCandidates } from "./localCandidates";
import { extractThemeProfile } from "./themes";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Artifact",
    oracleText: "",
    colors: ["U"],
    colorIdentity: ["U"],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

function candidate(source: Card): DraftCandidateData {
  return {
    name: source.name,
    manaValue: source.manaValue,
    typeLine: source.typeLine,
    oracleText: source.oracleText,
    colorIdentity: source.colorIdentity,
  };
}

describe("rankLocalCandidates", () => {
  const commander = card({
    name: "Artifact Commander",
    typeLine: "Legendary Artifact Creature — Vedalken",
    oracleText: "Whenever an artifact enters, draw a card.",
    colorIdentity: ["G", "U"],
  });
  const profile = extractThemeProfile([commander], []);

  it("filters excluded and off-color cards before ranking", () => {
    const included = card({
      name: "Included Artifact",
      oracleText: "Whenever another artifact enters, draw a card.",
      colorIdentity: ["U"],
    });
    const colorless = card({ name: "Colorless Artifact", colorIdentity: [] });
    const offColor = card({
      name: "Off-color Artifact",
      oracleText: included.oracleText,
      colorIdentity: ["U", "R"],
    });
    const excluded = card({ name: "Already Selected", colorIdentity: ["U"] });

    const ranked = rankLocalCandidates(
      [included, colorless, offColor, excluded].map(candidate),
      profile,
      new Set([excluded.name.toLowerCase()]),
    );

    expect(ranked.map(({ card }) => card.name)).toEqual([
      included.name,
      colorless.name,
    ]);
  });

  it("ranks shared themes above otherwise similar cards", () => {
    const matching = card({
      name: "Matching Artifact",
      oracleText: "Whenever another artifact enters, draw a card.",
      colorIdentity: ["U"],
    });
    const unrelated = card({
      name: "Unrelated Creature",
      typeLine: "Creature — Beast",
      colorIdentity: ["U"],
    });

    const ranked = rankLocalCandidates(
      [unrelated, matching].map(candidate),
      profile,
      new Set(),
    );

    expect(ranked[0].card.name).toBe(matching.name);
    expect(ranked[0].score.matchedTokens).toEqual(
      expect.arrayContaining(["artifact", "draw a card"]),
    );
  });
});
