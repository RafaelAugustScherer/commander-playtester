---
id: report-head-to-head-win-rate
name: Report head-to-head win rate
status: implemented
---

## Story

As a user
I want a win rate over the run, with a confidence interval and per matchup
So that I can judge how good my deck is against the opponents I chose

## Rule: A finished run reports a win rate with a confidence interval, per matchup

```gherkin
Example: A run reports a banded win rate
  Given a run of 20 matches where the deck won 13
  When the run finishes
  Then a 65% win rate is reported with a confidence interval
  And it is broken out per opponent matchup
```

## Rule: Every finished match contributes exactly once

```gherkin
Example: No match is counted twice or dropped
  Given a run of 20 matches
  When the win rate is computed
  Then it is over exactly 20 results
```

## Rule: Goldfishing consistency is available without a run

```gherkin
Example: Consistency needs no opponents
  Given a deck
  When the user asks for its consistency
  Then a goldfishing report is produced with no games played
```

## Open Questions

- How many matches make a win rate trustworthy given the 50-match cap.
