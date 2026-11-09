import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
const source = new URL("../../assets/characters/custom/", import.meta.url),
  target = new URL("../public/characters/", import.meta.url);
await mkdir(target, { recursive: true });
const publicBuild = process.argv.includes("--public");
// Remove stale private artwork before preparing a distributable catalog.
await rm(new URL("local/", target), { recursive: true, force: true });
await rm(new URL("manifest.local.json", target), { force: true });
await cp(source, target, {
  recursive: true,
  filter: (path) =>
    !publicBuild ||
    (!path.includes("/local") && !path.endsWith("manifest.local.json")),
});
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", source), "utf8"),
);
if (!publicBuild) {
  try {
    const local = JSON.parse(
      await readFile(new URL("manifest.local.json", source), "utf8"),
    );
    manifest.characters.push(...local.characters);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const listed = new Set(manifest.characters.map((c) => c.file));
for (const file of await readdir(source)) {
  if (/\.(glb|gltf)$/i.test(file) && !listed.has(file))
    manifest.characters.push({
      id: file,
      name: file,
      file,
      scale: 1,
      rotation: 0,
    });
}
await writeFile(
  new URL("manifest.json", target),
  JSON.stringify(manifest, null, 2),
);
console.log(`Prepared ${manifest.characters.length} local characters`);
