---
id: decide-the-opening-mulligan
name: Decide the opening mulligan
status: implemented
---

## Story

As a player piloting my seat
I want to decide my own opening hand — keep or mulligan, then which cards to bottom
So that I start the game from a hand I chose, not one the AI kept for me

## Rule: The game opens with a mulligan popup on the human's seat

The engine's first `decision request` in `play mode` is a `MulliganDecision`. It is
routed to the human as a popup that shows the opening hand; other seats decide by
`AI action proposal` as before.

```gherkin
Example: The popup appears before the first turn
  Given a play-mode match has just started
  When the engine asks for the opening mulligan
  Then a popup shows my seven-card hand with Keep and Mulligan
  And the opponents' mulligans are decided by the AI
```

## Rule: The first mulligan is free; each further mulligan keeps one card fewer

Commander grants a free first mulligan. Keeping after N mulligans bottoms
`max(0, N - 1)` cards (London mulligan), so the kept hand shrinks only from the
second mulligan on.

```gherkin
Example: The free first mulligan keeps seven
  Given I have taken no mulligans
  When I take my first (free) mulligan and then keep
  Then I keep all seven cards

Example: A later mulligan reduces the kept hand
  Given I have already taken one mulligan
  When I mulligan again and then keep
  Then I keep six cards, then five, and so on for each further mulligan
```

## Rule: On a keep that owes cards, I choose which to put on the bottom

```gherkin
Example: Bottoming the owed cards
  Given keeping now owes one or more cards to the bottom
  When I keep
  Then the popup asks me to select exactly that many cards
  And confirming puts them on the bottom of my library and keeps the rest
```

## Rule: The mulligan can be handed to the AI

```gherkin
Example: Letting the AI decide
  Given the opening mulligan popup is shown
  When I choose let the AI decide
  Then the engine's own AI resolves my keep, mulligan, and bottoming
```

## Open Questions

- Whether to suggest which cards to bottom (e.g. the AI's pick) rather than
  leaving the whole selection to the player.
