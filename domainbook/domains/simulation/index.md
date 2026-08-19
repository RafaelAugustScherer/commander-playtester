---
id: simulation
name: Simulation
classification:
  domain: core-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/engine/**
  - src/sim/**
relationships:
  - with: match-setup
    type: customer-supplier
    direction: downstream
---

## Purpose

Run each game to completion through the phase-rs engine — the human's seat in
`play mode`, every seat by AI in `watch mode` — and emit the running board state
and the finished-game result.

## Domain Roles

- Core execution context: the game loop, and the differentiator's home. Watching
  a deck play itself is what this project is *for*, and the `auto-play driver`
  lives here.
- Anti-corruption layer: the `engine adapter` is the only thing that talks to
  phase-rs, translating its WASM API and per-seat views into the project's own
  shapes, so nothing else depends on the engine's surface.

## Inbound Communication

| Message              | Collaborator | Type    |
| -------------------- | ------------ | ------- |
| `StartSession`       | match-setup  | Command |
| `SubmitPlayerAction` | board        | Command |
| `AdvancePhase`       | board        | Command |

## Outbound Communication

| Message               | Collaborator      | Type    |
| --------------------- | ----------------- | ------- |
| `GetAiActionProposal` | phase-rs (extern) | Query   |
| `SubmitAction`        | phase-rs (extern) | Command |
| `GameStateChanged`    | board             | Event   |
| `MatchEnded`          | analysis          | Event   |

## Business Decisions

- We embed the engine and own the loop; we do not fork the phase-rs client nor
  implement any rules ourselves (`ADR-0001`, `ADR-0002`).
- `watch mode` drives every seat — including the human's — by asking the engine for
  that seat's move (`get_ai_action_proposal`) and submitting it (`simulation/ADR-0001`).
- `play mode` keeps the human on their seat and advances phases on space; the AI
  fills the other seats and acts when priority passes to it.
- The `engine adapter` builds phase-rs's name-only per-seat deck payload from the
  stored deck, collapsing each two-sided `Front // Back` name to its front face —
  the only face the engine's card database keys on (`src/engine/deckPayload.ts`).
- One game runs per WASM instance, in a Web Worker; a `run` plays its matches
  sequentially (`ADR-0005`).
- A match takes a seed from the session, so games are reproducible.

## Assumptions

- The engine is authoritative for rules, legality, and priority; the client never
  overrides it.
- A `decision request` from the engine names the seat and the choice, so the same
  driver can answer for a human seat or an AI seat.
- The engine can pilot any seat, which is what makes watch mode possible.
- phase-rs auto-passes trivial priority (a "stops" model), so play mode does not
  prompt the human hundreds of times per game.

## Verification Metrics

- A watch match reaches a legal end state and names a winner.
- A play match never applies an illegal human move — the engine rejects it and the
  board stays consistent.
- The same seed and decks reproduce the same match.

## Open Questions

- How the driver paces watch mode for a readable "standard speed" without a real
  speed setting yet (`ADR-0005`).
- What to do when the engine panics mid-match (`TDR-0002`) — drop that match and
  continue the run, or halt and report.
- Whether play and watch are one driver with the human seat as a swappable
  controller, or two loops.
