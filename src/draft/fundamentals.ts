import { isLastingRamp } from "../lib/ramp";
import type { Card } from "../lib/types";
import { cardAdvantageValue } from "./cardAdvantage";
import { isProtection, protectionTarget } from "./protection";
import { RAMP_TARGET, rampBonus, rampRoom } from "./rampScore";
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

export type BucketName = "ramp" | "protection" | "cardAdvantage";
export const BUCKET_NAMES: readonly BucketName[] = ["ramp", "protection", "cardAdvantage"];

/** Where a deck stands on one bucket: its target for the whole deck, and what the 99 hold. */
export interface BucketState {
  target: number;
  count: number;
}

/**
 * A `fundamentals bucket`: what fills it, how much of it a deck aims for, what a
 * card filling it earns at pace, and how that bonus moves as the deck runs
 * behind or ahead of its pace.
 */
interface Bucket {
  /** How much of the bucket a card fills: 0, ½ or 1. */
  value(card: Card): number;
  target(commanders: Card[]): number;
  bonus(card: Card, profile: ThemeProfile): number;
  room(count: number, pace: number): number;
}

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

const BUCKETS: Record<BucketName, Bucket> = {
  // `deck-draft/ADR-0009`: ramp keeps its own fade.
  ramp: {
    value: (card) => (isLastingRamp(card) ? 1 : 0),
    target: () => RAMP_TARGET,
    bonus: rampBonus,
    room: rampRoom,
  },
  // `deck-draft/ADR-0013`.
  protection: {
    value: (card) => (isProtection(card) ? 1 : 0),
    target: protectionTarget,
    bonus: () => PROTECTION_WEIGHT,
    room: bucketRoom,
  },
  cardAdvantage: {
    value: cardAdvantageValue,
    target: () => CARD_ADVANTAGE_TARGET,
    bonus: () => CARD_ADVANTAGE_WEIGHT,
    room: bucketRoom,
  },
};

/** Each bucket's target for a deck with these commanders, and what its nonland 99 hold. */
export function measureBuckets(
  commanders: Card[],
  nonland: Card[],
): Record<BucketName, BucketState> {
  const measure = ({ target, value }: Bucket): BucketState => ({
    target: target(commanders),
    count: nonland.reduce((sum, card) => sum + value(card), 0),
  });
  return {
    ramp: measure(BUCKETS.ramp),
    protection: measure(BUCKETS.protection),
    cardAdvantage: measure(BUCKETS.cardAdvantage),
  };
}

/** What a card earns from one bucket: its share of the bonus, scaled by the deck's room. */
export function bucketFit(name: BucketName, card: Card, profile: ThemeProfile): number {
  const bucket = BUCKETS[name];
  const value = bucket.value(card);
  const { target, count } = profile.buckets[name];
  if (value === 0 || target === 0) return 0;
  const pace = bucketPace(target, profile.nonlandCount);
  return value * bucket.bonus(card, profile) * bucket.room(count, pace);
}
