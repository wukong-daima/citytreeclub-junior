export type Tree = {
  id: string;
  name: string;
  species: string;
  lat: number;
  lng: number;
  location: string;
  sample: boolean;
};
export type NearbyTree = Tree & { distance: number };
export const RADII = [300, 500, 1000, 2000] as const;
export function validLocation(
  lat: unknown,
  lng: unknown,
  radius: unknown,
): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof radius === "number" &&
    (RADII as readonly number[]).includes(radius)
  );
}
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function candidates(
  trees: Tree[],
  lat: number,
  lng: number,
  radius: number,
): NearbyTree[] {
  if (!validLocation(lat, lng, radius)) return [];
  return trees
    .map((tree) => ({
      ...tree,
      distance: distanceMeters(lat, lng, tree.lat, tree.lng),
    }))
    .filter((tree) => tree.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, 10);
}
export function growth(xp: number) {
  const thresholds = [0, 30, 80, 160, 300],
    names = ["씨앗", "새싹", "어린 나무", "푸른 나무", "울창한 나무"];
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let index = 0;
  while (index < thresholds.length - 1 && safeXp >= thresholds[index + 1])
    index++;
  return {
    level: index + 1,
    name: names[index],
    nextXp: thresholds[index + 1] ?? null,
    progress:
      index === 4
        ? 100
        : Math.round(
            ((safeXp - thresholds[index]) /
              (thresholds[index + 1] - thresholds[index])) *
              100,
          ),
  };
}
export function seoulDay(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
export const ACTION_XP = {
  water: 10,
  compost: 15,
  "demo-visit": 20,
  visit: 20,
  note: 5,
} as const;
export const GAMES = ["bugs", "prune", "soil"] as const;
export type Game = (typeof GAMES)[number];
export type GameTarget = { id: string; x: number; y: number };
export function validNickname(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 1 &&
    [...value.trim()].length <= 16 &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}
export function validGameFinish(
  expected: GameTarget[],
  submitted: unknown,
  startedAt: string,
  now = new Date(),
): boolean {
  const elapsed = now.getTime() - Date.parse(startedAt);
  return (
    Number.isFinite(elapsed) &&
    elapsed >= 3000 &&
    elapsed <= 600000 &&
    Array.isArray(submitted) &&
    submitted.length === expected.length &&
    new Set(submitted).size === expected.length &&
    expected.every((target) => submitted.includes(target.id))
  );
}
export function physicalApplication(
  input: Record<string, unknown>,
  xp: number,
  now = new Date(),
) {
  if (
    xp < 100 ||
    input.consent !== true ||
    typeof input.kind !== "string" ||
    !["nameplate", "message", "decoration", "confession"].includes(input.kind)
  )
    return null;
  if (
    typeof input.message !== "string" ||
    input.message.trim().length < 2 ||
    [...input.message.trim()].length > 100 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(input.message)
  )
    return null;
  if (
    typeof input.startDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
    ![1, 3, 7].includes(input.days as number)
  )
    return null;
  const start = Date.parse(`${input.startDate}T00:00:00Z`);
  if (
    !Number.isFinite(start) ||
    new Date(start).toISOString().slice(0, 10) !== input.startDate
  )
    return null;
  const ahead = (start - Date.parse(`${seoulDay(now)}T00:00:00Z`)) / 86400000;
  if (ahead < 1 || ahead > 90) return null;
  return {
    kind: input.kind,
    message: input.message.trim(),
    startDate: input.startDate,
    endDate: new Date(start + ((input.days as number) - 1) * 86400000)
      .toISOString()
      .slice(0, 10),
  };
}
