import { fetch, EnvHttpProxyAgent } from "undici";
import { normalizeGame } from "./analysis.js";
const dispatcher = new EnvHttpProxyAgent();
const USER_AGENT = "Knightly/0.1 (personal chess analysis)";
async function request(url, accept = "application/json", fetcher = fetch) {
  let response;
  try {
    response = await fetcher(url, {
      dispatcher,
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(accept === "application/x-ndjson" ? 180000 : 25000),
    });
  } catch {
    throw new Error(
      `Could not reach ${new URL(url).hostname}. Check network access in environment settings and try again.`,
    );
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "Player not found. Check the username and selected platform.",
      );
    if (response.status === 429)
      throw new Error(
        "The chess platform is rate limiting requests. Please wait a minute and try again.",
      );
    if (response.status === 403)
      throw new Error(
        `Access to ${new URL(url).hostname} was denied. Check network settings or try again later.`,
      );
    throw new Error(
      `The chess platform returned ${response.status}. Please try again later.`,
    );
  }
  return response;
}
export async function importGames(
  platform,
  username,
  onProgress = () => {},
  options = {},
) {
  const requestSource = (url, accept) => request(url, accept, options.fetcher);
  const games = [];
  const maxGames = options.maxGames ?? 2000;
  const since = options.since ?? 0;
  const until = options.until ?? Date.now();
  let truncated = false;
  const accept = (raw) => {
    const game = normalizeGame(raw, platform, username, games.length);
    if (!game || Date.parse(game.date) < since || Date.parse(game.date) > until)
      return;
    if (games.length >= maxGames) {
      truncated = true;
      return;
    }
    games.push(game);
  };
  let profile = { username, platform };
  if (platform === "chess.com") {
    const user = await (
      await requestSource(
        `https://api.chess.com/pub/player/${encodeURIComponent(username)}`,
      )
    ).json();
    profile = {
      ...profile,
      username: user.username || username,
      url: user.url,
    };
    const archives = await (
      await requestSource(
        `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
      )
    ).json();
    const selected = (archives.archives || [])
      .filter((url) => {
        const match = url.match(/\/(\d{4})\/(\d{2})$/);
        if (!match) return false;
        const monthStart = Date.UTC(Number(match[1]), Number(match[2]) - 1, 1),
          monthEnd = Date.UTC(Number(match[1]), Number(match[2]), 1) - 1;
        return monthEnd >= since && monthStart <= until;
      })
      .reverse();
    for (const [i, url] of selected.entries()) {
      if (!/^https:\/\/api\.chess\.com\/pub\/player\//.test(url)) continue;
      onProgress(
        `Importing archive ${i + 1} of ${selected.length} · ${games.length} games…`,
      );
      const data = await (await requestSource(url)).json();
      for (const raw of [...(data.games || [])].reverse()) {
        if (raw.rules && raw.rules !== "chess") continue;
        accept(raw);
        if (games.length % 20 === 0) await new Promise(setImmediate);
        if (truncated) break;
      }
      if (truncated) break;
    }
  } else {
    const user = await (
      await requestSource(
        `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      )
    ).json();
    profile = {
      ...profile,
      username: user.username || username,
      url: user.url,
    };
    onProgress(
      `Downloading your selected history (up to ${maxGames.toLocaleString()} games)…`,
    );
    const response = await requestSource(
      `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${maxGames + 1}&since=${since}&until=${until}&pgnInJson=true&clocks=true&opening=true&finished=true&perfType=bullet,blitz,rapid,classical`,
      "application/x-ndjson",
    );
    const lines = (await response.text()).trim().split("\n");
    for (const line of lines) {
      if (!line) continue;
      let raw;
      try {
        raw = JSON.parse(line);
      } catch {
        continue;
      }
      if (raw.variant && raw.variant !== "standard") continue;
      accept(raw);
      if (games.length % 20 === 0) await new Promise(setImmediate);
      if (truncated) break;
    }
  }
  return {
    profile,
    coverage: {
      history: options.history || "all",
      since: since ? new Date(since).toISOString() : null,
      until: new Date(until).toISOString(),
      limit: maxGames,
      truncated,
      earliest: games.length
        ? games.reduce((a, g) => (g.date < a ? g.date : a), games[0].date)
        : null,
    },
    games: games.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
}
