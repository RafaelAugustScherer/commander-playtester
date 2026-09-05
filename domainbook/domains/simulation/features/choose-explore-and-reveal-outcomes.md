---
id: choose-explore-and-reveal-outcomes
name: Choose explore and reveal-until outcomes
status: implemented
---

## Story

As a player piloting my seat
I want to pick which creature explores and whether to keep what a reveal-until effect finds
So that those outcomes are mine to choose, not the AI's

## Rule: An explore prompt lists the choosable creatures by name

When the engine asks the human to resolve an `ExploreChoice` `decision request`
— offered whenever one of the human's creatures may explore — the seat's
control panel names the source and lists the `choosable` creatures for the
seat to pick from. Other seats resolve it by `AI action proposal` as before,
and any non-`ExploreChoice` state is untouched.

```gherkin
Example: The prompt appears on my own explore trigger
  Given a play-mode match where I control seat 0
  When one of my creatures explores
  Then the control panel lists the choosable creatures by name
  And an opponent's explore trigger is still decided by the AI
```

## Rule: Picking a creature submits it directly

Clicking a listed creature submits `ChooseTarget { target: { Object: id } }`
for that creature immediately — there is no separate confirm step, since
exploring is always a single pick among `choosable`.

```gherkin
Example: Choosing which creature explores
  Given an explore prompt listing two choosable creatures
  When I click one of them
  Then the engine receives that creature as the chosen target
```

## Rule: A reveal-until-you-find prompt names the source and the found card

A `RevealUntilKeptChoice` (a "reveal cards until you find a land/creature/…"
effect) names both the ability's source and the `hit_card` it found, and asks
whether to keep it. The panel shows a primary button naming `accept_zone`
(where the card goes if kept) and a secondary button naming `decline_zone`
(where it goes if declined).

```gherkin
Example: Keeping the found card
  Given a reveal-until prompt found a land bound for the battlefield if kept, the graveyard otherwise
  When I choose to keep it
  Then the engine sends the found card to the battlefield

Example: Declining the found card
  Given the same reveal-until prompt
  When I choose not to keep it
  Then the engine sends the found card to the graveyard
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole explore or reveal-until choice
back to the engine's own AI, so the decision is never stuck
(`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given an explore or reveal-until prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `ExploreChoice` and `RevealUntilKeptChoice` shapes, and the
  `ChooseTarget` / `DecideOptionalEffect` submissions, were confirmed against
  phase-rs `client/src/adapter/types.ts` (TargetingOverlay,
  RevealUntilKeptChoiceModal) at v0.71.0, but not yet round-tripped against a
  live explore trigger or reveal-until effect.
