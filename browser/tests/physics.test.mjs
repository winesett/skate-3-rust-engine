import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
async function game() {
  const bytes = await readFile(
    new URL("../public/engine/skateplus_web_physics.wasm", import.meta.url),
  );
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const p = instance.exports;
  p.init();
  p.add_box(0, -0.5, 0, 50, 0.5, 50);
  return {
    p,
    state: () =>
      Array.from(new Float32Array(p.memory.buffer, p.state_ptr(), 24)),
    step: (n, push = 0, turn = 0, brake = 0, jump = 0, trick = 0) => {
      for (let i = 0; i < n; i++)
        p.tick(push, turn, brake, i === 0 ? jump : 0, trick);
    },
  };
}
test("actual WASM: flat ground, movement, brake, turn, ollie, all tricks, reset", async () => {
  const { p, state, step } = await game();
  step(120);
  assert.equal(state()[5], 1);
  assert.equal(state()[8], 0, "initial settling awards no points");
  step(240, 1);
  assert.ok(state()[2] > -4);
  assert.ok(state()[4] > 5);
  const speed = state()[4];
  step(120, 0, 0.4, 1);
  assert.ok(state()[4] < speed);
  assert.ok(state()[3] > 0.1);
  for (let trick = 1; trick <= 4; trick++) {
    p.reset();
    step(120);
    step(1, 0, 0, 0, 1);
    step(25, 0, 0, 0, 0, trick);
    assert.equal(state()[5], 0);
    assert.equal(state()[6], trick === 4 ? 8 : trick + 1);
    assert.ok(state()[1] > 0.5);
    step(180);
    assert.equal(state()[5], 1);
    assert.equal(state()[9], trick === 4 ? 8 : trick + 1);
  }
  assert.equal(state()[8], 1180);
  p.reset();
  step(120);
  assert.ok(Math.abs(state()[2] + 12) < 0.01);
  assert.equal(state()[3], 0);
});
test("actual WASM: skate up a convex ramp and stop at a solid wall", async () => {
  const { p, state, step } = await game();
  p.add_ramp(0, 0, 12, 10, 2, 0);
  p.add_box(0, 1, 7, 6, 1, 2);
  p.add_box(0, 4, 9.5, 8, 4, 0.5);
  step(120);
  let highest = 0;
  for (let i = 0; i < 1000; i++) {
    step(1, 1);
    highest = Math.max(highest, state()[1]);
    assert.ok(state().every(Number.isFinite));
  }
  assert.ok(highest > 1.7, `ramp height reached ${highest}`);
  assert.ok(state()[2] < 9, "wall prevents passage");
});
test("actual WASM: early trick is a bail and cannot bank points", async () => {
  const { state, step } = await game();
  step(120);
  step(1, 0, 0, 0, 1);
  step(105);
  step(1, 0, 0, 0, 0, 1);
  step(90);
  assert.equal(state()[9], 5);
  assert.equal(state()[8], 0);
});

test("actual WASM: varial controller chord upgrades early flip, rejects late tricks and resets cleanly", async () => {
  const { p, state, step } = await game();
  step(120);
  step(1, 0, 0, 0, 1);
  step(5, 0, 0, 0, 0, 1);
  step(1, 0, 0, 0, 0, 4);
  assert.equal(state()[6], 8);
  step(180);
  assert.equal(state()[9], 8);
  assert.equal(state()[8], 450);
  p.reset();
  step(120);
  step(1, 0, 0, 0, 1);
  step(105);
  step(1, 0, 0, 0, 0, 4);
  step(90);
  assert.equal(state()[9], 5);
  assert.equal(state()[8], 450, "late varial awards no score");
  p.reset();
  step(120);
  step(1, 0, 0, 0, 1);
  step(1, 0, 0, 0, 0, 99);
  assert.equal(state()[6], 1, "unknown trick ignored");
  p.reset();
  step(120);
  assert.equal(state()[6], 0);
});
