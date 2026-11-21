# Spec 016 — Estado global de la sesión iniciada y de la agenda
Estado: borrador (2026-11-20; dudas D1–D5 cerradas por el usuario el 2026-11-21; corregido el
2026-11-21 tras la revisión QA, hallazgos H1 a H18, con las decisiones D6 a D9 del usuario;
dudas Q1 y Q2 cerradas por el usuario el 2026-11-21; corregido de nuevo el 2026-11-21 tras la
segunda revisión QA, hallazgos N1 a N8, con la decisión D10 del usuario; corregido otra vez el
2026-11-21 tras la tercera revisión QA, hallazgos I-1, I-2 y M-1 a M-7, con las decisiones I-1 e
I-2 del usuario; ver «Decisiones»). Sin dudas abiertas. La enmienda de los principios 1 y 4 de la
constitución la hizo el usuario el 2026-11-21 (D9, Q2). Pendiente solo de la aprobación del
usuario. No pasa a plan hasta entonces.

## Contexto y objetivo
El enunciado del último hito pide completar la aplicación como una SPA de producción. Su punto 1
exige «manejo de estado global con Zustand o Redux Toolkit» con «al menos dos slices/stores (por
ejemplo: usuario y entidad principal del proyecto)» (texto íntegro en el apéndice A). El resto del
enunciado ya se cumple o va en otras specs:

- Ruteo con rutas públicas y protegidas, «Atrás», «Adelante» y recarga: specs 007 y 010 (hecho).
- TypeScript estricto sin `any`, errores en JSON con su código HTTP y secretos en `.env`: specs
  001 a 015 (hecho).
- Librería de estilos: spec 017 (Mantine). Pruebas E2E con Playwright en `e2etests/`: spec 018.
- Despliegue real (T9 de la spec 010): lo hace el usuario aparte.

Hoy la aplicación no tiene estado global propio. El estado de la sesión iniciada vive en un
proveedor de React que lo reparte por contexto, y el aviso de 401, que corre fuera de React, lo
lee con copias manuales. El estado de interfaz de la agenda vive dentro de la página de la agenda
y en el estado de la navegación. Los datos del servidor viven en la memoria de datos
(TanStack Query), que funciona bien como caché y no cambia.

Esta spec mueve dos estados a dos almacenes globales:
1. **Almacén de la sesión iniciada** (el «usuario» del enunciado): sustituye al proveedor actual
   y conserva todo el comportamiento de la spec 007. El jugador no nota ningún cambio.
2. **Almacén de la agenda** (la entidad principal es la sesión de juego): guarda el **estado de
   interfaz** de la agenda (filtro, sesión abierta, borrador y propuesta). Los datos de las
   sesiones de juego siguen en la memoria de datos (decisión del usuario). El jugador nota los
   cambios que decidió el usuario y que enumera RNF-2: la agenda recuerda el filtro y la sesión
   abierta mientras navega por la aplicación (RF-15), con un estado de carga en el panel mientras
   no puede decidir si la sesión abierta sigue existiendo (RF-25); la sesión de juego recién
   creada queda abierta (RF-24); una propuesta de «Proponer» se descarta si recarga o sale de la
   agenda antes de que se abra el formulario (RF-30); y «Anotar una sesión» ya no se abre con un
   juego que el jugador no tiene vinculado (RF-13).

Además, los almacenes y sus reglas puras se prueban con pruebas automáticas en el frontend
(RNF-5) y los almacenes se pueden inspeccionar con las herramientas de depuración del navegador
solo en desarrollo (RF-21).

- Depende de: spec 006 (RF-27: 400 al crear en un juego sin cuenta vinculada), spec 007 (sesión
  del cliente: RF-3 a RF-9, RF-24, RF-25, RF-28, RF-29, RF-30, RF-33), spec 008 (RF-7 y RF-21:
  propuesta desde la ficha) y spec 009 (RF-2, RF-8, RF-15, RF-19 y RF-24: agenda y detalle). Todas
  están implementadas y validadas.
- Origen: enunciado del último hito, punto 1. El texto lo aportó el usuario el 2026-11-20: no está
  en el repositorio (`AGENTS.md` remite a un `HITO2.md` que no existe); se transcribe íntegro en
  el apéndice A para la trazabilidad. Decisiones del usuario del 2026-11-20: Zustand; dos
  almacenes (sesión iniciada y estado de interfaz de la agenda); TanStack Query se mantiene como
  caché de los datos del servidor; Mantine y Playwright van en las specs 017 y 018. Decisiones del
  usuario del 2026-11-21: D1 a D9, dos confirmaciones y las respuestas a Q1 y Q2 (sección
  «Decisiones»).
- Esta spec no cambia el servidor ni el contrato de datos.
- Exige enmendar los principios 1 y 4 de la constitución (D3, D9). La enmienda la hizo el
  usuario en `docs/constitution.md` el 2026-11-21, antes de aprobar esta spec. El texto vigente de
  los dos principios se copia en «Impacto en otras specs y en la constitución».

## Usuarios
- Jugador que usa la aplicación. No debe notar ningún cambio, salvo los que enumera RNF-2.
- Integrantes del equipo que mantienen la interfaz, la prueban y la presentan al evaluador.
- Evaluador del hito, que revisa que el estado global exista y se use.

## Historias de usuario
- HU-1. Como jugador, quiero que entrar, salir, recargar, expirar la sesión y cambiar de sesión
  en otra pestaña funcionen exactamente como hoy.
- HU-2. Como jugador, quiero que la agenda (filtro, sesión abierta, formulario «Anotar una
  sesión» y «Proponer») funcione como hoy; que, al salir de ella y volver sin recargar, siga con
  el filtro y la sesión de juego que tenía abiertos; y que la sesión de juego que acabo de crear
  quede abierta.
- HU-3. Como jugador, quiero que al cerrar sesión, o al entrar otra cuenta, no quede en la
  pestaña ningún rastro del estado de interfaz de la cuenta anterior.
- HU-4. Como integrante del equipo, quiero que el estado de la sesión iniciada y el de la agenda
  estén cada uno en un único lugar, legibles desde cualquier vista y desde el código que no es
  una vista, sin copias que mantener a mano, y cubiertos por pruebas automáticas.
- HU-5. Como evaluador, quiero ver al menos dos almacenes de estado global con responsabilidades
  distintas.
- HU-6. Como integrante del equipo, quiero ver el contenido y los cambios de los dos almacenes
  con las herramientas de depuración del navegador mientras desarrollo, sin que eso llegue nunca
  a la versión de producción.

## Definiciones
- **Sesión iniciada**: la de la spec 007 (usuario de la sesión, consulta de sesión, comprobante
  anti-CSRF). **Sesión de juego**: la de la spec 006 (la entidad que se agenda). En esta spec
  nunca se escribe «sesión» a secas.
- **Almacén global**: estado de la pestaña que existe una sola vez, fuera de cualquier vista. Lo
  leen y lo cambian las vistas y también las piezas que no son vistas (aviso de 401, aviso entre
  pestañas). Vive solo en memoria: cada pestaña tiene el suyo y una recarga lo devuelve a su
  estado inicial (RF-19).
- **Almacén de la sesión iniciada**: guarda el estado de la sesión iniciada (`checking`,
  `authenticated`, `anonymous` o `error`; spec 007, RF-5), el usuario de la sesión (solo en
  `authenticated`) y el mensaje de la pantalla de error (solo en `error`). Nunca guarda el
  comprobante anti-CSRF ni contraseñas. Sus operaciones son las de hoy: consulta de sesión,
  reintentar, iniciar sesión, registrarse, cerrar sesión y actualizar el usuario de la sesión.
- **Almacén de la agenda**: guarda el estado de interfaz de la agenda listado en el inventario
  siguiente, y solo eso: identificadores y datos de interfaz. Nunca guarda datos del servidor
  (RF-10).
- **Datos del servidor**: todo lo que la interfaz recibe del servidor y guarda hoy en la memoria
  de datos (listas de sesiones de juego por filtro, detalle de cada visita, cuentas,
  disponibilidad, coincidencias, fichas). Siguen ahí, con sus reglas actuales: claves por
  usuario, sin reintentos y con las actualizaciones de la agenda que hace el detalle (spec 009,
  RF-15 y RF-19).
- **Limpiar la sesión del cliente**, **ruta de origen**, **llevar a una ruta por una regla de
  sesión** (sustituye la entrada del historial) y **cambio de sesión en otra pestaña**: los de la
  spec 007.
- **Estado inicial de la agenda**: filtro «Todos los juegos», panel «Mis sesiones» (sin sesión
  abierta), sin borrador y sin propuesta pendiente.
- **Salir de la agenda**: pasar, en la misma pestaña y sin recargar, de la ruta de la agenda
  (`/agenda`) a cualquier otra ruta, incluido el detalle de una sesión de juego, por un enlace,
  por «Atrás» o «Adelante» o por una regla de sesión. **Volver a la agenda**: llegar de nuevo a
  `/agenda` en la misma pestaña sin haber recargado entre medias.
- **Lista que se ve**: los datos de la lista de sesiones de juego del filtro vigente que la
  memoria de datos conserva en ese momento, como hoy. De ellos salen la tarjeta de «Sesión
  abierta» y «Mis sesiones», y también la semana cuando no muestra el error de la lista. Son:
  - la última lista recibida del servidor para el filtro vigente, también mientras se vuelve a
    pedir y también si la última petición de esa lista falló (un fallo no borra la lista ya
    recibida);
  - durante un cambio de filtro, mientras no llega ninguna respuesta para el filtro nuevo y este
    no tiene lista recibida, la del filtro anterior, que se mantiene en pantalla (RF-11).

  Si el filtro vigente no tiene lista recibida y no se da el segundo caso (por ejemplo, la
  primera petición de ese filtro falló), no hay lista que se ve, y no contiene ninguna sesión de
  juego. La lista que se ve no depende de lo que pinte la semana: sigue siendo la misma aunque la
  semana muestre en su lugar el error de la lista. Sirve para pintar la tarjeta de la sesión
  abierta y para cerrar una sesión abierta confirmada (RF-27), pero nunca decide una sesión
  abierta por confirmar (Respuesta que decide).
- **Fallo de la lista**: una petición de la lista del filtro vigente que termina sin la lista:
  una respuesta de error (un error con mensaje distinto de 401 o un 5xx) o una petición sin
  respuesta (red cortada, servidor caído o el plazo de 30 s de la spec 007, RF-20, que la da por
  fallida como error sin mensaje). Una respuesta que llega después de ese plazo no se aplica
  (spec 007, RF-20): ni cambia la lista que se ve ni decide. Un 401 no es un fallo de la lista:
  sigue RF-6, y el reinicio del almacén (RF-16) cierra la sesión abierta.
- **Sesión abierta por confirmar**: la sesión de juego abierta desde que el jugador vuelve a la
  agenda con ella conservada (RF-15) o desde que se crea en «Anotar una sesión» (RF-24), hasta
  que llega la respuesta que decide (RF-26) o el panel deja de mostrarla por otro motivo (RF-25).
  Fuera de esa espera, la sesión abierta está **confirmada**.
- **Respuesta que decide**: la primera respuesta **correcta** (con la lista) del servidor a una
  petición de la lista del filtro vigente que **llega**, con la agenda en pantalla, después del
  hecho que inició la espera, aunque esa petición ya estuviera en curso antes del hecho (la
  memoria de datos reutiliza la petición en curso en lugar de enviar otra). Un fallo de la lista
  nunca decide. Los hechos son dos:
  - volver a la agenda (RF-15);
  - la confirmación de la creación por el servidor (RF-24). El instante del hecho es el de esa
    confirmación: hoy es entonces cuando sale la petición nueva de la lista, antes de que la
    agenda reciba el identificador de la sesión creada. La respuesta a esa petición decide si
    es correcta; si es un fallo, decide la siguiente respuesta correcta.

  Si durante la espera el jugador elige otro filtro, decide la primera respuesta correcta con la
  lista del filtro nuevo que llegue después del cambio (RF-11). Nunca deciden la lista que se ve
  (la guardada en la memoria de datos o la del filtro anterior que se mantiene en pantalla), ni
  un fallo de la lista. Ante un fallo de la lista, la sesión abierta no se cierra ni se confirma:
  si el panel no tiene su tarjeta, muestra el error de la lista con «Reintentar», sin quedarse en
  «Cargando…» (RF-25), y la espera sigue hasta la siguiente respuesta correcta. No se envía
  ninguna petición de la lista además de las que la aplicación envía hoy (C1, D7, D10).
