// Continuous geometry cannot be enumerated in static CSS. Each named slot owns
// one stylesheet rule, reused across renders; elements only receive CSS classes.
// Keep slots tied to UI roles/indices, never coordinates or user-provided IDs.
const documentStyles = new WeakMap();

function getLayoutStyles(ownerDocument) {
  if (!documentStyles.has(ownerDocument)) {
    const stylesheet = ownerDocument.createElement('style');
    stylesheet.dataset.layoutClasses = '';
    ownerDocument.head.append(stylesheet);
    documentStyles.set(ownerDocument, { sheet: stylesheet.sheet, rules: new Map() });
  }
  return documentStyles.get(ownerDocument);
}

export function applyLayoutClass(element, slot, pixelValues) {
  const className = `layout-${slot}`;
  const declarations = Object.entries(pixelValues)
    .map(([property, value]) => `${property}: ${value}px;`).join(' ');
  const ruleText = `.${className} { ${declarations} }`;
  const { sheet, rules } = getLayoutStyles(element.ownerDocument);
  const previous = rules.get(className);
  if (previous?.text !== ruleText) {
    const index = previous?.index ?? sheet.cssRules.length;
    if (previous) sheet.deleteRule(index);
    sheet.insertRule(ruleText, index);
    rules.set(className, { index, text: ruleText });
  }
  if (!element.classList.contains(className)) element.classList.add(className);
}

export function setChartWidth(element, width) {
  applyLayoutClass(element, 'chart-width', { '--rendered-chart-width': width });
}

export function setOverlayPosition(element, slot, { left, top }) {
  applyLayoutClass(element, slot, { '--overlay-left': left, '--overlay-top': top });
  element.classList.add('positioned-overlay');
}
