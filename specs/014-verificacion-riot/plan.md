# Plan 014 — Verificación de cuentas de League of Legends con Riot ID
Estado: aprobado (2026-11-19), con O-1 a O-5 confirmadas.

Spec: `specs/014-verificacion-riot/spec.md` (aprobada el 2026-11-18 tras clarificación D1–D104,
sin dudas abiertas; el choque de RF-36 con el principio 6 de la constitución fue aceptado
explícitamente por el usuario). Base: código de las specs 001–009, 012 (implementada y validada) y
013 (implementación backend y frontend en la misma rama). Rama: `feature/vinculacion-steam-riot`.

La spec 012 dejó el modelo base (`verification`, `profile`, `handleKey`, `blockOrigins`),
`verifyAccount` y las resincronizaciones reales; la 013 añadió el patrón de integración opcional
(`Config.steam`, `AppOptions.steamIntegration`, `/api/steam`, `SteamVerifyButton`,
`SteamProfileBlock`, `syncCooldown(null)`). Esta spec añade la **verificación de LoL mediante
ícono de invocador** contra la API de Riot Games, con desafíos persistentes en MongoDB, limitador
propio en ventanas deslizantes (20/s y 100/2 min), bloqueo por usuario en memoria, lectura real de
rango Solo/Dúo, partidas y perfil con manejo de bloques pendientes y cuentas sin clasificar, y la
interfaz completa. **Sin dependencias nuevas (RNF-5)**: Node 22 provee `fetch`, `AbortSignal.any`,
`node:crypto` (`randomInt`), y el navegador carga directamente los íconos desde Data Dragon.

---

## 0. Estado real del código (comprobado el 2026-11-19)

- `backend/src/models/gameAccount.ts`:
  - `currentRank` es `required: true` (no admite cuentas sin clasificar ni con rango pendiente).
  - `MatchRecordFields.rankDelta` es `required: true` (no admite partidas sin variación `"—"`).
  - `AccountProfileFields` ya define `level?: number` e `iconId?: number`, y `toProfileJson` ya los
    expone en lista blanca.
  - `toGameAccountJson` deriva `verified` y `origins` con `blockOrigins(verification)`; para
    `source: "riot"`, `SOURCE_BLOCKS.riot` ya devuelve `["identity", "rank", "matches", "profile"]`.
  - No existen aún `pendingBlocks`, `lastSuccessfulSyncAt` ni el estado interno de última lectura
    completa (`riotLpBaseline`) para RF-30.
- `backend/src/domain/rankScale.ts`:
  - `normalizeRank("lol", tier, division)` ya devuelve `0` para tiers fuera de la escala, ignora la
    división en `Master`/`Grandmaster`/`Challenger` y asigna la división más baja (`IV`) ante una
    división desconocida (DP-26; coincide con RF-36 y D96).
- `backend/src/services/verifyAccount.ts`:
  - Resuelve exclusividad por `{ gameId, "verification.externalId" }`, convierte la cuenta manual
    propia o crea una nueva, y borra las cuentas manuales de otros con el mismo `handleKey`
    (`unlinkUnverifiedElsewhere`), pero aún no anula desafíos de Riot abiertos de esos usuarios
    (RF-29, D89) ni soporta bloques pendientes / rango ausente al verificar.
- `backend/src/services/realSources.ts` y `backend/src/controllers/accounts.ts`:
  - `readWithTimeout` aplica un único plazo de 8 s a toda `source.read(...)`, insuficiente para
    Riot (hasta 24 consultas, 8 s por consulta según RNF-6 y 60 s total según RNF-7).
  - `POST /api/accounts/:id/sync` comprueba hoy `syncCooldown` antes de mirar si hay fuente; en
    Riot (RF-51), `503 sin clave` va **antes** del `429 espera mínima`.
  - `backend/tests/controllers/accountRealSync.test.ts` (spec 012) inyecta `sources: { lol: riot }`
    sin `riotIntegration`: se debe preservar ese camino genérico cuando `riotIntegration` no esté
    presente y `sources.lol` sí lo esté.
- `backend/src/controllers/matches.ts` y `backend/src/services/matchInputs.ts`:
  - Asumen que toda cuenta tiene `currentRank` no nulo; aún no devuelven 409 cuando el usuario de
    LoL está sin clasificar o con rango pendiente (RF-33, RF-44) ni excluyen candidatos sin rango
    (RF-13, RF-44).
- `backend/src/controllers/users.ts`:
  - `DELETE /api/users/:id` ejecuta la cascada C1–C5 (`GameAccount`, `User`, `GameAccount`,
    `PlaySession`, `SteamAttempt`); falta **C6** (`RiotChallenge`).
  - `gameSummaryJson` asume `account.currentRank` no nulo y `rankDelta` siempre numérico.
- `backend/src/utils/config.ts`, `app.ts`, `server.ts`, `index.ts`, `.env.example`:
  - `Config` tiene `steam: SteamConfig | null`; falta `riot: RiotConfig | null` (solo `apiKey`,
    opcional y comentada en `.env.example`, sin `PUBLIC_URL`).
- Frontend:
  - `frontend/src/domain/origins.ts`: `verifiedLabel('riot')` dice hoy `'Verificada con Riot'`;
    RF-40/D75 exigen **`'Verificada con Riot Games'`**.
  - `frontend/src/services/http/transport.ts`: `REQUEST_TIMEOUT_MS = 30_000` (30 s); las
    operaciones de Riot pueden tardar hasta 60 s (RNF-7), así que necesitan un plazo mayor opcional
    sin alterar los 30 s del resto de la aplicación.
  - `frontend/src/features/profile/components/MatchLedger.tsx`: hoy muestra `timeAgo(match.playedAt)`
    y asume `rankDelta` numérico; RF-12 pide fecha `dd/mm/aaaa` en la zona horaria del navegador y
    `—` cuando `rankDelta` falta.
  - `frontend/src/features/profile/components/AccountRow.tsx`, `GameSummaryPanel.tsx` y
    `LinkAccountForm.tsx`: ya tienen los puntos de enganche de la 013 (`SteamProfileBlock`,
    `SteamVerifyButton`, `aboveCs2`, `STEAM_RESYNC_NOTE`), replicables para Riot.

---

## 1. Arquitectura general y comunicación con Riot Games

### 1.1 Flujo de verificación por ícono
```
Navegador (App)                        TeamMatchUp (API)                           Riot Games API
  │ GET /api/riot ────────────────────▶ { available: boolean }
  │ GET /api/riot/challenges/current ─▶ { challenge | null }  (sin Riot, sin clave)
  │
  │ POST /api/riot/challenges ────────▶ valida formato, lock, 409/429, clave, reserva(2)
  │   { riotId, region }                ├─ Account-v1 by-riot-id ─────────────────▶ { puuid, gameName, tagLine }
  │                                     ├─ Summoner-v4 by-puuid (plataforma) ─────▶ { profileIconId, summonerLevel }
  │                                     ├─ 409 puuid verificado / 429 sin íconos
  │                                     └─ guarda RiotChallenge (anula abierto previo)
  │ ◀── 201 { id, iconId, expiresAt, remainingSeconds, riotId, region }
  │
  │ (El navegador carga el ícono directo desde Data Dragon CDN — no pasa por API ni cuenta en RF-37)
  │
  │ POST /api/riot/challenges/:id/confirm ─▶ valida 404/409/lock/429/400/409/clave, reserva(24)
  │                                     ├─ cuenta intento (+1)
  │                                     ├─ Summoner-v4 by-puuid ──────────────────▶ comprueba profileIconId + nivel
  │                                     ├─ 409 otro verificó (D91)
  │                                     ├─ Account-v1 by-puuid ───────────────────▶ Riot ID vigente (o fallback D82)
  │                                     ├─ League-v4 entries/by-puuid ────────────▶ Solo/Dúo (o sin clasificar)
  │                                     ├─ Match-v5 ids (queue=420, count=20) ────▶ hasta 20 matchIds
  │                                     ├─ Match-v5 matches/:id (× hasta 20) ─────▶ partidas (descarta remakes)
  │                                     ├─ paso 3 RF-26: ¿anulado entretanto? ────▶ 400 RF-9 si se anuló (D104)
  │                                     └─ verifyAccount + cierra desafío + libera reserva sobrante
  │ ◀── 200 { outcome: "verified", account, notice? } ──▶ navega a /perfil con aviso
```

### 1.2 Enrutamiento y endpoints de Riot Games API
Toda llamada al servidor de Riot lleva la cabecera `X-Riot-Token: <RIOT_API_KEY>` (nunca en la URL)
y usa `Accept: application/json`.

- **Tabla fija de plataformas (Definiciones, D4) y enrutamiento regional (Account-v1 / Match-v5):**

| Región (spec 004) | Plataforma (Summoner-v4, League-v4) | Enrutamiento regional (Account-v1, Match-v5) |
|---|---|---|
| `LAS` | `la2` (`la2.api.riotgames.com`) | `americas` (`americas.api.riotgames.com`) |
| `LAN` | `la1` (`la1.api.riotgames.com`) | `americas` (`americas.api.riotgames.com`) |
| `NA` | `na1` (`na1.api.riotgames.com`) | `americas` (`americas.api.riotgames.com`) |
| `BR` | `br1` (`br1.api.riotgames.com`) | `americas` (`americas.api.riotgames.com`) |
| `EUW` | `euw1` (`euw1.api.riotgames.com`) | `europe` (`europe.api.riotgames.com`) |
| `EUNE` | `eun1` (`eun1.api.riotgames.com`) | `europe` (`europe.api.riotgames.com`) |
| `KR` | `kr` (`kr.api.riotgames.com`) | `asia` (`asia.api.riotgames.com`) |

- **Consultas exactas por operación (cuadran al dígito con D84 y RNF-1):**
  1. **Pedir desafío (reserva = 2):**
     - `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` (enrutamiento regional)
     - `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` (plataforma)
  2. **Confirmar desafío (reserva = 24):**
     - `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` (1)
     - Si el ícono coincide y pasa RF-24:
       - `GET /riot/account/v1/accounts/by-puuid/{puuid}` (1)
       - `GET /lol/league/v4/entries/by-puuid/{puuid}` (1)
       - `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&start=0&count=20` (1)
       - `GET /lol/match/v5/matches/{matchId}` (hasta 20)
     - Verificación completa en el peor caso (1 pedido + 9 confirmaciones fallidas + 1 exitosa):
       `2 + 9×1 + 24 = 35` consultas (RNF-1).
  3. **Resincronizar cuenta verificada con Riot (reserva = 24):**
     - `GET /riot/account/v1/accounts/by-puuid/{puuid}` (1)
     - `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` (1)
     - `GET /lol/league/v4/entries/by-puuid/{puuid}` (1)
     - `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&start=0&count=20` (1)
     - `GET /lol/match/v5/matches/{matchId}` (hasta 20)

---

## 2. Archivos y responsabilidades

### 2.1 Backend — dominio puro (`backend/src/domain/`)
Todos los archivos siguen `domainIsolation.test.ts`: solo importan de `domain/`, sin Express,
Mongoose, `fetch`, `process.env`, `Math.random`, `setTimeout`, `Date.now()` ni `new Date()`. El
instante (`now`) y el generador de índice aleatorio (`pickIndex`) llegan siempre como parámetros.

