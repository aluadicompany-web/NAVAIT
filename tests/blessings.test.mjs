import test from "node:test";
import assert from "node:assert/strict";
import {
  BLESSINGS,
  BlessingDeck,
  resolveWish,
  blessingForId,
} from "../src/blessings.ts";
test("20 unique attributed blessings fit the existing database length", () => {
  assert.equal(BLESSINGS.length, 20);
  assert.equal(new Set(BLESSINGS).size, 20);
  const deck = new BlessingDeck(null, () => 0.42);
  for (let i = 0; i < 20; i++) {
    const wish = deck.draw();
    assert.ok(wish.length <= 100);
    assert.ok(wish.includes("คำอวยพรจาก NAVAIT"));
  }
});
test("the shuffle deck has no repeats per cycle, survives reloads and avoids boundary duplicates", () => {
  let deck = new BlessingDeck(null, () => 0.2),
    last;
  for (let round = 0; round < 3; round++) {
    const cycle = [];
    for (let i = 0; i < 20; i++) {
      const wish = deck.draw();
      assert.notEqual(wish, last);
      last = wish;
      cycle.push(wish);
      deck = new BlessingDeck(deck.snapshot(), () => 0.2);
    }
    assert.equal(new Set(cycle).size, 20);
  }
});
test("only empty/whitespace input gets a blessing; authored wishes and legacy fallbacks remain stable", () => {
  let draws = 0;
  const draw = () => {
    draws++;
    return "คำอวยพร";
  };
  assert.equal(
    resolveWish("  ขอให้ครอบครัวมีความสุข  ", draw),
    "ขอให้ครอบครัวมีความสุข",
  );
  assert.equal(draws, 0);
  assert.equal(resolveWish(" \n\t ", draw), "คำอวยพร");
  assert.equal(draws, 1);
  assert.equal(blessingForId("legacy-id"), blessingForId("legacy-id"));
  assert.ok(
    new BlessingDeck({ remaining: [999, -1], last: "bad" })
      .draw()
      .includes("NAVAIT"),
  );
});
