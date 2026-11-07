# Character specifications and import

Use GLB 2.0 with meshes, textures, skeleton and animations embedded. glTF 2.0 with separate dependencies is supported when selecting all files together. Models are visual only; the physics collider remains a 0.24 m sphere driven by Rust. Model scale does not change speed, mass, collisions or jump height.

## Coordinates and size

- Y up, metres; roughly 1.5–1.9 m tall, feet at local Y=0.
- Board forward is +Z; a sideways skating stance is appropriate. The included skater faces +X across the board.
- Apply object scale in your DCC before export. Use the workshop scale multiplier (0.25–3×) and facing adjustment (-180 to 180 degrees) for final corrections. No vertical offset control is provided; author feet at the origin.
- Prefer under 50,000 triangles and 2K or smaller textures. Total interactive import limit: 50 MB. Use ordinary uncompressed geometry and PNG/JPEG/WebP textures. Draco/KTX compressed extensions may require extra decoder setup; not tested.
- Rig weights should be normalized, with no more than four influences per vertex. Do not include a skateboard in the character model; the game provides one.

## Skeleton and animations

The original placeholder uses 15 bones and vertex skinning, with Idle, Ride, Push, Crouch and Jump clips. Its exact source and generated GLB are included under a CC0 dedication. Regenerate with `python3 browser/scripts/generate-character.py`.

Embedded clips containing `Idle`/`Stand`, `Ride`/`Skate`, `Push`/`Walk`, `Crouch`, and `Jump`/`Air` are chosen by gameplay state. Root motion should be in-place. Embedded clips work with their own skeleton; they do not need the placeholder's hierarchy. The workshop can preview every embedded clip.

Without a matching embedded clip, the runtime maps semantic bone names and applies **relative rotational skating poses** to the bind pose. It accepts common Mixamo prefixes and names:

| Semantic joint | Accepted names (case and punctuation ignored) |
| --- | --- |
| Pelvis | Hips, Pelvis |
| Torso | Spine, Spine1, Chest |
| Head | Head |
| Upper arms | LeftUpperArm / LeftArm / upperarm_l, and right equivalents |
| Forearms | LeftForeArm / lowerarm_l, and right equivalents |
| Thighs | LeftUpLeg / LeftThigh / thigh_l, and right equivalents |
| Shins | LeftLeg / LeftShin / calf_l, and right equivalents |
| Feet | LeftFoot / foot_l, and right equivalents |

This is basic semantic pose retargeting. It assumes compatible bone-local axes and does **not** solve arbitrary rest-pose alignment, IK, foot locking, or different bone roll conventions. Missing semantic joints are reported. A nonrigged model can be previewed and ridden as a rigid visual, but needs a skin/skeleton to animate limbs. For incompatible axes, bake in-place skating clips onto your rig in Blender and export those clips with the names above.

## Interactive import

1. Open Character (C). The game pauses; drag the preview to orbit and scroll to zoom.
2. Choose the GLB. For glTF, select the `.gltf`, `.bin`, and image files together. File-name references are resolved locally and embedded before loading.
3. Read the mesh, bone, clip and semantic-map diagnostics. Preview clips and inspect feet/facing/size.
4. Adjust scale and rotation. Click Use this character to apply and save.
5. Reload: the selected model, bytes and adjustments are restored from IndexedDB/localStorage. Storage failure keeps the old character and reports the error.

## Local catalog

Copy models and their dependencies into `assets/characters/custom/`. Run `npm run characters` from `browser/`; it copies this folder to `browser/public/characters/` and discovers top-level GLB/glTF models. For friendly names/default adjustments, add an entry to `assets/characters/custom/manifest.json`:

```json
{"id":"my-skater","name":"My Skater","file":"my-skater.glb","scale":1,"rotation":0}
```

Run the command again after changing files. This is an explicit build-time scan, not unrestricted browser access to your filesystem. Catalog files are included in static builds; browser imports are private local profile data. Only add models you have rights to distribute.
