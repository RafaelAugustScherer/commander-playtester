#!/usr/bin/env bash
# Fetches the vendored phase-rs engine runtime assets that are too large to
# commit: the compiled WASM (~28 MiB) and the card database (~95 MiB). These
# land in public/engine/ where the app loads them at runtime.
#
# The pinned version, download URLs, and expected SHA-256 digests all live in
# ONE place — src/engine/vendor/engine-manifest.json. This script reads that
# manifest, downloads each asset, and verifies its digest before use, so the
# glue + WASM + card-data always stay a matched set. To bump the engine, edit
# the manifest (see docs/engine-upgrade.md), not this script.
#
# The card database is stored gzipped (card-data.json.gz, ~16 MiB): the raw
# JSON exceeds GitHub Pages' ~100 MB per-file limit and is slow to download,
# so the engine worker decompresses it at runtime via DecompressionStream.
#
# The phase-rs CDN URLs are content-hashed and pruned over time, so a pinned
# URL can eventually 404. When that happens either (a) set a "mirror.base" in
# the manifest and mirror the pinned set there (scripts/mirror-engine.sh), or
# (b) rebuild from source at the pinned tag (scripts/build-engine-from-source.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/engine"
MANIFEST="$ROOT/src/engine/vendor/engine-manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: manifest not found at $MANIFEST" >&2
  exit 1
fi

# Read a dotted field out of the manifest via node (guaranteed available in CI).
m() { node -e "process.stdout.write(String(require('$MANIFEST').$1 ?? ''))"; }

VERSION="$(m version)"
WASM_URL="$(m assets.wasm.url)"
WASM_SHA="$(m assets.wasm.sha256)"
WASM_DEST="$(m assets.wasm.dest)"
CARD_URL="$(m assets.cardData.url)"
CARD_SHA="$(m assets.cardData.sha256)"
CARD_DEST="$(m assets.cardData.dest)"
CARD_GZIP="$(m assets.cardData.gzip)"
MIRROR_BASE="$(m mirror.base)"

mkdir -p "$DEST"
echo "phase-rs engine snapshot: $VERSION"

# Download $1 (primary URL) to $2, falling back to the manifest mirror base on
# failure, then verify the SHA-256 in $3. Aborts on mismatch.
fetch_verified() {
  local url="$1" out="$2" want_sha="$3" name
  name="$(basename "$url")"

  if ! curl -fSL "$url" -o "$out" 2>/dev/null; then
    if [ -n "$MIRROR_BASE" ]; then
      echo "  primary URL failed; trying mirror: $MIRROR_BASE/$name" >&2
      curl -fSL "$MIRROR_BASE/$name" -o "$out"
    else
      echo "ERROR: download failed for $url" >&2
      echo "       The content-hashed URL may have been pruned. Set mirror.base in" >&2
      echo "       the manifest, or rebuild from source (scripts/build-engine-from-source.sh)." >&2
      return 1
    fi
  fi

  local got_sha
  got_sha="$(sha256sum "$out" | cut -d' ' -f1)"
  if [ "$got_sha" != "$want_sha" ]; then
    echo "ERROR: SHA-256 mismatch for $name" >&2
    echo "       expected $want_sha" >&2
    echo "       got      $got_sha" >&2
    echo "       The manifest and the served asset disagree — do NOT use this file." >&2
    rm -f "$out"
    return 1
  fi
  echo "  verified $name (sha256 ok)"
}

echo "Fetching engine WASM → $DEST/$WASM_DEST"
fetch_verified "$WASM_URL" "$DEST/$WASM_DEST" "$WASM_SHA"
# Belt-and-suspenders: WASM magic bytes.
if ! head -c 4 "$DEST/$WASM_DEST" | grep -q $'\x00asm'; then
  echo "ERROR: $WASM_DEST is not a valid WASM module." >&2
  exit 1
fi

echo "Fetching card database (~95 MiB) → verifying → $DEST/$CARD_DEST"
RAW="$DEST/card-data.raw.json"
fetch_verified "$CARD_URL" "$RAW" "$CARD_SHA"
if [ "$CARD_GZIP" = "true" ]; then
  echo "  compressing → $DEST/$CARD_DEST"
  gzip -9 -c "$RAW" > "$DEST/$CARD_DEST"
  rm -f "$RAW"
else
  mv "$RAW" "$DEST/$CARD_DEST"
fi

echo "Done. Engine assets ($VERSION) ready in public/engine/."
