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

## [0.4.9] - 2026-08-25

### Changed

- Re-pinned the vendored phase-rs engine from v0.57.0 to v0.58.0; no by-hand
  interaction needed changing (`ADR-0006`, `docs/engine-upgrade.md`).

## [0.4.8] - 2026-08-25

### Changed

- Re-pinned the vendored phase-rs engine from v0.56.0 to v0.57.0; no by-hand
  interaction needed changing (`ADR-0006`, `docs/engine-upgrade.md`).

## [0.4.7] - 2026-08-25

### Changed

- Re-pinned the vendored phase-rs engine from v0.55.0 to v0.56.0; no by-hand
  interaction needed changing (`ADR-0006`, `docs/engine-upgrade.md`).

## [0.4.6] - 2026-08-21

### Added

- A taskbar Settings menu with a persisted "tap mana manually" toggle; when on,
  the player taps their own sources (any mana permanent, not just lands) to pool
  mana, and a spell is castable only once the reserve covers it — casting then
  spends the reserve and goes straight to targeting, with no auto-tapping
  (`domains/simulation/features/pay-mana-by-hand.md`).

### Fixed

- The floating-mana reserve beside a player's life now reads the engine's
  `mana_pool.mana` (it looked at a field that never populated), so pooled mana
  shows.

## [0.4.5] - 2026-08-21

### Added

- Token permanents render as cards on the board, with real token art pulled from the
  Scryfall printing the engine picks (`token_image_ref`) and the text face as the
  fallback when a token has no printing (`domains/board/index.md`).

## [0.4.4] - 2026-08-21

### Added

- Declaring attackers in a pod now aims each attacker at its own opponent: focus a
  creature and click a defender to aim it, see the target on each attacker and in a
  summary, and confirm a split attack before passing priority. Each opponent has an
  identity color on its board name, badge, and summary row so same-named seats stay
  distinct (`domains/board/features/aim-attackers-at-defenders.md`,
  `domains/simulation/features/step-through-a-turn.md`).

## [0.4.3] - 2026-08-21

### Fixed

- Creatures with defender (walls, tokens, and printed cards alike) are no longer
  offered as attackers when declaring attackers — the vendored engine lists them
  regardless of the keyword (`domains/simulation/features/step-through-a-turn.md`,
  `TDR-0003`).

## [0.4.2] - 2026-08-21

### Added

- Scry and surveil open a floating window that shows the looked-at cards one at a
  time, letting you place each — keep on top, or to the bottom (scry) / graveyard
  (surveil) — instead of the AI resolving them unseen
  (`domains/simulation/features/place-scry-and-surveil-cards.md`).

## [0.4.1] - 2026-08-21

### Added

- Click a seat's graveyard count to open a floating, draggable, closable window
  that lists that graveyard's cards in one row, shown untapped, each enlarging on
  hover (`domains/board/features/inspect-a-graveyard.md`).

## [0.4.0] - 2026-08-20

### Changed

- Re-skinned the whole app in a Windows XP "classic" visual language over the same
  Copper Ember palette — a maximized window with a per-view title bar and a
  persistent bottom taskbar (Decks/Play + language menu), square corners, XP
  bevels, and Noto Sans; all views and interactions are preserved (`ADR-0008`).
- Added an always-visible custom XP scrollbar (square track, arrow buttons,
  draggable thumb) to the main view, the board opponents gallery, the game
  log/stack, and the deck pickers (`ADR-0008`).

## [0.3.3] - 2026-08-20

### Fixed

- When playing by hand, a forced discard now prompts you to choose which cards to
  discard (with the same card preview as the mulligan), instead of the AI picking
  for you (`domains/simulation/features/step-through-a-turn.md`).

## [0.3.2] - 2026-08-19

### Added

- Cards in the opening-hand mulligan popup can be enlarged to read: hover or focus
  on a pointer device, tap on touch, and long-press while bottoming so a tap still
  picks cards (`domains/simulation/features/decide-the-opening-mulligan.md`).

## [0.3.1] - 2026-08-19

### Changed

