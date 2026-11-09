import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
// Sources use extensionless Vite-style imports; let Node find the .ts files.
registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (spec.startsWith(".")) return next(spec + ".ts", ctx);
      throw e;
    }
  },
});
const M = await import("../src/plus-rider-motion.ts");
const {
  FRONT_BOLTS,
  REAR_BOLTS,
  GROUND_Y,
  PLUS_RIG,
  RiderMotion,
  solveRider,
  qRot,
  tuning,
} = M;
const near = (a, b, eps, msg) =>
  a.forEach((v, i) =>
    assert.ok(
      Math.abs(v - b[i]) <= eps,
      `${msg ?? ""} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`,
    ),
  );
const deg = (r) => (r * 180) / Math.PI;
const rest = Math.hypot(...M.sub(PLUS_RIG.left.hip, PLUS_RIG.left.ankle));

function run(mode, seconds, extra = {}, each) {
  const motion = new RiderMotion(),
    steps = Math.round(seconds * 60);
  for (let i = 0; i <= steps; i++) {
    const t = i / 60,
      input = {
        mode,
        time: t,
        ...(typeof extra === "function" ? extra(t) : extra),
      },
      pose = motion.update(input, 1 / 60),
      solved = solveRider(PLUS_RIG, pose, 1.8);
    each?.(pose, solved, t, motion);
  }
  return motion;
}

test("regular stance: idle, cruise and crouch keep BOTH soles exactly on the truck bolts", () => {
  for (const mode of ["idle", "ride", "crouch"])
    run(mode, 3, { turn: 0.5, grounded: true }, (pose, solved) => {
      near(pose.front.pos, FRONT_BOLTS, 1e-9, `${mode} left/front`);
      near(pose.rear.pos, REAR_BOLTS, 1e-9, `${mode} right/rear`);
      near(qRot(pose.front.rot, [1, 0, 0]), [1, 0, 0], 1e-9);
      near(qRot(pose.rear.rot, [1, 0, 0]), [1, 0, 0], 1e-9);
      // Toes point across the deck, so the shoe spans the width, never the length.
      assert.equal(solved.front.gap, 0);
      assert.ok(
        solved.front.stretch <= 1 + 1e-9 && solved.front.slide < 0.01,
        `${mode} legs are not stretched`,
      );
      assert.ok(solved.rear.stretch <= 1 + 1e-9 && solved.rear.slide < 0.01);
    });
  assert.deepEqual(FRONT_BOLTS, [0, 0.015, 0.265]);
  assert.deepEqual(REAR_BOLTS, [0, 0.015, -0.265]);
});

test("cruise flexes the knees slightly; crouch bends them deeply with feet still planted", () => {
  let cruise, crouch;
  run("ride", 2, {}, (p, s) => (cruise = { p, s }));
  run("crouch", 2, {}, (p, s) => (crouch = { p, s }));
  for (const side of ["front", "rear"]) {
    assert.ok(
      deg(cruise.s[side].flex) > 3 && deg(cruise.s[side].flex) < 45,
      `cruise ${side} ${deg(cruise.s[side].flex)}`,
    );
    assert.ok(
      deg(crouch.s[side].flex) > 50,
      `crouch ${side} ${deg(crouch.s[side].flex)}`,
    );
  }
  assert.ok(
    cruise.p.pelvisPos[1] - crouch.p.pelvisPos[1] > 0.035,
    "pelvis lowers in a crouch",
  );
  // The crouch is the pelvis dropping, never a scale: nothing here has a scale at all.
  near(crouch.p.front.pos, FRONT_BOLTS, 1e-9);
  near(crouch.p.rear.pos, REAR_BOLTS, 1e-9);
});

