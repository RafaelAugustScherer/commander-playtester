---
id: assign-combat-damage
name: Assign combat damage order/split among multiple blockers or attackers
status: implemented
---

## Story

As a player piloting my seat
I want to choose how my attacker splits damage across multiple blockers
(and any trample spillover), and how my blocker splits its damage across
multiple attackers
So that these damage assignments are mine to choose, not the AI's

## Rule: An attacker must give each blocker at least its lethal minimum before anything spills over

When the engine asks the human to resolve an `AssignCombatDamage` `decision
request` for an attacker facing multiple blockers, the control panel starts
each blocker at its `lethal_minimum` and shows a per-blocker stepper (its
lower bound is that blocker's lethal minimum, so it can never drop below
what is needed to kill it). Without trample, every point of damage must
land on a blocker; with trample, any amount left over past every blocker's
minimum is shown as a read-only spillover line and is submitted as
trample damage automatically.

```gherkin
Example: A trampling attacker splits lethal damage and tramples the rest
  Given an AssignCombatDamage prompt for 6 damage from a trampling attacker across two blockers needing 2 and 3
  When I leave both blockers at their minimum
  Then the tramples-over line reads 1
  And confirming sends AssignCombatDamage with assignments [[blocker1, 2], [blocker2, 3]] and trample_damage 1
```

## Rule: Trample spills to the defending player, or to a planeswalker's controller when that is the attack target

The engine tells the client whether the attack target is a planeswalker
(`pw_loyalty`/`pw_controller` present on the prompt) or the defending
player directly. Spillover damage is routed accordingly: `controller_damage`
when the target is a planeswalker, `trample_damage` otherwise.

```gherkin
Example: Trampling over a planeswalker
  Given an AssignCombatDamage prompt whose attack target is a planeswalker
  When damage spills over past the blocker's lethal minimum
  Then confirming sends that spillover as controller_damage, not trample_damage
```

## Rule: Without trample, all of an attacker's damage must land on its blockers

When the attacker has no trample, the panel shows a running "assigned"
count against the total and Confirm stays disabled until every point of
damage is accounted for across the blockers.

```gherkin
Example: A non-trampling attacker must assign all its damage
  Given an AssignCombatDamage prompt for 5 damage from a non-trampling attacker across one blocker needing 2
  When I raise that blocker's assignment to 5
  Then the assigned count reads 5 of 5 and Confirm is enabled
```

## Rule: A blocker facing multiple attackers freely splits its damage among them

An `AssignBlockerDamage` decision offers a stepper per attacker, starting
every attacker at 0; Confirm stays disabled until the assigned amounts sum
to the blocker's total damage.

```gherkin
Example: A blocked-by-two creature splits its damage
  Given an AssignBlockerDamage prompt for 4 damage across two attackers
  When I assign 1 to the first attacker and 3 to the second
  Then confirming sends AssignBlockerDamage with assignments [[attacker1, 1], [attacker2, 3]]
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole combat-damage assignment back
to the engine's own AI, so the decision is never stuck
(`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given an attacker or blocker damage-assignment prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that assignment
```

## Open Questions

- The `AssignCombatDamage` and `AssignBlockerDamage` shapes, and their
  matching submissions, were confirmed against the phase-rs v0.71.0
  client's type surface but not yet round-tripped against a live combat
  with multiple blockers or attackers.
- When an attacker's blockers' combined lethal minimums exceed its total
  damage (a lethal-minimum figure that can no longer be fully met — for
  example after some of the assigned damage is prevented), the panel seeds
  a best-effort initial split rather than rejecting the prompt; Confirm
  simply stays disabled until the human (or the AI fallback) resolves it.
