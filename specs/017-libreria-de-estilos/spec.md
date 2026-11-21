# Spec 017 — Librería de estilos (Mantine) en los componentes base
Estado: borrador (2026-11-21). Dudas Q1 a Q6 cerradas por el usuario el 2026-11-21 (ver
«Decisiones»); al cerrarlas surgió la duda Q7, abierta (ver «Dudas abiertas»). Pendiente de la
revisión QA y de la aprobación del usuario. No pasa a plan hasta entonces.

## Contexto y objetivo
El enunciado del último hito pide completar la aplicación como una «SPA de producción» con
«diseño visual consistente», y su punto 4 exige: «Diseño y Estilo: Incorporar una librería de
estilos (Material UI, React-Bootstrap, Chakra, Mantine, etc.)» (texto íntegro en el apéndice A
de la spec 016). El resto del enunciado va en otras specs: estado global en la 016, pruebas E2E
en la 018 y el despliegue real en la 010 (T9, lo hace el usuario).

Hoy la interfaz no usa ninguna librería de estilos. Cada control (botón, campo, lista
desplegable, interruptor, deslizador, ventana, pestañas, aviso, sello) está hecho a mano con
marcado propio y clases de la hoja de estilos global, y todos los colores salen de los tokens de
diseño (`AGENTS.md`: «Estilos solo desde `styles/tokens.css`; ningún color escrito a mano»). No
hay un componente de botón: cada vista escribe sus botones con las mismas clases.

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
  límite de caracteres del formulario de creación y contraste), specs 013 a 015 (botones de
  verificación y atribuciones, que deben seguir viéndose igual).
- Origen: enunciado del último hito, punto 4 y párrafo inicial («diseño visual consistente»).
  Decisiones del usuario del 2026-11-21: Mantine; alcance por defecto (componentes base con un
  tema hecho de los tokens, sin rehacer vistas); pruebas del frontend con Vitest (constitución,
  principios 1 y 4, enmendados); orden 016 → 017 → 018; y las respuestas a Q1 a Q6
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
  y siguen siendo la única fuente de esos valores (`AGENTS.md`).
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
  «Anotar una sesión» (RF-12), el título de la ventana de desvincular y el título de la sección
  «Cuentas vinculadas» (RF-25).
- **Ventana de desvincular**: la ventana que sustituye a la confirmación nativa del navegador al
  desvincular una cuenta (M16; RF-23 a RF-25).

### Inventario de componentes
Recogido del código actual (2026-11-21). La columna «Dónde» es orientativa: el plan confirma la
lista completa de usos.

