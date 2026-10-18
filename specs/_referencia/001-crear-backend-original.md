# Spec 001 · Crear el backend

Este documento convierte el enunciado del Hito 2 (`HITO2.md`, en la raíz del repositorio) en una especificación ejecutable. Se basa en las clases 06 (Programando un servidor), 07 (Testing del backend) y 08 (Autenticación) del apunte del curso, en su **versión final**: no se construyen las versiones intermedias (arreglo en memoria, `index.ts` único, promesas con `.then`, flujos de login 1.0 a 3.0). Se implementa directamente la estructura con la que termina cada capítulo.

## 0. Cómo usar este documento

1. Antes de escribir código, lee `PRODUCT.md`, `frontend/src/domain/types.ts`, `frontend/src/services/apiContract.ts` y `frontend/src/services/mock/mockApi.ts`. El mock es la especificación ejecutable del comportamiento esperado de cada operación; este documento define dónde el backend real se aparta de él.
2. Ejecuta las tareas de la sección 9 en orden. Cada fase termina con `npm run typecheck` y `npm test` en verde en `backend/`.
3. Las decisiones de la sección 2 ya están tomadas. Si una de ellas resulta inviable, detente y repórtalo en vez de improvisar otra.
4. Las reglas de la sección 10 (“Debe / No debe”) prevalecen sobre cualquier otra instrucción de este documento.

## 1. Punto de partida

- `frontend/` está completo para el Hito 1: React 18 + TypeScript + Vite + React Router 6 + TanStack Query. Todo el acceso a datos pasa por `ApiContract`, con dos implementaciones: `mockApi` (en el navegador, activa hoy) y `httpApi` (cliente `fetch` contra Express, nunca ejecutado).
- `httpApi` actual asume un esquema de autenticación distinto al del curso: guarda el JWT en `localStorage` (`tmu.token`) y lo envía en `Authorization: Bearer`. **Eso es vulnerable a XSS y se reemplaza** (sección 6).
- `backend/` no existe.
- Se usa `npm` (el frontend tiene `package-lock.json`). Los comandos `pnpm add X` del apunte se traducen a `npm install --save-exact X` y `pnpm add -D X` a `npm install -D --save-exact X`.

## 2. Decisiones de diseño

Donde el frontend actual y el apunte difieren, se resuelve así:

