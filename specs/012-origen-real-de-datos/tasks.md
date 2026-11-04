# Tareas 012 — Origen real de los datos y cuentas verificadas
Estado: aprobado (2026-11-04)

Spec: `spec.md` (aprobada el 2026-11-04). Plan: `plan.md` (aprobado el 2026-11-04).
Regla de cada tarea (constitución, principio 4): pruebas primero en rojo, después el código,
y la tarea se cierra solo con tests, typecheck y lint del backend en verde (y build, typecheck
y lint del frontend en las tareas del frontend), sin `.only`.

- [x] **T1. Documentos: constitución, `AGENTS.md` y notas de impacto.** RF-7; "Impacto en
  otras specs y documentos" de la spec.
  - Agregar al principio 5 de `docs/constitution.md` el texto aprobado en la spec.
  - `AGENTS.md`: "rango simulado" → "rango simulado o real"; servicios `realSources.ts` y
    `verifyAccount.ts` en la lista.
  - Nota "Cambio por la spec 012 (2026-11-04)" en el estado de las specs 004 (RF-41 y
    proporción de verificadas revocadas; "Todo simulado" revocada para LoL y CS2), 005
    (filtro y su mensaje), 007 (etiqueta por bloque), 008 (origen y marca real) y 011 (sin
    verificadas).
  - Hecho cuando: el texto del principio 5 está en la constitución y las cinco specs tienen
    su nota; `git diff` solo toca documentos.

- [x] **T2. Dominio: orígenes, espera mínima y mensajes.** RF-5, RF-7, RF-14, RF-16, RF-18,
  RNF-4 (plan, secciones 1 y 2).
  - `domain/sources.ts`: `SourceId`, `Origin`, `BlockOrigins`, `SOURCE_NAMES`,
    `SOURCE_BLOCKS`, `blockOrigins()`.
  - `domain/syncCooldown.ts`: `SYNC_COOLDOWN_MS`, `syncCooldown(lastSyncedAt, now)`.
  - `ACCOUNT_ERRORS`: `verifiedElsewhere`, `verifiedNotEditable`, `syncCooldown(n)`,
    `sourceUnavailable(name)`, `sourceAccountGone(name)`.
  - `validateAccountEdit` rechaza la edición de una cuenta con `verification`, antes de mirar
    el cuerpo.
  - Hecho cuando: pruebas unitarias en verde para `blockOrigins` (sin verificar, Steam,
    Riot), `syncCooldown` (0 s, 4 min 10 s → 1, 5 min exactos, diferencia negativa), los
    textos exactos (con "1 minuto" en singular y "N minutos" en plural) y la edición
    rechazada.

- [x] **T3. El simulador deja de decidir `verified`; mensaje del filtro.** RF-1, RF-2, RF-4,
  RF-23 (plan, P12-1; riesgo R2).
  - Quitar `isVerified` y `SimulatedReading.verified` (`rankSimulator.ts`) y `verified` de
    `AccountState`, `initialState` y `applySync`.
  - `MATCH_ERRORS.onlyVerified` → "filtro «Solo cuentas verificadas» no válido: usa true o
    false".
  - Ajustar las pruebas de las specs 004, 005 y 008 que esperaban `verified: true` del
    simulador o el texto "rango verificado", sin cambiar ningún otro comportamiento.
  - Hecho cuando: ninguna lectura simulada produce `verified`; con el filtro activo y solo
    cuentas simuladas, las coincidencias salen vacías; la suite completa del backend en verde.

- [x] **T4. Modelo: `verification`, `handleKey`, `profile` y serialización.** RF-1, RF-2,
  RF-3, RF-5, RF-10, RF-22, RNF-3 (plan, P12-1 a P12-4, P12-6).
  - `GameAccount`: sale `verified` guardado; entran `verification?` (`source`, `externalId`,
    `verifiedAt`), `handleKey` (con índice), `profile?` (todo opcional) y el índice único
    parcial `{ gameId, "verification.externalId" }`.
  - `toGameAccountJson`: `verified` y `origins` derivados, `verifiedWith?`, `verifiedAt?`,
    `profile?`; sin `simulated` ni `externalId`.
  - Vincular guarda `handleKey`. `prepareDatabase` completa el `handleKey` que falte y hace
    `$unset` de `verified`, de forma idempotente.
  - Hecho cuando: pruebas del modelo en verde (la serialización no trae `simulated` ni
    `externalId`; el índice rechaza dos verificaciones del mismo `externalId` y acepta muchas
    cuentas sin verificar con el mismo identificador; `prepareDatabase` dos veces seguidas no
    falla); desvincular una cuenta verificada la borra con su verificación (RF-3).

