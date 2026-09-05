---
id: analysis
name: Analysis
classification:
  domain: core-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/analysis/**
  - src/lib/goldfish.ts
  - src/lib/roles.ts
relationships:
  - with: simulation
    type: customer-supplier
    direction: downstream
---

## Purpose

Answer "how good is this deck" two ways: **consistency** now, from the deck alone
(goldfishing, no opponents), and **strength** over a `run`, from finished games
(head-to-head win rate).

## Domain Roles

- Core analysis context: the project's reason to exist — measuring a deck — lands
  here.
- Two reporters under one roof: the existing seeded `goldfishing` engine that needs
  no opponent and no rules engine, and the head-to-head aggregator that sums
  `MatchEnded` results into a win rate.

## Inbound Communication

| Message         | Collaborator | Type    |
| --------------- | ------------ | ------- |
| `RunGoldfishing`| user         | Command |
| `MatchEnded`    | simulation   | Event   |
| `RunFinished`   | simulation   | Event   |

## Outbound Communication

| Message             | Collaborator | Type    |
| ------------------- | ------------ | ------- |
| `ConsistencyReport` | user         | Event   |
| `WinRateReport`     | user         | Event   |

## Business Decisions

- Goldfishing is kept as the fast consistency layer and is not replaced by
  head-to-head; the two answer different questions (`analysis/ADR-0001`).
- A win rate is reported with a confidence interval and broken out per matchup, so
  a small `run` reads as uncertain rather than exact.
- Analysis is seeded, so a fixed deck and seed give reproducible numbers.
- Head-to-head is the client-side delivery of `docs/ROADMAP.md`'s old Forge-backed
  "Phase 4", without the backend that phase assumed.

## Assumptions

- Goldfishing needs no engine and returns instantly; head-to-head needs the engine
  and is slow.
- A win rate worth trusting needs enough matches, and the match count is capped at
  50 partly because AI games are CPU-heavy.
- Telemetry — the turn a match ended, who won, mulligans taken — comes from the
  engine's finished-game state via `simulation`.

## Verification Metrics

- Goldfishing numbers are stable for a fixed deck and seed.
- A win rate over N matches always carries its interval, never a bare percentage.
- Every finished match contributes to the win rate exactly once.

## Open Questions

- How many matches make a win rate trustworthy, given the 50 cap.
- Which telemetry beyond winner / turn / mulligans is worth surfacing.
- Whether consistency and strength later fold into one score (the old roadmap's
  "power score"). The engine's `estimate_bracket_for_deck` is now a third "how good" lens,
  but it lives in `deck draft` as a build-time steering signal (`ADR-0009`); whether it
  belongs here as a reported measure is open.
