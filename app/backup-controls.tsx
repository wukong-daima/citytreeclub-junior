import { useRef, useState } from "react";
import { exportBackup, importBackup } from "../lib/local-api";
import "./backup-controls.css";

export function BackupControls() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  async function shareSite() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage(
        "사이트 주소를 복사했어요. 개인 기록과 사진은 공유되지 않아요.",
      );
    } catch {
      setMessage(
        `사이트 주소: ${url.toString()} · 개인 기록은 공유되지 않아요.`,
      );
    }
  }
  async function download() {
    setBusy(true);
    setMessage("");
    try {
      const text = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `citytreeclub-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage("사진을 포함한 백업 파일 다운로드를 시작했어요.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "백업을 만들지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    if (
      !window.confirm(
        "현재 브라우저의 모든 기록과 사진을 백업 파일로 교체할까요? 현재 기록이 필요하면 먼저 내보내기 해 주세요.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 100 * 1024 * 1024)
        throw Error("백업 파일은 100MB 이하로 선택해 주세요.");
      await importBackup(await file.text());
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "백업을 가져오지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      className="backup-dock"
      aria-label="개인 기록 보관과 백업"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <button
        ref={toggle}
        className="backup-toggle"
        aria-label="기록 보관함"
        aria-expanded={open}
        aria-controls="backup-panel"
        onClick={() => setOpen(!open)}
      >
        ▣ <span>기록 보관함</span>
      </button>
      <div id="backup-panel" className="local-storage-notice" hidden={!open}>
        <button
          className="backup-close"
          onClick={close}
          aria-label="기록 보관함 닫기"
        >
          ×
        </button>
        <p>
          <b>이 브라우저만의 나무 관찰장</b> · 기록과 사진은 이 브라우저에만
          저장돼요. 다른 기기와 동기화되지 않으며, 브라우저 데이터를 지우기 전에
          백업해 주세요.
        </p>
        <div>
          <button
            className="outline"
            disabled={busy}
            onClick={() => void download()}
          >
            백업 내보내기
          </button>{" "}
          <button
            className="outline"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            백업 가져오기
          </button>{" "}
          <button className="outline" onClick={() => void shareSite()}>
            사이트 주소 공유
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void restore(file);
            }}
          />
        </div>
        <small>
          백업에는 사진과 개인 기록이 포함되니 안전하게 보관해 주세요.
        </small>
        {message && <p role="status">{message}</p>}
      </div>
    </aside>
  );
}
