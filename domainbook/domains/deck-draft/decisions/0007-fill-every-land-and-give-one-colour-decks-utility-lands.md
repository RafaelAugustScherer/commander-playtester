---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Fill every land, and give one-colour decks utility lands

## Context and Problem Statement

`deck-draft/ADR-0003` drafted a colour-count share of the land target as nonbasic lands
and left the rest to **Fill basic lands**. For one colour that share was 25%: a Krenko,
Mob Boss draft held 9 land slots for nonbasic lands, and the fill stopped at 26 of 35
lands to leave room for them. Those slots ranked lands by reprint count plus colour fixing.
A one-colour deck has nothing to fix, so reprint count alone decided, and the most-printed
fixers won — Command Tower, Exotic Orchard, Evolving Wilds — though they do nothing a basic
does not. The author found themselves picking land after land, and still had to come back
for the last nine.

## Considered Options

- **The fill**: complete every missing land, in any deck; complete everything only in
  one-colour decks; or keep the fill and add a second "fill all" button.
- **One-colour land slots**: a few, utility lands only; none; or as many as before without
  the fixers.
- **Multicolour land slots**: unchanged, or also drop lands that make none of the deck's
  colours.

## Decision Outcome

The author chose each of the following.

- **Fill basic lands completes the land count** in every deck: it adds as many basics as
  the land target is short once the nonbasic lands already drafted are counted, never past
  100 cards. Once the deck's lands reach the target, rounds stop offering land slots.
- **One-colour decks get a few utility lands.** The nonbasic share for one colour drops from
  25% to 15% (about 5 of 35). Their land slots offer only lands with an ability beyond making
  or finding mana (`src/draft/lands.ts`). A land is a colour fixer when every line of its
  text is one of: a mana ability that makes a single mana (one colour, colourless, or one
  of any colour, with riders like "spend this mana only…"); an "enters tapped" clause; a
  colour or type choice; a search for one basic land; basic landcycling. Anything else —
  Rogue's Passage's evasion, Bojuka Bog's graveyard hate, Ancient Tomb's two mana, Myriad
  Landscape's two basics, Cavern of Souls's "can't be countered" — makes it a utility land.
  The 15% is this ADR's reading of the author's "a few".
- **Multicolour decks are unchanged**: their land slots still favour lands that make the
  deck's colours.

### Consequences

- Good: a one-colour draft needs a handful of land picks and one press of the button. On the
  real data, a Krenko draft offered 5 land slots — Myriad Landscape, Reliquary Tower, Rogue's
  Passage, Temple of the False God, Forgotten Cave — and the fill took the deck to 35 of 35
  lands with 30 basics; the next round offered no land.
- Good: drafted decks still track real ones — `npm run draft-balance` finishes every
  reference deck at 99 cards, with a mean error per type of 2.03 (was 2.06).
- Bad: the fixer test reads rules text, so an unusual mana rider can misclassify a land.
  Checked against the 60 most-printed one-colour nonbasic lands; the cases above are in
  `src/draft/lands.test.ts`.
- Bad: a multicolour author who fills early gets basics where nonbasic duals would have been
  better, and land slots stop; pressing the button later, after drafting the duals, avoids
  it.

### Confirmation

`src/draft/lands.test.ts` covers fixers and utility lands; `src/draft/typeBalance.test.ts`
the full fill and land slots stopping at the target; `src/draft/draftSession.test.ts` the
fill in a session; `src/engine/draftRanking.test.ts` that a one-colour land slot takes a
utility land over a more-printed Command Tower.

## More Information

Revises the land plan of `deck-draft/ADR-0003`; the type balance itself is unchanged.
