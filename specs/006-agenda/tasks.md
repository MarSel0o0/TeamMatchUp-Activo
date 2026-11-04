# Tareas 006 — Agenda de sesiones de juego
Estado: aprobado (2026-10-19, decisiones Q1–Q4 incorporadas); implementado.
Aprobado originalmente el 2026-10-18; T1 a T3 se hicieron con esa versión y siguen marcadas.
Esta revisión adapta nombres, firmas, rutas y comportamientos a `backend/` real e incorpora
las decisiones del usuario Q1 a Q4 (cambio de spec aprobado el 2026-10-19, DP6-39); no cambia
el orden de las tareas.
Spec: `specs/006-agenda/spec.md` (aprobada, con el cambio del 2026-10-19). Plan:
`specs/006-agenda/plan.md` (aprobado por el mismo ajuste; su sección "Ajuste
de supuestos" tiene la tabla supuesto → realidad y "Preguntas resueltas" las decisiones Q1
a Q4).

Dependencias (cada tarea necesita solo las anteriores; con Q1 a Q4 resueltas no hay ninguna
bloqueada): T4 ← T1 a T3 (hechas); T5 ← T4 (modelo, parser, helpers) y T1 a T3; T6 ← T5
(router y `sessionReads.ts`); T7 ← T6 (`sessionWrites.ts` ya creado); T8 ← T7
(`mutateSession`); T9 ← T6 a T8 (`createSession`, `joinSession`, `removeUserFromSessions`);
T10 ← T4 a T9.

Este archivo es autocontenido para quien implemente: cada tarea indica qué secciones de la
spec y del plan leer ("Leer") y qué supuestos de 001–005 comprobar ("Antes de empezar").
Los textos de error exactos están en la sección 2 (`SESSION_ERRORS`) y la sección 7 del
plan; las firmas, en la sección 2 del plan.

**Precondición de todas las tareas (plan, sección 0 y D6-4):** las specs 001 a 005 las
implementaron otros miembros del equipo y están implementadas (2026-10-19); lo que la 006
toma de ellas son supuestos ya verificados y corregidos en el plan. Antes de empezar
**cada** tarea, volver a comprobar contra el código real de `backend/` los supuestos que
esa tarea enumera en "Antes de empezar". Si un archivo, nombre, firma, ruta o texto no
existe o no coincide, **parar y reportarlo**: no crear, completar ni modificar piezas de
001 a 005 (salvo los puntos de enganche que el plan marca como "modificar":
`middleware.ts`, `app.ts`, `users.ts` y `helpers.ts`). Ninguna prueba fija 413/415
(D6-1). El seed no carga sesiones (D6-3).

Reglas para cada tarea: tests primero (en rojo), después el código, `npm test` y
`npm run typecheck` en verde en `backend/`, marcar la tarea y parar. Sin `any`,
`@ts-ignore` ni `.only`. Ninguna dependencia ni variable de entorno nueva. Una tarea = una
llamada al implementer. Comando de verificación de todas las tareas, salvo que se indique
otro:

```
cd backend && npm test && npm run typecheck
```

`backend` también tiene `npm run lint` (`eslint .`), en verde en 001 a 005. La spec no lo
exige (DP6-24, Q4 resuelta por el usuario), así que no es parte de "Hecho cuando"; puede
correrse como comprobación extra.

