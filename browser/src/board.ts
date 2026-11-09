import {
  deckGeometry,
  deckHalfWidth as profile,
  deckHeight as height,
} from "./board-geometry";
import {
  Scene,
  Mesh,
  MeshBuilder,
  VertexData,
  StandardMaterial,
  PBRMaterial,
  Color3,
  Texture,
  DynamicTexture,
  Vector3,
  TransformNode,
} from "@babylonjs/core";
/** Curved maple popsicle deck; all details are visual and independent of physics. */
export function createBoard(scene: Scene) {
  const root = new Mesh("Board assembly", scene);
  const matte = (name: string, color: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = new Color3(0.08, 0.08, 0.08);
    return m;
  };
  const grip = matte("Fine black griptape", "#192322");
  const grain = new DynamicTexture(
    "Grip grain",
    { width: 256, height: 256 },
    scene,
    true,
  );
  const ctx = grain.getContext();
  let seed = 71;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = 65 + (seed >>> 28) * 3;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  ctx.fillStyle = "#c3c68e";
  ctx.fillRect(116, 210, 24, 3);
  grain.update();
  grip.diffuseTexture = grain;
  const maple = matte("Maple ply", "#d6ac73"),
    darkPly = matte("Dark maple ply", "#71492e");
  const graphic = matte("DeanHouston deck print", "#ffffff");
  const fallback = new DynamicTexture(
    "Abstract deck print",
    { width: 256, height: 768 },
    scene,
    true,
  );
  const paint = fallback.getContext();
  paint.fillStyle = "#132d2a";
  paint.fillRect(0, 0, 256, 768);
  paint.fillStyle = "#e8ed6c";
  paint.beginPath();
  paint.moveTo(0, 80);
  paint.lineTo(256, 220);
  paint.lineTo(256, 380);
  paint.lineTo(0, 240);
  paint.fill();
  paint.fillStyle = "#20b5a5";
  paint.fillRect(0, 490, 256, 35);
  fallback.update();
  graphic.diffuseTexture = fallback;
  void fetch(`${import.meta.env.BASE_URL}board-config.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((config: { texture?: string }) => {
      if (!config.texture) return;
      const art = new Texture(
        `${import.meta.env.BASE_URL}${config.texture}`,
        scene,
        false,
        false,
        Texture.TRILINEAR_SAMPLINGMODE,
      );
      art.anisotropicFilteringLevel = 8;
      graphic.diffuseTexture = art;
      graphic.emissiveTexture = art;
      graphic.emissiveColor = new Color3(0.22, 0.22, 0.22);
    })
    .catch(() => {});
  const metal = new PBRMaterial("Brushed aluminum trucks", scene);
  metal.albedoColor = new Color3(0.65, 0.7, 0.71);
  metal.metallic = 0.88;
  metal.roughness = 0.28;
  const black = matte("Hardware black", "#171d20"),
    urethane = matte("Warm white urethane", "#f1ead5"),
    teal = matte("Wheel core teal", "#178d85"),
    bushing = matte("Yellow bushings", "#edbc36");
  const sections = 40,
    columns = 12;
  function surface(name: string, bottom = false, inset = 0) {
    const data = new VertexData();
    Object.assign(data, deckGeometry(bottom, inset));
    const mesh = new Mesh(name, scene);
    data.applyToMesh(mesh);
    mesh.parent = root;
    mesh.material = bottom ? graphic : grip;
    return mesh;
  }
  surface("Concave griptape", false, 0.003);
  surface("Printed underside", true);
  // Seven visible veneer layers follow the rounded outline and tail kicks.
  for (let layer = 0; layer < 7; layer++) {
    const paths: Vector3[][] = [];
    for (const depth of [(layer / 7) * 0.016, ((layer + 1) / 7) * 0.016]) {
      const path: Vector3[] = [];
      for (let i = 0; i <= sections; i++) {
        const z = -0.455 + (i / sections) * 0.91,
          x = profile(z);
        path.push(new Vector3(x, height(x, z) - depth, z));
      }
      for (let i = sections; i >= 0; i--) {
        const z = -0.455 + (i / sections) * 0.91,
          x = -profile(z);
        path.push(new Vector3(x, height(x, z) - depth, z));
      }
      paths.push(path);
    }
    const edge = MeshBuilder.CreateRibbon(
      "Maple veneer " + layer,
      { pathArray: paths, closePath: true, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    edge.parent = root;
    edge.material = layer % 2 ? darkPly : maple;
  }
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: StandardMaterial | PBRMaterial,
  ) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    m.parent = root;
    m.material = material;
    return m;
  };
  const cylinder = (
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    length: number,
    material: StandardMaterial | PBRMaterial,
    axisX = false,
  ) => {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter: r * 2, height: length, tessellation: 20 },
      scene,
    );
    m.position.set(x, y, z);
    if (axisX) m.rotation.z = Math.PI / 2;
    m.parent = root;
    m.material = material;
    return m;
  };
  const rollingWheels: Mesh[] = [];
  for (const z of [-0.265, 0.265]) {
    box("Truck baseplate", 0, -0.022, z, 0.086, 0.012, 0.072, metal);
    const pin = cylinder("Kingpin", 0, -0.062, z, 0.009, 0.075, metal);
    pin.rotation.x = z > 0 ? -0.22 : 0.22;
    cylinder("Suspension bushing", 0, -0.052, z, 0.019, 0.016, bushing);
    const hanger = cylinder(
      "Sculpted truck hanger",
      0,
      -0.108,
      z,
      0.017,
      0.26,
      metal,
      true,
    );
    box("Hanger shoulder", 0, -0.087, z, 0.07, 0.026, 0.028, metal);
    for (const x of [-0.036, 0.036])
      for (const dz of [-0.026, 0.026]) {
        const bolt = cylinder(
          "Recessed deck bolt",
          x,
          height(x, z + dz) + 0.001,
          z + dz,
          0.004,
          0.0025,
          black,
        );
      }
    for (const x of [-0.144, 0.144]) {
      const axle = new TransformNode("Rolling wheel axle", scene);
      axle.parent = root;
      axle.position.set(x, -0.12, z);
      axle.rotation.z = Math.PI / 2;
      const shape = [
        new Vector3(0, -0.02, 0),
        new Vector3(0.025, -0.02, 0),
        new Vector3(0.037, -0.016, 0),
        new Vector3(0.04, -0.009, 0),
        new Vector3(0.04, 0.009, 0),
        new Vector3(0.037, 0.016, 0),
        new Vector3(0.025, 0.02, 0),
        new Vector3(0, 0.02, 0),
      ];
      const wheel = MeshBuilder.CreateLathe(
        "Rounded wheel",
        { shape, tessellation: 24, cap: Mesh.CAP_ALL },
        scene,
      );
      wheel.parent = axle;
      wheel.material = urethane;
      rollingWheels.push(wheel);
      const hub = MeshBuilder.CreateCylinder(
        "Teal wheel core",
        { diameter: 0.038, height: 0.042, tessellation: 20 },
        scene,
      );
      hub.parent = wheel;
      hub.material = teal;
      const nut = MeshBuilder.CreateCylinder(
        "Axle nut",
        { diameter: 0.014, height: 0.047, tessellation: 6 },
        scene,
      );
      nut.parent = wheel;
      nut.material = metal;
    }
  }
  root.metadata = { rollingWheels };
  return root;
}