#### Se migran (componentes base)
| # | Componente | Dónde aparece hoy | Qué se conserva (además de RF-2 y RF-3) |
| --- | --- | --- | --- |
| M1 | **Botones** con texto, en todas sus variantes: primario (volt), normal, discreto y de peligro; tamaños pequeño, normal, grande y a todo el ancho; con icono, con indicador de envío y «Enviando…» | Todas las vistas: acceso, registro, inicio, perfil, configuración, coincidencias, agenda, detalle, ficha, verificación con Steam y Riot, entrada, «no encontrada», menú móvil, ventanas | Forma de píldora, variantes por color, deshabilitado frente a bloqueado, texto visible «Enviando…» con su indicador (RF-8) |
| M2 | **Enlaces con aspecto de botón** (por ejemplo, «Ir a la agenda», «Ver detalle», «Proponer» cuando es enlace) | Agenda, detalle, coincidencias, ficha, entrada | Siguen siendo enlaces (rol de enlace y navegación sin recargar), con el aspecto de M1 |
| M3 | **Botones de icono** sin texto: cambiar tema, cerrar sesión de la barra, cerrar de las ventanas | Barra de navegación, ventanas | Nombre accesible y título emergente actuales (RF-18) |
| M4 | **Campo de texto** con etiqueta, error, pista y límite de caracteres Unicode | Acceso, registro, configuración («Nombre visible»), vincular cuenta, «Anotar una sesión», edición del detalle, verificación con Riot si lo usa | Etiqueta asociada, error anunciado, límite de caracteres Unicode y escritura con composición (RF-9) |
| M5 | **Área de texto** («Notas», «Cómo juegas») con contador o límite | «Anotar una sesión», edición del detalle, configuración | Límite (200 caracteres en «Cómo juegas»; 160 caracteres Unicode en las notas, spec 009, RF-24), contador visible, cambio de alto manual |
| M6 | **Campo de búsqueda** con icono («Buscar jugador») | Coincidencias | Tipo búsqueda, icono, deshabilitado sin rango Premier (spec 015, RF-10) |
| M7 | **Listas desplegables** («Juego», «Día», «Hora de inicio», «Duración (horas)», «Cupos», «Región» y las de la edición del detalle) | «Anotar una sesión», edición del detalle, vincular cuenta | Mismas opciones, orden y valores; comportamiento de lista nativa del navegador (decisión P1) |
| M8 | **Interruptor** «Solo cuentas verificadas» | Coincidencias | Aspecto de interruptor; pasa a anunciarse como interruptor (Q2, RF-11) |
| M9 | **Deslizadores** «Diferencia máxima de rango» y «Horas en común por semana» | Coincidencias | Mínimo, máximo, paso, valor visible junto a la etiqueta, pista rellena hasta el valor, teclado |
| M10 | **Ventanas modales**: «Anotar una sesión» y «¿Cancelar esta sesión?» (agenda y detalle) | Agenda, detalle | Todas las reglas de la spec 009 (RF-19, RF-23, RNF-2) y de la 016 (RF-13, RF-15, RF-24); «Anotar una sesión» pasa al foco estándar de ventana modal (Q1, RF-12) |
| M11 | **Pestañas de juego** con la píldora que se desliza y toma la tinta del juego | Perfil, coincidencias, ficha de jugador | Patrón de pestañas de la spec 008 (RNF-2), que pasa también a perfil y coincidencias (Q3, RF-13) |
| M12 | **Chips de filtro** de juego («Todos los juegos» y un chip por juego) con estado pulsado | Agenda (y cualquier otra vista que los use) | Son botones con estado pulsado, uno solo pulsado a la vez (spec 016, RF-11) (RF-14) |
| M13 | **Avisos** en línea: de error, informativo (volt) y neutro, con su icono; incluye el aviso de error de las escrituras | Todas las vistas con formularios o escrituras | Rol de cada aviso tal como está hoy: de alerta, de estado o ninguno (RF-15) |
| M14 | **Sellos** (insignias) con su tono: sellado, volt, correcto, advertencia, peligro y neutro; incluye la etiqueta «Datos de demostración» | Perfil, configuración, coincidencias, agenda, detalle, ficha, barra y pie | Forma de píldora, punto luminoso, mayúsculas monoespaciadas, animación de «estampar» al aparecer, rol de estado cuando anuncia (RF-16) |
| M15 | **Estados**: esqueleto de carga, «Leyendo…»/«Cargando…» con indicador, indicador de envío dentro de los botones | Todas las vistas | Esqueleto oculto a lectores de pantalla; indicador con rol de estado; textos actuales (RF-17) |
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

## Requisitos funcionales

### Librería y tema
- RF-1: EL SISTEMA dibuja cada componente de la tabla «Se migran» (M1 a M16), en todas las vistas
  donde aparece, con componentes de la librería configurados por un único tema para toda la
  aplicación. Ninguna vista conserva una versión hecha a mano de un componente migrado.
- RF-2: EL SISTEMA toma todo color, radio, tipografía, espaciado, sombra y duración de los
  componentes migrados de los tokens de diseño, en el tema claro y en el oscuro. Ni el tema ni
  los componentes migrados escriben un color literal: cambiar el valor de un token cambia, sin
  recargar, todo componente migrado que lo usa (comprobable cambiando un token en las
  herramientas del navegador). Los tokens de diseño siguen siendo la única fuente de esos valores.
- RF-3: EL SISTEMA conserva el aspecto de cada componente migrado en cada uno de sus estados y en
  los dos temas. Comprobable contra la línea base, en reposo, con estos valores calculados por el
  navegador:
  - color de fondo, color del texto, color y grosor del borde y radio de las esquinas: iguales
    (mismo token);
  - familia, tamaño y peso de la letra: iguales;
  - alto mínimo y relleno: con una diferencia de 2 px como máximo.
  Y, en las capturas de puntero encima, foco por teclado, pulsado, deshabilitado, bloqueado y con
  error, ninguna diferencia visible salvo las declaradas (RNF-2). Se mantiene la regla de forma de
  los tokens: píldora completa en botones, chips y sellos; radio de campos en campos y listas;
  radio de panel en las ventanas.
- RF-4: EL SISTEMA no cambia el aspecto de los componentes que se quedan (Q-1 a Q-11 y Q-13) ni
  de la página: los estilos globales que trae la librería no alteran la tipografía de la página,
  el fondo, la luz ambiental, el grano, las barras de desplazamiento, la selección de texto, los
  enlaces de texto, los titulares ni el indicador de foco de los elementos que no se migran. Única
  excepción: el indicador de foco del tema claro en los títulos con foco por programa (RF-20, Q5),
  más lo que decida Q7 sobre los demás elementos que no se migran.

### Tema claro y oscuro
- RF-5: CUANDO la aplicación se carga o se recarga, EL SISTEMA pinta desde la primera pintura toda
  la página, también los componentes migrados, con el tema que corresponde: la preferencia de tema
  guardada o, si no hay una válida, la del sistema operativo en ese momento. No se ve en ningún
  momento el otro tema ni componentes sin estilo.
