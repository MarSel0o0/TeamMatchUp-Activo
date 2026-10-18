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
(RT-07 a RT-12), 5.1, 5.4, 8 y 11, y su RF-15, salvo lo que la spec anula en "Qué prevalece
sobre la referencia" (sin lista de cuentas en el usuario, textos propios, ningún 409).

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

```
backend/
├── requests/accounts.rest                  (nuevo)
├── src/
│   ├── app.ts                              (modifica: opción clock, monta /api/accounts)
│   ├── domain/
│   │   ├── games.ts                        (nuevo)
│   │   ├── rankScale.ts                    (nuevo)
│   │   ├── rankSimulator.ts                (nuevo)
│   │   └── accountState.ts                 (nuevo)
│   ├── models/gameAccount.ts               (nuevo)
│   ├── services/
│   │   ├── accountRules.ts                 (nuevo)
│   │   ├── accountTarget.ts                (nuevo)
│   │   ├── accountWrites.ts                (nuevo)
│   │   └── userTarget.ts                   (modifica: ruta del resumen)
│   ├── controllers/
│   │   ├── accounts.ts                     (nuevo)
│   │   └── users.ts                        (modifica: resumen y cascada)
│   └── utils/middleware.ts                 (modifica: guardias)
└── tests/
    ├── unit/
    │   ├── games.test.ts                   (nuevo)
    │   ├── rankScale.test.ts               (nuevo)
    │   ├── rankSimulator.test.ts           (nuevo)
    │   ├── accountState.test.ts            (nuevo)
    │   ├── accountRules.test.ts            (nuevo)
    │   ├── accountTarget.test.ts           (nuevo)
    │   ├── gameAccountModel.test.ts        (nuevo)
    │   └── userTarget.test.ts              (modifica)
    └── controllers/
        ├── helpers.ts                      (modifica)
        ├── accountRead.test.ts             (nuevo)
        ├── accountLink.test.ts             (nuevo)
        ├── accountEdit.test.ts             (nuevo)
        ├── accountSync.test.ts             (nuevo)
        ├── accountConcurrency.test.ts      (nuevo)
        ├── gameSummary.test.ts             (nuevo)
        └── userDeletionCascade.test.ts     (nuevo)
```

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
constitución, principio 3). Ninguna importa Express ni Mongoose ni lee `process.env`.

```ts
// domain/games.ts
export const GAME_IDS = ["lol", "r6", "cs2"] as const;
export type GameId = (typeof GAME_IDS)[number];
export interface GameDefinition { id: GameId; name: string; handlePattern: RegExp;
  handleError: string; regions: readonly string[] }
export const GAMES: Readonly<Record<GameId, GameDefinition>>;
export function isGameId(value: unknown): value is GameId;          // Set exacto, sin recortar (DP-39)
export function canonicalHandle(trimmed: string): string;           // trimmed.toLowerCase() (DP-19)
export function normalizeRegion(gameId: GameId, value: unknown): string | null; // grafía de la lista (DP-35)

// domain/rankScale.ts
export interface RankStep { tier: string; division?: string }
export function ladder(gameId: GameId): readonly RankStep[];        // 31 / 36 / 7
export function normalizeStep(gameId: GameId, step: number): number;
export function normalizeRank(gameId: GameId, tier: string, division?: string): number;
export function pointsBand(gameId: GameId, step: number): { min: number; max: number };

// domain/rankSimulator.ts
export interface Snapshot { tier: string; division?: string; points: number; normalized: number; recordedAt: Date }
export interface SimulatedMatch { id: string; gameId: GameId; playedAt: Date; result: "win" | "loss";
  summary: string; durationMinutes: number; rankDelta: number }
export interface SimulatedReading { snapshot: Snapshot; matches: SimulatedMatch[]; mainMatchId: string; verified: boolean }
export function hash32(text: string): number;                       // FNV-1a 32 bits
export function createRng(seed: number): () => number;              // mulberry32, [0, 1)
export function isVerified(canonical: string): boolean;
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
export function initialState(reading: SimulatedReading, now: Date): AccountState;
export function applySync(state: AccountState, reading: SimulatedReading, readingNumber: number, now: Date): AccountState;
export function shouldAppendSnapshot(previous: Snapshot, next: Snapshot): boolean;
export function compareCodePoints(a: string, b: string): number;
export function compareMatches(a: SimulatedMatch, b: SimulatedMatch): number;
export function mergeMatches(saved: readonly SimulatedMatch[], incoming: readonly SimulatedMatch[], mainId: string): SimulatedMatch[];
export function recentMatches(matches: readonly SimulatedMatch[]): SimulatedMatch[];   // 8 primeras
export function winRate(matches: readonly { result: "win" | "loss" }[]): number;
export function trend(current: Snapshot, history: readonly Snapshot[]): number;

// services/accountRules.ts
export const ACCOUNT_MESSAGES: { gameInvalid; regionInvalid(gameId); duplicate; handleNotEditable;
  accountNotFound; playerWithoutAccount };                          // sección 7
export function validateLinkPayload(body: unknown): Validation<{ gameId: GameId; handle: string; region: string }>;
export function validateAccountEdit(account: { gameId: GameId; handle: string }, body: unknown): Validation<{ region?: string }>;
export function parseAccountFilters(query: unknown, sessionUserId: string): Validation<{ userId?: string; gameId?: GameId }>;
export function resolveSummaryTarget(decodedId: string | null, decodedGame: string | null,
  sessionUserId: string): { ok: true; userId: string; gameId: GameId } | { ok: false; error: string };

// services/accountTarget.ts
export type AccountRoute = { kind: "list" } | { kind: "link" } | { kind: "account"; rawSegment: string }
  | { kind: "sync"; rawSegment: string };
export function matchAccountRoute(method: string, path: string): AccountRoute | null;
export function resolveAccountId(decoded: string): Validation<string>;   // 24 hex → minúsculas
```

