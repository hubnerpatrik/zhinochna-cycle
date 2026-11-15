// Calendar month swipe: the grid follows the finger 1:1, release is decided by projected momentum,
// and a critically damped spring carries the release velocity into the slide. Touching the grid
// during the animation grabs it where it is.
import { applyLayoutClass } from '../ui/layout-classes.js';
import { createVelocityTracker, project, settled, springStep } from '../ui/motion.js';

const LOCK_DISTANCE = 10;       // px before a drag is classified
const LOCK_RATIO = 1.5;         // horizontal must clearly beat vertical

export { createVelocityTracker, project, springStep };

/** Decides the month from the projected rest position: -1 previous, 0 stay, 1 next. */
export function settle({ offset, velocity, width }) {
  const projected = offset + project(velocity);
  if (Math.abs(projected) <= width / 2) return { direction: 0, target: 0 };
  return projected < 0 ? { direction: 1, target: -width } : { direction: -1, target: width };
}

function layoutOffset(element) {
  return offset => {
    if (!offset) {
      element.classList.remove('calendar-dragging', 'layout-calendar-drag');
      return;
    }
    element.classList.add('calendar-dragging');
    applyLayoutClass(element, 'calendar-drag', { '--calendar-drag-x': offset });
  };
}

export function bindCalendarSwipe(calendar, {
  changeMonth,
  isPhone = () => false,
  reducedMotion = () => false,
  area = calendar,               // stable element that listens; the grid itself moves sideways
  isInside = () => true,         // is this touch within the grid's band (vertical bounds)?
  setOffset = layoutOffset(calendar),
  schedule = callback => requestAnimationFrame(callback),
  cancelSchedule = frame => cancelAnimationFrame(frame),
  now = () => performance.now(),
}) {
  if (!calendar) return;
  const tracker = createVelocityTracker();
  let state = { x: 0, v: 0 };   // current on-screen offset: the source of truth for every animation
  let frame = null;             // running animation frame
  let session = 0;              // invalidates callbacks of an interrupted animation
  let pointer = null;           // { id, startX, startY, base, locked }
  let suppressClick = false;

  // The pointer may already be gone (lifted or cancelled); losing capture is harmless.
  const capture = id => { try { area.setPointerCapture?.(id); } catch { /* ignore */ } };
  const uncapture = id => { try { area.releasePointerCapture?.(id); } catch { /* ignore */ } };
  const show = x => { state = { x, v: 0 }; setOffset(x); };
  const stopAnimation = () => {
    session += 1;
    if (frame !== null) cancelSchedule(frame);
    frame = null;
  };

  function animateTo(target, velocity, done) {
    stopAnimation();
    const mine = session;
    state = { x: state.x, v: velocity };
    let last = now();
    const tick = () => {
      if (mine !== session) return;
      const time = now();
      state = springStep(state, target, (time - last) / 1000);
      last = time;
      if (settled(state, target)) {
        frame = null;
        show(target);
        done?.();
        return;
      }
      setOffset(state.x);
      frame = schedule(tick);
    };
    frame = schedule(tick);
  }

  function release(velocity) {
    const width = calendar.clientWidth || 1;
    const { direction, target } = settle({ offset: state.x, velocity, width });
    if (!direction) {
      reducedMotion() ? show(0) : animateTo(0, velocity, () => show(0));
      return;
    }
    if (reducedMotion()) {
      changeMonth(direction);
      show(0);
      return;
    }
    animateTo(target, velocity, () => {
      changeMonth(direction);          // the old month has left; swap while nothing is visible
      show(-target);                   // and bring the new one in from the opposite side
      animateTo(0, 0, () => show(0));
    });
  }

  area.addEventListener('pointerdown', event => {
    if (pointer || event.pointerType !== 'touch' || !event.isPrimary || !isPhone() || !isInside(event)) return;
    const grabbing = frame !== null || state.x !== 0;
    stopAnimation();
    suppressClick = false;
    tracker.reset();
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, base: grabbing ? state.x : 0, locked: grabbing };
    if (grabbing) capture(event.pointerId);
    tracker.add(event.clientX, now());
  });

  area.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (!pointer.locked) {
      if (Math.abs(dy) > LOCK_DISTANCE && Math.abs(dy) * LOCK_RATIO > Math.abs(dx)) { pointer = null; return; }
      if (Math.abs(dx) < LOCK_DISTANCE || Math.abs(dx) < Math.abs(dy) * LOCK_RATIO) return;
      pointer.locked = true;
      capture(event.pointerId);
    }
    suppressClick = true;
    tracker.add(event.clientX, now());
    event.preventDefault?.();
    show(pointer.base + dx);
  });

  const finish = cancelled => event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const { locked } = pointer;
    pointer = null;
    uncapture(event.pointerId);
    if (!locked) return;
    release(cancelled ? 0 : tracker.velocity());
  };
  area.addEventListener('pointerup', finish(false));
  area.addEventListener('pointercancel', finish(true));

  // The tap that ends a swipe must not select the day under the finger.
  area.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
