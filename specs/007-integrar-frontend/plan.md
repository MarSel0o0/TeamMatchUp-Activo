# Plan 007 — Conectar la interfaz al servidor real
Estado: borrador (2026-10-18), pendiente de aprobación del usuario.
Spec: `specs/007-integrar-frontend/spec.md` (aprobada el 2026-10-18, con las decisiones R19 y R20).

**Precondición para la validación final (T29):** las specs 004, 005 y 006 deben estar
implementadas en `backend/` (a 2026-10-18 `backend/src/app.ts` solo monta `/api/users`,
`/api/auth` y `/api/accounts`; faltan `/api/matches` y `/api/sessions`, y la 004 va por T8b).
T1 a T28 se pueden hacer antes: se comprueban contra el modo simulado, `typecheck`, `lint` y
`build`. Si al empezar una tarea algo que este plan toma del backend no existe, el
implementer **para y lo reporta**; esta spec no cambia el servidor.
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, sección 6 puntos 1 a 3
y 5 a 8 (y del punto 4 solo lo que devuelven el inicio de sesión y el registro), salvo todo
lo que la spec 004 revocó (fuentes reales, claves, Steam).

## 0. Estado real (comprobado el 2026-10-18 en `frontend/src` y `backend/src`)
Discrepancias entre la interfaz del Hito 1 y el servidor, que este plan resuelve:

| Hoy en la interfaz | El servidor (specs 001 a 006) | Pieza que lo resuelve |
| --- | --- | --- |
| `httpClient.ts` guarda el JWT en `localStorage` (`tmu.token`) y lo envía en `Authorization: Bearer`; `mockApi.ts` guarda `mock.<id>` en la misma clave | JWT solo en cookie `HttpOnly` `token` (`SameSite=Strict`, 1 h) más comprobante `X-CSRF-Token` en la respuesta del login y en toda petición | T3, T4, T5, T6 |
| `login` y `register` devuelven `{ token, user }` y `register` abre sesión | `POST /api/auth/login` → 200 con el usuario (sin token en el cuerpo) y cabecera `X-CSRF-Token`; `POST /api/users` → 201 con el usuario y **sin** sesión | T5, T7 |
| El cliente lee el error en `message` | El cuerpo de error es `{ error: string }` | T4 |
| Rutas `/profile`, `/profile/accounts`, `/profile/availability`, `/profile/games/:id` | `/api/users/me` (PATCH), `/api/accounts?user=me`, `/api/users/me/availability` (PUT con `{ blocks }`), `/api/users/me/games/:gameId` | T5 |
| `VITE_API_URL` vacío activa el modo simulado | Debe ser al revés (RF-1) | T2 |
| `GameAccount` sin marca de datos simulados; `candidate.user` con correo; `RankSnapshot.points` opcional | Cuenta con `simulated: true`; candidato sin correo; `points` entero siempre | T5, T14 |
| `normalizeRank` en `domain/games.ts` usa `tiers.length × divisiones` (LoL 40 escalones, no 31) y `matching.ts` usa otro puntaje | DP-26 y DP-34 de la 004 (LoL 31, CS2 7, R6 36) y puntaje exacto de la 005 | T14 (RNF-6) |
| `game.source` ("Riot Games API", "Steam Web API", "r6.tracker.network"), "Verificado", "Volver a leer el rango", "Releemos el rango de forma periódica", "Leemos tu nivel desde la fuente… cuando cambia", "Demo" y `env.useMockApi` condicionando el aviso global | RF-11, RF-15, RF-16, RF-26 | T19 a T23 |
| `ProtectedRoute` muestra "Restaurando tu sesión…" y cualquier fallo de `me()` es "sin sesión" | RF-5: "Cargando…", pantalla de error con "Reintentar", 30 s | T7, T9, T10 |
| `MatchesPage` navega a la agenda con `{ gameId, withUser, suggestedBlock }` y la agenda lo limpia con `window.history.replaceState` | RF-29 y RF-30 | T24 a T26 |
| `queryClient`: `staleTime` 60 s, 2 reintentos, y un comentario que dice que "el backend refresca el rango de forma periódica" | RF-20 (30 s por petición, sin repetir por detrás) y RF-26 | T8 |
| `seed.ts` usa los nombres y usuarios del equipo (`vicho`, `Vicente Oliva`…) | RF-27 | T18 |

Lo que ya sirve y no se toca: `vite.config.ts` (proxy de `/api` hacia `VITE_PROXY_TARGET`,
por defecto `http://localhost:3000`; comprobar en T2 que coincide con el `PORT` de
`backend/.env.example`), `ApiError`, el manejo de 204, `AppRouter` con vistas diferidas,
`Failure`/`Blank`/`Working`/`SheetSkeleton`, los componentes `notice`, `btn`, `stamp` y los
tokens de `styles/tokens.css`.

Ninguna dependencia ni variable de entorno secreta nueva (RNF-5). Una sola variable nueva
no secreta: `VITE_USE_MOCK_API`. Sin cambios en el backend ni en `vite.config.ts`.

