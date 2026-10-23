import { validateFeedback } from './feedback-model.js';

const REQUEST_TIMEOUT_MS = 20_000;

// Keep validation and authenticated transport independent of dialog state.
export function createFeedbackRequest(auth, transport) {
  return async function request(method, body) {
    if (transport) return transport(method, body ? validateFeedback(body) : undefined);
    const token = await auth.token();
    const response = await fetch('/api/feedback', {
      method, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(validateFeedback(body)) } : {}),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  };
}
