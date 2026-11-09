import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import validator from "gltf-validator";
import { Matrix, Vector3, Quaternion } from "@babylonjs/core";
import { SessionGoals } from "../src/session.ts";
import { mapPoint } from "../src/map.ts";
const cityRoot = new URL(
  "../../assets/environments/custom/junction/",
  import.meta.url,
);
async function city() {
  const bytes = await readFile(new URL("junction-city.glb", cityRoot));
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  const start = 20 + bytes.readUInt32LE(12) + 8;
  const bin = bytes.subarray(start);
  const accessor = (id) => {
    const a = json.accessors[id],
      v = json.bufferViews[a.bufferView],
      count = { SCALAR: 1, VEC3: 3 }[a.type],
      size = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    return Array.from({ length: a.count * count }, (_, i) => {
      const o =
        (v.byteOffset ?? 0) +
        (a.byteOffset ?? 0) +
        Math.floor(i / count) * (v.byteStride ?? count * size) +
        (i % count) * size;
      return a.componentType === 5126
        ? bin.readFloatLE(o)
        : a.componentType === 5123
          ? bin.readUInt16LE(o)
          : bin.readUInt32LE(o);
    });
  };
  const triangles = [];
  function visit(id, parent = Matrix.Identity()) {
    const n = json.nodes[id],
      local = n.matrix
        ? Matrix.FromArray(n.matrix)
        : Matrix.Compose(
            Vector3.FromArray(n.scale ?? [1, 1, 1]),
            Quaternion.FromArray(n.rotation ?? [0, 0, 0, 1]),
            Vector3.FromArray(n.translation ?? [0, 0, 0]),
          );
    const world = local.multiply(parent);
    if (n.name?.startsWith("COLLISION_"))
      for (const p of json.meshes[n.mesh].primitives) {
        const pos = accessor(p.attributes.POSITION),
          idx = accessor(p.indices);
        for (let i = 0; i < idx.length; i += 3) {
          const points = idx
            .slice(i, i + 3)
            .map((j) =>
              Vector3.TransformCoordinates(
                Vector3.FromArray(pos, j * 3),
                world,
              ),
            );
          triangles.push(
            [points[0], points[2], points[1]].flatMap((v) => [-v.x, v.y, v.z]),
          );
        }
      }
    for (const child of n.children ?? []) visit(child, world);
  }
  for (const id of json.scenes[json.scene ?? 0].nodes) visit(id);
  return {
    bytes,
    json,
    triangles,
    entry: JSON.parse(await readFile(new URL("entry.json", cityRoot), "utf8")),
  };
}
test("Junction City is a self-contained validated GLB with bounded collision and three spots", async () => {
  const { bytes, json, triangles, entry } = await city();
  const result = await validator.validateBytes(new Uint8Array(bytes));
  assert.equal(
    result.issues.numErrors,
    0,
    JSON.stringify(result.issues.messages.slice(0, 5)),
  );
  assert.ok(bytes.length < 6_000_000);
  assert.ok(triangles.length > 100 && triangles.length < 2000);
  assert.equal(entry.spots.length, 3);
  assert.equal(entry.rails.length, 4);
  assert.ok(json.nodes.filter((n) => n.name?.startsWith("CAST_")).length < 20);
  assert.ok(
    json.images.every((i) => i.bufferView !== undefined),
    "textures embedded",
  );
});
test("WASM rides the shipped city collision: all spawns settle, bank climbs, plaza rail catches", async () => {
  const { triangles, entry } = await city();
  const { instance } = await WebAssembly.instantiate(
    await readFile(
      new URL("../public/engine/skateplus_web_physics.wasm", import.meta.url),
    ),
    {},
  );
  const p = instance.exports;
  p.init();
  for (const t of triangles) p.mesh_triangle(...t);
  assert.equal(p.commit_mesh(), 1);
  p.set_bounds(-96, 96, -12, -96, 96);
  for (const r of entry.rails) p.add_rail(...r.a, r.b[0], r.b[2]);
  const state = () =>
    Array.from(new Float32Array(p.memory.buffer, p.state_ptr(), 24));
  const step = (n, push = 0, jump = 0) => {
    for (let i = 0; i < n; i++) p.tick(push, 0, 0, i === 0 ? jump : 0, 0);
    return state();
  };
  for (const s of entry.spots) {
    p.set_spawn(...s.spawn, 0);
    step(240);
    assert.equal(state()[5], 1, s.name);
    assert.ok(Math.abs(state()[1] - 0.16) < 0.03, s.name + " floor");
  }
  p.set_spawn(-34, 1, 0, 0);
  step(120);
  let highest = 0;
  for (let i = 0; i < 360; i++) {
    step(1, 1);
    highest = Math.max(highest, state()[1]);
  }
  assert.ok(
    highest > 1.4,
    "actual bank lifts rider " + JSON.stringify({ highest, state: state() }),
  );
  p.set_spawn(0, 1, -24, 0);
  step(120);
  step(120, 1);
  step(1, 0, 1);
  let caught = false;
  for (let i = 0; i < 180; i++) {
    step(1);
    caught ||= state()[20] === 1;
  }
  assert.ok(caught, "center rail catches a descending ollie");
});
test("session goals only bank flips and grinds on scored landings, rejecting reset/bail", () => {
  const g = new SessionGoals(),
    s = Array(24).fill(0);
  g.update(s);
  s[6] = 2;
  g.update(s);
  s[6] = 0;
  s[9] = 5;
  s[10]++;
  g.update(s);
  s[9] = 6;
  s[8] = 200;
  s[10]++;
  assert.deepEqual(g.update(s), [false, true, false]);
  s[6] = 2;
  g.update(s);
  s[6] = 0;
  s[9] = 0;
  s[10]++;
  g.update(s);
  s[9] = 6;
  s[8] = 400;
  s[10]++;
  assert.equal(g.update(s)[0], false, "reset clears pending flip");
  s[6] = 3;
  g.update(s);
  s[6] = 0;
  s[9] = 3;
  s[8] = 550;
  s[10]++;
  s[4] = 7;
  assert.deepEqual(g.update(s), [true, true, true]);
});
test("minimap keeps north up and world center centered", () => {
  const b = [-80, 80, -80, 80];
  assert.deepEqual(mapPoint(0, 0, b), [80, 80]);
  assert.deepEqual(mapPoint(-80, 80, b), [10, 10]);
  assert.deepEqual(mapPoint(80, -80, b), [150, 150]);
});
