# Validación 020 — Partidas de todos los modos en la ficha de LoL

Registro de la implementación, tarea por tarea (`tasks.md`). Cada tarea con pruebas anota el rojo (con su motivo) y el
verde.

Entorno: Windows 10, Git Bash. Backend: `NODE_ENV=test node --test` (el script `npm test` usa la sintaxis de `sh` y no
corre en `cmd`; se lanza el mismo comando a mano). Línea base del backend antes de empezar (2026-11-22): **2980 pruebas,
2979 pasan, 1 omitida, 0 fallan** (382 s).

## Índice

| Tarea | Resumen | Estado |
|---|---|---|
| T1 | Reglas del modo de partida | hecha |
| T2 | El parser de Riot acepta todos los modos | hecha |
| T3 | Pedir las partidas de cualquier modo, con las mismas consultas | hecha |
| T4 | La variación de LP y la «partida nueva» cuentan solo Solo/Dúo | hecha |
| T5 | Guardar el modo de cada partida | hecha |
| T6 | Porcentaje de victorias solo de Solo/Dúo | hecha |
| T7 | El resumen por juego entrega las partidas con su modo | hecha |
| T8 | Reglas de las pestañas de partidas | hecha |
| T9 | Pestañas genéricas con píldora | hecha |
| T10 | La ficha enseña las partidas por modo | hecha |
| T11 | Validación en el navegador con modos mezclados | hecha |
| T12 | Cierre de la spec | hecha |

## T1. Reglas del modo de partida

- **Rojo** (`tests/unit/matchMode.test.ts` con `domain/matchMode.ts` en firmas «T1: sin implementar»): 19 pruebas,
  1 pasa (`MATCH_MODES`) y **18 fallan** con `Error: T1: sin implementar`.
- **Verde:** `matchMode.test.ts` y `domainIsolation.test.ts`: 22 pruebas, 22 pasan; `npm run typecheck` y
  `npm run lint` sin errores.
- Archivos: `backend/src/domain/matchMode.ts`, `backend/tests/unit/matchMode.test.ts`.

## T2. El parser de Riot acepta todos los modos

- **Rojo** (`tests/unit/riotData.test.ts`, sin tocar el código): 24 pruebas, 20 pasan y **4 fallan** por la razón correcta:
  la partida válida no trae `mode`, las colas 440, 450, 400, 1700… se rechazan como inválidas, y «sin cola» y «anuladas en
  otros modos» tampoco dan el resultado esperado. La prueba de la cola no numérica pasa ya en rojo (la regla vieja también
  la rechazaba) y queda como guarda.
- **Verde:** `riotData.test.ts` y `riotLpDelta.test.ts`: 40 de 40; las 1549 pruebas de `tests/unit/` pasan; los 4 archivos
  de `tests/controllers/` de Riot (`riotConfirm`, `riotSyncAndMatches`, `accountRealSync`, `verifyAccount`, con
  `--test-concurrency=1`): 99 de 99; `npm run typecheck` y `npm run lint` sin errores.
- Cambios de pruebas: la expectativa de partida válida y la de `getMatchById` ganan `mode: "solo"`; las fábricas de
  partidas de `riotLpDelta`, `riotConfirm` y `riotSyncAndMatches` ganan `mode: "solo"`; la prueba que daba por inválida la
  cola 440 ya no la lista (ahora es una partida válida de modo `flex`).
- Código: `RiotMatchRecord.mode` obligatorio y `parseRiotMatch` según plan §3.2. Para que compile el campo obligatorio
  se hizo también lo mínimo de dos tareas posteriores, que **sus pruebas cubren en T4 y T5**: `stripRankDelta` conserva
  el modo y `toStoredRiotMatch` lo lee con `storedMode` (con `mode?` en el tipo `MatchRecordFields`; el esquema de Mongoose
  se toca en T5). `RIOT_SOLO_QUEUE_ID` sigue exportada hasta T3.

## T3. Pedir las partidas de cualquier modo, con las mismas consultas

