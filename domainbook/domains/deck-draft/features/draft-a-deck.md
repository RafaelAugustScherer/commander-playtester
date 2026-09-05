---
id: draft-a-deck
name: Draft a deck
status: implemented
---

## Story

As a deck author with an idea but not a full list
I want to seed a few cards and be offered synergistic cards to add, a few at a time
So that I can build a legal, measurable Commander deck without knowing the whole card pool

The draft opens from a **Draft a deck** entry in the `deck library`, beside the by-hand
editor. It produces the same `SavedDeck` the rest of the app already understands, so a
finished draft flows straight into `match setup`; an unfinished one is saved partial and
flagged (`deck-library/ADR-0002`).

## Rule: A draft starts from at least three base cards

The user enters three or more `base cards` to seed the theme. One may be flagged as the
`commander card`. Fewer than three is refused — three is the floor for a theme worth
ranking against.

```gherkin
Example: Three seed cards start a draft
  Given the author enters "Krenko, Mob Boss", "Goblin Chieftain" and "Skirk Prospector"
  And flags "Krenko, Mob Boss" as the commander
  When the author starts the draft
  Then the draft opens with those three cards in the deck
  And the color identity is fixed to red

Example: Fewer than three is refused
  Given the author has entered only two cards
  When the author tries to start the draft
  Then starting is refused and the three-card minimum is shown
```

## Rule: When the seed names no commander, the commander is chosen first

If none of the `base cards` is flagged commander, the first `suggestion round` offers
commander-eligible cards. Picking one sets the deck's `color identity` before any other
card is suggested.

```gherkin
Example: The first round picks a commander
  Given a draft seeded with three cards and no commander flagged
  When the draft opens
  Then the first round offers commander-eligible cards only
  And choosing one sets the deck's color identity
  And the next round's suggestions all fall within that identity
```

## Rule: Only candidates that can cover every base card's color identity are offered

When no `base card` is flagged commander, the first `suggestion round` offers only
commander-eligible candidates whose `color identity` is a superset of the union of every
base card's own color identity — the same subset rule that governs a legal Commander deck,
enforced up front instead of left to chance. A candidate that would leave some base card
outside the eventual commander's identity is never offered, in either direction.

The one exception is a **Background**: a legendary Background enchantment among the base
cards may pair with a candidate that has **Choose a Background**, unioning their two
identities to cover the base cards. This only applies when exactly one Background is among
the base cards — with more than one, pairing is ambiguous and every candidate falls back to
the solo-coverage rule.

```gherkin
Example: An off-color candidate is never offered
  Given base cards whose color identities union to green and blue only
  When the first round offers commander candidates
  Then no candidate has a color identity outside green and blue

Example: A Choose a Background candidate may cover with its Background
  Given base cards that include exactly one Background, blue
  And another base card is green
  When the first round offers commander candidates
  Then a green candidate with Choose a Background is offered
  And picking it makes both cards commanders, with their identities unioned
```

## Rule: The commander leads the ranking

Cards are ranked by `synergy score`, and `theme token`s from the `commander card` weigh
more than those from the other cards, so suggestions follow the commander's direction.

```gherkin
Example: Commander themes outrank equal non-commander themes
  Given a deck whose commander is an Elf and whose other cards include one Goblin
  When a round is suggested
  Then an Elf-tribal candidate ranks above a Goblin-tribal candidate of otherwise equal fit
```

## Rule: A round offers three cards, each refreshable, with no repeats in the round

Each `suggestion round` shows exactly three cards whenever at least three legal candidates
exist in the card database. Commander candidates are narrowed, scored, and ranked locally
before only the three selected cards are fetched for display. Any one can be refreshed on its
own, replaced by the closest remaining candidate that has not appeared in this round. Adding
a card ends the round.

```gherkin
Example: Refresh swaps one slot for a close, unseen card
  Given a round showing three suggestions
  When the author refreshes the middle card
  Then that slot shows a different card close to the one it replaced
  And no card shown earlier this round reappears

Example: Adding a card starts a fresh round
  Given a round showing three suggestions
  When the author adds one of them to the deck
  Then a new round is offered
  And a card is free to appear again in this new round

Example: Commander ranking produces a full round
  Given at least three legal commanders exist in the card database
  When the commander-selection round is suggested
  Then it shows exactly three legal commanders
```

## Rule: Suggestions stay legal and follow the bracket target

Every suggested card is within the commander's `color identity` and legal in Commander. A
selectable `bracket target` (default Focused) steers the ranking; a card that would push
the deck past the target is pushed down, not hidden.

```gherkin
Example: Out-of-identity cards are never offered
  Given a mono-red commander
  When any round is suggested
  Then no suggestion has a color identity outside red

Example: The bracket target shifts what is offered
  Given a draft with the bracket target set to Focused
  When the target is raised to cEDH
  Then higher-powered cards the previous target held back now rank up
```

## Rule: A draft can be left at any point with its deck kept

The user can stop at any time. The deck so far can be copied out as decklist text and
saved to the library. If it is not yet 100 cards it is saved as a partial deck — flagged,
and blocked from play (`deck-library/ADR-0002`).

```gherkin
Example: Leaving copies the partial deck out
  Given a draft with 40 cards chosen
  When the author copies the deck out
  Then the clipboard holds decklist text that parses back to the same 40 cards

Example: A partial draft saves flagged and unplayable
  Given a draft with 40 cards chosen
  When the author saves it to the library
  Then it appears flagged as partial
  And it cannot be selected to start a match
```

## Open Questions

- Whether a completed draft (exactly 100 cards) should offer to jump straight into
  `match setup`, or just land in the library like any saved deck.
- Whether to show the running archetype and bracket as live labels every round, or only on
  request, given each is an engine call.
