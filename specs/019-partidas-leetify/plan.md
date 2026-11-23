# Plan 019 — Partidas reales de CS2 con Leetify
Estado: aprobado (2026-11-22, por el usuario al pedir el plan, las tareas y la implementación); implementado.

Spec: `specs/019-partidas-leetify/spec.md` (aprobada por el usuario el 2026-11-22). Base: rama
`feature/vinculacion-steam-riot` (commit `7f31c6d`). Sin dependencias nuevas y sin cambios en
Mongo (RNF-4).

## 0. Estado real del código (comprobado el 2026-11-22)
- `backend/src/services/leetifyClient.ts`: una sola consulta, `GET /v3/profile?steam64_id=`, con
  la clave opcional en `_leetify_key` y `redirect: "error"`. Solo expone `readPremier`.
- `backend/src/domain/leetify.ts`: `parseLeetifyProfile(status, body)` lee solo `ranks.premier`.
- `backend/src/services/realSources.ts`: `withTimeout` y `readPremierWithTimeout` (8 s,
  `SOURCE_TIMEOUT_MS`; sin cliente → fallo y nunca red).
- `backend/src/domain/sources.ts`: `THIRD_PARTY_BLOCKS.steam = { rank: "leetify" }`, así que hoy
  `origins.matches` de una CS2 verificada con Steam es `simulated`.
- `backend/src/controllers/users.ts`: `GET /:id/games/:gameId` devuelve `account`,
  `recentMatches` (las 8 primeras guardadas), `winRate` y `trend`. El router no recibe Leetify.
- Coincidencias (`domain/matching.ts`, `controllers/matches.ts`): solo usan rango, verificación y
  disponibilidad; nunca las partidas (spec, RF-12). No se tocan.
- Frontend: `GameSummaryPanel` pinta el porcentaje de victorias y `MatchLedger` (con
  `OriginTag`); la usan `ProfilePage` (ficha propia) y `PlayerGamesSection` (ficha de otro
  jugador, spec 008). `LeetifyAttribution` (logo + «View on Leetify») ya existe. El modo simulado
  nunca verifica con Steam (spec 013, D10), así que nunca produce el origen Leetify.

## 1. Archivos y responsabilidades
| Archivo | Cambio | RF |
|---|---|---|
| `backend/src/domain/leetify.ts` | `LeetifyMatch`, `LeetifyMatchesReading`, `parseLeetifyMatches`, `LEETIFY_MATCHES_LIMIT = 8`, `LEETIFY_MATCH_ERRORS` | RF-2, RF-3, RF-7, RF-8, RF-9 |
| `backend/src/domain/sources.ts` | `THIRD_PARTY_BLOCKS.steam.matches = "leetify"` | RF-5 (spec 012, RF-5) |
| `backend/src/services/leetifyClient.ts` | consulta del perfil compartida; nuevo método `readRecentMatches` | RF-1, RNF-2 |
| `backend/src/services/realSources.ts` | `readMatchesWithTimeout` (8 s) | RF-7 |
| `backend/src/controllers/users.ts` | resumen sin partidas ni `winRate` cuando `origins.matches === "leetify"`; ruta nueva `GET /:id/games/:gameId/leetify-matches` | RF-1, RF-2, RF-4, RF-6, RF-7, RF-8 |
| `backend/src/app.ts` | pasa `leetifyClient` al router de usuarios | RF-1 |
| `backend/src/services/userTarget.ts` | la guardia de usuarios reconoce `/:id/games/:gameId/leetify-matches` como el resumen (sesión y segmentos); sin esto la ruta quedaría sin sesión (añadido al implementar) | RF-1 |
| `frontend/src/domain/types.ts`, `services/apiContract.ts` | tipo `LeetifyMatch`, `LeetifyMatches`; `winRate?` opcional; método `users.getLeetifyMatches` | RF-1 |
| `frontend/src/services/http/httpApi.ts` | `GET /users/:id/games/:gameId/leetify-matches` | RF-1 |
| `frontend/src/services/mock/mockApi.ts` | mismas comprobaciones que el resumen y 404 «esta cuenta no obtiene sus partidas de Leetify» (nunca hay origen Leetify en el simulado) | RF-11 |
| `frontend/src/domain/leetifyMatches.ts` (+ test) | textos de resultado y marcador | RF-3 |
| `frontend/src/features/profile/components/LeetifyMatchList.tsx` | bloque de partidas de Leetify con carga, vacío/fallo y atribución | RF-2, RF-3, RF-5, RF-7, RF-8, RF-10 |
| `frontend/src/features/profile/components/GameSummaryPanel.tsx` | con `origins.matches === "leetify"`: sin porcentaje, `LeetifyMatchList` en lugar de `MatchLedger` | RF-2, RF-4 |
| `frontend/src/shared/utils/copy.ts`, `app/providers/queryKeys.ts` | textos y clave de consulta | RF-7, RF-8 |

