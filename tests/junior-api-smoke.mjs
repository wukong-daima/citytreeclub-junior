import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
function client() {
  let cookie = "";
  return async (body, expected = 200) => {
    const response = await fetch(`${origin}/api/garden`, {
      method: body ? "POST" : "GET",
      headers: {
        origin,
        cookie,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    const data = await response.json();
    assert.equal(
      response.status,
      expected,
      `${body?.action || "GET"}: ${JSON.stringify(data)}`,
    );
    return data;
  };
}
const request = client();
const stranger = client();
const assign = { action: "assign", lat: 37.5445, lng: 127.0374, radius: 500 };
const dateOffset = (days) =>
  new Date(Date.now() + 9 * 3600000 + days * 86400000)
    .toISOString()
    .slice(0, 10);
const application = {
  action: "physical-apply",
  kind: "nameplate",
  message: "우리 동네의 소중한 나무",
  startDate: dateOffset(2),
  days: 7,
  consent: true,
};

const initial = await request();
assert.equal(initial.tree, null);
assert.equal(initial.xp, 0);
assert.equal(initial.tutorialCompleted, false);
await request({ action: "rename", name: "초록이" }, 409);
const assigned = await request(assign);
assert(assigned.tree?.id);
await request({ action: "rename", name: "" }, 400);
await request({ action: "rename", name: "가".repeat(17) }, 400);
let state = await request({ action: "rename", name: "  초록이  " });
assert.equal(state.nickname, "초록이");
assert.equal(state.xp, 10);
state = await request({ action: "rename", name: "새로운초록이" });
assert.equal(state.xp, 10, "Renaming must award experience only once");
assert.equal(state.nickname, "새로운초록이");
await request(application, 400);

for (const [action, xp] of [
  ["water", 20],
  ["compost", 35],
  ["demo-visit", 55],
  ["note", 60],
]) {
  state = await request({
    action,
    ...(action === "note" ? { text: "새잎의 모양을 관찰했어요." } : {}),
  });
  assert.equal(state.xp, xp);
  assert.equal(state.points, xp);
  await request(
    { action, ...(action === "note" ? { text: "다시 관찰했어요." } : {}) },
    409,
  );
}
assert.equal(state.water, 1);
assert.equal(state.compost, 1);
assert.equal(state.visits, 1);
assert.equal(state.verifiedVisits, 0);
assert.equal(state.careDays, 1);
assert.equal(state.growth.level, 2);
assert.equal(state.growth.nextXp, 80);
assert.equal(state.growth.progress, 60);
await request(application, 400);
await stranger(assign);
await request({ action: "game-start", game: "unknown" }, 400);

const runs = [];
for (const game of ["bugs", "prune", "soil"]) {
  const { gameRun } = await request({ action: "game-start", game });
  assert.equal(gameRun.game, game);
  assert.equal(gameRun.targets.length, 5);
  assert.equal(new Set(gameRun.targets.map((target) => target.id)).size, 5);
  assert(
    gameRun.targets.every(
      (target) =>
        target.x >= 15 && target.x <= 84 && target.y >= 18 && target.y <= 77,
    ),
  );
  const finish = {
    action: "game-finish",
    runId: gameRun.id,
    targets: gameRun.targets.map((target) => target.id),
  };
  await request(finish, 409); // Server rejects a completion before the minimum play time.
  runs.push(finish);
}
await delay(3200);
await stranger(runs[0], 409);
await request(
  { ...runs[0], targets: ["forged", ...runs[0].targets.slice(1)] },
  409,
);
await request({ ...runs[0], targets: Array(5).fill(runs[0].targets[0]) }, 409);
await request({ ...runs[0], targets: runs[0].targets.slice(1) }, 409);
for (const [index, finish] of runs.entries()) {
  state = await request(finish);
  assert.equal(state.xp, 60 + (index + 1) * 25);
  assert.equal(state.gameWins, index + 1);
  await request(finish, 409);
  await request(
    { action: "game-start", game: ["bugs", "prune", "soil"][index] },
    409,
  );
}
assert.equal(state.xp, 135);
assert.equal((await stranger()).xp, 0);

for (const invalid of [
  { consent: false },
  { consent: "true" },
  { days: 8 },
  { days: 0 },
  { days: "7" },
  { startDate: dateOffset(0) },
  { startDate: dateOffset(-1) },
  { startDate: dateOffset(91) },
  { startDate: "2026-02-30" },
  { startDate: "invalid" },
  { message: "가" },
  { message: "가".repeat(101) },
  { kind: "unsupported" },
])
  await request({ ...application, ...invalid }, 400);
for (const [kind, days] of [
  ["nameplate", 7],
  ["message", 3],
  ["decoration", 1],
  ["confession", 7],
]) {
  const input = { ...application, kind, days };
  state = await request(input);
  const stored = state.applications.find((item) => item.kind === kind);
  assert(stored);
  assert.equal(stored.treeId, assigned.tree.id);
  assert.equal(stored.startDate, application.startDate);
  assert.equal(
    stored.endDate,
    new Date(
      Date.parse(`${application.startDate}T00:00:00Z`) + (days - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10),
  );
  assert.equal(
    stored.status,
    "demo_pending",
    "Sample trees must not create an actual approved event",
  );
  assert.equal(
    state.xp,
    135,
    "Event applications must not manufacture experience",
  );
  await request(input, 409);
}
await request({ action: "tutorial-complete" });
await request({ action: "tutorial-complete" });
const restored = await request();
assert.equal(restored.tutorialCompleted, true);
assert.equal(restored.nickname, "새로운초록이");
assert.equal(restored.tree.id, assigned.tree.id);
assert.equal(restored.xp, 135);
assert.equal(restored.applications.length, 4);
assert.equal(restored.gameWins, 3);
assert.equal(restored.logs.filter((log) => log.action === "rename").length, 1);
assert.equal(restored.growth.nextXp - restored.xp, 25);
console.log(
  "PASS: junior naming, once-only XP, daily care, three server-scored games, minimum play time, tamper/session/replay protection, event eligibility/consent/date/duration/duplicates, tutorial and garden persistence",
);
