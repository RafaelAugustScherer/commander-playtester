# Deck draft glossary

The words the deck-draft context uses. Shared Magic and Commander terms — `deck`,
`commander card`, `color identity` — are in the book glossary, and `partial deck` lives
in the deck-library glossary; these are the ones this context adds.

## Base cards

The three or more cards the user enters to start a draft, setting its theme. One of them
may be flagged as the `commander card`; if none is, the first `suggestion round` picks
the commander.

- **Aliases:** seed cards, seed
- **Status:** draft
- **Example:** Seeding "Krenko, Mob Boss", "Goblin Chieftain" and "Skirk Prospector"
  points the draft at mono-red Goblins.

## Suggestion round

One set of up to three suggested cards, offered after a card is added (or at the start).
Within a round the same card is never shown twice, refreshes included; adding a card ends
the round and begins the next.

- **Status:** draft
- **Example:** After adding a card, the round shows three new candidates ranked by
  `synergy score`.

## Refresh

Replacing a single suggested card in the current round with the next best candidate that
has not been shown this round — of the same `slot type`, and kept as close as possible to
the card it replaces, so the slot holds its flavour. The replaced card joins the
`blacklist`.

- **Status:** draft
- **Example:** Refreshing a suggested board wipe offers a different board wipe before an
  unrelated card.

## Blacklist

The cards refreshed away during a draft. None of them is suggested again in that draft, in
commander rounds or regular ones. The draft keeps it out of view, and it ends with the
draft.

- **Status:** draft
- **Example:** Refreshing away Cyclonic Rift keeps it out of every later round of that
  draft.

## Quick draft

The one-card-at-a-time way to draft: the round's first card alone over a darkened screen,
taken (added, or picked as commander) by a swipe right or the right button, passed on by a
swipe left or the left button. Passing is a `refresh`, so the card joins the `blacklist`.

- **Status:** draft
- **Example:** Swiping left on a suggested board wipe brings in the next closest board
  wipe, and the first one never returns.

## Type balance

The target count of each card type — land, creature, instant, sorcery, artifact,
enchantment, planeswalker — for the whole deck, set by what the `commander card`'s text
asks for and blended with the across-deck baseline, set against the count drafted so far.
Each card counts as one type: Land first, then Creature, then the rest
(`deck-draft/ADR-0003`).

- **Status:** draft
- **Example:** Mizzix of the Izmagnus targets about 21 instants and 20 sorceries; a
  commander with no type in its text targets about 27 creatures.

## Slot type

The card type a `suggestion round` slot offers: the type trailing its share of the drafted
cards by the most when the round opens. A `refresh` keeps it.

- **Status:** draft
- **Example:** A Sythis deck with too few enchantments gets an enchantment slot first.

## Basic-land fill

The one-step action that fills every land still missing from the `type balance`'s land
target with basic lands, split by the deck's colours. After it, rounds offer no more land
slots. Running it again replaces the earlier basics (`deck-draft/ADR-0007`).

- **Aliases:** fill basic lands
- **Status:** draft

## Synergy score

The self-built ranking of a candidate card against the cards already in the deck — the
sum of the `theme token`s it shares (with `commander weighting` applied), plus fit for
the deck's role gaps and mana curve, plus a `tribal payoff` bonus, plus the `bracket
target` tilt, plus a small tilt toward more-played cards by reprint count
(`deck-draft/ADR-0002`). The engine supplies
no such score; this context owns it (`deck-draft/ADR-0001`).

- **Status:** draft

## Theme token

A signal pulled from a card that the score matches on: a creature subtype (a tribe like
Goblin, from the type line or named in the rules text), a keyword, or a salient
oracle-text phrase (`+1/+1 counter`, `sacrifice`, `tap creature`, `etb`). The set of tokens
the heuristic recognises sets its ceiling. A card that only *enables* a token — an enters
trigger for `etb`, a legendary type line for `legendary` — fits it without adding it to the
deck's theme (`deck-draft/ADR-0005`).

- **Aliases:** theme signal
- **Status:** draft

## Commander weighting

The rule that `theme token`s coming from the `commander card` count for more than those
from the other 99 when scoring a candidate, so the commander leads the deck's direction.
What the commander rewards — the mechanic its "whenever …" trigger conditions name and the
tribes its text names — counts for more again (`deck-draft/ADR-0005`).

- **Status:** draft
- **Example:** With an Elf commander, Elf-tribal candidates outrank cards that only match
  a non-commander theme of equal strength. Hylda of the Icy Crown's `tap creature` outweighs
  the `create token` her trigger only pays out.

## Bracket target

The power level (Focused, Optimized or cEDH) the user aims the draft at, defaulting to
Focused. The engine's lower tiers (Exhibition, Core) still show in its estimate but are not
offered as targets (`deck-draft/ADR-0006`). It steers the ranking through the engine's
`estimate_bracket_for_deck`; a card that would push the deck past the target is penalised.

- **Aliases:** target bracket
- **Status:** draft

## Tribal payoff

A card whose rules text names a creature type the deck already has ("Other Elves you
control get +1/+1"). It scores a bonus that grows with that tribe's share of the deck's
creatures and levels off as their number grows, so five Elves in eight creatures lift an
Elf lord far more than five incidental Humans in thirty lift a Human lord. Being of the
type is not enough: a plain Elf gets no bonus (`deck-draft/ADR-0006`).

- **Aliases:** lord, tribal lord
- **Status:** draft
- **Example:** With ten Elves drafted, an Elf lord scores about one and a half times a
  plain Elf.

## Tribal mode

A switch beside the `bracket target` that, while on, makes every creature slot offer only
creatures of the tribes the author picks (a Changeling counts as every tribe), and gives
cards that name one of them or are Kindred of one a bonus in any slot. The author picks
the tribes by hand; turning it off keeps them for later (`deck-draft/ADR-0006`).

- **Aliases:** tribal
- **Status:** draft
- **Example:** Tribal mode on with Elf and Druid offers only Elves and Druids in creature
  slots, and favours Elvish Promenade in a sorcery slot.

## Draft session

The in-progress draft state: the `base cards`, the chosen `bracket target` and `tribal
mode`, the deck so
far, and the current `suggestion round`. It is not a saved `deck` until the user saves or
copies it out.

- **Status:** draft
