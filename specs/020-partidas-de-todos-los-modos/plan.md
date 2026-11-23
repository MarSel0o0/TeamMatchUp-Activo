# Plan 020 — Partidas de todos los modos en la ficha de LoL
Estado: aprobado (2026-11-22, usuario)

Spec: `specs/020-partidas-de-todos-los-modos/spec.md` (aprobada el 2026-11-22). Constitución y `AGENTS.md` leídos.
Este plan no contiene código: solo firmas, pseudocódigo y decisiones. Ninguna regla usa el reloj, así que ninguna
función nueva recibe «hoy» (las existentes que lo reciben no cambian).

## 0. Qué se encontró en el código y condiciona el plan

1. **La lista de partidas se une, no se reemplaza.** `applyRiotReading` fusiona las partidas guardadas con las leídas
   (`mergeMatches`, máximo 20, orden de la spec 004 RF-28). Por eso la spec se corrigió hoy («las guardadas»; ver su
   Historial) y las partidas anteriores sin modo conviven con las nuevas hasta que las desplazan (RF-3).
2. **El resumen solo entrega 8 partidas** (`recentMatches`, spec 004 RF-12). Con pestañas de hasta 8 partidas cada una,
   el resumen de una cuenta de LoL con datos de Riot tiene que entregar más (D-P3).
3. **El modo de simulación (`VITE_USE_MOCK`) nunca produce datos de Riot** (spec 014, RF-42). Las pestañas no se pueden
   ver con el mock, y no debe cambiarse eso (constitución, principio 5): la validación visual usa otra vía (§7).
4. **El «0 %» actual.** Hoy una cuenta sin partidas devuelve `winRate: 0`. RF-12 pide «sin datos» cuando no hay Solo/Dúo,
   así que el resumen de LoL con Riot pasa a poder devolver `winRate: null` (D-P4).
5. **El cliente de Riot ya pide 20 y no más.** Quitar el parámetro de cola no cambia el número de consultas (RNF-1).

## 1. Archivos

### 1.1 Backend (`backend/`)

| Archivo | Cambio | Responsabilidad | RF |
|---|---|---|---|
| `src/domain/matchMode.ts` | **nuevo** | Tipo `MatchMode` (`solo`, `flex`, `normal`, `aram`, `other`), lista ordenada `MATCH_MODES`, tabla de colas → modo, `modeOfQueue`, `storedMode` (modo guardado con el valor de las partidas sin modo) y `hasMatchModes` (origen del bloque de partidas). Puro. | RF-2, RF-3, RF-4, RF-5, RF-16 |
| `src/domain/riotData.ts` | modifica | `RiotMatchRecord` gana `mode`. `parseRiotMatch` deja de rechazar las colas distintas de Solo/Dúo y calcula el modo. Se elimina `RIOT_SOLO_QUEUE_ID` (la cola 420 vive en la tabla de `matchMode.ts`). | RF-1, RF-2, RF-4 |
| `src/domain/riotLpDelta.ts` | modifica | La partida nueva y la línea base cuentan solo las de modo `solo`; las de otros modos no reciben variación; `stripRankDelta` y `withRankDelta` conservan el modo. | RF-13, RF-14, RF-15 |
| `src/domain/accountState.ts` | modifica | `AccountMatch` gana `mode?` opcional. Función nueva `soloWinRate`. | RF-12, RF-16 |
| `src/models/gameAccount.ts` | modifica | `MatchRecordFields` y `MatchRecordSchema` ganan `mode` opcional, con los cinco valores y **sin valor por defecto** (D-P2). | RF-2, RF-3 |
| `src/services/riotClient.ts` | modifica | `getSoloMatchIds` pasa a `getRecentMatchIds`: ya no envía `queue`; sigue con `start=0` y `count=20`. | RF-1, RNF-1 |
| `src/services/riotSync.ts` | modifica | Usa `getRecentMatchIds`; `toStoredRiotMatch` lee el modo con `storedMode`; `toRiotMatchRecord` lo escribe. Comentarios «Solo/Dúo» al día. Sin cambio en el flujo, los topes ni la reserva de 24 consultas. | RF-1, RF-2, RF-3, RNF-1 |
| `src/services/verifyAccount.ts` | modifica | `toRiotMatchRecord` escribe el modo (hay una copia de esta función en `riotSync.ts`; se actualizan las dos, sin unificarlas). | RF-2 |
| `src/controllers/users.ts` | modifica | `gameSummaryJson`: si `hasMatchModes(origen del bloque de partidas)`, entrega todas las guardadas con su `mode` (el de las partidas sin modo, `solo`) y `winRate: soloWinRate(...)`; si no, como hoy (8 partidas, sin `mode`, `winRate` numérico). | RF-12, RF-16, RF-17 |
| `tests/unit/matchMode.test.ts` | **nuevo** | Tabla de colas, cola ausente, `storedMode`, `hasMatchModes`. | RF-2 a RF-5, RF-16 |
| `tests/unit/riotData.test.ts` | modifica | Casos de modo en `parseRiotMatch`; el caso «cola distinta de 420 es inválida» pasa a «cola distinta de 420 es de su modo». | RF-1, RF-2, RF-4 |
| `tests/unit/riotLpDelta.test.ts` | modifica | La fábrica de partidas gana `mode`; casos nuevos de la §7. | RF-13 a RF-15 |
| `tests/unit/accountState.test.ts` | modifica | Casos de `soloWinRate`. | RF-12 |
| `tests/unit/riotClient.test.ts` | modifica | La petición de la lista ya no lleva `queue`; sigue con `start=0` y `count=20`; método renombrado. | RF-1, RNF-1 |
| `tests/unit/gameAccountModel.test.ts` | modifica | El campo `mode`: opcional, con los cinco valores, rechaza otro. | RF-2 |
| `tests/controllers/riotHelpers.ts` | modifica | El cliente simulado expone `getRecentMatchIds` y sirve partidas de varios modos. | RNF-2 |
| `tests/controllers/riotSyncAndMatches.test.ts`, `riotConfirm.test.ts`, `accountRealSync.test.ts`, `gameSummary.test.ts` | modifican | Casos de extremo a extremo (§7). | RF-1 a RF-3, RF-12 a RF-17, RNF-1 |