| Archivo | Responsabilidad | RF / RNF |
|---|---|---|
| `domain/riotRules.ts` (nuevo) | `RIOT_ERRORS` y `RIOT_NOTICES` (todos los literales exactos en español de RF-3, RF-5, RF-6, RF-8, RF-9, RF-10, RF-16, RF-18, RF-20, RF-21, RF-23, RF-24, RF-25, RF-27, RF-33, RF-35, RF-37, RF-38, RF-43, RF-48, RF-49, RF-50, RF-53); `RIOT_PLATFORMS` y `RIOT_ROUTING` (tabla fija D4); `validateRiotId(raw)` (recorte, 3–16 UTF-16 sin `#`/LF/CR/U+2028/U+2029, tag 3–5 ASCII alfanuméricos); `validateChallengeRequest(body)` (orden Riot ID → región); `formatWaitMinutes(ms)` (redondeo hacia arriba, singular `"1 minuto"`) | RF-3, RF-18, RF-20, RF-21, RF-22, RF-23, RF-27, RF-33, RF-35, RF-37, RF-43, RF-48, RF-49, RF-53 |
| `domain/riotChallenge.ts` (nuevo) | `STARTER_ICON_IDS` (0..28); `CHALLENGE_TTL_MS = 10 min`; `CHALLENGE_RETENTION_MS = 24 h`; `CHALLENGE_HOURLY_LIMIT = 5`; `CHALLENGE_HOURLY_WINDOW_MS = 1 h`; `MAX_CONFIRM_ATTEMPTS = 10`; `challengeExpiry(now)`; `challengeDeleteAt(closedOrExpiredAt)`; `remainingSeconds(expiresAt, now)`; `isChallengeExpired(expiresAt, now)` (`now >= expiresAt`); `availableStarterIcons(excluded)`; `pickStarterIcon(available, pickIndex)`; `hourlyRateLimitWait(createdDates, now)` (espera para el 6.º); `noFreeIconsWait(openExpiresAt, now)`; `challengeConfirmNotice(pendingBlocks)` (elige el aviso de RF-7 vs los dos de RF-27) | RF-1, RF-4, RF-7, RF-9, RF-10, RF-19, RF-21, RF-27, RF-28, RF-43, RF-45 |
| `domain/riotData.ts` (nuevo) | Parseo y validación estricta de datos de Riot: `parseRiotAccount(raw)` (`puuid`, `gameName`, `tagLine` → `riotId`); `parseRiotSummoner(raw)` (separa validación de `profileIconId` de `summonerLevel` para D92/D94); `parseRiotSoloRank(entries, now)` (busca `RANKED_SOLO_5x5`, valida LP enteros `≥ 0` sin tope, guarda `tier` y `division` crudos omitiendo división en `MASTER`/`GRANDMASTER`/`CHALLENGER`, calcula `canonicalTier` y `normalized` con `normalizeRank`, o devuelve `{ kind: "unranked" }`); `roundDurationMinutes(seconds)` (`Math.floor((s + 30) / 60)`, D35); `isRemakeMatch(durationSeconds, earlySurrender, endOfGameResult)`; `parseRiotMatch(raw, puuid)` (devuelve `{ kind: "remake" } \| { kind: "invalid" } \| { kind: "match", match }`) | RF-11, RF-12, RF-13, RF-31, RF-34, RF-36, RF-52 |
| `domain/riotLpDelta.ts` (nuevo) | Lógica pura de RF-30: tipos `RiotLpBaseline`, `RiotMatchRecord` (`rankDelta?: number`); `sameRankBracket(a, b)` (mismo tier y misma división, o mismo tier en `MASTER`/`GRANDMASTER`/`CHALLENGER`); `applyRiotReading(...)`: calcula variaciones de LP cuando la lectura actual es completa de rango y partidas (0 omitidas) y existe `baseline` previo, conserva inmutables las variaciones ya asignadas, permite asignar a partidas que quedaron con `"—"` en lecturas no completas (D81, D102), actualiza historial según RF-32 (sin añadir punto al pasar a sin clasificar ni al volver al mismo rango del último punto, D52), y fusiona partidas (máx. 20 ordenadas como RF-28 de la 004) | RF-11, RF-12, RF-30, RF-32 |
| `domain/riotRateLimiter.ts` (nuevo) | Estado puro del limitador en ventanas deslizantes (sin timers ni reloj real): `RATE_LIMIT_2MIN = 100`, `WINDOW_2MIN_MS = 120_000`, `RATE_LIMIT_1SEC = 20`, `WINDOW_1SEC_MS = 1_000`, `RESERVE_CREATE = 2`, `RESERVE_CONFIRM = 24`, `RESERVE_SYNC = 24`; funciones puras `pruneWindow(timestamps, windowMs, nowMs)`, `canReserve(state, count, nowMs)`, `nextSlotWaitMs(timestamps1s, nowMs)` (devuelve `0` si hay hueco en el último segundo, o `ms` hasta que salga el más antiguo, siempre `< 1000` ms) | RF-37, RNF-1 |
| `domain/accountState.ts` | Aceptar `rankDelta?: number` en `AccountMatch` / `AccountState` (o subtipo) y `currentRank: Snapshot \| null` en `trend(current, history)` (devuelve `0` si `current === null`) sin romper ningún tipo ni prueba de 004/012 | RF-12, RF-13, RF-27, RF-30 |
| `domain/verification.ts` | Permitir `rankDelta?: number` en `RealMatch` y soportar `rank?: Snapshot \| null` (o dejar `verifiedState`/`applyRealSync` para fuentes genéricas 012/013 y usar `applyRiotReading` para Riot) | RF-13, RF-27, RF-30 |
| `domain/matching.ts` | En `RankedAccount`: `currentRank: { normalized: number } \| null`; `buildMatches` filtra candidatos con `candidate.account.currentRank !== null` (defensa en profundidad para RF-13 y RF-44) | RF-13, RF-44 |

### 2.2 Backend — modelos, servicios, controladores y configuración (`backend/src/`)

| Archivo | Responsabilidad | RF / RNF |
|---|---|---|
| `models/riotChallenge.ts` (nuevo) | Esquema `RiotChallenge`: `user`, `puuid`, `riotId`, `region`, `iconId`, `status` (`"open" \| "completed" \| "cancelled"`), `attempts`, `createdAt`, `expiresAt`, `deleteAt`. Índices: `{ user: 1, createdAt: -1 }`, `{ puuid: 1, status: 1, expiresAt: 1 }`, `{ deleteAt: 1 }` TTL (`expireAfterSeconds: 0`). Serializador en lista blanca `toRiotChallengeJson(doc, now)` que **nunca** incluye `puuid` (RNF-3) | RF-1, RF-21, RF-28, RF-45, RNF-3 |
| `models/gameAccount.ts` | `currentRank` opcional/`null` (`required: false`, default `null` solo para cuentas Riot sin rango); `RankSnapshotFields.canonicalTier?: string` (interno, guardado en MongoDB, no expuesto en JSON para no romper 004/012); `MatchRecordFields.rankDelta?: number` (opcional, omitido en JSON si falta); `pendingBlocks?: PendingBlock[]` (`"rank" \| "matches" \| "profile"`, expuesto en `toGameAccountJson` solo si no está vacío); `lastSuccessfulSyncAt?: Date \| null` (interno, para espera mínima RF-7/RF-27/RF-53); `riotLpBaseline?: RiotLpBaselineFields` (interno, nunca sale en JSON) | RF-7, RF-12, RF-13, RF-27, RF-30, RF-31, RF-36, RF-53, RNF-3 |
| `services/riotLimiter.ts` (nuevo) | Envoltorio asíncrono del limitador puro (`createRiotLimiter({ nowMs, sleep })`): `reserve(count)` → `RiotReservation \| null`, `acquire(reservation, signal)` (espacia a 20/s respetando `AbortSignal`), `release(reservation)` (libera sobrantes en `finally`). Instanciado por `createApp` | RF-37, RNF-1, RNF-7 |
| `services/riotUserLock.ts` (nuevo) | Bloqueo por usuario en memoria (`createRiotUserLock()`): `tryAcquire(userId): boolean` y `release(userId)` con `Set<string>` por instancia de `createApp`. Se pierde al reiniciar (D63). Compartido entre `/api/riot` y `/api/accounts/:id/sync` | RF-25, RF-28, RF-49, RF-51 |
| `services/riotClient.ts` (nuevo) | Única pieza con red y con `RIOT_API_KEY`: `createRiotClient({ apiKey, fetchFn = fetch })`. Envía `X-Riot-Token` por cabecera, nunca registra URLs, cabeceras ni errores con la clave (RNF-4). Métodos: `getAccountByRiotId(riotId, region, signal)`, `getAccountByPuuid(puuid, region, signal)`, `getSummonerByPuuid(puuid, region, signal)`, `getSoloRankByPuuid(puuid, region, signal)`, `getSoloMatchIds(puuid, region, signal)`, `getMatchById(matchId, region, signal)`. Cada uno devuelve resultado discriminado (`ok \| not_found \| unavailable \| invalid_data`) y aplica el plazo individual de 8 s combinado con la señal global de 60 s (`AbortSignal.any`) | RF-3, RF-11, RF-16, RF-35, RF-50, RF-52, RNF-2, RNF-4, RNF-6, RNF-7 |
| `services/riotChallenges.ts` (nuevo) | Acceso a datos de `RiotChallenge`: `findOpenChallenge(userId, now)`, `findChallengeByIdForUser(id, userId)`, `countRecentChallenges(userId, now)` (última hora), `openChallengesForPuuid(puuid, now)`, `createChallengeAndCancelPrevious(...)`, `incrementChallengeAttempts(id)`, `cancelChallenge(id, at)`, `cancelOpenChallengesForUsers(userIds, at)` (RF-29), `completeChallenge(id, at)` (atómico condicional sobre `status: "open"` para D104) | RF-1, RF-4, RF-10, RF-19, RF-21, RF-23, RF-24, RF-28, RF-29, RF-43, RF-45, RF-48 |
| `services/riotSync.ts` (nuevo) | Orquestación de lecturas completas de Riot (usada al confirmar y al resincronizar): `readRiotAccountData(...)` (ejecuta las consultas dentro del presupuesto reservado, respetando 8 s/consulta y 60 s total, aplicando D82/D83/D94/D95/D98) y `syncRiotAccount(...)` (flujo completo de RF-51/RF-53/RF-14/RF-30/RF-35, incluyendo `unlinkUnverifiedElsewhere` + anulación de desafíos si cambió el Riot ID) | RF-7, RF-11, RF-14, RF-27, RF-30, RF-32, RF-35, RF-50, RF-51, RF-52, RF-53, RNF-6, RNF-7 |
| `services/verifyAccount.ts` | Ampliar `VerifyInput` para soportar datos Riot (rango `null`, `pendingBlocks`, `lastSuccessfulSyncAt`, `riotLpBaseline`, partidas con `rankDelta?: number`) y actualizar `unlinkUnverifiedElsewhere(account, now)` para que, si `gameId === "lol"`, devuelva los `userId` desvinculados y llame a `cancelOpenChallengesForUsers` (RF-29, D89). Exportar `unlinkUnverifiedElsewhere` para reutilizarlo en RF-14 | RF-7, RF-14, RF-27, RF-29 |
| `controllers/riot.ts` (nuevo) | `createRiotRouter({ jwtSecret, now, riot?, userLock, sourceTimeoutMs, operationTimeoutMs })`: `GET /` (RF-38), `GET /challenges/current` (RF-45), `POST /challenges` (RF-1, RF-3 a RF-6, RF-18 a RF-22, RF-37, RF-38, RF-43, RF-49), `POST /challenges/:id/confirm` (RF-7 a RF-11, RF-16, RF-23 a RF-27, RF-37, RF-38, RF-48, RF-50, RF-52). Todas protegidas con `withUser` | RF-1 a RF-11, RF-16, RF-18 a RF-27, RF-37, RF-38, RF-43, RF-45, RF-48 a RF-50, RF-52, RNF-1, RNF-3, RNF-6, RNF-7 |
| `controllers/accounts.ts` | (1) Al vincular (`POST /`), editar región (`PUT /:id`) o desvincular (`DELETE /:id`) una cuenta manual de `lol`, llama a `cancelOpenChallengesForUsers([sessionUserId], at)` (RF-29, D59). (2) En `POST /:id/sync`, para cuentas verificadas con `"riot"`: si `riotIntegration` existe delega en `syncRiotAccount` (orden RF-51); si no existe y `sources.lol?.id === "riot"` mantiene el camino de pruebas de la spec 012; si no hay ni uno ni otro responde 503 antes del 429 (RF-51/RF-38). (3) Recibe `riotIntegration`, `riotUserLock`, `operationTimeoutMs` | RF-14, RF-29, RF-35, RF-38, RF-49, RF-51, RF-53 |
| `controllers/users.ts` | (1) Cascada **C6** en `DELETE /:id`: `await RiotChallenge.deleteMany({ user: sessionUserId })` tras C5 (RF-29). (2) `gameSummaryJson`: omite `rankDelta` cuando es `undefined` (RF-12) y pasa `account.currentRank ?? null` a `trend` (RF-13, RF-27) | RF-12, RF-13, RF-27, RF-29 |
| `services/matchInputs.ts` y `controllers/matches.ts` | En `loadMatchInputs`: si `gameId === "lol"` y `own.currentRank == null` devuelve `{ kind: "unranked" }` → `controllers/matches.ts` responde `409 "necesitas rango en Solo/Dúo para buscar en LoL"` (después de los 400 de filtros y sin depender de clave, RF-33, RF-44, D57, D61); filtra candidatos con `currentRank != null` (RF-13, RF-44) | RF-13, RF-33, RF-44 |
| `utils/config.ts`, `app.ts`, `server.ts`, `index.ts`, `.env.example` | `Config.riot: { apiKey: string } \| null` desde `RIOT_API_KEY` opcional (comentada en `.env.example`, nunca en errores/logs, RF-17, RF-38, RNF-4). `AppOptions.riotIntegration?: RiotIntegration` y `operationTimeoutMs?: number` (60 000 ms). `createApp` crea el `riotUserLock` y el `riotLimiter` por instancia y monta `/api/riot`. `prepareDatabase()` añade `await RiotChallenge.init()`. `index.ts` construye `riotIntegration` si `config.riot !== null` | RF-17, RF-28, RF-37, RF-38, RF-49, RNF-4, RNF-7 |
| `backend/requests/riot.rest` (nuevo) | Pruebas manuales de `GET /api/riot`, `GET /api/riot/challenges/current`, `POST /api/riot/challenges` y `POST /api/riot/challenges/:id/confirm` | — |

