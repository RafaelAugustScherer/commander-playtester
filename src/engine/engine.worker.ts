/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Worker hosting the phase-rs engine. A full game is minutes of
// single-threaded compute, so it lives off the main thread. One worker holds
// one engine instance (the WASM state is a thread-local); matches run
// sequentially by re-initializing between them.

import init, {
  init_panic_hook,
  load_card_database,
  getFormatRegistry,
  initialize_game,
  get_game_state,
  get_filtered_game_state,
  get_ai_action_proposal,
  submit_ai_action_proposal,
  get_legal_actions_js,
  submit_action,
} from "./vendor/engine_wasm.js";
import { draftQueries } from "./draftQueries";
import type {
  CardValidation,
  DraftCandidateData,
  EngineThemeProfile,
  SearchCardRow,
} from "./draftQueries";
import { frontFace } from "../lib/cardName";
import { bracketTilt, type BracketTarget } from "../draft/bracket";
import { rankLocalCandidates } from "../draft/localCandidates";
import { rankNameSuggestions } from "../draft/cardNameSuggest";
import { isCommanderLegal, isCommanderEligible } from "../draft/cardLegality";
import type { ThemeProfile } from "../draft/themes";

// Absolute base URL for engine assets, supplied by the main thread on "ready".
// It must be resolved against the *page* location, not the worker's: a relative
// base like "./" resolves against the worker's own URL (`/assets/`) rather than
// the app root, which 404s the WASM and card database.
let assetBase = import.meta.env.BASE_URL;

let started = false;
let dbLoaded = false;
let commanderConfig: any = null;
let cachedCommanderCandidates: DraftCandidateData[] | null = null;
const cachedThemeCandidates = new Map<string, DraftCandidateData[]>();
const THEME_COUNT = 8;
// A theme token's matches are sorted by popularity, then the top slice kept.
// The scan pulls every match first so the slice is the most-played matches,
// not an alphabetical prefix (a common token like "graveyard" has thousands).
const TOKEN_MATCH_SCAN = 100_000;
const THEME_CANDIDATES_PER_TOKEN = 250;
const BRACKET_SHORTLIST_SIZE = 12;
const ROUND_SIZE = 3;
// How hard reprint frequency (our only in-data popularity proxy) tilts the
// ranking. Applied to log2(1 + printings), so it nudges ties toward staples
// without overriding a clearly better theme fit. Calibrated (0.75) against
// EDHREC staple lists for popular commanders (deck-draft/ADR-0002).
const POPULARITY_WEIGHT = 0.75;

// Lowercase card name -> number of printings, our proxy for how played a card
// is (EDHREC-style play-rate data is not in the card database). Built once from
// the same card-data JSON the engine loads — no network, no Scryfall.
let printingCounts = new Map<string, number>();

function buildPopularityIndex(cardDataJson: string): void {
  const data = JSON.parse(cardDataJson) as Record<string, any>;
  const counts = new Map<string, number>();
  for (const key of Object.keys(data)) {
    const ids = data[key]?.metadata?.source_printing_ids;
    counts.set(key.toLowerCase(), Array.isArray(ids) ? ids.length : 0);
  }
  printingCounts = counts;
}

function popularityBonus(name: string): number {
  const printings = printingCounts.get(name.trim().toLowerCase()) ?? 0;
  return POPULARITY_WEIGHT * Math.log2(1 + printings);
}

async function ensureStarted(): Promise<void> {
  if (started) return;
  await init({ module_or_path: `${assetBase}engine/engine_wasm_bg.wasm` });
  init_panic_hook();
  started = true;
}

