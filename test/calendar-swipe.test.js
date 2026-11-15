import test from 'node:test';
import assert from 'node:assert/strict';
import { bindCalendarSwipe, createVelocityTracker, project, settle, springStep } from '../active-map/calendar-swipe.js';

test('momentum projection follows the exponential deceleration Apple ships', () => {
  assert.equal(project(0), 0);
  assert.ok(Math.abs(project(1000) - 499) < 0.5, 'a 1000 px/s flick travels about 499 px');
  assert.equal(project(-600), -project(600));
});

test('release decides the month from where the drag is heading, not where it stopped', () => {
  const width = 320;
  assert.deepEqual(settle({ offset: -40, velocity: 0, width }), { direction: 0, target: 0 }, 'a short slow drag springs back');
  assert.deepEqual(settle({ offset: -170, velocity: 0, width }), { direction: 1, target: -width }, 'past half commits to the next month');
  assert.deepEqual(settle({ offset: 170, velocity: 0, width }), { direction: -1, target: width }, 'dragging right goes to the previous month');
  assert.equal(settle({ offset: -30, velocity: -900, width }).direction, 1, 'a quick flick commits from a short drag');
  assert.equal(settle({ offset: -170, velocity: 400, width }).direction, 0, 'a flick back cancels a long drag');
  assert.equal(settle({ offset: -170, velocity: 900, width }).direction, -1, 'a hard flick back goes to the other month');
});

test('the spring settles without overshoot and carries the release velocity', () => {
  const run = (from, velocity) => {
    let state = { x: from, v: velocity };
    let min = from;
    for (let frame = 0; frame < 120; frame += 1) {
      state = springStep(state, 0, 1 / 60);
      min = Math.min(min, state.x);
    }
    return { state, min };
  };
  const calm = run(100, 0);
  assert.ok(Math.abs(calm.state.x) < 0.5, 'reaches the target within two seconds');
  assert.ok(calm.min > -0.5, 'critically damped: no bounce past the target');
  const first = springStep({ x: 100, v: 0 }, 0, 1 / 60).x;
  const thrown = springStep({ x: 100, v: -2000 }, 0, 1 / 60).x;
  assert.ok(thrown < first, 'a release velocity toward the target moves it further in the first frame');
});

test('velocity comes from the last moments of the drag only', () => {
  const tracker = createVelocityTracker();
  tracker.add(0, 0);
  tracker.add(10, 100);
  tracker.add(100, 200);
  tracker.add(200, 300);
  assert.ok(Math.abs(tracker.velocity() - 1000) < 1, 'slow samples older than 100 ms are ignored');
  assert.equal(createVelocityTracker().velocity(), 0);
});

// A fake calendar element plus a manual clock and frame queue.
function harness({ phone = true, reducedMotion = false, width = 320 } = {}) {
  const handlers = {};
  const element = {
    clientWidth: width,
    captured: null,
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    setPointerCapture(id) { this.captured = id; },
    releasePointerCapture() { this.captured = null; },
  };
  const offsets = [];
  const months = [];
  let time = 0;
  let queue = [];
  bindCalendarSwipe(element, {
    changeMonth: offset => months.push(offset),
    isPhone: () => phone,
    reducedMotion: () => reducedMotion,
    setOffset: value => offsets.push(value),
    schedule: callback => { queue.push(callback); return queue.length; },
    cancelSchedule: () => { queue = []; },
    now: () => time,
  });
  const fire = (type, event = {}) => {
    const full = { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...event };
    (handlers[type] || []).forEach(handler => handler(full));
    return full;
  };
  const advance = ms => {
    const end = time + ms;
    while (time < end) {
      time += 16;
      const frame = queue; queue = [];
      frame.forEach(callback => callback());
    }
  };
  const drag = (distance, { steps = 6, stepMs = 16, y = 0 } = {}) => {
    fire('pointerdown', { clientX: 200, clientY: 100 });
    for (let step = 1; step <= steps; step += 1) {
      time += stepMs;
      fire('pointermove', { clientX: 200 + (distance * step) / steps, clientY: 100 + (y * step) / steps });
    }
  };
  return { element, offsets, months, fire, advance, drag, release: () => fire('pointerup', { clientX: 0 }) };
}

