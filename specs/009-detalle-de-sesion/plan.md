# Plan 009 — Vista nueva: detalle de sesión
Estado: aprobado (2026-10-18)
Redactado el 2026-10-18; preguntas 1 a 4 de la sección 8 cerradas con las respuestas de la
usuaria (decisiones D-26 a D-29). Ajuste final del 2026-10-18: confirmado el texto de D-27 y
rediseñado el límite de escritura (D-29, D-30; R-10 resuelto).
Spec: `specs/009-detalle-de-sesion/spec.md` (aprobada el 2026-10-18; decisiones P1–P13,
Q1–Q27, D1–D30, R1–R18, C3, C4, CR4-1 a CR4-5 y CR5-1 a CR5-5).

Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, sección 6, punto 4
(operaciones nuevas del contrato `sessions.get(id)` y `sessions.update(id, payload)`), y
sección 7, V2 (ruta `/agenda/:sessionId` protegida y diferida, llegada desde cada tarjeta de
la agenda, juego, horario, cupos, estado y participantes con enlace a su ficha, edición del
anfitrión con `PUT /api/sessions/:id`, cancelar con confirmación y vuelta a `/agenda`, sumarse
y salir con los mensajes 409 visibles, estados de carga, 404 y 403 como mensaje, reutilizar
`Slip`, `States` y los componentes existentes). **Prevalece la spec 006** donde difiere: la
edición es parcial (006 RF-7, RF-26; DP6-1) y la regla del título es la de 006 (DP6-33), no
"las mismas validaciones del borrador"; y el horario se pinta con el formato de la agenda
("Lunes · 23:00–03:00", spec 009 RF-3), no con `formatRange` ("Lun 23:00–03:00").

## 0. Precondiciones y estado real (comprobado el 2026-10-18)

- **Esta spec no cambia el servidor** (Contexto). Usa solo operaciones que define la spec
  006 y que su plan fija: `GET /api/sessions/:id` (RF-3), `PUT /api/sessions/:id` con
  semántica parcial (RF-7, RF-26; P6-10), `DELETE /api/sessions/:id` (RF-9, 204),
  `POST /api/sessions/:id/join` y `/leave` (RF-11 a RF-14, RF-17), con los textos literales
  de su sección 7. No se encontró ninguna necesidad de cambiar el servidor; si al implementar
  apareciera una (ruta, código o texto distinto de la spec 006), el implementer **para y lo
  pregunta**; este plan no la diseña. `backend/src/domain/sessionRules.ts` aún no existe (la
  006 está sin implementar): la copia de la interfaz se hace con los nombres y firmas del
  plan 006, sección 2.
- **La interfaz de hoy es la del Hito 1.** `apiContract.ts` no tiene `sessions.get` ni
  `sessions.update`; `httpApi.ts` sigue con `Authorization: Bearer` y rutas viejas;
  `mockApi.ts` usa "La sesión no existe.", comprueba "llena" antes que "ya inscrito" y no
  da 409 al salir sin estar inscrito; `SchedulePage` cancela sin confirmar; `Slip` no retiene
  el foco; `SessionDraftSlip` valida solo el título vacío con un texto propio y usa
  `maxLength` (cuenta unidades UTF-16: 60 emojis no caben).
- **Este plan se apoya en piezas de los planes 007 y 008, que no repite:** del plan 007,
  `services/http/transport.ts` (`execute`: plazo de 30 s, descarte de respuestas tardías,
  401 → RF-7 de la 007), `ApiError` con `status` y `hasMessage`, `isSessionCleared` /
  `SessionClearedError`, `shared/utils/copy.ts` (`NO_MESSAGE_TEXT`, `LOADING_TEXT`,
  `SENDING_TEXT`), `Failure` con `title`, `MutationNotice`, `queryClient` sin reintentos,
  `staleTime: 0` y sin refresco al enfocar ni al reconectar, claves `['u', userId, …]` con
  `enabled: userId !== null` y `useSessionUserId`, `isProtectedPath`, `ProtectedRoute` con
  ruta de origen `pathname`, `SessionStatus = 'open' | 'full'`, el aviso global «Datos de
  demostración» de `AppLayout` y la base simulada que responde por `execute`; del plan 008,
  `playerPath(userId, gameId)` y los enlaces de participantes en `SessionSlip` (008 RF-2).
  **Condición previa de la implementación (D-28):** la 009 empieza cuando (1) el plan
  `specs/007-integrar-frontend/plan.md` esté aprobado (hoy, 2026-10-18, sigue en
  «borrador»; este plan no lo cambia), (2) la 007 tenga hechas sus T1 a T26 y (3) la 008
  tenga hecha su tarea de enlaces (plan 008, sección 8, punto 9). Si al empezar una tarea
  alguna de esas piezas no existe o tiene otra firma, el implementer para y lo reporta; no
  la crea dentro de la 009.
- **Validación**: los Criterios de finalización esperan a que estén implementadas la 006
  (servidor con obtener y editar por id), la 007 (al menos RF-7, RF-10 y RF-24) y la 008 (al
  menos RF-9, RF-15 y RF-20) (spec, Contexto, A9). Antes, cada tarea se comprueba en modo
  simulado y con `typecheck`, `lint` y `build`.
- **Sin dependencias nuevas** ni variables de entorno nuevas (constitución, principio 1).
  Se descartan bibliotecas de retención del foco (`focus-trap` y similares): se resuelve con
  un manejador de teclado en `Slip` (sección 6, D-12).
- **Ninguna regla de esta spec depende del día ni de la hora actual.** Las sesiones de juego
  viven en la semana tipo, sin fecha de calendario (spec 006, Definiciones y Fuera de
  alcance). El rol, las acciones ofrecidas, "Sin cupos", el rango horario, los "cupo libre"
  según el estado, las horas de inicio de la edición, el rango y el ajuste de cupos, la regla
  del título y el conteo Unicode, las comprobaciones del cliente y la clasificación de
  respuestas operan solo sobre datos ya recibidos. Por eso **ninguna función pura recibe
  `hoy` ni `now`**: sería un parámetro muerto. El único tiempo de la spec es el plazo de 30 s
  (RF-20), que es transporte y vive en `execute` de la 007, no en el dominio. La respuesta
  tardía tras salir del detalle se reconoce por un identificador de visita, no por el reloj.

## 1. Resumen y trazabilidad

| Requisito | Partes del plan | Verificación (sección 7) |
| --- | --- | --- |
| RF-1 | 2: `routes.ts` (`isProtectedPath` reconoce `/agenda/`), `router.tsx`; `ProtectedRoute` (007); 4.1 | Estados (sesión cerrada → login → detalle) |
| RF-2 | 2: `SessionSlip` ("Ver detalle", nombre accesible), `sessionPath`; 5.6 | Recorrido paso 1; teclado y NVDA; 360 px |
| RF-3 | 3: `detailRole`, `formatSessionRange`, `occupancy`, `openSlotCount`; 2: `SessionDetailFacts`; 5.2 | Node (tabla 7.1); Recorrido paso 2; criterio de cascada |
| RF-4 | 2: `SessionDetailFacts` con `playerPath` (008); 5.2 | Recorrido paso 8 |
| RF-5 | 3: `detailActions`; 2: `SessionActionsZone` | Node; Recorrido paso 2 |
| RF-6 | 3: `editFormInitial`, `startHourOptions`, `slotRange`, `slotOptions`, `adjustSlots`, `rebaseEditForm`, `toEditPayload`, `limitToCodePoints` (solo entra lo insertado que cabe, D-29); 2: `SessionEditForm`, `useCodePointLimit`, `TextField`; 4.2, 4.7 | Node; Recorrido pasos 3, 4 y 6; criterio de hora fuera del horario; regla del título (pegar) |
| RF-7 | 4.2 (guardar, éxito); 2: `useUpdateSession`, `SessionActionsZone` ("Cambios guardados.") | Recorrido paso 4; Bloqueos y formulario |
| RF-8 | 4.2 (cancelar 204, 404); 4.5 (redirección con reemplazo); 2: `SchedulePage` (foco al título del panel) | Recorrido paso 9; NVDA |
| RF-9 | 3: `detailActions` (`join` con `blocked` por `status === 'full'`); 4.2; 5.3 | Node; Recorrido pasos 5 a 7 |
| RF-10 | 3: `classifyResponse`; 4.2 (mensaje en su lugar); 2: `SessionActionsZone`, `SessionEditForm`, `CancelSessionDialog` | Node; Recorrido paso 7; Estados |
| RF-11 | 4.2 (máquina de estados); 4.3 (foco); 5.3 (deshabilitado y bloqueado); D-6 a D-10 | Estados; Bloqueos y formulario; NVDA |
| RF-12 | 3: `classifyResponse` (`empty`); 4.1, 4.2; 5.4 | Estados (`abc`, inexistente, dos pestañas) |
| RF-13 | 3: `classifyResponse` (`pageError`); 4.1 ("Reintentar" sin estado de carga); 5.4 | Estados (servidor caído, bloqueo de la petición); NVDA |
| RF-14 | 3: `classifyResponse` (403 → mensaje + nueva lectura); 4.2 (regla defensiva de rol) | Revisión de código y modo simulado (criterio RF-14) |
| RF-15 | 4.4; 2: `agendaCache.ts`, `sessionList.ts`, hooks | Recorrido paso 7 y 9; Estados (R8, R16, R17) |
| RF-16 | 2: `apiContract`, `httpApi`, `mockApi`, `mockSessionTarget.ts`, `sessionRules.ts` (`validateSessionEdit`); 4.6 | Node (resolvedor y casos del mock); modo simulado; revisión del mock |
| RF-17 | 4.1 (clave por visita, `staleTime: Infinity`, sin reintentos); D-2 | Estados (foco de ventana sin peticiones; una sola petición) |
| RF-18 | 4.1 (sin comprobación de rol para ver); 2: `SessionDetailPage` | Recorrido paso 5 |
| RF-19 | 4.2 (cancelar en la agenda); 4.3 (foco al título del panel); 2: `SchedulePage`, `CancelSessionDialog` | Agenda |
| RF-20 | `execute` (007); 3: `classifyResponse` (estado 0 = sin mensaje); 4.1, 4.2 | Estados (latencia de 40 s) |
| RF-21 | 4.2 (nueva lectura, `rebaseEditForm`, regla defensiva de rol); 4.3 | Recorrido paso 7; Cupos con datos viejos; revisión (fallo de la nueva lectura) |
| RF-22 | 3: `isValidSessionTitle`, `checkEditForm` (textos de la 006 por campo, D-27); 4.2 (comprobaciones antes de enviar, Intro en "Título") | Node; Regla del título; Bloqueos y formulario |
| RF-23 | 2: `CancelSessionDialog`, `Slip` (opciones nuevas); 4.3; 5.5 | Agenda; NVDA; Bloqueos y formulario |
| RF-24 | 3: `isValidSessionTitle`, `limitToCodePoints` (solo entra lo insertado que cabe, D-29); 2: `SessionDraftSlip`, `useCodePointLimit`, `TextField`; 4.7 | Node; Regla del título (pegar); revisión (una sola función) |
| RNF-1 | 5.7; reutilización de `Slip`, `States`, `Stamp`, `GameMark`, `Monogram`, clases y tokens | Revisión (`grep` de colores) |
| RNF-2 | 4.3 (regla general, casos 1 a 14); 5.3, 5.5; D-9 a D-12 | Teclado y NVDA; Agenda; Estados |
| RNF-3 | 5.2 (todo como texto de React; sin `dangerouslySetInnerHTML`) | Recorrido paso 2 (`<b>x</b>`); `grep` |
| RNF-4 | 7 (build, typecheck y lint en cada tarea; scripts de Node sin versionar, sin configuración nueva, D-26) | `npm run typecheck && npm run lint && npm run build`; texto y salida de los scripts en `validation.md` |
| RNF-5 | 5.7 (`overflow-wrap: anywhere`, `min-width: 0`, columnas a 360 px); `sessionSlip.css` (R14) | 360 px; Lighthouse y selector de color |
| RNF-6 | 3 (todas las reglas en `domain/`; una sola regla del título; textos de las comprobaciones desde `SESSION_ERRORS`); D-15, D-27 | Node (tablas 7.1, D-26); revisión de código |

