# Plan 008 — Vista nueva: ficha de jugador
Estado: aprobado (2026-10-18): "Apruebo el plan". Precondición: el plan 007 debe estar
aprobado y la 007 con sus tareas T1 a T26 hechas antes de empezar la T1 de la 008
(decisión del usuario, Pregunta 1, sección 10).
Spec: `specs/008-ficha-de-jugador/spec.md` (aprobada el 2026-10-18, decisiones P1 a P49 y D1 a D11).

Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, sección 6 punto 4
(operaciones nuevas del contrato: usuario por identificador, disponibilidad, resumen por
juego y cuentas de otro usuario) y sección 7, V1 (ruta `/jugadores/:userId` protegida y
diferida, llegada desde coincidencias y participantes, pestañas sin recargar, `HoursSheet`
con el traslape, distancia, "Proponer sesión" hacia la agenda, estados cargando / 404 / 400 /
sin cuentas, reutilizar `GameTabs`, `RankScale`, `HoursSheet`, `States`), salvo lo revocado
por la spec 004 (fuentes reales, claves, Steam) y lo que la spec 008 fija de otra forma
(primer bloque **proponible**, no el primer bloque en común; RF-7).

## 0. Precondiciones y estado real (comprobado el 2026-10-18)

- **Esta spec no cambia el servidor** (Contexto; D11). Usa solo `GET /api/users/:id`,
  `GET /api/users/:id/availability` (spec 003), `GET /api/accounts?user=<id>` y
  `GET /api/users/:id/games/:gameId` (spec 004), que ya existen en
  `backend/src/controllers/users.ts` y `accounts.ts` con los códigos que la spec cita (400
  "id con formato inválido", 404 "Usuario no encontrado." / "El jugador no tiene una cuenta
  vinculada en este juego.", 200 `[]` para cuentas de un usuario inexistente; datos públicos
  sin correo con `toPublicUserJson`). La única pieza de `backend/` que se toca es el archivo
  de peticiones manuales `backend/requests/users.rest`, que no es servidor (P45). No se
  encontró ninguna necesidad de cambiar el servidor.
- **La interfaz de hoy es la del Hito 1.** Este plan se apoya en las piezas que crea el plan
  de la spec 007 (`specs/007-integrar-frontend/plan.md`, hoy en **borrador**; ver Pregunta 1)
  y no las repite:
  `services/http/transport.ts` (`execute`: plazo de 30 s, descarte de respuestas tardías,
  401 → RF-7 de la 007), `ApiError` con `status` y `hasMessage`, `isSessionCleared`,
  `shared/utils/copy.ts`, `shared/components/DemoTag.tsx`, `Failure` con `title`,
  `PublicUser` en `domain/types.ts`, `GameAccount.simulated`, `domain/rankScale.ts`,
  `domain/matching.ts` (`rankDistance`), `domain/availability.ts` (`parseBlock` con `null`,
  `compareBlocks`, `intersectBlocks` de la 005), `domain/rankProgress.ts`
  (`rankGainSinceFirst`), `domain/proposal.ts` (`blockReason`, `buildProposal`,
  `PROPOSAL_DEFAULTS`), `profile.getAvailabilityOf(userId)`, `queryClient` sin reintentos,
  `staleTime: 0` y sin refresco al enfocar ni al reconectar, claves `['u', userId, …]` con
  `enabled: userId !== null`, `isProtectedPath`, `ProtectedRoute` con ruta de origen solo
  `pathname`, `AccountRow`/`RankScale`/`MatchLedger` con la Etiqueta de datos simulados y
  "Verificada"/"Sin verificar", y la recepción de la propuesta en la agenda
  (`location.state.proposal`, 007 RF-30, T26).
  **La implementación de la 008 empieza cuando la 007 tenga hechas al menos T1 a T26.** Si al
  empezar una tarea alguna de esas piezas no existe o tiene otra firma, el implementer para
  y lo reporta; no la crea dentro de la 008.
- **Validación con el servidor real** (criterios de finalización): necesita las specs 005
  (`/api/matches`) y 006 (`/api/sessions`) implementadas en `backend/` (hoy no lo están:
  `MEMORY.md`) y la 007 completa. Las tareas de código se comprueban antes en modo simulado
  y con `typecheck`, `lint` y `build`.
- Sin dependencias nuevas ni variables de entorno nuevas (constitución, principio 1).
- Ninguna regla de esta spec depende de la fecha ni de la hora actual: las sesiones viven
  en la semana tipo sin fecha (spec 006, fuera de alcance; D11), así que ninguna función
  pura recibe "hoy" (sección 2). Los textos relativos ya existentes ("se inscribió hace…",
  "Última lectura") los da `shared/utils/format.ts` (`timeAgo`) en la capa de
  presentación, como hoy en el perfil; no son reglas de dominio.

## 1. Archivos y responsabilidades
Rutas bajo `frontend/src/` salvo indicación. "Nuevo" = se crea; "mod." = se modifica.

