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

The user enters three or more `base cards` to seed the theme. One may be chosen as the
`commander card`. Fewer than three is refused — three is the floor for a theme worth
ranking against.

Base cards can be entered two ways: **one by one**, where each field suggests matching card
names as it is typed; or by **pasting a list** of names (the same decklist text the editor
accepts). Either way, the commander is chosen from a select below the cards, listing only the
commander-eligible ones. Seeding from an existing deck uses the paste form, pre-filled with
its commander and second commander.

```gherkin
Example: Three seed cards start a draft
  Given the author enters "Krenko, Mob Boss", "Goblin Chieftain" and "Skirk Prospector"
  And chooses "Krenko, Mob Boss" as the commander
  When the author starts the draft
  Then the draft opens with those three cards in the deck
  And the color identity is fixed to red

Example: Fewer than three is refused
  Given the author has entered only two cards
  When the author tries to start the draft
  Then starting is refused and the three-card minimum is shown
```

## Rule: A commander that can pair may take a second commander from the base cards

Once the chosen commander can share the command zone with one of the other `base cards`, a
second, optional select appears below the first, listing only the base cards it pairs with.
Picking one makes both cards commanders; the deck's `color identity` is the union of theirs.
Nothing is pre-selected — a pairing card left unpicked stays in the deck.

Two cards pair when one of them allows it:

- **Partner** pairs with another card with Partner; a named variant such as
  **Partner—Survivors** or **Partner—Character select** pairs only with the same variant.
- **Partner with** *name* pairs only with the card it names, which names it back.
- **Friends forever** pairs with another card with Friends forever.
- **Choose a Background** pairs with a legendary Background enchantment.
- **Doctor's companion** pairs with a legendary Time Lord Doctor that has no other creature
  types.

The draft reads these from the card's rules text, not the engine's keyword data, because the
engine files the named Partner variants under plain Partner. The draft never suggests a second
commander; it only comes from the base cards.

```gherkin
Example: Two Partner commanders share the command zone
  Given base cards "Kraum, Ludevic's Opus", "Tymna the Weaver" and "Sol Ring"
  And the author chooses "Kraum, Ludevic's Opus" as the commander
  When the author chooses "Tymna the Weaver" as the second commander
  And starts the draft
  Then both are commanders
  And the color identity is white, blue, black and red

Example: Only cards that pair are offered
  Given the chosen commander has Partner—Survivors
  When the second-commander select is opened
  Then it lists base cards with Partner—Survivors only
  And a base card with plain Partner is not listed

Example: A Background left unpicked stays in the deck
  Given the commander has Choose a Background and a Background is among the base cards
  When the author starts the draft without choosing a second commander
  Then the Background is in the deck, not the command zone
```

## Rule: When the seed names no commander, the commander is chosen first

If none of the `base cards` is chosen as commander, the first `suggestion round` offers
commander-eligible cards. Picking one sets the deck's `color identity` before any other
card is suggested.

```gherkin
Example: The first round picks a commander
  Given a draft seeded with three cards and no commander chosen
  When the draft opens
  Then the first round offers commander-eligible cards only
  And choosing one sets the deck's color identity
  And the next round's suggestions all fall within that identity
```

## Rule: Only candidates that can cover every base card's color identity are offered

When no `base card` is chosen as commander, the first `suggestion round` offers only
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
an enters trigger for a blink deck, a legendary creature for a legends deck, any artifact or
a card that creates artifact tokens (Treasure, Clues, Food…) for an artifact deck. They fit
that theme without making one: drafting them does not pull the deck toward it. A token
entering ("Whenever a token you control enters") is token making, so token makers fit it;
it is not an enters trigger for blink.

Spell keywords fit what feeds them, both ways (`deck-draft/ADR-0012`). Casting instants and
sorceries ("instant or sorcery spell", magecraft) is a theme, and every instant and sorcery
fits it. Countering, targeting or stopping those spells, or an opponent casting them, is not. So is reducing the cost of spells that include instants and sorceries; "Goblin
spells cost {1} less" is not. Storm fits cost reduction and casting instants and sorceries.
Delve fits milling and discarding. Kicker on an instant or sorcery fits cost reduction, and so
does overload. A kicked-spell payoff ("Whenever you cast a kicked spell") rewards kicker.
Each fit runs both ways: cost reducers fit a storm deck, mill cards fit a delve deck. An
overloaded spell reaches every opponent, so everything it fits counts half again.

