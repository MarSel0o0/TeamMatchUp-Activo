# Validación 014 — Verificación de cuentas de League of Legends con Riot ID
Estado: **parcial (2026-11-19)**. Backend completo y probado sin red ni clave real; la interfaz
está construida y pasa `typecheck`, `lint` y `build`; la auditoría estática y la documentación
están cerradas. **Aún no se ha verificado visualmente en un navegador (Chrome DevTools a 1280 px
y 375 px)** ni se ha ejecutado el **recorrido manual con una cuenta real de LoL y `RIOT_API_KEY`**.
Esta spec **no** pasa a «implementada» ni se marcan las casillas de `spec.md` hasta completar la
validación de Fase 5 (`reviewer`, sección 2) y el recorrido manual del equipo (sección 3).

---

## 1. Comprobaciones automáticas y estáticas ejecutadas en T12 (sin red ni clave real)

### 1.1 Backend (`backend/`, entorno Node `v22.14.0` con `NODE_OPTIONS=--experimental-strip-types`, sin `.env` en el repo)
- **Suite completa (82 archivos de prueba, excluyendo las 2 salvedades de entorno):** `EXIT_CODE 0`,
  **0 fallos** (3,219 eventos `pass` entre pruebas y suites con `--test-reporter=dot`, equivalentes
  a las 2,786 pruebas en verde reportadas al cerrar T8).
- **Archivos nuevos de la spec 014 (13 archivos `*riot*.test.ts`):** **217/217 pruebas en verde**
  (58 suites, 0 fallos, ~59 s).
- **Archivos existentes modificados/clave (7 archivos: `domainIsolation.test.ts`, `config.test.ts`,
  `envExample.test.ts`, `accountState.test.ts`, `matching.test.ts`, `matchInputs.test.ts`,
  `verifyAccount.test.ts`):** **249/249 pruebas en verde** (34 suites, 0 fallos, ~19.5 s).
- **Salvedades de entorno (no pertenecen a la spec 014):**
  - `tests/controllers/ui.test.ts` (spec 010, preexistente en esta rama porque `uiDir` no existe en
    `AppOptions`): 8 pass / 8 fail (16 pruebas).
  - `tests/server/process.test.ts` (limpia `process.env` al lanzar procesos hijo y pierde
    `NODE_OPTIONS=--experimental-strip-types` bajo Node `v22.14.0`; `package.json` requiere Node
    `>= 22.18`, donde el strip de tipos es nativo): 0 pass / 26 fail (26 pruebas).
- **Typecheck (`src/`):** `npx tsc --noEmit` → **exit 0** (0 errores).
- **Typecheck (`tests/`):** `npx tsc --noEmit -p tests` → **exit 2** con 1 único error
  preexistente en `tests/controllers/ui.test.ts(28,83)` (`'uiDir' does not exist in type
  'AppOptions'`); **0 errores** en el resto de pruebas.
- **Lint:** `npm run lint` (`eslint .`) → **exit 0** (0 errores).

