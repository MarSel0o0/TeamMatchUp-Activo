# Spec 017 — Librería de estilos (Mantine) en los componentes base
Estado: aprobada (2026-11-21, usuario); plan y tareas pendientes (se implementa después de la 016 y
antes de la 018).
Historial: borrador desde el 2026-11-21. Dudas Q1 a Q7 cerradas por el usuario el 2026-11-21 y
aplicadas en toda la spec (ver «Decisiones»). Corregida el 2026-11-21 tras la primera revisión QA
(hallazgos H1 a H22), con las decisiones H1, H2, H3 y H6 del usuario. Q8 cerrada por el usuario el
2026-11-21 con la opción A («Decisiones»); cambia la spec 016 (RF-28 y RF-29) con su CR-1,
aprobado por el usuario el 2026-11-21. Corregida de nuevo el 2026-11-21 tras la segunda revisión
QA (hallazgos N1 a N8 y textos del CR-1), con aclaraciones que no cambian ninguna decisión.
Propuestas P1 a P11 aceptadas por el usuario el 2026-11-21. Aprobada por el usuario el 2026-11-21,
sin otra revisión QA. Sin dudas abiertas.

## Contexto y objetivo
El enunciado del último hito pide completar la aplicación como una «SPA de producción» con
«diseño visual consistente», y su punto 4 exige: «Diseño y Estilo: Incorporar una librería de
estilos (Material UI, React-Bootstrap, Chakra, Mantine, etc.)» (texto íntegro en el apéndice A
de la spec 016). El resto del enunciado va en otras specs: estado global en la 016, pruebas E2E
en la 018 y el despliegue real en la 010 (T9, lo hace el usuario).

Hoy la interfaz no usa ninguna librería de estilos. Cada control (botón, campo, lista
desplegable, interruptor, deslizador, ventana, pestañas, aviso, sello) está hecho a mano con
marcado propio y clases de la hoja de estilos global. La convención es que todos los colores
salgan de los tokens de diseño (`AGENTS.md`: «Estilos solo desde `styles/tokens.css`; ningún
color escrito a mano»), pero hoy no se cumple del todo: algunos de los componentes que esta spec
migra escriben colores a mano (sombras, bordes y el texto de la pestaña de juego elegida; RF-2),
y el catálogo de juegos lleva su propia tinta para cada juego, con valores distintos de las
tintas de juego de los tokens. No hay un componente de botón: cada vista escribe sus botones con
las mismas clases.

Esta spec incorpora Mantine (decisión del usuario) en los **componentes base** de la interfaz,
con un **único tema construido a partir de los tokens de diseño actuales**, de modo que:
1. los controles de todas las vistas salen de una sola librería con un solo tema (diseño
   consistente y librería visible para el evaluador);
2. el aspecto cambia lo menos posible: el jugador no debe notar diferencias, salvo las que
   enumera RNF-2;
3. no se pierde nada de lo que ya cumplen las specs 007, 008, 009 y 016 en accesibilidad
   (contraste, foco, nombres accesibles, teclado), textos, anuncios a lectores de pantalla y
   modo simulado;
4. el tema claro y el oscuro siguen funcionando como hoy, con una sola preferencia de tema
   compartida por la librería y por el resto de la página.

No se rehacen las vistas: su disposición, sus superficies propias (la hoja semanal de la agenda,
la hoja de horas, la escala de rango, los paneles) y sus animaciones de página se quedan como
están (inventario).

- Depende de: spec 016 (debe estar implementada antes: aporta Vitest y cambia la agenda,
  «Anotar una sesión», el panel de la agenda y el inicio de sesión, que esta spec vuelve a tocar;
  ver «Impacto»), spec 007 (sesión, estados de carga y error, «Enviando…», modo simulado),
  spec 008 (pestañas accesibles y contraste), spec 009 (ventana de cancelar, reglas de foco,
  límite de caracteres del formulario de creación y contraste), spec 004 (desvincular una cuenta
  y sus respuestas, que la ventana de desvincular usa sin cambios), specs 013 a 015 (botones de
  verificación y atribuciones, que deben seguir viéndose igual).
- Origen: enunciado del último hito, punto 4 y párrafo inicial («diseño visual consistente»).
  Decisiones del usuario del 2026-11-21: Mantine; alcance por defecto (componentes base con un
  tema hecho de los tokens, sin rehacer vistas); pruebas del frontend con Vitest (constitución,
  principios 1 y 4, enmendados); orden 016 → 017 → 018; y las respuestas a Q1 a Q7
  («Decisiones»).
- Esta spec no cambia el servidor, el contrato de datos ni el modo simulado.
- No exige enmendar la constitución: Mantine es una dependencia nueva que entra porque esta spec
  la justifica, con versión exacta (principio 1), igual que Zustand en la 016.

## Usuarios
- Jugador que usa la aplicación, de noche, frente al monitor de juego (`PRODUCT.md`). No debe
  notar cambios, salvo los que enumera RNF-2.
- Jugador que usa solo el teclado o un lector de pantalla.
- Integrantes del equipo que mantienen la interfaz: quieren un único juego de componentes y un
  único tema en lugar de clases repetidas en cada vista.
- Evaluador del hito, que revisa que la librería de estilos esté incorporada y que el diseño sea
  consistente.

## Historias de usuario
- HU-1. Como jugador, quiero que la aplicación se vea y se comporte como hoy después de
  incorporar la librería, en el tema claro y en el oscuro, en escritorio y en móvil.
- HU-2. Como jugador que usa el teclado o un lector de pantalla, quiero que el foco, el orden de
  tabulación, los nombres de los controles y los anuncios sigan siendo los de hoy.
- HU-3. Como jugador, quiero que mi preferencia de tema se respete desde la primera pintura y que
  al cambiarla cambie toda la página a la vez, también los controles de la librería.
- HU-4. Como integrante del equipo, quiero que botones, campos, ventanas, pestañas y avisos salgan
  de un único juego de componentes con un tema hecho de los tokens, para cambiar un token y ver
  el cambio en todos ellos.
- HU-5. Como evaluador, quiero ver que la interfaz usa una librería de estilos reconocida de forma
  consistente en todas las vistas.
- HU-6. Como jugador, quiero confirmar que desvinculo una cuenta en una ventana con el mismo
  aspecto y el mismo manejo con teclado que las demás ventanas de la aplicación, en lugar del
  diálogo nativo del navegador.

## Definiciones
- **Librería**: Mantine, en los paquetes que fija RNF-1.
- **Tema**: la configuración única de la librería para toda la aplicación (colores, tipografía,
  radios, espaciado, sombras, duraciones y foco), en sus dos variantes, clara y oscura.
- **Tokens de diseño**: las variables de diseño que hoy definen todo color, radio, espaciado,
  tipografía, sombra, duración y capa, con un valor para el tema oscuro y otro para el claro. Son
  y siguen siendo la única fuente de esos valores (`AGENTS.md`). Esta spec solo añade tokens en
  dos casos: los que recogen con su valor exacto los colores escritos a mano de los componentes
  migrados (RF-2, H1) y, si hace falta, el del tono del indicador de foco del tema claro (RF-20).
  No cambia el valor de ningún token existente.
- **Color literal**: un color escrito directamente en lugar de salir de un token: un valor
  hexadecimal, `rgb()`/`rgba()`, `hsl()`/`hsla()` o un nombre de color (por ejemplo, `white` o
  `black`), también dentro de una sombra, un degradado o una mezcla de colores. **No son colores
  literales ni requieren token** las palabras clave que no fijan un color propio: `transparent`,
  `currentColor` y las palabras clave globales `inherit`, `initial`, `unset` y `revert`. Hoy las
  usan, por ejemplo, el botón de peligro y el discreto (fondo y borde `transparent`), el indicador
  de envío (`currentColor`), el punto de los sellos (`currentColor`), el tinte del chip pulsado
  (una mezcla de su tinta con `transparent`) y las variantes por defecto de la librería. Una
  mezcla, sombra o degradado cuyos colores son todos tokens o esas palabras clave tampoco es un
  color literal. RF-2, RNF-6 y los criterios de finalización usan esta definición.
- **Componente migrado**: cada elemento de la tabla «Se migran» del inventario. **Componente que
  se queda**: cada elemento de la tabla «Se quedan como están».
- **Preferencia de tema**: el tema que eligió el jugador con el botón de cambiar tema, guardado
  hoy en el navegador en una única entrada (la que la spec 016, RF-19, llama «la preferencia de
  tema»). Sin preferencia guardada, el tema se decide al cargar según la preferencia del sistema
  operativo (claro si el sistema pide claro; si no, oscuro).
- **Botón deshabilitado** y **botón bloqueado**: los de la spec 009 (Definiciones). El
  deshabilitado no se puede pulsar ni recibe el foco (por ejemplo, «Enviando…»). El bloqueado
  recibe el foco, el lector de pantalla lo anuncia como no disponible y activarlo no hace nada
  (por ejemplo, «Volver» con la cancelación en curso, o «Reintentar» con una lectura en curso).
- **Estados de un control**: reposo, puntero encima, foco por teclado, pulsado, deshabilitado y
  bloqueado; en los campos, además, con error.
- **Línea base**: las capturas y medidas de la interfaz tomadas **después** de implementar la spec
  016 y **antes** de empezar esta spec, con el procedimiento de los criterios de finalización.
- **Diferencia declarada**: cada una de las diferencias visibles que enumera RNF-2. Cualquier otra
  diferencia con la línea base es una regresión.
- **Anchos de verificación**: 1280 px (escritorio) y 375 px (móvil); además 360 px para lo que
  las specs 008 y 009 ya miden a ese ancho (RNF-4).
- **Título con foco por programa**: un título o mensaje que no es interactivo y recibe el foco
  solo por una regla de foco (por ejemplo, el título del panel de la agenda, «Esta sesión no
  existe» o el título de una ventana mientras su botón de confirmar está deshabilitado; spec 009,
  RNF-2). No entra en el recorrido con Tab (Tab y Mayús+Tab no vuelven a él), el lector de
  pantalla lee su texto al recibirlo y el foco se ve sobre él. Esta spec añade tres: el título de
  «Anotar una sesión» (RF-12), el título de la ventana de desvincular (RF-25) y el título de la
  sección «Cuentas vinculadas» (RF-24, RF-25).
- **Ventana de desvincular**: la ventana que sustituye a la confirmación nativa del navegador al
  desvincular una cuenta (M16; RF-23 a RF-25).

### Inventario de componentes
Recogido del código actual (2026-11-21). La columna «Dónde» es orientativa: el plan confirma la
lista completa de usos.

#### Se migran (componentes base)
| # | Componente | Dónde aparece hoy | Qué se conserva (además de RF-2 y RF-3) |
| --- | --- | --- | --- |
| M1 | **Botones** con texto, en todas sus variantes: primario (volt), normal, discreto y de peligro; tamaños pequeño, normal, grande y a todo el ancho; con icono, con indicador de envío y «Enviando…» | Todas las vistas: acceso, registro, inicio, perfil, configuración, coincidencias, agenda, detalle, ficha, verificación con Steam y Riot, entrada, «no encontrada», menú móvil, ventanas | Forma de píldora, variantes por color, deshabilitado frente a bloqueado, texto visible «Enviando…» con su indicador (RF-8) |
| M2 | **Enlaces con aspecto de botón** (por ejemplo, «Ver detalle» e «Ir a la agenda»). «Proponer» no es uno de ellos: es siempre un botón (M1) | Agenda, detalle, perfil, entrada, «no encontrada», coincidencias («Ir a configuración», en su estado vacío) y la ficha de jugador («Ir a coincidencias», cuando el jugador no se encuentra) | Siguen siendo enlaces (rol de enlace y navegación sin recargar), con el aspecto de M1 |
| M3 | **Botones de icono** sin texto: cambiar tema, cerrar sesión de la barra, cerrar de las ventanas | Barra de navegación, ventanas | Nombre accesible y título emergente actuales (RF-18) |
| M4 | **Campo de texto** con etiqueta, error, pista y límite de caracteres Unicode | Acceso, registro, configuración («Nombre visible»), vincular cuenta, «Anotar una sesión», edición del detalle, verificación con Riot si lo usa | Etiqueta asociada, error anunciado, límite de caracteres Unicode y escritura con composición (RF-9) |
| M5 | **Área de texto** («Notas», «Cómo juegas») con su límite | «Anotar una sesión», edición del detalle, configuración | En «Cómo juegas»: límite de 200, contado como hoy, y su contador visible «n/200 caracteres». En «Notas»: límite de 160 caracteres Unicode (spec 009, RF-24), sin contador, como hoy. En las dos: cambio de alto manual |
| M6 | **Campo de búsqueda** con icono («Buscar jugador») | Coincidencias | Tipo búsqueda, icono, deshabilitado sin rango Premier (spec 015, RF-10) |
| M7 | **Listas desplegables** («Juego», «Día», «Hora de inicio», «Duración (horas)», «Cupos», «Región» y las de la edición del detalle) | «Anotar una sesión», edición del detalle, vincular cuenta (Configuración), verificación con Riot («Región») | Mismas opciones, orden y valores; comportamiento de lista nativa del navegador (decisión P1) |
| M8 | **Interruptor** «Solo cuentas verificadas» | Coincidencias | Aspecto de interruptor; pasa a anunciarse como interruptor (Q2, RF-11) |
| M9 | **Deslizadores** «Diferencia máxima de rango» y «Horas en común por semana» | Coincidencias | Mínimo, máximo, paso, valor visible junto a la etiqueta, pista rellena hasta el valor, teclado |
| M10 | **Ventanas modales**: «Anotar una sesión» y «¿Cancelar esta sesión?» (agenda y detalle) | Agenda, detalle | Todas las reglas de la spec 009 (RF-19, RF-23, RNF-2) y de la 016 (RF-13, RF-15, RF-24); la superficie de panel con bisel y filo volt de hoy (Q-2, P4); «Anotar una sesión» pasa al foco estándar de ventana modal (Q1, RF-12) |
| M11 | **Pestañas de juego** con la píldora que se desliza y toma la tinta del juego | Perfil, coincidencias, ficha de jugador | Patrón de pestañas de la spec 008 (RNF-2), que pasa también a perfil y coincidencias (Q3, RF-13) |
| M12 | **Chips de filtro** de juego («Todos los juegos» y un chip por juego) con estado pulsado | Agenda (y cualquier otra vista que los use) | Son botones con estado pulsado, uno solo pulsado a la vez (spec 016, RF-11) (RF-14) |
| M13 | **Avisos** en línea: de error, informativo (volt) y neutro, con su icono; incluye el aviso de error de las escrituras | Todas las vistas con formularios o escrituras | Rol de cada aviso tal como está hoy: de alerta, de estado o ninguno (RF-15) |
| M14 | **Sellos** (insignias) con su tono: sellado, volt, correcto, advertencia y neutro. No incluye «Datos de demostración» ni la etiqueta de origen, que se quedan (Q-14), ni el tono «peligro», que solo existe en los estilos y ningún sello de la interfaz usa hoy (fuera de alcance, N7) | Perfil, configuración, coincidencias, agenda, detalle, ficha | Forma de píldora, punto luminoso, mayúsculas monoespaciadas, animación de «estampar» al aparecer, rol de estado solo en el sello que hoy lo tiene (RF-16) |
| M15 | **Estados**: esqueleto de carga, «Leyendo…»/«Cargando…» con indicador, indicador de envío dentro de los botones e indicador «Actualizando» (P10) | Todas las vistas; «Actualizando» junto a los filtros de la agenda y en la cabecera de coincidencias | Esqueleto oculto a lectores de pantalla; indicador con rol de estado donde hoy lo tiene; «Actualizando» sin rol, con ese texto como etiqueta; textos actuales (RF-17) |
| M16 | **Ventana de desvincular** una cuenta, que sustituye a la confirmación nativa del navegador (era Q-12; decisión Q4) | Configuración, «Cuentas vinculadas» | El contenido del texto de la confirmación de hoy, «Enviando…» y el error de la escritura; textos, foco y bloqueo nuevos en RF-23 a RF-25 |

