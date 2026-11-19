# Tareas 014 — Verificación de cuentas de League of Legends con Riot ID
Estado: aprobado (2026-11-19).
Plan: `specs/014-verificacion-riot/plan.md` (aprobado el 2026-11-19, con O-1 a O-5 confirmadas).
Spec: `specs/014-verificacion-riot/spec.md` (aprobada el 2026-11-18, D1–D104).

Doce tareas divididas en dos bloques (observación O-4 aprobada): **Bloque A — Backend (T1 a T8)** y
**Bloque B — Frontend y cierre (T9 a T12)**. Una tarea cada vez en orden de dependencia (salvo los
pares marcados explícitamente como paralelizables porque no comparten archivos). En el backend, los
tests van primero y se ven en rojo por la razón correcta antes de escribir el código (constitución,
principio 4); en el frontend bastan `typecheck`, `lint` y `build` en verde, más la comprobación
manual en Chrome DevTools en el cierre.

Comandos:
- Backend (`cd backend`): un archivo `NODE_ENV=test node --test tests/<carpeta>/<archivo>.test.ts`;
  suite completa `npm test --script-shell=bash` (en Windows); además `npm run typecheck` y
  `npm run lint`.
- Frontend (`cd frontend`): `npm run typecheck`, `npm run lint` y `npm run build`.

Reglas transversales: ninguna tarea cierra con pruebas, typecheck o lint en rojo ni con `.only`;
ninguna prueba toca la red ni usa una clave real de Riot (RNF-2, RNF-4); no se agrega ninguna
dependencia en `package.json` (RNF-5); no se editan las specs 004, 005, 007, 008, 010 ni 012
(decisión del 2026-11-18).

### Mapa de dependencias
```
T1 (config) ───────────────────────────────┐
T2 (dominio reglas/desafíos/limitador) ──▶ T3 (dominio datos/LP) ─▶ T4 (modelos/persistencia) ──┐
                                      └───────────────────────────▶ T5 (cliente/limitador/lock) ─┼─▶ T6 (/api/riot crear/actual) ─▶ T7 (confirmar + verifyAccount) ─▶ T8 (sync/accounts/matches)
                                                                                                                                                                            │
T9 (frontend contrato/dominio/ddragon) ─▶ T10 (frontend /verificar/riot + botón) ─▶ T11 (frontend perfil/ficha/coincidencias) ──────────────────────────────────────────────┴─▶ T12 (cierre)
```
Paralelismo seguro (sin solapamiento de archivos): `T1` con `T2`; `T4` con `T5`; `T9` puede empezar
en cuanto el contrato esté estable, aunque se recomienda cerrar Bloque A (T1–T8) antes de Bloque B.

---

## Bloque A — Backend (T1 a T8)

- [x] **T1. Configuración de Riot (`RIOT_API_KEY`) y arranque con renovación de clave.**
  Depende de: ninguna (puede correr en paralelo con T2).
  Archivos: `backend/src/utils/config.ts`, `backend/.env.example`,
  `backend/tests/unit/config.test.ts`, `backend/tests/unit/envExample.test.ts`,
  `backend/tests/server/riotKeyRestart.test.ts` (nuevo).
  Cambios: agregar `RiotConfig { apiKey: string }` y `Config.riot: RiotConfig | null` a partir de
  `RIOT_API_KEY` opcional (sin requerir `PUBLIC_URL`, P14-10); vacía o espacios → `null`; comentada
  en `.env.example` con nota sobre la caducidad de 24 h; ningún mensaje ni registro incluye la
  clave.
  Tests primero: casos en `config.test.ts` (ausente/vacía → `null`, presente → `riot.apiKey`, sin
  fugas de clave en errores), verificación en `envExample.test.ts` de que `RIOT_API_KEY` va
  comentada sin alterar las 7 variables obligatorias, y `riotKeyRestart.test.ts` (dos arranques de
  configuración/servidor en `127.0.0.1` con claves falsas distintas, RF-17).
  RF-17, RF-38, RNF-4, RNF-5.
  Hecho cuando: `config.test.ts`, `envExample.test.ts` y `riotKeyRestart.test.ts` se ven en rojo y
  luego en verde; `npm run typecheck` y `npm run lint` del backend en verde.