test('the grid follows the finger one to one once the drag is clearly horizontal', () => {
  const { offsets, drag, element } = harness();
  drag(-120);
  assert.equal(offsets.at(-1), -120, 'offset equals the finger travel');
  assert.ok(offsets.length >= 3, 'feedback is continuous, not only at the end');
  assert.equal(element.captured, 1, 'the pointer is captured once the drag is locked');
});

test('a vertical or tiny movement never starts a swipe', () => {
  const vertical = harness();
  vertical.drag(8, { y: 60 });
  assert.deepEqual(vertical.offsets, []);
  const tiny = harness();
  tiny.drag(6);
  assert.deepEqual(tiny.offsets, []);
  assert.equal(tiny.element.captured, null);
});

test('mouse pointers and wide layouts are left alone', () => {
  const mouse = harness();
  mouse.fire('pointerdown', { pointerType: 'mouse', clientX: 200 });
  mouse.fire('pointermove', { pointerType: 'mouse', clientX: 40 });
  assert.deepEqual(mouse.offsets, []);
  const wide = harness({ phone: false });
  wide.drag(-150);
  assert.deepEqual(wide.offsets, []);
});

test('a long drag slides the month out, switches it, and brings the next one in from the other side', () => {
  const { offsets, months, drag, release, advance } = harness();
  drag(-200, { stepMs: 40 });
  release();
  assert.deepEqual(months, [], 'the month does not change while the old one is still leaving');
  advance(1500);
  assert.deepEqual(months, [1], 'dragging left shows the next month');
  const switchedAt = offsets.findIndex(value => value === 320);
  assert.ok(switchedAt > 0, 'the new month enters from the right edge');
  assert.ok(offsets.slice(0, switchedAt).some(value => value <= -300), 'the old month left the screen first');
  assert.equal(offsets.at(-1), 0, 'everything ends at rest');
});

test('dragging right goes to the previous month', () => {
  const { months, drag, release, advance } = harness();
  drag(200, { stepMs: 40 });
  release();
  advance(1500);
  assert.deepEqual(months, [-1]);
});

test('a short slow drag springs back without changing the month', () => {
  const { offsets, months, drag, release, advance } = harness();
  drag(-50, { stepMs: 60 });
  release();
  advance(1500);
  assert.deepEqual(months, []);
  assert.equal(offsets.at(-1), 0);
});

test('touching the calendar during the animation grabs it where it is', () => {
  const { offsets, months, fire, drag, release, advance } = harness();
  drag(-200, { stepMs: 40 });
  release();
  advance(100);
  const grabbedAt = offsets.at(-1);
  assert.ok(grabbedAt < -200 && grabbedAt > -320, 'mid-flight');
  fire('pointerdown', { clientX: 150, clientY: 100 });
  fire('pointermove', { clientX: 190, clientY: 100 });
  assert.ok(Math.abs(offsets.at(-1) - (grabbedAt + 40)) < 0.01, 'the grab continues from the live position');
  advance(1500);
  assert.deepEqual(months, [], 'the interrupted exit never switches the month');
});

test('reduced motion switches the month at once, without sliding', () => {
  const { offsets, months, drag, release } = harness({ reducedMotion: true });
  drag(-200, { stepMs: 40 });
  release();
  assert.deepEqual(months, [1]);
  assert.equal(offsets.at(-1), 0);
});

test('the tap that ends a drag does not select a day', () => {
  const { fire, drag, release } = harness();
  drag(-100);
  release();
  let prevented = false;
  fire('click', { preventDefault() { prevented = true; }, stopPropagation() {}, stopImmediatePropagation() { prevented = true; } });
  assert.ok(prevented, 'the click after a swipe is swallowed');
  prevented = false;
  fire('pointerdown', { clientX: 100, clientY: 100 });
  fire('pointerup', { clientX: 100 });
  fire('click', { preventDefault() { prevented = true; }, stopPropagation() {}, stopImmediatePropagation() { prevented = true; } });
  assert.equal(prevented, false, 'a plain tap still reaches the day');
});