## 2. Archivos que se crean o modifican
Rutas bajo `frontend/src/` salvo indicación. "Nuevo" = se crea; "mod." = se modifica. Ningún
archivo de `backend/` cambia.

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `domain/sessionRules.ts` (nuevo; si la 007 ya creó una copia de las reglas de la 006, se amplía esa y no se duplica) | Copia de la interfaz de `backend/src/domain/sessionRules.ts` (plan 006, sección 2), con los mismos nombres: `SESSION_ERRORS`, `trimText`, `codePointLength`, `hasForbiddenTitleChar`, `readJsonInteger`, `isPlainObject`, `validateSessionEdit`. Añade la **única regla del título** `isValidSessionTitle` y el límite de escritura `limitToCodePoints` (con sus tipos `TextSelection`, `TextEdit` y `LimitedText`), con `TITLE_MAX_LENGTH = 60` y `NOTES_MAX_LENGTH = 160`. Si diverge del servidor, manda el servidor (como 007 RNF-6). | RF-16, RF-22, RF-24, RNF-6 |
| `domain/sessionDetail.ts` (nuevo) | Reglas puras del detalle: `detailRole`, `detailActions`, `formatSessionRange`, `occupancy`, `openSlotCount`, `startHourOptions`, `slotRange`, `slotOptions`, `adjustSlots`, `EditFormValues`, `editFormInitial`, `rebaseEditForm`, `checkEditForm`, `toEditPayload`, `classifyResponse`. Sin React, HTTP ni reloj. | RF-3, RF-5, RF-6, RF-9, RF-10, RF-12, RF-13, RF-14, RF-21, RF-22, RNF-6 |
| `domain/sessionList.ts` (nuevo; si la 007 ya tiene el orden de 006 RF-2 en el modo simulado, se reutiliza) | `compareSessions` (orden de 006 RF-2: día, hora, creación, id por punto de código), `upsertSessionInList`, `removeSessionFromList`. Lo usan la caché de la agenda y el backend simulado. | RF-15, RF-16 |
| `services/apiContract.ts` (mod.) | `sessions.get(sessionId): Promise<PlaySession>` y `sessions.update(sessionId, payload: SessionEditPayload): Promise<PlaySession>`; `SessionEditFields` (los seis campos) y `SessionEditPayload = Partial<SessionEditFields>` (D-16). Sigue siendo el único contrato. | RF-16, constitución principio 3 |
| `services/http/httpApi.ts` (mod.) | `get` → `GET /sessions/:id`; `update` → `PUT /sessions/:id` con el cuerpo tal cual; `join`, `leave`, `cancel` (y las dos nuevas) con `encodeURIComponent(sessionId)`. Todo por `request` → `execute` (007). | RF-16, RF-20 |
| `services/mock/mockSessionTarget.ts` (nuevo, sin imports) | `MOCK_SESSION_ID_PATTERN = /^session-[0-9]+$/i` y `resolveMockSessionId(raw)`: identificador en minúsculas o `null`. | RF-16 (Q20) |
| `services/mock/mockApi.ts` (mod.) | `sessions.get` y `sessions.update` nuevas; `join`, `leave` y `cancel` con `resolveMockSessionId` y "Sesión no encontrada."; edición parcial con `validateSessionEdit` en el orden de 006 RF-20; respuestas crudas por `execute` (007). | RF-16 |
| `app/routes.ts` (mod.) | `ROUTES.sessionDetail = '/agenda/:sessionId'`, `sessionPath(sessionId)` (`/agenda/${encodeURIComponent(id)}`); `isProtectedPath` reconoce el prefijo `/agenda/`. | RF-1, RF-2 |
| `app/router.tsx` (mod.) | Ruta diferida `SessionDetailRoute` dentro de `ProtectedRoute` + `AppLayout` (aviso global de la 007 en barra y pie). | RF-1, RF-16 (D19, Q16) |
| `app/providers/queryKeys.ts` (mod.) | `sessionDetail(userId, visit, rawId)` = `['u', userId, 'session-detail', visit, rawId]` y el prefijo de la agenda `sessionLists(userId)` = `['u', userId, 'sessions']`. | RF-15, RF-17 |
| `features/sessions/hooks.ts` (mod.) | `useSessionDetail(rawId, visit)`; `useUpdateSession`, y `useJoinSession` / `useLeaveSession` / `useCancelSession` con efectos de caché de la agenda en el `onSuccess` del propio `useMutation` (se ejecuta aunque la vista ya no esté montada, R16); `rereadSession(rawId)` (lectura manual sin estado de carga). | RF-7, RF-9, RF-15, RF-17, RF-21 |
| `features/sessions/agendaCache.ts` (nuevo) | `applySessionToAgenda(qc, userId, session)`, `removeSessionFromAgenda(qc, userId, id)` y `markAgendaStale(qc, userId)`: `setQueriesData` sobre el prefijo de la agenda con las funciones de `sessionList.ts` + `invalidateQueries` (solo marca, sin pedir si la agenda no está montada). | RF-15, RF-19 |
| `features/sessions/detail/focusRule.ts` (nuevo, puro, sin React) | `resolveFocus(event, context): FocusTarget`: la regla general de RNF-2 (puntos a a d y casos 1 a 14) como tabla. No es regla de dominio sino de interfaz; se separa para poder revisarla y comprobarla con Node. | RNF-2, RF-11, RF-19, RF-21, RF-23 |
| `features/sessions/detail/useDetailController.ts` (nuevo) | Estado de la página (`useReducer`) y máquina de estados de las acciones (sección 4.2): acción en curso, nueva lectura, mensajes en su lugar, formulario, ventana, estado vacío, visita y petición de foco pendiente (`focusRequest`) que un `useLayoutEffect` aplica tras el render. | RF-6 a RF-15, RF-19 a RF-23, RNF-2 |
| `features/sessions/pages/SessionDetailPage.tsx` (nuevo) + `sessionDetail.css` (nuevo) | `SessionDetailRoute` (monta la página con `key={location.key}`) y la página: parámetro de ruta, consulta, estados de carga / vacío / error / detalle, título del documento. CSS solo con tokens. | RF-1, RF-3, RF-11 a RF-13, RF-17, RF-18, RNF-1, RNF-5 |
| `features/sessions/components/SessionDetailFacts.tsx` (nuevo) | Juego (`GameMark`), título (`h1`, enfocable por programa), notas si no están vacías, rango horario, "<ocupados>/<totales> jugadores", sello "Cupos llenos", sello "La organizas"/"Estás dentro" **sin** `announce`, participantes con `Monogram`, enlace a su ficha y "organiza", y los "cupo libre". Reutiliza las clases de `sessionSlip.css`. | RF-3, RF-4, RNF-3 |
| `features/sessions/components/SessionActionsZone.tsx` (nuevo) | Zona de acciones: "Editar sesión" + "Cancelar sesión" (anfitrión), "Salir" o "Unirme"/"Sin cupos" (con `key` distinta para "Salir" y para el botón de sumarse, D-9), mensaje de la zona (`role="alert"`, enfocable por programa) y "Cambios guardados." (`role="status"`). | RF-5, RF-7, RF-9, RF-10, RF-11, RF-21 |
| `features/sessions/components/SessionEditForm.tsx` (nuevo) | Formulario en la página: título, notas, día, hora de inicio, duración y cupos (juego solo mostrado), error arriba como el de creación, "Guardar cambios" (`type="submit"`; Intro en "Título") y "Descartar". | RF-6, RF-7, RF-10, RF-22 |
| `features/sessions/components/CancelSessionDialog.tsx` (nuevo) | Ventana de confirmación sobre `Slip`: título "¿Cancelar esta sesión?", texto, "Sí, cancelar sesión" y "Volver", mensaje de error dentro, foco inicial en "Volver", foco al título mientras la cancelación está en curso, cierre bloqueado. La usan el detalle y la agenda. | RF-8, RF-10, RF-19, RF-23 |
| `features/sessions/components/SessionSlip.tsx` (mod.) | Enlace "Ver detalle" (`Link` a `sessionPath`, `aria-label="Ver detalle de <título>"`); rango con `formatSessionRange` (misma salida que hoy); `cancelButtonRef` opcional para devolver el foco. Lo demás de la tarjeta no cambia (R2). | RF-2, RF-19, RNF-5 |
| `features/sessions/components/sessionSlip.css` (mod.) | `min-width: 0` en la columna del título y `overflow-wrap: anywhere` en título, notas y nombres (R14). | RNF-5 |
| `features/sessions/pages/SchedulePage.tsx` (mod.) | "Cancelar sesión" abre `CancelSessionDialog`; 204 → cierra, quita la tarjeta y foco al título del panel; 404 → mensaje + `invalidateQueries` de la agenda; cierre → "Cancelar sesión" de la tarjeta o título del panel; título del panel (`h2`) enfocable por programa; consume `location.state.focus === 'panelTitle'` de la redirección de RF-8 una sola vez. | RF-8, RF-15, RF-19, RF-23, RNF-2 |
| `features/sessions/components/SessionDraftSlip.tsx` (mod.) | Sustituye la comprobación del título vacío y su texto por `isValidSessionTitle` + `SESSION_ERRORS.title`; quita `maxLength` de título y notas y limita con `TextField maxCodePoints={60}` y `useCodePointLimit` (160) en el `textarea` (4.7). Nada más cambia (R10). | RF-24 |
| `shared/components/Slip.tsx` (mod.) | Opciones nuevas, todas opcionales y apagadas por defecto: `initialFocusRef`, `titleRef` (título enfocable con `tabIndex={-1}`), `trapFocus` (Tab y Mayús+Tab dentro de la ventana), `closeLocked` (Escape, fondo y botón de cerrar sin efecto; el de cerrar con `aria-disabled`). Sin ellas, el formulario de creación se comporta como hoy (R10). | RF-23, RNF-2 |
| `shared/components/States.tsx` (mod.) | `Blank` con `headingRef` y nivel de encabezado opcional; `Failure` (ya con `title` de la 007) con `headingRef`, modo "el mensaje hace de título" y `retryBusy` (Reintentar en curso: `aria-disabled`, indicador, conserva el foco). Sin las props nuevas, igual que hoy. | RF-12, RF-13, RNF-2 |
| `shared/components/TextField.tsx` (mod.) | `forwardRef` al `input` (para llevar el foco a "Título") y prop opcional `maxCodePoints`: si está, el campo usa `useCodePointLimit` y llama a `onValueChange(valor)` en lugar de dejar pasar el `onChange` crudo (4.7). Sin la prop, el comportamiento y el aspecto no cambian. | RNF-2 (Q1), RF-6.5, RF-24 |
| `shared/hooks/useCodePointLimit.ts` (nuevo) | Une el campo del DOM con `limitToCodePoints`: guarda la selección en el evento nativo `beforeinput`, aplica la regla en `onChange` (o en `compositionend` con un IME) y coloca el cursor con `setSelectionRange` en un `useLayoutEffect`. Sirve a `input` y `textarea`; no contiene reglas, solo eventos y cursor (D-30). | RF-6.5, RF-24 |
| `shared/utils/copy.ts` (mod.; lo crea la 007) | Textos literales de la 009 (sección 5.8). | RF-2, RF-3, RF-7, RF-9, RF-12, RF-23 |
| Hoja global de `styles/` (la existente, mod.) | Foco visible en elementos enfocados por programa (`[tabindex="-1"]:focus`) y aspecto de no disponible para `.btn[aria-disabled="true"]` si la 007/008 no lo añadieron; solo tokens. | RNF-1, RNF-2 |
| `specs/009-detalle-de-sesion/validation.md` (nuevo, en la validación) | Registro de validación: recorrido, comprobaciones con Node (texto y salida), revisiones de código. | Criterios de finalización |

Se reutilizan sin cambios: `GameMark`, `Monogram`, `Stamp` (sin `announce` en el detalle),
`Working`, `useDocumentTitle`, `WEEK_DAYS`, `GRID_HOURS`, `formatHour`, las clases `sheet`,
`page-head`, `doc-title`, `session__*`, `draft*`, `field`, `select`, `textarea`, `notice`,
`note`, `btn` y los tokens de `styles/tokens.css`.