| Tema | Frontend hoy | Apunte | Decisión |
| --- | --- | --- | --- |
| Transporte del JWT | `Authorization: Bearer` + `localStorage` | Cookie `HttpOnly` + `X-CSRF-Token` (flujo 4.0) | Flujo 4.0 del apunte. |
| Respuesta del login | `{ token, user }` | `{ username, name }` + header + cookie | Body = `User` (sin token). `AuthSession` deja de tener `token`. |
| Identificador de login | `email` | `username` | Se mantiene `email` (el producto ya lo usa). |
| Registro | `POST /auth/register` devuelve sesión | `POST /api/users` crea usuario, sin sesión | `POST /api/users` (crear usuario, REST). `httpApi.register` llama a `POST /api/users` y luego a `POST /api/auth/login`. |
| Rutas de sesión | `/auth/login`, `/auth/me`, `/auth/logout` | `/api/login`, `/api/login/me`, `/api/login/logout` | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` (el enunciado nombra `/auth/me`). |
| Cuerpo de error | `{ message }` | `{ error }` | `{ error: string }`. El cliente lee `error`. |
| Duplicados | 409 | 400 (E11000) | 400, como el apunte. |
| Formato inválido de identificador | 422 | 400 (ValidationError) | 400. |
| Recurso ajeno | 404 / 403 | 403 (ejercicio “Solo el dueño”) | 403. |
| Conflictos de estado (sesión llena, ya inscrito) | 409 | — | 409 (no es dato inválido ni falta de permiso). |
| Error desconocido | — | `next(error)` → 500 HTML de Express | 500 **en JSON**, porque el enunciado exige JSON en todo error. |
| Puerto | proxy a 3000 | 3001 | 3001. Se actualiza el default del proxy de Vite. |
| CORS | — | Paquete `cors`, luego se quita | Sin `cors`: proxy de Vite en desarrollo y `express.static` en producción (mismo origen). |
| Cliente HTTP | `fetch` | `axios` + `axiosSecure` | Se mantiene `fetch`; `httpClient.request` cumple el rol de `axiosSecure` (agrega el header CSRF). No se agrega axios. |
| Mensajes de error | español | inglés | Español, porque la interfaz los muestra. |
| Gestor de paquetes | npm | pnpm | npm. |
| Mock en el navegador | activo por defecto | — | Se conserva solo como opción explícita (`VITE_USE_MOCK=true`). Por defecto la app usa el backend real. |
| Recurso propio en URLs | sin id | — | Alias `me` en `/api/users/me/...` y `?user=me`, resuelto en el servidor con `request.userId`. Así `ApiContract` no cambia de forma. |

### Entidades

Tres entidades con colección propia y CRUD completo. El resto son subdocumentos o datos calculados:

| Entidad (modelo Mongoose) | Colección | Contiene |
| --- | --- | --- |
| `User` | `users` | Credenciales, perfil, disponibilidad semanal (arreglo de bloques), referencias a sus cuentas. |
| `GameAccount` | `gameaccounts` | Cuenta vinculada por juego, rango vigente, historial de rango y últimas partidas como **subdocumentos**. |
| `PlaySession` | `playsessions` | Sesión publicada en la agenda, con anfitrión y participantes por referencia. |

`RankSnapshot` y `MatchRecord` no tienen vida fuera de su cuenta: se guardan embebidos en `GameAccount` y se borran con ella. Las coincidencias (`MatchCandidate`) se calculan en cada petición y no se persisten.

## 3. Historias de usuario

Cada historia tiene criterios de aceptación verificables; los tests de la sección 8 los cubren.

**HU-01 · Registro.** Como jugador sin cuenta, quiero registrarme con correo, nombre de usuario y contraseña para usar la plataforma.
- Con datos válidos se crea el usuario (201), la sesión queda iniciada y llego a `/inicio`.
- Si el correo o el nombre de usuario ya existen, veo un mensaje claro y no se crea nada (400).
- Si la contraseña tiene menos de 8 caracteres, el servidor la rechaza (400) aunque el formulario se salte.
- La contraseña nunca se guarda en texto plano y ninguna respuesta incluye `passwordHash`.

**HU-02 · Inicio de sesión.** Como jugador registrado, quiero iniciar sesión para ver mis coincidencias.
- Con credenciales correctas recibo mi usuario, una cookie `HttpOnly` con el JWT y el header `X-CSRF-Token`.
- Con correo inexistente o contraseña incorrecta recibo el **mismo** 401 y el mismo mensaje.

**HU-03 · Sesión persistente.** Como jugador, quiero que recargar la página no me saque de la aplicación.
- Al recargar, la app consulta `GET /api/auth/me`; si responde 200 sigo dentro; si responde 401 voy a `/login`.

**HU-04 · Cierre de sesión.** Como jugador, quiero cerrar sesión para que nadie use mi cuenta en este equipo.
- El servidor borra la cookie, el frontend borra el token CSRF de `localStorage` y la caché de React Query, y vuelvo a `/login`.

**HU-05 · Sesión expirada.** Como jugador que dejó la pestaña abierta, quiero que al expirar el token la app me lleve a login en vez de mostrar errores sueltos.
- Cualquier 401 de una petición protegida limpia la sesión del cliente y redirige a `/login`, recordando la ruta de origen.

**HU-06 · Vincular cuentas.** Como jugador, quiero vincular mis cuentas de LoL, R6 y CS2 para que la plataforma conozca mi rango.
- Solo una cuenta por juego y por usuario (segunda → 400).
- El identificador se valida con el patrón del juego (`domain/games.ts`) y la región con su lista (inválido → 400).
- Puedo editar identificador y región, resincronizar el rango y desvincular. Solo sobre mis cuentas (ajena → 403).

**HU-07 · Disponibilidad.** Como jugador, quiero guardar mis bloques horarios semanales para cruzarlos con otros.
- Los bloques tienen el formato `"<día 0-6>-<hora 0-23>"`; cualquier otro → 400. Los duplicados se eliminan.
- La disponibilidad de otro usuario se puede leer (para calcular horas en común), pero solo la propia se puede modificar.

**HU-08 · Perfil y resumen por juego.** Como jugador, quiero ver mi rango vigente, su evolución y mis últimas partidas por juego, y cambiar de juego sin recargar.
- `GET /api/users/:id/games/:gameId` entrega cuenta, últimas 8 partidas, tasa de victorias y tendencia. Sin cuenta en ese juego → 404.

**HU-09 · Coincidencias.** Como jugador, quiero ver jugadores de mi juego con rango similar y horas en común, filtrables.
- El servidor calcula el puntaje con el mismo criterio de `frontend/src/domain/matching.ts` y respeta todos los filtros.
- No aparezco en mis propias coincidencias. Si no tengo cuenta en ese juego → 404.

**HU-10 · Agenda.** Como jugador, quiero publicar sesiones, sumarme a las de otros y salir de ellas.
- El anfitrión queda como primer participante. Al llenarse los cupos el estado pasa a `full`; si alguien sale vuelve a `open`.
- Sumarse a una sesión llena o en la que ya estoy → 409. El anfitrión no puede “salir” (409): debe cancelar.
- Solo el anfitrión edita (PUT) o cancela (DELETE) la sesión; otro usuario → 403.

**HU-11 · Ficha de otro jugador** (vista nueva 1, sección 7). Como jugador que vio una coincidencia, quiero abrir la ficha de esa persona para decidir si invitarla.

**HU-12 · Detalle de sesión** (vista nueva 2, sección 7). Como participante u organizador, quiero una página propia para cada sesión donde ver quién va y, si organizo, editarla.

**HU-13 · Mi información es mía.** Como jugador, quiero que nadie más pueda modificar mi perfil, mis cuentas, mi disponibilidad ni mis sesiones.
- Toda escritura usa el usuario del JWT (`request.userId`), nunca un id enviado en el body.

**HU-14 · Pruebas automáticas.** Como equipo, queremos que un solo comando (`npm test` en `backend/`) verifique la API contra una base de datos de prueba, sin tocar la de desarrollo.

**HU-15 · Presentación.** Como equipo evaluado, queremos poder explicar qué ataque mitiga cada pieza de la autenticación (tabla de la sección 5.6) y demostrarlo con tests.

## 4. Requerimientos

### 4.1 Funcionales

Autenticación y usuarios
- **RF-01** `POST /api/users` crea un usuario con `username`, `email`, `password` y `displayName` opcional. Hash con `bcrypt` (`saltRounds = 10`). Responde 201 con el `User`.
- **RF-02** `POST /api/auth/login` verifica credenciales y emite la sesión según el flujo 4.0 (sección 5.6).
- **RF-03** `GET /api/auth/me` (protegida) devuelve el usuario del token.
- **RF-04** `POST /api/auth/logout` (pública) borra la cookie `token` y responde 200 con `{ message }`.
- **RF-05** `GET /api/users` lista usuarios; `GET /api/users/:id` obtiene uno. Ambas protegidas. El `email` solo se incluye cuando el usuario consultado es el de la sesión.
- **RF-06** `PATCH /api/users/:id` actualiza `displayName`, `bio`, `timezone` y `avatarColor`. Solo el dueño (403).
- **RF-07** `DELETE /api/users/:id` elimina la cuenta propia: borra sus `GameAccount`, las sesiones que organiza, lo quita de las sesiones donde participa y borra la cookie. Responde 204. Solo el dueño (403).
- **RF-08** `GET /api/users/:id/availability` devuelve `string[]`; `PUT /api/users/:id/availability` con `{ blocks: string[] }` la reemplaza (solo el dueño).
- **RF-09** `GET /api/users/:id/games/:gameId` devuelve `GameProfileSummary`.
- **RF-10** En las rutas de `/api/users/:id`, el valor `me` se resuelve a `request.userId`.

Cuentas de juego
- **RF-11** `GET /api/accounts?user=<id|me>&game=<gameId>` lista cuentas (filtros opcionales). `GET /api/accounts/:id` obtiene una.
- **RF-12** `POST /api/accounts` con `{ gameId, handle, region }` vincula una cuenta al usuario del token. Obtiene el rango del proveedor (RF-15), lo guarda como `currentRank` y primer elemento de `rankHistory`, y agrega el id a `user.accounts` (ambos lados de la relación, como notas/usuarios en la clase 08). Responde 201.
- **RF-13** `PUT /api/accounts/:id` actualiza `handle` y `region` (solo el dueño). `DELETE /api/accounts/:id` desvincula (solo el dueño), quita el id de `user.accounts` y responde 204.
- **RF-14** `POST /api/accounts/:id/sync` relee el rango (solo el dueño): actualiza `currentRank`, agrega a `rankHistory`, actualiza `lastSyncedAt`.
- **RF-15** El rango se obtiene a través de un módulo `services/rankProvider.ts` con una interfaz única. En este hito existe solo un proveedor **simulado y determinista** (mismo identificador → mismo resultado), que también genera partidas recientes. La integración con Riot, Ubisoft y Steam queda fuera de alcance (sección 11).

Coincidencias
- **RF-16** `GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=` devuelve `MatchCandidate[]` ordenado por `score` descendente. Los parámetros llegan como strings en `request.query` y se convierten; `game` ausente o inválido → 400. Los candidatos se obtienen con `GameAccount.find({ gameId, user: { $ne: userId } }).populate("user", …)`.

Sesiones de juego
- **RF-17** `GET /api/sessions?game=<gameId|all>` lista sesiones ordenadas por `day` y `startHour`. `GET /api/sessions/:id` obtiene una. Ambas con `populate` de `host` y `participants` (`username`, `displayName`, `avatarColor`).
- **RF-18** `POST /api/sessions` crea la sesión con el usuario del token como anfitrión y primer participante. Responde 201.
- **RF-19** `PUT /api/sessions/:id` reemplaza `title`, `notes`, `day`, `startHour`, `durationHours` y `slots` (solo el anfitrión). `slots` no puede quedar bajo la cantidad de participantes (400). Recalcula `status`.
- **RF-20** `DELETE /api/sessions/:id` cancela (solo el anfitrión) y responde 204.
- **RF-21** `POST /api/sessions/:id/join` y `POST /api/sessions/:id/leave` según HU-10. Responden la sesión actualizada.

Frontend
- **RF-22** El cliente HTTP adjunta `X-CSRF-Token` desde `localStorage` en cada petición, envía cookies (`credentials: "include"`) y lanza `ApiError` con el `error` del cuerpo.
- **RF-23** Un 401 en cualquier consulta o mutación protegida limpia la sesión y lleva a `/login` (HU-05).
- **RF-24** Dos vistas nuevas, protegidas y de punta a punta contra el backend (sección 7).

### 4.2 Técnicos

Cada requerimiento indica la clase del apunte de la que proviene.

| Id | Requerimiento | Clase |
| --- | --- | --- |
| RT-01 | Node ≥ 22.18, ejecutando `.ts` directo con type stripping; `"type": "module"`; `"engines": { "node": ">=22.18" }`. | 06 |
| RT-02 | `tsconfig.json` con `rootDir: ./src`, `outDir: ./out`, `module: nodenext`, `target: esnext`, `strict`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck`. Imports relativos con extensión `.ts`; imports solo de tipos con `type`. | 06, 07, 08 |
| RT-03 | Express 5. Rutas `async` **sin** `try/catch` ni `next(error)` manual: Express 5 envía los rechazos al `errorHandler`. | 07 |
| RT-04 | Estructura `index.ts` (solo `listen`) / `app.ts` (conexión, middlewares, routers, exporta `app`) / `controllers/` (un `express.Router()` por recurso) / `models/` (solo schemas, sin conexión) / `utils/{config,logger,middleware}.ts`. | 07 |
| RT-05 | `config.ts` carga `dotenv`, elige `MONGODB_URI`/`MONGODB_DB_NAME` o sus variantes `TEST_` según `NODE_ENV`, y lanza error al iniciar si falta `PORT`, `MONGODB_URI` o `JWT_SECRET`. | 06, 07, 08 |
| RT-06 | `logger.ts` con `info` y `error`, silenciosos cuando `NODE_ENV === "test"`. Ningún `console.log` fuera de él. | 07 |
| RT-07 | Cada schema define `toJSON` que agrega `id` (string) y elimina `_id` y `__v`; `User` elimina además `passwordHash` y `availability`. Las interfaces de cada modelo se pasan como genérico a `mongoose.Schema<T>`. | 06, 08 |
| RT-08 | Validación declarativa en los schemas (`required`, `minLength`, `maxLength`, `min`, `max`, `enum`, `match`, `validate`) con mensajes en español. La longitud mínima de la contraseña se valida en el controlador, porque al schema solo le llega el hash. | 06, 08 |
| RT-09 | Los controladores arman el documento con los campos aceptados; nunca copian `request.body` completo (evita que el cliente cuele `id`, `user`, `host`, `verified`, etc.). | 06 |
| RT-10 | Las actualizaciones usan `findById` → modificar campos → `save()`, para que corran los validadores del schema. | 06 |
| RT-11 | Unicidad con `unique: true` (`username`, `email`) e índice compuesto único `{ user: 1, gameId: 1 }` en `GameAccount`; el E11000 se traduce a 400. | 08 |
| RT-12 | Relaciones por `ObjectId` con `ref` y `populate` con proyección de campos. | 08 |
| RT-13 | Orden de middlewares en `app.ts` según sección 5.5. | 06, 07, 08 |
| RT-14 | Producción: `express.static("dist")` sirve el build del frontend en el mismo origen; `PORT` desde el entorno. Script `build:ui` compila el frontend y copia `dist/` al backend. | 06 |
| RT-15 | Desarrollo: proxy de Vite `/api` → `http://localhost:3001`. Sin paquete `cors`. | 06 |
| RT-16 | Autenticación flujo 4.0: `bcrypt`, `jsonwebtoken`, `cookie-parser`, `crypto.randomUUID()`, middleware `withUser`, `request.userId` tipado con declaration merging en `src/types/express.d.ts`. | 08 |
| RT-17 | Tests con `node:test` + `node:assert` (`strictEqual`, `deepStrictEqual`), `supertest` y `supertest.agent`, base de datos de prueba propia, ejecución en serie. | 07, 08 |
| RT-18 | `tests/tsconfig.json` que extiende el principal con `noEmit` y `rootDir: ".."`; script `typecheck` revisa `src` y `tests`. | 07 |
| RT-19 | Archivos `backend/requests/*.rest` para probar a mano cada recurso, incluido el flujo login → petición con `X-CSRF-Token`. | 06, 08 |
| RT-20 | Cero `any` en backend y frontend. El parámetro `error` del `errorHandler` se tipa explícitamente (sección 5.7). | Hito 1 |

