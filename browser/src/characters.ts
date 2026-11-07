import {
  AssetContainer,
  Scene,
  TransformNode,
  Vector3,
  Quaternion,
  AbstractMesh,
  AnimationGroup,
  LoadAssetContainerAsync,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
export type Entry = {
  id: string;
  name: string;
  file?: string;
  scale: number;
  rotation: number;
  files?: { name: string; data: ArrayBuffer }[];
};
const base = import.meta.env.BASE_URL;
const normalize = (s: string) =>
  s
    .replace(/^mixamorig[:_]?/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
const aliases: Record<string, string[]> = {
  hips: ["hips", "pelvis"],
  spine: ["spine", "spine1", "chest"],
  head: ["head"],
  leftUpperArm: ["leftupperarm", "leftarm", "upperarml"],
  rightUpperArm: ["rightupperarm", "rightarm", "upperarmr"],
  leftForeArm: ["leftforearm", "lowerarml"],
  rightForeArm: ["rightforearm", "lowerarmr"],
  leftUpLeg: ["leftupleg", "leftthigh", "thighl"],
  rightUpLeg: ["rightupleg", "rightthigh", "thighr"],
  leftLeg: ["leftleg", "leftshin", "calfl"],
  rightLeg: ["rightleg", "rightshin", "calfr"],
  leftFoot: ["leftfoot", "footl"],
  rightFoot: ["rightfoot", "footr"],
};
export class Character {
  root: TransformNode;
  container: AssetContainer;
  meshes: AbstractMesh[];
  bones: Record<string, TransformNode> = {};
  rest = new Map<TransformNode, Quaternion>();
  active?: AnimationGroup;
  lastMode = "";
  diagnostics: string;
  constructor(container: AssetContainer, scene: Scene, entry: Entry) {
    this.container = container;
    container.addAllToScene();
    this.root = new TransformNode("Character visual wrapper", scene);
    for (const node of container.rootNodes) node.parent = this.root;
    this.meshes = container.meshes;
    for (const [key, names] of Object.entries(aliases)) {
      const node = container.transformNodes.find((n) =>
        names.includes(normalize(n.name)),
      );
      if (node) {
        this.bones[key] = node;
        this.rest.set(
          node,
          node.rotationQuaternion?.clone() ??
            Quaternion.FromEulerVector(node.rotation),
        );
      }
    }
    const count = container.skeletons.reduce((a, s) => a + s.bones.length, 0),
      missing = [
        "hips",
        "spine",
        "leftUpLeg",
        "rightUpLeg",
        "leftLeg",
        "rightLeg",
      ].filter((n) => !this.bones[n]);
    if (!container.meshes.some((m) => m.getTotalVertices() > 0))
      throw new Error("Model contains no renderable mesh.");
    this.diagnostics = `${container.meshes.filter((m) => m.getTotalVertices() > 0).length} meshes · ${count} bones · ${container.animationGroups.length} clips\n${missing.length ? `Partial humanoid map: missing ${missing.join(", ")}. Embedded clips only where available.` : "Humanoid map compatible: relative skating poses enabled."}\n${count ? "Skin detected" : "No skin: rigid model; supply a rigged model for limb animation."}\nRetargeting assumes standard humanoid bone axes; inspect the preview.`;
    this.adjust(entry);
    container.animationGroups.forEach((a) => a.stop());
  }
  adjust(entry: Entry) {
    this.root.scaling.setAll(entry.scale);
    this.root.rotation.y = (entry.rotation * Math.PI) / 180;
  }
  pose(mode: string, time: number, turn = 0) {
    if (this.lastMode !== mode) {
      this.active?.stop();
      for (const [n, q] of this.rest) n.rotationQuaternion = q.clone();
      const names =
        mode === "push"
          ? ["push", "walk"]
          : mode === "jump"
            ? ["jump", "air"]
            : mode === "crouch"
              ? ["crouch"]
              : mode === "ride"
                ? ["ride", "skate", "idle"]
                : ["idle", "stand"];
      this.active = this.container.animationGroups.find((g) =>
        names.some((n) => g.name.toLowerCase().includes(n)),
      );
      this.active?.start(true, 1);
      this.lastMode = mode;
    }
    if (this.active) return;
    // Relative joint rotations retarget our original ride/push/air poses to named humanoids.
    const swing =
      mode === "push" ? Math.sin(time * 8) * 0.5 : Math.sin(time * 2) * 0.025;
    const crouch = mode === "crouch" ? 0.6 : mode === "jump" ? 0.4 : 0.12;
    for (const [key, node] of Object.entries(this.bones)) {
      const q = this.rest.get(node)!;
      let x = 0,
        z = 0;
      if (key === "spine") z = -crouch * 0.35 + turn * 0.12;
      if (key === "leftUpLeg") z = crouch + swing;
      if (key === "rightUpLeg") z = crouch - swing;
      if (key === "leftLeg" || key === "rightLeg") z = -crouch * 1.3;
      if (key.includes("UpperArm"))
        x = (key.startsWith("left") ? 1 : -1) * (0.15 + crouch);
      node.rotationQuaternion = q.multiply(Quaternion.FromEulerAngles(x, 0, z));
    }
  }
  previewAnimation(name: string) {
    this.active?.stop();
    this.container.animationGroups.forEach((a) => a.stop());
    this.active = this.container.animationGroups.find((a) => a.name === name);
    this.active?.start(true);
    this.lastMode = "preview";
  }
  dispose() {
    this.container.dispose();
    this.root.dispose();
  }
}
async function source(
  entry: Entry,
): Promise<{ file: string | File; root: string; extension: ".glb" | ".gltf" }> {
  if (!entry.files) {
    const f = entry.file!;
    return {
      root: `${base}characters/`,
      file: f,
      extension: f.toLowerCase().endsWith(".glb") ? ".glb" : ".gltf",
    };
  }
  const model = entry.files.find((f) => /\.(glb|gltf)$/i.test(f.name));
  if (!model) throw new Error("Choose a .glb or .gltf model.");
  if (model.name.toLowerCase().endsWith(".glb"))
    return {
      root: "",
      file: new File([model.data], model.name),
      extension: ".glb",
    };
  const json = JSON.parse(new TextDecoder().decode(model.data));
  for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (!item.uri || item.uri.startsWith("data:")) continue;
    const decoded = decodeURIComponent(item.uri);
    const f = entry.files.find(
      (f) => f.name === decoded || f.name === decoded.split("/").pop(),
    );
    if (!f)
      throw new Error(
        `Missing glTF dependency: ${item.uri}. Select all model files together.`,
      );
    const mime = /\.png$/i.test(f.name)
      ? "image/png"
      : /\.jpe?g$/i.test(f.name)
        ? "image/jpeg"
        : /\.webp$/i.test(f.name)
          ? "image/webp"
          : "application/octet-stream";
    const bytes = new Uint8Array(f.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    item.uri = `data:${mime};base64,${btoa(binary)}`;
  }
  return {
    root: "",
    file: new File([JSON.stringify(json)], model.name),
    extension: ".gltf",
  };
}
export async function loadCharacter(scene: Scene, entry: Entry) {
  const s = await source(entry);
  const container = await LoadAssetContainerAsync(s.file, scene, {
    rootUrl: s.root,
    pluginExtension: s.extension,
  });
  try {
    return new Character(container, scene, entry);
  } catch (e) {
    container.dispose();
    throw e;
  }
}
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("skateplus-characters", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("models", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function savedCharacters(): Promise<Entry[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("models");
    const r = tx.objectStore("models").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => d.close();
  });
}
export async function saveCharacter(entry: Entry) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("models", "readwrite");
    tx.objectStore("models").put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  d.close();
}
export async function catalog(): Promise<Entry[]> {
  const r = await fetch(`${base}characters/manifest.json`);
  if (!r.ok)
    throw new Error("Character manifest missing. Run npm run characters.");
  const list = (await r.json()).characters as Entry[];
  let saved: Entry[] = [];
  try {
    saved = await savedCharacters();
  } catch (e) {
    console.warn("Character storage unavailable", e);
  }
  const merged = new Map(list.map((e) => [e.id, e]));
  saved.forEach((e) => merged.set(e.id, e));
  return [...merged.values()];
}
