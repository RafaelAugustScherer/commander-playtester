---
id: board
name: Board
classification:
  domain: supporting-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/board/**
relationships:
  - with: simulation
    type: customer-supplier
    direction: downstream
---

## Purpose

Draw the running game in fixed positions and capture the human's input — the same
way whether they are playing or watching.

## Domain Roles

- Presentation context: render-only in `watch mode`, render-plus-input in
  `play mode`. It holds no rules logic of its own.
- User-facing context: the phase rail, the `zones`, life and `commander damage`,
  and the `stack` are what a person actually sees of a game.

## Inbound Communication

| Message            | Collaborator | Type    |
| ------------------ | ------------ | ------- |
| `GameStateChanged` | simulation   | Event   |
| `RevealHands`      | match-setup  | Command |

## Outbound Communication

| Message              | Collaborator | Type    |
| -------------------- | ------------ | ------- |
| `SubmitPlayerAction` | simulation   | Command |
| `AdvancePhase`       | simulation   | Command |

## Business Decisions

- Fixed, Arena-style slots — no dragging cards, no fancy animation (project scope).
- A phase rail the human advances with space in `play mode`; the same rail is
  display-only in `watch mode`.
- Reveal-hands renders opponents' hands face-up only when `match setup` turned it
  on; otherwise opponent hands are hidden.
- One standard playback speed for the MVP; a speed control comes later (`ADR-0005`).

## Assumptions

- The engine's per-seat view already filters hidden information, so the board can
  render exactly what it is handed without leaking.
- Card images are fetched from Scryfall at runtime and cached locally (`ADR-0003`);
  the board does not bundle images.
- A four-seat pod fits the fixed layout, and so do one and two seats.

## Verification Metrics

- An opponent's hand is never rendered unless reveal-hands is on.
- The board reflects the latest engine state within a frame of a change.
- The layout holds for one, two, and four seats without overflow.

## Open Questions

- How much of the `stack` and targeting to visualize in the MVP versus later.
- Whether `watch mode` needs any control beyond pause.
- The shape of the later playback-speed control (`ADR-0005`).