// The card database ships gzipped (~16 MiB) to stay under GitHub Pages'
// per-file limit and keep the download small. Fetch and inflate it here.
// If a host transparently decodes the gzip (Content-Encoding), the bytes are
// already plain JSON — detected via the gzip magic — so we use them directly.
async function fetchCardData(): Promise<string> {
  const res = await fetch(`${assetBase}engine/card-data.json.gz`);
  if (!res.ok) {
    throw new Error(`card-data fetch failed: HTTP ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(bytes);
  const stream = new Response(bytes).body!.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return await new Response(stream).text();
}

async function ensureDb(): Promise<void> {
  if (dbLoaded) return;
  const text = await fetchCardData();
  load_card_database(text);
  buildPopularityIndex(text);
  const reg = getFormatRegistry();
  const list = Array.isArray(reg) ? reg : [];
  commanderConfig = list.find((f: any) => f?.format === "Commander")?.default_config;
  dbLoaded = true;
}

function cardTypeLine(cardType: NonNullable<ReturnType<typeof draftQueries.get_card_face_data>>["card_type"]): string {
  const types = [...(cardType?.supertypes ?? []), ...(cardType?.core_types ?? [])];
  const subtypes = cardType?.subtypes ?? [];
  return subtypes.length > 0 ? `${types.join(" ")} — ${subtypes.join(" ")}` : types.join(" ");
}

function candidateData(card: SearchCardRow): DraftCandidateData | null {
  const face = draftQueries.get_card_face_data(card.name);
  if (!face) return null;
  return {
    name: card.name,
    manaValue: card.mana_value,
    typeLine: cardTypeLine(face.card_type),
    oracleText: face.oracle_text ?? "",
    colorIdentity: card.color_identity,
  };
}

// The engine's free-text search matches name *and* oracle text and returns many
// alphabetical rows; `rankNameSuggestions` narrows that to a ranked name list.
// Pull a generous slice so a name match isn't cut off before it can be ranked.
const NAME_SUGGEST_SCAN = 2500;

function searchCardNames(query: string): string[] {
  if (query.trim().length < 2) return [];
  const rows = draftQueries.search_cards_js({
    text: query.trim(),
    limit: NAME_SUGGEST_SCAN,
  }).results;
  return rankNameSuggestions(rows, query);
}

// Name -> search row, for O(1) existence and legality checks. Built from one
// full scan and reused (the card database is static).
let cachedCardIndex: Map<string, SearchCardRow> | null = null;
function cardIndex(): Map<string, SearchCardRow> {
  if (!cachedCardIndex) {
    cachedCardIndex = new Map(
      draftQueries
        .search_cards_js({ limit: 100_000 })
        .results.map((row) => [row.name.toLowerCase(), row]),
    );
  }
  return cachedCardIndex;
}

function validateCards(names: string[]): CardValidation[] {
  const index = cardIndex();
  return names.map((name) => {
    const row =
      index.get(name.trim().toLowerCase()) ??
      index.get(frontFace(name).toLowerCase());
    const exists = row !== undefined;
    const face =
      draftQueries.get_card_face_data(name) ??
      draftQueries.get_card_face_data(frontFace(name));
    return {
      name,
      exists,
      commanderLegal: isCommanderLegal(row),
      commanderEligible:
        exists &&
        isCommanderEligible(draftQueries.is_card_commander_eligible(name), face),
    };
  });
}

function resolveCards(names: string[]): DraftCandidateData[] {
  const index = cardIndex();
  return names.flatMap((name) => {
    const row =
      index.get(name.trim().toLowerCase()) ??
      index.get(frontFace(name).toLowerCase());
    if (!row) return [];
    const candidate = candidateData(row);
    return candidate ? [candidate] : [];
  });
}

function commanderCandidates(): DraftCandidateData[] {
  if (cachedCommanderCandidates) return cachedCommanderCandidates;
  cachedCommanderCandidates = draftQueries
    .search_cards_js({ limit: 100_000 })
    .results.flatMap((card) => {
      if (
        card.legalities?.commander !== "legal" ||
        !draftQueries.is_card_commander_eligible(card.name)
      ) {
        return [];
      }
      const candidate = candidateData(card);
      return candidate ? [candidate] : [];
    });
  return cachedCommanderCandidates;
}

function themeCandidates(profile: ThemeProfile): DraftCandidateData[] {
  const tokens = [...profile.tokenWeights]
    .sort((a, b) => b[1] - a[1])
    .slice(0, THEME_COUNT)
    .map(([token]) => token);
  const candidates = new Map<string, DraftCandidateData>();
  for (const token of tokens) {
    let tokenCandidates = cachedThemeCandidates.get(token);
    if (!tokenCandidates) {
      tokenCandidates = draftQueries
        .search_cards_js({ text: token, limit: TOKEN_MATCH_SCAN })
        .results.filter((card) => card.legalities?.commander === "legal")
        .sort((a, b) => popularityBonus(b.name) - popularityBonus(a.name))
        .slice(0, THEME_CANDIDATES_PER_TOKEN)
        .flatMap((card) => {
          const candidate = candidateData(card);
          return candidate ? [candidate] : [];
        });
      cachedThemeCandidates.set(token, tokenCandidates);
    }
    for (const candidate of tokenCandidates) {
      candidates.set(candidate.name.toLowerCase(), candidate);
    }
  }
  return [...candidates.values()];
}

function themeProfile(profile: EngineThemeProfile): ThemeProfile {
  return {
    ...profile,
    tokenWeights: new Map(profile.tokenWeights),
  };
}

function rankedCardNames(args: {
  commanders: string[];
  mainboard: string[];
  profile: EngineThemeProfile;
  target: BracketTarget;
  exclude: string[];
}): Array<{ name: string; bracketTilt: number }> {
  const profile = themeProfile(args.profile);
  const excluded = new Set(args.exclude.map((name) => name.toLowerCase()));
  const shortlist = rankLocalCandidates(
    themeCandidates(profile),
    profile,
    excluded,
    popularityBonus,
  ).slice(0, BRACKET_SHORTLIST_SIZE);
  return shortlist
    .map(({ card, score }) => {
      const estimate = draftQueries.estimate_bracket_for_deck({
        commander: args.commanders.map(frontFace),
        main_deck: [...args.mainboard, card.name].map(frontFace),
      });
      const tilt = bracketTilt(estimate, args.target);
      const total = score.total + popularityBonus(card.name) + tilt;
      return { name: card.name, bracketTilt: tilt, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, ROUND_SIZE)
    .map(({ name, bracketTilt: tilt }) => ({ name, bracketTilt: tilt }));
}

async function handle(cmd: string, args: any): Promise<any> {
  switch (cmd) {
    case "ready": {
      if (args?.base) assetBase = args.base;
      await ensureStarted();
      await ensureDb();
      return { commanderConfig };
    }
    case "initGame": {
      const { deckData, formatConfig, matchConfig, playerCount, firstPlayer, seed } =
        args;
      return initialize_game(
        deckData,
        seed,
        formatConfig ?? commanderConfig,
        matchConfig ?? { match_type: "Bo1" },
        playerCount,
        firstPlayer,
      );
    }
    case "state": {
      return typeof args?.viewer === "number"
        ? get_filtered_game_state(args.viewer)
        : get_game_state();
    }
    case "aiStep": {
      const { difficulty, player, wantState } = args;
      const proposal = get_ai_action_proposal(difficulty, player ?? 0);
      if (!proposal) {
        return { applied: false, state: get_game_state(), logEntries: [] };
      }
      const res = submit_ai_action_proposal(
        proposal.token,
        proposal.actor,
        proposal.action,
      );
      return {
        applied: true,
        actionType: proposal.action?.type,
        logEntries: res?.result?.log_entries ?? [],
        state: wantState ? get_game_state() : null,
      };
    }
    case "aiProposal": {
      const { difficulty, player } = args;
      const proposal = get_ai_action_proposal(difficulty, player ?? 0);
      return { action: proposal?.action ?? null };
    }
    case "legalActions": {
      return get_legal_actions_js();
    }
    case "humanAction": {
      const { actor, action } = args;
      const res = submit_action(actor, action);
      return {
        result: res,
        logEntries: res?.log_entries ?? [],
        state: get_game_state(),
      };
    }
    case "estimateBracket": {
      await ensureStarted();
      await ensureDb();
      const { commander, main_deck } = args ?? {};
      return draftQueries.estimate_bracket_for_deck({ commander, main_deck });
    }
    case "classifyDeck": {
      await ensureStarted();
      await ensureDb();
      const { names } = args ?? {};
      return draftQueries.classify_deck_js(names ?? []);
    }
    case "commanderCandidates": {
      await ensureStarted();
      await ensureDb();
      return commanderCandidates();
    }
    case "searchCardNames": {
      await ensureStarted();
      await ensureDb();
      return searchCardNames(args?.text ?? "");
    }
    case "validateCards": {
      await ensureStarted();
      await ensureDb();
      return validateCards(args?.names ?? []);
    }
    case "resolveCards": {
      await ensureStarted();
      await ensureDb();
      return resolveCards(args?.names ?? []);
    }
    case "rankCardCandidates": {
      await ensureStarted();
      await ensureDb();
      return rankedCardNames(args);
    }
    default:
      throw new Error(`unknown engine command: ${cmd}`);
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, cmd, args } = e.data ?? {};
  try {
    const result = await handle(cmd, args);
    (self as any).postMessage({ id, ok: true, result });
  } catch (err) {
    (self as any).postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
