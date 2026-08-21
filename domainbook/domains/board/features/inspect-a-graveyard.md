---
id: inspect-a-graveyard
name: Inspect a graveyard
status: implemented
---

## Story

As a player
I want to open any seat's graveyard and read the cards in it
So that I can check what has died or been discarded without leaving the board

## Rule: The graveyard count is a button when the graveyard is not empty

```gherkin
Example: A filled graveyard invites a click
  Given a seat whose graveyard has at least one card
  When I look at that seat's zone counts
  Then the graveyard count is a button
  And clicking it opens that seat's graveyard

Example: An empty graveyard is just a number
  Given a seat with an empty graveyard
  Then its graveyard count is plain text, not a button
```

## Rule: The graveyard opens in a floating window

```gherkin
Example: One row of cards, titled by owner
  Given I open a seat's graveyard
  Then a floating window shows the graveyard's cards in a single row
  And the window is titled with the seat's name
  And a row wider than the window scrolls sideways

Example: Move it out of the way
  Given the graveyard window is open
  When I hold its title bar and drag
  Then the window follows the pointer and stays within the screen

Example: Dismiss it
  Given the graveyard window is open
  When I click its close button or press Escape
  Then the window disappears
```

## Rule: Graveyard cards are shown untapped

```gherkin
Example: A creature that died tapped lies flat in the graveyard
  Given a card that was tapped when it left the battlefield
  When I view it in the graveyard window
  Then it is drawn upright, not rotated
```

## Open Questions

None.
