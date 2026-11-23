# Tareas 016 — Estado global de la sesión iniciada y de la agenda
Estado: implementado y validado (2026-11-22; T1–T10 hechas; validado por el `reviewer` RF por RF; APROBADO; 105 pruebas en verde; RF-21, RF-22, RNF-6, T4, T6 y T7 declarados por el usuario; T8, T9 y T9b recorridos automatizados no reproducidos por el `reviewer`, ver `validation.md`). Aprobado (2026-11-21, usuario), junto con `plan.md`. Preguntas P1 a P3 del plan decididas
por el usuario el 2026-11-21 (plan §12): P1 retener el error, P2 se acepta `visit`, P3 se corrige
la referencia a `HITO2.md` en T10.

Reglas para todas las tareas:
- Una tarea cada vez, en este orden. Cada tarea cita sus RF/RNF y sigue `plan.md`.
- Con pruebas: primero las pruebas y el módulo con las firmas que lanzan `Tn: sin implementar`;
  `npm test` en **rojo por la razón correcta**; después el código; `npm test` en **verde**. Las dos
  salidas, con el motivo del rojo, van a `specs/016-estado-global/validation.md` (plan §8).
- «Verde en el frontend» = en `frontend/`, `npm test`, `npm run typecheck`, `npm run lint` y
  `npm run build` sin errores; sin `.only`, `any` ni `@ts-ignore` nuevos; `git status --short
  backend/` vacío (backend intacto).
- Marcas: **[usuario]** = solo puede hacerla el usuario. Sin marca = `implementer` (los recorridos
  de T8 los puede hacer el `implementer` o el `reviewer` con un navegador real).

- [x] **T1. Dependencias y Vitest.** RNF-1, RNF-5
  - Comprobar antes de instalar: `npm view zustand@5.0.16 version` y `npm view vitest@3.2.4
    dependencies.vite` (debe admitir `^5.0.0`). Si alguna versión no existe o no resuelve con
    Vite 5.4, parar y preguntar al usuario (no elegir otra versión a ciegas).
  - `npm install --save-exact zustand@5.0.16`; `npm install --save-exact --save-dev vitest@3.2.4`.
  - `vitest.config.ts` (alias `@`, `environment: 'node'`, `include: ['src/**/*.test.ts']`,
    `allowOnly: false`, `restoreMocks: true`); `tsconfig.node.json` incluye `vitest.config.ts`;
    script `"test": "vitest run"`; regla `no-restricted-properties` contra `describe.only`,
    `it.only` y `test.only` en `eslint.config.js`.
  - Crear `specs/016-estado-global/validation.md` con su índice (T1 a T10) y el formato del plan §8.
  - Hecho cuando: `package.json` tiene `"zustand": "5.0.16"` y `"vitest": "3.2.4"` sin `^`;
    `npm ls vite` muestra un único `vite@5.4.21` y la instalación no avisó de dependencias
    incompatibles; `npm test -- --passWithNoTests` termina con código 0; un `it.only` de prueba
    hace fallar `npm run lint` (se retira); `npm run typecheck`, `npm run lint` y `npm run build` en
    verde; salida anotada en `validation.md`.

- [x] **T2. Reglas puras de la agenda.** RF-13, RF-29, RNF-4, RNF-5
  - `src/domain/agendaRules.ts` (`draftGame`, `proposalDecision` y sus tipos) y
    `src/domain/agendaRules.test.ts` con los casos del plan §8 (RF-29: seis casos, prioridad y
    CR-1; RF-13: los siete casos).
  - Hecho cuando: el rojo (por `T2: sin implementar` o por aserción) y el verde están en
    `validation.md`; `agendaRules.ts` no importa React, Zustand, `services/` ni usa reloj; verde
    en el frontend.

- [x] **T3. Almacén de la sesión iniciada (fábrica y pruebas).** RF-1 a RF-8, RF-16, RNF-5
  - `src/features/auth/createAuthStore.ts` según el plan §3 (estado, `AuthDeps`, `RouterAccess`,
    acciones con nombre) y `createAuthStore.test.ts` con los casos del plan §8. Todavía no se
    conecta a la aplicación.
  - Hecho cuando: el rojo y el verde están en `validation.md`; las pruebas cubren todos los puntos
    del almacén de la sesión de RNF-5 (lista del plan §8, marcada uno por uno en `validation.md`);
    `createAuthStore.ts` no importa `@/services/api` (si `@/app/routes` no carga en Node, aplicar
    R2 del plan); verde en el frontend.

