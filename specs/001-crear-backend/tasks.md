# Tareas 001 — Crear el backend: servidor base, configuración y errores

Estado: aprobado

Spec: `specs/001-crear-backend/spec.md` (aprobada). Plan: `specs/001-crear-backend/plan.md`
(aprobado). Las referencias "§n" apuntan a secciones del plan.

## Reglas para quien implementa

- Una tarea por llamada, en orden. Cada una empieza con las pruebas indicadas **en rojo**
  (se ejecuta `npm test` y se ve fallar), después el código, y termina con los tres
  comandos en verde (principio 4). Al terminar: marcar la casilla `[x]` y parar.
- Todos los comandos se ejecutan dentro de `backend/`.
- No se crean archivos que el plan no nombra (§1). No se toca `frontend/`.
- Sin `any`, sin `@ts-ignore`, sin `.only`, sin `console` fuera de `src/utils/logger.ts`.
- Mensajes exactamente como en §2 (español, minúscula, sin punto final).
- **Prerrequisito desde T7:** MongoDB disponible y `backend/.env` creado copiando
  `backend/.env.example` (archivo local, ignorado por git; no se sube). Las pruebas de T7 y
  T9 conectan a la base de prueba (`TEST_MONGODB_URI` / `TEST_MONGODB_DBNAME`).

Comandos de verificación (existen desde T1):

```
npm test            # NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'
npm run typecheck   # tsc --noEmit && tsc --noEmit -p tests
npm run lint        # eslint .
```

---

## Tareas

- [x] **T1. Andamiaje del backend y logger.** RF-8, RF-19, RNF-1, RNF-2
  - Crea: `backend/package.json` (§1, §1.1: `"type": "module"`, `"private": true`,
    `"engines": { "node": ">=22.18" }`, scripts `dev`, `test`, `typecheck`, `lint`),
    `backend/package-lock.json` (lo genera npm), `backend/tsconfig.json` y
    `backend/tests/tsconfig.json` (§1), `backend/eslint.config.js` (§1.3, incluida la
    excepción de `no-console` para `src/utils/logger.ts` y la prohibición de `.only` en
    `tests/**`), `backend/src/utils/logger.ts` (§1: `createLogger({ isSilent, info, error })`
    y la instancia `logger`).
  - Dependencias (§1.2): antes de instalar, confirmar cada versión con
    `npm view <paquete>@<versión> version`; para `@types/node`, `eslint`, `@eslint/js` y
    `typescript-eslint`, tomar la versión exacta de `frontend/package-lock.json` y
    confirmarla igual. Si una no existe, usar la última de la misma versión mayor y
    anotarla en la tabla §1.2 del plan. Instalar con `npm install --save-exact` (prod) y
    `npm install --save-exact --save-dev` (dev). En `package.json` no queda ningún `^` ni
    `~`. No instalar nada de la lista "No se instalan" de §1.2.
  - Tests primero: `backend/tests/unit/logger.test.ts` (§6.2): `createLogger` con
    `isSilent: () => true` no llama a `info` ni `error`; con `() => false` los llama con los
    mismos argumentos; el `logger` por defecto, con `mock.method(console, "log")` y
    `mock.method(console, "error")`, no genera llamadas durante `npm test`.
  - Hecho cuando: `npm test` ejecuta `logger.test.ts` en verde; `npm run typecheck` y
    `npm run lint` en verde; añadir un `test.only(...)` temporal en `logger.test.ts` hace
    fallar `npm run lint` (y se quita); `grep -E '"[\^~]' package.json` no devuelve nada.

- [x] **T2. Mapeo de errores y middlewares.** RF-4, RF-5, RF-6, RF-7, RF-16, RF-17, RNF-3
  - Crea: `backend/src/utils/errors.ts` (§2.2, §3.3: `MESSAGES`, `ErrorResponse`,
    `mapErrorToResponse`), `backend/src/utils/middleware.ts` (§3.4: `unknownEndpoint`,
    `JsonResponder`, `createErrorHandler(log)` y la instancia `errorHandler` con el
    `logger` por defecto).
  - Tests primero: `backend/tests/unit/errors.test.ts` (§6.2: tipos `entity.parse.failed`
    → 400, `entity.too.large` → 413, `encoding.unsupported` y `charset.unsupported` → 415;
    `new Error("E11000 secreto")`, `"texto"`, `null`, `{ type: "otro" }` → 500 genérico sin
    el mensaje original; formato RNF-3 de cada mensaje de `MESSAGES`).
    `backend/tests/unit/middleware.test.ts` (§6.2: 500 con cuerpo exacto
    `{ error: "error interno del servidor" }`, sin `detalle interno` ni `stack`, y
    `spyLog.error` llamado una vez con el error original; `headersSent: true` → `next(error)`
    sin `status` ni `json`; error 4xx sin llamar a `spyLog.error`; `unknownEndpoint` llama a
    `status(404)` y `json({ error: "endpoint desconocido" })`).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde.