- [x] **T2. Dominio puro de reglas, desafíos y limitador deslizante.**
  Depende de: ninguna (puede correr en paralelo con T1).
  Archivos: `backend/src/domain/riotRules.ts` (nuevo), `backend/src/domain/riotChallenge.ts`
  (nuevo), `backend/src/domain/riotRateLimiter.ts` (nuevo),
  `backend/tests/unit/riotRules.test.ts` (nuevo),
  `backend/tests/unit/riotChallenge.test.ts` (nuevo),
  `backend/tests/unit/riotRateLimiter.test.ts` (nuevo).
  Cambios:
  - `riotRules.ts`: `RIOT_ERRORS` y `RIOT_NOTICES` (literales exactos de la spec, D30/D31),
    `RIOT_PLATFORMS` y `RIOT_ROUTING` (tabla fija D4), `validateRiotId` (recorte, 3–16 UTF-16 sin
    `#`/LF/CR/U+2028/U+2029, tag 3–5 ASCII alfanuméricos, D3/D44), `validateChallengeRequest` (orden
    Riot ID → región), `formatWaitMinutes` (redondeo hacia arriba, singular `"1 minuto"`).
  - `riotChallenge.ts`: `STARTER_ICON_IDS` (0..28, D25), `challengeExpiry` (10 min),
    `challengeDeleteAt` (24 h, D87), `isChallengeExpired` (`now >= expiresAt`, D15),
    `remainingSeconds` (D100), `availableStarterIcons`, `pickStarterIcon(available, pickIndex)`,
    `hourlyRateLimitWait` (5/hora, D34), `noFreeIconsWait` (D26), `challengeConfirmNotice`
    (RF-7 vs los dos avisos de RF-27 según D79/D80).
  - `riotRateLimiter.ts`: constantes (`100` en `120_000 ms`, `20` en `1_000 ms`, reservas
    `2`/`24`/`24`, D84/D85) y funciones puras `pruneTimestamps`, `canReserveIn2Min`,
    `waitMsForPerSecondLimit`.
  Sin Express, Mongoose, `fetch`, `process.env`, `Math.random`, `setTimeout` ni reloj interno.
  Tests primero: `riotRules.test.ts` (todos los casos límite de RF-18: recorte, emoji 2 UTF-16,
  16 vs 17, `#` extra, saltos de línea, `ÉLA`, tag de 2, ausente, número, orden Riot ID → región),
  `riotChallenge.test.ts` (10:00 exactos, 24 h desde cierre/anulación, `remainingSeconds`,
  exclusiones 0..28, sin íconos libres, 5/hora, avisos RF-7/RF-27 incluyendo perfil solo pendiente)
  y `riotRateLimiter.test.ts` (ventanas deslizantes 1 s y 2 min con `nowMs` controlado).
  RF-1, RF-4, RF-7, RF-9, RF-10, RF-18, RF-19, RF-21, RF-27, RF-28, RF-37, RF-43, RF-45, RNF-1,
  RNF-5.
  Hecho cuando: los tres archivos de pruebas unitarias se ven en rojo y luego en verde;
  `domainIsolation.test.ts`, `typecheck` y `lint` en verde.

