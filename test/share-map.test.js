import test from 'node:test';
import assert from 'node:assert/strict';
import { createShareMapHandler } from '../server/share-map-handler.js';
import { serializeBackup } from '../backup.js';

const response = () => ({
  headers: {}, setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, end() { return this; },
});
const backup = name => serializeBackup({ profile: { name: '' }, maps: { 'map-1': { id: 'map-1', name, entries: { '2026-10-01': { temp: 36.5 } } } }, activeMapId: null });
const post = body => ({ method: 'POST', body, headers: { authorization: 'Bearer signed', 'content-type': 'application/json' } });

test('creating a share link requires a verified account and stores only name and entries for that owner', async () => {
  const created = [];
  const repository = { create: async (...args) => { created.push(args); return true; } };
  const handler = createShareMapHandler({ identify: async () => 'owner-a', repository, maxActive: 3 });
  const result = response(); await handler(post(backup('<b>Map</b>')), result);
  assert.equal(result.code, 201);
  assert.equal(created[0][0], 'owner-a');
  assert.equal(created[0][1], result.body.id);
  assert.deepEqual(Object.keys(created[0][2]), ['name', 'entries']);
  assert.equal(created[0][3], 3);
  const denied = createShareMapHandler({ identify: async () => { throw new Error('no'); }, repository });
  const unauthorized = response(); await denied(post(backup('Map')), unauthorized);
  assert.equal(unauthorized.code, 401);
  assert.equal(created.length, 1);
});

test('an account at its active share limit is refused', async () => {
  const handler = createShareMapHandler({ identify: async () => 'owner-a', repository: { create: async () => false } });
  const result = response(); await handler(post(backup('Map')), result);
  assert.equal(result.code, 429);
});

test('share links render escaped, sandboxed HTML and reject unknown IDs', async () => {
  const id = crypto.randomUUID();
  const handler = createShareMapHandler({ identify: async () => 'owner-a', repository: {
    read: async requested => requested === id ? { name: '<script>x</script>', entries: {} } : null,
  } });
  const shown = response(); await handler({ method: 'GET', query: { id }, headers: {} }, shown);
  assert.equal(shown.code, 200);
  assert.doesNotMatch(shown.body, /<script>x/);
  assert.match(shown.headers['Content-Security-Policy'], /sandbox/);
  for (const query of [{ id: crypto.randomUUID() }, { id: 'bad' }, {}]) {
    const missing = response(); await handler({ method: 'GET', query, headers: {} }, missing);
    assert.equal(missing.code, 404);
  }
});
