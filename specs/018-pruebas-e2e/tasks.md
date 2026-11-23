# Tareas 018 — Pruebas E2E con Playwright
Estado: **pendiente de aprobación del usuario** (redactado el 2026-11-22, junto con `plan.md`;
ajustado el 2026-11-22 al CR-1 de la spec, U13). P1 y P2 cerradas por el usuario el 2026-11-22
(`plan.md` §13): E1 empieza en `/e2e-sin-vista` y `@playwright/test` va fijado en 1.57.0.

Reglas para todas las tareas:
- Una tarea cada vez, en este orden. Cada tarea cita sus RF/RNF y sigue `plan.md`.
- Reglas puras (`lib/*.ts`): primero las pruebas de `node:test` y el módulo con las firmas que lanzan
  `Tn: sin implementar`; `npm run test:unit` en **rojo por la razón correcta**; después el código y
  **verde**. Escenarios de Playwright: se escriben contra la aplicación ya implementada, se ven en
  verde y se hace su **prueba de sensibilidad** (plan §10): rojo por la comprobación cambiada, se
  deshace, verde otra vez (RNF-11). Todo va a `specs/018-pruebas-e2e/validation.md` (una sección por
  tarea; la crea T1).
- «Verde en `e2etests/`» = en `e2etests/`, `npm run typecheck`, `npm run lint` y `npm run test:unit`
  sin errores y, desde T4, `npm test` con todos los escenarios escritos en verde; sin `.only`,
  `.skip`, `any`, `@ts-ignore`, `@ts-expect-error`, aserciones de tipo ni esperas fijas.
- «Aplicación intacta» = `git status --short frontend/ backend/` vacío (las construcciones están
  ignoradas). Ninguna tarea toca `frontend/` ni `backend/` (RNF-8); si un elemento no se puede
  localizar por rol, etiqueta o texto, se para y se registra como defecto (RF-21).
- La base E2E es siempre la de la suite (`teammatchup_e2e` u otra con «e2e»); nunca `teammatchup`,
  `teammatchup_test` ni `fullstack`.
- Marcas: **[usuario]** = solo puede hacerla el usuario (o un compañero). Sin marca = `implementer`.

- [x] **T1. Dependencias, Chromium y comprobación de la cookie Secure (U7).** RNF-1, U7, RF-10, RF-11
  - Comprobar antes de instalar, con `npm view`, que existen `@playwright/test@1.57.0` (fijada por
    el usuario, P2 = A; y que `engines` admite Node 22), `typescript@5.9.3`, `@types/node@22.20.2`,
    `eslint@9.39.5`, `@eslint/js@9.39.5` y `typescript-eslint@8.70.0`. Si alguna no existe (o
    Playwright 1.57.0 no admite Node 22), parar sin instalar nada y avisar al usuario; no elegir
    otra versión.
  - Crear `e2etests/package.json` (privado, `"type": "module"`, `engines` `>=22.18`, sin scripts aún
    salvo `browser:install`), instalar las seis con `npm install --save-exact --save-dev` e
    instalar Chromium (`npx playwright install chromium`). Crear `validation.md` con su índice (T1 a
    T10).
  - **U7, a mano y fuera del repositorio** (script desechable en el scratchpad, que usa el Playwright
    de `e2etests/`): compilar con el procedimiento de la spec 010 (`npm run build:ui` y `npm run
    build` en `backend/`, con `VITE_USE_MOCK_API=false` y `VITE_API_URL=/api`); arrancar
    `node out/index.js` con `NODE_ENV=production`, `HOST=127.0.0.1`, un puerto libre, una base
    temporal con «e2e» en `mongodb://127.0.0.1:27017`, un `JWT_SECRET` aleatorio y las tres claves
    vacías; registrar un usuario por la API; en Chromium, abrir `http://127.0.0.1:<puerto>/login`,
    entrar **por el formulario**, comprobar que llega a `/inicio`, que la cookie `token` del
    contexto tiene `secure: true`, y que al abrir `/agenda` y recargar se ve «Agenda de la semana»
    (la cookie se envió). Comprobar también con `fetch` de Node que el login entrega `X-CSRF-Token`
    y `token=` en `getSetCookie()`. Eliminar el usuario y borrar la base temporal.
  - **Si la cookie no se acepta o no se envía: parar la implementación** y volver a la spec con el
    usuario, sin tocar el servidor (U7, RNF-8).
  - Hecho cuando: `e2etests/package.json` tiene las seis versiones sin `^` en `devDependencies` y
    ninguna en `dependencies`; `npm ls` no avisa; Chromium instalado; la comprobación U7 anotada en
    `validation.md` con lo observado (cookie `secure: true`, `/inicio`, agenda visible tras recargar);
    base temporal borrada; aplicación intacta.

