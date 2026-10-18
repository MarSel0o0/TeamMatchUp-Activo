# Plan 005 — Coincidencias en el servidor
Estado: aprobado (2026-10-17), con precondición: las specs 001 a 004 deben estar
implementadas (`backend/` aún no existe) y el plan de la 003 debe confirmar el modelo
`User` que asume la sección 0 antes de empezar T1.
Spec: `specs/005-coincidencias/spec.md` (aprobada el 2026-10-17, con DP5-1 a DP5-15).

**Precondición:** las specs 001, 002, 003 y 004 deben estar aprobadas e implementadas antes
de empezar T1; `backend/` aún no existe (sección 0).
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, sección 2
(coincidencias calculadas en cada petición, no persistidas), RF-16 de la referencia
(`GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=`), RT-02,
RT-03, RT-12, sección 5.1 (`domain/`, `controllers/matches.ts`, `requests/matches.rest`),
5.5 (montaje del router y `withUser` por router) y sección 8 (`unit/` y
`matches.test.ts`), salvo lo que la spec fija de otra forma (sección 9, P5-1).

## 0. Precondiciones y estado real
- `backend/` **no existe** (comprobado el 2026-10-17). Las specs 001, 002 y 003 están en
  borrador sin `plan.md` ni `tasks.md`; la 004 tiene plan y tareas aprobados, sin
  implementar.
