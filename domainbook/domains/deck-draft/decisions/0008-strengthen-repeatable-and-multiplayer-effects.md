---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Strengthen repeatable and multiplayer effects

## Context and Problem Statement

A card's theme fit was the sum of the weights of the `theme token`s it carries, however it
carries them. "Tap target creature" on a sorcery and "Whenever another creature you control
enters, tap target creature an opponent controls" on a permanent scored the same, and so
did an effect on one opponent and one on all of them. In Commander, a four-player format
where a permanent keeps working for many turns, the second of each pair is far stronger.

Cards that stack several incidental tokens led the rankings, while the repeatable engines
that real decks play sat lower. In a Hylda of the Icy Crown draft the EDHREC staples Kapsho
Kitefins, Court Street Denizen, Opposition and Verity Circle — all repeatable tap engines —
lost to one-shot spells and creatures with many incidental tokens.

## Considered Options

- **Multiplayer reach only**: strengthen effects that reach every opponent ("each
  opponent", "your opponents").
- **Reach and frequency**: also strengthen repeatable clauses — "whenever" and "at the
  beginning of" triggers and activated abilities on a permanent — over one-shot ones.
- **A flat bonus per card** for multiplayer or repeatable wording, regardless of theme.

## Decision Outcome

Chosen: **reach and frequency**, applied per clause to the tokens that clause carries. The
author proposed reach; frequency was added because the staples above are repeatable engines,
not multiplayer effects.

- Each line of rules text (reminder text dropped) is a clause. A token's strength is that of
  the strongest clause that carries it; a token no single clause carries counts as 1.
- **Repeatable** (×1.5): a clause on a permanent that starts with "whenever" or "at the
  beginning of" (not "…the next…"), or an activated ability ("cost: effect"). Instants and
  sorceries are always one-shot.
- **Multiplayer** (×1.5): a clause naming "each opponent", "your opponents", "all opponents",
  "each other player", "whenever an opponent" or "at the beginning of each". Symmetric
  effects ("each player") are not strengthened, since they help opponents too.
- So "at the beginning of each end step" (×2.25) outranks "your end step" (×1.5), which
  outranks "your next end step" (×1).

A flat bonus was rejected: it would reward multiplayer wording on cards that do nothing for
the deck, which is the incidental stacking this ADR works against.

The multipliers were calibrated on seven commanders of different plans — Hylda (tap),
Lathril (Elves), Mizzix (spells), Sythis (enchantments), Meren (graveyard), Krenko (Goblin
tokens), Atraxa (counters) — seeded with the commander and its two most-included EDHREC
cards. Two measures against each commander's 60 most-included nonland EDHREC cards: hits
in each slot type's top 12 at the start, and hits among the offers of a 10-round draft that
takes the most-included offer.

| Repeatable × multiplayer | Top-12 hits (of 420) | Draft hits (of ~188) |
|---|---|---|
| 1 × 1 (before) | 44 | 13 |
| 1 × 1.5 | 43 | 18 |
| 1.5 × 1 | 46 | 16 |
| **1.5 × 1.5** | **47** | **21** |
| 2 × 2 | 44 | 25 |

1.5 × 1.5 improves draft hits for five commanders and lowers none. 2 × 2 gains more for
Hylda but costs Sythis and Krenko.

### Consequences

- Good: on-plan engines rise. Draft hits went 13 → 21; Hylda's Verity Circle moved from 5th
  to 2nd among enchantments and Opposition from 39th to 14th.
- Bad: cards with no theme token — ramp and removal staples such as Swords to Plowshares —
  gain nothing, so they rank lower relative to themed cards. The median rank of EDHREC
  reference cards within their type worsened (71.5 → 83.5), driven by those staples.
- Bad: one-shot payoffs lose ground to repeatable ones; Borrowing 100,000 Arrows fell from
  2nd to 5th among Hylda's sorceries.
- Neutral: the type mix is unaffected — `npm run draft-balance` mean error per type 2.16.

### Confirmation

`src/draft/tokens.test.ts` covers clause strengths: one-shot, repeatable, multiplayer, the
end-step ordering, reminder text and symmetric effects.

## More Information

Builds on `deck-draft/ADR-0005`, whose token weights these multipliers scale.
