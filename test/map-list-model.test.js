import test from "node:test";
import assert from "node:assert/strict";
import { MAP_KINDS, matchesKind } from "../map-list-model.js";

test("the My Maps kind filter separates own, shared, open and closed maps", () => {
  const own = { status: "open", profileSnapshotLocked: false };
  const closedOwn = { status: "closed", profileSnapshotLocked: false };
  const shared = { status: "closed", profileSnapshotLocked: true };
  const maps = [own, closedOwn, shared];
  const pick = kind => maps.filter(map => matchesKind(map, kind));

  assert.deepEqual(Object.keys(MAP_KINDS), ["", "mine", "shared", "open", "closed"]);
  assert.deepEqual(pick(""), maps);
  assert.deepEqual(pick("mine"), [own, closedOwn]);
  assert.deepEqual(pick("shared"), [shared]);
  assert.deepEqual(pick("open"), [own]);
  assert.deepEqual(pick("closed"), [closedOwn, shared]);
});

test("the map preview uses singular English words for a count of one", async () => {
  const { buildMapMeta } = await import("../map-list-model.js");
  const { setLanguage, t } = await import("../i18n.js");
  const one = buildMapMeta({ entries: { "2026-11-01": { temp: 36.5, bleeding: "menstruation", other: "Note" } } });
  assert.equal(one.preview, "1 day · 1 temp · 1 period day · 1 note");
  const many = buildMapMeta({ entries: { "2026-11-01": {}, "2026-11-02": {} } });
  assert.equal(many.preview, "2 days · 0 temps · 0 period days · 0 notes");
  setLanguage("cs", { setItem() {} });
  assert.equal(t(one.preview), "Dny: 1 · teploty: 1 · dny menstruace: 1 · poznámky: 1");
  setLanguage("en", { setItem() {} });
});
