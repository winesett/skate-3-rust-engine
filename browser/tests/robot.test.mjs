import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import validator from "gltf-validator";
test("Bolt is the validated CC0 rigged GLB and is included in the character catalog", async () => {
  const bytes = await readFile(
    new URL(
      "../../assets/characters/custom/quaternius/robot-expressive.glb",
      import.meta.url,
    ),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "b0c623f0a23be690ae5632557af4b1dd0741fe105feff9eca8f295cffa54e934",
  );
  const result = await validator.validateBytes(new Uint8Array(bytes), {
    uri: "robot-expressive.glb",
  });
  assert.equal(
    result.issues.numErrors,
    0,
    JSON.stringify(
      result.issues.messages.filter((m) => m.severity === 0).slice(0, 5),
    ),
  );
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  assert.equal(json.animations.length, 14);
  assert.ok(json.skins.every((s) => s.joints.length === 43));
  const manifest = JSON.parse(
    await readFile(
      new URL("../../assets/characters/custom/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  const entry = manifest.characters.find((c) => c.id === "bolt");
  assert.equal(entry.file, "quaternius/robot-expressive.glb");
  for (const name of Object.values(entry.animations))
    assert.ok(json.animations.some((a) => a.name === name));
  for (const name of Object.values(entry.boneMap))
    assert.ok(json.nodes.some((n) => n.name === name));
});
