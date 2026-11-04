# Plan 012 — Origen real de los datos y cuentas verificadas
Estado: aprobado (2026-11-04)

Spec: `specs/012-origen-real-de-datos/spec.md` (aprobada el 2026-11-04, sin dudas abiertas).
Rama: `feature/vinculacion-steam-riot` (desde `origin/main`, commit `2e1eeba`).

Esta spec no agrega ninguna fuente real: deja listos el modelo, las reglas y los puntos de
enganche que usarán la 013 (Steam) y la 014 (Riot). Hasta entonces **no existe ninguna fuente
registrada**, así que en la práctica ninguna cuenta queda verificada y todo se ve como
"Datos de demostración". Esa es exactamente la conducta de RF-2 y RF-20 mientras no haya
fuentes.

## 0. Estado real del código (comprobado el 2026-11-04 en `2e1eeba`)
- `backend/src/models/gameAccount.ts`: `verified: boolean` guardado; `toGameAccountJson`
  (lista blanca) agrega siempre `simulated: true`; índice único `{ user, gameId }`;
  concurrencia optimista.
- `backend/src/domain/rankSimulator.ts`: `isVerified(canonical)` (suma de códigos par) decide
  `verified` en cada lectura; `canonicalHandle()` normaliza identificadores.
- `backend/src/domain/accountState.ts`: `initialState` y `applySync` copian
  `reading.verified`.
- `backend/src/controllers/accounts.ts`: vincular (`POST /`), editar (`PUT /:id`, solo la
  región), desvincular (`DELETE /:id`) y resincronizar (`POST /:id/sync`) usan
  `simulatedRankProvider` directamente.
- `backend/src/services/matchInputs.ts`: arma las coincidencias con `toGameAccountJson`, así
  que todo lo que cambie en la serialización llega solo a la spec 005.
- `backend/src/domain/matchQuery.ts:18`: mensaje "filtro «Solo cuentas con rango verificado»
  no válido: usa true o false". La interfaz **ya** dice "Solo cuentas verificadas"
  (`MatchFiltersPanel.tsx:97`); el modo simulado repite el texto antiguo
  (`mockApi.ts:205`).
- Frontend: `GameAccount` (`domain/types.ts`) tiene `verified` y `simulated`; `DemoTag`
  (texto `SIMULATED_LABEL`) se muestra según `account.simulated` en `AccountRow`,
  `GameSummaryPanel`, `MatchLedger`, `MatchEntry`, `RankDistanceBlock` (vía
  `domain/playerSheet.ts`) y la marca "verificada" en `HomePage` y `ProfilePage`.
- `frontend/src/services/mock/simulatedProvider.ts` decide `verified` igual que el backend.
- La spec 011 (datos de demostración en el servidor) sigue en borrador y no hay comando de
  carga en el backend: no hay código que cambiar por ella, solo la nota de impacto.

## 1. Archivos y responsabilidades

### Backend — dominio (funciones puras, sin Express, Mongoose ni reloj)
| Archivo | Cambio | RF |
|---|---|---|
| `domain/sources.ts` (nuevo) | Tipos `SourceId = "steam" \| "riot"`, `Origin = "simulated" \| SourceId`, `BlockOrigins`; `SOURCE_NAMES` ("Steam", "Riot Games"); `SOURCE_BLOCKS` (qué bloques entrega cada fuente: Steam → identidad y perfil; Riot → los cuatro); `blockOrigins(verification)` | RF-5, RF-7, RF-8, RF-13 de la 013 |
| `domain/syncCooldown.ts` (nuevo) | `SYNC_COOLDOWN_MS = 5 * 60_000`; `syncCooldown(lastSyncedAt, now)` → `{ allowed: true }` o `{ allowed: false, minutes }` (hacia arriba) | RF-16, RF-18 |
| `domain/verification.ts` (nuevo) | `verifiedState(real, now)`: estado de una cuenta recién verificada (RF-8: descarta lo simulado, historial nuevo con un solo punto real); `applyRealSync(state, real, now)`: resincronización real (RF-9: punto nuevo solo si cambia el rango; nunca mezcla) | RF-8, RF-9, RF-15 |
| `domain/accountRules.ts` | Mensajes nuevos en `ACCOUNT_ERRORS`: `verifiedElsewhere`, `verifiedNotEditable`, `syncCooldown(n)` (singular con 1), `sourceUnavailable(name)`, `sourceAccountGone(name)`. `validateAccountEdit` rechaza cualquier edición de una cuenta verificada antes de mirar el cuerpo | RF-10, RF-12, RF-14, RF-16, RF-19, RF-21, RNF-4 |
| `domain/accountState.ts` | Se quita `verified` de `AccountState`, `initialState` y `applySync` (la verificación ya no es parte de la lectura simulada) | RF-1, RF-2 |
| `domain/rankSimulator.ts` | Se quitan `isVerified` y `SimulatedReading.verified` | RF-1, RF-2 |
| `domain/matchQuery.ts` | `MATCH_ERRORS.onlyVerified` → "filtro «Solo cuentas verificadas» no válido: usa true o false" | RF-23 |

