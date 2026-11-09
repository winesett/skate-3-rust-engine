/** Board-only rotations keep custom character rigs independent of trick physics. */
export function boardTrickRotation(id: number, seconds: number) {
  const phase = Math.max(0, Math.min(seconds / 0.5, 1));
  return {
    flip:
      id === 2 || id === 8
        ? Math.PI * 2 * phase
        : id === 3
          ? -Math.PI * 2 * phase
          : 0,
    shove: id === 4 || id === 8 ? Math.PI * phase : 0,
  };
}
