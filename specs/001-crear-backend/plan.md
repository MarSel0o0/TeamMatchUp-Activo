# Plan 001 — Crear el backend: servidor base, configuración y errores

Estado: aprobado
Spec: `specs/001-crear-backend/spec.md` (aprobada).
Referencia técnica: `specs/_referencia/001-crear-backend-original.md`, solo en lo que toca
a RF-1..RF-21 y RNF-1..RNF-3. Se deja fuera lo excluido por la spec: cookies y
`cookie-parser`, autenticación (JWT, bcrypt), seed, `express.static`, fallback de la SPA,
`requestLogger`, modelos, recursos y sus pruebas, y cualquier cambio en `frontend/`.

Cada sección indica entre corchetes los RF/RNF que cubre. La tabla de trazabilidad
final (sección 9) los reúne todos.

---

## 1. Archivos y responsabilidades

Todos los archivos están en `backend/`, salvo que se diga lo contrario. Se sigue la
estructura 5.1 de la referencia con dos ajustes justificados en la sección 5 (D3 y D12):
`src/server.ts` y `tests/server/`.

```
backend/
├── .env.example
├── eslint.config.js
├── package.json
├── package-lock.json          (lo genera npm)
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── server.ts
│   └── utils/
│       ├── config.ts
│       ├── errors.ts
│       ├── logger.ts
│       └── middleware.ts
└── tests/
    ├── tsconfig.json
    ├── unit/
    │   ├── config.test.ts
    │   ├── envExample.test.ts
    │   ├── errors.test.ts
    │   ├── logger.test.ts
    │   ├── middleware.test.ts
    │   └── server.test.ts
    ├── controllers/
    │   └── app.test.ts
    └── server/
        ├── helpers.ts
        ├── process.test.ts
        └── startup.test.ts
```

