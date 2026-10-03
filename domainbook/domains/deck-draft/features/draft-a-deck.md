---
id: draft-a-deck
name: Draft a deck
status: implemented
---

## Story

As a deck author with an idea but not a full list
I want to seed a few cards and be offered synergistic cards to add, a few at a time
So that I can build a legal, measurable Commander deck without knowing the whole card pool

The draft opens from a **Draft a deck** entry in the `deck library`, beside the by-hand
editor. It can also be launched from the editor itself with **Draft from this deck**, which
seeds the draft with the cards already in the list being edited (its commander pre-picked).
It produces the same `SavedDeck` the rest of the app already understands, so a finished
draft flows straight into `match setup`; an unfinished one is saved partial and flagged
(`deck-library/ADR-0002`).

## Rule: A draft starts from at least three base cards

The user enters three or more `base cards` to seed the theme. One may be flagged as the
`commander card`. Fewer than three is refused — three is the floor for a theme worth
ranking against.

Base cards can be entered two ways: **one by one**, where each field suggests matching card
names as it is typed and a card is flagged commander with a radio; or by **pasting a list**
of names (the same decklist text the editor accepts), with the commander chosen from a
select below. Seeding from an existing deck uses the paste form, pre-filled.

```gherkin
Example: Three seed cards start a draft
  Given the author enters "Krenko, Mob Boss", "Goblin Chieftain" and "Skirk Prospector"
  And flags "Krenko, Mob Boss" as the commander
  When the author starts the draft
  Then the draft opens with those three cards in the deck
  And the color identity is fixed to red

Example: Fewer than three is refused
  Given the author has entered only two cards
  When the author tries to start the draft
  Then starting is refused and the three-card minimum is shown
```

## Rule: When the seed names no commander, the commander is chosen first

If none of the `base cards` is flagged commander, the first `suggestion round` offers
commander-eligible cards. Picking one sets the deck's `color identity` before any other
card is suggested.

```gherkin
Example: The first round picks a commander
  Given a draft seeded with three cards and no commander flagged
  When the draft opens
  Then the first round offers commander-eligible cards only
  And choosing one sets the deck's color identity
  And the next round's suggestions all fall within that identity
```

## Rule: Only candidates that can cover every base card's color identity are offered

When no `base card` is flagged commander, the first `suggestion round` offers only
commander-eligible candidates whose `color identity` is a superset of the union of every
base card's own color identity — the same subset rule that governs a legal Commander deck,
enforced up front instead of left to chance. A candidate that would leave some base card
outside the eventual commander's identity is never offered, in either direction.

The one exception is a **Background**: a legendary Background enchantment among the base
cards may pair with a candidate that has **Choose a Background**, unioning their two
identities to cover the base cards. This only applies when exactly one Background is among
the base cards — with more than one, pairing is ambiguous and every candidate falls back to
the solo-coverage rule.

Each base card's color identity is read from the local engine, the source of truth for
card data (`ADR-0010`), not from Scryfall — so the coverage rule holds regardless of
network or Scryfall state.

```gherkin
Example: An off-color candidate is never offered
  Given base cards whose color identities union to green and blue only
  When the first round offers commander candidates
  Then no candidate has a color identity outside green and blue

Example: A Choose a Background candidate may cover with its Background
  Given base cards that include exactly one Background, blue
  And another base card is green
  When the first round offers commander candidates
  Then a green candidate with Choose a Background is offered
  And picking it makes both cards commanders, with their identities unioned
```

## Rule: The commander leads the ranking

Cards are ranked by `synergy score`, and `theme token`s from the `commander card` weigh
more than those from the other cards, so suggestions follow the commander's direction.

```gherkin
Example: Commander themes outrank equal non-commander themes
  Given a deck whose commander is an Elf and whose other cards include one Goblin
  When a round is suggested
  Then an Elf-tribal candidate ranks above a Goblin-tribal candidate of otherwise equal fit
```

## Rule: Among comparable fits, more-played cards rank higher

When two candidates fit the theme about equally, the one that is more played wins. The
`synergy score` has no play-rate data to read, so a card's reprint count stands in for
popularity: it both fills each theme's candidate pool with the most-printed matches and
tilts the final ranking toward them (`deck-draft/ADR-0002`). It is a nudge over comparable
fits, not an override — a clearly stronger theme match still leads.

```gherkin
Example: A staple outranks a vanilla card of equal theme fit
  Given two mono-red Goblins whose only shared theme token is Goblin
  And one is a long-reprinted staple and the other a fringe printing
  When a round is suggested
  Then the staple ranks above the fringe card
```

## Rule: A round offers three cards, each refreshable, with no repeats in the round

Each `suggestion round` shows exactly three cards whenever at least three legal candidates
exist in the card database. Candidates are narrowed, scored, bracket-adjusted, and ranked
locally before only the three selected cards are fetched for display. Any one can be refreshed
on its own, replaced by the closest remaining candidate of the same `slot type` that has not
appeared in this round. The replaced card joins the `blacklist` and is never suggested again
in this draft; the blacklist is not shown. Adding a card ends the round. The next ranking
rebuilds its profile from the commander and every card selected so far.