| Archivo | Responsabilidad | RF / RNF |
| --- | --- | --- |
| `domain/playerSheet.ts` (nuevo) | Reglas puras de la ficha: referencia propia (`isOwnPlayerRef`), pestañas y su corrección (`playerTabs`, `resolveTab`), estado de la página según el usuario (`playerPageState`), horas en común (`sharedHours`), comparación de zonas (`zonesDiffer`), lectura defensiva (`readNormalized`, `readWinRate`), distancia (`distanceView`) y estado de "Proponer sesión" (`proposeState`). Sin React, HTTP ni reloj. | RF-4, RF-6, RF-7, RF-9, RF-10, RF-12, RF-13, RF-15, RF-17, RF-19, RF-20, RF-22, RF-23, RNF-6 |
| `domain/rankProgress.ts` (mod.; lo crea la 007) | Añade `formatRankGain(gain)`: texto "▲ +n" / "▼ −n" / "Sin datos". `RankScale` pasa a usarlo, así perfil y ficha dan el mismo texto (P41). | RF-4, RF-16, RF-17 |
| `shared/utils/tabKeys.ts` (nuevo) | `nextTabIndex(key, current, count)`: flechas, Inicio y Fin del patrón de pestañas. Puro. | RNF-2 |
| `shared/components/GameTabs.tsx` (mod.) | Patrón de pestañas accesibles **opcional** (props `idBase` y `panelId`): `id` por pestaña, `aria-controls`, `tabIndex` itinerante, flechas/Inicio/Fin con activación automática y foco en la pestaña nueva. Sin esas props se comporta como hoy (perfil y coincidencias no cambian). | RF-5, RNF-2 |
| `features/profile/components/GameSummaryPanel.tsx` (nuevo, extraído de `ProfilePage`) | Panel de un juego: `AccountRow` (sin acciones si no recibe `onSync`), bloque "Posición en la escala del juego" (lecturas registradas, `RankScale`, primera lectura, diferencia), "Últimas partidas" con `MatchLedger` y tasa de victorias; "Sin datos" defensivo; etiqueta de datos simulados donde la 007 la pone en el perfil. Lo usan el perfil y la ficha. | RF-4, RF-16, RF-17, RF-27, RNF-1 |
| `features/profile/pages/ProfilePage.tsx` (mod.) | Sustituye su bloque de juego por `GameSummaryPanel` (mismo resultado en pantalla). | RF-16 (misma regla en perfil y ficha) |
| `features/profile/components/AccountRow.tsx` (mod.) | Prop opcional `showHandleLabel`: muestra "Riot ID", "Ubisoft ID" o "SteamID64" (`handleLabel`) junto al identificador. | RF-4 (P6), RF-16 |
| `features/players/pages/PlayerPage.tsx` (nuevo) + `playerPage.css` (nuevo) | Vista de la ficha (sección 4): parámetro de ruta, ficha propia → perfil, estado de página, secciones, pestaña en la dirección. Solo clases y tokens existentes; el recuadro de la grilla con desplazamiento propio. | RF-1, RF-3 a RF-10, RF-12, RF-13, RF-15 a RF-20, RF-22 a RF-24, RF-26, RF-27, RNF-1 a RNF-5 |
| `features/players/hooks.ts` (nuevo) | Consultas de la ficha con clave por visita (`usePlayerVisit`, `usePlayer`, `usePlayerAccounts`, `usePlayerAvailability`, `usePlayerSummary`, `useOwnAccountsForSheet`, `useOwnAvailabilityForSheet`) y `toLoadable(query)`. | RF-8, RF-11, RF-18, RF-24, RF-26 |
| `features/players/usePlayerTab.ts` (nuevo) | Lee `?juego=`, aplica `resolveTab` y corrige la dirección con `replace`; `selectTab(g)` con `replace`. | RF-5, RF-19, RF-20 |
| `features/players/useSummaryRecheck.ts` (nuevo) | Flujo de RF-19: ante un 404 del resumen, vuelve a pedir usuario y cuentas, espera las dos y expone `rechecking`. | RF-8, RF-9, RF-19 |
| `features/players/components/PlayerHeader.tsx` (nuevo) | Datos públicos (RF-3): monograma con color, nombre visible, `@usuario`, zona, alta, biografía como texto. | RF-3, RNF-3 |
| `features/players/components/PlayerGamesSection.tsx` (nuevo) | Pestañas + panel (`GameSummaryPanel` sin acciones, con `showHandleLabel`), carga, error, vacío RF-10. | RF-4, RF-5, RF-8, RF-10, RF-16, RF-17, RF-18, RF-27 |
| `features/players/components/SharedHoursBlock.tsx` (nuevo) | Total, lista de tramos (`groupBlocks` + `formatRange`), nota de zonas, grilla `HoursSheet` de solo lectura; carga y errores de las dos disponibilidades. | RF-6, RF-8, RF-18, RF-22, RNF-5 |
| `features/players/components/RankDistanceBlock.tsx` (nuevo) | "Δ n pts" + `DemoTag`, texto de RF-13 con enlace, "Sin datos", carga y error. | RF-6, RF-8, RF-13, RF-17, RF-18, RF-27 |
| `features/players/components/ProposeSessionAction.tsx` (nuevo) | Botón "Proponer sesión" con `aria-disabled`, motivo visible enlazado con `aria-describedby`, enlaces a Configuración, navegación a la agenda con la propuesta. | RF-7, RF-12, RF-23, RNF-2 |
| `shared/utils/copy.ts` (mod.; lo crea la 007) | Textos literales de la ficha (sección 4.6), carácter a carácter con la spec. | RF-9, RF-10, RF-12, RF-13, RF-17, RF-22, RF-23 |
| `app/routes.ts` (mod.) | `ROUTES.player = '/jugadores/:userId'`, `PLAYER_TAB_PARAM = 'juego'`, `playerPath(userId, gameId?)`; `isProtectedPath` reconoce el prefijo `/jugadores/`. | RF-1, RF-2, RF-5, RF-20 |
| `app/router.tsx` (mod.) | Ruta diferida `PlayerPage` dentro de `ProtectedRoute` + `AppLayout`. | RF-1 |
| `app/providers/queryKeys.ts` (mod.) | Claves `player.*` bajo `['u', sessionUserId, 'player', visit, …]`. | RF-26 |
| `services/apiContract.ts` (mod.) | Espacio `users`: `get(userId)`, `listAccounts(userId)`, `getGameSummary(userId, gameId)`. Reutiliza `profile.getAvailabilityOf(userId)` de la 007. | RF-11, constitución principio 3 |
| `services/http/httpApi.ts` (mod.) | Rutas reales de `users.*` con `encodeURIComponent`; comprueba que `getAvailabilityOf` (007) también codifica el identificador. | RF-11, RNF-3 |
| `services/mock/mockUserTarget.ts` (nuevo, sin imports) | `resolveMockUserTarget(raw, sessionUserId)`: `me` exacto, forma `user-<dígitos>` sin distinguir mayúsculas, identificador en minúsculas. | RF-11, RF-15, P22, P49 |
| `services/mock/mockApi.ts` (mod.) | `users.get`, `users.listAccounts`, `users.getGameSummary` y `profile.getAvailabilityOf` con `resolveMockUserTarget`, mismos códigos, textos y orden de comprobación que el servidor. | RF-11 |
| `features/matches/components/MatchEntry.tsx` (mod.) | El nombre del candidato es un enlace a `playerPath(candidate.user.id, candidate.gameId)`. | RF-2, RNF-2 |
| `features/sessions/components/SessionSlip.tsx` (mod.) | El nombre de cada participante es un enlace a `playerPath(participant.id, session.gameId)`. | RF-2, RF-15, RNF-2 |
| `backend/requests/users.rest` (mod.; no es servidor, P45) | Paso 14: inicio de sesión de D y `PATCH /api/users/me` con `"displayName": "Jugador\tD"` (tabulador interior en el JSON). | RF-7 (P34, P40, P46) |
| `specs/008-ficha-de-jugador/validation.md` (nuevo) | Registro de validación en el orden de P42, comprobaciones con Node (texto y salida), revisiones de código. | Criterios de finalización |

Lo que ya sirve y se reutiliza sin cambios: `HoursSheet` (modo `readOnly` + `compareWith`, como
en la fila de coincidencias), `Monogram`, `Stamp`, `States` (`Blank`, `Failure`,
`SheetSkeleton`, `Working`), `useDocumentTitle`, `pluralize`/`timeAgo`, las clases `sheet`,
`ficha__*`, `note`, `notice`, `btn`, `label` y los tokens de `styles/tokens.css`.

## 2. Funciones puras (firmas)
Ninguna importa React, `fetch`, el almacenamiento ni lee el reloj (constitución, principio
3; RNF-6). **Ninguna recibe "hoy"**: todas operan sobre la semana tipo (día 0–6, hora 0–23),
sin fechas, y sobre datos ya recibidos; añadir un parámetro de fecha sería un parámetro
muerto. Los bloques en común, el agrupado en tramos, la distancia y el primer bloque
proponible **no se reimplementan**: se llaman las funciones de la 005/007.

```ts
// ---------- domain/playerSheet.ts ----------
import type { GameId } from './types';
import type { BlockRange } from './availability';        // groupBlocks / intersectBlocks
import type { BlockReason, Proposal } from './proposal';  // 007, RF-29

/** Estado de un dato ya traducido desde la consulta (la traducción vive en hooks.ts). */
export type Loadable<T> = { state: 'loading' } | { state: 'failed' } | { state: 'ready'; value: T };

/** RF-15 (P35, P43, P49): `me` exacto, o el id comparado sin distinguir mayúsculas. */
export function isOwnPlayerRef(rawId: string, sessionUserId: string): boolean;
//   rawId === 'me' || rawId.toLowerCase() === sessionUserId.toLowerCase()
//   ' me', 'Me', 'ME' → false (se piden y dan 400 → RF-9)

/** RF-4: juegos con cuenta, siempre en el orden LoL, R6, CS2 (GAME_IDS), sin repetidos. */
export function playerTabs(accounts: readonly { gameId: GameId }[]): GameId[];

/** RF-19, RF-20 (P7, P13, P14): pestaña elegida y juego que debe quedar en la dirección. */
export interface TabResolution { tab: GameId | null; urlGame: GameId | null; mustReplace: boolean }
export function resolveTab(accounts: readonly { gameId: GameId }[], requested: string | null): TabResolution;

/** RF-9, RF-18: qué ocupa la página según la consulta del usuario. */
export type PlayerPageState = 'loading' | 'notFound' | 'failed' | 'ready';
export function playerPageState(user: { state: 'loading' | 'failed' | 'ready'; errorStatus: number | null }): PlayerPageState;
//   failed con 400 o 404 → notFound; failed con otro → failed

/** RF-6: bloques en común (criterio de la 005, `intersectBlocks`), tramos (`groupBlocks`) y total. */
export function sharedHours(mine: readonly string[], theirs: readonly string[]):
  { blocks: string[]; ranges: BlockRange[]; total: number };

/** RF-22 (P15): identificadores distintos tal como están guardados, sin recortar ni comparar desfases. */
export function zonesDiffer(theirZone: string, myZone: string): boolean;

/** RF-17 (P30): lectura defensiva; null si el dato falta o no es un número finito. */
export function readNormalized(account: { currentRank?: { normalized?: unknown } | null } | null | undefined): number | null;
export function readWinRate(summary: { winRate?: unknown } | null | undefined): number | null;

/** RF-6, RF-13, RF-17, RF-27, P19, P33: qué se muestra en el lugar de la distancia. */
export type DistanceView =
  | { kind: 'loading' }
  | { kind: 'failed'; source: 'ownAccounts' | 'summary' }
  | { kind: 'noOwnAccount'; gameId: GameId }          // RF-13 (prevalece sobre RF-17)
  | { kind: 'noData' }                                // RF-17
  | { kind: 'value'; points: number; simulated: boolean };   // "Δ n pts" (+ etiqueta si simulated)
export function distanceView(input: {
  gameId: GameId;
  myAccounts: Loadable<readonly { gameId: GameId; currentRank?: { normalized?: unknown } | null }[]>;
  theirAccount: Loadable<{ currentRank?: { normalized?: unknown } | null; simulated?: boolean }>;
}): DistanceView;   // el valor sale de rankDistance() de domain/matching.ts (copia de la 005)

/** RF-7, RF-10, RF-12, RF-23 (P18): motivo de bloqueo o propuesta lista. */
export type SheetBlockReason = 'noTheirAccounts' | 'noOwnAccount' | BlockReason;
//   BlockReason (007) = 'noOwnHours' | 'noTheirHours' | 'noCommon' | 'outsideAgenda'
export type ProposeState =
  | { kind: 'loading' }                                   // "Cargando los datos para proponer una sesión…"
  | { kind: 'failed' }                                    // "No se pudieron cargar los datos para proponer una sesión."
  | { kind: 'blocked'; reason: SheetBlockReason; gameId: GameId | null }
  | { kind: 'ready'; proposal: Proposal };
export function proposeState(input: {
  gameId: GameId | null;
  displayName: string;
  theirAccounts: Loadable<readonly { gameId: GameId }[]>;
  myAccounts: Loadable<readonly { gameId: GameId }[]>;
  myBlocks: Loadable<readonly string[]>;
  theirBlocks: Loadable<readonly string[]>;
}): ProposeState;

// ---------- domain/rankProgress.ts (amplía la 007) ----------
/** RF-4 (P36, P39, P41), RF-17: gain ≥ 0 (incluido 0) → "▲ +n pts desde la primera lectura";
 *  gain < 0 → "▼ −|n| pts desde la primera lectura" (U+2212); null → "Sin datos". */
export function formatRankGain(gain: number | null): string;
//   la ganancia la da rankGainSinceFirst (007), que devuelve null también si falta el rango vigente

// ---------- shared/utils/tabKeys.ts ----------
/** RNF-2: ArrowRight/ArrowLeft circulares, Home → 0, End → count−1; otra tecla → null. */
export function nextTabIndex(key: string, current: number, count: number): number | null;

// ---------- app/routes.ts ----------
export function playerPath(userId: string, gameId?: GameId): string;
//   `/jugadores/${encodeURIComponent(userId)}` + (gameId ? `?juego=${gameId}` : '')   — RF-2
export function isProtectedPath(pathname: string): boolean;   // (007) + prefijo '/jugadores/' — RF-1

// ---------- services/mock/mockUserTarget.ts (sin imports) ----------
export const MOCK_USER_ID_PATTERN: RegExp;   // /^user-[0-9]+$/i
export function resolveMockUserTarget(raw: string, sessionUserId: string):
  { ok: true; id: string; own: boolean } | { ok: false };    // RF-11 (P22, P49)
```