| Archivo | Responsabilidad | RF/RNF |
| --- | --- | --- |
| `package.json` | `"type": "module"`, `"engines": { "node": ">=22.18" }`, `"private": true`, scripts `dev`, `test`, `typecheck` y `lint` (sección 1.1), dependencias exactas (sección 1.2). | RF-8, RF-19, RNF-2 |
| `tsconfig.json` | RT-02 de la referencia: `rootDir: ./src`, `outDir: ./out`, `module: nodenext`, `target: esnext`, `strict`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck`, más `erasableSyntaxOnly` (garantiza que todo el código se puede ejecutar con *type stripping*) y `types: ["node"]`. | RNF-2 |
| `tests/tsconfig.json` | RT-18: extiende el principal con `noEmit: true`, `rootDir: ".."` e `include` de `../src` y `.`. | RNF-2 |
| `eslint.config.js` | Configuración plana de ESLint 9 para `src/` y `tests/` (sección 1.3). | RF-19, RNF-2 |
| `.env.example` | Archivo de ejemplo con las seis variables y `HOST` comentada (sección 1.4). | RF-9 |
| `.gitignore` (raíz, **no se modifica**) | Ya contiene `.env`, `.env.*`, `!.env.example`, `out`, `dist` y `node_modules/`. Solo se verifica con `git check-ignore -v backend/.env`. | RF-9 |
| `src/utils/config.ts` | Funciones puras `parseConfig`, `formatConfigErrors` y auxiliares (sección 2); `loadConfig(options)` que carga el archivo de variables con dotenv sin sobrescribir las del proceso y delega en `parseConfig`. Sin efectos al importarse. | RF-1, RF-2, RF-3, RF-10, RF-11, RF-12 (sintaxis de `HOST`), RF-15, RF-20, RF-21 |
| `src/utils/errors.ts` | Constantes de mensajes genéricos y función pura `mapErrorToResponse(error)` → `{ status, error }`. | RF-4, RF-5, RF-6, RF-16, RF-17, RNF-3 |
| `src/utils/logger.ts` | `createLogger({ isSilent, info, error })` y la instancia por defecto `logger` (`info` → `console.log`, `error` → `console.error`), silenciosa cuando `process.env.NODE_ENV === "test"`. Único archivo con `console`. | RF-6, RF-18, RNF-1 |
| `src/utils/middleware.ts` | `unknownEndpoint` (404) y `createErrorHandler(log)` + la instancia `errorHandler` con el `logger` por defecto. | RF-4, RF-5, RF-6, RF-7, RF-16, RF-17 |
| `src/app.ts` | Composición de Express: `express.json({ limit: 102_400, strict: true })`, (lugar de los routers de las specs 002–006), `unknownEndpoint`, `errorHandler`. `export default app`. **No** se conecta a la base. | RF-4, RF-5, RF-7, RF-16, RF-17 |
| `src/server.ts` | `connectDatabase(db)` (timeout 10 s), `listen(app, port, host)` (promesa sobre `http.createServer`), `startServer(config, deps)` que encadena conectar → escuchar → registrar, y funciones puras `describeListenAddress` y `listenFailureMessage`. | RF-3, RF-10, RF-12, RF-13, RF-14, RF-18 |
| `src/index.ts` | Punto de entrada: `loadConfig()` → si falla, mensaje a la salida de error y `process.exit(1)`; si no, `startServer` y, ante su rechazo, mensaje y `process.exit(1)`. Única pieza con efectos de proceso. | RF-2, RF-11, RF-12, RF-13, RF-14, RF-15, RF-20, RNF-1 |
| `tests/unit/*.test.ts` | Pruebas de funciones puras y middlewares invocados directamente (sección 6.2). | ver sección 9 |
| `tests/controllers/app.test.ts` | Pruebas HTTP con `supertest(app)` del 404, JSON mal formado, tamaño y codificación. | RF-4, RF-5, RF-7, RF-16, RF-17 |
| `tests/server/helpers.ts` | `testConfig()` (carga y exige entorno de prueba), `getFreePort()`, `waitForPort()`, `spawnServer(env, options)` con `cwd` en un directorio temporal. No termina en `.test.ts`, así que el comando de pruebas no lo ejecuta como prueba. | — |
| `tests/server/startup.test.ts` | Arranque en el mismo proceso contra la base de prueba. | RF-3, RF-10, RF-12, RF-14, RF-18 |
| `tests/server/process.test.ts` | Arranque como proceso hijo: código de salida, salida de error y tiempos. | RF-2, RF-8, RF-11, RF-12, RF-13, RF-14, RF-15, RF-20, RF-21, RNF-1 |

No se crean `requests/*.rest` en esta spec (D15). No hay cambios en `frontend/`.

### 1.1 Scripts de `package.json` [RF-8, RF-19, RNF-2]

```json
"scripts": {
  "dev": "node --watch src/index.ts",
  "test": "NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tests",
  "lint": "eslint ."
}
```

- `test` fija `NODE_ENV=test` en el entorno del proceso; como dotenv no sobrescribe
  variables existentes, prevalece sobre lo que diga `.env` (RF-8, RF-21). `--test-concurrency=1`
  ejecuta los archivos en serie porque comparten la base de prueba (RF-8).
- `dev` no fija `NODE_ENV`: la toma de `.env` (D14).
- `build`, `start` y `build:ui` no se agregan: pertenecen a la spec 010. `seed` tampoco
  (fuera de alcance).

### 1.2 Dependencias (todas con `npm install --save-exact`) [principio 1]

La versión de la tabla es la propuesta. Antes de instalar, el implementador la confirma con
`npm view <paquete>@<versión> version`; si no existe, usa la última de la misma versión
mayor y la escribe aquí al cerrar la tarea. En `package.json` queda sin `^` ni `~`.

| Paquete | Tipo | Versión propuesta | Justificación (RF) |
| --- | --- | --- | --- |
| `express` | prod | 5.1.0 | Servidor HTTP del stack cerrado (constitución, principio 1). Express 5 propaga rechazos de rutas `async` al manejador de errores (RT-03) y trae `express.json` (body-parser 2), que cubre el límite de 100 kB, el modo estricto y las codificaciones. RF-4, RF-5, RF-7, RF-16, RF-17. |
| `mongoose` | prod | 8.24.5 (mayor 8) | ODM del stack cerrado. Conexión con `dbName` y `serverSelectionTimeoutMS`. RF-3, RF-13, RF-14. Trae sus propios tipos. Se sube de 8.19.1 a 8.24.5 porque `npm audit` en T1 marcó una vulnerabilidad alta (GHSA-wpg9-53fq-2r8h, GHSA-664h-wqgq-64gw; afecta a 8.0.0–8.24.0) corregida en 8.24.5. |
| `dotenv` | prod | 17.2.3 | Carga del archivo de variables sin sobrescribir las del proceso (RT-05; RF-21). Se usa con `quiet: true`, porque la versión 17 escribe un aviso por defecto, lo que rompería RNF-1. Trae sus propios tipos. |
| `typescript` | dev | 5.9.3 | `tsc --noEmit` para la comprobación de tipos (RNF-2). Se exige ≥ 5.8 por `erasableSyntaxOnly`. |
| `@types/node` | dev | la misma exacta que resuelve `frontend/package-lock.json` (mayor 22) | Tipos de `node:http`, `node:net`, `node:test`, `node:child_process`, alineados con Node 22. RNF-2. |
| `@types/express` | dev | 5.0.3 | Tipos de Express 5 (sin `any` en los middlewares). RNF-2. |
| `supertest` | dev | 7.1.4 | Peticiones HTTP a `app` sin abrir un puerto (RT-17). RF-4, RF-5, RF-7, RF-16, RF-17. |
| `@types/supertest` | dev | 6.0.3 | Tipos de supertest. RNF-2. |
| `eslint` | dev | la misma exacta que `frontend/package-lock.json` (mayor 9) | Comando único de lint (RF-19). |
| `@eslint/js` | dev | ídem `eslint` | Reglas recomendadas de JavaScript. RF-19. |
| `typescript-eslint` | dev | la misma exacta que `frontend/package-lock.json` (mayor 8) | Analizador y reglas para TypeScript, incluidas `no-explicit-any` y `ban-ts-comment` (RNF-2). |

No se instalan: `cookie-parser`, `bcrypt`, `jsonwebtoken` y sus tipos (specs 002+), `cors`,
`cross-env` (D19), `globals` (con typescript-eslint, `no-undef` queda desactivada en
archivos TS y no hace falta declarar globales), `node-mocks-http` (D9).

### 1.3 Lint (`eslint.config.js`) [RF-19, RNF-2]

- `ignores`: `out`, `node_modules`.
- `extends`: `js.configs.recommended` y `tseslint.configs.recommended` para `**/*.ts`.
- Reglas adicionales:
  - `@typescript-eslint/consistent-type-imports: error` (RT-02, igual que el frontend).
  - `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_" }]` (el
    `errorHandler` recibe `_request` sin usarlo).
  - `no-console: error` en todo salvo `src/utils/logger.ts` (RT-06).
  - Para `tests/**`: `no-restricted-properties` con `test.only`, `describe.only`,
    `it.only`, y `no-restricted-syntax` con el selector `Property[key.name="only"]`
    (opción `{ only: true }`). Así un `.only` hace fallar `npm run lint` (RNF-2), cosa
    necesaria porque `node --test` sin `--test-only` solo avisa y ejecuta todo.
- `no-explicit-any` y `ban-ts-comment` (prohíbe `@ts-ignore`) ya vienen en `recommended`.

### 1.4 `.env.example` [RF-9]

```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DBNAME=teammatchup
TEST_MONGODB_URI=mongodb://127.0.0.1:27017
TEST_MONGODB_DBNAME=teammatchup_test
# Opcional: dirección de escucha (ej. 0.0.0.0 en el servidor del curso).
# Vacía o comentada: escucha en todas las interfaces.
# HOST=0.0.0.0
```

Los nombres de base distintos hacen que copiar el ejemplo a `.env` y ejecutar las pruebas
no choque con RF-15.

---

## 2. Funciones puras

**Ninguna función de esta spec depende de la fecha ni del reloj: ninguna recibe "hoy".**
El único tiempo que interviene es el plazo de conexión de 10 s (RF-13), que es una constante
que se pasa al controlador de MongoDB, no una lectura del reloj dentro de la lógica.

Todas son puras: reciben datos y devuelven datos, sin leer `process.env`, sin E/S y sin
lanzar excepciones por casos previstos. Viven en `src/utils/` y `src/server.ts`, no en
`src/domain/` (D16).

### 2.1 `src/utils/config.ts`

