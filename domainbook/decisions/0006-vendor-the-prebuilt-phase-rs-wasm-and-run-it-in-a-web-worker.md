---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
authored-by: agent
---

# Vendor the prebuilt phase-rs WASM and run it in a Web Worker

## Context and Problem Statement

`ADR-0001` chose phase-rs and assumed we would build its WASM from source, since
there is no published npm package. Building requires a pinned Rust nightly, the
cranelift component, `wasm-bindgen`, a mandatory 16 MiB shadow-stack link-arg, and
a card-data generation step over MTGJSON. That is a heavy, brittle toolchain to
stand up and reproduce. Separately, a full 4-player Commander game is thousands of
AI decisions and minutes of single-threaded compute — enough to freeze a browser
tab if run on the main thread. How do we obtain the engine, and where do we run it?

## Decision Drivers

- Get to a working, verifiable engine fast, without a large toolchain.
- Keep the same client-side result `ADR-0003` requires (no backend).
- Keep the UI responsive while the engine grinds through a game.
- Reproducibility and a durable fallback if the convenience path rots.

## Considered Options

- **Build the WASM from source** at the pinned tag (pinned nightly + cranelift +
  card-data gen).
- **Vendor the prebuilt WASM** — download phase-rs.dev's compiled `_bg.wasm`,
  card-data JSON, and the wasm-bindgen glue as a pinned snapshot.
- Run the engine **on the main thread** vs. **in a Web Worker**.

## Decision Outcome

Chosen: **vendor the prebuilt WASM snapshot and run it in a Web Worker.**

The prebuilt `_bg.wasm` (~28 MiB) and `card-data.json` (~95 MiB) are fetchable at
stable, content-hashed CDN URLs with open CORS, and the wasm-bindgen `--target web`
glue is a small, self-contained ES module we can vendor directly. Together they are
a coherent v0.55.0 snapshot: the committed glue is matched to the pinned WASM, which
is matched to the pinned card-data. This gets the same client-side engine as a
source build with none of the toolchain, and it is what our exact React/Vite stack
already consumes.

The engine runs in a Web Worker (`src/engine/engine.worker.ts`) fronted by a
promise-based `EngineClient`. The heavy AI compute stays off the main thread; the
driver streams board frames so the UI stays responsive and the board renders live.

### Consequences

- Good: no build toolchain; a verified engine in-browser; a responsive UI during
  multi-minute games; a clean adapter seam (`simulation/ADR-0001`) that isolates
  the coupling.
- Bad: the CDN URLs are content-hashed and phase-rs ships daily, so a pinned URL
  can 404 as old assets are pruned. The large assets are git-ignored and fetched by
  `scripts/fetch-engine.sh`; the durable reproduction path remains a source build at
  the pinned tag. This is tracked in `TDR-0001`.

### Confirmation

Confirmed by the engine-integration spike: the vendored WASM loaded the card
database (35,798 cards) and drove a full 4-player Commander game to a natural
`GameOver` — winner decided, no stall — proving embed + auto-play + termination.
The browser run then rendered a 2-player match end-to-end with a live board and a
win-rate report.
