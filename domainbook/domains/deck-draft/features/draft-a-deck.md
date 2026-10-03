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

## Rule: What the commander rewards leads the ranking

A commander's `theme token`s are not all equal. What it *rewards* — the mechanic its
"whenever …" trigger conditions name, and the tribes its rules text names — weighs more
than what its rewards are. Hylda of the Icy Crown rewards tapping an opponent's creature;
the token, counter and card her trigger gives are incidental, so the draft offers cards
that tap creatures, not just cards that make tokens or draw (`deck-draft/ADR-0005`).

The heuristic reads mechanics beyond keywords and tribes: tapping creatures, enters and
blink, dies, attacks, spells that target your creatures, Auras, Equipment, Vehicles,
defenders, goad, scry and surveil, Clues, Food, Blood, copied spells, energy, experience
and other counters, and legendaries. Some cards only *enable* a mechanic — a creature with
an enters trigger for a blink deck, a legendary creature for a legends deck. They fit that
theme without making one: drafting them does not pull the deck toward it.

A token counts for more when the clause that carries it repeats — a "whenever" or "at the
beginning of" trigger, or an activated ability, on a permanent — and again when it reaches
every opponent ("each opponent", "your opponents", "at the beginning of each…"); an effect
on every player does not count as reaching opponents (`deck-draft/ADR-0008`).

