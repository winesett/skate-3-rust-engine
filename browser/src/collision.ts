import { Vector3, Matrix } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
export function collisionTriangles(meshes: AbstractMesh[], limit = 100_000) {
  const marked = meshes.some((m) =>
    m.name.toUpperCase().startsWith("COLLISION_"),
  );
  const triangles: number[][] = [];
  const min = new Vector3(Infinity, Infinity, Infinity),
    max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    const name = mesh.name.toUpperCase();
    if (
      name.startsWith("NO_COLLISION") ||
      (marked && !name.startsWith("COLLISION_"))
    )
      continue;
    if (mesh.skeleton)
      throw new Error(
        "Environment collision must be static, unskinned geometry.",
      );
    const positions = mesh.getVerticesData("position"),
      normals = mesh.getVerticesData("normal"),
      indices = mesh.getIndices();
    if (!positions || !indices) continue;
    const world = mesh.computeWorldMatrix(true),
      normalMatrix = new Matrix();
    world.toNormalMatrix(normalMatrix);
    for (let i = 0; i < indices.length; i += 3) {
      let points = [0, 1, 2].map((j) =>
        Vector3.TransformCoordinates(
          Vector3.FromArray(positions, indices[i + j] * 3),
          world,
        ),
      );
      const normal = Vector3.Cross(
        points[1].subtract(points[0]),
        points[2].subtract(points[0]),
      );
      if (normal.lengthSquared() < 1e-10) continue;
      if (normals) {
        const desired = Vector3.Zero();
        for (let j = 0; j < 3; j++)
          desired.addInPlace(
            Vector3.TransformNormal(
              Vector3.FromArray(normals, indices[i + j] * 3),
              normalMatrix,
            ),
          );
        if (Vector3.Dot(normal, desired) < 0)
          [points[1], points[2]] = [points[2], points[1]];
      }
      for (const p of points) {
        min.minimizeInPlace(p);
        max.maximizeInPlace(p);
      }
      triangles.push(points.flatMap((p) => p.asArray()));
      if (triangles.length > limit)
        throw new Error(
          `Collision exceeds ${limit.toLocaleString()} triangles. Export simple COLLISION_ meshes.`,
        );
    }
  }
  if (!triangles.length)
    throw new Error("Environment has no static collision triangles.");
  return { triangles, min, max };
}
