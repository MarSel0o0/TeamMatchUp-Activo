# Tareas 009 — Vista nueva: detalle de sesión
Estado: aprobado (2026-10-18)
Spec: `specs/009-detalle-de-sesion/spec.md` (aprobada el 2026-10-18). Plan:
`specs/009-detalle-de-sesion/plan.md` (aprobado el 2026-10-18: «apruebo y demosle con las
tasks», que incluye D-30 y que los emojis compuestos entren enteros o no entren).
Todas las tareas están pendientes.

**Número de tareas:** salen 18 (T0 a T17), más de las 10 que fija la skill `sdd`. Decisión
de la usuaria: «Mantener 18 tareas (Recomendado)» (ver «Decisiones registradas» al final).

## Reglas para cada tarea
- Una tarea = una llamada al implementer; en orden. Marcar la tarea y parar.
- **Condición previa (T0, D-28, R-1):** ninguna tarea de T1 en adelante empieza sin T0 hecha.
  Además, **al empezar cada tarea** el implementer comprueba que las piezas de la 007 y la
  008 que esa tarea usa existen con la firma del plan 009, sección 0. Si falta alguna o
  tiene otra firma, **para y lo reporta**; no la crea dentro de la 009.
- **Pruebas primero con Node (D-26; plan, sección 7, punto 2)** en las tareas con reglas
  puras o con backend simulado (T1 a T5 y T9):
  1. el implementer escribe antes un script de Node **en el scratchpad** con las filas de la
     tabla 7.1 del plan que indica la tarea, con el valor esperado de cada caso (puede usar
     `node:test` dentro del script);
  2. lo ejecuta contra el módulo vacío o sin la función (**rojo**) y guarda la salida;
  3. implementa y lo repite hasta el **verde**;
  4. pega en `specs/009-detalle-de-sesion/validation.md` el texto del script y las dos
     salidas (roja y verde), con la versión de Node.
  Los módulos con imports sin extensión o con `@/` se cargan con el gancho de resolución
  de la 007 (`module.register`; texto en `specs/007-integrar-frontend/validation.md`).
  `mockSessionTarget.ts` y `focusRule.ts` (si no importa nada) se cargan directo. Los casos
  del backend simulado (`mockApi.ts`) usan además los sustitutos de `localStorage` e
  `import.meta.env` de la 008; si el módulo no carga, el implementer **para y lo reporta**.
  **No se versiona ningún script**, no se añade un script `test` a `frontend/package.json`
  ni ningún archivo de configuración.
- **Verificación estándar de toda tarea (RNF-4), en verde:**
  ```
  cd frontend && npm run typecheck && npm run lint && npm run build
  ```
  y la aplicación arranca en modo simulado (`VITE_USE_MOCK_API=true npm run dev`) sin
  errores de consola.
- **El backend no cambia** (plan, sección 0). Ninguna tarea toca `backend/` ni ejecuta
  `cd backend && npm test`. Si una tarea descubre que necesita tocarlo (ruta, código o texto
  distinto de la spec 006), **para y lo pregunta**: sería un error del plan (R-3).
- Sin `any`, `@ts-ignore`, `.only`, `dangerouslySetInnerHTML` ni `innerHTML`; sin colores
  escritos a mano (solo variables de `styles/tokens.css`); ninguna dependencia ni variable de
  entorno nueva; identificadores en inglés y textos en español.
- Ninguna función pura importa React, `fetch` ni el almacenamiento, ni lee el reloj;
  **ninguna recibe `hoy` ni `now`** (plan, sección 0; D-25).
- Los textos literales de la 009 viven solo en `frontend/src/shared/utils/copy.ts` (plan
  5.8); los de las comprobaciones del cliente salen de `SESSION_ERRORS`.
- Rutas bajo `frontend/src/` salvo indicación.

## Condición previa

- [x] **T0. Comprobar la condición previa de la 009 (no implementa nada).** D-28, R-1
  - Objetivo: confirmar que la 009 puede empezar. Esta tarea **no crea ni modifica ningún
    archivo**; solo lee y reporta.
  - Archivos: ninguno (solo lectura de `specs/007-integrar-frontend/plan.md`,
    `specs/007-integrar-frontend/tasks.md`, `specs/008-ficha-de-jugador/tasks.md` y del
    código de `frontend/src/`).
  - RF / RNF: ninguno (habilita todos).
  - Decisiones: D-28; riesgo R-1.
  - Pasos:
    1. La cabecera de `specs/007-integrar-frontend/plan.md` dice «Estado: aprobado» (hoy,
       2026-10-18, dice «borrador»).
    2. `specs/007-integrar-frontend/tasks.md` tiene marcadas `[x]` sus T1 a T26.
    3. `specs/008-ficha-de-jugador/tasks.md` tiene marcada `[x]` su tarea de enlaces (T9,
       plan 008, sección 8, punto 9: `playerPath` y los enlaces de participantes en
       `SessionSlip`).
    4. Existen con la firma que da el plan 009, sección 0: `services/http/transport.ts`
       (`execute`), `ApiError` con `status` y `hasMessage`, `isSessionCleared` /
       `SessionClearedError`, `shared/utils/copy.ts` (`NO_MESSAGE_TEXT`, `LOADING_TEXT`,
       `SENDING_TEXT`), `Failure` con `title`, `MutationNotice`, `queryClient` sin
       reintentos con `staleTime: 0` y sin refresco al enfocar ni al reconectar, claves
       `['u', userId, …]`, `useSessionUserId`, `isProtectedPath`, `ProtectedRoute` con ruta
       de origen `pathname`, `SessionStatus = 'open' | 'full'`, aviso «Datos de
       demostración» en `AppLayout`, base simulada que responde por `execute`, `playerPath`.
    5. Anotar si la 007 ya creó una copia de las reglas de la 006 en `domain/` o el orden de
       006 RF-2 en el modo simulado (plan, sección 2: se amplían, no se duplican).
  - Hecho cuando: las condiciones 1 a 4 se cumplen y el implementer lo reporta con lo
    encontrado en el paso 5. **Si alguna no se cumple, el implementer para y lo reporta**; no
    marca la tarea ni empieza T1. Si el plan 007 aprobado cambió alguna pieza del paso 4, se
    revisa el plan 009 antes de seguir (R-1).
  - Verificación: lectura de los archivos citados; no se ejecuta ningún comando de escritura.
  - Resultado (2026-10-20): condiciones 1 a 4 cumplidas. Plan 007: «aprobado (2026-10-19) …
    implementado (T1–T31)»; 007 T1–T26 `[x]`; 008 T9 `[x]`; piezas del paso 4 presentes
    (`execute`, `ApiError.hasMessage`, `SessionClearedError`/`isSessionCleared`, textos de
    `copy.ts`, `Failure` con `title`, `MutationNotice`, `queryClient` sin reintentos con
    `staleTime: 0` y sin refresco, claves `['u', userId, …]`, `useSessionUserId`,
    `isProtectedPath`, `ProtectedRoute` con `state.from = pathname`, `SessionStatus`,
    `DemoTag` en `AppLayout`, `mockApi.ts` sobre `execute`, `playerPath`). Paso 5: `domain/`
    no tiene copia de las reglas de sesión de la 006; `mockApi.ts` define `SESSION_ERRORS`
    con los textos de la 006 (sin los de edición) y no hay reglas de sesión en `domain/`.

