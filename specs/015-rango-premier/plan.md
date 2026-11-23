# Plan 015 — Rango Premier real de CS2 con Leetify
Estado: aprobado (2026-11-19, por el usuario al pedir las tareas con `/sdd-tasks`). Ampliado el
2026-11-19 con el cambio de requisitos D26 a D30 (§12), aprobado por el usuario el 2026-11-19.
Ampliado el 2026-11-19 con el cambio D31 y D32 (§13), aprobado por el usuario el 2026-11-19
(también el riesgo R8). Ampliado el 2026-11-19 con el cambio D33 y D34 (§14), aprobado por el
usuario el 2026-11-19.

Spec: `specs/015-rango-premier/spec.md` (aprobada el 2026-11-18; revisión tras la clarificación,
D6 a D25, aprobada el 2026-11-19; sin dudas abiertas). Base: código de las specs 012, 013 y 014
en la rama `feature/vinculacion-steam-riot` (commit `6faee8d`).

La 013 dejó la verificación de CS2 con Steam (OpenID, perfil y horas) y la resincronización
genérica de la 012 (`realSources.ts`). Esta spec agrega **una segunda fuente solo para el bloque
de rango e historial** de las cuentas de CS2 verificadas: Leetify. Sin dependencias nuevas
(RNF-6): Node 22 trae `fetch` y `AbortController`.

## 0. Estado real del código (comprobado el 2026-11-19)
- `backend/src/domain/sources.ts`: `SOURCE_IDS = ["steam", "riot"]` sirve a la vez como fuente de
  verificación y como origen de bloque; `Origin = "simulated" | SourceId`. `SOURCE_BLOCKS.steam =
  ["identity", "profile"]`: hoy el rango de CS2 verificado es **simulado**.
- `backend/src/domain/verification.ts`: `verifiedState` / `applyRealSync` reemplazan el rango solo
  si la fuente lo entrega; Steam no lo entrega, así que la cuenta conserva el rango simulado.
- `backend/src/models/gameAccount.ts`: `currentRank` es obligatorio salvo con
  `verification.source === "riot"`; `toGameAccountJson` es lista blanca.
- `backend/src/controllers/steam.ts` (`POST /complete`): confirmación con Steam (8 s) → perfil
  (8 s; si falla, se verifica sin perfil, RF-12 de la 013) → `verifyAccount({ real })`.
- `backend/src/controllers/accounts.ts` (`POST /:id/sync`): para Steam usa el camino genérico de
  la 012: espera mínima (sin espera si no hay perfil, D6 de la 013) → `readWithTimeout` → 503/404
  o escritura con `applyReal`. **No tiene bloqueo**: dos resincronizaciones simultáneas leen
  ambas la fuente (RF-19 no se cumple hoy).
- `backend/src/services/matchInputs.ts`: ya tiene la variante `unranked` (409) y el filtro de
  candidatas, solo para LoL (spec 014, RF-33).
- `backend/src/server.ts`: `migrateAccounts()` corre entre `init()` de índices y `listen`; es el
  sitio de RF-20.
- Frontend: `OriginTag` rotula por bloque con `originLabel`; `SyncAccountResult.syncNotice` y su
  aviso en la fila ya existen (spec 014, RF-53) y se reutilizan para RF-16; `MatchesPage` ya pinta
  el mensaje de un 409; `formatRank` ya produce «Gold · 36210 CS Rating» (`pointsLabel` de CS2);
  el modo simulado **nunca** verifica con Steam (`mockApi.ts`, D10 de la 013), así que nunca
  produce el origen Leetify (RF-23 se cumple por construcción y se protege, §7).

### API de Leetify (comprobado en `https://api-public-docs.cs-prod.leetify.com/swagger.json`)
- `GET https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=<SteamID64>`.
- Clave opcional en la cabecera `_leetify_key` (o `Authorization: Bearer`); sin clave funciona
  con límites más bajos (D24). Una clave inválida responde 401.
- Respuesta 200: `ProfileResponse` con `ranks.premier: number | null` (además `privacy_mode`,
  `steam64_id`, estadísticas y partidas, que **no se leen**: D3, RNF-3).
- La documentación solo describe el 200. Que un SteamID64 sin perfil responda **404** es una
  suposición (P15-3) que se confirma en el recorrido manual (criterio de finalización 3).

## 1. Modelo de estados del rango de una cuenta de CS2 verificada
Una lectura de Leetify termina en `rated(rating)`, `unrated` o `failed` (Definiciones, RF-2,
RF-14). La cuenta guarda un campo nuevo `premier` con su estado (P15-1):

| `premier`     | `currentRank`            | Se ve                         | Coincidencias |
|---------------|--------------------------|-------------------------------|---------------|
| `rated`       | snapshot con el rating   | «Gold · 36210 CS Rating»      | sí            |
| `unrated`     | `null`                   | «sin rango Premier»           | no (RF-7)     |
| `unavailable` | `null`                   | «rango no disponible»         | no (RF-8)     |

Transiciones (`applyLeetifyReading`, §3):

| Estado previo   | `rated(r)`                                   | `unrated`                      | `failed`        |
|-----------------|----------------------------------------------|--------------------------------|-----------------|
| al verificar    | `rated(r)` (RF-3)                            | `unrated`                      | `unavailable` (RF-15) |
| `rated(r0)`     | `rated(r)` (RF-11)                           | `unrated`, rating borrado (RF-9) | sin cambios (RF-18) |
| `unrated`       | `rated(r)`                                   | sin cambios                    | sin cambios     |
| `unavailable`   | `rated(r)`                                   | `unrated`                      | sin cambios     |

El historial (`rankHistory`) de una cuenta de CS2 verificada es **siempre `[]`** (RF-11, D27):
ninguna transición agrega puntos. Hasta el cambio D26–D30 la tabla agregaba un punto por cada
rating distinto y conservaba el historial al pasar a `unrated`; eso queda retirado (§12).

Las cuentas de CS2 **sin verificar** no tienen `premier` y siguen 100 % simuladas (RF-22).

## 2. Archivos y responsabilidades

### Backend — dominio (funciones puras; solo importan de `domain/`)
- **`domain/leetify.ts`** (nuevo). RF-2, RF-3, RF-4, RF-5, RF-9, RF-11, RF-14, RF-18.
  Tipos `LeetifyReading` y `PremierState`; `parseLeetifyProfile`, `cs2RealStep`,
  `premierSnapshot`, `verifiedPremier`, `applyLeetifyReading`; textos `LEETIFY_NOTICES` y
  `LEETIFY_ERRORS` (RNF-5).
- **`domain/sources.ts`** (modifica). RF-1, RF-6, RF-13. Separa **fuentes de verificación**
  (`SOURCE_IDS`, sin cambios: `steam`, `riot`) de **orígenes de datos**
  (`DATA_SOURCE_IDS = [...SOURCE_IDS, "leetify"]`); `Origin = "simulated" | DataSourceId`;
  `SOURCE_NAMES` pasa a cubrir `leetify: "Leetify"`. `blockOrigins` asigna `rank: "leetify"` a
  toda cuenta verificada con Steam (también sin rating, D11); `matches` sigue `simulated` (RF-13).
- **`domain/matchQuery.ts`** o **`domain/leetify.ts`**: textos de RF-10 en `LEETIFY_ERRORS`
  (`noPremierForMatches`, `premierUnavailableForMatches`).

### Backend — modelo, servicios, controladores
- **`models/gameAccount.ts`** (modifica). RF-7, RF-8, RF-20. Campo `premier?: "rated" |
  "unrated" | "unavailable"` (enum). `currentRank` admite `null` también si
  `verification.source === "steam" && premier !== "rated"`. JSON: `premierStatus?: "unrated" |
  "unavailable"` (solo si la cuenta no tiene rating; P15-2). `premier` interno no sale.