### Backend — modelo y servicios
| Archivo | Cambio | RF |
|---|---|---|
| `models/gameAccount.ts` | Sale `verified` guardado. Entran: `verification?: { source, externalId, verifiedAt }` (subdocumento opcional, sin `_id`); `handleKey: string` (= `canonicalHandle(handle)`, índice); `profile?` (todo opcional: `displayName`, `avatarUrl`, `country`, `level`, `iconId`, `hoursTotal`, `hoursRecent`, `isPrivate`). Índice **único parcial** `{ gameId: 1, "verification.externalId": 1 }` solo para documentos con `verification`. `toGameAccountJson`: `verified = verification !== undefined`, `verifiedWith?: SourceId`, `verifiedAt?`, `origins: BlockOrigins`, `profile?`; **sale `simulated`**; `externalId` nunca sale | RF-1, RF-3, RF-5, RF-10, RF-22, RNF-3 |
| `services/realSources.ts` (nuevo) | Interfaz `RealSource { id; gameId; read(account, signal): Promise<RealResult> }` con `RealResult = { ok: true, data } \| { ok: false, reason: "unavailable" \| "gone" }`; `SourceRegistry = Partial<Record<GameId, RealSource>>`; `readWithTimeout(source, account, ms = 8000)` (`AbortSignal.timeout`; un timeout o una excepción → `unavailable`) | RF-19, RF-20, RF-21, RNF-5 |
| `services/verifyAccount.ts` (nuevo) | `verifyAccount({ userId, gameId, handle, region, verification, real, now })`: lo usarán las rutas de verificación de la 013 y la 014. Exclusividad (RF-10), conversión o alta (RF-13), desvinculación de las no verificadas de otros (RF-11) | RF-1, RF-8, RF-10, RF-11, RF-13 |
| `services/accountWrites.ts` | `linkAccount` guarda `handleKey`; antes de crear comprueba que ninguna cuenta verificada de otro usuario tenga el mismo `gameId` + `handleKey` → 409 | RF-12 |
| `services/rankProvider.ts` | Sin cambios de interfaz (sigue síncrono y solo simulado: es la lectura de las cuentas sin verificar) | RF-18 |
| `controllers/accounts.ts` | `createAccountsRouter` recibe `sources: SourceRegistry`. `PUT /:id`: RF-14. `POST /:id/sync`: si la cuenta está verificada, aplica la espera (RF-16) y luego consulta la fuente (RF-15, RF-19, RF-21); si no, sigue como hoy (RF-18). `POST /`: 409 de RF-12 | RF-12, RF-14 a RF-21 |
| `app.ts` | `AppOptions.sources?: SourceRegistry` (por defecto `{}`), pasado a `createAccountsRouter`. Las pruebas inyectan fuentes falsas | RF-20, RNF-1 |
| `server.ts` | `prepareDatabase()`: después de `GameAccount.init()`, completa `handleKey` en las cuentas que no lo tengan (una pasada, idempotente) y quita el campo `verified` guardado (`$unset`) | RF-2 |

