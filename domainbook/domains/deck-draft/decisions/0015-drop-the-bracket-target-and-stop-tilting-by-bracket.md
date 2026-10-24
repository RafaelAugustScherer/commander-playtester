---
status: accepted
date: 2026-10-24
decision-makers: [RafaelAugustScherer]
authored-by: agent
---

# Drop the bracket target and stop tilting by bracket

## Context and Problem Statement

`deck-draft/ADR-0001` and `ADR-0009` gave the draft a selectable `bracket target`
(Focused, Optimized or cEDH). For the top twelve candidates of each slot, the ranker
called the engine's `estimate_bracket_for_deck` and subtracted 2 for every tier the deck
would sit above the target. The target was only ever a ceiling: it never rewarded a card
for raising the deck's tier, and at cEDH, the highest tier, it did nothing at all. The
author wanted the draft to offer the stronger cards without having to choose a bracket.

## Considered Options

- **Remove the selector and stop penalizing higher brackets**, adding no reward.
- **Remove the selector and reward higher tiers**, a positive tilt for cards that lift the
  estimated tier.
- **Hard-wire the cEDH target**, which has the same ranking effect as the first option.
- **Keep the selector.**

## Decision Outcome

Chosen: **remove the selector and stop penalizing higher brackets.** The ranker no longer
calls `estimate_bracket_for_deck`: each slot takes the highest-fitting candidate (the
`synergy score` plus the reprint-count tilt, `deck-draft/ADR-0002`). A card is never ranked
down for the bracket it would push the deck to. A reward for higher tiers was considered and
declined.

The draft summary keeps the engine's bracket and archetype as live labels. They report what
the deck is; they no longer steer it.

### Consequences

- Good: a simpler entry form and summary, one less setting to explain, and no engine call
  per shortlisted candidate. The ranker made up to 36 bracket estimates per round before.
- Good: a card is no longer ranked down for being strong.
- Bad: there is no longer a way to hold back high-power cards for a casual table. A draft
  can drift above Focused without the ranking resisting it; the live bracket label shows
  where it landed.
- Bad: nothing pulls the draft toward higher brackets either. The ranking is exactly as
  strong as the synergy heuristic makes it.

### Confirmation

The `draft-a-deck` scenarios no longer mention a bracket target. The ranker, session and
candidate tests no longer take a target or a bracket tilt, and the draft-balance and
engine-smoke suites still pass against the real engine.

## More Information

Supersedes the bracket tilt of `deck-draft/ADR-0001` and `ADR-0009`, the `−2 per tier` term
in `deck-draft/ADR-0013`, and the "Bracket targets" bullet of `deck-draft/ADR-0006`. The
engine's tier vocabulary (Exhibition, Core, Focused, Optimized, cEDH) is unchanged and still
labels the summary.
