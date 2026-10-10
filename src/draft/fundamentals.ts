import type { Card } from "../lib/types";
import { cardAdvantageValue } from "./cardAdvantage";
import { isProtection } from "./protection";
import type { ThemeProfile } from "./themes";

/** The nonland card by which a deck should hold a bucket's whole target. */
export const NONLAND_TARGET = 63;
/** Card advantage a deck aims for: EDHREC average decks' median (`deck-draft/ADR-0013`). */
export const CARD_ADVANTAGE_TARGET = 7;
export const CARD_ADVANTAGE_WEIGHT = 5;
export const PROTECTION_WEIGHT = 5;
/** How much more a bucket's bonus grows for each card the deck is behind its pace. */
export const BUCKET_CATCH_UP = 0.5;
/** The most a bucket's bonus grows when the deck is far behind. */
export const BUCKET_CATCH_UP_CAP = 3;

/** How far along a bucket's target the deck should be after `nonlandCount` nonland cards. */
export function bucketPace(target: number, nonlandCount: number): number {
  return (target * Math.min(nonlandCount, NONLAND_TARGET)) / NONLAND_TARGET;
}

/**
 * How much of a bucket's bonus a card earns: all of it at pace, more for each
 * card the deck is behind (up to `BUCKET_CATCH_UP_CAP`), and half for each card
 * ahead — never a hard cap.
 */
export function bucketRoom(count: number, pace: number): number {
  if (count > pace) return 0.5 ** (count - pace);
  return Math.min(BUCKET_CATCH_UP_CAP, 1 + BUCKET_CATCH_UP * (pace - count));
}

/** A protection piece's bonus, while the deck is short of its protection target. */
export function protectionFit(card: Card, profile: ThemeProfile): number {
  if (profile.protectionTarget <= 0 || !isProtection(card)) return 0;
  const pace = bucketPace(profile.protectionTarget, profile.nonlandCount);
  return PROTECTION_WEIGHT * bucketRoom(profile.protectionCount, pace);
}

/** A draw engine's (or, at half, a big draw spell's) bonus, while the deck is short of card advantage. */
export function cardAdvantageFit(card: Card, profile: ThemeProfile): number {
  const value = cardAdvantageValue(card);
  if (value === 0) return 0;
  const pace = bucketPace(CARD_ADVANTAGE_TARGET, profile.nonlandCount);
  return CARD_ADVANTAGE_WEIGHT * value * bucketRoom(profile.cardAdvantageCount, pace);
}
