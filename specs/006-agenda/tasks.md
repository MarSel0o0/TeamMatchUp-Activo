# Tareas 006 — Agenda de sesiones de juego
Estado: aprobado (2026-10-18).
Spec: `specs/006-agenda/spec.md` (aprobada el 2026-10-18). Plan: `specs/006-agenda/plan.md`
(aprobado el 2026-10-18).

Este archivo es autocontenido para quien implemente: cada tarea indica qué secciones de la
spec y del plan leer ("Leer") y qué supuestos de 001–005 comprobar ("Antes de empezar").
Los textos de error exactos están en la sección 2 (`SESSION_ERRORS`) y la sección 7 del
plan; las firmas, en la sección 2 del plan.

**Precondición de todas las tareas (plan, sección 0 y D6-4):** las specs 001 a 005 las
implementan otros miembros del equipo; lo que la 006 toma de ellas son supuestos. Antes de
empezar **cada** tarea, comprobar contra el código real de `backend/` los supuestos que
esa tarea enumera en "Antes de empezar". Si un archivo, nombre, firma, ruta o texto no
existe o no coincide, **parar y reportarlo**: no crear, completar ni modificar piezas de
001 a 005 (salvo los puntos de enganche que el plan marca como "modificar":
`middleware.ts`, `app.ts`, `users.ts` y `test_helper.ts`). Ninguna prueba fija 413/415
(D6-1). El seed no carga sesiones (D6-3).

Reglas para cada tarea: tests primero (en rojo), después el código, `npm test` y
`npm run typecheck` en verde en `backend/`, marcar la tarea y parar. Sin `any`,
`@ts-ignore` ni `.only`. Ninguna dependencia ni variable de entorno nueva. Una tarea = una
llamada al implementer. Comando de verificación de todas las tareas, salvo que se indique
otro:

```
cd backend && npm test && npm run typecheck
```

Supuestos de 001–005 (plan, sección 0): `withUser`, `withExistingUser`, `clock`,
`isValidId`, `GameId`/`GAMES`/`isGameId`, `GameAccount`, `User`, `DELETE /api/users/:id`
con la cascada de cuentas, `POST /api/accounts`, `loginAs`, `usersInDb`, `nonExistingId`,
`FIXED_NOW`, `test_helper.ts`, rutas de 002 a 005. `backend/` aún no existía al redactar
(2026-10-18).

- [ ] **T1. Reglas de texto, enteros, objeto y filtro.** RF-6 (piezas), RF-22, RNF-2, RNF-3
  - Leer: spec RF-6, RF-22, RNF-2, RNF-3, DP6-2, DP6-3, DP6-7, DP6-20, DP6-23, DP6-27,
    DP6-31; plan secciones 2, 3.1, 3.2, 3.4, 7 y P6-6.
  - Antes de empezar: existen `backend/package.json` con `npm test` (`node --test
    --test-concurrency=1 'tests/**/*.test.ts'`) y `npm run typecheck`, y
    `backend/src/domain/games.ts` exporta `GAMES` (claves `lol`, `r6`, `cs2`) y `GameId`.
  - Tests primero: `backend/tests/unit/sessionRules.test.ts` (describe "texto", "enteros",
    "objeto", "filtro") — `trimText` con U+0009, U+000B, U+000C, U+0020, U+00A0, U+FEFF,
    U+1680, U+2000, U+200A, U+202F, U+205F, U+3000, LF, CR, U+2028 y U+2029 en los
    extremos, interior intacto, U+0085 y U+200B no se recortan; `codePointLength` (60 y
    61 emojis); `hasForbiddenTitleChar` con LF, CR, U+2028, U+2029, tabulador, U+000B,
    U+000C, U+0085 y U+007F internos, y U+00A0 no prohibido; `readJsonInteger` con `3`,
    `3.0`, `"3"`, `3.5`, `true`, `null`, `NaN`, `Infinity`, `-0` → 0 y extremos;
    `isPlainObject` con `{}`, `[]`, `null`, `3`, `"x"`, `true`; `parseGameFilter` con
    ausente, `all`, `lol`/`r6`/`cs2`, vacío, repetido, `ALL`, `LOL`, ` lol `, `xyz`,
    `__proto__`, `constructor` y parámetros desconocidos; `<script>` sale idéntico de
    `trimText`.
  - Archivos: `backend/src/domain/sessionRules.ts` (`SESSION_ERRORS`, `trimText`,
    `codePointLength`, `hasForbiddenTitleChar`, `readJsonInteger`, `isPlainObject`,
    `parseGameFilter`).
  - Hecho cuando: el archivo de pruebas en verde, `sessionRules.ts` sin `express`,
    `mongoose` ni `Date`, y `npm test` y `npm run typecheck` en verde.

