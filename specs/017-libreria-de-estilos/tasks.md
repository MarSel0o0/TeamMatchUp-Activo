# Tareas 017 — Librería de estilos (Mantine) en los componentes base
Estado: aprobado por el usuario (2026-11-22); implementadas las 24 tareas (2026-11-22); pendiente de la revisión del usuario. `plan.md` aprobado el
2026-11-22: **un solo plan en cuatro bloques** (A tema y base, B controles, C composiciones, D
cierre), no se divide la spec. Salen 24 tareas, más de las 10 que sugiere el flujo SDD; el usuario
lo decidió así y cada bloque termina con un punto de control.

Reglas para todas las tareas:
- Una tarea cada vez, en este orden. Cada tarea cita sus RF/RNF y sigue `plan.md`.
- Con pruebas: primero las pruebas y el módulo con las firmas que lanzan `Tn: sin implementar`;
  `npm test` en **rojo por la razón correcta**; después el código; `npm test` en **verde**. Las dos
  salidas, con el motivo del rojo, van a `specs/017-libreria-de-estilos/validation.md` (una sección
  por tarea; la crea T1).
- «Verde en el frontend» = en `frontend/`, `npm test`, `npm run typecheck`, `npm run lint` y
  `npm run build` sin errores; sin `.only`, `any`, `@ts-ignore` ni aserciones para esquivar tipos;
  `git status --short backend/` vacío. La suite de la 016 (105 pruebas) sigue en verde.
- «Comparado con la línea base» = en el navegador, en los dos temas y a 1280 y 375 px, contra las
  capturas y medidas de T1 y T2: solo las diferencias declaradas de RNF-2; valores calculados
  iguales; caja dibujada ±2 px; ningún texto ni fila parte en más líneas (RF-3).
- Ningún color escrito a mano en lo que se migra: los valores salen de `tokens.css` (RF-2).
- **Puntos de control**: al terminar T9 (bloque A), T17 (B), T21 (C) y T24 (D) se para y se pide la
  aprobación del usuario antes de seguir.
- Marcas: **[usuario]** = solo puede hacerla el usuario. Sin marca = `implementer` (los recorridos
  los puede hacer el `implementer` o el `reviewer` con un navegador real).

## Bloque A — Tema y base

- [x] **T1. Línea base visual y de medidas.** RF-3, RNF-2, RNF-4, RNF-7 (condición previa de la spec)
  - Antes de tocar código y con la 016 ya implementada. Crear `validation.md` con su índice
    (T1 a T24).
  - Capturas de cada vista (entrada, acceso, registro, inicio, perfil, configuración,
    coincidencias, agenda, detalle, ficha, verificación con Riot, vuelta de Steam, «no encontrada»)
    a 1280 y 375 px, en tema oscuro y claro, con sus estados relevantes (formulario con error,
    escritura en curso, ventana abierta, error de carga, vacío, modo simulado); en una carpeta
    fuera de `src/`.
  - Por cada componente del inventario (M1 a M16) en reposo: valores calculados de RF-3, caja
    dibujada (alto y ancho) y número de líneas de sus textos a 360 y 375 px; ancho desplazable de
    cada vista a 360 y 375 px.
  - Hecho cuando: las capturas y una tabla con las medidas están guardadas y enlazadas desde
    `validation.md`; está anotado el navegador y su versión.

- [x] **T2. Línea base de teclado, accesibilidad y carga.** RF-11, RF-17, RF-20, RNF-3, RNF-7
  - Orden de tabulación de cada vista; árbol de accesibilidad de cada componente migrado (nombre,
    rol, estado, descripción).
  - Para cada deslizador, partiendo de 25 en «Diferencia máxima de rango» y de 4 en «Horas en
    común»: el valor que deja cada tecla (flechas, Inicio, Fin, Re Pág, Av Pág).
  - Color calculado de los indicadores «Leyendo…»/«Cargando…» y «Actualizando» (RF-17), contrastes
    de hoy de los componentes (los que no cumplen 3:1 o 4,5:1 se anotan, RNF-3) y tamaño de código y
    estilos que descarga la pantalla de acceso (RNF-7, `npm run build`).
  - Hecho cuando: todo está en `validation.md` con la tabla de teclas de los deslizadores y el color
    de ambos indicadores; no se modificó ningún archivo de `src/`.

