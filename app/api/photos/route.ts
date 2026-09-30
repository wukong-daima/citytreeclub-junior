import { env } from "cloudflare:workers";
import { database } from "@/lib/storage";
import { imageMime } from "@/lib/club";
import { clubSession, clubReply, sameOrigin } from "@/lib/club-session";
const MAX = 3 * 1024 * 1024;
export async function POST(request: Request) {
  const { id, cookie } = clubSession(request);
  const fail = (error: string, status = 400) =>
    clubReply({ error }, cookie, status);
  if (!sameOrigin(request))
    return fail("같은 사이트에서 업로드해 주세요.", 403);
  if (!env.BUCKET) return fail("사진 저장소를 사용할 수 없어요.", 503);
  if (!request.headers.get("content-type")?.includes("multipart/form-data"))
    return fail("사진 파일을 선택해 주세요.", 415);
  if (Number(request.headers.get("content-length")) > MAX + 65536)
    return fail("사진은 3MB 이하여야 해요.", 413);
  try {
    // Bound the stream before parsing multipart, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return fail("사진이 없어요.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX + 65536) {
        await reader.cancel();
        return fail("사진은 3MB 이하여야 해요.", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
    const file = data.get("photo");
    if (!(file instanceof File) || !file.size || file.size > MAX)
      return fail("3MB 이하 사진을 선택해 주세요.");
    const buffer = await file.arrayBuffer(),
      mime = imageMime(new Uint8Array(buffer));
    if (!mime || mime !== file.type)
      return fail("JPEG·PNG·WebP 사진만 업로드할 수 있어요.", 415);
    const db = database();
    const total = await db
      .prepare("SELECT COUNT(*) AS count FROM club_photos WHERE owner = ?")
      .bind(id)
      .first<{ count: number }>();
    if ((total?.count ?? 0) >= 50)
      return fail("체험 사진은 최대 50장까지 저장할 수 있어요.", 409);
    const key = `observations/${crypto.randomUUID()}`;
    await env.BUCKET.put(key, buffer, { httpMetadata: { contentType: mime } });
    try {
      await db
        .prepare(
          "INSERT INTO club_photos (key, owner, mime, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(key, id, mime, new Date().toISOString())
        .run();
    } catch (error) {
      await env.BUCKET.delete(key);
      throw error;
    }
    return clubReply({ photoKey: key }, cookie);
  } catch {
    return fail("사진을 저장하지 못했어요.", 503);
  }
}
export async function GET(request: Request) {
  const { id, cookie } = clubSession(request),
    key = new URL(request.url).searchParams.get("key");
  if (!key || !/^observations\/[0-9a-f-]{36}$/.test(key))
    return clubReply({ error: "사진이 없어요." }, cookie, 404);
  try {
    const db = database(),
      photo = await db
        .prepare("SELECT owner, mime FROM club_photos WHERE key = ?")
        .bind(key)
        .first<{ owner: string; mime: string }>();
    if (
      !photo ||
      (photo.owner !== id &&
        !(await db
          .prepare(
            "SELECT id FROM club_records WHERE photo_key = ? AND visibility = 'public' UNION ALL SELECT c.id FROM club_comments c JOIN club_records r ON r.id = c.record_id WHERE c.photo_key = ? AND r.visibility = 'public' LIMIT 1",
          )
          .bind(key, key)
          .first()))
    )
      return clubReply({ error: "사진이 없어요." }, cookie, 404);
    const object = await env.BUCKET?.get(key);
    if (!object) return clubReply({ error: "사진이 없어요." }, cookie, 404);
    return new Response(object.body, {
      headers: {
        "Content-Type": photo.mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return clubReply({ error: "사진을 불러오지 못했어요." }, cookie, 503);
  }
}
