import { normalizeApplicationData } from '../data-validation.js';

const MAX_STATE_VERSION = 2_147_483_647;
const MUTATION_ID_PATTERN = /^[a-f0-9-]{36}$/i;
const STATE_INPUT_FIELDS = ['version', 'mutationId', 'data'];

export function normalizeStateInput(input) {
  if (!Number.isSafeInteger(input.version) || input.version < 0 || input.version >= MAX_STATE_VERSION
    || typeof input.mutationId !== 'string' || !MUTATION_ID_PATTERN.test(input.mutationId)
    || Object.keys(input).some(key => !STATE_INPUT_FIELDS.includes(key))) {
    throw new Error('Invalid input');
  }
  const data = normalizeApplicationData(input.data, { strict: true });
  return { ...input, data };
}
