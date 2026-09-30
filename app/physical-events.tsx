"use client";
import { useState } from "react";
import { seoulDay } from "../lib/domain";
import { TREES } from "../lib/trees";
import type { Garden, Act } from "./garden-types";
const kinds = [
  {
    id: "nameplate",
    icon: "🏷️",
    name: "나무 이름표",
    desc: "우리가 지은 이름을 소개해요",
  },
  {
    id: "message",
    icon: "💌",
    name: "하고 싶은 말",
    desc: "응원과 감사의 마음을 전해요",
  },
  {
    id: "confession",
    icon: "💗",
    name: "나무 아래 고백",
    desc: "서로 동의한 특별한 추억",
  },
  {
    id: "decoration",
    icon: "🎀",
    name: "작은 나무 축제",
    desc: "기간 한정 장식으로 축하해요",
  },
];
export function PhysicalEvents({
  garden,
  act,
  busy,
}: {
  garden: Garden;
  act: Act;
  busy: boolean;
}) {
  const [kind, setKind] = useState("nameplate"),
    [message, setMessage] = useState(""),
    [days, setDays] = useState(3),
    [date, setDate] = useState(""),
    [consent, setConsent] = useState(false);
  const [{ min, max }] = useState(() => ({
    min: seoulDay(new Date(Date.now() + 86400000)),
    max: seoulDay(new Date(Date.now() + 90 * 86400000)),
  }));
  const existing = garden.applications?.find((a) => a.kind === kind);
  const end = date
    ? seoulDay(
        new Date(
          new Date(`${date}T00:00:00+09:00`).getTime() + (days - 1) * 86400000,
        ),
      )
    : "";
  return (
    <>
      <p className="eyebrow">FROM OUR GARDEN TO THE REAL WORLD</p>
      <h2 id="modal-title">나무에 마음을 걸어두는 시간</h2>
      <p>
        이름표·메시지·고백·장식을 <b>1·3·7일 동안</b> 전시하는 계획을 세워요. 이
        기기에만 저장되는 체험 신청이며 운영자에게 접수되지 않아요.
      </p>
      <div className="physical-points">
        <span>🍃 누적 돌봄 포인트</span>
        <b>{garden.points ?? 0} / 100 P</b>
        <progress value={Math.min(garden.points ?? 0, 100)} max={100} />
        <small>100 P부터 체험 신청 · 포인트 차감 없음 · 종류별 1회</small>
      </div>
      <div className="physical-kinds">
        {kinds.map((k) => (
          <button
            type="button"
            aria-pressed={kind === k.id}
            className={kind === k.id ? "selected" : ""}
            key={k.id}
            onClick={() => setKind(k.id)}
          >
            <span>{k.icon}</span>
            <b>{k.name}</b>
            <small>{k.desc}</small>
          </button>
        ))}
      </div>
      <form
        className="physical-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act("physical-apply", {
            kind,
            message,
            startDate: date,
            days,
            consent,
          });
        }}
      >
        <label htmlFor="physical-message">이름표 또는 전하고 싶은 말</label>
        <textarea
          id="physical-message"
          minLength={2}
          maxLength={100}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            kind === "confession"
              ? "우리의 추억이 이 나무처럼 오래 자라기를. (실명·연락처 제외)"
              : "우리 동네의 오랜 친구, 초록이에게"
          }
        />
        <div className="physical-dates">
          <label>
            희망 시작일
            <input
              aria-label="희망 시작일"
              type="date"
              value={date}
              min={min}
              max={max}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            전시 기간
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={1}>1일</option>
              <option value={3}>3일</option>
              <option value={7}>7일</option>
            </select>
          </label>
        </div>
        {end && (
          <p className="retrieval-date">
            📅 {date} ~ {end} 전시 · {end} 종료 후 당일 회수 요청
          </p>
        )}
        <div className="physical-rules">
          <b>나무를 아끼는 약속</b>
          <p>
            실제 전시는 별도로 관리 주체의 허가를 받고 기한 내 회수해야 해요. 이
            앱에서 심사·선정은 진행하지 않아요. 나무에 못·철사·접착제를 사용하지
            않아요. 전문가가 수피·생육에 지장이 없다고 승인한 경우에만 임시
            설치하고, 부착이 적합하지 않으면 나무 곁 독립 안내대를 이용해요.
          </p>
        </div>
        <label className="consent">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            이 기기에만 저장되는 체험임을 이해했으며, 제3자의 실명·연락처는 적지
            않았어요. 고백 이벤트는 상대방의 사전 동의 후 진행하고, 승인된
            기간·방식·회수 약속을 지킬게요.
          </span>
        </label>
        <button
          className="primary wide"
          disabled={
            busy || !garden.tree || (garden.points ?? 0) < 100 || !!existing
          }
        >
          {existing
            ? "이 기기에 체험 신청을 저장했어요"
            : (garden.points ?? 0) < 100
              ? `${100 - (garden.points ?? 0)} P를 더 모으면 체험할 수 있어요`
              : "이 기기에 체험 신청 저장 💌"}
        </button>
        {garden.tree?.sample && (
          <p className="care-note">
            현재 나무는 샘플입니다. 신청은 이 기기에만 저장되며 운영자에게
            전달되지 않습니다. 실제 설치·추첨·승인은 진행되지 않습니다.
          </p>
        )}
      </form>
      {!!garden.applications?.length && (
        <section className="application-history">
          <h3>내가 보낸 마음</h3>
          {garden.applications.map((a) => (
            <article key={a.id}>
              <b>{kinds.find((k) => k.id === a.kind)?.name}</b>
              <span>이 기기에 체험 저장 · 운영자 미전송</span>
              <p>{a.message}</p>
              <small>
                {TREES.find((tree) => tree.id === a.treeId)?.name ||
                  "대상 나무"}{" "}
                · {a.startDate} ~ {a.endDate} · 기간 종료 후 회수
              </small>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
