import { VertexData } from "@babylonjs/core";
export const deckHalfWidth = (z: number) =>
  Math.sqrt(
    Math.max(0.000001, 0.145 ** 2 - Math.max(0, Math.abs(z) - 0.31) ** 2),
  );
export const deckHeight = (x: number, z: number) =>
  0.012 +
  0.065 * Math.max(0, (Math.abs(z) - 0.28) / 0.175) ** 2 +
  0.012 * (x / 0.145) ** 2;
export function deckGeometry(bottom = false, inset = 0) {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [],
    normals: number[] = [];
  const sections = 40,
    columns = 12;
  for (let i = 0; i <= sections; i++) {
    const z = -0.455 + (i / sections) * 0.91,
      w = Math.max(0.001, deckHalfWidth(z) - inset);
    for (let j = 0; j <= columns; j++) {
      const x = ((j / columns) * 2 - 1) * w;
      positions.push(x, deckHeight(x, z) - (bottom ? 0.016 : 0), z);
      uvs.push(x / 0.29 + 0.5, 0.5 + z / 0.91);
    }
  }
  for (let i = 0; i < sections; i++)
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j,
        b = a + columns + 1;
      // Babylon's left-handed front face uses the opposite winding to a RH cross product.
      indices.push(
        ...(bottom
          ? [a, b, a + 1, a + 1, b, b + 1]
          : [a, a + 1, b, a + 1, b + 1, b]),
      );
    }
  VertexData.ComputeNormals(positions, indices, normals);
  return { positions, indices, normals, uvs };
}
