---
id: order-your-own-triggers
name: Order your own simultaneous triggers
status: implemented
---

## Story

As a player piloting my seat
I want to choose the order my own simultaneous triggers go on the stack
So that the sequencing of my triggers is mine to decide, not the AI's

## Rule: A simultaneous-trigger prompt appears on the human's own triggers

When two or more of the human's triggered abilities go on the stack at the
same time, the engine surfaces an `OrderTriggers` decision request naming
each pending trigger's source and description. The seat's control panel
shows the list for arranging; any other seat's simultaneous triggers are
still ordered by the AI, and non-`OrderTriggers` state is untouched.


```gherkin
Example: The prompt appears on my own simultaneous triggers
  Given a play-mode match where I control seat 0
  And two of my permanents trigger off the same event
  When the engine asks me to order the resulting triggers
  Then the control panel lists both triggers by source and description
  And an opponent's simultaneous triggers are still ordered by the AI
```

## Rule: The list starts in the engine's default order and can be rearranged

The panel starts with the identity order the engine sent (the array's own
order) and lets the seat move any entry up or down with ▲/▼ buttons — the
top entry's ▲ and the bottom entry's ▼ are disabled since there's nowhere
left to move. The top of the list is placed on the stack first, so it
resolves last; the panel says so.

```gherkin
Example: Rearranging the trigger order
  Given the order-triggers prompt shows two triggers in their default order
  When I move the second trigger to the top of the list
  Then the list now shows that trigger first
  And the panel still says the top of the list resolves last
```

## Rule: Confirm submits the arranged order, and the choice can be handed to the AI

Confirm submits `OrderTriggers { order }`, a permutation of the triggers'
original indices reflecting the seat's arrangement — the engine puts them on
the stack in that order. Choosing let the AI decide hands the whole ordering
back to the engine's own AI, so the decision is never stuck
(`simulation/ADR-0001`).

```gherkin
Example: Confirming a chosen order
  Given the order-triggers prompt shows triggers in positions [1, 0]
  When I confirm
  Then the engine puts trigger 1 on the stack first and trigger 0 second
  And trigger 0 resolves first

Example: Letting the AI decide
  Given the order-triggers prompt is shown
  When I choose let the AI decide
  Then the engine's AI decides the order
```

## Open Questions

- The `OrderTriggers` shape (`player`, `triggers: PendingTriggerSummary[]`
  with `source_id`/`source_name`/`description`) and the
  `OrderTriggers { order }` submission were confirmed against phase-rs
  `client/src/adapter/types.ts` and its `TriggerOrderModal` at v0.71.0, but
  not yet round-tripped against a live match with genuinely simultaneous
  triggers.
