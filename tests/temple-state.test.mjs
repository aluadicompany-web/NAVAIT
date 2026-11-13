import test from "node:test";
import assert from "node:assert/strict";
import {
  roomPoint,
  parsePresence,
  moveToward,
  ROOM,
} from "../src/temple-state.ts";
test("temple walking stays within walls and outside the altar", () => {
  for (const x of [-100, -5, 0, 5, 100])
    for (const z of [-100, -4, 0, 7, 100]) {
      const p = roomPoint(x, z);
      assert.ok(
        p.x >= ROOM.minX &&
          p.x <= ROOM.maxX &&
          p.z >= ROOM.minZ &&
          p.z <= ROOM.maxZ,
      );
    }
  const step = moveToward({ x: 0, z: 0 }, { x: 4, z: 4 }, 1);
  assert.ok(Math.abs(Math.hypot(step.x, step.z) - 1) < 0.0001);
  assert.equal(moveToward({ x: 1, z: 1 }, { x: 1, z: 1 }, 1).moving, false);
});
test("presence rejects invalid IDs/nonfinite coordinates and clamps untrusted movement", () => {
  const valid = {
    id: "11111111-1111-4111-8111-111111111111",
    krathongId: "22222222-2222-4222-8222-222222222222",
    x: 0,
    z: 2,
    praying: false,
  };
  assert.deepEqual(parsePresence(valid), valid);
  for (const patch of [
    { id: "bad" },
    { krathongId: "<script>" },
    { x: Infinity },
    { z: NaN },
    { praying: "yes" },
  ])
    assert.equal(parsePresence({ ...valid, ...patch }), null);
  assert.equal(parsePresence({ ...valid, z: -999 }).z, ROOM.minZ);
});
