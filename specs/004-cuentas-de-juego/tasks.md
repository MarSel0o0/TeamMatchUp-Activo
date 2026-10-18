# Tareas 004 — Cuentas de juego y rango simulado
Estado: aprobadas (2026-10-17). T1–T10 aprobadas por el usuario junto con el plan:
"Apruebo y vamos con spec 005".
Spec: `spec.md` (aprobada el 2026-10-17). Plan: `plan.md` (aprobado el 2026-10-17).

Reglas para cada tarea: tests primero (en rojo), después el código, `npm test` y
`npm run typecheck` en verde en `backend/`, marcar la tarea y parar. Sin `any`,
`@ts-ignore` ni `.only`. Ninguna dependencia nueva. Comando de verificación de todas las
tareas, salvo que se indique otro:

```
cd backend && npm test && npm run typecheck
```

Precondición de T1: specs 001, 002 y 003 aprobadas e implementadas (plan, sección 0);
`backend/` aún no existe (comprobado el 2026-10-17). Si falta algún archivo de esa lista,
parar y reportarlo.

- [ ] **T1. Escala de rango, normalización y bandas.** RF-36, DP-2, DP-26, DP-34
  - Tests primero: `backend/tests/unit/rankScale.test.ts` (tamaños 31/7/36; todos los
    valores de normalización de los criterios de la spec, incluidos tier inexistente = 0,
    división ausente = la más baja, `Master I` = 93, `Grey II` = 0, `Champion V` = 100;
    bandas y rangos de generación de la tabla del plan, sección 3, con el rango de
    generación siempre dentro de la banda).
  - Archivos: `backend/src/domain/rankScale.ts`; `backend/src/domain/games.ts` (crear sin
    `source`/`accent` o, si existe, quitarle su `normalizeRank` y re-exportar la nueva).
  - Hecho cuando: `rankScale.test.ts` en verde y typecheck en verde.

- [ ] **T2. Proveedor simulado puro.** RF-34, RF-35, RF-36, RF-41, RF-42, RF-43, RNF-7
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

- [ ] **T3. Reglas de validación y mensajes.** RF-2, RF-6, RF-7, RF-13 (formato), RF-22, RF-38, RF-40
  - Tests primero: `backend/tests/unit/accountRules.test.ts` — orden juego → identificador
    → región con los textos exactos del plan, sección 7; nulo/vacío/espacios/no texto;
    región `" las "` → `LAS`; edición: mismo identificador con otras mayúsculas o espacios
    se ignora, distinto/nulo/vacío → RF-22 antes que RF-38, cuerpo vacío o no objeto → sin
    cambios, `gameId` del cuerpo ignorado; filtros: `user` repetido, vacío o inválido →
    "id con formato inválido" (también con `game` inválido), `game` repetido/vacío/inválido
    → "Juego no válido.", `user=me` → id de sesión.
  - Archivos: `backend/src/domain/accountRules.ts`.
  - Hecho cuando: `accountRules.test.ts` en verde.

- [ ] **T4. Estado de la cuenta: historial, partidas, tasa y tendencia.** RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36
  - Tests primero: `backend/tests/unit/accountState.test.ts` — `mergeMatches` sin repetidos
    (conserva la guardada), orden por fecha y desempate `m-9-0` antes que `m-10-0`, corte
    en 20, principal conservada con más de 20 partidas de fecha igual o posterior;
    `shouldAppendSnapshot`; `applySync` sin cambio de rango no agrega fotografía y el
    último del historial coincide con el vigente salvo la fecha; `initialState` con
    número 0; `winRate` 5/8 = 63 y 0/8 = 0; `trend` con un elemento = 0;
    `recentMatches` = 8 primeras.
  - Archivos: `backend/src/domain/accountState.ts`.
  - Hecho cuando: `accountState.test.ts` en verde.

