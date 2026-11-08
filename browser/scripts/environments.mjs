import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
const source = new URL("../../assets/environments/custom/", import.meta.url),
  target = new URL("../public/environments/", import.meta.url);
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", source), "utf8"),
);
const listed = new Set(manifest.environments.map((c) => c.file));
for (const file of await readdir(source)) {
  if (/\.(glb|gltf)$/i.test(file) && !listed.has(file))
    manifest.environments.push({
      id: file,
      name: file,
      file,
      scale: 1,
      rotation: 0,
      spawn: [0, 2, 0],
      heading: 0,
    });
}
await writeFile(
  new URL("manifest.json", target),
  JSON.stringify(manifest, null, 2),
);
console.log(`Prepared ${manifest.environments.length} environments`);
