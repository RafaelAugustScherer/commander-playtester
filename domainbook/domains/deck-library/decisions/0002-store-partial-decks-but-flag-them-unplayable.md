---
status: accepted
date: 2026-09-03
decision-makers: [RafaelAugustScherer]
---

# Store partial decks but flag them unplayable

## Context and Problem Statement

Until now every saved deck was legal: the editor refused to save anything but exactly 100
cards, so completeness never had to be checked again downstream. `match setup` picks decks
straight from the library with no legality gate, because it never needed one.

Assisted drafting (`ADR-0009`) breaks that guarantee. A user drafting a deck wants to leave
partway through and keep what they have, and the same relaxation lets a deck be hand-entered
incomplete. So the library must now hold decks that are not yet 100 cards — without letting
one reach a game, where the engine would reject it or, worse, play it short.

## Considered Options

- **Allow any card count; derive playability from the 100-card rule; gate at play time.**
- **Add an explicit `draft`/`complete` flag to the deck model** and gate on that.
- **Keep the editor strict** and let only the draft flow emit partial decks.

## Decision Outcome

Chosen: **partial decks are first-class in storage but gated from play, and playability is
derived, not stored.**

- The editor's hard 100-card block becomes a warning; any card count can be saved.
- Playability stays derived from the existing 100-card rule (`isHundredCards`) — no new
  field on the deck model, so an incomplete deck completed later is simply playable, with
  nothing to reconcile.
- The library and deck detail flag a deck that is not exactly 100 cards as partial and not
  playable.
- `match setup` will not start with a partial deck selected — the deck picker marks it and
  the start control refuses it — so an incomplete deck is caught before a game, the same
  discipline `TDR-0002` set for unsupported cards.

An explicit flag was rejected because the count already carries the truth; a stored flag
could drift from the actual card count and would have to be kept in sync on every edit.

### Consequences

- Good: a draft can be saved and resumed; nothing incomplete can be played; the rule is
  one derivation reused everywhere.
- Bad: play-time now has a gate it never had, in `match setup` — a place that previously
  trusted the library completely.

### Confirmation

The deck-library scenarios cover saving a partial deck, seeing it flagged, and being
refused when trying to start a match with it.

## More Information

The draft flow that first produces partial decks is `deck-draft` (`ADR-0009`,
`draft-a-deck`).
