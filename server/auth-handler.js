import { HTTP_STATUS, serializeRequestBody } from './http.js';
import { extractNeonAuthCookies, NEON_AUTH_COOKIE_PREFIX, parseSetCookies, serializeSetCookie } from "@neondatabase/auth/server";

const MAX_AUTH_BODY_BYTES = 16_384;
const AUTH_UPSTREAM_TIMEOUT_MS = 12_000;
const AUTH_ENDPOINT_METHODS = new Map([
  ["get-session", "GET"], ["token", "GET"],
  ["sign-in/email", "POST"], ["sign-up/email", "POST"], ["sign-out", "POST"],
  ["request-password-reset", "POST"], ["reset-password", "POST"],
  ["email-otp/send-verification-otp", "POST"], ["email-otp/verify-email", "POST"],
]);

function getRequestOrigin(request) {
  const protocol = request.headers['x-forwarded-proto'] === 'http' ? 'http:' : 'https:';
  return new URL(`${protocol}//${request.headers.host}`).origin;
}

function hasInvalidOrigin(request, origin) {
  return (request.headers.origin && request.headers.origin !== origin)
    || request.headers['sec-fetch-site'] === 'cross-site'
    || (request.method === 'POST' && request.headers.origin !== origin);
}

function getAppCookies(headers) {
  return headers.getSetCookie().flatMap(header => parseSetCookies(header))
    .filter(cookie => cookie.name.startsWith(NEON_AUTH_COOKIE_PREFIX))
    .map(cookie => serializeSetCookie({
      ...cookie, domain: undefined, path: '/', partitioned: false,
      secure: true, httpOnly: true, sameSite: 'lax',
    }));
}

export function createAuthHandler({ baseUrl, fetcher = fetch }) {
  const upstream = new URL(baseUrl);
  if (upstream.protocol !== "https:" || upstream.username || upstream.password || upstream.search || upstream.hash) {
    throw new Error("Invalid auth configuration");
  }
  upstream.pathname = upstream.pathname.replace(/\/$/, "") + "/";

  return async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const origin = getRequestOrigin(request);
      const incoming = new URL(request.url, origin);
      const path = request.query?.authPath ?? incoming.searchParams.get("authPath") ?? incoming.pathname.replace(/^\/api\/auth\//, "");
      if (!AUTH_ENDPOINT_METHODS.has(path)) return response.status(HTTP_STATUS.NOT_FOUND).json({ code: "NOT_FOUND" });
      if (request.method !== AUTH_ENDPOINT_METHODS.get(path)) return response.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ code: "METHOD_NOT_ALLOWED" });
      // Require the app's own origin on mutations; never enable credentialed CORS.
      if (hasInvalidOrigin(request, origin)) {
        return response.status(HTTP_STATUS.FORBIDDEN).json({ code: "INVALID_ORIGIN" });
      }
      let body;
      if (request.method === "POST") {
        if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
          return response.status(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).json({ code: "INVALID_CONTENT_TYPE" });
        }
        body = serializeRequestBody(request.body ?? {});
        if (Buffer.byteLength(body) > MAX_AUTH_BODY_BYTES) return response.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ code: "BODY_TOO_LARGE" });
        try { JSON.parse(body); } catch { return response.status(HTTP_STATUS.BAD_REQUEST).json({ code: "INVALID_JSON" }); }
      }
      const target = new URL(path, upstream);
      // Route parameters and arbitrary client query strings are not forwarded.
      if (path === "get-session") target.searchParams.set("disableCookieCache", "true");
      const upstreamResponse = await fetcher(target, {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: extractNeonAuthCookies(request.headers.cookie || ""),
          "x-neon-auth-proxy": "vercel",
        },
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(AUTH_UPSTREAM_TIMEOUT_MS),
      });
      if (upstreamResponse.status >= HTTP_STATUS.REDIRECT_START && upstreamResponse.status < HTTP_STATUS.BAD_REQUEST) {
        return response.status(HTTP_STATUS.BAD_GATEWAY).json({ code: "AUTH_UPSTREAM_ERROR" });
      }
      const responseBody = await upstreamResponse.text();
      const cookies = getAppCookies(upstreamResponse.headers);
      if (cookies.length) response.setHeader("Set-Cookie", cookies);
      response.setHeader("Content-Type", "application/json");
      const retryAfter = upstreamResponse.headers.get("retry-after");
      if (retryAfter) response.setHeader("Retry-After", retryAfter);
      return response.status(upstreamResponse.status).send(responseBody);
    } catch {
      return response.status(HTTP_STATUS.BAD_GATEWAY).json({ code: "AUTH_UNAVAILABLE" });
    }
  };
}
