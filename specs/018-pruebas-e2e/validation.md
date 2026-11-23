# Validación 018 — Pruebas E2E con Playwright
Registro de cada tarea de `tasks.md` (una sección por tarea): comandos, salida resumida y lo
observado. Creado en T1 (2026-11-22).

## Índice
- [T1. Dependencias, Chromium y comprobación de la cookie Secure (U7)](#t1) — **hecha (U7 cumplida)**
- [T2. Configuración de `e2etests/` y reglas puras](#t2) — **hecha**
- [T3. Lanzador del sistema bajo prueba y `playwright.config.ts`](#t3) — **hecha**
- [T4. Cliente de la API, fixtures, textos y E2](#t4) — **hecha**
- [T5. E1, E3 y E4: inicio de sesión, acceso protegido, recarga y cierre de sesión](#t5) — **hecha**
- [T6. C1: crear y listar](#t6) — **hecha**
- [T7. C2: ver y editar, con Atrás, Adelante y recarga](#t7) — **hecha**
- [T8. C3: eliminar = cancelar](#t8) — **hecha**
- [T9. Criterios de la suite completa](#t9) — **hecha** (puntos 2 y 3 en una copia descartable; ver «Observaciones»)
- [T10. Documentación, otra plataforma y cierre](#t10) — **hecha salvo la parte [usuario]**: falta la ejecución en macOS o Windows (RNF-9)

## T1
Fecha: 2026-11-22. Node v22.20.0, npm 10.9.3, Linux.

### Comprobación previa de versiones (`npm view`, antes de instalar)
| Paquete | Versión | `engines` | ¿Admite Node 22? |
| --- | --- | --- | --- |
| `@playwright/test` | 1.57.0 (existe; depende de `playwright` 1.57.0) | `node >=18` (también `playwright-core` 1.57.0) | sí |
| `typescript` | 5.9.3 | `node >=14.17` | sí |
| `@types/node` | 22.20.2 | — | — |
| `eslint` | 9.39.5 | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | sí |
| `@eslint/js` | 9.39.5 | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | sí |
| `typescript-eslint` | 8.70.0 | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | sí |

Las seis existen: no hubo que parar por P2.

### Instalación
- `e2etests/package.json`: `private`, `"type": "module"`, `engines.node` `>=22.18`, solo el script
  `browser:install`.
- `npm install --save-exact --save-dev` de las seis: 113 paquetes. Las seis quedan en
  `devDependencies` sin `^`; no hay `dependencies`.
- `npm ls`: árbol con las seis versiones exactas, sin avisos, código 0.
- `npm audit`: 7 avisos moderados, todos de `minimatch` transitivo de `typescript-eslint` 8.70.0
  (GHSA-g3hv-75wg-m249; la corrección pide `typescript-eslint` 8.73.0). El servidor usa la misma
  versión y tiene el mismo aviso. No se cambia la versión fijada en el plan; queda anotado para el
  usuario.
- `npm run browser:install`: Chromium 143.0.7499.4 (Playwright build v1200) y Chromium Headless
  Shell en `~/.cache/ms-playwright/` (fuera del repositorio). `npx playwright --version`: 1.57.0.

### U7 — primer intento (bloqueado)
Primer intento sin resultado: no había MongoDB en `127.0.0.1:27017` (sin `mongod`, demonio de
Docker parado) y `npm run build:ui` fallaba con `TS2307 Cannot find module '@mantine/core'`
(a `frontend/node_modules` le faltaban dependencias de la 016/017).

### Desbloqueo (decisiones del usuario, 2026-11-22)
- **MongoDB en contenedor.** Docker Desktop se arrancó como servicio de usuario
  (`systemctl --user start docker-desktop`, sin sudo; servidor Docker 29.7.2). Ya existía un
  contenedor `tmu-mongo` (parado) que publica en `0.0.0.0:27017`; no se tocó ni se reutilizó,
  porque el usuario pidió publicar solo en `127.0.0.1`. Contenedor nuevo:
  `docker run -d --name tmu-mongo-e2e -p 127.0.0.1:27017:27017 mongo:latest`
  Imagen `mongo:latest` (ya local, id `b0c835c26e59`), **MongoDB 9.0.8**
  (`MONGO_VERSION` de la imagen). `docker ps`: `tmu-mongo-e2e Up … 127.0.0.1:27017->27017/tcp`;
  `mongosh` `ping` → 1. Se deja en marcha para las tareas siguientes.
- **`npm ci` en `frontend/`** (autorizado): código 0, solo lo del lockfile;
  `package.json`/`package-lock.json` sin cambios.

### Compilación (procedimiento de la spec 010)
- `VITE_USE_MOCK_API=false VITE_API_URL=/api npm run build:ui` en `backend/`: código 0
  (`✓ built`, «interfaz copiada a backend/dist»; solo el aviso de Vite de un fragmento > 500 kB).
- `npm run build` en `backend/` (`tsc`): código 0.

### U7 — cookie `Secure` sobre `http://127.0.0.1` en Chromium: **CUMPLIDA**
Script desechable `u7/u7-check.mjs` en el scratchpad de la sesión (fuera del repositorio; usa el
Playwright de `e2etests/` y el `mongoose` del servidor). Servidor `node out/index.js` con
`NODE_ENV=production`, `HOST=127.0.0.1`, puerto libre, base temporal `teammatchup_e2e_u7_<azar>`
en `mongodb://127.0.0.1:27017`, `JWT_SECRET` aleatorio y `STEAM_API_KEY`, `RIOT_API_KEY` y
`LEETIFY_API_KEY` vacías. Resultado de la ejecución válida (puerto 46507, base
`teammatchup_e2e_u7_ca723e2a`):

| Comprobación | Observado |
| --- | --- |
| Registro por la API (`POST /api/users`) | 201 |
| `fetch` de Node a `POST /api/auth/login` | 200; `X-CSRF-Token` presente; `getSetCookie()` con `token=<…>; Path=/; HttpOnly; Secure; SameSite=Strict` |
| Login **por el formulario** en `/login` (Correo, Contraseña, «Entrar») | llega a `/inicio` |
| Cookie `token` del contexto (`context.cookies()` sin filtro) | `secure: true`, `httpOnly: true`, `sameSite: "Strict"`, `path: "/"`, `domain: "127.0.0.1"` |
| `/agenda` y recarga | sigue en `/agenda`; encabezado de nivel 1 «Agenda de la semana» visible (la cookie se envió) |
| Control: contexto nuevo sin sesión abre `/agenda` | redirige a `/login` (la agenda depende de la cookie) |
| Limpieza | `DELETE /api/users/me` → 204; base temporal borrada (`listDatabases`: solo `admin,config,local`) |

Observación para las tareas siguientes: en la primera ejecución el script leía la cookie con
`context.cookies(base)` y obtuvo `null` aunque la agenda se veía tras recargar. Causa: el filtro
por URL de Playwright 1.57 (`playwright-core/lib/server/network.js`, `filterCookies`) descarta las
cookies `Secure` cuando la URL es `http:` y el host no es `localhost`/`*.localhost`, y
`127.0.0.1` no cuenta como local. Chromium sí acepta y envía la cookie; es solo el filtro de la
consulta. Si un escenario necesita leer la cookie, debe usar `context.cookies()` sin URL y buscar
por nombre. `plan.md` no usa `cookies(url)`; queda anotado sin cambiar el plan.

Aplicación intacta: `git status --short frontend/ backend/` vacío (tras `npm ci` y las
compilaciones, que están ignoradas). `npm ls` en `e2etests/`: código 0, sin avisos. Ningún
proceso del servidor queda en marcha.

## T2
Fecha: 2026-11-22. Node v22.20.0, npm 10.9.3, Linux.

### Configuración (plan §2)
- `e2etests/tsconfig.json`: opciones estrictas del servidor (`strict`, `nodenext`, `esnext`,
  `types: ["node"]`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck`) más `noEmit`;
  `include: ["**/*.ts"]` y las cuatro carpetas de resultados excluidas.
- `e2etests/eslint.config.js`: la base del servidor (`js.configs.recommended`,
  `tseslint.configs.recommended`, `consistent-type-imports`, `no-unused-vars` con `^_`,
  `no-console`) más `ban-ts-comment` sin excepciones y `consistent-type-assertions` con
  `assertionStyle: "never"` en todo; en `tests/**` (y `lib/**/*.test.ts`, ver decisiones)
  `no-restricted-syntax` contra `.only`, `.skip`, `.fixme` y `.fail`; en `tests/**`
  `no-restricted-properties` contra `waitForTimeout`, `locator`, `$`, `$$`, `$eval`, `$$eval`,
  `getByTestId`, `waitForSelector` y `frameLocator`, y `no-restricted-globals` contra `setTimeout`.
- `e2etests/package.json`: scripts `test`, `test:reverse`, `test:unit` (lista explícita, sin
  comodín), `typecheck`, `lint`, `report` y `browser:install`; ninguno con variables delante, `&&`
  ni comodines (RNF-9).
- `.gitignore` raíz: `e2etests/playwright-report/`, `e2etests/playwright-report-json/`,
  `e2etests/test-results/` y `e2etests/blob-report/` (comprobado con `git check-ignore -v`).

### Reglas puras: rojo
Pruebas escritas primero (`lib/settings.test.ts`, `lib/preflight.test.ts`,
`lib/processEnv.test.ts`, `lib/uniqueData.test.ts`, `lib/origin.test.ts`,
`tests/registry.test.ts`), con los módulos reducidos a sus firmas, que lanzan
`T2: sin implementar`.

`npm run test:unit` → código 1: `tests 76, pass 1, fail 75`. Los 75 fallos son por
`T2: sin implementar` (69 directos y 6 de «token … se rechaza», cuyo `assert.throws(…, /token/)`
recibe ese mismo error). La única que pasa es «ningún rol es prefijo de otro», que solo mira la
constante `TITLE_ROLES` y no llama a ninguna función sin implementar.

### Reglas puras: verde
`readSettings`, `checkDatabaseName`, `checkMongoLocation`, `missingPackages`,
`formatPreflightErrors`, `uiBuildEnv`, `serverEnv`, `uniqueData`, `isSameOrigin` y
`orderScenarios` implementadas (plan §3).

`npm run test:unit` → código 0: `tests 76, pass 76, fail 0`. Casos del plan §10 cubiertos:
valores por defecto y puerto fuera de rango o no entero; nombre sin «e2e», «E2E» válido, igual al
de desarrollo o al de pruebas con otras mayúsculas, todos los configurados comparados;
ubicación local, `localhost` con puerto, lista con un servidor remoto, `mongodb+srv://`, con
credenciales (el mensaje no contiene la ubicación ni sus partes); `missingPackages`; `uiBuildEnv`;
`serverEnv` con las claves vacías aunque la base las traiga y el secreto recibido; `uniqueData`
con los formatos de las specs 002/004/006 y ningún título contiene a otro; `isSameOrigin`;
`orderScenarios`.

### Riesgo R2: importaciones con extensión `.ts` en Playwright 1.57
`tests/r2-check.spec.ts` temporal que importa `../lib/origin.ts`:
`npx playwright test --list tests/r2-check.spec.ts` → código 0, «Total: 1 test in 1 file»; y
ejecutado, `1 passed`. **R2 descartado.** El archivo y `test-results/` se borraron.

### Lint: comprobaciones negativas (archivos temporales, borrados)
- `tests/lint-check.spec.ts` con `test.only`, `page.waitForTimeout(500)` y `raw as string`:
  `npm run lint` → código 1 con tres errores: `no-restricted-syntax` (.only),
  `no-restricted-properties` (waitForTimeout) y `consistent-type-assertions` («Do not use any
  type assertions»).
- Segunda versión con `@ts-expect-error`, `any`, `test.skip`, `page.locator`, `getByTestId`,
  `setTimeout` y `<string>raw`: siete errores, uno por regla.
- `lib/lint-check.test.ts` con `test.only` de `node:test`: error `no-restricted-syntax`.
- `as const` sigue permitido (lo usan `uniqueData.ts` y `registry.test.ts` sin error).

### Decisiones que el plan no fijaba (para revisión)
- `orderScenarios` vive en `tests/registry.ts` (plan §3) y se prueba en `tests/registry.test.ts`;
  `readSettings` se prueba en `lib/settings.test.ts`. Las dos se añadieron a la lista explícita de
  `test:unit`, que en el plan §2 solo nombraba cuatro archivos. En T2 `registry.ts` solo contiene
  la regla pura; T4 añade la lista y `registerScenarios`.
- La prohibición de `.only`/`.skip`/`.fixme`/`.fail` se aplica también a `lib/**/*.test.ts`
  (`node --test` sin `--test-only` no la detecta), además de `tests/**` (RNF-3).
- Variables `E2E_*` vacías cuentan como no definidas (valor por defecto). Los mensajes de
  `checkDatabaseName` incluyen el nombre de la base (no es secreto); los de `checkMongoLocation`
  nunca la ubicación.
- `isSameOrigin` acepta `string | URL` (el predicado de `context.route` recibe un `URL`) y da
  `false` si la dirección no se puede interpretar.

### Estado final
- `npm run test:unit`: 76/76, código 0.
- `npm run typecheck`: código 0.
- `npm run lint`: código 0.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `graphify update .`: no ejecutado, `graphify` no está instalado en este equipo.

## T3
Fecha: 2026-11-22. Node v22.20.0, npm 10.9.3, Linux. MongoDB 9.0.8 en `tmu-mongo-e2e`
(127.0.0.1:27017). Sin `backend/.env` en este equipo.

### Archivos
- `e2etests/lib/backendEnv.ts` (+ `backendEnv.test.ts`): `readEnvFile(path)` (lee con
  `readFileSync` + `util.parseEnv`; `{}` si no existe; no toca `process.env`) y
  `configuredDatabaseNames(processEnv, fileEnv)` (los `MONGODB_DBNAME` y `TEST_MONGODB_DBNAME` del
  entorno y del archivo, sin vacíos ni repetidos): el `nombresConfigurados` del plan §4.2.
- `e2etests/scripts/start-server.ts`: lanzador del plan §4.2 (paso 1 sin compilar, paso 2
  `npm run build:ui` con `uiBuildEnv` y `npm run build` tras borrar `backend/out`, paso 3 arranque
  con `serverEnv` y secreto `randomBytes(32)`, sondeo de `GET /` cada 250 ms con plazo de 60 s,
  parada en SIGINT/SIGTERM/SIGHUP/`exit`).
- `e2etests/playwright.config.ts`: plan §4.1 y §6 (`webServer` sin `env`, dos proyectos, tres
  informes, `use` con `Desktop Chrome`, `es-CL`, `UTC`, `serviceWorkers: 'block'`).
- `e2etests/package.json`: `lib/backendEnv.test.ts` añadido a la lista de `test:unit`.

### `backendEnv`: rojo y verde
- Rojo: `npm run test:unit` → `tests 81, pass 76, fail 5`; los 5 de `backendEnv.test.ts`, todos
  por `T3: sin implementar`.
- Verde: `npm run test:unit` → `tests 81, pass 81, fail 0`.

### Riesgo R3: `chromium.executablePath()`
`import { chromium } from "@playwright/test"`: devuelve
`~/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome` (existe); con
`PLAYWRIGHT_BROWSERS_PATH=/nonexistent` devuelve una ruta que no existe (`existsSync` → `false`).
**R3 descartado.** Nota: la ruta es la del Chromium completo; la ejecución sin ventana usa
`chromium_headless_shell-1200`, que `npm run browser:install` instala a la vez. Una instalación
solo con `--only-shell` no la detectaría el lanzador (no se cambia el plan; anotado).

### Lanzador solo: casos que deben fallar sin compilar
Fechas de `backend/dist/index.html` y `backend/out/index.js` antes y después de todos:
`18:55:36.013` y `18:55:38.042` (sin cambios).

| Caso | Código | Mensaje (stderr) |
| --- | --- | --- |
| `E2E_MONGODB_DBNAME=teammatchup` | 1 | `la suite no arranca:` / `- el nombre de la base E2E («teammatchup») debe contener «e2e» (E2E_MONGODB_DBNAME)` |
| `E2E_MONGODB_URI=mongodb://usuario:clave-secreta@db.ejemplo.com:27017/x` | 1 | `- la ubicación de MongoDB (E2E_MONGODB_URI) debe nombrar solo los servidores 127.0.0.1 o localhost`; la salida no contiene `ejemplo`, `usuario` ni `clave-secreta` (0 coincidencias) |
| `E2E_MONGODB_URI=mongodb+srv://…` | 1 | `- la ubicación de MongoDB (E2E_MONGODB_URI) no puede usar mongodb+srv://, que busca los servidores por DNS` |
| `E2E_PORT=abc` | 1 | `- E2E_PORT debe ser un número entero entre 1 y 65535` |
| Puerto 3901 ocupado por un proceso TCP sin HTTP en 127.0.0.1 | 1 | `- el puerto 3901 de 127.0.0.1 está ocupado: detén lo que escucha en él o cambia E2E_PORT` |
| Puerto 3901 ocupado por un servidor HTTP en 0.0.0.0 | 1 | el mismo mensaje del puerto |
| `MONGODB_DBNAME=TEAMMATCHUP_E2E` en el entorno de la consola | 1 | `- el nombre de la base E2E («teammatchup_e2e») coincide, sin distinguir mayúsculas, con el de una base configurada del servidor (MONGODB_DBNAME o TEST_MONGODB_DBNAME): usa otro con E2E_MONGODB_DBNAME` |

### Lanzador solo: caso positivo y parada
- `setsid node scripts/start-server.ts` (grupo propio, como en una terminal): compila
  (`✓ built`, «interfaz copiada a backend/dist», `tsc`) y escribe
  `sistema bajo prueba listo en http://127.0.0.1:3901` a los 10 s. Las fechas de las dos
  construcciones cambian (19:06:30 y 19:06:32): se compiló desde el código actual.
- `GET http://127.0.0.1:3901/` → 200 `text/html`, `<title>TeamMatchUp</title>` y
  `<div id="root"></div>` (la interfaz); `GET /agenda` → 200. `ss`: solo escucha en `127.0.0.1:3901`.
- SIGINT al grupo (lo que envía Ctrl+C): el lanzador termina con **130**; ningún proceso
  `out/index.js` queda en marcha y el puerto 3901 queda libre.
- Segunda ejecución, SIGINT **solo** al lanzador (sin el grupo): termina con 130 y detiene él
  mismo al servidor; puerto libre, ningún `out/index.js`.
- Entorno del servidor (`/proc/<pid>/environ`, sin mostrar el secreto): `NODE_ENV=production`,
  `PORT=3901`, `HOST=127.0.0.1`, `MONGODB_DBNAME=teammatchup_e2e`, `STEAM_API_KEY=`,
  `RIOT_API_KEY=`, `LEETIFY_API_KEY=` vacías, `JWT_SECRET` de 43 caracteres. El entorno del
  lanzador no tiene `JWT_SECRET`. El secreto no aparece en las dos salidas guardadas ni en
  `e2etests/` (sin `node_modules`): 0 archivos.

### Comprobación adicional por `webServer` (temporal, borrada)
`tests/suite.spec.ts` temporal con un escenario que abre `/e2e-sin-vista` y espera el encabezado
«No hay nadie en esta sala»: `npm test` → Playwright lanza el lanzador, compila, «sistema bajo
prueba listo…», `1 passed (9.7s)`, código 0; al terminar no queda ni el lanzador ni el servidor y
el puerto está libre. En `playwright-report-json/report.json`, `config.webServer` no tiene `env`
(solo `command`, `url`, `reuseExistingServer`, `timeout`, `stdout`, `stderr`,
`gracefulShutdown`). Con un servidor HTTP en `127.0.0.1:3901`, `npx playwright test` termina con
código 1 y «http://127.0.0.1:3901/ is already used…» sin lanzar el comando (fechas sin cambios).
El archivo temporal, `test-results/` y los informes se borraron.

### Revisión de «Hecho cuando»
- Ningún `spawn` usa `shell`: los dos `spawn` llevan `shell: false` y el programa es
  `process.execPath` (`npm-cli.js` como argumento).
- El lanzador no escribe el entorno: solo escribe los mensajes de las condiciones, de compilación,
  «listo en <baseURL>» y el código del servidor; ningún `JSON.stringify` ni volcado de
  `process.env`.

### Decisiones que el plan no fijaba (para revisión)
- `configuredDatabaseNames` (pura) vive en `backendEnv.ts` junto a la lectura y tiene pruebas
  propias; `lib/backendEnv.test.ts` se añadió a `test:unit`.
- `playwright.config.ts` lanza un error con `formatPreflightErrors` si `E2E_PORT` no es válido
  (necesita `baseURL` para `webServer.url`); el lanzador comprueba lo mismo cuando se ejecuta solo.
- `npm_execpath` solo se usa si termina en `npm-cli.js` (con otro gestor se busca el `npm-cli.js`
  junto a Node: `node_modules/npm/bin` en Windows, `../lib/node_modules/npm/bin` en Linux/macOS).
- Código de salida en una señal: 128 + número de la señal (130 con SIGINT). Si el servidor termina
  después de «listo», el lanzador escribe «el servidor terminó (código N)» y sale con ese código
  (1 si no hay). Tras una señal no se informa «falló la compilación» ni «el servidor terminó al
  arrancar».
- Para detener al hijo: SIGTERM, hasta 5 s, y SIGKILL si sigue vivo.

### Estado final
- `npm run test:unit`: 81/81, código 0.
- `npm run typecheck`: código 0.
- `npm run lint`: código 0.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- Ningún servidor del sistema bajo prueba en marcha; puerto 3901 libre.
- `graphify update .`: no ejecutado, `graphify` no está instalado en este equipo.

## T4
Fecha: 2026-11-22. Node v22.20.0, npm 10.9.3, Linux. MongoDB 9.0.8 en `tmu-mongo-e2e`
(127.0.0.1:27017).

### Archivos
- `e2etests/tests/api.ts` (plan §5.1, D2): `createSuiteApi(baseURL)` con `register`, `login`,
  `linkR6`, `createSession` y `deleteMe` sobre el `fetch` de Node; la cookie `token` se toma de
  `getSetCookie()` y el comprobante de `X-CSRF-Token`, y se reenvían en `Cookie` y `X-CSRF-Token`.
  Respuestas leídas con guardas (`typeof`, `Reflect.get`), sin aserciones. Plazo de 10 s por
  petición; pasado, cuenta como «sin respuesta».
- `e2etests/tests/fixtures.ts` (plan §5.2, §5.3, §6): `test` extendido con `blockOtherOrigins`
  (automático, `context.route` con `isSameOrigin` → `abort('blockedbyclient')`) y `testUser`
  (plazo propio de 30 s; registro → `use` → limpieza con una sesión de la suite nueva);
  `cleanupFailure` (pura); tipos `Scenario` y `ScenarioArgs`.
- `e2etests/tests/texts.ts`: todos los textos y direcciones de plan §9 con su origen en un
  comentario (también los de E1, E3, E4 y C1–C3, que se usarán en T5–T8).
- `e2etests/tests/ui.ts` (plan §8): `weekBlockName` (pura), `loginByForm`, `openAddress`,
  `expectPath` (compara solo la ruta con `expect.poll`), localizadores de vistas, `panelTitled`,
  `weekShows`/`weekDoesNotShow`, `panelShowsCard`/`panelDoesNotShow`, `notInAgenda` y
  `expectAgendaContent`.
- `e2etests/tests/registry.ts`: `orderScenarios` (de T2), `SCENARIOS` (hoy solo E2) y
  `registerScenarios(order)`.
- `e2etests/tests/suite.spec.ts` y `suite.reverse.spec.ts`.
- `e2etests/tests/auth.scenarios.ts`: E2 (RF-15) con sus dos pasos como `test.step`.
- `e2etests/tests/ui.test.ts` y `e2etests/tests/fixtures.test.ts` (node:test), añadidos a la lista
  de `test:unit`.

### Aviso de T2 sobre `registry.test.ts`
Antes de escribir `registry.ts` se comprobó con un archivo temporal (borrado) que `node --test`
puede importar `@playwright/test` y llamar a `test.extend` fuera del ejecutor de Playwright:
`pass 1`. `registry.test.ts` sigue funcionando porque `registerScenarios` (la única que llama a
`test()`) solo se invoca desde los `suite*.spec.ts`.

### Reglas puras de T4: rojo y verde
- Rojo: `ui.test.ts` (4 casos de `weekBlockName`) y `fixtures.test.ts` (3 de `cleanupFailure`) con
  las dos funciones lanzando `T4: sin implementar`: `npm run test:unit` → `tests 88, pass 81,
  fail 7`, los 7 por `T4: sin implementar`.
- Verde: `npm run test:unit` → `tests 88, pass 88, fail 0`.

### E2 en verde
`npm test` → el lanzador compila, «sistema bajo prueba listo en http://127.0.0.1:3901»,
`✓ [chromium] › E2 · credenciales incorrectas (886ms)`, `1 passed (10.6s)`, código 0. Al terminar:
puerto 3901 libre, ningún `out/index.js` ni `start-server.ts` en marcha. Base E2E: 0 documentos en
las cinco colecciones (`tmu_users` 0): la limpieza borró al usuario de prueba.

### Prueba de sensibilidad de E2 (plan §10)
- Cambio en `auth.scenarios.ts`: texto esperado `"correo o contraseña incorrecto"` (sin la s), con
  `exact: true`. `npm test -- --grep E2` → código 1: `E2 · credenciales incorrectas › paso 1: login
  con una contraseña equivocada`, `expect(locator).toBeVisible() failed`, `Locator:
  getByText('correo o contraseña incorrecto', { exact: true })`, `element(s) not found`, en
  `auth.scenarios.ts:16` (la comprobación cambiada); con captura y traza en `test-results/`.
- Deshecho (`TEXTS.badCredentials` otra vez): `npm test -- --grep E2` → `1 passed`, código 0.

### Limpieza rota a propósito (RF-12, U6)
- Cambio temporal en `fixtures.ts`: la limpieza inicia sesión con `${user.password}-rota`.
  `npm test -- --grep E2` → código 1; el escenario pasó sus comprobaciones y el informe muestra:
  `Error: Falló la limpieza, no el escenario: el usuario de prueba e2e-5227895b3152@example.com
  (e2e_5227895b3152) quedó en la base E2E; el inicio de sesión respondió 401` (en
  `fixtures.ts:102`), con captura y traza.
- Deshecho (`api.login(user)`). El usuario que quedó se vio y se borró con `mongosh`
  (`db.tmu_users.deleteOne({ email: "e2e-5227895b3152@example.com" })` → `deletedCount: 1`); la base
  E2E vuelve a 0 documentos en todas sus colecciones.

### Decisiones que el plan no fijaba (para revisión)
- `weekBlockName` y `cleanupFailure` (puras, plan §3) se prueban con `node:test` en
  `tests/ui.test.ts` y `tests/fixtures.test.ts`, añadidos a `test:unit` (Playwright no los carga:
  los proyectos solo cogen `suite*.spec.ts`).
- Paso del mensaje de limpieza con artículo: «el inicio de sesión respondió 401» / «la eliminación
  respondió N» (el plan escribe `'inicio de sesión'` y `'eliminación'`). Si la respuesta tiene un
  código pero le falta algo (login 200 sin cookie o sin comprobante), se añade entre paréntesis.
- `testUser` con el registro sin respuesta: como el fixture lanza antes de `use`, Playwright no
  ejecutaría su desmontaje; por eso la limpieza (que tolera el 401) se intenta ahí mismo y el
  error de preparación incluye el de limpieza si lo hay.
- Un 401 de credenciales en la limpieza con el usuario «creado» se informa como `respondió 401`.
- `expectPath` usa `expect.poll` sobre `new URL(page.url()).pathname` (espera a un estado, sin
  tiempos fijos) en lugar de `toHaveURL`, para comparar solo la ruta con un mensaje claro.
- `SCENARIOS` contiene hoy solo E2; T5 añade E1, E3 y E4 en `AUTH_SCENARIOS` y T6–T8 los de agenda.

### Estado final
- `npm run test:unit`: 88/88, código 0.
- `npm run typecheck`: código 0.
- `npm run lint`: código 0.
- `npm test`: `1 passed` (E2), código 0. `npm run test:reverse`: `1 passed`, código 0.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. Base E2E sin documentos.
- Sin `.only`, `.skip`, `waitForTimeout`, `any` ni `@ts-` en `tests/`.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `test-results/` e informes borrados tras las comprobaciones (están ignorados).

## T5
Fecha: 2026-11-22. Node v22.20.0, Linux. MongoDB 9.0.8 en `tmu-mongo-e2e` (127.0.0.1:27017).

### Archivos
- `e2etests/tests/auth.scenarios.ts`: E1 (RF-14, U13), E3 (RF-16) y E4 (RF-17), cada paso de su RF
  como `test.step`; `AUTH_SCENARIOS = [e1, e2, e3, e4]` (orden habitual, RF-13). Dos ayudas locales:
  `expectHome` (ruta `/inicio` + encabezado de nivel 1 propio de Inicio) y `expectLogin` (ruta
  `/login` + campos «Correo» y «Contraseña»).
- Sin cambios en `texts.ts` ni `ui.ts`: la dirección sin vista, el encabezado «No hay nadie en esta
  sala», el enlace «Agenda» de la navegación «Principal» y «Cerrar sesión» ya estaban (T4), con su
  origen. Todo se localiza por rol, nombre accesible, etiqueta o ruta; ningún defecto de
  accesibilidad (RF-21).

### Comprobaciones negativas (RF-22), una por una
- E1 paso 2: título de la agenda oculto, después de la ruta `/login` y los campos visibles.
- E1 paso 4: campos de login ocultos, después de la ruta `/e2e-sin-vista` y el encabezado visibles.
- E3 paso 4: campos de login ocultos, después de la ruta `/inicio` y su encabezado visibles.
- E4 paso 4: encabezado de Inicio y título de la agenda ocultos, después de la ruta `/login` y los
  campos visibles.
- Ningún escenario abre `/` (U13).

### En verde
`npm test` → `✓ E1 (957ms)`, `✓ E2 (740ms)`, `✓ E3 (1.2s)`, `✓ E4 (3.6s)`, `4 passed (17.6s)`,
código 0. `npm run test:reverse` → E4, E3, E2, E1, `4 passed (17.5s)`, código 0.

### Pruebas de sensibilidad (plan §10)
Cada una con `npm test -- --grep <código>`; después se restauró el archivo (copia idéntica, `diff`
vacío) y la suite completa volvió a verde.
- **E1 (a)**: en el paso 1, encabezado esperado «No hay nadie en esta sal» (nivel 1, `exact: true`).
  → código 1, `E1 › paso 1: la dirección sin vista muestra la vista «no encontrada»`,
  `expect(locator).toBeVisible() failed`, `getByRole('heading', { name: 'No hay nadie en esta sal',
  exact: true, level: 1 })`, `element(s) not found`, en `auth.scenarios.ts:41`.
- **E1 (b)**: en el paso 4, dirección esperada tras «Atrás» = `/agenda`. → código 1,
  `E1 › paso 4: Atrás vuelve a la dirección sin vista, ya con sesión`, `la dirección debería ser
  /agenda`, `Expected: "/agenda"`, `Received: "/e2e-sin-vista"` (`auth.scenarios.ts:58`).
- **E3**: en el paso 3, dirección esperada tras F5 = `/inicio` (añadida como primera comprobación
  del paso, delante de `expectAgendaContent`). → código 1, `E3 › paso 3: la recarga sigue en la
  agenda`, `la dirección debería ser /inicio`, `Received: "/agenda"`.
- **E4 (a)**: en el paso 4, dirección esperada tras «Atrás» = `/inicio`. → código 1,
  `E4 › paso 4: Atrás (Inicio, protegida) lleva a login`, `Expected: "/inicio"`,
  `Received: "/login"`.
- **E4 (b)**: en el paso 5, destino esperado = `/agenda`. → código 1, `E4 › paso 5: el login vuelve
  a Inicio, la ruta de origen, y no a la agenda`, `Expected: "/agenda"`, `Received: "/inicio"`.

Ninguna prueba de sensibilidad dejó datos: la limpieza de `testUser` corre aunque el escenario
falle; base E2E con 0 documentos en las cinco colecciones al terminar.

### Decisiones que el plan no fijaba (para revisión)
- `expectHome` y `expectLogin` son ayudas locales de `auth.scenarios.ts` (no en `ui.ts`) porque solo
  las usan los escenarios de autenticación; E2 se dejó como estaba.
- E4 paso 6 agrupa en un mismo `test.step` «cerrar sesión otra vez» (comprueba login) y «abrir la
  agenda» (comprueba login otra vez), como dice RF-17.
- En E3 la dirección cambiada se añadió delante de `expectAgendaContent` (que ya compara la ruta
  dentro de `ui.ts`) en lugar de editar `ui.ts`, para que el cambio quedara en el propio escenario.

### Estado final
- `npm run test:unit`: 88/88, código 0.
- `npm run typecheck`: código 0. `npm run lint`: código 0.
- `npm test`: `4 passed`, código 0. `npm run test:reverse`: `4 passed`, código 0.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. Base E2E sin documentos.
- Sin `.only`, `.skip`, `waitForTimeout`, `any` ni `@ts-` en `tests/`.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `test-results/` e informes borrados.

## T6
Fecha: 2026-11-22. Node v22.20.0, Linux. MongoDB 9.0.8 en `tmu-mongo-e2e` (127.0.0.1:27017).

### Archivos
- `e2etests/tests/agenda.scenarios.ts` (nuevo): C1 (RF-18) con un `test.step` de preparación y uno
  por paso; `AGENDA_SCENARIOS = [c1]`. Ayudas locales: `suiteApi()` (cliente de `api.ts` con la
  `baseURL` de la configuración), `prepareLinkedUser` (sesión iniciada de la suite + cuenta R6 sin
  verificar), `prepareSession` (sesión de juego por la API), `allGamesPressed` (botón «Todos los
  juegos» con `pressed: true`) y `draftDialog` (rol `dialog`, nombre «Anotar una sesión»). Los
  errores de preparación dicen qué paso falló y el código o el motivo.
- `e2etests/tests/registry.ts`: `SCENARIOS = [...AUTH_SCENARIOS, ...AGENDA_SCENARIOS]` (orden
  E1, E2, E3, E4, C1).
- Sin cambios en `texts.ts`, `ui.ts`, `api.ts` ni `fixtures.ts`: todos los textos de C1 ya estaban
  (T4) con su origen.

### Datos (RF-11)
- Por la API: usuario (fixture `testUser`), cuenta R6 sin verificar (`r6Handle` del usuario) y
  sesión testigo `E2E C1 testigo <token>` el viernes (día 4) a las 19:00, 2 h, 4 cupos.
- Por la interfaz: login por el formulario en `/login` (llega a `/inicio`) y la sesión de juego
  `E2E C1 nueva <token>` creada con la ventana tal como la abre la cabecera (lunes 20:00).
- La limpieza de `testUser` borra en cascada cuenta y sesiones de juego.

### Localizadores (RF-21) y orden de las comprobaciones (RF-22)
- Todo por rol/nombre, etiqueta o ruta; ningún defecto de accesibilidad.
- Paso 2: el botón «Anotar sesión» se pulsa antes de que exista la ventana, así que es el único
  botón con ese nombre (la búsqueda estricta de Playwright fallaría si hubiera dos); el de envío se
  busca dentro de la ventana (paso 3). Los bloques de la semana con nombre «Anotar una sesión el …»
  no coinciden con `exact: true`.
- Única negativa: paso 4, «la ventana ya no está abierta» (`toBeHidden`), después de «Sesión
  abierta», la tarjeta y el bloque de la sesión creada.
- Paso 1 y paso 6: la tarjeta (paso 1, de la testigo; paso 6, de la creada) y el bloque de la semana
  son las comprobaciones positivas de que la lista llegó; el panel vacío no se usa.
- Ningún bloque de la semana se pulsa y no se cuentan sesiones (RF-13).

### En verde
`npm test -- --grep C1` → `✓ C1 · crear y listar (1.5s)`, `1 passed`, código 0.

### Prueba de sensibilidad (plan §10)
- **C1**: en el paso 6, título esperado en la semana tras F5 = `E2E C1 testigo 000000000000` (el
  de la testigo con otro token). `npm test -- --grep C1` → código 1, `1 failed`, `C1 › paso 6: tras
  F5 la agenda vuelve a su estado inicial con la sesión creada`, `expect(locator).toBeVisible()
  failed`, `getByRole('button', { name: /^E2E C1 testigo 000000000000, / })`, `element(s) not
  found`, en `agenda.scenarios.ts:127` (paso 6); captura y traza en `test-results/`.
- Se restauró el archivo desde una copia (`diff` vacío) y la suite completa volvió a verde.
- No dejó datos: base E2E con 0 documentos en las cinco colecciones.

### Decisiones que el plan no fijaba (para revisión)
- El escenario obtiene la `baseURL` para la API con `test.info().project.use.baseURL` en lugar de
  añadir un campo a `ScenarioArgs`, para no tocar `fixtures.ts` ni `registry.ts` más allá del
  registro. C2 y C3 reutilizarán las mismas ayudas.
- La preparación incluye el login por el formulario y espera a `/inicio` antes de abrir la agenda,
  para que el paso 1 no interrumpa la navegación del login.
- El paso 6 comprueba además la ruta `/agenda` tras F5 (no lo exige RF-18; no cambia lo que se
  prueba).

### Estado final
- `npm run test:unit`: 88/88, código 0.
- `npm run typecheck`: código 0. `npm run lint`: código 0.
- `npm test`: E1, E2, E3, E4, C1, `5 passed (19.7s)`, código 0.
- `npm run test:reverse`: C1, E4, E3, E2, E1, `5 passed (19.6s)`, código 0.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. Base E2E sin documentos.
- Sin `.only`, `.skip`, `waitForTimeout`, `any` ni `@ts-` en `tests/`.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `test-results/` e informes borrados. `graphify` no está instalado: no se pudo ejecutar
  `graphify update .`.

## T7
C2 · ver y editar, con Atrás, Adelante y recarga (RF-19; RF-11, RF-13, RF-21, RF-22). Fecha:
2026-11-22. Entorno: MongoDB 9.0.8 en `tmu-mongo-e2e`, base `teammatchup_e2e`, puerto 3901.

### Qué se escribió
- `tests/agenda.scenarios.ts`: escenario `c2` y `AGENDA_SCENARIOS = [c1, c2]`; ayuda local
  `detailShows(page, título, cupos)` (encabezado de nivel 1 con el título, «Miércoles ·
  18:00–20:00» y «1/<cupos> jugadores», todos con `exact: true`); constantes de la sesión editada
  (miércoles 18:00, día 2; 4 cupos → 5). Reutiliza `suiteApi`, `prepareLinkedUser` y
  `prepareSession` de T6.
- `tests/registry.ts`: solo el comentario del orden habitual (C3 llega en T8).
- Preparación: cuenta R6 y sesión `E2E C2 original <token>` por la API (devuelve el id, con el que
  se calcula la dirección exacta del detalle `/agenda/<id>`); login por el formulario y espera a
  `/inicio`.
- Pasos de RF-19:
  1. `/agenda` (abrir dirección) → ruta, «Mis sesiones» y enlace «Ver detalle de <original>».
  2. Pulsa ese enlace (nunca un bloque de la semana, RF-13) → ruta exacta del detalle, título,
     día y horario, «1/4 jugadores» y «La organizas».
  3. «Editar sesión» → «Título» con el valor `original` y la lista «Cupos» con «4» (valores
     actuales); escribe `E2E C2 editado <token>`, elige «5» en «Cupos» (`selectOption` por la
     etiqueta de la opción, lista localizada por su etiqueta), «Guardar cambios» → «Cambios
     guardados.», título nuevo y «1/5 jugadores».
  4. `goBack()` sin recargar → `/agenda`, «Mis sesiones», tarjeta y bloque de la semana del título
     nuevo; **solo entonces** la negativa `notInAgenda(original)` (RF-22).
  5. `goForward()` → la misma ruta exacta del detalle, título nuevo y «1/5 jugadores».
  6. `reload()` → la misma ruta exacta, título nuevo y «1/5 jugadores».
- Única negativa: la del paso 4, tras dos positivas que solo existen con la lista recibida y con
  la edición reflejada (tarjeta y bloque del título nuevo).
- Localizadores: rol + nombre, etiqueta y texto; sin CSS, testids, XPath ni esperas fijas.

### En verde
`npm test -- --grep C2` → `✓ C2 · ver y editar, con Atrás, Adelante y recarga (4.4s)`,
`1 passed`, código 0 (a la primera, sin reintentos).

### Prueba de sensibilidad (plan §10)
- **C2**: en el paso 3, cupos esperados tras guardar = «1/4 jugadores»
  (`detailShows(page, edited, ORIGINAL_SLOTS)`). `npm test -- --grep C2` → código 1, `1 failed`,
  `C2 › paso 3: editar título y cupos, guardar y ver los valores nuevos`,
  `expect(locator).toBeVisible() failed`, `getByText('1/4 jugadores', { exact: true })`,
  `element(s) not found`, en `agenda.scenarios.ts:151` (dentro de `detailShows`, llamada desde el
  paso 3); captura y traza en `test-results/`.
- Se restauró el archivo desde una copia en el scratchpad y `npm test -- --grep C2` volvió a
  verde (`1 passed`).
- La limpieza del usuario funcionó también con el escenario en rojo: base E2E con 0 documentos.

### Decisiones que el plan no fijaba (para revisión)
- El detalle se comprueba en la ruta **exacta** `/agenda/<id>` (con el id que devuelve la API) en
  los pasos 2, 5 y 6, en lugar de solo la expresión: así «Adelante» y F5 prueban que es el detalle
  de la misma sesión de juego.
- El paso 3 comprueba los valores actuales del formulario con `toHaveValue` (título y «4» en la
  lista nativa).
- «La organizas» se comprueba solo en el paso 2 (RF-19 lo pide allí); los pasos 3, 5 y 6 comprueban
  título y cupos, como dice RF-19.
- El paso 1 comprueba además la ruta `/agenda` y el encabezado «Mis sesiones» (no cambia lo que se
  prueba).

### Estado final
- `npm run test:unit`: 88/88, código 0.
- `npm run typecheck`: código 0. `npm run lint`: código 0.
- `npm test`: E1, E2, E3, E4, C1, C2, `6 passed (22.0s)`, código 0.
- `npm run test:reverse`: C2, C1, E4, E3, E2, E1, `6 passed (22.5s)`, código 0.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. Base E2E sin documentos (cinco
  colecciones a 0).
- Sin `.only`, `.skip`, `waitForTimeout`, `any` ni `@ts-` en `tests/`.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `test-results/` borrado. `graphify` no está instalado: no se pudo ejecutar `graphify update .`.

## T8
C3 · eliminar = cancelar (RF-20; RF-11, RF-13, RF-21, RF-22, U10). Fecha: 2026-11-22. Entorno:
MongoDB 9.0.8 en `tmu-mongo-e2e`, base `teammatchup_e2e`, puerto 3901.

### Qué se escribió
- `tests/agenda.scenarios.ts`: escenario `c3` y `AGENDA_SCENARIOS = [c1, c2, c3]`; ayudas locales
  `cancelDialog(page)` (rol `dialog`, nombre «¿Cancelar esta sesión?»), `cancelButton(page)` (botón
  «Cancelar sesión») y `agendaWithoutCancelled(page, testigo, cancelada)`: ruta `/agenda`,
  encabezado «Mis sesiones», tarjeta de la testigo, bloque de la testigo en la semana y, **solo
  después**, `notInAgenda(cancelada)` (RF-22). Reutiliza `suiteApi`, `prepareLinkedUser`,
  `prepareSession` y las constantes de día y hora de T6–T7.
- `tests/registry.ts`: solo el comentario del orden habitual (ya sin «C3 llega en T8»).
- Preparación: cuenta R6, sesión `E2E C3 original <token>` (miércoles 18:00; su id da la dirección
  exacta del detalle) y testigo `E2E C3 testigo <token>` (viernes 19:00) por la API; login por el
  formulario y espera a `/inicio`.
- Pasos de RF-20:
  1. `/agenda` (abrir dirección) → ruta, «Mis sesiones», tarjetas «Ver detalle de» de la original
     y de la testigo.
  2. Pulsa el enlace de la tarjeta (nunca un bloque, RF-13) → ruta exacta `/agenda/<id>` y
     encabezado de nivel 1 con el título.
  3. «Cancelar sesión» → ventana «¿Cancelar esta sesión?» visible.
  4. «Volver» dentro de la ventana → título y «Cancelar sesión» visibles; con eso a la vista, la
     ventana oculta.
  5. «Cancelar sesión» otra vez y «Sí, cancelar sesión» dentro de la ventana →
     `agendaWithoutCancelled` (ruta `/agenda`, «Mis sesiones», testigo en panel y semana; después la
     cancelada ausente en semana y panel).
  6. `goBack()` sin recargar (U10) → `agendaWithoutCancelled` y, tras esas positivas, el botón
     «Editar sesión» oculto (no se ve el detalle).
  7. `reload()` → lo mismo que en el paso 6 y en el mismo orden (testigo primero, ausencias
     después).
  8. Abre la dirección del detalle cancelado → ruta exacta, encabezado de nivel 1 «Esta sesión no
     existe» y enlace «Ir a la agenda».
- Negativas: pasos 4, 5, 6 y 7, todas tras una positiva del mismo estado (la ventana tras el
  título y el botón; la cancelada y «Editar sesión» tras la tarjeta y el bloque de la testigo).
- Localizadores: rol + nombre (botón, enlace, encabezado, ventana); sin CSS, testids, XPath ni
  esperas fijas. Todos los elementos se localizaron así (sin defectos de accesibilidad, RF-21).

### En verde
`npm test -- --grep C3` → `✓ C3 · eliminar = cancelar (3.8s)`, `1 passed`, código 0 (a la
primera, sin reintentos).

### Pruebas de sensibilidad (plan §10)
Copia del archivo en el scratchpad antes de cada cambio; restaurada después.
- **C3 (a)**: en el paso 6, tras `goBack()`, dirección esperada = la del detalle
  (`expectPath(page, detailPath)` antes de `agendaWithoutCancelled`). `npm test -- --grep C3` →
  código 1, `1 failed`, `C3 › paso 6: «Atrás» sin recargar sigue en la agenda, sin la sesión
  cancelada ni el detalle`, `Error: la dirección debería ser /agenda/6b036d21ad675f6777ffcad3`,
  `Expected: "/agenda/6b03…"`, `Received: "/agenda"`, en `agenda.scenarios.ts:300` (paso 6);
  captura en `test-results/`.
- **C3 (b)**: en el paso 7, tras `reload()`, comprobar como ausente el título de la testigo en
  lugar del cancelado (`agendaWithoutCancelled(page, witness, witness)`). `npm test -- --grep C3`
  → código 1, `1 failed`, `C3 › paso 7: tras F5, primero la testigo y después la ausencia de la
  sesión cancelada`, `expect(locator).toHaveCount(expected) failed`,
  `getByRole('button', { name: /^E2E C3 testigo 3a525ff50bd3, / })`, `Expected: 0`, `Received: 1`
  (en `weekDoesNotShow`, `ui.ts:107`). Confirma que la ausencia se comprueba con la lista ya
  recibida.
- Restaurado el archivo (sin rastro de los cambios: `grep -c SENSIBILIDAD` = 0) y
  `npm test -- --grep C3` volvió a verde (`1 passed`).
- La limpieza del usuario funcionó también con el escenario en rojo.

### Decisiones que el plan no fijaba (para revisión)
- La comprobación del paso 5 a 7 se agrupa en `agendaWithoutCancelled` para que el paso 7 repita
  exactamente lo del paso 6 en el mismo orden (RF-20, paso 7); en el paso 5 incluye la ruta
  `/agenda`, el panel «Mis sesiones», la testigo en panel y semana y la ausencia, como pide RF-20.
- El detalle se comprueba en la ruta exacta `/agenda/<id>` en los pasos 2 y 8 (igual que en C2).
- En el paso 7 se comprueba también «Editar sesión» oculto, por «lo mismo que en el paso 6».
- El paso 2 comprueba solo el título del detalle (RF-20 no pide día, cupos ni «La organizas»).

### Estado final (los siete escenarios)
- `npm run test:unit`: 88/88, código 0.
- `npm run typecheck`: código 0. `npm run lint`: código 0.
- `npm test`: E1, E2, E3, E4, C1, C2, C3, `7 passed (27.1s)`, código 0.
- `npm run test:reverse`: C3, C2, C1, E4, E3, E2, E1, `7 passed (26.8s)`, código 0.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. Base E2E sin documentos (cinco
  colecciones a 0).
- Sin `.only`, `.skip`, `waitForTimeout`, `any`, `@ts-`, `locator(` ni `getByTestId` en `tests/`.
- Aplicación intacta: `git status --short frontend/ backend/` vacío.
- `test-results/`, `playwright-report/` y `playwright-report-json/` borrados. `graphify` no está
  instalado: no se pudo ejecutar `graphify update .`.

## T9
Criterios de la suite completa (RF-2 a RF-13, RF-22, RNF-3 a RNF-6, RNF-8, RNF-10). Fecha:
2026-11-22. Node v22.20.0, Linux (Arch, kernel 7.2). MongoDB 9.0.8 en `tmu-mongo-e2e`
(127.0.0.1:27017), base `teammatchup_e2e`, puerto 3901. Sin cambios en el código de `e2etests/`:
T9 solo comprueba. Scripts y salidas desechables en el scratchpad de la sesión, fuera del
repositorio. Conteos de documentos con `docker exec tmu-mongo-e2e mongosh` (no hay `mongosh` en el
equipo). «Construcciones» = `backend/dist/index.html`, `backend/out/index.js` y
`frontend/dist/index.html` (fecha de modificación antes y después).

### 1. Fallos antes de compilar (RF-2.1, RF-4, RF-6, RF-7)
Todos con `npm test` (Playwright completo, no el lanzador solo). En todos: código ≠ 0, ningún
escenario ejecutado (ninguna línea `registry.ts`, `passed` ni `failed`), ninguna línea de
compilación (`built in`, «interfaz copiada») y las tres fechas de las construcciones sin cambios.

| Caso | Cómo | Código | Mensaje |
| --- | --- | --- | --- |
| Chromium sin instalar | `PLAYWRIGHT_BROWSERS_PATH=<carpeta vacía del scratchpad>` (la instalación real no se tocó) | 1 | `la suite no arranca:` / `- Chromium de Playwright no está instalado: npm run browser:install en e2etests/` |
| Puerto ocupado por otra ejecución de la suite | 1.ª `npm test` en segundo plano; al leer «sistema bajo prueba listo», 2.ª `npm test` | 1 | `Error: http://127.0.0.1:3901/ is already used, make sure that nothing is running on the port/url…` (Playwright, sin lanzar el comando). La 1.ª ejecución siguió y terminó en verde (`7 passed`) |
| Nombre `teammatchup` | `E2E_MONGODB_DBNAME=teammatchup` | 1 | `- el nombre de la base E2E («teammatchup») debe contener «e2e» (E2E_MONGODB_DBNAME)` |
| Nombre igual al de desarrollo configurado | `MONGODB_DBNAME=teammatchup_e2e` en el entorno de la consola (sin `backend/.env`) | 1 | `- el nombre de la base E2E («teammatchup_e2e») coincide, sin distinguir mayúsculas, con el de una base configurada del servidor (MONGODB_DBNAME o TEST_MONGODB_DBNAME): usa otro con E2E_MONGODB_DBNAME` |
| Nombre igual al de pruebas con otras mayúsculas | `TEST_MONGODB_DBNAME=tmu_test_e2e` y `E2E_MONGODB_DBNAME=TMU_Test_E2E` | 1 | el mismo mensaje, con «TMU_Test_E2E» |
| Ubicación no local | `E2E_MONGODB_URI=mongodb://usuario:clave-secreta@db.ejemplo.com:27017/x` | 1 | `- la ubicación de MongoDB (E2E_MONGODB_URI) debe nombrar solo los servidores 127.0.0.1 o localhost`; 0 coincidencias de `ejemplo`, `usuario` o `clave-secreta` en la salida |
| Faltan dependencias de `frontend/` y `backend/` (pendiente de T3) | renombrados temporales `frontend/node_modules/zustand` y `backend/node_modules/cookie-parser` (carpetas ignoradas), restaurados al momento; `npm ls` en las tres carpetas, código 0 después | 1 | `- faltan dependencias de frontend/ (zustand): ejecuta npm ci en frontend/` / `- faltan dependencias de backend/ (cookie-parser): ejecuta npm ci en backend/` |
| Faltan las de `e2etests/` (limitación del plan §4.3) | renombrado temporal de `e2etests/node_modules/@playwright/test`, restaurado | 127 | `sh: línea 1: playwright: orden no encontrada` (de npm; el lanzador no puede correr sin ellas, como dice el plan; lo explicará el README en T10) |

### 2. Fallos después de compilar (RF-4, casos límite)
- **MongoDB apagado**: `docker stop tmu-mongo-e2e`, `npm test`, `docker start tmu-mongo-e2e` (en
  marcha de nuevo a los 3 s). Código **1**; compila (`✓ built`, «interfaz copiada», `tsc`) y la
  salida muestra `la base de datos no está disponible: no se pudo conectar en 10 s`, `el servidor
  terminó al arrancar (código 1)` y `Process from config.webServer was not able to start`. Ningún
  escenario; puerto libre y ningún `out/index.js` al terminar.
- **Error de tipos en `frontend/` y, aparte, en `backend/`**: el clasificador de permisos de la
  sesión no permitió escribir en `frontend/` ni `backend/` del árbol de trabajo, así que se hizo
  en una **copia de trabajo descartable** en el scratchpad (`git archive HEAD frontend backend` +
  copia de `e2etests/` sin resultados; `node_modules` enlazados a los reales; `diff -rq` de
  `frontend/src` y `backend/src` con el árbol: iguales). Control en la copia sin cambios:
  `7 passed`, código 0.
  - Interfaz: `export const t9TypeError: number = "no es un número";` al final de
    `frontend/src/main.tsx` → código **1**, `src/main.tsx(17,14): error TS2322: Type 'string' is
    not assignable to type 'number'.`, `falló la compilación de la interfaz`; ningún escenario.
  - Servidor: la misma línea al final de `backend/src/index.ts` → código **1**,
    `src/index.ts(59,14): error TS2322 …`, `falló la compilación de el servidor`; ningún escenario.
  - Ambos archivos restaurados en la copia y la copia borrada. Nada se commiteó.

### 3. Archivos de variables sucios y base de desarrollo intacta (RF-5, RF-6, RF-8, RF-10; R4)
En la misma copia descartable (por el motivo de arriba; mismo código de `frontend/`, `backend/` y
`e2etests/`):
- `frontend/.env` y `frontend/.env.production.local` con `VITE_USE_MOCK_API=true` y
  `VITE_API_URL=http://localhost:3001/api`.
- `backend/.env` de desarrollo: `NODE_ENV=development`, `PORT=3001`, `HOST=0.0.0.0`,
  `MONGODB_URI=mongodb://127.0.0.1:27017`, `MONGODB_DBNAME=teammatchup`,
  `TEST_MONGODB_DBNAME=teammatchup_test`, el `JWT_SECRET` de desarrollo de `.env.example`, claves
  ficticias de Steam, Riot y Leetify y `PUBLIC_URL`.
- Base de desarrollo: no existía en este contenedor; se sembró con `mongosh` (2 usuarios, 1 cuenta,
  1 sesión) para que el conteo signifique algo. Antes: `{"tmu_gameaccounts":1,"tmu_playsessions":1,
  "tmu_users":2}`.
- `npm test` → **7 passed**, código 0. Entorno del servidor leído en `/proc/<pid>/environ` durante
  la ejecución: `NODE_ENV=production`, `PORT=3901`, `HOST=127.0.0.1`,
  `MONGODB_DBNAME=teammatchup_e2e`, `STEAM_API_KEY=`, `RIOT_API_KEY=`, `LEETIFY_API_KEY=` vacías, y
  `JWT_SECRET` distinto del de desarrollo. Solo escuchó en `127.0.0.1:3901` (nada en 3001).
- Después: el mismo conteo en `teammatchup` (`cmp` igual); `teammatchup_test` no se creó; base E2E
  con 0 documentos. Ningún archivo de `backend/dist` ni `frontend/dist` contiene `localhost:3001`
  (la construcción usó `/api`, R4 descartado).
- La base `teammatchup` sembrada se borró (`dropDatabase`); quedan `admin`, `config`, `local` y
  `teammatchup_e2e`.

### 4. Secreto de firma (RF-10, plan §7)
- Ejecución en verde: el secreto (43 caracteres) se leyó de `/proc/<pid>/environ` del servidor a
  un archivo del scratchpad. Búsqueda literal (`grep -F`) en la salida guardada, en todo
  `e2etests/` (incluidos `node_modules`, `playwright-report/` y
  `playwright-report-json/report.json`) y en el repositorio entero: **0** coincidencias.
- Ejecución con un escenario roto (punto 7), que deja traza: nuevo secreto leído igual; 0
  coincidencias en la salida, en `e2etests/`, en las 2 trazas descomprimidas (`test-results/` y
  `playwright-report/data/`), en el zip embebido en `playwright-report/index.html` y en el
  repositorio. Control positivo: el archivo con el secreto sí coincide. El archivo con el secreto
  se borró después.

### 5. Bloqueo de otros orígenes y sin conexión (RF-9)
- Prueba temporal (`tests/t9-origin.spec.ts` y `playwright.t9.config.ts`, que reutiliza la
  configuración con un proyecto propio; **borrados**), con Internet: con el `test` de
  `fixtures.ts` (bloqueo automático), `fetch("https://example.com/", { mode: "no-cors" })` desde
  la página → `TypeError: Failed to fetch` y `requestfailed` con
  `net::ERR_BLOCKED_BY_CLIENT`; con el `test` de `@playwright/test` (sin el fixture) la misma
  petición **responde** (`type=opaque`). `2 passed`.
- **Sin conexión**: la suite completa dentro de un espacio de red aislado (`unshare -rn`, solo `lo`;
  `fetch` a `https://example.com` → `EAI_AGAIN`), con MongoDB alcanzado por un puente desechable de
  socket Unix a `127.0.0.1:27017`: `npm test` → **7 passed (25.8s)**, código 0.

### 6. Cada escenario solo y orden inverso (RF-13)
`npm test -- --grep <código>` en el orden C3, C2, C1, E4, E3, E2, E1: los siete `1 passed`
(10.5–14.3 s), código 0, y cada uno ejecutó solo su escenario. `npm run test:reverse` → C3, C2, C1,
E4, E3, E2, E1, `7 passed (27.4s)`, código 0.

### 7. Escenario roto a propósito y conteo de la base E2E (RF-2.6, RF-12, RF-22)
- Cambio temporal en E2 (`auth.scenarios.ts:74`, texto «correo o contraseña incorrecto»), suite
  completa: código **1**, `1 failed` / `6 passed`; el informe nombra `E2 · credenciales incorrectas
  › paso 1: login con una contraseña equivocada`, `expect(locator).toBeVisible() failed`,
  `getByText('correo o contraseña incorrecto', { exact: true })`, en `auth.scenarios.ts:74`.
  `test-results/suite-E2-·-credenciales-incorrectas-chromium/` tiene `trace.zip`,
  `test-failed-1.png` y `error-context.md`. Restaurado (`diff` vacío con la copia).
- Base E2E (cinco colecciones) antes y después de una ejecución completa en verde, y antes y
  después de la ejecución con E2 roto: `tmu_gameaccounts 0, tmu_playsessions 0,
  tmu_riotchallenges 0, tmu_steamattempts 0, tmu_users 0` en los cuatro conteos (iguales).

### 8. Ctrl+C a mitad (RF-2.5, RF-12, RF-13)
`setsid npm test` (grupo propio, como una terminal) y, al ver `✓ 4` (E4), SIGINT al grupo (lo que
envía Ctrl+C): Playwright informa `1 interrupted` (C1), `2 did not run`, `4 passed`. Al terminar:
ningún proceso del grupo, ningún `out/index.js` ni `start-server.ts`, nada escuchando en 3901. La
limpieza de C1 corrió también (base E2E con 0 documentos). La ejecución siguiente (la 1.ª del punto
9), sin borrar nada, pasó.

### 9. Tres ejecuciones seguidas y tiempo (RNF-3, RNF-4, RNF-5)
Tres `npm test` seguidos, sin tocar nada entre medias (tampoco la base), `retries: 0`, ninguna
línea `retry` en la salida. Tiempo de pared del comando completo (compilación de la interfaz y del
servidor incluida; `vite build` ~2,3 s de ellos):

| Ejecución | Resultado | Tiempo total |
| --- | --- | --- |
| 1 | `7 passed (28.5s)`, código 0 | 29,1 s |
| 2 | `7 passed (26.6s)`, código 0 | 27,2 s |
| 3 | `7 passed (26.0s)`, código 0 | 26,5 s |

El resto de ejecuciones completas de T9 midió entre 26,5 y 29,1 s. **≤ 5 min: cumple** (R5
descartado). Tiempo para el README (T10): ~30 s en este equipo.

### 10. RNF-10: zona horaria, idioma y día
`TZ=Pacific/Kiritimati LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 LANGUAGE=en npm test` → `7 passed`,
código 0. En esa zona ya era lunes 23 (en la del equipo, domingo 22): otro día, otra hora y otro
idioma del proceso. No hay `faketime` para cambiar el reloj del equipo; el día de la semana sí
cambió por la zona.

### 11. Búsquedas en `e2etests/` y en el repositorio (RF-21, RF-22, RNF-2, RNF-3, RNF-6)
- `tests/`, `lib/`, `scripts/` (sin `node_modules`): 0 coincidencias de `.locator(`, `page.$`,
  `$eval`, `getByTestId`, `data-testid`, `xpath`, `css=`, `waitForSelector`, `frameLocator`,
  `querySelector`, `className`; 0 de `waitForTimeout`, `setTimeout` o `sleep(` en `tests/`; 0 de
  `.only(`, `.skip(`, `.fixme(`, `test.fail(`; 0 de `any`, `@ts-ignore`, `@ts-expect-error`,
  `@ts-nocheck`; 0 aserciones `as` salvo `as const`. Control: 30 líneas con `getByRole`.
  `playwright.config.ts`: `retries: 0`, `forbidOnly: true`.
- `git status` con informes, trazas, capturas y construcciones presentes: solo los archivos fuente
  de la spec (`e2etests/*` sin resultados, `specs/018-*`, `.gitignore`, `spec.md`);
  `playwright-report/`, `playwright-report-json/`, `test-results/`, `backend/dist`, `backend/out`,
  `frontend/dist` y `.env*` aparecen solo como ignorados (`git check-ignore -v`).
- Secretos en el repositorio (734 archivos sin seguimiento ignorado ni `node_modules`): patrones de
  `JWT_SECRET`/claves con valor, `RGAPI-`, URI con credenciales, claves privadas, `AKIA`, `ghp_`,
  `sk-`. Solo valores ficticios y documentados: el secreto de desarrollo de `.env.example`, URI de
  ejemplo en pruebas (`usuario:clave@…`, `usuario:s3creta@db.example.com`), `RGAPI-tu-nueva-clave`
  del README y `RGAPI-0000…` de las pruebas del servidor. Ningún secreto real.

### Observaciones (sin cambiar código; para revisión)
- Mensaje del lanzador «falló la compilación de **el** servidor» (debería ser «del servidor»). Sale
  de la plantilla del plan §4.2 («de <la interfaz|el servidor>»); no se corrige en T9.
- La comprobación de Chromium (R3) mira el Chromium completo, no `chromium_headless_shell`; con
  `npm run browser:install` se instalan los dos. Sigue solo anotado (T3).
- Los puntos 2 (errores de tipos) y 3 (archivos de variables sucios) se hicieron en una copia
  descartable y no en el árbol de trabajo, porque el clasificador de permisos de la sesión no dejó
  escribir en `frontend/` ni `backend/`. El código probado era el mismo (`git archive HEAD` y
  `diff -rq` igual). Si el usuario quiere la comprobación en el propio árbol, queda por repetir.
- No probado aquí, de T10: otra plataforma (RNF-9) y el README.

### Estado final
- `npm run test:unit`: 88/88, código 0. `npm run typecheck`: código 0. `npm run lint`: código 0.
- `npm test`: `7 passed (26.8s)`, código 0 (27,4 s). `npm run test:reverse`: `7 passed (25.9s)`,
  código 0.
- Base E2E con 0 documentos en las cinco colecciones; base de desarrollo sembrada, borrada.
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. `tmu-mongo-e2e` en marcha; `tmu-mongo`
  sin tocar (parado).
- `git diff` y `git status` de `frontend/` y `backend/` vacíos (RNF-8).
- `test-results/`, `playwright-report/` y `playwright-report-json/` borrados. `graphify` no está
  instalado: no se pudo ejecutar `graphify update .`.

## T10
Documentación, otra plataforma y cierre (RF-3, RNF-5, RNF-9). Fecha: 2026-11-22. Node v22.20.0,
Linux (Arch, kernel 7.2). MongoDB 9.0.8 en `tmu-mongo-e2e` (127.0.0.1:27017), base
`teammatchup_e2e`, puerto 3901.

### Documentos
- `e2etests/README.md` (nuevo), punto por punto de RF-3: condiciones previas con el comando de
  cada una (Node ≥ 22.18, MongoDB local, `npm ci` en `frontend/`, `backend/` y `e2etests/`,
  `npm run browser:install` y `--with-deps` en Linux); mongosh opcional con `mongosh --version`;
  comandos de la suite, de un escenario (`npm test -- --grep C2`, con la alternativa
  `npx playwright test --project=chromium --grep C2` por si una consola se come el `--`), del orden
  inverso, de tipos, de lint, de las reglas puras y del informe; que cada ejecución sustituye
  `frontend/dist`, `backend/dist` y `backend/out` y cómo regenerarlas (spec 010); aviso de Q8; base
  E2E, que queda sin documentos tras una ejecución, cuándo quedan restos y cómo borrarla
  (`db.dropDatabase()` con mongosh o `docker exec`); `E2E_PORT`, `E2E_MONGODB_URI` y
  `E2E_MONGODB_DBNAME` con sus valores por defecto y cómo fijarlas en bash/zsh, PowerShell y `cmd`
  (ninguna secreta, sin archivo de variables); puerto 3901 en `127.0.0.1`; solo Chromium y por qué
  (Q1, Q2, U7); qué no toca; informe HTML, JSON, trazas y capturas; duración medida en T9 (~30 s);
  tabla «Plataformas» e instrucciones para la otra plataforma.
- `README.md` raíz: fila de `e2etests/` en «Estado del repositorio» y sección «Pruebas E2E» con el
  comando y el enlace a `e2etests/README.md`. No se tocó nada más del README raíz.
- `AGENTS.md`: `e2etests/` en «Stack y estructura» y su línea en «Comandos».
- `MEMORY.md`: «Última actualización», «Fase actual», fila de la 018 y «Próximo paso».
- Comprobado el comando documentado de borrado con la base E2E ya vacía:
  `docker exec tmu-mongo-e2e mongosh "mongodb://127.0.0.1:27017/teammatchup_e2e" --eval "db.dropDatabase()"`
  → `{ ok: 1, dropped: 'teammatchup_e2e' }`.

### Errata de T9
`scripts/start-server.ts`: el mensaje pasa a «falló la compilación **de la interfaz**» y «falló la
compilación **del servidor**» (la etiqueta lleva la preposición: la plantilla queda
«falló la compilación ${label}», con `"de la interfaz"` y `"del servidor"`). No se volvió a romper la compilación para verlo (no se
toca `frontend/` ni `backend/`); lo cubren typecheck y lint, y la ejecución en verde de abajo.

### Otra plataforma (RNF-9): **PENDIENTE DEL USUARIO**
A día de hoy la suite completa **solo se ha ejecutado de verdad en Linux** (T4–T10). En macOS y
Windows la regla de RNF-9 se comprobó solo leyendo los scripts: `package.json` sin variables delante
del comando, sin comodines ni `&&`; todos los `spawn` del lanzador con `process.execPath` y sin
`shell`. No se simuló ninguna ejecución en otra plataforma.

Lo que tiene que hacer un integrante que no escribió la suite, en macOS o Windows, siguiendo solo
`e2etests/README.md` (sección «Plataformas»):
1. condiciones previas: Node ≥ 22.18, MongoDB local en `127.0.0.1:27017`, `npm ci` en `frontend/`,
   `backend/` y `e2etests/`, y `npm run browser:install` en `e2etests/`;
2. desde `e2etests/`: `node --version`, `npm run test:unit`, `npm run typecheck`, `npm run lint`,
   `npm test` y `npm run test:reverse`;
3. al terminar, nada escuchando en 3901 (macOS `lsof -i :3901`; Windows PowerShell
   `Get-NetTCPConnection -LocalPort 3901`);
4. anotar aquí abajo y en la tabla «Plataformas» del README: sistema y versión, consola, fecha,
   quién la ejecutó, la última línea de cada comando, su código de salida y cualquier paso del
   README que no sirviera tal cual.

Resultado en la otra plataforma: _(pendiente; lo rellena el usuario)_

### Verde en `e2etests/` (Linux, tras los cambios)
| Comando | Resultado |
| --- | --- |
| `npm run test:unit` | 88/88, 0 fallos, código 0 |
| `npm run typecheck` | código 0 |
| `npm run lint` | código 0 |
| `npm test` | `7 passed (25.8s)`, código 0; 26,3 s de pared con compilación |
| `npm run test:reverse` | C3 → E1, `7 passed (27.4s)`, código 0; 28,0 s de pared |

### Estado final
- Base E2E: 0 documentos en las cinco colecciones tras las dos ejecuciones; después se borró con el
  comando documentado (quedan `admin`, `config`, `local`).
- Ningún servidor ni lanzador en marcha; puerto 3901 libre. `tmu-mongo-e2e` sigue en marcha.
- `test-results/`, `playwright-report/` y `playwright-report-json/` borrados.
- `git status --short frontend/ backend/` y `git diff frontend/ backend/` vacíos (RNF-8).
- `graphify` no está instalado (ni `graphify-out/`): no se pudo ejecutar `graphify update .`.
- Casillas de los criterios de finalización de `spec.md`: sin marcar; las marca el `planner`.
- T10 queda **abierta** en `tasks.md`: su «Hecho cuando» exige «la ejecución en la otra plataforma
  anotada».