- [x] **T3. Dominio puro de datos de Riot, variación de LP y adaptación de `accountState`/`matching`.**
  Depende de: T2.
  Archivos: `backend/src/domain/riotData.ts` (nuevo), `backend/src/domain/riotLpDelta.ts` (nuevo),
  `backend/src/domain/accountState.ts`, `backend/src/domain/matching.ts`,
  `backend/tests/unit/riotData.test.ts` (nuevo), `backend/tests/unit/riotLpDelta.test.ts` (nuevo).
  Cambios:
  - `riotData.ts`: `parseRiotAccount` (`puuid` + `riotId` con mayúsculas de Riot, D86),
    `parseRiotSummoner` (separa ícono de nivel para D92/D94), `parseRiotSoloRank` (`RANKED_SOLO_5x5`,
    sin clasificar, LP enteros `≥ 0` sin tope, LP negativos → fallo, `MASTER`/`GRANDMASTER`/
    `CHALLENGER` sin división `"I"`, división desconocida → no fallo y normaliza a división más
    baja, tier desconocido → 0, guarda `tier`/`division` crudos + `canonicalTier` + `normalized`,
    D36/D48/D73/D96), `roundDurationMinutes` (`Math.floor((s + 30) / 60)`, D35), `isRemakeMatch`
    (`earlySurrender && duration < 300 || Abort_Unexpected`, O-5), `parseRiotMatch`
    (`remake | invalid | match`).
  - `riotLpDelta.ts`: `sameRankBracket` y `applyRiotReading` cubriendo RF-30 (baseline de última
    lectura completa con 0 omitidas, variación asignada inmutable D37, recuperación sobre `"—"`
    D81, lectura con partida omitida no completa D102) y RF-32 (sin punto al pasar a sin clasificar
    ni al repetir último punto D52).
  - `accountState.ts` (`trend` admite `current: Snapshot | null` → `0`, partidas admiten
    `rankDelta?: number`) y `matching.ts` (`RankedAccount.currentRank` admite `null`, `buildMatches`
    excluye candidatos con `currentRank === null`).
  Tests primero: `riotData.test.ts` (Challenger 1450 LP, LP negativos, división desconocida, tier
  desconocido, Master con división `"I"`, `1769 s → 29` y `1770 s → 30`, remake vs FF15, partida
  inválida, perfil con nivel ilegible e ícono válido) y `riotLpDelta.test.ts` (todos los escenarios
  de D37, D52, D78, D81 y D102), más regresión en `accountState.test.ts` y `matching.test.ts`.
  RF-11, RF-12, RF-13, RF-30, RF-31, RF-32, RF-34, RF-36, RF-44, RF-52.
  Hecho cuando: `riotData.test.ts` y `riotLpDelta.test.ts` se ven en rojo y luego en verde;
  `accountState.test.ts`, `matching.test.ts`, `domainIsolation.test.ts`, `typecheck` y `lint` en
  verde.

- [x] **T4. Modelos `RiotChallenge` y extensión de `GameAccount`, servicio de desafíos y cascada C6.**
  Depende de: T2, T3 (puede correr en paralelo con T5).
  Archivos: `backend/src/models/riotChallenge.ts` (nuevo), `backend/src/models/gameAccount.ts`,
  `backend/src/services/riotChallenges.ts` (nuevo), `backend/src/server.ts`,
  `backend/src/controllers/users.ts` (solo cascada C6),
  `backend/tests/unit/riotChallenges.test.ts` (nuevo),
  `backend/tests/controllers/riotChallengeCascade.test.ts` (nuevo).
  Cambios:
  - `RiotChallenge`: esquema con índices `{ user: 1, createdAt: -1 }`,
    `{ puuid: 1, status: 1, expiresAt: 1 }` y TTL `{ deleteAt: 1 }` (`expireAfterSeconds: 0`,
    P14-1); `toRiotChallengeJson(doc, now)` en lista blanca sin `puuid` (RNF-3).
  - `GameAccount`: `currentRank` opcional/`null`, `RankSnapshotSchema.canonicalTier?` (interno),
    `MatchRecordSchema.rankDelta?` (opcional), `pendingBlocks?` (solo en JSON si no vacío),
    `lastSuccessfulSyncAt?` (interno) y `riotLpBaseline?` (interno, nunca en JSON).
  - `services/riotChallenges.ts`: `findOpenChallenge`, `findChallengeByIdForUser`,
    `countRecentChallenges`, `openChallengesForPuuid`, `createChallengeAndCancelPrevious`,
    `incrementChallengeAttempts`, `cancelChallenge`, `cancelOpenChallengesForUsers`,
    `completeChallenge` (atómico sobre `status: "open"`, D104).
  - `server.ts`: `await RiotChallenge.init()` en `prepareDatabase()`.
  - `controllers/users.ts`: paso **C6** tras C5: `await RiotChallenge.deleteMany({ user: sessionUserId })`.
  Tests primero: pruebas de índices (incl. TTL `expireAfterSeconds: 0`), `deleteAt` adelantado al
  anular/completar antes de vencer (D87), `toRiotChallengeJson` sin `puuid`, `completeChallenge`
  solo gana una vez y falla si ya se anuló, `GameAccount` con `currentRank: null`/`pendingBlocks`/
  `rankDelta` ausente sin romper JSON de cuentas simuladas/Steam, y `riotChallengeCascade.test.ts`
  (borrar usuario elimina sus `RiotChallenge`, RF-29).
  RF-1, RF-4, RF-7, RF-10, RF-12, RF-13, RF-21, RF-23, RF-24, RF-27, RF-28, RF-29, RF-30, RF-31,
  RF-34, RF-36, RF-43, RF-45, RF-48, RF-53, RNF-3.
  Hecho cuando: las pruebas nuevas se ven en rojo y luego en verde; `userDeletion.test.ts`,
  `userDeletionCascade.test.ts`, `startup.test.ts`, `typecheck` y `lint` en verde.

