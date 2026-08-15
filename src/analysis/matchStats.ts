import type { MatchResult } from "../sim/driver";

export interface RunStats {
  played: number;
  /** Wins for seat 0 (your deck). */
  yourWins: number;
  winRate: number;
  /** 95% Wilson score interval for the win rate, as [low, high] fractions. */
  ci95: [number, number];
  draws: number;
  /** Matches that ended without a natural result (aborted or stalled). */
  stalls: number;
  winsBySeat: number[];
  avgTurns: number;
  avgSeconds: number;
}

/** Wilson score interval for a binomial proportion (stable at small n). */
function wilson(wins: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return [
    Math.max(0, (center - margin) / denom),
    Math.min(1, (center + margin) / denom),
  ];
}

/** Aggregate completed matches into win-rate + telemetry for the run. */
export function aggregate(
  results: MatchResult[],
  seatCount: number,
): RunStats {
  const winsBySeat = new Array(seatCount).fill(0);
  let yourWins = 0;
  let draws = 0;
  let stalls = 0;
  let turnsSum = 0;
  let secondsSum = 0;
  let decided = 0;

  for (const r of results) {
    turnsSum += r.turns;
    secondsSum += r.seconds;
    if (r.stopped) {
      stalls++;
      continue;
    }
    decided++;
    if (r.winner === null) {
      draws++;
    } else {
      if (r.winner < seatCount) winsBySeat[r.winner]++;
      if (r.winner === 0) yourWins++;
    }
  }

  const played = results.length;
  const winRate = decided > 0 ? yourWins / decided : 0;

  return {
    played,
    yourWins,
    winRate,
    ci95: wilson(yourWins, decided),
    draws,
    stalls,
    winsBySeat,
    avgTurns: played > 0 ? turnsSum / played : 0,
    avgSeconds: played > 0 ? secondsSum / played : 0,
  };
}
