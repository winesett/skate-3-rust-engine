/**
 * Pure (Babylon-free) motion + leg IK for the real-3D PLUS rider.
 *
 * Coordinates are the board/physics-root's local space, the same space as board.ts:
 * +Z is the nose (direction of travel), +X is the side the skater's chest faces
 * (regular stance: LEFT foot forward, so chest toward +X), +Y up, deck width 0.29 along X,
 * length 0.91 along Z. All quaternions are [x, y, z, w] and rotate column vectors with the
 * standard Rodrigues convention that Babylon's Quaternion uses (positive angle about +Y
 * turns +Z toward +X, i.e. +X toward -Z).
 *
 * Feet are authored directly in that space and are never driven by the legs, so a planted
 * foot cannot drift: cruise/crouch/idle keep BOTH soles on the truck bolts; only the push
 * moves the rear (right) foot; the front foot is never touched by the push.
 */
export type V3 = [number, number, number];
export type Q = [number, number, number, number];

export const DECK_WIDTH = 0.29;
export const DECK_LENGTH = 0.91;
/** Sole-centre targets over the truck bolts (board-local). */
export const FRONT_BOLTS: V3 = [0, 0.015, 0.265];
export const REAR_BOLTS: V3 = [0, 0.015, -0.265];
/** Underside of the wheels in board-local space (axle -0.12, wheel radius 0.04). */
export const GROUND_Y = -0.16;

export const add = (a: V3, b: V3): V3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const sub = (a: V3, b: V3): V3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3, fallback: V3 = [0, 1, 0]): V3 => {
  const l = length(a);
  return l > 1e-9 ? mul(a, 1 / l) : fallback;
};
export const mix = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const clamp = (v: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const qAxis = (axis: V3, angle: number): Q => {
  const s = Math.sin(angle / 2),
    n = norm(axis);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(angle / 2)];
};
/** Apply b first, then a. */
export const qMul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export const qRot = (q: Q, v: V3): V3 => {
  const u: V3 = [q[0], q[1], q[2]],
    t = mul(cross(u, v), 2);
  return add(add(v, mul(t, q[3])), cross(u, t));
};
export const qIdentity: Q = [0, 0, 0, 1];
export const qYaw = (a: number) => qAxis([0, 1, 0], a);
export const qPitch = (a: number) => qAxis([1, 0, 0], a);
export const qRoll = (a: number) => qAxis([0, 0, 1], a);

/** Measured rest geometry, all in the loaded model's own (front=+X, left=+Z) frame. */
export type Limb = {
  /** Centre of the sole footprint (y = underside of the shoe). */
  sole: V3;
  /** Centre of the leg's lower end (inside the shoe). */
  ankle: V3;
  /** Centre of the leg's upper end (inside the body). */
  hip: V3;
};
export type Rig = { pelvis: V3; left: Limb; right: Limb };

/**
 * Measured from plus-rider.glb (see tests). Used by pure tests and as the sanity reference
 * for what the runtime measures from the real geometry. Frame: model x(left)->Z, z(front)->X.
 */
export const PLUS_RIG: Rig = {
  pelvis: [-0.001, 0.265, 0],
  left: {
    sole: [0.0642, 0, 0.1523],
    ankle: [0.0054, 0.0334, 0.1202],
    hip: [-0.001, 0.265, 0.099],
  },
  right: {
    sole: [0.0642, 0, -0.1523],
    ankle: [0.0056, 0.0334, -0.1202],
    hip: [-0.001, 0.265, -0.099],
  },
};

export type FootPose = { pos: V3; rot: Q };
export type Pose = {
  pelvisPos: V3;
  pelvisRot: Q;
  front: FootPose;
  rear: FootPose;
  /** 0 planted .. 1 mid-push for the rear foot (diagnostics). */
  push: number;
  /** Knee-bend amount 0..1 used for expression (diagnostics). */
  flex: number;
  lift: number;
};
export type LegSolution = {
  hip: V3;
  knee: V3;
  /** Resolved ankle (== requested ankle unless it was out of reach). */
  ankle: V3;
  /** Actual segment lengths (shin = ankle..knee, thigh = knee..hip). */
  shin: number;
  thigh: number;
  /** Total leg length / rest length. 1 = untouched, >1 = reaching. */
  stretch: number;
  /** Knee flexion in radians, 0 = straight. */
  flex: number;
  /** Distance the requested ankle was beyond maximum reach (0 when reached). */
  gap: number;
  /** How far the leg's top end was drawn out of the body toward the foot (telescoping). */
  slide: number;
};

