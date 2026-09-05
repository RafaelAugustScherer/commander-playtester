import type { EngineClient } from "../engine/EngineClient";
import type {
  AiDifficulty,
  EngineDeckList,
  GameStateEnvelope,
  LogEntry,
  WaitingFor,
} from "../engine/types";
import { actingPlayer, isEngineError } from "../engine/types";
import {
  parseAttackersPrompt,
  type AttackersPrompt,
} from "./decisions/attackers";
import {
  parseBlockersPrompt,
  type BlockersPrompt,
} from "./decisions/blockers";
import { parseManaPrompt, type ManaPrompt } from "./decisions/mana";
import {
  parseCreatureTypePrompt,
  type CreatureTypePrompt,
} from "./decisions/creatureType";
import { parseModesPrompt, type ModesPrompt } from "./decisions/modes";
import {
  parseMulliganPrompt,
  type MulliganPrompt,
} from "./decisions/mulligan";
import { parseDiscardPrompt, type DiscardPrompt } from "./decisions/discard";
import { parseScryPrompt, type ScryPrompt } from "./decisions/scry";
import {
  parseResolutionOptionalPaymentPrompt,
  type ResolutionOptionalPaymentPrompt,
} from "./decisions/resolutionOptionalPayment";
import {
  parseOptionalCostPrompt,
  type OptionalCostPrompt,
} from "./decisions/optionalCost";
import {
  parseCommanderZonePrompt,
  type CommanderZonePrompt,
} from "./decisions/commanderZone";
import { parseXValuePrompt, type XValuePrompt } from "./decisions/xValue";
import {
  parseOrderTriggersPrompt,
  type OrderTriggersPrompt,
} from "./decisions/orderTriggers";
import {
  parseSearchPrompt,
  type SearchDecisionPrompt,
} from "./decisions/search";
import { parseDigPrompt, type DigPrompt } from "./decisions/dig";
import {
  parseExploreRevealPrompt,
  type ExploreRevealPrompt,
} from "./decisions/exploreReveal";
import {
  parsePhyrexianPaymentPrompt,
  type PhyrexianPaymentPrompt,
} from "./decisions/phyrexianPayment";
import {
  parseCoinFlipLifePrompt,
  type CoinFlipLifePrompt,
} from "./decisions/coinFlipAndLife";
import {
  parseEquipCrewPrompt,
  type EquipCrewPrompt,
} from "./decisions/equipCrew";
import {
  parseWardUnlessPrompt,
  type WardUnlessPrompt,
} from "./decisions/wardUnless";
import {
  parseCopyChoicePrompt,
  type CopyChoicePrompt,
} from "./decisions/copyChoice";
import {
  parseCountersPrompt,
  type CountersPrompt,
} from "./decisions/counters";
import {
  parseCombatDamagePrompt,
  type CombatDamagePrompt,
} from "./decisions/combatDamage";

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

/** A pending request for one human decision: run it to get the human's choice. */
type HumanRequest = () => Promise<HumanChoice>;

/** One play-loop step: keep going, or end the match with this winner/stopped. */
type StepOutcome =
  | { done: false }
  | { done: true; winner: number | null; stopped: boolean };

/** Pair a decision callback with its parsed prompt into a request, or null. */
function humanRequest<P>(
  env: GameStateEnvelope,
  cb: ((env: GameStateEnvelope, prompt: P) => Promise<HumanChoice>) | undefined,
  prompt: P | null,
): HumanRequest | null {
  if (!cb || prompt == null) return null;
  return () => cb(env, prompt);
}

/** A single legal target: an object on the board, or a player seat. */
export type TargetRef = { Object: number } | { Player: number };

export interface TargetSlot {
  legalTargets: TargetRef[];
  optional: boolean;
}

/** A target-selection prompt the human must answer while playing manually. */
export interface TargetPrompt {
  kind: string;
  player: number;
  description: string;
  /** One slot per target the spell/ability needs, filled in order. */
  slots: TargetSlot[];
  /** MultiTargetSelection: choose between min and max from a single pool. */
  multi: boolean;
  min: number;
  max: number;
}

const TARGET_KINDS = new Set([
  "TargetSelection",
  "TriggerTargetSelection",
  "MultiTargetSelection",
]);

