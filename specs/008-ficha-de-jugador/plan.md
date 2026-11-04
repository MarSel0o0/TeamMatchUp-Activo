# Plan 008 — Vista nueva: ficha de jugador
Estado: aprobado (2026-10-18): "Apruebo el plan". Precondición: el plan 007 debe estar
aprobado y la 007 con sus tareas T1 a T26 hechas antes de empezar la T1 de la 008
(decisión del usuario, Pregunta 1, sección 10). Precondición cumplida (2026-10-20: la 007
está implementada, T1–T31; P51). **Cambio A (revisión de coherencia contra el código,
P50 a P62) aprobado (2026-10-20, por el usuario: "Apruebo el cambio A")**. Las Preguntas 4
a 10 (sección 11) las respondió el usuario el 2026-10-20 (opción a en todas) y están
aplicadas; preguntas abiertas: ninguna. La T1 ya puede empezar (cambio A aprobado el
2026-10-20). Detalle en la sección 12. Ajuste durante la implementación (T4, 2026-10-20,
decisión del usuario: aceptar las desviaciones de T4 y corregir los documentos): P63,
sección 13. Defecto de T4 hallado en T8 (2026-10-20, decisión del usuario: "Arreglar
usePlayerTab"): P64, sección 13. Decisiones del usuario sobre el registro de T10 (2026-10-20):
C10-1 → cambio B de la spec (excepción de contraste de los controles deshabilitados en RNF-5),
P65, **aprobado (2026-10-20, por el usuario: "Apruebo el cambio B")**; D10-3 → los textos de
interfaz de la ficha pasan a `copy.ts` en la tarea nueva T11, P66 (sección 13 y 4.6). Las
Preguntas 11 a 13 (sección 14, alcance exacto de T11) las respondió el usuario el 2026-10-20
(opción a en todas) y están aplicadas en 1, 4.6, 6.2 y en T11. Ajuste durante T11 (inventario del
paso 1, 2026-10-20, decisión del usuario: "Incluir la portada"): P67, sección 13, aplicado en 1,
4.6 y 6.2. **Preguntas abiertas: ninguna.**
T11 está lista para empezar. D10-1 y D10-2 siguen abiertos (P60): la 008 no pasa a "implementada".
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
  "id con formato inválido", 404 "usuario no encontrado" / "el jugador no tiene una cuenta
  vinculada en este juego", 400 "juego no válido", todos con minúscula inicial y sin punto
  final por la spec 004, DP-6 —`USER_TARGET_MESSAGES.userNotFound` en
  `backend/src/services/userTarget.ts` y `ACCOUNT_ERRORS.invalidGame` /
  `ACCOUNT_ERRORS.noAccountForGame` en `backend/src/domain/accountRules.ts`; P50—, 200 `[]`
  para cuentas de un usuario inexistente; datos públicos sin correo con `toPublicUserJson`). La única pieza de `backend/` que se toca es el archivo
  de peticiones manuales `backend/requests/users.rest`, que no es servidor (P45). No se
  encontró ninguna necesidad de cambiar el servidor.
- **La interfaz de hoy es la del Hito 1.** Este plan se apoya en las piezas que crea el plan
  de la spec 007 (`specs/007-integrar-frontend/plan.md`, en **borrador** al redactar este
  plan; ver Pregunta 1. Actualización del 2026-10-20, P51: la 007 está implementada, T1–T31,
  y estas piezas existen en el código) y no las repite:
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
  (`/api/matches`) y 006 (`/api/sessions`) implementadas en `backend/` (el 2026-10-18 no lo
  estaban: `MEMORY.md`) y la 007 completa. Actualización del 2026-10-20 (P51): las dos
  condiciones se cumplen (005 y 006 implementadas el 2026-10-19; 007 con T1–T31). Las tareas
  de código se comprueban antes en modo simulado y con `typecheck`, `lint` y `build`.
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
| `domain/rankProgress.ts` (mod.; lo crea la 007) | Añade `formatRankGain(gain)`: texto "▲ +n" / "▼ −n" / "Sin datos". `RankScale` pasa a usarlo, así perfil y ficha dan el mismo texto (P41). El "Sin datos" lo toma de `NO_DATA_TEXT` de `copy.ts` (importa `@/shared/utils/copy`, que no tiene imports), sin literal propio (P62). | RF-4, RF-16, RF-17 |
| `shared/components/RankScale.tsx` (mod.) | Muestra `formatRankGain(delta)` en el mismo `<span className="rank-scale__delta num">` (con `data-up` solo si `delta >= 0`); su literal "Sin datos" desaparece (P62; en pantalla no cambia nada). | RF-4, RF-17 |
| `shared/utils/tabKeys.ts` (nuevo) | `nextTabIndex(key, current, count)`: flechas, Inicio y Fin del patrón de pestañas. Puro. | RNF-2 |
| `shared/components/GameTabs.tsx` (mod.) | Patrón de pestañas accesibles **opcional** (props `idBase` y `panelId`): `id` por pestaña, `aria-controls`, `tabIndex` itinerante, flechas/Inicio/Fin con activación automática y foco en la pestaña nueva. Sin esas props se comporta como hoy (perfil y coincidencias no cambian). | RF-5, RNF-2 |
| `features/profile/components/GameSummaryPanel.tsx` (nuevo, extraído de `ProfilePage`) | Panel de un juego: `AccountRow` (sin acciones si no recibe `onSync`), bloque "Posición en la escala del juego" (lecturas registradas, `RankScale`, primera lectura, diferencia), "Últimas partidas" con `MatchLedger` y tasa de victorias; "Sin datos" defensivo; etiqueta de datos simulados donde la 007 la pone en el perfil. Lo usan el perfil y la ficha. | RF-4, RF-16, RF-17, RF-27, RNF-1 |
| `features/profile/pages/ProfilePage.tsx` (mod.) | Sustituye su bloque de juego por `GameSummaryPanel` (mismo resultado en pantalla). Sus tres literales "Sin datos" (primera lectura, sin rango vigente y tasa de victorias) salen con ese bloque y en `GameSummaryPanel` pasan a ser `NO_DATA_TEXT`; en `ProfilePage.tsx` no queda ninguno (P62). En T11, su literal "se inscribió" del encabezado pasa a `JOINED_TEXT`, la misma constante que la ficha, sin cambio visible (Pregunta 11, a; P66). | RF-3 (mismo texto en ficha y perfil), RF-16 (misma regla en perfil y ficha), RF-17 |
| `features/profile/components/AccountRow.tsx` (mod.) | Prop opcional `showHandleLabel`: muestra "Riot ID", "Ubisoft ID" o "SteamID64" (`handleLabel`) junto al identificador. Su literal "Sin datos" del rango vigente pasa a ser `NO_DATA_TEXT` (P62; en pantalla no cambia nada). | RF-4 (P6), RF-16, RF-17 |
| `features/players/pages/PlayerPage.tsx` (nuevo) + `playerPage.css` (nuevo) | Vista de la ficha (sección 4): parámetro de ruta, ficha propia → perfil, estado de página, secciones, pestaña en la dirección. Solo clases y tokens existentes; el recuadro de la grilla con desplazamiento propio. | RF-1, RF-3 a RF-10, RF-12, RF-13, RF-15 a RF-20, RF-22 a RF-24, RF-26, RF-27, RNF-1 a RNF-5 |
| `features/players/hooks.ts` (nuevo) | Consultas de la ficha con clave por visita (`usePlayerVisit`, `usePlayer`, `usePlayerAccounts`, `usePlayerAvailability`, `usePlayerSummary`, `useOwnAccountsForSheet`, `useOwnAvailabilityForSheet`) y `toLoadable(query)`. | RF-8, RF-11, RF-18, RF-24, RF-26 |
| `features/players/usePlayerTab.ts` (nuevo) | Lee `?juego=`, aplica `resolveTab` y corrige la dirección con `replace`; `selectTab(g)` con `replace`. Las dos escrituras de la dirección, solo mientras la ruta actual sea la ficha (`useMatch(ROUTES.player)`; P64). | RF-5, RF-19, RF-20 (y RF-7/RF-21 por P64) |
| `features/players/useSummaryRecheck.ts` (nuevo) | Flujo de RF-19: ante un 404 del resumen, vuelve a pedir usuario y cuentas, espera las dos y expone `rechecking`. | RF-8, RF-9, RF-19 |
| `features/players/components/PlayerHeader.tsx` (nuevo) | Datos públicos (RF-3): monograma con color, nombre visible, `@usuario`, zona, alta, biografía como texto. | RF-3, RNF-3 |
| `features/players/components/PlayerGamesSection.tsx` (nuevo) | Pestañas + panel (`GameSummaryPanel` sin acciones, con `showHandleLabel`), carga, error, vacío RF-10. | RF-4, RF-5, RF-8, RF-10, RF-16, RF-17, RF-18, RF-27 |
| `features/players/components/SharedHoursBlock.tsx` (nuevo) | Total, lista de tramos (`groupBlocks` + `formatRange`), nota de zonas, grilla `HoursSheet` de solo lectura; carga y errores de las dos disponibilidades. | RF-6, RF-8, RF-18, RF-22, RNF-5 |
| `features/players/components/RankDistanceBlock.tsx` (nuevo) | "Δ n pts" + `DemoTag`, texto de RF-13 con enlace, "Sin datos" (`NO_DATA_TEXT`, P62), carga y error. | RF-6, RF-8, RF-13, RF-17, RF-18, RF-27 |
| `features/players/components/ProposeSessionAction.tsx` (nuevo) | Botón "Proponer sesión" con `aria-disabled`, motivo visible enlazado con `aria-describedby`, enlaces a Configuración, navegación a la agenda con la propuesta. | RF-7, RF-12, RF-23, RNF-2 |
| `shared/utils/copy.ts` (mod.; lo crea la 007) | Textos literales de la ficha (sección 4.6), carácter a carácter con la spec. `NO_DATA_TEXT = 'Sin datos'` lo añade T2 (lo usa `formatRankGain`), junto con la cabecera actualizada a "las specs 007 y 008"; el resto, T6 (P62). Los textos de interfaz que T6 y T5 dejaron escritos en los componentes (defecto D10-3) los añade T11 (4.6, P66). | RF-3, RF-4, RF-6, RF-9, RF-10, RF-12, RF-13, RF-17, RF-22, RF-23, RNF-2 |
| `app/routes.ts` (mod.) | `ROUTES.player = '/jugadores/:userId'`, `PLAYER_TAB_PARAM = 'juego'`, `playerPath(userId, gameId?)`; `isProtectedPath` reconoce el prefijo `/jugadores/`. | RF-1, RF-2, RF-5, RF-20 |
| `app/router.tsx` (mod.) | Ruta diferida `PlayerPage` dentro de `ProtectedRoute` + `AppLayout`. | RF-1 |
| `app/providers/queryKeys.ts` (mod.) | Claves `player.*` bajo `['u', sessionUserId, 'player', visit, …]`: del jugador tras `'them', id`, propias tras `'own'` (3.6; P63). | RF-26 |
| `services/apiContract.ts` (mod.) | Espacio `users`: `get(userId)`, `listAccounts(userId)`, `getGameSummary(userId, gameId)`. Reutiliza `profile.getAvailabilityOf(userId)` de la 007. | RF-11, constitución principio 3 |
| `services/http/httpApi.ts` (mod.) | Rutas reales de `users.*` con `encodeURIComponent`; comprueba que `getAvailabilityOf` (007) también codifica el identificador. | RF-11, RNF-3 |
| `services/mock/mockUserTarget.ts` (nuevo, sin imports) | `resolveMockUserTarget(raw, sessionUserId)`: `me` exacto, forma `user-<dígitos>` sin distinguir mayúsculas, identificador en minúsculas. | RF-11, RF-15, P22, P49 |
| `services/mock/mockApi.ts` (mod.) | `users.get`, `users.listAccounts`, `users.getGameSummary` y `profile.getAvailabilityOf` con `resolveMockUserTarget`, mismos códigos, textos y orden de comprobación que el servidor. | RF-11 |
| `features/matches/components/MatchEntry.tsx` (mod.) | El nombre del candidato es un enlace a `playerPath(candidate.user.id, candidate.gameId)`. Además, su literal "Sin horas en común esta semana." pasa a leerse de la constante nueva de `copy.ts` (P61) y sus dos literales "Sin datos" (columna de rango y lugar de la afinidad), de `NO_DATA_TEXT` (P62); en pantalla no cambia nada. En T11, `pluralize(…, 'hora', 'horas')` de la columna "En común" pasa a `HOUR_UNIT` (Pregunta 12, a) y "Δ {n} pts" de la columna de rango, a `rankDistanceText(n)` (Pregunta 13, a), las mismas piezas que la ficha, sin cambio visible (P66). | RF-2, RF-6 y RF-17 (mismo texto que la ficha), RNF-2 |
| `shared/components/HoursSheet.tsx` (mod. solo en T11; componente de la 007) | Su leyenda "Horas en común" (con `compareWith`) pasa a `SHARED_HOURS_TITLE`, la misma constante que el título del bloque de la ficha, sin cambio visible (Pregunta 12, a; P66). Ningún otro cambio: sus demás textos ("Tus horas", la ayuda de arrastre) quedan fuera de T11. | RF-6 |
| `app/pages/CrossingVisual.tsx` (mod. solo en T11; figura de la portada, `LandingPage`) | Su etiqueta `label: 'Horas en común'` (círculo `horario` de `CIRCLES`, pintada en la portada con `{circle.label}`) pasa a `SHARED_HOURS_TITLE`, sin cambio visible (P67; decisión del usuario (2026-10-20): "Incluir la portada"). Ningún otro cambio: "Mismo juego", "Rango similar", el `<title>` del SVG y "match" quedan fuera de T11. | RF-6 (mismo texto en ficha, grilla y portada) |
| `features/sessions/components/SessionSlip.tsx` (mod.) | El nombre de cada participante es un enlace a `playerPath(participant.id, session.gameId)`. | RF-2, RF-15, RNF-2 |
| `backend/requests/users.rest` (mod.; no es servidor, P45) | Paso 14: inicio de sesión de D y `PATCH /api/users/me` con `"displayName": "Jugador\tD"` (tabulador interior en el JSON). | RF-7 (P34, P40, P46) |
| `specs/008-ficha-de-jugador/validation.md` (nuevo) | Registro de validación en el orden de P42, comprobaciones con Node (texto y salida), revisiones de código. | Criterios de finalización |

