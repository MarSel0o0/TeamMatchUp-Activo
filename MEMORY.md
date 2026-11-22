# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-11-22 (spec 016 implementada y validada por el `reviewer`, APROBADO; 017 y 018
aprobadas, sin plan ni tareas; ver «Próximo paso»)

Anterior: 2026-11-21 (encargo del último hito analizado; constitución enmendada con Vitest y
Playwright; specs 016, 017 y 018 aprobadas).

Anterior: 2026-11-20 (sesión nocturna: 010 recuperada y validada, prefijo `tmu_`, README de
despliegue; 013 validada en navegador; 007, 008 y 009 validadas por el `reviewer`).

## Fase actual

### Último hito (2026-11-21)
- **Encargo del profesor:** SPA de producción con estado global (Zustand o Redux, ≥ 2 stores),
  React Router (rutas públicas y protegidas, Atrás/Adelante y F5), E2E con Playwright en
  `e2etests/` (login + acceso protegido y un CRUD) con instrucciones en el README, librería de
  estilos, TS estricto sin `any`, errores JSON con códigos HTTP y secretos en `.env`; desplegada en
  fullstack.dcc.uchile.cl. Texto íntegro: apéndice A de `specs/016-estado-global/spec.md`.
- **Cumplimiento:** ya se cumplen ruteo (React Router v6; F5 en producción con la 010), TS estricto,
  errores JSON y `.env`. Faltaban estado global, E2E y librería de estilos → specs 016, 017 y 018.
  Orden de implementación aprobado: **016 → 017 → 018**.
- **Constitución enmendada por el usuario** (`docs/constitution.md`, principios 1 y 4, 2026-11-21):
  Vitest en el frontend (cuando una spec exige pruebas, también tests primero, rojo → verde) y
  Playwright para E2E en `e2etests/` (no se escriben antes que el código, pero cada una se ve
  fallar al romper a propósito lo que comprueba).
- **010:** código hecho (`uiDir`, `build`, `build:ui`, `start`; T1–T8 y T10). Falta **T9: despliegue
  real, lo hace el usuario** (avisos en «Deuda conocida»).
- **016 Estado global (Zustand):** IMPLEMENTADA Y VALIDADA (2026-11-22), T1–T10 hechas (más T9b); `reviewer`
  APROBADO RF por RF (105 pruebas). Detalle en su fila de la tabla y en `specs/016-estado-global/validation.md`.
- **017 Librería de estilos (Mantine):** spec APROBADA (2026-11-21); plan y tareas pendientes.
- **018 E2E con Playwright:** spec APROBADA (2026-11-21); plan y tareas pendientes.

Specs 001 (`001-crear-backend`), 002 (`002-autenticacion`) y 003
(`003-usuarios-y-disponibilidad`) implementadas y validadas (reviewer: APROBADO).

Spec 004 (`004-cuentas-de-juego`): implementada y validada (reviewer: APROBADO, 2026-10-19,
tras 2 vueltas). La spec se reescribió en el commit `685e4af`, posterior a su implementación
histórica (`3027c53`, `c98b84d`); el usuario decidió rehacer el código y el rework (T10–T25,
sobre las T1–T9 históricas) está hecho. La 1ª validación dio CAMBIOS NECESARIOS por 2
bloqueantes solo de pruebas (B1: ejemplos de validación de RF-6/DP-19; B2: literales de
normalización de DP-26/RF-48), corregidos solo en tests; la 2ª dio APROBADO. `spec.md` pasa
a «implementada» (la marca planner). Rework commiteado en `9b5cc87` (sin push; incluye la
migración mínima de `matches.ts`, cambio A de la 005). No se dividió la spec. El usuario
confirmó (2026-10-19) que su aprobación del 2026-10-18 cubría DP-19, DP-34, DP-35 y DP-38 a
DP-41.

Spec 005 (`005-coincidencias`): implementada (T1–T10) y validada (reviewer: APROBADO,
2026-10-19). T1–T8 están en el commit `31fdda2` (sin push). Los cambios de requisito A
(DP5-16, T9: 401 «token inválido» con la credencial de un usuario eliminado, también en la
carrera `noSession`; RF-13) y B (DP5-17, T10: textos propios en minúscula inicial y sin
punto final) están implementados y validados. Commits locales (sin push): `9b5cc87` «feat:
rework de la spec 004 (cascada ordenada, token inválido, sin User.accounts)» (incluye el
cambio A) y `88af4cd` «fix: textos de coincidencias en minúscula y sin punto final (spec
005)» (cambio B). `spec.md` «implementada».

Suite del backend: son 2276 tests en verde (2026-10-19, con la 006 y con T26 y T11; 2235 era la
cifra de la 006 sin ellas, y 1567/1567 la del cierre de 004/005, en ambos commits, con
typecheck y lint en verde). El usuario repitió `npm test` sin
conexión a Internet en ese cierre (RNF-1/RNF-9: 1567/1567, 0 fallos, 220 suites, ~100 s;
2026-10-19). El test se llama `backend/tests/unit/withUser.test.ts` (renombrado).
Los commits `9b5cc87` y `88af4cd` dejaron el árbol limpio. Después se commitearon la 006
(`007ded0`, `3834d36`), la laguna de RF-16 (`cf09bfb`) y las specs 004 y 005 con T26 y T11
(`8ffb863`); el cierre de T26 y T11 va en los dos commits siguientes (sin push).

Cambio DP6-37 en las specs 004 y 005: HECHO (2026-10-19). El paso del cuerpo antes del 401
(400 «JSON mal formado», 413, 415) ya está documentado y aprobado como DP-43 (004, RF-29) y
DP5-18 (005, RF-16). T26 (004) y T11 (005) están hechas y validadas por el reviewer: solo
pruebas, sin cambios de código de producción (P1/P2 = documentar lo actual; el servidor ya
lo hacía). La diferencia con el intérprete de cuerpo no estricto de `/api/sessions` es
intencionada.

Spec 006 (`006-agenda`): implementada (T1–T10 todas [x]) y validada (reviewer APROBADO,
2026-10-19): 2235 tests en verde, typecheck y lint sin errores, RF-1 a RF-28 y RNF-1 a RNF-4
cumplen, criterios de finalización satisfechos. Antes hubo el cambio de requisitos del
2026-10-19 (Q1–Q4, DP6-39). `spec.md` «implementada»; `plan.md` y `tasks.md` «aprobado …;
implementado». Commiteada en `007ded0` y `3834d36` (sin push). La 007 se implementó a continuación (ver el párrafo siguiente).

Spec 007 (`007-integrar-frontend`): implementada (T1–T31 todas [x], 2026-10-19). Se hizo con
agentes `implementer` en paralelo y se verificó con un recorrido manual reproducible (T29, dividido
en 5.A «Sesión y conexión» y 5.B «Datos, presentación y proponer sesión» de `validation.md`) y la
comparación de capturas (T28). El recorrido halló dos defectos, ambos corregidos en la T31 (tarea
añadida): D-A2 (RF-7 y RF-8: con la sesión muerta, ir dentro de la app a Agenda o Coincidencias
perdía el aviso de expiración y la ruta de origen; causa: las consultas montadas se relanzaban
antes de pasar a `anonymous`; arreglo: `flushSync` en `clearClientSession`) y D-A1 (RF-20: doble
clic sintético en registro y login enviaba dos `POST`; arreglo: guarda con `useRef`). `typecheck`,
`lint` y `build` del frontend en verde; `backend/` no se tocó. NO está commiteada. Falta la
validación del `reviewer` (`/sdd-validate 007-integrar-frontend`) y decidir lo pendiente de
«Deuda conocida — spec 007». `spec.md`, `plan.md` y `tasks.md` pasan a «implementada».

Orden global de implementación: 005 T9 → 004 T11…T25 → 005 T10 (hechas, validadas y
commiteadas) → 006 (cambio de requisitos y T1–T10), todo hecho y validado → 007 (T1–T31, hecha) → 008, 009,
010 (local), 012–015 (ver la tabla) → siguiente (2026-11-21): 016 → 017 → 018.

## Spec 008 — ficha de jugador (estado 2026-10-20)
- Estado: T1–T11 hechas y en verde (typecheck, lint, build; comprobaciones con Node y con
  Chrome headless). NO "implementada": faltan la validación del reviewer RF por RF (Fase 5),
  NVDA (RNF-2, manual; pasos en validation.md 4.8; en Mac se podría usar VoiceOver) y D10-1/D10-2.
- Decisiones: cambio A (P50–P62) y cambio B (P65: excepción WCAG de RNF-5 para controles
  deshabilitados; P66: textos de interfaz en copy.ts) aprobados. Ajustes P63 (6 consultas,
  claves 'them'/'own'), P64 (usePlayerTab solo actúa dentro de /jugadores, por el
  AnimatePresence de AppLayout) y P67 (portada CrossingVisual en T11). Preguntas 1–13
  respondidas. P5: las dos vistas nuevas del Hito 2 son la ficha (008) y el detalle de sesión (009).
- Abiertos fuera de la 008 (cambio aparte para toda la app, P60): D10-1 (contraste, tema claro)
  y D10-2 (tema oscuro) en componentes de la 007 (AccountRow, RankScale, tabla de partidas).
- Hallazgos previos: `npm run typecheck` no comprueba tipos (tsconfig "files": []), usar
  `npm run build`; /perfil, /coincidencias y la portada desbordan a 360 px.
- Siguiente paso: el reviewer valida specs/008-ficha-de-jugador/spec.md RF por RF con
  validation.md; después, el cierre. Los scripts (gancho de Node, CDP) están en validation.md.
- Base de validación `teammatchup_val008` en MongoDB local (se puede borrar).

## Estado del código