Funciones reutilizadas sin cambios (RNF-6: no se duplican):
`intersectBlocks`, `groupBlocks`, `formatRange`, `GRID_HOURS` (`domain/availability.ts`);
`rankDistance` (`domain/matching.ts`, copia de la 005; manda la del servidor, 007 RNF-6);
`blockReason`, `buildProposal`, `proposalTitle`, `PROPOSAL_DEFAULTS` (`domain/proposal.ts`,
regla de 007 RF-29: primer bloque proponible, duración 1–4 hasta el final del tramo, título
"Sesión con <nombre>", 5 cupos, notas vacías); `rankGainSinceFirst`
(`domain/rankProgress.ts`); `formatRank`, `GAMES[g].shortName`, `GAME_IDS`
(`domain/games.ts`). La ficha usa `GAME_IDS.includes` y no `isGameId`, que hoy acepta
nombres de propiedades heredadas (`value in GAMES`: `constructor`, `__proto__`).

## 3. Algoritmos (pseudocódigo)

### 3.1 Tramos, primer bloque proponible y duración (RF-6, RF-7, RNF-6)
```
sharedHours(mine, theirs):
  blocks = intersectBlocks(mine, theirs)          // 005: sin repetidos, día asc, hora asc literal (00:00 antes que 12:00)
  ranges = groupBlocks(blocks)                    // tramos del mismo día; 23 y 0 del día siguiente son dos tramos (P16)
  return { blocks, ranges, total: blocks.length } // la lista cubre las 24 h; la grilla solo GRID_HOURS (P17)
```
El primer bloque proponible y la duración **no** se calculan en la ficha: `proposeState`
delega en `buildProposal` (007), que toma el primer bloque de `intersectBlocks` con hora en
`GRID_HOURS`, busca su serie del mismo día y fija `clamp(fin_de_serie − hora + 1, 1, 4)`.
Casos que fija la comprobación (sección 6): martes 20, 21, 22 + jueves 3 → martes 20:00, 3 h;
00:00 y 12:00 el mismo día → 00:00; serie 12–17 → 12:00, 4 h (tramo > 4 h); serie 10–13 →
12:00, 2 h; martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h; miércoles 0 y 12 en
tramos distintos → miércoles 00:00; solo bloques de 02:00 a 11:00 → `outsideAgenda`.

### 3.2 Motivo de bloqueo con datos cargando o fallidos (RF-10, RF-12, RF-23)
```
proposeState(i):
  ta = i.theirAccounts
  si ta.loading → loading ;  si ta.failed → failed
  si ta.value vacío → blocked('noTheirAccounts', null)                         // motivo 1 (aunque falte lo demás)
  g = i.gameId ;  si g === null → loading                                       // defensivo: corrección de pestaña en curso
  ma = i.myAccounts
  si ma.loading → loading ;  si ma.failed → failed
  si ningún ma.value tiene gameId === g → blocked('noOwnAccount', g)            // motivo 2, igual en LoL, R6 y CS2 (P27)
  mb = i.myBlocks
  si mb.loading → loading ;  si mb.failed → failed
  si mb.value vacío → blocked('noOwnHours', g)                                  // motivo 3 (sin esperar las del otro)
  tb = i.theirBlocks
  si tb.loading → loading ;  si tb.failed → failed
  r = blockReason(mb.value, tb.value)                                           // 007: noTheirHours | noCommon | outsideAgenda | null
  si r ≠ null → blocked(r, g)                                                   // motivos 4, 5, 6
  p = buildProposal({ gameId: g, displayName: i.displayName, mine: mb.value, theirs: tb.value })
  return p ? ready(p) : loading                                                  // p nunca es null aquí; rama defensiva
```
Un motivo anterior que ya aplica se muestra aunque los siguientes datos falten (P18):
el recorrido se detiene en el primer dato no cargado **solo cuando llega a él**. "Proponer
sesión" queda habilitado únicamente en `ready`, que exige los cuatro datos cargados.

### 3.3 Pestaña y corrección de la dirección (RF-4, RF-5, RF-19, RF-20)
```
playerTabs(accounts) = GAME_IDS.filter(g => accounts.some(a => a.gameId === g))

resolveTab(accounts, requested):                 // requested = valor crudo de ?juego= o null
  tabs = playerTabs(accounts)
  si tabs vacío → { tab: null, urlGame: null, mustReplace: requested !== null }   // RF-10: la dirección queda sin juego
  si requested ∈ tabs → { tab: requested, urlGame: requested, mustReplace: false }
  → { tab: tabs[0], urlGame: tabs[0], mustReplace: true }       // sin juego, valor inventado ('LOL', 'constructor'…) o sin cuenta

usePlayerTab(accountsLoadable):
  requested = searchParams.get('juego')
  si accounts no está 'ready' → tab = null (la sección de juegos muestra carga o error)
  res = resolveTab(accounts.value, requested)
  efecto: si res.mustReplace → setSearchParams(urlGame ? { juego: urlGame } : {}, { replace: true })   // P14: sin dejar la dirección inválida
  selectTab(g): si g ≠ res.tab → setSearchParams({ juego: g }, { replace: true })                    // RF-5, P13
  devuelve res.tab (se usa ya en el mismo render: nunca se pide el resumen de un juego sin cuenta)
```
El resumen solo se pide con `tab ≠ null`, es decir, con las cuentas del jugador ya cargadas:
así un `?juego=r6` sin cuenta nunca dispara un 404 que active RF-19 por error. Tras login
(spec 007, ruta de origen sin parámetros) `requested` es `null` y se elige la pestaña
inicial (RF-1, RF-20).