- [x] **T3. Dependencias.** RNF-1
  - Comprobar antes de instalar: `npm view @mantine/core versions` (última 8.3.x con rango de React
    18.3; hoy 8.3.18) y `npm view @mantine/core@8.3.18 peerDependencies`. Si no resuelve, parar y
    preguntar al usuario.
  - `npm install --save-exact @mantine/core@8.3.18 @mantine/hooks@8.3.18`.
  - Hecho cuando: `package.json` tiene ambas dependencias con versión exacta (sin `^`) y ninguna
    dependencia de desarrollo nueva; `npm ls react react-dom @mantine/core @mantine/hooks` muestra un
    único React 18.3.1 y las dos de Mantine en 8.3.18; `npm ls vite` un único 5.4.21; la instalación
    no avisó de dependencias incompatibles; verde en el frontend; salida en `validation.md`.

- [x] **T4. Tema inicial: regla pura y pruebas.** RF-5, RF-7, RNF-6
  - Primero `src/domain/themeChoice.test.ts` y `src/domain/themeChoice.ts` con firmas que lanzan
    `T4: sin implementar` (plan §5.1): los seis casos de `chooseInitialTheme` (guardado «light»,
    guardado «dark», sin guardado con sistema claro y con sistema oscuro, valor extraño,
    almacenamiento no disponible); `bootTheme` con un entorno falso (la lectura lanza, el valor
    se aplica); y que `chooseInitialTheme.toString()` se ejecuta en `node:vm` sin globales y da lo
    mismo.
  - Después implementar: función autocontenida, sin imports ni cierres.
  - Hecho cuando: rojo y verde en `validation.md`; el archivo no importa nada ni usa reloj; verde en
    el frontend.

- [x] **T5. Detector de colores literales.** RF-2, RNF-6
  - Primero `src/theme/colorLiterals.test.ts` y `src/theme/colorLiterals.ts` con firmas sin
    implementar (plan §5.6). Casos: hexadecimales, `rgb(a)`, `hsl(a)`, nombres de color, una mezcla
    con `color-mix`, una sombra y un degradado con un literal dentro (fallan); `transparent`,
    `currentColor`, `inherit`, `initial`, `unset`, `revert`, `var(--white)` y una mezcla solo con
    tokens (pasan).
  - Hecho cuando: rojo y verde en `validation.md`; verde en el frontend.

- [x] **T6. Reglas puras del deslizador, de la desvinculación y del foco de «Anotar una sesión».**
  RF-11, RF-12, RF-22, RF-23 a RF-25
  - Primero las pruebas y los módulos con firmas sin implementar: `domain/dial.ts` (`dialName`,
    `pageStepValue`, con la tabla de T2; la regla de «paso grande» sale de esa tabla, no de la
    hipótesis del plan §5.3), `domain/unlinkDialog.ts` (`unlinkDialogTitle`,
    `resolveUnlinkFocus`) y `domain/draftFocus.ts` (`resolveDraftFocus`, `resolveAfterListFocus`),
    con los casos de plan §5.3 a §5.5.
  - Después implementar. Sin React, DOM ni reloj.
  - Hecho cuando: rojo y verde de los tres archivos en `validation.md`; ninguno importa React, el
    DOM, `services/` ni usa reloj; verde en el frontend.

