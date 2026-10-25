import { normalizeStateInput } from './state-input.js';
import { HTTP_STATUS, setPrivateResponseHeaders, hasJsonContentType, serializeRequestBody } from './http.js';

export const MAX_STATE_BYTES = 2 * 1024 * 1024;

// Dependencies are injected so tests exercise the same authorization boundary as production.
export function createStateHandler({ identify, repository }) {
  return async (request, response) => {
    setPrivateResponseHeaders(response);
    if (!["GET", "PUT"].includes(request.method)) {
      response.setHeader("Allow", "GET, PUT");
      return response.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: "method_not_allowed" });
    }
    let userId;
    try { userId = await identify(request.headers.authorization); }
    catch { return response.status(HTTP_STATUS.UNAUTHORIZED).json({ error: "unauthorized" }); }
    if (request.method === "GET") {
      try { return response.status(HTTP_STATUS.OK).json(await repository.read(userId)); }
      catch { return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: "storage_unavailable" }); }
    }
    if (!hasJsonContentType(request)) {
      return response.status(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).json({ error: "json_required" });
    }
    let input;
    try {
      const raw = serializeRequestBody(request.body);
      if (!raw || Buffer.byteLength(raw) > MAX_STATE_BYTES) return response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ error: "state_too_large" });
      input = normalizeStateInput(JSON.parse(raw));
    } catch { return response.status(HTTP_STATUS.BAD_REQUEST).json({ error: "invalid_state" }); }
    try {
      const result = await repository.write(userId, input);
      return result ? response.status(HTTP_STATUS.OK).json(result) : response.status(HTTP_STATUS.CONFLICT).json({ error: "version_conflict" });
    } catch { return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ error: "storage_unavailable" }); }
  };
}