- [ ] **T2. Validación de crear y editar.** RF-6, RF-7, RF-15, RF-26, RF-27 (orden), DP6-9, DP6-22
  - Leer: spec RF-6, RF-7, RF-15, RF-26, RF-27, DP6-1, DP6-9, DP6-19, DP6-22, DP6-29;
    plan secciones 2, 3.3 y 7.
  - Antes de empezar: los mismos supuestos de T1 (`GAMES`, `GameId`).
  - Tests primero: `sessionRules.test.ts` (describe "crear", "editar") — orden juego →
    cuenta → título → notas → día → hora → duración → cupos con un caso por salto y el
    texto exacto; `undefined` = `{}` → "Juego no válido."; juego inválido sin cuenta →
    juego; cuenta y título inválido → título; título `"  ab  "`, `"Ranked\n"`,
    `"\tRanked\t"`, `"Ranked\tnoche"`, `"​Ranked"`; notas ausentes → `''`, `null`/`5`/161 →
    notas, 160 emojis válido, notas solo U+3000 → `''`; campos extra (`hostId`,
    `participants`, `status`, `id`, `createdAt`) no aparecen en el resultado; editar con
    `{}`, `undefined`, solo `slots`, `gameId` inexistente (ignorado), `title: null`,
    `title: ""`, `day: "3"`, `notes: ""` y `notes: "   "` (válidas, `''`), `notes: null`.
  - Archivos: `backend/src/domain/sessionRules.ts` (`validateCreatePayload`,
    `validateSessionEdit`).
  - Hecho cuando: los dos describe en verde, y `npm test` y `npm run typecheck` en verde.

- [ ] **T3. Estado, orden y vista.** RF-2, RF-4, RF-7, RF-8, RF-11 a RF-14, RF-16 (regla), RF-17, RF-24, RNF-1, DP6-10, DP6-38
  - Leer: spec RF-2, RF-4, RF-8, RF-11 a RF-14, RF-17, RF-24, RNF-1, DP6-10, DP6-15,
    DP6-26, DP6-34, DP6-38; plan secciones 2, 3.5, 3.6, P6-4 y P6-8.
  - Antes de empezar: `GameId` en `backend/src/domain/games.ts` (como en T1).
  - Tests primero: `backend/tests/unit/sessionState.test.ts` — `statusFor` (n ≥ cupos →
    `full`); `newSession` (anfitrión único, `open`, `createdAt = now`); `applyEdit` (no
    anfitrión → 403 aunque el parche sea inválido; parche inválido antes que RF-8; cupos =
    participantes → `full`; subir cupos → `open`); `applyJoin` (inscrito y llena →
    "ya inscrito"; llena → "ya no admite"; último cupo → `full`); `applyLeave` (anfitrión
    → RF-14; no inscrito → RF-17; salir de llena → `open`); `removeParticipant`
    idempotente con recálculo; DP6-38: con 3 cupos y 3 `participantIds` de los que 1 no
    está en el mapa de usuarios, `applyJoin` → 409 llena y `applyEdit` a 2 cupos → 400;
    `compareSessions` con cada nivel de desempate (día, hora, `createdAt`, id);
    `compareByCodePoint` (prefijo más corto primero); `toSessionView` con claves exactas de
    RNF-1 en orden, referencias con solo cuatro campos, anfitrión ausente → `null`,
    participante ausente filtrado con `status` intacto; `assembleSessionViews` ordena y
    omite.
  - Archivos: `backend/src/domain/sessionState.ts`.
  - Hecho cuando: el archivo de pruebas en verde, sin `express`, `mongoose`, `Date.now`
    ni `new Date()` sin argumento en `sessionState.ts`, y `npm test` y
    `npm run typecheck` en verde.