- **Rojo** (`tests/unit/riotClient.test.ts` con `getRecentMatchIds` y la comprobación «sin parámetro `queue`»): 15 pruebas,
  9 pasan y **6 fallan** con `TypeError: client.getRecentMatchIds is not a function`.
- **Verde:** las 1549 pruebas de `tests/unit/` pasan; los controladores de Riot (`tests/controllers/riot*.test.ts`,
  `accountRealSync`, `verifyAccount`, `accountVerification`, con `--test-concurrency=1`): 144 de 144; `typecheck` y `lint`
  sin errores. Las pruebas de reserva de consultas (24 al confirmar y al resincronizar, 35 como máximo) siguen en verde sin
  cambiar sus valores (RNF-1).
- Cambios: `getSoloMatchIds` → `getRecentMatchIds` (interfaz y cliente en `riotClient.ts`, las dos llamadas de
  `riotSync.ts` y el cliente simulado `riotHelpers.ts`, cuyos campos de estado pasan de `soloMatchIds` a `recentMatchIds` en
  las tres suites que los usan); `SOLO_MATCH_IDS_COUNT` → `MATCH_IDS_COUNT`; `RIOT_SOLO_QUEUE_ID` eliminada
  (`grep` no encuentra ninguna referencia en `backend/`); comentarios que decían «Solo/Dúo» al día.
- El cliente simulado ya servía partidas de cualquier modo: sus partidas son `RiotMatchRecord` completos, con su `mode`.

## T4. La variación de LP y la «partida nueva» cuentan solo Solo/Dúo

- **Rojo** (`tests/unit/riotLpDelta.test.ts`, 10 pruebas nuevas al final del archivo, sin tocar el código): 26 pruebas,
  20 pasan y **6 fallan** por la razón correcta: con otras partidas nuevas al lado, la de Solo/Dúo no recibía la variación o
  la recibía una de ARAM/Flex; la línea base guardaba también ids de otros modos; una partida de ARAM guardada antes contaba
  como nueva. Las 4 que ya pasaban son guardas de lo que no debe cambiar (dos de Solo/Dúo nuevas, omitida, fusión con modo,
  modo conservado).
- **Verde:** `riotLpDelta.test.ts` 26 de 26; las 1559 pruebas de `tests/unit/`; los controladores de Riot con
  `--test-concurrency=1` (136 de 136, las que ya existían de `riot*`, `accountRealSync` y `verifyAccount`); `typecheck` y `lint`
  sin errores. Las pruebas de la spec 014 (RF-30, D37, D78, D81, D102) pasan sin cambiar sus expectativas.
- Código: `applyRiotReading` filtra las partidas de modo `solo` para la «partida nueva» y para los ids de la línea base
  (plan §3.3); `stripRankDelta` ya conservaba el modo desde T2 (esta tarea lo prueba).

## T5. Guardar el modo de cada partida

- **Rojo:** `tests/unit/gameAccountModel.test.ts` (4 pruebas nuevas): 47 pruebas, 45 pasan y **2 fallan** (los cinco modos
  no se conservan porque el esquema estricto los descarta; otro valor no se rechaza). `tests/controllers/riotSyncAndMatches.test.ts`
  (2 pruebas nuevas, con MongoDB): **fallan las 2**; la de la verificación con `matchId → modo` esperado (`other`, `aram`, `solo`)
  y recibido `undefined`. La segunda prueba falló primero por un error de mi preparación (`matches.$[]` y `matches.0` en el
  mismo `updateOne` entran en conflicto en MongoDB); se partió en dos `updateOne` y, para comprobar que no es una prueba
  vacía, se **desactivó a propósito el campo `mode` del esquema** y las dos fallaron de nuevo; después se restauró el archivo.
- **Verde:** `gameAccountModel.test.ts` 47 de 47; `riotSyncAndMatches.test.ts` 20 de 20; las 1563 pruebas de `tests/unit/`;
  los controladores de Riot, `accountRealSync`, `verifyAccount`, `accountVerification` y `gameSummary` (con
  `--test-concurrency=1`): 170 de 170; `typecheck` y `lint` sin errores.
