"use client";

import { useEffect, useState, useRef } from "react";
import { localFetch } from "../lib/local-api";
import { BackupControls } from "./backup-controls";
import { TreeArt } from "./tree-art";
import { growth } from "../lib/domain";
import { navigateTutorial } from "../lib/tutorial-navigation";
import { JuniorGarden, Tutorial, CelebrationToast } from "./junior-garden";
import { TreeMap } from "./tree-map";
import { Club } from "./club";
import { ThemeSwitch } from "./theme-switch";
import { PhysicalEvents } from "./physical-events";
import type { Tree, Garden, Celebration } from "./garden-types";
import "./junior.css";
import "./theme.css";
const initial: Garden = {
  tree: null,
  xp: 0,
  visits: 0,
  water: 0,
  compost: 0,
  decoration: "none",
  logs: [],
  interests: [],
  nickname: "",
  tutorialCompleted: false,
  gameWins: 0,
  careDays: 0,
  points: 0,
  applications: [],
  todayActions: [],
};
const events = [
  {
    id: "nameplate",
    tag: "함께 이름을 불러요",
    title: "나무에게 이름을",
    desc: "관찰이 쌓이면, 소중한 친구에게 이름을 선물해요.",
    icon: "⌑",
    color: "peach",
    condition: "100 돌봄 포인트 + 이 기기의 체험 신청",
    detail:
      "관리 주체가 승인한 위치의 독립 안내대에만 이름표를 설치합니다. 나무에 못·접착제·철사를 사용하지 않으며, 설치 후 7일 안에 회수하는 운영안을 제안합니다. 아직 확정된 현장 행사는 아닙니다.",
  },
  {
    id: "season-walk",
    tag: "계절을 수집하는 산책",
    title: "같은 나무, 다른 계절",
    desc: "잎 하나, 그림자 하나. 나무의 오늘을 기록해요.",
    icon: "☀",
    color: "yellow",
    condition: "관찰 기록부터 누구나",
    detail:
      "같은 자리에서 계절마다 나무를 관찰해 보세요. 꽃, 새순, 잎 색, 그늘을 기록하면 변화가 보입니다. 사진 기록과 사계절 배지는 다음 단계로 제안합니다.",
  },
  {
    id: "tree-watch",
    tag: "작은 관심이 큰 보호로",
    title: "우리 동네 나무지킴이",
    desc: "나무의 안부를 묻고, 함께 지킬 방법을 배워요.",
    icon: "♧",
    color: "sage",
    condition: "나무를 아끼는 마음이면 충분해요",
    detail:
      "가지 손상, 뿌리 주변 포장, 공사 안내를 안전한 거리에서 관찰하고 기록합니다. 위험한 현장에는 접근하지 않고 관할 관리 부서에 사실을 전달하는 시민 관찰 프로그램입니다.",
  },
];

