---
id: choose-a-cost-reduction-order
name: Choose a cost reduction order
status: implemented
---

## Story

As a player piloting my seat
I want to choose how several cost reductions apply to my spell or ability
So that the total I pay is mine to decide, not the AI's

## Rule: The seat picks one of the engine's distinct totals

When the engine asks the human to resolve an `OrderCostReductions`
`decision request` — several cost reductions (or a hybrid cost announcement)
whose order changes the total (CR 601.2b, CR 601.2f) — the control panel lists
the reductions by name and offers one button per distinct total the engine
computed, cheapest first. Picking one submits `OrderCostReductions` with that
option's reduction `order` and `hybrid_announcement`, echoed back unchanged.
The client never computes a cost. Other seats resolve it by
`AI action proposal` as before.

```gherkin
Example: Choosing what to pay
  Given a play-mode match where I control seat 0
  When I cast a spell whose cost reductions give two different totals
  Then the control panel offers both totals
  And the engine locks in the one I pick
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the choice back to the engine's own AI, so the
decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a cost reduction order prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `OrderCostReductions` prompt and action shapes were confirmed against
  phase-rs v0.100.0 engine and client source, but not round-tripped live: the
  prompt needs competing reductions on one cast, which a headless probe game
  did not reach.