- RF-6: CUANDO el jugador pulsa el botón de cambiar tema, EL SISTEMA cambia a la vez toda la
  página y todos los componentes migrados, también los que estén dentro de una ventana abierta,
  como hoy:
  - con la transición en círculo que nace en el botón, si el navegador la admite y el jugador no
    pidió movimiento reducido; si no, en el acto;
  - con el color de la barra del navegador (en móvil) del tema nuevo;
  - con el logo de Leetify de ese tema (spec 015, RNF-8);
  - con el nombre accesible y el título del botón actualizados («Cambiar a tema claro» o «Cambiar
    a tema oscuro»).
  En ningún momento hay componentes migrados en un tema y el resto de la página en el otro.
- RF-7: EL SISTEMA guarda la preferencia de tema en la misma única entrada del navegador que hoy,
  con los mismos valores, y no crea ninguna entrada nueva para el tema (spec 016, RF-19). Una
  preferencia guardada antes de esta spec se respeta tras ella. SI el almacenamiento del navegador
  no está disponible, ENTONCES EL SISTEMA cambia de tema igual y la elección dura hasta recargar,
  como hoy. SI la entrada guardada tiene un valor que no es «claro» ni «oscuro», ENTONCES EL
  SISTEMA usa la preferencia del sistema operativo. MIENTRAS la página está abierta, EL SISTEMA no
  cambia de tema por un cambio de la preferencia del sistema operativo: solo lo cambia el botón,
  como hoy.

### Comportamiento de los componentes migrados
- RF-8 (botones, M1 a M3): EL SISTEMA conserva en cada botón migrado:
  - su tipo (envía el formulario o no) y su texto o nombre accesible;
  - la distinción entre deshabilitado y bloqueado (Definiciones), en cada sitio donde hoy se usa
    una u otra: un botón bloqueado sigue recibiendo el foco, se anuncia como no disponible y
    activarlo no hace nada (spec 009, RF-11, RF-23, Definiciones; spec 007, «Reintentar» en curso);
  - mientras una escritura está en curso, el texto visible «Enviando…» junto a su indicador, en el
    lugar del texto del botón, como hoy (spec 007, RF-20): el indicador no sustituye ni oculta el
    texto;
  - las guardas contra el doble envío (spec 007, RF-20): un doble clic sigue enviando una sola
    petición;
  - en los enlaces con aspecto de botón (M2), el rol de enlace y la navegación sin recargar.
- RF-9 (campos, M4 a M6): EL SISTEMA conserva en cada campo migrado:
  - la etiqueta visible asociada al campo, que es su nombre accesible;
  - el error: visible bajo el campo con su icono, anunciado al aparecer, con el campo marcado como
    no válido y descrito por ese error; sin error, descrito por la pista si la tiene;
  - el límite de caracteres Unicode donde lo hay (spec 009, RF-24: «Título» 60, «Notas» 160; un
    emoji cuenta 1), también al pegar y al escribir con composición (teclados de acentos o de
    idiomas asiáticos), y el límite de 200 de «Cómo juegas» con su contador «n/200 caracteres»;
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
  - en los deslizadores: el nombre accesible igual a su etiqueta, mínimo, máximo y paso actuales
    (0 a 50 de 5 en 5; 0 a 12 de 1 en 1), el valor visible junto a la etiqueta («n pts», «n h»)
    que cambia mientras se arrastra, el manejo con flechas, Inicio y Fin, y que el filtro se
    aplica sin recargar, como hoy.
- RF-12 (ventanas, M10): EL SISTEMA conserva en «Anotar una sesión» y «¿Cancelar esta sesión?»:
  - rol de ventana modal con su título como nombre accesible y la referencia del bloque («lun
    20:00») en «Anotar una sesión»;
  - que Escape, el botón de cerrar y pulsar fuera la cierran, salvo mientras la cancelación está
    en curso (spec 009, RF-23), y que pulsar fuera no deja el foco en el cuerpo de la página;
  - que la página de detrás no se desplaza mientras la ventana está abierta y vuelve a
    desplazarse en cuanto se cierra, por cualquier camino (casos límite);
  - la entrada con resorte desde abajo y el fondo desenfocado, salvo con movimiento reducido;
  - en «¿Cancelar esta sesión?», todas las reglas de foco de la spec 009 (RF-19, RF-23 y RNF-2,
    puntos a y d y casos 6 y 14): foco inicial en «Volver»; Tab y Mayús+Tab sin salir de la
    ventana, también con la cancelación en curso; foco al título de la ventana cuando «Sí,
    cancelar sesión» pasa a deshabilitado; al cerrar, foco al botón «Cancelar sesión» que la abrió
    o, si ya no existe, al título del panel de la agenda o al mensaje de la zona de acciones del
    detalle; tras un error, foco de vuelta a «Sí, cancelar sesión». Ningún comportamiento propio
    de la librería (por ejemplo, devolver el foco por su cuenta al cerrar) puede contradecir esas
    reglas;
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
  - CUANDO, tras volver el foco a un bloque de la semana, la lista nueva de la agenda llega y la
    semana deja de mostrar ese bloque (por ejemplo, porque muestra el error de la lista), EL
    SISTEMA lleva el foco al título del panel de la agenda; el foco nunca queda en el cuerpo de la
    página.
  - SI se cierra porque la vista cambia (RF-22; spec 016, RF-15), ENTONCES EL SISTEMA no devuelve
    el foco a ningún control de la agenda.
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
    comportamiento en la primera y en la última pestaña que la ficha hoy. En perfil y
    coincidencias es una diferencia declarada (Q3, RNF-2): hoy cada pestaña es una parada del
    recorrido con Tab y las flechas no hacen nada.
