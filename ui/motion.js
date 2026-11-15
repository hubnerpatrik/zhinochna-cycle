// Shared physics for gesture-driven UI: momentum projection, a critically damped spring that
// starts from the live on-screen value and velocity, rubber-banding and release-velocity tracking.
const DECELERATION_RATE = 0.998;
const SPRING_RESPONSE = 0.32;   // seconds; damping ratio 1 (no overshoot)
const MAX_FRAME = 1 / 30;
const SUBSTEP = 1 / 240;
const SETTLE_DISTANCE = 0.5;
const SETTLE_SPEED = 5;
const VELOCITY_WINDOW_MS = 100;
const MAX_VELOCITY = 4000;
const RUBBERBAND_CONSTANT = 0.55;

/** Where a release at `velocity` (px/s) would come to rest, relative to the release point. */
export function project(velocity) {
  return (velocity / 1000) * DECELERATION_RATE / (1 - DECELERATION_RATE);
}

/** One frame of a critically damped spring; `state` is { x, v } in px and px/s. */
export function springStep({ x, v }, target, dt, response = SPRING_RESPONSE) {
  const omega = (2 * Math.PI) / response;
  const stiffness = omega * omega;
  const damping = 2 * omega;
  let remaining = Math.min(dt, MAX_FRAME);
  while (remaining > 0) {
    const step = Math.min(SUBSTEP, remaining);
    v += (-stiffness * (x - target) - damping * v) * step;
    x += v * step;
    remaining -= step;
  }
  return { x, v };
}

export const settled = ({ x, v }, target) => Math.abs(x - target) < SETTLE_DISTANCE && Math.abs(v) < SETTLE_SPEED;

/** Resistance past an edge: the further the pull, the less the element follows. */
export function rubberband(overshoot, dimension, constant = RUBBERBAND_CONSTANT) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Remembers the last moments of a drag to hand its velocity to the animation. */
export function createVelocityTracker() {
  let samples = [];
  return {
    add(x, time) {
      samples.push({ x, time });
      samples = samples.filter(sample => time - sample.time <= VELOCITY_WINDOW_MS);
    },
    reset() { samples = []; },
    velocity() {
      if (samples.length < 2) return 0;
      const first = samples[0];
      const last = samples.at(-1);
      const span = last.time - first.time;
      if (span < 8) return 0;
      const speed = ((last.x - first.x) / span) * 1000;
      return Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, speed));
    },
  };
}