- [x] **T5. Cliente HTTP de Riot, limitador asíncrono y bloqueo por usuario en memoria.**
  Depende de: T2, T3 (puede correr en paralelo con T4).
  Archivos: `backend/src/services/riotClient.ts` (nuevo), `backend/src/services/riotLimiter.ts`
  (nuevo), `backend/src/services/riotUserLock.ts` (nuevo),
  `backend/tests/unit/riotClient.test.ts` (nuevo),
  `backend/tests/unit/riotLimiter.test.ts` (nuevo).
  Cambios:
  - `riotClient.ts`: única pieza con red y `RIOT_API_KEY`; cabecera `X-Riot-Token` (nunca en URL),
    `fetchFn` inyectable (RNF-2), 6 métodos (`getAccountByRiotId`, `getAccountByPuuid`,
    `getSummonerByPuuid`, `getSoloRankByPuuid`, `getSoloMatchIds`, `getMatchById`), plazo de 8 s
    por consulta combinado con `opSignal` vía `AbortSignal.any` (RNF-6, RNF-7), nunca registra
    errores ni cabeceras con la clave (RNF-4).
  - `riotLimiter.ts`: `createRiotLimiter({ nowMs, sleep })` con `reserve(count)`,
    `acquire(reservation, signal)` (espaciado `< 1 s` cancelable por `signal`) y
    `release(reservation)` (libera sobrantes, D69).
  - `riotUserLock.ts`: `createRiotUserLock()` (`tryAcquire`/`release` en `Set<string>` por
    instancia, P14-2).
  Tests primero: `riotClient.test.ts` (cabecera `X-Riot-Token`, hosts por plataforma y región,
  404/401/403/429/5xx/error de red/JSON roto, timeout de 8 s controlado, clave falsa ausente de
  errores y del `logger` ante fallos) y `riotLimiter.test.ts` (reservas 2/24/24, rechazo al superar
  100 en 2 min, liberación de sobrantes en `release`, espaciado de 20/s cancelable por señal de
  60 s, bloqueo por usuario `tryAcquire`/`release`).
  RF-3, RF-11, RF-16, RF-25, RF-35, RF-37, RF-49, RF-50, RF-52, RNF-1, RNF-2, RNF-4, RNF-5, RNF-6,
  RNF-7.
  Hecho cuando: `riotClient.test.ts` y `riotLimiter.test.ts` se ven en rojo y luego en verde;
  `typecheck` y `lint` en verde.

- [x] **T6. Rutas `/api/riot` — disponibilidad, recuperación y creación de desafíos.**
  Depende de: T1, T4, T5.
  Archivos: `backend/src/controllers/riot.ts` (nuevo — `GET /`, `GET /challenges/current`,
  `POST /challenges`), `backend/src/app.ts` (`AppOptions.riotIntegration`, `operationTimeoutMs`,
  instancia de `riotUserLock` y `riotLimiter`, montaje `/api/riot`), `backend/src/index.ts`
  (construir `riotIntegration` desde `config.riot`), `backend/tests/controllers/riotHelpers.ts`
  (nuevo), `backend/tests/controllers/riot.test.ts` (nuevo).
  Cambios: implementar `GET /api/riot` (RF-38), `GET /api/riot/challenges/current` (RF-45: sin
  Riot, sin clave, sin límites, sin RF-49; devuelve `remainingSeconds`, `riotId` de Riot y `region`
  sin `puuid`), y `POST /api/riot/challenges` siguiendo el orden exacto de RF-22 (plan §5.1),
  incluyendo reemplazo del desafío abierto previo (RF-4), exclusión de íconos 0..28 con
  `crypto.randomInt` (RF-19), 429 sin íconos libres (RF-43), reserva de 2 consultas y plazo de
  60 s.
  Tests primero: `riot.test.ts` con cliente falso cubriendo 401 sin sesión/CSRF, `GET /` con/sin
  clave, `GET /challenges/current` (abierto, vacío, vencido, anulado, sin clave, sin llamar al
  doble, no bloqueado por RF-49, sin `puuid`) y cada escalón del orden de RF-22 (400 formato → 409
  lock → 409 ya verificada → 409 región manual distinta → 429 5/hora solo creados → 409 texto sin
  región → 503 sin clave → 503 limitador → 503 Riot/60 s → 404 sin cuenta/sin perfil → 409 puuid →
  429 sin íconos libres), reemplazo de desafío, exclusión de íconos y 201 sin `puuid`.
  RF-1, RF-3, RF-4, RF-5, RF-6, RF-18, RF-19, RF-20, RF-21, RF-22, RF-34, RF-37, RF-38, RF-43,
  RF-45, RF-49, RF-52, RNF-1, RNF-2, RNF-3, RNF-6, RNF-7.
  Hecho cuando: `riot.test.ts` se ve en rojo y luego en verde; `app.test.ts`, `startup.test.ts`,
  `typecheck` y `lint` en verde.

