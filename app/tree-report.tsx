"use client";
import { useState } from "react";
import { TREES } from "../lib/trees";
import { HEALTH_INDICATORS, clubText } from "../lib/club";
import { uploadObservationPhoto } from "./photo-upload";
import { saveWithPhoto } from "./photo-save";
export function TreeReport({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (extra: Record<string, unknown>) => Promise<boolean>;
}) {
  const [kind, setKind] = useState("addition"),
    [treeId, setTreeId] = useState(TREES[0].id),
    [lat, setLat] = useState("37.5445"),
    [lng, setLng] = useState("127.0374"),
    [species, setSpecies] = useState(""),
    [text, setText] = useState(""),
    [girth, setGirth] = useState(""),
    [size, setSize] = useState("medium"),
    [health, setHealth] = useState<string[]>([]),
    [photo, setPhoto] = useState<File | null>(null),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [submitted, setSubmitted] = useState(false);
  async function save() {
    setError("");
    setSubmitted(false);
    if (!photo) {
      setError("현장 사진을 선택해 주세요.");
      return;
    }
    if (!clubText(text, 2, 1000)) {
      setError("설명은 공백을 제외하고 2~1000자로 적어 주세요.");
      return;
    }
    setUploading(true);
    try {
      const ok = await saveWithPhoto(
        () => uploadObservationPhoto(photo),
        (photoKey) =>
          onSubmit({
            kind,
            treeId: kind === "removal" ? treeId : undefined,
            lat:
              kind === "removal"
                ? TREES.find((t) => t.id === treeId)!.lat
                : Number(lat),
            lng:
              kind === "removal"
                ? TREES.find((t) => t.id === treeId)!.lng
                : Number(lng),
            species:
              kind === "removal"
                ? TREES.find((t) => t.id === treeId)!.species
                : species.trim() || "모름",
            health,
            girth: girth ? Number(girth) : null,
            size,
            text,
            photoKey,
          }),
      );
      if (ok) {
        setSubmitted(true);
        setText("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "제보를 저장하지 못했어요.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="tree-report">
      <div className="club-section-title">
        <h4>지도 밖의 나무도, 사라진 나무도</h4>
        <span>이 브라우저에만 저장하는 개인 나무 메모</span>
      </div>
      <div className="report-kind">
        <button
          className={kind === "addition" ? "selected" : ""}
          onClick={() => setKind("addition")}
        >
          🌱 지도에 없는 나무
        </button>
        <button
          className={kind === "removal" ? "selected" : ""}
          onClick={() => setKind("removal")}
        >
          🌳 없어진 나무
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {kind === "removal" ? (
          <label className="wizard-field">
            어떤 나무인가요?
            <select value={treeId} onChange={(e) => setTreeId(e.target.value)}>
              {TREES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.location}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <div className="physical-dates">
              <label>
                위도
                <input
                  aria-label="제보 위치 위도"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  required
                />
              </label>
              <label>
                경도
                <input
                  aria-label="제보 위치 경도"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="wizard-field">
              수종
              <input
                value={species}
                maxLength={30}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="모르면 비워두어도 괜찮아요"
              />
            </label>
            <div className="health-grid report-health">
              {HEALTH_INDICATORS.map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={health.includes(item)}
                    onChange={(e) =>
                      setHealth((old) =>
                        e.target.checked
                          ? item === "해당사항없음"
                            ? [item]
                            : [...old.filter((v) => v !== "해당사항없음"), item]
                          : old.filter((v) => v !== item),
                      )
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
            <div className="physical-dates">
              <label>
                둘레 (cm, 선택)
                <input
                  type="number"
                  min="1"
                  max="3000"
                  step=".1"
                  value={girth}
                  onChange={(e) => setGirth(e.target.value)}
                />
              </label>
              <label>
                덩치
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="small">앙상함</option>
                  <option value="medium">보통</option>
                  <option value="large">아름드리</option>
                </select>
              </label>
            </div>
          </>
        )}
        <label className="wizard-field">
          설명
          <textarea
            required
            minLength={2}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="발견한 위치와 상태를 구체적으로 알려주세요"
          />
        </label>
        <label className="wizard-field">
          현장 사진 (필수)
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <small>원본 15MB 이하 · 저장 시 크기 축소·위치 메타데이터 제거</small>
        </label>
        <p className="care-note">
          사진과 메모는 이 브라우저에만 저장됩니다. 운영기관에 전송되거나 지도에
          자동 반영되지 않습니다. 위험한 현장에는 접근하지 마세요.
        </p>
        {error && (
          <p className="club-error" role="alert">
            {error}
          </p>
        )}
        {submitted && (
          <p className="saved-note" role="status">
            사진과 메모를 이 브라우저에 저장했어요 ✓
          </p>
        )}
        <button className="primary" disabled={busy || uploading}>
          {uploading ? "사진을 저장하고 있어요…" : "개인 메모 남기기 ↗"}
        </button>
      </form>
    </section>
  );
}
