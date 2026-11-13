import test from "node:test";
import assert from "node:assert/strict";
import { floorTileStyle } from "../src/render/tile-pattern.ts";
test("the hall has varied tiles with sparse hairline cracks and restrained fading", () => {
  const tiles = [];
  for (let row = 0; row < 16; row++)
    for (let column = 0; column < 12; column++) {
      const style = floorTileStyle(column, row);
      assert.deepEqual(style, floorTileStyle(column, row));
      assert.ok(style.fade >= 0 && style.fade <= 0.116);
      tiles.push(style);
    }
  const cracked = tiles.filter((t) => t.cracked).length,
    faded = tiles.filter((t) => t.faded).length;
  assert.ok(cracked > 0 && cracked < tiles.length * 0.2);
  assert.ok(faded > 0 && faded < tiles.length * 0.3);
  assert.ok(tiles.some((t) => !t.cracked && !t.faded));
  assert.equal(new Set(tiles.map((t) => t.variant)).size, 16);
});
