---
status: accepted
date: 2026-10-10
decision-makers: [RafaelAugustScherer]
---

# Level off the theme, and keep a base of protection and card advantage

## Context and Problem Statement

The author asked whether the ranking scores some mechanics too high or too low, and whether
it ignores cards that most decks need whatever their theme. One example was protection: an
expensive commander with no hexproof, ward or indestructible needs a base of Greaves,
Boots and Heroic Intervention. The author's idea was to sort cards into buckets (protection,
removal, ramp) and score each bucket lower as the deck fills it. Ramp already worked this
way (`deck-draft/ADR-0009`), but nothing else did.

Fourteen full drafts were simulated on the real engine data (random pick among each round's
three, Focused, Sol Ring and Arcane Signet seeded), and every card the database holds was
scanned. Five findings:

- **The theme grows without bound.** Each drafted card added 1 to the weight of every
  `theme token` it carries, so the theme score grew with the deck. Every other term in the
  `synergy score` has a fixed size. Averaged over the 2,612 nonland cards offered, the
  terms were:

  | Term | theme | curve | role gap | ramp | tribal | bracket tilt |
  |---|---|---|---|---|---|---|
  | Mean | 115.2 | 0.48 | 0.19 | 0.43 | 0.55 | 0.00 |

  Late offers scored 200–360. Against the finished decks, Wrath of God scored 0.1, Chaos
  Warp 0.1 and Counterspell 1.1 in Hylda. Ten of the fourteen decks held no protection, and
  ramp ended at 2–8, the two seeds included, against a target of ten.
- **Broad tokens snowball.** Making tokens, sacrificing, drawing, Treasure, lifegain and
  exile topped nearly every deck, whatever the commander:
  - Uril, an Aura voltron commander, ended with `create token` 53, `treasure` 45 and
    `sacrifice` 42, against `aura` 10.
  - Teysa ended with `flying` 47, `vigilance` 44 and `lifelink` 37.
- **Reminder text feeds that.** Treasure, Clue, Food and Blood reminders read as
  sacrificing, drawing, discarding and gaining life. Across the Commander-legal cards, a
  token came only from reminder text on:

  | Token | Cards |
  |---|---|
  | `sacrifice` | 922 |
  | `draw a card` | 552 |
  | `discard a card` | 514 |
  | `exile` | 987 |

  Ward's reminder ("Whenever this creature becomes the target of a spell…") made 12 ward
  commanders reward heroic-style `targets`.
- **The removal role missed a lot.** It did not count board wipes, X damage, "up to one
  target", bounce, tuck, shrink or fight.
- **Some mechanics have no token.** About 260 commanders name "deals combat damage to a
  player", 180 "can't be blocked", 115 noncreature spells or prowess, and 80 anthems. 454
  commanders produce no curated token at all. These are left for a later change.

## Considered Options

- **Scale**:
  - normalise what the 99 add to a token (saturating, share of the deck, or square root);
  - scale fixed bonuses to the theme;
  - reserve a round slot for a bucket behind pace.
- **Buckets**: interaction, board wipes, protection, card advantage.
- **Past the target**: halve per card ahead; fade to zero as ramp does; 1 / (count + 1).
- **Reminder text**:
  - drop it and map keywords;
  - drop it everywhere;
  - drop only the reminders of token objects.
- **Protection need**:
  - the commander's mana value, less when it protects itself or dodges commander tax;
  - a floor plus a voltron signal;
  - both.

## Decision Outcome

The author chose each of the following.

### What the 99 add to a token levels off

A token's weight is still the commander's (`COMMANDER_WEIGHT` 3, and 5 more for what it
rewards), but the 99 now add `K × (1 − e^(−count / S))`, the same shape as the tribal payoff
(`deck-draft/ADR-0006`). Here `count` is the number of the 99 carrying the token. With K 3
and S 3, three cards reach about two thirds of the cap and twenty reach it. A broad token
can no longer outgrow what the commander asks for (8 or 11). The fixed terms keep their
say for the whole draft. K and S were calibrated (below).

### Tokens are read without reminder text

Theme tokens, enablers, what a commander rewards, and named tribes are all read from rules
text without its reminder text. Keywords whose meaning lives in the reminder signal what
they do (`KEYWORD_TOKENS` in `src/draft/tokens.ts`):

