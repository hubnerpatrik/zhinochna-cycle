import test from 'node:test';
import assert from 'node:assert/strict';
import { rubberband } from '../ui/motion.js';
import { bindSheetDismiss, removeAfterLeave, settleSheet } from '../ui/sheet.js';

test('rubber-banding resists more the further past the edge, and never exceeds the content size', () => {
  assert.equal(rubberband(0, 400), 0);
  const small = rubberband(40, 400);
  const large = rubberband(200, 400);
  assert.ok(small > 0 && small < 40, 'resists even a short pull');
  assert.ok(large < 200 * 0.55, 'resistance grows with distance');
  assert.ok(rubberband(10000, 400) < 400, 'approaches but never reaches the dimension');
});

test('a sheet closes when its projected resting place is below the middle', () => {
  const height = 400;
  assert.deepEqual(settleSheet({ offset: 60, velocity: 0, height }), { dismiss: false, target: 0 });
  assert.deepEqual(settleSheet({ offset: 260, velocity: 0, height }), { dismiss: true, target: height });
  assert.equal(settleSheet({ offset: 40, velocity: 1500, height }).dismiss, true, 'a quick flick down closes from a short pull');
  assert.equal(settleSheet({ offset: 260, velocity: -900, height }).dismiss, false, 'a flick back up keeps it open');
  assert.equal(settleSheet({ offset: -30, velocity: 0, height }).dismiss, false, 'pulling up never closes');
});

// A fake sheet card with a manual clock and frame queue.
function harness({ phone = true, reducedMotion = false, height = 400, closes = true } = {}) {
  const handlers = {};
  const grip = { closest: selector => (selector === '.sheet-grip' ? grip : null) };
  const body = { closest: () => null };
  const control = { closest: selector => (selector === '.sheet-grip' ? grip : selector.startsWith('button') ? control : null) };
  const card = {
    offsetHeight: height,
    captured: null,
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    setPointerCapture(id) { this.captured = id; },
    releasePointerCapture() { this.captured = null; },
  };
  const offsets = [];
  let open = true;
  let closeCalls = 0;
  let time = 0;
  let queue = [];
  bindSheetDismiss(card, {
    requestClose: () => { closeCalls += 1; if (closes) open = false; },
    isOpen: () => open,
    isPhone: () => phone,
    reducedMotion: () => reducedMotion,
    setOffset: value => offsets.push(value),
    schedule: callback => { queue.push(callback); return queue.length; },
    cancelSchedule: () => { queue = []; },
    now: () => time,
  });
  const fire = (type, event = {}) => {
    const full = { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 100, clientY: 0, target: grip, preventDefault() {}, ...event };
    (handlers[type] || []).forEach(handler => handler(full));
  };
  const advance = ms => {
    const end = time + ms;
    while (time < end) {
      time += 16;
      const frame = queue; queue = [];
      frame.forEach(callback => callback());
    }
  };
  const drag = (distance, { steps = 6, stepMs = 16, target = grip, x = 0 } = {}) => {
    fire('pointerdown', { clientY: 100, target });
    for (let step = 1; step <= steps; step += 1) {
      time += stepMs;
      fire('pointermove', { clientY: 100 + (distance * step) / steps, clientX: 100 + (x * step) / steps, target });
    }
  };
  return { card, offsets, fire, drag, advance, release: () => fire('pointerup', { clientY: 0 }), state: () => ({ open, closeCalls }), body, control, grip };
}

test('the sheet follows the finger down one to one from its grip', () => {
  const { offsets, drag, card } = harness();
  drag(120);
  assert.equal(offsets.at(-1), 120);
  assert.ok(offsets.length >= 3, 'feedback is continuous');
  assert.equal(card.captured, 1);
});

test('pulling up stretches the sheet with resistance', () => {
  const { offsets, drag } = harness();
  drag(-100);
  assert.ok(offsets.at(-1) < 0 && offsets.at(-1) > -100 * 0.55, 'moves less than the finger');
});

test('only a drag that starts on the grip moves the sheet', () => {
  const content = harness();
  content.drag(120, { target: content.body });
  assert.deepEqual(content.offsets, [], 'content keeps its normal scrolling');
  const control = harness();
  control.drag(120, { target: control.control });
  assert.deepEqual(control.offsets, [], 'a button in the grip area is still just a button');
});

