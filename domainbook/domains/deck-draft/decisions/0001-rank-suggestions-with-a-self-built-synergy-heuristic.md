---
status: accepted
date: 2026-09-03
decision-makers: [RafaelAugustScherer]
---

# Rank suggestions with a self-built synergy heuristic

## Context and Problem Statement

Drafting needs a per-card fit signal: given the deck so far, rank candidate cards by how
well the next one fits. `ADR-0009` committed to assisted drafting; this decides what
produces the ordering.

A runtime spike over the vendored engine (v0.71) settled what phase-rs can supply. It
exposes, with no running game and tolerant of a partial deck:

- `search_cards_js` — a card search over the database, filterable by free text and by
  color-identity containment; returns lean rows (name, mana value, color identity,
  legalities).
- `estimate_bracket_for_deck` — the WotC bracket, naming the cards that drive each axis.
- `classify_deck_js` — the deck's archetype.

It exposes **no** card-fit or synergy score. Every scoring function it has
(`get_ai_scored_candidates` and the rest) operates on an in-progress game and scores legal
plays — cast, land, pass — not deckbuilding fit. So the ordering cannot be borrowed from
the engine; it has to be built.

## Considered Options

- **Self-built heuristic over card text and types**, with the engine as narrower and
  validator.
- **External co-occurrence data** (EDHREC "high synergy" and the like).
- **Engine marginal-strength ranking** — score a candidate by the change it makes to
  goldfishing or head-to-head when added.

## Decision Outcome

Chosen: **a self-built heuristic ranks; the engine narrows and validates.**

- **Narrow:** regular-card rounds query `search_cards_js` broadly across the strongest
  current `theme token`s, cache those local results, and use `get_card_face_data` to supply
  text and types for scoring. They filter the pool by Commander legality and the chosen
  color identity. Commander rounds inspect every Commander-legal, commander-eligible card
  because a narrow search can miss valid leaders before the deck has a commander.
- **Rank:** the `synergy score` sums the theme tokens a candidate shares with the deck —
  creature subtypes, keywords, salient oracle-text phrases — with `commander weighting`
  applied, plus a term for the deck's role gaps and mana curve. Commander ranking also
  favors the smallest color identity that covers every base card.
- **Enrich:** after local ranking, only the three displayed cards are resolved through
  Scryfall for images and display data.
- **Steer and validate:** for the shortlist, `estimate_bracket_for_deck` supplies the
  `bracket target` tilt (and a plain-language reason, since it names the contributing
  cards), and `classify_deck_js` shows the archetype the deck is drifting toward.

The two alternatives were rejected for now:

- **Co-occurrence data** would give the best synergy quality, but it is a new external
  dependency with no official API, it must be fetched or scraped, and it is a sharper
  reversal of `ADR-0004`'s no-field stance than suggesting from the engine's own card set.
  Left open as a later opt-in if the heuristic proves too weak.
- **Marginal-strength ranking** measures whole decks, not a card's marginal fit; it is far
  too slow to run per candidate over a large pool, and on a near-empty seed the padding
  swamps any one card's signal. The engine's strength measures stay a whole-deck
  validator, not a per-card oracle.

### Consequences

- Good: fully client-side, no new data feed; the heuristic is transparent and tunable; the
  engine's bracket and archetype become live feedback for free.
- Bad: synergy is "reasonable thematic fit", not EDHREC-grade — a card that combos only
  through a subtle interaction the text does not name will be missed. The `theme token`
  list is the ceiling and a standing maintenance surface.
- Bad: the engine surface it leans on was learned by introspection and can shift under an
  upgrade (`TDR-0001`); the draft worker commands must be re-checked when the engine is
  re-pinned (`ADR-0006`, `docs/engine-upgrade.md`).

### Confirmation

The `draft-a-deck` scenarios assert that suggestions stay within color identity and
Commander legality, that the commander leads the ranking, and that the bracket target
shifts what is offered.

## More Information

The directional decision and the carried-forward parts of `ADR-0004` are in `ADR-0009`.