### 1.2 Frontend (`frontend/`)

| Archivo | Cambio | Responsabilidad | RF |
|---|---|---|---|
| `src/domain/types.ts` | modifica | `MatchMode` y `MatchRecord.mode?` (solo en cuentas de LoL con datos de Riot). | RF-2, RF-16 |
| `src/domain/matchModes.ts` | **nuevo** | Reglas puras de las pestañas: orden, tope de 8 por pestaña, `showModeTabs`, `modeOf`, `availableTabs`, `matchesForTab`, `resolveTab`. | RF-5, RF-7, RF-10, RF-16, RF-17 |
| `src/domain/matchModes.test.ts` | **nuevo** | Pruebas Vitest de las reglas anteriores, escritas antes. | RF-5, RF-7, RF-10, RNF-4 |
| `src/services/apiContract.ts` | modifica | `GameProfileSummary.winRate: number \| null`; `recentMatches` documenta que en LoL con Riot trae todas las guardadas. | RF-12 |
| `src/shared/components/PillTabs.tsx` | **nuevo** | Pestañas genéricas con píldora sobre el `Tabs` de la librería, con el mismo patrón de teclado que `GameTabs`. `GameTabs` no se toca (D-P5). | RF-11 |
| `src/theme/components/tabs.css` | modifica | Modificador compacto de la lista de pestañas (una sola clase), para que quepan seis en 360 px. Solo tokens. | RNF-3 |
| `src/features/profile/components/ModeMatchLedger.tsx` | **nuevo** | Dueño de la pestaña elegida: pestañas más lista de partidas. | RF-5 a RF-10 |
| `src/features/profile/components/MatchLedger.tsx` | modifica | Prop `showMode`: en «Todas» añade el modo a la línea secundaria de cada fila. El formato de fila no cambia. | RF-8 |
| `src/features/profile/components/GameSummaryPanel.tsx` | modifica | Elige entre `ModeMatchLedger` (con `key` por cuenta) y el `MatchLedger` de siempre. | RF-5, RF-6, RF-16, RF-17 |
| `src/shared/utils/copy.ts` | modifica | Textos: nombres de las pestañas y nombre accesible de la lista. | RF-5, RF-11 |
| `src/services/mock/mockApi.ts` | modifica (tipo) | Solo para que compile con `winRate: number \| null`; el mock sigue sin datos de Riot ni modos. | RF-16 |