- **`services/leetifyClient.ts`** (nuevo). RF-2, RF-14, RNF-1, RNF-2, RNF-3. Única pieza con red
  hacia Leetify y con `LEETIFY_API_KEY`; `fetch` inyectable. `readPremier(steamId, signal) →
  LeetifyReading`: arma la URL, añade `_leetify_key` solo si hay clave, delega la forma en
  `parseLeetifyProfile`. Nunca registra la URL, la cabecera ni el error.
- **`services/realSources.ts`** (modifica). RNF-4. Extrae `withTimeout<T>(run, fallback, ms)`
  (lo que hoy hace `readWithTimeout` por dentro) y lo reutiliza: `readWithTimeout` queda igual
  por fuera; `readPremierWithTimeout(client, steamId, ms)` devuelve `failed` al vencer 8 s.
- **`services/accountLock.ts`** (nuevo). RF-19. Bloqueo en memoria por id de cuenta
  (`tryAcquire` / `release`), una instancia por `createApp`. Mismo patrón que `riotUserLock.ts`.
- **`services/verifyAccount.ts`** (modifica). RF-1, RF-3, RF-15. `VerifyInput.premier?:
  LeetifyReading`. En el camino genérico, si `verification.source === "steam"` y llega `premier`,
  el rango y el historial salen de `verifiedPremier(premier, now)` en vez de `base` (se descarta
  el simulado, RF-3) y se guarda `premier`. Riot no cambia.
- **`services/cs2Sync.ts`** (nuevo). RF-1, RF-9, RF-11, RF-16, RF-17, RF-18, RF-19, RNF-4, RNF-7.
  `syncSteamAccount({ accountId, userId, steamSource, leetify, lock, timeouts, at })`: el
  algoritmo de §4.2. Saca de `accounts.ts` el camino de Steam para no engordar el controlador.
- **`services/matchInputs.ts`** (modifica). RF-7, RF-8, RF-10, RF-18. Nueva variante
  `{ kind: "noPremier"; premier: "unrated" | "unavailable" }` para la cuenta propia de CS2 y
  filtro de candidatas `premier: { $nin: ["unrated", "unavailable"] }` en CS2.
- **`controllers/steam.ts`** (modifica). RF-1, RF-2, RF-3, RF-15. Tras la confirmación, perfil de
  Steam y lectura de Leetify **en paralelo** (P15-5); pasa `premier` a `verifyAccount`; responde
  `{ outcome: "verified", account, notice? }` con `LEETIFY_NOTICES.verifyFailed` si la lectura
  falló.
- **`controllers/accounts.ts`** (modifica). RF-16, RF-17, RF-19. Si la cuenta verificada es de
  Steam y hay `steamIntegration`, delega en `syncSteamAccount`; responde `200` con
  `syncNotice` cuando Leetify falló (mismo formato que la 014). Sin `steamIntegration` sigue el
  camino genérico actual (503), así no se rompen las pruebas de la 012.
- **`controllers/matches.ts`** (modifica). RF-10. `noPremier` → 409 con el texto que toca.
- **`app.ts`** (modifica). `AppOptions.leetifyClient?: LeetifyClient`; lo pasa a los routers de
  Steam y de cuentas junto con un `accountLock` por instancia. **Sin cliente** (pruebas antiguas)
  toda lectura es `failed`: nunca hay red en pruebas (RNF-1).
- **`utils/config.ts`** (modifica). RNF-2. `LEETIFY_API_KEY` opcional →
  `Config.leetify = { apiKey: string | null }` (siempre presente: Leetify nunca es «fuente no
  configurada», D24). Valor vacío o con espacios = sin clave.
- **`index.ts`** (modifica). Construye siempre `createLeetifyClient({ apiKey })` y lo pasa a
  `createApp`.
