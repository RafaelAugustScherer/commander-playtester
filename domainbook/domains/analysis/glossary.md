# Analysis glossary

The words the analysis context uses for its two reports. `run`, `match`, and
`mulligan` are in the book glossary; these are the measurement terms.

## Goldfishing

Playing a deck against no opponent to see whether it functions — the fast
consistency report. It is a seeded Monte-Carlo of opening hands and early turns, and
needs no rules engine; it is the shipped half of analysis and stays (`analysis/ADR-0001`).

- **Status:** validated
- **Example:** Goldfishing reports mulligan rate and mana screw/flood without any opponent.

## Consistency

How reliably a deck does its thing — the question `goldfishing` answers. Distinct
from strength, which asks whether the deck wins.

- **Status:** validated

## Win rate

The share of a `run`'s `matches` the user's deck won, the headline strength number.
Reported with a `confidence interval` and per matchup, so a short run reads as
uncertain.

- **Status:** validated

## Telemetry

The per-match facts a `run` records beyond who won — the turn the game ended,
mulligans taken — used to describe *how* a deck wins or loses, not just how often.

- **Status:** validated

## Mana screw

Too few lands to function — an opening hand or early game short on mana. One of the
consistency failures `goldfishing` measures.

- **Status:** validated

## Mana flood

Too many lands and too few spells — the opposite failure from `mana screw`, also
measured by `goldfishing`.

- **Status:** validated

## Confidence interval

The range a `win rate` really lies in given how few `matches` were played — the
honesty band on a percentage from a small `run`.

- **Status:** validated