A token counts double when the clause that carries it repeats — a "whenever" or "at the
beginning of" trigger, or an activated ability, on a permanent — and half again when it
reaches every opponent ("each opponent", "your opponents", "at the beginning of each…"); an
effect on every player does not count as reaching opponents (`deck-draft/ADR-0008`). A
token on an engine that repeats counts for more than on a one-shot that reaches every
opponent: "Opposition" taps for more than "Cryptic Command" (`deck-draft/ADR-0011`). The modes ("• …") of a
repeating trigger repeat too, with or without a label ("• Dragons — At the beginning of
combat on each opponent's turn, …"); the modes of an instant or sorcery do not.

A power the rules text names is a mechanic too: "base power 1", "power 2 or less" or "power
4 or greater" make a `theme token` such as `base power 1`, unless the sentence picks a target,
names an opponent's creatures or concerns blocking, or asks for a total power. A card fits it when it is a creature with
that printed power (a `*` power fits nothing) or creates a creature token of that power, so a
commander that pays off small creatures is offered small creatures. Each power token's pool
is the most-played creatures and token makers that fit it in the deck's colour identity.

Enters triggers split by what enters. `etb` is any permanent entering ("Whenever another
permanent enters", a trigger that fires an additional time for a permanent entering) and
blink; `creature etb` is a creature entering ("Whenever another creature you control
enters"), which offspring and token copies of creatures also reward but never add to a
deck's theme, so a populate or copy-token card in the 99 does not pull the deck toward it.
A commander rewarding `creature etb` is
offered creatures with an enters trigger, not artifacts or enchantments that happen to say
"When this enters"; a creature with one fits both tokens, any other permanent only `etb`.

Tapping creatures includes tapping one from a list of permanent types ("tap target
artifact, creature, or land"), tapping several ("tap X target creatures"), counting an
opponent's tapped creatures, rewarding an opponent's creature becoming tapped, and rewarding
tapping several at once ("Whenever you tap one or more untapped creatures your opponents
control"). An opponent tapping their own creature ("any opponent may tap an untapped creature
they control") is not tapping. Each mechanic's pool keeps its most-played cards
within the deck's colour identity, so cards of other colours never crowd out a fit.

```gherkin
Example: A tap commander is offered cards that tap creatures
  Given a draft whose commander is "Hylda of the Icy Crown"
  When rounds are suggested
  Then most non-land suggestions tap creatures, such as "Hylda's Crown of Winter" or "Citadel Siege"

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

Example: A named power is a reward
  Given a draft whose commander counts other creatures with base power 1
  When a creature with power 1 and an otherwise identical one with power 2 are scored
  Then the power 1 creature scores higher and shows "base power 1" as a matched token

Example: An enters multiplier rewards enters triggers
  Given a draft whose commander gives creature spells offspring
  When a creature with an enters trigger and one without are scored
  Then the creature with the enters trigger scores higher

Example: A creature-only enters multiplier ignores other permanents
  Given a draft whose commander gives creature spells offspring
  When a creature and an enchantment, each with "When this enters", are scored
  Then only the creature gains from the commander's enters reward

Example: An enabler fits a theme without making one
  Given a deck with no blink or enters-matters card
  When the author adds creatures that only have enters triggers
  Then later rounds are not pulled toward blink cards

Example: Artifact token makers fit an artifact deck
  Given a deck with "Kappa Cannoneer", which grows whenever an artifact you control enters
  When a card that creates a Clue token and one that creates a Soldier token are scored
  Then only the Clue maker fits the artifact theme

Example: A token payoff asks for token makers
  Given a deck with "Junk Winder", which taps a permanent whenever a token you control enters
  When cards are scored
  Then token makers fit the deck's token theme, and blink cards do not gain from it

Example: A repeating engine outranks a one-shot that reaches every opponent
  Given a draft whose commander is "Hylda of the Icy Crown"
  When "Opposition" and "Cryptic Command" are scored
  Then Opposition's tap counts for more

Example: The modes of a repeating trigger repeat
  Given a draft whose commander rewards tapping creatures
  When "Dreamshackle Geist" and "Citadel Siege" are scored
  Then their tap modes count as repeating

Example: A spellslinger commander is offered spell payoffs
  Given a draft whose commander is "Mizzix of the Izmagnus"
  When rounds are suggested
  Then cards such as "Guttersnipe" and "Mizzix's Mastery" fit its instant and sorcery theme

Example: Storm rises with cost reduction
  Given a deck with "Goblin Electromancer", which makes instants and sorceries cheaper
  When "Grapeshot" and a sorcery without storm are scored
  Then Grapeshot scores higher and shows "cost reduction" as a matched token

Example: Delve rises with milling
  Given a draft whose commander is "Sidisi, Brood Tyrant"
  When "Treasure Cruise" is scored
  Then it fits the deck's mill theme

Example: A kicked-spell payoff is offered kicker spells
  Given a draft whose commander is "Verazol, the Split Current"
  When rounds are suggested
  Then kicker instants and sorceries lead the instant and sorcery slots

Example: A cost reduction for one creature type is not spell cost reduction
  Given a deck with "Goblin Warchief"
  When cards are scored
  Then storm, kicker and overload spells do not gain from it
```

## Rule: A commander's own body is not its theme

What a commander asks for sets its theme, not what it is. Its own keyword lines ("Flying",
"Flying, first strike", "Ward {2}", "Protection from red") and its type-line creature types
add nothing to the draft's theme; a keyword it gives to other creatures ("Creatures you
control have flying") and a tribe its rules text names ("Elves you control") do
(`deck-draft/ADR-0010`). The cards from the 99 keep theirs, at the usual weight.

```gherkin
Example: A flying Bird commander does not call for fliers or Birds
  Given a draft whose commander is a Bird with "Flying" that counts creatures of base power 1
  When rounds are suggested
  Then the theme holds base power 1 and what its text creates, and neither flying nor Bird

Example: A given keyword is a theme
  Given a draft whose commander says "Creatures you control have flying"
  When rounds are suggested
  Then fliers are favoured
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
onto the battlefield, even by a sorcery. A mana ability whose cost uses something up —
sacrificing, exiling or discarding, collecting evidence, removing counters — is not lasting:
"Lotus Petal", "Elvish Spirit Guide", "Cryptex", charge-counter rocks and Eldrazi Spawn
makers get no ramp bonus, while paying life, milling or tapping another creature still
counts. Treasure-only cards, one-shot spells and filters that turn one mana into another get
no ramp bonus; Treasure decks still find Treasure makers through the `treasure` token.

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

Example: A rock that uses up the graveyard is not lasting ramp
  Given a deck with a high mana appetite
  When "Cryptex" and "Mind Stone" are scored
  Then only "Mind Stone" gets a ramp bonus
```

## Rule: What the 99 add to a theme levels off

Each card drafted adds to the `theme token`s it carries, but what the 99 add to one token
levels off after a handful of cards and never passes three. However many cards carry a
broad token — making tokens, sacrificing, drawing, flying — the commander's own tokens
(three, and eight for what it rewards) keep leading, and the theme stops growing as the
deck fills, so the bonuses scored apart from theme keep their say all draft long
(`deck-draft/ADR-0013`).

```gherkin
Example: A broad token does not bury what the commander rewards
  Given a commander that rewards tapping an opponent's creature
  And forty drafted cards with flying
  When the deck's theme is weighed
  Then tapping creatures still weighs more than flying

Example: The theme stops growing late in the draft
  Given a draft past its sixtieth card
  When a round is scored
  Then the round's theme scores are about as large as they were at its twentieth card
```

## Rule: Tokens are read from rules text, not reminder text

A card's `theme token`s come from its rules text with the reminder text left out, so a
Treasure's "Sacrifice this token" does not read as sacrificing, a Clue's "Draw a card" as
drawing, and ward's "Whenever this creature becomes the target…" as rewarding spells that
target. A keyword whose meaning lives in its reminder text signals what it does instead:
persist and wither read as -1/-1 counters; undying, fabricate, amass, mentor, explore and
the like as +1/+1 counters; afterlife, offspring, living weapon and investigate as making
tokens; exalted, battle cry and melee as attacking; flashback, escape and disturb as
casting from the graveyard; cycling and madness as discarding; exploit, bargain and casualty
as sacrificing; bestow as Auras (`deck-draft/ADR-0013`).

```gherkin
Example: A Treasure maker is not a sacrifice card
  Given a creature that creates a Treasure token when it enters
  When its theme tokens are read
  Then it signals Treasure and making tokens, and not sacrificing

Example: A ward commander does not reward spells that target
  Given a commander whose only trigger is ward's reminder text
  When what it rewards is read
  Then it rewards nothing

Example: A persist creature still fits a -1/-1 counter deck
  Given a creature with persist
  When its theme tokens are read
  Then it signals -1/-1 counters
```

## Rule: Protection keeps pace with what the commander needs

Cards that keep your commander or creatures on the battlefield — "Lightning Greaves",
"Swiftfoot Boots", "Heroic Intervention", "Teferi's Protection", umbras, spells that
redirect — form a `fundamentals bucket` scored apart from theme. Every deck aims for two;
a commander's need adds up to six more. The need is full for a commander that wants to
connect — it triggers on attacking or on its own combat damage, or cares about Auras or
Equipment — and otherwise grows with the commander's mana value, from none at three to full
at six. A commander with its own hexproof, shroud, indestructible, ward or protection, or
one that comes back without commander tax (commander ninjutsu, dash, eminence, putting
itself onto the battlefield from the command zone), counts only a quarter of its mana
value. With two commanders, the needier one sets the target (`deck-draft/ADR-0013`).

Like ramp, the bucket keeps pace with the draft: the deck should hold its target by its
sixty-third nonland card, in proportion along the way. At pace a protection piece earns
the whole bonus; behind it, half again for each card the deck is short, up to three times,
so a deck whose theme crowds out protection still catches up; ahead of it, half for each
card ahead, never nothing. A creature's own hexproof is not protection for the deck.

```gherkin
Example: An expensive commander without protection aims for a strong base
  Given a draft whose commander is "Etali, Primal Conqueror"
  When the deck's protection target is set
  Then it is eight

Example: A voltron commander aims for a strong base whatever its cost
  Given a draft whose commander is "Rafiq of the Many"
  When the deck's protection target is set
  Then it is eight

Example: A commander that protects itself aims for less
  Given a seven-mana commander with hexproof
  When the deck's protection target is set
  Then it is three and a half

Example: A commander that dodges commander tax aims for less
  Given a draft whose commander is "The Ur-Dragon"
  When the deck's protection target is set
  Then it is three and a half

Example: A deck far behind on protection catches up
  Given a draft past its sixty-third nonland card with no protection and a target of eight
  When "Lightning Greaves" is scored
  Then its protection bonus is three times the full bonus

Example: Protection keeps earning a little past its target
  Given a deck four protection pieces ahead of its pace
  When "Lightning Greaves" is scored
  Then its protection bonus is a sixteenth of the full bonus, not none
```

## Rule: Card advantage keeps pace with the draft

Card advantage is a `fundamentals bucket` too, the same for every deck: seven, the median of
EDHREC average decks counted the same way. A draw engine — a trigger or an activated
ability on a permanent that draws again and again, such as "Rhystic Study" or "Skullclamp"
— counts one; a one-shot that draws two or more, such as "Harmonize", counts a half and
earns half the bonus; a cantrip, looting, drawing for a discard, an ability that uses the
card itself up, and draw that goes to every player count nothing. The bonus keeps pace
like protection's: more behind pace, less ahead of it, never nothing. Card draw left the
role-gap term when it got its own bucket, as ramp did (`deck-draft/ADR-0013`).

```gherkin
Example: An engine counts more than a one-shot
  Given a deck short of card advantage
  When "Phyrexian Arena" and "Night's Whisper" are scored
  Then "Phyrexian Arena" gets twice the card-advantage bonus

Example: A cantrip is not card advantage
  Given a deck short of card advantage
  When "Ponder" is scored
  Then it gets no card-advantage bonus
```

## Rule: Tribal mode keeps creature slots on the chosen tribes

In the `customization` section below the bracket target, a **Tribal** checkbox turns on
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

The `customization` section also holds two checkboxes, both off by default: **Suggest
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

## Rule: Ramp is offered unless turned off

A **Suggest ramp** checkbox in `customization` is on by default. While it is off, no
lasting ramp is offered — not as a commander, not in any slot, even when it fits the theme.
Lasting ramp is what the ramp score reads (`deck-draft/ADR-0009`): a mana ability that
makes more mana than it costs without using anything up, an extra land drop each turn, or a
land put onto the battlefield. Treasure makers and one-shot mana spells are still offered. Turning it on or
off while drafting re-offers the current round at once.

```gherkin
Example: Ramp is offered by default
  Given a draft whose commander is "Lathril, Blade of the Elves"
  When rounds are suggested
  Then mana Elves such as "Llanowar Elves" can be offered

Example: Turning ramp off leaves it out
  Given a draft with "Suggest ramp" on
  When the author turns it off
  Then no card with a lasting mana ability or land search is offered
  And the current round is re-offered
```

## Rule: Among comparable fits, more-played cards rank higher

When two candidates fit the theme about equally, the one that is more played wins. The
`synergy score` has no play-rate data to read, so a card's reprint count stands in for
popularity, counting the larger of a card's printings and its set codes: it both fills each
theme's candidate pool with the most-printed matches and tilts the final ranking toward
them (`deck-draft/ADR-0002`). It is a nudge over comparable fits, not an override — a
clearly stronger theme match still leads.

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
in this draft; the blacklist is not shown. A card already in the deck is never suggested — a
two-sided card such as Depose // Deploy included, whichever of its names it is known by.
Adding a card ends the round. The next ranking
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

Example: A two-sided card in the deck is not suggested again
  Given the author added Depose // Deploy to the deck
  When later rounds are offered
  Then Depose // Deploy is not among the suggestions

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
