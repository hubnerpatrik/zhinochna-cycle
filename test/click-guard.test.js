import test from 'node:test';
import assert from 'node:assert/strict';
import { createClickGuard } from '../ui/click-guard.js';

test('the click that follows a pointer action on the same day is ignored, whatever its detail', () => {
  let time = 0;
  const guard = createClickGuard({ now: () => time });
  guard.handledByPointer('2026-11-20');
  time = 300; // touch clicks can arrive well after the pointer is lifted
  assert.equal(guard.shouldIgnoreClick('2026-11-20'), true);
  assert.equal(guard.shouldIgnoreClick('2026-11-20'), false, 'only one click is swallowed');
});

test('a click on another day, a late click, or a keyboard click goes through', () => {
  let time = 0;
  const guard = createClickGuard({ now: () => time });
  guard.handledByPointer('2026-11-20');
  assert.equal(guard.shouldIgnoreClick('2026-11-21'), false);
  guard.handledByPointer('2026-11-20');
  time = 5000;
  assert.equal(guard.shouldIgnoreClick('2026-11-20'), false, 'too long after: a separate action');
  assert.equal(guard.shouldIgnoreClick('2026-11-20'), false, 'nothing recorded: keyboard activation');
});
