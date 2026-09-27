import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage, createAuthService, isEmailUnverified, readAuthCallback, verifiedUser } from "../auth/service.js";
import { LocalStorageAdapter, useAccountStorage } from "../storage/local-storage-adapter.js";
import { MemoryStorage } from "./setup.js";

test("only verified, unexpired sessions can open an account", () => {
  const session = { user: { id: "a", emailVerified: true }, session: { expiresAt: new Date(Date.now() + 60000).toISOString() } };
  assert.equal(verifiedUser(session), session.user);
  for (const invalid of [null, {}, { user: session.user }, { ...session, user: { id: "a", emailVerified: false } },
    { ...session, user: { id: "", emailVerified: true } }, { ...session, session: { expiresAt: "invalid" } },
    { ...session, session: { expiresAt: new Date(0) } }]) {
    assert.equal(verifiedUser(invalid), null);
  }
});

test("account storage never reads or clears another account or pre-account maps", () => {
  const storage = new MemoryStorage({ maps: '{"legacy":{}}', profile: '{"name":"Original"}' });
  useAccountStorage("account-a");
  const first = new LocalStorageAdapter(storage);
  assert.equal(first.read("maps"), null);
  first.saveState({ profile: { name: "Alice" }, maps: { first: {} }, activeMapId: "first" });
  useAccountStorage("account-b");
  const second = new LocalStorageAdapter(storage);
  assert.equal(second.read("maps"), null);
  second.saveState({ profile: { name: "Bob" }, maps: { second: {} }, activeMapId: "second" });
  assert.equal(JSON.parse(first.read("profile")).name, "Alice");
  assert.equal(JSON.parse(second.read("profile")).name, "Bob");
  second.clear();
  assert.equal(second.read("maps"), null);
  assert.equal(first.read("activeMapId"), "first");
  assert.equal(storage.getItem("maps"), '{"legacy":{}}');
  assert.equal(storage.getItem("profile"), '{"name":"Original"}');
});

test("failed account persistence rolls back only the same namespace", () => {
  const storage = new MemoryStorage({ "other:maps": "untouched" });
  const adapter = new LocalStorageAdapter(storage, "current:");
  const state = { profile: { name: "Original" }, maps: { a: {} }, activeMapId: "a" };
  adapter.saveState(state);
  const setItem = storage.setItem.bind(storage);
  let fail = true;
  storage.setItem = (key, value) => {
    if (key === "current:maps" && fail) { fail = false; throw new Error("quota"); }
    setItem(key, value);
  };
  assert.throws(() => adapter.saveState({ profile: { name: "Unsaved" }, maps: {}, activeMapId: null }));
  assert.deepEqual(JSON.parse(adapter.read("profile")), state.profile);
  assert.equal(adapter.read("activeMapId"), "a");
  assert.equal(storage.getItem("other:maps"), "untouched");
});

test("account namespaces reject missing identities and cannot collide through delimiters", () => {
  assert.throws(() => useAccountStorage(""));
  assert.throws(() => useAccountStorage(null));
  const storage = new MemoryStorage();
  useAccountStorage("a:b");
  const first = new LocalStorageAdapter(storage);
  useAccountStorage("a%3Ab");
  const second = new LocalStorageAdapter(storage);
  first.saveState({ profile: {}, maps: { private: {} }, activeMapId: null });
  assert.equal(second.read("maps"), null);
});

test("provider errors fail closed without displaying raw response contents", async () => {
  const providerError = { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "private provider response" };
  const auth = createAuthService({ getSession: async () => ({ error: providerError, data: { user: { id: "a" } } }) }, "https://app.example");
  await assert.rejects(auth.session(), error => error === providerError);
  assert.equal(authErrorMessage(providerError), "The email or password is incorrect.");
  assert.ok(!authErrorMessage({ message: "secret" }).includes("secret"));
});

