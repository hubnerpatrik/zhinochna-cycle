import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpringDriver } from '../ui/motion.js';

function clock() {
  const queue = [];
  let time = 0;
  return {
    schedule: callback => { queue.push(callback); return queue.length; },
    cancelSchedule: () => {},
    now: () => time,
    frame(ms = 16) { time += ms; queue.splice(0).forEach(callback => callback()); },
    pending: () => queue.length,
  };
}

test('the driver springs to the target and reports when it is done', () => {
  const c = clock();
  const seen = [];
  let done = 0;
  const driver = createSpringDriver({ setOffset: x => seen.push(x), ...c });
  driver.show(100);
  driver.animateTo(0, 0, () => { done += 1; });
  for (let i = 0; i < 120 && !done; i += 1) c.frame();
  assert.equal(done, 1);
  assert.equal(driver.x, 0);
  assert.ok(seen.every(x => x >= 0), 'critically damped: never overshoots');
  assert.equal(driver.animating, false);
});

test('a new animation starts from the live value and velocity of the interrupted one', () => {
  const c = clock();
  const driver = createSpringDriver({ setOffset: () => {}, ...c });
  driver.show(100);
  driver.animateTo(0, 0);
  c.frame(); c.frame();
  const x = driver.x;
  assert.ok(x < 100 && x > 0);
  driver.animateTo(100, 0);
  assert.equal(driver.x, x, 'no jump when the target changes');
  assert.ok(driver.animating);
});

test('stop invalidates the running animation and its done callback', () => {
  const c = clock();
  let done = 0;
  const driver = createSpringDriver({ setOffset: () => {}, ...c });
  driver.show(50);
  driver.animateTo(0, 0, () => { done += 1; });
  c.frame();
  driver.stop();
  for (let i = 0; i < 120; i += 1) c.frame();
  assert.equal(done, 0);
  assert.equal(driver.animating, false);
});

test('later() runs once on the next frame unless the driver was stopped first', () => {
  const c = clock();
  const driver = createSpringDriver({ setOffset: () => {}, ...c });
  const calls = [];
  driver.later(() => calls.push('a'));
  c.frame();
  driver.later(() => calls.push('b'));
  driver.stop();
  c.frame();
  assert.deepEqual(calls, ['a']);
});