## Bloque 1 — Reglas puras del dominio (Node primero)

- [x] **T1. Regla del título y edición parcial (`sessionRules.ts`).** RF-16, RF-22, RF-24, RNF-6
  - Objetivo: copiar la interfaz de reglas de la 006 y añadir la única regla del título.
  - Archivos: `frontend/src/domain/sessionRules.ts` (nuevo; si la 007 ya creó una copia de
    las reglas de la 006, se amplía esa y no se duplica);
    `specs/009-detalle-de-sesion/validation.md` (nuevo: esqueleto con fecha, commit, versión
    de Node y las secciones «Condición previa (T0)», «Comprobaciones con Node», «Revisiones
    de código», «Modo simulado» y «Recorrido manual»).
  - Decisiones: D-15, D-24, D-25, D-26.
  - Pruebas primero: script de Node con las filas `isValidSessionTitle` y
    `validateSessionEdit` de la tabla 7.1 → rojo → implementar `SESSION_ERRORS` (literales
    del plan, sección 3), `TITLE_MAX_LENGTH`, `NOTES_MAX_LENGTH`, `trimText`,
    `codePointLength`, `hasForbiddenTitleChar`, `isValidSessionTitle`, `readJsonInteger`,
    `isPlainObject`, `SessionEditFields`, `SessionPatch`, `RuleResult`,
    `validateSessionEdit` → verde.
  - Hecho cuando: las dos filas de 7.1 en verde (incluidos U+0085 en el interior y en el
    extremo, U+2028, U+00A0, U+FEFF, U+200B, 60 y 61 emojis, `{}` → ok `{}`, `{gameId,
    hostId}` → ok `{}`, título y notas inválidos a la vez → título); los textos de
    `SESSION_ERRORS` coinciden carácter a carácter con el plan, sección 3; `validation.md`
    existe con el esqueleto, el resultado de T0 y el script y sus salidas; verificación
    estándar en verde.
  - Verificación: `node <script>` (rojo y verde); `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T2. Límite de escritura en puntos de código (`limitToCodePoints`).** RF-6 (punto 5), RF-24, RNF-6
  - Objetivo: la función pura que hace de `maxLength` contando puntos de código, sin partir
    grafemas (plan 4.7).
  - Archivos: `frontend/src/domain/sessionRules.ts` (mod.: `TextSelection`, `TextEdit`,
    `LimitedText`, `limitToCodePoints`); `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-14, D-25, D-26, D-29.
  - Pruebas primero: script de Node con **todos** los casos de la fila `limitToCodePoints` de
    7.1 (sin pasar del límite, pegar al final, al principio, en medio, sustituyendo una
    selección, notas con 160, emojis en el límite con `🎮`, `🇨🇱` y `👍🏽`, sin hueco, valor
    del servidor de 65 caracteres, inserción no reconocible: selección nula, fuera de rango y
    en medio de un par sustituto), comprobando valor y cursor → rojo → implementar según el
    pseudocódigo de 4.7 (`Intl.Segmenter` con granularidad `grapheme`) → verde.
  - Hecho cuando: todos los casos en verde, incluidos «lo que ya estaba se conserva entero»
    y «un emoji compuesto entra entero o no entra»; script y salidas en `validation.md`;
    verificación estándar en verde.
  - Verificación: `node <script>`; `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T3. Reglas del detalle y del formulario de edición (`sessionDetail.ts`, primera parte).** RF-3, RF-5, RF-6, RF-9, RF-21, RF-22, RNF-6
  - Objetivo: rol, acciones ofrecidas, rango horario, cupos, valores del formulario y
    comprobaciones del cliente como funciones puras.
  - Archivos: `frontend/src/domain/sessionDetail.ts` (nuevo: `DetailRole`, `detailRole`,
    `DetailActions`, `detailActions`, `formatSessionRange`, `occupancy`, `openSlotCount`,
    `startHourOptions`, `slotRange`, `slotOptions`, `adjustSlots`, `EditFormValues`,
    `editFormInitial`, `rebaseEditForm`, `EditCheckError`, `EditCheck`, `checkEditForm`,
    `toEditPayload`); `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-22, D-24, D-25, D-26, D-27.
  - Pruebas primero: script de Node con las filas `detailRole` / `detailActions`,
    `formatSessionRange`, `openSlotCount` / `occupancy`, `slotRange` / `slotOptions`,
    `adjustSlots` / `rebaseEditForm`, `startHourOptions`, `checkEditForm` y `toEditPayload`
    de 7.1 → rojo → implementar según la tabla de reglas del plan, sección 3 → verde.
  - Hecho cuando: todas esas filas en verde («Lunes · 23:00–03:00», `full` con 3/4 visibles
    → join bloqueado y 0 «cupo libre», 05:00 al final tras las 01:00, cada fallo de
    `checkEditForm` con su campo y su texto literal de `SESSION_ERRORS`, incluido
    «No puedes dejar menos cupos que jugadores inscritos.», y el orden de campos);
    `checkEditForm` usa `isValidSessionTitle` de T1 (no repite la regla); script y salidas en
    `validation.md`; verificación estándar en verde.
  - Verificación: `node <script>`; `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T4. Clasificación de respuestas y listas de la agenda (`classifyResponse`, `sessionList.ts`).** RF-10, RF-12, RF-13, RF-14, RF-15, RF-20, RF-21, RNF-6
  - Objetivo: decidir qué hace la vista con cada respuesta, y cómo se actualiza una lista de
    la agenda, con funciones puras.
  - Archivos: `frontend/src/domain/sessionDetail.ts` (mod.: `RequestKind`, `ResponseInfo`,
    `Outcome`, `classifyResponse`); `frontend/src/domain/sessionList.ts` (nuevo:
    `compareSessions`, `upsertSessionInList`, `removeSessionFromList`; si la 007 ya tiene el
    orden de 006 RF-2 en el modo simulado, se reutiliza);
    `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-5, D-25, D-26.
  - Pruebas primero: script de Node con las filas `classifyResponse` (cada celda de la tabla
    del plan, sección 3) y `upsertSessionInList` / `removeSessionFromList` de 7.1 → rojo →
    implementar → verde.
  - Hecho cuando: todas las celdas en verde (load 400/404 → `empty`; load 403/500/0 →
    `pageError`; reread 404 → `empty`; reread 500/0/403 → `keep`; action 404 → `empty`;
    action 400/403/409 con mensaje → `messageAndReread`; action 400 sin mensaje, 500 sin
    mensaje y 0 → `messageOnly`; 401 → `session`); reemplazo en su lugar, inserción ordenada
    en `all` y en su juego, sin cambios en otro filtro y quitar; script y salidas en
    `validation.md`; verificación estándar en verde.
  - Verificación: `node <script>`; `cd frontend && npm run typecheck && npm run lint && npm run build`.

