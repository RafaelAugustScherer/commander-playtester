---
id: commander-playtester
milestones:
  - { id: goldfishing-consistency, name: Goldfishing consistency, status: done }
  - { id: engine-integration, name: Engine integration spike, status: done }
  - { id: deck-library, name: Deck library, status: done }
  - { id: match-setup, name: Match setup, status: done }
  - { id: simulation, name: Simulation — play and auto-play, status: done }
  - { id: board, name: Board, status: done }
  - { id: head-to-head-analysis, name: Head-to-head analysis, status: done }
  - { id: deck-draft, name: Deck draft, status: planned }
  - { id: polish-and-deploy, name: Polish and deploy, status: in-progress }
---

# commander-playtester roadmap

A tool for answering one question about a **Magic: The Gathering — Commander**
deck: *how good is it?* You build your deck and one or more opponent decks by
hand, then either **play** your deck yourself or **watch** it play itself, over a
run of up to 50 real games, and read back how often it wins and how it got there.

The measurement is real, not a heuristic. Every game is played to completion by a
full MTG rules engine ([phase-rs](https://phase-rs.dev), `ADR-0001`) that also
supplies the AI opponents — so a win is a win under the actual rules, not a score
from a formula. The rules engine and its AI are the one thing this project does
*not* build; everything the contributor works on sits around that engine: getting
decks into it, configuring a run, driving the game loop, drawing the board, and
turning finished games into numbers.

## What it is, in one paragraph

You keep a **deck library** of decks you typed in yourself. You open **match
setup**, pick your deck and its opponents, choose **play** or **watch**, and set
how many games to run (1–50). **Simulation** then runs each game to the end
through the phase-rs engine — you piloting your seat in play mode, or the engine's
AI piloting every seat in watch mode — while the **board** shows it happening at a
readable pace. When the run finishes, **analysis** reports the win rate and the
per-game telemetry, alongside the fast, opponent-free **goldfishing** consistency
report the project already shipped.

## How we got here (the shape of the design)

The starting question was whether to enforce real rules at all. A rules engine for
arbitrary cards is not something an MVP writes — it is why Forge and XMage exist —
so the honest choices were a human-adjudicated tabletop, a mature JVM engine behind
a server, or something in between. We chose **rules-accurate**, then found that
**phase-rs** — a Rust→WASM engine that runs the rules *and* its AI in the browser —
dissolves the usual trade-off: it is rules-accurate **and** front-end-first **and**
needs no backend. The consequence chain is recorded as decisions:

- `ADR-0001` — phase-rs is the rules and AI engine (over Forge, XMage, a custom engine).
- `ADR-0002` — we embed the engine and drive our own minimal front-end, rather than fork the phase-rs client.
- `ADR-0003` — the app runs fully client-side; no backend, static hosting.
- `ADR-0004` — decks are entered by hand and saved as named, reusable decks; there is no bundled or scraped field of decks. *(Superseded by `ADR-0009`, which carries the no-scraped-field core forward.)*
- `ADR-0005` — a pre-game toggle picks play or watch; a run is 1–50 games, sequential, in real time on the board.
- `ADR-0006` — we vendor a pinned prebuilt WASM snapshot (rather than build from source) and run the engine in a Web Worker; confirmed by the integration spike.
- `ADR-0009` — an assisted **deck draft** suggests cards for the deck under construction: the engine narrows its own card database and measures power, a self-built heuristic ranks by synergy. Supersedes `ADR-0004`'s "the app never curates or suggests" while keeping its no-scraped-field stance.

The two standing risks of leaning on an alpha engine are recorded as debt:
`TDR-0001` (single-maintainer alpha with a churning ABI) and `TDR-0002` (rules
fidelity on arbitrary 100-card decks).

## Design principles

- **The engine is a dependency, not a subject.** We do not implement MTG rules or
  card behaviour. When a card resolves wrong, that is an upstream phase-rs matter;
  our job is to surface it (`TDR-0002`), not to patch rules in the client.
- **Client-side and static.** Everything runs in the browser. The only network use
  is fetching card images from Scryfall at runtime, cached locally (`ADR-0003`).
- **Determinism where it helps.** A run takes a seed, so the same decks and seed
  reproduce the same games — the same discipline the goldfishing engine already
  uses.
- **Watchable over fast, for now.** Matches run one at a time and render at a
  standard speed so you can see your deck act; speed-up options come later
  (`ADR-0005`).
- **Two kinds of "how good".** Consistency (does the deck function? — goldfishing,
  instant, no opponents) and strength (does it win? — head-to-head, slow, against
  real opponents) are different questions and different artifacts, both kept.

## Milestones

### Goldfishing consistency — done

Shipped in the current MVP: a seeded Monte-Carlo of opening hands and early turns
that reports mulligan rate, mana screw/flood, land-drop and mana curves, and
composition. Answers "does this deck reliably do its thing?" with no opponent and
no engine. It stays as the fast half of analysis and is not replaced by the
head-to-head work below.

### Engine integration spike — planned

De-risk the whole project before building UI. Build the phase-rs WASM from a
pinned release tag (pinned nightly Rust toolchain, `wasm-bindgen`, the 16 MiB
shadow-stack link arg preserved), embed it in a throwaway Vite app, and drive **one
full 4-player Commander game with the AI on every seat to completion**, printing
the winner. This proves both the embed and the auto-play driver at once. Exit: a
game runs end-to-end in-browser with no backend.

### Deck library — planned

Author decks by hand — a commander plus the 99 — and save them as named,
reusable decks (`ADR-0004`). Each deck is checked against the engine's implemented
card set and its unsupported cards are surfaced before it can be used
(`TDR-0002`). Reuses the existing decklist parser and Scryfall name resolution.

### Match setup — planned

The pre-game screen: pick your deck and 1–3 opponent decks, choose **play** or
**watch**, set the match count (1–50), pick AI difficulty, optionally reveal the
AI hands, and set a seed (`ADR-0005`). Solo (0 opponents), duel (1), and pod (3)
are the same screen with a different opponent count.

### Simulation — play and auto-play — planned

The heart: the phase-rs engine adapter plus the game loop. In **play** mode you
pilot your seat, advancing phases with space and responding as the AI acts. In
**watch** mode the **auto-play driver** asks the engine for each seat's decision
(`get_ai_action_proposal` per seat) and submits it, running the game to the end.
The same loop feeds the board and, on completion, analysis.

### Board — planned

Arena-style rendering with the player's seat centered and enlarged at the bottom
and the opponents sharing the top row. Zones in fixed slots, a phase rail, life
and commander-damage tracking, and the stack, with hover-to-enlarge card
previews. Watch mode is read-only; play mode adds drag-to-play from the hand onto
type-labeled battlefield slots.

### Head-to-head analysis — planned

Turn a finished run into an answer: win rate (with a confidence interval), per
matchup, plus telemetry (turn the game ended, who won, mulligans taken). This is
`docs/ROADMAP.md`'s old "Phase 4 — head-to-head" delivered client-side, without the
Forge backend that phase assumed.

### Deck draft — planned

Build a deck from scratch with help. The user seeds at least three cards (optionally one
flagged as the commander) and the app offers rounds of up to three synergistic cards to
add, each refreshable, all within the commander's color identity. Candidates come from the
engine's own card database (`search_cards_js`); a self-built heuristic ranks them by
synergy with the commander weighted higher; a selectable bracket target (default Focused)
steers the ranking through the engine's bracket estimate (`ADR-0009`,
`deck-draft/ADR-0001`). The draft can be left at any point and copied out or saved — a
partial deck is flagged and blocked from play (`deck-library/ADR-0002`). This is the
project's first step from *measuring* a deck to *helping build* one.

### Polish and deploy — planned

Reproducibility checks, optional playback-speed controls, unsupported-card UX, and
a static deploy. Nothing here needs a server.

## Open items

Domain-specific unknowns live in each context's Open Questions under `domains/`.
The cross-cutting one: how large a run has to be before a win rate is worth
trusting, given that AI games are CPU-heavy and the cap is 50 — recorded in the
analysis context.