### 1.3 Documentación

- `AGENTS.md`: la línea de la spec 014 deja de decir «rango Solo/Dúo, partidas…» a secas (partidas de todos los modos,
  spec 020) y `src/domain/` del backend añade `matchMode`.
- `MEMORY.md`: estado de la 020 al cerrar cada fase.
- Las specs 004, 008 y 014 **no se editan** (así se hizo con la 015); las correcciones son los RF de la 020 y la tabla
  «Cambio sobre otras specs» de su spec.

## 2. Funciones puras

Todas viven en `domain/` (backend) o `src/domain/` (frontend), sin Express, Mongoose, HTTP, React ni reloj.

### 2.1 Backend

- `modeOfQueue(queueId: number | undefined): MatchMode` — RF-2, RF-4. Tabla: 420 → `solo`; 440 → `flex`; 400, 430,
  490 → `normal`; 450 → `aram`; cualquier otro número o `undefined` → `other`.
- `storedMode(mode: MatchMode | undefined): MatchMode` — RF-3. Devuelve `solo` si no hay modo.
- `hasMatchModes(origin: Origin): boolean` — RF-16. Verdadero solo si el origen del bloque de partidas es Riot.
- `parseRiotMatch(raw, puuid)` — RF-1, RF-2, RF-4. Misma firma; cambia la validación de la cola (§3.2).
- `applyRiotReading(input)` — RF-13, RF-14, RF-15. Misma firma; cambia el cálculo de la partida nueva (§3.3).
- `soloWinRate(matches: readonly AccountMatch[]): number | null` — RF-12. Toma las partidas de modo `solo` en el
  orden recibido, se queda con las 8 primeras y devuelve el porcentaje con el redondeo existente (`winRate`), o `null`
  si no hay ninguna.

### 2.2 Frontend

- `showModeTabs(origin: Origin, matches: readonly MatchRecord[]): boolean` — RF-5, RF-16, RF-17. Origen Riot y al menos
  una partida.
- `modeOf(match: MatchRecord): MatchMode` — RF-3. `match.mode` o `solo` si falta (misma regla que el servidor).
- `availableTabs(matches): MatchTab[]` — RF-5. `all` y, en el orden fijo `solo`, `flex`, `normal`, `aram`, `other`, los
  modos con al menos una partida.
- `matchesForTab(matches, tab): MatchRecord[]` — RF-7. Filtra por la pestaña (`all` no filtra), conserva el orden recibido
  (la más reciente primero) y devuelve como máximo 8.
- `resolveTab(selected, available): MatchTab` — RF-10. `selected` si sigue disponible; si no, `all`.

## 3. Algoritmos

### 3.1 Lectura (sin cambios de flujo; RF-1, RNF-1)

```
verificar / resincronizar:
  ids   = cliente.getRecentMatchIds(puuid, region)      # 1 consulta, count=20, sin cola
  por cada id (hasta 20):
      resultado = cliente.getMatchById(id, puuid, region)   # 1 consulta cada una
      ok       → añadir partida (con su modo)
      remake   → descartar (no cuenta como omitida)
      otro     → omitir y marcar omittedAny
  las reservas del limitador siguen siendo 24 / 35 en total
```

### 3.2 `parseRiotMatch` (RF-1, RF-2, RF-4)

```
queueId = info.queueId
si queueId existe y no es un número entero → inválida (se omite la partida, spec 014 RF-52)
modo    = modeOfQueue(queueId)          # ausente → other
... (anuladas, duración, participante, fecha, resultado, campeón y K/D/A, sin cambios)
partida = { id, gameId: "lol", playedAt, result, summary, durationMinutes, mode: modo }
```

Las anuladas se descartan con el mismo criterio en cualquier modo (RF-1, spec 014 D10).

### 3.3 `applyRiotReading` (RF-13, RF-14, RF-15)

