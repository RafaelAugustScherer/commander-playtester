/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AiDifficulty,
  EngineDeckList,
  GameStateEnvelope,
  LogEntry,
} from "./types";
import type {
  BracketDeckInput,
  BracketEstimate,
  CardValidation,
  ClassifyDeckResult,
  DraftCandidateData,
  RankCardCandidatesInput,
  RankedCardName,
} from "./draftQueries";

interface Pending {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
}

export interface InitGameArgs {
  deckData: EngineDeckList;
  formatConfig?: unknown;
  matchConfig?: unknown;
  playerCount: number;
  firstPlayer?: number;
  seed: number;
}

export interface AiStepResult {
  applied: boolean;
  actionType?: string;
  logEntries?: LogEntry[];
  state: GameStateEnvelope | null;
}

/** Main-thread handle to the engine worker: promise-based request/response. */
export class EngineClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private readyPromise: Promise<{ commanderConfig: unknown }> | null = null;
  commanderConfig: unknown = null;

  constructor() {
    this.worker = new Worker(
      new URL("./engine.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = (e: MessageEvent) => {
      const { id, ok, result, error } = e.data ?? {};
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (ok) p.resolve(result);
      else p.reject(new Error(error));
    };
  }

  private req<T = any>(cmd: string, args?: any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, cmd, args });
    });
  }

  /** Boot the WASM and load the card database (idempotent, ~95 MiB one-time). */
  ready(): Promise<{ commanderConfig: unknown }> {
    if (!this.readyPromise) {
      const base = new URL(import.meta.env.BASE_URL, location.href).href;
      this.readyPromise = this.req("ready", { base }).then((r: any) => {
        this.commanderConfig = r.commanderConfig;
        return r;
      });
    }
    return this.readyPromise;
  }

  initGame(args: InitGameArgs): Promise<any> {
    return this.req("initGame", args);
  }

  getState(viewer?: number): Promise<GameStateEnvelope> {
    return this.req("state", { viewer });
  }

  aiStep(
    difficulty: AiDifficulty,
    player: number,
    wantState: boolean,
  ): Promise<AiStepResult> {
    return this.req("aiStep", { difficulty, player, wantState });
  }

  legalActions(): Promise<any> {
    return this.req("legalActions");
  }

  humanAction(
    actor: number,
    action: unknown,
  ): Promise<{ result: any; logEntries?: LogEntry[]; state: GameStateEnvelope }> {
    return this.req("humanAction", { actor, action });
  }

  /** The action the AI would take for `player` right now, without applying it. */
  aiProposal(
    difficulty: AiDifficulty,
    player: number,
  ): Promise<{ action: any }> {
    return this.req("aiProposal", { difficulty, player });
  }

  /** Game-independent WotC bracket estimate for a (possibly partial) deck. */
  estimateBracket(deck: BracketDeckInput): Promise<BracketEstimate | null> {
    return this.req("estimateBracket", deck);
  }

  /** Game-independent archetype classification for a flat list of card names. */
  classifyDeck(names: string[]): Promise<ClassifyDeckResult> {
    return this.req("classifyDeck", { names });
  }

  commanderCandidates(): Promise<DraftCandidateData[]> {
    return this.req("commanderCandidates");
  }

  /** Local card-name suggestions from the engine's card database (no network). */
  searchCardNames(text: string): Promise<string[]> {
    return this.req("searchCardNames", { text });
  }

  /** Existence, Commander legality, and commander eligibility for each name. */
  validateCards(names: string[]): Promise<CardValidation[]> {
    return this.req("validateCards", { names });
  }

  /** Authoritative card data (color identity, type, oracle) from the engine DB. */
  resolveCards(names: string[]): Promise<DraftCandidateData[]> {
    return this.req("resolveCards", { names });
  }

  rankCardCandidates(input: RankCardCandidatesInput): Promise<RankedCardName[]> {
    return this.req("rankCardCandidates", input);
  }

  terminate(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}

let singleton: EngineClient | null = null;

/** Shared engine client — one worker, one WASM engine, reused across matches. */
export function getEngine(): EngineClient {
  if (!singleton) singleton = new EngineClient();
  return singleton;
}