`division` se omite cuando el tier no la tiene (nunca `division: undefined`, por
`exactOptionalPropertyTypes`); todo acceso por índice se comprueba
(`noUncheckedIndexedAccess`).

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

## 3. Catálogo, escala, normalización y bandas

### 3.1 Juego, identificador y región (`games.ts`) [RF-6, DP-19, DP-35, DP-39]
- `isGameId(v)`: `typeof v === "string" && GAME_ID_SET.has(v)`. No `v in GAMES` (aceptaría
  `toString` o `constructor` por el prototipo). `" lol "`, `"LOL"`, `5` → false.
- Patrones (sobre el texto ya recortado, sin banderas `u`, `s` ni `m`, así que `.` cuenta
  unidades UTF-16 y excluye exactamente LF, CR, U+2028 y U+2029, y `$` es el final del
  texto):
  - LoL `/^.{3,16}#[A-Za-z0-9]{2,5}$/` (la etiqueta no admite `#`, así que el corte es el
    último `#`: `a#b#cd` → nombre `a#b`).
  - R6 `/^[A-Za-z0-9._-]{3,20}$/`.
  - CS2 `/^7656119[0-9]{10}$/`.
- `canonicalHandle(t) = t.toLowerCase()` sobre el texto recortado; la longitud se mide
  antes (DP-19).
- `normalizeRegion(gameId, v)`: si `typeof v !== "string"` → null; `t = v.trim()`; devuelve
  la región `r` de la lista con `asciiLower(r) === asciiLower(t)`, o null.
  `asciiLower(s) = s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32))`.
  No se usa `toLowerCase`: convierte el signo de kelvin `K` en `k` y daría por válida
  `"KR"` con ese signo (DP-35). `"South  America"` no coincide.
- Mensaje de identificador por juego, literal de RF-6 (sección 7).

### 3.2 Escalones (`rankScale.ts`) [DP-2, DP-26]
Posición 0 = el más bajo:
- LoL: Iron IV, III, II, I, Bronze IV … Diamond I (0–27), Master (28), Grandmaster (29),
  Challenger (30). Tamaño 31.
- R6: Copper V … Copper I (0–4), Bronze V … Diamond I (5–34), Champion (35). Tamaño 36.
- CS2: Grey (0), Light Blue (1), Blue (2), Purple (3), Pink (4), Red (5), Gold (6). Tamaño 7.

```
normalizeStep(g, paso) = Math.round((paso * 100) / (tamaño(g) − 1))
normalizeRank(g, tier, division):
  si tier no está en los tiers de g (comparación exacta) → 0
  si el tier no tiene divisiones → paso = primer escalón del tier (division se ignora)
  si no → d = índice exacto de division en las divisiones de g (de la más baja a la más alta);
          ausente o desconocida → 0; paso = primer escalón del tier + d
  return normalizeStep(g, paso)
```
Ningún escalón da una mitad exacta (LoL: décimos de tercio; R6: veinteavos de séptimo; CS2:
cincuentavos de tercio), y `Math.round` sube las mitades en positivos. Valores de la spec:
Iron IV 0, Diamond I 90, Master 93, Grandmaster 97, Challenger 100, Grey 0, Light Blue 17,
Purple 50, Gold 100, Copper V 0, Diamond I de R6 97, Champion 100; `master` → 0; `Gold iv`
= Gold IV; `Master I` = 93; `Grey II` = 0; `Champion V` = 100. Esta es la única
normalización del servidor (RF-48).

### 3.3 Bandas cerradas de puntos (`pointsBand`) [DP-34]

| Juego | Escalón | Banda (extremos incluidos) |
| --- | --- | --- |
| LoL | 0–27 | 0–99 |
| LoL | 28–30 (Master+) | 0–999 |
| CS2 | i = 0–6 | 5000·i … 5000·i + 4999 (Gold 30000–34999) |
| R6 | i = 0–34 | 1000 + 100·i … 1000 + 100·i + 99 (Diamond I 4400–4499) |
| R6 | 35 (Champion) | 4500–4999 |

El simulador genera los puntos dentro de esta misma banda (no hay rango de generación
aparte).

---

## 4. Proveedor simulado (`rankSimulator.ts`)

### 4.1 Primitivas [RF-35]
```
hash32(text):  h = 0x811c9dc5; para cada unidad c (charCodeAt): h = Math.imul(h ^ c, 0x01000193) >>> 0
createRng(seed): mulberry32
  a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; t = a
                 t = Math.imul(t ^ (t >>> 15), t | 1)
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
                 return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
randInt(rng, min, max) = min + Math.floor(rng() * (max − min + 1))
pick(rng, lista)      = lista[randInt(rng, 0, lista.length − 1)]
rng_k = createRng(hash32(`${gameId}|${canonical}|${k}`))
```
Todo depende solo de (juego, identificador canónico, número de lectura); `now` no entra en
ninguna semilla y la región no es una entrada (RF-35, RF-43, DP-5).

### 4.2 Escalón por número de lectura [RF-42]
```
stepAt(g, c, n):
  size = ladder(g).length
  paso = randInt(rng_0, 0, size − 1)              // primer valor de rng_0
  para k = 1..n: paso = clamp(paso + randInt(rng_k, −1, 1), 0, size − 1)   // primer valor de rng_k
  return paso
```
El escalón de n difiere del de n − 1 como mucho en 1 y nunca sale de la escala; arriba un
+1 no sube y abajo un −1 no baja. La lectura 0 se reparte en toda la escala.