function toTargetRef(t: unknown): TargetRef | null {
  if (typeof t === "number") return { Object: t };
  if (t && typeof t === "object") {
    const o = t as Record<string, unknown>;
    if (typeof o.Object === "number") return { Object: o.Object };
    if (typeof o.Player === "number") return { Player: o.Player };
  }
  return null;
}

function toTargetRefs(arr: unknown): TargetRef[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(toTargetRef).filter((r): r is TargetRef => r !== null);
}

/** Read a target-selection waiting_for into a prompt, or null if it isn't one. */
export function parseTargetPrompt(
  wf: WaitingFor | undefined,
): TargetPrompt | null {
  if (!wf || !TARGET_KINDS.has(wf.type)) return null;
  const d = wf.data ?? {};
  const player = typeof d.player === "number" ? d.player : 0;
  const description = typeof d.description === "string" ? d.description : "";

  if (wf.type === "MultiTargetSelection") {
    const legalTargets = toTargetRefs(d.legal_targets);
    if (legalTargets.length === 0) return null;
    const min = typeof d.min_targets === "number" ? d.min_targets : 1;
    const max =
      typeof d.max_targets === "number" ? d.max_targets : legalTargets.length;
    return {
      kind: wf.type,
      player,
      description,
      multi: true,
      min,
      max,
      slots: [{ legalTargets, optional: min === 0 }],
    };
  }

  let slots: TargetSlot[] = Array.isArray(d.target_slots)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d.target_slots.map((s: any) => ({
        legalTargets: toTargetRefs(s?.legal_targets),
        optional: !!s?.optional,
      }))
    : [];
  if (slots.length === 0) {
    const cur = toTargetRefs(d.selection?.current_legal_targets);
    if (cur.length > 0) slots = [{ legalTargets: cur, optional: false }];
  }
  slots = slots.filter((s) => s.legalTargets.length > 0);
  if (slots.length === 0) return null;
  return {
    kind: wf.type,
    player,
    description,
    multi: false,
    min: slots.length,
    max: slots.length,
    slots,
  };
}

