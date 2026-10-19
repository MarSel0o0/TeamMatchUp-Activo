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
a «implementada» (la marca planner). Sin commit todavía del rework (están en el árbol de
trabajo). No se dividió la spec.

Spec 005 (`005-coincidencias`): implementada (T1–T10) y validada (reviewer: APROBADO,
2026-10-19). T1–T8 están en el commit `31fdda2` (sin push). Los cambios de requisito A
(DP5-16, T9: 401 «token inválido» con la credencial de un usuario eliminado, también en la
carrera `noSession`; RF-13) y B (DP5-17, T10: textos propios en minúscula inicial y sin
punto final) están implementados y validados, sin commit todavía. `spec.md` «implementada».

Suite del backend: 1567 tests en verde, typecheck y lint en verde.

Spec 006 con plan y tareas aprobados, sin empezar. La 007 no se toca (ver su fila abajo).

Hecho en el cierre: el usuario repitió `npm test` sin conexión a Internet tras el rework
(RNF-1/RNF-9: 1567/1567 en verde, 0 fallos, 220 suites, ~100 s; 2026-10-19) y autorizó el
renombrado: el test pasó a `backend/tests/unit/withUser.test.ts`.

Pendiente antes de la 006: los commits (en curso: el coordinador los hará separando el
rework de la 004 y los cambios de la 005; ver «Próximo paso»).

Orden global de implementación: 005 T9 → 004 T11…T25 → 005 T10 (todas hechas y validadas)
→ siguiente: spec 006 (`/sdd-implement 006 T1`).

## Estado del código

- Frontend: Hito 1 completo (acceso, configuración, perfil, coincidencias y agenda).
  Funciona contra el backend simulado en el navegador (`mockApi`, datos de demostración
  con semilla fija, cuenta `demo@teammatchup.gg`).
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
  - Agenda: spec 006.
  - 1567 tests con node:test + supertest (2026-10-19; en serie, contra la base de prueba;
    `npm test` tarda ~100–200 s); typecheck y lint (ESLint) en verde; `npm audit` sin
    vulnerabilidades (revisado al cerrar la 004, antes del rework; sin dependencias nuevas
    desde entonces). Los tests de controlador montan el servidor en `127.0.0.1`
    (`listenOnLoopback`, T8b). Las cifras 1427 y 1562 eran históricas (anteriores a la
    validación final).

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas. Cambios aprobados durante la implementación: mongoose 8.19.1 → 8.24.5 (vulnerabilidad alta) y regla RFC para `HOST` (la última etiqueta no puede ser solo numérica). |
| `002-autenticacion` | Implementada y validada | 28 RF y 7 RNF cumplidos; decisiones P1–P9 abajo. |
| `003-usuarios-y-disponibilidad` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas; `spec.md` en «implementada». `requests/users.rest` probado a mano contra el servidor: todos los códigos coinciden. `AGENTS.md` actualizado. |
| `004-cuentas-de-juego` | Implementada y validada (reviewer APROBADO tras 2 vueltas, 2026-10-19) | Rework terminado: T1–T9 históricas (con T3b y T8b) y T10–T25 hechas; 1567 tests, typecheck y lint en verde. 1ª vuelta: CAMBIOS NECESARIOS por 2 bloqueantes solo de pruebas (B1 ejemplos de RF-6/DP-19, B2 literales de DP-26/RF-48), corregidos en tests; 2ª: APROBADO. T13 (lectura literal fija del simulador) es una excepción deliberada a P-13. Riesgo R3 vigente. `spec.md` pasa a «implementada» (la marca planner). Hecho en el cierre: prueba sin red tras el rework (1567/1567, usuario, 2026-10-19) y renombrado a `withUser.test.ts`. Pendiente de la 007: etiqueta visible de datos simulados (RF-37). Rework sin commit (en el árbol de trabajo); el commit anterior es `c98b84d`; sin push. |
| `005-coincidencias` | Implementada y validada (reviewer APROBADO, 2026-10-19) | T1–T10 hechas (T1–T8 en el commit `31fdda2`, sin push). Cambio A (T9): 401 «token inválido» con la credencial de un usuario eliminado, incluida la carrera `noSession`. Cambio B (T10): textos propios en minúscula inicial y sin punto final (DP5-17). 1567 tests, typecheck y lint en verde; cambios A y B sin commit. `spec.md` «implementada». Riesgo A1 vigente. Pendiente además la casilla de la spec 007: etiqueta de datos simulados con el servidor real. |
| `006-agenda` | Spec, plan y tareas aprobados (2026-10-18) | Sin empezar. |
| `007-integrar-frontend` | Spec aprobada (2026-10-18); plan y tareas en borrador | No define ningún script `seed` (la entrada anterior de esta memoria era errónea; el backend no tiene ese script). Debe incorporar la etiqueta de datos simulados de RF-37 de la 004. Por decisión de la usuaria, «no se debe cambiar nada de la 007». PENDIENTE de la 007 (no se toca ahora): alinear los textos que imita su modo simulado (RF-10) con los de la 005 («juego no válido», «no tienes una cuenta vinculada en este juego» y los de los filtros de distancia, horas, verificadas y búsqueda) y con los de la 004 (hoy chocan con DP-6), más el 401 «token inválido». |
| `008-ficha-de-jugador` | Spec, plan y tareas aprobados (2026-10-18) | Precondición: plan de la 007 aprobado y sus T1–T26 hechas. Los enlaces de RF-2 son su T9. |
| `009-detalle-de-sesion` | Spec, plan y tareas aprobados (2026-10-18) | 18 tareas (T0–T17), sin dividir la spec por decisión de la usuaria. T0 exige plan de la 007 aprobado, T1–T26 de la 007 hechas y la tarea de enlaces de la 008 hecha: hoy no se cumple. La validación de reviewer espera a que estén implementadas la 006, la 007 y la 008. No cambia el backend. |
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
  - Pendiente de la spec 007: etiqueta visible de datos simulados (RF-37 de la interfaz).
  - Sin commit: todo el rework de la 004 y los cambios A y B de la 005 están en el árbol de
    trabajo.
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

