---
status: accepted
date: 2026-08-15
decision-makers: [RafaelAugustScherer]
---

# Use phase-rs as the rules and AI engine

## Context and Problem Statement

The product measures how good a Commander deck is by playing real games against AI
opponents. That needs an engine that enforces MTG's rules for arbitrary cards *and*
can pilot opponent seats. Writing such an engine is not MVP-scoped — it is the
reason Forge and XMage exist and why the project's own roadmap set head-to-head
aside as "the hard one". Which existing engine do we build on?

## Decision Drivers

- Rules accuracy for arbitrary cards — a playtester is only worth trusting if the
  board state is right.
- A built-in, non-LLM AI that can fill opponent seats (free, deterministic-ish, no
  API key).
- Commander and 4-player free-for-all support.
- Front-end-first with the smallest possible backend.
- Effort, license, and card coverage.

## Considered Options

- **phase-rs** — a Rust engine compiled to WebAssembly; rules and AI run in the browser.
- **Forge** — mature JVM engine, strong AI, text-scripted cards; GPL-3.0.
- **XMage** — mature JVM engine, client-server, broad coverage; MIT.
- **A custom / human-adjudicated engine** — build a smart tabletop, no real rules.

## Decision Outcome

Chosen: **phase-rs**, because it is the only option that is rules-accurate *and*
runs entirely client-side — engine and AI both in WASM — in our exact stack, with
no backend. Forge and XMage are mature but each would need a JVM engine wrapped in a
custom gateway (an estimated several engineer-months) plus a server to host, which
inverts the front-end-first goal. A custom engine cannot be rules-accurate for
arbitrary cards. phase-rs dissolves the trade-off the project started from:
rules-accurate, front-end-first, and no server, all at once.

### Consequences

- Good: no backend and static hosting (`ADR-0003`); our own front-end over the
  engine (`ADR-0002`); a competent non-LLM AI reused for every seat
  (`simulation/ADR-0001`); dual MIT/Apache-2.0 license.
- Bad: phase-rs is an early alpha. Its rules fidelity on arbitrary 100-card decks
  is the standing risk (`TDR-0002`), and it is single-maintainer with a churning,
  unpublished ABI (`TDR-0001`). Solo (0 AI) is not a first-class path, so solo deck
  testing is served by the goldfishing report. There is no published package; we
  vendor a pinned prebuilt WASM snapshot (`ADR-0006`).

### Confirmation

Confirmed by the engine-integration spike: the vendored WASM (`ADR-0006`) loaded the
card database and drove a full 4-player Commander game to a natural `GameOver` in
the browser, and a 2-player match then ran end-to-end with a live board and win-rate
report. Rules fidelity on arbitrary decks remains the open risk tracked in
`TDR-0002`. If fidelity proves inadequate in real use, the recorded fallback is
Forge (its stronger AI matters more than XMage's coverage once opponents are
AI-only), which would reopen `ADR-0002` and `ADR-0003`.

## Pros and Cons of the Options

### phase-rs

- Good: client-side WASM, engine + AI in-browser; our stack; MIT/Apache; broad
  parse-level coverage; live and playable today.
- Bad: alpha rules fidelity; single-maintainer; no published package; build from
  source.

### Forge

- Good: mature, strongest AI, text-scripted cards, headless sim mode.
- Bad: JVM, GPL-3.0, needs a custom gateway + backend; no per-seat view out of the box.

### XMage

- Good: mature, MIT, broadest coverage, already client-server with per-seat views.
- Bad: JVM; wire protocol is Java-serialized, so a JVM gateway is mandatory; weaker
  multiplayer AI; backend to host.

### Custom / human-adjudicated

- Good: no engine dependency; trivial to host.
- Bad: not rules-accurate — fails the product's core promise.

## More Information

The choice followed five research passes (Forge, XMage, the engine landscape, and
two on phase-rs). Forge stays the recorded fallback. See the roadmap for the
spike-first sequencing.
