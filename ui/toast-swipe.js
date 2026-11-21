// A message can be pushed back down with a finger: it follows 1:1, a pull or flick dismisses it, a short
// slow pull springs back. While it is touched its countdown is held, so it never vanishes under a finger.
import { applyLayoutClass } from './layout-classes.js';
import { createSpringDriver, createVelocityTracker, project, rubberband } from './motion.js';

const LOCK_DISTANCE = 6;      // px before a drag is classified
const DISMISS_DISTANCE = 28;  // px of projected travel that dismisses
const EXIT_OFFSET = 72;       // px the message slides to before it is hidden

function layoutOffset(getToast) {
  return offset => {
    const toast = getToast();
    if (!toast) return;
    if (!offset) {
      toast.classList.remove('toast-dragging', 'layout-toast-drag');
      return;
    }
    toast.classList.add('toast-dragging');
    applyLayoutClass(toast, 'toast-drag', { '--toast-drag-y': offset });
  };
}

export function bindToastSwipe(host, {
  findToast,
  onDismiss,
  onHold = () => {},
  onRelease = () => {},
  setOffset,
  schedule,
  cancelSchedule,
  now = () => performance.now(),
}) {
  let toast = null;
  const spring = createSpringDriver({ setOffset: setOffset ?? layoutOffset(() => toast), schedule, cancelSchedule, now });
  const tracker = createVelocityTracker();
  let pointer = null;   // { id, startY, locked }

  const inControl = event => Boolean(event.target?.closest?.('button, a, input'));

  host.addEventListener('pointerdown', event => {
    if (pointer) return;
    const found = findToast(event);
    if (!found || inControl(event)) return;
    toast = found;
    spring.stop();
    tracker.reset();
    tracker.add(event.clientY, now());
    pointer = { id: event.pointerId, startY: event.clientY, locked: false };
    onHold();
  });

  host.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dy = event.clientY - pointer.startY;
    if (!pointer.locked) {
      if (Math.abs(dy) < LOCK_DISTANCE) return;
      pointer.locked = true;
      try { toast.setPointerCapture?.(event.pointerId); } catch { /* the pointer may be gone */ }
    }
    tracker.add(event.clientY, now());
    event.preventDefault?.();
    spring.show(dy >= 0 ? dy : -rubberband(-dy, 80));
  });

  const finish = cancelled => event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const { locked } = pointer;
    pointer = null;
    try { toast?.releasePointerCapture?.(event.pointerId); } catch { /* ignore */ }
    if (!locked) { onRelease(); return; }
    const velocity = cancelled ? 0 : tracker.velocity();
    if (spring.x + project(velocity) > DISMISS_DISTANCE) {
      spring.animateTo(EXIT_OFFSET, velocity, () => onDismiss());
    } else {
      spring.animateTo(0, velocity, () => { spring.show(0); onRelease(); });
    }
  };
  host.addEventListener('pointerup', finish(false));
  host.addEventListener('pointercancel', finish(true));

  return {
    /** A new message starts at rest, wherever the last one was left. */
    reset() { spring.stop(); spring.show(0); pointer = null; },
  };
}
