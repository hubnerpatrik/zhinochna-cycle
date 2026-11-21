// Bottom sheets on phones: drag the grabber or the title down and the sheet follows the finger,
// resists when pulled up, and on release a projected-momentum decision either slides it away
// (then closes it through the dialog's own close path) or springs it back. Grabbing a moving
// sheet takes it over where it is. On phones a sheet also rises on the same spring when it opens, so it can
// be grabbed while it is still moving; the scrim follows the sheet. Leaving by a button is a CSS transition.
import { applyLayoutClass } from './layout-classes.js';
import { createSpringDriver, createVelocityTracker, project, rubberband } from './motion.js';

const LOCK_DISTANCE = 8;   // px before a drag is classified
const LOCK_RATIO = 1.2;    // vertical must clearly beat horizontal
const GRIP = '.sheet-grip';
const CONTROLS = 'button, a, input, select, textarea';

/** Closes when the projected resting place is below the middle of the sheet. */
export function settleSheet({ offset, velocity, height }) {
  const projected = offset + project(velocity);
  return projected > height / 2 ? { dismiss: true, target: height } : { dismiss: false, target: 0 };
}

function layoutOffset(element) {
  return offset => {
    if (!offset) {
      element.classList.remove('sheet-dragging', 'layout-sheet-drag');
      return;
    }
    element.classList.add('sheet-dragging');
    applyLayoutClass(element, 'sheet-drag', { '--sheet-drag-y': offset });
  };
}

// The scrim sits on the dialog itself (its ::backdrop) or on the .modal that wraps an editor card.
const scrimOwner = card => (card.localName === 'dialog' ? card
  : card.parentElement?.classList?.contains('modal') ? card.parentElement : null);

/** 0 = scrim fully shown (sheet at rest), 1 = fully clear (sheet gone). */
function layoutDim(card) {
  const owner = scrimOwner(card);
  if (!owner?.ownerDocument?.head) return () => {};
  return progress => {
    if (!progress) {
      owner.classList.remove('sheet-dimming', 'layout-sheet-dim');
      return;
    }
    owner.classList.add('sheet-dimming');
    applyLayoutClass(owner, 'sheet-dim', { '--sheet-dim': String(Math.round(progress * 1000) / 1000) });
  };
}

// Reports each change between closed and open (a dialog's `open`, or `show` on a .modal).
function watchOpening(card, onChange) {
  if (typeof MutationObserver === 'undefined' || !card.ownerDocument) return;
  const isDialog = card.localName === 'dialog';
  const target = isDialog ? card : card.parentElement;
  if (!target) return;
  const opened = () => (isDialog ? card.open : target.classList.contains('show'));
  let was = opened();
  new MutationObserver(() => {
    const now = opened();
    if (now !== was) onChange(now);
    was = now;
  }).observe(target, { attributes: true, attributeFilter: [isDialog ? 'open' : 'class'] });
}

const SCRIM_RELEASE_MS = 400; // longer than the dialog's leave transition

const startsOnGrip = event => {
  const target = event.target;
  return Boolean(target?.closest?.(GRIP)) && !target.closest(CONTROLS);
};

