import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";

function client() {
  let cookie = "";
  return async (body, expected = 200, path = "/api/club") => {
    const multipart = body instanceof FormData;
    const response = await fetch(origin + path, {
      method: body ? "POST" : "GET",
      headers: {
        origin,
        cookie,
        ...(body && !multipart ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    const data = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : await response.arrayBuffer();
    assert.equal(
      response.status,
      expected,
      `${path} ${body?.action || "GET/upload"}: ${JSON.stringify(data)}`,
    );
    return data;
  };
}
const owner = client(),
  other = client();
const marker = `smoke-${crypto.randomUUID()}`;
const adopt = { action: "adopt", lat: 37.5445, lng: 127.0374, radius: 500 };
let state = await owner();
assert.equal(state.myTrees.length, 0);
const nearby = await owner(
  undefined,
  200,
  "/api/trees?lat=37.5445&lng=127.0374&radius=500",
);
for (let count = 1; count <= 5; count++) {
  state = await owner(adopt);
  assert.equal(state.myTrees.length, count);
  assert.equal(new Set(state.myTrees.map((item) => item.tree.id)).size, count);
  assert(
    state.myTrees.every((item) =>
      nearby.trees.some((tree) => tree.id === item.tree.id),
    ),
  );
}
await owner(adopt, 409);
const treeId = state.myTrees[4].tree.id;
await owner({ action: "select", treeId });
assert.equal((await owner(undefined, 200, "/api/garden")).tree.id, treeId);
await other({ action: "select", treeId }, 403);
await owner({ action: "part", treeId });
state = await owner();
assert.equal(state.myTrees.length, 4);
assert(!state.myTrees.some((item) => item.tree.id === treeId));
assert.notEqual((await owner(undefined, 200, "/api/garden")).tree.id, treeId);
assert(
  !(await owner()).myTrees.some((item) => item.tree.id === treeId),
  "Parted trees must not reappear",
);
const activeTreeId = state.myTrees[0].tree.id;
const secondTreeId = state.myTrees[1].tree.id;
const garden = (body, expected = 200) => owner(body, expected, "/api/garden");
await owner({ action: "select", treeId: activeTreeId });
await garden({ action: "rename", name: "첫째나무" });
await garden({ action: "water" });
await garden({ action: "compost" });
await garden({ action: "decorate", decoration: "ribbon" });
const { gameRun } = await garden({ action: "game-start", game: "bugs" });
await owner({ action: "select", treeId: secondTreeId });
let secondGarden = await garden();
assert.equal(secondGarden.xp, 0);
assert.equal(secondGarden.points, 35);
assert.equal(secondGarden.water, 0);
assert.equal(secondGarden.compost, 0);
assert.equal(secondGarden.decoration, "none");
assert.equal(secondGarden.nickname, "");
await garden({ action: "water" }, 409);
await garden({ action: "compost" }, 409);
await garden({ action: "decorate", decoration: "ribbon" }, 403);
secondGarden = await garden({ action: "rename", name: "둘째나무" });
assert.equal(secondGarden.xp, 10);
assert.equal(secondGarden.points, 45);
await delay(3200);
const finish = {
  action: "game-finish",
  runId: gameRun.id,
  targets: gameRun.targets.map((target) => target.id),
};
await garden(finish, 409);
await owner({ action: "select", treeId: activeTreeId });
const firstGarden = await garden(finish);
assert.equal(firstGarden.xp, 60);
assert.equal(firstGarden.points, 70);
assert.equal(firstGarden.nickname, "첫째나무");
assert.equal(firstGarden.decoration, "ribbon");
assert.equal(firstGarden.water, 1);
await owner({ action: "select", treeId: secondTreeId });
assert.equal((await garden()).xp, 10);
await garden({ action: "game-start", game: "bugs" }, 409);
await owner({ action: "select", treeId: activeTreeId });
state = await owner({ action: "favorite", treeId });
assert(state.favorites.some((tree) => tree.id === treeId));
state = await owner({ action: "favorite", treeId });
assert(!state.favorites.some((tree) => tree.id === treeId));
await owner(
  {
    action: "profile",
    displayName: "테스트 나무친구",
    areas: ["성수동", "응봉동", "사근동", "송정동"],
  },
  400,
);
await owner(
  {
    action: "profile",
    displayName: "테스트 나무친구",
    areas: ["성수동", "성수동"],
  },
  400,
);
state = await owner({
  action: "profile",
  displayName: "테스트 나무친구",
  areas: ["성수동", "응봉동", "사근동"],
});
assert.deepEqual(state.profile.areas, ["성수동", "응봉동", "사근동"]);
const record = {
  action: "record",
  treeId: activeTreeId,
  text: `${marker} private`,
  health: [state.healthIndicators[0]],
  girth: 42,
  size: "medium",
  visibility: "private",
  nickname: "소중한친구",
  species: "느티나무",
};
await other(record, 403);
const visitorRecord = {
  ...record,
  nickname: undefined,
  text: `${marker} visitor observation`,
};
const observed = await other(visitorRecord);
assert(
  observed.records.some(
    (item) => item.text === visitorRecord.text && item.mine,
  ),
);
assert.equal(
  observed.myTrees.length,
  0,
  "Observation must not implicitly adopt a tree",
);
state = await owner(record);
const privateId = state.records.find((item) => item.text === record.text).id;
assert(!(await other()).records.some((item) => item.id === privateId));
await other(
  { action: "comment", recordId: privateId, text: "비공개 댓글 시도" },
  404,
);
await owner({ ...record, photoKey: "observations/not-owned" }, 400);
state = await owner({
  ...record,
  text: `${marker} public`,
  visibility: "public",
});
const publicId = state.records.find(
  (item) => item.text === `${marker} public`,
).id;
assert(
  (await other()).records.some((item) => item.id === publicId && !item.mine),
);
state = await other({
  action: "comment",
  recordId: publicId,
  text: "나무가 건강하게 자라길!",
});
assert(
  state.records
    .find((item) => item.id === publicId)
    .comments.some((comment) => comment.text === "나무가 건강하게 자라길!"),
);
const commentId = state.records
  .find((item) => item.id === publicId)
  .comments.find((comment) => comment.mine).id;
await owner(
  { action: "edit-comment", commentId, text: "다른 사람 댓글 변경 시도" },
  403,
);
await owner({ action: "delete-comment", commentId }, 403);
state = await other({
  action: "edit-comment",
  commentId,
  text: "오래오래 건강하길!",
});
assert.equal(
  state.records
    .find((item) => item.id === publicId)
    .comments.find((comment) => comment.id === commentId).text,
  "오래오래 건강하길!",
);
await other({ action: "like", recordId: privateId }, 404);
state = await other({ action: "like", recordId: publicId });
assert.equal(state.records.find((item) => item.id === publicId).liked, true);
assert.equal(state.records.find((item) => item.id === publicId).likeCount, 1);
assert.equal(
  (await owner()).records.find((item) => item.id === publicId).liked,
  false,
);
state = await other({ action: "like", recordId: publicId });
assert.equal(state.records.find((item) => item.id === publicId).likeCount, 0);
await other(
  {
    action: "edit-record",
    recordId: publicId,
    text: "다른 사람 기록 변경 시도",
  },
  403,
);
await other({ action: "delete-record", recordId: publicId }, 403);
state = await owner({
  action: "edit-record",
  recordId: publicId,
  text: `${marker} updated`,
});
assert.equal(
  state.records.find((item) => item.id === publicId).text,
  `${marker} updated`,
);
state = await owner();
const notification = state.notifications.find((item) => !item.read);
assert(notification);
await other({ action: "mark-read", notificationId: notification.id });
assert.equal(
  (await owner()).notifications.find((item) => item.id === notification.id)
    .read,
  false,
);
state = await owner({ action: "mark-read", notificationId: notification.id });
assert.equal(
  state.notifications.find((item) => item.id === notification.id).read,
  true,
);
const fakePhoto = new FormData();
fakePhoto.set(
  "photo",
  new File(["this is not a PNG image"], "fake.png", { type: "image/png" }),
);
await owner(fakePhoto, 415, "/api/photos");
const photoData = new FormData();
photoData.set(
  "photo",
  new File(
    [
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBv8AAAAASUVORK5CYII=",
        "base64",
      ),
    ],
    "tree.png",
    { type: "image/png" },
  ),
);
const { photoKey } = await owner(photoData, 200, "/api/photos");
const photoPath = `/api/photos?key=${encodeURIComponent(photoKey)}`;
await owner(undefined, 200, photoPath);
await other(undefined, 404, photoPath);
state = await owner({ ...record, text: `${marker} photo`, photoKey });
const photoRecordId = state.records.find(
  (item) => item.text === `${marker} photo`,
).id;
await other({ action: "delete-photo", recordId: photoRecordId }, 403);
state = await owner({
  action: "comment",
  recordId: publicId,
  text: "작은 나무 사진",
  photoKey,
});
const photoCommentId = state.records
  .find((item) => item.id === publicId)
  .comments.find((comment) => comment.photoUrl)?.id;
assert(photoCommentId);
await other(undefined, 200, photoPath);
await other({ action: "delete-comment-photo", commentId: photoCommentId }, 403);
state = await owner({
  action: "delete-comment-photo",
  commentId: photoCommentId,
});
assert.equal(
  state.records
    .find((item) => item.id === publicId)
    .comments.find((comment) => comment.id === photoCommentId).photoUrl,
  null,
);
await other(undefined, 404, photoPath);
await owner(undefined, 200, photoPath); // Private observation still owns this photo.
state = await owner({ action: "delete-photo", recordId: photoRecordId });
assert.equal(
  state.records.find((item) => item.id === photoRecordId).photoUrl,
  null,
);
await owner(undefined, 404, photoPath); // Unreferenced storage object removed.
state = await owner({
  action: "report",
  treeId: activeTreeId,
  text: `${marker} 지도 위치를 확인해 주세요.`,
});
assert(
  state.reports.some(
    (report) =>
      report.treeId === activeTreeId && report.status === "demo_pending",
  ),
);
assert.equal((await other()).reports.length, 0);
const reportPhoto = await owner(photoData, 200, "/api/photos");
const detailedReport = {
  action: "report",
  kind: "addition",
  text: `${marker} 발견한 나무`,
  photoKey: reportPhoto.photoKey,
  lat: 37.5445,
  lng: 127.0374,
  species: "느티나무",
  health: [],
  size: "medium",
};
await owner({ ...detailedReport, photoKey: undefined }, 400);
await owner({ ...detailedReport, lat: 100 }, 400);
await owner({ ...detailedReport, species: "" }, 400);
await owner({ ...detailedReport, size: "invalid" }, 400);
await owner({ ...detailedReport, health: ["invalid-health-state"] }, 400);
await owner({ ...detailedReport, lng: 181 }, 400);
await other(detailedReport, 400);
for (const kind of ["addition", "removal"]) {
  state = await owner({
    ...detailedReport,
    kind,
    ...(kind === "removal" ? { treeId: activeTreeId } : {}),
  });
  const saved = state.reports.find((report) => report.kind === kind);
  assert(saved);
  assert.equal(saved.status, "demo_pending");
  assert.equal(saved.details.lat, detailedReport.lat);
  assert.equal(saved.details.lng, detailedReport.lng);
  assert.equal(saved.details.species, "느티나무");
  assert.equal(saved.details.girth, null);
  assert.equal(saved.details.photoKey, reportPhoto.photoKey);
}
await owner({ ...detailedReport, kind: "removal" }, 400);
await other({ action: "delete-comment", commentId });
assert(
  !(await owner()).records
    .find((item) => item.id === publicId)
    .comments.some((comment) => comment.id === commentId),
);
state = await owner({
  ...record,
  text: `${marker} temporary`,
  visibility: "public",
  girth: null,
});
const temporary = state.records.find(
  (item) => item.text === `${marker} temporary`,
);
assert.equal(temporary.girth, null);
await other({ action: "like", recordId: temporary.id });
await other({
  action: "comment",
  recordId: temporary.id,
  text: "함께 삭제될 테스트 댓글",
});
await owner({ action: "delete-record", recordId: temporary.id });
assert(!(await other()).records.some((item) => item.id === temporary.id));

const otherState = await other(adopt);
const otherRecord = {
  ...record,
  treeId: otherState.myTrees[0].tree.id,
  text: `${marker} surviving record`,
  visibility: "public",
};
const savedOther = await other(otherRecord);
const otherRecordId = savedOther.records.find(
  (item) => item.text === otherRecord.text,
).id;
await owner({ action: "account-delete", confirm: false }, 400);
assert.equal(
  (await owner({ action: "account-delete", confirm: true })).deleted,
  true,
);
state = await other();
assert.equal(state.myTrees.length, 1);
assert(state.records.some((item) => item.id === otherRecordId && item.mine));
assert(
  !state.records.some((item) => item.id === publicId || item.id === privateId),
);
const empty = await owner();
assert.equal(empty.myTrees.length, 0);
assert.equal(empty.notifications.length, 0);
assert.equal(empty.reports.length, 0);
await other({ action: "part", treeId: otherState.myTrees[0].tree.id });
assert.equal((await other()).myTrees.length, 0);
assert.equal((await other(undefined, 200, "/api/garden")).tree, null);
assert.equal((await other()).myTrees.length, 0);
await other({ action: "account-delete", confirm: true });
await owner({ action: "account-delete", confirm: true });
console.log(
  "PASS: club adoption/nearest10/max5, select/part persistence, per-tree XP/decoration, global points/daily limits, game tree binding, favorites, profile, private/public/visitor records, comments, likes, edit/delete ownership, notifications, image validation/privacy/deletion, detailed reports and isolated account deletion",
);
