# Pruebas E2E de TeamMatchUp

Suite de pruebas de extremo a extremo con [Playwright](https://playwright.dev/) (spec 018,
`specs/018-pruebas-e2e/`). Recorre la aplicación en un navegador real, contra el servidor real
compilado y una base MongoDB propia, con siete escenarios que se ejecutan en serie:

| Código | Escenario |
| --- | --- |
| E1 | ruta protegida sin sesión y vuelta a la ruta de origen |
| E2 | credenciales incorrectas |
| E3 | ruta protegida con sesión y recarga |
| E4 | cierre de sesión |
| C1 | crear y listar una sesión de juego |
| C2 | ver y editar, con Atrás, Adelante y recarga |
| C3 | eliminar (= cancelar) una sesión de juego |

Esta carpeta es independiente de `frontend/` y `backend/`: tiene sus propias dependencias, su
configuración, su comprobación de tipos y su lint, y no importa código de las otras dos. Llega a
la aplicación solo por el navegador y por la API HTTP.

Todos los comandos de este documento se escriben **desde la carpeta `e2etests/`** salvo que se
diga otra cosa, y valen igual en Linux, macOS y Windows (bash, zsh, PowerShell o `cmd`): ningún
script usa sintaxis propia de una consola.

## Condiciones previas

| Qué | Cómo comprobarlo | Cómo cumplirlo |
| --- | --- | --- |
| Node.js **22.18 o superior** | `node --version` | Instalar Node 22 LTS (22.18 o posterior) |
| MongoDB local en marcha en `127.0.0.1:27017` | que el servicio esté iniciado (ver abajo) | Servicio de MongoDB o contenedor Docker (ver abajo) |
| Dependencias de `frontend/` | — | `npm ci` dentro de `frontend/` |
| Dependencias de `backend/` | — | `npm ci` dentro de `backend/` |
| Dependencias de `e2etests/` | — | `npm ci` dentro de `e2etests/` |
| Chromium de Playwright | — | `npm run browser:install` dentro de `e2etests/` |

Desde la raíz del repositorio, la primera vez:

```bash
cd frontend
npm ci
cd ../backend
npm ci
cd ../e2etests
npm ci
npm run browser:install
```

- `npm run browser:install` descarga Chromium en la caché de Playwright del usuario, fuera del
  repositorio. En Linux, si al ejecutar la suite falta alguna biblioteca del sistema, instálalas
  con `npx playwright install --with-deps chromium` (pide permisos de administrador).
- MongoDB: basta con cualquier MongoDB local escuchando en `127.0.0.1:27017` (el mismo que usas
  para desarrollar). Si no tienes uno, con Docker:
  `docker run -d --name tmu-mongo-e2e -p 127.0.0.1:27017:27017 mongo` (y después
  `docker start tmu-mongo-e2e` para volver a arrancarlo).
- **No hace falta `backend/.env`** ni ningún archivo de variables: la suite fija todo lo que
  necesita en el entorno del proceso. Si `backend/.env` o `frontend/.env*` existen, no los modifica
  y lo que digan no cambia lo que se prueba (ver «Qué no toca»).

Si faltan dependencias de `frontend/` o `backend/`, Chromium no está instalado o el puerto está
ocupado, la suite lo dice y termina con un código distinto de 0 **antes de compilar**. Si faltan
las dependencias de `e2etests/`, quien falla es npm (algo como «playwright: orden no encontrada» o
«'playwright' is not recognized»): ejecuta `npm ci` en `e2etests/`.

### Herramienta opcional: mongosh

El intérprete de MongoDB (`mongosh`) **no hace falta para ejecutar la suite**. Sirve para
inspeccionar o borrar a mano la base E2E. Para comprobar si lo tienes:

```bash
mongosh --version
```

Si usas MongoDB en Docker, el contenedor ya lo trae: `docker exec -it tmu-mongo-e2e mongosh`.

## Comandos

| Para | Comando |
| --- | --- |
| Ejecutar la suite completa | `npm test` |
| Ejecutar un solo escenario | `npm test -- --grep C2` (cualquier código: E1, E2, E3, E4, C1, C2, C3) |
| Ejecutar los escenarios en orden inverso (C3 → E1) | `npm run test:reverse` |
| Abrir el informe de la última ejecución | `npm run report` |
| Comprobación de tipos | `npm run typecheck` |
| Lint | `npm run lint` |
| Pruebas de las reglas propias de la suite (`node:test`) | `npm run test:unit` |

Si en alguna consola `npm test -- --grep C2` ejecuta los siete escenarios en lugar de uno (algunas
versiones de PowerShell se comen el `--`), usa la forma equivalente sin `--`:
`npx playwright test --project=chromium --grep C2`.

