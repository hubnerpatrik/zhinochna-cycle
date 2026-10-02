import test from "node:test";
import assert from "node:assert/strict";
import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/auth/vanilla";
import { createAuthService } from "../auth/service.js";

test("Neon SDK preserves password case, whitespace and Unicode in outgoing auth requests", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  // Capture the serialized HTTP body after the real SDK and its middleware.
  // No credentials or accounts are sent to a live auth service.
  globalThis.fetch = async (url, init) => {
    requests.push({ path: new URL(url).pathname, body: JSON.parse(init.body) });
    return Response.json({});
  };
  try {
    const client = createAuthClient("https://auth.example.test/auth", {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { timeout: 15000, retry: 0, credentials: "include" } }),
    });
    const auth = createAuthService(client, "https://app.example.test");
    const passwords = ["Hubner234", "hubner234", "  Hubner234  ", "Hu\u0308bner234\u00a0"];
    for (const password of passwords) {
      await auth.signUp({ name: "Test", email: "test@example.test", password });
      await auth.signIn({ email: "test@example.test", password });
      await auth.resetPassword("test-reset-token", password);
    }
    assert.equal(requests.length, passwords.length * 3);
    passwords.forEach((password, index) => {
      const [signup, signin, reset] = requests.slice(index * 3, index * 3 + 3);
      assert.equal(signup.path, "/auth/sign-up/email");
      assert.equal(signup.body.password, password);
      assert.equal(signin.path, "/auth/sign-in/email");
      assert.equal(signin.body.password, password);
      assert.equal(reset.path, "/auth/reset-password");
      assert.equal(reset.body.newPassword, password);
    });
    assert.notEqual(requests[0].body.password, requests[3].body.password);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
