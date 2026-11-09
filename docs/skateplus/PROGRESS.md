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

## Bolt cartoon character — 2026-11-08

- Added Bolt, the yellow RobotExpressive cartoon robot by Tomás Laulhé (Quaternius), with glTF/facial-expression conversion by Don McCurdy. CC0 confirmed from the author's official pack page and the model README in the official three.js examples. Only the model asset is reused; rendering/physics remain Babylon/Rust.
- Original Drive copy was quota-limited; fetched the attributed GLB from pinned three.js commit 739478bc5ac18509be78095ed8f2fa4403b8207e. Original/adapted SHA-256 and credits are in assets/characters/custom/quaternius/SOURCE.md.
- Repaired 752 non-normalized skin-weight rows inherited from the FBX conversion with a reproducible prepare-robot.py script. Adapted asset validates with zero errors; four inherited hand skin hierarchy/transform warnings remain. Visual check passed in Babylon.
- Catalog scale 0.34 and facing 90 degrees fit the robot to the skateboard. Retained two 43-joint skins, rigid bone-parented parts, 14 embedded clips and facial morphs. Ride/air/crouch currently use Idle and pushing uses Walking; no bespoke motion-captured skating clips are claimed. Dance/Wave and other original clips remain available in workshop preview.
- Selected Bolt through Character workshop, verified rendered body/feet/hands on the board, then pushed, ollied, flipped and grinded/landed with scoring in the browser. Reload restored Bolt as selected. Original Yard Skater remains selectable.
- Eighteen Node tests and the production build pass; added asset hash, glTF validation and catalog clip/bone-reference checks. Asset source/license notices are included in the static build.

## Junction City and session polish — 2026-11-08

- Sourced Kenney City Kit Commercial 2.1 from the creator's OpenGameArt listing; verified included CC0 license and pinned archive SHA-256. Added 26 building instances around an original three-spot skate layout with four configured rails, benches, manual pad, kicker, six steps and connected banks. No EA assets used.
- Included self-contained ~4.4 MB GLB, provenance, source model list, CC0 notices and reproducible Blender builder. Static visuals merge into 16 material groups; 960 proxy triangles supply actual Rapier collision. City metadata defines spots independent of character physics. Corrected Blender/glTF handedness so city geometry agrees with catalog spawns/rails.
- Added Junction Plaza, Bank Alley and Civic Steps travel with G, D-pad Up, minimap button or garage selector. R/View resets to the chosen spot; travel preserves score. North-up minimap shows buildings, numbered spots and skater heading.
- Added warm city lighting, gradient sky, nearby static soft shadows, speed-sensitive camera lookahead/FOV, per-park best-score persistence and three session goals. Flip/grind goals consume scored physics landing events and reject resets/bails.
- All 22 Node checks pass, including glTF validation, actual shipped GLB collision driving all three spawns, climbing the alley bank and catching the plaza rail in actual WASM; goal reset/bail and minimap orientation checks. Strict TypeScript and production Vite build pass. Existing large JavaScript bundle warning remains.
- Browser QA: Bolt renders in the city at about 60 FPS on this Mac; pushed, ollied and caught the plaza rail; popped out and banked 203 points; landed a 250-point kickflip and completed all goals. G cycled all spots; garage selector traveled to Civic Steps; synthetic Xbox D-pad Up traveled to Bank Alley and updated the HUD. Physical controller hardware is still unverified.
- Scope: closed city skate spot; no interiors, traffic/NPC simulation, arbitrary-surface grinding or additional grind styles. New installs default to city; existing park selections are retained.

## Kickflip and varial kickflip — 2026-11-08