/** Build the engine action that submits chosen targets. */
export function selectTargetsAction(targets: TargetRef[]): {
  type: string;
  data: { targets: TargetRef[] };
} {
  return { type: "SelectTargets", data: { targets } };
}

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
  /** New engine game-log lines produced by the action that was just applied. */
  onLogEntries?: (entries: LogEntry[]) => void;
  /** Called on the human's priority in play mode; resolves with their choice. */
  requestHumanAction?: (
    env: GameStateEnvelope,
    legal: LegalActions,
  ) => Promise<HumanChoice>;
  /** Called when the human must choose targets for a spell/ability/trigger. */
  requestHumanTargets?: (
    env: GameStateEnvelope,
    prompt: TargetPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human must declare attackers in their combat. */
  requestHumanAttackers?: (
    env: GameStateEnvelope,
    prompt: AttackersPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human must declare blockers against an attack. */
  requestHumanBlockers?: (
    env: GameStateEnvelope,
    prompt: BlockersPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human must choose a mana source or color while paying. */
  requestHumanMana?: (
    env: GameStateEnvelope,
    prompt: ManaPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human must choose a creature type; `aiChoice` is the AI's pick. */
  requestHumanCreatureType?: (
    env: GameStateEnvelope,
    prompt: CreatureTypePrompt & { aiChoice: string | null },
  ) => Promise<HumanChoice>;
  /** Called when the human must choose one or more modes on a modal spell/ability. */
  requestHumanModes?: (
    env: GameStateEnvelope,
    prompt: ModesPrompt,
  ) => Promise<HumanChoice>;
  /** Called at game start for the human's opening mulligan (keep / mulligan / bottom). */
  requestHumanMulligan?: (
    env: GameStateEnvelope,
    prompt: MulliganPrompt,
  ) => Promise<HumanChoice>;
  /** Called when an effect forces the human to choose cards to discard. */
  requestHumanDiscard?: (
    env: GameStateEnvelope,
    prompt: DiscardPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human scries or surveils and must place the looked-at cards. */
  requestHumanScry?: (
    env: GameStateEnvelope,
    prompt: ScryPrompt,
  ) => Promise<HumanChoice>;
  /** Called when a resolving spell/ability offers the human a "pay X or Y" optional cost. */
  requestHumanResolutionOptionalPayment?: (
    env: GameStateEnvelope,
    prompt: ResolutionOptionalPaymentPrompt,
  ) => Promise<HumanChoice>;
  /** Called when casting a spell offers the human an optional cost (kicker, buyback…). */
  requestHumanOptionalCost?: (
    env: GameStateEnvelope,
    prompt: OptionalCostPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human's commander may go to the command zone instead of its current zone. */
  requestHumanCommanderZone?: (
    env: GameStateEnvelope,
    prompt: CommanderZonePrompt,
  ) => Promise<HumanChoice>;
  /** Called when casting an X spell or activating an X ability asks the human to choose X. */
  requestHumanXValue?: (
    env: GameStateEnvelope,
    prompt: XValuePrompt,
  ) => Promise<HumanChoice>;
  /** Called when two or more of the human's triggers go on the stack at once and must be ordered. */
  requestHumanOrderTriggers?: (
    env: GameStateEnvelope,
    prompt: OrderTriggersPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human browses a tutor/search, a fetch-land partition, or an outside-game pool. */
  requestHumanSearch?: (
    env: GameStateEnvelope,
    prompt: SearchDecisionPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human chooses which cards to keep on an impulse draw or dig effect. */
  requestHumanDig?: (
    env: GameStateEnvelope,
    prompt: DigPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human explores with a creature or decides whether to keep a reveal-until hit. */
  requestHumanExploreReveal?: (
    env: GameStateEnvelope,
    prompt: ExploreRevealPrompt,
  ) => Promise<HumanChoice>;
  /** Called when a spell with Phyrexian mana symbols asks the human to pay each shard with mana or life. */
  requestHumanPhyrexianPayment?: (
    env: GameStateEnvelope,
    prompt: PhyrexianPaymentPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human keeps coin-flip results, or picks a life-redistribution option. */
  requestHumanCoinFlipLife?: (
    env: GameStateEnvelope,
    prompt: CoinFlipLifePrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human equips, stations, crews, or saddles a creature. */
  requestHumanEquipCrew?: (
    env: GameStateEnvelope,
    prompt: EquipCrewPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human pays a Ward cost or chooses which "unless" cost to pay. */
  requestHumanWardUnless?: (
    env: GameStateEnvelope,
    prompt: WardUnlessPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human chooses what a copy effect copies, or how to retarget a copy. */
  requestHumanCopyChoice?: (
    env: GameStateEnvelope,
    prompt: CopyChoicePrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human distributes counters/damage/life, proliferates, or populates a token. */
  requestHumanCounters?: (
    env: GameStateEnvelope,
    prompt: CountersPrompt,
  ) => Promise<HumanChoice>;
  /** Called when the human assigns combat damage order/split among multiple blockers or attackers. */
  requestHumanCombatDamage?: (
    env: GameStateEnvelope,
    prompt: CombatDamagePrompt,
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

  private emitLog(res: { logEntries?: LogEntry[] }): void {
    if (res.logEntries && res.logEntries.length) {
      this.cb.onLogEntries?.(res.logEntries);
    }
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
      this.emitLog(res);

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

      const outcome = await this.playStep(env, wf, humanSeat);
      if (outcome.done) {
        winner = outcome.winner;
        stopped = outcome.stopped;
        break;
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

  /** Advance one action: run the human's decision if they own it, else the AI. */
  private async playStep(
    env: GameStateEnvelope,
    wf: WaitingFor | undefined,
    humanSeat: number,
  ): Promise<StepOutcome> {
    const { engine, opts } = this;
    const acting = actingPlayer(wf);
    const request = this.humanRequestFor(env, wf, humanSeat, acting);

    if (request) {
      const choice = await request();
      if (this.aborted) return { done: true, winner: null, stopped: true };
      await this.applyHumanChoice(humanSeat, choice);
      return { done: false };
    }

    // AI seats, and the human's non-priority sub-decisions, are AI-driven.
    const res = await engine.aiStep(opts.difficulty, acting, false);
    this.emitLog(res);
    if (res.applied) return { done: false };
    const wf2 = res.state?.state.waiting_for;
    const over = wf2?.type === "GameOver";
    return { done: true, winner: over ? (wf2?.data?.winner ?? null) : null, stopped: !over };
  }

  /** Play the human's chosen action, or let the AI act if they deferred. */
  private async applyHumanChoice(
    humanSeat: number,
    choice: HumanChoice,
  ): Promise<void> {
    const { engine, opts } = this;
    const res =
      "action" in choice
        ? await engine.humanAction(humanSeat, choice.action)
        : await engine.aiStep(opts.difficulty, humanSeat, false);
    this.emitLog(res);
  }

  /** The request for whatever decision the human owns right now, or null for AI. */
  private humanRequestFor(
    env: GameStateEnvelope,
    wf: WaitingFor | undefined,
    humanSeat: number,
    acting: number | null,
  ): HumanRequest | null {
    const { engine, cb } = this;
    const isHuman = acting === humanSeat;
    if (isHuman && wf?.type === "Priority") {
      if (!cb.requestHumanAction) return null;
      return async () => cb.requestHumanAction!(env, await engine.legalActions());
    }
    if (!isHuman || wf?.type === "Priority") return null;
    return this.nonPriorityRequest(env, wf, humanSeat);
  }

  /** Match a human non-priority sub-decision (targets, combat, mulligan, …). */
  private nonPriorityRequest(
    env: GameStateEnvelope,
    wf: WaitingFor | undefined,
    humanSeat: number,
  ): HumanRequest | null {
    const { cb } = this;
    const state = env.state;
    const resolvers: Array<() => HumanRequest | null> = [
      () => humanRequest(env, cb.requestHumanTargets, parseTargetPrompt(wf)),
      () =>
        humanRequest(
          env,
          cb.requestHumanAttackers,
          parseAttackersPrompt(wf, state.objects),
        ),
      () => humanRequest(env, cb.requestHumanBlockers, parseBlockersPrompt(wf)),
      () => humanRequest(env, cb.requestHumanMana, parseManaPrompt(wf)),
      () => this.creatureTypeRequest(env, wf, humanSeat),
      () =>
        humanRequest(
          env,
          cb.requestHumanModes,
          parseModesPrompt(wf, state.objects),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanMulligan,
          parseMulliganPrompt(wf, state, humanSeat),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanDiscard,
          parseDiscardPrompt(wf, state, humanSeat),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanScry,
          parseScryPrompt(wf, state, humanSeat),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanResolutionOptionalPayment,
          parseResolutionOptionalPaymentPrompt(wf, state.objects),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanOptionalCost,
          parseOptionalCostPrompt(wf, state.objects),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanCommanderZone,
          parseCommanderZonePrompt(wf, state.objects),
        ),
      () =>
        humanRequest(env, cb.requestHumanXValue, parseXValuePrompt(wf, state.objects)),
      () =>
        humanRequest(
          env,
          cb.requestHumanOrderTriggers,
          parseOrderTriggersPrompt(wf),
        ),
      () => humanRequest(env, cb.requestHumanSearch, parseSearchPrompt(wf, state)),
      () => humanRequest(env, cb.requestHumanDig, parseDigPrompt(wf, state)),
      () =>
        humanRequest(
          env,
          cb.requestHumanExploreReveal,
          parseExploreRevealPrompt(wf, state),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanPhyrexianPayment,
          parsePhyrexianPaymentPrompt(wf, state.objects),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanCoinFlipLife,
          parseCoinFlipLifePrompt(wf),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanEquipCrew,
          parseEquipCrewPrompt(wf, state.objects),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanWardUnless,
          parseWardUnlessPrompt(wf, state),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanCopyChoice,
          parseCopyChoicePrompt(wf, state),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanCounters,
          parseCountersPrompt(wf, state),
        ),
      () =>
        humanRequest(
          env,
          cb.requestHumanCombatDamage,
          parseCombatDamagePrompt(wf, state),
        ),
    ];
    for (const resolve of resolvers) {
      const req = resolve();
      if (req) return req;
    }
    return null;
  }

  /** Creature-type choice: seed the human prompt with the AI's suggested pick. */
  private creatureTypeRequest(
    env: GameStateEnvelope,
    wf: WaitingFor | undefined,
    humanSeat: number,
  ): HumanRequest | null {
    const { engine, opts, cb } = this;
    if (!cb.requestHumanCreatureType) return null;
    const prompt = parseCreatureTypePrompt(wf);
    if (!prompt) return null;
    return async () => {
      const hint = await engine.aiProposal(opts.difficulty, humanSeat);
      const suggested = hint?.action?.data?.choice;
      return cb.requestHumanCreatureType!(env, {
        ...prompt,
        aiChoice: typeof suggested === "string" ? suggested : null,
      });
    };
  }
}