Medidas de RF-42 (comprobadas en pruebas sobre los conjuntos de RF-41, no garantizadas por
construcción): (a) la fotografía repite tier, división y puntos con probabilidad ≤ 2/3 ·
1/100 por lectura (la banda más estrecha tiene 100 valores), así que fallar "al menos 5 de
10 cambian" exige 6 repeticiones; (b) un identificador no cambia de escalón en 10 lecturas
con probabilidad ≤ (2/3)^10 ≈ 1,7 % (solo en un extremo), así que se esperan ~100 de 100,
lejos del mínimo de 50. Si alguna medida fallara al implementar, el implementer para y se
vuelve a este plan (la regla es contrato, RF-41).

### 4.3 Lectura completa [RF-36, RF-43, DP-8, DP-31]
```
simulateReading({ gameId: g, canonical: c, readingNumber: n, now }):
  rng = rng_n; rng()                              // descarta el valor que usa stepAt
  paso = stepAt(g, c, n); { tier, division } = ladder(g)[paso]
  { min, max } = pointsBand(g, paso); points = randInt(rng, min, max)
  snapshot = { tier, [division], points, normalized: normalizeStep(g, paso), recordedAt: now }
  count = randInt(rng, 1, 8); edad = 0; matches = []
  para j = 0..count − 1:
    si j > 0: edad += randInt(rng, 20, 180)       // minutos, ≥ 1 (RF-43)
    result = rng() < 0.5 ? "win" : "loss"
    durationMinutes = randInt(rng, DUR[g])
    mag = randInt(rng, DELTA[g]); rankDelta = result = "win" ? mag : −mag
    summary = summaryFor(g, rng, result)
    matches.push({ id: `m-${n}-${j}`, gameId: g, playedAt: new Date(now.getTime() − edad·60000),
                   result, summary, durationMinutes, rankDelta })
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

| Juego | DUR | DELTA | Resumen (`·` = U+00B7 con un espacio a cada lado) |
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
isVerified(c) = (Σ c.charCodeAt(i)) % 2 === 0
```
Depende solo del identificador canónico (y del juego, por el patrón); igual para todas las
lecturas y usuarios. Se calcula a mano, así que las pruebas se escriben antes que el
código. Recuento sobre los conjuntos de RF-41 (la paridad solo depende de la suma de los
dígitos de i, impar en 51 de los 100 valores; las partes fijas suman 1103 en LoL (impar),
748 en R6 (par) y 371 + 10·48 en CS2 (impar)): LoL 51, R6 49, CS2 51, todos en 40–60.

| Juego | Verificadas | No verificadas |
| --- | --- | --- |
| lol | `jugador1#las` (1152), `Jugador3#LAS` (canónico `jugador3#las`, 1154) | `jugador2#las` (1153), `jugador4#las` (1155) |
| r6 | `jugador2` (798), `jugador4` (800) | `jugador1` (797), `jugador3` (799) |
| cs2 | `76561190000000001` (852), `76561190000000003` (854) | `76561190000000002` (853), `76561190000000004` (855) |

---

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
initialState(r, now) = { currentRank: r.snapshot, rankHistory: [r.snapshot],
  matches: mergeMatches([], r.matches, r.mainMatchId), readingNumber: 0, lastSyncedAt: now, verified: r.verified }
applySync(s, r, n, now) = { currentRank: r.snapshot,
  rankHistory: shouldAppendSnapshot(s.currentRank, r.snapshot) ? [...s.rankHistory, r.snapshot] : s.rankHistory,
  matches: mergeMatches(s.matches, r.matches, r.mainMatchId), readingNumber: n, lastSyncedAt: now, verified: r.verified }
shouldAppendSnapshot(p, q) = p.tier ≠ q.tier || p.division ≠ q.division || p.points ≠ q.points     // DP-9
compareCodePoints(a, b): recorre los códigos (codePointAt, avanzando 1 o 2 unidades); el
  primero distinto decide; si uno es prefijo, el más corto va antes
compareMatches(a, b) = (b.playedAt − a.playedAt) || −compareCodePoints(a.id, b.id)  // reciente primero; id mayor primero
mergeMatches(saved, incoming, mainId):
  todos = saved ++ [m ∈ incoming | m.id ∉ ids(saved)]          // se conserva la guardada
  ordenar(todos, compareMatches)
  si |todos| ≤ 20 o mainId ∈ ids(todos[0..19]) → todos[0..19]
  si no → ordenar([main] ++ (todos sin main)[0..18], compareMatches)
