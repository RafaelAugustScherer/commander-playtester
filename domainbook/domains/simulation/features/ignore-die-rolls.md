---
id: ignore-die-rolls
name: Ignore die rolls
status: implemented
---

## Story

As a player piloting my seat
I want to pick which of my dice rolls to ignore
So that "ignore the lowest roll" effects are mine to resolve, not the AI's

## Rule: A die-keep prompt shows every roll and enables only the ignorable ones

When the engine asks the human to resolve a `DieKeepChoice` `decision request`
— offered when an effect rolls several dice and the seat must ignore some
(CR 706.6, e.g. Barbarian Class or Wyll's "ignore the lowest roll") — the
control panel lists every natural result in roll order but enables only the
indices the engine marked `ignorable_indices`. The client never computes which
roll is lowest; the engine decides what may be ignored. Other seats resolve it
by `AI action proposal` as before, and any non-`DieKeepChoice` state is
untouched.

```gherkin
Example: The prompt appears on my own die rolls
  Given a play-mode match where I control seat 0
  When an effect rolls two dice and I must ignore one
  Then the control panel lists both results and enables only the ignorable ones
  And an opponent's die roll is still decided by the AI
```

## Rule: Confirm is disabled until exactly ignore_count rolls are picked

The seat toggles ignorable results on and off; the confirm button stays
disabled until exactly `ignore_count` are selected, then submits
`SelectDieRolls { ignore_indices }` with the indices (into `results`) to
ignore. Stacked ignore effects raise `ignore_count`, so the picks accumulate
until that many are chosen.

```gherkin
Example: Ignoring the right number of rolls
  Given a die-keep prompt asking to ignore 1 of 3 rolls
  When I toggle exactly one ignorable result and confirm
  Then the engine receives that index as the ignored roll
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole die-keep choice back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a die-keep prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `DieKeepChoice` shape and the `SelectDieRolls { ignore_indices }`
  submission were confirmed against phase-rs `client/src/adapter/types.ts`
  (DieKeepModal) at v0.86.0, but not yet round-tripped against a live
  ignore-the-lowest-roll effect.
