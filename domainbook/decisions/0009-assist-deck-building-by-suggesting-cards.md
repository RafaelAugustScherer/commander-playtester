---
status: accepted
date: 2026-09-03
decision-makers: [RafaelAugustScherer]
---

# Assist deck building by suggesting cards

## Context and Problem Statement

The app measures decks the user already has — consistency by goldfishing, strength by
head-to-head. It gives no help building one. A user with an idea and a few cards still
has to know the whole card pool to fill out the other 90-odd slots.

`ADR-0004` framed the project around decks the user enters by hand and settled that no
field of decks is scraped or bundled. Its stated corollary — repeated as a deck-library
assumption — was that "the app never curates or suggests." Adding a deck builder that
proposes cards reopens that corollary: can the app suggest without becoming the scraped
field `ADR-0004` ruled out, and what powers "good synergy"?

A headless spike settled what the vendored engine can and cannot do here. phase-rs
exposes, as game-independent functions over the loaded card database: `search_cards_js`
(a card search), `estimate_bracket_for_deck` (the WotC bracket system, naming the cards
that drive each axis) and `classify_deck_js` (archetype). It exposes **no** card-fit or
synergy score — every "scoring" function it has operates on an in-progress game and
scores legal plays, not deckbuilding fit.

## Decision Drivers

- Lower the barrier from "an idea" to "a legal, measurable 100-card deck."
- Stay self-contained and client-side (`ADR-0003`) — no new external data feed.
- Keep the user in control of every card that goes in.
- Preserve `ADR-0004`'s core: the app does not scrape or browse a field of decks.

## Considered Options

- **Assisted draft, engine-narrowed and locally ranked** — the engine narrows its own
  card database and measures power/legality; a self-built heuristic ranks by synergy.
- **Pull co-occurrence data (EDHREC-style)** — best synergy quality, but a new external
  dependency with no official API, and a clearer reversal of `ADR-0004`'s no-field stance.
- **Rank by engine simulation** — score each candidate by the marginal change it makes to
  goldfishing / head-to-head. Rejected: those measure whole decks, are far too slow per
  candidate, and give almost no signal on a near-empty seed.
- **Do nothing** — leave building to hand-entry and imports.

## Decision Outcome

Chosen: **an assisted draft mode**, a new `deck draft` context. The user seeds at least
three `base cards` (optionally flagging one as the `commander card`) and the app offers
`suggestion round`s of up to three cards, each within the commander's `color identity`,
each individually refreshable. Candidates come from the engine's card database via
`search_cards_js`; the ranking is a self-built `synergy score` with the commander weighted
higher (`deck-draft/ADR-0001`). A selectable `bracket target` (default Focused) steers the
ranking through `estimate_bracket_for_deck`.

This **supersedes `ADR-0004`** by carrying its still-valid core forward and reversing one
corollary:

- **Carried forward:** the app scrapes and bundles no field of decks; the user still owns
  the one deck they build, and opponent decks are still chosen by hand.
- **Reversed:** the app may now curate and suggest *single cards for the deck under
  construction*. The suggestions are drawn from the engine's own card set — not from a
  scraped field of other people's decks.

A drafted deck may be left, copied out, or saved at any point; a partial deck is flagged
and cannot be played (`deck-library/ADR-0002`).

### Consequences

- Good: a first-class path from a theme to a legal deck; the engine's bracket and
  archetype measures become live, per-card feedback during the build; nothing leaves the
  browser, and no external feed is introduced.
- Good: reuses the engine functions already vendored (`ADR-0006`) — only new worker
  commands and UI, no new engine surface to build.
- Bad: synergy is only as good as the heuristic — "reasonable thematic fit", not
  EDHREC-grade — and the heuristic is now a thing to tune and maintain
  (`deck-draft/ADR-0001`).
- Bad: partial decks now exist in the library, so play must be gated where it never had to
  be before (`deck-library/ADR-0002`).

### Confirmation

The `draft-a-deck` feature scenarios cover seeding, commander-first selection, a
three-card round with refresh, color-identity legality, bracket steering, and leaving with
a copy — and the deck-library gating scenario blocks a partial deck from play.

## More Information

The engine capabilities and their limits were established by a runtime spike, not from
source (`TDR-0001`). The ranking method and the rejected alternatives live in
`deck-draft/ADR-0001`; the partial-deck storage and play-gating rule in
`deck-library/ADR-0002`.