- Código: `MatchRecordSchema.mode` (`enum: MATCH_MODES`, opcional, **sin valor por defecto**); las dos copias de
  `toRiotMatchRecord` (`riotSync.ts` y `verifyAccount.ts`) escriben el modo; `toStoredRiotMatch` lo lee con `storedMode`
  (hecho en T2). Una verificación nueva y una resincronización guardan el modo; las partidas guardadas sin modo se
  reescriben como `solo` al resincronizar y conservan su variación.

## T6. Porcentaje de victorias solo de Solo/Dúo

- **Rojo** (`tests/unit/accountState.test.ts`, 8 pruebas nuevas, con `soloWinRate` en firma «T6: sin implementar»): 48
  pruebas, 40 pasan y **8 fallan** con `Error: T6: sin implementar`.
- **Verde:** las 1571 pruebas de `tests/unit/` (las de `winRate` y `recentMatches` de la spec 004 intactas); `typecheck` y
  `lint` sin errores.
- Casos: 5 de 8 → 63; 0 de 8 → 0 y 8 de 8 → 100; sin Solo/Dúo → `null` (también con solo ARAM, Flex y otros); los otros
  modos no cuentan ni ganadas ni perdidas; con más de 8 de Solo/Dúo cuentan las 8 primeras (3 de 8 → 38); las 8 se toman
  entre las de Solo/Dúo y no entre las 8 primeras de cualquier modo; una partida sin modo no es Solo/Dúo aquí (el servidor
  la marca antes con `storedMode`, T7); no muta la entrada.
- Código: `AccountMatch.mode?` opcional y `soloWinRate` (reutiliza `winRate`).

## T7. El resumen por juego entrega las partidas con su modo

- **Rojo** (`tests/controllers/riotSyncAndMatches.test.ts`, 6 pruebas nuevas, con MongoDB y el cliente de Riot simulado):
  26 pruebas, 22 pasan y **4 fallan** por la razón correcta (`8 !== 20`: el resumen solo entregaba 8 partidas y sin
  `mode`; `winRate` salía 0 y no `null`; las guardadas sin modo no salían como `solo`). Las 2 que ya pasaban son guardas de
  lo que no debe cambiar: la cuenta de LoL simulada, la de CS2 y la de R6 (sin `mode`, `winRate` numérico, ≤ 8 partidas) y
  el recuento de consultas (RNF-1). Un primer fallo de la prueba de claves fue un error mío (el orden de las claves del
  JSON es `account`, `recentMatches`, `winRate`, `trend`); se compara ordenado, como en `gameSummary.test.ts`.
- **Verde:** `riotSyncAndMatches.test.ts` 26 de 26; **suite completa del backend: 3033 pruebas, 3032 pasan, 1 omitida, 0
  fallan** (382 s; la línea base era 2980: son 53 pruebas nuevas); `npm run typecheck` y `npm run lint` sin errores; ningún
  `.only` (`grep` de `test|describe|it.only` vacío).
- Casos cubiertos: 20 partidas de modos mezclados → las 20 con su `mode`, de la más reciente a la más antigua, claves solo
  `id`, `gameId`, `playedAt`, `result`, `summary`, `durationMinutes`, `mode` (sin identificadores internos de Riot: RNF-5) y
  `winRate` 50 (4 de las 8 últimas de Solo/Dúo, con las de otros modos ganadas para comprobar que no cuentan); solo ARAM y
  Flex → `winRate: null` y el rango sigue; cuenta sin partidas → `winRate: null` y lista vacía; guardadas sin modo → `solo`
  y cuentan (2 de 3 → 67); cuentas simuladas, CS2 y R6 sin `mode`; resincronización con 20 partidas mezcladas → 24
  consultas, con **una** sola consulta de la lista (RNF-1). La verificación (confirmar el desafío) comparte la lectura y
  las pruebas de reserva de 24 y 35 consultas de la spec 014 siguen en verde sin cambiar sus valores.
