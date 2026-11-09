# New character and environment handoff

Both catalogs are independent of skating physics. Keep the original GLBs and textures outside the browser as your source of truth; local imports are saved only in this browser/origin. The Yard and Yard Skater remain available as fallbacks. A small original CC0 Import Sandbox (regenerate with `python3 browser/scripts/generate-environment.py` from the repository root) is included to exercise the same glTF environment loader used by your future park.

## Character

Directory: `assets/characters/custom/`. Start with `character.example.json`. Either add that entry to `manifest.json` and run `npm run assets`, or select the character GLB/glTF plus its JSON and dependent files in Character (C).

- glTF 2.0 / GLB; Y up; metres; feet at origin; in-place animations. Skin, mesh, materials and textures should be embedded in GLB when possible.
- `scale`, `rotation` (degrees around Y), and optional `offset: [x,y,z]` apply only to visuals. The collider, movement, grind constraints and scoring stay unchanged.
- `animations` maps gameplay modes `idle`, `ride`, `push`, `crouch`, `jump` to exact embedded clip names. Grinding uses crouch plus balance lean. If absent, matching names are detected automatically.
- `boneMap` optionally maps semantic joints (`hips`, `spine`, `head`, `leftUpLeg`, `rightUpLeg`, `leftLeg`, `rightLeg`, `leftUpperArm`, `rightUpperArm`, `leftForeArm`, `rightForeArm`, `leftFoot`, `rightFoot`) to exact node names. Relative-pose fallback still assumes compatible local bone axes; arbitrary retargeting and foot IK are not provided.
- Preview clips, inspect diagnostics, adjust scale/facing, then Use this character. Compatible embedded clips are preferred for unusual skeletons.

See CHARACTERS.md for full rig and performance specifications. Import limit is 50 MB including all selected dependencies.

## Environment

Directory: `assets/environments/custom/`. Start with `environment.example.json`. Add the entry to `manifest.json` or import the JSON with your GLB/glTF in Environment (E).

```json
{
  "id": "my-park", "name": "My Park", "file": "my-park.glb",
  "scale": 1, "rotation": 0, "offset": [0,0,0],
  "spawn": [0,1,-8], "heading": 0,
  "rails": [{"a":[0,0.55,-3], "b":[0,0.55,7]}]
}
```

- Export static, indexed triangle meshes with correct outward normals. Apply transforms in your DCC where practical. Y up, metres; top surfaces must have upward normals. Materials/textures load through Babylon's glTF loader.
- By default, all static meshes participate in collision. Prefix decorative meshes `NO_COLLISION` to exclude them. If **any** `COLLISION_` mesh exists, only those meshes form the terrain collider; these proxies are hidden in rendering. This is the recommended method for detailed scenes. Other meshes remain visible.
- Keep collision below **100,000 triangles**. Missing or oversize collision is rejected before replacing the current park. Skinned collision is rejected. Avoid compressed-mesh/texture extensions requiring external decoders in this initial workflow.
- `scale`, `rotation` and `offset` transform the whole park, its collision, spawn and configured rails together. The garage exposes scale and rotation, plus explicit spawn fields.
- `spawn` is the rider collider center in **model-local units**. Place it about 1 m above the desired starting surface. `heading` is degrees around Y; zero faces +Z. A reset returns here. If omitted, an empty node named `SPAWN` is used (with 0.5 m clearance); otherwise the rider drops above the map's bounding-box center. Set spawn explicitly for parks with roofs, tall scenery or multiple floors.
- `rails` are horizontal top-contact segments in model-local units. Both travel directions support 50–50. The loader creates a metal bar and collision at each transformed segment; include supporting posts as separate environment meshes if desired. Other mesh edges do not automatically become grindable. Avoid duplicating a rail's collision mesh on the same segment.
- New environments use their own collision bounds for out-of-world recovery. Imported floor collision uses the same low-friction skating surface as the original park.
- Changing parks starts a new session score, resets the rider, and preserves your character. The incoming park loads into a fresh physics world first, so rejected imports leave the current world intact. Selected environment, bytes and settings persist locally.

To add source-controlled assets:

```sh
cd browser
npm run assets
npm run dev
# For a static release:
npm test
npm run build
```

Build copies both catalogs to `dist/`. Do not commit or publish third-party assets unless you have the rights. The example sandbox is CC0; imported assets retain their own licenses. Source physics changes require `./browser/scripts/build-physics.sh` from the repository root before building.

## Xbox controller

Connect your Xbox controller to the OS over USB or Bluetooth, open the game and press A so the browser exposes it. A controller badge and Xbox-style control legend appear when a standard-mapped pad is available. This uses the browser Gamepad API; there is no separate driver or service bundled with the game. Use localhost or HTTPS.

| Action | Xbox input |
| --- | --- |
| Push | A or analog RT |
| Steer / grind balance | Left stick (16% rescaled deadzone) |
| Brake | B |
| Ollie / grind pop-out | X or LT |
| Kickflip / heelflip / shove-it | Y / LB / RB |
| Camera orbit | Right stick X |
| Reset | View |
| Open/close environment garage | Menu |
| Navigate garage/workshop fields | D-pad up/down |
| Change selection/slider/number | D-pad left/right |
| Activate focused button | A |
| Close menu | B |

Use the Character workshop / Environment garage buttons inside the dialogs to move between them. File selection still uses the OS file picker with mouse/keyboard. Physics pauses while either dialog is open. Disconnecting clears pad input; unmapped devices are identified instead of guessing button positions. Hardware verification is separate from simulated Gamepad API tests; a physical Xbox controller has not yet been tested in this session.

## Optional city presentation metadata

Catalog environments may set `mood: "sunset"` and a `spots` list. Each spot has a unique `id`, display `name`, `spawn: [x,y,z]`, `heading` in degrees, and a short `hint`. Positions/headings use the same game coordinates as rails and the main spawn; environment scale, rotation and offset apply to all of them. See `assets/environments/custom/junction/entry.json`. Spots power the garage selector, G/D-pad Up travel, minimap and reset checkpoint. Absent spots fall back to the main spawn.

Imported meshes named `CAST_` cast directional shadows; `COLLISION_Building` proxies appear on the city minimap. All visible imported meshes receive shadows. Junction's builder compensates for Babylon's glTF handedness conversion so its source positions match catalog metadata.
