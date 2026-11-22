# Plan 016 — Estado global de la sesión iniciada y de la agenda
Estado: aprobado (2026-11-21, usuario). Preguntas P1 a P3 decididas por el usuario el 2026-11-21
(§12).

Spec: `specs/016-estado-global/spec.md` (aprobada el 2026-11-21, con D1 a D10, C1, C2, Q1, Q2, I-1,
I-2 y el cambio CR-1). Base: rama `feature/vinculacion-steam-riot`, commit `4983ec8`. Orden de
implementación aprobado: **016 → 017 (Mantine) → 018 (E2E)**: la 017 toma la línea base visual con
esta spec hecha y usa el Vitest que instala esta spec (§1, §9).

Esta spec no toca `backend/`, el contrato de datos (`services/apiContract.ts`), el transporte ni el
modo simulado.

## 0. Estado real del código (leído el 2026-11-21)
- `features/auth/AuthProvider.tsx` + `AuthContext.ts` + `useAuth.ts`: el estado de la sesión
  iniciada vive en `useState` y se reparte por contexto. Para el aviso de 401 (`onUnauthorized`,
  fuera de React) y el aviso entre pestañas (`startWatching`) mantiene copias a mano en
  `sessionRef`, `locationRef` y `navigateRef`. `clearClientSession` hace `flushSync` del paso a
  `anonymous` antes de `abortAllRequests`, `cancelQueries` y `clear` (defecto D-A2, T31 de la 007).
  La consulta de sesión va fuera de TanStack Query, con un número de intento (`attemptRef`) que
  descarta respuestas viejas y cubre el doble montaje de `StrictMode`.
- `app/providers/AppProviders.tsx`: `ThemeProvider > QueryClientProvider > BrowserRouter >
  AuthProvider`. `App.tsx`: `SessionGate > AppRouter` dentro de los proveedores (Q1: la navegación
  está siempre montada; las rutas no se montan en `checking` ni `error`).
- `features/sessions/pages/SchedulePage.tsx`: filtro (`gameFilter`), sesión abierta (`selectedId`) y
  borrador (`draft`) en `useState`; la propuesta llega por `location.state.proposal` y se valida con
  `readProposal`; un efecto cierra la sesión abierta si no está en `sessions` (hoy también la recién
  creada, H1/D6). `SessionDraftSlip` llama a `onCreated(created.id)` **después** de que
  `useCreateSession` haya ejecutado su `onSuccess` (`markAgendaStale`, que ya lanzó la nueva
  petición de la lista).
- `features/sessions/hooks.ts`: `useSessions` con `placeholderData: keepPreviousForUser(userId)`; su
  `queryFn` no lee la señal de cancelación. `agendaCache.ts` escribe las listas con
  `setQueriesData` (unirse, salir, editar, cancelar) y luego las invalida.
- `app/layouts/AppLayout.tsx`: `AnimatePresence mode="wait"` con clave `location.pathname`: la vista
  que se va sigue montada durante su animación de salida y la nueva se monta después.
- `frontend/package.json`: sin script `test`, sin Zustand ni Vitest. Instalados: React 18.3.1,
  Vite 5.4.21, TypeScript 5.9.3, TanStack Query 5.102.8 (`@tanstack/query-core` y
  `@tanstack/react-query`).

## 1. Dependencias (RNF-1)
| Paquete | Versión exacta | Tipo | Justificación |
| --- | --- | --- | --- |
| `zustand` | `5.0.16` | producción | Enunciado («Zustand o Redux Toolkit») y decisión del usuario. Zustand 5 admite React ≥ 18 y usa `useSyncExternalStore` de React 18 (sin el paquete opcional `use-sync-external-store`). Trae `devtools` (`zustand/middleware`) y `useShallow` (`zustand/react/shallow`): RF-21 sin otra dependencia. |
| `vitest` | `3.2.4` | desarrollo | D3. Es la última línea que admite Vite 5: Vitest 4 retiró Vite 5 y exigirlo obligaría a actualizar Vite (fuera de alcance). Vitest 3.2 declara `vite` `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0-0`, así que npm reutiliza el Vite 5.4.21 instalado. |

- **Ninguna otra dependencia** (H13 a): las pruebas corren con `environment: 'node'`. No hace
  falta `jsdom` ni `happy-dom` porque (a) los almacenes se crean con fábricas que reciben desde
  fuera el contrato de datos, la memoria de datos, el transporte, la navegación, la ruta, el aviso
  entre pestañas y `flushSync` (§3, DT-1); (b) las pruebas usan el almacén «vanilla» de Zustand
  (`createStore`, `getState`, `subscribe`), sin React; (c) las reglas puras no tocan el DOM.
  Tampoco `@testing-library/*`: no se prueban vistas (spec, «Fuera de alcance»).
- **Comprobación de versiones (H13 b), en T1, antes de instalar**: `npm view zustand@5.0.16
  version` y `npm view vitest@3.2.4 dependencies.vite` (debe incluir `^5.0.0`). Después: `npm ls
  vite` muestra un único `vite@5.4.21` y `npm install` no avisa de dependencias incompatibles.
  `zustand@5.0.16` es la última 5.0.x que encontró el planificador el 2026-11-21 (espejo de unpkg);
  **si `npm view` no la encuentra, T1 se detiene y se pregunta al usuario** (no se elige otra a
  ciegas).
- Instalación: `npm install --save-exact zustand@5.0.16` y `npm install --save-exact --save-dev
  vitest@3.2.4` en `frontend/`.

## 2. Archivos y responsabilidades
Rutas relativas a `frontend/`.

### Configuración
- **`package.json`** (modifica). RNF-1, RNF-5. Dependencias de §1 y script `"test": "vitest run"`.
- **`package-lock.json`** (modifica, lo escribe npm).
- **`vitest.config.ts`** (nuevo). RNF-5. Alias `@` → `./src` (el mismo de `vite.config.ts`),
  `test: { environment: 'node', include: ['src/**/*.test.ts'], allowOnly: false, restoreMocks:
  true }`. Archivo aparte de `vite.config.ts` para no tocar la configuración de la construcción
  (spec 010). Sirve tal cual a la spec 017 para sus reglas puras (sin navegador simulado); si la
  017 necesitara otro entorno, lo declararía su plan.
- **`tsconfig.node.json`** (modifica). Añade `vitest.config.ts` a `include`.
- **`eslint.config.js`** (modifica). RNF-5 («sin `.only`»): regla `no-restricted-properties` para
  `describe.only`, `it.only` y `test.only`. Con `allowOnly: false`, Vitest además falla si queda un
  `.only` que el lint no vea (alias importado con otro nombre, deuda de la spec 001).
