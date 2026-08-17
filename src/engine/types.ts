// Minimal TypeScript surface over the phase-rs engine JSON. We type only the
// fields we read for the board and driver; everything else stays open via
// index signatures, since the engine's wire shape is large and evolving.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AiDifficulty =
  | "VeryEasy"
  | "Easy"
  | "Medium"
  | "Hard"
  | "VeryHard"
  | "CEDH";

export const AI_DIFFICULTIES: AiDifficulty[] = [
  "VeryEasy",
  "Easy",
  "Medium",
  "Hard",
  "VeryHard",
];

/** One seat's name-only deck, mirroring the engine's PlayerDeckList. */
export interface PlayerDeckPayload {
  main_deck: string[];
  commander: string[];
}

/** The full deck payload initialize_game accepts (seat 0 = player, 1 = opponent, 2+ = ai_decks). */
export interface EngineDeckList {
  player: PlayerDeckPayload;
  opponent: PlayerDeckPayload;
  ai_decks: PlayerDeckPayload[];
  ai_difficulties: string[];
}

export interface CardTypes {
  core_types?: string[];
  subtypes?: string[];
  supertypes?: string[];
}

/** A game object (card/permanent/token) from the engine's `objects` map. */
export interface GameObject {
  id: number;
  name?: string;
  zone: string;
  controller?: number;
  owner?: number;
  tapped?: boolean;
  power?: number | null;
  toughness?: number | null;
  card_types?: CardTypes;
  is_commander?: boolean;
  is_token?: boolean;
  face_down?: boolean;
  summoning_sick?: boolean;
  damage_marked?: number;
  [k: string]: any;
}

export interface PlayerState {
  id: number;
  life: number;
  hand: number[];
  library: number[];
  graveyard: number[];
  poison_counters?: number;
  is_eliminated?: boolean;
  [k: string]: any;
}

export interface WaitingFor {
  type: string;
  data?: any;
}

export interface GameState {
  turn_number: number;
  phase: string;
  step?: string;
  active_player: number;
  priority_player?: number;
  waiting_for: WaitingFor;
  players: PlayerState[];
  objects: Record<string, GameObject>;
  battlefield: number[];
  command_zone: number[];
  stack: number[];
  exile?: number[];
  eliminated_players: number[];
  commander_damage?: any;
  match_phase?: string;
  seat_order?: number[];
  [k: string]: any;
}

export interface DerivedViews {
  turn_order?: number[];
  [k: string]: any;
}

/** What get_game_state returns: the state plus derived projections. */
export interface GameStateEnvelope {
  state: GameState;
  derived: DerivedViews;
}

/** A minted AI action proposal ({ token, actor, action, semanticOwner }). */
export interface AiProposal {
  token: string;
  actor: number;
  action: any;
  semanticOwner?: number;
}

/** One typed piece of a log entry's message; card/player carry an id. */
export type LogSegment =
  | { type: "Text"; value: string }
  | { type: "CardName"; value: { name: string; object_id: number } }
  | { type: "PlayerName"; value: { name: string; player_id: number } }
  | { type: "Zone"; value: string }
  | { type: "Number"; value: number }
  | { type: "Mana"; value: string }
  | { type: "Keyword"; value: string };

export type LogImportance = "Context" | "Detail" | "Essential";
export type LogTone = "Neutral" | "Informational" | "Positive" | "Negative";
export type LogBoundary = "None" | "Phase" | "Turn";
export type LogVisibility = "Public" | "HiddenInformation";

/** A single engine game-log line: typed message segments plus presentation hints. */
export interface LogEntry {
  seq: number;
  turn: number;
  phase: string;
  category: string;
  segments: LogSegment[];
  presentation: {
    importance: LogImportance;
    tone: LogTone;
    boundary: LogBoundary;
    visibility: LogVisibility;
  };
}

/** Error envelope some engine calls return instead of a value. */
export interface EngineError {
  error: true;
  reasons?: string[];
}

export function isEngineError(v: unknown): v is EngineError {
  return !!v && typeof v === "object" && (v as any).error === true;
}

/** Which seat currently owns the pending decision, read from waiting_for. */
export function actingPlayer(wf: WaitingFor | undefined): number {
  const d = wf?.data ?? {};
  if (typeof d.player === "number") return d.player;
  if (Array.isArray(d.pending) && typeof d.pending[0]?.player === "number") {
    return d.pending[0].player;
  }
  return 0;
}
