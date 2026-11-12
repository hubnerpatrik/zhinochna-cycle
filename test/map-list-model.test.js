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