/**
 * Two-bone IK with equal segments. The knee bulges toward `pole`. Beyond the rest length the
 * leg straightens and lengthens (rubber-hose mascot limb) up to `maxStretch`; beyond that the
 * ankle is pulled back along the line (reported as `gap`).
 */
export function solveLeg(
  hip: V3,
  ankle: V3,
  restLength: number,
  pole: V3,
  maxStretch = 1.8,
): LegSolution {
  const delta = sub(ankle, hip),
    dist = length(delta),
    dir = norm(delta, [0, -1, 0]),
    max = restLength * maxStretch,
    reach = Math.min(dist, max);
  const resolved = add(hip, mul(dir, reach));
  if (reach >= restLength * 0.999) {
    const stretch = Math.max(1, reach / restLength);
    return {
      hip,
      knee: mix(hip, resolved, 0.5),
      ankle: resolved,
      shin: reach / 2,
      thigh: reach / 2,
      stretch,
      flex: 0,
      gap: dist - reach,
      slide: 0,
    };
  }
  const seg = restLength / 2,
    h = Math.sqrt(Math.max(0, seg * seg - (reach / 2) * (reach / 2)));
  const side = sub(pole, mul(dir, dot(pole, dir))),
    bend = norm(side, norm(cross(dir, [0, 0, 1]), [1, 0, 0]));
  const knee = add(mix(hip, resolved, 0.5), mul(bend, h));
  const cosInterior = clamp(
    (2 * seg * seg - reach * reach) / (2 * seg * seg),
    -1,
    1,
  );
  return {
    hip,
    knee,
    ankle: resolved,
    shin: seg,
    thigh: seg,
    stretch: 1,
    flex: Math.PI - Math.acos(cosInterior),
    gap: 0,
    slide: 0,
  };
}

export type RiderInput = {
  mode: string;
  time: number;
  turn?: number;
  grounded?: boolean;
  /** Physics trick id (2 kickflip, 3 heelflip, 4 shove-it, 8 varial kickflip, 9 grab). */
  trick?: number;
  /** Seconds since the trick started (same clock as boardTrickRotation). */
  trickTime?: number;
  speed?: number;
};

export const tuning = {
  /** Torso turned from square-on toward -Z (toward a chase camera) so the face reads. */
  chestYaw: 0.2,
  cruiseHeight: 0.216,
  /** Pelvis offset toward the chest side at rest (keeps both knees similarly bent). */
  cruiseShift: 0.01,
  crouchHeight: 0.17,
  /** Pelvis height while the rear leg is reaching the ground. */
  pushHeight: 0.14,
  /**
   * The leg's top end is hidden ~0.095 inside the body (the body's underside is 0.095 below
   * the pelvis pivot). When a leg is fully straight it may emerge from the body by this
   * much before it starts to stretch, so the mascot's short legs reach further.
   */
  slide: 0.06,
  /** Rear-foot push stroke. */
  pushPeriod: 0.95,
  pushRest: 0.07,
  pushOut: 0.295,
  pushTouch: -0.33,
  pushEnd: -0.43,
  /** Foot lift for flips: clear of the rotating board (wheel radius ~0.23 from its axis). */
  flipLift: 0.27,
};

const FLIP_TRICKS = new Set([2, 3, 4, 8]);

/** Stateful animator: smooths parameters and runs the discrete push stroke. */
export class RiderMotion {
  crouch = 0;
  air = 0;
  pushWeight = 0;
  /** Push stroke progress 0..1, or -1 when no stroke is running. */
  stroke = -1;
  /** Stroke progress held while an aborted stroke blends back to the bolts. */
  frozen = -1;
  private rest = 0;
  private landing = 0;
  private wasAir = false;
  private last?: number;
  pose!: Pose;

