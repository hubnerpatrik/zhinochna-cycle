import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadFile } from '../browser-download.js';

test('downloads retain attachment policy and defer URL cleanup until their original lifetime', async context => {
  const events = [];
  let downloadedBlob;
  let cleanup;
  let delay;
  const originalDocument = globalThis.document;
  context.mock.method(URL, 'createObjectURL', blob => { downloadedBlob = blob; return 'blob:test'; });
  context.mock.method(URL, 'revokeObjectURL', url => events.push(['revoke', url]));
  context.mock.method(globalThis, 'setTimeout', (callback, milliseconds) => { cleanup = callback; delay = milliseconds; });
  const link = { click() { events.push(['click', this.href, this.download]); }, remove() { events.push(['remove']); } };
  globalThis.document = { createElement: () => link, body: { appendChild() { events.push(['append']); } } };
  try {
    for (const [options, expectedDelay, attached] of [[undefined, 60000, true], [{ urlLifetimeMs: 0 }, 0, true], [{ urlLifetimeMs: 1000, attachToDocument: false }, 1000, false]]) {
      events.length = 0;
      downloadFile('example', 'text/plain', 'report.txt', options);
      assert.equal(downloadedBlob.type, 'text/plain');
      assert.equal(await downloadedBlob.text(), 'example');
      assert.equal(delay, expectedDelay);
      assert.deepEqual(events, [...(attached ? [['append']] : []), ['click', 'blob:test', 'report.txt'], ...(attached ? [['remove']] : [])]);
      cleanup();
      assert.deepEqual(events.at(-1), ['revoke', 'blob:test']);
    }
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
