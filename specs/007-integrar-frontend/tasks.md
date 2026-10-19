# Tareas 007 — Conectar la interfaz al servidor real
Estado: borrador (2026-10-18), pendiente de aprobación del usuario. Todas las tareas están
pendientes.
Spec: `specs/007-integrar-frontend/spec.md` (aprobada el 2026-10-18). Plan:
`specs/007-integrar-frontend/plan.md` (borrador).
Alineación del 2026-10-19 con la spec (RF-10, puntos 4, 5, 10, 12 y 13): solo cambian los
textos y el 401 «token inválido» en T6, T16, T17 y T23; no se añaden ni se quitan tareas.
Ajustes menores del 2026-10-19 (aprobación expresa del usuario; R21 y R22 de la spec): T6 y T11
usan «correo o contraseña incorrectos» (minúscula, sin punto final); T17 y T23 recogen la
excepción aprobada al RF-16 (el literal «rango verificado» del servidor en el error del filtro
de verificadas, que el modo simulado reproduce y la interfaz nunca muestra). Sin otros cambios.

**Más de 10 tareas por decisión del usuario (R20, 2026-10-18).** La spec se mantiene entera;
esa decisión prevalece sobre la regla de la skill `sdd` de proponer dividir. Las tareas se
agrupan en los tres bloques de RF de la spec (Sesión y conexión, Datos simulados y
presentación, Proponer sesión), con una tarea previa (línea base) y un cierre.

## Reglas para cada tarea
- Una tarea = una llamada al implementer; se hacen en orden. Marcar la tarea y parar.
- **Frontend (todas salvo T30):** no hay runner de prueba (RNF-3; constitución, principio 4).
  La comprobación de cada tarea es la verificación estándar, en verde, más la comprobación
  propia que indica "Hecho cuando":
  ```
  cd frontend && npm run typecheck && npm run lint && npm run build
  ```
  Donde se indica "Node", la comprobación es un script desechable en el scratchpad (no se
  versiona; texto y resultado al registro de validación, plan sección 5).
- **Backend:** esta spec no cambia el backend. Si una tarea descubre que el servidor no
  cumple lo que el plan toma de él, parar y reportar (no tocar `backend/`).
- Sin `any`, sin `@ts-ignore`, sin `dangerouslySetInnerHTML`, sin colores escritos a mano
  (solo `styles/tokens.css`), sin `.only`. Ninguna dependencia nueva.
- Los textos literales de la spec viven solo en `shared/utils/copy.ts` (plan, sección 1).
- Ninguna tarea cambia la disposición ni los estilos de una vista existente (RNF-4): solo
  los textos y elementos que exige la spec.
- Al cerrar cada tarea, `typecheck`, `lint` y `build` quedan en verde y la aplicación
  arranca en modo simulado (`VITE_USE_MOCK_API=true`) sin errores de consola.
- Precondición de T29: specs 004, 005 y 006 implementadas en `backend/` (plan, cabecera).

## Previo — Línea base visual

- [ ] **T1. Capturas de línea base y esqueleto del registro de validación.** RNF-4, RNF-8
  - Hacer **antes de cualquier cambio de interfaz** (antes de T2). Comprobar que
    `git status` no muestra cambios en `frontend/` y anotar el commit.
  - Arrancar la interfaz tal como está (modo simulado, que hoy es el defecto), entrar con la
    cuenta demo y capturar, a 1280 px y a 360 px de ancho, página completa: entrada,
    login, registro, Inicio, perfil, Configuración, coincidencias, agenda y "no encontrada"
    (9 vistas, 18 capturas). Perfil, Configuración, coincidencias y agenda con datos
    cargados (juego con cuenta, sin diálogos abiertos).
  - Archivos (nuevos): `specs/007-integrar-frontend/validation.md` (esqueleto: fecha,
    commit, herramienta de captura, sección de línea base con una fila por captura, secciones
    vacías para el recorrido, la tabla de RNF-6 y la revisión de RF-27) y
    `specs/007-integrar-frontend/validation/baseline/<vista>-<ancho>.png`.
  - Hecho cuando: las 18 capturas existen con nombre `<vista>-1280.png` / `<vista>-360.png`,
    el registro las enumera con el commit y la fecha, y ningún archivo de `frontend/` cambió.

## Bloque 1 — Sesión y conexión (RF-1 a RF-10, RF-19, RF-20, RF-24, RF-25, RF-28, RF-33)

- [ ] **T2. Entorno invertido: servidor real por defecto.** RF-1, RF-13, RNF-5
  - Archivos: `frontend/src/config/mockFlag.ts` (nuevo, sin imports),
    `frontend/src/config/env.ts`, `frontend/.env.example`, comentario de
    `frontend/src/services/api.ts`.
  - Hacer: `isMockEnabled(raw)` = `raw?.trim() === 'true'`; `env.useMockApi` la usa con
    `VITE_USE_MOCK_API`; `env.apiUrl` = `VITE_API_URL` sin espacios o `/api`; plantilla con
    `VITE_API_URL=/api`, `VITE_USE_MOCK_API=false`, `VITE_PROXY_TARGET` y `VITE_MOCK_LATENCY`,
    sin secretos. Comprobar que `VITE_PROXY_TARGET` coincide con el `PORT` de
    `backend/.env.example`.
  - Hecho cuando: Node imprime `false` para `'TRUE'`, `'1'`, `''`, `undefined` y `true`
    para `'true'` y `' true '`; la plantilla existe, no tiene secretos y deja el modo
    simulado en `false`; con `VITE_USE_MOCK_API=true npm run dev` aparece la pista de la
    cuenta demo en login, y con `TRUE` o sin variable no; `typecheck`, `lint` y `build` en
    verde.

