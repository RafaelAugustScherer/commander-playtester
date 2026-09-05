---
id: pay-ward-and-unless-costs
name: Pay Ward and unless costs
status: implemented
---

## Story

As a player piloting my seat
I want to choose which card, permanent, or cost to give up when a Ward
triggers or a spell offers me a way out with "unless"
So that those trade-offs are mine to make, not the AI's

## Rule: Ward discard and unless bounce pick a single card or permanent

When the engine asks the human to resolve a `WardDiscardChoice` or
`UnlessBounceChoice` decision request — a Ward that costs a discard, or a
spell that lets its controller keep a permanent by returning it to hand —
the control panel lists every offered card or permanent and submits the
choice as soon as one is clicked. Other seats still resolve these by AI
action proposal, and any non-matching state is untouched.

```gherkin
Example: Paying a Ward by discarding
  Given a Ward discard prompt offers Cancel and Lightning Bolt from my hand
  When I click Lightning Bolt
  Then the engine receives SelectCards with Lightning Bolt's id
```

## Rule: Ward sacrifice picks one permanent, or several until a power threshold is met

A `WardSacrificeChoice` decision either asks for a single permanent
(`min_total_power` is absent or null) or, when a `min_total_power` is set,
lets the player toggle any number of the offered permanents until their
summed power meets or exceeds that threshold. The single-pick case behaves
like Ward discard and unless bounce — one click submits the choice; the
threshold case shows a running power total and disables Confirm until it is
met.

```gherkin
Example: Sacrificing to meet a power threshold
  Given a Ward sacrifice prompt asks for 4 power, offering two 2-power creatures
  When I select both creatures
  Then the selected power reads 4 of 4 and Confirm is enabled
  And confirming sends SelectCards with both permanents' ids
```

## Rule: Unless payment picks which cost to pay, or declines all of them

An `UnlessPaymentChooseCost` decision offers a list of alternative costs —
paying life, discarding a card, sacrificing permanents, returning permanents
to hand, or paying mana — for the same "unless" effect. The panel shows one
button per cost, labeled for its kind (and quantity, where the cost carries
one), plus a "Don't pay" option that declines every cost and lets the
effect resolve unpaid.

```gherkin
Example: Choosing which unless cost to pay
  Given an unless prompt offers "Pay 5 life" and "Discard a card"
  When I click "Discard a card"
  Then the engine receives ChooseUnlessCostBranch with a Pay choice at that cost's index

Example: Declining every unless cost
  Given an unless prompt is shown
  When I click "Don't pay"
  Then the engine receives ChooseUnlessCostBranch with a Decline choice
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole Ward or unless choice back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a Ward or unless prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `WardDiscardChoice`, `WardSacrificeChoice`, `UnlessBounceChoice`, and
  `UnlessPaymentChooseCost` shapes, and the `SelectCards` /
  `ChooseUnlessCostBranch` submissions, were confirmed against phase-rs's
  vendored WASM and reference client `gameStateView` at v0.71.0, but not yet
  round-tripped against a live Ward or "unless" effect.
