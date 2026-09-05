---
id: choose-x-on-an-x-spell
name: Choose X on an X spell or ability
status: implemented
---

## Story

As a player piloting my seat
I want to pick X's value myself when I cast an X spell or activate an X ability
So that a choice that decides my spell's power and cost is mine, not the AI's

## Rule: An X choice prompts the human on their own cast or activation

When the engine asks the human to resolve a `ChooseXValue` decision request —
casting an X spell or activating an X ability that needs a value for X before
the cost is paid — the seat's control panel shows a numeric picker naming the
source. Other seats resolve it by AI action proposal as before, and any
non-`ChooseXValue` state is untouched.

```gherkin
Example: The prompt appears on my own X spell
  Given a play-mode match where I control seat 0
  When I cast a spell that asks me to choose X
  Then the control panel asks me to pick a value for X, naming the spell
  And an opponent's X spell is still decided by the AI
```

## Rule: The value is bounded to the engine's allowed range

The picker only accepts an integer between the engine's `min` (0 when the
engine does not send one) and `max`. Confirm is disabled outside that range,
so the seat can never submit an X value the engine would reject.

```gherkin
Example: The value is clamped to the allowed range
  Given the choose-X prompt for my spell shows a range of 0 to 6
  When I type a value outside that range
  Then the picker clamps it back into range
  And Confirm stays disabled until the value is a whole number in range
```

## Rule: Confirm submits the chosen X, and the choice can be handed to the AI

Confirm submits `ChooseX { value }` with the picked number. Choosing let the
AI decide hands the whole X choice back to the engine's own AI, so the
decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Confirming a value for X
  Given the choose-X prompt for my spell is shown
  When I type 3 and confirm
  Then the engine casts the spell with X equal to 3

Example: Letting the AI decide
  Given the choose-X prompt is shown
  When I choose let the AI decide
  Then the engine's AI decides the value of X
```

## Open Questions

- The `ChooseXValue` shape (`min?`, `max`, `pending_cast`, `x_cost_previews?`)
  and the `ChooseX { value }` submission were confirmed against phase-rs
  `client/src/adapter/types.ts` at v0.71.0, but not yet round-tripped against
  a live cast. The panel does not yet surface `x_cost_previews` (the mana
  each candidate X would cost) — showing that alongside the picker is a
  follow-up.
