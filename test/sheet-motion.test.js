import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindSheetDismiss } from '../ui/sheet.js';
import { applyLayoutClass } from '../ui/layout-classes.js';
import { modalOrigin } from '../ui/modal-origin.js';

function harness({ phone = true, reducedMotion = false, height = 400 } = {}) {
  const handlers = {};
  const grip = { closest: selector => (selector === '.sheet-grip' ? grip : null) };
  const content = { closest: () => null };
  const card = {
    offsetHeight: height,
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  const offsets = [];
  const dims = [];
  const timers = [];
  let open = true;
  let watcher = null;
  let time = 0;
  let queue = [];
  const sheet = bindSheetDismiss(card, {
    requestClose: () => { open = false; },
    isOpen: () => open,
    isPhone: () => phone,
    reducedMotion: () => reducedMotion,
    setOffset: value => offsets.push(value),
    setDim: value => dims.push(value),
    setTimer: (callback, ms) => { timers.push({ callback, ms }); return timers.length; },
    watchOpen: (_card, onChange) => { watcher = onChange; },
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
  return { sheet, watcher: opened => watcher(opened), offsets, dims, timers, fire, advance, content, grip, setTime: v => { time = v; } };
}

test('on a phone the sheet rises from below on a spring that ends exactly in place', () => {
  const { sheet, offsets, advance } = harness();
  sheet.enter();
  advance(1500);
  assert.equal(offsets[0], 400, 'starts fully below the screen');
  assert.ok(offsets.every((x, i) => i === 0 || x <= offsets[i - 1] + 1e-9), 'moves up monotonically, no overshoot');
  assert.equal(offsets.at(-1), 0);
});

test('wide layouts and reduced motion keep the plain CSS fade', () => {
  for (const options of [{ phone: false }, { reducedMotion: true }]) {
    const { sheet, offsets } = harness(options);
    sheet.enter();
    assert.deepEqual(offsets, []);
  }
});

test('a sheet that is still rising can be grabbed anywhere, like a moving object', () => {
  const { sheet, offsets, fire, advance, content, setTime } = harness();
  sheet.enter();
  advance(64);
  const grabbedAt = offsets.at(-1);
  assert.ok(grabbedAt > 0 && grabbedAt < 400);
  fire('pointerdown', { clientY: 300, target: content });
  setTime(1e5);
  fire('pointermove', { clientY: 330, target: content });
  assert.ok(Math.abs(offsets.at(-1) - (grabbedAt + 30)) < 1e-6, 'follows the finger from where the sheet was');
});

test('the scrim fades with the sheet: dimmer the lower it is, gone at rest', () => {
  const { sheet, dims, offsets, advance } = harness();
  sheet.enter();
  advance(1500);
  assert.equal(dims[0], 1, 'fully dim-free scrim (hidden) while the sheet is off screen');
  assert.ok(dims.every((x, i) => i === 0 || x <= dims[i - 1] + 1e-9));
  assert.equal(dims.at(-1), 0);
  assert.ok(offsets.length >= dims.length);
});

test('a dismissed sheet keeps its scrim clear until the dialog has left, then releases it', () => {
  const { dims, timers, fire, advance, grip } = harness();
  fire('pointerdown', { clientY: 100, target: grip });
  for (let i = 1; i <= 6; i += 1) { advance(30); fire('pointermove', { clientY: 100 + i * 50, target: grip }); }
  fire('pointerup', { clientY: 400 });
  advance(1500);
  assert.equal(dims.at(-1), 1, 'scrim stays clear while the dismissed sheet fades out');
  assert.equal(timers.length, 1);
  timers[0].callback();
  assert.equal(dims.at(-1), 0);
});

test('closing while the sheet is still rising lets it leave from where it is', () => {
  const { sheet, watcher, offsets, advance } = harness();
  sheet.enter();
  advance(64);
  assert.ok(offsets.at(-1) > 0);
  watcher(false);
  assert.equal(offsets.at(-1), 0, 'the entry spring is released so the leave transition takes over');
  advance(1500);
  assert.equal(offsets.at(-1), 0);
  assert.ok(offsets.slice(-1)[0] === 0);
});

test('layout classes accept unitless values for ratios', () => {
  const rules = [];
  const element = {
    ownerDocument: { createElement: () => ({ dataset: {}, sheet: { cssRules: rules, insertRule: text => rules.push(text), deleteRule: i => rules.splice(i, 1) } }), head: { append() {} } },
    classList: { contains: () => false, add() {} },
  };
  applyLayoutClass(element, 'ratio-test', { '--sheet-dim': '0.25' });
  assert.match(rules.at(-1), /--sheet-dim: 0\.25;/);
  assert.doesNotMatch(rules.at(-1), /0\.25px/);
});

test('a desktop dialog grows from the control that opened it', () => {
  const origin = modalOrigin({ trigger: { left: 100, top: 300, width: 40, height: 40 }, card: { left: 200, top: 100 } });
  assert.deepEqual(origin, { x: -80, y: 220 });
  assert.equal(modalOrigin({ trigger: null, card: { left: 0, top: 0 } }), null, 'no trigger: grow from the centre as before');
});

test('the scrim follows the drag in CSS for both kinds of sheet', () => {
  const css = readFileSync(new URL('../styles/components.css', import.meta.url), 'utf8');
  assert.match(css, /dialog\.sheet-dialog\.sheet-dimming\[open\]::backdrop/);
  assert.match(css, /\.modal\.sheet-dimming/);
});