- [x] **T2. Configuración de `e2etests/` y reglas puras.** RF-1, RF-6, RF-7, RF-9, RF-11, RF-13, RNF-2, RNF-3, RNF-6, RNF-7, RNF-10
  - `tsconfig.json`, `eslint.config.js` y los scripts de `package.json` según plan §2; entradas de
    `.gitignore` raíz (plan §2).
  - Pruebas primero (rojo) y después código (verde) de `lib/settings.ts`, `lib/preflight.ts`,
    `lib/processEnv.ts`, `lib/uniqueData.ts`, `lib/origin.ts` y `orderScenarios` (casos del plan
    §10).
  - Comprobar el riesgo R2: un `tests/` mínimo que importe `lib/origin.ts` con extensión `.ts` lo
    carga `npx playwright test --list` sin error (se borra después).
  - Hecho cuando: el rojo y el verde de `npm run test:unit` están en `validation.md`; un `test.only`
    y un `page.waitForTimeout` de prueba en `tests/` hacen fallar `npm run lint` (se retiran); un `as
    string` de prueba también; `npm run typecheck` y `npm run lint` en verde; aplicación intacta.

- [x] **T3. Lanzador del sistema bajo prueba y `playwright.config.ts`.** RF-2, RF-4, RF-5, RF-6, RF-7, RF-8, RF-10, RNF-9
  - `lib/backendEnv.ts` y `scripts/start-server.ts` (plan §4.2), y `playwright.config.ts` con
    `webServer`, proyectos, informes y `use` (plan §4.1 y §6). Comprobar el riesgo R3
    (`chromium.executablePath()`).
  - Comprobación del lanzador solo (`node scripts/start-server.ts`, sin Playwright): con MongoDB en
    marcha compila, escribe «sistema bajo prueba listo en http://127.0.0.1:3901» y
    `http://127.0.0.1:3901/` responde con la interfaz; Ctrl+C lo detiene y el puerto queda libre.
    Con `E2E_MONGODB_DBNAME=teammatchup`, con un `E2E_MONGODB_URI` remoto y con el puerto ocupado
    (otro proceso escuchando) termina con código ≠ 0 y el mensaje de la condición, **sin compilar**
    (fecha de modificación de `backend/dist/index.html` y de `backend/out/index.js` sin cambios) y
    sin mostrar la ubicación.
  - Hecho cuando: las comprobaciones anteriores anotadas en `validation.md` con su código de salida y
    su mensaje; ningún `spawn` usa `shell`; el lanzador no escribe el entorno; verde en `e2etests/`;
    aplicación intacta.

- [x] **T4. Cliente de la API, fixtures, textos y E2.** RF-9, RF-11, RF-12, RF-13, RF-15, RF-21, RF-22, U6, U8
  - `tests/api.ts` (plan §5.1), `tests/fixtures.ts` (bloqueo de orígenes y `testUser` con limpieza,
    plan §5.2 y §5.3), `tests/texts.ts` con **todos** los textos de plan §9 y su origen, `tests/ui.ts`
    (plan §8), `tests/registry.ts`, `suite.spec.ts`, `suite.reverse.spec.ts` y el escenario **E2**
    (RF-15) en `auth.scenarios.ts`.
  - Hecho cuando: `npm test` pasa con E2 y el sistema bajo prueba se detiene al terminar; prueba de
    sensibilidad de E2 (plan §10) con su rojo y su verde en `validation.md`; con la limpieza rota a
    propósito (contraseña equivocada en el login de la limpieza) el escenario falla y el informe
    muestra «Falló la limpieza, no el escenario», el correo y el usuario que quedó y el código 401
    (se deshace y se borra ese usuario con `mongosh`); verde en `e2etests/`; aplicación intacta.

