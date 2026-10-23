export const HTTP_STATUS = Object.freeze({
  OK: 200,
  REDIRECT_START: 300,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
});

export function setPrivateResponseHeaders(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

export function hasJsonContentType(request) {
  return /^application\/json(?:;|$)/i.test(request.headers['content-type'] || '');
}

export function serializeRequestBody(body) {
  return typeof body === 'string' ? body : JSON.stringify(body);
}