- Frontend (spec 007, hecha): habla con el servidor real por defecto (`VITE_API_URL=/api`); el
  modo simulado solo con `VITE_USE_MOCK_API=true` (exactamente `true`; `mockFlag.ts`). Sesión en
  la cookie HttpOnly; la interfaz guarda solo el comprobante `tmu.csrf` (`csrfStorage.ts`) y una
  señal entre pestañas (`tmu.session-signal`, `crossTabSession.ts`); no guarda JWT. Transporte
  único con plazo de 30 s, época de sesión y clasificación de errores (`services/http/transport.ts`,
  compartido por el cliente HTTP y el simulado). `AuthProvider` con estados `checking`,
  `authenticated`, `anonymous` y `error` (`SessionGate`, «Cargando…», pantalla de error con
  «Reintentar»). TanStack Query sin reintentos, claves por usuario (`['u', userId, …]`). Textos
  fijos en `shared/utils/copy.ts`; etiqueta «Datos de demostración» (`DemoTag`) siempre visible.
  «Proponer» desde coincidencias abre la agenda con la propuesta (`domain/proposal.ts`). Dominio de
  la interfaz con la misma escala y puntaje que el servidor (`domain/rankScale.ts`, `matching.ts`;
  paridad comprobada en T27). Modo simulado: `mockApi.ts` responde como el servidor, con
  `simulatedProvider.ts` (mismo algoritmo que `backend/src/domain/rankSimulator.ts`) y datos ficticios en
  `seed.ts` (16 jugadores, 25 cuentas, base `tmu.mock-db.v4` desde la spec 012, cuenta `demo@teammatchup.gg`).
  Lo probado de la 007 vive en `specs/007-integrar-frontend/validation.md` y `validation/{baseline,after}/`.
  **Desde la spec 016 (2026-11-22):** estado global con Zustand 5.0.16 (exacta) en dos almacenes:
  sesión iniciada (`features/auth/createAuthStore.ts` + `authStore.ts`; `useAuth()` es fachada;
  `AuthProvider` y `AuthContext` ya no existen) y agenda (`features/sessions/createAgendaStore.ts`
  + `agendaStore.ts` + `agendaResponses.ts`, con las reglas de `domain/agendaRules.ts`);
  `app/StoreBridge.tsx` los conecta con el router, el aviso de 401 y la caché de TanStack Query;
  devtools solo en desarrollo. Vitest 3.2.4 (exacta, entorno node; `npm test`, 105 pruebas; no hay
  `jsdom`: las páginas no se prueban en Node). `SchedulePage` usa una copia local del borrador con
  `useIsPresent` durante la animación de salida (D-016-2) y `fetchStatus !== 'idle'` para el error
  retenido (D-016-3). D-016-1: `enter` va dentro de `flushSync`.
