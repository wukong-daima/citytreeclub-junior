import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  validProfile,
  validRecord,
  imageMime,
  HEALTH_INDICATORS,
} from "../lib/club.ts";
import { clubSession } from "../lib/club-session.ts";
function database() {
  const db = new DatabaseSync(":memory:");
  for (const file of [
    "0000_little_elektra.sql",
    "0001_pale_marvex.sql",
    "0002_freezing_wolverine.sql",
    "0003_dashing_toad_men.sql",
    "0004_thick_lethal_legion.sql",
    "0005_closed_morg.sql",
    "0006_elite_mentor.sql",
  ])
    db.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"),
    );
  db.prepare(
    "INSERT INTO gardens (id, tree_id, created_at) VALUES ('a', 'sample-01', '2026-10-01')",
  ).run();
  return db;
}
test("club session shares garden UUID and rejects forged malformed cookies", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.equal(
    clubSession(
      new Request("http://localhost", {
        headers: { cookie: `other=x; citytree_session=${id}` },
      }),
    ).id,
    id,
  );
  assert.notEqual(
    clubSession(
      new Request("http://localhost", {
        headers: { cookie: "citytree_session=malformed" },
      }),
    ).id,
    "malformed",
  );
});
test("profile enforces three areas and record enforces exact health vocabulary", () => {
  assert.equal(
    validProfile({ displayName: "나무늘보", areas: ["성동구", "강남구"] }),
    true,
  );
  assert.equal(validProfile({ displayName: "", areas: [] }), false);
  assert.equal(
    validProfile({ displayName: "친구", areas: ["a", "b", "c", "d"] }),
    false,
  );
  const input = {
    text: "오늘 잎을 관찰했어요",
    health: [HEALTH_INDICATORS[0]],
    girth: 90,
    size: "medium",
    visibility: "private",
  };
  assert.equal(validRecord(input), true);
  assert.equal(validRecord({ ...input, girth: null }), true);
  assert.equal(validRecord({ ...input, health: ["해당사항없음"] }), true);
  assert.equal(
    validRecord({ ...input, health: ["해당사항없음", HEALTH_INDICATORS[0]] }),
    false,
  );
  for (const patch of [
    { health: ["unknown"] },
    { health: [HEALTH_INDICATORS[0], HEALTH_INDICATORS[0]] },
    { girth: NaN },
    { girth: 0 },
    { visibility: "friends" },
    { size: "huge" },
  ])
    assert.equal(validRecord({ ...input, ...patch }), false);
});
test("photo signature validation rejects disguised HTML and SVG", () => {
  assert.equal(imageMime(new TextEncoder().encode("<svg onload=evil>")), null);
  assert.equal(
    imageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])),
    "image/png",
  );
  assert.equal(
    imageMime(new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    "image/jpeg",
  );
});
test("atomic max five adoption and parting cannot resynchronize departed active tree", () => {
  const db = database();
  const adopt = db.prepare(
    "INSERT OR IGNORE INTO club_owned (id, owner, tree_id) SELECT ?, 'a', ? WHERE (SELECT COUNT(*) FROM club_owned WHERE owner = 'a') < 5",
  );
  for (let i = 1; i <= 5; i++)
    assert.equal(adopt.run(String(i), `sample-0${i}`).changes, 1);
  assert.equal(adopt.run("six", "sample-06").changes, 0);
  db.exec("BEGIN");
  db.prepare(
    "DELETE FROM club_owned WHERE owner = 'a' AND tree_id = 'sample-01'",
  ).run();
  db.prepare(
    "UPDATE gardens SET tree_id = (SELECT tree_id FROM club_owned WHERE owner = 'a' ORDER BY rowid LIMIT 1), nickname = COALESCE((SELECT nickname FROM club_owned WHERE owner = 'a' ORDER BY rowid LIMIT 1), '') WHERE id = 'a' AND tree_id = 'sample-01'",
  ).run();
  db.exec("COMMIT");
  db.prepare(
    "INSERT OR IGNORE INTO club_owned (id, owner, tree_id, nickname) SELECT 'sync', id, tree_id, nickname FROM gardens WHERE id = 'a' AND tree_id IS NOT NULL AND (SELECT COUNT(*) FROM club_owned WHERE owner = 'a') < 5",
  ).run();
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS count FROM club_owned WHERE owner = 'a'")
      .get()?.count,
    4,
  );
  assert.equal(
    db.prepare("SELECT tree_id FROM gardens WHERE id = 'a'").get()?.tree_id,
    "sample-02",
  );
  db.close();
});
test("records visibility and comments query isolate private records", () => {
  const db = database();
  const insert = db.prepare(
    "INSERT INTO club_records (id, owner, tree_id, text, visibility, health, girth, size, created_at) VALUES (?, ?, 'sample-01', '안녕 나무', ?, '[]', 30, 'small', '2026-10-01')",
  );
  insert.run("private-a", "a", "private");
  insert.run("public-b", "b", "public");
  insert.run("private-b", "b", "private");
  const visible = db
    .prepare(
      "SELECT id FROM club_records WHERE owner = ? OR visibility = 'public' ORDER BY id",
    )
    .all("a");
  assert.deepEqual(
    visible.map((row) => row.id),
    ["private-a", "public-b"],
  );
  assert.equal(
    db
      .prepare(
        "SELECT id FROM club_records WHERE id = ? AND visibility = 'public'",
      )
      .get("private-a"),
    undefined,
  );
  db.close();
});
test("tree XP and decorations remain distinct while points aggregate all trees", () => {
  const db = database();
  db.prepare(
    "INSERT INTO club_owned (id, owner, tree_id, nickname, decoration) VALUES ('a1','a','sample-01','첫나무','ribbon'), ('a2','a','sample-02','둘째','none')",
  ).run();
  const insert = db.prepare(
    "INSERT INTO actions (id, garden_id, tree_id, action, day, xp, text, created_at) VALUES (?, 'a', ?, ?, ?, ?, '', '2026-10-01')",
  );
  insert.run("water-a", "sample-01", "water", "2026-10-01", 10);
  insert.run("name-a", "sample-01", "rename", "sample-01", 10);
  insert.run("name-b", "sample-02", "rename", "sample-02", 10);
  const xp = db.prepare(
    "SELECT COALESCE(SUM(xp), 0) AS xp FROM actions WHERE garden_id = 'a' AND tree_id = (SELECT tree_id FROM gardens WHERE id = 'a')",
  );
  assert.equal(xp.get()?.xp, 20);
  db.prepare(
    "UPDATE gardens SET tree_id = 'sample-02', nickname = (SELECT nickname FROM club_owned WHERE owner='a' AND tree_id='sample-02'), decoration = (SELECT decoration FROM club_owned WHERE owner='a' AND tree_id='sample-02') WHERE id='a'",
  ).run();
  assert.equal(xp.get()?.xp, 10);
  assert.equal(
    db
      .prepare("SELECT SUM(xp) AS points FROM actions WHERE garden_id='a'")
      .get()?.points,
    30,
  );
  assert.equal(
    db.prepare("SELECT decoration FROM gardens WHERE id='a'").get()?.decoration,
    "none",
  );
  assert.equal(
    db
      .prepare(
        "SELECT decoration FROM club_owned WHERE owner='a' AND tree_id='sample-01'",
      )
      .get()?.decoration,
    "ribbon",
  );
  db.close();
});
test("game run cannot reward a different active tree", () => {
  const db = database();
  db.prepare(
    "INSERT INTO game_runs (id,garden_id,tree_id,game,targets,started_at) VALUES ('g','a','sample-01','soil','[]','2026-10-01')",
  ).run();
  db.prepare("UPDATE gardens SET tree_id='sample-02' WHERE id='a'").run();
  const eligible = db.prepare(
    "SELECT 1 FROM game_runs r JOIN gardens g ON g.id=r.garden_id AND g.tree_id=r.tree_id WHERE r.id='g' AND r.garden_id='a' AND r.completed_at IS NULL",
  );
  assert.equal(eligible.get(), undefined);
  db.prepare("UPDATE gardens SET tree_id='sample-01' WHERE id='a'").run();
  assert.ok(eligible.get());
  db.close();
});
test("physical application preserves its target after changing active tree", () => {
  const db = database();
  db.prepare(
    "INSERT INTO applications (id, garden_id, tree_id, kind, message, start_date, end_date, status, created_at) VALUES ('event', 'a', 'sample-01', 'nameplate', '나무 친구', '2026-10-02', '2026-10-04', 'demo_pending', '2026-10-01')",
  ).run();
  db.prepare("UPDATE gardens SET tree_id='sample-02' WHERE id='a'").run();
  assert.equal(
    db.prepare("SELECT tree_id FROM applications WHERE id='event'").get()
      ?.tree_id,
    "sample-01",
  );
  db.close();
});
