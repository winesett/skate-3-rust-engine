# Foundation audit — 2026-11-07

## Sources inspected

- Primary: https://github.com/SK8-ENGINE/skate-3-rust-engine, cloned at `2e16697797c8358d16f747a8259354ff2921041a`.
- Alternative: https://github.com/andrewnakas/skate3-cleanroom. GitHub HTTP returned 404 and `git ls-remote` returned repository not found under the authenticated account. It may be private, removed or renamed; no source was inspected and no claim is made about its implementation/license.
- Hosted reference: https://skate.aaddpp.lol/. Inspected in a real browser, including its public JavaScript boot code. No publicly linked source repository was found in the page or inspected bootstrap snippets. Served scripts are observable, but that alone is not permission to redistribute them.

## Rust/Bevy architecture

Workspace crates: skate-core (engine-independent recovered calculations; no dependencies), skate-dynamics (Rapier 0.35.3 world/rigid-body wrapper), skate-data (file/retail asset loaders), skate-game (Bevy 0.18.1 application), audio, mods, network and Steam relay crates. Local Bevy PBR/core-pipeline and SDL sys patches are vendored.

`skate-game/src/main.rs` registers input, camera, physics, animation, assets, world, retail render, setup/updater and other modules. Startup loads prepared game assets, stock gameplay configuration, animation graphs and map collision. Desktop docs request Windows/MSVC, LLVM and an original ISO or extracted copy. `skate-game/Cargo.toml` enables Bevy defaults/dynamic linking and statically built SDL3; the app has native subprocess, file-based setup and update paths. A flag-only wasm compilation is not a sufficient browser port.

Player behavior and articulated-board calculations live in `skate-core/src/player`, `physics` and `riding`; the host orchestrates them in `skate-game/src/physics`. Rig/animation rendering is integrated with retail pose and graph data. The existing desktop custom-model system is file/ECS based (`custom_models.rs`) and launches import tools; it cannot be transplanted directly to a browser file picker. Desktop input uses SDL3 and a Windows XInput fallback. Core camera tracking/math are renderer-independent.

The procedural format-demo map is original content, but does not replace all the retail graphs, character assets and configuration needed by desktop startup. No conversion tools were run and no retail asset sets were downloaded or bundled into this project.

## Hosted implementation

The page's bootstrap requests `pkg/skate3rust_bg.wasm` and describes WebGPU adapter/canvas failures. `host.js` contains a versioned WASM packaging path. The page text says game data comes from the user's converted copy. In this observation, its loader also issued requests to an external game-data archive host. The tab was closed; those archives are not used or copied into this project. This evidence verifies a deployed WASM/WebGPU boot path, not access to a public, licensed source port or proof of gameplay parity.

## Decision

Preserve upstream and create an isolated Rust/WASM host using existing portable code. The browser physics crate imports `skate-dynamics::DynamicsWorld` unchanged for Rapier collision/gravity/CCD, and imports core steering and scalar camera tracking. Babylon.js supplies a production 3D renderer and glTF loader; gameplay runs in Rust rather than JavaScript transform animation. This reduces asset/bootstrap/native platform dependencies while retaining real upstream physics infrastructure.

The host is original, small arcade gameplay integration. It does not run the full recovered Skate 3 state graph or articulated-board pipeline. A minimal new Bevy app could render procedural content in WASM, but would still need new asset-free controller and browser import integration; that would add renderer port work before proving gameplay. The complete Bevy/WebGPU port remains a separate future project. No claim is made that a full upstream WASM build was attempted and failed: feasibility was assessed from source/dependency/startup inspection. The local machine initially had no Rust toolchain and less than 10 GB free; a minimal toolchain plus lightweight host was installed successfully.

## Fork and license

Authenticated GitHub user: winesett. Created https://github.com/winesett/skate-3-rust-engine. Local `upstream` points to SK8-ENGINE; `origin` to winesett. Work branch: `skateplus/browser-prototype`.

GPL-3.0-only applies to upstream original code and this game fork. Original notices, full upstream README and vendor licenses remain in the checkout. New generated character is CC0; Babylon.js and Rapier retain Apache-2.0. A future public binary release must provide corresponding complete source and all applicable notices. Creating the fork is not a public game deployment.