- [ ] **T3. Comprobante, aviso de 401 y textos fijos.** RF-2, RF-3, RF-19
  - Archivos (nuevos): `frontend/src/services/http/csrfStorage.ts`,
    `frontend/src/services/http/sessionEvents.ts`, `frontend/src/shared/utils/copy.ts`;
    `frontend/src/config/env.ts` (`STORAGE_KEYS`: añadir `csrf` y `sessionSignal`; `token`
    se quita en T6).
  - Hacer: `csrfStorage` con `readCsrf`, `saveCsrf`, `clearCsrfIfOwn`, comprobante de esta
    pestaña y respaldo en memoria si el almacenamiento falla (plan 3.2); `sessionEvents`
    con `onUnauthorized` y `emitUnauthorized`; `copy.ts` con `SIMULATED_LABEL`,
    `NO_MESSAGE_TEXT`, `LOADING_TEXT`, `SENDING_TEXT`, los tres avisos de login, el texto de
    `Resincronizar`, el de relectura y los cuatro motivos de bloqueo de "Proponer".
  - Hecho cuando: el código de revisión confirma que `clearCsrfIfOwn` solo borra si el valor
    guardado es el de la pestaña; ningún módulo salvo `csrfStorage` lee `tmu.csrf`; los
    textos de `copy.ts` coinciden carácter a carácter con la spec (incluidos «…» y las
    tildes); `typecheck`, `lint` y `build` en verde.

- [ ] **T4. Transporte con plazo de 30 s y clasificación de errores.** RF-5, RF-7, RF-9, RF-20, RNF-1
  - Archivos: `frontend/src/services/http/errorBody.ts` (nuevo, sin imports),
    `frontend/src/services/http/transport.ts` (nuevo), `frontend/src/services/http/httpClient.ts`.
  - Hacer: `readErrorMessage`; `execute` según el plan 3.3 (plazo de 30 s que cubre la
    lectura del cuerpo, registro de peticiones en vuelo, época, descarte de respuestas
    tardías, 401 → `emitUnauthorized` solo si la llamada es protegida, `ApiError` con
    `hasMessage` y estado 0 para fallos sin respuesta, `SessionClearedError` e
    `isSessionCleared`); `request()` pasa a usar `execute`, deja de leer `tmu.token` y de
    enviar `Authorization`, envía `X-CSRF-Token` si hay comprobante (también en las
    públicas), usa `credentials: 'same-origin'` y lee el error de `error`, no de `message`.
    `ApiError` conserva su constructor `(message, status, details?)` para no romper el mock.
  - Hecho cuando: Node confirma `readErrorMessage` para: `{"error":"x"}` → `x`; `{"error":""}`,
    `{"error":5}`, `{}`, `[]`, `null`, texto HTML, cuerpo vacío → `null`; `grep` no encuentra
    `Authorization` ni `fetch(` fuera de `httpClient.ts`; el modo servidor real con el
    servidor apagado muestra `NO_MESSAGE_TEXT` en una petición (comprobación en consola o en
    el paso de T7); `typecheck`, `lint` y `build` en verde.

- [ ] **T5. Contrato sin token y cliente HTTP con las rutas reales.** RF-2, RF-3, RF-10 (punto 7), RNF-1
  - Archivos: `frontend/src/domain/types.ts`, `frontend/src/services/apiContract.ts`,
    `frontend/src/services/http/httpApi.ts`, `frontend/src/services/api.ts`; ajustes
    mínimos de compilación en `frontend/src/services/mock/mockApi.ts` y
    `frontend/src/services/mock/seed.ts` (campos nuevos con valores provisionales; el
    comportamiento del mock se rehace en T6 y T15 a T18).
  - Hacer: `GameAccount.simulated`, `PublicUser` y `MatchCandidate.user: PublicUser`,
    `SessionStatus = 'open' | 'full'`, `RankSnapshot.points` obligatorio, fuera
    `AuthSession`; `login`/`register` devuelven `User`; `httpApi` con el mapa de la
    sección 4 del plan (incluye `getAvailabilityOf`), login guarda el comprobante de la
    cabecera `X-CSRF-Token` (sin cabecera → error sin mensaje), `me()` devuelve `null` solo
    con 401; los filtros de coincidencias se envían siempre; `api.ts` reexporta `ApiError` e
    `isSessionCleared`.
  - Hecho cuando: ninguna cadena `token` ni `Authorization` queda en `services/http/`; las
    rutas de `httpApi` coinciden una a una con la tabla de la sección 4 del plan; con el
    servidor real (si ya responde `/api/auth` y `/api/users`) un registro y un login
    guardan `tmu.csrf` y ningún otro valor; `typecheck`, `lint` y `build` en verde.

- [ ] **T6. Backend simulado: sesión sin credencial y errores de autenticación.** RF-19, RF-10 (puntos 1, 2 y 10), RF-3
  - Archivos: `frontend/src/services/mock/mockApi.ts`, `frontend/src/config/env.ts`
    (quitar `STORAGE_KEYS.token`).
  - Hacer: las operaciones del mock devuelven respuesta cruda y pasan por `execute`; registro
    de sesión único `{ userId, csrf }` en la base simulada (plan 3.9); login → 400 por
    campos inválidos, 401 "correo o contraseña incorrectos", comprobante nuevo; registro →
    400 (no 409) por correo o usuario duplicado, sin abrir sesión; logout borra el registro
    de sesión; `me` y toda operación protegida: 401 "sesión no iniciada" sin sesión, 401
    "token inválido" con comprobante ausente o distinto o con el usuario ya eliminado (spec
    004, RF-44). Los mensajes de duplicado son los de la spec 002 (nombran el campo).
  - Hecho cuando: en modo simulado, tras iniciar sesión, ningún almacenamiento contiene
    otro valor de sesión que `tmu.csrf`; borrar `tmu.csrf` y guardar algo devuelve 401
    (la acción se completa en T7); recargar con sesión vigente sigue dentro; `grep` no
    encuentra `STORAGE_KEYS.token`; `typecheck`, `lint` y `build` en verde.

- [ ] **T7. `AuthProvider`: consulta de sesión, limpiar la sesión, login, registro y cierre.** RF-3, RF-4, RF-5, RF-6, RF-7, RF-9, RF-33
  - Archivos: `frontend/src/features/auth/AuthContext.ts`,
    `frontend/src/features/auth/AuthProvider.tsx`, `frontend/src/app/routes.ts`
    (`isProtectedPath`).
  - Hacer: estados `checking`/`authenticated`/`anonymous`/`error`; consulta de sesión con el
    plazo de 30 s fuera de TanStack, con token de intento y `retry()` sin límite; `401` →
    limpiar y quedar sin sesión sin RF-7; cualquier otro fallo → `error` con el mensaje de
    RF-9; `clearClientSession({ deleteCsrf })` (`abortAllRequests`, `cancelQueries`, `clear`,
    usuario nulo, borrado del comprobante solo si es el de la pestaña); `login(credentials,
    redirectTo)` navega con `replace` en el mismo lote que `setUser`; `register` con inicio
    de sesión y la rama de fallo hacia login con correo y aviso `registered` (RF-4, sin
    aplicar RF-9 a ese inicio); `logout` espera la respuesta o los 30 s, limpia y va a
    login con `replace`; `onUnauthorized(epoch)` según el plan 3.4 (ignora épocas viejas;
    con usuario → `expired` con ruta de origen; sin usuario → login sin aviso).
  - Hecho cuando: con el servidor real: registrar un jugador llega a Inicio; con el login
    bloqueado en la pestaña de red llega a login con el correo y "Tu cuenta se creó; inicia
    sesión"; recargar con sesión vigente sigue dentro; recargar sin comprobante deja sin
    sesión sin error; cerrar sesión con el servidor apagado lleva a login; borrar la
    cookie y guardar la disponibilidad lleva a login con una sola entrada nueva en el
    historial y sin comprobante en el almacenamiento (el aviso visible llega con T11);
    `typecheck`, `lint` y `build` en verde.

