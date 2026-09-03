---
id: deck-draft
name: Deck draft
classification:
  domain: supporting-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/draft/**
relationships:
  - with: simulation
    type: customer-supplier
    direction: downstream
  - with: deck-library
    type: customer-supplier
    direction: downstream
---

## Purpose

Help the user build a `deck` from scratch. They seed a few `base cards` that set the
theme, and the context suggests the next cards to add — one `suggestion round` of up
to three at a time, each within the `commander card`'s `color identity`, ranked by how
well it fits what is already in the deck. The point is to get from an idea to a legal
100-card deck the rest of the app can then measure, without the user having to know the
whole card pool by heart.

## Domain Roles

- Assisted-authoring context: the counterpart to `deck library`'s by-hand authoring.
  The user still owns every choice — they pick from three, or refresh for three more —
  but the context proposes the candidates rather than leaving the blank page (`ADR-0009`).
- Ranking context: it owns the `synergy score`. Candidates come from the engine's own
  card database (narrowed by `search_cards_js`); the *ordering* is a self-built
  heuristic over card text and types, because the engine has no card-fit signal to lean
  on (`deck-draft/ADR-0001`).
- Steering context: a selectable `bracket target` (default Focused) tilts the ranking
  using the engine's `estimate_bracket_for_deck`, so a draft aimed at a casual table and
  one aimed at cEDH pull different cards.

## Inbound Communication

| Message             | Collaborator | Type    |
| ------------------- | ------------ | ------- |
| `StartDraft`        | user         | Command |
| `SetBracketTarget`  | user         | Command |
| `RequestSuggestions`| user         | Command |
| `RefreshSuggestion` | user         | Command |
| `AddCard`           | user         | Command |
| `ExportDraft`       | user         | Query   |

## Outbound Communication

| Message           | Collaborator          | Type    |
| ----------------- | --------------------- | ------- |
| `SearchCards`     | phase-rs (via simulation) | Query |
| `EstimateBracket` | phase-rs (via simulation) | Query |
| `ClassifyDeck`    | phase-rs (via simulation) | Query |
| `ResolveCardNames`| Scryfall (extern)     | Query   |
| `SaveNamedDeck`   | deck-library          | Command |

## Business Decisions

- Candidates are drawn from the engine's own card database and narrowed by
  `search_cards_js`; they are then ranked locally by a `synergy score`, because the
  engine exposes deck-power and archetype measures but no card-fit scorer
  (`deck-draft/ADR-0001`, `ADR-0009`).
- The `commander card` carries more weight than the other 99 when scoring fit; if the
  `base cards` name no commander, the first `suggestion round` picks the commander, so
  `color identity` is fixed before any other suggestion is made (`draft-a-deck`).
- A `bracket target` (default Focused) steers the ranking through the engine's bracket
  estimate; a card that would push the deck past the target is penalised, not hidden —
  the user stays in control (`ADR-0009`).
- The draft never scrapes or browses a field of decks. It proposes single cards for the
  one deck the user is building — carrying forward `ADR-0004`'s stance while reversing
  its "the app never curates or suggests" corollary (`ADR-0009`).
- A draft can be left at any point: its partial deck is copy/paste-able and can be
  saved to the `deck library`, but a partial deck is flagged and cannot be played
  (`deck-library/ADR-0002`).

## Assumptions

- The engine's deck-evaluation functions (`search_cards_js`, `estimate_bracket_for_deck`,
  `classify_deck_js`) are game-independent and partial-deck-safe — they need only the
  loaded card database, not a running game. This was confirmed by runtime introspection,
  not from source, so the churning-ABI risk still applies (`TDR-0001`).
- Synergy quality lives entirely in the heuristic; the engine measures power and
  legality, never synergy. The heuristic is the tuning lever, and its `theme token` list
  is where its ceiling is set.
- Scryfall supplies card text and images for the handful of cards on screen; the
  candidate pool is filtered to the commander's `color identity` from the engine result
  before that enrichment, so only a small set is fetched per round.

## Verification Metrics

- Every suggested card is within the `commander card`'s `color identity` and legal in
  Commander.
- A card shown in a `suggestion round` never reappears in that same round, including
  across refreshes.
- Leaving a draft yields a decklist that round-trips through the parser — pasting it
  back produces the same cards.
- A partial deck produced by a draft cannot be started in `match setup`.

## Open Questions

- How large and how curated the oracle-text `theme token` list should be — it is the
  main lever of synergy quality, and too broad a list dilutes the score.
- Whether the engine `bracket` folds into analysis's contemplated "power score" or stays
  a draft-only steering signal (`analysis` open questions).
- Whether a `refresh` should replace a card with the closest remaining candidate to the
  one dropped, or simply walk the global ranking.
- Whether to hard-filter unsupported cards (`coverage`) out of suggestions or only
  surface them, mirroring `deck library`'s open question.