#### Se quedan como están
| # | Elemento | Motivo |
| --- | --- | --- |
| Q-1 | Disposición de todas las vistas, cabeceras de página y titulares | Fuera de alcance: no se rehacen vistas (decisión del usuario) |
| Q-2 | Paneles («hojas») con bisel, filo volt y borde que sigue al cursor | Superficie propia del mundo visual; no es un control. Sus botones y campos sí se migran |
| Q-3 | Barra de navegación flotante, píldora deslizante de la sección activa, botón de menú móvil y menú móvil | Composición propia con animaciones de entrada; sus botones de icono (M3) y «Cerrar sesión» (M1) sí se migran |
| Q-4 | Hoja semanal de la agenda (bloques, sesiones escritas, margen de perforación, panel «Sesión abierta»/«Mis sesiones») | Superficie insignia (`PRODUCT.md`); sus botones, chips y estados (M1, M12, M15) sí se migran |
| Q-5 | Hoja de horas de Configuración y de la ficha (marcar bloques, comparar) | Control propio sin equivalente en la librería |
| Q-6 | Escala de rango, gráfico de historial, tabla de partidas, anillo de afinidad, filas de cuenta y de coincidencia | Visualizaciones de datos propias; sus botones sí se migran |
| Q-7 | Estado vacío y estado de error de página completa (icono con halo, título y texto) | Composición propia; su botón «Reintentar» (M1) sí se migra, con sus reglas de foco (RF-17) |
| Q-8 | Monograma, marca de juego, atribución de Leetify (logos oficiales sin modificar) y logos de Steam y Riot | Identidad o material de terceros (spec 015, RNF-8) |
| Q-9 | Iconos (los de la colección actual) | No se cambia de colección de iconos (RNF-1) |
| Q-10 | Animaciones de página, de la barra, contadores y aparición al entrar en pantalla | No son componentes base |
| Q-11 | Luz ambiental, grano, barras de desplazamiento, selección de texto y enlaces de texto | Estilos globales de la página; RF-4 garantiza que la librería no los cambie |
| Q-12 | (Sin uso: la confirmación nativa al desvincular una cuenta pasó a «Se migran» como M16, decisión Q4. El número no se reutiliza.) | — |
| Q-13 | Enlace «Saltar al contenido» | Estilo global propio |
| Q-14 | Etiqueta «Datos de demostración» (barra, desde 1141 px de ancho, y pie; spec 007, R24) y etiqueta de origen de cada bloque de datos («Datos de demostración» o el nombre de la fuente real; spec 012, RF-6) (decisión H6) | Son texto con aspecto propio (nota discreta), no sellos. Son la atribución de origen que exige la constitución (principio 5) y la spec 012: no cambian su texto, su aspecto ni dónde se ven |

Excepción común a los elementos de esta tabla que reciben el foco: en el tema claro, el color de
su indicador de foco pasa al tono del acento de RF-20 (Q7); su grosor, su separación y el resto
de su aspecto no cambian.

## Requisitos funcionales

### Librería y tema
- RF-1: EL SISTEMA dibuja cada componente de la tabla «Se migran» (M1 a M16), en todas las vistas
  donde aparece, con componentes de la librería configurados por un único tema para toda la
  aplicación. Ninguna vista conserva una versión hecha a mano de un componente migrado.
- RF-2: EL SISTEMA toma todo color, radio, tipografía, espaciado, sombra y duración de los
  componentes migrados de los tokens de diseño, en el tema claro y en el oscuro. Ni el tema ni
  los componentes migrados escriben un color literal (Definiciones): cambiar el valor de un token
  cambia, sin recargar, todo componente migrado que lo usa (comprobable cambiando un token en las
  herramientas del navegador). Todo color que la librería pinta en un componente migrado, también
  los que trae por defecto (fondo, texto, bordes, marcadores de posición, deshabilitado, error,
  anillo de foco), sale de un token o es una de las palabras clave que no son colores literales
  (`transparent`, `currentColor`, `inherit`, `initial`, `unset`, `revert`), que no requieren
  token. Los tokens de diseño siguen siendo la única fuente de esos valores.

  Los colores que hoy escriben a mano los componentes a migrar pasan a **tokens nuevos con
  exactamente el valor que tienen hoy** en cada tema, sin ningún cambio visible (decisión H1). Hoy
  esos colores son literales, así que valen lo mismo en los dos temas, y los tokens nuevos
  conservan eso aunque no coincidan con el token de estado o de acento del tema claro:
  - la sombra del botón primario (brillo interior blanco y halo volt);
  - el borde del botón de peligro con el puntero encima;
  - el fondo del círculo del icono dentro del botón grande;
  - el borde del aviso de error;
  - los bordes de los sellos correcto y advertencia (el tono «peligro» de los sellos queda fuera
    de alcance: ningún sello lo usa, M14);
  - el texto y el punto de la pestaña de juego elegida (casi negro) y la sombra de su píldora;
  - la tinta de cada juego del catálogo (League of Legends `#c8963e`, Rainbow Six Siege
    `#3ea0c8`, Counter-Strike 2 `#d97a45`), que hoy pintan la píldora y el punto de las pestañas
    de juego (M11) y el punto, el tinte y el borde de los chips de filtro de un juego pulsados
    (M12). El chip «Todos los juegos» pulsado no lleva tinta del catálogo: su tinte sale de
    `--volt` y su borde de `--volt-edge`, como hoy.

  **Tinta del catálogo frente a las tintas de juego de los tokens.** Los tokens ya tienen una
  tinta por juego (`--ink-lol`, `--ink-r6`, `--ink-cs2`) con otros valores (`#d3a04a`, `#5fc2d8`,
  `#e08a4f`), que usan otros elementos de la página. En las pestañas y en los chips lo que se ve
  hoy es la tinta del catálogo, y el valor visible de hoy manda: los componentes migrados toman la
  tinta del catálogo de sus tokens nuevos, con esos mismos valores, y las tintas de juego de los
  tokens se quedan con sus valores y sus usos. No se unifican las dos (unificarlas cambiaría lo
  que se ve, una diferencia no declarada). Los elementos que se quedan y hoy pintan la tinta del
  catálogo (por ejemplo, la marca de juego, Q-8) siguen viendo el mismo valor.

  Los colores escritos a mano en elementos que se quedan (por ejemplo, la píldora de la sección
  activa de la barra o el degradado de una celda del inicio) no cambian: esta spec no los toca.
- RF-3: EL SISTEMA conserva el aspecto de cada componente migrado en cada uno de sus estados y en
  los dos temas. Comprobable contra la línea base, en reposo, con estos valores que da el
  navegador:
  - color de fondo, color del texto, color y grosor del borde y radio de las esquinas: iguales
    (mismo token);
  - familia, tamaño y peso de la letra: iguales;
  - caja dibujada del componente (su alto y su ancho, medidos en pantalla con las herramientas del
    navegador, no el alto mínimo ni el relleno declarados): una diferencia de 2 px como máximo en
    cada dimensión;
  - a 360 y a 375 px, ningún texto de un componente migrado parte en más líneas que en la línea
    base y ninguna fila de controles reparte sus controles en más líneas que en ella, aunque la
    caja crezca hasta 2 px (RNF-2, punto 1).
  Y, en las capturas de puntero encima, foco por teclado, pulsado, deshabilitado, bloqueado y con
  error, ninguna diferencia visible salvo las declaradas (RNF-2). Se mantiene la regla de forma de
  los tokens: píldora completa en botones, chips y sellos; radio de campos en campos y listas;
  radio de panel en las ventanas.
- RF-4: EL SISTEMA no cambia el aspecto de los componentes que se quedan (Q-1 a Q-11, Q-13 y Q-14) ni
  de la página: los estilos globales que trae la librería no alteran la tipografía de la página,
  el fondo, la luz ambiental, el grano, las barras de desplazamiento, la selección de texto, los
  enlaces de texto, los titulares ni el indicador de foco de los elementos que no se migran. Única
  excepción: el color del indicador de foco del tema claro, que pasa al tono del acento de RF-20
  en los títulos con foco por programa (Q5) y en todos los demás elementos que reciben el foco y
  no se migran (Q7); su grosor y su separación no cambian, y en el tema oscuro no cambia nada.

### Tema claro y oscuro
- RF-5: CUANDO la aplicación se carga o se recarga, EL SISTEMA pinta desde la primera pintura toda
  la página, también los componentes migrados, con el tema que corresponde: la preferencia de tema
  guardada o, si no hay una válida, la del sistema operativo en ese momento. No se ve en ningún
  momento el otro tema ni componentes sin estilo.
- RF-6: CUANDO el jugador pulsa el botón de cambiar tema, EL SISTEMA cambia a la vez toda la
  página y todos los componentes migrados que hay en pantalla, como hoy:
  - con la transición en círculo que nace en el botón, si el navegador la admite y el jugador no
    pidió movimiento reducido; si no, en el acto;
  - con el color de la barra del navegador (en móvil) del tema nuevo;
  - con el logo de Leetify de ese tema (spec 015, RNF-8);
  - con el nombre accesible y el título del botón actualizados («Cambiar a tema claro» o «Cambiar
    a tema oscuro»).
  En ningún momento hay componentes migrados en un tema y el resto de la página en el otro. Y
  CUANDO se abre una ventana (M10, M16) o aparece un componente migrado después de un cambio de
  tema, EL SISTEMA lo pinta con el tema vigente: tras cambiar de tema, la siguiente ventana que se
  abre sale entera en el tema nuevo.

  Con una ventana abierta, la interfaz no ofrece ningún camino para cambiar el tema: el fondo de
  la ventana tapa la barra de navegación, y pulsar en él nunca llega al botón: cierra la ventana o,
  en «¿Cancelar esta sesión?» y en la ventana de desvincular con su escritura en curso, no hace
  nada (RF-12, RF-25); «Anotar una sesión» se cierra al pulsar fuera también con la creación en
  curso (RF-12). El foco no sale de la ventana; no hay atajo de teclado; y el tema no se
  sincroniza entre pestañas (RF-7). Por eso esta spec no fija un
  comportamiento para «cambiar de tema con una ventana abierta».
- RF-7: EL SISTEMA guarda la preferencia de tema en la misma única entrada del navegador que hoy,
  con los mismos valores, «light» (claro) y «dark» (oscuro), y no crea ninguna entrada nueva para
  el tema (spec 016, RF-19). Una preferencia guardada antes de esta spec se respeta tras ella. SI
  el almacenamiento del navegador no está disponible, ENTONCES EL SISTEMA cambia de tema igual y
  la elección dura hasta recargar, como hoy. SI la entrada guardada tiene un valor que no es
  «light» ni «dark», ENTONCES EL SISTEMA usa la preferencia del sistema operativo. MIENTRAS la
  página está abierta, EL SISTEMA no cambia de tema por un cambio de la preferencia del sistema
  operativo: solo lo cambia el botón, como hoy. CUANDO otra pestaña de la aplicación cambia el
  tema (y con ello la entrada guardada), EL SISTEMA no cambia el tema de esta pestaña, como hoy:
  no sigue los cambios del almacenamiento aunque la librería sepa hacerlo; esta pestaña muestra el
  tema nuevo solo al recargar, y si antes el jugador pulsa en ella el botón de cambiar tema, se
  guarda el tema que elige en ella (la última elección gana), como hoy.

### Comportamiento de los componentes migrados
- RF-8 (botones, M1 a M3): EL SISTEMA conserva en cada botón migrado:
  - su tipo (envía el formulario o no) y su texto o nombre accesible;
  - la distinción entre deshabilitado y bloqueado (Definiciones), en cada sitio donde hoy se usa
    una u otra: un botón bloqueado sigue recibiendo el foco, se anuncia como no disponible y
    activarlo no hace nada (spec 009, RF-11, RF-23 y Definiciones; «Reintentar» en curso, spec
    009, RF-13);
  - mientras una escritura está en curso, el texto visible «Enviando…» junto a su indicador, en el
    lugar del texto del botón, como hoy (spec 007, RF-20): el indicador no sustituye ni oculta el
    texto;
  - las guardas contra el doble envío (spec 007, RF-20): un doble clic sigue enviando una sola
    petición;
  - en los enlaces con aspecto de botón (M2), el rol de enlace y la navegación sin recargar.
- RF-9 (campos, M4 a M6): EL SISTEMA conserva en cada campo migrado:
  - la etiqueta visible asociada al campo, que es su nombre accesible;
  - el error: visible bajo el campo con su icono, anunciado al aparecer, con el campo marcado como
    no válido y descrito por ese error;
  - sin error, la descripción accesible que cada control tiene hoy, ni más ni menos: los campos de
    texto con pista se describen por ella, como hoy; los que hoy no tienen descripción siguen sin
    ella. En particular, el contador «n/200 caracteres» de «Cómo juegas» y la pista de
    «Diferencia máxima de rango» se ven, pero hoy no están ligados a su control y siguen sin
    estarlo;
  - el límite de caracteres Unicode donde lo hay (spec 009, RF-24: «Título» 60, «Notas» 160; un
    emoji cuenta 1), también al pegar y al escribir con composición (teclados de acentos o de
    idiomas asiáticos), y el límite de 200 de «Cómo juegas» con su contador «n/200 caracteres»,
    los dos contados como hoy (no en caracteres Unicode: hoy un emoji puede contar 2);
  - el tipo de campo (correo, contraseña, búsqueda, texto), el autocompletado, el texto de ejemplo
    y el estado deshabilitado, tal como están hoy.