- [ ] **T8. TanStack Query: sin reintentos, claves por usuario y consultas condicionadas.** RF-5, RF-20, HU-3
  - Archivos: `frontend/src/app/providers/queryClient.ts`,
    `frontend/src/app/providers/queryKeys.ts`,
    `frontend/src/features/auth/useSessionUserId.ts` (nuevo),
    `frontend/src/features/profile/hooks.ts`, `frontend/src/features/matches/hooks.ts`,
    `frontend/src/features/sessions/hooks.ts`.
  - Hacer: `retry: false`, `staleTime: 0`, `refetchOnWindowFocus: false`,
    `refetchOnReconnect: false`, comentario corregido (ya no dice que el backend refresca de
    forma periódica); claves `['u', userId, ...]`; cada `useQuery` con `enabled: userId !==
    null`; las mutaciones siguen invalidando solo en `onSuccess`.
  - Hecho cuando: cambiar de cuenta (login con otra) nunca muestra datos de la anterior,
    ni un instante; tras cerrar sesión no queda ninguna petición protegida en curso ni nueva
    en la pestaña de red; `typecheck`, `lint` y `build` en verde.

- [ ] **T9. "Cargando…" y pantalla de error de la consulta de sesión.** RF-5, RF-28, RNF-7
  - Archivos: `frontend/src/app/SessionGate.tsx` (nuevo), `frontend/src/app/App.tsx`,
    `frontend/src/shared/components/States.tsx` (`Failure`: `title`, `autoFocusRetry`,
    `role="alert"`; `Working` sin cambios).
  - Hacer: `SessionGate` sobre `AppRouter`: `checking` → `Working` con `LOADING_TEXT` en
    contenedor de página completa; `error` → `Failure` con título "No se pudo comprobar tu
    sesión", mensaje de `sessionError`, foco en "Reintentar" y `role="alert"`; "Reintentar"
    llama a `retry()`. Se retira "Restaurando tu sesión…".
  - Hecho cuando: con el servidor apagado y recarga se ve "Cargando…" y luego la pantalla de
    error con el foco en "Reintentar", sin login ni vistas protegidas, también en `/` y en
    una dirección inexistente; al encender el servidor, "Reintentar" devuelve al jugador
    dentro; con la red en "3G lenta" solo se ve "Cargando…" hasta la respuesta; con la
    consulta bloqueada sin respuesta aparece el error a los 30 s; el árbol de accesibilidad
    muestra el `alert`; `typecheck`, `lint` y `build` en verde.

- [ ] **T10. Rutas protegidas, ruta de origen e historial.** RF-7, RF-8, RF-25, RF-28, RF-33
  - Archivos: `frontend/src/app/ProtectedRoute.tsx`, `frontend/src/app/router.tsx`,
    `frontend/src/app/pages/NotFoundPage.tsx` (solo si el enlace necesita ajuste).
  - Hacer: `ProtectedRoute` sin usuario → `<Navigate replace state={{ from: pathname }} />`
    sin aviso; `PublicOnlyRoute` con usuario → Inicio con `replace` (RF-33); `*` queda fuera
    de ambas (RF-28); todo redireccionamiento por regla de sesión usa `replace`.
  - Hecho cuando: con sesión cerrada, abrir la dirección de Configuración lleva a login sin
    aviso y, al entrar, vuelve a Configuración; con sesión iniciada, abrir login o registro
    lleva a Inicio sin mostrar el formulario; una dirección inexistente muestra "no
    encontrada" con y sin sesión; "Atrás" desde login no deja en la vista descartada y el
    historial no acumula más de una entrada de login; `typecheck`, `lint` y `build` en verde.

- [ ] **T11. Login y registro: avisos, correo precargado y "Enviando…".** RF-4, RF-7, RF-8, RF-11, RF-20, RF-24, RNF-7
  - Archivos: `frontend/src/features/auth/pages/LoginPage.tsx`,
    `frontend/src/features/auth/pages/RegisterPage.tsx`.
  - Hacer: `LoginPage` lee `{ from, email, notice }` de la navegación, precarga el correo y
    muestra el aviso fijo correspondiente en un `notice` con `role="alert"`; al entrar usa
    `login(creds, from ?? ROUTES.home)`; el botón muestra `SENDING_TEXT` y se deshabilita
    mientras dura la petición; la pista de la cuenta demo solo se muestra con
    `env.useMockApi` (ya está así; comprobar con la plantilla nueva); `RegisterPage` usa
    `register()` del proveedor y llega a Inicio (hoy va a Configuración); su botón muestra
    `SENDING_TEXT`; los errores del servidor se muestran tal como llegan (RF-9).
  - Hecho cuando: tras borrar la cookie y guardar, login muestra "Tu sesión expiró. Vuelve a
    entrar." y, al entrar, vuelve a Configuración; el correo del registro fallido llega
    precargado con "Tu cuenta se creó; inicia sesión"; con credenciales incorrectas se ve
    "correo o contraseña incorrectos" sin llevar a login otra vez; con 40 s de latencia el
    botón dice "Enviando…" y a los 30 s muestra "No se pudo conectar con el servidor.
    Inténtalo de nuevo."; el árbol de accesibilidad muestra los avisos como `alert`;
    `typecheck`, `lint` y `build` en verde.

