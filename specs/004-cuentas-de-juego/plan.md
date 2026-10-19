# Plan 004 — Cuentas de juego y rango simulado
Estado: **aprobado (2026-10-19)**. Plan consolidado y corregido para alinearlo con la spec
vigente (`spec.md`, aprobada el 2026-10-18, commit `685e4af`), tras la validación de reviewer
(CAMBIOS NECESARIOS). El usuario lo aprobó el 2026-10-19 ("apruebo todo con tus
recomendaciones") con estas decisiones:
- **C1:** la T24 (retirar `createWithExistingUser` y `missingUserError`) quedaba **bloqueada
  hasta que la T9 de la spec 005 estuviera hecha** (Q3 resuelta); se cumplió y la T24 está
  hecha.
- **C2:** la T13 (lectura literal fija del simulador) queda aprobada; es una excepción
  deliberada a P-13 (Q4 resuelta).
- **C3:** no se divide la spec pese a superar las 10 tareas (Q5 resuelta).
- **C4:** el riesgo R3 (404 si el usuario desaparece entre crear la cuenta y comprobar que
  existe) sigue vigente por la decisión del 2026-10-18.

**Cierre (2026-10-19):** T1 a T25 hechas y validadas por reviewer (APROBADO tras 2 vueltas;
1567 tests, typecheck y lint en verde). Desde este cierre el plan es registro del diseño: las
menciones a `createWithExistingUser`, `missingUserError` y `User.accounts` marcadas
«histórico» describen el código anterior al rework (T10–T25) y ya no valen en el código. El
usuario confirmó el 2026-10-19 que repitió la suite sin conexión a Internet con el código ya
reescrito (RNF-1, RNF-9): 1567/1567 tests, 220 suites, 0 fallos, 0 cancelados, ~100 s; no
queda nada pendiente. Este cierre es solo de estado: no cambia ninguna decisión del plan.

Spec: `specs/004-cuentas-de-juego/spec.md` (aprobada el 2026-10-18; sin cambios).
**Precondición:** specs 001, 002 y 003 implementadas. Referencia aplicada:
`specs/_referencia/001-crear-backend-original.md` (secciones 2, 4.2 —RT-07 a RT-12—, 5.1,
5.4, 8 y 11, y su RF-15), salvo lo que la spec anula en "Qué prevalece sobre la referencia".

## Historial y alcance de esta revisión
- Versiones anteriores, todas ya aprobadas por el usuario y que siguen valiendo salvo donde
  este documento diga lo contrario: plan original (2026-10-17, "Apruebo y vamos con spec
  005"); reaprobación tras alinearlo con el backend real de 001–003 (2026-10-18, "Apruebo el
  plan y las tareas, sigue con T1"; Q1 "Mantener la spec" y Q2 "Mantener clock.ts"); cambio
  T3b / P-17, aislamiento de `domain/` ("Aprobar y ajustar P-17"); cambio T8b / P-18,
  servidor de prueba en loopback IPv4 ("Apruebo, haz T8b").
- La spec se reescribió el 2026-10-18 (commit `685e4af`) **después** de implementar T1–T9.
  El código de `backend/` sigue en parte la versión antigua. El usuario decidió rehacer el
  código para alinearlo con la spec vigente. Esta revisión del plan:
  1. Une en un solo documento las dos mitades solapadas del plan anterior (había dos
     secciones 6, dos 9 y dos 11; `PATCH` frente a `PUT`; una tabla de archivos con pruebas
     que no existen). Se conserva la numeración de las secciones 3, 4, 5, 6, 7 y 11 y de las
     decisiones P-1 a P-18, porque las tareas T1–T9 ya cerradas las citan.
  2. Rediseña lo que la spec vigente cambió: eliminación del usuario con cascada ordenada
     (RF-14, DP-42), vinculación con compensación y sin lista de cuentas en el usuario
     (RF-46, RF-33 retirado, DP-16 revocada), sesión con `withUser` y "token inválido"
     (RF-44, DP-37), textos exactos (DP-6), plegado de mayúsculas solo ASCII (DP-35).
  3. Reemplaza las decisiones P-7 (vincular con `$addToSet`; borrar usuario antes que
     cuentas) y P-14 (`missingUserError`, "sesión no iniciada"), que la spec vigente anula.
- No cambia ningún RF, DP ni regla del simulador. Tampoco la spec 005 (ver sección 13).

## 0. Precondiciones y estado real
Comprobado el 2026-10-19 sobre el código (rama `marselo`, después de `61f7c38`). **Histórico:**
esta sección y la 0.1 describen el código **antes** del rework T10–T25 (hecho y validado el
2026-10-19); lo que dicen de `createWithExistingUser`, `missingUserError` y `User.accounts`
ya no vale en el código (retirados en T24 y T19). Lo que esta spec usa del backend, con sus
firmas reales:
- `backend/src/app.ts`: fábrica `createApp({ jwtSecret, nodeEnv, now? }): Express`; `now` es
  el reloj de las credenciales, en **segundos Unix**. Monta `express.json` (102 400 bytes,
  `strict`), `cookieParser`, `/api/users`, `/api/auth`, `/api/accounts`, `/api/matches`
  (spec 005), `unknownEndpoint` y `errorHandler` (`{ error }`; 500 "error interno del
  servidor"). No conecta a la base.
- `backend/src/server.ts`: `connectDatabase(db)` y `prepareDatabase()` (`User.init()` y
  `GameAccount.init()`).
- `backend/src/utils/middleware.ts`:
  - `createWithUser({ jwtSecret, now, missingUserError? })` (**histórico:** la opción
    `missingUserError` la retiró T24; hoy es `createWithUser({ jwtSecret, now })`): exige la
    cookie `token` y la cabecera `X-CSRF-Token` en todas las peticiones, también en las GET
    (pasos 1 a 4 de `checkSession`); en el paso 5 comprueba que el usuario existe y, si no,
    responde 401 con `missingUserError` (por defecto "token inválido", spec 002, RF-22; hoy,
    siempre "token inválido"). Deja `request.userId`.
  - **Histórico (retirado en T24, 2026-10-19):** `createWithExistingUser(...)` (=
    `createWithUser` con `missingUserError: "sesión no iniciada"`), que usaban
    `controllers/accounts.ts`, la guardia de usuarios (resumen) y `controllers/matches.ts`
    (spec 005). Las rutas de la 004 dejaron de usarlo en T16, la 005 migró a `createWithUser`
    en su T9 y T24 lo retiró (pregunta Q3).
  - `createUserRoutesGuard({ withUser, withExistingUser })` (**histórico:** desde T16 recibe
    solo `withUser`): se monta sin ruta antes de las
    rutas `/:id` de usuario; comprueba la sesión y que los segmentos se pueden decodificar
    (Express 5 decodifica `:id` al emparejar y con `%zz` lanzaría su propio error). T16 deja
    solo `withUser`.
  - `utils/middleware.ts` importa `ACCOUNT_ERRORS` de `domain/accountRules.ts` (aceptado por
    el usuario: `utils/` puede importar de `domain/`).
- `backend/src/services/userTarget.ts`: `matchUserRoute` (incluye `kind: "games"` para
  `GET|HEAD /:id/games/:gameId`), `decodeSegment`, `USER_TARGET_MESSAGES`
  (`invalidId`, `forbidden`, `userNotFound = "usuario no encontrado"`) y reexporta
  `SELF_ALIAS`, `OBJECT_ID_PATTERN`, `resolveUserTarget` y `UserTarget` de
  `domain/userId.ts` (no reexporta `INVALID_ID_MESSAGE`).
- `backend/src/utils/errors.ts`: `MESSAGES.invalidId` y `MESSAGES.forbidden` ("no tienes
  permiso para esta operación"), que esta spec reutiliza.
- `backend/src/models/user.ts`: modelo `User` con `toJSON` en lista blanca. **Tenía
  `accounts: ObjectId[]`** (campo de la versión antigua; histórico: lo retiró T19).
- `backend/src/models/gameAccount.ts`: modelo `GameAccount` y `toGameAccountJson`.
- `backend/src/domain/`: `games.ts`, `rankScale.ts`, `rankSimulator.ts`, `accountRules.ts`,
  `accountState.ts`, `userId.ts` (más `matchQuery.ts`, `availability.ts` y `matching.ts` de la
  spec 005). `backend/src/services/`: `rankProvider.ts`, `accountWrites.ts`. `backend/src/utils/clock.ts`.
- `backend/tests/controllers/helpers.ts`: `authApp(overrides?): Promise<Server>`,
  `listenOnLoopback`, `closeTestServers`, `signUp(app, data?) → { agent, csrf, cookie,
  response, id, email }`, `loginAs`, `withSession`, `rawCookieRequest`, `nonExistingId`,
  `ISO_MS_Z`, `HEX24_LOWER` y, en el bloque `// --- Spec 004 ---`, `FIXED_NOW`,
  `accountsInDb()` y `rawAccountsInDb()`. No existen `test_helper.ts` ni `usersInDb`.
- Pruebas de cuentas existentes: `tests/controllers/accounts.test.ts` (un solo archivo con
  los describe listar, obtener, vincular, editar, desvincular, resincronizar, concurrencia y
  fallo; define localmente `link`, `linkOk`, `sync`, `unlink`, `accountIdsOf` y
  `forceSimultaneousReads`) y `tests/controllers/gameSummary.test.ts` (resumen y
  "eliminar usuario"). Los archivos `accountRead/Link/Edit/Sync.test.ts` del plan anterior
  **nunca existieron**.
- Si al empezar una tarea alguno de estos elementos no está o tiene otra firma, el
  implementer **para** y lo reporta.
- Ninguna dependencia nueva (RNF-8, DP-12): `express`, `mongoose`, `node:test`,
  `node:assert` y `supertest`, que ya trae la spec 001.

### 0.1 Divergencias entre el código y la spec vigente
Histórico: la tabla recoge las divergencias previas al rework; todas quedaron cerradas por las
tareas de su última columna (T10–T25, hechas el 2026-10-19).

| # | Spec | Código hoy | Diseño | Tarea |
| --- | --- | --- | --- | --- |
| 1 | RF-14, DP-42, RF-47: cuentas primero, usuario al final, barrido en `finally` | `controllers/users.ts` hace `User.deleteOne` y luego `GameAccount.deleteMany`, sin `finally` | 6.8, P-20 | T10 |
| 1b | RF-14: nunca mostrar cuentas sin dueño al listar ni al obtener | `GET /` y `GET /:id` no comprueban el dueño | 6.2, 6.3, P-21 | T20 |
| 2 | RF-46, RF-33 retirado, DP-16 revocada: sin lista de cuentas; vincular compensa; desvincular con un solo `deleteOne` | `User.accounts`, `$addToSet` en `accountWrites.ts`, `$pull` en `controllers/accounts.ts`; desvincular responde 204 aunque `deletedCount` sea 0 | 5, 6.4, 6.6, P-19 | T18, T19 |
| 3 | RF-47: vincular con el usuario borrado → 404 "usuario no encontrado" | 401 "sesión no iniciada" | 6.4 | T18 |
| 4 | RF-44, DP-37: credencial de usuario eliminado → 401 "token inválido" en todas las rutas | `withExistingUser` → "sesión no iniciada" | 6.1, P-22 | T16 (y T24) |
| 5 | DP-6: textos exactos en minúscula y sin punto | `ACCOUNT_ERRORS` con mayúscula inicial, punto final, Riot ID sin límites y 403 propio | 7, P-23 | T11 |
| 6 | DP-35: plegado solo ASCII | `normalizeRegion` usa `toLowerCase` ("KR" con signo de kelvin sería válida) | 3.1 | T12 |
| 7 | Pruebas que faltan (cascada, concurrencia, HTTP, medidas de RF-42, patrones, topes de banda) y pruebas que aceptan dos resultados | ver 11.2 | 11 | T10, T13 a T23 |
| 8 | DP-34: banda cerrada de puntos | `pointsBand` devuelve `max: null` en Master+, Gold de CS2 y Champion, con un `generationRange` aparte | 3.3, P-24 | T14 |
| 9 | RF-28: desempate "según su código Unicode" | `compareMatches` compara con `<` (unidades UTF-16) | 6.7 | T14 |

## 1. Archivos y responsabilidades
Leyenda: **existe** = ya está y no cambia; **modifica Tn** / **nuevo Tn** = lo toca esa tarea.

```
backend/
├── requests/accounts.rest                    (existe; revisa T25)
├── src/
│   ├── app.ts                                (existe; monta /api/accounts)
│   ├── domain/
│   │   ├── games.ts                          (existe)
│   │   ├── userId.ts                         (existe, T3b)
│   │   ├── rankScale.ts                      (modifica T14)
│   │   ├── rankSimulator.ts                  (modifica T14: usa pointsBand)
│   │   ├── accountRules.ts                   (modifica T11, T12)
│   │   └── accountState.ts                   (modifica T14)
│   ├── models/
│   │   ├── gameAccount.ts                    (existe)
│   │   └── user.ts                           (modifica T19: sin `accounts`)
│   ├── services/
│   │   ├── rankProvider.ts                   (existe)
│   │   ├── accountWrites.ts                  (modifica T11, T18)
│   │   ├── accountReads.ts                   (nuevo T20)
│   │   └── userTarget.ts                     (existe)
│   ├── controllers/
│   │   ├── accounts.ts                       (modifica T11, T16, T19, T20)
│   │   └── users.ts                          (modifica T11, T16, T10)
│   └── utils/
│       ├── clock.ts                          (existe)
│       └── middleware.ts                     (modifica T16; T24 retiró `missingUserError`)
└── tests/
    ├── unit/
    │   ├── rankScale.test.ts                 (modifica T14)
    │   ├── rankSimulator.test.ts             (modifica T13, T15)
    │   ├── accountRules.test.ts              (modifica T11, T12, T15)
    │   ├── accountState.test.ts              (modifica T14)
    │   ├── gameAccountModel.test.ts          (existe)
    │   ├── userTarget.test.ts                (existe)
    │   ├── withUser.test.ts                  (existe; antes `withExistingUser.test.ts`: T24 lo redujo a las pruebas de `createWithUser` y se renombró a `withUser.test.ts` el 2026-10-19, con permiso del usuario)
    │   ├── domainIsolation.test.ts           (existe, T3b)
    │   └── loopbackServer.test.ts            (existe, T8b)
    └── controllers/
        ├── helpers.ts                        (modifica T17, bloque `// --- Spec 004 ---`)
        ├── accounts.test.ts                  (modifica T11, T12, T16, T17, T18, T19, T20, T21)
        ├── gameSummary.test.ts               (modifica T11, T16, T21, T10)
        ├── accountConcurrency.test.ts        (nuevo T17; amplían T19, T22, T23)
        └── userDeletionCascade.test.ts       (nuevo T10)
```

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `domain/games.ts` | Catálogo de juegos del backend, sin `source`, `accent` ni la `normalizeRank` antigua: `GameId`, `GAMES` (nombre, `handleLabel`, `handlePattern`, `regions`, `tiers`, `divisions`), `GAME_IDS`, `isGameId` (`typeof === "string"` y `Object.hasOwn(GAMES, v)`, sin recortar, DP-39). | RF-6, RNF-2 |
| `domain/rankScale.ts` | Escalones por juego, normalización (DP-26) y banda cerrada de puntos (DP-34). | RF-36, DP-2, DP-26, DP-34 |
| `domain/rankSimulator.ts` | Proveedor simulado puro: hash, generador, `canonicalHandle`, regla de verificada, escalón por número de lectura y `simulateReading`. | RF-34, RF-35, RF-36, RF-41 a RF-43, RNF-7 |
| `domain/userId.ts` | Formato del identificador de usuario: `SELF_ALIAS`, `OBJECT_ID_PATTERN`, `INVALID_ID_MESSAGE`, `UserTarget`, `resolveUserTarget`. Sin imports fuera de `domain/`. | RF-2, RF-13; P-17 |
| `domain/accountRules.ts` | Validación pura y textos exactos propios de esta spec (`ACCOUNT_ERRORS`): vincular, editar, filtros, región (`normalizeRegion`) y formato de id. Importa solo de `domain/`. | RF-2, RF-6, RF-7, RF-13 (formato), RF-22, RF-38, RF-40, DP-6, DP-10, DP-19, DP-23, DP-35 |
| `domain/accountState.ts` | Transiciones puras: estado inicial, resincronización, orden y unión de partidas (con `compareCodePoints`), decisión de agregar fotografía, tasa de victorias, tendencia y partidas recientes. | RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36, RNF-7 |
| `services/rankProvider.ts` | Interfaz `RankProvider` y su única implementación `simulatedRankProvider.read(...)` (envuelve `simulateReading`). Sin red ni claves. | RF-34 |
| `services/accountWrites.ts` | `updateOwnedAccount` (lectura, dueño, cambio y una sola escritura con concurrencia optimista) y `linkAccount` (crear, comprobar el usuario, compensar). | RF-5, RF-11, RF-39, RF-45, RF-46, RF-47 |
| `services/accountReads.ts` (nuevo T20) | `withExistingOwners(cuentas)` y `ownerExists(cuenta)`: ocultan las cuentas cuyo dueño no existe. | RF-14, RF-2, RF-3 |
| `models/gameAccount.ts` | Modelo `GameAccount`, índice único `{ user, gameId }`, `optimisticConcurrency`, `toGameAccountJson` en lista blanca. | RF-4, RF-5, RF-37, DP-32, DP-33 |
| `models/user.ts` | Sin campo `accounts` (lo retira T19). El usuario no guarda ningún dato sobre sus cuentas. | RF-46, DP-16 revocada |
| `controllers/accounts.ts` | `createAccountsRouter({ jwtSecret, now })` en `/api/accounts`: listar, obtener, vincular, editar (`PUT`), desvincular y resincronizar (`POST /:id/sync`). | RF-1 a RF-11, RF-22, RF-29, RF-37 a RF-40, RF-44 a RF-47 |
| `controllers/users.ts` | Además de la spec 003: `GET /:id/games/:gameId` (resumen) y la eliminación del usuario con la cascada ordenada. | RF-12, RF-13, RF-14, RF-47 |
| `utils/middleware.ts` | Sesión (`createWithUser`) y guardia de rutas de usuario. | RF-1, RF-13, RF-29, RF-44 |
| `utils/clock.ts` | `export const clock = { now: (): Date => new Date() }`. Único punto donde se lee el reloj. | RNF-1, RNF-7, RNF-9 |

## 2. Funciones puras (firmas)
Ninguna lee el reloj: el instante llega como `now: Date` ("hoy" como parámetro, constitución,
principio 3). Ninguna importa Express ni Mongoose ni lee `process.env`. `division` se omite
cuando el tier no la tiene (nunca `division: undefined`, por `exactOptionalPropertyTypes`);
todo acceso por índice se comprueba (`noUncheckedIndexedAccess`).

```ts
// domain/games.ts
export type GameId = "lol" | "r6" | "cs2";
export const GAMES: Readonly<Record<GameId, GameDefinition>>;
export const GAME_IDS: readonly GameId[];
export function isGameId(value: unknown): value is GameId;           // exacto, sin recortar (DP-39)

// domain/rankScale.ts
export interface RankStep { tier: string; division?: string }
export function ladder(gameId: GameId): readonly RankStep[];         // 31 / 36 / 7
export function stepIndexOf(gameId: GameId, tier: string, division?: string): number | null;
export function normalizeStep(gameId: GameId, step: number): number;
export function normalizeRank(gameId: GameId, tier: string, division?: string): number;
export function pointsBand(gameId: GameId, step: number): { min: number; max: number };
                                                                     // T14: max siempre es un número (cerrada, 3.3)

// domain/rankSimulator.ts
export interface Snapshot { tier: string; division?: string; points: number; normalized: number; recordedAt: Date }
export interface SimulatedMatch { id: string; gameId: GameId; playedAt: Date; result: "win" | "loss";
  summary: string; durationMinutes: number; rankDelta: number }
export interface SimulatedReading { snapshot: Snapshot; matches: SimulatedMatch[]; mainMatchId: string; verified: boolean }
export interface ReadingInput { gameId: GameId; canonicalHandle: string; readingNumber: number; now: Date }
export function hash32(text: string): number;                        // FNV-1a 32 bits
export function createRng(seed: number): () => number;               // mulberry32, [0, 1)
export function randInt(rng: () => number, min: number, max: number): number;
export function canonicalHandle(handle: string): string;             // trim() y toLowerCase() (DP-19)
export function isVerified(canonical: string): boolean;
export function stepAt(gameId: GameId, canonical: string, readingNumber: number): number;
export function simulateReading(input: ReadingInput): SimulatedReading;

// domain/userId.ts (T3b, P-17)
export const SELF_ALIAS = "me";
export const OBJECT_ID_PATTERN: RegExp;                              // /^[0-9a-fA-F]{24}$/ (sin bandera m)
export const INVALID_ID_MESSAGE = "id con formato inválido";
export type UserTarget = { ok: true; id: string; own: boolean } | { ok: false; error: string };
export function resolveUserTarget(decoded: string, sessionUserId: string): UserTarget;

// domain/accountRules.ts (importa solo de domain/)
export const ACCOUNT_ERRORS: { invalidId; invalidGame; invalidHandle; invalidRegion(gameId);
  duplicate; handleNotEditable; accountNotFound; noAccountForGame };  // textos exactos de 7.2 (T11)
export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };
export function isValidId(value: unknown): value is string;          // OBJECT_ID_PATTERN
export function normalizeRegion(gameId: GameId, value: unknown): string | null;  // grafía de la lista (DP-35, T12)
export function validateLinkPayload(body: unknown): RuleResult<{ gameId: GameId; handle: string; region: string }>;
export function validateAccountEdit(account: { gameId: GameId; handle: string }, body: unknown):
  RuleResult<{ region?: string }>;
export function parseAccountFilters(query: Record<string, unknown>, sessionUserId: string):
  RuleResult<{ userId?: string; gameId?: GameId }>;

// domain/accountState.ts
export interface AccountState { currentRank: Snapshot; rankHistory: Snapshot[]; matches: SimulatedMatch[];
  readingNumber: number; lastSyncedAt: Date; verified: boolean }
export function initialState(reading: SimulatedReading, now: Date): AccountState;
export function applySync(state: AccountState, reading: SimulatedReading, readingNumber: number, now: Date): AccountState;
export function shouldAppendSnapshot(previous: Snapshot, next: Snapshot): boolean;
export function compareCodePoints(a: string, b: string): number;     // nuevo T14
export function compareMatches(a: SimulatedMatch, b: SimulatedMatch): number;
export function mergeMatches(saved: SimulatedMatch[], incoming: SimulatedMatch[], mainMatchId: string): SimulatedMatch[];
export function recentMatches(matches: SimulatedMatch[]): SimulatedMatch[];   // 8 primeras
export function winRate(matches: readonly { result: "win" | "loss" }[]): number;
export function trend(current: Snapshot, history: readonly Snapshot[]): number;
```

### 2.1 Aislamiento de `domain/` (P-17, aprobado el 2026-10-18)
- Regla: ningún archivo de `backend/src/domain/` importa (ni reexporta) de
  `backend/src/services/`, `utils/`, `models/` ni `controllers/`. Las dependencias van en un
  solo sentido: `controllers/`, `services/`, `models/` y `utils/` pueden importar de
  `domain/`; `domain/` solo de `domain/`. Vale para esta spec y las siguientes.
- Si una regla de `domain/` necesita algo puro que vive en otra capa, se mueve a `domain/` y
  la capa original lo reexporta (como `domain/userId.ts`).
- La vigila `tests/unit/domainIsolation.test.ts`, parte de `npm test`.
- Consecuencia para los textos (P-23): `domain/accountRules.ts` no puede importar
  `MESSAGES.forbidden` ni `USER_TARGET_MESSAGES.userNotFound`; esos dos textos no viven en
  `ACCOUNT_ERRORS`, los controladores los toman de `utils/errors.ts` y `services/userTarget.ts`.

## 3. Catálogo, escala, normalización y bandas

### 3.1 Juego, identificador y región [RF-6, DP-19, DP-35, DP-39]
- `isGameId(v)`: `typeof v === "string"` y propiedad propia de `GAMES`. No `v in GAMES`
  (aceptaría `toString` o `constructor` por el prototipo). `" lol "`, `"LOL"`, `5` → false.
- Patrones (sobre el texto ya recortado, sin banderas `u`, `s` ni `m`, así que `.` cuenta
  unidades UTF-16 y excluye exactamente LF, CR, U+2028 y U+2029, y `$` es el final del
  texto):
  - LoL `/^.{3,16}#[A-Za-z0-9]{2,5}$/` (la etiqueta no admite `#`, así que el corte es el
    último `#`: `a#b#cd` → nombre `a#b`).
  - R6 `/^[A-Za-z0-9._-]{3,20}$/`.
  - CS2 `/^7656119[0-9]{10}$/`.
- `canonicalHandle(t) = t.trim().toLowerCase()`; la longitud se mide antes sobre el texto
  recortado (DP-19). `trim` quita lo que quita `String.prototype.trim` (incluidos tabulador,
  NBSP y BOM) y no quita U+0085.
- `normalizeRegion(gameId, v)` (en `domain/accountRules.ts`): si `typeof v !== "string"` →
  null; `t = v.trim()`; devuelve la región `r` de la lista con
  `asciiLower(r) === asciiLower(t)`, o null. `asciiLower(s) = s.replace(/[A-Z]/g, c =>
  String.fromCharCode(c.charCodeAt(0) + 32))`. **No se usa `toLowerCase`**: convierte el
  signo de kelvin U+212A en `k` y daría por válida `"KR"` con ese signo (DP-35). Corrige T12.
  `"South  America"` (dos espacios) no coincide.
- Mensaje de identificador por juego, literal de RF-6 (7.2).

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

`pointsBand` devuelve siempre `{ min, max }` con `max` entero: la banda de la spec es
cerrada (el tope de Master+ es 999, el de Gold de CS2 34999 y el de Champion 4999). El
simulador genera los puntos dentro de esta misma banda: no hay "rango de generación" aparte.
El código de T1 devolvía `max: null` en esos tres escalones y tenía un `generationRange`
aparte; T14 lo corrige sin cambiar ninguna lectura (P-24).

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

Medidas de RF-42 (se comprueban en pruebas sobre los conjuntos de RF-41, no están
garantizadas por construcción; las exige T15): (a) la fotografía repite tier, división y
puntos con probabilidad ≤ 2/3 · 1/100 por lectura (la banda más estrecha tiene 100 valores),
así que fallar "al menos 5 de 10 cambian" exige 6 repeticiones; (b) un identificador no
cambia de escalón en 10 lecturas con probabilidad ≤ (2/3)^10 ≈ 1,7 % (solo en un extremo),
así que se esperan ~100 de 100, lejos del mínimo de 50. Si alguna medida fallara, el
implementer para y se vuelve a este plan (la regla es contrato, RF-41).

### 4.3 Lectura completa [RF-36, RF-43, DP-8, DP-31]
```
simulateReading({ gameId: g, canonicalHandle: c, readingNumber: n, now }):
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
  cambia todos los valores: no se toca sin pasar por la spec (R4). T13 añade una prueba de
  lectura literal que lo vigila.
- Orden de los campos del resumen (aprobado el 2026-10-18): primero el nombre y después los
  números en el orden de la tabla. LoL: campeón, k, d, a. R6: operador, b. CS2: mapa, x.
  Cada campo consume un valor de `rng` (`pick` o `randInt`).
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
| cs2 | 25–50 | 50–300 | victoria `<mapa> · 13-<x>`, derrota `<mapa> · <x>-13`; mapa de `Mirage, Inferno, Nuke, Ancient, Anubis, Dust II, Train`; x 0–11 |

  La variación por partida es informativa y no se reconcilia con los puntos de la fotografía.

### 4.4 Regla de verificada (RF-41)
```
isVerified(c) = (Σ c.charCodeAt(i)) % 2 === 0
```
Depende solo del identificador canónico (y del juego, por el patrón); igual para todas las
lecturas y usuarios. Se calcula a mano, así que las pruebas se escriben antes que el código.
Recuento sobre los conjuntos de RF-41 (la paridad solo depende de la suma de los dígitos de
i, impar en 51 de los 100 valores; las partes fijas suman 1103 en LoL (impar), 748 en R6
(par) y 371 + 10·48 en CS2 (impar)): LoL 51, R6 49, CS2 51, todos en 40–60.

| Juego | Verificadas | No verificadas |
| --- | --- | --- |
| lol | `jugador1#las` (1152), `Jugador3#LAS` (canónico `jugador3#las`, 1154) | `jugador2#las` (1153), `jugador4#las` (1155) |
| r6 | `jugador2` (798), `jugador4` (800) | `jugador1` (797), `jugador3` (799) |
| cs2 | `76561190000000001` (852), `76561190000000003` (854) | `76561190000000002` (853), `76561190000000004` (855) |

## 5. Modelos

### 5.1 `GameAccount` (`models/gameAccount.ts`) [RF-4, RF-5, RF-37, RNF-3, DP-32, DP-33]

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `user` | ObjectId → `User` | required, index. En JSON: `userId` (string). Nunca cambia. |
| `gameId` | String | required, `enum: GAME_IDS` |
| `handle` | String | required. Se guarda recortado y con sus mayúsculas (DP-19). Sin `trim` ni `lowercase` en el esquema: lo hace el controlador. |
| `region` | String | required, con la grafía de la lista (DP-35). |
| `currentRank` | `RankSnapshotSchema` | required |
| `rankHistory` | [`RankSnapshotSchema`] | orden de lectura (DP-36), sin límite (DP-9) |
| `matches` | [`MatchRecordSchema`] | máx. 20 (validador), orden de RF-28. **Interno** (DP-32). |
| `readingNumber` | Number | required, entero ≥ 0, default 0. **Interno** (DP-33). |
| `lastSyncedAt` | Date | required |
| `verified` | Boolean | default `false`; lo fija la lectura |
| índice | `{ user: 1, gameId: 1 }` | único (RF-5) |
| opciones | `optimisticConcurrency: true` | RF-39 |

- `RankSnapshotSchema` (`_id: false`): `tier`, `division` opcional, `points` (entero),
  `normalized` (entero 0–100), `recordedAt`. `MatchRecordSchema` (`_id: false`): `matchId`
  (no `id`, para no chocar con el virtual de Mongoose), `gameId`, `playedAt`, `result`
  (`win|loss`), `summary`, `durationMinutes`, `rankDelta`.
- `toGameAccountJson(cuenta)` en lista blanca (mismo patrón que `toPublicUserJson`): `{ id,
  userId, gameId, handle, region, currentRank, rankHistory, lastSyncedAt, verified,
  simulated: true }`, con `id` y `userId` en minúsculas, fotografías sin `division` cuando
  no existe y fechas `Date` (Express las serializa en ISO con milisegundos y `Z`). Nunca
  `_id`, `__v`, `user`, `matches` ni `readingNumber`. El `toJSON` del esquema usa la misma
  función. `simulated` no se guarda: ningún cuerpo puede cambiarla (RF-7, RF-37).
- El esquema repite las validaciones como red de seguridad; los mensajes que ve el cliente
  salen de `domain/accountRules.ts` antes de tocar la base (P-9).

### 5.2 `User` (`models/user.ts`) [RF-46, DP-16 revocada]
El usuario **no** tiene campo `accounts` ni ningún otro dato sobre sus cuentas: las cuentas
de un usuario son las que lo tienen como dueño (`GameAccount.user`). T19 quita `accounts` de
`UserFields`, del esquema y de los comentarios. Vincular, editar, resincronizar y desvincular
no escriben en `User`.

## 6. Interfaz REST y algoritmos
Todas las rutas exigen sesión (RF-1). Cada controlador toma `const now = clock.now()` una sola
vez por petición. Errores: `response.status(s).json({ error })`. La cabecera `X-CSRF-Token`
se exige en todas, también en las GET (comportamiento de `withUser`, spec 002).

| Método y ruta | Orden de revisión (RF-29), tras cuerpo (001) y sesión | Éxito |
| --- | --- | --- |
| `GET /api/accounts?user=&game=` | `parseAccountFilters` (usuario, luego juego) | 200 lista (`_id` ascendente, sin cuentas sin dueño) |
| `GET /api/accounts/:id` | decodificación (guardia) → formato → existencia (cuenta y dueño) | 200 cuenta |
| `POST /api/accounts` | `validateLinkPayload` → duplicado | 201 cuenta |
| `PUT /api/accounts/:id` | decodificación → formato → existencia → propiedad → RF-22 → RF-38 | 200 cuenta |
| `DELETE /api/accounts/:id` | decodificación → formato → existencia → propiedad | 204 |
| `POST /api/accounts/:id/sync` | decodificación → formato → existencia → propiedad | 200 cuenta |
| `GET /api/users/:id/games/:gameId` | id (`me`, formato) → juego → usuario existe → cuenta existe (RF-13) | 200 resumen |
| `DELETE /api/users/:id` (003) | sin cambios hasta el 403; después la cascada de 6.8 | 204 |

La edición es `PUT` (el plan anterior mencionaba `PATCH` en una de sus mitades; el código y
`MEMORY.md` usan `PUT`).

### 6.1 Sesión y guardias [RF-1, RF-13, RF-29, RF-44; P-15, P-22]
- `/api/accounts`: `createAccountsRouter({ jwtSecret, now })` se monta en `createApp` después
  de `/api/auth`. Dentro del router, sin ruta y antes de todas las rutas: (1)
  `createWithUser(...)` (pasos 1 a 4 de la spec 002 y, si el usuario ya no existe, 401
  "token inválido", RF-44); (2) si `request.path` tiene un primer segmento que
  `decodeSegment` no puede decodificar → 400 "id con formato inválido". Así un `%zz` da 401
  sin sesión y 400 con sesión, en el orden de RF-29, y nunca el error propio de Express.
- `/api/users/:id/games/:gameId`: la guardia de la spec 003 lo reconoce (`kind: "games"`),
  aplica el mismo `withUser` que las demás rutas de usuario y comprueba los dos segmentos en
  el orden de RF-13: id no decodificable (o, si el juego tampoco lo es, id sin formato
  válido) → 400 "id con formato inválido"; si no, juego no decodificable → 400 "juego no
  válido". Con un id inválido y un juego sin decodificar responde primero el error del id
  (decisión de T9 aceptada por el usuario; RF-13 ya lo exige).
- Los 400, 413 y 415 de interpretación del cuerpo ocurren antes (en `express.json`, spec
  001), también antes del 401 y en las operaciones que no leen el cuerpo (RF-29).

### 6.2 Listar [RF-2, RF-14, DP-38]
```
f = parseAccountFilters(request.query, userId)
  // user: presente → debe ser un único texto no vacío; resolveUserTarget(texto, userId)
  //   (me exacto o 24 hex); arreglo, "", "Me", " me", "%zz" literal → "id con formato inválido"
  // solo si user es válido o falta: game presente → único texto e isGameId; si no → "juego no válido"
  // cualquier otro nombre de parámetro se ignora (User, user[], page)
si f.error → 400
filtro = {}; si f.userId: filtro.user = f.userId; si f.gameId: filtro.gameId = f.gameId
cuentas = await GameAccount.find(filtro).sort({ _id: 1 })
200 (await withExistingOwners(cuentas)).map(toGameAccountJson)
```
`withExistingOwners` (T20, `services/accountReads.ts`) descarta las cuentas cuyo dueño no
existe con una sola consulta `User.find({ _id: { $in: dueños } }, { _id: 1 })` (P-21). El
orden por `_id` ascendente coincide con el del identificador en minúsculas (los 12 bytes del
ObjectId se comparan en el mismo orden que su hexadecimal). Un `user` con formato válido sin
usuario da `[]`.

### 6.3 Obtener [RF-3, RF-14]
```
id = isValidId(params.id)                         → 400 "id con formato inválido" (me, 23/25 hex)
cuenta = await GameAccount.findById(id)
si cuenta = null o no existe su dueño (User.exists) → 404 "cuenta no encontrada"      // P-21
200 toGameAccountJson(cuenta)
```

### 6.4 Vincular [RF-4, RF-5, RF-6, RF-7, RF-46, RF-47; P-19]
```
v = validateLinkPayload(request.body)            // juego → identificador → región; solo gameId, handle, region
si v.error → 400
si await GameAccount.exists({ user: userId, gameId }) → 400 "ya tienes una cuenta vinculada en este juego"
r = simulatedRankProvider.read({ gameId, canonicalHandle: canonicalHandle(handle), readingNumber: 0, now })
resultado = await linkAccount(userId, v.value, initialState(r, now))
  201 cuenta | 400 duplicado | 404 "usuario no encontrado"

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
- Vincular no lee ni escribe el usuario más allá de esa comprobación de existencia (RF-46):
  nada de `User.updateOne` ni de `$addToSet`.
- El índice único `{ user: 1, gameId: 1 }` resuelve la carrera de RF-5; la consulta previa da
  el mensaje sin intentar el insert en el caso normal.
- RF-47: si la comprobación posterior encuentra al usuario, responde 201 y la cascada (6.8)
  borra la cuenta; si no lo encuentra, compensa y responde 404 "usuario no encontrado". Si
  el usuario desaparece entre el `create` y la comprobación no se puede distinguir de "ya no
  existía": se responde 404 en ambos casos, con el mismo estado final (R3, aceptado).
- `WriteResult` ya no tiene el estado 401.

### 6.5 Editar [RF-7, RF-8, RF-11, RF-22, RF-38, RF-40]
```
id = isValidId(params.id) → 400
updateOwnedAccount(id, userId, (cuenta) =>
  e = validateAccountEdit(cuenta, request.body)
     // handle: propiedad propia presente → no texto, o canonicalHandle(valor) ≠ canonicalHandle(cuenta.handle) → RF-22
     // después region: presente → normalizeRegion(cuenta.gameId, valor) = null → RF-38
     // gameId del cuerpo nunca se lee; cuerpo ausente, [], text/plain o {} → sin cambios (RF-40)
  si e.error → 400
  si e.value.region definida: cuenta.region = e.value.region
  return null)                                                   // sin cambios → save() no escribe
```

### 6.6 Desvincular [RF-9, RF-11, RF-39, RF-46, RF-47; P-19]
```
id = isValidId(params.id) → 400
cuenta = await GameAccount.findById(id) → null: 404 "cuenta no encontrada"
si cuenta.user ≠ userId → 403 "no tienes permiso para esta operación"
r = await GameAccount.deleteOne({ _id: id, user: userId })      // un solo delete: historial y partidas con ella
r.deletedCount = 0 → 404 "cuenta no encontrada"                 // otra desvinculación o la cascada ganó (RF-39, RF-47)
204 sin cuerpo
```
Nada de `$pull` ni de tocar el usuario. Si `deleteOne` lanza, la cuenta sigue completa (500).

### 6.7 Resincronizar y escritura con concurrencia [RF-10, RF-15, RF-28, RF-39, RF-45, RF-47]
```
id = isValidId(params.id) → 400
updateOwnedAccount(id, userId, (cuenta) =>
  n = cuenta.readingNumber + 1
  r = simulatedRankProvider.read({ gameId: cuenta.gameId, canonicalHandle: canonicalHandle(cuenta.handle), readingNumber: n, now })
  asignar applySync(estado(cuenta), r, n, now) a la cuenta; return null)

updateOwnedAccount(id, userId, aplicar, maxIntentos = 5):          // services/accountWrites.ts
  repetir:
    cuenta = await GameAccount.findById(id)        → null: 404 "cuenta no encontrada"
    si cuenta.user ≠ userId                        → 403 "no tienes permiso para esta operación"
    error = aplicar(cuenta)                        → texto: 400 con ese texto
    try await cuenta.save(); return 200 cuenta
    catch VersionError → siguiente intento         // otra escritura ganó o la cuenta ya no existe
    catch DocumentNotFoundError → 404 "cuenta no encontrada"
  agotados → throw → 500 (la cuenta no cambió)

shouldAppendSnapshot(p, q) = p.tier ≠ q.tier || p.division ≠ q.division || p.points ≠ q.points     // DP-9
compareCodePoints(a, b): recorre los códigos (codePointAt, avanzando 1 o 2 unidades); el
  primero distinto decide; si uno es prefijo, el más corto va antes                               // T14
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
- `optimisticConcurrency: true`: `save()` solo escribe si `__v` no cambió (y lo incrementa); si
  la cuenta se borró, Mongoose lanza `VersionError` (o `DocumentNotFoundError`) y el
  reintento la encuentra `null` → 404. `save()` nunca recrea la cuenta (sin upsert).
- Una sola escritura por operación: si falla con otro error, nada cambia, incluido
  `readingNumber` (RF-45); el reintento solo ocurre ante `VersionError`.
- Resultado de RF-39 (cada caso, con la primera operación detenida entre su lectura y su
  escritura y la segunda completa entre medias):
  - dos resincronizaciones: la segunda guarda n; la primera choca, relee y guarda n + 1;
    estado = aplicarlas en serie;
  - edición y resincronización, dos ediciones: la detenida choca, relee y aplica encima;
    ningún cambio se pierde; cada respuesta lleva la cuenta tras aplicarse ella;
  - desvinculación con edición o resincronización: si la desvinculación va en medio, la otra
    choca, relee `null` → 404; si la detenida es la desvinculación, la otra responde 200 y
    después la desvinculación borra (204);
  - dos desvinculaciones: la de en medio 204; la detenida tiene `deletedCount` 0 → 404.
- RF-47 (operaciones propias en curso al eliminar el usuario): la cascada borra la cuenta; la
  operación detenida choca y responde 404 "cuenta no encontrada" (editar, resincronizar,
  desvincular), nunca 500.

### 6.8 Eliminar usuario: cascada ordenada (cambio en la ruta de la spec 003) [RF-14, RF-47; DP-42; P-20]
Antes: un único `User.deleteOne` y después `GameAccount.deleteMany` (versión antigua, P-7).
Ahora (mismas comprobaciones 400 y 403 de la 003):
```
await GameAccount.deleteMany({ user: userId })            // C1: las cuentas primero
try     await User.deleteOne({ _id: userId })             // C2: el usuario, lo último
finally await GameAccount.deleteMany({ user: userId })    // C3: barrido, también si C2 lanza
response.clearCookie(...); 204                            // solo si C1, C2 y C3 terminaron
```
- Un error en cualquier paso llega al `errorHandler` (500) sin borrar la cookie, así que la
  sesión sigue sirviendo para repetir la eliminación mientras el usuario exista.
- Estados tras un 500 (RF-14): falla C1 antes de borrar nada o tras borrar algunas →
  estado (1) con todas o algunas cuentas; falla C2 sin borrar el usuario → C3 corre → estado
  (1) sin cuentas; falla C2 tras borrar el usuario → C3 corre → estado (2); falla C3 → el
  usuario ya no existe y C1 ya había borrado sus cuentas → estado (2).
- Orden observable: el usuario no se borra mientras exista alguna cuenta suya al llegar a C2;
  C3 recoge la que se haya creado entre C1 y C2.
- Vinculación simultánea (RF-47): si crea la cuenta antes de C1, C1 la borra; entre C1 y C2,
  C3 la borra (también si C2 lanza tras borrar el usuario); después de C2, su comprobación
  posterior no encuentra al usuario y compensa (404).
- Límites sin transacciones (riesgo R2): la cuenta de una vinculación detenida existe unos
  milisegundos entre su `create` y su compensación, y un fallo doble (vinculación entre C1 y
  C2 **y** fallo de C3, o fallo de la compensación) dejaría una cuenta sin dueño. En ambos
  casos ninguna lectura la muestra (6.2, 6.3, P-21) y nadie puede operar sobre ella.
- Llamadas como métodos estáticos sin encadenar (`await GameAccount.deleteMany(...)`,
  `await User.deleteOne(...)`), para que las pruebas las sustituyan.
- La spec 006 deberá insertar sus sesiones antes de C2 con el mismo patrón.

### 6.9 Resumen por juego [RF-12, RF-13, RF-37]
```
t = resolveUserTarget(params.id, userId)         // me exacto → sesión; formato → 400 id (la guardia ya trató la decodificación)
si t.error → 400 "id con formato inválido"
si no isGameId(params.gameId) → 400 "juego no válido"
si (await User.exists({ _id: t.id })) = null → 404 "usuario no encontrado"
cuenta = await GameAccount.findOne({ user: t.id, gameId })
si cuenta = null → 404 "el jugador no tiene una cuenta vinculada en este juego"
ms = recentMatches(partidas(cuenta))
200 { account: toGameAccountJson(cuenta),
      recentMatches: ms (con `matchId` entregado como `id`), winRate: winRate(ms),
      trend: trend(cuenta.currentRank, cuenta.rankHistory) }
```

## 7. Mensajes

### 7.1 Orden y propiedad de los textos
Los textos propios de esta spec viven en `ACCOUNT_ERRORS` (`domain/accountRules.ts`). El 403
usa `MESSAGES.forbidden` (`utils/errors.ts`) y el 404 de usuario `USER_TARGET_MESSAGES.userNotFound`
(`services/userTarget.ts`): una sola fuente de verdad, sin duplicar literales en `domain/`
(P-23, 2.1).

### 7.2 Textos exactos [DP-6]
Contrastados el 2026-10-19 con `spec.md` (RF-2, RF-3, RF-5, RF-6, RF-11, RF-13, RF-22,
RF-29, RF-38 y DP-6): coinciden con los que pidió reviewer.

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

Minúscula inicial y sin punto final, salvo las siglas y nombres propios de formato (`Riot
ID`, `Ubisoft ID`, `SteamID64`). Ningún 409 ni 503. Ningún texto ni campo nombra a Riot
Games, Ubisoft, Valve, FACEIT ni otra fuente (RNF-2).

## 8. Decisiones técnicas (con la alternativa descartada)

| # | Decisión | Alternativa descartada y motivo |
| --- | --- | --- |
| P-1 | Generador propio FNV-1a + mulberry32 en `domain/`. | Librería de aleatoriedad con semilla: dependencia nueva (RNF-8). `Math.random`: no reproducible (RF-35). `crypto.createHash`: API de Node en el dominio y más lento para un dato que no necesita seguridad. |
| P-2 | Un generador por número de lectura (`rng_k`) y escalón calculado recorriendo 0..n. | Guardar el escalón anterior y derivar el siguiente: la lectura dependería del estado guardado, no solo de (juego, canónico, n), contra RF-35. Coste O(n) despreciable. |
| P-3 | Verificada por paridad de la suma de códigos del identificador canónico. | Bit del hash: igual de determinista, pero los ejemplos solo se conocen ejecutando el código, así que las pruebas no podrían escribirse antes (principio 4). |
| P-4 | Identificadores de partida `m-<n>-<j>`, principal `m-<n>-0`. | Identificadores derivados del hash: podrían colisionar entre lecturas y romper RF-42. Repetir partidas de la lectura anterior: obliga a reconciliar fechas. |
| P-5 | `clock` mutable (`utils/clock.ts`) sustituido en las pruebas con `t.mock.method`. **Decisión del usuario (2026-10-18, Q2): "Mantener clock.ts".** | `mock.timers` sobre `Date`: afecta a la expiración del JWT y a `timestamps` de Mongoose. Reutilizar el `now` de `createApp`: es el reloj de las credenciales en segundos. Opción `clock?: () => Date` en `AppOptions`: viable, descartada por el usuario. Cabecera de prueba con el instante: explotable en producción. |
| P-6 | `optimisticConcurrency` + `save()` + reintento (máx. 5). | `findOneAndUpdate` condicionado: salta los validadores del esquema. Transacciones: exigen replica set, que la base de prueba local no garantiza. |
| P-7 | **Reemplazada (2026-10-19) por P-19 y P-20.** Decía: vincular = crear + `$addToSet` con compensación; eliminar usuario = borrar el usuario y luego las cuentas. La spec vigente revoca la lista de cuentas (DP-16, RF-33 retirado) y exige el orden inverso (RF-14, DP-42). | — |
| P-8 | `simulated: true` añadido por `toJSON`, no guardado. | Campo en la base: podría quedar `false` en documentos viejos o ser alterado. |
| P-9 | Validación en `accountRules.ts` antes de tocar la base; el esquema solo como red. | `ValidationError` de Mongoose: el orden y el texto dependerían del orden de los campos del esquema (RF-6 exige primer error en orden fijo). |
| P-10 | Resumen en `controllers/users.ts` (`/api/users/:id/games/:gameId`). | Ruta bajo `/api/accounts`: cambia la URL que fija HU-08 de la referencia y que consume la interfaz. |
| P-11 | Partidas guardadas en el campo `matches` con `matchId`. | `id`: choca con el virtual de Mongoose. |
| P-12 | **Decisión del usuario (2026-10-17): "Acepto el borrado posterior (Recomendado)".** Eliminar el usuario durante una vinculación se garantiza en el estado final (nunca queda una cuenta del usuario eliminado), aceptando el intervalo de milisegundos en que la cuenta existe antes de compensarse. Se aplica ahora con P-19 y P-20. | Transacción multi-documento con replica set: la base de prueba local no la garantiza. |
| P-13 | **Decisión del usuario (2026-10-17): "No, basta con lo del plan".** Los valores esperados de las pruebas de controladores se calculan con las mismas funciones puras y el instante fijo; no se copian salidas del generador. **Excepción aprobada el 2026-10-19 (T13, C2, Q4):** una única prueba de regresión con lectura literal fija, para detectar cambios del orden de consumo del generador (R4). | Fijar valores literales en todas las pruebas: no podrían escribirse antes que el código. |
| P-14 | **Reemplazada (2026-10-19) por P-22.** Decía: `missingUserError` y `withExistingUser` con "sesión no iniciada" (Q1 "Mantener la spec"). La spec vigente recoge la decisión del usuario del 2026-10-18 ("la 004 debe utilizar los mensajes y códigos de las specs 002 y 003") y fija 401 "token inválido" (RF-44, DP-37). | — |
| P-15 | Guardias sin ruta antes de emparejar `:id`: en `/api/accounts`, `withUser` y luego la comprobación de `decodeSegment`; en `/api/users/:id/games/:gameId`, la guardia de la 003 con `kind: "games"`. | Rutas con sesión en cada una: con `%zz` Express 5 fallaría al decodificar `:id` antes de comprobar la sesión y el `errorHandler` respondería 500, contra RF-29 y RF-13. |
| P-16 | Utilidades de prueba en el `helpers.ts` existente (`FIXED_NOW`, `accountsInDb`, `rawAccountsInDb` y, desde T17, los ayudantes de cuentas y de solapamiento). | Crear `test_helper.ts` con otra convención: duplicaría utilidades que ya existen. |
| P-17 | **Decisión del usuario (2026-10-18): "Aprobar y ajustar P-17".** `domain/` solo importa de `domain/` (2.1); `domain/userId.ts`; test `domainIsolation.test.ts`. | Aceptar los imports de `domain/` a `utils/` y `services/` como excepción: invierte el orden de capas, impide copiar `domain/` al frontend y abre la puerta a Express o Mongoose en el dominio. Duplicar el patrón y el texto: dos fuentes de verdad. |
| P-18 | **Cambio T8b aprobado el 2026-10-18: "Apruebo, haz T8b".** Las pruebas HTTP usan un servidor ya escuchando en `127.0.0.1` (`listenOnLoopback`, `authApp` asíncrono) y lo cierran con `closeTestServers()`; `getFreePort(host = "127.0.0.1")` recibe el host (`null` = sin host). Causa: con una app de Express, supertest hace `listen(0)` sin host (en `::`) y conecta a `127.0.0.1`, donde otro proceso puede tener el puerto (404 vacío o `ECONNRESET`). | Un `--import` global que parchee `http.Server.prototype.listen`: alteraría `tests/server/`. Dejarlo y reintentar: oculta la causa. |
| P-19 | **Nueva (2026-10-19).** Vincular = crear la cuenta, comprobar que el usuario existe y, si no existe o algo lanza, compensar con `deleteOne` (6.4). El usuario no se escribe nunca. | Mantener `$addToSet` con compensación (DP-16 revocada: la lista dejaría de ser fiable si la compensación fallara). Comprobar el usuario antes de crear: no cierra la carrera, el usuario puede borrarse entre la comprobación y el `create`. Transacción: exige replica set. |
| P-20 | **Nueva (2026-10-19).** Eliminar usuario = cuentas (C1), usuario (C2), barrido de cuentas en `finally` (C3); la cookie se borra solo si los tres terminan (6.8). | Borrar primero el usuario (P-7): un 500 entre medias deja cuentas sin dueño, contra RF-14. Todo o nada con transacciones: replica set. Marcar al usuario "en borrado" con un campo nuevo: el usuario pasaría a guardar un dato sobre el borrado de sus cuentas, contra el espíritu de RF-46, y exigiría filtrarlo en las specs 002 a 006. |
| P-21 | **Nueva (2026-10-19).** Listar y obtener ocultan las cuentas cuyo dueño no existe (`withExistingOwners` / `ownerExists`), como defensa del fallo doble que la cascada no puede evitar sin transacciones. | Confiar solo en la cascada: el fallo doble (R2) dejaría una cuenta huérfana visible, contra RF-14 ("nunca mostrar"). `$lookup` en una agregación: una sola consulta, pero no usa `find` + `sort` simples y complica el orden; el volumen de la demostración no lo justifica. |
| P-22 | **Nueva (2026-10-19), reemplaza P-14.** Todas las rutas de la 004 usan `withUser`: la credencial de un usuario eliminado responde 401 "token inválido" (RF-44). **Histórico:** `createWithExistingUser` y `missingUserError` solo siguieron mientras la spec 005 los usó; T24 los retiró el 2026-10-19, después de la T9 de la 005 (Q3). | Mantener "sesión no iniciada" con `missingUserError` (P-14): contradice la spec vigente, las specs 002 y 003 y lo que ya devuelve `withUser`. |
| P-23 | **Nueva (2026-10-19).** `ACCOUNT_ERRORS` solo contiene los textos propios de la 004; el 403 sale de `MESSAGES.forbidden` y el 404 de usuario de `USER_TARGET_MESSAGES.userNotFound` (7.1). `utils/middleware.ts` importa `ACCOUNT_ERRORS` de `domain/` (aceptado por el usuario). Las pruebas escriben los textos como literales de la spec, no los importan de `ACCOUNT_ERRORS`. | Duplicar los literales del 403 y del 404 de usuario en `domain/`: dos fuentes que pueden divergir. Importar `utils/errors.ts` desde `domain/`: rompe P-17. |
| P-24 | **Nueva (2026-10-19).** `pointsBand` devuelve la banda cerrada de DP-34 (3.3) y desaparece `generationRange`; el simulador usa `pointsBand`. Sin cambio de ninguna lectura. | Conservar `max: null` y un `generationRange` aparte (T1): `pointsBand` no sería la "banda de puntos" cerrada de la spec y el tope de Master+, Gold de CS2 y Champion solo se probaría en la función auxiliar. |

## 9. Instante actual en las pruebas (RNF-1, RNF-9)
- Producción y desarrollo: `clock.now()` devuelve `new Date()`.
- Pruebas de controladores: `t.mock.method(clock, "now", () => new Date(FIXED_NOW))` (`mock` de
  `node:test`; se restaura solo al terminar la prueba y, además, el archivo llama
  `mock.restoreAll()` en `afterEach`). Para otra hora se vuelve a mockear con otro instante.
- El reloj de las credenciales (`now` de `createApp`, en segundos) es otro y no se toca: la
  app de prueba se crea con `await authApp()` sin `overrides`, así el JWT de `signUp` no
  caduca aunque `FIXED_NOW` sea una fecha pasada.
- Pruebas unitarias: pasan `now` como argumento.
- Sin variables de entorno nuevas ni dependencias nuevas. Las pruebas no abren red salvo la
  base de prueba de la spec 001.

## 10. Riesgos
- **R1 (constitución). Resuelto (2026-10-18).** La aclaración está al final del principio 5
  de `docs/constitution.md`. Si se cambiara, se revisa RNF-2.
- **R2 (sin transacciones).** La cuenta de una vinculación concurrente puede existir unos
  milisegundos antes de su compensación; y un fallo doble (vinculación entre C1 y C2 y fallo
  del barrido C3, o fallo de la propia compensación) dejaría una cuenta sin dueño en la base.
  P-21 la oculta en listar y obtener; ninguna prueba de la spec fuerza ese fallo doble.
- **R3 (respuesta de una vinculación concurrente).** Si el usuario desaparece entre el
  `create` y la comprobación posterior, no se puede saber si se creó antes o después de
  borrarlo: se responde 404 "usuario no encontrado" en ambos casos (RF-47 diría 201 en el
  primero). El estado final es el mismo (sin cuenta). **Aceptado por el usuario el
  2026-10-18.** Reviewer debe tenerlo presente al validar RF-47.
- **R4 (orden de consumo del generador).** Es contrato: cambiarlo cambia todas las lecturas
  de la demostración y exige volver al plan. T13 (aprobada, C2) lo vigila con una lectura
  literal.
- **R5 (paridad con Express).** `matchUserRoute` replica el emparejamiento de Express 5 para
  `/:id/games/:gameId`; las pruebas de `/` final y mayúsculas en `games` sin sesión (401, no
  404) detectan desajustes. `/api/accounts` no replica el emparejamiento: usa una guardia
  sin ruta.
- **R6 (mocks por número de llamada).** Las pruebas de RF-46 cuentan las llamadas a
  `User.exists` (la primera es la de `withUser`); si cambia el orden de llamadas, la prueba
  falla en rojo, no en falso verde: cada prueba comprueba también `callCount`.
- **R7 (índice único).** En producción lo crea `prepareDatabase()`; las pruebas llaman
  `GameAccount.init()` para no depender de ello.
- **R8 (normalización).** Difiere de la de la interfaz hasta la spec 007 (RF-48).
- **R9 (pruebas que nacen en verde).** Varias tareas de refuerzo (T13, T15, T21, T22, T23)
  añaden pruebas que pueden pasar de inmediato. Para que no sean falsos verdes, el
  implementer comprueba cada una rompiendo a propósito el código que vigila (cambio
  temporal, revertido, sin commit) y lo anota en su reporte.
- **R10 (acoplamiento con la spec 005). Histórico, cerrado (2026-10-19).**
  `controllers/matches.ts` usaba `createWithExistingUser`, así que esa función y
  `missingUserError` se quedaron hasta que la 005 migró (su T9, a `createWithUser`); T24 los
  retiró después. Ver sección 13.

## 11. Estrategia de pruebas

### 11.1 Patrón general
- `node --test` vía `npm test` (`NODE_ENV=test`, `--test-concurrency=1`), `node:assert/strict`
  con `strictEqual` / `deepStrictEqual`, base de prueba de la spec 001.
- Archivos de `controllers/` con el patrón de `users.test.ts`: `const app = await authApp()`
  (await de nivel superior); `before` → `connectDatabase(testConfig().db)`, `User.init()` y
  `GameAccount.init()`; `beforeEach` → `User.deleteMany({})` y `GameAccount.deleteMany({})`;
  `afterEach` → `mock.restoreAll()`; `after` → `await closeTestServers()` y después
  `mongoose.disconnect()`.
- Servidor de prueba (T8b, P-18): toda prueba HTTP pasa a supertest un servidor ya escuchando
  en `127.0.0.1` (`await authApp()` o `await listenOnLoopback(app)`), nunca una app sin
  escuchar, y lo cierra con `closeTestServers()`. Como el fallo es intermitente, los cierres
  que lo exigen piden repetición.
- Sesión: `const ana = await signUp(app, { email, username })` da `{ agent, csrf, id }`; cada
  petición protegida va como `withSession(ana.agent.post("/api/accounts"), ana.csrf)`,
  también las GET. Sin sesión: `supertest(app).get(...)`. Segundo usuario: otro `signUp`.
- Los textos de error esperados se escriben como **literales de la spec** (7.2), no se
  importan de `ACCOUNT_ERRORS` (P-23): una prueba que importa la constante no detecta un
  texto equivocado.
- Valores exactos en controladores: el esperado se calcula con las funciones puras
  (`simulateReading` + `initialState` / `applySync`) con el mismo instante fijo y se compara
  con la respuesta y con `rawAccountsInDb()` (P-13). Excepción aprobada: T13.
- Fallos forzados con `t.mock.method` sobre métodos estáticos (`GameAccount.create`,
  `GameAccount.deleteOne`, `GameAccount.deleteMany`, `User.exists`, `User.deleteOne`) o sobre
  `GameAccount.prototype.save`. Para estados intermedios del borrado (por ejemplo "borra una
  cuenta y lanza") la sustitución ejecuta el borrado real con el driver nativo
  (`GameAccount.collection`, `User.collection`) y después lanza.
- Solapamiento determinista (RF-39, RF-47; T17): el ayudante `overlapFirstFindById` detiene la
  primera operación **después** de que `GameAccount.findById` leyó la cuenta y antes de
  escribirla, ejecuta la segunda operación completa y después deja seguir a la primera. Se
  usa en las dos direcciones. Las pruebas que aceptaban "200 o 404" o "201 o 401" se
  reemplazan por casos deterministas con un único resultado posible.
- Unitarias (sin base): `rankScale`, `rankSimulator`, `accountRules`, `accountState`,
  `gameAccountModel`.
- Aislamiento de `domain/` (T3b, P-17): `domainIsolation.test.ts` resuelve las rutas con
  `node:path`, comprueba que no pasa en vacío y vigila solo `services/`, `utils/`, `models/`
  y `controllers/`.
- Propiedades del simulador: se recorren los 100 identificadores de cada juego y n = 0..30
  (banda, escala, ±1 escalón, 1–8 partidas, ids distintos, principal nueva, fechas); mismo n
  a dos instantes → todo igual salvo fechas; medidas (a) y (b) de RF-42 sobre n = 0..10.

### 11.2 Cobertura por archivo
**`unit/rankScale.test.ts`** [RF-36, RF-48, DP-26, DP-34]: tamaños 31/36/7; todos los valores
de 3.2; bandas cerradas de 3.3 en sus extremos, incluidos los topes de Master+ (999), Gold de
CS2 (34999) y Champion (4999) con `pointsBand` (T14).

**`unit/rankSimulator.test.ts`** [RF-35, RF-36, RF-41, RF-42, RF-43]: mismas entradas →
`deepStrictEqual`; mayúsculas/recortables → misma lectura; fotografía en escala, `division`
solo si existe, puntos enteros en banda, normalizado coherente; 1–8 partidas, juego, ids
distintos, una sola con `playedAt = now`, las demás ≥ 1 min antes; ±1 escalón y principal
ausente en 0..n − 1 para los 100 identificadores y n = 0..30; mismo n a dos instantes;
verificada: los 12 ejemplos de 4.4, 51/49/51 y estable en n = 0..10; **las dos medidas de
RF-42 (T15)**; `canonicalHandle` con `Ñandú`/`ñandú` iguales y `ß`/`ss` distintos (T15);
lectura literal fija (T13, aprobada).

**`unit/accountState.test.ts`** [RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36]:
`mergeMatches` sin repetidos (conserva la fecha guardada), orden, desempate `m-9-0` antes que
`m-10-0`, `compareCodePoints` con un carácter astral frente a U+FFFF (T14), corte en 20,
principal conservada con más de 20 partidas de fecha igual o posterior; `applySync` sin
cambio de rango y con reloj atrasado; `initialState`; `winRate` 5/8 = 63, 0/8 = 0; `trend` con
un elemento = 0; `recentMatches` = 8 primeras.

**`unit/accountRules.test.ts`** [RF-2, RF-6, RF-7, RF-13, RF-22, RF-38, RF-40]: textos exactos
de `ACCOUNT_ERRORS` como literales (T11); orden juego → identificador → región; nulo, vacío,
recortables, no texto; arreglo/ausente → "juego no válido"; campos extra ignorados; edición:
mismo identificador con otras mayúsculas o recortable ignorado, distinto/nulo/vacío → RF-22
antes que RF-38; filtros: `user` arreglo, `""`, `Me`, `" me"`, `%zz` → id (también con
`game` inválido), `game` arreglo, `""`, `LOL`, `" lol"` → juego, `user=me` → sesión; región
con plegado solo ASCII: `"KR"` (kelvin), `"South  America"`, `" las "`, `"south america"`
(T12); patrones: emoji de 2 unidades en el nombre de LoL (16 válido, 17 inválido), tabulador,
NBSP, BOM recortados, U+0085 no recortado (T15).

**`controllers/accounts.test.ts`** [RF-1 a RF-11, RF-14, RF-15, RF-22, RF-28, RF-29, RF-37 a
RF-47, RNF-2, RNF-3]: describe listar, obtener, vincular, editar, desvincular,
resincronizar, concurrencia (las dos resincronizaciones y la lectura/escritura forzada) y
fallo. Cada RF de error con el texto literal y, en escrituras, con el estado de la base y
con los datos del usuario sin cambios (`User.findById().lean()` igual antes y después). T16
cambia el 401 de usuario eliminado a "token inválido"; T18, T19 y T20 añaden RF-46, el 404 de
vincular, `deletedCount` 0 y las cuentas sin dueño; T21 añade los casos HTTP de filtros,
resumen y orden de revisión.

**`controllers/gameSummary.test.ts`** [RF-12, RF-13, RF-29, RF-37]: resumen propio (`me`,
`m%65`, id en mayúsculas) y ajeno; cada salto de RF-13 (`Me`, `ME`, `%20me`, `%zz`, 23 hex →
id; `LOL`, `%20lol`, `%zz` en el juego → juego; `Me` + juego `%zz` → id; inexistente →
usuario; sin cuenta → jugador); 401 sin sesión y 401 "token inválido" con credencial de
usuario eliminado; `POST` a la ruta → 404. Las dos pruebas de "eliminar usuario" que había
aquí pasan a `userDeletionCascade.test.ts` (T10).

**`controllers/accountConcurrency.test.ts`** (nuevo T17) [RF-39, RF-47]: con
`overlapFirstFindById`, un `test` por caso y por dirección (T17 y T19 abren el archivo; T22 y
T23 lo completan): desvinculación + resincronización, dos desvinculaciones, edición +
resincronización, dos ediciones, desvinculación + edición, y las tres ramas de RF-47
(editar, resincronizar y desvincular con `DELETE /api/users/me` en medio → 404 "cuenta no
encontrada", ninguna cuenta ni usuario al final, nunca 500). Cada uno comprueba las dos
respuestas y el estado final contra la aplicación en serie.

**`controllers/userDeletionCascade.test.ts`** (nuevo T10) [RF-14, RF-47]: usuario con cuentas
en los tres juegos → 204, sin usuario ni cuentas suyas, las de otro usuario intactas, cookie
borrada, listar sin filtro sin cuentas sin dueño y orden C1 → C2 → C3 (orden de las
llamadas). Fallos forzados, uno por `test`:
1. `GameAccount.deleteMany` (1.ª) lanza sin borrar → 500; estado (1) con las tres.
2. `GameAccount.deleteMany` (1.ª) borra una con el driver y lanza → 500; estado (1) con dos
   completas; volver a vincular ese juego → 201.
3. `User.deleteOne` lanza sin borrar → 500; estado (1) sin cuentas.
4. `User.deleteOne` borra con el driver y lanza → 500; estado (2); la credencial → 401 "token
   inválido".
5. `GameAccount.deleteMany` (2.ª, el barrido) lanza tras borrar el usuario → 500; estado (2).
En cada 500, sin `Set-Cookie` de borrado. En cada estado (1): la sesión sigue valiendo, las
cuentas que quedan se obtienen, editan, resincronizan y desvinculan, y repetir la eliminación
→ 204 sin cuentas suyas. Vinculación simultánea: `User.deleteOne` ejecuta primero una
vinculación completa (201, cuenta creada después de C1) y luego delega → (a) 204 y (b)
lanzando tras delegar → 500; en ambos, ni usuario ni cuenta. Las pruebas de la 003
(`userDeletion.test.ts`) siguen verdes.

**`controllers/helpers.ts`**, bloque `// --- Spec 004 ---` (T17): además de `FIXED_NOW`,
`accountsInDb` y `rawAccountsInDb`, los ayudantes que compartan los archivos nuevos (`link`,
`linkOk`, `sync`, `unlink`, `edit`, `deleteMe`) y `overlapFirstFindById`. `accounts.test.ts`
y `gameSummary.test.ts` los importan en lugar de repetirlos (sin cambiar ninguna aserción).

### 11.3 Verificaciones fuera de `npm test`
`npm run typecheck` y `npm run lint` en verde; sin `.only`, `any` ni `@ts-ignore`; sin
`Math.random`, `Date.now`, `new Date()` (la búsqueda literal de `new Date()` con paréntesis
vacíos no da resultados en `src/domain/`; `new Date(<instante>)` con argumento sí se usa, por
ejemplo `new Date(now.getTime())` en `rankSimulator.ts`, porque el instante llega como
parámetro), `process.env`, `fetch` ni `node:http` en `src/domain/`; `git diff backend/package.json backend/.env.example` sin dependencias ni
variables nuevas; suite completa sin conexión a Internet (solo MongoDB local; la ejecutó el
usuario y lo confirmó el 2026-10-19: 1567/1567, 220 suites, 0 fallos, ~100 s); recorrido
manual de `requests/accounts.rest`.

## 12. Trazabilidad

| RF / RNF | Implementación | Prueba | Tarea que lo corrige o cierra |
| --- | --- | --- | --- |
| RF-1, RF-44 | `createWithUser` sin ruta en `createAccountsRouter`; guardia de usuarios con `kind: "games"` | `accounts.test.ts` y `gameSummary.test.ts` "sin sesión → 401" y "usuario eliminado → token inválido" | T16 |
| RF-2 | `parseAccountFilters`, `GET /api/accounts` | `accountRules.test.ts`; `accounts.test.ts` "listar" | T11, T20, T21 |
| RF-3 | `GET /api/accounts/:id` + dueño | `accounts.test.ts` "obtener" | T20 |
| RF-4, RF-5 | `initialState`, `linkAccount`, índice único | `accountState.test.ts`; `accounts.test.ts` "vincular", duplicado y simultáneas | T18 |
| RF-6, RF-7 | `validateLinkPayload` / `validateAccountEdit` | `accountRules.test.ts`; `accounts.test.ts` | T11, T12, T15 |
| RF-8, RF-22, RF-38, RF-40 | `validateAccountEdit` + `updateOwnedAccount` | `accountRules.test.ts`; `accounts.test.ts` "editar" | T11, T12 |
| RF-9, RF-11 | `DELETE /api/accounts/:id` con `deleteOne({ _id, user })` | `accounts.test.ts` "desvincular" | T19 |
| RF-10, RF-15, RF-28 | `applySync`, `mergeMatches`, `updateOwnedAccount` | `accountState.test.ts`; `accounts.test.ts` "resincronizar" | T14 |
| RF-12, RF-13 | ruta del resumen y su guardia | `gameSummary.test.ts` | T11, T21 |
| RF-14 | cascada C1 → C2 → C3; listar y obtener sin cuentas sin dueño | `userDeletionCascade.test.ts`; `accounts.test.ts` | T10, T20 |
| RF-29 | guardias de P-15 + orden en controladores | `accounts.test.ts` "orden de errores"; `gameSummary.test.ts` | T21 |
| RF-33 (retirado), DP-16 revocada | sin `User.accounts` | `accounts.test.ts` (usuario sin cambios); modelo | T18, T19 |
| RF-34 | `services/rankProvider.ts` | revisión: sin `fetch`, `http` ni variables nuevas; pruebas offline | T25 |
| RF-35, RF-36, RF-42, RF-43 | `rankSimulator.ts` | `rankSimulator.test.ts` (incluidas las medidas de RF-42 y la lectura literal) | T13, T14, T15 |
| RF-37 | `toGameAccountJson` | `gameAccountModel.test.ts`; `accounts.test.ts`, `gameSummary.test.ts` | — |
| RF-39 | `updateOwnedAccount`, `deleteOne` condicionado, `overlapFirstFindById` | `accountConcurrency.test.ts` (cinco casos) y `accounts.test.ts` (dos resincronizaciones) | T17, T19, T22 |
| RF-41 | `isVerified` | `rankSimulator.test.ts` | — |
| RF-45 | una escritura por operación | `accounts.test.ts` "fallo forzado en sync" | — |
| RF-46 | `linkAccount` con compensación; `deleteOne` único; `User` sin `accounts` | `accounts.test.ts` "fallo" de vincular y desvincular; usuario idéntico tras las cuatro operaciones | T18, T19 |
| RF-47 | compensación de `linkAccount`; 404 de `updateOwnedAccount` y `deleteOne` | `accountConcurrency.test.ts` (tres ramas); `userDeletionCascade.test.ts` (vinculación) | T18, T10, T23 |
| RF-48 | `rankScale.ts` | `rankScale.test.ts` | T14 |
| DP-6 | `ACCOUNT_ERRORS`, `MESSAGES.forbidden`, `USER_TARGET_MESSAGES.userNotFound` | literales en `accountRules.test.ts` y controladores | T11 |
| DP-34 | `pointsBand` cerrada | `rankScale.test.ts` (topes) | T14 |
| DP-35 | `normalizeRegion` con plegado ASCII | `accountRules.test.ts` | T12 |
| RNF-1, RNF-9 | `clock`, sin red | toda la suite con `FIXED_NOW`; suite sin Internet ejecutada por el usuario (confirmada el 2026-10-19, 1567/1567) | T25 |
| RNF-2 | textos sin fuentes; `games.ts` sin `source` | `accounts.test.ts` "ninguna respuesta menciona Riot/Ubisoft/Valve/FACEIT/Steam Web API" | — |
| RNF-3 | `toGameAccountJson` | `accounts.test.ts` forma exacta de la cuenta | — |
| RNF-7 | `domain/*.ts` puros; `domain/` solo importa de `domain/` | unitarias; `domainIsolation.test.ts` | — |
| RNF-8 | sin `npm install` | T25 revisa que `package.json` no cambió en dependencias | T25 |

## 13. Impacto en la spec 005 y preguntas (todas resueltas)

### 13.1 Impacto en la spec 005 (no se edita desde aquí)
Estado (2026-10-19, cierre): **cerrado.** La spec, el plan, las tareas y el código de la 005
recogen los puntos 1 y 2 (RF-13 → 401 "token inválido", incluido `noSession`; su T9, hecha) y
el punto 3 (su T10, textos en minúscula y sin punto final, hecha después de la T11 de esta
spec). Los textos de abajo conservan la redacción de antes del rework (histórico).
La spec 005 (`GET /api/matches`, `controllers/matches.ts`, `services/matchInputs.ts`) usa
piezas de la 004. Para que el cambio coordinado no se olvide:
1. **Sesión (T16, T24).** `matches.ts` usa `createWithExistingUser`: la credencial de un
   usuario eliminado responde hoy 401 "sesión no iniciada". La 004 pasa a "token inválido"
   (RF-44). La 005 debe actualizar su spec (RF-13 y su caso límite), su plan, sus tareas y sus
   pruebas, y su código debe pasar a `createWithUser`. Solo entonces T24 retira
   `createWithExistingUser` y `missingUserError` y reduce `tests/unit/withUser.test.ts` (nombre
   actual; entonces `withExistingUser.test.ts`) a las pruebas de `createWithUser`. **Hecho
   (2026-10-19):** T9 de la 005 y después T24 de esta spec; el archivo de prueba conservó su
   nombre `withExistingUser.test.ts` hasta el cierre, cuando el usuario autorizó renombrarlo a
   `withUser.test.ts` (hecho el 2026-10-19).
2. **Rama `noSession` de `loadMatchInputs`** (usuario eliminado entre la sesión y la
   lectura): hoy responde 401 "sesión no iniciada". La 005 debe decidir su texto (coherente
   con DP-37: "token inválido" o 404 de usuario).
3. **Textos (T11).** Si algún código o prueba de la 005 importa `ACCOUNT_ERRORS` o escribe
   "Juego no válido." u otro texto antiguo de la 004, debe pasar al literal de 7.2. Los
   `MATCH_ERRORS` propios de la 005 siguen la regla "minúscula y sin punto final" (DP-6).
   La comprobación de "no quedan textos antiguos" de la T11 se limita a los archivos de la
   spec 004 (`domain/accountRules.ts`, `controllers/accounts.ts`, `controllers/users.ts`,
   `services/accountWrites.ts`, `utils/middleware.ts` y sus tests de cuentas) y exceptúa los
   de la 005 (`domain/matchQuery.ts`, `controllers/matches.ts`, `services/matchInputs.ts`,
   `tests/unit/matchQuery.test.ts`, `tests/controllers/matches.test.ts`,
   `tests/controllers/matchInputs.test.ts` y `requests/matches.rest`): `MATCH_ERRORS.game =
   'Juego no válido.'` y sus pruebas se alinean en la T10 de la 005, que va después de la T11
   de esta spec.
4. **`User.accounts` (T19).** `matchInputs.ts` lee `GameAccount.find`, no `User.accounts`:
   sin impacto en el código. Revisar fixtures de pruebas de la 005 que insertaran
   `accounts` en usuarios (el `typecheck` lo señala).
5. **`pointsBand` (T14) y `compareMatches` (T14).** Cambian internamente sin alterar ninguna
   lectura ni cuenta serializada: sin impacto en las distancias (usan `normalized`).
6. **Cuentas sin dueño.** `loadMatchInputs` ya une cuentas y dueños con `assembleCandidates`;
   la 005 no necesita `withExistingOwners` (P-21), pero conviene que su spec lo confirme.
7. ~~`MEMORY.md` y `AGENTS.md` (fuera de `specs/`): la línea "401 «sesión no iniciada» si el
   usuario ya no existe" (005), la mención de `User.accounts` y de `createWithExistingUser`
   deben actualizarse al cerrar las tareas.~~ **Cerrado (2026-10-19):** `MEMORY.md` ya recoge
   el 401 «token inválido» (005) y el retiro de `User.accounts` y `createWithExistingUser`;
   `AGENTS.md` no contiene ninguna de esas menciones.

### 13.2 Preguntas abiertas
- **Q1 (cerrada, revocada).** "Mantener la spec" (401 "sesión no iniciada"): anulada por la
  spec vigente (DP-37). **Q2 (cerrada):** "Mantener clock.ts"; sigue.
- **Q3 (resuelta, C1, 2026-10-19). ¿Cuándo se retira `createWithExistingUser`?** La 004
  deja de usarlo en T16, pero `controllers/matches.ts` (005) lo usaba. Respuesta: T24
  (retirada de `createWithExistingUser` y `missingUserError`, y reducción de
  `withUser.test.ts`, entonces `withExistingUser.test.ts`) queda **bloqueada hasta que la T9 de la spec 005 esté hecha**. La 005 ya tiene su spec, plan
  y tareas aprobados para migrar a `createWithUser` y "token inválido" (su T9); la 004 no
  cambia código de la 005. **Hecho (2026-10-19):** T9 de la 005 y después T24.
- **Q4 (resuelta, C2, 2026-10-19). Lectura literal fija (T13).** Respuesta: aprobada como
  T13, con un único valor por juego tomado de la salida actual del código (prueba de
  regresión, no de diseño); es una excepción deliberada a P-13.
- **Q5 (resuelta, C3, 2026-10-19). Número de tareas.** Respuesta: no dividir la spec, porque
  son correcciones de una spec ya implementada y no trabajo nuevo (el skill SDD pide
  proponer dividir si salen más de 10 tareas).