```ts
type NodeEnv = "development" | "test" | "production";
type EnvSource = Readonly<Record<string, string | undefined>>;

interface DatabaseConfig { uri: string; name: string }
interface Config {
  nodeEnv: NodeEnv;
  port: number;
  host: string | null;       // null = todas las interfaces
  db: DatabaseConfig;        // ya elegida según el entorno
}
type ConfigResult =
  | { ok: true; config: Config }
  | { ok: false; errors: string[] };

const NODE_ENVS: readonly NodeEnv[] = ["development", "test", "production"];

function isBlank(value: string | undefined): boolean          // RF-2, RF-10
function parsePort(raw: string): number | null                // RF-11
function isValidHostSyntax(host: string): boolean             // RF-12 (parte sintáctica)
function parseConfig(env: EnvSource): ConfigResult            // RF-1, 2, 3, 10, 11, 12, 15, 20
function formatConfigErrors(errors: readonly string[]): string // RF-2, 11, 12, 15, 20
```

- `isBlank`: `undefined`, `""` o solo espacios → `true`.
- `parsePort`: acepta solo `/^[0-9]+$/` y valor entre 1 y 65535; si no, `null`. Así `0`,
  `65536`, `3001.5`, `-1`, `abc` y `" 3001"` son inválidos (los valores no se recortan,
  D18).
- `isValidHostSyntax`: `net.isIP(host) !== 0` o nombre de máquina RFC 1123 (etiquetas de
  1 a 63 caracteres `[A-Za-z0-9-]`, sin guion al inicio ni al final, separadas por puntos,
  total ≤ 253, y la **última etiqueta no puede ser solo numérica**, según RFC 1123 §2.1 y
  RFC 3696 §2). Así, `999.999.1.1` y `256.1.1.1` no son IP válidas ni nombres válidos y se
  rechazan; `999.999.1.1x` sí es un nombre válido. `net.isIP` es una función pura de la
  biblioteca estándar.
- Mensajes (en español, minúscula inicial, sin punto final; RNF-3):
  - faltantes: `faltan variables de entorno obligatorias: NODE_ENV, PORT`
  - RF-20: `NODE_ENV debe ser exactamente development, test o production`
  - RF-11: `PORT debe ser un número entero entre 1 y 65535`
  - RF-12 sintáctico: `HOST no es una dirección válida: no se puede escuchar en <HOST>:<PORT>`
  - RF-15: `la base de prueba no puede ser la de desarrollo: TEST_MONGODB_URI y TEST_MONGODB_DBNAME coinciden con MONGODB_URI y MONGODB_DBNAME`
- `formatConfigErrors` antepone `configuración inválida, el servidor no arranca:` y pone
  cada error en una línea.

### 2.2 `src/utils/errors.ts`

```ts
const MESSAGES = {
  unknownEndpoint: "endpoint desconocido",
  malformedJson: "JSON mal formado",
  payloadTooLarge: "cuerpo demasiado grande",
  unsupportedEncoding: "codificación no soportada",
  internal: "error interno del servidor",
} as const;

interface ErrorResponse { status: number; error: string }

function mapErrorToResponse(error: unknown): ErrorResponse   // RF-5, 6, 16, 17
```

### 2.3 `src/server.ts` (parte pura)

```ts
function describeListenAddress(address: AddressInfo | string | null): string   // RF-18
function listenFailureMessage(host: string | null, port: number, code: string | undefined): string // RF-12
```

- `describeListenAddress({ address: "::", port: 3001, family: "IPv6" })` →
  `http://[::]:3001`; `{ address: "127.0.0.1", port: 3001 }` → `http://127.0.0.1:3001`.
- `listenFailureMessage(null, 3001, "EADDRINUSE")` →
  `no se pudo escuchar en todas las interfaces, puerto 3001 (EADDRINUSE)`;
  con host `203.0.113.1` → `no se pudo escuchar en 203.0.113.1, puerto 3001 (EADDRNOTAVAIL)`.

---

## 3. Algoritmo (pseudocódigo)

### 3.1 `parseConfig(env)` [RF-1, RF-2, RF-3, RF-10, RF-11, RF-12, RF-15, RF-20]

```
errors ← []
missing ← []

rawEnv ← env.NODE_ENV
nodeEnv ← null
si isBlank(rawEnv):            missing.push("NODE_ENV")                 # RF-2
si no, si rawEnv ∉ NODE_ENVS:  errors.push(mensaje RF-20)               # comparación exacta
si no:                         nodeEnv ← rawEnv

si isBlank(env.PORT):          missing.push("PORT")
si no:
    port ← parsePort(env.PORT)
    si port = null:            errors.push(mensaje RF-11)

host ← isBlank(env.HOST) ? null : env.HOST                              # RF-10
si host ≠ null y port ≠ null y no isValidHostSyntax(host):
    errors.push(mensaje RF-12 sintáctico)

si nodeEnv ≠ null:                                                      # solo con entorno válido
    [uriKey, nameKey] ← nodeEnv = "test"
        ? ["TEST_MONGODB_URI", "TEST_MONGODB_DBNAME"]                   # RF-3
        : ["MONGODB_URI", "MONGODB_DBNAME"]
    para key en [uriKey, nameKey]: si isBlank(env[key]): missing.push(key)

    si nodeEnv = "test"                                                 # RF-15
       y ninguno de los cuatro está vacío
       y env.TEST_MONGODB_URI = env.MONGODB_URI                         # tal como están escritos
       y env.TEST_MONGODB_DBNAME = env.MONGODB_DBNAME:
        errors.push(mensaje RF-15)

si missing no vacío: errors.unshift(mensaje de faltantes con missing.join(", "))
si errors no vacío: devolver { ok: false, errors }
devolver { ok: true, config: { nodeEnv, port, host, db: { uri: env[uriKey], name: env[nameKey] } } }
```

Con `NODE_ENV` ausente o inválida no se miran las variables de base (caso límite). `PORT`
se evalúa siempre porque es obligatoria en todos los entornos (RF-2). Todos los errores se
juntan en un solo mensaje.

### 3.2 `loadConfig(options)` [RF-1, RF-21]