Nombres reales de 001–005 que usan las tareas (plan, "Ajuste de supuestos"; verificados el
2026-10-19): `createApp({ jwtSecret, nodeEnv, now? })` en `src/app.ts`;
`createWithUser({ jwtSecret, now })`, `SessionGuardOptions`, `JsonResponder`,
`unknownEndpoint` y `errorHandler` en `src/utils/middleware.ts` (no existe `withExistingUser`:
el usuario eliminado lo resuelve `createWithUser` con 401 "token inválido", sin guardia
propia, como `matches.ts`); `MESSAGES` en `src/utils/errors.ts`; `SESSION_MESSAGES` en
`src/services/sessionToken.ts` (`notLoggedIn` "sesión no iniciada" solo para la credencial
ausente; `invalidToken` "token inválido", también para el usuario eliminado); `decodeSegment` en
`src/services/userTarget.ts`; `clock.now()` en `src/utils/clock.ts`; `isValidId` en
`src/domain/accountRules.ts`; `GAMES`/`GameId`/`isGameId` en `src/domain/games.ts`;
`GameAccount` (`user`, `gameId`), `User` (`username`, `displayName`, `avatarColor`);
`DELETE /api/users/:id` con la cascada C1 → C2 → C3 de la 004; `POST /api/accounts`; y, en
`tests/controllers/helpers.ts` (no existe `test_helper.ts`): `authApp`, `signUp`, `loginAs`
(`loginAs(app, email, password)`), `withSession`, `rawCookieRequest`, `deleteMe`, `linkOk`,
`unlink`, `nonExistingId`, `FIXED_NOW` (ms), `forgeToken`, `closeTestServers`. No existen
`usersInDb` ni `createUserAndLogin` (se usa `signUp`).

Decisiones del usuario, ya resueltas (plan, "Preguntas resueltas"); no hay preguntas
abiertas y ninguna tarea está bloqueada:
- **Q1:** el 401 de la credencial válida de un usuario eliminado es "token inválido"
  (RF-18, DP6-39), también en la compensación de crear y sumarse; "sesión no iniciada" solo
  para la credencial ausente. Se reutiliza `createWithUser`.
- **Q2:** los textos propios de la 006 mantienen mayúscula inicial y punto final. Sin cambios
  en `SESSION_ERRORS` ni en T1 a T3.
- **Q3:** aprobado el paso C4 de la cascada (después de C3), con el riesgo documentado en el
  plan (500 si C4 falla tras borrar al usuario; sesiones residuales ocultas por RF-24).
- **Q4:** el lint no se exige; `npm run lint` es una comprobación extra opcional.

Si una prueba o un literal contradice estas decisiones, no inventar: parar y reportarlo.

- [x] **T1. Reglas de texto, enteros, objeto y filtro.** RF-6 (piezas), RF-22, RNF-2, RNF-3
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

- [x] **T2. Validación de crear y editar.** RF-6, RF-7, RF-15, RF-26, RF-27 (orden), DP6-9, DP6-22
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

- [x] **T3. Estado, orden y vista.** RF-2, RF-4, RF-7, RF-8, RF-11 a RF-14, RF-16 (regla), RF-17, RF-24, RNF-1, DP6-10, DP6-38
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

