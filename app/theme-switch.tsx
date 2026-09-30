"use client";
import { useEffect, useSyncExternalStore } from "react";
function snapshot() {
  try {
    const saved = localStorage.getItem("junior-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function subscribe(update: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", update);
  window.addEventListener("storage", update);
  window.addEventListener("junior-theme", update);
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("storage", update);
    window.removeEventListener("junior-theme", update);
  };
}
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <button
      className="theme-switch"
      aria-label={
        theme === "dark" ? "낮 정원으로 바꾸기" : "밤 정원으로 바꾸기"
      }
      onClick={() => {
        try {
          localStorage.setItem(
            "junior-theme",
            theme === "dark" ? "light" : "dark",
          );
          window.dispatchEvent(new Event("junior-theme"));
        } catch {
          document.documentElement.dataset.theme =
            theme === "dark" ? "light" : "dark";
        }
      }}
    >
      {theme === "dark" ? "☀ 낮 정원" : "☾ 밤 정원"}
    </button>
  );
}