- Backend (`backend/`): servidor base de la spec 001. Express 5.1.0 + Mongoose 8.24.5 +
  dotenv 17.2.3, TypeScript ejecutado directo con Node ≥ 22.18, ESM.
  - Configuración validada al arrancar (`src/utils/config.ts`): `NODE_ENV` obligatoria y
    exacta (`development` | `test` | `production`), `PORT`, `MONGODB_URI`/`MONGODB_DBNAME`
    (desarrollo y producción), `TEST_MONGODB_URI`/`TEST_MONGODB_DBNAME` (prueba), `HOST`
    opcional. El entorno del proceso prevalece sobre `.env`.
  - Arranque (`src/server.ts`, `src/index.ts`): validar → conectar (timeout 10 s) → escuchar.
  - Errores siempre `{ error: string }` en JSON: 400 «JSON mal formado», 404 «endpoint
    desconocido», 413 «cuerpo demasiado grande» (límite 102 400 bytes), 415 «codificación
    no soportada», 500 «error interno del servidor» (detalle solo en el registro).
  - Autenticación de la spec 002: registro, inicio y cierre de sesión y `/me`. JWT en
    cookie `HttpOnly` (credencial de 1 h) más comprobante CSRF en la cabecera
    `X-CSRF-Token`. `JWT_SECRET` obligatoria en los tres entornos.
  - Dependencias añadidas en la 002 (versión exacta): bcrypt 6.0.0, jsonwebtoken 9.0.2 y
    cookie-parser 1.4.7, con @types/bcrypt 6.0.0, @types/jsonwebtoken 9.0.10 y
    @types/cookie-parser 1.4.9.
  - Usuarios y disponibilidad de la spec 003 (todas protegidas, `:id` = 24 hexadecimales
    o `me`): `GET /api/users`, `GET|PATCH|DELETE /api/users/:id` y
    `GET|PUT /api/users/:id/availability`. Disponibilidad dentro del documento del usuario
    (`availability: [String]`, bloques `d-h`). Servicios nuevos sin Express en
    `src/services/`: `userTarget.ts`, `profile.ts`, `availability.ts`, `timezones.ts` y
    `zoneTab.ts`. Prueba manual en `requests/users.rest`. Sin dependencias nuevas.
  - Cuentas de juego de la spec 004 (todas con sesión y `X-CSRF-Token`):
    `GET|POST /api/accounts`, `GET|PUT|DELETE /api/accounts/:id`,
    `POST /api/accounts/:id/sync` y el resumen `GET /api/users/:id/games/:gameId`. Rango,
    partidas y marca de verificada los genera un proveedor simulado y determinista
    (`src/domain/rankSimulator.ts`, `src/services/rankProvider.ts`), sin red ni claves;
    toda cuenta sale con `"simulated": true` y sin partidas ni número de lectura. Dominio
    puro en `src/domain/` (`games`, `rankScale`, `rankSimulator`, `accountRules`,
    `accountState`, `userId`), aislado de `services/`, `utils/`, `models/` y
    `controllers/` (lo vigila `tests/unit/domainIsolation.test.ts`). Modelo
    `GameAccount`; reloj mutable `src/utils/clock.ts`. Rework de la 004 (T10–T25, fin
    2026-10-19): el usuario NO guarda lista de cuentas (`User.accounts`, `$addToSet` y
    `$pull` retirados, RF-46; las cuentas de un usuario son las que lo tienen como dueño);
    vincular compensa si falla y desvincular es un único `deleteOne`;
    `createWithExistingUser` y `missingUserError` retirados (`createWithUser` responde siempre
    401 «token inválido» a la credencial de un usuario eliminado en 002–005, RF-44, DP-37);
    la eliminación del usuario es una cascada ordenada C1 (borrar sus cuentas) → C2 (borrar
    el usuario) → C3 (barrido de cuentas sin dueño), con la cookie borrada solo si terminan
    las tres (RF-14, DP-42); listar y obtener nunca muestran cuentas sin dueño
    (`src/services/accountReads.ts`); los textos de error de la 004 van en minúscula y sin
    punto final (DP-6); la región se compara con plegado solo ASCII (DP-35); bandas de puntos
    cerradas (DP-34). Archivos nuevos: `src/services/accountReads.ts`,
    `tests/controllers/userDeletionCascade.test.ts` y
    `tests/controllers/accountConcurrency.test.ts` (solapamiento determinista de RF-39 y
    ramas de RF-47). Prueba manual en `requests/accounts.rest` (recorrido de la T25 comprobado
    con curl contra un servidor de desarrollo en una base temporal, ya borrada). Sin
    dependencias ni variables de entorno nuevas.
  - Coincidencias de la spec 005: `GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=`
    (sesión y `X-CSRF-Token`; 401 «token inválido» si el usuario ya no existe, también en la
    carrera `noSession`, DP5-16, T9 hecha). Sus textos de error propios van en minúscula
    inicial y sin punto final (DP5-17, T10 hecha): `juego no válido`, `no tienes una cuenta
    vinculada en este juego` y `filtro «<rótulo>» no válido…`; los rótulos entre « » conservan
    la mayúscula, y los 401 no cambian. Los tests comparan por literal, no con `MATCH_ERRORS`.
    Reglas puras sin Express, Mongoose ni reloj en `src/domain/` (`matchQuery.ts`,
    `availability.ts`, `matching.ts`): lectura estricta de filtros, bloques en común
    ordenados, distancia sobre el rango normalizado de la 004 y puntaje en enteros exactos.
    Lectura de datos en `src/services/matchInputs.ts` y ruta en `src/controllers/matches.ts`.
    El candidato lleva el usuario sin correo, `gameId`, la cuenta con `simulated: true`,
    `rankDistance`, `sharedBlocks` y `score`. Prueba manual en `requests/matches.rest`
    (recorrido comprobado con curl contra un servidor de desarrollo en una base temporal, ya
    borrada). Sin dependencias ni variables de entorno nuevas.
  - Agenda de la spec 006 (sesión y `X-CSRF-Token`): `GET /api/sessions` (filtro `game`),
    `GET|PUT|DELETE /api/sessions/:id`, `POST /api/sessions`, `POST /api/sessions/:id/join` y
    `POST /api/sessions/:id/leave`. Archivos nuevos: `src/models/playSession.ts`,
    `src/domain/sessionRules.ts` y `sessionState.ts` (dominio puro),
    `src/services/sessionReads.ts` y `sessionWrites.ts` (`createSession`, `mutateSession`,
    `cancelSession`, `joinSession`, `removeUserFromSessions`), `src/controllers/sessions.ts` y
    `requireObjectBody` en `src/utils/middleware.ts`. Prueba manual en
    `requests/sessions.rest`. Sin dependencias ni variables de entorno nuevas.
  - 2276 tests con node:test + supertest (2026-10-19, con la 006 y con T26 y T11; en serie, contra la base de
    prueba; `npm test` tarda ~6 min (368 s medidos con 2219 tests el 2026-10-19)); typecheck y lint (ESLint) en verde;
    `npm audit` sin vulnerabilidades (revisado al cerrar la 004, antes del rework; sin
    dependencias nuevas desde entonces). Los tests de controlador montan el servidor en
    `127.0.0.1` (`listenOnLoopback`, T8b). Las cifras 1427, 1562 y 1567 eran de cierres
    anteriores.
  - Verificación de League of Legends con Riot Games de la spec 014 (T1–T12 hechas, 2026-11-19):
    `RIOT_API_KEY` opcional en `src/utils/config.ts` (comentada en `.env.example`, sin `PUBLIC_URL`,
    renovación manual cada 24 h documentada en `README.md`). Dominio puro en `src/domain/`
    (`riotRules.ts`, `riotChallenge.ts`, `riotRateLimiter.ts`, `riotData.ts`, `riotLpDelta.ts`, más
    soporte de `currentRank: null` y `rankDelta?: number` en `accountState.ts` y `matching.ts`).
    Modelo `RiotChallenge` (`src/models/riotChallenge.ts`, TTL 24 h tras cierre/anulación/vencimiento)
    y campos internos en `GameAccount` (`pendingBlocks`, `lastSuccessfulSyncAt`, `riotLpBaseline`).
    Cascada C6 en `DELETE /api/users/:id`. Servicios: `riotChallenges.ts`, `riotClient.ts` (única
    pieza con red y `X-Riot-Token`, `fetchFn` inyectable, timeout 8 s), `riotLimiter.ts` (ventanas
    deslizantes 20/s y 100/2 min, reservas 2/24/24 y liberación), `riotUserLock.ts` (lock en memoria)
    y `riotSync.ts` (lectura y resincronización parcial RF-53). Rutas `/api/riot` (`GET /`,
    `GET /challenges/current`, `POST /challenges`, `POST /challenges/:id/confirm`), integradas con
    `/api/accounts` (RF-29/RF-51/RF-53), `/api/users/:id/games/:gameId` y `/api/matches` (409 RF-33/
    RF-44). Prueba manual en `requests/riot.rest`. Frontend: `domain/riotDisplay.ts`,
    `services/ddragon.ts`, timeout opcional de 65 s en `transport.ts`/`httpClient.ts`, contrato
    `api.riot` (`mockApi.riot` nunca simula), ruta `/verificar/riot` (`features/riot/`) y bloque de
    datos reales de Riot en Perfil, Configuración, Ficha de jugador y Coincidencias. Sin dependencias
    nuevas (RNF-5). Al cerrar T12 (2026-11-19): 82 archivos de prueba del backend en verde con 0
    fallos (217/217 nuevos de Riot en 13 archivos + 249/249 en 7 archivos modificados/clave; 2,786
    pruebas totales en esos 82 archivos; salvedades de entorno ya conocidas: `ui.test.ts` de la 010
    con 8/16 fallos y `process.test.ts` con 26/26 fallos por `NODE_OPTIONS` bajo Node `v22.14.0`),
    `tsc --noEmit` (`src/`) y `npm run lint` del backend en verde (`tsc -p tests` solo falla en el
    preexistente `ui.test.ts`), y `typecheck`, `lint` y `build` del frontend en verde. Corrección
    de la validación (2026-11-19): `features/riot/pages/RiotVerifyPage.tsx` guarda el desafío
    confirmado (`confirmedChallenge`) para que la redirección de RF-6 no reemplace la navegación
    a `/perfil` durante la animación de salida y no borre el aviso de RF-7/RF-27
    (`state.riotNotice`). Validada por `reviewer` y con recorrido real de LoL
    (`specs/014-verificacion-riot/validation.md`); suite del backend 2963/2971 (solo los 8 de
    `ui.test.ts`).

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas. Cambios aprobados durante la implementación: mongoose 8.19.1 → 8.24.5 (vulnerabilidad alta) y regla RFC para `HOST` (la última etiqueta no puede ser solo numérica). |
| `002-autenticacion` | Implementada y validada | 28 RF y 7 RNF cumplidos; decisiones P1–P9 abajo. |
| `003-usuarios-y-disponibilidad` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas; `spec.md` en «implementada». `requests/users.rest` probado a mano contra el servidor: todos los códigos coinciden. `AGENTS.md` actualizado. |
| `004-cuentas-de-juego` | Implementada y validada (reviewer APROBADO tras 2 vueltas, 2026-10-19) | Rework terminado: T1–T9 históricas (con T3b y T8b) y T10–T25 hechas; 1567 tests, typecheck y lint en verde. 1ª vuelta: CAMBIOS NECESARIOS por 2 bloqueantes solo de pruebas (B1 ejemplos de RF-6/DP-19, B2 literales de DP-26/RF-48), corregidos en tests; 2ª: APROBADO. T13 (lectura literal fija del simulador) es una excepción deliberada a P-13. Riesgo R3 vigente. `spec.md` pasa a «implementada» (la marca planner). Hecho en el cierre: prueba sin red tras el rework (1567/1567, usuario, 2026-10-19) y renombrado a `withUser.test.ts`. Pendiente de la 007: etiqueta visible de datos simulados (RF-37; la 007 ya la cubre: RF-11, RF-22, R19). Rework commiteado en `9b5cc87` (sin push). El usuario confirmó (2026-10-19) que su aprobación del 2026-10-18 cubría DP-19, DP-34, DP-35 y DP-38 a DP-41. |
| `005-coincidencias` | Implementada y validada (reviewer APROBADO, 2026-10-19) | T1–T10 hechas (T1–T8 en el commit `31fdda2`, sin push). Cambio A (T9): 401 «token inválido» con la credencial de un usuario eliminado, incluida la carrera `noSession`. Cambio B (T10): textos propios en minúscula inicial y sin punto final (DP5-17). 1567 tests, typecheck y lint en verde; cambio A en `9b5cc87` y cambio B en `88af4cd` (sin push). `spec.md` «implementada». Riesgo A1 vigente. Pendiente además la casilla de la spec 007: etiqueta de datos simulados con el servidor real. |
| `006-agenda` | Implementada y validada (reviewer APROBADO, 2026-10-19) | Spec aprobada el 2026-10-18 con el cambio del 2026-10-19 (Q1–Q4, DP6-39); plan y tareas ajustados al código real. T1–T10 hechas; 2235 tests al validarla (2276 con T26 y T11 de las 004 y 005), typecheck y lint en verde; RF-1 a RF-28 y RNF-1 a RNF-4 cumplen. `spec.md` «implementada». Commiteada (`007ded0`, `3834d36`; RF-16 con DP6-40 en `cf09bfb`; sin push). Pendientes fuera de la 006 en «Deuda conocida». |
| `007-integrar-frontend` | Implementada y validada (`reviewer` APROBADO, 2026-11-20, contra el código actual; `validation.md` §7). D1 y D3 cerrados. Decisiones del usuario cerradas el 2026-11-20: RF-20 → R23 (la spec admite 65 s para resincronizar y Riot; sin código), O1 y O2 → R24 (aceptadas) | Interfaz conectada al servidor real (cookie HttpOnly + comprobante CSRF, plazo de 30 s, aviso entre pestañas, «Proponer»), con modo simulado alineado a 004–006 y datos ficticios. Recorrido manual T29 (5.A y 5.B) y capturas T28 en `validation.md`; defectos D-A2 y D-A1 corregidos en la T31. Excepción aprobada al RF-16: el simulado reproduce el literal «rango verificado» del servidor y la interfaz nunca lo muestra. Sin decisiones abiertas. Commiteada. |
| `008-ficha-de-jugador` | Implementada y validada (`reviewer` APROBADO, 2026-11-20; `validation.md` §6). D10-1 y D10-2 cerrados en `2ec44a4` (tokens de estado, `--ink-3`, `--placeholder`, iniciales del avatar con `color-mix`); C10-1 resuelto por el cambio B. Pendiente solo NVDA (usuario) | Precondición cumplida: la 007 está implementada (T1–T31). Los enlaces de RF-2 son su T9. |
| `009-detalle-de-sesion` | Implementada y validada (`reviewer` APROBADO, 2026-11-20; C4 resuelta por el cambio VC4, aprobado el 2026-11-20: excepción de contraste de RNF-5 para botones deshabilitados y bloqueados, como el P65 de la 008, sin código). Contraste corregido en `ecf12d2` y `7852a67` (hover de variantes de botón con `:where()`, marca de juego, `--danger` claro `#a83025`). Pendiente del usuario: solo NVDA | 18 tareas (T0–T17), sin dividir la spec por decisión de la usuaria. T0 exige plan de la 007 aprobado, 007 hecha (cumplido) y la tarea de enlaces de la 008 hecha (pendiente). La validación de reviewer espera a que estén implementadas la 006, la 007 y la 008. No cambia el backend. |
| `010-despliegue` | Aprobada; implementación local validada por el `reviewer` (2026-11-20, tras 1 vuelta de correcciones de documentación). Commits: `6307b9a` (T2, T3: sirve `backend/dist` en producción; código 1 sin `index.html`), `fbb3314` (T10: prefijo `tmu_` fijo en las 5 colecciones, traído de `origin/deploy`; en el servidor no hay permiso para una base propia, código 13), `f63fd37` (T4–T8: README raíz con producción y despliegue en `~/reactivoActivo` / PM2 `reactivoActivo-7041`, `.env.example`, `frontend/README.md`, recorrido local), `f844a4d` (spec al día; HU-4 y RF-10 se mantienen por la 014). Pendiente solo T9 (despliegue real, lo hace el usuario) y que un compañero siga el README. `origin/deploy` tiene otra implementación de la 010 (`frontendDir`): no se fusiona; lo útil ya se trajo. Avisos para T9 (2026-11-21): según `origin/deploy` el servidor tiene Node 20 (el plan pide ≥ 22; lo compilado debería correr con aviso `EBADENGINE`, ver `validation.md` R-1); confirmar con el equipo qué colecciones `tmu_*` tienen datos en `fullstack`. | Sirve la interfaz desde el servidor (rutas fuera de `/api`) y documenta el despliegue. |
| `012-origen-real-de-datos` | Implementada y validada (2026-11-18). T1–T11 hechas y commiteadas (`0ba0f99` T8–T10, `ad58178` T11). 1ª validación (2026-11-18): dos puntos (RF-6 identidad sin etiqueta; RF-14 sin prueba del endpoint), cerrados con la T11. 2ª validación (2026-11-18, Opus): cumplida; 706 tests de la 012 y suite completa 2379/2379 en verde, typecheck y lint del backend y build, typecheck y lint del frontend sin errores; interfaz por Chrome headless (CDP) a 1280 y 375 px con verificación escrita directo en una base temporal (no hay rutas de verificación hasta la 013/014). Observaciones sin bloquear: la aclaración de RF-6 es una línea sin número en `spec.md`; el bloque de perfil (avatar, nivel, horas) no se muestra en ninguna parte (para la 013) | Base común: cuenta verificada solo por verificación real (revoca RF-41 de la 004 y la decisión «Todo simulado» del 2026-10-17), origen por bloque de datos, exclusividad (primera verificación gana y desvincula las no verificadas de otros), resincronización bajo demanda con espera de 5 min, 503 si la fuente cae. Propone texto para el principio 5 de la constitución. Dudas D1–D3 cerradas el 2026-11-04 (visible para todos, «1 minuto», filtro «Solo cuentas verificadas»). Rama `feature/vinculacion-steam-riot`. |
| `013-vinculacion-steam` | Implementada; validada en el navegador con un Steam falso (`reviewer` APROBADO, 2026-11-20, tras corregir el desborde del perfil a 375 px en `5fb89c7`). RF-7 corregido en `c7afc2f` y `91511b1`. T9 y T10 cerradas; T11 abierta hasta el recorrido con Steam real (usuario) | Verificar CS2 con el inicio de sesión de Steam; perfil y horas reales; rango CS2 sigue simulado. Depende de la 012. Clarificación del 2026-11-18: 29 hallazgos resueltos como D3–D12 y RF-18 a RF-26. Bloqueante resuelto con D3: la vuelta de Steam llega a una página de la app, que completa la verificación con la sesión y el comprobante anti-CSRF del usuario (la cookie `SameSite=Strict` no viaja en la navegación desde Steam); sin cambiar la spec 002. Absorbe los tres pendientes de la validación de la 012: aviso global solo en modo simulado (RF-24), texto de «Resincronizar» (RF-25) y bloque de perfil visible con «Datos de Steam» (RF-15). Sin clave de Steam no se ofrece verificar (D4, revoca el RNF-2 anterior). Sin dependencias nuevas (RNF-5). Los ajustes a las specs 002, 007 y 012 quedan en su sección «Impacto», sin editar esos archivos. **Plan redactado el 2026-11-18** (`plan.md`, borrador pendiente de aprobación): OpenID 2.0 de Steam con intento en MongoDB (TTL, hash del token, uno por usuario), `POST /api/steam/{start,complete}` y `GET /api/steam`, página de vuelta fuera de las rutas protegidas (RF-7), `STEAM_API_KEY` y `PUBLIC_URL` opcionales, `syncCooldown(null)` para RF-12; 11 tareas previstas. Observaciones O-1 a O-4 por confirmar (región de la cuenta nueva, texto «sin perfil», texto del rechazo de RF-3, 11 tareas). Plan aprobado el 2026-11-18 (O-1 a O-4 con los valores por defecto). **Tareas aprobadas el 2026-11-18** (`tasks.md`, T1 a T11). **T1 hecha** (`Config.steam`, `STEAM_API_KEY` y `PUBLIC_URL` opcionales y comentadas en `.env.example`; sin commitear). Salvedad: `tests/controllers/ui.test.ts` (spec 010) falla porque `uiDir` no está en `app.ts` de esta rama. **T2 hecha** (dominio puro: `steamAttempt`, `steamOpenId`, `steamProfile`, `steamRules` y `syncCooldown(null)`; 71 pruebas nuevas, sin commitear). **T1 a T7 hechas; backend de la 013 cerrado** (`/api/steam` con `GET /`, `POST /start` y `POST /complete`; cliente de Steam con `fetch` inyectable; `AppOptions.steamIntegration`; espera sin perfil; suite 2592/2600, los 8 fallos son de `ui.test.ts` de la spec 010; sin commitear). Detalle T3: modelo `SteamAttempt` con índice único por usuario y TTL, servicio `steamAttempts`, `SteamAttempt.init()` en `prepareDatabase` y C5 en la cascada; 28 pruebas nuevas, sin commitear). **T8 hecha.** T9 a T11 con el código y la documentación hechos (página de vuelta, botón, bloque de datos de Steam, aviso global solo en modo simulado; `typecheck`, `lint` y `build` del frontend sin errores) pero **sin verificar en un navegador ni con la cuenta real de Steam**: casillas abiertas, pendientes en `specs/013-vinculacion-steam/validation.md`. Siguiente: recorridos manuales del equipo (necesitan `STEAM_API_KEY` y `PUBLIC_URL`) y cerrar T9 a T11. |
| `014-verificacion-riot` | Implementada y validada (2026-11-19): `reviewer` APROBADO tras 1 vuelta de corrección (aviso de RF-7/RF-27 en `/perfil`, corregido en `RiotVerifyPage.tsx`); recorrido real con cuenta de LoL OK (pasos 0–9 de `validation.md` §3) | Verificar LoL con ícono de inicio (0–28, distinto del actual, 10 min, máx. 10 confirmaciones); rango Solo/Dúo, partidas y perfil reales. Development key aceptada por el equipo pese a los términos de Riot. Depende de la 012. Spec aprobada el 2026-11-18 (D1–D104); plan y tareas (T1–T12) aprobados el 2026-11-19. **T1–T8 (backend) y T9–T12 (frontend, docs y cierre) hechas** (sin commitear): 82 archivos de prueba del backend en verde sin red ni clave real (0 fallos; 217/217 nuevos de Riot + 249/249 modificados/clave; ~2,786 pruebas; salvedades preexistentes/entorno: `ui.test.ts` de la 010 y `process.test.ts` bajo Node `v22.14.0`), `tsc --noEmit` (`src/`) y `lint` del backend en verde, y `typecheck`, `lint` y `build` del frontend en verde; auditoría estática limpia (sin dependencias nuevas, sin fugas de clave, sin `.only`/`any`). `README.md`, `AGENTS.md`, `PRODUCT.md` y `specs/014-verificacion-riot/validation.md` actualizados. `spec.md` en «implementada (2026-11-19)» con todas las casillas marcadas; suite del backend 2963/2971 (solo los 8 de `ui.test.ts`). Opcionales en «Deuda conocida — spec 014». |
| `015-rango-premier` | Spec aprobada (2026-11-18); revisión tras la clarificación aprobada por el usuario (2026-11-19). Plan aprobado (2026-11-19). Tareas T1–T10 aprobadas (2026-11-19); cambio de requisitos D26–D30 y T11–T16 aprobadas (2026-11-19); T1–T16 hechas (2026-11-19, sin commitear): backend con la suite completa en verde salvo los 8 fallos conocidos de `ui.test.ts`; frontend con typecheck, lint y build en verde; T16 documentos, `leetify.rest` y comprobación (ver «Spec 015 (implementación T11–T16)»). Términos de Leetify leídos: la pauta de métricas no se cumplía; cambio D31–D32 (sin escala ni distancia con rangos de Leetify; RF-5 y RF-12 modificados, RF-25 nuevo), plan §13 y T17–T20 aprobados y hechos (2026-11-19, solo frontend). Validación del `reviewer` con navegador: CAMBIOS NECESARIOS (etiqueta del anillo de afinidad); cambio D33–D34 (RF-26, logo a 24 px), T21–T22 hechos y **validación APROBADA** (2026-11-19). **Implementada (2026-11-19).** **Pendiente (pospuesto por el usuario):** los dos recorridos manuales con cuentas reales; ver «Próximo paso» y `specs/015-rango-premier/validation.md` §2.2. | Rango Premier real de CS2 verificadas desde la API pública de Leetify. RF-1 a RF-26, RNF-1 a RNF-8. Clarificación: 31 hallazgos resueltos como D6–D25 (más D1–D5 de la entrevista); sin dudas abiertas. Claves: principio 5 de la constitución ampliado (terceros nombrados por una spec, atribuidos a quien entrega; aplicado en docs/constitution.md); tener rango = rating entero 1–99999 (0/vacío/sin perfil = «sin rango Premier», excepción a RF-21 de la 012); respuesta inválida o rechazo = fallo; «rango no disponible» = bloque de origen Leetify vacío; fuera de coincidencias sin rango (mensaje en Coincidencias CS2); resync: Steam primero, Leetify solo si Steam responde, máx. 16 s, 200 con indicador si Leetify falla (excepción a RF-19 de la 012), espera corre; concurrentes: solo una, la otra 429; historial: punto por cada cambio de rating; migración al arrancar: verificadas con rango simulado → «rango no disponible»; aviso junto a «Verificar con Steam»; «Datos de Leetify» enlaza al perfil en Leetify; clave opcional. Las excepciones a otras specs son RF propios (no se editan las otras specs). Depende de la 013. |
| `016-estado-global` | **Implementada y validada (2026-11-22; `reviewer` APROBADO RF por RF, 105 pruebas; RF-21, RF-22, RNF-6, T4, T6 y T7 declarados por el usuario; T8, T9 y T9b automatizados, no reproducidos por el reviewer)**. Spec APROBADA (2026-11-21) con CR-1 (origen 017 Q8); `plan.md` y `tasks.md` aprobados. T1–T10 y T9b hechas, 105 pruebas en verde, typecheck, lint y build en verde, backend intacto. Defectos del recorrido D-016-1 (login con ruta de origen), D-016-2 (formulario al salir) y D-016-3 (error retenido con «Sin conexión») corregidos y cerrados; O-016-1 (solape de ~500 ms entre las dos ventanas) aceptada por el usuario. RF-21, RF-22 y RNF-6 con la extensión real en Firefox: declarado por el usuario (2026-11-22). `graphify update .` no se pudo correr (no instalado) | Dos almacenes Zustand: **sesión iniciada** (reemplaza `AuthProvider`; `useAuth()` queda como fachada) y **agenda** (solo estado de interfaz; TanStack Query sigue como caché del servidor). Vitest con entorno node; devtools solo en desarrollo. Decisiones: D1 la agenda conserva filtro y sesión abierta al volver (sustituye 009 R7); D2 «Proponer» por el almacén; D3 Vitest; D4 devtools solo en desarrollo; D5 al aplicar una propuesta el filtro pasa a «Todos los juegos»; D6 la sesión creada queda abierta; D7/D10 sesión «por confirmar»: decide la primera respuesta correcta del servidor; I-1 fallos de red o de plazo = error; I-2 «lista que se ve» = datos en memoria; Q1 no se cambia el montaje del router; CR-1 nunca dos ventanas: la propuesta espera a que se cierre la abierta («esperar y reabrir»). Plan: P1 retener el error durante «Reintentar»; P2 campo `visit` en el almacén; P3 corregir en T10 la referencia de `AGENTS.md` a `HITO2.md`. Versiones propuestas `zustand@5.0.16` y `vitest@3.2.4` (Vitest 4 no admite Vite 5): T1 las comprueba con `npm view` antes de instalar. Comportamiento de RF-27 comprobado en TanStack Query 5.102.8 (riesgo R5 del plan). |
| `017-libreria-de-estilos` | Spec APROBADA (2026-11-21); plan y tareas pendientes. Se implementa después de la 016 | Mantine **8.3.x** (la 9.x exige React 19) + `@mantine/hooks` explícito. Componentes base con tema desde los tokens; mismo aspecto (caja dibujada ±2 px). Decisiones: Q1 «Anotar una sesión» como modal estándar con foco dentro (sustituye 009 R10); Q2 «Solo cuentas verificadas» como interruptor; Q3 pestañas con el patrón de la ficha en las tres vistas; Q4 desvincular cuenta en ventana de Mantine (no la recomendada); Q5/Q7 un único tono de foco ≥ 3:1 en el tema claro en toda la página; Q6 Vitest solo para reglas puras; H1 colores sueltos → tokens nuevos con los mismos valores; H2 campos con borde y halo reforzados; H3 el panel de pestañas es parada de Tab; H6 `DemoTag`/`OriginTag` se quedan; Q8 nunca dos ventanas (CR-1 de la 016). Propuestas P1–P11 aceptadas. Su línea base visual se toma con la 016 ya implementada. |
| `018-pruebas-e2e` | Spec APROBADA (2026-11-21); plan y tareas pendientes. Se implementa después de la 016 y la 017 | `e2etests/` independiente; build de producción en un solo puerto (modo producción, secreto generado por ejecución); solo Chromium; backend real con base E2E propia (nombre con «e2e», ubicación local); datos por la API pública y login siempre por el formulario (U8); cada escenario borra su usuario por la API (fallo de limpieza = escenario fallido con aviso claro, U6); en serie; 7 escenarios: E1–E4 (login, acceso protegido, F5, Atrás) y C1–C3 (crear, editar y cancelar una sesión de juego con F5, Atrás y Adelante); sesión testigo como ancla; ESLint + typescript-eslint + tipos; README propio enlazado desde el raíz. Riesgo U7: se supone que Chromium acepta la cookie `Secure` sobre `http://127.0.0.1`; lo comprueba la primera tarea del plan y, si falla, se para y se vuelve a la spec. Limitación conocida Q8: no protege la build de un servidor de producción levantado a mano desde el mismo checkout. |

