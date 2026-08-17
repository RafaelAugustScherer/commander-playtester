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
    if (missing.length) {
      throw new Error(
        `Engine assets missing: ${missing.join(", ")}\n` +
          "Run `npm run fetch-engine` first.",
      );
    }
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