- [x] **T5. E1, E3 y E4: inicio de sesión, acceso protegido, recarga y cierre de sesión.** RF-14, RF-16, RF-17, RF-21, RF-22
  - Escenarios en `auth.scenarios.ts`, paso a paso según su RF, con cada negativa después de su
    positiva (RF-22).
  - **E1 (RF-14, U13; plan §8)**: paso 1 en la dirección sin vista `/e2e-sin-vista`, con la ruta y
    el encabezado de nivel 1 «No hay nadie en esta sala» (plan §9); paso 4, tras «Atrás», la misma
    ruta y el mismo encabezado y, con ellos a la vista, sin los campos de login. Ningún escenario
    abre `/`. La ruta y el encabezado van en `tests/texts.ts` con su origen.
  - Hecho cuando: `npm test` en verde con E1, E2, E3 y E4; pruebas de sensibilidad de E1 (a)
    encabezado «No hay nadie en esta sal» → falla en el paso 1, y (b) dirección tras «Atrás» =
    `/agenda` → falla en el paso 4; de E3; y de E4 (a) y (b) (plan §10), cada una con su rojo y su
    verde en `validation.md`; verde en `e2etests/`; aplicación intacta.

- [x] **T6. C1: crear y listar.** RF-11, RF-13, RF-18, RF-21, RF-22
  - En `agenda.scenarios.ts`: cuenta R6 y sesión testigo por la API (viernes 19:00), login por el
    formulario y los seis pasos de RF-18 (las dos «Anotar sesión» distinguidas por la ventana).
  - Hecho cuando: `npm test` en verde; prueba de sensibilidad de C1 con su rojo y su verde en
    `validation.md`; verde en `e2etests/`; aplicación intacta.

- [x] **T7. C2: ver y editar, con Atrás, Adelante y recarga.** RF-11, RF-19, RF-21, RF-22
  - Sesión `original` por la API (miércoles 18:00, 4 cupos); los seis pasos de RF-19 (título nuevo
    `editado` y 5 cupos elegidos en la lista «Cupos»).
  - Hecho cuando: `npm test` en verde; prueba de sensibilidad de C2 en `validation.md`; verde en
    `e2etests/`; aplicación intacta.

- [x] **T8. C3: eliminar = cancelar.** RF-11, RF-20, RF-21, RF-22
  - Sesión `original` y testigo por la API; los ocho pasos de RF-20 («Atrás» antes de F5, U10; en el
    paso 7, testigo visible antes de comprobar la ausencia).
  - Hecho cuando: `npm test` con los siete escenarios en verde;
    pruebas de sensibilidad de C3 (a) y (b) en `validation.md`; verde en `e2etests/`; aplicación
    intacta.