- [ ] **T12. Cambio de sesión en otra pestaña.** RF-24, RF-3
  - Archivos: `frontend/src/features/auth/crossTabSession.ts` (nuevo),
    `frontend/src/features/auth/AuthProvider.tsx`.
  - Hacer: `announce('login' | 'logout')` tras guardar o borrar el comprobante;
    `startWatching` con evento `storage`, intervalo de 2 s, `visibilitychange`, `focus` y
    `pageshow`; sin almacenamiento no vigila (plan 3.7); la reacción de la pestaña según
    el plan (protegida con usuario → limpiar con `deleteCsrf: false` y a login con aviso
    `otherTab`; pública → solo limpiar; error o sin usuario → solo cancelar y limpiar caché).
    Las limpiezas por RF-5 y RF-7 no escriben la señal.
  - Hecho cuando: con dos pestañas, cerrar sesión en la primera lleva la segunda a login en
    menos de 5 s, sin datos de la cuenta, con "Se cerró o cambió la sesión en otra
    pestaña." y una sola entrada de login; iniciar sesión con otra cuenta en una pestaña
    produce lo mismo en la otra, y el almacenamiento conserva el comprobante de la primera;
    con la segunda pestaña en login no hay aviso; con tres pestañas reaccionan las otras
    dos; en segundo plano reacciona en menos de 5 s tras volver a ser visible; borrar la
    cookie y recibir 401 en una pestaña no mueve a las demás; con almacenamiento bloqueado
    no hay aviso; revisión de código: `clearCsrfIfOwn` solo borra si es el de la pestaña y
    RF-24 llama siempre con `deleteCsrf: false`; `typecheck`, `lint` y `build` en verde.

- [ ] **T13. Escrituras: "Enviando…", doble clic y errores visibles.** RF-9, RF-20, RNF-7
  - Archivos: `frontend/src/shared/components/MutationNotice.tsx` (nuevo),
    `frontend/src/app/layouts/AppLayout.tsx` (cierre de sesión),
    `frontend/src/features/profile/components/LinkAccountForm.tsx`,
    `frontend/src/features/profile/components/AccountRow.tsx`,
    `frontend/src/features/profile/pages/SettingsPage.tsx`,
    `frontend/src/features/profile/pages/ProfilePage.tsx`,
    `frontend/src/features/sessions/pages/SchedulePage.tsx`,
    `frontend/src/features/sessions/components/SessionSlip.tsx`,
    `frontend/src/features/sessions/components/SessionDraftSlip.tsx`.
  - Hacer: en cada escritura iniciada por el jugador (registro y login ya en T11; cierre de
    sesión, vincular, resincronizar, desvincular, guardar perfil, guardar disponibilidad,
    crear, sumarse, salir y cancelar sesión): botón deshabilitado con `SENDING_TEXT` mientras
    dura (el botón con solo icono del cierre cambia su nombre accesible e información
    emergente; el del menú móvil muestra el texto); un solo envío por doble clic; el error
    se muestra siempre con `MutationNotice` (`role="alert"`, texto del servidor o
    `NO_MESSAGE_TEXT`) y nunca si `isSessionCleared`; un plazo vencido no invalida ni
    relee datos. Quedan sustituidos "Guardando…", "Leyendo…", "Anotando…", "Entrando…" y
    "Creando…" por `SENDING_TEXT`.
  - Hecho cuando: con 40 s de latencia, "Resincronizar", "Guardar horas" y registrar un
    jugador muestran "Enviando…" con el botón deshabilitado y a los 30 s lo desbloquean con
    "No se pudo conectar con el servidor. Inténtalo de nuevo." sin llevar a login; un doble
    clic en cualquiera envía una sola petición (pestaña de red); con el servidor apagado,
    guardar la disponibilidad muestra ese texto y no lleva a login; una respuesta que llega
    después de cerrar sesión no muestra nada; `typecheck`, `lint` y `build` en verde.

## Bloque 2 — Datos simulados y presentación (RF-11 a RF-16, RF-18, RF-21 a RF-23, RF-26, RF-27, RF-31, RF-32)

- [ ] **T14. Dominio de la interfaz: escala, normalización, puntaje y bloques.** RNF-6, RF-12, RF-14, RF-23
  - Archivos: `frontend/src/domain/rankScale.ts` (nuevo), `frontend/src/domain/rankProgress.ts`
    (nuevo), `frontend/src/domain/games.ts`, `frontend/src/domain/matching.ts`,
    `frontend/src/domain/availability.ts`; consumidores que cambien de firma
    (`SchedulePage`, mock).
  - Hacer: copiar el criterio de `backend/src/domain/rankScale.ts` y `matching.ts` con los
    mismos nombres y firmas (`ladder`, `stepIndexOf`, `normalizeStep`, `normalizeRank`,
    `pointsBand`; `rankDistance`, `scoreCandidate(distance, sharedCount)` exacto, `foldText`,
    `matchesSearch`, `compareCandidates`, `buildMatches`); quitar `source` de
    `GameDefinition` y la `normalizeRank` propia; `parseBlock` devuelve `null` si no es un
    bloque; `compareBlocks`; `intersectBlocks` sin repetidos y ordenado; `rankGainSinceFirst`.
    Si los archivos del backend aún no existen, se copia de las specs 004 y 005 (plan 004
    sección 3 y plan 005 sección 3.3) y se re-verifica en T27.
  - Hecho cuando: Node (con el gancho de resolución) da, para la copia de la interfaz, todos
    los valores de la tabla de la sección 3.12 del plan (LoL 0, 90, 93, 97, 100; CS2 0, 17,
    50, 100; R6 0, 97, 100; puntajes 78, 100, 0, 55, 2, 58, 67); `typecheck`, `lint` y
    `build` en verde.

- [ ] **T15. Proveedor simulado del modo simulado.** RF-21, RNF-6
  - Archivos: `frontend/src/services/mock/simulatedProvider.ts` (nuevo).
  - Hacer: `canonicalHandle`, `isVerifiedHandle` (suma de `charCodeAt` par), `readAccountState`
    determinista (semilla `juego|identificador|lectura`, escalón inicial repartido por
    toda la escala, cada lectura mueve −1, 0 o +1 y no sale de la escala, puntos dentro de
    `pointsBand`, 1 a 8 partidas con fechas anteriores a `now` y la principal en `now`,
    identificadores de partida nunca repetidos entre lecturas); el instante llega como
    parámetro.
  - Hecho cuando: Node confirma `isVerifiedHandle` para `jugador1#las` y `jugador3#las`
    (verdaderos), `jugador2#las` y `jugador4#las` (falsos), `jugador2` y `jugador4` de R6
    (verdaderos), `jugador1` y `jugador3` (falsos), `76561190000000001` y
    `76561190000000003` de CS2 (verdaderos), `…02` y `…04` (falsos); 20 lecturas seguidas de
    una cuenta nunca saltan más de un escalón; `typecheck`, `lint` y `build` en verde.

