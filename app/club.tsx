"use client";
import { useEffect, useState } from "react";
import { pageItems } from "../lib/app-navigation";
import { localFetch } from "../lib/local-api";
import { TREES } from "../lib/trees";
import type { Tree } from "./garden-types";
import "./club.css";
import { TreeReport } from "./tree-report";
import { uploadObservationPhoto, type PhotoStyle } from "./photo-upload";
import { saveWithPhoto } from "./photo-save";
import { clubText } from "../lib/club";
type RecordItem = {
  id: string;
  treeId: string;
  author: string;
  text: string;
  photoUrl: string | null;
  visibility: string;
  health: string[];
  girth: number | null;
  size: string;
  createdAt: string;
  mine: boolean;
  liked: boolean;
  likeCount: number;
  comments: {
    id: string;
    author: string;
    text: string;
    createdAt: string;
    mine: boolean;
    photoUrl?: string | null;
  }[];
};
type ClubState = {
  profile: { displayName: string; areas: string[] };
  myTrees: {
    tree: Tree;
    nickname: string;
    health: string[];
    girth: number | null;
    size: string;
    species: string;
  }[];
  favorites: Tree[];
  records: RecordItem[];
  notifications: {
    id: string;
    text: string;
    read: boolean;
    createdAt: string;
  }[];
  reports: {
    id: string;
    treeId: string;
    text: string;
    status: string;
    createdAt: string;
  }[];
  healthIndicators: string[];
};
const empty: ClubState = {
  profile: { displayName: "", areas: [] },
  myTrees: [],
  favorites: [],
  records: [],
  notifications: [],
  reports: [],
  healthIndicators: [],
};