test("push: only the rear (right) foot leaves, reaches the ground, sweeps back and returns; front never moves", () => {
  let minY = 9,
    minZ = 0,
    maxStretch = 0,
    left = false,
    groundedX = [],
    gaps = 0,
    sweepStart,
    sweepEnd;
  const motion = run("push", 2.2, {}, (pose, solved, t, m) => {
    near(pose.front.pos, FRONT_BOLTS, 1e-9, "front planted during push");
    near(qRot(pose.front.rot, [1, 0, 0]), [1, 0, 0], 1e-9);
    assert.ok(solved.front.gap === 0);
    if (Math.hypot(...M.sub(pose.rear.pos, REAR_BOLTS)) > 0.01) left = true;
    minY = Math.min(minY, pose.rear.pos[1]);
    minZ = Math.min(minZ, pose.rear.pos[2]);
    maxStretch = Math.max(maxStretch, solved.rear.stretch);
    gaps = Math.max(gaps, solved.rear.gap);
    if (pose.rear.pos[1] < GROUND_Y + 0.002) {
      groundedX.push(pose.rear.pos[0]);
      sweepStart ??= pose.rear.pos[2];
      sweepEnd = pose.rear.pos[2];
    }
  });
  assert.ok(left, "rear foot left the bolts");
  assert.ok(
    Math.abs(minY - GROUND_Y) < 0.003,
    `rear sole reaches the ground ${minY}`,
  );
  assert.ok(sweepEnd < sweepStart - 0.06, "foot sweeps back on the ground");
  // Planted beside the board, outside the wheels (outer face 0.165 + half a shoe).
  assert.ok(
    Math.min(...groundedX) > 0.28,
    `clear of the wheels ${Math.min(...groundedX)}`,
  );
  assert.ok(minZ < -0.4);
  assert.equal(gaps, 0, "ankle always reached");
  assert.ok(maxStretch <= 1.8 + 1e-9, `maxStretch ${maxStretch}`);
  assert.ok(motion.stroke === -1 || motion.stroke < 1);
  // After releasing, the stroke completes and the foot returns exactly to its bolts.
  const tail = run(
    "push",
    1.0,
    (t) => ({}),
    () => {},
  );
  void tail;
  const m = new RiderMotion();
  let t = 0;
  for (; t < 0.4; t += 1 / 60) m.update({ mode: "push", time: t }, 1 / 60);
  let pose;
  for (; t < 3; t += 1 / 60) pose = m.update({ mode: "ride", time: t }, 1 / 60);
  near(pose.rear.pos, REAR_BOLTS, 1e-6, "rear returns");
  assert.equal(m.stroke, -1);
});

test("holding crouch has priority over push: the stroke is cancelled and the foot returns", () => {
  const m = new RiderMotion();
  let t = 0;
  for (; t < 0.5; t += 1 / 60) m.update({ mode: "push", time: t }, 1 / 60);
  assert.ok(m.pose.rear.pos[1] < 0.0, "mid-stroke");
  let pose;
  for (let i = 0; i < 30; i++, t += 1 / 60) {
    pose = m.update({ mode: "crouch", time: t }, 1 / 60);
    near(pose.front.pos, FRONT_BOLTS, 1e-9);
  }
  near(
    pose.rear.pos,
    REAR_BOLTS,
    0.02,
    "back on the bolts within half a second",
  );
  assert.equal(m.stroke, -1);
  for (let i = 0; i < 30; i++, t += 1 / 60)
    pose = m.update({ mode: "crouch", time: t }, 1 / 60);
  near(pose.rear.pos, REAR_BOLTS, 1e-9);
});

test("airborne flips tuck both feet clear of the rotating board, then land on the bolts", () => {
  for (const trick of [2, 3, 4, 8]) {
    let peak = 0,
      afterY = [];
    run(
      "jump",
      1.0,
      (t) => ({ grounded: false, trick, trickTime: Math.min(t, 0.6) }),
      (pose, solved, t) => {
        peak = Math.max(peak, Math.min(pose.front.pos[1], pose.rear.pos[1]));
        if (t > 0.5) afterY.push(pose.front.pos[1], pose.rear.pos[1]);
        assert.equal(solved.front.gap, 0);
        assert.equal(solved.rear.gap, 0);
        near(
          [pose.front.pos[0], pose.front.pos[2]],
          [FRONT_BOLTS[0], FRONT_BOLTS[2]],
          1e-9,
        );
        near(
          [pose.rear.pos[0], pose.rear.pos[2]],
          [REAR_BOLTS[0], REAR_BOLTS[2]],
          1e-9,
        );
      },
    );
    // The board's wheels sweep ~0.23 from its flip axis; soles clear that with margin.
    assert.ok(peak > 0.25, `trick ${trick} peak lift ${peak}`);
    assert.ok(
      afterY.every((y) => Math.abs(y - 0.015) < 1e-9),
      "back on the deck by the end of the flip window",
    );
  }
  // A plain ollie keeps the soles on the deck.
  run("jump", 1, { grounded: false, trick: 1, trickTime: 0.2 }, (pose) => {
    near(pose.front.pos, FRONT_BOLTS, 1e-9);
    near(pose.rear.pos, REAR_BOLTS, 1e-9);
  });
});