## Bloque 2 — Datos: contrato, backend simulado, rutas y caché

- [x] **T5. Contrato, cliente HTTP y backend simulado de obtener y editar.** RF-16, RF-20
  - Objetivo: `sessions.get` y `sessions.update` en el contrato único, en el cliente HTTP y en
    el backend simulado, con los textos de la 006.
  - Archivos: `frontend/src/services/apiContract.ts` (mod.: `sessions.get`,
    `sessions.update`, `SessionEditFields`, `SessionEditPayload`);
    `frontend/src/services/http/httpApi.ts` (mod.: `GET` y `PUT /sessions/:id`;
    `encodeURIComponent` en `get`, `update`, `join`, `leave` y `cancel`);
    `frontend/src/services/mock/mockSessionTarget.ts` (nuevo, sin imports:
    `MOCK_SESSION_ID_PATTERN`, `resolveMockSessionId`);
    `frontend/src/services/mock/mockApi.ts` (mod.: `get` y `update` nuevas; `join`, `leave`
    y `cancel` con el resolvedor y «Sesión no encontrada.»);
    `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-16, D-17, D-24, D-26.
  - Pruebas primero: dos scripts de Node: (a) `resolveMockSessionId` (fila de 7.1), cargado
    directo; (b) backend simulado (fila `mockApi` de 7.1) con el gancho y los sustitutos de
    `localStorage` e `import.meta.env` de la 008 → rojo → implementar según el plan 4.6
    (orden: cuerpo → autorizar → id → existe → anfitrión → `validateSessionEdit` → cupos bajo
    inscritos → estado recalculado) → verde. Si `mockApi.ts` no carga en Node, parar y
    reportar.
  - Hecho cuando: los dos scripts en verde (`SESSION-3` → 200 `session-3`; `abc` → 400
    «id con formato inválido»; `session-999999` → 404 «Sesión no encontrada.»; edición ajena
    con datos inválidos → 403; inexistente → 404; cupos bajo inscritos → 400; `{}` → 200 sin
    cambios; `{title:'  Ranked  '}` → 200 con título recortado; `join`/`leave`/`cancel`
    inexistentes → 404); `grep` no encuentra «La sesión no existe.»; `httpApi` sigue pasando
    todo por `request` → `execute`; ningún archivo de `backend/` cambió; scripts y salidas en
    `validation.md`; verificación estándar en verde.
  - Verificación: `node <script-a>`, `node <script-b>`;
    `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T6. Ruta, claves de consulta, caché de la agenda y hooks del detalle.** RF-1, RF-7, RF-9, RF-15, RF-17, RF-21
  - Objetivo: las piezas de datos que usa la página, sin interfaz todavía.
  - Archivos: `frontend/src/app/routes.ts` (mod.: `ROUTES.sessionDetail`, `sessionPath`,
    `isProtectedPath` reconoce `/agenda/`); `frontend/src/app/providers/queryKeys.ts` (mod.:
    `sessionDetail(userId, visit, rawId)`, `sessionLists(userId)`);
    `frontend/src/features/sessions/agendaCache.ts` (nuevo: `applySessionToAgenda`,
    `removeSessionFromAgenda`, `markAgendaStale`);
    `frontend/src/features/sessions/hooks.ts` (mod.: `useSessionDetail(rawId, visit)` con
    `staleTime: Infinity`, `refetchOnMount: false`, sin refresco al enfocar ni al reconectar;
    `useUpdateSession`, `useJoinSession`, `useLeaveSession`, `useCancelSession` con el efecto
    en la agenda en el `onSuccess` del propio `useMutation`; `rereadSession(rawId)`).
  - Decisiones: D-1, D-2, D-3, D-4, D-5, D-18.
  - Pruebas primero: script de Node para `sessionPath` e `isProtectedPath` (`/agenda/session-3`
    y `/agenda/a%2Fb` protegidas; `sessionPath('a/b')` → `/agenda/a%2Fb`) → rojo → implementar
    → verde. Si `routes.ts` no carga en Node con el gancho, se sustituye por revisión de
    código y se anota.
  - Hecho cuando: el script en verde (o la revisión anotada); revisión de código: la clave
    del detalle no se siembra con `initialData` de la agenda; `applySessionToAgenda` y
    `removeSessionFromAgenda` usan `setQueriesData` con las funciones de `sessionList.ts` y
    después `invalidateQueries` sobre `['u', userId, 'sessions']`; los efectos de caché
    están en el `onSuccess` del hook, no en callbacks de `mutate`; verificación estándar en
    verde.
  - Verificación: `node <script>`; `cd frontend && npm run typecheck && npm run lint && npm run build`.

## Bloque 3 — Componentes compartidos

