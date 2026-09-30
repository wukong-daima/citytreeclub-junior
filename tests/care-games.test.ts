import test from "node:test";
import assert from "node:assert/strict";
import {
  bugPosition,
  timingPosition,
  timingHit,
  activeDelta,
  canPlace,
  rotatePiece,
  lockPiece,
  emptyBoard,
  shapes,
  completionTargets,
  gameKeyAction,
  type Piece,
} from "../lib/care-games.ts";
test("soil keyboard remains usable after control button focus without repeat drops", () => {
  assert.equal(gameKeyAction("ArrowLeft", "BUTTON", false), "left");
  assert.equal(gameKeyAction("Space", "BUTTON", false), "drop");
  assert.equal(gameKeyAction("Space", "BUTTON", true), null);
  assert.equal(gameKeyAction("ArrowLeft", "INPUT", false), null);
  assert.equal(gameKeyAction("ArrowUp", "DIV", true), null);
});
test("moving targets remain inside the playable area and change position", () => {
  assert.notDeepEqual(bugPosition(0, 0, false), bugPosition(0, 1000, false));
  for (let i = 0; i < 5; i++)
    for (let t = 0; t < 30000; t += 137) {
      const p = bugPosition(i, t, false);
      assert.ok(p.x >= 12 && p.x <= 88 && p.y >= 18 && p.y <= 78);
    }
});
test("timing bar reverses and hit boundaries match displayed target", () => {
  assert.equal(timingPosition(0, false), 0);
  assert.equal(timingPosition(1000, false), 1);
  assert.equal(timingPosition(2000, false), 0);
  assert.equal(timingHit(0.4, false), true);
  assert.equal(timingHit(0.6, false), true);
  assert.equal(timingHit(0.399, false), false);
  assert.equal(timingHit(0.601, false), false);
  assert.equal(timingHit(0.3, true), true);
});
test("pause and stale animation frames do not advance game unexpectedly", () => {
  assert.equal(activeDelta(10, 1000, true), 0);
  assert.equal(activeDelta(100, 90, false), 0);
  assert.equal(activeDelta(0, 10000, false), 100);
});
test("blocks cannot overlap occupied cells or cross any board edge", () => {
  const b = emptyBoard();
  const p: Piece = { cells: shapes[1], x: 3, y: 0 };
  assert.equal(canPlace(b, p), true);
  for (const pos of [
    { x: -1, y: 0 },
    { x: 7, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 11 },
  ])
    assert.equal(canPlace(b, { ...p, ...pos }), false);
  b[0][3] = 1;
  assert.equal(canPlace(b, p), false);
});
test("four rotations restore shape and blocked rotations cannot be placed", () => {
  const p: Piece = { cells: shapes[0], x: 6, y: 0 };
  let r = p;
  for (let i = 0; i < 4; i++) r = rotatePiece(r);
  assert.deepEqual(r, p);
  assert.equal(canPlace(emptyBoard(), p), false);
});
test("locking clears multiple rows immutably and leaves board height unchanged", () => {
  const b = emptyBoard();
  b[10] = [1, 1, 1, 1, 1, 1, 0, 0];
  b[11] = [1, 1, 1, 1, 1, 1, 0, 0];
  const r = lockPiece(b, { cells: shapes[1], x: 6, y: 10 });
  assert.equal(r.lines, 2);
  assert.equal(r.board.length, 12);
  assert.ok(r.board.every((row) => row.every((c) => c === 0)));
  assert.equal(b[11][6], 0);
});
test("incomplete and failed runs cannot produce completion targets", () => {
  const targets = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
  assert.deepEqual(completionTargets(targets, 5, false), []);
  assert.deepEqual(completionTargets(targets, 4, true), []);
  assert.deepEqual(completionTargets(targets, 5, true), [
    "0",
    "1",
    "2",
    "3",
    "4",
  ]);
});
