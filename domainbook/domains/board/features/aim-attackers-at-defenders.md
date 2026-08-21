---
id: aim-attackers-at-defenders
name: Aim attackers at defenders
status: implemented
---

## Story

As a player declaring attackers in a pod
I want to see, per attacker, which opponent it is aimed at before I commit
So that I can split my attack across players without guessing who gets hit

## Rule: Declared attackers are highlighted, and the focused one stands out

```gherkin
Example: Focusing an attacker to aim it
  Given it is your combat with more than one opponent to attack
  When you click one of your highlighted creatures
  Then it is declared as an attacker and focused for aiming
  And clicking the focused attacker again removes it from combat
```

## Rule: Each opponent has an identity color, so same-named seats stay distinct

Opponents in a pod are often the same deck and commander, so their names read
identically. Each seat carries a fixed identity color on its board name, and the
attacker's target badge and the summary reuse that same color — so "who is this
attacker aimed at" is answered by color, not by a name that repeats.

```gherkin
Example: Telling three identically-named opponents apart
  Given a pod where every opponent shows the same deck name
  Then each opponent's name is drawn in its own identity color
  And an attacker aimed at one shows that opponent's color on its badge and summary row
```

## Rule: Each declared attacker shows the opponent it is aimed at

```gherkin
Example: A target badge on the attacker
  Given you have declared an attacker in a pod
  When you look at that creature on the board
  Then a badge on the card names the opponent it will attack

Example: Re-aiming the focused attacker
  Given a focused attacker and more than one opponent to attack
  When you click a highlighted opponent
  Then only the focused attacker is re-aimed at that opponent
  And the other attackers keep their own targets
```

## Rule: A summary lists every attacker and its defender before you confirm

```gherkin
Example: Reviewing the assignments
  Given you have declared attackers across two opponents
  When you look at the attack controls
  Then each attacker is listed with the opponent it is aimed at
  And the focused attacker's row is marked
  And you can confirm once the assignments read as you intend
```

## Rule: A single-defender game shows no aiming, only the plain toggle

```gherkin
Example: A duel keeps the simple flow
  Given it is your combat with a single opponent
  Then declared attackers carry no target badge or summary
  And clicking a creature just toggles it as an attacker
```

## Open Questions

- Whether attackers aimed at a planeswalker or battle (not a player) should carry
  their own badge, once those become attackable targets in play mode.
