# Tareas 008 — Vista nueva: ficha de jugador
Estado: aprobado (2026-10-18): "Apruebo las tareas". Decisiones del usuario sobre las
preguntas de las tareas (Q1 y Q2) en la sección final.
**Estado (2026-10-20): T1 a T11 hechas.** T10: registro hecho (`validation.md`,
sección 4) con D10-1 y D10-2 abiertos (contraste de componentes de la 007 reutilizados, RNF-5;
cambio aparte para toda la app, P60) y NVDA pendiente del usuario (4.8). Decisiones del usuario
sobre el resto (2026-10-20): C10-1 → **cambio B de la spec** (RNF-5 exime el texto de los
controles deshabilitados, P65), **aprobado (2026-10-20, por el usuario: "Apruebo el cambio
B")**; D10-3 → textos a `copy.ts` en **T11** (P66). Las Preguntas 11 a 13 del plan (sección 14)
las respondió el usuario el 2026-10-20 (opción a en las tres) y están aplicadas en T11;
**preguntas abiertas: ninguna; T11 lista para empezar.** La 008 no pasa a "implementada"
mientras D10-1 y D10-2 sigan abiertos. Con T11 hay 11 tareas (una más que el máximo de Q2), por
encargo expreso del usuario.
**Cambio A (revisión de coherencia contra el código, P50 a P62) aprobado (2026-10-20, por
el usuario: "Apruebo el cambio A")** (plan, secciones 11 y 12). Las Preguntas 4 a 10 del plan
las respondió el usuario el 2026-10-20 (opción a en todas) y están aplicadas en las tareas
que dependen de ellas; preguntas abiertas: ninguna. La T1 se hizo tras el cambio A (cambio A
aprobado el 2026-10-20).
Spec: `specs/008-ficha-de-jugador/spec.md` (aprobada el 2026-10-18). Plan:
`specs/008-ficha-de-jugador/plan.md` (aprobado el 2026-10-18: "Apruebo el plan").

## Dependencias externas (antes de T1)
- **Plan 007 aprobado y spec 007 con T1 a T26 hechas** (plan 008, sección 0 y decisión de la
  Pregunta 1). **Cumplido (2026-10-20, P51):** la 007 está implementada, T1–T31. La 008 usa, sin crearlas: `execute` (plazo de 30 s, descarte de respuestas
  tardías, 401), `ApiError` con `status` y `hasMessage`, `isSessionCleared`,
  `shared/utils/copy.ts`, `DemoTag`, `Failure` con `title`, `PublicUser`,
  `GameAccount.simulated`, `domain/rankScale.ts`, `domain/matching.ts` (`rankDistance`),
  `domain/availability.ts` (`parseBlock`, `compareBlocks`, `intersectBlocks`,
  `groupBlocks`, `formatRange`, `GRID_HOURS`), `domain/rankProgress.ts`
  (`rankGainSinceFirst`), `domain/proposal.ts` (`blockReason`, `buildProposal`,
  `sharedRuns`, `PROPOSAL_DEFAULTS`), `profile.getAvailabilityOf`, `queryClient` sin reintentos y sin
  refresco al enfocar ni al reconectar, claves `['u', userId, …]`, `isProtectedPath`,
  `ProtectedRoute` y la recepción de la propuesta en la agenda (007 RF-30, T26).
  **Al empezar cada tarea**, el implementer comprueba que las piezas que esa tarea usa
  existen con la firma del plan 008. Si falta alguna o tiene otra firma, **para y lo
  reporta**; no la crea dentro de la 008.
- **Solo T10 (parte con servidor real)** necesita además las specs 005 (`/api/matches`) y
  006 (`/api/sessions`) implementadas en `backend/`, la 007 completa (hasta su T29), MongoDB
  local y `backend/.env`. T1 a T9 se comprueban en modo simulado y con `typecheck`, `lint`
  y `build`. Estado (2026-10-20, P51): 005 y 006 implementadas el 2026-10-19 y la 007
  completa (T1–T31); faltan solo MongoDB local y `backend/.env` en la máquina de validación.
- Esta spec **no cambia el servidor**. El único archivo de `backend/` que se toca es
  `backend/requests/users.rest` (T9; P45). Si una tarea descubre que el servidor no cumple
  lo que el plan toma de él (rutas, códigos, textos), parar y reportar (riesgo R-7).

## Reglas para cada tarea
- Una tarea = una llamada al implementer; en orden. Marcar la tarea y parar.
- **Comprobaciones con Node primero (en rojo)** en las tareas con reglas puras o de backend
  simulado (T1, T2, T3), según el plan, sección 6: el implementer escribe antes el script
  en el scratchpad con la tabla de casos y el valor esperado de cada uno (`node --test`
  dentro del script), lo ejecuta contra el módulo vacío o inexistente y anota el rojo,
  implementa y lo repite hasta el verde. El script no se versiona; su texto y las dos
  salidas (rojo y verde) se pegan en `specs/008-ficha-de-jugador/validation.md`. Los
  módulos con imports sin extensión o con `@/` se cargan con un gancho de resolución como
  el de la 007 (`module.register`: añade `.ts` y resuelve `@/`). Corrección P54: la
  `validation.md` de la 007 solo **describe** ese gancho (`hooks.mjs`/`register.mjs`); su
  código no está en el repositorio. Decisión del usuario (2026-10-20): opción a, Pregunta 5
  del plan. En T1 el implementer reescribe el gancho en el scratchpad a partir de esa
  descripción y pega su texto completo (`hooks.mjs` y `register.mjs`) en
  `specs/008-ficha-de-jugador/validation.md`; no se versiona como archivo, y T2, T3 y T10
  reutilizan ese texto. Cuando el grafo de imports incluye TypeScript que no es solo de
  tipos, Node se ejecuta además con `--experimental-transform-types` (plan 6, punto 1);
  en T3 es obligatorio (`mockApi.ts` → `httpClient` → `transport.ts`, cuyo `ApiError` usa
  propiedades de parámetro). `mockUserTarget.ts` y `tabKeys.ts` no tienen imports y se
  cargan directo. En T3 el script carga además `mockApi.ts` con sustitutos de
  `localStorage` e `import.meta.env` (decisión del usuario Q1); si no carga, el
  implementer para y lo reporta.
- **Verificación estándar de toda tarea, en verde** (RNF-4; constitución, principio 4):
  ```
  cd frontend && npm run typecheck && npm run lint && npm run build
  ```
  y la aplicación arranca en modo simulado (`VITE_USE_MOCK_API=true npm run dev`) sin
  errores de consola. `cd backend && npm test` no aplica a ninguna tarea: ninguna toca el
  servidor (T9 solo edita un archivo `.rest`).
- Sin `any`, `@ts-ignore`, `.only`, `dangerouslySetInnerHTML` ni `innerHTML`; sin colores
  escritos a mano (solo variables de `styles/tokens.css`); ninguna dependencia ni variable
  de entorno nueva; identificadores en inglés y textos en español.
- Los textos literales de la ficha viven solo en `shared/utils/copy.ts` (plan 4.6); el
  dominio devuelve códigos. Los que ya existen (motivos 3 a 6 en `PROPOSAL_BLOCK_REASONS`,
  `SIMULATED_LABEL`, `NO_MESSAGE_TEXT`) se reutilizan y no se copian; "Reintentar" lo pone
  `Failure` (P57). "Sin datos" es `NO_DATA_TEXT`, que añade T2; ningún archivo nuevo ni
  modificado de la 008 lo escribe como literal (P62).
- Ninguna función pura importa React, `fetch`, almacenamiento ni lee el reloj; ninguna
  recibe "hoy" (plan, sección 2: la semana tipo no tiene fecha).
- No se cambia el aspecto ni el comportamiento del perfil ni de coincidencias, salvo los
  enlaces de RF-2 (T9). T9 cambia además en `MatchEntry.tsx` el literal "Sin horas en común
  esta semana." por la constante de `copy.ts` que añade T6, sin ningún efecto visible (mismo
  texto, mismo elemento y misma clase; decisión del usuario (2026-10-20): opción a, Pregunta
  9, P61). Del mismo modo, los literales "Sin datos" pasan a `NO_DATA_TEXT` (que añade T2)
  sin ningún efecto visible (mismo texto, mismo elemento y misma clase): en T5, los tres de
  `ProfilePage.tsx` (salen con el bloque que pasa a `GameSummaryPanel`), el de
  `AccountRow.tsx` y el de `RankScale.tsx` (vía `formatRankGain`); en T9, los dos de
  `MatchEntry.tsx` (decisión del usuario (2026-10-20): opción a, Pregunta 10, P62). Los
  comentarios que mencionan "Sin datos" no se cambian. T11 cambia del mismo modo, sin ningún
  efecto visible (mismo texto, mismo elemento, misma clase y mismo atributo), los textos de
  D10-3 (plan 4.6, P66) en los componentes de la ficha y en `GameSummaryPanel.tsx` (que usa
  también el perfil: "Posición en la escala del juego", "lectura registrada"/"lecturas
  registradas", "Primera lectura:", "Últimas partidas" y "ganadas"), y, fuera de la ficha
  (decisiones del usuario (2026-10-20): opción a en las Preguntas 11, 12 y 13): en
  `ProfilePage.tsx`, "se inscribió" del encabezado del perfil → `JOINED_TEXT`; en
  `MatchEntry.tsx`, `pluralize(…, 'hora', 'horas')` de la columna "En común" → `HOUR_UNIT` y
  "Δ {n} pts" de la columna de rango → `rankDistanceText(n)`; en `HoursSheet.tsx`, la leyenda
  "Horas en común" → `SHARED_HOURS_TITLE`; y en la portada (`CrossingVisual.tsx`, que pinta
  `LandingPage`), la etiqueta "Horas en común" del círculo `horario` → `SHARED_HOURS_TITLE`
  (decisión del usuario (2026-10-20): "Incluir la portada", P67). Ningún otro texto, estilo,
  estructura ni lógica del perfil, de coincidencias ni de la portada cambia.

## Tareas

- [x] **T1. Reglas puras de la ficha (`playerSheet.ts`).** RF-4, RF-6, RF-7, RF-9, RF-10, RF-12, RF-13, RF-15, RF-17, RF-19, RF-20, RF-22, RF-23, RNF-6
  - Objetivo: todas las decisiones de la ficha como funciones puras comprobables con Node.
  - Archivos: `frontend/src/domain/playerSheet.ts` (nuevo);
    `specs/008-ficha-de-jugador/validation.md` (nuevo: esqueleto con fecha, commit, versión
    de Node, secciones "Comprobaciones con Node", "Revisiones de código", "Modo simulado" y
    las seis partes del orden de P42 más "Fuera del orden").
  - Pasos:
    1. Comprobar que existen `intersectBlocks`, `groupBlocks`, `rankDistance`,
       `blockReason`, `buildProposal` y `GAME_IDS` con la firma del plan (sección 2, con los
       tipos corregidos por P58: `GAME_IDS` es `GameId[]`, `groupBlocks` recibe
       `TimeBlock[]`) y que `sharedRuns` está exportada en `domain/proposal.ts`. Reescribir
       en el scratchpad el gancho de resolución de Node (`hooks.mjs` y `register.mjs`) a
       partir de la descripción de la `validation.md` de la 007 (añade `.ts` a los imports
       relativos sin extensión y resuelve `@/` contra `TMU_SRC`) y pegar su texto completo en
       `validation.md`; no se versiona (decisión del usuario (2026-10-20): opción a,
       Pregunta 5, P54).
    2. Escribir el script con **todos** los casos del plan 6.1 de `sharedHours` +
       `proposeState` (recorrido martes 20–22 + jueves 3; 00:00 y 12:00; serie de 6 h;
       tramo 10–14 → 12:00 y 2 h; martes 23 + miércoles 0; miércoles 0 y 12;
       solo 02:00–11:00), y con los bloques en común de cada uno de esos casos
       `groupBlocks` frente a `sharedRuns`: mismo número de tramos, mismo día y misma hora
       de inicio tramo a tramo, y `endHour` de `groupBlocks` = el de `sharedRuns` + 1
       (decisión del usuario (2026-10-20): opción a, Pregunta 6, P53); `sharedHours` sin
       cruce o con una lista `[]` → `ranges` `[]` y `total` 0; los seis motivos (el 2 en `lol`, `r6` y `cs2`), carga, fallo,
       motivo 1 con datos cargando, habilitado; `resolveTab` (incluidos `'LOL'`, `'xyz'`,
       `'constructor'`, juego sin cuenta, pestaña que desaparece, `[]` con y sin juego);
       `playerPageState` (400, 404, 404 con cuentas 200 `[]`, 500, 0, loading, ready);
       `isOwnPlayerRef` (`me`, `ME`, `Me`, `' me'`, `USER-3`, `User-3`, `USER-5`, ObjectId
       en mayúsculas); `zonesDiffer`; `distanceView` (40/52 → 12, 0, `noOwnAccount`
       aunque el resumen falle, `noData`, `failed ownAccounts`, `loading`, `simulated`);
       `readNormalized` y `readWinRate` (ausente, `null`, `'50'`, `NaN`, 0, 100).
    3. Ejecutarlo en rojo; implementar `Loadable`, `isOwnPlayerRef`, `playerTabs`,
       `resolveTab`, `playerPageState`, `sharedHours`, `zonesDiffer`, `readNormalized`,
       `readWinRate`, `distanceView`, `SheetBlockReason`, `ProposeState` y
       `proposeState` según el plan 3.1 a 3.3, delegando en las funciones de la 005/007
       (sin reimplementar intersección, agrupado, distancia ni primer bloque) y comparando
       con `GAME_IDS.find((g) => g === requested)`, no con `isGameId` ni con `includes`
       (que no compila con `requested: string`; P58).
    4. Ejecutarlo en verde y pegar script y salidas en `validation.md`.
  - Hecho cuando: el script da verde en todos los casos del plan 6.1 de estas funciones,
    incluida la comparación `groupBlocks` frente a `sharedRuns` (y el rojo previo está
    anotado); el texto completo del gancho (`hooks.mjs` y `register.mjs`) está en
    `validation.md` y no hay ningún archivo del gancho versionado; `playerSheet.ts` no importa React, `fetch`, `Date` ni
    almacenamiento, y no contiene una intersección, agrupado ni cálculo de distancia
    propios (búsqueda anotada); verificación estándar en verde.

- [x] **T2. Utilidades puras: diferencia de rango, teclas de pestaña, rutas y destino del simulado.** RF-1, RF-2, RF-4, RF-11, RF-15, RF-17, RF-20, RNF-2
  - Objetivo: las piezas puras pequeñas que usan la página, `GameTabs` y el mock.
  - Archivos: `frontend/src/shared/utils/copy.ts` (mod.: solo `NO_DATA_TEXT = 'Sin datos'`
    y la cabecera, de "Textos literales que fija la spec 007" a "Textos literales que fijan
    las specs 007 y 008"; P62), `frontend/src/domain/rankProgress.ts` (mod.: `formatRankGain`,
    que importa `NO_DATA_TEXT` de `@/shared/utils/copy`),
    `frontend/src/shared/utils/tabKeys.ts` (nuevo, sin imports),
    `frontend/src/app/routes.ts` (mod.: `ROUTES.player = '/jugadores/:userId'`,
    `PLAYER_TAB_PARAM = 'juego'`, `playerPath`, prefijo `/jugadores/` en
    `isProtectedPath`), `frontend/src/services/mock/mockUserTarget.ts` (nuevo, sin
    imports: `MOCK_USER_ID_PATTERN`, `resolveMockUserTarget`); `validation.md`.
  - Pasos: script primero con los casos del plan 6.1 de `formatRankGain` (7, 0 → "▲ +0 pts
    desde la primera lectura", −5 con U+2212, `null` → "Sin datos"), `nextTabIndex`
    ((ArrowRight, 2, 3) → 0, (ArrowLeft, 0, 3) → 2, Home, End, `'a'` → null),
    `playerPath` (`('user-3','r6')` → `/jugadores/user-3?juego=r6`; `' me'` codificado;
    sin juego, sin `?`), `isProtectedPath('/jugadores/x')` → true, y
    `resolveMockUserTarget` (`'USER-5'` → ok `user-5`; `'user-999999'` y `'USER-999999'` →
    ok; `'abc'`, `'ME'`, `' me'`, `'user-'`, `'user-3 '` → no ok; `'me'` → own; `'USER-3'`
    con sesión `user-3` → own); rojo; implementar (primero `NO_DATA_TEXT` y la cabecera en
    `copy.ts`; después `formatRankGain`, cuyo `null` devuelve `NO_DATA_TEXT`, sin literal
    "Sin datos" propio; P62); verde; pegar en `validation.md`. `rankProgress.ts` se carga
    con el gancho de T1 (resuelve `@/`). `RankScale` y los demás literales "Sin datos"
    todavía no cambian (T5 y T9).
  - Hecho cuando: el script da verde en todos esos casos con el rojo previo anotado, y
    comprueba además que `formatRankGain(null) === NO_DATA_TEXT` importado de `copy.ts`;
    `rankProgress.ts` no contiene el literal "Sin datos" fuera de comentarios y `copy.ts`
    tiene `NO_DATA_TEXT` y la cabecera nueva (revisión anotada); el
    signo de "▼ −n" es U+2212 (comprobado en el script por código de carácter);
    `mockUserTarget.ts` y `tabKeys.ts` no tienen ningún `import`; verificación estándar en
    verde.

- [x] **T3. Contrato, cliente HTTP y backend simulado de las operaciones de la ficha.** RF-11, RF-24, RNF-3
  - Objetivo: `users.get`, `users.listAccounts` y `users.getGameSummary` en el contrato
    único, con el servidor y con el mock, y `profile.getAvailabilityOf` (007) con la
    regla de mayúsculas del simulado.
  - Archivos: `frontend/src/services/apiContract.ts`, `frontend/src/services/http/httpApi.ts`,
    `frontend/src/services/mock/mockApi.ts`; `validation.md`.
  - Pasos:
    1. Comprobar en `backend/src/controllers/users.ts`, `accounts.ts`,
       `backend/src/domain/userId.ts` y `accountRules.ts` las rutas, los códigos y los
       textos que cita el plan 4.5 (400 "id con formato inválido", 404 "usuario no
       encontrado", 404 "el jugador no tiene una cuenta vinculada en este juego", 400
       "juego no válido", 200 `[]` para cuentas de inexistente; minúscula inicial y sin
       punto final, spec 004, DP-6; P50), y que el mock ya los tiene en su tabla `MESSAGES`
       (`invalidId`, `userNotFound`, `invalidGame`, `noAccountForGame`). Si no coinciden,
       parar.
    2. **Casos primero:** escribir en `validation.md` la tabla de casos del mock (entrada →
       código y texto esperados) del plan 4.5, para las cuatro operaciones: `me`,
       `user-<n>` existente, `USER-<n>` existente, `user-999999`, `USER-999999`, `abc`,
       `ME`, `' me'`; resumen con juego no válido, con usuario inexistente, sin cuenta en
       el juego, con cuenta (≤ 8 partidas, sin correo en el usuario); orden de
       comprobación del resumen (id → juego → usuario → cuenta).
    3. **Script con Node en rojo** (decisión del usuario Q1, opción a): convertir esa tabla
       en un script del scratchpad (`node --test`, no se versiona) que importa `mockApi.ts`
       con el gancho de resolución (`module.register`: añade `.ts` y resuelve `@/`; el que
       T1 reescribió y pegó en `validation.md`, decisión del usuario (2026-10-20): opción a,
       Pregunta 5, P54), ejecutado con `--experimental-transform-types`
       (obligatorio: `ApiError` de `transport.ts` usa propiedades de parámetro), y dos
       sustitutos registrados antes de importar: un `localStorage` en memoria
       en `globalThis` (`getItem`, `setItem`, `removeItem`, `clear`) e `import.meta.env`
       reemplazado por el gancho de carga con un objeto con las variables del modo
       simulado. Inicia sesión con la cuenta demo y llama a las cuatro operaciones con
       cada entrada de la tabla, comprobando código y texto (y que `users.get` de otro
       jugador no trae `email`). Ejecutarlo antes de implementar y anotar el rojo (las
       operaciones nuevas no existen o no cumplen la tabla). **Si el módulo no carga** con
       el gancho y los sustitutos (sintaxis que Node no elimina, otro import de Vite, efecto
       al importar), el implementer **para y lo reporta**; no cambia el método ni el
       código para que cargue.
    4. Implementar: espacio `users` en `apiContract.ts`; en `httpApi.ts`, las tres rutas con
       `encodeURIComponent(userId)` y `user` por la opción `query`, y comprobar que
       `getAvailabilityOf` codifica el identificador; en `mockApi.ts`, las tres operaciones
       y `getAvailabilityOf` con `resolveMockUserTarget`, mismos códigos, textos (los de
       `MESSAGES`, sin copiarlos de nuevo; P50) y orden que el servidor, datos públicos sin
       correo si no es el propio, respuestas crudas con
       `{ error }` y todas por `execute` (plazo de 30 s, RF-24). Sin cambios en `seed.ts`.
    5. Repetir el script hasta el verde y pegar en `validation.md` su texto y las dos
       salidas (rojo y verde).
  - Hecho cuando: los casos de la tabla del mock se ven fallar antes de implementar y pasar
    después, con el script de Node; su texto y las salidas en rojo y en verde están en
    `validation.md`; `grep` confirma que las tres rutas de `httpApi.ts` usan `encodeURIComponent`
    y que ninguna operación nueva del mock esquiva `execute`; ninguna respuesta de
    `users.get` de otro jugador lleva `email`; verificación estándar en verde.

- [x] **T4. Claves de consulta, hooks de la ficha, pestaña en la dirección y flujo de RF-19.** RF-5, RF-8, RF-9, RF-18, RF-19, RF-20, RF-24, RF-26
  - Objetivo: la capa de datos de la ficha sin interfaz todavía.
  - Archivos: `frontend/src/app/providers/queryKeys.ts` (claves `player.*` bajo
    `['u', sessionUserId, 'player', visit, …]`), `frontend/src/features/players/hooks.ts`
    (nuevo: `usePlayerVisit`, `usePlayer`, `usePlayerAccounts`, `usePlayerAvailability`,
    `usePlayerSummary`, `useOwnAccountsForSheet`, `useOwnAvailabilityForSheet`,
    `toLoadable`), `frontend/src/features/players/usePlayerTab.ts` (nuevo),
    `frontend/src/features/players/useSummaryRecheck.ts` (nuevo).
  - Pasos: implementar según el plan 3.3, 3.4 y 3.6: visita nueva en cada montaje; claves
    del jugador tras `'them', id` y propias tras `'own'` (plan 3.6; P63); las 6 consultas
    (del jugador: usuario, cuentas, disponibilidad y resumen, una consulta por pestaña
    vista; propias: cuentas y disponibilidad; P63) con `staleTime: Infinity`, `refetchOnMount: false` y `enabled:
    sessionUserId !== null && !own` (la condición de sesión es la de la corrección D-A2 de la
    T31 de la 007; plan 3.7, P55; el resumen además solo con `tab ≠ null`); `toLoadable` con `errorStatus` de
    `ApiError.status` (estado 0 = sin respuesta, RF-24 → `failed`); `usePlayerTab` con
    `resolveTab` y `setSearchParams(…, { replace: true })` al corregir y al elegir;
    `useSummaryRecheck` solo ante 404 del resumen, una vez por `${tab}:${errorUpdatedAt}`,
    con `Promise.all` de `refetch()` de usuario y cuentas y `rechecking` mientras tanto.
    Si tras repedir la pestaña sigue existiendo, expone el 404 del resumen como error
    para RF-18, sin pedir nada más (decisión de la Pregunta 3 del plan).
  - Hecho cuando: revisión de código anotada en `validation.md`: las 6 consultas tienen
    `staleTime: Infinity` y `refetchOnMount: false`, ninguna `refetchInterval` ni
    `refetchOnWindowFocus: true`; las 6 tienen `enabled` con `sessionUserId !== null`;
    las claves llevan `sessionUserId` y `visit`, y `'them', id` o `'own'` (P63); el resumen
    no se pide sin cuentas cargadas; `useSummaryRecheck` no reacciona a errores distintos
    de 404 ni dos veces al mismo error; verificación estándar en verde.

- [x] **T5. Pestañas accesibles y panel de juego compartido con el perfil.** RF-4, RF-5, RF-16, RF-17, RF-27, RNF-1, RNF-2
  - Objetivo: reutilizar las piezas del perfil en la ficha sin cambiar el perfil.
  - Archivos: `frontend/src/shared/components/GameTabs.tsx` (props opcionales `idBase` y
    `panelId`), `frontend/src/features/profile/components/GameSummaryPanel.tsx` (nuevo,
    extraído de `ProfilePage`), `frontend/src/features/profile/pages/ProfilePage.tsx`,
    `frontend/src/features/profile/components/AccountRow.tsx` (prop opcional
    `showHandleLabel`; su literal "Sin datos" → `NO_DATA_TEXT`),
    `frontend/src/shared/components/RankScale.tsx` (usa `formatRankGain`, con lo que pierde
    su literal "Sin datos"); `validation.md`.
  - Pasos: antes de tocar nada, capturar el perfil y coincidencias en modo simulado a
    1280 y 360 px (`specs/008-ficha-de-jugador/validation/before/`), y comprobar que
    `NO_DATA_TEXT` existe en `frontend/src/shared/utils/copy.ts` (la añade T2); si no
    existe, parar y reportarlo, sin crearla aquí; `GameTabs` según el
    plan 4.3 solo cuando recibe `idBase` y `panelId` (`role`, `id`, `aria-controls`,
    `aria-selected`, `tabIndex` itinerante, `nextTabIndex` con activación automática y
    foco); `GameSummaryPanel` según el plan 4.2 (2), sin acciones si no recibe `onSync`,
    con "Sin datos" defensivo (`readNormalized`, `readWinRate`) y la Etiqueta donde la 007
    la pone en el perfil; `rankGainSinceFirst` lanza con `currentRank` nulo (P52), así que
    la diferencia desde la primera lectura se protege fuera, como el perfil: solo se llama
    a `rankGainSinceFirst` si `readNormalized` no es `null`; si no, se pasa `null` a
    `formatRankGain` → "Sin datos"; no se toca código de la 007 (decisión del usuario
    (2026-10-20): opción a, Pregunta 4, P52); `ProfilePage` lo usa; `AccountRow` muestra "Riot ID", "Ubisoft
    ID" o "SteamID64" solo con `showHandleLabel`; `RankScale` muestra `formatRankGain`.
    "Sin datos" sin cambio visible (decisión del usuario (2026-10-20): opción a, Pregunta
    10, P62): los tres literales de `ProfilePage.tsx` (primera lectura, sin rango vigente y
    tasa de victorias) salen con el bloque extraído y en `GameSummaryPanel` son
    `NO_DATA_TEXT`, en los mismos elementos y clases (`note note--faint`,
    `ficha__winrate`); el de `AccountRow.tsx` pasa a `NO_DATA_TEXT` en el mismo `<dd
    className="num">`; en `RankScale.tsx` las dos ramas de la diferencia quedan en el mismo
    `<span className="rank-scale__delta num">` con `{formatRankGain(delta)}` y `data-up`
    solo si `delta >= 0`, como hoy. Los comentarios que mencionan "Sin datos" no se
    cambian.
  - Hecho cuando: las capturas después (`validation/after/`) del perfil y de coincidencias
    coinciden con las de antes (diferencias anotadas: ninguna esperada); sin `idBase` el
    marcado de `GameTabs` es el de hoy; el perfil sigue mostrando "▲ +0 pts desde la
    primera lectura" en una cuenta con una sola lectura; `GameSummaryPanel` no llama a
    `rankGainSinceFirst` cuando `readNormalized` es `null` (revisión de código anotada) y
    `rankGainSinceFirst` no cambia (`git diff` de su función vacío; P52); las capturas
    antes/después cubren también "Sin datos" (sin cambio visible) y `grep -n "Sin datos"`
    en `ProfilePage.tsx`, `AccountRow.tsx`, `RankScale.tsx` y `GameSummaryPanel.tsx` solo da
    comentarios, con `AccountRow.tsx` y `GameSummaryPanel.tsx` importando `NO_DATA_TEXT`
    (resultado anotado en `validation.md`; P62); verificación estándar en verde.

- [x] **T6. Página de la ficha: ruta, ficha propia, encabezado, estado de página y sección de juegos.** RF-1, RF-3, RF-4, RF-5, RF-6 (solo la constante de P59), RF-8, RF-9, RF-10, RF-15, RF-16, RF-18, RF-19, RF-20, RF-24, RNF-1, RNF-3, RNF-5
  - Objetivo: la ficha navegable con sus datos públicos y sus pestañas.
  - Archivos: `frontend/src/app/router.tsx` (ruta diferida dentro de `ProtectedRoute` +
    `AppLayout`), `frontend/src/features/players/pages/PlayerPage.tsx` (nuevo),
    `frontend/src/features/players/pages/playerPage.css` (nuevo),
    `frontend/src/features/players/components/PlayerHeader.tsx` (nuevo),
    `frontend/src/features/players/components/PlayerGamesSection.tsx` (nuevo),
    `frontend/src/shared/utils/copy.ts` (solo los textos **nuevos** del plan 4.6 salvo
    "Sin datos", que ya añadió T2 como `NO_DATA_TEXT`, P62; los motivos 3 a 6 ya están en
    `PROPOSAL_BLOCK_REASONS` y "Reintentar" lo pone `Failure`; P57).
  - Pasos: según el plan 3.7, 4.1, 4.2 (1 y 2) y 4.7. `isOwnPlayerRef` → `<Navigate
    to="/perfil" replace />` antes de montar consultas. Mientras obtener el usuario no
    responda 200, **todas** las secciones muestran su estado de carga y "Proponer
    sesión" el texto "Cargando los datos para proponer una sesión…" (decisión de la
    Pregunta 2 del plan); `notFound` → `Blank` "Este jugador no existe" con enlace a
    coincidencias; `failed` → `Failure` en toda la ficha con "Reintentar". Encabezado sin
    correo ni totales, biografía como texto, título del documento = nombre visible.
    Sección de juegos: carga (sección o solo panel), error con "Reintentar" que repite
    solo esa petición, vacío RF-10, panel durante `rechecking` en carga, y el 404 que
    queda tras RF-19 como error con "Reintentar". El bloque "Cruce" queda como marcador
    vacío hasta T7 y T8. Textos nuevos de `copy.ts` copiados carácter a carácter de la
    spec, sin duplicar los existentes (P57), incluido "Sin horas en común esta semana."
    (nuevo en `copy.ts`; P59), que usa T7 y al que T9 pasa también `MatchEntry.tsx` (P61; T6
    no toca `MatchEntry.tsx`). Errores, vacíos y Etiqueta con `Failure`, `Blank`
    y `DemoTag` sin cambios; su contraste se mide en T10 (decisión del usuario (2026-10-20):
    opción a, Pregunta 8, P60).
  - Hecho cuando, en modo simulado con la cuenta demo: `/jugadores/<id semilla>` muestra
    encabezado y pestañas en orden LoL, R6, CS2 con rango, escala, diferencia, partidas,
    identificador con su etiqueta y la Etiqueta de datos simulados; cambiar de pestaña no
    recarga y deja `?juego=` sin nueva entrada de historial; `?juego=xyz` y un juego sin
    cuenta corrigen la dirección con `replace`; `user-999999`, `abc` y `ME` muestran "Este
    jugador no existe" **sin** un instante de "Este jugador no ha vinculado ningún juego"
    (red con "3G lenta"); `me`, el id propio y `USER-<propio>` llevan al perfil y "Atrás"
    no vuelve a la ficha; `USER-<n>` abre la ficha de `user-<n>`; sin sesión, la ficha
    lleva a login y vuelve a ella; a 360 px no hay desplazamiento horizontal; `grep` de
    `#[0-9a-fA-F]{3,8}`, `rgb(` y `hsl(` en los archivos nuevos sin resultados;
    verificación estándar en verde.

- [x] **T7. Bloque de cruce: horas en común, nota de zonas y distancia de rango.** RF-6, RF-8, RF-13, RF-17, RF-18, RF-22, RF-27, RNF-1, RNF-5
  - Objetivo: lo que el jugador de la ficha y el usuario de la sesión tienen en común.
  - Archivos: `frontend/src/features/players/components/SharedHoursBlock.tsx` (nuevo),
    `frontend/src/features/players/components/RankDistanceBlock.tsx` (nuevo),
    `frontend/src/features/players/pages/PlayerPage.tsx`,
    `frontend/src/features/players/pages/playerPage.css`.
  - Pasos: según el plan 4.2 (3): total con `pluralize`, tramos con `groupBlocks` +
    `formatRange` (la lista usa `groupBlocks` y la propuesta sigue con `sharedRuns`;
    decisión del usuario (2026-10-20): opción a, Pregunta 6, P53) o, sin tramos, "Sin horas
    en común esta semana." desde `copy.ts` (RF-6; decisión del usuario (2026-10-20): opción
    a, Pregunta 7, P59), nota de RF-22 en `notice` si `zonesDiffer`, `HoursSheet readOnly compareWith`
    (con listas `TimeBlock[]` de la consulta o de `sharedHours`, no `readonly`; P58) en un
    recuadro con `overflow-x: auto`; carga mientras llega cualquiera de
    las dos disponibilidades y un `Failure` con "Reintentar" por cada una que falle.
    Distancia con `distanceView`: "Δ n pts" + `DemoTag` si la cuenta del jugador lleva la
    marca, texto de RF-13 con enlace a Configuración, "Sin datos" (`NO_DATA_TEXT`, sin
    literal; P62), carga, error de las
    cuentas propias o del resumen con su "Reintentar"; sin juego elegido no se muestra.
  - Hecho cuando, en modo simulado: con un jugador semilla, las horas en común y la
    distancia coinciden con su fila en coincidencias para el mismo juego; un juego sin
    cuenta propia muestra "Vincula tu cuenta de <juego> para ver la distancia de rango"
    con enlace; sin bloques en común la lista muestra "Sin horas en común esta semana."
    (texto leído de `copy.ts`, sin literal en el componente); con zonas distintas aparece la nota y con iguales no; la ficha de un
    jugador sin cuentas (si el simulado lo tiene) no muestra distancia; a 360 px la grilla
    se desplaza dentro de su recuadro y la página no; `grep` de colores literales sin
    resultados; verificación estándar en verde.