| Keywords | Signal |
|---|---|
| persist, wither | -1/-1 counter |
| infect | -1/-1 counter, counters |
| toxic, cumulative upkeep, level up, station, read ahead, vanishing, fading, suspend, impending | counters |
| undying, megamorph, backup, bloodthirst, renown, riot, unleash, reinforce, tribute, ravenous, amplify, adapt, monstrosity, bolster, support, outlast, modular, explore, awaken | +1/+1 counter |
| evolve, graft | +1/+1 counter, creature etb |
| devour | +1/+1 counter, sacrifice |
| fabricate, amass | +1/+1 counter, create token |
| mentor, training, dethrone | +1/+1 counter, attacks |
| exalted, battle cry, melee, provoke, annihilator, firebending | attacks |
| myriad, mobilize | attacks, create token |
| afterlife, offspring, living weapon, squad, job select, populate, investigate, incubate, for Mirrodin! | create token |
| embalm, eternalize, encore | create token, graveyard |
| flashback, escape, disturb, retrace, jump-start, harmonize, mayhem | cast from graveyard, graveyard |
| unearth, scavenge, soulshift, recover | graveyard |
| dredge | mill, graveyard |
| madness | discard a card, graveyard |
| cycling | draw a card, discard a card |
| landcycling and other typecycling | discard a card |
| connive | draw a card, discard a card |
| exploit, bargain, offering, blitz, evoke | sacrifice |
| casualty | sacrifice, copy spell |
| epic | copy spell |
| bestow | aura |
| extort | gain life |

Each row keeps what the keyword itself is about and drops what its reminder only mentions on
the way: flashback's "then exile it", dash's and unearth's haste. Investigate and incubate
still make a card an artifact enabler. The change also:

- fixes the ward bug;
- reads the commander's tokens from reminder-free text, which replaces
  `deck-draft/ADR-0010`'s "reminder text stays on every other line";
- replaces `deck-draft/ADR-0005`'s "reminder text counts like rules text".

### The removal role counts what answers a threat

Besides destroy, exile, counter, numbered damage and edicts, removal now counts:

- X damage and "up to one target";
- bounce and tuck of what you don't control, and shrink;
- fight and bite;
- board wipes.

Roles are read from reminder-free text too. Goldfishing reads the same roles, so its removal
and draw counts change with them.

### Protection and card advantage are fundamentals buckets

Each is scored apart from theme, like ramp. It has a target for the whole deck, and the
target keeps pace with the draft: the deck should hold all of it by its sixty-third nonland
card, in proportion along the way (`bucketPace`, now shared with ramp).

**Protection** (`src/draft/protection.ts`) covers cards that give your commander or
creatures hexproof, shroud, indestructible or protection, that phase your things out, umbras,
and spells that redirect. A creature's own keyword is not protection for the deck.

The target is 2 plus 6 × need. The need is the larger of two signals:

- **Wanting to connect** (full need). The commander triggers on attacking or on its own
  combat damage, or cares about Auras or Equipment. Its name is read in full, before its
  comma, or by first name, as Oracle text now shortens legends ("Whenever Edgar attacks").
- **Mana value.** None at 3, full at 6, as the author proposed. A commander with its own
  hexproof, shroud, indestructible, ward or protection, or one that comes back without
  commander tax, counts a quarter of it. The tax-free ways are commander ninjutsu, dash,
  eminence, and putting itself onto the battlefield from the command zone (Derevi). The
  author picked these.

The author first chose mana value alone. EDHREC's average decks for 60 commanders showed
protection following voltron rather than cost, so the author added the floor and the
voltron signal:

| Commanders | Count | Mean protection pieces |
|---|---|---|
| Voltron or combat commanders | 8 | 8.3 |
| Other commanders, cheap or self-protected | 36 | 3.5 |
| Other expensive commanders with no protection | 16 | 2.4 |

**Card advantage** (`src/draft/cardAdvantage.ts`) counts:

- **1** for draw that repeats: a trigger or an activated ability on a permanent, such as
  Rhystic Study or Skullclamp. A repeating investigate counts too.
- **½** for a one-shot that draws two or more. It earns half the bonus.
- **Nothing** for a cantrip, looting, drawing for a discard, an ability that uses the card
  itself up (Mind Stone), or draw that goes to every player.

The target is 7, the median of the same 60 average decks counted this way (middle half
4.5–9.5). The author preferred it to the 10 first proposed. Draw left the role-gap term, as
ramp did in `deck-draft/ADR-0009`; the role gap now only counts removal.

**Room.** A card in a bucket earns its whole bonus at pace and half for each card ahead,
which is never a hard cap, as the author chose. The author left it to the calibration
whether to also grow the bonus while the deck is behind. Growing it measured closer to the
targets at the same EDHREC alignment, so it does: half again per card behind, up to three
times. Ramp keeps its own rule (`deck-draft/ADR-0009`).

### Calibration

Measured as in `deck-draft/ADR-0011`. The twelve commanders of that ADR are each seeded with
their two most-included non-ramp EDHREC cards.

- **Top** counts the top four suggestions of each nonland type that are among the
  commander's 60 most-included nonland EDHREC cards.
- **Draft** counts the 30 rounds whose most-included offer is one of them.
- **Buckets** run full drafts with random picks for 22 commanders (the twelve, plus Etali,
  The Ur-Dragon, Edgar, Uril, Korvold, Muldrotha, Rafiq, Kroxa, Niv-Mizzet and Light-Paws),
  seeded with Sol Ring and Arcane Signet. Their mean protection target is 6.0.
