---
id: step-through-a-turn
name: Step through a turn
status: implemented
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

## Rule: You decide only where the engine asks, and any such choice can be handed to the AI

```gherkin
Example: Declaring attackers on your combat
  Given it is your combat and you control a creature that can attack
  When the engine asks you to declare attackers
  Then you choose which creatures attack and whom
  And you may instead let the AI declare for you

Example: Paying with a specific source
  Given you cast a spell and more than one source could pay for it
  When the engine asks how to pay
  Then you choose which land or color to tap
  And unspent mana is held as a reserve shown beside your life

Example: Naming a creature type
  Given a card you play asks you to name a creature type
  When the engine asks for the type
  Then you pick one from the valid types, pre-selected with the AI's suggestion
  And you may instead let the AI choose for you
```

## Rule: You put cards into play by dragging from hand, or clicking the commander in its zone

```gherkin
Example: Playing a card from your hand
  Given it is your main phase and a hand card has a legal play
  When you drag it onto a matching battlefield slot
  Then the card is played and its cost is paid

Example: Casting your commander from the command zone
  Given it is your main phase and you can pay for your commander
  Then the commander is highlighted as castable in the command zone
  And clicking it casts the commander from the command zone onto the stack
```

## Rule: Pass turn advances your own turn and stops when an opponent acts

```gherkin
Example: Passing skips to the end of your turn
  Given it is your turn
  When you choose pass turn (Enter)
  Then your remaining phases advance without prompting you
  And your combat is skipped with no attackers

Example: An opponent acting pauses the pass
  Given you are passing your turn
  When an opponent puts something on the stack
  Then the pass stops and control returns to you
```

## Open Questions

- Whether play and watch share one driver with the human as a swappable controller.
