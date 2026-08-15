import type { AiDifficulty } from "../engine/types";

/** How the user experiences the run. */
export type PlayMode = "play" | "watch";

/** Supported pod sizes for an engine match: 1v1 and a 4-player free-for-all.
 * (Solo deck testing is served by the goldfishing consistency report.) */
export type SeatCount = 2 | 4;

/** Configuration for a run of one or more matches. */
export interface RunConfig {
  /** Deck id per seat. Index 0 is you; the rest are AI opponents. */
  seatDeckIds: string[];
  mode: PlayMode;
  /** Number of matches to play sequentially, 1..50. */
  matchCount: number;
  /** Show every seat's hidden cards while the game plays. */
  revealHands: boolean;
  /** Strength of the AI piloting the seats. */
  difficulty: AiDifficulty;
  /** Seed for reproducible runs; each match derives seed + matchIndex. */
  seed: number;
}

export const MIN_MATCHES = 1;
export const MAX_MATCHES = 50;
export const SEAT_COUNTS: SeatCount[] = [2, 4];

export function defaultRunConfig(): RunConfig {
  return {
    seatDeckIds: [],
    mode: "watch",
    matchCount: 10,
    revealHands: false,
    difficulty: "Medium",
    seed: 1,
  };
}

export function clampMatchCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_MATCHES;
  return Math.max(MIN_MATCHES, Math.min(MAX_MATCHES, Math.floor(n)));
}