- [ ] **T4. Modelo, paso del cuerpo, parser y helpers de prueba.** RF-5 (esquema), RF-20 (cuerpo), RF-23, RF-28, DP6-36
  - Leer: spec RF-5, RF-20, RF-23, RF-28, DP6-29, DP6-32, DP6-36, DP6-37; plan
    secciones 1, 4, 6 ("Paso del cuerpo"), 8 (P6-1, P6-3, P6-5, D6-1, D6-2) y 12.
  - Antes de empezar: `backend/src/app.ts` exporta `app` con `express.json()` global
    antes de los routers, `errorHandler` (`{ error }`; `entity.parse.failed` → 400
    "JSON mal formado"; 500 "error interno del servidor") y `unknownEndpoint`
    (404 "endpoint desconocido"); `backend/src/utils/middleware.ts` existe;
    `backend/src/models/user.ts` (`User`); `backend/tests/controllers/test_helper.ts` con
    `loginAs(user) → { agent, csrfToken }`, `usersInDb` y `nonExistingId`;
    `POST /api/accounts` de la 004 (para `linkAccountFor`); `app.test.ts` de la 001. Si
    algo no coincide, parar y reportarlo.
  - Tests primero: `backend/tests/unit/playSessionModel.test.ts` (`validateSync`:
    documento válido sin errores; `status` fuera de `open|full`, `day` 7 y `slots` 1 dan
    error; título de 60 emojis no da error de largo);
    `backend/tests/unit/requireObjectBody.test.ts` (`undefined` y `{}` → `next()`; `[]`,
    `null`, `3`, `"x"`, `true` → 400 `{ error: "JSON mal formado" }` sin llamar a
    `next`); `backend/tests/controllers/jsonParser.test.ts` — con
    `Content-Type: application/json`: `POST /api/sessions/x/y/z` (ruta que nunca existirá)
    con `3` → 404 "endpoint desconocido" (el parser de `/api/sessions` acepta primitivos y
    el global no vuelve a leer el cuerpo), con `{mal` → 400 "JSON mal formado";
    `POST /api/inexistente` con `3` → mismo resultado que antes de la tarea (parser global
    sin cambios). Sin pruebas de 413/415 (D6-1).
  - Archivos: `backend/src/models/playSession.ts`; `requireObjectBody` en
    `backend/src/utils/middleware.ts`; `backend/src/app.ts`
    (`app.use('/api/sessions', express.json({ strict: false }))` antes del
    `express.json()` global); `sessionsInDb`, `rawSessionsInDb`, `createUserAndLogin`,
    `linkAccountFor` e `insertSession` en `backend/tests/controllers/test_helper.ts`.
  - Hecho cuando: las pruebas nuevas en verde, `app.test.ts` de la 001 y la suite de la
    004/005 siguen verdes, y `npm test` y `npm run typecheck` en verde.