### 3.4 Flujo 404 del resumen → repedir usuario y cuentas (RF-19, RF-9, P32, P47)
```
useSummaryRecheck(summaryQuery, userQuery, accountsQuery, tab):
  estado: rechecking = false ; handled = ref(Set de `${tab}:${errorUpdatedAt}`)
  efecto cuando summaryQuery pasa a error:
    si error.status ≠ 404 o la clave ya está en handled → nada (RF-18 normal)
    handled.add(clave) ; rechecking = true
    await Promise.all([userQuery.refetch(), accountsQuery.refetch()])   // espera las DOS respuestas (P47)
    rechecking = false
  mientras rechecking:
    pestañas sin cambios (TanStack conserva los datos previos de cuentas durante el refetch)
    sección de datos del juego y distancia → estado de carga (RF-8)
  al terminar (el render siguiente lo decide con las funciones puras):
    playerPageState(user) = notFound (404 o 400) → "Este jugador no existe" en toda la ficha (RF-9),
                                                    aunque las cuentas den 200 [] o fallen (P32)
    playerPageState(user) = failed               → error en toda la ficha con "Reintentar" (RF-18)
    usuario 200 y cuentas failed                  → RF-18 en la sección de juegos (Reintentar = solo cuentas)
    usuario 200 y cuentas 200                     → resolveTab(cuentas nuevas, juego actual):
        la pestaña ya no está → pestaña inicial y dirección corregida con replace (P13, P14)
        sin cuentas → RF-10 (estado vacío, motivo 1, sin distancia)
        la pestaña sigue (caso no previsto por la spec) → se muestra el 404 del resumen como
        error de RF-18 con "Reintentar", sin pedir nada solo (decisión del plan; Pregunta 3)
```
`errorStatus` se lee de `ApiError.status` (007). El mismo flujo vale para los dos textos de
404 del resumen ("Usuario no encontrado." y "El jugador no tiene una cuenta vinculada en
este juego."): la ficha no distingue por texto.

### 3.5 Plazo de 30 s y respuesta tardía (RF-24)
No hay temporizador propio en la ficha. Toda operación del contrato, con el servidor y en
modo simulado, pasa por `execute` de la 007 (plan 007, 3.3):
```
execute: plazo 30 s → abort → ApiError(NO_MESSAGE_TEXT, status 0, hasMessage false)
         la respuesta que llega después no se lee (petición abortada) → nunca se muestra
ficha:   consulta en error con status 0 → RF-18 en su sección (Failure con el Texto de error
         sin mensaje y "Reintentar"); si es la del usuario, en toda la ficha; nunca va a login
```
Mientras espera, la consulta está en `pending`/`isFetching` y la sección muestra su estado de
carga (RF-8). Como `retry: false` (007), no hay segundo intento por detrás.

### 3.6 Sin refresco automático (RF-26)
```
visit = useState(() => ++visitCounter)          // nueva en cada montaje de la ficha (abrir, volver con Atrás, recargar)
claves: ['u', sessionUserId, 'player', visit, id, 'user' | 'accounts' | 'availability' | ['summary', g]]
        ['u', sessionUserId, 'player', visit, 'own', 'accounts' | 'availability']
opciones de las 7 consultas: staleTime: Infinity, refetchOnMount: false
globales (007): retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, sin refetchInterval
efecto:
  abrir/recargar → visita nueva → todo se pide una vez
  elegir pestaña no vista en esta visita → se pide su resumen
  volver a una pestaña ya vista → se muestra la memoria, sin petición (permitido por RF-26)
  foco, visibilidad, reconexión, tiempo → ninguna petición
  únicas otras peticiones: refetch() de "Reintentar" y de RF-19
```

### 3.7 Página (composición)
```
PlayerPage:
  raw = useParams().userId ; me = useAuth().user        // con sesión (ProtectedRoute)
  si isOwnPlayerRef(raw, me.id) → <Navigate to=ROUTES.profile replace />   // RF-15, antes de pedir nada
  consultas (todas con enabled = !own; las 6 primeras en paralelo; el resumen tras las cuentas):
    user, theirAccounts, theirAvailability, ownAccounts, ownAvailability, summary(tab)
  page = playerPageState(user)
  loading → cada sección con su esqueleto; "Proponer sesión" con el texto de carga (Pregunta 2)
  notFound → Blank "Este jugador no existe" + enlace a coincidencias (RF-9)
  failed → Failure del usuario en toda la ficha con "Reintentar" (RF-18)
  ready → PlayerHeader · PlayerGamesSection · bloque "Cruce" (distancia, horas en común, Proponer)
```

## 4. Interfaz

### 4.1 Ruta, acceso y enlaces (RF-1, RF-2, RF-15, RF-20)
- Ruta `/jugadores/:userId` (referencia, V1), diferida con `lazy` como las demás, dentro de
  `ProtectedRoute` y `AppLayout` (barra y pie con el aviso global de la 007, RF-27). La
  pestaña va en el parámetro de consulta `juego` con los valores `lol`, `r6`, `cs2`.
- Sin sesión: `ProtectedRoute` (007) lleva a login con la ruta de origen `pathname`; al
  entrar vuelve a `/jugadores/<id>` sin `?juego` → pestaña inicial (RF-1, RF-20). Un 401
  y el cambio de sesión en otra pestaña los trata la 007 (RF-7, RF-24); `isProtectedPath`
  reconoce `/jugadores/` para guardar la ruta de origen.
- Enlaces (RF-2): en `MatchEntry`, el nombre visible del candidato pasa a ser un `Link` a
  `playerPath(candidate.user.id, candidate.gameId)`; en `SessionSlip`, el nombre de cada
  participante es un `Link` a `playerPath(participant.id, session.gameId)` (incluido el
  propio, que lleva al perfil por RF-15). Los enlaces del detalle de sesión son de la 009.
  Texto del enlace = nombre visible (texto, nunca HTML). Foco visible con los estilos de
  enlace existentes.
- Ficha propia: `<Navigate to="/perfil" replace />` antes de montar consultas, así "Atrás"
  vuelve a la página anterior a la ficha (RF-15).

### 4.2 Disposición y secciones (RF-3 a RF-10, RF-18, RF-22, RNF-1, RNF-5)
Mismo lenguaje visual que el perfil (`sheet`, `ficha__*`), sin colores escritos a mano.

1. **Encabezado** (`PlayerHeader`, `sheet sheet--punched ficha`): `Monogram` con el color de
   avatar, nombre visible (`doc-title`), `@usuario · zona · se inscribió hace …`, biografía
   (`ficha__bio`). Sin correo, sin totales del perfil ni botón de editar (RF-3, P20).
   Título del documento: el nombre visible.
2. **Juegos** (`PlayerGamesSection`, `sheet`): `GameTabs` en modo accesible + `div
   role="tabpanel"` con `GameSummaryPanel` sin acciones y con `showHandleLabel`.
   - Carga: `SheetSkeleton` en la sección (cuentas) o solo en el panel (resumen al cambiar
     de pestaña, o durante RF-19).
   - Error: `Failure` con el mensaje de 007 RF-9 y "Reintentar" que repite solo esa
     petición (cuentas o resumen).
   - Vacío (RF-10): `Blank` "Este jugador no ha vinculado ningún juego" en lugar de pestañas
     y panel.
   - Panel (RF-4, RF-16, RF-17, RF-27): `AccountRow` (rango vigente, región, marca
     "Verificada"/"Sin verificar", Etiqueta de datos simulados donde iba "Fuente", "Última
     lectura", identificador con su etiqueta de formato); "Posición en la escala del juego"
     con el número de lecturas, `RankScale` (escala del juego, R6 de Copper a Champion), la
     primera lectura y `formatRankGain`; "Últimas partidas" (`MatchLedger`, de 1 a 8, con
     resultado, resumen, duración y variación) y la tasa de victorias. Cada valor ausente →
     "Sin datos" y ningún valor derivado (no se dibuja `RankScale` sin rango vigente).
3. **Cruce con tu perfil** (`sheet`), tres bloques con estado propio:
   - **Distancia de rango** (`RankDistanceBlock`): `Δ n pts` + `DemoTag` si la cuenta del
     jugador de la ficha lleva la marca; RF-13 "Vincula tu cuenta de <juego> para ver la
     distancia de rango" con enlace a Configuración; "Sin datos"; carga (cuentas propias o
     resumen); error de las cuentas propias con "Reintentar" (P19) o del resumen con
     "Reintentar" (repite el resumen). Sin juego elegido (RF-10) el bloque no se muestra.
   - **Horas en común** (`SharedHoursBlock`): total ("N horas en común", `pluralize`), lista
     de tramos (`ficha__ranges`, `formatRange`; si no hay, "Sin horas en común"), nota de
     RF-22 en un `notice` cuando `zonesDiffer`, y la grilla `HoursSheet readOnly
     value={mías} compareWith={en común}` dentro de un recuadro `overflow-x: auto` (RNF-5).
     Carga mientras cualquiera de las dos disponibilidades llega; un `Failure` con
     "Reintentar" por cada disponibilidad que falló (la propia o la del jugador).
   - **Proponer sesión** (`ProposeSessionAction`, sección 4.4).

Ningún contenido de otros usuarios se inserta como HTML: todo va como hijos de texto de
React; no se usa `dangerouslySetInnerHTML` (RNF-3). La biografía `<b>x</b>` se ve literal.

### 4.3 Pestañas accesibles (RF-5, RNF-2)
`GameTabs` con `idBase` y `panelId`:
- `role="tablist"` con `aria-label="Juegos del jugador"`; cada pestaña `role="tab"`,
  `id={idBase}-tab-{g}`, `aria-selected`, `aria-controls={panelId}`, `tabIndex` 0 en la
  elegida y −1 en las demás.
- `onKeyDown`: `nextTabIndex(key, actual, n)` → `onChange(tabs[i])` y foco en esa pestaña
  (activación automática). Clic igual que hoy.
- Panel: `role="tabpanel"`, `id={panelId}`, `aria-labelledby={idBase}-tab-{elegida}`,
  `tabIndex={0}`.
- `onChange` = `selectTab` (reemplaza la entrada del historial, RF-5). Cambiar de pestaña no
  desmonta la página: solo cambia la clave del resumen.

### 4.4 "Proponer sesión" (RF-7, RF-12, RF-23, RNF-2)
- Botón `btn btn--pen` con texto "Proponer sesión". Bloqueado: `aria-disabled="true"`
  (no `disabled`, para que reciba el foco), `onClick` sin efecto y
  `aria-describedby={motivoId}`; el motivo se ve junto al botón en un `<p id={motivoId}
  className="note">` con el texto de `copy.ts` y, en los motivos 2 y 3, un enlace a
  Configuración. Al recibir el foco, el lector de pantalla anuncia el nombre y la
  descripción (el motivo o el texto de RF-23).
- `ready`: `navigate(ROUTES.schedule, { state: { proposal } })` (entrada nueva, para que
  "Atrás" vuelva a la ficha en su pestaña); una referencia `proposing` impide navegar dos
  veces. La agenda aplica 007 RF-30 (espera cuentas, descarta si ya no hay cuenta en el
  juego, usa la propuesta una sola vez: RF-21) y abre `SessionDraftSlip` con juego, día,
  hora, duración, título, 5 cupos y notas vacías. El título no se modifica (P34); el error
  del título lo muestra el formulario (servidor o reglas DP6-33 si la 007/006 las adoptan,
  P46). La ficha no añade nada a la agenda.

### 4.5 Backend simulado y contrato (RF-11, P22, P49)
Contrato (`apiContract.ts`):
```ts
users: {
  get(userId: string): Promise<PublicUser>;                                      // GET /api/users/:id
  listAccounts(userId: string): Promise<GameAccount[]>;                          // GET /api/accounts?user=:id
  getGameSummary(userId: string, gameId: GameId): Promise<GameProfileSummary>;   // GET /api/users/:id/games/:gameId
};
// profile.getAvailabilityOf(userId)  (007)                                      // GET /api/users/:id/availability
```
`httpApi` usa `encodeURIComponent(userId)` en el segmento y el parámetro `user` por la
opción `query` (también codificado). Backend simulado, con `resolveMockUserTarget`:
```
resolveMockUserTarget(raw, sessionId):
  raw === 'me'                         → { ok, id: sessionId, own: true }   // solo el texto exacto
  !/^user-[0-9]+$/i.test(raw)          → { ok: false }                      // 'abc', 'ME', ' me', 'user-'
  id = raw.toLowerCase()               → { ok, id, own: id === sessionId.toLowerCase() }
users.get:          !ok → 400 "id con formato inválido"; sin usuario → 404 (texto de USER_TARGET_MESSAGES.userNotFound);
                    200 datos públicos (sin correo) si !own, propios si own
users.listAccounts: !ok → 400 ACCOUNT_ERRORS.invalidId; usuario inexistente → 200 []; si no, sus cuentas (orden de creación)
users.getGameSummary: !ok → 400 invalidId → juego no válido 400 "Juego no válido." → usuario inexistente
                    404 "Usuario no encontrado." → sin cuenta 404 "El jugador no tiene una cuenta vinculada en este juego."
                    → 200 { account, recentMatches (≤ 8), winRate, trend } (misma función interna que el resumen propio)
profile.getAvailabilityOf: mismo resolveMockUserTarget; 400 / 404 / 200 [...bloques]
```
Todas pasan por `execute` (007) y devuelven respuestas crudas con `{ error }`; los textos
son los del servidor (`backend/src/domain/userId.ts`, `accountRules.ts`, `USER_TARGET_MESSAGES`),
copiados al mock. Los datos precargados siguen 007 RF-21 y RF-27 (sin cambios en `seed.ts`;
los ids ya son `user-<n>` y el registro simulado da `user-<dígitos>`).

### 4.6 Textos (en `copy.ts`)
"Este jugador no existe" · "Ir a coincidencias" · "Este jugador no ha vinculado ningún
juego" · "Vincula tu cuenta de <juego> para proponer una sesión" · "No has marcado tus
horas" · "Este jugador no ha marcado horas" · "No tienen horas en común" · "Sus horas en
común quedan fuera del horario de la agenda (12:00 a 01:00)" · "Vincula tu cuenta de
<juego> para ver la distancia de rango" · "Sin datos" · "Las horas se comparan tal como
cada uno las marcó, sin convertir zonas horarias" · "Cargando los datos para proponer una
sesión…" · "No se pudieron cargar los datos para proponer una sesión." · "Proponer sesión".
`<juego>` = `GAMES[g].shortName` (P21). Las cadenas de la 007 ("Datos de demostración",
Texto de error sin mensaje, "Reintentar") se reutilizan.

### 4.7 Tokens, 360 px y contraste (RNF-1, RNF-5)
`playerPage.css` solo usa variables de `tokens.css` (`--s*`, `--ink-*`, `--line`…) y no
declara colores literales. A 360 px las secciones se apilan en una columna; el recuadro de
la grilla tiene `overflow-x: auto` y `max-width: 100%`; tramos y textos largos con
`overflow-wrap: anywhere` (nombres e identificadores de hasta 40 caracteres). Contraste:
los motivos, textos de RF-23, errores, vacíos y la nota usan `note`/`notice` con `--ink-2`
o superior; si `note--faint` (`--ink-3`) no llega a 4,5:1 en algún tema, esos textos usan
`note` (riesgo R-4).

## 5. Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
| --- | --- | --- |
| Claves por visita (`visit` en la clave) + `staleTime: Infinity` + `refetchOnMount: false` en las 7 consultas de la ficha | `staleTime: 0` global de la 007 | Con `staleTime: 0`, volver a una pestaña o un remontaje reutilizarían o repetirían peticiones según la caché; la visita hace que "abrir o recargar" siempre pida todo y que nada más pida solo (RF-26), y que una visita nueva nunca enseñe datos viejos sin estado de carga (RF-8) |
| Consultas propias de la ficha para las cuentas y la disponibilidad del usuario de la sesión | Reutilizar `useAccounts`/`useAvailability` | Esas usan `staleTime: 0` y la caché compartida: la ficha enseñaría datos de antes mientras refresca y decidiría el motivo 2 o 3 con datos viejos (RF-23 exige "cargado") |
| Pestaña en `?juego=` con `setSearchParams(…, { replace: true })` al elegir y al corregir | Estado local; o `push` por cada pestaña | RF-5 pide que la recarga y "Atrás" conserven la pestaña y que "Atrás" no recorra pestañas (P13); la corrección sin dejar la dirección inválida en el historial (P14) |
| Con el jugador sin cuentas, la corrección quita `juego` de la dirección | Dejar `?juego=lol` | RF-20: la dirección no puede quedar indicando un juego sin cuenta; sin pestañas, "sin juego" es lo único coherente |
| El resumen se pide solo cuando las cuentas del jugador ya están cargadas y la pestaña resuelta | Pedirlo en paralelo con el juego de la dirección | Un `?juego=` sin cuenta daría un 404 que activaría RF-19 sin motivo |
| Plazo de 30 s solo en `execute` (007) | `AbortSignal.timeout` o temporizador en la ficha | Un solo camino para servidor y modo simulado; la 007 ya garantiza el descarte de la respuesta tardía (RF-24 remite a 007 RF-20) |
| RF-19 con `refetch()` de usuario y cuentas en paralelo y `Promise.all` | Invalidar y dejar que la página reaccione | Hay que esperar las dos respuestas antes de decidir (P47) y no cambiar las pestañas mientras tanto; `refetch` conserva los datos previos |
| Reglas en `domain/playerSheet.ts`; textos en `copy.ts`; el dominio devuelve códigos (`SheetBlockReason`, `DistanceView`) | Calcular motivo y pestaña dentro de los componentes | RNF-6 y constitución, principio 3; además permite comprobarlas con Node sin React |
| `proposeState` delega en `blockReason`/`buildProposal` de la 007 y solo añade los motivos 1 y 2 y los estados de carga | Una función propia de primer bloque y duración | RNF-6 y 007 RF-29: la regla es la misma y no se duplica |
| Tramos con `groupBlocks` + `formatRange`, como la fila de coincidencias | Una agrupación nueva para la ficha | RF-6 ("como en la vista de coincidencias"); mismo texto "Mar 20:00–23:00" |
| Grilla: `HoursSheet` `readOnly` con `compareWith` | Componente de grilla nuevo | Ya dibuja `GRID_HOURS` (12:00 a 01:00) y destaca el traslape (referencia V1; RNF-1) |
| Extraer `GameSummaryPanel` del perfil y usarlo en los dos | Copiar el marcado del perfil en la ficha | RF-16 exige las mismas reglas que el perfil; una sola pieza evita que diverjan (Etiqueta, escala, "Sin datos") |
| `formatRankGain` en `rankProgress.ts` y `RankScale` lo usa | Dejar el texto dentro de `RankScale` | Una sola fuente del "▲ +0" (P41) para perfil y ficha; comprobable con Node |
| Patrón de pestañas accesibles **opcional** en `GameTabs` (`idBase`, `panelId`) | Activarlo para todas las instancias; o un componente nuevo | La spec solo pide el patrón en la ficha (RNF-2); no se cambia el comportamiento del perfil ni de coincidencias, y se reutiliza el componente existente (RNF-1) |
| Activación automática al moverse con flechas | Activación manual con Enter | RNF-2 dice que las flechas "pasan a la pestaña anterior y a la siguiente"; cada paso es "elegir una pestaña" (RF-26 lo permite) |
| `aria-disabled` + `aria-describedby` en "Proponer sesión" | `disabled` | `disabled` saca el botón del orden de tabulación y no anuncia el motivo (RNF-2) |
| Ruta `/jugadores/:userId` y parámetro `juego` | `/jugador/:id`, `?game=` | La ruta la fija la referencia (V1); las rutas visibles van en español como las demás |
| Espacio `users` en el contrato y reutilizar `profile.getAvailabilityOf` de la 007 | `users.getAvailability(id)` de la referencia | Evita dos operaciones para la misma petición; la 007 ya la creó para "Proponer" |
| `resolveMockUserTarget` en un archivo sin imports | Lógica dentro de `mockApi.ts` | Se puede comprobar directo con Node (P22, P49) y lo usan las cuatro operaciones |
| `GAME_IDS.includes` en la ficha | `isGameId` | `isGameId` usa `in` y acepta `constructor`/`__proto__` (RF-20: un valor que no es juego) |
| Sin pruebas versionadas del frontend: comprobaciones con Node en el scratchpad, escritas **antes** del código, con texto y salida en `validation.md` | Añadir un runner o `tests/` al frontend | Es lo que fijó la 007 (su sección 5) y la constitución (principio 4: en el frontend bastan build, typecheck y lint mientras ninguna spec diga otra cosa); la 008 no lo cambia |
| Casos del backend simulado (`users.*` y `getAvailabilityOf` en `mockApi.ts`) con un script de Node en rojo antes de implementar y en verde después: gancho de resolución de la 007 + sustitutos de `localStorage` (en memoria) e `import.meta.env` (lo reemplaza el gancho de carga); si el módulo no carga, el implementer para y lo reporta (decisión del usuario, Q1 de las tareas, 2026-10-18) | Solo revisión de código del mock | La revisión no muestra el rojo previo ni comprueba códigos, textos y orden de comprobación caso por caso (RF-11, RF-19); el script reutiliza el mismo método de la 007 |

## 6. Estrategia de verificación
Stack: el backend usa `node:test`; el frontend **no tiene runner** (`AGENTS.md`;
constitución, principio 4). Como la 007 (plan 007, sección 5):

1. **Comprobaciones con Node, primero en rojo.** En cada tarea con reglas puras, el
   implementer escribe antes el script (scratchpad) con la tabla de casos y el valor
   esperado, lo ejecuta contra el módulo vacío o inexistente (rojo), implementa y lo repite
   (verde). `node --test` se usa dentro del script; el script no se versiona y su texto y
   salida se pegan en `specs/008-ficha-de-jugador/validation.md`. Los módulos de `domain/`
   importan sin extensión y con `@/`, así que el script registra el mismo gancho de
   resolución de la 007 (`module.register`: añade `.ts` y resuelve `@/`).
   `mockUserTarget.ts` y `tabKeys.ts` no tienen imports y se cargan directo. El backend
   simulado (`mockApi.ts`, T3) se comprueba igual, con el gancho más sustitutos de
   `localStorage` e `import.meta.env`; si no carga, el implementer para y lo reporta
   (decisión del usuario, Q1 de las tareas, 2026-10-18).
2. **Verificación estándar de cada tarea:** `cd frontend && npm run typecheck && npm run
   lint && npm run build` en verde, sin `any`, `@ts-ignore`, `.only` ni
   `dangerouslySetInnerHTML` (RNF-3, RNF-4).
3. **Backend:** sin cambios; no hay tests nuevos de servidor. `users.rest` se ejecuta a mano
   (P40).
4. **Recorrido manual y registro** en el orden de P42 (sección 6.3).
5. **Revisiones de código** con búsquedas (`grep`) anotadas en el registro.

### 6.1 Casos de las comprobaciones con Node

| Función | Casos (entrada → esperado) | RF / RNF |
| --- | --- | --- |
| `sharedHours` + `buildProposal` vía `proposeState` | mías = suyas = {1-20, 1-21, 1-22, 3-3} → tramos "Mar 20:00–23:00", "Jue 03:00–04:00", total 4, propuesta martes 20:00, 3 h, "Sesión con B" (datos del recorrido) | RF-6, RF-7 |
| ídem | {2-0, 2-12} → propuesta 00:00 del miércoles (orden literal; P9) | RF-7 |
| ídem | {0-12…0-17} (6 h) → 12:00, 4 h (tramo > 4 h) | RF-7 |
| ídem | {4-10, 4-11, 4-12, 4-13} (tramo 10:00–14:00) → tramo "Vie 10:00–14:00", propuesta 12:00, **2 h** (P12) | RF-7 |
| ídem | {1-23, 2-0} → dos tramos "Mar 23:00–00:00" y "Mié 00:00–01:00"; propuesta martes 23:00, 1 h (P16) | RF-6, RF-7 |
| ídem | {2-0, 2-12} en tramos distintos → miércoles 00:00, 1 h | RF-7 |
| ídem | solo {3-2 … 3-11} → `blocked outsideAgenda`; los tramos sí aparecen | RF-6, RF-12 |
| `proposeState` motivo 1 | cuentas del jugador `[]` (y el resto `loading`) → `blocked noTheirAccounts` | RF-10, RF-12, RF-23 |
| motivo 2 en los tres juegos | juego `lol` / `r6` / `cs2`, cuentas propias sin ese juego → `blocked noOwnAccount` con ese juego | RF-12 (P27) |
| motivo 3 | horas propias `[]`, las del otro `loading` → `noOwnHours` | RF-12 |
| motivo 4 | horas propias con bloques, las del otro `[]` → `noTheirHours` | RF-12 |
| motivo 5 | sin cruce → `noCommon` | RF-12 |
| motivo 6 | solo jueves 03:00 en común → `outsideAgenda` | RF-12 |
| carga | cuentas del jugador con datos, cuentas propias `loading` → `loading` | RF-23 |
| fallo | horas propias `failed` → `failed`; cuentas del jugador `[]` y horas propias `failed` → motivo 1 | RF-23 |
| habilitado | los cuatro `ready` y cruce proponible → `ready` | RF-7, RF-23 |
| `resolveTab` | cuentas {r6, lol, cs2} → pestañas `[lol, r6, cs2]`; `null` → lol, replace; `'r6'` → r6, sin replace; `'LOL'`, `'xyz'`, `'constructor'` → lol, replace; `'cs2'` sin cuenta de CS2 → lol, replace; tras quitar r6 con `'r6'` → lol, replace; `[]` con `'lol'` → `tab null`, `urlGame null`, replace; `[]` con `null` → sin replace | RF-4, RF-19, RF-20 |
| `playerPageState` | 400 → notFound; 404 → notFound; 404 tras RF-19 con cuentas 200 `[]` → notFound; 500 / 0 → failed; loading / ready | RF-9, RF-18, RF-19 (P32) |
| `isOwnPlayerRef` (sesión `user-3` y un ObjectId en minúsculas) | `'me'` → true; `'user-3'`, `'USER-3'`, `'User-3'` → true; `'ME'`, `'Me'`, `' me'` → false; `'USER-5'` → false; ObjectId en mayúsculas → true | RF-15 (P35, P43) |
| `resolveMockUserTarget` | `'USER-5'` → ok `user-5`; `'user-999999'`, `'USER-999999'` → ok (el 404 lo da la existencia); `'abc'`, `'ME'`, `' me'`, `'user-'`, `'user-3 '` → no ok; `'me'` → own | RF-11 (P22, P49) |
| `zonesDiffer` | `America/Argentina/Buenos_Aires` vs `America/Sao_Paulo` → true; iguales → false | RF-22 (P15) |
| `distanceView` | normalizados 40 y 52 → `value 12`; mismo identificador → `value 0`; cuentas propias sin el juego → `noOwnAccount` aunque el resumen falle; sin `currentRank` en una → `noData`; cuentas propias `failed` → `failed ownAccounts`; resumen `loading` → `loading`; `simulated` se propaga | RF-6, RF-13, RF-17, RF-27 |
| `formatRankGain` | 7 → "▲ +7 pts desde la primera lectura"; 0 → "▲ +0 pts desde la primera lectura"; −5 → "▼ −5 pts desde la primera lectura" (U+2212); `null` → "Sin datos" | RF-4 (P39, P41), RF-17 |
| `readWinRate` / `readNormalized` | ausente, `null`, `'50'`, `NaN` → `null`; 0 y 100 → número | RF-17 |
| `nextTabIndex` | (ArrowRight, 2, 3) → 0; (ArrowLeft, 0, 3) → 2; Home → 0; End → 2; `'a'` → null | RNF-2 |
| `playerPath` / `isProtectedPath` | (`'user-3'`, `'r6'`) → `/jugadores/user-3?juego=r6`; `' me'` codificado; `/jugadores/x` protegida | RF-1, RF-2 |

### 6.2 Revisiones de código (al registro)
- RF-17: ningún valor derivado se calcula con un rango o tasa ausentes; no existen "Sin
  rango" ni "R6 sin rango" (`grep`).
- RNF-1: `grep` de `#[0-9a-fA-F]{3,8}`, `rgb(` y `hsl(` en los archivos nuevos y en
  `playerPage.css` → solo variables de `tokens.css`.
- RNF-3: `grep` de `dangerouslySetInnerHTML` e `innerHTML` en `frontend/src`.
- RF-16: `grep` de `Riot|Ubisoft|Valve|Steam|FACEIT|Leetify` en la ficha (solo "Riot ID",
  "Ubisoft ID", "SteamID64") y de `verificado`.
- RF-11 / RF-19 en modo simulado: casos del mock con el script de Node de T3 (rojo antes
  de implementar, verde después; decisión del usuario Q1 de las tareas) y revisión del
  mock (404 al resumen sin cuenta, 404 "Usuario no encontrado." para inexistente, 200 `[]`
  en cuentas de inexistente).
- RF-26: las 7 consultas con `staleTime: Infinity` y `refetchOnMount: false`; ningún
  `refetchInterval` ni `refetchOnWindowFocus: true`.
- RNF-6: `playerSheet.ts` no reimplementa intersección, agrupado, distancia ni primer
  bloque (importa los de `availability.ts`, `matching.ts` y `proposal.ts`).

### 6.3 Recorrido manual y registro (orden de P42)
Servidor real, base vacía, modo simulado desactivado, sin Internet; jugadores A, B y C
(zonas de P44), D y E para el título. En `validation.md`, en este orden: (1) Recorrido sin
el paso de CS2 → (2) Estados (termina restaurando martes 20, 21, 22 y jueves 03) → entre
2 y 3: latencia de 40 s (RF-24), servidor apagado (RF-18), teclado y NVDA (RNF-2), 360 px y
contraste con Lighthouse y selector de color (RNF-5) → (3) Agenda (con la desvinculación
de LoL de A al final) → (4) paso final de CS2 → (5) pestaña que desaparece (RF-19, con la
pestaña de red para RF-26) → (6) eliminación de B. En cualquier momento: título con
tabulador (paso 14 de `users.rest` con D y E; anotar petición, respuesta, qué error
apareció y cada paso), modo simulado con la cuenta demo (fichas semilla, `user-999999`,
`abc`, `ME`, `USER-<n>`, ficha propia por id, mayúsculas y `me`, pestaña de red sin
peticiones al servidor), y las comprobaciones con Node y revisiones de 6.1 y 6.2.

## 7. Trazabilidad

| Requisito | Partes del plan | Verificación |
| --- | --- | --- |
| RF-1 | 4.1; `routes.ts` (`isProtectedPath`), `router.tsx`; 007 `ProtectedRoute` | Node (`isProtectedPath`); Estados (sesión cerrada, cookie borrada, otra pestaña → pestaña LoL) |
| RF-2 | 4.1; `playerPath`; `MatchEntry`, `SessionSlip` | Node (`playerPath`); Recorrido (desde coincidencias y agenda) |
| RF-3 | 4.2 (1); `PlayerHeader`; `PublicUser` | Recorrido (sin correo, `<b>x</b>` literal) |
| RF-4 | 4.2 (2); `GameSummaryPanel`, `AccountRow showHandleLabel`, `playerTabs`, `formatRankGain` | Node (`resolveTab`, `formatRankGain`); Recorrido (LoL, R6, CS2) |
| RF-5 | 3.3; `usePlayerTab`; `GameTabs` | Recorrido (recargar en R6; "Atrás" sin recorrer pestañas) |
| RF-6 | 3.1; `sharedHours`, `distanceView`; `SharedHoursBlock`, `RankDistanceBlock` | Node (tramos, distancia); Recorrido (mismas horas y distancia que coincidencias) |
| RF-7 | 3.1, 3.2, 4.4; `proposeState` → `buildProposal` (007); `ProposeSessionAction` | Node (casos límite); Recorrido (martes 20:00, 3 h); título con tabulador |
| RF-8 | 3.4, 3.6, 4.2; hooks por sección | Estados (3G lenta, cambio de pestaña); parte 5 (carga durante RF-19) |
| RF-9 | 3.4, 3.7; `playerPageState` | Node; Estados (inexistente, `abc`, `ME`); parte 6 |
| RF-10 | 3.2, 3.3, 4.2; `resolveTab`, `proposeState` | Node; Estados (ficha de C) |
| RF-11 | 4.5; `apiContract`, `httpApi`, `mockApi`, `resolveMockUserTarget` | Node (`resolveMockUserTarget` y casos del mock, T3); modo simulado; revisión del mock |
| RF-12 | 3.2, 4.4, 4.6; `proposeState` | Node (cada motivo, motivo 2 en los tres juegos); Estados (motivos de disponibilidad); Recorrido (CS2) |
| RF-13 | 4.2 (3); `distanceView` | Node; Recorrido (CS2 sin cuenta); Agenda (LoL desvinculado, sin "Reintentar") |
| RF-14 | Retirado (P27). Sin parte en el plan. | — |
| RF-15 | 3.7, 4.1; `isOwnPlayerRef`; `Navigate replace` | Node; Estados (`me`, mayúsculas); Recorrido (desde la agenda); modo simulado (`USER-3`) |
| RF-16 | 4.2 (2); `GameSummaryPanel` compartido con el perfil; `AccountRow` (007) | Recorrido (CS2 sin "Fuente" ni fuentes); `grep` de fuentes y "verificado" |
| RF-17 | `readNormalized`, `readWinRate`, `distanceView`, `formatRankGain`; `GameSummaryPanel` | Node; revisión de código |
| RF-18 | 3.5, 4.2; `Failure` por sección; `playerPageState` | Estados (bloqueo de disponibilidad y cuentas propias); servidor apagado |
| RF-19 | 3.4; `useSummaryRecheck`, `resolveTab`, `playerPageState` | Node (pestaña que desaparece, usuario 404); partes 5 y 6; revisión del mock |
| RF-20 | 3.3; `resolveTab`, `usePlayerTab` | Node; Estados (valor inventado, CS2 sin cuenta, "Atrás", vuelta tras login) |
| RF-21 | 4.4; agenda de la 007 (RF-30, T26), sin cambios en la 008 | Agenda (recargar, Atrás/Adelante, 3G lenta, bloqueo, LoL desvinculado) |
| RF-22 | `zonesDiffer`; `SharedHoursBlock` | Node; Estados (ficha de C); Recorrido (A y B sin nota) |
| RF-23 | 3.2, 4.4; `proposeState` | Node (carga, fallo, motivo 1 con datos cargando); Estados (3G lenta, bloqueos) |
| RF-24 | 3.5; `execute` de la 007 | Latencia de 40 s (a los 30 s, error y "Reintentar", sin login) |
| RF-25 | Retirado (P33). Sin parte en el plan. | — |
| RF-26 | 3.6; claves por visita y opciones de consulta | Revisión de código; parte 5 (foco sin peticiones); partes 5 y 6 (pestaña no vista pide su resumen) |
| RF-27 | 4.2; `DemoTag` en `GameSummaryPanel` y `RankDistanceBlock`; aviso global (007) | Criterio de la Etiqueta (servidor real y modo simulado) |
| RNF-1 | 4.7; reutilización (sección 1) | Revisión de colores (`grep`) |
| RNF-2 | 4.3, 4.4; `nextTabIndex`, `GameTabs` accesible, `aria-disabled` | Node (`nextTabIndex`); teclado + NVDA |
| RNF-3 | 4.2; sin HTML inyectado | `grep`; `<b>x</b>` literal en el recorrido |
| RNF-4 | Verificación estándar en cada tarea | `typecheck`, `lint`, `build` |
| RNF-5 | 4.7; recuadro de la grilla | 360 px; Lighthouse en los dos temas; selector de color |
| RNF-6 | Sección 2; `playerSheet.ts` reutiliza 005/007 | Node (tablas de 6.1); revisión de reglas puras |

## 8. Orden previsto de las tareas (para `tasks.md`, tras aprobar el plan)
Hasta 10 tareas, en este orden de dependencia: (1) reglas puras (`playerSheet.ts`,
`formatRankGain`, `nextTabIndex`, `playerPath`) con sus comprobaciones primero;
(2) contrato, `httpApi` y backend simulado (`mockUserTarget.ts`); (3) ruta, claves de
consulta y hooks de la ficha; (4) `GameTabs` accesible y extracción de `GameSummaryPanel`;
(5) página: encabezado, estado de página, ficha propia y pestaña en la dirección;
(6) sección de juegos y flujo de RF-19; (7) bloque de cruce: horas en común, nota de zonas y
distancia; (8) "Proponer sesión"; (9) enlaces desde coincidencias y agenda, y paso 14 de
`users.rest`; (10) registro de validación completo (orden de P42).

## 9. Riesgos
- **R-1. Dependencia de la 007 sin aprobar.** El plan 007 está en borrador; si cambian
  `proposal.ts`, `getAvailabilityOf`, `execute`, `copy.ts` o las claves, se revisa este
  plan (Pregunta 1).
- **R-2. Validación con el servidor real.** Necesita 005 y 006 implementadas en `backend/`
  (hoy no) y la 007 completa. El código de la 008 avanza en modo simulado.
- **R-3. Dos agrupaciones de tramos.** El plan 007 define `sharedRuns` en `proposal.ts` y el
  código ya tiene `groupBlocks`. Si divergen, la lista de tramos de la ficha y la duración
  propuesta podrían no casar. Mitigación: la comprobación con Node de 6.1 ejecuta los mismos
  casos sobre las dos y exige el mismo agrupado; si la 007 aún no lo hizo, conviene que
  `sharedRuns` se apoye en `groupBlocks` (lo decide la 007).
- **R-4. Contraste de `note--faint`.** `--ink-3` puede quedar por debajo de 4,5:1 en algún
  tema; los textos de estado de la ficha usan `note` (`--ink-2`) y se miden en la
  validación.
- **R-5. `isGameId` acepta nombres de propiedades** (`in`). La ficha no lo usa; el
  comportamiento del resto de la app no cambia en esta spec.
- **R-6. `GameTabs` con activación automática pide un resumen por cada flecha** sobre una
  pestaña no vista. Es "elegir una pestaña" (RF-26) y cada respuesta tardía queda
  descartada por clave; aceptado.
- **R-7. La spec no cambia el servidor.** Si al implementar apareciera una diferencia entre
  el servidor y lo que cita la spec (rutas, códigos, textos), se para y se pregunta; no se
  planifica aquí ningún cambio de servidor. El único archivo de `backend/` que se toca es
  `requests/users.rest` (P45).

## 10. Decisiones del usuario sobre las preguntas del plan (2026-10-18)
Las tres preguntas que el plan dejó abiertas las respondió el usuario el 2026-10-18, todas
con la opción a (la recomendada, ya aplicada en el plan). Se conservan con su número
porque el resto del plan las cita como "Pregunta 1", "Pregunta 2" y "Pregunta 3".
La Pregunta 3 queda solo en el plan; no se añade a la spec (decisión del usuario).
1. **Plan 007 en borrador.** Decisión del usuario (2026-10-18): opción a. La 008 depende de
   las piezas del plan 007 (plazo de 30 s, `copy.ts`, Etiqueta de datos simulados,
   `proposal.ts`, `getAvailabilityOf`, claves por usuario); el plan 007 debe aprobarse
   antes y la implementación de la 008 empieza tras la T26 de la 007; no se duplica
   trabajo. Texto original de la pregunta: Este plan reutiliza piezas del plan 007 (sección 0), que sigue
   pendiente de aprobación. (a, recomendada) Aprobar el plan 007 antes de empezar la 008 y
   empezar la implementación de la 008 tras la T26 de la 007; (b) que la 008 cree las
   piezas que necesita, a costa de duplicar trabajo de la 007 y de arriesgar dos versiones.
2. **Mientras el usuario de la ficha no ha respondido.** Decisión del usuario
   (2026-10-18): opción a. Todas las secciones muestran su estado de carga y "Proponer
   sesión" el texto de carga de RF-23 hasta que obtener el usuario responda 200 (evita el
   destello de "Este jugador no ha vinculado ningún juego" antes de "Este jugador no
   existe"). Texto original de la pregunta: Para un identificador inexistente,
   la lista de sus cuentas responde 200 `[]` (spec 004, DP-10) y puede llegar antes que el
   404 del usuario: aplicando RF-23 al pie de la letra se vería un instante "Este jugador
   no ha vinculado ningún juego" (motivo 1 y estado vacío) antes de "Este jugador no
   existe". (a, recomendada) Hasta que el usuario responda 200, todas las secciones
   muestran su estado de carga y "Proponer sesión" el texto "Cargando los datos para
   proponer una sesión…", aunque las demás peticiones (que van en paralelo) ya hayan
   llegado; (b) mostrar cada sección y el motivo en cuanto llega su dato, aceptando ese
   destello.
3. **RF-19 cuando la pestaña sigue existiendo tras repedir.** Decisión del usuario
   (2026-10-18): opción a. Se muestra el 404 del resumen como error de RF-18 con
   "Reintentar" en la sección de datos del juego, sin volver a pedir nada por sí sola
   (coherente con RF-26). Queda solo en el plan; no se añade a la spec. Texto original de
   la pregunta: Si el resumen dio 404 pero, al
   volver a pedir el usuario y las cuentas, el jugador vuelve a tener cuenta en ese juego
   (la vinculó de nuevo entre medias), la spec no dice qué hacer. (a, recomendada) Mostrar
   el 404 del resumen como error de RF-18 en la sección de datos del juego, con
   "Reintentar", sin pedir nada solo (RF-26); (b) volver a pedir el resumen una vez de
   forma automática.

## 11. Preguntas abiertas
Ninguna.