- **Propuesta pendiente**: la propuesta de «Proponer» que la agenda aún no ha aplicado ni
  descartado (RF-14, RF-28 a RF-30).
- **Modo de desarrollo**: la interfaz servida por el servidor de desarrollo de la interfaz, con o
  sin modo simulado. **Construcción de producción**: la interfaz compilada para producción, tanto
  servida por el servidor (spec 010) como por la vista previa local de esa construcción.

### Inventario del estado de interfaz de la agenda
| Estado | Dónde vive hoy | Destino |
| --- | --- | --- |
| Filtro de juego («Todos los juegos» o un juego) | Página de la agenda | Almacén de la agenda; se conserva al salir y volver (RF-15) |
| Sesión de juego abierta en el panel «Sesión abierta» | Página de la agenda | Almacén de la agenda, **solo su identificador**: los datos de la tarjeta salen siempre de la lista que se ve (memoria de datos). Se conserva al salir y volver (RF-15) |
| Si la sesión abierta está por confirmar | No existe | Almacén de la agenda (RF-24 a RF-26) |
| Borrador: si «Anotar una sesión» está abierto y con qué juego, día, hora, título y duración se abre | Página de la agenda | Almacén de la agenda; se cierra al salir de la agenda (RF-15) |
| Lo que el jugador escribe en «Anotar una sesión» (título, notas, día, hora, duración, cupos), el error de título del formulario y el error de la creación que devuelve el servidor | Formulario | Se queda en el formulario (D1: el borrador no se conserva); al volver no se ve (RF-17) |
| Propuesta que llega desde «Proponer» (coincidencias y ficha) y espera las cuentas: juego, día, hora, duración y título | Estado de la navegación y página de la agenda | Almacén de la agenda (D2, RF-14); ya no pasa por el estado de la navegación. El título («Sesión con <nombre visible>») es un texto que compone la interfaz para rellenar un campo, no una copia de un dato del servidor: el almacén no guarda al jugador propuesto ni su nombre, y si el nombre cambia después en el servidor la propuesta no se actualiza |
| Ventana «Cancelar sesión» de la agenda (abierta y su mensaje) | Página de la agenda | Se queda local: no se comparte (RF-17) |
| Escrituras de la agenda en curso (unirse, salir, cancelar), con su «Enviando…», y el aviso de error de unirse o salir que muestra el panel | Página de la agenda | Se quedan locales (RF-17); al volver no se ve nada de la visita anterior |
| Peticiones de foco, marca de foco al volver del detalle tras cancelar, marca de que esa llegada ya movió el foco, y guardas contra el doble envío | Página de la agenda y estado de la navegación | Se quedan como están: dependen de elementos de la página (RF-17) |
| Todo el estado del detalle de una sesión de juego (lectura, formulario de edición, ventana, mensajes, foco) | Detalle | Se queda en el detalle: cada apertura es nueva (spec 009, R1) |

## Requisitos funcionales
Numeración: los RF que añadió la revisión del 2026-11-21 toman los números RF-23 a RF-30 para no
mover las referencias de la revisión QA; se colocan en la sección que les corresponde.

### Almacén de la sesión iniciada
- RF-1: EL SISTEMA guarda el estado de la sesión iniciada en un único almacén global. Es la
  única fuente de ese estado para todas las vistas, la puerta de la consulta de sesión, las
  rutas protegidas y solo públicas, las claves de la memoria de datos, el aviso de 401 y el aviso
  entre pestañas. No queda ninguna otra copia de ese estado que haya que mantener igual a mano.
  Para RF-3 a RF-7 el almacén necesita conocer la ruta que está en pantalla y poder llevar a otra
  ruta. Tener acceso a esas dos cosas no es una copia del estado de la sesión iniciada y no
  contradice este RF. El almacén recibe la ruta en pantalla y la forma de llevar a otra ruta desde
  una pieza que vive dentro de la navegación del navegador, como hoy las obtiene el proveedor de
  la sesión iniciada. La navegación del navegador está montada siempre, también en `checking` y
  `error`; lo que no se monta en esos dos estados son las rutas de la aplicación (RF-9). La forma
  en que se montan la navegación y las rutas no cambia (Q1, opción A). En `checking` y `error` el
  almacén navega igual que hoy: la consulta de sesión (RF-2) y el cambio de sesión en otra
  pestaña (RF-7) no llevan a ninguna ruta; el aviso de 401 de una operación protegida (RF-6) no
  comprueba el estado y podría llevar a login, pero en la práctica no se alcanza en esos estados,
  porque sin las rutas montadas no corre ninguna operación protegida y la consulta de sesión trata
  su propio 401 (RF-2). Esta spec no añade ni quita esa comprobación.
- RF-2: CUANDO la aplicación se carga o se recarga, EL SISTEMA hace la consulta de sesión y
  aplica la spec 007, RF-5, sin cambios: solo «Cargando…» mientras espera; 200 deja al jugador
  dentro; 401 limpia la sesión del cliente sin aviso; un error sin mensaje, un 5xx o cualquier
  otro código muestran la pantalla de error con «Reintentar» (sin límite de intentos), con el
  foco en «Reintentar» (007, RNF-7). La respuesta de una consulta anterior a la última se
  descarta. Si una limpieza cancela la consulta, la consulta se repite, para no quedar en
  «Cargando…». Si la aplicación se monta dos veces seguidas (modo de desarrollo), solo cuenta la
  respuesta de la última consulta.
- RF-3: CUANDO el inicio de sesión tiene éxito, EL SISTEMA hace en un solo paso lo que hace hoy:
  guarda el comprobante, vacía la memoria de datos, pone al usuario como usuario de la sesión,
  avisa a las otras pestañas y lleva a la ruta de origen, o a Inicio si no hay, sustituyendo la
  entrada del historial (spec 007, RF-3, RF-8, RF-24). No se ve ninguna vista intermedia: ni login
  con usuario de sesión ni la vista de destino sin él.
- RF-4: CUANDO el registro tiene éxito, EL SISTEMA inicia sesión con las mismas credenciales y se
  comporta como la spec 007, RF-4: a Inicio si el inicio de sesión tiene éxito; si falla, a login
  con el correo escrito y el aviso «Tu cuenta se creó; inicia sesión», sin ruta de origen.
- RF-5: CUANDO el jugador cierra sesión, EL SISTEMA se comporta como la spec 007, RF-6: avisa al
  servidor (espera su respuesta o el plazo), limpia la sesión del cliente aunque el aviso falle,
  borra primero el comprobante propio, después avisa a las otras pestañas y lleva a login
  sustituyendo la entrada del historial.
- RF-6: SI una operación protegida recibe 401, ENTONCES EL SISTEMA se comporta como la spec 007,
  RF-7 y RF-25:
  - Con usuario de sesión: limpia la sesión del cliente y lleva a login con la ruta de origen y el
    aviso «Tu sesión expiró. Vuelve a entrar.».
  - Sin usuario de sesión: lleva a login con la ruta de origen y sin aviso.
  - Muchos 401: una sola entrada de login y un solo aviso. La ruta de origen es la de la vista en
    pantalla al llegar el primer 401.
  - Ignora los 401 de peticiones enviadas antes de la última limpieza.
  - La pestaña deja de tener usuario de sesión antes de que se vacíe la memoria de datos. Así
    ninguna consulta de la vista montada se relanza y no se pierden el aviso ni la ruta de origen
    (defecto D-A2 de la spec 007, corregido en su T31).
- RF-7: CUANDO otra pestaña registra un cambio de sesión, EL SISTEMA se comporta como la spec 007,
  RF-24:
  - Limpia la sesión del cliente sin borrar el comprobante guardado (D1 de la spec 007).
  - Si tenía usuario de sesión y está en una ruta protegida, lleva a login con esa ruta de origen
    y el aviso «Se cerró o cambió la sesión en otra pestaña.».
  - Si está en una ruta pública, o en `checking` o `error`, solo limpia.
  - Lo hace en 5 s como máximo, o en 5 s desde que la pestaña vuelve a estar visible.
  - Sin almacenamiento disponible no vigila nada (007, RF-3).
- RF-8: CUANDO una vista actualiza los datos del usuario de la sesión (por ejemplo, al guardar el
  perfil), EL SISTEMA actualiza el usuario en el almacén y toda vista que lo muestra lo refleja
  sin recargar. SI en ese momento no hay usuario de sesión, ENTONCES EL SISTEMA no cambia nada.
- RF-9: EL SISTEMA mantiene sin cambios lo que depende del estado de la sesión iniciada:
  - la puerta de la consulta de sesión (007, RF-5): mientras dura `checking` o `error` no se
    montan las rutas de la aplicación (la navegación del navegador sí, porque está montada
    siempre), así que no se ve ninguna ruta antes de la respuesta;
  - las rutas protegidas (007, RF-25), las solo públicas (007, RF-33) y la vista «no encontrada»
    (007, RF-28);
  - las claves de la memoria de datos por usuario, que nunca mezclan datos de dos cuentas;
  - no pedir datos protegidos sin usuario de sesión.

### Almacén de la agenda
- RF-10: EL SISTEMA guarda en un único almacén global de la agenda el estado que el inventario
  manda allí: filtro de juego, identificador de la sesión de juego abierta y si está por
  confirmar, borrador y propuesta pendiente. Solo guarda identificadores (el del juego del filtro
  y del borrador, el de la sesión abierta) y datos de interfaz (día, hora, duración y título con
  que se abre el formulario; la propuesta). No guarda datos del servidor: las sesiones de juego
  que muestra la agenda, incluida la de la tarjeta abierta, se siguen pidiendo, guardando y
  actualizando en la memoria de datos, como hoy.
- RF-11: CUANDO el jugador elige un filtro de juego, EL SISTEMA se comporta como hoy:
  - marca solo ese filtro como pulsado (en «Todos los juegos» o en un juego);
  - muestra la lista de ese filtro, con el indicador «Actualizando» mientras la pide;
  - mantiene los datos anteriores en pantalla mientras llega la lista nueva;
  - la sesión de juego abierta sigue RF-25 a RF-27: si está confirmada y la lista que se ve deja
    de contenerla, se cierra (RF-27); si está por confirmar, decide la primera respuesta
    correcta con la lista del filtro nuevo (RF-26).
- RF-12: CUANDO el jugador elige una sesión de juego en la semana, EL SISTEMA la abre en «Sesión
  abierta» con sus acciones, como hoy. Esa sesión abierta está confirmada (está en la lista que
  se ve) y, si había otra por confirmar, la espera termina.
- RF-23: CUANDO el jugador pulsa «Ver las mías», EL SISTEMA cierra la sesión abierta (esté
  confirmada o por confirmar) y muestra «Mis sesiones», como hoy.
- RF-24: MIENTRAS la pestaña sigue en la agenda desde la que se envió «Anotar una sesión» (sin
  haber salido de ella), CUANDO el servidor confirma la creación de la sesión de juego, EL SISTEMA
  cierra el formulario, deja esa sesión de juego como sesión abierta por confirmar y vuelve a
  pedir la lista del filtro vigente en el instante de la confirmación (esto último, como hoy).
  La respuesta a esa petición es la respuesta que decide si es correcta y llega con la agenda en
  pantalla (Definiciones). Si ya había una sesión abierta (confirmada o por confirmar), la sesión
  creada la sustituye. **Cambio nuevo declarado (D6)**: hoy la agenda la cierra en el acto, porque
  la lista que se ve todavía no la contiene cuando se abre; con esta spec queda abierta hasta que
  llegue la respuesta que decide (RF-26).

  SI el servidor confirma la creación cuando la pestaña ya salió de esa agenda (por ejemplo, el
  jugador pulsó «Atrás» mientras el botón decía «Enviando…»), aunque después haya vuelto a ella,
  ENTONCES EL SISTEMA no cambia el almacén de la agenda: la sesión creada no queda abierta ni por
  confirmar, y la sesión abierta conservada, si la había, sigue como estaba. El formulario ya se
  cerró al salir (RF-15). Las listas de la agenda se vuelven a pedir como hoy: la confirmación de
  la creación marca como desactualizadas todas las listas de la agenda guardadas en la memoria de
  datos, aunque la agenda ya no esté en pantalla, y la agenda pide la de su filtro al volver
  (RF-15) o en el acto si el jugador ya había vuelto. Al llegar esa lista, la sesión creada
  aparece en la semana solo si el filtro vigente es «Todos los juegos» o el de su juego, y en
  «Mis sesiones» solo si, además, el panel muestra «Mis sesiones» (sin sesión abierta; con una
  sesión abierta conservada, tras pulsar «Ver las mías»). Es lo que pasa hoy: esa confirmación
  no tiene efecto sobre la agenda.
