"use client";

import { useEffect, useRef, useState } from "react";
import "./mini-games.css";

type GameId = "bugs" | "prune" | "soil";
type GameRun = {
  id: string;
  game: string;
  targets: { id: string; x: number; y: number }[];
  startedAt: number | string;
};
type Props = {
  onAction: (
    action: string,
    extra?: Record<string, unknown>,
  ) => Promise<{ gameRun?: GameRun | null } | null>;
  busy: boolean;
  todayActions: string[];
};
const games: {
  id: GameId;
  icon: string;
  title: string;
  task: string;
  help: string;
  finish: string;
}[] = [
  {
    id: "bugs",
    icon: "🐛",
    title: "잎사귀 구조대",
    task: "상상 속 잎 먹보 친구들을 톡! 숲으로 보내주세요.",
    help: "실제 개미는 해충이 아닐 수 있어요. 야생 생물은 관찰하고, 게임 속 친구만 옮겨요.",
    finish: "잎사귀가 다시 활짝!",
  },
  {
    id: "prune",
    icon: "🌿",
    title: "가지 돌봄 연습",
    task: "반짝 표시된 가상 손상 가지 다섯 곳을 돌봐주세요.",
    help: "가상 훈련이에요. 실제 가지치기는 관리 주체와 전문가에게 맡겨주세요.",
    finish: "한결 가벼워진 나무!",
  },
  {
    id: "soil",
    icon: "🪨",
    title: "폭신폭신 흙 정원",
    task: "가상 정원의 작은 돌을 톡! 흙에 숨 쉴 틈을 만들어요.",
    help: "게임 안의 흙 돌봄이에요. 실제 뿌리 주변의 흙과 돌은 함부로 파거나 옮기지 않아요.",
    finish: "땅속까지 기분 좋은 하루!",
  },
];

