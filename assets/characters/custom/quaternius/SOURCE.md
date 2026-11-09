# Bolt / RobotExpressive source

- Original model: RobotExpressive / Animated Robot, Tomás Laulhé (Quaternius).
- Provider: https://quaternius.com/packs/animatedrobot.html
- GLB conversion and facial expression morphs: Don McCurdy.
- Redistribution source: https://github.com/mrdoob/three.js/tree/739478bc5ac18509be78095ed8f2fa4403b8207e/examples/models/gltf/RobotExpressive
- Download: https://raw.githubusercontent.com/mrdoob/three.js/739478bc5ac18509be78095ed8f2fa4403b8207e/examples/models/gltf/RobotExpressive/RobotExpressive.glb
- License: CC0 1.0 Universal, confirmed in the adjacent upstream README and the author's official pack page.
- License URL: https://creativecommons.org/publicdomain/zero/1.0/
- Retrieved: 2026-11-08.
- Original SHA-256: 047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319
- Adaptation: normalized 752 skin-weight rows to repair inherited FBX conversion errors. No geometry, rig hierarchy, clips, or materials were replaced. Reproduce with `python3 browser/scripts/prepare-robot.py`.
- Adapted SHA-256: b0c623f0a23be690ae5632557af4b1dd0741fe105feff9eca8f295cffa54e934.
- “Bolt” is a SkatePlus display name; catalog scale/facing and animation selection adapt the model for skating.
- Khronos validator: zero errors. Four inherited hand-skin transform/hierarchy warnings remain; hands were visually checked in Babylon.
- Format: self-contained GLB 2.0, 463,988 bytes, two 43-joint skins, 14 animation clips and facial morph targets. Body parts also use rigid bone parenting.

The original Drive download was quota-limited. The attributed, CC0 GLB conversion from the official three.js examples is used instead. This is an asset reuse only; SkatePlus continues to render in Babylon.js and simulate physics in Rust.