- [ ] **T5. Listar y obtener.** RF-1, RF-2, RF-3, RF-4, RF-18, RF-19 (obtener), RF-22, RF-24 (lectura), RNF-1
  - Leer: spec RF-1 a RF-4, RF-18, RF-19, RF-22, RF-24, RNF-1, DP6-3, DP6-15, DP6-20,
    DP6-26, DP6-34; plan secciones 5, 6 ("Intervalo de la cascada"), 7 y 9.
  - Antes de empezar: `withUser` en `middleware.ts` con los tres 401 ("sesión no
    iniciada", "token inválido", "sesión expirada") y `request.userId` tipado en
    `backend/src/types/express.d.ts`; `withExistingUser` (401 "sesión no iniciada");
    `isValidId` en `backend/src/domain/accountRules.ts`; `User` con `username`,
    `displayName` y `avatarColor`.
  - Tests primero: `backend/tests/controllers/sessions.read.test.ts` — tres 401 con su
    texto y credencial de usuario eliminado → 401 "sesión no iniciada"; lista vacía (todos
    y un juego); filtro `lol` filtra; `all` y ausente → todas, incluidas llenas y propias;
    cada 400 de RF-22 (`ALL`, `LOL`, ` lol `, `game=`, `game=lol&game=cs2`, `xyz`);
    `page=2` ignorado; orden con desempate por `createdAt` y por id; obtener: id mal
    formado → 400, inexistente → 404 "Sesión no encontrada.", 200 con claves exactas de
    RNF-1 y referencias sin correo ni hash; RF-24: anfitrión borrado con `User.deleteOne`
    → omitida del listado y 404 por id; participante borrado → visible, 200 por id, sin
    ese participante y con `status` guardado.
  - Archivos: `backend/src/services/sessionReads.ts`; `backend/src/controllers/sessions.ts`
    (`GET /` y `GET /:id`); `backend/src/app.ts` (montar `sessionsRouter`).
  - Hecho cuando: el archivo en verde con `await PlaySession.init()` en `before`, y
    `npm test` y `npm run typecheck` en verde.

- [ ] **T6. Crear.** RF-5, RF-6, RF-15, RF-20 (crear), RF-21, RF-27, RF-28, RNF-2
  - Leer: spec RF-5, RF-6, RF-15, RF-20, RF-21, RF-27, RF-28, RNF-2; plan secciones 5
    ("crear"), 6 (`createSession`), 7 y 9.
  - Antes de empezar: `clock.now()` en `backend/src/utils/clock.ts`; `FIXED_NOW` en los
    helpers de prueba; `GameAccount` en `backend/src/models/gameAccount.ts` con campos
    `user` y `gameId`; vincular y desvincular cuentas por `POST`/`DELETE /api/accounts`.
  - Tests primero: `backend/tests/controllers/sessions.create.test.ts` — 201 con anfitrión
    único participante, `open`, `createdAt = FIXED_NOW` (respuesta y `rawSessionsInDb`);
    título y notas recortados; notas ausentes → `''`; domingo 23 h con 4 horas → día 6 y
    hora 23; un caso por salto de RF-6 con base sin cambios; sin cuenta → 400 RF-27; juego
    inválido sin cuenta → "Juego no válido."; desvincular después no cambia la sesión;
    `hostId`, `participants`, `status`, `id` y `createdAt` del cuerpo ignorados (actúa el
    usuario de la sesión); `<script>alert(1)</script>` en título y notas devuelto idéntico;
    sesiones duplicadas y solapadas permitidas; sin cuerpo → "Juego no válido."; sin
    cuerpo y sin credencial → 401.
  - Archivos: `backend/src/services/sessionWrites.ts` (`createSession`);
    `backend/src/controllers/sessions.ts` (`POST /` con `requireObjectBody`).
  - Hecho cuando: el archivo en verde, y `npm test` y `npm run typecheck` en verde.

- [ ] **T7. Editar y cancelar.** RF-7, RF-8, RF-9, RF-10, RF-19, RF-20 (editar, cancelar), RF-24 (escritura), RF-26
  - Leer: spec RF-7 a RF-10, RF-19, RF-20, RF-24, RF-26, DP6-1, DP6-22, DP6-38; plan
    secciones 5 ("editar", "cancelar"), 6 (`mutateSession`), 7 y P6-2.
  - Antes de empezar: el patrón de reintento optimista de
    `backend/src/services/accountWrites.ts` (004) existe y es el descrito en el plan,
    sección 6; supuestos de T5.
  - Tests primero: `backend/tests/controllers/sessions.edit.test.ts` — editar solo
    `slots` conserva lo demás; cupos = participantes → `full`; subir cupos de llena →
    `open`; `slots: 1` → 400 de cupos (no RF-8); cupos válidos bajo participantes → RF-8;
    `{}`, sin cuerpo y solo campos ignorados → 200 sin cambios; `notes: ""` y `"   "` → 200
    con `''`; `notes: null`, `title: null`, `title: ""`, `day: "3"` → 400 con su texto;
    no anfitrión → 403 (también con datos inválidos y con cupos bajo inscritos); id mal
    formado de sesión ajena → 400; id inexistente con datos inválidos → 404; anfitrión
    borrado → 404; cancelar: anfitrión → 204 y no queda en la base; no anfitrión → 403;
    inexistente → 404; en cada error la base no cambia.
  - Archivos: `backend/src/services/sessionWrites.ts` (`mutateSession`);
    `backend/src/controllers/sessions.ts` (`PUT /:id` con `requireObjectBody`,
    `DELETE /:id`).
  - Hecho cuando: el archivo en verde, y `npm test` y `npm run typecheck` en verde.

- [ ] **T8. Sumarse y salir.** RF-11, RF-12, RF-13, RF-14, RF-17, RF-19, RF-20 (sumarse, salir), RF-21, RF-24, DP6-38
  - Leer: spec RF-11 a RF-14, RF-17, RF-19 a RF-21, RF-24, DP6-10, DP6-38; plan
    secciones 3.5, 5 ("sumarse", "salir"), 6 (`joinSession`, `removeUserFromSessions`) y 7.
  - Antes de empezar: supuestos de T5 y T6.
  - Tests primero: `backend/tests/controllers/sessions.join.test.ts` — sumarse → 200, al
    final de los participantes; último cupo → `full`; salir luego → `open`; anfitrión se
    suma → "ya inscrito"; inscrito en llena → "ya inscrito"; no inscrito en llena → "ya no
    admite"; sumarse sin cuenta en el juego → 200; salir no inscrito → RF-17; anfitrión
    sale → RF-14; salir de inexistente → 404; id mal formado → 400; identificadores de
    otro usuario en el cuerpo ignorados; DP6-38: sesión de 3 cupos con un participante
    borrado con `User.deleteOne` (2 visibles) → sumarse 409 "Esta sesión ya no admite
    jugadores." y editar a 2 cupos 400 RF-8; tras `removeUserFromSessions` → `open` y
    ambas operaciones se resuelven con 2.
  - Archivos: `backend/src/services/sessionWrites.ts` (`joinSession`,
    `removeUserFromSessions`); `backend/src/controllers/sessions.ts`
    (`POST /:id/join`, `POST /:id/leave`).
  - Hecho cuando: el archivo en verde, y `npm test` y `npm run typecheck` en verde.

- [ ] **T9. Concurrencia y cascada al eliminar usuario.** RF-16, RF-18, RF-25
  - Leer: spec RF-16, RF-18, RF-25, DP6-11, DP6-12; plan secciones 6 (completa), 9
    ("Concurrencia", "Cascada"), P6-2 y P6-7.
  - Antes de empezar: `DELETE /api/users/:id` en `backend/src/controllers/users.ts`
    (spec 003, RF-11) existe y ya hace la cascada de cuentas de la 004 en este orden:
    `User.deleteOne` y después `GameAccount.deleteMany`; existen `users.test.ts` (003) y
    `gameSummary.test.ts` (004). Si la ruta o la cascada de cuentas faltan o siguen otro
    orden, parar y reportarlo: no implementarlas ni reordenarlas.
  - Tests primero: `backend/tests/controllers/sessions.concurrency.test.ts` — 10
    repeticiones de cada caso de RF-25 (último cupo: un 200 y un 409 "ya no admite";
    mismo usuario dos veces: 200 y 409 "ya inscrito"; bajar cupos vs. sumarse: nunca más
    participantes que cupos y el perdedor 400 RF-8 o 409; cancelar vs. sumarse: 204 y la
    sesión no existe, el otro 200 o 404) y la prueba determinista del reintento (plan,
    sección 9); `backend/tests/controllers/sessions.cascade.test.ts` — eliminar usuario
    borra sus sesiones organizadas y lo quita de las demás con estado recalculado
    (`full` → `open`); eliminación simultánea a una creación y a un sumarse suyos → al
    final ninguna sesión organizada por él ni con él como participante, y la otra
    operación responde 201/200 o 401 "sesión no iniciada".
  - Archivos: `backend/src/controllers/users.ts` (`DELETE /:id`:
    `PlaySession.deleteMany({ host })` y `removeUserFromSessions` después de borrar el
    usuario y sus cuentas); ajustes en `backend/src/services/sessionWrites.ts` si las
    pruebas lo exigen sin cambiar el plan (si exige cambiarlo, parar y reportarlo).
  - Hecho cuando: los dos archivos en verde, `users.test.ts` de la 003 y
    `gameSummary.test.ts` de la 004 siguen verdes, y `npm test` y `npm run typecheck` en
    verde.

- [ ] **T10. Cuerpo, barrido de 401, peticiones manuales y verificación final.** RF-1, RF-15, RF-18, RF-20, RF-23, RF-28, RNF-3, RNF-4, DP6-29, DP6-36
  - Leer: spec RF-1, RF-15, RF-18, RF-20, RF-23, RF-28, RNF-3, RNF-4, DP6-21, DP6-29,
    DP6-32, DP6-36 y "Criterios de finalización"; plan secciones 6 ("Paso del cuerpo"),
    9 ("Cuerpo", "Barrido de 401", "Fuera de las pruebas") y 11.
  - Antes de empezar: las rutas de 002 a 005 de la lista del barrido (plan, sección 9)
    existen con ese método y esa ruta en los routers reales (en particular las de la
    003, cuyo plan no existía). Si no coinciden, parar y reportarlo; no ajustar la lista
    por cuenta propia. Supuestos de T5 (textos de los tres 401).
  - Tests primero: `backend/tests/controllers/sessions.body.test.ts` (completo) — en las
    siete operaciones: JSON mal formado → 400 "JSON mal formado" sin credencial, con
    credencial inválida, expirada y de usuario eliminado, y base sin cambios; crear y
    editar con `[]`, `3`, `"x"`, `true`, `null` → 400 "JSON mal formado" (también sin
    credencial); listar, obtener, cancelar, sumarse y salir con esos cuerpos y sin cuerpo
    → respuesta normal; crear y editar con `text/plain` → "Juego no válido." y 200 sin
    cambios; `backend/tests/controllers/protectedRoutes.test.ts` — barrido del plan,
    sección 9 (sin credencial en las rutas de 002 a 006; usuario eliminado en las siete de
    la 006), cada petición con `{}` o sin cuerpo. Sin casos de cuerpo demasiado grande,
    comprimido o con juego de caracteres no admitido (D6-1).
  - Archivos: `backend/requests/sessions.rest` (login → crear → listar → obtener →
    sumarse con otro usuario → salir → editar → cancelar, con `X-CSRF-Token`).
  - Comprobaciones: `git diff backend/package.json backend/.env.example` sin dependencias
    ni variables nuevas; búsqueda de `express`, `mongoose`, `Date.now`, `new Date()` y
    `process.env` en `src/domain/sessionRules.ts` y `sessionState.ts` sin resultados;
    cada fila de la trazabilidad del plan (sección 11) tiene su prueba en verde.
  - Hecho cuando: `npm test` y `npm run typecheck` en verde y todas las casillas de
    "Criterios de finalización" de la spec se pueden marcar.