| RF / RNF | Dónde se prueba (sin red, dobles de prueba) |
|---|---|
| RF-1, RF-3, RF-4, RF-5, RF-6, RF-18, RF-19, RF-20, RF-21, RF-22, RF-43 | `riotRules.test.ts`, `riotChallenge.test.ts`, `riotChallenges.test.ts`, `riot.test.ts` |
| RF-7, RF-8, RF-9, RF-10, RF-23, RF-24, RF-25, RF-26 (incl. paso 3 D104), RF-27, RF-48, RF-50 | `riotChallenge.test.ts`, `riotChallenges.test.ts`, `riotConfirm.test.ts`, `verifyAccount.test.ts` |
| RF-11, RF-12 (duración redondeada y `rankDelta` opcional), RF-30 (incl. D37, D78, D81, D102), RF-31, RF-32, RF-34, RF-36, RF-52 | `riotData.test.ts`, `riotLpDelta.test.ts`, `accountState.test.ts`, `riotConfirm.test.ts`, `riotSyncAndMatches.test.ts` |
| RF-13, RF-33, RF-44 (sin clasificar y rango pendiente en coincidencias) | `matching.test.ts`, `matchInputs.test.ts`, `riotSyncAndMatches.test.ts` |
| RF-14, RF-15, RF-35, RF-51, RF-53 (resincronización, cambio de Riot ID, cambio de ícono, región transferida, fallo parcial) | `riotSyncAndMatches.test.ts` |
| RF-16, RF-37, RF-38, RF-49 (disponibilidad, limitador 20/s y 100/2 min, reservas 2/24/24, liberación, lock por usuario) | `config.test.ts`, `riotRateLimiter.test.ts`, `riotLimiter.test.ts`, `riotClient.test.ts`, `riot.test.ts`, `riotConfirm.test.ts`, `riotSyncAndMatches.test.ts` |
| RF-17 (renovación de clave con reinicio) | `config.test.ts`, `envExample.test.ts`, `riotKeyRestart.test.ts` |
| RF-28, RF-29 (persistencia, TTL 24 h, cascada C6 y anulación por cambios en LoL manual / exclusividad) | `riotChallenges.test.ts`, `riotChallengeCascade.test.ts`, `riotConfirm.test.ts`, `riotSyncAndMatches.test.ts` |
| RF-45 (recuperación de desafío sin Riot, sin clave, sin lock, con `remainingSeconds`, `riotId` y `region`) | `riot.test.ts` |
| RNF-1 (tope de 35 consultas en verificación completa + limitador deslizante) | `riotConfirm.test.ts`, `riotRateLimiter.test.ts`, `riotLimiter.test.ts` |
| RNF-2 (sin red ni clave real) | Toda la suite con `fetchFn` / `RiotClient` inyectables |
| RNF-3 (ausencia total de `puuid` en respuestas) | `riotChallenges.test.ts`, `riot.test.ts`, `riotConfirm.test.ts`, `riotSyncAndMatches.test.ts` |
| RNF-4 (sin fugas de `RIOT_API_KEY` en errores, logs, `.env.example` ni repo) | `config.test.ts`, `envExample.test.ts`, `riotClient.test.ts` + auditoría estática |
| RNF-5 (sin dependencias nuevas) | Auditoría estática (`git diff` vacío en `package.json` y `package-lock.json`) |
| RNF-6 (plazo 8 s por consulta) | `riotClient.test.ts` |
| RNF-7 (plazo 60 s por operación, antes y después del ícono) | `riot.test.ts`, `riotConfirm.test.ts`, `riotSyncAndMatches.test.ts` |

### 1.2 Frontend (`frontend/`)
- `npm run typecheck` (`tsc --noEmit`) → **exit 0**.
- `npm run lint` (`eslint .`) → **exit 0**.
- `npm run build` (`tsc -b && vite build`) → **exit 0** (paquete generado en `12.02s`).

### 1.3 Auditoría estática
- `git diff backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json`: **vacío** (RNF-5).
- Archivos `.env` en el repositorio o `git status`: **ninguno** (RNF-4).
- Búsqueda de `RGAPI-` en el repositorio: **11 coincidencias**, todas exclusivamente claves falsas
  de prueba y la aserción regex dentro de `backend/tests/` (`riotKeyRestart.test.ts`,
  `config.test.ts`, `envExample.test.ts`, `riotClient.test.ts`); **0 claves reales** (RNF-4).
- `.only` en `backend/tests/`: **0**.
- `any`, `@ts-ignore`, `@ts-expect-error`, `dangerouslySetInnerHTML` en archivos nuevos/modificados
  de la 014: **0**.
- Colores escritos a mano fuera de `frontend/src/styles/tokens.css` en los CSS de la 014
  (`riotVerifyPage.css`, `riotProfileBlock.css`, `matchLedger.css`): **0**.
- Llamadas a `fetch(` dentro de `frontend/src/features/`: **0** (constitución, principio 3).

---

## 2. Pendiente de verificación visual en Chrome DevTools (Fase 5 — `reviewer`)

Comprobar cada punto en **1280 px** (escritorio) y **375 px** (móvil), sin errores en consola ni
desbordamiento horizontal en las vistas nuevas/tocadas. Marcar cada casilla con fecha y resultado
al ejecutarla en un navegador real.

### 2.1 Disponibilidad, modo simulado y punto de entrada (RF-38, RF-39, RF-42)
- [ ] **RF-42 (modo simulado, `VITE_USE_MOCK_API=true npm run dev`):**
  - El botón «Verificar con Riot Games» aparece **desactivado** con el texto «No disponible en modo
    de demostración» en Perfil (fila de LoL) y en Configuración (fila de LoL o sobre el formulario
    de vínculo si no hay cuenta de LoL).
  - Ninguna cuenta de LoL simulada muestra «Verificada con Riot Games» ni «Datos de Riot Games»;
    siguen etiquetadas como simuladas.
- [ ] **RF-38 (servidor real sin `RIOT_API_KEY`):**
  - El botón «Verificar con Riot Games» **no aparece** ni en Perfil ni en Configuración; la
    vinculación manual de LoL sigue funcionando igual.
- [ ] **RF-39 (servidor real con `RIOT_API_KEY` o doble HTTP):**
  - Sin cuenta de LoL: «Verificar con Riot Games» aparece sobre el formulario de vínculo manual en
    Configuración (sin alterar el formulario manual).
  - Con cuenta manual de LoL sin verificar: aparece en la fila de LoL en Perfil y Configuración.
  - Con cuenta de LoL ya verificada: el botón **desaparece** en ambas pantallas.

