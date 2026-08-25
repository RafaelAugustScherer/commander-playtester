#!/usr/bin/env bash
# Recover the EXACT web assets for a pinned phase-rs tag (glue + the wasm and
# card-data URLs) from the retained CI build, for an engine upgrade.
#
# Why this exists: the phase-rs.dev app only ever serves ONE version — whatever
# is latest — so the "capture from the live build" route in docs/engine-upgrade.md
# stops working the moment upstream ships past your target tag. The GitHub release
# for a tag attaches only server binaries, not the web assets. But the tag's
# "Release" workflow run retains a `frontend-dist` artifact (the built Vite app),
# and that artifact carries the vendored glue chunk plus the content-hashed wasm
# and card-data URLs the app loads. The phase-rs CDN keeps old content-hashed
# files around, so once this prints the hashes you can fetch and digest-verify
# them (via the manifest + scripts/fetch-engine.sh) exactly as if captured live.
#
# GitHub retains Actions artifacts ~90 days. For a tag older than that the
# `frontend-dist` artifact is gone and this aborts — fall back to a source build
# (scripts/build-engine-from-source.sh <tag>).
#
# Usage: scripts/engine-assets-from-ci.sh <tag>   (e.g. v0.56.0)
# Requires the GitHub CLI (`gh`), authenticated (read access to phase-rs/phase).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="phase-rs/phase"
OUT="$ROOT/.engine-ci"
CDN="https://data.phase-rs.dev"

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING tool: $1 — $2" >&2; exit 1; }; }
need gh    "install the GitHub CLI and run 'gh auth login'"
need unzip "install unzip"

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "usage: scripts/engine-assets-from-ci.sh <tag>   (e.g. v0.56.0)" >&2
  exit 2
fi

echo "Recovering phase-rs $TAG web assets from the CI frontend-dist artifact"
echo "Repo: https://github.com/$REPO"
echo

# --- 1. Tag → commit --------------------------------------------------------
# refs/tags points at a tag object (annotated) or straight at a commit; deref.
OBJ_SHA="$(gh api "repos/$REPO/git/refs/tags/$TAG" --jq '.object.sha' 2>/dev/null || true)"
if [ -z "$OBJ_SHA" ]; then
  echo "ERROR: tag $TAG not found in $REPO." >&2
  exit 1
fi
OBJ_TYPE="$(gh api "repos/$REPO/git/refs/tags/$TAG" --jq '.object.type')"
if [ "$OBJ_TYPE" = "tag" ]; then
  COMMIT="$(gh api "repos/$REPO/git/tags/$OBJ_SHA" --jq '.object.sha')"
else
  COMMIT="$OBJ_SHA"
fi
echo "  tag $TAG → commit $COMMIT"

# --- 2. Commit → the "Release" workflow run ---------------------------------
# Prefer a successful run; fall back to any Release run for the commit.
RUN="$(gh api "repos/$REPO/actions/runs?head_sha=$COMMIT&per_page=100" \
  --jq '[.workflow_runs[] | select(.name=="Release")] | (map(select(.conclusion=="success")) + .) | .[0].id // empty')"
if [ -z "$RUN" ]; then
  echo "ERROR: no \"Release\" workflow run found for $TAG ($COMMIT)." >&2
  echo "       The web assets are only produced by that run — build from source instead:" >&2
  echo "       scripts/build-engine-from-source.sh $TAG" >&2
  exit 1
fi
echo "  Release run: https://github.com/$REPO/actions/runs/$RUN"

# --- 3. Run → the frontend-dist artifact ------------------------------------
ART_ID="$(gh api "repos/$REPO/actions/runs/$RUN/artifacts" \
  --jq 'first(.artifacts[] | select(.name=="frontend-dist") | .id) // empty')"
if [ -z "$ART_ID" ]; then
  echo "ERROR: the Release run for $TAG has no \"frontend-dist\" artifact." >&2
  echo "       Build from source instead: scripts/build-engine-from-source.sh $TAG" >&2
  exit 1
