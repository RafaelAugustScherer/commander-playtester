---
id: place-scry-and-surveil-cards
name: Place scry and surveil cards
status: implemented
---

## Story

As a player piloting my seat
I want to see the cards I scry or surveil and place each one myself
So that I decide what stays on top rather than letting the AI resolve it unseen

## Rule: Scrying or surveilling opens a window on the human's seat

When the engine asks the human to resolve a `ScryChoice` or `SurveilChoice`
`decision request`, a floating window (the same style as the graveyard inspector)
shows the looked-at cards, top of library first. Other seats resolve it by
`AI action proposal` as before.

```gherkin
Example: The window appears when I scry
  Given a play-mode match where I control seat 0
  When an effect makes me scry
  Then a window shows the top cards I am looking at
  And the opponents' scries are still decided by the AI
```

## Rule: I place each card one at a time

The window shows one card at a time with two destination buttons. Scry offers
Keep on top / Put on bottom; surveil offers Keep on top / Put into graveyard.
After the last card is placed the decision is submitted: the kept cards stay on
top in the order shown (topmost first), and the rest go to the bottom of the
library (scry) or to the graveyard (surveil).

```gherkin
Example: Keeping a scried card on top
  Given the scry window shows a card
  When I choose Keep on top
  Then that card stays on top of my library

Example: Bottoming a scried card
  Given the scry window shows a card
  When I choose Put on bottom
  Then that card moves to the bottom of my library

Example: Binning a surveilled card
  Given the surveil window shows a card
  When I choose Put into graveyard
  Then that card goes to my graveyard
```

## Rule: The placement can be handed to the AI

Closing the window (its close button or Escape) or choosing let the AI decide
hands the whole scry/surveil back to the engine's own AI, so the decision is
never stuck.

```gherkin
Example: Letting the AI decide
  Given the scry or surveil window is shown
  When I choose let the AI decide
  Then the engine's AI resolves the placement
```

## Open Questions

- None. Kept cards are submitted topmost-first, and the engine keeps that order —
  confirmed against a live Scry 2 (both cards land on top in the submitted order).