- [ ] **T16. Backend simulado: cuentas, perfil y disponibilidad.** RF-10 (puntos 3, 4, 5, 6 y 9), RF-21
  - Archivos: `frontend/src/services/mock/mockApi.ts`.
  - Hacer: vincular con 400 y el mensaje de la 004 (RF-6) por identificador inválido (no
    422), 400 "ya tienes una cuenta vinculada en este juego" (no 409), cuenta con
    `simulated: true`, rango, historial, partidas y verificada del proveedor; desvincular y
    resincronizar con 403 (cuenta ajena, "no tienes permiso para esta operación", 004,
    RF-11) y 404 "cuenta no encontrada"; resincronizar mueve el rango como mucho un escalón y añade una partida
    nueva; R6 como los demás juegos; actualizar perfil guarda el color de avatar y devuelve
    400 sin guardar con nombre vacío o de solo espacios, de más de 40, biografía de más de
    200, zona no IANA y color sin `#RRGGBB`; guardar disponibilidad valida el formato de
    los bloques; resumen por juego (`account`, `recentMatches` de hasta 8, `winRate`).
  - Hecho cuando: en modo simulado se reproducen desde la interfaz el 400 del punto 4 y el
    nombre visible vacío, con espacios o de más de 40 (400 sin guardar); una cuenta de R6
    muestra rango, historial y partidas; resincronizar 10 veces nunca mueve más de un
    escalón y siempre añade una partida; el resto de los puntos se revisan contra el texto
    de cada spec y se anotan en el registro; `typecheck`, `lint` y `build` en verde.

- [ ] **T17. Backend simulado: coincidencias y sesiones.** RF-10 (puntos 7 y 8), RF-21, RF-23
  - Archivos: `frontend/src/services/mock/mockApi.ts`.
  - Hacer: coincidencias con `buildMatches` de `domain/matching.ts` (distancia, puntaje,
    filtros de distancia, horas, solo verificadas y búsqueda, en los tres juegos) y
    candidatos sin correo (`PublicUser`); errores de coincidencias con los textos de la 005
    (spec 007, RF-10 punto 12) en el orden de su RF-16 (el del filtro de verificadas conserva
    «rango verificado», excepción al RF-16 aprobada por el usuario el 2026-10-19, R21); sesiones con los estados `open`/`full`, 409
    "Ya estás inscrito en esta sesión.", 409 "Esta sesión ya no admite jugadores.", 409
    "Eres quien organiza: cancela la sesión en lugar de salir.", 409 "No estás inscrito en
    esta sesión." al salir sin estar inscrito (no 200), 403 y 404 como la 006; cancelar
    devuelve 204; `getAvailabilityOf(userId)` con 400 por identificador sin la forma del
    simulado y 404 si no existe.
  - Hecho cuando: con la cuenta demo y otra cuenta con cuentas en los tres juegos, cada una
    ve a la otra en los tres juegos con "Δ <n> pts"; con la distancia máxima en 0 solo
    aparece con el mismo rango normalizado; "Solo cuentas verificadas" filtra en los tres
    juegos; ningún candidato lleva el correo (inspeccionar la respuesta); los textos de
    error de coincidencias del modo simulado coinciden carácter a carácter con
    `MATCH_ERRORS` de `backend/src/domain/matchQuery.ts` (revisión de código, anotada en el
    registro); `typecheck`, `lint` y `build` en verde.

- [ ] **T18. Datos precargados ficticios.** RF-27, RF-21, RF-11
  - Archivos: `frontend/src/services/mock/seed.ts`, `frontend/src/services/mock/mockApi.ts`
    (clave `tmu.mock-db.v3`, sesión inicial).
  - Hacer: reemplazar los nombres, usuarios, biografías e identificadores de cuenta del
    seed por nombres ficticios sin ninguna palabra de los integrantes de `AGENTS.md`
    (Equipo), ni `vicho`, `cotito`, `dayala`, `sebav`, `benjae`, `marzam`, ni derivados;
    cuenta demo `demo@teammatchup.gg` con cuentas verificadas y no verificadas en cada
    juego (identificadores de ejemplo de la 004 donde convenga, R6 con rango, historial y
    partidas); toda cuenta con `simulated: true`.
  - Hecho cuando: una búsqueda sin mayúsculas ni acentos de cada palabra de los nombres y
    apellidos del equipo y de los seis usuarios en `seed.ts` y en `mockApi.ts` no da
    resultados; el recorrido en modo simulado muestra cuentas verificadas y no verificadas
    en cada juego; el resultado queda en la sección "RF-27" del registro; `typecheck`,
    `lint` y `build` en verde.

- [ ] **T19. Etiqueta de datos simulados, aviso global y pie de la entrada.** RF-11, RF-15, RF-22
  - Archivos: `frontend/src/shared/components/DemoTag.tsx` (nuevo),
    `frontend/src/app/layouts/AppLayout.tsx`, `frontend/src/app/pages/LandingPage.tsx`,
    `frontend/src/app/layouts/AuthLayout.tsx` (solo si repite el aviso),
    `frontend/src/features/auth/pages/LoginPage.tsx` (pista de la cuenta demo).
  - Hacer: `DemoTag` con `SIMULATED_LABEL` y clases y tokens existentes (sin colores
    escritos a mano); aviso global siempre visible, con el servidor real y en modo
    simulado, en la barra (`Demo`/`dock__demo` → «Datos de demostración») y en el pie
    (sin nombrar Riot, Ubisoft ni Steam); pie de la página de entrada con el mismo aviso y
    sin nombrar ninguna fuente; la pista de la cuenta demo solo en modo simulado.
  - Hecho cuando: con el servidor real y con el modo simulado aparece «Datos de
    demostración» en la barra, en el pie y en el pie de la entrada; no existe «Datos
    simulados» ni «Los datos que ves son de demostración» (búsqueda en el código);
    `typecheck`, `lint` y `build` en verde.

