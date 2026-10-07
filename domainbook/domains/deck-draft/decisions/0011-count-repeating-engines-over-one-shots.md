---
status: accepted
date: 2026-10-07
decision-makers: [RafaelAugustScherer]
---

# Count repeating engines over one-shots

## Context and Problem Statement

Hylda of the Icy Crown pays off tapping an opponent's creature, at {1} per trigger. The
motivating draft added Junk Winder, Kappa Cannoneer, Simic Manipulator and Brave the Sands,
then filled basics. Its first round offered Cryptic Command, Cryptex and Press for Answers.
Hylda's most-played EDHREC cards are engines that tap every turn:

| Card | EDHREC inclusion | Score before |
|---|---|---|
| Hylda's Crown of Winter | 93% | 29.0 |
| Sharae of Numbing Depths | 87% | 14.8 |
| Verity Circle | 84% | 20.0 |
| Opposition | 74% | 14.5 |
| Citadel Siege | 69% | 19.5 |
| Cryptic Command | 48% | 20.5 |

`deck-draft/ADR-0008` counts a repeatable clause ×1.5 and a clause reaching every opponent
×1.5. One-shot mass tapping ("Tap all creatures your opponents control") therefore scored the
same as an engine that taps every turn (Opposition). Several engines were also misread:

- Modal triggers lost their repetition. "At the beginning of combat on your turn, choose up to
  one — • Tap target creature" (Dreamshackle Geist) and a labelled mode ("• Dragons — At the
  beginning of combat on each opponent's turn, tap …", Citadel Siege) counted as one-shots.
- "Tap X target creatures" (Icy Blast) and "Whenever you tap one or more untapped creatures
  your opponents control" (Sharae) did not read as tapping.
- "Any opponent may tap an untapped creature they control" (Reservoir Kraken) read as tapping,
  though it never triggers Hylda.

Cryptex also got the full ramp bonus despite needing collect evidence for each mana. Junk
Winder's and Kappa Cannoneer's payoffs (tokens entering, artifacts entering) were not read.

## Considered Options

- **Paid-trigger tax**: when a commander's reward trigger costs mana each time, shrink a card's
  share of that token as its mana value plus the cost climbs (free to 4, ⅔ at 5, ½ at 6).
- **Count repeating engines more**: fix the misreads, and raise the repeatable strength so an
  engine outweighs a one-shot that reaches every opponent.

## Decision Outcome

Chosen: **count repeating engines more**, with repeatable strength 2 (multiplayer stays 1.5).
The paid-trigger tax was built and measured first, then dropped. It docked Opposition (14.5 →
10.0), Sharae, Citadel Siege, Sleep and Cone of Cold, which are all four-plus-mana Hylda
staples. Hylda's draft hits fell from 6 to 1.

- **Modes**: a "•" line takes the repeatability of the line that introduces it, after
  dropping a short mode label ("Khans —"). The modes of an instant or sorcery stay one-shot.
- **Tapping**: adds "tap X / two / three / four target …" and "tap one or more untapped …".
  Excludes "… they control" alongside "… you control".
- **Strength**: a repeatable clause ×2, a clause reaching every opponent ×1.5, both ×3.

The same change also:

- Stops counting a mana ability whose cost uses something up (sacrifice, exile, discard,
  collect evidence, removing counters) as lasting ramp (`deck-draft/ADR-0009`). Paying life,
  milling and tapping another creature still count.
- Reads "Whenever a token you control enters" as `create token` rather than `etb`.
- Lets artifacts and cards that create artifact tokens enable `artifact`
  (`deck-draft/ADR-0005`).

Measured on twelve commanders: Hylda, Urza, Krenko, Lathril, Mizzix, Teysa, Oloro, Emiel,
Sram, Chatterfang, Atraxa and Vraska, the Silencer. Each is seeded with its two most-included
EDHREC cards that are not ramp, pinned across runs. "Top" counts the top four suggestions of
each nonland type that are among the commander's 60 most-included nonland EDHREC cards. "Draft"
counts hits over 30 rounds that take the most-included offer. Every row includes the ramp and
enabler fixes except main.

| Variant | Top (of 240) | Draft (of 360) | Hylda top / draft |
|---|---|---|---|
| main | 57 | 45 | 6 / 6 |
| paid-trigger tax, repeatable 1.5 | 59 | 40 | 7 / 1 |
| paid-trigger tax, repeatable 2 | 59 | 44 | 7 / 3 |
| no tax, repeatable 1.5 | 60 | 47 | 7 / 8 |
| no tax, repeatable 1.75 | 62 | 46 | 8 / 7 |
| **no tax, repeatable 2** | **61** | **48** | **8 / 8** |
| no tax, repeatable 2.5 | 56 | 44 | 7 / 9 |

`deck-draft/ADR-0008` rejected 2 × 2 for costing Sythis and Krenko. With repeatable 2 and
multiplayer 1.5, Krenko keeps 9 top hits and its first twenty draft picks. Its draft dips 9 → 8,
from the artifact enablers. Sythis stays at 1 / 2. Talrand goes 2 / 2 → 1 / 1.

### Consequences

- Good: in the motivating draft, the round becomes Cryptic Command, Hylda's Crown of Winter
  (39.0) and Press for Answers, and Cryptex is gone. Sharae (40.0), Citadel Siege (38.0) and
  Timin (30.0) rise. Opposition goes 14.5 → 19.0, 5th among enchantments.
- Good: Hylda goes 6 / 6 → 8 / 8, Urza 3 → 5 top hits, and Sram, Vraska, Lathril, Emiel and
  Chatterfang each gain one.
- Bad: themed engines push some ramp staples out of the top four. Oloro loses Arcane Signet to
  Bontu's Monument, Atraxa Fellwar Stone to Staff of Compleation, Talrand Mind Stone to token
  engines. Teysa's draft dips 2 → 1.
- Bad: Cryptic Command still leads Hylda's instants (20.5). Its draw adds to its tap, and the
  better-played instants Blustersquall (overload) and Swords to Plowshares carry no tap token.
- Neutral: the type mix is unaffected. `npm run draft-balance` mean error per type is 2.22,
  the same as main.

### Confirmation

- `src/draft/tokens.test.ts` covers:
  - modes of a repeating trigger, with and without a label
  - modes of an instant staying one-shot
  - an engine outweighing a one-shot that reaches every opponent
  - "tap X target creatures", "tap one or more untapped creatures", and "they control"
    excluded
  - a token entering read as `create token`
  - artifacts and artifact token makers enabling `artifact`
- `src/lib/ramp.test.ts` covers costs that use something up against life, mill and tapping
  costs.

## More Information

Supersedes `deck-draft/ADR-0008`'s repeatable strength (1.5). Refines `deck-draft/ADR-0005`
(enablers) and `deck-draft/ADR-0009` (what counts as lasting ramp).