- [ ] **T5. Modelo, reloj, middleware y helpers de prueba.** RF-33, RF-37, RF-44 (middleware), DP-32, DP-33
  - Tests primero: `backend/tests/unit/gameAccountModel.test.ts` — `toJSON` de un
    documento sin guardar tiene `id`, `userId`, `simulated: true`, fechas ISO y no tiene
    `_id`, `__v`, `user`, `matches` ni `readingNumber`; `division` ausente no aparece.
  - Archivos: `backend/src/models/gameAccount.ts` (plan, sección 5);
    `backend/src/models/user.ts` (`accounts` excluido de `toJSON`, si falta);
    `backend/src/utils/clock.ts`; `withExistingUser` en `backend/src/utils/middleware.ts`;
    `accountsInDb`, `rawAccountsInDb` y `FIXED_NOW` en
    `backend/tests/controllers/test_helper.ts`.
  - Hecho cuando: `gameAccountModel.test.ts` en verde y el resto de la suite sigue verde.

- [ ] **T6. Listar, obtener y vincular.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-29 (listar, obtener, vincular), RF-33, RF-37, RF-44, RNF-2, RNF-3
  - Tests primero: `backend/tests/controllers/accounts.test.ts` (describe "listar",
    "obtener", "vincular") — 401 sin sesión y con credencial de usuario eliminado; 201 en
    los tres juegos con valores exactos = `initialState(simulateReading(..., 0, FIXED_NOW))`
    en respuesta y en `rawAccountsInDb()`; cuenta en `User.accounts`; cuerpo con `user`,
    `currentRank`, `verified`, `readingNumber`, `simulated` ignorados; duplicado y dos
    vinculaciones simultáneas → un 201 y un 400 RF-5; mismo identificador en dos usuarios,
    otra región u otras mayúsculas → misma lectura; filtros de RF-2 (cada salto); obtener
    con id mal formado → 400, inexistente → 404; forma exacta de la cuenta y ninguna
    mención de fuentes reales.
  - Archivos: `backend/src/controllers/accounts.ts`, `backend/src/services/accountWrites.ts`
    (`linkAccount`), `backend/src/app.ts` (montar el router).
  - Hecho cuando: los tres describe en verde con `await GameAccount.init()` en `before`.

- [ ] **T7. Editar y desvincular.** RF-7, RF-8, RF-9, RF-11, RF-22, RF-29 (editar, desvincular), RF-33, RF-38, RF-40
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

- [ ] **T8. Resincronizar, concurrencia y fallo forzado.** RF-10, RF-11, RF-15, RF-28, RF-29 (resincronizar), RF-39 (cuenta), RF-42, RF-43, RF-45
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

- [ ] **T9. Resumen por juego y cascada al eliminar usuario.** RF-12, RF-13, RF-14, RF-29 (resumen), RF-37, RF-39 (usuario)
  - Tests primero: `backend/tests/controllers/gameSummary.test.ts` — resumen propio (`me`)
    y de otro usuario: cuenta con `simulated` sin `matches`, 8 primeras partidas en orden
    RF-28 con `id`, `winRate` y `trend` calculados con las funciones puras; cada salto de
    RF-13 con su texto (id mal formado, juego inválido, usuario inexistente, sin cuenta);
    401 sin sesión; eliminar usuario borra sus cuentas; eliminación simultánea a una
    vinculación → 204 y vinculación 201 o 401, y al final no queda ninguna cuenta del
    usuario.
  - Archivos: `backend/src/controllers/users.ts` (ruta `GET /:id/games/:gameId` con
    `withExistingUser`; en `DELETE /:id`, `GameAccount.deleteMany` después de borrar el
    usuario).
  - Hecho cuando: `gameSummary.test.ts` en verde y `users.test.ts` de la spec 003 sigue
    verde.

- [ ] **T10. Peticiones manuales y verificación final.** RNF-1, RNF-2, RNF-8, RNF-9, RF-34
  - Archivos: `backend/requests/accounts.rest` (login → vincular → sync → resumen → editar
    → desvincular, con `X-CSRF-Token`).
  - Comprobaciones: suite completa con la red desconectada (solo MongoDB local);
    `git diff backend/package.json backend/.env.example` sin dependencias ni variables
    nuevas; búsqueda de `fetch(`, `http.request`, `process.env` y `Math.random` en
    `src/domain/` y `src/services/rankProvider.ts` sin resultados; cada fila de la tabla de
    trazabilidad del plan (sección 12) tiene su prueba en verde.
  - Hecho cuando: `npm test` y `npm run typecheck` en verde sin conexión a Internet y todas
    las casillas de "Criterios de finalización" de la spec, salvo la de la spec 007, se
    pueden marcar.
