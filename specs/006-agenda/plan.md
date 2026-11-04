# Plan 006 — Agenda de sesiones de juego
Estado: aprobado (2026-10-19, decisiones Q1–Q4 incorporadas); implementado.
Aprobado originalmente el 2026-10-18; T1 a T3 se implementaron con esa versión. Esta revisión
adapta nombres, firmas, rutas y comportamientos a `backend/` real (sección "Ajuste de
supuestos") e incorpora las decisiones del usuario Q1 a Q4 del 2026-10-19 (sección "Preguntas
resueltas"). El único cambio de requisito, el texto del 401 del usuario eliminado ("token
inválido", Q1), ya está aprobado en la spec (RF-18, DP6-39).
Spec: `specs/006-agenda/spec.md` (aprobada el 2026-10-18, con el cambio aprobado del
2026-10-19; DP6-1 a DP6-40).

**Precondición:** las specs 001 a 005 las implementaron otros miembros del equipo y están
implementadas y validadas (2026-10-19, `MEMORY.md`; sección 0). Lo que este plan toma de
ellas son **supuestos**, no piezas de la 006: el 2026-10-19 se comprobaron contra el código
real de `backend/` y se corrigieron en este plan; antes de empezar cada tarea, quien
implemente vuelve a comprobar los que esa tarea usa (sección 0, "Comprobación de
supuestos"). Si algo no coincide o no existe, **para y lo reporta**; no implementa ni adapta
piezas de 001 a 005.
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, sección 2 (409 para
conflictos de estado, 403 recurso ajeno, 400 formato de id), RT-07 a RT-12, sección 5.4
(`PlaySession`), 5.5 (montaje del router), 5.7 (errores) y 8 (`sessions.test.ts` y
`app.test.ts`), salvo lo que la spec anula en "Qué prevalece sobre la referencia" (sección 10
de este plan).

## Ajuste de supuestos (2026-10-19)
Al preparar T4 se comparó cada supuesto de la sección 0 del plan del 2026-10-18 con el código
real de `backend/` (`src/` y `tests/`; graphify no se pudo consultar por CLI en esa sesión
del planificador, así que se leyeron directamente las fuentes y `node_modules/body-parser`).
Solo cambian nombres, firmas, rutas y comportamientos; los requisitos y las decisiones de la
spec quedan igual. T1 a T3 (hechas) coinciden con las firmas de la sección 2 y no se tocan.

| # | Supuesto original | Realidad verificada | Efecto en el plan |
| --- | --- | --- | --- |
| 1 | `backend/` no existe; 001 a 003 en borrador, 004 y 005 sin implementar. | `backend/` existe y 001 a 005 están implementadas y validadas (1567 tests, `MEMORY.md` 2026-10-19). Express 5.1.0, Mongoose 8.24.5, body-parser 2.3.0, TypeScript ejecutado directo (Node ≥ 22.18), ESM. | Sección 0 reescrita. |
| 2 | `backend/tests/controllers/test_helper.ts`. | `backend/tests/controllers/helpers.ts` (se importa como `./helpers.ts`). | El punto de enganche a modificar es `helpers.ts`. |
| 3 | `loginAs(user) → { agent, csrfToken }`, `usersInDb`, `nonExistingId`. | `loginAs(app: Server, email, password) → { agent, csrf, cookie, response }`. `signUp(app, data?) → SignedUp` (`LoggedIn` + `id` y `email`) registra e inicia sesión. `nonExistingId()` existe (sin argumentos). `usersInDb` **no existe** ni hace falta (se usa `User` directo). También existen `authApp(overrides?) → Server`, `closeTestServers`, `listenOnLoopback`, `withSession(request, csrf)`, `rawCookieRequest(app, method, path, cookie, csrf)`, `deleteMe(session)`, `link`/`linkOk`/`edit`/`unlink`/`sync(session, …)`, `FIXED_NOW` (número en ms), `accountsInDb`/`rawAccountsInDb`, `setCreatedAt` (solo `User`) y `overlapFirstFindById` (solo `GameAccount`). | No se crea `createUserAndLogin` (es `signUp`). Helpers nuevos de la 006 en `helpers.ts`: `sessionsInDb`, `rawSessionsInDb`, `linkAccountFor(session, gameId)` (envuelve `linkOk`), `insertSession` y, si T9 lo necesita, un solapamiento análogo a `overlapFirstFindById` para `PlaySession.findById`. |
| 4 | `withUser` y `withExistingUser` en `utils/middleware.ts`, con un guardia propio para el usuario eliminado (supuesto del 2026-10-18, escrito con el texto anterior de la spec). | Solo existe `createWithUser({ jwtSecret, now }): RequestHandler` (tipo `SessionGuardOptions`). Su paso 5 (el usuario existe) ya está dentro y responde **siempre** 401 "token inválido" (RF-44/DP-37 vigentes de la 004, que retiró `withExistingUser`, `createWithExistingUser` y `missingUserError` en su T24; `withUser.test.ts` fija que el texto no es configurable). `matches.ts` hace lo mismo, también en su carrera `noSession` (DP5-16). `request.userId?: string` en `src/types/express.d.ts`. | `withExistingUser` desaparece del plan: cada ruta usa solo `createWithUser`, como `matches.ts`. El 401 del usuario eliminado es "token inválido" (RF-18 y DP6-39 de la spec, cambio aprobado el 2026-10-19; **Q1 resuelta**); "sesión no iniciada" queda solo para la credencial ausente. |
| 5 | `app.ts` exporta `app` y monta `express.json()` por defecto antes de los routers. | `createApp({ jwtSecret, nodeEnv, now? }): Express` (las pruebas usan `authApp()`). Orden real: `express.json({ limit: 102_400, strict: true })` → `cookieParser()` → `/api/users` → `/api/auth` → `/api/accounts` → `/api/matches` → `unknownEndpoint` → `errorHandler`. Los routers son fábricas: `createUsersRouter({ jwtSecret, nodeEnv, now })`, `createAuthRouter(...)`, `createAccountsRouter({ jwtSecret, now })`, `createMatchesRouter(SessionGuardOptions)`. | Parser local `app.use("/api/sessions", express.json({ limit: 102_400, strict: false }))` **antes de la línea del parser global**, y `app.use("/api/sessions", createSessionsRouter({ jwtSecret, now }))` tras `/api/matches` y antes de `unknownEndpoint` (sección 6). Verificado en `node_modules/body-parser/lib/read.js`: `read()` sale sin leer si `onFinished.isFinished(req)`, así que el global no relee el cuerpo y P6-1 se cumple sin tocar 004 ni 005. |
| 6 | `errorHandler` y `unknownEndpoint` con los textos de la referencia. | Coinciden (`utils/errors.ts`, `MESSAGES` y `mapErrorToResponse` por `error.type`: `entity.parse.failed` → 400 "JSON mal formado", `entity.too.large` → 413, `encoding.unsupported`/`charset.unsupported` → 415, el resto → 500 "error interno del servidor"; `unknownEndpoint` → 404 "endpoint desconocido"). Matiz: el error de Express 5 por un `%zz` en `:id` no trae `type` y daría 500; por eso `accounts.ts` y `users.ts` comprueban `decodeSegment` (`services/userTarget.ts`) en una guardia previa. | La 006 agrega la misma guardia de segmento (faltaba en el plan; P6-11, sección 5). |
| 7 | `clock.now()`. | Existe: `src/utils/clock.ts`, `export const clock = { now: (): Date => new Date() }`, mutable; las pruebas hacen `t.mock.method(clock, "now", () => new Date(FIXED_NOW))`. No es el `now` en segundos de `createApp` (credenciales). | Sin cambio. |
| 8 | `isValidId` en `accountRules.ts`. | Existe: `domain/accountRules.ts`, `isValidId(value: unknown): value is string` (24 hexadecimales, mayúsculas o minúsculas, patrón de `domain/userId.ts`). El texto "id con formato inválido" es `INVALID_ID_MESSAGE` (= `MESSAGES.invalidId` = `SESSION_ERRORS.badId`). | Sin cambio. |
| 9 | `GAMES`/`GameId`/`isGameId` y `GameAccount` con `user` y `gameId`. | Existen: `domain/games.ts` (`GAMES`, `GAME_IDS`, `GameId`, `isGameId`) y `models/gameAccount.ts` (`user: ObjectId` ref `User`, `gameId`, índice único `{ user, gameId }`, `optimisticConcurrency`). | Sin cambio (`GameAccount.distinct("gameId", { user })`). |
| 10 | `User` con `username`, `displayName`, `avatarColor`. | Existen en `models/user.ts` (además `email`, `usernameKey`, `passwordHash`, `bio`, `timezone`, `availability`, `createdAt`). | Sin cambio; `loadUserRefs` proyecta solo esos tres campos. |
| 11 | `DELETE /api/users/:id`: `User.deleteOne` primero y luego `GameAccount.deleteMany`. | La ruta existe (`createUsersRouter`; `:id` es `me` o el id propio, ajeno → 403). La cascada real, por RF-14/DP-42 de la 004 (el usuario es lo último que desaparece): C1 `GameAccount.deleteMany({ user })` → C2 `User.deleteOne` dentro de `try` → `finally` C3 `GameAccount.deleteMany({ user })` → `clearCookie` → 204. `userDeletionCascade.test.ts` sustituye esos métodos y fija el orden. | P6-7 se adapta: las sesiones se limpian en un paso C4 posterior a C2 y C3 (sección 6, P6-7). **Aprobado por el usuario (Q3 resuelta)**, con el riesgo documentado en las secciones 6 y 12. |
| 12 | Patrón de reintento optimista de `accountWrites.ts`. | Coincide: `updateOwnedAccount(id, userId, apply, maxAttempts = 5)` (`findById` → regla → `save()`; `VersionError` → reintento; `DocumentNotFoundError` → 404; agotados los intentos, `throw new Error` → 500) y `linkAccount` (crear → `User.exists` → compensar con `deleteOne`). Resultados `{ ok, … }` y controladores sin `try/catch`. | `mutateSession`/`createSession` siguen ese patrón. Diferencia: la compensación de la 006 es 401 "token inválido" (RF-16, RF-18, DP6-39; `SESSION_MESSAGES.invalidToken`, como la carrera `noSession` de `matches.ts`), no 404. |
| 13 | Rutas de las specs 002 a 005 del barrido de 401. | Coinciden: `GET /api/auth/me` (login, logout y `POST /api/users` son públicos); `GET /api/users`, `GET\|PATCH\|DELETE /api/users/:id`, `GET\|PUT /api/users/:id/availability`, `GET /api/users/:id/games/:gameId`; `GET\|POST /api/accounts`, `GET\|PUT\|DELETE /api/accounts/:id`, `POST /api/accounts/:id/sync`; `GET /api/matches`. Sin credencial responden 401 "sesión no iniciada". | Sin cambio en la lista de la sección 9. |
| 14 | Scripts: `npm test` y `npm run typecheck`; DP6-24: no hay lint. | `backend/package.json`: `dev`, `test` (`NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'`), `typecheck` (`tsc --noEmit && tsc --noEmit -p tests`) y **`lint`** (`eslint .`); `MEMORY.md` registra lint en verde en 001 a 005. | DP6-24 sigue vigente: el lint no se exige (**Q4 resuelta**, el usuario lo mantiene sin exigir). Las tareas pueden pedir `npm run lint` como comprobación extra, nunca como criterio de "Hecho cuando". |
| 15 | Convenciones de prueba: `after(() => mongoose.connection.close())`. | Cada archivo de `controllers/`: `const app = await authApp()` arriba; `before`: `await connectDatabase(testConfig().db)` (`src/server.ts`, `tests/server/helpers.ts`) y `Model.init()`; `beforeEach`: `deleteMany({})` por modelo; `afterEach(() => mock.restoreAll())`; `after`: `await closeTestServers(); await mongoose.disconnect()`. Puras en `tests/unit/` (`domainIsolation.test.ts` vigila que `domain/` no importe de `services/`, `utils/`, `models/` ni `controllers/`). | Sección 9 actualizada. |
| 16 | `app.test.ts` de la 001 como prueba que debe seguir verde. | No se pudo localizar con las herramientas del planificador (sin búsqueda de archivos). | Las tareas piden la suite completa en verde, sin nombrar `app.test.ts`. |

### Preguntas resueltas (decisiones del usuario, 2026-10-19)
No queda ninguna pregunta abierta. Las cuatro del ajuste de supuestos las respondió el
usuario así:
- **Q1 (RF-18, criterios de finalización, casos límite y sección 7), resuelta: opción A.**
  El 401 de la credencial válida de un usuario eliminado es "token inválido" (RF-18 y
  DP6-39 de la spec, cambio aprobado el 2026-10-19), igual que en la 004 (RF-44, DP-37) y la
  005 (RF-13, DP5-16). El plan reutiliza `createWithUser` como `matches.ts`, sin guardia
  propia; la compensación de crear y sumarse (el usuario ya no existe) responde lo mismo
  ("token inválido", `SESSION_MESSAGES.invalidToken`). "Sesión no iniciada" queda solo para
  la credencial ausente. Las pruebas de T5, T8, T9 y T10 esperan estos textos.
- **Q2 (textos propios de la 006), resuelta.** Se mantiene el estilo de la 006 (mayúscula
  inicial y punto final). Sin cambios en `SESSION_ERRORS` ni en T1 a T3.
- **Q3 (P6-7, cascada), resuelta: aceptado el paso C4.** `DELETE /api/users/:id` agrega C4
  después de C3: `PlaySession.deleteMany({ host })` y `removeUserFromSessions` (sección 6).
  Riesgo aceptado y documentado: si C4 falla tras borrar al usuario, la respuesta es 500 y
  las sesiones residuales quedan ocultas por RF-24 pero no se pueden limpiar repitiendo la
  eliminación (la credencial ya da 401), equivalente al R2/P-21 de la 004. Se acepta porque
  la spec 004 (RF-14, DP-42) conviene que el usuario sea lo último en desaparecer, y por eso
  C4 no reordena C1 → C2 → C3.
- **Q4 (DP6-24), resuelta.** El lint no se exige. Las tareas pueden pedir `npm run lint` como
  comprobación extra, no como criterio de "Hecho cuando".

## 0. Precondiciones y estado real
- Las specs 001 a 005 están implementadas y validadas (`MEMORY.md`, 2026-10-19). `backend/`
  existe y los nombres reales que usa este plan están en "Ajuste de supuestos".
- Lo que este plan toma de ellas (todo verificado el 2026-10-19):
  - 001/002: `createApp` en `backend/src/app.ts`; `errorHandler`, `unknownEndpoint`,
    `createWithUser` y `SessionGuardOptions` en `backend/src/utils/middleware.ts`;
    `MESSAGES` y `mapErrorToResponse` en `backend/src/utils/errors.ts`; `SESSION_MESSAGES`
    en `backend/src/services/sessionToken.ts` (`notLoggedIn` = "sesión no iniciada", solo
    para la credencial ausente; `invalidToken` = "token inválido", también para el usuario
    eliminado, paso 5 de `createWithUser`, RF-18 y DP6-39); `request.userId` en
    `backend/src/types/express.d.ts`; `connectDatabase` en `backend/src/server.ts`; scripts
    `npm test` y `npm run typecheck`.
  - 003: `User` en `backend/src/models/user.ts`; `DELETE /api/users/:id` en
    `backend/src/controllers/users.ts`; `decodeSegment` y `USER_TARGET_MESSAGES` en
    `backend/src/services/userTarget.ts`.
  - 004: `clock` en `backend/src/utils/clock.ts`; `isValidId` en
    `backend/src/domain/accountRules.ts`; `GAMES`/`GameId`/`isGameId` en
    `backend/src/domain/games.ts`; `GameAccount` en `backend/src/models/gameAccount.ts`; la
    cascada C1 → C2 → C3 de `DELETE /api/users/:id`; el patrón de
    `backend/src/services/accountWrites.ts`; `FIXED_NOW` y los demás helpers de
    `backend/tests/controllers/helpers.ts`.
  - 005: nada obligatorio (la 006 no depende de su funcionalidad). El barrido de 401 incluye
    `GET /api/matches`.
- Parser de consultas de Express 5: el predeterminado (`"simple"`): un parámetro repetido
  llega como arreglo y `?game=` como `''` (igual que planes 004 y 005).
- **Comprobación de supuestos (D6-4):** la implementación de T4–T10 la ejecuta otra
  persona del equipo. Antes de empezar **cada** tarea, quien implemente comprueba contra el
  código real de `backend/` los nombres y firmas de la tabla "Ajuste de supuestos" que la
  tarea usa (cada tarea de `tasks.md` los enumera). Si un archivo, nombre, firma, ruta o
  texto no existe o no coincide, **para y lo reporta**; no crea, completa ni modifica
  piezas de 001 a 005 (salvo los puntos de enganche que este plan marca como "modificar":
  `middleware.ts`, `app.ts`, `users.ts` y `helpers.ts`).
- Ninguna dependencia ni variable de entorno nueva (RNF-4): `express`, `mongoose`,
  `node:test`, `node:assert`, `supertest`. Instalación, si hiciera falta, con
  `--save-exact` (no debería hacer falta).

## 1. Archivos y responsabilidades

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `backend/src/domain/sessionRules.ts` | Reglas puras de entrada: `SESSION_ERRORS` (textos exactos), recorte (`trimText`), largo en puntos de código, carácter prohibido en el título, número entero JSON, objeto plano, `validateCreatePayload`, `validateSessionEdit`, `parseGameFilter`. | RF-6, RF-7, RF-15, RF-22, RF-26, RF-27, RF-28, RNF-2, RNF-3 |
| `backend/src/domain/sessionState.ts` | Reglas puras de estado: `statusFor`, `applyEdit` (RF-8), `applyJoin` (RF-12), `applyLeave` (RF-14, RF-17), `removeParticipant` (cascada), `compareSessions` y `compareByCodePoint` (orden de RF-2), `toSessionView` / `assembleSessionViews` (RNF-1, RF-24). | RF-2, RF-4, RF-7, RF-8, RF-11 a RF-14, RF-16, RF-17, RF-24, RNF-1, RNF-3, DP6-38 |
| `backend/src/models/playSession.ts` | Modelo `PlaySession` (sección 5), `optimisticConcurrency: true`, `createdAt` explícito, validación declarativa como red. | RF-5, RT-07, RT-08, RT-12 |
| `backend/src/services/sessionReads.ts` | `loadUserRefs(ids)` (solo `username displayName avatarColor`), `loadSessionView(id)` y `listSessionViews(gameId|null)`: leen la base y delegan en `assembleSessionViews`. | RF-2, RF-3, RF-4, RF-24 |
| `backend/src/services/sessionWrites.ts` | `createSession` (con compensación), `mutateSession` (reintento optimista), `joinSession` (con compensación), `cancelSession`, `removeUserFromSessions` (cascada). | RF-5, RF-7 a RF-14, RF-16, RF-17, RF-25 |
| `backend/src/utils/middleware.ts` (modificar) | Agrega `requireObjectBody(request: { body?: unknown }, response: JsonResponder, next: () => void): void` (interfaces mínimas como `unknownEndpoint`, para probarlo con objetos falsos): si `request.body !== undefined` y no es objeto plano → 400 `{ error: MESSAGES.malformedJson }` ("JSON mal formado") sin llamar a `next`. No toca `createWithUser`. | RF-20, RF-28 |
| `backend/src/controllers/sessions.ts` | `createSessionsRouter({ jwtSecret, now }: SessionGuardOptions): Router` (mismo patrón que `createAccountsRouter`), montado en `/api/sessions`: listar, obtener, crear, editar, cancelar, sumarse y salir. Capas del router en la sección 5. | RF-1 a RF-15, RF-17 a RF-22, RF-26 a RF-28 |
| `backend/src/controllers/users.ts` (modificar) | En `DELETE /:id` de `createUsersRouter`, **después** de C2 (`User.deleteOne`) y C3 (el barrido de cuentas del `finally`) y antes de `clearCookie`: C4 = `PlaySession.deleteMany({ host })` y `removeUserFromSessions(id)` (sección 6; aprobado por el usuario, Q3). No cambia el orden C1 → C2 → C3 de la 004. | RF-16 |
| `backend/src/app.ts` (modificar) | En `createApp`: `app.use("/api/sessions", express.json({ limit: 102_400, strict: false }))` **antes** de la línea `app.use(express.json({ limit: 102_400, strict: true }))`; `app.use("/api/sessions", createSessionsRouter({ jwtSecret, now }))` tras `/api/matches` y antes de `unknownEndpoint`. | RF-15, RF-23, RF-28, DP6-36 |
| `backend/requests/sessions.rest` | Peticiones manuales: login → crear → listar → obtener → sumarse (otro usuario) → salir → editar → cancelar, con `X-CSRF-Token` (RT-19). | — |
| `backend/tests/unit/sessionRules.test.ts` | Recorte, largo, prohibidos, enteros, objeto plano, filtro, validación de crear y editar con orden y textos. | criterios de RNF-3 |
| `backend/tests/unit/sessionState.test.ts` | Estado, edición, sumarse, salir, cascada, orden (cada desempate), vista y RF-24/DP6-38. | criterios de RNF-3, RF-24 |
| `backend/tests/unit/playSessionModel.test.ts` | Esquema sin conexión (`validateSync`). | RT-08 |
| `backend/tests/unit/requireObjectBody.test.ts` | Middleware con `request`/`response` falsos. | RF-28 |
| `backend/tests/controllers/sessions.read.test.ts` | Listar y obtener, forma exacta, RF-24 de lectura. | RF-1 a RF-4, RF-18, RF-19, RF-22, RF-24, RNF-1 |
| `backend/tests/controllers/sessions.create.test.ts` | Crear. | RF-5, RF-6, RF-15, RF-21, RF-27, RF-28, RNF-2 |
| `backend/tests/controllers/sessions.edit.test.ts` | Editar y cancelar. | RF-7 a RF-10, RF-19, RF-20, RF-26 |
| `backend/tests/controllers/sessions.join.test.ts` | Sumarse y salir, DP6-38. | RF-11 a RF-14, RF-17, RF-21, RF-24 |
| `backend/tests/controllers/sessions.concurrency.test.ts` | Casos de RF-25 y reintento. | RF-25 |
| `backend/tests/controllers/sessions.cascade.test.ts` | Cascada al eliminar usuario y simultaneidad con crear y sumarse. | RF-16, RF-18 |
| `backend/tests/controllers/sessions.body.test.ts` | Paso del cuerpo en las siete operaciones. | RF-15, RF-20, RF-23, RF-28, DP6-29, DP6-36 |
| `backend/tests/controllers/jsonParser.test.ts` | Convivencia del parser de `/api/sessions` (`strict: false`) con el global (P6-1). | RF-15, RF-23 |
| `backend/tests/controllers/protectedRoutes.test.ts` | Barrido de 401 "sesión no iniciada" (sin credencial) de las specs 002 a 006 y de 401 "token inválido" (usuario eliminado) en la 006. | RF-1, RF-18, criterio de barrido |
| `backend/tests/controllers/helpers.ts` (modificar) | Se agregan: `sessionsInDb()` (documentos serializados con `JSON.parse(JSON.stringify(documento))`, ordenados por `_id`, como `accountsInDb`), `rawSessionsInDb()` (`lean()`, como `rawAccountsInDb`), `linkAccountFor(session: SignedUp, gameId: GameId)` (llama a `linkOk` con un cuerpo fijo por juego, p. ej. `Jugador1#LAS`/`LAS`, `jugador2`/`LATAM`, `76561190000000001`/`South America`) e `insertSession(datos)` (inserción directa para preparar estados, incluido el intermedio de RF-24). **No se crean** `createUserAndLogin` (es `signUp`) ni `usersInDb`. Se reutilizan `authApp`, `signUp`, `withSession`, `rawCookieRequest`, `deleteMe`, `nonExistingId`, `FIXED_NOW` y `closeTestServers`. | — |
| `backend/requests/` | Ya existe con `accounts.rest`, `matches.rest` y `users.rest`; `sessions.rest` es el archivo nuevo. | — |

## 2. Funciones puras (firmas)
Ninguna importa Express ni Mongoose ni lee el reloj (RNF-3, constitución principio 3). El
instante de creación llega como `now: Date` ("hoy" como parámetro). Tipado con
`exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` (RT-02).

```ts
// domain/sessionRules.ts
export const SESSION_ERRORS: {
  game: 'Juego no válido.';
  noAccount: 'No tienes una cuenta vinculada en este juego.';
  title: 'El título debe tener entre 3 y 60 caracteres.';
  notes: 'Las notas deben ser texto de hasta 160 caracteres.';
  day: 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).';
  startHour: 'Hora de inicio no válida: usa un entero de 0 a 23.';
  durationHours: 'Duración no válida: usa un entero de 1 a 4 horas.';
  slots: 'Cupos no válidos: usa un entero de 2 a 6.';
  slotsBelowParticipants: 'No puedes dejar menos cupos que jugadores inscritos.';
  notFound: 'Sesión no encontrada.';
  notHostEdit: 'Solo quien organiza puede editar la sesión.';
  notHostCancel: 'Solo quien organiza puede cancelar la sesión.';
  alreadyJoined: 'Ya estás inscrito en esta sesión.';
  full: 'Esta sesión ya no admite jugadores.';
  hostLeave: 'Eres quien organiza: cancela la sesión en lugar de salir.';
  notJoined: 'No estás inscrito en esta sesión.';
  badId: 'id con formato inválido';           // heredado (spec 003, RF-5)
  badJson: 'JSON mal formado';                // heredado (referencia 5.7)
};
export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };
export function trimText(text: string): string;                 // DP6-27
export function codePointLength(text: string): number;          // [...text].length
export function hasForbiddenTitleChar(text: string): boolean;   // \p{Cc}, U+2028, U+2029 (DP6-31)
export function readJsonInteger(value: unknown, min: number, max: number): number | null; // DP6-2
export function isPlainObject(value: unknown): value is Record<string, unknown>;
export interface SessionFields { title: string; notes: string; day: number; startHour: number;
  durationHours: number; slots: number }
export interface CreateInput extends SessionFields { gameId: GameId }
export type SessionPatch = Partial<SessionFields>;               // solo los enviados
export function validateCreatePayload(body: unknown, linkedGames: ReadonlySet<GameId>):
  RuleResult<CreateInput>;                                        // body undefined = {}
export function validateSessionEdit(body: unknown): RuleResult<SessionPatch>;
export function parseGameFilter(query: Readonly<Record<string, unknown>>): RuleResult<GameId | null>; // null = todos

// domain/sessionState.ts
export type SessionStatus = 'open' | 'full';
export interface SessionRecord { id: string; gameId: GameId; hostId: string; title: string;
  notes: string; day: number; startHour: number; durationHours: number; slots: number;
  participantIds: readonly string[]; status: SessionStatus; createdAt: Date }
export type StateResult = { ok: true; value: SessionRecord } |
  { ok: false; status: 400 | 403 | 409; error: string };
export function statusFor(participantCount: number, slots: number): SessionStatus;
export function applyEdit(s: SessionRecord, userId: string, patch: RuleResult<SessionPatch>): StateResult;
export function applyJoin(s: SessionRecord, userId: string): StateResult;
export function applyLeave(s: SessionRecord, userId: string): StateResult;
export function removeParticipant(s: SessionRecord, userId: string): SessionRecord; // cascada
export function newSession(input: CreateInput, hostId: string, now: Date): Omit<SessionRecord, 'id'>;
export function compareByCodePoint(a: string, b: string): number;
export function compareSessions(a: SessionRecord, b: SessionRecord): number;
export interface UserRef { id: string; username: string; displayName: string; avatarColor: string }
export interface SessionView { id: string; gameId: GameId; hostId: string; host: UserRef;
  title: string; notes: string; day: number; startHour: number; durationHours: number;
  slots: number; participants: UserRef[]; status: SessionStatus; createdAt: string }
export function toSessionView(s: SessionRecord, users: ReadonlyMap<string, UserRef>): SessionView | null;
export function assembleSessionViews(list: readonly SessionRecord[],
  users: ReadonlyMap<string, UserRef>): SessionView[];           // omite, ordena (RF-2, RF-24)
```

## 3. Algoritmos

### 3.1 Texto (DP6-7, DP6-23, DP6-27, DP6-31)
```
TRIM_SET = [\t\v\f  ﻿\p{Zs}\n\r  ]
trimText(t)             = t.replace(/^TRIM_SET+|TRIM_SET+$/gu, '')
codePointLength(t)      = [...t].length
hasForbiddenTitleChar(t) = /[\p{Cc}  ]/u.test(t)      // se aplica al título ya recortado
```
El conjunto se escribe explícito (no `String.prototype.trim`) para que coincida carácter a
carácter con DP6-27 y la prueba lo fije: U+0085 y U+200B no se recortan.

### 3.2 Números y objeto (DP6-2, RF-28)
```
readJsonInteger(v, min, max):
  si typeof v !== 'number' o !Number.isInteger(v) → null   // "3", 3.5, true, null, NaN, Infinity
  n = v + 0                                                  // normaliza -0 a 0
  return min ≤ n ≤ max ? n : null
isPlainObject(v) = typeof v === 'object' && v !== null && !Array.isArray(v)
```
`3.0` llega como `3` tras `JSON.parse`, así que vale 3.

### 3.3 Crear y editar (RF-6, RF-7, RF-15, RF-26, RF-27, DP6-9)
```
validateCreatePayload(body, linked):
  b = body === undefined ? {} : body          // sin cuerpo = {} (DP6-29, DP6-36); el no objeto ya lo
                                               // rechazó requireObjectBody (si llega, se trata como {})
  g = b.gameId; si typeof g !== 'string' o !Object.hasOwn(GAMES, g) → game
  si !linked.has(g)                            → noAccount        (RF-27)
  title = checkTitle(b, required=true)         → title
  notes = Object.hasOwn(b,'notes') ? checkNotes(b.notes) : ''     → notes
  day = readJsonInteger(b.day, 0, 6)           → day
  startHour = readJsonInteger(b.startHour, 0, 23)                 → startHour
  durationHours = readJsonInteger(b.durationHours, 1, 4)          → durationHours
  slots = readJsonInteger(b.slots, 2, 6)       → slots
  → ok { gameId: g, title, notes, day, startHour, durationHours, slots }   // nada más (RF-15)

checkTitle(v): typeof v === 'string' y t = trimText(v), !hasForbiddenTitleChar(t),
               3 ≤ codePointLength(t) ≤ 60 → t ; si no → error title
checkNotes(v): typeof v === 'string' y t = trimText(v), codePointLength(t) ≤ 160 → t ; si no → notes

validateSessionEdit(body):                     // nunca lee gameId (RF-15, DP6-19)
  b = body === undefined ? {} : body
  patch = {}
  en el orden título → notas → día → hora → duración → cupos, para cada campo con
  Object.hasOwn(b, campo): validar con su regla (notas vacías válidas, DP6-22); primer error → 400
  → ok patch                                   // {} = sin cambios (RF-26)
```
Los nombres de campo son los de RNF-1 (`gameId`, `title`, `notes`, `day`, `startHour`,
`durationHours`, `slots`), los mismos que envía hoy `CreateSessionPayload` del frontend.

### 3.4 Filtro del listado (RF-22, DP6-3, DP6-20)
```
parseGameFilter(q):
  si !Object.hasOwn(q,'game') o q.game === undefined → ok null
  v = q.game
  si typeof v !== 'string' (arreglo = repetido, objeto)  → game
  si v === 'all' → ok null
  si Object.hasOwn(GAMES, v) → ok v                       // exacto: 'LOL', ' lol ', '' fallan
  → game
```
Las demás claves de `q` no se leen. `Object.hasOwn` evita que `constructor` o `__proto__`
pasen (como en el plan 005, 3.1).

### 3.5 Estado, edición, sumarse y salir (RF-7, RF-8, RF-11 a RF-14, RF-17, DP6-10, DP6-38)
```
statusFor(n, slots) = n ≥ slots ? 'full' : 'open'

applyEdit(s, userId, patch):                   // orden RF-20: anfitrión → datos → RF-8
  si s.hostId ≠ userId → 403 notHostEdit
  si !patch.ok → 400 patch.error
  next = { ...s, ...patch.value }
  si next.slots < s.participantIds.length → 400 slotsBelowParticipants   // guardados (DP6-38)
  → ok { ...next, status: statusFor(next.participantIds.length, next.slots) }

applyJoin(s, userId):
  si userId ∈ s.participantIds → 409 alreadyJoined                       // antes que llena (DP6-10)
  si s.participantIds.length ≥ s.slots → 409 full                        // guardados (DP6-38)
  ids = [...s.participantIds, userId]
  → ok { ...s, participantIds: ids, status: statusFor(ids.length, s.slots) }

applyLeave(s, userId):
  si userId === s.hostId → 409 hostLeave                                 // RF-14 antes que RF-17
  si userId ∉ s.participantIds → 409 notJoined
  ids = s.participantIds sin userId
  → ok { ...s, participantIds: ids, status: statusFor(ids.length, s.slots) }

removeParticipant(s, userId):                  // cascada; idempotente
  ids = s.participantIds sin userId → { ...s, participantIds: ids, status: statusFor(ids.length, s.slots) }

newSession(input, hostId, now) = { ...input, hostId, participantIds: [hostId], status: 'open', createdAt: now }
```
"Llena" se mide con `participantIds.length`, la lista guardada, no con la visible: es
exactamente DP6-38. Como `slots ≥ 2` y el anfitrión es el único participante al crear, el
estado inicial es siempre `open`.

### 3.6 Orden y vista (RF-2, RF-4, RF-24, RNF-1, DP6-15, DP6-34)
```
compareSessions(a, b) = (a.day − b.day) || (a.startHour − b.startHour)
                     || (a.createdAt.getTime() − b.createdAt.getTime())
                     || compareByCodePoint(a.id, b.id)
compareByCodePoint: recorre con codePointAt; primer código distinto decide; prefijo más corto primero

toSessionView(s, users):
  host = users.get(s.hostId); si no existe → null                         // RF-24: se omite / 404
  participants = s.participantIds.map(users.get).filter(definido)          // RF-24: sin el eliminado
  → { id, gameId, hostId, host, title, notes, day, startHour, durationHours, slots,
      participants, status: s.status, createdAt: s.createdAt.toISOString() }  // orden de RNF-1
assembleSessionViews(list, users) = [...list].sort(compareSessions).map(toSessionView).filter(no null)
```
`status` se entrega tal como está guardado (DP6-26: no se recalcula al leer). La referencia
de usuario tiene exactamente `id, username, displayName, avatarColor` (sin correo ni hash).
`compareByCodePoint` se define aquí y no se importa de `domain/matching.ts` (005) para que
la 006 no dependa de la funcionalidad de la 005.

## 4. Modelo `PlaySession` (`models/playSession.ts`)

| Campo | Tipo | Reglas (red de seguridad; los textos al cliente salen de `sessionRules.ts`) |
| --- | --- | --- |
| `gameId` | String | required, `enum: ['lol','r6','cs2']` |
| `host` | ObjectId → `User` | required, index. En la vista: `hostId` + `host`. |
| `title` | String | required (sin `trim` en el esquema: recorta `trimText`) |
| `notes` | String | default `''` |
| `day` | Number | required, entero 0–6 |
| `startHour` | Number | required, entero 0–23 |
| `durationHours` | Number | required, entero 1–4 |
| `slots` | Number | required, entero 2–6 |
| `participants` | [ObjectId → `User`] | index; el anfitrión primero |
| `status` | String | `enum: ['open','full']`, required |
| `createdAt` | Date | required; lo fija el controlador con `clock.now()` |
| opciones | `optimisticConcurrency: true`, `timestamps: false` | P6-3, P6-5 |

- `toRecord(doc): SessionRecord` (en `sessionReads.ts`) convierte el documento o el `lean()`
  a la forma pura (`id`, `hostId` y `participantIds` como texto).
- No se define `populate` ni `toJSON` público: la representación sale siempre de
  `toSessionView` (P6-4). El `toJSON` de RT-07 se deja igualmente (`id`, sin `_id`/`__v`)
  para depuración, pero ningún controlador lo envía.
- `title` y `notes` no tienen `maxlength` en el esquema: los validadores de Mongoose cuentan
  unidades UTF-16 y rechazarían 60 emojis (DP6-7); el largo lo garantiza `sessionRules.ts`.

## 5. Interfaz REST

`createSessionsRouter({ jwtSecret, now })` (montado en `/api/sessions`). El JSON mal formado
ya lo rechaza el parser antes del router (RF-23). Las capas del router, en este orden
(RF-20), siguen el patrón de `createAccountsRouter` (guardias con `router.use`, sin ruta):
1. **Paso del cuerpo:** `router.use` con una función local que llama a `requireObjectBody`
   solo cuando la petición es `POST` con `request.path` `"/"` (crear) o `PUT` con
   `request.path` de un solo segmento, `/^\/[^/]+\/?$/` (editar), sobre la ruta sin
   decodificar (como `matchUserRoute` de `services/userTarget.ts`); en el resto
   (`/:id/join`, `/:id/leave`, `GET`, `DELETE`) llama a `next()` sin mirar el cuerpo
   (RF-15). Va **antes** de la sesión.
2. **Sesión:** `router.use(createWithUser({ jwtSecret, now }))` (los tres 401 de la 002 y el
   del usuario eliminado, RF-1 y RF-18): sin credencial "sesión no iniciada"; alterada o
   sin comprobante "token inválido"; expirada "sesión expirada"; usuario eliminado "token
   inválido" (paso 5 de `createWithUser`, DP6-39). No hay `withExistingUser` ni guardia propia.
3. **Segmento decodificable (P6-11):** `router.use` que, si el primer segmento de
   `request.path` no vacío no se puede decodificar (`decodeSegment` de
   `services/userTarget.ts`), responde 400 `{ error: SESSION_ERRORS.badId }` antes de que
   Express 5 empareje `:id` (si no, el `%zz` llegaría al `errorHandler` como 500). Va
   después de la sesión (RF-20) y es idéntica a la de `accounts.ts`.
4. Las siete rutas, con `request.userId ?? ""` como en los demás controladores.

| Método y ruta | Orden de comprobaciones (RF-20) | Éxito |
| --- | --- | --- |
| `GET /api/sessions?game=` | cuerpo → sesión → `parseGameFilter(request.query)` | 200 `SessionView[]` (`listSessionViews`) |
| `GET /api/sessions/:id` | cuerpo → sesión → segmento decodificable → `isValidId` → existencia (incluye anfitrión, RF-24) | 200 vista |
| `POST /api/sessions` | cuerpo (objeto) → sesión → `validateCreatePayload` (juego → cuenta → resto) | 201 vista |
| `PUT /api/sessions/:id` | cuerpo (objeto) → sesión → id → existencia → anfitrión → datos → RF-8 | 200 vista |
| `DELETE /api/sessions/:id` | cuerpo → sesión → id → existencia → anfitrión | 204 sin cuerpo |
| `POST /api/sessions/:id/join` | cuerpo → sesión → id → existencia → RF-12 | 200 vista |
| `POST /api/sessions/:id/leave` | cuerpo → sesión → id → existencia → RF-14 → RF-17 | 200 vista |

Flujos (sin `try/catch`; Express 5 envía rechazos al `errorHandler`, RT-03):
```
crear(body, userId):
  now = clock.now()                                           // `clock` de utils/clock.ts, una vez por petición
  linked = new Set((await GameAccount.distinct('gameId', { user: userId })).filter(isGameId))
  v = validateCreatePayload(body, linked); si !ok → 400
  r = await createSession(newSession(v.value, userId, now))   // §6
  noSession → 401 SESSION_MESSAGES.invalidToken ("token inválido", como en matches.ts; DP6-39)
  ok → 201 loadSessionView(r.id)

editar(id, body, userId):
  patch = validateSessionEdit(body)                           // se calcula ya, se informa tras el 403
  r = await mutateSession(id, s → applyEdit(s, userId, patch), { requireHost: true })
  → 404 / 403 / 400 / 200 loadSessionView(id)

cancelar(id, userId):
  doc = findById → null o anfitrión inexistente → 404 ; host ≠ userId → 403
  await PlaySession.deleteOne({ _id: id }) → 204              // deleteOne de un borrado: 204 igual

sumarse(id, userId): r = await joinSession(id, userId)        // §6
salir(id, userId):   r = await mutateSession(id, s → applyLeave(s, userId), { requireHost: true })
```
Los identificadores de usuario solo salen de `request.userId` (RF-21); el handler nunca lee
`hostId`, `host`, `participants`, `status`, `id` ni `createdAt` del cuerpo (RF-15, RT-09).
El método de edición es `PUT` (RF-19 de la referencia), con semántica parcial (DP6-1).

## 6. Concurrencia, cascada y cuerpo (RF-16, RF-23, RF-25, RF-28, DP6-11, DP6-12)

`services/sessionWrites.ts`, mismo patrón que `accountWrites.ts` de la 004 (RF-39, DP-29,
P-6, P-7; `updateOwnedAccount` y `linkAccount`, con `maxAttempts = 5` y `throw new Error` al
agotarse; resultados `{ ok, … }` y sin `try/catch` en los controladores). La compensación de
la 006 es 401 "token inválido" (`noSession`; `SESSION_MESSAGES.invalidToken`, como la carrera
de `matches.ts`; DP6-39) y no 404 como en `linkAccount`:
```
mutateSession(id, apply, { requireHost }, maxAttempts = 5):
  repetir hasta maxAttempts:
    doc = await PlaySession.findById(id)                  → null: 404 notFound
    si requireHost y !(await User.exists({ _id: doc.host })) → 404 notFound      (RF-24)
    r = apply(toRecord(doc))                              → error: su status y texto
    asignar a doc: title, notes, day, startHour, durationHours, slots,
                   participants (de participantIds), status
    try { await doc.save(); return ok }
    catch VersionError          → reintentar (otra escritura ganó o el documento se borró)
    catch DocumentNotFoundError → 404 notFound
  tras maxAttempts → throw Error → 500 (nada cambió)

createSession(data):
  doc = await PlaySession.create({ ...data, host: data.hostId, participants: data.participantIds })
  si !(await User.exists({ _id: data.hostId })):        // eliminado entretanto
     await PlaySession.deleteOne({ _id: doc._id }) → noSession (401 "token inválido")
  → ok

joinSession(id, userId):
  r = await mutateSession(id, s → applyJoin(s, userId), { requireHost: true })
  si r ok y !(await User.exists({ _id: userId })):
     await mutateSession(id, s → ok(removeParticipant(s, userId)), { requireHost: false }) // 404 se ignora
     → noSession (401 "token inválido")
  → r

removeUserFromSessions(userId):                          // llamada por DELETE /api/users/:id
  ids = await PlaySession.find({ participants: userId }).distinct('_id')
  para cada sid (for…of + await): await mutateSession(sid, s → ok(removeParticipant(s, userId)),
                                                     { requireHost: false })   // 404 se ignora
```
- **RF-25 (serialización):** toda escritura sobre una sesión existente es `findById` →
  regla pura → `save()` con `optimisticConcurrency`, que solo escribe si la versión no
  cambió; si otra escritura ganó, se relee y se aplica la regla sobre el estado nuevo. El
  resultado es el de alguna ejecución en serie: último cupo → un 200 y un 409 `full`; doble
  sumarse → 200 y 409 `alreadyJoined`; bajar cupos vs. sumarse → el perdedor relee y
  responde 400 RF-8 o 409 `full`, nunca más participantes que cupos; cancelar vs. sumarse →
  `save()` sobre un documento borrado no lo recrea (sin `upsert`), lanza `VersionError` o
  `DocumentNotFoundError`, y al releer `findById` da `null` → 404.
- **RF-16 (cascada):** el `DELETE /api/users/:id` real (003/004) hace C1 `GameAccount.deleteMany`
  → C2 `User.deleteOne` (en `try`) → `finally` C3 `GameAccount.deleteMany`. La 006 agrega
  **C4**, después de C3 y antes de `clearCookie`: `await PlaySession.deleteMany({ host: id })`
  y `await removeUserFromSessions(id)`. C4 no está en el `finally`: solo se ejecuta si C2 y C3
  terminaron (si C2 lanza, el usuario sigue con sus sesiones intactas y puede repetir la
  eliminación, como con sus cuentas). Todo lo que ocurre después de C2 ve `User.exists` nulo:
  una creación o un sumarse que escribió **antes** de C4 lo limpia C4 (C4 corre después de
  C2, así que barre todo lo escrito mientras el usuario aún existía); uno cuya comprobación
  `User.exists` ocurre **después** de C2 la ve nula y se compensa (401, RF-18); no queda un
  tercer caso de escritura, porque toda escritura precede a su comprobación. Aparte, solo al
  crear, si C1 ya borró sus cuentas antes de que la petición lea las cuentas vinculadas, la
  validación de RF-27 responde 400 "No tienes una cuenta vinculada en este juego." sin
  guardar nada (RF-16, DP6-40); sumarse no exige cuenta (RF-11) y no
  tiene ese caso. Entre C2 y C4 hay un intervalo de
  milisegundos con sesiones de un usuario ya borrado (RF-24 las oculta o filtra). Ninguna
  sesión organizada por él ni participación suya sobrevive al final. No se cambia el orden
  C1 → C2 → C3 de la 004; `userDeletionCascade.test.ts` sigue verde. **Aprobado por el
  usuario (Q3).** Riesgo aceptado: C4 corre cuando el usuario ya no existe, así que si C4
  falla la respuesta es 500, las sesiones residuales quedan ocultas por RF-24 y repetir la
  eliminación no las limpia (la credencial ya da 401 "token inválido"). Es el precio de que
  la spec 004 (RF-14, DP-42) conviene que el usuario sea lo último en desaparecer.
- **Intervalo de la cascada (RF-24, DP6-34, DP6-38):** las lecturas resuelven usuarios con
  `loadUserRefs` y omiten la sesión sin anfitrión (404 por id) o filtran el participante
  inexistente; las escrituras aplican las reglas puras sobre `participantIds` guardados, así
  que "llena" y RF-8 cuentan al eliminado hasta que `removeParticipant` lo quite y recalcule
  el estado.
- **Límite reconocido:** igual que P-12 de la 004, hay un intervalo de milisegundos en que
  una sesión creada (o una participación) de un usuario eliminado existe antes de la
  compensación; el estado final es siempre el correcto. Sin transacciones (P6-2).
- **Paso del cuerpo (RF-20, RF-23, RF-28, DP6-36):** `express.json({ limit: 102_400, strict:
  false })` montado en `/api/sessions` en `createApp` **antes** de la línea del
  `express.json({ limit: 102_400, strict: true })` global (P6-1); el límite se repite para que
  413 siga igual (D6-1). Verificado en body-parser 2.3.0: el global sale sin leer si el
  cuerpo ya se consumió (`onFinished.isFinished(req)`), así que no hay doble lectura ni
  hace falta tocar 004/005. Cuerpo declarado como JSON = `Content-Type: application/json`
  (con o sin parámetros), que es el tipo que el parser lee por defecto; cualquier otro tipo
  no se lee y `request.body` queda `undefined` ("sin cuerpo"). Un cuerpo de 0 bytes declarado
  como JSON queda `undefined` o `{}`; ambos equivalen a `{}`. JSON mal formado →
  `entity.parse.failed` → 400 "JSON mal formado" en el `errorHandler`, antes del router y por
  tanto antes de `createWithUser` en las siete operaciones. Con `strict: false`, `3`, `"x"`,
  `true` y `null` se parsean: en crear y editar `requireObjectBody` (capa 1 del router, antes
  de la sesión) responde 400 "JSON mal formado" a todo `request.body !== undefined` que no
  sea objeto plano (incluidos `[]` y `null`); en las demás operaciones el cuerpo no se lee.
  Si `null` llegara al router como `undefined` o `{}` (T4 lo comprueba con una prueba), RF-28
  no podría distinguirlo de "sin cuerpo": en ese caso se para y se reporta.
- Las pruebas llaman `await PlaySession.init()` en `before`.

## 7. Errores (textos exactos)

| Código | Texto | Cuándo |
| --- | --- | --- |
| 400 | `JSON mal formado` | RF-23 (todas, antes del 401); RF-28 (crear y editar, antes del 401) |
| 401 | `sesión no iniciada` | solo sin credencial (spec 002, RF-10, `SESSION_MESSAGES.notLoggedIn`) |
| 401 | `token inválido` / `sesión expirada` | credencial alterada o sin comprobante / expirada: spec 002, RF-11 y RF-12 (`SESSION_MESSAGES.invalidToken` / `expired`) |
| 401 | `token inválido` (`SESSION_MESSAGES.invalidToken`; Q1 resuelta, DP6-39) | credencial válida de un usuario eliminado (RF-18, paso 5 de `createWithUser`); compensación de crear/sumarse cuando el usuario ya no existe (RF-16) |
| 400 | `id con formato inválido` | RF-19 |
| 404 | `Sesión no encontrada.` | RF-19, RF-24, RF-25 |
| 403 | `Solo quien organiza puede editar la sesión.` / `Solo quien organiza puede cancelar la sesión.` | RF-10 |
| 400 | `Juego no válido.` | RF-6 (crear), RF-22 (filtro) |
| 400 | `No tienes una cuenta vinculada en este juego.` | RF-27 |
| 400 | textos de título, notas, día, hora, duración y cupos (sección 2) | RF-6, RF-26 |
| 400 | `No puedes dejar menos cupos que jugadores inscritos.` | RF-8 |
| 409 | `Ya estás inscrito en esta sesión.` / `Esta sesión ya no admite jugadores.` | RF-12 |
| 409 | `Eres quien organiza: cancela la sesión en lugar de salir.` | RF-14 |
| 409 | `No estás inscrito en esta sesión.` | RF-17 |
| 500 | `error interno del servidor` | `errorHandler` (agotado el reintento) |

## 8. Decisiones técnicas (con la alternativa descartada)

| # | Decisión | Alternativa descartada y motivo |
| --- | --- | --- |
| P6-1 | Parser `express.json({ limit: 102_400, strict: false })` solo en `/api/sessions`, montado en `createApp` antes de la línea del global (`limit: 102_400, strict: true`). Comprobado que el global no relee el cuerpo ya consumido (body-parser 2.3.0, `read.js`). | El `express.json` global tal como está (`strict: true`): responde 400 a `3`, `"x"`, `true` y `null` también al listar, obtener, cancelar, sumarse y salir, contra RF-15 y DP6-32. `strict: false` global: cambia el comportamiento de las specs 004 y 005, que deben cambiarse por su propio flujo (DP6-37). |
| P6-2 | Concurrencia con `optimisticConcurrency` + `save()` + reintento (máx. 5), como la 004. | `findOneAndUpdate` condicionado (`$expr` con `$size`): atómico, pero salta los validadores (RT-10) y duplica en consultas Mongo las reglas puras de RF-8/RF-12 (RNF-3). Transacciones: exigen replica set (P-6 y P-12 de la 004). |
| P6-3 | `createdAt` explícito desde `clock.now()` y `timestamps: false`. | `timestamps: true` (5.4 de la referencia): la fecha no se podría fijar en las pruebas con `FIXED_NOW` y el desempate de RF-2 sería frágil; además agrega `updatedAt`, que no está en RNF-1. |
| P6-4 | Representación construida por la regla pura `toSessionView` con usuarios leídos aparte (`loadUserRefs`). | `populate` con proyección (RT-12, RF-17 de la referencia): un anfitrión eliminado aparece como `null` y la regla de RF-24 quedaría escondida en Mongoose en vez de en una función probada (mismo motivo que P5-2). |
| P6-5 | Largos de título y notas solo en `sessionRules.ts`, sin `maxlength` en el esquema. | `minLength/maxLength` de Mongoose (5.4 de la referencia): cuentan unidades UTF-16 (60 emojis = 120) contra DP6-7. |
| P6-6 | Recorte con conjunto explícito de DP6-27 y `\p{Zs}`. | `String.prototype.trim`: hoy coincide, pero depende de la definición del motor y la spec fija la lista exacta. |
| P6-7 (adaptado 2026-10-19; aprobado por el usuario, Q3) | Cascada: las sesiones organizadas y las participaciones se limpian **después** de que el usuario ya no existe (C4 tras C2 y C3 de la 004); crear y sumarse se compensan si el usuario ya no existe. Se conserva el invariante original (sesiones limpiadas con el usuario ya borrado); cambia solo dónde se engancha, porque la cascada real de la 004 borra al usuario al final y no se reordena. | Borrar sesiones antes que el usuario (por ejemplo, junto a C1): un sumarse intercalado dejaría una participación huérfana que nadie compensa (como P-7 de la 004). Cambiar el orden C1 → C2 → C3 de la 004 para que el usuario vaya primero: contra RF-14 y DP-42 de la 004. |
| P6-8 | `compareByCodePoint` propio en `sessionState.ts`. | Importar el de `domain/matching.ts` (005): ataría la 006 a la funcionalidad de la 005, de la que la spec dice no depender. |
| P6-9 | `isValidId` de `domain/accountRules.ts` (004) para el formato de id. | Dejar que `findById` lance `CastError`: el 400 llegaría por el `errorHandler`, pero el orden de RF-20 depende de comprobarlo antes de cualquier lectura. |
| P6-10 | Edición por `PUT /api/sessions/:id` con semántica parcial. | `PATCH`: más fiel a lo parcial, pero cambia la ruta que fija la referencia (RF-19) y que asume la spec 009. |
| P6-11 (2026-10-19) | Guardia de segmento decodificable en el router (como `createAccountsRouter`), después de la sesión y antes de las rutas con `:id`: `%zz` → 400 "id con formato inválido" (RF-19, RF-20). | Confiar en Express 5: el error de decodificación del parámetro no trae `type` y `mapErrorToResponse` lo convertiría en 500. |

### 8.1 Dudas del planificador resueltas por el usuario (2026-10-18)

| # | Duda | Respuesta del usuario |
| --- | --- | --- |
| D6-1 | Código ante un cuerpo demasiado grande, comprimido o con juego de caracteres no admitido (413/415 del parser). | No se fija en la 006: se deja al `errorHandler` de la spec 001 (decisión transversal). Ninguna prueba de la 006 fija ese código. |
| D6-2 | Alcance del parser sin `strict`. | Solo en `/api/sessions`, como propone P6-1. |
| D6-3 | Sesiones de demostración en `scripts/seed.ts`. | El seed **no** carga sesiones en esta spec; queda pendiente fuera del plan (sección 13). |
| D6-4 | Dependencia de 001–005, que aún no existen. | Las implementan colegas; la 006 la implementa otro colega. Lo de 001–005 se mantiene como supuestos (sección 0) y cada tarea los comprueba antes de empezar; si algo no coincide, se para y se reporta, sin implementar piezas de 001–005. `tasks.md` es autocontenido. (2026-10-19: 001–005 ya están implementadas; el ajuste de supuestos corrigió los nombres y la regla de parar y reportar sigue vigente.) |
| D6-5 | Actualización de `MEMORY.md`. | No forma parte de este plan ni de sus tareas; la hace el equipo. |

## 9. Estrategia de pruebas
- `node --test` vía `npm test` (`NODE_ENV=test`, `--test-concurrency=1`), `node:assert/strict`
  con `strictEqual` / `deepStrictEqual`, `supertest.agent` con la cabecera CSRF
  (`withSession`), base de prueba de la 001. Convenciones reales de `controllers/` (ver
  `userDeletionCascade.test.ts`): `const app = await authApp()` arriba del archivo; en
  `before`, `await connectDatabase(testConfig().db)` y `await User.init()`, `GameAccount.init()`
  y `PlaySession.init()`; `beforeEach` con `deleteMany({})` de `User`, `GameAccount` y
  `PlaySession` (y creación con `for…of`); `afterEach(() => mock.restoreAll())`; en `after`,
  `await closeTestServers()` y `await mongoose.disconnect()`, fuera de todo `describe`.
  Usuarios con `signUp(app, { email, username })` (devuelve `agent`, `csrf`, `cookie`, `id`).
  Ningún `.only`. Instante fijo con `t.mock.method(clock, 'now', () => new Date(FIXED_NOW))`.
  Las unitarias van en `tests/unit/` y no abren base ni servidor.
- **Unitarias** (sin base ni reloj): todos los casos de los criterios de finalización de la
  spec: enteros JSON (`3`, `3.0`, `"3"`, `3.5`, `true`, `null`, `-0`), extremos de cada
  rango, recorte (U+00A0, U+FEFF, U+3000, U+2028, U+2029 en los extremos; U+0085 y U+200B
  no se recortan), 60 y 61 emojis, prohibidos internos (LF, CR, U+2028, U+2029, tabulador,
  U+000B, U+000C, U+0085), notas con saltos y controles, orden de RF-6 con un caso por
  salto, edición parcial (`{}`, solo `slots`, `notes: ""`, `notes: null`, `title: ""`,
  `gameId` ignorado), filtro (ausente, `all`, vacío, repetido, `LOL`, ` lol `, `xyz`,
  `__proto__`), `statusFor`, `applyJoin` (inscrito y llena → inscrito), `applyLeave`
  (anfitrión, no inscrito), `applyEdit` (403 antes que datos; datos antes que RF-8), cada
  nivel de desempate de `compareSessions`, `toSessionView` con anfitrión ausente (null) y
  participante ausente (filtrado, `status` intacto) y DP6-38 (`applyJoin` y `applyEdit`
  cuentan `participantIds`, no los visibles).
- **Controladores:** cada RF con el texto exacto y, en escrituras, `rawSessionsInDb()`
  antes y después (sin cambios en cada error). Un caso por salto de RF-20 (incluidos los
  del criterio: no anfitrión con datos inválidos → 403; no anfitrión con cupos bajo
  inscritos → 403; id inexistente con datos inválidos → 404; id mal formado ajeno → 400;
  salir de inexistente → 404; juego inválido sin cuenta → "Juego no válido."). Forma exacta
  con `deepStrictEqual` sobre las claves de RNF-1 y de la referencia de usuario.
- **RF-24 y DP6-38:** el estado intermedio se prepara borrando el documento `User` con
  `User.deleteOne` directo (sin la cascada) e insertando sesiones con `insertSession`.
- **Concurrencia (RF-25):** `Promise.all` con dos agentes, repetido 10 veces por caso con
  la base reiniciada; se afirman invariantes (un 200 y un 409, nunca más participantes que
  cupos, la sesión cancelada no existe). Además una prueba determinista del reintento: se
  intercala una escritura entre `findById` y `save()` con `t.mock.method` sobre
  `PlaySession.findById` (primera llamada devuelve el documento y dispara otra
  modificación) y se comprueba que la regla se aplica sobre el estado nuevo.
- **Cascada (RF-16):** sesiones organizadas borradas; participaciones quitadas con estado
  recalculado (`full` → `open`); `Promise.all` de eliminar usuario (`deleteMe`) con crear y con
  sumarse → al final ninguna sesión del usuario ni participación suya; crear/sumarse
  responden 201/200 o 401 "token inválido" (DP6-39); crear admite además el 400 de RF-27 si C1 borró la cuenta antes de validar (DP6-40). Con `User.deleteOne` sustituido para que lance (como en
  `userDeletionCascade.test.ts`): 500, el usuario y sus sesiones intactos (C4 no corre) y
  repetir la eliminación (la credencial sigue valiendo) deja el estado final correcto. La
  intercalación determinista de una creación entre C2 y C4 se prepara sustituyendo
  `PlaySession.deleteMany` con `t.mock.method`, como la 004 hace con `GameAccount.deleteMany`.
- **Cuerpo (DP6-29, DP6-32, DP6-36):** en las siete operaciones: sin cuerpo, `{}`, `[]`,
  `3`, `"x"`, `true`, `null`, JSON mal formado, cuerpo `text/plain` con JSON dentro; los
  casos "sin credencial" de RF-28 y RF-23.
- **Barrido de 401** (`protectedRoutes.test.ts`): lista explícita método + ruta de las
  operaciones protegidas: spec 002 `GET /api/auth/me`; spec 003 `GET /api/users`,
  `GET/PATCH/DELETE /api/users/:id`, `GET/PUT /api/users/:id/availability`; spec 004
  `GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/:id`,
  `POST /api/accounts/:id/sync`, `GET /api/users/:id/games/:gameId`; spec 005
  `GET /api/matches`; spec 006 las siete. La lista coincide con los routers reales
  (verificado el 2026-10-19). Sin credencial → 401 "sesión no iniciada" en todas; con la
  credencial de un usuario eliminado → 401 "token inválido" (RF-18, DP6-39) en las siete de
  la 006. Las peticiones sin agente usan `supertest(app)[method](path)` (`HttpMethod` de
  `helpers.ts`); las del usuario eliminado, `signUp` + `deleteMe` + `rawCookieRequest(app,
  method, path, session.cookie, session.csrf)`, que reutiliza la credencial. Cada petición
  envía `{}` o ningún cuerpo (DP6-21). Si alguna ruta de 002 a 005 deja de coincidir con
  esta lista, quien implemente para y lo reporta (D6-4); no ajusta la lista por su cuenta.
- **Fuera de las pruebas (D6-1):** ninguna prueba de la 006 envía cuerpos mayores que el
  límite del parser, comprimidos o con juego de caracteres no admitido, ni fija 413/415.

## 10. Qué prevalece sobre la referencia
- RF-19 de la referencia ("reemplaza"): edición parcial (`validateSessionEdit`, DP6-1).
- RF-17 de la referencia: desempate por `createdAt` e id (`compareSessions`, DP6-15).
- 5.4 de la referencia: largos en puntos de código tras recortar, título sin saltos ni
  controles, cuenta vinculada al crear, numéricos solo enteros JSON (P6-5, sección 3).
- HU-10 de la referencia: "ya inscrito" antes que "llena" (`applyJoin`, DP6-10).
- 5.5 de la referencia: parser con `strict: false` en `/api/sessions` y `requireObjectBody`
  (P6-1, DP6-36). `timestamps: true` de 5.4 se sustituye por `createdAt` explícito (P6-3);
  `populate` de RT-12 por `loadUserRefs` (P6-4).

## 11. Trazabilidad

| RF / RNF | Implementación | Prueba |
| --- | --- | --- |
| RF-1 | `createWithUser` en el router (capa 2) | `protectedRoutes.test.ts`; `sessions.read.test.ts` (tres 401 con su texto) |
| RF-2 | `assembleSessionViews`, `compareSessions` | `sessionState.test.ts`; `sessions.read.test.ts` "orden" |
| RF-3, RF-4 | `loadSessionView`, `toSessionView` | `sessions.read.test.ts` "obtener", "forma exacta" |
| RF-5 | `newSession`, `createSession` | `sessions.create.test.ts` (base: anfitrión único participante, `open`, `createdAt = FIXED_NOW`) |
| RF-6 | `validateCreatePayload` | `sessionRules.test.ts`; `sessions.create.test.ts` (un caso por salto) |
| RF-7, RF-26 | `validateSessionEdit`, `applyEdit` | `sessionRules.test.ts`; `sessions.edit.test.ts` |
| RF-8 | `applyEdit` | `sessionState.test.ts`; `sessions.edit.test.ts`; DP6-38 en `sessions.join.test.ts` |
| RF-9, RF-10 | `cancelar`, `applyEdit` | `sessions.edit.test.ts` |
| RF-11, RF-12 | `applyJoin`, `joinSession` | `sessionState.test.ts`; `sessions.join.test.ts` |
| RF-13, RF-14, RF-17 | `applyLeave` | `sessionState.test.ts`; `sessions.join.test.ts` |
| RF-15, RF-21 | validadores leen solo sus campos; `request.userId` | `sessions.create.test.ts`, `sessions.join.test.ts`, `sessions.body.test.ts` |
| RF-16 | `users.ts` (C4 tras C2 y C3) + `removeUserFromSessions` + compensaciones | `sessions.cascade.test.ts` |
| RF-18 | paso 5 de `createWithUser` + `noSession` (401 "token inválido", DP6-39) | `protectedRoutes.test.ts`; `sessions.cascade.test.ts` |
| RF-19, RF-20 | `isValidId`, capas del router (sección 5) y orden de `mutateSession` | `sessions.edit.test.ts`, `sessions.join.test.ts` (cada salto); `%zz` en `sessions.read.test.ts` |
| RF-22 | `parseGameFilter` | `sessionRules.test.ts`; `sessions.read.test.ts` |
| RF-23, RF-28 | parser con `strict: false`, `errorHandler`, `requireObjectBody` | `requireObjectBody.test.ts`; `sessions.body.test.ts` |
| RF-24 | `toSessionView`, `requireHost` en `mutateSession` | `sessionState.test.ts`; `sessions.read.test.ts`; `sessions.join.test.ts` (DP6-38) |
| RF-25 | `mutateSession` | `sessions.concurrency.test.ts` |
| RF-27 | `linkedGames` en `validateCreatePayload` | `sessions.create.test.ts` (sin cuenta, desvincular después, sumarse sin cuenta) |
| RNF-1 | `toSessionView` | `sessions.read.test.ts` claves exactas |
| RNF-2 | `trimText` sin transformar | `sessions.create.test.ts` `<script>` en título y notas |
| RNF-3 | `domain/session*.ts` puros | unitarias; T10 revisa que no importan `express`/`mongoose` ni usan `Date.now`/`new Date()` |
| RNF-4 | sin `npm install` | T10: `git diff backend/package.json backend/.env.example` sin cambios |

## 12. Riesgos
- Los nombres de 001 a 005 ya se verificaron (sección "Ajuste de supuestos"), pero siguen
  siendo piezas ajenas: cada tarea los comprueba antes de empezar y, si no coinciden, se para
  y se reporta (D6-4).
- Q1 a Q4 resueltas por el usuario el 2026-10-19 (sección "Preguntas resueltas"): ninguna
  bloquea ya T4 a T10. Si alguna prueba o literal de las tareas contradijera esas
  decisiones, se para y se reporta.
- P6-1 se apoya en que el parser global no relee un cuerpo ya consumido por el de
  `/api/sessions` (body-parser 2.3.0, `read.js`, `onFinished.isFinished(req)`; leído en
  `node_modules`, no ejecutado). T4 lo fija con una prueba; si fallara, se para y se reporta
  (la alternativa es `strict: false` global, que afecta a 004/005). T4 comprueba además que
  `null` llega al router como `null`.
- C4 corre solo si C2 y C3 terminaron: si C4 falla tras borrar al usuario, 500 y sesiones
  residuales ocultas por RF-24 pero no limpiables repitiendo la eliminación (la credencial
  da 401 "token inválido"). Equivale al R2/P-21 de la 004. **Riesgo aceptado por el usuario
  (Q3, 2026-10-19)**, porque la spec 004 (RF-14, DP-42) conviene que el usuario sea lo
  último en desaparecer.
- Intervalo transitorio de la cascada y de las compensaciones (sección 6), como P-12 de la
  004.
- Las pruebas de concurrencia en un solo proceso dependen de cómo se intercalan las
  promesas; por eso se repiten y se completan con la prueba determinista del reintento.
- Un `Content-Type` JSON con un juego de caracteres no admitido, un cuerpo comprimido o un
  cuerpo mayor que el límite del parser producen 415/413 del parser; la spec no los cubre
  y se dejan al `errorHandler` de la spec 001 (D6-1).

## 13. Fuera de este plan (impactos anotados en la spec)
- Spec 007: backend simulado del navegador (409 al salir sin estar inscrito, textos,
  orden "ya inscrito" antes que "llena", desempate, validación de RF-6 y RF-27, notas vacías
  al editar), reglas del título en el formulario, estado `cancelled` del cliente y RNF-2 de
  interfaz.
- Spec 009: validaciones de edición y RNF-3 de interfaz.
- Specs 004 y 005: adoptar el paso del cuerpo antes del 401 (DP6-37) y, si se decide, el
  parser sin `strict`; por su propio flujo de cambio.
- Spec 003: adoptar RF-18 en sus operaciones.
- Spec 001: el servidor ya tiene lint en verde; la 006 no lo exige (DP6-24, Q4).
- Datos de demostración de sesiones en `scripts/seed.ts`: la spec no lo pide y el usuario
  decidió no cargarlos en esta spec (D6-3). Pendiente fuera del plan.
- Actualización de `MEMORY.md`: la hace el equipo (D6-5).
