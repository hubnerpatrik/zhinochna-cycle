import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackRequest } from '../feedback-transport.js';

const reply = () => ({ action: 'reply', id: crypto.randomUUID(), messageId: crypto.randomUUID(), text: '  Test reply  ' });

test('feedback transport authenticates requests and validates before sending', async context => {
  const requests = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return Response.json({ threads: [] });
  });
  const request = createFeedbackRequest({ token: async () => 'test-token' });
  assert.deepEqual(await request('GET'), { threads: [] });
  const message = reply();
  await request('POST', message);
  assert.equal(requests[0].url, '/api/feedback');
  assert.equal(requests[0].options.body, undefined);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.ok(requests[0].options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(requests[1].options.body), { ...message, text: 'Test reply' });
  await assert.rejects(request('POST', { ...message, extra: true }), /Invalid field/);
  assert.equal(requests.length, 2);
});

test('feedback custom transport receives validated data without authentication', async () => {
  const requests = [];
  const request = createFeedbackRequest(undefined, async (...args) => { requests.push(args); return 'result'; });
  assert.equal(await request('GET'), 'result');
  const message = reply();
  await request('POST', message);
  assert.deepEqual(requests, [['GET', undefined], ['POST', { ...message, text: 'Test reply' }]]);
  await assert.rejects(request('POST', { ...message, text: '' }), /Invalid text/);
  assert.equal(requests.length, 2);
});

test('feedback transport propagates HTTP and authentication failures', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(createFeedbackRequest({ token: async () => 'test-token' })('GET'), /Request failed/);
  await assert.rejects(createFeedbackRequest({ token: async () => { throw new Error('Expired'); } })('GET'), /Expired/);
});