## Deuda conocida

- Pendiente del usuario y riesgos conocidos (2026-11-21):
  - **Solo el usuario:**
    - T9 de la 010 (despliegue real en `fullstack`: carpeta `~/reactivoActivo`, PM2
      `reactivoActivo-7041`, puerto 7041). Antes: confirmar con el equipo qué colecciones `tmu_*`
      tienen datos; el servidor tendría Node 20 (el plan pide ≥ 22; aviso `EBADENGINE` esperado).
    - Recorridos con Steam real (013 T11) y con Steam y Leetify reales (015,
      `validation.md` §2.2), pospuestos.
    - NVDA (008 y 009, necesita Windows); que un compañero siga el README de despliegue.
  - **Riesgos:**
    - 018 U7: si Chromium no acepta la cookie `Secure` sobre `http://127.0.0.1`, la 018 vuelve a la
      spec (lo comprueba su primera tarea).
    - 016 R5: el plan depende de detalles internos de TanStack Query 5.102.8 (`manual`,
      `placeholderData`, orden de avisos), pero `package.json` dice `^5.62.7` (el lock fija
      5.102.8). Un `npm install` que suba la versión puede romperlo sin que lo detecten las pruebas
      del almacén; solo los recorridos de T9 (repetirlos si se sube la versión).
  - **Ramas:** `origin/deploy` tiene otra implementación de la 010 (`frontendDir`); lo útil ya se
    trajo. No fusionarla.
  - **Menores anotados (2026-11-20):** SteamID64 partido en la ficha a 375 px; pestaña elegida
    fuera de vista a 360 px en la ficha; contraste de la agenda (`.week__session-meta` 4,19 en
    oscuro, bloques en hover 1,1–1,85); foco con `--volt` en tema claro (< 3:1; lo resuelve la 017
    Q5/Q7); `frontend/package.json` con `^` (la constitución pide versiones exactas);
    `productionUi.test.ts` solo prueba uno de sus dos casos por ejecución; spec 011 en borrador.

