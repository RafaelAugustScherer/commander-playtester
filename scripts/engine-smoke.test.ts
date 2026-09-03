// Engine smoke gate: boots the REAL vendored phase-rs WASM, loads the card
// database, and drives a full match to a natural GameOver. This is the
// post-upgrade verification that catches ABI/JSON-shape breaks that unit tests
// (which never touch the WASM) cannot see.
//
// It is skipped in normal `npm test` runs — it needs the ~128 MiB engine assets
// and takes real compute. Run it explicitly after `npm run fetch-engine`:
//
//     npm run engine-smoke
//
// which sets ENGINE_SMOKE=1. See docs/engine-upgrade.md.

import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
import init, {
  init_panic_hook,
  load_card_database,
  getFormatRegistry,
  initialize_game,
  get_game_state,
  get_ai_action_proposal,
  submit_ai_action_proposal,
  take_last_panic_message,
} from "../src/engine/vendor/engine_wasm.js";
import { STARTER_DECKS } from "../src/deck/starterDecks";
import { buildDeckList } from "../src/engine/deckPayload";
import type { SavedDeck } from "../src/deck/model";
import { draftQueries } from "../src/engine/draftQueries";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WASM = resolve(ROOT, "public/engine/engine_wasm_bg.wasm");
const CARD_GZ = resolve(ROOT, "public/engine/card-data.json.gz");

const ENABLED = process.env.ENGINE_SMOKE === "1";
const MAX_ACTIONS = Number(process.env.ENGINE_SMOKE_MAX_ACTIONS ?? 25000);

// The fields our adapter (src/engine/types.ts) reads off the engine state. If a
// future engine renames or drops one of these, the smoke fails loudly here
// rather than silently in the browser.
const REQUIRED_STATE_FIELDS = [
  "turn_number",
  "phase",
  "active_player",
  "waiting_for",
  "players",
  "objects",
  "battlefield",
];

describe.skipIf(!ENABLED)("phase-rs engine smoke", () => {
  it("has the fetched engine assets on disk", () => {
    const missing = [WASM, CARD_GZ].filter((p) => !existsSync(p));
    expect(
      missing,
      `Engine assets missing: ${missing.join(", ")}\nRun \`npm run fetch-engine\` first.`,
    ).toHaveLength(0);
  });

  it(
    "boots the WASM, loads the DB, and runs a match to GameOver",
    { timeout: 300_000 },
    async () => {
      // Boot the WASM from disk bytes (no network in the test).
      const bytes = new Uint8Array(readFileSync(WASM));
      await init({ module_or_path: bytes });
      init_panic_hook();

      // Load the card database (inflate the gzipped copy the app ships).
      const cardJson = gunzipSync(readFileSync(CARD_GZ)).toString("utf8");
      const count = load_card_database(cardJson);
      expect(count, "card database should load thousands of cards").toBeGreaterThan(
        10_000,
      );

      // Commander default config, exactly as the worker resolves it.
      const registry = getFormatRegistry();
      const list = Array.isArray(registry) ? registry : [];
      const commanderConfig = list.find(
        (f: any) => f?.format === "Commander",
      )?.default_config;
      expect(commanderConfig, "engine should expose a Commander format").toBeTruthy();

      // Two known-legal starter decks, assembled via the app's own payload path.
      const decks = STARTER_DECKS.slice(0, 2) as unknown as SavedDeck[];
      const deckData = buildDeckList(decks, "Medium");
      const initRes = initialize_game(
        deckData,
        1234,
        commanderConfig,
        { match_type: "Bo1" },
        2,
        undefined,
      );
      expect(
        (initRes as any)?.error,
        `engine rejected the smoke decks: ${JSON.stringify(initRes)}`,
      ).toBeFalsy();

      // Drive every seat with the engine AI (the proven watch-mode loop) until a
      // natural GameOver, mirroring engine.worker.ts's aiStep.
      let actions = 0;
      let outcome: "gameover" | "stalled" = "stalled";
      let winner: number | null = null;
      for (; actions < MAX_ACTIONS; actions++) {
        const proposal = get_ai_action_proposal("Medium", 0);
        if (!proposal) {
          const wf = get_game_state()?.state?.waiting_for;
          if (wf?.type === "GameOver") {
            outcome = "gameover";
            winner = wf.data?.winner ?? null;
          }
          break;
        }
        submit_ai_action_proposal(proposal.token, proposal.actor, proposal.action);
      }

      const panic = take_last_panic_message();
      expect(panic, `engine panicked: ${panic}`).toBeFalsy();

      // Shape check: the state our adapter reads must still have its fields.
      const state = get_game_state()?.state;
      expect(state, "get_game_state should return an envelope with .state").toBeTruthy();
      for (const field of REQUIRED_STATE_FIELDS) {
        expect(
          field in state,
          `engine state is missing "${field}" — types.ts reads this; the ABI/shape drifted`,
        ).toBe(true);
      }

      expect(
        outcome,
        `match did not reach GameOver within ${MAX_ACTIONS} actions (ran ${actions})`,
      ).toBe("gameover");
      // A Commander game ends with a winner or a draw; both are valid.
      expect(winner === null || typeof winner === "number").toBe(true);
    },
  );
});

