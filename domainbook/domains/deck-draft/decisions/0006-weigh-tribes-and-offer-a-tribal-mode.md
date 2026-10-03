---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Weigh tribes and offer a tribal mode

## Context and Problem Statement

Since `deck-draft/ADR-0005` a creature type counts as a `theme token` whether a card *is*
of it or *names* it, and each drafted card adds one to its tokens. Measured on the real
engine data (Omnath, Locus of Mana with 0 to 10 Elves drafted), that made an Elf lord
("Other Elf creatures you control get +1/+1") worth exactly a plain Elf: 10.7 against
10.3 with ten Elves. Nothing rewarded a card for paying off the tribe the deck was
building, and incidental types counted like real tribes (Hylda of the Icy Crown's drafts
reached a `human` weight of 18 without being a Humans deck).

The author also wanted a direct way to build a tribal deck — pick the tribes and see only
their creatures — and fewer bracket buttons.

## Considered Options

- **Tribal payoffs** — how a lord's bonus should grow with the tribe: linear,
  accelerating, or saturating; and what keeps incidental tribes out: a minimum count, the
  tribe's share of the deck's creatures, or nothing.
- **Tribal mode** — a separate toggle or another bracket option; creature slots only, or
  other slots too; tribes picked by hand or pre-filled from the commander.

## Decision Outcome

The author chose each of the following.

- **Tribal payoff bonus**: a card whose rules text names a creature type scores
  `6 × share × (1 − e^(−count / 3))` for each such type, where `count` is the deck's
  creatures of that type (commander included) and `share` is `count` over all its
  creatures. The share keeps incidental tribes small; the exponential levels off after a
  handful. Being of the type adds nothing here, so a lord outranks a plain member. The
  weight (6) was calibrated to the author's "moderate": with ten Elves, an Elf lord scores
  15.9 against a plain Elf's 10.3 (1.5×).
- **Tribal mode** is a toggle beside the bracket buttons, independent of the target.
  While it is on:
  - every creature slot offers only creatures of the chosen types; a Changeling counts as
    every type;
  - the candidate pool adds each chosen type's most-printed members, the cards that name
    it, and the Changelings, whatever the theme tokens say;
  - in any slot, a card that names a chosen type or is Kindred of it scores 5 more. The
    author asked for "extra weight" without a size; 5 matches the reward weight of
    `deck-draft/ADR-0005`.
  The author picks the tribes by hand, typing to get suggestions from the creature-type
  list (`src/draft/creatureTypes.ts`). Changing them while drafting re-offers the current
  round; turning the mode off keeps them for later.
- **Bracket targets**: only Focused (default), Optimized and cEDH are offered. Exhibition
  and Core stay in the engine's estimate shown in the summary, but are no longer targets.

### Consequences

- Good: lords and payoffs rise with the tribe the deck is building, and a tribal deck can
  be drafted on purpose. On the real data, tribal mode with Elf for Omnath, Locus of Mana
  offered 24 of 24 creatures as Elves and 39 of 53 other non-land cards that name Elves
  or are Kindred Elves (30 rounds, first card taken). With Bird for Hylda, every creature
  offered was a Bird while her tap cards kept their slots.
- Good: tribal drafts stay on their tribe even with tribal mode off. In `npm run
  draft-balance` (random picks), Krenko's drafted creatures went from 16 to 27 Goblins out
  of 37 and Lathril's from 22 to 23 Elves; the type mix held (mean error 2.08 → 2.06).
- Good: incidental tribes barely count — six Humans in thirty creatures give a Human lord
  +1.0, against +3.0 for an Elf lord with five Elves in eight.
- Bad: a strict filter can run a creature slot dry for a small tribe in narrow colours; the
  round then offers fewer than three cards.
- Bad: two more weights to tune (6 and 5), each calibrated on one or two commanders.

### Confirmation

`src/draft/scoring.test.ts` covers the payoff bonus (naming beats being, growth that
levels off, share of the deck) and the tribal-mode bonus; `src/draft/tokens.test.ts` tribe
membership and Changelings; `src/draft/draftSession.test.ts` how tribal mode reaches the
ranker; `src/engine/draftRanking.test.ts` that a creature slot offers only the chosen
tribe. `npm run draft-balance` still passes with tribal mode off.

## More Information

Builds on the named tribes of `deck-draft/ADR-0005` and the type-line retrieval of
`deck-draft/ADR-0004`; the bracket steering itself is unchanged from `ADR-0009`.