- [x] **T8. "Proponer sesión" desde la ficha.** RF-7, RF-10, RF-12, RF-21, RF-23, RNF-2
  - Objetivo: proponer con el juego, el primer bloque proponible y la duración ya fijados.
  - Archivos: `frontend/src/features/players/components/ProposeSessionAction.tsx` (nuevo),
    `frontend/src/features/players/pages/PlayerPage.tsx`,
    `frontend/src/features/players/usePlayerTab.ts` (P64: la corrección de la dirección y
    `selectTab` solo actúan mientras la ruta actual sea la ficha, `useMatch(ROUTES.player)`
    o equivalente; plan 3.3; `AppLayout` no se toca).
  - Pasos: según el plan 3.2 y 4.4: `proposeState` con los cuatro datos para proponer;
    bloqueado → `aria-disabled="true"`, clic sin efecto, motivo o texto de RF-23 en `<p
    className="note">` enlazado con `aria-describedby` (motivos 3 a 6 desde
    `PROPOSAL_BLOCK_REASONS[reason]`, motivos 1 y 2 y textos de RF-23 desde los nuevos de
    `copy.ts`; P57), enlace a Configuración en los
    motivos 2 y 3; `ready` → `navigate(ROUTES.schedule, { state: { proposal } })` con una
    referencia que impide navegar dos veces. La ficha no toca la agenda (RF-21 lo cumple
    la T26 de la 007).
  - Hecho cuando, en modo simulado: con cruce proponible, "Proponer sesión" abre la agenda
    con el juego elegido, el primer bloque proponible, la duración del plan 3.1, "Sesión
    con <nombre>", 5 cupos y notas vacías, y "Atrás" vuelve a la ficha en su pestaña; un
    juego sin cuenta propia muestra el motivo 2; con "3G lenta" se ve "Cargando los datos
    para proponer una sesión…"; bloqueando la disponibilidad propia se ve "No se pudieron
    cargar los datos para proponer una sesión."; el botón bloqueado recibe el foco con
    Tab; un doble clic deja una sola entrada nueva en el historial; salir de la ficha no
    añade `?juego=` al destino: "Proponer sesión" llega a `/agenda` sin `?juego=` y con la
    propuesta aplicada, y salir hacia el perfil u otra vista deja su dirección sin `?juego=`
    (p. ej. `/perfil`, no `/perfil?juego=lol`) (P64); se vuelven a comprobar los puntos de
    T4 y T6 que dependen de `usePlayerTab` (cambiar de pestaña no añade entrada al historial
    y deja `?juego=`; `?juego=xyz` y un juego sin cuenta se corrigen con `replace`), con el
    resultado anotado en `validation.md`; verificación estándar en verde.

