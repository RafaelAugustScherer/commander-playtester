---
id: choose-copy-target-and-retarget
name: Choose what a copy effect copies, and how to retarget it
status: implemented
---

## Story

As a player piloting my seat
I want to choose what a copy effect turns something into, and which targets
a copy of a spell or ability points at
So that those choices are mine to make, not the AI's

## Rule: Copying picks the object to become

When the engine asks the human to resolve a `CopyTargetChoice` decision
request — a Clone-style effect deciding what it enters as a copy of, or any
other effect offering a set of valid copy targets — the control panel lists
every object in `valid_targets` and submits the choice as soon as one is
clicked. Other seats still resolve this by AI action proposal, and any
non-matching state is untouched.

```gherkin
Example: Choosing what to copy
  Given a copy-target prompt offers Elvish Mystic and Nyxbloom Ancient
  When I click Nyxbloom Ancient
  Then the engine receives ChooseTarget with Nyxbloom Ancient's object id
```

## Rule: Retargeting a copy fills one slot at a time

A `CopyRetarget` decision (a copy of a targeted spell or ability deciding
where it points) fills its `target_slots` one at a time, tracked by
`current_slot`. The panel shows the legal alternatives for that slot only —
an object's name, or "You" / "Seat N" for a player — and submits the chosen
target as soon as it is clicked, then the engine advances to the next slot.

```gherkin
Example: Retargeting the copy of a targeted spell
  Given a copy-retarget prompt is filling target 1 of 2, offering two creatures
  When I click one of the offered creatures
  Then the engine receives ChooseTarget with that creature's object id
  And the panel then shows the alternatives for target 2 of 2
```

## Rule: All proposed targets can be kept at once

Once every slot in a `CopyRetarget` already carries a `current` target, the
panel additionally offers to keep every proposed target as-is instead of
re-picking each slot.

```gherkin
Example: Keeping every proposed target
  Given a copy-retarget prompt shows a current target for every slot
  When I click "Keep proposed targets"
  Then the engine receives KeepAllCopyTargets
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole copy or retarget choice back to
the engine's own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a copy-target or copy-retarget prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `CopyTargetChoice` and `CopyRetarget` shapes, and the `ChooseTarget` /
  `KeepAllCopyTargets` submissions, were confirmed against phase-rs's
  vendored WASM and reference client `TargetingOverlay` at v0.71.0, but not
  yet round-tripped against a live copy effect.