- Las pruebas importan `describe`, `it`, `expect`, `vi` de `vitest` (sin globales): `tsconfig.app`
  no cambia y `tsc -b` comprueba los tipos de las pruebas (RNF-3). `vite build` no las incluye
  porque nada de `src/` las importa.

### Dominio (reglas puras; sin React, sin almacén, sin reloj; RNF-4)
- **`src/domain/agendaRules.ts`** (nuevo). RF-13, RF-29, RNF-4. Las dos reglas puras de la spec:
  - `draftGame(filter, accounts): GameId | null` (RF-13).
  - `proposalDecision(input): ProposalDecision` (RF-29, seis casos con CR-1).
  - Tipos `AgendaFilter = GameId | 'all'`, `PendingProposal` (juego, día, hora de inicio, duración
    y título; sin cupos ni notas), `DraftValues`, `DraftAccounts`, `ProposalAccounts`,
    `ProposalDecision`.
- **`src/domain/agendaRules.test.ts`** (nuevo). RNF-5 (reglas puras).
- `src/domain/proposal.ts` no cambia (`buildProposal`, `PROPOSAL_DEFAULTS`); `PendingProposal` se
  obtiene de `Proposal` con `Omit<Proposal, 'slots' | 'notes'>`.

### Almacén de la sesión iniciada
- **`src/features/auth/createAuthStore.ts`** (nuevo). RF-1 a RF-8, RF-16 (aviso), RF-21 (nombres de
  las operaciones). Fábrica `createAuthStore(deps, devtools)` que devuelve un almacén «vanilla» de
  Zustand. Solo importa tipos de `@/domain/types` y de `@/services/apiContract`, más `ROUTES` e
  `isProtectedPath` de `@/app/routes` y `NO_MESSAGE_TEXT` de `@/shared/utils/copy` (módulos sin
  efectos al importarse). **No importa `@/services/api`**: ese módulo importa el simulado, que
  escribe en `localStorage` al cargarse (deuda de la 007) y rompería las pruebas en Node.
- **`src/features/auth/createAuthStore.test.ts`** (nuevo). RNF-5 (almacén de la sesión iniciada).
- **`src/features/auth/authStore.ts`** (nuevo). RF-1, RF-21, RF-22, RNF-6. Instancia única con las
  dependencias reales (`api`, `isSessionCleared`, `queryClient`, `abortAllRequests`,
  `currentEpoch`, `clearCsrfIfOwn`, `announce`, `startWatching`, `onUnauthorized`, `flushSync` de
  `react-dom`, `resetAgenda` del almacén de la agenda) y `devtools = { name: 'TeamMatchUp · sesión
  iniciada', enabled: import.meta.env.DEV }`. Exporta `authStore` y `useAuthStore(selector)`
  (`useStore` de Zustand).
- **`src/features/auth/useAuth.ts`** (modifica). RF-1, RF-9. Fachada con la misma forma que hoy
  (`status`, `user`, `sessionError`, `retry`, `login`, `register`, `logout`, `setUser`) leída del
  almacén con `useShallow`. Ningún consumidor (`SessionGate`, `ProtectedRoute`, `AppLayout`,
  `LoginPage`, `RegisterPage`, `SchedulePage`, perfil, etc.) necesita cambiar (DT-3). El tipo
  `SessionStatus` pasa a exportarse desde `createAuthStore.ts`; si algún archivo importa tipos de
  `AuthContext`, pasa a importarlos de ahí.
- **`src/features/auth/useSessionUserId.ts`** (modifica). RF-9. Selector directo:
  `useAuthStore(s => s.session.status === 'authenticated' ? s.session.user.id : null)`.
- **`src/features/auth/AuthProvider.tsx`** y **`AuthContext.ts`** (se borran). RF-1 («ya no existe
  el reparto por contexto»).
- `src/features/auth/crossTabSession.ts`, `services/http/sessionEvents.ts`, `transport.ts`,
  `csrfStorage.ts`: no cambian; el almacén los recibe como dependencias.

### Almacén de la agenda
- **`src/features/sessions/createAgendaStore.ts`** (nuevo). RF-10 a RF-16, RF-23 a RF-30, RF-21.
  Fábrica `createAgendaStore(devtools)`. Solo importa de `@/domain/` (reglas y tipos).
- **`src/features/sessions/createAgendaStore.test.ts`** (nuevo). RNF-5 (almacén de la agenda).
- **`src/features/sessions/agendaStore.ts`** (nuevo). Instancia única con `devtools = { name:
  'TeamMatchUp · agenda', enabled: import.meta.env.DEV }`; exporta `agendaStore` y
  `useAgendaStore(selector)`.
- **`src/features/sessions/agendaResponses.ts`** (nuevo). RF-24 a RF-26, D10, I-1. Pegamento entre
  la memoria de datos y el almacén: `watchAgendaResponses(queryCache, { currentUserId, onResponse
  })` se suscribe a la caché de TanStack Query y llama a `onResponse(filter, ids)` solo con las
  respuestas **del servidor** (§4.3). Sin React. Es la única pieza que distingue una respuesta de
  una escritura local de la memoria de datos.
- **`src/features/sessions/hooks.ts`** (modifica). RF-24. `useCreateSession` recibe `{ payload,
  agendaVisit }` y en `onSuccess`, **antes** de `markAgendaStale`, llama a
  `agendaStore.getState().creationConfirmed(created.id, agendaVisit)` (DT-9). `useSessions` no
  cambia; su `queryFn` sigue sin leer la señal (R9).
- **`src/features/sessions/components/SessionDraftSlip.tsx`** (modifica). RF-13.f, RF-24. Al enviar
  lee `agendaStore.getState().visit` y lo pasa a la escritura; retira `onCreated` (el almacén abre la
  sesión creada). Lo escrito, su error y «Enviando…» siguen locales (RF-17).
- **`src/features/sessions/pages/SchedulePage.tsx`** (modifica). RF-11 a RF-13, RF-15, RF-17,
  RF-23, RF-25 a RF-28. Lee filtro, sesión abierta, borrador y propuesta del almacén; retira
  `readProposal` y el `navigate(pathname, { replace: true, state: null })` de la propuesta (ya no
  hay propuesta en el estado de la navegación; la marca de foco de la spec 009, RF-8, se queda como
  está). Detalle en §5.
- **`src/shared/components/States.tsx`** (modifica). RF-25. `Failure` acepta `retryLabel?: string`
  (nombre accesible del botón; el texto visible sigue siendo «Reintentar»). Sin él, nada cambia.
- **`src/features/matches/pages/MatchesPage.tsx`** y el punto de la ficha de jugador que hoy hace
  `navigate(ROUTES.schedule, { state: { proposal } })` (`src/features/players/`, spec 008, RF-7)
  (modifican). RF-14. `agendaStore.getState().propose(p)` y después `navigate(ROUTES.schedule)` sin
  estado. La guarda `proposing` contra dos pulsaciones sigue.