## 3. Funciones puras de dominio
Ninguna importa React, `fetch`, el almacenamiento ni lee el reloj (constitución, principio
3; RNF-6). **Ninguna recibe `hoy`** (sección 0). Tipado con los tipos de `domain/types.ts`
(`PlaySession`, `WeekDay`, `GameId`, `SessionStatus = 'open' | 'full'` tras la 007).

```ts
// ---------- domain/sessionRules.ts (copia de la interfaz; nombres del plan 006) ----------
export const SESSION_ERRORS: {                                   // literales de 006 (plan 006, sección 2)
  title: 'El título debe tener entre 3 y 60 caracteres.';
  notes: 'Las notas deben ser texto de hasta 160 caracteres.';
  day: 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).';
  startHour: 'Hora de inicio no válida: usa un entero de 0 a 23.';
  durationHours: 'Duración no válida: usa un entero de 1 a 4 horas.';
  slots: 'Cupos no válidos: usa un entero de 2 a 6.';
  slotsBelowParticipants: 'No puedes dejar menos cupos que jugadores inscritos.';
  notFound: 'Sesión no encontrada.';
  notHostEdit: 'Solo quien organiza puede editar la sesión.';
  notHostCancel: 'Solo quien organiza puede cancelar la sesión.';
  alreadyJoined: 'Ya estás inscrito en esta sesión.';
  full: 'Esta sesión ya no admite jugadores.';
  hostLeave: 'Eres quien organiza: cancela la sesión en lugar de salir.';
  notJoined: 'No estás inscrito en esta sesión.';
  badId: 'id con formato inválido'; badJson: 'JSON mal formado' };
// game y noAccount de la 006 no se copian: la edición no toca el juego (006 RF-15).
export const TITLE_MAX_LENGTH = 60;
export const NOTES_MAX_LENGTH = 160;
export function trimText(text: string): string;                  // DP6-27, conjunto explícito
export function codePointLength(text: string): number;           // [...text].length
export function hasForbiddenTitleChar(text: string): boolean;    // \p{Cc}, U+2028, U+2029
/** LA regla del título (RF-22.1, RF-24; Q18): recorta, sin prohibidos, 3 a 60 puntos de código. */
export function isValidSessionTitle(raw: string): boolean;
/** Índices en unidades UTF-16 del valor ANTERIOR (los de selectionStart / selectionEnd). */
export interface TextSelection { start: number; end: number }
export interface TextEdit {
  previous: string;                 // valor antes del cambio (el controlado)
  next: string;                     // valor que propone el navegador tras el cambio
  selection: TextSelection | null;  // selección justo antes del cambio; null si no se conoce
}
export interface LimitedText {
  value: string;                    // valor final del campo
  selection: TextSelection | null;  // cursor que hay que poner; null = no tocarlo
}
/** Límite de escritura en puntos de código para título (60) y notas (160) de los dos
 *  formularios. Se comporta como `maxLength`, contando puntos de código: lo que ya estaba se
 *  conserva entero y solo entra la parte de lo insertado que cabe, sin partir un emoji ni un
 *  par sustituto; el cursor queda al final de lo insertado (D-29). Pura, sin "hoy". */
export function limitToCodePoints(edit: TextEdit, max: number): LimitedText;
export function readJsonInteger(value: unknown, min: number, max: number): number | null;
export function isPlainObject(value: unknown): value is Record<string, unknown>;
export interface SessionEditFields { title: string; notes: string; day: WeekDay;
  startHour: number; durationHours: number; slots: number }
export type SessionPatch = Partial<SessionEditFields>;
export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };
/** Edición parcial de 006 RF-7 y RF-26 (la usa el backend simulado). */
export function validateSessionEdit(body: unknown): RuleResult<SessionPatch>;

// ---------- domain/sessionDetail.ts ----------
export type DetailRole = 'host' | 'member' | 'outsider';
export function detailRole(session: PlaySession, sessionUserId: string): DetailRole;
export type DetailActions =
  | { kind: 'host' }                                  // "Editar sesión" + "Cancelar sesión"
  | { kind: 'leave' }                                 // "Salir"
  | { kind: 'join'; blocked: boolean };               // "Unirme" o, bloqueado, "Sin cupos"
export function detailActions(session: PlaySession, sessionUserId: string): DetailActions;
export function formatSessionRange(session: Pick<PlaySession, 'day' | 'startHour' | 'durationHours'>): string;
export function occupancy(session: PlaySession): { taken: number; total: number };
export function openSlotCount(session: PlaySession): number;
export function startHourOptions(currentStartHour: number): number[];
export function slotRange(session: PlaySession): { min: number; max: 6 };
export function slotOptions(range: { min: number; max: number }): number[];
export function adjustSlots(chosen: number, range: { min: number; max: number }): number;
export type EditFormValues = SessionEditFields;
export function editFormInitial(session: PlaySession): EditFormValues;
export function rebaseEditForm(values: EditFormValues, fresh: PlaySession): EditFormValues;
export type EditCheckError = (typeof SESSION_ERRORS)[
  'title' | 'notes' | 'day' | 'startHour' | 'durationHours' | 'slots' | 'slotsBelowParticipants'];
export type EditCheck =
  | { ok: true }
  | { ok: false; field: keyof SessionEditFields; error: EditCheckError };   // D-27
export function checkEditForm(values: EditFormValues, session: PlaySession): EditCheck;
export function toEditPayload(values: EditFormValues): SessionEditFields;
export type RequestKind = 'load' | 'reread' | 'action';
export type ResponseInfo =
  | { ok: true }
  | { ok: false; status: number; hasMessage: boolean };   // status 0 = sin respuesta / red / plazo
export type Outcome =
  | 'success' | 'empty' | 'pageError' | 'keep'
  | 'messageAndReread' | 'messageOnly' | 'session';
export function classifyResponse(kind: RequestKind, response: ResponseInfo): Outcome;

// ---------- domain/sessionList.ts ----------
export function compareSessions(a: PlaySession, b: PlaySession): number;
export function upsertSessionInList(list: readonly PlaySession[], session: PlaySession,
  filter: GameId | 'all'): PlaySession[];
export function removeSessionFromList(list: readonly PlaySession[], sessionId: string): PlaySession[];

// ---------- services/mock/mockSessionTarget.ts (sin imports) ----------
export const MOCK_SESSION_ID_PATTERN: RegExp;                  // /^session-[0-9]+$/i
export function resolveMockSessionId(raw: string): string | null;   // en minúsculas o null
```

Reglas de cada función (entradas → salidas) y el RF que cubren:

| Función | Regla | RF |
| --- | --- | --- |
| `trimText`, `codePointLength`, `hasForbiddenTitleChar` | Idénticas al plan 006, 3.1: recorte con U+0009, U+000B, U+000C, U+0020, U+00A0, U+FEFF, `\p{Zs}`, LF, CR, U+2028, U+2029 de los extremos (U+0085 y U+200B no se recortan); largo `[...t].length`; prohibido = `/[\p{Cc}  ]/u`. | RF-22, RF-24 |
| `isValidSessionTitle(raw)` | `t = trimText(raw)`; `!hasForbiddenTitleChar(t) && 3 ≤ codePointLength(t) ≤ 60`. Es la **única** regla del título: la usan `checkEditForm`, `SessionDraftSlip` y `validateSessionEdit` del backend simulado. `"  ab  "`, `""`, `"Ranked\tnoche"`, `"Ranked\u0085noche"`, `"Ranked noche"`, `"Ranked noche\u0085"` → false; `"\tRanked\t"`, `" Ranked "` → true (escapes de JavaScript). | RF-22, RF-24, RNF-6 |
| `limitToCodePoints({previous, next, selection}, max)` | Pseudocódigo en 4.7. En este orden: (1) si `codePointLength(next) ≤ max` → `next` sin tocar el cursor; (2) si `next` no crece respecto de `previous` (`codePointLength(next) ≤ codePointLength(previous)`) → `next` sin tocar el cursor (borrar o sustituir sin crecer; así se puede borrar un título guardado de más de 60, R13 y RF-6.5); (3) si crece: con `prefijo = previous` hasta `selection.start` y `sufijo = previous` desde `selection.end`, si `next` empieza por `prefijo` y acaba en `sufijo`, lo insertado es lo de en medio; `hueco = max − codePointLength(prefijo) − codePointLength(sufijo)`; entran los grafemas completos de lo insertado (`Intl.Segmenter`, granularidad `grapheme`) mientras la suma de sus puntos de código no pase de `hueco` → `prefijo + entra + sufijo`, cursor en `prefijo.length + entra.length`; (4) si no entra nada (`hueco ≤ 0`, p. ej. un título guardado de 65, o el primer grafema no cabe) o no se reconoce la inserción (`selection` nula, fuera de rango, en medio de un par sustituto, o `next` sin ese prefijo y sufijo) → `previous` con la selección de antes (no admite escribir más). Lo que ya estaba nunca se pierde. 60 emojis caben; el 61.º no entra. La usan "Título" (60) y "Notas" (160) de la edición y de "Anotar una sesión". | RF-6.5, RF-24 |
| `validateSessionEdit(body)` | Plan 006, 3.3: `undefined` = `{}`; en el orden título → notas → día → hora → duración → cupos, cada campo presente (`Object.hasOwn`) se valida con su regla (título con `isValidSessionTitle` y se guarda recortado; notas texto de hasta 160 tras recortar, vacías válidas; enteros JSON en su rango); primer error → 400 con su texto; ignora cualquier otro campo (juego, anfitrión, participantes, estado). `{}` → `ok {}` (200 sin cambios). | RF-16 |
| `detailRole(s, uid)` | `s.hostId === uid` → `host`; `s.participants.some(p => p.id === uid)` → `member`; si no → `outsider`. | RF-3, RF-5, RF-9 |
| `detailActions(s, uid)` | `host` → `{kind:'host'}`; `member` → `{kind:'leave'}`; `outsider` → `{kind:'join', blocked: s.status === 'full'}` (llena por el estado, no por los visibles; D27). | RF-5, RF-9 |
| `formatSessionRange(s)` | `` `${WEEK_DAYS[s.day].label} · ${formatHour(s.startHour)}–${formatHour((s.startHour + s.durationHours) % 24)}` ``: día 0, 23 h, 4 h → "Lunes · 23:00–03:00". Es la fórmula de la tarjeta de la agenda, que pasa a usarla (misma salida). | RF-3 |
| `occupancy(s)` | `{ taken: s.participants.length, total: s.slots }` → "3/4 jugadores" también con `full` en la cascada. | RF-3 (Q21) |
| `openSlotCount(s)` | `full` → 0; `open` → `max(0, s.slots − s.participants.length)`. | RF-3 (Q21) |
| `startHourOptions(h)` | `GRID_HOURS` (12…23, 0, 1) y, si `h` no está, `[...GRID_HOURS, h]` al final. | RF-6.2 (P5, Q2, D25) |
| `slotRange(s)` | `open` → `{ min: max(2, s.participants.length), max: 6 }`; `full` → `{ min: s.slots, max: 6 }`. | RF-6.4, RF-22.3 (P4, Q22) |
| `slotOptions(r)` | `[r.min … r.max]`; si `min > max` (defensivo) → `[r.max]`. | RF-6.4 |
| `adjustSlots(c, r)` | `min(r.max, max(c, r.min))`: los cupos elegidos bajo el nuevo mínimo pasan al mínimo. | RF-6, RF-21 (Q4) |
| `editFormInitial(s)` | Los seis campos tal como están guardados; el título **sin recortar** (R13). | RF-6 |
| `rebaseEditForm(v, fresh)` | Conserva `v` y solo cambia `slots = adjustSlots(v.slots, slotRange(fresh))`. | RF-6, RF-21 (Q4, R6) |
| `checkEditForm(v, s)` | Se detiene en el primer fallo, en el orden de campos de la 006 (RF-20; el de `validateSessionEdit`), y devuelve el campo y el texto literal que la 006 fija para él (D-27): (1) `!isValidSessionTitle(v.title)` → `title`, "El título debe tener entre 3 y 60 caracteres."; (2) `codePointLength(trimText(v.notes)) > 160` → `notes`, "Las notas deben ser texto de hasta 160 caracteres."; (3) `day` no entero o fuera de 0…6 → `day`, "Día no válido: usa un entero de 0 (lunes) a 6 (domingo)."; (4) `startHour` fuera de `startHourOptions(s.startHour)` → `startHour`, "Hora de inicio no válida: usa un entero de 0 a 23."; (5) `durationHours` no entero o fuera de 1…4 → `durationHours`, "Duración no válida: usa un entero de 1 a 4 horas."; (6) `slots` no entero o fuera de 2…6 → `slots`, "Cupos no válidos: usa un entero de 2 a 6."; (7) `slots` dentro de 2…6 pero bajo `slotRange(s).min` → `slots`, "No puedes dejar menos cupos que jugadores inscritos." (el texto de la 006, RF-8, para ese caso del campo cupos); si todo pasa → `{ok:true}`. Los puntos 2 a 7 no pueden fallar desde la interfaz (D14 de la spec); si fallan, el formulario muestra el texto y **no envía** nada. | RF-22 (P4, D14, Q22) |
| `toEditPayload(v)` | Los seis campos, el título y las notas tal como están en el campo (sin recortar). | RF-6 (Q19, R13, R18) |
| `classifyResponse(kind, r)` | Tabla debajo. | RF-10, RF-12, RF-13, RF-14, RF-20, RF-21 |
| `compareSessions` | Día, hora de inicio, `createdAt`, id por punto de código (006 RF-2, DP6-15). | RF-15 |
| `upsertSessionInList(l, s, f)` | Si `s.id` está → se reemplaza en su lugar; si no y `f === 'all' \|\| f === s.gameId` → se inserta y se ordena con `compareSessions`; si no → `l` sin cambios. | RF-15 (R17, Q8) |
| `removeSessionFromList(l, id)` | Lista sin ese id. | RF-15, RF-19 |
| `resolveMockSessionId(raw)` | `MOCK_SESSION_ID_PATTERN.test(raw)` → `raw.toLowerCase()`; si no → `null`. `SESSION-3` → `session-3`; `abc`, `session-`, ` session-3` → `null`. | RF-16 (Q20) |

