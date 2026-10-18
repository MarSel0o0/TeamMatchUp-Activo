# Tareas 004 — Cuentas de juego y rango simulado
Estado: **aprobadas (cambio T8b aprobado el 2026-10-18)**: "Apruebo, haz T8b". Nueva tarea
T8b (servidor de prueba en loopback IPv4, plan P-18) entre T8 y T9; debe cerrarse antes de
empezar T9. Ajusta T9 (sus pruebas usan `await authApp()` y `closeTestServers()`). T1–T8 y
T3b siguen hechas; ninguna tarea cambia de número ni de RF; T10 no cambia. Respuestas del
usuario del 2026-10-18 recogidas en T8b: `getFreePort` recibe el host ("Que reciba el
host"), no se toca el plan de la spec 003 ("No, solo el plan 004") y se aceptan
`loopbackServer.test.ts` y `after(closeTestServers)` sin `mongoose.disconnect()` en
`app.test.ts`.

Versión anterior: **aprobadas (cambio T3b aprobado el 2026-10-18)**: "Aprobar y ajustar P-17".
Nueva tarea T3b (aislamiento de `domain/`, plan P-17 y sección 2.1); la idea la aceptó
antes el usuario de palabra ("vale, me convenciste, hagamos el cambio que habías
propuesto"). T3b va entre T3 y T4 y debe cerrarse antes de empezar T4. T1–T3 siguen
hechas; T4–T10 no cambian de número, RF ni contenido.

Versión anterior: **aprobadas (reaprobación 2026-10-18)**: "Apruebo el plan y las tareas, sigue con
T1". Reaprobadas tras el cambio del 2026-10-18 ("Corregir plan primero":
alineación con el backend real de las specs 001–003). La versión anterior la aprobó el
usuario el 2026-10-17 ("Apruebo y vamos con spec 005"). Cambian la precondición, T5, T6 y
T9 (archivos y forma de las pruebas); T1–T4, T7, T8 y T10 no cambian. Ninguna tarea cambia
de número ni de RF.
Spec: `spec.md` (aprobada el 2026-10-17, sin cambios). Plan: `plan.md` (aprobado, cambio
T8b aprobado el 2026-10-18; Q1 y Q2 resueltas por el usuario el 2026-10-18: "Mantener la spec" y
"Mantener clock.ts").

Reglas para cada tarea: tests primero (en rojo), después el código, verificación en verde,
marcar la tarea y parar. Sin `any`, `@ts-ignore` ni `.only`. Ninguna dependencia nueva.
Verificación de todas las tareas:

```
cd backend && npm test && npm run typecheck && npm run lint
```

Precondición de T1: specs 001, 002 y 003 implementadas (comprobado el 2026-10-18) con los
archivos y firmas de la sección 0 del plan (`createApp`, `createWithUser`,
`createUserRoutesGuard`, `matchUserRoute`, `resolveUserTarget`, `helpers.ts` con `authApp`,
`signUp`, `loginAs(app, email, password)`, `withSession` y `nonExistingId`).
`backend/src/domain/` no existe todavía: lo crea T1. Si falta algún elemento de esa lista o
tiene otra firma, parar y reportarlo. Pruebas de controladores con el patrón de
`users.test.ts` (plan, sección 11).

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
    - `backend/tests/unit/withExistingUser.test.ts`: `appWith` devuelve el servidor de
      `listenOnLoopback`, las llamadas usan `await` y `after(closeTestServers)`.
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

- [ ] **T10. Cascada ordenada al eliminar el usuario, fallos forzados y cierre.** RF-14, RF-47 (vinculación simultánea; editar, resincronizar y desvincular en curso), RNF-1, RNF-2, RNF-8, RNF-9, RF-34
  - Tests primero: `tests/controllers/userDeletionCascade.test.ts` (los cinco puntos de
    fallo, el estado (1) operable y repetible, la vinculación simultánea con 204 y con
    500) y, en `tests/controllers/accountConcurrency.test.ts`, las tres ramas de RF-47 con
    `DELETE /api/users/me` entre la lectura y la escritura (→ 404 "cuenta no encontrada",
    nunca 500).
  - Archivos: `src/controllers/users.ts` (`DELETE /:id`: C1 → C2 → C3 en `finally`, plan
    6.8); `requests/accounts.rest`.
  - Hecho cuando: `userDeletionCascade.test.ts` y `accountConcurrency.test.ts` en verde,
    `userDeletion.test.ts` de la 003 sigue verde, la verificación en verde sin conexión a
    Internet, las comprobaciones de plan 9.3 sin resultados, cada fila de la trazabilidad
    (plan 11) tiene su prueba en verde y todas las casillas de "Criterios de finalización"
    de la spec se pueden marcar.
