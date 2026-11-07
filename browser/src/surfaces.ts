import { DynamicTexture, Scene, Texture } from "@babylonjs/core";
/** Original seamless concrete; mipmaps filter grain and seams at grazing angles. */
export function concreteTexture(scene: Scene, seams = false) {
  const size = 512;
  const texture = new DynamicTexture(
    seams ? "Concrete slab joints" : "Concrete grain",
    { width: size, height: size },
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  const context = texture.getContext();
  const pixels = context.getImageData(0, 0, size, size);
  let seed = 97213;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 222 + ((seed >>> 24) / 255 - 0.5) * 12;
    pixels.data[i] = value;
    pixels.data[i + 1] = value;
    pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  if (seams) {
    context.fillStyle = "#a4a4a4";
    // Opposite edges join seamlessly; no intersecting coplanar geometry.
    context.fillRect(0, 0, size, 1);
    context.fillRect(0, size - 1, size, 1);
    context.fillRect(0, 0, 1, size);
    context.fillRect(size - 1, 0, 1, size);
  }
  texture.update(false);
  texture.anisotropicFilteringLevel = 8;
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  return texture;
}
