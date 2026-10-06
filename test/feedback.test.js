import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedback } from '../feedback-model.js';
import { createFeedbackHandler } from '../server/feedback-handler.js';
import { createFeedbackRepository } from '../server/feedback-repository.js';
import { generateKeyPair, SignJWT } from 'jose';
import { createIdentityVerifier } from '../server/identity.js';
import { feedbackMessageHtml, feedbackResolutionHtml } from '../ui/feedback-thread.js';

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

test('repository scopes list and reply to owner or server-approved admin; only admin changes status', async () => {
  const queries = [];
  const sql = async (strings, ...values) => { queries.push({ query: strings.join('?'), values }); return []; };
  const repository = createFeedbackRepository(sql);
  await repository.list('a', false);
  await repository.write('a', false, { action: 'reply', id: crypto.randomUUID(), messageId: crypto.randomUUID(), text: 'reply' });
  await repository.write('a', false, { action: 'resolve', id: crypto.randomUUID(), resolved: true });
  assert.equal(queries.length, 2); // Owner resolution never reaches the database.
  queries.forEach(({ query, values }) => { assert.match(query, /owner_id = \? OR \?/); assert.ok(values.includes('a')); assert.ok(values.includes(false)); });
  assert.match(queries[1].query, /messages @>/); // retries do not duplicate replies
  assert.match(queries[1].query, /jsonb_array_length\(messages\) < 100/);
  await repository.write('support', true, { action: 'resolve', id: crypto.randomUUID(), resolved: false });
  assert.match(queries[2].query, /WHERE id = \?::uuid AND \?/);
  assert.equal(queries[2].values.at(-1), true);
});

test('ordinary accounts cannot resolve or reopen even by posting directly to the API', async () => {
  let writes = 0;
  const repository = { write: async () => { writes++; return {}; } };
  const ordinary = createFeedbackHandler({ identify: async () => ({ userId: 'owner' }), repository });
  for (const resolved of [true, false]) {
    const result = response();
    await ordinary(req('POST', { action: 'resolve', id: crypto.randomUUID(), resolved }), result);
    assert.equal(result.code, 403);
  }
  assert.equal(writes, 0);
  const admin = createFeedbackHandler({ identify: async () => ({ userId: 'support' }), repository, adminIds: ['support'] });
  const result = response(); await admin(req('POST', { action: 'resolve', id: crypto.randomUUID(), resolved: true }), result);
  assert.equal(result.code, 200); assert.equal(writes, 1);
});

test('message identity comes from verified writer; responses expose only participant name and safe photo', async () => {
  const photo = 'data:image/jpeg;base64,/9j/AAAA';
  const thread = { id: crypto.randomUUID(), ownerId: 'owner', messages: [
    { id: 'old', author: 'Author', text: 'original', at: '2026-10-06' },
    { id: 'legacy', author: 'Support', text: 'old support reply', at: '2026-10-06' },
    { id: 'new', authorId: 'support', author: 'Support', text: 'reply', at: '2026-10-06' },
  ] };
  const queries = [];
  const sql = async (strings, ...values) => {
    const query = strings.join('?'); queries.push({ query, values });
    return query.includes('account_state') ? [
      { id: 'owner', name: ' Owner ', photo }, { id: 'support', name: 'Responder', photo: 'https://example.test/tracking.jpg' },
    ] : [thread];
  };
  const repository = createFeedbackRepository(sql);
  const [result] = await repository.list('owner', false);
  assert.equal(result.messages[0].authorName, 'Owner'); assert.equal(result.messages[0].authorPhoto, photo);
  assert.equal(result.messages[1].authorName, ''); // Do not invent an identity for legacy support replies.
  assert.equal(result.messages[2].authorName, 'Responder'); assert.equal(result.messages[2].authorPhoto, '');
  assert.equal('ownerId' in result, false); assert.equal('authorId' in result.messages[2], false);
  assert.deepEqual(JSON.parse(queries[1].values[0]), ['owner', 'support']);
  assert.doesNotMatch(queries[1].query, /SELECT\s+data\b/);
  await repository.write('support', true, { action: 'reply', id: thread.id, messageId: crypto.randomUUID(), text: 'reply' });
  const message = JSON.parse(queries[2].values[1])[0];
  assert.equal(message.authorId, 'support');
  assert.throws(() => validateFeedback({ ...make(), authorId: 'victim' }));
  assert.throws(() => validateFeedback({ ...make(), authorName: 'Fake support' }));
});

test('ordinary UI omits both status actions and escapes profile identities and message content', () => {
  for (const resolved of [true, false]) {
    assert.equal(feedbackResolutionHtml({ resolved }, false, false), '');
    assert.match(feedbackResolutionHtml({ resolved }, true, false), /data-resolve=/);
  }
  const html = feedbackMessageHtml({ author: 'Author', authorName: '<script>name</script>',
    authorPhoto: 'javascript:alert(1)', text: '<img src=x onerror=alert(1)>', at: '2026-10-06' });
  assert.match(html, /&lt;script&gt;name&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|javascript:|<img src=x/);
  assert.match(feedbackMessageHtml({ authorName: 'Owner', authorPhoto: 'data:image/jpeg;base64,/9j/AAAA', text: 'hello', at: '2026-10-06' }), /<img class="feedback-avatar"/);
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
