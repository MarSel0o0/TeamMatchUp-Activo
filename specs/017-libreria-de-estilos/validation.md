# Validación 017 — Librería de estilos (Mantine) en los componentes base
Estado: implementada y validada por el implementador (2026-11-22); pendiente de la revisión del usuario. Un registro por tarea; cada una anota sus comprobaciones y salidas.
Frontend: `frontend/`. Evidencia reproducible (scripts, medidas y capturas): `specs/017-libreria-de-estilos/evidence/`.

## Índice
| Tarea | Resumen | Estado |
| --- | --- | --- |
| T1 | Línea base visual y de medidas | hecha |
| T2 | Línea base de teclado, accesibilidad y carga | hecha |
| T3 | Dependencias | hecha |
| T4 | Tema inicial: regla pura y pruebas | hecha |
| T5 | Detector de colores literales | hecha |
| T6 | Reglas puras del deslizador, de la desvinculación y del foco | hecha |
| T7 | Tokens nuevos y enlace con el catálogo | hecha |
| T8 | Tema de la librería sin colores literales | hecha |
| T9 | Proveedor, tema inicial y foco global | hecha |
| T10 | Botón, botón de icono e indicador | hecha |
| T11 | Botones de acceso, entrada y barra | hecha |
| T12 | Botones de perfil, configuración, coincidencias, ficha, Steam y Riot | hecha |
| T13 | Botones de agenda y detalle, y estados | hecha |
| T14 | Avisos, sellos y esqueletos | hecha |
| T15 | Campos de texto, área, búsqueda y listas | hecha |
| T16 | Interruptor y deslizadores | hecha |
| T17 | Chips de filtro y «Actualizando» | hecha |
| T18 | Pestañas de juego con panel | hecha |
| T19 | `Slip` sobre la ventana modal y ventana de cancelar | hecha |
| T20 | «Anotar una sesión»: foco estándar | hecha |
| T21 | Ventana de desvincular | hecha |
| T22 | Foco del tema claro en lo que no migra y limpieza | hecha |
| T23 | Recorrido de validación completo | hecha (a la espera de la revisión del usuario) |
| T24 | Cierre documental | hecha |

## Herramientas de la evidencia
- `evidence/capture.mjs`: capturas y medidas (valores calculados, caja, líneas de texto, ancho desplazable) de 25
  escenarios × 1280/375/360 px × tema oscuro/claro, con Chrome real controlado por `playwright-core` (instalado fuera
  del proyecto). Escribe `measures.json` y `shots/*.jpg`.
- `evidence/keys.mjs`: orden de tabulación (1280 y 375), árbol de accesibilidad (`a11y/*.yml`), teclas de los
  deslizadores, contrastes de los controles.
- `evidence/spinners.mjs`, `evidence/pagekeys.mjs`, `evidence/weight.mjs`: indicadores, Re Pág/Av Pág y peso de la página.
- `evidence/compare.mjs`: compara dos `measures.json` con los criterios de RF-3 (colores iguales, caja ±2 px, ni una
  línea más, ancho desplazable nuevo); `evidence/table.mjs`: tabla en Markdown.
- Todo corre contra la interfaz en modo simulado (`VITE_USE_MOCK_API=true`, latencia 120 ms; 4000 ms para los estados
  «Enviando…»). El inicio de sesión y una sesión propia (`session-99`, para ver «Editar» y «Cancelar») los pone el propio script.

## T1 — Línea base visual y de medidas (RF-3, RNF-2, RNF-4, RNF-7)
- **Navegador**: Chrome 159.0.8154.13 (Windows 10), sin extensiones, `locale es-ES`; Firefox y Safari **no** se probaron
  (no hay en este equipo): la comprobación de capas CSS en Firefox (R1) queda para quien lo tenga.
- **Base de código**: rama `feature/vinculacion-steam-riot`, commit `0e730f1`, sin cambios de código (solo `npm ci`
  para restaurar `vitest` y `zustand`, que `package.json` ya declaraba y no estaban en `node_modules`).
- **Capturas**: `evidence/baseline/shots/` (100 JPEG a página completa): 25 escenarios × {1280, 375} px × {oscuro, claro}.
  Escenarios: entrada, acceso, acceso con error, acceso enviando, registro, registro con error, inicio, perfil, perfil con
  otra pestaña, perfil con el formulario de edición, configuración, coincidencias, coincidencias con filtros que no dan
  resultados, agenda, agenda con «Anotar una sesión», con su error de título, con «¿Cancelar esta sesión?», detalle (ajeno,
  propio, edición, cancelar), ficha, verificación con Riot, vuelta de Steam, «no encontrada».
- **Medidas**: `evidence/baseline/measures.json` (150 vistas: las 100 de las capturas y 50 más a 360 px): por elemento
  (botón, chip, pestaña, enlace con forma de botón, campo, área, lista, deslizador, casilla, aviso, sello, esqueleto,
  ventana) el fondo, el color del texto, el borde, el radio, la letra, la caja dibujada (ancho × alto) y las líneas de
  texto; por vista, el ancho desplazable. Muestra (1280 px; cada fila es el primer elemento de su tipo en esa vista):

