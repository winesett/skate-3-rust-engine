/** Session goals consume actual physics events; a bail never completes a landing goal. */
export class SessionGoals {
  flip = false;
  grind = false;
  speed = false;
  private lastEvent = -1;
  private score = 0;
  private flipInAir = false;
  update(state: readonly number[] | Float32Array) {
    if (state[4] >= 25 / 3.6) this.speed = true;
    if (state[6] >= 2 && state[6] <= 4) this.flipInAir = true;
    if (state[10] !== this.lastEvent) {
      if (state[8] > this.score) {
        if ((state[9] >= 2 && state[9] <= 4) || this.flipInAir)
          this.flip = true;
        if (state[9] === 6) this.grind = true;
        this.flipInAir = false;
      }
      if (
        state[9] === 5 ||
        state[9] === 7 ||
        (state[9] === 0 && state[20] !== 1)
      )
        this.flipInAir = false;
      this.lastEvent = state[10];
    }
    this.score = state[8];
    return [this.flip, this.grind, this.speed];
  }
}
