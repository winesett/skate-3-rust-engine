#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --manifest-path physics/Cargo.toml --target wasm32-unknown-unknown --release
mkdir -p public/engine
cp physics/target/wasm32-unknown-unknown/release/skateplus_web_physics.wasm public/engine/