- [x] **T7. Tokens nuevos y enlace con el catálogo.** RF-2, RF-14, RF-20
  - Primero `src/domain/games.test.ts`: cada juego tiene `--game-ink-<id>` en `tokens.css` con el
    valor de `accent`, igual en el tema claro (rojo: no existen).
  - Añadir a `tokens.css` los tokens de plan §3.2 con los valores de hoy (`--btn-pen-shadow`,
    `--danger-edge`, `--btn-orb-bg`, `--ok-edge`, `--warn-edge`, `--tab-ink`, `--tab-pill-shadow`,
    `--game-ink-*`, `--focus-ring`, `--focus-edge`, `--focus-halo`) y `inkVar` en cada juego de
    `domain/games.ts`. No cambia ningún valor existente.
  - Hecho cuando: rojo y verde en `validation.md`; `git diff` de `tokens.css` solo añade líneas;
    medidos y anotados los contrastes de `--focus-ring` contra cada superficie del tema claro y del
    halo del 75 % contra el panel y la ventana (si el halo no llega a 3:1 se sube el porcentaje);
    verde en el frontend.

- [x] **T8. Tema de la librería sin colores literales.** RF-1, RF-2, RF-4, RNF-6
  - Primero `src/theme/themeColors.test.ts` (plan §9.1, puntos a a f) con los módulos con firmas sin
    implementar. Si importar `@mantine/core` en Node falla, anotarlo y aplicar la salida del plan
    (riesgo R8) antes de seguir.
  - Después `src/theme/tokenPalettes.ts`, `cssVariablesResolver.ts`, `mantineTheme.ts` (sin
    `components` todavía; se rellenan en las tareas de cada familia) y `mantineCss.ts` con los CSS de
    la librería previstos (plan §3.1). La prueba (d) lista cada literal que traen esos CSS con la
    razón por la que no se pinta o se anula.
  - Hecho cuando: rojo y verde en `validation.md`; ningún color literal en el tema, el resolvedor ni
    las paletas; toda `var(--x)` resuelve a un token o variable de la librería; verde en el
    frontend.

- [x] **T9. Proveedor, tema inicial y foco global.** RF-4, RF-5, RF-6, RF-7, RF-20, RNF-8
  - Plugin `themeBootPlugin` en `vite.config.ts` que inyecta en `<head>` el script con
    `bootTheme`; quitar el script de `index.html`; `ThemeProvider` con `MantineProvider`
    (`forceColorScheme`, gestor inerte, tema de T8) y `apply` que escribe `data-theme` y
    `data-mantine-color-scheme`; `main.tsx` importa `theme/mantineCss` antes de `global.css`;
    `focus.css` y el indicador global de `global.css` pasan a `--focus-ring` (grosor y separación
    iguales).
  - Hecho cuando: ninguna vista cambia (comparado con la línea base: solo el color del indicador de
    foco en el tema claro); recarga con preferencia «light», «dark», sin preferencia con el sistema
    en claro y en oscuro, valor extraño y almacenamiento bloqueado: primera pintura con el tema
    correcto y ninguna entrada nueva en el almacenamiento (en particular, sin
    `mantine-color-scheme-value`); cambiar el tema del sistema o de otra pestaña no cambia la
    página; el botón de tema conserva la transición en círculo y la barra del navegador; el script
    está en la página servida por `npm run dev` y por `npm run build`; verde en el frontend.
  - **Punto de control del bloque A.**

## Bloque B — Controles

- [x] **T10. Componentes de botón, botón de icono e indicador.** RF-1, RF-2, RF-8, RF-17, RF-18
  - `AppButton` y `ButtonLink` (`Button`), `IconButton` (`ActionIcon`) y `Spinner` (`Loader` con
    tipo propio), con `button.css`, `icon-button.css` y `loader.css` (el CSS de hoy con selectores
    de la librería y solo tokens) y sus `components.*.extend` en `mantineTheme.ts`. Todavía sin
    migrar vistas.
  - Hecho cuando: el nuevo botón, probado en una vista temporal retirada al terminar, reproduce
    cada variante (normal, `pen`, `quiet`, `danger`; `sm`, `md`, `lg`, `block`; con icono, orbe e
    indicador; deshabilitado y bloqueado) con los valores calculados de la línea base y la caja ±2
    px; `pending` no oculta el texto; `blocked` conserva el foco y no hace nada; el enlace conserva
    rol de enlace; cambiar `--volt` y `--btn-pen-shadow` en las herramientas cambia el botón
    primario; sin colores literales en los CSS nuevos (`themeColors.test.ts` en verde); verde en el
    frontend.