- [x] **T7. Límite de escritura en los campos y título del formulario de creación.** RF-6 (punto 5), RF-24
  - Objetivo: unir `limitToCodePoints` con el DOM y aplicarlo a «Anotar una sesión».
  - Archivos: `frontend/src/shared/hooks/useCodePointLimit.ts` (nuevo);
    `frontend/src/shared/components/TextField.tsx` (mod.: `forwardRef` al `input`, prop
    opcional `maxCodePoints` con `onValueChange`);
    `frontend/src/features/sessions/components/SessionDraftSlip.tsx` (mod.:
    `isValidSessionTitle` + `SESSION_ERRORS.title` en lugar de la comprobación del título
    vacío y su texto propio; sin `maxLength`; `TextField maxCodePoints={60}` y
    `useCodePointLimit` con 160 en «Notas»).
  - Decisiones: D-14, D-15, D-23, D-29, D-30.
  - Pruebas primero: la regla ya está probada en T2. Antes de cambiar el formulario, anotar
    en `validation.md` el comportamiento actual de «Anotar una sesión» (60 emojis no caben;
    título vacío con su texto propio) como referencia en rojo.
  - Hecho cuando: en modo simulado, en «Anotar una sesión»: caben 60 emojis en «Título» y no
    entra el 61.º; caben 160 en «Notas»; pegar 70 letras al principio, en medio y al final de
    un título ya escrito conserva el texto previo entero, recorta solo lo pegado y deja el
    cursor al final de lo pegado; `🇨🇱` y `👍🏽` en el carácter 60 no entran (ni a medias);
    `ab`, `  ab  `, vacío, solo espacios, un tabulador o U+2028 en el interior muestran «El
    título debe tener entre 3 y 60 caracteres.» y no envían nada; deshacer (Ctrl+Z) sigue
    funcionando; el resto del formulario (campos, valores por defecto, botones y foco) no
    cambia (R10); revisión: `useCodePointLimit` escucha el `beforeinput` **nativo**
    (`addEventListener`), no usa `onBeforeInput` de React ni cancela el evento, aplica la
    regla en `onChange` y en `compositionend`, y no contiene reglas propias; `TextField` sin
    `maxCodePoints` se ve y se comporta como hoy; resultados en `validation.md`;
    verificación estándar en verde.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    recorrido en modo simulado.

- [x] **T8. Ventana, estados y foco visible compartidos; ventana de confirmación de cancelar.** RF-12, RF-13, RF-19, RF-23, RNF-1, RNF-2
  - Objetivo: las opciones nuevas de `Slip` y `States`, el estilo de foco por programa y de
    botón bloqueado, y la `CancelSessionDialog` única.
  - Archivos: `frontend/src/shared/components/Slip.tsx` (mod.: `initialFocusRef`,
    `titleRef`, `trapFocus`, `closeLocked`, todas opcionales y apagadas por defecto);
    `frontend/src/shared/components/States.tsx` (mod.: `Blank` con `headingRef` y nivel de
    encabezado; `Failure` con `headingRef`, el mensaje como título y `retryBusy`); la hoja
    global existente de `frontend/src/styles/` (mod.: `[tabindex="-1"]:focus` y
    `.btn[aria-disabled="true"]`, si la 007/008 no los añadieron; solo tokens);
    `frontend/src/features/sessions/components/CancelSessionDialog.tsx` (nuevo);
    `frontend/src/shared/utils/copy.ts` (mod.: «Cancelar sesión», «¿Cancelar esta sesión?»,
    «Se borrará para todos los participantes y no se puede deshacer.», «Sí, cancelar
    sesión», «Volver»).
  - Decisiones: D-6, D-7, D-8, D-10, D-12, D-13.
  - Pruebas primero: antes de cambiar `Slip`, anotar en `validation.md` el foco actual de
    «Anotar una sesión» (dónde empieza, Tab, Escape) como referencia de R10.
  - Hecho cuando: `CancelSessionDialog` (aún sin montar en ninguna vista) recibe por props
    abrir, cerrar, confirmar, en curso y mensaje; con foco inicial en «Volver», título con
    `tabIndex={-1}`, retención de Tab y Mayús+Tab en círculo por sus botones (incluidos los
    bloqueados, no los `disabled`), «Sí, cancelar sesión» con `disabled` y «Enviando…» en
    curso, «Volver» y cerrar con `aria-disabled` y sin efecto en curso, Escape y fondo sin
    efecto en curso, y mensaje con `role="alert"`; «Anotar una sesión» conserva el foco de
    la referencia anotada (R10); `Blank` y `Failure` sin las props nuevas se ven igual que
    hoy; `grep` sin colores escritos a mano en los archivos tocados; verificación estándar
    en verde.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    «Anotar una sesión» en modo simulado.