Tapping creatures includes tapping one from a list of permanent types ("tap target
artifact, creature, or land"), counting an opponent's tapped creatures, and rewarding an
opponent's creature becoming tapped. Each mechanic's pool keeps its most-played cards
within the deck's colour identity, so cards of other colours never crowd out a fit.

```gherkin
Example: A tap commander is offered cards that tap creatures
  Given a draft whose commander is "Hylda of the Icy Crown"
  When rounds are suggested
  Then most non-land suggestions tap creatures, such as "Cryptic Command" or "Sleep"

Example: A repeatable engine outranks a one-shot effect
  Given a draft whose commander rewards tapping creatures
  When "Kapsho Kitefins" and a sorcery that taps one creature once are scored
  Then the tap effect counts for more on Kapsho Kitefins, whose trigger repeats

Example: Reaching every opponent counts for more
  Given two cards that draw at the beginning of an end step
  When one says "each end step" and the other "your end step"
  Then "each end step" counts for more, and "your next end step" for least

Example: Tapping from a list or counting tapped creatures is tapping
  Given a draft whose commander is "Hylda of the Icy Crown"
  When "Opposition" and "Borrowing 100,000 Arrows" are scored
  Then both fit her tap mechanic

Example: A tribe the commander names is a reward
  Given a draft whose commander is "Kaalia of the Vast"
  When rounds are suggested
  Then Angels, Demons and Dragons are offered, though Kaalia is none of them

Example: An enabler fits a theme without making one
  Given a deck with no blink or enters-matters card
  When the author adds creatures that only have enters triggers
  Then later rounds are not pulled toward blink cards
```

## Rule: A tribe's lords rise with the tribe

A card whose rules text names a creature type — a lord or another `tribal payoff` — scores
more the larger that tribe's share of the deck's creatures, levelling off as the tribe
grows. Being of the type alone adds nothing beyond its `theme token`, so a lord outranks a
plain member of the tribe, and a handful of incidental Humans in a large creature base
barely lifts a Human lord (`deck-draft/ADR-0006`).

```gherkin
Example: A lord outranks a plain member of a tribe the deck is built on
  Given a deck with ten Elves among its creatures
  When an Elf lord and a plain Elf are scored
  Then the lord scores about one and a half times the plain Elf

Example: An incidental tribe barely counts
  Given a deck with six Humans among thirty creatures
  When a Human lord is scored
  Then its tribal bonus is a third of an Elf lord's in a deck with five Elves in eight
```

## Rule: Ramp rises with the deck's mana appetite and keeps pace with the draft

Ramp is scored on its own, not through `theme token`s: a commander that adds mana does not
make other mana cards fit its theme. What ramp is worth follows the deck's `mana appetite`
— its average spend, counting each card's priciest activated ability and the commander
three times, and leaving the deck's ramp out. A deck whose appetite is low gets no ramp
bonus; above that the bonus grows until the appetite is high. Cheap ramp gets the whole
bonus, three-mana ramp half and four-mana ramp none. Ramp whose mana ability names a tribe
the deck has ("Add {G} for each Elf") gets more, growing with the tribe. In a deck without green, creature ramp gets a quarter: those decks ramp
with artifacts (`deck-draft/ADR-0009`).

The bonus keeps pace with the draft instead of front-loading: the deck should hold about
ten ramp cards by its sixty-third nonland card, in proportion along the way. Behind that
pace ramp gets the whole bonus; ahead of it the bonus fades, and two cards ahead it is gone.

Only lasting ramp counts, both for the bonus and for the pace: a mana ability on a
permanent that makes more mana than it costs, an extra land drop each turn, or a land put
onto the battlefield, even by a sorcery. Treasure-only cards, one-shot spells and filters
that turn one mana into another get no ramp bonus; Treasure decks still find Treasure
makers through the `treasure` token.

```gherkin
Example: An expensive commander is offered cheap ramp
  Given a draft whose commander is "Voja, Jaws of the Conclave"
  When sorceries are ranked
  Then "Rampant Growth", "Farseek" and "Nature's Lore" lead them

Example: Ramp is spread across the draft
  Given an Elf draft under "Lathril, Blade of the Elves" taking the first offer each round
  When forty rounds are drafted
  Then ramp is taken in early, middle and late rounds rather than only the first ones

Example: Ramp that grows with the tribe outranks plain ramp
  Given an Elf deck with a four-mana commander
  When "Priest of Titania" and "Elvish Mystic" are scored
  Then "Priest of Titania" gets the larger ramp bonus

Example: A deck without green ramps with artifacts
  Given a draft whose commander is "K'rrik, Son of Yawgmoth"
  When creatures and artifacts are ranked
  Then "Sol Ring", "Arcane Signet" and "Mind Stone" are among the top artifacts
  And colourless mana creatures such as "Palladium Myr" do not lead the creatures

Example: A cheap deck gets no ramp bonus
  Given a deck whose commander and cards cost two mana or less
  When "Sol Ring" is scored
  Then it gets no ramp bonus

Example: Incidental Treasure and mana filters are not ramp
  Given a deck with a high mana appetite
  When an artifact that only creates Treasure tokens and "Prophetic Prism" are scored
  Then neither gets a ramp bonus
```

## Rule: Tribal mode keeps creature slots on the chosen tribes

In the `customization` section below the bracket target, a **Tribal** switch turns on
`tribal mode`. While it is on, the
author picks one or more creature types by hand, typing to get suggestions from the full
list of creature types. Every creature slot then offers only creatures of those types — a
Changeling counts as every type — and the pool reaches each tribe's most-printed members
and the cards that name it. Other slots stay open, but cards that name a chosen tribe or
are Kindred of it rank higher there. Changing the tribes while drafting re-offers the
current round at once; with no tribe picked, nothing is filtered (`deck-draft/ADR-0006`).

```gherkin
Example: Creature slots offer only the chosen tribes
  Given a draft with tribal mode on and Elf chosen
  When a round with creature slots is suggested
  Then every creature offered is an Elf or a Changeling

Example: Other slots favour cards for the tribe
  Given a draft with tribal mode on and Elf chosen
  When a sorcery slot is suggested
  Then a card that names Elves or is a Kindred Elf ranks above an equal card that does not

Example: Turning tribal mode off keeps the tribes
  Given a draft with tribal mode on and Elf chosen
  When the author turns tribal mode off
  Then creature slots are open again
  And turning it back on restores Elf
```

## Rule: Planeswalkers and dungeon cards are offered only when asked for

The `customization` section also holds two switches, both off by default: **Suggest
planeswalkers** and **Suggest dungeon mechanics**. While the first is off, no planeswalker
is offered — not as a commander, not in any slot — and the `type balance` gives the
planeswalker share to the other types, so no slot asks for one. While the second is off,
no card whose rules text names a dungeon or the initiative is offered ("venture into the
dungeon", "completed a dungeon", "take the initiative"). Turning either on or off while
drafting re-offers the current round at once.

```gherkin
Example: A superfriends-style commander gets no planeswalkers by default
  Given a draft whose commander is "Atraxa, Praetors' Voice"
  When rounds are suggested
  Then no planeswalker is offered
  And the type balance targets zero planeswalkers

Example: Turning planeswalkers on brings them back
  Given a draft with planeswalkers off
  When the author turns on "Suggest planeswalkers"
  Then the type balance targets planeswalkers again
  And the current round is re-offered

Example: Dungeon cards stay out by default
  Given a draft with dungeon mechanics off
  When rounds are suggested
  Then no card that ventures into the dungeon or takes the initiative is offered
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
Passing on it drops it from the round into the `blacklist`; the round's next card moves to
the front, and the best-ranked unseen card of the passed card's `slot type` joins the back,
so the author sees every card of the round before any replacement. On a touch
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
  And quick draft shows the round's second card
  And the best-ranked unseen creature joins the back of the round

Example: Passing on every card walks the whole round
  Given quick draft is open on a round of a creature, an instant and a sorcery
  When the author swipes left three times
  Then quick draft has shown the creature, then the instant, then the sorcery
  And the round holds the best-ranked unseen creature, instant and sorcery

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
Planeswalkers get no share unless the author turns them on in `customization`.

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
number of colours. A one-colour deck has nothing to fix, so its few land slots offer only
lands that do something besides make or find mana — Rogue's Passage, Bojuka Bog — never
Command Tower or Evolving Wilds (`deck-draft/ADR-0007`). **Fill basic lands** fills every
land still missing from the target with basics, counting the nonbasic lands already
drafted and never going past 100 cards, split across the commander's colours in proportion
to the deck's cards. Once the lands reach their target, rounds stop offering land slots. A
colourless deck gets Wastes. Pressing it again replaces the earlier basics instead of adding
more. Basics are the only cards a draft holds more than one copy of.

```gherkin
Example: Filling basics completes the land count
  Given a two-colour draft whose land target is 35 with 6 nonbasic lands drafted
  When the author fills basic lands
  Then 29 basic lands are added, split by the deck's two colours
  And later rounds offer no land slots

Example: A one-colour deck is offered utility lands only
  Given a draft whose commander is "Krenko, Mob Boss"
  When a round offers a land slot
  Then the land does something besides make or find mana, like "Rogue's Passage"
  And "Command Tower" is never offered

Example: Filling twice does not stack
  Given a draft that has already filled basic lands
  When the author adds more cards and fills basic lands again
  Then the earlier basics are replaced by a new split
```

## Rule: Suggestions stay legal and follow the bracket target

Every suggested card is within the commander's `color identity` and legal in Commander. A
selectable `bracket target` — Focused (the default), Optimized or cEDH — steers the
ranking; a card that would push the deck past the target is pushed down, not hidden.

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
