# Plan 018 — Pruebas E2E con Playwright
Estado: **pendiente de aprobación del usuario** (redactado el 2026-11-22; ajustado el 2026-11-22 al
CR-1 de la spec). Preguntas P1 y P2 cerradas por el usuario el 2026-11-22 (§13).

Spec: `specs/018-pruebas-e2e/spec.md` (aprobada el 2026-11-21, con U1 a U12, Q1 a Q8 y P1 a P9; y
el cambio de requisitos CR-1, U13, aprobado por el usuario el 2026-11-22).
Base: rama `feature/vinculacion-steam-riot`, commit `8b9c130`. Condición previa cumplida: 016
implementada y validada (2026-11-22) y 017 implementada (2026-11-22, `8b9c130`; pendiente de la
revisión del usuario). Los textos y roles de §9 se leyeron en ese commit, con la interfaz ya en
Mantine.

Este plan no cambia `frontend/` ni `backend/` (RNF-8). Fuera de `e2etests/` solo toca `.gitignore`,
`README.md` (raíz), `AGENTS.md` y `MEMORY.md` (cierre).

## 0. Estado real del código (leído el 2026-11-22)
- **Producción (spec 010).** `backend/package.json`: `build:ui` = `npm --prefix ../frontend run build
  && node scripts/copyUi.ts` (compila la interfaz y la copia a `backend/dist`, que antes borra);
  `build` = `tsc` (a `backend/out`); `start` = `node out/index.js`. Con `NODE_ENV=production`,
  `index.ts` termina con código 1 si falta `backend/dist/index.html`; `server.ts` conecta (plazo
  10 s, mensaje «la base de datos no está disponible: no se pudo conectar en 10 s»), prepara los
  índices y **solo después escucha**, así que «el puerto responde» equivale a «el servidor está
  listo».
- **Configuración del servidor.** `utils/config.ts`: `loadConfig` usa dotenv sin sobrescribir las
  claves del proceso, **también las vacías**; `NODE_ENV`, `PORT` y `JWT_SECRET` obligatorias;
  producción usa `MONGODB_URI` y `MONGODB_DBNAME`; `HOST` opcional; `STEAM_API_KEY`, `RIOT_API_KEY`
  y `LEETIFY_API_KEY` vacías = no definidas; `PUBLIC_URL` se ignora sin clave de Steam;
  `JWT_SECRET` de desarrollo rechazado en producción.
- **Sesión (spec 002).** `POST /api/auth/login` responde 200, cookie `token` (HttpOnly,
  `SameSite=Strict`, `Secure` en producción, `Path=/`) y cabecera `X-CSRF-Token`; 401 «correo o
  contraseña incorrectos». `POST /api/users` (registro, público) responde 201 sin cookie.
  `DELETE /api/users/me` responde 204 y borra en cascada cuentas y sesiones de juego.
- **Datos.** `POST /api/accounts` `{ gameId, handle, region }`; R6: identificador
  `^[A-Za-z0-9._-]{3,20}$`, regiones `LATAM`, `NCSA`, `EMEA`, `APAC`. `POST /api/sessions`
  `{ gameId, title, notes, day (0–6), startHour (0–23), durationHours (1–4), slots (2–6) }`, exige
  cuenta vinculada en el juego (RF-27 de la 006). La rejilla de la semana dibuja de 12:00 a 01:00
  (`GRID_HOURS`).
- **Vite 5.4.21** en `frontend/`. `config/env.ts` lee `VITE_API_URL` (por defecto `/api`) y
  `VITE_USE_MOCK_API`; Vite da prioridad a las variables `VITE_*` que ya están en el entorno del
  proceso sobre `.env`, `.env.production` y `.env.production.local` (se comprueba en T9).
- **Rutas (spec 007, `app/router.tsx` y `ProtectedRoute.tsx`).** `PublicOnlyRoute` envuelve **la
  entrada (`/`)**, login y registro: con sesión, las tres llevan a Inicio con `replace`. Por eso
  ningún escenario usa `/` (spec 018, U13; la diferencia con el texto de la 007, RF-33, queda
  anotada en «Impacto» de la spec, sin cambio por decisión del usuario). La vista «no encontrada»
  (`path="*"`, `app/pages/NotFoundPage.tsx`) está fuera de las dos reglas y se muestra con o sin
  sesión: encabezado de nivel 1 «No hay nadie en esta sala» y título de documento «Página no
  encontrada». `/e2e-sin-vista` no coincide con ninguna de `ROUTES` ni con los prefijos `/agenda/`,
  `/jugadores/` y `/verificar/`, e `isProtectedPath` da `false` (`app/routes.ts`): la resuelve el
  comodín sin recordar ruta de origen. En producción, el servidor entrega `index.html` en cualquier
  GET fuera de `/api` (spec 010, RF-2).
- **Backend y frontend sin dependencias de E2E.** No existe `e2etests/`. El servidor usa TypeScript
  5.9.3, `@types/node` 22.20.2, `eslint` y `@eslint/js` 9.39.5 y `typescript-eslint` 8.70.0.

## 1. Dependencias (RNF-1)
Todas en `e2etests/package.json`, en `devDependencies`, con versión exacta (`--save-exact`). Ninguna
en `frontend/` ni `backend/`. Ninguna de acceso directo a la base.

| Paquete | Versión exacta | Justificación |
| --- | --- | --- |
| `@playwright/test` | `1.57.0` (fijada por el usuario, P2 = A) | Ejecutor de pruebas y navegador (enunciado, U1, constitución principio 1). Trae `playwright-core` y el instalador de Chromium. |
| `typescript` | `5.9.3` | Comprobación de tipos (RF-1, RNF-2); misma versión que el servidor. |
| `@types/node` | `22.20.2` | Tipos de `node:child_process`, `node:net`, `node:crypto`, `fetch`; misma versión que el servidor. |
| `eslint` | `9.39.5` | Lint (Q6); misma versión que el servidor. |
| `@eslint/js` | `9.39.5` | Configuración recomendada de JavaScript (Q6); misma versión que el servidor. |
| `typescript-eslint` | `8.70.0` | Reglas de TypeScript, incluida `no-explicit-any` (RNF-2); misma versión que el servidor. |