- [ ] **T20. Cuentas y Configuración: marca, "Verificada", "Resincronizar", "Última lectura".** RF-11, RF-15, RF-16, RF-18, RF-26, RF-31
  - Archivos: `frontend/src/features/profile/components/AccountRow.tsx`,
    `frontend/src/features/profile/components/LinkAccountForm.tsx`,
    `frontend/src/features/profile/pages/SettingsPage.tsx`,
    `frontend/src/shared/utils/format.ts` (solo si hace falta para la fecha de lectura).
  - Hacer: en la fila de cuenta, la etiqueta de datos simulados donde estaba "Fuente" y
    junto al rango y al sello; sello "Verificada" / "Sin verificar"; botón
    "Resincronizar" con el texto "Al resincronizar, tu rango puede cambiar un escalón y
    pueden llegar partidas nuevas." junto a él, en toda cuenta propia de LoL, R6 o CS2; sin
    acciones de verificar, cambiar identificador ni editar región; "Última lectura" desde
    `lastSyncedAt`; Configuración: texto `El rango se vuelve a leer al pulsar
    "Resincronizar".` en lugar de "Releemos el rango de forma periódica"; la pista del
    formulario de vinculación sin nombrar fuentes (las etiquetas "Riot ID", "Ubisoft ID" y
    "SteamID64" se mantienen).
  - Hecho cuando: con servidor real y en modo simulado cada cuenta de Configuración muestra la
    etiqueta junto al rango y a la verificación; tras responder 200, "Resincronizar"
    actualiza la cuenta; no queda el texto "Volver a leer el rango", "Fuente" ni
    "Verificado"; `typecheck`, `lint` y `build` en verde.

- [ ] **T21. Perfil: R6 con rango, historial, partidas y diferencia desde la primera lectura.** RF-11, RF-12, RF-14, RF-16, RF-31
  - Archivos: `frontend/src/features/profile/pages/ProfilePage.tsx`,
    `frontend/src/shared/components/RankScale.tsx`,
    `frontend/src/features/profile/components/MatchLedger.tsx`.
  - Hacer: para toda cuenta, incluidas las de R6, mostrar rango vigente, historial en el
    orden del servidor (sin suponer que su último elemento es el vigente), partidas, tasa de
    victorias y, en "Posición en la escala del juego", la escala del juego (R6: Copper a
    Champion, Champion sin división, puntos como MMR) y "▲ +<n> pts desde la primera
    lectura" con `rankGainSinceFirst` (sin tendencia); la etiqueta junto al rango, al
    historial, a las partidas y a la marca de verificada; sin "Sin rango" ni "R6 sin rango";
    defensivo: sin rango vigente o sin tasa → "Sin datos" y ningún valor derivado;
    "Última lectura" desde `lastSyncedAt`; "Resincronizar" como en T20.
  - Hecho cuando: el perfil de una cuenta de R6 muestra rango, historial, partidas y la
    escala Copper a Champion igual que LoL y CS2, con la etiqueta; resincronizar actualiza
    todo; ningún texto dice "verificado" ni "rango verificado"; `typecheck`, `lint` y
    `build` en verde.

- [ ] **T22. Coincidencias: etiqueta, filtros habilitados y rótulos.** RF-11, RF-14, RF-16, RF-23, RF-32
  - Archivos: `frontend/src/features/matches/pages/MatchesPage.tsx`,
    `frontend/src/features/matches/components/MatchEntry.tsx`,
    `frontend/src/features/matches/components/MatchFiltersPanel.tsx`.
  - Hacer: el filtro de distancia y el de verificadas habilitados y con efecto en los tres
    juegos; "Solo cuentas verificadas" (antes "Solo cuentas con rango verificado"); se
    conservan "Diferencia máxima de rango", "Horas en común por semana" y "Buscar
    jugador"; la fila muestra "Δ <n> pts" y el puntaje con la etiqueta de datos simulados
    cuando la cuenta del candidato la trae; defensivo: sin rango → "Sin datos" y ninguna
    distancia calculada; ningún campo de correo en el candidato.
  - Hecho cuando: con dos jugadores con cuentas en los tres juegos y al menos 2 bloques en
    común, cada uno ve al otro en cada juego con "Δ <n> pts" y la etiqueta; el filtro de
    distancia y "Solo cuentas verificadas" están habilitados en los tres; con la distancia
    máxima en 0 el otro no aparece (salvo el mismo rango normalizado) y con el primer paso
    igual o mayor que la distancia aparece; con "Solo cuentas verificadas" aparece solo el
    jugador cuya cuenta del juego salió verificada; la búsqueda por nombre de usuario lo
    encuentra; `typecheck`, `lint` y `build` en verde.

- [ ] **T23. Barrido de textos y de seguridad.** RF-15, RF-16, RF-26, RF-2, RNF-1, RNF-2
  - Archivos: los que resulten del barrido (`app/pages/LandingPage.tsx`,
    `app/layouts/AuthLayout.tsx`, `features/home/**`, `features/profile/**`,
    `features/matches/**`, `features/sessions/**`, `shared/**`).
  - Hacer: buscar en `frontend/src` y corregir lo que aparezca:
    - fuentes: `Riot|Ubisoft|Valve|Steam|FACEIT|Leetify|tracker` (solo se permiten
      "Riot ID", "Ubisoft ID" y "SteamID64");
    - verificación en masculino: `verificado|verificados|rango verificado` (salvo el literal
      del mensaje de la 005 del filtro de verificadas en el backend simulado, RF-10 punto 12,
      R14 y R21: excepción al RF-16 aprobada por el usuario el 2026-10-19; la interfaz nunca
      lo muestra);
    - relectura automática: `periódic|automátic|cuando cambia|volvemos a leer|Releemos|Volver a leer`
      (los textos de la página de entrada y de la pantalla de acceso pasan a `El rango se
      vuelve a leer al pulsar "Resincronizar".`);
    - etiquetas: `Datos simulados|Los datos que ves|Demo\b` fuera de `copy.ts`;
    - seguridad: `dangerouslySetInnerHTML`, `: any|as any|@ts-ignore`,
      `localStorage|sessionStorage|document.cookie` (solo `csrfStorage.ts`, `crossTabSession.ts`,
      el tema y el mock), `fetch(` (solo `httpClient.ts`), `Authorization`;
    - construcción: tras `npm run build`, buscar en `frontend/dist` el valor de
      `JWT_SECRET` de `backend/.env.example` (`solo-desarrollo-no-usar-en-produccion`).
  - Hecho cuando: cada búsqueda queda sin resultados fuera de lo permitido, con la lista de
    comandos y resultados anotada en el registro; una biografía y un título con `<b>x</b>` se
    ven como texto literal; `typecheck`, `lint` y `build` en verde.

