---
status: accepted
date: 2026-09-05
decision-makers: [RafaelAugustScherer]
---

# Serve card lookups from the local card database

## Context and Problem Statement

The app is fully client-side (`ADR-0003`) and its identity is "everything is local"
— card *data* comes from a static snapshot loaded into the phase-rs engine, and the
only runtime third-party use is meant to be card *art* from Scryfall, cached locally.

New features that need to read card data — name search and autocomplete, type/text
lookups, filtering, candidate pools — can just as easily reach for a convenient
third-party API (Scryfall exposes a `/cards/autocomplete`, search, and more). Doing
so puts a network call on the interaction path: latency and flicker on every
keystroke, exposure to rate limits and outages, and a feature that stops working
offline. It also drifts from the card pool the engine actually knows (its legality
data, which cards exist). Which source do such features use?

## Decision Drivers

- Offline-first: features should keep working with no network once the app has loaded.
- No latency, flicker, or rate-limit exposure on the interaction path.
- Consistency: suggestions and lookups should match the pool the engine can play.

## Considered Options

- **The local phase-rs card database** (via the engine worker) as the source for all
  card-data lookups.
- **Third-party APIs** (Scryfall search / autocomplete) called at runtime per
  interaction.

## Decision Outcome

Chosen: **card-data lookups are served from the local phase-rs card database**, via
the engine worker (`search_cards_js`, `get_card_face_data`, and the like). **Do not
add runtime third-party (Scryfall) calls for card data.** Scryfall's runtime use
stays limited to what the local snapshot cannot provide: card art, and the
collection-resolve step (`fetchCards`) that maps typed names to canonical cards and
image URLs — both cached locally (`ADR-0003`).

The motivating change: deck-draft base-card autocomplete was first built on
Scryfall's `/cards/autocomplete`; it now runs against the local database through
`EngineClient.searchCardNames`, so typing suggests names with zero network calls.

### Consequences

- Good: suggestions and lookups are instant, work offline, and never hit a rate
  limit; the offered pool matches what the engine knows.
- Bad: the engine's free-text search matches name *and* oracle text and sorts
  alphabetically, so a name autocomplete must narrow and re-rank client-side (see
  `src/draft/cardNameSuggest.ts`). Card-data features also gate on the one-time
  ~95 MiB engine load, so warm it ahead of need (the draft entry calls
  `getEngine().ready()` on mount) rather than blocking the first interaction.

### Confirmation

Typing in the draft's base-card fields produces suggestions with no request to
`api.scryfall.com` (network panel shows only the local engine assets).

## More Information

Sharpens `ADR-0003` (the "only Scryfall for images" line) into a rule for new
card-data features. Relates to `deck-draft/ADR-0001`, which chose the engine as the
narrower/validator for drafting and documents the same `search_cards_js` behavior.