- RF-10 (listas desplegables, M7): EL SISTEMA conserva las mismas opciones, en el mismo orden, con
  los mismos textos y valores, la misma opción elegida al abrir el formulario y el mismo manejo con
  teclado y en móvil que la lista nativa del navegador de hoy (decisión P1).
- RF-11 (interruptor y deslizadores, M8 y M9): EL SISTEMA conserva:
  - en «Solo cuentas verificadas»: el nombre accesible, el estado marcado o no, el cambio con
    Espacio y con un clic sobre el texto, y el estado deshabilitado (spec 015, RF-10). Se anuncia
    como interruptor, con su estado activado o desactivado, en lugar de como casilla de
    verificación (Q2; diferencia declarada, RNF-2);
  - en los deslizadores: mínimo, máximo y paso actuales (0 a 50 de 5 en 5; 0 a 12 de 1 en 1), el
    valor visible junto a la etiqueta («n pts», «n h») que cambia mientras se arrastra, que el
    filtro se aplica sin recargar, y el manejo con teclado de hoy sin perder ninguna tecla:
    flechas, Inicio, Fin, Re Pág y Av Pág, cada una con el mismo resultado que en la línea base
    partiendo del mismo valor (cómo se consigue lo resuelve el plan);
  - en los deslizadores, el nombre y el valor accesibles de hoy, sin ambigüedad:
    - **nombre accesible**: el texto completo de su etiqueta visible, que hoy incluye el valor con
      su unidad, tal como lo calcula hoy el navegador (por ejemplo, «Diferencia máxima de rango
      25 pts» y «Horas en común por semana 4 h»); cambia con el valor, como hoy;
    - **valor accesible**: el número, sin unidad (por ejemplo, 25), con el mínimo y el máximo; sin
      un texto de valor propio, como hoy;
    - sin descripción accesible, como hoy (RF-9).
- RF-12 (ventanas, M10): EL SISTEMA conserva en «Anotar una sesión» y «¿Cancelar esta sesión?»:
  - rol de ventana modal, con su título como nombre accesible y sin descripción accesible, como
    hoy. En «Anotar una sesión», el nombre accesible es solo el título, «Anotar una sesión»: la
    referencia del bloque («lun 20:00») se sigue viendo en la cabecera, pero no forma parte del
    nombre, como hoy;
  - la superficie de panel con bisel y filo volt de hoy (Q-2, P4);
  - que Escape, el botón de cerrar y pulsar fuera la cierran, salvo mientras la cancelación está
    en curso (spec 009, RF-23), y que pulsar fuera no deja el foco en el cuerpo de la página;
  - que la página de detrás no se desplaza mientras la ventana está abierta y vuelve a
    desplazarse en cuanto se cierra, por cualquier camino (casos límite). Al bloquear el
    desplazamiento, el contenido de la página no se corre hacia el lado el ancho de la barra de
    desplazamiento, a diferencia de hoy (diferencia declarada, RNF-2, punto 7; P9);
  - la entrada con resorte desde abajo y el fondo desenfocado, salvo con movimiento reducido;
  - en «¿Cancelar esta sesión?», todas las reglas de foco de la spec 009 (RF-19, RF-23 y RNF-2,
    puntos a y d y casos 6, 13 y 14): foco inicial en «Volver»; Tab y Mayús+Tab sin salir de la
    ventana, también con la cancelación en curso; foco al título de la ventana cuando «Sí,
    cancelar sesión» pasa a deshabilitado; al cerrar, foco al botón «Cancelar sesión» que la abrió
    o, si ya no existe, al título del panel de la agenda o al mensaje de la zona de acciones del
    detalle; tras cancelar desde el detalle con 204, foco al título del panel de la agenda a la
    que lleva (punto d, caso 13); tras un error, foco de vuelta a «Sí, cancelar sesión». Ningún
    comportamiento propio de la librería (por ejemplo, devolver el foco por su cuenta al cerrar)
    puede contradecir esas reglas;
  - en «Anotar una sesión», lo que fijan las specs 009 (RF-24) y 016 (RF-13, RF-15 y RF-24)
    sobre cuándo se abre, se cierra y con qué valores; y que se puede cerrar mientras la creación
    está en curso, como hoy.

  Y, en «Anotar una sesión», EL SISTEMA adopta el comportamiento de foco estándar de una ventana
  modal (Q1; diferencia declarada, RNF-2; sustituye la R10 de la spec 009):
  - CUANDO se abre, por el camino que sea (bloque de la semana, «Anotar sesión» o una propuesta de
    «Proponer», spec 016, RF-13 y RF-28), EL SISTEMA lleva el foco al campo «Título».
  - MIENTRAS está abierta, también con la creación en curso, EL SISTEMA retiene el foco en ella:
    Tab y Mayús+Tab recorren solo sus controles y no salen a la página de detrás.
  - CUANDO el botón de envío pasa a estar deshabilitado («Enviando…», spec 007, RF-20) y tenía el
    foco, EL SISTEMA lleva el foco al título de la ventana, «Anotar una sesión», que es un título
    con foco por programa (Definiciones). Si la creación se envió con Intro desde un campo, el foco
    sigue en ese campo, que no se deshabilita.
  - CUANDO el título no pasa la comprobación del cliente (spec 009, RF-24) o la creación falla, la
    ventana sigue abierta y EL SISTEMA deja o devuelve el foco al elemento desde el que se envió:
    el botón de envío o el campo desde el que se pulsó Intro.
  - CUANDO se cierra con «Cancelar», con el botón de cerrar, con Escape o pulsando fuera, o se
    cierra sola porque el servidor confirmó la creación (spec 016, RF-13.f y RF-24), EL SISTEMA
    devuelve el foco al control que la abrió: el bloque de la semana elegido o «Anotar sesión» de
    la cabecera. SI la abrió una propuesta de «Proponer» (spec 016, RF-28), ENTONCES el foco va a
    «Anotar sesión» de la cabecera (P6). SI ese control ya no existe o no puede recibir el foco
    (por ejemplo, la semana muestra el error de la lista en lugar de sus bloques, o «Anotar
    sesión» está deshabilitado), ENTONCES el foco va al título del panel de la agenda, con el
    texto que muestre en ese momento, que lo conserva aunque su texto cambie (spec 016, RF-25 y
    RF-26).
  - CUANDO, tras cerrarse la ventana y volver el foco a un bloque de la semana, llega la primera
    respuesta de la lista de la agenda posterior al cierre y la semana deja de mostrar ese bloque
    (por ejemplo, porque muestra el error de la lista), SI el foco seguía en ese bloque, ENTONCES
    EL SISTEMA lleva el foco al título del panel de la agenda, para que no quede en el cuerpo de
    la página. La regla vale solo para esa primera respuesta y solo si el bloque seguía teniendo
    el foco: si el jugador ya movió el foco a otro sitio, EL SISTEMA no lo mueve, y las respuestas
    posteriores de la lista tampoco lo mueven.
  - SI se cierra porque la vista cambia (RF-22; spec 016, RF-15), ENTONCES EL SISTEMA no devuelve
    el foco a ningún control de la agenda.
  - EL SISTEMA nunca tiene dos ventanas abiertas a la vez en la agenda (Q8; spec 016, CR-1).
    MIENTRAS hay una propuesta de «Proponer» pendiente y «¿Cancelar esta sesión?» o «Anotar una
    sesión» está abierta en la agenda, la regla de la spec 016 (RF-29) da «esperar» (caso 5) para
    la propuesta que, sin ventana abierta, se aplicaría (caso 6): EL SISTEMA no abre otra ventana
    encima y la propuesta sigue pendiente (spec 016, RF-28). CUANDO esa ventana se cierra por
    cualquier camino (también al confirmar la cancelación con 204) y la regla de la spec 016,
    RF-29, deja de dar «esperar» y da «aplicar», EL SISTEMA abre «Anotar una sesión» con la
    propuesta (spec 016, RF-28). El foco va entonces a «Título» (primera regla de esta lista), no
    al destino al que lo llevaría el cierre de la ventana anterior; y, al cerrarse «Anotar una
    sesión», va a «Anotar sesión» de la cabecera (P6). SI la propuesta se descarta mientras espera
    (salir de la agenda, recargar, 401) o la regla da «descartar» al cerrarse la ventana (spec 016,
    RF-16, RF-28 a RF-30), ENTONCES no se abre nada y el foco va al destino que fija para ese
    cierre esta lista (o RF-22, si la vista cambia).
  Estas reglas no cambian las del panel de la agenda de la spec 016: el estado de carga y el error
  del panel no reciben ni mueven el foco (RF-25) y el título del panel conserva el foco que tenga
  (RF-26).
- RF-13 (pestañas de juego, M11): EL SISTEMA, en perfil, coincidencias y la ficha de jugador:
  - conserva el grupo de pestañas con el nombre accesible que tiene hoy en cada vista (por
    ejemplo, «Juegos vinculados» en perfil y «Juego» en coincidencias), cada pestaña con el nombre
    del juego y su estado elegido;
  - conserva la píldora que se desliza hasta el juego elegido y toma su tinta, y el punto de color
    de cada juego (sin animación con movimiento reducido);
  - conserva que elegir otro juego no recarga la página;
  - aplica en las tres vistas el patrón accesible de la ficha (spec 008, RNF-2): cada pestaña
    controla la zona que muestra los datos del juego elegido, que se anuncia como su panel (en la
    ficha, la de hoy; en perfil, el resumen del juego que va bajo las pestañas; en coincidencias,
    los criterios y la lista «Jugadores compatibles»); solo la pestaña elegida entra en el
    recorrido con Tab (una sola parada para todo el grupo); y las flechas izquierda y derecha,
    Inicio y Fin eligen y enfocan otra pestaña (activación automática), con el mismo
    comportamiento en la primera y en la última pestaña que la ficha hoy;
  - en las tres vistas, el panel es una parada del recorrido con Tab, justo después de la
    pestaña elegida y antes del primer control que contiene, con su indicador de foco, como hoy en
    la ficha (mismo grosor y la misma separación hacia dentro del panel; color según RF-20)
    (decisión H3).
  En perfil y coincidencias es una diferencia declarada (Q3, H3, RNF-2, punto 4): hoy cada pestaña
  es una parada del recorrido con Tab, las flechas no hacen nada y la zona de datos no es una
  parada.
- RF-14 (chips de filtro, M12): EL SISTEMA conserva cada chip como botón con estado pulsado, con
  un único chip pulsado a la vez, el punto de color del juego y el tinte y el borde del chip
  pulsado (spec 016, RF-11): en el chip de un juego, el punto, el tinte y el borde salen de la
  tinta del catálogo de ese juego (RF-2); en «Todos los juegos», el tinte sale de `--volt` y el
  borde de `--volt-edge`, como hoy.
- RF-15 (avisos, M13): EL SISTEMA conserva el rol de cada aviso tal como está hoy en cada lugar:
  los avisos de error y los de login (spec 007, RNF-7) se anuncian como alerta; el aviso de la
  resincronización se anuncia como estado; los avisos que hoy no tienen rol siguen sin él. Un
  aviso migrado nunca se anuncia dos veces ni con un rol distinto del de hoy. El aviso de error de
  una escritura sigue sin mostrarse si la respuesta llega tras limpiar la sesión del cliente (spec
  007).
- RF-16 (sellos, M14): EL SISTEMA conserva el texto, el tono, el título emergente donde lo hay y
  la animación de «estampar» al aparecer y al volver a estampar (sin animación con movimiento
  reducido, como en la línea base). Conserva el rol de estado solo donde hoy lo tiene: el sello
  de la tarjeta de sesión de la agenda que dice «La organizas» o «Estás dentro». Los demás sellos,
  también «Guardado» de Configuración, siguen sin rol de estado y sin anuncio, como hoy: esta spec
  no añade ningún anuncio. «Datos de demostración» y la etiqueta de origen no son sellos y se
  quedan como están (Q-14, H6).
- RF-17 (estados, M15): EL SISTEMA conserva el esqueleto de carga oculto a los lectores de
  pantalla; el indicador de carga con rol de estado y sus textos («Leyendo…», «Cargando…»); el
  indicador «Actualizando» (junto a los filtros de la agenda y en la cabecera de coincidencias),
  visible solo mientras se vuelve a pedir la lista, sin rol y con «Actualizando» como etiqueta,
  sin anunciar nada que hoy no se anuncie (P10). El indicador giratorio de «Leyendo…»/«Cargando…»
  y el de «Actualizando» conservan su tamaño y el color con que se pintan hoy: los dos piden hoy un
  color que no corresponde a ningún token, así que el navegador les da el color que heredan del
  texto que los rodea; ese color heredado, anotado en la línea base, es el que se conserva, y sale
  de su token; en el
  error de lectura, el foco en «Reintentar» al mostrarse cuando hoy se lleva allí (spec 007,
  RNF-7, y spec 016, RF-2) y «Reintentar» bloqueado mientras su lectura está en curso (spec 009,
  RF-13); y los estados del panel de la agenda que fija la spec 016 (RF-25: «Cargando…» anunciado
  como estado y el error con «Reintentar», sin tomar el foco).
- RF-18 (botones de icono, M3): EL SISTEMA conserva su nombre accesible y su título emergente
  actuales: «Cambiar a tema claro»/«Cambiar a tema oscuro», «Cerrar sesión» (o «Enviando…» mientras
  cierra) y «Cerrar» en las ventanas, y el giro del icono al cambiar de tema. El botón de cerrar
  de las ventanas tiene hoy solo el nombre accesible «Cerrar», sin título emergente, y sigue así.

### Comunes
- RF-19: EL SISTEMA no cambia ningún texto de la interfaz (etiquetas, botones, avisos, errores,
  títulos, textos de ejemplo, nombres accesibles y títulos emergentes), salvo los de la ventana de
  desvincular, que fija RF-23 (Q4). SI un componente de la
  librería trae un texto propio visible o anunciado (por ejemplo, un nombre accesible en inglés
  para cerrar o para cargar), ENTONCES EL SISTEMA lo sustituye por el texto en español de hoy o lo
  quita si hoy no existe: la interfaz sigue entera en español (constitución, principio 6).
