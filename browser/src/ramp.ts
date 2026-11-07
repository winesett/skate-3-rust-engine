/** Hard-edged wedge with outward normals and metre-based UVs (Babylon LH winding). */
export function rampGeometry(
  width: number,
  length: number,
  height: number,
  reverse = false,
) {
  const dir = reverse ? -1 : 1;
  const corners = [
    [-width / 2, 0, (-dir * length) / 2],
    [width / 2, 0, (-dir * length) / 2],
    [width / 2, height, (dir * length) / 2],
    [-width / 2, height, (dir * length) / 2],
    [-width / 2, -0.3, (-dir * length) / 2],
    [width / 2, -0.3, (-dir * length) / 2],
    [width / 2, -0.3, (dir * length) / 2],
    [-width / 2, -0.3, (dir * length) / 2],
  ];
  const centre = [0, (height - 0.3) / 2, 0];
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: number[], b: number[]) =>
    a.reduce((sum, v, i) => sum + v * b[i], 0);
  const unit = (a: number[]) => {
    const length = Math.hypot(...a);
    return a.map((v) => v / length);
  };
  for (const face of [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [3, 2, 6, 7],
    [0, 3, 7, 4],
    [1, 5, 6, 2],
  ]) {
    let points = face.map((i) => corners[i]);
    let normal = unit(
      cross(sub(points[0], points[1]), sub(points[2], points[1])),
    );
    const midpoint = points[0].map(
      (_, i) => points.reduce((sum, p) => sum + p[i], 0) / 4,
    );
    if (dot(normal, sub(midpoint, centre)) < 0) {
      points = points.slice().reverse();
      normal = normal.map((v) => -v);
    }
    const u = unit(sub(points[1], points[0])),
      v = unit(sub(points[3], points[0]));
    const start = positions.length / 3;
    for (const p of points) {
      positions.push(...p);
      normals.push(...normal);
      const offset = sub(p, points[0]);
      uvs.push(dot(offset, u) / 6, dot(offset, v) / 6);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return { positions, normals, uvs, indices };
}