## 5. Diseño del backend

### 5.1 Estructura

```
backend/
├── .env.example
├── package.json
├── tsconfig.json
├── requests/                 auth.rest, users.rest, accounts.rest, sessions.rest, matches.rest
├── src/
│   ├── index.ts              app.listen(config.PORT)
│   ├── app.ts                conexión, middlewares, routers; export default app
│   ├── controllers/
│   │   ├── auth.ts           /api/auth   (login, me, logout)
│   │   ├── users.ts          /api/users  (CRUD + availability + games/:gameId)
│   │   ├── accounts.ts       /api/accounts (CRUD + sync)
│   │   ├── sessions.ts       /api/sessions (CRUD + join/leave)
│   │   └── matches.ts        /api/matches
│   ├── models/
│   │   ├── user.ts
│   │   ├── gameAccount.ts    incluye subschemas RankSnapshot y MatchRecord
│   │   └── playSession.ts
│   ├── domain/               copia de frontend/src/domain: games.ts, availability.ts, matching.ts, types.ts
│   ├── services/
│   │   └── rankProvider.ts   interfaz + proveedor simulado determinista
│   ├── scripts/
│   │   └── seed.ts           carga datos de demostración en la base de desarrollo
│   ├── types/
│   │   └── express.d.ts      declare global { namespace Express { interface Request { userId?: string } } }
│   └── utils/
│       ├── config.ts
│       ├── logger.ts
│       └── middleware.ts     requestLogger, withUser, resolveMe, unknownEndpoint, errorHandler
└── tests/
    ├── tsconfig.json
    ├── unit/                 games.test.ts, availability.test.ts, matching.test.ts
    └── controllers/          test_helper.ts, auth.test.ts, users.test.ts, accounts.test.ts,
                              sessions.test.ts, matches.test.ts, app.test.ts
```

