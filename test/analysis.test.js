import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePgn,
  normalizeGame,
  summarize,
  timeCategory,
  phaseOf,
} from "../server/analysis.js";
const pgn =
  '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n[TimeControl "600"]\n\n1. e4 {[%clk 0:09:58]} e5 {[%clk 0:09:57]} 2. Nf3 {[%clk 0:09:55]} Nc6 {[%clk 0:09:50]} 3. Bc4 {[%clk 0:09:48]} 1-0';
function game(overrides = {}) {
  return {
    id: "g",
    platform: "chess.com",
    date: "2026-01-01T12:00:00Z",
    color: "white",
    result: "win",
    rating: 1200,
    category: "Rapid",
    opening: { name: "Italian Game", eco: "C50" },
    moves: [],
    timeControl: "600",
    termination: "Normal",
    ...overrides,
  };
}
test("PGN parsing keeps legal positions, moves and per-move clocks", () => {
  const r = parsePgn(pgn);
  assert.equal(r.moves.length, 5);
  assert.equal(r.moves[0].clock, 598);
  assert.equal(r.moves[4].san, "Bc4");
  assert.match(r.moves[4].after, /b/);
  assert.equal(r.headers.White, "Alice");
});
test("normalization identifies own colour, result, rating and opening", () => {
  const r = normalizeGame(
    {
      pgn,
      white: { username: "Alice", rating: 1212 },
      black: { username: "Bob", rating: 1234 },
      end_time: 1767268800,
      time_control: "600",
    },
    "chess.com",
    "ALICE",
  );
  assert.equal(r.color, "white");
  assert.equal(r.result, "win");
  assert.equal(r.rating, 1212);
  assert.equal(r.opening.name, "Italian Game");
  assert.equal(r.category, "Rapid");
  assert.equal(normalizeGame({ pgn }, "chess.com", "Other"), null);
});
test("malformed and nonstandard games are excluded", () => {
  assert.equal(
    normalizeGame({ pgn: "this is not chess" }, "lichess", "Alice"),
    null,
  );
  assert.equal(
    normalizeGame(
      { pgn: pgn.replace("[White", '[Variant "Crazyhouse"]\n[White') },
      "lichess",
      "Alice",
    ),
    null,
  );
});
test("win rates include draws and opening results stay split by colour", () => {
  const s = summarize([
    game(),
    game({ result: "draw" }),
    game({ color: "black", result: "loss" }),
  ]);
  assert.equal(s.winRate, 33);
  assert.equal(s.openings.length, 2);
  assert.equal(s.openings.find((o) => o.color === "white").winRate, 50);
  assert.equal(s.openings.find((o) => o.color === "black").winRate, 0);
});
test("recovery requires the next game in same platform and format within four hours", () => {
  const s = summarize([
    game({ result: "loss" }),
    game({ date: "2026-01-01T12:30:00Z" }),
    game({ date: "2026-01-02T12:00:00Z", result: "loss" }),
    game({ date: "2026-01-02T13:00:00Z", category: "Blitz" }),
    game({ date: "2026-01-03T12:00:00Z", result: "loss" }),
    game({ date: "2026-01-03T17:00:00Z" }),
  ]);
  assert.equal(s.recovery.games, 1);
  assert.equal(s.recovery.rate, 100);
});
test("empty denominators are unavailable, never fabricated zeroes", () => {
  const s = summarize([]);
  assert.equal(s.winRate, null);
  assert.equal(s.recovery.rate, null);
  assert.equal(s.comebacks.rate, null);
  assert.equal(s.time.rate, null);
  assert.equal(s.focus, null);
});
test("comeback signs are relative to the player and only reviewed games count", () => {
  const a = {
    complete: true,
    positions: [{ ply: 15, cp: 250 }],
    mistakes: [{ phase: "Middlegame", loss: 100 }],
  };
  const s = summarize([
    game({ color: "black", analysis: a }),
    game({ color: "white", analysis: a }),
    game({ result: "loss" }),
  ]);
  assert.equal(s.analyzed, 2);
  assert.equal(s.comebacks.games, 1);
  assert.equal(s.comebacks.rate, 100);
  assert.equal(s.phases.Middlegame.averageLoss, 100);
});
test("clock pressure uses own moves and timeouts are separate", () => {
  const s = summarize([
    game({
      moves: [
        { color: "b", clock: 2 },
        { color: "w", clock: 500 },
      ],
    }),
    game({
      moves: [{ color: "w", clock: 8 }],
      result: "loss",
      termination: "timeout",
    }),
  ]);
  assert.equal(s.time.clockGames, 2);
  assert.equal(s.time.timeTrouble, 1);
  assert.equal(s.time.rate, 50);
  assert.equal(s.time.timeouts, 1);
});
test("recommendations never suggest a black defence as a white repertoire", () => {
  const games = Array.from({ length: 10 }, () =>
    game({ opening: { name: "Caro-Kann Defense", eco: "B10" } }),
  );
  const s = summarize(games);
  assert.ok(
    s.recommendations
      .filter((r) => r.side === "white")
      .every((r) => r.name !== "Caro-Kann Defense"),
  );
});
test("formats account for increment and daily games", () => {
  assert.equal(timeCategory("60+0"), "Bullet");
  assert.equal(timeCategory("180+2"), "Blitz");
  assert.equal(timeCategory("600"), "Rapid");
  assert.equal(timeCategory("1800"), "Classical");
  assert.equal(timeCategory("1/86400"), "Correspondence");
  assert.equal(phaseOf("8/8/8/4k3/8/3K4/8/8 w - - 0 60", 60), "Endgame");
});

test("daily games stay out of the automatic real-time review pool and timeout result codes survive", () => {
  const r = normalizeGame(
    {
      pgn: pgn.replaceAll("1-0", "0-1"),
      white: { username: "Alice", rating: 1212, result: "timeout" },
      black: { username: "Bob", rating: 1234 },
      end_time: 1767268800,
      time_control: "1/86400",
      time_class: "daily",
    },
    "chess.com",
    "Alice",
  );
  assert.equal(r.category, "Correspondence");
  assert.equal(summarize([r]).time.timeouts, 1);
});
