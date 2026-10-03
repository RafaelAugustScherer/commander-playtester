---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Weight what the commander rewards

## Context and Problem Statement

Drafting Hylda of the Icy Crown — "Whenever you tap an untapped creature an opponent
controls, you may pay {1}. When you do, choose one — create a 4/4 Elemental; put a +1/+1
counter on each creature you control; scry 2, then draw a card" — offered nothing that taps
creatures. Measured on the real engine data (30 rounds, the first card taken each round),
0 of 74 non-land offers tapped a creature. Two causes:

- **No `theme token` read the mechanic.** Hylda's tokens were `human`, `warlock`,
  `+1/+1 counter`, `create token` and `draw a card`: her trigger's *rewards*, not its
  *condition*. The same held for many commanders. Across the 4,195 commander-eligible cards,
  the token list had nothing for attack triggers (216 commanders), Equipment (111), Clues,
  Food and Blood (92), Vehicles (86), scry (83), Auras (66), spells that target your
  creatures (63), dies (47), copied spells (44), enters (43), goad (33), blink (21) or
  defenders (18). About 900 commanders name a tribe they are not ("an Angel, Demon, or
  Dragon creature card"); only type-line subtypes became tokens.
- **A mechanic token alone loses.** Adding a tap token at the commander's weight still
  offered 0 of 74: it scored 3 against cards that matched three or four generic reward
  tokens. The generic tokens also gained weight with every drafted card, so the draft
  drifted further from the commander with each pick.

## Considered Options

- **Add mechanic tokens only**, at the existing weights.
- **Add mechanic tokens and weight what the commander rewards** — the tokens named in its
  "whenever …" trigger conditions and the tribes its text names — above its other tokens.
- **Also weight the rewards down**, the tokens that appear only in a trigger's effect.

## Decision Outcome

Chosen: **add mechanic tokens and weight what the commander rewards**, at a moderate
strength.

- **New tokens**: `tap creature`, `etb` (enters triggers and blink), `dies`, `attacks`,
  `targets` (heroic), `aura`, `equipment`, `vehicle`, `defender`, `goad`, `scry`, `clue`,
  `food`, `blood`, `copy spell`, `energy`, `experience counter`, `counters` (named kinds
  other than ±1/±1) and `legendary`.
- **Named tribes**: a creature type the rules text names is a token, as a type-line subtype
  already was. Only capitalised mentions count, and not those in the card's own name, in
  tokens it creates, or in "non-" exclusions. The list of types is the Comprehensive Rules
  list (205.3m), kept in `src/draft/creatureTypes.ts`.
- **Enablers**: some text fits a token without signalling it — a creature's own enters or
  dies trigger, a pump spell for `targets`, a legendary type line, proliferate for
  `counters`. Such a card scores for that token but adds nothing to the deck's theme, so
  drafting ten creatures with enters triggers does not turn a deck into blink.
- **Reward weighting**: on top of `commander weighting` (3), each token the commander
  rewards gets 5 more. "Whenever" clauses count, one-shot "when" clauses don't: an enters
  trigger on the commander is not its plan.
- **Pool per mechanic**: a curated token searches its own words (`tap` for `tap creature`)
  and keeps the most-printed rows its pattern really matches, so the pool is the most-played
  fits rather than an alphabetical or name-only match ("Tapestry").

The alternatives were rejected:

- **Tokens only** measured 0 of 74 for Hylda — the problem as reported.
- **Weighting the rewards down** was not needed to reach the target, and the rewards are
  still a fair, weaker signal of what the deck does.

The user chose the strength: about 60% of Hylda's offers on her mechanic, leaving room for
ramp, removal and draw. A reward weight of 3 gave 34% once the wider token list was in;
5 gives 57%; 8 gives every offer.

### Consequences

- Good: commanders are offered their own mechanic. Same protocol as above (30 rounds,
  first card taken; non-land offers that fit the mechanic, before → after): Hylda tap
  0 → 42 of 74, Judith dies 3 → 40, Brago enters and blink 15 → 22, Aurelia attacks 1 → 7,
  Feather targets 0 → 12, Sram Auras 1 → 38, Wyleth Equipment 0 → 62, Depala Vehicles
  12 → 30 (Dwarves take the rest), Arcades defender 0 → 59, Elminster scry 0 → 75,
  Alquist Proft Clues 25 → 61, Gyome Food 19 → 59, Kalamax copied spells 0 → 69, Jodah
  legendaries 18 → 40, Kaalia Dragons 1 → 41, Abomination of Llanowar Elves 1 → 73.
- Good: tribal drafts stay on the tribe. In `npm run draft-balance` (random picks),
  Lathril's drafted creatures went from 9 to 22 Elves out of 37, Krenko's from 12 to 16
  Goblins — the mid-draft drift `deck-draft/ADR-0004` left open is much reduced. The type
  mix is unchanged (mean error 2.14 → 2.08 per type).
- Bad: a mechanic the commander pays out rather than rewards stays a plain token. Marisi
  goads when combat damage is dealt, and combat damage has no token, so its goad offers
  went 5 → 0 of 71; Satya's energy stayed at 0 of 71. Reminder text counts like rules
  text, so a Clue's "draw a card" reads as draw.
- Bad: more tokens are more clusters for a draft to drift into. Each pattern is a maintenance
  surface, and the reward weight (5) is calibrated on one commander.
- Neutral: the patterns cost about three times as much per card, so a card's tokens are
  memoised; a full `npm run draft-balance` takes as long as before.

### Confirmation

`src/draft/tokens.test.ts` covers each new token, the enabler split, named tribes and the
rewarded tokens; `src/draft/themes.test.ts` the reward weighting; and
`src/engine/draftRanking.test.ts` that a mechanic's pool reaches a tapper past 300 popular
cards whose names only contain "tap". `npm run draft-balance` still passes its type-lean
assertions and prints the tribal counts.

## More Information

Extends the **Rank** step of `deck-draft/ADR-0001` and the **Narrow** step of
`deck-draft/ADR-0004`; the `theme token` list is the lever that ADR names.