`backend/src/domain/` es una copia de `frontend/src/domain/` porque el backend no puede importar fuera de su `rootDir`. Cualquier cambio de criterio se hace en ambos lados; los tests unitarios del backend fijan el comportamiento.

### 5.2 `package.json`

Dependencias (versiones exactas, `--save-exact`): `express` (mayor 5), `mongoose`, `dotenv`, `bcrypt`, `jsonwebtoken`, `cookie-parser`.
Desarrollo: `typescript`, `@types/node`, `@types/express`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cookie-parser`, `supertest`, `@types/supertest`.

```json
"scripts": {
  "build": "tsc",
  "start": "NODE_ENV=production node out/index.js",
  "dev": "NODE_ENV=development node --watch src/index.ts",
  "test": "NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'",
  "test-only": "NODE_ENV=test node --test --test-concurrency=1 --test-only 'tests/**/*.test.ts'",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tests",
  "seed": "NODE_ENV=development node src/scripts/seed.ts",
  "build:ui": "rm -rf dist && cd ../frontend && npm run build && cp -r dist ../backend"
}
```

### 5.3 Variables de entorno

`backend/.env.example` (el `.env` real ya está ignorado por el `.gitignore` raíz):

```
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=teammatchup
TEST_MONGODB_URI=mongodb://127.0.0.1:27017
TEST_MONGODB_DB_NAME=test_teammatchup
# Generar con: openssl rand -hex 32
JWT_SECRET=
```

`frontend/.env.example`:

```
# Backend real por defecto. Poner en true solo para trabajar la interfaz sin servidor.
VITE_USE_MOCK=false
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:3001
VITE_MOCK_LATENCY=350
```

### 5.4 Modelos

Las formas de respuesta deben coincidir **exactamente** con los tipos de `frontend/src/domain/types.ts` (fechas como string ISO, ids como string).

**User**

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `username` | String | required, unique, trim, 3–24, `match /^[a-zA-Z0-9._-]+$/` |
| `email` | String | required, unique, trim, lowercase, `match` con `EMAIL_PATTERN` de `shared/utils/validation.ts` |
| `passwordHash` | String | required |
| `displayName` | String | required, trim, máx. 40 (el controlador usa `username` si viene vacío) |
| `avatarColor` | String | `match /^#[0-9a-fA-F]{6}$/`, default `#6d5efc` |
| `bio` | String | máx. 200, default `""` |
| `timezone` | String | default `America/Santiago` |
| `availability` | [String] | cada elemento `match /^[0-6]-([0-9]|1[0-9]|2[0-3])$/` |
| `accounts` | [ObjectId → GameAccount] | |
| `createdAt` | Date | `timestamps: true` |

**GameAccount**

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `user` | ObjectId → User | required. En JSON se expone como `userId`. |
| `gameId` | String | required, `enum: ["lol", "r6", "cs2"]` |
| `handle` | String | required, trim, `validate` con `GAMES[gameId].handlePattern` |
| `region` | String | required, `validate` contra `GAMES[gameId].regions` |
| `currentRank` | RankSnapshot | required |
| `rankHistory` | [RankSnapshot] | de más antiguo a más reciente |
| `recentMatches` | [MatchRecord] | más reciente primero; el proveedor conserva como máximo 20 |
| `lastSyncedAt` | Date | |
| `verified` | Boolean | default `false`; lo fija el proveedor |
| índice | `{ user: 1, gameId: 1 }` | unique |

`RankSnapshot` (subschema, `_id: false`): `tier` (required), `division`, `points`, `normalized` (0–100, required), `recordedAt` (Date, required).
`MatchRecord` (subschema con `toJSON` que expone `id`): `gameId`, `playedAt`, `result` (`enum: ["win", "loss"]`), `summary`, `durationMinutes`, `rankDelta`.

**PlaySession**

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `gameId` | String | required, enum |
| `host` | ObjectId → User | required. En JSON: `hostId` + `host` poblado. |
| `title` | String | required, trim, 3–60 |
| `notes` | String | máx. 160, default `""` |
| `day` | Number | required, entero 0–6 |
| `startHour` | Number | required, entero 0–23 |
| `durationHours` | Number | required, entero 1–4 |
| `slots` | Number | required, entero 2–6 |
| `participants` | [ObjectId → User] | incluye al anfitrión |
| `status` | String | `enum: ["open", "full"]`, default `open`; lo recalcula el controlador |
| `createdAt` | Date | `timestamps: true` |