recentMatches(ms) = ms[0..7]
winRate(ms) = |ms| = 0 ? 0 : Math.round(victorias · 100 / |ms|)  // 5/8 = 62,5 → 63 (exacto en binario)
trend(cur, hist) = hist vacío ? 0 : cur.normalized − hist[0].normalized
```
El historial va en orden de lectura (DP-36): su último elemento coincide con el vigente
salvo, quizá, la fecha. `compareCodePoints` cumple RF-28 ("código Unicode") también fuera
de ASCII, donde `<` de JavaScript compara unidades UTF-16.

---

## 6. Interfaz REST y algoritmos

Todas las rutas exigen sesión (RF-1) con el `withUser` existente, que ya da 401 "token
inválido" a la credencial de un usuario eliminado (RF-44). El controlador toma
`const now = clock()` una sola vez por petición. Errores: `{ error }`.

| Método y ruta | Orden de revisión (RF-29), tras cuerpo (001) y sesión | Éxito |
| --- | --- | --- |
| `GET /api/accounts?user=&game=` | `parseAccountFilters` (usuario, luego juego) | 200 lista |
| `GET /api/accounts/:id` | decodificación (guardia) → formato → existencia | 200 cuenta |
| `POST /api/accounts` | `validateLinkPayload` → duplicado | 201 cuenta |
| `PATCH /api/accounts/:id` | decodificación → formato → existencia → propiedad → RF-22 → RF-38 | 200 cuenta |
| `DELETE /api/accounts/:id` | decodificación → formato → existencia → propiedad | 204 |
| `POST /api/accounts/:id/sync` | decodificación → formato → existencia → propiedad | 200 cuenta |
| `GET /api/users/:id/games/:gameId` | id (`me`, formato) → juego → usuario existe → cuenta existe (RF-13) | 200 resumen |
| `DELETE /api/users/:id` (003) | sin cambios hasta el 403; después la cascada de 6.8 | 204 |

### 6.1 Guardias [RF-1, RF-13, RF-29; D1]
- `matchAccountRoute(method, path)` replica el emparejamiento de Express 5 (`/` final
  opcional, `sync` sin distinguir mayúsculas, `HEAD` = `GET`, `"/"` y `"//"` = raíz):
  `GET /` → list; `POST /` → link; `GET|PATCH|DELETE /<seg>` → account;
  `POST /<seg>/sync` → sync; cualquier otro par → null (sigue al 404 de la spec 001 sin
  sesión, como en la 003).
- `createAccountRoutesGuard({ withUser })`, montada con `router.use` antes de las rutas:
  si `null` → `next()`; si no, `withUser` y después, en account/sync,
  `decodeSegment(rawSegment) === null` → 400 "id con formato inválido".
- `matchUserRoute` añade `GET /<seg>/games/<juego>` → `{ kind: "gameSummary", rawSegment,
  rawGame }` (`games` sin distinguir mayúsculas). En la guardia de usuarios, si alguno de
  los dos segmentos no se puede decodificar, responde el error de
  `resolveSummaryTarget(decodeSegment(rawSegment), decodeSegment(rawGame), userId)`, que
  mantiene el orden de RF-13: id no decodificable o sin formato → "id con formato
  inválido"; si no, juego no decodificable → "juego no válido" (D16).

### 6.2 Listar [RF-2, DP-38]
```
f = parseAccountFilters(request.query, userId)
  // user: presente → debe ser un único texto; resolveUserTarget(texto, userId) (me exacto o 24 hex);
  //   arreglo, "", "Me", " me", "%zz" literal → "id con formato inválido"
  // solo si user es válido o falta: game presente → único texto e isGameId; si no → "juego no válido"
  // cualquier otro nombre de parámetro se ignora (User, user[], page)
si f.error → 400
filtro = {}; si f.userId: filtro.user = f.userId; si f.gameId: filtro.gameId = f.gameId
cuentas = await GameAccount.find(filtro).sort({ _id: 1 })
200 (await withExistingOwners(cuentas)).map(toAccountJson)
```
`withExistingOwners` descarta las cuentas cuyo dueño no existe con una sola consulta
`User.find({ _id: { $in: dueños } }, { _id: 1 })` (D10). El orden por `_id` ascendente
coincide con el del identificador en minúsculas (los 12 bytes del ObjectId se comparan en
el mismo orden que su hexadecimal). Un `user` válido sin usuario da `[]`.

### 6.3 Obtener [RF-3]
```
id = resolveAccountId(request.params.id)        → 400 "id con formato inválido" (me, 23/25 hex)
cuenta = await GameAccount.findById(id)
si cuenta = null o (await User.exists({ _id: cuenta.user })) = null → 404 "cuenta no encontrada"   // D10
200 toAccountJson(cuenta)
```

### 6.4 Vincular [RF-4, RF-5, RF-6, RF-7, RF-46, RF-47]
```
v = validateLinkPayload(request.body)            // juego → identificador → región; solo gameId, handle, region
si v.error → 400
si await GameAccount.exists({ user: userId, gameId }) → 400 "ya tienes una cuenta vinculada en este juego"
r = simulateReading({ gameId, canonical: canonicalHandle(handle), readingNumber: 0, now })
resultado = await linkAccount(userId, v.value, initialState(r, now))
  201 toAccountJson | 400 duplicado | 404 "usuario no encontrado"

linkAccount(userId, datos, estado):                              // services/accountWrites.ts
  try cuenta = await GameAccount.create({ user: userId, ...datos, ...estado })   // un solo insert: todo o nada
  catch E11000 → { duplicate }                                   // dos vinculaciones simultáneas (RF-5)
  try
    si (await User.exists({ _id: userId })) = null:              // usuario borrado mientras tanto (RF-47)
      await GameAccount.deleteOne({ _id: cuenta._id }); return { userGone }        // 404, sin cuenta
  catch error
    await GameAccount.deleteOne({ _id: cuenta._id }); throw error                  // 500 sin cuenta (RF-46)
  return { created: cuenta }
```
- Vincular no lee ni escribe el usuario más allá de esa comprobación (RF-46).
- El índice único `{ user: 1, gameId: 1 }` resuelve la carrera de RF-5; la consulta previa
  da el mensaje sin intentar el insert en el caso normal.
- RF-47: si la comprobación posterior encuentra al usuario, responde 201 y la cascada
  (6.8) borra la cuenta; si no lo encuentra, compensa y responde 404 (D9).

### 6.5 Editar [RF-7, RF-8, RF-11, RF-22, RF-38, RF-40]
```
id = resolveAccountId(...) → 400
updateOwnedAccount(id, userId, (cuenta) =>
  e = validateAccountEdit(cuenta, request.body)
     // handle: propiedad propia presente → no texto, o canonicalHandle(trim) ≠ canonicalHandle(cuenta.handle) → RF-22
     // después region: presente → normalizeRegion(cuenta.gameId, valor) = null → RF-38
     // gameId del cuerpo nunca se lee; cuerpo ausente, [], text/plain o {} → sin cambios (RF-40)
  si e.error → 400
  si e.value.region definida y ≠ cuenta.region: cuenta.region = e.value.region; return "guardar"
  return "sin cambios")                                         // 200 sin escribir
