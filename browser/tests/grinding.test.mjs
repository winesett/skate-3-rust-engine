import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
async function setup(railX = 0, enabled = true) {
  const { instance } = await WebAssembly.instantiate(
    await readFile(
      new URL("../public/engine/skateplus_web_physics.wasm", import.meta.url),
    ),
    {},
  );
  const p = instance.exports;
  p.init();
  p.set_grind_input(+enabled);
  p.add_box(0, -0.5, 0, 50, 0.5, 50);
  p.add_rail(railX, 0.55, -4, railX, 12);
  const state = () =>
    Array.from(new Float32Array(p.memory.buffer, p.state_ptr(), 24));
  const step = (n, push = 0, turn = 0, brake = 0, jump = 0, trick = 0) => {
    for (let i = 0; i < n; i++)
      p.tick(push, turn, brake, i === 0 ? jump : 0, trick);
    return state();
  };
  step(120);
  step(120, 1);
  return { p, state, step };
}
async function capture() {
  const g = await setup();
  g.step(1, 0, 0, 0, 1);
  for (let i = 0; i < 160 && !g.state()[20]; i++) g.step(1);
  assert.equal(g.state()[20], 1, "descending ollie catches practice rail");
  return g;
}
test("WASM: ollie attaches, slides, rolls off and banks grind on landing", async () => {
  const { state, step } = await capture();
  const entry = state();
  assert.equal(entry[8], 0);
  assert.ok(entry[22] >= 100);
  step(50);
  assert.equal(state()[20], 1);
  assert.ok(state()[2] > entry[2] + 2);
  assert.ok(Math.abs(state()[0]) < 0.01);
  assert.ok(Math.abs(state()[1] - 0.625) < 0.01);
  assert.ok(state()[22] > entry[22]);
  // Counter the small drift while riding to the end.
  for (let i = 0; i < 350 && state()[20]; i++) step(1, 0, -state()[21] * 1.5);
  assert.equal(state()[20], 0);
  assert.ok(state()[22] > 100);
  assert.equal(state()[8], 0, "airborne pending points are unbanked");
  step(180);
  assert.equal(state()[5], 1);
  assert.equal(state()[9], 6);
  assert.ok(state()[8] > 300);
  assert.equal(state()[22], 0);
});
test("WASM: pop out, gravity resumes, cooldown prevents immediate recapture", async () => {
  const { state, step } = await capture();
  const y = state()[1];
  step(1, 0, 0, 0, 1);
  assert.equal(state()[20], 0);
  assert.ok(state()[18] > 4);
  step(25);
  assert.equal(state()[20], 0);
  assert.ok(state()[1] > y + 0.4);
  assert.ok(Math.abs(state()[0]) > 0.2, "pop out clears the rail sideways");
  step(180);
  assert.equal(state()[20], 0);
  assert.equal(state()[9], 6);
  assert.ok(
    state()[8] > 100,
    "pop out lands and banks without recatching the same rail",
  );
});
test("WASM: lost balance bails and discards pending points", async () => {
  const { state, step } = await capture();
  for (let i = 0; i < 180 && state()[20]; i++) step(1, 0, 1);
  assert.equal(state()[20], 0);
  assert.equal(state()[9], 7);
  assert.equal(state()[22], 0);
  assert.equal(state()[8], 0);
  step(180);
  assert.equal(state()[8], 0);
});
test("WASM: ground rolling and off-rail ollies do not magnetize to rails", async () => {
  const ground = await setup();
  let attached = false;
  for (let i = 0; i < 240; i++) {
    ground.step(1, 1);
    attached ||= !!ground.state()[20];
  }
  assert.equal(attached, false);
  const off = await setup(2);
  off.step(1, 0, 0, 0, 1);
  for (let i = 0; i < 240; i++) {
    off.step(1);
    assert.equal(off.state()[20], 0);
  }
});
test("WASM: reset clears rail constraint and pending score", async () => {
  const { p, state, step } = await capture();
  p.reset();
  step(1);
  assert.equal(state()[20], 0);
  assert.equal(state()[22], 0);
  assert.ok(Math.abs(state()[2] + 12) < 0.01);
});

test("WASM: manual grind input requires Y before rail capture", async () => {
  const off = await setup(0, false);
  off.step(1, 0, 0, 0, 1);
  for (let i = 0; i < 180; i++) {
    off.step(1);
    assert.equal(off.state()[20], 0);
  }
  const on = await setup(0, true);
  on.step(1, 0, 0, 0, 1);
  let caught = false;
  for (let i = 0; i < 180; i++) {
    on.step(1);
    caught ||= on.state()[20] === 1;
  }
  assert.ok(caught);
});
