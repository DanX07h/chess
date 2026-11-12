import { recapStats } from "./recap.js";
import { Chess } from "chess.js";
export const ECO = [
  {
    name: "Italian Game",
    eco: "C50",
    moves: "e4 e5 Nf3 Nc6 Bc4",
    style: "Open, tactical play",
    why: "Develop naturally, fight for the centre, and build an attack against the king.",
    side: "white",
  },
  {
    name: "Ruy Lopez",
    eco: "C60",
    moves: "e4 e5 Nf3 Nc6 Bb5",
    style: "Patient, positional play",
    why: "Build central pressure and improve your pieces before committing to an attack.",
    side: "white",
  },
  {
    name: "Scotch Game",
    eco: "C45",
    moves: "e4 e5 Nf3 Nc6 d4",
    style: "Open, tactical play",
    why: "Open the centre early and use active pieces to create concrete threats.",
    side: "white",
  },
  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: "e4 c5",
    style: "Dynamic counterplay",
    why: "Create an unbalanced position with active queenside counterplay.",
    side: "black",
  },
  {
    name: "French Defense",
    eco: "C00",
    moves: "e4 e6",
    style: "Patient, positional play",
    why: "Build a solid pawn chain, then challenge the centre with well-timed pawn breaks.",
    side: "black",
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10",
    moves: "e4 c6",
    style: "Solid, structured play",
    why: "Get a sound pawn structure and a clear development plan against 1.e4.",
    side: "black",
  },
  {
    name: "Queen’s Gambit",
    eco: "D06",
    moves: "d4 d5 c4",
    style: "Patient, positional play",
    why: "Use central space and pressure on the d5 pawn to get comfortable piece play.",
    side: "white",
  },
  {
    name: "London System",
    eco: "D02",
    moves: "d4 d5 Nf3 Nf6 Bf4",
    style: "Solid, structured play",
    why: "Develop with a consistent structure and learn plans that recur across many games.",
    side: "white",
  },
  {
    name: "King’s Indian Defense",
    eco: "E60",
    moves: "d4 Nf6 c4 g6",
    style: "Dynamic counterplay",
    why: "Accept less space early and prepare active central or kingside pawn breaks.",
    side: "black",
  },
  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: "e4 d5",
    style: "Open, tactical play",
    why: "Challenge the centre immediately and learn a compact, active repertoire.",
    side: "black",
  },
  {
    name: "English Opening",
    eco: "A10",
    moves: "c4",
    style: "Patient, positional play",
    why: "Control the centre from the flank and keep your pawn structure flexible.",
    side: "white",
  },
  {
    name: "Réti Opening",
    eco: "A04",
    moves: "Nf3",
    style: "Patient, positional play",
    why: "Develop flexibly and choose your central pawn structure after your opponent commits.",
    side: "white",
  },
  {
    name: "Queen’s Pawn Game",
    eco: "D00",
    moves: "d4 d5",
    style: "Solid, structured play",
    why: "Develop around a stable centre and practise coordinating your pieces.",
    side: "white",
  },
  {
    name: "King’s Pawn Game",
    eco: "C20",
    moves: "e4 e5",
    style: "Open, tactical play",
    why: "Practise fast development and king safety in open positions.",
    side: "white",
  },
];
ECO.push({
  name: "King’s Gambit",
  eco: "C30",
  moves: "e4 e5 f4",
  style: "Explosive, tactical play",
  why: "Trade a pawn for open lines and rapid development. Practise king safety and concrete calculation before using it in rated games.",
  side: "white",
});
export function identifyOpening(moves, supplied) {
  if (supplied?.name) return { name: supplied.name, eco: supplied.eco || "—" };
  const matches = ECO.filter((o) =>
    o.moves.split(" ").every((m, i) => moves[i]?.san === m),
  ).sort((a, b) => b.moves.length - a.moves.length);
  return matches[0]
    ? { name: matches[0].name, eco: matches[0].eco }
    : { name: "Unclassified opening", eco: "—" };
}
export function parsePgn(pgn) {
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });
  const headers = chess.getHeaders();
  const moves = chess.history({ verbose: true }).map((m) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    before: m.before,
    after: m.after,
    color: m.color,
  }));
  const clocks = [
    ...pgn.matchAll(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/g),
  ].map((m) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  if (clocks.length === moves.length)
    moves.forEach((m, i) => (m.clock = clocks[i]));
  return { headers, moves };
}
export function timeCategory(control) {
  if (!control || control.includes("/")) return "Correspondence";
  const [base, inc = 0] = control.split("+").map(Number);
  const est = base + 40 * inc;
  return est < 180
    ? "Bullet"
    : est < 480
      ? "Blitz"
      : est < 1500
        ? "Rapid"
        : "Classical";
}
export function phaseOf(fen, ply) {
  if (ply < 20) return "Opening";
  const pieces = fen.split(" ")[0].replace(/[\d/]/g, "");
  return pieces.length <= 12 && !/[qQ]/.test(pieces) ? "Endgame" : "Middlegame";
}
export function normalizeGame(raw, platform, username, index = 0) {
  const pgn = raw.pgn;
  if (!pgn) return null;
  let parsed;
  try {
    parsed = parsePgn(pgn);
  } catch {
    return null;
  }
  const { headers, moves } = parsed;
  if (!moves.length) return null;
  if (headers.Variant && !["Standard", "Chess"].includes(headers.Variant))
    return null;
  const white =
    platform === "chess.com"
      ? raw.white?.username
      : raw.players?.white?.user?.name || headers.White;
  const black =
    platform === "chess.com"
      ? raw.black?.username
      : raw.players?.black?.user?.name || headers.Black;
  const color =
    white?.toLowerCase() === username.toLowerCase()
      ? "white"
      : black?.toLowerCase() === username.toLowerCase()
        ? "black"
        : null;
  if (!color) return null;
  const result =
    headers.Result === "1-0"
      ? color === "white"
        ? "win"
        : "loss"
      : headers.Result === "0-1"
        ? color === "black"
          ? "win"
          : "loss"
        : headers.Result === "1/2-1/2"
          ? "draw"
          : null;
  if (!result) return null;
  const control = raw.time_control || headers.TimeControl || "600";
  const date = new Date(
    raw.end_time
      ? raw.end_time * 1000
      : raw.lastMoveAt ||
          raw.createdAt ||
          headers.UTCDate?.replaceAll(".", "-") ||
          headers.Date?.replaceAll(".", "-"),
  );
  if (!Number.isFinite(date.getTime())) return null;
  const player = platform === "chess.com" ? raw[color] : raw.players?.[color];
  const opp =
    platform === "chess.com"
      ? raw[color === "white" ? "black" : "white"]
      : raw.players?.[color === "white" ? "black" : "white"];
  const opponent = color === "white" ? black : white;
  return {
    id: `${platform}-${raw.uuid || raw.id || index}-${date.getTime()}`,
    platform,
    date: date.toISOString(),
    timestampKnown: Boolean(raw.end_time || raw.lastMoveAt || raw.createdAt),
    rated: raw.rated !== false,
    color,
    result,
    opponent: opponent || "Anonymous",
    rating:
      player?.rating ||
      Number(headers[color === "white" ? "WhiteElo" : "BlackElo"]) ||
      null,
    opponentRating:
      opp?.rating ||
      Number(headers[color === "white" ? "BlackElo" : "WhiteElo"]) ||
      null,
    timeControl: control,
    category:
      raw.time_class === "daily"
        ? "Correspondence"
        : raw.time_class
          ? raw.time_class[0].toUpperCase() + raw.time_class.slice(1)
          : timeCategory(control),
    opening: identifyOpening(moves, raw.opening),
    moves,
    pgn,
    url: platform === "chess.com" ? raw.url : `https://lichess.org/${raw.id}`,
    termination: [headers.Termination, player?.result, raw.status]
      .filter(Boolean)
      .join(" · "),
    analysis: null,
  };
}
export const percent = (n, d) => (d ? Math.round((n / d) * 100) : null);
export function summarize(games) {
  const sorted = [...games].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const wins = games.filter((g) => g.result === "win").length,
    losses = games.filter((g) => g.result === "loss").length,
    draws = games.length - wins - losses;
  const days = {},
    openings = {},
    ratings = {};
  for (const g of sorted) {
    const day = g.date.slice(0, 10);
    days[day] ??= { games: 0, wins: 0, losses: 0, draws: 0 };
    days[day].games++;
    days[day][
      g.result === "win" ? "wins" : g.result === "loss" ? "losses" : "draws"
    ]++;
    const key = `${g.color}:${g.opening.name}`;
    openings[key] ??= {
      ...g.opening,
      color: g.color,
      games: 0,
      wins: 0,
      draws: 0,
    };
    openings[key].games++;
    openings[key].wins += g.result === "win" ? 1 : 0;
    openings[key].draws += g.result === "draw" ? 1 : 0;
    if (g.rating && g.rated !== false) ratings[g.category] = g.rating;
  }
  let recoveryGames = 0,
    recoveryWins = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1],
      b = sorted[i];
    if (
      a.result === "loss" &&
      a.category === b.category &&
      a.platform === b.platform &&
      Date.parse(b.date) - Date.parse(a.date) <= 4 * 3600000
    ) {
      recoveryGames++;
      recoveryWins += b.result === "win" ? 1 : 0;
    }
  }
  const analyzed = games.filter((g) => g.analysis?.complete);
  const losing = analyzed.filter((g) =>
    g.analysis.positions.some(
      (p) => p.ply > 10 && (g.color === "white" ? p.cp : -p.cp) <= -200,
    ),
  );
  const comebackWins = losing.filter((g) => g.result === "win").length;
  const phases = {
    Opening: { loss: 0, moves: 0 },
    Middlegame: { loss: 0, moves: 0 },
    Endgame: { loss: 0, moves: 0 },
  };
  analyzed.forEach((g) =>
    g.analysis.mistakes.forEach((m) => {
      phases[m.phase].loss += m.loss;
      phases[m.phase].moves++;
    }),
  );
  let clockGames = 0,
    timeTrouble = 0,
    timeouts = 0;
  games.forEach((g) => {
    const base = Number(g.timeControl.split("+")[0]);
    const clocks = g.moves.filter(
      (m) => m.color === g.color[0] && Number.isFinite(m.clock),
    );
    if (clocks.length && base > 0) {
      clockGames++;
      if (clocks.some((m) => m.clock < Math.min(60, base * 0.1))) timeTrouble++;
    }
    if (
      g.result === "loss" &&
      /timeout|time forfeit|outoftime|timevsinsufficient/i.test(g.termination)
    )
      timeouts++;
  });
  const openingList = Object.values(openings)
    .map((o) => ({ ...o, winRate: percent(o.wins, o.games) }))
    .sort((a, b) => b.games - a.games);
  const focus =
    Object.entries(phases)
      .filter(([, v]) => v.moves >= 5)
      .sort(
        (a, b) => b[1].loss / b[1].moves - a[1].loss / a[1].moves,
      )[0]?.[0] || null;
  return {
    recap: recapStats(games),
    total: games.length,
    wins,
    losses,
    draws,
    winRate: percent(wins, games.length),
    days,
    openings: openingList,
    ratings,
    recovery: {
      games: recoveryGames,
      wins: recoveryWins,
      rate: percent(recoveryWins, recoveryGames),
    },
    comebacks: {
      games: losing.length,
      wins: comebackWins,
      rate: percent(comebackWins, losing.length),
    },
    analyzed: analyzed.length,
    phases: Object.fromEntries(
      Object.entries(phases).map(([k, v]) => [
        k,
        { ...v, averageLoss: v.moves ? Math.round(v.loss / v.moves) : null },
      ]),
    ),
    focus,
    time: {
      clockGames,
      timeTrouble,
      rate: percent(timeTrouble, clockGames),
      timeouts,
    },
    style: styleSignals(games),
    recommendations: recommend(openingList, ratings, games),
  };
}
export function styleSignals(games) {
  let moves = 0,
    captures = 0,
    checks = 0,
    longCastles = 0;
  for (const g of games) {
    const own = g.moves.filter((m) => m.color === g.color[0]);
    for (const m of own.slice(0, 20)) {
      if (!m.san) continue;
      moves++;
      captures += m.san.includes("x") ? 1 : 0;
      checks += /[+#]/.test(m.san) ? 1 : 0;
    }
    longCastles += own.some((m) => m.san === "O-O-O") ? 1 : 0;
  }
  return {
    games: games.length,
    moves,
    captureRate: percent(captures, moves),
    checkRate: percent(checks, moves),
    longCastleRate: percent(longCastles, games.length),
    averageLength: games.length
      ? Math.round(
          games.reduce((s, g) => s + g.moves.length / 2, 0) / games.length,
        )
      : null,
  };
}
function recommend(openings, ratings, games) {
  const style = styleSignals(games);
  const active =
    style.games >= 10 &&
    ((style.captureRate || 0) >= 25 || (style.checkRate || 0) >= 12);
  const quiet = style.games >= 10 && (style.captureRate || 0) < 15;
  const styleNote =
    style.games >= 10
      ? `In your ${style.games}-game sample, ${style.captureRate}% of your first 20 moves were captures and ${style.checkRate}% gave check. These are exploratory signals, not a fixed playstyle. `
      : "";

  const rating =
    ratings.Rapid || ratings.Blitz || Object.values(ratings)[0] || 1000;
  return ["white", "black"].flatMap((color) => {
    const evidence = openings
      .filter(
        (o) =>
          o.color === color &&
          o.games >= 5 &&
          ECO.some((e) => e.side === color && o.name.startsWith(e.name)),
      )
      .sort(
        (a, b) => (b.wins + 2) / (b.games + 4) - (a.wins + 2) / (a.games + 4),
      )[0];
    const known = evidence && ECO.find((o) => evidence.name.startsWith(o.name));
    const defaults =
      color === "white"
        ? active
          ? [ECO.at(-1), ECO[2]]
          : quiet
            ? [ECO[6], ECO[7]]
            : [ECO[0], ECO[6]]
        : active && rating > 1200
          ? [ECO[3], ECO[5]]
          : quiet
            ? [ECO[4], ECO[5]]
            : [ECO[5], rating > 1400 ? ECO[3] : ECO[4]];
    const choices = known
      ? [known, ...defaults.filter((o) => o.name !== known.name)].slice(0, 2)
      : defaults;
    return choices.map((o, i) => ({
      ...o,
      side: color,
      evidence:
        known && i === 0
          ? `${evidence.wins} wins in ${evidence.games} games (${evidence.winRate}%). Your strongest sampled opening after adjusting for small samples.`
          : `${styleNote}A learning suggestion based on rating, early move patterns and clear plans. Try it and compare your results.`,
      confidence:
        known && i === 0
          ? evidence.games >= 25
            ? "Moderate evidence"
            : "Early signal"
          : "Explore",
      sample: known && i === 0 ? evidence.games : 0,
    }));
  });
}