`classifyResponse(kind, r)` (RNF-6, D21). El 401 nunca llega aquí como regla: lo trata
`execute` de la 007 (RF-7) y la clasificación devuelve `session` para que la vista no haga
nada. Un `SessionClearedError` no se clasifica: se ignora antes (007).

| `kind` | 200 / 204 | 400 o 404 | 401 | 403, 409 (con mensaje) | 400 con mensaje (solo `action`) | otro con mensaje | sin mensaje, 5xx sin mensaje, plazo (estado 0) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `load` (abrir, recargar, "Reintentar") | `success` | `empty` (RF-12) | `session` | `pageError` | — | `pageError` (RF-13) | `pageError` (RF-13, RF-20) |
| `reread` (nueva lectura de RF-21) | `success` | `empty` (RF-12) | `session` | `keep` | — | `keep` (Q3) | `keep` (Q3) |
| `action` (sumarse, salir, guardar, cancelar) | `success` | 404 → `empty`; 400 → columna siguiente | `session` | `messageAndReread` (RF-10, RF-14, RF-21) | `messageAndReread` | `messageOnly` (RF-10) | `messageOnly` (RF-10, RF-20) |

En `action`, un 400 sin mensaje o un 409 sin mensaje son errores sin mensaje
(`messageOnly`, sin nueva lectura): la nueva lectura solo sigue a un **rechazo** con
mensaje 400, 403 o 409, como dice RF-10 ("tras un error sin mensaje o un 5xx, no").

## 4. Algoritmo en pseudocódigo

### 4.1 Carga del detalle (RF-1, RF-11 a RF-13, RF-15, RF-17, RF-18, RF-20; R1, R17)
```
SessionDetailRoute:
  location = useLocation()
  <SessionDetailPage key={location.key} />        // cada entrada del historial = abrir (R1)

SessionDetailPage:
  rawId = useParams().sessionId                    // sin validar el formato (RF-12, D2)
  userId = useSessionUserId()                      // ProtectedRoute (007) ya garantiza sesión (RF-1)
  visit = useState(() => ++visitCounter)           // identificador de esta visita
  visitRef = useRef(visit); mountedRef (true al montar, false al desmontar)
  q = useQuery({ queryKey: sessionDetail(userId, visit, rawId),
                 queryFn: () => api.sessions.get(rawId),
                 enabled: userId !== null,
                 staleTime: Infinity, refetchOnMount: false,
                 refetchOnWindowFocus: false, refetchOnReconnect: false })   // + retry: false (007)
  efecto al llegar q.data por primera vez en esta visita:
       applySessionToAgenda(qc, userId, q.data)    // R17: la agenda no queda más vieja
  pantalla:
    state.emptied                         → estado vacío (5.4)
    q.data                                → detalle (5.2)    // la nueva lectura no lo oculta
    q.isError: o = classifyResponse('load', info(q.error))
         o = 'empty'     → estado vacío; markAgendaRemoved(rawId) (R8)
         o = 'pageError' → error de toda la página con "Reintentar" (RF-13)
         o = 'session'   → nada (la 007 lleva a login)
    si no                                 → estado de carga "Cargando…" (Working, RF-11)
  "Reintentar": si q.isFetching → nada (en curso, Q14); si no → q.refetch()
       mientras espera: el error sigue visible, el botón con retryBusy y el foco en él
  foco al terminar la carga o "Reintentar" (una vez por resultado): resolveFocus('loadDone', …)
       success → título de la sesión de juego · empty → "Esta sesión no existe" · pageError → mensaje
```
- No se usa ningún dato de la agenda para dibujar el detalle (clave propia, sin
  `initialData`; R1). Cualquier rol puede ver el detalle (RF-18): no hay comprobación.
- No hay petición por foco, intervalo ni reconexión, y ninguna se repite por sí sola (RF-17,
  D17): `retry: false` global (007) y las opciones de la consulta.
- Plazo de 30 s y descarte de la respuesta tardía: `execute` (007). Un plazo vencido llega
  como `ApiError` con estado 0 y `hasMessage: false` → `pageError` con el Texto de error sin
  mensaje (RF-20).
- `markAgendaRemoved(id)`: `removeSessionFromAgenda` + `markAgendaStale` (la agenda vuelve a
  pedir al verse, R8). Con un 400 el identificador no tiene forma válida y no está en la
  agenda; quitarlo no cambia nada.

### 4.2 Máquina de estados de las acciones (RF-6 a RF-11, RF-14, RF-19 a RF-23)
Estado local (`useDetailController`):
```
form: null | { values: EditFormValues }
dialogOpen: boolean
inFlight: null | { action: 'join' | 'leave' | 'save' | 'cancel'; origin: 'button' | 'titleEnter' }
rereading: boolean
zoneMessage, formMessage, dialogMessage: string | null
savedNotice: boolean                 // "Cambios guardados."
emptied: boolean
focusRequest: FocusTarget | null     // lo aplica un useLayoutEffect tras el render
bloqueado = inFlight !== null || rereading       // RF-11
```
Abrir y cerrar (no son acciones, R3):
```
openForm():   si bloqueado → nada (botón bloqueado)
              form = { values: editFormInitial(sesión mostrada) }; savedNotice = false   // Q1
              focusRequest = 'titleField'
discard():    si inFlight?.action === 'save' → nada (bloqueado, R5)      // en la nueva lectura sí (R4)
              form = null; formMessage = null; focusRequest = resolveFocus('formClosed', ctx)  // "Editar sesión"
openDialog(): si bloqueado → nada; dialogOpen = true; focusRequest = 'dialogBack'   // no oculta savedNotice (R3)
closeDialog():si inFlight?.action === 'cancel' → nada (Q7)                // en la nueva lectura sí (R4)
              dialogOpen = false; dialogMessage = null
              focusRequest = resolveFocus('dialogClosed', ctx)            // "Cancelar sesión" o mensaje
```
Guardar (comprobaciones del cliente antes de enviar, RF-22):
```
submitForm(origin):                  // "Guardar cambios" (button) o Intro en "Título" (titleEnter)
  si bloqueado → nada                // ni con Intro repetido
  c = checkEditForm(form.values, sesión mostrada)
  si !c.ok → formMessage = c.error; focusRequest = origen (caso 7); no se envía nada   // D-27
  si c.ok  → run('save', origin, () => api.sessions.update(rawId, toEditPayload(form.values)))
```
Acción con petición (`run`), común a sumarse, salir, guardar y cancelar:
```
run(action, origin, call):
  si bloqueado → nada
  savedNotice = false; zoneMessage = formMessage = dialogMessage = null   // iniciar otra acción
  inFlight = { action, origin }
  si action === 'cancel' → focusRequest = 'dialogTitle'                    // Q25
  myVisit = visitRef.current
  try   result = await mutation.mutateAsync(call)      // onSuccess del useMutation actualiza la agenda (4.4)
        info = { ok: true }
  catch err
        si isSessionCleared(err) → return                                   // 007: nada que mostrar
        info = { ok: false, status: err.status, hasMessage: err.hasMessage }
  si !mountedRef.current o visitRef.current !== myVisit → return            // R16: sin foco, mensaje ni redirección
  o = classifyResponse('action', info)
  inFlight = null
  según o:
    'success':
       join/leave → setQueryData(detail, result); focusRequest = resolveFocus('joinLeaveOk', …)  // botón nuevo (Q12)
       save       → setQueryData(detail, result); form = null; savedNotice = true
                    focusRequest = 'editButton'                                                // Q1
       cancel     → navigate(ROUTES.schedule, { replace: true, state: { focus: 'panelTitle' } })  // 4.5
    'empty':  emptied = true; form = null; dialogOpen = false; markAgendaRemoved(rawId)
              focusRequest = 'emptyTitle'                                                     // RF-12, caso 9
    'messageOnly':
              ponerMensaje(action, err.hasMessage ? err.message : NO_MESSAGE_TEXT)
              focusRequest = resolveFocus('actionEnded', …)          // vuelve al botón o al campo (caso 5)
    'messageAndReread':
              ponerMensaje(action, err.message)
              focusRequest = resolveFocus('actionEnded', …)          // botón, "Sí, cancelar sesión" o campo
              await reread(myVisit, action, origin)
    'session': nada                                                  // la 007 lleva a login
ponerMensaje(action, texto):  join/leave → zoneMessage · save → formMessage · cancel → dialogMessage
```
Nueva lectura tras un rechazo (RF-21; Q3, Q4, Q8, Q10, Q11; R4, R6; D13, D18, D22):
```
reread(myVisit, action, origin):
  rereading = true                                   // las acciones siguen bloqueadas; Descartar y cerrar no
  try  fresh = await rereadSession(rawId); info = { ok: true }   // api.sessions.get, sin estado de carga
  catch err  si isSessionCleared(err) → return; info = { ok: false, … }
  si !mountedRef.current o visitRef.current !== myVisit → return  // aplicado ya a la agenda si 200 (4.4)
  rereading = false
  según classifyResponse('reread', info):
    'empty'  → emptied = true; form = null; dialogOpen = false; markAgendaRemoved(rawId)
               focusRequest = 'emptyTitle'
    'keep'   → nada: el detalle sigue como estaba, con el mensaje del rechazo (Q3)
    'success'→ setQueryData(detail, fresh); applySessionToAgenda(qc, userId, fresh)   // Q8
               rol = detailRole(fresh, userId)
               si rol ≠ 'host' y (form o dialogOpen):                      // defensiva (D18, D22)
                    zoneMessage = formMessage ?? dialogMessage ?? zoneMessage
                    form = null; dialogOpen = false; formMessage = dialogMessage = null
               si no, si form: form.values = rebaseEditForm(form.values, fresh)      // R6
               focusRequest = resolveFocus('rereadArrived', { origin, action, rolAntes, rolDespués })
                    // sigue el mismo elemento → se queda; si no → mensaje de la zona (Q11, caso 2 y 4)
```
- Mientras dura `rereading`, "Descartar" y cerrar la ventana funcionan (R4): cierran sin
  enviar nada y el resultado de la nueva lectura se aplica igual al llegar; si el formulario
  ya está cerrado, `rebaseEditForm` no se aplica.
- Plazo de 30 s en una acción: `execute` lanza estado 0 → `messageOnly` con el Texto de error
  sin mensaje; la acción deja de estar en curso y el foco vuelve a su botón (RF-20, caso 5).
  Una respuesta posterior no se muestra (007).
