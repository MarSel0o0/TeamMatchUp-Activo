# Tareas 020 — Partidas de todos los modos en la ficha de LoL
Estado: aprobado por el usuario (2026-11-22); implementadas las 12 tareas (2026-11-22); pendiente de la revisión del usuario

`spec.md` y `plan.md` aprobados el 2026-11-22. Salen **12 tareas**, más de las 10 que sugiere el flujo SDD. Propuesta:
**no dividir la spec**, porque es una sola rebanada vertical (el modo que se lee en el backend es lo que pintan las
pestañas) y las dos mitades no se pueden validar por separado. Si prefieres dividirla, el corte natural es
**020a = T1 a T7 (backend)** y **020b = T8 a T12 (frontend y cierre)**; el contrato del resumen (plan §5) es la frontera.

Reglas para todas las tareas:
- Una tarea cada vez, en este orden, citando sus RF/RNF y siguiendo `plan.md`. Al terminar una, se marca y se para.
- Con pruebas: primero las pruebas (y, si hace falta, el módulo con las firmas que lanzan `Tn: sin implementar`); la
  suite en **rojo por la razón correcta**; después el código; la suite en **verde**. Las dos salidas, con el motivo
  del rojo, van a `specs/020-partidas-de-todos-los-modos/validation.md` (una sección por tarea; la crea T1).
- «Verde en el backend» = en `backend/`, `npm test` (necesita MongoDB y `.env`), `npm run typecheck` y `npm run lint`
  sin errores; sin `.only`, `any` ni `@ts-ignore`.
- «Verde en el frontend» = en `frontend/`, `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` sin
  errores; la suite previa (214 pruebas) sigue en verde; sin `.only`, `any`, `@ts-ignore` ni colores escritos a mano.
- Las pruebas simulan Riot: ninguna usa red ni clave (RNF-2).
- No se editan las specs 004, 008 ni 014 (las correcciones son los RF de la 020).
- **Punto de control**: al terminar T7 (backend completo) se para y se pide la aprobación del usuario antes de seguir
  con el frontend. T12 cierra la spec.
- Sin marca = `implementer`; el recorrido de T11 lo puede hacer el `implementer` o el `reviewer` con un navegador real.

## Bloque A — Backend

- [x] **T1. Reglas del modo de partida.** RF-2, RF-3, RF-4, RF-5, RF-16, RNF-4
  - Crear `validation.md` con su índice (T1 a T12).
  - Pruebas primero en `tests/unit/matchMode.test.ts` y módulo `domain/matchMode.ts` con las firmas que lanzan «sin
    implementar»: `modeOfQueue` (420 → `solo`; 440 → `flex`; 400, 430, 490 → `normal`; 450 → `aram`; 1700, 900, 700, 0 y
    un número desconocido → `other`; `undefined` → `other`), `storedMode` (sin modo → `solo`) y `hasMatchModes` (verdadero
    solo con origen Riot). Después el código.
  - Hecho cuando: las pruebas pasan de rojo (por «sin implementar») a verde; `tests/unit/domainIsolation.test.ts` sigue
    en verde; typecheck y lint en verde.

- [x] **T2. El parser de Riot acepta todos los modos.** RF-1, RF-2, RF-4, RNF-4
  - Pruebas primero en `tests/unit/riotData.test.ts`: una partida de cada modo devuelve su `mode`; sin `queueId` →
    `other`; `queueId` no numérico o con decimales → inválida; una rendición temprana de menos de 5 minutos en ARAM →
    anulada; el caso «cola distinta de 420 es inválida» pasa a «es de su modo»; resto de casos actuales intactos.
  - Código: `RiotMatchRecord.mode` obligatorio, `parseRiotMatch` según plan §3.2 (usa `modeOfQueue`). Se añade `mode` a
    las fábricas de partidas de las pruebas existentes que construyen `RiotMatchRecord` (`riotLpDelta.test.ts` y las que
    falle el typecheck). `RIOT_SOLO_QUEUE_ID` se mantiene hasta T3.
  - Hecho cuando: las pruebas nuevas pasan de rojo (por la razón correcta) a verde; las fábricas actualizadas compilan;
    verde en el backend.

