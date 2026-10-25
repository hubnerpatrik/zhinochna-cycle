import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLayoutClass, setChartWidth } from '../ui/layout-classes.js';
import { exportMenuPosition } from '../ui/export-menu.js';

function layoutDocument() {
  const stylesheets = [];
  const ownerDocument = {
    head: { append: stylesheet => stylesheets.push(stylesheet) },
    createElement() {
      const cssRules = [];
      return {
        dataset: {},
        sheet: {
          cssRules,
          insertRule: (text, index) => cssRules.splice(index, 0, text),
          deleteRule: index => cssRules.splice(index, 1),
        },
      };
    },
  };
  const createElement = () => {
    const classes = new Set();
    return {
      ownerDocument,
      classList: { contains: name => classes.has(name), add: name => classes.add(name) },
      get style() { throw new Error('Layout must not access inline styles'); },
    };
  };
  return { stylesheets, createElement };
}

test('zoom reuses a shared width class without accumulating CSS rules or touching inline styles', () => {
  const { stylesheets, createElement } = layoutDocument();
  const canvas = createElement();
  const dayNumbers = createElement();
  setChartWidth(canvas, 1400);
  applyLayoutClass(canvas, 'chart-height', { '--rendered-chart-height': 840 });
  const heightRule = stylesheets[0].sheet.cssRules[1];
  Array.from({ length: 100 }, (_, index) => 1400 + index).forEach(width => {
    setChartWidth(canvas, width);
    setChartWidth(dayNumbers, width);
  });
  assert.equal(stylesheets.length, 1);
  assert.equal(stylesheets[0].sheet.cssRules.length, 2);
  assert.equal(stylesheets[0].sheet.cssRules[1], heightRule);
  assert.match(stylesheets[0].sheet.cssRules[0], /1499px/);
  assert.ok(canvas.classList.contains('layout-chart-width'));
  assert.ok(dayNumbers.classList.contains('layout-chart-width'));
});

test('recreated labels reuse their slot and separate documents retain independent geometry', () => {
  const first = layoutDocument();
  const second = layoutDocument();
  applyLayoutClass(first.createElement(), 'temperature-label-0', { '--temperature-label-top': 20 });
  applyLayoutClass(first.createElement(), 'temperature-label-0', { '--temperature-label-top': 10 });
  applyLayoutClass(second.createElement(), 'temperature-label-0', { '--temperature-label-top': 40 });
  assert.equal(first.stylesheets[0].sheet.cssRules.length, 1);
  assert.match(first.stylesheets[0].sheet.cssRules[0], /10px/);
  assert.match(second.stylesheets[0].sheet.cssRules[0], /40px/);
});

test('export menu retains its viewport gap and chooses the available side of its trigger', () => {
  const size = { width: 180, height: 160 };
  const viewport = { width: 320, height: 740 };
  assert.deepEqual(exportMenuPosition({ left: 20, top: 100, bottom: 140 }, size, viewport), { left: 20, top: 148 });
  assert.deepEqual(exportMenuPosition({ left: 280, top: 650, bottom: 690 }, size, viewport), { left: 132, top: 482 });
  assert.deepEqual(exportMenuPosition({ left: -10, top: 10, bottom: 50 }, size, { width: 200, height: 100 }), { left: 8, top: 8 });
});