- Esta spec solo se implementa cuando 001 a 004 estén implementadas y dejen, como mínimo:
  - De la 001/002 (plan 004, sección 0): `backend/src/app.ts` (exporta `app`,
    `express.json`, `cookieParser`, `errorHandler` con `{ error: string }`, 500 "error
    interno del servidor", `unknownEndpoint`); `withUser` en
    `backend/src/utils/middleware.ts` con los tres 401 y `request.userId` tipado;
    `backend/tests/controllers/test_helper.ts` con `loginAs(user) → { agent, csrfToken }`,
    `usersInDb` y `nonExistingId`; `npm test` y `npm run typecheck`.
  - De la 004 (plan 004 aprobado): `backend/src/models/gameAccount.ts` (`GameAccount`, campo
    `user`, `gameId`, `currentRank.normalized`, `verified`, `toJSON` con `id`, `userId`,
    `simulated: true` y sin `matches` ni `readingNumber`); `withExistingUser` en
    `middleware.ts`; `backend/src/domain/games.ts` (`GameId`, `isGameId`);
    `backend/src/domain/rankScale.ts` (`ladder`, `normalizeStep`); helpers
    `accountsInDb`, `rawAccountsInDb` y `FIXED_NOW`.
- **Lo que se espera de la spec 003** (su `plan.md` no existe todavía): un modelo `User`
  (`backend/src/models/user.ts`) con `username`, `displayName`, `avatarColor`, `bio`,
  `timezone`, `createdAt` (`timestamps: true`), `email`, `passwordHash`,
  `availability: string[]` (bloques `"<día>-<hora>"` validados con
  `/^[0-6]-([0-9]|1[0-9]|2[0-3])$/`, sin repetidos) y `accounts`, tal como la sección 5.4
  de la referencia; y una forma de crear usuarios con contraseña conocida en las pruebas
  (`POST /api/users` de la 002 o un helper de `test_helper.ts`). Si la 003 nombra distinto
  algún campo (en especial `availability`), se ajusta este plan **antes** de empezar.
- Parser de consultas de Express 5: el predeterminado (`"simple"`, `node:querystring`). Un
  parámetro repetido llega como arreglo y `?x=` llega como `''` (lo mismo que asume el
  plan 004, sección 7). Si la 001 configura otro parser, se para y se reporta.
- Si al empezar T1 falta alguno de esos archivos o nombres, el implementer **para** y lo
  reporta: esta spec no los crea (salvo lo que se marca "crear si no existe").
- Ninguna dependencia ni variable de entorno nueva (RNF-4): todo usa `express`,
  `mongoose`, `node:test`, `node:assert` y `supertest`, que ya traen las specs anteriores.
- Ninguna regla de esta spec depende del instante actual: ninguna función recibe "hoy" y
  no se usa `clock` (constitución, principio 3, se cumple porque no hay reloj que leer).

## 1. Archivos y responsabilidades

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `backend/src/domain/matchQuery.ts` | Lectura pura de la consulta: valor de un filtro (ausente, vacío, repetido, texto), número entero válido, juego, solo verificadas, búsqueda, `parseMatchQuery` con el orden de RF-16 y `MATCH_ERRORS` (textos exactos). | RF-5, RF-11, RF-12, RF-14, RF-15, RF-16 (filtros), RF-18, RNF-1 |
| `backend/src/domain/availability.ts` | `parseBlock`, `compareBlocks` e `intersectBlocks` (bloques en común sin repetidos, por día y hora). **Crear si no existe**; si existe (copia del frontend o de la 003), se reemplaza su `intersectBlocks` por la de este plan y se conserva lo demás. | RF-3 (bloques), DP5-9, RNF-1 |
| `backend/src/domain/matching.ts` | Motor puro: `rankDistance`, `scoreCandidate` (exacto), `foldText`, `matchesSearch`, `compareByCodePoint`, `compareCandidates`, `assembleCandidates`, `buildMatches`. **Crear si no existe**; si existe una copia de `frontend/src/domain/matching.ts`, se reemplaza entera (sin `scoreLabel`, que es de la interfaz). | RF-2, RF-3, RF-4, RF-7, RF-8, RF-9, RF-17, DP5-7, DP5-8, DP5-12, RNF-1 |
| `backend/src/services/matchInputs.ts` | Lectura de datos: usuario de la sesión y su disponibilidad, su cuenta en el juego, cuentas del juego de los demás y sus dueños (datos públicos con lista explícita de campos). Devuelve un resultado discriminado; no responde HTTP. | RF-4, RF-6, RF-13, RF-17, DP5-10 |
| `backend/src/controllers/matches.ts` | `matchesRouter`: `router.use(withUser, withExistingUser)` y `GET /`: `parseMatchQuery` → `loadMatchInputs` → `buildMatches` → 200. | RF-1, RF-2, RF-3, RF-6, RF-13, RF-16 |
| `backend/src/app.ts` (modificar) | Monta `matchesRouter` en `/api/matches`, junto a los demás routers (antes del fallback y de `unknownEndpoint`). | RF-1 |
| `backend/requests/matches.rest` | Peticiones manuales: login → coincidencias con y sin filtros, filtro inválido, juego sin cuenta (RT-19). | — |
| `backend/tests/unit/matchQuery.test.ts` | Lectura de filtros y orden de RF-16. | RF-5, RF-11, RF-12, RF-14, RF-15, RF-16, RF-18 |
| `backend/tests/unit/availability.test.ts` (crear o ampliar) | Intersección y orden de bloques. | RF-3, DP5-9 |
| `backend/tests/unit/matching.test.ts` | Distancia, puntaje exhaustivo, búsqueda, filtros, exclusión, orden, armado. | RF-2, RF-4, RF-7, RF-8, RF-9, RF-17, DP5-7, DP5-8 |
| `backend/tests/controllers/matchInputs.test.ts` | Servicio contra la base de prueba. | RF-4, RF-6, RF-13, RF-17, DP5-10 |
| `backend/tests/controllers/matches.test.ts` | Endpoint completo. | RF-1 a RF-9, RF-11 a RF-18, RNF-2, RNF-3 |

## 2. Funciones puras (firmas)
Sin Express, Mongoose, red ni reloj. Tipado con `exactOptionalPropertyTypes` y
`noUncheckedIndexedAccess` (RT-02): todo acceso por índice se comprueba.

```ts
// domain/matchQuery.ts
export const MATCH_ERRORS: {
  game: 'Juego no válido.';
  maxRankDistance: 'Filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100.';
  minSharedHours: 'Filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168.';
  onlyVerified: 'Filtro «Solo cuentas con rango verificado» no válido: usa true o false.';
  search: 'Filtro «Buscar jugador» no válido.';
  noAccount: 'No tienes una cuenta vinculada en este juego.';
};
export type FilterValue =
  | { kind: 'absent' } | { kind: 'empty' } | { kind: 'repeated' }
  | { kind: 'malformed' }                      // ni texto ni arreglo (p. ej. objeto)
  | { kind: 'text'; text: string };
export function readFilterValue(query: Readonly<Record<string, unknown>>, name: string): FilterValue;
export function parseValidInteger(text: string): number | null;   // solo [0-9]+, base 10
export interface MatchCriteria {
  gameId: GameId; maxRankDistance: number; minSharedHours: number;
  onlyVerified: boolean; search: string | null;   // null = no filtra; si no, ya sin espacios en los extremos
}
export type QueryResult = { ok: true; value: MatchCriteria } | { ok: false; status: 400; error: string };
export function parseMatchQuery(query: Readonly<Record<string, unknown>>): QueryResult;

// domain/availability.ts
export function parseBlock(block: string): { day: number; hour: number } | null; // null si no cumple el formato
export function compareBlocks(a: string, b: string): number;       // día asc, luego hora asc
export function intersectBlocks(a: readonly string[], b: readonly string[]): string[];

// domain/matching.ts
export interface RankedAccount { userId: string; currentRank: { normalized: number }; verified: boolean }
export interface CandidateUser { id: string; username: string; displayName: string;
  avatarColor: string; bio: string; timezone: string; createdAt: string }   // sin email (DP5-10)
export interface CandidateInput<A extends RankedAccount> { user: CandidateUser; account: A; blocks: readonly string[] }
export interface MatchCandidate<A extends RankedAccount> { user: CandidateUser; gameId: GameId; account: A;
  rankDistance: number; sharedBlocks: string[]; score: number }
export function rankDistance(a: { normalized: number }, b: { normalized: number }): number;
export function scoreCandidate(distance: number, sharedCount: number): number;
export function foldText(text: string): string;                    // normalize('NFC').toLowerCase()
export function matchesSearch(user: Pick<CandidateUser, 'username' | 'displayName'>, search: string | null): boolean;
export function compareByCodePoint(a: string, b: string): number;
export function compareCandidates<A extends RankedAccount>(x: MatchCandidate<A>, y: MatchCandidate<A>): number;
export function assembleCandidates<A extends RankedAccount>(accounts: readonly A[],
  owners: ReadonlyMap<string, { user: CandidateUser; blocks: readonly string[] }>): CandidateInput<A>[];
export function buildMatches<A extends RankedAccount>(criteria: MatchCriteria, viewer: {
  userId: string; account: RankedAccount; blocks: readonly string[] },
  candidates: readonly CandidateInput<A>[]): MatchCandidate<A>[];
```

El genérico `A` deja que el motor reciba la cuenta ya serializada por el `toJSON` de la
004 (con `simulated`, sin `matches`) y la devuelva intacta en el candidato, sin que
`domain/` conozca Mongoose.

## 3. Algoritmos

### 3.1 Lectura de la consulta (`matchQuery.ts`, RF-5, RF-11 a RF-16, RF-18, DP5-4 a DP5-6, DP5-12, DP5-13)
```
readFilterValue(query, name):
  si !Object.hasOwn(query, name) o query[name] === undefined → absent
  v = query[name]
  si Array.isArray(v)         → repeated          // querystring: dos o más apariciones
  si typeof v !== 'string'    → malformed
  si v === ''                 → empty
  → { text: v }                                    // sin trim: ' 5 ' y ' lol ' son inválidos

parseValidInteger(text) = /^[0-9]+$/.test(text) ? Number(text) : null
  // [0-9] explícito (no \d); en JS `$` sin bandera m solo casa al final.
  // '007' → 7; una cadena de 400 dígitos → Infinity, que queda fuera de rango.

parseMatchQuery(query):                            // primer error y nada más (RF-16)
  g = readFilterValue(query, 'game')
  si g no es text o !isGameId(g.text)              → 400 MATCH_ERRORS.game
  d = readFilterValue(query, 'maxRankDistance')
  maxRankDistance = d absent ? 100 : entero(d) en [0, 100] ?? → 400 MATCH_ERRORS.maxRankDistance
  h = readFilterValue(query, 'minSharedHours')
  minSharedHours  = h absent ? 0   : entero(h) en [0, 168] ?? → 400 MATCH_ERRORS.minSharedHours
  v = readFilterValue(query, 'onlyVerified')
  onlyVerified = v absent ? false : v.text === 'true' ? true : v.text === 'false' ? false
                 : → 400 MATCH_ERRORS.onlyVerified  // empty/repeated/malformed también
  s = readFilterValue(query, 'search')
  si s es repeated o malformed                     → 400 MATCH_ERRORS.search
  search = (s absent o empty o s.text.trim() === '') ? null : s.text.trim()
  → ok { gameId, maxRankDistance, minSharedHours, onlyVerified, search }
  // cualquier otra clave de query se ignora (RF-18)
```
`isGameId` es el de `backend/src/domain/games.ts` (004): compara exacto contra `lol`, `r6`
y `cs2`; el valor `__proto__` u otros nombres de propiedades no deben pasar: si su
implementación es `value in GAMES`, `parseMatchQuery` usa `Object.hasOwn(GAMES, value)`
(la prueba lo fija con `game=constructor` y `game=__proto__` → 400).
`trim()` quita espacios en blanco Unicode (incluidos tabulador y espacio no separable), que
es lo que se entiende por "espacios" en RF-9 y DP5-12.

### 3.2 Bloques en común (`availability.ts`, DP5-9)
```
parseBlock(b) = /^([0-6])-([0-9]|1[0-9]|2[0-3])$/ → { day, hour } | null
compareBlocks(a, b) = (pa.day − pb.day) || (pa.hour − pb.hour)
intersectBlocks(a, b):
  setB = Set(b filtrado a bloques válidos)
  comunes = Set(x ∈ a | parseBlock(x) ≠ null y x ∈ setB)   // sin repetidos
  return [...comunes].sort(compareBlocks)
```
Ejemplo de orden: `["6-0", "0-23", "0-5", "2-20"]` ∩ lo mismo → `["0-5", "0-23", "2-20",
"6-0"]` (numérico: `0-5` antes que `0-23`). Un texto que no es bloque no cuenta (el
esquema de la 003 ya lo impide; la regla pura no lo supone).

### 3.3 Distancia y puntaje exactos (`matching.ts`, DP5-7)
```
rankDistance(a, b) = |a.normalized − b.normalized|        // currentRank.normalized guardado (DP-26)

scoreCandidate(d, b):                                      // d entero 0..100, b entero ≥ 0
  R  = máx(0, 100 − 4·d)                                    // entero
  // 0,55·R + 0,45·H con H = mín(100, 12,5·b); todo por 40 para trabajar en enteros:
  N  = 22·R + mín(1800, 225·b)                              // = 40 × valor exacto
  return (N + 20 − ((N + 20) % 40)) / 40                    // redondeo con mitades hacia arriba
```
Ejemplos que fijan las pruebas: (0, 4) → N = 3100 → 78; (0, 8) → 100; (0, 168) → 100;
(25, 0) → 0; (0, 0) → 55; (24, 0) → R = 4, N = 88 → 2; (1, 1) → R = 96, N = 2337 → 58
(58,425); (2, 3) → R = 92, N = 2699 → 67 (67,475).
Todos los valores son enteros pequeños: no interviene la coma flotante.

### 3.4 Búsqueda (RF-9, DP5-12)
```
foldText(t)          = t.normalize('NFC').toLowerCase()
matchesSearch(u, s)  = s === null || foldText(u.displayName).includes(foldText(s))
                                  || foldText(u.username).includes(foldText(s))
```
`includes` no interpreta metacaracteres (`.*`, `(`, `[` son texto). `toLowerCase` (no
`toLocaleLowerCase`) aplica la tabla Unicode sin depender del idioma del servidor: `ÑANDÚ`
→ `ñandú`. Los acentos se conservan (`nandu` no coincide). `NFC` hace que una `á` escrita
como `a` + acento combinado se compare como `á` y no contenga una `a` suelta.

### 3.5 Exclusión, filtros, orden y armado (RF-2, RF-4, RF-7, RF-8, RF-17, DP5-8, DP5-11)
```
assembleCandidates(accounts, owners):                       // RF-17
  para cada a en accounts: o = owners.get(a.userId); si no existe → se omite
  → { user: o.user, account: a, blocks: o.blocks }

buildMatches(criteria, viewer, candidates):
  candidates
    .filter(c → c.account.userId ≠ viewer.userId)           // RF-4 (además del $ne de la consulta)
    .map(c → { user: c.user, gameId: criteria.gameId, account: c.account,
               rankDistance: d = rankDistance(viewer.account.currentRank, c.account.currentRank),
               sharedBlocks: s = intersectBlocks(viewer.blocks, c.blocks),
               score: scoreCandidate(d, s.length) })
    .filter(m → m.rankDistance ≤ criteria.maxRankDistance)       // RF-7
    .filter(m → m.sharedBlocks.length ≥ criteria.minSharedHours) // RF-7
    .filter(m → !criteria.onlyVerified || m.account.verified)    // RF-8
    .filter(m → matchesSearch(m.user, criteria.search))          // RF-9
    .sort(compareCandidates)

compareCandidates(x, y) = (y.score − x.score)
                       || (x.rankDistance − y.rankDistance)
                       || (y.sharedBlocks.length − x.sharedBlocks.length)
                       || compareByCodePoint(x.user.username, y.user.username)

compareByCodePoint(a, b):                                   // código Unicode, no unidad UTF-16
  recorrer a y b con codePointAt avanzando 1 o 2 unidades; primer código distinto decide;
  si uno es prefijo del otro, va primero el más corto
```
`compareByCodePoint` evita la diferencia entre `<` de JavaScript (unidades UTF-16) y el
código Unicode para caracteres fuera del plano básico; la prueba lo fija con `"～"`
antes que `"\u{1F600}"` (con `<` saldría al revés). Los nombres de usuario son únicos
(spec 002), así que el orden es total.

## 4. Lectura de datos (`services/matchInputs.ts`)

```ts
export type MatchInputs =
  | { kind: 'noSession' }                                    // usuario de la sesión ya no existe → 401
  | { kind: 'noAccount' }                                    // RF-6 → 404
  | { kind: 'ok'; viewer: { userId: string; account: GameAccountJson; blocks: string[] };
      candidates: CandidateInput<GameAccountJson>[] };
export async function loadMatchInputs(userId: string, gameId: GameId): Promise<MatchInputs>;
```
`GameAccountJson` es el tipo de lo que devuelve `account.toJSON()` de la 004 (si la 004 no
lo exporta, se declara aquí con sus campos: `id`, `userId`, `gameId`, `handle`, `region`,
`currentRank`, `rankHistory`, `lastSyncedAt`, `verified`, `simulated: true`).

```
loadMatchInputs(userId, gameId):
  viewer = await User.findById(userId).select('availability').lean()
  si viewer es null                       → noSession       // eliminado tras withExistingUser (RF-13)
  own = await GameAccount.findOne({ user: userId, gameId })
  si own es null                          → noAccount       // RF-6
  docs = await GameAccount.find({ gameId, user: { $ne: userId } })        // RF-4
  ids  = ids únicos de docs.map(d → d.user)
  owners = await User.find({ _id: { $in: ids } })
             .select('username displayName avatarColor bio timezone createdAt availability')
             .lean()                                          // nunca email ni passwordHash
  mapa = Map(String(o._id) → { user: toCandidateUser(o), blocks: o.availability ?? [] })
  → ok { viewer: { userId, account: own.toJSON(), blocks: viewer.availability ?? [] },
         candidates: assembleCandidates(docs.map(d → d.toJSON()), mapa) }   // RF-17

toCandidateUser(o) = { id: String(o._id), username, displayName, avatarColor, bio,
                       timezone, createdAt: o.createdAt.toISOString() }  // lista explícita (DP5-10)
```
Son cuatro consultas por petición, sin límite de tamaño (DP5-14). Las cuentas se
serializan con su `toJSON` de la 004 (P5-3), así que llevan `simulated: true` y no llevan
`matches` ni `readingNumber` (RF-3, RF-37 y DP-32 de la 004).

## 5. Interfaz REST

`GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=`
(nombres de parámetro de RF-16 de la referencia y de `frontend/src/services/http/httpApi.ts`).

```
matchesRouter.use(withUser, withExistingUser)                     // 401 de RF-1 y RF-13
matchesRouter.get('/', async (request, response) => {
  q = parseMatchQuery(request.query)                               // 400 en orden RF-16
  si !q.ok → response.status(400).json({ error: q.error })
  inputs = await loadMatchInputs(request.userId, q.value.gameId)
  noSession → 401 { error: 'sesión no iniciada' }
  noAccount → 404 { error: MATCH_ERRORS.noAccount }
  ok → 200 buildMatches(q.value, inputs.viewer, inputs.candidates)
})
```
Orden resultante (RF-16): `withUser` (sin credencial / alterada / sin CSRF / expirada) →
`withExistingUser` (usuario eliminado) → juego → diferencia máxima → horas → verificadas →
búsqueda → usuario todavía existe → cuenta propia (404). La sesión es lo único que lee
datos antes de validar los filtros (DP5-1). Sin `try/catch`: Express 5 envía los rechazos
al `errorHandler` (RT-03).

Forma de cada elemento de la respuesta (RNF-2):
```
{ user: { id, username, displayName, avatarColor, bio, timezone, createdAt },
  gameId, account: { id, userId, gameId, handle, region, currentRank, rankHistory,
  lastSyncedAt, verified, simulated: true }, rankDistance, sharedBlocks, score }
```

## 6. Textos exactos (DP5-2, DP5-3; spec 004, DP-6)

| Código | Texto | Cuándo |
| --- | --- | --- |
| 401 | `sesión no iniciada` | sin credencial (spec 002, RF-10) o usuario de la sesión eliminado (RF-13) |
| 401 | `token inválido` | credencial alterada o sin comprobante anti-CSRF válido (spec 002, RF-11) |
| 401 | `sesión expirada` | credencial expirada (spec 002, RF-12) |
| 400 | `Juego no válido.` | RF-5 |
| 400 | `Filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100.` | RF-12, `maxRankDistance` |
| 400 | `Filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168.` | RF-12, `minSharedHours` |
| 400 | `Filtro «Solo cuentas con rango verificado» no válido: usa true o false.` | RF-14, `onlyVerified` |
| 400 | `Filtro «Buscar jugador» no válido.` | RF-15, `search` repetido |
| 404 | `No tienes una cuenta vinculada en este juego.` | RF-6 |
| 500 | `error interno del servidor` | `errorHandler` de la spec 001 |

Las comillas `«` `»` son parte del texto (U+00AB y U+00BB). Ningún texto nombra a Riot,
Ubisoft, Valve ni FACEIT (RNF-3).

## 7. Decisiones técnicas (con la alternativa descartada)

| # | Decisión | Alternativa descartada y motivo |
| --- | --- | --- |
| P5-1 | Validación de la consulta propia (`parseMatchQuery`) sobre `request.query` tal cual, con los cinco estados de `readFilterValue`. | Convertir con `Number()` como sugiere RF-16 de la referencia ("se convierten"): `''` daría 0, `0x10` 16 y `1e1` 10, contra DP5-4. Validar con el esquema de Mongoose: no hay documento que validar. |
| P5-2 | Cuentas y dueños en dos consultas (`find` + `User.find({ _id: { $in } })`) y unión pura `assembleCandidates`. | `populate('user', …)` (RF-16 de la referencia, RT-12): el `toJSON` de la 004 convierte `user` en `userId` con `String(user)`; con `user` poblado saldría `"[object Object]"` o habría que tocar el modelo de la 004. Además la omisión de dueños inexistentes (RF-17) quedaría escondida en un `null` de Mongoose en vez de en una regla probada. |
| P5-3 | La cuenta del candidato es exactamente `account.toJSON()` de la 004. | Construir aquí otra representación: dos formas de la misma cuenta que pueden divergir (RF-3 exige la de la 004 con `simulated` y sin partidas). |
| P5-4 | El usuario del candidato se arma con una lista explícita de siete campos (`toCandidateUser`) y la consulta solo selecciona esos campos más `availability`. | Reutilizar el `toJSON` de `User` de la 003: no conoce la sesión, así que no puede saber si debe quitar el correo (RF-4 de la 003); un cambio en ese `toJSON` podría filtrar el correo de otro (constitución, principio 5). |
| P5-5 | Puntaje en enteros: `N = 22·R + mín(1800, 225·b)` y redondeo `(N + 20 − (N + 20) % 40) / 40`. | `Math.round(0.55·R + 0.45·H)` del frontend: depende de la coma flotante (DP5-7). Librería de decimales: dependencia nueva (RNF-4). |
| P5-6 | Distancia con `currentRank.normalized` guardado, que la 004 calcula con `normalizeStep` (DP-26). | Recalcular con `normalizeRank(tier, division)`: duplica una regla que la 004 ya aplicó al guardar y, si difiriera, la distancia no cuadraría con el normalizado que muestra la cuenta. |
| P5-7 | Búsqueda con `normalize('NFC')` + `toLowerCase()` + `includes`. | `RegExp` con bandera `i`: los metacaracteres tendrían significado (DP5-12). `toLocaleLowerCase`/`localeCompare`: dependen del idioma del servidor. `localeCompare` con `sensitivity: 'accent'`: igual de válido, pero depende de ICU y no da "contiene". Sin `NFC`: una `á` descompuesta contendría una `a` (contra RF-9). |
| P5-8 | Desempate final con `compareByCodePoint` propio. | Operador `<`: compara unidades UTF-16 y difiere del código Unicode fuera del plano básico. `localeCompare`: orden lingüístico, no por código. |
| P5-9 | Exclusión del usuario de la sesión en la consulta (`$ne`) **y** en `buildMatches`. | Solo en la consulta: RNF-1 pide que la exclusión sea una regla pura probada aparte. Solo en el motor: trae datos innecesarios. |
| P5-10 | Bloques en común ordenados en la regla pura (`intersectBlocks` ordena). | Ordenar en el controlador: la regla del orden quedaría sin prueba unitaria (RNF-1). Conservar el orden de la disponibilidad (frontend actual): la 003 la define como conjunto (DP5-9). |
| P5-11 | `withExistingUser` de la 004 para RF-13 y, además, `noSession` si el usuario desaparece entre ese middleware y la lectura de su disponibilidad. | Solo el middleware: un borrado intercalado daría 404 de RF-6 en vez del 401 de RF-13. |
| P5-12 | Ruta `GET /api/matches` en un router propio con `withUser` y `withExistingUser` por router (sección 5.5 de la referencia). | Ruta bajo `/api/users/me/matches`: cambia la URL que consume `httpApi.ts`. |

## 8. Estrategia de pruebas
- `node --test` vía `npm test` (`NODE_ENV=test`, `--test-concurrency=1`), `node:assert` con
  `strictEqual` / `deepStrictEqual`, `supertest.agent` con cabecera CSRF y la base de
  prueba de la 001. `after(() => mongoose.connection.close())` en cada archivo de
  `controllers/`. Ningún `.only`.
- **Unitarias** (sin base ni reloj):
  - `matchQuery.test.ts`: cada filtro ausente, vacío, repetido, no numérico, decimales,
    signo (`+5`, `-0`, `-1`), espacios (` 5 `), exponente (`1e1`), prefijo (`0x10`),
    `Infinity`, 400 dígitos, extremos (0, 100, 168, `007`) y fuera de rango (101, 169);
    juego ausente, `LOL`, ` lol `, vacío, repetido, `constructor`, `__proto__`; solo
    verificadas `true`, `false`, ausente, `TRUE`, `1`, `abc`, vacío, repetido; búsqueda
    ausente, vacía, `'   '`, repetida (`['a','b']` y `['','']`), con espacios en los
    extremos (queda recortada); valor `malformed` (objeto) en cada filtro; parámetros
    desconocidos ignorados; orden RF-16 con un caso por salto (juego + distancia
    inválidos → juego; distancia + horas → distancia; horas + verificadas → horas;
    verificadas + búsqueda → verificadas). Cada error con el texto exacto de la sección 6.
  - `availability.test.ts`: sin traslape, traslape parcial, listas vacías, repetidos en
    la entrada, entradas desordenadas → salida por día y hora (`0-5` antes que `0-23`),
    texto que no es bloque ignorado.
  - `matching.test.ts`: `scoreCandidate` con los ejemplos de 3.3 y **recorrido exhaustivo**
    d = 0..100 × b = 0..168 comparado con un cálculo de referencia en `BigInt` derivado de
    otra forma (`num = 440·R + 45·mín(800, 100·b)`, `den = 800`, resultado
    `(2·num + den) / (2·den)` entero), y que todo resultado está en 0..100; `rankDistance`
    simétrica y dos cuentas del mismo escalón con distintos puntos → 0 (cuentas armadas con
    `normalizeStep` de la 004); búsqueda literal (`a.b`, `.*`, `(`, `[`), `ÑANDÚ` encuentra
    `Ñandú`, `nandu` no, `a` no encuentra `á` (también en forma NFD), `null` no filtra;
    filtros en el límite (igual al máximo / igual al mínimo se conserva); solo verificadas;
    exclusión del propio usuario aunque venga en la entrada; `compareCandidates` con cada
    nivel de desempate (puntaje, distancia, bloques, nombre) y `compareByCodePoint` con
    `"～"` < `"\u{1F600}"`, prefijo más corto primero; `assembleCandidates` omite
    cuentas sin dueño en el mapa; `buildMatches` devuelve `gameId` del criterio y la
    cuenta intacta (misma referencia de objeto).
- **Servicio contra la base** (`matchInputs.test.ts`): usuario sin cuenta → `noAccount`;
  usuario borrado → `noSession`; la propia cuenta no está entre los candidatos; cuenta con
  `user = nonExistingId()` omitida; dueños sin `email` ni `passwordHash` en
  `CandidateUser` (claves exactas); cuentas con `simulated: true` y sin `matches`.
- **Endpoint** (`matches.test.ts`): datos armados en `beforeEach` creando usuarios (vía la
  002/003), su `availability` con `User.updateOne` y sus cuentas con
  `GameAccount.create` y fotografías construidas con `ladder`/`normalizeStep` de la 004
  (rangos y verificada elegidos por la prueba, no por el simulador). Los valores
  esperados de distancia y puntaje se escriben a mano (tabla de 3.3) antes del código.
- Cada RF de error se comprueba con el código y el texto exacto; las respuestas 200, con
  `deepStrictEqual` sobre el orden y las claves.
- Las pruebas no abren red salvo la base de prueba de la 001 y no necesitan variables
  nuevas.

## 9. Qué prevalece sobre la referencia
- RF-16 de la referencia: "los parámetros … se convierten" se sustituye por la validación
  estricta de DP5-4 a DP5-6 y DP5-12 (P5-1); `populate` se sustituye por dos consultas
  (P5-2); el criterio de puntaje es el de `matching.ts` del frontend pero calculado en
  enteros (P5-5); la búsqueda distingue acentos y es literal (DP5-12).
- Sección 5.1 de la referencia ("`domain/` es una copia de `frontend/src/domain/`"): el
  motor del backend deja de ser copia idéntica del frontend (orden de bloques, desempate,
  redondeo exacto, normalización DP-26). La spec 007 adapta el frontend.
- Sección 8 de la referencia (`matches.test.ts`, "Sin cuenta en el juego: 404"): se
  conserva, con el orden de RF-16 (un filtro inválido gana al 404).

## 10. Trazabilidad

| RF / RNF | Implementación | Prueba |
| --- | --- | --- |
| RF-1 | `withUser` en `matchesRouter` | `matches.test.ts` "sin credencial / credencial alterada / sin CSRF / expirada → 401 con su texto" |
| RF-2 | `buildMatches`, `compareCandidates`, `compareByCodePoint` | `matching.test.ts` (cada desempate); `matches.test.ts` "orden" |
| RF-3 | `buildMatches`, `toCandidateUser`, `account.toJSON()`, `intersectBlocks` | `matches.test.ts` "forma exacta del candidato" (sin `email` ni hash, con `gameId`, `simulated`, sin `matches`) |
| RF-4 | `$ne` en `loadMatchInputs` + filtro en `buildMatches` | `matching.test.ts`; `matchInputs.test.ts`; `matches.test.ts` "no aparezco" |
| RF-5 | `parseMatchQuery` (juego) | `matchQuery.test.ts`; `matches.test.ts` (`LOL`, ` lol `, vacío, repetido, ausente) |
| RF-6 | `noAccount` → 404 | `matchInputs.test.ts`; `matches.test.ts` "sin cuenta en el juego" |
| RF-7 | filtros de distancia y horas | `matching.test.ts` (límites); `matches.test.ts` |
| RF-8 | filtro de verificadas | `matching.test.ts`; `matches.test.ts` en `lol`, `r6` y `cs2` |
| RF-9 | `foldText`, `matchesSearch` | `matching.test.ts`; `matches.test.ts` (`ÑANDÚ`, `.*`) |
| RF-11 | valores por defecto en `parseMatchQuery` | `matchQuery.test.ts`; `matches.test.ts` "sin filtros = distancia 100, horas 0" |
| RF-12 | `parseValidInteger` + rangos | `matchQuery.test.ts`; `matches.test.ts` (texto exacto de cada filtro) |
| RF-13 | `withExistingUser` + `noSession` | `matches.test.ts` "credencial de usuario eliminado → 401 sesión no iniciada"; `matchInputs.test.ts` |
| RF-14 | `onlyVerified` en `parseMatchQuery` | `matchQuery.test.ts`; `matches.test.ts` |
| RF-15 | `search` repetido | `matchQuery.test.ts`; `matches.test.ts` |
| RF-16 | orden de `parseMatchQuery` + controlador | `matchQuery.test.ts` (un caso por salto); `matches.test.ts` "sin cuenta + horas 169 → 400"; "juego inválido + distancia abc → juego" |
| RF-17 | `assembleCandidates` | `matching.test.ts`; `matchInputs.test.ts`; `matches.test.ts` "cuenta sin dueño omitida, 200" |
| RF-18 | `parseMatchQuery` solo lee cinco claves | `matchQuery.test.ts`; `matches.test.ts` (`page=2`, `user=<id>`) |
| RNF-1 | `domain/matchQuery.ts`, `availability.ts`, `matching.ts` puros | unitarias sin base ni reloj; T8 revisa que `domain/` no importa `express`, `mongoose` ni lee `Date` |
| RNF-2 | `toCandidateUser`, `toJSON` de la 004 | `matches.test.ts` claves exactas del candidato, del usuario y de la cuenta |
| RNF-3 | textos de la sección 6 | `matches.test.ts` "ninguna respuesta menciona Riot/Ubisoft/Valve/FACEIT" |
| RNF-4 | sin `npm install` | T8: `git diff backend/package.json backend/.env.example` sin cambios |
| R6 (caso límite) | sin rama por juego en el motor | `matches.test.ts` "R6 con distancia, filtro y puntaje como LoL y CS2" |
| DP-26 (criterio) | `rankDistance` sobre `normalized` | `matching.test.ts` y `matches.test.ts` "mismo escalón, distintos puntos → 0" |

## 11. Riesgos
- Specs 001 a 004 sin implementar y la 003 sin plan: los nombres asumidos (`availability`,
  `createdAt`, `withExistingUser`, `loginAs`, `toJSON` de `GameAccount`) pueden cambiar;
  se revisa este plan antes de T1 (sección 0).
- Intervalo de carrera aceptado: si el usuario de la sesión se borra después de
  `withExistingUser`, `noSession` lo cubre; si se borra entre la lectura de su
  disponibilidad y la de su cuenta, la cascada de la 004 puede dar 404 en lugar de 401.
  Es el mismo tipo de intervalo transitorio aceptado en la 004 (P-12) y no deja datos
  incoherentes.
- Sin límite de tamaño (DP5-14): cuatro consultas y O(n) en memoria por petición; válido
  para una demostración.
- La normalización y el criterio del frontend difieren del backend hasta que la 007 los
  adopte (decisión del usuario del 2026-10-17).
- Los mensajes citan rótulos de la interfaz: si la 007 cambia un rótulo sin cambiar antes
  esta spec, los mensajes quedan desalineados ("Impacto en otras specs" de la spec).
