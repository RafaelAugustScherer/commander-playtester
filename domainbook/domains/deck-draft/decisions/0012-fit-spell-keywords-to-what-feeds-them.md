---
status: accepted
date: 2026-10-07
decision-makers: [RafaelAugustScherer]
---

# Fit spell keywords to what feeds them

## Context and Problem Statement

Instants and sorceries scored almost flat. Spellslinger commanders made no theme of their
spells:

- Mizzix of the Izmagnus ("Whenever you cast an instant or sorcery spell …", "Instant and
  sorcery spells you cast cost {1} less …") had a profile of `experience counter` only.
- Talrand's drake trigger read as `create token` and `flying`.
- Verazol's "Whenever you cast a kicked spell" read as nothing, so Verazol's 20 most-played
  kicker spells ranked 169th–2534th among its instants and sorceries.

Storm, delve, kicker, overload and cost reduction carried no token. "Cyclonic Rift", "Dig
Through Time" and "Comet Storm" fitted no deck. `copy spell` matched `\bstorm\b` anywhere,
so a name such as "Comet Storm deals …" read as storm. Delve fitted a graveyard deck only
through its reminder text.

What makes a spell keyword good depends on the rest of the deck. Storm wants many cheap
spells a turn (cost reducers, other instants and sorceries). Delve wants a full graveyard
(milling, discarding). Kicker and overload want cheaper spells, and kicker wants kicked-spell
payoffs.

## Considered Options

- **A bespoke keyword score**: count each keyword's support in the deck and add a term to
  `scoreCandidate`.
- **Partner tokens**: give each keyword a token, and let a keyword and the tokens that feed
  it fit each other.

## Decision Outcome

Chosen: **partner tokens**. They reuse the theme weights, the matched-token chips and the
candidate pools. A keyword card scores by how much of its partners' weight the deck already
has, and the reverse holds too.

- New tokens:
  - `instant or sorcery`: "instant or sorcery spell(s)" and magecraft. Casting, copying and
    cost reduction count. "Instant or sorcery card" (graveyard and library references) does
    not. Every instant and sorcery enables it.
  - `cost reduction`: "spells (you cast) cost … less" for spells of every kind, for
    instants and sorceries, for noncreature spells or for a colour. "Goblin spells" and
    "creature spells" don't count.
  - `storm`, `delve`, `kicker` and `overload`, read as keywords at the start of a line. Kicker
    also reads "kicked", so a kicked-spell payoff rewards it. `copy spell` reads storm the
    same way.
- Partners, fitted both ways:
  - storm with `cost reduction` and `instant or sorcery`
  - delve with `mill` and `discard a card`
  - kicker with `cost reduction` (only when the kicker card is an instant or sorcery)
  - overload with `cost reduction`
- A partner's searches join its token's pool, so a mill deck's pool reaches delve cards.
- An overloaded spell reaches every opponent: everything it fits counts ×1.5
  (`deck-draft/ADR-0008`).
- A spell that only reduces its own cost ("This spell costs {1} less if you control a
  Wizard") makes no token. Its condition is already read by the token it names (`wizard`,
  `flying`).

Measured on the twelve commanders of `deck-draft/ADR-0011`, seeds pinned, against that ADR's
chosen variant. Type balance is `npm run draft-balance`'s mean error per type.

| Variant | Top (of 240) | Draft (of 360) | Type balance |
|---|---|---|---|
| ADR-0011 | 61 | 48 | 2.22 |
| any "instant or sorcery" text, cost reduction of any spell | 57 | 48 | — |
| + every instant and sorcery enables, scoped cost reduction | 61 | 50 | 2.33 |
| + only "instant or sorcery spell(s)" signals | 59 | 50 | 2.22 |
| **+ overload counts ×1.5 on everything it fits** | **61** | **50** | **2.22** |

- The first variant read Goblin Warchief's "Goblin spells cost {1} less" as cost reduction.
  That let Everflowing Chalice's multikicker push Arcane Signet out of Krenko's top four.
- In the second variant, Muldrotha's draft took creatures that recur "an instant or sorcery
  card" (Vohar, The Dawning Archaic). They built `instant or sorcery` weight and drew in
  payoffs such as Chakra Meditation. Its type target slid to 22 creatures, 14 instants and 13
  sorceries (mean error 2.9 → 4.9).
- The third variant cost Mizzix's Mastery its place, until overload counted on everything it
  fits.

Where each commander's 60 most-included EDHREC nonland cards rank by score within their
type:

| Commander | Median rank | Within the top 25 |
|---|---|---|
| Verazol, the Split Current | 740 → 43 | 1 → 25 |
| Mizzix of the Izmagnus | 784 → 338 | 3 → 7 |
| Talrand, Sky Summoner | 402 → 204 | 3 → 3 |
| Baral, Chief of Compliance | 431 → 410 | 3 → 5 |
| Hylda of the Icy Crown | 82 → 82 | 21 → 22 |

Krenko, Urza and Muldrotha are unchanged.

### Consequences

- Good: Mizzix's Mastery goes 488th → 3rd among Mizzix's sorceries, Cyclonic Rift 1016th → 5th,
  Guttersnipe 4763rd → 8th, Goblin Electromancer 2496th → about 180th. Mizzix's draft hits go
  1 → 3.
- Good: Verazol's kicker spells rank 1st–33rd. Blustersquall goes 50th → 19th for Hylda.
- Good: in Sidisi, Brood Tyrant's mill deck, Treasure Cruise goes 166th → 36th, Dig Through
  Time 196th → 40th and Murderous Cut 86th → 13th.
- Bad: plain cantrips and ramp slip behind the spellslinger payoffs. In Mizzix, Mystic
  Confluence goes 39th → 68th and Arcane Signet 6th → 15th. In Talrand, Alandra goes 22nd →
  72nd. Sidisi's graveyard cards slip about three places behind delve spells.
- Bad: Mizzix's top four instants and sorceries are now mostly overload and storm spells.
- Neutral: kicker and overload don't read the deck's ramp. A ramp-heavy deck gives them no
  boost.

### Confirmation

`src/draft/tokens.test.ts` ("spell keywords") covers:

- a spellslinger commander's cast and cost-reduction tokens
- every instant and sorcery fitting `instant or sorcery`, and graveyard references not
  signalling it
- which cost reductions count
- storm read as a keyword, not as part of a name
- each partner pair, both ways, and a partner's searches
- the kicked-spell payoff, and kicker permanents not fitting cost reduction
- overload strength on every token an overloaded spell fits

## More Information

Refines `deck-draft/ADR-0005` (enablers) and `deck-draft/ADR-0008` (what reaches every
opponent).
