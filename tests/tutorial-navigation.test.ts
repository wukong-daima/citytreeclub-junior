import test from "node:test";
import assert from "node:assert/strict";
import { navigateTutorial } from "../lib/tutorial-navigation.ts";

function run(step: number) {
  const calls: string[] = [];
  navigateTutorial(step, {
    garden: () => calls.push("garden"),
    games: () => calls.push("games"),
    assign: () => calls.push("assign-dialog"),
    water: () => calls.push("water-action"),
    focus: (id) => calls.push(`focus:${id}`),
    events: () => calls.push("events-dialog"),
  });
  return calls;
}
test("first tutorial action opens assignment instead of returning to the same tab", () => {
  assert.deepEqual(run(0), ["assign-dialog"]);
});
test("water tutorial action performs care instead of only navigating", () => {
  assert.deepEqual(run(2), ["garden", "water-action"]);
});
test("name and game tutorial actions reveal their controls and final step opens events", () => {
  assert.deepEqual(run(1), ["garden", "focus:tree-name"]);
  assert.deepEqual(run(3), ["games"]);
  assert.deepEqual(run(4), ["events-dialog"]);
});