- [ ] **T5. Transiciones reales puras.** RF-8, RF-9, RF-15 (plan, sección 2).
  - `domain/verification.ts`: `verifiedState(base, real, now)` y
    `applyRealSync(state, real, now)`.
  - Hecho cuando: pruebas unitarias en verde con fuente que entrega rango y partidas (el
    historial empieza con un solo punto real; en la resincronización solo se agrega punto si
    cambia el rango) y con fuente que no los entrega (rango, historial y partidas de `base`
    intactos).

- [ ] **T6. Fuentes inyectables y resincronización real.** RF-15 a RF-21, RNF-1, RNF-5
  (plan, sección 3.1, P12-5, P12-7).
  - `services/realSources.ts`: `RealSource`, `RealResult`, `SourceRegistry`,
    `readWithTimeout` (8 s).
  - `createApp({ sources })` (por defecto `{}`) → `createAccountsRouter`.
  - `POST /api/accounts/:id/sync`: espera mínima → fuente → 200, 429, 503 o 404 según 3.1;
    cuentas sin verificar igual que hoy.
  - Hecho cuando: pruebas de controlador con una fuente falsa en verde: 200 con datos
    actualizados; 429 a los 4 min (reloj fijo) sin llamar a la fuente; 503 por
    `unavailable`, por timeout y sin fuente registrada, con la cuenta y `lastSyncedAt`
    intactos; 404 `gone` con la cuenta todavía verificada; la cuenta sin verificar se
    resincroniza dos veces seguidas sin 429; ningún `GET` llama a la fuente (RF-17).

- [ ] **T7. `verifyAccount` y el 409 del vínculo manual.** RF-1, RF-8, RF-10 a RF-13 (plan,
  secciones 3.2 y 3.3; riesgo R1).
  - `services/verifyAccount.ts` según 3.2.
  - `linkAccount`: 409 `verifiedElsewhere` si el `gameId` + `handleKey` está verificado por
    otro usuario.
  - Hecho cuando: pruebas en verde de alta nueva; conversión de la cuenta propia, con y sin
    cambio de identificador (mismo `_id`, una sola cuenta por juego); 409 si otro usuario ya
    verificó; desvinculación de las cuentas sin verificar de otros; dos verificaciones
    simultáneas del mismo `externalId` (una gana, la otra 409); vínculo manual con 409 y
    vínculo manual libre después de que el dueño desvincula.

- [ ] **T8. Frontend: tipos, etiquetas de origen y modo simulado.** RF-2, RF-5, RF-6, RF-7,
  RF-12, RF-14, RF-23 (plan, sección 1, Frontend).
  - `domain/types.ts`: sale `simulated`; entran `verifiedWith?`, `verifiedAt?`, `origins`,
    `profile?`.
  - `domain/origins.ts` (`originLabel`, `verifiedLabel`) y `shared/components/OriginTag.tsx`.
  - Modo simulado (`simulatedProvider.ts`, `mockApi.ts`, `seed.ts`): todas las cuentas sin
    verificar, `origins` todo `simulated`, mensajes del filtro, del 400 de edición y del 409
    iguales al servidor.
  - Hecho cuando: `npm run build`, `typecheck` y `lint` del frontend en verde (los usos de
    `simulated` en los componentes se reemplazan en T9; en esta tarea basta con que compilen
    contra el tipo nuevo).

- [ ] **T9. Frontend: componentes con origen por bloque y marca real.** RF-6, RF-22 (plan,
  sección 4).
  - `AccountRow`, `GameSummaryPanel`, `MatchLedger`, `MatchEntry`, `playerSheet.ts` y
    `RankDistanceBlock` usan `origins` y `verifiedLabel`; `DemoTag` queda solo en
    `AppLayout` y `LandingPage`.
  - Hecho cuando: build, typecheck y lint del frontend en verde; ningún componente lee
    `simulated`; en modo simulado el perfil, las coincidencias y la ficha muestran "Sin
    verificar" y "Datos de demostración" por bloque.

- [ ] **T10. Cierre y validación.** RNF-1; criterios de finalización de la spec.
  - Suite completa del backend **sin conexión a Internet**, más typecheck y lint del
    backend; build, typecheck y lint del frontend.
  - Recorrido manual con el servidor real: vincular a mano, resincronizar sin espera, filtro
    "Solo cuentas verificadas" vacío, etiquetas por bloque.
  - Marcar las casillas de "Criterios de finalización" y actualizar `MEMORY.md`.
  - Hecho cuando: todo lo anterior en verde, con el número de tests anotado en `MEMORY.md`,
    y la spec lista para `/sdd-validate 012-origen-real-de-datos`.