```

### 6.6 Desvincular [RF-9, RF-11, RF-46]
```
id = resolveAccountId(...) → 400
cuenta = await GameAccount.findById(id) → null: 404 "cuenta no encontrada"
si cuenta.user ≠ userId → 403
r = await GameAccount.deleteOne({ _id: id, user: userId })      // un solo delete: historial y partidas con ella
r.deletedCount = 0 → 404 "cuenta no encontrada"                 // otra desvinculación o la cascada ganó (RF-39, RF-47)
204 sin cuerpo
```

### 6.7 Resincronizar [RF-10, RF-15, RF-28, RF-45]
```
id = resolveAccountId(...) → 400
updateOwnedAccount(id, userId, (cuenta) =>
  n = cuenta.readingNumber + 1
  r = simulateReading({ gameId: cuenta.gameId, canonical: canonicalHandle(cuenta.handle), readingNumber: n, now })
  asignar applySync(estado(cuenta), r, n, now) a la cuenta; return "guardar")

updateOwnedAccount(id, userId, aplicar, maxIntentos = 5):          // services/accountWrites.ts
  repetir:
    cuenta = await GameAccount.findById(id)        → null: 404 "cuenta no encontrada"
    si cuenta.user ≠ userId                        → 403 "no tienes permiso para esta operación"
    resultado = aplicar(cuenta)                    → 400: se responde; "sin cambios": 200 con cuenta
    try await cuenta.save(); return 200 cuenta
    catch VersionError → siguiente intento         // otra escritura ganó o la cuenta ya no existe
  agotados → throw → 500 (la cuenta no cambió)
```
- `optimisticConcurrency: true`: `save()` solo escribe si `__v` no cambió (y lo
  incrementa); si la cuenta se borró, Mongoose lanza `VersionError` y el reintento la
  encuentra `null` → 404. `save()` nunca recrea (sin upsert).
- Una sola escritura por operación: si falla con otro error, nada cambia, incluido
  `readingNumber` (RF-45); el reintento solo ocurre ante `VersionError`.
- Resultado de RF-39 (cada caso, con la primera operación detenida entre su lectura y su
  escritura y la segunda completa entre medias):
  - dos resincronizaciones: la segunda guarda n; la primera choca, relee y guarda n + 1;
    estado = aplicarlas en serie;
  - edición y resincronización, dos ediciones: la detenida choca, relee y aplica encima;
    ningún cambio se pierde; cada respuesta lleva la cuenta tras aplicarse ella;
  - desvinculación con edición o resincronización: si la desvinculación va en medio, la
    otra choca, relee `null` → 404; si la detenida es la desvinculación, la otra responde
    200 y después la desvinculación borra (204);
  - dos desvinculaciones: la de en medio 204; la detenida `deletedCount` 0 → 404.

### 6.8 Eliminar usuario: cascada ordenada (cambio en la ruta de la spec 003) [RF-14, RF-47, DP-42]
Antes: un único `User.deleteOne`. Después (mismas comprobaciones 400 y 403 de la 003):
```
await GameAccount.deleteMany({ user: userId })            // C1: las cuentas primero
try     await User.deleteOne({ _id: userId })             // C2: el usuario, lo último
finally await GameAccount.deleteMany({ user: userId })    // C3: barrido, también si C2 lanza
response.clearCookie(...); 204                            // solo si C1, C2 y C3 terminaron
```
- Un error en cualquier paso llega al `errorHandler` (500) sin borrar la cookie, así que la
  sesión sigue sirviendo para repetir la eliminación.
- Estados tras un 500 (RF-14): falla C1 antes de borrar nada o tras borrar algunas →
  estado (1) con todas o algunas cuentas; falla C2 sin borrar el usuario → C3 corre →
  estado (1) sin cuentas; falla C2 tras borrar el usuario → C3 corre → estado (2); falla C3
  → el usuario ya no existe y C1 ya había borrado sus cuentas → estado (2).
- Vinculación simultánea (RF-47): si crea la cuenta antes de C1, C1 la borra; entre C1 y
  C2, C3 la borra (también si C2 lanza tras borrar el usuario); después de C2, su
  comprobación posterior no encuentra al usuario y compensa (404).
- Límites sin transacciones (riesgo R2): la cuenta de una vinculación detenida existe unos
  milisegundos entre su `create` y su compensación, y un fallo doble (vinculación entre C1
  y C2 **y** fallo de C3) dejaría una cuenta sin dueño. En ambos casos ninguna lectura la
  muestra (D10) y nadie puede operar sobre ella.
- Llamadas como métodos estáticos sin encadenar (`await GameAccount.deleteMany(...)`,
  `await User.deleteOne(...)`), para que las pruebas las sustituyan (R3 de la 003).
- Spec 006 deberá insertar sus sesiones antes de C2 con el mismo patrón.

### 6.9 Resumen por juego [RF-12, RF-13, RF-37]
```
t = resolveSummaryTarget(params.id, params.gameId, userId)   // me exacto → sesión; formato → 400 id; juego exacto → 400 juego
si t.error → 400
si (await User.exists({ _id: t.userId })) = null → 404 "usuario no encontrado"
cuenta = await GameAccount.findOne({ user: t.userId, gameId: t.gameId })
si cuenta = null → 404 "el jugador no tiene una cuenta vinculada en este juego"
ms = recentMatches(partidas(cuenta))
200 { account: toAccountJson(cuenta),
      recentMatches: ms.map(m → { id: m.matchId, gameId, playedAt, result, summary, durationMinutes, rankDelta }),
      winRate: winRate(ms), trend: trend(cuenta.currentRank, cuenta.rankHistory) }