### 2.2 Flujo `/verificar/riot`: formulario, pantalla del desafío, recarga y errores (RF-2, RF-45, RF-46, RF-47, RF-54)
- [ ] **RF-46 (formulario pre-rellenado):** al entrar desde «Verificar con Riot Games» con una cuenta
  manual de LoL, el formulario pre-rellena el Riot ID y la región; sin cuenta manual, parte vacío.
- [ ] **RF-2 (pantalla del desafío):**
  - Muestra la imagen del ícono asignado desde Data Dragon (sin consultar a la API de Riot); al
    bloquear el host de Data Dragon en DevTools Network, muestra «Ícono n.º `<id>`».
  - Muestra la cuenta atrás `mm:ss` calculada con `remainingSeconds` de la API (baja cada segundo
    hasta `00:00`, incluso con reloj del navegador desajustado).
  - Muestra los 3 pasos fijos (Perfil → clic en el ícono → elegir y guardar), el botón «Ya puse el
    ícono» y el botón «Volver» (sin botón «Cancelar»).
- [ ] **RF-45 + RF-46 (recarga y «Volver»):**
  - Pulsar «Volver» sale de la pantalla y, al volver a elegir «Verificar con Riot Games» mientras
    el desafío sigue abierto, se muestra directamente la pantalla del desafío (no el formulario).
  - Recargar `/verificar/riot` con el desafío abierto recupera el desafío (ícono, cuenta atrás,
    Riot ID y región) sin consultar a Riot.
  - Recargar `/verificar/riot` cuando el desafío ya venció muestra el formulario normal de RF-46.
- [ ] **RF-2 + RF-54 (vencimiento y respuestas terminales):**
  - Al llegar a `00:00`, muestra «El desafío venció», desactiva «Ya puse el ícono» y muestra
    «Pedir otro desafío».
  - Ante una respuesta terminal de confirmación (`400` RF-9, `404` RF-50, `409` RF-24, `429` RF-10),
    muestra el texto de error, desactiva «Ya puse el ícono» y muestra «Pedir otro desafío» sin
    esperar a `00:00`.
  - Pulsar «Pedir otro desafío» (también tras recargar) pide directamente un desafío nuevo con el
    mismo Riot ID y región, sin volver al formulario.
- [ ] **RF-47 (ubicación de errores):** los errores del pedido salen junto al formulario, los de
  confirmación junto a «Ya puse el ícono» y los de «Pedir otro desafío» (incluido `429` de RF-21)
  junto a ese botón.

### 2.3 Datos reales en Perfil, Configuración, Ficha de jugador y Coincidencias (RF-7, RF-12, RF-13, RF-27, RF-33, RF-35, RF-36, RF-40, RF-41, RF-53)
- [ ] **RF-7 y RF-27 (avisos tras verificar y bloques pendientes):**
  - Verificación completa: vuelve a `/perfil` con el aviso «Cuenta de Riot verificada».
  - Verificación con bloques pendientes: muestra «Datos pendientes de Riot Games» en los bloques
    afectados (rango, partidas o nivel del perfil manteniendo el ícono si existe `iconId`) y el
    aviso correcto («…no pudimos leer sus datos…» si faltan rango y partidas; «…algunos de sus
    datos…» en cualquier otra combinación parcial).
- [ ] **RF-40 (marca, nivel e ícono por pantalla):**
  - En Perfil, Configuración y Ficha de jugador (`/jugadores/:id`): marca «Verificada con Riot
    Games», etiqueta «Datos de Riot Games», nivel (`Nivel N`) e ícono de invocador de Data Dragon;
    si la imagen falla al cargar (`onError`), no muestra nada en su lugar.
  - En Coincidencias (`/coincidencias`): muestra «Verificada con Riot Games» y «Datos de Riot
    Games», pero **nunca** el nivel ni el ícono de invocador.
- [ ] **RF-36 (textos de Riot sin traducir):** tier/división tal como entrega Riot (`GOLD II`),
  en `MASTER`/`GRANDMASTER`/`CHALLENGER` solo el tier sin `I`, y nombres de campeones sin traducir.
- [ ] **RF-12 (tabla de partidas reales):** resultado, fecha `dd/mm/aaaa` en zona horaria local,
  duración entera redondeada, `<campeón> · K/D/A` y variación de LP (`+N`/`−N`) o `—` cuando no
  tiene variación.
