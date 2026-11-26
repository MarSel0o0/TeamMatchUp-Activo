# TeamMatchUp — Frontend

Web interface of the platform that matches players by **rank** and **schedule** for League of
Legends, Rainbow Six Siege and Counter-Strike 2.

This folder contains the interface. By default it talks to the Express server in `backend/`; with
`VITE_USE_MOCK_API=true` it works completely against a simulated backend in the browser, without
touching the components. In production it does not run separately: `npm run build:ui` (from
`backend/`) builds it and the server delivers it on the same port as the API (see the root
README).

## Getting started

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Available scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compiles TypeScript and builds the production bundle in `dist/` |
| `npm run preview` | Serves the generated bundle |
| `npm run typecheck` | Checks types without emitting files |
| `npm run lint` | ESLint over all the code |

### Demo account

With `VITE_USE_MOCK_API=true` the app starts with simulated, fictional data (16 players, linked
accounts, ranks with history, availability and sessions). Without that variable it talks to the
real server.

```
email:     demo@teammatchup.gg
password:  demo1234
```

Simulated data is stored in `localStorage` (`tmu.mock-db.v3`); clearing the site storage returns
everything to the initial state. Everything the platform simulates (rank, matches, verified mark)
is shown with the label "Datos de demostración".

## Implemented views

1. **Landing page** (`/`) — public presentation of the platform.
2. **Sign up and login** (`/login`, `/registro`) — entry point; the rest of the application
   requires a signed-in session.