## 1. Archivos y responsabilidades
Rutas bajo `frontend/src/`. "Nuevo" = se crea; "mod." = se modifica.

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `config/env.ts` (mod.) | `apiUrl` = `VITE_API_URL` sin espacios o `/api` si falta o está vacía; `useMockApi` = `VITE_USE_MOCK_API` sin espacios es exactamente `true`; `STORAGE_KEYS` (`csrf`, `sessionSignal`, `mockDb`, `theme`; desaparece `token`). | RF-1, RF-2 |
| `config/mockFlag.ts` (nuevo) | `isMockEnabled(raw)`: función sin imports, para poder ejecutarla con Node en la comprobación. | RF-1 |
| `frontend/.env.example` (mod., fuera de `src/`) | Plantilla versionada: `VITE_API_URL=/api`, `VITE_USE_MOCK_API=false`, `VITE_PROXY_TARGET`, `VITE_MOCK_LATENCY`; sin secretos. | RF-13, RNF-5 |
| `shared/utils/copy.ts` (nuevo) | Todas las cadenas literales que fija la spec (una sola fuente, buscables): `SIMULATED_LABEL` («Datos de demostración»), `NO_MESSAGE_TEXT`, `LOADING_TEXT` («Cargando…»), `SENDING_TEXT` («Enviando…»), avisos de login, texto de `Resincronizar`, texto de relectura, motivos de bloqueo de "Proponer". | RF-4, RF-5, RF-7, RF-9, RF-11, RF-18, RF-20, RF-22, RF-24, RF-26, RF-29 |
| `services/http/csrfStorage.ts` (nuevo) | Único módulo que toca la clave del comprobante: `readCsrf()`, `saveCsrf()`, `clearCsrfIfOwn()`, comprobante de esta pestaña, respaldo en memoria si el almacenamiento falla. | RF-2, RF-3, RF-19 |
| `services/http/sessionEvents.ts` (nuevo) | Bus mínimo sin React: `onUnauthorized(handler)` / `emitUnauthorized(epoch)`. Lo emite el transporte; lo atiende `AuthProvider`. | RF-7 |
| `services/http/transport.ts` (nuevo) | `execute(run, opts)`: plazo de 30 s, registro de peticiones en vuelo, época de sesión del cliente, descarte de respuestas tardías, clasificación de errores, 401 → `emitUnauthorized`. `abortAllRequests()` (limpiar sesión). Lo usan el cliente HTTP y el backend simulado. | RF-5, RF-7, RF-9, RF-20, definiciones |
| `services/http/errorBody.ts` (nuevo) | `readErrorMessage(text)`: devuelve el texto del campo `error` o `null` (error sin mensaje). Sin imports (verificable con Node). | RF-9, definición de error con/sin mensaje |
| `services/http/httpClient.ts` (mod.) | `request()` sobre `execute`: `fetch` same-origin con cookies, `Accept`/`Content-Type`, cabecera del comprobante, sin `Authorization`; `ApiError` con `hasMessage`; `SessionClearedError`. | RF-2, RF-3, RF-9, RF-20, RNF-1 |
| `services/http/httpApi.ts` (mod.) | Implementa `ApiContract` con las rutas reales (sección 4); guarda el comprobante tras el login; `me()` devuelve `null` solo con 401. | RF-2, RF-3, RF-5, RNF-1 |
| `services/apiContract.ts` (mod.) | `login`/`register` devuelven `User`; sin token; tipos de cuenta y candidato nuevos. Sigue siendo el único contrato. | RNF-1, RF-2 |
| `services/api.ts` (mod.) | Elige la implementación con `env.useMockApi` (misma línea, otra condición); reexporta `ApiError` y `isSessionCleared`. | RF-1 |
| `services/mock/mockApi.ts` (mod.) | Servidor en memoria: cada operación devuelve una respuesta cruda (estado + cuerpo) que pasa por el mismo `execute`; sesión sin credencial; errores con los códigos y textos de las specs 002 a 006. | RF-10, RF-19, RF-21 |
| `services/mock/simulatedProvider.ts` (nuevo) | Proveedor simulado determinista del modo simulado: verificada por identificador, escalón por lectura, puntos dentro de la banda, 1 a 8 partidas. | RF-21, RNF-6 |
| `services/mock/seed.ts` (mod.) | Datos precargados con nombres ficticios, cuentas verificadas y no verificadas en cada juego, `simulated: true`. Cambia la clave de la base simulada a `tmu.mock-db.v3`. | RF-21, RF-27 |
| `domain/rankScale.ts` (nuevo) | Copia del criterio de `backend/src/domain/rankScale.ts`: `ladder`, `stepIndexOf`, `normalizeRank`, `normalizeStep`, `pointsBand`. Mismos nombres y firmas que el backend. | RNF-6, RF-12, RF-21 |
| `domain/games.ts` (mod.) | Quita `source` y la `normalizeRank` propia (reexporta la de `rankScale.ts`); conserva nombres, patrones de identificador y regiones; `formatRank`. | RF-15, RNF-6 |
| `domain/availability.ts` (mod.) | `parseBlock` devuelve `null` si no es bloque válido; `compareBlocks`; `intersectBlocks` como la 005 (sin repetidos, ordenado). | RNF-6, RF-29 |
| `domain/matching.ts` (mod.) | Copia del criterio de `backend/src/domain/matching.ts`: `rankDistance`, `scoreCandidate(distance, sharedCount)` exacto, `foldText`, `matchesSearch`, `compareCandidates`, `buildMatches`. La usa el backend simulado. | RNF-6, RF-10 |
| `domain/rankProgress.ts` (nuevo) | `rankGainSinceFirst(account)`: diferencia normalizada entre la lectura vigente y la primera del historial. | RF-14 |
| `domain/proposal.ts` (nuevo) | Reglas puras de "Proponer": series de bloques, primer bloque proponible, duración, título, motivo de bloqueo. Compartida con la ficha (spec 008). | RF-29, RF-30 |
| `domain/types.ts` (mod.) | `GameAccount.simulated`, `PublicUser` (sin correo), `MatchCandidate.user: PublicUser`, `SessionStatus = 'open' \| 'full'`, `RankSnapshot.points` obligatorio; desaparece `AuthSession`. | RF-10, RF-11, RF-14 |
| `features/auth/AuthContext.ts` (mod.) | Valor del contexto: `status` (`checking` \| `error` \| `anonymous` \| `authenticated`), `user`, `sessionError`, `retry`, `login`, `register`, `logout`, `setUser`. | RF-5 |
| `features/auth/AuthProvider.tsx` (mod.) | Consulta de sesión (30 s, sin pasar por TanStack), limpiar la sesión del cliente, login, registro con inicio de sesión (RF-4), cierre, manejo del 401 (RF-7), integración entre pestañas. Es el único que navega por una regla de sesión. | RF-3 a RF-9, RF-24, RF-33 |
| `features/auth/crossTabSession.ts` (nuevo) | Aviso entre pestañas: escribe y vigila `STORAGE_KEYS.sessionSignal`. Sin React. | RF-24, RF-3 |
| `features/auth/useSessionUserId.ts` (nuevo) | Identificador del usuario de la sesión para las claves de consulta y para `enabled`. | RF-5, HU-3 |
| `app/SessionGate.tsx` (nuevo) | Envuelve al router: "Cargando…" o pantalla de error con "Reintentar" en lugar de cualquier ruta mientras la consulta de sesión no resuelve. | RF-5, RF-28, RNF-7 |
| `app/ProtectedRoute.tsx` (mod.) | `ProtectedRoute` (sin sesión → login con ruta de origen, `replace`, sin aviso); `PublicOnlyRoute` (con sesión → Inicio). | RF-25, RF-33 |
| `app/routes.ts` (mod.) | `isProtectedPath(pathname)` puro (lista de rutas protegidas). | RF-7, RF-24, RF-25 |
| `app/App.tsx` (mod.) | Coloca `SessionGate` alrededor de `AppRouter`. | RF-5 |
| `app/providers/queryClient.ts` (mod.) | Sin reintentos, `staleTime: 0`, sin refresco al enfocar ni al reconectar; comentario corregido. | RF-20, RF-26 |
| `app/providers/queryKeys.ts` (mod.) | Todas las claves llevan el id del usuario de la sesión. | HU-3 |
| `features/*/hooks.ts` (mod.) | Las consultas usan `enabled: userId !== null` y las claves por usuario. | RF-5, HU-3 |
| `features/auth/pages/LoginPage.tsx`, `RegisterPage.tsx` (mod.) | Avisos fijos, correo precargado, ruta de origen, registro → Inicio, "Enviando…", pista de la cuenta demo solo en modo simulado. | RF-4, RF-7, RF-8, RF-11, RF-20, RF-24, RNF-7 |
| `shared/components/States.tsx` (mod.) | `Failure` admite `title`, `autoFocusRetry` y `role="alert"`; `Working` se reutiliza tal cual. | RF-5, RNF-7 |
| `shared/components/MutationNotice.tsx` (nuevo) | Muestra el error de una escritura con `role="alert"`; no muestra nada si el error es `SessionClearedError`. | RF-9, RF-20 |
| `shared/components/DemoTag.tsx` (nuevo) | Etiqueta de datos simulados («Datos de demostración»), con clases y tokens existentes. | RF-11, RF-15 |
| `app/layouts/AppLayout.tsx`, `app/pages/LandingPage.tsx`, `app/layouts/AuthLayout.tsx` (mod.) | Aviso global siempre visible (barra y pie), pie de la entrada, textos sin fuentes ni relectura automática, cierre de sesión con "Enviando…". | RF-11, RF-15, RF-20, RF-22, RF-26 |
| `features/profile/**`, `features/matches/**`, `features/sessions/**`, `features/home/**` (mod.) | Presentación de la etiqueta, "Verificada", "Resincronizar", "Última lectura", R6 con rango, filtros habilitados, "Proponer", errores de escritura. | RF-9 a RF-12, RF-14 a RF-16, RF-18, RF-20, RF-23, RF-26, RF-29 a RF-32 |
| `specs/007-integrar-frontend/validation.md` y `validation/` (nuevos) | Registro de validación y capturas (línea base y posteriores). | RNF-4, RNF-6, RNF-8, criterios |

## 2. Funciones puras (firmas)
Ninguna importa React, `fetch` ni lee el reloj. En esta spec ninguna regla depende de la
hora actual, así que ninguna recibe "hoy"; el único que usa un instante es el proveedor
simulado del modo simulado, que lo recibe como parámetro (`now: Date`).

