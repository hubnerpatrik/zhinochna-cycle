const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid text');
  return value.trim();
}
export function validateFeedback(input) {
  if (!input || !uuid.test(input.id)) throw new Error('Invalid ID');
  const allowed = input.action === 'create' ? ['action', 'id', 'text', 'anchor']
    : input.action === 'reply' ? ['action', 'id', 'text', 'messageId'] : ['action', 'id', 'resolved'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Invalid field');
  if (input.action === 'resolve' && typeof input.resolved === 'boolean') return input;
  if (input.action === 'reply' && uuid.test(input.messageId)) return { ...input, text: text(input.text, 4000) };
  if (input.action !== 'create') throw new Error('Invalid action');
  const a = input.anchor;
  if (!a || typeof a.screen !== 'string' || !/^#\/[a-z-]{1,40}$/.test(a.screen)
    || typeof a.selector !== 'string' || a.selector.length > 1000
    || typeof a.label !== 'string' || a.label.length > 100
    || ![a.x, a.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    || typeof a.version !== 'string' || a.version.length > 40
    || !/^\d{1,5}x\d{1,5}$/.test(a.viewport)) throw new Error('Invalid anchor');
  return { action: 'create', id: input.id, text: text(input.text, 4000), anchor: {
    screen: a.screen, selector: a.selector, label: a.label, x: a.x, y: a.y,
    version: a.version, viewport: a.viewport,
  } };
}