- [x] **T9. Enlaces desde coincidencias y agenda, textos de tramos vacío y "Sin datos" desde `copy.ts` y petición del nombre con tabulador.** RF-2, RF-6, RF-7, RF-15, RF-17, RF-20, RNF-2, RNF-3
  - Objetivo: llegar a la ficha desde las vistas existentes, dejar "Sin horas en común esta
    semana." (P61) y "Sin datos" (P62) con una sola fuente y preparar la comprobación del
    título.
  - Archivos: `frontend/src/features/matches/components/MatchEntry.tsx` (enlace de RF-2 y
    literales sustituidos por las constantes de `copy.ts`: "Sin horas en común esta
    semana.", P61, y los dos "Sin datos", P62),
    `frontend/src/features/sessions/components/SessionSlip.tsx`,
    `backend/requests/users.rest` (no es servidor; P45). `copy.ts` no se toca: las
    constantes ya las añadieron T6 ("Sin horas en común esta semana.") y T2 (`NO_DATA_TEXT`).
  - Pasos: comprobar primero que la constante de "Sin horas en común esta semana." (la
    añade T6) y `NO_DATA_TEXT` (la añade T2) existen en
    `frontend/src/shared/utils/copy.ts`; si falta alguna, parar y reportarlo, sin crearla
    aquí. En `MatchEntry`, los dos literales "Sin datos" (el de la columna de rango y el que
    ocupa el lugar de la afinidad, ambos `<span className="note note--faint">`) pasan a
    `NO_DATA_TEXT`, en los mismos elementos y con la misma clase (decisión del usuario
    (2026-10-20): opción a, Pregunta 10, P62); su comentario "Defensivo (RF-14)" no se
    cambia. En `MatchEntry`, el nombre visible del candidato pasa a `Link` a
    `playerPath(candidate.user.id, candidate.gameId)`, y el literal "Sin horas en común esta
    semana." del cajón de horas se sustituye por esa constante, importada de `copy.ts`, en
    el mismo `<p className="note note--faint">` (decisión del usuario (2026-10-20): opción a,
    Pregunta 9, P61); en `SessionSlip`, el de cada
    participante a `playerPath(participant.id, session.gameId)` (incluido el propio),
    como texto, con el foco visible de los enlaces existentes. En `users.rest`, añadir el
    paso 14 del plan: inicio de sesión de D y `PATCH /api/users/me` con `"displayName":
    "Jugador\tD"` (tabulador interior escrito como `\t` en el JSON), con `X-CSRF-Token`,
    en el mismo formato y numeración que los pasos existentes.
  - Hecho cuando, en modo simulado: el nombre de cada fila de coincidencias abre la ficha
    en el juego de esa coincidencia y el de cada participante en la agenda, en el juego de
    la sesión; el propio lleva al perfil; los enlaces se alcanzan con Tab y se ven con
    foco; `users.rest` tiene el paso 14 con `\t` dentro de la cadena JSON (revisado a
    mano; si hay servidor de desarrollo con la 003, la petición responde 200 y se anota);
    `git diff backend/` solo muestra `requests/users.rest`; `grep -rn "Sin horas en común
    esta semana" frontend/src` da un solo resultado, en `copy.ts`, y `MatchEntry.tsx` importa
    la constante (P61); `grep -n "Sin datos" frontend/src/features/matches/components/MatchEntry.tsx`
    no da ningún resultado fuera de comentarios y `MatchEntry.tsx` importa `NO_DATA_TEXT`
    (P62); el texto que muestra coincidencias no cambia, comprobado en
    `validation.md` con la revisión del `git diff` de `MatchEntry.tsx` (mismo texto, mismo
    elemento y misma clase, para los dos textos) y, en modo simulado, abriendo el cajón de
    horas de una fila sin horas en común si alguna lo permite (captura en
    `validation/after/`); si ninguna fila lo permite, se anota y vale la revisión del diff
    ("Sin datos" en coincidencias es defensivo y el simulado no lo produce, así que se
    comprueba solo con esa revisión del diff); verificación estándar en verde.

- [x] **T10. Validación: revisiones de código y registro en el orden de P42.** Todos los RF y RNF (RF-14 y RF-25 retirados)
  - **Registro hecho (2026-10-20)**, `validation.md` sección 4 (base `teammatchup_val008`). Defectos abiertos: D10-1 (contraste, tema claro, RNF-5), D10-2 (contraste, tema oscuro, RNF-5), D10-3 (textos de la ficha fuera de `copy.ts`); posible cambio de spec C10-1 (texto del botón deshabilitado); incidente I-1 (sesión del recorrido cancelada por el script; un punto de la parte 4 sin comprobar en la interfaz); pendiente: NVDA (usuario). Verificación estándar en verde.
  - Precondición de la parte B: specs 005 y 006 implementadas en `backend/`, la 007
    completa (su T29), MongoDB local, `backend/.env`, sin Internet. La parte A no las
    necesita. Estado (2026-10-20, P51): 005, 006 y 007 cumplidas (la 007 con T1–T31,
    incluida su T29).
  - Archivos: solo `specs/008-ficha-de-jugador/validation.md` (y capturas en
    `specs/008-ficha-de-jugador/validation/`). Ningún fallo se corrige aquí: se anota como
    defecto o como cambio de spec.
  - **Parte A — revisiones de código por búsqueda** (comando y resultado de cada una en el
    registro; plan 6.2): colores escritos a mano (`#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(`) en
    los archivos nuevos y `playerPage.css` (RNF-1); `dangerouslySetInnerHTML|innerHTML` en
    `frontend/src` (RNF-3); `: any|as any|@ts-ignore|\.only` (RNF-4); nombres de fuentes
    reales `Riot|Ubisoft|Valve|Steam|FACEIT|Leetify` en la ficha y en `GameSummaryPanel`
    (solo "Riot ID", "Ubisoft ID", "SteamID64") y `verificado` (RF-16); "Sin rango" y "R6
    sin rango" sin resultados y ningún valor derivado con rango o tasa ausentes (RF-17);
    opciones de las 6 consultas (RF-26; P63); `playerSheet.ts` sin reimplementar intersección,
    agrupado, distancia ni primer bloque, y sin `Date`, React ni `fetch` (RNF-6); revisión
    del mock: 404 "el jugador no tiene una cuenta vinculada en este juego" al resumen sin
    cuenta, 404 "usuario no encontrado" para inexistente y 200 `[]` en cuentas de
    inexistente (RF-11, RF-19; P50); `fetch(` solo en `httpClient.ts`; "Sin horas en común
    esta semana" con un solo resultado en `frontend/src`, en `copy.ts` (RF-6; P61); `grep -rn
    "Sin datos" frontend/src`: fuera de los comentarios (`//`, `/* */`, `*` de JSDoc), un solo
    resultado, `NO_DATA_TEXT` en `copy.ts`, y cada resultado que sea comentario anotado como
    tal (RF-17; P62). Repetir las
    comprobaciones con Node de T1, T2 y T3 sobre el código final (verde), con el mismo
    gancho y la bandera `--experimental-transform-types` en T3 (P54).
  - **Parte B — registro manual** (plan 6.3), servidor real, base vacía, modo simulado
    desactivado, jugadores A, B, C (zonas de P44), D y E, en este orden y con fecha y
    resultado por paso: (1) Recorrido sin el paso de CS2 (identificadores usados,
    verificados y distancia por juego, disponibilidad guardada); (2) Estados, terminando
    con martes 20, 21, 22 y jueves 03 restaurados; entre 2 y 3: latencia de 40 s (RF-24),
    servidor apagado y "Reintentar" (RF-18), teclado y NVDA (RNF-2), 360 px, Lighthouse en
    los dos temas y selector de color (RNF-5), midiendo también en los dos temas el texto
    de `Failure`, `Blank` y `DemoTag` (`note--faint`): si alguno no llega a 4,5:1 (3:1 en
    texto grande), se anota como defecto en el registro y se propone un cambio aparte para
    toda la app, sin corregirlo aquí (decisión del usuario (2026-10-20): opción a,
    Pregunta 8, P60); (3) Agenda, con la desvinculación de LoL de
    A al final (RF-21, RF-13); (4) paso final de CS2; (5) pestaña que desaparece, con la
    pestaña de red para RF-26 (RF-19); (6) eliminación de B. En cualquier momento: título
    con tabulador con el paso 14 de `users.rest` (D y E: petición, respuesta, qué error
    apareció, corrección y anotación; RF-7); Etiqueta de datos simulados con servidor real
    y en modo simulado (RF-27); modo simulado con la cuenta demo (fichas semilla,
    verificadas y no verificadas, `user-999999`, `abc`, `ME`, `USER-<n>`, ficha propia por
    id, en mayúsculas y `me`, sin peticiones al servidor).
  - Hecho cuando: el registro contiene la parte A con cada búsqueda y su resultado, y la
    parte B con cada paso en el orden de P42; **cada casilla de "Criterios de
    finalización" de la spec** tiene evidencia anotada (o un defecto abierto); verificación
    estándar en verde.
  - **Nota para el coordinador:** al cerrar esta tarea hay que actualizar `MEMORY.md` (lo
    hace el coordinador o quien implemente; el planner no escribe fuera de `specs/`):
    estado de la 007 y de la 008 en la tabla de specs, la decisión P5 (las dos vistas
    nuevas del Hito 2 son la ficha 008 y el detalle de sesión 009), las decisiones de las
    Preguntas 1 a 10 del plan 008, y `AGENTS.md` si cambia la estructura
    (`features/players/`). La spec 008 pasa a "implementada" solo con la parte B completa
    y sin un defecto de contraste abierto (RNF-5; Pregunta 8).

- [x] **T11. Corrección de D10-3 (textos a `copy.ts`).** RF-3, RF-4, RF-6, RNF-2 (sin cambio de comportamiento; regla de textos del plan 4.6; P66)
  - Objetivo: que los textos de interfaz de la ficha que quedaron escritos en los componentes
    vivan solo en `copy.ts`, sin ningún cambio visible, y corregir la observación O-1.
  - Precondición: cumplida. El usuario respondió las Preguntas 11 a 13 del plan (sección 14)
    el 2026-10-20, opción a en las tres ("Sí, cambiarlo", "Sí, cambiarlos", "Incluirlos"), y
    el alcance de los archivos, los pasos y el "Hecho cuando" sigue esas respuestas. No
    depende del cambio B (P65, aprobado el 2026-10-20), que no toca código. **Lista para
    empezar.**
  - Archivos: `frontend/src/shared/utils/copy.ts` (constantes nuevas y la función
    `rankDistanceText` de la tabla del plan 4.6, en el bloque "Ficha de jugador"),
    `frontend/src/features/players/components/PlayerGamesSection.tsx`,
    `frontend/src/features/players/pages/PlayerPage.tsx`,
    `frontend/src/features/players/components/RankDistanceBlock.tsx`,
    `frontend/src/features/players/components/SharedHoursBlock.tsx`,
    `frontend/src/features/players/components/PlayerHeader.tsx`,
    `frontend/src/features/profile/components/GameSummaryPanel.tsx`,
    `frontend/src/features/profile/pages/ProfilePage.tsx` (solo "se inscribió", Pregunta 11),
    `frontend/src/features/matches/components/MatchEntry.tsx` (solo `'hora'`/`'horas'` y
    "Δ … pts", Preguntas 12 y 13), `frontend/src/shared/components/HoursSheet.tsx` (solo la
    leyenda "Horas en común", Pregunta 12), `frontend/src/app/pages/CrossingVisual.tsx` (solo
    el literal `label: 'Horas en común'` de la línea 23, P67),
    `frontend/src/features/players/hooks.ts` (solo el
    comentario de la línea 13, O-1); `validation.md` (sección nueva "5. T11") y capturas en
    `specs/008-ficha-de-jugador/validation/before/` y `after/`.
  - Pasos:
    1. **Inventario antes de tocar nada.** `grep -rnF` en `frontend/src` de cada texto de la
       tabla del plan 4.6 (`Juegos`, `Juegos del jugador`, `Cruce con tu perfil`, `Distancia
       de rango`, `Horas en común`, `'hora'`, `'horas'`, `en común`, `se inscribió`,
       `Posición en la escala del juego`, `lectura registrada`, `lecturas registradas`,
       `Primera lectura:`, `Últimas partidas`, `ganadas`) y `grep -rnE 'Δ \$?\{' frontend/src`
       (forma "Δ <n> pts"), con el resultado en `validation.md`. Comprobar que ningún nombre
       propuesto choca con uno existente en `copy.ts` (si choca, ajustar el nombre y
       anotarlo). Si aparece uno de esos literales de interfaz en un archivo que la tabla del
       plan 4.6 no lista, **parar y reportarlo**, sin cambiarlo. (Así se halló
       `CrossingVisual.tsx:23`, ya incluido por P67; "Horas en común por semana" de
       `MatchFiltersPanel.tsx:75` y el mensaje de `mockApi.ts:192` son textos distintos y no
       detienen la tarea.)
    2. **Estado antes.** En modo simulado, con la cuenta demo, capturar a 1280 y 360 px en
       `validation/before/t11-*`: (a) la ficha de un jugador semilla con cuentas, pestaña LoL,
       con el bloque de cruce (distancia "Δ <n> pts", horas en común y la grilla con su
       leyenda "Horas en común"); (b) el perfil (encabezado con "se inscribió" y panel con
       las lecturas registradas, "Primera lectura:", "Últimas partidas" y "ganadas"); (c)
       coincidencias, con una fila visible (columna de rango con "Δ <n> pts" y columna "En
       común" con "<n> horas") y con el cajón de horas de esa fila abierto (grilla con la
       leyenda "Horas en común"); (d) la portada (`LandingPage`), con la figura del cruce y
       sus tres etiquetas ("Mismo juego", "Rango similar", "Horas en común") ya visibles, es
       decir, tras terminar la animación de entrada (P67). Si alguna ficha o fila tiene
       exactamente 1 hora en común, o alguna cuenta 1 lectura registrada, capturarla también
       (forma en singular); si no, se anota y la forma singular se comprueba con la revisión
       del diff. Guardar además, para cada una de las cuatro vistas (coincidencias con el
       cajón abierto), el texto visible (`innerText` de `main`; en la portada, de `main` o, si
       no lo tiene, de `body`) y los atributos `aria-label` del `tablist` y
       `aria-labelledby` de las secciones, en un archivo del scratchpad.
    3. **Sustitución.** Añadir a `copy.ts` las constantes y `rankDistanceText(n)` (texto
       copiado carácter a carácter del literal actual, sin duplicar una existente; P57;
       `copy.ts` sigue sin imports) y cambiar cada literal por su constante, en el mismo
       elemento, con la misma clase y el mismo atributo:
       - ficha: el `h2` "Juegos" y la prop `label` de `GameTabs` ("Juegos del jugador") en
         `PlayerGamesSection.tsx`; los dos `h2` "Cruce con tu perfil" de `PlayerPage.tsx`; el
         `h3` "Distancia de rango" y `Δ {view.points} pts` →
         `{rankDistanceText(view.points)}` en el mismo `<strong className="num">` de
         `RankDistanceBlock.tsx`; el `h3` "Horas en común" y el total
         (`pluralize(total, HOUR_UNIT…)` seguido de un espacio y "en común", sin perder el
         espacio entre el `<strong>` y el texto) en `SharedHoursBlock.tsx`; "se inscribió" en
         `PlayerHeader.tsx`;
       - `GameSummaryPanel.tsx` (ficha y perfil): "Posición en la escala del juego",
         `pluralize(…, 'lectura registrada', 'lecturas registradas')` →
         `READINGS_UNIT`, "Primera lectura:" (conservando el `{' '}` que le sigue),
         "Últimas partidas" y "ganadas" (con el espacio tras `CountUp`);
       - perfil: "se inscribió" de `ProfilePage.tsx:65` → `JOINED_TEXT`, en el mismo `<p
         className="note">` (Pregunta 11);
       - coincidencias: `pluralize(candidate.sharedBlocks.length, 'hora', 'horas')` de
         `MatchEntry.tsx:110` → `HOUR_UNIT`, en el mismo `<span className="num
         entry__hours">` (Pregunta 12), y `Δ {candidate.rankDistance} pts` de
         `MatchEntry.tsx:99` → `{rankDistanceText(candidate.rankDistance)}`, en el mismo
         `<span className="note note--faint num">` (Pregunta 13);
       - grilla: la leyenda "Horas en común" de `HoursSheet.tsx:136` →
         `SHARED_HOURS_TITLE`, en el mismo `<span className="hours__key-item">`, tras el `<i
         className="hours__swatch" data-shared />` y su espacio (Pregunta 12);
       - portada: `label: 'Horas en común'` del círculo `horario` de `CIRCLES` en
         `CrossingVisual.tsx:23` → `label: SHARED_HOURS_TITLE`, pintado igual en `:129`
         (`{circle.label}` en el mismo `<motion.span className="crossing__tag …">`) (P67).
       Ningún cambio de estilos, estructura ni lógica; ningún otro texto de `MatchEntry.tsx`,
       `HoursSheet.tsx`, `ProfilePage.tsx` ni `CrossingVisual.tsx` ("Mismo juego", "Rango
       similar", el `<title>` del SVG y "match") cambia (plan 4.6, fuera de alcance), y
       `MatchFiltersPanel.tsx` y `mockApi.ts` no se tocan (P67).
    4. **O-1.** En `features/players/hooks.ts:13`, "las 7 consultas" pasa a "las 6 consultas"
       (P63). Solo el comentario.
    5. **Estado después.** Repetir las capturas del paso 2 (las cuatro vistas, a 1280 y 360 px,
       con el cajón de horas de la misma fila de coincidencias abierto y la portada tras su
       animación de entrada) en
       `validation/after/t11-*` y el volcado de textos y atributos; compararlo con el de antes
       (`diff` de los dos archivos, pegado en `validation.md`).
  - Hecho cuando: (1) `grep -rnF "<texto>" frontend/src` para cada uno de `Juegos del
    jugador`, `Cruce con tu perfil`, `Distancia de rango`, `se inscribió`,
    `Posición en la escala del juego`, `lectura registrada`, `lecturas registradas`, `Primera
    lectura:`, `Últimas partidas` y `ganadas` da, fuera de comentarios, solo resultados en
    `copy.ts` (uno por texto); para `Horas en común` se busca el **literal exacto** (P67):
    `grep -rnE "['\"\`]Horas en común['\"\`]|>[[:space:]]*Horas en común[[:space:]]*(<|$)|^[[:space:]]*Horas en común[[:space:]]*$" frontend/src`
    (cadena completa entre comillas, o texto JSX completo, en la misma línea que su etiqueta o
    en una línea propia) da, fuera de comentarios, un solo resultado, `SHARED_HOURS_TITLE` en
    `copy.ts`, y `SharedHoursBlock.tsx`, `HoursSheet.tsx` y `CrossingVisual.tsx` la importan;
    además `grep -rnF "Horas en común" frontend/src` se pega completo y, fuera de comentarios y
    de `copy.ts`, solo da `MatchFiltersPanel.tsx` ("Horas en común por semana", rótulo del
    filtro) y `mockApi.ts` (mensaje de error del mock, copia del literal del servidor de la
    005), anotados como **textos distintos** que no se tocan; para `Juegos` y `en común`, `grep -rn` en
    `frontend/src/features/players` no da ningún resultado fuera de comentarios y `copy.ts`
    tiene la constante; `grep -rnE "'horas?'" frontend/src` da, fuera de comentarios, solo
    `copy.ts`; `grep -rnE 'Δ \$?\{' frontend/src` da, fuera de comentarios, solo
    `rankDistanceText` en `copy.ts`, y `RankDistanceBlock.tsx` y `MatchEntry.tsx` la importan.
    Sin excepciones: `ProfilePage.tsx`, `MatchEntry.tsx`, `HoursSheet.tsx` y
    `CrossingVisual.tsx` tampoco conservan ninguno de esos literales. Cada resultado que sea
    comentario se anota como tal. (2) El
    `diff` del texto visible y de los atributos antes/después está vacío en la ficha, el
    perfil, coincidencias (con el cajón de horas abierto) y la portada, y las capturas
    antes/después de las cuatro vistas coinciden (diferencias anotadas: ninguna esperada). (3) `hooks.ts` dice
    "6 consultas" y no queda "7 consultas" en `frontend/src/features/players`. (4) `git diff`
    solo toca los archivos de la lista y, en ellos, solo literales, imports, la función
    `rankDistanceText` y las constantes de `copy.ts`, y el comentario de O-1 (revisión anotada
    en `validation.md`, con la forma singular de `HOUR_UNIT` y `READINGS_UNIT` revisada en el
    diff si no se pudo capturar). (5) Verificación estándar en verde y la aplicación arranca
    en modo simulado sin errores de consola. Al cerrar, D10-3 y O-1 se marcan como resueltos
    en `validation.md` (nota para el coordinador: actualizar `MEMORY.md`).

## Trazabilidad RF / RNF → tareas
Todo RF y RNF vigente está cubierto por al menos una tarea de implementación y por T10.

| Requisito | Tareas |
| --- | --- |
| RF-1 | T2, T6, T10 |
| RF-2 | T2, T9, T10 |
| RF-3 | T6, T10, T11 |
| RF-4 | T1, T2, T5, T6, T10, T11 |
| RF-5 | T4, T5, T6, T8 (P64), T10 |
| RF-6 | T1, T6, T7, T9, T10, T11 |
| RF-7 | T1, T8, T9, T10 |
| RF-8 | T4, T6, T7, T10 |
| RF-9 | T1, T4, T6, T10 |
| RF-10 | T1, T6, T8, T10 |
| RF-11 | T2, T3, T10 |
| RF-12 | T1, T8, T10 |
| RF-13 | T1, T7, T10 |
| RF-14 | Retirado (P27); sin tarea |
| RF-15 | T1, T2, T6, T9, T10 |
| RF-16 | T5, T6, T10 |
| RF-17 | T1, T2, T5, T7, T9, T10 |
| RF-18 | T4, T6, T7, T10 |
| RF-19 | T1, T4, T6, T10 |
| RF-20 | T1, T2, T4, T6, T8 (P64), T9, T10 |
| RF-21 | T8 (lo cumple la T26 de la 007), T10 |
| RF-22 | T1, T7, T10 |
| RF-23 | T1, T8, T10 |
| RF-24 | T3, T4, T6, T10 |
| RF-25 | Retirado (P33); sin tarea |
| RF-26 | T4, T10 |
| RF-27 | T5, T7, T10 |
| RNF-1 | T5, T6, T7, T10 |
| RNF-2 | T2, T5, T8, T9, T10, T11 (`aria-label` del `tablist` desde `copy.ts`) |
| RNF-3 | T3, T6, T9, T10 |
| RNF-4 | Todas (verificación estándar) |
| RNF-5 | T6, T7, T10 (D10-1 y D10-2 abiertos, cambio aparte, P60; texto del botón deshabilitado exento por P65, cambio B aprobado el 2026-10-20) |
| RNF-6 | T1, T10 |

## Decisiones del usuario sobre las preguntas de las tareas (2026-10-18)
1. **Q1. Cómo ejecutar los casos del backend simulado en T3 antes de implementar.**
   Decisión del usuario (2026-10-18): opción a. Script de Node en el scratchpad con el
   gancho de resolución de la 007 más sustitutos de `localStorage` e `import.meta.env`; los
   casos se ven fallar antes y pasar después, con la salida en `validation.md`. Si el
   módulo no carga, el implementer para y lo reporta. Aplicado en T3, en las reglas de cada
   tarea y en T10 (parte A); el plan lo recoge en las secciones 5, 6 y 6.2.
2. **Q2. Una o dos tareas de validación (y partir T1 y T6).** Decisión del usuario
   (2026-10-18): opción a. Se mantienen las 10 tareas como están; T10 sigue siendo una
   sola tarea con las partes A (revisiones de código) y B (registro manual).

## Cambio A — revisión de coherencia contra el código (2026-10-20)
Estado: **aprobado (2026-10-20, por el usuario: "Apruebo el cambio A")**. Detalle e ids (P50 a P62) en el
plan, sección 12. En estas tareas: P50 (textos del servidor en minúscula y sin punto) en T3 y
T10; P51 (dependencias cumplidas) en la cabecera, "Dependencias externas" y T10; P52 en T5;
P53 en T1 y T7; P54 (gancho y `--experimental-transform-types`) en las reglas, T1, T3 y T10;
P55 (`enabled` con sesión) en T4; P57 (reutilizar textos de `copy.ts`) en las reglas, T6 y
T8; P58 (tipos) en T1 y T7; P59 en T6 y T7; P60 en T6 y T10; P61 en las reglas, T6, T9, T10
y la trazabilidad (RF-6); P62 en las reglas, T2, T5, T6, T7, T9, T10 y la trazabilidad
(RF-17). El número de tareas no cambia (10).

## Decisiones del usuario sobre las Preguntas 4 a 10 del plan (2026-10-20)
Del cambio A; texto completo de cada pregunta en el plan, sección 11. Todas con la opción a
(la recomendada).
4. **Pregunta 4 (P52, I-1).** Decisión del usuario (2026-10-20): opción a, "Proteger fuera".
   Solo se llama a `rankGainSinceFirst` si `readNormalized` no es `null`; si no, `null` a
   `formatRankGain` → "Sin datos". No se toca código de la 007. Aplicada en T5.
5. **Pregunta 5 (P54, I-2).** Decisión del usuario (2026-10-20): opción a, "Reescribir en
   T1". El gancho de Node se reescribe en el scratchpad a partir de la descripción de la
   `validation.md` de la 007 y su texto completo se pega en
   `specs/008-ficha-de-jugador/validation.md`; no se versiona; bandera
   `--experimental-transform-types` (obligatoria en T3). Aplicada en las reglas, T1, T3 y
   T10.
6. **Pregunta 6 (P53, M-1).** Decisión del usuario (2026-10-20): opción a, "Cada una para
   lo suyo". Lista de tramos con `groupBlocks`; propuesta con `buildProposal`/`sharedRuns`;
   la comprobación de Node exige mismo día y misma hora de inicio, con `endHour` de
   `groupBlocks` = el de `sharedRuns` + 1. No se toca código de la 007. Aplicada en T1 y T7.
7. **Pregunta 7 (P59, M-5).** Decisión del usuario (2026-10-20): opción a. "Sin horas en
   común esta semana." (el de `MatchEntry.tsx`), nueva constante de `copy.ts` (no existía
   ninguna con ese texto, comprobado el 2026-10-20) y en la spec, RF-6. Aplicada en T6 y T7.
8. **Pregunta 8 (P60, M-7).** Decisión del usuario (2026-10-20): opción a, "Medir en T10".
   `Failure`, `Blank` y `DemoTag` sin cambios; contraste medido en T10 en los dos temas; si
   no llegan a 4,5:1, defecto y cambio aparte para toda la app; la 008 no pasa a
   "implementada" mientras tanto. Aplicada en T6 y T10.
9. **Pregunta 9 (P61; surgida al aplicar la Pregunta 7).** Decisión del usuario (2026-10-20):
   opción a. La cabecera de `copy.ts` dice que es la única fuente y `MatchEntry.tsx` tenía
   "Sin horas en común esta semana." escrito a mano. En T9, que ya modifica `MatchEntry.tsx`
   para el enlace de RF-2, ese literal pasa a ser la constante de `copy.ts`; en pantalla no
   cambia nada. T6 sigue añadiendo la constante y va antes que T9. Aplicada en las reglas,
   T6, T9, T10 y la trazabilidad (RF-6).
10. **Pregunta 10 (P62; surgida al aplicar la Pregunta 9).** Decisión del usuario
   (2026-10-20): opción a. "Sin datos", texto nuevo de `copy.ts` en el plan 4.6, ya estaba
   escrito a mano en seis sitios de código; cada literal pasa a `NO_DATA_TEXT` en la tarea
   que ya modifica su archivo: `ProfilePage.tsx` (×3, vía `GameSummaryPanel`),
   `AccountRow.tsx` y `RankScale.tsx` (vía `formatRankGain`) en T5, y `MatchEntry.tsx` (×2)
   en T9; en pantalla no cambia nada. La constante la añade T2 (decisión del planner por
   encargo del usuario), porque T2 crea `formatRankGain`, que devuelve esa constante para
   `null`, y va antes que T5 y T6; T2 actualiza también la cabecera de `copy.ts` a "las specs
   007 y 008". Al final, "Sin datos" aparece como literal de interfaz solo en `copy.ts`
   (`grep` de T10, ignorando comentarios). Aplicada en las reglas, T2, T5, T6, T7, T9, T10 y
   la trazabilidad (RF-17).

## Ajustes durante la implementación
- **P63 (T4, 2026-10-20).** Decisión del usuario (2026-10-20): aceptar las desviaciones de
  T4 y corregir los documentos ("Seguir y corregir docs"). (1) Las consultas de la ficha son
  6, no 7: del jugador, usuario, cuentas, disponibilidad y resumen (una consulta por pestaña
  vista); propias, cuentas y disponibilidad. (2) Las claves del jugador van tras `'them', id`
  y las propias tras `'own'`, para que `/jugadores/own` no comparta la clave de las cuentas
  propias. Detalle en el plan, sección 13. Aplicado en T4 y T10; ninguna tarea se añade ni
  cambia de orden, y la spec no cambia.
- **P64 (defecto de T4 hallado en T8, 2026-10-20).** `AppLayout` (007) envuelve las páginas
  en `AnimatePresence mode="wait"`; al salir de la ficha, la página saliente sigue montada,
  lee la dirección de destino (sin `?juego=`) y `usePlayerTab` hace `setSearchParams({ juego
  }, { replace: true })` sobre ella: "Proponer sesión" llega a `/agenda?juego=lol` sin
  `location.state.proposal` (fallan RF-7 y RF-21) y cualquier salida añade `?juego=` al
  destino. Decisión del usuario (2026-10-20): "Arreglar usePlayerTab": la corrección de la
  dirección y `selectTab` solo actúan mientras la ruta actual sea la ficha
  (`useMatch(ROUTES.player)` o equivalente). Alternativa descartada: cambiar `AppLayout`
  (código compartido de la 007; obligaría a repetir capturas de otras vistas). Se corrige
  dentro de T8 (archivo y "Hecho cuando" añadidos), volviendo a comprobar los puntos de T4 y
  T6 que dependen de `usePlayerTab`. Detalle en el plan, 3.3 y sección 13. Ninguna tarea se
  añade ni cambia de orden, y la spec no cambia. La trazabilidad de RF-5 y RF-20 incluye T8.
- **P65 (C10-1 del registro de T10, 2026-10-20).** "Proponer sesión" deshabilitado
  (`aria-disabled`, atenuado) da 1,74:1 (oscuro) y 2,61:1 (claro). Decisión del usuario
  (2026-10-20): "Excepción (WCAG)". RNF-5 exime del mínimo de contraste el texto de los
  componentes de interfaz inactivos, como WCAG 2.x, 1.4.3; el motivo o el texto de RF-23 junto
  al botón sí debe cumplirlo (hoy ≥ 7,36:1). Alternativa descartada: tratarlo como defecto y
  cambiar el estilo compartido del botón deshabilitado. Es un cambio de spec (**cambio B,
  aprobado (2026-10-20, por el usuario: "Apruebo el cambio B")**); no hay código ni tarea nueva. Aplicado en la
  cabecera y en la trazabilidad (RNF-5). Detalle en el plan, 4.7 y sección 13.
- **P66 (D10-3 del registro de T10, 2026-10-20).** Títulos, etiquetas y unidades de la ficha
  escritos en los componentes en lugar de `copy.ts` (lista en el plan 4.6). Decisión del
  usuario (2026-10-20): "Moverlos a copy.ts", sin cambio visible. Alternativa descartada:
  ajustar la regla del plan para permitirlos en los componentes. Se añade **T11** (después de
  T10), que corrige además la observación O-1 (comentario de `hooks.ts:13`, "7 consultas" → 6;
  P63). La spec no cambia. Aplicado en la cabecera, las reglas, T11 y la trazabilidad (RF-3,
  RF-4, RF-6, RNF-2). Detalle en el plan, 4.6 y sección 13. Alcance fijado por las Preguntas
  11 a 13 (sección siguiente).
- **P67 (inventario del paso 1 de T11, 2026-10-20; `validation.md`, 5.1).** "Horas en común"
  aparece también en `frontend/src/app/pages/CrossingVisual.tsx:23` (`{ id: 'horario', label:
  'Horas en común', … }`, pintado en `:129` en la portada, `LandingPage`), archivo que la tabla
  del plan 4.6 no listaba; T11 paró y lo reportó. Además, `grep -rnF "Horas en común"` encuentra
  dos textos más largos que contienen la cadena: "Horas en común por semana"
  (`MatchFiltersPanel.tsx:75`, rótulo del filtro) y el mensaje de error del mock
  (`mockApi.ts:192`, copia del literal del servidor de la 005). Decisión del usuario
  (2026-10-20): "Incluir la portada". T11 cambia también `CrossingVisual.tsx:23` (solo ese
  literal) por `SHARED_HOURS_TITLE`, sin cambio visible, con capturas de la portada antes y
  después (pasos 2 y 5) y volcado de su texto; los otros dos son textos distintos y no se
  tocan, y el "Hecho cuando" (1) busca el literal exacto y los anota como tales. Alternativa
  descartada: dejar el literal de la portada como excepción del `grep`. Aplicado en las
  reglas y en T11 (archivos, pasos 1, 2, 3 y 5, "Hecho cuando"); detalle en el plan, 1, 4.6,
  6.2 y sección 13. Ninguna tarea se añade ni cambia de orden, la trazabilidad no cambia (RF-6
  ya incluye T11) y la spec no cambia.

## Decisiones del usuario sobre las Preguntas 11 a 13 del plan (2026-10-20)
Alcance de T11 (P66); texto completo de cada pregunta en el plan, sección 14. Todas con la
opción a (la recomendada).
11. **Pregunta 11 ("se inscribió" en el perfil).** Decisión del usuario (2026-10-20): opción
    a, "Sí, cambiarlo". T11 cambia también "se inscribió" de `ProfilePage.tsx:65` por
    `JOINED_TEXT`, sin cambio visible. Aplicada en las reglas y en T11 (archivos, paso 3,
    "Hecho cuando").
12. **Pregunta 12 (`'hora'`/`'horas'` y "Horas en común" en componentes de la 007).**
    Decisión del usuario (2026-10-20): opción a, "Sí, cambiarlos". T11 cambia también
    `pluralize(…, 'hora', 'horas')` de `MatchEntry.tsx:110` (`HOUR_UNIT`) y la leyenda "Horas
    en común" de `HoursSheet.tsx:136` (`SHARED_HOURS_TITLE`), sin cambio visible, con capturas
    antes y después de coincidencias (fila y cajón de horas abierto, con la grilla y su
    leyenda). Aplicada en las reglas y en T11 (archivos, pasos 2, 3 y 5, "Hecho cuando").
13. **Pregunta 13 (textos de la ficha que la primera lista de D10-3 no recogía).** Decisión
    del usuario (2026-10-20): opción a, "Incluirlos". T11 incluye "lectura registrada"/"lecturas
    registradas" (`GameSummaryPanel.tsx:66-67`, `READINGS_UNIT`), "Primera lectura:" (`:86`,
    `FIRST_READING_LABEL`) y el formato "Δ <n> pts" como `rankDistanceText(n)` de `copy.ts`
    (`RankDistanceBlock.tsx:84` y `MatchEntry.tsx:99`), sin cambio visible. Aplicada en las
    reglas y en T11 (archivos, pasos 1, 2 y 3, "Hecho cuando").
La trazabilidad no cambia: T11 sigue cubriendo RF-3 (mismo "se inscribió" en ficha y perfil),
RF-4 (panel), RF-6 (horas en común y "Δ <n> pts", mismo texto que coincidencias) y RNF-2.

## Cambio B (2026-10-20)
Estado: **aprobado (2026-10-20, por el usuario: "Apruebo el cambio B")**. P65 (excepción de
contraste del texto de los controles deshabilitados en RNF-5); no añade código ni tareas.

## Preguntas abiertas
Ninguna. T11 está lista para empezar.