| Vista | Tipo | Elemento | Fondo | Texto | Borde | Radio | Letra | Caja (ancho×alto) | Líneas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| login__1280__dark | button | Cambiar a tema claro | rgba(255, 255, 255, 0.024) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| login__1280__dark | text | Correo | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 12px | Geist Variable 15px/400 | 380×44.4 | 0 |
| agenda__1280__dark | button | Cambiar a tema claro | rgba(255, 255, 255, 0.024) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| agenda__1280__dark | chip | Todos los juegos | color(srgb 0.803922 0.94902 0.294118 / 0.14) | rgb(238, 240, 242) | 1px rgba(205, 242, 75, 0.38) | 999px | Geist Variable 13px/520 | 132.4×32 | 1 |
| agenda__1280__dark | linkButton | Saltar al contenido | rgb(205, 242, 75) | rgb(12, 15, 2) | 0px rgb(12, 15, 2) | 999px | Geist Variable 15px/600 | 167.4×39.3 | 1 |
| agenda__1280__dark | stamp | La organizas | rgba(205, 242, 75, 0.1) | rgb(205, 242, 75) | 1px rgba(205, 242, 75, 0.38) | 999px | Geist Mono Variable 11px/500 | 118.1×26.7 | 1 |
| agenda-anotar__1280__dark | button | Cambiar a tema claro | rgba(255, 255, 255, 0.024) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| agenda-anotar__1280__dark | chip | Todos los juegos | color(srgb 0.803922 0.94902 0.294118 / 0.14) | rgb(238, 240, 242) | 1px rgba(205, 242, 75, 0.38) | 999px | Geist Variable 13px/520 | 132.4×32 | 1 |
| agenda-anotar__1280__dark | linkButton | Saltar al contenido | rgb(205, 242, 75) | rgb(12, 15, 2) | 0px rgb(12, 15, 2) | 999px | Geist Variable 15px/600 | 167.4×39.3 | 1 |
| agenda-anotar__1280__dark | text | Título | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 12px | Geist Variable 15px/400 | 474×44.4 | 0 |
| agenda-anotar__1280__dark | textarea | Notas (opcional) | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 12px | Geist Variable 15px/400 | 474×96 | 0 |
| agenda-anotar__1280__dark | select | Juego | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 12px | Geist Variable 15px/400 | 474×44.4 | 0 |
| agenda-anotar__1280__dark | stamp | La organizas | rgba(205, 242, 75, 0.1) | rgb(205, 242, 75) | 1px rgba(205, 242, 75, 0.38) | 999px | Geist Mono Variable 11px/500 | 118.1×26.7 | 1 |
| agenda-anotar__1280__dark | slip | Anotar una sesión | rgba(0, 0, 0, 0) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 22px | Geist Variable 15px/400 | 560×676.6 | 7 |
| detalle-editar__1280__dark | button | Cambiar a tema claro | rgba(255, 255, 255, 0.024) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| detalle-editar__1280__dark | linkButton | Saltar al contenido | rgb(205, 242, 75) | rgb(12, 15, 2) | 0px rgb(12, 15, 2) | 999px | Geist Variable 15px/600 | 167.4×39.3 | 1 |
| detalle-editar__1280__dark | text | Título | rgb(18, 20, 24) | rgb(238, 240, 242) | 1px rgba(205, 242, 75, 0.38) | 12px | Geist Variable 15px/400 | 1146×44.4 | 0 |
| detalle-editar__1280__dark | textarea | Notas (opcional) | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.13) | 12px | Geist Variable 15px/400 | 1146×96 | 0 |
| detalle-editar__1280__dark | select | Día | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 12px | Geist Variable 15px/400 | 567×44.4 | 0 |
| detalle-editar__1280__dark | stamp | La organizas | rgba(205, 242, 75, 0.1) | rgb(205, 242, 75) | 1px rgba(205, 242, 75, 0.38) | 999px | Geist Mono Variable 11px/500 | 118.1×26.7 | 1 |
| coincidencias__1280__dark | button | Cambiar a tema claro | rgba(255, 255, 255, 0.024) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| coincidencias__1280__dark | tab | League of Legends | rgba(0, 0, 0, 0) | rgb(13, 14, 16) | 0px rgb(13, 14, 16) | 999px | Geist Variable 13px/620 | 165.3×38 | 1 |
| coincidencias__1280__dark | linkButton | Saltar al contenido | rgb(205, 242, 75) | rgb(12, 15, 2) | 0px rgb(12, 15, 2) | 999px | Geist Variable 15px/600 | 167.4×39.3 | 1 |
| coincidencias__1280__dark | text | Buscar jugador | rgb(14, 16, 19) | rgb(238, 240, 242) | 1px rgba(255, 255, 255, 0.07) | 999px | Geist Variable 15px/400 | 240×44.4 | 0 |
| coincidencias__1280__dark | range | Diferencia máxima de rango25 pts | rgba(0, 0, 0, 0) | rgb(238, 240, 242) | 0px rgb(238, 240, 242) | 0px | Geist Variable 15px/400 | 240×22 | 0 |
| coincidencias__1280__dark | check | Solo cuentas verificadas | rgb(30, 34, 40) | rgb(162, 169, 179) | 1px rgba(255, 255, 255, 0.13) | 999px | Geist Variable 13px/400 | 36×20 | 0 |
| perfil__1280__light | button | Cambiar a tema oscuro | rgba(14, 17, 22, 0.024) | rgb(71, 78, 88) | 1px rgba(14, 17, 22, 0.16) | 50% | Geist Variable 15px/400 | 40×40 | 0 |
| perfil__1280__light | tab | League of Legends | rgba(0, 0, 0, 0) | rgb(13, 14, 16) | 0px rgb(13, 14, 16) | 999px | Geist Variable 13px/620 | 165.3×38 | 1 |
| perfil__1280__light | linkButton | Saltar al contenido | rgb(198, 238, 53) | rgb(12, 15, 2) | 0px rgb(12, 15, 2) | 999px | Geist Variable 15px/600 | 167.4×39.3 | 1 |
| perfil__1280__light | stamp | Sin verificar | rgba(168, 102, 12, 0.1) | rgb(152, 92, 11) | 1px rgba(241, 178, 74, 0.35) | 999px | Geist Mono Variable 11px/500 | 125.1×26.7 | 1 |

- **Hechos de la línea base que conviene no confundir con una regresión**:
  - **Coincidencias a 375 y 360 px ya se desplaza 1 px a lo ancho hoy** (`scrollWidth` 376 > 375 y 361 > 360, en los dos
    temas); el resto de vistas no se desplaza. «Sin ancho desplazable nuevo» (RNF-2) se mide contra esto.
  - Los bloques de la semana de la agenda parten su texto en dos líneas a 375 y 360 px (son parte de la hoja semanal,
    que no migra).
  - «Líneas» cuenta solo los nodos de texto del elemento (los iconos no cuentan); los campos y las listas valen 0.
- **Hecho cuando**: capturas, tabla de medidas y navegador anotados y enlazados. ✔

## T2 — Línea base de teclado, accesibilidad y carga (RF-11, RF-17, RF-20, RNF-3, RNF-7)
No se tocó ningún archivo de `frontend/src/` para medir (la interfaz era la de hoy).
- **Orden de tabulación** (1280 y 375 px, tema oscuro): `evidence/baseline/keys.json` → `tabOrder`. Tope de 90
  paradas (configuración y agenda tienen más por sus celdas de horas y bloques). Extracto a 1280 px:

- login (1280): a: TeamMatchUp → button[button]: Cambiar a tema claro → input[email]: Correo → input[password]: Contraseña → button[submit]: Entrar → button[button]: Rellenar esos datos → a: Crear una
- registro (1280): a: TeamMatchUp → button[button]: Cambiar a tema claro → input[text]: Nombre → input[text]: Usuario → input[email]: Correo → input[password]: Contraseña → input[password]: Repite la contraseña → button[submit]: Crear cuenta → a: Entrar
- perfil (1280): a: Saltar al contenido → a: TeamMatchUp, inicio → a: Mi ficha → a: Coincidencias → a: Agenda → a: Configuración → button[button]: Cambiar a tema claro → button[button]:  → a: Editar ficha → a: Vincular otra cuenta → tab: League of Legends → tab: Rainbow Six Siege → tab: Counter-Strike 2 → button[button]: Resincronizar → a: Editar horas
- coincidencias (1280): a: Saltar al contenido → a: TeamMatchUp, inicio → a: Mi ficha → a: Coincidencias → a: Agenda → a: Configuración → button[button]: Cambiar a tema claro → button[button]:  → tab: League of Legends → tab: Rainbow Six Siege → tab: Counter-Strike 2 → input[search]: Buscar jugador → input[range]: Diferencia máxima de rango25 pts → input[range]: Horas en común por semana2 h → input[checkbox]: Solo cuentas verificadas → button[button]: Restablecer criterios → a: Fernanda Soto → button[button]: Proponer → button[button]: Ver horas en común → a: Isidora Campos → button[button]: Proponer → button[button]: Ver horas en común → a: Renata Bustos → button[button]: Proponer
- ficha (1280): a: Saltar al contenido → a: TeamMatchUp, inicio → a: Mi ficha → a: Coincidencias → a: Agenda → a: Configuración → button[button]: Cambiar a tema claro → button[button]:  → tab: League of Legends → tabpanel: League of LegendsRiot ID · Ignxcia#099Da → button[button]: Proponer sesión
- riot (1280): a: Saltar al contenido → a: TeamMatchUp, inicio → a: Mi ficha → a: Coincidencias → a: Agenda → a: Configuración → button[button]: Cambiar a tema claro → button[button]:  → input[text]: Riot ID → select[select-one]: Región → button[submit]: Pedir ícono de verificación → button[button]: Volver
- detalle (1280): a: Catalina Leiva → a: Felipe Navarro → button[button]: Unirme

- **Árbol de accesibilidad** de cada vista a 1280 px: `evidence/baseline/a11y/<vista>.yml` (nombre, rol y estado).
- **Teclas de los deslizadores** (`keys.json` → `sliders`; Re Pág y Av Pág desde seis valores en `pagekeys.json`):

| Deslizador (rango, paso) | Parte de | → | ← | ↑ | ↓ | Inicio | Fin | Re Pág | Av Pág |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Diferencia máxima de rango (0–50, 5) | 25 | 30 | 20 | 30 | 20 | 0 | 50 | 30 | 20 |
| Horas en común por semana (0–12, 1) | 4 | 5 | 3 | 5 | 3 | 0 | 12 | 5 | 3 |

  Re Pág / Av Pág desde otros valores — rango: 0→5/0, 5→10/0, 20→25/15, 45→50/40, 50→50/45; horas: 0→1/0, 1→2/0,
  6→7/5, 11→12/10, 12→12/11. Regla que lo explica (la hipótesis del plan §5.3, que las 24 mediciones confirman):
  salto = máx((máx − mín) / 10, paso), ajustado al paso y acotado al rango. «Solo cuentas verificadas»: Espacio la
  marca (de falso a verdadero).
