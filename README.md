# SkatePlus — playable browser prototype

A local skateboarding game built inside a fork of [SK8-ENGINE/skate-3-rust-engine](https://github.com/SK8-ENGINE/skate-3-rust-engine). Original procedural park, skateboard and rigged character; no EA game assets are needed or included. Original upstream documentation and attribution are preserved in [README-UPSTREAM.md](README-UPSTREAM.md).

## Start

Requires Node.js 20.19+ or 22.12+ (Node 24 tested). The compiled Rust physics module is included, so Rust is only needed when modifying physics.

```sh
cd browser
npm ci
npm run dev
```

Open `http://localhost:5173` on this computer. Vite provides TypeScript/CSS live reload. The initial JavaScript download can take a few seconds. Use a desktop browser with WebGL 2, keyboard, or a standard gamepad. This is a real-time 3D game with a Rust/Rapier collision world, not a recorded demo.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Push | W / Up | A or analog RT |
| Turn | A / D | Left stick |
| Brake | S / Down | B / right face |
| Ollie | Space | X / left face or LT |
| Kickflip in air | J | Y / top face |
| Heelflip in air | K | LB |
| Pop shove-it in air | L | RB |
| Balance during 50–50 grind | A / D | Left stick |
| Pop out of a grind | Space | X / left face or LT |
| Camera orbit | Left / Right arrows | Right stick X |
| Reset position | R / Reset button | Back / View |
| Character workshop | C / Character button | Garage navigation |
| Environment garage | E / Environment button | Menu |
| Fullscreen | F / fullscreen button | Use mouse |
| Physics diagnostics | F2 | — |
| Debug slow motion / pause / single step | T / P / N while F2 is open | — |

Ollie first, then choose a trick while airborne. Give flips roughly half a second to complete. Completed tricks score on landing; late flips bail without points. Reset preserves the session score. The workshop pauses physics.

**Grinding:** a long practice rail is directly ahead of spawn. Hold W for about a second, then tap Space and coast. Descending onto the rail with the board aligned automatically catches a 50–50. Use A/D (left stick) to keep the balance marker centered, Space (X/LT) to pop out, or ride off the end. Hold A/D as you pop to choose the exit side. S/B brakes on the rail. Points build while sliding and bank when you land; losing balance or stalling drops the pending grind points. Rails catch in either direction. Sideways approaches, unfinished flips, and simply rolling into a rail do not attach. Alt-tab clears held keys. Click the game after interacting with another application.

## Included cartoon skater

Press **C** and select **Bolt — cartoon robot** for the rigged yellow Quaternius robot. His original 14 clips (including Dance and Wave) can be previewed in the workshop. Catalog tuning fits him to the board; Idle/Walking clips provide the initial ride/push animation, rather than custom motion-captured skating. The CC0 model is credited in `assets/characters/custom/quaternius/SOURCE.md`; repaired skin weights pass glTF validation. Yard Skater remains selectable.

## Custom characters

Press **C**, select a GLB (preferred) or a glTF together with its .bin/textures and optional character JSON, inspect the rig and animation preview, adjust height and facing, and choose **Use this character**. Files and adjustments persist in this browser via IndexedDB; nothing is uploaded. Import limit is 50 MB total. Imported characters do not change physics.

For a source-controlled local catalog, put models in `assets/characters/custom/` and run `npm run characters` from `browser/`. See [character specifications](browser/docs/CHARACTERS.md), including the supported bone names and retargeting limits. Exact clip/bone mappings and visual offset can be supplied in `character.example.json`.

Press **E** for the environment garage. It imports GLB/glTF parks with real mesh collision, configurable spawn and grind rails; includes a small Import Sandbox example; and preserves your skater when changing parks. Source assets go in `assets/environments/custom/`. Run `npm run assets` to refresh both catalogs. The [asset handoff guide](browser/docs/ASSET_PIPELINE.md) covers character/environment specifications, JSON templates, collision proxies, and Xbox menu controls.

## Architecture and scope

- `browser/physics/`: isolated Rust/WASM host, fixed 120 Hz skating controller. Depends directly on upstream `skate-dynamics` and `skate-core` path crates. A small optional ground-friction API was added to dynamics while preserving existing callers' defaults.
- `skate-dynamics::DynamicsWorld`: original upstream Rapier 0.35.3 integration supplies collision shapes, gravity, continuous collision detection, contact resolution, and ray queries.
- `skate-core::riding::steering::calculate_tilt`: reused steering calculation with original prototype tuning graphs. `skate-core::camera::ScalarTracker`: reused follow-camera tracking.
- `browser/src/`: Babylon.js WebGL 2 rendering, scene and character import, input, HUD and scoring display. Camera ray tests prevent clipping through park obstacles.
- `assets/characters/custom/yard-skater.glb`: original 15-bone skinned model with five animation clips; reproducible with `python3 browser/scripts/generate-character.py`.
- Existing Bevy desktop entry points remain available; the new ground-friction overload preserves the original dynamics default. This milestone is an isolated browser host, **not a complete Bevy/WebGPU port or parity recreation**. Its controller, trick state machine, scoring rules and visual animation are new prototype systems. Full original gameplay requires retail graphs/animation data that are deliberately not bundled.

The engine audit and foundation decision are in [AUDIT.md](docs/skateplus/AUDIT.md). Verified milestones and limitations are tracked in [PROGRESS.md](docs/skateplus/PROGRESS.md).

## Build and verify

To change Rust physics, install stable Rust and add the WASM target, then:

```sh
rustup target add wasm32-unknown-unknown
./browser/scripts/build-physics.sh
cargo test --manifest-path browser/physics/Cargo.toml
cd browser
npm test
npm run build
```

The separate Cargo workspace avoids compiling native Bevy, SDL, audio, and asset-conversion dependencies for the web. Lockfiles pin dependencies. After changing Rust dependencies, regenerate the bundled third-party notices with `python3 browser/scripts/dependency-notices.py`. `npm test` instantiates the actual shipped WASM in Node and checks movement, all tricks, scoring, a convex ramp, a solid wall, and reset. `npm run build` includes strict TypeScript checking. Rust source edits require rebuilding WASM and refreshing the page; they are not hot-reloaded.

## Static deployment

```sh
cd browser
npm ci
npm run assets
npm test
npm run build
npm run preview
```

Deploy **all of `browser/dist/`** to any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, etc.). Relative asset paths support subdirectories. Serve `.wasm` as `application/wasm`; the loader also supports hosts with a generic MIME type. No server, API key, cross-origin isolation or asset CDN is required. Gamepad support normally requires HTTPS or localhost. Xbox has analog RT/A push, deadzones, gameplay mappings and D-pad/A/B garage navigation; connect and press A to activate the browser pad. This delivery has not been publicly deployed. For physics changes, rebuild the WASM before the static build.