- [x] **T7. Confirmación de desafíos (`POST /api/riot/challenges/:id/confirm`) y `verifyAccount`.**
  Depende de: T6.
  Archivos: `backend/src/services/riotSync.ts` (nuevo — `readRiotAccountData`),
  `backend/src/services/verifyAccount.ts` (extensión para estado Riot + `unlinkUnverifiedElsewhere`
  anulando desafíos abiertos de LoL de los usuarios desvinculados, RF-29/D89),
  `backend/src/controllers/riot.ts` (`POST /challenges/:id/confirm`),
  `backend/tests/controllers/riotConfirm.test.ts` (nuevo).
  Cambios: implementar el flujo completo de confirmación (plan §5.2): paso 1 sin Riot (404 ajeno/
  inexistente → 409 completado → 409 lock → 429 10 intentos → 400 vencido/anulado → 409 otro
  verificó [anula, D91] → 503 sin clave → 503 limitador), paso 2 con Riot (cuenta intento, reserva
  24, libera sobrantes en `finally`, 503 perfil/ícono/60 s → 404 desaparecida → 400 ícono distinto →
  409 otro verificó tras ícono [anula] → lectura de Riot ID vigente [404 → RF-50 D95; otro fallo →
  Riot ID del desafío sin aviso D82], perfil [nivel raro → pendiente manteniendo `iconId` D92],
  rango y hasta 20 partidas [omitiendo sueltas que fallen D83]), paso 3 (comprobación atómica de
  anulación durante la confirmación → 400 RF-9 sin verificar, D104), `verifyAccount`, cierre y
  respuesta 200 `{ outcome: "verified", account, notice? }`.
  Tests primero: `riotConfirm.test.ts` cubriendo cada paso de RF-26, D82, D83, D91, D92, D94, D95,
  D97 (vence durante la confirmación → éxito vale), **D104** (anulación en paralelo mientras espera
  al doble con ícono coincidente → 400 RF-9, cuenta intento, ninguna cuenta verificada), fallo
  parcial por bloques con ambos avisos de RF-27 y sin espera mínima, tope de **35 consultas** en
  verificación completa (1 pedido + 9 fallidas + 1 exitosa, RNF-1), liberación de 23 consultas en
  fallos (D69), plazo de 60 s antes y después de confirmar el ícono (RNF-7, D98), y ausencia total
  de `puuid` en respuestas (RNF-3).
  RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-16, RF-23, RF-24, RF-25, RF-26, RF-27, RF-29, RF-30,
  RF-31, RF-32, RF-34, RF-36, RF-37, RF-38, RF-48, RF-49, RF-50, RF-52, RNF-1, RNF-2, RNF-3, RNF-6,
  RNF-7.
  Hecho cuando: `riotConfirm.test.ts` se ve en rojo y luego en verde; `verifyAccount` y pruebas de
  012/013 siguen en verde; `typecheck` y `lint` en verde.

