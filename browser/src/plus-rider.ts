import {
  AbstractMesh,
  AssetContainer,
  Mesh,
  Quaternion,
  Scene,
  TransformNode,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";
import {
  RiderMotion,
  cross,
  deformLeg,
  dot,
  length,
  qRot,
  skinLeg,
  solveRider,
  sub,
  type Limb,
  type LegSkin,
  type LegSolution,
  type Pose,
  type Q,
  type Rig,
  type RiderInput,
  type V3,
} from "./plus-rider-motion";

/** Per-frame physics/trick data a host may pass to `pose` (all optional). */
export type RiderState = Pick<
  RiderInput,
  "grounded" | "trick" | "trickTime" | "speed"
>;

export type Leg = {
  mesh: Mesh;
  skin: LegSkin;
  positions: Float32Array;
  normals: Float32Array;
  solution?: LegSolution;
};

const centroid = (points: V3[]): V3 => {
  const c: V3 = [0, 0, 0];
  for (const p of points) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / points.length, c[1] / points.length, c[2] / points.length];
};
const quat = (q: Q) => new Quaternion(q[0], q[1], q[2], q[3]);

/**
 * Real-3D PLUS skater built from the twelve original GLB parts (see
 * assets/characters/custom/local/plus/export_plus_rider.py).
 *
 * Rigid mascot parts (body, face decals, arms, mittens, shoes) are kept untouched and
 * unscaled; only the legs are deformed (two-bone IK with a smooth knee blend), so joins
 * between hips -> legs -> shoes can never separate. The container's meshes are re-based
 * into the board/physics-root's local space (+Z nose, +X chest side, regular stance),
 * independent of the glTF loader's handedness handling and of the Character scale.
 */
export class PlusRider {
  readonly node: TransformNode;
  readonly torso: TransformNode;
  readonly frontFoot: TransformNode;
  readonly rearFoot: TransformNode;
  readonly motion = new RiderMotion();
  readonly rig: Rig;
  /** Largest leg reach, as a multiple of the model's own leg length. */
  maxStretch = 1.8;
  pose?: Pose;
  readonly legs: { front: Leg; rear: Leg };
  private eyes: AbstractMesh[] = [];
  private mouth?: AbstractMesh;
  private blinkStart = -10;
  private nextBlink = 1.5;
  private smile = 0;