## Bloque 3 — Proponer sesión (RF-29, RF-30)

- [ ] **T24. Reglas puras de "Proponer".** RF-29
  - Archivos: `frontend/src/domain/proposal.ts` (nuevo); `frontend/src/domain/availability.ts`
    (solo si `GRID_HOURS` necesita un ayudante `isAgendaHour`).
  - Hacer: `sharedRuns`, `blockReason`, `proposalTitle`, `buildProposal` y
    `PROPOSAL_DEFAULTS` (plan 3.11); las horas de la agenda salen de `GRID_HOURS`; ninguna
    llama a `Date` ni a React; la 008 las importará.
  - Hecho cuando: Node (con el gancho de resolución) da: martes 20, 21 y 22 más jueves 3 →
    martes 20:00 con 3 h; solo jueves 3 → motivo `outsideAgenda`; serie 10 a 13 → 12:00 con
    2 h; serie 10 a 15 → 12:00 con 4 h; serie 0 a 2 → 00:00 con 3 h; domingo 23 más lunes 0
    → lunes 00:00 con 1 h (dos series); sin horas propias → `noOwnHours`; sin horas del otro
    → `noTheirHours`; sin cruce → `noCommon`; nombre de 40 caracteres → título de 51; el
    resultado se anota en el registro; `typecheck`, `lint` y `build` en verde.

- [ ] **T25. "Proponer" en las filas de coincidencias.** RF-29
  - Archivos: `frontend/src/features/matches/pages/MatchesPage.tsx`,
    `frontend/src/features/matches/components/MatchEntry.tsx`,
    `frontend/src/features/profile/hooks.ts` (consulta de la disponibilidad del candidato).
  - Hacer: cada fila calcula `blockReason`/`buildProposal` con la disponibilidad del usuario
    de la sesión y la del candidato (`getAvailabilityOf`, plan 3.11 y riesgo R-6); con
    propuesta, "Proponer" navega a la agenda con `{ proposal }` en el estado de la
    navegación; con motivo, "Proponer" queda deshabilitado con `aria-disabled` (sigue
    recibiendo el foco) y el motivo, de `copy.ts`, a su lado y enlazado con
    `aria-describedby`; una referencia impide navegar dos veces con dos pulsaciones
    seguidas; se retira el estado `{ gameId, withUser, suggestedBlock }` anterior.
  - Hecho cuando: con bloques en común martes 20:00, 21:00, 22:00 y jueves 03:00,
    "Proponer" en la fila de B lleva a la agenda (el formulario lo abre T26); dejando solo
    el jueves 03:00, "Proponer" está deshabilitado con "Sus horas en común quedan fuera
    del horario de la agenda (12:00 a 01:00)", recibe el foco con el teclado y un lector
    de pantalla anuncia ese motivo; "No has marcado tus horas", "Este jugador no ha
    marcado horas" y "No tienen horas en común" aparecen según el caso; un doble clic deja
    una sola entrada nueva en el historial; `typecheck`, `lint` y `build` en verde.

- [ ] **T26. La agenda recibe la propuesta.** RF-30, RF-29
  - Archivos: `frontend/src/features/sessions/pages/SchedulePage.tsx`,
    `frontend/src/features/sessions/components/SessionDraftSlip.tsx`.
  - Hacer: leer `location.state.proposal` una sola vez; mientras las cuentas del usuario de
    la sesión cargan o se refrescan no abrir el formulario y abrirlo al llegar, nunca con
    la lista de juegos vacía; si la carga falla, mostrar el error (RF-9), no abrir y
    descartar la propuesta (también si luego se reintenta); si el usuario ya no tiene cuenta
    en el juego propuesto, no abrir (la agenda como si se abriera directo); en los tres
    casos reemplazar la entrada con `navigate(pathname, { replace: true, state: null })`;
    `SessionDraftSlip` recibe la duración y usa `PROPOSAL_DEFAULTS` para cupos y notas; un
    401 mientras espera aplica RF-7 y descarta la propuesta.
  - Hecho cuando: "Proponer" abre la agenda con LoL, martes, 20:00, 3 horas y "Sesión con
    <nombre visible de B>"; recargar la agenda la muestra sin formulario, y "Atrás" y
    "Adelante" tampoco lo reabren; con la red en "3G lenta" el formulario se abre con la
    lista de juegos ya cargada; bloqueando la petición de las cuentas la agenda muestra el
    error y no abre el formulario, tampoco tras "Reintentar"; desvinculando LoL en otra
    pestaña antes de pulsar "Proponer", la agenda no abre el formulario; con el tramo de
    10:00 a 16:00 se propone 12:00 con 4 horas, y con domingo 23:00 más lunes 00:00, lunes
    00:00 con 1 hora; `typecheck`, `lint` y `build` en verde.

## Cierre y validación

- [ ] **T27. Paridad de la copia del dominio (RNF-6).** RNF-6
  - Archivos: solo el registro de validación (`specs/007-integrar-frontend/validation.md`).
    El script va en el scratchpad y su texto se pega en el registro.
  - Hacer: con `backend/src/domain/rankScale.ts` y `matching.ts` ya implementados (specs 004 y
    005), ejecutar la tabla de la sección 3.12 del plan contra las dos copias con Node (con
    gancho de resolución para los imports sin extensión de la interfaz) y anotar, por caso,
    el resultado de cada copia, el método y la versión de Node. Si divergen, manda la del
    servidor: corregir la copia de la interfaz y repetir.
  - Hecho cuando: las dos copias dan el mismo resultado en todos los casos de la tabla
    (incluidos los ejemplos de la spec 004: Iron IV 0, Diamond I 90, Master 93, Challenger
    100, Grey 0, Light Blue 17, Gold 100, Copper V 0, Diamond I de R6 97, Champion 100; y
    los puntajes 78, 100 y 0 de la 005) y el registro contiene el script y la salida.

