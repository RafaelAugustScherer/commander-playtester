---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Embed the engine and drive our own front-end

## Context and Problem Statement

phase-rs ships a complete React + TypeScript + Vite client alongside its engine.
Do we fork that client and adapt it, or embed only the engine and build our own
front-end?

## Decision Drivers

- We want a narrow Commander-only *measurement* tool, not a general MTG client with
  multiple formats, draft, and online play.
- We want our own board, our own `play`/`watch` flow, and to keep the existing
  goldfishing report.
- We want the smallest coupling to an alpha whose UI churns.

## Considered Options

- Fork the phase-rs client and strip it down.
- Embed only the WASM engine (plus its worker adapter) and build our own front-end.
- Use the hosted phase-rs app as-is.

## Decision Outcome

Chosen: **embed the WASM engine and drive our own front-end**. We consume the
built `engine_wasm.{js,wasm,d.ts}` and lift its Web-Worker adapter, then build a
minimal Commander-only UI on top. Forking their client would drag in formats and
novelty we do not want and couple us to their whole UI surface; the hosted app
can't host our measurement flow. Embedding keeps the coupling at the engine's typed
API, which is the narrowest seam available.

### Consequences

- Good: a small, purpose-built surface; our own `board` and `analysis`; the
  existing goldfishing engine is kept, not discarded.
- Bad: we own the board UI that a fork would have given us; we track the engine's
  churning ABI at the seam (`TDR-0001`); with no published package we build the
  WASM from source and re-sync deliberately.

### Confirmation

The engine-integration spike embeds the engine in a lean Vite app and drives a
game through the adapter, proving the seam without any of the phase-rs UI.

## More Information

Consequence of `ADR-0001`. The auto-play driver we build on top is
`simulation/ADR-0001`.