### 2.3 Frontend (`frontend/src/`)

| Archivo | Responsabilidad | RF / RNF |
|---|---|---|
| `domain/types.ts` | `GameAccount`: `currentRank: RankSnapshot \| null`, `pendingBlocks?: ('rank' \| 'matches' \| 'profile')[]`; `MatchRecord`: `rankDelta?: number`; tipos nuevos `RiotChallenge` (`id`, `iconId`, `expiresAt`, `remainingSeconds`, `riotId`, `region`) y `RiotConfirmResult` (`{ outcome: 'verified'; account: GameAccount; notice?: string }`) | RF-1, RF-7, RF-12, RF-13, RF-27, RF-45 |
| `domain/origins.ts` | Actualizar `verifiedLabel('riot')` de `'Verificada con Riot'` a **`'Verificada con Riot Games'`** (RF-40, D75) | RF-40 |
| `domain/riotDisplay.ts` (nuevo) | Funciones puras (sin React, HTTP ni reloj): `formatCountdown(seconds)` (`mm:ss`, clamp `≥ 0`); `formatMatchDate(isoDate)` (`dd/mm/aaaa` en zona local); `formatMatchDelta(delta)` (`+18`, `−15` o `'—'`); `ddragonIconUrl(version, iconId)`; `isBlockPending(account, block)`; `isChallengeTerminalError(status, message)` (distingue errores que anulan/cierran el desafío en pantalla — 429 RF-10, 409 RF-24/RF-48, 404 RF-50/RF-23, 400 RF-9 — de errores recuperables — 400 RF-8, 409 RF-25, 503) | RF-2, RF-8, RF-9, RF-10, RF-12, RF-24, RF-25, RF-27, RF-40, RF-50 |
| `services/ddragon.ts` (nuevo) | Único módulo del frontend que lee `https://ddragon.leagueoflegends.com/api/versions.json` (cacheado en memoria por sesión, con plazo corto y versión de respaldo si no responde); expone `getDdragonVersion(): Promise<string>`. Respeta el principio 3 de la constitución (ningún componente llama a `fetch`) y D93 (navegador directo, sin pasar por el servidor de TeamMatchUp) | RF-2, RF-40, RNF-1 |
| `services/http/transport.ts`, `services/http/httpClient.ts` | `ExecuteOptions.timeoutMs?: number` y `RequestOptions.timeoutMs?: number` (por defecto `REQUEST_TIMEOUT_MS = 30_000`; no altera nada existente). Permite pasar `65_000` en las llamadas de Riot que pueden durar hasta 60 s (RNF-7) | RNF-7 |
| `services/apiContract.ts`, `services/http/httpApi.ts`, `services/mock/mockApi.ts` | Grupo `riot`: `status()`, `currentChallenge()`, `createChallenge(payload)` (`timeoutMs: 65_000`), `confirmChallenge(id)` (`timeoutMs: 65_000`). En `profile.syncAccount`: devuelve `GameAccount & { syncNotice?: string }` con `timeoutMs: 65_000`. En `mockApi.riot`: `status` → `{ available: false }`, el resto rechaza con `"No disponible en modo de demostración"`, nunca simula verificación ni datos Riot (RF-42) | RF-1, RF-7, RF-38, RF-42, RF-45, RF-53, RNF-7 |
| `app/providers/queryKeys.ts`, `app/routes.ts`, `app/router.tsx` | Claves `riotStatus(userId)`, `riotChallenge(userId)` y `ddragonVersion`. Ruta protegida `ROUTES.riotVerify = '/verificar/riot'` dentro de `ProtectedRoute` + `AppLayout` y en `PROTECTED_PATHS` | RF-2, RF-38, RF-45, RF-46 |
| `shared/utils/copy.ts` | Literales exactos de la spec 014: `RIOT_VERIFY_LABEL` (`'Verificar con Riot Games'`), `RIOT_RESYNC_NOTE`, `RIOT_PENDING_LABEL` (`'Datos pendientes de Riot Games'`), `RIOT_UNRANKED_LABEL` (`'sin clasificar'`), `RIOT_VERIFIED_NOTICE` (`'Cuenta de Riot verificada'`), `RIOT_CHALLENGE_STEPS`, `RIOT_CONFIRM_BUTTON` (`'Ya puse el ícono'`), `RIOT_RETRY_CHALLENGE_BUTTON` (`'Pedir otro desafío'`), `RIOT_BACK_BUTTON` (`'Volver'`), `RIOT_CHALLENGE_EXPIRED_TITLE` (`'El desafío venció'`), `riotIconFallbackText(id)` (`'Ícono n.º <id>'`) | RF-2, RF-7, RF-13, RF-27, RF-39, RF-40, RF-41, RF-42, RF-53 |
| `features/riot/hooks.ts` (nuevo) | `useRiotAvailability()`, `useCurrentRiotChallenge()`, `useCreateRiotChallenge()`, `useConfirmRiotChallenge()` (invalida `accounts`, `gameSummary('lol')`, `allMatches`), `useDdragonVersion()` | RF-1, RF-7, RF-38, RF-45, RF-54 |
| `features/riot/notice.ts` (nuevo) | Lectura tipada de `location.state.riotNotice` (análogo a `features/steam/notice.ts`) | RF-7, RF-27 |
| `features/riot/components/RiotVerifyButton.tsx` (nuevo) | Botón `"Verificar con Riot Games"`: en modo simulado desactivado con `"No disponible en modo de demostración"` (RF-42); sin clave o cargando oculto (RF-38); disponible → navega a `/verificar/riot` con `state: { from: pathname }` | RF-38, RF-39, RF-42 |
| `features/riot/components/RiotProfileBlock.tsx` (nuevo) | Bloque de perfil de Riot en `AccountRow`: ícono desde Data Dragon (si `onError`, no muestra nada en su lugar — D50), nivel (`Nivel N`) o `"Datos pendientes de Riot Games"` si `profile` está pendiente (manteniendo el ícono si existe `iconId` — D92), y `OriginTag` (`"Datos de Riot Games"`) | RF-27, RF-40 |
| `features/riot/pages/RiotVerifyPage.tsx` (nuevo) + CSS | Página `/verificar/riot`: consulta `useCurrentRiotChallenge()` al montar/recargar (RF-45). Si ya tiene LoL verificada redirige a `/perfil`. Si hay desafío abierto muestra `RiotChallengeView` (RF-2, RF-46, D103); si no, muestra `RiotChallengeForm` pre-rellenado con Riot ID y región de la cuenta manual de LoL si existe (RF-46, D101). Maneja cuenta atrás desde `remainingSeconds` (D100), confirmaciones, errores por ubicación (RF-47), estado vencido/anulado (D99), `"Pedir otro desafío"` (RF-54) y `"Volver"` (D99) | RF-2, RF-7, RF-27, RF-45, RF-46, RF-47, RF-54 |
| `features/profile/components/AccountRow.tsx` | Pinta `RiotProfileBlock` si `verifiedWith === 'riot'`; maneja rango pendiente (`"Datos pendientes de Riot Games"`) y sin clasificar (`"sin clasificar"`); ofrece `RiotVerifyButton` si `offerRiotVerify && gameId === 'lol' && !verified`; texto `RIOT_RESYNC_NOTE` junto a `"Resincronizar"` | RF-13, RF-27, RF-39, RF-40, RF-41 |
| `features/profile/components/GameSummaryPanel.tsx` | Prop `offerRiotVerify` y `syncNotice`; muestra `"Datos pendientes de Riot Games"` en bloque de escala y/o partidas si están pendientes (RF-27), `"sin clasificar"` si `verifiedWith === 'riot'` y sin rango (RF-13), aviso de RF-53 tras resincronización parcial | RF-13, RF-27, RF-40, RF-53 |
| `features/profile/components/MatchLedger.tsx` | Prop `pending?: boolean` (muestra `"Datos pendientes de Riot Games"`, RF-27); cuando `origin === 'riot'` formatea fecha como `dd/mm/aaaa` (RF-12, D47); cuando `match.rankDelta === undefined` muestra `—` (RF-12) | RF-12, RF-27 |
| `features/profile/components/LinkAccountForm.tsx` | Prop `aboveLol?: ReactNode` (análogo a `aboveCs2`) para mostrar `RiotVerifyButton` sobre el formulario manual cuando el juego elegido es LoL | RF-39 |
| `features/profile/pages/ProfilePage.tsx`, `SettingsPage.tsx` | Pasan `offerRiotVerify` y `aboveLol={<RiotVerifyButton />}`; `ProfilePage` muestra `riotNotice` (RF-7, RF-27) y ambas muestran `syncNotice` si `syncAccount.data?.syncNotice` (RF-53) | RF-7, RF-27, RF-39, RF-53 |
| `features/matches/pages/MatchesPage.tsx` | Si `matchesQuery.error` es `ApiError` con `status === 409` (RF-33 / RF-44), muestra el aviso con el texto de la API en lugar de la lista (sin el error genérico de red con «Reintentar») | RF-33, RF-44 |

### 2.4 Documentos a actualizar al cerrar la implementación
- `AGENTS.md`: nuevos archivos de dominio, modelo `RiotChallenge`, servicios y rutas `/api/riot`, variable `RIOT_API_KEY`.
- `PRODUCT.md`: actualizar «Evidence on Hand» y «Capabilities» (spec 014, «Impacto»).
- `README.md`: documentar `RIOT_API_KEY` y el procedimiento de renovación manual cada 24 h en `.env` para el servidor del curso (criterio de finalización).
- `MEMORY.md`: estado de la spec 014 al cerrar cada fase.
- `specs/014-verificacion-riot/spec.md`: casillas de criterios de finalización al validar. **Las specs 004, 005, 007, 008, 010 y 012 no se editan** (decisión del 2026-11-18).

---

## 3. Modelo de datos (Mongoose)

### 3.1 Colección nueva: `RiotChallenge` (`models/riotChallenge.ts`)
```ts
export type RiotChallengeStatus = "open" | "completed" | "cancelled";

export interface RiotChallengeFields {
  user: Types.ObjectId;       // ref "User", required
  puuid: string;              // identificador interno de Riot; NUNCA en JSON (RNF-3)
  riotId: string;             // forma devuelta por Riot al pedir el desafío (D86)
  region: string;             // "LAS" | "LAN" | "NA" | "EUW" | "EUNE" | "BR" | "KR"
  iconId: number;             // entero 0..28
  status: RiotChallengeStatus;
  attempts: number;           // confirmaciones contadas, entero >= 0 (máx. 10)
  createdAt: Date;            // para límite de 5 por hora (RF-21)
  expiresAt: Date;            // createdAt + 10 min (RF-9)
  deleteAt: Date;             // para retención de 24 h desde cierre/anulación/vencimiento (RF-28, D87)
}
```
- **Índices** (creados en `prepareDatabase()` con `RiotChallenge.init()`):
  1. `{ user: 1, createdAt: -1 }` — recupera desafío abierto (RF-45), cuenta los creados en la última hora (RF-21) y anula desafíos abiertos del usuario (RF-4, RF-29).
  2. `{ puuid: 1, status: 1, expiresAt: 1 }` — lista desafíos abiertos de la misma cuenta de Riot para exclusión de íconos (RF-19) y cálculo de espera sin íconos libres (RF-43).
  3. `{ deleteAt: 1 }` con `{ expireAfterSeconds: 0 }` — borrado automático por MongoDB 24 h después de vencer, anularse o cerrarse, lo que ocurra primero (RF-28, D87).
- **Retención exacta (D87):**
  - Al crear el desafío en `now`: `expiresAt = now + 10 min`, `deleteAt = expiresAt + 24 h`.
  - Al cerrarse (`completed`) o anularse (`cancelled`) en `at`: si `at < expiresAt`, se actualiza `deleteAt = at + 24 h` (si ya venció antes, `expiresAt + 24 h` es anterior y se conserva).
  - Dado que el monitor TTL de MongoDB corre cada ~60 s, toda comprobación de existencia/vigencia usa `now` en código (`isChallengeExpired`, `createdAt > now - 1 h`), y nunca depende del momento exacto en que MongoDB elimina el documento.
- **Cascada de eliminación de usuario (RF-29):** paso **C6** en `DELETE /api/users/:id`, tras C5 (`SteamAttempt.deleteMany`): `await RiotChallenge.deleteMany({ user: sessionUserId })`.

