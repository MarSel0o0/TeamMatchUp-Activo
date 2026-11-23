# Tareas 015 — Rango Premier real de CS2 con Leetify
Estado: aprobado (2026-11-19, por el usuario: «las apruebo»). Plan:
`specs/015-rango-premier/plan.md` (aprobado el 2026-11-19 al pedir las tareas). Spec:
`specs/015-rango-premier/spec.md` (aprobada; revisión aprobada el 2026-11-19).

Diez tareas: T1 a T6 son el backend, T7 a T9 la interfaz y T10 el cierre. El cambio de
requisitos D26 a D30 (plan, §12, aprobado el 2026-11-19) suma T11 a T16, aprobadas por el
usuario el 2026-11-19: T11 a T13 son el backend, T14 y T15 la interfaz y T16 el cierre. El cambio
D31 y D32 (plan, §13) suma T17 a T20, aprobadas por el usuario el 2026-11-19 («apruebo, e
implementa nomas»): las cuatro son de la interfaz y el cierre. El cambio D33 y D34 (plan, §14)
suma T21 y T22, aprobadas por el usuario el 2026-11-19. Una tarea cada vez,
en orden. En el backend, las pruebas van primero y se ven en rojo por la razón correcta antes
de escribir el código (constitución, principio 4); en el frontend bastan `build`, `typecheck` y
`lint` en verde.

Comandos (desde `backend/`): un archivo
`NODE_ENV=test node --test tests/<carpeta>/<archivo>.test.ts`; todo el backend `npm test`;
además `npm run typecheck` y `npm run lint`. Desde `frontend/`: `npm run typecheck`,
`npm run lint` y `npm run build`.

Ninguna tarea cierra con pruebas, typecheck o lint en rojo, ni con `.only`. Ninguna prueba toca
la red ni usa una clave real de Leetify (RNF-1). No se editan las specs 004, 005, 012 ni 013
(D8). Sin dependencias nuevas (RNF-6).

- [x] **T1. Dominio de Leetify y orígenes.** `backend/src/domain/leetify.ts` con
  `LeetifyReading`, `PremierState`, `parseLeetifyProfile`, `cs2RealStep`, `premierSnapshot`,
  `verifiedPremier`, `applyLeetifyReading`, `LEETIFY_NOTICES` y `LEETIFY_ERRORS` (plan, §3, §4.1
  y tabla de §1). En `domain/sources.ts`: `DATA_SOURCE_IDS` con `leetify`, `Origin` ampliado,
  `SOURCE_NAMES.leetify` y `blockOrigins` con `rank: "leetify"` para cuentas verificadas con
  Steam (P15-7). RF-2, RF-3, RF-4, RF-5, RF-9, RF-11, RF-13, RF-14, RF-18, RF-22, RNF-5.
  - Hecho cuando: `tests/unit/leetify.test.ts` (nuevo) cubre cada caso de §7 del plan
    (bordes 1 y 99999; 0/null/ausente/404 → unrated; 401/429/500/−1/12.5/100000/texto → failed;
    Gold 36210 normalizado 100; cada celda de la tabla de §1; mismo rating sin punto; no muta) y
    `tests/unit/sources.test.ts` cubre Steam `rank = leetify`, `matches = simulated`; ambos
    pasaron de rojo a verde y `domainIsolation.test.ts`, typecheck y lint siguen en verde.

- [x] **T2. Cliente de Leetify y configuración.** `services/leetifyClient.ts` con `fetch`
  inyectable (`GET /v3/profile?steam64_id=`, cabecera `_leetify_key` solo con clave, cualquier
  excepción → `failed`, nunca registra URL ni clave). `withTimeout` extraído en
  `services/realSources.ts` (sin cambiar `readWithTimeout` por fuera) y
  `readPremierWithTimeout` de 8 s. `Config.leetify = { apiKey: string | null }` desde
  `LEETIFY_API_KEY` (vacía = sin clave) y la variable comentada en `backend/.env.example`.
  RF-14, RNF-1, RNF-2, RNF-3, RNF-4.
  - Hecho cuando: `tests/unit/leetifyClient.test.ts` (nuevo) prueba URL, cabecera con y sin
    clave, excepción, señal abortada y plazo vencido → `failed`, y que ningún error contiene la
    clave; `config.test.ts`, `envExample.test.ts` y las pruebas actuales de `readWithTimeout`
    (`accountRealSync.test.ts`) siguen en verde.

