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
| T8 a T12 | Frontend, validación en navegador y cierre | pendientes |

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