- Spec 009 (2026-10-18):
  - El dominio nuevo del frontend se prueba con scripts de Node sin versionar en el
    scratchpad (D-26): no hay script `test` en el frontend, así que esas pruebas no se
    repiten solas; su salida queda en `validation.md`.
  - En una sesión `open` con un participante eliminado aún guardado (cascada), bajar los
    cupos puede dar 400: limitación transitoria aceptada (Q22).

- `httpApi.ts` y `mockApi.ts` guardan el JWT en `localStorage` (`tmu.token`): choca con el
  principio 5. Lo corrige la spec 007 (RF-2).
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
  - Criterio de la spec que depende de la 007: etiqueta de datos simulados con el servidor
    real en la distancia y el puntaje (casilla sin marcar a propósito).
  - Distancias y puntajes de LoL y R6 difieren entre el servidor y el modo simulado del
    navegador hasta que la 007 adopte DP-26 (decisión del usuario).

## Decisiones recientes

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
  - Orden: la siguiente spec es la 006; la 007 no se toca hasta entonces.

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
  - Spec 007: no se toca; textos pendientes anotados en su fila de «Estado de las specs».

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
  - P5: el JWT en `localStorage` del frontend lo corrige la spec 007 (RF-2).
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
- Spec 007: si hay CORS con orígenes distintos, hará falta
  `Access-Control-Expose-Headers: X-CSRF-Token`.

- Frontend (spec 009): regla única del título en el dominio (`sessionRules.ts`), usada
  por la edición del detalle y por el formulario de creación de la agenda.
- `limitToCodePoints` (D-29) funciona como `maxLength` contando puntos de código: solo
  entra lo insertado que cabe y los emojis compuestos entran enteros o no entran. La
  selección se lee en el `beforeinput` nativo (D-30).
- Las pruebas del dominio del frontend usan el gancho de resolución de la 007 (por los
  imports sin `.ts`).

## Avisos

- npm bloquea los install-scripts de `bcrypt`. No afecta en linux-x64 (trae el binario ya
  compilado); en otra plataforma, ejecutar `npm install-scripts approve bcrypt`.
- Cada `backend/.env` local necesita la línea `JWT_SECRET` (copiarla de `.env.example`).
- Windows: MongoDB nativo en `127.0.0.1:27017`; `npm test --script-shell=bash`.
- La reversión de `specs/007-integrar-frontend/spec.md` está completa: a 2026-10-18
  `git status` y `git diff --stat` no lo muestran modificado (no hace falta
  `git checkout`).
- Los `.DS_Store` (raíz y `frontend/`) no deberían subirse.

## Próximo paso

Orden acordado, antes de la 006:

1. Hecho: prueba sin red tras el rework, 1567/1567 en verde (usuario, 2026-10-19).
2. Hecho: `withExistingUser.test.ts` renombrado a `backend/tests/unit/withUser.test.ts`.
3. En curso: los commits los hará el coordinador separando el rework de la 004 y los
   cambios A y B de la 005 (hoy todo está en el árbol de trabajo; los últimos commits son
   `31fdda2` y `61f7c38`).

Después: spec 006 (`/sdd-implement 006 T1`; amplía la cascada de la 004). En paralelo,
aprobar el plan y las tareas de la 007 e implementarla (T1–T26); la 007 incluye alinear los
textos que imita su modo simulado (los de la 004 en minúscula y los de la 005) y el 401
«token inválido», y la etiqueta visible de datos simulados (RF-37 de la 004). Después, la
tarea de enlaces de la 008 (T9) y el resto de la 008; después, la 009 desde su T0
(`/sdd-implement 009-detalle-de-sesion T0`). Adaptar el frontend queda para la spec 007,
después de las 004 a 006, por decisión del usuario.
Requisito local para ejecutar los tests
del backend: `backend/.env` (copiado de `.env.example`, con `JWT_SECRET`) y MongoDB en
`mongodb://127.0.0.1:27017`.

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
