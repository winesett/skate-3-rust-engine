import { test } from "node:test";
import assert from "node:assert/strict";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { rampGeometry } from "../src/ramp.ts";

for (const reverse of [false, true]) {
  test(`ramp ${reverse ? "reverse" : "forward"} has outward hard-face normals, valid winding and UVs`, () => {
    const geometry = rampGeometry(8, 7, 1.5, reverse);
    const computed = [];
    VertexData.ComputeNormals(geometry.positions, geometry.indices, computed);
    assert.equal(geometry.uvs.length, (geometry.positions.length / 3) * 2);
    assert.ok(geometry.uvs.every(Number.isFinite));
    for (let i = 0; i < computed.length; i++)
      assert.ok(
        Math.abs(computed[i] - geometry.normals[i]) < 1e-6,
        "authored normals agree with Babylon face winding",
      );
    const up = geometry.normals.slice(0, 3);
    assert.ok(up[1] > 0.9, "skateable face points up");
    assert.ok(reverse ? up[2] > 0 : up[2] < 0, "slope normal faces downhill");
    for (let face = 0; face < 6; face++) {
      const start = face * 12,
        n = geometry.normals.slice(start, start + 3);
      const midpoint = [0, 1, 2].map(
        (axis) =>
          Array.from(
            { length: 4 },
            (_, i) => geometry.positions[start + i * 3 + axis],
          ).reduce((a, b) => a + b) / 4,
      );
      const centre = [0, 0.6, 0];
      assert.ok(
        n.reduce((sum, v, i) => sum + v * (midpoint[i] - centre[i]), 0) > 0,
        "all faces point outward",
      );
      for (let vertex = 1; vertex < 4; vertex++)
        assert.deepEqual(
          geometry.normals.slice(start + vertex * 3, start + vertex * 3 + 3),
          n,
          "faces remain flat-shaded at sharp edges",
        );
    }
  });
}
