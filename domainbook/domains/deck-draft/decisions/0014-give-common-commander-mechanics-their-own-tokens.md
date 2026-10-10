---
status: accepted
date: 2026-10-10
decision-makers: [RafaelAugustScherer]
---

# Give common commander mechanics their own tokens

## Context and Problem Statement

`deck-draft/ADR-0013` left several mechanics without a `theme token`, so a commander built
on one drafted as if it had no theme. Examples were combat damage to a player, "can't be
blocked", noncreature spells and anthems. 454 of the 3,538 commander-eligible cards
produced no token of their own. The author asked for every mechanic still unscored to get
a token, so that it shows up in the suggestions of decks that need it and improves how
they are scored.

A scan of the card data listed the mechanics commanders build around that no token read.
Twenty commanders, each built on one of them, were benchmarked against EDHREC as in
`deck-draft/ADR-0011`:

| Commander | Mechanic | Commander | Mechanic |
|---|---|---|---|
| Edric | combat damage | Vito | drain |
| Satoru Umezawa | ninjutsu | Prosper | impulse draw |
| Yuriko | ninjutsu | Alandra | extra draw |
| Thada Adel | evasion | Captain Sisay | tutor |
| Kykar | noncreature spell | Brokkos | mutate |
| Elsha of the Infinite | noncreature spell | Hakbal | explore |
| Jetmir | anthem | Teysa Karlov | dies |
| Adeline | anthem | Aesi | lands matter |
| Brudiclad | clone | Lord Windgrace | lands matter |
| Zaxara | x spell | Derevi | untap |

With the tokens added as plain readings, each mechanic surfaced strongly. For example,
Edric's offers that fit combat damage rose from 14 to 81 of 83. But EDHREC alignment fell:
Top went from 67 to 57 of 400, and mean inclusion from 11.1% to 9.8%. Four readings of a
commander's own text caused most of the loss. Each was checked against the EDHREC top 60
of the 75 commanders fetched:

- **Combat damage.** Commanders that trigger on other creatures connecting (Edric, Yuriko,
  Marisi) play 9.2 fitting cards in their top 60. Those that trigger only on their own
  combat damage play 5.5, ranging from Ragavan's 14 to Lathril's 2. The average over all
  75 is 3.3. The payoffs pulled in, such as the Swords, are played by none of Derevi's or
  Yuriko's decks.
- **Evasion from spells.** Charms that grant fear for a turn took Yuriko's instant slots
  from Misdirection and Counterspell. Yuriko's top 60 holds no such spell.
- **Tutor.** Commanders that tutor play 2.5 tutors in their top 60, against 1.9 on
  average, while Derevi plays 10. Captain Sisay's tutoring pulled in Search for Glory and
  Tamiyo's Journal (0%).
- **Untap.** Commanders with a non-mana tap ability play 2.2 untappers, against 1.0 on
  average. Commanders with their own untap effect (Derevi, Zacama) play 0.5.

Brokkos's deck is built on mutate: 21 of its top 60 cards. But its mutate was only an
effect (weight 3), and Brokkos got no mutate offers at all.

## Considered Options

- **Narrow a commander's own reading** (any combination):
  - its trigger on its own combat damage does not seed `combat damage`;
  - one-shot spells that grant evasion do not count as `evasion`;
  - a commander that tutors does not seed `tutor`;
  - a non-mana tap ability rewards `untap`, and the commander's own untap effect does not
    seed it.
- **Mutate**: reward a commander's own mutate, or leave it an effect.
- **The remaining gap**:
  - accept it and document it;
  - test a lower commander-effect weight for the new tokens;
  - seed the new tokens only from what a commander rewards.

## Decision Outcome

The author chose three of the four narrowings (all but evasion from spells), a mutate
reward through a generic rule that names no cards, and to accept and document the
remaining gap.

**New tokens** (`src/draft/tokens.ts`). The commander counts give how many of the 3,538
commander-eligible cards seed each token as an effect (weight 3), and how many reward it
(5 more).

