import {
  ACTION_XP,
  GAMES,
  candidates,
  growth,
  seoulDay,
  validLocation,
  validNickname,
  validGameFinish,
  physicalApplication,
} from "./domain.ts";
import {
  HEALTH_INDICATORS,
  clubText,
  validProfile,
  validRecord,
  imageMime,
} from "./club.ts";
import { TREES } from "./trees.ts";
import {
  createIndexedDbStore,
  emptyState,
  type LocalState,
  type LocalStore,
  type Owned,
} from "./local-store.ts";

const MAX_PHOTO = 3 * 1024 * 1024,
  MAX_PHOTOS_TOTAL = 60 * 1024 * 1024,
  MAX_BACKUP = 100 * 1024 * 1024;
class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
function requireValue(
  value: unknown,
  message = "입력 내용을 확인해 주세요.",
  status = 400,
): asserts value {
  if (!value) throw new InputError(message, status);
}
const findTree = (id: unknown) => TREES.find((t) => t.id === id);
const own = (s: LocalState) => s.owned.find((t) => t.treeId === s.active);
function garden(s: LocalState, now: Date) {
  const rows = s.actions.filter((a) => a.treeId === s.active),
    xp = rows.reduce((n, a) => n + a.xp, 0),
    o = own(s);
  return {
    tree: findTree(s.active) ?? null,
    xp,
    growth: growth(xp),
    points: s.actions.reduce((n, a) => n + a.xp, 0),
    visits: rows.filter((a) => a.action === "demo-visit").length,
    verifiedVisits: 0,
    water: rows.filter((a) => a.action === "water").length,
    compost: rows.filter((a) => a.action === "compost").length,
    nickname: o?.nickname ?? "",
    decoration: o?.decoration ?? "none",
    tutorialCompleted: s.tutorialCompleted,
    applications: s.applications,
    gameWins: rows.filter((a) => a.action.startsWith("game:")).length,
    careDays: new Set(
      rows.filter((a) => a.xp > 0).map((a) => seoulDay(new Date(a.createdAt))),
    ).size,
    interests: s.actions
      .filter((a) => a.action.startsWith("interest:"))
      .map((a) => a.action.slice(9)),
    todayActions: s.actions
      .filter((a) => a.day === seoulDay(now))
      .map((a) => a.action),
    logs: rows
      .filter((a) => !a.action.startsWith("interest:"))
      .slice(-50)
      .reverse(),
  };
}
async function dataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
async function club(s: LocalState) {
  const urls = new Map(
    await Promise.all(
      s.photos.map(async (p) => [p.key, await dataUrl(p.blob)] as const),
    ),
  );
  return {
    profile: s.profile,
    myTrees: s.owned.map((o) => ({ ...o, tree: findTree(o.treeId) })),
    favorites: TREES.filter((t) => s.favorites.includes(t.id)),
    records: s.records
      .slice(-100)
      .reverse()
      .map((r) => ({
        ...r,
        photoUrl: r.photoKey ? (urls.get(r.photoKey) ?? null) : null,
        author: s.profile.displayName,
        visibility: "private",
        mine: true,
        liked: false,
        likeCount: 0,
        comments: [],
      })),
    notifications: [],
    reports: s.reports.map((r) => ({
      ...r,
      details: {
        ...r.details,
        photoUrl: urls.get(r.details.photoKey as string) ?? null,
      },
    })),
    healthIndicators: HEALTH_INDICATORS,
  };
}
function award(
  s: LocalState,
  action: string,
  day: string,
  xp: number,
  text: string,
  now: Date,
) {
  requireValue(
    !s.actions.some((a) => a.action === action && a.day === day),
    "오늘은 이미 완료했어요. 내일 다시 만나요!",
    409,
  );
  requireValue(
    s.actions.length < 100000,
    "기록이 가득 찼어요. 백업 후 정리해 주세요.",
    409,
  );
  s.actions.push({
    id: crypto.randomUUID(),
    treeId: s.active!,
    action,
    day,
    xp,
    text,
    createdAt: now.toISOString(),
  });
}
function adopt(s: LocalState, b: Record<string, unknown>) {
  requireValue(
    validLocation(b.lat, b.lng, b.radius),
    "위치와 반경을 선택해 주세요.",
  );
  requireValue(
    s.owned.length < 5,
    "나무 친구는 최대 5그루까지 만날 수 있어요.",
    409,
  );
  const available = candidates(
    TREES,
    b.lat as number,
    b.lng as number,
    b.radius as number,
  ).filter((t) => !s.owned.some((o) => o.treeId === t.id));
  requireValue(
    available.length,
    "가까운 10그루 중 새 친구가 없어요. 위치나 반경을 바꿔 주세요.",
    404,
  );
  const limit = Math.floor(4294967296 / available.length) * available.length;
  let draw: number;
  do {
    draw = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (draw >= limit);
  const t = available[draw % available.length];
  s.owned.push({
    treeId: t.id,
    nickname: "",
    decoration: "none",
    health: [],
    girth: null,
    size: "medium",
    species: t.species,
  });
  s.active ??= t.id;
}
function changeGarden(s: LocalState, b: Record<string, unknown>, now: Date) {
  const action = b.action;
  if (action === "assign") {
    requireValue(!s.active, "이미 인연을 맺은 나무가 있어요.", 409);
    adopt(s, b);
    return garden(s, now);
  }
  const o = own(s);
  requireValue(o, "먼저 나무와 인연을 맺어 주세요.", 409);
  if (action === "rename") {
    requireValue(validNickname(b.name), "이름은 1~16자로 적어 주세요.");
    o.nickname = b.name.trim();
    if (!s.actions.some((a) => a.action === "rename" && a.day === s.active))
      award(s, "rename", s.active!, 10, "나무에게 첫 이름을 선물했어요", now);
  } else if (action === "tutorial-complete") s.tutorialCompleted = true;
  else if (action === "decorate") {
    requireValue(
      ["none", "ribbon", "nameplate", "birdhouse"].includes(
        b.decoration as string,
      ),
      "장식을 확인해 주세요.",
    );
    requireValue(
      b.decoration === "none" || garden(s, now).xp >= 30,
      "30 잎사귀를 모으면 가상 꾸미기가 열려요.",
      403,
    );
    o.decoration = b.decoration as string;
  } else if (action === "game-start") {
    requireValue(
      GAMES.includes(b.game as (typeof GAMES)[number]),
      "미니게임을 선택해 주세요.",
    );
    requireValue(
      !s.actions.some(
        (a) => a.action === `game:${b.game}` && a.day === seoulDay(now),
      ),
      "이 게임의 오늘 경험치는 이미 받았어요.",
      409,
    );
    const run = {
      id: crypto.randomUUID(),
      treeId: s.active!,
      game: b.game as string,
      targets: Array.from({ length: 5 }, () => ({
        id: crypto.randomUUID(),
        x: 15 + (crypto.getRandomValues(new Uint32Array(1))[0] % 70),
        y: 18 + (crypto.getRandomValues(new Uint32Array(1))[0] % 60),
      })),
      startedAt: now.toISOString(),
      completed: false,
    };
    s.runs = s.runs
      .filter((r) => !r.completed && +now - Date.parse(r.startedAt) < 600000)
      .slice(-19);
    s.runs.push(run);
    return { ...garden(s, now), gameRun: run };
  } else if (action === "game-finish") {
    const r = s.runs.find((r) => r.id === b.runId);
    requireValue(
      r &&
        r.treeId === s.active &&
        !r.completed &&
        validGameFinish(r.targets, b.targets, r.startedAt, now),
      "게임은 모든 작업을 마치고 3초 이상, 10분 이내에 완료해 주세요.",
      409,
    );
    award(
      s,
      `game:${r.game}`,
      seoulDay(now),
      25,
      "가상 나무 돌봄 미니게임을 완료했어요",
      now,
    );
    r.completed = true;
  } else if (action === "physical-apply") {
    const application = physicalApplication(b, garden(s, now).points, now);
    requireValue(
      application,
      "100 포인트, 안전수칙 동의, 메시지와 올바른 기간이 필요해요.",
    );
    requireValue(
      !s.applications.some((a) => a.kind === application.kind),
      "이 종류의 체험 신청을 이미 저장했어요.",
      409,
    );
    s.applications.push({
      id: crypto.randomUUID(),
      treeId: s.active!,
      ...application,
      status: "demo_pending",
    });
  } else if (action === "interest") {
    requireValue(
      ["nameplate", "season-walk", "tree-watch"].includes(b.eventId as string),
    );
    award(s, `interest:${b.eventId}`, "once", 0, "", now);
  } else {
    requireValue(
      typeof action === "string" && Object.hasOwn(ACTION_XP, action),
      "지원하지 않는 활동이에요.",
    );
    requireValue(
      action !== "visit",
      "방문 체험을 이용해 주세요. 실제 방문 인증은 제공하지 않아요.",
      403,
    );
    if (action === "note")
      requireValue(
        clubText(b.text, 2, 500),
        "관찰 기록은 2~500자로 적어 주세요.",
      );
    const text =
      action === "note"
        ? (b.text as string).trim()
        : action === "demo-visit"
          ? "샘플 나무 방문 체험 (실제 인증 아님)"
          : action === "water"
            ? "가상 정원에 물을 주었어요"
            : "가상 정원에 거름을 주었어요";
    award(
      s,
      action,
      seoulDay(now),
      ACTION_XP[action as keyof typeof ACTION_XP],
      text,
      now,
    );
  }
  return garden(s, now);
}
function removeUnusedPhoto(s: LocalState, key: string | null) {
  if (
    key &&
    !s.records.some((r) => r.photoKey === key) &&
    !s.reports.some((r) => r.details.photoKey === key)
  )
    s.photos = s.photos.filter((p) => p.key !== key);
}
function changeClub(s: LocalState, b: Record<string, unknown>, now: Date) {
  const tree = findTree(b.treeId),
    o = s.owned.find((o) => o.treeId === b.treeId);
  switch (b.action) {
    case "adopt":
      adopt(s, b);
      break;
    case "select":
      requireValue(o, "내 나무만 선택할 수 있어요.", 403);
      s.active = o.treeId;
      break;
    case "part":
      requireValue(o, "내 나무를 선택해 주세요.");
      s.owned = s.owned.filter((t) => t !== o);
      if (s.active === o.treeId) s.active = s.owned[0]?.treeId ?? null;
      break;
    case "favorite":
      requireValue(tree);
      s.favorites = s.favorites.includes(tree.id)
        ? s.favorites.filter((id) => id !== tree.id)
        : [...s.favorites, tree.id];
      break;
    case "profile":
      requireValue(
        validProfile(b),
        "별명과 최대 3곳의 활동 지역을 확인해 주세요.",
      );
      s.profile = {
        displayName: (b.displayName as string).trim(),
        areas: (b.areas as string[]).map((a) => a.trim()),
      };
      break;
    case "record": {
      requireValue(
        tree && validRecord({ ...b, visibility: "private" }),
        "관찰 내용·건강 상태·둘레·크기를 확인해 주세요.",
      );
      requireValue(
        b.nickname === undefined || o,
        "내 나무만 이름을 바꿀 수 있어요.",
      );
      requireValue(
        b.photoKey === undefined || s.photos.some((p) => p.key === b.photoKey),
        "직접 저장한 사진을 선택해 주세요.",
      );
      requireValue(s.records.length < 10000, "관찰 기록이 가득 찼어요.", 409);
      s.records.push({
        id: crypto.randomUUID(),
        treeId: tree.id,
        text: (b.text as string).trim(),
        photoKey: (b.photoKey as string) ?? null,
        health: b.health as string[],
        girth: (b.girth as number) ?? null,
        size: b.size as string,
        createdAt: now.toISOString(),
      });
      if (o) {
        o.health = b.health as string[];
        o.girth = (b.girth as number) ?? null;
        o.size = b.size as string;
        if (typeof b.nickname === "string") o.nickname = b.nickname.trim();
        if (typeof b.species === "string") o.species = b.species.trim();
      }
      break;
    }
    case "edit-record":
    case "delete-record":
    case "delete-photo": {
      const r = s.records.find((r) => r.id === b.recordId);
      requireValue(r, "기록을 선택해 주세요.", 404);
      const key = r.photoKey;
      if (b.action === "edit-record") {
        requireValue(
          clubText(b.text, 2, 1000),
          "기록을 2~1000자로 적어 주세요.",
        );
        r.text = b.text.trim();
      } else if (b.action === "delete-photo") r.photoKey = null;
      else s.records = s.records.filter((x) => x !== r);
      removeUnusedPhoto(s, key);
      break;
    }
    case "report": {
      const kind = b.kind ?? "error";
      requireValue(
        ["error", "addition", "removal"].includes(kind as string) &&
          clubText(b.text, 2, 1000) &&
          (kind === "addition" || tree),
        "제보 내용을 확인해 주세요.",
      );
      const details: Record<string, unknown> = {};
      if (kind !== "error") {
        requireValue(
          s.photos.some((p) => p.key === b.photoKey) &&
            validLocation(b.lat, b.lng, 300) &&
            clubText(b.species, 1, 30) &&
            validRecord({ ...b, visibility: "private" }),
          "사진·위치·수종·건강 상태를 확인해 주세요.",
        );
        Object.assign(details, {
          lat: b.lat,
          lng: b.lng,
          species: (b.species as string).trim(),
          health: b.health,
          girth: b.girth ?? null,
          size: b.size,
          photoKey: b.photoKey,
        });
      }
      requireValue(
        s.reports.length < 10000,
        "체험 제보 기록이 가득 찼어요.",
        409,
      );
      s.reports.push({
        id: crypto.randomUUID(),
        treeId: tree?.id ?? "",
        text: (b.text as string).trim(),
        kind: kind as string,
        details,
        status: "demo_pending",
        createdAt: now.toISOString(),
      });
      break;
    }
    case "mark-read":
      break;
    case "account-delete":
      requireValue(b.confirm === true, "삭제 확인이 필요해요.");
      Object.assign(s, emptyState());
      return { deleted: true };
    default:
      throw new InputError("개인 관찰장에서는 이 공유 기능을 제공하지 않아요.");
  }
  return null;
}

export function createLocalApi(
  backingStore: LocalStore,
  clock: () => Date = () => new Date(),
) {
  const store: LocalStore = {
    update<T>(change: (state: LocalState) => T): Promise<T> {
      return backingStore.update((state) => {
        const result = change(state);
        const metadata = JSON.stringify({
          version: 1,
          state: {
            ...state,
            photos: state.photos.map((p) => ({ key: p.key, data: "" })),
          },
        });
        const bytes =
          new TextEncoder().encode(metadata).length +
          state.photos.reduce(
            (size, p) =>
              size +
              `data:${p.blob.type};base64,`.length +
              4 * Math.ceil(p.blob.size / 3),
            0,
          );
        requireValue(
          bytes <= MAX_BACKUP,
          "백업 가능한 저장 한도 100MB에 도달했어요. 기록이나 사진을 정리해 주세요.",
          413,
        );
        return result;
      });
    },
  };
  async function localFetch(
    input: string,
    init: RequestInit = {},
  ): Promise<Response> {
    try {
      const url = new URL(input, "https://personal.invalid"),
        route = url.pathname,
        method = init.method ?? "GET";
      requireValue(
        method === "GET" ||
          method === "POST" ||
          (method === "DELETE" && route === "/api/photos"),
        "지원하지 않는 요청이에요.",
        405,
      );
      if (route === "/api/trees") {
        const lat = Number(url.searchParams.get("lat")),
          lng = Number(url.searchParams.get("lng")),
          radius = Number(url.searchParams.get("radius") ?? 500);
        requireValue(
          url.searchParams.get("lat")?.trim() &&
            url.searchParams.get("lng")?.trim() &&
            validLocation(lat, lng, radius),
          "위치와 반경을 확인해 주세요.",
        );
        const trees = candidates(TREES, lat, lng, radius);
        return Response.json({
          trees,
          candidateCount: trees.length,
          sample: true,
        });
      }
      if (route === "/api/photos") {
        if (method === "DELETE") {
          const key = url.searchParams.get("key");
          await store.update((s) => {
            requireValue(
              key && s.photos.some((p) => p.key === key),
              "사진이 없어요.",
              404,
            );
            requireValue(
              !s.records.some((r) => r.photoKey === key) &&
                !s.reports.some((r) => r.details.photoKey === key),
              "기록에 연결된 사진은 기록에서 삭제해 주세요.",
              409,
            );
            s.photos = s.photos.filter((p) => p.key !== key);
          });
          return Response.json({ deleted: true });
        }
        if (method === "GET") {
          const photo = await store.update((s) =>
            s.photos.find((p) => p.key === url.searchParams.get("key")),
          );
          requireValue(photo, "사진이 없어요.", 404);
          return new Response(photo.blob, {
            headers: { "Content-Type": photo.blob.type },
          });
        }
        requireValue(init.body instanceof FormData, "사진을 선택해 주세요.");
        const file = init.body.get("photo");
        requireValue(
          file instanceof Blob && file.size > 0 && file.size <= MAX_PHOTO,
          "3MB 이하 사진을 선택해 주세요.",
          413,
        );
        requireValue(
          imageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer())) ===
            file.type &&
            ["image/jpeg", "image/png", "image/webp"].includes(file.type),
          "JPEG·PNG·WebP 사진만 저장할 수 있어요.",
          415,
        );
        const photoKey = `observations/${crypto.randomUUID()}`;
        await store.update((s) => {
          requireValue(
            s.photos.length < 50 &&
              s.photos.reduce((n, p) => n + p.blob.size, 0) + file.size <=
                MAX_PHOTOS_TOTAL,
            "사진은 최대 50장, 합계 60MB까지 저장할 수 있어요.",
            409,
          );
          s.photos.push({ key: photoKey, blob: file });
        });
        return Response.json({ photoKey });
      }
      requireValue(
        route === "/api/garden" || route === "/api/club",
        "페이지를 찾을 수 없어요.",
        404,
      );
      let body: Record<string, unknown> = {};
      if (method === "POST") {
        requireValue(
          typeof init.body === "string" && init.body.length <= 12000,
          "요청 내용이 너무 길어요.",
        );
        try {
          body = JSON.parse(init.body);
        } catch {
          throw new InputError("요청 내용을 읽을 수 없어요.");
        }
        requireValue(body && typeof body === "object" && !Array.isArray(body));
      }
      const result = await store.update((s) => {
        if (route === "/api/garden")
          return {
            value:
              method === "POST"
                ? changeGarden(s, body, clock())
                : garden(s, clock()),
          };
        const value = method === "POST" ? changeClub(s, body, clock()) : null;
        return value ? { value } : { snapshot: structuredClone(s) };
      });
      return Response.json(
        "snapshot" in result && result.snapshot
          ? await club(result.snapshot)
          : result.value,
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof InputError
              ? error.message
              : "브라우저에 저장하지 못했어요. 저장 공간·비공개 모드·브라우저 저장 권한을 확인해 주세요.",
        },
        { status: error instanceof InputError ? error.status : 503 },
      );
    }
  }
  async function exportBackup() {
    const state = await store.update((s) => structuredClone(s));
    const photos = await Promise.all(
      state.photos.map(async (p) => ({
        key: p.key,
        data: await dataUrl(p.blob),
      })),
    );
    const text = JSON.stringify({ version: 1, state: { ...state, photos } });
    requireValue(
      new TextEncoder().encode(text).length <= MAX_BACKUP,
      "백업 파일이 100MB를 초과해요.",
      413,
    );
    return text;
  }
  async function importBackup(text: string) {
    const state = validateBackup(text);
    await store.update((s) => {
      Object.assign(s, state);
    });
  }
  return { localFetch, exportBackup, importBackup };
}