- **Sin dotenv ni cliente HTTP**: `backend/.env` se lee con `util.parseEnv` de Node (≥ 21.7) y la
  API se llama con el `fetch` global de Node 22 (§5).
- **Sin ejecutor de pruebas unitarias**: las reglas puras de §3 se prueban con `node:test`, que
  viene con Node (§10).
- Chromium: `npx playwright install chromium` (en Linux puede hacer falta `--with-deps`). Se
  descarga en la caché de Playwright del usuario, fuera del repositorio.
- **Comprobación previa en T1**: `npm view @playwright/test@1.57.0 version engines` y las de las
  otras cinco. Si `@playwright/test@1.57.0` no existe o no admite Node 22, T1 se detiene y avisa
  al usuario, sin instalar nada ni elegir otra versión (P2 = A). Después, `npm ls` sin avisos de
  versiones incompatibles.
- `package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.18" }` (los
  scripts `.ts` se ejecutan con `node` directamente, con la eliminación de tipos de Node, como
  `backend/scripts/copyUi.ts`).

## 2. Estructura de `e2etests/` y responsabilidades
Identificadores y archivos en inglés; títulos de escenarios, comentarios, mensajes y README en
español (RNF-7).

```
e2etests/
  package.json  package-lock.json  tsconfig.json  eslint.config.js  playwright.config.ts  README.md
  scripts/
    start-server.ts         lanzador del sistema bajo prueba (§4)
  lib/                      módulos sin Playwright, también los usa el lanzador
    settings.ts             variables E2E_* y valores por defecto
    preflight.ts            reglas puras de las condiciones previas
    preflight.test.ts       node:test
    processEnv.ts           entornos de compilación y de arranque (puras)
    processEnv.test.ts      node:test
    backendEnv.ts           lectura de backend/.env (E/S, sin cargar código del servidor)
    uniqueData.ts           correo, usuario, identificador R6 y títulos únicos (puras)
    uniqueData.test.ts      node:test
    origin.ts               ¿mismo origen que el sistema bajo prueba? (pura)
    origin.test.ts          node:test
  tests/
    suite.spec.ts           registra los 7 escenarios en el orden habitual
    suite.reverse.spec.ts   registra los mismos en orden inverso (RF-13, U11)
    registry.ts             lista ordenada de escenarios y `registerScenarios(order)`
    fixtures.ts             test.extend: bloqueo de orígenes, usuario de prueba con limpieza
    api.ts                  cliente HTTP de la suite (sesión iniciada de la suite)
    texts.ts                todos los textos y direcciones de §9, con su origen
    ui.ts                   localizadores y acciones comunes (login por formulario, «la semana muestra»…)
    auth.scenarios.ts       E1 a E4
    agenda.scenarios.ts     C1 a C3
```

- **`package.json`** (RF-1, RF-3, RNF-9). Scripts, todos sin sintaxis de una consola concreta (sin
  variables delante del comando, sin comodines, sin `&&`):
  - `"test": "playwright test --project=chromium"` — la suite (RF-2).
  - `"test:reverse": "playwright test --project=chromium-reverse"` — orden inverso (RF-13, U11).
  - `"test:unit": "node --test lib/preflight.test.ts lib/processEnv.test.ts lib/uniqueData.test.ts lib/origin.test.ts"`
    (lista explícita, sin comodín).
  - `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"report": "playwright show-report"`,
    `"browser:install": "playwright install chromium"`.
  - Un escenario solo: `npm test -- --grep C2` (cada título empieza por su código; ningún código
    contiene a otro).