```gherkin
Example: Refresh swaps one slot for a close, unseen card
  Given a round showing three suggestions
  When the author refreshes the middle card
  Then that slot shows a different card close to the one it replaced
  And the new card has the same slot type
  And no card shown earlier this round reappears

Example: A refreshed-away card never comes back
  Given the author refreshed a suggestion away
  When later rounds are offered, commander rounds included
  Then that card is not suggested again in this draft

Example: Adding a card starts a fresh round
  Given a round showing three suggestions
  When the author adds one of them to the deck
  Then a new round is offered
  And its suggestions are scored against the updated deck
  And a card shown but not refreshed away is free to appear again

Example: Commander ranking produces a full round
  Given at least three legal commanders exist in the card database
  When the commander-selection round is suggested
  Then it shows exactly three legal commanders
```

## Rule: Quick draft offers one card at a time

A **Quick draft** toggle, shown while drafting (the commander round included), shows the
round's first card — the `slot type` the deck is shortest of — alone over a darkened
screen. Taking it adds it to the deck, or picks it as commander in the commander round.
Passing on it is a `refresh` of that slot, so the card joins the `blacklist`. On a touch
screen the author swipes right to take and left to pass; on desktop two buttons below the
card do the same. Closing it (X) returns to the three-card round as it stands.

```gherkin
Example: Swiping right adds the card
  Given quick draft is open on a round whose first card is "Skirk Prospector"
  When the author swipes right
  Then "Skirk Prospector" is added to the deck
  And quick draft shows the first card of the next round

Example: Swiping left passes on the card for good
  Given quick draft is open on a round whose first card is a creature
  When the author swipes left
  Then the card joins the blacklist and is never suggested again in this draft
  And quick draft shows the closest unseen card of the same slot type

Example: Closing quick draft keeps the round
  Given quick draft is open on a round showing three suggestions
  When the author closes it
  Then the three-card round is shown as it stood
```

## Rule: Each round offers the card types the deck is short of

The draft keeps a `type balance`: a target count of lands, creatures, instants, sorceries,
artifacts, enchantments and planeswalkers for the whole deck, set by the commander. A
commander whose text asks for a type — "whenever you cast an instant or sorcery spell",
"enchantment spells you cast", "Elves you control" — moves part of the deck toward that
type; one that asks for nothing keeps the across-deck baseline (`deck-draft/ADR-0003`).

Each of a round's three slots gets a `slot type`: the type that trails its share of the
cards drafted so far by the most, counting each card by one type (Land, then Creature,
then the rest). The slot then offers the best-fitting card of that type. A type far behind
can take two or three slots; the user still picks any of the three, and the next round
re-balances around that pick. The summary shows each type's count against its target.

```gherkin
Example: A spellslinger commander is offered spells
  Given a draft whose commander is "Mizzix of the Izmagnus"
  When the deck is drafted to completion
  Then instants and sorceries together outnumber creatures

Example: An enchantress commander is offered enchantments
  Given a draft whose commander is "Sythis, Harvest's Hand"
  When rounds are suggested
  Then enchantments are offered more than any other non-land, non-creature type

Example: A type the deck is short of takes the next slot
  Given a deck whose instants trail their target share by the most
  When a round is suggested
  Then its first slot is an instant slot
```

## Rule: Basic lands are filled in one step

Rounds suggest only nonbasic lands, up to a share of the land target that grows with the
number of colours. **Fill basic lands** adds the rest as basics — enough to reach the land
target with the planned nonbasic lands still to come, never past 100 cards — split across
the commander's colours in proportion to the deck's cards. A colourless deck gets Wastes.
Pressing it again replaces the earlier basics instead of adding more. Basics are the only
cards a draft holds more than one copy of.

```gherkin
Example: Filling basics completes the land count
  Given a two-colour draft whose land target is 35 with 16 nonbasic lands planned
  When the author fills basic lands
  Then 19 basic lands are added, split by the deck's two colours

Example: Filling twice does not stack
  Given a draft that has already filled basic lands
  When the author adds more cards and fills basic lands again
  Then the earlier basics are replaced by a new split
```

## Rule: Suggestions stay legal and follow the bracket target

Every suggested card is within the commander's `color identity` and legal in Commander. A
selectable `bracket target` (default Focused) steers the ranking; a card that would push
the deck past the target is pushed down, not hidden.

```gherkin
Example: Out-of-identity cards are never offered
  Given a mono-red commander
  When any round is suggested
  Then no suggestion has a color identity outside red

Example: The bracket target shifts what is offered
  Given a draft with the bracket target set to Focused
  When the target is raised to cEDH
  Then higher-powered cards the previous target held back now rank up
```

## Rule: A draft can be left at any point with its deck kept

The user can stop at any time. The deck so far can be copied out as decklist text and
saved to the library. If it is not yet 100 cards it is saved as a partial deck — flagged,
and blocked from play (`deck-library/ADR-0002`).

```gherkin
Example: Leaving copies the partial deck out
  Given a draft with 40 cards chosen
  When the author copies the deck out
  Then the clipboard holds decklist text that parses back to the same 40 cards

Example: A partial draft saves flagged and unplayable
  Given a draft with 40 cards chosen
  When the author saves it to the library
  Then it appears flagged as partial
  And it cannot be selected to start a match
```

## Open Questions

- Whether a completed draft (exactly 100 cards) should offer to jump straight into
  `match setup`, or just land in the library like any saved deck.
- Whether to show the running archetype and bracket as live labels every round, or only on
  request, given each is an engine call.
