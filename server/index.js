import express from "express";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { importGames } from "./sources.js";
import { summarize } from "./analysis.js";
import { demoDataset } from "./demo.js";
import { reviewGame, stopEngine } from "./engine.js";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = resolve(process.env.DATA_DIR || join(root, ".data"));
await mkdir(dataDir, { recursive: true });
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "8kb" }));
const datasets = new Map(),
  jobs = new Map(),
  reviewJobs = new Map();
const validId = (id) => id === "demo" || /^[a-f0-9-]{36}$/.test(id);
async function getDataset(id) {
  if (id === "demo") return demoDataset();
  if (!validId(id)) return null;
  if (datasets.has(id)) return datasets.get(id);
  try {
    const data = JSON.parse(
      await readFile(join(dataDir, `${id}.json`), "utf8"),
    );
    datasets.set(id, data);
    return data;
  } catch {
    return null;
  }
}
async function save(data) {
  datasets.set(data.id, data);
  if (data.demo) return;
  const path = join(dataDir, `${data.id}.json`);
  const temp = path + `.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data));
  await rename(temp, path);
}
const payload = (data) => ({ ...data, summary: summarize(data.games) });
app.get("/api/health", (_, res) => res.json({ ok: true }));
app.get("/api/datasets/:id", async (req, res) => {
  const data = await getDataset(req.params.id);
  if (!data)
    return res.status(404).json({
      error:
        "This report is no longer available. Please import your games again.",
    });
  res.json(payload(data));
});
app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Analysis job not found." });
  res.json(job);
});
app.post("/api/import", async (req, res) => {
  const { platform, username, history = "year" } = req.body || {};
  if (
    !["chess.com", "lichess"].includes(platform) ||
    !(
      history === "all" ||
      history === "year" ||
      (/^\d{4}$/.test(String(history)) &&
        Number(history) >= 2000 &&
        Number(history) <= new Date().getUTCFullYear())
    ) ||
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_-]{1,30}$/.test(username)
  )
    return res.status(400).json({
      error:
        "Choose a platform and enter a valid username (letters, numbers, underscores or hyphens).",
    });
  if ([...jobs.values()].filter((j) => j.status === "running").length >= 3)
    return res
      .status(429)
      .json({ error: "Other reports are running. Please try again shortly." });
  const id = randomUUID(),
    job = {
      id,
      status: "running",
      message: "Looking up your profile…",
      progress: 2,
    };
  jobs.set(id, job);
  res.status(202).json(job);
  (async () => {
    try {
      const now = new Date();
      const since =
        history === "all"
          ? 0
          : history === "year"
            ? now.getTime() - 365 * 86400000
            : Date.UTC(Number(history), 0, 1);
      const until = /^\d{4}$/.test(String(history))
        ? Math.min(now.getTime(), Date.UTC(Number(history) + 1, 0, 1) - 1)
        : now.getTime();
      const imported = await importGames(
        platform,
        username,
        (m) => {
          job.message = m;
          job.progress = 15;
        },
        { since, until, maxGames: 2000, history },
      );
      if (!imported.games.length)
        throw new Error(
          "No finished standard chess games found in the recent history. Try another account or platform.",
        );
      const data = {
        id: randomUUID(),
        ...imported,
        demo: false,
        createdAt: new Date().toISOString(),
      };
      await save(data);
      job.datasetId = data.id;
      const selection = data.games
        .filter((g) => g.category !== "Correspondence")
        .slice(0, 3);
      job.message =
        "Games imported. Reviewing up to 3 recent games with Stockfish…";
      for (let i = 0; i < selection.length; i++) {
        const g = selection[i];
        job.message = `Stockfish review ${i + 1} of ${selection.length} · ${g.opponent}`;
        g.analysis = await reviewGame(g, (p) => {
          job.progress =
            25 + Math.round(((i + p / 100) / selection.length) * 73);
        });
        await save(data);
      }
      job.status = "complete";
      job.progress = 100;
      job.message = "Your report is ready.";
    } catch (err) {
      job.status = "error";
      job.message = err.message || "Import failed. Please try again.";
    }
  })();
});
app.post("/api/datasets/:id/review", async (req, res) => {
  const data = await getDataset(req.params.id);
  if (!data) return res.status(404).json({ error: "Report not found." });
  const game = data.games.find((g) => g.id === req.body?.gameId);
  if (!game) return res.status(404).json({ error: "Game not found." });
  const key = `${data.id}:${game.id}`;
  const existing = reviewJobs.get(key);
  if (existing && jobs.get(existing)?.status === "running")
    return res.status(202).json(jobs.get(existing));
  if (game.analysis?.complete)
    return res.json({ status: "complete", datasetId: data.id, progress: 100 });
  if ([...jobs.values()].filter((j) => j.status === "running").length >= 3)
    return res
      .status(429)
      .json({ error: "The engine is busy. Please try again shortly." });
  const id = randomUUID(),
    job = {
      id,
      status: "running",
      message: "Stockfish is reviewing this game…",
      progress: 0,
      datasetId: data.id,
    };
  jobs.set(id, job);
  reviewJobs.set(key, id);
  res.status(202).json(job);
  try {
    game.analysis = await reviewGame(game, (p) => (job.progress = p));
    await save(data);
    job.status = "complete";
    job.progress = 100;
    job.message = "Game review complete.";
  } catch (err) {
    job.status = "error";
    job.message = err.message;
  }
});
app.use("/api", (_, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(root, "dist")));
  app.get("/{*path}", (_, res) => res.sendFile(join(root, "dist/index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Knightly running on port ${port}`),
);
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => {
    stopEngine();
    server.close(() => process.exit(0));
  });