- [x] **T3. Pedir las partidas de cualquier modo, con las mismas consultas.** RF-1, RNF-1, RNF-2
  - Pruebas primero en `tests/unit/riotClient.test.ts`: la lista se pide con `getRecentMatchIds`, **sin** parámetro
    `queue`, con `start=0` y `count=20`.
  - Código: renombrar `getSoloMatchIds` → `getRecentMatchIds` en `riotClient.ts` (interfaz y cliente), `riotSync.ts` (las dos
    llamadas) y el cliente simulado `tests/controllers/riotHelpers.ts` (que pasa a poder servir partidas de varios modos);
    eliminar `RIOT_SOLO_QUEUE_ID` de `riotData.ts` y su uso en el cliente y en las pruebas; actualizar los comentarios que
    dicen «Solo/Dúo».
  - Hecho cuando: la prueba de la URL pasa de rojo a verde; las pruebas de reserva de consultas existentes (24 en
    confirmar y resincronizar, 35 como máximo) siguen en verde sin tocar sus valores; `grep` no encuentra
    `getSoloMatchIds` ni `RIOT_SOLO_QUEUE_ID` en `backend/`; verde en el backend.

- [x] **T4. La variación de LP y la «partida nueva» cuentan solo Solo/Dúo.** RF-13, RF-14, RF-15, RNF-4
  - Pruebas primero en `tests/unit/riotLpDelta.test.ts` (plan §7.1): una partida nueva de `solo` junto a otras nuevas de
    ARAM y Flex recibe la variación; solo partidas nuevas de otros modos → ninguna variación y la línea base se renueva;
    dos partidas nuevas de `solo` → ninguna variación; una partida omitida (de cualquier modo) → lectura incompleta y la
    línea base no cambia; las de otros modos nunca llevan `rankDelta`; el modo se conserva en la fusión; la línea base
    nueva guarda solo ids de `solo` y una antigua sigue sirviendo.
  - Código: `applyRiotReading`, `stripRankDelta` y `withRankDelta` según plan §3.3.
  - Hecho cuando: las pruebas nuevas pasan de rojo a verde y las de la spec 014 (RF-30, D37, D78, D81, D102) siguen en
    verde sin cambiar sus expectativas; verde en el backend.

- [x] **T5. Guardar el modo de cada partida.** RF-2, RF-3
  - Pruebas primero: `tests/unit/gameAccountModel.test.ts` (`mode` ausente válido; los cinco valores válidos; otro valor
    falla) y un caso de sincronización en `tests/controllers/riotSyncAndMatches.test.ts` (una cuenta con partidas guardadas
    **sin modo**, preparadas en la base, tras resincronizar tiene todas sus partidas con modo; las sin modo quedan `solo`
    con su variación intacta; las nuevas llevan su modo).
  - Código: `MatchRecordFields.mode?` y `MatchRecordSchema` sin valor por defecto; `toStoredRiotMatch` usa `storedMode`;
    las dos copias de `toRiotMatchRecord` (`riotSync.ts` y `verifyAccount.ts`) escriben el modo.
  - Hecho cuando: las pruebas pasan de rojo a verde; una verificación nueva (`verifyAccount`) también guarda el modo;
    verde en el backend.

- [x] **T6. Porcentaje de victorias solo de Solo/Dúo.** RF-12, RNF-4
  - Pruebas primero en `tests/unit/accountState.test.ts`: `soloWinRate` con 5 de 8 → 63; sin partidas `solo` → `null`;
    con más de 8 `solo`, cuentan solo las 8 primeras; los otros modos no cuentan; el orden recibido se respeta.
  - Código: `AccountMatch.mode?` opcional y `soloWinRate` (reutiliza `winRate`).
  - Hecho cuando: las pruebas pasan de rojo a verde; las pruebas de `winRate` y `recentMatches` de la spec 004 siguen en
    verde; verde en el backend.