```
completa = rank leído && partidas leídas && !omittedAny           # RF-15: sin cambios, una omitida de cualquier modo
                                                                    # la vuelve incompleta
si completa:
    entrantes   = sinRepetidos(partidas leídas)
    soloEntrantes = entrantes con mode == "solo"
    si hay línea base:
        nuevas = soloEntrantes cuyo id no está en base.matchIds      # RF-14: solo Solo/Dúo
        si nuevas.length == 1 y mismo tramo de rango y puntos válidos:
            asignar variación a esa partida si no tenía                # sin cambios (D37, D81)
    línea base nueva = rango + ids de soloEntrantes                    # solo Solo/Dúo; las anteriores ya eran solo Solo/Dúo
fusión de partidas = igual que hoy (unión con las guardadas, orden RF-28, 20 máximo),
                     quitando la variación de las entrantes que no la reciben
                     y conservando siempre el modo en cada copia
```

Las partidas de otros modos no reciben nunca variación, porque la variación solo se asigna a una partida de `solo`.
Las guardadas antes de la spec llegan a esta función ya con modo `solo` (lo pone `storedMode` al leerlas).

### 3.4 Resumen por juego (RF-12, RF-16, RF-17)

```
resumen(cuenta):
  guardadas = cuenta.matches (ya en el orden de la spec 004 RF-28)
  si hasMatchModes(origen de partidas de la cuenta):
      lista = guardadas con mode = storedMode(m.mode)
      return { account, recentMatches: lista (hasta 20), winRate: soloWinRate(lista), trend }
  si no:
      return { account, recentMatches: 8 primeras, winRate: winRate(8 primeras), trend }   # como hoy
```

### 3.5 Pestañas en la ficha (RF-5 a RF-10)

```
GameSummaryPanel(summary):
  si matchesPending            → aviso de pendiente (RF-17)
  si !showModeTabs(origen, partidas) → MatchLedger de siempre (sin pestañas; simuladas, CS2, R6 o 0 partidas)
  si no → <ModeMatchLedger key={cuenta.id} partidas origen />

ModeMatchLedger:
  estado: tab = 'all'                                   # RF-6; la clave por cuenta lo reinicia al cambiar de cuenta/juego
  disponibles = availableTabs(partidas)
  si tab no está en disponibles: tab = resolveTab(tab, disponibles)    # RF-10, durante el render, sin efecto
  visibles = matchesForTab(partidas, tab)               # hasta 8
  pintar PillTabs(disponibles, tab, onChange: setTab)
  pintar MatchLedger(visibles, showMode: tab == 'all')
```

Cambiar de pestaña solo cambia estado local: no hay consulta ni recarga (RF-9).

## 4. Interfaz

```
Últimas partidas                              63 % de victorias     ← título y % del panel, sin cambios
┌ Todas ┬ Solo/Dúo ┬ Flex ┬ Normales ┬ ARAM ┬ Otros ┐              ← PillTabs (solo los modos con partidas)
Datos de Riot Games                                                  ← etiqueta de origen (RF-18)
Res.  Partida                                           Rango
 V    Ahri · 8/2/11                                        +17
      21/11/2026 · 28 min · Solo/Dúo                               ← en «Todas» la línea secundaria añade el modo
 D    Garen · 3/9/4                                         —
      20/11/2026 · 19 min · ARAM
```

- **Pestañas:** las de `PillTabs`, con el estilo de las pestañas de juego: píldora que se desliza con resorte (`motion`),
  sin punto de color; la píldora usa la tinta del acento (`--volt`) y el texto elegido `--tab-ink`. Sin colores
  escritos: solo tokens (lo comprueba `npm test`).
- **Ancho:** la lista se limita al ancho de la ficha y se desplaza en horizontal sin barra visible (ya lo hace
  `tmu-tabs__list`); con el modificador compacto (altura 34 px, relleno `--s3`) las seis caben a 400 px y a 360 px se
  desplazan sin desbordar la ficha (RNF-3).
- **Accesibilidad (RF-11):** rol `tablist` con nombre accesible «Modo de partida», una pestaña con `aria-selected`, una
  sola parada de Tab para el grupo, flechas circulares, Inicio y Fin que eligen la primera y la última, y un único panel
  asociado a la pestaña elegida (`aria-controls`/`aria-labelledby` de la librería) con `tabIndex` 0 y foco visible. Lo
  mismo que `GameTabs`. Dos listas de pestañas anidadas (juego y modo) son independientes.
