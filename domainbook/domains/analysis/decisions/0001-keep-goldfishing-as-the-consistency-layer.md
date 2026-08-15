---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Keep goldfishing as the consistency layer

## Context and Problem Statement

Head-to-head win rate is the new strength measure, built on the engine. The project
already ships a goldfishing consistency engine. Does head-to-head replace it?

## Considered Options

- Keep goldfishing as a separate, fast consistency report alongside head-to-head.
- Drop goldfishing once head-to-head lands.
- Fold both into a single combined score.

## Decision Outcome

Chosen: **keep goldfishing as the fast consistency layer**, beside head-to-head.
Consistency ("does the deck function?") and strength ("does it win?") are different
questions. Goldfishing answers the first instantly, with no opponent and no rules
engine; head-to-head answers the second slowly, through the engine over a `run`.
Keeping both gives an immediate read while a run is optional and expensive.

### Consequences

- Good: instant feedback with no `run`; the existing `src/lib/goldfish.ts` code is
  reused, not thrown away; two complementary reads of "how good".
- Bad: two report shapes to maintain; whether they later fold into one "power
  score" is left open (the old `docs/ROADMAP.md` Phase 2).

### Confirmation

The existing goldfishing tests stay green, and analysis feature scenarios cover
both a consistency report and a win-rate report.

## More Information

Consequence of `ADR-0001` (a rules engine now exists, which is what makes
head-to-head possible at all). Goldfishing predates it and needs none.
