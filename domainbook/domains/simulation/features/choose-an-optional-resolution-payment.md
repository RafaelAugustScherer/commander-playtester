---
id: choose-an-optional-resolution-payment
name: Choose an optional resolution payment
status: implemented
---

## Story

As a player piloting my seat
I want to choose whether — and how — to pay a "you may pay X or Y" cost that a
resolving spell or ability offers me
So that the decision is mine, not the AI's

## Rule: The choice appears in the play-controls panel on the human's seat

When the engine asks the human to resolve a `ResolutionOptionalPaymentChoice`
`decision request`, the play-controls panel lists one button per currently
payable cost branch plus a Decline button. Other seats resolve it by
`AI action proposal` as before.

```gherkin
Example: The choice appears when a resolving ability offers it
  Given a play-mode match where I control seat 0
  When a resolving spell or ability offers me an optional payment
  Then the panel lists a button for each payable branch and a Decline button
  And an opponent's optional payment is still decided by the AI
```

## Rule: Each branch is submitted by the engine's own branch index

The engine's `costs` list only carries the branches currently payable, each
tagged with its position in the ability's full cost list (`index`) — so a
branch filtered out for being unaffordable does not shift the others. Picking a
branch submits `ChooseResolutionOptionalPaymentBranch` with that same `index`;
Decline submits it with no index.

```gherkin
Example: Paying a branch
  Given the panel lists "Pay {2}" (index 0) and "Discard 1 card" (index 2)
  When I click "Discard 1 card"
  Then the engine receives a Pay choice for index 2

Example: Declining
  Given the panel lists at least one payable branch
  When I click Decline
  Then the engine receives a Decline choice
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole optional payment back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given the optional-payment buttons are shown
  When I choose let the AI decide
  Then the engine's AI picks a branch or declines
```

## Open Questions

- The `WaitingFor::ResolutionOptionalPaymentChoice` / `GameAction::
  ChooseResolutionOptionalPaymentBranch` shapes are confirmed against phase-rs
  `client/src/adapter/types.ts` and the merged upstream PR (phase-rs/phase#7995),
  not against a live card capture: as of the v0.71.0 pin, no shipped card's
  oracle text is parsed into a `PayCost(OneOf)` yet (upstream's own Phase 2/3
  follow-up, which wires real cards to it, had not merged). Re-verify the wire
  shape against a live capture once a real card reaches it.
- The branch cost label only formats the cost kinds seen in the engine's own
  test fixtures (`Mana`, `PayLife`, `Discard`, `Exile`, `Sacrifice`, `Tap`); any
  other `AbilityCost` variant falls back to its raw `type` name rather than a
  crafted sentence.
