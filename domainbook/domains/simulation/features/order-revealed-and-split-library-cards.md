---
id: order-revealed-and-split-library-cards
name: Order revealed and split library cards
status: implemented
---

## Story

As a player piloting my seat
I want to order the cards a reveal-until effect bottoms, and split a dig's
leftover cards between the top and bottom of my library
So that where my library's cards go is mine to choose, not the AI's

## Rule: Reveal-until cards are ordered onto the bottom

When the engine asks the human to resolve a `RevealUntilBottomOrder`
`decision request` — a reveal-until effect that puts the revealed cards on the
bottom "in any order" (CR 701.20a, e.g. Erratic Mutation) — the control panel
lists every revealed card by name and lets the seat move them up and down.
Confirming submits `SelectCards { cards }` with the full order, topmost first.
Other seats resolve it by `AI action proposal` as before.

```gherkin
Example: Ordering revealed cards on the bottom
  Given a play-mode match where I control seat 0
  When my reveal-until effect bottoms two or more cards in any order
  Then the control panel lists them for me to order
  And the engine receives that order for the bottom of my library
```

## Rule: A dig's leftover cards are split between top and bottom

A `DigRestSplitChoice` `decision request` — a Telling Time-class dig that puts
some of the leftover cards on top of the library and the rest on the bottom
(CR 401.2, CR 701.20e) — shows the same ordered list, each card marked as
going on top (with its position) or to the bottom. The first `top_count` cards
go on top, topmost first; the rest go to the bottom in list order. Confirming
submits `SelectCards { cards }` with the whole arrangement. When the engine
marks the split as already decided (`scope` `order_only`, CR 401.4), the seat
may only reorder within the top and within the bottom; moves across the split
are disabled.

```gherkin
Example: Splitting Telling Time's leftovers
  Given a dig split prompt with one card for the top and one for the bottom
  When I put the card I want next on top and confirm
  Then that card is on top of my library and the other is on the bottom
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole ordering back to the engine's own
AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a reveal-until or dig split prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

None.