- Código: `gameSummaryJson` en `controllers/users.ts` según plan §3.4 y §5 (`hasMatchModes`, `storedMode`, `soloWinRate`).
- **Punto de control A (backend completo, T1 a T7).** El frontend (T8 a T12) no se ha tocado: `git status` solo muestra
  cambios en `backend/` y en `specs/020…`.

## T8. Reglas de las pestañas de partidas

Antes de empezar se integró la spec 019 de un compañero (partidas de CS2 desde Leetify), que también toca el frontend; se
releyeron `GameSummaryPanel`, `apiContract.ts`, `types.ts` y `mockApi.ts` tal como quedaron. Línea base del frontend con la
019: **217 pruebas** (las 214 de la 017 más 3 de la 019).

- **Rojo** (`src/domain/matchModes.test.ts`, 23 pruebas, con `domain/matchModes.ts` en firmas «T8: sin implementar»): 21
  fallan con `Error: T8: sin implementar` y 2 pasan (las constantes `MATCH_MODE_ORDER` y `MATCHES_PER_TAB`).
- **Verde:** `npm test`: **240 pruebas, 240 pasan** (217 + 23); `npm run typecheck`, `npm run lint` y `npm run build`
  sin errores.
- Casos: `showModeTabs` (Riot con partidas sí; simulado, Steam y Leetify no; sin partidas no), `modeOf` (sin modo →
  `solo`), `availableTabs` (lista vacía → solo «Todas»; 1, 3 y 5 modos en el orden fijo; sin pestañas de modos sin
  partidas), `matchesForTab` (8 como máximo en «Todas» y por modo; menos de 8 saltándose otros modos; orden recibido; sin
  mutar) y `resolveTab` (pestaña que desaparece → `all`).
- Tipos: `MatchMode` y `MatchRecord.mode?` en `domain/types.ts`; `GameProfileSummary.winRate?: number | null` (el `?` es de
  la 019) y la nota de `recentMatches` en `apiContract.ts`. El mock no se toca: sigue sin datos de Riot ni modos.
- `git status --short backend/`: sin cambios de esta tarea.

## T9. Pestañas genéricas con píldora

- Sin pruebas propias (es presentación; el frontend solo exige build, typecheck y lint, y no hay entorno DOM en Vitest). Su
  comportamiento se comprueba en el navegador en T11.
- **Verde:** `npm test` 240 de 240 (incluida la comprobación de que no hay colores escritos a mano en el tema);
  `npm run typecheck`, `npm run lint` y `npm run build` sin errores. `git diff` de `GameTabs.tsx`: vacío.
- `shared/components/PillTabs.tsx`: genérico en el valor (`PillTab<T>`), sobre el `Tabs` de la librería con el patrón de
  `GameTabs` (una parada de Tab, flechas, Inicio y Fin que también eligen, un solo panel con `tabIndex` 0, píldora con
  resorte y `layoutId` por instancia, `var(--volt)` y texto `--tab-ink`). Se omitió el parámetro `idBase` que el plan
  nombraba: la librería genera sola los identificadores de pestaña y panel (`aria-controls` / `aria-labelledby`), y esos
  identificadores solo los fija `GameTabs` por la spec 008.
- `theme/components/tabs.css`: modificador `tmu-tabs__list--compact` (34 px de alto, relleno `--s3`, separación `--s3`),
  solo con tokens. `copy.ts`: `MATCH_MODE_TABS_LABEL` («Modo de partida») y `MATCH_MODE_LABELS` (Todas, Solo/Dúo, Flex,
  Normales, ARAM, Otros).
- El componente todavía no se usa (lo hace T10).

## T10. La ficha enseña las partidas por modo

