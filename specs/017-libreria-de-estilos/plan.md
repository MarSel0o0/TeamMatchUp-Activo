# Plan 017 — Librería de estilos (Mantine) en los componentes base
Estado: aprobado (2026-11-22, usuario), como un solo plan en cuatro bloques (§12); `tasks.md` generado el mismo día; implementado el
2026-11-22 (T1 a T24). Desviaciones respecto de lo planeado, con su motivo, en `validation.md` (T9, T10, T17, T18).

Spec: `specs/017-libreria-de-estilos/spec.md` (aprobada el 2026-11-21 con Q1 a Q8, H1 a H6 y P1 a
P11; sin dudas abiertas). Base: rama `feature/vinculacion-steam-riot`, commit `0e730f1`, con la
spec 016 implementada y validada (2026-11-22; condición previa de la spec cumplida). Orden de
implementación: 016 → **017** → 018.

Esta spec no toca `backend/`, el contrato de datos (`services/apiContract.ts`), el transporte, los
almacenes de la 016 ni el modo simulado. Lo que cambia es la capa de presentación del frontend, el
tema, las reglas de foco de dos ventanas y la ventana de desvincular.

## 0. Estado real del código (leído el 2026-11-22)
- **Estilos**: `src/styles/tokens.css` (211 líneas, tema oscuro en `:root` y claro en
  `:root[data-theme='light']`) y `src/styles/global.css` (1117 líneas) con todos los controles a
  mano: `.btn` (+ `--pen`, `--quiet`, `--danger`, `--sm`, `--lg`, `--block`, `__orb`, `__spin`),
  `.chip`, `.field`, `.input`, `.select`, `.textarea`, `.check` (interruptor), `.slider`, `.notice`
  (+ `--error`, `--pen`), `.stamp` (+ tonos), `.blank`, `.skeleton`. Cada componente con CSS propio
  vive junto a su archivo (`gameTabs.css`, `slip.css`, `themeToggle.css`…).
