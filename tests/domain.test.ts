import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidates,
  distanceMeters,
  growth,
  seoulDay,
  validLocation,
  validNickname,
  validGameFinish,
  physicalApplication,
} from "../lib/domain.ts";
test("distance is accurate and symmetric", () => {
  assert.equal(distanceMeters(37.54, 127.03, 37.54, 127.03), 0);
  assert.ok(Math.abs(distanceMeters(0, 0, 1, 0) - 111195) < 1);
  assert.equal(
    distanceMeters(37, 127, 38, 126),
    distanceMeters(38, 126, 37, 127),
  );
});
test("nearest ten, radius and empty results", () => {
  const trees = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    name: "샘플",
    species: "느티나무",
    lat: 37 + i * 0.0001,
    lng: 127,
    location: "체험",
    sample: true,
  })).reverse();
  const found = candidates(trees, 37, 127, 300);
  assert.equal(found.length, 10);
  assert.deepEqual(
    found.map((tree: { id: string }) => tree.id),
    Array.from({ length: 10 }, (_, i) => String(i)),
  );
  assert.equal(candidates(trees, 0, 0, 300).length, 0);
  assert.equal(candidates(trees, 37, 127, 1).length, 0);
});
test("invalid inputs cannot produce assignment candidates", () => {
  for (const input of [
    [NaN, 127, 500],
    [91, 127, 500],
    [37, 181, 500],
    [37, 127, 100],
    ["37", 127, 500],
  ])
    assert.equal(validLocation(input[0], input[1], input[2]), false);
  assert.equal(validLocation(37.54, 127.03, 500), true);
});
test("radius excludes trees just outside the boundary", () => {
  const trees = [299, 301].map((meters) => ({
    id: String(meters),
    name: "경계",
    species: "느티나무",
    lat: ((meters / 6371000) * 180) / Math.PI,
    lng: 0,
    location: "체험",
    sample: true,
  }));
  assert.deepEqual(
    candidates(trees, 0, 0, 300).map((tree: { id: string }) => tree.id),
    ["299"],
  );
});
test("growth thresholds and Seoul daily boundary", () => {
  assert.equal(growth(0).level, 1);
  assert.equal(growth(30).level, 2);
  assert.equal(growth(80).level, 3);
  assert.equal(growth(300).progress, 100);
  assert.equal(growth(-10).level, 1);
  assert.equal(seoulDay(new Date("2026-09-30T14:59:59Z")), "2026-09-30");
  assert.equal(seoulDay(new Date("2026-09-30T15:00:00Z")), "2026-10-01");
});
test("names reject controls and overlong names", () => {
  assert.equal(validNickname("  느티 친구  "), true);
  for (const value of ["", "  ", "가".repeat(17), "나무\n", 1])
    assert.equal(validNickname(value), false);
});
test("games require exact unique targets and a bounded duration", () => {
  const targets = [
    { id: "a", x: 10, y: 20 },
    { id: "b", x: 40, y: 60 },
  ];
  const start = "2026-10-01T00:00:00Z";
  assert.equal(
    validGameFinish(
      targets,
      ["b", "a"],
      start,
      new Date("2026-10-01T00:00:03Z"),
    ),
    true,
  );
  for (const submitted of [
    ["a", "a"],
    ["a"],
    ["a", "other"],
    ["a", "b", "c"],
    null,
  ])
    assert.equal(
      validGameFinish(
        targets,
        submitted,
        start,
        new Date("2026-10-01T00:00:05Z"),
      ),
      false,
    );
  for (const time of ["2026-10-01T00:00:02Z", "2026-10-01T00:10:01Z"])
    assert.equal(
      validGameFinish(targets, ["a", "b"], start, new Date(time)),
      false,
    );
});
test("physical event requires earned points, consent and valid future date", () => {
  const now = new Date("2026-09-30T15:00:00Z"); // Seoul October 1
  const input = {
    kind: "confession",
    message: "함께 걸어요",
    startDate: "2026-10-02",
    days: 3,
    consent: true,
  };
  assert.equal(physicalApplication(input, 99, now), null);
  assert.deepEqual(physicalApplication(input, 100, now), {
    kind: "confession",
    message: "함께 걸어요",
    startDate: "2026-10-02",
    endDate: "2026-10-04",
  });
  for (const patch of [
    { consent: false },
    { days: 4 },
    { days: "3" },
    { startDate: "2026-10-01" },
    { startDate: "2027-01-01" },
    { startDate: "2026-11-31" },
    { message: "x" },
    { message: "x".repeat(101) },
    { kind: "other" },
  ])
    assert.equal(physicalApplication({ ...input, ...patch }, 100, now), null);
});
