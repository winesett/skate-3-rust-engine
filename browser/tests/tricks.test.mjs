import { test } from "node:test";
import assert from "node:assert/strict";
import { boardTrickRotation } from "../src/tricks.ts";
import { SessionGoals } from "../src/session.ts";
test("kickflip and varial animate complete rotations within the physics landing window", () => {
  assert.deepEqual(boardTrickRotation(2, 0.25), { flip: Math.PI, shove: 0 });
  assert.deepEqual(boardTrickRotation(8, 0.25), {
    flip: Math.PI,
    shove: Math.PI / 2,
  });
  assert.deepEqual(boardTrickRotation(8, 0.5), {
    flip: Math.PI * 2,
    shove: Math.PI,
  });
  assert.deepEqual(boardTrickRotation(8, 10), boardTrickRotation(8, 0.5));
  assert.deepEqual(boardTrickRotation(0, 1), { flip: 0, shove: 0 });
});
test("a landed varial completes the flip goal; shove-it alone does not", () => {
  const g = new SessionGoals(),
    s = Array(24).fill(0);
  g.update(s);
  s[6] = 4;
  g.update(s);
  s[6] = 0;
  s[9] = 4;
  s[8] = 180;
  s[10]++;
  assert.equal(g.update(s)[0], false);
  s[6] = 8;
  g.update(s);
  s[6] = 0;
  s[9] = 8;
  s[8] = 630;
  s[10]++;
  assert.equal(g.update(s)[0], true);
});
