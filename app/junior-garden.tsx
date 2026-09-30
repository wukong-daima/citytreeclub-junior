"use client";
import { useState } from "react";
import { growth } from "../lib/domain";
import { TreeArt } from "./tree-art";
import { MiniGames } from "./mini-games";
import type { Garden, Act, Celebration } from "./garden-types";

export function CareEffect({ effect }: { effect: Celebration | null }) {
  if (!effect) return null;
  return (
    <div
      key={effect.id}
      className={`care-effect effect-${effect.action}`}
      aria-hidden="true"
    >
      {effect.action === "water" ? (
        <>
          <svg className="watering-can" viewBox="0 0 150 110">
            <path
              d="M55 40C15 8 12 84 55 74"
              stroke="#799ea3"
              strokeWidth="12"
              fill="none"
            />
            <path d="M45 29H106V89Q75 104 45 89Z" fill="#91b6b6" />
            <path d="M99 57L129 26L140 36L106 83" fill="#91b6b6" />
            <path
              d="M129 25L147 38"
              stroke="#517c85"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M53 40H96"
              stroke="#c9e3d7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="75" cy="67" r="10" fill="#e3f0d6" />
          </svg>
          <div className="water-stream">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 17) % 90}%`,
                  animationDelay: `${i * 0.09}s`,
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="care-sparkles">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${12 + ((i * 23) % 76)}%`,
                top: `${18 + ((i * 17) % 60)}%`,
                animationDelay: `${i * 0.07}s`,
              }}
            >
              {effect.action === "compost"
                ? "✦"
                : effect.action === "rename"
                  ? "♥"
                  : "✧"}
            </span>
          ))}
        </div>
      )}
      <span className="care-bubble">
        {effect.action === "water"
          ? "시원해! 고마워 💧"
          : effect.action === "compost"
            ? "영양 듬뿍, 쑥쑥! 🌱"
            : effect.action === "rename"
              ? "내 이름을 불러줘! 💚"
              : effect.action === "game-finish"
                ? "덕분에 기분이 좋아! ✨"
                : "우리의 추억이 하나 더! 🌿"}
      </span>
    </div>
  );
}

export function CelebrationToast({ effect }: { effect: Celebration | null }) {
  if (!effect) return null;
  return (
    <div key={effect.id} className="celebration" role="status">
      <span className="celebration-mascot">
        {effect.levelUp
          ? "🌳"
          : effect.action === "physical-apply"
            ? "💌"
            : effect.action === "rename"
              ? "🥳"
              : "🌱"}
      </span>
      <div>
        <small>
          {effect.levelUp
            ? "LEVEL UP! 함께 자랐어요"
            : "A LITTLE MOMENT OF JOY"}
        </small>
        <strong>{effect.title}</strong>
        {effect.xp > 0 && (
          <span>
            +{effect.xp} XP · +{effect.xp} 돌봄 포인트
          </span>
        )}
      </div>
      <span className="celebration-star">✦</span>
    </div>
  );
}

