import { isFeedbackImage } from './feedback-image.js';
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_SELECTOR_LENGTH = 1000;
export const MAX_LABEL_LENGTH = 100;
const MAX_VERSION_LENGTH = 40;
const SCREEN_PATTERN = /^#\/[a-z-]{1,40}$/;
const VIEWPORT_PATTERN = /^\d{1,5}x\d{1,5}$/;
const CREATE_FIELDS = ['action', 'id', 'text', 'anchor', 'image'];
const REPLY_FIELDS = ['action', 'id', 'text', 'messageId', 'image'];
const RESOLVE_FIELDS = ['action', 'id', 'resolved'];

function validateText(value, maximumLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximumLength) throw new Error('Invalid text');
  return value.trim();
}
function normalizeAnchor(anchor) {
  if (!anchor || typeof anchor.screen !== 'string' || !SCREEN_PATTERN.test(anchor.screen)
    || typeof anchor.selector !== 'string' || anchor.selector.length > MAX_SELECTOR_LENGTH
    || typeof anchor.label !== 'string' || anchor.label.length > MAX_LABEL_LENGTH
    || ![anchor.x, anchor.y].every(coordinate => Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1)
    || typeof anchor.version !== 'string' || anchor.version.length > MAX_VERSION_LENGTH
    || !VIEWPORT_PATTERN.test(anchor.viewport)) throw new Error('Invalid anchor');
  return {
    screen: anchor.screen, selector: anchor.selector, label: anchor.label, x: anchor.x, y: anchor.y,
    version: anchor.version, viewport: anchor.viewport,
  };
}

export function validateFeedback(input) {
  if (!input || !UUID_PATTERN.test(input.id)) throw new Error('Invalid ID');
  const allowedFields = input.action === 'create' ? CREATE_FIELDS
    : input.action === 'reply' ? REPLY_FIELDS : RESOLVE_FIELDS;
  if (Object.keys(input).some(key => !allowedFields.includes(key))) throw new Error('Invalid field');
  if (input.image !== undefined && !isFeedbackImage(input.image)) throw new Error('Invalid image');
  if (input.action === 'resolve' && typeof input.resolved === 'boolean') return input;
  if (input.action === 'reply' && UUID_PATTERN.test(input.messageId)) return { ...input, text: validateText(input.text, MAX_MESSAGE_LENGTH) };
  if (input.action !== 'create') throw new Error('Invalid action');
  const anchor = normalizeAnchor(input.anchor);
  return {
    action: 'create',
    id: input.id,
    text: validateText(input.text, MAX_MESSAGE_LENGTH),
    ...(input.image ? { image: input.image } : {}),
    anchor,
  };
}