- [x] **T9. Criterios de la suite completa.** RF-2 a RF-13, RF-22, RNF-3 a RNF-6, RNF-8, RNF-10
  - Uno por uno, con su resultado en `validation.md` (criterios de finalización de la spec):
    - fallos antes de compilar: Chromium sin instalar (con una caché de navegadores vacía), puerto
      ocupado por otra ejecución de la suite, nombre `teammatchup`, nombre igual al de desarrollo
      configurado (`MONGODB_DBNAME=teammatchup_e2e` en el entorno de la consola, sin editar
      `backend/.env`; y, aparte, `E2E_MONGODB_DBNAME` igual al `TEST_MONGODB_DBNAME` con otras
      mayúsculas) y
      ubicación no local: código ≠ 0, mensaje de la condición, sin escenarios y fechas de las
      construcciones sin cambios;
    - MongoDB apagado; un error de tipos que rompe `frontend/` y, aparte, `backend/` (en una copia
      de trabajo descartada con `git stash`/`git checkout`, nunca commiteado): código ≠ 0, sin
      escenarios y salida del servidor o del compilador;
    - `frontend/.env` y `frontend/.env.production.local` en modo simulado con la API en
      `http://localhost:3001/api`, y `backend/.env` en desarrollo (puerto 3001, `HOST=0.0.0.0`,
      base de desarrollo, secreto de desarrollo y claves de servicios): la suite pasa, y el número de
      documentos de cada colección de la base de desarrollo, contado con `mongosh`, no cambia (R4);
    - secreto: búsqueda del plan §7 sin coincidencias (también en el JSON);
    - bloqueo de otros orígenes (plan §10, prueba temporal que se borra) y la suite completa sin
      conexión a Internet;
    - cada escenario solo (`npm test -- --grep <código>`) y la suite con `npm run test:reverse`;
    - conteo de documentos de la base E2E antes y después de una ejecución completa, y de una con un
      escenario roto a propósito: iguales;
    - Ctrl+C a mitad: el puerto queda libre y la siguiente ejecución pasa sin borrar nada;
    - escenario roto a propósito: código ≠ 0, el informe nombra escenario y comprobación, y
      `test-results/` tiene su traza y su captura;
    - tres ejecuciones seguidas en verde sin reintentos y el tiempo de una ejecución completa
      (≤ 5 min, R5);
    - búsqueda en `e2etests/` sin localizadores por clase, CSS, XPath ni atributos de prueba, sin
      esperas fijas, `.only` ni `any`; `git status` tras una ejecución sin informes, trazas, capturas,
      construcciones ni archivos de variables; búsqueda de secretos en el repositorio.
  - Hecho cuando: todos los puntos anotados con su resultado; los archivos tocados a propósito
    (`frontend/.env*`, `backend/.env`, errores de tipos) restaurados; verde en `e2etests/`; `git diff
    frontend/ backend/` vacío.

- [ ] **T10. Documentación, otra plataforma y cierre.** RF-3, RNF-5, RNF-9 y criterios de finalización
  - `e2etests/README.md` con todo lo que pide RF-3 (condiciones previas y sus comandos, mongosh
    opcional, comandos de la suite, de un escenario, del orden inverso, de tipos y de lint; que
    cada ejecución sustituye las construcciones; aviso de Q8; base E2E, qué queda y cómo borrarla;
    variables `E2E_*` con sus valores por defecto y cómo fijarlas en bash/zsh y en PowerShell;
    puerto; solo Chromium y por qué; qué no toca; informe y trazas; tiempo medido en T9;
    plataformas). Sección «Pruebas E2E» del README raíz que enlaza a él y fila de `e2etests/` en
    «Estado del repositorio».
  - **[usuario]** la suite completa en macOS o Windows siguiendo solo el README, por un integrante
    que no la escribió; resultado en `validation.md` y en el README (RNF-9, RF-3).
  - `AGENTS.md` («Stack y estructura» y «Comandos») y `MEMORY.md` describen `e2etests/` y su
    comando; casillas de los criterios de finalización de `spec.md` marcadas con su evidencia (las
    marca el `planner`); `graphify update .` en la raíz.
  - Hecho cuando: los documentos actualizados; la ejecución en la otra plataforma anotada; verde en
    `e2etests/` por última vez; aplicación intacta.
  - Avance (2026-11-22, `implementer`): **hecho** `e2etests/README.md`, sección «Pruebas E2E» y fila del
    README raíz, `AGENTS.md`, `MEMORY.md`, errata «del servidor» del lanzador, y verde en `e2etests/`
    en Linux (`test:unit` 88/88, typecheck, lint, `npm test` y `npm run test:reverse` 7 passed);
    aplicación intacta. **Falta** la parte **[usuario]**: la ejecución en macOS o Windows y su
    anotación (`validation.md` §T10 y tabla «Plataformas» del README); y las casillas de `spec.md`
    (`planner`). `graphify update .` no se pudo ejecutar (no instalado). Por eso T10 sigue sin marcar.