- **`server.ts`** (modifica). RF-20. `migrateAccounts()` agrega la migración de §4.4.
- **`backend/.env.example`** (modifica). RNF-2. `# LEETIFY_API_KEY=` comentada, con su
  explicación (opcional, secreto, https://leetify.com/app/developer).
- **`requests/leetify.rest`** (nuevo). Peticiones manuales: resincronizar CS2 y coincidencias.

### Frontend
- **`domain/types.ts`** (modifica). `Origin` admite `'leetify'`; `GameAccount.premierStatus?:
  'unrated' | 'unavailable'`; `SteamCompleteResult.notice?: string`.
- **`domain/origins.ts`** (modifica). RF-6. `originLabel('leetify') = 'Datos de Leetify'`.
- **`domain/premierDisplay.ts`** (nuevo). RF-4, RF-6, RF-7, RF-8, RF-10, RF-12, RF-21, RF-23.
  `leetifyProfileUrl`, `premierStatusText`, `rankHistoryView`, `originHref`, textos.
- **`shared/components/OriginTag.tsx`** (modifica). RF-6. Prop opcional `href`: con ella pinta
  un `<a>` (`target="_blank"`, `rel="noopener noreferrer"`) con el mismo aspecto.
- **`features/profile/components/AccountRow.tsx`** y **`GameSummaryPanel.tsx`** (modifican).
  RF-4, RF-6, RF-7, RF-8, RF-12, RF-16. Texto de `premierStatusText` en lugar del rango; enlace
  en la etiqueta; historial vacío o de un punto según `rankHistoryView`. El aviso de RF-16 ya
  llega por `syncNotice`.
- **`features/profile/pages/SettingsPage.tsx`** (modifica). RF-6, RF-16. Igual que el perfil.
- **`features/players/components/RankDistanceBlock.tsx`** y **`domain/playerSheet.ts`**
  (modifican). RF-6, RF-7, RF-8. La ficha de jugador recibe el `handle` para el enlace y muestra
  el texto de estado cuando no hay rating.
- **`features/matches/components/MatchEntry.tsx`** (modifica). RF-6. Enlace en la etiqueta de
  rango del candidato.
- **`features/matches/pages/MatchesPage.tsx`** y **`components/MatchFiltersPanel.tsx`**
  (modifican). RF-10. Con el 409 de CS2: mensaje del servidor + enlace «Ir a tu perfil» y
  filtros con `disabled`.
- **`features/steam/pages/SteamReturnPage.tsx`**, **`features/steam/notice.ts`** y
  **`features/profile/pages/ProfilePage.tsx`** (modifican). RF-15. `SteamNotice.extra?: string`
  (segundo aviso, tono `error`) que el perfil pinta debajo de «cuenta de Steam verificada».
- **`features/steam/components/SteamVerifyButton.tsx`** y **`shared/utils/copy.ts`**
  (modifican). RF-21. `LEETIFY_PRIVACY_TEXT` como nota bajo el botón.
- **`services/http/httpApi.ts`** (modifica). Pasa `notice` de `/api/steam/complete`.
- **`services/mock/mockApi.ts`**: **no cambia** (RF-23); ver §7.

### Documentos (al cerrar la implementación)
- `AGENTS.md`: `leetifyClient.ts`, `cs2Sync.ts`, `accountLock.ts`, `domain/leetify.ts`,
  `LEETIFY_API_KEY`. `MEMORY.md`: estado de la 015. `PRODUCT.md`: «Evidence on Hand» y
  «Capabilities» (impacto en otras specs). `README.md`: la variable opcional.

## 3. Funciones puras («hoy» como parámetro)

```ts
// domain/leetify.ts
export type LeetifyReading =
  | { kind: "rated"; rating: number }
  | { kind: "unrated" }
  | { kind: "failed" };

export type PremierStatus = "rated" | "unrated" | "unavailable";

export interface PremierState {
  premier: PremierStatus;
  currentRank: Snapshot | null;
  rankHistory: Snapshot[];
}

/** RF-2, RF-14, D10, D12, D13. `status` HTTP y cuerpo ya leído (o `undefined` si no era JSON). */
export function parseLeetifyProfile(status: number, body: unknown): LeetifyReading;

/** Escalón de la escala de CS2 para datos reales: min(6, floor(rating / 5000)) (RF-4, D2). */
export function cs2RealStep(rating: number): number;

/** Snapshot con tier del escalón, `points = rating` exacto y normalizado de la 004 (RF-4, RF-5). */
export function premierSnapshot(rating: number, now: Date): Snapshot;

/** Estado al verificar: descarta lo simulado (RF-3, RF-15). */
export function verifiedPremier(reading: LeetifyReading, now: Date): PremierState;

/** Transición al resincronizar (RF-9, RF-11, RF-18). No muta `state`. */
export function applyLeetifyReading(state: PremierState, reading: LeetifyReading, now: Date): PremierState;
```

```ts
// frontend/src/domain/premierDisplay.ts
export const LEETIFY_PROFILE_BASE = 'https://leetify.com/app/profile/';
export function leetifyProfileUrl(steamId: string): string;            // RF-6, D25
export function originHref(origin: Origin, handle: string): string | undefined; // solo 'leetify'
export function premierStatusText(account: Pick<GameAccount, 'premierStatus'>): string | null; // RF-7, RF-8
export type RankHistoryView = { kind: 'empty'; text: string } | { kind: 'chart' };   // RF-12
export function rankHistoryView(history: readonly RankSnapshot[]): RankHistoryView;
export const LEETIFY_PRIVACY_TEXT = 'Tu rango Premier se obtiene de Leetify con tu SteamID64'; // RF-21
```

Ninguna lee el reloj: `now` llega del controlador (`clock.now()` una vez por petición).

## 4. Algoritmos (pseudocódigo)

### 4.1 `parseLeetifyProfile(status, body)` — RF-2, RF-14
```
si status == 404                      → unrated          // sin perfil en Leetify (D10; P15-3)
si status != 200                      → failed           // 401 clave, 429 límite, 5xx (D19, D24)
si body no es objeto                  → failed           // JSON roto o forma ajena (D13)
ranks = body.ranks
si ranks no existe o es null          → unrated          // "no viene"
si ranks no es objeto                 → failed
p = ranks.premier
si p es undefined, null o 0           → unrated          // D12
si p no es entero, o p < 1, o p > 99999 → failed         // negativo, decimal, >99999 (casos límite)
→ rated(p)
```
El cliente traduce excepción, plazo vencido o cuerpo ilegible a `failed` antes de llegar aquí.

### 4.2 Resincronizar una cuenta de CS2 verificada (`syncSteamAccount`) — RF-16 a RF-19
```
current = leer cuenta (proyección)          // 404 / 403 como hoy (spec 004)
si !lock.tryAcquire(accountId)              → 429 syncCooldown(5)            // RF-19, D21
try:
  cooldown = syncCooldown(hasProfile ? lastSyncedAt : null, at)              // 012 RF-16; 013 D6
  si !cooldown.allowed                      → 429 syncCooldown(minutos)
  steam = readWithTimeout(steamSource, cuenta, 8 s)                          // RF-17: primero Steam
  si steam falla                            → 503 / 404 como la 012 (RF-19, RF-21), sin Leetify
  premier = readPremierWithTimeout(leetify, externalId, 8 s)                 // total ≤ 16 s (RNF-4)
  updateOwnedAccount(accountId, userId, cuenta →
     si cuenta.verification.externalId != current.externalId → stale
     applyReal(cuenta, steam.data, at)                                       // perfil + lastSyncedAt = at
     next = applyLeetifyReading(estado(cuenta), premier, at)                 // RF-9, RF-11, RF-18
     escribir premier, currentRank, rankHistory)
  si stale                                  → 404
  si premier.kind == "failed"               → 200 { ...cuenta, syncNotice: LEETIFY_NOTICES.syncFailed } // RF-16
  → 200 cuenta
finally:
  lock.release(accountId)
```
`lastSyncedAt` se actualiza siempre que Steam respondió, así la espera corre aunque Leetify falle
(RF-17). El bloqueo cubre el intervalo entre leer la espera y escribir, que es donde dos
pestañas pasarían a la vez (RF-19).

### 4.3 Verificar (`POST /api/steam/complete`) — RF-1, RF-3, RF-15
```
... pasos actuales hasta la confirmación con Steam (sin cambios) ...
[profileRead, premier] = await Promise.all([
   readWithTimeout(steamSource, …, 8 s),                       // si falla: sin perfil (013 RF-12)
   readPremierWithTimeout(leetify, steamId, 8 s),               // RF-1: también si falla el perfil (D20)
])
result = verifyAccount({ …, real, premier, now: at })           // verifiedPremier: RF-3
→ 200 { outcome: "verified", account, ...(premier.kind == "failed" ? { notice: LEETIFY_NOTICES.verifyFailed } : {}) }
```
Si la verificación termina en 409/404, la lectura de Leetify se descarta sin escribir nada.

### 4.4 Migración al arrancar (`migrateAccounts`) — RF-20
```
updateMany(
  { gameId: "cs2", "verification.source": "steam", premier: { $exists: false } },
  { $set: { premier: "unavailable", currentRank: null, rankHistory: [] } })
```
Criterio de estado, no de fecha (D9): toda cuenta de Steam sin `premier` tiene por construcción
el rango simulado. Idempotente (la segunda vez no encuentra nada) y sin consultar Leetify.

RF-24 (D27) agrega, después de la anterior:
```
updateMany(
  { gameId: "cs2", "verification.source": "steam", "rankHistory.0": { $exists: true } },
  { $set: { rankHistory: [] } })
```
Solo vacía el historial: `premier` y `currentRank` no se tocan. Idempotente y sin Leetify. Las
cuentas sin verificar (historial simulado, RF-22) y las de Riot no coinciden con el filtro.

### 4.5 Coincidencias — RF-7, RF-8, RF-10, RF-18
```
own = cuenta propia del juego
si gameId == "cs2" y own.premier ∈ {unrated, unavailable} → noPremier(own.premier) → 409 con
   "tu cuenta de CS2 no tiene rango Premier: resincronízala cuando lo tengas en Leetify" |
   "tu cuenta de CS2 tiene el rango no disponible: resincronízala"
candidatas CS2: premier ∉ {unrated, unavailable}      // las sin verificar no tienen el campo: entran
```
Una cuenta `rated` que conserva su rating tras un fallo sigue entrando (RF-18). El motor
(`domain/matching.ts`) no cambia: nunca recibe cuentas sin `currentRank`.

### 4.6 Historial en la interfaz — RF-12 (reescrito por D27)
```
si account.origins.rank == "leetify":
   en lugar del historial → texto "Leetify solo entrega el rango vigente: no hay historial"
   si hay currentRank → RankScale(history = [], current)   // sin tramo ni «desde la primera lectura»
   sin «Primera lectura · fecha»
si no: como hoy (spec 007, RF-14)
```
`RankScale` ya trata `history = []` como «sin diferencia» (`rankGainSinceFirst` → `null`), así
que no cambia. Se retiran `rankHistoryView`, `EMPTY_RANK_HISTORY_TEXT` y
`LAST_KNOWN_RANK_LABEL` («Último rango registrado», defecto 1 del `reviewer`).

## 5. Cómo se pinta en la interfaz
- **Fila de la cuenta (perfil y Configuración)**: rango «Gold · 36210 CS Rating» (RF-4) o el texto
  «sin rango Premier» / «rango no disponible» (RF-7, RF-8) con la atribución de Leetify de §12.3:
  logo enlazado a `leetify.com` y «View on Leetify» a `leetify.com/app/profile/<SteamID64>`, ambos
  en pestaña nueva (RF-6, D26). Partidas con
  «Datos de demostración» (RF-13). Bajo «Verificar con Steam», la nota de RF-21.
- **Resincronizar**: si Leetify falló, el aviso de RF-16 aparece en la fila donde hoy sale el de
  Riot (`syncNotice`), tono «pen», `role="status"`.
- **Volver de Steam** (RF-15): el perfil muestra «cuenta de Steam verificada» y, debajo, «Leetify
  no responde: tu rango Premier se obtendrá al resincronizar» (tono error, `role="alert"`). Los dos
  viajan en `location.state` como hoy y desaparecen al salir del perfil (013 RF-20).
- **Historial** (RF-12, D27, D31): el texto de RF-12 en lugar del historial y de la escala
  (§4.6, §13.3).
- **Ficha de jugador y coincidencias**: la atribución de §12.3 junto al rango del candidato (RF-6);
  la distancia no se muestra si alguno de los dos rangos es de Leetify (RF-25, D31; §13.3).
  Las cuentas sin rating no aparecen como candidatas (RF-7, RF-8).
- **Coincidencias de CS2 con la cuenta propia sin rating** (RF-10): el aviso del 409, el enlace
  «Ir a tu perfil» y el panel de filtros con todos sus controles `disabled`; sin lista.
- Colores solo desde `tokens.css`; la etiqueta enlazada usa el estilo de enlace existente.

## 6. Decisiones técnicas

- **P15-1. Estado guardado en `premier`, no derivado.** «Sin rango» y «no disponible» dependen de
  si hubo alguna lectura no fallida (Definiciones), y RF-20 necesita distinguir las cuentas
  anteriores a esta versión. Un campo explícito da las tres cosas y un filtro de Mongo directo
  para coincidencias. *Descartado*: reutilizar `pendingBlocks: ["rank"]` de la 014 — ahorra un
  campo, pero mezcla la semántica de Riot (bloque pendiente tras verificación parcial) con la de
  Leetify y la interfaz pintaría el texto de Riot.
- **P15-2. `premierStatus` en el JSON solo sin rating.** El cliente no necesita `rated` (lo dice
  `currentRank`). *Descartado*: exponer `premier` tal cual — añade un estado redundante que hay
  que mantener coherente en el frontend.
- **P15-3. 404 de Leetify = sin perfil.** La documentación no lo cubre; es el comportamiento
  habitual y el que da D10. Si el recorrido manual muestra otro código, se ajusta solo
  `parseLeetifyProfile` y su prueba. *Descartado*: tratar 404 como fallo — dejaría para siempre en
  «no disponible» a quien no tiene perfil, contra D10.
- **P15-4. Leetify no es una `RealSource`.** `RealSource` entrega `RealData` de verificación
  (identidad, perfil) y su `gone` significa «la cuenta no existe»; Leetify solo da rango y su «sin
  perfil» no es `gone` (RF-2). Un cliente propio con `LeetifyReading` evita el caso imposible.
  *Descartado*: registrarla en `SourceRegistry` — chocaría con la regla «una fuente por juego».
- **P15-5. Al verificar, perfil y Leetify en paralelo; al resincronizar, en serie.** La spec solo
  ordena la resincronización (RF-17, D18). En paralelo, verificar tarda ≤ 8 s (confirmación) +
  8 s, igual que hoy, y no se acerca a los 30 s de la interfaz. *Descartado*: serie también al
  verificar — 24 s sin necesidad.
- **P15-6. Bloqueo en memoria por cuenta (`accountLock.ts`).** Igual criterio que la 014 (D63): la
  instancia es única y el bloqueo se pierde al reiniciar sin consecuencias. Responde el 429 de la
  espera con 5 minutos, que es lo que verá el perdedor cuando la otra termine. *Descartado*: un
  «reclamo» atómico en Mongo (`findOneAndUpdate` con marca de en curso) — más escrituras y una
  marca que limpiar si el proceso cae a mitad. *Descartado*: reutilizar `riotUserLock` — es por
  usuario y compartido con `/api/riot`; bloquearía un desafío de Riot por resincronizar CS2.
- **P15-7. `origin` del rango se deriva, como en la 012.** `blockOrigins` devuelve `leetify` para
  el rango de toda cuenta verificada con Steam: así nunca existe un rango simulado atribuido a
  Leetify ni uno real sin atribución (constitución, principio 5). La migración RF-20 garantiza que
  no quede ningún rango simulado detrás de esa etiqueta.
- **P15-8. El aviso de RF-16 reutiliza `syncNotice`.** La interfaz ya lo pinta en la fila. El
  indicador pedido por D16 es su presencia. *Descartado*: un campo booleano nuevo
  (`rankUpdated: false`) — obliga a duplicar el texto en el frontend.
- **P15-9. Sin `LeetifyClient`, cada lectura es `failed`.** Las pruebas existentes de la 012/013
  no tocan la red (RNF-1) y nada en producción depende de ello: `index.ts` siempre construye el
  cliente. *Descartado*: cliente real por defecto en `createApp` — una prueba olvidada saldría a
  internet.
- **P15-10. Sin tope de Gold en datos reales.** `cs2RealStep` usa `min(6, floor(r/5000))` y no
  pasa por `pointsBand` (que solo usa el simulador). No se toca la escala de la 004 (D2, D8).

## 7. Estrategia de pruebas (`node --test`, sin red; frontend: build, typecheck, lint)
Tests primero en cada tarea del backend (constitución, principio 4).

- **`tests/unit/leetify.test.ts`** (nuevo). `parseLeetifyProfile`: 200 con 19309 → rated; 0, null,
  ausente, `ranks` ausente → unrated; 404 → unrated; 401, 429, 500 → failed; −1, 12.5, 100000,
  `"19309"`, cuerpo `"x"`, `ranks: 3` → failed; 1 y 99999 → rated (bordes). `cs2RealStep`: 0, 4999,
  5000, 29999, 30000, 35000, 99999. `premierSnapshot(36210)`: Gold, 36210, normalizado 100.
  `verifiedPremier` y `applyLeetifyReading`: cada celda de la tabla de §1, más «mismo rating no
  agrega punto», «rating menor agrega punto» y «no muta la entrada». RF-2 a RF-5, RF-9, RF-11,
  RF-14, RF-18.
- **`tests/unit/sources.test.ts`** (amplía). Steam: `rank = leetify`, `matches = simulated`; sin
  verificar: todo `simulated`. RF-6, RF-13, RF-22.
- **`tests/unit/leetifyClient.test.ts`** (nuevo). `fetch` falso: URL y `steam64_id`; cabecera
  `_leetify_key` solo con clave; sin clave no hay cabecera; excepción y señal abortada → failed;
  ningún mensaje ni log con la clave. RF-14, RNF-1, RNF-2, RNF-3.
- **`tests/unit/config.test.ts`** y **`envExample.test.ts`** (amplían). `LEETIFY_API_KEY`
  opcional, vacía = sin clave, presente comentada en `.env.example`. RNF-2.
- **`tests/unit/gameAccountModel.test.ts`** (amplía). `currentRank: null` válido con Steam y
  `premier` ≠ `rated`; inválido sin verificar; `premierStatus` en JSON solo sin rating; `premier`
  nunca en JSON.
- **`tests/server/migration.test.ts`** (nuevo, o el de `server.test.ts`). Cuenta de Steam sin
  `premier` → `unavailable`, `currentRank: null`, historial vacío; cuenta sin verificar y cuenta de
  Riot intactas; segunda pasada no cambia nada. RF-20.
- **`tests/controllers/steamLeetify.test.ts`** (nuevo, helpers de `steamHelpers.ts` + cliente
  Leetify falso). Verificar con rated / unrated / failed / perfil de Steam caído + Leetify bien
  (D20); historial simulado descartado (RF-3); `notice` solo si falló (RF-15); 409 de otro usuario
  sin escritura. RF-1, RF-2, RF-3, RF-15.
- **`tests/controllers/cs2Resync.test.ts`** (nuevo). Leetify bien → 200 y punto nuevo; mismo
  rating → sin punto; rated → unrated conserva historial (RF-9); Leetify cae → 200 con
  `syncNotice`, rango igual y espera corriendo (RF-16, RF-17, RF-18); Steam cae → 503 y Leetify no
  se llama (contador del cliente falso) (RF-17); dos peticiones simultáneas con una fuente que
  espera una promesa controlada → una 200 y una 429 (RF-19, RNF-7); plazo de 8 s por consulta con
  tiempos cortos inyectados (RNF-4); cuenta sin verificar no llama a Leetify (RF-22).
- **`tests/controllers/matches.test.ts`** / **`matchInputs.test.ts`** (amplían). Propia unrated →
  409 texto 1; unavailable → 409 texto 2; candidatas unrated/unavailable excluidas; rated tras
  fallo incluida (RF-18); CS2 sin verificar sin cambios. RF-7, RF-8, RF-10.
- **Pruebas existentes que cambian** (013): las que esperaban rango simulado en una cuenta
  verificada con Steam pasan a esperar `unavailable` (sin cliente Leetify, P15-9). Se ajustan en la
  tarea que cambia el comportamiento, citando RF-3.
- **`tests/unit/domainIsolation.test.ts`**: sin cambios; vigila que `domain/leetify.ts` no importe
  de `services/`.
- **Frontend**: `npm run build`, `typecheck` y `lint` en verde. RF-23 se protege con un repaso en
  la tarea de interfaz: `grep -n "leetify" src/services/mock` debe salir vacío.
- **Validación (Fase 5)**: Chrome DevTools a 1280 y 375 px y los recorridos manuales de los
  criterios de finalización (cuenta real con rating y cuenta sin perfil, que confirma P15-3), más
  la lectura de los términos de Leetify (D25).

## 8. Riesgos
- **R1. El código de «sin perfil» de Leetify no es 404.** Se nota en el recorrido manual; el
  cambio queda en una función y su prueba (P15-3).
- **R2. Leetify cambia la forma de `ranks.premier`.** Cualquier forma inesperada es `failed`
  (D13): la cuenta conserva su rating y se avisa; nunca se guarda un dato dudoso.
- **R3. Límite de consultas sin clave.** Con la espera de 5 minutos por cuenta y lecturas solo a
  pedido (RNF-7) el volumen de un proyecto universitario es bajo. Si aparece 429, es `failed`.
- **R4. Pruebas existentes de la 013 que fijan el rango simulado.** Se actualizan junto con el
  cambio (T4) y se nombran en el informe de la tarea.

## 9. Observaciones para el usuario (no cambian la spec)
- **O-1.** El enlace de RF-6 usa `https://leetify.com/app/profile/<SteamID64>`, la dirección
  pública de perfiles de Leetify.
- **O-2.** La segunda resincronización simultánea recibe «espera 5 minutos» (P15-6), el texto de
  la espera mínima de la 012 con su valor completo.

## 10. Tareas previstas (detalle en `tasks.md`, tras aprobar este plan)
1. **T1** Dominio: `domain/leetify.ts` y orígenes en `sources.ts`. RF-2 a RF-6, RF-9, RF-11, RF-13, RF-14, RF-18, RF-22.
2. **T2** Cliente y configuración: `leetifyClient.ts`, `withTimeout`, `LEETIFY_API_KEY`. RF-14, RNF-1 a RNF-4.
3. **T3** Modelo y migración: `premier`, `premierStatus`, `currentRank` nulo, RF-20.
4. **T4** Verificar con Steam + Leetify (`steam.ts`, `verifyAccount.ts`, `app.ts`, `index.ts`). RF-1, RF-2, RF-3, RF-15.
5. **T5** Resincronizar CS2 (`cs2Sync.ts`, `accountLock.ts`, `accounts.ts`). RF-9, RF-11, RF-16 a RF-19, RNF-4, RNF-7.
6. **T6** Coincidencias sin rango (`matchInputs.ts`, `matches.ts`). RF-7, RF-8, RF-10, RF-18.
7. **T7** Frontend: tipos, `premierDisplay.ts`, `origins.ts`, `OriginTag` con enlace, `copy.ts`. RF-4, RF-6, RF-12, RF-21, RF-23.
8. **T8** Frontend: fila, resumen, Configuración, ficha, coincidencias, vuelta de Steam. RF-4, RF-6 a RF-8, RF-10, RF-12, RF-15, RF-16, RF-21.
9. **T9** Documentos y comprobación completa (suite, typecheck, lint, build). Todos.

Nueve tareas: no hace falta dividir la spec.

## 11. Trazabilidad
| RF / RNF | Dónde (plan) | Prueba |
|---|---|---|
| RF-1 | §2 `steam.ts`, `cs2Sync.ts`; §4.2, §4.3 | steamLeetify, cs2Resync |
| RF-2 | §4.1 `parseLeetifyProfile` | leetify, steamLeetify |
| RF-3 | §1, `verifiedPremier`, `verifyAccount.ts` | leetify, steamLeetify |
| RF-4 | `premierSnapshot`, `formatRank`; §5 | leetify; build |
| RF-5 | `premierSnapshot`, `cs2RealStep`; P15-10 | leetify |
| RF-6 | `sources.ts`, `LeetifyAttribution`, `premierDisplay.ts`; §5, §12.3 | sources; build |
| RF-7 | §1, §4.5, `premierStatusText` | matches/matchInputs |
| RF-8 | §1, §4.5, `premierStatusText` | matches/matchInputs |
| RF-9 | `applyLeetifyReading` (borra el rating, §12.2) | leetify, cs2Resync |
| RF-10 | §4.5, `MatchesPage`, `MatchFiltersPanel` | matches; build |
| RF-11 | `verifiedPremier`, `applyLeetifyReading` (historial `[]`, §12.2) | leetify, steamLeetify, cs2Resync |
| RF-12 | `GameSummaryPanel`, `RankScale` con `[]`; §4.6 | build |
| RF-13 | `sources.ts` (`matches: simulated`) | sources |
| RF-14 | §4.1, `leetifyClient.ts`, `withTimeout` | leetify, leetifyClient |
| RF-15 | §4.3 `notice`; `SteamReturnPage`, `ProfilePage` | steamLeetify; build |
| RF-16 | §4.2 `syncNotice` | cs2Resync |
| RF-17 | §4.2 orden y espera | cs2Resync |
| RF-18 | §1, §4.5 | leetify, matches |
| RF-19 | `accountLock.ts`; P15-6 | cs2Resync |
| RF-20 | §4.4 `migrateAccounts` | migration |
| RF-21 | `LEETIFY_PRIVACY_TEXT`, `SteamVerifyButton` | build |
| RF-22 | `blockOrigins`, sin `premier` en sin verificar | sources, cs2Resync |
| RF-23 | `mockApi.ts` sin cambios; §7 | grep en T7/T8 y T14 |
| RF-24 | §4.4 segunda `updateMany` | migration |
| RNF-1 | `fetch` inyectable; P15-9 | todas |
| RNF-2 | `config.ts`, `.env.example`, `leetifyClient.ts` | config, envExample, leetifyClient |
| RNF-3 | `leetifyClient.ts` solo `/v3/profile` | leetifyClient |
| RNF-4 | `withTimeout` 8 s ×2 en serie | cs2Resync |
| RNF-5 | `LEETIFY_NOTICES`, `LEETIFY_ERRORS` | leetify |
| RNF-6 | sin dependencias nuevas | `package.json` sin cambios |
| RNF-7 | espera de la 012 + `accountLock`; D28 | cs2Resync |
| RNF-8 | `LeetifyAttribution`, logos oficiales; §12.3 | build; navegador |

## 12. Cambio de requisitos D26 a D30 (2026-11-19)
Origen: las pautas de Leetify (`validation.md`, §2.3) y la validación del `reviewer` (§2.4). La
spec cambió RF-6, RF-9, RF-11, RF-12, RF-16, RF-18, RF-23, RNF-5 y RNF-7, y suma RF-24 y RNF-8.
T1 a T10 siguen valiendo. Esta sección dice qué se modifica de lo ya hecho.

### 12.1 Estado real del código que cambia (comprobado el 2026-11-19)
- `backend/src/domain/leetify.ts`:
  - `verifiedPremier` arma `rankHistory: [snapshot]` con rating.
  - `applyLeetifyReading` agrega un punto si el rating cambió y conserva el historial al pasar a
    `unrated`.
- `backend/src/server.ts`: `migrateAccounts` solo tiene la pasada de RF-20.
- `backend/src/services/cs2Sync.ts:61`:
  - El bloqueo se toma antes de leer la cuenta y comprobar el dueño.
  - El id se usa tal como llega.
  - La espera no corre si no hay perfil (D6 de la 013), de ahí las dos lecturas de D28.
- `backend/src/models/gameAccount.ts:258`: `premierStatus` solo sale con `premier` `unrated` o
  `unavailable`. Una cuenta de Steam sin `premier` no lo lleva.
- Frontend:
  - `premierDisplay.ts` tiene `originHref`, `rankHistoryView`, `EMPTY_RANK_HISTORY_TEXT` y
    `LAST_KNOWN_RANK_LABEL`.
  - `OriginTag` con `href` se usa para el rango de Leetify en `AccountRow` (tres ramas),
    `GameSummaryPanel:123`, `RankDistanceBlock:91,98` y `MatchEntry:110,185`.
  - `GameSummaryPanel:130-153`: historial, «Último rango registrado» y «Primera lectura · fecha».
  - `SettingsPage` pinta `AccountRow`, así que no necesita cambios propios.
  - El tema oscuro es el de defecto. El claro se activa con `:root[data-theme='light']`.
  - `vite/client` ya tipa las importaciones de `.png`.

### 12.2 Backend
- **`domain/leetify.ts`** (modifica). RF-9, RF-11, D27.
  - `verifiedPremier` devuelve siempre `rankHistory: []`.
  - `applyLeetifyReading`:
    - `rated(r)` → `{ premier: "rated", currentRank: snapshot(r), rankHistory: [] }`;
    - `unrated` → `{ premier: "unrated", currentRank: null, rankHistory: [] }` (borra el rating);
    - `failed` → sin cambios (RF-18).
  - `PremierState.rankHistory` se mantiene, siempre vacío, para que la escritura siga siendo
    una sola. *Descartado*: quitar el campo del estado, porque obligaría a tocar el
    `$set` de `cs2Sync.ts` y de `verifyAccount.ts` sin ganar nada.
- **`server.ts`** (modifica). RF-24. La segunda `updateMany` de §4.4, después de la de RF-20.
- **`models/gameAccount.ts`** (modifica, opcional del `reviewer`). RF-8. `premierStatus:
  "unavailable"` también para una cuenta de CS2 verificada con Steam sin `premier`. Así la fila y
  Coincidencias dicen lo mismo si alguna quedara sin migrar.
- **`services/cs2Sync.ts`** (modifica, opcional del `reviewer`). RF-19.
  - Normaliza el id (`toLowerCase`) antes de tomar el bloqueo.
  - Toma el bloqueo después de comprobar que la cuenta existe y es del usuario: un ajeno recibe
    403, nunca 429.
  - La espera y la escritura quedan dentro del bloqueo, como hoy.
  - *Precisión de T13, aceptada por el usuario el 2026-11-19*: la cuenta se relee ya dentro del
    bloqueo y de esa lectura salen la espera y la verificación. Sin ella, una petición que leyó la
    cuenta antes de que otra soltara el bloqueo usaría un `lastSyncedAt` viejo y se saltaría la
    espera de 5 minutos (RNF-7). Cuesta una consulta más por resincronización.
- **D28 / RNF-7**: sin cambio de código. Una prueba fija que, verificada sin perfil, la primera
  resincronización inmediata lee Leetify y la segunda recibe 429: nunca hay tres lecturas.
- **`requests/leetify.rest`** (nuevo, confirmado por el usuario el 2026-11-19).
  - Resincronizar CS2 y Coincidencias contra la instancia local.
  - Una petición directa a `GET https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=`
    con la clave como variable (`{{leetifyKey}}`, nunca escrita en el archivo), para comprobar
    P15-3 a mano.

### 12.3 Frontend
- **Logos** (nuevos): `frontend/src/assets/leetify/leetify-badge-white.png` y
  `leetify-badge-black.png`.
  - Son copia exacta de «Leetify Badge White Small.png» y «Leetify Badge Black Small.png» que el
    usuario descargó de la carpeta oficial (270×115 y 270×112). No se recortan, recolorean ni
    convierten (RNF-8).
  - Van en `src/assets` y no en `public/` para que Vite les ponga hash.
- **`shared/components/LeetifyAttribution.tsx`** (nuevo). RF-6, RNF-8. Pinta, en este orden:
  - el logo como `<a href="https://leetify.com/" target="_blank" rel="noopener noreferrer">` con
    las dos imágenes (`alt="Data Provided by Leetify"`);
  - «View on Leetify» como `<a>` a `leetifyProfileUrl(handle)`, también en pestaña nueva.

  Detalles:
  - El tema se elige solo con CSS: `.leetify-attribution__logo--light` se oculta en el tema
    oscuro y `--dark` en el claro (`:root[data-theme='light']`). Así no se lee el tema en JS.
  - Alto del logo de 18 px, por debajo del tamaño del nombre de la plataforma en la cabecera.
  - El enlace va subrayado y en negrita con el color de enlace de `tokens.css`. No se usa el rosa
    de Leetify, que no está en los tokens.

  *Descartado*: ampliar `OriginTag`. Su forma es una etiqueta de texto de la 012 y el logo no
  encaja en ella.
- **`domain/premierDisplay.ts`** (modifica). RF-6, RF-12.
  - Se quitan `originHref`, `rankHistoryView`, `RankHistoryView`, `EMPTY_RANK_HISTORY_TEXT` y
    `LAST_KNOWN_RANK_LABEL`.
  - Se agregan:
    - `LEETIFY_HOME_URL = 'https://leetify.com/'`;
    - `LEETIFY_NO_HISTORY_TEXT = 'Leetify solo entrega el rango vigente: no hay historial'`;
    - `isLeetifyRank(origin: Origin): boolean`.
  - `leetifyProfileUrl` y `premierStatusText` no cambian.
- **`AccountRow.tsx`**, **`GameSummaryPanel.tsx`**, **`RankDistanceBlock.tsx`** y
  **`MatchEntry.tsx`** (modifican). RF-6, RF-12, D30.
  - Donde el rango es de Leetify, `<LeetifyAttribution handle=… />` en lugar de
    `<OriginTag … href>`. Los demás orígenes siguen con `OriginTag` sin `href`.
  - En `GameSummaryPanel`, con rango de Leetify:
    - va el texto de RF-12;
    - `RankScale` recibe `history={[]}`;
    - sin «Último rango registrado» ni «Primera lectura · fecha».
  - La escala y la distancia de la ficha y Coincidencias no cambian (D30). *Reemplazado por
    §13 (D31): ya no se muestran con rangos de Leetify.*
- **`OriginTag.tsx`** (modifica). Se quita la prop `href`, que ya no se usa.
- **`domain/origins.ts`**: `originLabel('leetify')` se mantiene para el `aria-label` y la
  accesibilidad. No se pinta como etiqueta.
- **`mockApi.ts`**: sin cambios (RF-23). Antes de cerrar, `grep -rni leetify
  frontend/src/services/mock` debe seguir vacío.

### 12.4 Decisiones técnicas nuevas
- **P15-11. El logo se importa como archivo y el tema lo elige CSS.** Ninguna regla de
  presentación lee el tema. *Descartado*: `<picture>` con `prefers-color-scheme`, porque la app
  cambia de tema con `data-theme` y no con la preferencia del sistema.
- **P15-12. El historial queda vacío en lugar de quitar el campo.** El JSON de la 004 lleva
  `rankHistory` en toda cuenta. Vaciarlo no rompe el contrato ni la tendencia de la 004 (da 0 con
  historial vacío, por su propia regla). *Descartado*: omitir `rankHistory` en el JSON de CS2
  verificado, porque cambia la forma de la respuesta para un solo caso.
- **P15-13. Bloqueo después de comprobar el dueño.** El 403 de la 004 gana sobre el 429 de RF-19.
  El bloqueo sigue cubriendo el tramo de la espera y la escritura, que es donde se cruzan dos
  pestañas.

### 12.5 Pruebas
- **`unit/leetify.test.ts`** (modifica, primero en rojo):
  - cada celda nueva de §1;
  - al verificar con rating, historial `[]`;
  - rating distinto: rango nuevo, historial `[]`;
  - `rated` → `unrated`: `currentRank: null`, historial `[]`;
  - `failed`: sin cambios.

  Se retiran las pruebas de «agrega punto» y «conserva el historial».
- **`server/migration.test.ts`** (amplía), RF-24:
  - cuentas de Steam `rated` y `unrated` con historial → historial `[]` y el resto igual;
  - cuenta sin verificar con historial simulado y cuenta de Riot, intactas;
  - segunda pasada sin cambios;
  - las dos migraciones juntas en una base con cuentas antiguas.
- **`controllers/steamLeetify.test.ts`** y **`controllers/cs2Resync.test.ts`** (modifican). Las
  aserciones de historial pasan a `[]`. La de RF-9 pasa a «borra el rating».
  `cs2Resync.test.ts` suma:
  - D28: verificada sin perfil, la resincronización inmediata lee Leetify una vez y la siguiente
    da 429, así que hay dos lecturas en total;
  - un ajeno recibe 403 aunque otra resincronización esté en curso (P15-13);
  - dos peticiones con el mismo id en mayúsculas y minúsculas comparten el bloqueo.
- **`unit/gameAccountModel.test.ts`** (amplía). Cuenta de Steam sin `premier` → JSON con
  `premierStatus: "unavailable"`.
- **Frontend**: `build`, `typecheck` y `lint` en verde, y `grep` de RF-23. La verificación a 1280 y
  375 px, en los dos temas, queda para la validación.

### 12.6 Riesgos nuevos
- **R5. Las pautas de Leetify cambian.** Leetify se reserva el derecho a cambiarlas. La atribución
  vive en un solo componente y la regla del historial en `applyLeetifyReading`.
- **R6. Guardar el rating vigente.** Las pautas piden «refrain from storing» y lo único que
  imponen es borrar lo que la API ya no entrega, cosa que se cumple (RF-9, RF-24). Es un riesgo
  aceptado (D27). Si Leetify lo prohíbe expresamente, hay que abrir otro cambio de requisitos.

### 12.7 Tareas previstas (detalle en `tasks.md`, tras aprobar este plan)
11. **T11** Dominio sin historial (`leetify.ts`) y pruebas de dominio y controladores. RF-9, RF-11.
12. **T12** Migración del historial (RF-24) y `premierStatus` para Steam sin `premier`. RF-8, RF-24.
13. **T13** `cs2Sync.ts`: bloqueo tras el dueño, id normalizado y prueba de D28. RF-19, RNF-7.
14. **T14** Frontend: logos, `LeetifyAttribution` en los cuatro componentes, `OriginTag` sin
    `href`. RF-6, RF-23, RNF-5, RNF-8.
15. **T15** Frontend: historial de RF-12 en `GameSummaryPanel`, limpieza de `premierDisplay.ts`.
    RF-12, D30.
16. **T16** `leetify.rest`, documentos (`AGENTS.md`, `PRODUCT.md`, `README.md`, `MEMORY.md`) y
    `validation.md`, con la comprobación completa.

Con las diez de antes son dieciséis. Las seis nuevas son correcciones acotadas de la misma spec,
así que no hace falta dividirla.

## 13. Cambio de requisitos D31 y D32 (2026-11-19)
Origen: la relectura de las pautas de Leetify contra lo construido (`validation.md`, §3.5,
punto 9). La spec cambió RF-5 y RF-12 y suma RF-25. T1 a T16 siguen valiendo; esta sección dice
qué se modifica. **Solo frontend**: el backend ya calcula y usa la distancia como pide RF-5.

### 13.1 Estado real del código que cambia (comprobado el 2026-11-19)
- `GameSummaryPanel.tsx:103-136`: con rango de Leetify pinta la etiqueta «Posición en la escala
  del juego», `LeetifyAttribution` a su lado y `RankScale` con `history={[]}` si hay rating. El
  `aria-label` de `RankScale` dice «Gold en la escala de CS2: 100 de 100». La fila
  (`AccountRow`) ya muestra el rango con su atribución.
- `playerSheet.ts`, `distanceView`: el caso `value` lleva `points`, `origin` y `handle` del
  jugador de la ficha; `myAccounts` solo tipa `gameId` y `currentRank`, sin `origins`.
- `RankDistanceBlock.tsx:101-110`: el caso `value` pinta «Δ n pts» junto a
  `LeetifyAttribution`. El caso `noPremier` (texto de estado con atribución) no cambia (spec,
  casos límite).
- `MatchEntry.tsx:110-116`: pinta `formatRank`, «Δ n pts» (`candidate.rankDistance`) y la
  atribución. `MatchesPage.tsx:33` ya tiene las cuentas propias (`accounts`), con `origins`.
- `MatchFiltersPanel.tsx:57-71`: el filtro «n pts» no cambia (D32).
- Backend: `rankDistance` sigue en la respuesta de Coincidencias y ordena y filtra (RF-5). Sin
  cambios.

### 13.2 Funciones puras (`domain/premierDisplay.ts`, modifica). RF-25, D31.
- `showsRankDistance(ownOrigin: Origin, otherOrigin: Origin): boolean` → `false` si alguno es
  `'leetify'` (usa `isLeetifyRank`); `true` en otro caso.
- `LEETIFY_HIDDEN_DISTANCE_TEXT = 'la distancia no se muestra con rangos de Leetify'` (RF-25;
  minúscula y sin punto, RNF-5).

### 13.3 Frontend
- **`domain/playerSheet.ts`** (modifica). RF-25.
  - `myAccounts` tipa también `origins: { rank: Origin }` (las cuentas propias ya lo traen).
  - Nuevo caso `{ kind: 'leetifyHidden'; origin: Origin; handle: string }`: cuando las dos
    cuentas tienen normalizado y `!showsRankDistance(own.origins.rank, theirs.origins.rank)`.
    Va después de `noData` y `noPremier`, que no cambian.
  - *Descartado*: decidirlo en el componente. La regla quedaría fuera de `domain/` (principio 3).
- **`RankDistanceBlock.tsx`** (modifica). RF-25. Caso `leetifyHidden`: `<p className="note">` con
  `LEETIFY_HIDDEN_DISTANCE_TEXT` y, si el origen del jugador es Leetify, `LeetifyAttribution`
  (el rango que se compara es suyo); si el de Leetify es el propio, `OriginTag` del jugador.
- **`MatchEntry.tsx`** (modifica) y **`MatchesPage.tsx`** (modifica). RF-25.
  - `MatchesPage` pasa `ownRankOrigin` (el `origins.rank` de la cuenta propia del juego activo)
    a cada `MatchEntry`.
  - `MatchEntry` pinta «Δ n pts» solo si `showsRankDistance(ownRankOrigin,
    candidate.account.origins.rank)`. El rango y la atribución no cambian.
  - *Descartado*: un campo nuevo en la respuesta del servidor. El frontend ya tiene los dos
    orígenes y no hace falta tocar el contrato ni el backend.
- **`GameSummaryPanel.tsx`** (modifica). RF-12, D31. Con rango de Leetify, la sección de la escala
  solo contiene el texto `LEETIFY_NO_HISTORY_TEXT`: sin la etiqueta «Posición en la escala del
  juego», sin `LeetifyAttribution` repetida (ya está en `AccountRow`, RF-6), sin `RankScale` y sin
  el texto de estado repetido (también está en la fila, RF-7, RF-8). LoL y CS2 sin verificar,
  igual que antes.
- **Modo simulado**: nunca hay origen `leetify` (RF-23), así que `showsRankDistance` siempre da
  `true` y todo queda como hoy. `mockApi.ts` sin cambios.

### 13.4 Decisiones técnicas nuevas
- **P15-14. La regla de RF-25 vive en `domain/`** y la usan la ficha y Coincidencias, así que las
  dos dicen lo mismo.
- **P15-15. Sin cambios de backend ni de contrato.** El orden y el filtro siguen con
  `rankDistance` (RF-5, D32); ocultarla es solo de presentación.

### 13.5 Pruebas
- Frontend sin pruebas (principio 4): `typecheck`, `lint` y `build` en verde.
- `grep -rn "RankScale" frontend/src/features/profile/components/GameSummaryPanel.tsx`: solo en
  la rama que no es de Leetify (revisión del diff).
- Backend: `npm test`, `typecheck` y `lint` sin cambios respecto a T16 (la salvedad de
  `ui.test.ts`).
- Navegador (paso 3 de la guía de `validation.md`): RF-12 y RF-25 con las cuatro combinaciones
  propia/candidato (simulada o Leetify).

### 13.6 Riesgos nuevos
- **R7. Orden sin cifra visible.** En CS2 con Leetify, el usuario ve candidatos ordenados y
  filtrados por una distancia que no ve. Aceptado por D31 y D32.
- **R8. Puntaje de afinidad.** `MatchEntry.tsx:230` muestra «Afinidad n de 100» (spec 005), que
  combina horas en común y la distancia de rango. Es un puntaje de la plataforma, no una métrica
  de Leetify, y no va junto a su logo, así que RF-25 no lo toca. Si el usuario lo ve como
  métrica derivada de Leetify, sería otro cambio de requisitos.

### 13.7 Tareas previstas (detalle en `tasks.md`, tras aprobar este plan)
17. **T17** `premierDisplay.ts` (`showsRankDistance`, texto), `playerSheet.ts` (`leetifyHidden`)
    y `RankDistanceBlock.tsx`. RF-25.
18. **T18** `MatchesPage.tsx` y `MatchEntry.tsx` sin «Δ» con Leetify. RF-25.
19. **T19** `GameSummaryPanel.tsx` sin escala con Leetify. RF-12, D31.
20. **T20** Documentos (`PRODUCT.md`, `AGENTS.md` si nombra la escala, `MEMORY.md`,
    `validation.md`) y comprobación completa. Todos.

Con las dieciséis de antes son veinte. Las cuatro nuevas son correcciones de presentación de la
misma spec, así que no hace falta dividirla.

## 14. Cambio de requisitos D33 y D34 (2026-11-19)
Origen: validación del `reviewer` con navegador (`validation.md`, §3.7): defecto 1 (bloqueante) y
los opcionales 1 (legibilidad del logo) y 3 (rama muerta), que el usuario pidió incluir. La spec
suma RF-26 y D33–D34. **Solo frontend**; el backend no cambia. R8 queda resuelto por D33.

### 14.1 Estado real del código que cambia (comprobado el 2026-11-19)
- `MatchEntry.tsx:138-142`: `<ScoreRing … origin={rankOrigin} />`; `ScoreRing` (`:223-252`) pinta
  `<OriginTag origin={origin} className="entry__demo" />` en `:251`. Con candidato de Leetify sale
  «Datos de Leetify» (`origins.ts:17-18`).
- `MatchEntry` ya recibe `ownRankOrigin` (T18) y conoce `candidate.account.origins.rank`.
- `global.css:253-257`: `.leetify-attribution__logo { height: 18px; }`.
- `RankDistanceBlock.tsx:115-122`: en el caso `value`, la rama `isLeetifyRank(view.origin) ?
  <LeetifyAttribution/>` ya no se alcanza (la intercepta `leetifyHidden`, T17).

### 14.2 Función pura (`domain/premierDisplay.ts`, modifica). RF-26, D33.
- `scoreOriginLabel(ownOrigin: Origin, otherOrigin: Origin): 'simulated' | null` → `'simulated'`
  si alguno es `'simulated'`; `null` en otro caso (los dos `leetify`). Nunca devuelve `leetify`.
  (Orígenes posibles en CS2: `simulated` y `leetify`; en LoL `simulated` y `riot`: si alguno es
  `simulated` → `'simulated'`; para otros orígenes reales sin simulado, conservar lo de hoy:
  devolver el origen del candidato salvo que sea `leetify`. Tipo de retorno: `Origin | null`,
  documentado.)

### 14.3 Frontend
- **`MatchEntry.tsx`** (modifica). RF-26. `ScoreRing` recibe `origin: Origin | null` =
  `scoreOriginLabel(ownRankOrigin, rankOrigin)`; con `null` no pinta `OriginTag`. El rango, la
  atribución y la «Δ» (T18) no cambian.
- **`global.css`** (modifica). RNF-8, D34. `.leetify-attribution__logo` sube a 24 px de alto
  (proporción intacta, sin filtros). Comprobar en navegador que no supera al bloque de marca de
  la cabecera (icono y «TeamMatchUp») y que a 375 px la atribución se reparte sin solaparse
  (`flex-wrap`). Si 24 px resultara más destacado que la marca, usar el máximo que no lo sea y
  anotarlo.
- **`RankDistanceBlock.tsx`** (modifica). Limpieza: en el caso `value` queda solo `OriginTag`
  (quitar la rama inalcanzable de `LeetifyAttribution`); el comentario lo explica (RF-25).
- **`domain/origins.ts`**: `originLabel('leetify')` se mantiene (tipo exhaustivo), pero ya ningún
  componente debe pasar `'leetify'` a `OriginTag`. `grep` de comprobación en §14.4.

### 14.4 Pruebas y comprobación
- Frontend: `typecheck`, `lint`, `build` en verde.
- `grep -rn "OriginTag" frontend/src`: cada uso recibe un origen que nunca es `leetify` (revisión).
- Navegador (entorno de §3.7 de `validation.md`): Coincidencias de GoldUno (propia Leetify):
  Candidato sin etiqueta bajo el anillo, Simulado y SimuladoDos «Datos de demostración»;
  Coincidencias de Simulado: los tres «Datos de demostración»; ningún «Datos de Leetify» en
  ninguna pantalla; logo a 24 px en oscuro y claro, 1280 y 375.

### 14.5 Tareas previstas
21. **T21** `scoreOriginLabel`, `ScoreRing` sin Leetify, logo a 24 px, rama muerta. RF-26, RNF-8.
22. **T22** Revalidación del `reviewer` con navegador (RF-26, RNF-8) y documentos
    (`validation.md` §3.8, `MEMORY.md`). Todos.