- RF-14 (chips de filtro, M12): EL SISTEMA conserva cada chip como botón con estado pulsado, con
  un único chip pulsado a la vez, el punto de color del juego y el tinte del chip pulsado (spec
  016, RF-11).
- RF-15 (avisos, M13): EL SISTEMA conserva el rol de cada aviso tal como está hoy en cada lugar:
  los avisos de error y los de login (spec 007, RNF-7) se anuncian como alerta; el aviso de la
  resincronización se anuncia como estado; los avisos que hoy no tienen rol siguen sin él. Un
  aviso migrado nunca se anuncia dos veces ni con un rol distinto del de hoy. El aviso de error de
  una escritura sigue sin mostrarse si la respuesta llega tras limpiar la sesión del cliente (spec
  007).
- RF-16 (sellos, M14): EL SISTEMA conserva el texto, el tono, el título emergente donde lo hay, la
  animación de «estampar» al aparecer y al volver a estampar (sin animación con movimiento
  reducido) y el rol de estado de los sellos que anuncian un resultado (por ejemplo, «Guardado»).
  La etiqueta «Datos de demostración» se sigue viendo donde se ve hoy (barra a partir de 1140 px y
  pie; spec 007, R24) y con el mismo texto.
- RF-17 (estados, M15): EL SISTEMA conserva el esqueleto de carga oculto a los lectores de
  pantalla; el indicador de carga con rol de estado y sus textos («Leyendo…», «Cargando…»); en el
  error de lectura, el foco en «Reintentar» al mostrarse cuando hoy se lleva allí (spec 007,
  RNF-7, y spec 016, RF-2) y «Reintentar» bloqueado mientras su lectura está en curso (spec 009,
  RF-13); y los estados del panel de la agenda que fija la spec 016 (RF-25: «Cargando…» anunciado
  como estado y el error con «Reintentar», sin tomar el foco).
- RF-18 (botones de icono, M3): EL SISTEMA conserva su nombre accesible y su título emergente
  actuales: «Cambiar a tema claro»/«Cambiar a tema oscuro», «Cerrar sesión» (o «Enviando…» mientras
  cierra) y «Cerrar» en las ventanas, y el giro del icono al cambiar de tema.

### Comunes
- RF-19: EL SISTEMA no cambia ningún texto de la interfaz (etiquetas, botones, avisos, errores,
  títulos, textos de ejemplo, nombres accesibles y títulos emergentes), salvo los de la ventana de
  desvincular, que fija RF-23 (Q4). SI un componente de la
  librería trae un texto propio visible o anunciado (por ejemplo, un nombre accesible en inglés
  para cerrar o para cargar), ENTONCES EL SISTEMA lo sustituye por el texto en español de hoy o lo
  quita si hoy no existe: la interfaz sigue entera en español (constitución, principio 6).