- [x] **T4. Modelo, paso del cuerpo, parser y helpers de prueba.** RF-5 (esquema), RF-20 (cuerpo), RF-23, RF-28, DP6-36
  - Leer: spec RF-5, RF-20, RF-23, RF-28, DP6-29, DP6-32, DP6-36, DP6-37; plan "Ajuste de
    supuestos" (filas 3, 5 y 6) y secciones 1, 4, 5 (capas del router), 6 ("Paso del
    cuerpo"), 8 (P6-1, P6-3, P6-5, D6-1, D6-2) y 12.
  - Antes de empezar (verificado el 2026-10-19; volver a comprobar): `backend/src/app.ts`
    exporta `createApp({ jwtSecret, nodeEnv, now? })` y monta, en este orden,
    `express.json({ limit: 102_400, strict: true })`, `cookieParser()`, `/api/users`,
    `/api/auth`, `/api/accounts`, `/api/matches`, `unknownEndpoint` y `errorHandler`;
    `backend/src/utils/middleware.ts` exporta `JsonResponder`, `createWithUser`,
    `unknownEndpoint` y `errorHandler`; `backend/src/utils/errors.ts` exporta `MESSAGES`
    (`malformedJson` = "JSON mal formado", `unknownEndpoint` = "endpoint desconocido") y
    `mapErrorToResponse` (`entity.parse.failed` → 400, 500 "error interno del servidor");
    `backend/src/models/user.ts` (`User`) y `backend/src/models/gameAccount.ts`;
    `backend/tests/controllers/helpers.ts` (no `test_helper.ts`) con `authApp`, `signUp`,
    `withSession`, `nonExistingId`, `FIXED_NOW`, `linkOk` y `closeTestServers`; `POST
    /api/accounts` con cuerpo `{ gameId, handle, region }` (para `linkAccountFor`);
    `node_modules/body-parser` 2.3.0 (`lib/read.js` sale sin leer si el cuerpo ya se
    consumió). No existen `loginAs(user)`, `usersInDb` ni `app.test.ts` localizado: no
    usarlos. Si algo no coincide, parar y reportarlo.
  - Tests primero: `backend/tests/unit/playSessionModel.test.ts` (`validateSync`:
    documento válido sin errores; `status` fuera de `open|full`, `day` 7 y `slots` 1 dan
    error; título de 60 emojis no da error de largo);
    `backend/tests/unit/requireObjectBody.test.ts` (objetos falsos con la interfaz
    `{ body?: unknown }` y `JsonResponder`: `undefined` y `{}` → `next()`; `[]`, `null`,
    `3`, `"x"`, `true` → `status(400)` y `json({ error: "JSON mal formado" })` sin llamar a
    `next`); `backend/tests/controllers/jsonParser.test.ts` (con `authApp()` y
    `Content-Type: application/json`): (a) `POST /api/sessions/x/y/z` con `3` no responde
    400 "JSON mal formado" (el parser de `/api/sessions` acepta primitivos y el global no
    vuelve a leer el cuerpo); hoy da 404 "endpoint desconocido" y desde T5 dará 401 "sesión
    no iniciada" (la petición no lleva credencial) porque el router ya estará montado, así
    que la aserción acepta ambos y
    T5 no necesita tocar esta prueba; (b) la misma ruta con `{mal` → 400 "JSON mal
    formado"; (c) `POST /api/inexistente` con `3` → 400 "JSON mal formado" (el global
    sigue estricto); (d) un `express()` mínimo con los dos parsers en el mismo orden que
    `createApp` y una ruta de eco solo de la prueba, `POST /api/sessions/eco`, comprueba
    que `null`, `3`, `"x"`, `true` y `[]` llegan a `request.body` tal cual (en particular
    `null` no se convierte en `undefined` ni en `{}`), que `text/plain` con JSON dentro deja
    `undefined` y que el cuerpo vacío deja `undefined` o `{}`; la conexión con `createApp`
    real la comprueban T6 y T10. Si (d) muestra que `null` no llega como `null`, parar y
    reportarlo (RF-28 no sería implementable). Sin pruebas de 413/415 (D6-1).
  - Archivos: `backend/src/models/playSession.ts`; `requireObjectBody(request, response,
    next)` en `backend/src/utils/middleware.ts` (responde con `MESSAGES.malformedJson`);
    `backend/src/app.ts` (dentro de `createApp`,
    `app.use("/api/sessions", express.json({ limit: 102_400, strict: false }))` **antes** de
    la línea `app.use(express.json({ limit: 102_400, strict: true }))`; el router de
    `/api/sessions` se monta en T5); en `backend/tests/controllers/helpers.ts`:
    `sessionsInDb()` (`JSON.parse(JSON.stringify(...))` de `PlaySession.find({}).sort({
    _id: 1 })`), `rawSessionsInDb()` (`lean()`), `linkAccountFor(session, gameId)` (envuelve
    `linkOk` con un cuerpo fijo por juego: `lol` `Jugador1#LAS`/`LAS`, `r6`
    `jugador2`/`LATAM`, `cs2` `76561190000000001`/`South America`) e `insertSession(datos)`.
    No se crean `createUserAndLogin` (es `signUp`) ni `usersInDb`.
  - Hecho cuando: las pruebas nuevas en verde, la suite completa de 001–005 sigue verde
    (nada de 001–005 se modifica salvo el montaje en `app.ts`), y `npm test` y
    `npm run typecheck` en verde.