- [x] **T3. Composición de Express (`app.ts`).** RF-4, RF-5, RF-7, RF-16, RF-17
  - Crea: `backend/src/app.ts` (§3.5: `express.json({ limit: 102_400, strict: true })`,
    `unknownEndpoint`, `errorHandler` al final, `export default app`; no conecta a la base).
  - Tests primero: `backend/tests/controllers/app.test.ts` con `supertest(app)` (§6.2):
    404 con los seis métodos sobre `/api/inexistente` y `/perfil`; `HEAD` → 404, cabecera
    JSON, cuerpo vacío; 400 con `{"a":`, `42`, `"texto"`, `true`, `null`; cuerpo vacío con
    tipo JSON → 404; `text/plain` → 404; 413 con 102 401 bytes y no 413 con 102 400 bytes
    (medidos con `Buffer.byteLength`); 415 con `Content-Encoding: desconocida` y con
    `charset=iso-8859-1`; 400/413/415 ganan a 404 en ruta inexistente. Cada caso comprueba
    código, `Content-Type` `/application\/json/` y cuerpo con `deepStrictEqual`.
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde (sin MongoDB).

- [x] **T4. Validación pura de la configuración.** RF-1, RF-2, RF-3, RF-10, RF-11, RF-12, RF-15, RF-20, RNF-3
  - Crea: `backend/src/utils/config.ts` con la parte pura (§2.1, §3.1): tipos `NodeEnv`,
    `EnvSource`, `DatabaseConfig`, `Config`, `ConfigResult`; `isBlank`, `parsePort`,
    `isValidHostSyntax`, `parseConfig`, `formatConfigErrors`. Sin efectos al importarse;
    todavía sin `loadConfig` ni dotenv.
  - Tests primero: `backend/tests/unit/config.test.ts`, casos de §6.2 de RF-1, RF-2 (matriz
    por entorno, variables solo de espacios, dos faltantes a la vez, `NODE_ENV` ausente con y
    sin `PORT`), RF-20 (`Test`, `TEST`, `prod`, `dev`, `" test"`, sin exigir variables de
    base), RF-3 (par elegido según entorno; `test` sin `MONGODB_*` y `development` sin
    `TEST_*` válidos), RF-11, RF-10, RF-12 sintáctico (`999.999.1.1`, `256.1.1.1` y
    `"mal host"` inválidos por tener la última etiqueta solo numérica o caracteres no
    permitidos; `localhost`, `0.0.0.0`, `::1` válidos), RF-15 y varios errores a la vez en
    `formatConfigErrors`.
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde.

- [x] **T5. Carga del archivo de variables y archivo de ejemplo.** RF-8, RF-9, RF-21
  - Modifica: `backend/src/utils/config.ts` (añade `loadConfig({ envFilePath, processEnv })`
    según §3.2: `dotenv.config({ path, processEnv, quiet: true })` y `parseConfig`).
  - Crea: `backend/.env.example` (contenido exacto de §1.4).
  - Tests primero: en `backend/tests/unit/config.test.ts`, casos `loadConfig` de §6.2 con
    un `.env` en un directorio temporal (`fs.mkdtemp`) y un objeto `processEnv` propio
    (nunca `process.env`): archivo `NODE_ENV=development` + proceso `test` → entorno `test`
    y base de prueba; proceso `PORT=""` + archivo `PORT=3001` → falta `PORT`; archivo
    inexistente → solo cuenta `processEnv`. `backend/tests/unit/envExample.test.ts` (§6.2,
    RF-9: seis claves exactas, `NODE_ENV === "development"`, `HOST` comentada, válido en
    `development` y en `test`).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde;
    `git check-ignore -v backend/.env` muestra la regla `.env` del `.gitignore` raíz (no se
    modifica `.gitignore`).

- [x] **T6. Funciones puras de arranque.** RF-12, RF-18, RNF-3
  - Crea: `backend/src/server.ts` solo con `describeListenAddress` y `listenFailureMessage`
    (§2.3) y la clase `StartupError` (§3.6, sin propiedades de parámetro).
  - Tests primero: `backend/tests/unit/server.test.ts` (§6.2): `describeListenAddress` con
    IPv4 (`http://127.0.0.1:3001`), IPv6 (`http://[::]:3001`) y `null`;
    `listenFailureMessage` con `host` `null` ("todas las interfaces") y con `203.0.113.1`,
    incluyendo puerto y código.
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde.

