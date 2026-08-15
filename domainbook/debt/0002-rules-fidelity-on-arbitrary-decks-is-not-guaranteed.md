---
status: accepted
date: 2026-08-15
severity: high
quadrant: deliberate-prudent
decisions: [ADR-0001, ADR-0004]
---

# Rules fidelity on arbitrary decks is not guaranteed

## Debt

phase-rs's card coverage is parse-level — a card counts as supported if its text
lowers to executable rules, not if the interaction is hand-verified — and there is an
active tail of specific card-interaction bugs, with the occasional engine panic. A
hand-entered 100-card deck (`ADR-0004`) can contain unsupported cards or hit a
subtly wrong interaction during play.

## Impact

For a tool whose whole value is trusting the board state, a *subtly wrong*
interaction is worse than an *obviously missing* card: it silently biases the win
rate a `run` reports, and the user may not notice. Unsupported cards can be caught
before a game; wrong-but-legal interactions cannot. It bites most on spicy or
edge-case decks and on cluttered late-game board states — exactly what a 100-card
singleton game produces.

## Remedy

Surface a deck's unsupported cards before a game starts (the deck-library `coverage`
gate). Validate fidelity on the user's real decks in the engine-integration spike
before committing further. Decide the mid-match panic policy (a `simulation` open
question): drop the match or halt the run. Be explicit to the user that measured
strength is "as phase-rs plays it". Upstream fixes for bugs we hit, and if fidelity
proves too low overall, take the Forge fallback (`ADR-0001`).