### Frontend
| Archivo | Cambio | RF |
|---|---|---|
| `domain/types.ts` | `GameAccount`: sale `simulated`; entran `verifiedWith?`, `verifiedAt?`, `origins`, `profile?`. Tipos `Origin`, `BlockOrigins`, `AccountProfile` | RF-5, RF-22 |
| `domain/origins.ts` (nuevo) | `originLabel(origin)` → "Datos de demostración" \| "Datos de Steam" \| "Datos de Riot Games"; `verifiedLabel(source)` → "Verificada con Steam" \| "Verificada con Riot" | RF-6, RF-7 |
| `shared/components/OriginTag.tsx` (nuevo) | Etiqueta por bloque (`<OriginTag origin=… />`) con las mismas clases `note` de `DemoTag`; `DemoTag` se mantiene para el aviso general del modo simulado (`AppLayout`, `LandingPage`) | RF-6 |
| `features/profile/components/AccountRow.tsx`, `GameSummaryPanel.tsx`, `MatchLedger.tsx` | Cambian `account.simulated` por el origen de cada bloque (rango → `origins.rank`, partidas → `origins.matches`); la marca muestra `verifiedLabel` o "Sin verificar" | RF-6, RF-22 |
| `features/matches/components/MatchEntry.tsx`, `domain/playerSheet.ts`, `features/players/components/RankDistanceBlock.tsx` | Igual: origen del rango del candidato; marca de verificada real | RF-6, RF-22 |
| `features/home/pages/HomePage.tsx`, `features/profile/pages/ProfilePage.tsx` | Sin cambios de lógica (leen `verified`, que ahora es real); revisar textos | RF-1 |
| `services/mock/simulatedProvider.ts`, `services/mock/mockApi.ts`, `services/mock/seed.ts` | El modo simulado deja de decidir `verified`: todas las cuentas sin verificar, `origins` todo `simulated`; mensaje del filtro (RF-23), del 400 de edición (RF-14) y del 409 (RF-12) iguales al servidor | RF-2, RF-12, RF-14, RF-23 |
| `services/apiContract.ts`, `services/http/httpApi.ts` | Sin métodos nuevos (los traen la 013 y la 014). `syncAccount` ya propaga errores con su texto: el 429 y el 503 se muestran con `MutationNotice` como cualquier error | RF-16, RF-19 |

### Documentos
| Archivo | Cambio |
|---|---|
| `docs/constitution.md` | Principio 5: se agrega el texto aprobado en la spec ("Los datos de una cuenta verificada que la plataforma obtiene de la fuente oficial del juego son reales y se muestran atribuidos a esa fuente; nunca se atribuye a una fuente real un dato simulado.") |
| `AGENTS.md` | Menciona `realSources.ts` y `verifyAccount.ts` en la lista de servicios; "rango simulado" pasa a "rango simulado o real" |
| `specs/004`, `005`, `007`, `008`, `011` | Una nota "Cambio por la spec 012" en el estado de cada una con los RF revocados o ajustados (lista de "Impacto" de la spec) |

## 2. Funciones puras ("hoy" llega como parámetro)

```ts
// domain/sources.ts
blockOrigins(verification?: { source: SourceId }): BlockOrigins
//   sin verificación → { identity, rank, matches, profile } todos "simulated"   (RF-2)
//   con fuente S     → cada bloque = S si SOURCE_BLOCKS[S] lo incluye, si no "simulated" (RF-8)

// domain/syncCooldown.ts
syncCooldown(lastSyncedAt: Date, now: Date): { allowed: true } | { allowed: false; minutes: number }
//   transcurrido = now - lastSyncedAt
//   transcurrido >= 5 min (o negativo por reloj atrasado) → allowed        (RF-16)
//   si no → minutes = ceil((5 min - transcurrido) / 1 min), mínimo 1

// domain/verification.ts
verifiedState(base: AccountState, real: RealData, now: Date): AccountState
//   base = estado simulado de la cuenta propia que se convierte, o la lectura simulada 0
//   si la fuente entrega rango: currentRank = real.rank, rankHistory = [real.rank]
//     (se descarta el historial simulado: nunca se mezclan, RF-8, RF-9)
//   si no: currentRank y rankHistory = los de base (siguen simulados y etiquetados, RF-8)
//   matches      = real.matches ?? base.matches
//   lastSyncedAt = now
applyRealSync(state: AccountState, real: RealData, now: Date): AccountState
//   si la fuente entrega rango: currentRank = real.rank y
//     rankHistory += real.rank solo si shouldAppendSnapshot(state.currentRank, real.rank) (RF-9)
//   si entrega partidas: matches = mergeMatches(state.matches, real.matches)
//   bloques que la fuente no entrega: sin cambios; lastSyncedAt = now
```

