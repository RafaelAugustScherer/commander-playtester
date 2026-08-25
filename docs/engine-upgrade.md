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
- **Keep the glue verbatim.** `engine_wasm.js` is the frontend build's minified `engine_wasm-<hash>.js` chunk (Vite output wrapping the wasm-bindgen glue), **not** raw `wasm-bindgen --target web` output — replace it wholesale, never hand-edit.
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
| Recover tagged assets from CI (primary acquire) | `scripts/engine-assets-from-ci.sh` |
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

The release prose is a **weak** signal for new decisions. For positive evidence,
diff the phase client's canonical wire-type mirror between the two tags —
`client/src/adapter/types.ts` is the TypeScript union of every `WaitingFor`
decision and action the engine can emit:

```sh
for t in <current> <target>; do
  gh api "repos/phase-rs/phase/contents/client/src/adapter/types.ts?ref=$t" \
    --jq .content | base64 -d > "at-$t.ts"
done
diff -u at-<current>.ts at-<target>.ts
```

A **new** `WaitingFor` variant is interaction work; an added **optional field** on
an existing variant usually is not (especially one this app never surfaces).

### 3. Obtain the target's web assets + glue

The GitHub release for a tag attaches only desktop/server binaries — **not** the
web assets (wasm + glue). The wasm and glue have **no** published per-version
manifest anywhere; the frontend build is their only non-source record of the
content hashes. Get them one of three ways:

- **From the CI `frontend-dist` artifact (primary).** Run
  `scripts/engine-assets-from-ci.sh <tag>`. It resolves the tag's commit → its
  "Release" workflow run → the retained `frontend-dist` artifact, extracts the
  vendored glue chunk, and prints the content-hashed `wasm` and `card-data` URLs
  plus the version string it detected. GitHub keeps Actions artifacts **~90 days**,
  so this works for recent targets; the script aborts loudly (pointing you at the
  source build) once the artifact has expired.
- **From the live build (only while upstream hasn't shipped past your target).**
  The phase-rs.dev app serves **only the latest** version, so this route dies the
  moment a newer tag deploys. While it still serves your target, capture the
  `engine_wasm_bg-<hash>.wasm` and `card-data-<hash>.json` URLs it requests and the
  `engine_wasm.js` glue chunk it ships; confirm the version matches.
- **From source** (`scripts/build-engine-from-source.sh [tag]`) when the artifact is
  gone AND the CDN no longer serves the target — it carries the known build
  invariants (pinned nightly, cranelift, the 16 MiB shadow-stack link-arg, MTGJSON
  card-data gen). Reconcile its `CONFIRM` markers against the repo's own build setup.
  Note its glue output is unminified `wasm-bindgen --target web`, differently shaped
  from the vendored Vite chunk (see step 4).

Cross-check as you go (content hash in each CDN filename = first 16 hex of the
file's sha256):

- **card-data has a signed source of truth.** The `release-server-<tag>.json`
  release asset (with a `.minisig`) lists the card-data `sha256` + URL:
  `gh release download <tag> --repo phase-rs/phase --pattern 'release-server-<tag>.json' --output -`.
  Use it to confirm the hash the frontend referenced.
- The phase-rs CDN keeps old content-hashed files around, so once you know a hash
  you can still fetch it and digest-verify (via the manifest + `fetch-engine.sh`).

Compute `sha256sum` of the new wasm and the raw card-data JSON.

### 4. Replace the vendored glue

Overwrite `src/engine/vendor/engine_wasm.js` **verbatim** with the glue from the
source you pinned, and record its new sha256. The vendored glue is the frontend
build's minified `engine_wasm-<hash>.js` chunk (Vite output) — that is what the CI
artifact and the live build ship, and what step 3's primary/secondary routes hand
you. Between adjacent versions this chunk usually differs by a single token (the
embedded default wasm URL hash), so a token-level `git diff` of the replaced file
is a quick "did the wasm-bindgen ABI move?" check — a one-token diff means it did
not.

If you took the **source-build** fallback instead, its `wasm-bindgen --target web`
output is unminified, full-symbol glue: functionally equivalent but differently
shaped (larger, no clean one-token diff). Vendor that output as-is and record its
sha; do not try to make it match the previous minified chunk.

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
