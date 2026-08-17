# Changelog

What changed in this project, newest release first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: one H2 per
release, written "## [1.2.0] - 2026-06-30" with " [YANKED]" appended if the
release was pulled, holding Added, Changed, Deprecated, Removed, Fixed or
Security as H3s, each of them a bullet list.

## [Unreleased]

## [0.1.3] - 2026-08-16

### Added

- Stack & game-log sidebar: a collapsible drawer showing the current stack and a
  running, engine-sourced log of the game's events (`follow-the-game`).

### Changed

- Every UI icon is now drawn from lucide-react instead of emoji, for consistent
  rendering across platforms (`board/ADR-0001`).

## [0.1.2] - 2026-08-16

### Added

- Choose a creature type: when a card asks you for one (a tribal land entering, a
  lord naming a type), pick it from a compact searchable dropdown — type to filter
  the 300+ types live — pre-selected with the AI's suggestion, with the same
  "AI decides" escape as the other manual decisions.

## [0.1.1] - 2026-08-16

### Added

- Manual play decisions, each with an "AI decides" escape: activate an ability of
  a permanent you control, declare attackers on your combat, declare blockers when
  attacked, and choose which land or color pays for a spell when the payment has a
  real choice. Unspent mana is held as a reserve shown beside your life.
- Pass turn (Enter): on your own turn, auto-advance through your remaining phases
  — skipping your combat — and pause when an opponent puts something on the stack,
  so you can watch it happen.

### Changed

- The turn / phase / active-player status lives in one persistent play-controls
  panel header — larger, and no longer flickering when you pass with space.
- The turn counter counts rounds: it advances once every seat has taken a turn,
  not after each individual player-turn.
- The hover card preview is roughly 20% larger.
- An opponent's hand section is dropped entirely while their hand is hidden (no
  "Hidden Card" placeholders); the hand count still shows.

### Fixed

- The pre- and post-combat main phases now show their localized names instead of
  the raw engine identifier.

## [0.1.0] - 2026-08-15

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