### 3.2 Extensiones en `GameAccount` (`models/gameAccount.ts`)
- `currentRank`: pasa de `required: true` a opcional (`RankSnapshotFields | null`). Las cuentas simuladas y de Steam siguen teniendo siempre un `RankSnapshotFields`; las cuentas verificadas con Riot pueden tener `null` cuando están **sin clasificar** (RF-13) o con el **bloque de rango pendiente** (RF-27).
- `RankSnapshotSchema`: añade `canonicalTier?: string` (interno: `"Gold"`, `"Grandmaster"`, etc., no expuesto en `toRankSnapshotJson`; guarda el tier normalizado a la escala de la 004 además del `tier` crudo de Riot, RF-36/D48). `points` sigue siendo entero sin `max` (RF-31).
- `MatchRecordSchema`: `rankDelta` pasa de `required: true` a opcional (`rankDelta?: number`). En `gameSummaryJson` se omite la propiedad si es `undefined` (RF-12).
- `pendingBlocks`: `{ type: [String], enum: ["rank", "matches", "profile"], default: undefined }` — ausente o vacío cuando no hay pendientes; nunca incluye `"identity"` (D82). En `toGameAccountJson` solo se serializa cuando tiene al menos 1 elemento (así las cuentas de 004, 012 y 013 conservan exactamente su JSON actual).
- `lastSuccessfulSyncAt`: `{ type: Date, default: undefined }` (interno, `Date | null`, nunca sale en JSON). Se fija en `now` solo tras verificación completa (rango, partidas y perfil leídos, RF-7/D82) o resincronización completa (RF-51). En verificación parcial (RF-27) queda `null`; en resincronización parcial (RF-53) no se modifica.
- `riotLpBaseline`: subdocumento interno (nunca sale en JSON) con `{ tier: String (o null), division?: String, points?: Number, matchIds: [String] }`. Guarda la última lectura completa de rango y partidas (con 0 partidas omitidas) para RF-30 (D78, D81, D102).

---

## 4. Funciones puras de dominio (el instante `now` llega como parámetro)

```ts
// domain/riotRules.ts
validateRiotId(raw: unknown): { ok: true; gameName: string; tagLine: string; riotId: string } | { ok: false; error: string }
//   - Si typeof raw !== "string" → 400 RF-18
//   - Recorta extremos con raw.trim(); busca único '#' (nombre no contiene '#')
//   - gameName: longitud UTF-16 3..16, sin '#', '\n', '\r', '\u2028', '\u2029' (D44)
//   - tagLine: /^[A-Za-z0-9]{3,5}$/ (solo ASCII, D44)
validateChallengeRequest(body: unknown): RuleResult<{ gameName: string; tagLine: string; riotId: string; region: string }>
//   - Orden estricto: primero validateRiotId(fields.riotId), luego normalizeRegion("lol", fields.region) (RF-18)
formatWaitMinutes(ms: number): string   // N = Math.max(1, Math.ceil(ms / 60_000)); N===1 ? "1 minuto" : `${N} minutos`

// domain/riotChallenge.ts
challengeExpiry(now: Date): Date                        // now + 10 min (RF-9)
challengeDeleteAt(closedAt: Date): Date                 // closedAt + 24 h (RF-28, D87)
isChallengeExpired(expiresAt: Date, now: Date): boolean // now.getTime() >= expiresAt.getTime() (10:00 exactos = vencido)
remainingSeconds(expiresAt: Date, now: Date): number    // Math.max(0, Math.ceil((expiresAt - now) / 1000)) (D100)
availableStarterIcons(excluded: Iterable<number>): number[] // 0..28 menos excluidos (RF-19, D25)
pickStarterIcon(available: readonly number[], pickIndex: (len: number) => number): number | null
hourlyRateLimitWait(createdDates: readonly Date[], now: Date): number | null
//   - Filtra createdAt > now - 1 h; si hay >= 5, toma el 5.º más reciente (más antiguo de los 5)
//   - Devuelve ms faltantes hasta createdAt + 1 h; si < 5, devuelve null (RF-21)
noFreeIconsWait(openExpiresAt: readonly Date[], now: Date): number
//   - Menor expiresAt > now; devuelve ms hasta ese vencimiento (RF-43)
challengeConfirmNotice(pendingBlocks: readonly PendingBlock[]): string | undefined
//   - Sin pendientes → undefined (RF-7, D82)
//   - Si incluye "rank" Y "matches" (falte o no "profile") → "Cuenta de Riot verificada, pero no pudimos leer sus datos. Resincroniza más tarde para verlos." (D79, D80)
//   - Cualquier otra combinación con >= 1 pendiente → "Cuenta de Riot verificada, pero no pudimos leer algunos de sus datos. Resincroniza más tarde para verlos."

// domain/riotData.ts
parseRiotSoloRank(entries: unknown, now: Date):
  | { ok: true; kind: "unranked" }
  | { ok: true; kind: "ranked"; snapshot: RiotRankSnapshot }
  | { ok: false }
//   - Exige array; busca entry con queueType === "RANKED_SOLO_5x5"
//   - Si no hay entrada → { ok: true, kind: "unranked" } (RF-13)
//   - Valida tier (string no vacío) y leaguePoints (entero >= 0, sin tope: RF-31; negativo → ok:false, RF-52)
//   - Si tier está en { MASTER, GRANDMASTER, CHALLENGER } → omite division (D73, D96)
//   - Si no → guarda division cruda si es string no vacío (una desconocida NO es fallo, D96)
//   - canonicalTier = mapa UPPER → Title de GAMES.lol.tiers (undefined si fuera de escala)
//   - normalized = canonicalTier ? normalizeRank("lol", canonicalTier, division) : 0 (RF-36)
roundDurationMinutes(seconds: number): number           // Math.floor((seconds + 30) / 60) (RF-12, D35)
parseRiotMatch(raw: unknown, puuid: string): { kind: "remake" } | { kind: "invalid" } | { kind: "match"; match: RiotMatchRecord }

// domain/riotLpDelta.ts
applyRiotReading(input: {
  previousRank: RiotRankSnapshot | null;
  previousHistory: readonly RiotRankSnapshot[];
  previousMatches: readonly RiotMatchRecord[];
  previousBaseline: RiotLpBaseline | null;
  rankResult: { ok: true; rank: RiotRankSnapshot | null } | { ok: false };
  matchesResult: { ok: true; matches: readonly RiotMatchRecord[]; omittedAny: boolean } | { ok: false };
  isVerification: boolean;
}): {
  currentRank: RiotRankSnapshot | null;
  rankHistory: RiotRankSnapshot[];
  matches: RiotMatchRecord[];
  nextBaseline: RiotLpBaseline | null;
}
//   - Verificación: reemplaza historial/partidas simulados (RF-8 de la 012); si rango ok y != null → [rank], si null o fallo → []
//   - Resincronización: si rango ok, añade al historial solo si rank != null y difiere del último punto del historial (RF-32, D52);
//     si rango falla, conserva previousRank y previousHistory (RF-53)
//   - Lectura completa para RF-30 = rankResult.ok && matchesResult.ok && !matchesResult.omittedAny (D78, D102)
//   - Si es completa y previousBaseline != null:
//       newMatches = matchesResult.matches cuyos id NO están en previousBaseline.matchIds
//       si newMatches.length === 1 && previousBaseline.tier !== null && nextRank !== null && sameRankBracket(previousBaseline, nextRank):
//           delta = nextRank.points - previousBaseline.points (solo si esa partida no tenía ya rankDelta asignado)
//     y nextBaseline = nueva baseline con nextRank (o tier:null) y los id de matchesResult.matches
//   - Si NO es completa: partidas nuevas quedan con rankDelta: undefined; nextBaseline = previousBaseline (sin cambiar)
//   - Merge de partidas: conserva siempre rankDelta ya asignado en previousMatches (D37); actualiza con el nuevo delta solo si antes era undefined (D81); ordena por compareMatches y limita a 20

// domain/riotRateLimiter.ts
pruneTimestamps(timestamps: readonly number[], windowMs: number, nowMs: number): number[]
canReserveIn2Min(usedTimestamps: readonly number[], reservedCount: number, requested: number, nowMs: number): boolean
waitMsForPerSecondLimit(usedTimestamps: readonly number[], nowMs: number): number
```

---

## 5. Algoritmos críticos en pseudocódigo

### 5.1 Pedir un desafío (`POST /api/riot/challenges`) — RF-1, RF-3..RF-6, RF-18..RF-22, RF-37, RF-38, RF-43, RF-49
```
sesión (withUser)                                                → 401
at = clock.now()
1. v = validateChallengeRequest(request.body)
   si !v.ok                                                      → 400 (RF-18: Riot ID antes que región)
2. si !userLock.tryAcquire(userId)                               → 409 "ya se está comprobando" (RF-49, D70)
try {
  3. si existe cuenta { user: userId, gameId: "lol", verification }
                                                                 → 409 RF-6 ("ya tienes una cuenta de Riot verificada; usa «Resincronizar»")
  4. manual = cuenta { user: userId, gameId: "lol", verification: { $exists: false } }
     si manual && manual.region !== v.region                     → 409 RF-20 ("desvincula primero tu cuenta de LoL de <manual.region>")
  5. recent = desafios creados por userId con createdAt > at - 1h
     wait = hourlyRateLimitWait(recent, at)
     si wait !== null                                            → 429 RF-21 ("ya pediste 5 íconos en la última hora, espera N minutos antes de pedir otro")
  6. si isVerifiedByOtherUser(userId, "lol", v.riotId)           → 409 RF-5 (solo texto sin distinguir mayúsculas ni región, D51)
  7. si riotIntegration === undefined                            → 503 RF-38 ("Riot Games no está disponible por ahora, intenta más tarde")
  8. reservation = limiter.reserve(2)                            // D84
     si reservation === null                                     → 503 RF-37 ("Riot Games está ocupado, inténtalo en unos minutos")
  try {
    opSignal = AbortSignal.timeout(operationTimeoutMs)           // 60 s (RNF-7)
    9.  acct = riotCall(reservation, opSignal, () => client.getAccountByRiotId(v, signal))
        si not_found                                             → 404 RF-3
        si unavailable o invalid_data o opSignal.aborted         → 503 RF-16 / RF-52
    10. summ = riotCall(reservation, opSignal, () => client.getSummonerByPuuid(acct.puuid, v.region, signal))
        si not_found                                             → 404 RF-3
        si unavailable o invalid_data (ícono o nivel ilegible) o opSignal.aborted
                                                                 → 503 RF-16 / RF-52
    11. si existe cuenta { gameId: "lol", "verification.externalId": acct.puuid, user: { $ne: userId } }
                                                                 → 409 RF-5 (por cuenta interna de Riot)
    12. openOwn = findOpenChallenge(userId, at)
        openSamePuuid = openChallengesForPuuid(acct.puuid, at)
        excluded = { summ.profileIconId, openOwn?.iconId, ...openSamePuuid.map(c => c.iconId) }
        available = availableStarterIcons(excluded)
        si available.length === 0:
            waitMs = noFreeIconsWait(openSamePuuid.map(c => c.expiresAt), at)
            → 429 RF-43 ("no quedan íconos libres para esta cuenta, espera N minutos antes de pedir otro")
        iconId = pickStarterIcon(available, len => randomInt(0, len))
    13. crear RiotChallenge { user: userId, puuid: acct.puuid, riotId: acct.riotId (forma de Riot, D86),
                              region: v.region, iconId, status: "open", attempts: 0,
                              createdAt: at, expiresAt: at + 10 min, deleteAt: at + 10 min + 24 h }
        y anular openOwn (si existía): status = "cancelled", deleteAt = at + 24 h (RF-4, D87)
    14. → 201 toRiotChallengeJson(created, at)  // { id, iconId, expiresAt, remainingSeconds, riotId, region } sin puuid
  } finally { limiter.release(reservation) }    // libera sobrantes (D69)
} finally { userLock.release(userId) }
```