export function Club({
  onGardenChange,
  onOpenGarden,
}: {
  onGardenChange: () => Promise<void>;
  onOpenGarden: () => void;
}) {
  const [success, setSuccess] = useState<{ id: number; action: string } | null>(
    null,
  );
  const [recordsPage, setRecordsPage] = useState(0);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);
  const [state, setState] = useState<ClubState>(empty),
    [section, setSection] = useState(() =>
      typeof window !== "undefined" &&
      window.location.hash.startsWith("#record=")
        ? "records"
        : "mine",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<Tree | null>(null),
    [recordTree, setRecordTree] = useState<Tree | null>(null),
    [reportText, setReportText] = useState(""),
    [confirm, setConfirm] = useState<string | null>(null),
    [deleteText, setDeleteText] = useState(""),
    [lat, setLat] = useState("37.5445"),
    [lng, setLng] = useState("127.0374"),
    [radius, setRadius] = useState(500);
  useEffect(() => {
    let live = true;
    localFetch("/api/club")
      .then(async (r) => {
        const d = (await r.json()) as ClubState & { error?: string };
        if (!r.ok) throw Error(d.error);
        if (live) {
          setState(d);
          if (window.location.hash.startsWith("#record=")) {
            const target = d.records.findIndex(
              (r) => r.id === window.location.hash.slice(8),
            );
            if (target >= 0) setRecordsPage(Math.floor(target / 5));
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (
      ready &&
      section === "records" &&
      window.location.hash.startsWith("#record=")
    ) {
      const id = window.location.hash.slice(8);
      document
        .getElementById(`record-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ready, section, state.records, recordsPage]);
  async function mutate(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const r = await localFetch("/api/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = (await r.json()) as ClubState & { error?: string };
      if (!r.ok) throw Error(d.error || "저장하지 못했어요.");
      if (action === "account-delete") return true;
      setState(d);
      setSuccess((previous) => ({ id: (previous?.id ?? 0) + 1, action }));
      await onGardenChange();
      setConfirm(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결을 확인해 주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const filtered = TREES.filter((t) =>
    `${t.name} ${t.species} ${t.location}`.includes(query.trim()),
  );
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <section className="club-shell">
      {success && (
        <div key={success.id} className="club-success" role="status">
          <span>
            {success.action === "favorite"
              ? "💚"
              : success.action === "record"
                ? "📸"
                : success.action === "adopt"
                  ? "🌳"
                  : "🌿"}
          </span>
          {success.action === "report"
            ? "제보를 체험 기록으로 저장했어요. 운영기관에 전송되지는 않아요."
            : success.action === "adopt"
              ? "새 나무 친구와 인연을 맺었어요!"
              : "소중한 마음을 기록했어요!"}
        </div>
      )}
      <div className="club-intro">
        <div>
          <p className="eyebrow">CITY TREE CLUB · OUR NEIGHBORHOOD</p>
          <h3>나의 나무에서, 우리 동네 숲으로</h3>
          <p>나무 친구를 더 만나고, 나만의 관찰장에 안부를 남겨요.</p>
        </div>
        <span>🌳</span>
      </div>
      <div className="club-nav" aria-label="클럽 메뉴">
        {[
          ["mine", `내 나무 ${state.myTrees.length}/5`],
          ["favorites", `관심나무 ${state.favorites.length}`],
          ["records", "개인 관찰장"],
          ["notifications", `알림 ${unread}`],
          ["reports", "나무 메모"],
          ["profile", "내 정보"],
        ].map(([id, label]) => (
          <button
            className={section === id ? "active" : ""}
            key={id}
            onClick={() => {
              setSection(id);
              setDetail(null);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="club-error" role="alert">
          {error}
        </p>
      )}
      {!ready ? (
        <p className="empty">
          {error
            ? "연결을 확인한 뒤 페이지를 새로고침해 주세요."
            : "우리 동네 나무를 불러오고 있어요…"}
        </p>
      ) : (
        <>
          {section === "mine" && (
            <>
              <div className="club-section-title">
                <h4>나무 친구들</h4>
                <span>최대 다섯 그루와 인연을 맺을 수 있어요</span>
              </div>
              <div className="club-tree-grid">
                {state.myTrees.map(({ tree, nickname }) => (
                  <article className="club-tree-card" key={tree.id}>
                    <span className="tree-avatar">🌳</span>
                    <h4>{nickname || tree.name}</h4>
                    <p>
                      {tree.species} · {tree.location}
                    </p>
                    <small>샘플 나무 · {tree.id}</small>
                    <div>
                      <button
                        className="outline"
                        disabled={busy}
                        onClick={() =>
                          void mutate("select", { treeId: tree.id }).then(
                            (ok) => {
                              if (ok) onOpenGarden();
                            },
                          )
                        }
                      >
                        돌보러 가기 ↗
                      </button>
                      <button
                        className="outline"
                        onClick={() => setRecordTree(tree)}
                      >
                        관찰 등록
                      </button>
                    </div>
                    <div className="tree-card-links">
                      <button onClick={() => setDetail(tree)}>나무 상세</button>
                      <button onClick={() => setConfirm(tree.id)}>
                        작별하기
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!state.myTrees.length && (
                <p className="empty">
                  아직 친구가 없어요. 아래에서 첫 나무를 만나보세요.
                </p>
              )}
              <form
                className="adopt-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate("adopt", {
                    lat: Number(lat),
                    lng: Number(lng),
                    radius,
                  });
                }}
              >
                <div>
                  <h4>새로운 나무 친구 만나기</h4>
                  <p>
                    지정한 위치의 가까운 10그루 중 무작위로 만나요. 이미 내
                    나무인 후보는 제외돼요.
                  </p>
                </div>
                <label>
                  위도
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                  />
                </label>
                <label>
                  경도
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    required
                  />
                </label>
                <label>
                  반경
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  >
                    {[300, 500, 1000, 2000].map((n) => (
                      <option key={n} value={n}>
                        {n}m
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={busy || state.myTrees.length >= 5}
                >
                  친구 맺기 ↗
                </button>
              </form>
            </>
          )}
          {section === "favorites" && (
            <>
              <div className="club-section-title">
                <h4>다정하게 지켜보는 나무</h4>
                <span>내 나무가 아니어도 관심을 남길 수 있어요</span>
              </div>
              <div className="favorite-chips">
                {state.favorites.map((tree) => (
                  <button key={tree.id} onClick={() => setDetail(tree)}>
                    ♥ {tree.name} · {tree.species}
                  </button>
                ))}
              </div>
              <label className="catalog-search">
                나무 검색
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="수종·이름·산책길로 검색"
                />
              </label>
              <div className="catalog-list">
                {filtered.map((tree) => (
                  <article key={tree.id}>
                    <button onClick={() => setDetail(tree)}>
                      <span>🌿</span>
                      <div>
                        <b>{tree.name}</b>
                        <small>
                          {tree.species} · {tree.location}
                        </small>
                      </div>
                    </button>
                    <button
                      className={
                        state.favorites.some((t) => t.id === tree.id)
                          ? "heart selected"
                          : "heart"
                      }
                      aria-label={`${tree.name} 관심나무 ${state.favorites.some((t) => t.id === tree.id) ? "해제" : "등록"}`}
                      disabled={busy}
                      onClick={() =>
                        void mutate("favorite", { treeId: tree.id })
                      }
                    >
                      {state.favorites.some((t) => t.id === tree.id)
                        ? "♥"
                        : "♡"}
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <p className="empty">검색어와 일치하는 나무가 없어요.</p>
              )}
            </>
          )}
          {section === "records" && (
            <>
              <div className="club-section-title">
                <h4>나무의 안부가 모이는 곳</h4>
                <span>최근 100개 · 이 브라우저에 저장한 나의 기록</span>
              </div>
              {!state.records.length && (
                <p className="empty">
                  첫 기록을 기다리고 있어요. ‘내 나무 → 관찰 등록’에서 사진과
                  안부를 남겨주세요.
                </p>
              )}
              <div className="club-records">
                {pageItems(state.records, recordsPage).items.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    busy={busy}
                    onMutate={mutate}
                  />
                ))}
              </div>
              <div className="page-controls">
                <button
                  disabled={pageItems(state.records, recordsPage).page === 0}
                  onClick={() => setRecordsPage(Math.max(0, recordsPage - 1))}
                >
                  이전
                </button>
                <span>
                  {pageItems(state.records, recordsPage).page + 1} /{" "}
                  {pageItems(state.records, recordsPage).pages}
                </span>
                <button
                  disabled={
                    pageItems(state.records, recordsPage).page + 1 >=
                    pageItems(state.records, recordsPage).pages
                  }
                  onClick={() => setRecordsPage(recordsPage + 1)}
                >
                  다음
                </button>
              </div>
            </>
          )}
          {section === "notifications" && (
            <>
              <div className="club-section-title">
                <h4>도착한 소식</h4>
                <span>읽지 않은 소식 {unread}개</span>
              </div>
              <div className="notification-list">
                {state.notifications.map((n) => (
                  <button
                    key={n.id}
                    disabled={busy || n.read}
                    className={n.read ? "read" : "unread"}
                    onClick={() =>
                      void mutate("mark-read", { notificationId: n.id })
                    }
                  >
                    <span>{n.read ? "○" : "●"}</span>
                    <div>
                      <b>{n.text}</b>
                      <small>
                        {new Date(n.createdAt).toLocaleString("ko-KR")} ·{" "}
                        {n.read ? "읽음" : "눌러서 읽음 처리"}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
              {!state.notifications.length && (
                <p className="empty">아직 도착한 소식이 없어요.</p>
              )}
            </>
          )}
          {section === "reports" && (
            <TreeReport
              busy={busy}
              onSubmit={(extra) => mutate("report", extra)}
            />
          )}
          {section === "profile" && (
            <Profile
              state={state}
              busy={busy}
              onSave={(extra) => mutate("profile", extra)}
              onDelete={() => setConfirm("account")}
            />
          )}
          {detail && (
            <section className="tree-detail">
              <button
                className="detail-close"
                onClick={() => setDetail(null)}
                aria-label="나무 상세 닫기"
              >
                ×
              </button>
              <p className="eyebrow">TREE PASSPORT</p>
              <h3>
                {state.myTrees.find((t) => t.tree.id === detail.id)?.nickname ||
                  detail.name}
              </h3>
              <p>
                {detail.species} · {detail.location}
              </p>
              <small>
                위도 {detail.lat}, 경도 {detail.lng} · 샘플 좌표
              </small>
              <div className="detail-actions">
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => void mutate("favorite", { treeId: detail.id })}
                >
                  {state.favorites.some((t) => t.id === detail.id)
                    ? "♥ 관심 해제"
                    : "♡ 관심나무 등록"}
                </button>
                <button
                  className="outline"
                  onClick={() => setRecordTree(detail)}
                >
                  사진·건강 관찰 등록
                </button>
              </div>
              {state.myTrees
                .filter((t) => t.tree.id === detail.id)
                .map((t) => (
                  <div className="tree-facts" key={t.tree.id}>
                    <span>관찰 수종: {t.species || detail.species}</span>
                    <span>둘레: {t.girth ? `${t.girth}cm` : "미측정"}</span>
                    <span>
                      덩치:{" "}
                      {{
                        small: "작은 나무",
                        medium: "중간 나무",
                        large: "큰 나무",
                      }[t.size] || "미기록"}
                    </span>
                    <span>
                      건강 관찰:{" "}
                      {t.health?.map((h) => h).join(" · ") || "아직 없어요"}
                    </span>
                  </div>
                ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate("report", {
                    treeId: detail.id,
                    text: reportText,
                  }).then((ok) => {
                    if (ok) setReportText("");
                  });
                }}
              >
                <label>
                  지도·나무 정보 오류 제보
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    required
                    minLength={2}
                    maxLength={500}
                    placeholder="위치나 정보가 다른 점을 알려주세요"
                  />
                </label>
                <button className="outline" disabled={busy}>
                  개인 메모 저장
                </button>
              </form>
              <div className="report-status">
                {state.reports
                  .filter((r) => r.treeId === detail.id)
                  .map((r) => (
                    <p key={r.id}>
                      체험 제보 저장 · {r.text} <small>운영기관 미전송</small>
                    </p>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {confirm === "account"
                ? "내 기록을 모두 지울까요?"
                : "나무와 작별할까요?"}
            </h2>
            <p>
              {confirm === "account"
                ? "이 브라우저의 정원·사진·관찰 기록·체험 신청을 모두 삭제합니다. 백업 파일 없이는 복구할 수 없어요. 아래에 ‘삭제’를 입력해 주세요."
                : "내 나무 목록에서 제외합니다. 기존 관찰 기록은 보관되고, 새 친구를 만날 자리가 생겨요."}
            </p>
            {confirm === "account" && (
              <input
                className="delete-input"
                aria-label="삭제 확인"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="삭제"
              />
            )}
            <div className="confirm-actions">
              <button
                className="outline"
                onClick={() => {
                  setConfirm(null);
                  setDeleteText("");
                }}
              >
                돌아가기
              </button>
              <button
                className="primary"
                disabled={
                  busy || (confirm === "account" && deleteText !== "삭제")
                }
                onClick={() => {
                  if (confirm === "account") {
                    void mutate("account-delete", { confirm: true }).then(
                      (ok) => {
                        if (ok) window.location.reload();
                      },
                    );
                  } else void mutate("part", { treeId: confirm });
                }}
              >
                {confirm === "account" ? "모두 삭제" : "작별하기"}
              </button>
            </div>
          </section>
        </div>
      )}
      {recordTree && (
        <RecordWizard
          tree={recordTree}
          previous={state.myTrees.find(
            (entry) => entry.tree.id === recordTree.id,
          )}
          owned={state.myTrees.some((t) => t.tree.id === recordTree.id)}
          healthIndicators={state.healthIndicators}
          busy={busy}
          onClose={() => setRecordTree(null)}
          onSubmit={(extra) =>
            mutate("record", extra).then((ok) => {
              if (ok) {
                setRecordTree(null);
                setSection("records");
              }
              return ok;
            })
          }
        />
      )}
    </section>
  );
}

function Profile({
  state,
  busy,
  onSave,
  onDelete,
}: {
  state: ClubState;
  busy: boolean;
  onSave: (extra: Record<string, unknown>) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(state.profile.displayName),
    [areas, setAreas] = useState(
      [...state.profile.areas, "", "", ""].slice(0, 3),
    ),
    [saved, setSaved] = useState(false);
  return (
    <div className="profile-panel">
      <h3>반가워요, 나무 친구</h3>
      <p>이름과 자주 걷는 동네를 알려주세요.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            displayName: name,
            areas: areas.map((a) => a.trim()).filter(Boolean),
          }).then(setSaved);
        }}
      >
        <label>
          활동 이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
          />
        </label>
        <label>활동지역 · 최대 3곳</label>
        {areas.map((area, i) => (
          <input
            key={i}
            aria-label={`활동지역 ${i + 1}`}
            value={area}
            onChange={(e) =>
              setAreas((old) =>
                old.map((v, j) => (j === i ? e.target.value : v)),
              )
            }
            maxLength={40}
            placeholder={
              ["서울 성동구 성수동", "자주 걷는 동네", "또 다른 산책길"][i]
            }
          />
        ))}
        <button className="primary" disabled={busy}>
          내 정보 저장
        </button>
        {saved && (
          <span className="saved-note" role="status">
            저장했어요 ✓
          </span>
        )}
      </form>
      <div className="account-mode">
        <b>현재: 이 브라우저의 개인 관찰장</b>
        <p>
          정원과 사진은 이 브라우저에만 저장되며 다른 기기와 자동 동기화되지
          않습니다. 데이터를 지우기 전에 화면 위에서 백업을 내보내 주세요.
        </p>
      </div>
      <button className="delete-account" onClick={onDelete}>
        이 브라우저의 내 데이터 모두 삭제
      </button>
    </div>
  );
}

type Mutate = (
  action: string,
  extra?: Record<string, unknown>,
) => Promise<boolean>;
function RecordCard({
  record,
  busy,
  onMutate,
}: {
  record: RecordItem;
  busy: boolean;
  onMutate: Mutate;
}) {
  const [edit, setEdit] = useState(false),
    [draft, setDraft] = useState(record.text);
  return (
    <article className="record-card" id={`record-${record.id}`}>
      <div className="record-card-heading">
        <b>{record.author || "나무 친구"}</b>
        <span>이 브라우저에만 보관</span>
        <small>{new Date(record.createdAt).toLocaleDateString("ko-KR")}</small>
      </div>
      <h4>
        {TREES.find((t) => t.id === record.treeId)?.name || "나무"}의 안부
      </h4>
      {record.photoUrl && (
        <>
          <img
            src={record.photoUrl}
            alt="나무 관찰 사진"
            width={640}
            height={420}
            className="observation-photo"
          />
          {record.mine && (
            <button
              className="photo-remove"
              disabled={busy}
              onClick={() => {
                if (window.confirm("이 기록의 사진을 삭제할까요?"))
                  void onMutate("delete-photo", { recordId: record.id });
              }}
            >
              사진만 삭제
            </button>
          )}
        </>
      )}
      {edit ? (
        <div className="inline-edit">
          <label className="sr-only" htmlFor={`edit-${record.id}`}>
            관찰 내용 수정
          </label>
          <textarea
            id={`edit-${record.id}`}
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            disabled={busy || draft.trim().length < 2}
            onClick={() =>
              void onMutate("edit-record", {
                recordId: record.id,
                text: draft,
              }).then((ok) => {
                if (ok) setEdit(false);
              })
            }
          >
            수정 저장
          </button>
          <button onClick={() => setEdit(false)}>취소</button>
        </div>
      ) : (
        <p>{record.text}</p>
      )}
      <div className="record-tags">
        {record.health.map((h) => (
          <span key={h}>{h}</span>
        ))}
        {record.girth && <span>둘레 {record.girth}cm</span>}
      </div>
      <div className="record-card-tools">
        {record.mine && (
          <>
            <button
              onClick={() => {
                setDraft(record.text);
                setEdit(true);
              }}
            >
              수정
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "관찰 기록을 삭제할까요? 백업 없이는 복구할 수 없어요.",
                  )
                )
                  void onMutate("delete-record", { recordId: record.id });
              }}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </article>
  );
}
function RecordWizard({
  tree,
  previous,
  owned,
  healthIndicators,
  busy,
  onClose,
  onSubmit,
}: {
  tree: Tree;
  previous?: ClubState["myTrees"][number];
  owned: boolean;
  healthIndicators: string[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (extra: Record<string, unknown>) => Promise<boolean>;
}) {
  const [step, setStep] = useState(0),
    [species, setSpecies] = useState(previous?.species || tree.species),
    [nickname, setNickname] = useState(previous?.nickname || tree.name),
    [health, setHealth] = useState<string[]>(previous?.health || []),
    [girth, setGirth] = useState(
      previous?.girth == null ? "" : String(previous.girth),
    ),
    [size, setSize] = useState(previous?.size || "medium"),
    [text, setText] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [photoStyle, setPhotoStyle] = useState<PhotoStyle>("natural");
  async function save() {
    setUploading(true);
    setError("");
    try {
      if (
        girth &&
        (!Number.isFinite(Number(girth)) ||
          Number(girth) <= 0 ||
          Number(girth) > 3000)
      )
        throw Error(
          "둘레는 0보다 크고 3000cm 이하로 입력하거나, 미측정이면 비워주세요.",
        );
      if (
        !species.trim() ||
        species.trim().length > 30 ||
        (owned && (!nickname.trim() || nickname.trim().length > 16))
      )
        throw Error("수종(1~30자)과 애칭(1~16자)을 확인해 주세요.");
      if (!clubText(text, 2, 1000))
        throw Error("관찰 내용은 공백을 제외하고 2~1000자로 적어 주세요.");
      const saved = await saveWithPhoto(
        async () =>
          photo ? uploadObservationPhoto(photo, photoStyle) : undefined,
        (photoKey) =>
          onSubmit({
            treeId: tree.id,
            species,
            ...(owned ? { nickname } : {}),
            health,
            girth: girth ? Number(girth) : null,
            size,
            text,
            visibility: "private",
            ...(photoKey ? { photoKey } : {}),
          }),
      );
      if (!saved)
        setError(
          "관찰 기록을 저장하지 못했어요. 입력 내용과 연결을 확인하고 다시 시도해 주세요.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setUploading(false);
    }
  }
  const labels = ["수종", "이름", "건강", "둘레·덩치", "사진·기록"];
  return (
    <div className="modal-backdrop">
      <section
        className="modal record-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-title"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="관찰 등록 닫기"
        >
          ×
        </button>
        <p className="eyebrow">MEET · OBSERVE · REMEMBER</p>
        <h2 id="record-title">{tree.name}의 오늘을 알아가요</h2>
        <div className="wizard-steps">
          {labels.map((label, i) => (
            <button
              className={step === i ? "active" : ""}
              key={label}
              onClick={() => setStep(i)}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
        {step === 0 && (
          <label className="wizard-field">
            무슨 나무인가요?
            <input
              value={species}
              maxLength={30}
              onChange={(e) => setSpecies(e.target.value)}
            />
            <small>확실하지 않으면 ‘모름’이라고 적어도 괜찮아요.</small>
          </label>
        )}
        {step === 1 && (
          <label className="wizard-field">
            나무의 애칭
            <input
              readOnly={!owned}
              value={nickname}
              maxLength={16}
              onChange={(e) => setNickname(e.target.value)}
            />
            <small>
              {owned
                ? "자주 부르고 싶은 이름을 지어주세요."
                : "애칭은 이 나무를 배정받은 친구만 바꿀 수 있어요."}
            </small>
          </label>
        )}
        {step === 2 && (
          <div className="health-grid">
            <p>
              눈으로 확인한 상태를 모두 골라주세요. 진단이 아니라 관찰
              기록이에요.
            </p>
            {healthIndicators.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={health.includes(item)}
                  onChange={(e) =>
                    setHealth((old) =>
                      e.target.checked
                        ? item === "해당사항없음"
                          ? [item]
                          : [...old.filter((v) => v !== "해당사항없음"), item]
                        : old.filter((v) => v !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
          </div>
        )}
        {step === 3 && (
          <>
            <label className="wizard-field">
              나무 둘레 (cm, 선택)
              <input
                type="number"
                min="1"
                max="3000"
                step="0.1"
                value={girth}
                onChange={(e) => setGirth(e.target.value)}
                placeholder="안전하게 측정한 값만 입력"
              />
            </label>
            <label className="wizard-field">
              눈으로 본 덩치
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="small">앙상함</option>
                <option value="medium">보통</option>
                <option value="large">아름드리</option>
              </select>
            </label>
            <p className="care-note">
              나무에 올라가거나 줄기·뿌리를 손상시키지 않고, 안전한 위치에서
              관찰해요.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <label className="wizard-field">
              오늘의 소감
              <textarea
                value={text}
                minLength={2}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                placeholder="잎과 가지, 그늘은 어떤 모습인가요?"
              />
            </label>
            <label className="wizard-field">
              나무 사진 · 원본 15MB 이하, 자동 크기 축소
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photo && (
              <label className="wizard-field">
                사진 느낌
                <select
                  value={photoStyle}
                  onChange={(e) => setPhotoStyle(e.target.value as PhotoStyle)}
                >
                  <option value="natural">자연 그대로</option>
                  <option value="mono">흑백 기록</option>
                  <option value="warm">따뜻한 필름</option>
                </select>
              </label>
            )}
            <p className="care-note">
              이 관찰 기록과 사진은 이 브라우저에만 저장돼요.
            </p>
            <p className="care-note">
              사진은 최대 1200px로 줄이고 위치 메타데이터를 제거해 저장합니다.
              사진에 보이는 얼굴·차량번호 등은 올리기 전에 확인해 주세요.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="club-error">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <button
            className="outline"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            {step === 0 ? "나중에" : "이전"}
          </button>
          {step < 4 ? (
            <button className="primary" onClick={() => setStep(step + 1)}>
              다음 →
            </button>
          ) : (
            <button
              className="primary"
              disabled={
                busy ||
                uploading ||
                text.trim().length < 2 ||
                !species.trim() ||
                !nickname.trim()
              }
              onClick={() => void save()}
            >
              {uploading ? "저장 중…" : "관찰 기록 저장 ✓"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
