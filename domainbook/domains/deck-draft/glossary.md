# Deck draft glossary

The words the deck-draft context uses. Shared Magic and Commander terms — `deck`,
`commander card`, `color identity` — are in the book glossary, and `partial deck` lives
in the deck-library glossary; these are the ones this context adds.

## Base cards

The three or more cards the user enters to start a draft, setting its theme. One of them
may be flagged as the `commander card`; if none is, the first `suggestion round` picks
the commander.

- **Aliases:** seed cards, seed
- **Status:** draft
- **Example:** Seeding "Krenko, Mob Boss", "Goblin Chieftain" and "Skirk Prospector"
  points the draft at mono-red Goblins.

## Suggestion round

One set of up to three suggested cards, offered after a card is added (or at the start).
Within a round the same card is never shown twice, refreshes included; adding a card ends
the round and begins the next.

- **Status:** draft
- **Example:** After adding a card, the round shows three new candidates ranked by
  `synergy score`.

## Refresh

Replacing a single suggested card in the current round with the next best candidate that
has not been shown this round — kept as close as possible to the card it replaces, so the
slot holds its flavour.

- **Status:** draft
- **Example:** Refreshing a suggested board wipe offers a different board wipe before an
  unrelated card.

## Synergy score

The self-built ranking of a candidate card against the cards already in the deck — the
sum of the `theme token`s it shares (with `commander weighting` applied), plus fit for
the deck's role gaps and mana curve, plus the `bracket target` tilt. The engine supplies
no such score; this context owns it (`deck-draft/ADR-0001`).

- **Status:** draft

## Theme token

A signal pulled from a card that the score matches on: a creature subtype (a tribe like
Goblin), a keyword, or a salient oracle-text phrase (`+1/+1 counter`, `sacrifice`,
`create ... token`, `landfall`). The set of tokens the heuristic recognises sets its
ceiling.

- **Aliases:** theme signal
- **Status:** draft

## Commander weighting

The rule that `theme token`s coming from the `commander card` count for more than those
from the other 99 when scoring a candidate, so the commander leads the deck's direction.

- **Status:** draft
- **Example:** With an Elf commander, Elf-tribal candidates outrank cards that only match
  a non-commander theme of equal strength.

## Bracket target

The power level (Exhibition, Core, Upgraded/Focused, Optimized, cEDH) the user aims the
draft at, defaulting to Focused. It steers the ranking through the engine's
`estimate_bracket_for_deck`; a card that would push the deck past the target is penalised.

- **Aliases:** target bracket
- **Status:** draft

## Draft session

The in-progress draft state: the `base cards`, the chosen `bracket target`, the deck so
far, and the current `suggestion round`. It is not a saved `deck` until the user saves or
copies it out.

- **Status:** draft