- [x] **T3. Modelo y migración.** En `models/gameAccount.ts`: campo `premier` (enum),
  `currentRank` puede ser `null` con Steam y `premier ≠ "rated"`, JSON con `premierStatus` solo
  sin rating y sin `premier` (P15-1, P15-2). En `server.ts`, `migrateAccounts` con el
  `updateMany` de §4.4. RF-7, RF-8, RF-20.
  - Hecho cuando: `gameAccountModel.test.ts` (amplía) cubre los casos de §7 y una prueba de
    migración (nueva, en `tests/server/`) comprueba: cuenta de Steam sin `premier` →
    `unavailable`, `currentRank: null`, historial vacío; cuenta sin verificar y de Riot intactas;
    segunda pasada sin cambios. En rojo antes, en verde después.

- [x] **T4. Verificar con Steam y leer Leetify.** `AppOptions.leetifyClient` en `app.ts` (sin
  cliente, toda lectura es `failed`, P15-9) e `index.ts` construyendo siempre el cliente. En
  `controllers/steam.ts`, perfil y Leetify en paralelo tras la confirmación (P15-5) y `notice`
  si Leetify falló. En `services/verifyAccount.ts`, `VerifyInput.premier` y el estado de
  `verifiedPremier` para Steam (descarta el rango simulado). RF-1, RF-2, RF-3, RF-15, RF-22.
  - Hecho cuando: `tests/controllers/steamLeetify.test.ts` (nuevo) cubre rated, unrated,
    failed (con `notice`), perfil de Steam caído con Leetify bien (D20), historial simulado
    descartado y 409 de otro usuario sin escritura; las pruebas de la 013 que esperaban rango
    simulado se actualizan citando RF-3 y P15-9; toda la suite de Steam (`steam*.test.ts`,
    `verifyAccount.test.ts`) en verde.

- [x] **T5. Resincronizar CS2.** `services/accountLock.ts` (bloqueo por cuenta en memoria, uno
  por `createApp`) y `services/cs2Sync.ts` con el algoritmo de §4.2 (bloqueo → espera → Steam →
  Leetify solo si Steam respondió → una escritura → 200 con `syncNotice` si Leetify falló). En
  `controllers/accounts.ts`, las cuentas de Steam con `steamIntegration` delegan en
  `syncSteamAccount`; sin ella, el camino genérico de la 012 sin cambios. RF-1, RF-9, RF-11,
  RF-16, RF-17, RF-18, RF-19, RF-22, RNF-4, RNF-7.
  - Hecho cuando: `tests/controllers/cs2Resync.test.ts` (nuevo) cubre los casos de §7 del plan
    (punto nuevo, mismo rating sin punto, rated → unrated conserva historial, Leetify cae → 200
    con `syncNotice` y espera corriendo, Steam cae → 503 sin llamar a Leetify, dos peticiones
    simultáneas → una 200 y una 429, plazos con tiempos inyectados, cuenta sin verificar sin
    Leetify); `steamResync.test.ts` y `accountRealSync.test.ts` siguen en verde.

- [x] **T6. Coincidencias sin rango Premier.** En `services/matchInputs.ts`, variante
  `noPremier` para la cuenta propia de CS2 y filtro de candidatas por `premier`; en
  `controllers/matches.ts`, 409 con los dos textos de RF-10 (`LEETIFY_ERRORS`). RF-7, RF-8,
  RF-10, RF-18.
  - Hecho cuando: `matchInputs.test.ts` y `matches.test.ts` (amplían) cubren propia unrated → 409
    texto 1, unavailable → 409 texto 2, candidatas sin rating excluidas, rated tras un fallo
    incluida y CS2 sin verificar sin cambios; la suite completa del backend, typecheck y lint en
    verde.

- [x] **T7. Frontend: tipos, reglas de presentación y etiqueta enlazada.** `domain/types.ts`
  (`Origin` con `'leetify'`, `premierStatus`, `notice` de la vuelta de Steam),
  `domain/origins.ts` («Datos de Leetify»), `domain/premierDisplay.ts` (nuevo, §3 del plan),
  `OriginTag` con `href` opcional (pestaña nueva, `rel="noopener noreferrer"`) y
  `LEETIFY_PRIVACY_TEXT` en `shared/utils/copy.ts`; `httpApi.ts` pasa `notice`. RF-4, RF-6,
  RF-12, RF-21, RF-23.
  - Hecho cuando: `npm run typecheck`, `lint` y `build` del frontend en verde y
    `grep -rn "leetify" frontend/src/services/mock` no devuelve nada (RF-23).

