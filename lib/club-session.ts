export function clubSession(request: Request) {
  const candidate = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("citytree_session="))
    ?.slice(17);
  const id =
    candidate &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate,
    )
      ? candidate
      : crypto.randomUUID();
  const cookie = `citytree_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
  return { id, cookie };
}
export function clubReply(body: unknown, cookie: string, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Set-Cookie": cookie, "Cache-Control": "private, no-store" },
  });
}
export function sameOrigin(request: Request) {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
