import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  parseScreen,
  restoreHistoryDelta,
  type AppScreen,
} from "../lib/app-navigation";
import "./app-frame.css";

export const screenLabels: Record<AppScreen, string> = {
  discover: "나무 찾기",
  garden: "내 나무",
  games: "돌봄 게임",
  journal: "관찰장",
  events: "이벤트",
  club: "나의 기록",
  about: "모임 소개",
};
export function useAppNavigation(playing: boolean) {
  const [screen, update] = useState<AppScreen>(() =>
    parseScreen(window.location.hash),
  );
  const current = useRef(screen);
  const active = useRef(playing);
  const index = useRef(Number(window.history.state?.citytreeIndex) || 0);
  const restoring = useRef(false);
  useEffect(() => {
    active.current = playing;
  }, [playing]);
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, citytreeIndex: index.current },
      "",
    );
    const change = () => {
      const next = parseScreen(window.location.hash);
      if (restoring.current) {
        if (next === current.current) restoring.current = false;
        return;
      }
      if (next === current.current) return;
      const destination =
        typeof window.history.state?.citytreeIndex === "number"
          ? window.history.state.citytreeIndex
          : index.current + 1;
      if (
        active.current &&
        !window.confirm(
          "진행 중인 게임을 종료할까요? 완료하지 않은 게임의 경험치는 지급되지 않아요.",
        )
      ) {
        restoring.current = true;
        window.history.go(restoreHistoryDelta(index.current, destination));
        return;
      }
      index.current = destination;
      window.history.replaceState(
        { ...window.history.state, citytreeIndex: destination },
        "",
      );
      current.current = next;
      update(next);
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (active.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("popstate", change);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("popstate", change);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  const navigate = useCallback((next: string) => {
    const target = parseScreen(next);
    if (target === current.current || restoring.current) return;
    if (
      active.current &&
      !window.confirm(
        "진행 중인 게임을 종료할까요? 완료하지 않은 게임의 경험치는 지급되지 않아요.",
      )
    )
      return;
    index.current++;
    window.history.pushState(
      { citytreeIndex: index.current },
      "",
      `#${target}`,
    );
    current.current = target;
    update(target);
  }, []);
  return [screen, navigate] as const;
}
export function AppFrame({
  screen,
  onNavigate,
  children,
}: {
  screen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  children: ReactNode;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [screen]);
  return (
    <div className="app-frame">
      <header className="app-topbar">
        <button className="app-brand" onClick={() => onNavigate("discover")}>
          ♧ <span>시티트리클럽 주니어</span>
        </button>
        <h1 ref={title} tabIndex={-1}>
          {screenLabels[screen]}
        </h1>
        <button onClick={() => onNavigate("about")}>모임 소개</button>
      </header>
      <div className="app-screen" key={screen}>
        {children}
      </div>
      <nav className="app-nav" aria-label="주요 기능">
        {(
          ["discover", "garden", "games", "journal", "events"] as AppScreen[]
        ).map((id, i) => (
          <button
            key={id}
            aria-current={screen === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <span aria-hidden="true">{["⌖", "♧", "🎮", "▤", "♡"][i]}</span>
            {screenLabels[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}