- [x] **T4. Migración de `AuthProvider` al almacén.** RF-1, RF-2, RF-6, RF-7, RF-9, RF-21, RF-22, RNF-6
  - Estado: código y verde hechos (2026-11-22); comprobación manual con el servidor real hecha por el usuario el 2026-11-22 («todo pasó», declarado por el usuario; ver `validation.md`).
  - `authStore.ts` (instancia real, `devtools` «TeamMatchUp · sesión iniciada» con `enabled:
    import.meta.env.DEV`, `resetAgenda` provisional sin efecto hasta T6), `useAuth.ts` (fachada con
    `useShallow`), `useSessionUserId.ts` (selector), `app/StoreBridge.tsx` (efectos 1 y 2 del plan
    §2; el 3 llega en T6), `AppProviders.tsx` sin `AuthProvider`; borrar `AuthProvider.tsx` y
    `AuthContext.ts`.
  - Hecho cuando: ningún archivo importa `AuthProvider` ni `AuthContext`; verde en el frontend;
    comprobación rápida con `npm run dev` y el servidor real: cargar con y sin sesión, recargar,
    entrar, salir y un 401 (borrando la cookie) se comportan como antes y la consola no muestra
    errores (resultado anotado en `validation.md`; el recorrido completo es T8).

- [x] **T5. Almacén de la agenda (fábrica y pruebas).** RF-10 a RF-16, RF-23 a RF-30, RNF-5
  - `src/features/sessions/createAgendaStore.ts` según el plan §4 (estado con `visit`, las acciones
    de §4.2) y `createAgendaStore.test.ts` con los casos del plan §8. Usa las reglas de T2. Todavía
    no se conecta.
  - Hecho cuando: el rojo y el verde están en `validation.md`; las pruebas cubren todos los puntos
    del almacén de la agenda de RNF-5 (lista marcada uno por uno en `validation.md`, incluidos los
    de CR-1); la fábrica solo importa de `@/domain/`; verde en el frontend.

- [x] **T6. Conexión del almacén de la agenda.** RF-16, RF-21, RF-22, RF-24, RF-26, RF-30
  - `agendaStore.ts` (instancia real, `devtools` «TeamMatchUp · agenda»), `agendaResponses.ts`
    (plan §4.3: solo `success` sin `manual`, clave del usuario actual, guarda de tipo para los ids),
    `isSchedulePath` en `routes.ts`, efectos 1 (`routeChanged`) y 3 de `StoreBridge.tsx`,
    `resetAgenda` real en `authStore.ts`, `useCreateSession` con `{ payload, agendaVisit }` y
    `creationConfirmed` antes de `markAgendaStale` (y `SessionDraftSlip` pasa la visita leída al
    enviar; `onCreated` se queda hasta T7), comentario de R9 en `useSessions`.
    `SchedulePage` todavía no lee el almacén (lo hace T7): la agenda se ve igual que antes.
  - Hecho cuando: verde en el frontend; con `npm run dev`, la extensión de depuración (o, sin ella,
    `agendaStore.getState()` en la consola) muestra que entrar y salir de `/agenda` cambian `visit`
    y que cerrar sesión deja el estado inicial; anotado en `validation.md`.
  - Estado: código y verde hechos (2026-11-22); comprobación con navegador hecha por el usuario el 2026-11-22 («todo pasó», declarado por el usuario; ver `validation.md`).