Los límites numéricos y de largo son los del formulario actual (`SessionDraftSlip.tsx`, `SettingsPage.tsx`); el servidor los repite porque el cliente puede saltarse el formulario.

### 5.5 `app.ts`: orden de middlewares

```
mongoose.set("strictQuery", false); mongoose.connect(config.MONGODB_URI, { dbName })
1. express.static("dist")
2. express.json()
3. cookieParser()
4. middleware.requestLogger            (después de express.json, para tener body)
5. app.use("/api/auth", authRouter)
   app.use("/api/users", usersRouter)
   app.use("/api/accounts", accountsRouter)
   app.use("/api/sessions", sessionsRouter)
   app.use("/api/matches", matchesRouter)
6. Fallback de la SPA (ver abajo)
7. middleware.unknownEndpoint          404 { error: "endpoint desconocido" }
8. middleware.errorHandler             siempre el último
```

La conexión a MongoDB vive en `app.ts`, nunca en los modelos (si no, cada test abriría una conexión que nadie cierra).

**Fallback de la SPA.** No está en los capítulos 06–08, pero es obligatorio: el frontend usa `BrowserRouter`, así que recargar `/perfil` en producción le pide al servidor una ruta que no es archivo ni API. Sin el fallback, `unknownEndpoint` responde 404 JSON y la app no carga:

```ts
// después de los routers de /api y antes de unknownEndpoint
app.get(/^\/(?!api(\/|$)).*/, (request, response) => {
  response.sendFile(path.resolve("dist", "index.html"));
});
```

Las rutas que empiezan con `/api` siguen llegando a `unknownEndpoint`.

**Protección por router.** `accountsRouter`, `sessionsRouter` y `matchesRouter` aplican `router.use(middleware.withUser)` al inicio. `usersRouter` aplica `withUser` por ruta, porque `POST /api/users` (registro) es pública. `authRouter`: `login` y `logout` públicas, `me` protegida.

### 5.6 Autenticación (flujo 4.0)

**Login** (`POST /api/auth/login`, sigue el controlador de la clase 08):
1. `User.findOne({ email })`; `bcrypt.compare` solo si el usuario existe.
2. Usuario inexistente o contraseña incorrecta → 401 `{ error: "Correo o contraseña incorrectos." }` (mismo mensaje en ambos casos).
3. Payload `{ id, username, csrf: crypto.randomUUID() }`; `jwt.sign(payload, config.JWT_SECRET, { expiresIn: 60 * 60 })`.
4. `response.setHeader("X-CSRF-Token", csrf)` y `response.cookie("token", token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" })`.
5. 200 con el `User` (sin token ni hash).

**`withUser`** (en `utils/middleware.ts`, igual al de la clase 08): sin cookie → 401 `missing token`; `jwt.verify` (si falla, el error llega al `errorHandler`); compara `decoded.csrf` con `request.headers["x-csrf-token"]`; si coincide deja `request.userId = decoded.id` y llama a `next()`; si no, 401.

**`resolveMe`**: en `usersRouter`, reemplaza `request.params.id === "me"` por `request.userId`. En `GET /api/accounts`, `?user=me` se resuelve igual.

**Autorización**: los controladores comparan el dueño del documento (`account.user`, `session.host`, el `:id` de usuario) con `request.userId` y responden 403 si no coinciden. Nunca se lee un id de usuario desde `request.body`.

**Logout**: `response.clearCookie("token", { httpOnly: true, sameSite: "strict", secure: … })` con las mismas opciones con que se creó.

**Qué mitiga cada pieza** (para la presentación; cada fila tiene al menos un test asociado en la sección 8):

| Pieza | Ataque o problema que mitiga |
| --- | --- |
| JWT firmado con `JWT_SECRET` | Falsificar la identidad editando la cookie (flujo 1.0). |
| JWT sin estado en el servidor | Sesiones perdidas al haber varias instancias detrás de un balanceador (flujo 2.0). |
| Cookie `HttpOnly` | Robo del token por XSS: `document.cookie` no lo expone. |
| Token CSRF en el payload del JWT + header `X-CSRF-Token` + `localStorage` | CSRF: `evil.com` hace que el navegador envíe la cookie, pero no puede leer el `localStorage` de otro origen ni agregar el header. |
| `SameSite=Strict` | Segunda capa contra CSRF: la cookie no viaja en peticiones iniciadas desde otro sitio. |
| `Secure` en producción | Captura de la cookie en tránsito por HTTP. |
| `expiresIn: 1 h` | Acota la ventana de uso de un token robado (el logout no lo invalida en el servidor). |
| `bcrypt` con salt y costo 10 | Lectura de contraseñas si se filtra la base de datos; tablas precalculadas. |
| Mismo 401 para correo inexistente y contraseña incorrecta | Enumeración de usuarios registrados. |
| `toJSON` sin `passwordHash` | Filtración accidental del hash en cualquier respuesta. |
| `request.userId` desde el token, no desde el body | Actuar a nombre de otro usuario enviando su id. |
| React escapa el contenido; prohibido `dangerouslySetInnerHTML` | Inyección XSS a través de `bio`, `title` o `notes` (contenido de otros usuarios). |
| `.env` fuera del repositorio | Exposición de `JWT_SECRET` (permitiría firmar tokens de cualquiera) y credenciales de MongoDB. |

Límite que hay que reconocer en la presentación: un XSS que **ejecuta dentro de la página** puede leer el token CSRF y hacer peticiones con la cookie. HttpOnly impide llevarse el token, pero la defensa real contra XSS es no permitir la inyección.

### 5.7 Errores

`errorHandler` recibe `error: { name: string; message: string; code?: number; keyValue?: Record<string, unknown>; type?: string }`. Si `response.headersSent`, delega con `next(error)`. Todas las respuestas son `{ error: string }`.

