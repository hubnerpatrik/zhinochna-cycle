import test from "node:test";
import assert from "node:assert/strict";
import { CloudStorageAdapter, createCloudTransport } from "../storage/cloud-storage-adapter.js";
import { MemoryStorage } from "./setup.js";

const clone = value => JSON.parse(JSON.stringify(value));
const state = name => ({ profile: { name, setupCompleted: true }, maps: {}, activeMapId: null });
function server() {
  let remote = { version: 0, mutationId: null, data: null };
  return { request: async (method, body) => {
    if (method === "GET") return clone(remote);
    if (body.mutationId === remote.mutationId) return { version: remote.version, mutationId: remote.mutationId };
    if (body.version !== remote.version) throw Object.assign(new Error("Conflict"), { status: 409 });
    remote = { version: body.version + 1, mutationId: body.mutationId, data: clone(body.data) };
    return { version: remote.version, mutationId: remote.mutationId };
  } };
}
const adapter = (remote, storage = new MemoryStorage(), extra = {}) => new CloudStorageAdapter({
  userId: "account-a", storage, request: remote.request, schedule: () => 0, ...extra,
});

test("a saved profile and maps load on a second device", async () => {
  const remote = server(); const first = adapter(remote); await first.initialize();
  first.saveState(state("First device")); await first.flush();
  assert.equal(first.statusValue, "saved");
  const second = adapter(remote); await second.initialize();
  assert.equal(JSON.parse(second.read("profile")).name, "First device");
  assert.equal(second.hasPending(), false);
});

test("default scheduling preserves the browser timer receiver after a durable save", async () => {
  const originalTimer = globalThis.setTimeout;
  let scheduled;
  globalThis.setTimeout = function (callback, delay) {
    assert.equal(this, globalThis, "Window.setTimeout rejects a storage adapter as its receiver");
    assert.equal(delay, 600);
    scheduled = callback;
    return 0;
  };
  try {
    const remote = server();
    const client = adapter(remote, undefined, { schedule: undefined });
    await client.initialize();
    assert.doesNotThrow(() => client.saveState(state("Scheduled save")));
    assert.equal(client.statusValue, "pending");
    assert.equal(typeof scheduled, "function");
    scheduled();
    await client.flush();
    assert.equal(client.statusValue, "saved");
    assert.equal((await remote.request("GET")).data.profile.name, "Scheduled save");
  } finally { globalThis.setTimeout = originalTimer; }
});

test("lost acknowledgement and reload replay the same write without losing newer edits", async () => {
  const remote = server(); const storage = new MemoryStorage(); let loseResponse = true;
  const first = adapter(remote, storage, { request: async (method, body) => {
    const result = await remote.request(method, body);
    if (method === "PUT" && loseResponse) { loseResponse = false; throw new Error("Offline"); }
    return result;
  } });
  await first.initialize(); first.saveState(state("Original")); await first.flush();
  assert.equal(first.statusValue, "error");
  first.saveState(state("Newer edit")); first.stop();
  const reloaded = adapter(remote, storage); await reloaded.initialize();
  assert.equal(reloaded.hasPending(), false);
  const result = await remote.request("GET");
  assert.equal(result.version, 2); assert.equal(result.data.profile.name, "Newer edit");
});

test("a save during an in-flight write queues the newer state", async () => {
  const remote = server(); let release; let started;
  const ready = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let firstWrite = true;
  const client = adapter(remote, undefined, { request: async (method, body) => {
    if (method === "PUT" && firstWrite) { firstWrite = false; started(); await gate; }
    return remote.request(method, body);
  } });
  await client.initialize(); client.saveState(state("First")); const saving = client.flush();
  await ready; client.saveState(state("Second")); release(); await saving;
  assert.equal((await remote.request("GET")).data.profile.name, "Second");
  assert.equal(client.hasPending(), false);
});

test("stale devices cannot overwrite cloud data; recovery retains their local copy", async () => {
  const remote = server(); const first = adapter(remote); const storage = new MemoryStorage(); const second = adapter(remote, storage);
  await first.initialize(); await second.initialize();
  first.saveState(state("Cloud winner")); await first.flush();
  second.saveState(state("Local draft")); await second.flush();
  assert.equal(second.statusValue, "conflict"); assert.equal(second.snapshot().profile.name, "Local draft");
  assert.equal((await remote.request("GET")).data.profile.name, "Cloud winner");
  await second.loadCloud();
  assert.equal(second.snapshot().profile.name, "Cloud winner");
  assert.ok([...storage.values.keys()].some(key => key.includes(":recovery:")));
});

test("another tab's pending envelope is never overwritten", async () => {
  const remote = server(); const storage = new MemoryStorage(); const first = adapter(remote, storage);
  await first.initialize(); const second = adapter(remote, storage); await second.initialize();
  first.saveState(state("Keep me"));
  assert.throws(() => second.saveState(state("Stale tab")));
  assert.equal(second.statusValue, "local-conflict");
  assert.equal(JSON.parse(storage.getItem(first.key)).data.profile.name, "Keep me");
});

test("local storage failure never reports a change as durable", async () => {
  const remote = server(); const storage = new MemoryStorage(); const client = adapter(remote, storage); await client.initialize();
  storage.setItem = () => { throw new Error("Quota exceeded"); };
  assert.throws(() => client.saveState(state("Not durable")));
  assert.notEqual(client.snapshot().profile.name, "Not durable");
});

test("an oversized rejected write can be replaced with a smaller edit", async () => {
  const remote = server();
  const client = adapter(remote, undefined, { request: async (method, body) => {
    if (method === "PUT" && body.data.profile.name === "Too big") throw Object.assign(new Error("Size"), { status: 413 });
    return remote.request(method, body);
  } });
  await client.initialize(); client.saveState(state("Too big")); await client.flush();
  assert.equal(client.statusValue, "too-large");
  client.saveState(state("Smaller")); await client.flush();
  assert.equal(client.statusValue, "saved");
  assert.equal((await remote.request("GET")).data.profile.name, "Smaller");
});

test("only data already assigned to this account migrates into its cloud queue", async () => {
  const remote = server();
  const storage = new MemoryStorage({
    profile: JSON.stringify({ name: "Unassigned legacy profile" }),
    "cycle-account:account-b:profile": JSON.stringify({ name: "Another account" }),
    "cycle-account:account-a:profile": JSON.stringify({ name: "My local profile", setupCompleted: true }),
    "cycle-account:account-a:maps": "{}",
  });
  const client = adapter(remote, storage); await client.initialize();
  assert.equal((await remote.request("GET")).data.profile.name, "My local profile");
  assert.equal(JSON.parse(storage.getItem("profile")).name, "Unassigned legacy profile");
  assert.equal(JSON.parse(storage.getItem("cycle-account:account-b:profile")).name, "Another account");
});

test("cloud transport fetches an in-memory JWT and never trusts an owner supplied by the browser", async () => {
  const calls = [];
  const request = createCloudTransport({ token: async () => "test-jwt" }, async (...args) => {
    calls.push(args); return { ok: true, json: async () => ({ version: 0, data: null }) };
  });
  await request("GET");
  assert.equal(calls[0][0], "/api/state");
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-jwt");
  assert.equal(calls[0][1].credentials, "omit");
});
