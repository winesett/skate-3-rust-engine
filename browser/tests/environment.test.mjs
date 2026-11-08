import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NullEngine, Scene, MeshBuilder } from "@babylonjs/core";
import { collisionTriangles } from "../src/collision.ts";
test("world-space imported collision preserves mirrored transforms and supports a custom spawn in WASM", async () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const ground = MeshBuilder.CreateGround(
      "Park",
      { width: 20, height: 20 },
      scene,
    );
    ground.position.set(80, 2, 5);
    ground.scaling.set(-2, 1, 2);
    const { triangles, min, max } = collisionTriangles([ground]);
    assert.equal(triangles.length, 2);
    assert.equal(min.y, 2);
    assert.ok(min.x > 50 && max.x > 90);
    for (const t of triangles) {
      const a = t.slice(0, 3),
        b = t.slice(3, 6),
        c = t.slice(6);
      const normalY =
        (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      assert.ok(normalY > 0, "mirrored floor collision faces up");
    }
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
    p.set_bounds(50, 110, -10, -30, 40);
    p.set_spawn(80, 4, 5, 0);
    for (let i = 0; i < 240; i++) p.tick(0, 0, 0, 0, 0);
    const state = () =>
      Array.from(new Float32Array(p.memory.buffer, p.state_ptr(), 24));
    assert.equal(state()[5], 1);
    assert.ok(Math.abs(state()[1] - 2.16) < 0.02);
    for (let i = 0; i < 120; i++) p.tick(1, 0, 0, 0, 0);
    assert.ok(state()[2] > 8);
    p.reset();
    p.tick(0, 0, 0, 0, 0);
    assert.equal(state()[0], 80);
    assert.ok(Math.abs(state()[2] - 5) < 0.01);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
test("COLLISION_ proxy excludes decorative geometry and empty/oversize collision is rejected", () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const proxy = MeshBuilder.CreateGround(
        "COLLISION_floor",
        { width: 10, height: 10 },
        scene,
      ),
      visual = MeshBuilder.CreateBox("Decoration", {}, scene);
    assert.equal(collisionTriangles([proxy, visual]).triangles.length, 2);
    assert.throws(() => collisionTriangles([proxy], 1), /exceeds/);
    proxy.name = "NO_COLLISION_floor";
    assert.throws(() => collisionTriangles([proxy]), /no static/);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