- [x] **T9. Regla del foco (`focusRule.ts`).** RNF-2, RF-11, RF-19, RF-21, RF-23
  - Objetivo: la regla general del foco de RNF-2 como tabla pura.
  - Archivos: `frontend/src/features/sessions/detail/focusRule.ts` (nuevo, sin React:
    `resolveFocus(event, context): FocusTarget`); `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-9, D-11, D-25, D-26.
  - Pruebas primero: script de Node con la fila `resolveFocus` de 7.1 (casos 1 a 14 de RNF-2 y
    la excepción de R16 sin destino), según la tabla del plan 4.3 → rojo → implementar → verde.
  - Hecho cuando: los 14 casos y la excepción en verde (p. ej. caso 1: «Unirme» → «Sin
    cupos» se queda en el botón; caso 2: «Unirme» → «Salir» va a `zoneMessage`; caso 7 con
    `titleEnter` → `titleField`; caso 14 → `dialogTitle` y después `dialogConfirm`); script
    y salidas en `validation.md`; verificación estándar en verde.
  - Verificación: `node <script>`; `cd frontend && npm run typecheck && npm run lint && npm run build`.

## Bloque 4 — Página de detalle

- [x] **T10. Página de detalle de solo lectura: carga, estado vacío, error y datos.** RF-1, RF-3, RF-4, RF-11, RF-12, RF-13, RF-15, RF-16, RF-17, RF-18, RF-20, RNF-1, RNF-2, RNF-3, RNF-5
  - Objetivo: abrir `/agenda/:sessionId` y ver la sesión de juego, el estado vacío o el error,
    con el foco de RNF-2, punto c.
  - Archivos: `frontend/src/features/sessions/pages/SessionDetailPage.tsx` (nuevo:
    `SessionDetailRoute` con `key={location.key}` y la página);
    `frontend/src/features/sessions/pages/sessionDetail.css` (nuevo, solo tokens);
    `frontend/src/features/sessions/components/SessionDetailFacts.tsx` (nuevo);
    `frontend/src/features/sessions/detail/useDetailController.ts` (nuevo: visita,
    `mountedRef`, `emptied`, `focusRequest` aplicado en un `useLayoutEffect`; las acciones
    llegan en T11 a T14); `frontend/src/app/router.tsx` (mod.: ruta diferida dentro de
    `ProtectedRoute` + `AppLayout`); `frontend/src/shared/utils/copy.ts` (mod.: «Esta sesión
    no existe», «Puede que se haya cancelado.», «Ir a la agenda», «La organizas», «Estás
    dentro», «organiza», «cupo libre», «Cupos llenos», «<n>/<t> jugadores»).
  - Decisiones: D-1, D-2, D-3, D-8, D-10, D-20, D-21.
  - Pruebas primero: las reglas que usa la página ya están en verde (T3, T4, T9). Antes de
    implementar, comprobar en modo simulado que `/agenda/session-3` hoy lleva a «no
    encontrada» (rojo) y anotarlo.
  - Hecho cuando, en modo simulado con la cuenta demo:
    - sin sesión, `/agenda/session-3` lleva a login y, al entrar, vuelve al detalle (RF-1);
    - `/agenda/session-3` y `/agenda/SESSION-3` muestran «Cargando…» y luego juego, título
      (`h1` con el foco), notas solo si hay, rango con `formatSessionRange`,
      «<n>/<t> jugadores», «Cupos llenos» si es `full`, «La organizas» / «Estás dentro» sin
      `announce`, participantes con `Monogram` y enlace a `playerPath(id, gameId)`,
      «organiza» y los «cupo libre» de `openSlotCount`; cualquier rol lo ve (RF-18);
    - `/agenda/abc` y `/agenda/session-999999` muestran «Esta sesión no existe» con el foco
      en el título y «Ir a la agenda» como siguiente Tab;
    - con la petición bloqueada en la pestaña de red, el error con el foco en el mensaje y
      «Reintentar» (sin «Cargando…», `aria-disabled` en curso, conserva el foco; doble
      pulsación = una petición);
    - «Atrás» y «Adelante» vuelven a pedir y a mostrar la carga; enfocar la ventana no pide
      nada; con `npm run build && npm run preview` se ve una sola petición por apertura (R-6);
    - el aviso «Datos de demostración» aparece en la barra y el pie, sin aviso propio;
    - un título `<b>x</b>` se ve literal; a 360 px sin desplazamiento horizontal con un
      título de 60 caracteres sin espacios y notas de 160; contraste de «cupo libre» y
      «organiza» medido con el selector de color en los dos temas y, si no llega a 4,5:1,
      `--ink-2` en el detalle (plan 5.7, R-4);
    - al abrir el detalle, la agenda queda actualizada con esa sesión (R17) y, tras el
      estado vacío, la agenda vuelve a pedir al verse (R8);
    - verificación estándar en verde y resultados en `validation.md`.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    `npm run preview` para la petición única; recorrido en modo simulado.

- [x] **T11. Zona de acciones: sumarse y salir, mensajes y nueva lectura.** RF-9, RF-10, RF-11, RF-12, RF-14, RF-15, RF-20, RF-21, RNF-2
  - Objetivo: «Unirme», «Salir» y «Sin cupos» con la máquina de estados de 4.2 (`run` y
    `reread`) y el foco de RNF-2.
  - Archivos: `frontend/src/features/sessions/components/SessionActionsZone.tsx` (nuevo:
    botón de sumarse con `key="join"`, «Salir» con `key="leave"`, mensaje de la zona con
    `role="alert"` y `tabIndex={-1}`);
    `frontend/src/features/sessions/detail/useDetailController.ts` (mod.: `inFlight`,
    `rereading`, `zoneMessage`, `run`, `reread`, comprobación de visita);
    `frontend/src/features/sessions/pages/SessionDetailPage.tsx` (mod.);
    `frontend/src/shared/utils/copy.ts` (mod.: «Unirme», «Salir», «Sin cupos»).
  - Decisiones: D-4, D-6, D-7, D-9, D-18, D-20.
  - Pruebas primero: `classifyResponse` y `resolveFocus` ya en verde (T4, T9). Antes de
    implementar, anotar los casos de RNF-2 que cubre la tarea (1, 2, 5, 8, 9) como lista de
    comprobación pendiente en `validation.md`.
  - Hecho cuando, en modo simulado:
    - no inscrito: «Unirme» → «Enviando…» con `disabled` → 200 → «Salir» con el foco y sin
      otro anuncio; «Salir» → «Unirme» con el foco (caso 8);
    - sesión `full` sin inscribirse: «Sin cupos» con `aria-disabled`, recibe el foco con Tab,
      no envía nada;
    - un 409 (p. ej. «No estás inscrito en esta sesión.» provocado desde otra pestaña tras
      recargar) muestra el mensaje literal en la zona, vuelve a pedir la sesión sin «Cargando…»
      y el foco sigue los casos 1 y 2;
    - un error sin mensaje o el plazo de 30 s (latencia de 40 s) muestra el Texto de error sin
      mensaje, sin nueva lectura, y el foco vuelve al botón (caso 5);
    - un 404 de la acción muestra el estado vacío con el foco en su título (caso 9);
    - una respuesta que llega tras «Atrás» actualiza la agenda y no mueve el foco ni muestra
      mensajes (R16);
    - un doble clic envía una sola petición;
    - verificación estándar en verde y resultados en `validation.md`.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    recorrido en modo simulado.

- [x] **T12. Edición en el detalle: formulario, guardar y descartar.** RF-5, RF-6, RF-7, RF-10, RF-11, RF-12, RF-14, RF-21, RF-22, RNF-2
  - Objetivo: «Editar sesión» y el formulario en la página, con las comprobaciones del
    cliente, el rebase de cupos y la regla defensiva de rol.
  - Archivos: `frontend/src/features/sessions/components/SessionEditForm.tsx` (nuevo:
    «Título» con `TextField` con ref y `maxCodePoints={60}`, «Juego» solo texto, «Día»,
    «Hora de inicio» con `startHourOptions`, «Duración (horas)», «Cupos» con
    `slotOptions(slotRange(...))`, «Notas (opcional)» con `useCodePointLimit` y 160, error
    arriba con `role="alert"`, «Descartar» y «Guardar cambios» `type="submit"`);
    `frontend/src/features/sessions/components/SessionActionsZone.tsx` (mod.: «Editar
    sesión» para el anfitrión, oculto con el formulario abierto; «Cambios guardados.» con
    `role="status"`); `frontend/src/features/sessions/detail/useDetailController.ts` (mod.:
    `form`, `formMessage`, `savedNotice`, `openForm`, `discard`, `submitForm`, rebase y
    regla defensiva en `reread`); `frontend/src/features/sessions/pages/SessionDetailPage.tsx`
    (mod.); `frontend/src/shared/utils/copy.ts` (mod.: «Editar sesión», «Guardar cambios»,
    «Descartar», «Cambios guardados.»).
  - Decisiones: D-6, D-7, D-16, D-20, D-23, D-27, D-29.
  - Pruebas primero: `checkEditForm`, `rebaseEditForm` y `toEditPayload` ya en verde (T3).
    Antes de implementar, anotar los casos de RNF-2 que cubre la tarea (3, 4, 7, 9 y Q1) como
    lista pendiente en `validation.md`.
  - Hecho cuando, en modo simulado con la cuenta demo como anfitriona:
    - «Editar sesión» abre el formulario relleno con los valores guardados (título sin
      recortar) y el foco en «Título»; «Descartar» lo cierra y el foco vuelve a «Editar
      sesión»;
    - guardar sin cambios envía los seis campos (pestaña de red o revisión del mock); con 200
      cierra, muestra la sesión devuelta sin nueva lectura, «Cambios guardados.» se anuncia y
      el foco va a «Editar sesión»; reabrir el formulario lo oculta;
    - `ab` con «Guardar cambios» o con Intro en «Título» muestra «El título debe tener entre 3
      y 60 caracteres.», no envía nada y el foco se queda en el origen (caso 7);
    - un 400 de cupos bajo inscritos (provocado en otra pestaña tras recargar) muestra el
      mensaje en el formulario, relee sin «Cargando…», conserva lo escrito, sube los cupos al
      nuevo mínimo y el foco vuelve al origen (caso 3);
    - «Guardar cambios» en curso: «Enviando…» con `disabled`, «Descartar», «Editar sesión» y
      «Cancelar sesión» bloqueados con `aria-disabled`; en la nueva lectura «Descartar»
      funciona;
    - 05:00 (sesión creada en el mock con esa hora) aparece al final de «Hora de inicio» y se
      conserva al guardar;
    - revisión: la rama defensiva (rol deja de ser anfitrión → se cierra el formulario y el
      mensaje pasa a la zona, caso 4) existe; `SessionEditForm` no repite ninguna regla de
      `checkEditForm`;
    - verificación estándar en verde y resultados en `validation.md`.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    recorrido en modo simulado.

## Bloque 5 — Agenda y cancelar

- [x] **T13. Agenda: «Ver detalle», rango compartido, 360 px y cancelar con confirmación.** RF-2, RF-3, RF-8, RF-15, RF-19, RF-23, RNF-1, RNF-2, RNF-5
  - Objetivo: los cambios de la agenda que pide la spec, y nada más (R2, R7, R-9).
  - Archivos: `frontend/src/features/sessions/components/SessionSlip.tsx` (mod.: `Link`
    «Ver detalle» a `sessionPath` con `aria-label="Ver detalle de <título>"`, rango con
    `formatSessionRange`, `cancelButtonRef` opcional);
    `frontend/src/features/sessions/components/sessionSlip.css` (mod.: `min-width: 0` y
    `overflow-wrap: anywhere`); `frontend/src/features/sessions/pages/SchedulePage.tsx`
    (mod.: «Cancelar sesión» abre `CancelSessionDialog`; 204, 404 y cierre según 4.2;
    `h2` del panel con `tabIndex={-1}` y ref; consumo único de
    `location.state.focus === 'panelTitle'` sin borrar `proposal`);
    `frontend/src/shared/utils/copy.ts` (mod.: «Ver detalle», «Ver detalle de <título>»).
  - Decisiones: D-6, D-7, D-13, D-19, D-22.
  - Pruebas primero: **antes de cambiar nada**, capturar la tarjeta de la agenda a 1280 y a
    360 px en «Sesión abierta» y «Mis sesiones» y anotar en `validation.md` el rango que
    muestra hoy (referencia de R-9 y de «misma salida» de `formatSessionRange`).
  - Hecho cuando, en modo simulado:
    - cada tarjeta, en los dos paneles, tiene «Ver detalle» con nombre accesible «Ver detalle
      de <título>»; abrirlo añade una entrada al historial y «Atrás» vuelve a la agenda en
      «Mis sesiones» y «Todos los juegos»;
    - la tarjeta se ve igual que en la captura salvo «Ver detalle» y el corte de líneas
      largas; el rango sale idéntico;
    - «Cancelar sesión» de una tarjeta abre la ventana con el foco en «Volver»; «Volver»,
      Escape, cerrar y fondo no envían nada y devuelven el foco al botón; confirmar → 204,
      la tarjeta desaparece y el foco va al título del panel (caso 6); un 404 deja la ventana
      abierta con el mensaje, la agenda vuelve a pedir y al cerrar el foco va al título del
      panel; en curso, el foco va al título de la ventana y Tab no sale de ella (caso 14);
    - navegar a `/agenda` con `state: { focus: 'panelTitle' }` lleva el foco a «Mis
      sesiones» una sola vez (recargar no lo repite) y no borra `proposal` (007 RF-30);
    - a 360 px sin desplazamiento horizontal con una tarjeta de título de 60 caracteres sin
      espacios, en los dos paneles;
    - lo demás de la agenda (sello «Estás dentro» con `announce`, «Sin cupos» con
      `disabled`, filtros) no cambia;
    - verificación estándar en verde y resultados en `validation.md`.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    recorrido en modo simulado.

- [x] **T14. Cancelar desde el detalle y redirección con reemplazo.** RF-5, RF-8, RF-10, RF-11, RF-12, RF-14, RF-21, RF-23, RNF-2
  - Objetivo: «Cancelar sesión» del anfitrión en el detalle con la misma ventana, y la vuelta
    a la agenda sustituyendo la entrada del historial.
  - Archivos: `frontend/src/features/sessions/components/SessionActionsZone.tsx` (mod.:
    «Cancelar sesión» con `btn--danger`);
    `frontend/src/features/sessions/detail/useDetailController.ts` (mod.: `dialogOpen`,
    `dialogMessage`, `openDialog`, `closeDialog`, rama `cancel` de `run` y de `reread`);
    `frontend/src/features/sessions/pages/SessionDetailPage.tsx` (mod.: monta
    `CancelSessionDialog`).
  - Decisiones: D-6, D-7, D-13, D-19.
  - Pruebas primero: anotar en `validation.md` los casos que cubre la tarea (13, 14, 9 y
    cierre de la ventana, punto a) como lista pendiente.
  - Hecho cuando, en modo simulado:
    - «Cancelar sesión» abre la ventana sobre el formulario abierto, que conserva lo escrito
      detrás; abrirla no oculta «Cambios guardados.» y confirmar sí;
    - confirmar → 204 → la agenda con «Mis sesiones», el foco en su título y «Atrás» va a la
      página anterior al detalle, no al detalle cancelado (caso 13);
    - en curso: «Sí, cancelar sesión» con «Enviando…» y `disabled`, foco en el título de la
      ventana, Tab y Mayús+Tab recorren «Volver» y cerrar bloqueados sin salir, Escape y
      fondo sin efecto (caso 14);
    - un error con mensaje deja la ventana abierta con el mensaje, relee y el foco vuelve a
      «Sí, cancelar sesión»; en la nueva lectura la ventana se puede cerrar;
    - un 404 (sesión cancelada en otra pestaña antes de recargar el mock) cierra todo y
      muestra el estado vacío con el foco en su título (caso 9);
    - cerrar la ventana devuelve el foco a «Cancelar sesión»;
    - verificación estándar en verde y resultados en `validation.md`.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`;
    recorrido en modo simulado.