- Sumarse sin cuenta en el juego: no hay comprobación en el cliente (RF-9, P2).
- "Sin cupos" (bloqueado) y los demás bloqueados: el manejador comprueba `bloqueado` o
  `blocked` y no hace nada (5.3).

Cancelar desde la agenda (RF-19, RF-23; Q5, Q10, D15):
```
SchedulePage: confirmFor: sessionId | null; dialogMessage; cancelInFlight
  "Cancelar sesión" de la tarjeta (si !busy) → confirmFor = id; foco 'dialogBack'
  "Sí, cancelar sesión" → cancelInFlight = true; foco 'dialogTitle'
       try await cancelSession.mutateAsync(id)
            → 204: removeSessionFromAgenda + markAgendaStale (onSuccess); confirmFor = null
                   foco 'panelTitle' (caso 6)
       catch err (no SessionCleared):
            dialogMessage = err.hasMessage ? err.message : NO_MESSAGE_TEXT
            si err.status === 404 → qc.invalidateQueries(sessionLists(userId))   // la agenda montada vuelve a pedir
            foco 'dialogConfirm' (caso 14)
       cancelInFlight = false
  cerrar (Volver, Escape, cerrar, fondo; no en curso):
       confirmFor = null; dialogMessage = null
       foco = cancelButtonRefs.get(id)?.isConnected ? ese botón : 'panelTitle'   // Q10
```

### 4.3 Gestión del foco (RNF-2, caso por caso)
Mecanismo: el controlador no llama a `focus()` directamente; deja un `focusRequest` y un
`useLayoutEffect` lo aplica tras el render con un mapa de referencias (`refs[target]`), para
que el elemento destino ya exista o ya haya desaparecido. Si el destino no existe al
aplicarse, `resolveFocus` ya habrá elegido el respaldo. Los elementos no interactivos que
reciben el foco llevan `tabIndex={-1}` (no entran en el recorrido con Tab) y foco visible
con estilo de `:focus`, no solo `:focus-visible` (D-10). "Sigue existiendo" = mismo nodo
del DOM: el botón de sumarse es un solo `<button key="join">` con texto "Unirme" o "Sin
cupos"; "Salir" es `<button key="leave">`; "Editar sesión" y "Cancelar sesión" solo existen
con `detailActions(...).kind === 'host'` (D-9).

`resolveFocus(event, ctx)` (puro, `focusRule.ts`):

| Evento | Destino | Caso RNF-2 |
| --- | --- | --- |
| `loadDone` (abrir, recargar, Atrás/Adelante, vuelta de login) | `success` → `sessionTitle`; `empty` → `emptyTitle`; `pageError` → `errorMessage` | c, 10, 12 (RF-1, RF-11) |
| `retryDone` | igual que `loadDone`; mientras espera, el foco se queda en "Reintentar" | c, 10, 11 (Q14) |
| `joinLeaveOk` | tras sumarse → `leaveButton`; tras salir → `joinButton` | b, 8 (Q12) |
| `saveOk` / `formClosed` | `editButton` (si no existe → `zoneMessage`) | b, a (Q1) |
| `clientCheckFailed` | origen: `saveButton` o `titleField` | 7 (D15, R9) |
| `actionEnded` (rechazo o error) | origen de la acción: `joinButton`, `leaveButton`, `saveButton`, `titleField` o `dialogConfirm` | a, 3, 5, 14 (Q17) |
| `rereadArrived` | si el elemento de origen sigue existiendo (mismo `key`, rol que lo contiene) → se queda; si no → `zoneMessage` | 1, 2, 3, 4 (Q10, Q11) |
| `dialogClosed` (detalle) | `cancelButton` si existe; si no → `zoneMessage` | a (Q10) |
| `cancelInFlight` | `dialogTitle`; Tab y Mayús+Tab recorren "Volver" y cerrar (bloqueados) sin salir | 14 (Q25, Q26) |
| `empty` (acción 404, nueva lectura 400/404) | `emptyTitle` | c, 9 (Q13) |
| Agenda: 204 en la ventana, cierre sin tarjeta, redirección de RF-8 | `panelTitle` (texto del momento: "Mis sesiones" o "Sesión abierta") | a, d, 6, 13 (Q10, Q15, D15) |
| Respuesta tras salir o reabrir el detalle | ninguno (no se emite `focusRequest`) | excepción (R16, CR5-3) |

Navegar a la agenda con "Ir a la agenda", "Atrás", "Adelante" o la barra de navegación deja
el foco como hoy (RF-2, C3): ninguna de esas llegadas lleva `state.focus`.

### 4.4 Caché de la agenda (RF-15, RF-19; Q8, R8, R16, R17)
```
claves agenda:  sessionLists(userId) = ['u', userId, 'sessions']   (prefijo de ['u', userId, 'sessions', filtro])
applySessionToAgenda(qc, userId, s):
  qc.setQueriesData({ queryKey: sessionLists(userId) }, (list, key) =>
       list ? upsertSessionInList(list, s, filtroDe(key)) : list)
  qc.invalidateQueries({ queryKey: sessionLists(userId) })   // solo marca; pide ya solo si la agenda está montada
removeSessionFromAgenda(qc, userId, id): igual con removeSessionFromList
cuándo:
  lectura al abrir (200)         → applySessionToAgenda                 (R17)
  sumarse / salir / guardar (200)→ applySessionToAgenda   en el onSuccess del useMutation (R16)
  cancelar (204)                 → removeSessionFromAgenda en el onSuccess del useMutation
  nueva lectura (200)            → applySessionToAgenda                 (Q8)
  estado vacío (400/404)         → removeSessionFromAgenda + marca      (R8)
  404 al cancelar en la agenda   → invalidateQueries (la agenda montada vuelve a pedir; Q5)
```
- El `onSuccess` del propio `useMutation` se ejecuta aunque el detalle ya no esté montado,
  así que una acción que responde después de "Atrás" actualiza la agenda que ya se ve, sin
  mover el foco ni mostrar mensajes (R16).
- Como la agenda tiene `staleTime: 0` (007), al montarse dibuja primero la lista ya
  actualizada y después la vuelve a pedir: nunca muestra datos más viejos que el último
  detalle (R17) ni una sesión cancelada o inexistente (RF-15, R8).
- La agenda no recuerda tarjeta abierta ni filtro: su estado es local y se pierde al
  desmontarse, como hoy (R7). Otras pestañas no ven nada hasta su siguiente lectura (D11).

### 4.5 Redirección con reemplazo en el historial (RF-8; P9, Q15)
```
cancelar en el detalle → 204:
  navigate(ROUTES.schedule, { replace: true, state: { focus: 'panelTitle' } })
     // la entrada del detalle se sustituye: "Atrás" va a la página anterior al detalle
SchedulePage al montar (una vez):
  si location.state?.focus === 'panelTitle':
     focusRequest = 'panelTitle'                        // "Mis sesiones" (R7: sin tarjeta abierta)
     navigate(location.pathname, { replace: true, state: { ...location.state, focus: undefined } })
         // la entrada queda sin la marca: recargar o volver no repite el foco
```
Convive con `location.state.proposal` de la 007 (RF-30): se limpian por separado y ninguna
borra la otra.

### 4.6 Backend simulado (RF-16; Q19, Q20, D24)
```
get(raw):     autorizar (007) → id = resolveMockSessionId(raw); null → 400 badId
              s = buscar(id); no → 404 notFound;   → 200 vista
update(raw, body):
              si !isPlainObject(body) → 400 badJson                 // paso del cuerpo (006 RF-28)
              autorizar → id → 400 badId → existe → 404 notFound
              s.hostId ≠ usuario → 403 notHostEdit                 // antes que los datos (006 RF-20)
              p = validateSessionEdit(body); !ok → 400 p.error     // RF-6/RF-26, orden y textos
              next = { ...s, ...p.value }
              next.slots < s.participants.length → 400 slotsBelowParticipants   // RF-8
              next.status = participants ≥ slots ? 'full' : 'open'; guardar; → 200 vista
join/leave/cancel: mismo resolvedor de id (400 / 404 "Sesión no encontrada.") y el resto de 007 RF-10
```
`validateSessionEdit` ya guarda título y notas recortados y acepta notas vacías (DP6-22);
`{}` o solo campos ignorados → 200 sin cambios (RF-26). Todo pasa por `execute` (007): mismo
plazo, mismos códigos y mismos textos que el servidor. Los datos semilla no cambian (007
RF-21, RF-27); la base se sigue leyendo una vez por pestaña (R11).

### 4.7 Límite de escritura en puntos de código (RF-6.5, RF-24; D-14, D-29, D-30; R13)
Función pura (`domain/sessionRules.ts`; sin React, DOM ni reloj):
```
limitToCodePoints({ previous, next, selection }, max):
  si codePointLength(next) ≤ max                      → { value: next, selection: null }     // (1)
  si codePointLength(next) ≤ codePointLength(previous) → { value: next, selection: null }    // (2) borrar / sustituir sin crecer (R13)
  sinCambio = { value: previous, selection }                                                 // (4) el campo se queda como estaba
  si selection = null
     o no (0 ≤ selection.start ≤ selection.end ≤ previous.length)
     o selection.start o selection.end cae entre las dos mitades de un par sustituto   → sinCambio
  prefijo = previous.slice(0, selection.start)
  sufijo  = previous.slice(selection.end)
  si next.length < prefijo.length + sufijo.length
     o no next.startsWith(prefijo) o no next.endsWith(sufijo)                          → sinCambio
  insertado = next.slice(prefijo.length, next.length − sufijo.length)                       // pegado, escrito, soltado…
  hueco = max − codePointLength(prefijo) − codePointLength(sufijo)
  entra = ''; usados = 0
  para cada grafema g de Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(insertado):
     si usados + codePointLength(g) > hueco → parar                                   // nunca medio emoji ni medio par
     entra += g; usados += codePointLength(g)
  si entra = ''                                                                        → sinCambio
  cursor = prefijo.length + entra.length                                               // unidades UTF-16, al final de lo insertado
  → { value: prefijo + entra + sufijo, selection: { start: cursor, end: cursor } }      // (3)
```
- Lo que ya estaba (`prefijo` y `sufijo`) se conserva entero: pegar al principio, en medio o al
  final solo recorta lo pegado, como `maxLength` pero contando puntos de código.
- **Valor del servidor que ya pasa del límite** (título guardado de más de 60, RF-6.5, R13;
  `editFormInitial` no lo recorta): borrar entra por (2); sustituir una selección por algo
  igual o más corto, también por (2); escribir o pegar sin borrar al menos lo mismo deja
  `hueco ≤ 0` y cae en (4): el campo no crece. El envío lo sigue frenando `checkEditForm`
  (RF-22) hasta que el título vuelva a 60 o menos.
- Un grafema de varios puntos de código (bandera, tono de piel, secuencia con ZWJ, letra con
  acento combinado) entra entero o no entra; el conteo sigue siendo en puntos de código
  (RF-6.5, RF-24), así que 60 emojis simples siguen cabiendo.

Puente con el campo (`shared/hooks/useCodePointLimit.ts`, D-30):
```
useCodePointLimit({ value, onValueChange, max }):
  elRef; seleccionPrevia = useRef<TextSelection | null>(null)
  composicion = useRef<{ previous, selection } | null>(null)
  cursorPedido = useState<{ selection } | null>(null)          // objeto nuevo en cada petición: fuerza el render
  al montar: el.addEventListener('beforeinput', e =>            // nativo; se dispara antes de cambiar el DOM
       si !e.isComposing → seleccionPrevia = { start: el.selectionStart, end: el.selectionEnd })
  onCompositionStart: composicion = { previous: value, selection: selección actual }
  onChange(e):
       si e.nativeEvent.isComposing → onValueChange(e.target.value); return     // no se interrumpe el IME (R-8)
       r = limitToCodePoints({ previous: value, next: e.target.value, selection: seleccionPrevia }, max)
       seleccionPrevia = null
       onValueChange(r.value)
       si r.selection → cursorPedido = { selection: r.selection }
  onCompositionEnd(e):
       r = limitToCodePoints({ previous: composicion.previous, next: e.target.value,
                               selection: composicion.selection }, max)
       composicion = null; onValueChange(r.value); si r.selection → cursorPedido = { selection: r.selection }
  useLayoutEffect([cursorPedido]): si cursorPedido → el.setSelectionRange(start, end)
  → { ref, onChange, onCompositionStart, onCompositionEnd }
```
- Si `r.value` coincide con `value`, React devuelve el campo controlado a su valor y pondría el
  cursor al final; `cursorPedido` (estado nuevo) fuerza el render y el efecto lo devuelve a la
  selección de antes.