- [x] **T7. Agenda y «Proponer» con el almacén.** RF-11 a RF-15, RF-17, RF-18, RF-23 a RF-28
  - `SchedulePage.tsx` según el plan §5 (lectura del almacén, entradas de las reglas, error retenido
    de §5.3 (P1 decidida: con sesión por confirmar y filtro sin lista recibida, semana y panel
    siguen con el error y «Actualizando» durante «Reintentar»), semana y panel de §5.4, efectos de
    RF-27 y RF-28,
    `sessionCancelled` en el 204); `SessionDraftSlip.tsx` (sin `onCreated`);
    `Failure` con `retryLabel`; `MatchesPage.tsx` y la ficha de jugador con `propose` + `navigate`
    sin estado. Retirar `readProposal`.
  - Hecho cuando: ningún archivo de `src/` escribe ni lee `state.proposal` del historial; verde en
    el frontend; comprobación rápida en modo simulado: filtro y sesión abierta se conservan al ir a
    Perfil y volver, la sesión creada con «Todos los juegos» queda abierta, «Proponer» abre el
    formulario con la propuesta; anotado en `validation.md` (el recorrido completo es T9).
  - Estado: código y verde hechos (2026-11-22); comprobación con navegador hecha por el usuario el 2026-11-22 («todo pasó», declarado por el usuario; ver `validation.md`).

- [x] **T8. Recorrido de la sesión iniciada contra el servidor real.** RF-1 a RF-9, RF-16, RF-19, RF-20, RNF-2
  - Repetir el recorrido 5.A «Sesión y conexión» de `specs/007-integrar-frontend/validation.md`
    con sus pasos y su entorno (servidor real con base temporal y navegador): carga, recarga, error
    y «Reintentar» (foco en él), login con y sin ruta de origen, registro (también con login
    fallido), cierre de sesión (también con el servidor detenido), 401 con un solo aviso, cambio de
    sesión en otra pestaña (en 5 s, también con la pestaña oculta) y almacenamiento bloqueado.
  - RF-8: guardar el perfil con otro nombre visible y ver el cambio en la barra sin recargar.
  - RF-16: tras cerrar sesión, tras un 401 y tras un cambio en otra pestaña, `agendaStore` está en
    su estado inicial y no se ve nada de la cuenta anterior.
  - RF-19: el almacenamiento del navegador no tiene claves nuevas tras usar la sesión y la agenda.
  - RF-20: repetir en modo simulado los pasos que el modo simulado admite.
  - Hecho cuando: `validation.md` anota cada paso con su resultado y si coincide con el original;
    toda diferencia es una de RNF-2 o se abre como defecto (y se corrige antes de seguir).
  - Estado (2026-11-22): hecha. Recorrido con navegador real anotado en `validation.md` (T8). El
    defecto D-016-1 (el login con ruta de origen acababa siempre en `/inicio`) se corrigió con la
    opción (a): `enter` envuelve poner al usuario, avisar y navegar en un solo `flushSync`
    (`createAuthStore.ts`, con prueba primero en rojo); los pasos afectados se repitieron en
    servidor real y en modo simulado y coinciden con el original. El plan §3 («Sin vista
    intermedia») supone mal el agrupado de React; pendiente de que un `planner` lo corrija.