- RF-20: EL SISTEMA conserva en cada vista el orden de tabulación de hoy, salvo lo que cambian
  las pestañas de perfil y coincidencias (RF-13) y las ventanas (RF-12, RF-24), y muestra el
  indicador de foco en todo componente migrado al recibir el foco por teclado y en todo título con
  foco por programa (spec 009, RNF-2; spec 016, RF-25 y RF-26; RF-12 y RF-25 de esta spec):
  - en el tema oscuro, el indicador es el de hoy (mismo color, grosor y separación);
  - en el tema claro, el indicador usa un tono del acento tomado de los tokens de diseño, con un
    contraste de al menos 3:1 contra cada fondo sobre el que aparece (fondo de la página,
    superficies de los paneles y de las ventanas, y el fondo propio del control cuando el
    indicador va dentro de él), con el mismo grosor y la misma separación que hoy (Q5; WCAG 2.1,
    1.4.11; diferencia declarada, RNF-2). Si ningún token del acento cumple ese contraste, se
    añade uno nuevo del acento al tema claro, sin tocar los valores del tema oscuro.
  Lo que esta regla aplica a los elementos que no se migran y no son títulos con foco por
  programa (enlaces de texto, barra de navegación, hoja semanal, hoja de horas, «Saltar al
  contenido») lo decide Q7.
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
    partido en dos, sin cambiar ninguna palabra; el identificador se muestra como texto y nunca se
    inserta como HTML (spec 007, RNF-2);
  - tiene los botones «Desvincular», con el aspecto de «Sí, cancelar sesión», y «Volver», con el
    de «Volver», y el botón de cerrar con el nombre accesible y el título emergente «Cerrar»
    (RF-18);
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
    devuelve el foco al botón «Desvincular» de la fila que la abrió.
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
    inventario: el núcleo de componentes y el de utilidades que el núcleo exige como dependencia,
    los dos en la misma versión exacta. No entran paquetes de Mantine para avisos flotantes,
    ventanas gestionadas, fechas, formularios ni gráficos, ni otra colección de iconos, ni otra
    librería de estilos;
  - versión: la más reciente de Mantine cuyo rango de dependencias admita React 18.3 sin avisos de
    dependencias incompatibles al instalar. Actualizar React o Vite queda fuera de alcance. Si la
    última línea mayor exige React 19, se usa la línea anterior (previsiblemente la 8.x). El plan
    fija la versión exacta y anota la comprobación;
  - de desarrollo, ninguna, salvo que el plan demuestre que la librería la necesita para compilar
    sus estilos con Vite 5.4; en ese caso, la mínima y con versión exacta. Las pruebas usan el
    Vitest que trae la spec 016, sin ninguna dependencia de desarrollo nueva para ellas (Q6,
    RNF-6).
- RNF-2: Sin regresiones visibles. No cambian la disposición, los estilos, los textos, los avisos,
  los anuncios a lectores de pantalla, el foco, el orden de tabulación ni las entradas del
  historial de ninguna vista, en los dos temas y en los anchos de verificación. Solo cambia lo que
  fija esta lista, que es la lista completa y cerrada de diferencias declaradas:
  1. Diferencias de hasta 2 px en alto mínimo y relleno de los componentes migrados (RF-3).
  2. Foco de «Anotar una sesión» (Q1, RF-12): al abrirse, el foco va a «Título»; Tab y Mayús+Tab
     no salen de la ventana; con el envío deshabilitado, el foco va a su título; al cerrarse, el
     foco vuelve al control que la abrió (o a «Anotar sesión» si la abrió una propuesta, o al
     título del panel si ese control ya no está). Hoy el foco no entra en la ventana ni queda
     retenido en ella. Cambia el orden de tabulación mientras está abierta.
  3. «Solo cuentas verificadas» se anuncia como interruptor, no como casilla de verificación, con
     el mismo nombre y estado (Q2, RF-11).
  4. Pestañas de juego de perfil y coincidencias (Q3, RF-13): una sola parada en el recorrido con
     Tab para todo el grupo (antes, una por juego); flechas, Inicio y Fin eligen y enfocan otra
     pestaña; cada pestaña se asocia a su panel, que se anuncia como tal.
  5. Desvincular una cuenta (Q4, RF-23 a RF-25): la confirmación nativa del navegador pasa a la
     ventana de desvincular, con el mismo texto partido en título y mensaje, los botones
     «Desvincular» y «Volver» y el botón de cerrar «Cerrar»; foco, bloqueo y cierre como en
     «¿Cancelar esta sesión?»; el error de la desvinculación se muestra dentro de la ventana y no
     encima de la lista de cuentas; tras desvincular, el foco va al título «Cuentas vinculadas».
  6. Indicador de foco del tema claro (Q5, RF-20): en los componentes migrados y en los títulos con
     foco por programa usa un tono del acento con al menos 3:1 de contraste contra su fondo, en
     lugar del volt de hoy; en el tema oscuro no cambia. Si alcanza también a los demás elementos
     que no se migran lo decide Q7.
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
    disponible, y la preferencia del sistema operativo; su salida es «claro» u «oscuro». Las
    pruebas cubren: preferencia guardada «claro» y «oscuro» (gana sobre la del sistema), sin
    preferencia guardada con el sistema en claro y en oscuro, valor guardado extraño (se usa la
    del sistema) y almacenamiento no disponible (se usa la del sistema);
  - el tema de la librería no contiene ningún color literal, solo referencias a los tokens de
    diseño (RF-2): una prueba recorre todos los valores de color del tema, en sus dos variantes, y
    falla si alguno no es una referencia a un token.
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
- Cambiar de tema con «Anotar una sesión» o «¿Cancelar esta sesión?» abierta: cambian a la vez la
  ventana y la página, y la ventana sigue abierta con lo escrito y el foco donde estaba (RF-6).
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
- Recorrido con Tab de coincidencias: tras la pestaña elegida, Tab pasa a lo que sigue (el aviso
  de horas, si tiene enlace, o los criterios), sin pasar por las demás pestañas (RF-13, RNF-2).