- **Color calculado de los indicadores giratorios** (RF-17, `baseline/spinners.json`): los dos piden `color: var(--pen)`,
  un token que no existe; el valor no es válido al calcularse y el color se **hereda del contenedor**.

| Indicador | Contenedor | Oscuro | Claro |
| --- | --- | --- | --- |
| «Leyendo…»/«Cargando…» (`Working`) | `.blank` (`--ink-2`) | rgb(162, 169, 179) | rgb(71, 78, 88) |
| «Actualizando» de coincidencias | `.page-head` (`--ink`) | rgb(238, 240, 242) | rgb(16, 18, 22) |
| «Actualizando» de la agenda | `.agenda__filters` (`--ink`) | rgb(238, 240, 242) | rgb(16, 18, 22) |
| Dentro de un botón | el color del texto del botón (`currentColor`) | — | — |

  **Consecuencia para T13 y T17**: el indicador es `currentColor` del contenedor; no hace falta `--spinner-ink`.
  Tamaño: 13 × 13 px, borde de 1,5 px declarado (calculado 1 px), giro de 640 ms.
- **Contrastes de hoy** (`keys.json` → `contrast`; cálculo sobre el fondo compuesto de los ancestros, sin degradados):
  los campos (`input`, `select`, `textarea`) tienen **borde de 1,18:1 a 1,20:1** (por debajo de 3:1) en los dos temas, con
  texto de 15,5 a 16,7:1; el sello «Sin verificar» en claro mide 4,15:1; el botón de tema de la entrada en claro, 2,28:1
  (la medida sobre fondos translúcidos con imagen no es fiable). Se anotan como lo que **ya** no cumple hoy (RNF-3): la
  migración no los empeora, y la spec solo exige 3:1 al borde de foco (RF-20).
- **RNF-7 — lo que descarga la pantalla de acceso** (construcción de producción con `VITE_USE_MOCK_API=true`, `vite
  preview`, Chrome con la caché vacía, `evidence/weight.mjs`): `/login`: **JS 411,35 kB, CSS 34,31 kB, fuentes 51,30 kB,
  10 archivos**; `/registro`: 410,97 kB / 34,31 kB; `/`: 421,23 kB / 44,18 kB. Paquete principal `index-*.js` 414,22 kB
  (135,76 kB con gzip) e `index-*.css` 34,47 kB (8,15 kB con gzip). La pantalla de acceso no descarga el código de la
  agenda ni de las coincidencias. Medida **antes** de la librería; T23 la repite.
- **Hecho cuando**: tabla de teclas, color de los indicadores, contrastes y tamaño anotados. ✔

## T3 — Dependencias (RNF-1)
- `npm view @mantine/core versions`: la última 8.3.x es **8.3.18** (la 9.x, etiqueta `latest` 9.8.2, exige React 19; fuera de alcance).
  `npm view @mantine/core@8.3.18 peerDependencies`: `react ^18.x || ^19.x`, `react-dom` igual y `@mantine/hooks 8.3.18`.
- `npm install --save-exact @mantine/core@8.3.18 @mantine/hooks@8.3.18` terminó sin avisos de incompatibilidad.
- `git diff package.json`: solo dos líneas nuevas en `dependencies`, `"@mantine/core": "8.3.18"` y `"@mantine/hooks": "8.3.18"` (sin
  `^`); ninguna dependencia de desarrollo nueva.
- `npm ls react react-dom @mantine/core @mantine/hooks`: un único `react@18.3.1` y `react-dom@18.3.1` (todo `deduped`), las dos de
  Mantine en 8.3.18. `npm ls vite`: un único `vite@5.4.21`. `npm audit` informa 14 vulnerabilidades que ya estaban antes de la
  instalación (mismas cifras tras `npm ci`); ninguna es de Mantine.
- Verde en el frontend (T3 y posteriores): ver el cierre de cada tarea; al terminar T3, `npm test`, `typecheck`, `lint` y `build`
  sin errores.

## T4 — Tema inicial: regla pura y pruebas (RF-5, RF-7, RNF-6)
- **Rojo** (`src/domain/themeChoice.test.ts` con las tres firmas lanzando `T4: sin implementar`): 15 pruebas falladas y 1 pasada
  (la del texto sin `import`, que no depende de la implementación); todas con `Error: T4: sin implementar`.
- **Verde**: `themeChoice.test.ts` 16 pruebas (los seis casos de `chooseInitialTheme`; `bootTheme` con lectura que lanza, valor
  extraño y sin `matchMedia`; la función serializada con `toString()` ejecutada en `node:vm` sin globales; el script completo
  de `buildBootScript` con un almacén y un documento falsos: lee solo la clave dada, escribe `data-theme` y
  `data-mantine-color-scheme` con el mismo valor y no escribe en el almacenamiento).
- El archivo no importa nada ni usa reloj. `buildBootScript(clave)` es lo que inyectará el plugin de T9.

## T5 — Detector de colores literales (RF-2, RNF-6)
- **Rojo** (`src/theme/colorLiterals.test.ts`): 17 pruebas falladas, todas con `Error: T5: sin implementar`.
- **Verde**: 17 pruebas. `findColorLiterals(valor)` (hexadecimales de 3, 4, 6 y 8 dígitos, funciones de color con su contenido,
  nombres de color; ignora `transparent`, `currentColor`, `inherit`, `initial`, `unset`, `revert`, `var(--x)`, cadenas,
  `url()` y comentarios) y `findColorLiteralsInCss(css)` (solo los valores de las declaraciones, con su propiedad).

## T6 — Reglas puras (RF-11, RF-12, RF-22, RF-23 a RF-25)
- **Rojo** (`dial`, `unlinkDialog` y `draftFocus`, firmas con `T6: sin implementar`): 44 pruebas falladas, todas por esa causa.
- **Verde**: `dial.test.ts` 17 (con la tabla de T2: 24 valores medidos), `unlinkDialog.test.ts` 11, `draftFocus.test.ts` 16. Ninguno
  importa React, el DOM ni `services/` ni usa reloj. La regla de Re Pág/Av Pág sale de la tabla medida (`pagekeys.json`).
- Suite completa tras T4 a T6: 182 pruebas en verde (105 de la 016 + 77 nuevas), `typecheck` y `lint` sin errores.

## T7 — Tokens nuevos y enlace con el catálogo (RF-2, RF-14, RF-20)
- **Rojo** (`src/domain/games.test.ts`, escrito antes de tocar `tokens.css` ni `games.ts`): 18 pruebas falladas y 1 pasada (el
  catálogo tiene los tres juegos), todas por `expected undefined to be '#c8963e'…` (los tokens y `inkVar` no existen).
- **Verde**: 19 pruebas. `tokens.css` solo gana 24 líneas (`git diff --stat`: 24 inserciones, 0 borrados): `--btn-pen-shadow`,
  `--danger-edge`, `--btn-orb-bg`, `--ok-edge`, `--warn-edge`, `--tab-ink`, `--tab-pill-shadow`, `--game-ink-lol/r6/cs2`
  (`#c8963e`/`#3ea0c8`/`#d97a45`, iguales en los dos temas), `--focus-ring: var(--accent-text)`, `--focus-edge` y `--focus-halo`
  (oscuro: `--volt-edge` y `--volt-wash`; claro: `--focus-ring` y `color-mix(in srgb, var(--focus-ring) 75%, transparent)`).
  `GameDefinition.inkVar` (`var(--game-ink-<id>)`) en cada juego; `accent` se queda.
- **Contrastes medidos** del tema claro (cálculo con los valores reales de `tokens.css`):

| Fondo | `--focus-ring` `#4a6800` | halo al 75 % contra ese fondo |
| --- | --- | --- |
| `--surface` `#fff` (panel, ventana, campo con foco) | 6,42:1 | 3,67:1 |
| `--surface-2` | 6,20:1 | 3,60:1 |
| `--surface-sunk` | 5,82:1 | 3,46:1 |
| `--surface-3` | 5,53:1 | 3,35:1 |
| `--bg` | 5,52:1 | 3,35:1 |
| `--bg-deep` | 5,08:1 | 3,18:1 |
| `--volt` (botón primario) | 4,79:1 | 3,01:1 |

  Todos ≥ 3:1: **el halo se queda en el 75 %** (no hace falta subirlo). Las superficies translúcidas (barra, menú) se miden sobre
  el color compuesto en T22/T23.

