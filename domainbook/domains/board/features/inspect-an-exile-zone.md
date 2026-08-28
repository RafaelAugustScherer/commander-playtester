---
id: inspect-an-exile-zone
name: Inspect an exile zone
status: implemented
---

## Story

As a player
I want to open any seat's exile zone and read the cards in it
So that I can check what has been exiled without leaving the board

## Rule: The exile count is a button when the exile zone is not empty

```gherkin
Example: A filled exile zone invites a click
  Given a seat with at least one exiled card
  When I look at that seat's zone counts
  Then the exile count is a button
  And clicking it opens that seat's exile zone

Example: An empty exile zone is just a number
  Given a seat with no exiled cards
  Then its exile count is plain text, not a button
```

## Rule: Each seat sees only its own cards, split from the engine's one shared zone

```gherkin
Example: Exile is one zone, shown per seat
  Given the engine tracks exile as a single shared zone
  When the board projects it
  Then each seat's exile count and window show only the cards that seat owns
```

## Rule: The exile zone opens in a floating window, same as the graveyard

```gherkin
Example: One row of cards, titled by owner
  Given I open a seat's exile zone
  Then a floating window shows the exiled cards in a single row
  And the window is titled with the seat's name
  And a row wider than the window scrolls sideways

Example: Move it out of the way
  Given the exile window is open
  When I hold its title bar and drag
  Then the window follows the pointer and stays within the screen

Example: Dismiss it
  Given the exile window is open
  When I click its close button or press Escape
  Then the window disappears

Example: Read a card up close
  Given the exile window is open
  When I hover a card in it
  Then an enlarged preview of that card is shown, above the window
```

## Rule: Exiled cards are shown untapped

```gherkin
Example: A creature that was tapped when it left the battlefield lies flat in exile
  Given a card that was tapped when it was exiled
  When I view it in the exile window
  Then it is drawn upright, not rotated
```

## Open Questions

None.
