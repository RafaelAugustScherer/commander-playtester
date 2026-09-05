---
status: accepted
date: 2026-09-05
decision-makers: [RafaelAugustScherer]
---

# Tilt ranking toward played cards with a reprint-count proxy

## Context and Problem Statement

`ADR-0001` ranks candidates by the `synergy score` — shared `theme token`s plus curve and
role fit. Checked against EDHREC's own picks for popular commanders (Krenko, Edgar Markov,
Meren), the *theme* came out right but the *order* did not: within a correct theme the
staples people actually play sank beneath vanilla same-subtype cards. Two structural causes:

- **The per-token search was capped at 250 rows, and `search_cards_js` returns them
  alphabetically.** A common token like `graveyard` matches thousands of cards, so the pool
  only ever held early-alphabet ones — Eternal Witness sits at ~#1,300 alphabetically and
  was unreachable. The cap was excluding most of a theme, not sampling it.
- **Nothing in the score reflects how played a card is** — which is exactly what an EDHREC
  ordering encodes. The card database carries no `edhrec_rank` or play-rate field.

## Considered Options

- **A reprint-count popularity proxy** drawn from the card data we already load
  (`metadata.source_printing_ids`), used both to pick each token's pool and to break ranking
  ties.
- **External EDHREC / co-occurrence data** — the option `ADR-0001` left open "if the
  heuristic proves too weak".
- **Weighting mechanic tokens above creature-subtype tokens**, to stop an incidental shared
  subtype from defining a non-tribal deck.

## Decision Outcome

Chosen: **a reprint-count proxy for popularity**, sourced locally.

- **Fix the pool.** For each theme token, pull every Commander-legal match, sort by reprint
  count, and keep the top slice — the pool is now the most-printed matches, not an
  alphabetical prefix. This alone makes the rest of a common theme reachable.
- **Tilt the rank.** Add `POPULARITY_WEIGHT * log2(1 + printings)` to the `synergy score`.
  `log2` keeps it a nudge over comparable fits rather than a re-sort by reprint count; the
  weight (0.75) was calibrated against EDHREC staple lists for popular commanders.
- **Source it locally.** The name→printing-count index is built once, at card-database load,
  by parsing the same card-data JSON the worker already fetches (~250 ms). No network, no
  Scryfall — consistent with `ADR-0010`.

The alternatives were rejected:

- **External EDHREC data** remains the sharper reversal of the no-field stance
  (`ADR-0004`, `ADR-0009`) that `ADR-0001` set aside; the in-data proxy captured most of the
  gain with none of the new dependency.
- **Mechanic-over-subtype weighting** was implemented and measured against the same staple
  lists, and it *reduced* alignment: boosting mechanic tokens lifted evergreen keywords
  (haste, first strike) into the search tokens and polluted tribal pools with off-theme but
  heavily-reprinted cards. It was dropped; the existing token weighting stands.

### Consequences

- Good: measurably closer to EDHREC's picks — staples like Siege-Gang Commander, Goblin
  Warchief and Eternal Witness now surface where alphabetical filler used to sit. Softens
  `ADR-0001`'s "reasonable thematic fit, not EDHREC-grade" limit without a data feed.
- Bad: reprint count is a noisy proxy — long-reprinted commons are over-counted and recent
  staples under-counted, so it nudges rather than ranks.
- Bad: the proxy reads `metadata.source_printing_ids`, part of the introspected engine
  surface that can shift on a re-pin (`TDR-0001`); the index build must be re-checked when
  the engine is re-pinned (`ADR-0006`, `docs/engine-upgrade.md`).

### Confirmation

The `draft-a-deck` scenarios still assert legality, color identity, and commander-led
ordering. The popularity tilt and its weight were calibrated with a headless evaluation
against EDHREC staple lists for popular commanders (run ad hoc, not committed — it needs the
~95 MiB engine assets, like the engine smoke gate).

## More Information

Refines the **Narrow** and **Rank** steps of `ADR-0001`; the local-only sourcing follows
`ADR-0010`.