```

---

## 7. Modelo y mensajes

### 7.1 `GameAccount` [RF-4, RF-5, RF-37, RNF-3, DP-32, DP-33]

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `user` | ObjectId → `User` | required. Nunca cambia. |
| `gameId` | String | required, `enum: GAME_IDS` |
| `handle` | String | required; recortado y con sus mayúsculas (lo hace el controlador; sin `trim`/`lowercase` en el esquema) |
| `region` | String | required, grafía de la lista |
| `currentRank` | `SnapshotSchema` | required |
| `rankHistory` | [`SnapshotSchema`] | orden de lectura, sin límite |
| `matches` | [`MatchSchema`] | máx. 20 (validador), orden RF-28. Interno. |
| `readingNumber` | Number | required, entero ≥ 0. Interno. |
| `lastSyncedAt` | Date | required |
| `verified` | Boolean | default `false`; lo fija la lectura |
| índice | `{ user: 1, gameId: 1 }` | único (RF-5) |
| opciones | `optimisticConcurrency: true` | RF-39 |

- `SnapshotSchema` (`_id: false`): `tier`, `division` opcional, `points` (entero),
  `normalized` (entero 0–100), `recordedAt`. `MatchSchema` (`_id: false`): `matchId` (no
  `id`, que choca con el virtual de Mongoose), `gameId`, `playedAt`, `result` (`win|loss`),
  `summary`, `durationMinutes`, `rankDelta`.
- `toAccountJson(cuenta)` en lista blanca (como `toPublicUserJson`):
  `{ id, userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified,
  simulated: true }`, con `id` y `userId` en minúsculas (`toString()`), fotografías sin
  `division` cuando no existe y fechas `Date` (Express las serializa en ISO con
  milisegundos y `Z`). `toJSON` del esquema usa la misma función. `simulated` no se guarda:
  ningún cuerpo puede cambiarla (RF-7, RF-37).
- El esquema repite las reglas como red de seguridad; los mensajes que ve el cliente salen
  de `accountRules.ts` antes de tocar la base.

### 7.2 Textos exactos [DP-6]

| Código | Texto | Cuándo |
| --- | --- | --- |
| 401 | los de la spec 002 (`sesión no iniciada`, `token inválido`, `sesión expirada`…) | RF-1; usuario eliminado → `token inválido` (RF-44) |
| 400 | `id con formato inválido` (`MESSAGES.invalidId`) | id de cuenta (RF-29), filtro `user` (RF-2), id del resumen (RF-13) |
| 400 | `juego no válido` | RF-2, RF-6, RF-13 |
| 400 | `Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres antes de # y 2 a 5 letras o dígitos después` | RF-6 |
| 400 | `Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo` | RF-6 |
| 400 | `SteamID64 no válido: son 17 dígitos que empiezan por 7656119` | RF-6 |
| 400 | `región no válida para <nombre>` (`League of Legends`, `Rainbow Six Siege`, `Counter-Strike 2`) | RF-6, RF-38 |
| 400 | `ya tienes una cuenta vinculada en este juego` | RF-5 (también el E11000) |
| 400 | `el identificador del juego no se puede editar: desvincula la cuenta y vuelve a vincularla` | RF-22 |
| 403 | `no tienes permiso para esta operación` (`MESSAGES.forbidden`) | RF-11 |
| 404 | `cuenta no encontrada` | RF-29, RF-39, RF-47 |
| 404 | `usuario no encontrado` (`USER_TARGET_MESSAGES.userNotFound`) | RF-13, RF-47 |
| 404 | `el jugador no tiene una cuenta vinculada en este juego` | RF-13 |
| 500 | `error interno del servidor` | spec 001 (RF-45, RF-46, RF-14) |

Ningún 409 ni 503. Ningún texto ni campo nombra a Riot Games, Ubisoft, Valve, FACEIT ni
otra fuente (RNF-2); "Riot ID", "Ubisoft ID" y "SteamID64" nombran el formato.

---

## 8. Decisiones técnicas (con la alternativa descartada)

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

## 9. Estrategia de pruebas

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

**`unit/rankScale.test.ts`** [RF-36, RF-48, DP-26, DP-34]: tamaños 31/36/7; todos los valores
de 3.2; bandas de 3.3 en sus extremos.

**`unit/rankSimulator.test.ts`** [RF-35, RF-36, RF-41, RF-42, RF-43]: mismas entradas →
`deepStrictEqual`; mayúsculas/recortables → misma lectura (vía `canonicalHandle`);
fotografía en escala, `division` solo si existe, puntos enteros en banda, normalizado
coherente; 1–8 partidas, juego, ids distintos, una sola con `playedAt = now`, las demás
≥ 1 min antes, todos los campos y formato de resumen; para los 100 identificadores de cada
conjunto y n = 0..30: ±1 escalón, principal de n ausente en 0..n − 1; mismo n a dos
instantes → igual salvo fechas desplazadas; medidas (a) y (b) de RF-42 sobre n = 0..10;
verificada: los 12 ejemplos de 4.4, 51/49/51, estable en n = 0..10.

**`unit/accountState.test.ts`** [RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36]:
`mergeMatches` sin repetidos (conserva fecha guardada), orden, desempate `m-9-0` antes que
`m-10-0`, `compareCodePoints` con un carácter astral frente a U+FFFF, corte en 20,
principal conservada con más de 20 partidas de fecha igual o posterior; `applySync` sin
cambio de rango (no agrega fotografía, último = vigente salvo fecha) y con reloj atrasado;
`initialState`; `winRate` 5/8 = 63, 0/8 = 0; `trend` con un elemento = 0;
`recentMatches` = 8 primeras.

