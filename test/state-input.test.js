import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStateInput } from '../server/state-input.js';

const input = () => ({
  version: 0, mutationId: crypto.randomUUID(),
  data: { profile: { name: 'Fixture', setupCompleted: true }, maps: {}, activeMapId: null },
});

test('state input preserves the database version boundary and the existing mutation ID contract', () => {
  const source = input();
  assert.equal(normalizeStateInput({ ...source, version: 2_147_483_646 }).version, 2_147_483_646);
  for (const version of [-1, 0.5, '0', NaN, Infinity, 2_147_483_647]) {
    assert.throws(() => normalizeStateInput({ ...source, version }));
  }
  // This pre-existing format is intentionally looser than the feedback UUID pattern.
  assert.equal(normalizeStateInput({ ...source, mutationId: '-'.repeat(36) }).mutationId, '-'.repeat(36));
  for (const mutationId of [null, '', 'g'.repeat(36), 'a'.repeat(35)]) {
    assert.throws(() => normalizeStateInput({ ...source, mutationId }));
  }
  assert.throws(() => normalizeStateInput({ ...source, userId: 'forged' }));
  assert.throws(() => normalizeStateInput({ ...source, data: { maps: [] } }));
});

test('an inherited property name is never accepted as the active map', () => {
  for (const activeMapId of ['constructor', 'toString', '__proto__']) {
    assert.throws(() => normalizeStateInput({ ...input(), data: { ...input().data, activeMapId } }));
  }
});

test('stored state keeps only known profile and coverline fields', () => {
  const source = input();
  source.data.profile.extra = { nested: 'x'.repeat(100) };
  source.data.maps = { 'map-1': {
    id: 'map-1', name: 'Map',
    profileSnapshot: { name: 'Author', injected: true },
    coverlines: { default: { horizontalTemp: 36.5, verticalKey: '2026-10-01', verticalPosition: 'start', payload: 'x' } },
  } };
  const { data } = normalizeStateInput(source);
  assert.equal('extra' in data.profile, false);
  assert.equal(data.profile.setupCompleted, true);
  assert.equal('injected' in data.maps['map-1'].profileSnapshot, false);
  assert.deepEqual(data.maps['map-1'].coverlines.default, { horizontalTemp: 36.5, verticalKey: '2026-10-01', verticalPosition: 'start' });
});