```
loadConfig({ envFilePath = resolve(process.cwd(), ".env"), processEnv = process.env } = {}):
    dotenv.config({ path: envFilePath, processEnv, quiet: true })
        # completa solo las claves que processEnv no tiene (definidas aunque estén
        # vacías cuentan como existentes) → el entorno del proceso prevalece (RF-21)
        # si el archivo no existe, dotenv devuelve un error sin lanzar: se ignora
    devolver parseConfig(processEnv)
```

En producción `processEnv` es `process.env`, así que el `logger` ve el mismo `NODE_ENV`.
Las pruebas pasan un objeto propio y una ruta temporal, sin tocar `process.env`.

### 3.3 `mapErrorToResponse(error)` [RF-5, RF-6, RF-16, RF-17]

```
type ← (error es objeto no nulo y error.type es string) ? error.type : undefined
según type:
    "entity.parse.failed"                       → { 400, "JSON mal formado" }
    "entity.too.large"                          → { 413, "cuerpo demasiado grande" }
    "encoding.unsupported", "charset.unsupported" → { 415, "codificación no soportada" }
    cualquier otro (incluye undefined)          → { 500, "error interno del servidor" }
```

`express.json` con `strict: true` produce `entity.parse.failed` tanto con JSON inválido como
con JSON válido que no empieza por `{` ni `[` (número, texto, `true`, `null`) (RF-5). Los
demás errores de body-parser (por ejemplo `request.size.invalid`) son no previstos y dan 500
(RF-6). Las specs siguientes agregan aquí sus casos (CastError, ValidationError, JWT…).

### 3.4 Middlewares [RF-4, RF-6, RF-7]

```
unknownEndpoint(_request, response):
    response.status(404).json({ error: "endpoint desconocido" })

createErrorHandler(log) → (error: unknown, _request: unknown, response: JsonResponder, next):
    si response.headersSent: devolver next(error)       # no se puede reescribir: Express cierra la conexión
    { status, error: message } ← mapErrorToResponse(error)
    si status = 500: log.error("error no previsto:", error)   # detalle solo al registro (RF-6)
    response.status(status).json({ error: message })
```

`JsonResponder` es una interfaz mínima propia
(`headersSent: boolean; status(code: number): JsonResponder; json(body: unknown): unknown`)
a la que `Response` de Express es asignable sin conversiones (D9). `response.json` fija el
tipo de contenido JSON (RF-7). En HEAD, Node descarta el cuerpo y se mantienen el código y
las cabeceras (RF-7).

### 3.5 `app.ts` (orden) [RF-4, RF-5, RF-7, RF-16, RF-17]

```
app ← express()
1. app.use(express.json({ limit: 102_400, strict: true }))   # 102 400 bytes exactos (RF-16)
2. (routers /api/... de las specs 002–006)
3. app.use(unknownEndpoint)                                  # cualquier método y ruta (RF-4)
4. app.use(errorHandler)                                     # siempre el último
export default app
```

El cuerpo se interpreta antes de buscar la ruta, así que 400/413/415 ganan sobre 404 (caso
límite). `express.json` solo actúa con `Content-Type: application/json`; otros tipos pasan sin
error; un cuerpo vacío no se interpreta y la petición sigue (caso límite).

### 3.6 Arranque: `startServer` e `index.ts` [RF-10, RF-12, RF-13, RF-14, RF-18]

```
DB_CONNECT_TIMEOUT_MS ← 10_000

connectDatabase(db):
    await mongoose.connect(db.uri, { dbName: db.name, serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS })

listen(app, port, host):
    server ← http.createServer(app)
    devolver promesa:
        server.once("listening", → resolve(server))
        server.once("error", e → reject(new StartupError(listenFailureMessage(host, port, e.code))))
        host = null ? server.listen(port) : server.listen(port, host)       # RF-10

startServer(config, { app, log }):
    try await connectDatabase(config.db)                                   # RF-14: antes de escuchar
    catch → throw new StartupError("la base de datos no está disponible: no se pudo conectar en 10 s")  # RF-13
    try server ← await listen(app, config.port, config.host)
    catch e → await mongoose.disconnect(); throw e                         # RF-12
    log.info(`servidor escuchando en ${describeListenAddress(server.address())}`)  # RF-18
    devolver server

index.ts (main):
    result ← loadConfig()
    si no result.ok:
        process.stderr.write(formatConfigErrors(result.errors) + "\n")    # siempre visible (RNF-1)
        process.exit(1)
    try await startServer(result.config, { app, log: logger })
    catch e:
        logger.error(e instanceof Error ? e.message : String(e))           # RF-12, RF-13: por el logger,
                                                                           # callado en prueba (RNF-1, D10)
        process.exit(1)
```

- El mensaje de base no disponible no incluye `MONGODB_URI` porque puede llevar
  credenciales (principio 5; D17).
- `StartupError` es una subclase de `Error` sin propiedades de parámetro (compatible con
  `erasableSyntaxOnly`).
- En Linux, `process.stderr` es síncrono con tuberías y archivos, así que el mensaje se
  escribe completo antes de `process.exit(1)`.

---

## 4. Interfaz

Esta spec **no tiene interfaz gráfica y no cambia nada en `frontend/`**. La superficie
visible es:

| Superficie | Contenido | RF/RNF |
| --- | --- | --- |
| Respuestas HTTP de error | `Content-Type: application/json; charset=utf-8` y cuerpo exacto `{ "error": "<mensaje>" }`: 404 `endpoint desconocido`, 400 `JSON mal formado`, 413 `cuerpo demasiado grande`, 415 `codificación no soportada`, 500 `error interno del servidor`. HEAD: mismo código y cabeceras, sin cuerpo. | RF-4..RF-7, RF-16, RF-17, RNF-3 |
| Salida de error al no arrancar | Mensaje en español: lista de errores de configuración (siempre visible, también en prueba), base no disponible o dirección/puerto no utilizable (estos dos por el `logger`: visibles en desarrollo y producción, callados en prueba). | RF-2, RF-11, RF-12, RF-13, RF-15, RF-20, RNF-1 |
| Código de salida | `1` en todo arranque fallido; el proceso nunca llega a aceptar conexiones. | RF-2, RF-11..RF-15, RF-20 |
| Registro del servidor (salida estándar) | `servidor escuchando en http://<dirección>:<puerto>` al quedar escuchando; detalle de cada error 500 en la salida de error. Nada en entorno de prueba. | RF-6, RF-18, RNF-1 |

