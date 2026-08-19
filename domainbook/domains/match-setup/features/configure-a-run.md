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

## Rule: Opening Play lands on setup with your last-played deck chosen

The Play tab opens the setup form directly whenever the library holds at least
one deck; only an empty library shows the "create a deck first" prompt. Your deck
is a dropdown over every saved deck, defaulting to the one you last started a run
with (or the first deck the first time). Opponents are chosen from the remaining
decks and are listed one per line, numbered in seat order.

```gherkin
Example: Setup opens on the last-played deck
  Given a run was last started with a given deck
  When I open the Play tab again
  Then setup opens with that deck chosen as my deck

Example: My deck can be swapped at setup
  Given the setup form is open
  When I pick a different deck from the your-deck list
  Then that deck becomes mine and the opponent choices exclude it
```

## Rule: Setup defaults to a single Very Hard match

An unconfigured run defaults to one match against Very Hard AI, so pressing start
without touching the form plays a single strong game.

```gherkin
Example: The defaults are one Very Hard match
  Given the setup form opened without changes
  Then the match count is 1 and the difficulty is Very Hard
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

## Rule: The controls are reachable and legible to assistive tech

The toggle groups (pod size, mode, difficulty, and playback speed) expose which
option is selected, not only by colour, and the opening-hand popup behaves as a
modal dialog — focus moves into it, stays trapped while it is open, and returns
to where it was on close. Where a control shows only an icon — the icon-based
playback speed and pause/resume — it still carries a text accessible name.

```gherkin
Example: A chosen option is announced
  Given a segmented control such as pod size or mode
  When one option is selected
  Then it is exposed to assistive tech as the pressed option

Example: An icon-only control still has a name
  Given a control shown only as an icon, such as playback speed or pause
  When assistive tech reads it
  Then it announces a text label, not just the icon

Example: The opening-hand dialog keeps focus
  Given the opening-hand popup is open
  When I move focus with the keyboard
  Then focus stays within the dialog until I resolve it
```

## Open Questions

None.