  constructor(container: AssetContainer, scene: Scene, parent: TransformNode) {
    const part = (name: string) => {
      const m = container.meshes.find(
        (x) => x.name === name || x.name.startsWith(name + "."),
      );
      if (!m || !m.getTotalVertices())
        throw new Error(`PLUS rider model is missing ${name}`);
      return m as Mesh;
    };
    const names = [
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
    const meshes = new Map(names.map((n) => [n, part(n)] as const));
    for (const m of meshes.values()) m.computeWorldMatrix(true);
    const world = (m: Mesh, kind: string) => {
      const data = m.getVerticesData(kind)!,
        wm = m.getWorldMatrix(),
        out = new Float32Array(data.length),
        v = new Vector3(),
        r = new Vector3();
      for (let i = 0; i < data.length; i += 3) {
        v.copyFromFloats(data[i], data[i + 1], data[i + 2]);
        if (kind === VertexBuffer.PositionKind)
          Vector3.TransformCoordinatesToRef(v, wm, r);
        else Vector3.TransformNormalToRef(v, wm, r).normalize();
        out[i] = r.x;
        out[i + 1] = r.y;
        out[i + 2] = r.z;
      }
      return out;
    };
    // Orientation comes from the geometry, not from assumptions about the loader:
    // front = body -> mouth, left = right shoe -> left shoe, up = +Y.
    const pts = (m: Mesh): V3[] => {
      const a = world(m, VertexBuffer.PositionKind),
        out: V3[] = [];
      for (let i = 0; i < a.length; i += 3)
        out.push([a[i], a[i + 1], a[i + 2]]);
      return out;
    };
    const flat = (v: V3): V3 => [v[0], 0, v[2]];
    const unit = (v: V3): V3 => {
      const l = length(v);
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    const front = unit(
        flat(
          sub(
            centroid(pts(meshes.get("P_Mouth")!)),
            centroid(pts(meshes.get("P_Body")!)),
          ),
        ),
      ),
      left0 = unit(
        flat(
          sub(
            centroid(pts(meshes.get("P_Shoe_L")!)),
            centroid(pts(meshes.get("P_Shoe_R")!)),
          ),
        ),
      ),
      d = front[0] * left0[0] + front[2] * left0[2],
      left = unit([left0[0] - front[0] * d, 0, left0[2] - front[2] * d]);
    // Rider space: X = model front, Y = up, Z = model left. Must be a proper rotation.
    const det = front[0] * left[2] - front[2] * left[0];
    if (det < 0.99)
      throw new Error(
        "PLUS rider model has unexpected handedness/orientation.",
      );
    const toRider = (a: Float32Array) => {
      const out = new Float32Array(a.length);
      for (let i = 0; i < a.length; i += 3) {
        out[i] = a[i] * front[0] + a[i + 2] * front[2];
        out[i + 1] = a[i + 1];
        out[i + 2] = a[i] * left[0] + a[i + 2] * left[2];
      }
      return out;
    };
    const riderPoints = (m: Mesh): V3[] => {
      const a = toRider(world(m, VertexBuffer.PositionKind)),
        out: V3[] = [];
      for (let i = 0; i < a.length; i += 3)
        out.push([a[i], a[i + 1], a[i + 2]]);
      return out;
    };

    // Rest-pose measurements (rider-space axes, model's own units).
    const sole = (m: Mesh): V3 => {
      const p = riderPoints(m),
        y = Math.min(...p.map((v) => v[1])),
        s = p.filter((v) => v[1] < y + 0.004),
        xs = s.map((v) => v[0]),
        zs = s.map((v) => v[2]);
      return [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        y,
        (Math.min(...zs) + Math.max(...zs)) / 2,
      ];
    };
    const limb = (leg: Mesh, shoe: Mesh): Limb => {
      const p = riderPoints(leg),
        lo = Math.min(...p.map((v) => v[1])),
        hi = Math.max(...p.map((v) => v[1]));
      return {
        sole: sole(shoe),
        ankle: centroid(p.filter((v) => v[1] < lo + 0.02)),
        hip: centroid(p.filter((v) => v[1] > hi - 0.03)),
      };
    };
    const left_ = limb(meshes.get("P_Leg_L")!, meshes.get("P_Shoe_L")!),
      right_ = limb(meshes.get("P_Leg_R")!, meshes.get("P_Shoe_R")!);
    this.rig = {
      pelvis: [
        (left_.hip[0] + right_.hip[0]) / 2,
        (left_.hip[1] + right_.hip[1]) / 2,
        (left_.hip[2] + right_.hip[2]) / 2,
      ],
      left: left_,
      right: right_,
    };

    this.node = new TransformNode("PLUS rider", scene);
    this.node.parent = parent;
    this.torso = new TransformNode("PLUS torso (pelvis pivot)", scene);
    this.torso.parent = this.node;
    this.frontFoot = new TransformNode("PLUS left (front) foot", scene);
    this.frontFoot.parent = this.node;
    this.rearFoot = new TransformNode("PLUS right (rear) foot", scene);
    this.rearFoot.parent = this.node;
    for (const n of [this.torso, this.frontFoot, this.rearFoot])
      n.rotationQuaternion = Quaternion.Identity();

    // Re-base every mesh: vertex data in its owner's local frame, node transform identity.
    const bake = (
      m: Mesh,
      owner: TransformNode,
      origin: V3,
      updatable = false,
    ) => {
      const p = toRider(world(m, VertexBuffer.PositionKind)),
        n = toRider(world(m, VertexBuffer.NormalKind));
      for (let i = 0; i < p.length; i += 3) {
        p[i] -= origin[0];
        p[i + 1] -= origin[1];
        p[i + 2] -= origin[2];
      }
      // Babylon's front faces satisfy (b-a)x(c-a).n < 0. The loader satisfied that through a
      // mirrored root; baking that mirror in already flips it, but verify rather than assume.
      const idx = m.getIndices()!.slice();
      let outward = 0,
        sampled = 0;
      for (let i = 0; i + 2 < idx.length; i += 30) {
        const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]].map(
            (k) => [p[k * 3], p[k * 3 + 1], p[k * 3 + 2]] as V3,
          ),
          f = cross(sub(b, a), sub(c, a)),
          nn: V3 = [n[idx[i] * 3], n[idx[i] * 3 + 1], n[idx[i] * 3 + 2]];
        if (Math.hypot(...f) < 1e-14) continue;
        sampled++;
        if (dot(f, nn) > 0) outward++;
      }
      if (sampled && outward / sampled > 0.5)
        for (let i = 0; i + 2 < idx.length; i += 3) {
          const t = idx[i + 1];
          idx[i + 1] = idx[i + 2];
          idx[i + 2] = t;
        }
      m.parent = owner;
      m.position.setAll(0);
      m.rotationQuaternion = null;
      m.rotation.setAll(0);
      m.scaling.setAll(1);
      m.setVerticesData(VertexBuffer.PositionKind, p, updatable);
      m.setVerticesData(VertexBuffer.NormalKind, n, updatable);
      m.setIndices(idx);
      const manager = m.morphTargetManager;
      if (manager)
        for (let i = 0; i < manager.numTargets; i++) {
          const t = manager.getTarget(i),
            tp = t.getPositions();
          if (tp) {
            const q = toRider(tp as Float32Array);
            for (let k = 0; k < q.length; k += 3) {
              q[k] -= origin[0];
              q[k + 1] -= origin[1];
              q[k + 2] -= origin[2];
            }
            t.setPositions(q);
          }
          const tn = t.getNormals();
          if (tn) t.setNormals(toRider(tn as Float32Array));
        }
      manager?.synchronize();
      m.refreshBoundingInfo();
      return { p, n };
    };
    for (const n of [
      "P_Body",
      "P_Arm_L",
      "P_Arm_R",
      "P_Hand_L",
      "P_Hand_R",
      "P_Eye_L",
      "P_Eye_R",
      "P_Mouth",
    ])
      bake(meshes.get(n)!, this.torso, this.rig.pelvis);
    bake(meshes.get("P_Shoe_L")!, this.frontFoot, left_.sole);
    bake(meshes.get("P_Shoe_R")!, this.rearFoot, right_.sole);
    const legOf = (name: string, l: Limb): Leg => {
      const mesh = meshes.get(name)!,
        { p, n } = bake(mesh, this.node, [0, 0, 0], true);
      mesh.alwaysSelectAsActiveMesh = true;
      return {
        mesh,
        skin: skinLeg(p, n, l),
        positions: new Float32Array(p),
        normals: new Float32Array(n),
      };
    };
    this.legs = {
      front: legOf("P_Leg_L", left_),
      rear: legOf("P_Leg_R", right_),
    };
    this.eyes = [meshes.get("P_Eye_L")!, meshes.get("P_Eye_R")!];
    this.mouth = meshes.get("P_Mouth")!;
    this.apply(this.motion.update({ mode: "idle", time: 0 }, 0), 0);
  }