  constructor() {
    this.pose = this.compose(0, 0, 0, 0);
  }

  update(input: RiderInput, dt?: number): Pose {
    const step =
      dt ??
      (this.last === undefined ? 0 : clamp(input.time - this.last, 0, 0.1));
    this.last = input.time;
    const airborne = input.grounded === false || input.mode === "jump",
      crouching = input.mode === "crouch";
    if (this.wasAir && !airborne) this.landing = 0.25;
    this.wasAir = airborne;
    this.landing = Math.max(0, this.landing - step);
    const ease = (v: number, target: number, tau: number) =>
      v + (target - v) * (1 - Math.exp(-step / tau));
    this.crouch = ease(
      this.crouch,
      Math.max(crouching ? 1 : 0, (this.landing / 0.25) * 0.75),
      crouching ? 0.07 : 0.11,
    );
    this.air = ease(this.air, airborne ? 1 : 0, 0.08);

    // Explicit crouch cancels a push; both feet return to the deck at takeoff.
    const canStroke = !airborne && !crouching,
      pushing = input.mode === "push" && canStroke;
    this.rest = Math.max(0, this.rest - step);
    if (!canStroke && this.stroke >= 0) {
      this.frozen = this.stroke;
      this.stroke = -1;
    }
    if (pushing && this.stroke < 0 && this.rest === 0) {
      this.stroke = 0;
      this.frozen = -1;
    }
    if (this.stroke >= 0) {
      this.stroke += step / tuning.pushPeriod;
      if (this.stroke >= 1) {
        // strokeFoot(1) is exactly the bolt pose, so there is no visible snap.
        this.stroke = -1;
        this.frozen = -1;
        this.rest = tuning.pushRest;
      }
    }
    this.pushWeight = ease(
      this.pushWeight,
      this.stroke >= 0 ? 1 : 0,
      this.stroke >= 0 ? 0.04 : 0.06,
    );
    if (this.stroke < 0 && this.pushWeight < 0.01) this.frozen = -1;
    if (airborne) {
      this.stroke = -1;
      this.frozen = -1;
      this.pushWeight = 0;
    }

    let lift = 0;
    if (airborne && FLIP_TRICKS.has(input.trick ?? 0)) {
      const t = input.trickTime ?? 0;
      lift = smooth(0, 0.1, t) * (1 - smooth(0.34, 0.5, t));
    }
    this.pose = this.compose(
      this.crouch,
      this.air,
      lift,
      Math.sin(input.time * 2.4),
      input.turn ?? 0,
    );
    return this.pose;
  }

  private compose(
    crouch: number,
    air: number,
    lift: number,
    breathe: number,
    turn = 0,
  ): Pose {
    const u = this.stroke >= 0 ? this.stroke : this.frozen,
      pw = this.pushWeight,
      cycle = u >= 0 ? strokeFoot(u) : undefined,
      rearBase: FootPose = { pos: REAR_BOLTS, rot: qIdentity },
      frontBase: FootPose = { pos: FRONT_BOLTS, rot: qIdentity };
    let rear = rearBase;
    if (cycle && pw > 0)
      rear = {
        pos: mix(rearBase.pos, cycle.pos, pw),
        rot: footRot(cycle.yaw * pw, cycle.pitch * pw),
      };
    const reach = cycle ? cycle.reach * pw : 0;
    // Airborne flips: both soles tuck up out of the board's rotation arc and return by landing.
    const liftY = lift * tuning.flipLift;
    const front = {
      pos: add(frontBase.pos, [0, liftY, 0]) as V3,
      rot: footRot(0, 0.3 * lift),
    };
    if (lift > 0)
      rear = {
        pos: add(rear.pos, [0, liftY * 1.04, 0]) as V3,
        rot: footRot(0, 0.22 * lift),
      };
    const flex = clamp(Math.max(crouch, air * 0.55) + reach * 0.5);
    let height = lerp(
      tuning.cruiseHeight,
      tuning.crouchHeight,
      clamp(crouch + air * 0.4),
    );
    height = lerp(height, tuning.pushHeight, reach);
    height += liftY * 0.75 + breathe * 0.0015 * (1 - crouch) * (1 - reach);
    const px =
        lerp(tuning.cruiseShift, 0.07, reach) + clamp(turn, -1, 1) * 0.012,
      pz = -0.09 * reach;
    const lean = 0.05 + 0.1 * crouch + 0.15 * reach + 0.18 * lift;
    const pelvisRot = qMul(
      qMul(qPitch(lean), qRoll(clamp(turn, -1, 1) * -0.08)),
      qYaw(tuning.chestYaw - 0.25 * reach),
    );
    return {
      pelvisPos: [px, height, pz],
      pelvisRot,
      front,
      rear,
      push: reach,
      flex,
      lift,
    };
  }
}