- RF-25: MIENTRAS la sesión de juego abierta está por confirmar, EL SISTEMA:
  - no la cierra porque no esté en la lista que se ve; solo la cierran o la sustituyen la
    respuesta que decide (RF-26), «Ver las mías» (RF-23), elegir otra sesión de juego en la
    semana (RF-12), crear otra sesión de juego en «Anotar una sesión» con la agenda en pantalla,
    que la sustituye como sesión abierta por confirmar (RF-24), cancelarla en la agenda con
    respuesta 204 (RF-27) o el reinicio del almacén (RF-16);
  - muestra en la cabecera del panel el título «Sesión abierta» y el botón «Ver las mías», como
    con cualquier sesión abierta;
  - si la lista que se ve contiene esa sesión de juego, muestra en el cuerpo del panel su tarjeta
    con los datos de esa lista y sus acciones, como hoy, también mientras la semana muestra el
    error de la lista (rama de fallo, más abajo);
  - si la lista que se ve no la contiene (no hay lista que se ve, o la que hay no la incluye) y la
    semana no muestra el error de la lista, muestra en el cuerpo del panel, en lugar de la
    tarjeta, el estado de carga con el texto «Cargando…», que un lector de pantalla anuncia como
    estado, igual que los demás estados de carga de la aplicación. Nunca muestra en ese momento
    el título «Mis sesiones» ni «No estás en ninguna sesión» (D7);
  - el estado de carga no recibe el foco ni lo mueve: el foco queda donde lo dejaron la llegada a
    la agenda (spec 009, RF-2 y RF-8) o el jugador;
  - SI hay un fallo de la lista (Definiciones: respuesta de error, red cortada, servidor caído o
    plazo de 30 s), ENTONCES EL SISTEMA no cierra ni confirma la sesión abierta, y no se queda en
    «Cargando…» (D10, I-1):
    - la semana muestra el error de la lista con «Reintentar», como hoy, desde que llega el fallo
      de la lista del filtro vigente hasta que llega una respuesta correcta de esa misma lista;
    - si la lista que se ve contiene la sesión abierta, el panel sigue mostrando su tarjeta, como
      hoy cuando falla una nueva petición de la lista;
    - si no la contiene, el cuerpo del panel muestra, en lugar de «Cargando…», el mismo error de
      la lista con «Reintentar», que pide la lista igual que el de la semana; el título sigue
      siendo «Sesión abierta», con «Ver las mías»; el error no recibe el foco ni lo mueve. El
      texto visible del botón es «Reintentar», como el de la semana; el plan puede darle un
      nombre accesible que lo distinga del de la semana;
    - mientras está en curso la petición lanzada por cualquiera de los dos «Reintentar», la
      semana y el panel siguen mostrando el error con «Reintentar», sin «Cargando…» ni el
      esqueleto de carga, y junto a los filtros se ve el indicador «Actualizando», como hoy
      hace la semana; al llegar la respuesta, el panel sigue RF-26 si es correcta, o sigue
      mostrando el error si es otro fallo;
    - la sesión sigue por confirmar y decide la siguiente respuesta correcta que llegue (tras
      «Reintentar» o tras cualquier otra petición de esa lista que la aplicación envíe hoy). No se
      envía ninguna petición extra.
- RF-26: CUANDO llega la respuesta que decide (la primera respuesta correcta tras el hecho,
  Definiciones; los fallos de la lista no deciden y los trata RF-25), EL SISTEMA termina la
  espera de la sesión abierta por confirmar:
  - SI la lista recibida la contiene, ENTONCES la sigue mostrando en «Sesión abierta», con los
    datos recibidos, y pasa a estar confirmada;
  - SI la lista recibida no la contiene, ENTONCES la cierra y muestra «Mis sesiones».
  Si el título del panel tenía el foco (por ejemplo, al volver tras cancelar en el detalle, spec
  009, RF-8), lo conserva aunque su texto cambie de «Sesión abierta» a «Mis sesiones».
- RF-27: SI la sesión de juego abierta está confirmada y deja de estar en la lista que se ve
  (porque el jugador la canceló en la agenda, porque la agenda volvió a pedir la lista tras un 404
  o porque el jugador eligió un filtro cuya lista no la contiene), ENTONCES EL SISTEMA la cierra y
  muestra «Mis sesiones», como hoy (spec 009, RF-2 y RF-19). Con la sesión abierta confirmada,
  un fallo de la lista (Definiciones) se comporta como hoy, según lo que conserve la memoria de
  datos:
  - si el filtro vigente tiene lista recibida, esa lista sigue siendo la lista que se ve: si la
    contiene, la sesión sigue abierta con su tarjeta mientras la semana muestra el error de la
    lista con «Reintentar»;
  - si el filtro vigente no tiene lista recibida (por ejemplo, el jugador eligió un filtro que
    no había pedido antes y su primera petición falló), no hay lista que se ve: la sesión se
    cierra y el panel muestra «Mis sesiones», como hoy, mientras la semana muestra el error.

  SI el jugador cancela en la agenda la sesión abierta mientras está por confirmar y el servidor
  responde 204, ENTONCES EL SISTEMA también la cierra en el acto.
- RF-13: EL SISTEMA abre o no «Anotar una sesión» según el estado de las cuentas del jugador que
  tiene la interfaz. Cada estado tiene su cláusula; en todas, «abrir» se provoca eligiendo un
  bloque de la semana o pulsando «Anotar sesión» en la cabecera:
  - RF-13.a: MIENTRAS la interfaz tiene recibidas las cuentas del jugador y este tiene al menos
    un juego vinculado, CUANDO el jugador elige un bloque de la semana o pulsa «Anotar sesión»,
    EL SISTEMA abre «Anotar una sesión» con estos valores, que cada apertura vuelve a poner (como
    hoy):
    - Bloque elegido: su día y su hora. «Anotar sesión»: lunes a las 20:00 (como hoy).
    - Juego: el del filtro, si es un juego que el jugador tiene vinculado. Si no lo es (filtro
      «Todos los juegos», o el filtro de un juego que el jugador nunca vinculó o que ya
      desvinculó), el primer juego vinculado: el de la primera cuenta de la lista de cuentas del
      jugador, en el orden en que la entrega el contrato de datos (con el servidor real, de la
      cuenta vinculada primero a la última, spec 004). Es el mismo orden que usa hoy «Todos los
      juegos» (decisión del planificador sobre H6, justificada en «Decisiones»).
    - Duración: 2 horas. Cupos y notas: sus valores por defecto (como hoy).
  - RF-13.b: MIENTRAS la interfaz tiene recibidas las cuentas del jugador y este no tiene ningún
    juego vinculado, EL SISTEMA no abre «Anotar una sesión»: el botón «Anotar sesión» queda
    deshabilitado, elegir un bloque no abre nada y se ve el aviso «Necesitas al menos un juego
    vinculado…», salvo que se vea el error de RF-13.e, que ocupa su lugar (como hoy).
  - RF-13.c: MIENTRAS la primera carga de las cuentas del jugador está en curso, EL SISTEMA no
    abre «Anotar una sesión»: el botón «Anotar sesión» queda deshabilitado, elegir un bloque no
    abre nada y no se ve ni el error de la carga ni el aviso «Necesitas al menos un juego
    vinculado…» (como hoy).
  - RF-13.d: SI la primera carga de las cuentas del jugador falla, ENTONCES EL SISTEMA no abre
    «Anotar una sesión» (el botón «Anotar sesión» queda deshabilitado y elegir un bloque no abre
    nada) y muestra el error de la carga con «Reintentar» (spec 007, RF-9), no el aviso
    «Necesitas al menos un juego vinculado…» (como hoy). Si «Reintentar» tiene éxito, se aplica
    RF-13.a o RF-13.b con las cuentas recibidas.
  - RF-13.e: SI falla una carga nueva de las cuentas cuando la interfaz ya tenía cuentas
    recibidas, ENTONCES EL SISTEMA muestra el error con «Reintentar» y sigue aplicando RF-13.a o
    RF-13.b con las cuentas ya recibidas (como hoy).
  - RF-13.f: CUANDO el jugador pulsa «Cancelar», cierra la ventana o crea la sesión de juego, EL
    SISTEMA cierra el borrador (como hoy). Las reglas del título y de las notas (spec 009, RF-24)
    y el envío único con «Enviando…» (spec 007, RF-20) no cambian.

  Si se abre y con qué juego lo decide una regla pura (RNF-4). Entradas: el filtro vigente y las
  cuentas del jugador que tiene la interfaz, en el orden de la lista de cuentas, o «sin cuentas
  recibidas» si su primera carga está en curso o falló. Salida: «no se abre» (sin cuentas
  recibidas, o con cuentas recibidas pero ningún juego vinculado) o el juego con que se abre. Qué
  se ve en cada caso (error, aviso o nada) lo decide la vista, como hoy.

  **Mejora declarada (H3)**: hoy los filtros de la agenda muestran los tres juegos del catálogo,
  tenga o no cuenta el jugador, y con el filtro de un juego que no tiene vinculado (nunca, o ya
  no) el formulario se abre con ese juego aunque el selector «Juego» no lo ofrezca; al enviarlo,
  el servidor responde 400 (spec 006, RF-27). Con esta spec se abre con el primer juego vinculado
  y ese 400 ya no se alcanza desde la agenda. Con la agenda que conserva el filtro (RF-15), el
  caso «ya desvinculado» también se vuelve alcanzable al volver desde Configuración.
- RF-14: CUANDO el jugador pulsa «Proponer» en coincidencias (spec 007, RF-29) o en la ficha de
  jugador (spec 008, RF-7), EL SISTEMA guarda la propuesta (juego, día, hora, duración y título)
  en el almacén de la agenda como propuesta pendiente y lleva a la agenda; la propuesta ya no
  viaja en el estado de la navegación (D2). Si ya había una propuesta pendiente, la nueva la
  sustituye: solo hay una a la vez. Esta sustitución solo se verifica en el almacén (RNF-5):
  desde la interfaz no se pueden tener dos propuestas pendientes, porque pulsar «Proponer» lleva a
  la agenda y salir de ella antes de aplicarla la descarta (RF-30).
- RF-28: MIENTRAS hay una propuesta pendiente y la pestaña está en la agenda, EL SISTEMA aplica la
  regla de RF-29 al llegar a la agenda y cada vez que cambia una de sus entradas, y actúa según su
  resultado:
  - CUANDO la regla da «esperar», EL SISTEMA no abre el formulario: la agenda se ve como al
    volver a ella (RF-15), con el filtro conservado pulsado y pidiendo su lista (diferencia
    visible declarada en RNF-2, H15).
  - CUANDO la regla da «aplicar», EL SISTEMA, en un solo paso, abre «Anotar una sesión» con los
    datos que da la regla, pone el filtro en «Todos los juegos», que pide su lista como en RF-11
    (D5), y quita la propuesta pendiente. La sesión abierta, si la hay, sigue RF-11 y RF-25 a
    RF-27: si está en la lista de «Todos los juegos», sigue abierta.
  - CUANDO la regla da «descartar», EL SISTEMA quita la propuesta pendiente sin abrir el
    formulario y sin cambiar el filtro, la sesión abierta ni nada más de la agenda: queda como si
    se hubiera abierto directamente (D5).

  Una propuesta quitada no vuelve: ni «Atrás», ni «Adelante», ni volver a la agenda la reabren
  (un solo uso, spec 007, RF-30). Cerrar el formulario sin crear la sesión de juego no devuelve el
  filtro anterior: queda en «Todos los juegos».
