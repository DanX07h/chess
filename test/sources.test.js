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
