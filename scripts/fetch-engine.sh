#!/usr/bin/env bash
# Fetches the vendored phase-rs engine runtime assets that are too large to
# commit: the compiled WASM (~28 MiB) and the card database (~95 MiB). These
# land in public/engine/ where the app loads them at runtime.
#
# Pinned to the phase-rs v0.55.0 web build. The wasm-bindgen glue
# (src/engine/vendor/engine_wasm.js) is committed and must match this WASM.
#
# These are content-hashed URLs on phase-rs.dev's CDN. phase-rs ships daily, so
# they may eventually 404 as old assets are pruned. If that happens, build the
# matching WASM + card-data from source at the pinned git tag — see
# domainbook/decisions/0006 and domainbook/debt/0001.
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/public/engine"
WASM_URL="https://data.phase-rs.dev/wasm/engine_wasm_bg-c214e9ae9bddbd05.wasm"
CARD_DATA_URL="https://data.phase-rs.dev/card-data-bf86286a0934abc9.json"

mkdir -p "$DEST"

echo "Fetching engine WASM → $DEST/engine_wasm_bg.wasm"
curl -fSL "$WASM_URL" -o "$DEST/engine_wasm_bg.wasm"

echo "Fetching card database (~95 MiB) → $DEST/card-data.json"
curl -fSL "$CARD_DATA_URL" -o "$DEST/card-data.json"

# Sanity check: WASM magic bytes and non-trivial card-data size.
if ! head -c 4 "$DEST/engine_wasm_bg.wasm" | grep -q $'\x00asm'; then
  echo "ERROR: downloaded WASM is not a valid module (URL may have expired)." >&2
  exit 1
fi
size=$(wc -c < "$DEST/card-data.json")
if [ "$size" -lt 10000000 ]; then
  echo "ERROR: card-data.json looks too small ($size bytes); download failed." >&2
  exit 1
fi

echo "Done. Engine assets ready in public/engine/."
