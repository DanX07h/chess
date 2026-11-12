import { test } from "node:test";
import assert from "node:assert/strict";
import { recapStats } from "../server/recap.js";
const game = (overrides = {}) => ({
  id: "game",
  category: "Rapid",
  date: "2026-01-01T12:00:00Z",
  result: "win",
  rating: 1200,
  opponentRating: 1300,
  opponent: "Opponent",
  ...overrides,
});
test("recap splits rating deltas by format and excludes unrated ratings", () => {
  const r = recapStats([
    game(),
    game({ category: "Blitz", rating: 900 }),
    game({ date: "2026-01-02T12:00:00Z", rating: 1240 }),
    game({ date: "2026-01-03T12:00:00Z", rating: 2000, rated: false }),
  ]);
  assert.equal(r.formats.Rapid.delta, 40);
  assert.equal(r.formats.Rapid.lastRating, 1240);
  assert.equal(r.formats.Blitz.delta, null);
  assert.equal(r.mostPlayed.name, "Rapid");
  assert.equal(r.mostPlayed.games, 3);
});
test("longest streak is chronological and draws break it", () => {
  const r = recapStats([
    game({ date: "2026-01-05T12:00:00Z" }),
    game({ date: "2026-01-02T12:00:00Z" }),
    game({ date: "2026-01-03T12:00:00Z", result: "draw" }),
    game(),
    game({ date: "2026-01-04T12:00:00Z" }),
  ]);
  assert.equal(r.longestStreak.count, 2);
  assert.equal(r.longestStreak.start, "2026-01-01T12:00:00Z");
  assert.equal(r.longestStreak.end, "2026-01-02T12:00:00Z");
});
test("highest-rated win and largest upset are different records", () => {
  const r = recapStats([
    game({ id: "upset", rating: 800, opponentRating: 1400 }),
    game({ id: "best", rating: 1600, opponentRating: 1700 }),
    game({ id: "loss", opponentRating: 2500, result: "loss" }),
  ]);
  assert.equal(r.bestWin.id, "best");
  assert.equal(r.bestWin.difference, 100);
  assert.equal(r.biggestUpset.id, "upset");
  assert.equal(r.biggestUpset.difference, 600);
});
test("finishing hours honor timezone and skip unknown timestamps", () => {
  const r = recapStats(
    [game(), game({ timestampKnown: false, date: "2026-01-01T01:00:00Z" })],
    "America/New_York",
  );
  assert.equal(r.peakHour, 7);
  assert.equal(r.timestampCount, 1);
  assert.equal(r.hours[7], 1);
});
test("no invented brilliant counts or empty sample highlights", () => {
  const r = recapStats([]);
  assert.equal(r.brilliants.available, false);
  assert.equal(r.brilliants.count, null);
  assert.equal(r.brilliants.game, null);
  assert.equal(r.peakHour, null);
  assert.equal(r.bestWin, null);
  assert.equal(r.sharpest, null);
  assert.equal(r.mostPlayed, null);
});
