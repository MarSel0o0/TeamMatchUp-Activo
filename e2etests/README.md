# TeamMatchUp E2E tests

End-to-end test suite with [Playwright](https://playwright.dev/). It walks through the
application in a real browser, against the real compiled server and its own MongoDB database,
with seven scenarios that run serially:

| Code | Scenario |
| --- | --- |
| E1 | protected route without a session and return to the original route |
| E2 | wrong credentials |
| E3 | protected route with a session and reload |
| E4 | logout |
| C1 | create and list a game session |
| C2 | view and edit, with Back, Forward and reload |
| C3 | delete (= cancel) a game session |

This folder is independent of `frontend/` and `backend/`: it has its own dependencies,
configuration, type checking and lint, and it imports no code from the other two. It reaches the
application only through the browser and the HTTP API.

All commands in this document are run **from the `e2etests/` folder** unless stated otherwise,
and work the same on Linux, macOS and Windows (bash, zsh, PowerShell or `cmd`): no script uses
shell-specific syntax.

## Prerequisites

| What | How to check | How to meet it |
| --- | --- | --- |
| Node.js **22.18 or later** | `node --version` | Install Node 22 LTS (22.18 or later) |
| Local MongoDB running at `127.0.0.1:27017` | that the service is started (see below) | MongoDB service or Docker container (see below) |
| `frontend/` dependencies | — | `npm ci` inside `frontend/` |
| `backend/` dependencies | — | `npm ci` inside `backend/` |
| `e2etests/` dependencies | — | `npm ci` inside `e2etests/` |
| Playwright Chromium | — | `npm run browser:install` inside `e2etests/` |

From the repository root, the first time:

```bash
cd frontend
npm ci
cd ../backend
npm ci
cd ../e2etests
npm ci
npm run browser:install
```

- `npm run browser:install` downloads Chromium into the user's Playwright cache, outside the
  repository. On Linux, if a system library is missing when running the suite, install them with
  `npx playwright install --with-deps chromium` (it asks for administrator permissions).
- MongoDB: any local MongoDB listening on `127.0.0.1:27017` is enough (the same one you use for
  development). If you do not have one, with Docker:
  `docker run -d --name tmu-mongo-e2e -p 127.0.0.1:27017:27017 mongo` (and later
  `docker start tmu-mongo-e2e` to start it again).
- **`backend/.env` is not needed**, nor any variables file: the suite sets everything it needs in
  the process environment. If `backend/.env` or `frontend/.env*` exist, it does not modify them
  and what they say does not change what is tested (see "What it does not touch").

If `frontend/` or `backend/` dependencies are missing, Chromium is not installed or the port is
busy, the suite says so and exits with a non-zero code **before building**. If the `e2etests/`
dependencies are missing, it is npm that fails (something like "playwright: command not found" or
"'playwright' is not recognized"): run `npm ci` in `e2etests/`.

### Optional tool: mongosh

The MongoDB shell (`mongosh`) is **not needed to run the suite**. It is useful for inspecting or
manually deleting the E2E database. To check whether you have it:

```bash
mongosh --version
```

If you use MongoDB in Docker, the container already includes it:
`docker exec -it tmu-mongo-e2e mongosh`.

## Commands

| To | Command |
| --- | --- |
| Run the full suite | `npm test` |
| Run a single scenario | `npm test -- --grep C2` (any code: E1, E2, E3, E4, C1, C2, C3) |
| Run the scenarios in reverse order (C3 → E1) | `npm run test:reverse` |
| Open the report of the last run | `npm run report` |
| Type checking | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests of the suite's own rules (`node:test`) | `npm run test:unit` |

If in some shell `npm test -- --grep C2` runs all seven scenarios instead of one (some PowerShell
versions swallow the `--`), use the equivalent form without `--`:
`npx playwright test --project=chromium --grep C2`.

`npm test` does, in this order:

1. checks, without building or starting anything, the name and location of the E2E database, the
   dependencies, Chromium and that the port is free;
2. builds the interface and the server from the current code;
3. starts the compiled server in production mode at `http://127.0.0.1:3901` with the E2E database
   and waits for it to respond (60 s at most);
4. runs the seven scenarios in Chromium, one at a time;
5. stops the server when finished, also if a scenario fails or if you interrupt with Ctrl+C;
6. exits with code 0 if all pass and another code if any fails.

No automatic retries: a scenario that fails once counts as failed.

### Each run replaces the builds

Each run builds the interface and the server and **replaces any existing builds**:
`frontend/dist/` (interface output), `backend/dist/` (the interface the server serves) and
`backend/out/` (the compiled server). They are the same folders as in the production procedure;
they are not committed and, if you need them as they were, regenerate them with that procedure
(`npm run build:ui` and `npm run build` in `backend/`, see the root README).

> **Warning (known limitation).** Do not run the suite while a local production server, started by
> hand from this same checkout, is running on another port (for example, the production procedure
> on 3001). The suite only checks its own port, does not detect that server and would replace the
> builds it is serving. Stop that server first. The development environment (`npm run dev` for the
> server on 3001 and the interface on 5173) does not have this problem: it does not use the builds
> and the suite can run at the same time.

## E2E database

- The suite uses the **`teammatchup_e2e`** database at `mongodb://127.0.0.1:27017`, distinct from
  the development one (`teammatchup`) and the server's test one (`teammatchup_test`).
- Before building it requires that the name contains "e2e" (case-insensitive), that it does not
  match the configured development or test databases (in the environment or in `backend/.env`)
  and that the location is local (`127.0.0.1` or `localhost`, no `mongodb+srv://`). Otherwise it
  exits with a message saying which rule fails, without showing the location.
- Each scenario creates its own test user through the API (with a unique email and name), and when
  finished, whether it passes or fails, deletes it through the API, which cascades to its game
  accounts and game sessions. **After a full run the database is left with no documents** (the
  `tmu_*` collections may exist, empty).
- Leftovers can remain if you interrupt a run at a bad moment or if a scenario's cleanup fails. In
  that case the report says so ("Falló la limpieza, no el escenario": the cleanup failed, not the
  scenario) with the email and name of the user left behind and the code received. Leftovers do
  not make later runs fail. To remove them, drop the whole E2E database:

  ```bash
  mongosh "mongodb://127.0.0.1:27017/teammatchup_e2e" --eval "db.dropDatabase()"
  ```

  (with Docker: `docker exec tmu-mongo-e2e mongosh "mongodb://127.0.0.1:27017/teammatchup_e2e" --eval "db.dropDatabase()"`).
  If you changed the name with `E2E_MONGODB_DBNAME`, use that name.

## Optional variables

None is required and **none is a secret**. The suite has no variables file of its own.

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_PORT` | `3901` | Port of the system under test (always on `127.0.0.1`) |
| `E2E_MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB location; must be local |
| `E2E_MONGODB_DBNAME` | `teammatchup_e2e` | E2E database name; must contain "e2e" |

How to set them for one run:

- bash or zsh (Linux, macOS): `E2E_PORT=3902 npm test`
- PowerShell (Windows): `$env:E2E_PORT="3902"; npm test` (it stays set in that window until you
  close it or run `Remove-Item Env:E2E_PORT`)
- `cmd` (Windows): `set E2E_PORT=3902` and then `npm test`

## Port

The system under test listens only on `127.0.0.1`, on port **3901** (or `E2E_PORT`), distinct
from the development ones (3001 for the server and 5173 for the interface). If the port is busy,
because of another run of the suite or any other program, the suite exits before building; it
never reuses a server that is already listening.

## Chromium only

The suite only uses the Chromium that Playwright installs. It tests the production build served by
the real server in production mode, and in that mode the session cookie carries the `Secure`
attribute; the suite opens it at `http://127.0.0.1`, without HTTPS, and Chromium accepts and sends
that cookie on `127.0.0.1`, but Firefox and WebKit do not guarantee it. Besides, Chromium is the
team's browser and the fastest to run.

## What it does not touch

- Neither the development database, nor the server's test one, nor the production one: only the
  E2E database.
- Nor the interface's mock mode: it always builds with `VITE_USE_MOCK_API=false` and the API at
  `/api` on the same server, even if `frontend/.env*` says otherwise.
- Nor any external service: it starts the server without Steam, Riot Games or Leetify keys (even
  if `backend/.env` has them) and, while a scenario runs, the browser blocks any request to
  another origin. The suite passes without an Internet connection once everything is installed.
- Nor the variables files (`backend/.env`, `frontend/.env*`): everything is passed through the
  process environment. The session signing secret is generated at random on each run and is not
  written to any file, report or output.
- Nor the code of `frontend/` or `backend/`.

## Report and traces of a failed scenario

- The console shows which scenario failed, at which step and which assertion (with its file and
  line).
- `npm run report` opens the HTML report of the last run (`playwright-report/`). Each failed
  scenario has the error, the screenshot and the trace.
- The trace (`trace.zip`) and the screenshot (`test-failed-1.png`) are also left in
  `test-results/<scenario>/`. To open a trace: `npx playwright show-trace <path to
  trace.zip>`. They are only saved for scenarios that fail.
- There is also a JSON report in `playwright-report-json/report.json`.
- `playwright-report/`, `playwright-report-json/` and `test-results/` are not committed (they are
  in `.gitignore`); each run replaces them.

## Duration

Measured on 2026-11-22 on a Linux development machine (Node 22.20.0, MongoDB 9.0.8 in Docker),
with dependencies and Chromium already installed: **about 30 seconds** per full run, including
building the interface and the server (three consecutive runs: 29.1 s, 27.2 s and 26.5 s). A
single scenario takes between 10 and 15 seconds, mostly building.

## Platforms

| Platform | Actually run? | Date | Result |
| --- | --- | --- | --- |
| Linux (Arch, Node 22.20.0) | Yes | 2026-11-22 | 7 passed, also in reverse order |
| macOS or Windows | **Pending** | — | Needs a team member to run it |

As of today the suite has **only actually been run on Linux**. On macOS and Windows the rule of
using no shell-specific syntax has only been checked by reading the scripts.

**For whoever runs it on macOS or Windows** (ideally someone who did not write the suite,
following only this README):

1. Meet the prerequisites (Node, MongoDB, `npm ci` in the three folders and
   `npm run browser:install`).
2. From `e2etests/`, run and save the result of:
   - `node --version`
   - `npm run test:unit`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` (note the last line, for example `7 passed (30.0s)`, and whether it ended without
     error)
   - `npm run test:reverse`
3. Check that, when finished, nothing is listening on port 3901 (on macOS: `lsof -i :3901` shows
   nothing; on Windows PowerShell: `Get-NetTCPConnection -LocalPort 3901` errors that there is
   none).
4. Note the platform (system and version, shell used), the date, the outputs above and any step
   of this README that did not work as written, and report it to the team.
