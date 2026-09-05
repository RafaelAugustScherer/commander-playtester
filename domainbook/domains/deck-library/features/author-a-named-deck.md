---
id: author-a-named-deck
name: Author a named deck
status: implemented
---

## Story

As a deck author
I want to type in a commander and its 99 cards and save the deck under a name
So that I can reuse it in later runs without entering it again

## Rule: A saved deck is a legal Commander deck

A deck must be one commander plus 99 other cards, every card unique except basic
lands (singleton), all within the commander's color identity.

```gherkin
Example: A legal deck is saved and reusable
  Given a commander and 99 cards within its color identity, all singleton
  When the author saves the deck as "Atraxa Superfriends"
  Then the deck appears in the library under that name
  And it can be chosen in match setup
```

```gherkin
Example: A duplicate nonland is rejected
  Given a deck that lists the same nonland card twice
  When the author tries to save it
  Then the save is refused for breaking singleton
  And the offending card is named
```

```gherkin
Example: A deck that isn't exactly 100 cards can still be saved, but flagged
  Given a decklist with 99 cards (or any count other than 100)
  When the author saves it
  Then the deck is saved and appears in the library flagged as partial
  And it cannot be chosen to start a match until it reaches 100 cards
```

Whether a saved deck is playable is derived from its card count, not stored
(`deck-library/ADR-0002`) — so a partial deck completed later becomes playable
with nothing to reconcile.

## Rule: A deck left unnamed takes its commander's name

The name field is optional. While it is empty it shows the commander's name as its
placeholder, and saving with it still empty adopts that commander name as the deck
name — so an imported or typed deck never has to be named by hand.

```gherkin
Example: Saving without typing a name
  Given a decklist whose Commander section names "Krenko, Mob Boss"
  And the author leaves the name field empty
  When the author saves the deck
  Then the deck is saved as "Krenko, Mob Boss"

Example: The name field previews the commander
  Given a decklist with a commander and an empty name field
  When the author looks at the name field
  Then its placeholder shows the commander's name
```

## Rule: The editor can hand its list to a deck draft

While editing, the author can start an assisted draft seeded from the cards currently in
the editor with **Draft from this deck**. The cards in the list become the draft's `base
cards` and the list's commander is pre-picked, so an existing or half-typed deck can be
grown through the `draft-a-deck` flow. The action is offered only once the list holds at
least three distinct cards — the draft's own floor.

```gherkin
Example: Drafting from the deck being edited
  Given the editor holds a commander and a handful of cards
  When the author chooses "Draft from this deck"
  Then a draft opens seeded with those cards
  And the list's commander is already picked
```

## Rule: A saved deck round-trips

```gherkin
Example: Reload yields the same list
  Given a saved named deck
  When the author reopens it later
  Then the card list is identical to what was saved
```

## Open Questions

- Whether to also block on singleton and color-identity at save, or keep the
  engine as the arbiter for those (only the card count is checked here, and
  since `deck-library/ADR-0002` that check flags rather than blocks).
