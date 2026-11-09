import { test } from "node:test";
import assert from "node:assert/strict";
import { deadzone, xboxState } from "../src/gamepad.ts";
const pad = () => ({
  id: "Xbox Wireless Controller (045e)",
  mapping: "standard",
  connected: true,
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
});
test("Xbox sticks suppress drift, rescale smoothly and triggers remain analog", () => {
  assert.equal(deadzone(0.12), 0);
  assert.equal(deadzone(-0.16), 0);
  assert.equal(deadzone(1), 1);
  assert.equal(deadzone(-1), -1);
  assert.ok(deadzone(0.5) > 0.3);
  const p = pad();
  p.axes[0] = 0.1;
  p.axes[2] = -0.6;
  p.buttons[7].value = 0.4;
  const s = xboxState(p);
  assert.equal(s.turn, 0);
  assert.ok(s.orbit < -0.5);
  assert.equal(s.push, 0.4);
  assert.equal(s.label, "Xbox controller");
});
test("Xbox face/shoulder/menu buttons map independently", () => {
  const p = pad();
  for (const [button, field, value] of [
    [0, "push", 1],
    [1, "brake", 1],
    [2, "jump", true],
    [6, "jump", true],
    [3, "trick", 1],
    [4, "trick", 2],
    [5, "trick", 3],
    [8, "reset", true],
    [9, "menu", true],
    [12, "up", true],
    [13, "down", true],
    [14, "left", true],
    [15, "right", true],
  ]) {
    p.buttons.forEach((b) => (b.pressed = false));
    p.buttons[button].pressed = true;
    assert.equal(xboxState(p)[field], value);
  }
});
test("disconnected or unmapped pad cannot generate gameplay actions", () => {
  assert.equal(xboxState(undefined).push, 0);
  const p = pad();
  p.mapping = "";
  p.buttons[0].pressed = true;
  p.axes[0] = 1;
  const s = xboxState(p);
  assert.equal(s.supported, false);
  assert.equal(s.turn, 0);
  assert.equal(s.push, 0);
});

test("Xbox Y plus RB selects varial while each button retains its trick", () => {
  const p = pad();
  p.buttons[3].pressed = true;
  assert.equal(xboxState(p).trick, 1);
  p.buttons[5].pressed = true;
  assert.equal(xboxState(p).trick, 4);
  p.buttons[3].pressed = false;
  assert.equal(xboxState(p).trick, 3);
});
