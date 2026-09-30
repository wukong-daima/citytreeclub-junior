import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { createIndexedDbStore } from "../lib/local-store.ts";
import { createLocalApi } from "../lib/local-api.ts";

test("separate IndexedDB clients serialize concurrent care and persist across client recreation", async () => {
  const factory = new IDBFactory();
  const a = createLocalApi(createIndexedDbStore(factory));
  const b = createLocalApi(createIndexedDbStore(factory));
  const post = (api: typeof a, body: object) =>
    api.localFetch("/api/garden", {
      method: "POST",
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await post(a, {
        action: "assign",
        lat: 37.5446,
        lng: 127.0376,
        radius: 500,
      })
    ).status,
    200,
  );
  const responses = await Promise.all([
    post(a, { action: "water" }),
    post(b, { action: "water" }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const fresh = createLocalApi(createIndexedDbStore(factory));
  const data = (await (await fresh.localFetch("/api/garden")).json()) as {
    xp: number;
    water: number;
  };
  assert.equal(data.xp, 10);
  assert.equal(data.water, 1);
});

test("aborting an IndexedDB transaction preserves previous values for every client", async () => {
  const factory = new IDBFactory(),
    a = createIndexedDbStore(factory),
    b = createIndexedDbStore(factory);
  await a.update((s) => {
    s.profile.displayName = "원래 이름";
  });
  await assert.rejects(
    a.update((s) => {
      s.profile.displayName = "저장되면 안 됨";
      throw new Error("Rejected");
    }),
    /Rejected/,
  );
  assert.equal(await b.update((s) => s.profile.displayName), "원래 이름");
});

test("IndexedDB clone failures reject rather than committing partial changes", async () => {
  const store = createIndexedDbStore(new IDBFactory());
  await store.update((s) => {
    s.profile.displayName = "정상";
  });
  await assert.rejects(
    store.update((s) => {
      s.profile.displayName = "실패";
      Object.assign(s, { bad: () => true });
    }),
  );
  assert.equal(await store.update((s) => s.profile.displayName), "정상");
});

test("unavailable IndexedDB surfaces a storage error", async () => {
  const api = createLocalApi(createIndexedDbStore(undefined));
  assert.equal((await api.localFetch("/api/garden")).status, 503);
  await assert.rejects(api.exportBackup());
});
