# App Frame and Care Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 기존 기록을 보존하면서 고정 앱 화면과 세 가지 조작 방식의 돌봄 게임을 제공한다.

**Architecture:** 해시 기반 화면 상태와 앱 프레임을 분리한다. 게임은 순수 판정 함수와 React 화면을 분리하고 기존 localFetch 보상 세션을 유지한다. 기존 Club 기능을 제거하지 않고 화면별로 접근시킨다.

**Tech Stack:** React 19, TypeScript, Vite, CSS, IndexedDB, node:test, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-30-app-frame-games-design.md`

## Global Constraints

- GitHub Pages 무료 배포, 로컬 서버 실행 금지, 기존 IndexedDB 기록·사진·경험치 보존을 유지한다.
- 일반 문서 전체를 스크롤하는 구조는 없애되 작은 화면, 확대, 가상 키보드 때문에 내용이나 제출 버튼이 잘리지 않도록 내부 스크롤을 안전장치로 둔다.
- 기존 하루 게임별 25XP, 중복 보상 방지와 세션 만료 검증을 유지한다.
- 실제 나무 인벤토리는 여전히 샘플이며 게임은 실제 생물 제거·가지치기 지침이 아니다.
- 외부 유료 서비스·새 호스팅·게임 라이브러리는 도입하지 않는다.

## Review Focus

1. 모바일 가상 키보드/200% 확대에서도 다음·저장 버튼에 접근 가능해야 한다(Task 1, 5).
2. 진행 중 게임에서 브라우저 뒤로가기를 누르면 무보상 종료 확인과 타이머 정리가 필요하다(Task 4, 5).
3. 탭 숨김·긴 대기 후 재개 시 물체가 순간이동하거나 만료된 보상을 받지 않아야 한다(Task 3, 4).
4. 블록이 벽/기존 블록에 닿은 상태에서 회전해도 겹치거나 보드 밖으로 나가지 않아야 한다(Task 3).
5. 완료 버튼 연타·저장 실패 재시도가 경험치를 중복 지급하지 않아야 한다(Task 4, 5).

## Task 1: 고정 앱 프레임과 화면 내비게이션

**Files:** Create `lib/app-navigation.ts`, `app/app-frame.tsx`, `app/app-frame.css`, `tests/app-navigation.test.ts`; modify `app/page.tsx`, `app/junior-garden.tsx`, `app/club.tsx`, `lib/tutorial-navigation.ts`, `tests/tutorial-navigation.test.ts`.

**Interfaces:** `AppScreen = "discover" | "garden" | "games" | "journal" | "events" | "club" | "about"`; `parseScreen(hash:string):AppScreen`; `AppFrame({screen,onNavigate,children})`; `onNavigate(screen:AppScreen):void`. `JuniorGarden` gains `onGames:()=>void`; remove embedded MiniGames and render it only in games screen. Tutorial controller gains `games:()=>void` and step 3 uses it instead of focusing an offscreen node.

- [ ] Write regression tests, then run `node --experimental-strip-types --test tests/app-navigation.test.ts tests/tutorial-navigation.test.ts`; missing navigation module/new games action must fail.

```ts
assert.equal(parseScreen('#games'), 'games');
assert.equal(parseScreen('#unknown'), 'discover');
assert.equal(parseScreen(''), 'discover');
// Existing tutorial test must expect ['games'] for step 3.
```

- [ ] Implement screen whitelist and hashchange subscription with cleanup. Use the following parsing contract:

```ts
const screens = ['discover','garden','games','journal','events','club','about'] as const;
export type AppScreen = typeof screens[number];
export function parseScreen(hash: string): AppScreen {
  const value = hash.replace(/^#/, '');
  return screens.includes(value as AppScreen) ? value as AppScreen : 'discover';
}
```

- [ ] Replace page-wide hero/events/footer stacking with conditional screen content. Keep team/attribution/privacy accessible on about. Keep header and primary navigation mounted; focus active screen heading after navigation. Frame layout:

```css
.app-frame { height: 100dvh; display: grid; grid-template-rows: auto minmax(0,1fr) auto; overflow: hidden; }
.app-screen { min-height: 0; overflow: auto; }
```

- [ ] Add mobile discovery steps using parent-owned location/radius state, preserving values between steps. Add page index state to record lists and slice records into pages of five; reset/clamp page when the list changes. Use nested Club sections for preserved mine/favorites/profile/report functions; break long forms into next/previous steps without unmounting their form state. Retain internal scrolling for accessibility fallback rather than hiding overflow content.

```ts
const pageCount = Math.max(1, Math.ceil(records.length / 5));
const safePage = Math.min(page, pageCount - 1);
const visibleRecords = records.slice(safePage * 5, safePage * 5 + 5);
```

- [ ] Run updated navigation tests, typecheck and lint. At online validation verify back/forward, invalid hash, fresh direct games link without a tree, tutorial games navigation, form input preservation, keyboard/zoom access. Commit only task files.

## Task 2: 작은 고정 보관 도구함

**Files:** Modify `app/backup-controls.tsx`, `app/backup-controls.css`.

**Interfaces:** Existing `<BackupControls />` unchanged; existing exportBackup/importBackup and overwrite confirmation unchanged.

- [ ] Record existing defect before editing: online current backup banner occupies top document flow, no expandable control. Define acceptance checks: closed compact control; opening exposes all three actions and browser-only warning; Escape closes and returns focus; completion/error status is visible while panel open.
- [ ] Add open state, control ref and `aria-expanded`/`aria-controls`; close button restores focus. Add keydown cleanup. Keep upload input and operation state mounted so closing cannot abort an in-progress operation.

```tsx
const [open, setOpen] = useState(false);
const toggle = useRef<HTMLButtonElement>(null);
function close() { setOpen(false); toggle.current?.focus(); }
// Toggle: aria-expanded={open} aria-controls="backup-panel"
// Panel: id="backup-panel" hidden={!open}; retain existing controls inside.
```

- [ ] Position right-edge tool above navigation safe area, constrain open panel width to viewport minus margins and height to available space; panel overflow auto. Preserve light/dark contrast and 44px touch target.
- [ ] Run typecheck/lint/build; verify open/close/Escape, download and existing import validation in isolated online test profile. Commit task files.

## Task 3: 게임 판정 엔진

**Files:** Create `lib/care-games.ts`, `tests/care-games.test.ts`.

**Interfaces:** `bugPosition(index:number,elapsedMs:number,easy:boolean):{x:number,y:number}` percentages; `timingPosition(elapsedMs:number,easy:boolean):number` range 0..1; `timingHit(position:number,easy:boolean):boolean`; `Board = number[][]`; `Cell = readonly [number,number]`; `Piece = {cells:Cell[],x:number,y:number}`; `canPlace(board:Board,piece:Piece):boolean`; `rotatePiece(piece:Piece):Piece`; `lockPiece(board:Board,piece:Piece):{board:Board,lines:number}`; `activeDelta(previous:number,now:number,paused:boolean):number`.

- [ ] Write tests and run them to establish missing-module failure:

```ts
assert.equal(timingHit(0.5, false), true);
assert.equal(timingHit(0.1, false), false);
assert.equal(activeDelta(10, 1000, true), 0);
const board = Array.from({length:12}, () => Array(8).fill(0));
const block = {cells:[[0,0],[1,0],[0,1],[1,1]] as Cell[],x:7,y:0};
assert.equal(canPlace(board, block), false);
board[11] = [1,1,1,1,1,1,0,0];
const result = lockPiece(board, {cells:[[0,0],[1,0]] as Cell[],x:6,y:11});
assert.equal(result.lines, 1);
assert.equal(result.board.length, 12);
assert.equal(board[11][6], 0); // no mutation
```

- [ ] Add tests for all four walls, occupied cells, four rotations restoring shape, simultaneous multiple row clears, top blocked spawn, bug bounds over sampled elapsed times, timing success interval inclusive boundaries, triangle-wave endpoint reversal, negative delta clamping. Rotation is accepted by UI only if `canPlace` returns true; no wall kick is required.
- [ ] Implement movement and timing formulas, collision and immutable locking/line removal:

```ts
// Triangle wave for gauge, shared by display and hit calculation.
const phase = (elapsedMs % periodMs) / periodMs;
const position = phase < .5 ? phase * 2 : 2 - phase * 2;
// Collision invariant for every absolute cell:
// 0 <= x < 8 && 0 <= y < 12 && board[y][x] === 0
// Filled rows removed; prepend empty rows until height is 12.
```

- [ ] Use slow sinusoidal crawl and faster elliptical flight paths bounded within x=12..88,y=18..78. Easy mode increases timing target interval and reduces speed. `activeDelta` is zero while paused and clamps stale frame delta to 100ms to avoid jumps.
- [ ] Run engine tests, typecheck and lint; commit engine and tests.

## Task 4: 세 게임 화면과 기존 보상 연결

**Files:** Modify `app/mini-games.tsx`, `app/mini-games.css`; create `app/games/bug-game.tsx`, `app/games/prune-game.tsx`, `app/games/soil-game.tsx`, `app/games/use-game-clock.ts`, `lib/game-progress.ts`, `tests/game-progress.test.ts`; modify `app/page.tsx` navigation guard.

**Interfaces:** Game children accept `{easy:boolean,onProgress:(completed:number)=>void,onFail:()=>void,paused:boolean}`; parent owns run, count, success and claim lock. `completionTargets(targets:{id:string}[],completed:number,won:boolean):string[]` only returns all IDs when won and completed>=5, otherwise empty. Parent game state notification `onPlayingChange(playing:boolean):void` lets AppFrame/page guard navigation.

- [ ] Add and run failing tests:

```ts
const targets = Array.from({length:5}, (_,i)=>({id:String(i)}));
assert.deepEqual(completionTargets(targets,5,false), []);
assert.deepEqual(completionTargets(targets,4,true), []);
assert.deepEqual(completionTargets(targets,5,true), ['0','1','2','3','4']);
```

- [ ] Implement result adapter using existing game-start/game-finish; never send finish on timeout/top-out/cancel. Retain requestLock, daily completed notice, 3-second minimum and 10-minute max. On reward failure keep result and allow retry; on success unmount run once and show XP effect.

```ts
export function completionTargets(targets:{id:string}[], completed:number, won:boolean) {
  return won && completed >= 5 ? targets.map(t=>t.id) : [];
}
```

- [ ] Implement hook with requestAnimationFrame and visibilitychange subscription; accumulate only active time with activeDelta, cancel on unmount, require explicit resume after tab returns. Track actual session age separately to enforce ten-minute expiry. Ignore `KeyboardEvent.repeat` for timing/hard-drop and ignore game shortcuts when target is a form field.
- [ ] Bugs: use bugPosition per target, captured Set, 30-second active countdown, minimum44px buttons, keyboard activation; five unique captures wins. Prune: use same timingPosition for gauge rendering and input-time hit, five successes, 45-second clock, one press/release per attempt; miss feedback without advancing. Soil:8×12 grid, seven four-cell shapes, next piece, 800ms gravity (1200ms easy), rotate/collision checks, left/right/down and Space hard drop plus labeled mobile controls; five cleared rows wins, blocked spawn loses.
- [ ] Provide easy/normal choice before start, default easy during first tutorial. Preserve real-tree protection messages. CSS reduced-motion disables only decoration, not gameplay state. On navigation during play prompt before abandoning; cancellation restores current hash without a second prompt. Reset engine and cancel timers on confirmed exit.
- [ ] Run game-progress/engine tests and entire existing local API suite including double-claim tests. Online acceptance: all three win paths, bug timeout, pruning miss, soil top-out, replay, pause/resume, exit/cancel/back, duplicate reward press, day-completed state. Commit task files.

## Task 5: 검토·배포·실제 검증

**Files:** Update `tasks/todo.md`, `docs/test-report-2026-09-30.md`; correct implementation files only for reproduced defects.

- [ ] Run `npm run typecheck && npm run lint && npm test && npm run build && git diff --check`. Check all exit codes, test counts, and diff for removal of existing functionality or inadvertent data migrations.
- [ ] Request one independent whole-change review. Reproduce findings with regression tests before fixing. No completion claim until tests pass after the last code edit.
- [ ] Commit reviewed code and push main using existing GitHub authentication. Watch Pages workflow with CLI; do not run dev servers. Confirm deployed asset version and HTTP success.
- [ ] In isolated Orca browser profile, test at desktop and mobile dimensions. Confirm fixed frame, reachable menu/toolbox, map resizing after screen transitions, browser back/forward, step inputs retained, visible keyboard focus and 200% zoom access. Use screenshots to inspect overlays/touch targets, and console for runtime errors.
- [ ] Exercise all game acceptance checks from Task4 and tutorial from assignment through event. Refresh after reward and confirm persistence. Export/import a test backup only in isolated profile; user records must not be replaced. Confirm water/nickname/photo behavior remains available.
- [ ] Record exact observed results and any limitations. Update checklist, commit test report, provide live URL and concise change summary. Do not claim real GPS/real tree operations unless actually verified.

## Self-review and execution handoff

Navigation, toolbox, games, storage compatibility, safety copy and deployment each have an owning task. Mobile/keyboard/back navigation, hidden tabs, collision boundaries and duplicate rewards have explicit checks. No new server or database migration is required. Native execution is selected from the user's earlier preference for option2; plan review is required before implementation.