- RF-29: EL SISTEMA decide qué hacer con la propuesta pendiente con una única regla pura (RNF-4)
  (D8). Entradas: la propuesta (juego, día, hora de inicio, duración y título); si hay usuario de
  sesión; y el estado de la carga de las cuentas del usuario de la sesión: «cargando» (también si
  se están volviendo a pedir), «fallida» o «cargada», con los juegos de sus cuentas. Salida: una
  sola de «esperar», «aplicar» o «descartar», según el primero de estos casos que se cumpla:
  1. Sin usuario de sesión (por ejemplo, tras un 401): «descartar».
  2. Cuentas «cargando»: «esperar».
  3. Cuentas «fallida»: «descartar». El error de la carga se muestra como hoy (spec 007, RF-9) y
     la propuesta no vuelve aunque después se reintente.
  4. Cuentas «cargada» sin ninguna cuenta en el juego propuesto: «descartar».
  5. Cuentas «cargada» con cuenta en el juego propuesto: «aplicar», con este borrador: juego, día,
     hora de inicio, duración y título de la propuesta; cupos y notas con sus valores por
     defecto; y, junto a él, el filtro «Todos los juegos».

  Es la regla que aplica hoy la agenda (spec 007, RF-30; spec 008, RF-21), salvo que ya no lee ni
  valida un dato sin tipo del estado de la navegación: la propuesta llega con su forma desde
  «Proponer» (D2, D8).
- RF-30: SI hay una propuesta pendiente y la pestaña pasa a una ruta distinta de la agenda (por un
  enlace, por «Atrás» o «Adelante» o por una regla de sesión, también antes de que la agenda
  llegue a pintarse tras pulsar «Proponer»), o se recarga, ENTONCES EL SISTEMA la descarta y no la
  aplica en ninguna visita posterior a la agenda. **Cambio aceptado por el usuario (D2)**: hoy,
  recargar durante la espera de las cuentas la vuelve a aplicar.
- RF-15: CUANDO el jugador vuelve a la agenda en la misma pestaña sin recargar (D1), EL SISTEMA:
  - muestra el filtro de juego que tenía y vuelve a pedir la lista de ese filtro como hoy: la
    memoria de datos considera desactualizada cualquier lista guardada en cuanto la recibe, así
    que al montarse la agenda la pide; si ya hay una petición de esa lista en curso (por ejemplo,
    la que salió al confirmarse una creación justo antes de salir de la agenda), la reutiliza en
    lugar de enviar otra, y su respuesta, si llega después de volver, es la que decide
    (Definiciones, D10). Una petición de la lista no se cancela al salir de la agenda y nunca se
    reintenta sola. Mientras llega, muestra la lista que hubiera en la memoria de datos para ese
    filtro, como hoy;
  - si tenía una sesión de juego abierta, la conserva como sesión abierta por confirmar y la
    muestra o la cierra según RF-25 y RF-26 (C1, D7);
  - no conserva el borrador: «Anotar una sesión» se cierra al salir de la agenda y lo escrito se
    pierde;
  - si llega con una propuesta pendiente (RF-14), sigue RF-28; al aplicarse, el filtro pasa a
    «Todos los juegos» (D5). Una propuesta que quedó pendiente al salir de la agenda ya se
    descartó (RF-30).

  El filtro y la sesión abierta se conservan hasta que se limpia la sesión del cliente o entra un
  usuario (RF-16), o hasta que se recarga la pestaña (RF-19). Este RF sustituye a la R7 de la spec
  009 (RF-2) y a las partes de la spec 009 que dependen de ella («Impacto en otras specs»).
- RF-16: CUANDO se limpia la sesión del cliente (cierre de sesión, consulta de sesión con 401,
  401 en una operación protegida o cambio de sesión en otra pestaña) o entra un usuario, EL
  SISTEMA devuelve el almacén de la agenda al estado inicial. Lo hace antes de pintar ninguna
  vista con el usuario nuevo o sin usuario. Ningún filtro, sesión abierta (confirmada o por
  confirmar), borrador ni propuesta de una cuenta llega a otra cuenta, ni a la misma tras volver
  a entrar. Se mantiene la limitación declarada de la spec 007: el borrador sin enviar se pierde
  cuando RF-6 o RF-7 llevan a login.
- RF-17: EL SISTEMA mantiene local, como hoy, el estado que el inventario no manda al almacén:
  - la ventana «Cancelar sesión» de la agenda, su mensaje y las reglas de foco (spec 009, RF-19,
    RF-23 y RNF-2);
  - el estado de las escrituras de la agenda en curso (unirse, salir y cancelar, con su
    «Enviando…») y el aviso de error de unirse o salir que muestra el panel;
  - lo escrito en «Anotar una sesión», su error de título y el error de la creación que devuelve
    el servidor;
  - la marca de foco al volver del detalle tras cancelar (spec 009, RF-8), que sigue viajando en
    el estado de la navegación, y la marca de que esa llegada ya movió el foco;
  - las guardas contra el doble envío (spec 007, RF-20);
  - todo el estado del detalle de una sesión de juego, que se lee de nuevo en cada apertura
    (spec 009, RF-1 y R1).

  Al volver a la agenda no se ve nada de eso de la visita anterior: ni la ventana, ni un
  «Enviando…», ni un aviso de error, ni el formulario con lo escrito, como hoy. Una escritura de
  la agenda (unirse, salir o cancelar) que responde con éxito con el jugador fuera de la agenda
  aplica su resultado, como hoy, a las listas de la agenda guardadas en la memoria de datos y las
  marca como desactualizadas, aunque la agenda ya no esté en pantalla; al volver, la agenda pide
  la de su filtro (RF-15). Es el mismo efecto que la spec 009, RF-15, fija para las acciones del
  detalle, pero esa RF solo cubre las del detalle (spec 009, Definiciones, «Acción»): para las de
  la agenda es comportamiento actual que esta spec mantiene. Ninguno de esos comportamientos
  cambia.
- RF-18: EL SISTEMA no muestra en el detalle de una sesión de juego ningún dato tomado del almacén
  de la agenda. El detalle sigue actualizando la agenda solo a través de la memoria de datos
  (spec 009, RF-15).

### Comunes
- RF-19: EL SISTEMA no guarda el contenido de ninguno de los dos almacenes en ningún
  almacenamiento del navegador (almacenamiento local o de sesión, IndexedDB, cookies). Al recargar,
  la sesión iniciada sale de la consulta de sesión (RF-2) y la agenda del estado inicial. Lo único
  que la interfaz guarda en el navegador sigue siendo: el comprobante anti-CSRF, la señal entre
  pestañas, la preferencia de tema y la base del modo simulado (spec 007, RF-2 y RF-19).
- RF-20: MIENTRAS está activo el modo simulado, EL SISTEMA aplica RF-1 a RF-19, RF-21 y RF-23 a
  RF-30 igual que con el servidor real.
- RF-21: MIENTRAS la interfaz corre en modo de desarrollo, EL SISTEMA conecta cada uno de los dos
  almacenes a las herramientas de depuración del navegador (D4), con un nombre distinto para cada
  almacén, de modo que con la extensión de depuración instalada se ven los dos almacenes, su
  contenido actual y cada cambio con el nombre de la operación que lo produjo. Lo que se ve es
  solo el contenido de los almacenes (RF-1, RF-10): nunca el comprobante anti-CSRF ni
  contraseñas. SI la extensión no está instalada, ENTONCES EL SISTEMA funciona igual y la consola
  del navegador no muestra ningún error de los almacenes. El único aviso de los almacenes que
  puede mostrar es el de la biblioteca que indica que falta la extensión, como máximo uno cada vez
  que se crea un almacén. Se comprueba así: en una carga completa de la página, sin recargas en
  caliente del servidor de desarrollo entre medias (pueden volver a crear los almacenes y no se
  cuentan), tras usar la sesión iniciada y entrar en la agenda, salir y volver a ella varias
  veces, la consola muestra como máximo un aviso del almacén de la sesión iniciada y como máximo
  uno del almacén de la agenda (este puede aparecer la primera vez que se entra en la agenda, si
  su almacén se crea entonces), y ningún otro aviso de los almacenes. **Riesgo declarado para el
  plan (H8)**: la conexión que trae Zustand escribe ese aviso cuando no encuentra la extensión;
  el plan decide si lo deja (cumple este RF) o si conecta solo cuando la extensión está
  presente, sin dependencias nuevas (RNF-1).
- RF-22: EL SISTEMA no conecta ningún almacén a las herramientas de depuración en la construcción
  de producción (D4): con la extensión de depuración instalada, la aplicación servida desde esa
  construcción no muestra ningún almacén ni le envía estado, y la consola no muestra el aviso de
  RF-21.

## Requisitos no funcionales
- RNF-1: Dependencias, todas con versión exacta (constitución, principio 1; `AGENTS.md`,
  `--save-exact`) y justificadas en el plan:
  - Zustand, como dependencia de producción (enunciado: «Zustand o Redux Toolkit»; decisión del
    usuario). No entra ninguna otra dependencia de producción; la conexión de RF-21 usa lo que trae
    Zustand.
  - Vitest, como dependencia de desarrollo (D3), en una versión compatible con la versión de Vite
    del proyecto (5.4); actualizar Vite queda fuera de alcance (riesgo en RNF-5). Otra dependencia
    de desarrollo solo entra si el plan demuestra que Vitest la necesita para las pruebas de
    RNF-5; en ese caso, la mínima.
- RNF-2: Sin regresiones visibles. No cambian la disposición, los estilos, los textos, los
  avisos, los anuncios a lectores de pantalla, el foco ni las entradas del historial de ninguna
  vista. Solo cambia lo que fijan estos RF, que son la lista completa de diferencias visibles:
  1. RF-15: la agenda conserva el filtro y la sesión abierta al salir y volver.
  2. RF-25 y RF-26: con una sesión abierta por confirmar que la lista que se ve no contiene, el
     panel muestra «Sesión abierta», «Ver las mías» y el estado de carga «Cargando…» (anunciado
     como estado) hasta la respuesta que decide, o, ante un fallo de la lista (respuesta de
     error, red cortada, servidor caído o plazo de 30 s), el error de la lista con «Reintentar»
     en lugar de «Cargando…», también mientras «Reintentar» vuelve a pedirla (D10, I-1); al
     volver tras cancelar en el detalle, el título del panel con el foco puede decir primero
     «Sesión abierta» y luego «Mis sesiones» (cambia la spec 009, RF-8).
  3. RF-24: la sesión de juego recién creada queda abierta si la confirmación llega con la
     pestaña todavía en la agenda (cambio nuevo, D6).
  4. RF-13: «Anotar una sesión» se abre con el primer juego vinculado cuando el filtro es de un
     juego que el jugador no tiene vinculado, nunca o ya no (mejora, H3).
  5. RF-14 y RF-30: la propuesta llega por el almacén y se descarta al recargar o salir de la
     agenda antes de aplicarse.
  6. RF-28 (H15): con un filtro conservado de un juego, al llegar desde «Proponer» se ve primero
     ese filtro pulsado y se pide su lista mientras se esperan las cuentas; al aplicarse la
     propuesta, el filtro pasa a «Todos los juegos» y se pide otra lista. Hoy se llega siempre con
     «Todos los juegos». Si la propuesta se descarta, el filtro conservado no cambia.
  La línea base es el recorrido «Sesión y conexión» (5.A) del registro de validación de la spec
  007 y los pasos de agenda del registro de validación de la spec 009, repetidos tras el cambio
  con el mismo resultado salvo esos puntos.
- RNF-3: TypeScript estricto, sin `any`, `@ts-ignore` ni aserciones para esquivar tipos en el
  código nuevo, incluidas las pruebas. Construcción (que es la que comprueba tipos, `MEMORY.md`),
  comprobación de tipos y lint del frontend en verde.
- RNF-4: Las reglas puras de la agenda viven en el dominio, sin React, sin almacén y sin reloj
  (constitución, principio 3). Son dos: la regla de aplicación de la propuesta (RF-29) y la
  elección de si se abre el borrador y con qué juego, según el filtro y el estado de la carga de
  las cuentas (RF-13). Los almacenes no llaman a `fetch` ni a
  ninguna otra función de red directamente: acceden a la red solo a través del contrato de datos,
  como hoy las vistas.
