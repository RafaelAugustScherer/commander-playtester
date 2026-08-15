# Simulation glossary

The words the simulation context uses for driving the engine. `phase`, `priority`,
`stack`, and `combat` are in the book glossary; these are the terms for the
integration itself.

## Engine adapter

The one module that talks to phase-rs — its WASM API and per-seat views in,
project shapes out. Everything else depends on the adapter, never on the engine
directly, so an engine change is contained here (the anti-corruption layer).

- **Aliases:** the adapter
- **Status:** validated

## Auto-play driver

The loop that plays a game with no human: for whichever `seat` holds the decision,
it asks the engine for that seat's move and submits it, to the end of the game. It
is what powers `watch mode`, and it treats the human's seat like any other
(`simulation/ADR-0001`).

- **Status:** validated

## AI action proposal

A move the engine suggests for a given `seat` and difficulty — the phase-rs
`get_ai_action_proposal` call. The `auto-play driver` requests one per seat and
submits it; it is how the engine's own AI is reused for every seat.

- **Status:** validated

## Decision request

A point where the engine stops and asks a `seat` to choose — priority, a target,
attackers, blockers, a mulligan. The driver answers each, from the human in
`play mode` or from an `AI action proposal` in `watch mode`.

- **Aliases:** waiting-for
- **Status:** validated

## Seat

A player position at the table, identified by number. A game has one human seat and
the rest AI in `play mode`, or all-AI seats in `watch mode`.

- **Aliases:** player
- **Status:** validated

## Stops

The engine's model of pausing only at points that matter, auto-passing trivial
`priority`. Preserving it is what keeps `play mode` from prompting the human on
every pass.

- **Status:** draft
