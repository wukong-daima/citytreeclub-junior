import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScreen,
  pageItems,
  restoreHistoryDelta,
} from "../lib/app-navigation.ts";
test("hash navigation accepts supported screens and recovers invalid links", () => {
  assert.equal(parseScreen("#games"), "games");
  assert.equal(parseScreen("#events"), "events");
  assert.equal(parseScreen("#unknown"), "discover");
  assert.equal(parseScreen(""), "discover");
  assert.equal(parseScreen("#record=abc"), "club");
});
test("cancelled back and forward restore original history position instead of replacing destination", () => {
  assert.equal(restoreHistoryDelta(2, 1), 1);
  assert.equal(restoreHistoryDelta(2, 3), -1);
});
test("pagination clamps deleted last pages and preserves empty list", () => {
  assert.deepEqual(pageItems([1, 2, 3, 4, 5, 6], 9, 5), {
    items: [6],
    page: 1,
    pages: 2,
  });
  assert.deepEqual(pageItems([], 2, 5), { items: [], page: 0, pages: 1 });
});
