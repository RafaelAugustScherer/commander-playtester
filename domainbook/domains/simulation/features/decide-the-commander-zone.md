---
id: decide-the-commander-zone
name: Decide the commander zone
status: implemented
---

## Story

As a player piloting my seat
I want to decide whether my commander goes to the command zone or stays where it landed
So that the replacement effect I built my deck around is mine to invoke, not the AI's

## Rule: A commander-zone offer prompts the human on their own commander

When the engine asks the human to resolve a `CommanderZoneChoice` `decision
request` — offered whenever the human's commander would change zones — the
seat's control panel shows a command-zone/leave-it prompt naming the commander
and the zone it would otherwise land in. Other seats resolve it by `AI action
proposal` as before, and any non-`CommanderZoneChoice` state is untouched.

```gherkin
Example: The prompt appears on my own commander's zone change
  Given a play-mode match where I control seat 0
  When my commander would move to the graveyard
  Then the control panel asks whether to send it to the command zone instead
  And an opponent's commander-zone choice is still decided by the AI
```

## Rule: Command zone and leave-it submit the engine's yes/no answer

Choosing command zone submits `DecideOptionalEffect { accept: true }`, sending
the commander to the command zone. Choosing leave it submits
`DecideOptionalEffect { accept: false }`, leaving the commander in the zone
the engine named (`current_zone`) — graveyard, exile, hand, and so on.

```gherkin
Example: Choosing the command zone
  Given the commander-zone prompt names the graveyard as the current zone
  When I choose the command zone
  Then the engine sends the commander to the command zone

Example: Leaving the commander in place
  Given the commander-zone prompt names the graveyard as the current zone
  When I choose to leave it there
  Then the commander stays in the graveyard
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole commander-zone choice back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given the commander-zone prompt is shown
  When I choose let the AI decide
  Then the engine's AI decides where the commander goes
```

## Open Questions

- The `CommanderZoneChoice` shape (`commander_id`, `current_zone`) and the
  `DecideOptionalEffect { accept }` submission were confirmed against phase-rs
  `client/src/adapter/types.ts` at v0.71.0, but not yet round-tripped against a
  live cast. The panel title-cases the raw `current_zone` string for display
  rather than localizing every possible zone name; a future pass can map the
  full zone vocabulary to friendly, localized words if this proves confusing.