- [x] **T8. Resincronización Riot, anulaciones en `/api/accounts`, resumen por juego y coincidencias.**
  Depende de: T7.
  Archivos: `backend/src/services/riotSync.ts` (`syncRiotAccount`),
  `backend/src/controllers/accounts.ts`, `backend/src/controllers/users.ts` (`gameSummaryJson`),
  `backend/src/services/matchInputs.ts`, `backend/src/controllers/matches.ts`,
  `backend/requests/riot.rest` (nuevo),
  `backend/tests/controllers/riotSyncAndMatches.test.ts` (nuevo).
  Cambios:
  - `accounts.ts`: (1) vincular, desvincular o editar región de una cuenta manual de LoL anula el
    desafío abierto del usuario (RF-29, D59); (2) `POST /:id/sync` en cuenta verificada con Riot
    delega en `syncRiotAccount` (orden RF-51: 409 lock → 503 sin clave antes de 429 → 429 espera
    mínima → 503 limitador → 503 cuenta/perfil → 404 RF-35 cuenta/región → 503 60 s; RF-53 parcial
    conserva bloques fallidos, devuelve 200 con `syncNotice` O-1 y no actualiza
    `lastSuccessfulSyncAt`; RF-14 al cambiar Riot ID llama a `unlinkUnverifiedElsewhere` anulando
    desafíos abiertos de otros D89; preserva `sources.lol` genérico de la spec 012, P14-3).
  - `users.ts`: `gameSummaryJson` omite `rankDelta` cuando es `undefined` (RF-12) y soporta
    `currentRank === null` (RF-13, RF-27).
  - `matchInputs.ts` y `matches.ts`: cuenta de LoL sin clasificar o con rango pendiente → excluida
    como candidata (RF-13, RF-44) y responde `409 "necesitas rango en Solo/Dúo para buscar en LoL"`
    al dueño después de los 400 de filtros y sin depender de la clave (RF-33, D57, D61); partidas o
    perfil pendientes no la sacan (D67, D80).
  Tests primero: `riotSyncAndMatches.test.ts` cubriendo todo RF-51 (incluido sin clave dentro de
  espera → 503), RF-53 (parcial con `syncNotice`, conserva bloques, sin espera), RF-35 (404 cuenta
  borrada y 404 transferida de región con cuenta intacta), RF-14 + D89 (cambio de Riot ID
  desvincula manual ajena y anula su desafío), RF-15 (cambiar ícono y resincronizar mantiene
  verificación), RF-30 end-to-end (incl. D78, D81, D102 y duración redondeada en `games/lol`), RF-29
  (vincular/editar región/desvincular manual anula desafío), RF-13/RF-33/RF-44 en `/api/matches`, y
  auditoría RNF-3 (sin `puuid` en todas las respuestas).
  RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36,
  RF-37, RF-38, RF-44, RF-49, RF-51, RF-52, RF-53, RNF-2, RNF-3, RNF-6, RNF-7.
  Hecho cuando: `riotSyncAndMatches.test.ts` se ve en rojo y luego en verde; `accountRealSync.test.ts`,
  `matches.test.ts`, `accounts.test.ts`, toda la suite del backend, `typecheck` y `lint` en verde.
  **Con esta tarea queda cerrado el backend (Bloque A).**

---

## Bloque B — Frontend y cierre (T9 a T12)

- [x] **T9. Frontend — dominio puro, Data Dragon, transporte 65 s, contrato y modo simulado.**
  Depende de: T8 (en orden de bloques; técnicamente independiente en archivos).
  Archivos: `frontend/src/domain/types.ts`, `frontend/src/domain/origins.ts`,
  `frontend/src/domain/riotDisplay.ts` (nuevo), `frontend/src/services/ddragon.ts` (nuevo),
  `frontend/src/services/http/transport.ts`, `frontend/src/services/http/httpClient.ts`,
  `frontend/src/services/apiContract.ts`, `frontend/src/services/http/httpApi.ts`,
  `frontend/src/services/mock/mockApi.ts`, `frontend/src/app/providers/queryKeys.ts`,
  `frontend/src/app/routes.ts`, `frontend/src/app/router.tsx`, `frontend/src/shared/utils/copy.ts`.
  Cambios:
  - `types.ts`: `GameAccount.currentRank: RankSnapshot | null`, `pendingBlocks?`,
    `MatchRecord.rankDelta?: number`, `RiotChallenge`, `RiotConfirmResult`, `SyncAccountResult`
    (`GameAccount & { syncNotice?: string }`).
  - `origins.ts`: actualizar `verifiedLabel('riot')` a **`'Verificada con Riot Games'`** (RF-40).
  - `riotDisplay.ts`: funciones puras `formatCountdown`, `formatMatchDate` (`dd/mm/aaaa` local),
    `formatMatchDelta` (`+N`/`−N`/`—`), `ddragonIconUrl`, `isBlockPending`,
    `isChallengeTerminalError`.
  - `services/ddragon.ts`: lectura cacheada en memoria de `versions.json` con respaldo (O-3, D93).
  - `transport.ts` y `httpClient.ts`: `timeoutMs?: number` opcional (por defecto 30 000 ms;
    `65_000` en `createChallenge`, `confirmChallenge` y `syncAccount`, P14-11).
  - `apiContract.ts`, `httpApi.ts`, `mockApi.ts`: grupo `riot` (`status`, `currentChallenge`,
    `createChallenge`, `confirmChallenge`); en `mockApi.riot` nunca simula nada (RF-42).
  - `routes.ts` y `router.tsx`: ruta protegida `ROUTES.riotVerify = '/verificar/riot'` (O-2) con
    carga diferida (`lazy`); claves `riotStatus`, `riotChallenge`, `ddragonVersion` en
    `queryKeys.ts`; literales de la spec en `copy.ts`.
  RF-1, RF-2, RF-7, RF-8, RF-9, RF-10, RF-12, RF-13, RF-24, RF-25, RF-27, RF-38, RF-40, RF-41,
  RF-42, RF-45, RF-50, RF-53, RNF-1, RNF-5, RNF-7.
  Hecho cuando: `npm run typecheck`, `npm run lint` y `npm run build` del frontend pasan sin
  errores, y una revisión del código confirma que ningún componente llama a `fetch` (principio 3) y
  que `mockApi.riot` nunca simula datos ni verificaciones de Riot.

