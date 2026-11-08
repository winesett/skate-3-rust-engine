export type Physics = {
  memory: WebAssembly.Memory;
  init(): void;
  reset(): void;
  tick(
    push: number,
    turn: number,
    brake: number,
    jump: number,
    trick: number,
  ): void;
  state_ptr(): number;
  add_box(...args: number[]): void;
  add_ramp(...args: number[]): void;
  add_rail(ax: number, y: number, az: number, bx: number, bz: number): void;
};
export async function loadPhysics(): Promise<Physics> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}engine/skateplus_web_physics.wasm`,
  );
  if (!response.ok)
    throw new Error("Physics WASM missing. Run ./scripts/build-physics.sh.");
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    {},
  );
  const physics = instance.exports as unknown as Physics;
  physics.init();
  return physics;
}
