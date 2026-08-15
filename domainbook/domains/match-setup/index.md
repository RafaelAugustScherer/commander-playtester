---
id: match-setup
name: Match setup
classification:
  domain: supporting-domain
  business-model: engagement-creator
  evolution: custom-built
owners: [RafaelAugustScherer]
code:
  - src/match/**
relationships:
  - with: deck-library
    type: customer-supplier
    direction: downstream
---

## Purpose

Configure a `run` before it starts — decks, `play`/`watch`, how many matches,
difficulty — and hand `simulation` a session it can run without asking anything
more.

## Domain Roles

- Configuration context: the one screen where solo (0 opponents), duel (1), and
  pod (3) are the same form with a different opponent count.
- Gateway context: the human's only decision point before the game; owns the
  `play mode` / `watch mode` toggle.

## Inbound Communication

| Message          | Collaborator | Type    |
| ---------------- | ------------ | ------- |
| `ConfigureMatch` | user         | Command |
| `SelectDecks`    | user         | Command |
| `StartRun`       | user         | Command |

## Outbound Communication

| Message        | Collaborator | Type    |
| -------------- | ------------ | ------- |
| `ListDecks`    | deck-library | Query   |
| `StartSession` | simulation   | Command |

## Business Decisions

- A pre-game toggle picks `play` or `watch`; a `run` is 1–50 matches, sequential,
  in real time on the board (`ADR-0005`).
- Opponent decks are the user's own, chosen from the `deck library` (`ADR-0004`).
- A `run` takes a seed, so the same decks and seed reproduce the same games.
- Revealing the AI hands is an explicit debug toggle: it deliberately bypasses the
  engine's hidden-information filter, so it is off by default and never implied.
- Solo, duel, and pod are one screen; the opponent count (0 / 1 / 3) selects the
  table size.

## Assumptions

- The human is always exactly one seat; the rest are AI.
- A duel is a two-player table and a pod is up to four; the engine supports both.
- Difficulty trades match speed against play quality, and the user sets it knowing
  that (`analysis` and `simulation` inherit the consequence).

## Verification Metrics

- Every configuration produces a session `simulation` accepts without a follow-up
  question.
- The match count cannot be set above 50.
- A given seed plus decks reproduces the same run end to end.

## Open Questions

- What the default match count should be, given each match is slow.
- Whether reveal-hands is all-opponents or per-opponent.
- Whether difficulty is one table-wide setting or per opponent seat.
