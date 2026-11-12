import { Chess } from "chess.js";
import { identifyOpening, timeCategory } from "./analysis.js";
let dataset;
export function demoDataset() {
  if (dataset) return dataset;
  let seed = 2143;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const lines = [
    [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d3",
      "d6",
      "O-O",
      "O-O",
    ],
    [
      "e4",
      "c6",
      "d4",
      "d5",
      "Nc3",
      "dxe4",
      "Nxe4",
      "Bf5",
      "Ng3",
      "Bg6",
      "h4",
      "h6",
    ],
    [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be3",
      "e5",
    ],
    [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Nf3",
      "h6",
    ],
    [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "Nf6",
      "O-O",
      "Be7",
      "Re1",
      "b5",
    ],
    [
      "e4",
      "e6",
      "d4",
      "d5",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e5",
      "Nfd7",
      "Bxe7",
      "Qxe7",
    ],
  ];
  const names = [
    "quietstorm",
    "rook_and_roll",
    "e4enthusiast",
    "thelastbishop",
    "pawnpilot",
    "cobaltknight",
    "endgame_eddie",
    "chessandcoffee",
    "sundaygambit",
    "mossyrook",
  ];
  const games = [];
  const today = new Date();
  today.setUTCHours(18, 30, 0, 0);
  for (let i = 0; i < 128; i++) {
    const chess = new Chess();
    const lineIndex = i % lines.length;
    for (const move of lines[lineIndex]) chess.move(move);
    const target = 42 + Math.floor(rand() * 44);
    let ply = lines[lineIndex].length;
    while (ply++ < target && !chess.isGameOver()) {
      const legal = chess.moves();
      const captures = legal.filter((m) => m.includes("x"));
      const selected = captures.length && rand() < 0.55 ? captures : legal;
      chess.move(selected[Math.floor(rand() * selected.length)]);
    }
    const color = i % 3 === 0 ? "black" : "white";
    const chance = lineIndex === 0 || lineIndex === 1 ? 0.68 : 0.48;
    const r = rand();
    let result = r < chance ? "win" : r < chance + 0.08 ? "draw" : "loss";
    if (chess.isCheckmate())
      result = chess.turn() === color[0] ? "loss" : "win";
    if (chess.isDraw()) result = "draw";
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - Math.floor(i / 3) - Math.floor(i / 19));
    date.setUTCMinutes(date.getUTCMinutes() - (i % 3) * 24);
    const rating = 1160 + Math.round((128 - i) * 1.3 + Math.sin(i * 0.8) * 21);
    const opponentRating = rating + Math.round(rand() * 180 - 90);
    const opponent = names[i % names.length];
    const control = i % 5 === 0 ? "180+2" : i % 4 === 0 ? "300" : "600";
    chess.header(
      "Event",
      "Knightly illustrative demo",
      "White",
      color === "white" ? "alexmorgan" : opponent,
      "Black",
      color === "black" ? "alexmorgan" : opponent,
      "Result",
      result === "draw"
        ? "1/2-1/2"
        : (result === "win") === (color === "white")
          ? "1-0"
          : "0-1",
    );
    let clocks = {
      w: Number(control.split("+")[0]),
      b: Number(control.split("+")[0]),
    };
    const moves = chess.history({ verbose: true }).map((m) => {
      clocks[m.color] = Math.max(
        2,
        clocks[m.color] - rand() * 14 + Number(control.split("+")[1] || 0),
      );
      return {
        san: m.san,
        from: m.from,
        to: m.to,
        before: m.before,
        after: m.after,
        color: m.color,
        clock: Math.round(clocks[m.color]),
      };
    });
    games.push({
      id: `demo-${i}`,
      platform: "demo",
      date: date.toISOString(),
      color,
      result,
      opponent,
      rating,
      opponentRating,
      timeControl: control,
      category: timeCategory(control),
      opening: identifyOpening(moves),
      moves,
      pgn: chess.pgn(),
      termination: "Normal",
      analysis: null,
    });
  }
  dataset = {
    id: "demo",
    demo: true,
    profile: { username: "alexmorgan", platform: "demo" },
    games,
    createdAt: new Date().toISOString(),
  };
  return dataset;
}