  /** Advance the animation and move the parts. Safe to call every frame. */
  update(mode: string, time: number, turn = 0, state: RiderState = {}): Pose {
    const pose = this.motion.update({ mode, time, turn, ...state });
    this.apply(pose, time);
    return pose;
  }

  private apply(pose: Pose, time: number) {
    this.pose = pose;
    this.torso.position.copyFromFloats(...pose.pelvisPos);
    this.torso.rotationQuaternion = quat(pose.pelvisRot);
    this.frontFoot.position.copyFromFloats(...pose.front.pos);
    this.frontFoot.rotationQuaternion = quat(pose.front.rot);
    this.rearFoot.position.copyFromFloats(...pose.rear.pos);
    this.rearFoot.rotationQuaternion = quat(pose.rear.rot);
    const solved = solveRider(this.rig, pose, this.maxStretch);
    for (const side of ["front", "rear"] as const) {
      const leg = this.legs[side],
        s = solved[side],
        foot = pose[side];
      leg.solution = s;
      deformLeg(
        leg.skin,
        s,
        qRot(foot.rot, [1, 0, 0]),
        leg.positions,
        leg.normals,
      );
      leg.mesh.updateVerticesData(VertexBuffer.PositionKind, leg.positions);
      leg.mesh.updateVerticesData(VertexBuffer.NormalKind, leg.normals);
    }
    this.expression(time, pose);
  }

  private expression(time: number, pose: Pose) {
    if (time >= this.nextBlink || time < this.blinkStart) {
      this.blinkStart = time;
      this.nextBlink = time + 2.4 + ((time * 7.31) % 1) * 2;
    }
    const closed = Math.sin(
      Math.PI * Math.min(1, Math.max(0, (time - this.blinkStart) / 0.16)),
    );
    this.smile +=
      ((pose.lift > 0 || pose.flex > 0.9 ? 0.6 : 0) - this.smile) * 0.12;
    const set = (mesh: AbstractMesh | undefined, name: string, v: number) => {
      const manager = mesh?.morphTargetManager;
      if (!manager) return;
      for (let i = 0; i < manager.numTargets; i++)
        if (manager.getTarget(i).name === name)
          manager.getTarget(i).influence = v;
    };
    for (const e of this.eyes) set(e, "blink", closed);
    set(this.mouth, "joy", this.smile);
  }

  /** Foot/leg numbers for QA. Positions are in board/physics-root local space. */
  diagnostics() {
    const pose = this.pose!,
      round = (v: V3) => v.map((x) => Math.round(x * 1000) / 1000),
      deg = (r: number) => Math.round((r * 180) / Math.PI);
    const foot = (node: TransformNode, local: V3, leg: Leg) => {
      node.computeWorldMatrix(true);
      const s = leg.solution!;
      return {
        local: round(local),
        world: node
          .getAbsolutePosition()
          .asArray()
          .map((x) => Math.round(x * 1000) / 1000),
        kneeFlexDeg: deg(s.flex),
        legStretch: Math.round(s.stretch * 100) / 100,
        unreachedBy: Math.round(s.gap * 1000) / 1000,
      };
    };
    return {
      stance: "regular (left foot forward, chest toward +X)",
      push: Math.round(this.motion.stroke * 100) / 100,
      crouch: Math.round(this.motion.crouch * 100) / 100,
      left_front: foot(this.frontFoot, pose.front.pos, this.legs.front),
      right_rear: foot(this.rearFoot, pose.rear.pos, this.legs.rear),
      pelvis: round(pose.pelvisPos),
    };
  }

  dispose() {
    this.node.dispose();
  }
}