fi
ART_EXPIRED="$(gh api "repos/$REPO/actions/runs/$RUN/artifacts" \
  --jq 'first(.artifacts[] | select(.name=="frontend-dist") | .expired) // "false"')"
if [ "$ART_EXPIRED" = "true" ]; then
  echo "ERROR: the frontend-dist artifact for $TAG has EXPIRED (GitHub retains" >&2
  echo "       Actions artifacts ~90 days). The exact tagged web assets are no" >&2
  echo "       longer downloadable — build from source instead:" >&2
  echo "       scripts/build-engine-from-source.sh $TAG" >&2
  exit 1
fi

# --- 4. Download + unzip ----------------------------------------------------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
echo "  downloading frontend-dist artifact (~56 MiB)…"
# The zip is served from a blob store that occasionally resets a large transfer;
# retry a few times before giving up.
attempt=1
until gh api "repos/$REPO/actions/artifacts/$ART_ID/zip" > "$WORK/frontend-dist.zip" 2>/dev/null; do
  if [ "$attempt" -ge 5 ]; then
    echo "ERROR: could not download the frontend-dist artifact after $attempt tries." >&2
    exit 1
  fi
  echo "  download failed (attempt $attempt) — retrying…" >&2
  attempt=$((attempt + 1))
done
unzip -q "$WORK/frontend-dist.zip" -d "$WORK/dist"

# --- 5. Extract the glue + the content-hashed asset URLs --------------------
# The `|| true` on each pipeline keeps a no-match (or head's early-close SIGPIPE)
# from tripping `set -o pipefail`; the explicit empty-checks below report instead.
GLUE_SRC="$(find "$WORK/dist" -type f -name 'engine_wasm-*.js' | head -1 || true)"
if [ -z "$GLUE_SRC" ]; then
  echo "ERROR: no engine_wasm-*.js glue chunk in the artifact — the frontend build" >&2
  echo "       layout may have changed; inspect $WORK/dist and update this script." >&2
  trap - EXIT
  exit 1
fi

# The bundle references the wasm and card-data by their content-hashed filenames.
WASM_FILE="$(grep -rhoE 'engine_wasm_bg-[a-f0-9]+\.wasm' "$WORK/dist" | sort -u | head -1 || true)"
CARD_FILE="$(grep -rhoE 'card-data-[a-f0-9]+\.json' "$WORK/dist" | sort -u | head -1 || true)"
DETECTED_VERSION="$(grep -rhoE 'v0\.[0-9]+\.[0-9]+' "$WORK/dist/assets" | sort -u | head -1 || true)"
if [ -z "$WASM_FILE" ] || [ -z "$CARD_FILE" ]; then
  echo "ERROR: could not locate the wasm/card-data references in the artifact." >&2
  trap - EXIT
  exit 1
fi

mkdir -p "$OUT"
cp "$GLUE_SRC" "$OUT/engine_wasm.js"
GLUE_SHA="$(sha256sum "$OUT/engine_wasm.js" | cut -d' ' -f1)"

WASM_URL="$CDN/wasm/$WASM_FILE"
CARD_URL="$CDN/$CARD_FILE"

# --- 6. Report --------------------------------------------------------------
echo
if [ "$DETECTED_VERSION" != "$TAG" ]; then
  echo "WARNING: bundle version string is '$DETECTED_VERSION', expected '$TAG'." >&2
  echo "         Confirm you resolved the right run before pinning." >&2
  echo
fi
echo "Recovered phase-rs $TAG web assets (bundle reports: ${DETECTED_VERSION:-unknown}):"
echo
echo "  glue        → $OUT/engine_wasm.js"
echo "                sha256 $GLUE_SHA"
echo "  wasm url      $WASM_URL"
echo "  card-data url $CARD_URL"
echo
echo "Next: cross-check the card-data hash against the signed release manifest"
echo "  gh release download $TAG --repo $REPO --pattern 'release-server-$TAG.json' --output -"
echo "Then copy the glue into place, point the manifest URLs at the two files, and"
echo "run 'npm run fetch-engine' (it downloads + verifies each SHA-256). See"
echo "docs/engine-upgrade.md."
