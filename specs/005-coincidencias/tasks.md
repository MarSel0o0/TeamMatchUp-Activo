# Tareas 005 — Coincidencias en el servidor
Estado: **hechas (2026-10-19); validadas por reviewer** (T1–T10; APROBADO; 1567 tests en
verde). Aprobadas el 2026-10-19. T1 a T8 se aprobaron el 2026-10-17 (con precondición: las
specs 001 a 004 implementadas y el plan de la 003 confirmando el modelo `User`; cumplida, T1 a
T8 están hechas); T9 y T10, de los cambios A y B, se aprobaron el 2026-10-19 y están hechas.
Spec: `spec.md` (aprobada el 2026-10-17; cambios A y B aprobados el 2026-10-19). Plan:
`plan.md` (aprobado el 2026-10-17; cambios A y B aprobados el 2026-10-19).
**Cambio A (2026-10-19): aprobado.** RF-13 → 401 "token inválido", por RF-44 de la spec 004
(DP5-16). T1 a T8 quedan como históricas (hechas y validadas con el RF-13 y los textos
anteriores); se añade **T9**. Decisión A1: el segundo intervalo de carrera (borrado entre la
lectura de la disponibilidad y la de la cuenta) se acepta como riesgo; T9 no lo prueba ni
reordena `loadMatchInputs`.
**Cambio B (2026-10-19): aprobado.** Textos de error en minúscula inicial y sin punto final
(DP5-17, DP-6 de la spec 004); se añade **T10** (una sola tarea, B4).

**Orden de ejecución global (con las tareas de la spec 004; seguido y cumplido, todas hechas):**
T9 de esta spec → tareas de la 004 (T11 a T25, en el orden de su `tasks.md`; la T24 de la 004
solo después de T9) → T10 de esta spec. T10 fue **después** de la T11 de la 004 (textos
exactos de la 004: RF-5 debe coincidir con `juego no válido`).

Reglas para cada tarea: tests primero (en rojo), después el código, `npm test` y
`npm run typecheck` en verde en `backend/`, marcar la tarea y parar. Sin `any`,
`@ts-ignore` ni `.only`. Ninguna dependencia ni variable de entorno nueva. Comando de
verificación de todas las tareas, salvo que se indique otro:

```
cd backend && npm test && npm run typecheck
```

Precondición de T1: specs 001, 002, 003 y 004 implementadas, con los archivos y nombres
de la sección 0 del plan (`withUser`, `withExistingUser`, `GameAccount` con su `toJSON`,
`User` con `availability`, `loginAs`, `nonExistingId`, `rankScale.ts`, `games.ts`).
Cumplida: `backend/` existe y las specs 001 a 004 están implementadas (antes de empezar T1 el
2026-10-17 `backend/` aún no existía; se esperó a que estuvieran implementadas). Si falta
algo, parar y reportarlo.

- [x] **T1. Lectura de filtros y textos de error.** RF-5, RF-11, RF-12, RF-14, RF-15, RF-16 (filtros), RF-18, RNF-1
  - Tests primero: `backend/tests/unit/matchQuery.test.ts` — los casos de `readFilterValue`,
    `parseValidInteger` y `parseMatchQuery` del plan, sección 8 (incluidos `007`, `-0`,
    `1e1`, `0x10`, ` 5 `, 400 dígitos, `game=constructor`, `game=__proto__`, valores
    `malformed`, parámetros desconocidos, búsqueda recortada) y el orden de RF-16 con un
    caso por salto; cada error con el texto exacto del plan, sección 6.
  - Archivos: `backend/src/domain/matchQuery.ts`.
  - Hecho cuando: `matchQuery.test.ts` en verde y `matchQuery.ts` no importa `express`,
    `mongoose` ni usa `Date`.

- [x] **T2. Bloques en común ordenados.** RF-3 (bloques), DP5-9, RNF-1
  - Tests primero: `backend/tests/unit/availability.test.ts` (crear o ampliar) — sin
    traslape, traslape parcial, listas vacías, repetidos, entradas desordenadas → orden por
    día y hora numérico (`0-5` antes que `0-23`), texto que no es bloque ignorado;
    `compareBlocks` y `parseBlock`.
  - Archivos: `backend/src/domain/availability.ts` (crear; si existe, reemplazar solo
    `intersectBlocks` y agregar `parseBlock`/`compareBlocks` sin romper lo existente).
  - Hecho cuando: `availability.test.ts` en verde y las pruebas previas de la 003 que
    usen ese archivo siguen verdes.

