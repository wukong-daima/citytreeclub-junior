import { useEffect, useRef, useState, useCallback } from "react";
import { timingHit, timingPosition } from "../../lib/care-games";
import { useGameClock, type GameProps } from "./use-game-clock";
export function PruneGame({ easy, paused, onProgress, onFail }: GameProps) {
  const elapsed = useGameClock(paused),
    latest = useRef(elapsed),
    countRef = useRef(0),
    last = useRef(-1000);
  const [count, setCount] = useState(0),
    [feedback, setFeedback] = useState("초록 구간에서 눌러주세요!");
  useEffect(() => {
    latest.current = elapsed;
    if (elapsed >= 45000) onFail();
  }, [elapsed, onFail]);
  const prune = useCallback(() => {
    if (
      paused ||
      latest.current >= 45000 ||
      latest.current - last.current < 450
    )
      return;
    last.current = latest.current;
    if (timingHit(timingPosition(latest.current, easy), easy)) {
      countRef.current++;
      setCount(countRef.current);
      setFeedback("✂ 정확해요! 가지가 한결 가벼워졌어요.");
      onProgress(countRef.current);
    } else setFeedback("조금 빗나갔어요. 초록 구간에서 다시 도전!");
  }, [easy, paused, onProgress]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(
          e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,button")
        )
      ) {
        e.preventDefault();
        prune();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [prune]);
  return (
    <>
      <div className="game-readout">
        <b>돌본 가지 {count} / 5</b>
        <span>{Math.max(0, Math.ceil((45000 - elapsed) / 1000))}초</span>
      </div>
      <div className="prune-scene" aria-hidden="true">
        🌳 <span>✂</span>
      </div>
      <div className="timing-track" aria-label="초록 구간에서 가지 돌보기">
        <span
          className="timing-zone"
          style={{ left: easy ? "30%" : "40%", width: easy ? "40%" : "20%" }}
        />
        <span
          className="timing-cursor"
          style={{ left: `${timingPosition(elapsed, easy) * 100}%` }}
        />
      </div>
      <button
        className="primary timing-button"
        disabled={paused}
        onClick={prune}
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
      >
        ✂ 가지 돌보기 · Space
      </button>
      <p role="status" className="game-help">
        {feedback}
      </p>
    </>
  );
}