### 5.2 Confirmar un desafío (`POST /api/riot/challenges/:id/confirm`) — RF-7..RF-11, RF-16, RF-23..RF-27, RF-37, RF-38, RF-48..RF-50, RF-52
```
sesión (withUser)                                                → 401
at = clock.now()
─ Paso 1: sin consultar a Riot (no cuenta como intento) ─
1. si !isValidId(id)                                             → 404 RF-23 ("desafío de verificación no encontrado")
   ch = findChallengeByIdForUser(id, userId)                     // SIEMPRE filtra por user: userId (principio 5)
   si ch === null                                                → 404 RF-23
2. si ch.status === "completed"                                  → 409 RF-48 ("este desafío ya se completó")
3. si !userLock.tryAcquire(userId)                               → 409 RF-25/RF-49 ("ya se está comprobando")
try {
  4. si ch.attempts >= 10:
       si ch.status === "open" → cancelChallenge(ch.id, at)
       → 429 RF-10 ("demasiados intentos, pide un ícono nuevo")
  5. si ch.status === "cancelled" || isChallengeExpired(ch.expiresAt, at)
                                                                 → 400 RF-9 ("la verificación venció, pide un ícono nuevo")
     // La vigencia se comprueba AQUÍ y no después (D97)
  6. si existe cuenta { gameId: "lol", "verification.externalId": ch.puuid, user: { $ne: userId } }:
       cancelChallenge(ch.id, at)                                // D91: anula también en paso 1
       → 409 RF-24 ("esta cuenta ya está verificada por otro usuario")
  7. si riotIntegration === undefined                            → 503 RF-38
  8. reservation = limiter.reserve(24)                           // D84
     si reservation === null                                     → 503 RF-37

  ─ Paso 2: consultando a Riot (confirmación contada) ─
  try {
    incrementChallengeAttempts(ch.id)                            // cuenta SIEMPRE a partir de aquí (RF-10, D9, D55, D98)
    opSignal = AbortSignal.timeout(operationTimeoutMs)           // 60 s (RNF-7)

    9.  summ = riotCall(reservation, opSignal, () => client.getSummonerByPuuid(ch.puuid, ch.region, signal))
        // Antes de decidir resultado, verificar paso 3 (D104):
        si wasCancelled(ch.id)                                   → 400 RF-9 (sin cambiar cuentas)
        si summ.kind === "unavailable" || summ.kind === "invalid_icon" || opSignal.aborted
                                                                 → 503 RF-16 / RF-52 (D94: 503 solo si no se puede leer ícono)
        si summ.kind === "not_found":
            cancelChallenge(ch.id, at)
            → 404 RF-50 (texto de RF-3)
        si summ.profileIconId !== ch.iconId                      → 400 RF-8 (mantiene desafío abierto con vencimiento original)

    10. // Ícono confirmado. Comprobar exclusividad ANTES de leer datos (D91):
        si existe cuenta { gameId: "lol", "verification.externalId": ch.puuid, user: { $ne: userId } }:
            cancelChallenge(ch.id, at)
            → 409 RF-24

    11. // Lectura de los datos reales (con plazo restante de opSignal — si vence ahora, aplica RF-27, D98):
        // 11a. Riot ID vigente:
        acctRes = opSignal.aborted ? { kind: "unavailable" }
                                   : riotCall(reservation, opSignal, () => client.getAccountByPuuid(ch.puuid, ch.region, signal))
        si acctRes.kind === "not_found":                         // D95: 404 anula el desafío y no verifica
            si wasCancelled(ch.id) → 400 RF-9
            cancelChallenge(ch.id, at)
            → 404 RF-50
        effectiveHandle = (acctRes.kind === "ok") ? acctRes.riotId : ch.riotId   // D82: si falla sin ser 404, sin aviso

        // 11b. Perfil: si summ.level es válido → { level, iconId }; si no → perfil pendiente pero iconId se guarda igual (D92)
        profilePending = (summ.level === null)
        profile = profilePending ? { iconId: summ.profileIconId } : { level: summ.level, iconId: summ.profileIconId }

        // 11c. Rango Solo/Dúo:
        rankRes = opSignal.aborted ? { ok: false }
                                   : riotCall(reservation, opSignal, () => client.getSoloRankByPuuid(ch.puuid, ch.region, signal))

        // 11d. Partidas Solo/Dúo (lista + hasta 20 detalles):
        matchesRes = leer lista de hasta 20 IDs (queue=420); si falla o opSignal.aborted → { ok: false };
                     si ok → para cada matchId (mientras !opSignal.aborted) leer detalle:
                       remake → descartar; fallo/inválido/aborted → omitir partida y marcar omittedAny = true (D83, D102)

    ─ Paso 3: comprobar anulación durante la confirmación (D104) ─
    12. closed = completeChallenge(ch.id, at)  // findOneAndUpdate({ _id, user, status: "open" }, { status: "completed", deleteAt: at + 24h })
        si closed === null                     // fue anulado entretanto (RF-29)
            → 400 RF-9 sin verificar ni cambiar ninguna cuenta

    13. // Construir estado final con applyRiotReading (isVerification: true) y pendingBlocks:
        pendingBlocks = [
          ...(!rankRes.ok ? ["rank"] : []),
          ...(!matchesRes.ok ? ["matches"] : []),
          ...(profilePending ? ["profile"] : []),
        ]
        allBlocksRead = pendingBlocks.length === 0               // D82: fallo del Riot ID vigente no cuenta como pendiente
        lastSuccessfulSyncAt = allBlocksRead ? at : null         // D53: sin espera si hay pendientes

    14. res = verifyAccount({
          userId, gameId: "lol", handle: effectiveHandle, region: ch.region,
          verification: { source: "riot", externalId: ch.puuid },
          riotState: { currentRank, rankHistory, matches, profile, pendingBlocks, lastSuccessfulSyncAt, riotLpBaseline },
          now: at,
        })
        si !res.ok:
            si res.status === 409: cancelChallenge(ch.id, at)    // carrera del índice único: anular desafío (RF-24)
            → res.status { error: res.error }

    15. notice = challengeConfirmNotice(pendingBlocks)
        → 200 { outcome: "verified", account: res.account, ...(notice ? { notice } : {}) }
  } finally { limiter.release(reservation) }
} finally { userLock.release(userId) }
```

### 5.3 Resincronizar cuenta verificada con Riot (`POST /api/accounts/:id/sync`) — RF-14, RF-30, RF-32, RF-35, RF-49, RF-51, RF-52, RF-53
```
(Tras withUser, 400 formato id, 404 existencia, 403 propiedad de la spec 004)
Si account.verification.source === "riot" && (riotIntegration !== undefined || sources.lol?.id !== "riot"):
  1. si !userLock.tryAcquire(userId)                             → 409 RF-49 ("ya se está comprobando")
  try {
    2. si riotIntegration === undefined                          → 503 RF-38 ("Riot Games no está disponible por ahora, intenta más tarde")
       // Nota RF-51: 503 sin clave va ANTES del 429 de espera mínima
    3. anchor = effectiveRiotCooldownAnchor(current)             // null si pendingBlocks.length > 0 o lastSuccessfulSyncAt === null
       cooldown = syncCooldown(anchor, at)
       si !cooldown.allowed                                      → 429 ACCOUNT_ERRORS.syncCooldown(cooldown.minutes)
    4. reservation = limiter.reserve(24)                         // D84
       si reservation === null                                   → 503 RF-37
    try {
      opSignal = AbortSignal.timeout(operationTimeoutMs)         // 60 s (RNF-7)
      5. acctRes = riotCall(reservation, opSignal, () => client.getAccountByPuuid(puuid, region, signal))
         si acctRes.kind === "not_found"                         → 404 "la cuenta ya no existe en Riot Games" (RF-35)
         si acctRes.kind !== "ok" || opSignal.aborted            → 503 RF-16 / RF-51 (nada cambia)
      6. summRes = riotCall(reservation, opSignal, () => client.getSummonerByPuuid(puuid, region, signal))
         si summRes.kind === "not_found"                         → 404 "la cuenta ya no tiene perfil de League of Legends en <region>: desvincúlala y vuelve a verificarla en su región nueva" (RF-35)
         si summRes.kind !== "ok" || summRes.level === null || opSignal.aborted
                                                                 → 503 RF-16 / RF-51 / RF-52 (nada cambia)
      7. // Cuenta y perfil leídos bien. Leer rango y partidas:
         rankRes = ... (si falla → conserva datos previos, RF-53)
         matchesRes = ... (si falla lista → conserva datos previos; partida suelta que falla → omitida, D83)
         si opSignal.aborted                                     → 503 RF-16 / RNF-7 (en resync 60 s → nada cambia!)
      8. // Aplicar en una sola escritura con updateOwnedAccount:
         partial = !rankRes.ok || !matchesRes.ok
         recalcular pendingBlocks quitando los bloques leídos bien (y nunca pasando a pendiente un bloque que falló, RF-53)
         aplicar applyRiotReading(isVerification: false)
         actualizar handle = acctRes.riotId, profile = { level: summRes.level, iconId: summRes.profileIconId }, lastSyncedAt = at
         si !partial: lastSuccessfulSyncAt = at                  // RF-53: parcial no actualiza la espera mínima
      9. si cambió handleKey respecto al anterior:
           await unlinkUnverifiedElsewhere(savedAccount, at)     // RF-14 + RF-29 (D89): borra manuales ajenas y anula sus desafíos
      10. → 200 toGameAccountJson(savedAccount) + (partial ? { syncNotice: RIOT_NOTICES.partialSync } : {})
    } finally { limiter.release(reservation) }
  } finally { userLock.release(userId) }
```

### 5.4 Limitador deslizante (`services/riotLimiter.ts`) — RF-37, RNF-1
```
Estado interno: usedTimestamps: number[] = []; reservedCount = 0
reserve(count):
  nowMs = clockMs()
  usedTimestamps = pruneTimestamps(usedTimestamps, 120_000, nowMs)
  si usedTimestamps.length + reservedCount + count > 100 → devuelve null
  reservedCount += count
  devuelve { remaining: count }

acquire(reservation, signal):
  si reservation.remaining <= 0 → error interno (invariante)
  mientras true:
    si signal.aborted → lanzar AbortError
    nowMs = clockMs()
    waitMs = waitMsForPerSecondLimit(usedTimestamps, nowMs)      // < 1000 ms si hay 20 en el último segundo
    si waitMs === 0:
      reservation.remaining -= 1
      reservedCount -= 1
      usedTimestamps.push(nowMs)
      salir
    await sleepAbortable(waitMs, signal)

release(reservation):
  si reservation.remaining > 0:
    reservedCount -= reservation.remaining
    reservation.remaining = 0
```

---

## 6. Diseño de interfaz (componentes, estados y accesibilidad)

Todos los estilos usan exclusivamente los tokens de `frontend/src/styles/tokens.css` (sin colores
escritos a mano), siguen la estética del expediente existente (`sheet`, `btn`, `notice`, `Stamp`,
`OriginTag`) y usan textos centralizados en `shared/utils/copy.ts`.

### 6.1 Botón `"Verificar con Riot Games"` (`RiotVerifyButton`) — RF-38, RF-39, RF-42
- **Dónde aparece:**
  1. En `AccountRow` (Perfil y Configuración, nunca en la ficha de otro jugador) cuando
     `account.gameId === 'lol' && !account.verified`.
  2. En `LinkAccountForm` (Configuración) mediante `aboveLol`, cuando el juego elegido es `lol` y
     el usuario no tiene cuenta de LoL.
- **Estados:**
  - Usuario ya tiene cuenta de LoL verificada → no se muestra (RF-39).
  - Modo simulado (`env.useMockApi`) → botón desactivado (`disabled`) + nota asociada por
    `aria-describedby`: `"No disponible en modo de demostración"` (RF-42).
  - Servidor sin `RIOT_API_KEY` (`GET /api/riot` → `{ available: false }`), cargando o con error →
    no se muestra nada (RF-38).
  - Servidor con clave → botón activo que navega a `/verificar/riot` guardando `from: pathname`.

### 6.2 Página `/verificar/riot` (`RiotVerifyPage`) — RF-2, RF-45, RF-46, RF-47, RF-54
- Al montarse o recargarse:
  1. Si el usuario ya tiene cuenta de LoL verificada → `<Navigate to={ROUTES.profile} replace />`.
  2. Consulta `GET /api/riot/challenges/current` (RF-45, sin clave ni Riot). Mientras carga muestra
     `SheetSkeleton`.
  3. Si devuelve un desafío abierto → muestra la **pantalla del desafío** directamente (también al
     volver a pulsar `"Verificar con Riot Games"` tras `"Volver"`, D103).
  4. Si no devuelve ningún desafío (p. ej. venció antes de recargar, D101) → muestra el **formulario
     de pedido** (RF-46), pre-rellenado con `handle` y `region` de la cuenta manual de LoL si
     existe.
- **Formulario de pedido (RF-46, RF-47):**
  - Campo `Riot ID` (`placeholder="Nombre#TAG"`), selector `Región` (las 7 de LoL), botón enviar
    con guarda `useRef` contra doble clic (`"Enviando…"` mientras espera) y botón `"Volver"`.
  - Los errores del servidor (400 formato, 409 región distinta, 409 otro verificó, 429 5/hora,
    404 no existe, 503) se muestran en `<MutationNotice>` **junto al formulario** con el texto
    exacto de la API (RF-47).
- **Pantalla del desafío (RF-2, RF-47, RF-54):**
  - Muestra el Riot ID del desafío y la región.
  - **Ícono asignado:** `<img src={ddragonIconUrl(version, challenge.iconId)} alt={`Ícono n.º ${challenge.iconId}`} />`
    cargado directamente desde Data Dragon; si `onError` o sin versión, muestra el texto
    `"Ícono n.º <id>"` (RF-2).
  - **Cuenta atrás `mm:ss`:** arranca exactamente en `challenge.remainingSeconds` (D100) y descuenta
    usando el tiempo transcurrido local desde que llegó la respuesta (nunca comparando `expiresAt`
    contra `Date.now()`). Con `aria-live="off"` para no saturar lectores de pantalla, y anuncio de
    estado `role="status"` al llegar a `00:00` con `"El desafío venció"`.
  - **Pasos fijos:** lista ordenada de 3 pasos: (1) Abre tu **Perfil** en el cliente de LoL,
    (2) Haz **clic en tu ícono**, (3) **Elige el ícono indicado y guarda**.
  - **Botón `"Ya puse el ícono"`:** llama a `POST /api/riot/challenges/:id/confirm` (guarda `useRef`,
    `"Enviando…"`). Sus errores se muestran **junto a este botón** con el texto de la API (RF-47).
    - Si éxito (200): invalida `accounts`, `gameSummary('lol')` y `allMatches`, y navega a
      `/perfil` con `{ replace: true, state: { riotNotice: { tone: 'ok', text: notice ?? 'Cuenta de Riot verificada' } } }`.
    - Si error terminal (`isChallengeTerminalError`: 429 RF-10, 409 RF-24/RF-48, 404 RF-50/RF-23,
      400 RF-9): desactiva `"Ya puse el ícono"` y muestra `"Pedir otro desafío"` sin esperar a
      `00:00` (D99).
  - **Al llegar a `00:00`:** muestra `"El desafío venció"`, desactiva `"Ya puse el ícono"` y
    muestra `"Pedir otro desafío"`.
  - **Botón `"Pedir otro desafío"` (RF-54):** llama directamente a `POST /api/riot/challenges` con
    `{ riotId: challenge.riotId, region: challenge.region }`. Si responde 201, reemplaza el desafío
    en pantalla y reinicia la cuenta atrás. Si falla (incluido 429 de 5/hora), muestra el error
    **junto a `"Pedir otro desafío"`** (D77).
  - **Botón `"Volver"` (D99):** navega a `from` (o `/perfil`) sin anular el desafío. No existe
    botón `"Cancelar"`.