---

## 5. Decisiones técnicas

| # | Decisión | Alternativa descartada y por qué | RF |
| --- | --- | --- | --- |
| D1 | Cargar `.env` con **dotenv** (`config({ path, processEnv, quiet: true })`), que no sobrescribe variables existentes. | `node --env-file-if-exists` o `process.loadEnvFile`/`util.parseEnv` (sin dependencia): la carga dependería de la bandera en cada script y en cada proceso hijo de prueba, `util.parseEnv` sigue en desarrollo activo en Node 22, y el equipo eligió dotenv (RT-05). Con dotenv, `loadConfig` recibe la ruta y el objeto destino y se prueba en el mismo proceso. | RF-21 |
| D2 | `config.ts` sin efectos al importarse: `parseConfig` pura + `loadConfig` explícita, que devuelve errores en lugar de lanzar. | `config.ts` que lee `process.env` y lanza al importarse (apunte, RT-05): impediría probar cada combinación de variables sin procesos hijos y obligaría a tener `.env` válido para importar cualquier módulo. | RF-1, RF-2, RF-11, RF-15, RF-20 |
| D3 | Conexión a MongoDB en `src/server.ts`, invocada desde `index.ts` antes de `listen`; `app.ts` solo compone Express. | Conexión en `app.ts` al importarse (referencia, RT-04 y 5.5): no se puede esperar a que termine antes de escuchar, y cualquier `import app` abriría una conexión. Las pruebas de las specs siguientes conectarán con `connectDatabase(testConfig().db)` en `before`. | RF-13, RF-14 |
| D4 | `http.createServer(app)` + `server.listen` con escuchadores `listening`/`error` envueltos en una promesa. | `app.listen(port, cb)`: en Express 5 el callback también recibe el error y mezcla los dos casos; con los eventos de Node el rechazo y el `code` (`EADDRINUSE`, `EADDRNOTAVAIL`, `ENOTFOUND`) quedan explícitos. | RF-10, RF-12 |
| D5 | Plazo de conexión con `serverSelectionTimeoutMS: 10_000` del controlador. | `Promise.race` con un `setTimeout` propio: el controlador seguiría reintentando de fondo y el proceso podría no terminar; con la opción del controlador, el propio `connect` rechaza a los 10 s. | RF-13 |
| D6 | `express.json({ limit: 102_400, strict: true })` con el límite en bytes. | Límite como `"100kb"` (depende de cómo `bytes` interprete la unidad) o un analizador propio con `express.text` + `JSON.parse` (reimplementa límite, codificaciones y juego de caracteres). | RF-5, RF-16, RF-17 |
| D7 | `errorHandler` recibe `error: unknown` y delega en `mapErrorToResponse`, que distingue por la propiedad `type` de body-parser. | Tipo estructural `{ name; message; code?; … }` de la referencia 5.7: supone una forma que un valor lanzado arbitrario no cumple. Distinguir por `error.name === "SyntaxError"` (apunte): no separa 413 ni 415. | RF-5, RF-6, RF-16, RF-17 |
| D8 | `createErrorHandler(log)` y `createLogger(...)` reciben sus dependencias; `middleware.ts` exporta la instancia con el `logger` real. | Usar siempre el `logger` global: en prueba es silencioso (RNF-1), así que no habría forma de comprobar que el detalle del 500 llega al registro (RF-6) sin espiar `console`. | RF-6, RNF-1 |
| D9 | `JsonResponder`, interfaz mínima propia, para que la prueba directa del `errorHandler` use un objeto simple sin conversiones. | `node-mocks-http` (dependencia nueva sin RF que la exija) o `as unknown as Response` (prohibido en la sección 10 de la referencia). | RF-6, RF-7, RNF-2 |
| D10 | El mensaje de configuración inválida se escribe con `process.stderr.write` en `index.ts`, fuera del `logger`, para que se vea siempre. Los mensajes de base no disponible (RF-13) y de dirección/puerto no utilizable (RF-12) van por `logger.error`: se ven en desarrollo y producción y se callan en prueba; el código de salida sigue siendo 1 (decisión del usuario, lectura literal de RNF-1). | Pasar el de configuración por `logger.error`: quedaría silenciado en prueba, en contra de RNF-1. Escribir también los de RF-12 y RF-13 directo a la salida de error (verlos siempre): RNF-1 solo exime del silencio en prueba al mensaje de configuración inválida. | RF-2, RF-12, RF-13, RNF-1 |
| D11 | El `logger` por defecto decide si calla leyendo `process.env.NODE_ENV === "test"` al registrar cada mensaje (RT-06). `loadConfig` completa `process.env` desde `.env`, así que el valor coincide con el de la configuración. | Configurar el `logger` desde `Config`: añade estado mutable de módulo y no sirve para lo que se registre antes de cargar la configuración. | RNF-1 |
| D12 | Las pruebas de arranque fallido lanzan `src/index.ts` como **proceso hijo** (`process.execPath`), con `env` explícito (sin heredar `NODE_ENV`) y `cwd` en un directorio temporal sin `.env`, salvo cuando la prueba escribe uno. Se agrega la carpeta `tests/server/`. | Simular `process.exit` en el mismo proceso: no comprueba el código de salida real, ni que nunca se aceptan conexiones, ni el tiempo real de RF-13. | RF-2, RF-11..RF-15, RF-20, RF-21 |
| D13 | ESLint 9 con `typescript-eslint` `recommended` (sin información de tipos) + `no-console` + prohibición de `.only`. | `recommendedTypeChecked`: más lento y exige un `projectService` que cubra los dos `tsconfig`; se puede adoptar en una spec posterior. Sin ESLint: no se cumpliría RF-19. | RF-19, RNF-2 |
| D14 | `dev` no fija `NODE_ENV`; la toma de `.env` (`NODE_ENV=development` en el ejemplo). | `NODE_ENV=development node --watch …` (referencia): haría inútil la variable del archivo y ocultaría el caso "falta `NODE_ENV`" al usar el comando habitual. Solo `test` la fija, porque RF-8 lo exige. | RF-2, RF-8 |
| D15 | Sin `requests/*.rest` en esta spec. | Crear `requests/app.rest`: no hay recursos que probar a mano, y los casos de error ya tienen pruebas automáticas. Se agregan con los recursos (specs 002+). | — |
| D16 | Funciones puras de infraestructura (`config`, `errors`, dirección de escucha) en `src/utils/` y `src/server.ts`, probadas en `tests/unit/`. | Ponerlas en `src/domain/`: esa carpeta es la copia del dominio del frontend (reglas del producto); mezclarla con infraestructura rompería la correspondencia. Siguen cumpliendo el principio 3: puras, sin HTTP ni reloj. | RF-1..RF-3, RF-5, RF-6, RF-11, RF-15..RF-18, RF-20 |
| D17 | Los mensajes de arranque no muestran `MONGODB_URI` ni `TEST_MONGODB_URI`. | Incluir la URI para orientar: puede contener usuario y contraseña (principio 5, secretos solo en `.env`). | RF-13, RF-15 |
| D18 | Los valores no se recortan: los espacios solo cuentan para decidir si una variable está vacía. `" 3001"` es un `PORT` inválido; `HOST` con espacios no pasa la validación sintáctica. | Recortar todos los valores: contradiría la comparación exacta de `NODE_ENV` (RF-20) y la de RF-15 "tal como están escritos". (dotenv ya recorta los valores sin comillas del archivo.) | RF-2, RF-11, RF-15, RF-20 |
| D19 | `NODE_ENV=test` en línea en el script `test` (shell POSIX: Linux, macOS, WSL o Git Bash). | `cross-env`: dependencia nueva solo por Windows `cmd`; quien use Windows puede configurar `npm config set script-shell` a bash. | RF-8 |
| D20 | La sintaxis de `HOST` (IP o nombre RFC 1123) se valida en `parseConfig`; que la dirección exista o esté asignada y que el puerto esté libre se detecta al escuchar. | Validarlo todo al escuchar: un `HOST` mal escrito con la base caída daría el mensaje de base y no el de configuración (caso límite). Exigir solo IP con `net.isIP`: rechazaría `localhost`. Para nombres se aplica la regla del estándar (la última etiqueta no es solo numérica, RFC 1123 §2.1 / RFC 3696 §2); se descarta una regla propia extra que rechace nombres "parecidos a una IPv4 mal escrita" (p. ej. `999.999.1.1x`), porque no viene del estándar y es arbitraria. | RF-12, RF-14 |