```ts
// config/mockFlag.ts (sin imports)
export function isMockEnabled(raw: string | undefined): boolean;   // raw?.trim() === 'true'

// services/http/errorBody.ts (sin imports)
export function readErrorMessage(bodyText: string): string | null;
//   JSON con campo `error` de tipo texto no vacío → ese texto; cualquier otra cosa → null

// app/routes.ts
export function isProtectedPath(pathname: string): boolean;        // inicio, perfil, configuración, coincidencias, agenda

// domain/rankScale.ts (misma forma que backend/src/domain/rankScale.ts)
export interface RankStep { tier: string; division?: string }
export function ladder(gameId: GameId): readonly RankStep[];        // LoL 31, CS2 7, R6 36
export function stepIndexOf(gameId: GameId, tier: string, division?: string): number | null;
export function normalizeStep(gameId: GameId, stepIndex: number): number;  // Math.round(paso*100/(tamaño-1))
export function normalizeRank(gameId: GameId, tier: string, division?: string): number;
export function pointsBand(gameId: GameId, stepIndex: number): { min: number; max: number | null };

// domain/matching.ts (misma forma que backend/src/domain/matching.ts)
export function rankDistance(a: { normalized: number }, b: { normalized: number }): number;
export function scoreCandidate(distance: number, sharedCount: number): number;   // enteros, sin coma flotante

// domain/rankProgress.ts
export function rankGainSinceFirst(account: { currentRank: { normalized: number };
  rankHistory: readonly { normalized: number }[] }): number | null;  // null si no hay historial

// domain/availability.ts
export function parseBlock(block: string): { day: WeekDay; hour: number } | null;
export function compareBlocks(a: string, b: string): number;        // día asc, hora asc
export function intersectBlocks(a: readonly string[], b: readonly string[]): string[];

// domain/proposal.ts
export type BlockReason = 'noOwnHours' | 'noTheirHours' | 'noCommon' | 'outsideAgenda';
export interface BlockRun { day: WeekDay; startHour: number; endHour: number }   // endHour = última hora incluida
export interface Proposal { gameId: GameId; day: WeekDay; startHour: number; durationHours: number;
  title: string; slots: number; notes: string }
export const PROPOSAL_DEFAULTS: { slots: 5; notes: '' };           // los del formulario actual
export function sharedRuns(shared: readonly string[]): BlockRun[];   // series del mismo día, sin cruzar de día
export function blockReason(mine: readonly string[], theirs: readonly string[]): BlockReason | null;
export function proposalTitle(displayName: string): string;          // `Sesión con ${displayName}`
export function buildProposal(input: { gameId: GameId; displayName: string;
  mine: readonly string[]; theirs: readonly string[] }): Proposal | null;   // null si hay motivo

// services/mock/simulatedProvider.ts
export function canonicalHandle(handle: string): string;             // trim + toLowerCase
export function isVerifiedHandle(canonical: string): boolean;        // suma de charCodes par
export function readAccountState(input: { gameId: GameId; canonicalHandle: string;
  readingNumber: number; now: Date }): SimulatedReading;
```

`PROPOSAL_DEFAULTS` y `GRID_HOURS` (horario de la agenda, ya en `availability.ts`) son las
únicas fuentes de esos valores: el formulario de la agenda y la ficha de jugador (spec 008)
los importan, no los repiten (constitución, principio 3).

## 3. Diseño técnico

### 3.1 Variables de entorno (RF-1, RF-13)
```
VITE_USE_MOCK_API  (nueva)  modo simulado solo si, tras trim, vale exactamente `true`
VITE_API_URL                dirección base del servidor; por defecto `/api` (proxy de Vite)
VITE_PROXY_TARGET           solo desarrollo (vite.config.ts)
VITE_MOCK_LATENCY           latencia artificial del modo simulado
```
`env.ts`: `useMockApi = isMockEnabled(import.meta.env.VITE_USE_MOCK_API)`; `apiUrl =
(import.meta.env.VITE_API_URL ?? '').trim() || '/api'`. Se evalúa una vez al arrancar
(construir o `npm run dev`), nunca cambia en caliente. `TRUE`, `1`, vacío y ausente dejan el
servidor real. Un valor ` true ` solo llega con espacios por el entorno del proceso o con
comillas en `.env` (Vite recorta los valores sin comillas), por eso la comprobación usa los
dos caminos (sección 5).

### 3.2 Comprobante anti-CSRF y almacenamiento (RF-2, RF-3, RF-19)
- Clave del comprobante: `tmu.csrf` (sustituye a `tmu.token`). Es el único valor de sesión
  que la interfaz guarda; la credencial nunca pasa por el código de la página (cookie
  `HttpOnly`).
- `csrfStorage.ts`:
  ```
  let tabCsrf: string | null = null      // "comprobante de esta pestaña"
  let memoryCsrf: string | null = null   // solo si el almacenamiento falla
  readCsrf(): valor = localStorage.getItem(clave) (try/catch → memoryCsrf);
              si valor !== null → tabCsrf = valor; return valor
  saveCsrf(v): tabCsrf = v; memoryCsrf = v; try localStorage.setItem(clave, v) catch {}
  clearCsrfIfOwn(): si tabCsrf === null → nada;
              si readStored() === tabCsrf → try removeItem catch {}; memoryCsrf = null; tabCsrf = null
              si no (otra pestaña lo reemplazó o borró) → tabCsrf = null, sin tocar el almacenamiento
  ```
  `readCsrf()` se llama al enviar cada petición (también las públicas), de modo que
  `tabCsrf` es "el último que esta pestaña guardó o leyó para enviarlo".
- Comprobante en la petición: cabecera `X-CSRF-Token` en todas las peticiones, públicas o
  protegidas, siempre que haya uno. El cierre de sesión lo envía si lo hay.
- Comprobante de la respuesta del login: se lee de la cabecera `X-CSRF-Token` (misma
  origen, legible) y se guarda **antes** de emitir el aviso entre pestañas. Si el login
  responde 200 sin esa cabecera, se trata como error sin mensaje (la cookie quedaría sin
  comprobante utilizable).
- Sin almacenamiento (modo privado o bloqueado): `saveCsrf` conserva el valor en memoria y
  la sesión funciona hasta recargar; al recargar `readCsrf()` devuelve `null`, la consulta
  de sesión sale 401 y queda sin sesión (RF-5). `crossTabSession` detecta que no puede
  escribir y no vigila (RF-3, RF-24).
- El borrado "solo si es el de esta pestaña" compara y borra en dos pasos no atómicos entre
  pestañas; no hay API de bloqueo estándar en todos los navegadores objetivo. La ventana de
  carrera es de milisegundos y la consecuencia es un 401 en la otra pestaña, que ya es un
  caso aceptado de la spec (dos inicios casi simultáneos).

### 3.3 Transporte, plazo y errores (RF-5, RF-7, RF-9, RF-20)
```
execute<T>(run, { protectedCall, signal? }):          // run(signal) → { status, body, headers? } ya leído
  epoch0 = epoch                                       // época de la sesión del cliente
  controller = new AbortController(); enVuelo.add(controller)
  timer = setTimeout(() => { vencida = true; controller.abort() }, 30_000)
  signal?.addEventListener('abort', () => controller.abort())
  try   raw = await run(controller.signal)             // el plazo cubre también la lectura del cuerpo
  catch si epoch0 ≠ epoch → throw SessionClearedError
        si signal?.aborted (cancelación de TanStack) → rethrow tal cual
        throw ApiError(NO_MESSAGE_TEXT, status 0, hasMessage false)   // red, plazo, interrupción
  finally clearTimeout(timer); enVuelo.delete(controller)
  si epoch0 ≠ epoch → throw SessionClearedError        // respuesta tardía tras limpiar la sesión
  si raw.status === 401:
        si protectedCall → emitUnauthorized(epoch0)    // RF-7
        throw ApiError(mensaje o 'sesión no iniciada', 401, hasMessage true)   // nunca "sin mensaje"
  si raw.status 2xx → return raw.body (204 → undefined; cuerpo ilegible → error sin mensaje)
  msg = readErrorMessage(raw.text) ; throw ApiError(msg ?? NO_MESSAGE_TEXT, status, msg !== null)
abortAllRequests(): epoch++ ; enVuelo.forEach(c => c.abort()) ; enVuelo.clear()
```
- Un 401 que llega después de vencer el plazo no existe: la petición se abortó y `run`
  lanzó antes de leer el estado (RF-20, caso "401 tardío").