- [ ] **T28. Capturas posteriores y comparación con la línea base.** RNF-4, RNF-8
  - Archivos: `specs/007-integrar-frontend/validation/after/<vista>-<ancho>.png` y el
    registro de validación.
  - Hacer: repetir las 18 capturas de T1 en las mismas condiciones (mismas vistas, mismos
    anchos), ahora con los cambios de la spec, y compararlas vista por vista con la línea
    base; añadir las capturas de los elementos nuevos a 360 px (aviso de login, pantalla de
    error de RF-5, etiqueta de datos simulados en cuenta y coincidencia, "Proponer"
    deshabilitado con su motivo).
  - Hecho cuando: cada vista coincide con su línea base salvo los textos y elementos que
    exige la spec (anotados en el registro, uno por vista); a 360 px ninguna vista tiene
    desplazamiento horizontal (`scrollWidth <= innerWidth`) y los textos, avisos, la
    pantalla de error y las etiquetas nuevas se ven completos.

- [ ] **T29. Recorrido manual reproducible (validación).** RF-1 a RF-16, RF-18 a RF-33, RNF-1 a RNF-8
  - Precondición: specs 004, 005 y 006 implementadas; MongoDB local; `backend/.env`.
  - Archivos: solo el registro de validación.
  - Hacer: ejecutar y registrar paso a paso, con fecha y resultado, todos los
    "Criterios de finalización" de la spec, con servidor real, base vacía al empezar, modo
    simulado desactivado, sin Internet y dos jugadores A y B (anotar qué identificador
    verificado o no usó cada uno): registro de A y B (cada uno llega a Inicio), cierre e
    inicio de sesión, recarga con sesión vigente, vincular LoL, R6 y CS2 (rango, historial,
    partidas y etiqueta en perfil y Configuración, la de R6 con Copper a Champion),
    resincronizar varias veces, desvincular y volver a vincular, guardar disponibilidad,
    crear, sumarse, salir y cancelar una sesión, cierre de sesión; coincidencias (filtros,
    verificadas, búsqueda, "Proponer" con los cuatro casos de bloques) y agenda (recarga,
    atrás y adelante, 3G lenta, bloqueo de cuentas, otra pestaña); etiqueta con servidor
    real y en modo simulado; 401 por cookie borrada (una sola entrada de login, sin
    comprobante entre el 401 y el nuevo login, vuelta a Configuración); varias consultas con
    401 a la vez; servidor apagado (guardar, recargar, "Reintentar", foco); "3G lenta" y
    consulta bloqueada a los 30 s; latencia de 40 s y doble clic; dos y tres pestañas
    (cerrar sesión, iniciar con otra cuenta, segunda en login, segundo plano, 401 en una
    sola); login bloqueado tras el registro; Configuración sin sesión y login con sesión;
    almacenamiento bloqueado; modo simulado con el servidor apagado (sin peticiones, sin
    errores, cuentas verificadas y no verificadas, borrar comprobante); cada caso de RF-10
    provocable en ambos modos y los demás revisados contra el backend simulado; RF-27;
    textos (RF-15, RF-16, RF-26); dirección inexistente con y sin sesión; credencial
    ausente de almacenamientos y peticiones; `<b>x</b>` como texto; plantilla de
    configuración y `true`, ` true `, `TRUE`; RNF-6 (T27); líneas base (T28).
  - Hecho cuando: el registro de validación contiene cada paso con fecha y resultado, todos
    los criterios de finalización de la spec marcados con evidencia, y cualquier fallo
    abierto como defecto o como cambio de spec (no se corrige dentro de esta tarea).

- [ ] **T30. Documentación del estado.** (sin RF; spec, "Fuera de alcance" y `AGENTS.md`)
  - Archivos: `MEMORY.md`, `AGENTS.md` (los edita quien implemente o el coordinador; el
    planner no escribe fuera de `specs/`).
  - Hacer: en `MEMORY.md`, corregir la entrada de la 007 ("Elimina el script `seed`": el
    backend no define ese script), quitar la deuda del JWT en `localStorage`, registrar
    las decisiones R19 y R20 y la variable `VITE_USE_MOCK_API`; en `AGENTS.md`, actualizar la
    descripción de `services/` (cliente HTTP con comprobante, transporte, backend
    simulado) y el comando de modo simulado; marcar la spec 007 como implementada solo
    cuando T29 esté completa.
  - Hecho cuando: `MEMORY.md` y `AGENTS.md` no contradicen el código ni la spec, y la
    entrada de la 007 refleja el estado real.

## Trazabilidad RF / RNF → tareas
Cada RF y RNF de la spec está cubierto por al menos una tarea de implementación y por T29
(validación). RF-17 fue retirado por la spec 004 y no existe.

| Requisito | Tareas |
| --- | --- |
| RF-1 | T2 |
| RF-2 | T3, T4, T5, T23 |
| RF-3 | T3, T5, T6, T7, T12 |
| RF-4 | T7, T11 |
| RF-5 | T4, T7, T8, T9 |
| RF-6 | T7 |
| RF-7 | T4, T7, T10, T11 |
| RF-8 | T10, T11 |
| RF-9 | T4, T7, T13 |
| RF-10 | T5, T6, T16, T17 |
| RF-11 | T11, T18, T19, T20, T21, T22 |
| RF-12 | T14, T21 |
| RF-13 | T2 |
| RF-14 | T14, T21, T22 |
| RF-15 | T19, T20, T23 |
| RF-16 | T20, T21, T22, T23 |
| RF-18 | T16, T20, T21 |
| RF-19 | T3, T6 |
| RF-20 | T4, T8, T11, T13 |
| RF-21 | T15, T16, T17, T18 |
| RF-22 | T19 |
| RF-23 | T14, T17, T22 |
| RF-24 | T11, T12 |
| RF-25 | T7, T10 |
| RF-26 | T20, T23 |
| RF-27 | T18 |
| RF-28 | T9, T10 |
| RF-29 | T14, T24, T25, T26 |
| RF-30 | T26 |
| RF-31 | T20, T21 |
| RF-32 | T22 |
| RF-33 | T7, T10 |
| RNF-1 | T4, T5, T23 |
| RNF-2 | T23 |
| RNF-3 | todas (verificación estándar) |
| RNF-4 | T1, T28 (y todas: sin rediseño) |
| RNF-5 | T2, T23 |
| RNF-6 | T14, T15, T27 |
| RNF-7 | T9, T11, T13 |
| RNF-8 | T1, T28 |

Bloques: Sesión y conexión = T2 a T13; Datos simulados y presentación = T14 a T23; Proponer
sesión = T24 a T26; previo = T1; cierre = T27 a T30.