- **Foco de hoy**: `global.css` fija `:focus-visible` y `[tabindex='-1']:focus` con
  `outline: 2px solid var(--volt); outline-offset: 3px`. Los campos usan borde `--volt-edge` y halo
  `0 0 0 4px var(--volt-wash)`. En el tema claro `--volt` (#c6ee35) no llega a 3:1 (Q5).
- **Tema**: un script en línea de `index.html` lee `tmu.theme` y, si no es válido, la preferencia
  del sistema, y escribe `data-theme` en `<html>`. `app/providers/ThemeProvider.tsx` lee ese
  atributo, guarda la elección en la misma entrada (`STORAGE_KEYS.theme`) y anima el cambio con
  `startViewTransition` + `flushSync`. `useTheme()` es la fachada. No hay `MantineProvider`.
- **Ventana**: `shared/components/Slip.tsx` es una ventana propia con `createPortal`, `motion`
  (resorte de entrada y salida), recorrido de Tab limitado a botones, `document.body.style.overflow`
  y `aria-label` con el título. La usan `SessionDraftSlip` («Anotar una sesión», sin foco inicial ni
  retención) y `CancelSessionDialog` (foco inicial en «Volver», `closeLocked`).
- **Desvincular**: `SettingsPage.unlinkGame` llama a `window.confirm`; el error de la escritura
  sale encima de la lista (`accountError = syncAccount.error ?? unlinkAccount.error`).
- **Pestañas**: `GameTabs.tsx` ya tiene el patrón accesible opcional (`idBase`, `panelId`,
  `nextTabIndex`); solo la ficha lo usa (`PlayerGamesSection`, panel `tabIndex={0}`). Perfil y
  coincidencias lo usan sin él.
- **Tinta del catálogo**: `domain/games.ts` guarda `accent` en hexadecimal (`#c8963e`, `#3ea0c8`,
  `#d97a45`); lo consumen componentes que migran (pestañas, chips) y otros que se quedan
  (`GameMark`, `RankScale`, `Monogram`, `WeekCalendar`, `MatchEntry`, `AccountRow`, `HomePage`,
  `SignUpSheetPreview`, `LandingPage`). Las tintas de los tokens (`--ink-lol`…) son otras.
- **Indicadores de carga**: `States.tsx` (`Working`) y las cabeceras de agenda y coincidencias
  piden `color: var(--pen)`, un token que no existe: heredan el color del texto.
- **Foco programático (016 y 009)**: `SchedulePage` ya gestiona `focusRequest` (título del panel,
  «Cancelar sesión» de la tarjeta, título y confirmar de la ventana) y `useDetailController` usa
  `detail/focusRule.ts`. `SessionDraftSlip` no mueve el foco.
- **Pruebas**: Vitest 3.2.4 (`vitest.config.ts`, entorno `node`, `src/**/*.test.ts`, `allowOnly:
  false`); 105 pruebas en verde. `tsconfig.node.json` incluye `vite.config.ts` y `vitest.config.ts`.
- **Usos a migrar** (búsqueda del 2026-11-22; la tarea de línea base los vuelve a listar):
  `className="btn…"`: ~75 sitios en 30 archivos (acceso, registro, landing, no encontrada,
  `ErrorBoundary`, menú móvil, perfil, configuración, coincidencias, agenda, detalle, ficha, Steam,
  Riot, estados); `TextField`: 12; `select`: 14; `textarea`: 4; `slider`: 2; `check`: 1; `chip`: 2
  (el segundo en un `map`); `notice`: ~25; `Stamp`: 9; `btn__spin`: 20 y los dos indicadores de
  `var(--pen)`; ventanas: 2 más la de desvincular.

## 1. Dependencias (RNF-1)
| Paquete | Versión exacta | Tipo | Justificación |
| --- | --- | --- | --- |
| `@mantine/core` | `8.3.18` | producción | Librería elegida (D1). Es la última 8.3.x publicada (2026-11-22) y su rango de pares es `react ^18.x \|\| ^19.x`, `react-dom` igual y `@mantine/hooks 8.3.18`. La 9.x exige React 19.2 y actualizar React queda fuera de alcance. Aporta botones, campos, interruptor, deslizador, pestañas, ventana modal, sello, indicador de carga y esqueleto. |
| `@mantine/hooks` | `8.3.18` | producción | Dependencia par del núcleo, en la misma versión exacta (el núcleo no la instala). |

- **Comprobación hecha por el planificador (2026-11-22)**, en una carpeta aislada fuera del
  proyecto: `npm view @mantine/core versions` (última 8.3.x: 8.3.18);
  `npm view @mantine/core@8.3.18 peerDependencies`; `npm install --save-exact react@18.3.1
  react-dom@18.3.1 @mantine/core@8.3.18 @mantine/hooks@8.3.18` → «added 29 packages … found 0
  vulnerabilities», **sin avisos de dependencias incompatibles**. El núcleo trae por su cuenta
  `clsx`, `type-fest`, `@floating-ui/react`, `react-number-format`, `react-remove-scroll` y
  `react-textarea-autosize`; no se instalan aparte. Los estilos precompilados viven en
  `@mantine/core/styles/<Componente>.layer.css` (cada uno envuelto en `@layer mantine`).
- **T1 repite la comprobación en el proyecto**: `npm view @mantine/core versions` (si hay una 8.3.x
  posterior cuyo rango admita React 18.3, se usa esa y se anota), `npm install --save-exact
  @mantine/core@8.3.18 @mantine/hooks@8.3.18`, `npm ls react react-dom @mantine/core
  @mantine/hooks` (un único React 18.3.1) y `npm ls vite` (un único 5.4.21); sin avisos de
  dependencias incompatibles.
- **De desarrollo, ninguna** (RNF-1): Vite 5.4 importa CSS sin ayuda y se usan los estilos
  precompilados de la librería, así que no hace falta `postcss-preset-mantine` ni
  `postcss-simple-vars`. Las pruebas usan el Vitest de la 016.
- **No entran**: `@mantine/modals`, `@mantine/notifications`, `@mantine/form`, `@mantine/dates`,
  `@mantine/charts`, `@mantine/spotlight`, otra colección de iconos (se sigue con `lucide-react`) ni
  otra librería de estilos.
- RNF-7: se importa CSS **por componente** y solo el de los componentes usados; el JS de la
  librería se importa por componente (ESM, se sacude lo que no se usa). T0 y el cierre anotan el
  tamaño que descarga la pantalla de acceso antes y después.

## 2. Archivos y responsabilidades
Rutas relativas a `frontend/`. La columna RF indica qué requisito cubre cada pieza.

### 2.1 Nuevos
| Archivo | Responsabilidad | RF |
| --- | --- | --- |
| `src/domain/themeChoice.ts` | Reglas puras del tema inicial: `chooseInitialTheme` y `bootTheme`. Autocontenido (sin imports ni cierres) porque se inyecta tal cual en `index.html` (DT-4). | RF-5, RF-7, RNF-6 |
| `src/domain/themeChoice.test.ts` | Seis casos de `chooseInitialTheme`, `bootTheme` con un entorno falso y la prueba de que la función serializada se ejecuta aislada. | RNF-6 |
| `src/domain/dial.ts` | `dialName(label, value, unit)` (nombre accesible del deslizador) y `pageStepValue` (Re Pág y Av Pág). | RF-11 |
| `src/domain/dial.test.ts` | Pruebas de ambas con la tabla de valores de la línea base. | RF-11 |
| `src/domain/draftFocus.ts` | Reglas de foco de «Anotar una sesión»: `resolveDraftFocus` y `resolveAfterListFocus` (§5.4). | RF-12, RF-22 |
| `src/domain/draftFocus.test.ts` | Una prueba por regla de RF-12. | RF-12 |
| `src/domain/unlinkDialog.ts` | `unlinkDialogTitle` y `resolveUnlinkFocus` (§5.5). | RF-23 a RF-25 |
| `src/domain/unlinkDialog.test.ts` | Pruebas de ambas. | RF-23 a RF-25 |
| `src/theme/mantineTheme.ts` | `createTheme` único: paletas hechas de referencias a tokens, radios, espaciado, tipografía, sombras, `respectReducedMotion`, `focusClassName`, `activeClassName` y los `components.*.extend` con sus `classNames` y valores por defecto. | RF-1, RF-2, RF-4 |
| `src/theme/tokenPalettes.ts` | Las paletas (14 con nombre de Mantine + `volt`) como tuplas de 10 referencias `var(--token)`; ningún hexadecimal. | RF-2 |
| `src/theme/cssVariablesResolver.ts` | `cssVariablesResolver`: sustituye las variables de color de la librería (cuerpo, texto, error, marcador, deshabilitado, bordes, ancla, contraste del color principal) por referencias a tokens, iguales en los dos esquemas. | RF-2 |
| `src/theme/colorLiterals.ts` | `findColorLiterals(css)`: detecta colores literales (Definiciones de la spec) ignorando `transparent`, `currentColor`, `inherit`, `initial`, `unset`, `revert` y los nombres dentro de `var(...)`. | RF-2, RNF-6 |
| `src/theme/themeColors.test.ts` | Prueba de RNF-6: el tema, el resolvedor, el CSS del proyecto y los CSS de la librería importados no tienen colores literales; toda `var(--x)` apunta a un token que existe. | RF-2, RNF-6 |
| `src/theme/mantineCss.ts` | Solo importaciones de efectos laterales: los `*.layer.css` de Mantine usados, en un único sitio y en este orden (§3.1). | RF-4, RNF-8 |
| `src/theme/components/*.css` | Un CSS por familia, sin capa: `focus.css`, `button.css`, `field.css` (texto, área, lista, búsqueda), `switch.css`, `slider.css`, `modal.css`, `tabs.css`, `chip.css`, `notice.css`, `badge.css` (sellos), `loader.css`, `icon-button.css`, `skeleton.css`. Reciben el CSS que hoy está en `global.css` y en los CSS de componentes, con selectores de Mantine y solo tokens. | RF-2, RF-3, RF-20 |
| `src/shared/components/AppButton.tsx` | M1 y M2: `AppButton` (botón) y `ButtonLink` (enlace con aspecto de botón) sobre `Button` de Mantine. Propiedades: `tone` (`default`/`pen`/`quiet`/`danger`), `size` (`sm`/`md`/`lg`), `block`, `icon`, `orb`, `pending` (deshabilitado + indicador), `blocked` (`aria-disabled`, sin efecto). | RF-8 |
| `src/shared/components/IconButton.tsx` | M3: botón de icono sobre `ActionIcon` con nombre accesible y título obligatorios (el título es opcional solo para el de cerrar). | RF-18 |
| `src/shared/components/Notice.tsx` | M13: aviso sobre `Paper`; `tone` (`neutral`/`pen`/`error`), `icon` y `role` explícito (`'alert'`, `'status'` o ninguno). | RF-15 |
| `src/shared/components/Spinner.tsx` | M15: indicador giratorio sobre `Loader` con un tipo propio; hereda `currentColor` o toma el token de §3.2 (RF-17). | RF-17 |
| `src/shared/components/SelectField.tsx` | M7: `NativeSelect` con etiqueta, `id` estable y las mismas opciones. | RF-10 |
| `src/shared/components/TextAreaField.tsx` | M5: `Textarea` con etiqueta, error y, según el uso, límite Unicode (`useCodePointLimit`) o `maxLength`. | RF-9 |
| `src/shared/components/SearchField.tsx` | M6: `TextInput type="search"` con icono. | RF-9 |
| `src/shared/components/SwitchField.tsx` | M8: `Switch`. | RF-11 |
| `src/shared/components/SliderField.tsx` | M9: `Slider` con etiqueta visible, valor, nombre accesible calculado con `dialName`, Re Pág / Av Pág y deshabilitado real. | RF-11 |
| `src/shared/components/FilterChip.tsx` | M12: botón de la librería con `aria-pressed`, punto y tinta. | RF-14 |
| `src/features/profile/components/UnlinkAccountDialog.tsx` | M16: ventana de desvincular sobre `Slip`. | RF-23 a RF-25 |

### 2.2 Se modifican
| Archivo | Cambio | RF |
| --- | --- | --- |
| `package.json`, `package-lock.json` | Dos dependencias con versión exacta. | RNF-1 |
| `vite.config.ts` | Plugin `themeBootPlugin` que inyecta en `<head>` el script del tema inicial construido con `bootTheme` de `domain/themeChoice.ts` (DT-4). | RF-5, RNF-6, RNF-8 |
| `index.html` | Se quita el script en línea (lo inyecta el plugin). Se conserva `<meta name="theme-color">`. | RF-5 |
| `src/main.tsx` | Importa `theme/mantineCss` antes de `styles/global.css`, y después los CSS de `theme/components`. | RF-4 |
| `src/app/providers/ThemeProvider.tsx` | Sigue siendo la fachada de `useTheme`; añade `MantineProvider` con `forceColorScheme={theme}`, un gestor de esquema inerte y el tema de §3.3; `apply` escribe `data-theme` y `data-mantine-color-scheme` juntos. | RF-5 a RF-7 |
| `src/styles/tokens.css` | Tokens nuevos de §3.2 (valores de hoy) y `--focus-*`. No cambia ningún valor existente. | RF-2, RF-20 |
| `src/styles/global.css` | Se retiran los bloques de los componentes migrados (botones, chips, campos, interruptor, deslizador, avisos, sellos, indicador de envío); se cambia el indicador de foco global a `--focus-ring` (grosor y separación iguales); se quita `.stamp--danger` (DT-16). Se conserva todo lo demás (Q-1 a Q-14). | RF-1, RF-4, RF-20 |
| `src/domain/games.ts` | Cada juego gana `inkVar` (`var(--game-ink-lol)`…). `accent` se queda para los elementos que no migran. | RF-2 |
| `src/shared/components/TextField.tsx` | Sobre `TextInput` (M4). | RF-9 |
| `src/shared/components/GameTabs.tsx` | Sobre `Tabs`: lista, pestañas y panel (`panel` pasa a ser parte del componente). Conserva píldora y punto con `motion` (DT-8). | RF-13 |
| `src/shared/components/Slip.tsx` | Sobre `Modal.Root` y sus piezas (DT-6); nueva forma de pedir foco inicial. | RF-12, RF-22 |
| `src/shared/components/Stamp.tsx`, `States.tsx`, `MutationNotice.tsx`, `ThemeToggle.tsx` | Sobre `Badge`, `Skeleton`/`Spinner`/`AppButton`, `Notice` e `IconButton`. | RF-15 a RF-18 |
| `src/app/layouts/AppLayout.tsx`, `src/app/pages/LandingPage.tsx`, `NotFoundPage.tsx`, `src/app/ErrorBoundary.tsx` | Botones y enlaces con aspecto de botón; el botón de cerrar sesión de la barra pasa a `IconButton`. | RF-1, RF-8 |
| `features/auth/pages/LoginPage.tsx`, `RegisterPage.tsx` | Botón de envío, avisos, campos. | RF-8, RF-9, RF-15 |
| `features/profile/pages/ProfilePage.tsx`, `SettingsPage.tsx`; `features/profile/components/AccountRow.tsx`, `LinkAccountForm.tsx`, `GameSummaryPanel.tsx` | Botones, avisos, listas, área de texto, sello; Configuración usa `UnlinkAccountDialog`; perfil usa el panel de pestañas. | RF-1, RF-13, RF-23 a RF-25 |
| `features/matches/pages/MatchesPage.tsx`, `components/MatchFiltersPanel.tsx`, `MatchEntry.tsx` | Búsqueda, deslizadores, interruptor, botones, pestañas con panel, indicador «Actualizando». | RF-9, RF-11, RF-13, RF-17 |
| `features/players/**` (`PlayerGamesSection`, `ProposeSessionAction`, `SharedHoursBlock`, `PlayerPage`) | Pestañas sobre `GameTabs` con panel, botones, aviso. | RF-13 |
| `features/sessions/pages/SchedulePage.tsx` | Chips (`FilterChip`), indicador «Actualizando», botones, avisos y **foco de «Anotar una sesión»** (§5.4). | RF-12, RF-14, RF-17 |
| `features/sessions/components/SessionDraftSlip.tsx`, `CancelSessionDialog.tsx`, `SessionEditForm.tsx`, `SessionSlip.tsx`, `SessionActionsZone.tsx`, `SessionDetailFacts.tsx`, `pages/SessionDetailPage.tsx` | Campos, listas, áreas, botones, sellos, avisos; foco inicial de la ventana de cancelar con `data-autofocus`. | RF-8 a RF-12 |
| `features/riot/**`, `features/steam/**` | Botones de verificación, lista «Región», avisos. | RF-1, RF-8 |
| `src/shared/utils/copy.ts` | Textos de la ventana de desvincular. | RF-23 |
| `AGENTS.md`, `MEMORY.md` | Cierre documental. | spec, criterios |

### 2.3 Se retiran
`src/shared/components/themeToggle.css`, `slip.css` y la parte de `gameTabs.css` de los controles
(sus reglas pasan a `theme/components/`); los bloques de `global.css` de §2.2. Los CSS de vistas
que estilan controles migrados (por ejemplo `matchFilters.css`, `sessionDraftSlip.css`) conservan
solo la disposición.

## 3. Tema, tokens y capas (RF-1 a RF-7, RF-20)

### 3.1 Capas y orden de carga (RF-4, RNF-8)
- Se importan los `*.layer.css` de la librería. Cada uno está dentro de `@layer mantine`, y las
  reglas **sin capa** (`global.css`, `theme/components/*.css`) ganan siempre a las de una capa,
  sin importar el orden ni la especificidad. Así los valores por defecto de Mantine nunca
  compiten con los tokens (DT-1).
- Orden en `main.tsx`: `theme/mantineCss` (librería) → `styles/global.css` (fuentes, tokens, base)
  → `theme/components/*.css`.
- **No se importan** `baseline.css` ni `default-css-variables.css`: el primero fija fondo, color y
  tipografía del cuerpo y el segundo repite variables que el proveedor ya inyecta (RF-4). Sí
  `global.layer.css` (solo clases auxiliares; no toca la página).
- CSS de la librería previstos (la lista final la fija T3 con el recorrido de «sin componentes sin
  estilo»): `UnstyledButton`, `Button`, `ActionIcon`, `CloseButton`, `Input`, `InlineInput`,
  `Switch`, `Slider`, `Tabs`, `Modal`, `ModalBase`, `Overlay`, `Paper`, `Badge`, `Loader`,
  `Skeleton`, `VisuallyHidden`.
- Capas del navegador: Chrome 99, Firefox 97 y Safari 15.4 en adelante; el proyecto ya usa
  `color-mix` y `startViewTransition`, así que no sube el mínimo (riesgo R1).

### 3.2 Tokens nuevos (`tokens.css`; valores de hoy, RF-2 y RF-20)
Los dos temas llevan el mismo valor (hoy son literales), salvo donde se indica. Son los únicos
sitios con colores; el resto de la interfaz solo los referencia.
| Token | Valor (el de hoy) | Reemplaza |
| --- | --- | --- |
| `--btn-pen-shadow` | `inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -12px rgba(205,242,75,0.6)` | sombra del botón primario |
| `--danger-edge` | `rgba(255,107,94,0.4)` | borde del botón de peligro con el puntero encima **y** borde del aviso de error |
| `--btn-orb-bg` | `rgba(12,15,2,0.12)` | fondo del círculo del botón grande |
| `--ok-edge` | `rgba(86,214,143,0.35)` | borde del sello correcto |
| `--warn-edge` | `rgba(241,178,74,0.35)` | borde del sello de advertencia |
| `--tab-ink` | `#0d0e10` | texto y punto de la pestaña elegida |
| `--tab-pill-shadow` | `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -8px rgba(0,0,0,0.8)` | sombra de la píldora |
| `--game-ink-lol` / `--game-ink-r6` / `--game-ink-cs2` | `#c8963e` / `#3ea0c8` / `#d97a45` | tinta del catálogo en píldora, punto y chips |
| `--focus-ring` | `var(--accent-text)` | color del indicador de foco |
| `--focus-edge` | oscuro `var(--volt-edge)` (el de hoy); claro `var(--focus-ring)` | borde de un campo con foco |
| `--focus-halo` | oscuro `var(--volt-wash)` (el de hoy); claro `color-mix(in srgb, var(--focus-ring) 75%, transparent)` | halo de un campo con foco |

- **`--focus-ring` no necesita un valor nuevo**: en oscuro `--accent-text` es `--volt` (el color de
  hoy) y en claro es `#4a6800`. Medido por el planificador: `#4a6800` da 6,42:1 sobre `--surface`,
  6,20:1 sobre `--surface-2`, 5,82:1 sobre `--surface-sunk`, 5,53:1 sobre `--surface-3`/`--bg`
  (5,52:1), 5,08:1 sobre `--bg-deep` y 4,79:1 sobre `--volt` (botón primario), todos ≥ 3:1. Las
  superficies translúcidas (barra, menú) se miden en T de validación sobre el color compuesto.
- **Halo translúcido (H2)**: sobre `#ffffff` el tono necesita al menos 67 % de opacidad para 3:1
  (65 % da 2,99); se parte de 75 % y T de campos lo mide sobre el fondo real de cada panel y
  ventana; si no llega, se sube el porcentaje (es un solo token).
- **Indicadores giratorios (RF-17)**: T0 anota el color calculado de los dos; el token que lo
  entrega (probablemente `--ink` o `--ink-2`, según el contenedor) se añade como `--spinner-ink`
  solo si T0 demuestra que no es `currentColor` del propio botón. No se inventa antes de medir.
- El tono «peligro» de los sellos no recibe token y su CSS se quita (DT-16).

### 3.3 `MantineProvider` y tema (RF-2, RF-4, RF-6, RF-7)
Pseudocódigo de la configuración (no es el código final):
```
theme = createTheme({
  primaryColor: 'volt', primaryShade: 6,
  colors: tokenPalettes,                 // 15 paletas, solo var(--…)
  white: 'var(--surface)', black: 'var(--ink)',
  fontFamily: 'var(--face)', fontFamilyMonospace: 'var(--mono)',
  headings: { fontFamily: 'var(--face)' },
  radius: { xs:'var(--r-sm)', sm:'var(--r-sm)', md:'var(--r-md)', lg:'var(--r-lg)', xl:'var(--r-xl)' },
  defaultRadius: 'md',
  spacing / fontSizes / lineHeights / shadows: apuntan a --s*, --t-*, --lift*,
  respectReducedMotion: true,            // RNF-5
  fontSmoothing: false, cursorType: 'pointer',
  focusClassName: 'tmu-focus',           // regla de foco propia (§3.4)
  activeClassName: 'tmu-active',         // escala .97 como hoy, no el desplazamiento de la librería
  components: { Button.extend(...), ActionIcon.extend(...), TextInput…, Textarea…, NativeSelect…,
                Switch…, Slider…, Tabs…, Modal…, Badge…, Loader…, Skeleton…, Paper… }
})
provider = MantineProvider(
  theme, cssVariablesResolver, forceColorScheme = tema vigente,
  colorSchemeManager = gestor inerte,     // get→defecto; set, subscribe, unsubscribe, clear → nada
  withGlobalClasses = true, withStaticClasses = true )
```
- **Paletas**: `volt` = `[--volt-wash, --volt-wash, --volt-wash-strong, --volt-edge, --volt, --volt,
  --volt, --volt-bright, --accent-text, --accent-text-hover]`; `dark`/`gray` se reparten
  `--ink … --bg-deep`; `red`/`green`/`yellow`/`orange` apuntan a `--danger`/`--ok`/`--warn`; el resto
  (rosa, uva…) repite `--ink-3`. Ninguna se usa para pintar; existen para que **ningún hexadecimal
  por defecto de la librería llegue al DOM**. Mantine acepta `var()` en una paleta y `alpha()`
  genera `color-mix(...)` para esos valores (comprobado en el código de 8.3.18).
- **Resolvedor**: devuelve, para `variables`, `light` y `dark`, las mismas referencias a tokens
  (`--mantine-color-body → var(--bg)`, `-text → var(--ink)`, `-error → var(--danger)`,
  `-placeholder → var(--placeholder)`, `-default* → --surface-sunk/--fill-2/--ink/--line-strong`,
  `-dimmed → --ink-3`, `-disabled* → --fill-1/--ink-3/--line`, `-anchor → --accent-text`,
  `--mantine-primary-color-contrast → var(--volt-ink)`). Como los tokens ya cambian con
  `data-theme`, no hace falta un valor distinto por esquema.
- **Esquema forzado e inerte (RF-6, RF-7)**: `forceColorScheme` hace que la librería no lea ni
  escriba nada, y el gestor inerte evita su entrada propia (`mantine-color-scheme-value`) y su
  escucha del evento `storage` (que sincronizaría pestañas). El único almacenamiento sigue siendo
  `tmu.theme`, con «light» y «dark» (DT-3).

### 3.4 Indicador de foco (RF-4, RF-20)
- `global.css`: `:focus-visible` y `[tabindex='-1']:focus` pasan a `outline: 2px solid
  var(--focus-ring); outline-offset: 3px` (grosor y separación de hoy; solo cambia el color, que en
  oscuro es el mismo). Eso cubre los elementos que no migran (Q7) con un único cambio.
- `theme/components/focus.css`: `.tmu-focus:focus-visible` con el mismo contorno, para los
  componentes de la librería (`focusClassName`). El de las celdas del inicio (4 px), el del panel de
  pestañas (hacia dentro, 3 px) y el del número del paso («Anotar una sesión», P11: sigue en volt)
  conservan su separación y sus selectores.
- Campos: `:focus` quita el contorno y aplica `border-color: var(--focus-edge)`, `box-shadow:
  0 0 0 4px var(--focus-halo)` y el fondo `--surface` de hoy; `[aria-invalid='true']` sigue
  mandando sobre el foco (borde `--danger`, halo `--danger-wash`).

### 3.5 Tema inicial y cambio de tema (RF-5 a RF-7, RNF-6)
- **Decisión inicial**: `chooseInitialTheme` (§5.1) en `domain/themeChoice.ts`.
- **Antes de la primera pintura**: `vite.config.ts` importa esa misma función y un plugin
  (`transformIndexHtml`, `injectTo: 'head-prepend'`) escribe en `<head>` un script clásico y
  bloqueante con el **texto de la función** (`Function.prototype.toString`) más una llamada de
  una línea con las lecturas reales (`localStorage`, `matchMedia`). El script escribe `data-theme` y
  `data-mantine-color-scheme` con el mismo valor. Sirve igual en `npm run dev` y en `npm run build`
  (RNF-8), sin variables de entorno nuevas.
- **En React**: `ThemeProvider` toma su valor inicial de `data-theme`, como hoy. En `toggleTheme`,
  `apply` escribe **las dos marcas** además de pasar por `flushSync`, para que la captura «después»
  de la transición ya vea el esquema nuevo aunque el efecto del proveedor aún no haya corrido.
  Meta `theme-color`, transición en círculo, logo de Leetify y `aria-label` del botón no cambian.
- **Ventanas**: portan sus portales al `<body>`; los tokens salen de `:root[data-theme]`, así que
  una ventana abierta después del cambio sale entera en el tema vigente (RF-6).

## 4. Componentes: qué usa cada uno y cómo conserva lo que hoy hace

### 4.1 Botones y enlaces (M1, M2, M3; RF-8, RF-18)
- `AppButton` envuelve `Button`. `tone` se traduce a `variant` propio (`default`, `pen`, `quiet`,
  `danger`; Mantine los expone como `data-variant`, que el CSS usa). Tamaños: `sm` 30 px, `md` 38 px,
  `lg` 52 px de alto mínimo, relleno y fuente de hoy. `block` → `fullWidth`. `icon` →
  `leftSection`; `orb` → `rightSection` con el círculo `--btn-orb-bg`.
- `pending` (escritura en curso) pone `disabled`, cambia el icono por `Spinner` y **deja al
  llamador el texto «Enviando…»**, como hoy. **No se usa `loading` de la librería** (P3): oculta el
  texto. `blocked` pone `aria-disabled="true"`, no deshabilita, ignora el clic y se ve como el
  deshabilitado (RF-8; «Volver» con la cancelación en curso, «Reintentar»). Las guardas contra el
  doble envío (`sending.current`) siguen en cada vista.
- `ButtonLink` usa `component={Link}` de React Router: rol de enlace y navegación sin recargar.
  Solo cambia el aspecto.
- Estilo: el CSS de hoy pasa a `button.css` con selectores `.tmu-btn`, `[data-variant]`,
  `[data-disabled]`, `[aria-disabled='true']`; la raíz de la librería (`overflow: hidden`,
  `line-height: 1`, `inner`, `label`) se neutraliza (`overflow: visible` para que el círculo del
  icono pueda moverse con el puntero encima).
- `IconButton` envuelve `ActionIcon` (40 px redondo el de tema; 36 px el de la barra y el de las
  ventanas). Los de las ventanas son `Modal.CloseButton`, no un `ActionIcon` aparte.

### 4.2 Campos (M4, M5, M6, M7; RF-9, RF-10)
- Todos usan el contenedor de campo de la librería con `inputWrapperOrder` = etiqueta, campo,
  pista, error (hoy el error y la pista van bajo el campo), `id` explícito y `label` visible
  asociado (nombre accesible de hoy).
- **Error**: `error` recibe icono + texto y `errorProps={{ role: 'alert' }}` para que se anuncie
  al aparecer. El campo se marca `aria-invalid` y queda descrito por el error. **La pista solo se
  pasa como `description` cuando no hay error**, que es lo que hoy se anuncia. Las pistas que hoy
  **no** están ligadas al control (contador «n/200 caracteres», pista de «Diferencia máxima de
  rango») se pintan fuera del contenedor, como `span.field__hint`.
- **Límites** (RF-9): `useCodePointLimit` sigue siendo el puente con `limitToCodePoints`;
  `TextInput` y `Textarea` reenvían `ref`, `onChange`, `onCompositionStart` y `onCompositionEnd` al
  elemento nativo. «Cómo juegas» conserva `maxLength=200` y el contador por `value.length`.
- `Textarea` sin `autosize` (cambio de alto manual con `resize: vertical`).
- `SearchField`: `type="search"`, icono a la izquierda (`leftSection`), `disabled` sin Premier.
- `SelectField` usa `NativeSelect` con `data` = `{ value, label }` en el mismo orden (P1): lista
  nativa del navegador; el valor numérico se convierte donde hoy se convierte.

### 4.3 Interruptor y deslizadores (M8, M9; RF-11)
- `SwitchField` → `Switch`: `<input type="checkbox" role="switch">`, etiqueta clicable, Espacio,
  `disabled`; pista `--surface-3` y activado `--volt` como hoy.
- `SliderField` → `Slider` con `label={null}` (sin burbuja), `min`/`max`/`step` de hoy (0–50 de 5 en
  5; 0–12 de 1 en 1), barra `--volt`, pista `--surface-3`, miniatura de hoy.
  - **Nombre accesible**: `thumbLabel={dialName(etiqueta, valor, unidad)}`, p. ej. «Diferencia
    máxima de rango 25 pts»; cambia con el valor. El valor accesible es el número
    (`aria-valuenow`), sin texto de valor.
  - **Teclado**: la librería ya resuelve flechas, Inicio y Fin; el envoltorio atiende `keydown`
    en captura para Re Pág y Av Pág con `pageStepValue` (§5.3), `preventDefault` y el mismo
    `onChange` continuo (el filtro se aplica sin recargar).
  - **Etiqueta**: pasa a `<span>`, pero un clic en ella lleva el foco a la miniatura (hoy lo hace
    el `for`).
  - **Deshabilitado**: la miniatura de la librería tiene `tabindex=0` aunque el control esté
    deshabilitado, así que un efecto con `useLayoutEffect` le pone `tabindex=-1` y
    `aria-disabled="true"` mientras `disabled` (DT-9, riesgo R5).

### 4.4 Ventanas (M10, M16; RF-12, RF-22, RF-23 a RF-25)
`Slip` se reescribe sobre `Modal.Root`, `Modal.Overlay`, `Modal.Content`, `Modal.Header`,
`Modal.Title` y `Modal.CloseButton` (DT-6). Reglas:
- **Rol y nombre**: la librería ya da `role="dialog"`, `aria-modal` y `aria-labelledby` con el título.
  `aria-describedby` solo aparece si se monta `Modal.Body`; **`Slip` no la usa** en «Anotar una
  sesión» ni «¿Cancelar esta sesión?» (sin descripción, RF-12) y la usa solo para el mensaje de la
  ventana de desvincular (`description`, RF-23). La referencia del bloque («lun 20:00») va en la
  cabecera pero fuera del título, así que no entra en el nombre.
- **Superficie** (P4, Q-2): `Modal.Content` lleva las clases `slip sheet sheet--punched`; el CSS sin
  capa anula el fondo, el radio y la sombra de la librería.
- **Cierre**: Escape, botón de cerrar y pulsar fuera llaman al mismo `onClose`. Con `closeLocked`
  el `onClose` entregado a la raíz es una función vacía, `closeOnEscape` y `closeOnClickOutside`
  se apagan y el botón de cerrar lleva `aria-disabled`. «Anotar una sesión» no se bloquea nunca.
- **Foco**: `trapFocus` activo siempre (Tab y Mayús+Tab no salen); el foco inicial lo da
  `data-autofocus` en el control elegido («Volver», «Título»); **`returnFocus={false}`**: la
  librería no devuelve el foco; lo hace cada vista (§5.4 y §5.5; DT-7). Los botones bloqueados con
  `aria-disabled` siguen en el recorrido de Tab, como hoy.
- **Desplazamiento**: `lockScroll` de la librería (`react-remove-scroll`) bloquea la página y
  compensa el ancho de la barra (P9); se libera al cerrar o al desmontar la vista (RF-22).
- **Entrada y fondo**: `Modal.Overlay` con `blur={8}` y fondo `--scrim` (variable `--overlay-bg`
  en el CSS sin capa); `transitionProps` con transición propia (entrada desde 40 px abajo y
  `scale(.96)` con `--spring`, salida a 20 px y `scale(.98)`; duración de `--base`), sin animación
  con `respectReducedMotion`. «Anotar una sesión» se desmonta al cerrar, sin salida animada, como hoy.
- **Capa**: `zIndex="var(--z-modal)"`.
- `CancelSessionDialog`: sigue montada con `open`; «Volver» lleva `data-autofocus`; sus refs de
  título y de confirmar y todas las reglas de la 009 no cambian.
- `UnlinkAccountDialog`: mismo aspecto y estructura que `CancelSessionDialog`, título
  `unlinkDialogTitle(handle)`, mensaje fijo en `Modal.Body`, error de escritura con `Notice
  role="alert"` dentro de la ventana, botones «Desvincular» (peligro, con «Enviando…») y «Volver».

### 4.5 Pestañas (M11; RF-13, RF-20)
`GameTabs` contiene ahora `Tabs` (con `id={idBase}` → ids `{idBase}-tab-{juego}` y
`{idBase}-panel-{juego}`), `Tabs.List` (`aria-label`), una `Tabs.Tab` por juego y un
`Tabs.Panel` para el juego elegido, que recibe `children`, `tabIndex={0}` y `className`. La raíz
usa `display: contents` para no cambiar la disposición.
- **Teclado**: `activateTabWithKeyboard` y `loop` (valores por defecto) dan flechas circulares con
  activación automática, Inicio y Fin, y una sola parada con Tab; coincide con `nextTabIndex`, que
  se retira junto con `tabKeys.ts` si queda sin usos.
- **Panel**: es parada del recorrido con Tab en las tres vistas (H3), con el indicador de hoy hacia
  dentro (`outline-offset` negativo) y `--focus-ring`. Contenido del panel: ficha, el bloque que
  hoy ya está dentro de `player-panel`; perfil, el resumen (esqueleto, error o `GameSummaryPanel`);
  coincidencias, el aviso de horas, los criterios y «Jugadores compatibles».
- **Píldora y punto**: `motion.span` con `layoutId` por instancia, como hoy, dentro de cada
  `Tabs.Tab`; tinta `var(--game-ink-…)` (`game.inkVar`) y texto elegido `--tab-ink`. Sin movimiento
  reducido, sin animación (`useReducedMotion`/`respectReducedMotion`).

### 4.6 Chips, avisos, sellos y estados (M12 a M15; RF-14 a RF-17)
- `FilterChip`: `Button` con `variant="chip"`, `aria-pressed`, un punto (`chip__dot`) y la tinta
  en la variable `--chip-ink` que ahora recibe `inkVar`; «Todos los juegos» no la fija y cae a
  `--volt` / `--volt-edge`. Un solo chip pulsado sale del almacén de la agenda, como hoy.
- `Notice`: `Paper` con `component="p"` y roles explícitos. **Se descarta `Alert`** porque fuerza
  `role="alert"` y un `aria-describedby` propio que RF-15 prohíbe cambiar (DT-5). Roles de hoy:
  alerta en los errores y los avisos de login, estado en la resincronización, ninguno en el resto.
  `MutationNotice` conserva su regla de no mostrarse tras limpiar la sesión.
- `Stamp` → `Badge` con `variant` por tono, `title`, `role="status"` solo con `announce` y el estado
  de «estampar» (`pressKey`, clase `stamp--pressing` y `@keyframes press`, que se quedan); punto
  luminoso con `::before` y tokens `--ok-edge`/`--warn-edge`.
- `Spinner` → `Loader` con un tipo propio (un `span` con borde y giro de 640 ms, 13 px). Dentro de
  botones usa `currentColor`; el de `Working` y el de «Actualizando» (sin rol, con
  `aria-label="Actualizando"`) toman el color de T0 (§3.2).
- Esqueleto: `Skeleton` de la librería sin su animación (`animate={false}`), con el aspecto y la
  luz que recorre la fila de hoy; el contenedor conserva `aria-hidden="true"`.
- `Failure`: «Reintentar» pasa a `AppButton` con `blocked={retryBusy}`, `Spinner` y el foco por
  `autoFocusRetry`, igual que hoy.

### 4.7 Ventana de desvincular y Configuración (RF-23 a RF-25)
Estado local de `SettingsPage` (los almacenes de la 016 no cambian; DT-17):
`unlinkFor { accountId, title } | null`, `unlinkError | null` y una petición de foco como la de
`SchedulePage`. `title` se calcula **al abrir** con `unlinkDialogTitle(handle del momento)` y no
cambia aunque la lista se vuelva a leer. El título de la sección «Cuentas vinculadas» pasa a
`<h2 ref tabIndex={-1}>`. El mapa de botones «Desvincular» por cuenta se guarda como el de
«Cancelar sesión» en la agenda. `accountError` deja de incluir el error de desvincular.

## 5. Reglas puras y algoritmos (en `domain/`, sin React, DOM ni reloj)

### 5.1 `chooseInitialTheme` y `bootTheme` (RF-5, RF-7)
```
chooseInitialTheme({ stored: string | null, storageAvailable: boolean, systemPrefersLight: boolean }):
  si storageAvailable y (stored == 'light' o stored == 'dark')  → stored
  si no                                                         → systemPrefersLight ? 'light' : 'dark'

bootTheme(env: { readStored(): string | null; prefersLight(): boolean; apply(theme): void }):
  storageAvailable ← true
  intentar stored ← env.readStored()  ; si lanza → stored ← null, storageAvailable ← false
  theme ← chooseInitialTheme({ stored, storageAvailable, systemPrefersLight: env.prefersLight() })
  env.apply(theme)                  // escribe data-theme y data-mantine-color-scheme
  devolver theme
```
- Ni «hoy» ni reloj: no los necesita. Casos de RNF-6: guardado «light»; guardado «dark» (ambos
  ganan a la preferencia del sistema); sin guardado con sistema claro y con sistema oscuro; valor
  extraño; almacenamiento no disponible (usa el sistema).
- La función debe ser **autocontenida** (sin imports, sin cierres, sin `__name` ni ayudas de
  esbuild): se inyecta serializada. La prueba la serializa con `toString()` y la ejecuta en
  `node:vm` sin globales; si falla, el plugin habría servido un script roto.

### 5.2 `unlinkDialogTitle` (RF-23)
```
unlinkDialogTitle(handle: string | null):
  handle != null ? `¿Desvincular ${handle}?` : '¿Desvincular esta cuenta?'
```
El identificador se entrega a React como texto (nunca como HTML).

### 5.3 `dialName` y `pageStepValue` (RF-11)
```
dialName(label, value, unit): `${label} ${value} ${unit}`
// misma cadena que calcula hoy el navegador a partir de la etiqueta visible

pageStepValue(key, value, { min, max, step }):
  si key no es 'PageUp' ni 'PageDown'            → null
  big ← regla de la línea base (ver abajo)
  next ← value ± big
  next ← acotar(next, min, max) y ajustar al múltiplo de step desde min
  devolver next
```
**Regla de «big»**: se fija con la tabla que anota T0 (valor partiendo de 25 en 0–50 y de 4 en 0–12
para cada tecla). Hipótesis de partida, la del navegador de escritorio de Chromium:
`big = max((max − min) / 10, step)`, y el valor resultante se ajusta al paso (0–50 de 5 en 5 → ±5;
0–12 de 1 en 1 → ±1,2 que se redondea al paso). **La prueba se escribe con la tabla medida, no con
la hipótesis**; si T0 mide otra cosa en el navegador de referencia, manda la medida.

### 5.4 Foco de «Anotar una sesión» (RF-12, RF-20, RF-22)
Misma forma que `detail/focusRule.ts`: la regla devuelve un destino y la vista lo aplica.
```
resolveDraftFocus(event, ctx):
  'opened'                       → 'titleField'
  'submitStarted'                → ctx.origin == 'button' ? 'dialogTitle' : null   // desde Intro, el foco sigue
  'clientCheckFailed' | 'failed' → ctx.origin == 'button' ? 'submitButton' : 'titleField'
  'closed'                       → según ctx.closedBy y ctx.opener:
        'viewChanged'  → null                                   // RF-22: nada retenido
        opener == 'slot'      y bloque existe y puede enfocarse → 'slotBlock'
        opener == 'header' | 'proposal' y «Anotar sesión» puede enfocarse → 'headerButton'
        en otro caso → 'panelTitle'
  'reopenedByProposal'           → 'titleField'

resolveAfterListFocus(ctx):       // primera respuesta de la lista tras cerrar
  si ctx.focusWasOnBlock y no ctx.blockStillShown y no ctx.alreadyEvaluated → 'panelTitle'
  en otro caso → null            // y la regla no se vuelve a evaluar
```
Cómo se aplica (`SchedulePage` y `SessionDraftSlip`):
1. `SchedulePage` guarda, **sin tocar el almacén de la 016**, de dónde se abrió el borrador:
   `openerRef = 'slot' + {día, hora}` en el clic de un bloque, `'header'` en «Anotar sesión»; si
   el borrador aparece sin que se haya fijado ninguno, se trata como `'proposal'`.
2. Los bloques de la semana llevan `data-slot="{día}-{hora}"`, y «Anotar sesión» un `ref`; el foco
   se aplica con una petición y `useLayoutEffect`, como el resto de `SchedulePage`.
3. `origin` de un envío: `button` salvo que el foco esté en «Título» al empezar (envío con Intro).
4. Tras cerrar con un bloque como destino, se guarda `seqAtClose` (número de respuestas de la
   lista vistas) y un `focusin` en `document` recuerda el último elemento enfocado; la **primera**
   respuesta posterior (datos o error) evalúa `resolveAfterListFocus` con
   `focusWasOnBlock = lastFocused === bloque` y descarta el seguimiento, también si no actúa.
5. «Nunca dos ventanas» (Q8) ya lo garantiza la 016 (`cancelDialogOpen` entra en `resolveProposal`);
   esta spec solo añade que, al abrirse por la propuesta pendiente, el foco va a «Título».

### 5.5 Foco de la ventana de desvincular (RF-24, RF-25)
```
resolveUnlinkFocus(event, ctx):
  'opened'                              → 'back'                // «Volver»
  'submitStarted'                       → 'dialogTitle'         // el botón pasa a deshabilitado
  'failed'                              → 'confirm'             // «Desvincular» de la ventana
  'succeeded'                           → 'sectionTitle'        // «Cuentas vinculadas» (P7)
  'closedWithoutSending':
        ctx.viewChanged                  → null                 // RF-22
        ctx.rowButtonFocusable           → 'rowButton'
        en otro caso                     → 'sectionTitle'
```
Al pulsar «Desvincular»: guarda `accountSending` (un solo envío), `syncAccount.reset()`, se borra
`unlinkError` y se pide el foco al título; con éxito se cierra y se pide `sectionTitle`; con error
distinto de 401 (`!isSessionCleared`) se escribe `unlinkError` (mensaje del servidor o
`NO_MESSAGE_TEXT`) y se pide `confirm`; con 401 la spec 007 ya cierra la vista. «Volver», cerrar,
Escape y pulsar fuera, sin envío en curso, borran `unlinkError`, cierran y piden el foco.

### 5.6 Colores literales y enlace con el catálogo (RF-2, RNF-6)
```
findColorLiterals(texto):
  quitar comentarios
  sustituir `var(--nombre` por `var(`       // solo se ignora el NOMBRE de la variable
  buscar: #hex de 3 a 8 dígitos | rgb( rgba( hsl( hsla( hwb( lab( lch( oklab( oklch( color( |
          nombres CSS como palabras sueltas (red, white, black, …)
  excluir las palabras clave que no fijan un color
  devolver las coincidencias
```
Para las pruebas de §9.3 se aplica a los valores de las declaraciones (no a selectores ni a nombres de
propiedad). Una mezcla (`color-mix`), una sombra o un degradado se revisan igual y solo pasan si
todos sus colores son `var(--token)` o palabras clave.

## 6. Cómo se pinta en la interfaz
- **Sin cambio de disposición**: las vistas siguen igual; cada control sale de su componente y la
  disposición (rejillas, paneles, `page-head`) no se toca (Q-1).
- **Estados de los controles**: reposo, puntero encima, foco, pulsado, deshabilitado, bloqueado y
  error se escriben en `theme/components/*.css` con los selectores de la librería
  (`[data-variant]`, `[data-disabled]`, `[data-checked]`, `[aria-selected]`, `[aria-pressed]`) más
  `[aria-disabled]` y `[aria-invalid]` donde aplique.
- **Cambio de tema**: no hay valores por esquema en el CSS de la librería ni del proyecto; solo
  tokens. La transición en círculo recorta toda la página, incluidas las ventanas montadas.
- **Cambio de un token** (criterio de finalización): cualquier `var(--x)` de §3.2 y los de la lista
  de la spec se reflejan al instante, sin recargar, porque ningún componente migrado copia valores.
- **Sin componentes sin estilo (RNF-8)**: producción usa los mismos CSS por la misma cadena de
  importaciones; el plugin del tema inyecta el mismo script en `dev` y en `build`.

## 7. Decisiones técnicas
| # | Decisión | Alternativa descartada |
| --- | --- | --- |
| DT-1 | CSS de la librería **por componente y en capa** (`*.layer.css`) y todo el CSS del proyecto **sin capa**. Los tokens ganan siempre y no hay guerra de especificidad. | Importar `styles.css` completo (7,8 mil líneas, con `baseline` y otras reglas globales que cambiarían la página, RF-4) o Módulos CSS con `postcss-preset-mantine` (dependencia de desarrollo nueva, RNF-1). |
| DT-2 | **Paletas y variables de color hechas de `var(--token)`**, con un resolvedor que unifica los dos esquemas. La prueba de RNF-6 las recorre. | Poner hexadecimales «parecidos» en el tema (rompe RF-2) o dejar las paletas por defecto de Mantine (llevan colores literales al DOM). |
| DT-3 | **`forceColorScheme` + gestor inerte**: el tema lo manda `ThemeProvider`. | `localStorageColorSchemeManager({ key: 'tmu.theme' })` o `useMantineColorScheme`: usa `auto`, escribe valores que no son «light»/«dark» y **sincroniza pestañas por `storage`**, contra RF-7. |
| DT-4 | **Una sola fuente del tema inicial**: la función de `domain/themeChoice.ts` se inyecta serializada con un plugin de Vite; la prueba ejecuta ese mismo texto. Cumple RNF-6 «de una sola fuente». | Duplicar el script en `index.html` y probar la copia con `node:vm` (permitido solo si la fuente única fuese imposible; no lo es). Un `<script type="module">` no sirve: no bloquea la primera pintura. |
| DT-5 | **`Notice` sobre `Paper`**. | `Alert`: impone `role="alert"` y `aria-describedby`, sin forma de quitarlos (RF-15). |
| DT-6 | **`Slip` sobre `Modal.Root` + piezas**, sin `@mantine/modals`. Aporta capa, retención de foco, Escape, clic fuera y bloqueo del desplazamiento con compensación (P9). La entrada/salida con `transitionProps` propio. | Seguir con la ventana a mano (no cumple RF-1). Mantener `motion` dentro: la salida animada de `AnimatePresence` no sobrevive al desmontado de la librería. |
| DT-7 | **`returnFocus={false}`** y foco devuelto por la vista con reglas puras. | El retorno automático de la librería: lleva al elemento activo previo y contradice RF-12 (propuestas, panel, bloque que desapareció) y RF-24. |
| DT-8 | **`Tabs` de la librería + píldora con `motion`**, igual que hoy. | `FloatingIndicator` (mide el DOM, cambia la animación y no pinta con la tinta del juego sin más CSS). |
| DT-9 | **`Slider` de la librería** con Re Pág / Av Pág por envoltorio (`pageStepValue`) y miniatura realmente deshabilitada por atributos. | `<input type="range">` nativo con estilos (no cumple RF-1) o dejar sin Re Pág y Av Pág (regresión, RF-11). |
| DT-10 | **Listas nativas** (`NativeSelect`, P1). | `Select` con buscador: cambia teclado y lectores (RNF-2). |
| DT-11 | **Chip = `Button` con `aria-pressed`**. | `Chip` de la librería: es casilla o botón de opción (rol distinto, RF-14). |
| DT-12 | **`pending` y `blocked` propios**; «Enviando…» lo pone el llamador. | `loading` de la librería (oculta el texto, P3). |
| DT-13 | **Tinta del catálogo**: `GameDefinition.inkVar` + tokens `--game-ink-*` + prueba que compara el valor del token con `accent` en los dos temas. Añadir un juego sin su token falla la prueba. | Unificar con `--ink-*` (cambia lo que se ve, fuera de alcance) o derivar el token de `accent` en JS (colores literales en JS). |
| DT-14 | **`--focus-ring = var(--accent-text)`**: ya cumple 3:1 sobre todas las superficies medidas y en oscuro es el volt de hoy; no hace falta un token con valor nuevo. Halo translúcido al 75 %, medido en T. | Un token nuevo con un verde distinto (más valores a mantener) o halo sólido (cambia más el aspecto). |
| DT-15 | **La prueba de colores lee los CSS y el tema** con `node:fs` y las exportaciones puras de `@mantine/core` (`DEFAULT_THEME`, `mergeMantineTheme`, `defaultCssVariablesResolver`); sin DOM. | Probar en navegador (fuera de RNF-6) o solo comprobar `--volt` (insuficiente, lo dice la spec). |
| DT-16 | **Se elimina el CSS de `.stamp--danger`**: ningún sello lo usa (N7). | Dejarlo con un token nuevo sin línea base. |
| DT-17 | **El estado de la ventana de desvincular es local** a `SettingsPage`. | Un tercer almacén (cambia la 016 sin necesidad: no es estado compartido). |
| DT-18 | **Esqueleto con `Skeleton`**, animación propia. | Su pulso (cambia la luz que recorre la fila). |

## 8. Riesgos
| # | Riesgo | Mitigación |
| --- | --- | --- |
| R1 | Capas CSS: un navegador sin soporte rompería los estilos. | El proyecto ya exige `color-mix` y vistas de transición (mismas versiones). T3 lo prueba en el navegador del equipo (Firefox) y en Chromium. |
| R2 | La caja de `Button`, `Input` y `Tabs` no mide lo de hoy (±2 px, RF-3). | Cada familia se compara con la línea base antes de pasar a la siguiente; `inner`, `label`, `section` se aplanan con `display` y relleno de hoy. |
| R3 | La entrada de la ventana con `transitionProps` no se ve igual que con `motion`. | No es una diferencia declarada: se compara con la línea base y, si se nota, se ajusta la curva (`--spring`) y la duración; no se vuelve a `motion`. |
| R4 | `FocusTrap` de la librería y los movimientos de foco programáticos (título al deshabilitar el botón). | El título está dentro de la ventana; el recorrido de la trampa solo actúa con Tab. T7 recorre los casos 6, 13 y 14 de la 009 y los de la spec. |
| R5 | La miniatura del deslizador es siempre enfocable; Re Pág / Av Pág se difieren al envoltorio. | Atributos aplicados en cada render (`useLayoutEffect`) y prueba manual con CS2 sin Premier; T de coincidencias lo recorre. |
| R6 | `NativeSelect` añade un icono y un contenedor, y su chevron cambia el relleno derecho. | Se fija `padding-right` de hoy y el chevron con `--ink-3`; se mide la caja. |
| R7 | `Tabs.Panel` solo monta el panel del juego elegido y deja fuera el contenido del resto. | Es lo que ya pasa (un solo juego a la vez). El cambio de juego sigue sin recargar la página. |
| R8 | Importar `@mantine/core` en Node dentro de Vitest puede pedir un entorno que no existe. | T2 (primera prueba de temas) lo comprueba antes de seguir; si falla, se importa el tema por separado y se reconstruye el resolvedor por cuenta propia, y se anota. |
| R9 | `useIsPresent` y la ventana del borrador al salir de la agenda (T9b de la 016). | `SessionDraftSlip` conserva su montaje condicional; solo cambia su interior. |
| R10 | El número de tareas (≥ 20) supera lo que pide el flujo SDD (más de 10: proponer dividir). | §12. |

## 9. Estrategia de pruebas
Constitución, principio 4: lo que la spec exige en el frontend (RNF-6) se escribe con Vitest
**antes** que el código (rojo por la razón correcta, después verde), sin `.only`, sin dependencias
nuevas, sin red ni navegador. Lo visual, el foco, los roles y el teclado se comprueban con el
recorrido de los criterios y en la 018.

### 9.1 Pruebas con Vitest (`npm test`)
| Archivo | Qué comprueba | RF |
| --- | --- | --- |
| `domain/themeChoice.test.ts` | Los seis casos de §5.1; `bootTheme` con un entorno falso (lectura que lanza, valor extraño, `apply` recibe el valor); que `chooseInitialTheme.toString()` se ejecuta en `node:vm` sin globales y da lo mismo. | RF-5, RF-7, RNF-6 |
| `theme/themeColors.test.ts` | (a) Ningún valor de `createTheme` ni de `tokenPalettes` es un color literal; (b) el resolvedor, mezclado con el de la librería, no deja ningún valor literal en `variables`, `light` ni `dark` (cuerpo, texto, bordes, marcador, deshabilitado, error, ancla, contraste y paleta `volt`); (c) los CSS de `theme/components/` y los que pasan a CSS de vista no tienen colores literales; (d) los CSS de la librería importados (`theme/mantineCss.ts`) solo traen los literales que la prueba lista con la razón de por qué no se pintan o se anulan; uno nuevo la hace fallar; (e) toda `var(--x)` apunta a un token de `tokens.css` o a una variable de la librería; (f) `findColorLiterals` ignora `transparent`, `currentColor`, `inherit`, `initial`, `unset` y `revert` y detecta una mezcla, una sombra y un degradado con un literal dentro. | RF-2, RNF-6 |
| `domain/games.test.ts` (nuevo) | Cada juego tiene su `--game-ink-<id>` en `tokens.css`, con el valor de `accent`, y el mismo en el tema claro. | RF-2 |
| `domain/dial.test.ts` | `dialName` y `pageStepValue` con la tabla de T0 (incluye los límites y el valor ya en el extremo). | RF-11 |
| `domain/draftFocus.test.ts` | Cada línea de §5.4: abrir, envío con botón y con Intro, fallo, cierre por cada camino (bloque, cabecera, propuesta, destino ausente, vista cambiada), primera respuesta de la lista con y sin foco movido, y que no vuelve a evaluarse. | RF-12, RF-22 |
| `domain/unlinkDialog.test.ts` | Título con y sin cuenta, y cada línea de §5.5. | RF-23 a RF-25 |

La suite de la 016 (105 pruebas) debe seguir en verde. La función `findColorLiterals` se prueba
primero (rojo), luego el tema.

### 9.2 Comprobaciones con las herramientas del navegador (no son pruebas automáticas)
Van al registro `specs/017-libreria-de-estilos/validation.md`, una sección por tarea:
- **Línea base (T0)**, antes de tocar nada: las capturas, valores calculados, caja dibujada, líneas
  de texto, ancho desplazable, orden de tabulación y valores de teclas de la spec; el color de los
  dos indicadores giratorios; el tamaño de RNF-7.
- Por familia: comparación con la línea base (RF-3), foco y contraste medidos en los dos temas (RF-20,
  RNF-3), roles en el árbol de accesibilidad, doble clic con la pestaña de red, límites de caracteres
  al pegar y con composición, «Atrás» y 401 con ventana abierta, modo simulado, construcción de
  producción (RNF-8) y los recorridos de foco de las dos ventanas y de la de desvincular.
- Los criterios de «cambiar un token a mano» (lista completa de la spec) se hacen una vez migrado
  todo, en los dos temas.

### 9.3 Qué no se prueba y por qué
Componentes y vistas con DOM simulado: descartado por el usuario (Q6, opción B). Los recorridos
completos los cubrirá la 018 (la 017 le garantiza roles y nombres estables, RF-8 a RF-19).

## 10. Trazabilidad
| RF / RNF | Dónde se cubre |
| --- | --- |
| RF-1 | §2.2 (todos los usos), §4; criterio: búsqueda de `className="btn`/`select`/… sin resultados. |
| RF-2 | §3.1 a §3.3 (tokens, paletas, resolvedor), §5.6, `themeColors.test.ts`, `games.test.ts`. |
| RF-3 | §4.1, §4.2, §6; T0 de línea base y comparación por familia. |
| RF-4 | §3.1 (sin `baseline`, capas), §3.4; comparación de componentes que se quedan. |
| RF-5, RF-6, RF-7 | §3.5, §5.1, `themeChoice.test.ts`, `ThemeProvider`, DT-3, DT-4. |
| RF-8 | §4.1 (`AppButton`, `pending`, `blocked`, `ButtonLink`). |
| RF-9 | §4.2. |
| RF-10 | §4.2 (`SelectField`), DT-10. |
| RF-11 | §4.3, §5.3, `dial.test.ts`. |
| RF-12 | §4.4, §5.4, `draftFocus.test.ts`; foco de cancelar (009) sin cambios. |
| RF-13 | §4.5. |
| RF-14 | §4.6 (`FilterChip`), §3.2 (tokens `--game-ink-*`). |
| RF-15 | §4.6 (`Notice`), DT-5. |
| RF-16 | §4.6 (`Stamp`). |
| RF-17 | §4.6 (`Spinner`, esqueleto, `Failure`), §3.2. |
| RF-18 | §4.1 (`IconButton`, `Modal.CloseButton`). |
| RF-19 | Revisión de textos al migrar; el botón de cerrar fija `aria-label="Cerrar"` (RF-18); la librería no trae texto propio visible. |
| RF-20 | §3.2 (`--focus-*`), §3.4. |
| RF-21 | Sin código propio: se recorre el modo simulado en cada tarea de validación. |
| RF-22 | §4.4 (desmontaje y `lockScroll`), §5.4 y §5.5. |
| RF-23 a RF-25 | §4.4, §4.7, §5.2, §5.5, `unlinkDialog.test.ts`. |
| RNF-1 | §1. |
| RNF-2 | §9.2 (comparación con la línea base; lista cerrada de diferencias). |
| RNF-3 | §3.2 (contraste), §9.2. |
| RNF-4 | `modal.css` con el título largo sin espacios (`overflow-wrap`), §9.2. |
| RNF-5 | `respectReducedMotion` (§3.3), `motion` ya respeta el movimiento reducido. |
| RNF-6 | §9.1. |
| RNF-7 | §1 (CSS y JS por componente), T0 y cierre. |
| RNF-8 | §3.1, §3.5, §6. |

## 11. Comandos de comprobación (en `frontend/`)
`npm run typecheck`, `npm run lint`, `npm test` (Vitest, sin `.only`), `npm run build`. Búsquedas
de cierre (con `Grep`): colores literales en `src/theme/` y en los CSS de componentes migrados;
`className="btn`, `className="select`, `className="textarea`, `className="slider`,
`className="check`, `className="chip`, `className="notice`, `window.confirm` (sin resultados en
código migrado). `graphify update .` al terminar cada tarea, si está disponible.

## 12. Orden de construcción y tamaño
**Decisión del usuario (2026-11-22): un solo plan en bloques; no se divide la spec.** `tasks.md`
quedó en 24 tareas con un punto de control al final de cada bloque.
La spec toca 16 componentes, el tema, dos ventanas y una ventana nueva; saldrán **entre 18 y 22
tareas** de 20 a 30 minutos. El flujo SDD pide proponer dividir la spec si salen más de 10. Propuesta
(la decide el usuario al aprobar el plan; no cambia ningún RF):
1. **017 (bloque A, tema y base)**: T0 línea base, T1 dependencias, T2 reglas puras y pruebas
   (`themeChoice`, `dial`, `unlinkDialog`, `draftFocus`, `colorLiterals`, `games`), T3 tema,
   tokens, proveedor y plugin del tema inicial.
2. **017 (bloque B, controles)**: botones y enlaces, campos, listas, interruptor y deslizadores,
   chips, avisos, sellos y estados.
3. **017 (bloque C, composiciones)**: pestañas con panel, ventanas (`Slip`, cancelar, anotar una
   sesión con su foco), ventana de desvincular.
4. **017 (bloque D, cierre)**: foco del tema claro en elementos que no migran, recorridos de
   validación, `AGENTS.md` y `MEMORY.md`.
Cada bloque termina con build, typecheck, lint y pruebas en verde y con su sección de
`validation.md`; el usuario puede aprobar un bloque antes de empezar el siguiente. Dividir la
spec en 017a (A y B) y 017b (C y D) es la alternativa si prefiere cerrar una fase más corta; el
orden dentro de cada bloque lo fija `/sdd-tasks`.

## 13. Lo que el plan deja a la medición
Estos valores no se inventan antes de tener la línea base o un navegador delante: el token de los
indicadores giratorios (§3.2), el porcentaje del halo (§3.2), la regla de `big` de Re Pág / Av Pág
(§5.3), la lista final de CSS de la librería (§3.1), los literales de la librería que la prueba (d)
admite con su razón (§9.1) y los ajustes de la caja de cada familia (R2).
