import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { phaseOf } from "./analysis.js";
const require = createRequire(import.meta.url);
let processHandle,
  buffer = "",
  waiters = [],
  engineQueue = Promise.resolve();
function waitFor(predicate, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const w = { predicate, resolve, reject };
    w.timer = setTimeout(() => {
      waiters = waiters.filter((x) => x !== w);
      reject(new Error("Stockfish timed out. Please retry the review."));
    }, timeout);
    waiters.push(w);
  });
}
async function boot() {
  if (processHandle && !processHandle.killed) return;
  const root = dirname(require.resolve("stockfish/package.json"));
  const dir = join(root, "bin");
  const file = readdirSync(dir).find(
    (f) => f.includes("lite-single") && f.endsWith(".js"),
  );
  if (!file || !existsSync(join(dir, file)))
    throw new Error("Stockfish engine files are missing. Run npm ci.");
  processHandle = spawn(process.execPath, [join(dir, file)], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  processHandle.stdout.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      for (const w of [...waiters])
        if (w.predicate(line)) {
          clearTimeout(w.timer);
          waiters = waiters.filter((x) => x !== w);
          w.resolve(line);
        }
    }
  });
  processHandle.stderr.on("data", () => {});
  processHandle.on("error", fail);
  processHandle.on("exit", () =>
    fail(new Error("Stockfish stopped unexpectedly.")),
  );
  function fail(err) {
    processHandle = null;
    for (const w of waiters) {
      clearTimeout(w.timer);
      w.reject?.(err);
    }
    waiters = [];
  }
  let ready = waitFor((l) => l === "uciok");
  processHandle.stdin.write("uci\n");
  await ready;
  processHandle.stdin.write(
    "setoption name Hash value 16\nsetoption name Threads value 1\n",
  );
  ready = waitFor((l) => l === "readyok");
  processHandle.stdin.write("isready\n");
  await ready;
}
async function evaluate(fen) {
  await boot();
  let score = 0,
    best = "",
    pv = "";
  const info = {
    predicate: (l) => {
      const match = l.match(/score (cp|mate) (-?\d+)/);
      if (match) {
        score =
          match[1] === "mate"
            ? Number(match[2]) > 0
              ? 10000
              : -10000
            : Number(match[2]);
        pv = l.split(" pv ")[1] || "";
      }
      return false;
    },
  };
  waiters.push(info);
  try {
    const result = waitFor((l) => l.startsWith("bestmove"));
    processHandle.stdin.write(`position fen ${fen}\ngo nodes 6000\n`);
    best = (await result).split(" ")[1];
  } finally {
    waiters = waiters.filter((x) => x !== info);
  }
  return { cp: score * (fen.split(" ")[1] === "w" ? 1 : -1), best, pv };
}
export function reviewGame(game, onProgress = () => {}) {
  const work = async () => {
    await boot();
    processHandle.stdin.write("ucinewgame\n");
    const limit = Math.min(game.moves.length, 120);
    const positions = [];
    const mistakes = [];
    let previous = await evaluate(game.moves[0].before);
    positions.push({ ply: 0, ...previous });
    for (let i = 0; i < limit; i++) {
      const m = game.moves[i],
        current = await evaluate(m.after);
      positions.push({ ply: i + 1, ...current });
      if (m.color === game.color[0]) {
        const loss = Math.max(
          0,
          Math.min(
            1000,
            (previous.cp - current.cp) * (m.color === "w" ? 1 : -1),
          ),
        );
        mistakes.push({
          ply: i + 1,
          san: m.san,
          loss,
          phase: phaseOf(m.before, i),
          best: previous.best,
          label:
            loss >= 200
              ? "Blunder"
              : loss >= 100
                ? "Mistake"
                : loss >= 50
                  ? "Inaccuracy"
                  : "Good",
        });
      }
      previous = current;
      onProgress(Math.round(((i + 1) / limit) * 100));
    }
    return {
      complete: true,
      engine: "Stockfish 19 lite",
      nodes: 6000,
      positions,
      mistakes,
      plies: limit,
      totalPlies: game.moves.length,
      averageLoss: mistakes.length
        ? Math.round(mistakes.reduce((s, m) => s + m.loss, 0) / mistakes.length)
        : 0,
    };
  };
  const result = engineQueue.then(work, work);
  engineQueue = result.catch(() => {});
  return result;
}
export function stopEngine() {
  processHandle?.kill();
}
