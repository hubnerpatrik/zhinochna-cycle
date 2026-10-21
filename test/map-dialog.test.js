import test from 'node:test';
import assert from 'node:assert/strict';
import { openMapDialog } from '../ui/map-dialog.js';

test('leaving the map page dismisses the rename dialog without submitting and removes listeners', () => {
  const routeListeners = new Map(), dialogListeners = new Map();
  let focused = false, submits = 0;
  const controls = { '[data-cancel]': {}, form: {} };
  const dialog = {
    open: false, isConnected: false,
    setAttribute() {}, querySelector: selector => controls[selector], querySelectorAll: () => [],
    addEventListener: (event, handler) => dialogListeners.set(event, handler),
    showModal() { this.open = true; },
    close() { this.open = false; dialogListeners.get('close')(); },
    remove() { this.isConnected = false; },
  };
  globalThis.window = {
    addEventListener: (event, handler) => routeListeners.set(event, handler),
    removeEventListener: event => routeListeners.delete(event),
  };
  globalThis.document = {
    activeElement: { isConnected: true, focus() { focused = true; } },
    createElement: () => dialog, body: { append(node) { node.isConnected = true; } },
  };
  openMapDialog({ title: 'Edit map name', submitLabel: 'Save changes', body: '', onSubmit() { submits++; }, closeOnNavigation: true });
  assert.equal(dialog.open, true);
  routeListeners.get('popstate')();
  assert.equal(dialog.open, false);
  assert.equal(dialog.isConnected, false);
  assert.equal(submits, 0);
  assert.equal(focused, true);
  assert.equal(routeListeners.size, 0);
});