## T8 — Tema de la librería sin colores literales (RF-1, RF-2, RF-4, RNF-6)
- Importar `@mantine/core` en Node dentro de Vitest funciona (R8 no se materializa): `DEFAULT_THEME`, `mergeMantineTheme` y
  `defaultCssVariablesResolver` se usan directamente.
- Archivos: `src/theme/tokenPalettes.ts` (15 paletas de 10 `var(--token)`), `cssVariablesResolver.ts` (cuerpo, texto, error,
  marcador, ancla, deshabilitado, bordes y contraste, iguales en los dos esquemas), `mantineTheme.ts` (`primaryColor: 'volt'`,
  `primaryShade: 6`, radios, espaciado, tamaños de letra y sombras de los tokens, `respectReducedMotion`, `focusClassName:
  'tmu-focus'`, `activeClassName: 'tmu-active'`, `defaultGradient` sobre `volt`) y `mantineCss.ts` (hojas `*.layer.css` de los
  componentes usados; nunca `baseline` ni `default-css-variables`).
- `src/theme/themeColors.test.ts`: 13 pruebas (a a e del plan §9.1; el punto f lo cubre `colorLiterals.test.ts`).
  **Primera ejecución (rojo por la razón correcta, con los módulos ya escritos)**: 2 fallos: (1) `defaultGradient.from: blue` y
  `.to: cyan` (nombres de paleta de la librería que el detector toma por colores: se reemplazó por `volt`) y (2) cinco literales
  de las hojas de la librería sin explicar. **Verde** tras la corrección y la lista de admitidos:
  `Button.layer.css` y `ActionIcon.layer.css`: `rgba(255, 255, 255, 0.15)` y `rgba(0, 0, 0, 0.15)` (destello del estado `loading`, que
  la interfaz no usa, DT-12); `Overlay.layer.css`: `rgba(0, 0, 0, 0.6)` (respaldo de `--overlay-bg`, que `modal.css` fijará con
  `--scrim`). Un literal nuevo en una hoja importada haría fallar la prueba.
- Verde en el frontend: `npm test` 214 pruebas, `typecheck`, `lint`, `build`.

## T9 — Proveedor, tema inicial y foco global (RF-4 a RF-7, RF-20, RNF-8)
- `vite.config.ts`: plugin `themeBootPlugin` que inyecta `buildBootScript('tmu.theme')` (la regla de `domain/themeChoice.ts`).
  **Desviación del plan**: va al final de `<head>` (`injectTo: 'head'`), no al principio, porque el script mide más de 1 kB y
  empujaría `<meta charset>` fuera de los primeros 1024 bytes; sigue siendo un script clásico y bloqueante (corre antes de la
  primera pintura). La clave sale de `src/config/themeKey.ts`, que comparten `config/env.ts` y `vite.config.ts`.
- `index.html` sin el script en línea (queda un comentario). `ThemeProvider` usa `AppMantineProvider` (`forceColorScheme`,
  `defaultColorScheme`, gestor inerte, tema y resolvedor de T8, `withGlobalClasses`, `withStaticClasses`) y `writeThemeMarks`
  escribe `data-theme` y `data-mantine-color-scheme` juntos. `main.tsx` importa `theme/mantineCss`, `styles/global.css` y
  `theme/componentCss` (por ahora solo `focus.css`) en ese orden. `global.css`: el indicador global (`:focus-visible` y
  `[tabindex='-1']:focus`) pasa a `--focus-ring`, mismo grosor (2 px) y separación (3 px).
- **Comprobaciones con Chrome** (`evidence/themecheck.mjs`, contra `npm run dev` y contra la construcción de producción con
  `vite preview`; 16 de 16 en las dos): antes de que cargue React (con todo el código bloqueado) el script fija las dos marcas para
  guardado «light» con sistema oscuro, «dark» con sistema claro, sin guardado con sistema claro y oscuro, valor extraño con los dos
  sistemas y almacenamiento bloqueado con los dos sistemas; con la aplicación, el fondo calculado es el del tema (`rgb(236, 238,
  241)` en claro) desde el primer fotograma; las entradas del almacenamiento son `tmu.theme` y las de siempre, **ninguna de la
  librería (`mantine-color-scheme-value`)**; cambiar el tema del sistema en caliente no cambia la página; cambiar `tmu.theme` desde
  otra pestaña (evento `storage`) tampoco; el botón de tema cambia las dos marcas, guarda el valor, actualiza `theme-color`
  (`#eceef1`), fija el origen del círculo (`--theme-x`) y es la única entrada de tema.
- **Foco** (Tab sobre la entrada): oscuro, `outline` 2 px sólido `rgb(205, 242, 75)` con 3 px de separación (igual que la línea
  base); claro, `rgb(74, 104, 0)` (`#4a6800`), 2 px y 3 px.
- **Comparado con la línea base** (`compare.mjs`, 1280 y 375 px, los dos temas, todas las vistas): **0 diferencias** en 2486 elementos
  a 1280 px y en 2350 a 375 px, salvo `perfil-editar`, cuyas 19 celdas de la hoja de horas medían distinto entre dos ejecuciones
  del mismo código (entran con una animación escalonada de ~2 s). Se repitió esa vista con 3 s de espera (dos ejecuciones iguales
  entre sí: 0 diferencias) y se sustituyó su línea base (`perfil-editar` en `baseline/`), medida ya con ese tiempo.
- Verde en el frontend. **Punto de control del bloque A**: ver el final de este archivo.

## T10 — Botón, botón de icono e indicador (RF-1, RF-2, RF-8, RF-17, RF-18)
- Componentes: `AppButton` y `ButtonLink` (sobre `Button`), `IconButton` (sobre `ActionIcon`) y `Spinner` (sobre `Loader` con tipo
  propio), con `theme/components/button.css`, `icon-button.css` y `loader.css` (solo tokens) y `components.*.extend` en
  `mantineTheme.ts`. `blocked` = `aria-disabled="true"`, ignora el clic y no se deshabilita.
  **Decisión de forma**: `pending`, `icon` y `orb` del plan no son propiedades: el icono, el texto, el indicador y el círculo
  siguen siendo hijos directos del botón (como siempre), y con una escritura en curso el llamador pasa `disabled` y cambia el
  icono por `<Spinner />`. `inner` y `label` de la librería son `display: contents`, así que la disposición es la misma.
- **Vista temporal** (`/__preview`, retirada al terminar) con 12 variantes (normal, `pen`, `quiet`, `danger` × `sm`, `md`, `lg`) en
  reposo, deshabilitadas con indicador y bloqueadas, más a todo el ancho, con círculo y de icono, comparadas con el botón de
  siempre en Chrome, en los dos temas y a 1280 y 375 px: **39 pares × 4 combinaciones, 19 propiedades calculadas** (fondo, texto,
  borde, radio, letra, sombra, opacidad, relleno, hueco…) y caja ±1 px, **0 diferencias** (la única diferencia, el relleno
  interno del botón de icono, 0 px frente a 1 px 6 px, no se ve: el icono va centrado en 36 px). Con el puntero encima y pulsado:
  **148 comparaciones, 0 diferencias** (fondo, texto, borde, sombra, opacidad y desplazamiento del icono).
- Cambiar `--btn-pen-shadow` y `--volt` desde las herramientas cambia la sombra y el fondo del botón primario (con 500 ms de espera
  por la transición). `blocked`: conserva el foco tras Tab y tras un clic y no se deshabilita (`aria-disabled="true"`,
  `disabled=false`); deshabilitado: `disabled` y texto «Enviando…» visible; el enlace es una `<a href>` (rol de enlace).
- Verde en el frontend.

## T11 — Botones de acceso, entrada y barra (RF-1, RF-8, RF-18)
- `LoginPage`, `RegisterPage`, `LandingPage`, `NotFoundPage`, `ErrorBoundary` (con su propio `AppMantineProvider`, porque vive
  fuera de los proveedores), `AppLayout` (cerrar sesión de la barra con `IconButton`, del menú con `AppButton`) y `ThemeToggle`
  (`IconButton`; se retira `themeToggle.css`). Se retira `.dock__icon-btn` de `appLayout.css`.