- [x] **T5. Listar y obtener.** RF-1, RF-2, RF-3, RF-4, RF-18, RF-19 (obtener), RF-22, RF-24 (lectura), RNF-1
  - Leer: spec RF-1 a RF-4, RF-18, RF-19, RF-22, RF-24, RNF-1, DP6-3, DP6-15, DP6-20,
    DP6-26, DP6-34; plan "Ajuste de supuestos" (filas 4, 6, 8 y 10) y secciones 5 (capas
    del router), 6 ("Intervalo de la cascada"), 7 y 9.
  - Antes de empezar (verificado el 2026-10-19; volver a comprobar): `createWithUser({
    jwtSecret, now })` y `SessionGuardOptions` en `backend/src/utils/middleware.ts`, que
    ya incluye el paso del usuario eliminado, con 401 "token inválido" (no existe
    `withExistingUser`), y deja `request.userId?: string`
    (`backend/src/types/express.d.ts`); `SESSION_MESSAGES` en
    `backend/src/services/sessionToken.ts` (`notLoggedIn` "sesión no iniciada", solo
    credencial ausente; `invalidToken` "token inválido"; `expired` "sesión expirada"); `decodeSegment` en `backend/src/services/userTarget.ts`;
    `isValidId` en `backend/src/domain/accountRules.ts`; `User` con `username`,
    `displayName` y `avatarColor`; `createAccountsRouter` en
    `backend/src/controllers/accounts.ts` como modelo de las guardias con `router.use`;
    `forgeToken`, `rawCookieRequest` y `deleteMe` en `helpers.ts`.
  - Tests primero: `backend/tests/controllers/sessions.read.test.ts` (convenciones del plan,
    sección 9: `authApp()`, `signUp`, `before` con `connectDatabase` y `PlaySession.init()`)
    — los tres 401 de la sesión con su texto (sin cookie "sesión no iniciada"; sin
    comprobante o cookie alterada "token inválido"; expirada "sesión expirada", con
    `forgeToken`); credencial de usuario eliminado (`signUp` + `deleteMe` +
    `rawCookieRequest`) → 401 "token inválido" (RF-18, DP6-39; no "sesión no iniciada");
    lista vacía (todos
    y un juego); filtro `lol` filtra; `all` y ausente → todas, incluidas llenas y propias;
    cada 400 de RF-22 (`ALL`, `LOL`, ` lol `, `game=`, `game=lol&game=cs2`, `xyz`);
    `page=2` ignorado; orden con desempate por `createdAt` y por id; obtener: id mal
    formado → 400 "id con formato inválido", `%zz` como id → 400 "id con formato inválido"
    (con sesión; sin sesión, 401), inexistente → 404 "Sesión no encontrada.", 200 con claves
    exactas de RNF-1 y referencias sin correo ni hash; RF-24: anfitrión borrado con
    `User.deleteOne` → omitida del listado y 404 por id; participante borrado → visible,
    200 por id, sin ese participante y con `status` guardado. Las sesiones se preparan con
    `insertSession` y `signUp`.
  - Archivos: `backend/src/services/sessionReads.ts` (`toRecord`, `loadUserRefs`,
    `loadSessionView`, `listSessionViews`); `backend/src/controllers/sessions.ts`
    (`createSessionsRouter({ jwtSecret, now })` con las capas 1 a 3 del plan, sección 5:
    paso del cuerpo con `requireObjectBody` solo en `POST /` y `PUT /:id`, sesión con
    `createWithUser` y guardia de segmento; y `GET /` y `GET /:id`);
    `backend/src/app.ts` (en `createApp`, `app.use("/api/sessions",
    createSessionsRouter({ jwtSecret, now }))` tras `/api/matches` y antes de
    `unknownEndpoint`).
  - Hecho cuando: el archivo en verde con `await PlaySession.init()` en `before`,
    `jsonParser.test.ts` de T4 sigue verde, y `npm test` y `npm run typecheck` en verde.

