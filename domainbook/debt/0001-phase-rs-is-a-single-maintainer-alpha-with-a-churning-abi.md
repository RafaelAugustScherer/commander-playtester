---
status: accepted
date: 2026-08-15
severity: medium
quadrant: deliberate-prudent
decisions: [ADR-0001, ADR-0002, ADR-0006]
---

# phase-rs is a single-maintainer alpha with a churning ABI

## Debt

The whole project rests on phase-rs, an early alpha (a few months old),
effectively single-maintainer, that publishes no consumable package and promises no
API stability. We vendor a pinned prebuilt snapshot (`ADR-0006`) — the committed
wasm-bindgen glue plus the fetched WASM and card-data — and depend on a large,
fast-moving typed surface (the engine's action/state types and its worker adapter).

## Impact

Every engine bump can break the `engine adapter` and the types at the seam — a new
release can change the shape of a move or a game state and ripple into our code. The
snapshot's CDN URLs are content-hashed and phase-rs ships daily, so a pinned URL can
404 as old assets are pruned, and the three vendored pieces (glue, WASM, card-data)
must stay a matched set or the engine mis-loads. A stalled or abandoned maintainer
would strand us on whatever version we pinned. Each deliberate re-sync (refetch or
rebuild, diff the types) is real work — worst if we chase HEAD instead of pinning.

## Remedy

Pin the whole snapshot as a coherent version and re-sync on purpose, not
continuously; keep *all* engine coupling behind the adapter so a break is contained
to one module (`ADR-0002`). Keep the large assets out of git and refetch them with
`scripts/fetch-engine.sh` (pinned URLs). When those URLs eventually expire, the
durable reproduction is a source build at the pinned tag, carrying phase-rs's build
invariants (pinned nightly toolchain, the 16 MiB shadow-stack link arg). If the
project stalls entirely, the recorded exit is the Forge fallback (`ADR-0001`).