- [x] **T11. Migrar los botones de acceso, entrada y barra.** RF-1, RF-8, RF-18
  - `LoginPage`, `RegisterPage`, `LandingPage`, `NotFoundPage`, `ErrorBoundary`, `AppLayout`
    (cerrar sesión de la barra con `IconButton` y del menú con `AppButton`) y `ThemeToggle`.
  - Hecho cuando: comparado con la línea base en esas vistas; doble clic en «Entrar» y en
    «Registrarme» envía una sola petición con «Enviando…» visible; «Cambiar a tema …» y «Cerrar
    sesión» conservan nombre y título; el botón de cambiar tema conserva el giro del icono; ningún
    `className="btn` queda en esos archivos; verde en el frontend.

- [x] **T12. Migrar los botones de perfil, configuración, coincidencias, ficha, Steam y Riot.**
  RF-1, RF-8
  - `ProfilePage`, `SettingsPage`, `AccountRow`, `LinkAccountForm`, `MatchesPage`, `MatchEntry`,
    `MatchFiltersPanel` (solo «Restablecer criterios»), `PlayerPage`, `ProposeSessionAction`,
    `SteamVerifyButton`, `RiotVerifyButton` y `RiotVerifyPage`.
  - Hecho cuando: comparado con la línea base; cada botón conserva texto, tipo y deshabilitado
    (los de verificación de Steam y Riot incluidos); «Guardar ficha» y «Vincular cuenta» no envían
    dos veces con doble clic; ningún `className="btn` queda en esos archivos; verde en el frontend.

- [x] **T13. Migrar los botones de agenda y detalle, y los estados.** RF-1, RF-8, RF-17
  - `SchedulePage` (botones, no los chips), `SessionSlip`, `SessionActionsZone`, `SessionEditForm`,
    `SessionDetailPage`, `CancelSessionDialog` (solo sus botones) y `States.tsx`
    (`Failure` con «Reintentar» bloqueable y foco automático; `Working` con `Spinner`).
  - Hecho cuando: comparado con la línea base; «Reintentar» conserva el foco al mostrarse, queda
    bloqueado con la lectura en curso y no hace nada al activarlo; los indicadores «Leyendo…» y
    «Cargando…» tienen el color anotado en T2 y salen de su token (se añade `--spinner-ink` solo si
    hace falta, con el valor medido); doble clic en «Anotar sesión», «Unirme» y «Guardar» envía una
    sola petición; ningún `className="btn` queda en `src/`; verde en el frontend.

- [x] **T14. Avisos, sellos y esqueletos.** RF-1, RF-2, RF-15, RF-16, RF-17
  - `Notice` (sobre `Paper`), `Stamp` (sobre `Badge`) y `SheetSkeleton` (sobre `Skeleton` con la
    animación de hoy) con `notice.css`, `badge.css` y `skeleton.css`; migrar los ~25 avisos y los 9
    sellos; `MutationNotice` sobre `Notice`; quitar `.stamp--danger` y los tonos sin uso.
  - Hecho cuando: comparado con la línea base; cada aviso conserva su rol de hoy (alerta, estado o
    ninguno; comprobado en el árbol de accesibilidad) y no se anuncia dos veces; los sellos conservan
    texto, tono, título y animación de «estampar» (y su ausencia con movimiento reducido); solo el
    sello de la tarjeta de sesión tiene rol de estado; «Datos de demostración» y las etiquetas de
    origen no cambian; cambiar `--danger-edge`, `--ok-edge` y `--warn-edge` cambia el borde que
    corresponde; verde en el frontend.

