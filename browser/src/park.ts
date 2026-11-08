import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector4,
  Mesh,
  VertexData,
  DynamicTexture,
  Texture,
} from "@babylonjs/core";
import type { Physics } from "./physics";
import { rampGeometry } from "./ramp";
import { concreteTexture } from "./surfaces";
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
  concrete.diffuseTexture = concreteTexture(scene);
  const slabMaterial = concrete.clone("Concrete slabs");
  slabMaterial.diffuseTexture = concreteTexture(scene, true);
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
      {
        width: w,
        height: h,
        depth: d,
        faceUV: [
          new Vector4(0, 0, w / 6, h / 6),
          new Vector4(0, 0, w / 6, h / 6),
          new Vector4(0, 0, d / 6, h / 6),
          new Vector4(0, 0, d / 6, h / 6),
          new Vector4(0, 0, w / 6, d / 6),
          new Vector4(0, 0, w / 6, d / 6),
        ],
      },
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
  box("Park slab", 0, -0.5, 0, 80, 1, 80, slabMaterial);
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
    const geometry = rampGeometry(w, l, h, reverse);
    const m = new Mesh(name, scene),
      v = new VertexData();
    Object.assign(v, geometry);
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
  // Register the same endpoints/top height with Rust for collision and grind capture.
  const rail = (
    name: string,
    x: number,
    top: number,
    start: number,
    end: number,
  ) => {
    box(
      name,
      x,
      top - 0.065,
      (start + end) / 2,
      0.15,
      0.13,
      end - start,
      edge,
      false,
    );
    physics.add_rail(x, top, start, x, end);
    for (const z of [start + 0.35, end - 0.35])
      box("Rail support", x, (top - 0.13) / 2, z, 0.1, top - 0.13, 0.1, edge);
  };
  rail("Practice grind rail", 0, 0.55, -4, 12);
  rail("Flat bar", 7, 0.715, -6, 0);
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
    { width: 1024, height: 512 },
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  tex.anisotropicFilteringLevel = 8;
  tex.drawText(
    "THE YARD",
    null,
    295,
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
