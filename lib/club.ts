export const HEALTH_INDICATORS = [
  "햇빛이 잘 들지 않음",
  "가지치기가 과도하게 되어 있음",
  "줄기에 큰 상처나 구멍, 썩은 부분이 있음",
  "줄기에 줄이나 끈이 감겨있음",
  "뿌리가 잘리거나 썩어있음",
  "뿌리에 철사·고무줄이 감겨있음",
  "보도블럭이 솟아있음",
  "흙에 손가락이 들어가지 않을 만큼 딱딱함",
  "쓰레기나 담배꽁초 등이 있음",
  "해당사항없음",
] as const;
export function clubText(
  value: unknown,
  min: number,
  max: number,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= min &&
    [...value.trim()].length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
  );
}
export function validProfile(body: Record<string, unknown>) {
  return (
    clubText(body.displayName, 1, 20) &&
    Array.isArray(body.areas) &&
    body.areas.length <= 3 &&
    body.areas.every((area) => clubText(area, 1, 40)) &&
    new Set(body.areas.map((area: string) => area.trim())).size ===
      body.areas.length
  );
}
export function validRecord(body: Record<string, unknown>) {
  return (
    clubText(body.text, 2, 1000) &&
    Array.isArray(body.health) &&
    body.health.length <= 10 &&
    new Set(body.health).size === body.health.length &&
    body.health.every((value) => HEALTH_INDICATORS.includes(value)) &&
    (!body.health.includes("해당사항없음") || body.health.length === 1) &&
    (body.girth == null ||
      (typeof body.girth === "number" &&
        Number.isFinite(body.girth) &&
        body.girth > 0 &&
        body.girth <= 3000)) &&
    ["small", "medium", "large"].includes(body.size as string) &&
    ["private", "public"].includes(body.visibility as string) &&
    (body.nickname === undefined || clubText(body.nickname, 1, 16)) &&
    (body.species === undefined || clubText(body.species, 1, 30))
  );
}
export function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
