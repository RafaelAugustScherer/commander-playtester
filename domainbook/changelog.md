# Changelog

What changed in this project, newest release first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: one H2 per
release, written "## [1.2.0] - 2026-06-30" with " [YANKED]" appended if the
release was pulled, holding Added, Changed, Deprecated, Removed, Fixed or
Security as H3s, each of them a bullet list.

## [Unreleased]

### Added

- Deck library: enter decks by hand, save them as named reusable decks, and load
  bundled starter precons.
- phase-rs engine integration: a vendored prebuilt WASM snapshot run in a Web
  Worker behind an `EngineClient` adapter (`ADR-0006`).
- Match setup and the run driver: 1v1 or 4-player pods, play or watch mode, 1–50
  matches, AI difficulty, reveal-hands, and a seed.
- Live board rendering the game state in fixed slots, with card images.
- Play mode: pilot your seat, stepping phases with space while the AI responds.
- Play mode drag-to-play: drag a hand card onto dashed, type-labeled battlefield
  slots (land, creature, artifact…) that appear while dragging, in place of the
  earlier action buttons.
- Hover any card to see an enlarged, readable copy beside it.
- Interface language switch (Portuguese / English), always visible in the header
  and remembered across sessions.
- Head-to-head analysis: win rate with a 95% confidence interval and telemetry
  over a run, alongside the existing goldfishing consistency report.

### Changed

- Board layout centers the player's seat at the bottom and renders it larger than
  the opponents', which share the top row.
- Engine sourcing pinned to a prebuilt snapshot instead of a from-source build;
  `TDR-0001` and `ADR-0001` updated to match.

### Removed

- `docs/ROADMAP.md` — the roadmap now lives in this domainbook.
