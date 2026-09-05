---
id: pay-phyrexian-with-life
name: Pay Phyrexian mana with life
status: implemented
---

## Story

As a player piloting my seat
I want to choose, symbol by symbol, whether to pay a Phyrexian mana cost with mana or with life
So that a choice that costs me life instead of mana is mine, not the AI's

## Rule: A Phyrexian payment prompts the human on their own cast

When the engine asks the human to resolve a `PhyrexianPayment` decision
request — casting a spell whose cost has one or more Phyrexian mana symbols
({W/P}, {U/P}, …) — the seat's control panel shows one row per symbol,
naming the spell and each symbol's color. Other seats resolve it by AI
action proposal as before, and any non-`PhyrexianPayment` state is untouched.

```gherkin
Example: The prompt appears on my own Phyrexian spell
  Given a play-mode match where I control seat 0
  When I cast a spell with a Phyrexian mana symbol in its cost
  Then the control panel asks how to pay each symbol, naming the spell
  And an opponent's Phyrexian spell is still decided by the AI
```

## Rule: Each shard toggles between mana and life, unless the engine locks it

Each symbol (a "shard") offers a two-way toggle between paying with its
color's mana and paying with 2 life. When the engine reports a shard as
`ManaOnly` or `LifeOnly` — for example a color the seat cannot produce, or a
format that disallows the life option — that shard's toggle is locked to the
engine's answer and cannot be switched. A running total shows how much life
the current choices would spend.

```gherkin
Example: A flexible shard can be toggled either way
  Given a Phyrexian payment prompt with a black shard offering mana or life
  When I switch that shard to pay with life
  Then the running life total increases by 2

Example: A locked shard cannot be switched
  Given a Phyrexian payment prompt with a shard the engine marks mana-only
  Then that shard's toggle is disabled and stays on mana
```

## Rule: Confirm submits the per-shard choices, and the choice can be handed to the AI

Confirm submits `SubmitPhyrexianChoices` with one `PayMana`/`PayLife` choice
per shard, in the same order the engine listed them. Choosing let the AI
decide hands the whole payment back to the engine's own AI, so the decision
is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Confirming a mix of mana and life
  Given a Phyrexian payment prompt with two shards, one set to life
  When I confirm
  Then the engine receives one PayMana or PayLife choice per shard, in order

Example: Letting the AI decide
  Given the Phyrexian payment prompt is shown
  When I choose let the AI decide
  Then the engine's AI decides how to pay each shard
```

## Open Questions

- The `PhyrexianPayment` shape (`spell_object`, `shards: PhyrexianShard[]`
  with `shard_index`/`color`/`options`) and the `SubmitPhyrexianChoices`
  submission were confirmed against phase-rs `client/src/adapter/types.ts`
  at v0.71.0, but not yet round-tripped against a live cast with a
  Phyrexian-mana card.
