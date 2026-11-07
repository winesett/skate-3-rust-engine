import "./style.css";
import {
  Engine,
  Scene,
  Color3,
  Color4,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  FreeCamera,
  ArcRotateCamera,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  Quaternion,
  Ray,
  TransformNode,
} from "@babylonjs/core";
import { loadPhysics } from "./physics";
import { buildPark, createBoard } from "./park";
import { Input } from "./input";
import {
  catalog,
  loadCharacter,
  saveCharacter,
  type Character,
  type Entry,
} from "./characters";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("game");
const dialog = $<HTMLDialogElement>("character-panel");
async function start() {
  const physics = await loadPhysics();
  const engine = new Engine(canvas, true, {
    stencil: true,
    preserveDrawingBuffer: false,
  });
  // Cap at 1.5 pixels per CSS pixel; a larger scaling level renders fewer pixels.
  const renderScale = () =>
    1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5);
  engine.setHardwareScalingLevel(renderScale());
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.75, 0.82, 0.83, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.75, 0.82, 0.83);
  const ambient = new HemisphericLight("Sky", new Vector3(0.2, 1, 0.3), scene);
  ambient.intensity = 0.65;
  ambient.groundColor = new Color3(0.35, 0.4, 0.3);
  const sun = new DirectionalLight(
    "Afternoon",
    new Vector3(-0.5, -1, 0.4),
    scene,
  );
  sun.position.set(25, 40, -20);
  sun.intensity = 0.85;
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0005;
  shadows.normalBias = 0.015;
  const camera = new FreeCamera("Follow", new Vector3(0, 3, -18), scene);
  camera.minZ = 0.1;
  camera.maxZ = 300;
  camera.fov = 0.85;
  scene.activeCamera = camera;
  const park = buildPark(scene, physics);
  const skaterRoot = new TransformNode("Skater physics transform", scene);
  const board = createBoard(scene);
  board.parent = skaterRoot;
  board.getChildMeshes().forEach((m) => shadows.addShadowCaster(m));
  let entries = await catalog(),
    entry =
      entries.find(
        (e) => e.id === localStorage.getItem("skateplus-selection"),
      ) ?? entries[0];
  if (!entry) throw new Error("No character in manifest.");
  let character: Character;
  try {
    character = await loadCharacter(scene, entry);
  } catch (e) {
    console.warn("Saved model failed; loading original", e);
    entry = entries[0];
    character = await loadCharacter(scene, entry);
  }
  character.root.parent = skaterRoot;
  character.meshes.forEach((m) => shadows.addShadowCaster(m));
  const previewCanvas = $<HTMLCanvasElement>("preview"),
    pe = new Engine(previewCanvas, true),
    ps = new Scene(pe);
  ps.clearColor = new Color4(0.12, 0.21, 0.17, 1);
  const pc = new ArcRotateCamera(
    "Character orbit",
    -Math.PI / 2,
    1.3,
    3.2,
    new Vector3(0, 0.9, 0),
    ps,
  );
  pc.attachControl(previewCanvas, true);
  pc.lowerRadiusLimit = 1;
  pc.upperRadiusLimit = 8;
  new HemisphericLight("Preview sky", new Vector3(0, 1, 0), ps);
  const floor = MeshBuilder.CreateGround(
    "Preview ground",
    { width: 8, height: 8 },
    ps,
  );
  const fm = new StandardMaterial("Preview mat", ps);
  fm.diffuseColor = new Color3(0.16, 0.24, 0.19);
  floor.material = fm;
  let preview: Character | undefined,
    pending: Entry = { ...entry },
    loadingModel = false,
    previewEpoch = 0;
  const select = $<HTMLSelectElement>("character-select"),
    animations = $<HTMLSelectElement>("animation-select"),
    scale = $<HTMLInputElement>("model-scale"),
    rotation = $<HTMLInputElement>("model-rotation");
  function refresh() {
    select.replaceChildren(
      ...entries.map((e) => {
        const o = document.createElement("option");
        o.value = e.id;
        o.textContent = e.name;
        return o;
      }),
    );
    select.value = pending.id;
  }
  function adjust() {
    pending.scale = Number(scale.value);
    pending.rotation = Number(rotation.value);
    preview?.adjust(pending);
    $("scale-value").textContent = `${pending.scale.toFixed(2)}×`;
    $("rotation-value").textContent = `${pending.rotation}°`;
  }
  async function showPreview(e: Entry) {
    const epoch = ++previewEpoch;
    loadingModel = true;
    $("import-status").textContent = "Loading preview…";
    try {
      const next = await loadCharacter(ps, e);
      if (epoch !== previewEpoch) {
        next.dispose();
        return;
      }
      preview?.dispose();
      preview = next;
      pending = { ...e };
      scale.value = String(e.scale);
      rotation.value = String(e.rotation);
      adjust();
      $("rig-info").textContent = next.diagnostics;
      animations.replaceChildren();
      const auto = document.createElement("option");
      auto.value = "";
      auto.textContent = "Automatic skating poses";
      animations.append(auto);
      for (const a of next.container.animationGroups) {
        const o = document.createElement("option");
        o.value = a.name;
        o.textContent = a.name;
        animations.append(o);
      }
      $("import-status").textContent = "Ready. Drag the preview to orbit.";
    } catch (err) {
      $("import-status").textContent = String(err);
    } finally {
      if (epoch === previewEpoch) loadingModel = false;
    }
  }
  function workshop() {
    input.clear();
    dialog.showModal();
    refresh();
    pe.resize();
    void showPreview(entry);
  }
  $("characters").onclick = workshop;
  $("close-character").onclick = () => {
    dialog.close();
    canvas.focus();
  };
  dialog.addEventListener("close", () => {
    input.clear();
    canvas.focus();
  });
  select.onchange = () => {
    const e = entries.find((e) => e.id === select.value);
    if (e) void showPreview(e);
  };
  scale.oninput = adjust;
  rotation.oninput = adjust;
  animations.onchange = () => {
    if (animations.value) preview?.previewAnimation(animations.value);
    else if (preview) preview.lastMode = "";
  };
  $<HTMLInputElement>("model-file").onchange = async (ev) => {
    const files = [...((ev.target as HTMLInputElement).files ?? [])];
    if (!files.length) return;
    const model = files.find((f) => /\.(glb|gltf)$/i.test(f.name));
    if (!model) {
      $("import-status").textContent =
        "Select a .glb or .gltf plus its dependencies.";
      return;
    }
    if (files.reduce((s, f) => s + f.size, 0) > 50 * 1024 * 1024) {
      $("import-status").textContent = "Prototype import limit: 50 MB total.";
      return;
    }
    try {
      const candidate: Entry = {
        id: crypto.randomUUID(),
        name: model.name,
        scale: 1,
        rotation: 0,
        files: await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            data: await f.arrayBuffer(),
          })),
        ),
      };
      await showPreview(candidate);
    } catch (e) {
      $("import-status").textContent = String(e);
    }
  };
  $("use-character").onclick = async () => {
    if (loadingModel || !preview) return;
    loadingModel = true;
    $("import-status").textContent = "Applying character…";
    let next: Character | undefined;
    try {
      next = await loadCharacter(scene, pending);
      await saveCharacter(pending);
      next.root.parent = skaterRoot;
      next.meshes.forEach((m) => shadows.addShadowCaster(m));
      localStorage.setItem("skateplus-selection", pending.id);
      character.dispose();
      character = next;
      entry = { ...pending };
      const i = entries.findIndex((e) => e.id === entry.id);
      if (i < 0) entries.push(entry);
      else entries[i] = entry;
      dialog.close();
      canvas.focus();
    } catch (e) {
      next?.dispose();
      $("import-status").textContent = `Could not apply: ${String(e)}`;
    } finally {
      loadingModel = false;
    }
  };
  const input = new Input();
  $("reset").onclick = () => {
    physics.reset();
    input.clear();
    canvas.focus();
  };
  $("fullscreen").onclick = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement.requestFullscreen().catch((e) => {
        $("hint").textContent = String(e);
      });
  };
  let debug = false,
    slow = false,
    paused = false,
    singleStep = false;
  window.addEventListener("keydown", (e) => {
    if (dialog.open || e.repeat) return;
    if (e.code === "KeyR") physics.reset();
    if (e.code === "KeyC") workshop();
    if (debug && e.code === "KeyT") slow = !slow;
    if (debug && e.code === "KeyP") paused = !paused;
    if (debug && e.code === "KeyN") singleStep = true;
    if (e.code === "F2") {
      e.preventDefault();
      debug = !debug;
      $("debug").hidden = !debug;
    }
    if (e.code === "KeyF") $("fullscreen").click();
  });
  let accumulator = 0,
    last = performance.now(),
    time = 0,
    event = -1,
    feedbackUntil = 0,
    orbit = 0,
    state = new Float32Array(24),
    lastReset = false;
  const names = [
    "",
    "Ollie",
    "Kickflip",
    "Heelflip",
    "Pop shove-it",
    "Bail — finish the flip",
  ];
  engine.runRenderLoop(() => {
    const now = performance.now(),
      dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    if (!dialog.open && !document.hidden && (!paused || singleStep)) {
      accumulator += singleStep ? 1 / 120 : dt * (slow ? 0.25 : 1);
      singleStep = false;
      while (accumulator >= 1 / 120) {
        const i = input.sample();
        if (i.reset && !lastReset) physics.reset();
        lastReset = i.reset;
        physics.tick(i.push, i.turn, i.brake, i.jump, i.trick);
        orbit += (i.orbit / 120) * 1.7;
        accumulator -= 1 / 120;
      }
      state = new Float32Array(
        physics.memory.buffer,
        physics.state_ptr(),
        24,
      ).slice();
    }
    skaterRoot.position.set(state[0], state[1], state[2]);
    skaterRoot.rotationQuaternion = Quaternion.FromEulerAngles(
      Math.atan2(state[14], state[13]),
      state[3],
      -Math.atan2(state[12], state[13]),
    );
    const phase = Math.min(state[7] / 0.5, 1),
      flip =
        state[6] === 2
          ? Math.PI * 2 * phase
          : state[6] === 3
            ? -Math.PI * 2 * phase
            : 0;
    board.rotation.z = flip;
    board.rotation.y = state[6] === 4 ? Math.PI * 2 * phase : 0;
    const mode =
      state[5] === 0
        ? "jump"
        : input.keys.has("Space")
          ? "crouch"
          : input.pushing
            ? "push"
            : state[4] > 0.2
              ? "ride"
              : "idle";
    character.pose(mode, time, state[11]);
    const target = skaterRoot.position.add(new Vector3(0, 0.85, 0));
    let desired = new Vector3(state[15], state[16], state[17]);
    if (Math.abs(orbit) > 0.01)
      desired = target.add(
        new Vector3(
          -Math.sin(state[3] + orbit) * 6,
          2.5,
          -Math.cos(state[3] + orbit) * 6,
        ),
      );
    const delta = desired.subtract(target),
      distance = delta.length();
    const ray = new Ray(target, delta.normalize(), distance);
    const hit = scene.pickWithRay(ray, (m) => park.solids.includes(m as never));
    if (hit?.hit && hit.pickedPoint)
      desired = hit.pickedPoint.add(
        target.subtract(hit.pickedPoint).normalize().scale(0.35),
      );
    camera.position.copyFrom(desired);
    camera.setTarget(target);
    if (state[10] !== event) {
      event = state[10];
      if (state[9] > 0) {
        $("trick").textContent = names[state[9]] ?? "Landed";
        $("status").textContent = state[9] === 5 ? "TRY AGAIN" : "LANDED";
        $("hint").textContent =
          state[9] === 5
            ? "Give the board time to finish."
            : "Keep the line going.";
        feedbackUntil = time + 3;
      }
    }
    if (state[6] > 0) {
      $("trick").textContent = names[state[6]];
      $("status").textContent = "IN THE AIR";
    } else if (time > feedbackUntil) {
      $("status").textContent = "FREE SKATE";
      $("trick").textContent = "Find your line.";
      $("hint").textContent = input.controller
        ? "Controller connected · A push · B brake · X ollie · Y/LB/RB tricks"
        : "Push forward. Make it yours.";
    }
    $("score").textContent = String(Math.round(state[8])).padStart(5, "0");
    $("speed").textContent = `${(state[4] * 3.6).toFixed(1)} KM/H`;
    if (debug)
      $("debug").textContent =
        `RUST / RAPIER · 120 Hz\n${engine.getFps().toFixed(0)} FPS · ${engine.webGLVersion === 2 ? "WebGL 2" : "WebGL"}\npos ${Array.from(
          state.slice(0, 3),
        )
          .map((x) => x.toFixed(2))
          .join(
            ", ",
          )}\nspeed ${state[4].toFixed(2)} m/s · grounded ${state[5]}\ntrick ${state[6]} · airtime ${state[19].toFixed(2)}\n${input.controller ? "Gamepad connected" : "Keyboard"}\nR reset · T slow motion · P pause · N step\n${slow ? "Quarter speed" : "Normal speed"} · ${paused ? "Paused" : "Running"}`;
    scene.render();
    if (dialog.open) {
      if (preview && animations.value === "") preview.pose("ride", time);
      ps.render();
    }
  });
  window.addEventListener("resize", () => {
    engine.setHardwareScalingLevel(renderScale());
    engine.resize();
    pe.resize();
  });
  $("loading").remove();
  canvas.focus();
  // Read-only state for QA. Controls still enter through keyboard/gamepad events.
  Object.defineProperty(window, "skateplus", {
    value: {
      get state() {
        return Array.from(state);
      },
      get character() {
        return {
          id: entry.id,
          name: entry.name,
          diagnostics: character.diagnostics,
        };
      },
      get fps() {
        return engine.getFps();
      },
      get paused() {
        return dialog.open;
      },
      get renderer() {
        return `Babylon WebGL ${engine.webGLVersion}`;
      },
    },
    configurable: true,
  });
}
start().catch((e) => {
  $("loading").textContent =
    `Could not start: ${e instanceof Error ? e.message : String(e)}`;
  console.error(e);
});
