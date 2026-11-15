import test from 'node:test';
import assert from 'node:assert/strict';
import { showMessage, hideMessage, showActionMessage } from '../ui/toast.js';

test('dismissing a message cancels its pending frame and needs no transition event', () => {
  const classes = new Set(['hidden']);
  const frames = new Map();
  let nextFrame = 0;
  const toast = {
    textContent: '',
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
    },
  };
  const saved = { document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame };
  globalThis.document = { getElementById: () => toast };
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  try {
    showMessage('Saved', null);
    hideMessage();
    flush();
    assert.ok(classes.has('hidden'));
    assert.ok(!classes.has('show'));

    showMessage('Coverline hint', null);
    flush();
    classes.add('persistent-toast');
    classes.add('action-toast');
    showMessage('', 0);
    flush();
    assert.ok(classes.has('hidden'));
    assert.ok(!classes.has('show'));
    assert.ok(!classes.has('persistent-toast'));
    assert.ok(!classes.has('action-toast'));

    showMessage('Saved again', null);
    flush();
    assert.ok(classes.has('show'));
    assert.ok(!classes.has('hidden'));
    assert.equal(toast.textContent, 'Saved again');
  } finally {
    hideMessage();
    Object.assign(globalThis, saved);
  }
});

function fakePage() {
  const classes = new Set(['hidden']);
  const frames = new Map();
  let nextFrame = 0;
  const timers = [];
  const element = tag => ({ tag, children: [], attributes: {}, listeners: {}, className: '', textContent: '', type: '',
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(type, handler) { this.listeners[type] = handler; } });
  const toast = { ...element('div'), textContent: '',
    classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) },
    replaceChildren(...nodes) { this.children = nodes; } };
  const saved = { document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  globalThis.document = { getElementById: () => toast, createElement: element };
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.setTimeout = (callback, ms) => { timers.push({ callback, ms }); return timers.length; };
  globalThis.clearTimeout = () => {};
  return { toast, classes, timers, flush: () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    restore: () => { hideMessage(); Object.assign(globalThis, saved); } };
}

test('a message with an action shows the text and one button that runs the action once and closes the message', () => {
  const page = fakePage();
  try {
    let runs = 0;
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => { runs += 1; } });
    page.flush();
    assert.ok(page.classes.has('show') && page.classes.has('action-toast') && !page.classes.has('hidden'));
    const [message, button] = page.toast.children;
    assert.equal(message.textContent, 'Map deleted');
    assert.equal(button.textContent, 'Undo');
    assert.equal(button.type, 'button');
    button.listeners.click();
    assert.equal(runs, 1);
    assert.ok(page.classes.has('hidden'), 'the message closes after the action');
  } finally { page.restore(); }
});

test('an action message stays long enough to react to, then disappears by itself', () => {
  const page = fakePage();
  try {
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => {} });
    const hide = page.timers.at(-1);
    assert.ok(hide.ms >= 8000, 'at least eight seconds to change your mind');
    hide.callback();
    assert.ok(page.classes.has('hidden'));
  } finally { page.restore(); }
});

test('a plain message after an action message replaces the button', () => {
  const page = fakePage();
  try {
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => {} });
    showMessage('Map copied ✓');
    assert.ok(!page.classes.has('action-toast'));
    assert.equal(page.toast.textContent, 'Map copied ✓');
  } finally { page.restore(); }
});

test('an action message drops the translation key of the previous message, or translating the page again would wipe its button', () => {
  const page = fakePage();
  try {
    showMessage('Map restored ✓');
    assert.equal(page.toast.attributes['data-i18n'], 'Map restored ✓', 'a plain message is re-translated as a whole');
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => {} });
    assert.equal(page.toast.attributes['data-i18n'], undefined, 'the container no longer carries a key that would overwrite its children');
    const [message, button] = page.toast.children;
    assert.equal(message.attributes['data-i18n'], 'Map deleted', 'the text keeps its own key');
    assert.equal(button.attributes['data-i18n'], 'Undo', 'the button keeps its own key');
  } finally { page.restore(); }
});

test('the single-button layout class goes away when another message replaces or closes it', () => {
  const page = fakePage();
  try {
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => {} });
    assert.ok(page.classes.has('toast-inline'), 'a message with one button uses the single-row layout');
    showMessage('Map copied ✓');
    assert.ok(!page.classes.has('toast-inline'));
    showActionMessage('Map deleted', { label: 'Undo', onAction: () => {} });
    hideMessage();
    assert.ok(!page.classes.has('toast-inline'));
  } finally { page.restore(); }
});
