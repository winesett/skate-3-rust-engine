import { cp, mkdir, writeFile } from "node:fs/promises";
const root = new URL("../../", import.meta.url),
  out = new URL("../public/licenses/", import.meta.url);
await mkdir(out, { recursive: true });
await cp(new URL("LICENSE", root), new URL("GPL-3.0.txt", out));
await cp(new URL("README-UPSTREAM.md", root), new URL("UPSTREAM.md", out));
await cp(
  new URL("../node_modules/@babylonjs/core/license.md", import.meta.url),
  new URL("Babylon-Apache-2.0.txt", out),
);
await writeFile(
  new URL("../public/SOURCE.txt", import.meta.url),
  "SkatePlus GPL-3.0-only. Source: https://github.com/winesett/skate-3-rust-engine/tree/skateplus/browser-prototype\nOriginal engine: https://github.com/SK8-ENGINE/skate-3-rust-engine\nCopyright (c) 2026 dumbad and upstream contributors; SkatePlus additions (c) 2026 Winesett contributors.\nOriginal Yard Skater asset: CC0-1.0. Babylon.js: Apache-2.0. Rapier: Apache-2.0.\nRelease publishers must provide corresponding complete source for the exact distributed WASM and preserve third-party notices.\n",
);

await cp(new URL("../licenses/rust/", import.meta.url), new URL("rust/", out), {
  recursive: true,
});
await cp(
  new URL("assets/characters/custom/LICENSE.txt", root),
  new URL("Yard-Skater-CC0.txt", out),
);

await cp(
  new URL("assets/environments/custom/LICENSE.txt", root),
  new URL("Import-Sandbox-CC0.txt", out),
);

await cp(
  new URL("assets/characters/custom/quaternius/LICENSE.txt", root),
  new URL("Bolt-Robot-CC0.txt", out),
);

await cp(
  new URL("assets/environments/custom/junction/", root),
  new URL("Junction-City/", out),
  { recursive: true, filter: (source) => !source.endsWith(".glb") },
);
