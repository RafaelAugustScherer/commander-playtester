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
import type { SearchCardsQuery } from "./draftQueries";

// Absolute base URL for engine assets, supplied by the main thread on "ready".
// It must be resolved against the *page* location, not the worker's: a relative
// base like "./" resolves against the worker's own URL (`/assets/`) rather than
// the app root, which 404s the WASM and card database.
let assetBase = import.meta.env.BASE_URL;

let started = false;
let dbLoaded = false;
let commanderConfig: any = null;

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
  const reg = getFormatRegistry();
  const list = Array.isArray(reg) ? reg : [];
  commanderConfig = list.find((f: any) => f?.format === "Commander")?.default_config;
  dbLoaded = true;
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
    case "searchCards": {
      await ensureStarted();
      await ensureDb();
      const { text, colors, limit } = args ?? {};
      const query: SearchCardsQuery = {};
      if (text !== undefined) query.text = text;
      if (colors !== undefined) query.colors = colors;
      if (limit !== undefined) query.limit = limit;
      return draftQueries.search_cards_js(query);
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
    case "isCommanderEligible": {
      await ensureStarted();
      await ensureDb();
      const { name } = args ?? {};
      return draftQueries.is_card_commander_eligible(name);
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