## Cierre y validación

- [x] **T15. Revisiones de código.** RF-14, RF-16, RF-21, RF-22, RF-24, RNF-1, RNF-3, RNF-6
  - Objetivo: las revisiones del plan, sección 7, punto 4, anotadas en el registro.
  - Archivos: solo `specs/009-detalle-de-sesion/validation.md`.
  - Decisiones: D-15, D-24, D-26, D-27.
  - Pasos:
    1. `grep` de `isValidSessionTitle`: una sola definición, usada por `checkEditForm`,
       `SessionDraftSlip` y `validateSessionEdit`; ninguna regla de RNF-6 repetida en
       componentes.
    2. `grep` de `#[0-9a-fA-F]{3,8}`, `rgb(` y `hsl(` en los archivos nuevos y modificados;
       de `fetch(` fuera de `httpClient`; de `dangerouslySetInnerHTML` e `innerHTML`; de
       `: any`, `as any`, `@ts-ignore` y `.only`.
    3. Backend simulado frente a 006 RF-6, RF-7, RF-8, RF-10, RF-15, RF-19, RF-20 y RF-26:
       orden de comprobaciones y textos literales.
    4. Rama defensiva de RF-14 / RF-21 (rol que deja de ser anfitrión) y nueva lectura fallida
       (`keep`: el detalle sigue igual, sin el error de RF-13).
    5. `git status`: ningún archivo de `backend/` cambió en la 009.
  - Hecho cuando: cada revisión tiene comando, resultado y conclusión en `validation.md` y no
    queda ningún hallazgo abierto (si lo hay, se anota como defecto y se para).
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T16. Recorrido manual de los Criterios de finalización.** RF-1 a RF-24, RNF-1 a RNF-6
  - Precondición: implementadas la 006 (servidor con obtener y editar por id), la 007 (al
    menos RF-7, RF-10 y RF-24) y la 008 (al menos RF-9, RF-15 y RF-20); MongoDB local y
    `backend/.env`. Si no se cumple, se hace solo la parte en modo simulado, se anota y la
    tarea **no** se marca.
  - Objetivo: ejecutar y registrar, con fecha y resultado por paso, los Criterios de
    finalización de la spec (plan, sección 7, punto 5).
  - Archivos: solo `specs/009-detalle-de-sesion/validation.md`.
  - Pasos (cada bloque con fecha y resultado):
    1. **Recorrido** pasos 1 a 9, agenda, estados, bloqueos y formulario, cupos con datos
       viejos, regla del título (60 y 160 emojis, pegar al principio, en medio y al final
       pasando del límite con el texto previo intacto y el cursor al final de lo pegado,
       emojis compuestos en el límite, tabulador, U+2028, U+0085, U+00A0, `ab`, `  ab  `,
       vacío en creación, propuesta con tabulador en el nombre visible) y hora fuera del
       horario (05:00 creada contra la API), con A, B y C (C sin cuenta de LoL) y la pestaña
       de red («3G lenta», 40 s, bloqueo de la URL de obtener la sesión).
    2. **Solo teclado y NVDA en Chrome**: los 14 casos de RNF-2, «Sin cupos» y botones
       bloqueados anunciados como no disponibles, retención de la ventana, foco visible en
       los elementos no interactivos. Si se observa doble lectura de un mensaje con
       `role="alert"` que recibe el foco, se anota y se plantea a la usuaria (R-5); no se
       cambia en esta tarea.
    3. **360 px**: detalle con 60 caracteres sin espacios y 160 de notas, con el formulario y
       con la ventana abiertos, y la agenda en los dos paneles (`scrollWidth <= innerWidth`).
    4. **Contraste** en tema claro y oscuro: Lighthouse y selector de color para los estados
       que no ve (≥ 4,5:1; 3:1 en texto grande).
    5. **Modo simulado frente a servidor real**: el mismo recorrido básico con
       `VITE_USE_MOCK_API=true` (cuenta demo, `SESSION-3`, `abc`, `session-999999`,
       `SESSION-999999`, sin peticiones al servidor) y con el servidor real; mismos códigos y
       textos.
    6. «Una sola petición» con `npm run build && npm run preview` (R-6).
  - Hecho cuando: cada criterio de finalización tiene evidencia y resultado en
    `validation.md`; cualquier fallo queda abierto como defecto o como cambio de spec (no se
    corrige dentro de esta tarea).
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`.

- [x] **T17. Entrega a la validación del reviewer.** (sin RF nuevos; Criterios de finalización)
  - Objetivo: recordar que la validación del reviewer **espera** a que estén implementadas la
    006, la 007 y la 008 en lo que esta spec usa (spec, Contexto, A9; plan, sección 0 y 7,
    punto 6).
  - Archivos: ninguno de código; solo `specs/009-detalle-de-sesion/validation.md` (una línea
    con el estado de 006, 007 y 008 en la fecha de entrega).
  - Pasos: comprobar que la 006 tiene `GET` y `PUT /api/sessions/:id`, que la 007 tiene RF-7,
    RF-10 y RF-24 y que la 008 tiene RF-9, RF-15 y RF-20 implementados; que T0 a T16 están
    marcadas; avisar al coordinador para que actualice `MEMORY.md` al cerrar la fase (el
    planner y el implementer de la 009 no escriben fuera de lo que indica cada tarea).
  - Hecho cuando: `validation.md` registra que las tres dependencias están implementadas y
    T16 completa; si falta alguna, la tarea queda sin marcar y la validación del reviewer no
    empieza.
  - Verificación: `cd frontend && npm run typecheck && npm run lint && npm run build`.

## Trazabilidad tarea → RF / RNF
Cada RF y RNF está cubierto por al menos una tarea de implementación y por T16 (recorrido).

| Requisito | Tareas |
| --- | --- |
| RF-1 | T6, T10, T16 |
| RF-2 | T13, T16 |
| RF-3 | T3, T10, T13, T16 |
| RF-4 | T10, T16 |
| RF-5 | T3, T12, T14, T16 |
| RF-6 | T2, T3, T7, T12, T16 |
| RF-7 | T6, T12, T16 |
| RF-8 | T13, T14, T16 |
| RF-9 | T3, T6, T11, T16 |
| RF-10 | T4, T11, T12, T14, T16 |
| RF-11 | T9, T10, T11, T12, T14, T16 |
| RF-12 | T4, T8, T10, T11, T12, T14, T16 |
| RF-13 | T4, T8, T10, T16 |
| RF-14 | T4, T11, T12, T14, T15, T16 |
| RF-15 | T4, T6, T10, T11, T13, T16 |
| RF-16 | T1, T5, T10, T15, T16 |
| RF-17 | T6, T10, T16 |
| RF-18 | T10, T16 |
| RF-19 | T8, T9, T13, T16 |
| RF-20 | T4, T5, T10, T11, T16 |
| RF-21 | T3, T4, T6, T9, T11, T12, T14, T15, T16 |
| RF-22 | T1, T3, T12, T15, T16 |
| RF-23 | T8, T9, T13, T14, T16 |
| RF-24 | T1, T2, T7, T15, T16 |
| RNF-1 | T8, T10, T13, T15, T16 |
| RNF-2 | T8, T9, T10, T11, T12, T13, T14, T16 |
| RNF-3 | T10, T15, T16 |
| RNF-4 | todas (verificación estándar); D-26 en T1 a T6 y T9 |
| RNF-5 | T10, T13, T16 |
| RNF-6 | T1, T2, T3, T4, T15 |

## Trazabilidad tarea → decisiones del plan

| Decisión | Tareas |
| --- | --- |
| D-1 Ruta `/agenda/:sessionId` y `sessionPath` | T6, T10 |
| D-2 `key={location.key}` y clave por visita | T6, T10 |
| D-3 Sin `initialData` desde la agenda | T6, T10 |
| D-4 Nueva lectura manual | T6, T11 |
| D-5 `setQueriesData` + `invalidateQueries` | T4, T6 |
| D-6 Botón en curso con `disabled` y «Enviando…» | T8, T11, T12, T13, T14 |
| D-7 Botones bloqueados con `aria-disabled` | T8, T11, T12, T13, T14 |
| D-8 «Reintentar» en curso con `aria-disabled` | T8, T10 |
| D-9 `key="join"` / `key="leave"` | T9, T11 |
| D-10 `focusRequest` + `useLayoutEffect` y estilo de `:focus` | T8, T10 |
| D-11 `resolveFocus` puro en `features/sessions/detail/` | T9 |
| D-12 Opciones opcionales de `Slip` | T8 |
| D-13 `CancelSessionDialog` única | T8, T13, T14 |
| D-14 Sin `maxLength`, con `limitToCodePoints` | T2, T7 |
| D-15 Copia de reglas de 006 y una sola regla del título | T1, T7, T15 |
| D-16 `sessions.update` con `Partial<SessionEditFields>` | T5, T12 |
| D-17 `resolveMockSessionId` en archivo sin imports | T5 |
| D-18 Efecto en la agenda en el `onSuccess` del `useMutation` | T6, T11 |
| D-19 Redirección con `replace` y `state.focus` | T13, T14 |
| D-20 `role="alert"`, `role="status"` y sello sin `announce` | T10, T11, T12 |
| D-21 `SessionDetailFacts` propio | T10 |
| D-22 `formatSessionRange` en el dominio | T3, T13 |
| D-23 `TextField` con `forwardRef` | T7, T12 |
| D-24 Prevalece la spec 006 | T1, T3, T5, T15 |
| D-25 Sin `hoy` ni `now` | T1, T2, T3, T4, T9 |
| D-26 Scripts de Node sin versionar | T1, T2, T3, T4, T5, T6, T9, T15 |
| D-27 Textos de `SESSION_ERRORS` en `checkEditForm` | T3, T12, T15 |
| D-28 Condición previa de orden | T0 |
| D-29 Solo entra lo insertado que cabe, en grafemas completos | T2, T7, T12 |
| D-30 Selección leída en el `beforeinput` nativo | T7 |

## Decisiones registradas

1. **Número de tareas (skill `sdd`: «si salen más de 10, propón dividir la spec»).** Salen
   18 (T0 a T17). Decisión de la usuaria: **«Mantener 18 tareas (Recomendado)»**. Motivo: la
   spec y el plan ya están aprobados; el detalle, la edición y la ventana comparten la misma
   lógica (`useDetailController`) y no se separan bien; es el mismo criterio que la 007, R20.