Lo que ya sirve y se reutiliza sin cambios: `HoursSheet` (modo `readOnly` + `compareWith`, como
en la fila de coincidencias; T11 solo cambia el literal de su leyenda por una constante, sin
cambio de comportamiento ni visible), `Monogram`, `Stamp`, `States` (`Blank`, `Failure`,
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
// Tipos (P58): `GAME_IDS` es `GameId[]`, así que `GAME_IDS.includes(requested)` con
// `requested: string` no compila sin conversión; se usa `GAME_IDS.find((g) => g === requested)`
// (devuelve `GameId | undefined`, sin `as` ni `isGameId`). `groupBlocks(blocks: TimeBlock[])` y
// `HoursSheet` (`value`/`compareWith: TimeBlock[]`) no aceptan listas `readonly`: las listas de
// bloques que llegan a ellos son `TimeBlock[]` (las de la consulta o las que devuelve
// `intersectBlocks`, que ya es un arreglo nuevo); `readonly` solo en los parámetros que se pasan a
// `intersectBlocks`, `blockReason` y `buildProposal`, que sí lo aceptan.
import type { GameId, TimeBlock } from './types';
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
export function sharedHours(mine: readonly TimeBlock[], theirs: readonly TimeBlock[]):
  { blocks: TimeBlock[]; ranges: BlockRange[]; total: number };   // blocks: salida de intersectBlocks (mutable), apta para groupBlocks y HoursSheet

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
  myBlocks: Loadable<readonly TimeBlock[]>;     // solo se pasan a blockReason/buildProposal (aceptan readonly);
  theirBlocks: Loadable<readonly TimeBlock[]>;  // la grilla recibe la lista TimeBlock[] de la consulta, no esta (P58)
}): ProposeState;

// ---------- domain/rankProgress.ts (amplía la 007) ----------
/** RF-4 (P36, P39, P41), RF-17: gain ≥ 0 (incluido 0) → "▲ +n pts desde la primera lectura";
 *  gain < 0 → "▼ −|n| pts desde la primera lectura" (U+2212); null → NO_DATA_TEXT ("Sin datos"). */
export function formatRankGain(gain: number | null): string;
//   P62: `null` devuelve `NO_DATA_TEXT` importado de `@/shared/utils/copy` (lo añade T2), no un literal.
//   `copy.ts` no tiene imports ni efectos, así que la función sigue sin React, HTTP ni reloj.
//   la ganancia la da rankGainSinceFirst (007). Corrección P52: esa función NO devuelve null si falta
//   el rango vigente: su firma exige `currentRank: { normalized: number }`, solo devuelve null sin
//   historial y con `currentRank` nulo lanza TypeError (frontend/src/domain/rankProgress.ts). El
//   perfil hoy se protege fuera (ProfilePage.tsx: `currentRank ? … : 'Sin datos'`).
//   Decisión del usuario (2026-10-20): opción a, Pregunta 4 (P52). `GameSummaryPanel` protege fuera,
//   como el perfil: llama a `rankGainSinceFirst` solo si `readNormalized(account) !== null` (y le
//   pasa ese número como `currentRank.normalized`); si no, pasa `null` a `formatRankGain` →
//   "Sin datos" (RF-17). No se toca `rankGainSinceFirst` ni ningún otro código de la 007.

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
(`domain/games.ts`). La ficha compara con `GAME_IDS` (`GAME_IDS.find((g) => g === requested)`,
P58) y no usa `isGameId`, que hoy acepta nombres de propiedades heredadas (`value in GAMES`:
`constructor`, `__proto__`).
`intersectBlocks`/`groupBlocks` y `sharedRuns` (007) agrupan igual pero con distinto final:
`groupBlocks` da `endHour` **exclusivo** (la hora siguiente a la última) y `sharedRuns`,
**inclusivo** (la última hora incluida) (P53; ver R-3). Decisión del usuario (2026-10-20):
opción a, Pregunta 6. Cada una para lo suyo: la lista de tramos de la ficha usa `groupBlocks`
+ `formatRange` (como la fila de coincidencias, RF-6) y la propuesta sigue en
`buildProposal`, que usa `sharedRuns`. No se cambia código de la 007. La comprobación con
Node (6.1) ejecuta los casos de 3.1 sobre las dos y exige, tramo a tramo y en el mismo orden,
el mismo día y la misma hora de inicio, con `groupBlocks(...).endHour ===
sharedRuns(...).endHour + 1`.

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
  onSheet = useMatch(ROUTES.player) ≠ null                // P64: la ruta actual sigue siendo la ficha
  requested = searchParams.get('juego')
  si accounts no está 'ready' → tab = null (la sección de juegos muestra carga o error)
  res = resolveTab(accounts.value, requested)
  efecto: si onSheet y res.mustReplace → setSearchParams(urlGame ? { juego: urlGame } : {}, { replace: true })   // P14: sin dejar la dirección inválida
  selectTab(g): si onSheet y g ≠ res.tab → setSearchParams({ juego: g }, { replace: true })                    // RF-5, P13
  devuelve res.tab (se usa ya en el mismo render: nunca se pide el resumen de un juego sin cuenta)
