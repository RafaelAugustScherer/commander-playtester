---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Score ramp by mana appetite

## Context and Problem Statement

Ramp earned only the generic role-gap term: a flat 2 that halved with each ramp card in the
deck, whatever the deck. Theme scores grew with `deck-draft/ADR-0005` and
`deck-draft/ADR-0008`, so ramp fell out of the rankings. In an Elf draft under Lathril or
Voja, none of 60 offers over 20 rounds was ramp. Elvish Mystic scored about 14 against
about 40 for Elf lords, and Llanowar Elves, Sol Ring and Rampant Growth were not offered.

Ramp detection also missed common wordings: "add one mana of any color" (Arcane Signet),
"add an amount of {G}" (Marwyn), tapping other creatures for mana (Jaspera Sentinel), and
searches for a basic land type (Nature's Lore, Three Visits).

## Considered Options

- **Ramp quota**: reserve a round slot for ramp while the deck is behind a ramp target.
- **Additive ramp score**: replace the flat term with a bonus that grows with how much mana
  the deck wants to spend.
- **Ramp as a theme token**: match mana wording between the commander and candidates.

## Decision Outcome

Chosen: **additive ramp score**, at the author's request, with a threshold so that not
every deck wants ramp. The score is paced so ramp spreads across the draft, and it is
shaped by colour, also at the author's request. A theme token was rejected: a commander
that adds {B} does not make other mana cards fit its plan.

- **One ramp reading**, `src/lib/ramp.ts`, shared with goldfishing's ramp role. It sorts a
  card's rules text (reminder text dropped) into mana, land search, extra land drop or
  Treasure.
- **Lasting ramp**: a mana ability on a permanent that makes more mana than it costs, an
  extra land drop each turn, or a land put onto the battlefield (by any card, sorceries
  included).
  - Signets and ramp Auras count; Prophetic Prism does not.
  - A choice ("{R} or {G}") counts as one mana.
  - A cost that discards the card itself (Channel) is not lasting.
  - Treasure-only cards, one-shot spells and mana filters are not lasting ramp: a Treasure
    is a single mana once, and a filter adds none. Treasure decks still find Treasure
    makers through the `treasure` theme token.
- **Mana appetite**: the average, over the deck's nonland cards other than lasting ramp, of
  the higher of mana value and priciest activated ability, keyword costs such as Equip
  included ({X} counts as 3). The commander counts `COMMANDER_WEIGHT` times. Leaving ramp out keeps cheap rocks and dorks from
  lowering the deck's own need for ramp.
- **Need**: 0 at an appetite of 2.5 or less, rising linearly to 1 at 4.5.
- **Speed**: 1 for ramp costing two or less, ½ at three, 0 from four.
- **Tribe**: up to ×1.5 when the card's mana ability names a tribe the deck has
  ("Add {G} for each Elf"). The bonus grows with the tribe on `tribal payoff`'s saturation,
  and is full for a tribe chosen in tribal mode. Priest of Titania and Elvish Archdruid
  qualify; a card naming a tribe outside its mana ability does not.
- **Colour**: ×¼ for creature ramp in a deck without green.
- **Pace**: the deck should hold 10 lasting ramp cards by its 63rd nonland card, in
  proportion along the way. Room is 1 while the deck is at or behind that pace and fades
  to 0 two cards ahead.
- Bonus = 25 × need × speed × tribe × colour × room. Ramp leaves the role-gap term.

The colour rule follows EDHREC. Among the top ~100 nonland cards of each commander:

| Commanders | Creature ramp | Artifact ramp | Land-search sorceries |
|---|---|---|---|
| Hylda (WU), Mizzix (UR), Krenko (R), K'rrik (B) | 0–2, all on theme (Skirk Prospector, Blood Celebrant) | 7–11 | 0 |
| Lathril (BG), Voja (WRG), Meren (BG) | 11–17 | 2–6 | 2–6 |

Without the colour rule, K'rrik's top nine creatures were all colourless mana creatures
(Millikin, Palladium Myr), which its EDHREC list does not play.

Calibrated on nine commanders: the seven of `deck-draft/ADR-0008`, Voja (Elves and Wolves)
and K'rrik (mono-black). Each is seeded with its two most-included EDHREC cards that are not
ramp, so pacing starts from an empty ramp count. Results are measured against its 60
most-included nonland EDHREC cards, over a 30-round draft that takes the most-included
offer.

| Ramp scoring | Top-12 hits (of 540) | Median reference rank | Draft hits (of ~747) | Ramp in decks |
|---|---|---|---|---|
| flat role gap (before) | 49 | 96 | 35 | 31 |
| appetite, room by raw count | 79 | 89 | 37 | 46 |
| + pace, colour, net mana; fade over 1 card | 83 | 87 | 33 | 41 |
| + pace, colour, net mana; fade over 2 cards | 83 | 87 | 35 | 42 |
| **+ shared reading, tribe in the mana ability, keyword costs** | **82** | **88** | **35** | **43** |

The weight was set on an earlier eight-commander, 10-round run: 25 beat 15 and 20 on
top-12 hits and matched 30. A threshold of 3 scored lower than 2.5 at every weight. Before
Treasure-only and one-shot ramp were excluded, the bonus offered Fake Your Own Death, Seize
the Spoils and Battle Angels of Tyr over real ramp, and draft hits fell.

### Consequences

- Good: top-12 hits go 49 → 82 with draft hits unchanged (35). Atraxa goes 2 → 10, Mizzix
  2 → 10, Voja 3 → 10 and K'rrik 1 → 4.
- Good: in the Elf drafts, Sol Ring is Lathril's first artifact, and Rampant Growth, Farseek
  and Nature's Lore lead Voja's sorceries. Priest of Titania and Elvish Archdruid are top ten
  among creatures.
- Good: over 40 rounds, Lathril takes ramp in rounds 2, 4, 9, 21, 25 and 38, rather than
  only the first ones.
- Bad: themed artifacts can still beat Sol Ring once a deck's appetite falls. K'rrik takes
  Mind Stone in round 2 and its next mana rock only late.
- Bad: land swaps such as Crop Rotation count as lasting ramp because they put a land onto
  the battlefield.
- Neutral: goldfishing's ramp count reads the same text, so it now counts ramp Auras and
  basic-type land searches, and no longer counts mana filters.
- Neutral: the type mix is unaffected — `npm run draft-balance` mean error per type 2.16.

### Confirmation

- `src/draft/scoring.test.ts` covers:
  - the threshold and growth with the commander's cost
  - speed, the colour rule and the pace
  - the tribe bonus, which grows with the tribe and counts only tribes the mana ability
    names
  - lasting versus Treasure-only and one-shot ramp
  - ramp leaving the role-gap term
- `src/lib/ramp.test.ts` covers the ramp reading: lasting ramp, "or" choices, Channel,
  keyword and activation costs.
- `src/lib/goldfish.test.ts` covers goldfishing's ramp count reading the new wordings.
- `src/draft/themes.test.ts` covers mana appetite and the ramp count.
- `src/lib/roles.test.ts` covers the new ramp wordings.

## More Information

Answers the consequence of `deck-draft/ADR-0008` that ramp staples, carrying no theme
token, ranked lower than themed cards.
