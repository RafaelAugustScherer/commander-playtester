# Upgrading the phase-rs engine

The app embeds a **pinned snapshot** of the [phase-rs](https://github.com/phase-rs/phase)
engine: the wasm-bindgen glue (`src/engine/vendor/engine_wasm.js`, committed) plus
the WASM and card database (fetched at build time). These three pieces are **one
matched set** — never mix versions. All coupling to the engine lives behind the
adapter (`src/engine/`), so an upgrade is a contained, verifiable operation.

> Prefer running the **`phase-rs-upgrade` sub-agent** (`.claude/agents/phase-rs-upgrade.md`),
> which performs this runbook end-to-end, including implementing new player-action
> interactions. This document is the source of truth it follows.

## Principles

- **Pin, don't chase.** Upgrade deliberately to a chosen release tag; never point at "latest".
- **Keep the glue verbatim.** `engine_wasm.js` is upstream wasm-bindgen output — replace it wholesale, never hand-edit.
- **One source of truth.** Version, URLs, and digests live only in `src/engine/vendor/engine-manifest.json`.
- **Verify digests.** Every fetched asset is checked against its manifest SHA-256. The content hash in each CDN filename is the first 16 hex chars of that asset's sha256.
- **Adapter-only coupling.** The worker imports ~11 engine functions; `types.ts` reads a handful of JSON shapes with loose index signatures. That small surface is what you reconcile on a bump.

## Where things live

| Piece | Path |
| --- | --- |
| Manifest (version, URLs, digests, mirror) | `src/engine/vendor/engine-manifest.json` |
| Vendored glue (verbatim upstream) | `src/engine/vendor/engine_wasm.js` |
| Hand-written type surface | `src/engine/vendor/engine_wasm.d.ts` |
| Worker adapter (imports engine fns) | `src/engine/engine.worker.ts` |
| Engine JSON shapes we read | `src/engine/types.ts` |
| Manual-play decision handlers | `src/sim/decisions/*.ts` |
| Play loop that dispatches decisions | `src/sim/driver.ts` |
| Pending-decision UI wiring | `src/match/RunView.tsx`, `src/board/Board.tsx` |
| Fetch (digest-verified) | `scripts/fetch-engine.sh` |
| Durable mirror | `scripts/mirror-engine.sh` |
| Source-build fallback | `scripts/build-engine-from-source.sh` |
| Smoke gate (real match to GameOver) | `scripts/engine-smoke.test.ts` → `npm run engine-smoke` |

## Steps

### 1. Choose the target version

Look at <https://github.com/phase-rs/phase/releases>. The current pin is `version`
in the manifest. Pick a target tag (releases are daily semver, e.g. `v0.57.0`).

### 2. Read the changes between current and target

Read every release note from the version after the current pin through the target.
**Make a list of user-facing changes**, and in particular any **new player decisions
/ actions** (new "choose …", targeting, modes, etc.) — these become interaction work
in step 7.

### 3. Obtain the target's web assets + glue

The GitHub releases attach only desktop/server binaries — **not** the web assets.
Get them one of two ways:

- **From the live build (preferred while available).** The phase-rs.dev web app loads
  the current assets; capture the `engine_wasm_bg-<hash>.wasm` and `card-data-<hash>.json`
  URLs it requests and the `engine_wasm.js` glue it ships. Confirm the target version
  matches. (Content hash in the filename = first 16 hex of the file's sha256.)
- **From source** (`scripts/build-engine-from-source.sh [tag]`) when the CDN no longer
  serves the target — it carries the known build invariants (pinned nightly, cranelift,
  the 16 MiB shadow-stack link-arg, MTGJSON card-data gen). Reconcile its `CONFIRM`
  markers against the repo's own build setup.

Compute `sha256sum` of the new wasm and the raw card-data JSON.

### 4. Replace the vendored glue

Overwrite `src/engine/vendor/engine_wasm.js` with the new upstream glue **verbatim**.
Record its new sha256.

### 5. Update the manifest

Edit `src/engine/vendor/engine-manifest.json`: `version`, `source.tag`,
`source.releaseNotes`, `assets.wasm.{url,sha256}`, `assets.cardData.{url,sha256}`,
`assets.glue.sha256`.

### 6. Fetch (verifies digests) and mirror

```sh
npm run fetch-engine          # downloads + verifies SHA-256, gzips card-data
scripts/mirror-engine.sh      # uploads the pinned set to an engine-<version> release
```

Set `mirror.base` in the manifest to the printed release-download base so future
fetches survive CDN pruning.

### 7. Reconcile the ABI, then implement new player actions

- **Signatures.** Diff the engine functions the worker imports (`engine.worker.ts`)
  against the new glue exports. If any changed, update `engine_wasm.d.ts` and the call sites.
- **State shapes.** If `types.ts` fields drifted, the smoke's shape check (step 8) will
  flag it; update `types.ts` accordingly.
- **New player decisions (from step 2).** For each new decision that can be aimed at the
  **human** seat, implement the manual-play interaction using the established pattern
  (below). AI-only decisions need nothing — the AI already drives them.

#### The manual-play interaction pattern

Adding one player decision touches six places (mirror an existing handler such as
`src/sim/decisions/creatureType.ts`):

1. **`src/sim/decisions/<name>.ts`** — `parse<Name>Prompt(wf): <Name>Prompt | null`
   (reads the engine `waiting_for`, returns a typed prompt or null) and a `<verb>Action(...)`
   builder that produces the engine action. Add `<name>.test.ts`.
2. **`src/sim/driver.ts`** — add a `requestHuman<Name>?` callback to `DriverCallbacks`,
   parse it in `playLoop`, and add the dispatch branch.
3. **`src/match/RunView.tsx`** — add pending-turn state, wire the `requestHuman<Name>`
   callback to set it and `resolve` the choice.
4. **`src/board/Board.tsx`** — render the selection UI for the pending decision.
5. **`src/i18n/messages.ts`** — PT + EN strings for every new label.
6. **Tests** — parser/action unit tests; extend the smoke if it exercises the path.

### 8. Verify (all must pass)

```sh
npm run typecheck
npm run lint
npm test
npm run duplication
npm run engine-smoke      # boots the new WASM, runs a full match to GameOver
npx domainbook check --range origin/main..HEAD
```

The smoke is the key gate: it catches ABI/JSON-shape breaks that unit tests can't.

### 9. Document and open the PR

- Add a `Changed` entry to `domainbook/domains/simulation/changelog.md` (naming the
  version bump and any new interactions).
- Update the README asset-size note if sizes moved.
- Commit and open a PR summarizing the version delta and the interactions added.

## Rollback

Revert `engine-manifest.json` and `engine_wasm.js` to the previous commit and run
`npm run fetch-engine`. Because the digests are pinned, a rollback restores the exact
prior matched set.
