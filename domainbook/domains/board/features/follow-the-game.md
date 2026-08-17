---
id: follow-the-game
name: Follow the game
status: draft
---

## Story

As a player
I want a side panel showing the stack and a running log of what happened
So that I can see what is resolving and pause to back-check the game's history

## Rule: The sidebar shows the current stack, top first

```gherkin
Example: A spell waiting to resolve
  Given a spell or ability is on the stack
  When I look at the sidebar
  Then it lists the stack top-first, with the top item marked
  And an empty stack says so
```

## Rule: The game log is the engine's own event stream

```gherkin
Example: A play is logged with its card
  Given a player plays or casts a card
  When the log updates
  Then the entry names the card and the acting player
  And I can expand the entry to see the card

Example: Turns and phases group the history
  Given several turns have passed
  When I scan the log
  Then each turn is separated by a heading
```

## Rule: The log is readable by default, complete on demand

```gherkin
Example: Curated by default
  Given the default log view
  Then routine priority passes and phase markers are hidden
  When I turn on the detailed view
  Then every engine line is shown
```

## Rule: The sidebar starts open on desktop and collapsed on mobile

```gherkin
Example: Small screens keep the board visible
  Given a narrow, mobile-width screen
  Then the sidebar starts collapsed and opens as an overlay
  And on a desktop screen it starts docked open
  And the choice is remembered
```

## Rule: Hidden information stays hidden

```gherkin
Example: An opponent's private lines are withheld
  Given hands are not revealed
  When the log would show an opponent's hidden-information line
  Then it is withheld unless the line is strictly the human's own
```

## Open Questions

- Whether the log text, which the engine emits in English, should be localized to
  the interface language.
- Whether the retained history (currently the most recent lines) should be
  bounded differently for long watch-mode games.