- [x] **T15. Campos de texto, área, búsqueda y listas.** RF-1, RF-2, RF-9, RF-10, RF-19, RF-20
  - `TextField`, `TextAreaField`, `SearchField` y `SelectField` con `field.css` y su
    `components.*.extend`; migrar todos sus usos (acceso, registro, configuración, vincular cuenta,
    «Anotar una sesión», edición del detalle, verificación con Riot, búsqueda de coincidencias).
    Foco con `--focus-edge` y `--focus-halo`; el error manda sobre el foco.
  - Hecho cuando: comparado con la línea base; cada campo conserva etiqueta, error anunciado con el
    campo no válido y descrito por él, y sin error la misma descripción que hoy (el contador «n/200
    caracteres» y la pista del deslizador siguen sin estar ligados); los límites de 60 y 160
    caracteres Unicode se cumplen al pegar 80 caracteres o 70 emojis y al escribir con composición,
    y «Cómo juegas» conserva su límite de 200 y su contador; las listas conservan opciones, orden,
    valores y opción elegida; en el tema claro el borde con foco y el halo miden al menos 3:1 en
    una entrada dentro de una ventana, una lista y un área de texto; ningún
    `className="select`, `"textarea` ni `"input` queda en `src/`; verde en el frontend.

- [x] **T16. Interruptor y deslizadores de coincidencias.** RF-1, RF-2, RF-11, RF-19, RF-20
  - `SwitchField` y `SliderField` (con `dialName`, Re Pág y Av Pág por `pageStepValue`, clic en la
    etiqueta que lleva el foco, miniatura deshabilitada con `tabindex=-1` y `aria-disabled`) con
    `switch.css` y `slider.css`; migrar `MatchFiltersPanel`.
  - Hecho cuando: comparado con la línea base; con teclado, partiendo de los valores de T2, cada
    tecla deja el mismo valor que en la línea base y el filtro se aplica sin recargar; el nombre
    accesible es «Diferencia máxima de rango 25 pts» (cambia con el valor) y el valor accesible 25;
    «Solo cuentas verificadas» se anuncia como interruptor con su estado y cambia con Espacio y con
    un clic en el texto; con CS2 sin Premier propio todos quedan deshabilitados y no reciben el
    foco; verde en el frontend.

- [x] **T17. Chips de filtro y «Actualizando».** RF-1, RF-2, RF-14, RF-17
  - `FilterChip` con `chip.css`, `inkVar` de cada juego en `--chip-ink`; migrar los chips de la
    agenda y el indicador «Actualizando» de agenda y coincidencias (`Spinner`, sin rol, con
    `aria-label`).
  - Hecho cuando: comparado con la línea base en los tres juegos y en «Todos los juegos», en los
    dos temas (punto, tinte y borde del chip pulsado con el mismo color; «Todos» con `--volt` y
    `--volt-edge`); un solo chip pulsado a la vez y el filtro de la agenda sigue viniendo del
    almacén; «Actualizando» solo aparece mientras se vuelve a pedir la lista, sin rol y con el color
    de T2; cambiar `--game-ink-lol` cambia punto, tinte y borde del chip de LoL; verde en el
    frontend.
  - **Punto de control del bloque B.**

## Bloque C — Composiciones

- [x] **T18. Pestañas de juego con panel.** RF-1, RF-2, RF-13, RF-20
  - `GameTabs` sobre `Tabs` (`Tabs.List`, `Tabs.Tab`, `Tabs.Panel` con `tabIndex={0}`), con
    `tabs.css` (píldora con `motion`, punto, `--tab-ink`, `--tab-pill-shadow` y `inkVar`); aplicar
    el patrón en perfil, coincidencias y ficha (ids `{idBase}-tab-…` y `{idBase}-panel-…`);
    retirar `tabKeys.ts` si queda sin usos.
  - Hecho cuando: comparado con la línea base; en las tres vistas hay una sola parada de Tab para
    el grupo, seguida de una parada en el panel con su indicador y después el primer control del
    panel; flechas, Inicio y Fin eligen y enfocan otra pestaña con el mismo comportamiento en la
    primera y la última que la ficha de hoy; cada pestaña controla su panel (árbol de
    accesibilidad); con un solo juego la única pestaña es la única parada; la píldora se desliza y
    toma la tinta del catálogo (sin movimiento con movimiento reducido); elegir otro juego no
    recarga la página; en la ficha, roles, nombres, estados y paradas iguales a T2; verde en el
    frontend.

