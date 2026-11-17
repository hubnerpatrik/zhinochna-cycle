// The zoom in/out buttons: the column width springs to its target. Tapping again while it is still
// moving builds on the target already set and carries the live velocity, so fast taps feel continuous.
import { createSpringDriver } from '../ui/motion.js';

const RESPONSE = 0.22;

export function createZoomAnimator({ getWidth, applyWidth, clamp, step, reducedMotion = () => false, schedule, cancelSchedule, now }) {
  const spring = createSpringDriver({ setOffset: applyWidth, schedule, cancelSchedule, now, response: RESPONSE });
  let target = null;
  return {
    by(direction) {
      const next = clamp(step(direction, target ?? getWidth()));
      if (reducedMotion()) {
        spring.stop();
        target = null;
        applyWidth(next);
        return;
      }
      if (!spring.animating) spring.show(getWidth());
      target = next;
      spring.animateTo(next, undefined, () => { target = null; });
    },
    cancel() {
      spring.stop();
      target = null;
    },
  };
}