- [x] **T10. Frontend — flujo de verificación con Riot (`/verificar/riot`) y botón de entrada.**
  Depende de: T9.
  Archivos: `frontend/src/features/riot/hooks.ts` (nuevo),
  `frontend/src/features/riot/notice.ts` (nuevo),
  `frontend/src/features/riot/components/RiotVerifyButton.tsx` (nuevo),
  `frontend/src/features/riot/pages/RiotVerifyPage.tsx` (nuevo),
  `frontend/src/features/riot/pages/riotVerifyPage.css` (nuevo, solo tokens de `tokens.css`),
  `frontend/src/features/profile/components/AccountRow.tsx`,
  `frontend/src/features/profile/components/LinkAccountForm.tsx`,
  `frontend/src/features/profile/pages/ProfilePage.tsx`,
  `frontend/src/features/profile/pages/SettingsPage.tsx`.
  Cambios:
  - `RiotVerifyButton`: oculto sin clave o cargando (RF-38), desactivado con texto en modo simulado
    (RF-42), navega a `/verificar/riot` con `state: { from: pathname }`; montado en `AccountRow`
    (LoL sin verificar en Perfil y Configuración) y `LinkAccountForm.aboveLol` (sin cuenta de LoL);
    oculto si ya hay LoL verificada (RF-39).
  - `RiotVerifyPage`: recupera desafío con `useCurrentRiotChallenge()` al montar/recargar (RF-45,
    D101, D103); si ya verificada redirige a `/perfil`; formulario pre-rellenado con cuenta manual
    de LoL (RF-46); pantalla del desafío con imagen Data Dragon (o `"Ícono n.º <id>"`), cuenta
    atrás `mm:ss` desde `remainingSeconds` (D100), 3 pasos fijos, `"Ya puse el ícono"`, `"Volver"`
    (sin `"Cancelar"`, D99), estado vencido/terminal desactivando confirmación y mostrando `"Pedir
    otro desafío"` (RF-2, RF-54), y errores mostrados junto al control correspondiente (RF-47, D77).
  - `ProfilePage`: muestra `riotNotice` (RF-7, RF-27) al volver de verificar.
  RF-2, RF-6, RF-7, RF-27, RF-38, RF-39, RF-42, RF-45, RF-46, RF-47, RF-54, RNF-1.
  Hecho cuando: `npm run typecheck`, `npm run lint` y `npm run build` del frontend en verde; todos
  los estilos usan solo `tokens.css`, sin `any`, `@ts-ignore` ni `dangerouslySetInnerHTML`.