- [x] **T19. `Slip` sobre la ventana modal y ventana de cancelar.** RF-1, RF-2, RF-12, RF-22, RF-18
  - Reescribir `Slip` (plan §4.4): `Modal.Root` y piezas, `returnFocus` apagado, `trapFocus`,
    `data-autofocus`, `closeLocked`, `description` opcional, `lockScroll`, `zIndex`, entrada y
    salida con `transitionProps`; `modal.css` (superficie `slip sheet sheet--punched`); adaptar
    `CancelSessionDialog` (foco inicial en «Volver» con `data-autofocus`).
  - Hecho cuando: «¿Cancelar esta sesión?» repetida en la agenda y en el detalle cumple las reglas de
    la 009 (RNF-2, puntos a y d, casos 6, 13 y 14) con el mismo resultado; árbol de accesibilidad:
    rol de ventana modal, título como nombre y sin descripción; Escape, botón de cerrar («Cerrar»,
    sin título emergente) y pulsar fuera la cierran salvo con la cancelación en curso, y pulsar
    fuera no deja el foco en el cuerpo; Tab y Mayús+Tab no salen, también con la cancelación en
    curso; la página no se desplaza ni se corre hacia el lado con la ventana abierta y vuelve a
    desplazarse al cerrar por cualquier camino y con «Atrás» o un 401; un título de 60 caracteres
    sin espacios a 360 px no desborda; con movimiento reducido no hay animación; verde en el
    frontend.

- [x] **T20. «Anotar una sesión»: campo de foco estándar.** RF-12, RF-20, RF-22
  - `SessionDraftSlip` y `SchedulePage` con `resolveDraftFocus` y `resolveAfterListFocus`: foco
    inicial en «Título» (`data-autofocus`) por los tres caminos de apertura; título de la ventana con
    foco por programa al enviar con el botón; vuelta al elemento de origen tras un error o la
    comprobación del cliente; destino del cierre (bloque con `data-slot`, «Anotar sesión» o título
    del panel); seguimiento de la primera respuesta de la lista con `focusin`; apertura por la
    propuesta pendiente al cerrarse otra ventana (sin cambiar la 016).
  - Hecho cuando: se comprueban a mano, uno por uno, los criterios de finalización de «Anotar una
    sesión»: foco en «Título» al abrir desde un bloque, desde «Anotar sesión» y desde «Proponer»; Tab
    y Mayús+Tab sin salir; foco en el título de la ventana con «Enviando…» enviado con el ratón y en
    «Título» si se envió con Intro; tras un error, foco en el origen; cierre por Cancelar, el botón
    de cerrar, Escape, pulsar fuera y por creación vuelve al control que la abrió (o a «Anotar
    sesión» si fue una propuesta, o al título del panel si ya no existe); con la lista fallando tras
    crear desde un bloque, foco en el título del panel solo si seguía en el bloque; «Atrás» o un 401
    con la ventana abierta no dejan foco retenido; «Proponer» con cuentas lentas y otra ventana
    abierta cumple la regla de «esperar y reabrir»; el nombre de la ventana es «Anotar una sesión»
    sin la referencia y sin descripción; verde en el frontend.

- [x] **T21. Ventana de desvincular.** RF-19, RF-22, RF-23, RF-24, RF-25
  - `UnlinkAccountDialog` (plan §4.4 y §4.7) y `SettingsPage`: título «Cuentas vinculadas» con foco
    por programa, mapa de botones «Desvincular» por cuenta, estado local, `resolveUnlinkFocus`,
    `accountError` sin el error de desvincular; textos en `copy.ts`; se retira `window.confirm`.
  - Hecho cuando: se comprueban a mano todos los casos del criterio de finalización: título y
    mensaje de RF-23, rol de ventana modal con el título como nombre y el mensaje como
    descripción; foco en «Volver» al abrir; Tab sin salir; «Volver», Escape, el botón de cerrar y
    pulsar fuera devuelven el foco a «Desvincular» de la fila sin enviar nada; doble clic envía una
    sola petición con «Enviando…», foco en el título y nada la cierra mientras dura; con éxito, foco
    en «Cuentas vinculadas» (también con la última cuenta); con 404, servidor caído y sin respuesta en
    30 s, el mensaje queda dentro de la ventana, no encima de la lista, con el foco en
    «Desvincular»; con la cuenta ya desvinculada en otra pestaña, cerrar sin enviar lleva el foco al
    título de la sección; un identificador largo sin espacios parte línea a 360 px; con una
    resincronización en curso no se abre; un 401 cierra la ventana y libera el desplazamiento;
    verde en el frontend.
  - **Punto de control del bloque C.**