### Pieza dentro de la navegación (Q1)
- **`src/app/StoreBridge.tsx`** (nuevo). RF-1, RF-2, RF-6, RF-7, RF-15, RF-24, RF-30. Componente sin
  interfaz que vive dentro de `BrowserRouter` y fuera de `SessionGate` (montado siempre, también en
  `checking` y `error`), como hoy `AuthProvider`. Efectos, en este orden:
  1. `useEffect` sobre `[location, navigate]`: `authStore.getState().attachRouter({ pathname: () =>
     location.pathname, navigate })` (mismo momento en que hoy se actualizan `locationRef` y
     `navigateRef`) y `agendaStore.getState().routeChanged(isSchedulePath(location.pathname))`.
  2. `useEffect` sin dependencias: `return authStore.getState().start()` (consulta de sesión,
     aviso de 401 y aviso entre pestañas; la función devuelta los retira y deja viejo el intento en
     curso, como hoy el desmontaje de `StrictMode`).
  3. `useEffect` sin dependencias: `return watchAgendaResponses(queryClient.getQueryCache(), {
     currentUserId: () => userIdOf(authStore.getState()), onResponse: (f, ids) =>
     agendaStore.getState().listResponded(f, ids) })`.
- **`src/app/providers/AppProviders.tsx`** (modifica). `<BrowserRouter><StoreBridge />{children}
  </BrowserRouter>`, sin `AuthProvider`. El orden de montaje de la navegación y las rutas no cambia
  (Q1, opción A).
- **`src/app/routes.ts`** (modifica). `isSchedulePath(pathname)`: `true` solo para `/agenda` (con o
  sin barra final, como normaliza `isProtectedPath`); el detalle `/agenda/:id` es «salir de la
  agenda» (Definiciones).

## 3. Almacén de la sesión iniciada (RF-1 a RF-9)

### 3.1 Estado e interfaz
```ts
type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; message: string };

interface AuthState {
  session: Session;                                   // lo único que se ve en las herramientas (RF-21)
  start(): () => void;                                // RF-2, RF-6, RF-7
  retry(): void;                                      // RF-2
  login(credentials: Credentials, redirectTo: string): Promise<void>;   // RF-3
  register(payload: RegisterPayload): Promise<void>;  // RF-4
  logout(): Promise<void>;                            // RF-5
  setUser(user: User): void;                          // RF-8
  attachRouter(access: RouterAccess): void;           // Q1
}

interface RouterAccess {
  pathname(): string;
  navigate(to: string, options: { replace: true; state?: LoginState }): void;
}

interface AuthDeps {
  api: Pick<ApiContract['auth'], 'me' | 'login' | 'register' | 'logout'>;
  isSessionCleared(error: unknown): boolean;
  queryCache: { clear(): void; cancelQueries(): Promise<void> };  // QueryClient lo cumple
  abortAllRequests(): void;
  currentEpoch(): number;
  clearCsrfIfOwn(): void;
  announce(kind: 'login' | 'logout'): void;
  startWatching(onChange: () => void): () => void;
  onUnauthorized(handler: (epoch: number) => void): () => void;
  flushSync(update: () => void): void;
  resetAgenda(): void;                                // RF-16
}
```
- El acceso a la navegación (`RouterAccess`) vive en el cierre de la fábrica, **no** en el estado:
  no es una copia del estado de la sesión iniciada (RF-1), no se envía a las herramientas de
  depuración y no provoca repintados. Antes de `attachRouter`, `pathname()` devuelve `''` y
  `navigate` no hace nada (en la práctica no ocurre: el efecto 1 de `StoreBridge` corre antes que
  el 2).
- Ni el comprobante anti-CSRF ni las contraseñas entran en el estado: las credenciales solo son
  argumentos de `login` y `register` (RF-21).
- Cada `set` lleva el nombre de la operación (`'auth/check'`, `'auth/checked'`, `'auth/retry'`,
  `'auth/login'`, `'auth/cleared'`, `'auth/setUser'`) para RF-21.

### 3.2 Algoritmo (mismo comportamiento que `AuthProvider`; se traslada, no se rediseña)
```
attempt = 0                                           // cierre de la fábrica

clearClientSession({ deleteCsrf }):                   // «limpiar la sesión del cliente»
  deps.resetAgenda()                                  // RF-16: antes de pintar nada sin usuario
  if session.status == 'authenticated':
    deps.flushSync(() => set({ session: anonymous }, 'auth/cleared'))   // D-A2 (RF-6, último punto)
  deps.abortAllRequests()                             // sube la época (RF-6: 401 viejos)
  void deps.queryCache.cancelQueries(); deps.queryCache.clear()
  if deleteCsrf: deps.clearCsrfIfOwn()

check():                                              // RF-2
  attempt += 1; mine = attempt
  deps.api.me().then(
    restored => if mine != attempt: return
                 restored ? set(authenticated(restored))
                          : (clearClientSession({ deleteCsrf: true }); set(anonymous)),
    error    => if mine != attempt: return
                 if deps.isSessionCleared(error): check(); return   // limpieza la canceló: se repite
                 set(error(message de error o NO_MESSAGE_TEXT)))

start():  check(); off401 = deps.onUnauthorized(on401); offTabs = deps.startWatching(onOtherTab)
          return () => { attempt += 1; off401(); offTabs() }      // StrictMode: el 1.er intento queda viejo
retry():  set(checking); check()

enter(user, to):                                      // RF-3, en un solo paso
  deps.queryCache.clear(); deps.resetAgenda()         // RF-16 al entrar un usuario
  set(authenticated(user)); deps.announce('login'); router.navigate(to, { replace: true })
login(c, to):   user = await deps.api.login(c); enter(user, to)
register(p):    await deps.api.register(p)            // su error llega al formulario
                try user = await deps.api.login(p) catch: router.navigate(login, { replace, state: { email, notice: 'registered' } }); return
                enter(user, ROUTES.home)
logout():       try await deps.api.logout() catch {}  // RF-5
                clearClientSession({ deleteCsrf: true }); deps.announce('logout'); router.navigate(login, { replace: true })
setUser(u):     if session.status == 'authenticated': set(authenticated(u))   // RF-8

on401(epoch):                                         // RF-6
  if epoch != deps.currentEpoch(): return
  path = router.pathname(); from = isProtectedPath(path) ? path : undefined
  if authenticated: clearClientSession({ deleteCsrf: true }); router.navigate(login, { replace, state: { from, notice: 'expired' } })
  else router.navigate(login, { replace, state: { from } })
onOtherTab():                                         // RF-7
  signedIn = authenticated; path = router.pathname()
  clearClientSession({ deleteCsrf: false })
  if signedIn && isProtectedPath(path): router.navigate(login, { replace, state: { from: path, notice: 'otherTab' } })
```
- **Sin vista intermedia (RF-3)**: `set` del almacén y `navigate` ocurren en la misma tarea; React 18
  agrupa la actualización de `useSyncExternalStore` (carril síncrono, vaciado en una microtarea) con
  la del router, igual que hoy agrupa `setSession` y `navigate`.