- `TextField maxCodePoints={60}` usa el puente por dentro; el `textarea` de "Notas" lo usa
  directo con `max = 160`. Los dos formularios (edición y "Anotar una sesión") lo comparten.

## 5. Cómo se pinta en la interfaz

### 5.1 Ruta y estructura
`/agenda/:sessionId` dentro de `ProtectedRoute` y `AppLayout` (barra y pie con «Datos de
demostración», sin aviso propio; RF-16, Q16). Título del documento: el título de la sesión
de juego o "Detalle de sesión" mientras carga.
```
<main> (AppLayout)
  ── carga ───────────── Working "Cargando…"  (role="status")
  ── vacío ───────────── Blank: h1 "Esta sesión no existe" (tabIndex −1)
                          "Puede que se haya cancelado." · Link "Ir a la agenda"
  ── error (RF-13) ───── Failure: el mensaje como h1 (tabIndex −1) · "Reintentar"
  ── detalle ─────────── header.page-head  GameMark · h1.doc-title (título, tabIndex −1) · rango
                          section.sheet    notas · cupos y sellos · participantes · cupo libre
                          div.session-detail__actions   (zona de acciones)
                          section.sheet    formulario de edición (si está abierto)
                          CancelSessionDialog (portal, si está abierta)
```

### 5.2 Detalle (RF-3, RF-4, RNF-3)
- Juego: `GameMark` (la de la agenda) y el nombre del juego en texto (el juego no se edita).
- Título: `h1.doc-title`, texto de React. Notas: `p.session__notes` solo si `notes !== ''`.
- Rango: `formatSessionRange` en `p.note num`.
- Cupos: `"<taken>/<total> jugadores"` siempre (D9); `Stamp tone="sealed"` "Cupos llenos" si
  `status === 'full'`; `Stamp tone="pen"` "La organizas" / "Estás dentro" según el rol, **sin**
  `announce` (no es región de estado; R2). La barra `session__meter` se reutiliza
  (`aria-hidden`).
- Participantes en el orden recibido: `Monogram` con su color, `Link` a
  `playerPath(p.id, session.gameId)` con el nombre visible como texto, y "organiza" en el
  anfitrión. Después, `openSlotCount` filas "cupo libre" (ninguna con `full`, Q21).
- Nada se inserta como HTML; no se usa `dangerouslySetInnerHTML` (`<b>x</b>` se ve literal).

### 5.3 Zona de acciones, botón deshabilitado y botón bloqueado (RF-5, RF-7, RF-9, RF-11)
| Rol | Botones (siempre en la misma zona, D13) |
| --- | --- |
| anfitrión | "Editar sesión" (oculto con el formulario abierto) · "Cancelar sesión" (`btn--danger`) |
| inscrito | "Salir" (`key="leave"`) |
| no inscrito | "Unirme" o, con `full`, "Sin cupos" bloqueado (`key="join"`, el mismo nodo) |

- **Deshabilitado** (solo el de la acción en curso): atributo `disabled`, indicador
  `btn__spin` y el texto `SENDING_TEXT` ("Enviando…") en lugar del suyo (007 RF-20).
- **Bloqueado** ("Sin cupos", y "Editar sesión", "Cancelar sesión", "Descartar", "Volver",
  cerrar y el botón de la acción durante la nueva lectura, según RF-11 y RF-23):
  `aria-disabled="true"`, aspecto de no disponible con la regla `.btn[aria-disabled="true"]`
  (tokens), manejador que no hace nada, sigue en el orden de Tab y conserva el foco. NVDA
  anuncia su nombre y "no disponible".
- Mensaje de la zona: `p.notice.notice--error` con `role="alert"` y `tabIndex={-1}`, junto al
  botón. "Cambios guardados.": `p.notice` con `role="status"` en la misma zona.

### 5.4 Estados vacío y de error (RF-12, RF-13)
- Vacío: `Blank` con `headingRef` (h1) "Esta sesión no existe", descripción "Puede que se
  haya cancelado." y `Link` "Ir a la agenda" (`btn`), que es el siguiente Tab.
- Error: `Failure` con el mensaje según 007 RF-9 como encabezado enfocable y "Reintentar".
  En curso: el botón con indicador y `aria-disabled` (no `disabled`, para conservar el foco;
  no es escritura y no muestra "Enviando…").

### 5.5 Formulario de edición y ventana (RF-6, RF-22, RF-23)
- Formulario en `section.sheet` bajo la zona de acciones, con la misma estructura y clases
  que el de creación (`draft`, `draft__row`, `draft__pair`, `field`, `select`, `textarea`):
  "Título" (`TextField` con ref, sin `maxLength`, con `maxCodePoints={60}` y
  `onValueChange`), "Juego" (texto, no editable), "Día" (`WEEK_DAYS`), "Hora de inicio"
  (`startHourOptions`), "Duración (horas)" (1 a 4), "Cupos"
  (`slotOptions(slotRange(sesión mostrada))`), "Notas (opcional)" (`textarea` sin `maxLength`,
  con `useCodePointLimit` y `max = 160`). En los dos campos, escribir, pegar o soltar texto
  pasa por 4.7: el texto que ya estaba no cambia, solo entra lo insertado que cabe y el cursor
  queda al final de lo insertado; un título guardado de más de 60 se puede borrar pero no
  crece. No se usa `onBeforeInput` de React ni se cancela el evento (D-30). Error arriba en
  `p.notice.notice--error role="alert"`, como en el de creación. Pie: "Descartar" (`btn`) y
  "Guardar cambios" (`btn btn--pen`, `type="submit"`).
- Ventana: `Slip` con `title="¿Cancelar esta sesión?"`, `initialFocusRef` = "Volver",
  `titleRef`, `trapFocus` y `closeLocked` mientras la cancelación está en curso. Cuerpo:
  "Se borrará para todos los participantes y no se puede deshacer." y, si lo hay, el mensaje
  en `p.notice.notice--error role="alert"`. Pie: "Volver" (`btn`) y "Sí, cancelar sesión"
  (`btn btn--danger`). Retención: en `keydown` Tab, se recorren los botones de la ventana
  (incluidos los bloqueados; no los `disabled`) en círculo; desde el título, Tab va al
  primero y Mayús+Tab al último.

### 5.6 Agenda (RF-2, RF-19, RNF-5)
- Cada `SessionSlip` (en "Sesión abierta" y en "Mis sesiones") gana en su pie un `Link`
  `btn btn--quiet btn--sm` con texto visible "Ver detalle" y `aria-label` "Ver detalle de
  <título>" (Q6; dos títulos iguales dan el mismo nombre, R12). Es una navegación normal:
  añade una entrada al historial.
- "Cancelar sesión" de la tarjeta abre la misma `CancelSessionDialog`.
- El `h2.sheet-title` del panel ("Mis sesiones" / "Sesión abierta") lleva `tabIndex={-1}` y
  ref. El resto de la agenda (sello "Estás dentro" con `announce`, "Sin cupos" con
  `disabled`, filtros) no cambia (R2, R7).

### 5.7 Tokens, 360 px y contraste (RNF-1, RNF-5)
- `sessionDetail.css` solo usa variables de `tokens.css` (`--s*`, `--ink-*`, `--line`,
  `--surface-*`, `--r-*`); ningún hexadecimal, `rgb(` ni `hsl(`.
- 360 px: una sola columna; `h1`, notas, nombres y títulos de tarjeta con `overflow-wrap:
  anywhere` y `min-width: 0` en los contenedores flexibles; `draft__pair` se apila; la zona
  de acciones con `flex-wrap: wrap`. Con 60 caracteres sin espacios y 160 de notas, sin
  desplazamiento horizontal, también con el formulario o la ventana abiertos.
- Contraste: textos de estado con `note` (`--ink-2`) o superior. "cupo libre" y "organiza"
  usan hoy `--ink-3`; si en algún tema no llegan a 4,5:1, en el detalle pasan a `--ink-2`
  (riesgo R-4). Se mide en la validación.

### 5.8 Textos literales (en `copy.ts`)
"Ver detalle" · "Ver detalle de <título>" · "La organizas" · "Estás dentro" · "organiza" ·
"cupo libre" · "Cupos llenos" · "<n>/<t> jugadores" · "Editar sesión" · "Cancelar sesión" ·
"Unirme" · "Salir" · "Sin cupos" · "Guardar cambios" · "Descartar" · "Cambios guardados." ·
"¿Cancelar esta sesión?" · "Se borrará para todos los participantes y no se puede
deshacer." · "Sí, cancelar sesión" · "Volver" · "Esta sesión no existe" · "Puede que se haya
cancelado." · "Ir a la agenda". Se reutilizan de la 007: "Enviando…", "Cargando…",
"Reintentar", Texto de error sin mensaje. Los mensajes del servidor y del backend simulado
se muestran tal como llegan; los de las comprobaciones del cliente salen de `SESSION_ERRORS`.

## 6. Decisiones técnicas

