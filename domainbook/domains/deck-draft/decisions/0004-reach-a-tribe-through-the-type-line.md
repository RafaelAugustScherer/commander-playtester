---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Reach a tribe through the type line

## Context and Problem Statement

A card's subtypes are `theme token`s, so an Elf commander makes "elf" one of the
strongest tokens. But the theme pool searched those tokens with `search_cards_js`'s free
text, which matches rules text and names, not type lines. Measured on the real engine
data, it reached 112 of the 724 Elves in the card data, 290 of 578 Goblins and 78 of
1,324 Wizards. It also matched inside other words ("Angelfire", "Shelf" for "elf"). Tribal
commanders such as Lathril, Blade of the Elves could not be offered most of their tribe.

## Considered Options

- **Text search only**, as before.
- **Type-line search for every subtype token.**
- **Type-line search for the subtypes the deck's rules text names.**
- **Keep creature slots on the tribe**, by reserving a share of them or boosting the
  tribe's token weight.

## Decision Outcome

Chosen: **type-line search for the subtypes the deck's rules text names.**

- A top `theme token` that is a subtype, and that the commander's or a drafted card's
  rules text names ("Elves you control", "Goblin creature tokens", plurals included), also
  pulls the most-printed Commander-legal cards with that subtype in the commander's
  `color identity` (`search_cards_js` with `type_line`, which accepts subtypes).
- Subtypes nothing names stay text-only. Mizzix of the Izmagnus is a Human Wizard whose
  text names neither, so her creature slots are not flooded with the 4,501 Humans.

The alternatives were rejected:

- **Text search only** misses most of a tribe.
- **Every subtype token** would pull a commander's incidental types (Human, Warrior,
  Noble) as if they were its theme.
- **Keeping creature slots on the tribe** would change the ranking of every tribal deck;
  it was left for later, and retrieval alone was taken first.

### Consequences

- Good: tribal decks are offered more of their tribe early. In the simulated drafts (`npm
  run draft-balance`, random picks), Lathril's first third of creature offers went from 7
  to 13 Elves out of 31, and Krenko's from 31 to 34 Goblins out of 40.
- Bad: offers still drift off the tribe mid-draft. Each drafted card adds weight to its own
  tokens, so Treasure and token-making creatures outscore the tribe; Lathril's middle
  third of creature offers held no Elves before or after. The drafted decks ended with 9
  Elves (was 6) and 12 Goblins (was 9) out of 37 creatures.
- Bad: subtypes in `type_line` were found by introspection, like the other filters, and
  must be re-checked when the engine is re-pinned (`TDR-0001`, `docs/engine-upgrade.md`).

### Confirmation

`npm run draft-balance` prints how many of Lathril's creatures are Elves and how many of
Krenko's are Goblins. If the engine stops reading subtypes in `type_line`, those counts
fall back to the text-only numbers.

## More Information

Extends the **Narrow** step of `deck-draft/ADR-0001`, next to the per-type retrieval of
`deck-draft/ADR-0003`.
