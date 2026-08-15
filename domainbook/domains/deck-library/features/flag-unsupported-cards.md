---
id: flag-unsupported-cards
name: Flag unsupported cards
status: draft
---

## Story

As a deck author
I want cards the engine cannot play flagged while I build a deck
So that I know before a game which cards will not work

## Rule: Every card is checked against the engine's implemented set at authoring time

```gherkin
Example: Coverage is shown for the deck
  Given a 99-card deck where 11 cards are not implemented by the engine
  When the author views the deck
  Then the deck shows 88 of 99 supported
  And the 11 unsupported cards are listed
```

## Rule: Unsupported cards are surfaced before use, never first at game start

```gherkin
Example: Setup surfaces unsupported cards, not the game
  Given a deck with unsupported cards
  When the author selects it in match setup
  Then its unsupported cards are surfaced there
  And no unsupported card is first discovered mid-match
```

## Open Questions

- Whether a deck with any unsupported card is blocked from a run or allowed with
  those cards absent.