- **D-A2 (RF-6)**: el `flushSync` inyectado fuerza a React a pintar «sin usuario» antes de vaciar la
  memoria; así ninguna consulta montada se relanza. En las pruebas, `flushSync` es `(fn) => fn()`
  que además anota su llamada, y la prueba comprueba que, cuando la memoria se vacía, el estado ya
  es `anonymous`.
- **CSRF (RF-3, RF-5)**: el comprobante lo guarda hoy el cliente HTTP al iniciar sesión; el almacén
  solo lo borra (`clearCsrfIfOwn`) en `logout` y en las limpiezas con `deleteCsrf: true`, siempre
  antes de `announce` (RF-5).
- **Consulta de sesión fuera de TanStack Query** (DT-5): sin reintentos ni caché, como hoy.

## 4. Almacén de la agenda (RF-10 a RF-16, RF-23 a RF-30)

### 4.1 Estado e interfaz
```ts
interface OpenSession { id: string; pending: boolean }   // pending = «por confirmar»

interface AgendaState {
  filter: AgendaFilter;                    // RF-11, RF-15
  open: OpenSession | null;                // RF-10: solo el identificador
  draft: DraftValues | null;               // RF-13: juego, día, hora, duración?, título?
  proposal: PendingProposal | null;        // RF-14
  visit: number | null;                    // visita en curso a /agenda; null fuera (DT-16, P2 aceptada)

  routeChanged(onAgenda: boolean): void;                       // RF-15, RF-30
  setFilter(filter: AgendaFilter): void;                       // RF-11
  selectSession(id: string): void;                             // RF-12
  showMine(): void;                                            // RF-23
  openDraft(slot: { day: WeekDay; startHour: number }, accounts: DraftAccounts): void;  // RF-13
  closeDraft(): void;                                          // RF-13.f
  creationConfirmed(sessionId: string, visit: number | null): void;   // RF-24
  listResponded(filter: AgendaFilter, ids: readonly string[]): void;  // RF-26
  visibleListChanged(ids: readonly string[] | null): void;     // RF-27
  sessionCancelled(id: string): void;                          // RF-27 (204)
  propose(proposal: PendingProposal): void;                    // RF-14
  resolveProposal(env: { signedIn: boolean; accounts: ProposalAccounts; cancelDialogOpen: boolean }): void;  // RF-28
  reset(): void;                                               // RF-16
}
```
Estado inicial (Definiciones): `filter: 'all'`, `open: null`, `draft: null`, `proposal: null`,
`visit: null`. Contador de visitas en el cierre de la fábrica (`lastVisit`). Nada de datos del
servidor (RF-10): ni sesiones, ni cuentas, ni nombres; el título de la propuesta es el texto ya
compuesto por la interfaz (inventario).

### 4.2 Transiciones (pseudocódigo; cada `set` lleva el nombre `'agenda/<acción>'`)
```
routeChanged(onAgenda):
  if onAgenda && visit == null:  visit = ++lastVisit                           // volver/llegar
  if !onAgenda && visit != null:                                               // salir (RF-15, RF-30)
    visit = null; draft = null; proposal = null
    open = open ? { id: open.id, pending: true } : null                        // DT-7
  (en cualquier otro caso no hace nada: idempotente con StrictMode)

setFilter(f):        filter = f                                                // la sesión abierta sigue RF-25 a RF-27
selectSession(id):   open = { id, pending: false }                             // RF-12: termina la espera
showMine():          open = null                                               // RF-23
openDraft(slot, a):  g = draftGame(filter, a); if g == null: return            // RF-13.b, .c, .d
                     draft = { gameId: g, day: slot.day, startHour: slot.startHour }
closeDraft():        draft = null
creationConfirmed(id, v):
  if visit == null || v != visit: return                                       // RF-24, segundo párrafo
  draft = null; open = { id, pending: true }                                   // sustituye a la que hubiera
listResponded(f, ids):
  if visit == null || open == null || !open.pending || f != filter: return     // solo con la agenda en pantalla
  open = ids.includes(open.id) ? { id: open.id, pending: false } : null        // RF-26
visibleListChanged(ids):
  if open == null || open.pending: return                                      // por confirmar: RF-25
  if ids == null || !ids.includes(open.id): open = null                        // RF-27
sessionCancelled(id): if open?.id == id: open = null                           // RF-27, también por confirmar
propose(p):          proposal = p                                              // RF-14: sustituye
resolveProposal(env):                                                          // RF-28
  if visit == null || proposal == null: return
  d = proposalDecision({ proposal, signedIn: env.signedIn, accounts: env.accounts,
                         agendaWindowOpen: env.cancelDialogOpen || draft != null })
  wait    → nada
  discard → proposal = null
  apply   → en un solo set: draft = d.draft; filter = 'all'; proposal = null
reset():             filter = 'all'; open = null; draft = null; proposal = null
                     visit = visit == null ? null : ++lastVisit                // invalida confirmaciones de antes
```

### 4.3 Respuesta que decide con TanStack Query v5 (D7, D10, I-1, I-2; RF-24 a RF-27)
**Comprobación hecha contra la versión instalada, 5.102.8** (`frontend/node_modules/@tanstack/
query-core/src/query.ts`, `queryObserver.ts`, `queryCache.ts`, `queryClient.ts`,
`notifyManager.ts`; `react-query/src/useBaseQuery.ts`):

1. **Respuesta frente a escritura local.** Una petición que termina bien despacha
   `{ type: 'success' }` **sin** `manual` (`Query.fetch` → `setData(data)`); `setQueryData` y
   `setQueriesData` despachan `{ type: 'success', manual: true }`. Las dos suben `dataUpdatedAt` y
   `dataUpdateCount`, así que esos contadores **no** sirven para reconocer una respuesta (unirse,
   salir o cancelar en la agenda escriben las listas a mano). El campo `manual` sí.
2. **Orden.** `#dispatch` asigna `this.state` y, dentro del mismo `notifyManager.batch`, avisa a los
   observadores y después a los oyentes de la caché (`QueryCache.notify`, síncrono). `useBaseQuery`
   calcula el resultado en cada pintado con `observer.getOptimisticResult(...)` a partir del estado
   ya actualizado. Por eso, si el almacén decide desde el aviso de la caché, cualquier pintado
   posterior ve a la vez la decisión y los datos nuevos: no hay un pintado con la sesión confirmada
   y la lista vieja (que RF-27 cerraría por error).
