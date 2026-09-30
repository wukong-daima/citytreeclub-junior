import { useCallback, useEffect, useRef, useState } from "react";
import { completionTargets } from "../lib/care-games";
import { BugGame } from "./games/bug-game";
import { PruneGame } from "./games/prune-game";
import { SoilGame } from "./games/soil-game";
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
  onPlayingChange?: (playing: boolean) => void;
  firstTime?: boolean;
};
const games = [
  {
    id: "bugs",
    icon: "🐛",
    title: "잎사귀 구조대",
    task: "기어가고 날아다니는 잎 먹보 5마리를 30초 안에 잡아요.",
    help: "실제 개미는 해충이 아닐 수 있어요. 실제 생물은 관찰하고, 게임 속 친구만 옮겨요.",
  },
  {
    id: "prune",
    icon: "✂",
    title: "가지 돌봄 연습",
    task: "초록 구간에 바가 오면 눌러요. 45초 안에 가지 다섯 곳을 돌봐요.",
    help: "가상 훈련이에요. 실제 가지치기는 관리 주체와 전문가에게 맡겨주세요.",
  },
  {
    id: "soil",
    icon: "🧱",
    title: "폭신폭신 흙 정원",
    task: "떨어지는 흙 블록을 이동·회전해서 가로줄 5개를 채워요.",
    help: "가상 흙 퍼즐이에요. 실제 뿌리 주변의 흙과 돌은 함부로 파거나 옮기지 않아요.",
  },
] as const;
export function MiniGames({
  onAction,
  busy,
  todayActions,
  onPlayingChange,
  firstTime = false,
}: Props) {
  const [chosen, setChosen] = useState<GameId>("bugs"),
    [run, setRun] = useState<GameRun | null>(null),
    [status, setStatus] = useState<
      "idle" | "playing" | "won" | "lost" | "rewarded"
    >("idle"),
    [count, setCount] = useState(0),
    [easy, setEasy] = useState(
      firstTime ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [paused, setPaused] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const lock = useRef(false),
    game = games.find((g) => g.id === chosen)!,
    played = todayActions.includes(`game:${chosen}`);
  useEffect(() => {
    onPlayingChange?.(status === "playing" || status === "won");
    return () => onPlayingChange?.(false);
  }, [status, onPlayingChange]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if (!run) return;
    const started =
      typeof run.startedAt === "number"
        ? run.startedAt
        : new Date(run.startedAt).getTime();
    const timer = setInterval(() => {
      if (Date.now() - started >= 600000) {
        setStatus("lost");
        setError("게임 시간이 만료됐어요. 다시 시작해주세요.");
      }
    }, 1000);
    const min = setTimeout(() => setReady(true), 3100);
    return () => {
      clearInterval(timer);
      clearTimeout(min);
    };
  }, [run]);
  const progress = useCallback((n: number) => {
    setCount(n);
    if (n >= 5) setStatus("won");
  }, []);
  const fail = useCallback(() => setStatus("lost"), []);
  async function start() {
    if (lock.current || busy || played) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const result = await onAction("game-start", { game: chosen });
      if (result?.gameRun) {
        setRun(result.gameRun);
        setCount(0);
        setReady(false);
        setPaused(false);
        setStatus("playing");
      } else setError("시작하지 못했어요. 다시 시도해주세요.");
    } catch {
      setError("게임을 시작하지 못했어요.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function finish() {
    if (!run || status !== "won" || !ready || lock.current || busy) return;
    lock.current = true;
    setPending(true);
    try {
      const result = await onAction("game-finish", {
        runId: run.id,
        targets: completionTargets(run.targets, count, true),
      });
      if (result) {
        setStatus("rewarded");
        setRun(null);
      } else setError("보상을 저장하지 못했어요. 다시 시도해주세요.");
    } catch {
      setError("보상 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const Game =
    chosen === "bugs" ? BugGame : chosen === "prune" ? PruneGame : SoilGame;
  return (
    <section
      id="mini-games"
      tabIndex={-1}
      className="mini-games"
      aria-labelledby="mini-games-title"
    >
      <div className="mini-games-heading">
        <div>
          <p className="eyebrow">LITTLE TREE RESCUE</p>
          <h3 id="mini-games-title">톡톡, 나무 돌봄 교실</h3>
        </div>
        <span className="mini-xp-badge">게임마다 하루 +25 XP</span>
      </div>
      <div
        className="mini-game-tabs"
        role="group"
        aria-label="돌봄 미니게임 선택"
      >
        {games.map((g) => (
          <button
            key={g.id}
            aria-pressed={chosen === g.id}
            disabled={pending || status === "playing" || status === "won"}
            onClick={() => {
              setChosen(g.id);
              setStatus("idle");
              setRun(null);
              setError("");
            }}
          >
            <span>{g.icon}</span>
            <b>{g.title}</b>
            <small>
              {todayActions.includes(`game:${g.id}`) ? "✓ 오늘 완료" : "+25 XP"}
            </small>
          </button>
        ))}
      </div>
      {status === "playing" ? (
        <div className="active-game">
          <div className="game-toolbar">
            <button onClick={() => setPaused(!paused)}>
              {paused ? "▶ 계속하기" : "Ⅱ 잠시 쉬기"}
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm("게임을 그만할까요? 경험치는 지급되지 않아요.")
                ) {
                  setStatus("idle");
                  setRun(null);
                }
              }}
            >
              게임 그만하기
            </button>
          </div>
          {paused && (
            <p role="status" className="pause-notice">
              잠시 쉬는 중이에요. 계속하기를 눌러주세요.
            </p>
          )}
          <Game
            key={run?.id}
            easy={easy}
            paused={paused || busy}
            onProgress={progress}
            onFail={fail}
          />
        </div>
      ) : (
        <div className="game-intro">
          <span className="game-big-icon">
            {status === "won" || status === "rewarded" ? "🌟" : game.icon}
          </span>
          <h4>
            {status === "won"
              ? "돌봄 성공!"
              : status === "rewarded"
                ? "나무와 함께 한 뼘 자랐어요!"
                : status === "lost"
                  ? "괜찮아요, 다시 도전해요!"
                  : game.title}
          </h4>
          <p>{game.task}</p>
          {status === "won" ? (
            <button
              className="primary"
              disabled={pending || busy || !ready}
              onClick={() => void finish()}
            >
              {!ready ? "보상 준비 중…" : "돌봄 완료 · +25 XP 받기"}
            </button>
          ) : (
            <>
              <label className="difficulty">
                난이도{" "}
                <select
                  value={easy ? "easy" : "normal"}
                  onChange={(e) => setEasy(e.target.value === "easy")}
                >
                  <option value="easy">쉬움 · 천천히 연습</option>
                  <option value="normal">보통 · 도전!</option>
                </select>
              </label>
              <button
                className="primary"
                disabled={played || busy || pending}
                onClick={() => void start()}
              >
                {played
                  ? "✓ 오늘의 경험치를 받았어요"
                  : pending
                    ? "준비 중…"
                    : status === "lost"
                      ? "다시 도전하기"
                      : "게임 시작하기"}
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="club-error">
          {error}
        </p>
      )}
      <p className="game-help">🌱 {game.help}</p>
    </section>
  );
}
