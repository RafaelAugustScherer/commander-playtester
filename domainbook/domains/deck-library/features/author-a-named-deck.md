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
Example: A deck that isn't exactly 100 cards can't be saved
  Given a decklist with 99 cards (or any count other than 100)
  When the author looks at the editor
  Then saving is refused and the count is flagged with the 100-card rule
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
  engine as the arbiter for those (only the exact-100 count is enforced here).
