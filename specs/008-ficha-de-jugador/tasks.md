# Tareas 008 — Vista nueva: ficha de jugador
Estado: aprobado (2026-10-18): "Apruebo las tareas". Decisiones del usuario sobre las
preguntas de las tareas (Q1 y Q2) en la sección final. Todas las tareas están pendientes.
Spec: `specs/008-ficha-de-jugador/spec.md` (aprobada el 2026-10-18). Plan:
`specs/008-ficha-de-jugador/plan.md` (aprobado el 2026-10-18: "Apruebo el plan").

## Dependencias externas (antes de T1)
- **Plan 007 aprobado y spec 007 con T1 a T26 hechas** (plan 008, sección 0 y decisión de la
  Pregunta 1). La 008 usa, sin crearlas: `execute` (plazo de 30 s, descarte de respuestas
  tardías, 401), `ApiError` con `status` y `hasMessage`, `isSessionCleared`,
  `shared/utils/copy.ts`, `DemoTag`, `Failure` con `title`, `PublicUser`,
  `GameAccount.simulated`, `domain/rankScale.ts`, `domain/matching.ts` (`rankDistance`),
  `domain/availability.ts` (`parseBlock`, `compareBlocks`, `intersectBlocks`,
  `groupBlocks`, `formatRange`, `GRID_HOURS`), `domain/rankProgress.ts`
  (`rankGainSinceFirst`), `domain/proposal.ts` (`blockReason`, `buildProposal`,
  `PROPOSAL_DEFAULTS`), `profile.getAvailabilityOf`, `queryClient` sin reintentos y sin
  refresco al enfocar ni al reconectar, claves `['u', userId, …]`, `isProtectedPath`,
  `ProtectedRoute` y la recepción de la propuesta en la agenda (007 RF-30, T26).
  **Al empezar cada tarea**, el implementer comprueba que las piezas que esa tarea usa
  existen con la firma del plan 008. Si falta alguna o tiene otra firma, **para y lo
  reporta**; no la crea dentro de la 008.
- **Solo T10 (parte con servidor real)** necesita además las specs 005 (`/api/matches`) y
  006 (`/api/sessions`) implementadas en `backend/`, la 007 completa (hasta su T29), MongoDB
  local y `backend/.env`. T1 a T9 se comprueban en modo simulado y con `typecheck`, `lint`
  y `build`.
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
  módulos con imports sin extensión o con `@/` se cargan con el gancho de resolución de la
  007 (`module.register`, texto en `specs/007-integrar-frontend/validation.md`);
  `mockUserTarget.ts` y `tabKeys.ts` no tienen imports y se cargan directo. En T3 el
  script carga además `mockApi.ts` con sustitutos de `localStorage` e `import.meta.env`
  (decisión del usuario Q1); si no carga, el implementer para y lo reporta.
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
  dominio devuelve códigos.
- Ninguna función pura importa React, `fetch`, almacenamiento ni lee el reloj; ninguna
  recibe "hoy" (plan, sección 2: la semana tipo no tiene fecha).
- No se cambia el aspecto ni el comportamiento del perfil ni de coincidencias, salvo los
  enlaces de RF-2 (T9).

## Tareas

- [ ] **T1. Reglas puras de la ficha (`playerSheet.ts`).** RF-4, RF-6, RF-7, RF-9, RF-10, RF-12, RF-13, RF-15, RF-17, RF-19, RF-20, RF-22, RF-23, RNF-6
  - Objetivo: todas las decisiones de la ficha como funciones puras comprobables con Node.
  - Archivos: `frontend/src/domain/playerSheet.ts` (nuevo);
    `specs/008-ficha-de-jugador/validation.md` (nuevo: esqueleto con fecha, commit, versión
    de Node, secciones "Comprobaciones con Node", "Revisiones de código", "Modo simulado" y
    las seis partes del orden de P42 más "Fuera del orden").
  - Pasos:
    1. Comprobar que existen `intersectBlocks`, `groupBlocks`, `rankDistance`,
       `blockReason`, `buildProposal` y `GAME_IDS` con la firma del plan (sección 2).
    2. Escribir el script con **todos** los casos del plan 6.1 de `sharedHours` +
       `proposeState` (recorrido martes 20–22 + jueves 3; 00:00 y 12:00; serie de 6 h;
       tramo 10–14 → 12:00 y 2 h; martes 23 + miércoles 0; miércoles 0 y 12;
       solo 02:00–11:00), los seis motivos (el 2 en `lol`, `r6` y `cs2`), carga, fallo,
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
       (sin reimplementar intersección, agrupado, distancia ni primer bloque) y usando
       `GAME_IDS.includes`, no `isGameId`.
    4. Ejecutarlo en verde y pegar script y salidas en `validation.md`.
  - Hecho cuando: el script da verde en todos los casos del plan 6.1 de estas funciones (y
    el rojo previo está anotado); `playerSheet.ts` no importa React, `fetch`, `Date` ni
    almacenamiento, y no contiene una intersección, agrupado ni cálculo de distancia
    propios (búsqueda anotada); verificación estándar en verde.

