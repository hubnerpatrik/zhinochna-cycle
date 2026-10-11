import test from 'node:test';
import assert from 'node:assert/strict';
import { showMessage, hideMessage } from '../ui/toast.js';

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
