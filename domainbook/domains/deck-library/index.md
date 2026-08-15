---
id: deck-library
name: Deck library
classification:
  domain: supporting-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/deck/**
  - src/lib/decklist.ts
  - src/lib/scryfall.ts
---

## Purpose

Hold the decks the user typed in, and say which of their cards the engine can
actually play, so `match setup` always has legal, playable decks to choose from.

## Domain Roles

- Authoring context: a `deck` is entered by hand — a `commander card` plus the 99
  — and saved under a name for reuse. There is no bundled or scraped field of
  decks to pick from (`ADR-0004`).
- Gateway context: it resolves typed card names to canonical Scryfall names and
  asks the engine which of them are implemented (`coverage`).
- Persistence context: named decks are kept locally so a later `run` can reuse them.

## Inbound Communication

| Message         | Collaborator | Type    |
| --------------- | ------------ | ------- |
| `AuthorDeck`    | deck author  | Command |
| `SaveNamedDeck` | deck author  | Command |
| `CheckCoverage` | deck author  | Query   |
| `ListDecks`     | match-setup  | Query   |

## Outbound Communication

| Message            | Collaborator      | Type    |
| ------------------ | ----------------- | ------- |
| `ResolveCardNames` | Scryfall (extern) | Query   |
| `ClassifyDeck`     | phase-rs (extern) | Query   |

## Business Decisions

- Decks are entered by hand and saved as named, reusable decks; no field of decks
  is bundled or scraped (`ADR-0004`).
- A deck's unsupported cards are surfaced before the deck can be used, never at
  game start (`TDR-0002`).
- Two legality gates are kept apart: format legality (`color identity`,
  `singleton`, banlist) is read from Scryfall data; engine `coverage` — is the card
  implemented — is asked of phase-rs. A card can be Commander-legal yet unplayable.
- The existing `src/lib/decklist.ts` parser and `src/lib/scryfall.ts` resolver are
  reused rather than rewritten.

## Assumptions

- Canonical Scryfall names line up with the engine's card names in the common case;
  split / modal-double-faced / adventure `//` names and diacritics are the known
  exceptions.
- The engine exposes a queryable list of implemented cards (phase-rs
  `classify_deck`), so coverage is checked before a game, not discovered during one.
- The user maintains their own decks; the library does not curate or suggest.

## Verification Metrics

- A deck's unsupported cards appear at authoring time; zero cases where an
  unsupported card is first seen at game start.
- A saved deck round-trips: save then reload yields the identical list.
- The coverage a deck shows matches what the engine reports for the same names.

## Open Questions

- How to match split / MDFC / adventure `//` names and diacritics against the
  engine's card set without false misses.
- Block a deck that contains unsupported cards, or only warn and let it run with
  those cards absent?
- Where named decks persist — `localStorage` or IndexedDB — given decks are small
  but numerous.
