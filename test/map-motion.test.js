import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './setup.js';
import { createSpringDriver } from '../ui/motion.js';
import { slideIn } from '../active-map/tab-slide.js';
import { createZoomAnimator } from '../active-map/zoom-spring.js';
import { bindMapGestures } from '../active-map/map-gestures.js';

globalThis.localStorage = new MemoryStorage();
const { store } = await import('../store.js');
const { coverlineGrabOffset, updateCoverlineDrag } = await import('../chart.js');

function clock() {
  const queue = [];
  let time = 0;
  return {
    schedule: callback => { queue.push(callback); return queue.length; },
    cancelSchedule: () => { queue.length = 0; },
    now: () => time,
    advance(ms) {
      const end = time + ms;
      while (time < end) { time += 16; queue.splice(0).forEach(callback => callback()); }
    },
  };
}

test('re-targeting a spring without a velocity keeps the velocity it already has', () => {
  const c = clock();
  const xs = [];
  const driver = createSpringDriver({ setOffset: x => xs.push(x), ...c });
  driver.show(0);
  driver.animateTo(100);
  c.advance(96);
  const before = xs.at(-1) - xs.at(-2);
  driver.animateTo(200);
  c.advance(16);
  const after = xs.at(-1) - xs.at(-2);
  assert.ok(before > 0 && after > 0 && after >= before * 0.8, 'no brick wall: motion continues through the new target');
});

test('switching tabs slides the new panel in from the side it is next to, then rests', () => {
  for (const direction of [1, -1]) {
    const c = clock();
    const offsets = [];
    slideIn({ direction, setOffset: x => offsets.push(x), ...c });
    c.advance(1500);
    assert.equal(Math.sign(offsets[0]), direction);
    assert.ok(Math.abs(offsets[0]) > 0);
    assert.equal(offsets.at(-1), 0);
  }
});

test('a second tab switch takes over the slide instead of stacking two', () => {
  const c = clock();
  const first = [];
  const second = [];
  slideIn({ direction: 1, setOffset: x => first.push(x), ...c });
  c.advance(48);
  const stoppedAt = first.length;
  slideIn({ direction: -1, setOffset: x => second.push(x), ...c });
  c.advance(1500);
  assert.equal(first.length, stoppedAt + 1, 'the first slide is cleared once and not driven again');
  assert.equal(first.at(-1), 0);
  assert.equal(second.at(-1), 0);
});

test('reduced motion shows the panel at once', () => {
  const offsets = [];
  slideIn({ direction: 1, reducedMotion: () => true, setOffset: x => offsets.push(x) });
  assert.deepEqual(offsets, []);
});

test('zoom buttons spring to the target and repeated taps build on the live motion', () => {
  const c = clock();
  let width = 40;
  const animator = createZoomAnimator({
    getWidth: () => width, applyWidth: value => { width = value; },
    clamp: value => Math.max(20, Math.min(90, value)),
    step: (direction, from) => from * (direction > 0 ? 1.35 : 1 / 1.35),
    ...c,
  });
  animator.by(1);
  c.advance(48);
  const mid = width;
  assert.ok(mid > 40 && mid < 54);
  animator.by(1);
  c.advance(2000);
  assert.ok(Math.abs(width - 40 * 1.35 * 1.35) < 0.6, 'the second tap compounds on the first target');
  animator.by(1); animator.by(1); animator.by(1);
  c.advance(2000);
  assert.equal(Math.round(width), 90, 'never past the limit');
});

test('cancelling the zoom stops it where it is, and reduced motion applies it at once', () => {
  const c = clock();
  let width = 40;
  const animator = createZoomAnimator({ getWidth: () => width, applyWidth: v => { width = v; }, clamp: v => v, step: (d, w) => w + 20 * d, ...c });
  animator.by(1);
  c.advance(48);
  const stopped = width;
  animator.cancel();
  c.advance(1000);
  assert.equal(width, stopped);
  const instant = createZoomAnimator({ getWidth: () => width, applyWidth: v => { width = v; }, clamp: v => v, step: (d, w) => w + 5, reducedMotion: () => true });
  instant.by(1);
  assert.equal(width, stopped + 5);
});

function pinchHarness() {
  const handlers = {};
  const element = {
    scrollLeft: 0, scrollTop: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  const c = clock();
  const widths = [];
  let width = 50;
  const previous = { raf: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame };
  globalThis.requestAnimationFrame = c.schedule;
  globalThis.cancelAnimationFrame = c.cancelSchedule;
  bindMapGestures(element, {
    getWidth: () => width, getHeight: () => 0, fixedWidth: () => 48,
    clampWidth: value => Math.max(20, Math.min(90, value)),
    setWidth: value => { width = value; widths.push(value); },
    now: c.now,
  });
  const touch = x => ({ clientX: x, clientY: 100 });
  const ev = touches => ({ touches, preventDefault() {} });
  return {
    widths, c, restore: () => { globalThis.requestAnimationFrame = previous.raf; globalThis.cancelAnimationFrame = previous.cancel; },
    pinch(from, to) { handlers.touchstart(ev([touch(100), touch(100 + from)])); handlers.touchmove(ev([touch(100), touch(100 + to)])); c.advance(32); },
    release() { handlers.touchend(ev([])); },
  };
}

test('pinching past the zoom limit stretches with resistance, then springs back to the limit', () => {
  const h = pinchHarness();
  try {
    h.pinch(100, 400); // raw width 200, limit 90
    const stretched = h.widths.at(-1);
    assert.ok(stretched > 90 && stretched < 120, `resists past the limit (${stretched})`);
    h.release();
    h.c.advance(2000);
    assert.equal(h.widths.at(-1), 90, 'ends exactly on the limit');
    assert.ok(h.widths.every(w => w <= stretched + 1e-9 && w >= 20));
  } finally { h.restore(); }
});

test('pinching below the minimum also stretches softly and returns', () => {
  const h = pinchHarness();
  try {
    h.pinch(200, 20); // raw width 5, limit 20
    const stretched = h.widths.at(-1);
    assert.ok(stretched < 20 && stretched > 12, `soft floor (${stretched})`);
    h.release();
    h.c.advance(2000);
    assert.equal(h.widths.at(-1), 20);
  } finally { h.restore(); }
});

test('a coverline keeps the offset from where it was grabbed instead of jumping under the finger', () => {
  store.reset(); store.createMap('Grab');
  store.coverlines.default = { horizontalTemp: 36.5 };
  const columns = [];
  const grabY = 200;
  const grab = coverlineGrabOffset('horizontal', 10, grabY, columns);
  assert.equal(grab.dx, 0);
  assert.notEqual(grab.dy, 0, 'the touch is not exactly on the line');
  updateCoverlineDrag('horizontal', 10, grabY, columns);
  const probe = store.coverlines.default.horizontalTemp;
  store.coverlines.default = { horizontalTemp: 36.5 };
  updateCoverlineDrag('horizontal', 10 - grab.dx, grabY - grab.dy, columns);
  assert.equal(store.coverlines.default.horizontalTemp, 36.5, 'a drag that has not moved leaves the line where it was');
  assert.ok(probe !== 36.5, 'without the offset the line would have jumped');
});