export default function Home() {
  const [tab, setTab] = useState("discover"),
    [garden, setGarden] = useState<Garden>(initial),
    [trees, setTrees] = useState<Tree[]>([]),
    [location, setLocation] = useState("서울숲"),
    [coords, setCoords] = useState({ lat: 37.5445, lng: 127.0374 }),
    [radius, setRadius] = useState(500),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<Tree | null>(null),
    [modal, setModal] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [loaded, setLoaded] = useState(false);
  const [effect, setEffect] = useState<Celebration | null>(null);
  useEffect(() => {
    if (!effect) return;
    const timer = setTimeout(() => setEffect(null), 4200);
    return () => clearTimeout(timer);
  }, [effect]);
  const searchId = useRef(0),
    [searching, setSearching] = useState(false);
  async function search(lat = coords.lat, lng = coords.lng, r = radius) {
    const id = ++searchId.current;
    setSearching(true);
    setTrees([]);
    setSelected(null);
    try {
      const res = await localFetch(
        `/api/trees?lat=${lat}&lng=${lng}&radius=${r}`,
      );
      const data = (await res.json()) as { trees: Tree[]; error?: string };
      if (!res.ok) throw Error(data.error);
      if (id === searchId.current) setTrees(data.trees);
    } catch (e) {
      if (id === searchId.current)
        setMessage(
          e instanceof Error ? e.message : "나무를 불러오지 못했어요.",
        );
    } finally {
      if (id === searchId.current) setSearching(false);
    }
  }
  useEffect(() => {
    localFetch("/api/garden")
      .then((r) => {
        if (!r.ok) throw Error("정원을 불러오지 못했어요. 새로고침해 주세요.");
        return r.json() as Promise<Garden>;
      })
      .then((d) => {
        setGarden(d);
        if (window.location.hash.startsWith("#record=")) setTab("club");
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoaded(true));
    localFetch("/api/trees?lat=37.5445&lng=127.0374&radius=500")
      .then((r) => r.json() as Promise<{ trees: Tree[] }>)
      .then((d) => {
        if (searchId.current === 0) setTrees(d.trees ?? []);
      })
      .catch(() => setMessage("나무 목록 연결을 확인해 주세요."));
  }, []);
  async function act(
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<Garden | null> {
    setBusy(true);
    try {
      const res = await localFetch("/api/garden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as Garden & { error?: string };
      if (!res.ok) throw Error(data.error || "다시 시도해 주세요.");
      setGarden(data);
      if (action !== "game-start") {
        const titles: Record<string, string> = {
          assign: "새로운 나무 친구를 만났어요!",
          rename: `${data.nickname}, 앞으로 잘 부탁해!`,
          water: "촉촉한 마음을 전했어요",
          compost: "나무가 한 뼘 더 튼튼해졌어요",
          "demo-visit": "오늘도 찾아와 줘서 고마워!",
          "game-finish": "돌봄 미션 성공! 참 잘했어요",
          note: "우리의 오늘을 기록했어요",
          decorate: "나무의 새 모습을 만나보세요",
          interest: "함께할 활동에 마음을 남겼어요",
          "physical-apply": "이 기기에 체험 신청을 저장했어요!",
          "tutorial-complete": "첫 돌봄 여행을 마쳤어요!",
        };
        setEffect({
          id: Date.now(),
          action,
          title: titles[action] || "소중한 기록을 남겼어요",
          xp: Math.max(0, data.xp - garden.xp),
          levelUp: growth(data.xp).level > growth(garden.xp).level,
        });
        setMessage("");
        setModal(null);
      }
      if (action === "assign") setTab("garden");
      if (action === "note") setNote("");
      return data;
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  function gps() {
    if (!navigator.geolocation) {
      setMessage("이 브라우저는 위치 정보를 지원하지 않아요.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        setLocation("현재 위치");
        void search(c.lat, c.lng);
        setBusy(false);
        setMessage(
          "현재 위치를 기준으로 검색했어요. 샘플 나무는 서울숲에만 있어요.",
        );
      },
      () => {
        setBusy(false);
        setMessage(
          "위치 권한을 허용하거나 지도와 좌표로 위치를 지정해 주세요.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  function findLocation() {
    const known: Record<string, { lat: number; lng: number }> = {
      서울숲: { lat: 37.5445, lng: 127.0374 },
      뚝섬역: { lat: 37.5472, lng: 127.0473 },
      성수동: { lat: 37.5445, lng: 127.045 },
      서울숲역: { lat: 37.5436, lng: 127.0447 },
    };
    const found = known[location.trim()];
    if (found) {
      setCoords(found);
      void search(found.lat, found.lng);
      return;
    }
    const nums = location.split(",").map(Number);
    if (
      nums.length === 2 &&
      nums.every(Number.isFinite) &&
      Math.abs(nums[0]) <= 90 &&
      Math.abs(nums[1]) <= 180
    ) {
      setCoords({ lat: nums[0], lng: nums[1] });
      void search(nums[0], nums[1]);
    } else
      setMessage(
        "서울숲·서울숲역·뚝섬역·성수동 또는 위도, 경도로 검색해 주세요.",
      );
  }
  async function refreshGarden() {
    const r = await localFetch("/api/garden");
    if (!r.ok) throw Error("정원 상태를 불러오지 못했어요.");
    setGarden((await r.json()) as Garden);
  }
  const scrollTo = (name: string) => {
    setTab(name);
    document
      .getElementById("experience")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <>
      <BackupControls />
      <div className="announcement">
        서울환경연합과 함께하는 팀 나무늘보 · 작은 관심으로 자라는 시티트리클럽
        주니어 <span>↗</span>
      </div>
      <header className="site-header">
        <a className="brand" href="./" aria-label="시티트리클럽 주니어 홈">
          <span className="brand-mark">♧</span>
          <span>
            시티트리클럽 주니어<small>CITY TREE CLUB JUNIOR</small>
          </span>
        </a>
        <nav aria-label="주 메뉴">
          <button
            className={tab === "discover" ? "active" : ""}
            onClick={() => scrollTo("discover")}
          >
            나무 만나기
          </button>
          <button
            className={tab === "garden" ? "active" : ""}
            onClick={() => scrollTo("garden")}
          >
            내 나무
          </button>
          <a href="#events">함께하는 활동</a>
          <button onClick={() => setModal("about")}>모임 이야기</button>
          <ThemeSwitch />
        </nav>
        <button
          className="header-button"
          onClick={() => scrollTo(garden.tree ? "garden" : "discover")}
        >
          {garden.tree ? "나의 작은 정원" : "나무와 친구 맺기"}
          <span>↗</span>
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> A LITTLE CARE, A GREENER CITY
            </p>
            <h1>
              매일 걷던 길에,
              <br />
              <span>내 나무</span>가 생겼다.
            </h1>
            <p className="hero-description">
              그저 스쳐 지나던 나무 한 그루.
              <br />
              이제는 이름을 부르고, 안부를 묻는 사이가 되어보세요.
            </p>
            <button className="primary" onClick={() => scrollTo("discover")}>
              내 나무 만나러 가기 <span>↗</span>
            </button>
            <div className="hero-foot">
              <span className="tiny-leaves">♧ ♧ ♧</span>
              <span>작은 관심이 모여, 더 푸른 도시로.</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-note">오늘도, 잘 자라고 있어요.</span>
            <div className="floating-label">
              <span className="dot" /> 우리, 나무 친구 할래요?
            </div>
            <TreeArt />
            <span className="art-coordinate">37°32′ N &nbsp; 127°02′ E</span>
            <span className="art-tag">한 그루의 나무, 하나의 인연</span>
            <span className="spark spark-one">✳</span>
            <span className="spark spark-two">✳</span>
          </div>
        </section>
        <div className="how-strip">
          <span>
            <b>01</b> 가까운 나무를 만나고
          </span>
          <i>→</i>
          <span>
            <b>02</b> 산책하며 안부를 묻고
          </span>
          <i>→</i>
          <span>
            <b>03</b> 관심만큼 함께 자라요
          </span>
          <span className="strip-end">
            우리의 일상에 초록을 더하는 방법 <span>↗</span>
          </span>
        </div>
        <section className="experience" id="experience">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR NEIGHBORHOOD, YOUR TREE</p>
              <h2>가까이 있던, 새로운 친구</h2>
            </div>
            <span className="demo-pill">
              <span /> 서울숲 샘플 체험
            </span>
          </div>
          <div className="tabs" role="tablist" aria-label="나무 활동">
            <button
              role="tab"
              aria-selected={tab === "discover"}
              className={tab === "discover" ? "active" : ""}
              onClick={() => setTab("discover")}
            >
              ⌖ &nbsp; 나무 만나기
            </button>
            <button
              role="tab"
              aria-selected={tab === "garden"}
              className={tab === "garden" ? "active" : ""}
              onClick={() => setTab("garden")}
            >
              ♧ &nbsp; 내 나무 키우기{" "}
              {garden.tree && <span className="tab-dot" />}
            </button>
            <button
              role="tab"
              aria-selected={tab === "journal"}
              className={tab === "journal" ? "active" : ""}
              onClick={() => setTab("journal")}
            >
              ▤ &nbsp; 관찰 일지
            </button>
            <button
              role="tab"
              aria-selected={tab === "club"}
              className={tab === "club" ? "active" : ""}
              onClick={() => setTab("club")}
            >
              ♡ &nbsp; 우리 동네 클럽
            </button>
          </div>
          {loaded && (
            <Tutorial
              garden={garden}
              busy={busy}
              act={act}
              onStep={(step) =>
                navigateTutorial(step, {
                  assign: () => setModal("assign"),
                  garden: () => scrollTo("garden"),
                  water: () => {
                    void act("water");
                  },
                  events: () => setModal("physical"),
                  focus: (id) => {
                    setTimeout(() => {
                      const target = document.getElementById(id);
                      target?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      target?.focus({ preventScroll: true });
                    }, 100);
                  },
                })
              }
            />
          )}
          {tab === "discover" && (
            <div className="discovery">
              <div className="search-panel">
                <span className="step-label">STEP 01 · 나의 산책길 정하기</span>
                <h3>어디서 만나고 싶나요?</h3>
                <p>
                  위치를 정하면 가까운 10그루 중<br />한 그루가 당신의 나무가
                  됩니다.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    findLocation();
                  }}
                >
                  <label htmlFor="place">동네 또는 좌표 검색</label>
                  <div className="search-input">
                    <span>⌕</span>
                    <input
                      id="place"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="서울숲 또는 37.5445,127.0374"
                    />
                    <button type="submit" aria-label="위치 검색">
                      ↵
                    </button>
                  </div>
                </form>
                <button className="gps-button" onClick={gps} disabled={busy}>
                  ⌖ &nbsp; 현재 내 위치로 찾기
                </button>
                <div className="radius-label">
                  <label htmlFor="radius">어디까지 걸어볼까요?</label>
                  <span>선택한 위치 기준</span>
                </div>
                <select
                  id="radius"
                  aria-describedby="radius-help"
                  value={radius}
                  onChange={(e) => {
                    setRadius(Number(e.target.value));
                    void search(coords.lat, coords.lng, Number(e.target.value));
                  }}
                >
                  <option value={300}>반경 300m · 가까운 산책</option>
                  <option value={500}>반경 500m · 가벼운 산책</option>
                  <option value={1000}>반경 1km · 여유로운 산책</option>
                  <option value={2000}>반경 2km · 긴 산책</option>
                </select>
                <p id="radius-help" className="form-hint">
                  ‘현재 내 위치로 찾기’를 누른 뒤, 내 위치에서 어느 거리 안의
                  나무를 내 나무로 만날지 선택해주세요. 직접 검색한 위치도
                  기준으로 사용할 수 있어요. 반경은 도보 경로가 아닌
                  직선거리예요.
                </p>
                <div className="match-note">
                  <span>✳</span>
                  <p>
                    <b>우연히 만나, 특별한 사이로</b>선택한 반경 안에서 가장
                    가까운 최대 10그루 중<br />
                    무작위로 한 그루와 인연을 맺어요.
                  </p>
                </div>
                <button
                  className="primary wide"
                  disabled={
                    busy ||
                    searching ||
                    !loaded ||
                    trees.length === 0 ||
                    !!garden.tree
                  }
                  onClick={() => setModal("assign")}
                >
                  {garden.tree
                    ? "이미 나무 친구가 있어요"
                    : `${trees.length}그루 중 내 나무 만나기`}
                  <span>↗</span>
                </button>
                <small className="muted">
                  샘플 위치이며 실제 나무의 존재를 보증하지 않아요.
                </small>
              </div>
              <div className="map-panel">
                <div className="map-header">
                  <span>
                    <span className="dot" /> {location || "선택한 위치"} 주변
                  </span>
                  <span>
                    가까운 친구 <b>{trees.length}</b>
                  </span>
                </div>
                <TreeMap
                  trees={trees}
                  center={coords}
                  radius={radius}
                  selectedId={selected?.id}
                  onSelect={setSelected}
                  onCenter={(lat, lng) => {
                    setCoords({ lat, lng });
                    setLocation("지도에서 선택한 위치");
                    void search(lat, lng);
                  }}
                />
                <div className="map-footer">
                  <span>● &nbsp; 배정 가능한 나무</span>
                  <span>
                    <i /> &nbsp; 내가 정한 위치
                  </span>
                  <span>지도를 눌러 위치를 바꿔보세요</span>
                </div>
                <div className="tree-list" aria-label="가까운 나무 목록">
                  {trees.length ? (
                    trees.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className={selected?.id === t.id ? "selected" : ""}
                      >
                        <span className="list-number">{i + 1}</span>
                        <span>
                          <b>{t.name}</b>
                          <small>{t.species} · 샘플</small>
                        </span>
                        <strong>
                          {Math.round(t.distance ?? 0)}
                          <small>m</small>
                        </strong>
                      </button>
                    ))
                  ) : (
                    <p className="empty">
                      이 반경에는 샘플 나무가 없어요. 서울숲으로 이동하거나
                      반경을 넓혀보세요.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === "garden" && (
            <JuniorGarden
              garden={garden}
              busy={busy}
              act={act}
              effect={effect}
              onDiscover={() => setTab("discover")}
              onPhysical={() => setModal("physical")}
              onDecorate={() => setModal("decorate")}
            />
          )}
          {tab === "club" && (
            <Club
              onGardenChange={refreshGarden}
              onOpenGarden={() => scrollTo("garden")}
            />
          )}
          {tab === "journal" && (
            <div className="journal">
              <div>
                <p className="eyebrow">LITTLE MOMENTS, LASTING ROOTS</p>
                <h3>나무의 오늘을 남겨주세요.</h3>
                <p>
                  잎의 색, 나뭇가지의 새, 발밑의 작은 변화까지.
                  <br />
                  꾸준한 관찰은 나무를 지키는 첫걸음이에요.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("note", { text: note });
                  }}
                >
                  <label htmlFor="note">오늘의 관찰</label>
                  <textarea
                    id="note"
                    minLength={2}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="오늘 나무에게서 무엇을 발견했나요?"
                    required
                  />
                  <small>{note.length}/500 · 하루 한 번 기록 보상</small>
                  <button
                    className="primary"
                    disabled={!garden.tree || busy || note.trim().length < 2}
                  >
                    일지 남기기 +5 XP ↗
                  </button>
                </form>
                {!garden.tree && (
                  <p className="care-note">먼저 나무 친구를 만나주세요.</p>
                )}
              </div>
              <div className="journal-log">
                <h4>
                  우리의 작은 기록 <span>{garden.logs.length}</span>
                </h4>
                {garden.logs.length ? (
                  garden.logs.map((log, i) => (
                    <article key={i}>
                      <span className="log-icon">
                        {log.action === "note" ? "▤" : "♧"}
                      </span>
                      <div>
                        <b>
                          {{
                            assign: "나무 친구가 되었어요",
                            water: "시원한 물을 주었어요",
                            compost: "영양 가득 거름을 주었어요",
                            "demo-visit": "나무 방문을 체험했어요",
                            note: "오늘의 관찰",
                            rename: "나무에게 이름을 선물했어요",
                            "game:bugs": "꼬물꼬물 돌봄 미션 완료",
                            "game:prune": "가지 돌봄 미션 완료",
                            "game:soil": "흙 돌봄 미션 완료",
                            decorate: "정원을 꾸몄어요",
                            interest: "활동에 관심을 남겼어요",
                          }[log.action] || log.action}
                        </b>
                        {log.text && <p>{log.text}</p>}
                        <small>
                          {log.createdAt || log.created_at
                            ? new Date(
                                log.createdAt || log.created_at || "",
                              ).toLocaleDateString("ko-KR")
                            : "기록 저장됨"}
                        </small>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty">
                    <span>▤</span>
                    <p>
                      아직 기록이 없어요.
                      <br />첫 만남부터 천천히 채워보세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        <section className="physical-banner">
          <span>💌</span>
          <div>
            <p className="eyebrow">100 POINTS, A REAL-WORLD MEMORY</p>
            <h2>나무 곁에, 우리의 마음을 걸어요.</h2>
            <p>
              이름표부터 감사의 말, 특별한 고백까지. 포인트를 모아 1·3·7일의
              추억을 기획해 보세요. 체험 신청은 이 기기에만 저장돼요.
            </p>
          </div>
          <button className="primary" onClick={() => setModal("physical")}>
            이벤트 체험 신청 ↗
          </button>
        </section>
        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GROW TOGETHER</p>
              <h2>나무와 함께, 우리도 자라는 시간</h2>
            </div>
            <span className="section-aside">작은 실천을 더 즐겁게 ↗</span>
          </div>
          <div className="event-grid">
            {events.map((event, i) => (
              <button
                className={`event-card ${event.color}`}
                key={event.id}
                onClick={() => setModal(event.id)}
              >
                <div className="event-art">
                  <span className="event-kicker">0{i + 1} / TOGETHER</span>
                  <span className="event-illustration">{event.icon}</span>
                  <span className="event-sticker">
                    {i === 0
                      ? "HELLO, TREE!"
                      : i === 1
                        ? "SEASON BY SEASON"
                        : "WE CARE."}
                  </span>
                </div>
                <div className="event-body">
                  <small>{event.tag}</small>
                  <h3>
                    {event.title}
                    <span>↗</span>
                  </h3>
                  <p>{event.desc}</p>
                  <span className="event-condition">
                    {garden.interests.includes(event.id)
                      ? "✓ 관심 등록 완료"
                      : event.condition}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="events-note">
            기획 중인 활동입니다. 실제 설치·장식은 관리 주체의 승인 후, 나무에
            손상을 주지 않는 방식으로만 진행해요.
          </p>
        </section>
        <section className="manifesto">
          <div>
            <span className="eyebrow">A TREE IS SOMEONE’S FRIEND.</span>
            <h2>
              누군가의 나무가 되면,
              <br />
              쉽게 사라지지 않도록.
            </h2>
          </div>
          <div>
            <p>
              우리는 나무를 소유하는 대신, 관계를 맺습니다.
              <br />
              매일의 안부가 기록이 되고, 기록이 관심이 되고,
              <br />그 관심이 우리 동네 나무를 지키는 힘이 되기를.
            </p>
            <button onClick={() => setModal("about")}>
              시티트리클럽 주니어 이야기 <span>↗</span>
            </button>
          </div>
          <span className="manifesto-leaf">♧</span>
        </section>
      </main>
      <footer>
        <a className="brand" href="./">
          ♧ 시티트리클럽 주니어
        </a>
        <p>나무와 나 사이, 조금 더 가까이.</p>
        <div>
          <a
            href="https://www.seoulkfem.or.kr/citytreeclub/"
            target="_blank"
            rel="noreferrer"
          >
            영감을 준 시티트리클럽 ↗
          </a>
          <button onClick={() => setModal("privacy")}>기록과 개인정보</button>
        </div>
        <small>
          © 2026 시티트리클럽 주니어 · 서울환경연합과 함께하는 팀 나무늘보 제작
          · 김현진 · 김나현 · 박서연 · 정경섭 · 최미혜
        </small>
      </footer>
      <CelebrationToast effect={effect} />
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="알림 닫기">
            ×
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setModal(null);
              if (e.key === "Tab") {
                const items = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), a[href], input, textarea, select",
                );
                const first = items[0],
                  last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <button
              className="modal-close"
              onClick={() => setModal(null)}
              aria-label="닫기"
              autoFocus
            >
              ×
            </button>
            {modal === "assign" ? (
              <>
                <p className="eyebrow">A NEW FRIENDSHIP</p>
                <h2 id="modal-title">어떤 나무와 만나게 될까요?</h2>
                <p>
                  선택한 위치의 반경 {radius}m 안에서 가장 가까운 {trees.length}
                  그루 중 한 그루를 무작위로 배정합니다. 한 번 맺은 인연은
                  유지돼요.
                </p>
                <p className="care-note">
                  현재는 샘플 나무입니다. 실제 현장 방문용 위치가 아닙니다.
                </p>
                <button
                  className="primary wide"
                  disabled={busy}
                  onClick={() => void act("assign", { ...coords, radius })}
                >
                  {busy ? "인연을 찾는 중…" : "나의 나무 만나기 ↗"}
                </button>
              </>
            ) : modal === "physical" ? (
              <PhysicalEvents garden={garden} act={act} busy={busy} />
            ) : modal === "decorate" ? (
              <>
                <h2 id="modal-title">내 정원의 작은 취향</h2>
                <p>
                  30 XP부터 가상 정원을 꾸밀 수 있어요. 실제 나무의
                  이름표·메시지·장식은 100 돌봄 포인트를 모아 이벤트 체험으로
                  기획해 보세요. 운영자에게 신청이 전송되지 않습니다.
                </p>
                <div className="decoration-grid">
                  {[
                    ["none", "♧", "자연 그대로"],
                    ["ribbon", "⋈", "따뜻한 리본"],
                    ["nameplate", "⌑", "우리의 이름표"],
                    ["birdhouse", "⌂", "작은 새집"],
                  ].map(([id, icon, label]) => (
                    <button
                      key={id}
                      disabled={busy || (id !== "none" && garden.xp < 30)}
                      onClick={() => void act("decorate", { decoration: id })}
                    >
                      <span>{icon}</span>
                      {label}
                      {garden.decoration === id && <small>사용 중</small>}
                    </button>
                  ))}
                </div>
              </>
            ) : modal === "about" ? (
              <>
                <h2 id="modal-title">관심이 뿌리내리는 도시</h2>
                <p>
                  시티트리클럽 주니어은 나무를 자주 만나고 기록함으로써 그
                  가치를 발견하는 서비스입니다. 서울환경연합 시티트리클럽의
                  나무와 관계 맺기, 계절 관찰, 시민 기록에 영감을 받았습니다.
                </p>
                <p>
                  서울환경연합과 함께하는 팀 나무늘보가 만들었습니다. 팀원:
                  김현진, 김나현, 박서연, 정경섭, 최미혜. 경쟁 순위보다 나무를
                  오래 돌본 시간에 가치를 둡니다.
                </p>
                <a
                  className="primary"
                  href="https://www.seoulkfem.or.kr/citytreeclub/"
                  target="_blank"
                  rel="noreferrer"
                >
                  원본 캠페인 만나기 ↗
                </a>
              </>
            ) : modal === "privacy" ? (
              <>
                <h2 id="modal-title">우리의 기록에 관하여</h2>
                <p>
                  계정 없이 이 브라우저에 정원·사진·활동 기록을 저장합니다. 다른
                  기기와 자동 동기화되지 않습니다. 브라우저 데이터를 삭제하기
                  전에 백업을 내보내 주세요.
                </p>
                <p>
                  현재 위치는 검색을 요청할 때만 사용하며 나무 검색 좌표를
                  별도로 저장하지 않습니다. 관찰 일지에 연락처나 다른 사람의
                  개인정보를 적지 마세요.
                </p>
                <p>
                  이 버전은 샘플 나무를 이용하는 개인 체험판입니다. 사진과 관찰
                  기록은 공개되지 않으며, 내 정보에서 이 브라우저의 데이터를
                  삭제할 수 있습니다. 체험 신청과 나무 메모는 운영기관에
                  전송되지 않습니다.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">LET’S GROW TOGETHER</p>
                <h2 id="modal-title">
                  {events.find((e) => e.id === modal)?.title}
                </h2>
                <p>{events.find((e) => e.id === modal)?.detail}</p>
                <div className="event-requirement">
                  {events.find((e) => e.id === modal)?.condition}
                </div>
                <p className="care-note">
                  관심 등록은 참가 확정이나 설치 허가가 아닙니다. 샘플 방문은
                  현장 이벤트 조건에 포함되지 않습니다.
                </p>
                <button
                  className="primary wide"
                  disabled={busy || garden.interests.includes(modal)}
                  onClick={() => void act("interest", { eventId: modal })}
                >
                  {garden.interests.includes(modal)
                    ? "✓ 관심 등록 완료"
                    : "이 활동에 관심 있어요 ♡"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