**`unit/accountRules.test.ts`** [RF-2, RF-6, RF-7, RF-13, RF-22, RF-38, RF-40]: orden
juego → identificador → región y textos exactos; nulo, vacío, recortables, no texto;
arreglo/ausente → "juego no válido"; campos extra ignorados; edición: mismo identificador
con otras mayúsculas o recortable ignorado, distinto/nulo/vacío → RF-22 antes que RF-38,
`gameId` del cuerpo ignorado, cuerpo vacío → `{}`; filtros: `user` arreglo, `""`, `Me`,
`" me"`, `%zz` → id (también con `game` inválido); `game` arreglo, `""`, `LOL`, `" lol"` →
juego; `user=me` → sesión; id en mayúsculas → minúsculas; claves desconocidas ignoradas;
`resolveSummaryTarget` en el orden de RF-13 (incluidos los `null`).

**`unit/accountTarget.test.ts`** [RF-29]: tabla de `matchAccountRoute` (con `HEAD`, `/`
final, `SYNC`, `PUT /x` → null, `/x/sync/y` → null); `resolveAccountId` (`me`, 23, 25, `g`
→ error; mayúsculas → minúsculas).

**`unit/userTarget.test.ts`** (modifica) [RF-13]: `GET /x/games/lol`, `/x/GAMES/lol/` →
`gameSummary`; `POST /x/games/lol`, `/x/games` y `/x/games/lol/y` → null; el resto de la
tabla de la 003 sigue igual.

**`unit/gameAccountModel.test.ts`** [RF-37, RNF-3, DP-32, DP-33]: `toAccountJson` de un
documento sin guardar: claves exactas, `simulated: true`, sin `_id`, `__v`, `user`,
`matches` ni `readingNumber`; `division` ausente no aparece; `toJSON` = `toAccountJson`.

**`controllers/accountRead.test.ts`** [RF-1, RF-2, RF-3, RF-29, RF-37, RF-44, RNF-3]: 401 en
las seis operaciones de `/api/accounts` (también con id inválido, `%zz` y cuerpo
inválido); 400 "JSON mal formado" antes del 401; credencial de usuario eliminado → 401
"token inválido" en las seis y en el resumen, sin cambios en la base; rutas fuera de la
tabla → 404; listar: cada salto de RF-2 (incluidos `user=m%65`, `user=%zz`, repetidos,
`User=abc`, `user[]=abc`, `page=2`), orden por id, dos peticiones = mismo orden, `user`
inexistente → `[]`, cuenta sin dueño (insertada con el driver) no aparece; obtener: propia
y ajena, id en mayúsculas → `id` en minúsculas, `abc`/23/25/`me`/`%zz` → 400, inexistente →
404, sin dueño → 404; forma exacta de RNF-3 y fechas `ISO_MS_Z`.

**`controllers/accountLink.test.ts`** [RF-4, RF-5, RF-6, RF-7, RF-29, RF-37, RF-46, RF-47,
RNF-2]: 201 en los tres juegos con respuesta y base = `expectedLinked` (incluidos
`readingNumber` 0 y partidas internas); identificador guardado recortado con sus
mayúsculas; región con la grafía de la lista; cuerpo con `user`, `currentRank`,
`verified`, `readingNumber`, `simulated: false` → ignorados; un caso por mensaje de RF-6
y su orden; `[]`, sin cuerpo, `text/plain` → "juego no válido"; `"x"`/`5`/`null` → "JSON
mal formado"; duplicado → 400; dos vinculaciones simultáneas (`Promise.all`) → un 201 y un
400, una sola cuenta; dos usuarios con el mismo identificador, otra región u otras
mayúsculas → misma lectura y misma verificada; datos del usuario idénticos tras vincular
(`rawUser`); RF-46: `User.exists` (2.ª llamada) forzado a lanzar → 500, sin cuenta, la
siguiente vinculación 201; `GameAccount.create` forzado a lanzar → 500 y sin cuenta;
RF-47: `GameAccount.create` borra el usuario (driver) y delega → 404 "usuario no
encontrado" y ninguna cuenta; vinculación terminada y después `DELETE /api/users/me` →
cuenta borrada; ninguna respuesta contiene `Riot Games`, `Steam Web API`,
`r6.tracker.network`, `FACEIT` ni `Valve`.

**`controllers/accountEdit.test.ts`** [RF-7, RF-8, RF-9, RF-11, RF-22, RF-29, RF-38, RF-40,
RF-45, RF-46]: editar región con otra grafía → 200, base con la grafía de la lista y
rango, historial, partidas, `readingNumber` y `lastSyncedAt` iguales; RF-22 y RF-38 con
base intacta (incluidos nulo, vacío, `"   "`); mismo identificador con otras mayúsculas o
recortable + región nueva → 200; cuerpo vacío, sin cuerpo, `{}`, `[]`, `text/plain`, solo
ignorados, `gameId` inexistente → 200 sin cambios (`__v` igual); un caso por salto de
RF-29 (id → 400, inexistente → 404, ajena → 403 aun con región inválida, identificador
distinto + región inválida → RF-22); `save` forzado → 500 y base intacta; desvincular →
204 sin cuerpo y la cuenta desaparece; ajena → 403; `GameAccount.deleteOne` forzado →
500 y la cuenta sigue completa; datos del usuario idénticos tras editar y desvincular;
tras desvincular, `user=me` ya no la lista; volver a vincular → lectura 0 de nuevo.

