export type Cell = readonly [number, number];
export type Piece = { cells: Cell[]; x: number; y: number };
export type Board = number[][];
export function gameKeyAction(
  code: string,
  tag: string,
  repeat: boolean,
): "left" | "right" | "down" | "rotate" | "drop" | null {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return null;
  const actions: Record<string, "left" | "right" | "down" | "rotate" | "drop"> =
    {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowUp: "rotate",
      Space: "drop",
    };
  const action = actions[code];
  if (!action || (repeat && (action === "rotate" || action === "drop")))
    return null;
  return action;
}
export const shapes: Cell[][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
];
export function emptyBoard(): Board {
  return Array.from({ length: 12 }, () => Array(8).fill(0));
}
export function bugPosition(index: number, elapsedMs: number, easy: boolean) {
  const t = elapsedMs / (easy ? 1700 : 1000),
    phase = index * 1.8;
  return {
    x: 50 + 36 * Math.sin(t * (index % 2 ? 1.4 : 0.45) + phase),
    y: 48 + 28 * Math.sin(t * (index % 2 ? 1.9 : 0.3) + phase),
  };
}
export function timingPosition(elapsedMs: number, easy: boolean) {
  const phase = (elapsedMs % (easy ? 3200 : 2000)) / (easy ? 3200 : 2000);
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
export function timingHit(position: number, easy: boolean) {
  return position >= (easy ? 0.3 : 0.4) && position <= (easy ? 0.7 : 0.6);
}
export function activeDelta(previous: number, now: number, paused: boolean) {
  return paused ? 0 : Math.min(100, Math.max(0, now - previous));
}
export function canPlace(board: Board, piece: Piece) {
  return piece.cells.every(([dx, dy]) => {
    const x = piece.x + dx,
      y = piece.y + dy;
    return x >= 0 && x < 8 && y >= 0 && y < 12 && board[y][x] === 0;
  });
}
export function rotatePiece(piece: Piece): Piece {
  const height = Math.max(...piece.cells.map(([, y]) => y));
  return {
    ...piece,
    cells: piece.cells.map(([x, y]) => [height - y, x] as Cell),
  };
}
export function lockPiece(board: Board, piece: Piece) {
  if (!canPlace(board, piece)) throw Error("블록을 놓을 수 없는 위치입니다.");
  const next = board.map((row) => [...row]);
  piece.cells.forEach(([dx, dy]) => {
    next[piece.y + dy][piece.x + dx] = 1;
  });
  const remaining = next.filter((row) => row.some((c) => c === 0)),
    lines = 12 - remaining.length;
  return {
    board: [
      ...Array.from({ length: lines }, () => Array(8).fill(0)),
      ...remaining,
    ],
    lines,
  };
}
export function completionTargets(
  targets: { id: string }[],
  completed: number,
  won: boolean,
) {
  return won && completed >= 5 ? targets.map((t) => t.id) : [];
}