3. **Error.** Un fallo despacha `{ type: 'error' }` (también el plazo de 30 s y la red cortada, que
   el transporte rechaza como `ApiError` sin mensaje). Con datos ya recibidos, `status` pasa a
   `error` y **`data` se conserva** (I-2: la lista que se ve sigue siendo la recibida).
4. **Datos provisionales tras un error (la comprobación pendiente).** `createResult` solo aplica
   `placeholderData` si `data === undefined && status === 'pending'`. Tras el fallo de la primera
   petición de un filtro sin lista recibida, `status` es `error` y `data` es `undefined`: **no se
   aplica la lista del filtro anterior** y no hay lista que se ve. Por tanto, una sesión abierta
   **confirmada** se cierra en ese caso, como pide RF-27 («como hoy»): hoy lo hace el efecto de
   `SchedulePage`; con esta spec lo hace `visibleListChanged(null)`. **Confirmado.**
5. **Reintentar sin lista recibida.** `fetchState` (acción `fetch`) devuelve `status: 'pending'` y
   `error: null` cuando `data === undefined`. Así que, mientras corre el «Reintentar» de un filtro
   cuya primera petición falló, TanStack vuelve a «pendiente»: hoy la semana muestra el esqueleto de
   carga, o la lista provisional del filtro anterior si el observador tenía una. Solo con lista
   recibida se mantiene `status: 'error'` durante el reintento. RF-25 pide, con sesión por
   confirmar, seguir mostrando el error en la semana y en el panel durante el reintento también en
   el primer caso: el plan lo cumple reteniendo el error en la página (§5.3). Decidido por el
   usuario (P1, 2026-11-21): RF-25 se aplica al pie de la letra, aunque hoy, sin lista recibida, la
   semana no lo haga así.
6. **Petición en curso al volver.** Al montarse, el observador llama a `fetch()` sin
   `cancelRefetch`; si la consulta ya está en curso, devuelve la misma promesa (no envía otra,
   RF-15). Al salir de la agenda, `removeObserver` cancela solo si la `queryFn` leyó la señal
   (`#abortSignalConsumed`); la de `useSessions` no la lee, así que la petición sigue y su respuesta
   queda en la memoria (RF-15, D10). **No se debe añadir `signal` a esa `queryFn`** (R9).

Con eso:
- `agendaResponses.ts` se suscribe a la caché y, para cada evento `updated` con `action.type ===
  'success'` y `!action.manual` cuya clave sea `['u', <usuario actual>, 'sessions', <filtro>]`,
  llama a `onResponse(filtro, ids)`. Los ids salen de `action.data` con una guarda de tipo
  (`Array.isArray` y `id` de tipo `string`), sin aserciones (RNF-3). Los errores no se reenvían: un
  fallo nunca decide (I-1) y no cambia el almacén.
- El almacén solo decide con `visit !== null` (agenda en pantalla), sesión por confirmar y el filtro
  vigente (RF-11: una respuesta del filtro anterior no decide). Una respuesta que llega fuera de la
  agenda queda en la memoria y no decide; al volver empieza otra espera (RF-15).
- **Hecho de la creación (RF-24, D10)**: `creationConfirmed` se llama en el `onSuccess` de la
  escritura, antes de `markAgendaStale`, que es quien lanza la petición nueva. Así la espera empieza
  antes de que salga esa petición, también en modo simulado (DT-9).
- **Hecho de volver (RF-15)**: la sesión abierta ya quedó por confirmar al salir (DT-7); la espera
  empieza de verdad cuando `routeChanged(true)` pone `visit`. Una respuesta anterior a ese momento
  no decide (fuera de la agenda).
- **La lista guardada no decide (D7)**: pintar la tarjeta con ella no pasa por `listResponded`.

### 4.4 Cómo sabe el almacén si hay una ventana abierta en la agenda (RF-28, RF-29, CR-1)
- «Anotar una sesión» abierta = `draft !== null`, que ya es estado del almacén.
- «¿Cancelar esta sesión?» sigue local en la página (RF-17). La página pasa
  `cancelDialogOpen: confirmFor !== null` en cada `resolveProposal`.
- La página llama a `resolveProposal` en un efecto cuyas dependencias son exactamente las entradas
  de RF-29: propuesta, usuario de sesión, estado de la carga de las cuentas, `confirmFor !== null` y
  `draft !== null`. Así la regla se aplica al llegar y cada vez que cambia una entrada, también al
  cerrarse una ventana por cualquier camino (Volver, cerrar, Escape, fuera, 204, «Cancelar» o crear
  la sesión en el formulario): «esperar y reabrir» (CR-1).
- Fuera de la agenda `resolveProposal` no hace nada (`visit === null`) y la propuesta ya se descartó
  al salir (RF-30), también si salir fue por un 401 (RF-16).

## 5. Página de la agenda (`SchedulePage.tsx`)

### 5.1 Lectura del almacén
`filter`, `open`, `draft`, `proposal` con `useAgendaStore`. Las acciones con
`agendaStore.getState()`. `useSessions(filter)` sigue igual.

### 5.2 Entradas de las reglas
```
draftAccounts    = accountsQuery.data ? { received: true, games: data.map(a => a.gameId) } : { received: false }
proposalAccounts = accountsQuery.isPending || accountsQuery.isFetching ? { status: 'loading' }
                 : accountsQuery.isError ? { status: 'failed' }
                 : { status: 'loaded', games: data.map(a => a.gameId) }     // igual que hoy (spec 007, RF-30)
```
«Anotar sesión» (lunes 20:00) y elegir un bloque llaman a `openDraft(slot, draftAccounts)`. El
botón sigue deshabilitado con `myGames.length === 0` y los avisos de RF-13 no cambian.

### 5.3 Lista que se ve y error retenido (RF-25, RF-27; P1 decidida: retener el error)
```
lastFailure: { filter, error } | null            // estado local de la página
  al ver sessionsQuery.isError                → lastFailure = { filter, error: sessionsQuery.error }
  al ver éxito no provisional del filtro       → lastFailure = null
  al cambiar el filtro                         → lastFailure = null
retained = open?.pending && lastFailure?.filter == filter && sessionsQuery.isFetching && !sessionsQuery.isError
listError = sessionsQuery.isError ? sessionsQuery.error : retained ? lastFailure.error : null
visible   = retained && (sessionsQuery.isPending || sessionsQuery.isPlaceholderData) ? undefined
          : sessionsQuery.data                   // «lista que se ve» (Definiciones)
```
Sin sesión por confirmar, la semana se comporta exactamente como hoy.

