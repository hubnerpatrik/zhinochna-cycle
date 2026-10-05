import test from "node:test";
import assert from "node:assert/strict";
import { createAuthHandler } from "../server/auth-handler.js";
import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/auth/vanilla";
import { createAuthService, authErrorMessage } from "../auth/service.js";

const origin = "https://app.example.test";
const cookieName = "__Secure-neon-auth.session_token";
function request(path, method = "GET", body) {
  return {
    url: `/api/auth?authPath=${encodeURIComponent(path)}`, method, body,
    headers: { host: "app.example.test", origin, "content-type": "application/json" },
  };
}
function response() {
  return {
    headers: {}, setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}
const session = {
  user: { id: "fixture", emailVerified: true },
  session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
};

test("same-origin sign-in retains cookies for session, JWT, reload and sign-out", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  let browserCookie = "";
  const handler = createAuthHandler({ baseUrl: "https://auth.example.test/neondb/auth", fetcher: async (url, init) => {
    requests.push({ url, ...init });
    assert.equal(init.headers.Origin, origin);
    assert.equal(init.redirect, "manual");
    if (url.pathname.endsWith("/sign-in/email")) {
      assert.equal(JSON.parse(init.body).password, "  MixedCase-fixture  ");
      return Response.json({ user: session.user }, { headers: {
        "Set-Cookie": `${cookieName}=fixture-token; Path=/neondb/auth; Domain=auth.example.test; Secure; HttpOnly; SameSite=None; Partitioned`,
      } });
    }
    assert.equal(init.headers.Cookie, `${cookieName}=fixture-token`);
    if (url.pathname.endsWith("/sign-out")) {
      return Response.json({ success: true }, { headers: {
        "Set-Cookie": `${cookieName}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`,
      } });
    }
    if (url.pathname.endsWith("/token")) return Response.json({ token: "fixture-jwt" });
    assert.equal(url.searchParams.get("disableCookieCache"), "true");
    return Response.json(session);
  } });
  // The browser only retains cookies received from the app's own origin.
  globalThis.fetch = async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, origin);
    const req = request(url.pathname.replace("/api/auth/", ""), init.method || "GET", init.body);
    req.headers.cookie = `unrelated=private; ${browserCookie}`;
    const res = response();
    await handler(req, res);
    assert.equal(res.headers["Cache-Control"], "no-store");
    for (const cookie of res.headers["Set-Cookie"] || []) {
      assert.match(cookie, /; SameSite=Lax/);
      assert.match(cookie, /; HttpOnly/);
      assert.match(cookie, /; Secure/);
      assert.match(cookie, /; Path=\/(?:;|$)/);
      assert.doesNotMatch(cookie, /Partitioned|Domain=/);
      browserCookie = cookie.includes("Max-Age=0") ? "" : cookie.split(";")[0];
    }
    return new Response(typeof res.body === "string" ? res.body : JSON.stringify(res.body), {
      status: res.code, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const makeAuth = () => createAuthService(createAuthClient(`${origin}/api/auth`, {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { retry: 0, credentials: "include" } }),
    }), origin);
    const auth = makeAuth();
    await auth.signIn({ email: "fixture@example.test", password: "  MixedCase-fixture  " });
    assert.deepEqual(JSON.parse(JSON.stringify(await auth.session({ required: true }))), session);
    assert.equal(await auth.token(), "fixture-jwt");
    assert.deepEqual(JSON.parse(JSON.stringify(await makeAuth().session())), session);
    await auth.signOut();
    assert.equal(browserCookie, "");
    assert.equal(requests.length, 5);
  } finally { globalThis.fetch = originalFetch; }
});

test("missing or expired post-login sessions produce a useful error, anonymous startup stays normal", async () => {
  for (const data of [null, {}, { ...session, session: { expiresAt: new Date(0).toISOString() } }]) {
    const auth = createAuthService({ getSession: async () => ({ data }) }, origin);
    assert.deepEqual(await auth.session(), data);
    await assert.rejects(auth.session({ required: true }), error => {
      assert.equal(error.code, "SESSION_NOT_AVAILABLE");
      assert.match(authErrorMessage(error), /cookies/);
      return true;
    });
  }
  const unverified = { ...session, user: { ...session.user, emailVerified: false } };
  const auth = createAuthService({ getSession: async () => ({ data: unverified }) }, origin);
  assert.deepEqual(await auth.session({ required: true }), unverified);
});

test("proxy rejects cross-origin mutations, non-JSON bodies, arbitrary routes and oversized requests", async () => {
  let calls = 0;
  const handler = createAuthHandler({ baseUrl: "https://auth.example.test/auth", fetcher: async () => { calls++; return Response.json({}); } });
  const cases = [
    [request("admin/list-users"), 404],
    [request("https://attacker.test"), 404],
    [request("../token"), 404],
    [request("sign-in/email"), 405],
    [request("sign-in/email", "POST", "{broken"), 400],
    [request("sign-in/email", "POST", " ".repeat(16385)), 413],
  ];
  for (const originHeader of [undefined, "https://attacker.test", "null"]) {
    const req = request("sign-in/email", "POST", {});
    req.headers.origin = originHeader;
    cases.push([req, 403]);
  }
  const form = request("sign-in/email", "POST", {});
  form.headers["content-type"] = "text/plain";
  cases.push([form, 415]);
  for (const [req, status] of cases) {
    const res = response(); await handler(req, res); assert.equal(res.code, status);
  }
  assert.equal(calls, 0);
});

test("proxy preserves provider errors and independent cookies without caching or disclosing internal failures", async () => {
  for (const status of [401, 429, 503]) {
    const handler = createAuthHandler({ baseUrl: "https://auth.example.test/auth/", fetcher: async url => {
      assert.equal(url.href, "https://auth.example.test/auth/sign-in/email");
      const headers = new Headers({ "retry-after": "30" });
      headers.append("set-cookie", `${cookieName}=one; Secure; HttpOnly`);
      headers.append("set-cookie", "__Secure-neon-auth.session_data=two; Secure; HttpOnly");
      headers.append("set-cookie", "unrelated=ignored");
      return Response.json({ code: "PROVIDER_ERROR" }, { status, headers });
    } });
    const req = request("sign-in/email", "POST", {});
    req.url += "&redirect=https://attacker.test";
    const res = response(); await handler(req, res);
    assert.equal(res.code, status);
    assert.equal(JSON.parse(res.body).code, "PROVIDER_ERROR");
    assert.equal(res.headers["Retry-After"], "30");
    assert.equal(res.headers["Set-Cookie"].length, 2);
  }
  for (const fetcher of [async () => { throw new Error("private upstream details"); }, async () => new Response(null, { status: 302 })]) {
    const handler = createAuthHandler({ baseUrl: "https://auth.example.test/auth", fetcher });
    const res = response(); await handler(request("get-session"), res);
    assert.equal(res.code, 502);
    assert.doesNotMatch(JSON.stringify(res), /private upstream details/);
  }
  for (const baseUrl of [undefined, "http://auth.example.test", "https://user:password@auth.example.test", "https://auth.example.test?target=other"]) {
    assert.throws(() => createAuthHandler({ baseUrl }));
  }
});
