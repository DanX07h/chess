// Public-game statistics. No proprietary “brilliant” labels are inferred.
export function recapStats(games, timeZone = "UTC") {
  const sorted = [...games].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const formats = {};
  let streak = 0,
    longest = { count: 0, start: null, end: null },
    start = null;
  const hours = Array(24).fill(0);
  let timestampCount = 0;
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  for (const g of sorted) {
    const f = (formats[g.category] ??= {
      games: 0,
      wins: 0,
      firstRating: null,
      lastRating: null,
      delta: null,
      ratedGames: 0,
    });
    f.games++;
    f.wins += g.result === "win" ? 1 : 0;
    if (Number.isFinite(g.rating) && g.rated !== false) {
      f.firstRating ??= g.rating;
      f.lastRating = g.rating;
      f.ratedGames++;
    }
    if (g.result === "win") {
      if (!streak) start = g.date;
      streak++;
      if (streak > longest.count)
        longest = { count: streak, start, end: g.date };
    } else {
      streak = 0;
      start = null;
    }
    if (g.timestampKnown !== false && Number.isFinite(Date.parse(g.date))) {
      hours[Number(hourFormatter.format(new Date(g.date)))]++;
      timestampCount++;
    }
  }
  Object.values(formats).forEach(
    (f) => (f.delta = f.ratedGames >= 2 ? f.lastRating - f.firstRating : null),
  );
  const wins = sorted.filter((g) => g.result === "win");
  const bestWin = [...wins]
    .filter((g) => Number.isFinite(g.opponentRating))
    .sort(
      (a, b) =>
        b.opponentRating - a.opponentRating ||
        Date.parse(b.date) - Date.parse(a.date),
    )[0];
  const upset = [...wins]
    .filter(
      (g) =>
        Number.isFinite(g.rating) &&
        Number.isFinite(g.opponentRating) &&
        g.opponentRating > g.rating,
    )
    .sort(
      (a, b) => b.opponentRating - b.rating - (a.opponentRating - a.rating),
    )[0];
  const gameCard = (g) =>
    g
      ? {
          id: g.id,
          opponent: g.opponent,
          opponentRating: g.opponentRating,
          rating: g.rating,
          difference:
            Number.isFinite(g.rating) && Number.isFinite(g.opponentRating)
              ? g.opponentRating - g.rating
              : null,
          date: g.date,
          category: g.category,
          url: g.url,
        }
      : null;
  const favorite = Object.entries(formats).sort(
    (a, b) => b[1].games - a[1].games,
  )[0];
  const reviewed = games.filter(
    (g) => g.analysis?.complete && g.analysis.mistakes.length >= 5,
  );
  const sharpest = [...reviewed].sort(
    (a, b) => a.analysis.averageLoss - b.analysis.averageLoss,
  )[0];
  const peak = timestampCount ? hours.indexOf(Math.max(...hours)) : null;
  return {
    formats,
    mostPlayed: favorite
      ? {
          name: favorite[0],
          games: favorite[1].games,
          share: Math.round((favorite[1].games / games.length) * 100),
        }
      : null,
    longestStreak: longest,
    bestWin: gameCard(bestWin),
    biggestUpset: gameCard(upset),
    hours,
    timeZone,
    timestampCount,
    peakHour: peak,
    sharpest: sharpest
      ? {
          ...gameCard(sharpest),
          averageLoss: sharpest.analysis.averageLoss,
          plies: sharpest.analysis.plies,
        }
      : null,
    brilliants: {
      available: false,
      count: null,
      game: null,
      reason:
        "Chess.com and Lichess public game exports do not provide a comparable brilliant-move count. A Stockfish best move is not automatically a brilliant move.",
    },
    firstDate: sorted[0]?.date || null,
    lastDate: sorted.at(-1)?.date || null,
  };
}
