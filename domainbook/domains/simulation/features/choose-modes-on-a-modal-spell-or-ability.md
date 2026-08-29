---
id: choose-modes-on-a-modal-spell-or-ability
name: Choose modes on a modal spell or ability
status: implemented
---

## Story

As a player piloting my seat
I want to pick the mode(s) on my own "choose one or more —" spells and abilities
So that a card's most important decision is mine, not the AI's

## Rule: A modal choice opens a centered, focus-stealing popup on the human's seat

When the engine asks the human to resolve a `ModeChoice` (spell) or
`AbilityModeChoice` (activated ability) `decision request`, a popup appears
centered over a dimmed, blurred board — the same style as the opening-hand and
forced-discard popups — so a mode must be chosen before play continues. Other
seats resolve it by `AI action proposal` as before.

```gherkin
Example: The popup appears when I cast a modal spell
  Given a play-mode match where I control seat 0
  When I cast a spell with "choose one or more —"
  Then a centered popup dims the board and lists each mode
  And an opponent's modal spell is still decided by the AI
```

## Rule: Each mode is its own button, checked against the card's min/max

The popup lists every mode from the engine's `modal` data as a separate button,
"~" swapped for the source's own name. Clicking a mode toggles it; once the
card's `max_choices` are picked, further clicks past that cap are ignored.
Confirm is disabled until at least `min_choices` are picked, then submits the
picked indices as `SelectModes`.

```gherkin
Example: Picking within the card's limits
  Given a modal popup for a "choose one or two" spell
  When I click two different modes
  Then both are marked picked and Confirm is enabled

Example: The cap blocks a third pick
  Given two modes are already picked on a "choose one or two" spell
  When I click a third mode
  Then it is not picked
```

## Rule: A repeatable card shows a stepper instead of a toggle

When `allow_repeat_modes` is true, the same mode can be picked more than once,
so a plain toggle can't tell "pick again" from "unpick" — that row shows a
`− count +` stepper instead of a button. `+` adds another instance of that mode
(disabled once the card's `max_choices` total is reached); `−` removes one
(disabled at 0). The submitted `SelectModes` indices repeat accordingly (e.g.
`[0, 0, 1]` for the same mode picked twice plus another once).

```gherkin
Example: Picking the same mode twice
  Given a modal popup for a "choose two, you may repeat a mode" spell
  When I press + twice on the first mode
  Then its count reads 2 and the submitted indices repeat that mode's index

Example: The stepper's cap still applies
  Given two picks are already made on a "choose two" repeatable spell
  Then every mode's + button is disabled until a − frees one back up
```

## Rule: An eye button lets the player peek at the board without losing picks

A toggle button in the popup's corner hides the popup (and un-dims the board) so
the player can check the board — a target's stats, an opponent's board — before
deciding; toggling it again brings the popup back with the picks intact.

```gherkin
Example: Peeking mid-choice
  Given a modal popup with one mode already picked
  When I toggle the eye button
  Then the popup hides and the board is visible and undimmed
  When I toggle it again
  Then the popup reappears with that mode still picked
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole modal choice back to the engine's own
AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given the modal popup is shown
  When I choose let the AI decide
  Then the engine's AI picks the mode(s)
```

## Open Questions

- The `modal` shape (`mode_descriptions`, `min_choices`/`max_choices`,
  `allow_repeat_modes`) and the `SelectModes { indices }` submission were captured
  and verified against the live engine, for both a spell's `ModeChoice` and an
  ability's `AbilityModeChoice` — but only with `allow_repeat_modes: false`. No
  reproducible `allow_repeat_modes: true` card has been captured yet, so
  submitting a repeated index in `SelectModes` to mean "this mode, again" is an
  assumption from the shape, not a verified round-trip; confirm it against a live
  repeatable card before trusting the stepper's output engine-side.