### 6.3 Perfil, Configuración, Ficha de jugador y Coincidencias
- **Sello y origen (`AccountRow`, `MatchEntry`, `GameSummaryPanel`):**
  - Marca `"Verificada con Riot Games"` (`verifiedLabel('riot')`), etiqueta por bloque
    `"Datos de Riot Games"` (`originLabel('riot')`).
- **Bloque de perfil Riot (`RiotProfileBlock`, RF-40, D50, D92):**
  - En `AccountRow` (Perfil, Configuración y Ficha de jugador) cuando `verifiedWith === 'riot'`:
    ícono de invocador (de Data Dragon; si `onError` no pinta nada en su lugar, sin monograma de
    respaldo), nivel (`Nivel <n>`) o `"Datos pendientes de Riot Games"` si `profile` está pendiente
    (el ícono se sigue mostrando si `profile.iconId !== undefined`), y `OriginTag('riot')`.
  - En **Coincidencias** (`MatchEntry`): solo la marca `"Verificada con Riot Games"` junto a
    `"Datos de Riot Games"`, sin nivel ni ícono (D50, D75).
- **Rango vigente, escala e historial (`AccountRow`, `GameSummaryPanel`):**
  - Si `'rank'` está en `pendingBlocks`: muestra `"Datos pendientes de Riot Games"` en el rango y
    en el bloque de escala (RF-27).
  - Si `verifiedWith === 'riot'`, `'rank'` no está pendiente y `currentRank === null`: muestra
    `"sin clasificar"` en el rango y en el bloque de escala (RF-13).
  - Si hay rango real: muestra tier y división sin traducir (`"GOLD II · 45 LP"`, `"CHALLENGER · 1450 LP"`
    sin `"I"`, RF-36/D73).
- **Partidas (`MatchLedger`, RF-12, RF-27):**
  - Si `'matches'` está en `pendingBlocks`: muestra `"Datos pendientes de Riot Games"`.
  - Si `origin === 'riot'`: fecha `dd/mm/aaaa` en zona horaria local del navegador (D47), duración
    `<n> min`, resumen `<campeón> · K/D/A` sin traducir (RF-36), y variación de LP o `—` cuando
    `rankDelta === undefined` (RF-12).
- **Texto junto a `"Resincronizar"` (`AccountRow`, RF-41):**
  - `"Al resincronizar, se vuelven a leer tus datos de Riot Games. Puedes hacerlo cada 5 minutos."`
- **Avisos en Perfil y Configuración:**
  - `ProfilePage`: muestra `riotNotice` sobre «Mis juegos» tras verificar (RF-7 / RF-27).
  - `ProfilePage` y `SettingsPage`: si `syncAccount.data?.syncNotice` existe, muestra el aviso de
    RF-53 (`"No pudimos actualizar algunos de tus datos de Riot Games. Resincroniza más tarde para verlos."`);
    los errores 429/503/404 (incluido RF-35 de cuenta transferida de región) salen en `MutationNotice`
    con el texto exacto del servidor.
- **Coincidencias (`MatchesPage`, RF-33, RF-44):**
  - Si `GET /api/matches` responde `409`, muestra el aviso con el texto de la API
    (`"necesitas rango en Solo/Dúo para buscar en LoL"`) en lugar de la lista de candidatos.

---

## 7. Decisiones técnicas justificadas (con su alternativa descartada)

- **P14-1. Colección `RiotChallenge` separada con TTL dinámico `deleteAt` (RF-28, D87).**
  A diferencia de `SteamAttempt` (un documento por usuario con índice único), Riot necesita
  conservar durante 24 h los desafíos vencidos, anulados y completados para el límite de 5/hora
  (RF-21) y el 409 `"este desafío ya se completó"` (RF-48), con borrado 24 h desde que deja de
  estar abierto (lo que ocurra primero). Un único campo `deleteAt` con índice TTL
  `{ expireAfterSeconds: 0 }` (inicializado en `expiresAt + 24 h` y adelantado a `at + 24 h` al
  cerrarse o anularse) resuelve D87 de forma exacta sin tareas programadas.
  *Alternativa descartada:* índice TTL sobre `createdAt` o `expiresAt` (violaría D87 cuando un
  desafío se anula o completa a los 2 minutos) o limpieza manual con `setInterval` (complejidad
  innecesaria y riesgo de fugas en tests).

- **P14-2. Bloqueo por usuario en memoria por instancia de `createApp` (`riotUserLock`) y cierre atómico del desafío (RF-49, D63, D90, D104).**
  Un `Set<string>` creado dentro de `createApp` garantiza aislamiento total entre pruebas y cumple
  D63 (vive solo en la memoria de la instancia y se pierde al reiniciar). Además, para D104
  (anulación concurrente desde `accounts` o desde otro usuario mientras corre una confirmación),
  la confirmación consulta `status` tras hablar con Riot y cierra el desafío con un
  `findOneAndUpdate({ _id, user, status: "open" }, ...)` atómico antes de llamar a `verifyAccount`.
  *Alternativa descartada:* campo `confirming: boolean` en MongoDB (contradice D63: quedaría
  pegado tras un reinicio) o un `Set` global de módulo (contaminaría instancias de prueba).

- **P14-3. Resincronización de Riot en `syncRiotAccount` dedicada, preservando el camino `sources.lol` de la spec 012.**
  `readWithTimeout` de `realSources.ts` corta toda la operación a los 8 s, mientras que Riot hace
  hasta 24 consultas con 8 s por consulta (RNF-6) y 60 s de plazo total (RNF-7), más reserva de 24
  en el limitador, 404 específico por región transferida (RF-35) y actualización parcial (RF-53).
  Por eso `POST /api/accounts/:id/sync` delega en `syncRiotAccount` cuando `riotIntegration` está
  configurado (o cuando no hay ni `riotIntegration` ni `sources.lol`, aplicando 503 antes de 429
  según RF-51), pero mantiene el camino genérico de `sources.lol` cuando solo se inyectó un doble
  de la spec 012 (retrocompatibilidad total con `accountRealSync.test.ts`).
  *Alternativa descartada:* meter las 24 consultas dentro de `RealSource.read` y subir el timeout
  global de `realSources.ts` a 60 s (rompería RNF-5 de la spec 012 y sus tests para Steam).

- **P14-4. Subdocumento interno `riotLpBaseline` y `rankDelta?: number` para RF-30.**
  Guardar el rango y los IDs de las partidas de la **última lectura completa de rango y partidas**
  (0 omitidas) permite implementar con precisión D37, D78, D81 y D102: las lecturas parciales o con
  partidas omitidas no sobrescriben `riotLpBaseline`, las variaciones asignadas nunca se recalculan
  y una partida con `rankDelta: undefined` (`"—"`) puede recibir su variación en la siguiente
  lectura completa.
  *Alternativa descartada:* inferir la lectura anterior desde `rankHistory` y `matches` (falla con
  cuentas sin clasificar, con lecturas parciales y con partidas omitidas de D102).

- **P14-5. Campo interno `lastSuccessfulSyncAt` y campo visible opcional `pendingBlocks` en `GameAccount`.**
  `pendingBlocks` distingue de manera inequívoca una cuenta Riot **sin clasificar** (`currentRank: null`,
  sin `"rank"` en `pendingBlocks`) de una con **rango pendiente** (`currentRank: null`, `"rank"` en
  `pendingBlocks`), y permite marcar independientemente `rank`, `matches` y `profile` (con `iconId`
  visible aunque `profile` esté pendiente, D92). `lastSuccessfulSyncAt` controla exactamente el
  cooldown de 5 min en verificaciones y resincronizaciones parciales (D53, D68, D82) sin falsear
  `lastSyncedAt` ni tocar las cuentas de Steam (013).
  *Alternativa descartada:* reutilizar solo `profile === undefined` como en Steam (insuficiente
  porque Riot tiene tres bloques independientes y resincronizaciones parciales).

- **P14-6. Campo opcional `syncNotice` en el `200` de `POST /api/accounts/:id/sync` solo en resincronización parcial (RF-53).**
  Ver Observación O-1. Mantiene intacta la forma `GameAccountJson` en la raíz para 004, 012, 013 y
  resincronizaciones completas de Riot, y entrega el aviso en resincronizaciones parciales.
  *Alternativa descartada:* envolver toda respuesta de `/sync` en `{ account, notice }` (rompería
  el contrato de las specs 004, 012 y 013).

- **P14-7. Endpoint `league/v4/entries/by-puuid/{puuid}` en lugar de `by-summoner/{summonerId}`.**
  Permite consultar el rango directamente por `puuid` (sin depender de `summonerId`, que Riot
  depreca) y mantiene exactamente 1 consulta para el bloque de rango, cumpliendo la reserva de 24
  consultas (D84) y el tope de 35 (RNF-1).
  *Alternativa descartada:* guardar `summonerId` además de `puuid` (dato redundante y en proceso de
  retiro por Riot).

- **P14-8. Detección de remake en Match-v5: `gameEndedInEarlySurrender === true && gameDuration < 300` (o `endOfGameResult === "Abort_Unexpected"`).**
  Ver Observación O-5. En Match-v5, `gameEndedInEarlySurrender` también se activa en rendiciones al
  minuto 15 (`FF15`), que sí son derrotas válidas con pérdida de LP. Acotar por `< 300 s` descarta
  remakes reales sin perder derrotas por rendición temprana.
  *Alternativa descartada:* descartar todo `gameEndedInEarlySurrender === true` (ocultaría derrotas
  legítimas y rompería el conteo de partidas nuevas para RF-30).

- **P14-9. Limitador propio por instancia con `nowMs` y `sleep` inyectables (`RNF-1`, `RNF-5`).**
  Implementado en TypeScript puro con cola de timestamps en ventanas deslizantes de 1 s (20) y
  2 min (100), reserva por adelantado (2 / 24 / 24) y liberación en `finally` (D69). Al inyectar
  `nowMs` y `sleep`, las pruebas unitarias e integración verifican los límites de 1 s, 2 min y los
  plazos de 8 s y 60 s en milisegundos reales, sin sleeps lentos ni dependencias externas.
  *Alternativa descartada:* librería externa de rate-limiting (prohibida por RNF-5 y principio 1) o
  ventanas fijas por minuto (no cumplen D85: ventanas deslizantes).

- **P14-10. `RIOT_API_KEY` opcional, comentada en `.env.example`, sin `PUBLIC_URL` y solo por cabecera `X-Riot-Token` (RF-17, RF-38, RNF-4).**
  Simétrico a `STEAM_API_KEY` de la 013, pero sin requerir `PUBLIC_URL` porque no hay redirección
  externa. Pasar la clave en cabecera `X-Riot-Token` (nunca en query string) reduce el riesgo de
  filtración accidental en URLs o trazas.
  *Alternativa descartada:* `api_key` en query string o `RIOT_API_KEY` obligatoria al arrancar
  (rompería RF-38 y las pruebas sin clave).

- **P14-11. Plazo configurable `timeoutMs` en `frontend/src/services/http/transport.ts` (65 s para operaciones de Riot).**
  El transporte del frontend corta por defecto a los 30 s (spec 007, RF-20). Como una operación de
  Riot puede durar hasta 60 s (RNF-7), se añade `timeoutMs?: number` opcional con valor por defecto
  `REQUEST_TIMEOUT_MS` (30 000 ms), y las llamadas de Riot (`createChallenge`, `confirmChallenge`,
  `syncAccount`) pasan `65_000` ms para recibir siempre la respuesta del servidor (incluido el 503
  a los 60 s) sin falsos errores de conexión.
  *Alternativa descartada:* subir `REQUEST_TIMEOUT_MS` global a 65 s (alteraría RF-20 de la 007).

