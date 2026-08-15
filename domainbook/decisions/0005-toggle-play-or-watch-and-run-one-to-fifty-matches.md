---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Toggle play or watch, and run one to fifty matches

## Context and Problem Statement

Is this an interactive game you pilot, or a hands-off tool that measures a deck?
Both are wanted: the user wants to pilot the deck *and* to watch it play itself and
count the wins. How is that expressed?

## Decision Drivers

- Seeing the deck act — not just a number — is part of the value.
- The measurement has to be a bounded, defined batch, not an open-ended sim.
- Standard, watchable pacing matters more than raw throughput for the MVP.

## Considered Options

- Measurement only (auto-play, no interactive piloting).
- Interactive play only (the original brief).
- Both, chosen by a pre-game toggle.

## Decision Outcome

Chosen: **both, via a pre-game toggle**. Before a game the user picks `play` (they
pilot their seat, advancing phases with space while the AI acts) or `watch` (the AI
pilots every seat and they observe). A `run` is 1 to 50 matches, played
sequentially in real time and rendered on the board at a standard speed; playback
speed-ups come later. The same board serves both modes.

### Consequences

- Good: one board and one game loop serve piloting and measurement; the strength
  measurement is watchable, so the user sees their deck in action, not just a
  percentage.
- Bad: sequential real-time play makes a full `run` slow — minutes, not seconds;
  the 50-match cap and the single standard speed are deliberate MVP limits.

### Confirmation

The match-setup and simulation feature scenarios cover the toggle, the match count,
and a run rendering match by match.

## More Information

`watch` mode is powered by the auto-play driver (`simulation/ADR-0001`). The
speed-up control is deferred and noted in the `board` open questions.
