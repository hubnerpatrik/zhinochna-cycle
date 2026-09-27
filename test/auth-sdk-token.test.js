import test from "node:test";
import assert from "node:assert/strict";
import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/auth/vanilla";
import { createAuthService } from "../auth/service.js";

test("real Neon SDK obtains a JWT even after the session response has been cached", async () => {
  const originalFetch = globalThis.fetch;
  const paths = [];
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path.endsWith("/token")) return Response.json({ token: "fixture.signed.jwt" });
    return Response.json({ user: { id: "fixture-user", emailVerified: true }, session: {
      token: "opaque-session-not-a-jwt", expiresAt: new Date(Date.now() + 60000).toISOString(),
    } });
  };
  try {
    const client = createAuthClient("https://auth.example.test/auth", { adapter: BetterAuthVanillaAdapter() });
    const service = createAuthService(client, "https://app.example.test");
    await service.session();
    assert.equal(await service.token(), "fixture.signed.jwt");
    assert.ok(paths.some(path => path.endsWith("/token")));
  } finally { globalThis.fetch = originalFetch; }
});
