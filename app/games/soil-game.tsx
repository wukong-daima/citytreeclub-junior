import { useCallback, useEffect, useRef, useState } from "react";
import {
  canPlace,
  emptyBoard,
  lockPiece,
  rotatePiece,
  shapes,
  gameKeyAction,
  type Piece,
} from "../../lib/care-games";
import { useGameClock, type GameProps } from "./use-game-clock";
function randomPiece(): Piece {
  return {
    cells: shapes[Math.floor(Math.random() * shapes.length)],
    x: 2,
    y: 0,
  };
}
export function SoilGame({ easy, paused, onProgress, onFail }: GameProps) {
  const [state, setState] = useState(() => ({
    board: emptyBoard(),
    piece: randomPiece(),
    next: randomPiece(),
    lines: 0,
  }));
  const stateRef = useRef(state),
    ended = useRef(false),
    lastDrop = useRef(0),
    elapsed = useGameClock(paused);
  const move = useCallback(
    (kind: "left" | "right" | "down" | "rotate" | "drop") => {
      if (paused || ended.current) return;
      const s = stateRef.current;
      let p = { ...s.piece };
      if (kind === "rotate") p = rotatePiece(p);
      else if (kind === "left") p.x--;
      else if (kind === "right") p.x++;
      else if (kind === "down") p.y++;
      else while (canPlace(s.board, { ...p, y: p.y + 1 })) p.y++;
      if (kind !== "drop" && canPlace(s.board, p)) {
        const next = { ...s, piece: p };
        stateRef.current = next;
        setState(next);
        return;
      }
      if (kind !== "down" && kind !== "drop") return;
      const locked = lockPiece(s.board, kind === "drop" ? p : s.piece),
        lines = s.lines + locked.lines;
      const next = {
        board: locked.board,
        piece: s.next,
        next: randomPiece(),
        lines,
      };
      stateRef.current = next;
      setState(next);
      if (lines >= 5) {
        ended.current = true;
        onProgress(lines);
      } else if (!canPlace(next.board, next.piece)) {
        ended.current = true;
        onFail();
      } else onProgress(lines);
    },
    [paused, onProgress, onFail],
  );
  useEffect(() => {
    if (elapsed - lastDrop.current >= (easy ? 1200 : 800)) {
      lastDrop.current = elapsed;
      move("down");
    }
  }, [elapsed, easy, move]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.isContentEditable || target?.closest("input,textarea,select"))
        return;
      const action = gameKeyAction(e.code, target?.tagName ?? "", e.repeat);
      if (
        ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
        if (action) move(action);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [move]);
  const active = new Set(
    state.piece.cells.map(
      ([x, y]) => `${x + state.piece.x},${y + state.piece.y}`,
    ),
  );
  return (
    <>
      <div className="game-readout">
        <b>채운 흙 줄 {state.lines} / 5</b>
        <span>빈틈없이 가로줄을 채워요</span>
      </div>
      <div className="soil-layout">
        <div
          className="soil-board"
          role="img"
          aria-label={`흙 블록 정원, 완성한 줄 ${state.lines}개`}
        >
          {state.board.flatMap((row, y) =>
            row.map((cell, x) => (
              <span
                key={`${x},${y}`}
                className={`soil-cell ${cell ? "filled" : ""} ${active.has(`${x},${y}`) ? "falling" : ""}`}
              />
            )),
          )}
        </div>
        <aside>
          <b>다음 흙</b>
          <div className="next-piece" aria-label="다음 블록">
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                className={
                  state.next.cells.some(
                    ([x, y]) => x === i % 4 && y === Math.floor(i / 4),
                  )
                    ? "filled"
                    : ""
                }
              />
            ))}
          </div>
          <p>
            ← → 이동
            <br />↑ 회전
            <br />↓ 내리기
            <br />
            Space 놓기
          </p>
        </aside>
      </div>
      <div className="soil-controls">
        {(["left", "rotate", "right", "down", "drop"] as const).map(
          (kind, i) => (
            <button
              key={kind}
              disabled={paused}
              onClick={() => move(kind)}
              onKeyDown={(e) => {
                if (e.repeat && (e.code === "Enter" || e.code === "Space"))
                  e.preventDefault();
              }}
              aria-label={
                [
                  "흙 왼쪽 이동",
                  "흙 회전",
                  "흙 오른쪽 이동",
                  "흙 한 칸 내리기",
                  "흙 바로 놓기",
                ][i]
              }
            >
              {["←", "↻", "→", "↓", "놓기"][i]}
            </button>
          ),
        )}
      </div>
    </>
  );
}