- RF-20: EL SISTEMA conserva en cada vista el orden de tabulación de hoy, salvo lo que cambian
  las pestañas de perfil y coincidencias (RF-13) y las ventanas (RF-12, RF-24), y muestra el
  indicador de foco en todo componente migrado al recibir el foco por teclado (en los campos, con
  su forma propia, más abajo) y en todo título con foco por programa (spec 009, RNF-2; spec 016,
  RF-25 y RF-26; RF-12 y RF-25 de esta spec):
  - en el tema oscuro, el indicador es el de hoy (mismo color, grosor y separación);
  - en el tema claro, el indicador usa un tono del acento tomado de los tokens de diseño, con un
    contraste de al menos 3:1 contra cada fondo sobre el que aparece (fondo de la página,
    superficies de los paneles y de las ventanas, y el fondo propio del control cuando el
    indicador va dentro de él), con el mismo grosor y la misma separación que hoy (Q5; WCAG 2.1,
    1.4.11; diferencia declarada, RNF-2). Si ningún token del acento cumple ese contraste, se
    añade uno nuevo del acento al tema claro, sin tocar los valores del tema oscuro;
  - el panel de las pestañas de juego (RF-13) muestra el indicador de hoy en la ficha (por dentro
    del panel), con el color de los dos puntos anteriores; su 3:1 se mide contra el fondo del
    panel junto al indicador.

  Los campos (entrada de texto, búsqueda, lista desplegable y área de texto; M4 a M7) conservan su
  forma propia de indicador de foco, que es la segunda forma declarada de indicador de la página
  (decisión H2): no llevan el contorno de los demás controles, sino su borde y su halo con foco,
  del mismo grosor y ancho que hoy:
  - en el tema oscuro, borde y halo son los de hoy;
  - en el tema claro, borde y halo usan el mismo tono del acento del indicador de foco (Q7: un
    único tono), sólido o translúcido según elija el plan, de modo que el borde con foco tenga al
    menos 3:1 contra el fondo del campo con foco y el halo al menos 3:1 contra el fondo que rodea
    al campo (la superficie del panel o de la ventana); los colores translúcidos se miden sobre
    el color compuesto que se ve en pantalla (diferencia declarada, RNF-2, punto 6);
  - un campo de texto con error conserva el borde y el halo de error también con el foco, como
    hoy (el error manda sobre el foco); con el foco solo cambia, como hoy, su fondo.

  Y EL SISTEMA usa en el tema claro ese mismo tono para el indicador de foco de todos los demás
  elementos que reciben el foco y no se migran (Q7; diferencia declarada, RNF-2): enlaces de
  texto, barra de navegación (con la píldora de la sección activa), botón del menú móvil y menú
  móvil, enlaces que ocupan las celdas del inicio (con su separación de hoy, mayor que la del
  resto), bloques de la hoja semanal de la agenda, hoja de horas, «Saltar al contenido» y enlaces
  de las visualizaciones de datos. Así hay un único color de indicador de foco en toda la página
  en cada tema. No es un indicador de foco, y se queda como está en los dos temas, el número del
  paso de «Anotar una sesión» que se enciende en volt cuando el foco está dentro de ese paso (con
  teclado o con el ratón): es un adorno del paso, que acompaña al indicador propio del campo
  (P11). Además:
  - solo cambia el color del indicador: cada elemento conserva el grosor, la separación y el
    momento en que hoy lo muestra (por ejemplo, solo con el foco por teclado), y el resto de su
    aspecto no cambia;
  - el contraste de al menos 3:1 vale también contra los fondos sobre los que aparece en esos
    elementos (la barra de navegación, el menú móvil, el fondo de la página alrededor de las
    celdas del inicio, la hoja semanal y sus bloques, y la hoja de horas y sus bloques marcados);
    el tono elegido, o el token nuevo si hace falta, es uno solo para toda la página, también para
    el borde y el halo de los campos;
  - en el tema oscuro, el indicador de esos elementos es el de hoy.
- RF-21: MIENTRAS está activo el modo simulado, EL SISTEMA aplica RF-1 a RF-20 y RF-22 a RF-25
  igual que con el servidor real, y la interfaz del modo simulado (aviso «Datos de demostración»,
  ayuda de la cuenta demo con «Rellenar esos datos») se ve como hoy.
- RF-22: SI la vista cambia mientras una ventana está abierta (por «Atrás» o «Adelante», por una
  regla de sesión como el 401 o el cambio de sesión en otra pestaña, specs 007 y 016), ENTONCES EL
  SISTEMA cierra la ventana como hoy y la página vuelve a poder desplazarse: no queda ningún fondo
  de ventana, bloqueo del desplazamiento ni retención del foco en la vista siguiente. Vale también
  para la ventana de desvincular (RF-23).

### Ventana de desvincular una cuenta (M16; decisión Q4)
Sustituye a la confirmación nativa del navegador que hoy pide Configuración antes de desvincular
una cuenta. La operación del servidor, sus respuestas y lo que pasa con la lista de cuentas tras
desvincular no cambian (spec 004; spec 007, RF-9 y RF-20). Sigue las reglas de foco y de bloqueo
de «¿Cancelar esta sesión?» (spec 009, RF-23 y RNF-2).
- RF-23: CUANDO el jugador pulsa «Desvincular» en la fila de una cuenta de Configuración, EL
  SISTEMA abre la ventana de desvincular, con el aspecto de «¿Cancelar esta sesión?», y no envía
  nada. La ventana:
  - se anuncia como ventana modal, con su título como nombre accesible y su mensaje como
    descripción;
  - tiene el título «¿Desvincular <identificador de esa cuenta>?» y el mensaje «Dejarás de
    aparecer en las coincidencias de ese juego.», que son el texto de la confirmación de hoy
    partido en dos, sin cambiar ninguna palabra; si la cuenta no está en la lista al abrirla, el
    título es «¿Desvincular esta cuenta?», como hoy. El identificador se muestra como texto y
    nunca se inserta como HTML (spec 007, RNF-2), y el título no cambia mientras la ventana está
    abierta aunque la lista de cuentas se vuelva a leer;
  - tiene los botones «Desvincular», con el aspecto de «Sí, cancelar sesión», y «Volver», con el
    de «Volver», y el botón de cerrar con el nombre accesible «Cerrar», sin título emergente, como
    el de las otras ventanas (RF-18);
  - comparte con las otras ventanas lo que fija RF-12: la página de detrás no se desplaza mientras
    está abierta y vuelve a desplazarse al cerrarse por cualquier camino, y entra con resorte
    desde abajo sobre el fondo desenfocado, salvo con movimiento reducido.
  MIENTRAS hay otra escritura de cuentas en curso (resincronizar o desvincular), el botón
  «Desvincular» de la fila sigue sin poder pulsarse, como hoy (spec 007, RF-20).
- RF-24: EL SISTEMA aplica a la ventana de desvincular estas reglas de foco y de cierre, las de
  «¿Cancelar esta sesión?» (spec 009, RF-23):
  - CUANDO se abre, el foco va a «Volver».
  - MIENTRAS está abierta, también con la desvinculación en curso, Tab y Mayús+Tab recorren solo
    sus controles y no salen a la página de detrás.
  - CUANDO el jugador pulsa «Volver» o el botón de cerrar, pulsa Escape o pulsa fuera de la
    ventana, sin una desvinculación en curso, EL SISTEMA cierra la ventana sin enviar nada y
    devuelve el foco al botón «Desvincular» de la fila que la abrió. SI esa fila ya no existe o
    su botón no puede recibir el foco (por ejemplo, la lista se volvió a leer y la cuenta ya no
    está, o la sección muestra el error de la lista), ENTONCES el foco va al título de la sección
    «Cuentas vinculadas», como tras desvincular (RF-25, P7); el foco nunca queda en el cuerpo de
    la página.
  - SI se cierra porque la vista cambia (RF-22; por ejemplo, un 401, spec 007, RF-7), ENTONCES EL
    SISTEMA no devuelve el foco a ningún control de Configuración.
- RF-25: CUANDO el jugador pulsa «Desvincular» en la ventana, EL SISTEMA envía la desvinculación
  una sola vez, aunque haga doble clic (spec 007, RF-20), y deja de mostrar el aviso y el error de
  la última resincronización, como hoy al confirmar. MIENTRAS la desvinculación está en curso
  (hasta la respuesta o el plazo de 30 s de la spec 007, RF-20):
  - «Desvincular» de la ventana queda deshabilitado y muestra «Enviando…» con su indicador (RF-8);
    «Volver» y el botón de cerrar quedan bloqueados (Definiciones); Escape y pulsar fuera no hacen
    nada;
  - EL SISTEMA lleva el foco al título de la ventana, que es un título con foco por programa
    (Definiciones); Tab y Mayús+Tab recorren «Volver» y el botón de cerrar, bloqueados, sin salir
    de la ventana;
  - las filas de cuentas, detrás de la ventana, siguen como hoy durante una desvinculación (sus
    botones deshabilitados y el de esa cuenta con «Enviando…»).

  CUANDO el servidor confirma la desvinculación, EL SISTEMA cierra la ventana, quita la cuenta de
  la lista como hoy y lleva el foco al título de la sección «Cuentas vinculadas», que es un título
  con foco por programa (P7), porque el botón que abrió la ventana ya no existe. Si era la última
  cuenta, la sección muestra «Todavía no vinculas ninguna cuenta…», como hoy, y el foco está en su
  título.

  SI la desvinculación falla con un error con mensaje distinto de 401 (por ejemplo, el 403 o el 404
  de la spec 004), con un error sin mensaje, con un 5xx o por el plazo de 30 s, ENTONCES EL
  SISTEMA:
  - deja la ventana abierta y muestra dentro de ella el mensaje según la spec 007, RF-9 (el del
    servidor tal como llega o el Texto de error sin mensaje), con el aspecto y el anuncio de
    alerta de los errores de escritura de hoy (RF-15);
  - devuelve el foco a «Desvincular» de la ventana, aunque durante la espera el jugador lo haya
    llevado con Tab a «Volver» o al botón de cerrar;
  - no muestra ese error encima de la lista de cuentas, donde hoy aparece (P8): el mensaje vive en
    la ventana y desaparece al volver a pulsar «Desvincular» o al cerrarla;
  - no cambia lo que la interfaz hace hoy con la lista de cuentas tras un error.

  SI la desvinculación recibe 401, ENTONCES se aplica la spec 007, RF-7, y la ventana se cierra
  según RF-22.

## Requisitos no funcionales
- RNF-1: Dependencias, todas con versión exacta (constitución, principio 1; `AGENTS.md`,
  `--save-exact`) y justificadas en el plan:
  - de producción, solo los paquetes de Mantine imprescindibles para los componentes del
    inventario: el núcleo de componentes y el de utilidades (hooks), los dos en la misma versión
    exacta. El de utilidades es una dependencia par del núcleo (el núcleo no lo instala), así que
    se instala de forma explícita. No entran el paquete del gestor de ventanas por llamada a una
    función, ni los de avisos flotantes, fechas, formularios o gráficos, ni otra colección de
    iconos, ni otra librería de estilos;
  - versión: de la línea 8.3 de Mantine. La línea 9 exige React 19.2 o superior, y actualizar
    React o Vite queda fuera de alcance; la 8.3 admite React 18 (por ejemplo, la 8.3.18). Se usa
    la versión 8.3.x más reciente cuyo rango de dependencias admita React 18.3 sin avisos de
    dependencias incompatibles al instalar. El plan fija el número exacto y anota la comprobación;
  - de desarrollo, ninguna, salvo que el plan demuestre que la librería la necesita para compilar
    sus estilos con Vite 5.4; en ese caso, la mínima y con versión exacta. Las pruebas usan el
    Vitest que trae la spec 016, sin ninguna dependencia de desarrollo nueva para ellas (Q6,
    RNF-6).
- RNF-2: Sin regresiones visibles. No cambian la disposición, los estilos, los textos, los avisos,
  los anuncios a lectores de pantalla, el foco, el orden de tabulación ni las entradas del
  historial de ninguna vista, en los dos temas y en los anchos de verificación. Solo cambia lo que
  fija esta lista, que es la lista completa y cerrada de diferencias declaradas (Q1 a Q5, Q7, H2,
  H3 y la propuesta P9, aceptada por el usuario el 2026-11-21):
  1. Diferencias de hasta 2 px en el alto y en el ancho de la caja dibujada de los componentes
     migrados (RF-3), acotadas: en los anchos de verificación ningún texto parte en más líneas ni
     ninguna fila de controles se reparte en más líneas que en la línea base.
  2. Foco de «Anotar una sesión» (Q1, RF-12): al abrirse, el foco va a «Título»; Tab y Mayús+Tab
     no salen de la ventana; con el envío deshabilitado, el foco va a su título; al cerrarse, el
     foco vuelve al control que la abrió (o a «Anotar sesión» si la abrió una propuesta, o al
     título del panel si ese control ya no está). Hoy el foco no entra en la ventana ni queda
     retenido en ella. Cambia el orden de tabulación mientras está abierta.
  3. «Solo cuentas verificadas» se anuncia como interruptor, no como casilla de verificación, con
     el mismo nombre y estado (Q2, RF-11).
  4. Pestañas de juego de perfil y coincidencias (Q3 y H3, RF-13): una sola parada en el recorrido
     con Tab para todo el grupo (antes, una por juego); flechas, Inicio y Fin eligen y enfocan
     otra pestaña; cada pestaña se asocia a su panel, que se anuncia como tal; y el panel es una
     parada nueva del recorrido con Tab, justo después de la pestaña elegida, con su indicador de
     foco (hoy no lo es; en la ficha ya lo es y no cambia).
  5. Desvincular una cuenta (Q4, RF-23 a RF-25): la confirmación nativa del navegador pasa a la
     ventana de desvincular, con el mismo texto partido en título y mensaje, los botones
     «Desvincular» y «Volver» y el botón de cerrar «Cerrar»; foco, bloqueo y cierre como en
     «¿Cancelar esta sesión?»; el error de la desvinculación se muestra dentro de la ventana y no
     encima de la lista de cuentas; tras desvincular, el foco va al título «Cuentas vinculadas».
  6. Indicador de foco del tema claro (Q5, Q7 y H2, RF-4, RF-20): todo indicador de foco de la
     página (componentes migrados, panel de las pestañas, títulos con foco por programa y los
     elementos que no se migran: enlaces de texto, barra de navegación, botón del menú y menú
     móvil, enlaces de las celdas del inicio, hoja semanal, hoja de horas, «Saltar al contenido»
     y enlaces de las visualizaciones) usa un mismo tono del acento con al menos 3:1 de
     contraste contra su fondo, en lugar del volt de hoy. Solo cambia el color: grosor,
     separación y el resto del aspecto de cada elemento se conservan. En los campos (entrada,
     búsqueda, lista y área de texto), el borde y el halo con foco pasan a ese mismo tono, con al
     menos 3:1 (el borde contra el fondo del campo y el halo contra el fondo que lo rodea), en
     lugar del borde y el halo volt tenues de hoy (H2). En el tema oscuro no cambia nada de esto.
  7. Bloqueo del desplazamiento con una ventana abierta (RF-12, P9): al abrirse una ventana, el
     contenido de la página ya no se corre hacia el lado el ancho de la barra de desplazamiento
     (hoy se corre, en los navegadores con barra que ocupa sitio); la página sigue sin
     desplazarse mientras la ventana está abierta.
