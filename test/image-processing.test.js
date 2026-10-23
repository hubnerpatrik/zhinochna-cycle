import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareProfilePhoto } from '../profile-photo.js';
import { prepareFeedbackImage } from '../feedback-image.js';

const STORED_JPEG = 'data:image/jpeg;base64,/9j/2Q==';
const JPEG_FILE = new Blob([new Uint8Array([255, 216, 255])], { type: 'image/jpeg' });

function imageEnvironment(t, { width = 2560, height = 1280, decodeFails = false, encodedImages = [STORED_JPEG] } = {}) {
  const calls = { draw: [], qualities: [], revoked: [] };
  const canvas = {
    getContext: () => ({ fillRect() {}, drawImage: (...args) => calls.draw.push(args.slice(1)) }),
    toDataURL(type, quality) {
      assert.equal(type, 'image/jpeg');
      calls.qualities.push(quality);
      return encodedImages[Math.min(calls.qualities.length - 1, encodedImages.length - 1)];
    },
  };
  const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.Image = class {
    naturalWidth = width;
    naturalHeight = height;
    async decode() { if (decodeFails) throw new Error('Decode failed'); }
  };
  globalThis.document = { createElement: () => canvas };
  t.after(() => {
    if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage);
    else delete globalThis.Image;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:test-image');
  t.mock.method(URL, 'revokeObjectURL', url => calls.revoked.push(url));
  return { canvas, calls };
}

test('profile processing preserves the centered square crop and quality fallback', async t => {
  const { canvas, calls } = imageEnvironment(t, { encodedImages: ['invalid', STORED_JPEG] });
  assert.equal(await prepareProfilePhoto(JPEG_FILE), STORED_JPEG);
  assert.equal(canvas.width, 256);
  assert.equal(canvas.height, 256);
  assert.deepEqual(calls.draw, [[640, 0, 1280, 1280, 0, 0, 256, 256]]);
  assert.deepEqual(calls.qualities, [0.8, 0.6]);
  assert.deepEqual(calls.revoked, ['blob:test-image']);
});

test('feedback processing preserves aspect ratio and its separate quality sequence', async t => {
  const { canvas, calls } = imageEnvironment(t, { encodedImages: ['invalid', 'invalid', STORED_JPEG] });
  assert.equal(await prepareFeedbackImage(JPEG_FILE), STORED_JPEG);
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 640);
  assert.deepEqual(calls.draw, [[0, 0, 1280, 640]]);
  assert.deepEqual(calls.qualities, [0.82, 0.65, 0.45]);
  assert.deepEqual(calls.revoked, ['blob:test-image']);
});

test('feedback does not enlarge small screenshots', async t => {
  const { canvas } = imageEnvironment(t, { width: 320, height: 200 });
  await prepareFeedbackImage(JPEG_FILE);
  assert.equal(canvas.width, 320);
  assert.equal(canvas.height, 200);
});

test('decoding failures release the object URL and retain the existing error', async t => {
  const { calls } = imageEnvironment(t, { decodeFails: true });
  await assert.rejects(prepareProfilePhoto(JPEG_FILE), /This image could not be opened/);
  assert.deepEqual(calls.revoked, ['blob:test-image']);
});

test('oversized feedback images exhaust the existing quality sequence and release the URL', async t => {
  const { calls } = imageEnvironment(t, { encodedImages: ['invalid'] });
  await assert.rejects(prepareFeedbackImage(JPEG_FILE), /This screenshot is too large/);
  assert.deepEqual(calls.qualities, [0.82, 0.65, 0.45, 0.25]);
  assert.deepEqual(calls.revoked, ['blob:test-image']);
});