- [x] **T7. Conexión a la base y escucha (`startServer`).** RF-3, RF-10, RF-12, RF-13, RF-14, RF-18
  - Modifica: `backend/src/server.ts` (añade `DB_CONNECT_TIMEOUT_MS = 10_000`,
    `connectDatabase`, `listen`, `startServer(config, { app, log })` según §3.6 y D3–D5).
  - Crea: `backend/tests/server/helpers.ts` con `testConfig()` (§6.1: `loadConfig()` y
    `assert` de `nodeEnv === "test"` y `db.name === process.env.TEST_MONGODB_DBNAME`) y
    `getFreePort()`.
  - Tests primero: `backend/tests/server/startup.test.ts` (§6.2, `log` espía): arranque
    resuelve con `mongoose.connection.name === TEST_MONGODB_DBNAME` y conexión abierta antes
    de escuchar; `host: "127.0.0.1"` y `host: null` → dirección real; `log.info` una vez con
    dirección y puerto; puerto ocupado por un `net.Server`, `host: "203.0.113.1"` y
    `host: "noexiste.invalid"` → rechaza con mensaje que contiene puerto / dirección. Cierra
    servidores y `after(() => mongoose.disconnect())`.
  - Hecho cuando: con MongoDB disponible y `backend/.env` copiado del ejemplo, `npm test`,
    `npm run typecheck` y `npm run lint` en verde.

- [x] **T8. Punto de entrada: rama de configuración inválida.** RF-2, RF-11, RF-15, RF-20, RF-21, RNF-1
  - Crea: `backend/src/index.ts` solo con la rama de configuración (§3.6): `loadConfig()`;
    si falla, `process.stderr.write(formatConfigErrors(errors) + "\n")` y `process.exit(1)`.
    La llamada a `startServer` llega en T9.
  - Modifica: `backend/tests/server/helpers.ts` (añade `spawnServer(env, options)`: lanza
    `process.execPath` con la ruta absoluta de `src/index.ts`, `env = { PATH, …env }` sin
    heredar `NODE_ENV`, `cwd` en un directorio temporal, opción para escribir un `.env` en
    él; devuelve código de salida, salida estándar, salida de error y tiempo).
  - Tests primero: `backend/tests/server/process.test.ts`, casos sin base de §6.2: RF-2
    (`test` sin `PORT`; sin `NODE_ENV` ni `PORT`), RF-20 (`Test`, `TEST`, `prod`), RF-11
    (`0`, `65536`, `abc`), RF-15, RF-21 (`.env` con `NODE_ENV=Test` + proceso
    `development` sin `PORT` → nombra `PORT`, no trae el mensaje de RF-20), RNF-1 (entorno
    `test` con `PORT=abc` → el mensaje de configuración aparece en la salida de error).
    Todos: código ≠ 0.
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde.

- [x] **T9. Punto de entrada: arranque y fallos de arranque.** RF-12, RF-13, RF-14, RNF-1
  - Modifica: `backend/src/index.ts` (con configuración válida, `startServer(config,
    { app, log: logger })`; si rechaza, `logger.error(mensaje)` y `process.exit(1)`, según
    §3.6 y D10: en prueba ese mensaje se calla). `backend/tests/server/helpers.ts` (añade
    `waitForPort()` y la posibilidad de terminar un hijo en marcha).
  - Tests primero: en `backend/tests/server/process.test.ts`, casos con base de §6.2:
    matriz (`test` sin `MONGODB_*` arranca; `development` sin `TEST_*` con `MONGODB_*`
    apuntando a la base de prueba arranca); RNF-1 (entorno `test` válido: se espera el
    puerto, se termina el hijo, salida estándar vacía; entorno `test` válido con el puerto
    ocupado → código ≠ 0 y salida de error vacía); RF-12 (`development`, puerto ocupado →
    código ≠ 0 y mensaje con dirección y puerto); RF-13 + RF-14 (`development`,
    `MONGODB_URI=mongodb://127.0.0.1:1` → código ≠ 0, mensaje de base no disponible, tiempo
    entre 10 000 y 12 000 ms, y `ECONNREFUSED` al conectar al `PORT` mientras espera;
    `{ timeout: 20_000 }`).
  - Hecho cuando: con MongoDB disponible, `npm test`, `npm run typecheck` y `npm run lint`
    en verde.