- [x] **T6. Crear.** RF-5, RF-6, RF-15, RF-20 (crear), RF-21, RF-27, RF-28, RNF-2
  - Leer: spec RF-5, RF-6, RF-15, RF-20, RF-21, RF-27, RF-28, RNF-2; plan secciones 5
    ("crear"), 6 (`createSession`), 7 y 9.
  - Antes de empezar (verificado el 2026-10-19; volver a comprobar): `clock` en
    `backend/src/utils/clock.ts` (`clock.now(): Date`, sustituible con
    `t.mock.method(clock, "now", () => new Date(FIXED_NOW))`); `FIXED_NOW` (número en ms) en
    `backend/tests/controllers/helpers.ts`; `GameAccount` en
    `backend/src/models/gameAccount.ts` con campos `user` y `gameId`; `isGameId` en
    `backend/src/domain/games.ts`; vincular y desvincular cuentas con `linkOk(session,
    body)` / `unlink(session, id)` de `helpers.ts` (`POST`/`DELETE /api/accounts`); supuestos
    de T5.
  - Tests primero: `backend/tests/controllers/sessions.create.test.ts` — 201 con anfitrión
    único participante, `open`, `createdAt = FIXED_NOW` (respuesta y `rawSessionsInDb`);
    título y notas recortados; notas ausentes → `''`; domingo 23 h con 4 horas → día 6 y
    hora 23; un caso por salto de RF-6 con base sin cambios; sin cuenta → 400 RF-27; juego
    inválido sin cuenta → "Juego no válido."; desvincular después no cambia la sesión;
    `hostId`, `participants`, `status`, `id` y `createdAt` del cuerpo ignorados (actúa el
    usuario de la sesión); `<script>alert(1)</script>` en título y notas devuelto idéntico;
    sesiones duplicadas y solapadas permitidas; sin cuerpo → "Juego no válido."; sin
    cuerpo y sin credencial → 401; cuerpo `[]`, `3`, `"x"`, `true` o `null` (JSON) → 400
    "JSON mal formado", también sin credencial (comprueba el montaje real de `createApp`).
  - Archivos: `backend/src/services/sessionWrites.ts` (`createSession`, con compensación
    cuando el usuario ya no existe: 401 "token inválido", `SESSION_MESSAGES.invalidToken`,
    como `matches.ts`; DP6-39);
    `backend/src/controllers/sessions.ts` (`POST /`; la capa de `requireObjectBody` ya está
    desde T5).
  - Hecho cuando: el archivo en verde, y `npm test` y `npm run typecheck` en verde.

- [x] **T7. Editar y cancelar.** RF-7, RF-8, RF-9, RF-10, RF-19, RF-20 (editar, cancelar), RF-24 (escritura), RF-26
  - Leer: spec RF-7 a RF-10, RF-19, RF-20, RF-24, RF-26, DP6-1, DP6-22, DP6-38; plan
    secciones 5 ("editar", "cancelar"), 6 (`mutateSession`), 7 y P6-2.
  - Antes de empezar: el patrón de reintento optimista de
    `backend/src/services/accountWrites.ts` (004) existe y es el descrito en el plan,
    sección 6 (`updateOwnedAccount(accountId, userId, apply, maxAttempts = 5)`: `findById`
    → regla → `save()`; `VersionError` → reintento; `DocumentNotFoundError` → 404; intentos
    agotados → `throw new Error` → 500; resultados `{ ok, … }`; `mongoose.Error.VersionError`
    y `DocumentNotFoundError` como en ese archivo); supuestos de T5.
  - Tests primero: `backend/tests/controllers/sessions.edit.test.ts` — editar solo
    `slots` conserva lo demás; cupos = participantes → `full`; subir cupos de llena →
    `open`; `slots: 1` → 400 de cupos (no RF-8); cupos válidos bajo participantes → RF-8;
    `{}`, sin cuerpo y solo campos ignorados → 200 sin cambios; `notes: ""` y `"   "` → 200
    con `''`; `notes: null`, `title: null`, `title: ""`, `day: "3"` → 400 con su texto;
    no anfitrión → 403 (también con datos inválidos y con cupos bajo inscritos); id mal
    formado de sesión ajena → 400 (también `%zz`); id inexistente con datos inválidos →
    404; anfitrión borrado → 404; cancelar: anfitrión → 204 y no queda en la base; no
    anfitrión → 403; inexistente → 404; en cada error la base no cambia.
  - Archivos: `backend/src/services/sessionWrites.ts` (`mutateSession`);
    `backend/src/controllers/sessions.ts` (`PUT /:id` y `DELETE /:id`; la capa de
    `requireObjectBody` para `PUT /:id` ya está desde T5).
  - Hecho cuando: el archivo en verde, y `npm test` y `npm run typecheck` en verde.