`npm test` hace, en este orden:

1. comprueba, sin compilar ni arrancar nada, el nombre y la ubicación de la base E2E, las
   dependencias, Chromium y que el puerto esté libre;
2. compila la interfaz y el servidor a partir del código actual;
3. arranca el servidor compilado en modo producción en `http://127.0.0.1:3901` con la base E2E y
   espera a que responda (como mucho 60 s);
4. ejecuta los siete escenarios en Chromium, de uno en uno;
5. detiene el servidor al terminar, también si un escenario falla o si interrumpes con Ctrl+C;
6. termina con código 0 si pasan todos y con otro código si falla alguno.

Sin reintentos automáticos: un escenario que falla una vez cuenta como fallido.

### Cada ejecución sustituye las construcciones

Cada ejecución compila la interfaz y el servidor y **sustituye las construcciones que hubiera**:
`frontend/dist/` (salida de la interfaz), `backend/dist/` (la interfaz que sirve el servidor) y
`backend/out/` (el servidor compilado). Son las mismas carpetas del procedimiento de producción de
la spec 010; no se suben al repositorio y, si las necesitas como estaban, vuelve a generarlas con
ese procedimiento (`npm run build:ui` y `npm run build` en `backend/`, ver el README raíz).

> **Aviso (limitación conocida, Q8).** No ejecutes la suite mientras tengas en marcha un servidor
> de producción local arrancado a mano desde este mismo checkout en otro puerto (por ejemplo, el
> procedimiento de la spec 010 en el 3001). La suite solo comprueba su propio puerto, no detecta
> ese servidor y sustituiría las construcciones que está sirviendo. Detén ese servidor antes. El
> entorno de desarrollo (`npm run dev` del servidor en 3001 y de la interfaz en 5173) no tiene
> este problema: no usa las construcciones y la suite puede correr a la vez.

## Base de datos E2E

- La suite usa la base **`teammatchup_e2e`** en `mongodb://127.0.0.1:27017`, distinta de la de
  desarrollo (`teammatchup`) y de la de pruebas del servidor (`teammatchup_test`).
- Antes de compilar exige que el nombre contenga «e2e» (sin distinguir mayúsculas), que no
  coincida con la base de desarrollo ni con la de pruebas configuradas (en el entorno o en
  `backend/.env`) y que la ubicación sea local (`127.0.0.1` o `localhost`, sin `mongodb+srv://`).
  Si no, termina con un mensaje que dice qué regla falla, sin mostrar la ubicación.
- Cada escenario crea su propio usuario de prueba por la API (con correo y nombre únicos), y al
  terminar, pase o falle, lo elimina por la API, lo que borra en cascada sus cuentas de juego y sus
  sesiones de juego. **Tras una ejecución completa la base queda sin documentos** (las colecciones
  `tmu_*` pueden existir, vacías).
- Pueden quedar restos si interrumpes una ejecución en un mal momento o si falla la limpieza de un
  escenario. En ese caso el informe lo dice («Falló la limpieza, no el escenario») con el correo y
  el nombre del usuario que quedó y el código recibido. Los restos no hacen fallar las ejecuciones
  siguientes. Para borrarlos, elimina la base E2E entera:

  ```bash
  mongosh "mongodb://127.0.0.1:27017/teammatchup_e2e" --eval "db.dropDatabase()"
  ```

  (con Docker: `docker exec tmu-mongo-e2e mongosh "mongodb://127.0.0.1:27017/teammatchup_e2e" --eval "db.dropDatabase()"`).
  Si cambiaste el nombre con `E2E_MONGODB_DBNAME`, usa ese nombre.

## Variables opcionales

Ninguna es obligatoria y **ninguna es un secreto**. No hay archivo de variables propio de la
suite.

| Variable | Valor por defecto | Para qué |
| --- | --- | --- |
| `E2E_PORT` | `3901` | Puerto del sistema bajo prueba (siempre en `127.0.0.1`) |
| `E2E_MONGODB_URI` | `mongodb://127.0.0.1:27017` | Ubicación de MongoDB; debe ser local |
| `E2E_MONGODB_DBNAME` | `teammatchup_e2e` | Nombre de la base E2E; debe contener «e2e» |

Cómo fijarlas para una ejecución:

- bash o zsh (Linux, macOS): `E2E_PORT=3902 npm test`
- PowerShell (Windows): `$env:E2E_PORT="3902"; npm test` (queda fijada en esa ventana hasta que
  la cierres o ejecutes `Remove-Item Env:E2E_PORT`)
- `cmd` (Windows): `set E2E_PORT=3902` y después `npm test`