- [x] **T8. Frontend: perfil, Configuración y vuelta de Steam.** `AccountRow`,
  `GameSummaryPanel` y `SettingsPage` muestran el rating, «sin rango Premier» o «rango no
  disponible», la etiqueta enlazada y el historial según `rankHistoryView` (texto con 0 puntos,
  un punto con su fecha); nota de RF-21 bajo `SteamVerifyButton`; `SteamNotice.extra` en
  `notice.ts`, `SteamReturnPage` y `ProfilePage` (segundo aviso de RF-15). El aviso de RF-16
  llega por `syncNotice`. RF-4, RF-6, RF-7, RF-8, RF-12, RF-13, RF-15, RF-16, RF-21.
  - Hecho cuando: typecheck, lint y build del frontend en verde, y en el modo simulado
    (`VITE_USE_MOCK_API=true`) el perfil de la cuenta demo no muestra ninguna etiqueta de
    Leetify (RF-23).

- [x] **T9. Frontend: ficha de jugador y coincidencias.** `domain/playerSheet.ts` y
  `RankDistanceBlock` (enlace con el `handle` y texto de estado sin rating), `MatchEntry`
  (enlace en la etiqueta de rango del candidato), `MatchesPage` y `MatchFiltersPanel` (con el
  409 de CS2: aviso, enlace «Ir a tu perfil» y filtros `disabled`). RF-6, RF-7, RF-8, RF-10.
  - Hecho cuando: typecheck, lint y build del frontend en verde y el comportamiento de LoL con
    su 409 de la 014 no cambia (revisión del diff de `MatchesPage.tsx`).

- [x] **T10. Documentos y comprobación completa.** `AGENTS.md` (archivos nuevos y
  `LEETIFY_API_KEY`), `README.md` (variable opcional), `PRODUCT.md` («Evidence on Hand» y
  «Capabilities»), `MEMORY.md` y `specs/015-rango-premier/validation.md` con lo ejecutado y lo
  pendiente (navegador a 1280 y 375 px, dos recorridos manuales, términos de Leetify). Todos.
  - Hecho cuando: `npm test`, `typecheck` y `lint` del backend y `typecheck`, `lint` y `build`
    del frontend en verde (salvo las salvedades de entorno ya registradas en la 014), sin `.only`,
    sin `any`, sin dependencias nuevas en los `package.json`, y la clave de Leetify no aparece en
    el repositorio (`grep -rn "_leetify_key" backend/src` solo en `leetifyClient.ts`).

## Cambio de requisitos D26 a D30 (plan, §12)
T1 a T10 siguen hechas. Estas tareas modifican partes de lo que ya está, en este orden.

- [x] **T11. Dominio sin historial.** RF-9, RF-11, D27.
  - Qué se hace (plan, §12.2):
    - `verifiedPremier` y `applyLeetifyReading` en `backend/src/domain/leetify.ts` dejan
      `rankHistory: []` en todos los casos;
    - con `unrated`, el rating se borra;
    - con `failed`, nada cambia (RF-18).
  - Pruebas: se actualizan primero, y se ven en rojo por la razón correcta, las de
    `tests/unit/leetify.test.ts` (tabla de §1 nueva), `tests/controllers/steamLeetify.test.ts` y
    `tests/controllers/cs2Resync.test.ts` que esperaban puntos o el historial conservado. Las
    pruebas retiradas o cambiadas citan D27.
  - Hecho cuando:
    - esos tres archivos pasan con `--test-concurrency=1`;
    - ninguna prueba de la 015 espera un historial no vacío en CS2 verificado;
    - typecheck y lint siguen como antes (la única salvedad es `ui.test.ts`).

- [x] **T12. Migración del historial y `premierStatus` de Steam sin `premier`.** RF-8, RF-24.
  - Qué se hace (plan, §4.4 y §12.2):
    - la segunda `updateMany` en `migrateAccounts` (`backend/src/server.ts`);
    - en `toGameAccountJson` (`backend/src/models/gameAccount.ts`), `premierStatus:
      "unavailable"` también para CS2 verificada con Steam sin `premier`.
  - Pruebas: primero, en rojo, `tests/server/migration.test.ts`:
    - Steam `rated` y `unrated` con historial → `[]` y el resto igual;
    - sin verificar y Riot intactas;
    - segunda pasada sin cambios;
    - las dos migraciones juntas.

    También `tests/unit/gameAccountModel.test.ts`: Steam sin `premier` → `premierStatus:
    "unavailable"`.
  - Hecho cuando: los dos archivos pasan y `matchInputs.test.ts` y `matches.test.ts` siguen en
    verde.