`RealData = { handle: string; rank?: Snapshot; matches?: Match[]; profile?: AccountProfile }`.
La 014 ampliará `rank` con "sin clasificar"; la 012 no lo necesita.

## 3. Algoritmos

### 3.1 Resincronizar (`POST /api/accounts/:id/sync`)
```
sesión → formato → existencia → dueño            (como hoy, spec 004 RF-29)
si cuenta.verification no existe:
    lectura simulada como hoy                     (RF-18, sin espera)
si existe:
    c = syncCooldown(cuenta.lastSyncedAt, clock.now())
    si !c.allowed → 429 syncCooldown(c.minutes)   (RF-16; no consulta la fuente)
    fuente = sources[cuenta.gameId]
    si fuente no existe → 503 sourceUnavailable(SOURCE_NAMES[cuenta.verification.source]) (RF-19, RF-20)
    r = readWithTimeout(fuente, cuenta)           (RNF-5)
    r.unavailable → 503, cuenta intacta, lastSyncedAt intacto            (RF-19)
    r.gone        → 404 sourceAccountGone(nombre), cuenta intacta, sigue verificada (RF-21)
    r.ok          → updateOwnedAccount(... applyRealSync; handle/handleKey = r.data.handle;
                     profile = r.data.profile ?? profile) → 200      (RF-15, RF-9)
```
La consulta a la fuente se hace **fuera** del reintento de `updateOwnedAccount` (una sola
consulta por petición) y el resultado se aplica dentro, sobre la cuenta releída.

### 3.2 Verificar (`verifyAccount`, lo llaman la 013 y la 014)
```
entrada: userId, gameId, handle, region, verification {source, externalId}, real (RealData), now
1. otra = cuenta con gameId y verification.externalId = externalId y user ≠ userId
   si existe → 409 verifiedElsewhere                                       (RF-10)
2. propia = cuenta { user: userId, gameId }
   si propia existe → se reemplazan handle, handleKey, region, verification, verifiedAt,
       profile y los bloques reales (verifiedState); se guarda con save()  (RF-13, RF-8)
   si no → se crea con los mismos campos; para los bloques que la fuente no entrega
       (Steam: rango, historial y partidas) se usa la lectura simulada número 0 (RF-8)
3. error de clave duplicada en el índice parcial → 409 verifiedElsewhere  (RF-10, carrera)
   error de clave duplicada en { user, gameId } (alta simultánea) → se repite desde 2 una vez
4. deleteMany({ gameId, handleKey, user ≠ userId, verification no existe }) (RF-11)
5. devuelve la cuenta
```
Sin transacciones (como la spec 004). Si el paso 4 falla después de guardar, la cuenta queda
verificada y las otras siguen vinculadas sin verificar. No pueden verificarse (RF-10) y se
desvinculan en la próxima verificación o al vincular (ver 3.3). Riesgo aceptado R1.

### 3.3 Vincular a mano (`POST /api/accounts`)
Después de validar el cuerpo y antes del duplicado propio (RF-29 de la 004 se extiende):
si existe una cuenta con `gameId` + `handleKey` y `verification` de otro usuario → 409
`verifiedElsewhere` (RF-12).

### 3.4 Editar (`PUT /api/accounts/:id`)
`validateAccountEdit(account, body)`: si `account.verification` existe → 400
`verifiedNotEditable`, sin mirar el cuerpo (RF-14). El resto, igual que hoy.

## 4. Cómo se pinta en la interfaz
- **Perfil, fila de la cuenta (`AccountRow`)**: el sello pasa de "Verificada" / "Sin
  verificar" a "Verificada con Steam" / "Verificada con Riot" / "Sin verificar". Junto al
  rango, `<OriginTag origin={account.origins.rank} />`.
