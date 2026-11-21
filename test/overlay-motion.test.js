import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { changeScreen, screenDirection } from '../ui/screen-transition.js';
import { bindToastSwipe } from '../ui/toast-swipe.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = readdirSync(new URL('../styles/', import.meta.url)).filter(n => n.endsWith('.css'))
  .map(n => read(`../styles/${n}`)).join('\n');

test('screens are ordered like the tabs, so moving right is forward and left is back', () => {
  assert.equal(screenDirection('menu', 'active-map'), 1);
  assert.equal(screenDirection('active-map', 'my-maps'), 1);
  assert.equal(screenDirection('my-maps', 'menu'), -1);
  assert.equal(screenDirection('my-profile', 'active-map'), -1);
  assert.equal(screenDirection('menu', 'menu'), 0);
});

test('a screen change marks its direction for the transition and clears it afterwards', async () => {
  const classes = new Set();
  let finish;
  const doc = {
    documentElement: { classList: { add: n => classes.add(n), remove: (...n) => n.forEach(x => classes.delete(x)) } },
    startViewTransition(update) {
      const done = Promise.resolve().then(update);
      return { updateCallbackDone: done, ready: Promise.resolve(), finished: new Promise(r => { finish = r; }) };
    },
  };
  changeScreen({ from: 'my-maps', to: 'menu', update: () => {}, doc });
  assert.ok(classes.has('screen-back'));
  assert.ok(!classes.has('screen-forward'));
  finish();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(classes.size, 0);
});

test('the view transition slides in the direction of travel and leaves the tab bar still', () => {
  assert.match(css, /html\.screen-forward::view-transition-new\(root\)/);
  assert.match(css, /html\.screen-back::view-transition-new\(root\)/);
  assert.match(css, /view-transition-name:\s*app-nav/);
});

function toastHarness() {
  const handlers = {};
  const toast = { closest: selector => (selector.startsWith('button') ? null : toast), setPointerCapture() {}, releasePointerCapture() {} };
  const button = { closest: selector => (selector.startsWith('button') ? button : toast) };
  const host = { addEventListener: (type, handler) => { (handlers[type] ||= []).push(handler); } };
  const offsets = [];
  const log = [];
  let time = 0;
  let queue = [];
  bindToastSwipe(host, {
    findToast: event => event.target.closest('.toast'),
    onDismiss: () => log.push('dismiss'),
    onHold: () => log.push('hold'),
    onRelease: () => log.push('release'),
    setOffset: x => offsets.push(x),
    schedule: cb => { queue.push(cb); return queue.length; },
    cancelSchedule: () => { queue = []; },
    now: () => time,
  });
  const fire = (type, event = {}) => (handlers[type] || []).forEach(h => h({ pointerId: 1, clientX: 0, clientY: 0, target: toast, preventDefault() {}, ...event }));
  const advance = ms => { const end = time + ms; while (time < end) { time += 16; const q = queue; queue = []; q.forEach(cb => cb()); } };
  const drag = (distance, { stepMs = 16 } = {}) => {
    fire('pointerdown', { clientY: 100 });
    for (let i = 1; i <= 6; i += 1) { time += stepMs; fire('pointermove', { clientY: 100 + distance * i / 6 }); }
  };
  return { fire, drag, advance, offsets, log, button };
}

test('touching a message holds its timer; letting go without dragging resumes it', () => {
  const t = toastHarness();
  t.fire('pointerdown', { clientY: 100 });
  t.fire('pointerup', { clientY: 100 });
  assert.deepEqual(t.log, ['hold', 'release']);
});

test('a message follows the finger down and is dismissed by a pull or a flick', () => {
  const pull = toastHarness();
  pull.drag(60, { stepMs: 40 });
  assert.equal(pull.offsets.at(-1), 60, 'one to one');
  pull.fire('pointerup');
  pull.advance(1500);
  assert.deepEqual(pull.log, ['hold', 'dismiss']);

  const flick = toastHarness();
  flick.drag(20, { stepMs: 8 });
  flick.fire('pointerup');
  flick.advance(1500);
  assert.ok(flick.log.includes('dismiss'), 'a quick short flick also dismisses');
});

test('a small slow pull springs back and resumes the timer', () => {
  const t = toastHarness();
  t.drag(10, { stepMs: 80 });
  t.fire('pointerup');
  t.advance(1500);
  assert.equal(t.offsets.at(-1), 0);
  assert.deepEqual(t.log, ['hold', 'release']);
});

test('pressing a button inside a message neither drags nor holds the message', () => {
  const t = toastHarness();
  t.fire('pointerdown', { target: t.button, clientY: 100 });
  t.fire('pointermove', { target: t.button, clientY: 200 });
  assert.deepEqual(t.offsets, []);
  assert.deepEqual(t.log, []);
});

test('the export menu and language picker grow from their button', () => {
  assert.match(css, /\.map-export-popover[^{]*\{[^}]*transform-origin:\s*var\(--menu-origin-x/);
  assert.match(css, /@starting-style\s*\{[^}]*\.map-export-popover:popover-open/);
  assert.match(css, /\.language-picker\[open\]\s+\.language-picker-menu[^{]*\{[^}]*opacity:\s*0/);
  assert.match(read('../ui/export-menu.js'), /is-leaving/);
});

test('the time picker settles when scrolling ends, with the timer only as a fallback', () => {
  const source = read('../ui/time-picker.js');
  assert.match(source, /addEventListener\(["']scrollend["']/);
  assert.match(source, /["']onscrollend["'] in/);
});