- **Estados:** pendiente de lectura, sin partidas, cuentas simuladas, CS2 y R6 → sin pestañas, igual que hoy. Un solo
  modo → «Todas» y ese modo.
- **Textos** (en `copy.ts`): «Todas», «Solo/Dúo», «Flex», «Normales», «ARAM», «Otros»; nombre de la lista «Modo de partida».
- **Orden de tabulación:** en la ficha de LoL con datos de Riot se añaden dos paradas (la pestaña elegida de modo y su
  panel). Es un cambio previsto de esta spec respecto del recorrido medido en la 017.

## 5. Contrato del resumen por juego

Respuesta de `GET` del resumen (campos que cambian; los demás igual):

| Caso | `recentMatches` | `mode` por partida | `winRate` |
|---|---|---|---|
| LoL con datos de Riot | todas las guardadas (hasta 20), la más reciente primero | sí (`solo`, `flex`, `normal`, `aram`, `other`) | entero 0 a 100 de las 8 últimas `solo`, o `null` si no hay |
| Resto (LoL simulado, CS2, R6) | las 8 primeras | no aparece | entero, como hoy |

Ningún identificador interno de Riot sale por esto (RNF-5): `mode` es una etiqueta, no un identificador.

## 6. Decisiones técnicas

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| D-P1 | Archivo nuevo `domain/matchMode.ts` para el modo y sus reglas | Lo usan el parser de Riot, la fusión de partidas, el modelo y el resumen; no es solo de Riot | Dejarlo en `riotData.ts`: mezclaría una regla de la cuenta con el parser de una fuente |
| D-P2 | `mode` opcional en el esquema, sin valor por defecto; las partidas sin modo se leen como `solo` (`storedMode`) y la siguiente resincronización las reescribe con modo | Un valor por defecto en el esquema marcaría como `solo` las partidas simuladas, que no tienen modos reales (RF-16, principio 5); leer así evita una migración | Migración al arrancar (como la de la spec 015): añade riesgo en el arranque sin ganar nada |
| D-P3 | El resumen de LoL con Riot entrega todas las guardadas (hasta 20) y el frontend recorta a 8 por pestaña | Una sola respuesta cubre todas las pestañas y el cambio de pestaña no hace consultas (RF-9); la regla del recorte queda en una función pura probada | Que el servidor envíe hasta 8 por modo: duplica la regla en dos lados; un endpoint por modo: consultas en cada cambio (rompe RF-9) |
| D-P4 | `winRate: null` solo para LoL con Riot sin partidas de Solo/Dúo | RF-12 pide «sin datos»; `0` se leería como «0 % de victorias» | Devolver `0`: engañoso. Cambiar el tipo para todos los juegos: toca specs que no cambian (RF-16) |
| D-P5 | `PillTabs` nuevo; `GameTabs` no se modifica | `GameTabs` está validado por la 017 (teclado, píldora con tinta del juego); separar evita regresiones | Generalizar `GameTabs`: toca un componente ya validado por una necesidad menor |
| D-P6 | La pestaña elegida es estado local de `ModeMatchLedger`, con `key` por cuenta, y el reinicio por modo desaparecido se calcula al pintar | `GameTabs` reutiliza el mismo panel al cambiar de juego: sin `key`, la pestaña de LoL sobreviviría al paso por CS2 (rompe RF-6); la `key` no necesita efectos | `useEffect` que reinicia: pinta un fotograma con una pestaña inexistente; almacén global: demasiado para un estado de pantalla |
| D-P7 | `getRecentMatchIds` sin parámetro de cola y mismo `count=20` | Es el cambio mínimo que cumple RF-1 con RNF-1 intacto | Una consulta por cola: sale de la opción A (fuera de alcance de la spec) |
| D-P8 | La línea base guarda solo los ids de `solo` | Mantiene el significado que ya tiene el campo (partidas Solo/Dúo de la lectura completa) y es compatible con las líneas base ya guardadas | Guardar todos los ids y filtrar al comparar: otro significado para el mismo campo y datos que no se usan |
| D-P9 | Reglas de pestañas probadas con Vitest, escritas antes (aunque la constitución solo lo exige si la spec lo pide) | RNF-4 de la spec pide reglas puras con pruebas; es la práctica de las specs 016 y 017 | Solo build, typecheck y lint: la regla de «8 por pestaña» y el reinicio quedarían sin red |
| D-P10 | Validación visual con intercepción de red sobre el servidor real | El mock no puede traer datos de Riot (principio 5; spec 014 RF-42) | Sembrar partidas de Riot en el mock: atribuiría a Riot datos simulados, que está prohibido |