- RNF-3: Accesibilidad (`PRODUCT.md`, «Accessibility & Inclusion»; specs 008 y 009, RNF-5). En
  los dos temas y en todos los estados de los componentes migrados:
  - texto con contraste de al menos 4,5:1 (3:1 en texto grande) contra su fondo, con la excepción
    de la spec 008 (P65) y la spec 009 (VC4) para el texto de un botón deshabilitado o bloqueado;
  - bordes de campos y listas, pista y control de los deslizadores, el interruptor y la píldora de
    las pestañas con contraste de al menos 3:1 contra el fondo cuando son lo único que muestra el
    control o su estado (WCAG 2.1, 1.4.11), salvo deshabilitados; los que hoy no lo cumplen se
    anotan en la línea base y no empeoran;
  - todo componente migrado se usa solo con teclado, con su nombre accesible, su rol y su estado
    (elegido, pulsado, marcado, no válido, no disponible) anunciados como hoy (WCAG 2.1, 2.1.1 y
    4.1.2);
  - con el texto ampliado al 200 % del navegador no se pierde contenido ni función en los
    componentes migrados.
- RNF-4: Con 375 px y con 360 px de ancho, ninguna vista tiene un desplazamiento horizontal que no
  tuviera en la línea base, y el ancho desplazable de la página no crece respecto de ella (las
  vistas que ya desbordan, `MEMORY.md`, «Deuda conocida», no empeoran). Las ventanas abiertas
  cumplen la spec 009 (RNF-5) a 360 px, también con un título de 60 caracteres sin espacios; la
  ventana de desvincular, también con un identificador largo sin espacios (por ejemplo, un
  SteamID64 o un Riot ID del largo máximo que admite la spec 004), que parte línea dentro de la
  ventana.
- RNF-5: CUANDO el jugador pidió movimiento reducido en su sistema, EL SISTEMA no anima los
  componentes migrados (ventanas, pestañas, sellos, interruptor, indicadores de carga más allá de
  lo que hoy anima la hoja global), como hoy.
- RNF-6: TypeScript estricto, sin `any`, `@ts-ignore` ni aserciones para esquivar tipos en el
  código nuevo, incluidas las pruebas. Construcción, comprobación de tipos y lint del frontend en
  verde. Pruebas con Vitest (Q6), solo de reglas puras, en el entorno de Node, sin dependencias
  nuevas, sin red, sin servidor y sin navegador real (ni simulado):
  - la elección del tema inicial (RF-5, RF-7) es una regla pura (constitución, principio 3) con
    estas entradas: el valor guardado de la preferencia de tema, o que no hay almacenamiento
    disponible, y la preferencia del sistema operativo; su salida es «light» o «dark». Las
    pruebas cubren: preferencia guardada «light» y «dark» (gana sobre la del sistema), sin
    preferencia guardada con el sistema en claro y en oscuro, valor guardado extraño (se usa la
    del sistema) y almacenamiento no disponible (se usa la del sistema);
  - esa regla es la que de verdad decide el tema antes de la primera pintura. Hoy la decide un
    script en línea de la página, que corre antes de que cargue la aplicación; con esta spec, la
    regla probada y la que corre antes de la primera pintura salen de una sola fuente, y de esa
    misma decisión salen la marca de tema que lee la hoja global y la que lee la librería, con el
    mismo valor. SI el plan demuestra que la regla que corre antes de la primera pintura no puede
    salir de la misma fuente que la probada, ENTONCES la duplicación se limita a esa regla y una
    prueba ejecuta la versión que se sirve en la página con los seis casos anteriores y comprueba
    que da la misma salida que la regla probada, para que las pruebas cubran la regla que se
    ejecuta;
  - el tema de la librería no contiene ningún color literal (Definiciones), solo referencias a
    los tokens de diseño y las palabras clave que no son colores literales (`transparent`,
    `currentColor`, `inherit`, `initial`, `unset`, `revert`) (RF-2). Una prueba recorre todos los
    valores de color que la librería usa para pintar, en sus dos esquemas (claro y oscuro): los
    que escribe el proyecto en su tema y los valores por defecto de la librería que llegan a
    pintarse en los componentes migrados, al menos el fondo y el texto del cuerpo y de los
    componentes, los bordes, los marcadores de posición, el estado deshabilitado, el error, el
    anillo de foco y la paleta del color principal. Falla si alguno no es una referencia a un
    token ni una de esas palabras clave, o si es una mezcla, sombra o degradado que contiene un
    color literal; no falla por `transparent`, `currentColor` ni las demás palabras clave. Una
    prueba que solo mire un token (por ejemplo, `--volt`) no basta.
  Se escriben antes que el código (rojo por la razón correcta, después verde; constitución,
  principio 4). Lo visual, el foco, los roles y el teclado se comprueban en el recorrido de los
  criterios de finalización y en las pruebas E2E de la spec 018. Ninguna tarea se cierra con la
  suite del frontend en rojo ni con un `.only`.
- RNF-7: Las vistas se siguen cargando bajo demanda: la pantalla de acceso no descarga el código
  de las demás vistas, como hoy. El registro de validación anota el tamaño del código y de los
  estilos que descarga la pantalla de acceso antes y después de esta spec (sin umbral: es
  información para el equipo).
- RNF-8: La construcción de producción hecha con el procedimiento de la spec 010, sin ninguna
  variable de entorno nueva, sirve la interfaz con la librería y su tema exactamente igual que el
  servidor de desarrollo (mismos estilos, mismo tema, sin componentes sin estilo).

## Casos límite
- Primera visita sin preferencia guardada y sistema en claro: la página sale en claro desde la
  primera pintura, también los componentes migrados (RF-5).
- Preferencia guardada con un valor extraño (por ejemplo, editada a mano): se usa la del sistema
  operativo y la aplicación funciona (RF-7).
- Almacenamiento bloqueado (modo privado estricto): el tema se decide por el sistema, el botón lo
  cambia y la elección dura hasta recargar (RF-7).
- El jugador cambia el tema del sistema operativo con la página abierta: la página no cambia (RF-7).
- El jugador cambia el tema en otra pestaña de la aplicación: esta pestaña no cambia; al recargarla
  sale con el tema guardado; si antes pulsa en ella el botón de cambiar tema, se guarda lo que
  elige en ella (RF-7).
- Cambiar de tema y abrir después «Anotar una sesión», «¿Cancelar esta sesión?» o la ventana de
  desvincular: la ventana sale entera en el tema nuevo, sin ninguna parte en el anterior (RF-6).
- Con una ventana abierta, pulsar donde está el botón de cambiar tema: se pulsa el fondo de la
  ventana, que la cierra, y el tema no cambia. En «¿Cancelar esta sesión?» y en la ventana de
  desvincular con su escritura en curso, no hace nada; «Anotar una sesión» se cierra también con
  la creación en curso (RF-6, RF-12, RF-25).
- Cambiar de tema en un navegador sin transiciones de vista o con movimiento reducido: el cambio es
  inmediato y completo (RF-6).
- Doble clic rápido en «Entrar», «Anotar sesión», «Guardar ficha» o «Sí, cancelar sesión»: una sola
  petición y el texto «Enviando…» visible (RF-8).
- Pegar en «Título» un texto de 80 caracteres, o 70 emojis: entran 60 caracteres Unicode; escribir
  con composición de acentos cerca del límite no corta el carácter a medias (RF-9).
- Cancelación en curso y el jugador pulsa Escape, el botón de cerrar o fuera de la ventana: no pasa
  nada; Tab recorre «Volver» y el botón de cerrar, bloqueados, sin salir de la ventana (RF-12).
- Cancelar desde la agenda con 204: la ventana se cierra, la tarjeta desaparece y el foco va al
  título del panel, no al botón que la abrió (que ya no existe) ni al cuerpo de la página (RF-12).
- «Atrás» con «Anotar una sesión» abierta (spec 016, RF-15), o un 401 con la ventana abierta (spec
  016, RF-16): la ventana se cierra, no queda fondo oscurecido y la página vuelve a desplazarse
  (RF-22).
- Ventana abierta a 360 px con un título de 60 caracteres sin espacios: sin desplazamiento
  horizontal (RNF-4).
- Coincidencias de CS2 sin rango Premier propio: todos los criterios, también el interruptor y los
  deslizadores migrados, deshabilitados (spec 015, RF-10; RF-11).
- Ficha de jugador, perfil o coincidencias con la última pestaña elegida y flecha derecha: el
  comportamiento (pasar a la primera o quedarse) es el de la ficha hoy, en las tres vistas (RF-13).
- Perfil o coincidencias con un solo juego vinculado: el grupo tiene una pestaña, que es la única
  parada del recorrido con Tab; las flechas, Inicio y Fin la dejan elegida y con el foco (RF-13).
- Recorrido con Tab de coincidencias: tras la pestaña elegida, Tab pasa al panel (que se ve con su
  indicador de foco) y después al primer control que contiene (el enlace del aviso de horas, si
  lo hay, o el primer criterio), sin pasar por las demás pestañas; Mayús+Tab desde el panel vuelve
  a la pestaña elegida (RF-13, RNF-2, punto 4). En perfil, lo mismo con el resumen del juego.
- Panel de las pestañas sin ningún control dentro (por ejemplo, mientras muestra el esqueleto de
  carga): sigue siendo una parada del recorrido con Tab, como hoy en la ficha (RF-13).
- Abrir «Anotar una sesión» desde un bloque de la semana y cerrarla con Escape: el foco vuelve a
  ese bloque; con «Cancelar», el botón de cerrar o pulsando fuera, lo mismo (RF-12).
- Abrir «Anotar una sesión» con «Anotar sesión» de la cabecera y crear la sesión de juego: la
  ventana se cierra, el foco vuelve a «Anotar sesión» y el panel pasa a «Sesión abierta» con la
  sesión creada por confirmar (spec 016, RF-24), sin mover el foco (RF-12).
- Crear desde un bloque de la semana y que la nueva petición de la lista falle: la semana muestra
  el error en lugar de los bloques y el foco, que seguía en el bloque, va al título del panel
  (RF-12).
- Lo mismo, pero el jugador ya llevó el foco con Tab a otro control antes de que llegue la
  respuesta: el foco se queda donde está; una respuesta posterior de la lista tampoco lo mueve
  (RF-12).
- Lector de pantalla al abrirse «Anotar una sesión»: anuncia la ventana con el nombre «Anotar una
  sesión», sin la referencia del bloque y sin leer el formulario como descripción (RF-12).
- «Anotar una sesión» abierta por una propuesta de «Proponer» y cerrada sin crear: el foco va a
  «Anotar sesión» de la cabecera (RF-12, P6).
- Tab desde el último control de «Anotar una sesión»: el foco pasa al primero de la ventana, no a
  la página de detrás; Mayús+Tab desde el primero, al último (RF-12).
- Enviar «Anotar una sesión» con el ratón: mientras dice «Enviando…», el foco está en el título de
  la ventana; si la creación falla, vuelve al botón de envío con el error visible. Enviar con Intro
  desde «Título»: el foco sigue en «Título» todo el tiempo (RF-12).
- Propuesta de «Proponer» pendiente que, sin ventana abierta, se aplicaría (spec 016, RF-29,
  caso 6; por ejemplo, al llegar las cuentas) mientras «¿Cancelar esta sesión?» está abierta en la
  agenda: la regla de la 016 da «esperar» (caso 5) y no se abre nada encima; Escape (o «Volver», el botón de cerrar o pulsar fuera) cierra solo esa ventana, y
  entonces se abre «Anotar una sesión» con la propuesta y el foco en «Título»; al cerrarla, el
  foco va a «Anotar sesión». Confirmar la cancelación con 204 no cambia nada: al cerrarse la
  ventana, la regla deja de dar «esperar» y la propuesta se aplica igual. Si la cancelación falla, la ventana sigue abierta (spec
  009, RF-23) y la propuesta sigue esperando. Nunca quedan dos ventanas abiertas a la vez con dos
  retenciones del foco (RF-12, Q8).
- Mismo caso, y con la ventana abierta el jugador pulsa «Atrás», recibe un 401 o recarga: la
  ventana se cierra según RF-22 (o la página se recarga), la propuesta se descarta según la spec
  016 (RF-16, RF-30) y no se abre «Anotar una sesión» (RF-12, Q8).
- Propuesta que, sin ventana abierta, se aplicaría con «Anotar una sesión» ya abierta por el
  jugador (spec 016, RF-13.a, con las cuentas volviéndose a pedir y llegando con la ventana
  abierta): la regla de la 016 da «esperar» (caso 5) y la ventana abierta no cambia; al cerrarse
  por cualquier camino (también al crear), la regla deja de dar «esperar», se abre otra vez
  «Anotar una sesión», ahora con la propuesta, y el foco va a «Título» (RF-12, Q8).
- Abrir una ventana en un navegador con barra de desplazamiento que ocupa sitio: el contenido de
  la página no se corre hacia el lado y la página no se desplaza; al cerrarla, vuelve a
  desplazarse (RF-12, RNF-2, punto 7).
- Pulsar «Desvincular» en una fila y cerrar con Escape: no se envía nada y el foco vuelve a
  «Desvincular» de esa fila (RF-24).
- Doble clic en «Desvincular» de la ventana: una sola petición; el botón dice «Enviando…» y el foco
  va al título de la ventana; Escape y pulsar fuera no hacen nada y Tab recorre «Volver» y el botón
  de cerrar, bloqueados (RF-25).
