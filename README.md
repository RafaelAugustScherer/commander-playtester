# Commander Playtester

A local, browser-based tool for measuring how good a **Magic: The Gathering —
Commander** deck is. Enter decks by hand, then either **watch** them play full
rules-accurate games against opponent decks or **pilot** one yourself — and get
a win rate plus telemetry over a series of matches. A fast **goldfishing**
consistency model complements the real games.

The rules engine and AI are [**phase-rs**](https://github.com/phase-rs/phase),
compiled to WebAssembly and run entirely in the browser (in a Web Worker). No
backend, no accounts — everything is local.

> Full domain documentation lives in [`domainbook/`](domainbook/) — the roadmap,
> glossary, bounded-context canvases, architecture decisions, and known risks.

## What it does

- **Deck library** — enter decks by hand (Moxfield / Archidekt / plain text with
  a `Commander` section), save them as reusable named decks, and load a few
  bundled starter precons to test immediately.
- **Consistency (goldfishing)** — thousands of seeded Monte-Carlo opening-hand
  simulations per deck: mulligan rate, mana screw/flood, land drops and mana by
  turn, ramp-by-turn-3, composition, and mana curve.
- **Engine matches** — play a real Commander game (1v1 or a 4-player pod) driven
  by the phase-rs rules engine and AI:
  - **Watch** mode auto-plays every seat while the board renders live;
  - **Play** mode lets you pilot your seat — press **space** to step through
    phases and click legal actions to play cards, while the AI responds.
- **Head-to-head analysis** — run 1–50 matches sequentially and get your deck's
  win rate with a 95% confidence interval, wins by seat, and per-match results.

## Getting started

```bash
npm install
npm run fetch-engine   # download the phase-rs WASM + card database (~123 MiB, one-time)
npm run dev            # start the dev server
```

Open the dev server URL, go to **Decks → Adicionar decks de exemplo** to load
starter decks, open one to see its consistency report, then **Testar em partida**
to configure and run a match.

```bash
npm test          # unit tests
npm run build     # typecheck + production build
npm run lint      # lint
```

### Engine assets

The compiled WASM (`engine_wasm_bg.wasm`, ~28 MiB) and card database (fetched as
`card-data.json`, ~95 MiB) are too large to commit, so they are git-ignored and
fetched by `scripts/fetch-engine.sh` (run via `npm run fetch-engine`) into
`public/engine/`. The card database is stored gzipped as `card-data.json.gz`
(~16 MiB) — the raw JSON exceeds GitHub Pages' per-file limit, so the engine
worker decompresses it at runtime via `DecompressionStream`. The wasm-bindgen
glue that pairs with them (`src/engine/vendor/engine_wasm.js`) **is** committed.

The fetch script pins the phase-rs **v0.55.0** web build. Those CDN URLs are
content-hashed and may eventually 404 as phase-rs ships new builds; if that
happens, rebuild the matching assets from source at the pinned tag. See
[`domainbook/decisions/`](domainbook/decisions) and
[`domainbook/debt/`](domainbook/debt).

## How it works

- **`src/deck/`** — the named-deck library (model, localStorage store, editor,
  detail with the goldfishing report, bundled starter decks).
- **`src/lib/`** — decklist parser, Scryfall client + cache, seeded RNG, the
  goldfishing Monte-Carlo engine, and the heuristic role classifier.
- **`src/engine/`** — the phase-rs boundary: the vendored WASM glue, a Web Worker
  (`engine.worker.ts`) that hosts the engine, and `EngineClient` — a promise-based
  main-thread handle. `deckPayload.ts` converts saved decks to the engine's
  name-only deck format.
- **`src/sim/`** — `MatchRunner`, the driver that runs a series of matches. Watch
  mode drives every seat with the engine AI; play mode pauses for the human at
  their priority windows.
- **`src/board/`** — the fixed-slot, MTG-Arena-style board that renders the live
  game state (life, zones, commander, battlefield with card images).
- **`src/match/`** — run configuration and the run view (live board + controls +
  results).
- **`src/analysis/`** — win-rate + confidence-interval aggregation over a run.

The engine is CPU-heavy (a full game is thousands of AI decisions), so it runs
off the main thread in a Web Worker; the UI streams board frames and stays
responsive.
