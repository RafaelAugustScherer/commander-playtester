---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Drive every seat through the engine AI

## Context and Problem Statement

`watch mode` needs the user's *own* deck auto-piloted, not just the opponents. The
live phase-rs client only auto-pilots opponent seats, but the engine's WASM API
exposes an AI move proposal for any seat. How do we auto-play a whole table?

## Considered Options

- Use the engine's `get_ai_action_proposal` for every seat, including the human's.
- Write our own heuristic pilot for the user's deck.
- Support only opponent-AI, and drop `watch mode`.

## Decision Outcome

Chosen: **ask the engine for an AI proposal for whichever seat holds the decision,
and submit it** — the human seat is treated like any other AI seat. The
`auto-play driver` loops decision requests to the end of the game. This reuses the
engine's own competent, tested AI for every seat and needs no second pilot, and it
lets `play` and `watch` share one loop (the human is just a swappable source of
decisions on their seat).

### Consequences

- Good: one driver serves both modes; no separate AI to build or tune; the same
  engine AI plays every deck.
- Bad: auto-play quality is bounded by phase-rs's AI, which is weaker at
  multiplayer politics; asking every seat for a proposal multiplies the AI's CPU
  cost per game.

### Confirmation

The engine-integration spike auto-plays a 4-seat Commander game to a legal
finish and a named winner.

## More Information

Consequence of `ADR-0002`. `watch mode` and the auto-play driver are defined in the
book glossary and the `simulation` glossary.
