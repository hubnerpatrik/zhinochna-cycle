import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { createIdentityVerifier } from "../server/identity.js";
import { createStateHandler } from "../server/state-handler.js";

const origin = "https://auth.example.test";
const keys = await generateKeyPair("EdDSA");
const otherKeys = await generateKeyPair("EdDSA");
const identify = createIdentityVerifier(`${origin}/neondb/auth`, keys.publicKey);
async function token(payload = {}, privateKey = keys.privateKey) {
  return new SignJWT({ sub: "account-a", emailVerified: true, ...payload })
    .setProtectedHeader({ alg: "EdDSA" }).setIssuer(payload.iss || origin).setAudience(payload.aud || origin)
    .setIssuedAt().setExpirationTime(payload.exp ?? "15m").sign(privateKey);
}

test("server identity requires a verified, signed, unexpired token from this Neon instance", async () => {
  assert.equal(await identify(`Bearer ${await token()}`), "account-a");
  for (const value of [undefined, "Bearer forged", `Bearer ${await token({}, otherKeys.privateKey)}`,
    ...await Promise.all([{ emailVerified: false }, { role: "anonymous" }, { banned: true }, { sub: "" },
      { exp: 1 }, { iss: "https://attacker.test" }, { aud: "https://other.test" }].map(async data => `Bearer ${await token(data)}`))]) {
    await assert.rejects(identify(value));
  }
});

const state = { profile: { name: "Fixture", setupCompleted: true }, maps: {}, activeMapId: null };
const body = () => ({ version: 0, mutationId: crypto.randomUUID(), data: state });
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}
const req = (method, input, authorization = "Bearer account-a") => ({ method, headers: { authorization, "content-type": "application/json" }, body: input });

test("API derives ownership only from server identity and rejects unauthenticated access", async () => {
  const calls = [];
  const handler = createStateHandler({ identify: async header => {
    if (header !== "Bearer account-a") throw new Error("Unauthorized");
    return "account-a";
  }, repository: {
    read: async id => { calls.push(id); return { version: 0, data: null }; },
    write: async (id, value) => { calls.push(id); return { version: 1, mutationId: value.mutationId }; },
  } });
  for (const method of ["GET", "PUT"]) {
    const res = response();
    await handler(req(method, body(), "Bearer forged"), res);
    assert.equal(res.code, 401);
  }
  assert.deepEqual(calls, []);
  const forgedOwner = response();
  await handler(req("PUT", { ...body(), userId: "victim" }), forgedOwner);
  assert.equal(forgedOwner.code, 400);
  await handler(req("GET"), response());
  await handler(req("PUT", body()), response());
  assert.deepEqual(calls, ["account-a", "account-a"]);
});

test("API validates size/data/version and does not leak storage errors", async () => {
  let writes = 0;
  const handler = createStateHandler({ identify: async () => "a", repository: {
    read: async () => { throw new Error("DATABASE_URL=private"); },
    write: async () => { writes++; return null; },
  } });
  for (const input of [{ ...body(), version: -1 }, { ...body(), data: { maps: [] } }, "{broken", { ...body(), mutationId: "bad" }]) {
    const res = response(); await handler(req("PUT", input), res); assert.equal(res.code, 400);
  }
  const large = response(); await handler(req("PUT", " ".repeat(2 * 1024 * 1024 + 1)), large); assert.equal(large.code, 413);
  assert.equal(writes, 0);
  const conflict = response(); await handler(req("PUT", body()), conflict); assert.equal(conflict.code, 409);
  const failure = response(); await handler(req("GET"), failure); assert.equal(failure.code, 503);
  assert.equal(JSON.stringify(failure).includes("private"), false);
  assert.equal(failure.headers["Cache-Control"], "no-store");
});