- [x] **T3. Distancia y puntaje exactos.** RF-3 (distancia y puntaje), DP5-7, RNF-1
  - Tests primero: `backend/tests/unit/matching.test.ts` (describe "distancia" y
    "puntaje") — ejemplos del plan, sección 3.3 ((0,4) = 78, (0,8) = 100, (25,0) = 0,
    (24,0) = 2, (1,1) = 58, (2,3) = 67); recorrido d = 0..100 × b = 0..168 contra la
    referencia en `BigInt` del plan, sección 8, y resultado en 0..100; `rankDistance`
    simétrica; mismo escalón con distintos puntos (fotografías con `normalizeStep` de la
    004) → 0, en los tres juegos.
  - Archivos: `backend/src/domain/matching.ts` (`rankDistance`, `scoreCandidate`).
  - Hecho cuando: los dos describe en verde, sin `Math.round` ni decimales en
    `scoreCandidate`.

- [x] **T4. Búsqueda, filtros, exclusión, orden y armado.** RF-2, RF-4, RF-7, RF-8, RF-9, RF-17, DP5-8, DP5-11, DP5-12, RNF-1
  - Tests primero: `matching.test.ts` (describe "búsqueda", "filtros", "orden",
    "armado") — búsqueda literal con `a.b`, `.*`, `(`, `[`; `ÑANDÚ` → `Ñandú`; `nandu` y
    `a` (también contra `á` en NFD) no coinciden; `null` no filtra; distancia igual al
    máximo y bloques iguales al mínimo se conservan; solo verificadas; el propio usuario
    excluido aunque venga en la entrada; cada nivel de desempate de RF-2;
    `compareByCodePoint("～", "\u{1F600}") < 0` y prefijo más corto primero;
    `assembleCandidates` omite cuentas sin dueño; candidato con `gameId` del criterio y la
    misma cuenta recibida.
  - Archivos: `backend/src/domain/matching.ts` (`foldText`, `matchesSearch`,
    `compareByCodePoint`, `compareCandidates`, `assembleCandidates`, `buildMatches`).
  - Hecho cuando: `matching.test.ts` completo en verde.

- [x] **T5. Lectura de datos para el motor.** RF-4, RF-6, RF-13, RF-17, DP5-10
  - Tests primero: `backend/tests/controllers/matchInputs.test.ts` — usuario sin cuenta
    en el juego → `noAccount`; usuario borrado → `noSession`; la propia cuenta no está entre
    los candidatos; cuenta con `user = nonExistingId()` omitida; usuario del candidato con
    exactamente `id, username, displayName, avatarColor, bio, timezone, createdAt` (ISO);
    cuentas con `simulated: true` y sin `matches` ni `readingNumber`; bloques del
    candidato y del usuario leídos de `availability`.
  - Archivos: `backend/src/services/matchInputs.ts` (`loadMatchInputs`,
    `toCandidateUser`; tipo `GameAccountJson` si la 004 no lo exporta).
  - Hecho cuando: `matchInputs.test.ts` en verde con `after(() => mongoose.connection.close())`.

- [x] **T6. Endpoint `GET /api/matches`: sesión, errores y respuesta.** RF-1, RF-3, RF-5, RF-6, RF-12, RF-13, RF-14, RF-15, RF-16, RF-18, RNF-2
  - Tests primero: `backend/tests/controllers/matches.test.ts` (describe "sesión",
    "errores", "respuesta") — 401 sin credencial, alterada, sin CSRF y expirada con su
    texto; credencial de usuario eliminado → 401 "sesión no iniciada" (no 404; histórico:
    lo sustituye T9, que espera "token inválido"); cada 400
    con su texto exacto; orden de RF-16 (juego inválido + distancia `abc` → juego;
    distancia + horas inválidas → distancia; sin cuenta + horas `169` → 400 de horas);
    sin cuenta → 404 "No tienes una cuenta vinculada en este juego." (histórico: los
    textos de error los sustituye T10); `page=2` y
    `user=<id>` ignorados; un 200 con forma exacta del candidato (claves del candidato,
    del usuario y de la cuenta; sin `email`, `passwordHash`, `matches` ni
    `readingNumber`; `simulated: true`; `gameId` presente).
  - Archivos: `backend/src/controllers/matches.ts`, `backend/src/app.ts` (montar
    `/api/matches`).
  - Hecho cuando: los tres describe en verde y `app.test.ts` de la 001 sigue verde.

