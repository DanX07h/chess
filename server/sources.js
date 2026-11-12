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
      signal: AbortSignal.timeout(25000),
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
    for (const [i, url] of (archives.archives || [])
      .slice(-12)
      .reverse()
      .entries()) {
      if (!/^https:\/\/api\.chess\.com\/pub\/player\//.test(url)) continue;
      onProgress(`Importing month ${i + 1} of up to 12…`);
      const data = await (await requestSource(url)).json();
      for (const raw of [...(data.games || [])].reverse()) {
        if (raw.rules && raw.rules !== "chess") continue;
        const game = normalizeGame(raw, platform, username, games.length);
        if (game) games.push(game);
        if (games.length >= 150) break;
      }
      if (games.length >= 150) break;
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
    onProgress("Downloading up to 150 recent games…");
    const response = await requestSource(
      `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=150&pgnInJson=true&clocks=true&opening=true&finished=true&perfType=bullet,blitz,rapid,classical`,
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
      const game = normalizeGame(raw, platform, username, games.length);
      if (game) games.push(game);
    }
  }
  return {
    profile,
    games: games.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
}
