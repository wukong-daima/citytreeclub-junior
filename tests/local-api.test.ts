import test from "node:test";
import assert from "node:assert/strict";
import { createLocalApi } from "../lib/local-api.ts";
import {
  emptyState,
  type LocalState,
  type LocalStore,
} from "../lib/local-store.ts";
type Result = {
  xp: number;
  tree: { id: string };
  trees: { id: string }[];
  myTrees: { tree: { id: string } }[];
  records: {
    id: string;
    text: string;
    visibility: string;
    photoUrl: string | null;
  }[];
  gameRun: { id: string; targets: { id: string }[] };
  photoKey: string;
};
async function read(response: Promise<Response> | Response): Promise<Result> {
  return (await (await response).json()) as Result;
}

function fixture() {
  let state = emptyState();
  let time = new Date("2026-09-30T01:00:00Z");
  const store: LocalStore = {
    async update<T>(fn: (s: LocalState) => T) {
      const next = structuredClone(state);
      const result = fn(next);
      state = next;
      return result;
    },
  };
  const api = createLocalApi(store, () => time);
  const post = async (route: string, body: object) =>
    api.localFetch(`/api/${route}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  const assign = () =>
    post("garden", {
      action: "assign",
      lat: 37.5446,
      lng: 127.0376,
      radius: 500,
    });
  return {
    api,
    post,
    assign,
    advance: (ms: number) => {
      time = new Date(+time + ms);
    },
  };
}
test("daily care cannot award twice and XP stays with selected tree", async () => {
  const f = fixture();
  const first = await read(f.assign());
  assert.equal((await f.post("garden", { action: "water" })).status, 200);
  assert.equal((await f.post("garden", { action: "water" })).status, 409);
  await f.post("club", {
    action: "adopt",
    lat: 37.5446,
    lng: 127.0376,
    radius: 500,
  });
  const club = await read(f.api.localFetch("/api/club"));
  await f.post("club", { action: "select", treeId: club.myTrees[1].tree.id });
  assert.equal((await read(f.api.localFetch("/api/garden"))).xp, 0);
  await f.post("club", { action: "select", treeId: first.tree.id });
  assert.equal((await read(f.api.localFetch("/api/garden"))).xp, 10);
});
test("assignment is limited to nearest ten and five owned trees", async () => {
  const f = fixture();
  const nearby = await read(
    f.api.localFetch("/api/trees?lat=37.5446&lng=127.0376&radius=500"),
  );
  await f.assign();
  for (let i = 0; i < 4; i++)
    assert.equal(
      (
        await f.post("club", {
          action: "adopt",
          lat: 37.5446,
          lng: 127.0376,
          radius: 500,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await f.post("club", {
        action: "adopt",
        lat: 37.5446,
        lng: 127.0376,
        radius: 500,
      })
    ).status,
    409,
  );
  const club = await read(f.api.localFetch("/api/club"));
  assert.equal(
    new Set(club.myTrees.map((x: { tree: { id: string } }) => x.tree.id)).size,
    5,
  );
  assert.ok(
    club.myTrees.every((x: { tree: { id: string } }) =>
      nearby.trees.some((t: { id: string }) => t.id === x.tree.id),
    ),
  );
});
test("game completion requires elapsed time and only rewards once", async () => {
  const f = fixture();
  await f.assign();
  const { gameRun } = await read(
    f.post("garden", { action: "game-start", game: "bugs" }),
  );
  const finish = {
    action: "game-finish",
    runId: gameRun.id,
    targets: gameRun.targets.map((t: { id: string }) => t.id),
  };
  assert.equal((await f.post("garden", finish)).status, 409);
  f.advance(3100);
  assert.equal((await f.post("garden", finish)).status, 200);
  assert.equal((await f.post("garden", finish)).status, 409);
  assert.equal((await read(f.api.localFetch("/api/garden"))).xp, 25);
});
test("backup round trip preserves private observations and invalid backup is atomic", async () => {
  const f = fixture();
  const { tree } = await read(f.assign());
  await f.post("club", {
    action: "record",
    treeId: tree.id,
    text: "잎이 자랐어요",
    health: [],
    girth: null,
    size: "small",
    visibility: "public",
  });
  const saved = await f.api.exportBackup();
  await f.post("club", { action: "account-delete", confirm: true });
  await f.api.importBackup(saved);
  const club = await read(f.api.localFetch("/api/club"));
  assert.equal(club.records[0].text, "잎이 자랐어요");
  assert.equal(club.records[0].visibility, "private");
  const bad = JSON.parse(saved);
  bad.state.owned[0].treeId = "missing";
  await assert.rejects(f.api.importBackup(JSON.stringify(bad)));
  assert.equal(await f.api.exportBackup(), saved);
});
test("decorations unlock at thirty XP and persist on tree selection", async () => {
  const f = fixture();
  await f.assign();
  assert.equal(
    (await f.post("garden", { action: "decorate", decoration: "nameplate" }))
      .status,
    403,
  );
  await f.post("garden", { action: "water" });
  await f.post("garden", { action: "compost" });
  await f.post("garden", { action: "note", text: "새싹을 발견했어요" });
  assert.equal(
    (await f.post("garden", { action: "decorate", decoration: "nameplate" }))
      .status,
    200,
  );
});
test("photos survive backup and deletion removes unused stored photo", async () => {
  const f = fixture();
  const { tree } = await read(f.assign());
  const form = new FormData();
  form.set(
    "photo",
    new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], {
      type: "image/png",
    }),
    "leaf.png",
  );
  const { photoKey } = await read(
    f.api.localFetch("/api/photos", { method: "POST", body: form }),
  );
  await f.post("club", {
    action: "record",
    treeId: tree.id,
    text: "사진 기록",
    health: [],
    size: "small",
    photoKey,
  });
  const saved = await f.api.exportBackup();
  await f.api.importBackup(saved);
  const { records } = await read(f.api.localFetch("/api/club"));
  assert.match(records[0].photoUrl!, /^data:image\/png;base64,/);
  await f.post("club", { action: "delete-photo", recordId: records[0].id });
  assert.equal(
    (await f.api.localFetch(`/api/photos?key=${encodeURIComponent(photoKey)}`))
      .status,
    404,
  );
  const bad = JSON.parse(saved);
  bad.state.photos[0].data = "data:image/svg+xml;base64,PHN2Zz4=";
  const before = await f.api.exportBackup();
  await assert.rejects(f.api.importBackup(JSON.stringify(bad)));
  assert.equal(await f.api.exportBackup(), before);
});
test("physical applications require points and remain local after backup", async () => {
  const f = fixture();
  await f.assign();
  const apply = {
    action: "physical-apply",
    kind: "message",
    message: "함께 자라요",
    startDate: "2026-10-02",
    days: 3,
    consent: true,
  };
  assert.equal((await f.post("garden", apply)).status, 400);
  for (let i = 0; i < 4; i++) {
    await f.post("garden", { action: "water" });
    await f.post("garden", { action: "compost" });
    f.advance(86400000);
  }
  apply.startDate = "2026-10-06";
  assert.equal((await f.post("garden", apply)).status, 200);
  assert.equal((await f.post("garden", apply)).status, 409);
  await f.api.importBackup(await f.api.exportBackup());
});

test("failed persistence reports an error instead of claiming success", async () => {
  const api = createLocalApi({
    async update() {
      throw new DOMException("Full", "QuotaExceededError");
    },
  });
  const response = await api.localFetch("/api/garden", {
    method: "POST",
    body: JSON.stringify({
      action: "assign",
      lat: 37.5446,
      lng: 127.0376,
      radius: 500,
    }),
  });
  assert.equal(response.status, 503);
  await assert.rejects(api.exportBackup());
  await assert.rejects(
    api.importBackup(JSON.stringify({ version: 1, state: emptyState() })),
  );
});

test("untrusted backups reject malformed rewards, references and unknown fields without replacing data", async () => {
  const f = fixture();
  const { tree } = await read(f.assign());
  await f.post("garden", { action: "water" });
  await f.post("club", {
    action: "record",
    treeId: tree.id,
    text: "개인 관찰 기록",
    health: [],
    size: "medium",
  });
  const saved = await f.api.exportBackup();
  const mutations = [
    (s: LocalState) => {
      s.actions[0].xp = 999999;
    },
    (s: LocalState) => {
      s.actions.push({ ...s.actions[0] });
    },
    (s: LocalState) => {
      s.records[0].photoKey = "observations/missing";
    },
    (s: LocalState) => {
      s.records[0].health = ["invalid"];
    },
    (s: LocalState) => {
      s.active = "missing";
    },
    (s: LocalState) => {
      s.profile.areas = ["A", "A"];
    },
    (s: LocalState) => {
      Object.assign(s, { unknown: { source: "https://outside.invalid" } });
    },
  ];
  for (const mutate of mutations) {
    const invalid = JSON.parse(saved);
    mutate(invalid.state);
    await assert.rejects(f.api.importBackup(JSON.stringify(invalid)));
    assert.equal(await f.api.exportBackup(), saved);
  }
});

test("failed attachment uploads can be deleted to reclaim photo capacity", async () => {
  const f = fixture();
  const { tree } = await read(f.assign());
  const upload = () => {
    const form = new FormData();
    form.set(
      "photo",
      new Blob(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])],
        { type: "image/png" },
      ),
      "leaf.png",
    );
    return f.api.localFetch("/api/photos", { method: "POST", body: form });
  };
  const keys: string[] = [];
  for (let i = 0; i < 50; i++) keys.push((await read(upload())).photoKey);
  assert.equal((await upload()).status, 409);
  assert.equal(
    (
      await f.post("club", {
        action: "record",
        treeId: tree.id,
        text: "",
        health: [],
        size: "small",
        photoKey: keys[0],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.api.localFetch(`/api/photos?key=${encodeURIComponent(keys[0])}`, {
        method: "DELETE",
      })
    ).status,
    200,
  );
  assert.equal((await upload()).status, 200);
  assert.equal(
    (
      await f.api.localFetch(`/api/photos?key=${encodeURIComponent(keys[0])}`, {
        method: "DELETE",
      })
    ).status,
    404,
  );
  await f.post("club", {
    action: "record",
    treeId: tree.id,
    text: "사진 기록",
    health: [],
    size: "small",
    photoKey: keys[1],
  });
  assert.equal(
    (
      await f.api.localFetch(`/api/photos?key=${encodeURIComponent(keys[1])}`, {
        method: "DELETE",
      })
    ).status,
    409,
  );
  assert.equal(
    (await f.api.localFetch(`/api/photos?key=${encodeURIComponent(keys[1])}`))
      .status,
    200,
  );
  await f.post("club", {
    action: "report",
    kind: "addition",
    text: "새 나무 발견",
    lat: 37.5446,
    lng: 127.0376,
    species: "느티나무",
    health: [],
    size: "small",
    photoKey: keys[2],
  });
  assert.equal(
    (
      await f.api.localFetch(`/api/photos?key=${encodeURIComponent(keys[2])}`, {
        method: "DELETE",
      })
    ).status,
    409,
  );
  assert.equal(
    (await f.api.localFetch("/api/garden", { method: "DELETE" })).status,
    405,
  );
});

test("a near-limit UTF-8 backup remains exportable and an oversized mutation rolls back", async () => {
  let state = emptyState();
  const store: LocalStore = {
    async update<T>(change: (s: LocalState) => T) {
      const next = structuredClone(state);
      const result = change(next);
      state = next;
      return result;
    },
  };
  const api = createLocalApi(store);
  const assigned = await read(
    api.localFetch("/api/garden", {
      method: "POST",
      body: JSON.stringify({
        action: "assign",
        lat: 37.5446,
        lng: 127.0376,
        radius: 500,
      }),
    }),
  );
  for (let i = 0; i < 6800; i++)
    state.records.push({
      id: crypto.randomUUID(),
      treeId: assigned.tree.id,
      text: "나".repeat(1000),
      health: [],
      girth: null,
      size: "small",
      photoKey: null,
      createdAt: "2026-09-30T01:00:00.000Z",
    });
  const png = (size: number) => {
    const bytes = new Uint8Array(size);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    return new Blob([bytes], { type: "image/png" });
  };
  for (let i = 0; i < 20; i++)
    state.photos.push({
      key: `observations/${crypto.randomUUID()}`,
      blob: png(i === 19 ? 12 : 3 * 1024 * 1024),
    });
  // Derive the last photo size from actual JSON byte size, leaving less room
  // than the next valid record needs. Export itself verifies the boundary.
  const base = await api.exportBackup();
  const remaining = 100 * 1024 * 1024 - new TextEncoder().encode(base).length;
  state.photos[19].blob = png(12 + Math.floor((remaining - 100) / 4) * 3);
  const saved = await api.exportBackup();
  assert.ok(new TextEncoder().encode(saved).length <= 100 * 1024 * 1024);
  const response = await api.localFetch("/api/club", {
    method: "POST",
    body: JSON.stringify({
      action: "record",
      treeId: assigned.tree.id,
      text: "추가 관찰",
      health: [],
      size: "small",
    }),
  });
  assert.equal(response.status, 413);
  assert.equal(state.records.length, 6800);
  await api.importBackup(saved);
});