- RNF-5: Pruebas automáticas con Vitest en el frontend (D3), versionadas y ejecutables con un
  script `test` del frontend. Se escriben antes que el código (en rojo por la razón correcta,
  después en verde; evidencia en los criterios de finalización). Corren sin red, sin servidor y
  sin navegador real. Cubren la parte de cada RF que es transición de un almacén o regla pura. El
  resultado observable de cada prueba es uno de estos: el contenido del almacén tras el evento;
  las llamadas que el almacén hace al contrato de datos, a la navegación y al aviso entre
  pestañas, sustituidos en la prueba; o la salida de la regla pura.
  - Almacén de la sesión iniciada:
    - RF-2: paso de `checking` a `authenticated`, `anonymous` o `error` según la respuesta; la
      respuesta de una consulta anterior a la última no cambia nada; una consulta cancelada por
      una limpieza se repite;
    - RF-3 y RF-4: memoria vaciada, usuario puesto, aviso a las otras pestañas y una sola
      navegación que sustituye la entrada, a la ruta de origen o a Inicio; registro con inicio de
      sesión fallido: navegación a login con el correo y el aviso;
    - RF-5: limpieza aunque el aviso al servidor falle; comprobante propio borrado antes del aviso
      a las otras pestañas; navegación a login que sustituye la entrada;
    - RF-6: con muchos 401, un solo aviso y una sola navegación; los 401 de antes de la última
      limpieza no hacen nada; el usuario se quita antes de vaciar la memoria; ruta de origen igual
      a la ruta en pantalla que recibe el almacén;
    - RF-7: limpieza sin borrar el comprobante; navegación solo con usuario de sesión y ruta
      protegida; en `checking` o `error`, solo limpieza;
    - RF-8: usuario actualizado; sin usuario de sesión, nada cambia.
  - Almacén de la agenda (RF-11 a RF-16 y RF-23 a RF-30), entre otros estos resultados:
    - volver con una sesión abierta conservada y una lista guardada que no la contiene: la sesión
      sigue en el almacén y está por confirmar; con la respuesta que decide sin ella, el almacén
      queda sin sesión abierta; con ella, sigue abierta y confirmada; la lista guardada o la del
      filtro anterior no deciden;
    - una respuesta correcta de una petición que empezó antes del hecho y llega después decide
      (D10);
    - un fallo de la lista, con un error con mensaje y con un error sin mensaje (que es como
      llegan la red cortada, el servidor caído y el plazo de 30 s, spec 007, RF-20), deja la
      sesión abierta por confirmar, y decide la siguiente respuesta correcta que llega (D10,
      I-1). Que una respuesta tardía no se aplique lo garantiza el transporte de la spec 007,
      RF-20, y no se prueba aquí;
    - durante la espera, elegir otro filtro: decide la respuesta del filtro nuevo;
    - crear una sesión de juego con la agenda en pantalla: queda abierta por confirmar; si la
      confirmación llega tras salir de la agenda, el almacén no cambia (RF-24);
    - sesión confirmada que deja de estar en la lista que se ve: se cierra;
    - «Ver las mías» y elegir otra sesión terminan la espera;
    - una propuesta nueva sustituye a la pendiente (RF-14);
    - «aplicar»: borrador con los datos, filtro «Todos los juegos» y propuesta quitada;
      «descartar»: filtro, sesión abierta y borrador intactos y propuesta quitada; «esperar»: nada
      cambia;
    - salir de la agenda con una propuesta pendiente: descartada; un almacén recién creado (como
      tras recargar) está en el estado inicial;
    - salir de la agenda: el borrador se cierra y el filtro y la sesión abierta siguen;
    - reinicio al limpiar la sesión del cliente o al entrar un usuario (RF-16).
  - Reglas puras (RNF-4; C2): RF-29, los cinco casos y su prioridad (sin usuario con cuentas
    cargando da «descartar»; carga fallida da «descartar» aunque haya cuenta en el juego); RF-13,
    filtro vinculado, «Todos los juegos», filtro de un juego nunca vinculado, filtro de un juego
    ya desvinculado, orden de la lista de cuentas, sin cuentas recibidas (primera carga en curso
    o fallida) y cuentas recibidas sin ningún juego vinculado (estos dos, «no se abre»).

  Lo que depende de React, del router o del navegador no se prueba con Vitest: se comprueba en el
  recorrido manual de los criterios de finalización y, cuando exista, en las pruebas E2E de la
  spec 018. Es: lo que se ve y el foco (el «Cargando…» y el foco en «Reintentar» de RF-2; el
  panel, su título y su foco de RF-25 y RF-26; ninguna vista intermedia en RF-3); el montaje doble
  del modo de desarrollo (RF-2); que la ruta de origen sea la de la vista en pantalla (RF-6); la
  vigilancia real entre pestañas, en 5 s, con la pestaña oculta y sin almacenamiento (RF-7);
  «Atrás», «Adelante» y recarga (RF-15, RF-30); y RF-21 y RF-22.

  **Riesgos para el plan (H13)**: (a) si alguna transición solo se puede probar con un entorno de
  navegador simulado, hace falta otra dependencia de desarrollo (RNF-1); el plan debe intentar
  evitarlo haciendo que los almacenes reciban el contrato de datos, la navegación, la ruta y el
  aviso entre pestañas desde fuera, de modo que las pruebas corran en el entorno de Node; (b) las
  versiones más recientes de Vitest pueden exigir una versión de Vite mayor que la 5.4 del
  proyecto: el plan fija una versión exacta de Vitest cuya compatibilidad con Vite 5.4 compruebe
  la instalación sin avisos de dependencias incompatibles.

  Ninguna tarea se cierra con esa suite en rojo ni con un `.only` (constitución, principio 4,
  enmendado por el usuario el 2026-11-21, D9). Esta spec es «la spec que dice otra cosa» del
  principio 4 para el frontend, limitada a los almacenes y a las reglas de RNF-4. La
  construcción de producción no incluye las pruebas.
- RNF-6: La conexión de RF-21 se activa por el modo de la construcción, no por una variable que
  haya que acordarse de cambiar al desplegar. Comprobable: la construcción de producción hecha con
  el procedimiento de la spec 010, sin ninguna variable nueva, cumple RF-22.

## Casos límite
- 401 con «Anotar una sesión» abierto y algo escrito: va a login con el aviso de RF-6. El
  borrador se pierde (limitación de la spec 007). Al volver a entrar, la ruta de origen es
  `/agenda` y la agenda está en su estado inicial (RF-16).
- Otra pestaña inicia sesión con otra cuenta mientras esta tiene un filtro y una sesión de juego
  abierta: esta pestaña va a login con el aviso de RF-7. Al entrar, la agenda está en su estado
  inicial y muestra solo datos de la cuenta nueva (RF-16).
- Dos pestañas con la agenda: cada una tiene su almacén. Cambiar el filtro en una no cambia la
  otra (Definiciones, almacén global).
- Varios 401 a la vez mientras el almacén de la agenda tiene estado: una sola entrada de login,
  un solo aviso y un solo reinicio del almacén (RF-6, RF-16).
- Cambio de sesión en otra pestaña y 401 en esta casi a la vez: se aplica solo lo que llega
  primero, como en la spec 007 (casos límite de RF-24).
- Montaje doble en desarrollo: una sola consulta de sesión cuenta y no se queda en «Cargando…»
  (RF-2).
- Cerrar sesión con el servidor caído: se limpia igual, se reinicia la agenda y se va a login
  (RF-5, RF-16).
- Sesión de juego abierta que se cancela desde su detalle: la agenda vuelve con el foco en el
  título del panel (spec 009, RF-8). El filtro se conserva. La sesión abierta queda por
  confirmar: como el detalle ya la quitó de las listas guardadas, el panel muestra «Sesión
  abierta», «Ver las mías» y «Cargando…»; al llegar la respuesta que decide, se cierra y el
  título, con el foco todavía en él, pasa a «Mis sesiones» (RF-25, RF-26).
- Sesión de juego abierta que otro jugador cancela mientras el jugador está en otra vista: al
  volver, la lista guardada aún la contiene y se ve su tarjeta; la lista se vuelve a pedir y, si
  ya no está, se muestra «Mis sesiones» (RF-15, RF-26).
- Volver a la agenda cuando la memoria de datos no tiene la lista de ese filtro, o la tiene sin
  la sesión abierta: el panel muestra «Sesión abierta» con «Cargando…», no «No estás en ninguna
  sesión»; al llegar la respuesta que decide se muestra la tarjeta o «Mis sesiones» (RF-25,
  RF-26). Si la lista falla (respuesta de error, red cortada, servidor caído o plazo de 30 s),
  la semana muestra el error de la lista como hoy, el panel muestra ese error con «Reintentar»
  en lugar de «Cargando…», también mientras «Reintentar» vuelve a pedirla, y la sesión sigue
  abierta por confirmar hasta la siguiente respuesta correcta (RF-25, D10, I-1).
- Volver a la agenda con una sesión abierta conservada que la lista guardada contiene, y que la
  lista falle: la semana muestra el error y el panel sigue mostrando su tarjeta con los datos de
  la lista guardada; la sesión sigue por confirmar hasta la siguiente respuesta correcta (RF-25,
  I-2).
- Sesión abierta confirmada y fallo de la lista: si el filtro vigente tiene lista recibida que
  la contiene, sigue abierta con su tarjeta mientras la semana muestra el error; si el jugador
  acaba de elegir un filtro sin lista recibida y su primera petición falla, se cierra y se
  muestra «Mis sesiones», como hoy (RF-27, I-2).
- Respuesta de la lista que llega después del plazo de 30 s: la petición ya se dio por fallida
  (error con «Reintentar»), y esa respuesta no se aplica ni decide (Definiciones, spec 007,
  RF-20).
- Volver a la agenda mientras sigue en curso una petición de la lista de ese filtro enviada antes
  de salir: no se envía otra; la respuesta de esa petición llega después de volver y decide
  (Definiciones, RF-15, D10).
- Volver a la agenda con una sesión abierta por confirmar y elegir otro filtro antes de que
  llegue la lista: decide la lista del filtro nuevo, no la del anterior (RF-11, RF-26).
- Volver con una sesión abierta por confirmar y pulsar «Ver las mías» o elegir otra sesión de
  juego en la semana: la espera termina sin esperar la respuesta (RF-12, RF-23).
- Crear una sesión de juego con el filtro «Todos los juegos»: queda abierta; mientras la lista
  vuelve a pedirse el panel muestra «Sesión abierta» con «Cargando…» y, al llegar la lista que la
  contiene, su tarjeta (RF-24 a RF-26).
- Crear con el filtro CS2 una sesión de juego de LoL (elegida en el selector «Juego»): queda
  abierta por confirmar y, como la lista de CS2 que llega no la contiene, se cierra y se muestra
  «Mis sesiones» de CS2 (RF-26).
- Crear una sesión de juego y que la nueva petición de la lista falle (respuesta de error, red
  cortada, servidor caído o plazo de 30 s): la semana muestra el error de la lista; el panel,
  que no tiene la sesión en la lista que se ve, muestra ese error con «Reintentar» en lugar de
  «Cargando…»; la sesión sigue abierta por confirmar y decide la siguiente respuesta correcta
  (RF-25, D10, I-1).
- Crear una sesión de juego y salir de la agenda antes de que llegue la lista: la petición que
  salió con la confirmación de la creación no se cancela. La sesión creada se conserva como
  sesión abierta (RF-15). Si la respuesta llega con la pestaña fuera de la agenda, queda guardada
  en la memoria de datos y no decide. Al volver, la sesión queda por confirmar de nuevo: si esa
  petición sigue en curso, se reutiliza y su respuesta decide; si ya llegó, la agenda pide la
  lista otra vez y decide esa respuesta. Mientras tanto, si la lista guardada la contiene, se ve
  su tarjeta (RF-15, RF-25, RF-26, D10).
