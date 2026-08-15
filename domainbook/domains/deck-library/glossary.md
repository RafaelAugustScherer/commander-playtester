# Deck library glossary

The words the deck-library context uses. Shared Magic and Commander terms —
`deck`, `commander card`, `color identity`, `singleton` — are in the book glossary;
these are the ones this context adds.

## Named deck

A `deck` the user typed in and saved under a name, so a later `run` can reuse it
without re-entering the cards. Named decks are the only source of decks in the
project (`ADR-0004`).

- **Aliases:** saved deck
- **Status:** validated
- **Example:** "Atraxa Superfriends" is a named deck the user picks in `match setup`.

## Coverage

Whether the engine actually implements a card — the fraction of a `deck`'s cards
phase-rs can play. Distinct from format legality: a card can be Commander-legal and
still have no engine coverage.

- **Status:** validated
- **Example:** A 99-card deck showing `88/99` has 11 cards without coverage.

## Unsupported card

A card in a `deck` that the engine does not implement, so it cannot be played. The
context surfaces these at authoring time, not at game start (`TDR-0002`).

- **Aliases:** not-implemented card
- **Status:** validated

## Deck author

The person building decks — the only role this context serves. There is no
importer feeding a curated field; the author is the source (`ADR-0004`).

- **Status:** draft
