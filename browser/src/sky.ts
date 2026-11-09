import {
  Scene,
  MeshBuilder,
  Mesh,
  ShaderMaterial,
  Color3,
} from "@babylonjs/core";
export function createSky(scene: Scene) {
  const sphere = MeshBuilder.CreateSphere(
    "Sky gradient",
    { diameter: 400, segments: 16, sideOrientation: Mesh.BACKSIDE },
    scene,
  );
  sphere.infiniteDistance = true;
  sphere.isPickable = false;
  const material = new ShaderMaterial(
    "Sky gradient shader",
    scene,
    {
      vertexSource:
        "precision highp float; attribute vec3 position; uniform mat4 worldViewProjection; varying float height; void main(){height=normalize(position).y;gl_Position=worldViewProjection*vec4(position,1.0);}",
      fragmentSource:
        "precision highp float; varying float height; uniform vec3 topColor; uniform vec3 horizonColor; void main(){float t=smoothstep(-0.05,0.8,height);gl_FragColor=vec4(mix(horizonColor,topColor,t),1.0);}",
    },
    {
      attributes: ["position"],
      uniforms: ["worldViewProjection", "topColor", "horizonColor"],
    },
  );
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  sphere.material = material;
  return {
    setMood(sunset: boolean) {
      material.setColor3("topColor", new Color3(0.37, 0.57, 0.73));
      material.setColor3(
        "horizonColor",
        sunset ? new Color3(0.92, 0.78, 0.64) : new Color3(0.77, 0.84, 0.84),
      );
    },
  };
}
