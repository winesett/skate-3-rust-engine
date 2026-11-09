import { xboxState } from "./gamepad";
export class Input {
  keys = new Set<string>();
  jump = false;
  trick = 0;
  orbit = 0;
  controller = false;
  pushing = false;
  controllerLabel = "Keyboard · connect Xbox and press A";
  private uiPrevious: Record<string, boolean> = {};
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
          ({ KeyJ: 1, KeyK: 2, KeyL: 3, KeyV: 4 } as Record<string, number>)[
            e.code
          ] ?? this.trick;
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
  private pad() {
    const pads = [...(navigator.getGamepads?.() ?? [])].filter(
      (p) => p?.connected,
    );
    const state = xboxState(
      pads.find((p) => p?.mapping === "standard") ?? pads[0] ?? undefined,
    );
    this.controller = state.supported;
    this.controllerLabel = state.label;
    return state;
  }
  menuActions() {
    const state = this.pad();
    const result: Record<string, boolean> = {};
    for (const key of [
      "menu",
      "back",
      "accept",
      "up",
      "down",
      "left",
      "right",
    ] as const) {
      result[key] = state[key] && !this.uiPrevious[key];
      this.uiPrevious[key] = state[key];
    }
    return result;
  }
  sample() {
    const pad = this.pad();
    const turn =
      (this.keys.has("KeyD") ? 1 : 0) -
      (this.keys.has("KeyA") ? 1 : 0) +
      pad.turn;
    const push = Math.max(
      this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0,
      pad.push,
    );
    this.pushing = push > 0;
    const brake = Math.max(
      this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0,
      pad.brake,
    );
    const pj = pad.jump,
      pt = pad.trick;
    const jump = this.jump || (pj && !this.padJump);
    const trick = this.trick || (pt !== this.padTrick ? pt : 0);
    this.padJump = pj;
    this.padTrick = pt;
    this.jump = false;
    this.trick = 0;
    const orbit =
      (this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("ArrowLeft") ? 1 : 0) +
      pad.orbit;
    return {
      push,
      turn: Math.max(-1, Math.min(1, turn)),
      brake,
      jump: +jump,
      trick,
      orbit,
      reset: pad.reset,
    };
  }
}
