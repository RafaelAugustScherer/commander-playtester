---
id: keep-cards-on-an-impulse-dig
name: Keep cards on an impulse dig
status: implemented
---

## Story

As a player piloting my seat
I want to choose which cards to keep on an impulse draw or dig effect
So that the pick is mine, not the AI's

## Rule: A dig prompt appears on the human's own impulse draw or dig effect

When the human's spell or ability digs into the library (an impulse draw, a
card-advantage dig, and the like), the engine surfaces a `DigChoice` decision
request naming the dug-up cards and how many to keep. The seat's control
panel lists them by name for browsing; any other seat's dig is still
resolved by the AI, and non-dig state is untouched.

```gherkin
Example: The prompt appears on my own dig
  Given a play-mode match where I control seat 0
  When I cast a spell that digs into my library and offers a choice
  Then the control panel lists the dug-up cards by name
  And an opponent's dig is still resolved by the AI
```

## Rule: Keeping respects the offered count, exactly or up to

Clicking a listed card toggles whether it is kept, up to the offered
`keep_count`; once `keep_count` cards are picked, unpicked rows stop
responding to clicks until one is deselected. When the dig allows keeping
fewer (`up_to`), Confirm is enabled with anywhere from zero to `keep_count`
picked; otherwise Confirm stays disabled until exactly `keep_count` are
picked. A running "kept X of N" hint tracks progress either way.

```gherkin
Example: An exact-count dig requires filling every pick
  Given a dig prompt asking to keep exactly 1 card among 3
  When I pick 1 card
  Then Confirm becomes enabled

Example: An up-to dig accepts fewer than the offered count
  Given a dig prompt to keep up to 1 card
  When I pick 0 cards
  Then Confirm is still enabled
```

## Rule: Only the selectable cards can be kept

When the engine restricts which of the dug-up cards may actually be kept
(`selectable_cards`, a strict subset of `cards`), the panel still lists every
dug-up card by name, but only the selectable ones respond to clicks — the
rest are shown disabled for context. When `selectable_cards` is absent, every
dug-up card is selectable.

```gherkin
Example: Some dug-up cards are not eligible to keep
  Given a dig prompt listing 3 cards where only 2 are selectable
  Then the third card is shown but cannot be picked
```

## Rule: The panel names where kept and unkept cards go

The prompt names `kept_destination` (where the kept cards end up, e.g. the
top of the library, the battlefield, or the hand) and `rest_destination`
(where everything else goes), and the panel shows both alongside the keep
count so the choice is made with full context.

```gherkin
Example: The destinations are shown
  Given a dig prompt with kept_destination "Hand" and rest_destination "Graveyard"
  Then the panel names both destinations
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole dig choice back to the engine's
own AI, so the decision is never stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a dig prompt is shown
  When I choose let the AI decide
  Then the engine's AI picks which cards to keep
```

## Open Questions

- The `DigChoice` shape and the `SelectCards` submission were confirmed
  against phase-rs `client/src/adapter/types.ts` (the reference client's
  DigModal) at v0.71.0, but not yet round-tripped against a live impulse
  draw or dig effect.
- Destination zone names (`kept_destination`, `rest_destination`) are shown
  as the engine's own raw strings, capitalized, the same as the existing
  search and commander-zone prompts.
