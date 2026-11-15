import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteMapWithUndo } from '../map-delete.js';

function setup({ deletes = true, restores = true } = {}) {
  const calls = [];
  const store = {
    snapshotMap: id => { calls.push(['snapshot', id]); return { map: { id }, wasActive: false }; },
    deleteMap: id => { calls.push(['delete', id]); return deletes; },
    restoreMap: snapshot => { calls.push(['restore', snapshot.map.id]); return restores; },
  };
  const offers = [];
  const options = {
    store,
    runStoreAction: action => { try { return { ok: true, value: action() }; } catch { return { ok: false, value: null }; } },
    offerUndo: (text, offer) => offers.push([text, offer]),
    notify: text => calls.push(['notify', text]),
    refresh: () => calls.push(['refresh']),
  };
  return { calls, offers, options };
}

test('deleting a map takes a snapshot first, deletes it, refreshes the list and offers to undo', () => {
  const { calls, offers, options } = setup();
  assert.equal(deleteMapWithUndo('map-1', options), true);
  assert.deepEqual(calls.map(call => call[0]), ['snapshot', 'delete', 'refresh']);
  assert.equal(offers.length, 1);
  assert.equal(offers[0][0], 'Map deleted');
  assert.equal(offers[0][1].label, 'Undo');
});

test('choosing undo restores the map, says so and refreshes the list', () => {
  const { calls, offers, options } = setup();
  deleteMapWithUndo('map-1', options);
  offers[0][1].onAction();
  assert.deepEqual(calls.slice(3).map(call => call[0]), ['restore', 'notify', 'refresh']);
  assert.deepEqual(calls.find(call => call[0] === 'notify'), ['notify', 'Map restored ✓']);
});

test('nothing is offered when the map could not be deleted', () => {
  const missing = setup({ deletes: false });
  assert.equal(deleteMapWithUndo('map-1', missing.options), false);
  assert.deepEqual(missing.offers, []);
  const failing = setup();
  failing.options.store.deleteMap = () => { throw new Error('storage full'); };
  assert.equal(deleteMapWithUndo('map-1', failing.options), false);
  assert.deepEqual(failing.offers, []);
});

test('a failed restore does not claim success', () => {
  const { calls, offers, options } = setup({ restores: false });
  deleteMapWithUndo('map-1', options);
  offers[0][1].onAction();
  assert.ok(!calls.some(call => call[0] === 'notify'));
});