| Token | Reads | Also fits | Commanders (effect / reward) |
|---|---|---|---|
| `combat damage` | "deals combat damage to a player / an opponent / one of your opponents" | an evasive creature (enabler); `evasion` (partner) | 114 / 106 |
| `evasion` | "can't be blocked"; fear, intimidate, shadow, skulk, horsemanship, landwalk | — | 108 / 2 |
| `ninjutsu` | ninjutsu | `evasion` (partner) | 6 / 6 |
| `noncreature spell` | casting or copying noncreature spells; prowess. Not countering, targeting or taxing them | every noncreature, nonland spell (type line) | 106 / 58 |
| `second spell` | "second spell" each turn | `cost reduction` (partner) | 23 / 22 |
| `extra draw` | "second card" drawn each turn | `draw a card` (partner) | 23 / 23 |
| `anthem` | "creatures / tokens you control get +N/+N" | `create token` (partner) | 92 / 0 |
| `drain` | an opponent or each other player losing life | — | 95 / 0 |
| `impulse draw` | exiling the top card to play it, or playing cards from exile | — | 76 / 10 |
| `lands matter` | "lands you control" (plural), land cards from a graveyard, playing lands from somewhere | `landfall` (partner) | 50 / 0 |
| `clone` | a copy of a creature | — | 77 / 0 |
| `x spell` | "{X} in its mana cost", "spells with {X}" | a card with {X} in its mana cost | 8 / 3 |
| `untap` | untapping a target, all or several | — | 0 / 348 |
| `tutor` | searching the library for a card that is not a land | — | 0 / 0 |
| `mutate` | mutate | — | 6 / 6 |
| `explore` | explore | — | 6 / 1 |

`dies` also reads Teysa's "a creature dying causes…", and rewards it. Improvise reads as
`artifact`. A card's {X} comes from the engine's mana-cost shards, or from Scryfall's mana
cost (`Card.hasXCost`).

**A commander's own text is read with each token's `commanderPattern`**, when the token
has one. It is matched against the text with the commander's short name read as "~"
("Thada Adel", "Lathril"):

- `combat damage` leaves out "~ deals combat damage". A commander that triggers on its own
  combat damage already wants to connect, which raises its protection target
  (`deck-draft/ADR-0013`). Edric's and Yuriko's triggers on other creatures still seed it.
- `tutor` is never seeded by a commander. A commander that tutors is its deck's tutor, as
  a commander that ramps is its ramp (`deck-draft/ADR-0009`). Tutors enter the theme only
  through the 99.
- `untap` is never seeded by a commander's own untap effect. Instead, a non-mana activated
  ability with {T} in its cost rewards it, since untapping repeats that ability.

**A mechanic the commander carries as a keyword ability is rewarded.** The rule is
generic: a line that holds only a keyword and its mana cost ("Mutate {2}{U/B}{G}{G}",
"Commander ninjutsu {U}{B}") rewards the token of that name. Keywords that only describe
the commander (flying, hexproof, ward, protection) are left out, as `deck-draft/ADR-0010`
left them out of its theme. The same list now holds the evasion keywords, so Thada's
islandwalk no longer reads as an `evasion` theme.

**Calibration.** The twenty mechanic commanders are seeded with their two most-included
non-ramp EDHREC cards, like the twelve of `deck-draft/ADR-0011`. **Mean inclusion** is the
average EDHREC share of the top four suggestions per nonland type. Unlike Top, it also
credits on-theme cards played at 10–30%.

| Variant (twenty mechanic commanders) | Top (of 400) | Mean inclusion | Draft (of 360) |
|---|---|---|---|
| 0.39.0 (`deck-draft/ADR-0013`) | 67 | 11.1% | 44 |
| tokens added | 57 | 9.8% | 43 |
| + own combat trigger | 59 | 10.0% | — |
| + tutor like ramp | 59 | 10.0% | — |
| + untap from tap abilities | 58 | 9.8% | — |
| + no evasion from spells | 59 | 10.1% | — |
| + all four | 64 | 10.6% | — |
| **chosen: three narrowings and the mutate reward** | **64** | **10.5%** | **50** |

| Variant (twelve `deck-draft/ADR-0011` commanders) | Top (of 240) | Mean inclusion | Draft (of 360) | Protection | Off target | Card advantage | Ramp |
|---|---|---|---|---|---|---|---|
| 0.39.0 | 55 | 14.9% | 51 | 4.8 | 1.89 | 12.3 | 6.7 |
| **this ADR** | **53** | **14.5%** | **50** | **4.5** | **2.16** | **12.1** | **6.5** |

The bucket columns come from the same 22 random-pick drafts as in `deck-draft/ADR-0013`.

This table gives each commander's offers over 30 draft rounds that fit its mechanic,
0.39.0 → this ADR:

