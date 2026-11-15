import { isFeedbackId, validateFeedback } from './feedback-model.js';

const REQUEST_TIMEOUT_MS = 20_000;

// Keep validation and authenticated transport independent of dialog state.
// A GET with a thread ID reads one complete thread, including screenshots.
export function createFeedbackRequest(auth, transport) {
  return async function request(method, body, threadId) {
    if (threadId !== undefined && !isFeedbackId(threadId)) throw new Error('Invalid ID');
    if (transport) {
      const payload = body ? validateFeedback(body) : undefined;
      return threadId === undefined ? transport(method, payload) : transport(method, payload, threadId);
    }
    const token = await auth.token();
    const url = threadId === undefined ? '/api/feedback' : `/api/feedback?id=${threadId}`;
    const response = await fetch(url, {
      // Retain the hosting provider's cookie when accessing protected previews.
      method, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(validateFeedback(body)) } : {}),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  };
}