- **Off target** is the mean distance between a deck's protection count and its target.

| Variant | Top (of 240) | Draft (of 360) | Protection | Off target | Card advantage | Ramp |
|---|---|---|---|---|---|---|
| main | 60 | 47 | 1.0 | — | 12.5 | 4.0 |
| reminder text dropped | 60 | 51 | 1.2 | — | 10.3 | 4.0 |
| + 99 levelled, K 3, S 3 | 63 | 53 | 1.0 | — | 13.1 | 6.7 |
| + 99 levelled, K 6, S 4 | 58 | 47 | 1.1 | — | 14.0 | 5.4 |
| + buckets 20 / 20 | 30 | 42 | 7.4 | — | 13.4 | 6.6 |
| + buckets 12 / 12 | 44 | 47 | 5.6 | — | 12.5 | 6.7 |
| + buckets 12 / 3 | 49 | 53 | 5.8 | — | 11.3 | 6.6 |
| + buckets 8 / 8 | 48 | 51 | 4.2 | — | 12.5 | 6.9 |
| + buckets 8 / 0 | 55 | 54 | 4.5 | — | 9.9 | 6.7 |
| + buckets 0 / 8 | 53 | 49 | 0.9 | — | 13.2 | 6.7 |
| + buckets 5 / 5, no catch-up | 55 | 51 | 2.9 | 3.75 | 12.8 | 6.7 |
| **+ buckets 5 / 5, catch-up** | **55** | **51** | **4.8** | **1.89** | **12.3** | **6.7** |

The bucket columns are protection weight / card-advantage weight. The last two rows read
legends by first name, so Edgar's target is 8 there and 3.5 above.

The author chose the strength (5 / 5) from this table: the setting closest to EDHREC among
those that weight both buckets.

### Consequences

- Good: the theme stays in proportion. Late-draft profiles lead with the commander's tokens
  (Hylda's `tap creature` 11 against `create token` 6), and ramp rises from 4.0 to 6.7 per
  deck, since its fixed bonus keeps its say.
- Good: decks hold protection where they had none. The mean goes from 1.0 to 4.8 against
  targets of 2–8, and the miss per deck halves with catch-up (3.75 to 1.89).
- Good: Draft hits rise from 47 to 51. Ward commanders, and Treasure and Clue makers, no
  longer drift into heroic, sacrifice and draw themes.
- Bad: Top falls from 60 to 55. Protection and draw cards take some of the opening top-four
  places that EDHREC's lists give to themed cards.
- Bad: protection still misses both ways. Korvold and Kroxa end at 1–2 of 8, because their
  themes outscore Greaves. Teysa ends at 8 of 4, because white protection fits her theme
  anyway. The bucket can add but not subtract.
- Bad: card advantage overshoots: 12.3 per deck against 7. Some 30–40% of offered cards carry
  repeatable draw on the side (Battle Angels of Tyr, Sanctuary Warden), and a bucket that
  only adds cannot pull that down. The author left it as an open question.
- Good: tribal drafts hold more of their tribe, because broad tokens no longer outgrow it. In
  `npm run draft-balance` (random picks), Krenko's creatures go from 15 to 21 of 36 Goblins
  and Lathril's from 17 to 21 of 37 Elves.
- Neutral: the type mix holds. Mean error per type is 2.33, against 2.22 on main.
- Neutral: four more weights to tune (K, S and the two bucket weights), two targets, and a
  catch-up rate and cap. Each was calibrated on 12–22 commanders.

### Confirmation

- `src/draft/protection.test.ts`:
  - what counts as protection, including phasing your own things and not an opponent's;
  - the need from mana value, self-protection and tax-free returns;
  - wanting to connect, by full or first name;
  - the target, with two commanders.
- `src/draft/cardAdvantage.test.ts`: engines, one-shots, and what counts nothing.
- `src/draft/fundamentals.test.ts`: pace, room (catch-up and halving) and both bonuses.
- `src/draft/themes.test.ts`: the levelled weight, and a rewarded token staying above a broad
  one.
- `src/draft/tokens.test.ts` ("reminder text"): token reminders, the keyword map, and the
  ward fix.
- `src/lib/roles.test.ts`: the new removal wordings and reminder-free draw.
- `npm run draft-balance` still passes its type-lean assertions.

## More Information

- Refines the **Rank** step of `deck-draft/ADR-0001`.
- Extends `deck-draft/ADR-0009`'s ramp bucket to protection and card advantage.
- Replaces the reminder-text rules of `deck-draft/ADR-0005` and `deck-draft/ADR-0010`.

The open questions it leaves:

- mechanics with no token, above all combat damage to a player, evasion, noncreature spells
  and anthems;
- a card-advantage overshoot the bucket cannot pull down;
- a bracket tilt (−2 per tier) that is small against any theme.