```
**Solo mientras la ruta sea la ficha (P64).** `AppLayout` (007) envuelve las páginas en
`AnimatePresence mode="wait"`: al salir de la ficha, la página saliente sigue montada durante
la animación y lee ya la dirección de destino (sin `?juego=`), así que `resolveTab` pide
corregirla. Por eso la corrección de la dirección y `selectTab` actúan solo si
`useMatch(ROUTES.player)` coincide con la dirección actual; fuera de la ficha no escriben nada
y el destino conserva su dirección y su `location.state` (la propuesta de RF-7/RF-21 llega a
`/agenda` sin `?juego=`). `AppLayout` no se toca.
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
404 del resumen ("usuario no encontrado" y "el jugador no tiene una cuenta vinculada en
este juego", spec 004, DP-6; P50): la ficha no distingue por texto.

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
claves: ['u', sessionUserId, 'player', visit, 'them', id, 'user' | 'accounts' | 'availability' | ['summary', g]]
        ['u', sessionUserId, 'player', visit, 'own', 'accounts' | 'availability']
        // P63: 'them' antes del id, para que /jugadores/own no comparta clave con las cuentas propias
opciones de las 6 consultas (del jugador: usuario, cuentas, disponibilidad y resumen —una
consulta por pestaña vista—; propias: cuentas y disponibilidad; P63): staleTime: Infinity, refetchOnMount: false
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
  consultas (todas con enabled = sessionUserId !== null && !own, P55: la condición de sesión es la
  de 007 T31/D-A2 —`clearClientSession` pone el usuario a null con flushSync antes de cancelar, y
  así las consultas montadas quedan deshabilitadas—; son 6 (P63): las 5 primeras en paralelo; el
  resumen, una consulta por pestaña vista, tras las cuentas y solo con tab ≠ null):
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
  `ProtectedRoute` y `AppLayout` (barra y pie con el aviso global de la 007, RF-11;
  `DemoTag` en la barra y en el pie de `app/layouts/AppLayout.tsx`; cita corregida, P56). La
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
     "Sin datos" (`NO_DATA_TEXT` de `copy.ts`, P62) y ningún valor derivado (no se dibuja
     `RankScale` sin rango vigente).
3. **Cruce con tu perfil** (`sheet`), tres bloques con estado propio:
   - **Distancia de rango** (`RankDistanceBlock`): `Δ n pts` + `DemoTag` si la cuenta del
     jugador de la ficha lleva la marca; RF-13 "Vincula tu cuenta de <juego> para ver la
     distancia de rango" con enlace a Configuración; "Sin datos" (`NO_DATA_TEXT`); carga (cuentas propias o
     resumen); error de las cuentas propias con "Reintentar" (P19) o del resumen con
     "Reintentar" (repite el resumen). Sin juego elegido (RF-10) el bloque no se muestra.
   - **Horas en común** (`SharedHoursBlock`): total ("N horas en común", `pluralize`), lista
     de tramos (`ficha__ranges`, `groupBlocks` + `formatRange`; si no hay ninguno, "Sin horas
     en común esta semana." desde `copy.ts`, el texto de la fila de coincidencias; RF-6;
     decisión del usuario (2026-10-20): opción a, Pregunta 7, P59), nota de
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
users.get:          !ok → 400 "id con formato inválido"; sin usuario → 404 "usuario no encontrado" (USER_TARGET_MESSAGES.userNotFound);
                    200 datos públicos (sin correo) si !own, propios si own
users.listAccounts: !ok → 400 ACCOUNT_ERRORS.invalidId; usuario inexistente → 200 []; si no, sus cuentas (orden de creación)
users.getGameSummary: !ok → 400 invalidId → juego no válido 400 "juego no válido" → usuario inexistente
                    404 "usuario no encontrado" → sin cuenta 404 "el jugador no tiene una cuenta vinculada en este juego"
                    → 200 { account, recentMatches (≤ 8), winRate, trend } (misma función interna que el resumen propio)
                    (textos de la spec 004, DP-6, P50; "Juego no válido." con mayúscula y punto es el de
                    sesiones de la 006, `MESSAGES.sessionGame`, y no se usa aquí)
profile.getAvailabilityOf: mismo resolveMockUserTarget; 400 / 404 / 200 [...bloques]
```
Todas pasan por `execute` (007) y devuelven respuestas crudas con `{ error }`; los textos
son los del servidor (`backend/src/domain/userId.ts`, `accountRules.ts`, `USER_TARGET_MESSAGES`).
El mock **ya los tiene** en su tabla `MESSAGES` de `mockApi.ts` (`invalidId`, `userNotFound`,
`invalidGame`, `noAccountForGame`, copiados por la 007): las operaciones nuevas los reutilizan
y no añaden otra copia (P50). Los datos precargados siguen 007 RF-21 y RF-27 (sin cambios en `seed.ts`;
los ids ya son `user-<n>` y el registro simulado da `user-<dígitos>`).