For GPL distribution, publish the corresponding complete source of the exact binary, preserve this repository's license and upstream notices, include the dependency licenses, and offer source alongside your build. `npm run build` copies license/source notices into `dist/`. Update its source URL to the exact release commit before a public release. Do not add unlicensed character or EA assets to the deploy directory.

## Known limits / next work

- Arcade single-sphere rider collision; the visible board and humanoid are decoupled from the collider. No original articulated-board or ragdoll simulation, manuals, replay, multiplayer, sound, or retail animation graph parity.
- Convex banks, tabletop, ledges and two grindable rails. Arcade 50–50 constraints reuse upstream grind friction; boardslides, nose/tail grinds, ledge grinds and the full recovered grind manager are not implemented. Some obstacle edges stop the rider; ollie over them. Camera avoidance uses render geometry.
- Named humanoid relative-pose fallback, not universal arbitrary-skeleton/axis retargeting. Embedded named skating clips are preferred. Inspect each new model; Blender retargeting may be needed for unusual bind axes.
- Standard gamepad mapping is implemented and tested with a simulated browser gamepad; no physical controller has been verified in this run. Touch gameplay is not implemented.
- WebGL 2 rendering is the tested path; no WebGPU-only dependency. Babylon bundle is about 1.4 MB gzip before static compression; physics about 1.3 MB uncompressed. Performance depends on device/GPU.
- Browser imports are local to the current browser profile and origin. Clearing site data deletes them. Keep your original model files.

## License and credit

GPL-3.0-only for this fork's game code, following upstream. Copyright (c) 2026 dumbad and the Skate 3 Rust Engine contributors; SkatePlus additions (c) 2026 Winesett contributors. Preserve [LICENSE](LICENSE). Credit to dumbad's reverse-engineering research and tools, Chasm's renderer/rewrite work, and all upstream contributors. Original generated Yard Skater asset, its generator, and Import Sandbox are CC0-1.0. Bolt / RobotExpressive by Tomás Laulhé (Quaternius), converted with facial expression additions by Don McCurdy, is CC0-1.0; attribution and the pinned source are included. Babylon.js is Apache-2.0; Rapier is Apache-2.0; other third-party notices retain their licenses. This is an unofficial independent prototype, not affiliated with Electronic Arts.