- Clasificación (definiciones de la spec): con mensaje = cuerpo JSON con `error` texto no
  vacío; sin mensaje = fallo de red, plazo, interrupción, cuerpo que no es JSON (HTML o
  texto del proxy de Vite con el servidor apagado), JSON sin `error` o con `error` que no es
  texto, y 4xx/5xx con cuerpo vacío. El 401 sale siempre por su código.
- 401 del login: `request('/auth/login', { protectedCall: false })` lanza `ApiError` con
  estado 401; si el cuerpo no trae mensaje legible, el mensaje es el de la spec 002, RF-9
  ("Correo o contraseña incorrectos."), porque un 401 nunca es "sin mensaje" (decisión del
  plan, ver sección 9).
- Operaciones con `protectedCall: false` (no disparan RF-7): login, registro (`POST
  /api/users`), cierre de sesión y consulta de sesión. Todas las demás son protegidas.
- `credentials: 'same-origin'`: la cookie viaja solo al mismo origen (desarrollo con proxy y
  producción servida por el servidor, spec 010). Un servidor en otro origen es la spec 010.
- El backend simulado devuelve la misma `raw` (estado y cuerpo) y pasa por el mismo
  `execute`: así el plazo, el descarte, la clasificación y el 401 son idénticos en los dos
  modos y no hay dos caminos de error.
- `SessionClearedError`: error propio que nadie muestra. `MutationNotice`, `Failure` y los
  `catch` de formularios la ignoran con `isSessionCleared(error)`.

### 3.4 Estado de sesión y `AuthProvider` (RF-3 a RF-9, RF-33)
Estados: `checking` → (`authenticated` | `anonymous` | `error`). `user` solo existe en
`authenticated` (P16: mientras la consulta no responde no hay usuario de la sesión).
```
al montar y en retry():  status = 'checking'; token de intento (ignora respuestas de intentos viejos)
  user = await api.auth.me()                      // transporte con plazo de 30 s, fuera de TanStack
  200  → user, status = 'authenticated'
  null (401) → clearClientSession({ deleteCsrf: true }); status = 'anonymous'   // sin RF-7, sin error
  ApiError (sin mensaje, plazo, 5xx, 400, 403, 404, 429…) → status = 'error', sessionError = message
login(credentials, redirectTo):
  user = await api.auth.login(...)                // guarda el comprobante antes de volver
  queryClient.clear(); setUser(user); status = 'authenticated'
  crossTab.announce('login')                      // después de guardar el comprobante
  navigate(redirectTo, { replace: true })         // en el mismo lote: PublicOnlyRoute nunca ve "con sesión" en /login
register(payload):                                // RF-4
  await api.auth.register(payload)                // errores → el formulario (RF-9)
  try { login(payload.email, payload.password, ROUTES.home) }                  // sin ruta de origen
  catch (cualquiera, incluida 401 o con mensaje) { navigate(login, replace, state: { email, notice: 'registered' }) }
logout():                                         // RF-6
  try { await api.auth.logout() } catch {}        // espera respuesta o los 30 s
  clearClientSession({ deleteCsrf: true }); crossTab.announce('logout')
  navigate(ROUTES.login, { replace: true })       // sin aviso
clearClientSession({ deleteCsrf }):               // definición de la spec
  abortAllRequests()                              // epoch++ y aborta lo que vuela
  queryClient.cancelQueries(); queryClient.clear()
  setUser(null); si deleteCsrf → clearCsrfIfOwn()
onUnauthorized(epoch):                            // RF-7 (viene del transporte)
  si epoch ≠ epochActual → ignorar                // otro 401 ya limpió: un solo aviso, una sola entrada
  origen = location.pathname si isProtectedPath(...) (sin parámetros)
  si hay usuario → clearClientSession({ deleteCsrf: true }); navigate(login, { replace: true,
        state: { from: origen, notice: 'expired' } })
  si no hay usuario → navigate(login, { replace: true, state: { from: origen } })   // RF-25, sin aviso
```
- `location` y `navigate` se leen de refs actualizadas en cada render (el manejador del 401
  vive fuera de React).
- `useUpdateProfile` sigue usando `setUser`.
- StrictMode ejecuta el efecto dos veces en desarrollo: el token de intento y el
  `AbortController` de la consulta evitan que la primera respuesta (abortada) se trate como
  fallo.
- Ruta de origen: solo `pathname`. Si la ruta actual no es protegida no se guarda origen.

### 3.5 Rutas, pantalla de espera y de error (RF-5, RF-25, RF-28, RF-33)
- `SessionGate` (sobre `AppRouter`): `checking` → `<Working label="Cargando…" />` en un
  contenedor de página completa; `error` → `Failure` con `title` "No se pudo comprobar tu
  sesión", el mensaje de `sessionError`, `autoFocusRetry` y `role="alert"`; "Reintentar"
  llama a `retry()` (sin límite, vuelve a "Cargando…"). Reemplaza a cualquier ruta
  (pública, protegida, entrada, "no encontrada"), porque el router ni se monta. Mientras
  tanto no hay ninguna petición protegida: las vistas protegidas no están montadas y los
  hooks tienen `enabled: userId !== null`.
- `ProtectedRoute`: sin usuario → `<Navigate to=login replace state={{ from: pathname }} />`
  sin `notice`. `PublicOnlyRoute` (entrada, login y registro): con usuario → Inicio con
  `replace` (RF-33). La entrada con sesión sigue yendo a Inicio como hoy (supuesto, sección
  9). La ruta `*` queda fuera de ambas: "no encontrada" con o sin sesión (RF-28).
- "Llevar a una ruta por una regla de sesión" = siempre `navigate(..., { replace: true })` o
  `<Navigate replace>`. El historial nunca suma más de una entrada de login por regla.
- `isProtectedPath` es la lista `ROUTES.home, profile, settings, matches, schedule` (las
  specs 008 y 009 añaden las suyas).

### 3.6 Avisos de login y registro (RF-4, RF-7, RF-8, RF-24, RNF-7)
- Estado de navegación a login: `{ from?: string; email?: string; notice?: 'expired' |
  'otherTab' | 'registered' }`. Textos fijos en `copy.ts`: «Tu sesión expiró. Vuelve a
  entrar.», «Se cerró o cambió la sesión en otra pestaña.», «Tu cuenta se creó; inicia
  sesión».
- `LoginPage`: lee `from`, `email` y `notice`; precarga el correo; muestra el aviso en un
  `<p className="notice notice--pen" role="alert">`; al entrar, `login(creds, from ?? ROUTES.home)`.
  Pasar a registro es un `Link` sin estado (descarta `from`).
- `RegisterPage`: usa `register(payload)` del proveedor (que decide RF-4); tras éxito llega a
  Inicio (hoy va a Configuración).
- Anuncio a lectores de pantalla (RNF-7): `role="alert"` anuncia al insertarse el elemento;
  los avisos de login se montan en el primer render de la página, por lo que se verifica en
  el árbol de accesibilidad (sección 5). Si un navegador no anuncia un `alert` presente al
  cargar, el aviso se inserta en un efecto tras el montaje.
- El aviso permanece al recargar login (el estado vive en la entrada del historial); es
  inocuo y no está en la spec.

### 3.7 Cambio de sesión en otra pestaña (RF-24, RF-3)
- Señal propia, distinta del comprobante: clave `tmu.session-signal` con valor `<kind>:<id
  único>` (`kind` = `login` o `logout`). Solo la escriben el login correcto y el cierre de
  sesión. Las limpiezas por RF-5 y RF-7 **no** la escriben (D2) y no usan el comprobante
  como señal, porque ese sí cambia con ellas.
  ```
  announce(kind): valor = `${kind}:${idÚnico}`; try localStorage.setItem(clave, valor); lastSeen = valor
                  (si lanza → almacenamiento no disponible → watching = false)
  startWatching(onChange):
    lastSeen = read()                        // línea base al cargar la pestaña
    check() = { v = read(); si v !== null y v !== lastSeen → lastSeen = v; onChange() }
    escuchas: evento `storage` (clave de la señal) → check
              setInterval(check, 2000)
              `visibilitychange` (a visible), `focus` y `pageshow` → check inmediato
  ```