- [x] **T11. Frontend — datos reales de Riot en Perfil, Configuración, Ficha de jugador y Coincidencias.**
  Depende de: T10.
  Archivos: `frontend/src/features/riot/components/RiotProfileBlock.tsx` (nuevo) + CSS,
  `frontend/src/features/profile/components/AccountRow.tsx`,
  `frontend/src/features/profile/components/GameSummaryPanel.tsx`,
  `frontend/src/features/profile/components/MatchLedger.tsx`,
  `frontend/src/features/profile/pages/ProfilePage.tsx`,
  `frontend/src/features/profile/pages/SettingsPage.tsx`,
  `frontend/src/features/matches/pages/MatchesPage.tsx`.
  Cambios:
  - `RiotProfileBlock`: nivel (`Nivel N`) e ícono de invocador desde Data Dragon (si `onError`, no
    muestra nada en su lugar — D50; si `profile` está pendiente, muestra `"Datos pendientes de Riot
    Games"` en el nivel manteniendo el ícono si existe `iconId` — D92) con `OriginTag('riot')`;
    montado en `AccountRow` (cubre Perfil, Configuración y Ficha de jugador; ausente en
    `MatchEntry`, RF-40).
  - `AccountRow` y `GameSummaryPanel`: `"Datos pendientes de Riot Games"` cuando `'rank'` está
    pendiente (RF-27), `"sin clasificar"` cuando `verifiedWith === 'riot'` y `currentRank === null`
    (RF-13), tier/división tal como los da Riot (`GOLD II`, `MASTER` sin `I`, RF-36), y
    `RIOT_RESYNC_NOTE` junto a `"Resincronizar"` (RF-41).
  - `MatchLedger`: `"Datos pendientes de Riot Games"` si `'matches'` está pendiente (RF-27), fecha
    `dd/mm/aaaa` en zona local para `origin === 'riot'` (RF-12, D47) y `"—"` cuando `rankDelta`
    falta (RF-12).
  - `ProfilePage` y `SettingsPage`: mostrar aviso de resincronización parcial (`syncNotice`, RF-53)
    y errores de `sync` (incluido 404 de región transferida RF-35).
  - `MatchesPage`: ante error `409` en `GET /api/matches`, mostrar el aviso con el texto de la API
    (`"necesitas rango en Solo/Dúo para buscar en LoL"`) en lugar de la lista (RF-33, RF-44).
  RF-12, RF-13, RF-27, RF-33, RF-35, RF-36, RF-40, RF-41, RF-44, RF-53.
  Hecho cuando: `npm run typecheck`, `npm run lint` y `npm run build` del frontend en verde; sin
  colores a mano fuera de `tokens.css`; `MatchEntry` muestra `"Verificada con Riot Games"` junto a
  `"Datos de Riot Games"` y nunca nivel ni ícono.

- [x] **T12. Cierre, documentación y validación manual.**
  Depende de: T8, T11.
  Archivos: `AGENTS.md`, `PRODUCT.md`, `README.md`, `MEMORY.md`,
  `specs/014-verificacion-riot/validation.md` (nuevo) y casillas de criterios de finalización en
  `specs/014-verificacion-riot/spec.md` (solo al completar la validación).
  Cambios:
  - Ejecutar suite completa del backend sin conexión a Internet (`npm test --script-shell=bash`),
    `typecheck` y `lint` del backend, y `typecheck`, `lint` y `build` del frontend.
  - Verificar estáticamente: `package.json` del backend y frontend sin dependencias nuevas (RNF-5),
    sin claves de Riot en el repositorio ni en `git status` (RNF-4), y sin `.only` ni `any`.
  - Documentar en `README.md` la variable `RIOT_API_KEY` y el procedimiento paso a paso de
    renovación manual cada 24 h en `.env` + reinicio para el servidor del curso.
  - Actualizar `AGENTS.md`, `PRODUCT.md` («Evidence on Hand» y «Capabilities») y `MEMORY.md`.
  - Redactar `specs/014-verificacion-riot/validation.md` con los resultados de la verificación en
    Chrome DevTools (1280 y 375 px) de todos los RF de interfaz y dejar el guion del recorrido
    manual con cuenta real de LoL (pedir ícono, ponérselo, confirmar, ver rango/partidas,
    resincronizar, volver al ícono propio, desvincular).
  RF-1 a RF-54, RNF-1 a RNF-7.
  Hecho cuando: suite completa del backend (sin red), `typecheck`, `lint` y `build` de ambos
  paquetes en verde; `package.json` sin cambios; cero fugas de clave; documentación actualizada y
  `validation.md` completo con comprobaciones en Chrome DevTools y guía del recorrido real.
  *(Cerrada el 2026-11-19: comprobaciones automáticas, auditoría estática, documentación y
  `validation.md` completados; la inspección visual en Chrome DevTools [Fase 5, `reviewer`] y el
  recorrido manual con cuenta real de LoL [equipo] quedan abiertos en `validation.md` y sin marcar
  en `spec.md`.)*
