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

Example: Choosing which cards to discard
  Given an effect (or the end-of-turn hand-size rule) makes you discard
  When the engine asks you to discard
  Then a popup shows the eligible cards, previewable like your hand
  And you pick exactly the required number to discard, or let the AI choose
```

## Rule: Creatures with defender are never offered as attackers

The engine lists creatures with defender as legal attackers regardless of the
keyword, so we drop them when building the prompt. This also hides the rare case
of a defender granted the ability to attack (`TDR-0003`).

```gherkin
Example: A defender wall is not declarable as an attacker
  Given it is your combat and you control a creature with defender
  When the engine asks you to declare attackers
  Then that creature is not offered as an attacker
  And only creatures without defender can be declared
```

## Rule: The engine gives each attacker its own legal targets, so an attack can be split

The engine reports the legal targets per attacker, not one shared list, and we echo
the chosen ref straight back per attacker — so different attackers can be declared
against different opponents in a pod. Choosing and reviewing those targets is the
board's job (`domains/board/features/aim-attackers-at-defenders.md`).

```gherkin
Example: Two attackers declared at two different opponents
  Given it is your combat with two opponents you could attack
  When you declare two attackers, one aimed at each opponent
  Then the submitted declaration pairs each attacker with its own defender
```

## Rule: You put cards into play by dragging or tapping from hand, or clicking the commander in its zone

```gherkin
Example: Playing a card from your hand
  Given it is your main phase and a hand card has a legal play
  When you drag it onto a matching battlefield slot
  Then the card is played and its cost is paid

Example: Playing a card by tapping (touch)
  Given it is your main phase and a hand card has a legal play
  When you tap the card and then tap a matching battlefield slot
  Then the card is played and its cost is paid
  And tapping the card again instead clears the selection

Example: Casting your commander from the command zone
  Given it is your main phase and you can pay for your commander
  Then the commander is highlighted as castable in the command zone
  And clicking it casts the commander from the command zone onto the stack
```

## Rule: You put a ninja in with ninjutsu by choosing the ninja, then the attacker it swaps in for

Ninjutsu (and commander ninjutsu) can be used during your combat once an
unblocked attacker exists. Each playable ninja is highlighted where it waits — a
ninja card in hand, or your commander in the command zone for commander
ninjutsu. You choose the ninja, then which unblocked attacker returns to hand in
its place; the ninja enters tapped and attacking. When only one attacker could
be returned, choosing the ninja resolves it in one step.

```gherkin
Example: Commander ninjutsu from the command zone
  Given it is your combat and an attacker you control is unblocked
  And you can pay the commander ninjutsu cost
  Then your commander is highlighted in the command zone as playable via ninjutsu
  When you choose it and then an unblocked attacker
  Then that attacker returns to your hand
  And the commander enters the battlefield tapped and attacking

Example: Ninjutsu from your hand
  Given it is your combat, a ninja is in your hand, and an attacker is unblocked
  When you choose the ninja and then the attacker to return
  Then the attacker returns to your hand
  And the ninja enters the battlefield tapped and attacking
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
