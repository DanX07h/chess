# Knightly

A working first version of a personal chess insights app. Import public games from Chess.com or Lichess, explore results, and review decisions with Stockfish. The website opens with a username form, then an 11-chapter Chess Rewind before the dashboard. Visitors can also explore a clearly labelled synthetic sample recap.

## Run

Requires Node.js 22.19+ (tested with Node 24) and npm.

```sh
cd /workspace/chess
npm ci --cache /tmp/knightly-npm-cache
npm run dev
```

The Express server serves the Vite application and API on port **3000**, binding to `0.0.0.0`. Set `PORT` to change it. No API keys, database service, or player password is needed.

For a production build:

```sh
npm run build
npm start
```

## Publish as a website

See [DEPLOY.md](DEPLOY.md) for the Render deployment steps. The included `render.yaml` creates a single free Node web service with a health check. Visitors use a normal HTTPS website; they do not install anything. Free-plan report storage is temporary. The code must be pushed to GitHub before Render can deploy it.

## Included

- Chess.com and Lichess username imports: up to 2,000 finished standard games per report. Choose the past 12 months, a specific calendar year, or all available history. Both adapters report when the limit is reached. Daily/correspondence games may appear in Chess.com history; they are excluded from the automatic engine review selection.
- Separate ratings for each time format; rating history, results and date/format filters.
- Clickable UTC calendar with games and daily win rates, month/year jump, first imported month shortcut, and an older-history import action.
- Chess Rewind: rating changes per format, game counts, highest-rated win and biggest upset, longest win streak, favourite format, local-time finishing-hour histogram, recovery, time pressure, opening results, and an opening gift reveal. Recaps can be replayed and exported as an SVG summary card.
- Brilliant counts and a most-brilliants game are explicitly unavailable: public exports do not expose a comparable platform label. The recap instead highlights the lowest average centipawn loss among reviewed games with at least five player moves.
- Opening results split by White and Black, sample sizes, and repertoire suggestions with explicit evidence.
- Exploratory playstyle signals: captures/checks in the player's first 20 moves, queenside castling, and game length.
- Stockfish 19 lite reviews, a navigable/flippable board, move assessments, evaluation graph, alternative moves, and PGN export.
- Phase feedback, recovery after a loss, comeback results, time-trouble and timeout metrics.
- A locally saved practice checklist and responsive mobile navigation.

## Network access

Allow HTTPS to **api.chess.com** and **lichess.org** for live imports. npm installation needs the npm registry. The source client uses the standard HTTP(S) proxy environment settings and preserves TLS verification. Fonts and the chess engine are bundled; the interface works without external font or engine requests.

Live imports were blocked by the onboarding environment's outbound network policy during development. Both platform adapters were verified with representative API response fixtures. Live external import behavior remains unverified until the domains are allowed. Network requirements, install instructions and startup instructions are saved in the environment configuration draft; review and save them in environment settings, then publish the environment.

## What the metrics mean

- **Win rate:** wins / all games, including draws. This is not the same as scoring percentage.
- **Opening results:** use Lichess opening metadata when supplied; otherwise a small, bundled set of common opening prefixes. Transpositions, uncommon lines and many variations are not fully classified. Unmatched games remain “Unclassified opening”.
- **Recommendations:** openings with at least five games can contribute evidence. Win rates are smoothed for ranking; the UI shows actual wins and game counts. Rating and early move activity inform exploratory alternatives. These suggestions are not a validated playstyle model and do not guarantee improvement.
- **Recovery:** wins in the immediately following game after a loss, when played on the same platform and in the same format within four hours. This is a descriptive sample, not a causal measure of tilt.
- **Comeback:** reviewed games won after having an engine evaluation at least two pawns against the player after ply 10. Only reviewed portions count.
- **Time trouble:** own clock falls below the smaller of 60 seconds and 10% of the starting time, in games that have complete parsed clock comments. Timeouts are counted separately. A low clock alone does not establish poor time management; increment and position complexity matter.
- **Phase feedback:** mean centipawn loss for the player's moves. Opening = first 10 full moves. Endgame = no queens and at most 12 pieces. Other positions = middlegame. The phase with greatest average loss and at least five reviewed moves is a suggested focus. This is a heuristic, particularly with few reviewed games.
- **Engine limits:** automatic imports review three recent non-correspondence games, up to 120 plies (60 full moves) each, with 6,000 nodes per position using single-threaded Stockfish 19 lite. Review other games individually from My games. Evaluations and move labels are approximate. There is no fabricated accuracy percentage or deep engine claim.
- **Ratings:** the most recently recorded rated-game rating per format, not a cross-platform Elo estimate. Rating changes compare the first and last recorded ratings in that format and require two rated games. Archives can record pre-game ratings, so changes do not necessarily include the last result.
- **Time of day:** game-end timestamps grouped by hour in the browser’s timezone. Missing source timestamps are excluded. This measures when games finish, not exact play duration.
- **Streaks and records:** cover only the imported games; draws and losses end a win streak. Highest opponent rating and largest positive opponent/player rating gap are separate records.
- **History scope:** “All available history” can still hit the 2,000-game cap. A visible date range and limit notice prevent presenting this sample as a lifetime total. Import an individual earlier year to reach older periods. Re-imports create a separate report, rather than silently merging old reports.

## Tests

```sh
npm test
npm run build
npm run test:production
# With the server running:
npm run test:e2e
```

Unit/integration tests exercise PGN parsing, statistics, normalization, both import adapters with recorded-shaped fixtures, errors, and a real forced-mate Stockfish calculation. Browser tests exercise filters, opening details, calendar selection, search, real review jobs, a mocked connection/report flow, persistence, and mobile layout. Browser tests default to `/usr/bin/chromium`; set `CHROMIUM_PATH` for a different executable.

## Storage and scope

Imported public-game reports and their reviews are stored in ignored `.data/*.json` files by default. Set `DATA_DIR` to use a different location, such as a persistent disk. The free Render Blueprint uses temporary `/tmp/knightly-data` storage. The browser stores its current report ID and practice checklist in local storage. Reports survive a server restart; running jobs do not. The demo report is generated in memory; changes to it reset on restart.

This is a single-workspace prototype. Authentication, private user isolation, report deletion/retention controls, robust job persistence, multi-process deployment, comprehensive opening classification, and deeper coaching are future production work. Reports are accessible to anyone with their unguessable report ID on this server. Do not use this version as a private multi-user deployment.

## Project layout

- `src/main.jsx`, `src/styles.css`: React interface.
- `server/index.js`: API, report storage and background jobs.
- `server/sources.js`: external platform adapters.
- `server/analysis.js`: shared, tested statistics and opening logic.
- `server/engine.js`: serialized Stockfish UCI worker.
- `server/demo.js`: illustrative dataset generator.
- `test/`: statistics, adapters, engine and browser tests.

Stockfish is GPL-3.0 software. Its package includes the license and engine source information. Preserve the required license notices and satisfy source-distribution requirements if distributing the engine. Third-party packages retain their respective licenses.
