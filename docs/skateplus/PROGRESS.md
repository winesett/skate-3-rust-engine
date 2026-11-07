# Verified progress — 2026-11-07

- Cloned primary upstream at `2e16697797c8358d16f747a8259354ff2921041a`; preserved original README, license and attribution. Created authenticated `winesett/skate-3-rust-engine` fork and configured origin/upstream.
- Audited workspace, Bevy host startup, SDL, asset/graph loading, custom characters, core steering/camera and Rapier dynamics. Alternative cleanroom source unavailable (GitHub 404 and Git repository not found). Hosted reference publicly serves WASM/WebGPU bootstrap; no public source port verified. No EA content used in this prototype.
- Built isolated Rust/WASM target using existing unchanged upstream `skate-dynamics` and `skate-core`. Rust native tests pass (2). Real compiled WASM tests pass (3): movement/brake/turn/reset/all tricks, convex ramp traversal/solid wall, and failed late flip without scoring.
- Built original procedural park with north/south banks, tabletop, kicker, ledges, pad, flat bar and boundaries. Rider is an arcade sphere with CCD; steering/camera kernels reused. Third-person camera and keyboard control verified in real browser.
- Browser keyboard QA: after one second pushing, Z moved from -12 to about -8.15 and speed reached 7.44 m/s. Ollie rose above 1.2 m board-root height; kickflip state entered; landed for 250 points. Roughly 60 FPS observed on this Mac browser; not a cross-device performance guarantee.
- Generated original rigged/skinned 15-bone GLB with five clips. Khronos glTF validator reports zero errors. Generator and model included, CC0 dedication.
- Workshop preview and rig diagnostics verified. Uploaded GLB, set scale 1.15 and facing 25 degrees, applied, reloaded, and confirmed model plus both adjustments persisted. Separate glTF + .bin fixture (renamed Mixamo joints, zero clips) imported and rode with fallback poses. Missing .bin reports a specific error and preserves active character. Restored original Yard Skater selection after QA.
- Standard Gamepad API path tested with synthetic browser pad: A push, X jump and Y flip, landing for 250 points. No physical gamepad connected in this run.
- Fullscreen enter/exit verified through actual button clicks. Responsive workshop layout observed at narrow width. Debug HUD, pause/step/slow controls verified: pause held the state constant; single-step returned finite state.
- Production build served independently on port 4173 and verified in browser with loaded WASM, original skater and WebGL 2 at roughly 60 FPS. Production TypeScript/Vite build passes; output in browser/dist. Physics WASM ~1.2 MB; main JS ~1.38 MB gzip. Original and third-party license/source notices copied to static output. Public hosting not performed.

## Scope retained for next milestone

This is an independently playable prototype, not full upstream Bevy/WebGPU or Skate 3 behavior parity. New arcade host drives the existing Rapier world; full recovered articulated board, authored animation graph, grinds/manuals/ragdolls and retail systems are not integrated. Retargeting is limited to semantic humanoid relative poses or model-provided clips; arbitrary bone-axis conversion and foot IK remain future work. Physical gamepad and mobile touch testing remain outstanding.

## Reproduce

```sh
cargo test --manifest-path browser/physics/Cargo.toml
./browser/scripts/build-physics.sh
cd browser
npm test
npm run build
npm run dev
```

See README.md and browser/docs/CHARACTERS.md for setup, controls, model import and static deployment. Vite config/dependency edits can restart the server and disconnect an open preview; navigate again after readiness. Tailscale was observed stopped; no remote preview was claimed.

## Texture/rendering fix — 2026-11-07

- Replaced overlapping seam strips with a seamless concrete texture; trilinear mipmaps and anisotropic filtering reduce distant shimmer.
- Corrected wedge winding/outward normals and split face vertices so ramp edges shade cleanly. Added metre-based UVs to ramps and boxes.
- Enabled mipmapping on the sign and PCF shadow filtering with explicit depth/normal bias.
- Corrected inverted high-DPI render scaling: on a DPR 2 display the QA canvas now renders 1440 pixels for 960 CSS pixels, rather than undersampling.
- Verified surfaces in desktop Chrome while pushing and orbiting; final browser state reports about 60 FPS. Six Node tests pass (including forward/reverse ramp winding/normal regressions), and the TypeScript/production build passes.
