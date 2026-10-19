# Tareas 005 — Coincidencias en el servidor
Estado: aprobadas (2026-10-17), con precondición: las specs 001 a 004 deben estar
implementadas (`backend/` aún no existe) y el plan de la 003 debe confirmar el modelo
`User` que asume el plan de la 005 antes de empezar T1.
Spec: `spec.md` (aprobada el 2026-10-17). Plan: `plan.md` (aprobado el 2026-10-17).

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
`backend/` aún no existe (comprobado el 2026-10-17). Si falta algo, parar y reportarlo.

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
    texto; credencial de usuario eliminado → 401 "sesión no iniciada" (no 404); cada 400
    con su texto exacto; orden de RF-16 (juego inválido + distancia `abc` → juego;
    distancia + horas inválidas → distancia; sin cuenta + horas `169` → 400 de horas);
    sin cuenta → 404 "No tienes una cuenta vinculada en este juego."; `page=2` y
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