3. **Home** (`/inicio`) — player summary on entry.
4. **Profile settings** (`/configuracion`) — profile, game account linking (with "Verificar con
   Steam" and "Verificar con Riot Games" when the server has the key) and the weekly availability
   grid (painted by dragging the mouse).
5. **Profile** (`/perfil`) — linked accounts, current rank, rank evolution and match history.
   Switching between games happens **without reloading the page**: only the corresponding query is
   re-run.
6. **Matches** (`/coincidencias`) — recommended players per game, with filters for rank
   difference, shared hours, verification and search by name.
7. **Player card** (`/jugadores/:userId`) — another player's public profile per game, with
   "Proponer" (propose) a session in the shared hours.
8. **Session schedule** (`/agenda`) — weekly calendar where you can publish sessions in concrete
   blocks and join other people's.
9. **Session detail** (`/agenda/:sessionId`) — participants, editing by the organizer, join, leave
   and cancel.
10. **Riot Games verification** (`/verificar/riot`) — temporary summoner icon change to verify a
    Riot ID.
11. **Return from Steam** (`/verificar/steam`) — page outside the protected routes that completes
    CS2 verification on return from Steam.

## Architecture

```
src/
├── app/            Composition: providers, routing, layouts, access control
├── config/         Environment variable reading
├── domain/         Rules of the problem, without React or HTTP
│   ├── types.ts        Shared types (users, accounts, ranks, sessions)
│   ├── games.ts        Game catalog and normalized rank scale
│   ├── availability.ts Time blocks, overlaps and formatting
│   └── matching.ts     Recommendation criteria for mock mode (rank + schedule)
├── services/       Data access
│   ├── apiContract.ts  Contract that every implementation fulfils
│   ├── http/           HTTP client against Express
│   ├── mock/           In-memory simulated backend + seed data
│   └── api.ts          Picks an implementation based on the environment
├── features/       One folder per functional domain
│   ├── auth/           Session, login forms
│   ├── home/           Landing page and home
│   ├── profile/        Profile and settings
│   ├── matches/        Matches and filters
│   ├── players/        Another player's card
│   ├── sessions/       Weekly schedule and session detail
│   ├── steam/          CS2 verification with Steam
│   └── riot/           LoL verification with Riot Games
├── shared/         Reusable components, hooks and utilities
└── styles/         Design tokens and global styles
```

Principles that keep the project scalable:

- **The domain does not depend on the interface.** Adding a fourth game means adding one entry to
  `domain/games.ts`: selectors, tabs, filters and the schedule are generated from that catalog.
- **A single data contract.** Components always import `services/api` and never know whether a
  mock or a server sits behind it.
- **One folder per feature.** Each `feature` groups its pages, components and data hooks, so
  growing means adding folders, not fattening existing files.
- **Lazy loading per route.** Each view ships in its own bundle; the login screen does not
  download the schedule's code.
- **Token-based styles.** No component writes colors by hand: everything comes from
  `styles/tokens.css`.

## Connecting the Express backend

By default the interface talks to the real server. Mock mode is enabled only with
`VITE_USE_MOCK_API=true` (exactly `true`; surrounding whitespace is ignored). Any other value, or
none, leaves it disabled.

```bash
cp .env.example .env
# .env
VITE_API_URL=/api                          # API base (Vite proxy to VITE_PROXY_TARGET)
VITE_USE_MOCK_API=false                    # true: simulated backend in the browser, no network
VITE_PROXY_TARGET=http://localhost:3001    # port from backend/.env
```

The session travels in an `HttpOnly` cookie. The interface only stores the CSRF token
(`tmu.csrf`) to send it in the `X-CSRF-Token` header; it stores no JWT. Server errors arrive as
`{ error: string }`. `services/http/httpApi.ts` uses these routes (all under `/api`, each with its
example in `backend/requests/*.rest`):

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users` | Creates the account (does not start a session) |
| `POST` | `/auth/login` · `/auth/logout` | Starts and ends the session |
| `GET` | `/auth/me` | User of the current session |
| `PATCH` | `/users/me` | Updates the profile |
| `GET` | `/users/:id` | Another player's public profile |
| `GET` · `PUT` | `/users/me/availability` | Reads and replaces the blocks (`{ blocks: string[] }`) |
| `GET` | `/users/:id/availability` | Another player's availability (used by "Proponer") |
| `GET` · `POST` | `/accounts` | Linked accounts (`?user=me` or `?user=<id>`) and link one |
| `DELETE` | `/accounts/:id` | Unlinks an account |
| `POST` | `/accounts/:id/sync` | Resyncs the account (real or simulated data depending on its origin) |
| `GET` | `/users/me/games/:gameId` | Account, rank, recent matches and win rate |
| `GET` | `/users/:id/games/:gameId` | Same for another player (player card) |
| `GET` | `/matches` | Filtered matches (game, distance, hours, verified, search) |
| `GET` · `POST` | `/sessions` | Sessions (`?game=`) and publish one |
| `GET` · `PUT` | `/sessions/:id` | Detail of a session and edit it (organizer only) |
| `POST` | `/sessions/:id/join` · `/leave` | Join or leave |
| `DELETE` | `/sessions/:id` | Cancels the session (organizer only) |
| `GET` | `/steam` | Whether Steam verification is available |
| `POST` | `/steam/start` · `/steam/complete` | Opens the attempt and completes it on return from Steam |
| `GET` | `/riot` | Whether Riot Games verification is available |
| `GET` · `POST` | `/riot/challenges/current` · `/riot/challenges` | Open challenge and open one |
| `POST` | `/riot/challenges/:id/confirm` | Confirms the icon change |

The exact shape of each response is in `src/domain/types.ts` and `src/services/apiContract.ts`.
The simulated backend (`src/services/mock/mockApi.ts`) answers with the same codes and texts as
the server, so it serves as an executable specification of the expected behavior.

## Recommendation criteria

Matches are computed by the server (`backend/src/domain/matching.ts`) and combine two components,
both normalized to 0-100:

- **Rank proximity** (weight 0.55). Each game translates its own scale to a 0-100 value, which
  allows comparing titles with scales of different length. A difference of 25 points zeroes this
  component.
- **Schedule overlap** (weight 0.45). Eight shared weekly hours are considered an ideal overlap.

`frontend/src/domain/matching.ts` applies the same criteria in mock mode.
