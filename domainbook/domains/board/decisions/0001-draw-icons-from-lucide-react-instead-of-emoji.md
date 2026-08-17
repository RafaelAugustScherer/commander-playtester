---
status: accepted
date: 2026-08-16
decision-makers: [RafaelAugustScherer]
authored-by: agent
---

# Draw icons from lucide-react instead of emoji

## Context and Problem Statement

The board used emoji as its icons — mana pips, zone counts, life and drop-zone
slots, and so on. Emoji render differently on every platform (and some not at all),
so the board looked inconsistent across machines. The game-log sidebar was about to
add a per-category icon, widening the surface. How should board icons be drawn?

## Considered Options

- Keep emoji.
- Draw every icon from a vector icon set (`lucide-react`).

## Decision Outcome

Chosen: **draw every UI icon from `lucide-react`.** A single vector set renders
identically across platforms and scales cleanly. The switch covers the board's mana
pips, zone counts, life and drop-zone slots, the language switcher, and each
log-category icon.

### Consequences

- Good: consistent, platform-independent icons; one shared source for new icons
  such as the log's category glyphs.
- Bad: a runtime dependency where there was none, and colour/glyph choices now have
  to be made deliberately rather than borrowed from an emoji.
