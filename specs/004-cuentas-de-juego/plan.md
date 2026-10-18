# Plan 004 — Cuentas de juego y rango simulado
Estado: aprobado (2026-10-17). Plan y tareas (T1–T10) aprobados por el usuario: "Apruebo y
vamos con spec 005".
Spec: `specs/004-cuentas-de-juego/spec.md` (aprobada el 2026-10-17, con todas sus DP).

**Precondición:** las specs 001, 002 y 003 deben estar aprobadas e implementadas antes de
empezar T1; `backend/` aún no existe (sección 0).
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, secciones 2, 4.2
(RT-07 a RT-12), 5.1, 5.4, 8 y 11, y RF-15, salvo lo que la spec anula en "Qué prevalece
sobre la referencia".

## 0. Precondiciones y estado real
- `backend/` **no existe** (comprobado el 2026-10-17; `MEMORY.md` dice lo mismo). Las specs
  001, 002 y 003 están en **borrador**, sin `plan.md` ni `tasks.md` y sin implementar.
- Esta spec solo se puede implementar cuando 001, 002 y 003 estén aprobadas e implementadas
  y dejen, como mínimo (estructura de la sección 5.1 de la referencia):
  - `backend/src/app.ts` (exporta `app`, conexión a la base, `express.json`, `cookieParser`,
    `errorHandler` con `{ error: string }` y el 500 "error interno del servidor").
  - `backend/src/utils/middleware.ts` con `withUser` (401 "sesión no iniciada" / "token
    inválido" / "sesión expirada") y `request.userId` tipado (`src/types/express.d.ts`).
  - `backend/src/models/user.ts` (modelo `User`).
  - `backend/src/controllers/users.ts` con `DELETE /api/users/:id` (spec 003, RF-11) y la
    resolución de `me`.
  - `backend/tests/controllers/test_helper.ts` con `loginAs(user) → { agent, csrfToken }`,
    `usersInDb` y `nonExistingId`, y `npm test` / `npm run typecheck` funcionando.
- Si al empezar T1 alguno de esos archivos no existe, el implementer **para** y lo reporta:
  esta spec no los crea (salvo lo que se indica abajo como "crear si no existe").
- Ninguna dependencia nueva (RNF-8, DP-12): todo usa `express`, `mongoose`, `node:test`,
  `node:assert` y `supertest`, que ya trae la spec 001.

## 1. Archivos y responsabilidades

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `backend/src/domain/games.ts` | Catálogo de juegos del backend: `GameId`, `GAMES` (nombre, `handlePattern`, `regions`, etiqueta del identificador), `isGameId`. Crear si no existe (copia de `frontend/src/domain/games.ts` **sin** `source`, `accent` ni la `normalizeRank` antigua). Si existe, se elimina su `normalizeRank` y se re-exporta la de `rankScale.ts` (una sola normalización en el backend). | RF-6, RNF-2 |
| `backend/src/domain/rankScale.ts` | Escalones por juego, normalización (DP-26), banda de puntos (DP-34) y rango de generación del simulador. | RF-36, DP-2, DP-26, DP-34 |
| `backend/src/domain/rankSimulator.ts` | Proveedor simulado puro: hash, generador pseudoaleatorio, identificador canónico, regla de verificada, escalón por número de lectura y `simulateReading`. | RF-34, RF-35, RF-36, RF-41, RF-42, RF-43, RNF-7 |
| `backend/src/domain/accountRules.ts` | Validación pura y mensajes exactos: vincular, editar, filtros del listado, región, formato de id. | RF-2, RF-6, RF-7, RF-13, RF-22, RF-38, RF-40, DP-6, DP-10, DP-19, DP-23, DP-35 |
| `backend/src/domain/accountState.ts` | Transiciones puras del estado de la cuenta: estado inicial al vincular, resincronización, unión de partidas, decisión de agregar fotografía, tasa de victorias, tendencia y resumen. | RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36, RNF-7 |
| `backend/src/services/rankProvider.ts` | Interfaz única `RankProvider` y su única implementación `simulatedRankProvider` (envuelve `simulateReading`). Sin red ni claves. | RF-34 (RF-15 de la referencia) |
| `backend/src/services/accountWrites.ts` | Escritura con reintento optimista sobre una cuenta propia (`updateOwnedAccount`) y vinculación con compensación (`linkAccount`). | RF-5, RF-33, RF-39, RF-45, DP-29 |
| `backend/src/utils/clock.ts` | `export const clock = { now: (): Date => new Date() }`. Único punto donde se lee el reloj. | RNF-1, RNF-7, RNF-9 |
| `backend/src/utils/middleware.ts` (modificar) | Agrega `withExistingUser`: 401 "sesión no iniciada" si `User.exists({ _id: request.userId })` es nulo. | RF-44, DP-37 |
| `backend/src/models/gameAccount.ts` | Modelo `GameAccount` con subesquemas de fotografía y partida, índice único `{ user, gameId }`, `optimisticConcurrency` y `toJSON`. | RF-4, RF-5, RF-37, DP-32, DP-33, RT-07, RT-08, RT-11, RT-12 |
| `backend/src/models/user.ts` (modificar) | Asegura `accounts: [ObjectId → GameAccount]` y que `toJSON` lo elimina. | RF-33, DP-16 |
| `backend/src/controllers/accounts.ts` | `accountsRouter` en `/api/accounts`: listar, obtener, vincular, editar, desvincular, resincronizar. | RF-1 a RF-11, RF-22, RF-29, RF-33, RF-37 a RF-40, RF-44, RF-45 |
| `backend/src/controllers/users.ts` (modificar) | Agrega `GET /:id/games/:gameId` (resumen) y la cascada de cuentas en `DELETE /:id`. | RF-12, RF-13, RF-14, RF-39 |
| `backend/src/app.ts` (modificar) | Monta `accountsRouter` en `/api/accounts` (antes del fallback y de `unknownEndpoint`). | RF-1 |
| `backend/requests/accounts.rest` | Peticiones manuales: login → vincular → resincronizar → resumen → editar → desvincular (RT-19). | — |
| `backend/tests/unit/rankScale.test.ts` | Normalización, escalones y bandas. | criterios de normalización |
| `backend/tests/unit/rankSimulator.test.ts` | Lectura, evolución y verificada. | RF-35, RF-36, RF-41 a RF-43 |
| `backend/tests/unit/accountRules.test.ts` | Validación y orden de errores. | RF-2, RF-6, RF-22, RF-38, RF-40 |
| `backend/tests/unit/accountState.test.ts` | Unión de partidas, historial, tasa, tendencia. | RF-10, RF-15, RF-28, DP-9, DP-36 |
| `backend/tests/unit/gameAccountModel.test.ts` | `toJSON` sin conexión (`new GameAccount({...}).toJSON()`). | RF-37, DP-32, DP-33 |
| `backend/tests/controllers/accounts.test.ts` | Endpoints de `/api/accounts`, concurrencia y fallo forzado. | RF-1 a RF-11, RF-15, RF-22, RF-28, RF-29, RF-33, RF-37 a RF-45 |
| `backend/tests/controllers/gameSummary.test.ts` | Resumen por juego y cascada al eliminar usuario. | RF-12, RF-13, RF-14, RF-39 |
| `backend/tests/controllers/test_helper.ts` (modificar) | Agrega `accountsInDb()` (vía `toJSON`), `rawAccountsInDb()` (`lean()`, con `matches` y `readingNumber`) y `FIXED_NOW`. | — |

## 2. Funciones puras (firmas)
Ninguna lee el reloj: el instante llega como `now: Date` ("hoy" como parámetro,
constitución principio 3). Ninguna importa Express ni Mongoose.

```ts
// domain/rankScale.ts
export interface RankStep { tier: string; division?: string }      // division omitida si el tier no la tiene
export function ladder(gameId: GameId): readonly RankStep[];       // LoL 31, CS2 7, R6 36
export function stepIndexOf(gameId: GameId, tier: string, division?: string): number | null; // null si el tier no existe
export function normalizeRank(gameId: GameId, tier: string, division?: string): number;
export function normalizeStep(gameId: GameId, stepIndex: number): number;
export function pointsBand(gameId: GameId, stepIndex: number): { min: number; max: number | null }; // null = sin tope
export function generationRange(gameId: GameId, stepIndex: number): { min: number; max: number };

// domain/rankSimulator.ts
export function hash32(text: string): number;                       // FNV-1a 32 bits
export function createRng(seed: number): () => number;              // mulberry32, [0, 1)
export function randInt(rng: () => number, min: number, max: number): number;
export function canonicalHandle(handle: string): string;            // trim + toLowerCase
export function isVerified(canonical: string): boolean;
export function evolveStep(previous: number, delta: -1 | 0 | 1, size: number): number; // clamp
export function stepAt(gameId: GameId, canonical: string, readingNumber: number): number;
export interface SimulatedMatch { id: string; gameId: GameId; playedAt: Date; result: 'win' | 'loss';
  summary: string; durationMinutes: number; rankDelta: number }
export interface Snapshot { tier: string; division?: string; points: number; normalized: number; recordedAt: Date }
export interface SimulatedReading { snapshot: Snapshot; matches: SimulatedMatch[]; mainMatchId: string; verified: boolean }
export function simulateReading(input: { gameId: GameId; canonicalHandle: string;
  readingNumber: number; now: Date }): SimulatedReading;

// domain/accountRules.ts
export const ACCOUNT_ERRORS: { ... };                                // textos exactos de la sección 7
export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };
export function isValidId(value: unknown): value is string;        // /^[0-9a-fA-F]{24}$/
export function normalizeRegion(gameId: GameId, value: unknown): string | null; // grafía de la lista o null
export function validateLinkPayload(body: unknown): RuleResult<{ gameId: GameId; handle: string; region: string }>;
export function validateAccountEdit(account: { gameId: GameId; handle: string }, body: unknown):
  RuleResult<{ region?: string }>;                                   // región normalizada si vino
export function parseAccountFilters(query: Record<string, unknown>, sessionUserId: string):
  RuleResult<{ userId?: string; gameId?: GameId }>;

// domain/accountState.ts
export interface AccountState { currentRank: Snapshot; rankHistory: Snapshot[]; matches: SimulatedMatch[];
  readingNumber: number; lastSyncedAt: Date; verified: boolean }
export function initialState(reading: SimulatedReading, now: Date): AccountState;      // número 0
export function applySync(state: AccountState, reading: SimulatedReading, readingNumber: number,
  now: Date): AccountState;
export function shouldAppendSnapshot(previous: Snapshot, next: Snapshot): boolean;     // DP-9
export function compareMatches(a: SimulatedMatch, b: SimulatedMatch): number;          // orden RF-28
export function mergeMatches(saved: SimulatedMatch[], incoming: SimulatedMatch[], mainMatchId: string):
  SimulatedMatch[];                                                                     // máx. 20
export function winRate(matches: readonly { result: 'win' | 'loss' }[]): number;
export function trend(current: Snapshot, history: readonly Snapshot[]): number;
export function recentMatches(matches: SimulatedMatch[]): SimulatedMatch[];            // 8 primeras
```

Tipado: `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` están activos (RT-02):
`division` se omite (nunca `division: undefined`) y todo acceso por índice se comprueba.

## 3. Escala, normalización y bandas (`rankScale.ts`)

Escalones (posición 0 = el más bajo):
- LoL: Iron IV, Iron III, Iron II, Iron I, Bronze IV … Diamond I (posiciones 0–27), Master
  (28), Grandmaster (29), Challenger (30). Tamaño 31.
- CS2: Grey (0), Light Blue (1), Blue (2), Purple (3), Pink (4), Red (5), Gold (6). Tamaño 7.
- R6: Copper V (0) … Copper I (4), Bronze V (5) … Diamond I (34), Champion (35). Tamaño 36.

Los tiers con divisiones son los siete primeros de LoL y de R6; las divisiones van de la
más baja a la más alta (`IV, III, II, I` y `V, IV, III, II, I`).

```
normalizeRank(gameId, tier, division):
  t = posición del tier en la escala; si no existe → 0
  si el tier no tiene divisiones → paso = primer escalón del tier (se ignora division)
  si no → d = índice de division en las divisiones del juego; si ausente o desconocida → 0
          paso = primer escalón del tier + d
  return normalizeStep(gameId, paso)
normalizeStep(gameId, paso) = Math.round((paso * 100) / (tamaño − 1))
```
`paso * 100` se calcula antes de dividir para no depender de decimales binarios; ningún
caso da exactamente ,5, y `Math.round` redondea las mitades hacia arriba en positivos.
Valores esperados (criterios de la spec): Iron IV 0, Diamond I 90, Master 93, Grandmaster
97, Challenger 100, Grey 0, Light Blue 17, Purple 50, Gold 100, Copper V 0, Diamond I de R6
97, Champion 100.

Bandas de puntos (DP-34) y rango de generación del simulador:

| Juego | Escalón i | Banda (validación) | Rango de generación |
| --- | --- | --- | --- |
| LoL | 0–27 (con división) | 0–99 | 0–99 |
| LoL | 28–30 (Master+) | ≥ 0 | 0–999 |
| CS2 | 0–5 | 5000·i … 5000·i + 4999 | igual |
| CS2 | 6 (Gold) | ≥ 30000 | 30000–34999 |
| R6 | 0–34 | 1000 + 100·i … 1000 + 100·i + 99 | igual |
| R6 | 35 (Champion) | ≥ 4500 | 4500–4999 |

El rango de generación siempre está dentro de la banda; la banda abierta solo se usa para
validar (pruebas y esquema).

## 4. Algoritmo del proveedor simulado (`rankSimulator.ts`)

### 4.1 Primitivas
```
hash32(text):                         // FNV-1a sobre unidades UTF-16
  h = 0x811c9dc5
  para cada c en text (charCodeAt): h = Math.imul(h ^ c, 0x01000193) >>> 0
  return h >>> 0
createRng(seed):                      // mulberry32
  a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; t = a
                 t = Math.imul(t ^ (t >>> 15), t | 1)
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
                 return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
randInt(rng, min, max) = min + Math.floor(rng() * (max − min + 1))
pick(rng, lista)      = lista[randInt(rng, 0, lista.length − 1)]
seedFor(gameId, canonical, k) = hash32(`${gameId}|${canonical}|${k}`)
canonicalHandle(h) = h.trim().toLowerCase()
```
Cada lectura k tiene su propio generador `rng_k = createRng(seedFor(gameId, canonical, k))`.
Así todo depende solo de (juego, identificador canónico, número de lectura) (RF-35, RF-43);
`now` no entra en ninguna semilla y la región no es una entrada (DP-5).

### 4.2 Escalón por número de lectura (RF-42)
```
stepAt(gameId, canonical, n):
  size = ladder(gameId).length
  paso = randInt(rng_0, 0, size − 1)              // primer valor de rng_0
  para k = 1..n:
    delta = randInt(rng_k, −1, 1)                 // primer valor de rng_k
    paso = evolveStep(paso, delta, size)
  return paso
evolveStep(prev, delta, size) = min(size − 1, max(0, prev + delta))
```
Garantías: el escalón de n difiere del de n − 1 como mucho en 1 y nunca sale de la escala;
en el escalón más alto un delta +1 queda en el mismo escalón (no sube), en el más bajo un −1
tampoco baja. La lectura 0 se reparte uniformemente en toda la escala, así que la
demostración tiene cuentas de todos los niveles.

### 4.3 Lectura completa (RF-36, RF-43, DP-8, DP-31)
```
simulateReading({ gameId, canonicalHandle: c, readingNumber: n, now }):
  rng = rng_n ; rng()                             // descarta el 1.er valor (ya usado por stepAt)
  paso = stepAt(gameId, c, n)
  { tier, division } = ladder(gameId)[paso]
  { min, max } = generationRange(gameId, paso); points = randInt(rng, min, max)
  snapshot = { tier, division (solo si existe), points, normalized: normalizeStep(gameId, paso), recordedAt: now }
  count = randInt(rng, 1, 8)
  edad = 0 ; matches = []
  para j = 0..count − 1:
    si j > 0: edad += randInt(rng, 20, 180)       // minutos; ≥ 20 ≥ 1 (RF-43)
    result = rng() < 0.5 ? 'win' : 'loss'
    durationMinutes = randInt(rng, DUR[gameId].min, DUR[gameId].max)
    mag = randInt(rng, DELTA[gameId].min, DELTA[gameId].max)
    rankDelta = result == 'win' ? mag : −mag
    summary = summaryFor(gameId, rng, result)
    matches.push({ id: `m-${n}-${j}`, gameId, playedAt: new Date(now − edad·60000), result,
                   summary, durationMinutes, rankDelta })
  return { snapshot, matches, mainMatchId: `m-${n}-0`, verified: isVerified(c) }
```
- Orden de consumo de `rng` fijo: (descartado), puntos, número de partidas y, por partida:
  [edad si j > 0], resultado, duración, magnitud, campos del resumen. Cambiar este orden
  cambia todos los valores: no se toca sin pasar por la spec.
- Partida principal: `m-n-0`, la única con `playedAt = now`; las demás tienen edad
  estrictamente creciente, así que sus fechas son distintas y anteriores.
- Identificadores `m-<n>-<j>`: distintos dentro de la lectura y nunca repetidos entre
  lecturas de distinto número; por tanto la principal de n no aparece en 0..n − 1 (RF-42).
  Desvincular y volver a vincular reinicia en `m-0-*`, pero en una cuenta nueva.
- Constantes:

| Juego | DUR (min) | DELTA | Resumen (`·` = U+00B7 con espacios) |
| --- | --- | --- | --- |
| lol | 20–45 | 12–25 LP | `<campeón> · <k>/<d>/<a>`; campeón de `Ahri, Jinx, Thresh, Lee Sin, Lux, Ezreal, Leona, Yasuo`; k 0–15, d 0–12, a 0–20 (en ese orden) |
| r6 | 15–40 | 15–35 MMR | `<operador> · <b> bajas`; operador de `Ash, Thermite, Sledge, Mute, Valkyrie, Thatcher, Smoke, Doc`; b 0–12 |
| cs2 | 25–50 | 50–300 | `<mapa> · <a>-<b>`; mapa de `Mirage, Inferno, Nuke, Ancient, Anubis, Dust II, Train`; x 0–11; victoria `13-x`, derrota `x-13` |

  La variación por partida es informativa y no se reconcilia con los puntos de la
  fotografía (la spec no lo exige).

### 4.4 Regla de verificada (RF-41)
```
isVerified(c) = (suma de c.charCodeAt(i) para todo i) % 2 === 0
```
Depende solo del identificador canónico (y, por el patrón, del juego); es igual en todas
las lecturas y para todos los usuarios. Se eligió porque se calcula a mano: las pruebas
pueden escribirse **antes** que el código con valores exactos.

Ejemplos que fijan las pruebas (calculados a mano):

| Juego | Verificadas | No verificadas |
| --- | --- | --- |
| lol | `jugador1#las` (1152), `Jugador3#LAS` (canónico `jugador3#las`, 1154) | `jugador2#las` (1153), `jugador4#las` (1155) |
| r6 | `jugador2` (798), `jugador4` (800) | `jugador1` (797), `jugador3` (799) |
| cs2 | `76561190000000001` (852), `76561190000000003` (854) | `76561190000000002` (853), `76561190000000004` (855) |

Conjuntos de 100 identificadores válidos por juego (i = 1..100):
- LoL: `jugador<i>#las` → 51 verificados.
- R6: `jugador<i>` → 49 verificados.
- CS2: `7656119` + i con ceros a la izquierda hasta 10 dígitos (`76561190000000001` …
  `76561190000000100`) → 51 verificados.

Los tres quedan dentro de 40–60. (Cálculo: la paridad solo depende de la suma de los
dígitos de i, que es impar en 51 de los 100 valores; LoL y CS2 verifican con suma impar y
R6 con suma par, por la paridad de la parte fija.)

## 5. Modelo `GameAccount` (`models/gameAccount.ts`)

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `user` | ObjectId → `User` | required, index. En JSON: `userId` (string). |
| `gameId` | String | required, `enum: ['lol','r6','cs2']` |
| `handle` | String | required. Se guarda sin espacios en los extremos y con sus mayúsculas (DP-19). Sin `trim` ni `lowercase` en el esquema: lo hace el controlador. |
| `region` | String | required, con la grafía de la lista (DP-35). |
| `currentRank` | `RankSnapshotSchema` | required |
| `rankHistory` | [`RankSnapshotSchema`] | orden de lectura (DP-36), sin límite (DP-9) |
| `matches` | [`MatchRecordSchema`] | máx. 20, orden de RF-28. **Interno** (DP-32). |
| `readingNumber` | Number | required, entero ≥ 0, default 0. **Interno** (DP-33). |
| `lastSyncedAt` | Date | required |
| `verified` | Boolean | default `false`; lo fija el proveedor (5.4 de la referencia) |
| índice | `{ user: 1, gameId: 1 }` | unique (RT-11, RF-5) |
| opciones | `optimisticConcurrency: true` | DP-29 |

- `RankSnapshotSchema` (`_id: false`): `tier` String required; `division` String opcional;
  `points` Number required (entero); `normalized` Number required 0–100; `recordedAt` Date
  required.
- `MatchRecordSchema` (`_id: false`): `matchId` String required; `gameId`; `playedAt` Date;
  `result` enum `win|loss`; `summary`; `durationMinutes`; `rankDelta`. Se llama `matchId`
  (no `id`) para no chocar con el virtual `id` de Mongoose.
- `toJSON` (RT-07, RF-37, DP-32, DP-33): agrega `id` (string) y `userId` (string), agrega
  `simulated: true`, elimina `_id`, `__v`, `user`, `matches` y `readingNumber`. Las fechas
  salen en ISO 8601 al serializar. Forma resultante:
  `{ id, userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified, simulated }`.
- La marca `simulated` no se guarda: la añade `toJSON` siempre, porque toda cuenta sale del
  proveedor simulado (RF-34) y así ningún cuerpo puede alterarla (RF-7).
- El esquema repite las validaciones (RT-08) como red de seguridad, pero los mensajes que
  ve el cliente salen de `accountRules.ts` (validación antes de tocar la base), para
  garantizar el texto y el orden de RF-6.

## 6. Interfaz REST

Todas las rutas usan `withUser` y luego `withExistingUser` (RF-1, RF-44). Cada controlador
toma `const now = clock.now()` una sola vez al inicio. Respuestas de error:
`response.status(s).json({ error })`.

| Método y ruta | Orden de comprobaciones (RF-29) | Éxito |
| --- | --- | --- |
| `GET /api/accounts?user=&game=` | sesión → `parseAccountFilters` (usuario primero, luego juego) | 200 `GameAccount[]` (`find(filtro)`; `user=me` → sesión; usuario inexistente → `[]`) |
| `GET /api/accounts/:id` | sesión → `isValidId` → existencia | 200 cuenta |
| `POST /api/accounts` | sesión → `validateLinkPayload` → duplicado | 201 cuenta |
| `PUT /api/accounts/:id` | sesión → id → existencia → dueño → `validateAccountEdit` (RF-22, luego RF-38) | 200 cuenta |
| `DELETE /api/accounts/:id` | sesión → id → existencia → dueño | 204 |
| `POST /api/accounts/:id/sync` | sesión → id → existencia → dueño | 200 cuenta |
| `GET /api/users/:id/games/:gameId` | sesión → id (o `me`) → juego → usuario existe → cuenta existe (RF-13) | 200 `{ account, recentMatches, winRate, trend }` |

Flujos:
```
vincular(body, userId, now):
  v = validateLinkPayload(body)              // RF-6, RF-7: solo gameId, handle, region
  si existe GameAccount { user, gameId } → 400 RF-5
  reading = rankProvider.read({ gameId, canonicalHandle(handle), readingNumber: 0, now })
  state = initialState(reading, now)
  linkAccount(userId, v, state)              // services/accountWrites.ts, ver sección 8
  → 201 account.toJSON()

editar(account, body):                       // dentro de updateOwnedAccount
  r = validateAccountEdit(account, body)     // RF-22 → RF-38; cuerpo vacío → { } (RF-40)
  si r.value.region: account.region = r.value.region
  // no se lee gameId, handle se ignora si es "el mismo"; nada más cambia (RF-7, RF-8)

desvincular(id, userId):
  findById → 404 / 403
  GameAccount.deleteOne({ _id }) ; User.updateOne({ _id: userId }, { $pull: { accounts: id } })
  → 204

resincronizar(account, now):                 // dentro de updateOwnedAccount
  n = account.readingNumber + 1
  reading = rankProvider.read({ gameId, canonicalHandle(account.handle), readingNumber: n, now })
  next = applySync(estado(account), reading, n, now)
  asignar currentRank, rankHistory, matches, readingNumber = n, lastSyncedAt, verified

resumen(id|me, gameId, sessionUserId):
  RF-13 en orden → account = findOne({ user, gameId })
  matches = recentMatches(account.matches)   // 8 primeras en orden RF-28
  → { account: toJSON, recentMatches: matches.map(m → { id: m.matchId, gameId, playedAt ISO,
        result, summary, durationMinutes, rankDelta }),
      winRate: winRate(matches), trend: trend(currentRank, rankHistory) }
```
Transiciones puras (`accountState.ts`):
```
initialState(reading, now) = { currentRank: reading.snapshot, rankHistory: [reading.snapshot],
  matches: mergeMatches([], reading.matches, reading.mainMatchId), readingNumber: 0,
  lastSyncedAt: now, verified: reading.verified }
applySync(s, reading, n, now) = { currentRank: reading.snapshot,
  rankHistory: shouldAppendSnapshot(s.currentRank, reading.snapshot) ? [...s.rankHistory, reading.snapshot] : s.rankHistory,
  matches: mergeMatches(s.matches, reading.matches, reading.mainMatchId),
  readingNumber: n, lastSyncedAt: now, verified: reading.verified }
shouldAppendSnapshot(p, q) = p.tier ≠ q.tier || p.division ≠ q.division || p.points ≠ q.points
compareMatches(a, b) = (b.playedAt − a.playedAt) || (a.id < b.id ? 1 : a.id > b.id ? −1 : 0)
mergeMatches(saved, incoming, mainId):
  todos = saved ++ [m ∈ incoming | m.id ∉ ids(saved)]   // se conserva la guardada
  ordenar(todos, compareMatches)
  si |todos| ≤ 20 o mainId ∈ ids(todos[0..19]) → todos[0..19]
  si no → ordenar([main] ++ (todos sin main)[0..18], compareMatches)
winRate(ms) = Math.round(victorias · 100 / |ms|)        // |ms| ≥ 1 siempre; 0 si vacío por seguridad
trend(cur, hist) = hist vacío ? 0 : cur.normalized − hist[0].normalized
```
La comparación de identificadores usa `<`/`>` de JavaScript (unidades UTF-16): coincide con
"código Unicode" porque los identificadores son ASCII (`m-9-0` > `m-10-0`).

## 7. Errores (textos exactos, DP-6)

| Código | Texto | Cuándo |
| --- | --- | --- |
| 401 | `sesión no iniciada` | sin cookie (spec 002) o usuario de la sesión eliminado (RF-44) |
| 401 | `token inválido` / `sesión expirada` | spec 002, RF-11 y RF-12 |
| 400 | `id con formato inválido` | id de cuenta o de usuario sin formato (RF-29, RF-13); filtro `user` repetido, vacío o inválido (RF-2) |
| 400 | `Juego no válido.` | juego al vincular (RF-6), filtro `game` (RF-2), resumen (RF-13) |
| 400 | `Riot ID no válido: usa el formato Nombre#TAG.` | RF-6, LoL |
| 400 | `Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo.` | RF-6, R6 |
| 400 | `SteamID64 no válido: son 17 dígitos que empiezan por 7656119.` | RF-6, CS2 |
| 400 | `Región no válida para <nombre>.` (`League of Legends`, `Rainbow Six Siege`, `Counter-Strike 2`) | RF-6, RF-38 |
| 400 | `Ya tienes una cuenta vinculada en este juego.` | RF-5 (también el E11000 del índice) |
| 400 | `El identificador no se puede editar: desvincula la cuenta y vuelve a vincularla.` | RF-22 |
| 403 | `No puedes modificar la cuenta de otro jugador.` | RF-11 |
| 404 | `Cuenta no encontrada.` | RF-29, RF-39 |
| 404 | `Usuario no encontrado.` | RF-13 |
| 404 | `El jugador no tiene una cuenta vinculada en este juego.` | RF-13 |
| 500 | `error interno del servidor` | errorHandler de la spec 001 (RF-45) |

Ningún 409 ni 503 en esta spec. Ningún texto nombra a Riot, Ubisoft, Valve, FACEIT ni otra
fuente (RNF-2); "Riot ID", "Ubisoft ID" y "SteamID64" nombran el formato del identificador,
no una fuente de datos.

Reglas de validación (`accountRules.ts`):
- "Valor válido" exige `typeof value === 'string'`; `null`, número, objeto o texto vacío
  tras `trim()` son inválidos.
- Cuerpo que no es objeto plano (ausente, arreglo, `null`) se trata como `{}`: al vincular
  da "Juego no válido."; al editar, 200 sin cambios (RF-40).
- `validateLinkPayload`: juego (`isGameId`) → identificador (`handlePattern` del juego
  sobre el texto sin espacios en los extremos) → región (`normalizeRegion`). Primer error
  y nada más.
- `validateAccountEdit`: si `'handle' in body` y (`typeof !== 'string'` o
  `canonicalHandle(body.handle) !== canonicalHandle(account.handle)`) → RF-22. Después, si
  `'region' in body` y `normalizeRegion(account.gameId, body.region) === null` → RF-38.
  Nunca lee `gameId` del cuerpo.
- `parseAccountFilters`: `user` presente → debe ser un único texto no vacío y `me` o
  `isValidId`; si no, "id con formato inválido". Solo si `user` es válido o ausente se
  revisa `game`: único texto no vacío y `isGameId`; si no, "Juego no válido.". Un valor
  repetido llega como arreglo (parser `simple` de Express 5) y es inválido.

## 8. Concurrencia y fallos (RF-5, RF-39, RF-45, DP-29)

`services/accountWrites.ts`:
```
updateOwnedAccount(accountId, userId, apply, maxAttempts = 5):
  repetir hasta maxAttempts:
    account = GameAccount.findById(accountId)           → null: 404 "Cuenta no encontrada."
    si account.user ≠ userId                            → 403
    err = apply(account)                                → si err: 400 con su texto
    try { await account.save(); return 200 account }
    catch VersionError        → reintentar (otra escritura ganó: se relee y se aplica encima)
    catch DocumentNotFoundError → 404 "Cuenta no encontrada." (desvinculada en medio)
  tras maxAttempts → lanzar Error → 500 (la cuenta no cambió)
```
- Editar y resincronizar usan `updateOwnedAccount`; `save()` corre los validadores (RT-10)
  y, con `optimisticConcurrency`, solo escribe si la versión no cambió. Dos
  resincronizaciones simultáneas: una gana, la otra relee y usa el número siguiente; el
  resultado es el de aplicarlas en serie, sin partidas ni fotografías repetidas o perdidas.
- `save()` sobre un documento borrado no lo recrea (no hay `upsert`): una desvinculación
  nunca se deshace; la otra operación responde 404 si llegó después.
- RF-45: cada operación sobre una cuenta existente hace **una sola escritura** del
  documento; si falla, nada cambia (incluido `readingNumber`). Los reintentos solo ocurren
  ante `VersionError`; cualquier otro error llega al `errorHandler` (500).
- Vincular (`linkAccount`):
  ```
  account = await GameAccount.create({ user: userId, gameId, handle, region, ...state })
      catch E11000 → 400 RF-5 (dos vinculaciones simultáneas del mismo juego)
  r = await User.updateOne({ _id: userId }, { $addToSet: { accounts: account._id } })
  si r.matchedCount === 0:                              // usuario eliminado entretanto
      await GameAccount.deleteOne({ _id: account._id }) → 401 "sesión no iniciada"
  → 201
  ```
- Eliminar usuario (spec 003, `DELETE /api/users/:id`): primero `User.deleteOne`, después
  `GameAccount.deleteMany({ user: id })`. Con este orden, cualquier intercalado con una
  vinculación termina sin cuentas del usuario: si la cuenta se creó antes del
  `deleteMany`, este la borra; si se creó después, el `$addToSet` no encuentra al usuario y
  la vinculación la borra y responde 401.
  Límite reconocido: entre la creación y la compensación existe un intervalo de
  milisegundos en que la cuenta existe (ver "Riesgos").
- Las pruebas llaman `await GameAccount.init()` en `before` para que el índice único exista
  antes de probar duplicados simultáneos.

## 9. Instante actual en las pruebas (RNF-1, RNF-9)
- Producción y desarrollo: `clock.now()` devuelve `new Date()`.
- Pruebas de controladores: `t.mock.method(clock, 'now', () => new Date(FIXED_NOW))`
  (`mock` de `node:test`, se restaura solo al terminar la prueba). Para la segunda
  resincronización a otra hora se vuelve a mockear con otro instante.
- Pruebas unitarias: pasan `now` como argumento.
- Sin variables de entorno nuevas ni dependencias nuevas. Las pruebas no abren red salvo
  la base de prueba de la spec 001.

## 10. Decisiones técnicas (con la alternativa descartada)

| # | Decisión | Alternativa descartada y motivo |
| --- | --- | --- |
| P-1 | Generador propio FNV-1a + mulberry32 en `domain/`. | Librería de aleatoriedad con semilla: dependencia nueva (RNF-8). `Math.random`: no reproducible (RF-35). `crypto.createHash`: funciona, pero es API de Node en el dominio y más lento para un dato que no necesita seguridad. |
| P-2 | Un generador por número de lectura (`rng_k`) y escalón calculado recorriendo 0..n. | Guardar el escalón anterior y derivar el siguiente: la lectura dependería del estado guardado, no solo de (juego, canónico, n), contra RF-35. Coste O(n) despreciable. |
| P-3 | Verificada por paridad de la suma de códigos del identificador canónico. | Bit del hash: igual de determinista, pero los ejemplos solo se conocen ejecutando el código, así que las pruebas no podrían escribirse antes (constitución, principio 4). |
| P-4 | Identificadores de partida `m-<n>-<j>`, principal `m-<n>-0`. | Identificadores derivados del hash: podrían colisionar entre lecturas y romper RF-42. Repetir partidas de la lectura anterior: más realista pero obliga a reconciliar fechas; la unión de RF-28 se prueba igualmente a nivel unitario. |
| P-5 | `clock` mutable inyectado con `t.mock.method`. | `mock.timers` sobre `Date`: afecta también a la expiración del JWT y a `timestamps` de Mongoose. Fábrica `createApp({ now })`: cambia la forma de `app.ts` de la spec 001 (RT-04). Cabecera de prueba con el instante: sería explotable en producción. |
| P-6 | `optimisticConcurrency` + `save()` + reintento (máx. 5). | `findOneAndUpdate` condicionado: salta los validadores del esquema (RT-10). Transacciones: exigen replica set, que la base de prueba local no garantiza. |
| P-7 | Vincular = crear + `$addToSet` con compensación; eliminar usuario = borrar usuario y luego cuentas. | Transacción multi-documento: misma restricción de replica set. Borrar cuentas antes que el usuario: una vinculación intercalada dejaría una cuenta huérfana. |
| P-8 | `simulated: true` añadido por `toJSON`, no guardado. | Campo en la base: podría quedar `false` en documentos viejos o ser alterado; todas las cuentas son simuladas (RF-34). |
| P-9 | Validación en `accountRules.ts` antes de tocar la base; el esquema solo como red. | Usar los `ValidationError` de Mongoose: el orden y el texto dependerían del orden de los campos del esquema (RF-6 exige primer error en orden fijo). |
| P-10 | Resumen en `controllers/users.ts` (`/api/users/:id/games/:gameId`). | Ruta bajo `/api/accounts`: cambia la URL que fija HU-08 de la referencia y que consume la interfaz. |
| P-11 | Partidas guardadas en el campo `matches` con `matchId`. | `recentMatches` con `id`: el nombre de la referencia confunde con lo que devuelve el resumen y `id` choca con el virtual de Mongoose. |
| P-12 | **Decisión del usuario (2026-10-17): "Acepto el borrado posterior (Recomendado)".** RF-39 (eliminar usuario durante una vinculación) se garantiza con la compensación de P-7 y la sección 8: el estado final nunca deja una cuenta del usuario eliminado, aceptando el intervalo de milisegundos en que la cuenta existe antes de borrarse. | Transacción multi-documento con replica set: la base de prueba local no la garantiza y exige configurar MongoDB de otra forma. |
| P-13 | **Decisión del usuario (2026-10-17): "No, basta con lo del plan (Recomendado)".** Los valores esperados de las pruebas de controladores (RNF-1) se calculan con las mismas funciones puras (`simulateReading` + `initialState` / `applySync`) y el mismo instante fijo (sección 11); no se registran valores literales tras implementar. | Fijar en las pruebas valores literales copiados de la salida del generador tras implementar: detectaría un cambio accidental del orden de consumo (4.3), pero esos valores no podrían escribirse antes que el código (constitución, principio 4). |

## 11. Estrategia de pruebas
- `node --test` vía `npm test` (`NODE_ENV=test`, `--test-concurrency=1`), `node:assert`
  con `strictEqual` / `deepStrictEqual`, `supertest.agent` con cabecera CSRF, base de
  prueba de la spec 001. `after(() => mongoose.connection.close())` en cada archivo de
  `controllers/`.
- Unitarias (sin base): `rankScale`, `rankSimulator`, `accountRules`, `accountState`,
  `gameAccountModel` (`toJSON` sobre un documento no guardado).
- Propiedades del simulador: se recorren los 100 identificadores de cada juego y n = 0..30,
  comprobando banda, escala, ±1 escalón, 1–8 partidas, ids distintos, principal nueva y
  fechas; mismo n a dos instantes distintos → todo igual salvo fechas desplazadas por la
  diferencia.
- Valores exactos en controladores: el valor esperado se calcula con las funciones puras
  (`simulateReading` + `initialState` / `applySync`) con el mismo instante fijo, y se compara
  con la respuesta y con `rawAccountsInDb()`. Así RNF-1 se cumple sin copiar a mano salidas
  del generador.
- Fallo forzado (RF-45): `t.mock.method(GameAccount.prototype, 'save', async () => { throw new Error('fallo forzado') })`
  → 500 y `rawAccountsInDb()` idéntico al anterior; la siguiente resincronización usa el
  mismo número.
- Concurrencia: `Promise.all` de dos peticiones con el mismo agente.
- Cada RF de error se prueba con el texto exacto y, en escrituras, con el estado de la base.

## 12. Trazabilidad

| RF / RNF | Implementación | Prueba |
| --- | --- | --- |
| RF-1 | `withUser` en `accountsRouter` y en la ruta del resumen | `accounts.test.ts` "sin sesión → 401" (cada ruta) |
| RF-2 | `parseAccountFilters`, `GET /api/accounts` | `accountRules.test.ts`; `accounts.test.ts` "listar" (filtros, repetidos, vacíos, ambos inválidos, inexistente → []) |
| RF-3 | `GET /api/accounts/:id` | `accounts.test.ts` "obtener" |
| RF-4 | `initialState`, `linkAccount` | `accountState.test.ts`; `accounts.test.ts` "vincular" (3 juegos) |
| RF-5 | consulta previa + índice único | `accounts.test.ts` "duplicado" y "dos vinculaciones simultáneas" |
| RF-6 | `validateLinkPayload` | `accountRules.test.ts` (orden y textos); `accounts.test.ts` (nulo, vacío, espacios, no texto) |
| RF-7 | `validateLinkPayload` / `validateAccountEdit` solo leen sus campos | `accounts.test.ts` "campos ignorados al vincular y editar" |
| RF-8 | `validateAccountEdit` + `updateOwnedAccount` | `accounts.test.ts` "editar región" (`" las "` → `LAS`, rango y partidas iguales) |
| RF-9 | `DELETE /api/accounts/:id` | `accounts.test.ts` "desvincular" (204, no queda en la base) |
| RF-10 | `applySync` + `updateOwnedAccount` | `accountState.test.ts`; `accounts.test.ts` "resincronizar" |
| RF-11 | comprobación de dueño | `accounts.test.ts` "ajena → 403" (PUT, DELETE, sync; base sin cambios) |
| RF-12, RF-13 | ruta del resumen | `gameSummary.test.ts` |
| RF-14 | cascada en `DELETE /api/users/:id` | `gameSummary.test.ts` "eliminar usuario borra sus cuentas" |
| RF-15, RF-28 | `mergeMatches` | `accountState.test.ts`; `accounts.test.ts` "tras varias resincronizaciones ≤ 20" |
| RF-22 | `validateAccountEdit` | `accountRules.test.ts`; `accounts.test.ts` |
| RF-29 | orden en controladores | `accounts.test.ts` "orden de errores" (un caso por salto) |
| RF-33 | `$addToSet` / `$pull` | `accounts.test.ts` (estado de `User.accounts`; usuario sin `accounts` en JSON) |
| RF-34 | `services/rankProvider.ts` | revisión: sin `fetch`, `http` ni variables nuevas; pruebas offline |
| RF-35, RF-36, RF-42, RF-43 | `rankSimulator.ts` | `rankSimulator.test.ts`; `accounts.test.ts` "misma lectura para dos usuarios / otra región / otras mayúsculas" |
| RF-37 | `toJSON` | `gameAccountModel.test.ts`; `accounts.test.ts` y `gameSummary.test.ts` "toda cuenta lleva `simulated` y no `matches` ni `readingNumber`" |
| RF-38, RF-40 | `validateAccountEdit` | `accountRules.test.ts`; `accounts.test.ts` |
| RF-39 | `updateOwnedAccount`, `linkAccount`, orden del borrado de usuario | `accounts.test.ts` "concurrencia"; `gameSummary.test.ts` "eliminación simultánea a vinculación" |
| RF-41 | `isVerified` | `rankSimulator.test.ts` (ejemplos, 100 por juego, estable) |
| RF-44 | `withExistingUser` | `accounts.test.ts` "credencial de usuario eliminado → 401" |
| RF-45 | una escritura por operación | `accounts.test.ts` "fallo forzado en sync" |
| RNF-1, RNF-9 | `clock`, sin red | toda la suite con `FIXED_NOW`; T10 corre sin Internet |
| RNF-2 | textos sin fuentes; `games.ts` sin `source` | `accounts.test.ts` "ninguna respuesta menciona Riot/Ubisoft/Valve/FACEIT/Steam Web API" |
| RNF-3 | `toJSON` | `accounts.test.ts` forma exacta de la cuenta |
| RNF-7 | `domain/*.ts` puros | unitarias sin base ni reloj |
| RNF-8 | sin `npm install` | T10 revisa que `package.json` no cambió en dependencias |

## 13. Riesgos
- Specs 001–003 sin aprobar ni implementar: esta spec no puede empezar hasta que existan
  (sección 0). Si cambian nombres (`withUser`, `loginAs`, `test_helper.ts`), se ajusta el
  plan antes de implementar.
- RF-39 (eliminar usuario vs. vincular) se garantiza en el estado final, con un intervalo
  transitorio de milisegundos sin transacciones (P-7). Aceptado por el usuario el
  2026-10-17 (P-12).
- La normalización de DP-26 difiere de la del frontend (`frontend/src/domain/games.ts`); la
  copia del dominio en el backend deja de ser idéntica hasta que la spec 007 la adopte.
- El orden de consumo del generador (4.3) es contrato: cambiarlo cambia todas las lecturas
  de la demostración.