- **Comparado con la línea base** (1280 y 375 px, dos temas): `landing`, `login`, `login-error`, `login-enviando`, `registro`,
  `registro-error`, `inicio`, `no-encontrada` y `steam`: la primera pasada detectó una diferencia real (el enlace «Entrar» de la
  entrada, `btn--quiet`, tomaba el texto `--ink-2` en lugar de `--ink`, porque `a.btn` ganaba a `.btn--quiet`); se corrigió en
  `button.css` y quedó en **0 diferencias** (968 elementos las demás vistas + 412 la entrada).
- Doble clic en «Entrar» (servidor simulado lento): el botón queda deshabilitado con «Enviando…» y el indicador; «Cambiar a tema
  oscuro/claro» y «Cerrar sesión» conservan nombre accesible y título; el icono del botón de tema gira; sin errores de consola.
  Ningún `className="btn` queda en esos archivos.

## T12 — Botones de perfil, configuración, coincidencias, ficha, Steam y Riot (RF-1, RF-8)
- Migrados con un conversor temporal (borrado al terminar) y revisados a mano: `ProfilePage`, `SettingsPage`, `AccountRow`,
  `LinkAccountForm`, `MatchesPage`, `MatchEntry`, `MatchFiltersPanel`, `PlayerPage`, `ProposeSessionAction`, `SteamVerifyButton`,
  `RiotVerifyButton`, `RiotVerifyPage`. Los selectores de CSS de vista que apuntaban a `.btn` pasan a `.tmu-btn`
  (`profilePage.css`, `riotVerifyPage.css`, `matchEntry.css`, `playerPage.css`).
- Primera comparación: 8 diferencias a 375 px (en «Editar ficha» y los dos botones de la verificación con Riot, que ocupaban todo el
  ancho por una regla `.ficha__head .btn` / `.riot-verify__footer .btn` de los CSS de vista); corregidas con los selectores nuevos.
  **Comparado con la línea base** (inicio, perfil, perfil con otra pestaña, perfil con edición, configuración, coincidencias, con
  filtros, ficha, riot, acceso, registro y entrada; 1280, 375 y 360 px, dos temas): **0 diferencias en 2984 elementos**.

## T13 — Botones de agenda y detalle, y estados (RF-1, RF-8, RF-17)
- Migrados: `SchedulePage` (botones; también «Actualizando» pasa a `<Spinner label="Actualizando" />`), `SessionSlip`,
  `SessionActionsZone`, `SessionEditForm`, `SessionDetailPage`, `CancelSessionDialog`, `SessionDraftSlip` y `States.tsx`
  (`Failure` con `blocked={retryBusy}`; `Working` con `<Spinner />`). `ErrorBoundary`, `Failure` y los demás botones conservan sus textos.
- **Hallazgo de la comparación**: `ButtonLink` descartaba `aria-label` (el nombre «Ver detalle de <título>» de «Ver detalle»), porque
  TypeScript no comprueba las propiedades con guion; ahora reenvía el resto de propiedades del enlace. Tras la corrección:
  **0 diferencias en 3342 elementos** (agenda, anotar, anotar con error, cancelar, detalle ajeno, propio, con edición y con cancelar,
  «no encontrada» y coincidencias con filtros).
- Indicadores: «Leyendo…» toma `currentColor` del estado vacío: oscuro `rgb(162, 169, 179)`, claro `rgb(71, 78, 88)` (los de T2); no se
  añade `--spinner-ink`. Ningún `className="btn` queda en `src/`.

## T14 — Avisos, sellos y esqueletos (RF-1, RF-2, RF-15, RF-16, RF-17)
- `Notice` (sobre `Paper`, `component="p"`, `data-variant` neutral | pen | error; rol explícito `alert` o `status`, o ninguno),
  `Stamp` (sobre `Badge`, `component="span"`; `title`, `role="status"` solo con `announce`, estado de «estampar» con la
  clase `tmu-stamp--pressing`) y `SheetSkeleton` (sobre `Skeleton` con `animate={false}`), con `notice.css`, `badge.css` y
  `skeleton.css` (solo tokens: `--danger-edge`, `--ok-edge`, `--warn-edge`). Migrados los 20 avisos de las vistas y el aviso de
  errores de escritura (`MutationNotice`); los 9 sellos pasan por `Stamp`. Se retira el tono «peligro» de los sellos (DT-16, N7).
  Los CSS de vista que apuntaban a `.notice` (`playerPage.css`, `sessionDraftSlip.css`) pasan a `.tmu-notice`.
- **Comparado con la línea base** (todas las vistas y estados, 1280 y 375 px, dos temas): **0 diferencias en 4836 elementos**
  (avisos, sellos y esqueletos incluidos, medidos con los selectores nuevos y los de siempre).
- **Árbol de accesibilidad** (`keys.mjs` contra `baseline/a11y/*.yml`, 13 vistas): sin diferencias en roles, nombres ni estados de
  avisos y sellos. La única diferencia es la del botón «Cerrar sesión» de la barra (T11): su nombre y su título son los mismos, pero
  el icono, que antes se anunciaba como una imagen con el mismo nombre dentro del botón, ahora es decorativo (el nombre lo da el
  botón). El orden de tabulación de las 26 vistas medidas es el mismo (solo cambia cómo el script rotula ese botón).
- `--danger-edge`, `--ok-edge` y `--warn-edge` salen de `tokens.css`; cambiarlos cambia el borde correspondiente.

## T15 — Campos de texto, área, búsqueda y listas (RF-1, RF-2, RF-9, RF-10, RF-19, RF-20)
- `TextField` (`TextInput`), `TextAreaField` (`Textarea`, sin alto automático), `SearchField` (`TextInput type="search"` con icono) y
  `SelectField` (`NativeSelect`, lista nativa del navegador), con `field.css` y los `components.*.extend` de `mantineTheme.ts`
  (clases `tmu-field*` y orden etiqueta, campo, pista, error). Migrados los 12 campos de texto, los 4 áreas, los 14 `select` y la
  búsqueda. Foco con `--focus-edge` y `--focus-halo`; el error (`aria-invalid="true"`) manda sobre el foco.
- **Comparado con la línea base** (acceso, registro con y sin errores, configuración, coincidencias con y sin filtros, anotar una
  sesión con y sin error, edición del detalle y verificación con Riot; 1280, 375 y 360 px, dos temas): **0 diferencias salvo la
  declarada** (RNF-2, punto 6): el color del borde del campo enfocado en el tema claro (`rgba(100, 140, 0, 0.42)` →
  `rgb(74, 104, 0)` = `#4a6800`). 2786 elementos.
- **Límites**: «Título» (60) con 80 caracteres → 60; con 70 emojis → 60 puntos de código; con 55 caracteres más una composición de 10 (IME
  por `Input.imeSetComposition`) → 60; «Notas» (160) con 200 → 160; «Cómo juegas» (200 contado como hoy) con 250 → 200, con su contador
  «200/200 caracteres» (fuera del campo, sin ligar a él: `aria-describedby` vacío, como hoy).
- **Listas**: «Juego» (3 opciones, LoL primero), «Día» (7, Lunes a Domingo, elegido Lunes), «Hora de inicio» (14, 12:00 a 01:00,
  elegido 20:00), «Duración» (4: 1 a 4, elegido 2) y «Cupos» (5: 2 a 6, elegido 5): mismas opciones, orden, valores y opción elegida.
- **Errores**: en el registro vacío, cada campo queda `aria-invalid="true"` y descrito por su error (`role="alert"`); sin error,
  la librería pone `aria-invalid="false"` (el atributo estaba ausente: es equivalente para un lector de pantalla). El nombre
  accesible es la etiqueta («Correo»).
- **Foco en el tema claro** (en una entrada dentro de la ventana, en una lista y en un área de texto): borde `rgb(74, 104, 0)` y halo
  `color-mix(… 75 %)`, 3,67:1 y 6,42:1 contra el panel (ver T7); sin contorno (`outline: none`).
