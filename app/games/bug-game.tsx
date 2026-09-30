import { useEffect, useRef, useState } from "react";
import { bugPosition } from "../../lib/care-games";
import { useGameClock, type GameProps } from "./use-game-clock";
export function BugGame({ easy, paused, onProgress, onFail }: GameProps) {
  const elapsed = useGameClock(paused),
    caught = useRef(new Set<number>());
  const [captured, setCaptured] = useState<number[]>([]);
  useEffect(() => {
    if (elapsed >= 30000) onFail();
  }, [elapsed, onFail]);
  function catchBug(index: number) {
    if (paused || elapsed >= 30000 || caught.current.has(index)) return;
    caught.current.add(index);
    setCaptured([...caught.current]);
    onProgress(caught.current.size);
  }
  return (
    <>
      <div className="game-readout">
        <b>잡은 친구 {captured.length} / 5</b>
        <span>
          남은 시간 {Math.max(0, Math.ceil((30000 - elapsed) / 1000))}초
        </span>
      </div>
      <div className="bug-field" aria-label="움직이는 잎 먹보 잡기">
        <div className="game-tree" aria-hidden="true">
          🌳
        </div>
        {Array.from({ length: 5 }, (_, i) => {
          const p = bugPosition(i, elapsed, easy);
          return (
            !captured.includes(i) && (
              <button
                key={i}
                className={`moving-bug ${i % 2 ? "flying" : "crawling"}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => catchBug(i)}
                disabled={paused}
                aria-label={`${i + 1}번째 ${i % 2 ? "날아다니는" : "기어가는"} 잎 먹보 잡기`}
              >
                {i % 2 ? "🪰" : "🐛"}
              </button>
            )
          );
        })}
      </div>
      <p className="game-help">
        움직이는 친구를 클릭하거나 터치하세요. 키보드는 Tab으로 선택하고 Enter로
        잡아요.
      </p>
    </>
  );
}