- Cumple "como máximo 5 s": con la pestaña en primer plano, el evento `storage` llega al
  instante y el intervalo de 2 s es la red de seguridad; en segundo plano el navegador
  limita los temporizadores (hasta 1 por minuto) y el evento puede no entregarse, pero al
  volver a ser visible `visibilitychange` ejecuta `check()` en el acto (≤ 5 s con holgura).
  Con tres o más pestañas todas vigilan la misma clave.
- Reacción de la pestaña (`onChange`):
  - hay usuario y la ruta actual es protegida → `clearClientSession({ deleteCsrf: false })`
    y `navigate(login, { replace: true, state: { from, notice: 'otherTab' } })`;
  - hay usuario pero está en ruta pública → solo `clearClientSession({ deleteCsrf: false })`;
  - estado `error` o sin usuario → solo `abortAllRequests()` y limpieza de caché, sin aviso
    ("Reintentar" sigue aplicando RF-5).
  `deleteCsrf: false` siempre (D1): el comprobante nuevo que escribió la otra pestaña no se
  toca.
- Orden de escritura en el login: comprobante primero, señal después. En el cierre: borrar
  el comprobante propio primero (si sigue siendo el de la pestaña), señal después.
- No se usa `BroadcastChannel`: la spec dice que sin almacenamiento disponible no hay aviso
  entre pestañas (RF-3), y un segundo canal contradiría esa regla.

### 3.8 TanStack Query (RF-5, RF-20, HU-3)
- `queryClient`: `retry: false`, `staleTime: 0`, `refetchOnWindowFocus: false`,
  `refetchOnReconnect: false`. Reintentar un plazo de 30 s multiplicaría la espera (hasta
  90 s) y repetir lecturas "por detrás" choca con RF-20/D12; los componentes `Failure`
  ya ofrecen "Reintentar". `staleTime: 0` porque los datos (cuentas de otros, coincidencias,
  sesiones) son compartidos entre jugadores; además la agenda necesita las cuentas del
  usuario recién leídas para RF-30 (caso "desvinculó en otra pestaña").
- Claves: `['u', userId, ...resto]`. Un usuario nuevo nunca ve la memoria del anterior,
  aunque quedara una consulta colgada. `useSessionUserId()` devuelve el id o `null`;
  `enabled: userId !== null` evita la carrera entre `queryClient.clear()` y el desmontaje
  de las vistas (los observadores montados volverían a pedir datos con la sesión ya
  limpia).
- Las mutaciones solo invalidan en `onSuccess` (como hoy): un plazo vencido no provoca
  lecturas por detrás (D12).
- La consulta de sesión no usa TanStack: es una promesa en `AuthProvider` para que el plazo
  sea exactamente de 30 s y no haya reintentos.

### 3.9 Backend simulado (RF-10, RF-19, RF-21, RF-27)
- Forma: cada operación del mock construye una respuesta cruda `{ status, body }` y la
  entrega a `execute` (misma clasificación y descarte que el cliente HTTP). Una función
  interna `fail(status, error)` produce el cuerpo `{ error }`.
- Sesión sin credencial (RF-19): la base simulada guarda un único registro `session:
  { userId, csrf } | null`. Representa a la vez la cookie del navegador y la sesión del
  servidor: **una por navegador**, como la real (iniciar sesión en una pestaña sustituye la
  de las demás; cerrar sesión la borra). La interfaz no lo lee jamás: solo lo usa el
  módulo mock. Lo único que la interfaz guarda de la sesión es el comprobante
  (`csrfStorage`), igual que con el servidor real.
  ```
  autorizar(csrfEnviado): si session === null → 401 'sesión no iniciada'
                          si csrfEnviado ausente o ≠ session.csrf → 401 'token inválido'
                          si el usuario ya no existe → 401 'sesión no iniciada'
  login: valida credenciales (400 si faltan/inválidas, 401 'Correo o contraseña incorrectos.')
         session = { userId, csrf: nuevo }; la respuesta lleva el comprobante (equivale a la cabecera)
  logout: session = null (siempre 200); me: autorizar → 200 usuario propio
  ```
  Un comprobante de una construcción anterior (o del otro modo) deja de identificar nada:
  la consulta de sesión del modo actual decide (RF-19).
- Semántica del servidor (RF-10), con los textos de cada spec: duplicado de correo o de
  usuario 400 (002); registrar no abre sesión (002); identificador inválido 400 con el
  mensaje de la 004; segunda cuenta en el juego 400 "Ya tienes una cuenta vinculada en este
  juego."; cuenta ajena 403 y cuenta inexistente 404 "Cuenta no encontrada."; ninguna
  respuesta 409 en cuentas (R6 se vincula y resincroniza como los demás); candidatos sin
  correo; salir de una sesión sin estar inscrito 409 "No estás inscrito en esta sesión.";
  perfil con las validaciones de la 003 (nombre vacío o de solo espacios, de más de 40,
  biografía de más de 200, zona no IANA y color sin `#RRGGBB` → 400 sin guardar); 401 con
  "sesión no iniciada".
- Proveedor simulado (RF-21, `simulatedProvider.ts`): `isVerifiedHandle` = suma de los
  `charCodeAt` del identificador canónico par (regla de la 004, sección 4.4; da los mismos
  resultados para los ejemplos `jugador1#las`, `jugador2`, `76561190000000001`…); escalón
  inicial pseudoaleatorio (generador con semilla a partir de `juego|identificador|lectura`)
  repartido por toda la escala; cada resincronización mueve el escalón −1, 0 o +1 y añade
  una partida nueva; puntos dentro de `pointsBand`; 1 a 8 partidas por lectura; toda cuenta
  con `simulated: true`. Los valores exactos no tienen que coincidir con el servidor.
- Datos precargados (`seed.ts`): nombres ficticios sin ninguna palabra de los integrantes ni
  los usuarios `vicho`, `cotito`, `dayala`, `sebav`, `benjae`, `marzam` (RF-27); cuenta demo
  `demo@teammatchup.gg` con cuentas verificadas y no verificadas en cada juego (R6 con
  rango); `simulated: true` en todas. La clave de la base simulada pasa a `tmu.mock-db.v3`
  para descartar bases viejas con el esquema anterior.
- `resetMockDatabase()` sigue sin borrar el comprobante de la interfaz de forma silenciosa:
  borra la base simulada (que hace de servidor) y la sesión simulada.

### 3.10 Etiqueta de datos simulados, textos y seguridad (RF-11, RF-15, RF-16, RF-22, RF-26, RNF-2)
- `SIMULATED_LABEL = 'Datos de demostración'` es el único texto de la marca. No hay segundo
  texto en ningún modo (R19). `DemoTag` lo muestra; se coloca junto a:
  rango vigente, historial, partidas y sello de verificada (perfil, Configuración) cuando
  `account.simulated`; y junto a "Δ n pts" y al puntaje de cada candidato cuya cuenta lo
  trae (coincidencias). En el lugar de la fila "Fuente" va la etiqueta (RF-15).
- Aviso global: barra de navegación y pie de `AppLayout`, y pie de la página de entrada,
  siempre (ya no dependen de `env.useMockApi`). La pista de la cuenta demo de `LoginPage`
  sigue condicionada a `env.useMockApi` (RF-11).
- Se elimina `source` de `GameDefinition`. Las etiquetas "Riot ID", "Ubisoft ID" y
  "SteamID64" siguen (`handleLabel`).