- [ ] **T2. Utilidades puras: diferencia de rango, teclas de pestaña, rutas y destino del simulado.** RF-1, RF-2, RF-4, RF-11, RF-15, RF-17, RF-20, RNF-2
  - Objetivo: las piezas puras pequeñas que usan la página, `GameTabs` y el mock.
  - Archivos: `frontend/src/domain/rankProgress.ts` (mod.: `formatRankGain`),
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
    con sesión `user-3` → own); rojo; implementar; verde; pegar en `validation.md`.
    `RankScale` todavía no cambia (T5).
  - Hecho cuando: el script da verde en todos esos casos con el rojo previo anotado; el
    signo de "▼ −n" es U+2212 (comprobado en el script por código de carácter);
    `mockUserTarget.ts` y `tabKeys.ts` no tienen ningún `import`; verificación estándar en
    verde.

- [ ] **T3. Contrato, cliente HTTP y backend simulado de las operaciones de la ficha.** RF-11, RF-24, RNF-3
  - Objetivo: `users.get`, `users.listAccounts` y `users.getGameSummary` en el contrato
    único, con el servidor y con el mock, y `profile.getAvailabilityOf` (007) con la
    regla de mayúsculas del simulado.
  - Archivos: `frontend/src/services/apiContract.ts`, `frontend/src/services/http/httpApi.ts`,
    `frontend/src/services/mock/mockApi.ts`; `validation.md`.
  - Pasos:
    1. Comprobar en `backend/src/controllers/users.ts`, `accounts.ts`,
       `backend/src/domain/userId.ts` y `accountRules.ts` las rutas, los códigos y los
       textos que cita el plan 4.5 (400 "id con formato inválido", 404 "Usuario no
       encontrado.", 404 "El jugador no tiene una cuenta vinculada en este juego.", 400
       "Juego no válido.", 200 `[]` para cuentas de inexistente). Si no coinciden, parar.
    2. **Casos primero:** escribir en `validation.md` la tabla de casos del mock (entrada →
       código y texto esperados) del plan 4.5, para las cuatro operaciones: `me`,
       `user-<n>` existente, `USER-<n>` existente, `user-999999`, `USER-999999`, `abc`,
       `ME`, `' me'`; resumen con juego no válido, con usuario inexistente, sin cuenta en
       el juego, con cuenta (≤ 8 partidas, sin correo en el usuario); orden de
       comprobación del resumen (id → juego → usuario → cuenta).
    3. **Script con Node en rojo** (decisión del usuario Q1, opción a): convertir esa tabla
       en un script del scratchpad (`node --test`, no se versiona) que importa `mockApi.ts`
       con el gancho de resolución de la 007 (`module.register`: añade `.ts` y resuelve
       `@/`) y dos sustitutos registrados antes de importar: un `localStorage` en memoria
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
       y `getAvailabilityOf` con `resolveMockUserTarget`, mismos códigos, textos y orden que
       el servidor, datos públicos sin correo si no es el propio, respuestas crudas con
       `{ error }` y todas por `execute` (plazo de 30 s, RF-24). Sin cambios en `seed.ts`.
    5. Repetir el script hasta el verde y pegar en `validation.md` su texto y las dos
       salidas (rojo y verde).
  - Hecho cuando: los casos de la tabla del mock se ven fallar antes de implementar y pasar
    después, con el script de Node; su texto y las salidas en rojo y en verde están en
    `validation.md`; `grep` confirma que las tres rutas de `httpApi.ts` usan `encodeURIComponent`
    y que ninguna operación nueva del mock esquiva `execute`; ninguna respuesta de
    `users.get` de otro jugador lleva `email`; verificación estándar en verde.

