import test from "node:test";
import assert from "node:assert/strict";
import {
  ceremonyPose,
  CostumePool,
  RELEASE_AT,
  CEREMONY_END,
} from "../src/ceremony.ts";
import {
  LANDING_FRONT_Z,
  BOAT_RADIUS,
  CHANNEL_START_Z,
} from "../src/navigation.ts";

test("both entry sides join the pier, lower the held boat, then depart", () => {
  for (const side of [-1, 1]) {
    assert.equal(Math.sign(ceremonyPose(0, side).x), side);
    for (let time = 0; time < CEREMONY_END; time += 0.025) {
      const pose = ceremonyPose(time, side);
      if (time < 2.8) assert.equal(pose.z, -3.55);
      else {
        assert.equal(pose.x, -0.8);
        assert.ok(pose.z >= -3.550001 && pose.z <= -0.11999);
      }
      assert.ok(Number.isFinite(pose.stride) && Number.isFinite(pose.yaw));
      if (time < RELEASE_AT) assert.notEqual(pose.phase, "released");
    }
    const start = ceremonyPose(5, side),
      release = ceremonyPose(RELEASE_AT, side);
    assert.equal(start.phase, "lower");
    assert.equal(release.phase, "released");
    assert.ok(release.carryY < start.carryY);
    assert.ok(release.carryZ > start.carryZ);
    assert.equal(ceremonyPose(CEREMONY_END, side).phase, "done");
    const origin = release.z + release.carryZ;
    for (let t = 0; t <= 1; t += 0.02) {
      const z = origin + (CHANNEL_START_Z - origin) * t,
        scale = 0.52 + (1 - 0.52) * t;
      assert.ok(
        z - BOAT_RADIUS * scale > LANDING_FRONT_Z,
        "handoff enters the pier",
      );
    }
  }
});
test("reduced motion completes without a walking path or long wait", () => {
  for (const side of [-1, 1]) {
    assert.equal(ceremonyPose(0.1, side, true).stride, 0);
    assert.equal(ceremonyPose(0.2, side, true).phase, "released");
    assert.equal(ceremonyPose(1, side, true).phase, "done");
  }
});
test("randomized outfits do not repeat within a session and both entry sides are possible", () => {
  const constant = new CostumePool(() => 0.5),
    colors = new Set();
  for (let i = 0; i < 1000; i++) colors.add(constant.next());
  assert.equal(colors.size, 1000);
  assert.equal(new CostumePool(() => 0.01).side(), -1);
  assert.equal(new CostumePool(() => 0.99).side(), 1);
});
