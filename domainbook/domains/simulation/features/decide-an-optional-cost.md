---
id: decide-an-optional-cost
name: Decide an optional cost
status: implemented
---

## Story

As a player piloting my seat
I want to decide whether to pay a spell's optional cost (kicker, buyback, entwine…)
So that a choice that changes what mana I hold up is mine, not the AI's

## Rule: An optional-cost offer prompts the human on their own cast

When the engine asks the human to resolve an `OptionalCostChoice` `decision
request` — a "you may pay an additional cost" offer while casting — the seat's
control panel shows a pay/don't-pay prompt naming the spell. Other seats resolve
it by `AI action proposal` as before, and any non-`OptionalCostChoice` state is
untouched.

```gherkin
Example: The prompt appears on my own kicker spell
  Given a play-mode match where I control seat 0
  When I cast a spell that offers an optional cost
  Then the control panel asks whether to pay the additional cost, naming the spell
  And an opponent's optional-cost spell is still decided by the AI
```

## Rule: Pay and don't-pay submit the engine's yes/no answer

Choosing pay submits `DecideOptionalCost { pay: true }`; choosing don't-pay
submits `DecideOptionalCost { pay: false }`. For a repeatable cost that has
already been paid on this cast, the panel shows how many times so far, so a
multikicker-style "pay again?" offer reads clearly.

```gherkin
Example: Paying the cost
  Given the optional-cost prompt for my spell is shown
  When I choose pay
  Then the engine records the additional cost as paid

Example: A repeatable cost shows the running count
  Given a repeatable optional cost already paid once on this cast
  Then the prompt notes it has been paid once so far
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole optional-cost choice back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given the optional-cost prompt is shown
  When I choose let the AI decide
  Then the engine's AI decides whether to pay
```

## Open Questions

- The `OptionalCostChoice` shape (`cost: AdditionalCost`, `times_kicked`,
  `pending_cast`) and the `DecideOptionalCost { pay }` submission were confirmed
  against phase-rs `client/src/adapter/types.ts` and the reference client's
  `OptionalCostModal` at v0.71.0, but not yet round-tripped against a live cast.
  The panel names the spell and the running kick count rather than the exact
  mana of the additional cost, which the coarse `AdditionalCost` category does
  not carry uniformly; rendering the concrete cost is a follow-up.
