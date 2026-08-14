# Commander Playtester

A web tool for pressure-testing **Magic: The Gathering — Commander** decks.
Paste a decklist, and it resolves every card against
[Scryfall](https://scryfall.com/docs/api), runs thousands of **goldfishing**
simulations (opening hands, London mulligans, and the first several turns), and
reports how consistently the deck actually functions.

> **Status:** early MVP. Import + goldfishing + composition analysis run
> entirely in the browser. Head-to-head simulation against popular decks is on
> the roadmap — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## What it does today

- **Import** a decklist in Moxfield / Archidekt / plain-text format, with a
  `Commander` section for the command zone.
- **Resolve** cards via the Scryfall collection API (batched, up to 75/req).
- **Goldfish** the deck over many Monte Carlo games and report:
  - average lands in the kept opening hand, mulligan rate, mana-screw / flood
    rates;
  - probability of a land drop each turn and average mana available per turn;
  - how often ramp comes online by turn 3;
  - deck composition (lands / ramp / draw / interaction) and the mana curve.

Simulations use a **seeded RNG**, so a given deck + config always produces the
same numbers.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit tests
npm run build      # typecheck + production build
```

Open the dev server URL, click **"Carregar deck de exemplo"** to load a sample
Atraxa list, then **"Analisar deck"**.

## How the analysis works

The goldfishing engine (`src/lib/goldfish.ts`) is intentionally a **consistency
model**, not a rules engine. Each simulated game:

1. draws an opening hand and applies a London-mulligan keep heuristic;
2. plays a land each turn when one is available;
3. greedily casts affordable ramp to model acceleration;
4. records land drops and total available mana per turn.

Card **roles** (`land` / `ramp` / `draw` / `removal`) are inferred with simple
heuristics over the type line and oracle text — good enough to describe a deck's
shape, not a substitute for judgment.

## Project layout

```
src/
  lib/
    types.ts       # domain types
    decklist.ts    # decklist text parser
    scryfall.ts    # Scryfall client + deck resolution
    roles.ts       # heuristic card-role classifier
    rng.ts         # seeded PRNG + shuffle
    goldfish.ts    # Monte Carlo goldfishing engine
    sampleDeck.ts  # sample decklist for the demo button
  components/
    GoldfishReport.tsx
  App.tsx
```

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the planned power-scoring layer,
EDHREC comparison, and a Forge-backed head-to-head simulation phase.
