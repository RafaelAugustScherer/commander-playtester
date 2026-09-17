---
id: reveal-and-order-ripple
name: Reveal and order ripple
status: implemented
---

## Story

As a player piloting my seat
I want to decide whether ripple reveals my library's top cards, and in what
order the uncast ones go to the bottom
So that resolving ripple is mine to choose, not the AI's

## Rule: A ripple reveal offer is a plain reveal-or-decline choice

When the engine asks the human to resolve a `RippleRevealChoice`
`decision request` — the "you may reveal the top N cards of your library"
step of ripple (CR 702.60a) — the control panel offers two buttons: reveal the
top `count` cards, or decline. Revealing submits `RippleChoice { choice: Cast }`;
declining submits `RippleChoice { choice: Decline }`. Other seats resolve it by
`AI action proposal` as before.

```gherkin
Example: The reveal offer appears on my own ripple
  Given a play-mode match where I control seat 0
  When I cast a spell with ripple and may reveal the top cards
  Then the control panel offers to reveal or decline
  And an opponent's ripple is still decided by the AI
```

## Rule: The uncast revealed cards are ordered onto the bottom

After revealing and casting any same-named cards, a `RippleBottomOrder`
decision hands the seat the remaining cards to place on the bottom of the
library in any order. The panel lists each card by name and lets the seat move
them up and down; confirming submits `SelectCards { cards }` with the full
order, topmost first.

```gherkin
Example: Ordering the leftover cards
  Given a ripple bottom-order prompt with three uncast cards
  When I arrange them and confirm
  Then the engine receives that order for the bottom of my library
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole reveal-or-order choice back to the
engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a ripple reveal or bottom-order prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `RippleRevealChoice` / `RippleBottomOrder` shapes and the
  `RippleChoice` / `SelectCards` submissions were confirmed against phase-rs
  `client/src/adapter/types.ts` (RippleRevealChoiceModal, RippleBottomOrder
  Modal) at v0.86.0, but not yet round-tripped against a live ripple effect.