## 2. Funciones puras
```
parseLeetifyMatches(status, body) → { kind: "matches", matches: LeetifyMatch[] } | { kind: "failed" }
  404                         → matches []            (sin perfil, RF-8)
  ≠ 200                       → failed                (RF-7)
  body no es objeto           → failed
  recent_matches null/ausente → matches []            (RF-8)
  recent_matches no es arreglo→ failed
  cada elemento: válido si
    finished_at  texto con fecha legible (Date.parse finito)
    map_name     texto no vacío
    outcome      "win" | "loss" | "tie"
    score        arreglo de exactamente 2 enteros ≥ 0
  los inválidos se omiten (RF-9)
  orden: finished_at descendente; se toman los 8 primeros (RF-2, D3)
LeetifyMatch = { id, finishedAt (ISO), map, outcome, score: [n, n] }
  id = `id` si es texto no vacío; si no, finishedAt (solo sirve de clave en la lista)
```
Frontend (`domain/leetifyMatches.ts`): `outcomeLabel("win"|"loss"|"tie") → "Victoria" | "Derrota" |
"Empate"`; `scoreLabel([a, b]) → "a – b"` en el orden que entrega Leetify (RF-3, sin recalcular).
La fecha usa el formateador de fecha de partida que ya existe (`formatMatchDate`).

## 3. Endpoint
`GET /api/users/:id/games/:gameId/leetify-matches` (con sesión, misma guardia del router):
1. id inválido → 400; juego inválido → 400; usuario inexistente → 404; sin cuenta → 404 (mismos
   mensajes que el resumen).
2. Cuenta cuyo `origins.matches` no es `leetify` → 404 «esta cuenta no obtiene sus partidas de
   Leetify».
3. `readMatchesWithTimeout(leetify, verification.externalId)`:
   - `matches` → 200 `{ available: true, matches }`.
   - `failed` → 200 `{ available: false, matches: [] }` (RF-7: no es un error de la ficha).
4. No escribe nada (RF-6).

Resumen `GET /:id/games/:gameId`: si `origins.matches === "leetify"`, `recentMatches: []` y sin
`winRate` (RF-2, RF-4); el resto igual. Las partidas simuladas guardadas no se borran (fuera de
alcance) y nunca salen con origen Leetify.

## 4. Interfaz
- `GameSummaryPanel`: si `origins.matches === 'leetify'`, no pinta el porcentaje y monta
  `LeetifyMatchList` con `userId` (o `me`), `gameId` y `handle`.
- `LeetifyMatchList`: consulta propia con TanStack Query (clave
  `['u', userId, 'leetify-matches', targetId, gameId]`, `staleTime: 0`, sin caché adicional);
  mientras carga, «Cargando partidas de Leetify…» (RF-10); con `available: false`, error de red
  o lista vacía, «No hay partidas disponibles en Leetify» (RF-7, RF-8); con partidas, la etiqueta
  «Datos de Leetify» + `LeetifyAttribution` y una tabla Fecha · Mapa · Resultado · Marcador
  (RF-3, RF-5). El resto del panel no espera esta consulta (RF-10).
- El panel recibe el id del dueño desde `summary.account.userId`, que ya viene en el resumen.

## 5. Decisiones
- **P19-1. Ruta propia en vez de meter las partidas en el resumen.** Así el resto de la ficha no
  espera a Leetify (RF-10) y un fallo no rompe el resumen (RF-7). Descartada: llamar a Leetify
  dentro de `GET /:id/games/:gameId` (hasta 8 s de espera para toda la ficha).
- **P19-2. Fallo como 200 `available: false`.** La ficha muestra el mismo texto que sin
  partidas; un 5xx activaría el manejo genérico de errores de la interfaz. Descartado: 503.
- **P19-3. `readRecentMatches` opcional en `LeetifyClient`.** El cliente real lo implementa; los
  dobles de pruebas anteriores (solo `readPremier`) siguen valiendo y, sin el método, la lectura
  es un fallo y nunca hay red. Descartado: hacerlo obligatorio y tocar cinco dobles ajenos.
- **P19-4. Origen `leetify` del bloque de partidas en `blockOrigins`.** Mantiene la regla de la 012
  de que el origen se calcula y nunca se guarda. Cambia lo que esperan algunas pruebas de las
  specs 012, 013 y 015 (`matches: "simulated"` → `"leetify"` para CS2 con Steam); se actualizan.
- **P19-5. Mapa tal como lo entrega Leetify** (p. ej. `de_mirage`), sin traducir: RF-3 pide los
  valores sin recalcular.

## 6. Pruebas
- Backend (node:test, primero en rojo): `tests/unit/leetify.test.ts` (`parseLeetifyMatches`),
  `tests/unit/leetifyClient.test.ts` (`readRecentMatches`: misma consulta, clave, fallos),
  `tests/unit/realSources.test.ts` (`readMatchesWithTimeout`), `tests/unit/sources.test.ts`
  (origen), `tests/controllers/leetifyMatches.test.ts` (ruta: 200 con partidas, fallo, sin
  perfil, sin escritura en la base, 400/404, cuenta no Leetify; resumen sin `winRate` ni
  partidas). Leetify siempre simulado (RNF-1).
- Frontend: Vitest para `domain/leetifyMatches.ts`; build, typecheck y lint en verde.

## 7. Riesgos
- R1. El formato real de `outcome` podría no ser `win`/`loss`/`tie`: entonces RF-9 omite las
  partidas y se ve «No hay partidas disponibles en Leetify»; se comprueba en el recorrido real.
- R2. Cada visita a la ficha hace una consulta a Leetify (sin caché, fuera de alcance).
