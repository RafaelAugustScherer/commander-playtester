---
id: choose-coin-flips-and-life-redistribution
name: Choose coin-flip results and life redistribution
status: implemented
---

## Story

As a player piloting my seat
I want to pick which coin-flip results to keep and which life-redistribution
option to apply
So that those outcomes are mine to choose, not the AI's

## Rule: A coin-flip prompt shows every result and how many to keep

When the engine asks the human to resolve a `CoinFlipKeepChoice`
`decision request` — offered whenever an effect flips several coins and the
seat keeps a subset of the results — the control panel lists each flip as
heads or tails and lets the seat toggle which ones to keep, up to
`keep_count`. Other seats resolve it by `AI action proposal` as before, and
any non-`CoinFlipKeepChoice` state is untouched.

```gherkin
Example: The prompt appears on my own coin flips
  Given a play-mode match where I control seat 0
  When an effect flips three coins and I keep two of them
  Then the control panel lists all three results as heads or tails
  And an opponent's coin flip is still decided by the AI
```

## Rule: Confirm is disabled until exactly keep_count results are picked

The seat toggles individual results on and off; the confirm button stays
disabled until exactly `keep_count` are selected, then submits
`SelectCoinFlips { keep_indices }` with the indices (into `results`) that
were kept.

```gherkin
Example: Keeping the right number of results
  Given a coin-flip prompt asking to keep 2 of 3 results
  When I toggle exactly two results and confirm
  Then the engine receives those two indices as the kept flips
```

## Rule: A life-redistribution prompt lists each option's outcome

A `RedistributeLifeTotals` decision (an effect like Repercussion or Sword of
the Meek's Metalcraft trigger that redistributes life among seats) offers a
fixed set of `options`, each a complete new assignment of life totals across
seats. The panel lists every option as a button naming the resulting life
total per seat (the human's own seat labeled "You", others "Seat N").

```gherkin
Example: Picking a life-redistribution option
  Given a life-redistribution prompt with two options
  When I click one of the listed options
  Then the engine receives that option's index as the chosen redistribution
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole coin-flip-keep or
life-redistribution choice back to the engine's own AI, so the decision is
never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a coin-flip or life-redistribution prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `CoinFlipKeepChoice` and `RedistributeLifeTotals` shapes, and the
  `SelectCoinFlips` / `SubmitLifeRedistribution` submissions, were confirmed
  against phase-rs `client/src/adapter/types.ts`
  (CoinFlipKeepModal, LifeRedistributionModal) at v0.71.0, but not yet
  round-tripped against a live coin-flip or life-redistribution effect.