- [x] **T7. Pruebas de aceptación de filtros y orden por RF.** RF-2, RF-4, RF-7, RF-8, RF-9, RF-11, RF-17, RNF-3, casos límite de R6 y de DP-26
  - Tests primero: `matches.test.ts` (describe "filtros y orden") con datos armados a mano
    (fotografías con `ladder`/`normalizeStep`, verificada y disponibilidad elegidas por la
    prueba) y valores esperados escritos antes de ejecutar: orden por puntaje y cada
    desempate; no aparezco; sin filtros = distancia 100 y horas 0; distancia máxima y
    mínimo de horas en el límite; solo verificadas en `lol`, `r6` y `cs2`; búsqueda
    `ÑANDÚ` y `.*`; usuario de la sesión sin disponibilidad (todos con 0 bloques); R6 con
    distancia, filtro y puntaje como LoL y CS2; mismo escalón con distintos puntos →
    distancia 0; cuenta sin dueño omitida con 200; lista vacía con 200; ninguna respuesta
    contiene `Riot`, `Ubisoft`, `Valve` ni `FACEIT`.
  - Archivos: solo pruebas. Si alguna falla, se corrige el código de T3–T6 dentro de esta
    tarea sin cambiar el plan; si la corrección exige cambiar el plan, parar y reportarlo.
  - Hecho cuando: `matches.test.ts` completo en verde. (Estas pruebas pueden pasar al
    primer intento porque verifican código ya probado por partes; se escriben igualmente
    antes de mirar la salida.)

- [x] **T8. Peticiones manuales y verificación final.** RNF-1, RNF-3, RNF-4
  - Archivos: `backend/requests/matches.rest` (login → coincidencias de `lol` sin
    filtros → con los cinco filtros → `maxRankDistance=abc` → juego sin cuenta, con
    `X-CSRF-Token`).
  - Comprobaciones: suite completa sin conexión a Internet (solo MongoDB local);
    `git diff backend/package.json backend/.env.example` sin dependencias ni variables
    nuevas; búsqueda de `express`, `mongoose`, `Date`, `Math.random` y `process.env` en
    `src/domain/matchQuery.ts`, `availability.ts` y `matching.ts` sin resultados; cada
    fila de la trazabilidad del plan (sección 10) tiene su prueba en verde.
  - Hecho cuando: `npm test` y `npm run typecheck` en verde y todas las casillas de
    "Criterios de finalización" de la spec, salvo la de la spec 007, se pueden marcar.
    (Histórico: con el RF-13 anterior. Tres casillas se reabrieron el 2026-10-19; las
    vuelve a marcar T9.)