test("untrusted callback errors remain recognizable after Neon SDK normalization", () => {
  const expected = "This app address is not allowed by the sign-in service. Please contact the app administrator.";
  assert.equal(authErrorMessage({ code: "INVALID_CALLBACK_URL", status: 403 }), expected);
  assert.equal(authErrorMessage({ code: "feature_not_supported", status: 403, message: "Invalid callbackURL" }), expected);
  assert.notEqual(authErrorMessage({ code: "feature_not_supported", message: "private details" }), expected);
});

test("reset and signup callbacks stay on the app origin and session checks bypass caches", async () => {
  const calls = [];
  const record = name => async values => { calls.push([name, values]); return { data: {} }; };
  const auth = createAuthService({
    getSession: record("session"), requestPasswordReset: record("request-reset"),
    resetPassword: record("reset"),
    signUp: { email: record("signup") }, signIn: { email: record("signin") }, signOut: record("signout"),
  }, "https://app.example");
  await auth.session();
  assert.equal(calls[0][1].query.disableCookieCache, true);
  assert.equal(calls[0][1].fetchOptions.headers["X-Force-Fetch"], "true");
  await auth.requestReset("test@example.test");
  assert.equal(calls[1][1].redirectTo, "https://app.example/?auth=reset-password");
  await auth.signUp({ name: "Test", email: "test@example.test", password: "example-password" });
  assert.equal(calls[2][1].callbackURL, "https://app.example/");
  await auth.resetPassword("example-reset-token", "example-password");
  assert.deepEqual(calls[3], ["reset", { token: "example-reset-token", newPassword: "example-password" }]);
});

test("email verification uses OTP endpoints and preserves leading zeroes", async () => {
  const calls = [];
  const auth = createAuthService({ emailOtp: {
    sendVerificationOtp: async values => { calls.push(values); return { data: { success: true } }; },
    verifyEmail: async values => { calls.push(values); return { data: { status: true, token: null } }; },
  } }, "https://app.example");
  await auth.requestVerificationCode("test@example.test");
  assert.deepEqual(calls[0], { email: "test@example.test", type: "email-verification" });
  assert.deepEqual(await auth.verifyEmailCode("test@example.test", "001234"), { status: true, token: null });
  assert.deepEqual(calls[1], { email: "test@example.test", otp: "001234" });
});

test("verification requires an explicit success and propagates provider failures", async () => {
  const providerError = { code: "INVALID_OTP" };
  for (const response of [null, { data: {} }, { data: { status: false } }, { data: { status: true }, error: providerError }]) {
    const auth = createAuthService({ emailOtp: { verifyEmail: async () => response } }, "https://app.example");
    await assert.rejects(auth.verifyEmailCode("test@example.test", "001234"), error =>
      response?.error ? error === providerError : error instanceof Error);
  }
});

test("OTP and unverified email errors remain useful after SDK normalization", () => {
  for (const error of [{ code: "INVALID_OTP" }, { code: "OTP_EXPIRED" },
    { code: "validation_failed", message: "Invalid OTP" }, { message: "OTP expired" }]) {
    assert.equal(authErrorMessage(error), "The verification code is incorrect or expired. Try again or request a new code.");
  }
  assert.equal(authErrorMessage({ message: "Too many attempts" }), "Too many incorrect codes. Request a new code.");
  for (const code of ["EMAIL_NOT_VERIFIED", "email_not_confirmed"]) {
    assert.equal(isEmailUnverified({ code }), true);
    assert.equal(authErrorMessage({ code }), "Verify your email before signing in.");
  }
  assert.equal(isEmailUnverified({ code: "invalid_credentials" }), false);
});

test("password reset callbacks distinguish missing and expired tokens", () => {
  assert.deepEqual(readAuthCallback("https://app.example/?auth=reset-password&token=example"), { reset: true, token: "example", error: false });
  assert.deepEqual(readAuthCallback("https://app.example/?auth=reset-password&error=INVALID_TOKEN"), { reset: true, token: "", error: true });
  assert.equal(readAuthCallback("https://app.example/#/menu").reset, false);
});
