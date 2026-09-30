import {
  ACTION_XP,
  GAMES,
  candidates,
  distanceMeters,
  growth,
  seoulDay,
  validLocation,
  validNickname,
  validGameFinish,
  physicalApplication,
  type GameTarget,
} from "@/lib/domain";
import { TREES } from "@/lib/trees";
import { database } from "@/lib/storage";
type GardenRow = {
  id: string;
  tree_id: string | null;
  decoration: string;
  nickname: string;
  tutorial_completed: number;
};
type ActionRow = {
  id: string;
  tree_id: string | null;
  action: string;
  xp: number;
  text: string;
  created_at: string;
  day: string;
};
const cookieName = "citytree_session";
function session(request: Request) {
  const existing = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const id =
    existing &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      existing,
    )
      ? existing
      : crypto.randomUUID();
  return {
    id,
    cookie: `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
async function ensureGarden(id: string) {
  await database()
    .prepare("INSERT OR IGNORE INTO gardens (id, created_at) VALUES (?, ?)")
    .bind(id, new Date().toISOString())
    .run();
}
async function state(id: string) {
  const db = database(),
    garden = await db
      .prepare("SELECT * FROM gardens WHERE id = ?")
      .bind(id)
      .first<GardenRow>();
  const { results: allActions } = await db
    .prepare(
      "SELECT * FROM actions WHERE garden_id = ? ORDER BY created_at DESC",
    )
    .bind(id)
    .all<ActionRow>();
  const results = allActions.filter(
    (row) => garden?.tree_id && row.tree_id === garden.tree_id,
  );
  const xp = results.reduce((sum, row) => sum + row.xp, 0);
  const { results: applications } = await db
    .prepare(
      "SELECT id, tree_id AS treeId, kind, message, start_date AS startDate, end_date AS endDate, status FROM applications WHERE garden_id = ? ORDER BY created_at DESC",
    )
    .bind(id)
    .all();
  return {
    tree: TREES.find((tree) => tree.id === garden?.tree_id) ?? null,
    xp,
    growth: growth(xp),
    visits: results.filter((row) =>
      ["visit", "demo-visit"].includes(row.action),
    ).length,
    verifiedVisits: results.filter((row) => row.action === "visit").length,
    water: results.filter((row) => row.action === "water").length,
    compost: results.filter((row) => row.action === "compost").length,
    nickname: garden?.nickname ?? "",
    tutorialCompleted: !!garden?.tutorial_completed,
    points: allActions.reduce((sum, row) => sum + row.xp, 0),
    applications,
    gameWins: results.filter((row) => row.action.startsWith("game:")).length,
    careDays: new Set(
      results
        .filter((row) => row.xp > 0)
        .map((row) => seoulDay(new Date(row.created_at))),
    ).size,
    decoration: garden?.decoration ?? "none",
    interests: allActions
      .filter((row) => row.action.startsWith("interest:"))
      .map((row) => row.action.slice(9)),
    todayActions: allActions
      .filter((row) => row.day === seoulDay())
      .map((row) => row.action),
    logs: results
      .filter((row) => !row.action.startsWith("interest:"))
      .slice(0, 50)
      .map((row) => ({
        id: row.id,
        action: row.action,
        text: row.text,
        xp: row.xp,
        createdAt: row.created_at,
      })),
  };
}
function reply(body: unknown, cookie: string, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Set-Cookie": cookie, "Cache-Control": "private, no-store" },
  });
}
function fail(cookie: string, error: string, status = 400) {
  return reply({ error }, cookie, status);
}
export async function GET(request: Request) {
  const { id, cookie } = session(request);
  try {
    await ensureGarden(id);
    return reply(await state(id), cookie);
  } catch {
    return fail(
      cookie,
      "정원을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      503,
    );
  }
}
export async function POST(request: Request) {
  const { id, cookie } = session(request);
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return fail(cookie, "같은 사이트에서만 정원을 변경할 수 있어요.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail(cookie, "JSON 요청이 필요해요.", 415);
  if (Number(request.headers.get("content-length")) > 4096)
    return fail(cookie, "요청 내용이 너무 길어요.", 413);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return fail(cookie, "요청 내용이 너무 길어요.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(cookie, "요청 내용을 읽을 수 없어요.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return fail(cookie, "요청 내용을 확인해 주세요.");
    const action = body.action;
    await ensureGarden(id);
    const current = await state(id),
      db = database();
    if (action === "assign") {
      if (current.tree)
        return fail(cookie, "이미 인연을 맺은 나무가 있어요.", 409);
      if (!validLocation(body.lat, body.lng, body.radius))
        return fail(cookie, "올바른 위치와 반경을 선택해 주세요.");
      const nearby = candidates(
        TREES,
        body.lat as number,
        body.lng as number,
        body.radius as number,
      );
      if (!nearby.length)
        return fail(
          cookie,
          "선택한 반경에 나무가 없어요. 반경을 넓히거나 서울숲 체험 위치를 선택해 주세요.",
          404,
        );
      const limit = Math.floor(4294967296 / nearby.length) * nearby.length;
      let draw: number;
      do {
        draw = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (draw >= limit);
      const result = await db
        .prepare(
          "UPDATE gardens SET tree_id = ? WHERE id = ? AND tree_id IS NULL",
        )
        .bind(nearby[draw % nearby.length].id, id)
        .run();
      if (!result.meta.changes)
        return fail(cookie, "이미 인연을 맺은 나무가 있어요.", 409);
    } else {
      if (!current.tree)
        return fail(cookie, "먼저 나무와 인연을 맺어 주세요.", 409);
      if (action === "rename") {
        if (!validNickname(body.name))
          return fail(cookie, "이름은 제어문자 없이 1~16자로 적어 주세요.");
        await db.batch([
          db
            .prepare(
              "UPDATE gardens SET nickname = ? WHERE id = ? AND tree_id = ?",
            )
            .bind(body.name.trim(), id, current.tree.id),
          db
            .prepare(
              "UPDATE club_owned SET nickname = ? WHERE owner = ? AND tree_id = ?",
            )
            .bind(body.name.trim(), id, current.tree.id),
          db
            .prepare(
              "INSERT OR IGNORE INTO actions (id, garden_id, tree_id, action, day, xp, text, created_at) VALUES (?, ?, ?, 'rename', ?, 10, ?, ?)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              current.tree.id,
              current.tree.id,
              "나무에게 첫 이름을 선물했어요",
              new Date().toISOString(),
            ),
        ]);
      } else if (action === "tutorial-complete") {
        await db
          .prepare("UPDATE gardens SET tutorial_completed = 1 WHERE id = ?")
          .bind(id)
          .run();
      } else if (action === "game-start") {
        if (
          typeof body.game !== "string" ||
          !(GAMES as readonly string[]).includes(body.game)
        )
          return fail(cookie, "미니게임을 선택해 주세요.");
        if (current.todayActions.includes(`game:${body.game}`))
          return fail(
            cookie,
            "이 게임의 오늘 경험치는 이미 받았어요. 내일 다시 만나요!",
            409,
          );
        const gameRun = {
          id: crypto.randomUUID(),
          game: body.game,
          targets: Array.from({ length: 5 }, () => ({
            id: crypto.randomUUID(),
            x: 15 + (crypto.getRandomValues(new Uint32Array(1))[0] % 70),
            y: 18 + (crypto.getRandomValues(new Uint32Array(1))[0] % 60),
          })),
          startedAt: new Date().toISOString(),
        };
        await db
          .prepare(
            "INSERT INTO game_runs (id, garden_id, tree_id, game, targets, started_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            gameRun.id,
            id,
            current.tree.id,
            gameRun.game,
            JSON.stringify(gameRun.targets),
            gameRun.startedAt,
          )
          .run();
        return reply({ ...(await state(id)), gameRun }, cookie);
      } else if (action === "game-finish") {
        if (typeof body.runId !== "string")
          return fail(cookie, "진행 중인 게임이 없어요.");
        const run = await db
          .prepare("SELECT * FROM game_runs WHERE id = ? AND garden_id = ?")
          .bind(body.runId, id)
          .first<{
            id: string;
            tree_id: string | null;
            game: string;
            targets: string;
            started_at: string;
            completed_at: string | null;
          }>();
        if (
          !run ||
          run.tree_id !== current.tree.id ||
          run.completed_at ||
          !validGameFinish(
            JSON.parse(run.targets) as GameTarget[],
            body.targets,
            run.started_at,
          )
        )
          return fail(
            cookie,
            "게임을 시작한 나무에서 모든 작업을 마쳐 주세요. 게임은 3초 이상, 10분 이내에 완료해야 해요.",
            409,
          );
        const now = new Date().toISOString();
        const result = await db.batch([
          db
            .prepare(
              "INSERT OR IGNORE INTO actions (id, garden_id, tree_id, action, day, xp, text, created_at) SELECT ?, ?, ?, ?, ?, 25, ?, ? WHERE EXISTS (SELECT 1 FROM game_runs r JOIN gardens g ON g.id = r.garden_id AND g.tree_id = r.tree_id WHERE r.id = ? AND r.garden_id = ? AND r.completed_at IS NULL)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              run.tree_id,
              `game:${run.game}`,
              seoulDay(),
              "가상 나무 돌봄 미니게임을 완료했어요",
              now,
              run.id,
              id,
            ),
          db
            .prepare(
              "UPDATE game_runs SET completed_at = ? WHERE id = ? AND garden_id = ? AND completed_at IS NULL",
            )
            .bind(now, run.id, id),
        ]);
        if (!result[0].meta.changes)
          return fail(cookie, "이 게임의 오늘 경험치는 이미 받았어요.", 409);
      } else if (action === "physical-apply") {
        const application = physicalApplication(body, current.points);
        if (!application)
          return fail(
            cookie,
            "100 포인트, 안전수칙 동의, 2~100자 메시지와 내일부터 90일 이내의 시작일·1/3/7일 기간이 필요해요.",
          );
        const result = await db
          .prepare(
            "INSERT OR IGNORE INTO applications (id, garden_id, tree_id, kind, message, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            current.tree.id,
            application.kind,
            application.message,
            application.startDate,
            application.endDate,
            current.tree.sample ? "demo_pending" : "pending_review",
            new Date().toISOString(),
          )
          .run();
        if (!result.meta.changes)
          return fail(cookie, "이 종류의 이벤트에 이미 신청했어요.", 409);
      } else if (action === "decorate") {
        if (
          typeof body.decoration !== "string" ||
          !["none", "ribbon", "nameplate", "birdhouse"].includes(
            body.decoration,
          )
        )
          return fail(cookie, "가상 꾸미기 아이템을 선택해 주세요.");
        if (body.decoration !== "none" && current.xp < 30)
          return fail(cookie, "30 잎사귀를 모으면 가상 꾸미기가 열려요.", 403);
        await db.batch([
          db
            .prepare(
              "UPDATE gardens SET decoration = ? WHERE id = ? AND tree_id = ?",
            )
            .bind(body.decoration, id, current.tree.id),
          db
            .prepare(
              "UPDATE club_owned SET decoration = ? WHERE owner = ? AND tree_id = ?",
            )
            .bind(body.decoration, id, current.tree.id),
        ]);
      } else {
        let key: string,
          day = seoulDay(),
          xp = 0,
          text = "";
        if (action === "interest") {
          if (
            typeof body.eventId !== "string" ||
            !["nameplate", "season-walk", "tree-watch"].includes(body.eventId)
          )
            return fail(cookie, "이벤트 정보를 확인해 주세요.");
          key = `interest:${body.eventId}`;
          day = "once";
        } else if (
          typeof action === "string" &&
          Object.hasOwn(ACTION_XP, action)
        ) {
          key = action;
          xp = ACTION_XP[action as keyof typeof ACTION_XP];
          if (action === "visit") {
            if (current.tree.sample)
              return fail(
                cookie,
                "샘플 나무는 실제 방문 인증 대상이 아니에요. 방문 체험을 이용해 주세요.",
                403,
              );
            if (
              !validLocation(body.lat, body.lng, 300) ||
              typeof body.accuracy !== "number" ||
              !Number.isFinite(body.accuracy) ||
              body.accuracy < 0 ||
              body.accuracy > 50 ||
              distanceMeters(
                body.lat as number,
                body.lng as number,
                current.tree.lat,
                current.tree.lng,
              ) > 80
            )
              return fail(
                cookie,
                "나무 80m 이내에서 위치 정확도 50m 이하로 다시 시도해 주세요.",
                403,
              );
            text = "위치 기반 방문 기록 (GPS 위변조 여부 미검증)";
          } else if (action === "demo-visit") {
            if (!current.tree.sample)
              return fail(
                cookie,
                "실제 나무는 위치 기반 방문 기록을 이용해 주세요.",
                403,
              );
            text = "서울숲 샘플 나무 방문 체험 (실제 인증 아님)";
          } else if (action === "note") {
            if (
              typeof body.text !== "string" ||
              body.text.trim().length < 2 ||
              body.text.trim().length > 500
            )
              return fail(cookie, "관찰 기록은 2~500자로 적어 주세요.");
            text = body.text.trim();
          } else
            text =
              action === "water"
                ? "가상 정원에 물을 주었어요"
                : "가상 정원에 거름을 주었어요";
        } else return fail(cookie, "지원하지 않는 활동이에요.");
        const result = await db
          .prepare(
            "INSERT OR IGNORE INTO actions (id, garden_id, tree_id, action, day, xp, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            current.tree.id,
            key,
            day,
            xp,
            text,
            new Date().toISOString(),
          )
          .run();
        if (!result.meta.changes)
          return fail(
            cookie,
            action === "interest"
              ? "이미 관심을 등록했어요."
              : "오늘은 이미 완료했어요. 내일 다시 만나요!",
            409,
          );
      }
    }
    return reply(await state(id), cookie);
  } catch {
    return fail(
      cookie,
      "정원을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      503,
    );
  }
}
