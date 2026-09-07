import test from "node:test";
import assert from "node:assert/strict";
import { bindMapGestures, clampZoom, zoomScrollLeft } from "../active-map/map-gestures.js";

test("zoom preserves the day under the anchor and clamps the chart limits", () => {
  const next = zoomScrollLeft(500, 160, 168, 50, 75);
  assert.equal((next + 160 - 168) / 75, (500 + 160 - 168) / 50);
  assert.equal(clampZoom(1), 24);
  assert.equal(clampZoom(500), 90);
  assert.equal(zoomScrollLeft(0, 200, 168, 50, 24), 0);
});

test("pinch keeps the vertical temperature anchor when zooming both axes", () => {
  const handlers = {};
  const element = {
    scrollLeft: 0, scrollTop: 100,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  let width = 10;
  let height = 300;
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const touch = x => ({ clientX: x, clientY: 150 });
  const event = touches => ({ touches, preventDefault() {} });
  try {
    bindMapGestures(element, {
      getWidth: () => width, getHeight: () => height,
      fixedWidth: () => 48, clampWidth: value => Math.max(10, Math.min(90, value)),
      setWidth: value => { width = value; height = value * 30; },
    });
    handlers.touchstart(event([touch(100), touch(200)]));
    handlers.touchmove(event([touch(50), touch(250)]));
    handlers.touchend(event([]));
    assert.equal(width, 20, "mobile overview zoom is allowed below the desktop minimum");
    assert.equal(height, 600);
    assert.equal((element.scrollTop + 150 - 28) / height, (100 + 150 - 28) / 300);
    handlers.touchcancel(event([]));
    const previous = element.scrollTop;
    handlers.touchmove(event([touch(10), touch(300)]));
    assert.equal(element.scrollTop, previous, "cancelled gestures cannot change the viewport");
  } finally {
    globalThis.requestAnimationFrame = previousRequest;
    globalThis.cancelAnimationFrame = previousCancel;
  }
});

test("native swipe stays unblocked; pinch zoom flushes on release and suppresses its click", () => {
  const handlers = {};
  const element = {
    scrollLeft: 300,
    getBoundingClientRect: () => ({ left: 0 }),
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  let width = 50;
  let started = 0;
  const oldRequest = globalThis.requestAnimationFrame;
  const oldCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const touch = (x, y = 100) => ({ clientX: x, clientY: y });
  const event = touches => ({ touches, prevented: false, preventDefault() { this.prevented = true; } });
  try {
    bindMapGestures(element, {
      getWidth: () => width, setWidth: value => { width = value; },
      fixedWidth: () => 168, onPinch: () => { started++; },
    });
    handlers.touchstart(event([touch(100)]));
    const swipe = event([touch(160)]);
    handlers.touchmove(swipe);
    assert.equal(swipe.prevented, false);
    assert.equal(width, 50);
    handlers.touchend(event([]));
    const click = { detail: 1, preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
    handlers.click(click);
    assert.equal(click.prevented, true);

    handlers.touchstart(event([touch(100)]));
    const start = event([touch(100), touch(200)]);
    handlers.touchstart(start);
    assert.equal(start.prevented, true);
    handlers.touchmove(event([touch(75), touch(225)]));
    handlers.touchend(event([]));
    assert.equal(width, 75);
    assert.equal(element.scrollLeft, 441);
    assert.equal(started, 1);
    click.prevented = false;
    handlers.click(click);
    assert.equal(click.prevented, true);

    handlers.touchstart(event([touch(100)]));
    handlers.touchend(event([]));
    click.prevented = false;
    handlers.click(click);
    assert.equal(click.prevented, false, "a fresh tap selects normally");
  } finally {
    globalThis.requestAnimationFrame = oldRequest;
    globalThis.cancelAnimationFrame = oldCancel;
  }
});