- Pulsar «Anotar sesión» en el formulario y salir de la agenda (por ejemplo, con «Atrás»)
  mientras el botón dice «Enviando…»; el servidor confirma después: la confirmación no cambia el
  almacén de la agenda. Al volver, la sesión creada no está abierta ni por confirmar; si había
  una sesión abierta conservada, sigue esa. Cuando llega la lista, la sesión creada aparece en la
  semana si el filtro conservado es «Todos los juegos» o el de su juego, y en «Mis sesiones» si,
  además, el panel muestra «Mis sesiones» (con una sesión abierta conservada, tras pulsar «Ver
  las mías»). Pasa lo mismo si el jugador ya había vuelto a la agenda cuando llega la
  confirmación (RF-24, como hoy).
- Filtro de un juego que el jugador desvinculó en Configuración: el filtro se conserva al volver,
  porque los filtros de la agenda no dependen de las cuentas, como hoy. «Anotar una sesión» se
  abre con el primer juego vinculado, no con el del filtro (RF-13). Si ya no le queda ningún
  juego vinculado, no se abre (RF-13).
- Filtro de un juego que el jugador nunca vinculó (por ejemplo, R6 con solo LoL vinculado):
  «Anotar una sesión» se abre con LoL y crear no recibe el 400 de la spec 006, RF-27; hoy se abre
  con R6 y el envío recibe ese 400 (RF-13, mejora H3).
- Jugador que vinculó CS2 antes que LoL, con el filtro «Todos los juegos»: «Anotar una sesión» se
  abre con CS2, como hoy, aunque el selector «Juego» liste LoL primero (RF-13, H6).
- Salir de la agenda con «Anotar una sesión» abierto y volver: el formulario está cerrado y lo
  escrito se perdió; el filtro y la sesión abierta siguen (RF-15).
- Salir de la agenda con una escritura en curso o con un aviso de error de unirse o salir a la
  vista, y volver: no se ve «Enviando…» ni el aviso; el resultado de la escritura se refleja en
  las listas de la memoria de datos, como hoy (RF-17).
- Recargar la agenda con filtro, sesión abierta o borrador: vuelve al estado inicial (RF-19).
- Recargar la agenda mientras una propuesta espera las cuentas: la agenda vuelve al estado
  inicial y el formulario no se abre (RF-30, cambio aceptado en D2).
- Salir de la agenda mientras una propuesta espera las cuentas y volver: el formulario no se
  abre (RF-30).
- Pulsar «Proponer» y, antes de que se muestre la agenda, pulsar «Atrás»: la propuesta se
  descarta; la próxima vez que el jugador vaya a la agenda no se abre ningún formulario (RF-30).
- «Proponer», aplicar la propuesta, ir a otra vista y volver con «Atrás» o «Adelante» a la
  agenda: el formulario no se vuelve a abrir (RF-28).
- Almacenamiento del navegador bloqueado: los almacenes funcionan igual, porque viven en memoria.
  La sesión iniciada se comporta como dice la spec 007, RF-3.
- Llegar a la agenda con una propuesta de LoL teniendo conservado el filtro de CS2: mientras se
  esperan las cuentas se ve el filtro CS2 pulsado y se pide su lista; al aplicarse, el formulario
  se abre con LoL y, a la vez, el filtro pasa a «Todos los juegos», que pide su lista (RF-28, D5,
  H15). Al crear la sesión de juego, esta queda abierta y, al llegar la lista de «Todos los
  juegos», se ve en «Sesión abierta» y, tras pulsar «Ver las mías», en «Mis sesiones» (RF-24 a
  RF-26).
- Mismo caso con una sesión de juego de CS2 abierta y conservada: sigue abierta, porque está en la
  lista de «Todos los juegos» (RF-11, RF-26); al crear la nueva, pasa a estar abierta la nueva
  (RF-24).
- Mismo caso, pero el jugador cierra el formulario sin crear nada: el filtro queda en «Todos los
  juegos»; el de CS2 se recupera eligiéndolo (RF-11, RF-28).
- Llegar con una propuesta de un juego sin cuenta, o con la carga de las cuentas fallida,
  teniendo conservado el filtro de CS2: la propuesta se descarta y el filtro sigue en CS2 (RF-28,
  RF-29).
- Llegar con una propuesta teniendo el filtro ya en «Todos los juegos»: el filtro sigue igual y
  el formulario se abre como hoy (RF-28).
- Modo de desarrollo sin la extensión de depuración: todo funciona igual y la consola no muestra
  errores de los almacenes. En una carga completa, sin recargas en caliente, sale como máximo un
  aviso de la biblioteca sobre la extensión que falta por cada almacén creado: el de la agenda
  puede salir la primera vez que se entra en ella y no se repite al salir y volver. Una recarga
  en caliente puede volver a crear un almacén y repetir su aviso; no cuenta (RF-21).
- Cuentas del jugador todavía cargando al llegar a la agenda: el botón «Anotar sesión» está
  deshabilitado, elegir un bloque no abre nada y no se ve ni el error ni el aviso «Necesitas al
  menos un juego vinculado…». Si la carga falla, se ve el error con «Reintentar», no ese aviso, y
  el formulario sigue sin abrirse hasta que la carga tenga éxito (RF-13, como hoy).
- Vista previa local de la construcción de producción con la extensión instalada: no aparece
  ningún almacén ni el aviso de RF-21 (RF-22).

## Fuera de alcance
- Librería de estilos (Mantine): spec 017. Pruebas E2E con Playwright en `e2etests/`: spec 018.
- Mover datos del servidor a un almacén global: siguen en la memoria de datos (decisión del
  usuario).
- La preferencia de tema: sigue como está. La spec 017 decide cómo la gestiona Mantine.
- El estado de otras vistas (filtros de coincidencias, pestaña de la ficha, formularios de
  perfil, Configuración y verificación con Steam o Riot): no cambia.
- Conservar el borrador de «Anotar una sesión» al salir de la agenda (D1, opción C descartada).
- Guardar el estado de interfaz entre recargas o entre pestañas.
- Mostrar en los filtros de la agenda solo los juegos vinculados: siguen los tres del catálogo
  (H3).
- Pruebas automáticas de componentes o vistas del frontend, y de cualquier pieza fuera de los
  almacenes y de las reglas de RNF-4.
- Cambios en el ruteo, entendidos como cambios observables: rutas y direcciones, sus reglas de
  acceso, las entradas que se añaden o sustituyen en el historial y el comportamiento de «Atrás»,
  «Adelante» y recarga (specs 007 y 010). También queda fuera cambiar la forma en que se montan
  la navegación del navegador y las rutas, aunque el cambio no tuviera efecto observable (Q1,
  opción A).
- Cambios en el servidor, en el contrato de datos o en el modo simulado más allá de RF-20.
- Actualizar Vite (RNF-1).
- El despliegue real (spec 010, T9).

## Criterios de finalización
- [x] **Condición previa a la aprobación de esta spec**: el usuario enmendó en
      `docs/constitution.md` los principios 1 y 4 el 2026-11-21 (D3, D9, Q2). El texto vigente,
      que es el que vale, se copia en «Impacto en otras specs y en la constitución».
- [ ] Hay exactamente dos almacenes globales (sesión iniciada y agenda), hechos con Zustand en
      versión exacta, y ya no existe el reparto por contexto del estado de la sesión iniciada
      (RF-1, RNF-1). Vitest está como dependencia de desarrollo en versión exacta, compatible con
      Vite 5.4, y no hay otra dependencia nueva sin justificar en el plan (RNF-1).
- [ ] Repetido el recorrido 5.A de la spec 007 contra el servidor real, todo da el mismo
      resultado: carga, recarga, error y «Reintentar», login con y sin ruta de origen, registro,
      cierre de sesión, 401 con un solo aviso, cambio de sesión en otra pestaña y almacenamiento
      bloqueado (RF-2 a RF-7, RF-9). Se repite con los pasos y el entorno que describe esa sección
      del registro de validación de la spec 007 (servidor real con una base temporal y
      navegador), y el registro de validación de esta spec anota cada paso con su resultado y si
      coincide con el original.
- [ ] Guardar el perfil con otro nombre visible: la barra de navegación y toda vista que muestra
      al usuario de la sesión lo reflejan sin recargar (RF-8).
- [ ] Repetidos los pasos de agenda de la spec 009 y «Proponer» desde coincidencias y desde la
      ficha, todo da el mismo resultado salvo las diferencias que enumera RNF-2 (RF-10 a RF-18,
      RF-23 a RF-30).
- [ ] Salir de la agenda y volver (por un enlace, por «Atrás» y desde el detalle) conserva el
      filtro y la sesión abierta, cierra el borrador, no muestra «Enviando…» ni avisos de la
      visita anterior, y recargar devuelve el estado inicial (RF-15, RF-17, RF-19).
- [ ] Volver a la agenda con una sesión abierta conservada que la lista guardada no contiene (o
      sin lista guardada): el panel muestra «Sesión abierta», «Ver las mías» y «Cargando…», nunca
      «No estás en ninguna sesión», y al llegar la lista muestra la tarjeta o «Mis sesiones».
      Con la petición de la lista fallando de cada una de estas formas: servidor detenido, red
      cortada («Sin conexión» en las herramientas del navegador) y sin respuesta en 30 s (un
      perfil de red personalizado con más de 30 s de latencia), el panel muestra el error con
      «Reintentar» en lugar de «Cargando…», como la semana; mientras la petición de «Reintentar»
      está en curso, la semana y el panel siguen mostrando el error, sin «Cargando…», y se ve el
      indicador «Actualizando»; tras «Reintentar» con el servidor y la red de vuelta, la tarjeta o
      «Mis sesiones» (D10, I-1). Con una lista guardada que sí contiene la sesión abierta y la
      lista fallando, el panel muestra su tarjeta mientras la semana muestra el error (I-2).
      Cancelar en el detalle la sesión abierta: al volver, el foco está en el título del panel y
      sigue en él cuando pasa a «Mis sesiones» (RF-25, RF-26).
- [ ] Crear una sesión de juego con «Todos los juegos»: tras la nueva lista, queda abierta en
      «Sesión abierta» y, tras «Ver las mías», aparece en «Mis sesiones». Con el filtro de otro
      juego, se cierra al llegar la lista del filtro. Con «Todos los juegos» y sin sesión abierta,
      salir de la agenda con «Atrás» mientras el formulario dice «Enviando…» (para que la
      confirmación llegue después de salir, con un perfil de red lenta en las herramientas del
      navegador que retrase la respuesta de la creación unos segundos, menos de 30 s, y
      esperando a que la pestaña de red la muestre terminada antes de volver): al volver, la
      sesión creada no está abierta y, al llegar la lista, aparece en la semana y en «Mis
      sesiones» (RF-24 a RF-26).
- [ ] Con las cuentas del jugador cargando (red lenta en las herramientas del navegador) o con
      su carga fallida, «Anotar sesión» está deshabilitado y elegir un bloque no abre nada; con
      la carga fallida se ve el error con «Reintentar» y no el aviso «Necesitas al menos un juego
      vinculado…» (RF-13).
- [ ] Con el filtro de un juego que el jugador no tiene vinculado (nunca y ya no), «Anotar una
      sesión» se abre con el primer juego vinculado y crear no recibe 400 (RF-13).
- [ ] Recargar o salir de la agenda mientras una propuesta espera las cuentas la descarta
      (RF-30).
- [ ] Con el filtro de un juego conservado, «Proponer» de otro juego: durante la espera se ve el
      filtro conservado; al abrirse el formulario solo «Todos los juegos» está pulsado y, al crear
      la sesión de juego, esta aparece abierta y, tras «Ver las mías», en «Mis sesiones». Con
      una propuesta descartada
      (sin cuenta en ese juego o carga de las cuentas fallida), el filtro conservado no cambia
      (RF-28, RF-29, D5).
- [ ] Tras cerrar sesión, tras un 401 y tras un cambio de sesión en otra pestaña, el almacén de la
      agenda está en su estado inicial y no se ve nada de la cuenta anterior (RF-16).
- [ ] Las herramientas del navegador no muestran claves nuevas en ningún almacenamiento tras usar
      la agenda y la sesión iniciada (RF-19).