- Spec 004 (2026-10-19):
  - En Windows, `npm test` necesita `npm test --script-shell=bash` (el script usa sintaxis
    POSIX).
  - Resuelto: el rework (T10–T25) corrigió los incumplimientos de la primera validación
    (cascada en orden inverso, `User.accounts`, vincular con usuario borrado, 401 «token
    inválido», textos DP-6, plegado de región DP-35, tests que faltaban) y reviewer dio
    APROBADO tras 2 vueltas (los 2 bloqueantes de la 1ª, B1 y B2, eran solo de pruebas).
  - Resuelto: el usuario repitió `npm test` sin conexión a Internet tras el rework
    (RNF-1/RNF-9; 1567/1567 en verde, 0 fallos, 2026-10-19); la T25 solo había podido
    comprobar la parte estática (ninguna llamada de red en `src/`).
  - Resuelto: con permiso del usuario, `tests/unit/withExistingUser.test.ts` se renombró a
    `tests/unit/withUser.test.ts` (solo prueba `createWithUser`).
  - Resuelto en la spec 007: etiqueta visible «Datos de demostración» (RF-11; RF-37 de la interfaz).
  - Commits `9b5cc87` y `88af4cd` hechos en local, sin push.
  - `npm test` tarda ~100–200 s (1567 tests; antes, 83–121 s); sin investigar si alguna
    prueba concreta es lenta.
  - Opcionales de reviewer sin hacer (no bloquean):
    - Caso de dos resincronizaciones con `overlapFirstFindById` en
      `accountConcurrency.test.ts` (hoy se prueba en `accounts.test.ts` con
      `forceSimultaneousReads`).
    - RF-45 solo se prueba con resincronización; falta el fallo de `save` al editar.
    - Posible cuenta guardada entre C1 y C2 si C2 y C3 fallan a la vez (riesgo R2/P-21
      aceptado; la oculta `withExistingOwners`).
    - `updateOwnedAccount` da 500 tras 5 `VersionError` seguidos.
    - Rama defensiva `DocumentNotFoundError` en `updateOwnedAccount`, posiblemente
      inalcanzable.
  - Riesgo aceptado R3: 404 en vez de 201 si el usuario desaparece entre crear la cuenta y
    comprobar que existe.

- Spec 006 (2026-10-19):
  - Resueltos los cinco hallazgos previos a la implementación (`withExistingUser`
    inexistente, 401 del usuario eliminado, orden de la cascada, helpers de tests, estilo de
    textos) con Q1–Q4 y el ajuste de supuestos del plan.
  - RESUELTA (laguna de RF-16): en la carrera «eliminar usuario + crear sesión» puede salir
    400 de RF-27 (cuenta vinculada borrada antes por C1); el estado final es correcto. El
    usuario aprobó DP6-40: RF-16 y los casos límite de la 006 contemplan ese 400. Commiteada
    en `cf09bfb` (sin push). Sin cambios de código.
  - Resuelto: `trimText` reescrito en tiempo lineal (con pruebas de rendimiento).
  - HECHO (2026-10-19): las specs 004 y 005 adoptaron el paso del cuerpo antes del 401
    (DP6-37) como DP-43 y DP5-18, con T26 y T11 hechas y validadas por el reviewer, sin
    cambios de código de producción.
  - Pendiente fuera de la 006: spec 009 (validaciones de edición). La 007 rehízo el backend
    simulado de la 006 (T17); las reglas del título del formulario no se verificaron aparte en
    la T29: revisarlas con la 009 (RF-24).
  - Pendiente informativo opcional, a decidir por el usuario: RF-20 y RF-23 de la 006 no
    nombran 413 y 415. El código ya los aplica antes del 401 en `/api/sessions`, porque el
    intérprete de cuerpo local usa el mismo límite. No bloquea nada.
  - Riesgo aceptado (Q3): si el paso C4 falla tras borrar al usuario → 500 y sesiones
    residuales ocultas por RF-24.

- Spec 009 (2026-10-18):
  - El dominio nuevo del frontend se prueba con scripts de Node sin versionar en el
    scratchpad (D-26): no hay script `test` en el frontend, así que esas pruebas no se
    repiten solas; su salida queda en `validation.md`.
  - En una sesión `open` con un participante eliminado aún guardado (cascada), bajar los
    cupos puede dar 400: limitación transitoria aceptada (Q22).

- Spec 007 (2026-10-19), pendientes de decisión del usuario; ninguno bloquea:
  - `domain/games.ts:61`: el ejemplo del identificador de R6 es `tu-nombre-ubisoft` y
    `LinkAccountForm` lo repite en su mensaje de formato. No atribuye el rango, pero el texto
    visible contiene «ubisoft» fuera de la etiqueta «Ubisoft ID» (RF-15 leído a la letra). El
    servidor tiene el mismo ejemplo. **Aceptado (2026-11-20, R24 de la 007).**
  - La barra muestra «DATOS DE DEMOSTRACIÓN» por una regla CSS previa (`text-transform:
    uppercase`) y la oculta por debajo de 1140 px (el pie siempre la muestra). Cambiarlo sería
    tocar disposición (RNF-4). **Aceptado (2026-11-20, R24 de la 007).**
  - Títulos de la entrada y de la pantalla de acceso («Tu rango se lee, no se declara», «Rango
    leído, no declarado»): solo se cambiaron los cuerpos; los títulos no nombran fuentes ni
    prometen relectura automática.
  - A 360 px, `document.documentElement.scrollWidth` supera el ancho en la entrada (504), el
    perfil (522) y coincidencias (361). Ya fallaba en la línea base (504, 425 y 361); el perfil
    empeora por la semilla nueva (`.rank-scale__rail`, absoluto). `body` tiene `overflow-x:
    hidden`, así que no se ve desplazamiento. El «Hecho cuando» de la T28 no se cumple a la letra.
  - `mockApi.ts` escribe `tmu.mock-db.v4` (`v3` hasta la spec 012) en `localStorage` al importarse aunque el modo simulado
    esté desactivado (`api.ts` lo importa de forma estática); no es credencial (`session: null`).
    Nada limpia un `tmu.token` ni un `tmu.mock-db.v2` antiguos: un navegador viejo los conserva
    sin que el código los use.
  - RF-10 punto 8 de la spec 007 cita «no estás inscrito en esta sesión» en minúscula y sin punto;
    la 006 fija «No estás inscrito en esta sesión.» y servidor y simulado responden esto último.
    Corregir la redacción de la spec 007.
  - `shared/components/RankScale.tsx`: la T21 colocó las marcas de tier de LoL en su posición real
    de la escala (antes repartidas a partes iguales): cambio visual menor respecto a RNF-4.
  - Con una cuenta propia sin rango, el perfil muestra «No se pudieron cargar los datos» en vez de
    «Sin datos» (la fila de Configuración y coincidencias sí lo cumplen). El servidor y el simulado
    no producen ese estado.
  - `vite.config.ts` apunta por defecto a `http://localhost:3000` sin `.env`; el backend usa 3001
    (`frontend/.env.example` ya pone 3001).
  - El jueves 03:00 de los criterios de finalización no se puede marcar en la hoja de Configuración
    (va de 12:00 a 01:00); se probó con `PUT /api/users/me/availability`.
  - La T13 deja la guarda `useRef` contra el doble envío en cada componente; la tasa de victorias y
    el puntaje usan `useInView({ once: true })` y leen «0» hasta entrar en pantalla (solo afecta a
    pruebas automáticas).
- Resuelto en la 007 (RF-2): la interfaz ya no guarda el JWT (solo la cookie HttpOnly y el
  comprobante `tmu.csrf`).
- `frontend/src/domain` importa sin extensión `.ts`, así que no se puede ejecutar directo
  con `node --test`.
- Mejoras menores detectadas por reviewer en la spec 001 (opcionales, requieren cambio de spec):
  - Con `MONGODB_URI` mal formada, el mensaje dice «no se pudo conectar en 10 s» aunque
    falla al instante.
  - Con `PORT` inválido no se informa a la vez de un `HOST` inválido.
  - Dos aserciones `as` sustituibles por guardas (`config.ts:65` y `as AddressInfo` en tests).
  - El lint no detecta `.only` importado con otro nombre.
  - Faltan pruebas de proceso real con `HOST=""` y con desarrollo sin `MONGODB_DBNAME`.
