import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { trapFocusIndex, markModalOpen, markModalClosed } = await import("../ui/modal-a11y.js");

test("Tab wraps inside an open editor in both directions and enters it from outside", () => {
  assert.equal(trapFocusIndex(4, 3, false), 0, "Tab on the last control wraps to the first");
  assert.equal(trapFocusIndex(4, 0, true), 3, "Shift+Tab on the first control wraps to the last");
  assert.equal(trapFocusIndex(4, 1, false), null, "inside the editor the browser moves focus itself");
  assert.equal(trapFocusIndex(4, -1, false), 0, "focus outside the editor enters at the start");
  assert.equal(trapFocusIndex(4, -1, true), 3);
  assert.equal(trapFocusIndex(0, -1, false), null, "nothing focusable, nothing to trap");
});

test("an open editor is a labelled modal dialog and the page behind it is inert until it closes", () => {
  const attributes = new Map();
  const page = { setAttribute: (k, v) => attributes.set(`page:${k}`, v), removeAttribute: k => attributes.delete(`page:${k}`) };
  const heading = { id: "", textContent: "Edit Day" };
  const modal = {
    id: "actionModal",
    setAttribute: (k, v) => attributes.set(k, v),
    removeAttribute: k => attributes.delete(k),
    querySelector: selector => (selector === "h2" ? heading : null),
  };
  markModalOpen(modal, page);
  assert.equal(attributes.get("role"), "dialog");
  assert.equal(attributes.get("aria-modal"), "true");
  assert.equal(attributes.get("aria-labelledby"), "actionModalTitle");
  assert.equal(heading.id, "actionModalTitle");
  assert.equal(attributes.get("page:inert"), "");
  markModalClosed(page);
  assert.equal(attributes.has("page:inert"), false);
});

test("each editor opened from the page remembers its own opening control", async () => {
  const { rememberFocus, openingControl, restoreFocus } = await import("../ui/modal-a11y.js");
  const body = { closest: () => null };
  const control = id => ({ id, isConnected: true, closest: () => null, focus() { globalThis.document.activeElement = this; } });
  const previousDocument = globalThis.document;
  globalThis.document = { body, activeElement: body };
  try {
    const editDay = control("editBtn");
    const fertile = control("fertileRangeActionBtn");
    editDay.focus();
    rememberFocus();
    assert.equal(openingControl(), editDay);
    // Browser Back closes the editor through hideAllModals, which never restores focus.
    fertile.focus();
    rememberFocus();
    assert.equal(openingControl(), fertile, "a newer opener from the page replaces the stale one");
    // Moving from one editor to the next keeps the control that opened the first one.
    globalThis.document.activeElement = { id: "mucusActionBtn", closest: selector => (selector === ".modal" ? {} : null) };
    rememberFocus();
    assert.equal(openingControl(), fertile);
    restoreFocus();
    assert.equal(globalThis.document.activeElement, fertile);
  } finally {
    globalThis.document = previousDocument;
  }
});
