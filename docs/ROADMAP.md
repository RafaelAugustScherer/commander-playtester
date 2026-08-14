# Roadmap

The goal: **validate the strength of a new Commander deck by comparing it
against popular, proven decks.** That splits into layers of increasing
difficulty. We ship the tractable ones first and keep the architecture open for
the hard one.

## Phase 1 — Goldfishing & consistency (shipped, MVP)

Browser-only Monte Carlo of opening hands and early turns. Answers "does this
deck reliably do its thing?" without needing an opponent. No backend.

## Phase 2 — Heuristic power score & bracket

Turn the composition + goldfishing signals into a single readable score and an
estimated **bracket (1–5)**:

- densities of ramp / card draw / interaction vs. reference bands;
- speed to N mana; curve health; combo-piece counts (from a curated list);
- surface concrete weaknesses ("low interaction", "top-heavy curve").

Still browser-only. This is the next thing to build.

## Phase 3 — EDHREC comparison

Pull the popular cards / typical lists for the deck's commander from EDHREC and
compare:

- overlap with the average deck for that commander;
- high-synergy cards the deck is missing;
- how the curve and category counts stack up against the field.

Depends on access to EDHREC's semi-public JSON. Import from Moxfield/Archidekt
stays list- or URL-based to respect their terms of service — no scraping.

## Phase 4 — Head-to-head simulation (the hard one)

Actual win-rate: play the new deck against popular decks and measure results.
MTG's rules are effectively Turing-complete and competent AI play is an open
problem, so **we do not write our own rules engine**. Instead:

- run **[Forge](https://github.com/Card-Forge/forge)** (open-source, full rules
  + Commander + AI) headless as a **simulation backend**;
- a thin service accepts two decklists, runs N games, returns win-rate and
  telemetry (turn ended, mana used, etc.);
- the web app calls that service and shows results alongside the goldfishing
  and power-score views.

### Architectural note

Phase 1's engine lives behind a small module boundary (`src/lib/goldfish.ts`).
Phase 4's Forge service should sit behind an analogous `Simulator` interface so
the UI can consume either a local goldfish result or a remote head-to-head
result without caring which. Keep the simulation transport (HTTP/worker)
decoupled from the React components.

Caveats to set expectations: Forge's AI is decent but not a tuned human pilot,
and running many games is CPU-heavy — this phase needs real infrastructure, not
a static host.