## 7. Estrategia de pruebas

### 7.1 Backend (`node:test`; primero en rojo, luego en verde; sin conexión ni clave: RNF-2)

- **`matchMode`:** 420 → `solo`; 440 → `flex`; 400, 430, 490 → `normal`; 450 → `aram`; 1700 (Arena), 900 (URF), 700
  (Clash), 0 (personalizada) y un número desconocido → `other`; `undefined` → `other`; `storedMode(undefined)` → `solo`;
  `hasMatchModes` verdadero solo con origen Riot.
- **`parseRiotMatch`:** una partida de cada modo devuelve su `mode`; sin `queueId` → `other`; `queueId` no numérico o con
  decimales → inválida; una rendición temprana de menos de 5 minutos en ARAM → anulada; el resto de casos actuales intactos.
- **`applyRiotReading`:**
  - una partida nueva de `solo` junto con una de ARAM y una de Flex nuevas recibe la variación;
  - solo partidas nuevas de otros modos → ninguna variación y la línea base se renueva;
  - dos partidas nuevas de `solo` → ninguna variación (como hoy);
  - una partida omitida, aunque sea de otro modo → lectura incompleta y la línea base no cambia;
  - las partidas de otros modos nunca llevan `rankDelta`;
  - las guardadas con modo `solo` conservan su variación y el modo tras la fusión;
  - la línea base nueva contiene solo ids de `solo`; una línea base antigua sigue sirviendo.
- **`soloWinRate`:** 5 de 8 → 63; sin `solo` → `null`; más de 8 `solo` → solo cuentan las 8 primeras; otros modos no cuentan.
- **Modelo:** `mode` ausente es válido; los cinco valores son válidos; otro valor falla.
- **Cliente:** la URL de la lista no lleva `queue`, lleva `start=0` y `count=20`.
- **Controladores (extremo a extremo con el cliente de Riot simulado):**
  - una verificación con 20 partidas de modos mezclados guarda cada modo y usa las mismas consultas que hoy
    (RNF-1: 24 en la confirmación y en la resincronización, 35 como máximo en una verificación);
  - el resumen de esa cuenta trae hasta 20 partidas con `mode` y `winRate` solo de Solo/Dúo, o `null`;
  - una cuenta con partidas guardadas sin modo (preparadas en la base) las devuelve como `solo` y las reescribe con modo
    tras resincronizar, conservando su variación;
  - una cuenta de LoL simulada, una de CS2 y una de R6 devuelven el resumen de siempre (8 partidas, sin `mode`).

### 7.2 Frontend

- **Vitest (`matchModes.test.ts`, antes del código):** `availableTabs` con 1, 3 y 5 modos, y con una lista vacía; orden
  fijo; `matchesForTab` con más de 8 de un modo (8) y con menos (todas); «Todas» limitada a 8; `resolveTab` con una
  pestaña que desaparece; `showModeTabs` con origen simulado, 0 partidas y origen Riot; una partida sin modo cuenta como
  `solo`.
- **Typecheck, lint, compilación y pruebas** del frontend en verde (incluida la comprobación de colores del tema).

### 7.3 Validación en navegador (la hace el implementador y la repasa el `reviewer`; no se escribe código de producción para ella)

Con el servidor real y MongoDB, un usuario con una cuenta de LoL y el navegador interceptando la respuesta del resumen
para devolver el contrato de la §5 con modos mezclados, en los dos temas y a 1280, 375 y 360 px:

- pestañas presentes y en orden; tope de 8 por pestaña; modo visible solo en «Todas»; cambio de pestaña sin peticiones;
- teclado: flechas, Inicio y Fin, foco visible y panel asociado; con lector de pantalla pendiente del usuario;
- paso LoL → CS2 → LoL vuelve a «Todas»; pestaña que desaparece al resincronizar vuelve a «Todas»;
- sin Solo/Dúo, el porcentaje dice «sin datos» y el rango sigue; cuentas simuladas, CS2 y R6 sin pestañas.

