# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-10-19

## Fase actual

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
commiteadas) → 006 (cambio de requisitos y T1–T10), todo hecho y validado → 007 (T1–T31, hecha) → siguiente: validarla con `reviewer` y
hacer la 008.

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
  `seed.ts` (16 jugadores, 25 cuentas, base `tmu.mock-db.v3`, cuenta `demo@teammatchup.gg`).
  Sin runner de pruebas (RNF-3): lo probado vive en `specs/007-integrar-frontend/validation.md`
  y `validation/{baseline,after}/`.
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

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas. Cambios aprobados durante la implementación: mongoose 8.19.1 → 8.24.5 (vulnerabilidad alta) y regla RFC para `HOST` (la última etiqueta no puede ser solo numérica). |
| `002-autenticacion` | Implementada y validada | 28 RF y 7 RNF cumplidos; decisiones P1–P9 abajo. |
| `003-usuarios-y-disponibilidad` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas; `spec.md` en «implementada». `requests/users.rest` probado a mano contra el servidor: todos los códigos coinciden. `AGENTS.md` actualizado. |
| `004-cuentas-de-juego` | Implementada y validada (reviewer APROBADO tras 2 vueltas, 2026-10-19) | Rework terminado: T1–T9 históricas (con T3b y T8b) y T10–T25 hechas; 1567 tests, typecheck y lint en verde. 1ª vuelta: CAMBIOS NECESARIOS por 2 bloqueantes solo de pruebas (B1 ejemplos de RF-6/DP-19, B2 literales de DP-26/RF-48), corregidos en tests; 2ª: APROBADO. T13 (lectura literal fija del simulador) es una excepción deliberada a P-13. Riesgo R3 vigente. `spec.md` pasa a «implementada» (la marca planner). Hecho en el cierre: prueba sin red tras el rework (1567/1567, usuario, 2026-10-19) y renombrado a `withUser.test.ts`. Pendiente de la 007: etiqueta visible de datos simulados (RF-37; la 007 ya la cubre: RF-11, RF-22, R19). Rework commiteado en `9b5cc87` (sin push). El usuario confirmó (2026-10-19) que su aprobación del 2026-10-18 cubría DP-19, DP-34, DP-35 y DP-38 a DP-41. |
| `005-coincidencias` | Implementada y validada (reviewer APROBADO, 2026-10-19) | T1–T10 hechas (T1–T8 en el commit `31fdda2`, sin push). Cambio A (T9): 401 «token inválido» con la credencial de un usuario eliminado, incluida la carrera `noSession`. Cambio B (T10): textos propios en minúscula inicial y sin punto final (DP5-17). 1567 tests, typecheck y lint en verde; cambio A en `9b5cc87` y cambio B en `88af4cd` (sin push). `spec.md` «implementada». Riesgo A1 vigente. Pendiente además la casilla de la spec 007: etiqueta de datos simulados con el servidor real. |
| `006-agenda` | Implementada y validada (reviewer APROBADO, 2026-10-19) | Spec aprobada el 2026-10-18 con el cambio del 2026-10-19 (Q1–Q4, DP6-39); plan y tareas ajustados al código real. T1–T10 hechas; 2235 tests al validarla (2276 con T26 y T11 de las 004 y 005), typecheck y lint en verde; RF-1 a RF-28 y RNF-1 a RNF-4 cumplen. `spec.md` «implementada». Commiteada (`007ded0`, `3834d36`; RF-16 con DP6-40 en `cf09bfb`; sin push). Pendientes fuera de la 006 en «Deuda conocida». |
| `007-integrar-frontend` | Implementada (T1–T31, 2026-10-19); falta validación de `reviewer` | Interfaz conectada al servidor real (cookie HttpOnly + comprobante CSRF, plazo de 30 s, aviso entre pestañas, «Proponer»), con modo simulado alineado a 004–006 y datos ficticios. Recorrido manual T29 (5.A y 5.B) y capturas T28 en `validation.md`; defectos D-A2 y D-A1 corregidos en la T31. Excepción aprobada al RF-16: el simulado reproduce el literal «rango verificado» del servidor y la interfaz nunca lo muestra. Pendientes de decisión: «Deuda conocida — spec 007». Sin commitear. |
| `008-ficha-de-jugador` | Spec, plan y tareas aprobados (2026-10-18) | Precondición cumplida: la 007 está implementada (T1–T31). Los enlaces de RF-2 son su T9. |
| `009-detalle-de-sesion` | Spec, plan y tareas aprobados (2026-10-18) | 18 tareas (T0–T17), sin dividir la spec por decisión de la usuaria. T0 exige plan de la 007 aprobado, 007 hecha (cumplido) y la tarea de enlaces de la 008 hecha (pendiente). La validación de reviewer espera a que estén implementadas la 006, la 007 y la 008. No cambia el backend. |
| `010-despliegue` | Borrador | Servirá la interfaz desde el servidor (rutas fuera de `/api`). |

## Deuda conocida

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
    servidor tiene el mismo ejemplo. Decidir si pasa a algo neutro (p. ej. `tu-nombre`).
  - La barra muestra «DATOS DE DEMOSTRACIÓN» por una regla CSS previa (`text-transform:
    uppercase`) y la oculta por debajo de 1140 px (el pie siempre la muestra). Cambiarlo sería
    tocar disposición (RNF-4).
  - Títulos de la entrada y de la pantalla de acceso («Tu rango se lee, no se declara», «Rango
    leído, no declarado»): solo se cambiaron los cuerpos; los títulos no nombran fuentes ni
    prometen relectura automática.
  - A 360 px, `document.documentElement.scrollWidth` supera el ancho en la entrada (504), el
    perfil (522) y coincidencias (361). Ya fallaba en la línea base (504, 425 y 361); el perfil
    empeora por la semilla nueva (`.rank-scale__rail`, absoluto). `body` tiene `overflow-x:
    hidden`, así que no se ve desplazamiento. El «Hecho cuando» de la T28 no se cumple a la letra.
  - `mockApi.ts` escribe `tmu.mock-db.v3` en `localStorage` al importarse aunque el modo simulado
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
- El frontend no tiene runner de test (el principio 4 aplica solo al backend por decisión
  del usuario).
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
    `readings` dentro de la base; la clave de la base simulada es `tmu.mock-db.v3`.
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
- Principio 4 (tests primero) aplica solo al backend por ahora.
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

Hecho: la 007 implementada (T1–T31, 2026-10-19), con recorrido manual (T29), capturas (T28) y
defectos D-A2 y D-A1 corregidos. Antes: la 006 implementada y validada; el paso del cuerpo antes del
401 adoptado en las specs 004 y 005 (DP-43, DP5-18; 2276 tests en verde); la laguna de RF-16
resuelta (DP6-40).

Siguiente: (1) decidir lo pendiente de «Deuda conocida — spec 007»; (2) validar la 007 con
`reviewer` (`/sdd-validate 007-integrar-frontend`); (3) commitear (hoy nada de la 007 está
commiteado); (4) la tarea de enlaces de la 008 (T9) y el resto de la 008; después, la 009 desde su
T0 (`/sdd-implement 009-detalle-de-sesion T0`); (5) la 010 (despliegue).
Requisito local para ejecutar los tests del backend: `backend/.env` (copiado de `.env.example`,
con `JWT_SECRET`) y MongoDB en `mongodb://127.0.0.1:27017`.

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