- Mejoras opcionales detectadas en la spec 002 (no bloquean; pendientes de decisión del usuario):
  - `/me` consulta la base dos veces.
  - El cast `as Record<string, unknown>` de `services/credentials.ts:136` se podría
    sustituir por `Reflect.get`.
  - `normalizeEmail` mide los 254 caracteres antes de pasar a minúsculas: un carácter como
    «İ» se alarga y el correo guardado podría superar 254.
- La base de desarrollo `teammatchup` no existía al validar: la verificación de «las
  pruebas no tocan la base de desarrollo» fue débil (reviewer lo confirmó revisando el código).

- Spec 014 (2026-11-19), opcionales de la validación; ninguno bloquea:
  - `/perfil` desborda a 375 px por `.rank-scale__rail` (preexistente, specs 007/008; ver
    «Spec 007»). Para una spec aparte.
  - Sin prueba automática del aviso tras el fundido de salida (RF-7/RF-27): el frontend no tiene
    runner de pruebas; se comprobó con navegador y en el recorrido real.
  - RNF-7: el temporizador de 60 s arranca tras las comprobaciones en base (`riot.ts:174`,
    `riot.ts:362`, `riotSync.ts:372`); si el plazo vence a mitad de las partidas, el bloque se lee
    con omisiones (`riotSync.ts:169-177`, defendible por D83).
- Spec 005 (2026-10-19):
  - Hecha con 1427 tests (cifra histórica, anterior al rework de la 004 y a los cambios A y
    B de la 005): el usuario corrió la suite completa sin conexión a Internet y pasó (cubre la
    comprobación de red de la 005). Repetida tras el rework de la 004: 1567/1567 en verde sin red (2026-10-19).
    Además, búsqueda estática en el código de la 005 sin `fetch(`, `http.request`, URL
    externas, `process.env`, `Math.random` ni `Date` en `domain/`.
  - Opcional de reviewer sin hacer (no bloquea): falta una prueba HTTP del orden «búsqueda
    repetida → 404 de RF-6».
  - Riesgo aceptado A1: segundo intervalo de carrera → 404 por la cascada de la 004.
  - Resuelto en la 007: la etiqueta «Datos de demostración» sale con el servidor real junto a la
    distancia y el puntaje (T22; la casilla de la spec 005 sigue sin marcar: marcarla al
    validar la 007) y el modo simulado adoptó DP-26 (T14, T15, T27: paridad exacta con el
    servidor).

## Decisiones recientes

- Spec 014 (validación y cierre, 2026-11-19):
  - 1ª validación de `reviewer`: CAMBIOS NECESARIOS por un defecto (RF-7/RF-27): el aviso tras
    confirmar no llegaba a `/perfil` porque el `<Navigate replace>` de `RiotVerifyPage` se
    ejecutaba durante la animación de salida de `AuthLayout` y borraba `state.riotNotice`.
    Vuelta 1: estado `confirmedChallenge` solo en `RiotVerifyPage.tsx`. Revalidación APROBADA.
  - Recorrido manual con cuenta real de LoL (pasos 0–9 de `validation.md` §3): todo OK según el
    usuario. `spec.md` pasa a «implementada (2026-11-19)».
  - Opcionales sin bloquear en «Deuda conocida — spec 014» (desborde de `/perfil` a 375 px, sin
    prueba automática del aviso, dos matices de RNF-7).

- Spec 015 (T21–T22, cambio D33–D34, 2026-11-19):
  - T21 (solo frontend): `scoreOriginLabel` (`premierDisplay.ts`): el anillo de afinidad nunca
    lleva «Datos de Leetify»; «Datos de demostración» si algún rango es simulado, sin etiqueta si
    los dos son de Leetify. Logo de Leetify a 24 px; rama muerta de `RankDistanceBlock` quitada.
  - T22: `reviewer` APROBADO con navegador (`validation.md` §3.8). Pruebas como antes (solo los 8
    de `ui.test.ts`). Opcional fuera de la 015: `/perfil` del modo simulado desborda a 375 px
    (`.tabs__tab`, `.rank-scale__rail`).
  - Cierre: el usuario pospuso el paso 4 (recorridos con cuentas reales) y pidió cerrar y
    commitear. `spec.md` pasa a implementada con esa salvedad.

- Spec 015 (validación con navegador y cambio D33–D34, 2026-11-19) — **traspaso a otro agente**:
  - Paso 3 ejecutado: `reviewer` CAMBIOS NECESARIOS. Todo cumple en pruebas y en navegador
    (Chrome headless por CDP; no hay MCP de DevTools) salvo el defecto 1: el anillo de afinidad
    de Coincidencias mostraba «Datos de Leetify» (R8 era falso). Detalle en `validation.md` §3.7.
  - Cambio aprobado por el usuario: D33 / RF-26 (afinidad sin Leetify: «Datos de demostración»
    si algún rango es simulado, sin etiqueta si los dos son de Leetify) y D34 (logo a ~24 px);
    también quitar la rama muerta de `RankDistanceBlock`. Plan §14, tareas T21–T22 escritas.
  - **Siguiente:** T21 (implementer), T22 (reviewer), pasos 4–6 de la guía. Instrucciones
    completas, entorno visual y restricciones del usuario en `validation.md` §5. Nada commiteado.

- Spec 015 (términos de Leetify contra lo construido y cambio D31–D32, 2026-11-19):
  - Paso 2 de la guía de `validation.md` hecho (§3.5): 8 pautas cumplen; R6 (guardar el rating
    vigente) no se reabre porque «please refrain from storing» es una petición. **No cumplía**
    la de métricas: la escala 0–100 y «Δ n pts» se derivaban del rating y salían junto al logo.
  - Cambio de requisitos aprobado por el usuario (opción A): D31 (ninguna cifra reescalada en
    pantalla), D32 (el filtro «n pts» no cambia), RF-5 y RF-12 modificados, RF-25 nuevo. Solo
    frontend. Plan §13 y tareas T17–T20 aprobados por el usuario (2026-11-19).
  - T17–T20 hechas (2026-11-19, sin commitear): `showsRankDistance` y
    `LEETIFY_HIDDEN_DISTANCE_TEXT` en `premierDisplay.ts`; caso `leetifyHidden` en `playerSheet.ts`
    y `RankDistanceBlock`; `MatchEntry` sin «Δ» si alguno de los rangos es de Leetify
    (`ownRankOrigin` desde `MatchesPage`); `GameSummaryPanel` con rango de Leetify solo con
    `LEETIFY_NO_HISTORY_TEXT` (sin escala). `MatchFiltersPanel` (D32), backend y contrato sin
    cambios. `PRODUCT.md` actualizado; `AGENTS.md` sin cambios (no describe la escala de CS2
    verificado).
  - Decisión no prevista en el plan (T18): sin cuenta propia del juego activo, `ownRankOrigin` vale
    `'simulated'` por defecto; solo ocurre en un render de transición (sin cuenta la lista no se
    pinta) y el origen del candidato se comprueba igual en cada fila.
  - Comprobación de T20: backend 2971 pruebas, 2963 pasan, 8 fallan (todas de `ui.test.ts`);
    typecheck con el único error `ui.test.ts(28,83)`; lint de backend y frontend, typecheck y build
    del frontend, en verde. Sin `.only`, `any` ni dependencias nuevas. Detalle en
    `validation.md` §3.6.
  - **Pendiente:** paso 3 de la guía (navegador, con RF-12 y RF-25 en las cuatro combinaciones
    propia/candidato) y validación del `reviewer` de T17–T20.
  - Riesgo R8 a confirmar por el usuario: el puntaje «Afinidad n de 100» (spec 005) usa la
    distancia; se considera puntaje de la plataforma y RF-25 no lo toca.

- Spec 015 (implementación T11–T16, 2026-11-19):
  - Estado real: T1–T16 marcadas. Sin historial real (D27): el guardado queda vacío al leer y la
    migración de RF-24 lo vacía en las cuentas existentes; atribución con el logo «Data Provided by
    Leetify» y «View on Leetify» (`LeetifyAttribution`, logos en `frontend/src/assets/leetify/`);
    bloqueo y D28 en `cs2Sync.ts`. T16: `backend/requests/leetify.rest` (la clave es la variable
    `leetifyKey`, nunca escrita; la cabecera `_leetify_key` solo sale de `leetifyClient.ts` en
    `backend/src`), `AGENTS.md`, `PRODUCT.md`, `validation.md`. El `README.md` no menciona el
    historial: sin cambios.
  - Comprobado: backend `npm test` 2971 pruebas, 2963 pasan, 8 fallan (todas `ui.test.ts`, spec
    010); typecheck con un único error (`ui.test.ts(28,83)`); lint de backend y frontend, y
    typecheck y build del frontend, en verde. Salvedad vigente: `ui.test.ts`, previa a la 015.
  - **No** ejecutado: navegador (1280 y 375 px, tema oscuro y claro), recorridos con cuentas reales
    y lectura de los términos de Leetify tras el cambio. La spec **no** pasa a «implementada» hasta
    cerrarlos y la validación del `reviewer`. Sin commit ni `graphify update` (pendiente según
    `CLAUDE.md`).
  - Desvíos a revisar por el `reviewer`:
    - (a) T13 relee la cuenta dentro del bloqueo de `cs2Sync.ts` para cerrar una carrera que el
      plan no cubría (una consulta más por resincronización). Aceptada por el usuario el
      2026-11-19 y anotada en el plan, §12.2.
    - (b) T12 ajustó tres pruebas existentes a RF-8 y RF-24.
    - (c) El contador «N lecturas registradas» de `GameSummaryPanel` se oculta con rango de
      Leetify (diría «0 lecturas registradas»; los casos límite piden solo el texto de RF-12).
      Decidido por el usuario el 2026-11-19; corrección dentro de T15, sin cambio de requisitos.
    - (d) `LEETIFY_NO_HISTORY_TEXT` («Leetify solo entrega el rango vigente: no hay historial») se
      definió en T15 en `premierDisplay.ts`.

