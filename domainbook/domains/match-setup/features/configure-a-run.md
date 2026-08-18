---
id: configure-a-run
name: Configure a run
status: implemented
---

## Story

As a user
I want to pick the decks, the mode, and the match count before starting
So that a run is fully specified and needs no further input once it begins

## Rule: A run specifies decks, mode, count, difficulty, and a seed

Your deck, 0 to 3 opponent decks, play or watch, a match count of 1 to 50, an AI
difficulty, and a seed.

```gherkin
Example: A watch run is configured and started
  Given your deck and three opponent decks chosen from the library
  When you select watch mode, 20 matches, and start
  Then simulation begins a 20-match run with all seats piloted by the AI
```

## Rule: The match count cannot exceed 50

```gherkin
Example: A count above the cap is refused
  Given the match count field
  When you enter 51
  Then it is not accepted above 50
```

## Rule: The same seed and decks reproduce the same run

```gherkin
Example: A seed makes a run repeatable
  Given a run over fixed decks with a fixed seed
  When the same decks and seed are used again
  Then the same matches play out
```

## Open Questions

- The default match count, given each match is slow.