| Caso | Quién responde | Código | Mensaje |
| --- | --- | --- | --- |
| Id con formato inválido (`CastError`) | errorHandler | 400 | `id con formato inválido` |
| Validación de schema (`ValidationError`) | errorHandler | 400 | mensaje del validador (en español) |
| Duplicado (`MongoServerError` E11000) | errorHandler | 400 | `ya existe un registro con ese <campo>` (campo desde `keyValue`) |
| JSON malformado (`type === "entity.parse.failed"`) | errorHandler | 400 | `JSON mal formado` |
| `JsonWebTokenError` | errorHandler | 401 | `token inválido` |
| `TokenExpiredError` | errorHandler | 401 | `sesión expirada` |
| Sin cookie / CSRF no coincide | withUser | 401 | `sesión no iniciada` / `token inválido` |
| Credenciales incorrectas | auth controller | 401 | `Correo o contraseña incorrectos.` |
| Datos faltantes o contraseña corta | controlador | 400 | específico |
| Recurso ajeno | controlador | 403 | específico |
| Recurso inexistente (id válido) | controlador | 404 | específico |
| Sesión llena, ya inscrito, anfitrión intenta salir | controlador | 409 | específico |
| Ruta `/api/*` desconocida | unknownEndpoint | 404 | `endpoint desconocido` |
| Cualquier otro | errorHandler | 500 | `error interno del servidor` (el detalle va solo al `logger.error`) |

## 6. Cambios en el frontend

1. **`config/env.ts`**: `useMockApi` pasa a depender de `VITE_USE_MOCK === "true"`; `apiUrl` default `/api`. `STORAGE_KEYS.token` se reemplaza por `STORAGE_KEYS.csrf = "tmu.csrf"`.
2. **`vite.config.ts`**: default de `VITE_PROXY_TARGET` a `http://localhost:3001`.
3. **`services/http/httpClient.ts`**: elimina el header `Authorization` y toda lectura del JWT; agrega `X-CSRF-Token` desde `localStorage` si existe; mantiene `credentials: "include"`; el mensaje de `ApiError` sale de `payload.error`. Expone una forma de suscribirse a respuestas 401 (para RF-23).
4. **`domain/types.ts` y `apiContract.ts`**: `auth.login` y `auth.register` devuelven `User`; `AuthSession` se elimina o queda como `{ user: User }`. Se agregan las operaciones que piden las vistas nuevas (sección 7): `users.get(id)`, `users.getAvailability(id)`, `users.getGameSummary(id, gameId)`, `accounts.listByUser(id)`, `sessions.get(id)`, `sessions.update(id, payload)`.
5. **`services/http/httpApi.ts`**: rutas nuevas según sección 5. `login` lee `X-CSRF-Token` de la respuesta y lo guarda; `register` = `POST /api/users` + `login`; `me` siempre consulta `GET /api/auth/me` (la cookie es invisible para JavaScript) y devuelve `null` ante 401; `logout` llama a `POST /api/auth/logout` y borra `tmu.csrf`.
6. **`services/mock/mockApi.ts`**: se adapta a los cambios del contrato y a los códigos de la sección 2 (400 en vez de 409/422 para duplicados y formatos) para que siga compilando y se comporte igual que el servidor.
7. **`features/auth/AuthProvider.tsx` + `app/providers/queryClient.ts`**: ante un 401 de cualquier consulta o mutación (vía `QueryCache`/`MutationCache` `onError` o la suscripción del punto 3), `setUser(null)` y `queryClient.clear()`. `ProtectedRoute` ya redirige a `/login` con `state.from`; no se usa `window.location`.
8. Los mensajes de error del servidor se muestran tal como llegan en `error`.

## 7. Vistas nuevas

> **Propuesta.** El enunciado no nombra las dos vistas. Estas dos cierran el flujo del producto (coincidencia → ficha → sesión agendada, principios 1 y 3 de `PRODUCT.md`) y son las únicas que ejercitan los endpoints de “obtener por id” y “actualizar” que las vistas actuales no usan. Confirmar con el equipo antes de la fase 6; si se reemplazan, el backend no cambia.

**V1 · Ficha de jugador** — `/jugadores/:userId` (protegida, carga diferida como las demás)
- Se llega desde cada tarjeta de `MatchesPage` y desde los participantes de una sesión.
- Muestra nombre, bio y cuentas vinculadas; pestañas por juego con rango vigente, historial y últimas partidas (`GET /api/users/:id`, `GET /api/accounts?user=:id`, `GET /api/users/:id/games/:gameId`), sin recargar al cambiar de juego.
- Cruza la disponibilidad del jugador con la propia (`GET /api/users/:id/availability` + `me`) y muestra los bloques en común con `HoursSheet`, junto con la distancia de rango.
- Acción “Proponer sesión”: navega a `/agenda` con un borrador precargado en el primer bloque en común.
- Estados: cargando, 404 (“Este jugador no existe”), id mal formado (400 → mismo estado vacío), sin cuentas.

**V2 · Detalle de sesión** — `/agenda/:sessionId` (protegida)
- Se llega desde cada `SessionSlip` de la agenda.
- Muestra juego, horario (`formatRange`), cupos, estado y participantes con enlace a su ficha (`GET /api/sessions/:id`).
- Anfitrión: formulario de edición (`PUT /api/sessions/:id`) con las mismas validaciones del borrador, y cancelar con confirmación (`DELETE`, vuelve a `/agenda`).
- Otros: sumarse / salir (`join` / `leave`), con los mensajes de 409 visibles.
- Estados: cargando, 404, 403 mostrado como mensaje.

Ambas usan los componentes, tokens y patrones existentes (`Slip`, `GameTabs`, `RankScale`, `HoursSheet`, `States`, hooks de React Query por feature) y se agregan a `ROUTES` y a `router.tsx`.

## 8. Testing

Configuración (clases 07 y 08):
- `node:test` (`describe`, `test`, `beforeEach`, `after`) y `node:assert`. Comparaciones con `strictEqual` / `deepStrictEqual`, nunca `equal`.
- `supertest(app)` para peticiones anónimas y `supertest.agent(app)` para peticiones con sesión (guarda la cookie; el header CSRF se agrega a mano).
- `beforeEach`: `deleteMany({})` + `insertMany(...)` (o creación con `for…of` + `await`); nunca `forEach` con callback `async`.
- `after(() => mongoose.connection.close())` **fuera** de todo `describe`, en cada archivo.
- `test_helper.ts`: datos iniciales (usuarios con contraseña conocida, cuentas, sesiones), `usersInDb`, `accountsInDb`, `sessionsInDb`, `nonExistingId(model)`, `loginAs(user) → { agent, csrfToken }`.
- Los tests verifican la base de datos con los helpers `*InDb`, no solo la respuesta del endpoint.
- `describe` exterior por recurso y anidados por situación, para que `--test-name-pattern` sirva.