| Commander | Fit | Commander | Fit |
|---|---|---|---|
| Edric | 14 → 81 of 83 | Vito | 63 → 76 of 87 |
| Satoru | 4 → 74 of 83 | Prosper | 31 → 76 of 83 |
| Yuriko | 4 → 50 of 82 | Alandra | 35 → 78 of 87 |
| Kykar | 61 → 78 of 82 | Teysa | 2 → 52 of 83 |
| Elsha | 55 → 79 of 82 | Aesi | 16 → 49 of 83 |
| Brudiclad | 11 → 30 of 79 | Windgrace | 0 → 5 of 80 |
| Zaxara | 0 → 56 of 82 | Brokkos | 0 → 5 of 82 |
| Jetmir | 19 → 22 of 80 | Hakbal | 0 → 0 of 83 |
| Adeline | 73 → 74 of 87 | | |

Sisay's tutor, Derevi's untap and Thada's evasion stay at 0 by these decisions.

### Consequences

- Good: the mechanics surface in the decks built on them. Draft hits on the twenty rise
  from 44 to 50; Brokkos alone goes from 1 to 7.
- Good: the commanders that seed no token of their own fall from 454 to 395.
- Good: each narrowing wins back a commander without a list of names. Against the tokens
  added alone, Thada's Top goes from 0 to 2, Sisay's from 4 to 7, and Brokkos's from 6 to 8.
- Bad: Top on the twenty is still below 0.39.0 (67 to 64), and mean inclusion too (11.1% to
  10.5%). Themed cards take places that EDHREC's lists give to staples such as Sol Ring and
  Rampant Growth. Some commanders' decks don't follow their text at all:
  - Derevi (Top 6 → 2) is played as stax and tutors, not for combat-damage payoffs;
  - Zaxara (6 → 2) loses ramp staples to X spells;
  - Windgrace (5 → 3) gets weak lands-matter cards;
  - Lathril's ten-Elves drain pulls drain cards over mana rocks (Top 6 → 4).

  The author accepted this and left it as an open question.
- Bad: on the twelve, Top falls from 55 to 53, Draft from 51 to 50 and protection from 4.8
  to 4.5 per deck, because more themed cards outscore protection.
- Neutral: `untap` is now rewarded by 348 commanders with a tap ability, the broadest new
  reward. Krenko, Lathril, Chulane and Vraska are among them.
- Neutral: `tutor` is never seeded by a commander, so tutors gather only from the 99, as
  ramp did before its bucket.
- Bad: tribes lose ground to the commander's own drain. In `npm run draft-balance` (random
  picks), Lathril's Elves fall from 21 to 11 of 37 creatures. Of its creature offers, 33%
  are Elves, against 46% before; most of the others are drain creatures (Sanctum Seeker,
  Urborg Syphon-Mage, Mirkwood Bats). Without the drain its ten-Elves ability seeds, the
  draft holds 16. Krenko's Goblins hold at 21 of 36, though their share of creature offers
  dips from 61% to 56%.
- Good: the type mix in `npm run draft-balance` comes closer to EDHREC. Mean error per
  type goes from 2.33 to 2.24.
- Bad: `explore` gives Hakbal no explore offers, because its Merfolk tribe outweighs it.
  `mutate` gives Brokkos only 5 of 82, though its Draft hits rise.

### Confirmation

- `src/draft/tokens.test.ts`:
  - "mechanics from deck-draft/ADR-0014": what each new token reads and leaves out (taxing
    or countering noncreature spells, land tutors), and evasive creatures, noncreature
    spells and {X} costs fitting without signalling;
  - "what a commander's own text seeds": its own combat trigger, tutoring, a tap ability
    against an untap effect and a mana ability, mutate and commander ninjutsu as keywords,
    and its own evasion keyword.
- `src/lib/scryfall.test.ts` and `src/engine/draftRanking.test.ts`: {X} read from the mana
  cost, from Scryfall and from the engine's shards.
- `npm run draft-balance` still passes its type-lean assertions.

## More Information

- Extends the token list of `deck-draft/ADR-0001` and resolves `deck-draft/ADR-0013`'s open
  question on mechanics with no token.
- Refines what a commander rewards (`deck-draft/ADR-0005`) and the keyword lines it leaves
  out (`deck-draft/ADR-0010`). Applies `deck-draft/ADR-0009`'s reasoning on ramp to tutors.

The open questions it leaves:

- commanders whose own effect seeds a token their decks don't follow (Derevi, Lathril,
  Zaxara, Windgrace);
- mechanics still without a token: casting any spell or a creature spell, becoming tapped,
  being dealt damage, the Ring, crimes, and keywords such as cascade, foretell and morph.