- "Verificada" siempre referida a la cuenta ("Verificada" / "Sin verificar"); el filtro se
  rotula "Solo cuentas verificadas". Ningún texto dice "rango verificado" ni "verificado".
- "Resincronizar" (antes "Volver a leer el rango") y el texto "Al resincronizar, tu rango
  puede cambiar un escalón y pueden llegar partidas nuevas." junto al botón de toda cuenta
  propia. Textos de relectura en Configuración, entrada y pantalla de acceso:
  `El rango se vuelve a leer al pulsar "Resincronizar".`
- Perfil: la diferencia "▲ +<n> pts desde la primera lectura" sale de `rankGainSinceFirst`
  (no de `trend`); sin tendencia. "Última lectura" = `lastSyncedAt`. El historial se
  muestra en el orden que entrega el servidor y su último elemento no se toma como el rango
  vigente.
- Defensivo (RF-14): sin rango vigente o sin tasa de victorias → "Sin datos" y ningún valor
  derivado.
- RNF-2: nada se inserta como HTML; no se usa `dangerouslySetInnerHTML` (búsqueda en T23).

### 3.11 "Proponer" y la agenda (RF-29, RF-30)
```
sharedRuns(shared): agrupa por día los bloques válidos de `shared`; una serie = horas seguidas
                    del mismo día (23 y 0 del día siguiente son dos series); ordena días 0..6 y horas 0..23
blockReason(mine, theirs):
  si mine vacío → 'noOwnHours'; si theirs vacío → 'noTheirHours'
  shared = intersectBlocks(mine, theirs); si vacío → 'noCommon'
  si ningún bloque de shared tiene hora en GRID_HOURS → 'outsideAgenda'; si no → null
buildProposal({ gameId, displayName, mine, theirs }):
  si blockReason ≠ null → null
  primero = primer bloque de shared (orden día asc, hora asc literal) con hora en GRID_HOURS
  serie = serie de sharedRuns que contiene a `primero`
  durationHours = clamp(serie.endHour − primero.hour + 1, 1, 4)
  → { gameId, day: primero.day, startHour: primero.hour, durationHours,
      title: proposalTitle(displayName), ...PROPOSAL_DEFAULTS }
```
Casos de la spec que fijan la comprobación: martes 20, 21, 22 y jueves 3 → martes 20:00, 3 h;
solo jueves 3 → `outsideAgenda`; serie 10 a 13 → 12:00, 2 h; serie 10 a 15 → 12:00, 4 h; serie
0 a 2 → 00:00, 3 h; domingo 23 + lunes 0 → lunes 00:00, 1 h; nombre de 40 caracteres → título
de 51.
- Navegación: `MatchesPage` calcula `blockReason`/`buildProposal` con las horas del usuario de
  la sesión (`useAvailability`, ya cargadas) y las del candidato. El candidato de la 005 solo
  trae `sharedBlocks` (el cruce), que no distingue "Este jugador no ha marcado horas" de
  "No tienen horas en común"; por eso la fila pide la disponibilidad del candidato con la
  operación `profile.getAvailabilityOf(userId)` (`GET /api/users/:id/availability`, spec 003,
  RF-12), una consulta por fila visible, solo al montar la fila. Es el supuesto del plan
  mientras el usuario no decida otra cosa (riesgo R-6 y pregunta 1 de la sección 9).
  Con propuesta → `navigate(ROUTES.schedule, { state: { proposal } })`. Con motivo → botón
  `Proponer` con `aria-disabled="true"` (sigue recibiendo foco), motivo en un elemento
  enlazado con `aria-describedby` y visible junto al botón.
- Doble pulsación: una referencia `proposing` impide una segunda navegación.
- Agenda (RF-30): lee `location.state.proposal` una sola vez.
  ```
  si hay propuesta:
    esperar mientras accountsQuery.isFetching o isPending      // nunca abrir con la lista de juegos vacía
    si accountsQuery.isError → mostrar el error (RF-9), descartar la propuesta
    si no tiene cuenta en proposal.gameId → descartar (agenda como si se abriera directo)
    si la tiene → abrir SessionDraftSlip con los campos de la propuesta
    en los tres casos → navigate(pathname, { replace: true, state: null })   // la entrada queda sin propuesta
  ```
  `useAccounts` refresca al montar (`staleTime: 0`), así que "desvincular LoL en otra
  pestaña" se ve antes de abrir. Un 401 mientras espera aplica RF-7 y la propuesta se pierde
  (la ruta de origen guarda solo la ruta). `SessionDraftSlip` recibe también `durationHours`
  (hoy fijo en 2) y `slots`/`notes` por defecto de `PROPOSAL_DEFAULTS`.

### 3.12 Copia del dominio y tabla de casos (RNF-6)
`frontend/src/domain/{rankScale,matching}.ts` repiten la forma y las firmas de
`backend/src/domain/{rankScale,matching}.ts`. Si divergen, manda la del servidor. Tabla de
casos que se ejecuta contra las dos copias (resultado y método al registro de validación):

| Juego | Entrada | Esperado |
| --- | --- | --- |
| LoL | Iron IV | 0 |
| LoL | Diamond I | 90 |
| LoL | Master | 93 |
| LoL | Grandmaster | 97 |
| LoL | Challenger | 100 |
| CS2 | Grey | 0 |
| CS2 | Light Blue | 17 |
| CS2 | Purple | 50 |
| CS2 | Gold | 100 |
| R6 | Copper V | 0 |
| R6 | Diamond I | 97 |
| R6 | Champion | 100 |
| puntaje | (distancia 0, 4 horas en común) | 78 |
| puntaje | (0, 8) | 100 |
| puntaje | (25, 0) | 0 |
| puntaje | (0, 0), (24, 0), (1, 1), (2, 3) | 55, 2, 58, 67 (de la 005, sección 3.3) |

## 4. Mapa del contrato `ApiContract` → servidor
Las operaciones de las specs 008 y 009 (usuario ajeno, disponibilidad ajena, detalle de
sesión) quedan fuera.

| Operación del contrato | Petición | Éxito | Notas |
| --- | --- | --- | --- |
| `auth.login(credentials)` | `POST /api/auth/login` | 200 `User` + cabecera `X-CSRF-Token` | pública; guarda el comprobante |
| `auth.register(payload)` | `POST /api/users` | 201 `User` | pública; no abre sesión (RF-4 inicia sesión después) |
| `auth.me()` | `GET /api/auth/me` | 200 `User`; 401 → `null` | cualquier otro fallo lanza |
| `auth.logout()` | `POST /api/auth/logout` | 200 | pública, no exige comprobante |
| `profile.updateProfile(p)` | `PATCH /api/users/me` | 200 `User` | `displayName`, `bio`, `timezone`, `avatarColor` (el color no tiene control en la interfaz) |
| `profile.getAccounts()` | `GET /api/accounts?user=me` | 200 `GameAccount[]` | |
| `profile.linkAccount(p)` | `POST /api/accounts` | 201 `GameAccount` | `{ gameId, handle, region }` |
| `profile.unlinkAccount(id)` | `DELETE /api/accounts/:id` | 204 | |
| `profile.syncAccount(id)` | `POST /api/accounts/:id/sync` | 200 `GameAccount` | |
| `profile.getAvailability()` | `GET /api/users/me/availability` | 200 `string[]` | |
| `profile.saveAvailability(b)` | `PUT /api/users/me/availability` | 200 `string[]` | cuerpo `{ blocks }` |
| `profile.getGameSummary(g)` | `GET /api/users/me/games/:gameId` | 200 `{ account, recentMatches, winRate, trend }` | `trend` no se usa en pantalla |
| `profile.getAvailabilityOf(userId)` (nueva, supuesto de R-6) | `GET /api/users/:id/availability` | 200 `string[]` | solo la usa "Proponer"; la spec 008 la reutiliza |
| `matches.list(f)` | `GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=` | 200 `MatchCandidate[]` | candidato sin correo |
| `sessions.list(g)` | `GET /api/sessions?game=` | 200 `PlaySession[]` | |
| `sessions.create(p)` | `POST /api/sessions` | 201 `PlaySession` | |
| `sessions.join(id)` / `leave(id)` | `POST /api/sessions/:id/join` / `leave` | 200 `PlaySession` | |
| `sessions.cancel(id)` | `DELETE /api/sessions/:id` | 204 | |