- **P14-12. Ruta protegida `/verificar/riot` y lectura de Data Dragon aislada en `services/ddragon.ts`.**
  Ver Observaciones O-2 y O-3. Mantiene intacto el principio 3 de la constitución (ningún componente
  llama a `fetch`), permite recargar la página recuperando el desafío (RF-45) y clasifica errores
  terminales por `{ status, message }` sin alterar el formato `{ error: string }` de la spec 001.
  *Alternativa descartada:* modal sin ruta propia o añadir un campo extra a las respuestas de error
  de la API.

---

## 8. Estrategia de pruebas

### 8.1 Backend (`node --test` + `supertest`, tests primero: rojo → verde, sin red ni clave real — RNF-2)
- **Configuración (`tests/unit/config.test.ts`):** `RIOT_API_KEY` ausente o vacía → `riot: null`;
  presente → `riot: { apiKey }`; nunca aparece en errores ni logs; `envExample.test.ts` sigue en
  verde porque va comentada.
- **Dominio puro (`tests/unit/`):**
  - `riotRules.test.ts`: todos los casos de formato de Riot ID (RF-18, D44: recorte, UTF-16 con
    emoji = 2 unidades, 16 vs 17, `#` extra, LF/CR/U+2028/U+2029, tag de 2 vs 3–5, `ÉLA` no ASCII,
    ausente, número), orden Riot ID antes de región, tabla fija de plataformas y enrutamiento,
    singular/plural de espera en minutos.
  - `riotChallenge.test.ts`: vencimiento exacto a 10:00 (RF-9), retención 24 h desde cierre/anulación/
    vencimiento (D87), `remainingSeconds` (D100), exclusión de íconos 0..28 (RF-19), espera sin
    íconos libres (RF-43), límite de 5 por hora (RF-21), textos de aviso de RF-7/RF-27 (D79, D80).
  - `riotData.test.ts`: parseo de cuenta, perfil (separación ícono vs nivel, D92/D94), rango
    Solo/Dúo (sin clasificar, LP ≥ 0 sin tope — Challenger 1450 LP, LP negativos → fallo, `MASTER`/
    `GRANDMASTER`/`CHALLENGER` sin división `"I"`, división desconocida → no fallo y normaliza a
    división más baja, tier desconocido → normaliza a 0 — D73, D96), duración redondeada
    (`1769 s → 29`, `1770 s → 30`, D35), detección de remake vs FF15, partida inválida (D83).
  - `riotLpDelta.test.ts`: RF-30 completo (primera lectura → `"—"`, 1 partida nueva misma división →
    delta, 2 partidas nuevas → `"—"`, 1 partida + 1 remake → delta, cambio de división → `"—"`,
    Master 50→80 → `+30`, Master→Grandmaster → `"—"`, variación asignada inmutable — D37, lectura
    sin rango o con partida omitida deja `"—"` y no cambia baseline — D78/D102, recuperación de
    variación en siguiente lectura completa sobre partida con `"—"` — D81), historial RF-32 (sin
    clasificar no añade punto, volver al mismo rango no añade punto — D52).
  - `riotRateLimiter.test.ts`: ventanas deslizantes de 1 s (20) y 2 min (100) con `nowMs`
    controlado, reservas de 2/24/24, rechazo al superar 100, liberación de sobrantes (D69), espaciado
    `< 1 s` al llegar a 20/s (D85).
  - `domainIsolation.test.ts` (ya existente): cubre automáticamente todos los archivos nuevos de
    `src/domain/`.
- **Modelo y servicio de desafíos (`tests/unit/riotChallenges.test.ts` o integración Mongo):**
  índices creados (incluido TTL `deleteAt` con `expireAfterSeconds: 0`), `toRiotChallengeJson` sin
  `puuid`, actualización de `deleteAt` al anular/cerrar antes del vencimiento (D87).
- **Cliente HTTP de Riot (`tests/unit/riotClient.test.ts`, con `fetch` inyectable):**
  cabecera `X-Riot-Token` (nunca en URL), rutas por plataforma y enrutamiento regional, 404, 401/403
  (clave caducada), 429, 5xx, error de red, JSON roto, timeout de 8 s con reloj/timer controlado
  (RNF-6), y comprobación explícita de que una clave falsa de prueba **nunca** aparece en errores ni
  en los registros del `logger` (RNF-4).
- **Controlador `/api/riot` (`tests/controllers/riot.test.ts`, con `RiotClient` falso):**
  - `GET /api/riot` (disponible con clave / no disponible sin clave / 401 sin sesión).
  - `GET /api/riot/challenges/current` (RF-45: abierto con `remainingSeconds`, `riotId` devuelto por
    Riot y `region`, sin `puuid`; sin ninguno; vencido o anulado; sin clave de Riot; sin consultar
    al doble; no bloqueado por RF-49).
  - `POST /api/riot/challenges`: todo el orden de RF-22 paso a paso (400 formato → 409 lock → 409
    ya verificada → 409 región manual distinta → 429 5/hora solo creados → 409 texto sin región →
    503 sin clave → 503 limitador → 503 Riot / 60 s → 404 no existe / sin perfil en región → 409
    puuid → 429 sin íconos libres), reemplazo de desafío abierto (RF-4), exclusión de íconos
    (RF-19), 201 sin `puuid`.
  - `POST /api/riot/challenges/:id/confirm`: todo el orden de RF-26 paso a paso (404 ajeno/inexistente →
    409 completado RF-48 → 409 lock RF-25 → 429 11.ª confirmación RF-10 → 400 vencido 10:00 exactos
    o anulado RF-9 → 409 otro verificó antes de Riot [anula, D91] → 503 sin clave → 503 limitador →
    503 perfil/ícono ilegible/60 s → 404 cuenta desaparecida RF-50 → 400 ícono distinto RF-8 → 409
    otro verificó tras ícono [anula, D91] → 404 al leer Riot ID vigente RF-50 [D95] → éxito RF-7
    [también si falla Riot ID vigente sin ser 404, D82] → éxito parcial RF-27 por bloques, con
    ambos avisos, perfil pendiente con ícono visible y sin espera mínima).
  - Caso D97 (vence durante la confirmación → éxito vale) y **caso D104** (anulación por RF-29
    mientras espera al doble con ícono coincidente → 400 RF-9, cuenta intento, ninguna cuenta
    verificada).
  - Presupuesto de **máximo 35 consultas** en una verificación completa (1 pedido + 9 fallidas + 1
    exitosa, RNF-1) y liberación de 23 consultas sobrantes en confirmaciones fallidas (D69).
  - Tiempo máximo de 60 s (RNF-7): 503 al pedir/confirmar antes del ícono (cuenta intento en
    confirmación); RF-27 si ocurre después de confirmar el ícono.
  - Auditoría RNF-3: ninguna respuesta (`create`, `current`, `confirm`, `sync`, `accounts`, `matches`,
    `games/lol`) contiene el `puuid` del doble.
- **Resincronización, RF-14, RF-15, RF-29 y coincidencias (`tests/controllers/riotSyncAndMatches.test.ts`):**
  - Orden completo de RF-51 (409 lock → 503 sin clave incluso dentro de espera → 429 espera mínima →
    503 limitador → 503 cuenta/perfil → 404 cuenta borrada / transferida de región RF-35 → 503 60 s).
  - Resincronización parcial RF-53 (conserva bloques fallidos, no los pasa a pendientes, 200 con
    `syncNotice`, no actualiza espera mínima).
  - RF-15: cambiar el ícono tras verificar y resincronizar mantiene la cuenta verificada.
  - RF-14 + RF-29 (D89): cambio de Riot ID al resincronizar desvincula la cuenta manual de otro y
    anula su desafío abierto; vincular/desvincular/editar región de cuenta manual de LoL anula el
    desafío abierto del usuario; `DELETE /api/users/:id` borra los `RiotChallenge` (C6).
  - Coincidencias (RF-13, RF-33, RF-44): sin clasificar o rango pendiente → fuera como candidata y
    409 al buscar (después de los 400 de filtros y sin clave); partidas o perfil pendientes → sigue
    en coincidencias.
- **Arranque con renovación de clave (`tests/server/riotKeyRestart.test.ts`):**
  RF-17: dos arranques del servidor (o dos `loadConfig` + `createApp` con servidores reales sobre
  `127.0.0.1` y claves falsas distintas) comprobando que la nueva clave entra en vigor sin otro
  cambio.
- **Regresión:** suite completa del backend en verde sin conexión a Internet (incluidos todos los
  tests de 001–006, 012 y 013).

### 8.2 Frontend (verificación estática + Chrome DevTools)
- `npm run typecheck`, `npm run lint` y `npm run build` en verde (constitución, principio 4).
- Comprobación manual reproducible en Chrome DevTools (`validation.md`, con el servidor local y
  cuentas de prueba/reales) cubriendo todos los RF de interfaz: botón oculto sin clave (RF-38),
  botón desactivado en modo simulado (RF-42), botón en Perfil y Configuración (RF-39), formulario
  pre-rellenado (RF-46), pantalla del desafío con imagen Data Dragon / respaldo, cuenta atrás desde
  `remainingSeconds`, pasos, `"Volver"`, recuperación al recargar y al volver a pulsar verificar
  (RF-2, RF-45, D103), vencimiento a `00:00` y respuesta terminal → `"Pedir otro desafío"` (RF-54),
  errores junto a cada botón/formulario (RF-47), avisos de RF-7, RF-27, RF-33, RF-35 y RF-53,
  bloque de perfil con nivel e ícono (y sin respaldo si falla imagen), `"Verificada con Riot Games"`,
  `"Datos de Riot Games"`, `"sin clasificar"`, `"Datos pendientes de Riot Games"`, textos sin
  traducir (`GOLD II`, `MASTER`, `MonkeyKing`), fecha `dd/mm/aaaa` y `"—"` en partidas (RF-12,
  RF-36, RF-40, RF-41).
- Recorrido manual final del equipo con una cuenta real de LoL y clave de desarrollo en `.env`.

---

## 9. Riesgos

- **R14-1. Caducidad de 24 h de la Development Key de Riot.** Si caduca durante la evaluación o
  demo, las operaciones con Riot devolverán 503 (RF-16) sin romper el resto de la app. Se mitiga
  documentando el procedimiento rápido de renovación en `.env` + reinicio (RF-17) en `README.md`.
- **R14-2. Caché de propagación de ícono en Riot Games.** Al cambiar el ícono en el cliente de LoL,
  Riot puede tardar unos minutos en reflejarlo en Summoner-v4. Ya contemplado en RF-8 (hasta 10
  confirmaciones en 10 min con mensaje explicativo) y D69 (liberar 23 consultas sobrantes para no
  agotar la cuota).
- **R14-3. Cambios de versión de Data Dragon.** Si `ddragon.leagueoflegends.com/api/versions.json`
  falla en el navegador del usuario, `services/ddragon.ts` usa una versión de respaldo conocida; si
  aun así la imagen falla, RF-2 muestra `"Ícono n.º N"` y RF-40 oculta la imagen sin romper el
  diseño.
- **R14-4. Concurrencia multi-instancia.** El limitador (RF-37) y el bloqueo por usuario (RF-49)
  son por instancia en memoria, por decisión explícita de la spec (D17, D63). En el despliegue del
  curso corre una única instancia Node.
- **R14-5. Reloj y TTL de MongoDB.** Igual que en la 013 (R13-4): MongoDB purga documentos TTL cada
  ~60 s; toda comprobación de vencimiento (10 min), ventana horaria (1 h) y borrado lógico se decide
  en código usando `clock.now()`.

---

## 10. Observaciones para el usuario (a confirmar al aprobar el plan)

- **O-1. Aviso de resincronización parcial (`syncNotice`) en `POST /api/accounts/:id/sync` (RF-53).**
  Propuesta: mantener la forma `GameAccountJson` en la raíz de la respuesta y añadir el campo
  opcional `syncNotice` solo cuando la resincronización de Riot es parcial (se omite en todo otro
  caso). Así no se rompe ningún cliente ni test de las specs 004, 012 y 013.
- **O-2. Ruta protegida `/verificar/riot` para formulario y pantalla del desafío.**
  Propuesta: implementar RF-46 y RF-2 en una página propia `/verificar/riot` dentro de
  `ProtectedRoute` (simétrica a `/verificar/steam`), para que recargar la página recupere el desafío
  naturalmente (RF-45) y `"Volver"` regrese a Perfil o Configuración.
- **O-3. Consulta a `ddragon.leagueoflegends.com/api/versions.json` en `frontend/src/services/ddragon.ts`.**
  Propuesta: encapsular en la capa `services/` (nunca en componentes, principio 3) la lectura de la
  versión más reciente de Data Dragon desde el navegador (D93), cacheada en memoria por sesión y con
  respaldo silencioso.
- **O-4. Número de tareas previstas (12 tareas).**
  La spec tiene 54 RF y 7 RNF; salen **12 tareas** (supera la guía orientativa de 10 de la skill
  `sdd`). Propongo mantener la spec entera dividida en dos bloques claros —**Backend (T1 a T8)** y
  **Frontend y cierre (T9 a T12)**—, como se hizo en las specs 009 y 013. Confirmar si se mantiene
  entera o se divide.
