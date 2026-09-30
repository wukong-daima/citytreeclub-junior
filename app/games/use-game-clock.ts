import { useEffect, useRef, useState } from "react";
import { activeDelta } from "../../lib/care-games";
export function useGameClock(paused: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (paused) return;
    let previous = performance.now(),
      frame = 0;
    const tick = (now: number) => {
      elapsedRef.current += activeDelta(previous, now, document.hidden);
      previous = now;
      setElapsed(elapsedRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);
  return elapsed;
}
export type GameProps = {
  easy: boolean;
  paused: boolean;
  onProgress: (count: number) => void;
  onFail: () => void;
};
