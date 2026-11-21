// Switching between Calendar and Graph: the incoming panel slides in from the side its tab is on,
// on the shared spring. A second switch takes over the slide where it is instead of stacking.
import { applyLayoutClass } from '../ui/layout-classes.js';
import { createSpringDriver } from '../ui/motion.js';

const DISTANCE = 56;       // px the panel starts away from rest
const RESPONSE = 0.28;     // seconds

let current = null;

function layoutSlide(element) {
  return offset => {
    if (!offset) {
      element.classList.remove('tab-sliding', 'layout-tab-slide');
      return;
    }
    element.classList.add('tab-sliding');
    const alpha = 1 - 0.5 * Math.min(1, Math.abs(offset) / DISTANCE);
    applyLayoutClass(element, 'tab-slide', { '--tab-slide-x': offset, '--tab-slide-alpha': String(Math.round(alpha * 100) / 100) });
  };
}

/** direction: 1 when the new panel comes from the right (Calendar to Graph), -1 from the left. */
export function slideIn({
  direction,
  element,
  reducedMotion = () => false,
  setOffset = element ? layoutSlide(element) : () => {},
  schedule,
  cancelSchedule,
  now,
}) {
  current?.release();
  current = null;
  if (reducedMotion()) return;
  const driver = createSpringDriver({ setOffset, schedule, cancelSchedule, now, response: RESPONSE });
  const mine = { release: () => { driver.stop(); setOffset(0); } };
  current = mine;
  driver.show(direction * DISTANCE);
  driver.animateTo(0, 0, () => {
    driver.show(0);
    if (current === mine) current = null;
  });
}