- [ ] **T4. Claves de consulta, hooks de la ficha, pestaña en la dirección y flujo de RF-19.** RF-5, RF-8, RF-9, RF-18, RF-19, RF-20, RF-24, RF-26
  - Objetivo: la capa de datos de la ficha sin interfaz todavía.
  - Archivos: `frontend/src/app/providers/queryKeys.ts` (claves `player.*` bajo
    `['u', sessionUserId, 'player', visit, …]`), `frontend/src/features/players/hooks.ts`
    (nuevo: `usePlayerVisit`, `usePlayer`, `usePlayerAccounts`, `usePlayerAvailability`,
    `usePlayerSummary`, `useOwnAccountsForSheet`, `useOwnAvailabilityForSheet`,
    `toLoadable`), `frontend/src/features/players/usePlayerTab.ts` (nuevo),
    `frontend/src/features/players/useSummaryRecheck.ts` (nuevo).
  - Pasos: implementar según el plan 3.3, 3.4 y 3.6: visita nueva en cada montaje; las 7
    consultas con `staleTime: Infinity`, `refetchOnMount: false` y `enabled` (sesión, no
    ficha propia; el resumen solo con `tab ≠ null`); `toLoadable` con `errorStatus` de
    `ApiError.status` (estado 0 = sin respuesta, RF-24 → `failed`); `usePlayerTab` con
    `resolveTab` y `setSearchParams(…, { replace: true })` al corregir y al elegir;
    `useSummaryRecheck` solo ante 404 del resumen, una vez por `${tab}:${errorUpdatedAt}`,
    con `Promise.all` de `refetch()` de usuario y cuentas y `rechecking` mientras tanto.
    Si tras repedir la pestaña sigue existiendo, expone el 404 del resumen como error
    para RF-18, sin pedir nada más (decisión de la Pregunta 3 del plan).
  - Hecho cuando: revisión de código anotada en `validation.md`: las 7 consultas tienen
    `staleTime: Infinity` y `refetchOnMount: false`, ninguna `refetchInterval` ni
    `refetchOnWindowFocus: true`; las claves llevan `sessionUserId` y `visit`; el resumen
    no se pide sin cuentas cargadas; `useSummaryRecheck` no reacciona a errores distintos
    de 404 ni dos veces al mismo error; verificación estándar en verde.

- [ ] **T5. Pestañas accesibles y panel de juego compartido con el perfil.** RF-4, RF-5, RF-16, RF-17, RF-27, RNF-1, RNF-2
  - Objetivo: reutilizar las piezas del perfil en la ficha sin cambiar el perfil.
  - Archivos: `frontend/src/shared/components/GameTabs.tsx` (props opcionales `idBase` y
    `panelId`), `frontend/src/features/profile/components/GameSummaryPanel.tsx` (nuevo,
    extraído de `ProfilePage`), `frontend/src/features/profile/pages/ProfilePage.tsx`,
    `frontend/src/features/profile/components/AccountRow.tsx` (prop opcional
    `showHandleLabel`), `frontend/src/shared/components/RankScale.tsx` (usa
    `formatRankGain`); `validation.md`.
  - Pasos: antes de tocar nada, capturar el perfil y coincidencias en modo simulado a
    1280 y 360 px (`specs/008-ficha-de-jugador/validation/before/`); `GameTabs` según el
    plan 4.3 solo cuando recibe `idBase` y `panelId` (`role`, `id`, `aria-controls`,
    `aria-selected`, `tabIndex` itinerante, `nextTabIndex` con activación automática y
    foco); `GameSummaryPanel` según el plan 4.2 (2), sin acciones si no recibe `onSync`,
    con "Sin datos" defensivo (`readNormalized`, `readWinRate`) y la Etiqueta donde la 007
    la pone en el perfil; `ProfilePage` lo usa; `AccountRow` muestra "Riot ID", "Ubisoft
    ID" o "SteamID64" solo con `showHandleLabel`; `RankScale` muestra `formatRankGain`.
  - Hecho cuando: las capturas después (`validation/after/`) del perfil y de coincidencias
    coinciden con las de antes (diferencias anotadas: ninguna esperada); sin `idBase` el
    marcado de `GameTabs` es el de hoy; el perfil sigue mostrando "▲ +0 pts desde la
    primera lectura" en una cuenta con una sola lectura; verificación estándar en verde.

