# Junction City asset provenance

Building models: Kenney City Kit Commercial 2.1, created/distributed by Kenney (www.kenney.nl).
Official pack: https://kenney.nl/assets/city-kit-commercial
Creator's OpenGameArt listing: https://opengameart.org/content/city-kit-commercial
Download: https://opengameart.org/sites/default/files/kenney_city-kit-commercial_2.1.zip
Retrieved 2026-11-08. Archive SHA-256: f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b.
License: CC0 1.0 Universal, confirmed by the official pack listing and the included Kenney-LICENSE.txt.

SkatePlus assembled the buildings into an original city layout, added a plaza, roads/markings, benches, steps, banks, foliage, fountain, signs, grind metadata and simple collision proxies. The original authored layout and additions are also offered under CC0-1.0. Engine/application code remains GPL-3.0-only.

Rebuild using the existing Blender installation:
`/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python browser/scripts/build-city.py`
The script verifies the source ZIP hash, caches/extracts it into the system temporary directory, exports the self-contained GLB and updates the Junction entry in the environment manifest. `build-info.json` lists the source models used. No EA assets or paid models are used.