### 5.4 Semana y panel
```
semana:  listError ? <Failure error=listError onRetry=refetch />
         : sessionsQuery.isPending ? <SheetSkeleton/>  : <WeekCalendar sessions=visible ?? [] … />
selected = open ? visible?.find(s => s.id == open.id) : undefined
showOpen = selected != undefined || open?.pending
título:  showOpen ? 'Sesión abierta' : 'Mis sesiones'     (mismo <h2 ref=panelTitleRef tabIndex=-1>: conserva el foco, RF-26)
cabecera: showOpen ? «Ver las mías» (showMine) : contador
cuerpo:  selected  → <SessionSlip …/>  (también con la semana en error, RF-25)
         open?.pending && listError → <Failure error=listError onRetry=refetch retryLabel="Reintentar la sesión abierta" />
         open?.pending              → <Working label={LOADING_TEXT} />   (role="status", sin foco)
         en otro caso               → «Mis sesiones» como hoy
efectos:
  useEffect(() => visibleListChanged(visible ? visible.map(id) : null), [visible])        // RF-27
  useEffect(() => if proposal: resolveProposal({ signedIn: user != null, accounts: proposalAccounts,
                                                cancelDialogOpen: confirmFor != null }),
            [proposal, user, proposalAccounts.status, juegos, confirmFor != null, draft != null])  // RF-28
confirmCancel con 204 → sessionCancelled(id) además de lo de hoy                          // RF-27
«Ver las mías» → showMine(); elegir en la semana → selectSession(id); filtros → setFilter(f)
borrador: draft ? <SessionDraftSlip draft=draft onClose=closeDraft … /> : null
```
- El texto «Cargando…» es `LOADING_TEXT`, el mismo que los demás estados de carga, y `Working`
  ya tiene `role="status"` (RF-25). Ni el estado de carga ni el error del panel llevan
  `autoFocusRetry` (no mueven el foco).
- El nombre accesible del «Reintentar» del panel, «Reintentar la sesión abierta», empieza por el
  texto visible (WCAG 2.5.3) y lo distingue del de la semana (RF-25).
- Durante la animación de salida, la página vieja sigue montada: sus efectos no cambian nada porque
  `resolveProposal` y `listResponded` exigen `visit !== null` y `visibleListChanged` ignora la
  sesión por confirmar (DT-7).

## 6. Decisiones técnicas
- **DT-1. Fábricas con dependencias inyectadas y almacén «vanilla»** (`createStore` + `useStore`).
  Permite probar en Node sin navegador simulado (RNF-5, H13 a). Descartada: `create()` con
  importaciones directas de `services/api` y React Router (las pruebas cargarían el simulado, que
  escribe en `localStorage`, y necesitarían `jsdom`).
- **DT-2. Ruta y navegación en el cierre de la fábrica, entregadas por `StoreBridge`** (Q1).
  Descartada: guardarlas en el estado del almacén (funciones no serializables en las herramientas,
  repintados y una aparente copia del estado de la navegación).
- **DT-3. `useAuth()` se mantiene como fachada** sobre el almacén (`useShallow`). Los consumidores no
  cambian: menos riesgo de regresión (RNF-2). Descartada: reescribir cada consumidor con selectores
  (más archivos tocados sin beneficio visible).
- **DT-4. `flushSync` inyectado** para D-A2. Descartada: confiar en que Zustand pinte en el acto
  (React agrupa la actualización y el vaciado de la memoria llegaría antes: vuelve D-A2).
- **DT-5. Consulta de sesión fuera de TanStack Query**, como hoy (sin reintentos ni caché).
- **DT-6. Salir y volver se detectan por la ruta en `StoreBridge`**, no por el montaje de
  `SchedulePage`. Descartada: limpieza del efecto de la página (con `StrictMode` el desmontaje
  simulado descartaría la propuesta al llegar, y `AnimatePresence` mantiene la página montada
  durante la salida).
- **DT-7. La sesión abierta pasa a «por confirmar» al salir**, no al volver. Es equivalente para el
  jugador (fuera de la agenda nada la lee, RF-18) y no depende del orden de los efectos al volver.
  Descartada: marcarla al volver (si el efecto de RF-27 de la página corriera antes, cerraría la
  sesión con la lista guardada).
- **DT-8. La respuesta que decide se reconoce en los avisos de la caché** (`success` sin `manual`,
  §4.3). Descartadas: comparar `dataUpdatedAt`/`dataUpdateCount` en el pintado (las escrituras
  locales también los suben) y avisar desde la `queryFn` (avisa antes de que los datos estén en la
  memoria: habría un pintado incoherente).
- **DT-9. El hecho de la creación se registra en el `onSuccess` de la escritura, antes de invalidar
  las listas**, con la visita leída al enviar. Descartada: `onCreated` tras `mutateAsync` (llega
  después de que salga la petición nueva y se ejecuta aunque el formulario ya no esté).
- **DT-10. RF-27 con una acción del almacén (`visibleListChanged`)** alimentada con los datos de
  TanStack, que ya implementan la «lista que se ve» (datos conservados tras un fallo, lista del
  filtro anterior como provisional). Descartada: recalcular la lista que se ve dentro del almacén
  (duplicaría la lógica de TanStack).
- **DT-11. La ventana «¿Cancelar esta sesión?» sigue local**; la página la pasa a `resolveProposal`
  (RF-17). Descartada: llevarla al almacén (contradice RF-17 y el inventario).
- **DT-12. Error retenido en la página durante «Reintentar» con sesión por confirmar** (§5.3).
  Decidida por el usuario (P1, 2026-11-21): con una sesión por confirmar y un filtro sin lista
  recibida, la semana y el panel siguen mostrando el error con «Actualizando» mientras corre
  «Reintentar», aunque TanStack Query v5 vuelva a `status: 'pending'` sin datos. Descartada: dejar
  el comportamiento de TanStack (el panel mostraría «Cargando…» y la semana el esqueleto, contra
  RF-25 y su criterio).
- **DT-13. Herramientas de depuración**: `devtools(…, { name, enabled: import.meta.env.DEV })`. En la
  construcción de producción `import.meta.env.DEV` es `false` por el modo de Vite, sin variables
  nuevas (RF-22, RNF-6). Se deja el aviso de Zustand cuando falta la extensión (riesgo H8): sale una
  vez por almacén creado, lo que RF-21 admite. Descartada: conectar solo si existe
  `window.__REDUX_DEVTOOLS_EXTENSION__` (más código sin necesidad). Las fábricas reciben `enabled:
  false` en las pruebas, así que Vitest no escribe el aviso.
- **DT-14. Vitest en `vitest.config.ts` aparte, entorno `node`, `allowOnly: false`**; la 017 lo
  reutiliza. Descartada: bloque `test` dentro de `vite.config.ts` (toca la configuración de la
  construcción de la spec 010).
