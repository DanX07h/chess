import { test } from "node:test";
import assert from "node:assert/strict";
import { importGames } from "../server/sources.js";
const pgn =
  '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n[TimeControl "600"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 1-0';
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
test("Chess.com profile, archive discovery and monthly games are imported end to end", async () => {
  const urls = [];
  const data = await importGames("chess.com", "Alice", () => {}, {
    fetcher: async (url) => {
      urls.push(url);
      if (url.endsWith("/archives"))
        return json({
          archives: ["https://api.chess.com/pub/player/alice/games/2026/01"],
        });
      if (url.endsWith("/2026/01"))
        return json({
          games: [
            {
              uuid: "test",
              pgn,
              white: { username: "Alice", rating: 1234 },
              black: { username: "Bob", rating: 1220 },
              end_time: 1767268800,
              time_control: "600",
              rules: "chess",
            },
          ],
        });
      return json({
        username: "Alice",
        url: "https://www.chess.com/member/alice",
      });
    },
  });
  assert.equal(urls.length, 3);
  assert.equal(data.games.length, 1);
  assert.equal(data.games[0].rating, 1234);
  assert.equal(data.games[0].result, "win");
});
test("Lichess NDJSON imports carry the supplied opening and opponent", async () => {
  const data = await importGames("lichess", "Alice", () => {}, {
    fetcher: async (url) =>
      url.includes("/api/user/")
        ? json({ username: "Alice" })
        : new Response(
            JSON.stringify({
              id: "abc12345",
              pgn,
              variant: "standard",
              createdAt: 1767268800000,
              lastMoveAt: 1767269800000,
              players: {
                white: { user: { name: "Alice" }, rating: 1400 },
                black: { user: { name: "Bob" }, rating: 1401 },
              },
              opening: {
                name: "Italian Game: Two Knights Defense",
                eco: "C55",
              },
            }) + "\n",
          ),
  });
  assert.equal(data.games.length, 1);
  assert.equal(data.games[0].opponent, "Bob");
  assert.equal(data.games[0].opening.eco, "C55");
  assert.equal(data.games[0].url, "https://lichess.org/abc12345");
});
test("rate limits and missing players produce actionable errors", async () => {
  for (const [code, message] of [
    [404, /Player not found/],
    [429, /rate limiting/],
    [403, /denied/],
  ])
    await assert.rejects(
      importGames("lichess", "Alice", () => {}, {
        fetcher: async () => new Response("", { status: code }),
      }),
      message,
    );
});
test("a failed network request identifies the destination", async () => {
  await assert.rejects(
    importGames("chess.com", "Alice", () => {}, {
      fetcher: async () => {
        throw new Error("fetch failed");
      },
    }),
    /api.chess.com.*network access/,
  );
});

test("Chess.com historical imports reach older archives and report truncation", async () => {
  const urls = [];
  const data = await importGames("chess.com", "Alice", () => {}, {
    maxGames: 1,
    since: Date.UTC(2024, 0, 1),
    until: Date.UTC(2024, 11, 31, 23, 59, 59),
    history: "2024",
    fetcher: async (url) => {
      urls.push(url);
      if (url.endsWith("/archives"))
        return json({
          archives: [
            "https://api.chess.com/pub/player/alice/games/2024/01",
            "https://api.chess.com/pub/player/alice/games/2026/01",
          ],
        });
      if (url.endsWith("/2024/01"))
        return json({
          games: [1, 2].map((i) => ({
            uuid: String(i),
            pgn,
            white: { username: "Alice", rating: 1200 },
            black: { username: "Bob", rating: 1300 },
            end_time: Date.UTC(2024, 0, i) / 1000,
            time_control: "600",
          })),
        });
      return json({ username: "Alice" });
    },
  });
  assert.ok(urls.some((u) => u.endsWith("/2024/01")));
  assert.ok(!urls.some((u) => u.endsWith("/2026/01")));
  assert.equal(data.games.length, 1);
  assert.equal(data.coverage.truncated, true);
  assert.equal(data.coverage.history, "2024");
  assert.ok(data.coverage.earliest.startsWith("2024"));
});
test("Lichess requests selected date bounds and detects game limit", async () => {
  let endpoint;
  const raw = {
    id: "abc12345",
    pgn,
    variant: "standard",
    createdAt: Date.UTC(2024, 0, 1),
    players: {
      white: { user: { name: "Alice" }, rating: 1400 },
      black: { user: { name: "Bob" }, rating: 1401 },
    },
  };
  const data = await importGames("lichess", "Alice", () => {}, {
    maxGames: 1,
    since: Date.UTC(2024, 0, 1),
    until: Date.UTC(2025, 0, 1),
    fetcher: async (url) => {
      if (url.includes("/api/user/")) return json({ username: "Alice" });
      endpoint = new URL(url);
      return new Response(
        [raw, { ...raw, id: "other123" }]
          .map((g) => JSON.stringify(g))
          .join("\n"),
      );
    },
  });
  assert.equal(
    endpoint.searchParams.get("since"),
    String(Date.UTC(2024, 0, 1)),
  );
  assert.equal(endpoint.searchParams.get("max"), "2");
  assert.equal(data.games.length, 1);
  assert.equal(data.coverage.truncated, true);
});