// Guard for the three game-independent deck-draft query functions
// (search_cards_js, estimate_bracket_for_deck, classify_deck_js). They are
// real exports of the vendored glue but untyped in engine_wasm.d.ts
// (src/engine/draftQueries.ts supplies the app-owned typing); this locks
// their runtime contract so a future engine upgrade's ABI drift fails here
// rather than silently in the draft worker (deck-draft/ADR-0001, TDR-0001).
describe.skipIf(!ENABLED)("phase-rs deck-draft query functions", () => {
  it(
    "boots the WASM, loads the DB, and locks the search/bracket/classify contracts",
    { timeout: 60_000 },
    async () => {
      const bytes = new Uint8Array(readFileSync(WASM));
      await init({ module_or_path: bytes });
      init_panic_hook();

      const cardJson = gunzipSync(readFileSync(CARD_GZ)).toString("utf8");
      load_card_database(cardJson);

      const commander = "Krenko, Mob Boss";
      const mainDeck = ["Mountain", "Lightning Bolt"];

      const search = draftQueries.search_cards_js({
        text: "Goblin",
        colors: ["R"],
        limit: 10,
      });
      expect(Array.isArray(search.results), "search_cards_js should return .results[]").toBe(
        true,
      );
      expect(typeof search.total).toBe("number");
      expect(search.results.length, "the Goblin/red search should find cards").toBeGreaterThan(0);
      const row = search.results[0];
      expect(typeof row.name).toBe("string");
      expect(typeof row.oracle_id).toBe("string");
      expect(typeof row.mana_value).toBe("number");
      expect(Array.isArray(row.color_identity)).toBe(true);
      expect(typeof row.legalities).toBe("object");

      const bracket = draftQueries.estimate_bracket_for_deck({
        commander: [commander],
        main_deck: mainDeck,
      });
      expect(
        bracket,
        "estimate_bracket_for_deck should return a result when a commander is given",
      ).toBeTruthy();
      expect(typeof bracket!.tier).toBe("string");
      expect(typeof bracket!.contributing).toBe("object");

      const bracketNoCommander = draftQueries.estimate_bracket_for_deck({
        main_deck: mainDeck,
      } as any);
      expect(
        bracketNoCommander,
        "estimate_bracket_for_deck should return null when the commander is omitted",
      ).toBeNull();

      const classify = draftQueries.classify_deck_js([commander, ...mainDeck]);
      expect(typeof classify.archetype).toBe("string");

      const classifyEmpty = draftQueries.classify_deck_js([]);
      expect(
        typeof classifyEmpty.archetype,
        "classify_deck_js should tolerate an empty name list",
      ).toBe("string");

      expect(
        draftQueries.is_card_commander_eligible(commander),
        "a legendary creature should be commander-eligible",
      ).toBe(true);
      expect(
        draftQueries.is_card_commander_eligible("Sol Ring"),
        "a non-legendary artifact should not be commander-eligible",
      ).toBe(false);

      const panic = take_last_panic_message();
      expect(panic, `engine panicked: ${panic}`).toBeFalsy();
    },
  );
});