- Ningún `className="select`, `"textarea`, `"input` queda en `src/`. Verde en el frontend.

## T16 — Interruptor y deslizadores (RF-1, RF-2, RF-11, RF-19, RF-20)
- `SwitchField` (`Switch`) y `SliderField` (`Slider` con `thumbLabel={dialName(…)}`, Re Pág y Av Pág por `pageStepValue` en un
  `onKeyDownCapture` del envoltorio, clic en la etiqueta que lleva el foco a la miniatura, miniatura deshabilitada con `tabindex="-1"` y
  `aria-disabled="true"` puestos en cada render), con `switch.css` y `slider.css`. Se fija `--slider-size: 9px` para que la pista, la barra
  y el recorrido de la miniatura coincidan con los del navegador; el indicador de foco va alrededor de todo el control
  (`:has(.thumb:focus-visible)`), como el del `input` de siempre. `MatchFiltersPanel` migrado.
- **Comparado con la línea base** (coincidencias con y sin filtros, 1280, 375 y 360 px, dos temas): el deslizador (caja 240 × 22 px, color,
  borde y letra) **sin diferencias**; las del interruptor eran solo la letra de la pista (6 px/600 de la librería, sin texto) y se igualó
  (`font: inherit`). Captura nueva y de la línea base a la vista: pista, barra, miniatura con su halo, interruptor y campo de
  búsqueda iguales.
- **Teclado** (Chrome, contra `baseline/keys.json` y `pagekeys.json`): las 8 teclas desde 25 en «Diferencia máxima de rango» y desde 4 en
  «Horas en común», más Re Pág y Av Pág desde 6 valores de cada uno: **todas dejan el mismo valor que en la línea base**. El filtro se
  aplica sin recargar (6 → 1 resultados con 0 pts) y la etiqueta y el nombre cambian con el valor («Diferencia máxima de rango 0 pts»).
- Nombre accesible de la miniatura «Diferencia máxima de rango 25 pts» y «Horas en común por semana 2 h»; `aria-valuenow` 25, min 0, max
  50 (12 en el otro); sin descripción ni texto de valor. «Solo cuentas verificadas» es un `switch`: Espacio y un clic en el texto
  lo cambian.
- **Deshabilitado** (`MatchFiltersPanel disabled`, en una vista temporal retirada al terminar; el modo simulado no devuelve el conflicto de
  Premier): búsqueda, interruptor y «Restablecer criterios» `disabled`; las dos miniaturas con `tabindex="-1"` y `aria-disabled="true"`,
  sin recibir el foco con Mayús+Tab ni cambiar de valor con teclas o clics.
- Ningún `className="slider` ni `"check` queda en `src/`. Verde en el frontend.
- **RNF-7 (aviso)**: con Mantine en el paquete principal, `npm run build` da `index-*.js` de 508,74 kB (163,33 kB con gzip; antes 414,22 kB) y
  `index-*.css` de 95,94 kB (17,61 kB con gzip; antes 34,47 kB); Rollup avisa de que supera 500 kB (aviso, no error). T23 lo mide con la
  pantalla de acceso.

## T17 — Chips de filtro y «Actualizando» (RF-1, RF-2, RF-14, RF-17)
- `FilterChip` (sobre `UnstyledButton`, no sobre el `Chip` de la librería, que es una casilla: DT-11) con `chip.css`; `--chip-ink` recibe
  `GameDefinition.inkVar` (`--game-ink-*`); «Todos los juegos» no la fija y cae al volt. Los dos «Actualizando» ya eran
  `<Spinner label="Actualizando" />` desde T13 (sin rol, con `aria-label`, color heredado del contenedor, el de T2).
- **Comparado con la línea base** (agenda, anotar y cancelar; 1280, 375 y 360 px, dos temas): **0 diferencias en 2256 elementos**.
- **Comportamiento** (Chrome, dos temas): un solo chip pulsado a la vez (`aria-pressed`) y el filtro sigue saliendo del almacén de la agenda;
  LoL pulsado: borde y punto `rgb(200, 150, 62)` y tinte `color(srgb … / 0.14)`; R6 `rgb(62, 160, 200)`; CS2 `rgb(217, 122, 69)`;
  «Todos»: borde `rgba(205, 242, 75, 0.38)` en oscuro y `rgba(100, 140, 0, 0.42)` en claro (`--volt-edge`) y tinte del volt. Cambiar
  `--game-ink-lol` a `rgb(1, 2, 3)` cambia a la vez el punto, el borde y el tinte del chip de LoL, sin recargar. Foco: `2px solid
  rgb(205, 242, 75)` (oscuro) y `rgb(74, 104, 0)` (claro), +3 px, una vez acabada la transición (`transition: all`, como antes).
- **Punto de control del bloque B**: ver el final de este archivo.

## T18 — Pestañas de juego con panel (RF-1, RF-2, RF-13, RF-20)
- `GameTabs` sobre `Tabs` (`Tabs.List`, `Tabs.Tab`, un `Tabs.Panel` con `tabIndex={0}`), con `tabs.css` (la píldora con `motion` y la tinta
  `inkVar`, el punto, `--tab-ink`, `--tab-pill-shadow`); la raíz es `display: contents` (la disposición no cambia). Perfil (`profile-games`),
  coincidencias (`matches-games`, el panel contiene el aviso de horas, los criterios y «Jugadores compatibles») y ficha (`player-games`) usan
  el patrón; ids `{idBase}-tab-{juego}` y `{idBase}-panel-{juego}`. Se retiran `tabKeys.ts` (`nextTabIndex`), `gameTabs.css` y la regla del
  panel de `playerPage.css`.
- **Hallazgo**: la librería mueve el foco con Inicio y Fin pero no elige la pestaña (las flechas sí); la ficha de hoy sí la elegía. `GameTabs`
  añade esa elección en `onKeyDown` de cada pestaña; tras la corrección, las tres vistas se comportan como la ficha de hoy.
- **Comparado con la línea base** (perfil con las dos pestañas, coincidencias con y sin filtros y ficha; 1280, 375 y 360 px): 0 diferencias
  salvo el borde del campo enfocado en claro (declarada). 1000 elementos.
- **Teclado y roles** (Chrome, tema claro, 1280 px): en perfil y coincidencias, Tab llega a una sola pestaña (la elegida, `tabindex="0"`; las
  otras `-1`), la siguiente parada es el panel (`tabpanel`, `tabindex="0"`, nombre = su pestaña) y después el primer control del panel; en la
  ficha, pestaña → panel → «Proponer sesión» (igual que la línea base). ArrowRight elige y enfoca la siguiente, circula de la última a la
  primera y de la primera a la última con ArrowLeft; Inicio elige y enfoca la primera y Fin la última. Cada pestaña controla su panel
  (`aria-controls` = `{idBase}-panel-{juego}`, `aria-labelledby` del panel = la pestaña). Con un solo juego la única pestaña es la única parada.
  Elegir otro juego no recarga la página (una marca puesta en `window` sigue ahí). Foco del panel: `2px solid rgb(74, 104, 0)`, desplazamiento
  `-2px`, enfocado. La píldora toma la tinta del juego (`rgb(217, 122, 69)` con CS2) y el texto y el punto de la elegida `--tab-ink`
  (`rgb(13, 14, 16)`).

## T19 — `Slip` sobre la ventana modal y ventana de cancelar (RF-1, RF-2, RF-12, RF-18, RF-22)
- `Slip` reescrita sobre `Modal.Root` con `Modal.Overlay`, `Modal.Content`, `Modal.Header`, `Modal.Title`, `Modal.CloseButton` (y `Modal.Body`
  solo para la descripción): `trapFocus`, `returnFocus` apagado, `lockScroll`, `zIndex` de `--z-modal`, entrada con la curva `--spring` y salida
  más corta, fondo desenfocado 8 px con `--scrim`; `closeLocked` apaga Escape, el fondo y el cierre. `modal.css` trae la disposición y el botón de
  cerrar; la superficie sigue siendo `slip sheet sheet--punched`. `CancelSessionDialog`: «Volver» lleva `data-autofocus`. Se retira `slip.css`.