| # | Decisión | Alternativa descartada | Por qué |
| --- | --- | --- | --- |
| D-1 | Ruta `/agenda/:sessionId` (referencia V2) y `sessionPath` con `encodeURIComponent` | `/sesiones/:id` | La fija la referencia; el prefijo `/agenda/` deja la ruta bajo la agenda en la barra y en `isProtectedPath` |
| D-2 | Página montada con `key={location.key}` + clave de consulta por visita, `staleTime: Infinity` y `refetchOnMount: false` (como la ficha, plan 008) | `useEffect` sobre el parámetro con `staleTime: 0` | Toda llegada (Atrás, Adelante, recarga, vuelta de login) cuenta como abrir: pide y muestra la carga (R1); y nada vuelve a pedir solo (RF-17) |
| D-3 | Clave propia del detalle, sin `initialData` desde la agenda | Sembrar el detalle con la tarjeta de la agenda | R1: los datos en memoria no se usan para dibujar el detalle |
| D-4 | Nueva lectura manual (`api.sessions.get` + `setQueryData`) | `refetch()` de la consulta | La nueva lectura no puede mostrar carga ni el error de RF-13 (Q3) y su resultado depende de `classifyResponse('reread')`; `refetch` mezcla su estado con el de la carga inicial |
| D-5 | Agenda: `setQueriesData` con `upsert`/`remove` + `invalidateQueries` | Solo invalidar | Con solo invalidar, la agenda dibuja primero la lista vieja (cancelada incluida) y luego la nueva; RF-15, R8 y R17 piden que no muestre datos más viejos |
| D-6 | Botón en curso con `disabled` + "Enviando…" | `aria-disabled` también en curso | Es lo que dice 007 RF-20 ("deshabilita"), que la usuaria no permite cambiar (Q17), y la convención de las vistas existentes; la spec acepta que pierda el foco y el plan lo restaura al terminar (4.3) |
| D-7 | Botones bloqueados con `aria-disabled="true"` + manejador neutro | `disabled` | `disabled` saca el botón del orden de Tab y le quita el foco; RF-9, RF-11, RF-23 y D30 exigen que lo conserve y se anuncie como no disponible (como "Proponer" en 007/008) |
| D-8 | "Reintentar" en curso con `aria-disabled` e indicador, sin "Enviando…" | `disabled` o el texto "Enviando…" | Q14 exige que conserve el foco; no es una escritura (007 RF-20 no aplica) |
| D-9 | `key="join"` para "Unirme"/"Sin cupos" y `key="leave"` para "Salir" | Un único botón que cambia de texto | Sin claves distintas React reutiliza el mismo nodo y el foco "seguiría existiendo" al pasar de "Unirme" a "Salir", contra Q11 y Q12 |
| D-10 | Foco por programa con `focusRequest` + `useLayoutEffect`, `tabIndex={-1}` y estilo de `:focus` con tokens | Llamar a `focus()` en el manejador; depender de `:focus-visible` | El destino puede aparecer o desaparecer en el mismo render; Chrome no siempre pinta `:focus-visible` en un foco por programa tras un clic, y RNF-2 exige que se vea |
| D-11 | Regla del foco como función pura `resolveFocus` en `features/sessions/detail/` | En `domain/`; o repartida en los componentes | Es comportamiento de interfaz, no regla del dominio (RNF-6 no la lista); como tabla pura se revisa y se comprueba con Node |
| D-12 | `Slip` con opciones opcionales (`initialFocusRef`, `titleRef`, `trapFocus`, `closeLocked`) | Un componente de ventana nuevo; activar la retención para todos | La spec exige el mismo componente que el formulario de creación (RF-23) y que este conserve su foco de hoy (R10); sin dependencia nueva |
| D-13 | `CancelSessionDialog` única para detalle y agenda | Dos ventanas | RF-19 pide "la misma ventana"; un solo lugar para Q7, Q25 y Q26 |
| D-14 | Límite de escritura con `limitToCodePoints`, sin `maxLength` | `maxLength={60}` / `{160}` | `maxLength` cuenta unidades UTF-16: 60 emojis serían 120 y no cabrían (RF-6.5, RF-24, Q23) |
| D-15 | Copia de las reglas de 006 en `domain/sessionRules.ts` con los nombres del plan 006, y `isValidSessionTitle` como única regla del título, usada por los dos formularios y por el backend simulado | Importar `backend/src/domain` desde el frontend; una regla por formulario | El paquete de la interfaz no compila código del servidor; el patrón de copia es el de 007 RNF-6 (manda el servidor); Q18 y RNF-6 piden una sola función |
| D-16 | `sessions.update(id, payload: Partial<SessionEditFields>)`; el formulario construye siempre los seis campos | Tipo con los seis obligatorios | El backend simulado debe reproducir la edición parcial de 006 (RF-16) y su firma la debe poder expresar; el formulario sigue enviando todo (Q19) |
| D-17 | `resolveMockSessionId` en un archivo sin imports | Lógica dentro de `mockApi.ts` | Se comprueba directo con Node y lo usan cinco operaciones (patrón de `mockUserTarget.ts`, 008) |
| D-18 | Acciones con `useMutation` (efecto en la agenda en el `onSuccess` del hook) + `mutateAsync` guardado por visita para la interfaz | Callbacks por llamada de `mutate` | Los callbacks por llamada no se ejecutan tras desmontar; R16 exige reflejar el éxito en la agenda aunque el usuario ya se fue, sin tocar la interfaz |
| D-19 | Redirección de RF-8 con `navigate(..., { replace: true, state: { focus: 'panelTitle' } })` y consumo único en la agenda | Un almacén global de foco | Mismo patrón que la propuesta de 007 RF-30; recargar o volver no repite el foco |
| D-20 | Mensajes de rechazo con `role="alert"` (como `MutationNotice` de la 007); "Cambios guardados." con `role="status"`; sello del detalle sin `announce` | Sin región viva y solo foco | Cuando el foco se queda en el botón (casos 1 y 5) el mensaje no se leería; Q1 pide anunciar "Cambios guardados."; R2 prohíbe anunciar el sello |
| D-21 | `SessionDetailFacts` propio que reutiliza las clases de `sessionSlip.css` | Reutilizar `SessionSlip` | El detalle cuenta los "cupo libre" por estado (Q21) y muestra "x/y jugadores" siempre (D9), y la tarjeta de la agenda no cambia (R2) |
| D-22 | `formatSessionRange` en el dominio, usada por la tarjeta y el detalle | Repetir la fórmula | RNF-6 pide el rango horario como regla pura; la salida de la tarjeta no cambia |
| D-23 | `TextField` con `forwardRef` | `document.getElementById` | Foco a "Título" sin consultar el DOM a mano; sin cambio visible |
| D-24 | Prevalece la spec 006 sobre la referencia: edición parcial y regla del título de 006; horario con el formato de la agenda | "Mismas validaciones del borrador" y `formatRange` de la referencia | Lo fija la spec (Contexto, CR4-3; RF-3) |
| D-25 | Sin parámetro `hoy` ni `now` | Pasar `today` a todas por uniformidad | Ninguna regla depende de la fecha (semana tipo); sería un parámetro muerto (sección 0) |
| D-26 | Pruebas del dominio nuevo de la interfaz con scripts de Node en el scratchpad, en rojo antes y en verde después, con el gancho de resolución de la 007; no se versionan y su texto y su salida van a `validation.md`; sin configuración nueva (respuesta de la usuaria: «Scripts sin versionar (Recomendado)») | (b) Pruebas versionadas `frontend/tests/*.test.ts` con `node:test`; (c) solo revisión de código | (b) exige un gancho de resolución en el repositorio y un script `test` en `frontend/package.json`, configuración que conviene decidir para todo el frontend y no dentro de la 009; (c) no ejecuta ningún caso. La opción elegida mantiene el patrón de la 007 y la 008 y cumple RNF-4 y el principio 4 (en el frontend bastan build, typecheck y lint) |
| D-27 | Si fallan los puntos 2 a 4 de RF-22, `checkEditForm` devuelve el texto literal que la 006 fija para ese campo (`SESSION_ERRORS`; en cupos bajo el mínimo, el de 006 RF-8) y el formulario lo muestra y no envía la edición (respuesta de la usuaria: «Mostrar texto y no enviar (Recomendado)») | (b) No comprobar los puntos 2 a 4 en el cliente y dejar que el servidor responda 400 | RF-22 pide comprobarlos antes de enviar; mostrar el mismo texto que daría el servidor evita un texto propio (D14 de la spec) y un viaje al servidor; las comprobaciones siguen el orden de campos de 006 RF-20, así que el primer texto coincide con el que daría el servidor. Confirmado por la usuaria en el ajuste final, para cupos bajo el mínimo: «El de RF-8 (Recomendado)», es decir, «No puedes dejar menos cupos que jugadores inscritos.» (006 RF-8) |
| D-28 | Orden de implementación: la 009 empieza cuando el plan 007 esté aprobado, la 007 tenga hechas sus T1 a T26 y la 008 su tarea de enlaces; si falta una pieza, el implementer para y lo reporta (respuesta de la usuaria: «Después de 007 y 008 (Recomendado)») | (b) Que la 009 cree las piezas de la 007 o la 008 que le falten | (b) duplica trabajo y arriesga dos versiones de `execute`, `copy.ts`, `Failure`, las claves por usuario o `playerPath`; la 009 se apoya en ellas sin repetirlas (sección 0) |
| D-29 | Al insertar (pegar, escribir o soltar) un texto que pasa del límite, se comporta como `maxLength` contando puntos de código: el texto que ya estaba se conserva entero y solo entra la parte de lo insertado que cabe hasta 60 (título) o 160 (notas), en grafemas completos (nunca medio emoji ni medio par sustituto); el cursor queda al final de lo insertado. Un valor que ya pasa del límite (título guardado de más de 60, R13) se puede borrar y no crece. `limitToCodePoints(edit, max)` recibe el valor anterior, el nuevo y la selección previa, y devuelve el valor y el cursor (4.7). Respuestas de la usuaria: «Recortar al límite (Recomendado)» y, en el ajuste final, «Recortar solo lo pegado (Recomendado)» | (b) Recortar por el final: quedarse con los primeros 60 o 160 puntos de código del valor resultante (el R-10 anterior); (c) rechazar el cambio y dejar el campo como estaba | Con (b), pegar al principio o en medio borra el final del texto que ya había (lo que quedaba tras el cursor), cosa que `maxLength` no hace y que el jugador no espera; con (c), un pegado largo no deja nada y el jugador no ve por qué. Recortar solo lo insertado conserva lo escrito y lo que cabe de lo pegado (RF-6.5, RF-24). Sigue siendo pura y sin "hoy": no depende del día (D-25) |
| D-30 | El puente con el DOM (`useCodePointLimit`) lee la selección en el evento nativo `beforeinput`, deja que el navegador aplique el cambio, corrige el valor en `onChange` con `limitToCodePoints` y coloca el cursor con `setSelectionRange` en un `useLayoutEffect`; con un IME, aplica la regla en `compositionend` | (b) `onBeforeInput` de React con `preventDefault` e inserción a mano; (c) solo `onChange` sin selección previa, adivinando lo insertado por diferencia | (b) el `onBeforeInput` de React sale de `keypress`/`textInput` y no se dispara al pegar, soltar ni borrar, y cancelar el evento obliga a reimplementar cada `inputType` y rompe el deshacer del navegador; (c) es ambigua cuando lo insertado repite letras vecinas ("aa" en "aaa") y puede colocar mal el cursor. Leer la selección antes del cambio hace la inserción inequívoca y deja la regla en una función pura comprobable con Node |

## 7. Estrategia de tests y verificación
Stack: el backend usa `node:test` + supertest; el frontend **no tiene runner** (`AGENTS.md`;
constitución, principio 4: en el frontend bastan build, typecheck y lint). RNF-4 de esta spec
no exige pruebas automáticas en la interfaz (D20). `frontend/src/domain` importa sin la
extensión `.ts` y con `@/`, así que no se ejecuta directo con `node --test` (`MEMORY.md`).

1. **Verificación estándar de cada tarea (RNF-4):** `cd frontend && npm run typecheck &&
   npm run lint && npm run build` en verde, sin `any`, `@ts-ignore`, `.only` ni
   `dangerouslySetInnerHTML`.
2. **Comprobaciones con Node del dominio, primero en rojo (D-26, decidido por la usuaria;
   sin configuración nueva):** como en los planes 007 y 008, el implementer escribe antes
   un script de Node en el scratchpad con la tabla de casos (7.1), lo ejecuta contra el
   módulo vacío o inexistente (rojo), implementa y lo repite (verde). El script registra el
   mismo gancho de resolución de la 007 (`module.register`: añade `.ts` y resuelve `@/`) y
   puede usar `node:test` dentro. **No se versiona**: su texto y su salida (la roja y la
   verde) se pegan en `validation.md`. No se añade ningún script `test` a
   `frontend/package.json` ni ningún archivo de configuración.
   `mockSessionTarget.ts` y `focusRule.ts` (si no importa nada) se cargan directo. Los casos
   del backend simulado (`mockApi.ts`) usan además los sustitutos de `localStorage` e
   `import.meta.env` de la 008; si el módulo no carga, el implementer para y lo reporta.
3. **Backend:** sin cambios ni pruebas nuevas; `npm test` del backend no se toca.
4. **Revisiones de código** (al registro): una sola `isValidSessionTitle`, usada por
   `SessionEditForm` (vía `checkEditForm`), `SessionDraftSlip` y `validateSessionEdit`
   (`grep`); ninguna regla de RNF-6 duplicada en componentes; sin colores escritos a mano en
   los archivos nuevos (`grep` de `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(`); sin `fetch(` fuera de
   `httpClient`; sin `dangerouslySetInnerHTML`/`innerHTML`; el backend simulado frente a 006
   RF-6, RF-7, RF-8, RF-10, RF-15, RF-19, RF-20 y RF-26 y sus textos literales; la rama
   defensiva de RF-14/RF-21 y la de la nueva lectura fallida (`keep`).
