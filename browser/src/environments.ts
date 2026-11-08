import {
  Scene,
  TransformNode,
  LoadAssetContainerAsync,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";
import { assetSource, type Entry } from "./characters";
import { buildPark } from "./park";
import { collisionTriangles } from "./collision";
import type { Physics } from "./physics";
export type EnvironmentEntry = Entry & {
  builtin?: "yard";
  spawn?: [number, number, number];
  heading?: number;
  rails?: { a: [number, number, number]; b: [number, number, number] }[];
};
export type World = {
  name: string;
  solids: AbstractMesh[];
  diagnostics: string;
  dispose(): void;
};
const base = import.meta.env.BASE_URL;
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("skateplus-environments", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("models", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveEnvironment(entry: EnvironmentEntry) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("models", "readwrite");
    tx.objectStore("models").put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function environmentCatalog(): Promise<EnvironmentEntry[]> {
  const r = await fetch(`${base}environments/manifest.json`);
  if (!r.ok)
    throw new Error("Environment catalog missing; run npm run assets.");
  const list = (await r.json()).environments as EnvironmentEntry[];
  const merged = new Map(list.map((e) => [e.id, e]));
  try {
    const db = await database();
    const saved = await new Promise<EnvironmentEntry[]>((resolve, reject) => {
      const tx = db.transaction("models");
      const r = tx.objectStore("models").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      tx.oncomplete = () => db.close();
    });
    saved.forEach((e) => merged.set(e.id, e));
  } catch (e) {
    console.warn("Environment storage unavailable", e);
  }
  return [...merged.values()];
}
export async function buildEnvironment(
  scene: Scene,
  p: Physics,
  entry: EnvironmentEntry,
): Promise<World> {
  if (entry.builtin === "yard") {
    const beforeMeshes = new Set(scene.meshes),
      beforeMaterials = new Set(scene.materials),
      beforeTextures = new Set(scene.textures);
    const park = buildPark(scene, p);
    const meshes = scene.meshes.filter((m) => !beforeMeshes.has(m)),
      materials = scene.materials.filter((m) => !beforeMaterials.has(m)),
      textures = scene.textures.filter((t) => !beforeTextures.has(t));
    return {
      name: entry.name,
      solids: park.solids,
      diagnostics: "Original procedural park · two grindable rails",
      dispose() {
        meshes.forEach((m) => m.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
      },
    };
  }
  if (
    !Number.isFinite(entry.scale) ||
    entry.scale <= 0 ||
    entry.scale > 1000 ||
    !Number.isFinite(entry.rotation)
  )
    throw new Error("Invalid environment scale or facing.");
  const source = await assetSource(entry, "environments");
  const container = await LoadAssetContainerAsync(source.file, scene, {
    rootUrl: source.root,
    pluginExtension: source.extension,
  });
  const root = new TransformNode("Environment transform", scene);
  const railVisuals: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
  const railMaterial = new StandardMaterial("Imported park rail metal", scene);
  railMaterial.diffuseColor = Color3.FromHexString("#667d74");
  try {
    for (const node of container.rootNodes) node.parent = root;
    root.scaling.setAll(entry.scale);
    root.rotation.y = (entry.rotation * Math.PI) / 180;
    root.position.copyFromFloats(...(entry.offset ?? [0, 0, 0]));
    root.computeWorldMatrix(true);
    const { triangles, min, max } = collisionTriangles(container.meshes);
    for (const triangle of triangles) p.mesh_triangle(...triangle);
    if (!p.commit_mesh())
      throw new Error("Rapier could not build the environment collision mesh.");
    const transform = root.getWorldMatrix();
    for (const rail of entry.rails ?? []) {
      const a = Vector3.TransformCoordinates(
          Vector3.FromArray(rail.a),
          transform,
        ),
        b = Vector3.TransformCoordinates(Vector3.FromArray(rail.b), transform);
      if (Math.abs(a.y - b.y) > 0.001)
        throw new Error("Grind rails must be horizontal.");
      p.add_rail(a.x, a.y, a.z, b.x, b.z);
      const bar = MeshBuilder.CreateBox(
        "Configured grind rail",
        { width: 0.15, height: 0.13, depth: Vector3.Distance(a, b) },
        scene,
      );
      bar.position.copyFrom(a.add(b).scale(0.5));
      bar.position.y -= 0.065;
      bar.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      bar.material = railMaterial;
      bar.receiveShadows = true;
      railVisuals.push(bar);
    }
    let spawn: Vector3;
    const marker = container.transformNodes.find(
      (n) => n.name.toUpperCase() === "SPAWN",
    );
    if (entry.spawn)
      spawn = Vector3.TransformCoordinates(
        Vector3.FromArray(entry.spawn),
        transform,
      );
    else if (marker) {
      marker.computeWorldMatrix(true);
      spawn = marker.getAbsolutePosition().add(new Vector3(0, 0.5, 0));
    } else
      spawn = new Vector3((min.x + max.x) / 2, max.y + 2, (min.z + max.z) / 2);
    if (![spawn.x, spawn.y, spawn.z, entry.heading ?? 0].every(Number.isFinite))
      throw new Error("Spawn coordinates must be finite numbers.");
    p.set_bounds(min.x - 20, max.x + 20, min.y - 12, min.z - 20, max.z + 20);
    p.set_spawn(
      spawn.x,
      spawn.y,
      spawn.z,
      (((entry.heading ?? 0) + entry.rotation) * Math.PI) / 180,
    );
    container.addAllToScene();
    container.animationGroups.forEach((a) => a.stop());
    for (const m of container.meshes) {
      if (m.name.toUpperCase().startsWith("COLLISION_")) m.isVisible = false;
      else m.receiveShadows = true;
    }
    const solids = container.meshes.filter((m) => m.getTotalVertices() > 0);
    return {
      name: entry.name,
      solids: [...solids, ...railVisuals],
      diagnostics: `${triangles.length.toLocaleString()} collision triangles · spawn ${spawn
        .asArray()
        .map((v) => v.toFixed(1))
        .join(", ")} · ${(entry.rails ?? []).length} rails`,
      dispose() {
        railVisuals.forEach((m) => m.dispose());
        railMaterial.dispose();
        container.dispose();
        root.dispose();
      },
    };
  } catch (e) {
    railVisuals.forEach((m) => m.dispose());
    railMaterial.dispose();
    container.dispose();
    root.dispose();
    throw e;
  }
}