- [x] **T13. Bloqueo de la resincronización y prueba de D28.** RF-19, RNF-7.
  - Qué se hace (plan, §12.2, P15-13): en `backend/src/services/cs2Sync.ts`, el id se pasa a
    minúsculas y el bloqueo se toma después de comprobar que la cuenta existe y es del usuario.
  - Pruebas: primero, en rojo donde cambia el comportamiento, en `tests/controllers/cs2Resync.test.ts`:
    - un ajeno recibe 403 con otra resincronización en curso;
    - el mismo id en mayúsculas y en minúsculas comparte el bloqueo;
    - D28: verificada sin perfil de Steam, la resincronización inmediata lee Leetify y la
      siguiente da 429, con dos lecturas en total según el contador del cliente falso.
  - Hecho cuando: `cs2Resync.test.ts`, `steamResync.test.ts` y `accountRealSync.test.ts` pasan,
    junto con toda la suite del backend (salvo `ui.test.ts`), typecheck y lint.

- [x] **T14. Atribución con el logo de Leetify.** RF-6, RF-18, RF-23, RNF-5, RNF-8.
  - Qué se hace (plan, §12.3, P15-11):
    - se copian sin modificar `~/Desktop/leetify/Leetify Badge White Small.png` y `… Black
      Small.png` a `frontend/src/assets/leetify/leetify-badge-white.png` y `-black.png`;
    - `shared/components/LeetifyAttribution.tsx`, nuevo: el logo enlazado a
      `https://leetify.com/` y «View on Leetify» enlazado al perfil, en negrita y subrayado,
      ambos en pestaña nueva con `rel="noopener noreferrer"`; el tema lo elige CSS;
    - en `premierDisplay.ts`, `LEETIFY_HOME_URL` e `isLeetifyRank`, y fuera `originHref`;
    - el componente reemplaza `OriginTag … href` en `AccountRow`, `GameSummaryPanel`,
      `RankDistanceBlock` y `MatchEntry`;
    - `OriginTag` pierde la prop `href`.
  - Hecho cuando:
    - `typecheck`, `lint` y `build` del frontend pasan;
    - `cmp` confirma que los PNG copiados son idénticos a los originales;
    - `grep -rn "Datos de Leetify\|originHref" frontend/src` solo encuentra el `aria-label` de
      `origins.ts`;
    - `grep -rni leetify frontend/src/services/mock` sale vacío (RF-23).

- [x] **T15. Historial de CS2 verificado en la interfaz.** RF-12, D27, D30.
  - Qué se hace (plan, §4.6 y §12.3): con rango de Leetify, `GameSummaryPanel` muestra el texto
    `LEETIFY_NO_HISTORY_TEXT`, pasa `history={[]}` a `RankScale` y ya no pinta «Último rango
    registrado» ni «Primera lectura · fecha». De `premierDisplay.ts` salen `rankHistoryView`,
    `RankHistoryView`, `EMPTY_RANK_HISTORY_TEXT` y `LAST_KNOWN_RANK_LABEL`. La escala y la
    distancia de la ficha y de Coincidencias no cambian (D30).
  - Hecho cuando:
    - `typecheck`, `lint` y `build` del frontend pasan;
    - `grep -rn "rankHistoryView\|LAST_KNOWN_RANK_LABEL\|EMPTY_RANK_HISTORY_TEXT" frontend/src`
      sale vacío;
    - el resumen de una cuenta que no es de Leetify (LoL o CS2 sin verificar) queda igual
      (revisión del diff).

- [x] **T16. Cierre del cambio.** Todos.
  - Qué se hace:
    - `backend/requests/leetify.rest`, confirmado por el usuario el 2026-11-19 (plan, §12.2),
      con la clave como variable y nunca escrita;
    - `AGENTS.md` (`LeetifyAttribution`, logos);
    - `PRODUCT.md` (sin historial real, atribución con el logo);
    - `README.md`, si menciona el historial;
    - `MEMORY.md`;
    - `specs/015-rango-premier/validation.md`, con lo ejecutado y lo pendiente: navegador a
      1280 y 375 px en los dos temas, y recorridos manuales.
  - Hecho cuando:
    - `npm test`, `typecheck` y `lint` del backend, y `typecheck`, `lint` y `build` del
      frontend, pasan (con la única salvedad de `ui.test.ts`);
    - no hay `.only`, `any` ni dependencias nuevas;
    - `_leetify_key` solo aparece en `leetifyClient.ts`;
    - la clave no aparece en `leetify.rest`.

## Cambio D31 y D32 (plan §13, aprobado el 2026-11-19)
Solo frontend (sin pruebas, principio 4): cada tarea se cierra con `typecheck`, `lint` y `build`
del frontend en verde. El backend no cambia.