- Sin pruebas propias (presentación; las reglas ya están probadas en T8). Se comprueba en el navegador en T11.
- **Verde:** `npm test` 240 de 240; `npm run typecheck`, `npm run lint` y `npm run build` sin errores.
- `features/profile/components/ModeMatchLedger.tsx` (nuevo): estado de la pestaña elegida (inicio «Todas»), corrección al
  pintar si el modo elegido desaparece (`resolveTab`), `PillTabs` con las disponibles y `MatchLedger` con
  `matchesForTab` (hasta 8) y `showMode` solo en «Todas».
- `MatchLedger.tsx`: prop `showMode`; en «Todas» la línea secundaria de cada fila acaba con ` · <modo>`; el resto de la fila
  y la etiqueta de origen no cambian.
- `GameSummaryPanel.tsx`: con el bloque de partidas no pendiente y `showModeTabs(origen, partidas)` pinta `ModeMatchLedger`
  con `key={summary.account.id}`; en cualquier otro caso (simuladas, CS2, R6, pendiente, 0 partidas) el `MatchLedger` de
  siempre, sin tocar, y la rama de Leetify de la spec 019 queda antes y sin cambios.
- El cambio de pestaña es estado local: no hay `useQuery`, `fetch` ni llamada a `api` en los tres archivos nuevos o tocados
  (comprobado leyendo el código).

## T11. Validación en el navegador con modos mezclados

- **Navegador:** Chrome 159.0.8154.13 (Windows 10), controlado con `playwright-core`. **Servidor real** (`node src/index.ts`,
  puerto 3001) con MongoDB y una **base desechable** (`tmu_spec020_validation`, borrada al terminar), y el frontend de
  desarrollo de Vite con su proxy (puerto 5173). No hay clave de Riot: el script registra dos usuarios por la API, vincula
  una cuenta de LoL, una de R6 y una de CS2 (simuladas) e **intercepta la respuesta de `GET /api/users/:id/games/lol`** para que
  declare `origins.matches = riot` y traiga las partidas con su `mode` (plan §5, D-P10). La resincronización de la cuenta se
  contesta también con una respuesta interceptada (la de una cuenta simulada tiene su espera mínima).
- **Script y resultados:** `evidence/modes.mjs` (uso en su cabecera), `evidence/modes/results.json` (las 89 comprobaciones con
  su detalle) y capturas en `evidence/modes/*.jpg` (1280 oscuro y claro, 375 y 360 en los dos temas).
- **Resultado:** **89 de 89 comprobaciones pasan.** La primera ejecución dio 8 fallos, **todos del script y no de la
  aplicación**: una cuenta mal hecha de las partidas de Flex del escenario (2, no 3), el texto «Rango vigente» que el CSS pone
  en mayúsculas, el contador del porcentaje leído a mitad de la animación (65 en vez de 67) y la relectura del resumen, que no
  se provoca al volver a la ventana (`refetchOnWindowFocus: false`) sino con «Resincronizar»; el cuerpo de datos corregido,
  se volvió a ejecutar todo desde el principio.