- [ ] Lo mismo en modo simulado (RF-20).
- [ ] En modo de desarrollo, la extensión de depuración muestra los dos almacenes con nombres
      distintos y sus cambios; sin la extensión, en una carga completa sin recargas en caliente,
      tras entrar, salir y volver a la agenda varias veces, la consola no muestra errores de los
      almacenes y muestra como máximo un aviso sobre la extensión que falta del almacén de la
      sesión iniciada y uno del de la agenda (RF-21). En la construcción de producción, hecha
      sin variables nuevas, la extensión no muestra ningún almacén y no aparece ese aviso
      (RF-22, RNF-6).
- [ ] `npm test` del frontend en verde y sin `.only` (RNF-5). Evidencia de que las pruebas se
      escribieron antes que el código: el registro de validación de esta spec anota, por cada
      tarea con pruebas, la salida de la ejecución en rojo con el motivo del fallo, antes de
      escribir el código, y la salida en verde después.
- [ ] Construcción, comprobación de tipos y lint del frontend en verde; sin `any` ni
      `@ts-ignore` nuevos (RNF-3).
- [ ] `AGENTS.md` y `MEMORY.md` describen los dos almacenes y el script `test` del frontend
      (estructura, comandos y estado del código).

## Decisiones
Decididas por el usuario el 2026-11-21, a partir de las dudas D1–D4 del borrador del 2026-11-20
y de la duda D5 que apareció al cerrarlas.

- **D1. Qué recuerda la agenda al salir y volver sin recargar → opción B** (la recomendada).
  Recuerda el filtro de juego y la sesión de juego abierta hasta cerrar sesión (o cualquier
  limpieza de la sesión del cliente, o la entrada de un usuario) o recargar. El borrador no se
  recuerda. Sustituye a la R7 de la spec 009 (RF-2). Subpregunta: si el juego del filtro ya no
  está vinculado, «Anotar una sesión» usa el primer juego vinculado → **sí** (la recomendada).
  Descartadas: A (no recordar nada, como hoy) y C (recordar también el borrador con lo escrito).
  Reflejada en RF-13, RF-15 y RNF-2.
- **D2. Por dónde llega la propuesta de «Proponer» → opción B** (la recomendada). Llega por el
  almacén de la agenda, no por el estado de la navegación, desde coincidencias y desde la ficha
  de jugador. Se acepta la diferencia con hoy: si se recarga o se sale de la agenda mientras
  espera las cuentas, la propuesta se descarta. Descartada: A (estado de la navegación, como hoy).
  Reflejada en RF-10, RF-14, RF-30 y RNF-2.
- **D3. Cómo se prueban los almacenes → opción B: Vitest.** El usuario no eligió la opción
  recomendada (A, node:test). Los almacenes se prueban con Vitest en el frontend, con pruebas
  primero y un script `test` en el frontend. Obliga a enmendar el principio 1 de la constitución
  («Tests: node:test»). Descartadas: A (node:test) y C (sin pruebas automáticas). Reflejada en
  RNF-1, RNF-5 y en «Impacto en otras specs y en la constitución».
- **D4. Inspección con las herramientas de depuración del navegador → opción B** (la
  recomendada). Solo en modo de desarrollo, nunca en la construcción de producción. Descartada:
  A (nunca). Reflejada en RF-21, RF-22 y RNF-6.
- **D5. Filtro conservado cuando llega una propuesta de otro juego → opción C** (la recomendada).
  Al aplicar una propuesta de «Proponer», el filtro de juego pasa a «Todos los juegos», como hoy
  al llegar; si la propuesta se descarta, el filtro no cambia. El usuario delegó la elección en
  el coordinador pidiendo «la opción que dé mejor experiencia de usuario» y aceptó esta
  justificación:
  1. Al elegir el bloque de la nueva sesión de juego se ven todos los compromisos del jugador en
     todos los juegos, lo que evita solapar sesiones de juegos distintos en la misma hora (B lo
     ocultaría).
  2. Es el comportamiento actual al llegar desde «Proponer»: sin regresión visible, y los
     recorridos de las specs 007 y 008 siguen valiendo.
  3. La sesión de juego recién creada aparece abierta y en «Mis sesiones» (con A, el filtro de
     otro juego la dejaría fuera de la lista y la cerraría). **Corrección del 2026-11-21 (H1)**:
     este motivo se apoyaba en un supuesto erróneo, que hoy la sesión recién creada queda
     abierta; en realidad hoy se cierra en el acto (RF-24). Ahora lo garantiza el cambio nuevo D6
     (RF-24 a RF-26): con «Todos los juegos», la lista que decide contiene la sesión creada y
     queda abierta; con A, la del filtro de otro juego no la contendría y se cerraría.
  4. Pulsar «Proponer» es un cambio explícito de tarea; el filtro anterior se recupera con un
     clic.

  Descartadas: A (el filtro no cambia y la sesión creada queda fuera de la vista) y B (el filtro
  pasa al juego de la propuesta). Reflejada en RF-28, RF-29, RF-15, RNF-2, RNF-5, casos límite y
  criterios de finalización.
- **C1. Sesión abierta conservada mientras falta la lista** (propuesta por el planificador,
  confirmada por el usuario; precisada por D7 y D10). Al volver a la agenda, la sesión de juego
  abierta conservada no se descarta mientras no llega la respuesta que decide (la lista guardada
  no decide, y un fallo de la lista, con respuesta de error o sin respuesta, no la cierra); la
  respuesta que decide es la primera respuesta correcta que llega y, si ya no está en ella, se
  cierra entonces. Reflejada en RF-15, RF-25, RF-26 y en
  casos límite.
- **C2. Alcance de las pruebas con Vitest** (propuesta por el planificador, confirmada por el
  usuario; precisada por D8). Además de las transiciones de los dos almacenes, las pruebas cubren
  las reglas puras de RNF-4: la regla de aplicación de la propuesta (RF-29) y la elección de si
  se abre el borrador y con qué juego (RF-13; con el estado de la carga de las cuentas desde N5).
  Reflejada en RNF-4, RNF-5 y «Fuera de alcance».

Decididas por el usuario el 2026-11-21 sobre los hallazgos de la revisión QA:

- **D6 (hallazgo H1). Sesión de juego recién creada → queda abierta, como cambio nuevo
  declarado.** La revisión QA vio que hoy se cierra en el acto: el formulario abre la sesión
  creada, la creación solo marca la agenda para volver a pedirla y la agenda cierra la sesión
  abierta que no está en la lista que se ve. El usuario decide que, tras crear, la sesión quede
  abierta y que la agenda no la descarte hasta que una lista que ya la incluya, o una respuesta
  nueva del servidor posterior a la creación, permita decidir. Precisión posterior (D7, D10,
  I-1, I-2): una lista guardada que ya la incluya sirve para pintar su tarjeta, pero no decide;
  decide solo la respuesta que decide, la primera respuesta correcta posterior a la confirmación
  de la creación. Reflejada en RF-24 a RF-26, RNF-2 (punto 3), D5 (motivo 3), casos límite y
  criterios de finalización.
- **D7 (hallazgo H4). Panel al volver con una sesión abierta conservada sin lista confirmada →
  estado de carga y decisión por respuesta nueva.** El panel muestra el estado de carga
  («Cargando…») y no «Mis sesiones» vacío. Si la memoria de datos tiene una lista del mismo filtro
  que la contiene, se usa para pintar su tarjeta de inmediato, pero la decisión de cerrarla la
  toma la primera respuesta nueva del servidor, no la lista guardada ni los datos del filtro
  anterior. Si el jugador cambia de filtro antes, decide la lista del filtro nuevo (RF-11). El
  planificador fija el título y el foco: título «Sesión abierta» con «Ver las mías», el estado de
  carga no toma el foco y el título del panel conserva el foco que tuviera (spec 009, RF-8).
  Reflejada en «Definiciones» (lista que se ve, sesión abierta por confirmar, respuesta que
  decide), RF-15, RF-25, RF-26, C1, RNF-2 (punto 2), RNF-5, casos límite y criterios.
- **D8 (hallazgo H5). Regla pura de la propuesta → la regla que decide cómo se aplica.** Deja de
  ser «leer y validar» un dato sin tipo del estado de la navegación. Pasa a ser la regla de RF-29:
  con usuario de sesión, cuentas cargadas y cuenta en el juego propuesto, se aplica; si no, se
  espera o se descarta y la agenda queda como si se hubiera abierto directamente. Reflejada en
  RF-28, RF-29, RNF-4, RNF-5 y C2.
- **D9 (hallazgo H7). Enmienda de la constitución → la hace el usuario antes de aprobar esta
  spec.** El usuario edita él mismo los principios 1 y 4. La enmienda del principio 4 deja de ser
  una aclaración opcional: es obligatoria. La enmienda es condición previa a la aprobación de esta
  spec. **Hecha por el usuario el 2026-11-21** en `docs/constitution.md`, que es la fuente de
  verdad: el principio 1 coincide con el texto que proponía esta spec; el principio 4 lo escribió
  con una variante propia, que el usuario considera válida (ver Q2). Reflejada en «Estado»,
  «Contexto», «Impacto…» y en el primer criterio de finalización.

Decididas por el usuario el 2026-11-21 sobre las dudas abiertas Q1 y Q2 de la versión corregida:

- **Q1 (hallazgo H12). Montaje del router → opción A** (la recomendada). No se cambia la forma en
  que se monta el router: cambiarla queda fuera de alcance. El almacén de la sesión iniciada
  recibe la ruta en pantalla y la forma de llevar a otra ruta desde una pieza que vive dentro de
  la navegación del navegador (montada siempre), como hoy el proveedor de la sesión iniciada; las
  rutas siguen sin montarse en `checking` y `error`. Motivo: la navegación y las rutas las
  validaron las specs 007, 009 y 010 («Atrás», «Adelante», recarga, ruta de origen) y no hace
  falta cambiarlas para cumplir el enunciado. Descartada: B (permitir cambiar el montaje sin
  cambio observable). Reflejada en RF-1, RF-9 y «Fuera de alcance».
- **Q2 (hallazgo H7). Cambio sin confirmar del principio 1 → se sustituye** (la recomendada).
  Descartada: mantener el cambio sin confirmar («Tests: node:test - vitest - o el que sea
  necesario según el stack utilizado.») y ajustar esta spec a él. **Hecho por el usuario el
  2026-11-21**: el principio 1 vigente coincide con el texto que proponía esta spec. En el
  principio 4 el usuario escribió una variante propia que considera válida: omite el paréntesis
  «(spec 016: almacenes globales y sus reglas puras)» y escribe «rojo -> verde» en la frase
  nueva. Vale el texto de la constitución. El alcance de las pruebas del frontend lo sigue fijando
  esta spec (RNF-5: almacenes y reglas de RNF-4). Reflejada en «Estado», «Impacto…» y en el
  primer criterio de finalización.

Decidida por el usuario el 2026-11-21 sobre la segunda revisión QA:

- **D10 (hallazgo N2). Qué respuesta decide la sesión abierta por confirmar → «la primera que
  llegue»** (precisión de D7). Decide la primera respuesta del servidor a una petición de la lista
  del filtro vigente que llega después del hecho que inició la espera (volver a la agenda, o la
  confirmación de la creación por el servidor), aunque la petición ya estuviera en curso antes de
  ese hecho y la memoria de datos la reutilice. La lista guardada en la memoria de datos nunca
  decide. Si esa respuesta es un error, se muestra el error de la lista con «Reintentar» y no se
  queda en «Cargando…». No se fuerzan peticiones extra. En la creación, el hecho es la
  confirmación del servidor, que es cuando hoy sale la petición nueva de la lista, antes de que
  la agenda reciba el identificador de la sesión creada. **Lectura del planificador, confirmada
  por el usuario el 2026-11-21**: una respuesta con error no cierra ni confirma la sesión; el
  panel, si no tiene su tarjeta, muestra ese error en lugar de «Cargando…» y decide la siguiente
  respuesta correcta que llegue (tras «Reintentar» o cualquier otra petición de esa lista que la
  aplicación envíe hoy). Así, «la primera que llegue» se lee como la primera respuesta correcta:
  los fallos de la lista no deciden (I-1). Se descartó que el error cerrara la sesión, porque
  llevaría a «Mis sesiones» (o a «No estás en ninguna sesión») por un fallo de red, que es lo
  que D7 evita. Reflejada en «Definiciones» (respuesta que decide, fallo de la lista), RF-15,
  RF-24, RF-25, RF-26, RNF-2 (punto 2), RNF-5, C1, casos límite y criterios de finalización.