test("two-bone IK reaches its ankle, keeps segment lengths and bends the knee toward the toe", () => {
  const hip = [0, 0.4, 0],
    ankle = [0.05, 0.2, 0.15],
    s = M.solveLeg(hip, ankle, 0.34, [1, 0, 0], 1.8);
  near(s.ankle, ankle, 1e-9);
  assert.ok(Math.abs(Math.hypot(...M.sub(s.knee, hip)) - 0.17) < 1e-9);
  assert.ok(Math.abs(Math.hypot(...M.sub(s.knee, ankle)) - 0.17) < 1e-9);
  assert.ok(s.flex > 0.3 && s.stretch === 1);
  assert.ok(s.knee[0] > (hip[0] + ankle[0]) / 2, "knee forward");
  // Out of reach: straightens, lengthens, then reports the shortfall instead of detaching silently.
  const far = M.solveLeg(hip, [0, -0.5, 0], 0.25, [1, 0, 0], 1.8);
  assert.ok(far.gap > 0.4 && far.stretch === 1.8);
});

// ---- Real geometry ------------------------------------------------------------------------
const glb = new URL(
  "../../assets/characters/custom/local/plus/plus-rider.glb",
  import.meta.url,
);
const haveModel = await access(glb).then(
  () => true,
  () => false,
);
const skip = haveModel
  ? false
  : "private plus-rider.glb not exported on this machine (run export_plus_rider.py)";
let env;
async function rider() {
  if (env) return env;
  const B = await import("@babylonjs/core");
  await import("@babylonjs/loaders/glTF/index.js");
  const scene = new B.Scene(new B.NullEngine()),
    bytes = await readFile(glb),
    container = await B.LoadAssetContainerAsync(
      "data:application/octet-stream;base64," + bytes.toString("base64"),
      scene,
      { pluginExtension: ".glb" },
    );
  container.addAllToScene();
  const { PlusRider } = await import("../src/plus-rider.ts"),
    parent = new B.TransformNode("physics root", scene);
  return (env = {
    B,
    scene,
    container,
    parent,
    rider: new PlusRider(container, scene, parent),
  });
}
const worldPoints = (B, mesh) => {
  mesh.computeWorldMatrix(true);
  const wm = mesh.getWorldMatrix(),
    d = mesh.getVerticesData("position"),
    out = [];
  for (let i = 0; i < d.length; i += 3)
    out.push(
      B.Vector3.TransformCoordinates(
        new B.Vector3(d[i], d[i + 1], d[i + 2]),
        wm,
      ).asArray(),
    );
  return out;
};
const bbox = (pts) =>
  [0, 1, 2].map((a) => [
    Math.min(...pts.map((p) => p[a])),
    Math.max(...pts.map((p) => p[a])),
  ]);
const centroidOf = (pts) =>
  [0, 1, 2].map((a) => pts.reduce((s, p) => s + p[a], 0) / pts.length);
const solePoints = (pts) => {
  const y = Math.min(...pts.map((p) => p[1]));
  return { y, band: pts.filter((p) => p[1] < y + 0.004) };
};
const part = (e, name) =>
  e.container.meshes.find(
    (m) => m.name === name || m.name.startsWith(name + "."),
  );

test(
  "the rider is built from the twelve original GLB parts at true size with measured rig matching the reference",
  { skip },
  async () => {
    const e = await rider(),
      names = [
        "P_Body",
        "P_Arm_L",
        "P_Arm_R",
        "P_Hand_L",
        "P_Hand_R",
        "P_Eye_L",
        "P_Eye_R",
        "P_Mouth",
        "P_Leg_L",
        "P_Leg_R",
        "P_Shoe_L",
        "P_Shoe_R",
      ];
    e.rider.update("idle", 0);
    for (const n of names) assert.ok(part(e, n)?.getTotalVertices() > 100, n);
    assert.ok(
      part(e, "P_Body").getTotalVertices() > 30000,
      "full-detail body kept",
    );
    // Reference rig = what the geometry actually measures (hips/ankles/soles).
    for (const side of ["left", "right"])
      for (const k of ["sole", "ankle", "hip"])
        near(e.rider.rig[side][k], PLUS_RIG[side][k], 0.004, `${side}.${k}`);
    // Original size: nothing in the hierarchy is scaled (no "squash"/shrink anywhere).
    for (const mesh of e.container.meshes.filter((m) =>
      m.name.startsWith("P_"),
    )) {
      mesh.computeWorldMatrix(true);
      assert.ok(
        Math.abs(mesh.getWorldMatrix().determinant() - 1) < 1e-4,
        `${mesh.name} is unscaled`,
      );
    }
    const bd = part(e, "P_Body").getVerticesData("position"),
      body = [0, 1, 2].map((a) => {
        const v = Array.from(
          { length: bd.length / 3 },
          (_, i) => bd[i * 3 + a],
        );
        return [Math.min(...v), Math.max(...v)];
      });
    assert.ok(
      Math.abs(body[2][1] - body[2][0] - 0.91) < 0.01,
      "plus body width .91 along the board",
    );
    assert.ok(
      Math.abs(body[2][1] + body[2][0]) < 0.01,
      "and symmetric about the pelvis",
    );
    assert.ok(
      Math.abs(body[0][1] - body[0][0] - 0.44) < 0.04,
      "plus body depth .44 across the board",
    );
    assert.ok(
      Math.abs(body[1][1] - body[1][0] - 0.83) < 0.01,
      "plus body height .83",
    );
    // Shoe footprint spans across the 0.29 wide deck.
    e.rider.update("ride", 1);
    const shoe = bbox(solePoints(worldPoints(e.B, part(e, "P_Shoe_L"))).band);
    assert.ok(
      shoe[0][1] - shoe[0][0] > 0.22 && shoe[0][1] - shoe[0][0] < M.DECK_WIDTH,
      `shoe across deck ${shoe[0]}`,
    );
    assert.ok(
      shoe[2][1] - shoe[2][0] < 0.28,
      "and is narrower than that along the board",
    );
  },
);