5. **Recorrido manual registrado** en `specs/009-detalle-de-sesion/validation.md`, con fecha y
   resultado por paso, siguiendo los Criterios de finalización de la spec: servidor real,
   modo simulado desactivado, A, B y C (C sin cuenta de LoL), con la pestaña de red ("3G
   lenta", latencia personalizada de 40 s, bloqueo de la URL de obtener la sesión), dos
   pestañas por integrante y el servidor apagado cuando se pida. Bloques: recorrido (pasos 1
   a 9), agenda, estados, bloqueos y formulario, cupos con datos viejos, regla del título
   (60 y 160 emojis, pegar al principio, en medio y al final pasando del límite con el
   texto previo intacto y el cursor al final de lo pegado, tabulador, U+2028, U+0085, U+00A0, `ab`, `  ab  `, vacío en creación,
   propuesta con tabulador en el nombre visible), hora fuera del horario (05:00 creada contra
   la API), modo simulado con la cuenta demo (`SESSION-3`, `abc`, `session-999999`,
   `SESSION-999999`, sin peticiones al servidor), **solo teclado y NVDA en Chrome**, **360 px**
   (60 caracteres sin espacios y 160 de notas, con formulario y ventana, y la agenda) y
   **contraste** (Lighthouse en los dos temas y selector de color para los estados que no ve).
   Los casos que no se provocan desde la interfaz (sesión `full` en la cascada, fallo de la
   nueva lectura, 403) se comprueban con las tablas de 7.1 y la revisión de código.
   Las comprobaciones de "una sola petición" se hacen con `npm run build && npm run preview`,
   no con el servidor de desarrollo (StrictMode duplica efectos; riesgo R-6).
6. **La validación espera** a que estén implementadas la 006, la 007 y la 008 en lo que esta
   spec usa (sección 0).

### 7.1 Casos de las comprobaciones con Node

| Función | Casos (entrada → esperado) | RF |
| --- | --- | --- |
| `isValidSessionTitle` (escapes de JavaScript) | `"ab"`, `"  ab  "`, `"　ab　"`, `""`, `"   "` → false; `"Ranked\tnoche"`, `"Ranked\u0085noche"`, `"Ranked noche"`, `"Ranked noche\u0085"` → false; `"\tRanked\t"`, `"Ranked\n"`, `" Ranked﻿"`, `" Ranked "` → true; `"Ranked noche"` → true; 60 emojis → true; 61 → false; `"​ab"` → true (U+200B no se recorta y cuenta) | RF-22, RF-24 |
| `limitToCodePoints` (notación: `ins(anterior, [s, e], insertado)` = `next` es `anterior.slice(0, s) + insertado + anterior.slice(e)` con `selection {s, e}`; "cursor" = `selection` devuelta, en unidades UTF-16; `L` = letras `a`, `E` = `'🎮'`) | **Sin pasar del límite:** `ins('', [0,0], 'Ranked')` → `'Ranked'`, cursor null; `ins('', [0,0], 60 E)` → 60 E, cursor null. **Pegar al final:** `ins('Ranked', [6,6], 70 L)` → `'Ranked'` + 54 L, cursor 60. **Al principio:** `ins('Ranked noche', [0,0], 70 'x')` → 48 `'x'` + `'Ranked noche'`, cursor 48. **En medio:** `ins('Ranked noche', [6,6], 70 'x')` → `'Ranked'` + 48 `'x'` + `' noche'`, cursor 54 (el final se conserva). **Sustituyendo una selección:** `ins(60 L, [10,20], 15 'x')` → 10 L + 10 `'x'` + 40 L, cursor 20. **Notas:** `ins('', [0,0], 200 L)` con 160 → 160 L, cursor 160; `ins('', [0,0], 161 E)` con 160 → 160 E, cursor 320. **Emojis en el límite:** `ins(59 L, [59,59], 'EE')` → 59 L + `'E'`, cursor 61; `ins(58 L, [29,29], 'EEE')` → 29 L + `'EE'` + 29 L, cursor 33; `ins(59 L, [59,59], '🇨🇱')` (2 puntos de código) → 59 L sin cambio, cursor `{59,59}`; `ins(58 L, [58,58], '🇨🇱')` → entra entera (60, regla 1), cursor null; `ins(59 L, [59,59], '👍🏽')` → sin cambio. **Sin hueco:** `ins(60 E, [120,120], 'a')` → 60 E, cursor `{120,120}`; `ins(60 L, [5,8], 'x')` → 5 L + `'x'` + 52 L (58, regla 1), cursor null. **Valor del servidor que ya pasa (R13):** anterior 65 L: borrar uno (`next` 64 L, `[64,65]`) → 64 L, cursor null; `ins(65 L, [10,10], 'a')` → 65 L sin cambio, cursor `{10,10}`; `ins(65 L, [0,3], 'a')` → 63 (no crece); `ins(65 L, [0,1], 'abc')` → 65 L sin cambio (crece y no hay hueco). **Inserción no reconocible:** `{previous: 60 L, next: 61 L, selection: null}` → 60 L; `selection {130, 130}` fuera de rango → sin cambio; `selection` en medio de un par sustituto → sin cambio | RF-6.5, RF-24 |
| `validateSessionEdit` | `{}` → ok `{}`; `{slots: 3}` → ok `{slots:3}`; `{title: null}` → título; `{title: ''}` → título; `{notes: ''}` → ok `notes ''`; `{notes: null}` → notas; `{day: '3'}` → día; `{gameId: 'xyz', hostId: 'x'}` → ok `{}`; título e inválido de notas a la vez → título (orden) | RF-16 |
| `detailRole` / `detailActions` | anfitrión → host; inscrito → leave; no inscrito `open` → join no bloqueado; no inscrito `full` con 3/4 visibles → join bloqueado | RF-5, RF-9 |
| `formatSessionRange` | (0, 23, 4) → "Lunes · 23:00–03:00"; (6, 22, 2) → "Domingo · 22:00–00:00" | RF-3 |
| `openSlotCount` / `occupancy` | `full` 4 cupos 3 visibles → 0 y 3/4; `open` igual → 1 y 3/4; `open` 2 cupos 1 → 1 | RF-3 (Q21) |
| `slotRange` / `slotOptions` | `full` 4 cupos 3 visibles → 4…6; `open` 4 cupos 3 → 3…6; `open` 1 participante → 2…6 | RF-6.4, RF-22.3 (Q22) |
| `adjustSlots` / `rebaseEditForm` | elegido 2 con nuevo mínimo 3 → 3; elegido 5 → 5; el resto de valores se conserva | RF-6, RF-21 (Q4) |
| `startHourOptions` | 20 → `GRID_HOURS`; 5 → `[...GRID_HOURS, 5]` (05:00 tras las 01:00) | RF-6.2 |
| `checkEditForm` (D-27: campo y texto literal) | `ab` → title, "El título debe tener entre 3 y 60 caracteres."; 60 emojis → ok; notas de 161 → notes, "Las notas deben ser texto de hasta 160 caracteres."; día 7 → day, "Día no válido: usa un entero de 0 (lunes) a 6 (domingo)."; hora 5 con sesión a las 20:00 → startHour, "Hora de inicio no válida: usa un entero de 0 a 23."; hora 5 con sesión a las 05:00 → ok; duración 5 → durationHours, "Duración no válida: usa un entero de 1 a 4 horas."; cupos 7 → slots, "Cupos no válidos: usa un entero de 2 a 6."; cupos 2 con 3 visibles `open` (o 3 con `full` 4 cupos) → slots, "No puedes dejar menos cupos que jugadores inscritos."; título `ab` y día 7 a la vez → title (orden) | RF-22 |
| `toEditPayload` | título `'  Ranked  '` → se envía igual; seis campos siempre | RF-6 (Q19, R13) |
| `classifyResponse` | cada celda de la tabla de la sección 3 (load 400/404 → empty; load 403/500/0 → pageError; reread 404 → empty; reread 500/0/403 → keep; action 404 → empty; action 409/403/400 con mensaje → messageAndReread; action 400 sin mensaje, 500 sin mensaje, 0 → messageOnly; 401 → session) | RF-10, RF-12, RF-13, RF-14, RF-20, RF-21 |
| `upsertSessionInList` / `removeSessionFromList` | reemplazo en su lugar; inserción ordenada en `all` y en su juego; sin cambios en otro filtro; quitar | RF-15 |
| `resolveMockSessionId` | `SESSION-3`, `Session-3` → `session-3`; `session-999999` → `session-999999`; `abc`, `session-`, ` session-3`, `session-3 ` → null | RF-16 (Q20) |
| `resolveFocus` | casos 1 a 14 de RNF-2 y la excepción de R16 (ningún destino) | RNF-2 |
| backend simulado (`mockApi`) | get `SESSION-3` → 200 `session-3`; `abc` → 400 "id con formato inválido"; `session-999999` → 404 "Sesión no encontrada."; update ajeno con datos inválidos → 403; inexistente → 404; cupos bajo inscritos → 400; `{}` → 200 sin cambios; `{title:'  Ranked  '}` → 200 título recortado; join/leave/cancel inexistentes → 404 | RF-16 |

## 8. Riesgos y preguntas

### 8.1 Riesgos
- **R-1. Dependencias sin implementar (condición previa de orden, D-28).** La 009 usa piezas
  de los planes 007 y 008 (sección 0) y **no empieza su implementación** hasta que se cumplan
  las tres condiciones: plan `specs/007-integrar-frontend/plan.md` aprobado (hoy, 2026-10-18,
  su cabecera dice "Estado: borrador", aunque el plan 008 lo da por base; este plan no lo
  cambia), T1 a T26 de la 007 hechas y la tarea de enlaces de la 008 hecha. Si al aprobarse
  el plan 007 cambian `execute`, `copy.ts`, las claves por usuario, `Failure`,
  `isProtectedPath` o `playerPath`, se revisa este plan antes de implementar.
- **R-2. Validación con el servidor real.** Necesita la 006 implementada (`backend/` aún no
  tiene `/api/sessions`). El código avanza en modo simulado.
- **R-3. El servidor podría diferir de la spec 006** (ruta de edición, códigos o textos). Si
  pasa, se para y se pregunta; este plan no diseña cambios de servidor.
- **R-4. Contraste de `--ink-3`.** "cupo libre" y "organiza" usan `--ink-3`; en el tema claro
  podría no llegar a 4,5:1. Mitigación en 5.7; se mide en la validación.
- **R-5. Doble lectura en NVDA.** Un mensaje con `role="alert"` que además recibe el foco
  (casos 2 y 4) puede leerse dos veces. Se comprueba en el recorrido con NVDA; si molesta, se
  plantea a la usuaria quitar el `role` solo cuando el foco va al mensaje.
- **R-6. StrictMode en desarrollo** duplica efectos y puede mostrar dos peticiones de la
  sesión; la comprobación de "una sola petición" se hace con la construcción de producción.
- **R-7. Identificadores raros en la dirección.** `..` o `.` codificados siguen siendo
  segmentos que el navegador normaliza (`/api/sessions/..` → `/api/`); el servidor responde
  404 "endpoint desconocido" y el detalle muestra el estado vacío (RF-12), lo que es
  coherente con la spec.
- **R-8. Escritura con IME y recorte.** Durante la composición el campo deja pasar el texto
  y el límite se aplica en `compositionend` (4.7, D-30); mientras se compone, el campo puede
  mostrar por un momento más de 60 o 160 caracteres. El envío no se ve afectado
  (`isValidSessionTitle` y `checkEditForm`). Afecta solo al carácter 61.º o 161.º.
- **R-10. Resuelto por D-29 (ajuste final).** El riesgo de perder el final del texto al pegar
  en medio desaparece: ahora solo se recorta lo insertado y lo que ya estaba se conserva
  entero (4.7; casos de 7.1). Se sigue recorriendo en la validación (regla del título: pegar
  al principio, en medio y al final, y con emojis en el límite).
- **R-9. Cambio visible accidental en la agenda.** `SessionSlip` cambia por el enlace, el
  rango compartido y el CSS de 360 px; la revisión compara la tarjeta antes y después (solo
  debe cambiar "Ver detalle" y el corte de líneas largas).

### 8.2 Preguntas
No queda ninguna pregunta abierta. Las cuatro del borrador se cerraron con las respuestas
literales de la usuaria y pasan a la sección 6:

| Pregunta | Respuesta de la usuaria | Decisión |
| --- | --- | --- |
| 1. Pruebas del dominio nuevo de la interfaz | «Scripts sin versionar (Recomendado)» | D-26 (sección 7, punto 2) |
| 2. Texto si fallan los puntos 2 a 4 de RF-22 | «Mostrar texto y no enviar (Recomendado)» | D-27 (`checkEditForm`, sección 3) |
| 3. Orden de implementación respecto de la 007 y la 008 | «Después de 007 y 008 (Recomendado)» | D-28 (sección 0 y R-1) |
| 4. Pegar un texto que pasa del límite | «Recortar al límite (Recomendado)» | D-29 (`limitToCodePoints`, secciones 3 y 4.7) |
| Ajuste final: texto de cupos bajo el mínimo | «El de RF-8 (Recomendado)» | D-27 (confirmación) |
| Ajuste final: pegar en medio y pasar del límite | «Recortar solo lo pegado (Recomendado)» | D-29 y D-30 (4.7; R-10 resuelto) |
