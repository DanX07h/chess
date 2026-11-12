import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { parsePgn } from "../../server/analysis.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function availablePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
async function start(dataDir) {
  const port = await availablePort();
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  try {
    for (let i = 0; i < 150; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
      try {
        const response = await fetch(`${base}/api/health`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) return { child, base };
      } catch {}
      await delay(100);
    }
    throw new Error(`Production server did not become healthy: ${output}`);
  } catch (error) {
    await stop(child);
    throw error;
  }
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}

test(
  "Render-style production startup serves the website and retains reviews in DATA_DIR across restarts",
  { timeout: 45000 },
  async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "knightly-production-"));
    let service;
    const id = randomUUID();
    const pgn =
      '[White "Alice"]\n[Black "Bob"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
    const game = {
      id: "deployment-game",
      platform: "lichess",
      date: "2026-01-01T12:00:00Z",
      color: "white",
      result: "loss",
      opponent: "Bob",
      rating: 1200,
      opponentRating: 1201,
      category: "Rapid",
      timeControl: "600",
      opening: { name: "King’s Pawn Game", eco: "C20" },
      moves: parsePgn(pgn).moves,
      pgn,
      analysis: null,
    };
    await writeFile(
      join(dataDir, `${id}.json`),
      JSON.stringify({
        id,
        demo: false,
        profile: { username: "Alice", platform: "lichess" },
        games: [game],
        createdAt: new Date().toISOString(),
      }),
    );
    try {
      service = await start(dataDir);
      assert.deepEqual(
        await (await fetch(`${service.base}/api/health`)).json(),
        { ok: true },
      );
      const home = await fetch(service.base);
      assert.equal(home.status, 200);
      const html = await home.text();
      assert.match(html, /<div id="root"><\/div>/);
      const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/);
      assert.ok(asset, "production HTML must reference a built JS asset");
      const script = await fetch(service.base + asset[1]);
      assert.equal(script.status, 200);
      assert.match(script.headers.get("content-type"), /javascript/);
      assert.equal((await fetch(`${service.base}/training`)).status, 200);
      const unknown = await fetch(`${service.base}/api/not-an-endpoint`);
      assert.equal(unknown.status, 404);
      assert.match(unknown.headers.get("content-type"), /json/);
      const report = await (
        await fetch(`${service.base}/api/datasets/${id}`)
      ).json();
      assert.equal(report.profile.username, "Alice");
      assert.equal(report.summary.total, 1);
      const submitted = await fetch(
        `${service.base}/api/datasets/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id }),
        },
      );
      assert.equal(submitted.status, 202);
      const job = await submitted.json();
      let finalJob;
      for (let i = 0; i < 150; i++) {
        finalJob = await (
          await fetch(`${service.base}/api/jobs/${job.id}`)
        ).json();
        if (finalJob.status !== "running") break;
        await delay(100);
      }
      assert.equal(finalJob.status, "complete", finalJob.message);
      await stop(service.child);
      service = null;
      service = await start(dataDir);
      const restored = await (
        await fetch(`${service.base}/api/datasets/${id}`)
      ).json();
      assert.equal(restored.games[0].analysis.complete, true);
      assert.equal(restored.games[0].analysis.plies, 4);
      assert.ok(restored.games[0].analysis.positions.at(-1).cp <= -9000);
      assert.equal(restored.summary.analyzed, 1);
    } finally {
      await stop(service?.child);
      await rm(dataDir, { recursive: true, force: true });
    }
  },
);
