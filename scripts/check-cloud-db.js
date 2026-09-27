import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { createStateRepository } from "../server/state-repository.js";

// Run explicitly against the configured database. Only these random fixture IDs
// are touched; no existing account rows are read or modified.
const ids = [`cloud-check-${crypto.randomUUID()}`, `cloud-check-${crypto.randomUUID()}`];
let sql;
try {
  sql = neon(process.env.DATABASE_URL);
  const repository = createStateRepository(sql);
  const data = { profile: { name: "Synthetic integration fixture", setupCompleted: false }, maps: {}, activeMapId: null };
  const first = { version: 0, mutationId: crypto.randomUUID(), data };
  assert.equal((await repository.read(ids[0])).version, 0);
  const saved = await repository.write(ids[0], first);
  assert.equal(saved.version, 1);
  assert.deepEqual(await repository.write(ids[0], first), saved);
  assert.equal((await repository.read(ids[1])).data, null);
  const next = { version: 1, mutationId: crypto.randomUUID(), data: { ...data, maps: { fixture: { id: "fixture" } } } };
  const competing = { ...next, mutationId: crypto.randomUUID() };
  const concurrent = await Promise.all([repository.write(ids[0], next), repository.write(ids[0], competing)]);
  assert.equal(concurrent.filter(Boolean).length, 1);
  assert.equal(concurrent.find(Boolean).version, 2);
  assert.equal(await repository.write(ids[0], { ...first, mutationId: crypto.randomUUID() }), null);
  const permissions = await sql`SELECT relrowsecurity FROM pg_class WHERE oid = 'cycle_private.account_state'::regclass`;
  assert.equal(permissions[0].relrowsecurity, true);
  console.log("Database checks passed: persistence, isolation, retries, concurrent writes, stale-write rejection and RLS.");
} catch {
  console.error("Database integration check failed.");
  process.exitCode = 1;
} finally {
  if (sql) {
    try { await sql`DELETE FROM cycle_private.account_state WHERE user_id = ${ids[0]} OR user_id = ${ids[1]}`; }
    catch { console.error("Fixture cleanup failed."); process.exitCode = 1; }
  }
}