Decididas por el usuario el 2026-11-21 sobre la tercera revisión QA:

- **I-1. Fallos sin respuesta → cuentan como el error de D10.** La red cortada, el servidor
  caído y el plazo de 30 s de la spec 007, RF-20, se tratan como una respuesta con error: la
  sesión sigue abierta por confirmar, el panel muestra el error de la lista con «Reintentar» si
  no tiene su tarjeta y decide la siguiente respuesta correcta. Una respuesta tardía que llega
  tras el plazo no se aplica (spec 007, RF-20). Reflejada en «Definiciones» (fallo de la lista,
  respuesta que decide), RF-25, RF-26, RNF-2 (punto 2), RNF-5, D10, casos límite y criterios.
- **I-2. Lista que se ve → los datos de la lista del filtro vigente que conserva la memoria de
  datos, también tras un fallo, como hoy.** De ellos salen la tarjeta y «Mis sesiones»; no
  depende de que la semana muestre el error en su lugar. Puede pintar la tarjeta de una sesión
  por confirmar, pero no la decide (D10). Una sesión confirmada se comporta ante un fallo como
  hoy: sigue abierta si la lista conservada la contiene y se cierra si el filtro vigente no
  tiene lista recibida. Reflejada en «Definiciones» (lista que se ve), RF-25, RF-27, casos
  límite y criterios.

Corregidos por el planificador el 2026-11-21, sin decisión del usuario:

- **H6. Orden del «primer juego vinculado» → el de la lista de cuentas del jugador, como hoy.**
  La revisión recomendaba el orden del catálogo (el del selector «Juego»). Se descarta porque hoy,
  con «Todos los juegos», la agenda ya usa la primera cuenta de la lista de cuentas (con el
  servidor real, la vinculada primero), no el orden del catálogo: cambiarlo sería una diferencia
  visible más, no pedida, contra RNF-2 (por ejemplo, quien vinculó CS2 antes que LoL vería LoL en
  lugar de CS2). Usar el mismo orden para el caso nuevo de RF-13 mantiene una sola regla. Si el
  usuario prefiere el orden del catálogo, se añade como diferencia declarada en RNF-2. El
  coordinador informó de esta elección al usuario el 2026-11-21 y el usuario no pidió cambiarla.
- Los demás hallazgos (H2, H3, H8 a H18) se corrigen en el texto sin cambiar el comportamiento
  decidido: impacto en la spec 009, mejora del juego por defecto, aviso de la conexión de
  depuración, acceso a la red, contenido del almacén, estado local, ruta y navegación (cerrado
  con Q1), alcance de las pruebas, evidencias, diferencia visible de la espera de la propuesta,
  EARS, nombres de implementación y origen del enunciado.

Corregidos por el planificador el 2026-11-21 sobre la segunda revisión QA, sin cambiar el
comportamiento decidido (salvo N2, que es D10):

- N1: la constitución vigente es la fuente de verdad; «Estado», «Contexto», D9, Q2, «Impacto…» y
  el primer criterio dicen que la enmienda está hecha y copian el principio 4 tal cual.
- N3: RF-1, RF-9, Q1 y «Fuera de alcance» distinguen la navegación del navegador (montada siempre)
  de las rutas (no montadas en `checking` y `error`), y describen bien el aviso de 401 de hoy.
- N4: RF-21, su caso límite y su criterio cuentan el aviso de la extensión por creación de cada
  almacén en una carga completa, sin recargas en caliente.
- N5: RF-13 cubre la carga de las cuentas (en curso o fallida), como hoy, y su regla pura recibe
  ese estado.
- N6: el juego por defecto de «Anotar una sesión» no lo fija ninguna spec anterior; se saca de
  «Spec 009» en «Impacto…».
- N7: RF-13 usa la forma compuesta «MIENTRAS …, CUANDO …, EL SISTEMA».
- N8: RF-24 y los casos límite cubren la confirmación de una creación que llega con la pestaña
  fuera de la agenda: no cambia el almacén, como hoy.

Corregidos por el planificador el 2026-11-21 sobre la tercera revisión QA, sin cambiar el
comportamiento decidido (I-1 e I-2 los decidió el usuario):

- M-1: D10 marca su lectura como confirmada por el usuario el 2026-11-21.
- M-2: «respuesta que decide» tiene un solo sentido (la primera respuesta correcta tras el
  hecho; los fallos no deciden) en «Definiciones», RF-26, C1, D10 y RNF-5.
- M-3: la lista cerrada de RF-25 incluye crear otra sesión de juego (RF-24), que sustituye a la
  sesión abierta.
- M-4: RF-25 fija qué muestran la semana y el panel mientras está en curso la petición de
  «Reintentar» (el error, sin «Cargando…», con el indicador «Actualizando», como hoy la
  semana), y el criterio lo comprueba.
- M-5: RF-24, su caso límite y los criterios condicionan que la sesión creada aparezca en la
  semana (filtro «Todos los juegos» o el de su juego) y en «Mis sesiones» (panel sin sesión
  abierta, o tras «Ver las mías»), y el criterio dice cómo hacer que la confirmación llegue tras
  salir.
- M-6: RF-24 y RF-17 ya no citan la spec 009, RF-15, como fuente de lo que pasa al crear o al
  escribir desde la agenda (esa RF solo cubre las acciones del detalle): lo describen como
  comportamiento actual (las listas se marcan como desactualizadas y la agenda pide la suya).
- M-7: RF-13 se divide en las cláusulas RF-13.a a RF-13.f, una por estado de las cuentas, sin
  contradicción entre la condición y lo que describe.
- Opcionales: D6 lleva una precisión que la alinea con D10; el nombre accesible del «Reintentar»
  del panel queda para el plan (RF-25); se arreglan los saltos de línea de RF-21, RNF-5 y un
  criterio.

## Dudas abiertas
Ninguna. Q1 y Q2 se cerraron el 2026-11-21, N2 lo decidió el usuario como D10, e I-1 e I-2 los
decidió el usuario el 2026-11-21 (ver «Decisiones»).

## Impacto en otras specs y en la constitución (sin editarlas desde esta spec)
- Spec 007: sus RF de la sesión iniciada no cambian. Cambia dónde vive el estado, no lo que hace.
  RF-30: la propuesta desde coincidencias llega por el almacén de la agenda; recargar o salir de
  la agenda mientras se esperan las cuentas la descarta (hoy recargar la vuelve a aplicar). La
  regla «se usa una sola vez» se mantiene. La aplican RF-14 y RF-28 a RF-30 de esta spec.
- Spec 008, RF-21: lo mismo para la propuesta desde la ficha de jugador (RF-14 y RF-28 a RF-30 de
  esta spec).
- Spec 009. En todo lo que sigue prevalece esta spec, por ser posterior y por las decisiones D1,
  D6 y D7 del usuario; el resto de la spec 009 sigue vigente:
  - RF-2 (R7, «la agenda no recuerda la tarjeta abierta ni el filtro de juego al salir de ella:
    al volver muestra "Mis sesiones" y "Todos los juegos"»): la sustituye RF-15 de esta spec.
  - RF-8 («el foco va al título del panel de la agenda, que entonces es "Mis sesiones" porque la
    agenda no recuerda una tarjeta abierta»): el foco sigue yendo al título del panel, pero su
    texto lo fijan RF-25 y RF-26 de esta spec: «Sesión abierta» mientras la sesión abierta
    conservada está por confirmar y «Mis sesiones» cuando la respuesta que decide la cierra; si
    no había sesión abierta, «Mis sesiones», como hoy.
  - RF-15, última frase («Como la agenda no recuerda su tarjeta abierta (RF-2, R7), al volver
    muestra "Mis sesiones"»): la sustituyen RF-15, RF-25 y RF-26 de esta spec.
  - Caso límite «Volver a la agenda tras una acción» («la agenda llega con "Mis sesiones" y
    "Todos los juegos", porque no recuerda la tarjeta abierta ni el filtro»): la agenda llega con
    el filtro conservado y la sesión abierta por confirmar (RF-15, RF-25, RF-26). Lo demás de ese
    caso (el cambio se ve sin recargar y la sesión cancelada no aparece) sigue igual.
  - «Fuera de alcance», «el hecho de que no recuerde la tarjeta abierta ni el filtro al salir de
    ella siguen como hoy (R2, R7)»: deja de valer para R7; R2 («Sin cupos» y el sello «Estás
    dentro») sigue igual.
- Juego con que se abre «Anotar una sesión»: ninguna spec anterior (006, 007 ni 009) lo define;
  hoy es comportamiento del código. RF-13 de esta spec lo fija por primera vez y no sustituye nada
  de otra spec. La spec 006, RF-27 (400 al crear en un juego sin cuenta vinculada), sigue vigente:
  solo deja de alcanzarse desde la agenda.
- `MEMORY.md` («Deuda conocida»: «El frontend no tiene runner de test») y `AGENTS.md` («No tiene
  script de test»): dejan de ser ciertos al implementar esta spec; se actualizan en el cierre.
  `AGENTS.md` remite a un `HITO2.md` que no existe (H18): el enunciado vigente está en el
  apéndice A de esta spec; corregir esa referencia queda para el cierre, si el usuario lo aprueba.
- **Constitución, principios 1 y 4 (enmiendas obligatorias, D3 y D9).** Hechas por el usuario en
  `docs/constitution.md` el 2026-11-21; esta spec no edita ese archivo. Vale el texto de la
  constitución; se copia aquí tal cual está, para la trazabilidad. El cambio sin confirmar que
  tenía la copia de trabajo en el principio 1 («Tests: node:test - vitest - o el que sea necesario
  según el stack utilizado.») ya no está (Q2):

  Principio 1 (cambió solo la última frase de la primera línea):

  ```
  1. **Stack cerrado.** Frontend: React 18 + TypeScript + Vite. Backend: Express 5 + Mongoose + TypeScript. Tests: node:test en el backend; Vitest en el frontend (spec 016).
     Una dependencia nueva solo entra si una spec aprobada la justifica, y con versión exacta.
  ```

  Principio 4 (se añadió solo la última frase, en la variante del usuario):

  ```
  4. **Tests primero en el backend.** Toda función de dominio y todo endpoint del backend tiene un test con node:test, escrito antes que el código (rojo → verde).
     Ninguna tarea se cierra con tests, typecheck o lint en rojo, ni con un .only en el código. En el frontend bastan build, typecheck y lint en verde, hasta que una spec diga otra cosa. Cuando una spec exige pruebas en el frontend, se escriben con Vitest y también antes que el código (rojo -> verde).
  ```

## Apéndice A — Enunciado del hito (texto aportado por el usuario el 2026-11-20)
Transcripción literal, para la trazabilidad (no está en el repositorio):

> En este hito deberán completar la aplicación como una SPA de producción, incorporando manejo
> avanzado de estado, ruteo, pruebas E2E y diseño visual consistente. La aplicación deberá estar
> desplegada en el servidor fullstack.dcc.uchile.cl en un puerto asignado por el equipo docente.
>
> 1. Estado Global (Zustand o React-Redux): Implementar manejo de estado global con Zustand o
>    Redux Toolkit. Incluir al menos dos slices/stores (por ejemplo: usuario y entidad principal
>    del proyecto).
> 2. Ruteo (React Router): Integrar React Router con rutas públicas y protegidas. Botones back y
>    forward de navegador deberían funcionar correctamente entre vistas. Lo mismo para el botón
>    reload (F5).
> 3. Pruebas E2E: Implementar tests E2E con Playwright. Casos mínimos: Login + acceso protegido.
>    Otro como por ejemplo CRUD sobre una entidad (crear, listar, editar, eliminar). Las pruebas
>    deben ubicarse en una carpeta independiente llamada e2etests/ dentro del proyecto. Debe
>    incluir en el Readme global, o en el Readme de e2etests instrucciones para correr los tests.
> 4. Diseño y Estilo: Incorporar una librería de estilos (Material UI, React-Bootstrap, Chakra,
>    Mantine, etc.).
> 5. Buenas Prácticas: TypeScript estricto, sin any injustificado. Manejo de errores con JSON y
>    códigos HTTP adecuados. Variables sensibles en .env (no subir al repositorio).