test(
  "real shoe geometry: LEFT sole centred on the FRONT bolts, RIGHT on the REAR bolts, through cruise/crouch/idle",
  { skip },
  async () => {
    const e = await rider(),
      left = part(e, "P_Shoe_L"),
      right = part(e, "P_Shoe_R");
    for (const mode of ["idle", "ride", "crouch", "ride"])
      for (let i = 0; i < 40; i++) {
        e.rider.update(mode, 5 + i / 60, 0.3, { grounded: true });
        for (const [mesh, target] of [
          [left, FRONT_BOLTS],
          [right, REAR_BOLTS],
        ]) {
          const { y, band } = solePoints(worldPoints(e.B, mesh)),
            b = bbox(band);
          near(
            [(b[0][0] + b[0][1]) / 2, y, (b[2][0] + b[2][1]) / 2],
            target,
            0.0015,
            `${mode} ${mesh.name}`,
          );
        }
      }
    const d = e.rider.diagnostics();
    near(d.left_front.world, FRONT_BOLTS, 1e-6);
    near(d.right_rear.world, REAR_BOLTS, 1e-6);
    assert.ok(
      d.left_front.world[2] > 0 && d.right_rear.world[2] < 0,
      "left foot forward (+Z), right foot rear",
    );
  },
);

test(
  "real push: right shoe leaves and returns, left shoe vertices never change",
  { skip },
  async () => {
    const e = await rider(),
      left = part(e, "P_Shoe_L"),
      right = part(e, "P_Shoe_R");
    for (let i = 0; i < 60; i++)
      e.rider.update("ride", 20 + i / 60, 0, { grounded: true });
    const leftRef = JSON.stringify(worldPoints(e.B, left)),
      rightRef = centroidOf(worldPoints(e.B, right));
    let maxMove = 0,
      minY = 9;
    for (let i = 0; i < 150; i++) {
      e.rider.update("push", 21 + i / 60, 0, { grounded: true });
      assert.equal(
        JSON.stringify(worldPoints(e.B, left)),
        leftRef,
        "front shoe never moves",
      );
      const pts = worldPoints(e.B, right);
      maxMove = Math.max(
        maxMove,
        Math.hypot(...M.sub(centroidOf(pts), rightRef)),
      );
      minY = Math.min(minY, solePoints(pts).y);
    }
    assert.ok(maxMove > 0.3, `rear shoe travelled ${maxMove}`);
    assert.ok(
      Math.abs(minY - GROUND_Y) < 0.004,
      `rear sole touches the ground at ${minY}`,
    );
    for (let i = 0; i < 120; i++)
      e.rider.update("ride", 25 + i / 60, 0, { grounded: true });
    near(centroidOf(worldPoints(e.B, right)), rightRef, 1e-3, "returned");
  },
);