- **Hallazgos al comparar**: (1) `Modal.Content` repite `className` en la caja de colocación y en el panel (la caja salía con la superficie
  del panel y dejaba de ser fija): se pasa por `classNames.content`; (2) `Modal.CloseButton` dibuja su propia «x» además de los hijos: el icono
  se entrega con `icon`; (3) el color del fondo de la librería llega en una variable en línea: `modal.css` fija `background: var(--scrim)`;
  (4) quitar el `line-height` heredado del título (el de los titulares de hoy) devolvió la altura de la ventana a 375 y 360 px.
- **Comparado con la línea base** (anotar, anotar con error, cancelar en agenda y en detalle; 1280, 375 y 360 px, dos temas): **0 diferencias salvo
  el campo «Título» enfocado al abrir** (Q1, declarada). 2396 elementos.
- **Reglas de «¿Cancelar esta sesión?»** (Chrome, agenda): rol `dialog`, `aria-modal="true"`, nombre = el título, sin `aria-describedby`; foco
  inicial en «Volver»; Tab y Mayús+Tab recorren Volver → Sí, cancelar sesión → Cerrar sin salir; el botón de cerrar se llama «Cerrar» y no tiene
  título emergente; con la ventana abierta el cuerpo queda `overflow: hidden`, el encabezado no se corre (0 → 0 px) y la página no se desplaza; Escape,
  pulsar fuera, el botón de cerrar y «Volver» cierran y el foco vuelve a «Cancelar sesión» de la tarjeta; la página vuelve a desplazarse. Con la
  cancelación en curso (servidor simulado lento): foco en el título, «Sí, cancelar sesión» deshabilitado con «Enviando…», Escape y pulsar fuera no
  cierran (y no mueven el foco), el botón de cerrar queda con `aria-disabled="true"` y no cierra, y Tab circula entre Volver y Cerrar sin salir.
  Con movimiento reducido: `transition-duration` 0,00001 s, visible en 11 ms, sin transformación. Sin errores de consola.
- Casos 6, 13 y 14 de la 009 (foco tras cancelar desde el detalle y tras un error): la lógica de `SchedulePage` y `detail/focusRule.ts` no cambió;
  el foco de vuelta a «Cancelar sesión» (caso 6) está comprobado arriba; los otros dos dependen de respuestas del servidor que el modo simulado no
  produce y quedan para la 018.

## T20 — «Anotar una sesión»: foco estándar (RF-12, RF-20, RF-22)
- `SchedulePage` guarda de dónde se abrió el borrador (`data-slot` en los bloques de `WeekCalendar`, el botón de la cabecera con `ref` y «propuesta»
  si aparece sin origen) y aplica `resolveDraftFocus('closed', …)` al cerrarse (nada si la vista sale: `useIsPresent`); sigue la primera respuesta de
  la lista con un `focusin` y `resolveAfterListFocus`. `SessionDraftSlip` aplica `resolveDraftFocus` al enviar (título de la ventana con el botón;
  el foco se queda en «Título» con Intro) y tras un error o una comprobación del cliente (al botón o al campo). «Título» lleva `data-autofocus`.
  No se tocó el almacén de la 016.
- **Recorrido en Chrome** (agenda): desde un bloque, desde «Anotar sesión» y desde «Proponer» (en coincidencias) el foco va a «Título»; el nombre de
  la ventana es «Anotar una sesión» (sin la referencia «Lun 20:00») y no tiene descripción; Tab y Mayús+Tab no salen; Escape, «Cancelar», el botón
  de cerrar y pulsar fuera devuelven el foco al bloque (martes 14:00) o a «Anotar sesión» (si se abrió desde la cabecera o desde una propuesta); con
  el título vacío: foco en «Anotar sesión» si se envió con el botón y en «Título» si con Intro; al crear con Intro el foco sigue en «Título» y la
  ventana se cierra y devuelve el foco al bloque; con el servidor lento y el botón: foco en el título de la ventana con «Enviando…», Tab sin salir
  y, al crearse, foco en el bloque. «Atrás» o un 401 con la ventana abierta: sin ventanas, cuerpo sin bloqueo (se desplaza), foco en el cuerpo, ningún control retenido.
- Sin comprobar a mano: la primera respuesta de la lista con error tras crear desde un bloque (cubierta por `draftFocus.test.ts`) y «Proponer» con
  cuentas lentas y otra ventana abierta (regla de la 016, sin cambios): quedan para la 018.

## T21 — Ventana de desvincular (RF-19, RF-22, RF-23 a RF-25)
- `UnlinkAccountDialog` (`Slip` con `description`) y `SettingsPage`: estado local (`unlinkOpen`, `unlinkTarget` con el título calculado al abrir con
  `unlinkDialogTitle`), mapa de botones «Desvincular» por cuenta (`AccountRow.unlinkButtonRef`), `resolveUnlinkFocus`, `accountError` sin el error de
  desvincular (se ve dentro de la ventana con `MutationNotice`), título «Cuentas vinculadas» con `tabIndex={-1}`; textos en `copy.ts`; se retira
  `window.confirm`.
- **Recorrido en Chrome** (configuración, modo simulado): rol de ventana modal, nombre «¿Desvincular Jugador1#LAS?» y descripción «Dejarás de aparecer en las
  coincidencias de ese juego.»; foco en «Volver»; Tab circula Desvincular → Cerrar → Volver sin salir; «Volver», Escape, el botón de cerrar y pulsar fuera cierran
  sin enviar (las 3 cuentas siguen) y devuelven el foco a «Desvincular» de la fila. Con el servidor lento: doble clic → una sola desvinculación,
  «Enviando…» y foco en el título; Escape y pulsar fuera no cierran; Tab solo entre Cerrar y Volver (bloqueados). Éxito: la ventana se cierra, la cuenta
  desaparece y el foco va al título «Cuentas vinculadas» (también con la última cuenta, que deja «Todavía no vinculas ninguna cuenta…»). Error (la cuenta ya
  no existe en el servidor simulado): el mensaje «cuenta no encontrada» queda **dentro** de la ventana (rol `alert`), el foco en «Desvincular» de la ventana
  y ningún aviso encima de la lista; «Volver» lo borra y devuelve el foco a la fila. Identificador de 48 caracteres sin espacios a 360 px: sin ancho
  desplazable (360 de 360) y el título parte línea dentro de la ventana de 328 px. Con una resincronización en curso el botón «Desvincular» está deshabilitado.
- Limitación conocida: con un doble clic muy rápido sobre «Desvincular», el segundo clic cae sobre el botón ya deshabilitado y el foco pasa de
  su título a la propia ventana (que lo retiene igualmente); el envío sigue siendo único.
- Sin comprobar a mano (el modo simulado no los produce): el 404 y el servidor caído reales y el plazo de 30 s (la ruta de error es la misma que la
  probada), y un 401 durante el envío (la spec 007 cierra la vista; sin ventana retenida, como en T20).
- **Punto de control del bloque C**: ver el final de este archivo.

## T22 — Foco del tema claro y limpieza (RF-2, RF-4, RF-20)
- `global.css` pierde los bloques de los componentes migrados (sellos y su animación, botones, indicador giratorio, chips, campos, interruptor,
  deslizador, avisos y esqueleto: de 1118 a 614 líneas) y conserva `.field`, `.field > .label` y `.field__hint` (los usan el deslizador y la fila
  estática de la edición del detalle). Ningún CSS de vista apunta a clases retiradas.
- **Indicador de foco** (`evidence/focuscheck.mjs`, 786 paradas de Tab en 12 vistas × 2 temas × 2 anchos): todas las que no son campos llevan `2px solid` con
  el color esperado (`rgb(205, 242, 75)` en oscuro y `rgb(74, 104, 0)` = `#4a6800` en claro), también el enlace de saltar al contenido, la barra, el menú
  y el botón de menú, los enlaces de texto, las celdas del inicio, la hoja semanal y la de horas; los chips lo muestran al acabar su transición (`all`, como
  antes). Contraste del indicador del tema claro contra cada superficie (T7): 4,79:1 como mínimo (sobre el volt) y 6,42:1 sobre el panel; el halo de los campos
  3,01:1 a 3,67:1. En el tema oscuro, el mismo color, grosor y separación que la línea base.