- The Play tab opens match setup directly on your last-played deck (a dropdown over
  every saved deck), instead of requiring a deck to be picked from the library first
  (`domains/match-setup/features/configure-a-run.md`).
- Setup now defaults to one match against Very Hard AI
  (`domains/match-setup/features/configure-a-run.md`).
- Opponent decks are listed one per line, numbered in seat order
  (`domains/match-setup/features/configure-a-run.md`).

## [0.3.0] - 2026-08-19

### Added

- Mobile board: the hand is now a horizontal strip of larger, readable cards, and
  a multi-opponent pod shows opponents as a swipeable gallery that follows whose
  turn it is (holding put on your own turn)
  (`domains/board/features/read-the-board-on-a-phone.md`).

### Changed

- Mobile play no longer scrolls the page sideways: the play-controls toolbar wraps
  and the log drawer is contained, so only the hand and opponents gallery scroll
  horizontally (`domains/board/features/read-the-board-on-a-phone.md`).
- On mobile, keyboard hints (space/enter) are dropped and the pass buttons lose
  their key labels, and the stack & log drawer always starts closed so it never
  covers the board on entry (`domains/board/features/follow-the-game.md`).
- The playback controls are now icons — a pause icon that stays lit while paused,
  then Slow / Normal / Fast as one, two, and three play triangles; pressing a
  speed resumes. Each carries an accessible name
  (`domains/match-setup/features/configure-a-run.md`).
- The game log reads newest-first — the latest entry is on top, with each turn
  heading above its own group (`domains/board/features/follow-the-game.md`).

### Fixed

- Accessibility: a visible keyboard focus ring across the app, touch targets raised
  to at least 44px on mobile, selected state exposed on the nav tabs and the
  pod/mode/difficulty/speed toggles, and the opening-hand popup now traps and
  restores focus as a dialog. The mulligan popup also fits within a phone screen
  (`domains/match-setup/features/configure-a-run.md`).

## [0.2.2] - 2026-08-19

### Added

- Ninjutsu is now playable by hand: during your combat, a ninja that can be put
  in — in your hand, or your commander in the command zone for commander
  ninjutsu — is highlighted; you pick it, then the unblocked attacker it returns.
  Previously the engine offered ninjutsu but no UI surfaced it, so it couldn't be
  used at all (`domains/simulation/features/step-through-a-turn.md`).

## [0.2.1] - 2026-08-18

### Added

- A deck left unnamed adopts its commander's name, and the name field previews
  the commander as its placeholder, so imported or typed decks need no manual
  naming (`domains/deck-library/features/author-a-named-deck.md`).

### Changed

- URL import tries a chain of public proxies and takes the first that answers,
  instead of relying on one that may be rate-limited or down
  (`domains/deck-library/features/import-from-a-url.md`).

### Fixed

- Play mode on touch devices: a hand card can be played by tapping it and then a
  slot, not only by dragging — HTML5 drag doesn't fire on touch, so cards
  previously couldn't be played on mobile
  (`domains/simulation/features/step-through-a-turn.md`).

## [0.2.0] - 2026-08-18

### Added

- Play mode lets you cast your commander from the command zone: when you can pay
  for it, the commander is highlighted and a click casts it — previously only
  hand cards could be played, leaving no way to cast the commander by hand
  (`domains/simulation/features/step-through-a-turn.md`).

## [0.1.10] - 2026-08-18

### Changed

- Two-sided cards (split, MDFC, transform, adventure) are now stored in full as
  the canonical `Front // Back`, whatever a platform wrote — including Moxfield's
  bare-slash `Front/Back` shorthand, which previously imported as an unknown card
  and made the deck invalid. The Scryfall and engine boundaries collapse the
  stored name to its front face when they query, since both key on that face
  (`domains/deck-library/features/import-from-a-url.md`).
- The deck editor now requires exactly 100 cards to save (commander + 99),
  matching what the engine enforces at game start, so a short deck can no longer
  be saved and then rejected mid-match
  (`domains/deck-library/features/author-a-named-deck.md`).

### Fixed

- The built-in example deck is now a legal 100-card list (was 99), so loading it
  and running a match works without a card-count rejection.

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
