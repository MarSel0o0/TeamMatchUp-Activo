# Tareas 004 — Cuentas de juego y rango simulado
Estado: **hechas (2026-10-19); validadas por reviewer** (T1–T25; APROBADO tras 2 vueltas;
1567 tests en verde); **T26 (cambio DP6-37): hecha (2026-10-19)**.
T1–T25 aprobadas el 2026-10-19 ("apruebo todo con tus recomendaciones"). La
repetición de la suite sin conexión a Internet (T25) la hizo el usuario, que la confirmó el
2026-10-19 (1567/1567 tests, 220 suites, 0 fallos, 0 cancelados, ~100 s, con el código ya
reescrito): no queda ninguna tarea pendiente de T1–T25. Spec: `spec.md` (aprobada el
2026-10-18, sin cambios de requisitos; el cambio DP6-37 / DP-43, aprobado el 2026-10-19, solo
nombra el paso del cuerpo). Plan: `plan.md` (aprobado el 2026-10-19).
**Cambio DP6-37 (2026-10-19): T26 aprobada (2026-10-19).** Una tarea de pruebas
nueva, sin cambios de código de producción, que cierra la casilla nueva de "Criterios de
finalización" de la spec (paso del cuerpo en las tres operaciones de lectura). Es independiente
de T1–T25 (todas hechas) y de la T11 de la spec 005.
Decisiones del usuario del 2026-10-19 sobre este documento:
- **C1:** la T24 (retirar `createWithExistingUser` y `missingUserError`) quedaba **bloqueada
  hasta que la T9 de la spec 005 estuviera hecha** (Q3 resuelta); se cumplió y la T24 está
  hecha.
- **C2:** la T13 (lectura literal fija) queda aprobada; es una excepción deliberada a P-13
  (Q4 resuelta).
- **C3:** no se divide la spec pese a superar las 10 tareas (Q5 resuelta).
- **C4:** el riesgo R3 (404 si el usuario desaparece entre crear la cuenta y comprobar que
  existe) sigue vigente por la decisión del 2026-10-18.
Orden global con la spec 005 (seguido y cumplido): T9 de la 005 → T11 a T25 de esta spec
(orden de la tabla siguiente) → T10 de la 005 (después de la T11 de esta spec).

Cambio de esta revisión: la spec se reescribió el 2026-10-18 (commit `685e4af`) después de
implementar T1–T9 y reviewer emitió CAMBIOS NECESARIOS. El usuario decidió rehacer el código
para alinearlo con la spec vigente. **T1–T9 (con T3b y T8b) se conservan tal como se
cerraron, marcadas como hechas**; donde su texto contradice la spec vigente (mensajes con
mayúscula y punto, `User.accounts`, "sesión no iniciada", `createWithExistingUser`), manda la
spec y lo corrigen las tareas nuevas. **T10** (hecha) se acota a la cascada ordenada al
eliminar el usuario; su parte de cierre pasa a T25. Se añaden **T11 a T25**, cada una con
las tareas anteriores cuyo código reabre.