- [x] **T8. Sumarse y salir.** RF-11, RF-12, RF-13, RF-14, RF-17, RF-19, RF-20 (sumarse, salir), RF-21, RF-24, DP6-38
  - Leer: spec RF-11 a RF-14, RF-17, RF-19 a RF-21, RF-24, DP6-10, DP6-38; plan
    secciones 3.5, 5 ("sumarse", "salir"), 6 (`joinSession`, `removeUserFromSessions`) y 7.
  - Antes de empezar: supuestos de T5 y T6 (`createWithUser`, `isValidId`, `decodeSegment`,
    `clock`, `signUp`, `linkAccountFor`). `POST /:id/join` y `POST /:id/leave` no pasan por
    `requireObjectBody` (RF-15); la compensación de sumarse cuando el usuario ya no existe
    responde 401 "token inválido" (DP6-39), el mismo texto que `createWithUser`.
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

- [x] **T9. Concurrencia y cascada al eliminar usuario.** RF-16, RF-18, RF-25
  - Leer: spec RF-16, RF-18, RF-25, DP6-11, DP6-12; plan secciones 6 (completa), 9
    ("Concurrencia", "Cascada"), P6-2 y P6-7.
  - Antes de empezar: **Q3 resuelta**: el usuario aprobó el paso C4 (después de C3), con el
    riesgo documentado en el plan (secciones 6 y 12: si C4 falla tras borrar al usuario, 500 y
    sesiones residuales ocultas por RF-24). `DELETE /api/users/:id`
    en `createUsersRouter` (`backend/src/controllers/users.ts`, spec 003 RF-11) existe y
    hace la cascada de la 004 en este orden (verificado el 2026-10-19): C1
    `GameAccount.deleteMany({ user })` → C2 `User.deleteOne({ _id })` dentro de `try` →
    `finally` C3 `GameAccount.deleteMany({ user })` → `clearCookie` → 204. Existen
    `userDeletion.test.ts` (003), `userDeletionCascade.test.ts` y `gameSummary.test.ts`
    (004); el segundo sustituye `GameAccount.deleteMany` y `User.deleteOne` con
    `t.mock.method` y registra el orden. Si la ruta o esa cascada faltan o siguen otro
    orden, parar y reportarlo: no implementarlas ni reordenarlas (C4 se agrega después de
    C3, sin tocar C1 a C3). Texto del 401 de las compensaciones: "token inválido" (Q1, DP6-39).
  - Tests primero: `backend/tests/controllers/sessions.concurrency.test.ts` — 10
    repeticiones de cada caso de RF-25 (último cupo: un 200 y un 409 "ya no admite";
    mismo usuario dos veces: 200 y 409 "ya inscrito"; bajar cupos vs. sumarse: nunca más
    participantes que cupos y el perdedor 400 RF-8 o 409; cancelar vs. sumarse: 204 y la
    sesión no existe, el otro 200 o 404) y la prueba determinista del reintento (plan,
    sección 9); `backend/tests/controllers/sessions.cascade.test.ts` — eliminar usuario
    borra sus sesiones organizadas y lo quita de las demás con estado recalculado
    (`full` → `open`); eliminación simultánea (`deleteMe`) a una creación y a un sumarse
    suyos → al final ninguna sesión organizada por él ni con él como participante, y la
    otra operación responde 201/200 o 401 "token inválido"; con `User.deleteOne`
    sustituido para que lance → 500, el usuario y sus sesiones intactos (C4 no corre) y
    repetir la eliminación con la misma credencial deja el estado final correcto; la
    intercalación determinista de una creación entre C2 y C4 sustituyendo
    `PlaySession.deleteMany` con `t.mock.method`, como la 004 hace con
    `GameAccount.deleteMany`. Para la prueba determinista del reintento de RF-25 se agrega
    en `helpers.ts` un solapamiento análogo a `overlapFirstFindById` para
    `PlaySession.findById` (o se sustituye `PlaySession.findById` directamente con
    `t.mock.method`).
  - Archivos: `backend/src/controllers/users.ts` (`DELETE /:id`, C4 después de C3 y antes de
    `clearCookie`: `await PlaySession.deleteMany({ host: sessionUserId })` y `await
    removeUserFromSessions(sessionUserId)`; C1 a C3 no se tocan); ajustes en
    `backend/src/services/sessionWrites.ts` si las pruebas lo exigen sin cambiar el plan (si
    exige cambiarlo, parar y reportarlo).
  - Hecho cuando: los dos archivos en verde, `userDeletion.test.ts` de la 003,
    `userDeletionCascade.test.ts` y `gameSummary.test.ts` de la 004 siguen verdes, y
    `npm test` y `npm run typecheck` en verde.

