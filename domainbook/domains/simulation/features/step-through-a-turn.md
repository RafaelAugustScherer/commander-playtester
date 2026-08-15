---
id: step-through-a-turn
name: Step through a turn
status: draft
---

## Story

As a player
I want to advance my turn phase by phase with space, with the AI acting in between
So that I pilot my deck at my own pace and see opponents respond

## Rule: Space advances to the next stop; the human only decides where a decision is required

```gherkin
Example: Space moves past an empty phase
  Given it is the player's main phase with nothing they must decide
  When the player presses space
  Then the turn advances to the next stop
  And the player is not prompted to pass priority repeatedly
```

## Rule: The AI gets priority when the human passes and may respond

```gherkin
Example: An opponent responds to a spell
  Given the player casts a creature and passes priority
  When an opponent holds an answer
  Then the opponent may act before the creature resolves
```

## Rule: An illegal move is rejected, not applied

```gherkin
Example: The engine refuses an illegal play
  Given the player attempts a move the rules do not allow
  When it is submitted
  Then the engine rejects it and the board is unchanged
```

## Open Questions

- Whether play and watch share one driver with the human as a swappable controller.
