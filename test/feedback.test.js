import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedback } from '../feedback-model.js';
import { createFeedbackHandler } from '../server/feedback-handler.js';
import { createFeedbackRepository } from '../server/feedback-repository.js';
import { generateKeyPair, SignJWT } from 'jose';
import { createIdentityVerifier } from '../server/identity.js';

const make = () => ({ action: 'create', id: crypto.randomUUID(), text: 'Chyba při ukládání', anchor: {
  screen: '#/active-map', selector: '#saveActiveMapBtn', label: 'Save Map', x: .5, y: .5, version: '0.11.0', viewport: '390x844',
} });
const response = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const req = (method, body) => ({ method, body, headers: { authorization: 'Bearer signed', 'content-type': 'application/json' } });

test('feedback rejects forged ownership, invalid anchors, oversized and blank comments', () => {
  assert.equal(validateFeedback(make()).text, 'Chyba při ukládání');
  for (const change of [{ ownerId: 'victim' }, { admin: true }, { text: ' ' }, { text: 'x'.repeat(4001) }, { action: 'delete' }, { id: 'bad' },
    { anchor: { ...make().anchor, screen: '#/active-map?token=private' } }, { anchor: { ...make().anchor, x: Infinity } }]) {
    assert.throws(() => validateFeedback({ ...make(), ...change }));
  }
  const withPrivate = make(); withPrivate.anchor.privateData = 'secret';
  assert.equal('privateData' in validateFeedback(withPrivate).anchor, false);
});

test('feedback handler derives admin solely from verified identity and configured allowlist', async () => {
  const calls = [];
  const repository = { list: async (...args) => { calls.push(args); return []; }, write: async (...args) => { calls.push(args); return {}; } };
  const handler = createFeedbackHandler({ identify: async () => ({ userId: 'a', email: 'owner@example.test' }), repository, adminEmails: ['owner@example.test'] });
  const result = response(); await handler(req('GET'), result);
  assert.equal(result.body.admin, true); assert.deepEqual(calls[0], ['a', true]);
  const ordinary = createFeedbackHandler({ identify: async () => ({ userId: 'b', email: 'user@example.test' }), repository, adminEmails: ['owner@example.test'] });
  await ordinary(req('POST', make()), response()); assert.deepEqual(calls[1].slice(0, 2), ['b', false]);
  const forged = response(); await ordinary(req('POST', { ...make(), admin: true }), forged); assert.equal(forged.code, 400);
  const denied = createFeedbackHandler({ identify: async () => { throw Error(); }, repository });
  const unauthorized = response(); await denied(req('GET'), unauthorized); assert.equal(unauthorized.code, 401);
  assert.equal(calls.length, 2);
});

test('repository scopes list, reply and resolution to owner or server-approved admin', async () => {
  const queries = [];
  const sql = async (strings, ...values) => { queries.push({ query: strings.join('?'), values }); return []; };
  const repository = createFeedbackRepository(sql);
  await repository.list('a', false);
  await repository.write('a', false, { action: 'reply', id: crypto.randomUUID(), messageId: crypto.randomUUID(), text: 'reply' });
  await repository.write('a', false, { action: 'resolve', id: crypto.randomUUID(), resolved: true });
  queries.forEach(({ query, values }) => { assert.match(query, /owner_id = \? OR \?/); assert.ok(values.includes('a')); assert.ok(values.includes(false)); });
  assert.match(queries[1].query, /messages @>/); // retries do not duplicate replies
  assert.match(queries[1].query, /jsonb_array_length\(messages\) < 100/);
});

test('feedback does not disclose database failures and enforces input limits', async () => {
  const handler = createFeedbackHandler({ identify: async () => 'a', repository: {
    list: async () => { throw Error('private database credentials'); }, write: async () => null,
  } });
  const failure = response(); await handler(req('GET'), failure); assert.equal(failure.code, 503); assert.equal(JSON.stringify(failure.body).includes('private'), false);
  const large = response(); await handler(req('POST', 'x'.repeat(24001)), large); assert.equal(large.code, 413);
  const missing = response(); await handler(req('POST', make()), missing); assert.equal(missing.code, 404);
});

test('admin email comes only from a signed verified token', async () => {
  const keys = await generateKeyPair('EdDSA');
  const verify = createIdentityVerifier('https://auth.example.test', keys.publicKey, { includeEmail: true });
  async function jwt(emailVerified) { return new SignJWT({ email: 'Owner@Example.test', emailVerified }).setSubject('account').setProtectedHeader({ alg: 'EdDSA' }).setIssuer('https://auth.example.test').setAudience('https://auth.example.test').setIssuedAt().setExpirationTime('10m').sign(keys.privateKey); }
  assert.deepEqual(await verify(`Bearer ${await jwt(true)}`), { userId: 'account', email: 'owner@example.test' });
  await assert.rejects(verify(`Bearer ${await jwt(false)}`));
});