- [x] **T10. Verificación de los criterios de finalización.** RF-1..RF-21, RNF-1..RNF-3
  - No crea código. Solo comprueba; si algo falla, se informa y se vuelve a la tarea
    correspondiente.
  - Pasos (en `backend/`):
    1. Conteo de la base de desarrollo **antes**:
       `mongosh "$MONGODB_URI/$MONGODB_DBNAME" --quiet --eval 'db.getCollectionNames().map(c => [c, db[c].countDocuments()])' > /tmp/antes.txt`
       (con los valores de `backend/.env`).
    2. `npm test` en verde, con `backend/.env` en `NODE_ENV=development` (RF-8, RF-21).
    3. Conteo **después** (mismo comando a `/tmp/despues.txt`) y `diff /tmp/antes.txt /tmp/despues.txt`
       sin diferencias.
    4. `npm run typecheck` y `npm run lint` en verde (RF-19, RNF-2).
    5. `git check-ignore -v backend/.env` muestra la regla `.env` (RF-9); `git status`
       no lista `backend/.env` ni `backend/out`.
    6. `grep -rnE '\.only\b|only:\s*true' src tests`, `grep -rnE '\bany\b' src tests` (revisar
       que no sean tipos `any`) y `grep -rn '@ts-ignore' src tests` sin resultados (RNF-2).
    7. `grep -rn 'console\.' src` solo devuelve `src/utils/logger.ts`.
    8. Recorrer los criterios de finalización de la spec uno a uno y señalar la prueba que
       cubre cada uno (tabla de abajo).
  - Hecho cuando: los ocho pasos se cumplen y cada criterio de finalización de la spec
    tiene una prueba o comprobación en verde.

---

## Cobertura RF/RNF → tareas

| Requisito | Tareas | Verificación principal |
| --- | --- | --- |
| RF-1 | T4 | `unit/config.test.ts` |
| RF-2 | T4, T8 | `unit/config.test.ts`; `server/process.test.ts` |
| RF-3 | T4, T7 | `unit/config.test.ts`; `server/startup.test.ts` |
| RF-4 | T2, T3 | `unit/middleware.test.ts`; `controllers/app.test.ts` |
| RF-5 | T2, T3 | `unit/errors.test.ts`; `controllers/app.test.ts` |
| RF-6 | T2 | `unit/middleware.test.ts`; `unit/errors.test.ts` |
| RF-7 | T2, T3 | `unit/middleware.test.ts`; `controllers/app.test.ts` (HEAD) |
| RF-8 | T1, T5, T10 | script `test`; `unit/config.test.ts` (`loadConfig`); paso 2 de T10 |
| RF-9 | T5, T10 | `unit/envExample.test.ts`; `git check-ignore` |
| RF-10 | T4, T7 | `unit/config.test.ts`; `server/startup.test.ts` |
| RF-11 | T4, T8 | `unit/config.test.ts`; `server/process.test.ts` |
| RF-12 | T4, T6, T7, T9 | `unit/config.test.ts`; `unit/server.test.ts`; `server/startup.test.ts`; `server/process.test.ts` |
| RF-13 | T7, T9 | `server/process.test.ts` (10–12 s) |
| RF-14 | T7, T9 | `server/startup.test.ts`; `server/process.test.ts` (`ECONNREFUSED`) |
| RF-15 | T4, T8 | `unit/config.test.ts`; `server/process.test.ts` |
| RF-16 | T2, T3 | `unit/errors.test.ts`; `controllers/app.test.ts` (102 400 / 102 401) |
| RF-17 | T2, T3 | `unit/errors.test.ts`; `controllers/app.test.ts` |
| RF-18 | T6, T7 | `unit/server.test.ts`; `server/startup.test.ts` |
| RF-19 | T1, T10 | `npm run lint`; `.only` temporal hace fallar el lint |
| RF-20 | T4, T8 | `unit/config.test.ts`; `server/process.test.ts` |
| RF-21 | T5, T8 | `unit/config.test.ts` (`loadConfig`); `server/process.test.ts` |
| RNF-1 | T1, T8, T9 | `unit/logger.test.ts`; `server/process.test.ts` (mensaje de configuración visible; salidas vacías en prueba) |
| RNF-2 | T1, T10 | `npm run typecheck`, `npm run lint`, `npm test`; búsquedas del paso 6 |
| RNF-3 | T2, T4, T6 | `unit/errors.test.ts`; mensajes de §2 en `config.ts` y `server.ts` |

---

## Pendientes para el usuario (fuera de `specs/`, no son tareas de implementación)

- `MEMORY.md`: registrar plan 001 aprobado y `tasks.md` redactado; siguiente paso,
  implementar T1. Al terminar T10, marcar la spec 001 como implementada.
- `AGENTS.md`: comandos del backend `dev | test | typecheck | lint` (quitar `seed`,
  `build` y `build:ui`, que llegan con las specs 007 y 010); estructura de `backend/src/`
  según lo que crea esta spec (`utils/`, `server.ts`, `tests/server/`) (plan §7).
- `spec.md`: pasar el estado a "implementada" cuando T10 quede en verde.