### 4.6 Textos (en `copy.ts`)
**Nuevos** (se añaden a `copy.ts`): "Este jugador no existe" · "Ir a coincidencias" · "Este
jugador no ha vinculado ningún juego" · "Vincula tu cuenta de <juego> para proponer una
sesión" · "Vincula tu cuenta de <juego> para ver la distancia de rango" · "Sin datos" ·
"Las horas se comparan tal como cada uno las marcó, sin convertir zonas horarias" ·
"Cargando los datos para proponer una sesión…" · "No se pudieron cargar los datos para
proponer una sesión." · "Proponer sesión" · "Sin horas en común esta semana." (lista de
tramos vacía, RF-6; decisión del usuario (2026-10-20): opción a, Pregunta 7, P59). Este último
no existe todavía como constante en `copy.ts` (comprobado el 2026-10-20: la fila de
coincidencias lo tiene escrito en `MatchEntry.tsx`), así que se añade como texto nuevo.
Como la cabecera de `copy.ts` dice que es la única fuente y que ningún otro archivo repite sus
textos, `MatchEntry.tsx` deja de tener ese literal y pasa a leer la misma constante (decisión
del usuario (2026-10-20): opción a, Pregunta 9, P61). La constante la añade T6; la sustitución
en `MatchEntry.tsx` la hace T9, que ya modifica ese archivo para el enlace de RF-2. En pantalla
no cambia nada (mismo texto, mismo elemento y misma clase). Al final, el texto aparece una sola
vez en `frontend/src`, en `copy.ts` (revisión de 6.2).
**"Sin datos"** (P62; decisión del usuario (2026-10-20): opción a, Pregunta 10) tampoco existe
como constante en `copy.ts`, pero ya está escrito a mano en seis sitios de código (comprobado el
2026-10-20): `ProfilePage.tsx` (3: primera lectura, sin rango vigente y tasa de victorias),
`AccountRow.tsx` (1: rango vigente), `RankScale.tsx` (1: diferencia sin historial) y
`MatchEntry.tsx` (2: columna de rango y lugar de la afinidad). Se añade como
`NO_DATA_TEXT = 'Sin datos'` y cada literal se sustituye por ella en la tarea que ya modifica su
archivo: T5 para `ProfilePage.tsx` (los tres salen con el bloque que pasa a `GameSummaryPanel`,
que usa la constante), `AccountRow.tsx` y `RankScale.tsx` (vía `formatRankGain`), y T9 para
`MatchEntry.tsx`. En pantalla no cambia nada (mismo texto, mismo elemento y misma clase). Como
T5 va antes que T6, **la constante la añade T2**, que ya crea `formatRankGain` (su `null` →
`NO_DATA_TEXT`), y en la misma edición T2 actualiza la cabecera de `copy.ts` ("Textos literales
que fija la spec 007") a "las specs 007 y 008", porque desde T2 el archivo guarda también
textos de la 008; T6 añade el resto de los textos nuevos y no repite este. Los comentarios que
mencionan "Sin datos" (`domain/rankProgress.ts`, `ProfilePage.tsx`, `AccountRow.tsx`) no son
textos de interfaz y no se cambian. Al final, "Sin datos" aparece como literal de interfaz solo
en `copy.ts` (revisión de 6.2, ignorando comentarios).
**Ya existen y se reutilizan, sin copiarlos** (P57; `copy.ts` es la única fuente): los motivos
3 a 6 ("No has marcado tus horas", "Este jugador no ha marcado horas", "No tienen horas en
común", "Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)") están en
`PROPOSAL_BLOCK_REASONS` de `shared/utils/copy.ts`, con las mismas claves que `BlockReason`
(`noOwnHours`, `noTheirHours`, `noCommon`, `outsideAgenda`), así que `SheetBlockReason` se
traduce con esa tabla más los textos nuevos de los motivos 1 y 2; "Datos de demostración"
(`SIMULATED_LABEL`) y el Texto de error sin mensaje (`NO_MESSAGE_TEXT`) están en `copy.ts`;
"Reintentar" **no** está en `copy.ts`: lo pone el componente `Failure`
(`shared/components/States.tsx`), que la ficha usa sin cambios.
`<juego>` = `GAMES[g].shortName` (P21).

**Textos de interfaz de la ficha que quedaron en los componentes (defecto D10-3, P66).** La
lista de "Nuevos" de arriba solo enumeraba los textos que fija la spec; los títulos, etiquetas
y unidades que la ficha escribe en sus componentes (y los que `GameSummaryPanel` trajo del
perfil en T5) quedaron como literales, contra la regla de `tasks.md` ("los textos literales de
la ficha viven solo en `copy.ts`") y la cabecera de `copy.ts` ("Única fuente"). Decisión del
usuario (2026-10-20): "Moverlos a copy.ts". T11 los añade a `copy.ts` y cada componente lee la
constante, **sin ningún cambio visible** (mismo texto, mismo elemento, misma clase y mismo
atributo). Nombres propuestos (el implementer puede ajustarlos si chocan con uno existente,
anotándolo); líneas comprobadas el 2026-10-20:

| Constante (propuesta) | Texto exacto | Dónde está hoy |
| --- | --- | --- |
| `PLAYER_GAMES_TITLE` | `Juegos` | `features/players/components/PlayerGamesSection.tsx:58` (título `h2`) |
| `PLAYER_GAMES_TABS_LABEL` | `Juegos del jugador` | `PlayerGamesSection.tsx:110` (`label` de `GameTabs` → `aria-label` del `tablist`) |
| `PLAYER_CROSS_TITLE` | `Cruce con tu perfil` | `features/players/pages/PlayerPage.tsx:127` y `:196` (título `h2` de la sección y de su esqueleto de carga) |
| `RANK_DISTANCE_TITLE` | `Distancia de rango` | `features/players/components/RankDistanceBlock.tsx:40` (`h3`) |
| `SHARED_HOURS_TITLE` | `Horas en común` | `features/players/components/SharedHoursBlock.tsx:50` (`h3`) |
| `HOUR_UNIT` (`{ one: 'hora', other: 'horas' }`, o dos constantes) | `hora` / `horas` | `SharedHoursBlock.tsx:72` (`pluralize(shared.total, 'hora', 'horas')`) |
| (la misma `HOUR_UNIT`; Pregunta 12, a) | `hora` / `horas` | `features/matches/components/MatchEntry.tsx:110` (`pluralize(candidate.sharedBlocks.length, 'hora', 'horas')`, columna "En común" de coincidencias) |
| `SHARED_HOURS_SUFFIX` | `en común` | `SharedHoursBlock.tsx:72` (texto tras el `<strong>`; el espacio previo se conserva en el JSX) |
| (la misma `SHARED_HOURS_TITLE`; Pregunta 12, a) | `Horas en común` | `shared/components/HoursSheet.tsx:136` (leyenda de la grilla con `compareWith`, tras `<i className="hours__swatch" data-shared />` y un espacio, que se conserva) |
| (la misma `SHARED_HOURS_TITLE`; P67, decisión del usuario (2026-10-20): "Incluir la portada") | `Horas en común` | `app/pages/CrossingVisual.tsx:23` (`{ id: 'horario', label: 'Horas en común', … }` de `CIRCLES`, pintado en `:129` como `{circle.label}` en la portada, `LandingPage`). Solo ese literal: el `<title>` del SVG (`:55-58`, "…horas en común…" en minúscula dentro de una frase) es otro texto y no se toca |
| `JOINED_TEXT` | `se inscribió` | `features/players/components/PlayerHeader.tsx:23` (`@usuario · zona · se inscribió hace …`) |
| (la misma `JOINED_TEXT`; Pregunta 11, a) | `se inscribió` | `features/profile/pages/ProfilePage.tsx:65` (encabezado del perfil, `<p className="note">`, mismo patrón que la ficha) |
| `SCALE_POSITION_LABEL` | `Posición en la escala del juego` | `features/profile/components/GameSummaryPanel.tsx:61` |
| `READINGS_UNIT` (`{ one: 'lectura registrada', other: 'lecturas registradas' }`, o dos constantes; Pregunta 13, a) | `lectura registrada` / `lecturas registradas` | `GameSummaryPanel.tsx:64-68` (`pluralize(summary.account.rankHistory.length, …)`, textos en `:66-67`) |
| `FIRST_READING_LABEL` (Pregunta 13, a) | `Primera lectura:` | `GameSummaryPanel.tsx:86` (seguido de `{' '}`, que se conserva, y del rango o `NO_DATA_TEXT`) |
| `RECENT_MATCHES_TITLE` | `Últimas partidas` | `GameSummaryPanel.tsx:98` (`h3`) |
| `WIN_RATE_SUFFIX` | `ganadas` | `GameSummaryPanel.tsx:102` (tras `CountUp` con `%`) |
| `rankDistanceText(n: number): string` → `` `Δ ${n} pts` `` (función de `copy.ts`, sin imports; Pregunta 13, a) | `Δ <n> pts` (Δ, espacio, número, espacio, `pts`) | `features/players/components/RankDistanceBlock.tsx:84` (`<strong className="num">Δ {view.points} pts</strong>`) y `features/matches/components/MatchEntry.tsx:99` (`<span className="note note--faint num">Δ {candidate.rankDistance} pts</span>`) |

El perfil no tiene copia propia de los textos del panel: `ProfilePage.tsx` usa
`GameSummaryPanel` desde T5, así que los toma de ahí y cambia con él (sin efecto visible).
Las filas marcadas con "Pregunta 11", "Pregunta 12" y "Pregunta 13" son las decisiones del
usuario del 2026-10-20 (opción a en las tres; sección 14): los mismos literales fuera de la ficha
(perfil, coincidencias y la leyenda de `HoursSheet`) y los textos de la ficha que la primera
lista de D10-3 no recogía pasan también a `copy.ts`, sin ningún cambio visible (mismo texto,
mismo elemento, misma clase y mismo atributo). Líneas comprobadas el 2026-10-20 por lectura de
los archivos; el `grep` completo lo repite T11 en su paso 1.
La fila marcada con "P67" la añadió el inventario del paso 1 de T11 (2026-10-20): "Horas en
común" también es la etiqueta de un círculo de la figura de la portada (`CrossingVisual.tsx`),
archivo que esta tabla no listaba. Decisión del usuario (2026-10-20): "Incluir la portada";
pasa a `SHARED_HOURS_TITLE`, sin cambio visible. El mismo `grep -rnF "Horas en común"` encuentra
dos textos **distintos** que contienen la cadena y que no se tocan:
`features/matches/components/MatchFiltersPanel.tsx:75` ("Horas en común por semana", rótulo del
filtro) y `services/mock/mockApi.ts:192` (mensaje de error del mock, copia del literal del
servidor de la 005: "filtro «Horas en común por semana» no válido: …"). Por eso la comprobación
de T11 para este texto busca el **literal exacto** y anota esos dos como textos distintos.
Fuera de alcance de T11: los demás textos de los componentes de la 007 que el panel, la ficha o
coincidencias reutilizan (`AccountRow`, `RankScale`, `MatchLedger`; en `HoursSheet`, "Tus horas"
y la ayuda de arrastre; en `MatchEntry`, "Rango", "En común" y "sin traslape"), los propios del
perfil (`ProfilePage.tsx`: "Mis juegos", "Editar ficha", etc.) y los separadores tipográficos
(`·`, `@`, `%`), que no son textos.
Al final de T11, cada texto de la tabla aparece como literal de interfaz solo en `copy.ts`
(`grep` de T11; comentarios aparte), sin excepciones.

### 4.7 Tokens, 360 px y contraste (RNF-1, RNF-5)
`playerPage.css` solo usa variables de `tokens.css` (`--s*`, `--ink-*`, `--line`…) y no
declara colores literales. A 360 px las secciones se apilan en una columna; el recuadro de
la grilla tiene `overflow-x: auto` y `max-width: 100%`; tramos y textos largos con
`overflow-wrap: anywhere` (nombres e identificadores de hasta 40 caracteres). Contraste:
los motivos, textos de RF-23 y la nota de zonas, que crea la ficha, usan `note`/`notice` con
`--ink-2` o superior. Errores, vacíos y Etiqueta (P60, hallazgo M-7): `Failure` (mensaje),
`Blank` (descripción) y `DemoTag` llevan `note note--faint` fijo en su código. Decisión del
usuario (2026-10-20): opción a, Pregunta 8. La ficha los reutiliza **sin cambios**, como el
resto de la app, y se retira la promesa anterior de pasarlos a `note`. La validación (T10,
criterio de 360 px y contraste) mide su contraste en el tema claro y en el oscuro; si alguno
no llega a 4,5:1 (3:1 en texto grande), se anota como defecto en `validation.md` y se abre un
cambio aparte (token `--ink-3` o componentes compartidos) para toda la app; mientras tanto, la
casilla de RNF-5 queda con el defecto abierto y la 008 no pasa a "implementada" (riesgo R-4).
Resultado de T10: D10-1 y D10-2 abiertos (componentes de la 007 reutilizados; cambio aparte,
P60). Botón deshabilitado (C10-1 → P65, cambio B de la spec, aprobado (2026-10-20, por el
usuario: "Apruebo el cambio B")): el texto
de "Proponer sesión" con `aria-disabled` (atenuado; 1,74:1 oscuro, 2,61:1 claro) queda exento
del mínimo como componente inactivo (WCAG 2.x, 1.4.3); el motivo o el texto de RF-23 del `<p
className="note">` enlazado sí lo cumple (7,36:1 o más) y se sigue midiendo. No cambia código.

## 5. Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
| --- | --- | --- |
| Claves por visita (`visit` en la clave) + `staleTime: Infinity` + `refetchOnMount: false` en las 6 consultas de la ficha (el resumen, una por pestaña vista; P63) | `staleTime: 0` global de la 007 | Con `staleTime: 0`, volver a una pestaña o un remontaje reutilizarían o repetirían peticiones según la caché; la visita hace que "abrir o recargar" siempre pida todo y que nada más pida solo (RF-26), y que una visita nueva nunca enseñe datos viejos sin estado de carga (RF-8) |
| Consultas propias de la ficha para las cuentas y la disponibilidad del usuario de la sesión | Reutilizar `useAccounts`/`useAvailability` | Esas usan `staleTime: 0` y la caché compartida: la ficha enseñaría datos de antes mientras refresca y decidiría el motivo 2 o 3 con datos viejos (RF-23 exige "cargado") |
| Pestaña en `?juego=` con `setSearchParams(…, { replace: true })` al elegir y al corregir | Estado local; o `push` por cada pestaña | RF-5 pide que la recarga y "Atrás" conserven la pestaña y que "Atrás" no recorra pestañas (P13); la corrección sin dejar la dirección inválida en el historial (P14) |
| Con el jugador sin cuentas, la corrección quita `juego` de la dirección | Dejar `?juego=lol` | RF-20: la dirección no puede quedar indicando un juego sin cuenta; sin pestañas, "sin juego" es lo único coherente |
| El resumen se pide solo cuando las cuentas del jugador ya están cargadas y la pestaña resuelta | Pedirlo en paralelo con el juego de la dirección | Un `?juego=` sin cuenta daría un 404 que activaría RF-19 sin motivo |
| Plazo de 30 s solo en `execute` (007) | `AbortSignal.timeout` o temporizador en la ficha | Un solo camino para servidor y modo simulado; la 007 ya garantiza el descarte de la respuesta tardía (RF-24 remite a 007 RF-20) |
| RF-19 con `refetch()` de usuario y cuentas en paralelo y `Promise.all` | Invalidar y dejar que la página reaccione | Hay que esperar las dos respuestas antes de decidir (P47) y no cambiar las pestañas mientras tanto; `refetch` conserva los datos previos |
| Reglas en `domain/playerSheet.ts`; textos en `copy.ts`; el dominio devuelve códigos (`SheetBlockReason`, `DistanceView`) | Calcular motivo y pestaña dentro de los componentes | RNF-6 y constitución, principio 3; además permite comprobarlas con Node sin React |
| `proposeState` delega en `blockReason`/`buildProposal` de la 007 y solo añade los motivos 1 y 2 y los estados de carga | Una función propia de primer bloque y duración | RNF-6 y 007 RF-29: la regla es la misma y no se duplica |
| Tramos con `groupBlocks` + `formatRange`, como la fila de coincidencias; la propuesta sigue con `buildProposal`/`sharedRuns` (007), y la comprobación con Node exige mismo día y misma hora de inicio con `endHour` de `groupBlocks` = el de `sharedRuns` + 1 (decisión del usuario (2026-10-20): opción a, Pregunta 6, P53) | Una agrupación nueva para la ficha; refactorizar `sharedRuns` sobre `groupBlocks` (b); usar `sharedRuns` también para la lista convirtiendo el final (c) | RF-6 ("como en la vista de coincidencias"); mismo texto "Mar 20:00–23:00"; no se cambia `domain/proposal.ts` de la 007 ni hay que repetir su comprobación (T24 de la 007); la comprobación de Node detecta si las dos agrupaciones divergen |
| "Sin datos" de la diferencia desde la primera lectura protegido fuera de `rankGainSinceFirst`: se llama solo si `readNormalized` no es `null`; si no, `formatRankGain(null)` (decisión del usuario (2026-10-20): opción a, Pregunta 4, P52) | Cambiar `rankGainSinceFirst` para que acepte `currentRank` nulo (b) | Es como se protege el perfil hoy; no toca una función de la 007 que ya usa el perfil ni obliga a repetir su comprobación |
| Reutilizar `Failure`, `Blank` y `DemoTag` sin cambios y medir su contraste en T10 en los dos temas; si no llegan a 4,5:1, defecto y cambio aparte para toda la app (decisión del usuario (2026-10-20): opción a, Pregunta 8, P60) | Cambiar esos componentes a `note` o con una prop (b); ajustar `--ink-3` en `tokens.css` (c) | (b) cambia el aspecto de perfil, Configuración, coincidencias y agenda y rompe el "Hecho cuando" de T5; (c) es un cambio visual global fuera del alcance de la 008 |
| Lista de tramos vacía con "Sin horas en común esta semana." como constante nueva de `copy.ts` (decisión del usuario (2026-10-20): opción a, Pregunta 7, P59) | "Sin horas en común" (b); ningún texto (c) | Es el texto de la fila de coincidencias, a la que remite RF-6; ya consta en la spec (RF-6) |
| `MatchEntry.tsx` lee "Sin horas en común esta semana." de la constante de `copy.ts` en lugar de su literal, en T9 (decisión del usuario (2026-10-20): opción a, Pregunta 9, P61) | Dejar el literal en `MatchEntry.tsx` y anotar la excepción a la cabecera de `copy.ts` (b); hacer la sustitución en T6 o en una tarea aparte (c) | La cabecera de `copy.ts` fija una única fuente; con una sola constante la ficha y coincidencias no pueden divergir (RF-6: "el mismo texto"); T9 ya toca `MatchEntry.tsx` (RF-2), así que no añade archivos ni tareas, y T6 va antes (crea la constante) |
| "Sin datos" como `NO_DATA_TEXT` de `copy.ts`, añadida en T2 (la usa `formatRankGain`), y sus seis literales de código sustituidos en la tarea que ya toca cada archivo: T5 (`ProfilePage` vía `GameSummaryPanel`, `AccountRow`, `RankScale` vía `formatRankGain`) y T9 (`MatchEntry` ×2), sin cambio visible (decisión del usuario (2026-10-20): opción a, Pregunta 10, P62) | Dejar los literales y anotar la excepción a la cabecera de `copy.ts` (b); hacer las sustituciones en una tarea aparte (c); añadir la constante al inicio de T5 en lugar de T2; que `formatRankGain` devuelva `null` y cada componente pinte la constante | La cabecera de `copy.ts` fija una única fuente; T5 y T9 ya modifican esos archivos, así que no se añaden archivos ni tareas; T2 crea `formatRankGain`, que necesita el texto, y va antes que T5 (añadirla en T5 dejaría a `formatRankGain` con un literal o con la constante sin crear); devolver `null` repetiría la rama "Sin datos" en `RankScale` y `GameSummaryPanel` y rompería la fuente única de P41. `rankProgress.ts` importa `copy.ts`, que no tiene imports ni efectos: la función sigue pura (constitución, principio 3) y se carga con el mismo gancho de Node |
| Grilla: `HoursSheet` `readOnly` con `compareWith` | Componente de grilla nuevo | Ya dibuja `GRID_HOURS` (12:00 a 01:00) y destaca el traslape (referencia V1; RNF-1) |
| Extraer `GameSummaryPanel` del perfil y usarlo en los dos | Copiar el marcado del perfil en la ficha | RF-16 exige las mismas reglas que el perfil; una sola pieza evita que diverjan (Etiqueta, escala, "Sin datos") |
| `formatRankGain` en `rankProgress.ts` y `RankScale` lo usa | Dejar el texto dentro de `RankScale` | Una sola fuente del "▲ +0" (P41) para perfil y ficha; comprobable con Node |
| Patrón de pestañas accesibles **opcional** en `GameTabs` (`idBase`, `panelId`) | Activarlo para todas las instancias; o un componente nuevo | La spec solo pide el patrón en la ficha (RNF-2); no se cambia el comportamiento del perfil ni de coincidencias, y se reutiliza el componente existente (RNF-1) |
| Activación automática al moverse con flechas | Activación manual con Enter | RNF-2 dice que las flechas "pasan a la pestaña anterior y a la siguiente"; cada paso es "elegir una pestaña" (RF-26 lo permite) |
| `aria-disabled` + `aria-describedby` en "Proponer sesión" | `disabled` | `disabled` saca el botón del orden de tabulación y no anuncia el motivo (RNF-2) |
| Ruta `/jugadores/:userId` y parámetro `juego` | `/jugador/:id`, `?game=` | La ruta la fija la referencia (V1); las rutas visibles van en español como las demás |
| Espacio `users` en el contrato y reutilizar `profile.getAvailabilityOf` de la 007 | `users.getAvailability(id)` de la referencia | Evita dos operaciones para la misma petición; la 007 ya la creó para "Proponer" |
| `resolveMockUserTarget` en un archivo sin imports | Lógica dentro de `mockApi.ts` | Se puede comprobar directo con Node (P22, P49) y lo usan las cuatro operaciones |
| Comparar con `GAME_IDS` en la ficha (`GAME_IDS.find((g) => g === requested)`; P58: `GAME_IDS.includes(requested)` con `requested: string` no compila porque `GAME_IDS` es `GameId[]`) | `isGameId`; o `includes` con conversión de tipo | `isGameId` usa `in` y acepta `constructor`/`__proto__` (RF-20: un valor que no es juego); `find` da `GameId \| undefined` sin `as` |
| Sin pruebas versionadas del frontend: comprobaciones con Node en el scratchpad, escritas **antes** del código, con texto y salida en `validation.md` | Añadir un runner o `tests/` al frontend | Es lo que fijó la 007 (su sección 5) y la constitución (principio 4: en el frontend bastan build, typecheck y lint mientras ninguna spec diga otra cosa); la 008 no lo cambia |
| Casos del backend simulado (`users.*` y `getAvailabilityOf` en `mockApi.ts`) con un script de Node en rojo antes de implementar y en verde después: gancho de resolución del método de la 007, reescrito en T1 y con su texto completo en `validation.md` (su código no estaba versionado; ver 6, punto 1, P54; decisión del usuario (2026-10-20): opción a, Pregunta 5) con `--experimental-transform-types` + sustitutos de `localStorage` (en memoria) e `import.meta.env` (lo reemplaza el gancho de carga); si el módulo no carga, el implementer para y lo reporta (decisión del usuario, Q1 de las tareas, 2026-10-18) | Solo revisión de código del mock | La revisión no muestra el rojo previo ni comprueba códigos, textos y orden de comprobación caso por caso (RF-11, RF-19); el script reutiliza el mismo método de la 007 |

## 6. Estrategia de verificación
Stack: el backend usa `node:test`; el frontend **no tiene runner** (`AGENTS.md`;
constitución, principio 4). Como la 007 (plan 007, sección 5):

1. **Comprobaciones con Node, primero en rojo.** En cada tarea con reglas puras, el
   implementer escribe antes el script (scratchpad) con la tabla de casos y el valor
   esperado, lo ejecuta contra el módulo vacío o inexistente (rojo), implementa y lo repite
   (verde). `node --test` se usa dentro del script; el script no se versiona y su texto y
   salida se pegan en `specs/008-ficha-de-jugador/validation.md`. Los módulos de `domain/`
   importan sin extensión y con `@/`, así que el script registra un gancho de resolución
   como el de la 007 (`module.register`: añade `.ts` a los imports relativos sin extensión y
   resuelve `@/`; Node 24.13.0, `node --import ./register.mjs`, variable `TMU_SRC` =
   `frontend/src`). **Corrección P54:** el texto de ese gancho **no** está en
   `specs/007-integrar-frontend/validation.md`, que solo lo describe (`hooks.mjs`/`register.mjs`,
   filas T4, T14, T24 y T27 de su tabla); su código quedó en el scratchpad de otra sesión y no
   está en el repositorio. Decisión del usuario (2026-10-20): opción a, Pregunta 5. En T1 el
   implementer reescribe el gancho en el scratchpad a partir de esa descripción (añadir `.ts`
   a los imports relativos sin extensión y resolver `@/` contra `TMU_SRC`) y pega su texto
   completo (`hooks.mjs` y `register.mjs`) en `specs/008-ficha-de-jugador/validation.md`; el
   gancho **no se versiona** como archivo (ni en `specs/` ni en `frontend/`), y T2, T3 y T10
   reutilizan el texto pegado. Se descartan versionarlo bajo `specs/008-ficha-de-jugador/`
   (b) y en `frontend/` (c).
   **Bandera:** cuando el grafo de imports incluye TypeScript que no es solo de tipos, Node
   necesita `--experimental-transform-types` (además del gancho); es el caso de
   `mockApi.ts` (T3), que importa `ApiError` de `services/http/httpClient` y este, de
   `transport.ts`, donde `ApiError` usa propiedades de parámetro (`readonly status` en el
   constructor); la 007 la usó por eso en su T4. Si en T1 o T2 un módulo no carga solo con
   el gancho, se añade la misma bandera y se anota.
   `mockUserTarget.ts` y `tabKeys.ts` no tienen imports y se cargan directo. El backend
   simulado (`mockApi.ts`, T3) se comprueba igual, con el gancho, la bandera y sustitutos de
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
| `groupBlocks` frente a `sharedRuns` (decisión del usuario (2026-10-20): opción a, Pregunta 6, P53) | con los bloques en común de **cada** caso anterior: mismo número de tramos y, tramo a tramo en el mismo orden, mismo `day` y mismo `startHour`, y `groupBlocks.endHour === sharedRuns.endHour + 1` (por ejemplo, martes 20–22 → `groupBlocks` 20–23, `sharedRuns` 20–22) | RF-6, RF-7, RNF-6 |
| `sharedHours` sin bloques en común | mías y suyas sin cruce, o alguna `[]` → `blocks` `[]`, `ranges` `[]`, `total` 0 (la interfaz muestra "Sin horas en común esta semana.", P59) | RF-6 |
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
| `formatRankGain` | 7 → "▲ +7 pts desde la primera lectura"; 0 → "▲ +0 pts desde la primera lectura"; −5 → "▼ −5 pts desde la primera lectura" (U+2212); `null` → "Sin datos" (y `=== NO_DATA_TEXT`, P62) | RF-4 (P39, P41), RF-17 |
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
  mock (404 "el jugador no tiene una cuenta vinculada en este juego" al resumen sin cuenta,
  404 "usuario no encontrado" para inexistente, 200 `[]` en cuentas de inexistente; P50).
- RF-26: las 6 consultas (el resumen, una por pestaña vista; P63) con `staleTime: Infinity` y `refetchOnMount: false`; ningún
  `refetchInterval` ni `refetchOnWindowFocus: true`.
- RNF-6: `playerSheet.ts` no reimplementa intersección, agrupado, distancia ni primer
  bloque (importa los de `availability.ts`, `matching.ts` y `proposal.ts`).
- RF-6 (P61): `grep -rn "Sin horas en común esta semana" frontend/src` → un solo resultado,
  en `shared/utils/copy.ts`; `MatchEntry.tsx` y `SharedHoursBlock.tsx` usan la constante.
- RF-17 (P62): `grep -rn "Sin datos" frontend/src` → fuera de los comentarios (`//`, `/* */`,
  `*` de JSDoc), un solo resultado, la constante `NO_DATA_TEXT` en `shared/utils/copy.ts`;
  cada resultado que sea comentario se anota como tal. `rankProgress.ts`, `GameSummaryPanel.tsx`,
  `AccountRow.tsx`, `RankDistanceBlock.tsx` y `MatchEntry.tsx` importan `NO_DATA_TEXT`, y
  `RankScale.tsx` y `ProfilePage.tsx` no tienen el literal.
- Textos de D10-3 (P66; T11; Preguntas 11 a 13, opción a): `grep` de cada texto de la tabla de
  4.6, incluidos `lectura registrada`, `lecturas registradas`, `Primera lectura:` y la forma
  `Δ <n> pts` (`grep -rnE 'Δ \$?\{' frontend/src`, que encuentra `Δ {…}` en JSX y `Δ ${…}` en
  plantillas) → como literal de interfaz, solo en `shared/utils/copy.ts`, con los comentarios
  anotados y sin excepciones (también fuera de la ficha: `ProfilePage.tsx`, `MatchEntry.tsx`,
  `HoursSheet.tsx` y `CrossingVisual.tsx`, P67); para "Horas en común" se busca el literal exacto
  (como cadena completa o texto JSX completo) y "Horas en común por semana"
  (`MatchFiltersPanel.tsx`) y el mensaje del mock (`mockApi.ts`) se anotan como textos distintos
  (P67); `features/players/hooks.ts` dice "6 consultas" (observación O-1 de T10, P63).

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
| RF-6 | 3.1, 4.6; `sharedHours`, `distanceView`; `SharedHoursBlock`, `RankDistanceBlock`; constante de lista vacía en `copy.ts` compartida con `MatchEntry` (P61) | Node (tramos, `groupBlocks` frente a `sharedRuns`, lista vacía, distancia); Recorrido (mismas horas y distancia que coincidencias); Estados (ficha de C: "Sin horas en común esta semana."); `grep` del texto (un solo resultado, en `copy.ts`) |
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
| RF-17 | `readNormalized`, `readWinRate`, `distanceView`, `formatRankGain`; `GameSummaryPanel`; `NO_DATA_TEXT` en `copy.ts` compartida con perfil y coincidencias (P62) | Node; revisión de código; `grep` de "Sin datos" (fuera de comentarios, solo en `copy.ts`) |
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
| RNF-5 | 4.7; recuadro de la grilla | 360 px; Lighthouse en los dos temas; selector de color (el texto del botón deshabilitado, exento; P65, cambio B aprobado el 2026-10-20). D10-1 y D10-2 abiertos (P60) |
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
  plan (Pregunta 1). **Cerrado (2026-10-20, P51):** la 007 está implementada (T1–T31) y la
  revisión de coherencia del cambio A comprobó las piezas contra su código.
- **R-2. Validación con el servidor real.** Necesita 005 y 006 implementadas en `backend/`
  (el 2026-10-18 no lo estaban) y la 007 completa. El código de la 008 avanza en modo
  simulado. **Cerrado (2026-10-20, P51):** 005 y 006 implementadas el 2026-10-19; 007
  completa.
- **R-3. Dos agrupaciones de tramos.** El plan 007 define `sharedRuns` en `proposal.ts` y el
  código ya tiene `groupBlocks`. Si divergen, la lista de tramos de la ficha y la duración
  propuesta podrían no casar. Mitigación original: la comprobación con Node de 6.1 ejecuta
  los mismos casos sobre las dos y exige el mismo agrupado; si la 007 aún no lo hizo,
  conviene que `sharedRuns` se apoye en `groupBlocks` (lo decide la 007).
  **Actualización (2026-10-20, P53):** la 007 está cerrada y no lo hizo: `sharedRuns`
  (`domain/proposal.ts`) recorre la salida de `intersectBlocks` y da `endHour` inclusivo;
  `groupBlocks` (`domain/availability.ts`) agrupa por día y da `endHour` exclusivo. Agrupan
  los mismos bloques, pero "el mismo agrupado" de la mitigación original no se cumple
  literalmente (el final difiere en 1). Decisión del usuario (2026-10-20): opción a,
  Pregunta 6. La lista de tramos usa `groupBlocks` y la propuesta `sharedRuns`, sin tocar
  la 007; la comprobación de 6.1 exige el mismo día y la misma hora de inicio, con
  `groupBlocks.endHour === sharedRuns.endHour + 1`, de modo que una divergencia futura sale
  en rojo. Riesgo aceptado.
- **R-4. Contraste de `note--faint`.** `--ink-3` puede quedar por debajo de 4,5:1 en algún
  tema; los textos de estado de la ficha usan `note` (`--ink-2`) y se miden en la
  validación. **Actualización (2026-10-20, P60):** los errores (`Failure`), los vacíos
  (`Blank`) y la Etiqueta (`DemoTag`) llevan `note--faint` fijo en componentes compartidos
  que este plan reutiliza sin cambios. Decisión del usuario (2026-10-20): opción a,
  Pregunta 8. Se reutilizan sin cambios y T10 mide su contraste en los dos temas; si no
  llegan a 4,5:1, defecto anotado y cambio aparte para toda la app, y la 008 no pasa a
  "implementada" mientras tanto (4.7).
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
   Estado (2026-10-20, P51): condición cumplida; la 007 está implementada (T1–T31).
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

## 11. Preguntas del cambio A y decisiones del usuario (2026-10-20)
Del cambio A (2026-10-20). Se numeran a continuación de las Preguntas 1 a 3 (sección 10). El
usuario las respondió el 2026-10-20, todas con la opción a (la recomendada), y están
aplicadas en los puntos que cita cada una. Se conserva el texto de cada pregunta.

**Preguntas abiertas: ninguna.**

4. **"Sin datos" defensivo de la diferencia desde la primera lectura (P52, hallazgo I-1).**
   `rankGainSinceFirst` (007) exige `currentRank` y lanza con `currentRank` nulo; el perfil
   se protege fuera. (a, recomendada) Proteger fuera, como el perfil: `GameSummaryPanel`
   llama a `rankGainSinceFirst` solo si `readNormalized(account) !== null`, y si no, pasa
   `null` a `formatRankGain` ("Sin datos"); no se toca ninguna función de la 007. (b) Cambiar
   `rankGainSinceFirst` para que acepte `currentRank` nulo o ausente y devuelva `null`:
   una sola regla, pero modifica una función de la 007 que ya usa el perfil y obliga a
   repetir su comprobación.
   **Decisión del usuario (2026-10-20): opción a, "Proteger fuera".** Como el perfil: solo
   se llama a `rankGainSinceFirst` si `readNormalized` no es `null`; si no, se pasa `null` a
   `formatRankGain` → "Sin datos". No se toca código de la 007. Aplicada en 2, 5 y tareas
   T5.
5. **Gancho de resolución para las comprobaciones con Node (P54, hallazgo I-2).** (a,
   recomendada) En T1 el implementer reescribe el gancho en el scratchpad a partir de la
   descripción de la 007 (añadir `.ts` a los imports relativos sin extensión y resolver
   `@/` contra `TMU_SRC`) y pega su texto completo (`hooks.mjs` y `register.mjs`) en
   `specs/008-ficha-de-jugador/validation.md`, que es lo que la 008 versiona; T2, T3 y T10
   reutilizan ese texto. Sigue la regla de la 007 (los scripts no se versionan) y deja el
   método reproducible. (b) Versionar el gancho como archivos propios bajo
   `specs/008-ficha-de-jugador/` (por ejemplo, `validation/node-hooks/`): reutilizable tal
   cual, pero añade código ejecutable dentro de `specs/`. (c) Versionarlo en `frontend/`
   (por ejemplo, `frontend/scripts/`): es la ubicación natural del código, pero contradice
   la decisión de la 007 (sin pruebas versionadas en el frontend; constitución, principio
   4) y exigiría un cambio de esa decisión. En las tres, la bandera
   `--experimental-transform-types` ya queda fijada (6, punto 1).
   **Decisión del usuario (2026-10-20): opción a, "Reescribir en T1".** El implementer
   reescribe el gancho de Node en el scratchpad a partir de la descripción de la
   `validation.md` de la 007 y pega su texto completo en
   `specs/008-ficha-de-jugador/validation.md`; no se versiona; bandera
   `--experimental-transform-types` como fija 6, punto 1. Aplicada en 5, 6 (punto 1) y
   tareas (reglas, T1, T3 y T10).
6. **Qué agrupado de tramos usa la ficha (P53, hallazgo M-1).** (a, recomendada) La lista
   de tramos usa `groupBlocks` + `formatRange` (lo que RF-6 pide: "como en la vista de
   coincidencias") y la propuesta sigue en `buildProposal`, que usa `sharedRuns`; no se
   cambia código de la 007. La comprobación de 6.1 ejecuta los casos de 3.1 sobre las dos y
   exige el mismo día y la misma hora de inicio, con `groupBlocks.endHour ===
   sharedRuns.endHour + 1` en cada tramo. (b) Refactorizar `sharedRuns` para que se apoye en
   `groupBlocks` (una sola agrupación): elimina la duplicación, pero cambia
   `domain/proposal.ts` de la 007, que el plan dice usar sin crear ni cambiar (sección 0), y
   obliga a repetir su comprobación (T24 de la 007). (c) La ficha usa `sharedRuns` también
   para la lista, convirtiendo el final: diverge del código de coincidencias.
   **Decisión del usuario (2026-10-20): opción a, "Cada una para lo suyo".** La lista de
   tramos usa `groupBlocks` (como coincidencias, RF-6); la propuesta sigue con
   `buildProposal`/`sharedRuns`. La comprobación de Node exige mismo día y misma hora de
   inicio, con `endHour` de `groupBlocks` = el de `sharedRuns` + 1. No se toca código de la
   007. Aplicada en 2, 4.2, 5, 6.1, R-3 y tareas T1 y T7.
7. **Texto de la lista de tramos vacía (P59, hallazgo M-5; spec, "Dudas abiertas").** (a,
   recomendada) "Sin horas en común esta semana.", el mismo texto que la fila de
   coincidencias (`MatchEntry.tsx`), coherente con RF-6 ("como en la vista de
   coincidencias"); se añade a `copy.ts` como texto nuevo y a la spec (RF-6) para que conste.
   (b) "Sin horas en común", el texto que traía el plan: más corto, pero no coincide con
   coincidencias y hay que añadirlo a la spec. (c) Ningún texto en la lista: el total ("0
   horas en común") y el motivo de "Proponer sesión" ya lo dicen; menos texto, pero la
   lista queda como un hueco y se aparta de coincidencias.
   **Decisión del usuario (2026-10-20): opción a.** Texto "Sin horas en común esta
   semana." (el de `MatchEntry.tsx`). Comprobado el 2026-10-20: `copy.ts` no tiene ninguna
   constante con ese texto, así que se añade como texto nuevo (4.6). Quedó en la spec
   (RF-6, Casos límite, criterio de Estados) y cierra su [NECESITA ACLARACIÓN]. Aplicada en
   4.2, 4.6, 5, 6.1 y tareas T6 y T7.
8. **Contraste de errores, vacíos y Etiqueta (`note--faint`) (P60, hallazgo M-7).** RNF-5 de
   la spec exige 4,5:1 en todo texto de la ficha en los dos temas. (a, recomendada) La ficha
   reutiliza `Failure`, `Blank` y `DemoTag` sin cambios (como el resto de la app) y la
   validación (T10, criterio de 360 px y contraste) los mide; si alguno no llega a 4,5:1, se
   anota como defecto y se abre un cambio aparte (token `--ink-3` o componentes
   compartidos), que afectaría a toda la app y no solo a la ficha. Se quita del plan la
   promesa de pasarlos a `note`. (b) La 008 cambia ya `Failure`, `Blank` y `DemoTag` a
   `note` (o añade una prop para elegir la clase): asegura el contraste en la ficha, pero
   cambia el aspecto del perfil, Configuración, coincidencias y la agenda, y rompe el
   "Hecho cuando" de T5 (capturas iguales). (c) Ajustar el token `--ink-3` en
   `styles/tokens.css` para que llegue a 4,5:1 en los dos temas: arregla el contraste en
   toda la app, pero es un cambio visual global fuera del alcance de la 008. Con (a), si la
   medida falla, la casilla de contraste de la spec (RNF-5) queda con un defecto abierto y la
   008 no pasa a "implementada" hasta resolverlo.
   **Decisión del usuario (2026-10-20): opción a, "Medir en T10".** Se reutilizan
   `Failure`, `Blank` y `DemoTag` sin cambios; T10 mide el contraste en los dos temas; si no
   llegan a 4,5:1, se anota como defecto y se abre un cambio aparte para toda la app; la 008
   no pasa a "implementada" mientras tanto. Aplicada en 4.7, 5, R-4 y tareas T6 y T10.
9. **Literal repetido de "Sin horas en común esta semana." (P61; surgida al aplicar la
   Pregunta 7).** La cabecera de `shared/utils/copy.ts` dice "Única fuente: ningún otro
   archivo los repite", y `MatchEntry.tsx` (coincidencias) tiene ese mismo texto escrito a
   mano; con la constante nueva de la Pregunta 7 el texto quedaría en dos sitios. (a,
   recomendada) En T9, que ya modifica `MatchEntry.tsx` para el enlace de RF-2, se cambia
   también ese literal por la constante nueva de `copy.ts` (que añade T6); en pantalla no
   cambia nada. (b) Dejar el literal en `MatchEntry.tsx` y anotar la excepción: no toca
   coincidencias más allá del enlace, pero contradice la cabecera de `copy.ts` y permite que
   la ficha y coincidencias diverjan. (c) Hacer la sustitución en T6 o en una tarea aparte:
   separa el cambio del enlace, pero toca `MatchEntry.tsx` en dos tareas o añade una tarea.
   **Decisión del usuario (2026-10-20): opción a.** T9 cambia el literal de `MatchEntry.tsx`
   por la constante de `copy.ts`; en pantalla no cambia nada. T6 sigue siendo la que añade la
   constante y va antes que T9. Aplicada en 1, 4.6, 5, 6.2, 7 y tareas (reglas, T6, T9 y
   T10).
10. **Literales repetidos de "Sin datos" (P62; surgida al aplicar la Pregunta 9).** La sección
   4.6 pone "Sin datos" como texto nuevo de `copy.ts`, cuya cabecera dice "Única fuente:
   ningún otro archivo los repite", y ese texto ya está escrito a mano en seis sitios de
   código: `ProfilePage.tsx` (3), `AccountRow.tsx` (1), `RankScale.tsx` (1) y `MatchEntry.tsx`
   (2) (los comentarios que lo mencionan no cuentan). (a, recomendada) Sustituir cada literal
   por la constante en la tarea que ya modifica su archivo (T5 para `ProfilePage`,
   `AccountRow` y `RankScale`; T9 para `MatchEntry`), sin cambio visible. (b) Dejar los
   literales y anotar la excepción: no toca más código, pero contradice la cabecera de
   `copy.ts` y permite que perfil, coincidencias y ficha diverjan. (c) Hacer las sustituciones
   en una tarea aparte: separa el cambio, pero añade una tarea o toca los mismos archivos dos
   veces.
   **Decisión del usuario (2026-10-20): opción a.** Cada literal pasa a ser la constante en la
   tarea que ya modifica su archivo: `ProfilePage`, `AccountRow` y `RankScale` en T5;
   `MatchEntry` (×2) en T9; en pantalla no cambia nada. Al final "Sin datos" aparece como
   literal de interfaz solo en `copy.ts` (`grep` en T10, ignorando comentarios). El planner
   eligió, por encargo del usuario, la tarea que añade la constante: T2, que ya crea
   `formatRankGain` con "Sin datos" y va antes que T5 (que la usa) y que T6 (que añade el resto
   de los textos nuevos); `formatRankGain` devuelve la constante y no otro literal. En la misma
   edición T2 actualiza la cabecera de `copy.ts` a "las specs 007 y 008" (comentario, sin efecto
   en pantalla). Aplicada en 1, 2, 4.2, 4.6, 5, 6.1, 6.2, 7 y tareas (reglas, T2, T5, T6, T7,
   T9, T10 y la trazabilidad de RF-17).

## 12. Cambio A — revisión de coherencia contra el código (2026-10-20)
Estado: **aprobado (2026-10-20, por el usuario: "Apruebo el cambio A")**. Origen: revisión del reviewer
contra el código vigente antes de la T1 (007 implementada T1–T31; 004, 005 y 006
implementadas el 2026-10-19 con DP6-37, DP6-40 y los cambios A y B de la 005), con resultado
CAMBIOS NECESARIOS; el usuario pidió que el planner corrigiera. Sin impacto en la 008 (no se
tocan): DP6-37, cambios A y B de la 005 y DP6-40; DP6-33 sigue cubierta por RF-7 (P46).
Las correcciones aplicadas son objetivas (alinean el plan con el código y las specs
vigentes); las que admitían más de una solución se plantearon como Preguntas 4 a 10 (sección
11), que el usuario respondió el 2026-10-20 (opción a en todas) y están aplicadas.
Preguntas abiertas: ninguna.

| Id | Hallazgo | Qué cambia | Dónde | Estado |
| --- | --- | --- | --- | --- |
| P50 | B-1 | Textos del servidor en minúscula y sin punto (spec 004, DP-6): "usuario no encontrado", "el jugador no tiene una cuenta vinculada en este juego", "juego no válido"; el mock ya los tiene en `MESSAGES` y se reutilizan. Ningún texto propio de la ficha cambia | spec (RF-11, Casos límite, criterio de modo simulado); plan 0, 3.4, 4.5, 6.2; tareas T3, T10 | Aplicado |
| P51 | M-8 | Estado de las dependencias al 2026-10-20 (001–007 implementadas), sin reescribir la historia; R-1 y R-2 cerrados | spec (cabecera, Contexto); plan (cabecera, 0, 9, 10); tareas (cabecera, dependencias, T10) | Aplicado |
| P52 | I-1 | Se retira la suposición falsa de que `rankGainSinceFirst` devuelve `null` sin rango vigente | plan 2, 5, 11; tareas T5 | Aplicado; Pregunta 4 respondida (2026-10-20, opción a: proteger fuera) y aplicada |
| P53 | M-1 | Se documenta que `sharedRuns` (final inclusivo) y `groupBlocks` (final exclusivo) siguen separados tras cerrar la 007; lista con `groupBlocks`, propuesta con `sharedRuns`, comprobación de Node con `endHour` + 1 | plan 2, 4.2, 5, 6.1, R-3; tareas T1, T7 | Aplicado; Pregunta 6 respondida (2026-10-20, opción a) y aplicada |
| P54 | I-2 | El gancho no está versionado en la 007 (solo descrito); se reescribe en T1 y su texto se pega en `validation.md`, sin versionarlo; bandera `--experimental-transform-types` (obligatoria en T3) | plan 5, 6; tareas (reglas, T1, T3, T10) | Aplicado; Pregunta 5 respondida (2026-10-20, opción a) y aplicada |
| P55 | M-2 | `enabled: sessionUserId !== null && !own` en las 6 consultas (007 T31, D-A2; "7" corregido a 6 por P63) | plan 3.7; tareas T4 | Aplicado |
| P56 | M-3 | El aviso global es 007 RF-11, no RF-27 | plan 4.1 | Aplicado |
| P57 | M-4 | Los motivos 3 a 6 se reutilizan de `PROPOSAL_BLOCK_REASONS`; "Reintentar" es de `Failure`; `copy.ts` solo recibe los textos nuevos | plan 4.6; tareas T6, T8 | Aplicado |
| P58 | M-6 | Tipos que compilan: `GAME_IDS.find(...)` en lugar de `includes`; `TimeBlock[]` mutable hacia `groupBlocks` y `HoursSheet` | plan 2, 5; tareas T1, T7 | Aplicado |
| P59 | M-5 | "Sin horas en común" no estaba en ninguna spec; la lista vacía muestra "Sin horas en común esta semana.", nueva constante de `copy.ts` | plan 4.2, 4.6, 5, 6.1; spec (cabecera, RF-6, Casos límite, criterio de Estados, Decisiones, Dudas abiertas); tareas T6, T7 | Aplicado; Pregunta 7 respondida (2026-10-20, opción a) |
| P60 | M-7 | Contradicción entre "reutilizar sin cambios" y "pasar a `note`" para errores, vacíos y Etiqueta: se reutilizan sin cambios y T10 mide el contraste | plan 4.7, 5, R-4; tareas T6, T10 | Aplicado; Pregunta 8 respondida (2026-10-20, opción a) |
| P61 | Derivado de P59 | `MatchEntry.tsx` tenía "Sin horas en común esta semana." escrito a mano, contra la cabecera de `copy.ts` (única fuente); en T9 pasa a leer la constante que añade T6, sin cambio en pantalla | plan 1, 4.6, 5, 6.2, 7; spec (Decisiones, cambio A); tareas (reglas, T6, T9, T10, trazabilidad) | Aplicado; Pregunta 9 respondida (2026-10-20, opción a) |
| P62 | Derivado de P61 | "Sin datos" (texto nuevo de 4.6) estaba escrito a mano en 6 sitios de código (`ProfilePage` ×3, `AccountRow`, `RankScale`, `MatchEntry` ×2), contra la cabecera de `copy.ts`; pasa a ser `NO_DATA_TEXT`, que añade T2 (con `formatRankGain` y la cabecera de `copy.ts` actualizada a "las specs 007 y 008"), y se sustituye en T5 y T9, sin cambio en pantalla | plan 1, 2, 4.2, 4.6, 5, 6.1, 6.2, 7; spec (Decisiones, cambio A); tareas (reglas, T2, T5, T6, T7, T9, T10, trazabilidad) | Aplicado; Pregunta 10 respondida (2026-10-20, opción a) |

## 13. Ajustes durante la implementación
Desviaciones encontradas al implementar que el usuario decidió aceptar (se corrigen los
documentos para que reflejen el código) y defectos hallados en una tarea posterior (se
documenta la corrección decidida por el usuario). P63, P64, P66 y P67 no cambian ningún RF ni la
spec (no cita el número de consultas, la forma de las claves ni dónde viven los textos); P65 sí
cambia la spec (RNF-5, cambio B, aprobado (2026-10-20, por el usuario: "Apruebo el cambio B")).

| Id | Origen | Qué cambia | Dónde | Estado |
| --- | --- | --- | --- | --- |
| P63 | T4 (2026-10-20), dos desviaciones del implementer respecto del plan | (1) **Son 6 consultas, no 7.** El plan decía "las 7 consultas", pero 3.6 y 3.7 enumeran seis: del jugador, usuario, cuentas, disponibilidad y resumen (una consulta por pestaña vista); propias, cuentas y disponibilidad (`frontend/src/features/players/hooks.ts`). En 3.7, "las 6 primeras en paralelo" pasa a "las 5 primeras en paralelo" y el resumen después. (2) **Forma de las claves.** Del otro jugador `['u', sessionUserId, 'player', visit, 'them', id, 'user' \| 'accounts' \| 'availability' \| ['summary', g]]`; propias `['u', sessionUserId, 'player', visit, 'own', 'accounts' \| 'availability']` (`frontend/src/app/providers/queryKeys.ts`). Motivo: con la forma anterior (`…, visit, id, 'accounts'` frente a `…, visit, 'own', 'accounts'`), la dirección `/jugadores/own` compartiría la clave de las cuentas propias. Alternativa descartada: mantener la forma del plan y prohibir el id `own` en la ficha (añade una regla que la spec no tiene; RF-9 deja el formato del identificador al servidor). **Decisión del usuario (2026-10-20): aceptar las desviaciones de T4 y corregir los documentos** ("Seguir y corregir docs") | plan 1, 3.6, 3.7, 5, 6.2, P55 (sección 12); tareas T4, T10 y "Ajustes durante la implementación" | Aplicado |
| P64 | T8 (2026-10-20), defecto de T4 | **Defecto.** Al salir de la ficha, `usePlayerTab` escribe `?juego=` en la página de destino: "Proponer sesión" llega a `/agenda?juego=lol` y pierde `location.state.proposal` (fallan RF-7 y RF-21), y cualquier salida añade `?juego=` al destino (p. ej. `/perfil?juego=lol`). **Causa.** `AppLayout` (007) envuelve las páginas en `AnimatePresence mode="wait"`; la ficha saliente sigue montada durante la animación de salida, lee la dirección nueva (sin `?juego=`), `resolveTab` da `mustReplace` y el efecto hace `setSearchParams({ juego }, { replace: true })` sobre la dirección de destino, que sustituye su entrada y su `state`. **Decisión del usuario (2026-10-20): "Arreglar usePlayerTab".** La corrección de la dirección y `selectTab` solo actúan si la ruta actual sigue siendo la ficha (`useMatch(ROUTES.player)` o equivalente). **Alternativa descartada:** cambiar `AppLayout` (p. ej. quitar `mode="wait"` o la animación): toca código compartido de la 007 y obliga a repetir las capturas de las demás vistas. Se corrige dentro de T8, con nueva verificación de los puntos de T4 y T6 que dependen de `usePlayerTab` (pestaña en la dirección, corrección con `replace`, cambio de pestaña sin entrada nueva). Ningún RF cambia y la spec no se toca | plan 1, 3.3 (pseudocódigo de `usePlayerTab` y nota "Solo mientras la ruta sea la ficha"); código de T4 (`features/players/usePlayerTab.ts`) corregido en T8; tareas T8, trazabilidad (RF-5 y RF-20 incluyen T8) y "Ajustes durante la implementación" | Aplicado (código corregido en T8, hecha el 2026-10-20) |
| P65 | T10 (2026-10-20), posible cambio de spec C10-1 | **Cambio de spec (cambio B).** El texto de "Proponer sesión" deshabilitado (`aria-disabled`, atenuado) da 1,74:1 en el tema oscuro y 2,61:1 en el claro; RNF-5 pedía 4,5:1 en "todo texto de la ficha". **Decisión del usuario (2026-10-20): "Excepción (WCAG)".** RNF-5 exime del mínimo el texto de los componentes de interfaz inactivos (deshabilitados), como WCAG 2.x, criterio 1.4.3; el texto del motivo asociado (motivo de RF-12 o texto de RF-23, hoy ≥ 7,36:1) sí debe cumplirlo. **Alternativa descartada:** tratarlo como un defecto más y subir el contraste del botón deshabilitado (estilo `aria-disabled` de `btn` compartido con toda la app: sería otro cambio visual global, como D10-1 y D10-2). Sin cambios de código ni tareas nuevas | spec (cabecera, RNF-5, criterio de 360 px y contraste, Decisiones: cambio B); plan cabecera, 4.7, 7 (RNF-5); tareas (cabecera, trazabilidad de RNF-5, "Ajustes durante la implementación") | Aplicado en los documentos; **cambio B aprobado (2026-10-20, por el usuario: "Apruebo el cambio B")** |
| P66 | T10 (2026-10-20), defecto D10-3 | **Defecto.** Títulos, etiquetas y unidades de la ficha escritos en los componentes en lugar de `copy.ts` (lista en 4.6), contra la regla de `tasks.md` y la cabecera de `copy.ts`; sin efecto en pantalla. **Decisión del usuario (2026-10-20): "Moverlos a copy.ts".** Todos pasan a constantes de `copy.ts` en la tarea nueva T11, sin cambio visible; en la misma tarea se corrige la observación O-1 (comentario de `features/players/hooks.ts:13`, "7 consultas" → 6, P63). **Alternativa descartada:** ajustar la regla del plan para permitir títulos y etiquetas en los componentes (lo dejaba abierto el registro de T10): contradice la cabecera de `copy.ts` ("Única fuente") y el criterio que ya aplicaron P61 y P62. **Alcance fijado por las Preguntas 11 a 13 (sección 14), respondidas por el usuario el 2026-10-20 (opción a en las tres):** T11 cambia también "se inscribió" en `ProfilePage.tsx:65`, `'hora'`/`'horas'` en `MatchEntry.tsx:110` y la leyenda "Horas en común" de `HoursSheet.tsx:136`, y los textos "lectura registrada"/"lecturas registradas" y "Primera lectura:" de `GameSummaryPanel.tsx` y el formato "Δ <n> pts" de `RankDistanceBlock.tsx:84` y `MatchEntry.tsx:99` (`rankDistanceText`), todo sin cambio visible y sin excepciones en el `grep` | plan cabecera, 1 (`copy.ts`, `ProfilePage.tsx`, `MatchEntry.tsx`, `HoursSheet.tsx`), 4.6, 6.2; tareas (cabecera, reglas, T11, "Ajustes durante la implementación", decisiones de las Preguntas 11 a 13) | Aplicado en los documentos; **código pendiente en T11 (lista para empezar)**; Preguntas 11 a 13 respondidas y aplicadas |
| P67 | T11 (2026-10-20), inventario del paso 1 (`validation.md`, 5.1) | **Literal en un archivo no listado.** "Horas en común" aparece también en `frontend/src/app/pages/CrossingVisual.tsx:23` (`{ id: 'horario', label: 'Horas en común', … }`, pintado en `:129` en la portada, `LandingPage`), que la tabla de 4.6 no listaba; T11 paró y lo reportó, como manda su paso 1. El mismo `grep -rnF` encuentra dos textos más largos que contienen la cadena: "Horas en común por semana" (`MatchFiltersPanel.tsx:75`, rótulo del filtro) y el mensaje de error del mock (`mockApi.ts:192`, copia del literal del servidor de la 005). **Decisión del usuario (2026-10-20): "Incluir la portada".** T11 cambia también `CrossingVisual.tsx:23` (solo ese literal) por `SHARED_HOURS_TITLE`, sin cambio visible, con capturas de la portada antes y después (pasos 2 y 5) y volcado de su texto. Los otros dos son textos distintos y no se tocan: la comprobación del "Hecho cuando" (1) busca el literal exacto "Horas en común" y los anota como textos distintos. **Alternativa descartada:** dejar la portada con su literal y anotarlo como excepción en el `grep` (contradice "sin excepciones" de 4.6 y la cabecera de `copy.ts`). Ningún RF cambia y la spec no se toca | plan cabecera, 1 (`CrossingVisual.tsx`), 4.6 (tabla y nota), 6.2; tareas (reglas, T11: archivos, pasos 1, 2, 3 y 5, "Hecho cuando"; "Ajustes durante la implementación") | Aplicado en los documentos; código en T11 |

## 14. Preguntas de T11 (2026-10-20), respondidas
Surgidas al preparar T11 (P66), comprobando los archivos el 2026-10-20. Se numeran a
continuación de las Preguntas 1 a 10. El usuario las respondió el 2026-10-20 (opción a en las
tres) y están aplicadas en 1, 4.6, 6.2 y en T11. Preguntas abiertas: ninguna; T11 está lista
para empezar.

11. **"se inscribió" también en el perfil.** `ProfilePage.tsx:65` escribe el mismo texto, en el
    mismo elemento que `PlayerHeader.tsx:23`. (a, recomendada) T11 cambia también ese literal
    por la constante de `copy.ts`, sin cambio visible (mismo criterio que P61 y P62;
    `ProfilePage.tsx` ya lo modificó T5), y el `grep` de T11 da un solo resultado, en `copy.ts`.
    (b) Dejar el perfil como está y anotar la excepción en el `grep`: no toca el perfil, pero
    el texto queda en dos sitios y ficha y perfil pueden divergir.
    **Decisión del usuario (2026-10-20): opción a, "Sí, cambiarlo".** T11 cambia también "se
    inscribió" de `ProfilePage.tsx:65` por `JOINED_TEXT`, sin cambio visible. Aplicada en 1,
    4.6, 6.2 y T11.
12. **"hora"/"horas" y "Horas en común" en componentes de la 007.** `MatchEntry.tsx:110` usa
    `pluralize(…, 'hora', 'horas')` (columna "En común" de coincidencias) y `HoursSheet.tsx:136`
    escribe "Horas en común" en la leyenda de la grilla (la ficha y coincidencias la muestran).
    (a, recomendada) T11 los cambia también por las mismas constantes, sin cambio visible, y
    añade capturas de coincidencias (fila y cajón abierto) antes y después; el `grep` da un solo
    resultado por texto, en `copy.ts`. (b) Dejarlos: T11 solo toca los archivos de la ficha y
    `GameSummaryPanel`, y el `grep` anota esas dos excepciones (son componentes de la 007, que
    la 008 no está obligada a cambiar).
    **Decisión del usuario (2026-10-20): opción a, "Sí, cambiarlos".** T11 cambia también
    `pluralize(…, 'hora', 'horas')` de `MatchEntry.tsx:110` por `HOUR_UNIT` y la leyenda "Horas
    en común" de `HoursSheet.tsx:136` por `SHARED_HOURS_TITLE`, sin cambio visible, con
    capturas antes y después de coincidencias (fila y cajón de horas abierto, que muestra la
    grilla con la leyenda). Aplicada en 1, 4.6, 6.2 y T11.
13. **Textos de la ficha que la lista de D10-3 no recoge.** `GameSummaryPanel.tsx`: `lectura
    registrada` / `lecturas registradas` (`:66-67`) y `Primera lectura:` (`:86`);
    `RankDistanceBlock.tsx:84`: el formato `Δ <n> pts` (también en `MatchEntry.tsx:99`). (a,
    recomendada) Incluirlos en T11 con el mismo criterio ("todos los textos de interfaz de la
    ficha"); el formato de la distancia como función `rankDistanceText(n)` de `copy.ts`, y
    `MatchEntry.tsx:99` solo si la Pregunta 12 es (a). (b) Dejarlos fuera: T11 cubre solo la
    lista de D10-3 y estos quedan anotados como observación.
    **Decisión del usuario (2026-10-20): opción a, "Incluirlos".** T11 incluye también
    "lectura registrada"/"lecturas registradas" (`GameSummaryPanel.tsx:66-67`, `READINGS_UNIT`),
    "Primera lectura:" (`:86`, `FIRST_READING_LABEL`) y el formato "Δ <n> pts" como
    `rankDistanceText(n)` en `RankDistanceBlock.tsx:84` y, como la Pregunta 12 es (a), en
    `MatchEntry.tsx:99`, sin cambio visible. Aplicada en 1, 4.6, 6.2 y T11.