- **O-5. Criterio de remake en Match-v5.**
  Propuesta: descartar una partida como remake cuando `gameEndedInEarlySurrender === true && gameDuration < 300`
  (o `endOfGameResult === "Abort_Unexpected"`), para no descartar derrotas legítimas por rendición
  temprana al minuto 15 (`FF15`).

---

## 11. Previsión de tareas (orientativa; `tasks.md` se redactará al aprobar este plan)

**Bloque A — Backend (T1 a T8):**
1. **T1. Configuración de Riot:** `RIOT_API_KEY` opcional en `config.ts`, `.env.example`,
   `AppOptions.riotIntegration` y pruebas de configuración + RF-17 (RF-17, RF-38, RNF-4).
2. **T2. Dominio puro de reglas, desafíos y limitador:** `riotRules.ts`, `riotChallenge.ts`,
   `riotRateLimiter.ts` con sus pruebas unitarias (RF-1, RF-4, RF-7, RF-9, RF-10, RF-18, RF-19,
   RF-21, RF-27, RF-28, RF-37, RF-43, RF-45, RNF-1).
3. **T3. Dominio puro de datos Riot y variación de LP:** `riotData.ts`, `riotLpDelta.ts` y ajustes
   en `accountState.ts`/`matching.ts` con pruebas exhaustivas de RF-11, RF-12, RF-13, RF-30, RF-31,
   RF-32, RF-36, RF-52.
4. **T4. Modelos y persistencia:** `RiotChallenge` + `services/riotChallenges.ts`, extensión de
   `GameAccount` (`currentRank` opcional, `canonicalTier`, `rankDelta?`, `pendingBlocks`,
   `lastSuccessfulSyncAt`, `riotLpBaseline`), `prepareDatabase()` y cascada C6 en `users.ts`
   (RF-12, RF-13, RF-27, RF-28, RF-29, RF-30, RNF-3).
5. **T5. Cliente HTTP de Riot, limitador async y bloqueo por usuario:** `riotClient.ts` (`fetch`
   inyectable, 8 s por consulta, sin fugas de clave), `riotLimiter.ts` y `riotUserLock.ts` con sus
   pruebas (RF-16, RF-25, RF-37, RF-49, RF-52, RNF-1, RNF-2, RNF-4, RNF-6, RNF-7).
6. **T6. Rutas `/api/riot` — estado, recuperación y creación de desafíos:** `GET /api/riot`,
   `GET /api/riot/challenges/current`, `POST /api/riot/challenges` con todo el orden de RF-22 y
   pruebas completas (RF-1, RF-3..RF-6, RF-18..RF-22, RF-37, RF-38, RF-43, RF-45, RF-49, RNF-3).
7. **T7. Confirmación de desafíos (`POST /api/riot/challenges/:id/confirm`) y `verifyAccount`:**
   orden completo de RF-26 (pasos 1, 2 y 3/D104), fallo parcial por bloques (RF-27), tope de 35
   consultas (RNF-1), plazo de 60 s (RNF-7) y anulación por RF-29 (RF-7..RF-11, RF-23..RF-27,
   RF-48, RF-50, RF-52).
8. **T8. Resincronización Riot, anulaciones en `/api/accounts` y coincidencias:** `riotSync.ts`,
   cambios en `controllers/accounts.ts`, `controllers/users.ts` (`gameSummaryJson`), `matchInputs.ts`
   y `controllers/matches.ts` con pruebas de RF-13, RF-14, RF-15, RF-29, RF-33, RF-35, RF-44, RF-51,
   RF-53, más `index.ts` y `requests/riot.rest`.

**Bloque B — Frontend y cierre (T9 a T12):**
9. **T9. Frontend — dominio, transporte, contrato y Data Dragon:** `types.ts`, `origins.ts`
   (`"Verificada con Riot Games"`), `riotDisplay.ts`, `services/ddragon.ts`, `timeoutMs` en
   `transport.ts`/`httpClient.ts`, `apiContract.ts`, `httpApi.ts`, `mockApi.ts`, `queryKeys.ts`,
   `routes.ts`, `router.tsx` y `copy.ts` (RF-12, RF-38, RF-40, RF-42, RNF-7).
10. **T10. Frontend — verificación con Riot (`/verificar/riot` y botón):** `features/riot/`
    (`hooks.ts`, `notice.ts`, `RiotVerifyButton.tsx`, `RiotVerifyPage.tsx`) e integración del botón
    en `AccountRow`, `LinkAccountForm`, `ProfilePage` y `SettingsPage` (RF-2, RF-7, RF-27, RF-38,
    RF-39, RF-42, RF-45, RF-46, RF-47, RF-54).
11. **T11. Frontend — datos reales de Riot en Perfil, Configuración, Ficha y Coincidencias:**
    `RiotProfileBlock.tsx`, rango pendiente / `"sin clasificar"` en `AccountRow` y
    `GameSummaryPanel`, fecha `dd/mm/aaaa` y `"—"` en `MatchLedger`, `RIOT_RESYNC_NOTE`, aviso de
    RF-53 en Perfil/Configuración y aviso 409 de RF-33 en `MatchesPage` (RF-12, RF-13, RF-27, RF-33,
    RF-35, RF-36, RF-40, RF-41, RF-44, RF-53).
12. **T12. Cierre y validación:** suite completa del backend sin red, `typecheck`, `lint` y `build`
    en ambos paquetes, comprobación de `package.json` sin cambios (RNF-5), actualización de
    `AGENTS.md`, `PRODUCT.md`, `README.md` (renovación de clave) y `MEMORY.md`, más guía de
    recorrido manual en `specs/014-verificacion-riot/validation.md`.

---

## 12. Matriz de trazabilidad (todos los RF y RNF)

| Req. | Dónde se cubre en el plan |
|---|---|
| RF-1 | §1.2, §2.1 (`riotChallenge`), §2.2 (`RiotChallenge`, `controllers/riot`), §5.1 |
| RF-2 | §2.3 (`riotDisplay`, `RiotVerifyPage`), §6.2 |
| RF-3 | §1.2, §2.1 (`riotRules`), §2.2 (`riotClient`, `controllers/riot`), §5.1 paso 9–10 |
| RF-4 | §2.2 (`riotChallenges`), §5.1 paso 12–13 |
| RF-5 | §5.1 pasos 6 y 11 (`isVerifiedByOtherUser` por texto sin región y por `puuid`) |
| RF-6 | §5.1 paso 3, §6.1, §6.2 |
| RF-7 | §2.1 (`riotChallenge.challengeConfirmNotice`), §5.2 pasos 11a–15, §6.2, §6.3 |
| RF-8 | §5.2 paso 9, §6.2 (`isChallengeTerminalError` mantiene abierto el desafío) |
| RF-9 | §2.1 (`isChallengeExpired`), §5.2 pasos 5 y 12 (D97 y D104), §6.2 |
| RF-10 | §5.2 paso 4 y `incrementChallengeAttempts`, §6.2 |
| RF-11 | §1.2, §2.1 (`riotData`), §5.2 paso 11, §5.3 paso 7 |
| RF-12 | §2.1 (`roundDurationMinutes`), §2.2 (`users.ts`), §2.3 (`riotDisplay`, `MatchLedger`), §6.3 |
| RF-13 | §2.1 (`parseRiotSoloRank`, `matching`), §2.2 (`gameAccount`, `matchInputs`), §6.3 |
| RF-14 | §2.2 (`verifyAccount.unlinkUnverifiedElsewhere`, `riotSync`), §5.3 paso 9 |
| RF-15 | §5.3 (resincronizar actualiza `profile.iconId` sin exigir el ícono asignado), §8.1 |
| RF-16 | §2.2 (`riotClient`), §5.1–§5.3, §8.1 |
| RF-17 | §2.2 (`config.ts`, `index.ts`), P14-10, §8.1 (`riotKeyRestart.test.ts`) |
| RF-18 | §2.1 (`validateRiotId`, `validateChallengeRequest`), §5.1 paso 1 |
| RF-19 | §2.1 (`availableStarterIcons`, `pickStarterIcon`), §5.1 paso 12 |
| RF-20 | §5.1 paso 4 |
| RF-21 | §2.1 (`hourlyRateLimitWait`), §3.1, §5.1 paso 5 |
| RF-22 | §5.1 (orden completo pasos 1 a 12) |
| RF-23 | §5.2 paso 1 (`findChallengeByIdForUser` filtra siempre por `sessionUserId`) |
| RF-24 | §5.2 pasos 6 y 10 (anula en ambos casos, D91) y paso 14 (carrera de índice único) |
| RF-25 | §2.2 (`riotUserLock`), §5.2 paso 3, P14-2 |
| RF-26 | §5.2 (pasos 1, 2 y 3 en orden exacto, incluido D104) |
| RF-27 | §2.1 (`challengeConfirmNotice`), §3.2 (`pendingBlocks`, `lastSuccessfulSyncAt`), §5.2 pasos 11–15, §6.2, §6.3 |
| RF-28 | §3.1 (`RiotChallenge` + TTL `deleteAt`), P14-1, P14-2 |
| RF-29 | §2.2 (`accounts.ts`, `users.ts` C6, `verifyAccount.ts`, `riotSync.ts`), §5.2 paso 12 |
| RF-30 | §2.1 (`riotLpDelta.ts`), §3.2 (`riotLpBaseline`, `rankDelta?`), P14-4, §8.1 |
| RF-31 | §2.1 (`parseRiotSoloRank`), §3.2 (`RankSnapshotSchema.points` sin tope) |
| RF-32 | §2.1 (`applyRiotReading` — sin añadir punto al pasar a sin clasificar o repetir último punto) |
| RF-33 | §2.2 (`matchInputs.ts`, `controllers/matches.ts`), §2.3 (`MatchesPage.tsx`), §6.3 |
| RF-34 | §2.1 (`parseRiotAccount`), §3.1 (`riotId`), §3.2 (`handle`/`handleKey`) |
| RF-35 | §2.1 (`riotRules`), §5.3 pasos 5–6, §6.3 |
| RF-36 | §2.1 (`parseRiotSoloRank`, `parseRiotMatch`), §3.2 (`canonicalTier`), §6.3 |
| RF-37 | §2.1 (`riotRateLimiter`), §2.2 (`riotLimiter`), §5.4, P14-9 |
| RF-38 | §2.2 (`config.ts`, `controllers/riot.ts`, `controllers/accounts.ts`), §6.1 |
| RF-39 | §2.3 (`RiotVerifyButton`, `AccountRow`, `LinkAccountForm`, `ProfilePage`, `SettingsPage`), §6.1 |
| RF-40 | §2.3 (`origins.ts`, `RiotProfileBlock`, `AccountRow`, `MatchEntry`), §6.3 |
| RF-41 | §2.3 (`copy.ts`, `AccountRow`), §6.3 |
| RF-42 | §2.3 (`mockApi.ts`, `RiotVerifyButton`), §6.1 |
| RF-43 | §2.1 (`noFreeIconsWait`), §5.1 paso 12 |
| RF-44 | §2.2 (`matchInputs.ts`, `controllers/matches.ts`), §6.3 |
| RF-45 | §2.2 (`GET /api/riot/challenges/current`), §2.3 (`RiotVerifyPage`), §6.2 |
| RF-46 | §2.3 (`RiotVerifyPage`), §6.2 |
| RF-47 | §2.3 (`RiotVerifyPage`), §6.2 |
| RF-48 | §5.2 paso 2 |
| RF-49 | §2.2 (`riotUserLock`), §5.1 paso 2, §5.2 paso 3, §5.3 paso 1, P14-2 |
| RF-50 | §5.2 pasos 9 y 11a (D55, D95) |
| RF-51 | §5.3 (orden completo pasos 1 a 7), P14-3 |
| RF-52 | §2.1 (`riotData.ts`), §5.1 pasos 9–10, §5.2 pasos 9 y 11, §5.3 pasos 5–7 |
| RF-53 | §5.3 pasos 7–10, P14-6, §6.3 |
| RF-54 | §2.3 (`RiotVerifyPage`), §6.2 |
| RNF-1 | §1.2 (2 + 9×1 + 24 = 35), §5.4, P14-9, §8.1 |
| RNF-2 | §2.2 (`riotClient` con `fetchFn` inyectable), §8.1 |
| RNF-3 | §3.1 (`toRiotChallengeJson` lista blanca), §3.2 (`toGameAccountJson`), §8.1 |
| RNF-4 | §2.2 (`config.ts`, `riotClient.ts`, `.env.example`), P14-10, §8.1 |
| RNF-5 | Encabezado, P14-9, §8.2 (sin cambios en `package.json`) |
| RNF-6 | §2.2 (`riotClient.ts`, `sourceTimeoutMs = 8000`), §8.1 |
| RNF-7 | §2.2 (`operationTimeoutMs = 60000`), §5.1–§5.3, P14-11 (`timeoutMs: 65_000` en frontend), §8.1 |