- Desvincular con éxito la única cuenta: la ventana se cierra, la sección muestra «Todavía no
  vinculas ninguna cuenta…» y el foco está en el título «Cuentas vinculadas» (RF-25).
- Desvincular una cuenta que ya se desvinculó en otra pestaña (404 «cuenta no encontrada» de la
  spec 004): la ventana sigue abierta con ese mensaje y el foco en «Desvincular»; al cerrarla, el
  mensaje desaparece y no aparece encima de la lista (RF-25).
- Desvincular con el servidor caído o sin respuesta en 30 s: la ventana sigue abierta con el Texto
  de error sin mensaje y el foco en «Desvincular» (RF-25).
- Ventana de desvincular abierta y la lista de cuentas se vuelve a leer sin esa cuenta (se
  desvinculó en otra pestaña): la ventana sigue abierta con el mismo título; al cerrarla sin
  enviar, el foco va al título «Cuentas vinculadas» (RF-24); si se pulsa «Desvincular», se aplica
  el caso del 404 (RF-25).
- Resincronización en curso en una fila: «Desvincular» de las filas no se puede pulsar y no se abre
  ninguna ventana (RF-23).
- Fallo de la desvinculación y nuevo intento con éxito: el mensaje de error desaparece al pulsar
  otra vez «Desvincular» y, al confirmarse, la ventana se cierra y el foco va a «Cuentas
  vinculadas» (RF-25).
- 401 al desvincular: login con el aviso de la spec 007, RF-7; no queda fondo de ventana y la
  página se desplaza (RF-22, RF-25).
- Lector de pantalla sobre «Solo cuentas verificadas»: anuncia su nombre, «interruptor» y si está
  activado (RF-11).
- Deslizador «Diferencia máxima de rango» en 25 con Re Pág, Av Pág, Inicio, Fin y flechas: cada
  tecla deja el mismo valor que en la línea base; el lector de pantalla anuncia el nombre
  «Diferencia máxima de rango 25 pts» (que cambia con el valor) y el valor 25 (RF-11).
- Guardar la ficha en Configuración: aparece «Guardado» con su animación de estampar y el lector de
  pantalla no anuncia nada nuevo; sumarse a una sesión en la agenda: «Estás dentro» se anuncia
  como estado, como hoy (RF-16).
- Volver a pedir la lista de la agenda o de coincidencias: se ve el indicador «Actualizando» como
  hoy y no se anuncia nada que hoy no se anuncie (RF-17).
- Pestañas y chips de League of Legends, Rainbow Six Siege y Counter-Strike 2, en los dos temas:
  la píldora, el punto, el tinte y el borde del chip pulsado tienen el mismo color que en la
  línea base (la tinta del catálogo, no la tinta de juego de los tokens); el chip «Todos los
  juegos» pulsado, con su tinte volt y su borde de filo volt, también (RF-2, RF-14).
- Tema claro: el indicador de foco de un botón primario, de una pestaña, del panel de las
  pestañas y del título del panel de la agenda tiene al menos 3:1 contra el fondo que lo rodea; en
  el tema oscuro es igual que en la línea base (RF-20).
- Tema claro, foco por teclado en «Título» dentro de «Anotar una sesión», en una lista desplegable
  y en «Cómo juegas»: borde con foco con al menos 3:1 contra el fondo del campo y halo con al menos
  3:1 contra la superficie que lo rodea, en el mismo tono que los demás indicadores; en el tema
  oscuro, igual que en la línea base (RF-20).
- Campo de texto con error que recibe el foco: conserva el borde y el halo de error, como hoy
  (RF-20).
- Paso de «Anotar una sesión» con el foco dentro: su número se enciende en volt en los dos temas,
  como hoy; no es un indicador de foco (RF-20, P11).
- Tema claro, elementos que no se migran: el foco por teclado en un enlace de texto, en una
  sección de la barra de navegación (también la activa, sobre su píldora), en el botón del menú y
  en un enlace del menú móvil a 375 px, en el enlace de una celda del inicio, en un bloque de la
  hoja semanal, en un bloque marcado de la hoja de horas, en «Saltar al contenido» y en un enlace
  de una visualización muestra el mismo tono que los
  componentes migrados, con al menos 3:1 contra su fondo y con el grosor y la separación de la
  línea base; nada más de esos elementos cambia (RF-4, RF-20).
- Tema oscuro, los mismos elementos que no se migran: indicador de foco igual que en la línea base
  (RF-20).
- Elemento que no se migra y que hoy muestra el indicador solo con el foco por teclado (por
  ejemplo, al pulsarlo con el ratón no lo muestra): sigue igual; solo cambia el color cuando se
  muestra (RF-20).
- Panel de la agenda con una sesión abierta por confirmar (spec 016, RF-25): «Cargando…» con rol de
  estado y, ante un fallo, el error con «Reintentar» migrado, sin tomar el foco (RF-17).
- Error de un aviso migrado que llega dos veces seguidas con el mismo texto: se anuncia como hoy,
  sin anuncios duplicados por la librería (RF-15).
- Lector de pantalla sobre el botón de cerrar de una ventana: anuncia «Cerrar», no un texto en
  inglés (RF-19).
- Construcción de producción servida por el servidor (spec 010): mismos estilos y tema que en
  desarrollo (RNF-8).
- Texto ampliado al 200 %: los botones parten línea o crecen sin tapar su texto (RNF-3).

## Fuera de alcance
- Rehacer la disposición de las vistas o sus superficies propias (inventario, «Se quedan como
  están»), y pasar a componentes de la librería la estructura de la página (marco de la aplicación,
  rejillas, contenedores, paneles).
- Cambiar el mundo visual, la paleta, la tipografía o el valor de cualquier token de diseño. Solo
  se permiten: el tono del indicador de foco del tema claro en toda la página, también en el
  borde y el halo de los campos (Q5, Q7 y H2, RF-20), con un token nuevo si hace falta; y los
  tokens nuevos que recogen con exactamente su valor de hoy los colores escritos a mano en los
  componentes migrados, también la tinta del catálogo de juegos (H1, RF-2). Unificar la tinta del
  catálogo con las tintas de juego de los tokens queda fuera.
- Pasar a tokens los colores escritos a mano en elementos que se quedan (RF-2).
- El tono «peligro» de los sellos (N7): solo existe en los estilos, ningún sello de la interfaz lo
  usa y no se ve en ninguna vista, así que no tiene línea base, no forma parte del sello migrado
  (M14) y no recibe token nuevo. El plan decide si sus estilos se quitan.
- Cambiar la operación de desvincular del servidor, sus respuestas o lo que la interfaz hace con la
  lista de cuentas al desvincular (spec 004; spec 007): solo cambia la confirmación (Q4).
- Cambiar otras confirmaciones o diálogos que no estén en el inventario.
- Corregir contrastes conocidos de componentes que se quedan (por ejemplo, la hoja semanal de la
  agenda, `MEMORY.md`, «Próximo paso», punto 4), salvo el del color de su indicador de foco en el
  tema claro (Q7, RF-20).
- Avisos flotantes, el gestor de ventanas de la librería (el paquete aparte que abre ventanas con
  una llamada a una función, sin componente en la vista), formularios gestionados por la
  librería, selectores de fecha o gráficos de la librería (RNF-1). Las ventanas M10 y M16 sí usan
  el componente de ventana modal del núcleo de la librería, colocado en la vista que la abre.
- Cambiar de colección de iconos o de librería de animaciones.
- Fijar con versión exacta las dependencias que hoy tienen rango en el frontend (`MEMORY.md`,
  «Próximo paso», punto 4): solo las nuevas de esta spec van con versión exacta.
- Pruebas automáticas de componentes o vistas con un DOM simulado y cualquier dependencia de
  desarrollo nueva para probar (Q6, opción B descartada); las pruebas E2E son de la spec 018.
- Cambios en el servidor, el contrato de datos, el ruteo, el estado global (spec 016) o el modo
  simulado.
- Actualizar React o Vite.
- Una versión en inglés de la interfaz (constitución, principio 6).

## Criterios de finalización
- [ ] **Condición previa**: la spec 016 está implementada y validada. Antes de tocar nada de esta
      spec se toma la línea base: capturas de cada vista (entrada, acceso, registro, inicio,
      perfil, configuración, coincidencias, agenda, detalle, ficha, verificación con Riot, vuelta
      de Steam, «no encontrada») a 1280 y 375 px, en tema oscuro y claro, con sus estados
      relevantes (formulario con error, escritura en curso, ventana abierta, error de carga,
      vacío, modo simulado); los valores calculados y la caja dibujada (alto y ancho) de RF-3 de
      cada componente del inventario en reposo, y el número de líneas de sus textos a 360 y 375
      px; el ancho desplazable a 360 y 375 px de cada vista; el orden de tabulación de cada vista;
      el valor que deja cada tecla de RF-11 en cada deslizador partiendo de un valor anotado; el
      color con que se ven el indicador «Actualizando» y el indicador de «Leyendo…»/«Cargando…»
      (RF-17); y el tamaño de RNF-7. Se guardan en el
      registro de validación de esta spec.
- [ ] Mantine está instalada solo con los paquetes de RNF-1, en versión exacta compatible con React
      18.3 y sin avisos de dependencias incompatibles al instalar; el plan justifica cada paquete
      (RNF-1).
- [ ] Cada componente M1 a M16 sale de la librería en todas las vistas donde aparece y ningún
      componente migrado conserva su versión hecha a mano (RF-1). Una búsqueda en el código no
      encuentra colores literales (Definiciones) en el tema ni en los componentes migrados
      (`transparent`, `currentColor`, `inherit`, `initial`, `unset` y `revert` no cuentan como
      tales), y la prueba de RNF-6 sobre los colores de la librería pasa. En las herramientas del
      navegador, en los dos temas, cambiar a mano cada uno de estos tokens cambia al instante lo
      que corresponde, sin recargar: `--volt` (botón primario, tinte del chip «Todos los juegos»
      pulsado, interruptor activado, pista de los deslizadores), `--volt-edge` (borde del chip
      «Todos los juegos» pulsado), `--ink` (texto de botones y campos), `--surface-sunk` (fondo
      de los campos), `--line` y `--line-strong` (bordes), `--placeholder` (marcadores de
      posición), `--danger` (botón de peligro y errores), el token del indicador de foco del tema
      claro y cada token nuevo de RF-2 (sombra del botón primario, tinta del catálogo en pestañas
      y chips, también en el borde del chip de un juego pulsado, texto de la pestaña elegida,
      bordes de los sellos correcto y advertencia y del aviso de error). Ningún color que se ve
      en un componente migrado, en ningún estado, se queda igual al cambiar el token del que sale
      (RF-2).
- [ ] Repetidas las capturas de la línea base después del cambio, en los dos temas y en los dos
      anchos, las únicas diferencias son las declaradas en RNF-2; los valores calculados de RF-3
      coinciden; la caja dibujada difiere 2 px como máximo en alto y en ancho, y a 360 y 375 px
      ningún texto ni fila de controles parte en más líneas; los componentes que se quedan no
      cambian, salvo el color de su indicador de foco en el tema claro (RNF-2, punto 6) (RF-3,
      RF-4). Pestañas y chips de cada juego con el mismo color que la línea base (RF-2).
- [ ] Recarga con preferencia guardada en claro y en oscuro, sin preferencia con el sistema en
      claro y en oscuro, con un valor extraño y con el almacenamiento bloqueado: primera pintura
      con el tema correcto (grabación de rendimiento del navegador sin cuadros del otro tema) y
      ninguna entrada nueva en el almacenamiento; la entrada guarda «light» o «dark» (RF-5, RF-7).
- [ ] La regla del tema inicial que corre antes de la primera pintura sale de la misma fuente que
      la regla probada o, si el plan demostró que no puede, la prueba de RNF-6 ejecuta la versión
      servida y da lo mismo en los seis casos (RNF-6).
- [ ] Con la página abierta, cambiar el tema del sistema operativo (o emularlo con las
      herramientas del navegador): la página no cambia. Cambiar el tema en otra pestaña: esta no
      cambia hasta recargar y, al recargar, sale con el tema guardado (RF-7).
- [ ] Cambiar el tema en cada vista: toda la página y los componentes migrados cambian a la vez,
      con la transición en círculo y sin ella con movimiento reducido; el logo de Leetify y el
      color de la barra del navegador cambian. Después, abrir cada ventana (las dos de M10 y la
      de desvincular): sale entera en el tema nuevo (RF-6).
- [ ] Recorrido solo con teclado de cada vista: mismo orden de tabulación que la línea base salvo
      las diferencias declaradas 2, 4 y 5 de RNF-2, foco visible en cada componente migrado y en
      cada título con foco por programa, todos los controles operables (RF-20, RNF-3).
- [ ] Repetidas las reglas de foco de la ventana de cancelar de la spec 009 (RNF-2, puntos a y d,
      casos 6, 13 y 14) en la agenda y en el detalle: mismo resultado (RF-12).
- [ ] Ventanas en el árbol de accesibilidad: «Anotar una sesión» con el nombre «Anotar una sesión»
      (sin la referencia del bloque) y sin descripción; «¿Cancelar esta sesión?» con su título como
      nombre y sin descripción; superficie con el aspecto de panel de la línea base. Con una
      ventana abierta en un navegador con barra de desplazamiento que ocupa sitio, el contenido no
      se corre hacia el lado (RF-12, RNF-2, punto 7).
- [ ] «Anotar una sesión», abierta desde un bloque, desde «Anotar sesión» y desde «Proponer»: foco
      en «Título» al abrir; Tab y Mayús+Tab no salen de la ventana; foco en su título mientras el
      envío dice «Enviando…» (enviado con el ratón) y en «Título» si se envió con Intro; tras un
      error, foco en el elemento desde el que se envió; al cerrar por cada camino (Cancelar, botón
      de cerrar, Escape, pulsar fuera, creación), foco en el control que la abrió o en «Anotar
      sesión» si la abrió una propuesta; con la lista fallando tras crear desde un bloque, foco en
      el título del panel si el foco seguía en el bloque, y en el control al que el jugador lo
      llevó si ya lo había movido; con «Atrás» o un 401 con la ventana abierta, ningún foco
      retenido (RF-12, RF-22).