- **DT-15. Las dos reglas puras en un solo archivo `domain/agendaRules.ts`** (RNF-4: «son dos»).
- **DT-16. Campo `visit` en el almacén de la agenda**: identificador de la visita en curso a
  `/agenda` (o `null`). Lo necesitan RF-24 (confirmación tras salir), RF-26 («con la agenda en
  pantalla») y RF-30. Es un identificador de interfaz, no un dato del servidor (RF-10), y se ve en
  las herramientas de depuración. Descartada: variable de módulo fuera del almacén (no se ve ni se
  prueba igual). Aceptada por el usuario el 2026-11-21 (P2), aunque el inventario dice «y solo
  eso».
- **DT-17. Los dos almacenes se crean al cargar la aplicación** (los importa `StoreBridge`). RF-21
  admite como máximo un aviso por almacén por carga completa; el de la agenda sale al cargar, no al
  entrar en ella (la spec dice «puede»).

## 7. Riesgos
- **R1.** `zustand@5.0.16` o `vitest@3.2.4` no existen o no resuelven con Vite 5.4 sin avisos: T1 lo
  comprueba antes de instalar y se detiene si no (H13 b).
- **R2.** `@/app/routes` importa `lucide-react`; las pruebas del almacén de la sesión lo cargan en
  Node. Debería funcionar (solo crea componentes). Si no, T3 mueve `ROUTES` e `isProtectedPath` a un
  módulo sin iconos (`routes.ts` los reexporta), sin cambiar comportamiento.
- **R3.** Con `AnimatePresence mode="wait"`, al volver hay unos cientos de ms con la ruta ya en
  `/agenda` y la página aún sin montar: una respuesta en curso podría decidir en ese intervalo. Es
  la respuesta de esa lista tras volver (D10) y el resultado es el mismo; se acepta.
- **R4.** Al salir con «Anotar una sesión» abierto, el formulario se cierra durante la animación de
  salida de la vista (hoy se va con ella). Diferencia de una fracción de segundo dentro de una vista
  que ya sale; se revisa en T9 y, si se nota, se cierra el borrador al terminar la salida.
- **R5.** El plan depende de detalles internos de TanStack Query 5.102.8 (§4.3: `manual`,
  `placeholderData` solo en `pending`, orden de avisos). `package.json` tiene `^5.62.7`; el lock fija
  5.102.8. Cambiar esa versión queda fuera de alcance; las pruebas del almacén no lo detectan y los
  recorridos de T9 sí.
- **R6.** Una recarga en caliente vuelve a crear un almacén y repite su aviso (RF-21 no la cuenta).
- **R7.** `flushSync` llamado durante un pintado avisa en consola; como hoy, las limpiezas solo
  ocurren desde eventos o promesas.
- **R8.** El error retenido (DT-12) cambia lo que se ve en la semana durante «Reintentar» sin lista
  recibida, solo con sesión por confirmar. Riesgo aceptado por el usuario (P1, 2026-11-21).
- **R9.** Añadir `signal` a la `queryFn` de `useSessions` cancelaría la petición al salir y rompería
  RF-15/D10. Queda escrito como comentario en `hooks.ts`.
- **R10.** La 017 cambia después los componentes de la agenda (Mantine): `retryLabel` y el panel de
  §5.4 deben conservar el nombre accesible y el `role="status"`; la 017 los toma de la línea base.

## 8. Estrategia de pruebas (Vitest, RNF-5)
- `npm test` = `vitest run`, en Node, sin red ni servidor ni navegador. Cada archivo crea almacenes
  nuevos con `createAuthStore`/`createAgendaStore` (nada compartido entre pruebas). Promesas
  controladas a mano (`deferred()` local en el archivo de prueba) para ordenar respuestas; `vi.fn()`
  para el contrato, la navegación, el aviso entre pestañas y la memoria. Sin temporizadores falsos:
  ningún almacén usa reloj.
- **`agendaRules.test.ts`** (T2). RF-29: los seis casos y su prioridad (sin usuario + cargando →
  descartar; fallida con cuenta → descartar; con ventana: esperar solo donde saldría aplicar; sin
  usuario, fallida o sin cuenta + ventana → descartar; aplicar: borrador con los cinco datos y filtro
  `'all'`). RF-13: filtro vinculado, «Todos los juegos», nunca vinculado, ya desvinculado, orden de
  la lista de cuentas (CS2 antes que LoL → CS2), sin cuentas recibidas y cuentas sin juegos
  (`null`).
- **`createAuthStore.test.ts`** (T3). Los puntos de RNF-5 para RF-2 a RF-8: `checking` →
  `authenticated`/`anonymous`/`error`; respuesta de un intento viejo sin efecto (dos `start()` con la
  limpieza del primero, y `retry()` con la primera respuesta llegando tarde); consulta cancelada por
  una limpieza (`isSessionCleared`) que se repite; login: `clear` → `resetAgenda` → usuario →
  `announce('login')` → una sola `navigate(to, { replace: true })`, a la ruta de origen o a Inicio;
  registro con login fallido → login con `{ email, notice: 'registered' }`; logout con `api.logout`
  rechazado: limpia igual, `clearCsrfIfOwn` antes de `announce('logout')`, `navigate(login,
  replace)`; 401: dos avisos con la misma época → un solo `navigate` y un solo aviso; época vieja →
  nada; estado `anonymous` ya puesto cuando se llama a `queryCache.clear` (registro de orden);
  `from` = `pathname()` del acceso inyectado (protegida) o `undefined` (pública); sin usuario → login
  sin `notice`; otra pestaña: `clearCsrfIfOwn` no se llama, navega solo con usuario y ruta
  protegida, en `checking`/`error` solo limpia; `setUser` con y sin usuario; `resetAgenda` en cada
  limpieza y al entrar (RF-16).
- **`createAgendaStore.test.ts`** (T5). Los puntos de RNF-5 del almacén de la agenda, con
  `routeChanged`, `listResponded`, etc., incluidos: volver con sesión conservada → por confirmar;
  respuesta sin ella → `open: null`; con ella → confirmada; respuesta fuera de la agenda o de otro
  filtro → nada; **un fallo no llama a nada** (se prueba que, tras un fallo, la siguiente
  `listResponded` decide); creación con `visit` vigente → borrador cerrado y abierta por confirmar,
  con visita vieja o fuera → nada; `visibleListChanged` cierra la confirmada y no la por confirmar;
  `showMine`/`selectSession` terminan la espera; `sessionCancelled`; `propose` sustituye;
  `resolveProposal`: aplicar (un solo cambio de estado: se cuenta con `subscribe`), descartar
  (filtro, sesión y borrador intactos), esperar (estado idéntico); CR-1: con `cancelDialogOpen` o
  borrador abierto espera, al cerrarse aplica, salir antes descarta; salir: borrador cerrado,
  propuesta descartada, filtro y sesión siguen; `reset`; almacén nuevo = estado inicial.