---

## 6. Estrategia de pruebas

### 6.1 Marco

- `node:test` (`describe`, `test`, `before`, `after`, `mock`) y `node:assert/strict`
  (`strictEqual`, `deepStrictEqual`, `match`, `rejects`), RT-17. `supertest(app)` para HTTP.
- `npm test` = `NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'` (RF-8).
- Tests primero: cada tarea escribe sus pruebas en rojo antes del código (principio 4).
- Prerrequisito: MongoDB disponible en `TEST_MONGODB_URI`. Sin él, `startup.test.ts` y
  parte de `process.test.ts` fallan, así que el comando no termina en verde (caso límite).
- Protección de la base de desarrollo: `testConfig()` llama a `loadConfig()` y falla con
  `assert` si `nodeEnv !== "test"` o si `db.name !== process.env.TEST_MONGODB_DBNAME`. Los
  procesos hijos reciben solo la base de prueba o una URI inalcanzable
  (`mongodb://127.0.0.1:1`). Ninguna prueba escribe en la base: en esta spec solo se
  conecta.
- Cada archivo que conecta cierra con `after(() => mongoose.disconnect())` y cierra los
  servidores que abre.
- Las pruebas que esperan RF-13 declaran `{ timeout: 20_000 }`.

### 6.2 Casos por archivo

**`tests/unit/config.test.ts`** (puro, sin base)
- RF-1: `parseConfig` con un objeto devuelve `port`, `host` y `db` tomados de ese objeto;
  al cambiar los valores cambia la configuración (sin valores por defecto escritos en el
  código).
- RF-2: por entorno (`development`, `production`, `test`), sin cada variable obligatoria
  de la matriz, y con cada una solo de espacios → `ok: false` y el mensaje la nombra; sin
  dos a la vez → las nombra ambas.
- RF-2: sin `NODE_ENV` → nombra `NODE_ENV`; sin `NODE_ENV` ni `PORT` → nombra ambas y
  ninguna variable de base.
- RF-20: `Test`, `TEST`, `prod`, `dev`, `" test"` → mensaje con `NODE_ENV`, `development`,
  `test` y `production`; no se exigen variables de base.
- RF-3: en `test` → `db` = par `TEST_`; en `development` y `production` → par sin prefijo.
  En `test` sin `MONGODB_*` → `ok: true`; en `development` sin `TEST_*` → `ok: true`.
- RF-11: `0`, `65536`, `3001.5`, `-1`, `abc` → mensaje con `PORT` y `1` y `65535`; `1` y
  `65535` válidos.
- RF-10: `HOST` ausente, `""` o `"   "` → `host: null`; `127.0.0.1` → `"127.0.0.1"`.
- RF-12 (sintaxis): `HOST=999.999.1.1`, `256.1.1.1`, `"mal host"` → mensaje con la
  dirección y el puerto; `localhost`, `0.0.0.0`, `::1` válidos.
- RF-15: en `test` con los dos pares iguales → error; solo la URI igual y distinto nombre
  → `ok: true`; sin variables de desarrollo → `ok: true`.
- Varios errores a la vez (por ejemplo `PORT=abc` y `NODE_ENV=prod`) → todos en
  `formatConfigErrors`.
- RF-21 y RF-8 con `loadConfig({ envFilePath, processEnv })` y un `.env` temporal:
  archivo con `NODE_ENV=development` y `processEnv.NODE_ENV="test"` → entorno `test` y base
  de prueba; `processEnv.PORT=""` con `PORT=3001` en el archivo → falta `PORT`; archivo
  inexistente → solo cuenta `processEnv`.

**`tests/unit/errors.test.ts`**
- RF-5: `{ type: "entity.parse.failed" }` → `{ 400, "JSON mal formado" }`.
- RF-16: `entity.too.large` → 413; RF-17: `encoding.unsupported` y `charset.unsupported` →
  415.
