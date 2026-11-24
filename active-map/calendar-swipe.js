// Calendar month swipe: the grid follows the finger 1:1, release is decided by projected momentum,
// and a critically damped spring carries the release velocity into the slide. Touching the grid
// during the animation grabs it where it is.
import { applyLayoutClass } from '../ui/layout-classes.js';
import { createSpringDriver, createVelocityTracker, project, springStep } from '../ui/motion.js';

const LOCK_DISTANCE = 10;       // px before a drag is classified
const LOCK_RATIO = 1.5;         // horizontal must clearly beat vertical

export { createVelocityTracker, project, springStep };

/** Decides the month from the projected rest position: -1 previous, 0 stay, 1 next. */
export function settle({ offset, velocity, width }) {
  const projected = offset + project(velocity);
  if (Math.abs(projected) <= width / 2) return { direction: 0, target: 0 };
  return projected < 0 ? { direction: 1, target: -width } : { direction: -1, target: width };
}

/**
 * Moves the grid sideways. One Web Animation is reused while it slides, so a frame changes only that
 * element's transform; rewriting a stylesheet rule instead restyles the whole page on every frame.
 * Browsers without Web Animations fall back to the shared layout class.
 */
export function calendarOffset(element) {
  let animation = null;
  return offset => {
    if (!offset) {
      animation?.cancel();
      animation = null;
      element.classList.remove('calendar-dragging', 'layout-calendar-drag');
      return;
    }
    element.classList.add('calendar-dragging');
    if (typeof element.animate !== 'function') {
      applyLayoutClass(element, 'calendar-drag', { '--calendar-drag-x': offset });
      return;
    }
    const frames = [{ transform: `translateX(${offset}px)` }];
    if (animation) animation.effect.setKeyframes(frames);
    else animation = element.animate(frames, { duration: 0, fill: 'forwards' });
  };
}

export function bindCalendarSwipe(calendar, {
  changeMonth,
  isPhone = () => false,
  reducedMotion = () => false,
  area = calendar,               // stable element that listens; the grid itself moves sideways
  isInside = () => true,         // is this touch within the grid's band (vertical bounds)?
  setOffset = calendarOffset(calendar),
  schedule = callback => requestAnimationFrame(callback),
  cancelSchedule = frame => cancelAnimationFrame(frame),
  now = () => performance.now(),
}) {
  if (!calendar) return;
  const tracker = createVelocityTracker();
  const spring = createSpringDriver({ setOffset, schedule, cancelSchedule, now });
  let pointer = null;           // { id, startX, startY, base, locked }
  let suppressClick = false;

  // The pointer may already be gone (lifted or cancelled); losing capture is harmless.
  const capture = id => { try { area.setPointerCapture?.(id); } catch { /* ignore */ } };
  const uncapture = id => { try { area.releasePointerCapture?.(id); } catch { /* ignore */ } };
  const { show, animateTo, stop: stopAnimation } = spring;

  function release(velocity) {
    const width = calendar.clientWidth || 1;
    const { direction, target } = settle({ offset: spring.x, velocity, width });
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
    // A swipe produces no click of its own, so any new press (also on a month arrow outside the grid) disarms the guard.
    if (!pointer) suppressClick = false;
    if (pointer || event.pointerType !== 'touch' || !event.isPrimary || !isPhone() || !isInside(event)) return;
    const grabbing = spring.animating || spring.x !== 0;
    stopAnimation();
    tracker.reset();
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, base: grabbing ? spring.x : 0, locked: grabbing };
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

  // The tap that ends a swipe must not select the day under the finger. Keyboard clicks (detail 0) always pass.
  area.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    if (event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
