---
id: follow-the-game
name: Follow the game
status: implemented
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
  And the entry is coloured by its outcome
  And I can expand the entry to see the card

Example: Turns and phases group the history
  Given several turns have passed
  When I scan the log
  Then each turn is separated by a heading

Example: The newest entry is on top
  Given the log has several entries
  When I look at it
  Then the most recent entry is at the top, with older ones below
  And each turn heading still sits above its own group of entries
```

## Rule: The log is readable by default, complete on demand

```gherkin
Example: Curated by default
  Given the default log view
  Then routine priority passes and phase markers are hidden
  And tapping and untapping, mana added and spent, and card draws are hidden
  When I turn on the detailed view
  Then every engine line is shown
```

## Rule: The sidebar is a drawer glued to the right edge

```gherkin
Example: Sliding the drawer open and closed
  Given the sidebar
  Then it is glued to the right edge and slides in and out from an arrow tab
  And on desktop it reserves board space while open
  And on a narrow, mobile-width screen it covers the full screen while open

Example: Its state is remembered on desktop
  Given a desktop screen
  Then the drawer starts open
  And the choice is remembered across games

Example: It always starts closed on mobile
  Given a mobile-width screen
  When a game starts
  Then the drawer is closed so it never covers the board on entry
  And an open/closed choice made on mobile is not carried over
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

