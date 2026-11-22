# Validación 016 — Estado global de la sesión iniciada y de la agenda
Registro de rojo y verde según `plan.md` §8. Entorno: `frontend/`, 2026-11-22.

## Índice
- [T1. Dependencias y Vitest](#t1-dependencias-y-vitest)
- [T2. Reglas puras de la agenda](#t2-reglas-puras-de-la-agenda)
- [T3. Almacén de la sesión iniciada](#t3-almacén-de-la-sesión-iniciada)
- [T4. Migración de `AuthProvider` al almacén](#t4-migración-de-authprovider-al-almacén) (verde; comprobación manual hecha por el usuario)
- [T5. Almacén de la agenda](#t5-almacén-de-la-agenda)
- [T6. Conexión del almacén de la agenda](#t6-conexión-del-almacén-de-la-agenda) (verde; comprobación manual hecha por el usuario)
- [T7. Agenda y «Proponer» con el almacén](#t7-agenda-y-proponer-con-el-almacén) (verde; comprobación manual hecha por el usuario)
- [T8. Recorrido de la sesión iniciada contra el servidor real](#t8-recorrido-de-la-sesión-iniciada-contra-el-servidor-real) (hecho; D-016-1 corregido y cerrado: T8 marcada)
- [T9. Recorrido de la agenda, red lenta y herramientas de depuración](#t9-recorrido-de-la-agenda-red-lenta-y-herramientas-de-depuración) (hecho; recorrido automatizado por el `implementer` y RF-21 y RF-22 con la extensión real, declarados por el usuario; sus defectos D-016-2 y D-016-3 se cerraron en T9b: T9 marcada)
- [T9b. Corrección de D-016-2 y D-016-3](#t9b-corrección-de-d-016-2-y-d-016-3) (hecha; D-016-2 y D-016-3 cerrados, O-016-1 aceptada por el usuario)
- [T10. Cierre documental](#t10-cierre-documental) (hecho)
- [Validación del reviewer](#validación-del-reviewer) (APROBADO, 2026-11-22)

## T1. Dependencias y Vitest
RNF-1, RNF-5. Sin pruebas nuevas: se anota solo el verde.

- `npm view zustand@5.0.16 version` -> `5.0.16`.
- `npm view vitest@3.2.4 dependencies.vite` -> `^5.0.0 || ^6.0.0 || ^7.0.0-0` (admite Vite 5.4).
- `npm install --save-exact zustand@5.0.16` y `--save-dev vitest@3.2.4`: sin avisos de dependencias
  incompatibles (solo el resumen habitual de `npm audit`, ajeno a esta tarea).
- `package.json`: `"zustand": "5.0.16"`, `"vitest": "3.2.4"` sin `^`; script `"test": "vitest run"`.
- `npm ls vite`: un único `vite@5.4.21` (deduped en `@vitejs/plugin-react` y `vitest`).
- `npm test -- --passWithNoTests` -> `No test files found, exiting with code 0`. VERDE.
- Prueba temporal `src/tmp/o.test.ts` con `it.only`: `npm run lint` falla con
  `'it.only' is restricted from being used  no-restricted-properties` (1 error). Archivo retirado.
- `npm run typecheck`: sin errores. VERDE.
- `npm run lint`: sin errores. VERDE.
- `npm run build`: `✓ built in 1.29s`. VERDE.
- `git status --short backend/`: vacío.

## T2. Reglas puras de la agenda
RF-13, RF-29 (CR-1), RNF-4, RNF-5. Entorno: `frontend/`, 2026-11-22. Archivos:
`src/domain/agendaRules.ts` y `src/domain/agendaRules.test.ts` (15 pruebas: RF-29 ocho, RF-13 siete;
una de las de RF-29 comprueba que no se modifica la entrada).

### Rojo
Con `draftGame` y `proposalDecision` (firmas y tipos definitivos) lanzando
`new Error('T2: sin implementar')`.
- `npm test` -> `Test Files  1 failed (1)`, `Tests  15 failed (15)`.
- Últimas líneas: `FAIL src/domain/agendaRules.test.ts > draftGame (RF-13) > b: cuentas recibidas
  sin ningún juego -> null...` / `Error: T2: sin implementar` en `agendaRules.ts:47`.
- Motivo: las 15 fallan por `T2: sin implementar`, no por importación, tipos ni configuración (el
  archivo compila y Vitest lo ejecuta).

### Verde
- `npm test` -> `src/domain/agendaRules.test.ts (15 tests)`, `Test Files  1 passed (1)`,
  `Tests  15 passed (15)`. VERDE.
- `npm run typecheck`: sin errores. VERDE.
- `npm run lint`: sin errores. VERDE.
- `npm run build`: `built in 1.16s`. VERDE.
- `agendaRules.ts` solo importa tipos de `./proposal` y `./types`; sin React, Zustand, `services/` ni
  reloj. Sin `.only`, `any` ni `@ts-ignore`. `git status --short backend/`: vacío.

## T3. Almacén de la sesión iniciada
RF-1 a RF-8, RF-16, RNF-5. Entorno: `frontend/`, 2026-11-22. Archivos: `src/features/auth/createAuthStore.ts`
y `src/features/auth/createAuthStore.test.ts` (38 pruebas). Todavía no se conecta a la aplicación
(`AuthProvider` sigue igual).

### Rojo
Con `createAuthStore` (firmas y tipos definitivos: `AuthState`, `AuthDeps`, `RouterAccess`, `Session`)
cuyas acciones lanzan `new Error('T3: sin implementar')`.
- `npm test` -> `Test Files  1 failed | 1 passed (2)`, `Tests  36 failed | 17 passed (53)`
  (las 15 de `agendaRules` y 2 de `createAuthStore` que solo miran el estado inicial pasan; 36 fallan).
- Últimas líneas: `FAIL  src/features/auth/createAuthStore.test.ts > RF-16: la agenda se reinicia con la
  sesión > un fallo de la consulta de sesión (error) no reinicia la agenda` / `Error: T3: sin
  implementar` en `createAuthStore.ts:68`.
- Motivo: las 36 fallan por `T3: sin implementar` (en `start`, `attachRouter`, `setUser`; la de
  «antes de attachRouter» por `login` rechazado con ese mismo error), no por importación, tipos ni
  configuración (el archivo compila y Vitest lo ejecuta).

### Verde
- `npm test` -> `src/features/auth/createAuthStore.test.ts (38 tests)`, `Test Files  2 passed (2)`,
  `Tests  53 passed (53)`. VERDE.
- `npm run typecheck`: sin errores. VERDE.
- `npm run lint`: sin errores (se corrigió un `prefer-const` en el propio test). VERDE.
- `npm run build`: `built in 1.21s`. VERDE.
- `createAuthStore.ts` no importa `@/services/api` (solo tipos de `@/services/apiContract`); `@/app/routes`
  (con `lucide-react`) carga en Node sin problema: **no hizo falta aplicar R2**. Sin `.only`, `any` ni
  `@ts-ignore`. `git status --short backend/`: vacío.

### Puntos de RNF-5 del almacén de la sesión iniciada (plan §8), uno por uno
- [x] RF-2: `checking` -> `authenticated` (`start pasa por checking y termina en authenticated`),
  `anonymous` (`respuesta sin sesión (401)`) y `error` (con mensaje; sin mensaje o no-Error ->
  `NO_MESSAGE_TEXT`).
- [x] RF-2: respuesta de un intento viejo sin efecto: dos `start()` con la limpieza del primero
  (respuesta y error del primero), y `retry()` con la primera respuesta llegando tarde.
- [x] RF-2: consulta cancelada por una limpieza (`isSessionCleared`) que se repite.
- [x] RF-3: login en orden `clear` -> `resetAgenda` -> usuario -> `announce('login')` -> una sola
  `navigate(to, { replace: true })`, a la ruta de origen o a Inicio (registro de orden `log`).
- [x] RF-4: registro con login fallido -> login con `{ email, notice: 'registered' }` (sin usuario,
  sin aviso ni limpieza); registro fallido -> error al formulario; registro y login bien -> Inicio.
- [x] RF-5: logout con `api.logout` rechazado limpia igual; `clearCsrfIfOwn` antes de
  `announce('logout')`; `navigate(login, { replace: true })`.
- [x] RF-6: dos avisos con la misma época -> una sola `navigate` y una sola limpieza; época vieja ->
  nada.
- [x] RF-6: estado `anonymous` ya puesto (con `flushSync` antes) cuando se llama a `queryCache.clear`
  (registro de orden).
- [x] RF-6: `from` = `pathname()` del acceso inyectado si es protegida, `undefined` si es pública;
  sin usuario -> login sin `notice` y sin limpiar.
- [x] RF-7: otra pestaña: `clearCsrfIfOwn` no se llama; navega solo con usuario y ruta protegida; en
  `checking`, `error` y `anonymous` (y con ruta pública) solo limpia.
- [x] RF-8: `setUser` con usuario de sesión lo sustituye; sin él (`checking`, `anonymous`, `error`)
  no cambia nada.
- [x] RF-16: `resetAgenda` en cada limpieza (consulta 401, logout, 401, otra pestaña), antes de pintar
  sin usuario, y al entrar (login y registro); no en un fallo de la consulta.
- [x] RF-1 (apoyo): estado nuevo = `checking`; el estado solo tiene `session` más funciones (ni
  comprobante ni contraseñas); antes de `attachRouter` navegar no hace nada.

## T4. Migración de `AuthProvider` al almacén
RF-1, RF-2, RF-6, RF-7, RF-9, RF-21, RF-22, RNF-6. Entorno: `frontend/`, 2026-11-22. Sin pruebas
nuevas (el comportamiento lo cubre T3; esta tarea es el cableado).

### Cambios
- Nuevos: `src/features/auth/authStore.ts` (instancia con dependencias reales, `devtools`
  «TeamMatchUp · sesión iniciada», `enabled: import.meta.env.DEV`, `resetAgenda` provisional vacío
  hasta T6), `src/app/StoreBridge.tsx` (efectos 1 y 2 del plan 2; el 3 llega en T6).
- Modificados: `useAuth.ts` (fachada con `useShallow`, misma forma), `useSessionUserId.ts`
  (selector directo), `app/providers/AppProviders.tsx` (`<StoreBridge />` sin `AuthProvider`),
  comentario de `services/http/sessionEvents.ts`.
- Borrados: `AuthProvider.tsx`, `AuthContext.ts`. Ningún consumidor cambió.

### Verde
- `grep -rnE "import.*(AuthProvider|AuthContext)" src` -> sin resultados (solo queda la palabra
  `AuthProvider` en un comentario histórico de `createAuthStore.ts`).
- `npm test` -> `Test Files 2 passed (2)`, `Tests 53 passed (53)`. VERDE.
- `npm run typecheck`, `npm run lint`: sin errores. `npm run build`: `built in 1.18s`. VERDE.
- Sin `.only`, `any` ni `@ts-ignore` nuevos. `git status --short backend/`: vacío.

### Comprobación manual con el servidor real: hecha por el usuario (2026-11-22)
Antes de esta sección el `implementer` solo había comprobado que `npm run dev` arranca y sirve los
módulos nuevos con 200 (sin navegador y con el backend apagado). La comprobación de comportamiento
la hizo **el usuario personalmente el 2026-11-22**: servidor real en `http://localhost:5173` con el
backend en 3001, base temporal `tmu_016_manual`, usuario `prueba016@example.com`. Pasos:
- Sin cookie, `/inicio` pasa por «Cargando…» y acaba en `/login`.
- Entrar lleva a `/inicio` con el saludo.
- Recargar en `/inicio` y en `/perfil` mantiene la sesión.
- Cerrar sesión lleva a `/login` y `GET /api/auth/me` responde 401.
- 401 borrando la cookie `token` en `/configuracion` y guardar horas: lleva a `/login` con el aviso
  «Tu sesión expiró. Vuelve a entrar.» y, al entrar, vuelve a `/configuracion`.
- Sin errores de React/JS en la consola.

Resultado: todo pasó (declarado por el usuario). Sin salidas ni capturas aportadas por el usuario.

## T5. Almacén de la agenda
RF-10 a RF-16, RF-23 a RF-30, RNF-5. Entorno: `frontend/`, 2026-11-22. Archivos:
`src/features/sessions/createAgendaStore.ts` y `createAgendaStore.test.ts` (50 pruebas). Todavía no
se conecta a la aplicación. Usa `draftGame` y `proposalDecision` de T2.

### Rojo
Con `createAgendaStore` (firmas y tipos definitivos, estado inicial con `visit`) cuyas 13 acciones
lanzan `new Error('T5: sin implementar')`.
- `npm test` -> `Test Files  1 failed | 2 passed (3)`, `Tests  49 failed | 54 passed (103)`
  (pasan las 53 de T2 y T3 y la del estado inicial; fallan 49).
- Últimas líneas: `FAIL  src/features/sessions/createAgendaStore.test.ts > reset (RF-16) > en la agenda
  renueva la visita: una confirmación anterior ya no vale` / `Error: T5: sin implementar` en
  `createAgendaStore.ts:53`.
- Motivo: las 49 fallan por `T5: sin implementar` (`grep` de errores: 49 de 49 son ese mensaje), no
  por importación, tipos ni configuración (el archivo compila y Vitest lo ejecuta).

### Verde
- `npm test` -> `createAgendaStore.test.ts (50 tests)`, `Test Files  3 passed (3)`,
  `Tests  103 passed (103)`. VERDE.
- `npm run typecheck`, `npm run lint`: sin errores. `npm run build`: `built in 1.24s`. VERDE.
- `createAgendaStore.ts` solo importa de `@/domain/` (`agendaRules`, `types`) y de `zustand`; sin
  React, `services/`, reloj ni red. Sin `.only`, `any` ni `@ts-ignore`. `git status --short
  backend/`: vacío.

### Puntos de RNF-5 del almacén de la agenda (plan §8), uno por uno
- [x] RF-15: volver con sesión conservada -> por confirmar (`volver con la sesión conservada la deja
  por confirmar`); salir la deja por confirmar con filtro y sesión.
- [x] RF-26: respuesta sin la sesión -> `open: null`; con ella -> confirmada.
- [x] RF-11, RF-26: respuesta fuera de la agenda o de otro filtro -> nada.
- [x] I-1: un fallo no llama a nada; tras él la siguiente `listResponded` decide.
- [x] RF-24: creación con `visit` vigente -> borrador cerrado y abierta por confirmar; con visita
  vieja o fuera de la agenda -> nada; sustituye a la que hubiera.
- [x] RF-27, RF-25: `visibleListChanged` cierra la confirmada (no está en la lista o lista `null`) y
  no la por confirmar.
- [x] RF-12, RF-23: `selectSession` y `showMine` terminan la espera.
- [x] RF-27: `sessionCancelled` (confirmada y por confirmar; no toca otra).
- [x] RF-14: `propose` sustituye a la anterior.
- [x] RF-28/RF-29: `resolveProposal` aplicar (un solo cambio de estado, contado con `subscribe`),
  descartar (filtro, sesión y borrador intactos), esperar (estado idéntico, sin avisos); fuera de la
  agenda o sin propuesta no hace nada.
- [x] CR-1: con `cancelDialogOpen` o borrador abierto espera, al cerrarse aplica, salir antes
  descarta.
- [x] RF-30: salir cierra el borrador y descarta la propuesta; filtro y sesión siguen.
- [x] RF-16: `reset` (filtro, sesión, borrador y propuesta; `visit` se renueva solo dentro de la
  agenda e invalida confirmaciones anteriores).
- [x] RF-10, RF-13: almacén nuevo = estado inicial; solo el identificador de la sesión; `openDraft`
  según `draftGame` (filtro, primera cuenta, sin cuentas), `closeDraft`.

## T6. Conexión del almacén de la agenda
RF-16, RF-21, RF-22, RF-24, RF-26, RF-30. Entorno: `frontend/`, 2026-11-22. Sin pruebas nuevas (plan §8:
`agendaResponses.ts` y `StoreBridge.tsx` son pegamento que no prueba Vitest; se comprueban en T8/T9).
Archivos: `agendaStore.ts` y `agendaResponses.ts` (nuevos), `routes.ts` (`isSchedulePath`),
`app/StoreBridge.tsx` (efectos 1 y 3), `authStore.ts` (`resetAgenda` real), `hooks.ts`
(`useCreateSession` con `{ payload, agendaVisit }`, `creationConfirmed` antes de `markAgendaStale`,
comentario R9 en `useSessions`), `SessionDraftSlip.tsx` (lee `visit` al enviar; `onCreated` se queda
hasta T7).

### Verde
- `npm test` -> `Test Files  3 passed (3)`, `Tests  103 passed (103)`. VERDE.
- `npm run typecheck`, `npm run lint`: sin errores. `npm run build`: `built in 1.23s`. VERDE.
- Sin `.only`, `any` ni `@ts-ignore` nuevos. `git status --short backend/`: vacío.

### Comprobación manual con el servidor real: hecha por el usuario (2026-11-22)
La hizo el usuario personalmente el 2026-11-22 (servidor real, backend en 3001, base temporal
`tmu_016_manual`), con `agendaStore.getState()` por import dinámico de
`/src/features/sessions/agendaStore.ts` o con Redux DevTools. Pasos: `visit` es `null` en
`/inicio`; es un número al entrar en `/agenda`; vuelve a `null` al ir a `/perfil` o a `/agenda/:id`;
tras cerrar sesión y volver a entrar el estado es el inicial; sin errores.

Resultado: todo pasó (declarado por el usuario). Sin salidas ni capturas aportadas por el usuario.

## T7. Agenda y «Proponer» con el almacén
RF-11 a RF-15, RF-17, RF-18, RF-23 a RF-28. Entorno: `frontend/`, 2026-11-22. Sin pruebas nuevas
(plan §8: las páginas y el pegamento no los prueba Vitest en Node; no hay `jsdom`). Sin rojo propio.
Archivos: `SchedulePage.tsx` (lee filtro, sesión abierta, borrador y propuesta del almacén; entradas
de RF-13 y RF-29; error retenido de §5.3; panel «Sesión abierta» con «Cargando…»/error y «Reintentar
la sesión abierta»; efectos de RF-27 y RF-28; `sessionCancelled` en el 204; sin `readProposal` ni
`navigate` con estado), `SessionDraftSlip.tsx` (sin `onCreated`), `States.tsx` (`retryLabel`),
`MatchesPage.tsx` y `ProposeSessionAction.tsx` (`propose` + `navigate(ROUTES.schedule)` sin estado).

### Verde
- `npm test` -> `Test Files  3 passed (3)`, `Tests  103 passed (103)`. VERDE.
- `npm run typecheck`, `npm run lint`: sin errores. `npm run build`: `built in 1.23s`. VERDE.
- Sin `.only`, `any` ni `@ts-ignore` nuevos. `git status --short backend/`: vacío.
- `grep` en `src/`: ningún archivo lee ni escribe `state.proposal` del historial (la única
  coincidencia es el selector del almacén).

### Comprobación manual en modo simulado: hecha por el usuario (2026-11-22)
La hizo el usuario personalmente el 2026-11-22 en modo simulado (`VITE_USE_MOCK_API=true`, cuenta
`demo@teammatchup.gg`). Pasos: el filtro y la sesión abierta se conservan al ir a Perfil y volver;
una sesión creada con «Todos los juegos» queda abierta; «Proponer» desde Coincidencias y desde la
ficha abre el formulario con la propuesta; el foco queda en el título del panel; sin errores en la
consola.

Resultado: todo pasó (declarado por el usuario). Sin salidas ni capturas aportadas por el usuario.
El error retenido (sesión por confirmar + filtro sin lista + «Reintentar») no estaba en esa guía:
sigue sin comprobarse (T8/T9).

## T8. Recorrido de la sesión iniciada contra el servidor real
RF-1 a RF-9, RF-16, RF-19, RF-20, RNF-2. Fecha: 2026-11-22. **Resultado: 1 defecto (D-016-1, RF-3/RF-8), corregido y cerrado el mismo día (ver «Corrección de D-016-1»); T8 marcada.** Todo lo demás coincide con el original (5.A de `specs/007-integrar-frontend/validation.md`) o es una diferencia admitida.

**Entorno.** Backend `node src/index.ts` (Node 22.18) en :3316 con la base temporal `tmu_016_t8` (variables `PORT` y `MONGODB_DBNAME` del proceso; **borrada al terminar**; `teammatchup` y `.env` sin tocar); Vite del código actual en :5316 (`VITE_PROXY_TARGET=http://localhost:3316`) y en :5317 con `VITE_USE_MOCK_API=true` (modo simulado); Vite del **original** (`git archive HEAD`, antes de la spec 016) en :5318, solo para comparar D-016-1. Navegador real: Google Chrome 156 headless por CDP (puertos 9426 a 9437, perfil nuevo por grupo de pasos, ventana de 1280x800, varias pestañas del mismo perfil para los pasos entre pestañas). Scripts desechables (no se versionan) en `scratchpad/t8/` (`s1` a `s5`, `d1` a `d4`, `lib.mjs`); salidas en `real-s1.json`, `mock-s1.json`, `real-s2.json`, `real-s3.json`, `mock-s3.json`. «Frames» = texto visible muestreado cada 5 ms. Todo se hizo con la interfaz (DOM) y los dominios `Network`, `Fetch` y `Page` de CDP; el servidor se detuvo y se volvió a arrancar por PID.

### Resultado por paso (servidor real, salvo donde se indica)
| Paso del 5.A / de T8 | Resultado | ¿Coincide con el original? |
| --- | --- | --- |
| Carga sin sesión (`/inicio`) | Frames `""` -> «Cargando…» -> login; `state={from:"/inicio"}` | Sí |
| Registro por el formulario | `POST /users` 201 y `POST /auth/login`; llega a `/inicio` con «Buenas noches Alfa»; `tmu.csrf` guardado | Sí |
| Cierre de sesión | `/login`, estado de navegación nulo, `tmu.csrf` ausente, `GET /api/auth/me` 401 | Sí |
| Login sin ruta de origen | `/inicio` | Sí |
| Recarga con sesión en `/inicio` y en `/perfil` | Sigue dentro | Sí |
| **Login con ruta de origen** (sin sesión, `/configuracion` -> login -> entrar) | `state={from:"/configuracion"}` correcto, **pero al entrar acaba en `/inicio`** | **NO: D-016-1** (original: `/configuracion`); **corregido: tras la corrección entra en `/configuracion` (ver «Corrección de D-016-1»)** |
| 401 por cookie `token` borrada en `/configuracion` + «Guardar horas» (RF-7) | `PUT /users/me/availability` -> 401, **1** petición; `/login` con `{from:"/configuracion",notice:"expired"}` y **un** `alert` «Tu sesión expiró. Vuelve a entrar.»; `tmu.csrf` ausente; `history.length` 9 -> 9 | Sí |
| Entrar tras ese 401 (debe volver a `/configuracion`) | Acaba en `/inicio` | **NO: D-016-1**; **corregido: vuelve a `/configuracion`** |
| Registro con login fallido (`Fetch.failRequest` solo al `POST /auth/login`) | `POST /users` y `POST /auth/login`; `/login` con `{email,notice:"registered"}`, correo precargado, `alert` «Tu cuenta se creó; inicia sesión»; entrar con ese correo lleva a `/inicio` | Sí |
| Servidor detenido: «Guardar horas» (RF-9) | `alert` «No se pudo conectar con el servidor. Inténtalo de nuevo.», sigue en `/configuracion`, comprobante conservado | Sí |
| Servidor detenido: recarga de `/configuracion`, `/`, `/inicio`, `/login`, `/registro` y `/ruta-que-no-existe` (RF-5) | En las seis: frames `""` -> «Cargando…» -> «No se pudo comprobar tu sesión … Reintentar»; 0 formularios; **foco en «Reintentar»**; 1 elemento con `role=alert` | Sí |
| «Reintentar» con el servidor aún detenido | «Cargando…» y de nuevo el error, foco en «Reintentar» | Sí |
| «Reintentar» con el servidor encendido | «Cargando…» -> la vista pedida (en la prueba, el 404 de `/ruta-que-no-existe`, con sesión); ningún fotograma con login | Sí (no se comprobó el nombre del jugador en esta vista concreta) |
| Cierre de sesión con el servidor detenido (RF-6) | `/login`, estado nulo, sin comprobante | Sí |
| Dos y tres pestañas: cerrar sesión en t1 (RF-7) | t2 (Agenda con filtro) y t3 (Mi ficha) a `/login` a los 112 y 113 ms (< 5 s), `{from,notice:"otherTab"}`, 1 `alert` «Se cerró o cambió la sesión en otra pestaña.»; `history.length` sin cambio (2 -> 2) | Sí (original: 116 y 112 ms) |
| t1 entra con otra cuenta (B) | t2 y t3 a `/login` a los 108 y 109 ms con el aviso de otra pestaña, `history.length` 3 -> 3 | Sí |
| 401 en una sola pestaña | t1 a `/login` con «Tu sesión expiró…»; t2 y t3 siguen 7 s en `/configuracion` sin aviso; al guardar t2 va a `/login` con «Tu sesión expiró…» (`notice:"expired"`, no el de otra pestaña) | Sí |
| Pestaña suspendida (`Page.setWebLifecycleState frozen`, 7 s) y reanudada | A `/login` 10 a 12 ms tras volver a estar activa, con `notice:"otherTab"` y 1 `alert` | Sí |
| Pestaña oculta | A `/login` en 178 ms con el aviso. **Salvedad:** Chrome headless no oculta pestañas; `visibilityState`/`hidden` se forzaron por script en la página y se lanzó `visibilitychange` | Sí (misma técnica limitada) |
| Almacenamiento bloqueado (`localStorage` lanza `SecurityError`) | Iniciar sesión lleva a `/inicio`; guardar horas lanza el `PUT`; al recargar queda en `/login` con `{from:"/configuracion"}`; sin errores de consola | Sí |
| Consola | 0 errores de consola ni excepciones en todos los grupos (incluidos los de servidor detenido) y 0 diálogos | Sí |

### Pasos propios de la spec 016
- **RF-8**: en `/configuracion`, «Nombre visible» = «Nombre Nuevo» + «Guardar ficha»: la barra pasa de «Alfa Prueba» a «Nombre Nuevo» sin recargar (una sola entrada de navegación). Igual en modo simulado (de «Jugador Demo»). Hecho.
- **RF-16** (`agendaStore.getState()` por import dinámico de `/src/features/sessions/agendaStore.ts`; estado inicial `{"filter":"all","open":null,"draft":null,"proposal":null,"visit":null}`): con el filtro cambiado a LoL y `visit` = 1 en `/agenda`, tras **cerrar sesión**, tras un **401** y tras un **cambio de sesión en otra pestaña** (t2, que estaba en `/agenda` con filtro), el estado es el inicial en los tres casos y no queda en pantalla el nombre de la cuenta anterior. Hecho, en servidor real y en modo simulado (cierre y 401 en `s1`; otra pestaña en `s3`).
- **RF-19**: tras registro/login, uso de la sesión y de la agenda (filtro cambiado), `localStorage` = `tmu.csrf`, `tmu.session-signal` y `tmu.mock-db.v4` (la base del modo simulado, ya existente; igual que en 5.A); `sessionStorage` vacío; IndexedDB sin bases; `document.cookie` vacío. **Sin claves nuevas** (las de Zustand no persisten nada). Hecho.
- **RF-20 (modo simulado, :5317, cuenta `demo@teammatchup.gg`)**: carga sin sesión, login, registro de una cuenta nueva, recarga, nombre visible (RF-8), cierre, login con y sin ruta de origen, 401 simulado (borrando `tmu.csrf`: `/login` con un `alert` de expiración, `history.length` 8 -> 8), tres pestañas (cerrar sesión, suspendida, oculta), RF-16 y RF-19, 0 peticiones a `/api`, 0 errores de consola. Todo coincide con el servidor real, incluido **D-016-1** (también ocurre en modo simulado). Limitación: en la prueba de la pestaña suspendida el `alert` aún no estaba pintado a los 0,5 s (el estado de navegación ya traía el aviso); en servidor real sí se vio. No se repitieron en modo simulado los pasos que necesitan servidor (detenido, login fallido, almacenamiento bloqueado).
- **RNF-2**: dentro de lo observado, los textos, avisos, tiempos y foco son los del original; la única diferencia es D-016-1, que no es de RNF-2.

### Defecto D-016-1 (cerrado)
- **D-016-1 (media; CERRADO tras la corrección de abajo; RF-3 / RF-8 de la spec 007, mantenidos por RF-2/RNF-2 de la 016) — el login con ruta de origen siempre acaba en `/inicio`.** Reproducido con servidor real y en modo simulado (`s1` 6b y 7c; `d1`, `d2`). El mismo código en `HEAD` (antes de la 016, Vite :5318, `d2o`) acaba en `/configuracion`, así que es una regresión de la migración (T3/T4), no una diferencia de RNF-2. Efecto: tras un 401 o tras entrar con una dirección protegida, el usuario no vuelve a la vista de origen (también el paso «t2 entra de nuevo y vuelve a la vista de origen» de las pestañas). Con la ruta de origen perdida, entrar sin ella sigue yendo a `/inicio` (correcto).
  - **Causa (con trazas de `history.replaceState`):** `enter` hace `set({session: authenticated})` y después `router.navigate(from)` en la misma tarea. La actualización de `useSyncExternalStore` (Zustand) es de carril síncrono y se pinta primero; la del router (`BrowserRouter`, `setState` normal) es de carril por defecto y llega después. Entre las dos, `PublicOnlyRoute` ve «autenticado» con la ruta aún en `/login` y pinta `<Navigate to="/inicio" replace>`; ese `replaceState('/inicio')` pisa el de `from`. Trazas: `replaceState /configuracion` (el `navigate` del almacén) y luego dos `replaceState /inicio` (`<Navigate>`). En el original, `setSession` y `navigate` eran `setState` del mismo carril y React los agrupaba en un solo pintado.
  - **El plan lo da por supuesto y es falso:** `plan.md` §3 («Sin vista intermedia (RF-3)»: «React 18 agrupa la actualización de `useSyncExternalStore` (carril síncrono…) con la del router, igual que hoy agrupa `setSession` y `navigate`»). Hace falta una decisión de diseño (no se improvisa aquí). Opciones a valorar: (a) que `enter` envuelva `set` y `navigate` en el `flushSync` inyectado (`deps.flushSync(() => { set(...); router.navigate(to, {replace:true}) })`, las pruebas ya inyectan un `flushSync` que ejecuta la función), con lo que ambos van en el mismo pintado; (b) que `PublicOnlyRoute` respete el destino (`location.state.from`) en vez de ir siempre a `/inicio`. Descartar (a) o (b) corresponde al plan.
  - Los pasos de registro (destino `/inicio`) no se ven afectados.

### Corrección de D-016-1 (opción (a), decisión del usuario: «opción a»)
Fecha: 2026-11-22. Se aplicó la opción (a); **no** se tocó `PublicOnlyRoute` (opción (b) descartada).
- **Cambio:** en `frontend/src/features/auth/createAuthStore.ts`, `enter` envuelve `setSession(authenticated)`, `announce('login')` y `router.navigate(to, {replace:true})` en una sola llamada a `deps.flushSync` (el `flushSync` ya inyectado; en producción el de `react-dom`). El orden interno no cambia (poner usuario, avisar, navegar); el vaciado de la memoria y el reinicio de la agenda siguen antes, fuera del `flushSync`. Afecta a `login` y a `register` (que también entra por `enter`).
- **Prueba primero (rojo):** en `createAuthStore.test.ts` se añadieron dos casos en RF-3 y se ajustaron dos existentes (ver abajo). Con el código anterior, `npm test` dio **ROJO: 3 fallos**: (1) el caso nuevo «poner al usuario y navegar ocurren dentro de la misma llamada a flushSync…» falló con `expected "spy" to be called 1 times, but got 0 times` (`enter` no llamaba a `flushSync`: el `set` y el `navigate` quedaban fuera de él, que es la causa de D-016-1); (2) el caso nuevo del registro falló con `expected 4 to be less than -1` (`navigate` se hacía sin `flushSync:end`, es decir, fuera de cualquier `flushSync`); (3) el caso existente «vacía la memoria, reinicia la agenda, pone al usuario, avisa y navega una sola vez, en ese orden» falló porque el registro esperado ya incluía `flushSync` antes de `set:authenticated`. (Después se ajustó igual el caso de RF-4 «registra, inicia sesión… y va a Inicio», que también fallaba por lo mismo.)
- **Pruebas de T3 tocadas, sin debilitarlas:** en los dos casos existentes (login de RF-3 y registro de RF-4) el registro esperado ganó una entrada `'flushSync'` entre `resetAgenda@checking` y `set:authenticated`; el resto de las aserciones (orden, una sola navegación, argumentos, estado final) quedan igual. Casos nuevos: con un `flushSync` que marca su inicio y su fin, `set:authenticated` y `navigate:/configuracion` ocurren dentro de la misma llamada, en ese orden (y 1 sola llamada a `flushSync`); lo mismo para el registro con destino `/inicio`.
- **Verde:** `npm test` 105/105 (3 archivos); `npm run typecheck`, `npm run lint` y `npm run build` sin errores; sin `.only`, `any` ni `@ts-ignore` nuevos; `git status --short backend/` vacío.
- **Repetición con el navegador real** (Chrome 156 headless por CDP; backend `node src/index.ts` Node 22.18 en :3326 con la base temporal `tmu_016_t8b`; Vite del código corregido en :5326 y en :5327 con `VITE_USE_MOCK_API=true`; los de :5173/:3001, `tmu_016_manual`, `teammatchup` y `.env` sin tocar; scripts copiados con puertos nuevos en `scratchpad/t8/r/`):
  - **`d2` (servidor real):** tras entrar con ruta de origen, `/configuracion`; la traza muestra un solo `replaceState /configuracion` (el `navigate` del almacén) y **ningún** `replaceState /inicio`.
  - **`s1` (servidor real), pasos 6b y 7c:** «login con from -> vuelve a /configuracion» OK; «entrar tras 401 vuelve a /configuracion» OK; 7 con un solo aviso «Tu sesión expiró…», `history.length` 8 -> 8, 1 sola petición 401; resto de `s1` (carga, registro, RF-8, recarga, RF-16, RF-19, cierre, login sin origen -> `/inicio`) OK; consola sin errores.
  - **`s1` (modo simulado, :5327):** 6b/5/7/7c OK (`/configuracion` en ambos), hist 7 -> 7, consola sin errores.
  - **`s3` (servidor real, 3 pestañas):** «t2 entra de nuevo y vuelve a la vista de origen» -> `/agenda` OK (antes `/inicio`); cerrar sesión en t1: t2 y t3 a `/login` a los 203 y 209 ms; t1 entra con otra cuenta: t2 y t3 a `/login` a los 274 ms; 401 en una pestaña sin arrastrar a las otras; suspendida (9 ms al reanudar, aviso de otra pestaña); oculta (forzada, 175 ms); RF-16 en todas; consola de las tres pestañas sin errores. Cero `FALLA`.
  - **`s3` (modo simulado):** «t2 entra de nuevo y vuelve a la vista de origen» -> `/agenda` OK (antes `/inicio`); cerrar sesión (579 ms), suspendida, oculta (571 ms), consola sin errores. Cero `FALLA`.
  - **Resto barato:** `s4` almacenamiento bloqueado (real y simulado) OK, consola sin errores; `s5` simulado (registro, recarga, 0 peticiones a `/api`, consola) OK; `s2` (registro con login fallido, servidor detenido: guardar, recargas, «Reintentar» con foco, cierre con servidor detenido) OK, consola sin errores. En total, 0 `FALLA` en esta repetición.
  - **Notas de la repetición (no son defectos):** (1) en una primera repetición de `s3` el paso «t1 entra con otra cuenta» salió `FALLA` con 8,3 s; fue un artefacto del script, no de la aplicación: `login()` espera `input[type=email]` con `waitFor`, que no devuelve verdadero con un nodo del DOM (`returnByValue`), y agotaba su espera de 8 s (también en los otros `login()`); además el script esperaba `/inicio` tras entrar con ruta de origen, que era justo el defecto. Se comprobó aparte (`d6`, `d7`: 274 ms y t1 entra en 110 ms con un login limpio) y se repitió `s3` completo con el sondeo corregido (`!!document.querySelector(...)` y esperar «salir de `/login`»): 274 ms, 0 `FALLA`. (2) En la prueba de la pestaña oculta, el `alert` aún no estaba pintado a los 175 ms (el estado de navegación sí traía el aviso y la ruta era `/login`); es la misma limitación de pintado en pestaña forzada a oculta que ya figura en las salvedades (en modo simulado, la suspendida mostró `alerts=[]` por lo mismo). No se repitieron `d1`, `d3`, `d4` (diagnóstico de la causa).
- **Resultado:** D-016-1 cerrado. Los tres pasos afectados («Login con ruta de origen», «Entrar tras ese 401» y «t2 entra de nuevo y vuelve a la vista de origen») coinciden ahora con el original, en servidor real y en modo simulado.
- **Plan §3 (corregido):** el párrafo «Sin vista intermedia (RF-3)» de `plan.md` §3 suponía que React agrupa la actualización de `useSyncExternalStore` con la del router; no era así (el almacén se pinta primero y el router después, y `PublicOnlyRoute` redirigía a `/inicio`). La corrección real es el `flushSync` de `enter` (opción (a)). El plan §3 ya se corrigió el 2026-11-22 (D-016-1): dice que `enter` va dentro de `flushSync`.

### Qué queda sin comprobar
- Nada de T8 quedó sin intentar salvo lo anotado: «pestaña oculta» real (limitación de Chrome headless, forzada por script) y los pasos de modo simulado que necesitan servidor.
- T8 queda **marcada** en `tasks.md`: D-016-1 se corrigió y los tres pasos afectados se repitieron con resultado coincidente (ver «Corrección de D-016-1»).

## T9. Recorrido de la agenda, red lenta y herramientas de depuración
RF-10 a RF-30, RNF-2, RNF-6 (RF-19 a RF-22 en los pasos de depuración). Fecha: 2026-11-22. Opción B del usuario («has lo que recomiendas»): el `implementer` hizo con navegador real todo lo automatizable y deja anotado lo que no se pudo. **Resultado de esa pasada: todo coincide con lo pedido salvo 2 defectos (D-016-2, D-016-3, cerrados después en T9b), 1 observación (O-016-1, aceptada por el usuario en T9b) y 2 pasos que solo podía cerrar el usuario (extensión real de Redux DevTools; declarados por el usuario el 2026-11-22, ver «RF-21, RF-22 y RNF-6 con la extensión real»).** En esa pasada no se modificó código de la aplicación ni `plan.md`.

**Entorno.** Backend `node src/index.ts` (Node 22.18) en :3416 con la base temporal `tmu_016_t9` (variables `PORT` y `MONGODB_DBNAME` del proceso; **borrada al terminar**; `tmu_016_manual`, `teammatchup` y `.env` sin tocar); Vite del código actual en :5416 (`VITE_PROXY_TARGET=http://localhost:3416`), en :5417 y :5418 con `VITE_USE_MOCK_API=true` (la de :5418 con `VITE_MOCK_LATENCY=2500`, latencia simulada de 2,5 s) y Vite del **original** (`git archive HEAD` de antes de la 016, `scratchpad/t8/orig`) en :5428 solo para comparar. El servidor de producción (RF-22) en :3419 (ver abajo). Chrome 156 headless por CDP (puertos 9601 a 9741, un perfil nuevo por grupo de pasos y por usuario). Cuentas reales sembradas por la API HTTP (`seed.mjs`, `seedmore.mjs`): A (Ana), B (Beto), C (solo LoL), D (sin cuentas), E a J (LoL y R6), todas con horas de 17 a 23 h. Red lenta y corte: `Network.emulateNetworkConditions` (sin conexión; latencia de 40 000 ms; «3G lenta» = 2000 ms y 50 KB/s); retención o fallo de una petición concreta: dominio `Fetch`; **servidor detenido de verdad** matando el proceso (`bestop.sh`) y volviéndolo a arrancar (`bestart.sh`). Scripts desechables (no se versionan) en `scratchpad/t9/`: `lib.mjs`, `lib2.mjs` (ayudas), `seed.mjs`, `g1` a `g11`, `g9b`, `g10`, `r4`, `r4s`, `d2` a `d5`; salidas `*.out` y capturas `r4-*.png` en la misma carpeta. Lectura del almacén con `import('/src/features/sessions/agendaStore.ts')` (solo en desarrollo). Para las listas, «retener» = `Fetch` sin continuar la petición hasta soltarla. **Límite del 30 s:** se usó un perfil de **40 000 ms de latencia** (más de 30 s, como pide la spec) y se esperó el plazo real: el error llegó a los 28,3 y 29,9 s de soltar la petición (la petición llevaba unos 5 s retenida), es decir, a los 30 s de su inicio.

### Resultado por criterio (servidor real, salvo donde se indica)
| Criterio de T9 (spec) | Resultado | Evidencia |
| --- | --- | --- |
| Salir y volver (enlace, «Atrás», detalle) conserva filtro y sesión abierta, cierra el borrador, sin «Enviando…» ni avisos; recargar devuelve el estado inicial (RF-15, RF-17, RF-19) | **Hecho.** Enlace de la barra (con borrador abierto), «Atrás», «Ver detalle» y volver por enlace y por «Atrás»: filtro LoL conservado, la sesión sigue (pasa por «por confirmar» al salir y se confirma al llegar la lista), borrador `null`, sin «Enviando…» ni `alert`; un error de creación en el formulario no sobrevive a la salida. Recargar: `{"filter":"all","open":null,"draft":null,"proposal":null,"visit":null}`. `localStorage` = `tmu.csrf`, `tmu.mock-db.v4`, `tmu.session-signal` (los mismos que en el original, comprobado en :5428); `sessionStorage` e IndexedDB vacíos | `g1` (24 OK), `d5` |
| Sesión conservada que la lista guardada no contiene / sin lista guardada, con la lista fallando (D10, I-1, DT-12, RF-25): servidor detenido | **Hecho** (V1: filtro «Todos», lista guardada sin la sesión; V2: filtro R6 sin lista recibida). Al volver con la petición en vuelo: «Sesión abierta», «Ver las mías», «Cargando…», nunca «No estás en ninguna sesión», sin petición nueva (1 sola GET de la lista). Con el servidor detenido: error con «Reintentar» en la semana y «Reintentar la sesión abierta» en el panel, sin «Cargando…». Durante «Reintentar» (petición retenida): semana y panel siguen con el error, «Actualizando» visible, sin esqueleto ni «Cargando…» (también con el reintento del panel). Con el servidor de vuelta: V1 tarjeta, V2 «Mis sesiones» | `g2 stopped V1`, `g2 stopped V2` |
| Lo mismo con red cortada («Sin conexión») | **Hecho solo cuando el corte llega con la petición en vuelo**; **con «Sin conexión» ya activado la petición no falla: TanStack la pausa (`fetchStatus: paused`).** V1 conserva el error pero sin «Actualizando»; V2 pierde el error (semana con la lista provisional, panel «Cargando…» sin indicador) hasta que vuelve la red. **Defecto D-016-3** | `g2 offline V1` (1 FALLA), `g2 offline V2` (2 FALLA), `d2`, `d3` |
| Lo mismo con más de 30 s de latencia, también durante «Reintentar» | **Hecho** (V1 y V2): error a los 30 s; durante un «Reintentar» que corre de verdad 30 s, a los 2, 8, 15 y 24 s la semana y el panel siguen con el error, «Actualizando» visible, sin esqueleto ni «Cargando…»; a los 30 s el reintento falla por plazo y vuelve a mostrar el error sin «Actualizando». Tras «Reintentar» con red: V1 tarjeta en «Sesión abierta», V2 «Mis sesiones» | `g2 slow V1`, `g2 slow V2` |
| Lista guardada que contiene la sesión y la lista falla (I-2) | **Hecho** (servidor detenido y corte con la petición en vuelo): tarjeta en el panel y error con «Reintentar» solo en la semana; el error no decide (la sesión sigue por confirmar, I-1); «Reintentar» con servidor y red de vuelta la confirma | `g3` |
| Cancelar en el detalle y foco del título (RF-26) | **Hecho.** Al volver (con la lista retenida): «Sesión abierta» por confirmar con el foco en el título del panel; al llegar la lista pasa a «Mis sesiones» con el foco en el mismo título; la sesión cancelada no está; `history.state` sin restos | `g4` |
| Crear con «Todos los juegos», con otro filtro y saliendo con «Atrás» durante «Enviando…» con red lenta (RF-24) | **Hecho.** «Todos los juegos»: tras la lista queda en «Sesión abierta» y, tras «Ver las mías», en «Mis sesiones». Filtro R6 creando una de LoL: se cierra al llegar la lista del filtro y aparece al volver a «Todos». «Atrás» con «Enviando…» con latencia de 8 s mantenida hasta que la pestaña de red la mostró terminada (8,1 s después de «Atrás»): al volver no está abierta ni hay «Enviando…» y aparece en la semana y en «Mis sesiones» | `g5` (esta última parte con la emulación mantenida: una primera versión del script la apagaba al salir y la petición terminaba al instante; se corrigió y se repitió) |
| Cuentas cargando con red lenta y carga fallida (RF-13) | **Hecho.** Cargando (lectura de cuentas retenida y luego con 6 s de latencia): «Anotar sesión» deshabilitado, elegir un bloque no abre nada, sin el aviso «Necesitas…»; llegan y se habilita. Fallida: error con «Reintentar» (`role=alert`), sin aviso «Necesitas…», botón deshabilitado, elegir un bloque no abre nada; «Reintentar» habilita. Cuenta sin juegos: sí sale el aviso | `g6` |
| Filtro de un juego no vinculado, nunca y ya no (RF-13) | **Hecho.** C (solo LoL) con filtro R6: abre con LoL (único del selector) y crear da 201, sin 400. E con R6 desvinculado por API mientras tenía el filtro R6: al volver el filtro R6 sigue, abre con LoL y crear da 201 | `g6` |
| Recargar o salir con una propuesta esperando (RF-30) | **Hecho.** Con las cuentas retenidas: recargar → estado inicial y sin formulario aunque lleguen; salir (enlace) → propuesta `null` y al volver con las cuentas ya llegadas no se abre nada | `g7 a` |
| Filtro conservado y «Proponer» de otro juego (RF-28, D5) | **Hecho.** Durante la espera se ve el filtro LoL; al abrirse el formulario solo «Todos los juegos» está pulsado, con el juego R6 y el título de la propuesta; crear → «Sesión abierta» y, tras «Ver las mías», «Mis sesiones». Propuesta descartada (carga de cuentas fallida y juego desvinculado mientras esperaba): filtro conservado sin cambiar, sin formulario | `g7 a`, `g7 b` |
| «Proponer» con cuentas lentas y «¿Cancelar esta sesión?» abierta (CR-1) | **Hecho** (ver O-016-1 sobre el solape de la animación). Una sola ventana mientras la propuesta espera; «Volver» → se abre con la propuesta y «Todos los juegos»; confirmar con 204 → se cierra y se abre con la propuesta; «Atrás» con la ventana abierta → propuesta descartada y al volver no se abre nada; recargar con la ventana abierta → estado inicial | `g7 cr1` |
| Pasos de agenda de la spec 009 y «Proponer» desde coincidencias y desde la ficha | **Hecho** (los de agenda): «Cancelar sesión» abre la ventana con el foco en «Volver»; Escape y «Volver» no cancelan y devuelven el foco; servidor detenido: error en la ventana con el foco en «Sí, cancelar sesión»; 3G lenta: «Enviando…» deshabilitado, foco en el título de la ventana, Escape y «Volver» no cierran, 204 cierra y el foco queda en el título del panel; 404: mensaje «Sesión no encontrada.» y la tarjeta desaparece (9 a 8), Escape cierra con el foco en el título del panel (el paso «6 404» de `g8.out` sale FALLA solo por una cuenta fija de tarjetas del script, 5, en vez de 9 a 8; las 9 a 8 constan en la salida). Formulario de creación: el foco no se mueve al abrir (R10), «ab» da el texto de RF-22 sin petición, Escape cierra. «Proponer» desde coincidencias (`g7`, `g9`) y desde la ficha (`g8` 8: formulario con «Sesión con …», «Todos los juegos», «Atrás» vuelve a la ficha con su pestaña). Sumarse y salir desde la agenda con 3G lenta y «Atrás» en curso: sin avisos ni foco movido, la lista refleja el cambio al volver (`g11`). **No se repitieron** los pasos del detalle (sumarse, editar, cupos, 360 px, contraste): el detalle no lo toca esta spec | `g8`, `g11` |
| Modo simulado (RF-20), lo que admite | **Hecho** (:5418, cuenta demo, latencia 2,5 s, 0 peticiones a `/api`): salir y volver (enlace, «Atrás», detalle) y recargar; «Todos los juegos», otro filtro y «Atrás» con «Enviando…»; cuentas cargando; recarga y salida con propuesta esperando; filtro conservado y «Proponer» de otro juego; CR-1 (una ventana, «Volver», 204, «Atrás», recarga); cancelar en el detalle con el foco; juego nunca vinculado (cuenta nueva solo con LoL); `localStorage` sin claves nuevas; consola sin errores. Dos corridas fallaron por esperas del script (el simulado tarda 2,5 s por operación) y se corrigieron las esperas; la corrida final: 0 FALLA. **No comprobable en modo simulado:** servidor detenido, «Sin conexión», 30 s y carga fallida (no hay red); «ya no vinculado» no se repitió | `g9`, `g9b` |
| R4 del plan (formulario que se cierra durante la animación de salida) | **Se nota: defecto D-016-2** | `r4`, `r4s` |

### Defectos encontrados en la pasada (cerrados en T9b)
- **D-016-2 (baja; NO es una diferencia de RNF-2; R4 del plan se materializa) — al salir de la agenda con «Anotar una sesión» abierto, el formulario desaparece al instante.**
  - **Síntoma:** en el original el formulario sigue visible y entero hasta que termina la animación de salida de la vista (≈ 240 ms) y desaparece con ella. Con la 016, `routeChanged(false)` pone `draft = null` en el acto y el formulario se quita a los **12 a 16 ms** del clic, mientras la agenda se desvanece 240 ms más.
  - **Medición** (`r4.mjs`, muestreo cada 4 ms, 2 salidas con el enlace de la barra y 2 con «Atrás» por versión): original, formulario y vista desaparecen juntos a **236, 238, 243 y 247 ms**; código nuevo, formulario a **16, 12, 14 y 13 ms**, vista a **241, 240, 250 y 251 ms**. Capturas a ≈ 40 ms del clic: `r4-orig-40.png` (formulario completo) frente a `r4-new-40.png` (sin formulario, la agenda desvaneciéndose).
  - **Causa:** `SchedulePage` pinta `{draft ? <SessionDraftSlip …/> : null}`; al quedar `draft` en `null` la papeleta se desmonta sin su animación de salida. El plan lo previó (R4) y deja la solución: cerrar el borrador al terminar la salida.
  - **Pasos:** `/agenda`, pulsar un bloque de la semana (se abre «Anotar una sesión»), pulsar «Mi ficha» en la barra o «Atrás».
  - **Decisión pendiente del usuario/planner:** (a) cerrar el borrador al terminar la animación de salida (cambio acotado a `StoreBridge`/`routeChanged`), o (b) aceptar la diferencia y añadirla a RNF-2.
- **D-016-3 (media; criterio de la spec no cumplido literalmente; causa en el modo de red de TanStack, no en el almacén) — con «Sin conexión» activado, «Reintentar» no mantiene el error en el filtro sin lista recibida y en ningún caso muestra «Actualizando».**
  - **Síntoma:** con «Sin conexión» (`navigator.onLine === false`) TanStack Query (`networkMode: 'online'`, el valor por defecto; `queryClient.ts` no lo cambia) **no envía la petición: la deja `paused`** y nunca falla. (a) Con lista recibida (V1: `all:error/paused`), la semana y el panel conservan el error pero **no se ve «Actualizando»** (`isFetching` es falso). (b) **Sin lista recibida del filtro (V2: `r6:pending/paused`)**, «Reintentar» hace desaparecer el error: la semana muestra la lista provisional del filtro anterior y el panel «Cargando…» (el panel ni dice «Sin conexión» ni muestra «Actualizando»), hasta que vuelve la red; entonces se reanuda solo y resuelve (comprobado: «Mis sesiones» sin pulsar nada). Es lo que pide RF-25/DT-12 al revés («semana y panel siguen con el error, sin “Cargando…”»). El mismo pausado ocurre en el original (`d3`: sin conexión, la semana de R6 muestra la lista anterior sin error), pero el original no prometía el error retenido.
  - **Causa:** `retained` en `SchedulePage` (plan §5.3) exige `sessionsQuery.isFetching`, y en pausa `isFetching` es falso (`fetchStatus: 'paused'`). Además, con «Sin conexión» ya activado antes de pedir, la lista nunca falla, así que el criterio «red cortada» solo se puede cumplir con el corte con la petición en vuelo (que sí se comprobó: `g2 offline` y `g3`).
  - **Pasos (V2):** crear una sesión con «Todos los juegos» reteniendo la lista, pulsar el filtro «Rainbow Six Siege», cortar la red y soltar la petición (error en semana y panel), dejar «Sin conexión» y pulsar «Reintentar» en la semana. Script: `d2.mjs offline V2` (`d2-final.out`).
  - **Decisión pendiente del usuario/planner:** (a) contar la pausa como «reintento en curso» (`retained` con `fetchStatus !== 'idle'`) y mostrar «Actualizando» también en pausa; (b) `networkMode: 'always'` en `useSessions` (la petición sale y falla de verdad; cambia el comportamiento de la agenda frente al original, fuera de RNF-2); (c) corregir el criterio de la spec: «red cortada» = corte con la petición en vuelo, y declarar la pausa como comportamiento aceptado.

### Observación a decidir (no se abre como defecto)
- **O-016-1 — CR-1, solape de unos 500 ms de las dos ventanas.** Al cerrar «¿Cancelar esta sesión?» con «Volver» o con 204, «Anotar una sesión» se abre **mientras la ventana de cancelar hace su animación de salida**: traza a 50 ms, `3ms:C+A 519ms:A` (con «Volver») y `1ms:C 53ms:C+A 570ms:A` (con 204; C = «¿Cancelar…?», A = «Anotar…»). Al final solo queda una ventana, y antes de cerrar nunca hubo dos (`g7 cr1`, 1.1 y 2.1). El criterio dice «solo hay una ventana» y «al cerrarla… se abre»; el solape de la animación de salida parece admisible, pero lo decide el usuario (si no, abrir el formulario al terminar la salida de la otra ventana).

### RF-21, RF-22 y RNF-6 (herramientas de depuración)
- **RF-21 sin extensión (desarrollo, carga completa, sin recargas en caliente):** entrar, volver a la agenda, cambiar de filtro, ir a Mi ficha y a Coincidencias, 4 vueltas completas y una más: **0 errores de consola y 0 avisos de los almacenes** (como máximo uno por almacén: se cumple). `zustand@5.0.16` ya no emite el aviso de la extensión que falta (`devtools` solo conecta si existe `window.__REDUX_DEVTOOLS_EXTENSION__`; sin ella devuelve el almacén sin más): por eso son 0 y no 1 por almacén. Script `g10.mjs`, salida `g10-sin.out`. **Hecho de verdad.**
- **RF-21 con la extensión: SIMULACIÓN MÍNIMA, no es la extensión real.** Se inyectó con `Page.addScriptToEvaluateOnNewDocument` un `window.__REDUX_DEVTOOLS_EXTENSION__` falso (`connect/init/send/subscribe`) que solo anota las llamadas. Resultado: los dos almacenes llaman a `connect` con nombres distintos, `TeamMatchUp · sesión iniciada` y `TeamMatchUp · agenda`, y los 17 cambios enviados llevan nombre de operación (ninguno `anonymous`): `agenda/routeChanged`, `agenda/setFilter`, `agenda/reset`, `auth/checked`, `auth/login`. Esto prueba el contrato con la API de la extensión, **no que el panel real los muestre**. Script `g10.mjs sim`, `g10-sim.out`.
- **RF-22 y RNF-6, construcción de producción con el procedimiento de la spec 010, sin variables nuevas:** `cd backend && npm run build:ui` (compila con `tsc -b && vite build` y copia a `backend/dist`; `built in 1.16s`) y servidor con `NODE_ENV=production` (`node src/index.ts`; solo variables del proceso `PORT`, `MONGODB_DBNAME` y un `JWT_SECRET` temporal, porque el del `.env` no se podía reutilizar en producción sin tocarlo; ninguna variable nueva de la 016) en :3419 sirviendo `backend/dist`. En esa construcción, con la extensión simulada presente, **0 `connect`, 0 `init` y 0 `send`** tras entrar, salir y volver varias veces, **0 avisos y 0 errores de consola**, y la aplicación funciona. Script `g10.mjs prod`, `g10-prod.out`. Para no dejar las carpetas de la construcción del usuario cambiadas, `backend/dist` y `frontend/dist` (ambas ignoradas por git) se copiaron antes y se **restauraron idénticas** al terminar (`diff -r` sin diferencias). **Hecho de verdad solo en lo que no depende de la extensión real.**

### Pasos que se dejaron al usuario (extensión real; hechos, ver la sección siguiente)
1. **RF-21, la extensión real.** Con `npm run dev` y la extensión Redux DevTools instalada en un Chrome normal (con el backend en 3001, base temporal `tmu_016_manual` o la que prefieras): abrir `http://localhost:5173`, abrir el panel Redux de las herramientas del navegador y comprobar que (a) en el selector de instancias aparecen **dos**, «TeamMatchUp · sesión iniciada» y «TeamMatchUp · agenda»; (b) al iniciar sesión se ve `auth/login` en la primera; (c) al entrar en `/agenda`, cambiar de filtro, abrir una sesión y salir se ven `agenda/routeChanged`, `agenda/setFilter`, `agenda/selectSession`… en la segunda, con nombre de operación (ninguno «anonymous»).
2. **RF-22, la extensión real en producción.** `cd backend && npm run build:ui && npm run build`, arrancar con `NODE_ENV=production` y un `JWT_SECRET` propio (`npm start` con el `.env` de producción), abrir la dirección del servidor con la extensión instalada y comprobar que **no aparece ninguna instancia** en el panel Redux y que la consola no muestra el aviso de la extensión.
Cuando el usuario confirmara ambos pasos, se marcaba T9 (hecho abajo).

### RF-21, RF-22 y RNF-6 con la extensión real: hecho por el usuario en Firefox (declarado por el usuario, 2026-11-22)
Los dos pasos de arriba los hizo el usuario personalmente el 2026-11-22 en Firefox con la extensión real Redux DevTools. Lo que declaró, y nada más:
- **RF-21, en desarrollo** (`npm run dev`, `http://localhost:5173`): ve las dos instancias con los nombres exactos «TeamMatchUp · sesión iniciada» y «TeamMatchUp · agenda». En la primera aparecen `auth/login` y `auth/checked`; en la segunda `agenda/reset`, `agenda/routeChanged` y `agenda/setFilter`, y también `agenda/selectSession` («si está»). Ninguna acción aparece como «anonymous».
- **RF-22 y RNF-6, en la construcción de producción** servida por el backend en `http://localhost:3001` (procedimiento de la spec 010: `npm run build:ui`, `npm run build`, `NODE_ENV=production` con su propio `JWT_SECRET`): el panel Redux muestra «No store found. Make sure to follow the instructions.» (ninguna instancia) y la consola está bien: «esta todo bien» (sin avisos de la extensión ni errores de los almacenes).

Resultado: RF-21, RF-22 y RNF-6 cumplidos (declarado por el usuario). Sin salidas ni capturas aportadas por el usuario; el `implementer` no las vio. Con esto, junto con T9b hecha, **T9 queda marcada**.

### Sin comprobar (límites del entorno)
- El anuncio a lectores de pantalla («Cargando…» como estado): se comprobó en el código (`Working` lleva `role="status"`, plan §5.4) pero no con un lector. «Pestaña oculta» y NVDA no entran en T9.
- En modo simulado: servidor detenido, «Sin conexión», plazo de 30 s y carga fallida (no hay red) y «ya no vinculado».
- Las pruebas de pantalla repetidas con otras cuentas: cada grupo usó cuentas nuevas y la misma base; no se probó la agenda con más de 10 sesiones propias.
- Las diferencias respecto al original que se vieron son solo las de RNF-2, más D-016-2 y D-016-3, que no lo son.

### Limpieza
Procesos detenidos: backend :3416, backend de producción :3419, Vite :5416, :5417, :5418 y :5428 y todos los Chrome de los scripts (puertos 9601 a 9741); no se tocaron el backend de :3001 ni el Vite de :5173 del usuario. Base temporal **`tmu_016_t9` borrada** (`mongosh`, `dropDatabase`; quedó solo `tmu_016_manual`, que no es de este recorrido). Los scripts y salidas quedan en el scratchpad de la sesión (`scratchpad/t9/`, no versionados).

## T9b. Corrección de D-016-2 y D-016-3
RF-25, DT-12, RNF-2, RF-15, RF-30, R4. Fecha: 2026-11-22. Decisiones del usuario: «D-016-3: opción 1. D-016-2: opción (a). O-016-1: admisible.» y, sobre la pregunta Q1, «(ii)» (la corrección de D-016-2 va en la vista, el almacén no cambia), «Apruebo T9b y la nota del plan. No dividir la spec.» No se tocó `spec.md`, `networkMode`, `createAgendaStore.ts` ni sus pruebas, el backend ni `agendaResponses.ts`.

**Entorno.** Backend `node src/index.ts` (Node 22.18) en :3416 con la base temporal `tmu_016_t9` (nueva, sembrada con `seed.mjs`/`seedmore.mjs`; **borrada al terminar**); Vite del código actual en :5416 y Vite del original (`scratchpad/t8/orig`, anterior a la 016) en :5428 solo para comparar; Chrome 156 headless por CDP en puertos 9650 a 9690. No se tocaron :3001, :5173, `tmu_016_manual`, `teammatchup` ni el `.env`. **Nota de entorno:** el Vite de :5416 arrancó primero con la caché de dependencias compartida (`frontend/node_modules/.vite`) y servía 504 de `zustand` (caché de dependencias antigua, de antes de instalarla); en vez de tocar esa caché (la usa el Vite del usuario en :5173) se arrancó con una configuración desechable del scratchpad (`vite.t9b.config.ts`, que reutiliza `frontend/vite.config.ts` con otra `cacheDir`). No es un cambio del proyecto.

### Cambios (solo `SchedulePage.tsx`)
- **D-016-3.** `retained` y el indicador «Actualizando» usan `sessionsQuery.fetchStatus !== 'idle'` en vez de `sessionsQuery.isFetching` (cuenta la pausa de TanStack con «Sin conexión» ya activado como reintento en curso).
- **D-016-2 (Q1 = (ii)).** El almacén sigue poniendo `draft = null` al salir (RF-30). La página usa `useIsPresent()` de `motion/react` (la página es hija directa del `AnimatePresence` de `AppLayout`) y, si empieza la salida de la vista con el borrador abierto, guarda una copia local (`exitDraft`, estado de la página) y pinta la papeleta con ella mientras dure la salida. La copia desaparece con la página (al terminar la salida se desmonta) y al volver se monta una página nueva, con `draft = null`: nunca ve un borrador viejo ni reabre el formulario. Si el borrador se cierra con normalidad antes de salir, no hay copia y no se reabre.

### Rojo en navegador (antes de tocar código; `red.out`)
- **D-016-3, `d2.mjs offline V2`** (filtro R6 sin lista recibida, «Sin conexión» ya activado, «Reintentar»): tras el fallo, error en semana y panel; al pulsar «Reintentar» la caché pasa a `r6:pending/paused` y **el error desaparece** (`weekErr:false`, `panelErr:false`), el panel dice «Cargando…» (`loading:true`) y no hay indicador (`spin:false`); la semana pinta la lista provisional. Al volver la red se resuelve solo («Mis sesiones»).
- **D-016-3, `g2.mjs offline V1`:** 1 FALLA, «durante "Reintentar" (petición retenida): semana y panel siguen con el error, "Actualizando" visible…»: el error se mantiene pero `spin:false`.
- **D-016-2, `r4.mjs`** (muestreo cada 4 ms; enlace de la barra ×2 y «Atrás» ×2): código nuevo, formulario desaparece a los **12, 11, 15 y 10 ms**, vista a 245, 249, 242 y 241 ms. Original (:5428): formulario y vista juntos a **235, 245, 233 y 237 ms**.

### Verde en navegador (con los cambios)
- **D-016-3, `d2.mjs offline V2`** («Sin conexión» ya activado, sin lista recibida): tras «Reintentar» (`r6:pending/paused`) la semana y el panel **siguen con el error** («No se pudieron cargar los datos…», «Reintentar», «Reintentar la sesión abierta»), `spin:true` («Actualizando»), `loading:false` y sin esqueleto (`skel:0`), a 0 y 50 ms y tras 1,5 s. Al volver la red, sin pulsar nada: se reanuda y resuelve (`r6:success`, «Mis sesiones»).
- **D-016-3, `g2.mjs offline V1`** (lista recibida): 8 OK y 1 «FALLA» que no es un defecto: el paso «durante Reintentar» pasa a **OK** (error retenido, «Actualizando» visible, sin «Cargando…»). La «FALLA» restante es la comprobación vieja del script «el reintento sin red falla: error visible, **sin** "Actualizando"», que suponía que con «Sin conexión» el reintento falla; con `networkMode: 'online'` (que no se cambia) queda en pausa y, por D-016-3 (opción 1), «Actualizando» **debe** verse mientras tanto (`spin:true`, error visible). El script se escribió antes de la decisión; el mismo paso sale igual en `g2 offline V2`. Al volver la red: tarjeta en «Sesión abierta». Consola sin errores. (`green1.out`, `green-g2-offline-V2.out`: V2 9 OK y la misma comprobación obsoleta.)
- **D-016-2, `r4.mjs`:** formulario y vista desaparecen juntos a **236, 235, 244 y 245 ms** (original 233 a 245 ms). Sin errores de consola. `r4b.mjs` (muestreo cada 4 ms durante 1,5 s): con el enlace de la barra el formulario se ve hasta ≈ 228 ms y con «Atrás» hasta ≈ 222 ms (desde el inicio del muestreo, unos 5 a 10 ms antes del clic), **no reaparece**; al volver (enlace, «Atrás» y por segunda vez) no hay formulario y `draft` es `null`; con el borrador cerrado con «Cancelar» y luego saliendo no se reabre.
- **Regresión.** `g2 stopped V1` 9 OK y 0 FALLA; `g2 stopped V2` 10 OK y 0 FALLA; `g2 slow V1` 8 OK y 0 FALLA; `g2 slow V2` 9 OK y 0 FALLA (error a los 30 s y «Actualizando» sin esqueleto durante «Reintentar»); `g3` 9 OK y 0 FALLA; `g1` (salir y volver, RF-15 y RF-30) 27 OK y 0 FALLA.

### Frontend
`npm test` 105 pruebas en verde (las mismas que antes: 3 archivos; no se tocaron pruebas), `npm run typecheck`, `npm run lint` y `npm run build` sin errores. Sin `.only`, `any` ni `@ts-ignore` nuevos en el código; `git status --short backend/` vacío; `git diff` de `spec.md`, `createAgendaStore.ts` y de `networkMode` (no aparece en `frontend/src`) vacío. D-016-3 no lleva prueba de Vitest (condición de pintado de la página, plan §8); D-016-2 tampoco, por Q1 = (ii) (va en la vista).

### Resultado
- **D-016-2: cerrado.** **D-016-3: cerrado.**
- **O-016-1: aceptada por el usuario (admisible, no se corrige).** El solape de unos 500 ms de las dos ventanas durante la animación de salida de «¿Cancelar esta sesión?» queda como está.
- **Q1 resuelta = (ii):** la corrección de D-016-2 va en la vista; `createAgendaStore.ts` y sus pruebas sin cambios.
- **T9:** con T9b hecha, solo quedaban los pasos RF-21 y RF-22 con la extensión real, que el usuario hizo el 2026-11-22 (ver «RF-21, RF-22 y RNF-6 con la extensión real»): T9 marcada.

### Limpieza
Procesos detenidos: backend :3416, Vite :5416 y :5428 y los Chrome de los scripts. Base temporal `tmu_016_t9` borrada. `frontend/dist` se regeneró con `npm run build` (ignorado por git).

## T10. Cierre documental
RNF-5 y criterios de finalización. Fecha: 2026-11-22.

### Verde final del frontend (en `frontend/`)
- `npm test` -> `Test Files  3 passed (3)`, `Tests  105 passed (105)` (`agendaRules` 15, `createAgendaStore` 50, `createAuthStore` 40). VERDE.
- `npm run typecheck`: sin errores. `npm run lint`: sin errores. `npm run build`: `built in 1.30s`. VERDE.
- Sin `.only`, `any` ni `@ts-ignore` en `src/` (búsqueda en el código). `git status --short backend/`: vacío. `git diff` de `spec.md` previo a este cierre y búsqueda de `networkMode` en `frontend/src`: vacíos (no se tocó).

### Evidencia de rojo y verde por tarea (RNF-5)
- T2: rojo (15 fallan por `T2: sin implementar`) y verde (15) en su sección.
- T3: rojo (36 fallan por `T3: sin implementar`) y verde (38; luego 40 tras D-016-1), con la lista de RNF-5 marcada.
- T5: rojo (49 fallan por `T5: sin implementar`) y verde (50), con la lista de RNF-5 marcada.
- D-016-1 (T8): rojo (3 fallos) y verde (105) en su corrección.
- T1, T4, T6 y T7: verdes anotados (T4, T6 y T7 con la comprobación manual declarada por el usuario).
- T8 y T9: recorridos con navegador real; RF-21, RF-22 y RNF-6 con la extensión real, declarados por el usuario.
- T9b: rojo y verde en navegador (D-016-2 y D-016-3, sin prueba de Vitest por decisión del plan §8); D-016-2 y D-016-3 cerrados y O-016-1 aceptada por el usuario.

### Documentos
- `spec.md`: casillas de «Criterios de finalización» marcadas con su evidencia. Dos matices anotados en ellas: los pasos del detalle de sesión de la 009 no se repitieron (la spec no toca esa vista) y en modo simulado no se pueden hacer los pasos que necesitan red (se cumplen en servidor real). Estado: implementada, pendiente la validación del `reviewer`.
- `AGENTS.md`: los dos almacenes en la estructura del frontend, `npm test` en «Comandos» y la referencia a `HITO2.md` corregida (P3) para que apunte al apéndice A de `spec.md`.
- `MEMORY.md`: estado de la 016, estado del código, deuda conocida y próximo paso.
- `plan.md` §5.3: la nota de T9b concreta que Q1 de T9b se resolvió con (ii).

### No se pudo hacer
- `graphify update .`: `graphify` no está instalado en este entorno (`which graphify` sin resultado). Queda para quien lo tenga.

## Validación del reviewer
Fecha: 2026-11-22. **VEREDICTO: APROBADO.**

- Ejecutó: `npm test` (105 pruebas en verde), `typecheck`, `lint` y `build` del frontend sin errores; comprobó que el backend está intacto; revisó RF por RF y RNF por RNF. Todos los RF y RNF: CUMPLE.
- Declarados por el usuario (no reproducidos por el `reviewer`): RF-21, RF-22 y RNF-6 con la extensión real de Redux DevTools (Firefox), y las comprobaciones manuales de T4, T6 y T7.
- Recorridos automatizados por el `implementer` que el `reviewer` no reprodujo: T8, T9 y T9b.
- Observaciones no bloqueantes:
  1. El indicador «Actualizando» también se muestra cuando TanStack Query pausa una lista por «Sin conexión». Es consecuencia de D-016-3 opción 1, decidida por el usuario. No figuraba en la lista de diferencias de RNF-2; el usuario aprobó añadirla (punto 8 de RNF-2 en `spec.md`, 2026-11-22).
  2. En la sección T9, fila de recarga, el estado inicial citado no incluía `visit`, que sí figura en T8. Corregido: ahora incluye `"visit":null`.