- **Resumen por juego (`GameSummaryPanel`, `MatchLedger`)**: una etiqueta de origen sobre el
  rango e historial y otra sobre la lista de partidas. Con Steam se ve "Datos de Steam" en el
  encabezado y "Datos de demostración" en el rango y las partidas (RF-8 aplicado a CS2).
- **Coincidencias y ficha de jugador**: la marca de verificada y el origen del rango de cada
  candidato, visibles para cualquiera con sesión (RF-22).
- **Errores**: el 429 de la espera y el 503 de la fuente se muestran con el aviso de mutación
  que ya existe, con el texto del servidor.
- Hasta la 013 y la 014 nada cambia a la vista salvo "Sin verificar" en todas las cuentas y
  el texto del filtro en el modo simulado.

## 5. Decisiones técnicas
- **P12-1. `verified` derivado de `verification`, no guardado.** Una sola verdad: no puede
  haber `verified: true` sin fuente. Las cuentas antiguas con `verified: true` del simulador
  quedan sin verificar sin migrar datos (RF-2); el `$unset` de `prepareDatabase` solo limpia.
  *Descartada:* mantener el booleano y migrarlo a `false` (dos campos que pueden contradecirse).
- **P12-2. Origen por bloque calculado (`blockOrigins`), no guardado.** Depende solo de la
  fuente que verificó y de qué entrega esa fuente; guardarlo permitiría estados imposibles
  (rango "riot" en una cuenta sin verificar). *Descartada:* un campo `origins` en la base.
- **P12-3. Exclusividad con índice único parcial `{ gameId, verification.externalId }`.**
  Resuelve la carrera de RF-10 en la base, sin transacciones, igual que `{ user, gameId }`
  resuelve el duplicado de la 004. *Descartada:* comprobar y luego escribir (pierde la
  carrera).
- **P12-4. `handleKey` guardado para RF-11 y RF-12.** Las cuentas sin verificar no tienen
  identificador real, así que la comparación es por identificador escrito canónico
  (`canonicalHandle`, el mismo del simulador). Guardado e indexado para consultarlo.
  *Descartada:* comparar en memoria leyendo todas las cuentas del juego.
- **P12-5. Fuentes inyectadas en `createApp` (`sources`).** Las pruebas pasan fuentes falsas
  y nunca tocan la red (RNF-1); sin fuentes la app arranca igual (RF-20). La 013 y la 014
  construyen sus fuentes en `index.ts` a partir de la configuración. *Descartada:* módulos
  que leen `process.env` al importarse (la constitución y la spec 001, D11, lo prohíben).
- **P12-6. Sale `simulated` del JSON de la cuenta.** Con `origins` el campo sería redundante o
  falso (una cuenta de CS2 verificada no es "simulada" ni "real" entera). Se actualizan los
  seis puntos del frontend que lo leen. *Descartada:* mantenerlo como "todo simulado", que
  obligaría a la interfaz a combinar dos fuentes de verdad.
- **P12-7. La espera usa `lastSyncedAt`.** Ya existe y RF-19 exige no contar los intentos
  fallidos, que no lo actualizan. *Descartada:* un campo `lastSyncAttemptAt`.
- **P12-8. 409 para la exclusividad.** Es un conflicto con el estado de otro recurso, no un
  dato mal formado; la spec lo fija así. El 400 de duplicado propio de la 004 no cambia.

## 6. Riesgos
- **R1.** Fallo entre guardar la verificación y desvincular las demás (3.2, paso 4): quedan
  cuentas sin verificar de otros con el mismo identificador hasta la siguiente verificación.
  No pueden verificarse ni producir datos reales. Aceptado, como R3 de la 004.
- **R2.** Las pruebas de las specs 004, 005 y 008 que esperan `verified: true` del simulador
  o el literal "rango verificado" cambian. Se ajustan en la misma tarea que el cambio (T3),
  sin cambiar ningún otro comportamiento.