- [x] **T9. [usuario] Recorrido de la agenda, red lenta y herramientas de depuración.** RF-10 a RF-30, RNF-2, RNF-6
  - Pasos de agenda de `specs/009-detalle-de-sesion/validation.md` y «Proponer» desde coincidencias
    y desde la ficha; todo igual salvo los puntos 1 a 7 de RNF-2.
  - Criterios de finalización de la spec, uno por uno: salir y volver (enlace, «Atrás», detalle) y
    recargar (RF-15, RF-17, RF-19); sesión conservada que la lista guardada no contiene o sin lista
    guardada, con la lista fallando con el servidor detenido, «Sin conexión» y un perfil de red de
    más de 30 s de latencia, también durante «Reintentar», incluido el filtro sin lista recibida,
    donde semana y panel siguen con el error (RF-25, D10, I-1, DT-12); lista guardada que
    contiene la sesión y falla (I-2); cancelar en el detalle y el foco del título (RF-26); crear con
    «Todos los juegos», con otro filtro y saliendo con «Atrás» durante «Enviando…» con red lenta
    (RF-24); cuentas cargando con red lenta y carga fallida (RF-13); filtro de un juego no vinculado,
    nunca y ya no (RF-13); recargar o salir con una propuesta esperando (RF-30); filtro conservado
    y «Proponer» de otro juego (RF-28, D5); «Proponer» con cuentas lentas y «¿Cancelar esta sesión?»
    abierta: una sola ventana, se aplica al cerrar con «Volver» y con 204, se descarta con «Atrás» o
    recarga (CR-1); lo mismo en modo simulado (RF-20).
  - RF-21: en modo de desarrollo con la extensión de depuración, los dos almacenes con nombres
    distintos y sus cambios con nombre de operación; sin la extensión, en una carga completa sin
    recargas en caliente, entrar, salir y volver varias veces: sin errores de los almacenes y como
    máximo un aviso por almacén. RF-22 y RNF-6: en la construcción de producción hecha con el
    procedimiento de la spec 010, sin variables nuevas, la extensión no muestra almacenes y no sale
    el aviso.
  - Revisar R4 del plan (formulario que se cierra durante la animación de salida).
  - Hecho cuando: `validation.md` anota cada criterio con su resultado; las diferencias son solo
    las de RNF-2; los defectos que salgan se corrigen en una tarea añadida antes de T10 (**T9b**,
    para D-016-2 y D-016-3); T9 no se marca hasta que T9b esté hecha y el usuario haya hecho los
    pasos de la extensión real (RF-21 y RF-22).
  - **Estado (2026-11-22): hecha.** El `implementer` hizo con navegador real todo lo automatizable
    (sección «T9» de `validation.md`); los defectos D-016-2 y D-016-3 se corrigieron en **T9b** y
    O-016-1 fue aceptada por el usuario (admisible, no se corrige). Los dos pasos con la extensión
    real de Redux DevTools (RF-21 en desarrollo; RF-22 y RNF-6 en producción) los hizo el usuario en
    Firefox el 2026-11-22 y lo declaró (ver «RF-21, RF-22 y RNF-6 con la extensión real» en
    `validation.md`; sin salidas ni capturas aportadas).

