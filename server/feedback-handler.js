import { validateFeedback } from '../feedback-model.js';
import { HTTP_STATUS, setPrivateResponseHeaders, hasJsonContentType, serializeRequestBody } from './http.js';

const MAX_FEEDBACK_BODY_BYTES = 164_000;

export function createFeedbackHandler({ identify, repository, adminIds = [], adminEmails = [] }) {
  return async (request, response) => {
    setPrivateResponseHeaders(response);
    if (!['GET', 'POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST');
      return response.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: 'method_not_allowed' });
    }
    let identity;
    try { identity = await identify(request.headers.authorization); }
    catch { return response.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'unauthorized' }); }
    const userId = typeof identity === 'string' ? identity : identity.userId;
    const admin = adminIds.includes(userId) || (Boolean(identity.email) && adminEmails.includes(identity.email));
    if (request.method === 'GET') {
      try { return response.status(HTTP_STATUS.OK).json({ admin, threads: await repository.list(userId, admin) }); }
      catch { return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: 'storage_unavailable' }); }
    }
    if (!hasJsonContentType(request)) return response.status(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).json({ error: 'json_required' });
    let input;
    try {
      const raw = serializeRequestBody(request.body);
      if (!raw || Buffer.byteLength(raw) > MAX_FEEDBACK_BODY_BYTES) return response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ error: 'too_large' });
      input = validateFeedback(JSON.parse(raw));
    } catch { return response.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'invalid_feedback' }); }
    if (input.action === 'resolve' && !admin) return response.status(HTTP_STATUS.FORBIDDEN).json({ error: 'admin_required' });
    try {
      const result = await repository.write(userId, admin, input);
      return result ? response.status(HTTP_STATUS.OK).json({ thread: result }) : response.status(HTTP_STATUS.NOT_FOUND).json({ error: 'not_found_or_full' });
    } catch { return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: 'storage_unavailable' }); }
  };
}
