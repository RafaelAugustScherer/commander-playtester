#!/usr/bin/env bash
# Durability tool: mirror the pinned phase-rs engine assets to a GitHub Release
# on THIS repo, so the snapshot survives the upstream CDN pruning its
# content-hashed URLs (see domainbook/debt/0001).
#
# Run this WHILE the primary CDN URLs are still alive. It re-downloads the raw
# assets named in the manifest, verifies their SHA-256, uploads them to a
# release tagged engine-<version>, and prints the mirror.base to record in the
# manifest. After that, scripts/fetch-engine.sh transparently falls back to the
# mirror when a primary URL 404s.
#
# Requires the GitHub CLI (`gh`) authenticated with write access to the repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/src/engine/vendor/engine-manifest.json"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

m() { node -e "process.stdout.write(String(require('$MANIFEST').$1 ?? ''))"; }

VERSION="$(m version)"
WASM_URL="$(m assets.wasm.url)"
WASM_SHA="$(m assets.wasm.sha256)"
CARD_URL="$(m assets.cardData.url)"
CARD_SHA="$(m assets.cardData.sha256)"
TAG="engine-$VERSION"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: this script needs the GitHub CLI (gh), authenticated with repo write access." >&2
  echo "       Install it, run 'gh auth login', then re-run. Alternatively upload the two" >&2
  echo "       raw files below to a release manually and set mirror.base in the manifest." >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

dl() { # url sha out
  echo "  downloading $(basename "$1")" >&2
  curl -fSL "$1" -o "$3"
  local got; got="$(sha256sum "$3" | cut -d' ' -f1)"
  if [ "$got" != "$2" ]; then
    echo "ERROR: SHA-256 mismatch for $(basename "$1") — refusing to mirror." >&2
    exit 1
  fi
}

echo "Mirroring phase-rs $VERSION assets to $REPO release $TAG"
# Mirror the ORIGINAL filenames + raw bytes: fetch-engine's mirror fallback
# requests <mirror.base>/<original-basename> and re-verifies the same SHA-256.
WASM_FILE="$WORK/$(basename "$WASM_URL")"
CARD_FILE="$WORK/$(basename "$CARD_URL")"
dl "$WASM_URL" "$WASM_SHA" "$WASM_FILE"
dl "$CARD_URL" "$CARD_SHA" "$CARD_FILE"

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "  release $TAG exists — uploading (clobbering) assets"
  gh release upload "$TAG" "$WASM_FILE" "$CARD_FILE" --repo "$REPO" --clobber
else
  gh release create "$TAG" "$WASM_FILE" "$CARD_FILE" \
    --repo "$REPO" \
    --title "phase-rs engine snapshot $VERSION" \
    --notes "Durable mirror of the pinned phase-rs $VERSION web assets (WASM + card-data). Consumed as a fallback by scripts/fetch-engine.sh. Not for general download."
fi

echo
echo "Done. Set this in src/engine/vendor/engine-manifest.json under \"mirror\":"
echo "  \"base\": \"https://github.com/$REPO/releases/download/$TAG\""
