import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import validator from "gltf-validator";
test("original GLB validates and ships a real skin and five skeletal clips", async () => {
  const bytes = await readFile(
    new URL("../../assets/characters/custom/yard-skater.glb", import.meta.url),
  );
  const result = await validator.validateBytes(new Uint8Array(bytes), {
    uri: "yard-skater.glb",
  });
  assert.equal(
    result.issues.numErrors,
    0,
    JSON.stringify(result.issues.messages),
  );
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.equal(json.skins[0].joints.length, 15);
  assert.equal(json.animations.length, 5);
  assert.ok(json.meshes[0].primitives[0].attributes.WEIGHTS_0 !== undefined);
});