- Abrir «Anotar una sesión» desde un bloque de la semana y cerrarla con Escape: el foco vuelve a
  ese bloque; con «Cancelar», el botón de cerrar o pulsando fuera, lo mismo (RF-12).
- Abrir «Anotar una sesión» con «Anotar sesión» de la cabecera y crear la sesión de juego: la
  ventana se cierra, el foco vuelve a «Anotar sesión» y el panel pasa a «Sesión abierta» con la
  sesión creada por confirmar (spec 016, RF-24), sin mover el foco (RF-12).
- Crear desde un bloque de la semana y que la nueva petición de la lista falle: la semana muestra
  el error en lugar de los bloques y el foco, que estaba en el bloque, va al título del panel
  (RF-12).
- «Anotar una sesión» abierta por una propuesta de «Proponer» y cerrada sin crear: el foco va a
  «Anotar sesión» de la cabecera (RF-12, P6).
- Tab desde el último control de «Anotar una sesión»: el foco pasa al primero de la ventana, no a
  la página de detrás; Mayús+Tab desde el primero, al último (RF-12).
- Enviar «Anotar una sesión» con el ratón: mientras dice «Enviando…», el foco está en el título de
  la ventana; si la creación falla, vuelve al botón de envío con el error visible. Enviar con Intro
  desde «Título»: el foco sigue en «Título» todo el tiempo (RF-12).
- Cambiar de tema con la ventana de desvincular abierta: cambian a la vez la ventana y la página,
  la ventana sigue abierta y el foco donde estaba (RF-6).
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
- 401 al desvincular: login con el aviso de la spec 007, RF-7; no queda fondo de ventana y la
  página se desplaza (RF-22, RF-25).
- Lector de pantalla sobre «Solo cuentas verificadas»: anuncia su nombre, «interruptor» y si está
  activado (RF-11).
- Tema claro: el indicador de foco de un botón primario, de una pestaña, de un campo dentro de una
  ventana y del título del panel de la agenda tiene al menos 3:1 contra el fondo que lo rodea; en
  el tema oscuro es igual que en la línea base (RF-20).
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
- Cambiar el mundo visual, la paleta, la tipografía o los tokens de diseño, salvo el tono del
  indicador de foco del tema claro (Q5, RF-20).
- Cambiar la operación de desvincular del servidor, sus respuestas o lo que la interfaz hace con la
  lista de cuentas al desvincular (spec 004; spec 007): solo cambia la confirmación (Q4).
- Cambiar otras confirmaciones o diálogos que no estén en el inventario.
- Corregir contrastes conocidos de componentes que se quedan (por ejemplo, la hoja semanal de la
  agenda, `MEMORY.md`, «Próximo paso», punto 4).
- Avisos flotantes, ventanas gestionadas por la librería, formularios gestionados por la librería,
  selectores de fecha o gráficos de la librería (RNF-1).
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
      vacío, modo simulado); los valores calculados de RF-3 de cada componente del inventario en
      reposo; el ancho desplazable a 360 y 375 px de cada vista; el orden de tabulación de cada
      vista; y el tamaño de RNF-7. Se guardan en el registro de validación de esta spec.
- [ ] Mantine está instalada solo con los paquetes de RNF-1, en versión exacta compatible con React
      18.3 y sin avisos de dependencias incompatibles al instalar; el plan justifica cada paquete
      (RNF-1).
- [ ] Cada componente M1 a M16 sale de la librería en todas las vistas donde aparece y ningún
      componente migrado conserva su versión hecha a mano (RF-1). Una búsqueda en el código no
      encuentra colores literales en el tema ni en los componentes migrados, y cambiar `--volt` en
      las herramientas del navegador cambia al instante los botones primarios, el foco y la
      píldora de las pestañas (RF-2).
- [ ] Repetidas las capturas de la línea base después del cambio, en los dos temas y en los dos
      anchos, las únicas diferencias son las declaradas en RNF-2; los valores calculados de RF-3
      coinciden; los componentes que se quedan no cambian (RF-3, RF-4).
- [ ] Recarga con preferencia guardada en claro y en oscuro, sin preferencia con el sistema en
      claro y en oscuro, con un valor extraño y con el almacenamiento bloqueado: primera pintura
      con el tema correcto (grabación de rendimiento del navegador sin cuadros del otro tema) y
      ninguna entrada nueva en el almacenamiento (RF-5, RF-7).
- [ ] Cambiar el tema en cada vista y con cada ventana abierta: toda la página y los componentes
      migrados cambian a la vez, con la transición en círculo y sin ella con movimiento reducido;
      el logo de Leetify y el color de la barra del navegador cambian (RF-6).