/** Yaw about +Y applied after a toe-up pitch about the foot's own lateral (Z) axis. */
function footRot(yaw: number, toeUp: number): Q {
  return qMul(qYaw(yaw), qRoll(toeUp));
}

/**
 * Rear-foot stroke, u in 0..1. The foot lifts off the bolts, swings out over the deck edge
 * and wheels, plants on the ground beside the board with the toe forward, sweeps back
 * (relative to the board) and then returns over the same clear path. Toe yaw -90 deg points
 * the shoe's toe at +Z (travel direction).
 */
export function strokeFoot(u: number): {
  pos: V3;
  yaw: number;
  pitch: number;
  reach: number;
} {
  const T = tuning,
    out = T.pushOut,
    ground = GROUND_Y + 0.0;
  const a = 0.3,
    b = 0.68;
  if (u < a) {
    const e = u / a,
      ex = smooth(0, 0.6, e),
      ey = smooth(0.4, 1, e),
      z = lerp(REAR_BOLTS[2], T.pushTouch, smooth(0, 1, e));
    return {
      pos: [
        lerp(0, out, ex),
        lerp(REAR_BOLTS[1], ground, ey) +
          0.1 * Math.sin(Math.PI * clamp(e * 1.05)) * (1 - ey),
        z,
      ],
      yaw: (-Math.PI / 2) * smooth(0, 0.8, e),
      pitch: 0.2 * Math.sin(Math.PI * e),
      reach: smooth(0, 1, e),
    };
  }
  if (u < b) {
    const e = (u - a) / (b - a);
    return {
      pos: [out, ground, lerp(T.pushTouch, T.pushEnd, e)],
      yaw: -Math.PI / 2,
      pitch: 0,
      reach: 1,
    };
  }
  const e = (u - b) / (1 - b),
    ex = 1 - smooth(0.35, 1, e),
    ey = smooth(0, 0.55, e);
  return {
    pos: [
      lerp(0, out, ex),
      lerp(ground, REAR_BOLTS[1], ey) + 0.08 * Math.sin(Math.PI * e),
      lerp(T.pushEnd, REAR_BOLTS[2], smooth(0, 1, e)),
    ],
    yaw: (-Math.PI / 2) * (1 - smooth(0.4, 1, e)),
    pitch: 0.2 * Math.sin(Math.PI * e),
    reach: 1 - smooth(0, 1, e),
  };
}

export type Solved = {
  front: LegSolution & { sole: V3 };
  rear: LegSolution & { sole: V3 };
  /** World hip/ankle targets are exposed for tests and diagnostics. */
};

/** Evaluate the legs for a pose against measured geometry. */
export function solveRider(rig: Rig, pose: Pose, maxStretch = 1.8): Solved {
  const leg = (limb: Limb, foot: FootPose) => {
    const hipWorld = add(
        pose.pelvisPos,
        qRot(pose.pelvisRot, sub(limb.hip, rig.pelvis)),
      ),
      ankleWorld = add(foot.pos, qRot(foot.rot, sub(limb.ankle, limb.sole))),
      rest = length(sub(limb.hip, limb.ankle)),
      toe = qRot(foot.rot, [1, 0, 0]),
      far = length(sub(ankleWorld, hipWorld)),
      slide = clamp(far - rest, 0, tuning.slide),
      top = add(
        hipWorld,
        mul(norm(sub(ankleWorld, hipWorld), [0, -1, 0]), slide),
      );
    return {
      ...solveLeg(top, ankleWorld, rest, toe, maxStretch),
      slide,
      sole: foot.pos,
    };
  };
  return { front: leg(rig.left, pose.front), rear: leg(rig.right, pose.rear) };
}

