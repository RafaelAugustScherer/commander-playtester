# Changelog

What changed in the simulation context, newest release first, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: one H2 per
release, written "## [1.2.0] - 2026-06-30" with " [YANKED]" appended if the
release was pulled, holding Added, Changed, Deprecated, Removed, Fixed or
Security as H3s, each of them a bullet list.

## [Unreleased]

### Changed

- The `engine adapter` now loads the card database gzipped
  (`card-data.json.gz`) and inflates it at runtime via `DecompressionStream`,
  cutting the download from ~100 MB to ~16 MB and keeping the asset under
  GitHub Pages' per-file limit.