| RF / RNF | Comprobación en el navegador | Resultado |
|---|---|---|
| RF-5 | Con 20 partidas mezcladas: Todas, Solo/Dúo, Flex, Normales, ARAM, Otros, en ese orden, en oscuro y claro; sin Solo/Dúo solo Todas, Flex, ARAM; con un solo modo, Todas y Solo/Dúo | pasa |
| RF-6 | Al abrir la ficha, «Todas» elegida; ARAM elegida → CS2 → LoL vuelve a «Todas» | pasa |
| RF-7 | «Todas» enseña 8 aunque haya 20; Solo/Dúo 8 (hay 10); Flex 2, Normales 2, ARAM 4, Otros 2 (todas las suyas) | pasa |
| RF-8 | En «Todas» las 8 filas dicen su modo (`22/11/2026 · 25 min · Solo/Dúo`); en las demás pestañas ninguna fila lo repite | pasa |
| RF-9 | Recorrer las cinco pestañas de modo, en los dos temas, no hizo ninguna petición `/api/` (contadas con el evento `request`) | pasa |
| RF-10 | ARAM elegida; el resumen se relee sin partidas de ARAM: la pestaña desaparece y la elegida vuelve a «Todas» | pasa |
| RF-11 | → y ← con cambio de pestaña y circulares; Inicio y Fin eligen primera y última; una sola parada de Tab (`tabindex` 0 en la elegida, −1 en las demás); `aria-controls` / `aria-labelledby` y rol `tabpanel`; Tab lleva al panel con contorno de 2 px y Mayús+Tab vuelve a la pestaña, que también tiene foco visible | pasa |
| RF-12 | El % de victorias no cambia al cambiar de pestaña (50); sin Solo/Dúo dice «Sin datos» y el rango sigue; con un solo modo, 67 | pasa |
| RF-16 | LoL simulada, R6 y CS2: sin pestañas de modo, entre 1 y 8 filas, ninguna con modo | pasa |
| RF-17 | Resumen sin partidas: sin pestañas y con «Todavía no hay partidas registradas en esta cuenta» | pasa |
| RF-18 | «Datos de Riot Games» junto al bloque de partidas | pasa |
| RNF-3 | A 375 y 360 px, en los dos temas: la página no se desplaza en horizontal (0 px), la lista de pestañas no sale de la ficha (se desplaza por dentro: 414 px de contenido en 276 a 291 px), Fin deja «Otros» a la vista y las filas caben | pasa |
| (ficha de otro jugador) | `/jugadores/:id` de otro usuario: mismas seis pestañas y el mismo cálculo; Flex enseña 2 y el % es 50 | pasa |

- **Observaciones, no defectos:** (1) A 360 px el modo se añade a la línea secundaria de la fila y esta pasa a tres líneas
  (`22/11/2026 · 25 min ·` / `Solo/Dúo`); la spec no pide que quepa en una línea. (2) Al interceptar solo el origen de las
  partidas, el rango y la cabecera de la cuenta siguen diciendo «Datos de demostración»: es un efecto de la interceptación, no de
  la aplicación (una cuenta verificada con Riot lo trae todo de Riot).
- **No comprobado:** (a) con una **clave real de Riot**: el formato real de `queueId` en Match-v5 y el comportamiento con una
  cuenta real (se asume el de la documentación; si no fuera un entero la partida se omitiría y la lectura quedaría incompleta,
  nunca con un modo inventado); (b) **lector de pantalla** (NVDA), que hace el usuario; (c) Firefox y Safari; (d) la
  ficha con el bloque de partidas **pendiente** (RF-17): el código lo trata antes de las pestañas (`!matchesPending`) y no se
  ejercitó en el navegador; (e) el orden de tabulación completo de la ficha frente a la medida en la 017: se añaden dos
  paradas (la pestaña de modo elegida y su panel), previsto en el plan §4.
- Limpieza: servidores parados y base `tmu_spec020_validation` borrada.

## T12. Cierre de la spec

- `AGENTS.md`: la línea de la spec 014 dice «partidas de cualquier modo (spec 020)»; `domain/` del backend añade `matchMode`;
  `domain/` del frontend nombra `matchModes`; los componentes compartidos añaden `PillTabs`.
- `MEMORY.md`: fila de la spec 020 en la tabla, «Última actualización» y «Próximo paso».
- `spec.md`: «implementada, pendiente de la revisión del usuario y del `reviewer`»; `plan.md` y `tasks.md` al día (T1 a T12 marcadas).
- **Comprobaciones finales** (ver la salida más abajo): backend completo, frontend completo, `graphify update .`.
- **Salida de las comprobaciones finales (2026-11-22):** backend completo (con la spec 019 de un compañero integrada):
  **3069 pruebas, 3068 pasan, 1 omitida, 0 fallan**, `typecheck` y `lint` sin errores; frontend: **240 pruebas, 240 pasan**,
  `typecheck`, `lint` y `build` sin errores; sin `.only`, `any` ni `@ts-ignore` en lo nuevo; `graphify update .` ejecutado.
  Nada de esta parte está commiteado: el backend (T1 a T7) va en `f964af7`, subido.