export function bindSheetDismiss(card, {
  requestClose,
  isOpen = () => true,
  isPhone = () => false,
  reducedMotion = () => false,
  setOffset = layoutOffset(card),
  setDim = layoutDim(card),
  setTimer = (callback, ms) => setTimeout(callback, ms),
  watchOpen = watchOpening,
  schedule = callback => requestAnimationFrame(callback),
  cancelSchedule = frame => cancelAnimationFrame(frame),
  now = () => performance.now(),
}) {
  if (!card) return { enter() {} };
  const tracker = createVelocityTracker();
  let leaving = false;     // our own dismissal is closing the sheet
  let holdDim = false;     // a dismissed sheet keeps the scrim clear while the dialog fades out
  let dimEpoch = 0;
  const apply = offset => {
    setOffset(offset);
    if (holdDim) return;
    dimEpoch += 1;
    setDim(Math.max(0, Math.min(1, offset / (card.offsetHeight || 1))));
  };
  const spring = createSpringDriver({ setOffset: apply, schedule, cancelSchedule, now });
  let pointer = null;           // { id, startX, startY, base, locked }

  const capture = id => { try { card.setPointerCapture?.(id); } catch { /* the pointer may be gone */ } };
  const uncapture = id => { try { card.releasePointerCapture?.(id); } catch { /* ignore */ } };
  const { show, animateTo, stop: stopAnimation } = spring;

  function leave() {
    leaving = false;
    holdDim = true;
    show(0);
    holdDim = false;
    const mine = dimEpoch;
    setTimer(() => { if (mine === dimEpoch) setDim(0); }, SCRIM_RELEASE_MS);
  }

  function close() {
    leaving = true;
    requestClose();
    if (reducedMotion()) { leave(); return; }
    // Keep the sheet where it is until the close has taken effect; if it has not, bring it back.
    spring.later(() => {
      if (isOpen()) animateTo(0, 0, () => show(0));
      else leave();
    });
  }

  // Opening on a phone: the sheet rises from below on the same spring as everything else.
  function enter() {
    if (!isPhone() || reducedMotion()) return;
    show(card.offsetHeight || 1);
    animateTo(0, 0, () => show(0));
  }
  // Closed by something else (a button, Escape) while still rising: stop the spring so the CSS leave
  // transition continues from the current position instead of the sheet finishing its climb.
  watchOpen(card, opened => {
    if (opened) enter();
    else if (!leaving && spring.animating) { stopAnimation(); show(0); }
  });

  function release(velocity) {
    const height = card.offsetHeight || 1;
    const { dismiss, target } = settleSheet({ offset: spring.x, velocity, height });
    if (!dismiss) {
      reducedMotion() ? show(0) : animateTo(0, velocity, () => show(0));
      return;
    }
    if (reducedMotion()) { show(height); close(); return; }
    animateTo(target, velocity, close);
  }

  card.addEventListener('pointerdown', event => {
    if (pointer || event.pointerType !== 'touch' || !event.isPrimary || !isPhone()) return;
    const grabbing = spring.animating || spring.x !== 0;
    if (!grabbing && !startsOnGrip(event)) return;
    stopAnimation();
    tracker.reset();
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, base: grabbing ? spring.x : 0, locked: grabbing };
    if (grabbing) capture(event.pointerId);
    tracker.add(event.clientY, now());
  });

  card.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (!pointer.locked) {
      if (Math.abs(dx) > LOCK_DISTANCE && Math.abs(dx) * LOCK_RATIO > Math.abs(dy)) { pointer = null; return; }
      if (Math.abs(dy) < LOCK_DISTANCE || Math.abs(dy) < Math.abs(dx) * LOCK_RATIO) return;
      pointer.locked = true;
      capture(event.pointerId);
    }
    tracker.add(event.clientY, now());
    event.preventDefault?.();
    const raw = pointer.base + dy;
    show(raw >= 0 ? raw : -rubberband(-raw, card.offsetHeight || 1));
  });

  const finish = cancelled => event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const { locked } = pointer;
    pointer = null;
    uncapture(event.pointerId);
    if (!locked) return;
    release(cancelled ? 0 : tracker.velocity());
  };
  card.addEventListener('pointerup', finish(false));
  card.addEventListener('pointercancel', finish(true));
  return { enter };
}

/** Adds the visible grabber and marks the title area as part of the drag zone. */
export function addSheetGrip(card, titleSelector = ':scope > h2, :scope > header') {
  if (!card || card.querySelector(':scope > .sheet-handle')) return;
  const handle = card.ownerDocument.createElement('div');
  handle.className = 'sheet-handle sheet-grip';
  handle.setAttribute('aria-hidden', 'true');
  card.prepend(handle);
  card.querySelector(titleSelector)?.classList.add('sheet-grip');
}

// Leave duration of a dialog in ms, from its own transition (0 when it has none, e.g. on desktop or with reduced motion).
function leaveDuration(dialog) {
  const parts = getComputedStyle(dialog).transitionDuration.split(',');
  return Math.max(0, ...parts.map(part => parseFloat(part) * (part.includes('ms') ? 1 : 1000) || 0));
}

/**
 * Removes a dialog that was built for one use after its leave transition has played, so closing it
 * slides it away instead of making it vanish. Without a transition it is removed at once.
 */
export function removeAfterLeave(dialog, {
  duration = () => leaveDuration(dialog),
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = id => clearTimeout(id),
} = {}) {
  if (!dialog?.isConnected) return;
  const ms = duration();
  if (!(ms > 0)) { dialog.remove(); return; }
  let done = false;
  let timer;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimer(timer);
    dialog.removeEventListener('transitionend', onEnd);
    dialog.remove();
  };
  const onEnd = event => { if (event.target === dialog) finish(); };
  dialog.addEventListener('transitionend', onEnd);
  timer = setTimer(finish, ms + 150); // never wait forever if the browser skips the event
}