- [x] **T17. Regla de RF-25 en el dominio y en la ficha de jugador.** RF-25, D31.
  - Qué se hace (plan, §13.2 y §13.3):
    - `premierDisplay.ts`: `showsRankDistance(ownOrigin, otherOrigin)` (false si alguno es
      `leetify`) y `LEETIFY_HIDDEN_DISTANCE_TEXT = 'la distancia no se muestra con rangos de
      Leetify'`;
    - `playerSheet.ts`: `myAccounts` tipa `origins: { rank: Origin }`; caso nuevo
      `{ kind: 'leetifyHidden'; origin; handle }` cuando las dos cuentas tienen normalizado y
      `showsRankDistance` da false (después de `noData` y `noPremier`, que no cambian);
    - `RankDistanceBlock.tsx`: el caso nuevo pinta el texto y, si el rango del jugador es de
      Leetify, `LeetifyAttribution`; si no, `OriginTag` de su origen.
  - Hecho cuando: `typecheck`, `lint` y `build` del frontend pasan; el caso `value` solo se
    produce si `showsRankDistance` da true (revisión del diff).

- [x] **T18. Coincidencias sin «Δ» con Leetify.** RF-25, D31, D32.
  - Qué se hace (plan, §13.3): `MatchesPage` pasa `ownRankOrigin` (el `origins.rank` de la cuenta
    propia del juego activo) a cada `MatchEntry`; `MatchEntry` pinta `rankDistanceText` solo si
    `showsRankDistance(ownRankOrigin, candidate.account.origins.rank)`. Rango, atribución, puntaje
    de afinidad (R8) y `MatchFiltersPanel` (D32) no cambian.
  - Hecho cuando: `typecheck`, `lint` y `build` del frontend pasan; `MatchFiltersPanel.tsx` sin
    cambios en el diff.

- [x] **T19. Resumen de CS2 verificado sin escala.** RF-12, D31.
  - Qué se hace (plan, §13.3): en `GameSummaryPanel`, con rango de Leetify, la sección de la
    escala contiene solo `LEETIFY_NO_HISTORY_TEXT`: sin la etiqueta «Posición en la escala del
    juego», sin `LeetifyAttribution`, sin `RankScale` y sin el texto de estado (ya están en
    `AccountRow`).
  - Hecho cuando: `typecheck`, `lint` y `build` del frontend pasan; `RankScale` solo se monta en
    la rama que no es de Leetify y la de LoL y CS2 sin verificar queda igual (revisión del
    diff).

- [x] **T20. Cierre del cambio.** Todos.
  - Qué se hace: `PRODUCT.md` (sin escala ni distancia con rangos de Leetify), `AGENTS.md` solo si
    describe la escala de CS2 verificado, `MEMORY.md` y `validation.md` (§3.5 y lo ejecutado).
  - Hecho cuando: `npm test`, `typecheck` y `lint` del backend, y `typecheck`, `lint` y `build`
    del frontend, pasan (salvo `ui.test.ts`); sin `.only`, `any` ni dependencias nuevas;
    `grep -rni leetify frontend/src/services/mock` vacío.

## Cambio D33 y D34 (plan §14, aprobado el 2026-11-19)
Solo frontend (sin pruebas, principio 4).

- [x] **T21. Puntaje de afinidad sin Leetify, logo legible y rama muerta.** RF-26, RNF-8, D33, D34.
  - Qué se hace (plan §14.2 y §14.3):
    - `premierDisplay.ts`: `scoreOriginLabel(ownOrigin, otherOrigin): Origin | null` (nunca
      `leetify`; `simulated` si alguno lo es; `null` si los dos son `leetify`);
    - `MatchEntry.tsx`: `ScoreRing` recibe ese valor y con `null` no pinta `OriginTag`;
    - `global.css`: `.leetify-attribution__logo` a 24 px (sin superar la marca de la cabecera);
    - `RankDistanceBlock.tsx`: quitar la rama inalcanzable de `LeetifyAttribution` en `value`.
  - Hecho cuando: `typecheck`, `lint` y `build` del frontend pasan; ningún `OriginTag` puede
    recibir `leetify` (revisión del diff y `grep`).

- [x] **T22. Revalidación y documentos.** Todos.
  - Qué se hace: el `reviewer` revalida RF-26 y RNF-8 en el navegador (plan §14.4, entorno de
    `validation.md` §3.7) y confirma que el resto no cambió; se anota en `validation.md` §3.8, se
    corrige en 3.7 el estado del defecto 1, se marca el paso 3 de la guía y se actualiza
    `MEMORY.md`.
  - Hecho cuando: el `reviewer` da APROBADO; backend `npm test`/`typecheck`/`lint` y frontend
    `typecheck`/`lint`/`build` siguen como antes (salvo `ui.test.ts`).