Queda **sin comprobar** lo que exige una clave real de Riot (el formato real de `queueId` en la respuesta de Match-v5 y
el comportamiento con una cuenta real); se anota en `validation.md`, como en la spec 014.

## 8. Orden de implementación sugerido (para las tareas)

1. Backend, reglas puras con pruebas en rojo primero: `matchMode`, `parseRiotMatch`, `applyRiotReading`, `soloWinRate`.
2. Backend, modelo, cliente, sincronización y verificación (`getRecentMatchIds`, mapeos del modo).
3. Backend, resumen por juego y pruebas de extremo a extremo.
4. Frontend, tipos y reglas de pestañas con Vitest en rojo primero.
5. Frontend, `PillTabs`, `ModeMatchLedger`, `MatchLedger`, `GameSummaryPanel`, textos y CSS.
6. Documentación (`AGENTS.md`, `MEMORY.md`) y validación en navegador.

Son unas 10 a 12 tareas; no hace falta dividir la spec.

## 9. Cobertura de los requisitos

| RF / RNF | Dónde se cubre |
|---|---|
| RF-1 | `riotClient.ts` (sin cola), `riotSync.ts`, `riotData.ts` (§3.1, §3.2) |
| RF-2 | `matchMode.ts`, `riotData.ts`, esquema y mapeos (`riotSync.ts`, `verifyAccount.ts`) |
| RF-3 | `storedMode` (lectura de las partidas sin modo) y su reescritura al resincronizar (D-P2) |
| RF-4 | `modeOfQueue` con `undefined` → `other` |
| RF-5 | `availableTabs`, `showModeTabs`, `ModeMatchLedger` |
| RF-6 | Estado inicial `all` y `key` por cuenta (D-P6) |
| RF-7 | `matchesForTab` (8 por pestaña), orden recibido |
| RF-8 | Prop `showMode` de `MatchLedger` |
| RF-9 | Estado local; el resumen ya trae todas las guardadas (D-P3) |
| RF-10 | `resolveTab` aplicado al pintar |
| RF-11 | `PillTabs` (patrón de `GameTabs`) y §4 |
| RF-12 | `soloWinRate`, `winRate: null`, textos de «sin datos» ya existentes |
| RF-13 | `riotLpDelta.ts`: la variación solo se asigna a una partida `solo`; las demás muestran «—» (`formatMatchDelta`) |
| RF-14 | `applyRiotReading` (§3.3) |
| RF-15 | `applyRiotReading`: `omittedAny` de cualquier modo |
| RF-16 | `hasMatchModes`, resumen sin `mode` en simuladas, CS2 y R6, `showModeTabs` |
| RF-17 | `showModeTabs` falso con pendiente o 0 partidas; aviso y estado vacío actuales |
| RF-18 | `MatchLedger` mantiene la etiqueta de origen |
| RNF-1 | Mismo número de consultas y misma reserva; prueba de extremo a extremo |
| RNF-2 | Cliente de Riot simulado en todas las pruebas |
| RNF-3 | Textos en `copy.ts`; modificador compacto y desplazamiento horizontal (§4) |
| RNF-4 | Pruebas de las reglas puras escritas antes (§7.1, §7.2) |
| RNF-5 | `mode` es una etiqueta; el contrato no añade identificadores (§5) |

## 10. Riesgos

- **Las pruebas existentes de Riot** construyen partidas sin `mode` y llaman a `getSoloMatchIds`: hay que actualizar sus
  fábricas y el cliente simulado antes de poner el campo obligatorio. Es un cambio mecánico, el primero de la tarea.
- **Formato real de `queueId`:** se asume el de la documentación de Match-v5 (número entero); si Riot lo entregara de otra
  forma, la partida se omite (RF-1) y la lectura queda incompleta (RF-15), nunca con un modo inventado. Solo se
  confirma con una clave real (sin comprobar en esta spec).
- **Orden de las partidas guardadas:** la ficha confía en que el servidor las entrega de la más reciente a la más antigua
  (spec 004, RF-28). Una prueba de extremo a extremo lo fija.
