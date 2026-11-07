import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  VertexData,
  DynamicTexture,
} from "@babylonjs/core";
import type { Physics } from "./physics";
export function buildPark(scene: Scene, physics: Physics) {
  const material = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(0.05, 0.05, 0.05);
    return m;
  };
  const concrete = material("Warm concrete", "#b7b4a8"),
    edge = material("Coping", "#53675f"),
    green = material("Field green", "#63816a"),
    dark = material("Deck grip", "#253e35"),
    white = material("Paint", "#edf1d2"),
    orange = material("Clay", "#ce7c50");
  const solids: Mesh[] = [];
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat = concrete,
    collide = true,
  ) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    m.material = mat;
    m.receiveShadows = true;
    if (collide) {
      physics.add_box(x, y, z, w / 2, h / 2, d / 2);
      solids.push(m);
    }
    return m;
  };
  box("Endless field", 0, -0.65, 0, 400, 0.2, 400, green, false);
  box("Park slab", 0, -0.5, 0, 80, 1, 80);
  // Broad banks and a tabletop: the visual and collision shapes use identical vertices.
  const ramp = (
    name: string,
    x: number,
    z: number,
    w: number,
    l: number,
    h: number,
    reverse = false,
  ) => {
    const dir = reverse ? -1 : 1,
      positions = [
        -w / 2,
        0,
        (-dir * l) / 2,
        w / 2,
        0,
        (-dir * l) / 2,
        w / 2,
        h,
        (dir * l) / 2,
        -w / 2,
        h,
        (dir * l) / 2,
        -w / 2,
        -0.3,
        (-dir * l) / 2,
        w / 2,
        -0.3,
        (-dir * l) / 2,
        w / 2,
        -0.3,
        (dir * l) / 2,
        -w / 2,
        -0.3,
        (dir * l) / 2,
      ];
    const indices = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0,
      4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
    ];
    if (reverse)
      for (let i = 0; i < indices.length; i += 3)
        [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const m = new Mesh(name, scene),
      v = new VertexData();
    v.positions = positions;
    v.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    v.normals = normals;
    v.applyToMesh(m);
    m.position.set(x, 0, z);
    m.material = concrete;
    m.receiveShadows = true;
    physics.add_ramp(x, z, w, l, h, +reverse);
    solids.push(m);
  };
  ramp("North bank", 0, 25, 22, 10, 3);
  box("North deck", 0, 1.5, 33, 22, 3, 6);
  ramp("South bank", 0, -25, 22, 10, 3, true);
  box("South deck", 0, 1.5, -33, 22, 3, 6);
  ramp("Tabletop approach", -16, 0, 8, 7, 1.5);
  box("Tabletop", -16, 0.75, 5.5, 8, 1.5, 4);
  ramp("Tabletop descent", -16, 11, 8, 7, 1.5, true);
  ramp("Kicker", 12, 8, 6, 5, 1.25);
  box("Low ledge", 13, 0.35, -6, 2, 0.7, 8);
  box("Ledge cap", 13, 0.715, -6, 2.1, 0.03, 8.1, edge, false);
  box("Manual pad", -9, 0.18, -12, 5, 0.36, 6);
  box("Manual pad cap", -9, 0.37, -12, 5.1, 0.02, 6.1, edge, false);
  for (const side of [-1, 1]) {
    box("Boundary wall", side * 40, 1, 0, 0.5, 2, 80, edge);
    box("Boundary wall", 0, 1, side * 40, 80, 2, 0.5, edge);
  }
  // Flat-bar collider, intentionally no grind constraint in this milestone.
  box("Flat bar", 7, 0.65, -3, 0.13, 0.13, 6, edge);
  for (const z of [-5.5, -0.5])
    box("Rail support", 7, 0.3, z, 0.1, 0.6, 0.1, edge);
  for (let x = -36; x <= 36; x += 6)
    box("Slab seam", x, 0.006, 0, 0.018, 0.009, 78, edge, false);
  for (let z = -36; z <= 36; z += 6)
    box("Slab seam", 0, 0.006, z, 78, 0.009, 0.018, edge, false);
  for (const x of [-30, 30]) {
    box("Park stripe", x, 0.012, 0, 0.18, 0.012, 70, white, false);
    for (const z of [-25, -12, 1, 14, 27]) {
      box("Planter", x, 0.5, z, 2.4, 1, 2.4, edge);
      const t = MeshBuilder.CreateCylinder(
        "Tree",
        { height: 5, diameterTop: 0.13, diameterBottom: 0.25, tessellation: 6 },
        scene,
      );
      t.position.set(x, 3, z);
      t.material = orange;
      const crown = MeshBuilder.CreateIcoSphere(
        "Tree canopy",
        { radius: 2, subdivisions: 1 },
        scene,
      );
      crown.position.set(x, 6, z);
      crown.scaling.y = 1.3;
      crown.material = dark;
    }
  }
  const sign = MeshBuilder.CreatePlane(
    "The Yard sign",
    { width: 9, height: 3 },
    scene,
  );
  sign.position.set(-24, 4.5, 36);
  const tex = new DynamicTexture(
    "Original park sign",
    { width: 1024, height: 342 },
    scene,
    false,
  );
  tex.drawText(
    "THE YARD",
    null,
    205,
    "bold 120px Arial",
    "#edff85",
    "#203d32",
    true,
  );
  const sm = new StandardMaterial("Sign ink", scene);
  sm.diffuseTexture = tex;
  sm.emissiveColor = new Color3(0.25, 0.25, 0.25);
  sm.backFaceCulling = false;
  sign.material = sm;
  return { solids, materials: { dark, white, edge, orange } };
}
export function createBoard(scene: Scene) {
  const root = new Mesh("Board assembly", scene);
  const grip = new StandardMaterial("Griptape", scene);
  grip.diffuseColor = Color3.FromHexString("#24342e");
  const wood = new StandardMaterial("Maple", scene);
  wood.diffuseColor = Color3.FromHexString("#c4a46c");
  const wheelMat = new StandardMaterial("Urethane", scene);
  wheelMat.diffuseColor = Color3.FromHexString("#efedce");
  const deck = MeshBuilder.CreateBox(
    "Maple deck",
    { width: 0.25, height: 0.045, depth: 0.85 },
    scene,
  );
  deck.parent = root;
  deck.material = wood;
  const top = MeshBuilder.CreateBox(
    "Grip",
    { width: 0.245, height: 0.008, depth: 0.81 },
    scene,
  );
  top.position.y = 0.026;
  top.parent = root;
  top.material = grip;
  for (const z of [-0.28, 0.28])
    for (const x of [-0.16, 0.16]) {
      const wheel = MeshBuilder.CreateCylinder(
        "Wheel",
        { height: 0.07, diameter: 0.105, tessellation: 12 },
        scene,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.075, z);
      wheel.parent = root;
      wheel.material = wheelMat;
    }
  return root;
}