- [ ] **T6. Página de la ficha: ruta, ficha propia, encabezado, estado de página y sección de juegos.** RF-1, RF-3, RF-4, RF-5, RF-8, RF-9, RF-10, RF-15, RF-16, RF-18, RF-19, RF-20, RF-24, RNF-1, RNF-3, RNF-5
  - Objetivo: la ficha navegable con sus datos públicos y sus pestañas.
  - Archivos: `frontend/src/app/router.tsx` (ruta diferida dentro de `ProtectedRoute` +
    `AppLayout`), `frontend/src/features/players/pages/PlayerPage.tsx` (nuevo),
    `frontend/src/features/players/pages/playerPage.css` (nuevo),
    `frontend/src/features/players/components/PlayerHeader.tsx` (nuevo),
    `frontend/src/features/players/components/PlayerGamesSection.tsx` (nuevo),
    `frontend/src/shared/utils/copy.ts` (todos los textos del plan 4.6).
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
    vacío hasta T7 y T8. Textos de `copy.ts` copiados carácter a carácter de la spec.
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

- [ ] **T7. Bloque de cruce: horas en común, nota de zonas y distancia de rango.** RF-6, RF-8, RF-13, RF-17, RF-18, RF-22, RF-27, RNF-1, RNF-5
  - Objetivo: lo que el jugador de la ficha y el usuario de la sesión tienen en común.
  - Archivos: `frontend/src/features/players/components/SharedHoursBlock.tsx` (nuevo),
    `frontend/src/features/players/components/RankDistanceBlock.tsx` (nuevo),
    `frontend/src/features/players/pages/PlayerPage.tsx`,
    `frontend/src/features/players/pages/playerPage.css`.
  - Pasos: según el plan 4.2 (3): total con `pluralize`, tramos con `formatRange` o "Sin
    horas en común", nota de RF-22 en `notice` si `zonesDiffer`, `HoursSheet readOnly
    compareWith` en un recuadro con `overflow-x: auto`; carga mientras llega cualquiera de
    las dos disponibilidades y un `Failure` con "Reintentar" por cada una que falle.
    Distancia con `distanceView`: "Δ n pts" + `DemoTag` si la cuenta del jugador lleva la
    marca, texto de RF-13 con enlace a Configuración, "Sin datos", carga, error de las
    cuentas propias o del resumen con su "Reintentar"; sin juego elegido no se muestra.
  - Hecho cuando, en modo simulado: con un jugador semilla, las horas en común y la
    distancia coinciden con su fila en coincidencias para el mismo juego; un juego sin
    cuenta propia muestra "Vincula tu cuenta de <juego> para ver la distancia de rango"
    con enlace; con zonas distintas aparece la nota y con iguales no; la ficha de un
    jugador sin cuentas (si el simulado lo tiene) no muestra distancia; a 360 px la grilla
    se desplaza dentro de su recuadro y la página no; `grep` de colores literales sin
    resultados; verificación estándar en verde.

- [ ] **T8. "Proponer sesión" desde la ficha.** RF-7, RF-10, RF-12, RF-21, RF-23, RNF-2
  - Objetivo: proponer con el juego, el primer bloque proponible y la duración ya fijados.
  - Archivos: `frontend/src/features/players/components/ProposeSessionAction.tsx` (nuevo),
    `frontend/src/features/players/pages/PlayerPage.tsx`.
  - Pasos: según el plan 3.2 y 4.4: `proposeState` con los cuatro datos para proponer;
    bloqueado → `aria-disabled="true"`, clic sin efecto, motivo o texto de RF-23 en `<p
    className="note">` enlazado con `aria-describedby`, enlace a Configuración en los
    motivos 2 y 3; `ready` → `navigate(ROUTES.schedule, { state: { proposal } })` con una
    referencia que impide navegar dos veces. La ficha no toca la agenda (RF-21 lo cumple
    la T26 de la 007).
  - Hecho cuando, en modo simulado: con cruce proponible, "Proponer sesión" abre la agenda
    con el juego elegido, el primer bloque proponible, la duración del plan 3.1, "Sesión
    con <nombre>", 5 cupos y notas vacías, y "Atrás" vuelve a la ficha en su pestaña; un
    juego sin cuenta propia muestra el motivo 2; con "3G lenta" se ve "Cargando los datos
    para proponer una sesión…"; bloqueando la disponibilidad propia se ve "No se pudieron
    cargar los datos para proponer una sesión."; el botón bloqueado recibe el foco con
    Tab; un doble clic deja una sola entrada nueva en el historial; verificación estándar
    en verde.

- [ ] **T9. Enlaces desde coincidencias y agenda, y petición del nombre con tabulador.** RF-2, RF-7, RF-15, RF-20, RNF-2, RNF-3
  - Objetivo: llegar a la ficha desde las vistas existentes y preparar la comprobación del
    título.
  - Archivos: `frontend/src/features/matches/components/MatchEntry.tsx`,
    `frontend/src/features/sessions/components/SessionSlip.tsx`,
    `backend/requests/users.rest` (no es servidor; P45).
  - Pasos: en `MatchEntry`, el nombre visible del candidato pasa a `Link` a
    `playerPath(candidate.user.id, candidate.gameId)`; en `SessionSlip`, el de cada
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
    `git diff backend/` solo muestra `requests/users.rest`; verificación estándar en verde.

- [ ] **T10. Validación: revisiones de código y registro en el orden de P42.** Todos los RF y RNF (RF-14 y RF-25 retirados)
  - Precondición de la parte B: specs 005 y 006 implementadas en `backend/`, la 007
    completa (su T29), MongoDB local, `backend/.env`, sin Internet. La parte A no las
    necesita.
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
    opciones de las 7 consultas (RF-26); `playerSheet.ts` sin reimplementar intersección,
    agrupado, distancia ni primer bloque, y sin `Date`, React ni `fetch` (RNF-6); revisión
    del mock: 404 al resumen sin cuenta, 404 "Usuario no encontrado." para inexistente y
    200 `[]` en cuentas de inexistente (RF-11, RF-19); `fetch(` solo en `httpClient.ts`.
    Repetir las comprobaciones con Node de T1, T2 y T3 sobre el código final (verde).
  - **Parte B — registro manual** (plan 6.3), servidor real, base vacía, modo simulado
    desactivado, jugadores A, B, C (zonas de P44), D y E, en este orden y con fecha y
    resultado por paso: (1) Recorrido sin el paso de CS2 (identificadores usados,
    verificados y distancia por juego, disponibilidad guardada); (2) Estados, terminando
    con martes 20, 21, 22 y jueves 03 restaurados; entre 2 y 3: latencia de 40 s (RF-24),
    servidor apagado y "Reintentar" (RF-18), teclado y NVDA (RNF-2), 360 px, Lighthouse en
    los dos temas y selector de color (RNF-5); (3) Agenda, con la desvinculación de LoL de
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
    Preguntas 1 a 3 del plan 008, y `AGENTS.md` si cambia la estructura
    (`features/players/`). La spec 008 pasa a "implementada" solo con la parte B completa.

## Trazabilidad RF / RNF → tareas
Todo RF y RNF vigente está cubierto por al menos una tarea de implementación y por T10.

| Requisito | Tareas |
| --- | --- |
| RF-1 | T2, T6, T10 |
| RF-2 | T2, T9, T10 |
| RF-3 | T6, T10 |
| RF-4 | T1, T2, T5, T6, T10 |
| RF-5 | T4, T5, T6, T10 |
| RF-6 | T1, T7, T10 |
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
| RF-17 | T1, T2, T5, T7, T10 |
| RF-18 | T4, T6, T7, T10 |
| RF-19 | T1, T4, T6, T10 |
| RF-20 | T1, T2, T4, T6, T9, T10 |
| RF-21 | T8 (lo cumple la T26 de la 007), T10 |
| RF-22 | T1, T7, T10 |
| RF-23 | T1, T8, T10 |
| RF-24 | T3, T4, T6, T10 |
| RF-25 | Retirado (P33); sin tarea |
| RF-26 | T4, T10 |
| RF-27 | T5, T7, T10 |
| RNF-1 | T5, T6, T7, T10 |
| RNF-2 | T2, T5, T8, T9, T10 |
| RNF-3 | T3, T6, T9, T10 |
| RNF-4 | Todas (verificación estándar) |
| RNF-5 | T6, T7, T10 |
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

## Preguntas abiertas
Ninguna.