- [ ] Recorrido solo con teclado de cada vista: mismo orden de tabulación que la línea base salvo
      las diferencias declaradas 2, 4 y 5 de RNF-2, foco visible en cada componente migrado y en
      cada título con foco por programa, todos los controles operables (RF-20, RNF-3).
- [ ] Repetidas las reglas de foco de la ventana de cancelar de la spec 009 (RNF-2, casos 6, 13 y
      14) en la agenda y en el detalle: mismo resultado (RF-12).
- [ ] «Anotar una sesión», abierta desde un bloque, desde «Anotar sesión» y desde «Proponer»: foco
      en «Título» al abrir; Tab y Mayús+Tab no salen de la ventana; foco en su título mientras el
      envío dice «Enviando…» (enviado con el ratón) y en «Título» si se envió con Intro; tras un
      error, foco en el elemento desde el que se envió; al cerrar por cada camino (Cancelar, botón
      de cerrar, Escape, pulsar fuera, creación), foco en el control que la abrió o en «Anotar
      sesión» si la abrió una propuesta; con la lista fallando tras crear desde un bloque, foco en
      el título del panel; con «Atrás» o un 401 con la ventana abierta, ningún foco retenido
      (RF-12, RF-22).
- [ ] Pestañas de perfil, coincidencias y la ficha con Tab, flechas, Inicio y Fin y con un lector
      de pantalla (o el árbol de accesibilidad del navegador): una sola parada con Tab por grupo,
      cada pestaña con el nombre del juego, su estado elegido y el panel que controla; en la
      ficha, los mismos roles, nombres y estados que la línea base (RF-13).
- [ ] Ventana de desvincular: título, mensaje y botones con los textos de RF-23; rol de ventana
      modal con su título como nombre accesible; foco en «Volver» al abrir; Tab sin salir;
      «Volver», Escape, botón de cerrar y pulsar fuera devuelven el foco a «Desvincular» de la
      fila sin enviar nada; doble clic en «Desvincular» de la ventana envía una sola petición (en
      la pestaña de red) y, mientras está en curso, foco en el título de la ventana y nada la
      cierra; con éxito, foco en «Cuentas vinculadas»; con 404, con el servidor detenido y sin
      respuesta en 30 s (perfil de red con más de 30 s de latencia), el mensaje dentro de la
      ventana, nada encima de la lista y el foco en «Desvincular» (RF-23 a RF-25).
- [ ] En el árbol de accesibilidad del navegador, cada componente migrado tiene el mismo nombre,
      rol y estado que en la línea base, salvo las diferencias declaradas (en particular,
      «Solo cuentas verificadas» con rol de interruptor, Q2); ningún nombre ni texto en inglés
      (RF-8 a RF-19).
- [ ] Indicador de foco medido con las herramientas del navegador en el tema claro, en un botón,
      un campo, un chip, una pestaña, el interruptor, un deslizador, un control dentro de una
      ventana y un título con foco por programa: al menos 3:1 contra el fondo sobre el que
      aparece; en el tema oscuro, igual que en la línea base (RF-20).
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
  spec usa el Vitest que instala la 016 (RNF-6, Q6).
- **Spec 018 (pruebas E2E).** Se escribe después de esta spec, contra la interfaz definitiva. Esta
  spec garantiza que los roles, nombres accesibles y textos de los controles no cambian (RF-8 a
  RF-19), de modo que la 018 puede localizar los controles por rol y nombre. Las diferencias
  declaradas que afecten a roles (Q2, Q3) se comunican al planificador de la 018.
- **Spec 009.** RNF-1 («Usa los componentes, tokens de diseño y patrones existentes») sigue valiendo
  con los componentes migrados, que usan los mismos tokens. Si Q1 se cierra con la opción A, cambia
  la R10 de RF-23 y RF-24 («El formulario de creación… conserva su comportamiento de foco de hoy»):
  prevalecería esta spec, por posterior y por decisión del usuario.
- **Spec 008.** RNF-2 (pestañas accesibles) se mantiene en la ficha. Si Q3 se cierra con la opción
  A, el mismo patrón pasa a perfil y coincidencias (ampliación, no cambio, de la 008).
- **Spec 007.** RNF-4 (sin cambios de disposición) y RNF-7 (foco en «Reintentar» y anuncios) se
  mantienen (RF-15, RF-17).
- **Specs 013 a 015.** Los botones de verificación con Steam y con Riot y los avisos de la 015
  migran (M1, M13) sin cambiar textos ni atribuciones; los logos de Leetify, Steam y Riot no se
  tocan (Q-8).
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

Propuestas del planificador, que el usuario puede cambiar al revisar la spec:
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
  rehacer el aspecto de todas las vistas (contra D2).
