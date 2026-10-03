---
status: accepted
date: 2026-10-03
decision-makers: [RafaelAugustScherer]
---

# Balance suggestion rounds by card type

## Context and Problem Statement

Measured on the real engine data, the `synergy score` offered 70–100% creatures for every
commander — a spellslinger like Talrand got 15 creatures in 15 picks. Two causes:

- **Theme tokens are mostly creature subtypes**, and the commander's count three times
  (`commander weighting`), so creature types dominate the search tokens.
- **The candidate pool came only from text searches on those tokens.** For Mizzix of the
  Izmagnus the pool held 40 of about 2,850 eligible instants and sorceries, and 38 of the
  40 shared no token. Re-ranking alone could not fix it: the cards were never in the pool.

Real decks vary by commander far more than any one ranking can express. EDHREC average
decks: Mizzix 11 creatures and 42 instants plus sorceries, Sythis 31 enchantments, Urza 25
artifacts, Commodore Guff 20 planeswalkers, against an across-deck baseline of about 35
lands, 27 creatures, 10 instants, 8 sorceries, 10 artifacts, 8 enchantments and 1
planeswalker. The draft also had no land plan: nothing suggested lands on purpose, and a
deck could not hold two copies of a basic land.

## Considered Options

- **A local formula**: read each commander's type lean from the engine's parsed abilities
  and blend it with the baseline into a target mix; allocate each round's slots by deficit.
- **A bundled EDHREC snapshot** of per-commander type distributions, with the formula as
  fallback.
- **Re-ranking only**: penalise over-represented types inside the existing theme pool.

## Decision Outcome

Chosen: **a local formula**, plus per-type candidate retrieval and a basic-land fill.

- **Count one type per card**: front face, Land first, then Creature, then Planeswalker,
  Instant, Sorcery, Artifact, Enchantment — the rule EDHREC counts by, so its numbers can
  calibrate ours.
- **Read the commander's lean** from the engine's parsed abilities (`get_card_face_data`).
  A "whenever you cast" trigger or a cost reduction naming a type is a strong signal, per
  type or subtype named; any other filter on your own cards ("Elves you control") is a
  medium signal. Filters aimed at opponents never count. Subtypes map to the type they
  most often sit on (Aura → enchantment, Equipment → artifact, Elf → creature).
- **Blend into a target.** Lands start at 35 and gain up to 4 with land signals.
  Non-land slots mix the baseline with a focus on the signalled types; the stronger the
  strongest signal, the larger the focus (at most half the non-land slots). Commanders
  with no signal of their own (about 43%) fall back to the baseline, or to the strong
  signals of the cards drafted so far.
- **Allocate slots by deficit.** Each type's deficit is how far it trails its share of
  the drafted cards; each of the three slots takes the largest deficit, then counts as
  filled. The deck stays balanced at any size, and a type far behind can fill two or three
  slots. A refresh keeps its slot's type.
- **Retrieve per type.** Each slot's pool adds the most-printed Commander-legal cards of
  that type in the commander's identity (`search_cards_js` with `type_line` and
  `legal_format`) to the theme pool, so a spellslinger's instant slot reaches the staples.
  Land slots rank nonbasic lands by reprint count plus colour fixing, not by theme tokens,
  which mostly matched reminder text on cycling lands.
- **Fill basics in one step.** Of the land target, a colour-count share (25% for one
  colour up to 70% for five, from EDHREC averages) is drafted as nonbasic lands; the rest
  is basics, added by **Fill basic lands** in proportion to the deck's colours. Basics are
  the only cards the draft holds more than one of.

The alternatives were rejected:

- **An EDHREC snapshot** is scraped deck data, which `ADR-0009` rules out, and it would go
  stale between updates.
- **Re-ranking only** cannot reach the types the theme pool never contains.

### Consequences

- Good: drafted decks track real ones. Against 18 EDHREC average decks, the formula's
  target is off by 2.2 cards per type on average, against 4.0 for the flat baseline;
  full simulated drafts finish at 99 cards, 2.1 off per type.
- Good: every round still offers three cards the user chooses between; balance decides
  which types are on offer, never which card is added.
- Bad: commanders whose plan isn't in their text (Teferi, Wyleth, Atraxa superfriends) get
  the baseline; the split between instants and sorceries is even, so a counterspell-heavy
  Talrand is under-weighted on instants.
- Bad: the formula reads `type_line` and `legal_format` filters and the parsed ability
  shapes (`SpellCast` triggers, `ModifyCost` statics), all found by introspection. They
  must be re-checked when the engine is re-pinned (`TDR-0001`, `docs/engine-upgrade.md`).

### Confirmation

`npm run draft-balance` boots the real engine, drafts a full deck for each of the 18
reference commanders through the real draft session (random picks among the three
slots), fills basics, and prints each deck's type counts against EDHREC's. It asserts the
direction of each lean — instants and sorceries over creatures for Mizzix, Ashling and
Talrand, enchantments for Sythis, artifacts for Urza and Sram, creatures for Lathril,
Meren and Krenko, ten or more planeswalkers for Guff — and that the drafted decks beat the
baseline. The EDHREC counts live only in that script; nothing ships with the app.

## More Information

Extends the **Narrow** and **Rank** steps of `deck-draft/ADR-0001`; popularity still comes
from reprint counts (`deck-draft/ADR-0002`), and all card data stays local (`ADR-0010`).