- [ ] **RF-41, RF-53 y RF-35 (resincronización):**
  - Junto a «Resincronizar» de una cuenta verificada con Riot aparece «Al resincronizar, se vuelven
    a leer tus datos de Riot Games. Puedes hacerlo cada 5 minutos.» (y el texto anterior en cuentas
    sin verificar).
  - Ante resincronización parcial (`200` con `syncNotice`), muestra «No pudimos actualizar algunos
    de tus datos de Riot Games. Resincroniza más tarde para verlos.» conservando los bloques
    previos.
  - Ante `404` de cuenta transferida de región (RF-35), muestra el aviso con el texto de la API y
    conserva la cuenta verificada con sus últimos datos.
- [ ] **RF-13 y RF-33 (cuenta sin clasificar o con rango pendiente):**
  - Muestra «sin clasificar» en lugar del rango en Perfil, Configuración y Ficha de jugador.
  - En Coincidencias de LoL (`/coincidencias`), ante el `409` muestra «necesitas rango en Solo/Dúo
    para buscar en LoL» en lugar de la lista.
- [ ] **Diseño adaptable:** revisar `/verificar/riot`, `/perfil`, `/configuracion`,
  `/jugadores/:id` y `/coincidencias` en **1280 px** y **375 px** (contraste, legibilidad y sin
  desbordamiento en los bloques de la 014).

---

## 3. Guion del recorrido manual con cuenta real de LoL (lo ejecuta el equipo)

Requiere MongoDB local, el cliente de League of Legends abierto con una cuenta real, y una clave
de desarrollo vigente de [Riot Developer Portal](https://developer.riotgames.com/) configurada
solo en `backend/.env` (nunca versionada). Marcar cada paso con fecha y resultado.

- [ ] **Paso 0 — Preparación de clave:** copiar `backend/.env.example` a `backend/.env`, agregar
  `RIOT_API_KEY=RGAPI-...`, levantar backend (`cd backend && npm run dev`) y frontend
  (`cd frontend && npm run dev`), e iniciar sesión en `http://localhost:5173`.
- [ ] **Paso 1 — Pedir el ícono:** abrir Configuración o Perfil, pulsar «Verificar con Riot Games»,
  ingresar el Riot ID real (`Nombre#TAG`) y su región (p. ej. `LAS`), y enviar. Comprobar que
  aparece el ícono de inicio asignado (0–28, distinto del que la cuenta tiene puesto) y la cuenta
  atrás `mm:ss`.
- [ ] **Paso 2 — Confirmar antes de cambiar (opcional):** pulsar «Ya puse el ícono» antes de
  cambiarlo y verificar el `400` «si ya lo cambiaste, Riot puede tardar unos minutos; vuelve a
  intentarlo» junto al botón, sin reiniciar el reloj.
- [ ] **Paso 3 — Ponerse el ícono en el cliente de LoL y confirmar:** en el cliente de LoL ir a
  Perfil → clic en el ícono → elegir el ícono indicado → guardar. Volver a TeamMatchUp y pulsar
  «Ya puse el ícono». Comprobar redirección a `/perfil` con el aviso «Cuenta de Riot verificada».
- [ ] **Paso 4 — Revisar datos reales:** verificar en `/perfil`, `/configuracion` y la ficha del
  jugador: marca «Verificada con Riot Games», etiqueta «Datos de Riot Games», nivel e ícono de
  invocador, rango Solo/Dúo real (o «sin clasificar» si la cuenta no tiene clasificatorias Solo/Dúo
  esta temporada), historial con 1 punto (o 0 si sin clasificar) y últimas partidas Solo/Dúo con
  fecha `dd/mm/aaaa`, duración en minutos y `—` en la variación inicial.
- [ ] **Paso 5 — Volver al ícono propio y resincronizar (RF-15):** esperar 5 minutos (comprobar
  antes que resincronizar devuelve `429` con la espera en minutos), volver al ícono habitual en el
  cliente de LoL y pulsar «Resincronizar». Comprobar que la cuenta **sigue verificada** y que el
  ícono mostrado se actualiza al nuevo ícono propio.
- [ ] **Paso 6 — Cuenta sin clasificar (si aplica):** si se prueba con una cuenta sin rango
  Solo/Dúo, abrir `/coincidencias` en LoL y comprobar el aviso «necesitas rango en Solo/Dúo para
  buscar en LoL».
- [ ] **Paso 7 — Desvincular:** en Configuración desvincular la cuenta de LoL verificada y
  comprobar que desaparece y vuelve a ofrecerse «Verificar con Riot Games».
- [ ] **Paso 8 — Renovación de clave (RF-17):** reemplazar `RIOT_API_KEY` en `backend/.env` por una
  clave nueva, reiniciar el servidor backend y confirmar que `GET /api/riot` sigue devolviendo
  `{ "available": true }` y permite operar con Riot.
- [ ] **Paso 9 — Verificación de seguridad (RNF-4):** ejecutar `git status` y confirmar que
  `backend/.env` no está rastreado ni aparece la clave real en ningún archivo del repositorio ni en
  los registros del servidor.
