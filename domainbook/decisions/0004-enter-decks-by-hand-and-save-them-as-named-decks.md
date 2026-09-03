---
status: superseded by ADR-0009
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Enter decks by hand and save them as named decks

## Context and Problem Statement

The strength measurement plays a deck against opponent decks. Where do those decks
come from? phase-rs itself scrapes a field of decks from MTGGoldfish, which we could
reuse.

## Decision Drivers

- The user wants full control over exactly which decks are measured against.
- Reproducibility and simplicity over a large, changing external field.

## Considered Options

- Manual entry, saved as named, reusable decks.
- Bundle or scrape a field of existing decks (as phase-rs does) to play against.

## Decision Outcome

Chosen: **manual entry, saved as named reusable decks**. The user builds each deck
— their own and the opponents' — by hand, and the library keeps them by name for
future runs. No field of decks is bundled or scraped. The point of the tool is to
measure a deck against opponents the user deliberately chose, not against an
arbitrary scraped field.

### Consequences

- Good: the matchup is fully user-controlled and reproducible; the library stays
  small and needs no feed to maintain.
- Bad: the user has to type decks in before any measurement; there is no instant
  "field baseline" to test against; every deck's engine `coverage` must be checked
  because a hand-entered deck can name unimplemented cards (`TDR-0002`).

### Confirmation

The deck-library feature scenarios cover authoring a named deck and surfacing its
unsupported cards.

## More Information

The existing decklist parser and Scryfall resolver are reused for entry and name
resolution (`deck-library` canvas).
