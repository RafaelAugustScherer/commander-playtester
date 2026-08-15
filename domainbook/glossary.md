# Glossary

The words this book uses across every context — the Magic: The Gathering and
Commander vocabulary the domain is built on, plus the product's own top-level
concepts. Terms that belong to one context live in that context's own glossary
under `domains/`. A term is here because a contributor could reasonably read it
two ways, or because they may not play the game at all and still have to work on
it.

## Commander

The Magic: The Gathering format this project is about. A deck is a **commander**
plus 99 other cards, every card unique (`singleton`), all within the commander's
`color identity`; each player starts at 40 life; games are usually a four-player
`pod`. This project supports Commander and nothing else.

- **Aliases:** EDH
- **Status:** validated
- **Example:** "Commander-legal" means a card is allowed in the format, checked from Scryfall's `legalities.commander`.

## Commander card

The legendary creature (or planeswalker) that leads a deck and starts the game in
the `command zone`. It sets the deck's `color identity`, can be cast from the
command zone for an increasing `commander tax`, and dealing 21 of its combat
damage to one player loses that player the game (`commander damage`).

- **Aliases:** the general, the commander
- **Status:** validated
- **Example:** A deck built around *Atraxa, Praetors' Voice* has Atraxa as its commander card.

## Command zone

The zone a `commander card` waits in outside the game proper, and returns to
instead of the graveyard or exile when it would leave the battlefield. It is one
of the six `zones` and the one unique to the Commander format.

- **Status:** validated

## Color identity

The set of colors a card counts as, from its mana cost and its rules text, used to
decide whether it may go in a deck: every card's color identity must fit inside the
`commander card`'s. It is stricter than a card's colors — a card with no colored
mana cost can still have a color identity from its text.

- **Status:** validated
- **Example:** A card that adds `{G}` in its text has green in its color identity even if its mana cost is colorless.

## Singleton

The rule that a Commander deck holds at most one copy of any card, basic lands
aside. It is one of the two deck-legality gates the project checks, the other being
`color identity`.

- **Status:** validated

## Commander damage

Combat damage dealt by a `commander card`, tracked per source: 21 from a single
commander to one player loses that player the game, separately from their life
total. The `board` shows it per opponent.

- **Status:** validated

## Commander tax

The extra `{2}` added to a `commander card`'s cost for each previous time it has
been cast from the `command zone`. It makes a commander that keeps dying steadily
more expensive to bring back.

- **Status:** validated

## Pod

A single Commander game and the players in it. A four-player pod (you plus three
opponents) is the format's default and the project's largest table; a duel is a
two-player pod.

- **Aliases:** table
- **Status:** validated

## Deck

A Commander deck: exactly one `commander card` and 99 other cards, `singleton`,
inside the commander's `color identity`. In this project a deck is entered by hand
and saved in the `deck library` (`ADR-0004`); a deck the engine can actually play
also has to pass `coverage`.

- **Status:** validated

## Zone

One of the six places a card can be during a game: library, hand, battlefield,
graveyard, exile, and the `command zone`. The `board` draws each zone in fixed
slots.

- **Status:** validated

## Mana value

The total mana in a card's cost — the number the mana curve is built from. The
older name is "converted mana cost".

- **Aliases:** MV, mana cost, CMC
- **Status:** validated

## Land

A card that produces mana and is played at most once per turn rather than cast.
Everything that is not a land is a **nonland**. The land/nonland split drives the
`mulligan` decision and the mana curve.

- **Status:** validated

## Ramp

A card that adds mana or extra lands beyond the one-land-per-turn baseline —
"acceleration". One of the composition roles the goldfishing engine classifies
from a card's text, alongside `removal` and card draw.

- **Status:** validated

## Removal

A card that answers an opponent's permanent or spell — destroy, exile, counter,
damage. Loosely, "interaction". One of the composition roles the goldfishing engine
classifies heuristically; it is a label over card text, not a rules-accurate reading.

- **Aliases:** interaction
- **Status:** validated

## Mulligan

Drawing a fresh opening hand instead of keeping the one you drew. Commander uses
the **London mulligan**: draw seven each time, and on keeping, put one card on the
bottom per mulligan taken. The goldfishing engine models this with a keep heuristic.

- **Aliases:** London mulligan
- **Status:** validated

## Opening hand

The cards a player keeps to start the game, after any mulligans. Its land count is
the main signal the goldfishing engine reports (`mana screw`, `mana flood`).

- **Status:** validated

## Phase

One step of a turn. A turn runs untap, upkeep, draw, first main, combat (its own
steps: begin, declare attackers, declare blockers, damage, end), second main, end,
cleanup. In `play mode` the player advances through phases with space; the engine
owns the actual phase machine.

- **Aliases:** step
- **Status:** validated

## Priority

The right to act — to cast or activate — which passes around the table within a
phase. Passing priority is how a turn moves forward; a player holding priority may
respond to what is on the `stack`. This is the model behind "the AI responds to
your actions": when you pass, opponents get priority and may act.

- **Status:** validated

## Stack

Where spells and abilities wait to resolve, last in first out, while players get
`priority` to respond. It is not one of the six `zones`. The `board` shows it so a
watcher can see what is about to happen.

- **Status:** validated

## Combat

The part of a turn where creatures attack and are blocked and deal damage. Its
decisions — declare attackers, declare blockers, assign damage — are among the
`decision requests` the engine puts to a seat, and where `commander damage` is dealt.

- **Status:** validated

## phase-rs

The external rules-and-AI engine this project is built on — a Rust engine compiled
to WebAssembly that runs both the full MTG rules and its AI opponents in the
browser. We embed it and do not modify it (`ADR-0001`, `ADR-0002`); it is a
dependency, not a subject. Its alpha status is why `TDR-0001` and `TDR-0002` exist.

- **Aliases:** the engine
- **Status:** validated
- **Example:** [phase-rs.dev](https://phase-rs.dev) is its live client; we consume the same WASM module behind our own front-end.

## Play mode

The interaction where the human pilots their own seat — advancing phases with
space, declaring attacks, responding as opponents act — while the engine's AI runs
the other seats. Chosen against `watch mode` by a toggle before the game starts
(`ADR-0005`).

- **Status:** validated

## Watch mode

The interaction where the engine's AI pilots **every** seat, including yours, and
the human only observes the game play out on the `board`. This is what makes a
`run` a hands-off strength measurement. Chosen against `play mode` by the pre-game
toggle (`ADR-0005`).

- **Aliases:** auto-play
- **Status:** validated

## Match

One game, played to completion. A `run` is a sequence of matches over the same
decks.

- **Aliases:** game
- **Status:** validated

## Run

A batch of 1–50 `matches` over the same decks, played sequentially in real time
and rendered on the `board`, whose results `analysis` turns into a win rate
(`ADR-0005`). The cap is 50.

- **Aliases:** batch
- **Status:** validated