- Retained kickflip on J / Xbox Y; added V / Xbox Y+RB varial kickflip with full board roll plus 180-degree shove, 450-point clean landing, named HUD feedback and session flip-goal support. A 180 ms chord window handles controller buttons arriving a few frames apart.
- Synchronized flip completion/capture checks with the half-second board animation; corrected pop shove-it board yaw to 180 degrees. Invalid trick IDs are ignored; late varials bail without points. Shove-it alone no longer completes the flip goal.
- Rebuilt shipped WASM. Passed 26 Node tests, four native host Rust tests and strict TypeScript/production build. Added varial landing/bail/reset/chord, Xbox mapping and combined rotation checks.
- Browser QA: keyboard varial landed for 450 points, kickflip added 250, and synthetic Xbox X then Y+RB (40 ms apart) selected/landed varial for another 450. Paused midair and visually verified the board both flipped and turned under Bolt with “Varial kickflip” feedback. Physical Xbox hardware remains unverified.

## Private PLUS demo character — 2026-11-09

- Adapted the user-referenced Portal project's existing PLUS GLB and neutral hand/arm pose metadata locally, preserving original mascot geometry/materials. Added five lightweight rigid-part clips (Idle/Ride/Push/Crouch/Jump); no humanoid skin/retargeting is claimed. Adapter and artwork remain under ignored assets/characters/custom/local/plus, with an ignored local catalog entry.
- Added generic local character catalog support. Development merges manifest.local.json; production preparation removes private local files and omits their catalog entries. Confirmed public dist has neither the PLUS entry nor local artwork; no proprietary assets are pushed to the public fork.
- Local adapted GLB validates with zero errors; all 26 existing Node checks and production TypeScript/build pass. Browser shows PLUS with face and stance, five clips loaded; pushed and landed a varial for 450 points at about 60 FPS. Selected PLUS for the local demo.

## Restore PLUS cycles and controller connection UI — 2026-11-09

- Replaced the selected rough rigid-part PLUS adaptation with original rendered cycle playback in the 3D park. Retained all 60 source sheets locally, with 24 Hz atlas sampling, foot baseline alignment, original walk/hop playback and rotating idle breathe/blink/look/mitten clips. Workshop can preview every original clip. This is explicitly an animated billboard, not a full skeletal 3D conversion; the earlier 3D experiment remains selectable.
- Added generic sprite-character catalog support, bounded four-texture cache, disposal and read-only animation diagnostics. Proprietary sheets and local catalog remain ignored and absent from public dist.
- Added Connect Xbox button, pairing guidance, live status and controller A/B/Menu dismissal. Dialog pauses physics and restores game focus. Existing Xbox mappings remain intact.
- Browser QA verified correctly oriented original character on board, advancing source frames (look frame 59 to mitten frame 3), original fast-walk frame 11 while pushing, and a 450-point varial landing at ~60 FPS. Synthetic Xbox detection and A-to-dismiss pass. Physical controller pairing remains user/hardware dependent.
- All 26 Node checks and strict TypeScript/production build pass; verified public output excludes private artwork and restored local catalogs afterward.

## THPS-style Xbox controls — 2026-11-09

- Mapped Xbox A to crouch/push while held and ollie on release; RT also pushes. Left stick steers/balances, down or LT brakes, X flips, B triggers a basic tuck/grab (200 points), Y enables rail capture, View resets and Menu opens garage. Stick left/down/right with X selects heel/shove/varial; RS orbits. Keyboard retains its controls, with I added for grab.
- Added explicit WASM grind-input gating, retaining automatic keyboard rail capture. Menu-confirm A is suppressed until released to prevent accidental ollies. Disconnect cannot generate a release jump. Updated HUD, connection dialog and README.
- Official Activision THPS 1+2 controls informed the face-button layout. Prototype still lacks manuals/reverts/wallplants/shoulder spins and the full THPS trick catalog; grab uses a basic tuck/board-tilt pose rather than hand-to-board IK.
- Passed 27 Node checks (including manual grind gating, directional flip inputs and grab scoring), four native host tests, and strict TypeScript/production build. Browser synthetic Xbox QA: A held remained grounded and reached 7.38 m/s, release ollied, X landed for 250, B added 200, Y caught the plaza rail, A-release pop-out landed and banked ~230 grind points. Physical controller hardware remains unverified.