## Bloque D — Cierre

- [x] **T22. Foco del tema claro en los elementos que no migran y limpieza.** RF-2, RF-4, RF-20
  - Verificar que todo indicador de foco de la página usa `--focus-ring` (enlaces de texto, barra y
    menú móvil, botón del menú, celdas del inicio, hoja semanal, hoja de horas, «Saltar al
    contenido», visualizaciones) conservando grosor y separación; el número del paso de «Anotar una
    sesión» sigue en volt. Retirar de `global.css` y de los CSS de componentes los bloques ya
    migrados y los archivos que queden vacíos.
  - Hecho cuando: en el tema claro, a 1280 y a 375 px, cada uno de esos elementos muestra el mismo
    tono, con al menos 3:1 contra su fondo medido en las herramientas del navegador y con el
    grosor y la separación de la línea base; en el tema oscuro, igual que la línea base; una
    búsqueda en el código no encuentra colores literales en `src/theme/` ni en los CSS de los
    componentes migrados (`transparent`, `currentColor`, `inherit`, `initial`, `unset` y `revert`
    no cuentan), ni `className="btn`, `"chip`, `"notice`, `"slider`, `"check`, `"select`, `"textarea`,
    `window.confirm` en código migrado; `themeColors.test.ts` y `games.test.ts` en verde; verde en el
    frontend.

- [x] **T23. Recorrido de validación completo.** RF-3, RF-6, RF-21, RNF-2, RNF-3, RNF-4, RNF-5,
  RNF-7, RNF-8 **[usuario]** (puede hacerlo el `implementer` con navegador real; el `reviewer` lo
  reproduce)
  - Repetir las capturas y medidas de T1 y T2 y recorrer los criterios de finalización que no
    cubrieron T9 a T22: tabla de «solo diferencias declaradas», valores calculados y caja ±2 px,
    contrastes de RNF-3 en los dos temas y estados, ancho desplazable a 360 y 375 px con ventanas
    abiertas, texto al 200 %, movimiento reducido, cambiar a mano cada token de la lista de la spec
    en los dos temas sin recargar, el recorrido con teclado de cada vista contra el orden de T2, el
    árbol de accesibilidad de cada componente, modo simulado, y la construcción de producción con el
    procedimiento de la spec 010 sin variables nuevas (mismo aspecto y tema en acceso, agenda y
    detalle; la pantalla de acceso sigue sin descargar el código de las demás vistas; tamaños de
    RNF-7 antes y después anotados).
  - Hecho cuando: cada criterio de finalización de la spec tiene su resultado en `validation.md`;
    toda diferencia con la línea base es una de las declaradas en RNF-2 o está registrada como
    defecto con su tarea de corrección; `npm test`, `typecheck`, `lint` y `build` en verde.

- [x] **T24. Cierre documental.** RNF-6
  - Actualizar `AGENTS.md` (línea del stack del frontend y convenciones: la librería, su tema y que
    los tokens siguen siendo la única fuente de valores; estructura `src/theme/`), `MEMORY.md`
    (estado, tabla de specs y decisiones del plan) y el estado de `spec.md`, `plan.md` y
    `tasks.md`; ejecutar `graphify update .` si está instalado.
  - Hecho cuando: los tres documentos reflejan el estado real, sin referencias a `window.confirm` ni
    a `Slip` a mano; `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` en verde;
    `git status --short backend/` vacío.
  - **Punto de control del bloque D (cierre de la spec).**
