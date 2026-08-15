import { describe, it, expect } from "vitest";
import { aggregate } from "./matchStats";
import type { MatchResult } from "../sim/driver";

const mk = (
  winner: number | null,
  stopped = false,
  turns = 10,
  seconds = 5,
): MatchResult => ({
  matchIndex: 0,
  winner,
  turns,
  actions: 100,
  stopped,
  seconds,
});

describe("aggregate", () => {
  it("computes win rate over decided matches", () => {
    const r = aggregate([mk(0), mk(1), mk(0), mk(2)], 4);
    expect(r.played).toBe(4);
    expect(r.yourWins).toBe(2);
    expect(r.winRate).toBeCloseTo(0.5);
    expect(r.winsBySeat).toEqual([2, 1, 1, 0]);
  });

  it("excludes stalls from the decided count", () => {
    const r = aggregate([mk(0), mk(null, true)], 2);
    expect(r.stalls).toBe(1);
    expect(r.played).toBe(2);
    expect(r.winRate).toBeCloseTo(1); // 1 win of 1 decided
  });

  it("counts draws as decided but not wins", () => {
    const r = aggregate([mk(null), mk(0)], 2);
    expect(r.draws).toBe(1);
    expect(r.yourWins).toBe(1);
    expect(r.winRate).toBeCloseTo(0.5);
  });

  it("brackets the point estimate with the Wilson interval", () => {
    const r = aggregate([mk(0), mk(0), mk(0), mk(1)], 2);
    expect(r.ci95[0]).toBeLessThanOrEqual(r.winRate);
    expect(r.ci95[1]).toBeGreaterThanOrEqual(r.winRate);
    expect(r.ci95[0]).toBeGreaterThanOrEqual(0);
    expect(r.ci95[1]).toBeLessThanOrEqual(1);
  });

  it("is safe on empty input", () => {
    const r = aggregate([], 4);
    expect(r.winRate).toBe(0);
    expect(r.ci95).toEqual([0, 0]);
    expect(r.winsBySeat).toEqual([0, 0, 0, 0]);
  });
});
