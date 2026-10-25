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