test('sideways drags, mouse pointers and wide layouts leave the sheet alone', () => {
  const sideways = harness();
  sideways.drag(8, { x: 60 });
  assert.deepEqual(sideways.offsets, []);
  const mouse = harness();
  mouse.fire('pointerdown', { pointerType: 'mouse', clientY: 100 });
  mouse.fire('pointermove', { pointerType: 'mouse', clientY: 200 });
  assert.deepEqual(mouse.offsets, []);
  const wide = harness({ phone: false });
  wide.drag(150);
  assert.deepEqual(wide.offsets, []);
});

test('a long pull slides the sheet off the screen, closes it once, and resets', () => {
  const { offsets, drag, release, advance, state } = harness();
  drag(300, { stepMs: 30 });
  release();
  assert.equal(state().closeCalls, 0, 'it is not closed while still sliding away');
  advance(1500);
  assert.equal(state().closeCalls, 1);
  assert.ok(Math.max(...offsets) >= 400, 'it left the bottom of the screen first');
  assert.equal(offsets.at(-1), 0, 'the offset is cleared after closing');
});

test('a short slow pull springs back and stays open', () => {
  const { offsets, drag, release, advance, state } = harness();
  drag(50, { stepMs: 60 });
  release();
  advance(1500);
  assert.equal(state().closeCalls, 0);
  assert.equal(offsets.at(-1), 0);
});

test('if the close did not take effect, the sheet returns instead of staying off screen', () => {
  const { offsets, drag, release, advance, state } = harness({ closes: false });
  drag(300, { stepMs: 30 });
  release();
  advance(2500);
  assert.equal(state().closeCalls, 1);
  assert.equal(offsets.at(-1), 0, 'back in place');
});

test('grabbing the sheet mid-slide takes it over where it is', () => {
  const { offsets, fire, drag, release, advance, state } = harness();
  drag(300, { stepMs: 30 });
  release();
  advance(80);
  const grabbedAt = offsets.at(-1);
  assert.ok(grabbedAt > 300 && grabbedAt < 400, 'mid-flight');
  fire('pointerdown', { clientY: 50 });
  fire('pointermove', { clientY: 20 });
  assert.ok(Math.abs(offsets.at(-1) - (grabbedAt - 30)) < 0.01, 'continues from the live position');
  advance(2000);
  assert.equal(state().closeCalls, 0, 'the interrupted slide never closes it');
});

test('reduced motion closes the sheet at once, without sliding', () => {
  const { offsets, drag, release, state } = harness({ reducedMotion: true });
  drag(300, { stepMs: 30 });
  release();
  assert.equal(state().closeCalls, 1);
  assert.equal(offsets.at(-1), 0);
});

// A dialog that is removed from the page when it closes must stay until its leave transition has played.
function leavingDialog() {
  const listeners = {};
  let removed = 0;
  const dialog = {
    isConnected: true,
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    removeEventListener(type, handler) { listeners[type] = (listeners[type] || []).filter(item => item !== handler); },
    remove() { removed += 1; this.isConnected = false; },
  };
  const timers = [];
  const options = duration => ({ duration: () => duration, setTimer: (callback, ms) => { timers.push({ callback, ms }); return timers.length; }, clearTimer: () => {} });
  return { dialog, listeners, timers, options, removed: () => removed };
}

test('a dialog without a leave transition is removed immediately', () => {
  const { dialog, options, removed } = leavingDialog();
  removeAfterLeave(dialog, options(0));
  assert.equal(removed(), 1);
});

test('a dialog with a leave transition stays until the transition ends', () => {
  const { dialog, listeners, options, removed } = leavingDialog();
  removeAfterLeave(dialog, options(300));
  assert.equal(removed(), 0, 'still there while it slides away');
  listeners.transitionend[0]({ target: dialog });
  assert.equal(removed(), 1);
});

test('the leave never waits forever if no transition event arrives, and removal happens only once', () => {
  const { dialog, listeners, timers, options, removed } = leavingDialog();
  removeAfterLeave(dialog, options(300));
  assert.ok(timers[0].ms >= 300 && timers[0].ms <= 600, 'a fallback timer slightly longer than the transition');
  timers[0].callback();
  assert.equal(removed(), 1);
  listeners.transitionend?.[0]?.({ target: dialog });
  assert.equal(removed(), 1, 'a late event does not remove it twice');
});

test('transition events bubbling up from the dialog content do not remove it early', () => {
  const { dialog, listeners, options, removed } = leavingDialog();
  removeAfterLeave(dialog, options(300));
  listeners.transitionend[0]({ target: { tagName: 'BUTTON' } });
  assert.equal(removed(), 0);
});
