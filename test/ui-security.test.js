import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { store } = await import("../store.js");
const {
  markerHeadingFromColor,
  renderInfoLines,
  renderDayInfo,
  returnsToActionMenuAfterSave,
  selectMarkerType,
  validateTempInput,
} = await import("../ui.js");

test("temperature entry accepts measurements above the chart scale, with bounded finite values", () => {
  const tempInput = { value: "" };
  globalThis.document = {
    getElementById: id => id === "tempInput" ? tempInput : null,
  };

  for (const value of ["36", "36.55", "37.40", "37,40", "38.50", "43"]) {
    tempInput.value = value;
    assert.equal(validateTempInput(), true, `${value} should be accepted`);
  }
  for (const value of ["35.99", "43.01", "Infinity", "not-a-number"]) {
    tempInput.value = value;
    assert.equal(validateTempInput(), false, `${value} should be rejected`);
  }
});

test("marker saves return directly to the chart", () => {
  assert.equal(returnsToActionMenuAfterSave("markersModal"), false);
  assert.equal(returnsToActionMenuAfterSave("mucusModal"), true);
});

test("day-info lines render user input as plain text", () => {
  const appended = [];
  globalThis.document = {
    createElement: tagName => ({ tagName }),
    createTextNode: textContent => ({ textContent }),
  };
  const element = {
    replaceChildren() { appended.length = 0; },
    appendChild(node) { appended.push(node); },
  };
  const payload = '<img src=x onerror="globalThis.pwned=true">';

  renderInfoLines(element, ["Sex: No", `Notes: ${payload}`]);

  assert.deepEqual(appended, [
    { tagName: "span", textContent: "Sex: No" },
    { tagName: "br" },
    { tagName: "span", textContent: `Notes: ${payload}` },
  ]);
  assert.equal(globalThis.pwned, undefined);
});

test("switching marker types preserves each marker draft", () => {
  const markerInput = { value: "P" };
  const markerLabel = { textContent: "" };
  globalThis.document = {
    getElementById: id => ({ markersMarker: markerInput, markersMarkerLabel: markerLabel })[id] ?? null,
    querySelectorAll: () => [],
  };
  store.modal = store._emptyModal();
  store.modal.markerColor = "green";
  store.modal.markers.mucus.value = "2";

  selectMarkerType("blue");
  assert.equal(store.modal.markers.bbt.value, "P");
  assert.equal(markerInput.value, "2");
  assert.equal(markerLabel.textContent, "Mucus Marker");

  markerInput.value = "4";
  selectMarkerType("orange");
  assert.equal(store.modal.markers.mucus.value, "4");
  assert.equal(store.modal.markers.bbt.value, "P");
  assert.equal(markerLabel.textContent, "Cervix Marker");
});

test("each peak type has its own marker heading", () => {
  assert.equal(markerHeadingFromColor("green"), "BBT Marker");
  assert.equal(markerHeadingFromColor("blue"), "Mucus Marker");
  assert.equal(markerHeadingFromColor("orange"), "Cervix Marker");
});

test('day details distinguish explicit empty choices from missing observations and preserve custom factor text', () => {
  const element = () => ({ textContent: '', children: [], setAttribute() {}, removeAttribute() {},
    replaceChildren() { this.children = []; this.textContent = ''; },
    appendChild(child) { this.children.push(child); },
  });
  const nodes = new Map();
  globalThis.document = { createElement: element,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
  };
  store.reset(); store.createMap('Details'); store.selectedKey = '2026-10-07';
  const text = node => node.textContent + node.children.map(text).join(' ');
  store.updateEntry(store.selectedKey, { sensation: '', consistency: '', color: '', visible: true,
    tempFactors: 'other', tempFactorsOther: '<b>Save & keep this text</b>' });
  renderDayInfo([]);
  const recorded = text(nodes.get('infoMucus'));
  for (const expected of ['Sensation: None', 'Consistency: None', 'Color: No color', 'Discharge: Present']) assert.ok(recorded.includes(expected), expected);
  assert.ok(text(nodes.get('infoTempFactors')).includes('<b>Save & keep this text</b>'));
  store.selectedKey = '2026-10-08';
  renderDayInfo([]);
  const missing = text(nodes.get('infoMucus'));
  for (const expected of ['Sensation: -', 'Consistency: -', 'Color: -', 'Discharge: -']) assert.ok(missing.includes(expected), expected);
});