**`controllers/accountSync.test.ts`** [RF-10, RF-11, RF-15, RF-28, RF-29, RF-42, RF-43,
RF-45]: vincular y resincronizar dos veces una cuenta de cada juego con instantes fijos
distintos → respuesta y base = `expectedSynced` con n = 1 y 2 (rango, historial según
DP-9, partidas, `readingNumber`, `lastSyncedAt`, verificada estable); resincronización sin
cambio de rango (identificador elegido con las funciones puras) → historial igual y último
= vigente salvo fecha; ≤ 20 partidas tras varias resincronizaciones con la principal de
la última presente; reloj atrasado → se procesa igual; ajena → 403 sin cambios; cuerpo
cualquiera ignorado; `save` forzado → 500, base idéntica y la siguiente resincronización
usa el mismo número; datos del usuario idénticos.

**`controllers/accountConcurrency.test.ts`** [RF-39, RF-47]: con `overlapFirstFindById`,
un `test` por caso: dos resincronizaciones; edición + resincronización en los dos órdenes;
dos ediciones; desvinculación + edición y desvinculación + resincronización en los dos
órdenes; dos desvinculaciones. Cada uno comprueba las dos respuestas y el estado final
contra la aplicación en serie. RF-47: la segunda operación es `DELETE /api/users/me`
(cascada real) mientras la primera edita, resincroniza o desvincula → 404 "cuenta no
encontrada", ninguna cuenta ni usuario queda, nunca 500.

**`controllers/gameSummary.test.ts`** [RF-12, RF-13, RF-29, RF-37]: resumen propio (`me`,
`m%65`, id en mayúsculas) y ajeno: `account` con forma de RNF-3, `recentMatches` = 8
primeras con `id`, `winRate` y `trend` calculados con las funciones puras; cada salto de
RF-13 (`Me`, `ME`, `%20me`, `%zz`, 23 hex → id; `LOL`, `%20lol`, `%zz` en el juego → juego;
`Me` + juego `%zz` → id; inexistente → usuario; sin cuenta → jugador); 401 sin sesión;
`POST` a la ruta → 404.

**`controllers/userDeletionCascade.test.ts`** [RF-14, RF-47]: usuario con cuentas en los
tres juegos → 204, sin usuario ni cuentas suyas, las de otro usuario intactas; listar sin
filtro no muestra cuentas sin dueño. Fallos forzados, uno por `test`:
1. `GameAccount.deleteMany` (1.ª) lanza sin borrar → 500; estado (1) con las tres.
2. `GameAccount.deleteMany` (1.ª) borra una con el driver y lanza → 500; estado (1) con dos
   completas; volver a vincular ese juego → 201.
3. `User.deleteOne` lanza sin borrar → 500; estado (1) sin cuentas.
4. `User.deleteOne` borra con el driver y lanza → 500; estado (2); la credencial → 401
   "token inválido".
5. `GameAccount.deleteMany` (2.ª, el barrido) lanza tras borrar el usuario → 500; estado (2).
En cada estado (1): la sesión sigue valiendo, las cuentas que quedan se obtienen, editan,
resincronizan y desvinculan, y repetir la eliminación → 204 sin cuentas suyas.
Vinculación simultánea: `User.deleteOne` ejecuta primero una vinculación completa (201,
cuenta creada después de C1) y luego delega → (a) 204 y (b) lanzando tras delegar → 500;
en ambos, ni usuario ni cuenta. Las pruebas de la 003 (`userDeletion.test.ts`) siguen
verdes.

### 9.3 Verificaciones fuera de `npm test`
`npm run typecheck` y `npm run lint` en verde; sin `.only`, `any` ni `@ts-ignore`; sin
`Math.random`, `Date.now`, `new Date()` sin argumentos, `process.env`, `fetch` ni
`node:http` en `src/domain/`; `git diff backend/package.json backend/.env.example` sin
dependencias ni variables nuevas; suite completa sin conexión a Internet (solo MongoDB
local); recorrido manual de `requests/accounts.rest`.

---

## 10. Riesgos
- **R1 (constitución). Resuelto (2026-10-18).** La aclaración está al final del principio
  5 (línea 12). Si el usuario la cambiara más adelante, se revisa RNF-2.
- **R2 (sin transacciones).** La cuenta de una vinculación concurrente puede existir unos
  milisegundos antes de su compensación, y un fallo doble (vinculación entre C1 y C2 y
  fallo del barrido C3) dejaría una cuenta sin dueño en la base. D10 la oculta en todas las
  lecturas; ninguna prueba de la spec fuerza ese fallo doble.
- **R3 (respuesta de una vinculación concurrente).** Si el usuario desaparece entre el
  `create` y la comprobación posterior, no se puede saber si se creó antes o después de
  borrarlo: se responde 404 "usuario no encontrado" en ambos casos (RF-47 diría 201 en el
  primero). El estado final es el mismo (sin cuenta). **Aceptado por el usuario el
  2026-10-18 (decisión del usuario):** se mantiene el 404 en ambos casos.
- **R4 (orden de consumo del generador).** Es contrato: cambiarlo cambia todas las
  lecturas de la demostración y exige volver al plan.
- **R5 (paridad con Express).** `matchAccountRoute` y la ruta nueva de `matchUserRoute`
  replican el emparejamiento de Express 5; las pruebas de `/` final y mayúsculas en `sync`
  y `games` sin sesión (401, no 404) detectan desajustes.
- **R6 (mocks por número de llamada).** Las pruebas de RF-46 cuentan las llamadas a
  `User.exists` (la primera es la de `withUser`); si cambia el orden de llamadas, la
  prueba falla en rojo, no en falso verde.
- **R7 (índice único).** En producción lo crea `autoIndex` al conectar; las pruebas llaman
  `GameAccount.init()` para no depender de ello.
- **R8 (normalización).** Difiere de la de la interfaz hasta la spec 007 (RF-48).

---

## 11. Trazabilidad

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