Todas las peticiones salvo las tres públicas (login, registro, cierre) y la consulta de sesión
son protegidas (401 → RF-7). Los filtros de coincidencias que ya son los valores por
defecto del servidor no se omiten: la interfaz envía siempre los cuatro.

## 5. Estrategia de verificación
El frontend no tiene runner de prueba (RNF-3, constitución, principio 4): cada tarea se cierra
con `cd frontend && npm run typecheck && npm run lint && npm run build` en verde, más la
comprobación propia de la tarea. No se versionan pruebas del frontend (están fuera de
alcance); las comprobaciones con Node son scripts desechables en el scratchpad, cuyo texto y
resultado se pegan en `validation.md`.

- **Comprobaciones con Node (sin runner, sin versionar).** Node ≥ 22.18 ejecuta `.ts`
  directo, pero los archivos de `domain/` importan sin extensión (deuda registrada en
  `MEMORY.md`), así que no se pueden cargar tal cual. Dos caminos:
  - Archivos sin imports (`mockFlag.ts`, `errorBody.ts`): `node --input-type=module -e
    "import('/ruta/frontend/src/config/mockFlag.ts').then(m => ...)"` con una tabla de
    entradas (`'true'`, `' true '`, `'TRUE'`, `'1'`, `''`, `undefined`).
  - Archivos de `domain/` (RNF-6 y RF-29): script en el scratchpad con un gancho de
    resolución (`module.register`) que añade `.ts` a los imports relativos, y otro para el
    alias `@/`. Lee `backend/src/domain/rankScale.ts` y `matching.ts` y los de `frontend/src/domain/`,
    ejecuta la tabla de la sección 3.12 y la de RF-29 (sección 3.11) y imprime una fila por
    caso con las dos copias. `node --test` se puede usar dentro de ese script solo para
    imprimir el resultado; no se guarda en el repositorio.
  - Lo que **no** se puede probar con Node: todo lo que usa React, `fetch`, `localStorage`,
    el historial del navegador, los temporizadores de pestañas y los eventos de
    visibilidad. Eso se comprueba con el recorrido manual.
- **Recorrido manual reproducible** (T29), con servidor real, base vacía, sin Internet y dos
  jugadores A y B, según los "Criterios de finalización". Se apoya en las herramientas del
  navegador: pestaña de red (limitación "3G lenta", latencia personalizada de 40 s,
  bloqueo de URL), pestaña de aplicación (almacenamiento local, cookies), árbol de
  accesibilidad (anuncio de `alert` y foco) y un segundo y tercer perfil de pestañas. El
  servidor se apaga con la tecla de control del proceso. Cada paso se anota con fecha y
  resultado.
- **Líneas base visuales (RNF-4, RNF-8).** T1 toma, antes de cualquier cambio de interfaz,
  una captura por vista a 1280 px y a 360 px de ancho (entrada, login, registro, Inicio,
  perfil, Configuración, coincidencias, agenda y "no encontrada": 9 vistas × 2 anchos) en
  modo simulado con la cuenta demo, con el commit anotado. T28 repite las capturas y las
  compara vista por vista; las diferencias permitidas son solo los textos y elementos que
  exige la spec. A 360 px se comprueba además que no hay desplazamiento horizontal
  (`document.documentElement.scrollWidth <= innerWidth`).
- **Revisión de código** (D1, RNF-2, RNF-5): comprobar que `clearCsrfIfOwn` solo borra si el
  valor guardado es el de la pestaña y que `deleteCsrf: false` es el único argumento de
  RF-24; búsquedas con `grep` listadas en T23.

Verificación por requisito (M = recorrido manual, N = Node, R = revisión de código, C =
typecheck + lint + build):

| RF / RNF | Cómo se verifica | Tareas |
| --- | --- | --- |
| RF-1 | N (tabla de `isMockEnabled`) + M (con `true` aparece la pista de la cuenta demo; con `TRUE` no) | T2 |
| RF-2 | M (almacenamiento y peticiones sin credencial) + R (`grep` de `localStorage`/`Authorization`) | T3, T5, T23 |
| RF-3 | M (comprobante tras login, reemplazo, envío en todas las peticiones, almacenamiento bloqueado) | T3, T5, T7, T29 |
| RF-4 | M (registro con login bloqueado en red) | T7, T11 |
| RF-5 | M (3G lenta, consulta bloqueada 30 s, servidor apagado, foco) | T7, T9 |
| RF-6 | M (cierre con servidor apagado) | T7 |
| RF-7 | M (borrar cookie y guardar; varios 401; una entrada de login) | T4, T7, T10 |
| RF-8 | M (vuelta a Configuración) | T10, T11 |
| RF-9 | N (`readErrorMessage`) + M (servidor apagado, 400 con mensaje) | T4, T13 |
| RF-10 | M (casos provocables) + R (backend simulado frente a cada spec) | T6, T16, T17 |
| RF-11 | M (etiqueta en todos los lugares, ambos modos) | T19 a T22 |
| RF-12 | M (cuenta de R6 con Copper a Champion) | T21 |
| RF-13 | R (plantilla) + M | T2 |
| RF-14 | M (perfil) + R (caso defensivo) | T21, T22 |
| RF-15 | M + `grep` de fuentes | T19, T20, T23 |
| RF-16 | M + `grep` de "verificado" | T20, T22, T23 |
| RF-18 | M (resincronizar varias veces) | T20 |
| RF-19 | M (sin credencial en el modo simulado) | T6 |
| RF-20 | M (latencia de 40 s, doble clic) | T4, T13 |
| RF-21 | M (modo simulado con cuentas verificadas y no) + N (tabla de verificadas) | T15, T16, T18 |
| RF-22 | M (pie de la entrada) | T19 |
| RF-23 | M (filtros habilitados en los tres juegos) | T22 |
| RF-24 | M (dos y tres pestañas, segundo plano) | T12 |
| RF-25 | M (abrir Configuración sin sesión) | T10 |
| RF-26 | M + `grep` | T20, T23 |
| RF-27 | R (`grep` de nombres en `seed.ts`) | T18 |
| RF-28 | M (con y sin sesión, servidor apagado) | T9, T10 |
| RF-29 | N (tabla) + M (coincidencias) | T24, T25 |
| RF-30 | M (recargar, atrás/adelante, 3G lenta, bloqueo, otra pestaña) | T26 |
| RF-31 | M | T20, T21 |
| RF-32 | M | T22 |
| RF-33 | M (login con sesión) | T10 |
| RNF-1 | R (`grep` de `fetch(` fuera de `httpClient`) | T4, T5, T23 |
| RNF-2 | M (`<b>x</b>` como texto) + R (`dangerouslySetInnerHTML`) | T23 |
| RNF-3 | C en cada tarea | todas |
| RNF-4 | capturas T1 y T28 + R | T1, T28 |
| RNF-5 | R (`grep` de la clave de sesión en `dist/`) | T2, T29 |
| RNF-6 | N (tabla en las dos copias) | T14, T27 |
| RNF-7 | M (árbol de accesibilidad, foco) | T9, T11 |
| RNF-8 | M (360 px) | T28 |

## 6. Decisiones justificadas

