# Plan 004 — Cuentas de juego y rango simulado
Estado: **aprobado (cambio T8b aprobado el 2026-10-18)**: "Apruebo, haz T8b". Servidor de
prueba en loopback IPv4 para las pruebas HTTP (P-18). El usuario decidió "Investigar antes
de T9"; el reviewer encontró y reprodujo la causa de los fallos intermitentes (404 con
cuerpo vacío y "socket hang up") y el usuario decidió incluir también `getFreePort` de
`tests/server/helpers.ts`. Alcance: secciones 0, 1, 9, 10 (P-18) y 11. Solo cambian
utilidades y montaje/cierre de las pruebas: no cambia `src/`, ningún RF, DP, banda, regla
del simulador, texto de error ni aserción de ninguna prueba. `spec.md` no cambia.
Respuestas del usuario del 2026-10-18 que fija este cambio: `getFreePort` recibe el host
("Que reciba el host"; `null` = sin host, para la prueba "sin HOST escucha en todas las
interfaces" de `startup.test.ts`); no se toca el plan de la spec 003 ("No, solo el plan
004"); se corrige la tabla de la sección 10 ("Sí, corregirla"); se aceptan tal cual
`tests/unit/loopbackServer.test.ts` y, en `app.test.ts`, `after(closeTestServers)` sin
`mongoose.disconnect()`.

Versión anterior: **aprobado (cambio T3b aprobado el 2026-10-18)**: "Aprobar y ajustar P-17".
Cambio: aislamiento de `domain/` (la idea la aceptó antes el usuario de palabra: "vale, me
convenciste, hagamos el cambio que habías propuesto"). Alcance: secciones 0, 1, 2 y nueva
2.1 (regla de aislamiento), 10 (P-17), 11 y 12 (RNF-7), más la corrección de la errata del
formato de CS2 en la tabla de 4.3 (el código ya hace lo correcto). No cambia ningún RF, DP,
banda, regla del simulador ni texto de error. Decisiones del usuario del 2026-10-18 que
fija este cambio: la constante se llama `INVALID_ID_MESSAGE`; el test resuelve las rutas
con `node:path`, comprueba que no pasa en vacío y vigila solo `services/`, `utils/`,
`models/` y `controllers/` (no prohíbe `express`, `mongoose` ni `node:*`);
`services/userTarget.ts` no reexporta `INVALID_ID_MESSAGE`; T3b exige `npm run lint` en
verde. P-17 se ajustó según lo pedido (sin el motivo del principio 3; RNF-7 matizado).

Versión anterior: **aprobado (reaprobación 2026-10-18)**: "Apruebo el plan y las tareas, sigue con
T1". Reaprobado tras el cambio del 2026-10-18 ("Corregir plan primero":
alinear el plan con el backend real de las specs 001–003, ya implementadas). La versión
anterior la aprobó el usuario el 2026-10-17 ("Apruebo y vamos con spec 005").
Alcance del cambio: secciones 0, 1, 5 (redacción de `toJSON` en lista blanca, misma forma),
6 (sesión, guardias y montaje), 8 (índice al arrancar), 9, 10 (P-5 y nuevas P-14 a P-16),
11, 12 (RF-1, RF-29, RF-44), 13 y la nueva "Preguntas abiertas". No cambia ningún RF, DP,
banda, regla del simulador ni texto de error. Las preguntas Q1 y Q2 quedaron resueltas
por el usuario el 2026-10-18 ("Mantener la spec" y "Mantener clock.ts"; ver "Preguntas
abiertas", al final).
Spec: `specs/004-cuentas-de-juego/spec.md` (aprobada el 2026-10-17, con todas sus DP; sin
cambios).

**Precondición:** specs 001, 002 y 003 implementadas (comprobado el 2026-10-18, sección 0).
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, secciones 2, 4.2
(RT-07 a RT-12), 5.1, 5.4, 8 y 11, y RF-15, salvo lo que la spec anula en "Qué prevalece
sobre la referencia".

## 0. Precondiciones y estado real
Comprobado el 2026-10-18 sobre el código (rama `marselo`, después de `b0c6863
feat(users)`): las specs 001, 002 y 003 están implementadas. Esto es lo que esta spec usa
del backend existente, con sus firmas reales:
- `backend/src/app.ts`: fábrica `createApp({ jwtSecret, nodeEnv, now? }): Express`; **no**
  exporta un `app` ya creado. `now` es el reloj de las credenciales, en **segundos Unix**
  (D11 de la 001). Monta, en este orden, `express.json` (102 400 bytes, `strict`),
  `cookieParser`, `/api/users`, `/api/auth`, `unknownEndpoint` y `errorHandler` (`{ error }`;
  500 "error interno del servidor"). No conecta a la base.
- `backend/src/server.ts`: `connectDatabase(db)` y `prepareDatabase()` (hoy solo
  `User.init()`), que `startServer` llama antes de escuchar.
- `backend/src/utils/middleware.ts`:
  - `createWithUser({ jwtSecret, now }): RequestHandler`. Exige la cookie `token` **y** la
    cabecera `X-CSRF-Token` en todas las peticiones, también en las GET (pasos 1 a 4 de
    `checkSession`: 401 "sesión no iniciada" / "token inválido" / "sesión expirada"). En el
    paso 5 **ya comprueba que el usuario existe** y, si no, responde 401 "token inválido"
    (spec 002, RF-22). Deja `request.userId`.
  - `createUserRoutesGuard({ withUser })`: se monta sin ruta antes de las rutas `/:id` de
    usuario; comprueba la sesión y que el segmento se puede decodificar (400 "id con formato
    inválido"), porque Express 5 decodifica `:id` al emparejar y con `%zz` lanzaría su
    propio error antes de mirar la sesión.
- `backend/src/types/express.d.ts`: `request.userId?: string`.
- `backend/src/services/userTarget.ts`: `SELF_ALIAS = "me"`, `OBJECT_ID_PATTERN`,
  `matchUserRoute(method, path)` (solo `/`, `/:id` y `/:id/availability`), `decodeSegment` y
  `resolveUserTarget(decoded, sessionUserId) → { ok: true, id, own } | { ok: false, error }`.
- `backend/src/utils/errors.ts`: `MESSAGES.invalidId = "id con formato inválido"`, que esta
  spec reutiliza. `MESSAGES.forbidden` no se usa: RF-11 tiene su propio texto (DP-6).
- `backend/src/models/user.ts`: modelo `User` (`UserFields`, `UserDocument`) con `toJSON` en
  **lista blanca** (`toPublicUserJson`). No tiene campo `accounts`.
- `backend/src/controllers/users.ts`: `createUsersRouter({ jwtSecret, nodeEnv, now })`, con
  `DELETE /:id` (spec 003, RF-11: `User.deleteOne` del usuario de la sesión y 204).
- `backend/tests/controllers/helpers.ts` (**no existe** `test_helper.ts`): `authApp(overrides?)`,
  `signUp(app, data?) → { agent, csrf, cookie, response, id, email }`,
  `loginAs(app, email, password) → { agent, csrf, cookie, response }`,
  `withSession(request, csrf)`, `rawCookieRequest(...)`, `nonExistingId()`, `ISO_MS_Z` y
  `HEX24_LOWER`. **No existe `usersInDb`**, y esta spec no lo necesita: las pruebas consultan
  `User` directamente, como hace `users.test.ts`.
  - Estado tras T8 (cambio T8b aprobado el 2026-10-18): `authApp` devuelve un
    `Express` sin escuchar y `registerUser`, `loginAs`, `signUp` y `rawCookieRequest`
    reciben `app: Express`. supertest hace entonces `listen(0)` sin host en cada petición
    (Node escucha en `::`) y conecta a `127.0.0.1`; en macOS ese puerto puede estar ocupado
    en `127.0.0.1` o `0.0.0.0` por otro proceso, que responde 404 vacío o corta la conexión
    (P-18). T8b cambia estas firmas (sección 1, fila de `helpers.ts`).
  - `backend/tests/server/helpers.ts`: `getFreePort()` sondea el puerto con
    `probe.listen(0, cb)` (en `::`), aunque `startup.test.ts` lo usa con host `127.0.0.1`.
    Lo corrige T8b.
- Patrón de las pruebas de controladores (`users.test.ts`): `before` →
  `connectDatabase(testConfig().db)` y `Model.init()`; `beforeEach` → `deleteMany({})`;
  `afterEach` → `mock.restoreAll()`; `after` → `mongoose.disconnect()`.
- `backend/src/domain/` todavía no existe: lo crea T1 (es lo previsto).
- Estado tras T3 (comprobado el 2026-10-18; cambio T3b aprobado el 2026-10-18):
  `backend/src/domain/accountRules.ts` importa `MESSAGES` de `../utils/errors.ts` y
  `OBJECT_ID_PATTERN` y `resolveUserTarget` de `../services/userTarget.ts`, contra la regla
  de la sección 2.1. Lo corrige T3b (P-17) sin cambiar el comportamiento.
- Si al empezar una tarea alguno de estos elementos no está o tiene otra firma, el
  implementer **para** y lo reporta.
- Ninguna dependencia nueva (RNF-8, DP-12): todo usa `express`, `mongoose`, `node:test`,
  `node:assert` y `supertest`, que ya trae la spec 001.

## 1. Archivos y responsabilidades

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `backend/src/domain/games.ts` | Catálogo de juegos del backend: `GameId`, `GAMES` (nombre, `handlePattern`, `regions`, etiqueta del identificador), `isGameId`. Crear si no existe (copia de `frontend/src/domain/games.ts` **sin** `source`, `accent` ni la `normalizeRank` antigua). Si existe, se elimina su `normalizeRank` y se re-exporta la de `rankScale.ts` (una sola normalización en el backend). | RF-6, RNF-2 |
| `backend/src/domain/rankScale.ts` | Escalones por juego, normalización (DP-26), banda de puntos (DP-34) y rango de generación del simulador. | RF-36, DP-2, DP-26, DP-34 |
| `backend/src/domain/rankSimulator.ts` | Proveedor simulado puro: hash, generador pseudoaleatorio, identificador canónico, regla de verificada, escalón por número de lectura y `simulateReading`. | RF-34, RF-35, RF-36, RF-41, RF-42, RF-43, RNF-7 |
| `backend/src/domain/userId.ts` (nuevo, T3b) | Formato del identificador de usuario, sin dependencias fuera de `domain/`: `SELF_ALIAS`, `OBJECT_ID_PATTERN`, `INVALID_ID_MESSAGE` (`"id con formato inválido"`; nombre fijado por el usuario el 2026-10-18), el tipo `UserTarget` y `resolveUserTarget`, movidos tal cual desde `services/userTarget.ts`. Único ajuste: `resolveUserTarget` devuelve `INVALID_ID_MESSAGE` en lugar de `USER_TARGET_MESSAGES.invalidId` (mismo texto). | RF-2, RF-13 (formato); RF-5, RF-6, RF-18, RF-20 de la 003 (sin cambios); RNF-7; P-17 |
| `backend/src/domain/accountRules.ts` | Validación pura y mensajes exactos: vincular, editar, filtros del listado, región, formato de id. Importa solo de `domain/` (`userId.ts`, `games.ts`, `rankSimulator.ts`); `ACCOUNT_ERRORS.invalidId` = `INVALID_ID_MESSAGE` (T3b, P-17). | RF-2, RF-6, RF-7, RF-13, RF-22, RF-38, RF-40, DP-6, DP-10, DP-19, DP-23, DP-35 |
| `backend/src/domain/accountState.ts` | Transiciones puras del estado de la cuenta: estado inicial al vincular, resincronización, unión de partidas, decisión de agregar fotografía, tasa de victorias, tendencia y resumen. | RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36, RNF-7 |
| `backend/src/services/rankProvider.ts` | Interfaz única `RankProvider` y su única implementación `simulatedRankProvider` (envuelve `simulateReading`). Sin red ni claves. | RF-34 (RF-15 de la referencia) |
| `backend/src/services/accountWrites.ts` | Escritura con reintento optimista sobre una cuenta propia (`updateOwnedAccount`) y vinculación con compensación (`linkAccount`). | RF-5, RF-33, RF-39, RF-45, DP-29 |
| `backend/src/utils/clock.ts` | `export const clock = { now: (): Date => new Date() }`. Único punto donde se lee el reloj. | RNF-1, RNF-7, RNF-9 |
| `backend/src/utils/middleware.ts` (modificar) | (a) `createWithUser` recibe la opción `missingUserError?: SessionMessage` para el paso 5 (usuario inexistente), por defecto `"token inválido"`: 002 y 003 siguen igual. (b) `createWithExistingUser({ jwtSecret, now })` = `createWithUser({ jwtSecret, now, missingUserError: "sesión no iniciada" })`; su instancia se llama `withExistingUser`. No se apila encima de `withUser`, porque `withUser` ya responde "token inválido" antes (P-14, pregunta Q1). (c) `createUserRoutesGuard({ withUser, withExistingUser })`: para la ruta `games` usa `withExistingUser` y comprueba que se pueden decodificar los dos segmentos (P-15). | RF-1, RF-13, RF-29, RF-44, DP-37 |
| `backend/src/services/userTarget.ts` (modificar, T3b) | Deja de definir `SELF_ALIAS`, `OBJECT_ID_PATTERN`, `UserTarget` y `resolveUserTarget` y los reexporta desde `../domain/userId.ts` (`export { … } from`, `export type { UserTarget } from`). Se quedan aquí `matchUserRoute`, `decodeSegment`, `UserRoute` y `USER_TARGET_MESSAGES` (sin cambios). **No** reexporta `INVALID_ID_MESSAGE` (decisión del usuario, 2026-10-18): quien lo necesite lo importa de `domain/userId.ts`. Ningún import de quien use `userTarget.ts` cambia. | RF-5, RF-6, RF-18, RF-20 de la 003 (sin cambios); P-17 |
| `backend/src/utils/errors.ts` (modificar, T3b) | `MESSAGES.invalidId` toma su valor de `INVALID_ID_MESSAGE` (`../domain/userId.ts`); mismo texto y mismo tipo literal. `utils/` puede importar de `domain/`; al revés no (sección 2.1). | RNF-3 de la 001 (sin cambios); P-17 |
| `backend/src/services/userTarget.ts` (modificar, T9) | `matchUserRoute` reconoce además `GET`/`HEAD` `/:id/games/:gameId` → `{ kind: "games", rawSegment, rawGame }` (mismo emparejamiento de Express 5: `/` final opcional, `games` sin distinguir mayúsculas). | RF-1, RF-13, RF-29 |
| `backend/src/models/gameAccount.ts` | Modelo `GameAccount` con subesquemas de fotografía y partida, índice único `{ user, gameId }`, `optimisticConcurrency` y `toJSON` en lista blanca (`toGameAccountJson`, mismo patrón que `toPublicUserJson`). | RF-4, RF-5, RF-37, DP-32, DP-33, RT-07, RT-08, RT-11, RT-12 |
| `backend/src/models/user.ts` (modificar) | Agrega `accounts: Types.ObjectId[]` a `UserFields` y al esquema (`ref: 'GameAccount'`, default `[]`). **No** se añade a `toPublicUserJson`: como el `toJSON` es una lista blanca, no aparece en ninguna respuesta. | RF-33, DP-16 |
| `backend/src/controllers/accounts.ts` | `createAccountsRouter({ jwtSecret, now }): Router` en `/api/accounts`: listar, obtener, vincular, editar, desvincular, resincronizar. Primero, sin ruta, `router.use(withExistingUser)`; después, sin ruta, un middleware que responde 400 "id con formato inválido" si el segmento `/:id` no se puede decodificar (`decodeSegment`), antes de que Express 5 empareje `:id` (P-15). | RF-1 a RF-11, RF-22, RF-29, RF-33, RF-37 a RF-40, RF-44, RF-45 |
| `backend/src/controllers/users.ts` (modificar) | Crea `withExistingUser` junto a `withUser` y se los pasa a la guardia. Agrega `GET /:id/games/:gameId` (resumen; `me` y formato con `resolveUserTarget`) y, en `DELETE /:id`, `GameAccount.deleteMany({ user: sessionUserId })` **después** de `User.deleteOne`. | RF-12, RF-13, RF-14, RF-39 |
| `backend/src/app.ts` (modificar) | `app.use("/api/accounts", createAccountsRouter({ jwtSecret, now }))` después de `/api/auth` y antes de `unknownEndpoint`. | RF-1 |
| `backend/src/server.ts` (modificar) | `prepareDatabase()` llama también a `GameAccount.init()`, para que el índice único `{ user, gameId }` exista antes de la primera petición. | RF-5 |
| `backend/requests/accounts.rest` | Peticiones manuales: login → vincular → resincronizar → resumen → editar → desvincular (RT-19). | — |
| `backend/tests/unit/rankScale.test.ts` | Normalización, escalones y bandas. | criterios de normalización |
| `backend/tests/unit/rankSimulator.test.ts` | Lectura, evolución y verificada. | RF-35, RF-36, RF-41 a RF-43 |
| `backend/tests/unit/accountRules.test.ts` | Validación y orden de errores. | RF-2, RF-6, RF-22, RF-38, RF-40 |
| `backend/tests/unit/accountState.test.ts` | Unión de partidas, historial, tasa, tendencia. | RF-10, RF-15, RF-28, DP-9, DP-36 |
| `backend/tests/unit/domainIsolation.test.ts` (nuevo, T3b) | Lee los `.ts` de `backend/src/domain/` y falla si alguno importa de `services/`, `utils/`, `models/` o `controllers/` (sección 2.1). Solo vigila esas cuatro carpetas; no prohíbe `express`, `mongoose` ni `node:*` (decisión del usuario, 2026-10-18). | RNF-7; P-17 |
| `backend/tests/unit/gameAccountModel.test.ts` | `toJSON` sin conexión (`new GameAccount({...}).toJSON()`). | RF-37, DP-32, DP-33 |
| `backend/tests/controllers/accounts.test.ts` | Endpoints de `/api/accounts`, concurrencia y fallo forzado. | RF-1 a RF-11, RF-15, RF-22, RF-28, RF-29, RF-33, RF-37 a RF-45 |
| `backend/tests/controllers/gameSummary.test.ts` | Resumen por juego y cascada al eliminar usuario. | RF-12, RF-13, RF-14, RF-39 |
| `backend/tests/controllers/helpers.ts` (modificar) | Nuevo bloque `// --- Spec 004 ---` al final, como el de la spec 003: `FIXED_NOW` (instante fijo en milisegundos), `accountsInDb()` (vía `toJSON`) y `rawAccountsInDb()` (`lean()`, con `matches` y `readingNumber`, ordenado por `_id`). No se crea `test_helper.ts` (P-16). | — |
| `backend/tests/controllers/helpers.ts` (modificar, T8b) | `listenOnLoopback(listener): Promise<Server>` (`Server` de `node:http`): crea un `http.Server` con `listener`, llama a `listen(0, "127.0.0.1")`, **espera** al evento `listening` y lo registra en una lista del módulo; si lo devolviera antes, `address()` sería `null` y supertest volvería a hacer `listen(0)` en `::`. `closeTestServers(): Promise<void>`: cierra los registrados (`closeAllConnections()` y `close()`) y vacía la lista. `authApp(overrides?)` pasa a devolver `Promise<Server>` (`listenOnLoopback(createApp(...))`). En `registerUser`, `loginAs`, `signUp` y `rawCookieRequest` el parámetro `app: Express` pasa a `app: Server`; ningún otro cambio de firma ni de comportamiento. | P-18 (sin RF) |
| `backend/tests/server/helpers.ts` (modificar, T8b) | `getFreePort(host: string \| null = "127.0.0.1")`: con texto sondea con `probe.listen(0, host, …)`; con `null` sondea con `probe.listen(0, …)` sin host (como hoy, en `::`). `null` y no `undefined` como "sin host", porque `undefined` activa el valor por defecto; es el mismo `null` de `Config.host`. Por defecto sondea en `127.0.0.1`, porque `startup.test.ts` usa el puerto con host `127.0.0.1` y conecta a `127.0.0.1`. Decisiones del usuario (2026-10-18): incluirlo en T8b y "Que reciba el host". | P-18 (sin RF) |
| `backend/tests/server/startup.test.ts` (modificar, T8b) | Solo la preparación del puerto de la prueba "RF-10: sin HOST escucha en todas las interfaces" (línea 78): `await configWith({ host: null, port: await getFreePort(null) })` en lugar de `await configWith({ host: null })`, para que el puerto se sondee sin host y coincida con el servidor en `::`. `configWith` aplica `overrides` después de `getFreePort()`, así que el `port` pasado prevalece. Ninguna aserción ni otra línea cambia (decisión del usuario, 2026-10-18). | P-18 (sin RF) |
| `backend/tests/controllers/{accounts,auth,users,userRead,userProfile,userAvailability,userDeletion,app}.test.ts` (modificar, T8b) | Solo creación y cierre del servidor: `const app = await authApp()` (await de nivel superior) y, en `after`, `await closeTestServers()` antes de `mongoose.disconnect()`. Ajustes puntuales: en `auth.test.ts`, `supertest(await authApp({...}))` en las líneas 119, 140, 365, 617, 624, 627 y 630; en `userDeletion.test.ts`, la línea 137 y el tipo de la línea 98 (`Express` → `Server`); en `app.test.ts`, `supertest(await listenOnLoopback(createApp(testConfig())))` y un `after(closeTestServers)` nuevo, sin `mongoose.disconnect()` porque no conecta a la base (aceptado por el usuario, 2026-10-18). Ninguna aserción, valor esperado ni lógica de prueba cambia. | P-18 (sin RF) |
| `backend/tests/unit/withExistingUser.test.ts` (modificar, T8b) | `appWith` devuelve el servidor de `listenOnLoopback`; las llamadas usan `await` y se añade `after(closeTestServers)`. | P-18 (sin RF) |
| `backend/tests/unit/loopbackServer.test.ts` (nuevo, T8b; nombre aceptado por el usuario, 2026-10-18) | Regresión: `listenOnLoopback` devuelve un servidor cuyo `address()` cumple `address === "127.0.0.1"`, `family === "IPv4"` y `port !== 0`; `closeTestServers()` lo deja sin escuchar. Opcional: con un bloqueador en `127.0.0.1:P`, `listen(P, "127.0.0.1")` da `EADDRINUSE` (documenta el riesgo). | P-18 (sin RF) |

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

// domain/userId.ts (T3b, P-17: movido tal cual desde services/userTarget.ts, que lo reexporta
// todo salvo INVALID_ID_MESSAGE)
export const SELF_ALIAS = "me";
export const OBJECT_ID_PATTERN: RegExp;                              // /^[0-9a-fA-F]{24}$/ (sin bandera m)
export const INVALID_ID_MESSAGE = "id con formato inválido";       // nombre del usuario (2026-10-18); no se reexporta
export type UserTarget = { ok: true; id: string; own: boolean } | { ok: false; error: string };
export function resolveUserTarget(decoded: string, sessionUserId: string): UserTarget;

// domain/accountRules.ts (importa solo de domain/: userId.ts, games.ts, rankSimulator.ts)
export const ACCOUNT_ERRORS: { ... };                                // textos exactos de la sección 7; invalidId = INVALID_ID_MESSAGE
export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };
export function isValidId(value: unknown): value is string;        // OBJECT_ID_PATTERN de domain/userId.ts
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

### 2.1 Aislamiento de `domain/` (P-17, cambio aprobado el 2026-10-18)
- Regla: ningún archivo de `backend/src/domain/` importa (ni reexporta) de
  `backend/src/services/`, `utils/`, `models/` ni `controllers/`. Las dependencias van en un
  solo sentido: `controllers/`, `services/`, `models/` y `utils/` pueden importar de
  `domain/`; `domain/` solo de `domain/`. Vale para esta spec y para las siguientes (005 en
  adelante), que amplían `domain/`.
- Si una regla de `domain/` necesita algo que hoy vive en otra capa y es puro (constante,
  patrón, función sin E/S), se mueve a `domain/` y la capa original lo reexporta, como hace
  T3b con `domain/userId.ts`. Si no es puro, no entra en `domain/`.
- La comprueba `backend/tests/unit/domainIsolation.test.ts` (sección 11), que forma parte de
  `npm test`: una spec futura que la rompa queda en rojo.
- Sin cambio de comportamiento: los textos, patrones y resultados de `resolveUserTarget` son
  los mismos; los tests existentes de 001, 002, 003 y 004 no se modifican.

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
- Orden de los campos del resumen dentro de cada juego (precisión aprobada por el usuario
  el 2026-10-18: "me parece bien el orden del resumen"): primero el nombre y después los
  números en el orden de la tabla de constantes. LoL: campeón, k, d, a. R6: operador, b.
  CS2: mapa, x. Cada campo consume un valor de `rng` (`pick` o `randInt`).
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
| cs2 | 25–50 | 50–300 | victoria `<mapa> · 13-<x>`, derrota `<mapa> · <x>-13`; mapa de `Mirage, Inferno, Nuke, Ancient, Anubis, Dust II, Train`; x 0–11; victoria `13-x`, derrota `x-13` |

  La variación por partida es informativa y no se reconcilia con los puntos de la
  fotografía (la spec no lo exige).
  Errata corregida el 2026-10-18 (aprobada con el cambio T3b): la fila cs2 decía
  `<mapa> · <a>-<b>`, pero el resumen solo usa un número `x`; el texto ahora coincide con
  `summaryFor` de `rankSimulator.ts` (`${map} · 13-${x}` o `${map} · ${x}-13`). No cambia el
  código ni el orden de consumo.

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
- `toJSON` (RT-07, RF-37, DP-32, DP-33): lista blanca con `toGameAccountJson(doc)` (mismo
  patrón que `toPublicUserJson` en `user.ts`): `id` (string), `userId` (string),
  `simulated: true` y los campos públicos; nunca `_id`, `__v`, `user`, `matches` ni
  `readingNumber`. Las fechas salen en ISO 8601 al serializar. Forma resultante:
  `{ id, userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified, simulated }`.
- La marca `simulated` no se guarda: la añade `toJSON` siempre, porque toda cuenta sale del
  proveedor simulado (RF-34) y así ningún cuerpo puede alterarla (RF-7).
- El esquema repite las validaciones (RT-08) como red de seguridad, pero los mensajes que
  ve el cliente salen de `accountRules.ts` (validación antes de tocar la base), para
  garantizar el texto y el orden de RF-6.

## 6. Interfaz REST

Sesión y montaje (RF-1, RF-29, RF-44):
- `/api/accounts`: `createAccountsRouter({ jwtSecret, now })` se monta en `createApp`
  después de `/api/auth` y antes de `unknownEndpoint`. Dentro del router, sin ruta y antes
  de todas las rutas: (1) `withExistingUser` (pasos 1 a 4 de la spec 002 y, si el usuario ya
  no existe, 401 "sesión no iniciada"); (2) si `request.path` tiene un primer segmento que
  `decodeSegment` no puede decodificar → 400 "id con formato inválido". Así un `%zz` da 401
  sin sesión y 400 con sesión, en el orden de RF-29, y nunca el error propio de Express.
- `/api/users/:id/games/:gameId`: la guardia de la spec 003 lo reconoce (`kind: "games"`),
  aplica `withExistingUser` (no `withUser`) y después: id no decodificable → 400 "id con
  formato inválido"; juego no decodificable → 400 "Juego no válido." (orden de RF-13). Las
  demás rutas de usuario siguen con `withUser` y su 401 "token inválido" de la spec 002.
- La cabecera `X-CSRF-Token` se exige en todas las rutas de esta spec, también en las GET
  (comportamiento de `withUser` de la spec 002, que se reutiliza sin cambios).

Cada controlador toma `const now = clock.now()` una sola vez al inicio. Respuestas de error:
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
- El índice único debe existir antes de la primera petición: en producción lo crea
  `prepareDatabase()` (`server.ts`, junto a `User.init()`), y las pruebas llaman
  `await GameAccount.init()` en `before`, después de `connectDatabase`, antes de probar
  duplicados simultáneos.

## 9. Instante actual en las pruebas (RNF-1, RNF-9)
- Producción y desarrollo: `clock.now()` devuelve `new Date()`.
- Pruebas de controladores: `t.mock.method(clock, 'now', () => new Date(FIXED_NOW))`
  (`mock` de `node:test`; se restaura solo al terminar la prueba, y además el archivo
  llama `mock.restoreAll()` en `afterEach`, como `users.test.ts`). Para la segunda
  resincronización a otra hora se vuelve a mockear con otro instante.
- El reloj de las credenciales (`now` de `createApp`, en segundos) es otro y no se toca:
  la app de prueba se crea con `await authApp()` sin `overrides` (desde T8b devuelve un
  servidor ya escuchando en `127.0.0.1`, P-18), así el JWT emitido en `signUp` no caduca
  aunque `FIXED_NOW` sea una fecha pasada (pregunta Q2).
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
| P-5 | `clock` mutable (`utils/clock.ts`) sustituido en las pruebas con `t.mock.method`. **Decisión del usuario (2026-10-18, Q2): "Mantener clock.ts".** | `mock.timers` sobre `Date`: afecta también a la expiración del JWT y a `timestamps` de Mongoose. Reutilizar el `now` que ya recibe `createApp`: es el reloj de las credenciales en segundos Unix; perdería los milisegundos y mover el instante de las cuentas movería la expiración del JWT. Nueva opción `clock?: () => Date` en `AppOptions` pasada a los routers: viable y coherente con D11 de la 001 ("el reloj llega como opción"), pero cambia lo aprobado; descartada por el usuario (Q2). (El motivo anterior, "cambia la forma de `app.ts`", ya no aplica: `createApp` ya es una fábrica.) Cabecera de prueba con el instante: sería explotable en producción. |
| P-6 | `optimisticConcurrency` + `save()` + reintento (máx. 5). | `findOneAndUpdate` condicionado: salta los validadores del esquema (RT-10). Transacciones: exigen replica set, que la base de prueba local no garantiza. |
| P-7 | Vincular = crear + `$addToSet` con compensación; eliminar usuario = borrar usuario y luego cuentas. | Transacción multi-documento: misma restricción de replica set. Borrar cuentas antes que el usuario: una vinculación intercalada dejaría una cuenta huérfana. |
| P-8 | `simulated: true` añadido por `toJSON`, no guardado. | Campo en la base: podría quedar `false` en documentos viejos o ser alterado; todas las cuentas son simuladas (RF-34). |
| P-9 | Validación en `accountRules.ts` antes de tocar la base; el esquema solo como red. | Usar los `ValidationError` de Mongoose: el orden y el texto dependerían del orden de los campos del esquema (RF-6 exige primer error en orden fijo). |
| P-10 | Resumen en `controllers/users.ts` (`/api/users/:id/games/:gameId`). | Ruta bajo `/api/accounts`: cambia la URL que fija HU-08 de la referencia y que consume la interfaz. |
| P-11 | Partidas guardadas en el campo `matches` con `matchId`. | `recentMatches` con `id`: el nombre de la referencia confunde con lo que devuelve el resumen y `id` choca con el virtual de Mongoose. |
| P-12 | **Decisión del usuario (2026-10-17): "Acepto el borrado posterior (Recomendado)".** RF-39 (eliminar usuario durante una vinculación) se garantiza con la compensación de P-7 y la sección 8: el estado final nunca deja una cuenta del usuario eliminado, aceptando el intervalo de milisegundos en que la cuenta existe antes de borrarse. | Transacción multi-documento con replica set: la base de prueba local no la garantiza y exige configurar MongoDB de otra forma. |
| P-13 | **Decisión del usuario (2026-10-17): "No, basta con lo del plan (Recomendado)".** Los valores esperados de las pruebas de controladores (RNF-1) se calculan con las mismas funciones puras (`simulateReading` + `initialState` / `applySync`) y el mismo instante fijo (sección 11); no se registran valores literales tras implementar. | Fijar en las pruebas valores literales copiados de la salida del generador tras implementar: detectaría un cambio accidental del orden de consumo (4.3), pero esos valores no podrían escribirse antes que el código (constitución, principio 4). |
| P-14 | RF-44 se cumple con la opción `missingUserError` de `createWithUser` (por defecto "token inválido") y la instancia `withExistingUser` con "sesión no iniciada". **Decisión del usuario (2026-10-18, Q1): "Mantener la spec".** | `withExistingUser` apilado después de `withUser` (lo que decía el plan aprobado): nunca llegaría a ejecutarse, porque `withUser` ya responde 401 "token inválido" a un usuario eliminado. Cambiar el mensaje de `withUser` para todos: rompe la spec 002 (RF-22) y sus pruebas. Duplicar `withUser` entero en otro middleware: dos copias de la misma comprobación de sesión. |
| P-15 | Guardias sin ruta antes de emparejar `:id`: en `/api/accounts`, `withExistingUser` y luego la comprobación de `decodeSegment`; en `/api/users/:id/games/:gameId`, la guardia de la 003 ampliada con `kind: "games"`. | Rutas con `withExistingUser` en cada una: con `%zz` Express 5 fallaría al decodificar `:id` antes de comprobar la sesión y el `errorHandler` respondería 500, contra el orden de RF-29 y RF-13 (mismo motivo que D2 de la 003). Ruta del resumen fuera de la guardia: quedaría sin sesión, porque `matchUserRoute` no la reconoce y la guardia la deja pasar. |
| P-16 | Utilidades de prueba en el `helpers.ts` existente, con sus firmas (`authApp`, `signUp`, `loginAs(app, email, password)`, `withSession`, `nonExistingId`); `FIXED_NOW`, `accountsInDb` y `rawAccountsInDb` se añaden ahí. | Crear `test_helper.ts` con `loginAs(user) → { agent, csrfToken }` y `usersInDb`, como suponía el plan aprobado: duplicaría utilidades que ya existen con otra firma y dos convenciones en la misma carpeta. |
| P-17 | **Decisión del usuario (2026-10-18): "Aprobar y ajustar P-17".** `domain/` solo importa de `domain/` (sección 2.1). `SELF_ALIAS`, `OBJECT_ID_PATTERN`, `UserTarget`, `resolveUserTarget` y el texto `"id con formato inválido"` (`INVALID_ID_MESSAGE`) pasan a `domain/userId.ts`; `services/userTarget.ts` reexporta todo salvo `INVALID_ID_MESSAGE` y `utils/errors.ts` toma de ahí `MESSAGES.invalidId`. Un test (`domainIsolation.test.ts`) vigila la regla. | Dejar los imports de `accountRules.ts` a `../utils/errors.ts` y `../services/userTarget.ts` y aceptarlos como excepción documentada: funciona hoy y lo importado es puro, así que no incumple el principio 3 de la constitución (que solo prohíbe React, HTTP y el reloj en `domain/`) ni, hoy, RNF-7 (reglas puras con el instante como dato). Se descarta porque invierte el orden de capas (`domain/` no debe depender de las capas externas); impide copiar `domain/` al frontend (spec 007) sin arrastrar `services/` y `utils/`; esas capas pueden empezar a importar Express o Mongoose y meterlos en el dominio de forma indirecta sin que nadie lo note, lo que sí rompería RNF-7 a futuro, y sin un test cada excepción abre la puerta a la siguiente. Duplicar el patrón y el texto en `domain/`: dos fuentes de verdad que pueden divergir. |
| P-18 | **Cambio T8b aprobado el 2026-10-18: "Apruebo, haz T8b".** Las pruebas HTTP usan un servidor propio ya escuchando en `127.0.0.1` (`listenOnLoopback`, `authApp` asíncrono) y lo cierran en `after` con `closeTestServers()`; `getFreePort(host = "127.0.0.1")` sondea por defecto en `127.0.0.1` y recibe el host (decisiones del usuario: incluirlo y "Que reciba el host"); con `null` sondea sin host, y así lo pide la prueba "sin HOST escucha en todas las interfaces" de `startup.test.ts` (`getFreePort(null)`), para que coincida con `::`. Respuestas del usuario del 2026-10-18: solo cambia este plan, no el de la spec 003 ("No, solo el plan 004"); se aceptan `tests/unit/loopbackServer.test.ts` y, en `app.test.ts`, `after(closeTestServers)` sin `mongoose.disconnect()`. Causa (reproducida por el reviewer): con una app de Express, supertest hace `listen(0)` sin host en cada petición; Node escucha en `::` pero supertest conecta a `127.0.0.1`, y en macOS el sistema puede dar un puerto que otro proceso (Antigravity, VS Code, Spotify…) ya tiene en `127.0.0.1` o `0.0.0.0`: la petición le llega a ese proceso, que responde 404 vacío (nuestro 404 siempre lleva cuerpo) o corta con `ECONNRESET` ("socket hang up"). Medido: sin arreglo, `accounts.test.ts` falla 1 de cada 20 ejecuciones y `npm test` 2 de 3; con el prototipo, 20/20 y 6/6 en verde (1141/1141). Excepción explícita a "no se modifican tests existentes": T8b toca tests existentes, pero solo en cómo se crea y se cierra el servidor (helpers, setup, teardown y tipos) y, en `startup.test.ts`, la preparación del puerto de la prueba "sin HOST", sin cambiar aserciones. | Un `--import` global que parchee `http.Server.prototype.listen` para forzar `127.0.0.1`: menos cambios, pero es global y alteraría `tests/server/`, donde `startup.test.ts` comprueba que "sin HOST escucha en todas las interfaces" y espía `listen`. Dejarlo como está y reintentar: oculta la causa y sigue fallando. |

## 11. Estrategia de pruebas
- `node --test` vía `npm test` (`NODE_ENV=test`, `--test-concurrency=1`), `node:assert/strict`
  con `strictEqual` / `deepStrictEqual`, base de prueba de la spec 001.
- Archivos de `controllers/` con el patrón de `users.test.ts`: `const app = await authApp()`
  (await de nivel superior; desde T8b); `before` → `connectDatabase(testConfig().db)`,
  `User.init()` y `GameAccount.init()`; `beforeEach` → `User.deleteMany({})` y
  `GameAccount.deleteMany({})`; `afterEach` → `mock.restoreAll()`; `after` →
  `await closeTestServers()` y después `mongoose.disconnect()`.
- Servidor de prueba (T8b, P-18): toda prueba HTTP pasa a supertest un servidor ya
  escuchando en `127.0.0.1` (`await authApp()` o `await listenOnLoopback(app)`), nunca una
  app de Express sin escuchar, y lo cierra con `closeTestServers()` en `after`. Así
  supertest no hace su propio `listen(0)` en `::`. Vale también para las pruebas nuevas de
  T9 y de las specs siguientes. `getFreePort(host = "127.0.0.1")` sondea en el host pedido
  (por defecto `127.0.0.1`); la prueba "sin HOST escucha en todas las interfaces" de
  `startup.test.ts` pide el puerto sin host con `getFreePort(null)` (decisión del usuario,
  2026-10-18: "Que reciba el host"). Regresión en
  `tests/unit/loopbackServer.test.ts` (dirección `127.0.0.1`, familia `IPv4`, puerto ≠ 0).
  Como el fallo es intermitente, el cierre exige repetición: `accounts.test.ts` 20 veces y
  `npm test` 5 veces seguidas en verde, anotando la duración de cada ejecución (lo normal
  son unos 83–85 s; una mucho más lenta se reporta, por las dos peticiones lentas sin
  explicar, de 144 s y 178 s, que vio el reviewer y que se sospecha del entorno: MongoDB en
  Docker Desktop o una suspensión de la máquina).
- Sesión: `const ana = await signUp(app, { email, username })` da `{ agent, csrf, id }`; cada
  petición protegida va como `withSession(ana.agent.post('/api/accounts'), ana.csrf)`,
  también las GET. Sin sesión: `supertest(app).get(...)`. Segundo usuario: otro `signUp` con
  otro correo y otro nombre.
- RF-44: `signUp`, después `User.deleteOne({ _id: ana.id })` directamente en la base, y la
  petición con el agente y el comprobante de `ana` → 401 "sesión no iniciada" y base sin
  cambios. Una prueba de regresión confirma que `GET /api/users/me` con esa misma credencial
  sigue respondiendo "token inválido" (spec 002).
- Segmento no decodificable (P-15): `/api/accounts/%zz` → 401 sin sesión y 400 "id con
  formato inválido" con sesión; `/api/users/%zz/games/lol` → 400 "id con formato inválido";
  `/api/users/me/games/%zz` → 400 "Juego no válido.".
- Unitarias (sin base): `rankScale`, `rankSimulator`, `accountRules`, `accountState`,
  `gameAccountModel` (`toJSON` sobre un documento no guardado).
- Aislamiento de `domain/` (T3b, P-17): `domainIsolation.test.ts` lista con `node:fs` los
  `.ts` de `backend/src/domain/` (la ruta se resuelve desde `import.meta.dirname`, no desde
  el directorio de trabajo), extrae los especificadores de `import … from`, `export … from`,
  `import type … from`, `import "…"` e `import("…")`, resuelve cada especificador relativo
  con `node:path` respecto al archivo y falla, nombrando archivo y especificador, si cae en
  `src/services`, `src/utils`, `src/models` o `src/controllers`. Para no pasar en vacío:
  comprueba que encontró al menos un `.ts` y que el extractor detecta un import prohibido en
  un texto de muestra. Resolver la ruta (en vez de buscar el texto `../utils`) también
  detecta `../../src/utils/…` o `./../utils/…`. Decisión del usuario (2026-10-18): esta
  forma (rutas resueltas con `node:path` y comprobación de que no pasa en vacío) y solo
  esas cuatro carpetas del backend; el test no prohíbe `express`, `mongoose` ni `node:*`.
- `domain/userId.ts` no lleva test propio nuevo: su comportamiento lo cubren, a través del
  reexporte, las pruebas existentes de `userTarget.ts` (003) y `accountRules.test.ts` (004),
  que no se modifican y deben seguir en verde.
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
| RF-1 | `withExistingUser` sin ruta en `createAccountsRouter`; guardia de usuarios con `kind: "games"` para el resumen | `accounts.test.ts` "sin sesión → 401" (cada ruta, también sin cabecera `X-CSRF-Token`); `gameSummary.test.ts` "sin sesión → 401" |
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
| RF-29 | guardias de P-15 + orden en controladores | `accounts.test.ts` "orden de errores" (un caso por salto, incluido `%zz` con y sin sesión) |
| RF-33 | `$addToSet` / `$pull` | `accounts.test.ts` (estado de `User.accounts`; usuario sin `accounts` en JSON) |
| RF-34 | `services/rankProvider.ts` | revisión: sin `fetch`, `http` ni variables nuevas; pruebas offline |
| RF-35, RF-36, RF-42, RF-43 | `rankSimulator.ts` | `rankSimulator.test.ts`; `accounts.test.ts` "misma lectura para dos usuarios / otra región / otras mayúsculas" |
| RF-37 | `toJSON` | `gameAccountModel.test.ts`; `accounts.test.ts` y `gameSummary.test.ts` "toda cuenta lleva `simulated` y no `matches` ni `readingNumber`" |
| RF-38, RF-40 | `validateAccountEdit` | `accountRules.test.ts`; `accounts.test.ts` |
| RF-39 | `updateOwnedAccount`, `linkAccount`, orden del borrado de usuario | `accounts.test.ts` "concurrencia"; `gameSummary.test.ts` "eliminación simultánea a vinculación" |
| RF-41 | `isVerified` | `rankSimulator.test.ts` (ejemplos, 100 por juego, estable) |
| RF-44 | `withExistingUser` (`createWithUser` con `missingUserError: "sesión no iniciada"`, P-14) | `accounts.test.ts` "credencial de usuario eliminado → 401" y regresión de `/api/users/me` con "token inválido"; `gameSummary.test.ts` mismo caso en el resumen |
| RF-45 | una escritura por operación | `accounts.test.ts` "fallo forzado en sync" |
| RNF-1, RNF-9 | `clock`, sin red | toda la suite con `FIXED_NOW`; T10 corre sin Internet |
| RNF-2 | textos sin fuentes; `games.ts` sin `source` | `accounts.test.ts` "ninguna respuesta menciona Riot/Ubisoft/Valve/FACEIT/Steam Web API" |
| RNF-3 | `toJSON` | `accounts.test.ts` forma exacta de la cuenta |
| RNF-7 | `domain/*.ts` puros; `domain/` solo importa de `domain/` (sección 2.1, P-17) | unitarias sin base ni reloj; `domainIsolation.test.ts` (T3b) |
| RNF-8 | sin `npm install` | T10 revisa que `package.json` no cambió en dependencias |

## 13. Riesgos
- Specs 001–003 ya implementadas (sección 0). Si sus firmas cambian antes de implementar
  esta spec (`createApp`, `createWithUser`, `createUserRoutesGuard`, `matchUserRoute`,
  `helpers.ts`), se vuelve a ajustar el plan.
- Dos mensajes distintos para la misma credencial de un usuario eliminado: "token inválido"
  en `/api/users` y `/api/auth` (spec 002, RF-22) y "sesión no iniciada" en esta spec
  (RF-44). Ambos son 401 y la interfaz vuelve a login en los dos casos; el usuario decidió
  mantenerlos así (Q1, 2026-10-18).
- Mismo caso con el 404 de usuario: `GET /api/users/:id` responde "usuario no encontrado"
  (spec 003) y el resumen "Usuario no encontrado." (RF-13, DP-6). Ya lo recoge "Impacto en
  otras specs" de la spec; esta spec no toca el texto de la 003.
- Agregar `accounts` (default `[]`) al esquema de `User` hace que aparezca en los
  documentos `lean()`; si alguna prueba de la 003 compara claves exactas de la base, T5 lo
  detecta ("el resto de la suite sigue verde") y para.

## Preguntas abiertas (cambio del 2026-10-18)
Cerradas: el usuario respondió Q1 y Q2 el 2026-10-18. No queda ninguna pregunta abierta.
- **Q1 (resuelta el 2026-10-18).** RF-44 fija 401 "sesión no iniciada" para la credencial
  de un usuario eliminado, pero el `withUser` existente ya responde 401 "token inválido" en
  ese caso (spec 002, RF-22). ¿Se mantiene RF-44 tal cual (el plan añade
  `missingUserError`, P-14) o se cambia la spec para usar "token inválido" y reutilizar
  `withUser` sin tocarlo? **Respuesta: "Mantener la spec".** RF-44 y DP-37 siguen con 401
  "sesión no iniciada" en las rutas de esta spec, mediante `missingUserError` y
  `createWithExistingUser` (P-14). `spec.md` no cambia.
- **Q2 (resuelta el 2026-10-18).** ¿Se mantiene el `clock` mutable aprobado (P-5) o se
  inyecta el instante como opción de `createApp` (`clock?: () => Date`), siguiendo la
  convención D11 del código existente? **Respuesta: "Mantener clock.ts".** P-5 queda como
  estaba aprobada (`backend/src/utils/clock.ts` mutable).
- RF-39 (eliminar usuario vs. vincular) se garantiza en el estado final, con un intervalo
  transitorio de milisegundos sin transacciones (P-7). Aceptado por el usuario el
  2026-10-17 (P-12).
- La normalización de DP-26 difiere de la del frontend (`frontend/src/domain/games.ts`); la
  copia del dominio en el backend deja de ser idéntica hasta que la spec 007 la adopte.
- El orden de consumo del generador (4.3) es contrato: cambiarlo cambia todas las lecturas
  de la demostración.