Historial de aprobaciones anteriores (siguen valiendo para T1–T9): 2026-10-17 ("Apruebo y
vamos con spec 005"); 2026-10-18 reaprobación ("Apruebo el plan y las tareas, sigue con T1");
T3b ("Aprobar y ajustar P-17"); T8b ("Apruebo, haz T8b").

Reglas para cada tarea: tests primero (en rojo), después el código, verificación en verde,
marcar la tarea y parar. Sin `any`, `@ts-ignore` ni `.only`. Ninguna dependencia nueva.
Verificación de todas las tareas:

```
cd backend && npm test && npm run typecheck && npm run lint
```

Reglas añadidas para T11 a T25:
- Los textos de error esperados se escriben como **literales de la spec** (plan, 7.2), nunca
  importados de `ACCOUNT_ERRORS` (plan, P-23).
- Una prueba que nace en verde (refuerzo de cobertura) no cuenta como "en rojo primero": el
  implementer la rompe a propósito (cambio temporal en el código que vigila, revertido, sin
  commit), comprueba que falla y lo anota en su reporte (plan, R9). Si una prueba de refuerzo
  revela un incumplimiento de la spec, corrige el código en la misma tarea; si el
  incumplimiento exige decidir algo, para y lo reporta.
- Las tareas que cambian aserciones de tests existentes lo hacen solo para alinearlas con la
  spec vigente (textos, 401 de usuario eliminado, `User.accounts`); no se cambia ninguna otra
  aserción.
- Pruebas HTTP: `const app = await authApp()` y `await closeTestServers()` en `after` (plan,
  11.1, P-18).

Precondición de T1: specs 001, 002 y 003 implementadas (comprobado el 2026-10-18) con los
archivos y firmas de la sección 0 del plan. Si falta algún elemento de esa lista o tiene otra
firma, parar y reportarlo.

## Orden de ejecución seguido y dependencias
Todas las tareas (T1–T25, con T3b y T8b) están hechas. T1–T9 se hicieron antes del rework;
T11 a T25 se hicieron en este orden (la tabla queda como registro):

| Orden | Tarea | Depende de | Reabre código de | Estado |
| --- | --- | --- | --- | --- |
| 1 | T11 Textos exactos | — | T3, T6, T7, T9 | hecha |
| 2 | T12 Región solo ASCII | T11 (mismo archivo) | T3 | hecha |
| 3 | T13 Lectura literal fija (aprobada, C2) | — | T2 (solo pruebas) | hecha |
| 4 | T14 Bandas cerradas y código Unicode | T13 si se hace (protege el simulador) | T1, T2, T4 | hecha |
| 5 | T15 Pruebas puras que faltan | T12, T14 | T2, T3 (solo pruebas) | hecha |
| 6 | T16 Sesión con `withUser` | T11 | T5, T6, T9 | hecha |
| 7 | T17 Ayudantes de prueba y solapamiento determinista | T16 | T8, T9 (solo pruebas) | hecha |
| 8 | T18 Vincular con compensación | T11, T16 | T5, T6 | hecha |
| 9 | T19 Desvincular y retirar `User.accounts` | T17, T18 | T5, T7 | hecha |
| 10 | T20 Listar y obtener sin cuentas sin dueño | T11 | T6 | hecha |
| 11 | T21 Pruebas HTTP de filtros, resumen y orden | T11, T12, T16, T20 | T6, T9 (solo pruebas) | hecha |
| 12 | T10 Cascada ordenada | T16, T17, T18, T19, T20 | T9 | hecha |
| 13 | T22 Concurrencia de RF-39 | T17, T19 | T8 (solo pruebas) | hecha |
| 14 | T23 Ramas de RF-47 | T10, T17, T22 | T8, T9 (solo pruebas) | hecha |
| 15 | T24 Retirar `createWithExistingUser` (esperó a la T9 de la 005, C1) | T16 y T9 de la 005 | T5, T9 | hecha |
| 16 | T25 Cierre | todas | — | hecha (suite sin red confirmada por el usuario el 2026-10-19) |

T11 a T15 son de dominio puro o de textos y podían hacerse en otro orden entre sí mientras se
respetaran las dependencias de la tabla. T24 no podía empezar hasta que la T9 de la 005
estuviera hecha (C1), y así fue; T25 no dependía de ella.

---

- [x] **T1. Escala de rango, normalización y bandas.** RF-36, DP-2, DP-26, DP-34
  - Tests primero: `backend/tests/unit/rankScale.test.ts` (tamaños 31/7/36; todos los
    valores de normalización de los criterios de la spec, incluidos tier inexistente = 0,
    división ausente = la más baja, `Master I` = 93, `Grey II` = 0, `Champion V` = 100;
    bandas y rangos de generación de la tabla del plan, sección 3, con el rango de
    generación siempre dentro de la banda).
  - Archivos: `backend/src/domain/rankScale.ts`; `backend/src/domain/games.ts` (crear sin
    `source`/`accent` o, si existe, quitarle su `normalizeRank` y re-exportar la nueva).
  - Hecho cuando: `rankScale.test.ts` en verde y typecheck en verde.

- [x] **T2. Proveedor simulado puro.** RF-34, RF-35, RF-36, RF-41, RF-42, RF-43, RNF-7
  - Tests primero: `backend/tests/unit/rankSimulator.test.ts` — determinismo (mismas
    entradas → `deepStrictEqual`); mayúsculas/espacios → misma lectura; banda y escala;
    1–8 partidas con el juego, ids distintos, una sola con `playedAt = now`, las demás
    ≥ 1 min antes; evolución ±1 sin salir de la escala para los 100 identificadores de cada
    juego y n = 0..30; `evolveStep` en el escalón más alto (+1) y más bajo (−1); principal
    de n ausente en 0..n − 1; mismo n a dos instantes → todo igual salvo fechas
    desplazadas; verificada: los 12 ejemplos de la tabla 4.4, 51/49/51 en los conjuntos de
    100, igual en n = 0..10.
  - Archivos: `backend/src/domain/rankSimulator.ts`, `backend/src/services/rankProvider.ts`.
  - Hecho cuando: `rankSimulator.test.ts` en verde, sin `Math.random`, `Date.now` ni
    `new Date()` sin argumento en `rankSimulator.ts`.

- [x] **T3. Reglas de validación y mensajes.** RF-2, RF-6, RF-7, RF-13 (formato), RF-22, RF-38, RF-40
  - Tests primero: `backend/tests/unit/accountRules.test.ts` — orden juego → identificador
    → región con los textos exactos del plan, sección 7; nulo/vacío/espacios/no texto;
    región `" las "` → `LAS`; edición: mismo identificador con otras mayúsculas o espacios
    se ignora, distinto/nulo/vacío → RF-22 antes que RF-38, cuerpo vacío o no objeto → sin
    cambios, `gameId` del cuerpo ignorado; filtros: `user` repetido, vacío o inválido →
    "id con formato inválido" (también con `game` inválido), `game` repetido/vacío/inválido
    → "Juego no válido.", `user=me` → id de sesión.
  - Archivos: `backend/src/domain/accountRules.ts`.
  - Hecho cuando: `accountRules.test.ts` en verde.

- [x] **T3b. Aislar `domain/`: identificador de usuario en `domain/userId.ts`.** RNF-7, RF-2 y RF-13 (formato, sin cambios); plan P-17 y sección 2.1 *(cambio aprobado el 2026-10-18)*
  - Tests primero: `backend/tests/unit/domainIsolation.test.ts` (plan, sección 11) — lista
    los `.ts` de `backend/src/domain/` desde `import.meta.dirname`; extrae los
    especificadores de `import`/`export … from`, `import type`, `import "…"` e
    `import("…")`; resuelve cada relativo con `node:path` y falla, nombrando archivo y
    especificador, si cae en `src/services`, `src/utils`, `src/models` o `src/controllers`.
    Además: al menos un `.ts` encontrado y el extractor detecta un import prohibido en un
    texto de muestra. Solo vigila esas cuatro carpetas; no prohíbe `express`, `mongoose` ni
    `node:*` (decisión del usuario, 2026-10-18). Debe estar en **rojo** antes del cambio (hoy `accountRules.ts` importa
    de `../utils/errors.ts` y `../services/userTarget.ts`).
  - Archivos: `backend/src/domain/userId.ts` (nuevo: `SELF_ALIAS`, `OBJECT_ID_PATTERN`,
    `INVALID_ID_MESSAGE`, tipo `UserTarget` y `resolveUserTarget`, movidos tal cual; sin
    imports fuera de `domain/`); `backend/src/services/userTarget.ts` (los reexporta salvo
    `INVALID_ID_MESSAGE`, que no se reexporta por decisión del usuario del 2026-10-18; se
    quedan `matchUserRoute`, `decodeSegment`, `UserRoute` y `USER_TARGET_MESSAGES`);
    `backend/src/utils/errors.ts` (`invalidId: INVALID_ID_MESSAGE`, mismo texto);
    `backend/src/domain/accountRules.ts` (importa solo de `./userId.ts`, `./games.ts` y
    `./rankSimulator.ts`).
  - Prohibido: modificar cualquier test existente o cambiar un import de quien use
    `services/userTarget.ts` o `utils/errors.ts`.
  - Hecho cuando: `domainIsolation.test.ts` en verde; `npm test` completo (las 952 pruebas
    previas más las nuevas), `npm run typecheck` y `npm run lint` en verde; ningún archivo de `backend/tests/`
    cambia respecto al cierre de T3 salvo el nuevo `domainIsolation.test.ts` (ojo: los tests
    de T1–T3 aún no están en git, así que `git diff` no basta; el reviewer lo comprueba).

- [x] **T4. Estado de la cuenta: historial, partidas, tasa y tendencia.** RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36
  - Tests primero: `backend/tests/unit/accountState.test.ts` — `mergeMatches` sin repetidos
    (conserva la guardada), orden por fecha y desempate `m-9-0` antes que `m-10-0`, corte
    en 20, principal conservada con más de 20 partidas de fecha igual o posterior;
    `shouldAppendSnapshot`; `applySync` sin cambio de rango no agrega fotografía y el
    último del historial coincide con el vigente salvo la fecha; `initialState` con
    número 0; `winRate` 5/8 = 63 y 0/8 = 0; `trend` con un elemento = 0;
    `recentMatches` = 8 primeras.
  - Archivos: `backend/src/domain/accountState.ts`.
  - Hecho cuando: `accountState.test.ts` en verde.

- [x] **T5. Modelo, reloj, middleware y helpers de prueba.** RF-33, RF-37, RF-44 (middleware), DP-32, DP-33
  - Tests primero: `backend/tests/unit/gameAccountModel.test.ts` — `toJSON` de un
    documento sin guardar tiene `id`, `userId`, `simulated: true`, fechas ISO y no tiene
    `_id`, `__v`, `user`, `matches` ni `readingNumber`; `division` ausente no aparece.
  - Archivos: `backend/src/models/gameAccount.ts` (plan, sección 5; `toJSON` en lista
    blanca con `toGameAccountJson`); `backend/src/models/user.ts` (`accounts` en
    `UserFields` y en el esquema, default `[]`, sin añadirlo a `toPublicUserJson`);
    `backend/src/utils/clock.ts` (plan, P-5); en `backend/src/utils/middleware.ts`, la
    opción `missingUserError` de `createWithUser` (por defecto "token inválido") y
    `createWithExistingUser` (plan, P-14); `FIXED_NOW`, `accountsInDb` y `rawAccountsInDb` en
    un bloque `// --- Spec 004 ---` de `backend/tests/controllers/helpers.ts` (no se crea
    `test_helper.ts`).
  - Hecho cuando: `gameAccountModel.test.ts` en verde y el resto de la suite (incluidas las
    pruebas de sesión de la 002 con "token inválido" y las de la 003) sigue verde.

- [x] **T6. Listar, obtener y vincular.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-29 (listar, obtener, vincular), RF-33, RF-37, RF-44, RNF-2, RNF-3
  - Tests primero: `backend/tests/controllers/accounts.test.ts` (describe "listar",
    "obtener", "vincular"), con `authApp()`, `signUp` y `withSession` (plan, sección 11) —
    401 sin sesión, sin cabecera `X-CSRF-Token` y con credencial de usuario eliminado
    (`User.deleteOne` directo → "sesión no iniciada"; `GET /api/users/me` con la misma
    credencial sigue en "token inválido"); `/api/accounts/%zz` → 401 sin sesión y 400 "id
    con formato inválido" con sesión; 201 en
    los tres juegos con valores exactos = `initialState(simulateReading(..., 0, FIXED_NOW))`
    en respuesta y en `rawAccountsInDb()`; cuenta en `User.accounts`; cuerpo con `user`,
    `currentRank`, `verified`, `readingNumber`, `simulated` ignorados; duplicado y dos
    vinculaciones simultáneas → un 201 y un 400 RF-5; mismo identificador en dos usuarios,
    otra región u otras mayúsculas → misma lectura; filtros de RF-2 (cada salto); obtener
    con id mal formado → 400, inexistente → 404; forma exacta de la cuenta y ninguna
    mención de fuentes reales.
  - Archivos: `backend/src/controllers/accounts.ts` (`createAccountsRouter({ jwtSecret,
    now })`, con `withExistingUser` y la comprobación de `decodeSegment` sin ruta antes de
    las rutas), `backend/src/services/accountWrites.ts` (`linkAccount`),
    `backend/src/app.ts` (`app.use("/api/accounts", createAccountsRouter({ jwtSecret, now }))`
    después de `/api/auth` y antes de `unknownEndpoint`), `backend/src/server.ts`
    (`GameAccount.init()` en `prepareDatabase`).
  - Hecho cuando: los tres describe en verde con `await GameAccount.init()` en `before`
    (tras `connectDatabase(testConfig().db)`) y las pruebas de `tests/server/` siguen verdes.

- [x] **T7. Editar y desvincular.** RF-7, RF-8, RF-9, RF-11, RF-22, RF-29 (editar, desvincular), RF-33, RF-38, RF-40
  - Tests primero: `accounts.test.ts` (describe "editar", "desvincular") — región válida
    con otra grafía → 200 y se guarda con la de la lista, sin cambiar rango, historial,
    partidas, número de lectura ni fecha; RF-22 y RF-38 con base sin cambios; identificador
    igual en otras mayúsculas + región nueva → 200; cuerpo vacío → 200 sin cambios; juego
    inexistente en el cuerpo ignorado; un caso por salto de RF-29 (id mal formado → 400,
    inexistente → 404, ajena → 403 incluso con región inválida, identificador distinto +
    región inválida → RF-22); desvincular → 204, cuenta borrada y fuera de
    `User.accounts`; ajena → 403.
  - Archivos: `backend/src/controllers/accounts.ts`, `backend/src/services/accountWrites.ts`
    (`updateOwnedAccount`).
  - Hecho cuando: los describe "editar" y "desvincular" en verde.

- [x] **T8. Resincronizar, concurrencia y fallo forzado.** RF-10, RF-11, RF-15, RF-28, RF-29 (resincronizar), RF-39 (cuenta), RF-42, RF-43, RF-45
  - Tests primero: `accounts.test.ts` (describe "resincronizar", "concurrencia",
    "fallo") — vincular y resincronizar dos veces una cuenta de cada juego (incluido R6)
    con instantes fijos distintos; respuesta y base iguales a aplicar `applySync` con
    n = 1 y 2; historial según DP-9; ≤ 20 partidas tras 5 resincronizaciones con la
    principal de la última presente; ajena → 403; dos sync simultáneas → número de lectura
    2 y estado igual al serial; desvincular + sync simultáneos → 204 y la cuenta no existe
    al final (sync 200 o 404); `save` forzado a fallar → 500, base idéntica y la siguiente
    sync usa el mismo número.
  - Archivos: `backend/src/controllers/accounts.ts`.
  - Hecho cuando: los tres describe en verde.

- [x] **T8b. Servidor de prueba en loopback IPv4 (fallos intermitentes de supertest).** Sin RF (infraestructura de pruebas); plan P-18, secciones 1 y 11 *(cambio aprobado el 2026-10-18: "Apruebo, haz T8b")*
  - Tests primero: `backend/tests/unit/loopbackServer.test.ts` (nombre aceptado por el
    usuario, 2026-10-18) — `await listenOnLoopback(listener)`
    devuelve un servidor cuyo `address()` tiene `address === "127.0.0.1"`,
    `family === "IPv4"` y `port !== 0`, y tras `closeTestServers()` ya no escucha. Debe
    estar en **rojo** antes del cambio (hoy `listenOnLoopback` y `closeTestServers` no
    existen). Opcional: con un bloqueador en `127.0.0.1:P`, `listen(P, "127.0.0.1")` da
    `EADDRINUSE` (documenta el riesgo; se cierra el bloqueador al terminar).
  - Archivos:
    - `backend/tests/controllers/helpers.ts`: `listenOnLoopback(listener): Promise<Server>`
      (espera al evento `listening` de `listen(0, "127.0.0.1")` y registra el servidor);
      `closeTestServers()` (`closeAllConnections()` y `close()` de los registrados);
      `authApp(...)` devuelve `Promise<Server>`; `app: Express` → `app: Server` en
      `registerUser`, `loginAs`, `signUp` y `rawCookieRequest`.
    - `backend/tests/server/helpers.ts`: `getFreePort(host: string | null = "127.0.0.1")`;
      con texto, `probe.listen(0, host, …)`; con `null`, `probe.listen(0, …)` sin host
      (`null` y no `undefined`, que activaría el valor por defecto). Decisiones del usuario:
      incluirlo y "Que reciba el host".
    - `backend/tests/server/startup.test.ts`: solo la línea 78 (prueba "RF-10: sin HOST
      escucha en todas las interfaces"): `await configWith({ host: null })` →
      `await configWith({ host: null, port: await getFreePort(null) })`. El `port` de
      `overrides` prevalece sobre el de `configWith`, así que el puerto se sondea sin host,
      como el servidor en `::`. Ninguna otra línea ni aserción cambia.
    - `backend/tests/controllers/{accounts,auth,users,userRead,userProfile,userAvailability,userDeletion}.test.ts`:
      `const app = await authApp()` y, en `after`, `await closeTestServers()` antes de
      `mongoose.disconnect()`. En `auth.test.ts`, `supertest(await authApp({...}))` en las
      líneas 119, 140, 365, 617, 624, 627 y 630; en `userDeletion.test.ts`, la línea 137 y
      el tipo de la línea 98.
    - `backend/tests/controllers/app.test.ts`: `supertest(await listenOnLoopback(createApp(testConfig())))`
      y `after(closeTestServers)`, sin `mongoose.disconnect()` porque no conecta a la base
      (aceptado por el usuario).
    - `backend/tests/unit/withUser.test.ts` (nombre actual; se llamaba
      `withExistingUser.test.ts` cuando se hizo T8b y se renombró el 2026-10-19, ver T24):
      `appWith` devuelve el servidor de `listenOnLoopback`, las llamadas usan `await` y
      `after(closeTestServers)`.
  - Excepción explícita (solo para esta tarea): T8b **sí** modifica tests existentes, pero
    únicamente en cómo se crea y se cierra el servidor (helpers, setup, teardown y tipos) y,
    en `startup.test.ts`, la preparación del puerto de la prueba "sin HOST". No se toca
    `specs/003` ("No, solo el plan 004"). Prohibido cambiar cualquier aserción, valor esperado o lógica de prueba, y tocar
    `backend/src/`. Prohibido el `--import` global que parchee `http.Server.prototype.listen`
    (alternativa descartada en P-18).
  - Hecho cuando:
    - `loopbackServer.test.ts` en verde;
    - `node --test` de `tests/controllers/accounts.test.ts` (con `NODE_ENV=test`, como
      `npm test`) 20 veces seguidas en verde;
    - `npm test` 5 veces seguidas en verde (las 1141 pruebas previas más las nuevas);
    - `npm run typecheck` y `npm run lint` en verde;
    - se anota `duration_ms` de cada ejecución; si alguna tarda mucho más que el resto (lo
      normal en `npm test` son unos 83–85 s), se reporta (posibles peticiones lentas del
      entorno: MongoDB en Docker Desktop o suspensión de la máquina);
    - el reviewer comprueba que el diff de `backend/tests/` solo toca creación, cierre y
      tipos del servidor (más la preparación del puerto en la línea 78 de `startup.test.ts`), y que `backend/src/` no cambia respecto al cierre de T8.

- [x] **T9. Resumen por juego y cascada al eliminar usuario.** RF-12, RF-13, RF-14, RF-29 (resumen), RF-37, RF-39 (usuario)
  - Tests primero: `backend/tests/controllers/gameSummary.test.ts` — resumen propio (`me`)
    y de otro usuario: cuenta con `simulated` sin `matches`, 8 primeras partidas en orden
    RF-28 con `id`, `winRate` y `trend` calculados con las funciones puras; cada salto de
    RF-13 con su texto (id mal formado, incluido `%zz`; juego inválido, incluido `%zz`;
    usuario inexistente con `nonExistingId()`; sin cuenta); 401 sin sesión y 401 "sesión no
    iniciada" con credencial de usuario eliminado; eliminar usuario (`DELETE /api/users/me`)
    borra sus cuentas; eliminación simultánea a una vinculación → 204 y vinculación 201 o
    401, y al final no queda ninguna cuenta del usuario. Montaje según T8b (plan, sección
    11 y P-18): `const app = await authApp()` y, en `after`, `await closeTestServers()`
    antes de `mongoose.disconnect()`.
  - Archivos: `backend/src/services/userTarget.ts` (`matchUserRoute` con
    `kind: "games"`); `backend/src/utils/middleware.ts` (`createUserRoutesGuard({ withUser,
    withExistingUser })`: `withExistingUser` y decodificación de los dos segmentos para
    `games`); `backend/src/controllers/users.ts` (crea `withExistingUser`, ruta
    `GET /:id/games/:gameId` con `resolveUserTarget`; en `DELETE /:id`,
    `GameAccount.deleteMany({ user: sessionUserId })` después de `User.deleteOne`).
    Pruebas unitarias de `matchUserRoute` para `games` (GET y HEAD sí; PUT, PATCH y DELETE
    no; `/` final y mayúsculas en `games`) en `backend/tests/unit/userTarget.test.ts`.
  - Hecho cuando: `gameSummary.test.ts` en verde y `users.test.ts` de la spec 003 sigue
    verde.

- [x] **T10. Cascada ordenada al eliminar el usuario y fallos forzados.** RF-14, RF-47 (vinculación simultánea), RF-44 (credencial tras el borrado), DP-42
  - Depende de: T16, T17, T18, T19 y T20 (la vinculación ya responde 404 al usuario borrado,
    la credencial de un usuario eliminado ya responde "token inválido", el listado ya oculta
    cuentas sin dueño y existen los ayudantes de prueba). Reabre T9: la cascada de
    `DELETE /:id` (hoy `User.deleteOne` y luego `GameAccount.deleteMany`, sin `finally`) y
    las dos pruebas de "eliminar usuario" de `gameSummary.test.ts`. Se acota respecto de la
    versión anterior: el cierre (`requests/accounts.rest`, verificaciones, trazabilidad y
    criterios de la spec) pasa a T25 y las ramas de RF-47 de editar, resincronizar y
    desvincular a T23.
  - Tests primero: `backend/tests/controllers/userDeletionCascade.test.ts` (nuevo; plan,
    sección 11.2):
    - usuario con cuentas en los tres juegos → `DELETE /api/users/me` 204; ni usuario ni
      cuentas suyas; las de otro usuario intactas; `Set-Cookie` de borrado de la sesión;
      `GET /api/accounts` sin filtro no muestra ninguna cuenta sin dueño;
    - orden observable C1 → C2 → C3: con `t.mock.method` sobre `GameAccount.deleteMany` y
      `User.deleteOne` (que delegan en la real) se registra el orden de las llamadas:
      `deleteMany`, `deleteOne`, `deleteMany`;
    - los cinco puntos de fallo, uno por `test`, con tres cuentas (una por juego): (1)
      `GameAccount.deleteMany` (1.ª llamada) lanza sin borrar → 500, estado (1) con las
      tres; (2) la 1.ª `deleteMany` borra una cuenta con el driver y lanza → 500, estado (1)
      con dos completas, y volver a vincular ese juego → 201; (3) `User.deleteOne` lanza sin
      borrar → 500, el barrido corre, estado (1) sin cuentas; (4) `User.deleteOne` borra el
      usuario con el driver y lanza → 500, estado (2), y la credencial → 401 "token
      inválido"; (5) la 2.ª `deleteMany` (barrido) lanza tras borrar el usuario → 500,
      estado (2). En cada 500, la respuesta no trae `Set-Cookie` de borrado;
    - estado (1) operable: la sesión sigue valiendo, las cuentas que quedan se obtienen,
      editan, resincronizan y desvinculan, y repetir `DELETE /api/users/me` → 204 sin
      cuentas suyas ni usuario; ningún estado distinto de (1) o (2) en ningún caso;
    - vinculación simultánea: `User.deleteOne` ejecuta primero una vinculación completa
      (201, cuenta creada después de la 1.ª `deleteMany`) y luego delega; (a) eliminación
      en 204 y (b) la sustitución lanza tras delegar → 500; en ambos, ni usuario ni cuenta;
    - en `gameSummary.test.ts`, las dos pruebas de "eliminar usuario" que dependen del orden
      antiguo (la de la vinculación simultánea que acepta "201 o 401" y la de "justo antes
      del borrado de cuentas") se **mueven** al archivo nuevo en su versión determinista;
      queda la de "borra todas sus cuentas y no las de otros".
  - Archivos: `backend/src/controllers/users.ts` (`DELETE /:id`: C1 → C2 en `try` → C3 en
    `finally`, cookie solo si terminan los tres; comentarios de cabecera; plan, 6.8).
  - Hecho cuando: `userDeletionCascade.test.ts` en verde, `userDeletion.test.ts` de la 003
    sigue verde, y la verificación completa en verde.

- [x] **T11. Textos exactos de error.** RF-2, RF-3, RF-5, RF-6, RF-11, RF-13, RF-22, RF-29, RF-38, DP-6
  - Reabre: T3 (`domain/accountRules.ts`), T6, T7 y T9 (aserciones de controladores y uso de
    `ACCOUNT_ERRORS.forbidden` y `ACCOUNT_ERRORS.userNotFound`). Depende de: —.
  - Tests primero (literales de la spec; plan, 7.2 y P-23): en
    `backend/tests/unit/accountRules.test.ts`, `deepStrictEqual` de `ACCOUNT_ERRORS` contra
    los textos `juego no válido`; `Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16
    caracteres antes de # y 2 a 5 letras o dígitos después`; `Ubisoft ID no válido: usa de 3
    a 20 letras, dígitos, punto, guion o guion bajo`; `SteamID64 no válido: son 17 dígitos
    que empiezan por 7656119`; `región no válida para League of Legends` / `Rainbow Six
    Siege` / `Counter-Strike 2`; `ya tienes una cuenta vinculada en este juego`; `el
    identificador del juego no se puede editar: desvincula la cuenta y vuelve a vincularla`;
    `cuenta no encontrada`; `el jugador no tiene una cuenta vinculada en este juego`; y las
    claves de `ACCOUNT_ERRORS` son exactamente las propias (sin `forbidden` ni
    `userNotFound`). En `accounts.test.ts` y `gameSummary.test.ts`, cambiar las aserciones que
    importan `ACCOUNT_ERRORS.*` o escriben el texto antiguo (`Juego no válido.`, `Cuenta no
    encontrada.`, etc.) por los literales, y comprobar por HTTP al menos un caso de cada
    texto: juego (cuerpo, filtro y resumen), los tres identificadores, región (vincular y
    editar), duplicado, RF-22, 403 al editar, desvincular y resincronizar una cuenta ajena
    (`no tienes permiso para esta operación`), cuenta no encontrada (obtener, editar,
    desvincular y resincronizar), `usuario no encontrado` y jugador sin cuenta (resumen).
    En rojo: todas fallan con los textos antiguos.
  - Archivos: `backend/src/domain/accountRules.ts` (`ACCOUNT_ERRORS` ~l.11-32: textos nuevos,
    quitar `forbidden` y `userNotFound`); `backend/src/controllers/accounts.ts` y
    `backend/src/services/accountWrites.ts` (403 con `MESSAGES.forbidden`);
    `backend/src/controllers/users.ts` (404 de usuario con `USER_TARGET_MESSAGES.userNotFound`);
    `backend/src/utils/middleware.ts` sigue importando `ACCOUNT_ERRORS` (aceptado).
  - Hecho cuando: las pruebas anteriores en verde y ningún texto antiguo (p. ej. `Juego no
    válido.`, `Cuenta no encontrada.`) queda en los archivos de la spec 004: en `src/`,
    `backend/src/domain/accountRules.ts`, `backend/src/controllers/accounts.ts`,
    `backend/src/controllers/users.ts`, `backend/src/services/accountWrites.ts` y
    `backend/src/utils/middleware.ts`; en `tests/`, `backend/tests/unit/accountRules.test.ts`,
    `backend/tests/controllers/accounts.test.ts` y `backend/tests/controllers/gameSummary.test.ts`
    (cualquier `grep` de textos antiguos se limita a esos archivos). **Exceptuados** (spec 005,
    no se tocan en esta tarea): `backend/src/domain/matchQuery.ts` (`MATCH_ERRORS.game =
    'Juego no válido.'`), `backend/src/controllers/matches.ts`,
    `backend/src/services/matchInputs.ts`, `backend/tests/unit/matchQuery.test.ts`,
    `backend/tests/controllers/matches.test.ts`, `backend/tests/controllers/matchInputs.test.ts`
    y `backend/requests/matches.rest`. Nota: los textos de la 005 se alinean en su T10 (después
    de esta T11). Los 401 siguen siendo los de la 002 (esta tarea no los toca).

- [x] **T12. Región: plegado de mayúsculas solo ASCII.** RF-6, RF-8, RF-38, DP-35
  - Reabre: T3 (`normalizeRegion` en `domain/accountRules.ts`). Depende de: T11 (mismo archivo).
  - Tests primero: `backend/tests/unit/accountRules.test.ts` — `normalizeRegion("lol",
    "KR")` (signo de kelvin en lugar de `K`) → `null` (hoy devuelve `KR`);
    `validateLinkPayload` y `validateAccountEdit` con esa región → error `región no válida
    para League of Legends`; `"South  America"` (dos espacios) → `null`; `"south america"` →
    `South America`; `" las "`, `"Las"`, `"lAs"` → `LAS`; región rodeada de tabulador o NBSP
    se recorta; `"ＬＡＳ"` (anchura completa) → `null`. En `accounts.test.ts`: `POST` y `PUT`
    con `"KR"` → 400 `región no válida para League of Legends` y la base sin cambios.
  - Archivos: `backend/src/domain/accountRules.ts` (`normalizeRegion` ~l.48-53: función
    `asciiLower` que solo pliega `A`-`Z`; no `toLowerCase`).
  - Hecho cuando: las pruebas anteriores en verde y `normalizeRegion` no usa `toLowerCase`.

- [x] **T13. Lectura literal fija del simulador.** RF-35, RF-43; plan R4 y P-13
  - Aprobada (2026-10-19, C2; antes opcional, Q4). Reabre: T2 (solo pruebas; excepción
    deliberada a P-13, que descartó valores literales el 2026-10-17).
    Depende de: —. Se hace antes de T14 para proteger el simulador.
  - Tests primero: `backend/tests/unit/rankSimulator.test.ts` — para `simulateReading` con
    `now` fijo literal, `jugador1#las` (LoL), `readingNumber` 0, el `deepStrictEqual` contra
    un valor literal completo (tier, división, puntos, normalizado, `recordedAt`, número de
    partidas y, por partida, identificador, fecha, resultado, resumen, duración y variación;
    `mainMatchId`; `verified: true`, según la tabla 4.4 del plan). Opcional: una lectura
    literal por cada uno de los otros dos juegos (`jugador2` en R6 y `76561190000000001` en
    CS2, n = 0). Los valores se toman **una sola vez** de la salida del código actual, tras
    comprobar a mano que cumplen las reglas (banda, 1–8 partidas, principal con `playedAt =
    now`, `verified`); es una prueba de regresión del orden de consumo del generador, no de
    diseño. Comentario en la prueba: "no cambiar sin pasar por el plan (R4)".
  - Archivos: solo `backend/tests/unit/rankSimulator.test.ts`.
  - Hecho cuando: la prueba en verde y demostrado que falla si se intercambian dos llamadas
    al generador en `simulateReading` (cambio temporal, revertido); anotado en el reporte.

- [x] **T14. Bandas cerradas de puntos y orden de partidas por código Unicode.** RF-28, RF-36, RF-48, DP-34
  - Reabre: T1 (`pointsBand` devuelve `max: null` y existe un `generationRange` aparte), T2
    (el simulador usa `generationRange`) y T4 (`compareMatches` compara con `<` por unidades
    UTF-16). Depende de: T13 si se hace.
  - Tests primero: `backend/tests/unit/rankScale.test.ts` — `pointsBand` devuelve `max`
    numérico en todos los escalones; LoL escalones 0 a 27 → `{0, 99}`; Master, Grandmaster y
    Challenger (28, 29, 30) → `{0, 999}`; CS2 escalón `i` → `{5000·i, 5000·i + 4999}` y Gold
    (6) → `{30000, 34999}`; R6 escalón `i` (0 a 34) → `{1000 + 100·i, 1000 + 100·i + 99}`,
    Diamond I (34) → `{4400, 4499}` y Champion (35) → `{4500, 4999}`. Se eliminan las
    aserciones de `generationRange`. `backend/tests/unit/accountState.test.ts` —
    `compareCodePoints("m-\u{1F600}", "m-￿")` es positivo (por código Unicode U+1F600 >
    U+FFFF; con `<` sobre unidades UTF-16 salía al revés); prefijo más corto va antes; iguales
    → 0; `compareMatches` con la misma fecha e identificadores astral y U+FFFF pone primero el
    astral; el desempate `m-9-0` antes que `m-10-0` sigue valiendo. En rojo hoy: los topes y
    el astral.
  - Archivos: `backend/src/domain/rankScale.ts` (`pointsBand` cerrada; quitar
    `generationRange`), `backend/src/domain/rankSimulator.ts` (usa `pointsBand`),
    `backend/src/domain/accountState.ts` (`compareCodePoints` y `compareMatches`).
  - Hecho cuando: pruebas en verde; ninguna lectura cambia (`rankSimulator.test.ts`, incluida
    T13 si existe, sigue en verde sin modificar); el typecheck confirma que nada más usaba
    `generationRange` ni `max: null`.

- [x] **T15. Pruebas puras que faltan: patrones, recorte, forma canónica y medidas de RF-42.** RF-6, RF-42, DP-19, DP-40
  - Reabre: T2 y T3 (solo pruebas; si una revela un incumplimiento, se corrige el código en
    esta tarea). Depende de: T12 y T14 (mismos archivos de prueba).
  - Tests primero:
    - `backend/tests/unit/accountRules.test.ts`: nombre de LoL con un emoji de 2 unidades
      UTF-16 (un nombre de 16 unidades con emoji → válido; de 17 → `Riot ID no válido…`);
      `"\tJugador1#LAS\t"` y `" Jugador1#LAS "` se guardan como `Jugador1#LAS`; NBSP
      (` `) y BOM (`﻿`) en los extremos se recortan; U+0085 en un extremo **no**
      se recorta: al inicio cuenta dentro del nombre (válido si el nombre sigue entre 3 y 16
      unidades) y al final rompe la etiqueta (inválido); si ya existen casos de los límites
      3/16 y 2/5, no se duplican.
    - `backend/tests/unit/rankSimulator.test.ts`: `canonicalHandle("Ñandú#LAS") ===
      canonicalHandle("ñandú#LAS")`; `canonicalHandle("ß") !== canonicalHandle("ss")`; las
      **dos medidas de RF-42** sobre los conjuntos de RF-41 de cada juego (LoL
      `jugador<i>#las`, R6 `jugador<i>`, CS2 `7656119` + `i` con ceros a la izquierda hasta
      10 dígitos, i = 1 a 100): (a) para cada identificador, en al menos 5 de las lecturas 1
      a 10 la fotografía difiere de la anterior en tier, división o puntos; (b) al menos 50
      de los 100 identificadores cambian de escalón al menos una vez entre las lecturas 0
      y 10.
  - Archivos: normalmente ninguno de `src/`. Si la medida (a) o (b) fallara, el implementer
    para y se vuelve al plan (la regla es contrato, RF-41; plan, 4.2).
  - Hecho cuando: pruebas en verde y demostrado, rompiendo temporalmente el código vigilado
    (por ejemplo, fijar el escalón de la lectura n al de la n − 1, o quitar el `trim`), que
    cada grupo falla; anotado en el reporte.

- [x] **T16. Sesión de las rutas de la 004 con `withUser` ("token inválido").** RF-1, RF-13, RF-29, RF-44, DP-37
  - Reabre: T5 (`missingUserError` y `createWithExistingUser` en `utils/middleware.ts`), T6
    (`controllers/accounts.ts`) y T9 (guardia y `controllers/users.ts`). Depende de: T11.
  - Tests primero: `accounts.test.ts` — con la credencial de un usuario eliminado
    (`User.deleteOne` directo en la base), las seis operaciones de `/api/accounts` (listar,
    obtener, vincular, editar, desvincular, resincronizar) responden 401 `token inválido` y
    la base no cambia; la regresión `GET /api/users/me` con esa misma credencial sigue
    respondiendo `token inválido`. `gameSummary.test.ts` — el resumen de `me` y de otro
    usuario con esa credencial → 401 `token inválido`. Los pasos 1 a 4 no cambian (sin
    cookie `sesión no iniciada`, sin comprobante `token inválido`, expirada `sesión
    expirada`). En rojo: hoy responden `sesión no iniciada`.
  - Archivos: `backend/src/controllers/accounts.ts` (`router.use(createWithUser(...))`);
    `backend/src/controllers/users.ts` (deja de crear `withExistingUser`);
    `backend/src/utils/middleware.ts` (`createUserRoutesGuard({ withUser })`: la ruta `games`
    usa `withUser` y conserva la decodificación de los dos segmentos en el orden de RF-13).
    **No** se retiran `createWithExistingUser` ni `missingUserError` (los usa
    `controllers/matches.ts` de la 005 y `withUser.test.ts`, entonces llamado
    `withExistingUser.test.ts`; ver T24 y Q3), y no se toca la 005.
  - Hecho cuando: pruebas en verde, el resto de la suite (002, 003, 005) en verde sin
    modificarla, y el resumen con id inválido y juego sin decodificar sigue respondiendo
    primero `id con formato inválido`.

- [x] **T17. Ayudantes de prueba de cuentas y solapamiento determinista.** RF-39 (infraestructura), RF-47 (infraestructura)
  - Reabre: T8 (la prueba "desvincular y resincronizar a la vez" de `accounts.test.ts`, ~l.1206,
    que acepta dos resultados) y T9 (importar ayudantes). Depende de: T16.
  - Tests primero: crear `backend/tests/controllers/accountConcurrency.test.ts` con dos
    pruebas deterministas que reemplazan a la de ~l.1206 de `accounts.test.ts` (que se
    elimina de ahí): (i) la resincronización se detiene tras leer la cuenta, la desvinculación
    se completa (204) y la resincronización continúa → 404 `cuenta no encontrada`; (ii) la
    desvinculación se detiene tras leer, la resincronización se completa (200) y la
    desvinculación continúa → 204; en ambas, la cuenta no existe al final. El resultado
    único de cada una prueba que el solapamiento ocurrió.
  - Archivos: `backend/tests/controllers/helpers.ts`, bloque `// --- Spec 004 ---`: `link`,
    `linkOk`, `sync`, `unlink`, `edit` y `deleteMe` (hoy locales de `accounts.test.ts` y
    `gameSummary.test.ts`; se **mueven** y los dos archivos los importan, sin cambiar ninguna
    aserción) y `overlapFirstFindById(t, first, second)`: sustituye `GameAccount.findById`
    para que la primera llamada, después de leer la cuenta, espere a que `second()` termine;
    las demás llamadas (de `second` y reintentos) pasan directo; devuelve las dos respuestas.
    Excepción explícita, solo para esta tarea y como la de T8b: cambia tests existentes
    únicamente para mover ayudantes y quitar la prueba reemplazada.
  - Hecho cuando: `accountConcurrency.test.ts` en verde, `node --test
    tests/controllers/accounts.test.ts tests/controllers/accountConcurrency.test.ts` (con
    `NODE_ENV=test`) 10 veces seguidas en verde, y ninguna prueba del repositorio acepta ya
    "200 o 404" para este caso.

- [x] **T18. Vincular con compensación y sin lista de cuentas en el usuario.** RF-4, RF-5, RF-29, RF-33 (retirado), RF-46, RF-47 (vincular)
  - Reabre: T5/T6 (`linkAccount` en `services/accountWrites.ts`, que hace `$addToSet` y
    responde 401). Depende de: T11 y T16.
  - Tests primero: en `accounts.test.ts` (describe "vincular" y "fallo"; plan, 6.4):
    1. los datos del usuario (`User.findById(...).lean()`) quedan exactamente iguales antes y
       después de vincular en los tres juegos, y vincular no llama a `User.updateOne` (mock
       con `callCount` 0); se eliminan las aserciones de T6 que comprobaban la cuenta en
       `User.accounts` tras vincular;
    2. RF-46: `User.exists` sustituido para lanzar en su 2.ª llamada (la 1.ª es la de
       `withUser`) → 500 `error interno del servidor`, ninguna cuenta en la base, y la
       siguiente vinculación del mismo juego → 201; se comprueba el `callCount` para evitar
       falsos verdes (R6);
    3. RF-46: `GameAccount.create` lanza → 500, ninguna cuenta, y la siguiente vinculación
       → 201;
    4. RF-47: `GameAccount.create` sustituido para borrar antes al usuario con el driver
       (`User.collection.deleteOne`) y luego delegar → 404 `usuario no encontrado`, ninguna
       cuenta en la base. En rojo hoy: responde 401 `sesión no iniciada`;
    5. dos vinculaciones simultáneas del mismo juego → un 201 y un 400 `ya tienes una cuenta
       vinculada en este juego` (se conserva).
  - Archivos: `backend/src/services/accountWrites.ts` (`linkAccount`: crear, comprobar con
    `User.exists`, compensar con `deleteOne` y relanzar; devuelve 404 con
    `USER_TARGET_MESSAGES.userNotFound`; `WriteResult` sin 401; sin `User.updateOne`);
    `backend/src/controllers/accounts.ts` solo si cambia la forma del resultado. **No** se
    quita todavía el campo `User.accounts` del esquema (lo hace T19).
  - Hecho cuando: pruebas en verde y `accountWrites.ts` ya no importa `SESSION_MESSAGES` ni
    llama a `User.updateOne`.

- [x] **T19. Desvincular con un solo borrado y retirar `User.accounts`.** RF-9, RF-11, RF-29, RF-33 (retirado), RF-39 (dos desvinculaciones), RF-46
  - Reabre: T5 (campo `accounts` de `models/user.ts`) y T7 (desvincular con `$pull` y sin
    comprobar `deletedCount`). Depende de: T17 (solapamiento) y T18.
  - Tests primero:
    1. `accounts.test.ts`: `GameAccount.deleteOne` lanza → 500, la cuenta sigue completa
       (`rawAccountsInDb()` igual) y los datos del usuario no cambian; la siguiente
       desvinculación → 204;
    2. `accountConcurrency.test.ts`: dos desvinculaciones con `overlapFirstFindById`: la
       detenida lee, la otra se completa (204), la detenida continúa → 404 `cuenta no
       encontrada` (exactamente un 204); hoy responde 204 las dos;
    3. desvincular no llama a `User.updateOne`; los datos del usuario (`lean()`) son iguales
       antes y después de editar, resincronizar y desvincular;
    4. modelo: `User.schema.path("accounts")` es `undefined` y el documento crudo de un
       usuario recién registrado no tiene la clave `accounts`;
    5. se eliminan `accountIdsOf` y toda aserción sobre `User.accounts` de `accounts.test.ts`
       y `gameSummary.test.ts`.
  - Archivos: `backend/src/controllers/accounts.ts` (`DELETE`: `findById` → 404, dueño →
    403, `GameAccount.deleteOne({ _id, user })`, `deletedCount` 0 → 404 `cuenta no
    encontrada`; sin `$pull`; quitar el import de `User` si queda sin uso);
    `backend/src/models/user.ts` (quitar `accounts` de `UserFields`, del esquema y del
    comentario de cabecera).
  - Hecho cuando: pruebas en verde, las suites de las specs 001 a 003 y 005 siguen en verde
    sin modificarlas y el typecheck confirma que nada usa `User.accounts`.

- [x] **T20. Listar y obtener no muestran cuentas sin dueño.** RF-2, RF-3, RF-14, RNF-3
  - Reabre: T6 (`GET /` y `GET /:id` de `controllers/accounts.ts`). Depende de: T11.
  - Tests primero: `accounts.test.ts` — se crea una cuenta y se borra su usuario con el
    driver (`User.collection.deleteOne`), dejando una cuenta sin dueño: `GET /api/accounts`
    sin filtro, con `game` y con `user=<id borrado>` (→ `[]`) no la incluyen y las demás
    siguen saliendo por identificador ascendente; `GET /api/accounts/<id>` → 404 `cuenta no
    encontrada`; dos listados seguidos devuelven el mismo orden, igual al orden ascendente de
    los identificadores en minúsculas. En rojo: hoy se muestran.
  - Archivos: `backend/src/services/accountReads.ts` (nuevo: `withExistingOwners(cuentas)`,
    una sola consulta `User.find({ _id: { $in } }, { _id: 1 })`, y `ownerExists(cuenta)`);
    `backend/src/controllers/accounts.ts` (los usa en `GET /` y `GET /:id`).
  - Hecho cuando: pruebas en verde y el listado conserva el orden `_id` ascendente.

- [x] **T21. Pruebas HTTP de filtros, resumen y orden de revisión.** RF-1, RF-2, RF-13, RF-29
  - Reabre: T6 y T9 (solo pruebas; si una revela un incumplimiento, se corrige el código en
    esta tarea). Depende de: T11, T12, T16 y T20.
  - Tests primero:
    - `accounts.test.ts`, listar: `user=Me`, `user=ME`, `user=%20me` → 400 `id con formato
      inválido`; `user=m%65` → 200 con las cuentas del usuario de la sesión; `user=%zz` → 400
      id; `user=` y `user=<id>&user=<id>` → 400 id; `game=LOL`, `game=%20lol`, `game=` y
      `game=lol&game=cs2` → 400 `juego no válido`; `user=abc&game=xyz` → solo el error de
      `user`; `page=2`, `User=abc` y `user[]=abc` se ignoran (200, lista completa).
    - `gameSummary.test.ts`: `/api/users/Me/games/lol`, `/ME/`, `/%20me/` → 400 id; `m%65` →
      200 como `me`; juego `LOL` y `%20lol` → 400 juego; `Me` + juego `%zz` → 400 id; `%zz` en
      el usuario → 400 id.
    - Orden "cuerpo antes que sesión" en `/api/accounts` (POST, PUT, DELETE y sync), con y sin
      sesión: cuerpo `{"a":` → 400 `JSON mal formado`; cuerpo de más de 102 400 bytes → 413
      `cuerpo demasiado grande`; codificación no soportada (técnica de `app.test.ts`) → 415
      `codificación no soportada`; cuerpo JSON `"x"`, `5`, `true` o `null` → 400 `JSON mal
      formado` (también en DELETE y sync, que no leen el cuerpo). Sin sesión y con cuerpo
      válido → 401.
  - Archivos: normalmente ninguno de `src/`.
  - Hecho cuando: pruebas en verde y, para cada grupo, demostrado que falla si se rompe a
    propósito la regla que vigila (plan, R9); anotado en el reporte.

- [x] **T22. Concurrencia de RF-39 con solapamiento determinista.** RF-39 (edición con resincronización, dos ediciones, desvinculación con edición o resincronización), DP-29, DP-41
  - Reabre: T8 (solo pruebas; si una revela un incumplimiento de `updateOwnedAccount`, se
    corrige en esta tarea). Depende de: T17 y T19.
  - Tests primero: `accountConcurrency.test.ts`, cada caso con `overlapFirstFindById`, en las
    dos direcciones y comprobando las dos respuestas y el estado final de la base contra la
    aplicación en serie (valores calculados con las funciones puras y `FIXED_NOW`):
    1. edición + resincronización (detenida la edición y detenida la resincronización): las
       dos 200, estado final con la región de la edición y la lectura de la resincronización,
       cada respuesta con la cuenta tal como quedó tras aplicarse ella;
    2. dos ediciones con regiones distintas: las dos 200; la región final es la de la que se
       aplicó en último lugar; cada respuesta con la suya;
    3. desvinculación + edición y desvinculación + resincronización, con la desvinculación en
       medio (la otra → 404 `cuenta no encontrada`) y con la desvinculación detenida (la otra
       → 200 y la desvinculación → 204); la cuenta ni su historial ni sus partidas existen al
       final;
    4. las dos resincronizaciones (ya en `accounts.test.ts`) y las dos desvinculaciones (T19)
       no se repiten.
  - Archivos: normalmente solo `backend/tests/controllers/accountConcurrency.test.ts`.
  - Hecho cuando: pruebas en verde, `node --test` del archivo 10 veces seguidas en verde y
    cada caso demostrado frágil (por ejemplo, quitando el reintento de `updateOwnedAccount`
    fallan los casos 1 y 2); anotado en el reporte.

- [x] **T23. Ramas de RF-47: operación en curso al eliminar el usuario.** RF-47 (editar, resincronizar y desvincular), RF-14, RF-44
  - Reabre: T8 y T9 (solo pruebas). Depende de: T10, T17 y T22.
  - Tests primero: `accountConcurrency.test.ts` — `overlapFirstFindById` con
    `DELETE /api/users/me` como segunda operación (cascada real de T10): (a) editar,
    (b) resincronizar y (c) desvincular una cuenta propia detenidas tras leer; el borrado del
    usuario se completa (204); la operación continúa → 404 `cuenta no encontrada`, nunca 500;
    al final no queda el usuario ni ninguna cuenta suya; la credencial responde 401 `token
    inválido`. Casos "se aplicó antes": editar (200), resincronizar (200) y desvincular (204)
    completas y luego `DELETE /api/users/me` → 204 y ninguna cuenta.
  - Archivos: normalmente solo `backend/tests/controllers/accountConcurrency.test.ts`.
  - Hecho cuando: pruebas en verde y demostrado, quitando temporalmente la comprobación de
    `deletedCount` de desvincular o el reintento de `updateOwnedAccount`, que fallan las
    ramas correspondientes; anotado en el reporte.

- [x] **T24. (Esperó a que la T9 de la spec 005 estuviera hecha; C1) Retirar `createWithExistingUser` y `missingUserError`.** RF-44, DP-37
  - Reabre: T5 (`utils/middleware.ts`) y T9. Depende de: T16 y de la **T9 de la spec 005**
    (`controllers/matches.ts` y sus pruebas usan `createWithUser` y "token inválido"; la spec,
    el plan y las tareas de la 005 ya están aprobados desde el 2026-10-19). Antes de empezar,
    el implementer comprueba que `matches.ts` ya no importa `createWithExistingUser`; si lo
    importa, la tarea no empieza.
  - Tests primero: `backend/tests/unit/withUser.test.ts` (llamado `withExistingUser.test.ts`
    hasta el cierre de la 004; ver "Archivos") se reduce a las pruebas de `createWithUser`
    con "token inválido" por defecto (se eliminan las de `missingUserError` y
    `createWithExistingUser`); el resto de la suite, incluida la 005, en verde.
  - Archivos: `backend/src/utils/middleware.ts` (quitar `createWithExistingUser` y la opción
    `missingUserError`); `backend/tests/unit/withUser.test.ts` (antes
    `withExistingUser.test.ts`; renombrado el 2026-10-19, al cierre, con permiso expreso del
    usuario; la tarea lo dejaba como opcional).
  - Hecho cuando: ningún archivo de `src/` ni de `tests/` menciona `createWithExistingUser` ni
    `missingUserError`, y la verificación completa en verde.

- [x] **T25. Cierre de la spec 004.** RF-34, RF-37, RF-41, RF-45, RNF-1, RNF-2, RNF-3, RNF-7, RNF-8, RNF-9
  - Depende de: T10 a T23 (y T24 si se hizo). Reabre: —.
  - Nota de cierre (2026-10-19): la repetición de la suite sin conexión a Internet la hizo el
    usuario, no el implementer (que solo pudo comprobar la parte estática: ninguna llamada de
    red en `src/`). El usuario confirmó el 2026-10-19 que ejecutó `npm test` sin conexión con
    el código ya reescrito (T10–T25) y pasaron 1567/1567 tests (220 suites, 0 fallos, 0
    cancelados, ~100 s). Con eso se marcó la casilla correspondiente de "Criterios de
    finalización" de la spec (RNF-1, RNF-9); todas las casillas de esa sección están marcadas.
  - Tests primero: no aplica (verificación); las pruebas que falten para que cada fila de la
    trazabilidad (plan, 12) tenga una prueba en verde se escriben antes de cerrar.
  - Archivos: `backend/requests/accounts.rest` (revisar: login → vincular → resincronizar →
    resumen → editar con `PUT` → desvincular, y eliminar el usuario; sin textos antiguos).
  - Hecho cuando: la verificación completa en verde; las comprobaciones de plan 11.3 sin
    resultados (sin `.only`, `any`, `@ts-ignore`, `Math.random`, `Date.now`, `new Date()` sin
    argumentos, `process.env`, `fetch` ni `node:http` en `src/domain/`; `package.json` y
    `.env.example` sin dependencias ni variables nuevas); el usuario repite la suite completa
    sin conexión a Internet; cada fila de la trazabilidad (plan, 12) tiene su prueba en
    verde; y todas las casillas de "Criterios de finalización" de la spec se pueden marcar.

- [x] **T26. Pruebas del paso del cuerpo en las operaciones de lectura.** RF-29 (paso del cuerpo), RF-1, RF-2, RF-3, RF-12, RF-44, DP-43 *(cambio DP6-37; aprobado, 2026-10-19)*
  - Reabre: T21 (solo pruebas; el bloque «cuerpo antes que sesión (RF-29)» de
    `accounts.test.ts` cubre hoy POST, PUT, DELETE y sync). Depende de: — (T16 y T21 hechas).
    **Sin cambios de código de producción.** Excepción a la regla de T11 a T25: si una prueba
    nueva falla, se reporta como bug (caso, operación y respuesta obtenida) y **no se corrige
    en esta tarea**.
  - Leer: `spec.md` (RF-1, RF-29 primer punto, RF-44, DP-43, casos límite de "Identificadores,
    filtros y orden de revisión", casilla nueva de "Criterios de finalización");
    `plan.md` 6.1 (nota DP-43) y 11.1; `backend/src/app.ts` (parser global, línea ~40);
    `backend/tests/controllers/accounts.test.ts`, bloque «cuerpo antes que sesión (RF-29)»
    (~l.547-650); `backend/tests/controllers/helpers.ts`.
  - Antes de empezar (supuestos reales, comprobados el 2026-10-19; si alguno no se cumple,
    parar y reportar):
    - `app.ts` monta `express.json({ limit: 102_400, strict: true })` antes de los routers, así
      que `/api/accounts` y `/api/users` quedan detrás del paso del cuerpo. (`/api/sessions`
      tiene otro parser no estricto: no se toca ni se prueba aquí.)
    - Rutas de lectura: `GET /api/accounts`, `GET /api/accounts/:id` y
      `GET /api/users/:id/games/:gameId` (se usa `/api/users/me/games/lol`: con el paso del
      cuerpo roto el segmento no se llega a evaluar).
    - En el bloque existente son locales o ya importados: `BODY_LIMIT`, `jsonBodyOfBytes`,
      `type Method = "post" | "put" | "delete"`, `operations` (con `name`, `method` y
      `path(accountId)`), `bodyCases` (ocho casos: `{"a":` → 400; 102 401 bytes → 413;
      `Content-Encoding: desconocida` → 415; `"x"`, `5`, `true`, `false` y `null` → 400
      "JSON mal formado"), `raw(request, body, encoding)`; además `fixClock`, `ANA`, `BETO`,
      `LINKS`, `signUp`, `linkOk`, `withSession`, `assertStatusError`, `rawAccountsInDb` y
      `User` (la credencial de un usuario eliminado se obtiene con un segundo `signUp(app,
      BETO)` y `User.deleteOne({ _id: other.id })`, como hoy). No se añade ningún ayudante a
      `helpers.ts`.
    - `supertest` envía el cuerpo en un GET con `.send(texto)` (pone `Content-Length`). Si no
      lo envía (se vería un 200 o un 401 en lugar del error del cuerpo en todos los casos),
      parar y reportar.
    - Para estos GET, `bodyCases` y la prueba de "cuerpo válido sin sesión → 401" valen tal
      cual (el cuerpo `LINKS.lol` se ignora en un GET).
  - Tests primero (nacen en verde: regresión de lo que ya hace el servidor; ver "Hecho
    cuando" para demostrar que vigilan algo):
    1. Ampliar `Method` con `"get"` y añadir a `operations` las tres lecturas
       (`GET /api/accounts` con `path: () => "/api/accounts"`; `GET /api/accounts/:id` con
       ``path: (id) => `/api/accounts/${id}` ``; `GET /api/users/:id/games/:gameId` con
       `path: () => "/api/users/me/games/lol"`). Los bucles existentes generan para cada una:
       los 8 casos de `bodyCases` (cada uno sin sesión, con sesión y con la credencial de un
       usuario eliminado, con el error del cuerpo y nunca el 401, y con `rawAccountsInDb()`
       igual antes y después) y "sin sesión y con cuerpo válido → 401 «sesión no iniciada»":
       27 pruebas nuevas (3 operaciones × 9). No se duplica código del bloque.
    2. **Opcional** (solo si el archivo no tiene ya una prueba equivalente de RF-6 y RF-40; si
       la tiene, no se duplica y se anota en el reporte): fijar `[]` según P2, con
       `link(ana, [])` y `edit(ana, id, [])`: vincular con `[]` y sesión → 400 `juego no
       válido`, sin cuenta creada (`rawAccountsInDb()` vacío); vincular con `[]` sin sesión
       (`raw(supertest(app).post("/api/accounts"), "[]", undefined)`) → 401 `sesión no
       iniciada`; editar con `[]` la cuenta propia (`linkOk` antes) → 200 con la cuenta sin
       cambios y `rawAccountsInDb()` igual. Texto literal de los errores, no importado de
       `ACCOUNT_ERRORS` (P-23).
  - Archivos: solo `backend/tests/controllers/accounts.test.ts` (bloque «cuerpo antes que
    sesión (RF-29)»). No cambian `backend/src/`, `helpers.ts`, `gameSummary.test.ts` ni
    `requests/accounts.rest`.
  - Hecho cuando: las 27 pruebas nuevas (y la opcional, si se hace) en verde junto con las
    existentes; demostrado, con un cambio temporal en `backend/src/app.ts` revertido y sin
    commit, que vigilan algo (plan, R9): (a) `strict: true` → `strict: false` hace fallar los
    casos de JSON escalar; (b) mover `app.use(express.json(...))` después de
    `app.use("/api/accounts", ...)` y de `app.use("/api/users", ...)` hace fallar los
    casos de cuerpo roto, 413 y 415 sin sesión; se anota en el reporte;
    `git diff backend/src` vacío al terminar; y se puede marcar en la spec la casilla nueva de
    "Criterios de finalización" (paso del cuerpo en las tres operaciones de lectura).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
