import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePgn } from "../server/analysis.js";
import { reviewGame, stopEngine } from "../server/engine.js";
test("real Stockfish detects Fool’s Mate and attributes the blunder to White", async () => {
  try {
    const { moves } = parsePgn('[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1');
    const progress = [];
    const r = await reviewGame({ color: "white", moves }, (p) =>
      progress.push(p),
    );
    assert.equal(r.complete, true);
    assert.equal(r.positions.length, 5);
    assert.ok(r.positions.at(-1).cp <= -9000);
    assert.equal(r.mistakes.find((m) => m.san === "g4").label, "Blunder");
    assert.equal(r.plies, 4);
    assert.equal(progress.at(-1), 100);
  } finally {
    stopEngine();
  }
});
