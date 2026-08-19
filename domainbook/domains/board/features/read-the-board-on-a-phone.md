---
id: read-the-board-on-a-phone
name: Read the board on a phone
status: implemented
---

## Story

As a player on a phone
I want the board to fit my screen and enlarge what I'm reading
So that I can follow and pilot a game without fighting sideways page scroll

## Rule: The page itself never scrolls sideways; only chosen regions do

On a narrow screen the whole board fits the viewport width — the play-controls
toolbar wraps rather than overflowing, and the log drawer stays off-canvas until
opened. Horizontal scrolling is reserved for the hand and the opponents gallery,
each contained to its own strip.

```gherkin
Example: No accidental page scroll
  Given a mobile-width screen during a match
  When I view the board
  Then the page does not scroll horizontally
  And the speed / pause / exit controls wrap onto multiple rows if needed
```

## Rule: The hand is one horizontal strip of larger cards

On mobile the hand becomes a single row that scrolls sideways, with cards drawn
larger than the battlefield's so their text is readable, rather than a wrapped
grid of small cards.

```gherkin
Example: Swiping through a full hand
  Given a mobile-width screen and several cards in hand
  When I look at the hand
  Then the cards sit in one horizontally-scrollable row, enlarged for reading
  And I swipe sideways to reach the rest
```

## Rule: Opponents are a swipeable gallery that follows the turn

With more than one opponent, the opponents' mats become a horizontal gallery
showing one at a time. It scrolls itself to the opponent whose turn it is, and
holds on the last-shown opponent while the human is the active player.

```gherkin
Example: The gallery follows the active opponent
  Given a multi-opponent pod on a mobile-width screen
  When an opponent's turn begins
  Then the gallery scrolls that opponent's mat into view

Example: It holds put on the human's turn
  Given the gallery is showing one opponent
  When it becomes the human's turn
  Then the gallery stays on that opponent rather than jumping away

Example: On desktop the mats stay side by side
  Given a wide screen
  Then all opponents are shown together in a grid, not a gallery
```

## Open Questions

- Whether the human's own hand should also collapse to counts (like opponents')
  when it grows very large on a small screen.
