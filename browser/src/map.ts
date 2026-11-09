export type Spot = {
  id: string;
  name: string;
  position: [number, number, number];
  heading: number;
  hint: string;
};
export type MapBox = { minX: number; minZ: number; maxX: number; maxZ: number };
export function mapPoint(
  x: number,
  z: number,
  bounds: readonly number[],
  size = 160,
) {
  return [
    10 + ((x - bounds[0]) / (bounds[1] - bounds[0])) * (size - 20),
    size - 10 - ((z - bounds[2]) / (bounds[3] - bounds[2])) * (size - 20),
  ];
}
export function drawMap(
  canvas: HTMLCanvasElement,
  bounds: readonly number[],
  obstacles: MapBox[],
  spots: Spot[],
  state: Float32Array,
  selected: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = 160;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#233c36";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#466056";
  ctx.lineWidth = 0.5;
  for (let i = 20; i < size; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.fillStyle = "#68847a";
  for (const box of obstacles) {
    const a = mapPoint(box.minX, box.maxZ, bounds),
      b = mapPoint(box.maxX, box.minZ, bounds);
    ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }
  spots.forEach((spot, i) => {
    const [x, y] = mapPoint(spot.position[0], spot.position[2], bounds);
    ctx.beginPath();
    ctx.fillStyle = i === selected ? "#e9ff77" : "#b3d3bc";
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10291f";
    ctx.font = "bold 6px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), x, y + 2);
  });
  const [x, y] = mapPoint(state[0], state[2], bounds);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state[3]);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(0, 3);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#c4d8cb";
  ctx.font = "8px Arial";
  ctx.textAlign = "right";
  ctx.fillText("N ↑", 151, 12);
}
