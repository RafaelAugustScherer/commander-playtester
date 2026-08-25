#!/usr/bin/env bash
# Last-resort durable path: rebuild the phase-rs web assets (WASM + wasm-bindgen
# glue + card-data) from source at a pinned tag, for when the CDN URLs have been
# pruned AND no mirror was captured (see domainbook/decisions/0006 + debt/0001).
#
# This encodes the build invariants we know about phase-rs; the AUTHORITATIVE
# recipe lives in the phase repo itself. Steps marked CONFIRM must be reconciled
# against that repo's build docs/CI for the target tag before trusting the output
# — crate paths and exact flags can move between releases.
#
# Usage: scripts/build-engine-from-source.sh [tag]   (default: manifest version)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/src/engine/vendor/engine-manifest.json"
TAG="${1:-$(node -e "process.stdout.write(require('$MANIFEST').version)")}"
REPO_URL="https://github.com/phase-rs/phase"
WORK="$ROOT/.engine-build"
OUT="$ROOT/.engine-build/out"

echo "Building phase-rs web assets from source at tag: $TAG"
echo "Repo: $REPO_URL"
echo

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING tool: $1 — $2" >&2; exit 1; }; }
need git   "install git"
need rustup "install Rust via https://rustup.rs"
need node  "install Node 20+"

# --- 1. Source checkout at the pinned tag -----------------------------------
rm -rf "$WORK"
git clone --depth 1 --branch "$TAG" "$REPO_URL" "$WORK/phase"
cd "$WORK/phase"

# --- 2. Toolchain invariants (from debt/0001) -------------------------------
# phase-rs builds its WASM on a pinned Rust NIGHTLY with the cranelift codegen
# backend, targeting wasm32-unknown-unknown, and links with a mandatory 16 MiB
# shadow stack. CONFIRM the exact nightly date against the repo's
# rust-toolchain.toml (it pins one) — prefer that file over this default.
TOOLCHAIN="$(node -e "try{const fs=require('fs');const t=fs.readFileSync('rust-toolchain.toml','utf8');const m=t.match(/channel\s*=\s*\"([^\"]+)\"/);process.stdout.write(m?m[1]:'')}catch{process.stdout.write('')}" 2>/dev/null || true)"
TOOLCHAIN="${TOOLCHAIN:-nightly}"
echo "Using toolchain: $TOOLCHAIN (CONFIRM against rust-toolchain.toml)"
rustup toolchain install "$TOOLCHAIN" --component rustc-codegen-cranelift-preview || true
rustup target add wasm32-unknown-unknown --toolchain "$TOOLCHAIN"

command -v wasm-bindgen >/dev/null 2>&1 || cargo install wasm-bindgen-cli

mkdir -p "$OUT"

# --- 3. Compile the engine-wasm crate to wasm -------------------------------
# CONFIRM the crate name/path (the workspace has an `engine-wasm` crate per the
# project overview) and whether cranelift + the shadow-stack arg are applied via
# .cargo/config.toml in the repo (prefer the repo's config if present).
WASM_CRATE="engine-wasm"   # CONFIRM against Cargo.toml [workspace] members
export RUSTFLAGS="${RUSTFLAGS:-} -C link-arg=-zstack-size=16777216"  # 16 MiB shadow stack
cargo +"$TOOLCHAIN" build --release --target wasm32-unknown-unknown -p "$WASM_CRATE" \
  || { echo "Build failed — reconcile WASM_CRATE / RUSTFLAGS / cranelift with the repo's build setup." >&2; exit 1; }

RAW_WASM="target/wasm32-unknown-unknown/release/${WASM_CRATE//-/_}.wasm"

# --- 4. wasm-bindgen glue ----------------------------------------------------
# NOTE: the vendored src/engine/vendor/engine_wasm.js is normally the frontend
# build's MINIFIED Vite chunk (engine_wasm-<hash>.js) — the output below is raw
# `--target web` glue: unminified, full-symbol, functionally equivalent but
# differently shaped, so it will NOT byte-match the previously vendored file.
# That is expected on the source-build fallback; vendor this output as-is.
# CONFIRM the flag set against the repo's own wasm-bindgen invocation (some
# builds also run wasm-opt).
wasm-bindgen "$RAW_WASM" --out-dir "$OUT" --target web --out-name engine_wasm
echo "  glue + _bg.wasm → $OUT (engine_wasm.js, engine_wasm_bg.wasm)"

# --- 5. Card database over MTGJSON ------------------------------------------
# CONFIRM the generator: the repo has a card-data generation step over MTGJSON.
# It is usually a cargo xtask or a script; produce card-data.json into $OUT.
echo "CONFIRM: run the repo's card-data generator (MTGJSON) and write card-data.json → $OUT"
echo "         e.g. 'cargo xtask card-data' or the documented data build; see the repo."

# --- 6. Digests for the manifest --------------------------------------------
echo
echo "Built artifacts in $OUT. Record these in src/engine/vendor/engine-manifest.json:"
for f in engine_wasm_bg.wasm engine_wasm.js card-data.json; do
  if [ -f "$OUT/$f" ]; then
    printf "  %-24s sha256 %s\n" "$f" "$(sha256sum "$OUT/$f" | cut -d' ' -f1)"
  fi
done
echo
echo "Then: copy engine_wasm.js → src/engine/vendor/, host the wasm + card-data"
echo "(mirror release), point the manifest URLs at them, and run npm run engine-smoke."