test(
  "legs stay attached hip->knee->ankle->shoe through every motion and never turn to NaN",
  { skip },
  async () => {
    const e = await rider(),
      B = e.B,
      seq = [
        ["idle", {}],
        ["ride", {}],
        ["crouch", {}],
        ["push", {}],
        ["push", {}],
        ["jump", { grounded: false, trick: 2, trickTime: 0.2 }],
        ["jump", { grounded: false, trick: 8, trickTime: 0.3 }],
        ["ride", { grounded: true }],
      ];
    let t = 40;
    for (const [mode, extra] of seq)
      for (let i = 0; i < (mode === "push" ? 100 : 40); i++, t += 1 / 60) {
        e.rider.update(mode, t, 0.2, extra);
        for (const [side, foot, limb] of [
          ["front", e.rider.frontFoot, e.rider.rig.left],
          ["rear", e.rider.rearFoot, e.rider.rig.right],
        ]) {
          const leg = e.rider.legs[side];
          assert.ok(
            leg.positions.every(Number.isFinite) &&
              leg.normals.every(Number.isFinite),
          );
          const skin = leg.skin,
            pts = [];
          for (let k = 0; k < skin.t.length; k++)
            pts.push([
              leg.positions[k * 3],
              leg.positions[k * 3 + 1],
              leg.positions[k * 3 + 2],
            ]);
          const tmin = Math.min(...skin.t),
            bottom = centroidOf(pts.filter((_, k) => skin.t[k] < tmin + 0.08)),
            ankle = B.Vector3.TransformCoordinates(
              new B.Vector3(...M.sub(limb.ankle, limb.sole)),
              (foot.computeWorldMatrix(true), foot.getWorldMatrix()),
            ).asArray(),
            s = e.rider.legs[side].solution;
          assert.ok(
            Math.hypot(...M.sub(bottom, ankle)) < 0.04,
            `${mode} ${side} leg bottom is on the ankle (${Math.hypot(...M.sub(bottom, ankle)).toFixed(3)})`,
          );
          const tmax = Math.max(...skin.t),
            top = centroidOf(pts.filter((_, k) => skin.t[k] > tmax - 0.08));
          assert.ok(
            Math.hypot(...M.sub(top, s.hip)) < 0.04,
            `${mode} ${side} leg top is on the hip`,
          );
          // Top end stays hidden inside the body's underside (pelvis-local) even when it telescopes out.
          e.rider.torso.computeWorldMatrix(true);
          const local = B.Vector3.TransformCoordinates(
            new B.Vector3(...s.hip),
            e.rider.torso.getWorldMatrix().clone().invert(),
          ).asArray();
          assert.ok(
            local[1] > -0.08 && Math.abs(local[2]) < 0.17,
            `${mode} ${side} hip end inside the body ${local}`,
          );
        }
      }
  },
);

test(
  "orientation: chest/face points to +X, left shoe forward at +Z, geometry not inside-out",
  { skip },
  async () => {
    const e = await rider();
    e.rider.update("ride", 80);
    const mouth = centroidOf(worldPoints(e.B, part(e, "P_Mouth"))),
      body = centroidOf(worldPoints(e.B, part(e, "P_Body")));
    assert.ok(
      mouth[0] - body[0] > 0.18 &&
        mouth[0] - body[0] > Math.abs(mouth[2] - body[2]),
      "face toward +X (side-on to travel)",
    );
    assert.ok(
      mouth[2] - body[2] < 0.001,
      "turned slightly toward the camera side, not toward the nose",
    );
    assert.ok(centroidOf(worldPoints(e.B, part(e, "P_Shoe_L")))[2] > 0);
    for (const name of ["P_Shoe_L", "P_Body", "P_Leg_L"]) {
      const m = part(e, name),
        p = m.getVerticesData("position"),
        n = m.getVerticesData("normal"),
        ix = m.getIndices();
      let ok = 0,
        total = 0;
      for (let i = 0; i < ix.length && total < 3000; i += 30) {
        const v = (k) => [
            p[ix[i + k] * 3],
            p[ix[i + k] * 3 + 1],
            p[ix[i + k] * 3 + 2],
          ],
          a = v(0),
          b = v(1),
          c = v(2),
          // Babylon's own boxes/spheres have (b-a)x(c-a).n < 0 for every front face.
          face = M.cross(M.sub(b, a), M.sub(c, a)),
          nn = [0, 1, 2].map((q) => n[ix[i] * 3 + q]);
        if (Math.hypot(...face) < 1e-12) continue;
        total++;
        if (M.dot(face, nn) < 0) ok++;
      }
      assert.ok(
        ok / total > 0.9,
        `${name} winding consistent with normals (${ok}/${total})`,
      );
    }
  },
);

test("ollie interrupts a rear-foot push with both soles returning to their bolt targets at takeoff", () => {
  const motion = new RiderMotion();
  for (let i = 0; i < 28; i++)
    motion.update({ mode: "push", time: i / 60, grounded: true }, 1 / 60);
  const pose = motion.update(
    { mode: "jump", time: 28 / 60, grounded: false, trick: 1, trickTime: 0 },
    1 / 60,
  );
  near(pose.front.pos, FRONT_BOLTS, 1e-9, "front planted");
  near(pose.rear.pos, REAR_BOLTS, 1e-9, "rear recovered for ollie");
});
