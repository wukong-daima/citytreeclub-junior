import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
let cookie = "";
async function request(path, body, expected = 200) {
  const response = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  return data;
}
const first = await request("/api/garden");
assert.equal(first.tree, null);
const nearby = await request("/api/trees?lat=37.5445&lng=127.0374&radius=500");
assert.equal(nearby.trees.length, 10);
await request("/api/trees?lat=nope&lng=127&radius=500", undefined, 400);
const assigned = await request("/api/garden", {
  action: "assign",
  lat: 37.5445,
  lng: 127.0374,
  radius: 500,
});
assert(nearby.trees.some((tree) => tree.id === assigned.tree.id));
await request(
  "/api/garden",
  { action: "assign", lat: 37.5445, lng: 127.0374, radius: 500 },
  409,
);
await request("/api/garden", { action: "decorate", decoration: "ribbon" }, 403);
await request(
  "/api/garden",
  {
    action: "visit",
    lat: assigned.tree.lat,
    lng: assigned.tree.lng,
    accuracy: 5,
  },
  403,
);
await request("/api/garden", { action: "water" });
await request("/api/garden", { action: "water" }, 409);
await request("/api/garden", { action: "compost" });
await request("/api/garden", { action: "demo-visit" });
await request("/api/garden", {
  action: "note",
  text: "오늘은 나무 아래 그늘의 모양을 관찰했어요. ".repeat(10),
});
const decorated = await request("/api/garden", {
  action: "decorate",
  decoration: "ribbon",
});
assert.equal(decorated.xp, 50);
assert.equal(decorated.decoration, "ribbon");
assert.equal(decorated.verifiedVisits, 0);
await request("/api/garden", { action: "interest", eventId: "nameplate" });
const restored = await request("/api/garden");
assert.equal(restored.tree.id, assigned.tree.id);
assert.equal(restored.logs.length, 4);
assert(restored.interests.includes("nameplate"));
const crossOrigin = await fetch(origin + "/api/garden", {
  method: "POST",
  headers: {
    origin: "https://example.invalid",
    "content-type": "application/json",
    cookie,
  },
  body: JSON.stringify({ action: "water" }),
});
assert.equal(crossOrigin.status, 403);
console.log(
  "PASS: nearby assignment, persistence, daily limits, sample protection, growth, 500-char notes, decorations, interests, origin protection",
);
