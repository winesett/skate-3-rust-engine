export type PadLike = {
  id: string;
  mapping: string;
  connected: boolean;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
};
export function deadzone(value: number, threshold = 0.16) {
  if (!Number.isFinite(value) || Math.abs(value) <= threshold) return 0;
  return (
    Math.sign(value) *
    Math.min(1, (Math.abs(value) - threshold) / (1 - threshold))
  );
}
export function xboxState(pad: PadLike | undefined) {
  const supported = !!pad?.connected && pad.mapping === "standard";
  const down = (i: number) => supported && !!pad!.buttons[i]?.pressed;
  const value = (i: number) =>
    supported ? Math.max(0, Math.min(1, pad!.buttons[i]?.value ?? 0)) : 0;
  return {
    supported,
    label: pad
      ? supported
        ? /xbox|xinput|045e/i.test(pad.id)
          ? "Xbox controller"
          : "Standard controller"
        : "Unmapped controller — use Xbox standard mode"
      : "Keyboard · connect Xbox and press A",
    turn: supported ? deadzone(pad!.axes[0] ?? 0) : 0,
    orbit: supported ? deadzone(pad!.axes[2] ?? 0) : 0,
    push: Math.max(down(0) ? 1 : 0, value(7)),
    brake: down(1) ? 1 : 0,
    jump: down(2) || down(6),
    trick: down(3) ? 1 : down(4) ? 2 : down(5) ? 3 : 0,
    reset: down(8),
    menu: down(9),
    back: down(1),
    accept: down(0),
    up: down(12),
    down: down(13),
    left: down(14),
    right: down(15),
  };
}