- [ ] «Proponer» con las cuentas lentas (red lenta en las herramientas del navegador) y
      «¿Cancelar esta sesión?» abierta en la agenda mientras esperan: al llegar las cuentas solo
      hay una ventana en el árbol de accesibilidad; al cerrarla con Escape se abre «Anotar una
      sesión» con la propuesta y el foco en «Título»; lo mismo confirmando la cancelación con 204;
      al cerrar «Anotar una sesión», foco en «Anotar sesión»; con «Atrás» o recargando con la
      ventana abierta, no se abre «Anotar una sesión» (RF-12, Q8; spec 016, RF-28 a RF-30).
- [ ] Pestañas de perfil, coincidencias y la ficha con Tab, flechas, Inicio y Fin y con un lector
      de pantalla (o el árbol de accesibilidad del navegador): una sola parada con Tab por grupo,
      seguida de una parada en el panel, con su indicador de foco visible, y después el primer
      control del panel; cada pestaña con el nombre del juego, su estado elegido y el panel que
      controla; en la ficha, los mismos roles, nombres, estados y paradas que la línea base
      (RF-13).
- [ ] Deslizadores e interruptor de coincidencias con teclado: en cada deslizador, partiendo de
      los valores anotados en la línea base, flechas, Inicio, Fin, Re Pág y Av Pág dejan el mismo
      valor que en ella; el valor visible y el nombre accesible cambian igual; el valor accesible
      es el número. En «Solo cuentas verificadas», Espacio y un clic en el texto cambian su estado.
      Con CS2 sin rango Premier propio, todos deshabilitados (RF-11).
- [ ] Sellos: al aparecer y al volver a estampar (por ejemplo, sumarse en la agenda, o guardar la
      ficha dos veces), la animación de estampar es la de la línea base; con movimiento reducido,
      como en la línea base. Solo el sello de la tarjeta de sesión se anuncia como estado; «Datos
      de demostración» y las etiquetas de origen, iguales a la línea base (RF-16, Q-14).
- [ ] Ventana de desvincular: título, mensaje y botones con los textos de RF-23; rol de ventana
      modal con su título como nombre accesible; foco en «Volver» al abrir; Tab sin salir;
      «Volver», Escape, botón de cerrar y pulsar fuera devuelven el foco a «Desvincular» de la
      fila sin enviar nada; doble clic en «Desvincular» de la ventana envía una sola petición (en
      la pestaña de red) y, mientras está en curso, foco en el título de la ventana y nada la
      cierra; con éxito, foco en «Cuentas vinculadas»; con 404, con el servidor detenido y sin
      respuesta en 30 s (perfil de red con más de 30 s de latencia), el mensaje dentro de la
      ventana, nada encima de la lista y el foco en «Desvincular»; con la cuenta desvinculada en
      otra pestaña y la lista vuelta a leer, cerrar sin enviar lleva el foco a «Cuentas
      vinculadas» (RF-23 a RF-25).
- [ ] En el árbol de accesibilidad del navegador, cada componente migrado tiene el mismo nombre,
      rol y estado que en la línea base, salvo las diferencias declaradas (en particular,
      «Solo cuentas verificadas» con rol de interruptor, Q2); ningún nombre ni texto en inglés
      (RF-8 a RF-19).
- [ ] Indicador de foco medido con las herramientas del navegador en el tema claro, en un botón,
      un chip, una pestaña, el panel de las pestañas, el interruptor, un deslizador, un botón
      dentro de una ventana y un título con foco por programa: al menos 3:1 contra el fondo sobre
      el que aparece. En los campos (una entrada de texto dentro de una ventana, una lista
      desplegable y un área de texto): el borde con foco medido contra el fondo del campo con
      foco y el halo contra la superficie que rodea al campo, los dos con al menos 3:1, tomando el
      color compuesto que se ve en pantalla cuando son translúcidos. En el tema oscuro, todo igual
      que en la línea base (RF-20).
- [ ] Indicador de foco de los elementos que no se migran, en el tema claro, a 1280 y a 375 px,
      medido con las herramientas del navegador en un enlace de texto, una sección de la barra de
      navegación (también la activa), el botón del menú y un enlace del menú móvil (a 375 px), el
      enlace de una celda del inicio, un bloque de la hoja semanal, un bloque de la hoja de horas
      (sin marcar y marcado), «Saltar al contenido» y un enlace de una visualización: mismo color
      que en los componentes migrados, al menos 3:1
      contra el fondo sobre el que aparece, y grosor y separación iguales a la línea base; en las
      capturas, ninguna otra diferencia en esos elementos. En el tema oscuro, igual que en la
      línea base (RF-4, RF-20).
- [ ] Contraste medido con las herramientas del navegador en cada componente migrado, en los dos
      temas y en sus estados: cumple RNF-3 (con sus excepciones); lo que no cumplía en la línea
      base no empeora.
- [ ] A 360 y 375 px, el ancho desplazable de cada vista no supera el de la línea base, también con
      las ventanas abiertas y un título de 60 caracteres sin espacios (RNF-4).
- [ ] Doble clic en cada botón de envío: una sola petición en la pestaña de red y «Enviando…»
      visible (RF-8). Límite de 60 y 160 caracteres Unicode al pegar y con composición (RF-9).
- [ ] «Atrás» y 401 con una ventana abierta: la ventana se cierra y la página se desplaza (RF-22).
- [ ] Lo mismo en modo simulado (RF-21).
- [ ] Construcción de producción con el procedimiento de la spec 010, sin variables nuevas: mismo
      aspecto que en desarrollo en las vistas de acceso, agenda y detalle (RNF-8). Tamaños de RNF-7
      anotados; la pantalla de acceso sigue sin descargar el código de las demás vistas.
- [ ] `npm test` del frontend en verde y sin `.only`, con las pruebas de RNF-6 (elección del tema
      inicial en sus seis casos y tema sin colores literales en sus dos variantes), sin
      dependencias de desarrollo nuevas, y evidencia de rojo antes del código y verde después en
      el registro de validación (RNF-6).
- [ ] Construcción, comprobación de tipos y lint del frontend en verde; sin `any` ni `@ts-ignore`
      nuevos (RNF-6).
- [ ] `AGENTS.md` (estructura y convenciones: la librería, su tema y que los tokens siguen siendo
      la única fuente de valores) y `MEMORY.md` actualizados en el cierre.

## Impacto en otras specs (sin editarlas desde esta spec)
- **Spec 016 (estado global), orden de implementación.** La 016 está aprobada y sin plan. Las dos
  tocan las mismas piezas: la página de la agenda (chips de filtro, botón «Anotar sesión», panel
  «Sesión abierta»/«Mis sesiones» con «Cargando…» y error con «Reintentar»), «Anotar una sesión»,
  «¿Cancelar esta sesión?», los estados de carga y error, los formularios de acceso y registro y
  el botón de cerrar sesión. Orden: **016 completa (implementada y validada) → 017 → 018**. Así la
  016 se valida contra la interfaz de hoy (su línea base son las specs 007 y 009), y esta spec
  toma como línea base la interfaz con la 016 hecha. Esta spec no cambia ningún comportamiento de
  la 016; RF-12, RF-14 y RF-17 lo conservan. La 016 dejó fuera de alcance la preferencia de tema
  («La spec 017 decide cómo la gestiona Mantine»): esta spec la mantiene en la misma entrada del
  navegador (RF-7), así que la lista de lo que la interfaz guarda (016, RF-19) no cambia. Esta
  spec usa el Vitest que instala la 016 (RNF-6, Q6). Las reglas de foco nuevas de «Anotar una
  sesión» (Q1, RF-12) no cambian ningún RF de la 016: se abre, se cierra y con qué valores sigue
  la 016 (RF-13, RF-15, RF-24, RF-28); el estado de carga y el error del panel no reciben ni
  mueven el foco (RF-25); y el título del panel, que esta spec usa como destino de reserva del
  foco, lo conserva aunque cambie su texto (RF-26). La 016 se valida con el foco de hoy de esa
  ventana (spec 009, R10), que esta spec cambia después. **Q8 cerrada con la opción A (cambia la
  016, RF-28 y RF-29):** con una ventana abierta en la agenda («¿Cancelar esta sesión?» o «Anotar
  una sesión»), la regla de la 016 (RF-29) da «esperar» (caso 5) para la propuesta que, sin
  ventana abierta, se aplicaría; al cerrarse esa ventana, la regla deja de dar «esperar» y la
  propuesta se aplica; si mientras espera se dan las condiciones de descarte de la 016, se
  descarta. El cambio es el CR-1 de la 016, **aprobado por el usuario el 2026-11-21**; esta spec
  fija solo el foco (RF-12).
- **Spec 018 (pruebas E2E).** Se escribe después de esta spec, contra la interfaz definitiva. Esta
  spec garantiza que los roles, nombres accesibles y textos de los controles no cambian (RF-8 a
  RF-19), salvo las diferencias declaradas de RNF-2, de modo que la 018 puede localizar los
  controles por rol y nombre. Se comunican al planificador de la 018: el rol de interruptor de
  «Solo cuentas verificadas» (Q2); el patrón de pestañas de perfil y coincidencias (Q3), con el
  panel como parada del recorrido con Tab en las tres vistas (H3); el foco de «Anotar una sesión»
  (Q1); la ventana de desvincular, que sustituye a la confirmación nativa del navegador (Q4: las
  pruebas ya no aceptan un diálogo del navegador, sino que pulsan «Desvincular» o «Volver» en la
  ventana); y que el nombre accesible de cada deslizador incluye su valor y cambia con él (RF-11),
  así que una prueba que lo localice por nombre debe tenerlo en cuenta.
- **Spec 009.** RNF-1 («Usa los componentes, tokens de diseño y patrones existentes») sigue valiendo
  con los componentes migrados, que usan los mismos tokens. **Q1 cerrada con la opción A:** esta
  spec sustituye la R10 de la 009 (RF-23 y RF-24: «El formulario de creación… conserva su
  comportamiento de foco de hoy») por las reglas de foco de RF-12 de esta spec; prevalece esta
  spec, por posterior y por decisión del usuario. No cambian las reglas del título y de las notas
  del formulario (RF-24 de la 009) ni las de la ventana de cancelar (RF-19, RF-23 y RNF-2 de la
  009), que esta spec conserva (RF-12) y reutiliza en la ventana de desvincular (RF-24, RF-25). La
  009 no se edita.
- **Spec 008.** RNF-2 (pestañas accesibles) se mantiene en la ficha sin cambios. **Q3 cerrada con
  la opción A:** el mismo patrón pasa a las pestañas de juego de perfil y coincidencias (RF-13):
  es una ampliación, no un cambio, de la 008, que solo define la ficha. La 008 no se edita.
- **Spec 007.** RNF-4 (sin cambios de disposición) y RNF-7 (foco en «Reintentar» y anuncios) se
  mantienen (RF-15, RF-17). Las pestañas de juego de perfil y coincidencias son de las vistas que
  conectó la 007; esta spec no encontró en ella un requisito que fije su manejo con teclado. El
  cambio de Q3 es de teclado, roles y orden de tabulación, no de disposición, así que no choca
  con RNF-4; si la revisión encuentra un requisito de la 007 que lo fije, prevalece esta spec
  (posterior y decisión del usuario). En desvincular (Q4), se conservan los mensajes de error de
  RF-9, el plazo, «Enviando…» y la guarda contra el doble envío de RF-20, y el 401 de RF-7; cambia
  solo dónde se confirma (la ventana en lugar del diálogo nativo) y dónde se ve el error de esa
  escritura (dentro de la ventana en lugar de encima de la lista, P8). La 007 no se edita.
- **Spec 004 (cuentas de juego).** Desvincular sigue siendo la misma operación del servidor, con
  las mismas respuestas (por ejemplo, 403 y 404): Q4 cambia solo la confirmación en la interfaz
  (RF-23 a RF-25). Ningún requisito de la 004 cambia y la 004 no se edita.
- **Specs 012 a 015.** La etiqueta de origen de cada bloque de datos (012, RF-6) y «Datos de
  demostración» no se migran (Q-14, H6). Los botones de verificación con Steam y con Riot y los
  avisos de la 015 migran (M1, M13) sin cambiar textos ni atribuciones; los logos de Leetify,
  Steam y Riot no se tocan (Q-8).
- **`AGENTS.md`.** Su línea del stack del frontend y la convención de estilos se actualizan en el
  cierre (criterio de finalización). La convención «ningún color escrito a mano» se mantiene.
- **Constitución.** Sin enmienda: la librería es una dependencia nueva justificada por esta spec
  con versión exacta (principio 1).

## Decisiones
Del usuario (2026-11-21, transmitidas por el coordinador):
- **D1. Librería → Mantine.** Descartadas: Material UI, React-Bootstrap y Chakra.
- **D2. Alcance → componentes base con un tema construido a partir de los tokens actuales**, para
  que el aspecto cambie lo menos posible, sin rehacer las vistas. Reflejada en el inventario,
  RF-1 a RF-4 y «Fuera de alcance».
- **D3. Pruebas del frontend → Vitest** (constitución, principios 1 y 4; spec 016). Reflejada en
  RNF-6 y Q6.
- **D4. Orden → 016, 017, 018** (la 018 al final, para probar la interfaz definitiva). Reflejada en
  «Impacto».

Respuestas del usuario a las dudas Q1 a Q7 (2026-11-21, transmitidas por el coordinador):
- **Q1 → A (recomendada). Foco estándar de ventana modal en «Anotar una sesión».** Al abrir, foco
  en «Título»; Tab y Mayús+Tab no salen de la ventana; con el envío deshabilitado, foco en su
  título; al cerrar, foco al control que la abrió. Sustituye la R10 de la spec 009. Reflejada en
  Definiciones («Título con foco por programa»), M10, RF-12, RF-20, RNF-2 (punto 2), casos límite,
  criterios de finalización e «Impacto» (specs 009 y 016). Descartada: B (conservar el foco de
  hoy, sin entrar en la ventana ni retenerlo).
- **Q2 → A (recomendada). «Solo cuentas verificadas» se anuncia como interruptor**, con el mismo
  nombre y estado. Reflejada en M8, RF-11, RNF-2 (punto 3), casos límite y criterios. Descartada: B
  (anuncio de casilla de verificación con aspecto de interruptor).
- **Q3 → A (recomendada). Patrón accesible de la ficha en las pestañas de juego de perfil y
  coincidencias**: una sola parada con Tab, flechas, Inicio y Fin, y cada pestaña asociada a su
  panel. Reflejada en M11, RF-13, RF-20, RNF-2 (punto 4), casos límite, criterios e «Impacto»
  (specs 007, 008 y 018). Descartada: B (conservar en perfil y coincidencias una parada por
  pestaña y las flechas sin efecto).