- Spec 015 (validación, 2026-11-19):
  - El `reviewer` da CAMBIOS NECESARIOS:
    - Bloqueante: «Último rango registrado» en `GameSummaryPanel` en lugar del gráfico (RF-12).
    - Menor: segunda lectura de Leetify antes de 5 min si falló el perfil de Steam (RNF-7).
    - Las decisiones a, b y c, aceptadas.
  - Términos de Leetify (Developer Guidelines) incompatibles con la spec:
    - logo «Data Provided by Leetify» enlazado a leetify.com;
    - enlace «View on Leetify»;
    - no almacenar los datos de la API (choca con RF-9, RF-11 y RF-18);
    - métricas tal como las presenta Leetify.
    Hace falta un cambio de requisitos. Detalle en `validation.md` §2.3 y §2.4.
  - Cambio de requisitos aprobado el 2026-11-19 (D26 a D30): logo «Data Provided by Leetify»
    y «View on Leetify»; sin historial real (RF-24 vacía el guardado); dos lecturas toleradas
    (D28); escala y distancia se mantienen (D30). Plan §12 y tareas T11 a T16 aprobados; el
    usuario confirmó `leetify.rest`.
  - Siguiente paso: hecho (T11 a T16 implementadas el 2026-11-19; ver la entrada siguiente). Los
    logos oficiales estaban en `~/Desktop/leetify/`; T14 copió los «Small».
  - P15-3 confirmado: Leetify responde 404 `text/plain` a un SteamID64 no registrado (una
    petición sin clave, autorizada por el usuario).
  - Navegador sin ejecutar: queda para después de T16.

- Spec 015 (implementación T6–T10, 2026-11-19):
  - **Cuentas de CS2 verificadas con Steam sin `premier`** (anteriores a la 015; en producción no
    existen por la migración de T3, pero las pruebas antiguas las crean): no entran como candidatas
    y, como cuenta propia, dan el 409 de «rango no disponible» hasta resincronizar. Una verificada
    con Steam solo es candidata con `premier: "rated"`; las de CS2 sin verificar (sin `premier`,
    simuladas) siguen entrando (RF-22). Motivo: el filtro del plan (`$nin`) las habría dejado
    pasar con un rango simulado atribuido a Leetify (constitución, principio 5). Cubierto en
    `matchInputs.test.ts` y `matches.test.ts`; es una precisión sobre §4.5 del plan, que decía
    `$nin`.
  - Estado real: T1–T10 marcadas. T6 con pruebas primero (9 en rojo por la razón correcta, luego
    verde). T7–T9 solo con typecheck, lint y build (sin navegador). T10: documentos y
    comprobación; **no** ejecutado: navegador (1280 y 375 px), recorridos con cuentas reales,
    términos de Leetify. Salvedad vigente: 8 fallos y 1 error de typecheck de `ui.test.ts`
    (spec 010), previos a la 015.
  - Dos desvíos menores del plan, para el `reviewer`: `LEETIFY_PRIVACY_TEXT` vive en
    `copy.ts` (lo dice T7) y no en `premierDisplay.ts` (§3 del plan); la nota de RF-21 se muestra
    también junto al botón desactivado del modo simulado. T8 añade «Último rango registrado»
    para una cuenta que pasó a sin rango con historial (RF-9), sin texto en la spec.

- Spec 007 (implementación, 2026-10-19):
  - El usuario aprobó el plan y las 30 tareas (T1–T30) y pidió hacerlas todas de corrido, en
    paralelo donde se pudiera. Se añadió la T31 (corrección de D-A2 y D-A1) tras la T29.
  - Ejecución: un `implementer` por tarea; tareas en paralelo solo con archivos distintos, cada
    una con sus puertos, base temporal (`tmu_tNN_tmp`) y perfil de Chrome. La T29 se dividió en
    dos mitades (A: sesión y conexión; B: datos, presentación y proponer sesión). Nadie hizo commit
    ni `graphify update`.
  - Decisiones menores de implementación: `ApiError`, `SessionClearedError` e `isSessionCleared`
    viven en `transport.ts` (`httpClient.ts` los reexporta); `requestWithHeaders` expone las
    cabeceras del login; `normalizeRank` se importa de `domain/rankScale.ts` (sin reexportar desde
    `games.ts`, por el ciclo de imports); `simulatedProvider.ts` copia el algoritmo completo del
    servidor, así que sus valores coinciden exactamente; el simulado deja el número de lectura en
    `readings` dentro de la base; la clave de la base simulada es `tmu.mock-db.v4` (era `v3` hasta la spec 012, que la subió para descartar cuentas guardadas con `verified: true` y sin `origins`).
  - Plan 3.9: la sesión simulada vive dentro de la base simulada (`{ userId, csrf }`); la
    interfaz no la lee.

- Spec 006 (cierre, 2026-10-19):
  - DP6-39 (Q1): el 401 de la credencial válida de un usuario eliminado es «token inválido»
    (RF-18), también en la compensación de crear y sumarse; «sesión no iniciada» solo sin
    credencial; se reutiliza `createWithUser`.
  - Q2: los textos propios de la 006 llevan mayúscula inicial y punto final, a diferencia de
    004/005; los heredados (401, «id con formato inválido», «JSON mal formado») no cambian.
  - Parser: `express.json({ limit: 102_400, strict: false })` solo en `/api/sessions`, antes
    del `express.json` estricto global; `requireObjectBody` aplica solo a `POST /` y
    `PUT /:id` (RF-28) y va antes del 401 (DP6-37).
  - Q3: paso C4 en la cascada de `DELETE /api/users/:id`, tras C3 y antes de `clearCookie`:
    `PlaySession.deleteMany({ host })` y `removeUserFromSessions`; C1–C3 no se tocaron. La
    edición es `PUT /api/sessions/:id` con semántica parcial (el juego no se lee).
  - Q4: la 006 no exige lint, pero el servidor tiene `npm run lint` y está en verde.

- Cierre y validación de las specs 004 y 005 (2026-10-19):
  - Spec 004: reviewer APROBADO tras 2 vueltas. En la 1ª dio CAMBIOS NECESARIOS por 2
    bloqueantes solo de pruebas: B1 (ejemplos de validación de RF-6/DP-19) y B2 (literales de
    normalización de DP-26/RF-48); se corrigieron solo en tests, sin tocar el código. En la 2ª,
    APROBADO. `spec.md` pasa a «implementada» (la marca planner).
  - Spec 005: cambios A (RF-13, T9) y B (DP5-17, T10) implementados y validados por
    reviewer: APROBADO. `spec.md` en «implementada».
  - Suite: 1567 tests en verde (sustituye las cifras 1427 y 1562), typecheck y lint en verde.
    `npm test` tarda ~100–200 s según la ejecución.
  - `withExistingUser.test.ts` se renombró a `withUser.test.ts` con permiso del usuario
    (cierre, 2026-10-19).
  - Riesgos aceptados vigentes: R3 de la 004 (404 en vez de 201 si el usuario desaparece
    entre crear la cuenta y comprobar que existe) y A1 de la 005 (segundo intervalo de
    carrera: 404 por la cascada).
  - Orden: la siguiente spec es la 006 (tras su cambio de requisitos); la 007 sigue sin
    implementar.
  - Commits locales sin push: `9b5cc87` (rework de la 004 y cambio A de la 005) y `88af4cd`
    (cambio B de la 005).

- Cierre de aprobaciones (2026-10-19; el usuario: «apruebo todo con tus recomendaciones»):
  - Opción A (spec 005, Cambio A, DP5-16): `GET /api/matches` responde 401 «token
    inválido» (no «sesión no iniciada») con la credencial de un usuario eliminado, también
    en la carrera `noSession`. Tarea nueva T9 de la 005. Se acepta como riesgo el segundo
    intervalo de carrera (404 por la cascada de la 004).
  - Cambio B (spec 005, DP5-17; decisiones B1–B5): textos de error propios de la 005 en
    minúscula inicial y sin punto final; los rótulos entre « » conservan la mayúscula. Tarea
    nueva T10 de la 005, después de la T11 de la 004.
  - Spec 004 (A1, C1–C4): se rehace el código; plan y tareas T10–T25 aprobados, con el
    orden de «Fase actual». T24 (retirar `createWithExistingUser` y `missingUserError`)
    bloqueada hasta la T9 de la 005. T13 (lectura literal fija del simulador) aprobada como
    excepción deliberada a P-13. No se divide la spec. Riesgo R3 vigente (2026-10-18).
  - Los textos de la 004 aceptados antes (decisiones de T9 de la 004, abajo) siguen en pie
    salvo que el rework los cambie (p. ej. «Juego no válido.» pasa a `juego no válido`
    por DP-6).
  - Spec 007: el usuario autorizó después (2026-10-19) alinear sus textos simulados; ver su
    fila de «Estado de las specs».

- Spec 004 (2026-10-19):
  - Cierre del rework (T25): `requests/accounts.rest` actualizado a los textos y códigos
    vigentes; búsquedas estáticas de la T25 sin resultados (sin `fetch(`, `http.request`,
    URL externas, `process.env` fuera de `config.ts`, `Math.random`, `Date.now`/`new Date()`
    en `domain/`, `any`, `@ts-ignore` ni `.only`; `package.json`, `package-lock.json` y
    `.env.example` sin cambios; nada de `User.accounts`, `$addToSet`, `$pull`,
    `createWithExistingUser` ni `missingUserError`). Recorrido con curl en una base
    temporal (ya borrada, sin tocar `teammatchup`): login, vincular los tres juegos, listar,
    obtener, resincronizar, resumen, editar, desvincular, errores y eliminar usuario; con la
    credencial vieja, 401 «token inválido».
  - Prueba sin Internet (RNF-1/RNF-9): repetida por el usuario tras el rework, 1567/1567 en
    verde (2026-10-19); la anterior (1427 tests) era previa al rework.
  - `.gitattributes` en la raíz queda en el repositorio: evita que git convierta a CRLF el
    fixture `tests/fixtures/tzdata-2025b/zone.tab` en Windows (si se convierte, falla la
    prueba de zonas horarias).
  - Decisiones de T9 aceptadas por el usuario: (1) con un id inválido y el juego sin
    decodificar, el resumen responde primero «id con formato inválido»; (2) `LOL` en
    mayúsculas responde 400 «juego no válido» (texto vigente tras la T11 del rework; antes
    «Juego no válido.»); (3) `src/utils/middleware.ts` importa
    `ACCOUNT_ERRORS` de `src/domain/accountRules.ts`; (4) hay una prueba determinista extra
    de la cascada al borrar usuario.