- [x] **T9. Adaptar la 005 a RF-44 de la 004: 401 "token inválido" para usuario eliminado.** RF-13 (sin cambio de comportamiento en RF-1 ni RF-6)
  - Aprobada (2026-10-19). Primera tarea pendiente en el orden global. Decisión A1: no se
    prueba ni se corrige el segundo intervalo de carrera (borrado entre la lectura de la
    disponibilidad y la de la cuenta, que da 404 por la cascada de la 004).
  - **Dependencia de orden con la spec 004 (obligatoria):** `backend/src/controllers/matches.ts`
    importa hoy `createWithExistingUser` de `backend/src/utils/middleware.ts`, que la spec
    004 rehecha quiere retirar junto con `missingUserError`. T9 debe hacerse **antes** de que
    la 004 retire esos exports, o en el mismo paso; si la 004 los retira primero,
    `matches.ts` deja de compilar y T9 tendría que rescatarse. Al terminar T9, ni `matches.ts`
    ni sus pruebas importan `createWithExistingUser` ni `withExistingUser`.
  - Tests primero (en rojo, antes de tocar el código): en
    `backend/tests/controllers/matches.test.ts`, describe "sesión":
    1. **Reescribir** (no añadir otra) la prueba "credencial de usuario eliminado → 401
       \"sesión no iniciada\", no 404 (RF-13)" para esperar 401 con
       `SESSION_MESSAGES.invalidToken` ("token inválido"); y la variante "con consulta
       inválida" (`?game=nada`) para esperar también "token inválido".
    2. Rama `noSession`: borrado intercalado entre la guardia y la lectura de datos →
       401 "token inválido" (no 404 ni 500). Se fuerza con `mock.method` de `node:test`
       sobre `User.exists` (plan, sección 8) y `mock.restoreAll()` en `afterEach`. Si no es
       viable, parar y reportar; queda entonces solo la prueba de servicio de
       `matchInputs.test.ts` (`noSession`).
    3. Conservar el 404 de RF-6 ("No tienes una cuenta vinculada en este juego.") como caso
       aparte: usuario existente sin cuenta en el juego → 404, y el usuario eliminado con
       cuenta → 401 "token inválido" (no 404).
    Las pruebas 1 y 2 deben fallar antes del cambio (hoy responden "sesión no iniciada" o 404).
  - Archivos: `backend/src/controllers/matches.ts` (importar `createWithUser` en lugar de
    `createWithExistingUser`; `router.use(createWithUser({ jwtSecret, now }))`; `noSession` →
    401 con `SESSION_MESSAGES.invalidToken`; actualizar el comentario de cabecera);
    `backend/tests/controllers/matches.test.ts`. `backend/src/services/matchInputs.ts` y su
    prueba solo si procede: no cambian (el servicio devuelve `noSession` sin conocer el
    texto). `utils/middleware.ts` **no** se toca (lo retira la 004). Sin dependencias ni
    variables nuevas.
  - Hecho cuando: las pruebas de arriba en verde; `matches.ts` no importa
    `createWithExistingUser`; ninguna prueba de la 005 espera "sesión no iniciada" salvo las de
    ausencia de credencial (RF-1); y se pueden volver a marcar en la spec las tres casillas
    reabiertas (prueba por RF con texto exacto, prueba de RF-13 y "Comprobación de tipos y
    pruebas del servidor en verde").
  - Verificación: `cd backend && npm test && npm run typecheck`.

- [x] **T10. Alinear los textos de error de la 005 con DP-6 de la 004.** RF-5, RF-6, RF-12, RF-14, RF-15, DP5-3, DP5-17
  - Aprobada (2026-10-19, cambio B; una sola tarea por la respuesta B4). **Depende de la T11
    de la spec 004** (textos exactos de la 004): RF-5 debe coincidir con `juego no válido` de
    la 004. Se ejecuta después de la T9 de esta spec y después de las tareas de la 004 (orden
    global, arriba). Sin dependencias ni variables nuevas.
  - Tests primero (en rojo, antes de tocar el código): **aserciones por literal**, escritas
    tal como están en el plan, sección 6 (no importadas de `MATCH_ERRORS`):
    1. `backend/tests/unit/matchQuery.test.ts`: cada error de `parseMatchQuery` con su
       literal: `juego no válido`; `filtro «Diferencia máxima de rango» no válido: usa un
       número entero de 0 a 100`; `filtro «Horas en común por semana» no válido: usa un
       número entero de 0 a 168`; `filtro «Solo cuentas con rango verificado» no válido: usa
       true o false`; `filtro «Buscar jugador» no válido`. Se **sustituyen** las aserciones
       que importan `MATCH_ERRORS` o escriben el texto anterior (con mayúscula inicial y punto
       final); no se añaden otras. Se incluye el literal `no tienes una cuenta vinculada en
       este juego` de `noAccount` (por ejemplo, comprobando el valor de
       `MATCH_ERRORS.noAccount`), pues `parseMatchQuery` no lo devuelve.
    2. `backend/tests/controllers/matches.test.ts`: por HTTP, el 400 de juego (`LOL`, ` lol `,
       vacío, repetido, ausente), de distancia máxima, de mínimo de horas, de solo
       verificadas y de búsqueda repetida, y el 404 de RF-6, cada uno con su literal exacto;
       los 401 de RF-1 y RF-13 no cambian.
    Todas deben fallar antes del cambio (hoy responden con mayúscula inicial y punto final).
  - Archivos: `backend/src/domain/matchQuery.ts` (las seis cadenas de `MATCH_ERRORS` y su
    tipo, en la forma de la sección 6; sin otro cambio); `backend/tests/unit/matchQuery.test.ts`;
    `backend/tests/controllers/matches.test.ts`; revisar `backend/requests/matches.rest`
    (comentarios o ejemplos que citen los textos anteriores). `controllers/matches.ts` y
    `services/matchInputs.ts` no cambian (usan `MATCH_ERRORS.noAccount` sin copiar el texto).
  - Hecho cuando: las aserciones de arriba en verde; ningún texto anterior (`Juego no
    válido.`, `Filtro «`, `No tienes una cuenta vinculada`) queda en `backend/src/`,
    `backend/tests/` ni `backend/requests/matches.rest`; ninguna aserción de texto de error
    importa `MATCH_ERRORS`; y se pueden volver a marcar en la spec las casillas reabiertas
    que dependan de los textos (prueba por RF con el texto exacto y "Comprobación de tipos y
    pruebas del servidor en verde"), junto con las que cierre T9.
  - Verificación: `cd backend && npm test && npm run typecheck`.
