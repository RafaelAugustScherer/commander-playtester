import { describe, it, expect } from "vitest";
import {
  BUCKET_CATCH_UP,
  BUCKET_CATCH_UP_CAP,
  CARD_ADVANTAGE_TARGET,
  CARD_ADVANTAGE_WEIGHT,
  NONLAND_TARGET,
  PROTECTION_WEIGHT,
  bucketPace,
  bucketRoom,
  cardAdvantageFit,
  protectionFit,
} from "./fundamentals";
import { extractThemeProfile, type ThemeProfile } from "./themes";
import type { Card } from "../lib/types";

function card(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    manaValue: 2,
    typeLine: "Instant",
    oracleText: "",
    colors: [],
    colorIdentity: [],
    producedMana: [],
    roles: ["other"],
    ...overrides,
  };
}

const greaves = card({
  name: "Greaves",
  typeLine: "Artifact — Equipment",
  oracleText: "Equipped creature has shroud and haste.\nEquip {0}",
});
const study = card({
  name: "Study",
  typeLine: "Enchantment",
  oracleText: "Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",
});
const harmonize = card({ name: "Harmonize", typeLine: "Sorcery", oracleText: "Draw three cards." });

function profile(overrides: Partial<ThemeProfile>): ThemeProfile {
  return { ...extractThemeProfile([], []), ...overrides };
}

describe("bucketPace", () => {
  it("reaches the whole target by the 63rd nonland card, and stays there", () => {
    expect(bucketPace(7, 0)).toBe(0);
    expect(bucketPace(7, NONLAND_TARGET)).toBe(7);
    expect(bucketPace(7, 90)).toBe(7);
  });
});

describe("bucketRoom", () => {
  it("is full at pace, then halves for each card ahead, never reaching zero", () => {
    expect(bucketRoom(3, 3)).toBe(1);
    expect(bucketRoom(4, 3)).toBe(0.5);
    expect(bucketRoom(5, 3)).toBe(0.25);
    expect(bucketRoom(30, 3)).toBeGreaterThan(0);
  });

  it("grows for each card the deck is behind, up to its cap", () => {
    expect(bucketRoom(2, 3)).toBe(1 + BUCKET_CATCH_UP);
    expect(bucketRoom(0, 3)).toBeGreaterThan(bucketRoom(2, 3));
    expect(bucketRoom(0, 30)).toBe(BUCKET_CATCH_UP_CAP);
  });
});

describe("protectionFit", () => {
  it("rewards protection while the deck is short of its target, more the further behind", () => {
    const atPace = protectionFit(greaves, profile({ protectionTarget: 8, nonlandCount: 0, protectionCount: 0 }));
    const behind = protectionFit(greaves, profile({ protectionTarget: 8, nonlandCount: 63, protectionCount: 2 }));
    expect(atPace).toBe(PROTECTION_WEIGHT);
    expect(behind).toBe(PROTECTION_WEIGHT * BUCKET_CATCH_UP_CAP);
  });

  it("fades as the deck gets ahead of its protection pace", () => {
    const behind = protectionFit(greaves, profile({ protectionTarget: 2, nonlandCount: 63, protectionCount: 1 }));
    const ahead = protectionFit(greaves, profile({ protectionTarget: 2, nonlandCount: 63, protectionCount: 4 }));
    expect(ahead).toBeLessThan(behind);
    expect(ahead).toBeGreaterThan(0);
  });

  it("gives nothing before there is a commander, or to a card that protects nothing", () => {
    expect(protectionFit(greaves, profile({ protectionTarget: 0 }))).toBe(0);
    expect(protectionFit(harmonize, profile({ protectionTarget: 8 }))).toBe(0);
  });
});

describe("cardAdvantageFit", () => {
  it("gives an engine the full bonus and a one-shot half of it", () => {
    const empty = profile({ nonlandCount: 0, cardAdvantageCount: 0 });
    expect(cardAdvantageFit(study, empty)).toBe(CARD_ADVANTAGE_WEIGHT);
    expect(cardAdvantageFit(harmonize, empty)).toBe(CARD_ADVANTAGE_WEIGHT / 2);
  });

  it("fades once the deck holds its card advantage target", () => {
    const full = profile({ nonlandCount: 63, cardAdvantageCount: CARD_ADVANTAGE_TARGET + 2 });
    expect(cardAdvantageFit(study, full)).toBe(CARD_ADVANTAGE_WEIGHT / 4);
  });

  it("counts the 99's card advantage and protection in the profile", () => {
    const counted = extractThemeProfile([], [greaves, study, harmonize]);
    expect(counted.protectionCount).toBe(1);
    expect(counted.cardAdvantageCount).toBe(1.5);
  });
});
