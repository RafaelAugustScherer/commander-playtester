---
status: accepted
date: 2026-10-06
decision-makers: [RafaelAugustScherer]
---

# Leave a commander's own body out of its theme

## Context and Problem Statement

A commander's `theme token`s weigh three times a card's from the 99
(`deck-draft/ADR-0005`). They included its own keyword line and its type-line subtypes,
neither of which the commander asks for: a commander that says "Flying" does not want
fliers, and a Bird Bard does not want Birds or Bards. `deck-draft/ADR-0004` and
`deck-draft/ADR-0006` already treat incidental creature types as noise, yet the commander's
own types and keywords were weighted at the commander's full weight.

## Considered Options

- **Leave the commander's tokens as they were.**
- **Take the commander's tokens from its rules text only, minus its keyword-only lines.**
- **Drop the commander's tokens other than what it rewards.**

## Decision Outcome

Chosen: **the commander's tokens come from its rules text, minus keyword-only lines, with
no type-line subtypes.**

- A line is keyword-only when, without its reminder text, it is a comma-separated list of
  evergreen keywords (flying, first strike, double strike, deathtouch, lifelink, trample,
  menace, haste, vigilance, indestructible, hexproof, reach, defender, flash, ward,
  protection from …). "Creatures you control have flying" is kept: it is what the
  commander gives. Reminder text stays on every other line.
- A tribe the rules text names ("Elves you control") is still a token; only the commander's
  own subtypes are not.
- Cards from the 99 keep their keywords and subtypes at weight 1, and the deck's creature
  types and creature count still count the commander.

Dropping everything but what the commander rewards was rejected: a commander's plain
mechanics ("create a token", "draw a card") are part of its plan.

### Consequences

- Good: a commander's theme is what its text asks for. A flying Bird Bard that counts
  creatures of base power 1 and gives creature spells offspring now weighs base power,
  creature-enters and token tokens, and nothing for flying, Bird or Bard.
- Bad: a commander whose type line is its plan and whose text never names it loses that
  signal; the author can pick the tribe in tribal mode (`deck-draft/ADR-0006`).

### Confirmation

`src/draft/tokens.test.ts` covers keyword lines, a kept tribe and a given keyword;
`src/draft/themes.test.ts` the commander's weights and the creature counts.

## More Information

Narrows the commander weighting of `deck-draft/ADR-0005`.