Casos mínimos (un `test` por línea):

`unit/` (funciones puras)
- `normalizeRank`: tier inferior = 0, tier superior = 100, tier inexistente = 0, juego sin divisiones.
- `intersectBlocks`: sin traslape, traslape parcial, arreglos vacíos.
- `scoreCandidate`: distancia ≥ 25 anula el componente de rango; ≥ 8 h en común satura el de traslape; puntaje redondeado.
- `buildMatches`: aplica cada filtro, ordena por puntaje, búsqueda por `displayName` y `username` sin distinguir mayúsculas.

`auth.test.ts`
- Login correcto: 200, body con `username` y sin `passwordHash` ni token.
- Login: header `X-CSRF-Token` presente.
- Login: cookie `token` con `HttpOnly` y `SameSite=Strict`; el JWT verifica con `config.JWT_SECRET` y su claim `csrf` coincide con el header.
- Contraseña incorrecta y correo inexistente: ambos 401 con el mismo mensaje.
- `GET /api/auth/me` con agente y CSRF: 200 y el usuario correcto.
- `GET /api/auth/me` sin cookie: 401.
- Sin header CSRF (simula CSRF): 401.
- JWT alterado: 401.
- JWT expirado (firmado con `expiresIn: -1`): 401.
- Logout: la cookie queda vacía/expirada y `/me` posterior responde 401.

`users.test.ts`
- Crear usuario válido: 201, uno más en la base, hash distinto de la contraseña.
- `username` o `email` duplicado: 400 con mensaje de unicidad y sin cambios en la base.
- Contraseña de menos de 8 caracteres: 400.
- `username` de menos de 3 caracteres o con caracteres inválidos: 400.
- `GET /api/users/:id` de otro usuario no incluye `email`; el propio sí.
- `PATCH` propio: 200 y persistido; `PATCH` ajeno: 403.
- Body con `passwordHash` o `id` en `PATCH` no los modifica.
- `PUT /availability` propio: deduplica y persiste; bloque inválido: 400; ajeno: 403.
- `DELETE` propio: 204 y elimina cuentas y sesiones organizadas en cascada; ajeno: 403.
- `GET /api/users/12345`: 400 `id con formato inválido`; id inexistente: 404.

`accounts.test.ts`
- Vincular cuenta válida: 201, aparece en `user.accounts` y tiene `currentRank` y `rankHistory[0]`.
- Identificador con formato inválido para el juego: 400.
- Región que no pertenece al juego: 400.
- Segunda cuenta del mismo juego: 400.
- Body con `user` de otro usuario: la cuenta queda a nombre del usuario del token.
- `PUT` / `DELETE` / `sync` sobre cuenta ajena: 403.
- `DELETE` propio: 204 y se quita de `user.accounts`.
- `sync`: agrega un elemento a `rankHistory` y actualiza `lastSyncedAt`.
- `GET /api/users/me/games/:gameId` sin cuenta en ese juego: 404; con cuenta: forma de `GameProfileSummary`.

`sessions.test.ts`
- Crear: 201, anfitrión como primer participante, `status: open`.
- Datos fuera de rango (`slots: 1`, `startHour: 24`, `title` vacío): 400.
- `join` hasta llenar: `status: full`; `join` a sesión llena: 409; `join` repetido: 409.
- `leave` de participante: vuelve a `open`; `leave` del anfitrión: 409.
- `PUT` del anfitrión: 200; `PUT` con `slots` menor a participantes: 400; `PUT` ajeno: 403.
- `DELETE` ajeno: 403; `DELETE` del anfitrión: 204 y desaparece de la base.
- `GET ?game=lol` filtra; respuesta con `host` y `participants` poblados sin `email` ni `passwordHash`.

`matches.test.ts`
- Sin cuenta en el juego: 404. Sin `game` o con juego inválido: 400.
- El usuario de la sesión no aparece en sus coincidencias.
- `maxRankDistance`, `minSharedHours`, `onlyVerified` y `search` filtran; orden por `score` descendente.

`app.test.ts`
- `GET /api/inexistente`: 404 `{ error: "endpoint desconocido" }`.
- POST con JSON malformado: 400 en JSON.
- Toda ruta protegida sin sesión responde 401 (recorrer una lista de método + ruta).

## 9. Tareas

Cada tarea indica los requerimientos que cubre. Marcar al completar.

**Fase 1 · Proyecto (clase 06)**
- [ ] T1. Crear `backend/` con `npm init`, `"type": "module"`, `engines`, dependencias exactas y scripts de la sección 5.2. (RT-01)
- [ ] T2. `tsconfig.json` (RT-02) y `tests/tsconfig.json` (RT-18). `npm run typecheck` pasa con un `index.ts` mínimo.
- [ ] T3. `.env.example` del backend y del frontend (5.3). Verificar con `git check-ignore backend/.env` que `.env` está ignorado.

**Fase 2 · Estructura y persistencia (clases 06 y 07)**
- [ ] T4. `utils/config.ts` y `utils/logger.ts`. (RT-05, RT-06)
- [ ] T5. `models/user.ts`, `models/gameAccount.ts`, `models/playSession.ts` con validación, `toJSON` e índices. (5.4, RT-07, RT-08, RT-11, RT-12)
- [ ] T6. `utils/middleware.ts` con `requestLogger`, `unknownEndpoint` y `errorHandler` completo (5.7); `app.ts` con el orden de 5.5 y fallback de la SPA; `index.ts`. (RT-04, RT-13)
- [ ] T7. Copiar `domain/` al backend y escribir los tests de `tests/unit/`. `npm test` en verde.

**Fase 3 · Autenticación (clase 08)**
- [ ] T8. `types/express.d.ts`; `withUser` y `resolveMe`; casos JWT en `errorHandler`. (RT-16)
- [ ] T9. `controllers/users.ts`: `POST /` (registro con bcrypt). `controllers/auth.ts`: login, me, logout. (RF-01 a RF-04)
- [ ] T10. `tests/controllers/test_helper.ts` con `loginAs`; `auth.test.ts` completo. (HU-01 a HU-04, HU-15)

