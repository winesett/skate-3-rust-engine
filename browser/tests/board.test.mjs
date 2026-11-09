import { test } from "node:test";
import assert from "node:assert/strict";
import { deckGeometry, deckHeight } from "../src/board-geometry.ts";
test("grip faces upward and printed underside downward in Babylon, with closed laminate spacing", () => {
  const top = deckGeometry(),
    bottom = deckGeometry(true);
  assert.equal(top.positions.length, bottom.positions.length);
  for (let i = 0; i < top.positions.length; i += 3) {
    assert.ok(top.normals[i + 1] > 0, "grip visible from above");
    assert.ok(bottom.normals[i + 1] < 0, "graphic visible from below");
    assert.ok(
      Math.abs(top.positions[i + 1] - bottom.positions[i + 1] - 0.016) < 1e-8,
    );
  }
  assert.ok(top.normals.every(Number.isFinite));
  assert.ok(top.uvs.every((v) => v >= -1e-6 && v <= 1 + 1e-6));
  assert.ok(deckHeight(0, 0.455) > deckHeight(0, 0.265) + 0.05, "nose kick");
  assert.ok(deckHeight(0.145, 0) > deckHeight(0, 0), "concave");
});
