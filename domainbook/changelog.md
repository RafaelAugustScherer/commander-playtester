# Changelog

The one changelog for the whole project, newest first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories (Added,
Changed, Deprecated, Removed, Fixed, Security).

Every pull request that changes the product or its architecture cuts a **version**:
one dated H2, and a matching `package.json` bump in the same PR. Entries stay
terse — one line each — and link to the feature, decision (`ADR-*`), or debt
record (`TDR-*`) that carries the detail: the *what* lives here, the *why* and the
depth live there. A purely-internal PR that touches no product or architecture may
skip its version with a `Skip-Docs: <reason>` trailer instead. There are no
per-domain changelogs; this file is the single timeline (`ADR-0007`).

## [0.1.9] - 2026-08-18

### Fixed

- Pasting or importing a deck no longer needs two-sided cards edited by hand: a
  shared card-name adapter collapses "Front // Back" (split, MDFC, transform,
  adventure) to the front face — the only face Scryfall and the engine key on —
  so an exported Moxfield/Archidekt list works as-is. The adapter runs on both
  the pasted-text and URL-import paths
  (`domains/deck-library/features/import-from-a-url.md`).

## [0.1.8] - 2026-08-18

### Added

- Play mode opens with an interactive mulligan popup on your seat: keep or take a
  free first mulligan, watch the kept-hand size shrink by one from the second
  mulligan on (London), and choose which cards to bottom — or hand the decision to
  the AI (`domains/simulation/features/decide-the-opening-mulligan.md`).

## [0.1.7] - 2026-08-17

### Changed

- Documentation: consolidated to this single versioned changelog and retired the
  per-domain changelogs; every PR now cuts a version with terse entries that link
  to the feature/decision/debt carrying the detail (`ADR-0007`).

## [0.1.6] - 2026-08-17

### Fixed

- Starting a match no longer 404s the engine WASM and card database under a
  subpath deploy (e.g. GitHub Pages project sites): the worker resolves engine
  asset URLs against the page, not its own `/assets/` location (`ADR-0006`).

## [0.1.5] - 2026-08-17

### Added

- The engine version, download URLs, and SHA-256 digests are pinned in one
  manifest (`src/engine/vendor/engine-manifest.json`), fetched and digest-verified
  by `scripts/fetch-engine.sh` so the glue, WASM, and card-data stay a matched set
  — with a mirror fallback and a from-source rebuild path (`ADR-0006`, `TDR-0001`,
  `docs/engine-upgrade.md`).

### Changed

- The card database ships gzipped (`card-data.json.gz`, ~16 MB) and inflates in
  the worker via `DecompressionStream`, keeping it under GitHub Pages' per-file
  limit (`ADR-0006`).

## [0.1.4] - 2026-08-16

### Added

- Import a deck from its Moxfield or Archidekt URL: paste the link and its
  commander and cards fill the editor, ready to review and save
  (`import-from-a-url`, `deck-library/ADR-0001`).

## [0.1.3] - 2026-08-16

### Added

- Stack & game-log sidebar: a collapsible drawer showing the current stack and a
  running, engine-sourced log of the game's events (`follow-the-game`).

### Changed

- Every UI icon is drawn from lucide-react instead of emoji, for consistent
  rendering across platforms (`board/ADR-0001`).

## [0.1.2] - 2026-08-16

### Added

- Choose a creature type from a searchable dropdown when a card asks for one,
  pre-filled with the AI's suggestion and the usual "AI decides" escape
  (`step-through-a-turn`).

## [0.1.1] - 2026-08-16

### Added

- Manual play decisions, each with an "AI decides" escape — activate abilities,
  declare attackers and blockers, and pick which land or color pays a spell; plus
  Pass turn (Enter) to auto-advance your phases and pause on opponent stack
  activity (`step-through-a-turn`).

### Changed

- The turn / phase / active-player status lives in one persistent play-controls
  header, and the turn counter counts rounds (once every seat has played), not
  individual player-turns.
- An opponent's hidden hand collapses to just its card count, with no placeholder
  cards; the hover preview is ~20% larger.

### Fixed

- The pre- and post-combat main phases show their localized names instead of the
  raw engine identifier.

## [0.1.0] - 2026-08-15

### Added

- Deck library: enter decks by hand, save them as named reusable decks, and load
  bundled starter precons (`author-a-named-deck`).
- phase-rs engine integration: a vendored prebuilt WASM snapshot run in a Web
  Worker behind an `EngineClient` adapter (`ADR-0006`).
- Match setup and the run driver: 1v1 or 4-player pods, play or watch mode, 1–50
  matches, AI difficulty, reveal-hands, and a seed (`configure-a-run`, `ADR-0005`).
- Live board rendering the game state in fixed slots with card images, and play
  mode where you pilot your seat — dragging hand cards onto type-labeled
  battlefield slots and stepping phases with space (`follow-the-game`,
  `step-through-a-turn`).
- Hover any card to see an enlarged, readable copy beside it.
- Interface language switch (Portuguese / English), remembered across sessions.
- Head-to-head analysis: win rate with a 95% confidence interval and telemetry
  over a run, alongside the goldfishing consistency report
  (`report-head-to-head-win-rate`).

### Changed

- Board layout centers the player's seat at the bottom, larger than the
  opponents' along the top.
- Engine sourcing pinned to a prebuilt snapshot instead of a from-source build
  (`ADR-0006`, `TDR-0001`).

### Removed

- `docs/ROADMAP.md` — the roadmap now lives in this domainbook.
