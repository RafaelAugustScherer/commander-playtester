---
id: auto-play-a-match
name: Auto-play a match
status: draft
---

## Story

As a user
I want the AI to pilot every seat and play the game to the end while I watch
So that a match completes hands-off and produces a result to count

## Rule: In watch mode every seat's decision is answered by an engine AI proposal

```gherkin
Example: The human makes no input in a watch match
  Given a watch match with the human's deck on a seat
  When the match runs
  Then every seat's plays come from the engine's AI, the human's seat included
  And the human provides no input
```

## Rule: A watch match runs to a legal end and names a winner

```gherkin
Example: A match completes with a result
  Given a running watch match
  When it reaches its end
  Then exactly one winner is named, or a draw is recorded
  And the result is reported to analysis
```

## Open Questions

- What happens if the engine panics mid-match — drop the match or halt the run
  (`TDR-0002`).
