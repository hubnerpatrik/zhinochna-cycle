import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./setup.js";

globalThis.localStorage = new MemoryStorage();
const { Store } = await import("../store.js");
const { LocalStorageAdapter } = await import("../storage/local-storage-adapter.js");
const { createDemoEntries, seedDemoData, DEMO_DAY_COUNT, DEMO_MAP_NAME } = await import("../dev/demo-data.js");

const TODAY = new Date(2026, 2, 3); // Crosses a month boundary.

function createStore() {
  return new Store(new LocalStorageAdapter(new MemoryStorage(), "test:"));
}

test("demo entries cover consecutive days ending today", () => {
  const keys = Object.keys(createDemoEntries(TODAY)).sort();
  assert.equal(keys.length, DEMO_DAY_COUNT);
  assert.equal(keys.at(-1), "2026-03-03");
  assert.equal(keys[0], "2026-02-10");
});

test("demo data fills an empty store and passes strict backup validation", () => {
  const store = createStore();
  assert.equal(seedDemoData(store, TODAY), true);
  assert.equal(store.hasProfile(), true);
  assert.equal(store.getActiveMap().name, DEMO_MAP_NAME);
  assert.equal(Object.keys(store.entries).length, DEMO_DAY_COUNT);
  const restored = store.validateBackup(store.createBackup("2026-03-03T08:00:00.000Z"));
  assert.equal(Object.keys(Object.values(restored.maps)[0].entries).length, DEMO_DAY_COUNT);
});

test("demo data never overwrites existing development data", () => {
  const store = createStore();
  store.saveProfile({ name: "Existing", usualMeasurementTime: "06:30", measurementMethod: "oral", goal: "observation" });
  assert.equal(seedDemoData(store, TODAY), false);
  assert.equal(store.listMaps().length, 0);
  assert.equal(store.getProfile().name, "Existing");
});