- RF-6: `new Error("E11000 secreto")`, `"texto"`, `null`, `{ type: "otro" }` → `{ 500,
  "error interno del servidor" }`, sin el mensaje original.
- RNF-3: cada mensaje genérico de `MESSAGES` empieza en minúscula (salvo la sigla `JSON`)
  y no termina en punto.

**`tests/unit/middleware.test.ts`** (handler invocado directamente, sin ruta de prueba)
- RF-6: `createErrorHandler(spyLog)` con `new Error("detalle interno")` y un
  `JsonResponder` falso → `status(500)` y `json` con exactamente
  `{ error: "error interno del servidor" }`; el cuerpo no contiene `detalle interno` ni
  `stack`; `spyLog.error` se llamó una vez con el error original.
- RF-7: con `headersSent: true` → `next` se llama con el mismo error y no se llaman
  `status` ni `json`.
- Errores 4xx (`entity.parse.failed`) → no llaman a `spyLog.error`.

**`tests/unit/logger.test.ts`**
- RNF-1: `createLogger({ isSilent: () => true, … })` no llama a sus salidas;
  `isSilent: () => false` sí, con los argumentos recibidos.
- RNF-1: durante `npm test` (`NODE_ENV=test`), el `logger` por defecto con
  `mock.method(console, "log")` y `mock.method(console, "error")` no genera llamadas.

**`tests/unit/envExample.test.ts`**
- RF-9: `backend/.env.example` existe; `dotenv.parse` devuelve exactamente las seis claves,
  con `NODE_ENV === "development"`; `HOST` no es una clave activa y hay una línea que
  coincide con `/^#\s*HOST=/m`; `parseConfig` con esos valores es válida en `development` y
  en `test` (no choca con RF-15).

**`tests/unit/server.test.ts`**
- RF-18: `describeListenAddress` con IPv4, IPv6 (`[::]`) y `null`.
- RF-12: `listenFailureMessage` incluye la dirección (o "todas las interfaces") y el puerto.