- **P5. Línea base tras la 016.** La comparación visual se hace contra la interfaz con la 016 ya
  implementada, no contra la de hoy (criterios de finalización), para no confundir los cambios de
  la 016 con regresiones de esta spec.

## Dudas abiertas
- [NECESITA ACLARACIÓN] **Q1. Foco de «Anotar una sesión».** Hoy, al abrirse, el foco no entra en
  la ventana ni queda retenido en ella (Tab puede salir a la página de detrás), y la spec 009 (R10)
  congeló ese comportamiento. Las ventanas de la librería llevan el foco dentro y lo retienen.
  Opciones:
  - A (recomendada): adoptar el comportamiento estándar de una ventana modal, como diferencia
    declarada: al abrir, foco en el campo «Título»; Tab y Mayús+Tab sin salir de la ventana; al
    cerrar sin crear, foco de vuelta al control que la abrió («Anotar sesión» o el bloque elegido),
    y al crear, según la spec 016 (RF-24). Mejora el uso con teclado y lector de pantalla y deja las
    dos ventanas con la misma regla. Cambia la R10 de la spec 009.
  - B: conservar exactamente el comportamiento de hoy (sin mover ni retener el foco).
- [NECESITA ACLARACIÓN] **Q2. Rol de «Solo cuentas verificadas».** Hoy es una casilla de
  verificación dibujada como interruptor; el interruptor de la librería se anuncia como
  «interruptor». Opciones:
  - A (recomendada): aceptar que se anuncie como interruptor, como diferencia declarada: es lo que
    ya parece, y el nombre y el estado no cambian.
  - B: mantener el anuncio de casilla de verificación con el aspecto de interruptor (más trabajo de
    estilos, sin diferencia para el lector de pantalla).
- [NECESITA ACLARACIÓN] **Q3. Teclado de las pestañas de juego en perfil y coincidencias.** En la
  ficha de jugador siguen el patrón accesible (solo la elegida entra con Tab; flechas, Inicio y Fin
  cambian de juego). En perfil y coincidencias, hoy cada pestaña entra en el recorrido con Tab y las
  flechas no hacen nada. Las pestañas de la librería traen el patrón accesible. Opciones:
  - A (recomendada): aplicar el patrón accesible de la ficha en las tres vistas, como diferencia
    declarada (cambia el orden de tabulación de perfil y coincidencias: una parada en lugar de una
    por juego). Es consistente y es el patrón estándar.
  - B: conservar en perfil y coincidencias el comportamiento de hoy.
- [NECESITA ACLARACIÓN] **Q4. Confirmación al desvincular una cuenta (ampliación del alcance).** Es
  el único diálogo que hoy usa la confirmación nativa del navegador, con otro aspecto que el resto.
  Opciones:
  - A (recomendada): dejarla como está (Q-12). Cambiarla obliga a fijar textos de botones, reglas
    de foco y de bloqueo nuevas, que son requisitos nuevos y no estilo.
  - B: pasarla a una ventana de la librería con el mismo texto, «Desvincular» y «Volver», y las
    reglas de foco de «¿Cancelar esta sesión?» (spec 009, RF-23), como diferencia declarada.
- [NECESITA ACLARACIÓN] **Q5. Indicador de foco en el tema claro.** El indicador de foco usa el
  volt, que en el tema claro queda por debajo de 3:1 contra el fondo (`MEMORY.md`, «Próximo paso»,
  punto 4). El tema de la librería fija el indicador de foco de todos los componentes migrados, así
  que es el momento de decidirlo. Opciones:
  - A (recomendada): en el tema claro, el indicador de foco de los componentes migrados y el de los
    títulos que reciben el foco por programa usan un tono del acento con al menos 3:1 contra los
    fondos donde aparece (sale de los tokens, con un token nuevo si hace falta), como diferencia
    declarada; en el oscuro no cambia. Cumple WCAG 2.1, 1.4.11.
  - B: mantener el indicador volt de hoy en los dos temas (sin diferencia visible; el defecto
    conocido sigue).
- [NECESITA ACLARACIÓN] **Q6. Qué se prueba con Vitest.** Opciones:
  - A (recomendada): solo reglas puras, en el entorno de Node y sin dependencias nuevas de
    desarrollo: la elección del tema inicial (preferencia guardada, valor extraño, sin
    almacenamiento, preferencia del sistema; RF-5 y RF-7) y que el tema no contiene ningún color
    literal, solo referencias a tokens (RF-2). Lo visual y el foco se comprueban en el recorrido de
    los criterios de finalización y en las pruebas E2E de la spec 018.
  - B: además, pruebas de componentes con un DOM simulado (roles, nombres y foco de la ventana de
    cancelar y de las pestañas), que exigen nuevas dependencias de desarrollo (un DOM simulado y
    una librería de pruebas de componentes) y cambian lo que la spec 016 dejó fuera de alcance.