- Spec 009 (clarificación, plan y tareas; 2026-10-18):
  - Reviewer la revisó contra 003, 006, 007 y 008 aprobadas (15 hallazgos). Planner los
    corrigió en varias rondas (cuarta revisión QA: Q16–Q27, D24–D30, CR4-1 a CR4-5 y
    CR5-1 a CR5-5). Un repaso posterior encontró 1 bloqueante (U+0085) y 8 menores, todos
    corregidos.
  - Q16: el aviso global «Datos de demostración» también se muestra con el servidor real
    (como la 007 RF-11).
  - Q17/D30: el botón de una acción en curso queda deshabilitado con «Enviando…» (como la
    007 RF-20); los botones bloqueados («Sin cupos», «Editar sesión», «Cancelar sesión»,
    «Descartar», «Volver») conservan el foco.
  - Q18: una sola regla de dominio para el título (006 DP6-33: recorte Unicode,
    caracteres prohibidos, 3 a 60 caracteres Unicode), usada en la edición y en el
    formulario de creación de la agenda (RF-24 nuevo). Q23: las notas de creación también
    admiten 160 caracteres Unicode. Q27: «Sesión con <nombre>» con caracteres prohibidos
    muestra el error de RF-24 al enviar.
  - Q19: la edición envía siempre los seis campos; el modo simulado imita la edición
    parcial de la 006 (RF-7, RF-26) con sus mensajes literales.
  - Q20: en modo simulado el id de sesión no distingue mayúsculas (como la 008 P49).
  - Q21: una sesión `full` con menos participantes visibles (cascada) no muestra «cupo
    libre». Q22: si está `full`, el mínimo de cupos es el número actual de cupos.
  - Q25: mientras «Sí, cancelar sesión» está en curso, el foco va al título de la
    ventana. Q26: Tab recorre la ventana sin salir de ella.
  - Plan (D-1 a D-30): ruta `/agenda/:sessionId`; el contrato gana `sessions.get` y
    `sessions.update`; D-27: el cliente comprueba los puntos 2 a 4 de RF-22 con los textos
    de la 006 («No puedes dejar menos cupos que jugadores inscritos.»); D-28: orden de
    implementación; D-29 y D-30 en Notas técnicas.
  - Tareas: 18 (T0–T17); la usuaria prefirió no dividir la spec.
  - «No se debe cambiar nada de la 007» (decisión de la usuaria). Un planner tocó por
    error la 007 RF-20 y añadió R21; se revirtió.

- Spec 002 (clarificación y plan):
  - P1: comprobante CSRF en la cabecera `X-CSRF-Token`, en la respuesta y en la petición.
  - P2: los mensajes de duplicado nombran el campo; si se repiten los dos, se da el del
    correo. La enumeración de cuentas por registro se acepta.
  - P3: la unicidad del nombre de usuario no distingue mayúsculas (campo `usernameKey`
    con índice único).
  - P4: el cierre de sesión es público y no exige comprobante.
  - P5: el JWT en `localStorage` del frontend lo corrigió la spec 007 (RF-2, hecha).
  - P6: cookie de sesión sin caducidad; la credencial expira a 1 h.
  - P7: valores por defecto: zona `America/Santiago`, avatar `#6d5efc` y biografía vacía.
  - P8: contraseña de 72 bytes UTF-8 como máximo; correo de 254 caracteres como máximo.
  - P9: `JWT_SECRET` obligatoria en los tres entornos; valor de desarrollo
    `solo-desarrollo-no-usar-en-produccion` en `.env.example`, rechazado en producción.
  - Orden de validación por campo: tipo, luego ausente y luego reglas; en el nombre de
    usuario, la longitud antes que los caracteres.
  - El inicio de sesión tarda distinto si el correo no existe: limitación aceptada.
  - `bcrypt` nativo (no `bcryptjs`).

- Spec 001: `NODE_ENV` obligatoria y exacta, también en `.env` (si falta o es
  desconocida, no arranca).
- Spec 001: en prueba solo el mensaje de configuración inválida se muestra; los de
  base no disponible y dirección/puerto no utilizable se callan (RNF-1, opción b).
- Spec 001: backend con lint (ESLint); el registro de cada petición queda fuera de alcance.
- Spec 001: `HITO2.md` no está en el repositorio; la spec no se contrastó con el enunciado.
- Las dependencias se justifican en el `plan.md` de cada spec aprobada (principio 1).
- Los 6 principios de la constitución quedan aprobados.
- Principio 4 (tests primero) aplicaba solo al backend; enmendado por el usuario el 2026-11-21
  (principios 1 y 4): Vitest en el frontend cuando una spec exige pruebas (tests primero) y
  Playwright para E2E en `e2etests/`.
- implementer escribe los archivos fuera de `specs/**`; planner solo escribe en `specs/**`.

## Notas técnicas para las specs siguientes

- `createWithUser({ jwtSecret, now })` en `src/utils/middleware.ts` protege rutas y deja
  `request.userId`.
- `createApp({ jwtSecret, nodeEnv, now? })` sustituye al antiguo `export default app`.
- Las respuestas de usuario usan `toOwnUserJson` o la serialización JSON de Express, no
  los campos tipados de `toJSON()`.
- Al eliminar la cuenta (spec 003), la cookie debe borrarse con `sessionCookieOptions`,
  igual que al cerrar sesión.
- Zonas horarias (spec 003): lista fija de la columna TZ de `zone.tab` de tzdata 2025b
  (`src/services/zoneTab.ts`, sin `Intl`). Para cambiar de versión: sustituir el fixture
  `tests/fixtures/tzdata-2025b/zone.tab`, regenerar el arreglo y `TZDATA_VERSION`, y
  ajustar la prueba `tests/unit/timezones.test.ts`.
- `MESSAGES.forbidden` («no tienes permiso para esta operación») y `MESSAGES.invalidId`
  («id con formato inválido») de `src/utils/errors.ts` son reutilizables por 004–006.
- La cascada de RF-11 (borrar los datos del usuario) la amplían 004 y 006 dentro de
  `DELETE /api/users/:id`.
- `requireObjectBody` (`src/utils/middleware.ts`) responde 400 «JSON mal formado» cuando el
  cuerpo JSON no es un objeto; solo lo usa la 006. `trimText` recorta en tiempo lineal con
  el conjunto explícito de DP6-27.
- Spec 007: si hay CORS con orígenes distintos, hará falta
  `Access-Control-Expose-Headers: X-CSRF-Token`.

- Frontend (spec 009): regla única del título en el dominio (`sessionRules.ts`), usada
  por la edición del detalle y por el formulario de creación de la agenda.
- `limitToCodePoints` (D-29) funciona como `maxLength` contando puntos de código: solo
  entra lo insertado que cabe y los emojis compuestos entran enteros o no entran. La
  selección se lee en el `beforeinput` nativo (D-30).
- Las pruebas del dominio del frontend usan el gancho de resolución de la 007 (por los
  imports sin `.ts`).

- Frontend (spec 007): `queryClient` sin reintentos y con `staleTime: 0`; `clearClientSession`
  aplica `anonymous` con `flushSync` antes de cancelar y vaciar las consultas (si no, las consultas
  montadas se relanzan y pierden el aviso de expiración). Si hay CORS con orígenes distintos, el
  comprobante necesita `Access-Control-Expose-Headers: X-CSRF-Token`.

## Avisos

- npm bloquea los install-scripts de `bcrypt`. No afecta en linux-x64 (trae el binario ya
  compilado); en otra plataforma, ejecutar `npm install-scripts approve bcrypt`.
- Frontend: si `frontend/node_modules` no coincide con `package-lock.json` (Vite 8 en lugar de 5,
  falta `motion`), `npm ci`. Sin `frontend/.env`, el proxy apunta a `:3000`, no a `:3001`.
- Cada `backend/.env` local necesita la línea `JWT_SECRET` (copiarla de `.env.example`).
- Windows: MongoDB nativo en `127.0.0.1:27017`; `npm test --script-shell=bash`.
- La reversión de `specs/007-integrar-frontend/spec.md` está completa: a 2026-10-18
  `git status` y `git diff --stat` no lo muestran modificado (no hace falta
  `git checkout`).
- Los `.DS_Store` (raíz y `frontend/`) no deberían subirse.

## Próximo paso

Actualizado el 2026-11-22, para el compañero que continúa. Flujo: skill `sdd` con los agentes
`planner` (spec, plan, tareas), `implementer` (una tarea) y `reviewer` (validación). **Ninguna
fase se salta la aprobación explícita del usuario.** Rama `feature/vinculacion-steam-riot`.

1. **016 validada (2026-11-22, `reviewer` APROBADO).** Nada pendiente de validación. Correr `graphify update .` donde
   `graphify` esté instalado (no lo estaba al cerrar T10).
2. **Siguiente: la 017 (librería de estilos):** `planner` redacta `plan.md` y `tasks.md` (`/sdd-plan`, `/sdd-tasks`) →
   aprobación del usuario → implementación tarea por tarea → validación con `reviewer`. Su línea
   base visual se toma con la 016 ya hecha.
3. **Luego la 018:** igual que la 017. Su primera tarea comprueba la cookie `Secure` sobre
   `http://127.0.0.1` (U7); si falla, parar y volver a la spec.
4. **En paralelo, cuando el usuario pueda:** T9 de la 010 (despliegue; avisos en «Deuda
   conocida»). El resto de lo que solo puede hacer el usuario también está allí.

Decisiones del 2026-11-20 (009 C4 → VC4; 007 RF-20 → R23; 007 O1 y O2 → R24): cerradas, sin
código. `graphify` ya está instalado (`graphify-out/` existe): tras modificar código, `graphify
update .`.

## Notas de la spec 004 (2026-10-19)

- Estas notas describen la implementación histórica (T1–T9); el rework T10–T25 (hecho) las
  sustituye en lo que choquen (ver «Fase actual» y «Estado del código»).
- Cambios al plan aprobados durante la implementación (ver `specs/004-cuentas-de-juego/plan.md`):
  plan alineado con el backend real de 001–003 (`helpers.ts`, `createApp`, `createWithUser`;
  no hay `test_helper.ts`); Q1 (REVOCADA por la spec vigente, RF-44/DP-37): la versión
  histórica respondía 401 "sesión no iniciada" a un usuario eliminado en las rutas de la
  004 (`missingUserError` + `createWithExistingUser`); ya retirados (T16, T24), todas las
  rutas responden "token inválido"; Q2: reloj mutable en `src/utils/clock.ts` (P-5); T3b/P-17: `domain/`
  aislado, `domain/userId.ts` nuevo y `services/userTarget.ts` lo reexporta (salvo
  `INVALID_ID_MESSAGE`); T8b/P-18: supertest hacía `listen(0)` en `::` y conectaba a
  `127.0.0.1`, lo que daba fallos intermitentes; se arregla solo en tests con
  `listenOnLoopback` + `closeTestServers` y `getFreePort(host)`.
- Rutas: edición `PUT /api/accounts/:id`; resincronizar `POST /api/accounts/:id/sync`.
- El orden de consumo del generador (plan, 4.3) es contrato: cambiarlo cambia todas las
  lecturas de la demostración.
- La normalización de rango del backend (DP-26) difiere de `frontend/src/domain/games.ts`
  hasta que la spec 007 la adopte.
