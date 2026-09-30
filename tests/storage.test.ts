import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../drizzle/0000_little_elektra.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    readFileSync(
      new URL("../drizzle/0001_pale_marvex.sql", import.meta.url),
      "utf8",
    ),
  );
  db.prepare("INSERT INTO gardens (id, created_at) VALUES (?, ?)").run(
    "session-a",
    "2026-09-30",
  );
  return db;
}
test("daily action limit preserves XP and allows the next day", () => {
  const db = database();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO actions (id, garden_id, action, day, xp, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  assert.equal(
    insert.run("a", "session-a", "water", "2026-09-30", 10, "", "2026-09-30")
      .changes,
    1,
  );
  assert.equal(
    insert.run("b", "session-a", "water", "2026-09-30", 10, "", "2026-09-30")
      .changes,
    0,
  );
  assert.equal(
    insert.run("c", "session-a", "water", "2026-10-01", 10, "", "2026-10-01")
      .changes,
    1,
  );
  assert.equal(
    db
      .prepare("SELECT SUM(xp) AS xp FROM actions WHERE garden_id = ?")
      .get("session-a")?.xp,
    20,
  );
  db.close();
});
test("assignment is atomic and cannot overwrite an existing tree", () => {
  const db = database();
  const assign = db.prepare(
    "UPDATE gardens SET tree_id = ? WHERE id = ? AND tree_id IS NULL",
  );
  assert.equal(assign.run("sample-01", "session-a").changes, 1);
  assert.equal(assign.run("sample-02", "session-a").changes, 0);
  assert.equal(
    db.prepare("SELECT tree_id FROM gardens WHERE id = ?").get("session-a")
      ?.tree_id,
    "sample-01",
  );
  db.close();
});
test("naming reward is once ever and game rewards are once per game per day", () => {
  const db = database();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO actions (id, garden_id, action, day, xp, text, created_at) VALUES (?, 'session-a', ?, ?, ?, '', '2026-10-01')",
  );
  assert.equal(insert.run("n1", "rename", "once", 10).changes, 1);
  assert.equal(insert.run("n2", "rename", "once", 10).changes, 0);
  assert.equal(insert.run("g1", "game:bugs", "2026-10-01", 25).changes, 1);
  assert.equal(insert.run("g2", "game:bugs", "2026-10-01", 25).changes, 0);
  assert.equal(insert.run("g3", "game:prune", "2026-10-01", 25).changes, 1);
  assert.equal(insert.run("g4", "game:bugs", "2026-10-02", 25).changes, 1);
  assert.equal(db.prepare("SELECT SUM(xp) AS xp FROM actions").get()?.xp, 85);
  db.close();
});
test("game reward requires unfinished session-owned run and cannot be replayed", () => {
  const db = database();
  db.prepare(
    "INSERT INTO game_runs (id, garden_id, game, targets, started_at) VALUES ('run', 'session-a', 'soil', '[]', '2026-10-01')",
  ).run();
  const reward = db.prepare(
    "INSERT OR IGNORE INTO actions (id, garden_id, action, day, xp, text, created_at) SELECT ?, ?, 'game:soil', ?, 25, '', '2026-10-01' WHERE EXISTS (SELECT 1 FROM game_runs WHERE id = 'run' AND garden_id = ? AND completed_at IS NULL)",
  );
  assert.equal(
    reward.run("foreign", "other", "2026-10-01", "other").changes,
    0,
  );
  assert.equal(
    reward.run("first", "session-a", "2026-10-01", "session-a").changes,
    1,
  );
  db.prepare(
    "UPDATE game_runs SET completed_at = '2026-10-01' WHERE id = 'run'",
  ).run();
  assert.equal(
    reward.run("replay", "session-a", "2026-10-02", "session-a").changes,
    0,
  );
  db.close();
});
test("physical applications remain demo pending and deduplicate by kind", () => {
  const db = database();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO applications (id, garden_id, kind, message, start_date, end_date, status, created_at) VALUES (?, 'session-a', ?, '안녕 나무', '2026-10-02', '2026-10-04', 'demo_pending', '2026-10-01')",
  );
  assert.equal(insert.run("p1", "nameplate").changes, 1);
  assert.equal(insert.run("p2", "nameplate").changes, 0);
  assert.equal(insert.run("p3", "message").changes, 1);
  assert.equal(
    db.prepare("SELECT status FROM applications WHERE id = 'p1'").get()?.status,
    "demo_pending",
  );
  db.close();
});
