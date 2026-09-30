const screens = [
  "discover",
  "garden",
  "games",
  "journal",
  "events",
  "club",
  "about",
] as const;
export type AppScreen = (typeof screens)[number];
export function parseScreen(hash: string): AppScreen {
  if (hash.startsWith("#record=")) return "club";
  const value = hash.replace(/^#/, "");
  return screens.includes(value as AppScreen)
    ? (value as AppScreen)
    : "discover";
}
export function restoreHistoryDelta(
  currentIndex: number,
  destinationIndex: number,
) {
  return currentIndex - destinationIndex;
}
export function pageItems<T>(items: T[], page: number, size = 5) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.max(0, Math.min(page, pages - 1));
  return {
    items: items.slice(safe * size, (safe + 1) * size),
    page: safe,
    pages,
  };
}