// Treat backups as untrusted input. Validate all collections and references before
// opening the replacement transaction, so a rejected file cannot alter saved data.
function validateBackup(text: string): LocalState {
  requireValue(text.length <= MAX_BACKUP, "백업 파일이 너무 커요.");
  requireValue(
    new TextEncoder().encode(text).length <= MAX_BACKUP,
    "백업 파일이 너무 커요.",
  );
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InputError("백업 JSON을 읽을 수 없어요.");
  }
  const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const keys = (v: unknown, allowed: string) =>
    object(v) && Object.keys(v).every((k) => allowed.split(" ").includes(k));
  requireValue(
    object(parsed) && parsed.version === 1 && object(parsed.state),
    "지원하지 않는 백업 형식이에요.",
  );
  const s = parsed.state as unknown as LocalState;
  requireValue(
    keys(parsed, "version state") &&
      keys(
        s,
        "active tutorialCompleted profile owned favorites actions runs applications records reports photos",
      ),
  );
  const list = (v: unknown, max: number): v is unknown[] =>
    Array.isArray(v) && v.length <= max;
  const id = (v: unknown) =>
    typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
  const date = (v: unknown) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(v) &&
    Number.isFinite(Date.parse(v));
  const tree = (v: unknown) => !!findTree(v);
  requireValue(
    typeof s.tutorialCompleted === "boolean" &&
      keys(s.profile, "displayName areas") &&
      validProfile(s.profile),
  );
  requireValue(
    list(s.owned, 5) &&
      list(s.favorites, TREES.length) &&
      list(s.actions, 100000) &&
      list(s.runs, 20) &&
      list(s.applications, 4) &&
      list(s.records, 10000) &&
      list(s.reports, 10000) &&
      list(s.photos, 50),
  );
  requireValue(
    s.owned.every(
      (o: Owned) =>
        keys(o, "treeId nickname decoration health girth size species") &&
        tree(o.treeId) &&
        typeof o.nickname === "string" &&
        (o.nickname === "" || validNickname(o.nickname)) &&
        ["none", "ribbon", "nameplate", "birdhouse"].includes(o.decoration) &&
        clubText(o.species, 1, 30) &&
        validRecord({
          ...o,
          text: "ok",
          visibility: "private",
          nickname: undefined,
        }),
    ),
  );
  requireValue(
    new Set(s.owned.map((o) => o.treeId)).size === s.owned.length &&
      (s.active === null || s.owned.some((o) => o.treeId === s.active)),
  );
  requireValue(
    s.favorites.every(tree) && new Set(s.favorites).size === s.favorites.length,
  );
  const actionKeys = new Set<string>();
  requireValue(
    s.actions.every((a) => {
      if (
        !keys(a, "id treeId action day xp text createdAt") ||
        !id(a.id) ||
        !tree(a.treeId) ||
        !date(a.createdAt) ||
        typeof a.action !== "string" ||
        typeof a.day !== "string" ||
        !clubText(a.text, 0, 1000)
      )
        return false;
      const xp =
        a.action === "rename"
          ? 10
          : a.action.startsWith("game:") &&
              GAMES.includes(a.action.slice(5) as (typeof GAMES)[number])
            ? 25
            : [
                  "interest:nameplate",
                  "interest:season-walk",
                  "interest:tree-watch",
                ].includes(a.action)
              ? 0
              : ACTION_XP[a.action as keyof typeof ACTION_XP];
      const key = `${a.action}/${a.day}`;
      if (
        xp === undefined ||
        a.xp !== xp ||
        a.action === "visit" ||
        actionKeys.has(key)
      )
        return false;
      actionKeys.add(key);
      return a.action === "rename"
        ? a.day === a.treeId
        : a.action.startsWith("interest:")
          ? a.day === "once"
          : a.day === seoulDay(new Date(a.createdAt));
    }),
  );
  requireValue(
    s.runs.every(
      (r) =>
        keys(r, "id treeId game targets startedAt completed") &&
        id(r.id) &&
        tree(r.treeId) &&
        GAMES.includes(r.game as (typeof GAMES)[number]) &&
        date(r.startedAt) &&
        typeof r.completed === "boolean" &&
        list(r.targets, 5) &&
        r.targets.length === 5 &&
        new Set(r.targets.map((t) => t.id)).size === 5 &&
        r.targets.every(
          (t) =>
            keys(t, "id x y") &&
            id(t.id) &&
            Number.isFinite(t.x) &&
            t.x >= 0 &&
            t.x <= 100 &&
            Number.isFinite(t.y) &&
            t.y >= 0 &&
            t.y <= 100,
        ),
    ),
  );
  const rawPhotos = s.photos as unknown as { key: string; data: string }[];
  const photos = rawPhotos.map((p) => {
    requireValue(
      keys(p, "key data") &&
        typeof p.key === "string" &&
        /^observations\/[0-9a-f-]{36}$/i.test(p.key) &&
        typeof p.data === "string" &&
        p.data.length <= (4 * MAX_PHOTO) / 3 + 64,
    );
    const match =
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        p.data,
      );
    requireValue(match);
    let binary;
    try {
      binary = atob(match[2]);
    } catch {
      throw new InputError("사진 데이터가 올바르지 않아요.");
    }
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    requireValue(
      bytes.length > 0 &&
        bytes.length <= MAX_PHOTO &&
        imageMime(bytes) === match[1],
    );
    return { key: p.key, blob: new Blob([bytes], { type: match[1] }) };
  });
  requireValue(
    new Set(photos.map((p) => p.key)).size === photos.length &&
      photos.reduce((n, p) => n + p.blob.size, 0) <= MAX_PHOTOS_TOTAL,
  );
  const photo = (v: unknown) => v === null || photos.some((p) => p.key === v);
  requireValue(
    s.records.every(
      (r) =>
        keys(r, "id treeId text health girth size photoKey createdAt") &&
        id(r.id) &&
        tree(r.treeId) &&
        date(r.createdAt) &&
        photo(r.photoKey) &&
        validRecord({ ...r, visibility: "private" }),
    ),
  );
  requireValue(
    s.reports.every(
      (r) =>
        keys(r, "id treeId text kind details status createdAt") &&
        id(r.id) &&
        clubText(r.text, 2, 1000) &&
        date(r.createdAt) &&
        r.status === "demo_pending" &&
        object(r.details) &&
        ["error", "addition", "removal"].includes(r.kind) &&
        (r.kind === "addition"
          ? r.treeId === "" || tree(r.treeId)
          : tree(r.treeId)) &&
        (r.kind === "error"
          ? keys(r.details, "")
          : keys(r.details, "lat lng species health girth size photoKey") &&
            photo(r.details.photoKey) &&
            r.details.photoKey !== null &&
            validLocation(r.details.lat, r.details.lng, 300) &&
            clubText(r.details.species, 1, 30) &&
            validRecord({
              ...r.details,
              text: r.text,
              visibility: "private",
            })),
    ),
  );
  requireValue(
    s.applications.every(
      (a) =>
        keys(a, "id treeId kind message startDate endDate status") &&
        id(a.id) &&
        tree(a.treeId) &&
        ["nameplate", "message", "decoration", "confession"].includes(a.kind) &&
        clubText(a.message, 2, 100) &&
        a.status === "demo_pending" &&
        typeof a.startDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.startDate) &&
        typeof a.endDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.endDate) &&
        Number.isFinite(Date.parse(a.startDate)) &&
        Number.isFinite(Date.parse(a.endDate)) &&
        new Date(a.startDate).toISOString().slice(0, 10) === a.startDate &&
        new Date(a.endDate).toISOString().slice(0, 10) === a.endDate &&
        [0, 2, 6].includes(
          (Date.parse(a.endDate) - Date.parse(a.startDate)) / 86400000,
        ),
    ),
  );
  requireValue(
    new Set(s.applications.map((a) => a.kind)).size === s.applications.length,
  );
  for (const rows of [s.actions, s.runs, s.records, s.reports, s.applications])
    requireValue(new Set(rows.map((r) => r.id)).size === rows.length);
  return { ...s, photos };
}
const browserApi = createLocalApi(createIndexedDbStore());
export const localFetch = browserApi.localFetch;
export const exportBackup = browserApi.exportBackup;
export const importBackup = browserApi.importBackup;
