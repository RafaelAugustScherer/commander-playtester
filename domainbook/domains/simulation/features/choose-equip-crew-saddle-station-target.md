---
id: choose-equip-crew-saddle-station-target
name: Choose the equip, crew, saddle, and station target
status: implemented
---

## Story

As a player piloting my seat
I want to pick which creature gets equipped, stations a Spacecraft, or
crews/saddles a Vehicle/Mount
So that those attachments and activations are mine to choose, not the AI's

## Rule: Equipping and stationing pick a single creature

When the engine asks the human to resolve an `EquipTarget` or `StationTarget`
`decision request` — offered when an Equipment or Fortification attaches, or
a Spacecraft's station ability needs a creature — the control panel lists
every legal creature and submits the choice as soon as one is clicked. Other
seats still resolve these by `AI action proposal`, and any non-matching state
is untouched.

```gherkin
Example: Equipping my own creature
  Given a play-mode match where I control seat 0
  And Bonesplitter offers Grizzly Bears and Runeclaw Bear as valid targets
  When I click Grizzly Bears
  Then the engine receives Equip with Bonesplitter's id and Grizzly Bears' id
```

## Rule: Crewing and saddling pick creatures until the power threshold is met

A `CrewVehicle` or `SaddleMount` decision offers a pool of eligible
creatures and a power threshold (`crew_power` / `saddle_power`). The panel
shows a running total of the selected creatures' power against that
threshold and toggles creatures on and off; Confirm stays disabled until the
selected total meets or exceeds the threshold, then submits the chosen
creature ids.

A creature's power toward the threshold is its `contributions[i]` value
(index-aligned to `eligible_creatures`) when the engine provides one —
letting an effect that only counts toward crewing/saddling, such as a
temporary boost, differ from the creature's board power — and otherwise its
own power.

```gherkin
Example: Crewing a Vehicle with two creatures
  Given a crew prompt asking for 3 power, where Elite Vanguard and Loyal Pegasus each contribute 2 power to this crew
  When I select both creatures
  Then the selected power reads 4 of 3 and Confirm is enabled
  And confirming sends CrewVehicle with both creature ids
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole equip, station, crew, or saddle
choice back to the engine's own AI, so the decision is never stuck
(`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given an equip, station, crew, or saddle prompt is shown
  When I choose let the AI decide
  Then the engine's AI makes that choice
```

## Open Questions

- The `EquipTarget`, `StationTarget`, `CrewVehicle` and `SaddleMount` shapes,
  and the `Equip` / `ActivateStation` / `CrewVehicle` / `SaddleMount`
  submissions, were confirmed against phase-rs's vendored WASM and reference
  client `gameStateView` at v0.71.0, but not yet round-tripped against a live
  equip, station, crew, or saddle effect.
