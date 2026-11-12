# Put Knightly online with Render

Knightly is a website. One Render **Web Service** runs the React website, the game-import API, and Stockfish. Do not create a Render Static Site: imports and analysis need the Node server.

## 1. Put the code on GitHub

The complete project must be committed and pushed to the `main` branch of `DanX07h/chess`, including `render.yaml`, `package-lock.json`, `src/`, and `server/`. Files that exist only in the development workspace are not available to Render. Keep `node_modules`, `.data`, and `dist` out of Git.

## 2. Create your Render account

Go to https://dashboard.render.com/ and sign in with GitHub. Grant Render access to `DanX07h/chess` when asked. No Chess.com or Lichess password is needed.

## 3. Deploy the Blueprint

After the project is on GitHub, open:

https://render.com/deploy?repo=https://github.com/DanX07h/chess

Alternatively, choose **New → Blueprint** in Render and select the repository. Render reads `render.yaml` from `main`.

Review the proposed `knightly` web service. This Blueprint selects the **free** plan and creates no paid database or disk. Check the plan and any charges shown by Render before confirming deployment. If Render cannot offer the free plan to your account, choose a plan in the dashboard yourself; the project does not require a paid tier for a temporary demonstration.

Confirm the Blueprint. Render installs dependencies, runs the existing unit/engine tests, builds the website, and starts the production server. Wait until the deployment is marked live. The first installation includes the Stockfish package and may take several minutes.

## 4. Open your website

Open the **actual `https://…onrender.com` address shown on your Render service page**. Render may add a suffix to the service name; do not assume `knightly.onrender.com` belongs to this project.

That address is your website link. Visitors only need a browser. They do not install Node.js or download source files. A custom domain can be connected later in Render settings.

## 5. Check it works

- The homepage should show the username-entry form. Try the sample recap or import your account, navigate the chapters, unwrap the opening gift, and enter the dashboard.
- The service's `/api/health` URL should return `{"ok":true}`.
- Choose **Connect account**, enter your Chess.com or Lichess username, and wait for results. Live access to both platforms must be verified on the deployed service; the development environment blocked those destinations.
- Open a game review and confirm Stockfish analysis completes.
- Check a calendar day and compare opening results for White and Black.

## Free-plan behavior

- Render free services can sleep when inactive. Opening the website again may take time to wake the service.
- The Blueprint stores imported reports in `/tmp/knightly-data`. **This storage is temporary. Reports can disappear after a service restart or deployment**, and the user may need to import again. The practice checklist and report ID are remembered in that user's browser; the ID cannot restore a report erased from the server.
- Analysis jobs are held in memory and stop when the service restarts. The engine runs single-threaded, with at most three admitted jobs; this first version is intended for light use.
- There are no user accounts or private report permissions. Imports use public games, and a report is accessible to someone who knows its random report ID. Treat this as a public demonstration, not a private multi-user service.

For retained reports, use a plan that supports a persistent disk, mount it at `/var/data`, and set `DATA_DIR=/var/data/knightly`. Review Render's price before doing so. Use a single instance with the current file-based storage. Authentication, deletion controls and persistent background jobs are separate production work.

## Manual service settings

If using **New → Web Service** instead of a Blueprint:

| Setting             | Value                                               |
| ------------------- | --------------------------------------------------- |
| Repository / branch | `DanX07h/chess` / `main`                            |
| Runtime             | Node                                                |
| Root directory      | Leave empty                                         |
| Build command       | `npm ci --include=dev && npm test && npm run build` |
| Start command       | `npm start`                                         |
| Health check path   | `/api/health`                                       |
| `NODE_VERSION`      | `24.22.1`                                           |
| `NODE_ENV`          | `production`                                        |
| `DATA_DIR`          | `/tmp/knightly-data`                                |

Render supplies `PORT`. Knightly listens on that port at `0.0.0.0`. Do not set a fixed port or install a separate web server. No API keys are required for public-game imports.

## Troubleshooting

- **Repository empty or `render.yaml` not found:** the code has not reached GitHub `main`, or Render has selected another branch. Finish the push before deploying.
- **Cannot find Vite during build:** use the build command above; it explicitly installs build dependencies even when `NODE_ENV=production`.
- **Health check fails:** inspect the service logs. Confirm the start command is `npm start` and the build completed successfully.
- **Import fails:** verify the username/platform, then inspect the error. Chess.com/Lichess can return rate limits or access denials. Do not disable TLS verification or enter player passwords.
- **Stockfish fails or service runs out of memory:** check the logs, wait for active reviews to finish, and try one review. Additional engine capacity may need a larger plan; review cost before upgrading.
- **Report disappears:** this is expected with temporary free-plan storage. Import again, or configure a persistent disk as described above.

## Local deployment check

```sh
npm ci --include=dev
npm test
npm run build
npm run test:production
```

The production smoke test launches the built server on an available port with a temporary data directory. It checks static assets, API responses, a real Stockfish review, and persisted report restoration after a restart. It does not create a Render service or claim that live external imports work.