function GardenDrawing({ soil }: { soil: boolean }) {
  return (
    <svg
      className="mini-garden-drawing"
      viewBox="0 0 600 300"
      aria-hidden="true"
    >
      <ellipse cx="300" cy="274" rx="242" ry="23" fill="#c4d9a7" />
      <path
        d="M87 271Q300 233 515 271L533 300H67Z"
        fill={soil ? "#ac8260" : "#e4d8bb"}
      />
      {soil ? (
        <>
          <path
            d="M170 270q30-24 43 0m67 7q25-28 45 0m72-8q32-25 51 0"
            fill="none"
            stroke="#775b46"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M296 256v-56m0 38q-40 3-40-30 38-1 40 30m1-13q39 0 38-28-35 1-38 28"
            fill="#6c994f"
            stroke="#497843"
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <path d="M291 270L284 114H316L310 270Z" fill="#aa7b52" />
          <path
            d="M298 213L242 159m58 37 55-60"
            stroke="#aa7b52"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M295 39c-39-31-88 1-78 35-65-4-84 70-37 94-11 59 68 78 112 47 38 29 113 13 114-37 52-28 25-91-14-95 1-47-61-69-97-44Z"
            fill="#7ca96a"
          />
          <ellipse cx="237" cy="105" rx="32" ry="38" fill="#91b77b" />
          <ellipse cx="343" cy="132" rx="36" ry="45" fill="#699758" />
          <circle cx="282" cy="152" r="4" fill="#35553b" />
          <circle cx="314" cy="152" r="4" fill="#35553b" />
          <path
            d="M289 166q10 10 18 0"
            fill="none"
            stroke="#35553b"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d="M112 270v-20m0 12-9-8m9 3 9-9m368 24v-22m0 12-9-6m9 1 9-9"
        stroke="#719455"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="102" cy="70" r="17" fill="#f7d789" />
      <path
        d="M451 58q10-15 20 0 11-16 20 0"
        fill="none"
        stroke="#92ab85"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MiniGames({ onAction, busy, todayActions }: Props) {
  const [chosen, setChosen] = useState<GameId>("bugs");
  const [run, setRun] = useState<GameRun | null>(null);
  const [collected, setCollected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [won, setWon] = useState<GameId | null>(null);
  const [pending, setPending] = useState(false);
  const requestLock = useRef(false);
  const game = games.find((item) => item.id === chosen)!;
  const played = todayActions.includes(`game:${chosen}`);
  const complete =
    !!run && collected.length === run.targets.length && run.targets.length > 0;
  useEffect(() => {
    if (!run) return;
    const timer = window.setTimeout(() => setReady(true), 3100);
    return () => window.clearTimeout(timer);
  }, [run]);

  async function start() {
    if (busy || requestLock.current || played) return;
    requestLock.current = true;
    setPending(true);
    try {
      const result = await onAction("game-start", { game: chosen });
      if (result?.gameRun) {
        setReady(false);
        setCollected([]);
        setWon(null);
        setRun(result.gameRun);
      }
    } finally {
      requestLock.current = false;
      setPending(false);
    }
  }

  async function finish() {
    if (!run || !complete || !ready || busy || requestLock.current) return;
    requestLock.current = true;
    setPending(true);
    try {
      const result = await onAction("game-finish", {
        runId: run.id,
        targets: collected,
      });
      if (result) {
        setWon(chosen);
        setRun(null);
      }
    } finally {
      requestLock.current = false;
      setPending(false);
    }
  }

  return (
    <section
      id="mini-games"
      className="mini-games"
      aria-labelledby="mini-games-title"
    >
      <div className="mini-games-heading">
        <div>
          <p className="eyebrow">LITTLE TREE RESCUE</p>
          <h3 id="mini-games-title">톡톡, 나무 돌봄 교실</h3>
          <p>작은 손길 다섯 번, 한 뼘 더 자라는 우정.</p>
        </div>
        <span className="mini-xp-badge">게임마다 하루 +25 XP</span>
      </div>
      <div
        className="mini-game-tabs"
        role="group"
        aria-label="돌봄 미니게임 선택"
      >
        {games.map((item) => (
          <button
            key={item.id}
            aria-pressed={chosen === item.id}
            disabled={busy || pending || !!run}
            onClick={() => {
              setChosen(item.id);
              setWon(null);
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <b>{item.title}</b>
            <small>
              {todayActions.includes(`game:${item.id}`)
                ? "✓ 오늘 돌봄 완료"
                : "+25 XP"}
            </small>
          </button>
        ))}
      </div>
      <div className={`mini-playground mini-playground-${chosen}`}>
        <GardenDrawing soil={chosen === "soil"} />
        {run &&
          run.targets.map((target, index) => {
            const done = collected.includes(target.id);
            return (
              <button
                key={target.id}
                className={`mini-target${done ? " mini-target-done" : ""}`}
                style={{
                  left: `${Math.min(89, Math.max(11, target.x))}%`,
                  top: `${Math.min(80, Math.max(18, target.y))}%`,
                  animationDelay: `${index * -0.3}s`,
                }}
                disabled={done || busy || pending}
                aria-label={`${game.title} ${index + 1}번째 돌봄${done ? " 완료" : ""}`}
                onClick={() =>
                  setCollected((previous) =>
                    previous.includes(target.id)
                      ? previous
                      : [...previous, target.id],
                  )
                }
              >
                <span aria-hidden="true">
                  {done
                    ? "✨"
                    : chosen === "bugs"
                      ? "🐛"
                      : chosen === "prune"
                        ? "🌿"
                        : "🪨"}
                </span>
                {!done && (
                  <small>{chosen === "prune" ? "✦ 돌봄" : index + 1}</small>
                )}
              </button>
            );
          })}
        {!run && (
          <div className="mini-start-card" role={won ? "status" : undefined}>
            {won ? (
              <>
                <span className="mini-win-icon" aria-hidden="true">
                  🌟
                </span>
                <h4>{game.finish}</h4>
                <p>오늘의 정성 +25 XP를 모았어요.</p>
                <small>다른 돌봄도 도전해 보세요!</small>
              </>
            ) : (
              <>
                <span aria-hidden="true">{game.icon}</span>
                <h4>{game.title}</h4>
                <p>{game.task}</p>
                <button
                  className="primary"
                  disabled={busy || pending || played}
                  onClick={() => void start()}
                >
                  {played
                    ? "✓ 오늘은 충분히 돌봤어요"
                    : pending
                      ? "정원 준비 중…"
                      : "돌봄 시작하기 →"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mini-game-status" aria-live="polite">
        {run ? (
          <>
            <div>
              <b>{complete ? "다섯 곳 모두 돌봤어요!" : game.task}</b>
              <span>
                {collected.length} / {run.targets.length} 완료
              </span>
              <progress
                value={collected.length}
                max={run.targets.length}
                aria-label="미니게임 돌봄 진행률"
              />
            </div>
            <button
              className="primary"
              disabled={!complete || !ready || busy || pending}
              onClick={() => void finish()}
            >
              {pending
                ? "기록 중…"
                : complete && !ready
                  ? "나무가 기지개 켜는 중…"
                  : "돌봄 완료 · +25 XP"}
            </button>
            <button
              className="mini-cancel"
              disabled={busy || pending}
              onClick={() => {
                setRun(null);
                setCollected([]);
                setReady(false);
              }}
            >
              그만하기
            </button>
          </>
        ) : (
          <span>
            시간에 쫓기지 않고 천천히. 클릭하거나 Tab과 Enter로 돌봐주세요.
          </span>
        )}
      </div>
      <p className="mini-real-tree-note">
        <span aria-hidden="true">🌱</span> {game.help}
      </p>
    </section>
  );
}