- [x] **T7. El resumen por juego entrega las partidas con su modo.** RF-12, RF-16, RF-17, RNF-1, RNF-5
  - Pruebas primero (extremo a extremo, cliente de Riot simulado) en `tests/controllers/gameSummary.test.ts` y
    `riotSyncAndMatches.test.ts`: el resumen de una cuenta de LoL con Riot y 20 partidas de modos mezclados trae hasta
    20 `recentMatches`, cada una con `mode`, y `winRate` solo de las 8 últimas de Solo/Dúo, o `null` si no hay; unas
    partidas guardadas sin modo salen como `solo`; las partidas salen de la más reciente a la más antigua; una cuenta de LoL
    simulada, una de CS2 y una de R6 devuelven el resumen de siempre (8 partidas, sin `mode`, `winRate` numérico); una
    verificación con modos mezclados y una resincronización usan las mismas consultas que hoy (RNF-1); ninguna respuesta
    añade identificadores internos de Riot (RNF-5).
  - Código: `gameSummaryJson` según plan §3.4 y §5.
  - Hecho cuando: las pruebas pasan de rojo a verde; las claves del resumen siguen siendo `account`, `recentMatches`,
    `trend` y `winRate`; verde en el backend (suite completa). **Punto de control: parar y pedir la aprobación del
    usuario antes de seguir.**

## Bloque B — Frontend y cierre

- [x] **T8. Reglas de las pestañas de partidas.** RF-5, RF-7, RF-10, RF-16, RF-17, RNF-4
  - Tipos: `MatchMode` y `MatchRecord.mode?` en `domain/types.ts`; `GameProfileSummary.winRate: number | null` y la nota de
    `recentMatches` en `apiContract.ts`; ajuste de tipo en `mockApi.ts` (el mock sigue sin datos de Riot ni modos).
  - Pruebas Vitest primero en `domain/matchModes.test.ts` y módulo con firmas «sin implementar»: `showModeTabs` (origen
    simulado, 0 partidas, origen Riot), `modeOf` (sin modo → `solo`), `availableTabs` (con 1, 3 y 5 modos y con lista vacía;
    orden fijo Todas, Solo/Dúo, Flex, Normales, ARAM, Otros), `matchesForTab` (más de 8 de un modo → 8; menos → todas;
    «Todas» limitada a 8; orden recibido) y `resolveTab` (pestaña que desaparece → `all`). Después el código.
  - Hecho cuando: las pruebas pasan de rojo a verde; verde en el frontend; `git status --short backend/` sin cambios de esta
    tarea.

- [x] **T9. Pestañas genéricas con píldora.** RF-11, RNF-3
  - Componente `shared/components/PillTabs.tsx` sobre el `Tabs` de la librería, con el patrón de `GameTabs` (una parada de
    Tab, flechas circulares, Inicio y Fin que eligen, panel asociado con foco visible, píldora con resorte y `useId`); píldora
    con `--volt` y texto `--tab-ink`; `GameTabs` no se toca. Modificador compacto en `theme/components/tabs.css` (altura 34 px,
    relleno `--s3`) solo con tokens. Textos en `copy.ts`: «Todas», «Solo/Dúo», «Flex», «Normales», «ARAM», «Otros» y el nombre
    accesible «Modo de partida».
  - Hecho cuando: el componente compila y se usa solo desde T10; la prueba de colores del tema (`npm test`) sigue en
    verde sin literales nuevos; `GameTabs` queda sin diferencias en `git diff`; verde en el frontend.

