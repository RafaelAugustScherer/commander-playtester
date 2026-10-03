---
id: choose-a-jace-to-empower
name: Choose a Jace to empower
status: implemented
---

## Story

As a player piloting my seat
I want to pick which of my Jace planeswalker tokens an empower effect grows
So that "empower Jace" is mine to resolve, not the AI's

## Rule: The seat picks exactly one offered Jace token

When the engine asks the human to resolve an `EmpowerJaceChoice`
`decision request` — "empower Jace N" while the seat controls two or more Jace
planeswalker tokens (CR 701.71a) — the control panel lists each candidate token
the engine offered and states how many loyalty counters it gets. Picking one
submits `SelectCards { cards: [id] }`. The client never computes which tokens
are eligible; the engine supplies the candidates. Other seats resolve it by
`AI action proposal` as before.

```gherkin
Example: Empowering one of my Jace tokens
  Given a play-mode match where I control seat 0 and two Jace tokens
  When I empower Jace
  Then the control panel lists both tokens
  And the token I pick gets the loyalty counters
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the choice back to the engine's own AI, so the
decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given an empower Jace prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `EmpowerJaceChoice` shape and its `SelectCards` submission were
  confirmed against phase-rs v0.100.0 engine and client source, but not
  round-tripped live: the prompt needs two Jace tokens at once, which a
  headless probe game did not reach.
