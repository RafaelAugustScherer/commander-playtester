# Match setup glossary

The words the match-setup context uses. The `play mode` / `watch mode` toggle, the
`match`, and the `run` are defined in the book glossary; these are the settings this
context adds around them.

## Opponent

An AI-piloted seat in the `pod`. The user picks 0 (solo), 1 (duel), or 3 (pod)
opponents, each backed by a `named deck` from the library.

- **Status:** validated

## Match count

How many `matches` a `run` plays, 1 to 50. The cap is 50 because each match is a
full game and AI games are slow (`ADR-0005`).

- **Status:** validated

## Difficulty

How hard the AI plays, set for the opponents before a `run`. It trades match speed
for play quality — a stronger setting thinks longer.

- **Status:** validated

## Reveal hands

A debug toggle that shows the opponents' hands face-up on the `board`. It
deliberately bypasses the engine's hidden-information filter, so it is off by
default.

- **Status:** validated

## Seed

The number that makes a `run` reproducible: the same decks and seed play the same
games. The engine owns shuffling from the seed.

- **Status:** validated