- **Lo que no prueba Vitest** (spec, RNF-5): vistas, foco, «Cargando…», doble montaje real, ruta en
  pantalla real, vigilancia entre pestañas real, «Atrás»/«Adelante»/recarga, `agendaResponses.ts` y
  `StoreBridge.tsx` (pegamento), RF-21 y RF-22. Se comprueban en T8 y T9.

### Registro de rojo y verde (`specs/016-estado-global/validation.md`)
En cada tarea con pruebas (T2, T3, T5):
1. Se escriben las pruebas y un módulo con las firmas definitivas cuyas funciones lanzan
   `new Error('Tn: sin implementar')` (así compila y `typecheck` sigue en verde).
2. `npm test` → **rojo**. Se anota: fecha, comando, resumen de Vitest (archivos y pruebas fallidas)
   y las últimas líneas de la salida, y **el motivo**: «fallan por `Tn: sin implementar` / por la
   aserción X», no por un error de importación, de tipos o de configuración (si es por eso, no
   cuenta como rojo: se corrige y se repite).
3. Se escribe el código. `npm test` → **verde**; se anota el resumen (`N passed`) y la salida.
4. Se anotan también `npm run typecheck`, `npm run lint` y `npm run build` del frontend.
En T1, T4, T6 y T7 (sin pruebas nuevas) se anota solo el verde de los cuatro comandos. T8 y T9
anotan cada paso del recorrido con su resultado y si coincide con el original.

## 9. Relación con las specs 017 y 018
- 017: hereda `vitest.config.ts` (entorno `node`, `src/**/*.test.ts`) y el script `test`. Toma su
  línea base visual (capturas) **después** de T7 de esta spec.
- 018: los recorridos de T8 y T9 son la fuente de los casos de agenda y de sesión que la 018 podrá
  automatizar con Playwright; esta spec no escribe pruebas E2E.

## 10. Trazabilidad
| RF/RNF | Dónde |
| --- | --- |
| RF-1 | `createAuthStore.ts`, `authStore.ts`, `useAuth.ts`, `StoreBridge.tsx`; se borran `AuthProvider.tsx` y `AuthContext.ts` |
| RF-2 | `createAuthStore.ts` (`start`, `check`, `retry`), `StoreBridge.tsx` (efecto 2) |
| RF-3, RF-4, RF-5 | `createAuthStore.ts` (`enter`, `login`, `register`, `logout`) |
| RF-6 | `createAuthStore.ts` (`on401`, `clearClientSession` con `flushSync`), `StoreBridge.tsx` (ruta) |
| RF-7 | `createAuthStore.ts` (`onOtherTab`); `crossTabSession.ts` sin cambios |
| RF-8 | `createAuthStore.ts` (`setUser`) |
| RF-9 | `useAuth.ts`, `useSessionUserId.ts`; `SessionGate.tsx`, `ProtectedRoute.tsx`, `queryKeys.ts` sin cambios |
| RF-10 | `createAgendaStore.ts` (estado §4.1) |
| RF-11, RF-12, RF-23 | `createAgendaStore.ts` (`setFilter`, `selectSession`, `showMine`), `SchedulePage.tsx` |
| RF-13 | `agendaRules.ts` (`draftGame`), `createAgendaStore.ts` (`openDraft`, `closeDraft`), `SchedulePage.tsx` |
| RF-14 | `createAgendaStore.ts` (`propose`), `MatchesPage.tsx`, ficha de jugador |
| RF-15, RF-30 | `createAgendaStore.ts` (`routeChanged`), `StoreBridge.tsx`, `routes.ts` (`isSchedulePath`) |
| RF-16 | `createAgendaStore.ts` (`reset`), `createAuthStore.ts` (`resetAgenda` en limpieza y entrada) |
| RF-17, RF-18 | `SchedulePage.tsx` (estado local sin cambios), `SessionDraftSlip.tsx`; detalle sin cambios |
| RF-19 | ningún `persist`: los dos almacenes viven en memoria |
| RF-20 | sin código propio: el simulado pasa por el mismo contrato y transporte |
| RF-21, RF-22, RNF-6 | `authStore.ts`, `agendaStore.ts` (`devtools` con `enabled: import.meta.env.DEV`) |
| RF-24 | `hooks.ts` (`useCreateSession`), `SessionDraftSlip.tsx`, `createAgendaStore.ts` (`creationConfirmed`) |
| RF-25 | `SchedulePage.tsx` (§5.3, §5.4), `States.tsx` (`retryLabel`) |
| RF-26 | `agendaResponses.ts`, `createAgendaStore.ts` (`listResponded`) |
| RF-27 | `createAgendaStore.ts` (`visibleListChanged`, `sessionCancelled`), `SchedulePage.tsx` |
| RF-28, RF-29 | `agendaRules.ts` (`proposalDecision`), `createAgendaStore.ts` (`resolveProposal`), `SchedulePage.tsx` |
| RNF-1 | `package.json`, `package-lock.json` (§1) |
| RNF-2 | T8 y T9 (recorridos) |
| RNF-3 | todas las tareas (`typecheck`, `lint`, `build`) |
| RNF-4 | `domain/agendaRules.ts`; los almacenes no importan `services/api` ni `fetch` |
| RNF-5 | `vitest.config.ts`, `eslint.config.js`, los tres `*.test.ts`, `validation.md` |

## 11. Comandos de comprobación (frontend, en `frontend/`)
`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Backend intacto: `git status
--short backend/` vacío. Sin `.only`, `any` ni `@ts-ignore` nuevos (búsqueda en `src/`).

## 12. Decisiones del usuario (2026-11-21)
- **P1 (RF-25, §4.3 punto 5) → retener el error.** Sin lista recibida para el filtro (primera
  petición fallida), TanStack Query vuelve a «pendiente» mientras corre «Reintentar». Con una sesión
  por confirmar, la semana y el panel siguen mostrando el error con «Actualizando» durante el
  reintento (RF-25 al pie de la letra; RF-25 y su criterio no cambian). DT-12 queda decidida y R8
  aceptado.
- **P2 (RF-10, DT-16) → se acepta `visit`.** El almacén de la agenda guarda, además del inventario,
  `visit` (número de la visita en curso a `/agenda` o `null`) como identificador de interfaz,
  necesario para RF-24, RF-26 y RF-30.
- **P3 (cierre, H18) → sí.** En T10 se corrige la referencia de `AGENTS.md` a `HITO2.md`, que no
  existe: se apunta al enunciado guardado en el apéndice A de `specs/016-estado-global/spec.md` o
  se quita.