- [x] **T9b. Corrección de D-016-2 y D-016-3 (defectos de T9).** RF-25, DT-12, RNF-2, RF-15, RF-30, R4
  - Tarea añadida antes de T10, como pedía el «Hecho cuando» de T9. Decisiones del usuario
    (2026-11-22): D-016-3 opción 1, D-016-2 opción (a), O-016-1 admisible. **No toca `spec.md`**
    (RF-25, RF-30 y RNF-2 no cambian) **ni cambia `networkMode`** (`queryClient.ts` y `useSessions`
    siguen con el valor por defecto `'online'`); tampoco el backend ni `agendaResponses.ts`.
  - **D-016-3 (RF-25, DT-12).** En `SchedulePage.tsx`, el criterio `retained` de plan §5.3 y el
    indicador «Actualizando» pasan a contar la pausa como reintento en curso: donde hoy se exige
    `sessionsQuery.isFetching`, usar `sessionsQuery.fetchStatus !== 'idle'` (es decir, `fetching` o
    `paused`; equivale a `isFetching || fetchStatus === 'paused'`). Justificación: con «Sin conexión»
    ya activado TanStack deja la petición en `paused` sin fallarla, y «Reintentar» es en ese momento
    un reintento a la espera de red; el resto de §5.3 y §5.4 no cambia (`lastFailure`, `visible`,
    `listError`, panel y semana). Sin lista recibida en pausa, la semana y el panel siguen con el
    error y «Actualizando», sin «Cargando…» ni esqueleto. Fuera de alcance: una pausa sin fallo
    previo de ese filtro (`lastFailure` nulo) se queda como hoy.
  - **D-016-2 (R4, RF-15, RF-30).** El borrador no debe desmontarse al instante al salir de la agenda:
    «Anotar una sesión» sale con la vista (≈ 240 ms, como el original) y el borrador queda cerrado
    al terminar esa salida. Se conserva lo que ya cumple RF-30: al volver no hay borrador, no hay
    «Enviando…» ni error de creación, y la propuesta se descarta al salir. **Mecanismo pendiente de
    la pregunta Q1** (abajo); no se elige aquí.
  - **Pruebas.** D-016-3: no se prueba en Vitest. Es una condición de pintado de `SchedulePage` y el
    plan (§8, «Lo que no prueba Vitest») deja fuera las vistas; extraerla solo para probarla sería
    rediseño no pedido. Se comprueba en navegador con rojo/verde (abajo). D-016-2: si Q1 se resuelve
    con una acción nueva del almacén, esa acción **sí** lleva prueba primero (rojo por `T9b: sin
    implementar`, luego verde) en `createAgendaStore.test.ts`, ajustando solo los casos de «salir»
    que cambien y sin debilitarlos; si se resuelve en la vista, no hay prueba de Vitest y se
    comprueba en navegador.
  - **Rojo en navegador (antes de tocar código).** Repetir con el código actual los pasos que
    fallaron y anotar el resultado real: `d2.mjs offline V2` (`scratchpad/t9/`, V2: filtro sin lista
    recibida; esperado antes: error perdido y panel «Cargando…»), `g2.mjs offline V1` (sin
    «Actualizando») y `r4.mjs` (formulario a ≈ 12 a 16 ms). Servidor real con base temporal nueva
    (no `teammatchup` ni `tmu_016_manual`) y borrarla al terminar.
  - **Verde en navegador (después).** (1) D-016-3, con «Sin conexión» **ya activado**: filtro sin
    lista recibida (V2) y con lista recibida (V1); «Reintentar» mantiene el error en la semana y en
    el panel, muestra «Actualizando» y no muestra «Cargando…» ni esqueleto; al volver la red se
    reanuda y resuelve (V1 tarjeta, V2 «Mis sesiones»). Repetir también `g2.mjs stopped` y `slow`
    (V1 y V2) y `g3` para comprobar que no hay regresión. (2) D-016-2: `r4.mjs` con el enlace de la
    barra y con «Atrás», 2 salidas cada uno, comparando con el original (`scratchpad/t8/orig`,
    :5428): el formulario sale con la vista a ≈ 240 ms (original 236 a 247 ms), sin quedarse en
    pantalla ni parpadear (muestreo cada 4 ms, sin reaparecer), y sin «Anotar una sesión» al volver.
    Repetir `g1` (salir y volver) para comprobar que RF-15/RF-30 siguen igual.
  - Hecho cuando: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` en verde en el
    frontend (sin `.only`, `any` ni `@ts-ignore` nuevos) y `git status --short backend/` vacío;
    `spec.md` sin cambios y `networkMode` sin tocar (`git diff` de ambos vacío en esos puntos); el
    rojo y el verde en navegador de D-016-2 y D-016-3, con las cifras reales, anotados en
    `validation.md`; D-016-2 y D-016-3 marcados como cerrados allí y O-016-1 registrada como
    **aceptada por el usuario (admisible, no se corrige)**; el plan §5.3 coincide con el código
    (nota breve añadida por el `planner` al aprobar esta tarea).

- [x] **T10. Cierre documental.** RNF-5 y criterios de finalización
  - `validation.md` completo (rojo y verde de T2, T3 y T5; verdes de T1, T4, T6 y T7; recorridos de
    T8 y T9; rojo y verde de T9b, con O-016-1 registrada como aceptada); casillas de los criterios de finalización de `spec.md` marcadas con su evidencia.
  - `AGENTS.md`: los dos almacenes en la estructura del frontend y `npm test` en «Comandos» (quitar
    «No tiene script de test»); corregir la referencia a `HITO2.md`, que no existe (P3, aprobada
    el 2026-11-21): que apunte al enunciado guardado en el apéndice A de
    `specs/016-estado-global/spec.md`, o quitarla.
  - `MEMORY.md`: estado de la 016, «Estado del código» (Zustand, Vitest, `StoreBridge`), «Deuda
    conocida» (quitar «El frontend no tiene runner de test») y «Próximo paso»: validación del
    `reviewer` de la 016 y después la 017.
  - `graphify update .` en la raíz.
  - Hecho cuando: verde en el frontend por última vez y anotado; los tres documentos actualizados;
    `AGENTS.md` ya no menciona `HITO2.md` como archivo existente; `graphify update .` ejecutado sin
    errores.
  - Estado (2026-11-22): hecha. `graphify` no está instalado en este entorno: `graphify update .` no se pudo ejecutar (ver `validation.md`, T10).
