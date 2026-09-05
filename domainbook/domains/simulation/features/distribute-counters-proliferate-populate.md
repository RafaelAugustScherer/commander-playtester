---
id: distribute-counters-proliferate-populate
name: Distribute counters/damage/life, proliferate, and populate
status: implemented
---

## Story

As a player piloting my seat
I want to choose how to split counters, damage, or life among targets, which
permanents and players to proliferate, and which token a populate effect
copies
So that these distributions are mine to choose, not the AI's

## Rule: Distributing splits a total among targets, each getting at least one

When the engine asks the human to resolve a `DistributeAmong` `decision
request` — offered by an effect that splits counters, damage, or life among
several targets — the control panel starts every target at 1 (satisfying the
rule that each target gets at least one) and shows a running "assigned"
count against the total. Per-target steppers raise or lower each target's
share; Confirm stays disabled until the assigned amounts sum to the total,
then submits the whole distribution.

```gherkin
Example: Distributing +1/+1 counters between two creatures
  Given a DistributeAmong prompt for 3 +1/+1 counters across Elvish Mystic and Runeclaw Bear
  When I raise Elvish Mystic to 2 and leave Runeclaw Bear at 1
  Then the assigned count reads 3 of 3 and Confirm is enabled
  And confirming sends DistributeAmong with [[Elvish Mystic, 2], [Runeclaw Bear, 1]]
```

## Rule: Proliferate chooses any subset of the eligible permanents and players

A `ProliferateChoice` decision offers every eligible permanent and player as
a toggle; any subset — including none — may be chosen, and Confirm is
always enabled.

```gherkin
Example: Proliferating two permanents and skipping a player
  Given a ProliferateChoice prompt offering a Saproling token, Elvish Mystic, and my own player
  When I toggle on the Saproling token and Elvish Mystic only
  Then confirming sends SelectTargets with just those two targets
```

## Rule: Populate copies one token among the valid choices

A `PopulateChoice` decision lists every valid token; clicking one submits it
immediately as the token to copy.

```gherkin
Example: Populating a Saproling token
  Given a PopulateChoice prompt offering a Saproling token and an Elvish Mystic token
  When I click the Saproling token
  Then the engine receives ChooseTarget with the Saproling token's id
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole distribute, proliferate, or
populate choice back to the engine's own AI, so the decision is never stuck
(`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a distribute, proliferate, or populate prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `DistributeAmong`, `ProliferateChoice`, and `PopulateChoice` shapes,
  and the `DistributeAmong` / `SelectTargets` / `ChooseTarget` submissions,
  were confirmed against phase-rs's vendored WASM and reference client
  `DistributeAmongModal` / `ProliferateModal` / `TargetingOverlay` at
  v0.71.0, but not yet round-tripped against a live distribute, proliferate,
  or populate effect.
- Two rarer counter-move shapes surfaced by the same engine area —
  `MoveCountersDistribution` (moving existing counters between permanents)
  and `RemoveCountersChoice` (choosing which counters to remove) — are left
  to the AI as a deliberate second pass; the parser returns null for both.
