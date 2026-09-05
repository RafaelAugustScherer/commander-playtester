// Typed view over three phase-rs exports that are real in the vendored glue
// (src/engine/vendor/engine_wasm.js) but absent from its regenerated
// engine_wasm.d.ts (which types only the handful of functions the game
// driver calls). Kept here, app-owned, so a future engine upgrade's
// regenerated .d.ts never clobbers this typing (ADR-0006,
// docs/engine-upgrade.md). Game-independent: they need the card database
// loaded but not a running game (deck-draft/ADR-0001, TDR-0001).

import type { CardRole } from "../lib/types";
import * as engineWasm from "./vendor/engine_wasm.js";

export interface SearchCardsQuery {
  text?: string;
  colors?: string[];
  limit?: number;
}

export interface SearchCardRow {
  name: string;
  oracle_id: string;
  mana_value: number;
  color_identity: string[];
  legalities: Record<string, string>;
}

export interface SearchCardsResult {
  results: SearchCardRow[];
  total: number;
}

export interface DraftCandidateData {
  name: string;
  manaValue: number;
  typeLine: string;
  oracleText: string;
  colorIdentity: string[];
}

export interface EngineThemeProfile {
  tokenWeights: Array<[string, number]>;
  curve: number[];
  roleCounts: Record<CardRole, number>;
  colorIdentity: string[];
}

export interface RankCardCandidatesInput {
  commanders: string[];
  mainboard: string[];
  profile: EngineThemeProfile;
  target: string;
  exclude: string[];
}

export interface RankedCardName {
  name: string;
  bracketTilt: number;
}

export interface CardFaceData {
  name: string;
  card_type?: {
    supertypes?: string[];
    core_types?: string[];
    subtypes?: string[];
  };
  oracle_text?: string;
}

export interface BracketDeckInput {
  commander: string[];
  main_deck?: string[];
}

export interface BracketEstimate {
  tier: string;
  axes: Record<string, unknown>;
  axis_caps_at_tier: Record<string, unknown>;
  contributing: Record<string, string[]>;
  violations: Record<string, unknown>;
  data_version: string;
}

export interface ClassifyDeckResult {
  archetype: string;
  confidence: string;
  secondary?: string;
}

interface DraftQueryExports {
  search_cards_js(query: SearchCardsQuery): SearchCardsResult;
  get_card_face_data(name: string): CardFaceData | null;
  estimate_bracket_for_deck(deck: BracketDeckInput): BracketEstimate | null;
  classify_deck_js(names: string[]): ClassifyDeckResult;
  /**
   * Single-arg form: true when the named card is legendary-creature-or-else
   * commander-eligible. The two-arg `isCardCommanderEligibleForFormat` also
   * exists in the vendored glue but a runtime spike found it unreliable, so
   * this app only calls the single-arg form.
   */
  is_card_commander_eligible(name: string): boolean;
}

export const draftQueries = engineWasm as unknown as DraftQueryExports;