## Puerto

El sistema bajo prueba escucha solo en `127.0.0.1`, en el puerto **3901** (o el de `E2E_PORT`),
distinto de los de desarrollo (3001 del servidor y 5173 de la interfaz). Si el puerto está
ocupado, por otra ejecución de la suite o por cualquier otro programa, la suite termina antes de
compilar; nunca reutiliza un servidor que ya esté escuchando.

## Solo Chromium

La suite solo usa el Chromium que instala Playwright. Prueba la construcción de producción
servida por el servidor real en modo producción (Q1), y en ese modo la cookie de sesión lleva el
atributo `Secure`; la suite la abre en `http://127.0.0.1`, sin HTTPS, y Chromium acepta y envía
esa cookie en `127.0.0.1` (comprobado en la tarea T1), pero Firefox y WebKit no lo garantizan
(Q2). Además, Chromium es el navegador del equipo y del evaluador y el más rápido de ejecutar.

## Qué no toca

- Ni la base de desarrollo, ni la de pruebas del servidor, ni la de producción: solo la base E2E.
- Ni el modo simulado de la interfaz: compila siempre con `VITE_USE_MOCK_API=false` y la API en
  `/api` del mismo servidor, aunque `frontend/.env*` diga otra cosa.
- Ni ningún servicio externo: arranca el servidor sin claves de Steam, Riot Games ni Leetify
  (aunque `backend/.env` las tenga) y, mientras corre un escenario, el navegador bloquea toda
  petición a otro origen. La suite pasa sin conexión a Internet una vez instalado todo.
- Ni los archivos de variables (`backend/.env`, `frontend/.env*`): todo lo pasa por el entorno del
  proceso. El secreto de firma de las sesiones se genera al azar en cada ejecución y no se escribe
  en ningún archivo, informe ni salida.
- Ni el código de `frontend/` ni de `backend/`.

## Informe y trazas de un escenario fallido

- La consola muestra qué escenario falló, en qué paso y qué comprobación (con su archivo y línea).
- `npm run report` abre el informe HTML de la última ejecución (`playwright-report/`). En cada
  escenario fallido están el error, la captura de pantalla y la traza.
- La traza (`trace.zip`) y la captura (`test-failed-1.png`) quedan también en
  `test-results/<escenario>/`. Para abrir una traza: `npx playwright show-trace <ruta del
  trace.zip>`. Solo se guardan de los escenarios que fallan.
- Hay además un informe JSON en `playwright-report-json/report.json`.
- `playwright-report/`, `playwright-report-json/` y `test-results/` no se suben al repositorio
  (están en `.gitignore`); cada ejecución las sustituye.

## Duración

Medida el 2026-11-22 en un equipo de desarrollo con Linux (Node 22.20.0, MongoDB 9.0.8 en Docker),
con dependencias y Chromium ya instalados: **unos 30 segundos** por ejecución completa,
compilación de la interfaz y del servidor incluida (tres ejecuciones seguidas: 29,1 s, 27,2 s y
26,5 s). Un escenario solo tarda entre 10 y 15 segundos, casi todo compilación.

## Plataformas

| Plataforma | ¿Ejecutada de verdad? | Fecha | Resultado |
| --- | --- | --- | --- |
| Linux (Arch, Node 22.20.0) | Sí | 2026-11-22 | 7 passed, también en orden inverso |
| macOS o Windows | **Pendiente** | — | Falta que la ejecute un integrante del equipo |

A día de hoy la suite **solo se ha ejecutado de verdad en Linux**. En macOS y Windows la regla de
no usar sintaxis de una consola se ha comprobado solo leyendo los scripts.

**Para quien la ejecute en macOS o Windows** (idealmente alguien que no escribió la suite,
siguiendo solo este README):

1. Cumple las condiciones previas (Node, MongoDB, `npm ci` en las tres carpetas y
   `npm run browser:install`).
2. Desde `e2etests/`, ejecuta y guarda el resultado de:
   - `node --version`
   - `npm run test:unit`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` (anota la última línea, por ejemplo `7 passed (30.0s)`, y si terminó sin error)
   - `npm run test:reverse`
3. Comprueba que, al terminar, ya no hay nada escuchando en el puerto 3901 (en macOS:
   `lsof -i :3901` no muestra nada; en Windows PowerShell: `Get-NetTCPConnection -LocalPort 3901`
   da error de que no hay ninguna).
4. Anota la plataforma (sistema y versión, consola usada), la fecha, las salidas anteriores y
   cualquier paso de este README que no te sirviera tal cual en la tabla de arriba y en
   `specs/018-pruebas-e2e/validation.md` (sección T10, «Otra plataforma»).