- [x] **T10. La ficha enseña las partidas por modo.** RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-16, RF-17, RF-18
  - `features/profile/components/ModeMatchLedger.tsx`: estado de la pestaña elegida (inicio `all`), reinicio a `all` al pintar
    si el modo desaparece, `PillTabs` con las disponibles y `MatchLedger` con las partidas de `matchesForTab`.
  - `MatchLedger.tsx`: prop `showMode`; en «Todas» la línea secundaria de cada fila añade el modo; el formato de fila y la
    etiqueta de origen no cambian.
  - `GameSummaryPanel.tsx`: elige `ModeMatchLedger` (con `key` por cuenta) si `showModeTabs` y no está pendiente; si no, el
    `MatchLedger` de siempre.
  - Hecho cuando: verde en el frontend; el cambio de pestaña no hace peticiones (solo estado local, comprobado leyendo el
    código); el panel de una cuenta simulada, de CS2 y de R6 no cambia (mismo árbol de elementos que antes).

- [x] **T11. Validación en el navegador con modos mezclados.** RF-5 a RF-12, RF-16, RF-17, RNF-3
  - Con el servidor real y MongoDB, un usuario con una cuenta de LoL y el navegador interceptando la respuesta del resumen
    para devolver el contrato de plan §5 con modos mezclados (script en `specs/020-partidas-de-todos-los-modos/evidence/`),
    en tema oscuro y claro y a 1280, 375 y 360 px. Comprobar: pestañas presentes y en orden, solo con partidas; tope de 8
    por pestaña; modo visible solo en «Todas»; cambio de pestaña sin peticiones de red; flechas, Inicio, Fin y foco visible;
    paso LoL → CS2 → LoL vuelve a «Todas»; pestaña que desaparece vuelve a «Todas»; sin Solo/Dúo, «sin datos» y el rango sigue;
    cuentas simuladas, CS2 y R6 sin pestañas; a 360 px las pestañas no desbordan la ficha. Anotar navegador y versión.
  - Hecho cuando: `validation.md` tiene la tabla RF por RF con el resultado de cada comprobación y una sección «No
    comprobado» (con clave real de Riot: formato de `queueId` y cuenta real; lector de pantalla), y los defectos hallados
    están corregidos o listados.

- [x] **T12. Cierre de la spec.** Todos los RF y RNF
  - Actualizar `AGENTS.md` (línea de la 014: partidas de todos los modos; `domain/` del backend con `matchMode`) y
    `MEMORY.md` (estado, tabla de specs, próximo paso); marcar `spec.md` como «implementada, pendiente de la revisión del
    usuario»; ejecutar `graphify update .`.
  - Hecho cuando: la suite del backend y la del frontend completas, typecheck, lint y build en verde; las 12 tareas
    marcadas; `validation.md` enlazado desde `MEMORY.md`; nada commiteado (el commit lo pide el usuario).

## Cobertura

| RF / RNF | Tareas |
|---|---|
| RF-1 | T2, T3 |
| RF-2 | T1, T2, T5 |
| RF-3 | T1, T5, T7 |
| RF-4 | T1, T2 |
| RF-5 | T1, T8, T10, T11 |
| RF-6 | T10, T11 |
| RF-7 | T8, T10, T11 |
| RF-8 | T10, T11 |
| RF-9 | T10, T11 |
| RF-10 | T8, T10, T11 |
| RF-11 | T9, T11 |
| RF-12 | T6, T7, T11 |
| RF-13 | T4 |
| RF-14 | T4 |
| RF-15 | T4 |
| RF-16 | T1, T7, T8, T10, T11 |
| RF-17 | T7, T8, T10, T11 |
| RF-18 | T10 |
| RNF-1 | T3, T7 |
| RNF-2 | T1 a T7 (todas las pruebas simulan Riot) |
| RNF-3 | T9, T11 |
| RNF-4 | T1, T2, T4, T6, T8 |
| RNF-5 | T7 |
