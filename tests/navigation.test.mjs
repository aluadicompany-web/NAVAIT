import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  BOAT_RADIUS,
  CHANNEL_START_Z,
  LANDING_FRONT_Z,
  LAUNCH_SITE,
  riverLane,
  keepInChannel,
} from "../src/navigation.ts";

test("legacy, new and focused boats clear the complete landing across viewports and drift", () => {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    const camera = new T.PerspectiveCamera(39, width / height, 0.1, 100);
    camera.position.set(0, 15, 13);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const ray = new T.Raycaster(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    for (const y of [0.45, 0.48, 0.58, 0.64, 0.77, 0.82])
      for (const x of [0.05, 0.18, 0.46, 0.5, 0.56, 0.82, 0.95])
        for (const age of [0, 3, 30, 65, 120]) {
          const sx = ((x + age * 0.009) % 1.12) - 0.06;
          ray.setFromCamera(
            new T.Vector2(sx * 2 - 1, 1 - riverLane(y, width < 760) * 2),
            camera,
          );
          const p = keepInChannel(
            ray.ray.intersectPlane(plane, new T.Vector3()),
          );
          assert.ok(
            p.z - BOAT_RADIUS > LANDING_FRONT_Z + 0.5,
            `pier overlap at ${width}x${height}, y=${y}`,
          );
          for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
            const z = LAUNCH_SITE.z + (p.z - LAUNCH_SITE.z) * progress;
            assert.ok(
              z - BOAT_RADIUS > LANDING_FRONT_Z + 0.5,
              "release path overlaps the landing",
            );
          }
          const projected = p.clone().project(camera);
          assert.ok(
            Number.isFinite(projected.x) && Number.isFinite(projected.y),
          );
        }
  }
  assert.equal(LAUNCH_SITE.z, CHANNEL_START_Z);
});

test('reload layout separates 30 identical saved coordinates without mutating data', async () => {
  const { spreadBoats } = await import('../src/navigation.ts');
  const items = Array.from({length:30},(_,i)=>({id:`legacy-${i}`,x:.65,y:.66,wish:`wish-${i}`}));
  const before=structuredClone(items), first=spreadBoats(items.map(i=>i.id));
  const reloaded=spreadBoats([...items].reverse().map(i=>i.id));
  assert.equal(first.size,30);
  assert.deepEqual([...first], [...reloaded]);
  assert.deepEqual(items,before);
  assert.equal(new Set([...first.values()].map(p=>`${p.x},${p.y}`)).size,30);
  assert.ok(Math.max(...[...first.values()].map(p=>p.x))-Math.min(...[...first.values()].map(p=>p.x))>.7);
  for(const p of first.values()) { assert.ok(p.x>=.05&&p.x<=.95);assert.ok(p.y>=.45&&p.y<=.8); }
  assert.equal(spreadBoats([]).size,0);
});
