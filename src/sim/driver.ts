import type { EngineClient } from "../engine/EngineClient";
import type {
  AiDifficulty,
  EngineDeckList,
  GameStateEnvelope,
} from "../engine/types";
import { actingPlayer, isEngineError } from "../engine/types";

export interface MatchResult {
  matchIndex: number;
  /** Winning seat, or null for a draw. */
  winner: number | null;
  turns: number;
  actions: number;
  /** True when the match ended without a natural GameOver (abort or stall). */
  stopped: boolean;
  seconds: number;
}

/** The current priority legal actions for a seat. */
export interface LegalActions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any[];
  auto_pass_recommended?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

/** A human's choice at a priority window: play an action, or let the AI act. */
export type HumanChoice = { action: unknown } | { ai: true };

/** The engine rejected a deck at game start; carries the raw reasons. */
export class DeckRejectedError extends Error {
  constructor(public reasons: string[]) {
    super("deck_rejected");
    this.name = "DeckRejectedError";
  }
}

export interface DriverCallbacks {
  onFrame?: (env: GameStateEnvelope, matchIndex: number) => void;
  onMatchStart?: (matchIndex: number) => void;
  onMatchEnd?: (result: MatchResult) => void;
  onLog?: (msg: string) => void;
  /** Called on the human's priority in play mode; resolves with their choice. */
  requestHumanAction?: (
    env: GameStateEnvelope,
    legal: LegalActions,
  ) => Promise<HumanChoice>;
}

export interface DriverOptions {
  seatCount: number;
  matchCount: number;
  difficulty: AiDifficulty;
  seed: number;
  mode: "play" | "watch";
  /** Seat the human pilots in play mode. */
  humanSeat?: number;
  /** Show hidden zones (opponents' hands) in the rendered state. */
  revealHands?: boolean;
  /** Render the board at most once per this many engine actions (watch mode). */
  renderEveryActions?: number;
  /** Delay between rendered frames, ms (watchability). */
  paceMs?: number;
}

/** Safety bound: a Commander game is ~2000–3500 actions; this catches runaways. */
const MAX_ACTIONS_PER_MATCH = 25000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a series of matches. Watch mode drives every seat with the engine AI;
 * play mode pauses for the human at their priority windows. Pausable and
 * abortable; streams board frames for live rendering.
 */
export class MatchRunner {
  paused = false;
  aborted = false;
  /** Delay between rendered board frames, for watchability. 0 = as fast as possible. */
  paceMs: number;
  private resumeWaiters: Array<() => void> = [];

  constructor(
    private engine: EngineClient,
    private deckData: EngineDeckList,
    private opts: DriverOptions,
    private cb: DriverCallbacks,
  ) {
    this.paceMs = opts.paceMs ?? 0;
  }

  setPace(ms: number): void {
    this.paceMs = ms;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.resumeWaiters.splice(0).forEach((f) => f());
  }

  abort(): void {
    this.aborted = true;
    this.resume();
  }

  private async gate(): Promise<void> {
    if (this.aborted || !this.paused) return;
    await new Promise<void>((r) => this.resumeWaiters.push(r));
  }

  async run(): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    for (let m = 0; m < this.opts.matchCount; m++) {
      if (this.aborted) break;
      this.cb.onMatchStart?.(m);
      const result = await this.runMatch(m);
      results.push(result);
      this.cb.onMatchEnd?.(result);
    }
    return results;
  }

  private viewer(): number | undefined {
    if (this.opts.mode === "play" && !this.opts.revealHands) {
      return this.opts.humanSeat ?? 0;
    }
    return undefined;
  }

  private async runMatch(matchIndex: number): Promise<MatchResult> {
    const { engine, opts } = this;
    const initRes = await engine.initGame({
      deckData: this.deckData,
      playerCount: opts.seatCount,
      seed: opts.seed + matchIndex,
    });
    if (isEngineError(initRes)) {
      throw new DeckRejectedError(initRes.reasons ?? []);
    }
    const t0 = performance.now();
    return opts.mode === "play"
      ? this.playLoop(matchIndex, t0)
      : this.watchLoop(matchIndex, t0);
  }

  /** Watch mode: fixed-seat AI proposal drives whoever is up; throttled render. */
  private async watchLoop(matchIndex: number, t0: number): Promise<MatchResult> {
    const { engine, opts, cb } = this;
    const renderEvery = opts.renderEveryActions ?? 12;

    const env = await engine.getState();
    cb.onFrame?.(env, matchIndex);
    let actions = 0;
    let winner: number | null = null;
    let stopped = false;
    let lastTurn = env.state.turn_number ?? 0;

    for (; actions < MAX_ACTIONS_PER_MATCH; actions++) {
      await this.gate();
      if (this.aborted) {
        stopped = true;
        break;
      }

      const wantState = actions % renderEvery === 0;
      const res = await engine.aiStep(opts.difficulty, 0, wantState);

      if (!res.applied) {
        const final = res.state ?? (await engine.getState());
        const wf = final.state.waiting_for;
        if (wf?.type === "GameOver") winner = wf.data?.winner ?? null;
        else stopped = true;
        cb.onFrame?.(final, matchIndex);
        break;
      }

      if (res.state) {
        lastTurn = res.state.state.turn_number ?? lastTurn;
        cb.onFrame?.(res.state, matchIndex);
        if (this.paceMs > 0) await sleep(this.paceMs);
      }
    }

    return {
      matchIndex,
      winner,
      turns: lastTurn,
      actions,
      stopped,
      seconds: (performance.now() - t0) / 1000,
    };
  }

  /** Play mode: the human acts at their priority windows; AI drives the rest. */
  private async playLoop(matchIndex: number, t0: number): Promise<MatchResult> {
    const { engine, opts, cb } = this;
    const humanSeat = opts.humanSeat ?? 0;
    const viewer = this.viewer();

    let actions = 0;
    let winner: number | null = null;
    let stopped = false;
    let lastTurn = 0;

    for (; actions < MAX_ACTIONS_PER_MATCH; actions++) {
      await this.gate();
      if (this.aborted) {
        stopped = true;
        break;
      }

      const env = await engine.getState(viewer);
      const wf = env.state.waiting_for;
      lastTurn = env.state.turn_number ?? lastTurn;
      cb.onFrame?.(env, matchIndex);

      if (wf?.type === "GameOver") {
        winner = wf.data?.winner ?? null;
        break;
      }

      const acting = actingPlayer(wf);
      const humanPriority =
        acting === humanSeat && wf?.type === "Priority" && !!cb.requestHumanAction;

      if (humanPriority) {
        const legal: LegalActions = await engine.legalActions();
        const choice = await cb.requestHumanAction!(env, legal);
        if (this.aborted) {
          stopped = true;
          break;
        }
        if ("action" in choice) {
          await engine.humanAction(humanSeat, choice.action);
        } else {
          await engine.aiStep(opts.difficulty, humanSeat, false);
        }
      } else {
        // AI seats, and the human's non-priority sub-decisions, are AI-driven.
        const res = await engine.aiStep(opts.difficulty, acting, false);
        if (!res.applied) {
          const wf2 = res.state?.state.waiting_for;
          if (wf2?.type === "GameOver") winner = wf2.data?.winner ?? null;
          else stopped = true;
          break;
        }
      }
    }

    return {
      matchIndex,
      winner,
      turns: lastTurn,
      actions,
      stopped,
      seconds: (performance.now() - t0) / 1000,
    };
  }
}