- Búsquedas de cierre en `frontend/src`: 0 resultados de `className="btn`, `"chip`, `"notice`, `"slider`, `"check`, `"select`, `"textarea`, `"input` y `window.confirm`;
  ningún color literal en `src/theme/` ni en `theme/components/*.css` (`themeColors.test.ts` y `games.test.ts` en verde: 214 pruebas).

## T23 — Recorrido de validación completo (RF-3, RF-6, RF-21, RNF-2 a RNF-5, RNF-7, RNF-8)
Hecho con Chrome 159 y los scripts de `evidence/` (el `implementer` con un navegador real; el `reviewer` puede repetirlo con los mismos comandos).
Todo en modo simulado (RF-21): ningún escenario necesita el servidor.
- **Capturas y medidas repetidas** (`evidence/after/`, mismos 25 escenarios × 1280, 375 y 360 px × claro y oscuro; `compare.mjs`): **7186 elementos comparados, 12
  con diferencias, todas declaradas en RNF-2**: el color del borde del campo enfocado en el tema claro (`rgba(100, 140, 0, 0.42)` → `rgb(74, 104, 0)`; coincidencias con filtros y edición
  del detalle: 6) y el campo «Título» enfocado al abrir «Anotar una sesión» (fondo `--surface` y borde de foco; 6). Ningún valor calculado distinto (fondo, texto, borde, radio, letra),
  ninguna caja que difiera más de 2 px, **ningún texto ni fila con más líneas** y **ningún ancho desplazable nuevo** (coincidencias a 375 y 360 px sigue desplazándose 1 px, como la línea base).
- **Contrastes (RNF-3)**: como los valores calculados son los mismos, los contrastes de texto de cada componente migrado son los de la línea base; los bordes de los campos
  siguen en 1,18:1 a 1,20:1 (ya no cumplían 3:1 y no era un objetivo de esta spec). Ningún componente empeora. Lo nuevo con 3:1 exigido: el indicador de foco del tema claro
  (≥ 4,79:1) y el borde y el halo de los campos con foco (6,42:1 y ≥ 3,01:1) (T7, T22).
- **Teclado y árbol de accesibilidad** (`keys.mjs` contra la línea base, 26 vistas): el orden de tabulación es el mismo en 22 y distinto solo en perfil y coincidencias (1280 y 375 px),
  como declara RNF-2: una parada para el grupo de pestañas, otra en el panel y después el primer control. Teclas de los deslizadores: las 16 + 24 de la tabla de T2, iguales. Árboles:
  los mismos roles, nombres y estados; las diferencias son la del botón «Cerrar sesión» (ya descrita en T14), `tabpanel` en perfil y coincidencias, `switch` en lugar de `checkbox`
  y, en el registro, la pista del correo es un párrafo en lugar de un texto suelto.
- **Cambiar a mano cada token de la spec** (`tokens.mjs`, 26 pruebas × claro y oscuro, sin recargar): `--volt` (botón primario, tinte del chip «Todos los juegos», interruptor
  activado, barra de los deslizadores), `--volt-edge`, `--ink` (botones y campos), `--surface-sunk`, `--line`, `--line-strong`, `--placeholder`, `--danger` (error y botón de
  peligro), el token del foco del tema claro (`--focus-ring` y `--focus-edge`), `--btn-pen-shadow`, `--btn-orb-bg`, `--danger-edge`, `--ok-edge`, `--warn-edge`, `--game-ink-lol`
  y `--game-ink-r6` (píldora, punto y borde del chip pulsado), `--tab-ink` y `--tab-pill-shadow`: **todas cambian al instante lo que corresponde**.
- **Tema** (`themecheck.mjs`, contra `npm run dev` y contra la construcción de producción): los 8 casos de primera pintura, sin entradas nuevas, sin sincronizar con el sistema ni
  con otra pestaña, y el botón de tema (marcas, almacenamiento, barra del navegador y círculo): 16 de 16 en las dos. **Ventanas** (`misc.mjs`): «Anotar una sesión», «¿Cancelar esta
  sesión?» y «¿Desvincular …?» abiertas después de pasar a claro salen en el tema claro (velo `rgba(20, 24, 30, 0.35)` = `--scrim` del claro; panel blanco, a la vista en
  `after/shots/agenda-cancelar__1280__light.jpg`).
- **Texto al 200 %** (`html { font-size: 200% }`, 7 vistas, 1280 y 375 px): el ancho desplazable es 2034 y 465 px, **igual que con el código de la línea base** (medido con una copia
  de la línea base servida aparte): sale de la barra flotante, que no migra, no de ningún control migrado.
- **Movimiento reducido**: la ventana aparece sin transición (11 ms, `transition-duration` 0,00001 s, sin transformación); la píldora de las pestañas salta sin deslizarse (382 px a los
  30 ms y al final); el sello no tiene animación (0,00001 s).
- **Producción** (`vite build` en modo simulado y `vite preview`; no se levantó el servidor Express de la spec 010 porque necesita MongoDB): mismo aspecto (login, registro, agenda, detalle,
  coincidencias y perfil, 1280 y 375 px, dos temas: 736 elementos, 0 diferencias con la línea base) y mismo tema (los 16 de `themecheck.mjs`); sin variables de entorno nuevas. **RNF-7**
  (código, estilos y fuentes que descarga la pantalla de acceso, `weight.mjs`): `/login` **antes 411,35 kB de JS, 34,31 kB de CSS y 51,30 kB de fuentes; después 510,13 kB de JS, 89,84 kB de CSS
  y 51,30 kB de fuentes**, en 10 archivos las dos veces; `/registro` 410,97 → 509,80 kB de JS; `/` 421,23 → 519,52 kB de JS y 44,18 → 99,70 kB de CSS. La pantalla de acceso sigue sin descargar el
  código de las demás vistas (solo `LoginPage`, `authForm`, `TextField` y `Notice`). El paquete principal pasa de 414,22 a 514,90 kB (de 135,76 a 165,15 kB con gzip) y Rollup avisa de que supera
  500 kB (aviso, no error); es el coste de la librería y de importar sus hojas de estilo una sola vez (sin umbral: información para el equipo).
- **Diferencias que no son de RNF-2, registradas como defectos menores** (equivalentes para tecnologías de apoyo, sin tarea de corrección en esta spec; propuestas para la 018 si el equipo
  quiere cerrarlas): **D-1** la librería pone `aria-invalid="false"` en un campo sin error (antes el atributo no estaba); **D-2** la pista y el error de un campo son `<p>` en lugar de
  `<span>` (con `role="alert"` el error se anuncia igual); **D-3** el 2.º clic de un doble clic sobre un botón ya deshabilitado de «Desvincular» deja el foco en la ventana y no en su título.
- **No comprobado** (queda a la 018 o a quien tenga el navegador): Firefox y Safari (capas CSS y `:has`); el servidor Express real con MongoDB; los casos 13 y 14 de la 009 y los 404, 5xx y plazo de
  30 s reales de desvincular; «Proponer» con las cuentas lentas y otra ventana abierta; la grabación de rendimiento de la primera pintura (se comprobó el estado antes de React y el
  fondo calculado, no los cuadros).
- `npm test` (214), `typecheck`, `lint` y `build` sin errores; `git status --short backend/` vacío.

## T24 — Cierre documental (RNF-6)
- `AGENTS.md`: línea del stack (Mantine 8.3.18), carpeta `src/theme/` y componentes propios de `src/shared/`, y la convención de estilos (tokens, sin colores a mano y control de
  la librería solo a través de su componente propio). `MEMORY.md`: estado, tabla de specs y decisiones. `spec.md`, `plan.md` y `tasks.md`: estado «implementada, pendiente de validación del usuario».
- Hecho cuando: los documentos reflejan el estado real, sin referencias a `window.confirm` ni a `Slip` a mano; verde en el frontend; `backend/` intacto.

## Puntos de control
- **A (T9)**, **B (T17)**, **C (T21)** y **D (T24)**: el usuario pidió seguir hasta terminar todas las tareas posibles, así que se pasó por los cuatro sin detenerse; cada bloque queda
  validado arriba y se entrega junto para su revisión.