/** Precomputed per-vertex coordinates for deforming one leg tube. */
export type LegSkin = {
  /** Axial coordinate along the rest axis, in rest-length units (0 ankle, 1 hip). */
  t: Float32Array;
  /** Offset components in the rest frame: (u, w) cross-section and (e) residual axial. */
  uvw: Float32Array;
  nrm: Float32Array;
  restLength: number;
  frame: { e: V3; u: V3; w: V3 };
  ankle: V3;
};

function frameOf(e: V3, pole: V3) {
  const u = norm(sub(pole, mul(e, dot(pole, e))), [1, 0, 0]),
    w = cross(e, u);
  return { e, u, w };
}

export function skinLeg(
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  limb: Limb,
): LegSkin {
  const axis = sub(limb.hip, limb.ankle),
    restLength = length(axis),
    e = mul(axis, 1 / restLength),
    frame = frameOf(e, [1, 0, 0]),
    n = positions.length / 3,
    t = new Float32Array(n),
    uvw = new Float32Array(n * 3),
    nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p: V3 = [
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      ],
      q = sub(p, limb.ankle),
      s = dot(q, e),
      off = sub(q, mul(e, s));
    t[i] = s / restLength;
    uvw[i * 3] = dot(off, frame.u);
    uvw[i * 3 + 1] = dot(off, frame.w);
    uvw[i * 3 + 2] = 0;
    const nv: V3 = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
    nrm[i * 3] = dot(nv, frame.u);
    nrm[i * 3 + 1] = dot(nv, frame.w);
    nrm[i * 3 + 2] = dot(nv, frame.e);
  }
  return { t, uvw, nrm, restLength, frame, ankle: limb.ankle };
}

/** Write the deformed leg (two segments with a smooth knee blend) into rider space. */
export function deformLeg(
  skin: LegSkin,
  solution: LegSolution,
  pole: V3,
  positions: Float32Array,
  normals: Float32Array,
) {
  const { ankle, knee, hip } = solution,
    L = skin.restLength,
    half = 0.5,
    blend = 0.2,
    shinDir = norm(sub(knee, ankle)),
    thighDir = norm(sub(hip, knee)),
    fs = frameOf(shinDir, pole),
    ft = frameOf(thighDir, pole),
    scaleShin = solution.shin / (L * half),
    scaleThigh = solution.thigh / (L * half),
    radial = Math.min(1, Math.pow(1 / Math.max(solution.stretch, 1), 0.5));
  for (let i = 0; i < skin.t.length; i++) {
    const t = skin.t[i],
      a = skin.uvw[i * 3] * radial,
      b = skin.uvw[i * 3 + 1] * radial,
      w = smooth(half - blend, half + blend, t),
      s = t * L,
      shinPos = add(ankle, mul(shinDir, s * scaleShin)),
      thighPos = add(knee, mul(thighDir, (s - L * half) * scaleThigh)),
      ps = add(shinPos, add(mul(fs.u, a), mul(fs.w, b))),
      pt = add(thighPos, add(mul(ft.u, a), mul(ft.w, b)));
    positions[i * 3] = lerp(ps[0], pt[0], w);
    positions[i * 3 + 1] = lerp(ps[1], pt[1], w);
    positions[i * 3 + 2] = lerp(ps[2], pt[2], w);
    const na = skin.nrm[i * 3],
      nb = skin.nrm[i * 3 + 1],
      ne = skin.nrm[i * 3 + 2],
      ns = add(add(mul(fs.u, na), mul(fs.w, nb)), mul(fs.e, ne)),
      nt = add(add(mul(ft.u, na), mul(ft.w, nb)), mul(ft.e, ne)),
      nn = norm(mix(ns, nt, w));
    normals[i * 3] = nn[0];
    normals[i * 3 + 1] = nn[1];
    normals[i * 3 + 2] = nn[2];
  }
}