- **Q4 → B (el usuario no eligió la opción recomendada, que era A: dejar la confirmación nativa).**
  La confirmación nativa al desvincular una cuenta pasa a una ventana de la librería con
  «Desvincular» y «Volver», con las reglas de foco y de bloqueo de la ventana de cancelar sesión
  (spec 009). El texto es el de la confirmación de hoy, partido en título y mensaje, sin palabras
  nuevas. Reflejada en HU-6, Definiciones, M16 (sale de «Se quedan», Q-12), RF-19, RF-21, RF-22,
  RF-23 a RF-25, RNF-2 (punto 5), RNF-4, casos límite, «Fuera de alcance», criterios e «Impacto»
  (specs 004, 007 y 018). Descartada: A.
- **Q5 → A (recomendada). Indicador de foco del tema claro con un tono del acento de al menos
  3:1**, tomado de los tokens (con un token nuevo del tema claro si ninguno cumple); en el oscuro
  no cambia. Alcanza a los componentes migrados y a los títulos con foco por programa; Q7 lo
  extiende a los demás elementos que no se migran. Reflejada en RF-4, RF-20, RNF-2 (punto 6),
  casos límite, «Fuera de alcance» y criterios. Descartada: B (volt de hoy en los dos temas).
- **Q6 → A (recomendada). Vitest solo para reglas puras en Node, sin dependencias nuevas**: la
  elección del tema inicial y que el tema no tenga colores literales. Reflejada en RNF-1, RNF-6,
  «Fuera de alcance» y criterios. Descartada: B (pruebas de componentes con un DOM simulado y
  dependencias de desarrollo nuevas).
- **Q7 → A (recomendada). Un único indicador de foco en toda la página.** En el tema claro, el
  tono del acento de Q5 se usa también en el indicador de foco de los elementos que no se migran:
  enlaces de texto, barra de navegación y menú móvil, hoja semanal, hoja de horas, «Saltar al
  contenido» y enlaces de las visualizaciones. Solo cambia el color; grosor y separación se
  conservan; en el tema oscuro no cambia. Reflejada en el inventario (nota de «Se quedan como
  están»), RF-4, RF-20, RNF-2 (punto 6), casos límite, «Fuera de alcance» y criterios (a 1280 y
  375 px en tema claro). Descartada: B (el tono nuevo solo en los componentes migrados y en los
  títulos con foco por programa, con dos colores de indicador en el tema claro).

Respuesta del usuario a la duda Q8 (2026-11-21, transmitida por el coordinador):
- **Q8 → A (recomendada). Nunca dos ventanas a la vez en la agenda.** Si una propuesta de
  «Proponer» que, sin ventana abierta, se aplicaría (spec 016, RF-29, caso 6) llega a ese punto
  mientras hay otra ventana abierta en la agenda (por ejemplo, «¿Cancelar esta sesión?»), la
  regla de la 016 da «esperar» (caso 5): la propuesta queda pendiente y se aplica (se abre
  «Anotar una sesión» con ella) cuando esa ventana se cierra y la regla deja de dar «esperar». Cerrarla confirmando la
  cancelación (204) no cambia nada: la propuesta se aplica igual al cerrarse. Si mientras espera
  ocurre algo que en la 016 descarta la propuesta (salir de la agenda, recargar, 401 u otra
  condición de descarte), se aplica la regla de la 016 y no se abre nada. Al abrirse, foco en
  «Título»; al cerrarse, foco en «Anotar sesión» (P6). «Anotar una sesión» abierta también cuenta
  como ventana que hace esperar (lectura literal de «nunca hay dos ventanas», del planificador,
  **confirmada por el usuario el 2026-11-21**: «esperar y reabrir»): si la propuesta se aplicaría
  con «Anotar una sesión» abierta por el propio jugador, la regla da «esperar», el formulario
  abierto no cambia y, al cerrarse por cualquier camino (también tras crear una sesión de juego),
  se abre otra vez «Anotar una sesión» con la propuesta. Cambia la 016 (RF-28 y RF-29, su CR-1,
  aprobado por el usuario el 2026-11-21). Reflejada en
  RF-12, casos límite, criterios e «Impacto» (spec 016). Descartadas: B (descartar la propuesta
  sin aviso si llega a «aplicar» con una ventana abierta) y C (abrir «Anotar una sesión» y cerrar
  antes la otra ventana, que el jugador pierde).

Decisiones del usuario sobre los hallazgos de la primera revisión QA (2026-11-21, transmitidas por
el coordinador):
- **H1 (bloqueante) → tokens nuevos con los mismos valores.** Los colores escritos a mano en los
  componentes a migrar (sombra del botón primario, borde del botón de peligro con el puntero
  encima, círculo del icono del botón grande, borde del aviso de error, bordes de los sellos
  correcto, advertencia y peligro (este último salió del alcance tras N7: ningún sello lo usa),
  texto, punto y sombra de la pestaña elegida) y la tinta del
  catálogo de juegos pasan a tokens nuevos con exactamente los valores de hoy, sin cambio visual.
  El tema y los componentes migrados solo usan tokens. En pestañas y chips manda la tinta del
  catálogo, que es la que se ve hoy; las tintas de juego de los tokens no cambian y no se
  unifican. Reflejada en «Contexto», Definiciones, RF-2, casos límite, «Fuera de alcance» y
  criterios.
- **H2 → reforzar el borde y el halo de los campos.** Los campos conservan su forma propia de
  indicador de foco (borde y halo), con colores del mismo tono del acento del tema claro que
  llegan a 3:1; en el oscuro no cambia. Es la segunda forma declarada de indicador de foco,
  compatible con Q7. Reflejada en RF-20, RNF-2 (punto 6), casos límite, «Fuera de alcance» y
  criterios (cómo se mide el 3:1 en un campo). El planificador resolvió además qué cuenta como
  indicador de foco: los enlaces de las celdas del inicio, el panel de las pestañas y el botón
  del menú sí (entran en RF-20); el número iluminado del paso de «Anotar una sesión», no (P11).
- **H3 → el panel es parada de Tab en las tres vistas.** En la ficha, el perfil y coincidencias,
  tras la pestaña elegida el panel es una parada del recorrido con Tab con su indicador de foco,
  como hoy en la ficha. Reflejada en RF-13, RF-20, RNF-2 (punto 4), casos límite, criterios e
  «Impacto» (spec 018).
- **H6 → «Datos de demostración» y la etiqueta de origen se quedan como están.** Salen de M14 y
  pasan a «Se quedan» (Q-14): son texto con aspecto propio y la atribución de origen de la
  constitución (principio 5) y de la spec 012. Reflejada en el inventario, RF-4, RF-16, criterios
  e «Impacto» (specs 012 a 015).

Aprobación del usuario (2026-11-21, transmitida por el coordinador): acepta P1 a P11 y aprueba la
spec una vez corregidos los hallazgos N1 a N8 de la segunda revisión QA, sin otra revisión. Las
correcciones son aclaraciones que no cambian ninguna decisión: N1, palabras clave que no son
colores literales (Definiciones, RF-2, RNF-6, criterios); N2, enlaces con aspecto de botón en
coincidencias y en la ficha (M2); N3, pulsar fuera con la escritura en curso (RF-6, casos
límite); N4, color del indicador de «Leyendo…»/«Cargando…» (RF-17, criterios, notas); N5, términos
del CR-1 de la 016 (RF-12, casos límite, Q8, «Impacto»); N6, borde del chip pulsado (RF-2, RF-14,
casos límite, criterios); N7, tono «peligro» de los sellos fuera de alcance (M14, RF-2, «Fuera de
alcance»); N8, propuestas aceptadas y RNF-2 cerrada.

Propuestas del planificador P1 a P11, **aceptadas por el usuario el 2026-11-21** (transmitido por el
coordinador) al aprobar la spec:
- **P1. Listas desplegables nativas.** M7 conserva el comportamiento de la lista nativa del
  navegador (teclado, selector del sistema en móvil, lectores de pantalla), con el aspecto del
  tema. Descartada: la lista desplegable con buscador de la librería, que cambia el manejo con
  teclado y el anuncio a lectores de pantalla, contra RNF-2.
- **P2. Sin modo «automático» del tema.** El tema solo cambia con el botón; la preferencia del
  sistema solo cuenta al cargar sin preferencia guardada (RF-7), como hoy. Descartado: seguir en
  vivo los cambios del sistema, que sería una diferencia no pedida.
- **P3. «Enviando…» siempre visible.** El indicador de envío acompaña al texto «Enviando…» y no lo
  sustituye (RF-8). Descartado: el estado de carga propio de los botones de la librería, que oculta
  el texto del botón.
- **P4. Los paneles no se migran** (Q-2): su bisel, filo volt y borde bajo el cursor son parte del
  mundo visual, no un control. Descartado: pasarlos a la superficie de la librería, que obligaría a
  rehacer el aspecto de todas las vistas (contra D2). Vale también para las ventanas (M10, M16):
  la librería aporta su comportamiento (capa, fondo, retención del foco, Escape, bloqueo del
  desplazamiento), pero su superficie conserva el aspecto de panel con bisel y filo volt de hoy;
  no se usa la superficie propia de la ventana de la librería.
- **P5. Línea base tras la 016.** La comparación visual se hace contra la interfaz con la 016 ya
  implementada, no contra la de hoy (criterios de finalización), para no confundir los cambios de
  la 016 con regresiones de esta spec.
- **P6. «Anotar una sesión» abierta por una propuesta: el foco vuelve a «Anotar sesión».** Una
  propuesta de «Proponer» (spec 016, RF-28) abre la ventana sin que el jugador pulse ningún
  control de la agenda, así que al cerrarla el foco va a «Anotar sesión» de la cabecera, el
  control que abre el mismo formulario (RF-12). Descartado: llevarlo al título del panel de la
  agenda, que queda como reserva solo si «Anotar sesión» no puede recibir el foco.
- **P7. Tras desvincular, el foco va al título «Cuentas vinculadas».** El botón que abrió la
  ventana desaparece con la cuenta; el título de la sección es un destino estable que existe
  también cuando la lista queda vacía, como el título del panel de la agenda tras cancelar (spec
  009). Se usa también como reserva cuando la fila ya no existe al cerrar sin enviar (RF-24,
  RF-25). Descartado: llevar el foco al «Desvincular» de la fila siguiente, que no siempre existe
  y que dejaría el foco sobre otra acción destructiva.
- **P8. El error de la desvinculación se muestra dentro de la ventana.** Como en la ventana de
  cancelar sesión (spec 009, RF-23: tras un error el foco vuelve a «Sí, cancelar sesión»), la
  ventana sigue abierta con el mensaje y el foco en «Desvincular», para reintentar o volver sin
  buscar el aviso detrás (RF-25). Descartado: cerrar la ventana y mostrar el error encima de la
  lista como hoy, que obligaría a otra regla de foco y separaría el error de la acción.
- **P9. La página no se corre al abrir una ventana** (hallazgo 13 de la revisión QA). Hoy el
  bloqueo del desplazamiento solo oculta el desbordamiento del cuerpo, y en los navegadores con
  barra de desplazamiento que ocupa sitio el contenido salta hacia el lado el ancho de la barra;
  la librería compensa ese ancho. Se acepta como diferencia declarada (RNF-2, punto 7), porque es
  una mejora visible pequeña y conservar el salto obligaría a desactivar una parte del
  comportamiento estándar de la ventana. Descartado: conservar el salto de hoy.
- **P10. «Actualizando» migra con los estados (M15)** (hallazgo 14). Usa el mismo indicador que el
  de envío dentro de los botones, que migra; dejarlo a mano tendría dos indicadores distintos.
  Conserva su etiqueta sin rol, su tamaño y el color con que se ve hoy (RF-17). Descartado:
  dejarlo en «Se quedan».
- **P11. El número iluminado del paso de «Anotar una sesión» no es un indicador de foco**
  (decisión H2). Se enciende con cualquier foco dentro del paso, también con el ratón, y
  acompaña al indicador propio del campo; es un adorno del paso, así que se queda en volt en los
  dos temas. Descartado: pasarlo al tono del acento del tema claro, que cambiaría un adorno sin
  mejorar la visibilidad del foco.

## Notas para el plan (no son requisitos)
- El chip de la librería es una casilla o un botón de opción, no un botón con estado pulsado: los
  chips de filtro (M12) serán un botón de la librería con su estado pulsado, para conservar el
  rol de hoy (RF-14).
- La ventana modal de la librería liga por defecto su cuerpo como descripción accesible: hay que
  quitarlo en «Anotar una sesión» y «¿Cancelar esta sesión?» (RF-12) y ligar solo el mensaje en la
  ventana de desvincular (RF-23). También devuelve el foco por su cuenta al cerrar, lo que no debe
  contradecir RF-12 ni RF-24.
- El anillo de foco de la librería separa 2 px del control; hoy la separación es de 3 px (y de 4
  px en las celdas del inicio, y hacia dentro en el panel de las pestañas). RF-20 exige la de hoy.
- Los estilos globales de la librería fijan el fondo, el color y la tipografía del cuerpo: deben
  cargarse antes de la hoja global o importarse por partes, para no cambiar la página (RF-4).
- El gestor del esquema de color de la librería sigue por defecto los cambios del almacenamiento
  entre pestañas; hay que evitarlo (RF-7). Su marca de esquema debe salir de la misma decisión que
  la marca de tema de la hoja global, antes de la primera pintura (RF-5, RNF-6).
- El deslizador de la librería no responde a Re Pág ni a Av Pág; el plan decide cómo conservarlos
  (RF-11). El interruptor de la librería ya se anuncia como interruptor (Q2).
- Hoy el deshabilitado de los botones es una opacidad; la librería trae colores propios para el
  deshabilitado, que deben salir de tokens y verse como hoy (RF-2, RF-3).
- El indicador «Actualizando» y el indicador giratorio de «Leyendo…»/«Cargando…» (el estado de
  carga compartido, que pide `var(--pen)`) piden hoy un color que no corresponde a ningún token, así que
  el navegador les aplica el que heredan del texto que los rodea; la línea base anota esos colores
  y el plan elige el token que da cada uno (RF-17).
- Los tokens de la tinta del catálogo (RF-2) hacen que añadir un juego al catálogo pida también su
  token; el plan decide cómo se enlazan el catálogo y esos tokens.

## Dudas abiertas
Ninguna. Q1 a Q8 cerradas y P1 a P11 aceptadas por el usuario el 2026-11-21 (ver «Decisiones»).
