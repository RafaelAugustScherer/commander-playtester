# Changelog

What changed in the simulation context, newest release first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: one H2 per
release, written "## [1.2.0] - 2026-06-30" with " [YANKED]" appended if the
release was pulled, holding Added, Changed, Deprecated, Removed, Fixed or
Security as H3s, each of them a bullet list.

## [Unreleased]

### Added

- Engine-version pinning is now a single source of truth
  (`src/engine/vendor/engine-manifest.json`: version, URLs, SHA-256 digests).
  `fetch-engine.sh` verifies each digest so the glue + WASM + card-data stay a
  matched set, with a durable `mirror.base` fallback for when the CDN prunes.
- A repeatable engine-upgrade process: `docs/engine-upgrade.md` runbook, the
  `phase-rs-upgrade` agent (which also implements new player-action
  interactions), an `engine-smoke` gate that boots the real WASM and runs a
  match to `GameOver`, and `mirror-engine.sh` / `build-engine-from-source.sh`
  for durability and last-resort rebuilds.

### Changed

- The `engine adapter` now loads the card database gzipped
  (`card-data.json.gz`) and inflates it at runtime via `DecompressionStream`,
  cutting the download from ~100 MB to ~16 MB and keeping the asset under
  GitHub Pages' per-file limit.

### Fixed

- The `engine adapter` worker no longer 404s the WASM and card database under
  a subpath deploy (e.g. GitHub Pages project sites). A relative `BASE_URL`
  (`./`) resolved against the worker's own `/assets/` location instead of the
  app root; the main thread now resolves it against the page URL and passes the
  absolute base to the worker on `ready`.
