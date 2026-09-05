---
id: browse-a-search-yourself
name: Browse a search yourself
status: implemented
---

## Story

As a player piloting my seat
I want to browse my own tutor/search, fetch-land, and outside-the-game results
So that which cards I find is mine to pick, not the AI's

## Rule: A search prompt appears on the human's own tutor or fetch

When the human's spell or ability searches the library, the engine surfaces a
`SearchChoice` decision request naming the candidate cards and how many to
pick. The seat's control panel lists them by name for browsing; any other
seat's search is still resolved by the AI, and non-search state is untouched.

```gherkin
Example: The prompt appears on my own tutor
  Given a play-mode match where I control seat 0
  When I cast a spell that searches my library for a card
  Then the control panel lists the candidate cards by name
  And an opponent's tutor is still resolved by the AI
```

## Rule: Picking respects the count, exactly or up to

Clicking a listed card toggles it, up to the offered `count`; once `count`
cards are picked, unpicked rows stop responding to clicks until one is
deselected. When the search allows a partial find (`up_to` or
`allows_partial_find`), Confirm is enabled with anywhere from zero to `count`
picked; otherwise Confirm stays disabled until exactly `count` are picked. A
running "selected X of N" hint tracks progress either way.

```gherkin
Example: An exact-count search requires filling every pick
  Given a search prompt asking for exactly 1 card among 3
  When I pick 1 card
  Then Confirm becomes enabled

Example: An up-to search accepts fewer than the offered count
  Given a search prompt for up to 1 card that allows a partial find
  When I pick 0 cards
  Then Confirm is still enabled
```

## Rule: A fetch-land partition splits the pool between two destinations

A `SearchPartitionChoice` (a fetch land is the common case) offers the same
candidate list, but the panel names both destinations: the `primary_count`
cards picked go to `primary_destination`, and the rest go to
`rest_destination`. The pick is always exact — a fetch land does not offer a
partial find.

```gherkin
Example: Fetching a land
  Given a search-partition prompt sending 1 card to the battlefield and the rest to the graveyard
  Then the panel names both destinations
  And Confirm requires picking exactly 1 card
```

## Rule: An outside-the-game choice lists entries by name and submits their source

An `OutsideGameChoice` (Wish effects and the like) lists each candidate by its
`name` — a sideboard card or a face-up exiled card — instead of an object id.
Confirming submits each picked entry's own `source` field back to the engine
verbatim, so a sideboard pick and a face-up-exile pick round-trip correctly
even though they carry different shapes.

```gherkin
Example: Wishing for a sideboard card
  Given an outside-game prompt listing a sideboard card and a face-up exiled card
  When I pick the sideboard card and confirm
  Then the engine receives that entry's Sideboard source, not the exile source
```

## Rule: The choice can be handed to the AI

Choosing let the AI decide hands the whole search, partition, or
outside-the-game choice back to the engine's own AI, so the decision is never
stuck (`simulation/ADR-0001`).

```gherkin
Example: Letting the AI decide
  Given a search prompt is shown
  When I choose let the AI decide
  Then the engine's AI picks the cards
```

## Open Questions

- The `SearchChoice`, `SearchPartitionChoice`, and `OutsideGameChoice` shapes,
  and the `SelectCards` / `ChooseOutsideGameCards` submissions, were confirmed
  against phase-rs `client/src/adapter/types.ts` at v0.71.0, but not yet
  round-tripped against a live tutor, fetch land, or Wish effect.
- Destination zone names (`primary_destination`, `rest_destination`,
  `destination`) are shown as the engine's own raw strings, capitalized, the
  same as the existing commander-zone prompt — there is no dedicated
  zone-label i18n convention in the project to plug into instead.