- **`tsconfig.json`** (RNF-2). Mismas opciones estrictas que `backend/tsconfig.json`: `strict`,
  `module`/`moduleResolution` `nodenext`, `target` `esnext`, `types: ["node"]`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck`; además `noEmit`.
  `include: ["**/*.ts"]`, `exclude: ["node_modules", "playwright-report", "playwright-report-json", "test-results"]`.
  Las importaciones llevan extensión `.ts` (necesario para `node` directo).
- **`eslint.config.js`** (Q6, RNF-2, RNF-3, RF-21, RF-22). Igual que el del servidor
  (`js.configs.recommended`, `tseslint.configs.recommended`, `consistent-type-imports`,
  `no-unused-vars` con `^_`, `no-console`: los scripts escriben con `process.stdout/stderr.write`,
  como `copyUi.ts`) más:
  - en todo: `@typescript-eslint/ban-ts-comment` sin excepciones (también `@ts-expect-error`) y
    `@typescript-eslint/consistent-type-assertions` con `assertionStyle: "never"` (`as const` sigue
    permitido): sin aserciones para esquivar tipos;
  - en `tests/**`: `no-restricted-syntax` contra `MemberExpression[property.name="only"]` y
    `[property.name="skip"]`/`fixme`/`fail` (RNF-3); `no-restricted-properties` contra
    `waitForTimeout` y `no-restricted-globals` contra `setTimeout` (RF-22: sin esperas fijas);
    `no-restricted-properties` contra `locator`, `$`, `$$`, `$eval`, `$$eval`, `getByTestId`,
    `waitForSelector` y `frameLocator` (RF-21: solo `getByRole`, `getByLabel`, `getByText`).
  - `ignores`: `node_modules`, `playwright-report`, `playwright-report-json`, `test-results`.
- **`playwright.config.ts`** (RF-2, RF-7, RF-9, RF-10, RF-13, RF-22, RNF-3, RNF-10). §6.
- **`.gitignore` raíz** (RNF-6): `e2etests/playwright-report/`, `e2etests/playwright-report-json/`,
  `e2etests/test-results/`, `e2etests/blob-report/`. `node_modules/`, `dist`, `out` y `.env*` ya
  están ignorados. La suite no usa archivo de variables propio (decisión D6), así que no hay
  plantilla.

## 3. Funciones puras (sin E/S, sin reloj, sin azar)
Ninguna necesita «hoy»: la suite no depende de la fecha ni de la hora (RNF-10; las sesiones de juego
son de la semana tipo). El azar (token único, secreto) se genera fuera y entra como parámetro.

| Función | Módulo | RF | Qué hace |
| --- | --- | --- | --- |
| `readSettings(env)` | `settings.ts` | RF-6, RF-7 | Lee `E2E_PORT` (por defecto `3901`), `E2E_MONGODB_URI` (por defecto `mongodb://127.0.0.1:27017`) y `E2E_MONGODB_DBNAME` (por defecto `teammatchup_e2e`). Devuelve `{ ok, settings }` o `{ ok: false, errors }` (puerto no entero o fuera de 1–65535). `baseURL = http://127.0.0.1:<puerto>`. |
| `checkDatabaseName(name, configured)` | `preflight.ts` | RF-6 | Error si `name` no contiene `e2e` (sin distinguir mayúsculas) o si coincide, sin distinguir mayúsculas, con algún nombre de `configured` (los `MONGODB_DBNAME` y `TEST_MONGODB_DBNAME` del entorno y de `backend/.env`; se comparan **todos** los que haya). `null` si vale. |
| `checkMongoLocation(uri)` | `preflight.ts` | RF-6 | Error si el esquema no es `mongodb://` (`mongodb+srv://` busca por DNS) o si algún servidor de la lista (entre `//` o `@` y la primera `/`, `?` o el final, separados por comas, sin el puerto) no es `127.0.0.1` ni `localhost`. El mensaje nunca incluye la ubicación ni sus credenciales. |
| `missingPackages(manifest, isInstalled)` | `preflight.ts` | RF-2, RF-4 | Nombres de `dependencies` y `devDependencies` de un `package.json` que `isInstalled(name)` no encuentra. |
| `formatPreflightErrors(errors)` | `preflight.ts` | RF-4 | Mensaje en español: «la suite no arranca:» y una línea por condición fallida. |
| `uiBuildEnv(base)` | `processEnv.ts` | RF-5 | Copia de `base` con `VITE_USE_MOCK_API=false`, `VITE_API_URL=/api` y `NODE_ENV=production`. |
| `serverEnv(base, settings, secret)` | `processEnv.ts` | RF-5, RF-6, RF-8, RF-10 | Copia de `base` con `NODE_ENV=production`, `PORT`, `HOST=127.0.0.1`, `MONGODB_URI`, `MONGODB_DBNAME`, `JWT_SECRET=secret`, `STEAM_API_KEY=""`, `RIOT_API_KEY=""`, `LEETIFY_API_KEY=""`. |
| `uniqueData(token)` | `uniqueData.ts` | RF-11 | Con un token de 12 hexadecimales en minúscula: correo `e2e-<token>@example.com`, usuario `e2e_<token>` (16 caracteres), contraseña ficticia fija `contrasena-e2e-ficticia`, identificador R6 `e2e<token>`, y `title(code, role)` = `E2E <code> <role> <token>` con `role ∈ {testigo, original, editado, nueva}` (ningún rol es prefijo de otro). |
| `isSameOrigin(url, baseURL)` | `origin.ts` | RF-9 | `true` solo si el origen de `url` es exactamente el de `baseURL` (`http://127.0.0.1:<puerto>`). `data:` y `blob:` cuentan como mismo origen (los genera la propia página). |
| `weekBlockName(title)` | `ui.ts` | RF-21 | Expresión `^<title escapado>, ` para el nombre accesible del bloque de la semana. |
| `cleanupFailure(user, step, outcome)` | `fixtures.ts` | RF-12, U6 | Texto del error de limpieza (§5.3). |
| `orderScenarios(list, order)` | `registry.ts` | RF-13 | La lista tal cual o invertida. |

Por qué ningún título único contiene a otro (Definiciones): todos empiezan por `E2E ` en mayúsculas,
que no aparece dentro de un código, un rol ni un token (hexadecimal en minúscula); así que si uno
contiene a otro, empieza en la posición 0 y es su prefijo; con roles que no son prefijos entre sí y
tokens de longitud fija al final, eso solo pasa si son iguales. `uniqueData.test.ts` lo comprueba con
ejemplos.

## 4. Orquestación: comprobaciones, compilación, arranque y parada
**Decisión D1.** Playwright arranca el sistema bajo prueba con `webServer`, cuyo comando es el
lanzador propio `node scripts/start-server.ts`. El lanzador hace los pasos 1 a 3 de RF-2 en orden y
se queda vivo con el servidor; Playwright ejecuta los escenarios (paso 4), detiene el lanzador al
terminar o con Ctrl+C (paso 5) y fija el código de salida (paso 6).
*Descartada*: un orquestador propio que llama a `playwright test` por debajo. Habría que replicar la
parada del árbol de procesos en Windows y el reenvío de señales que `webServer` ya resuelve, y
`npm test -- --grep` dejaría de ser la interfaz de Playwright. *Descartada también*: hacer las
comprobaciones en `globalSetup`, que Playwright ejecuta **después** de arrancar `webServer`
(rompería el orden de RF-2).

### 4.1 `webServer` (en `playwright.config.ts`)
```
webServer: {
  command: 'node scripts/start-server.ts',
  url: `${baseURL}/`,            // listo cuando responde index.html
  reuseExistingServer: false,    // RF-7: nunca reutiliza
  timeout: 240_000,              // compilación incluida; el plazo de 60 s lo vigila el lanzador
  stdout: 'pipe', stderr: 'pipe',// errores del compilador (tsc escribe en stdout) y del servidor
  gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
}
```
- Sin `env`: el lanzador hereda el entorno y calcula el suyo. Así la configuración de Playwright, que
  el informe JSON serializa, **no contiene el secreto** (RF-10, §7).
- Con `reuseExistingServer: false`, si algo ya responde en la dirección, Playwright termina con
  error **antes de lanzar el comando** (antes de compilar). Un proceso que ocupa el puerto sin
  responder HTTP lo detecta el lanzador en su paso 1, también antes de compilar (RF-7).

### 4.2 Lanzador `scripts/start-server.ts` (pseudocódigo)
```
settings ← readSettings(process.env)                         // §3
errores ← []                                                 // ---- paso 1: sin compilar ni arrancar (RF-2.1, RF-4)
  + errores de settings
  + checkDatabaseName(settings.dbName, nombresConfigurados(process.env, leerBackendEnv()))
  + checkMongoLocation(settings.mongoUri)
  + por cada carpeta en [frontend, backend, e2etests]:
      missingPackages(package.json, nombre ↦ existe <carpeta>/node_modules/<nombre>/package.json)
  + Chromium: existsSync(chromium.executablePath())          // API pública de @playwright/test
  + puerto libre: net.createServer().listen(puerto, '127.0.0.1') y cerrar
  + npm localizable: process.env.npm_execpath (lo fija npm/npx) o npm-cli.js junto a process.execPath
si errores ≠ []: escribir formatPreflightErrors(errores) en stderr; salir con 1

// ---- paso 2: compilar desde el código actual, sin construcciones anteriores (RF-2.2, RF-5)
ejecutar(npm, ['run', 'build:ui'], cwd=backend, env=uiBuildEnv(process.env))   // vite vacía frontend/dist; copyUi borra y copia backend/dist
borrar backend/out
ejecutar(npm, ['run', 'build'],    cwd=backend, env=process.env)
  // ejecutar = spawn(process.execPath, [npm-cli.js, ...args], { stdio: 'inherit', shell: false });
  // si termina con código ≠ 0: «falló la compilación de <la interfaz|el servidor>» y salir con 1

// ---- paso 3: arrancar y esperar (RF-2.3, RF-4)
secreto ← randomBytes(32).toString('base64url')              // nunca se escribe ni se muestra (RF-10)
servidor ← spawn(process.execPath, ['out/index.js'], cwd=backend, env=serverEnv(process.env, settings, secreto),
                 stdio ['ignore', 'inherit', 'inherit'])     // su salida (p. ej. «la base de datos no está disponible…») se ve
esperar hasta lo primero de:
  · GET baseURL/ responde 200          → escribir «sistema bajo prueba listo en <baseURL>» y seguir vivo
  · el servidor termina                → «el servidor terminó al arrancar (código N)»; salir con 1
  · 60 s desde spawn                   → matar el servidor; «el servidor no respondió en 60 s»; salir con 1
  (sondeo cada 250 ms con fetch; esto es del lanzador, no de un escenario: RF-22 no aplica)
después: si el servidor termina → salir con su código (Playwright lo verá como fallo)

// ---- parada (RF-2.5)
en SIGINT, SIGTERM, SIGHUP o 'exit': matar el hijo en curso (compilación o servidor) y salir
```
- Sin `shell` en ningún `spawn` y con `process.execPath` como programa: igual en Linux, macOS y
  Windows (RNF-9). npm ejecuta los scripts de `backend/` tal como los define la spec 010 (`&&` lo
  entienden `sh` y `cmd`), y la suite no tiene que copiar su contenido.
- En POSIX Playwright crea el lanzador en su propio grupo de procesos y lo detiene con el grupo; en
  Windows usa `taskkill /T /F` sobre el árbol. Además el lanzador mata a su hijo en sus señales. Con
  Ctrl+C la terminal envía la señal a todo el grupo en primer plano. El criterio «tras Ctrl+C ya no
  escucha» se comprueba en T9.
- `nombresConfigurados` (RF-6, «Notas para el plan»): `MONGODB_DBNAME` y `TEST_MONGODB_DBNAME` del
  entorno del proceso y de `backend/.env`, leído con `readFileSync` + `util.parseEnv` (`backendEnv.ts`;
  si no existe, ninguno). No importa código de `backend/` (RF-1).
- Las variables propias de la suite empiezan por `E2E_` y nunca se llaman `MONGODB_DBNAME`, para que
  el nombre de la base E2E no se confunda con el de desarrollo configurado.
- El lanzador no escribe nunca el entorno ni la ubicación de MongoDB.

### 4.3 Qué ve el integrante en cada fallo (RF-4, casos límite)
| Situación | Quién lo detecta | Antes de compilar | Salida |
| --- | --- | --- | --- |
| Puerto ocupado por un servidor HTTP | Playwright | sí | «…is already used…» de Playwright |
| Puerto ocupado sin HTTP | lanzador, paso 1 | sí | «el puerto 3901 de 127.0.0.1 está ocupado» |
| Nombre o ubicación de la base no admitidos | lanzador, paso 1 | sí | la regla que falla, sin la ubicación |
| Faltan dependencias de `frontend/` o `backend/`, o Chromium | lanzador, paso 1 | sí | qué carpeta y qué paquete, o «Chromium de Playwright no está instalado: npm run browser:install» |
| Faltan las dependencias de `e2etests/` | npm | sí | npm no encuentra `playwright`; el README lo explica (limitación: el lanzador no puede correr sin ellas) |
| Error de compilación | lanzador, paso 2 | — | la salida de tsc o de vite y «falló la compilación de…» |
| MongoDB apagado | servidor | — | «la base de datos no está disponible: no se pudo conectar en 10 s» |
| Sin respuesta en 60 s | lanzador, paso 3 | — | «el servidor no respondió en 60 s» |
En todos, Playwright termina con código ≠ 0 («Process from config.webServer…») sin ejecutar escenarios.

## 5. Datos de prueba: preparación y limpieza por la API (RF-11, RF-12)
### 5.1 Cliente de la suite (`tests/api.ts`)
**Decisión D2.** `fetch` global de Node, con la cookie y el comprobante manejados a mano: del login
se toma `X-CSRF-Token` y, de `headers.getSetCookie()`, el par `token=<valor>`; cada petición con
sesión los reenvía en `Cookie` y `X-CSRF-Token`. Así la cookie `Secure` no importa por `http` (riesgo
de «Notas para el plan»), y no se escribe nada en el navegador (U8).
*Descartada*: el `request` de Playwright, cuyo almacén de cookies puede no reenviar una cookie
`Secure` por `http` y que mezclaría el almacén de la suite con el del navegador.

Operaciones, todas con cuerpo JSON y respuestas leídas con guardas de tipo (sin `as`):
`register(user)` → 201; `login(user)` → `SuiteSession { cookie, csrf }` o un resultado
`badCredentials`; `linkR6(session, handle)` → 201 (`{ gameId: 'r6', handle, region: 'LATAM' }`);
`createSession(session, { title, day, startHour })` → 201 e `id` (`gameId: 'r6'`, `durationHours: 2`,
`slots: 4`, `notes: ''`); `deleteMe(session)` → 204. Ninguna toca la base directamente.

**Juego R6** (decisión D3): no consulta ningún servicio externo (ni Data Dragon como LoL, ni Leetify
como CS2), su identificador es corto y el formato es simple (RF-8, RF-9).
*Descartados*: LoL y CS2.

**Día y hora de las sesiones preparadas** (RF-11, dentro de la rejilla 12:00–01:00): la sesión
editada o cancelada, **miércoles 18:00** (día 2), y la testigo, **viernes 19:00** (día 4). C1 crea la
suya con el formulario tal como lo abre el botón de la cabecera (lunes 20:00).

### 5.2 Fixture `testUser` (`tests/fixtures.ts`)
```
testUser (por escenario):
  token ← randomUUID() sin guiones, primeros 12; user ← uniqueData(token)
  estado ← 'sin enviar'
  try   { register(user) → si 201: estado ← 'creado'; si otro código: estado ← 'rechazado'; lanzar «falló la preparación…» }
  catch sin respuesta { estado ← 'desconocido'; lanzar «falló la preparación: el registro no respondió» }
  use(user)                                   // el escenario prepara cuenta y sesiones con login(user)
  limpieza (siempre, pase o falle):
    si estado ∈ {'sin enviar', 'rechazado'}: nada                       // no es fallo de limpieza
    s ← login(user)                                                     // sesión iniciada de la suite NUEVA
      si 401 «correo o contraseña incorrectos» y estado = 'desconocido': nada
      si no hay sesión: lanzar cleanupFailure(user, 'inicio de sesión', código o motivo)
    deleteMe(s) ≠ 204 o sin respuesta: lanzar cleanupFailure(user, 'eliminación', código o motivo)
```
- Opción de fixture `{ timeout: 30_000 }`: la limpieza tiene su propio plazo aunque el escenario haya
  agotado el suyo.
- Si el escenario falló y además falla la limpieza, Playwright muestra los dos errores en el informe
  (el del escenario y el del desmontaje del fixture): U6.
- La sesión iniciada del navegador siempre se abre por el formulario (`ui.loginByForm`), nunca con
  la de la suite (U8).

### 5.3 Error de limpieza (RF-12, U6)
`Falló la limpieza, no el escenario: el usuario de prueba <correo> (<usuario>) quedó en la base E2E;
<paso> respondió <código>` (o `no respondió: <motivo>`).

### 5.4 Escenarios que preparan qué (RF-11)
| Escenario | Usuario | Cuenta R6 | Sesión editada/cancelada | Testigo |
| --- | --- | --- | --- | --- |
| E1, E3, E4 | sí | — | — | — |
| E2 | sí (contraseña equivocada al entrar) | — | — | — |
| C1 | sí | sí | — (la crea por la interfaz) | sí |
| C2 | sí | sí | sí (`original`) | — |
| C3 | sí | sí | sí (`original`) | sí |

## 6. Configuración de Playwright (`playwright.config.ts`)
```
testDir: './tests', testMatch: … (por proyecto),
fullyParallel: false, workers: 1,                // RF-2.4, RF-13: en serie
retries: 0, forbidOnly: true,                    // RNF-3 (además del lint)
timeout: 60_000, expect: { timeout: 10_000 },    // esperas a estados, no tiempos fijos (RF-22)
outputDir: 'test-results',                       // trazas y capturas
reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }],
           ['json', { outputFile: 'playwright-report-json/report.json' }]],
use: { ...devices['Desktop Chrome'],             // Chromium de Playwright, 1280×720
       baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off',
       locale: 'es-CL', timezoneId: 'UTC', serviceWorkers: 'block' },   // RNF-10
projects: [ { name: 'chromium',         testMatch: 'suite.spec.ts' },
            { name: 'chromium-reverse', testMatch: 'suite.reverse.spec.ts' } ],
webServer: §4.1
```
- **Bloqueo de otros orígenes (RF-9)**: fixture automático que, en cada contexto, hace
  `context.route(url => !isSameOrigin(url, baseURL), route => route.abort('blockedbyclient'))`
  antes de abrir ninguna página. *Descartado*: lanzar Chromium con una lista de servidores
  bloqueados, que depende de opciones del navegador y no se puede probar igual.
- **Orden inverso (RF-13, U11), decisión D4**: `registry.ts` exporta la lista E1, E2, E3, E4, C1, C2,
  C3; `suite.spec.ts` llama a `registerScenarios('normal')` y `suite.reverse.spec.ts` a
  `registerScenarios('reverse')`. Con un solo trabajador, Playwright ejecuta las pruebas de un
  archivo en el orden en que se declaran, y tras un fallo sigue con la siguiente en un trabajador
  nuevo (no se usa el modo `serial`, que encadena las pruebas). *Descartada*: una variable de entorno
  leída al cargar el archivo, que obligaría a un script intermedio para fijarla sin sintaxis de
  consola (RNF-9).
- Cada escenario abre un contexto nuevo: empieza sin sesión iniciada y sin almacenamiento.

## 7. Aislamiento de la base y del secreto (RF-5, RF-6, RF-8, RF-10, RNF-6)
- **Base E2E** fijada en el entorno del servidor (`serverEnv`), comprobada antes de compilar
  (`checkDatabaseName`, `checkMongoLocation`). `backend/.env` nunca se escribe; dotenv no pisa lo que
  ya está en el entorno (P5).
- **Secreto** (decisión D5): se genera en el lanzador después de compilar y solo va en el entorno del
  proceso del servidor. No está en el entorno de Playwright, ni en `config.webServer` (sin `env`),
  ni en el de las compilaciones, ni en ningún archivo, ni en la salida (el lanzador nunca imprime el
  entorno y el servidor nunca escribe `JWT_SECRET`). El navegador solo ve la cookie firmada, que no
  contiene el secreto. Así el informe JSON (que incluye la configuración, con `webServer`), el HTML,
  las trazas y las capturas no pueden contenerlo. *Descartada*: generarlo en `playwright.config.ts`
  y pasarlo por `webServer.env`, que el informe JSON serializaría (riesgo de RF-10).
- **Comprobación (T9)**: en Linux, mientras corre la suite, se lee el secreto del proceso del
  servidor (`/proc/<pid>/environ`, sin tocar el código) y, al terminar, se busca en la salida
  guardada, en `e2etests/`, `playwright-report/`, `playwright-report-json/report.json` y
  `test-results/` (descomprimiendo las trazas). Resultado esperado: ninguna coincidencia.
- **Claves de servicios externos** vacías en `serverEnv` aunque `backend/.env` las tenga (RF-8).
- **Archivo de variables propio** (decisión D6): no hay. Las tres variables `E2E_*` son opcionales y
  ninguna es secreta; el README dice cómo fijarlas en bash/zsh y en PowerShell. *Descartado*: un
  `e2etests/.env` con plantilla, que añade un archivo que proteger sin aportar nada.

## 8. Escenarios (RF-14 a RF-20)
Cada escenario es una función en `auth.scenarios.ts` o `agenda.scenarios.ts` con el título
`<código> · <resumen>` (por ejemplo `C2 · ver y editar, con Atrás, Adelante y recarga`) y sigue los
pasos de su RF en orden. Acciones comunes en `ui.ts`:
- `loginByForm(page, user)`: rellena «Correo» y «Contraseña» por etiqueta y pulsa el botón «Entrar».
- `openAddress(page, path)`: `page.goto(path)` (escribir la dirección: entrada nueva del historial).
- `expectPath(page, path | RegExp)`: `expect(page).toHaveURL(...)` comparando solo la ruta.
- `weekShows(page, title)` / `weekDoesNotShow`: botón con nombre `weekBlockName(title)`.
- `panelTitled(page, X)`: encabezado de nivel 2 de nombre exacto `X`.
- `panelShowsCard(page, title)` / `panelDoesNotShow`: enlace de nombre exacto `Ver detalle de <título>`.
- `notInAgenda(page, title)`: `weekDoesNotShow` y `panelDoesNotShow`.
- «Atrás», «Adelante» y F5: `page.goBack()`, `page.goForward()`, `page.reload()`.

Toda comprobación negativa va **después** de una positiva del mismo estado y nunca es la primera
tras una acción (RF-22): el código del escenario lo refleja en su orden, y la revisión de T5–T8 lo
comprueba paso a paso. Las negativas usan `toBeHidden()`/`toHaveCount(0)`, que también esperan.

**E1 (RF-14, U13)** abre la dirección sin vista `/e2e-sin-vista` con `openAddress` (una entrada
nueva del historial, documento propio) y comprueba la ruta y el encabezado de nivel 1 «No hay nadie
en esta sala». Los pasos 2 y 3 ocurren en un segundo documento (`/agenda` → `/login` → `/agenda`,
las dos redirecciones con `replace`). En el paso 4, `page.goBack()` vuelve al primer documento: se
cargue de nuevo o lo restaure el navegador, la vista «no encontrada» se ve igual con sesión. Se
comprueba primero la ruta `/e2e-sin-vista` y el encabezado y, con eso a la vista, que los campos
«Correo» y «Contraseña» no se ven (RF-22). Si alguna redirección hubiera añadido una entrada, la ruta
sería `/agenda` o `/login` → `/inicio`, y la comprobación de la ruta falla.

## 9. Textos, roles y direcciones que usan los escenarios (U12, RF-21)
Todos en `tests/texts.ts`, con este origen en un comentario. «Interfaz actual» = lo que muestra el
commit `8b9c130`, que la 017 no cambia (su RF-19). Nombres comparados con `exact: true` salvo los
marcados como expresión.

| Uso | Localizador | Texto | Origen |
| --- | --- | --- | --- |
| Dirección sin vista (E1) | ruta | `/e2e-sin-vista` | spec 018, Definiciones y U13 (no es una ruta de la aplicación: `app/routes.ts` no la tiene) |
| Vista «no encontrada», texto propio (E1) | encabezado nivel 1 | «No hay nadie en esta sala» | interfaz actual (`app/pages/NotFoundPage.tsx`); spec 018, U13. La vista la fija la spec 007, RF-28; el texto, ninguna spec |
| Login, dirección | ruta | `/login` | spec 007 |
| Campos de login | etiqueta | «Correo», «Contraseña» | interfaz actual (`features/auth/pages/LoginPage.tsx`) |
| Enviar login | botón | «Entrar» | spec 018 (Escenarios); interfaz actual |
| Credenciales incorrectas | texto | «correo o contraseña incorrectos» | spec 002, RF-9; spec 007 |
| Inicio, dirección | ruta | `/inicio` | spec 007 (`ROUTES.home`) |
| Inicio, texto propio | encabezado nivel 1, expresión | `/¿a qué hora juegas hoy\?$/i` («<nombre>, ¿a qué hora juegas hoy?») | interfaz actual (`features/home/pages/HomePage.tsx`) |
| Agenda, dirección | ruta | `/agenda` | spec 007 |
| Título de la agenda | encabezado **nivel 1** | «Agenda de la semana» | interfaz actual (`SchedulePage.tsx`). Inicio tiene un encabezado de nivel 2 con el mismo texto: el nivel los distingue |
| Enlace de la agenda de la barra | enlace dentro de la navegación «Principal» | «Agenda» | interfaz actual (`app/routes.ts`, `NAV_ITEMS`; `AppLayout.tsx`) |
| Cerrar sesión | botón | «Cerrar sesión» | spec 007, RF-6; interfaz actual (`AppLayout.tsx`, nombre accesible del botón) |
| Filtro | botón con `aria-pressed="true"` | «Todos los juegos» | spec 016; interfaz actual (`FilterChip`, spec 017 RF-14) |
| Encabezado del panel | encabezado nivel 2 | «Mis sesiones», «Sesión abierta» | spec 009 / 016 (Definiciones de la 018); interfaz actual |
| Ver las mías | botón | «Ver las mías» | spec 016, RF-23 |
| Tarjeta del panel | enlace | «Ver detalle de <título>» | spec 009, RF-2 (`copy.ts`, `viewDetailLabel`) |
| Bloque de la semana | botón, expresión | `^<título>, ` («<título>, <Día> <HH:00>, <n> de <m> jugadores») | interfaz actual (`WeekCalendar.tsx`); Definiciones de la 018 |
| Abrir el formulario | botón de la página (fuera de ventanas) | «Anotar sesión» | spec 017, RF-12; interfaz actual |
| Ventana del formulario | ventana (rol `dialog`) | «Anotar una sesión» | spec 017, RF-12 |
| Campo título | etiqueta, dentro de la ventana | «Título» | spec 006/009; interfaz actual (`SessionDraftSlip.tsx`) |
| Enviar el formulario | botón dentro de la ventana | «Anotar sesión» | spec 017, RF-12; interfaz actual |
| Detalle, dirección | ruta, expresión | `^/agenda/[0-9a-f]{24}$` (y la exacta `/agenda/<id>` cuando se conoce) | spec 009, RF-1 |
| Detalle, título | encabezado nivel 1 | «<título>» | spec 009, RF-3 |
| Detalle, día y horario | texto | «Miércoles · 18:00–20:00» | spec 009, RF-3; interfaz actual (`domain/sessionDetail.ts`, `formatSessionRange`) |
| Detalle, cupos | texto | «1/4 jugadores» → «1/5 jugadores» | spec 009, RF-3 (`sessionOccupancyText`) |
| Detalle, quien organiza | texto | «La organizas» | spec 009, RF-3 (`SESSION_YOU_HOST_TEXT`) |
| Editar | botón | «Editar sesión» | spec 009, RF-6 |
| Campos de edición | etiqueta | «Título»; lista «Cupos» (`selectOption` por etiqueta) | spec 009, RF-6; spec 017, RF-10 (lista nativa) |
| Guardar | botón | «Guardar cambios» | spec 009, RF-6 |
| Guardado | texto | «Cambios guardados.» | spec 009, RF-7 |
| Cancelar | botón | «Cancelar sesión» | spec 009, RF-23 |
| Confirmación | ventana | «¿Cancelar esta sesión?» | spec 009, RF-23 |
| Cerrar sin confirmar | botón dentro de la ventana | «Volver» | spec 009, RF-23 |
| Confirmar | botón dentro de la ventana | «Sí, cancelar sesión» | spec 009, RF-23 |
| Sesión inexistente | encabezado / texto | «Esta sesión no existe» | spec 009, RF-12 |
| Enlace de la sesión inexistente | enlace | «Ir a la agenda» | spec 009, RF-12 |

Ningún escenario usa la página de entrada (`/`) ni su texto (U13).

Con los nombres accesibles de hoy, todos los elementos se localizan sin atributos de prueba. Si al
escribir un escenario alguno no se pudiera, se registra como defecto de accesibilidad y se para
(RF-21, RNF-8).

## 10. Estrategia de pruebas
- **Reglas puras con `node:test`** (`npm run test:unit`), escritas antes que el código (rojo →
  verde), sin dependencias nuevas: `readSettings`, `checkDatabaseName` (sin «e2e», «E2E» vale,
  igual al de desarrollo o al de pruebas con otras mayúsculas), `checkMongoLocation` (local,
  `localhost` con puerto, lista con un servidor remoto, `mongodb+srv://`, con credenciales: el
  mensaje no contiene la ubicación), `missingPackages`, `uiBuildEnv`, `serverEnv` (las claves
  vacías aunque la base las traiga; el secreto que se le pasa), `uniqueData` (formatos válidos para
  la spec 002/004/006 y ningún título contiene a otro), `isSameOrigin`, `orderScenarios`.
  *Descartado*: dejar estas reglas solo a la prueba manual de los criterios; son las que impiden
  tocar la base de desarrollo y merecen pruebas que se repitan solas.
- **Escenarios con Playwright** (`npm test`): no se escriben antes que el código (constitución,
  principio 4 enmendado; RNF-11). En su lugar, **prueba de sensibilidad**: con cada escenario en
  verde, se cambia a propósito en el propio escenario un valor esperado, se ejecuta ese escenario
  solo y debe fallar **por esa comprobación** (el informe nombra la línea); después se deshace y
  vuelve a verde. No se toca `frontend/` ni `backend/` para ello (RNF-8). Cambios mínimos:

  | Escenario | Cambio a propósito | Debe fallar en |
  | --- | --- | --- |
  | E1 | (a) encabezado esperado de la vista «no encontrada» = «No hay nadie en esta sal» (sin la a final; con `exact: true` no coincide); (b) dirección esperada tras «Atrás» = `/agenda` en lugar de `/e2e-sin-vista` | (a) paso 1; (b) paso 4 |
  | E2 | texto esperado «correo o contraseña incorrecto» (sin la s) | paso 1 |
  | E3 | dirección esperada tras F5 = `/inicio` | paso 3 |
  | E4 | (a) dirección esperada tras «Atrás» = `/inicio`; (b) destino esperado del paso 5 = `/agenda` | (a) paso 4; (b) paso 5 |
  | C1 | título esperado en la semana tras F5 = el de la testigo con otro token | paso 6 |
  | C2 | cupos esperados tras guardar = «1/4 jugadores» | paso 3 |
  | C3 | (a) dirección esperada tras «Atrás» = la del detalle; (b) en el paso 7, comprobar como ausente el título de la testigo en lugar del cancelado | (a) paso 6; (b) paso 7 |

  Y para RF-9: un escenario temporal pide desde la página `https://example.com` con conexión a
  Internet y comprueba que la petición falla por el bloqueo; sin el bloqueo (quitando el fixture
  automático solo en esa prueba temporal) la misma petición responde. Después se borra.
- **Comprobación de tipos y lint**: `npm run typecheck` y `npm run lint` en `e2etests/` (RNF-2).
- **Criterios de la suite completa** (T9): la matriz de fallos de §4.3, archivos de variables sucios,
  base de desarrollo intacta (mongosh), secreto, sin red, orden inverso, cada escenario solo, Ctrl+C,
  limpieza rota, conteo de documentos de la base E2E, tres ejecuciones seguidas y tiempo.
- **Registro de validación**: `specs/018-pruebas-e2e/validation.md`, una sección por tarea (la crea
  T1), con los comandos, las salidas relevantes y lo observado.

## 11. Qué RF cubre cada parte
| Parte | RF / RNF |
| --- | --- |
| `e2etests/` independiente, dependencias, tsconfig, lint | RF-1, RNF-1, RNF-2, RNF-3, RNF-7 |
| Lanzador y `webServer` (§4) | RF-2, RF-4, RF-5, RF-6, RF-7, RF-8, RF-10, RNF-9 |
| `settings`, `preflight`, `backendEnv` | RF-4, RF-6, RF-7 |
| `processEnv` | RF-5, RF-8, RF-10 |
| Secreto en el lanzador y config sin `env` | RF-10 |
| Bloqueo de orígenes | RF-9 |
| `api.ts`, `testUser`, `uniqueData` | RF-11, RF-12, RF-13 |
| `registry.ts` y los dos proyectos | RF-13 |
| Escenarios E1–E4 | RF-14 a RF-17 |
| Escenarios C1–C3 | RF-18 a RF-20 |
| `ui.ts`, `texts.ts`, reglas de lint de localizadores y esperas | RF-21, RF-22 |
| Trazas, capturas e informes | RF-22, RF-10 |
| README de `e2etests/` y sección del raíz | RF-3, RNF-5, RNF-9 |
| `.gitignore` | RNF-6 |
| Pruebas de sensibilidad | RNF-11 |
| Ejecuciones repetidas y tiempo | RNF-4, RNF-5 |
| Sin cambios en `frontend/` ni `backend/` | RNF-8 |
| Configuración regional fija | RNF-10 |

## 12. Riesgos
- **R1 (U7).** Que Chromium no acepte o no envíe la cookie `Secure` sobre `http://127.0.0.1`. Lo
  comprueba T1, con el servidor en producción y la sesión iniciada por el formulario; si falla, se
  detiene la implementación y se vuelve a la spec con el usuario, sin tocar el servidor.
- **R2.** Que el cargador de Playwright 1.57 no acepte importaciones con extensión `.ts`. T2 lo
  comprueba; si falla, se para y se pregunta (alternativa: separar los módulos que usa `node` de los
  que usa Playwright).
- **R3.** Que `@playwright/test` no exponga `chromium.executablePath()` como se espera. T3 lo
  comprueba; alternativa: la lista de navegadores instalados de `npx playwright install --list`
  (decisión a consultar).
- **R4.** Vite y el orden de prioridad de las variables (§0). Lo comprueba T9 con archivos de
  variables de la interfaz en modo simulado: si la suite pasa, la construcción usó el servidor real.
- **R5.** RNF-5 (5 min). La compilación de la interfaz (`tsc -b` + `vite build`) más la del servidor
  son el grueso. Se mide en T9; si se pasa, se para y se consulta.

## 13. Preguntas del plan (cerradas)
Ninguna abierta. Las dos se cerraron por el usuario el 2026-11-22; se conserva su texto como
registro.

- **P1 = A (cerrada por el usuario el 2026-11-22).** E1 empieza en `/e2e-sin-vista`, con la vista
  «no encontrada» y su encabezado «No hay nadie en esta sala». Se aplicó como cambio de
  requisitos de la spec (CR-1, U13), aprobado por el usuario el 2026-11-22; este plan lo recoge en
  §0, §8, §9, §10 y T5. Descartadas B y C (abajo). La diferencia entre la spec 007, RF-33, y el
  código (`/` también lleva a Inicio con sesión) queda anotada en «Impacto» de la spec, sin abrir
  cambio por ahora (decisión del usuario).
- **P2 = A (cerrada por el usuario el 2026-11-22).** `@playwright/test` fijado en `1.57.0` (§1). T1
  comprueba con `npm view` que existe y admite Node 22; si no, se para y avisa al usuario.

Texto original de las preguntas:
- **P1. La página de entrada lleva a Inicio con sesión iniciada, y E1 paso 4 falla.**
  La spec 018 dice (Definiciones, RF-14, «Escenarios») que la entrada `/` «se muestra con o sin sesión
  iniciada» y que «Atrás» en E1 vuelve a ella. En el código, `PublicOnlyRoute` envuelve también la
  entrada (`app/router.tsx`, `ProtectedRoute.tsx`: «la entrada, el login y el registro llevan a
  Inicio»). En el paso 4, «Atrás» carga `/` como documento nuevo (Playwright desactiva la caché de
  ida y vuelta de Chromium), la interfaz ve la sesión y lleva a `/inicio`: la comprobación de la
  dirección de la entrada falla aunque las dos redirecciones sustituyan bien su entrada. Opciones:
  - **A (recomendada).** Cambio de la spec 018: E1 empieza en una dirección que no corresponde a
    ninguna vista (por ejemplo `/e2e-sin-vista`), con la vista «no encontrada» y su texto propio
    «No hay nadie en esta sala» (interfaz actual), que se muestra con o sin sesión y no redirige
    (spec 007, RF-28). Conserva las dos detecciones del paso 4: si la redirección a login añadiera
    una entrada, «Atrás» llevaría a `/agenda`; si la añadiera la vuelta a la agenda, «Atrás» llevaría
    a `/login` y de ahí a `/inicio`. Sin tocar la aplicación.
  - B. Cambio de la spec 018: mantener la entrada y esperar `/inicio` tras «Atrás». Pierde una de
    las dos detecciones (si la vuelta a la agenda añadiera una entrada, «Atrás» también acabaría en
    `/inicio`), así que el paso 4 deja de probar lo que dice RF-14.
  - C. Cambio de la spec 007 y del frontend para que la entrada no redirija con sesión. Cambia el
    comportamiento de la aplicación desde esta spec (RNF-8 obliga a hacerlo por el flujo de cambio
    de la 007) y no lo pide el enunciado.
- **P2. Versión exacta de Playwright.** El planificador propone `@playwright/test@1.57.0`, la última
  estable que conoce con certeza (admite Node 22). Opciones: **A (recomendada)** fijar 1.57.0 y que
  T1 compruebe que existe; B que T1 tome la última 1.x estable que muestre `npm view` ese día y la
  anote (más reciente, pero la elige el implementador). Con A, si 1.57.0 no existiera, T1 se para y
  pregunta.
