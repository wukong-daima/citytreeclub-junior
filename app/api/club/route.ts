import { database } from "@/lib/storage";
import { TREES } from "@/lib/trees";
import { candidates, validLocation } from "@/lib/domain";
import {
  HEALTH_INDICATORS,
  clubText,
  validProfile,
  validRecord,
} from "@/lib/club";
import { clubSession, clubReply, sameOrigin } from "@/lib/club-session";
import { env } from "cloudflare:workers";

async function ensure(id: string) {
  const db = database();
  await db
    .prepare("INSERT OR IGNORE INTO gardens (id, created_at) VALUES (?, ?)")
    .bind(id, new Date().toISOString())
    .run();
  await db
    .prepare("INSERT OR IGNORE INTO club_profiles (id) VALUES (?)")
    .bind(id)
    .run();
  // Only the active garden is synchronized. Parting clears/replaces it in the same transaction.
  await db
    .prepare(
      "INSERT OR IGNORE INTO club_owned (id, owner, tree_id, nickname, decoration) SELECT ?, id, tree_id, nickname, decoration FROM gardens WHERE id = ? AND tree_id IS NOT NULL AND (SELECT COUNT(*) FROM club_owned WHERE owner = ?) < 5",
    )
    .bind(crypto.randomUUID(), id, id)
    .run();
  await db
    .prepare(
      "UPDATE club_owned SET nickname = (SELECT nickname FROM gardens WHERE id = ?), decoration = (SELECT decoration FROM gardens WHERE id = ?) WHERE owner = ? AND tree_id = (SELECT tree_id FROM gardens WHERE id = ?)",
    )
    .bind(id, id, id, id)
    .run();
}
async function state(id: string) {
  const db = database();
  const profile = await db
    .prepare("SELECT display_name, areas FROM club_profiles WHERE id = ?")
    .bind(id)
    .first<{ display_name: string; areas: string }>();
  const { results: owned } = await db
    .prepare("SELECT * FROM club_owned WHERE owner = ? ORDER BY rowid")
    .bind(id)
    .all<{
      tree_id: string;
      nickname: string;
      health: string;
      girth: number | null;
      size: string;
      species: string;
    }>();
  const { results: favorites } = await db
    .prepare("SELECT tree_id FROM club_favorites WHERE owner = ?")
    .bind(id)
    .all<{ tree_id: string }>();
  const { results: records } = await db
    .prepare(
      "SELECT r.*, p.display_name AS author FROM club_records r LEFT JOIN club_profiles p ON p.id = r.owner WHERE r.owner = ? OR r.visibility = 'public' ORDER BY r.created_at DESC LIMIT 100",
    )
    .bind(id)
    .all<{
      id: string;
      owner: string;
      tree_id: string;
      text: string;
      photo_key: string | null;
      visibility: string;
      health: string;
      girth: number;
      size: string;
      created_at: string;
      author: string;
    }>();
  const { results: comments } = await db
    .prepare(
      "SELECT c.*, p.display_name AS author FROM club_comments c LEFT JOIN club_profiles p ON p.id = c.owner JOIN club_records r ON r.id = c.record_id WHERE r.visibility = 'public' OR r.owner = ? ORDER BY c.created_at",
    )
    .bind(id)
    .all<{
      id: string;
      owner: string;
      record_id: string;
      author: string;
      text: string;
      photo_key: string | null;
      created_at: string;
    }>();
  const { results: likes } = await db
    .prepare(
      "SELECT l.record_id, COUNT(*) AS count, MAX(CASE WHEN l.owner = ? THEN 1 ELSE 0 END) AS liked FROM club_likes l JOIN club_records r ON r.id = l.record_id WHERE r.visibility = 'public' OR r.owner = ? GROUP BY l.record_id",
    )
    .bind(id, id)
    .all<{ record_id: string; count: number; liked: number }>();
  const { results: notifications } = await db
    .prepare(
      "SELECT id, text, read, created_at AS createdAt FROM club_notifications WHERE owner = ? ORDER BY created_at DESC LIMIT 100",
    )
    .bind(id)
    .all<{ id: string; text: string; read: number; createdAt: string }>();
  const { results: reportRows } = await db
    .prepare(
      "SELECT id, tree_id AS treeId, text, kind, details, status, created_at AS createdAt FROM club_reports WHERE owner = ? ORDER BY created_at DESC",
    )
    .bind(id)
    .all<{
      id: string;
      treeId: string;
      text: string;
      kind: string;
      details: string;
      status: string;
      createdAt: string;
    }>();
  const reports = reportRows.map((r) => ({
    ...r,
    details: JSON.parse(r.details),
  }));
  return {
    profile: {
      displayName: profile?.display_name ?? "나무 친구",
      areas: JSON.parse(profile?.areas ?? "[]"),
    },
    myTrees: owned.map((o) => ({
      tree: TREES.find((t) => t.id === o.tree_id),
      nickname: o.nickname,
      health: JSON.parse(o.health),
      girth: o.girth || null,
      size: o.size,
      species: o.species || TREES.find((t) => t.id === o.tree_id)?.species,
    })),
    favorites: TREES.filter((t) => favorites.some((f) => f.tree_id === t.id)),
    records: records.map((r) => ({
      id: r.id,
      treeId: r.tree_id,
      author: r.author ?? "떠난 친구",
      text: r.text,
      photoUrl: r.photo_key
        ? `/api/photos?key=${encodeURIComponent(r.photo_key)}`
        : null,
      visibility: r.visibility,
      health: JSON.parse(r.health),
      girth: r.girth || null,
      size: r.size,
      createdAt: r.created_at,
      mine: r.owner === id,
      liked: !!likes.find((l) => l.record_id === r.id)?.liked,
      likeCount: likes.find((l) => l.record_id === r.id)?.count ?? 0,
      comments: comments
        .filter((c) => c.record_id === r.id)
        .map((c) => ({
          id: c.id,
          author: c.author ?? "떠난 친구",
          text: c.text,
          createdAt: c.created_at,
          mine: c.owner === id,
          photoUrl: c.photo_key
            ? `/api/photos?key=${encodeURIComponent(c.photo_key)}`
            : null,
        })),
    })),
    notifications: notifications.map((n) => ({ ...n, read: !!n.read })),
    reports,
    healthIndicators: HEALTH_INDICATORS,
  };
}
async function removeUnusedPhoto(key: string | null) {
  if (!key) return;
  const db = database();
  if (
    await db
      .prepare(
        "SELECT id FROM club_records WHERE photo_key = ? UNION ALL SELECT id FROM club_comments WHERE photo_key = ? UNION ALL SELECT id FROM club_reports WHERE json_extract(details, '$.photoKey') = ? LIMIT 1",
      )
      .bind(key, key, key)
      .first()
  )
    return;
  if (!env.BUCKET) throw new Error("BUCKET_UNAVAILABLE");
  await env.BUCKET.delete(key);
  await db.prepare("DELETE FROM club_photos WHERE key = ?").bind(key).run();
}
export async function GET(request: Request) {
  const { id, cookie } = clubSession(request);
  try {
    await ensure(id);
    return clubReply(await state(id), cookie);
  } catch {
    return clubReply({ error: "나무모임을 불러오지 못했어요." }, cookie, 503);
  }
}
export async function POST(request: Request) {
  const { id, cookie } = clubSession(request),
    db = database();
  const fail = (error: string, status = 400) =>
    clubReply({ error }, cookie, status);
  if (!sameOrigin(request)) return fail("같은 사이트에서 요청해 주세요.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail("JSON 요청이 필요해요.", 415);
  if (Number(request.headers.get("content-length")) > 12000)
    return fail("요청이 너무 커요.", 413);
  try {
    const raw = await request.text();
    if (raw.length > 12000) return fail("요청이 너무 커요.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail("요청을 읽을 수 없어요.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return fail("요청을 확인해 주세요.");
    await ensure(id);
    const tree = TREES.find((t) => t.id === body.treeId),
      now = new Date().toISOString();
    if (body.action === "adopt") {
      if (!validLocation(body.lat, body.lng, body.radius))
        return fail("위치와 반경을 선택해 주세요.");
      const nearby = candidates(
        TREES,
        body.lat as number,
        body.lng as number,
        body.radius as number,
      );
      const { results: mine } = await db
        .prepare("SELECT tree_id FROM club_owned WHERE owner = ?")
        .bind(id)
        .all<{ tree_id: string }>();
      const available = nearby.filter(
        (t) => !mine.some((m) => m.tree_id === t.id),
      );
      if (mine.length >= 5)
        return fail("나무 친구는 최대 5그루까지 만날 수 있어요.", 409);
      if (!available.length)
        return fail(
          "가까운 10그루 중 새 친구가 없어요. 위치나 반경을 바꿔 주세요.",
          404,
        );
      const limit =
        Math.floor(4294967296 / available.length) * available.length;
      let draw: number;
      do {
        draw = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (draw >= limit);
      const selected = available[draw % available.length];
      const result = await db
        .prepare(
          "INSERT OR IGNORE INTO club_owned (id, owner, tree_id) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM club_owned WHERE owner = ?) < 5",
        )
        .bind(crypto.randomUUID(), id, selected.id, id)
        .run();
      if (!result.meta.changes)
        return fail("이미 친구가 되었거나 5그루를 모두 만났어요.", 409);
      await db
        .prepare(
          "UPDATE gardens SET tree_id = ?, nickname = '', decoration = 'none' WHERE id = ? AND tree_id IS NULL",
        )
        .bind(selected.id, id)
        .run();
    } else if (body.action === "select") {
      if (!tree) return fail("나무를 확인해 주세요.");
      const result = await db
        .prepare(
          "UPDATE gardens SET tree_id = ?, nickname = (SELECT nickname FROM club_owned WHERE owner = ? AND tree_id = ?), decoration = (SELECT decoration FROM club_owned WHERE owner = ? AND tree_id = ?) WHERE id = ? AND EXISTS (SELECT 1 FROM club_owned WHERE owner = ? AND tree_id = ?)",
        )
        .bind(tree.id, id, tree.id, id, tree.id, id, id, tree.id)
        .run();
      if (!result.meta.changes) return fail("내 나무만 선택할 수 있어요.", 403);
    } else if (body.action === "part") {
      if (!tree) return fail("나무를 확인해 주세요.");
      await db.batch([
        db
          .prepare("DELETE FROM club_owned WHERE owner = ? AND tree_id = ?")
          .bind(id, tree.id),
        db
          .prepare(
            "UPDATE gardens SET tree_id = (SELECT tree_id FROM club_owned WHERE owner = ? ORDER BY rowid LIMIT 1), nickname = COALESCE((SELECT nickname FROM club_owned WHERE owner = ? ORDER BY rowid LIMIT 1), ''), decoration = COALESCE((SELECT decoration FROM club_owned WHERE owner = ? ORDER BY rowid LIMIT 1), 'none') WHERE id = ? AND tree_id = ?",
          )
          .bind(id, id, id, id, tree.id),
      ]);
    } else if (body.action === "favorite") {
      if (!tree) return fail("나무를 확인해 주세요.");
      const removed = await db
        .prepare("DELETE FROM club_favorites WHERE owner = ? AND tree_id = ?")
        .bind(id, tree.id)
        .run();
      if (!removed.meta.changes)
        await db
          .prepare(
            "INSERT OR IGNORE INTO club_favorites (id, owner, tree_id) VALUES (?, ?, ?)",
          )
          .bind(crypto.randomUUID(), id, tree.id)
          .run();
    } else if (body.action === "profile") {
      if (!validProfile(body))
        return fail(
          "별명은 1~20자, 활동 지역은 중복 없이 최대 3곳까지 적어 주세요.",
        );
      await db
        .prepare(
          "UPDATE club_profiles SET display_name = ?, areas = ? WHERE id = ?",
        )
        .bind(
          (body.displayName as string).trim(),
          JSON.stringify((body.areas as string[]).map((v) => v.trim())),
          id,
        )
        .run();
    } else if (body.action === "record") {
      if (!tree || !validRecord(body))
        return fail(
          "관찰 내용·건강 상태·둘레(0~3000cm)·크기·공개 범위를 확인해 주세요.",
        );
      const mine = await db
        .prepare("SELECT id FROM club_owned WHERE owner = ? AND tree_id = ?")
        .bind(id, tree.id)
        .first();
      if (!mine && body.nickname !== undefined)
        return fail("다른 친구의 나무 이름은 바꿀 수 없어요.", 403);
      if (
        body.photoKey !== undefined &&
        (typeof body.photoKey !== "string" ||
          !(await db
            .prepare("SELECT key FROM club_photos WHERE key = ? AND owner = ?")
            .bind(body.photoKey, id)
            .first()))
      )
        return fail("직접 업로드한 사진을 선택해 주세요.");
      const nickname =
        typeof body.nickname === "string" ? body.nickname.trim() : null;
      await db.batch([
        db
          .prepare(
            "INSERT INTO club_records (id, owner, tree_id, text, photo_key, visibility, health, girth, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            tree.id,
            (body.text as string).trim(),
            body.photoKey ?? null,
            body.visibility,
            JSON.stringify(body.health),
            body.girth ?? 0,
            body.size,
            now,
          ),
        db
          .prepare(
            "UPDATE club_owned SET health = ?, girth = ?, size = ?, nickname = COALESCE(?, nickname), species = COALESCE(?, species) WHERE owner = ? AND tree_id = ?",
          )
          .bind(
            JSON.stringify(body.health),
            body.girth ?? null,
            body.size,
            nickname,
            body.species ?? null,
            id,
            tree.id,
          ),
        db
          .prepare(
            "UPDATE gardens SET nickname = COALESCE(?, nickname) WHERE id = ? AND tree_id = ?",
          )
          .bind(nickname, id, tree.id),
      ]);
    } else if (body.action === "comment") {
      if (typeof body.recordId !== "string" || !clubText(body.text, 1, 300))
        return fail("댓글을 1~300자로 적어 주세요.");
      const record = await db
        .prepare(
          "SELECT owner FROM club_records WHERE id = ? AND visibility = 'public'",
        )
        .bind(body.recordId)
        .first<{ owner: string }>();
      if (!record) return fail("공개된 기록에만 댓글을 달 수 있어요.", 404);
      if (
        body.photoKey !== undefined &&
        (typeof body.photoKey !== "string" ||
          !(await db
            .prepare("SELECT key FROM club_photos WHERE key = ? AND owner = ?")
            .bind(body.photoKey, id)
            .first()))
      )
        return fail("직접 업로드한 사진을 선택해 주세요.");
      await db.batch([
        db
          .prepare(
            "INSERT INTO club_comments (id, owner, record_id, text, photo_key, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            body.recordId,
            body.text.trim(),
            body.photoKey ?? null,
            now,
          ),
        db
          .prepare(
            "INSERT INTO club_notifications (id, owner, text, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            record.owner,
            "내 나무의 공개 관찰 기록에 새 댓글이 도착했어요.",
            now,
          ),
      ]);
    } else if (body.action === "like") {
      if (
        typeof body.recordId !== "string" ||
        !(await db
          .prepare(
            "SELECT id FROM club_records WHERE id = ? AND visibility = 'public'",
          )
          .bind(body.recordId)
          .first())
      )
        return fail("공개 기록을 선택해 주세요.", 404);
      const result = await db
        .prepare("DELETE FROM club_likes WHERE owner = ? AND record_id = ?")
        .bind(id, body.recordId)
        .run();
      if (!result.meta.changes)
        await db
          .prepare(
            "INSERT OR IGNORE INTO club_likes (id, owner, record_id) VALUES (?, ?, ?)",
          )
          .bind(crypto.randomUUID(), id, body.recordId)
          .run();
    } else if (
      body.action === "edit-record" ||
      body.action === "delete-record" ||
      body.action === "delete-photo"
    ) {
      if (typeof body.recordId !== "string")
        return fail("기록을 선택해 주세요.");
      const record = await db
        .prepare(
          "SELECT photo_key FROM club_records WHERE id = ? AND owner = ?",
        )
        .bind(body.recordId, id)
        .first<{ photo_key: string | null }>();
      if (!record) return fail("내 기록만 변경할 수 있어요.", 403);
      if (body.action === "edit-record") {
        if (!clubText(body.text, 2, 1000))
          return fail("기록을 2~1000자로 적어 주세요.");
        await db
          .prepare(
            "UPDATE club_records SET text = ? WHERE id = ? AND owner = ?",
          )
          .bind(body.text.trim(), body.recordId, id)
          .run();
      } else if (body.action === "delete-photo") {
        await db
          .prepare(
            "UPDATE club_records SET photo_key = NULL WHERE id = ? AND owner = ?",
          )
          .bind(body.recordId, id)
          .run();
        await removeUnusedPhoto(record.photo_key);
      } else {
        const { results: commentPhotos } = await db
          .prepare(
            "SELECT photo_key FROM club_comments WHERE record_id = ? AND photo_key IS NOT NULL",
          )
          .bind(body.recordId)
          .all<{ photo_key: string }>();
        await db.batch([
          db
            .prepare("DELETE FROM club_comments WHERE record_id = ?")
            .bind(body.recordId),
          db
            .prepare("DELETE FROM club_likes WHERE record_id = ?")
            .bind(body.recordId),
          db
            .prepare("DELETE FROM club_records WHERE id = ? AND owner = ?")
            .bind(body.recordId, id),
        ]);
        for (const key of new Set([
          record.photo_key,
          ...commentPhotos.map((p) => p.photo_key),
        ]))
          await removeUnusedPhoto(key);
      }
    } else if (
      body.action === "edit-comment" ||
      body.action === "delete-comment" ||
      body.action === "delete-comment-photo"
    ) {
      if (typeof body.commentId !== "string")
        return fail("댓글을 선택해 주세요.");
      const comment = await db
        .prepare(
          "SELECT photo_key FROM club_comments WHERE id = ? AND owner = ?",
        )
        .bind(body.commentId, id)
        .first<{ photo_key: string | null }>();
      if (!comment) return fail("내 댓글만 변경할 수 있어요.", 403);
      if (body.action === "edit-comment") {
        if (!clubText(body.text, 1, 300))
          return fail("댓글을 1~300자로 적어 주세요.");
        await db
          .prepare(
            "UPDATE club_comments SET text = ? WHERE id = ? AND owner = ?",
          )
          .bind(body.text.trim(), body.commentId, id)
          .run();
      } else if (body.action === "delete-comment-photo") {
        await db
          .prepare(
            "UPDATE club_comments SET photo_key = NULL WHERE id = ? AND owner = ?",
          )
          .bind(body.commentId, id)
          .run();
        await removeUnusedPhoto(comment.photo_key);
      } else {
        await db
          .prepare("DELETE FROM club_comments WHERE id = ? AND owner = ?")
          .bind(body.commentId, id)
          .run();
        await removeUnusedPhoto(comment.photo_key);
      }
    } else if (body.action === "mark-read") {
      if (typeof body.notificationId !== "string")
        return fail("알림을 선택해 주세요.");
      await db
        .prepare(
          "UPDATE club_notifications SET read = 1 WHERE owner = ? AND id = ?",
        )
        .bind(id, body.notificationId)
        .run();
    } else if (body.action === "report") {
      const kind = body.kind ?? "error";
      if (
        !["error", "addition", "removal"].includes(kind as string) ||
        !clubText(body.text, 2, 1000) ||
        (kind !== "addition" && !tree)
      )
        return fail("나무와 2~1000자 제보 내용을 확인해 주세요.");
      let details = {};
      if (kind === "addition" || kind === "removal") {
        if (
          typeof body.photoKey !== "string" ||
          !(await db
            .prepare("SELECT key FROM club_photos WHERE key = ? AND owner = ?")
            .bind(body.photoKey, id)
            .first())
        )
          return fail("추가·삭제 제보에는 직접 업로드한 사진이 필요해요.");
        if (
          !validLocation(body.lat, body.lng, 300) ||
          !clubText(body.species, 1, 30) ||
          !validRecord({ ...body, visibility: "private" })
        )
          return fail("위치·수종·건강 상태·크기를 확인해 주세요.");
        details = {
          lat: body.lat,
          lng: body.lng,
          species: body.species.trim(),
          health: body.health,
          girth: body.girth ?? null,
          size: body.size,
          photoKey: body.photoKey,
          photoUrl: `/api/photos?key=${encodeURIComponent(body.photoKey)}`,
        };
      }
      await db.batch([
        db
          .prepare(
            "INSERT INTO club_reports (id, owner, tree_id, text, kind, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            tree?.id ?? "",
            (body.text as string).trim(),
            kind,
            JSON.stringify(details),
            now,
          ),
        db
          .prepare(
            "INSERT INTO club_notifications (id, owner, text, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "지도 오류 제보가 체험 기록으로 저장되었어요. 운영기관으로 전송되지 않아요.",
            now,
          ),
      ]);
    } else if (body.action === "account-delete") {
      if (body.confirm !== true) return fail("삭제 확인이 필요해요.");
      const { results: photos } = await db
        .prepare("SELECT key FROM club_photos WHERE owner = ?")
        .bind(id)
        .all<{ key: string }>();
      if (photos.length && !env.BUCKET)
        return fail("사진 저장소 연결 후 삭제를 다시 시도해 주세요.", 503);
      if (photos.length) await env.BUCKET.delete(photos.map((p) => p.key));
      await db.batch([
        db
          .prepare(
            "DELETE FROM club_likes WHERE owner = ? OR record_id IN (SELECT id FROM club_records WHERE owner = ?)",
          )
          .bind(id, id),
        db
          .prepare(
            "DELETE FROM club_comments WHERE owner = ? OR record_id IN (SELECT id FROM club_records WHERE owner = ?)",
          )
          .bind(id, id),
        ...[
          "club_records",
          "club_owned",
          "club_favorites",
          "club_notifications",
          "club_reports",
          "club_photos",
        ].map((table) =>
          db.prepare(`DELETE FROM ${table} WHERE owner = ?`).bind(id),
        ),
        db.prepare("DELETE FROM club_profiles WHERE id = ?").bind(id),
        ...["actions", "applications", "game_runs"].map((table) =>
          db.prepare(`DELETE FROM ${table} WHERE garden_id = ?`).bind(id),
        ),
        db.prepare("DELETE FROM gardens WHERE id = ?").bind(id),
      ]);
      return clubReply(
        { deleted: true },
        cookie.replace("Max-Age=31536000", "Max-Age=0"),
      );
    } else return fail("지원하지 않는 기능이에요.");
    return clubReply(await state(id), cookie);
  } catch {
    return fail("변경을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 503);
  }
}
