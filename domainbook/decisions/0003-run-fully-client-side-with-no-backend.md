---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Run fully client-side with no backend

## Context and Problem Statement

Earlier engine candidates (Forge, XMage) were JVM engines that would have forced a
server. phase-rs runs in WebAssembly in the browser. Where does the application run?

## Decision Drivers

- The original preference to keep as much as possible in the front-end.
- Personal, self-hosted use — no accounts, no shared service.
- Fewest moving parts to build, deploy, and operate.

## Considered Options

- Fully client-side: engine and AI in a Web Worker, static hosting.
- A JVM engine behind a server (the path Forge/XMage would have required).

## Decision Outcome

Chosen: **fully client-side**. The engine and its AI run in a Web Worker; the app is
static and can be hosted anywhere (GitHub Pages included). The only network use is
fetching card images from Scryfall at runtime, cached locally; card data comes from
a static MTGJSON snapshot. This restores the front-end-first goal and removes all
server infrastructure, keys, and ops.

### Consequences

- Good: static deploy, no backend to run, no API key, works offline once cards are
  cached; Scryfall rate-limiting is a non-issue with a local cache.
- Bad: all compute is on the client — AI games are CPU-heavy, which is part of why
  a `run` is capped at 50 matches; each live game holds a large (~90 MB) WASM
  instance.

### Confirmation

The spike runs a full 4-player game in-browser with no backend of any kind.

## More Information

Consequence of `ADR-0001`. If the Forge fallback is ever taken, this decision
reopens, because Forge would reintroduce a server.