| Decisión | Alternativa descartada | Por qué |
| --- | --- | --- |
| El modo simulado y el cliente HTTP comparten `execute` y devuelven la misma respuesta cruda | Que el mock lance `ApiError` a mano y el cliente HTTP otro camino | Con dos caminos, el plazo, el 401 y la clasificación de errores divergen entre modos y RF-10 ("responde como el servidor") no se puede comprobar |
| Señal propia `tmu.session-signal` para el aviso entre pestañas | Vigilar el cambio de la clave del comprobante | Las limpiezas por RF-5/RF-7 también borran el comprobante, y D2 exige que otras pestañas no reaccionen a ellas |
| Evento `storage` + intervalo de 2 s + `visibilitychange`/`focus`/`pageshow` | Solo el evento `storage`; o `BroadcastChannel` | `storage` no se entrega a pestañas suspendidas; `BroadcastChannel` funcionaría sin almacenamiento y contradice RF-3 |
| La consulta de sesión es una promesa propia en `AuthProvider` | `useQuery` | Plazo exacto de 30 s sin reintentos ni caché, y control del estado `checking`/`error` |
| `staleTime: 0`, sin reintentos, sin refresco al enfocar | Mantener 60 s y 2 reintentos | Un plazo vencido por 3 intentos tardaría 90 s; los datos de otros jugadores caducan al instante; la agenda necesita cuentas frescas (RF-30) |
| Claves de consulta con el id del usuario y `enabled` | Solo `queryClient.clear()` al cambiar de sesión | `clear()` no impide que observadores montados vuelvan a pedir datos con la sesión limpia; con id en la clave nunca se mezclan cuentas |
| `login(credentials, redirectTo)` navega en el mismo lote que `setUser` | Que la página navegue después del `await` | `PublicOnlyRoute` redirigiría a Inicio y pisaría la ruta de origen según el orden de renderizado |
| `rankGainSinceFirst` desde el historial | Usar `trend` del resumen | `trend` es un valor del servidor con otra semántica en el contrato original (30 días) y no existe en modo simulado de la misma forma; el historial lo tienen los dos modos |
| `PROPOSAL_DEFAULTS` y `GRID_HOURS` como única fuente | Repetir 5 cupos y las horas en cada vista | La ficha (spec 008) usa la misma regla; principio 3 |
| Base simulada `tmu.mock-db.v3` | Migrar la v2 | Cambian cuentas, candidatos y semilla; migrar costaría más que regenerar |
| Un `Failure` con `title`/`autoFocusRetry`/`role="alert"` | Un componente nuevo de pantalla de error | RNF-4 pide reutilizar componentes existentes |
| Sin pruebas versionadas en el frontend; scripts desechables con Node | Añadir runner o `tests/` al frontend | La spec lo deja fuera de alcance y la constitución exige solo build, typecheck y lint |
| `credentials: 'same-origin'` | `include` (como hoy) | La spec deja el origen distinto fuera de alcance; `same-origin` no envía la cookie a terceros |

## 7. Riesgos
- **R-1. Carrera `PublicOnlyRoute` / ruta de origen.** Mitigada con `login(creds,
  redirectTo)` (3.4). Se comprueba en T29 (entrar y volver a Configuración).
- **R-2. Anuncio de `alert` presente al cargar.** Algunos lectores de pantalla no anuncian un
  `role="alert"` ya presente en el primer render. Mitigación en 3.6 (insertar en un
  efecto). Se comprueba en el árbol de accesibilidad y, si hay, con VoiceOver.
- **R-3. Pestañas suspendidas.** El navegador puede retrasar el aviso entre pestañas; el
  requisito se cumple desde que la pestaña vuelve a ser visible, que es lo que mide la spec.
- **R-4. Carrera al borrar el comprobante "solo si es el mío".** Comparar y borrar no es
  atómico entre pestañas; el efecto es un 401 posterior, caso aceptado por la spec.
- **R-5. Backend 004 a 006 sin terminar.** La validación final (T29) depende de ellos y de
  `/api/matches` y `/api/sessions`. T1 a T28 avanzan en modo simulado. Si el servidor
  difiere de las specs (rutas, textos), se para y se reporta; esta spec no lo corrige.
- **R-6. Motivos de bloqueo de "Proponer" con datos que la coincidencia no trae.** Los
  motivos "No has marcado tus horas" y "Este jugador no ha marcado horas" necesitan saber si
  cada disponibilidad está vacía. Con la propia se sabe (ya cargada). Con la del candidato,
  `sharedBlocks` vacío no distingue "no tiene horas" de "no coinciden". El servidor de la 005
  no devuelve las horas del candidato. Opciones sin cambiar el servidor: pedirlas con
  `GET /api/users/:id/availability` (operación de la 003, que ya es de lectura para otros
  usuarios y que usa la spec 008), lo que añade la operación `profile.getAvailabilityOf(userId)`
  al contrato. Se plantea al usuario (sección 9); mientras no responda, T25 usa esa operación,
  porque es la única que cumple el RF-29 sin tocar el servidor.
- **R-7. La spec 008 (borrador) todavía cita el "Mensaje de R6" retirado y su RF-7 repite la
  regla de propuesta.** Este plan implementa la regla por la 007 (RF-29) en `domain/proposal.ts`;
  la 008 deberá importarla, no copiarla. Si la 008 cambia la regla al aprobarse, se revisa
  este plan.
- **R-8. Texto del 401 de login sin cuerpo legible.** La spec lo trata como 401 pero no fija el
  texto de reserva; el plan usa el de la 002 (RF-9). Ver sección 9.
- **R-9. Tamaño del cambio.** 30 tareas en una spec entera (decisión del usuario, R20). El
  riesgo de integración es mayor que con tres specs; se compensa con el orden de las tareas
  (cada una deja `typecheck`, `lint` y `build` en verde) y con una validación por bloque.

## 8. Organización por bloques (R20)
Decisión del usuario (2026-10-18, R20): la spec se mantiene entera y el plan tiene más de 10
tareas; eso prevalece sobre la regla de la skill `sdd` de proponer dividir. `tasks.md`
agrupa las tareas en los tres bloques de "Organización" de la spec, más una tarea previa y un
cierre:

| Bloque | RF | Tareas |
| --- | --- | --- |
| Previo | RNF-4 (línea base) | T1 |
| Sesión y conexión | RF-1 a RF-10, RF-19, RF-20, RF-24, RF-25, RF-28, RF-33 | T2 a T13 |
| Datos simulados y presentación | RF-11 a RF-16, RF-18, RF-21 a RF-23, RF-26, RF-27, RF-31, RF-32 | T14 a T23 |
| Proponer sesión | RF-29, RF-30 | T24 a T26 |
| Cierre y validación | RNF-4, RNF-6, RNF-8, criterios | T27 a T30 |

## 9. Preguntas abiertas para el usuario
Ninguna bloquea T1 a T13. Las decisiones del plan que dependen del usuario:
1. **Horas del candidato en "Proponer" (R-6).** ¿Se acepta añadir al contrato la operación
   `profile.getAvailabilityOf(userId)` (`GET /api/users/:id/availability`, ya existente en la
   003) para distinguir los motivos "Este jugador no ha marcado horas" y "No tienen horas en
   común"? Alternativa: que la 005 devuelva las horas del candidato (cambia la spec 005).
2. **Entrada con sesión.** Hoy la página de entrada con sesión iniciada redirige a Inicio. La
   spec solo fija ese comportamiento para login y registro (RF-33). El plan conserva el
   actual para la entrada (RNF-4). ¿Se mantiene?
3. **"Enviando…" en el cierre de sesión de la barra.** El botón de la barra es un icono sin
   texto. El plan lo deshabilita y cambia su nombre accesible y su información emergente a
   "Enviando…" con el indicador de carga, sin añadir texto visible (RNF-4); el botón del menú
   móvil sí muestra el texto. ¿Es suficiente?
4. **Sesión simulada (RF-19).** El modo simulado guarda un único registro `{ userId, csrf }`
   dentro de su base (hace de servidor y de cookie); la interfaz solo guarda el
   comprobante. ¿Se acepta esa lectura de RF-19?
5. **Texto de reserva del 401 en login** ("Correo o contraseña incorrectos.") cuando el
   servidor no trae mensaje legible (R-8).
6. **Ubicación del registro de validación.** El plan asume `specs/007-integrar-frontend/
   validation.md` y las capturas en `specs/007-integrar-frontend/validation/`, versionadas.