export function JuniorGarden({
  garden,
  busy,
  act,
  effect,
  onDiscover,
  onPhysical,
  onDecorate,
}: {
  garden: Garden;
  busy: boolean;
  act: Act;
  effect: Celebration | null;
  onDiscover: () => void;
  onPhysical: () => void;
  onDecorate: () => void;
}) {
  const [name, setName] = useState("");
  const stage = growth(garden.xp),
    today = garden.todayActions ?? [];
  return (
    <div className="junior-garden">
      <div className="garden-view">
        <div className="garden-scene">
          <span className="scene-label">MY LITTLE TREE FRIEND</span>
          <div className={`living-tree ${effect ? "tree-happy" : ""}`}>
            <TreeArt
              stage={garden.tree ? stage.level : 1}
              decoration={garden.decoration}
              name={garden.nickname}
            />
            <CareEffect effect={effect} />
          </div>
          <p>
            {garden.tree
              ? garden.nickname || garden.tree.name
              : "아직 만나지 않은, 당신의 나무"}
          </p>
          <small>
            {garden.tree
              ? `${garden.tree.species} · ${garden.tree.location}`
              : "가까운 나무와 첫 인연을 맺어보세요."}
          </small>
          {garden.tree && (
            <form
              className="name-form"
              onSubmit={(e) => {
                e.preventDefault();
                void act("rename", { name });
              }}
            >
              <label className="sr-only" htmlFor="tree-name">
                나무 애칭
              </label>
              <input
                id="tree-name"
                maxLength={16}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  garden.nickname
                    ? "새 애칭으로 바꾸기"
                    : "친구의 이름을 지어주세요"
                }
                required
              />
              <button disabled={busy || !name.trim()}>
                {garden.nickname ? "변경" : "이름 선물 +10 XP"}
              </button>
            </form>
          )}
        </div>
        <div className="garden-controls">
          <span className="step-label">관심을 먹고 자라는 나무</span>
          <h3>
            {garden.nickname
              ? `${garden.nickname}, 오늘도 반가워!`
              : "우리, 조금 더 가까워질까요?"}
          </h3>
          <p>
            작은 손길 하나하나를 기억하고 있어요.
            <br />
            함께 보낸 시간이 나무의 성장이 됩니다.
          </p>
          {garden.tree ? (
            <>
              <div className="growth-title">
                <b>
                  Lv. {stage.level} · {stage.name}
                </b>
                <span>누적 {garden.xp} XP</span>
              </div>
              <progress
                max={100}
                value={stage.progress}
                aria-label={`다음 성장 단계 ${stage.progress}%`}
              />
              <div className="next-goal">
                {stage.nextXp ? (
                  <>
                    <strong>다음 성장까지 {stage.nextXp - garden.xp} XP</strong>
                    <span>{stage.progress}% 자랐어요</span>
                  </>
                ) : (
                  <>
                    <strong>울창한 나무로 성장했어요! 🌳</strong>
                    <span>돌봄 포인트는 계속 쌓여요</span>
                  </>
                )}
              </div>
              <div className="care-actions">
                <button
                  disabled={busy || today.includes("water")}
                  onClick={() => void act("water")}
                >
                  <span>💧</span>물 주기
                  <small>
                    {today.includes("water") ? "오늘 완료 ✓" : "+10 XP"}
                  </small>
                </button>
                <button
                  disabled={busy || today.includes("compost")}
                  onClick={() => void act("compost")}
                >
                  <span>🌱</span>거름 주기
                  <small>
                    {today.includes("compost") ? "오늘 완료 ✓" : "+15 XP"}
                  </small>
                </button>
                <button
                  disabled={busy || today.includes("demo-visit")}
                  onClick={() => void act("demo-visit")}
                >
                  <span>👣</span>방문 체험
                  <small>
                    {today.includes("demo-visit") ? "오늘 완료 ✓" : "+20 XP"}
                  </small>
                </button>
              </div>
              <p className="care-note">
                게임 속 물·거름은 하루 한 번. 실제 나무 돌봄은 전문가의 안내를
                따라요. 샘플 방문은 실제 인증과 구분돼요.
              </p>
              <button className="outline wide" onClick={onDecorate}>
                ✧ 내 정원 꾸미기{" "}
                <span>{garden.xp < 30 ? "30 XP부터" : "장식 고르기 ↗"}</span>
              </button>
              <button className="physical-shortcut" onClick={onPhysical}>
                <span>💌</span>
                <span>
                  <b>현실의 나무에도 마음을 전해요</b>
                  <small>
                    {garden.points >= 100
                      ? "100 P 달성! 이벤트 신청을 체험해 보세요"
                      : `이벤트 신청 체험까지 ${Math.max(0, 100 - garden.points)} P`}
                  </small>
                </span>
                <span>↗</span>
              </button>
            </>
          ) : (
            <button className="primary" onClick={onDiscover}>
              내 나무 만나기 ↗
            </button>
          )}
        </div>
      </div>
      {garden.tree && (
        <>
          <div className="effort-dashboard">
            <div className="effort-heading">
              <small>EVERY LITTLE CARE COUNTS</small>
              <h3>내가 쌓아온 마음</h3>
            </div>
            {[
              ["🌿", garden.careDays, "함께 돌본 날"],
              ["💧", garden.water, "물 준 횟수"],
              ["🌱", garden.compost, "거름 준 횟수"],
              ["🎮", garden.gameWins, "미니게임 완료"],
              ["🍃", garden.points, "누적 돌봄 포인트"],
            ].map(([icon, n, label]) => (
              <div className="effort-item" key={label}>
                <span>{icon}</span>
                <b>{n || 0}</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <MiniGames onAction={act} busy={busy} todayActions={today} />
        </>
      )}
    </div>
  );
}

export function Tutorial({
  garden,
  busy,
  act,
  onStep,
}: {
  garden: Garden;
  busy: boolean;
  act: Act;
  onStep: (step: number) => void;
}) {
  const [replay, setReplay] = useState(false),
    [rewardSeen, setRewardSeen] = useState(false);
  if (garden.tutorialCompleted && !replay)
    return (
      <button className="tutorial-replay" onClick={() => setReplay(true)}>
        🦥 처음 돌봄 가이드 다시 보기
      </button>
    );
  const step = !garden.tree
    ? 0
    : !garden.nickname
      ? 1
      : !garden.water
        ? 2
        : !garden.gameWins
          ? 3
          : 4;
  const titles = [
    "가까운 나무 한 그루 만나기",
    "친구에게 이름 선물하기",
    "물 한 모금으로 첫 돌봄",
    "간단한 미니게임 도전하기",
    "우리의 다음 목표 만나기",
  ];
  const desc = [
    "서울숲 위치는 준비되어 있어요. ‘내 나무 만나기’를 눌러 인연을 맺어요.",
    "내 나무 아래에 애칭을 적어주세요. 첫 이름을 선물하면 10 XP를 받아요.",
    "‘물 주기’를 눌러보세요. 물뿌리개가 움직이고 경험치도 쌓여요.",
    "내 나무 아래 미니게임에서 표시된 곳 5개를 돌봐주세요. 종류별 하루 25 XP!",
    "100 돌봄 포인트가 모이면 이름표·메시지 이벤트 신청을 체험해요. 이 기기에만 저장되고 실제 접수되지는 않아요.",
  ];
  return (
    <aside className="tutorial-panel">
      <span className="tutorial-sloth">🦥</span>
      <div>
        <small>나무늘보와 함께 · {step + 1}/5</small>
        <h3>{titles[step]}</h3>
        <p>{desc[step]}</p>
        <div className="tutorial-dots">
          {titles.map((title, i) => (
            <span key={title} className={i <= step ? "done" : ""} />
          ))}
        </div>
      </div>
      <button
        className="outline"
        disabled={busy}
        onClick={() => {
          if (step === 4 && rewardSeen) {
            void act("tutorial-complete").then((r) => {
              if (r) setReplay(false);
            });
          } else {
            onStep(step);
            if (step === 4) setRewardSeen(true);
          }
        }}
      >
        {step === 4
          ? rewardSeen
            ? "첫 돌봄 가이드 완료 ✓"
            : "이벤트 목표 보기 ↗"
          : "함께 해보기 ↗"}
      </button>
    </aside>
  );
}
