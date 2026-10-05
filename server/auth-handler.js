import { extractNeonAuthCookies, NEON_AUTH_COOKIE_PREFIX, parseSetCookies, serializeSetCookie } from "@neondatabase/auth/server";

const endpoints = new Map([
  ["get-session", "GET"], ["token", "GET"],
  ["sign-in/email", "POST"], ["sign-up/email", "POST"], ["sign-out", "POST"],
  ["request-password-reset", "POST"], ["reset-password", "POST"],
  ["email-otp/send-verification-otp", "POST"], ["email-otp/verify-email", "POST"],
]);

export function createAuthHandler({ baseUrl, fetcher = fetch }) {
  const upstream = new URL(baseUrl);
  if (upstream.protocol !== "https:" || upstream.username || upstream.password || upstream.search || upstream.hash) {
    throw new Error("Invalid auth configuration");
  }
  upstream.pathname = upstream.pathname.replace(/\/$/, "") + "/";

  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const protocol = req.headers["x-forwarded-proto"] === "http" ? "http:" : "https:";
      const origin = new URL(`${protocol}//${req.headers.host}`).origin;
      const incoming = new URL(req.url, origin);
      const path = req.query?.authPath ?? incoming.searchParams.get("authPath") ?? incoming.pathname.replace(/^\/api\/auth\//, "");
      if (!endpoints.has(path)) return res.status(404).json({ code: "NOT_FOUND" });
      if (req.method !== endpoints.get(path)) return res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
      // Require the app's own origin on mutations; never enable credentialed CORS.
      if ((req.headers.origin && req.headers.origin !== origin)
        || req.headers["sec-fetch-site"] === "cross-site"
        || (req.method === "POST" && req.headers.origin !== origin)) {
        return res.status(403).json({ code: "INVALID_ORIGIN" });
      }
      let body;
      if (req.method === "POST") {
        if (req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
          return res.status(415).json({ code: "INVALID_CONTENT_TYPE" });
        }
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
        if (Buffer.byteLength(body) > 16384) return res.status(413).json({ code: "BODY_TOO_LARGE" });
        try { JSON.parse(body); } catch { return res.status(400).json({ code: "INVALID_JSON" }); }
      }
      const target = new URL(path, upstream);
      // Route parameters and arbitrary client query strings are not forwarded.
      if (path === "get-session") target.searchParams.set("disableCookieCache", "true");
      const response = await fetcher(target, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: extractNeonAuthCookies(req.headers.cookie || ""),
          "x-neon-auth-proxy": "vercel",
        },
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
      });
      if (response.status >= 300 && response.status < 400) {
        return res.status(502).json({ code: "AUTH_UPSTREAM_ERROR" });
      }
      const responseBody = await response.text();
      const cookies = response.headers.getSetCookie().flatMap(header => parseSetCookies(header))
        .filter(cookie => cookie.name.startsWith(NEON_AUTH_COOKIE_PREFIX))
        .map(cookie => serializeSetCookie({
          ...cookie, domain: undefined, path: "/", partitioned: false,
          secure: true, httpOnly: true, sameSite: "lax",
        }));
      if (cookies.length) res.setHeader("Set-Cookie", cookies);
      res.setHeader("Content-Type", "application/json");
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res.status(response.status).send(responseBody);
    } catch {
      return res.status(502).json({ code: "AUTH_UNAVAILABLE" });
    }
  };
}