## 7. Estrategia de pruebas (`node --test`, sin red)
- **Unitarias de dominio** (primero en rojo): `syncCooldown` (0 s, 4 min 10 s → 1, 5 min
  exactos, reloj negativo), `blockOrigins` (sin verificar, Steam, Riot), `verifiedState` y
  `applyRealSync` (historial nuevo, punto solo si cambia, bloques ausentes intactos),
  `validateAccountEdit` con cuenta verificada, mensajes exactos (singular y plural).
- **Modelo**: `toGameAccountJson` no tiene `simulated` ni `externalId`; `verified` y
  `origins` derivados; el índice parcial rechaza dos verificaciones del mismo `externalId` y
  admite muchas cuentas sin verificar con el mismo identificador.
- **Controlador con fuentes falsas** (`createApp({ sources: { cs2: fake } })`): resync de
  cuenta verificada (200, 429 a los 4 min con `clock` fijo, 503 por `unavailable`, por timeout
  y sin fuente registrada, 404 `gone` sin perder la verificación), resync sin verificar sin
  espera, edición rechazada, vínculo manual con 409.
- **`verifyAccount`**: alta, conversión de la propia (con y sin cambio de identificador),
  409 de otro, desvinculación de las no verificadas de otros, dos verificaciones simultáneas
  (una gana), y prueba de que ninguna lectura `GET` llama a la fuente (RF-17).
- **Frontend**: `npm run build`, `typecheck` y `lint` en verde (constitución, principio 4);
  recorrido manual en modo simulado y con el servidor: todas "Sin verificar", etiquetas por
  bloque, texto del filtro.
- Al cerrar: suite completa del backend sin conexión a Internet (RNF-1).

## 8. Trazabilidad
| RF | Dónde |
|---|---|
| RF-1 | P12-1, `verifyAccount`, `accountState`/`rankSimulator` sin `verified` |
| RF-2 | P12-1, `blockOrigins`, mock sin `verified`, `prepareDatabase` |
| RF-3 | Desvincular borra el documento con su `verification` (sin cambio de código; prueba nueva) |
| RF-4 | `matching.ts` sin cambios: usa `account.verified`, ahora derivado |
| RF-5, RF-6, RF-7 | `blockOrigins`, `toGameAccountJson.origins`, `OriginTag`, `originLabel` |
| RF-8, RF-9 | `verifiedState`, `applyRealSync` |
| RF-10, RF-11, RF-13 | `verifyAccount`, índice parcial (P12-3) |
| RF-12 | `linkAccount` + `handleKey` (P12-4) |
| RF-14 | `validateAccountEdit` |
| RF-15 a RF-21 | 3.1, `realSources.ts`, `syncCooldown` |
| RF-22 | `toGameAccountJson` en listados y coincidencias; componentes del frontend |
| RF-23 | `matchQuery.ts`, `mockApi.ts` |
| RNF-1 | P12-5, pruebas con fuentes falsas |
| RNF-2 | Sin claves en esta spec; la 013 y la 014 las leen de la configuración |
| RNF-3 | Lista blanca de `toGameAccountJson` |
| RNF-4 | Mensajes de `ACCOUNT_ERRORS` |
| RNF-5 | `readWithTimeout` |

## 9. Tareas previstas (detalle en `tasks.md`, tras aprobar este plan)
1. Constitución, `AGENTS.md` y notas de impacto en las specs 004, 005, 007, 008 y 011.
2. Dominio: `sources.ts`, `syncCooldown.ts`, mensajes y `validateAccountEdit` (RF-14).
3. El simulador deja de decidir `verified`; ajuste de pruebas de 004, 005 y 008; mensaje del
   filtro (RF-23).
4. Modelo: `verification`, `handleKey`, `profile`, índice parcial, serialización, limpieza en
   `prepareDatabase`.
5. `verification.ts` (`verifiedState`, `applyRealSync`).
6. `realSources.ts`, `sources` en `createApp` y la resincronización real (3.1).
7. `verifyAccount` (3.2) y el 409 del vínculo manual (3.3).
8. Frontend: tipos, `originLabel`, `OriginTag` y el modo simulado.
9. Frontend: componentes de perfil, coincidencias y ficha.
10. Cierre: suite sin red, typecheck, lint, build, recorrido manual y `MEMORY.md`.
