---
status: accepted
date: 2026-08-20
decision-makers: [RafaelAugustScherer]
---

# Dress the app in a Windows XP visual language

## Context and Problem Statement

The app carried a "warm medieval-tavern" skin (MedievalSharp/Alegreya, rounded
corners) over the Copper Ember palette. A redesign reframes the same product as a
Windows XP "classic" desktop — a single maximized window with a per-view title bar
and a persistent bottom taskbar — keeping the exact Copper Ember colors. How much
of the app changes?

## Decision Drivers

- The redesign is a pure re-skin: every view, interaction, and feature is preserved.
- The existing components are class-name driven, so most of the change is CSS.
- The palette is unchanged; only chrome, type, corners, and bevels move.

## Considered Options

- Reproduce the redesign literally (simplified mock board, fixed 250px rail),
  dropping functionality.
- Re-skin the existing components in place, preserving all behavior.

## Decision Outcome

Chosen: **re-skin in place**. The shell (`App`) grows an XP window + title bar +
bottom taskbar (Decks/Play app buttons + language menu); tokens gain the copper
ramp, an `--inset` well, XP bevels, and Noto Sans; corners go square. Views keep
their structure and logic. The live-board Stack & log stays the existing
collapsible drawer (re-skinned, docked above the taskbar) rather than the mock's
fixed rail, and the mobile/responsive behavior is retained.

Scrollbars are a custom React component (`XpScroll`) that wraps a scroll region
and draws its own always-visible XP bar (square track, arrow buttons, draggable
thumb) rather than CSS `::-webkit-scrollbar` styling: macOS renders native/CSS
scrollbars as a fading overlay with no arrow buttons, so CSS alone can't deliver
the always-present XP chrome cross-platform. It is applied to the main view, the
board opponents gallery, the game log/stack, and the deck pickers; textareas and
the mulligan modal keep the CSS-styled native bar as a fallback.

### Consequences

- Good: no feature or interaction is lost; the diff is almost entirely CSS plus the
  shell; both languages and the whole play flow are unchanged.
- Bad: a couple of views still diverge from the mock where the app is richer than
  it (the live-board Stack & log is a docked drawer rather than a fixed rail, and
  the mobile/responsive layout is retained).

### Confirmation

Every view (library, editor, report, setup, live board) was walked in the browser
in both languages, with a live match driving the board and log; lint, tests, and
the production build pass.

## More Information

Re-skin over the Copper Ember palette established alongside `ADR-0002`.