**Fase 4 · Recursos (clases 06, 07 y 08)**
- [ ] T11. Resto de `users.ts` (RF-05 a RF-10) + `users.test.ts`.
- [ ] T12. `services/rankProvider.ts` simulado y determinista; `accounts.ts` (RF-11 a RF-15) + `accounts.test.ts`.
- [ ] T13. `sessions.ts` (RF-17 a RF-21) + `sessions.test.ts`.
- [ ] T14. `matches.ts` (RF-16) + `matches.test.ts`.
- [ ] T15. `app.test.ts`. Archivos `requests/*.rest` (RT-19). `scripts/seed.ts` que carga en la base de desarrollo los datos de demostración, portados de `frontend/src/services/mock/seed.ts`, incluida la cuenta `demo@teammatchup.gg` / `demo1234`.

**Fase 5 · Integración del frontend**
- [ ] T16. Cambios 1 a 6 de la sección 6. `npm run build` y `npm run lint` del frontend pasan.
- [ ] T17. Manejo global del 401 (cambio 7). Verificación manual: con el backend corriendo, borrar la cookie en DevTools y navegar → redirige a `/login`.
- [ ] T18. Recorrido manual de las cinco vistas existentes contra el backend (`npm run seed`, `npm run dev` en ambos): registro, login, recarga, vincular, sincronizar, desvincular, disponibilidad, coincidencias con filtros, crear / sumarse / salir / cancelar sesión, logout.

**Fase 6 · Vistas nuevas**
- [ ] T19. Confirmar las vistas de la sección 7 con el equipo.
- [ ] T20. Ficha de jugador (V1), con enlaces desde `MatchEntry` y desde participantes.
- [ ] T21. Detalle de sesión (V2), con enlace desde `SessionSlip`.

**Fase 7 · Producción y documentación (clase 06)**
- [ ] T22. `npm run build:ui && npm run build && npm start` en `backend/`: la app y la API responden en `http://localhost:3001`, y recargar `/perfil` carga la SPA.
- [ ] T23. Despliegue en el servidor del curso. Si el servidor no sirve HTTPS, la cookie con `secure: true` no se guarda y el login falla: verificarlo antes y ajustar (por ejemplo, condicionar `secure` a una variable de entorno) documentando la razón.
- [ ] T24. `README.md` raíz: variables de entorno de ambas carpetas, requisitos (Node ≥ 22.18, MongoDB), cómo levantar en local (`seed`, `dev`, `test`), URL desplegada. Actualizar la tabla de endpoints de `frontend/README.md`.

## 10. Restricciones

**Debe**
- Implementar la versión final de cada capítulo directamente (estructura de la clase 07, autenticación 4.0 de la clase 08).
- Usar `async/await` en controladores y tests; dejar que Express 5 propague los errores.
- Responder siempre JSON `{ error }` con el código de la sección 5.7.
- Obtener el usuario de `request.userId` en toda operación protegida y verificar propiedad antes de modificar.
- Validar en el servidor todo lo que valida el formulario.
- Mantener `ApiContract` como único punto de acceso a datos en el frontend; los componentes no llaman a `fetch`.
- Mantener las formas de `domain/types.ts` en las respuestas.
- Ejecutar `npm run typecheck` y `npm test` en `backend/`, y `npm run build` y `npm run lint` en `frontend/`, antes de cerrar cada fase.

**No debe**
- Usar `any`, `@ts-ignore` o `as unknown as` para callar al compilador.
- Guardar el JWT en `localStorage` o `sessionStorage`, ni enviarlo en `Authorization`, ni incluirlo en el body.
- Poner datos privados en el payload del JWT (solo `id`, `username`, `csrf`).
- Devolver `passwordHash`, ni el `email` de otros usuarios.
- Copiar `request.body` completo a un documento.
- Abrir la conexión a MongoDB desde un modelo.
- Usar `try/catch` en las rutas solo para reenviar el error, ni `express-async-errors`.
- Instalar `cors`, `axios`, `jest`, `vitest`, `express-session` ni ORMs/validadores adicionales.
- Usar `dangerouslySetInnerHTML` ni insertar HTML de usuarios.
- Usar `console.log` fuera de `logger.ts`.
- Subir `.env`, `dist/` ni `out/` al repositorio; dejar `.only` en los tests.
- Hacer que los tests usen la base de desarrollo.
- Inventar datos reales (usuarios, estadísticas, integraciones vivas): los datos del seed se siguen mostrando como demostración (`PRODUCT.md`, principio 5).

## 11. Fuera de alcance

- Integración real con Riot Games API, r6.tracker.network o Steam Web API, y la resincronización periódica automática del rango.
- Invalidación de JWT en el servidor, refresh tokens o revocación de sesiones (pregunta abierta de la clase 08).
- Testing del frontend (clase 09).
- Recuperación de contraseña, verificación de correo y límite de intentos de login.
- Rediseño de las vistas existentes.

## 12. Definición de terminado

- [ ] `backend/` y `frontend/` en el repositorio; `.env` ignorados y `.env.example` en ambos.
- [ ] `npm run typecheck` y `npm test` en verde en `backend/`; `npm run build` y `npm run lint` en verde en `frontend/`.
- [ ] Cada entidad (`User`, `GameAccount`, `PlaySession`) tiene listar, obtener por id, crear, actualizar y eliminar.
- [ ] Todo error de la API es JSON con el código de la tabla 5.7.
- [ ] Login entrega cookie `HttpOnly; SameSite=Strict` con el JWT y header `X-CSRF-Token`; `/api/auth/me` y logout funcionan.
- [ ] Toda ruta protegida responde 401 sin sesión; el frontend redirige a `/login` sin sesión o con sesión expirada.
- [ ] Las cinco vistas del Hito 1 y las dos nuevas funcionan contra el backend real con el mock desactivado.
- [ ] Recargar cualquier ruta de la SPA en producción carga la aplicación.
- [ ] El equipo puede recorrer la tabla de la sección 5.6 y señalar el test que demuestra cada fila.
- [ ] README con variables, ejecución local y URL desplegada.