**`tests/controllers/app.test.ts`** (supertest, sin base). En cada caso se comprueba el
código, `Content-Type` que coincide con `/application\/json/` y el cuerpo con
`deepStrictEqual`.
- RF-4: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS` sobre `/api/inexistente` y
  `/perfil` → 404 `{ error: "endpoint desconocido" }`.
- RF-7: `HEAD /api/inexistente` → 404, cabecera JSON y cuerpo vacío.
- RF-5: `{"a":` → 400; `42`, `"texto"`, `true`, `null` con `Content-Type: application/json` →
  400 `JSON mal formado`; cuerpo vacío con tipo JSON → 404 (aceptado); `text/plain` con
  `no json` → 404.
- RF-16: JSON válido de exactamente 102 401 bytes → 413 `cuerpo demasiado grande`; de
  102 400 bytes → no 413 (404). El cuerpo se arma como `{"a":"xxx…"}` y se mide con
  `Buffer.byteLength`.
- RF-17: `Content-Encoding: desconocida` → 415; `Content-Type: application/json;
  charset=iso-8859-1` → 415 `codificación no soportada`.
- Orden: JSON mal formado, cuerpo demasiado grande o codificación no soportada a una ruta
  inexistente → 400, 413 y 415, no 404.

**`tests/server/startup.test.ts`** (mismo proceso, base de prueba, `log` espía)
- RF-3 / RF-14: `startServer(testConfig() con puerto libre)` → resuelve,
  `mongoose.connection.name === TEST_MONGODB_DBNAME` y la conexión ya estaba abierta al
  escuchar.
- RF-10: con `host: "127.0.0.1"` → `server.address().address === "127.0.0.1"`; con
  `host: null` → `"::"` o `"0.0.0.0"`.
- RF-18: `log.info` se llamó una vez con la dirección y el puerto reales.
- RF-12: puerto ocupado (un `net.Server` lo toma antes) → rechaza con un mensaje que
  contiene el puerto; `host: "203.0.113.1"` (TEST-NET-3, no asignada) → rechaza con un
  mensaje que contiene esa dirección; `host: "noexiste.invalid"` → rechaza.

**`tests/server/process.test.ts`** (proceso hijo: `node <ruta absoluta>/src/index.ts`,
`cwd` temporal, `env = { PATH, …variables de la prueba }`)
- RF-2: entorno `test` sin `PORT` → código ≠ 0 y la salida de error nombra `PORT`; sin
  `NODE_ENV` ni `PORT` → nombra ambas.
- RF-20: `NODE_ENV=Test`, `TEST` y `prod` → código ≠ 0 y el mensaje nombra `NODE_ENV`,
  `development`, `test` y `production`.
- RF-11: `PORT=0`, `65536`, `abc` → código ≠ 0 y mensaje con `PORT`.
- RF-15: entorno `test` con `TEST_*` iguales a `MONGODB_*` → código ≠ 0 y mensaje de base
  de prueba.
- RF-21: `.env` temporal con `NODE_ENV=Test` y proceso con `NODE_ENV=development` y sin
  `PORT` → el mensaje nombra `PORT` y no trae el de RF-20.
- RNF-1: entorno `test` con `PORT=abc` → el mensaje de configuración aparece. Entorno
  `test` válido (base de prueba, puerto libre): se espera a que el puerto acepte conexiones
  (`waitForPort`), se termina el hijo y la salida estándar queda vacía.
- Matriz: entorno `test` sin `MONGODB_*` arranca; entorno `development` sin `TEST_*` y con
  `MONGODB_*` apuntando a la base de prueba arranca (en ambos se espera el puerto y se
  termina el hijo).
- RF-12: entorno `development` apuntando a la base de prueba con el puerto ocupado por la
  prueba → código ≠ 0 y salida de error con dirección y puerto.
- RF-13 + RF-14: entorno `development` con `MONGODB_URI=mongodb://127.0.0.1:1` → código
  ≠ 0, mensaje de base no disponible y tiempo entre el lanzamiento y la salida ≥ 10 000 ms
  y ≤ 12 000 ms; mientras espera, conectar por TCP al `PORT` da `ECONNREFUSED`.

- RNF-1 (D10): entorno `test` válido (base de prueba) con el puerto ocupado por la prueba →
  código ≠ 0 y salida de error vacía (el mensaje de RF-12 se calla en prueba).

Las pruebas de RF-12 y RF-13 usan `NODE_ENV=development` para que el mensaje sea visible,
porque en prueba esos mensajes se callan (D10).

### 6.3 Verificaciones fuera de `npm test` (fase de validación)

- RF-19 / RNF-2: `npm run typecheck` y `npm run lint` en verde. Prueba manual: añadir un
  `test.only` temporal → `npm run lint` falla; quitarlo.
- RF-9: `git check-ignore -v backend/.env` muestra la regla `.env` del `.gitignore` raíz.
- Base de desarrollo intacta (criterio de finalización): antes y después de `npm test`,
  contar documentos por colección de la base de desarrollo, por ejemplo con
  `mongosh "$MONGODB_URI/$MONGODB_DBNAME" --quiet --eval 'db.getCollectionNames().map(c => [c, db[c].countDocuments()])'`,
  y comparar ambas salidas (deben ser idénticas). No se automatiza dentro de `npm test`,
  porque las pruebas no deben conectarse a la base de desarrollo.
- RNF-2: búsqueda de `.only`, `any` y `@ts-ignore` en `src/` y `tests/` sin resultados.

---

## 7. Notas para otros documentos (no se editan en esta fase)

- `AGENTS.md`: la lista de comandos del backend incluye `seed` (fuera de alcance; la spec 007
  lo elimina) y `build`/`build:ui` (spec 010), y no incluye `lint`. Hay que actualizarla a
  `dev | test | typecheck | lint` al implementar esta spec.
- `AGENTS.md` describe `backend/src/` con `controllers/`, `models/`, `domain/`,
  `services/`, `scripts/` y `types/`; esta spec solo crea `utils/` y añade `server.ts` y
  `tests/server/`. Las demás carpetas llegan con sus specs.
- `MEMORY.md`: al aprobarse el plan, registrar la fase (plan 001 aprobado, siguiente paso
  `tasks.md`). El planificador no puede escribir fuera de `specs/`.

---

## 8. Preguntas abiertas

Ninguna. La antigua P1 (mensajes de RF-12 y RF-13 en el entorno de prueba) quedó resuelta
por el usuario con la opción (b): solo el mensaje de configuración inválida se ve siempre;
los de RF-12 y RF-13 van por el `logger` y se callan en prueba (D10, sección 3.6).

---

## 9. Trazabilidad

| Requisito | Archivo(s) | Prueba(s) |
| --- | --- | --- |
| RF-1 | `utils/config.ts` | `unit/config.test.ts` (RF-1) |
| RF-2 | `utils/config.ts`, `index.ts` | `unit/config.test.ts`; `server/process.test.ts` (RF-2) |
| RF-3 | `utils/config.ts`, `server.ts` | `unit/config.test.ts` (RF-3); `server/startup.test.ts` (nombre de base) |
| RF-4 | `utils/middleware.ts`, `utils/errors.ts`, `app.ts` | `controllers/app.test.ts` (RF-4) |
| RF-5 | `app.ts` (`strict: true`), `utils/errors.ts`, `utils/middleware.ts` | `unit/errors.test.ts`; `controllers/app.test.ts` (RF-5) |
| RF-6 | `utils/middleware.ts`, `utils/errors.ts`, `utils/logger.ts` | `unit/middleware.test.ts`; `unit/errors.test.ts` |
| RF-7 | `utils/middleware.ts`, `app.ts` | `controllers/app.test.ts` (HEAD y tipo de contenido); `unit/middleware.test.ts` (`headersSent`) |
| RF-8 | `package.json` (`test`), `utils/config.ts` (D1) | `unit/config.test.ts` (`.env` en development + proceso en test); ejecución de `npm test` |
| RF-9 | `.env.example`, `.gitignore` raíz (sin cambios) | `unit/envExample.test.ts`; `git check-ignore` (6.3) |
| RF-10 | `utils/config.ts`, `server.ts` (`listen`) | `unit/config.test.ts`; `server/startup.test.ts` (RF-10) |
| RF-11 | `utils/config.ts`, `index.ts` | `unit/config.test.ts`; `server/process.test.ts` (RF-11) |
| RF-12 | `utils/config.ts` (sintaxis), `server.ts`, `index.ts` | `unit/config.test.ts`; `unit/server.test.ts`; `server/startup.test.ts`; `server/process.test.ts` (RF-12) |
| RF-13 | `server.ts` (`serverSelectionTimeoutMS`), `index.ts` | `server/process.test.ts` (10–12 s) |
| RF-14 | `server.ts` (orden conectar → escuchar), `index.ts` | `server/process.test.ts` (`ECONNREFUSED` mientras espera); `server/startup.test.ts` |
| RF-15 | `utils/config.ts`, `index.ts` | `unit/config.test.ts`; `server/process.test.ts` (RF-15) |
| RF-16 | `app.ts` (`limit: 102_400`), `utils/errors.ts` | `unit/errors.test.ts`; `controllers/app.test.ts` (102 400 / 102 401) |
| RF-17 | `app.ts`, `utils/errors.ts` | `unit/errors.test.ts`; `controllers/app.test.ts` (codificación y juego de caracteres) |
| RF-18 | `server.ts`, `utils/logger.ts` | `unit/server.test.ts`; `server/startup.test.ts` (`log.info`) |
| RF-19 | `eslint.config.js`, `package.json` (`lint`) | `npm run lint` en verde; prueba manual con `.only` (6.3) |
| RF-20 | `utils/config.ts`, `index.ts` | `unit/config.test.ts`; `server/process.test.ts` (RF-20) |
| RF-21 | `utils/config.ts` (`loadConfig`, dotenv) | `unit/config.test.ts` (`loadConfig`); `server/process.test.ts` (RF-21) |
| RNF-1 | `utils/logger.ts`, `index.ts` (D10, D11) | `unit/logger.test.ts`; `server/process.test.ts` (salida vacía en test; mensaje de configuración visible) |
| RNF-2 | `tsconfig.json`, `tests/tsconfig.json`, `eslint.config.js` | `npm run typecheck`, `npm run lint`, `npm test`; búsqueda de `.only`/`any`/`@ts-ignore` (6.3) |
| RNF-3 | `utils/errors.ts`, `utils/config.ts`, `server.ts` | `unit/errors.test.ts` (formato de mensajes genéricos) |
