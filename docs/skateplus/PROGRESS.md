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

This is an independently playable prototype, not full upstream Bevy/WebGPU or Skate 3 behavior parity. New arcade host drives the existing Rapier world; full recovered articulated board, authored animation graph, manuals/ragdolls and retail systems are not integrated; 50–50 rail grinding was added in the follow-up below. Retargeting is limited to semantic humanoid relative poses or model-provided clips; arbitrary bone-axis conversion and foot IK remain future work. Physical gamepad and mobile touch testing remain outstanding.

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


## Rail grinding — 2026-11-08

- Added horizontal rail registration shared by park geometry and Rust collision/capture. Added a 16 m practice rail ahead of spawn and made the existing flat bar grindable.
- Added arcade 50–50 admission for descending, aligned, moving riders; no ground/sideways magnet attachment or unfinished-flip catches. Both travel directions work. Uses upstream `grind_forces::friction` for drag; the rail constraint/admission/balance lifecycle is new browser-host code.
- Added A/D or left-stick balance, a live balance meter, pending duration/speed points, Space/X/LT pop-out, S/B braking, endpoint release, stall/balance bails, reattachment cooldown and reset cleanup. Pending points bank only after landing and are discarded on a grind bail.
- Existing rig/custom models remain visual-only; grinding selects crouch pose and balance lean, independent of character assets.
- Passed 11 Node checks including real-WASM attachment/travel/landing banking, pop-out/gravity/cooldown, balance bail, ground/off-rail rejection, and reset. Four native Rust tests pass, including reverse cross-axis rail travel, sideways rejection and incomplete-flip rejection. TypeScript/production build passes.
- Verified browser keyboard approach: push for ~1 s, ollie, catch practice rail. HUD showed 50–50, balance meter and +103 pending; avatar and board visibly ride the rail. Verified Space pop-out clears the rail sideways (A/D selects side) and a clean landing banked 211 points with “50–50 grind landed” feedback at roughly 60 FPS. Physical controller hardware remains unverified; mappings use the same existing input actions.
- Initial grinding supports 50–50 on the two marked rails; no arbitrary surface grinding, boardslides or other grind styles yet.

## Asset handoff and Xbox input — 2026-11-08

- Added independent environment catalog, browser import/persistence and E/Menu garage. GLB/glTF meshes produce actual Rapier triangle collision; COLLISION_ proxies, NO_COLLISION exclusions, collision limits, spawn/heading, transformed rail metadata and world bounds are supported. Park changes use a fresh physics instance and keep the current character; failed validation preserves the active world.
- Added original CC0 Import Sandbox glTF with a reference catalog entry and rail. Generator: browser/scripts/generate-environment.py. Added character/environment JSON templates and browser/docs/ASSET_PIPELINE.md.
- Character imports/catalog entries now support exact animation names, bone maps and visual offsets without touching gameplay physics. The file picker accepts an optional JSON alongside the model/dependencies.
- Added explicit Xbox/standard Gamepad API profile: left/right-stick deadzones, analog RT or A push, B brake, X/LT ollie/pop-out, Y/LB/RB tricks, View reset, Menu garage, and D-pad/A/B dialog navigation. Controller badge and HUD update on connect/disconnect. Unmapped pads are reported instead of guessing their layout.
- Browser QA: changed from Yard to sandbox and back; sandbox had 24 real collision triangles and a configured rail. Imported a character with JSON mapping and a park with JSON settings using file pickers; both selections restored after reload. Invalid zero scale was rejected while retaining Yard and the selected character. Restored original Yard/Yard Skater after QA.
- Browser synthetic Xbox QA: Menu opened garage, D-pad changed the environment selection, D-pad focused Load, A loaded Yard, RT pushed while 0.1 stick noise was ignored, X ollied into a 50–50, X popped out sideways, and a clean landing banked 204 points. Disconnect returned the keyboard badge. No physical controller was present.
- Added transformed/mirrored triangle-collision tests against the actual WASM, proxy/limit rejection, Xbox mapping/deadzone tests and sandbox glTF validation. Seventeen Node tests pass, four browser-host Rust tests pass, and upstream dynamics tests pass (38 passed, one manual timing test ignored). Production TypeScript/build passes.
- Added optional `set_ground_with_friction` in upstream dynamics; original `set_ground` still uses 1.0. Browser imports use 0.0, matching the prototype's wheel/board driving surface. Existing dynamics default behavior is covered by the upstream suite.
