---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Score ramp by mana appetite

## Context and Problem Statement

Ramp earned only the generic role-gap term, a flat 2 that halved with each ramp card in the
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
every deck wants ramp. A theme token was rejected: a commander that adds {B} does not make
other mana cards fit its plan.

- **Mana appetite**: the average, over the deck's nonland cards, of the higher of mana
  value and priciest activated ability ({X} counts as 3), with the commander counted
  `COMMANDER_WEIGHT` times.
- **Need**: 0 at an appetite of 2.5 or less, rising linearly to 1 at 4.5.
- **Speed**: 1 for ramp costing two or less, ½ at three, 0 from four.
- **Tribe**: ×1.5 when the ramp card names a tribe the deck has (Priest of Titania,
  Elvish Archdruid).
- **Room**: fades linearly to 0 as the deck's ramp count reaches 10.
- Bonus = 25 × need × speed × tribe × room. Ramp leaves the role-gap term.
- Only **lasting ramp** gets the bonus: a mana ability on a permanent, an extra land drop
  each turn, or a land put onto the battlefield (by any card, sorceries included).
  Treasure-only cards and one-shot spells get none, because a Treasure is a single mana
  once. Treasure decks still find them through the `treasure` theme token.

Calibrated on eight commanders: the seven of `deck-draft/ADR-0008` plus Voja (Elves and
Wolves). Each is seeded with its two most-included EDHREC cards and measured against its 60
most-included nonland EDHREC cards.

| Ramp scoring | Top-12 hits (of 480) | Median reference rank | Draft hits (of ~216) | Ramp offers |
|---|---|---|---|---|
| flat role gap (before) | 50 | 90.5 | 23 | 15 |
| any ramp role, no bonus from five mana, weight 25 | 58 | 75 | 19 | 71 |
| lasting ramp, weight 20 | 61 | 85 | 21 | 33 |
| **lasting ramp, weight 25** | **66** | **73.25** | **22** | **33** |
| lasting ramp, weight 30 | 66 | 72.5 | 22 | 38 |

A threshold of 3 instead of 2.5 scored lower at every weight. Before Treasure-only and
one-shot ramp were excluded, the bonus offered Fake Your Own Death, Seize the Spoils and
Battle Angels of Tyr over real ramp, and draft hits fell.

### Consequences

- Good: top-12 hits rise for six commanders and fall for none: Atraxa 1 → 5, Mizzix 2 → 6,
  Voja 3 → 6, Krenko 11 → 14. In the Elf drafts, Sol Ring is Lathril's first artifact,
  Rampant Growth, Farseek and Nature's Lore lead the sorceries, and Llanowar Elves rose
  from outside the top 25 to 14th among creatures. Ramp offers in 20 rounds went 0 → 8 (Lathril) and
  0 → 13 (Voja).
- Bad: draft hits are flat (23 → 22). Sythis loses two: Smothering Tithe makes only
  Treasure, so it lost the flat role-gap credit. It is first offered in round 7 instead of
  round 1, and so it is counted once instead of three times. It is still picked.
- Bad: land swaps such as Crop Rotation count as lasting ramp because they put a land onto
  the battlefield.
- Neutral: the type mix is unaffected — `npm run draft-balance` mean error per type 2.17.

### Confirmation

`src/draft/scoring.test.ts` covers the threshold, growth with the commander's cost, speed,
the tribe bonus, the fading room, lasting versus Treasure-only and one-shot ramp, and ramp
leaving the role-gap term. `src/draft/themes.test.ts` covers mana appetite and activation
costs. `src/lib/roles.test.ts` covers the new ramp wordings.

## More Information

Answers the consequence of `deck-draft/ADR-0008` that ramp staples, carrying no theme
token, ranked lower than themed cards.
