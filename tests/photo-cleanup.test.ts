import test from "node:test";
import assert from "node:assert/strict";
import { saveWithPhoto } from "../app/photo-save.ts";
import { createLocalApi } from "../lib/local-api.ts";
import { emptyState } from "../lib/local-store.ts";
import { TREES } from "../lib/trees.ts";

function fixture() {
  let state = emptyState();
  const api = createLocalApi({
    async update(change) {
      const next = structuredClone(state);
      const result = change(next);
      state = next;
      return result;
    },
  });
  async function upload() {
    const form = new FormData();
    form.set(
      "photo",
      new Blob(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])],
        { type: "image/png" },
      ),
    );
    const response = await api.localFetch("/api/photos", {
      method: "POST",
      body: form,
    });
    assert.equal(response.status, 200);
    return ((await response.json()) as { photoKey: string }).photoKey;
  }
  return { api, upload, state: () => state };
}

test("failed photo attachment retries do not exhaust photo capacity", async () => {
  const f = fixture();
  for (let i = 0; i < 51; i++) {
    const saved = await saveWithPhoto(
      f.upload,
      async (photoKey) => {
        const response = await f.api.localFetch("/api/club", {
          method: "POST",
          body: JSON.stringify({
            action: "record",
            treeId: TREES[0].id,
            text: "  ",
            health: [],
            size: "medium",
            photoKey,
          }),
        });
        return response.ok;
      },
      f.api.localFetch,
    );
    assert.equal(saved, false);
    assert.equal(f.state().photos.length, 0);
  }
});

test("thrown save errors remove temporary uploads and retain the original error", async () => {
  const f = fixture();
  await assert.rejects(
    saveWithPhoto(
      f.upload,
      async () => {
        throw Error("save failed");
      },
      f.api.localFetch,
    ),
    /save failed/,
  );
  assert.equal(f.state().photos.length, 0);
});

test("a committed attachment survives a later UI refresh failure", async () => {
  const f = fixture();
  await assert.rejects(
    saveWithPhoto(
      f.upload,
      async (photoKey) => {
        const response = await f.api.localFetch("/api/club", {
          method: "POST",
          body: JSON.stringify({
            action: "record",
            treeId: TREES[0].id,
            text: "나무 관찰",
            health: [],
            size: "medium",
            photoKey,
          }),
        });
        assert.equal(response.status, 200);
        throw Error("refresh failed");
      },
      f.api.localFetch,
    ),
    /refresh failed/,
  );
  assert.equal(f.state().photos.length, 1);
  assert.equal(f.state().records[0].photoKey, f.state().photos[0].key);
});

test("successful photo attachment remains available", async () => {
  const f = fixture();
  const result = await saveWithPhoto(
    f.upload,
    async (photoKey) =>
      (
        await f.api.localFetch("/api/club", {
          method: "POST",
          body: JSON.stringify({
            action: "record",
            treeId: TREES[0].id,
            text: "나무 관찰",
            health: [],
            size: "medium",
            photoKey,
          }),
        })
      ).ok,
    f.api.localFetch,
  );
  assert.equal(result, true);
  assert.equal(f.state().photos.length, 1);
});