- [x] **T10. Cuerpo, barrido de 401, peticiones manuales y verificación final.** RF-1, RF-15, RF-18, RF-20, RF-23, RF-28, RNF-3, RNF-4, DP6-29, DP6-36
  - Leer: spec RF-1, RF-15, RF-18, RF-20, RF-23, RF-28, RNF-3, RNF-4, DP6-21, DP6-29,
    DP6-32, DP6-36 y "Criterios de finalización"; plan secciones 6 ("Paso del cuerpo"),
    9 ("Cuerpo", "Barrido de 401", "Fuera de las pruebas") y 11.
  - Antes de empezar: las rutas de 002 a 005 de la lista del barrido (plan, sección 9)
    existen con ese método y esa ruta en los routers reales (verificado el 2026-10-19 en
    `controllers/auth.ts`, `users.ts`, `accounts.ts` y `matches.ts`: `GET /api/auth/me`;
    `GET /api/users`, `GET|PATCH|DELETE /api/users/:id`, `GET|PUT
    /api/users/:id/availability`, `GET /api/users/:id/games/:gameId`; `GET|POST
    /api/accounts`, `GET|PUT|DELETE /api/accounts/:id`, `POST /api/accounts/:id/sync`;
    `GET /api/matches`). Si no coinciden, parar y reportarlo; no ajustar la lista por
    cuenta propia. Supuestos de T5 (textos de los tres 401; `HttpMethod`,
    `rawCookieRequest`, `signUp` y `deleteMe` de `helpers.ts`). Texto del 401 del usuario
    eliminado: "token inválido" (Q1, DP6-39); "sesión no iniciada" solo sin credencial.
  - Tests primero: `backend/tests/controllers/sessions.body.test.ts` (completo) — en las
    siete operaciones: JSON mal formado → 400 "JSON mal formado" sin credencial, con
    credencial inválida, expirada y de usuario eliminado (`signUp` + `deleteMe` +
    `rawCookieRequest`), y base sin cambios; crear y
    editar con `[]`, `3`, `"x"`, `true`, `null` → 400 "JSON mal formado" (también sin
    credencial); listar, obtener, cancelar, sumarse y salir con esos cuerpos y sin cuerpo
    → respuesta normal; crear y editar con `text/plain` → "Juego no válido." y 200 sin
    cambios; `backend/tests/controllers/protectedRoutes.test.ts` — barrido del plan,
    sección 9 (sin credencial en las rutas de 002 a 006 → 401 "sesión no iniciada"; usuario
    eliminado en las siete de la 006 → 401 "token inválido"), cada petición con
    `{}` o sin cuerpo. Sin casos de cuerpo demasiado grande, comprimido o con juego de
    caracteres no admitido (D6-1).
  - Archivos: `backend/requests/sessions.rest` (login → crear → listar → obtener →
    sumarse con otro usuario → salir → editar → cancelar, con `X-CSRF-Token`).
  - Comprobaciones: `git diff backend/package.json backend/.env.example` sin dependencias
    ni variables nuevas; búsqueda de `express`, `mongoose`, `Date.now`, `new Date()` y
    `process.env` en `src/domain/sessionRules.ts` y `sessionState.ts` sin resultados;
    cada fila de la trazabilidad del plan (sección 11) tiene su prueba en verde;
    comprobación extra, no exigida (DP6-24, Q4): `npm run lint`.
  - Hecho cuando: `npm test` y `npm run typecheck` en verde y todas las casillas de
    "Criterios de finalización" de la spec se pueden marcar (la de RF-18 con 401 "token
    inválido" para el usuario eliminado).
