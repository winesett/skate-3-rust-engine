export class Input {
  keys = new Set<string>();
  jump = false;
  trick = 0;
  orbit = 0;
  controller = false;
  pushing = false;
  private padJump = false;
  private padTrick = 0;
  constructor() {
    window.addEventListener("keydown", (e) => {
      if (
        (e.target instanceof HTMLElement &&
          e.target.matches("input,select,button")) ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === "Space") this.jump = true;
        this.trick =
          ({ KeyJ: 1, KeyK: 2, KeyL: 3 } as Record<string, number>)[e.code] ??
          this.trick;
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => this.clear());
  }
  clear() {
    this.keys.clear();
    this.pushing = false;
    this.jump = false;
    this.trick = 0;
    this.padJump = false;
    this.padTrick = 0;
  }
  sample() {
    const pad = [...navigator.getGamepads()].find((p) => p?.connected);
    this.controller = !!pad;
    const axis = pad?.axes[0] ?? 0;
    const turn =
      (this.keys.has("KeyD") ? 1 : 0) -
      (this.keys.has("KeyA") ? 1 : 0) +
      (Math.abs(axis) > 0.12 ? axis : 0);
    const push =
      this.keys.has("KeyW") ||
      this.keys.has("ArrowUp") ||
      pad?.buttons[0]?.pressed
        ? 1
        : 0;
    this.pushing = push > 0;
    const brake =
      this.keys.has("KeyS") ||
      this.keys.has("ArrowDown") ||
      pad?.buttons[1]?.pressed
        ? 1
        : 0;
    const pj = !!(pad?.buttons[2]?.pressed || pad?.buttons[6]?.pressed);
    const pt = pad?.buttons[3]?.pressed
      ? 1
      : pad?.buttons[4]?.pressed
        ? 2
        : pad?.buttons[5]?.pressed
          ? 3
          : 0;
    const jump = this.jump || (pj && !this.padJump);
    const trick = this.trick || (pt !== this.padTrick ? pt : 0);
    this.padJump = pj;
    this.padTrick = pt;
    this.jump = false;
    this.trick = 0;
    const orbit =
      (this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("ArrowLeft") ? 1 : 0) +
      (pad?.axes[2] ?? 0);
    return {
      push,
      turn: Math.max(-1, Math.min(1, turn)),
      brake,
      jump: +jump,
      trick,
      orbit,
      reset: !!pad?.buttons[8]?.pressed,
    };
  }
}
