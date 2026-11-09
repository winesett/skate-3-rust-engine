import {
  AssetContainer,
  Scene,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Texture,
  Color3,
  Material,
  AnimationGroup,
} from "@babylonjs/core";
export type SpriteSpec = {
  manifest: string;
  modes: Record<string, string>;
  height?: number;
};
export async function spriteCharacter(scene: Scene, spec: SpriteSpec) {
  const url = new URL(
    `${import.meta.env.BASE_URL}characters/${spec.manifest}`,
    location.href,
  );
  const response = await fetch(url);
  if (!response.ok) throw Error("Character animation manifest missing");
  const data = await response.json();
  const container = new AssetContainer(scene),
    height = spec.height ?? 1.65;
  const mesh = MeshBuilder.CreatePlane(
    "Original animated character",
    { size: height },
    scene,
  );
  mesh.position.y = (data.camera.sole_y / data.size - 0.5) * height;
  mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
  const material = new StandardMaterial("Original rendered animation", scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.White();
  material.backFaceCulling = false;
  material.transparencyMode = Material.MATERIAL_ALPHATEST;
  material.useAlphaFromDiffuseTexture = true;
  mesh.material = material;
  container.meshes.push(mesh);
  container.rootNodes.push(mesh);
  container.materials.push(material);
  for (const name of Object.keys(data.clips))
    container.animationGroups.push(new AnimationGroup(name, scene));
  const textures = new Map<string, Texture>();
  let current = "",
    started = 0,
    mode = "",
    idleIndex = 0,
    lastFrame = 0;

  function play(name: string) {
    if (name === current) return;
    const clip = data.clips[name];
    if (!clip) return;
    current = name;
    started = performance.now();
    let texture = textures.get(name);
    if (!texture) {
      texture = new Texture(
        new URL(clip.sheet, url).href,
        scene,
        false,
        true,
        Texture.BILINEAR_SAMPLINGMODE,
      );
      texture.hasAlpha = true;
      texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      if (textures.size >= 4) {
        const oldest = textures.keys().next().value;
        if (oldest) {
          textures.get(oldest)?.dispose();
          textures.delete(oldest);
        }
      }
      textures.set(name, texture);
      container.textures.push(texture);
    }
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
  }
  const observer = scene.onBeforeRenderObservable.add(() => {
    const clip = data.clips[current],
      texture = textures.get(current);
    if (!clip || !texture?.isReady()) return;
    const elapsed = (performance.now() - started) / 1000;
    if (
      (mode === "idle" || mode === "ride") &&
      elapsed > Math.max(3, clip.frames / data.fps)
    ) {
      const idle = [
        "idle_breathe",
        "idle_blink",
        "idle_look_around",
        "idle_mitten_flex",
      ];
      play(idle[++idleIndex % idle.length]);
      return;
    }
    const raw = Math.floor(elapsed * data.fps),
      frame = clip.loop ? raw % clip.frames : Math.min(raw, clip.frames - 1);
    lastFrame = frame;
    const rows = Math.ceil(clip.frames / data.cols);
    texture.uScale = 1 / data.cols;
    texture.vScale = 1 / rows;
    texture.uOffset = (frame % data.cols) / data.cols;
    texture.vOffset = 1 - (Math.floor(frame / data.cols) + 1) / rows;
  });
  play(spec.modes.idle);
  return {
    container,
    get state() {
      return { clip: current, frame: lastFrame };
    },
    pose(nextMode: string) {
      if (mode === nextMode) return;
      mode = nextMode;
      play(spec.modes[mode] ?? spec.modes.idle);
    },
    preview(name: string) {
      mode = "preview";
      play(name);
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
    },
    get diagnostics() {
      return `${Object.keys(data.clips).length} original rendered cycles · ${data.fps} fps\nAnimated billboard in the 3D park. Original artwork and motion are preserved; this character uses rendered frames rather than a humanoid skeleton.`;
    },
  };
}
