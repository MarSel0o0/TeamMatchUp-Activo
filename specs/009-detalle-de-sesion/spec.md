# Spec 009 — Vista nueva: detalle de sesión
Estado: borrador (contenido aprobado por el usuario el 2026-10-18; aprobación definitiva pendiente de la condición previa: aprobación de las specs 007 y 008, que a su vez esperan a las specs 001 a 006)

## Contexto y objetivo
Es la segunda de las dos vistas nuevas que exige el enunciado del Hito 2. La propuso la
spec 001 original (sección 7) y el usuario confirmó que las dos vistas nuevas son la ficha
de jugador (spec 008) y este detalle (spec 008, P5). `MEMORY.md` todavía las registra como
"propuesta sin confirmar" y queda pendiente de actualizar fuera de esta spec.

Hoy una sesión de juego solo existe como tarjeta dentro de la agenda: no tiene una
dirección propia que compartir y el anfitrión no puede editarla, solo cancelarla, y sin
confirmación. El detalle cierra el flujo en la sesión agendada (`PRODUCT.md`, principio 3).
Usa dos operaciones del servidor que las vistas actuales no usan, obtener una sesión por su
identificador (spec 006, RF-3) y editarla (spec 006, RF-7 y RF-8), además de sumarse,
salir y cancelar (spec 006, RF-9 a RF-14 y RF-17). Todas pasan por el contrato único
(constitución, principio 3). En la agenda cambia solo esto: cada tarjeta de sesión de juego
enlaza a su detalle (RF-2), también sin desplazamiento horizontal a 360 px (RNF-5);
cancelar pide la misma confirmación que en el detalle (RF-19, RF-23); tras cancelar, en la
agenda o desde el detalle, el foco va al título del panel, que recibe el foco aunque no sea
interactivo (RF-8, RF-19, RNF-2); la agenda refleja las acciones hechas en el detalle
(RF-15); y vuelve a pedir sus sesiones de juego tras un 404 al cancelar en ella (RF-19) o
tras mostrar el detalle su estado vacío (RF-15) (corrección, C4).

- Depende de: spec 007 (usuario de la sesión, rutas protegidas, ruta de origen, 401 y
  cambio de sesión en otra pestaña, errores con y sin mensaje, modo simulado), spec 008
  (ficha de jugador a la que enlazan los participantes) y, de forma directa, spec 006
  (sesión, estado, referencia de usuario y sus operaciones) y spec 003 (regla de
  identificadores inválidos, RF-5).
  **Condición previa**: esta spec no se aprueba ni se empieza su plan hasta que estén
  aprobadas las specs 007 y 008. La 007 no se aprueba hasta que lo estén las specs 001 a
  006 (spec 007, P1 y D4), y la 008 espera a la 007 (spec 008, condición previa;
  constitución, principio 2). Si al aprobarse cambian algo que esta spec cita, se revisa
  esta spec antes de aprobarla. Mientras tanto se puede corregir y clarificar (decisión
  del usuario: "sí, adelante"). Además, la validación de esta spec (Criterios de
  finalización) no empieza hasta que estén implementadas la spec 006 (servidor real con
  obtener y editar una sesión por su identificador, RF-3 y RF-7), la spec 007 (al menos
  RF-7, RF-10 y RF-24) y la spec 008 (al menos RF-9, RF-15 y RF-20), porque sus pasos
  dependen de ellas (corrección, A9).
- Esta spec no cambia el servidor: usa solo operaciones ya definidas en la spec 006. Si el
  plan encuentra que hace falta un cambio en el servidor, primero se cambia la spec 006, y
  ese cambio lleva sus pruebas primero (constitución, principio 4). Sí amplía el contrato
  único con obtener una sesión por su identificador y editarla (referencia, sección 6,
  punto 4; spec 007, fuera de alcance).
- Origen: HU-12, RF-24 (vista 2) y sección 7 (V2) de la spec original.
- Las decisiones técnicas ya tomadas (sección 6, punto 4 —operaciones nuevas del contrato—
  y sección 7 —ruta, componentes y estados—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.

## Usuarios
- Anfitrión de una sesión de juego.
- Participante inscrito, o jugador con la sesión iniciada que quiere sumarse.

## Historias de usuario
- HU-1. Como jugador, quiero una página propia para cada sesión de juego donde ver el
  juego, el horario, los cupos y quién va.
- HU-2. Como anfitrión, quiero editar mi sesión desde esa página y cancelarla con
  confirmación, también desde la agenda, para no borrarla por error.
- HU-3. Como jugador, quiero sumarme o salir de la sesión desde esa página y entender por
  qué no puedo cuando no se permite.

## Definiciones
- **Sesión de juego**: la "sesión" de la spec 006 (juego, título, notas, día, hora de
  inicio, duración, cupos, anfitrión, participantes, estado). En esta spec se escribe
  siempre "sesión de juego" para no confundirla con la sesión iniciada.
- **Usuario de la sesión**: el de la spec 007 (el usuario que esta pestaña tiene como
  sesión iniciada). Nunca se refiere a un participante de la sesión de juego.
- **Detalle**: página propia de una sesión de juego, identificada por el identificador de
  esa sesión de juego en su dirección. Es una ruta protegida (spec 007, definiciones).
- **Abrir el detalle**: toda llegada al detalle, sea cual sea el camino: con "Ver detalle",
  escribiendo o pegando su dirección, con "Atrás" o "Adelante" del navegador (por ejemplo,
  al volver desde una ficha), al volver tras iniciar sesión (RF-1) o al recargar la página.
  Cada vez se pide la sesión de juego al servidor y se muestra el estado de carga, aunque
  la pestaña ya tenga en memoria datos de esa sesión de juego, que no se usan para dibujar
  el detalle (decisión recomendada, R1). En esta spec, "abrir o recargar" significa lo
  mismo.
- **Anfitrión**, **participantes**, **estado** (`open` / `full`) y **referencia de
  usuario**: los de la spec 006. El anfitrión es siempre el primer participante.
- **Inscrito**: el usuario de la sesión figura entre los participantes de la sesión de
  juego (incluido el anfitrión).
- **Rol en el detalle**: anfitrión (el usuario de la sesión es el anfitrión), inscrito no
  anfitrión, o no inscrito.
- **Acción**: cada una de sumarse, salir, guardar la edición y cancelar la sesión de juego.
- **Iniciar una acción**: enviar su petición al servidor: pulsar "Unirme" o "Salir", pulsar
  "Guardar cambios" (o Intro en el campo "Título", RF-22) cuando pasan las comprobaciones
  del cliente, o pulsar "Sí, cancelar sesión". Abrir el formulario de edición ("Editar
  sesión") o la ventana de confirmación de cancelar ("Cancelar sesión") no inicia ninguna
  acción (decisión recomendada, R3).
- **Acción en curso**: una acción enviada al servidor que todavía no recibió respuesta ni
  superó el plazo de RF-20.
- **Zona de acciones**: el lugar del detalle donde están los botones de sumarse, salir,
  "Editar sesión" y "Cancelar sesión". Es siempre el mismo, cambie o no el botón que
  contiene (deducción, D13).
- **Ventana de confirmación de cancelar**: la ventana de RF-23. Usa el mismo componente
  de ventana que el formulario de creación de la agenda ("Anotar una sesión").
- **Horario de la agenda**: el de la spec 008 (de las 12:00 a las 23:00, más las 00:00 y
  las 01:00, en ese orden).
- **Horas de inicio de la edición**: las del formulario de creación, que coinciden con el
  horario de la agenda, más la hora de inicio actual de la sesión de juego si no está
  entre ellas (decisión del usuario, P5).
- **Identificador del backend simulado** (sesión de juego): el texto `session-` seguido de
  uno o más dígitos (por ejemplo `session-3` o `session-1760000000000`), que es la forma
  de los identificadores que hoy da el backend simulado a las sesiones de juego semilla y a
  las creadas (deducción, D3).
- **Error con mensaje**, **error sin mensaje**, **Texto de error sin mensaje** ("No se
  pudo conectar con el servidor. Inténtalo de nuevo."), **ruta de origen**, **limpiar la
  sesión del cliente**, **cambio de sesión en otra pestaña** y **modo simulado**: los de la
  spec 007.

## Requisitos funcionales
- RF-1: MIENTRAS no hay sesión iniciada, CUANDO el jugador abre o recarga un detalle, EL
  SISTEMA no lo muestra y lleva a login recordando el detalle como ruta de origen (spec
  007, RF-25); al iniciar sesión vuelve a él (spec 007, RF-8). Con el detalle abierto, un
  401 se trata según la spec 007, RF-7, y un cambio de sesión en otra pestaña, según su
  RF-24; en los dos casos la ruta de origen es el detalle. Al volver al detalle tras
  iniciar sesión, el detalle se carga como al abrirlo y el foco sigue RF-11 (decisión del
  usuario, Q15).
- RF-2: EL SISTEMA mantiene en la agenda el panel "Sesión abierta" y sus acciones, y añade a
  cada tarjeta de sesión de juego, tanto en "Sesión abierta" como en "Mis sesiones", un
  enlace "Ver detalle" que abre el detalle de esa sesión de juego (decisión del usuario,
  P8). Una sesión de juego de la semana que no está en "Mis sesiones" se alcanza
  eligiéndola en la semana, que la abre en "Sesión abierta", como hoy. Abrir el detalle
  añade una entrada al historial del navegador, de modo que "Atrás" vuelve a la agenda.
  El nombre accesible del enlace es "Ver detalle de <título>", para distinguir los enlaces
  de "Mis sesiones" entre sí (decisión del usuario, Q6); si dos tarjetas tienen el mismo
  título, sus enlaces tienen el mismo nombre accesible y se distinguen por la tarjeta en la
  que están (limitación declarada, R12). Al abrir el detalle por cualquier camino
  (Definiciones), el foco sigue RF-11; al llegar a la agenda con "Ir a la agenda" (RF-12),
  con "Atrás" o desde la navegación, el foco queda como hoy (decisión del usuario, Q15). La
  agenda no recuerda la tarjeta abierta ni el filtro de juego al salir de ella: al volver
  muestra "Mis sesiones" y "Todos los juegos", como hoy al llegar a ella (decisión
  recomendada, R7).
- RF-3: CUANDO el detalle carga la sesión de juego, EL SISTEMA muestra: el juego (con la
  marca de juego que usa la agenda); el título; las notas, solo si no están vacías (como
  la tarjeta de la agenda); el día y el rango horario con el mismo formato que la agenda,
  que en una sesión que cruza la medianoche termina en la hora del día siguiente (por
  ejemplo, "Lunes · 23:00–03:00"); los cupos como "<ocupados>/<totales> jugadores"; el
  estado, como el sello "Cupos llenos" cuando es `full` y sin sello cuando es `open`; y
  los participantes en el orden que entrega el servidor, cada uno con su color de avatar y
  su nombre visible, el anfitrión marcado con "organiza" (como la tarjeta de la agenda), y
  un "cupo libre" por cada cupo sin ocupar. Muestra además, según el rol en el detalle,
  "La organizas" o "Estás dentro" con el mismo sello que la agenda (deducción, D9); a
  diferencia de la agenda, en el detalle ese sello no es una región de estado y un lector
  de pantalla no lo anuncia al aparecer ni al cambiar, solo lo lee al recorrer la página,
  para que sumarse o salir no produzca más anuncio que el del botón nuevo (RF-9). El sello
  de la agenda no cambia (decisión recomendada, R2).
- RF-4: EL SISTEMA muestra el nombre visible de cada participante como enlace a su ficha
  (spec 008), con el juego de la sesión de juego fijado en la dirección, igual que los
  enlaces desde las sesiones de la agenda (spec 008, RF-2 y RF-20). Si el participante no
  tiene cuenta en ese juego, la ficha se abre en su pestaña inicial (spec 008, RF-20); si
  es el usuario de la sesión, la ficha lo lleva a su perfil (spec 008, RF-15); y si fue
  eliminado, la ficha muestra "Este jugador no existe" (spec 008, RF-9) (deducción, D8).
- RF-5: MIENTRAS el rol en el detalle es anfitrión, EL SISTEMA ofrece en la zona de
  acciones los botones "Editar sesión" y "Cancelar sesión", y no ofrece sumarse ni salir
  (spec 006, RF-14).
- RF-6: CUANDO el anfitrión pulsa "Editar sesión", EL SISTEMA abre en la misma página, sin
  ventana, un formulario de edición con los campos título, notas, día, hora de inicio,
  duración y cupos, rellenados con los valores actuales de la sesión de juego mostrada,
  porque el servidor reemplaza todos (spec 006, RF-7), y con los botones "Guardar
  cambios" y "Descartar" (decisión del usuario, P3). Mientras el formulario está abierto,
  "Editar sesión" no se muestra; "Cancelar sesión" sigue disponible y abre la ventana de
  confirmación de cancelar sobre el formulario, que sigue abierto detrás con lo escrito
  (decisión recomendada, R6). CUANDO el detalle muestra datos nuevos de la sesión de juego
  con el formulario abierto (la nueva lectura de RF-21, tras un rechazo al guardar o al
  cancelar), EL SISTEMA conserva en el formulario los valores que escribió el anfitrión y
  solo recalcula el rango de cupos del punto 4 con los participantes nuevos; si los cupos
  elegidos quedan por debajo del nuevo mínimo, pasan a ese mínimo (decisión del usuario,
  Q4; R6). El juego se muestra pero no se edita (Fuera de alcance;
  spec 006, RF-15). Los valores que ofrece cada campo son:
  1. Día: de lunes a domingo, como en el formulario de creación.
  2. Hora de inicio: las horas de inicio de la edición (Definiciones). Si la hora de
     inicio actual de la sesión de juego está fuera del horario de la agenda, se añade a la lista para que guardar sin tocarla
     no la mueva (decisión del usuario, P5); se añade al final de la lista, después de las
     01:00 (decisión del usuario, Q2).
  3. Duración: de 1 a 4 horas, como en el formulario de creación.
  4. Cupos: de max(2, número de participantes de la sesión de juego mostrada) a 6
     (decisión del usuario, P4).
  5. Título y notas: no admiten escribir más de 60 y 160 caracteres, como en el formulario
     de creación (spec 006, RF-6). El campo "Título" se rellena con el título guardado tal
     cual, con sus espacios de los extremos, aunque así pase de 60 caracteres (el servidor
     solo limita el título sin esos espacios); mientras pase de 60, el campo no admite
     escribir más pero sí borrar, y al guardar se envía tal como está en el campo, sin
     quitarle espacios, como el formulario de creación, de modo que guardar sin tocarlo
     envía el título exacto; el valor que guarda el servidor lo decide la spec 006
     (decisión recomendada, R13; R18).
- RF-7: CUANDO el anfitrión pulsa "Guardar cambios", EL SISTEMA aplica antes las
  comprobaciones del cliente de RF-22; si alguna falla, muestra su texto y no envía nada.
  Si pasan, envía la edición al servidor y, con su respuesta 200, cierra el formulario,
  muestra la sesión de juego que devuelve esa respuesta, sin recargar la página y sin una
  nueva lectura (spec 006, RF-7), y muestra "Cambios guardados." (decisión del usuario,
  P3). Ese texto se muestra en la zona de acciones, lo anuncia un lector de pantalla y
  desaparece al iniciar otra acción (Definiciones) o al volver a abrir el formulario
  (decisión del usuario, Q1); abrir la ventana de confirmación de cancelar no lo oculta, y
  desaparece al pulsar "Sí, cancelar sesión" (R3). Guardar sin cambios también envía la
  edición.
- RF-8: CUANDO el anfitrión pulsa "Cancelar sesión" en el detalle, EL SISTEMA abre la
  ventana de confirmación de cancelar (RF-23). Si confirma y el servidor responde 204, EL
  SISTEMA lleva a la agenda reemplazando en el historial la entrada del detalle, de modo
  que "Atrás" no vuelve al detalle cancelado sino a la página anterior a él (decisión del
  usuario, P9). Al llegar a la agenda tras esa redirección, el foco va al título del panel
  de la agenda, que entonces es "Mis sesiones" porque la agenda no recuerda una tarjeta
  abierta (RF-2, R7), como en RF-19 (decisión del usuario, Q15; regla general en RNF-2). Si no
  confirma, no envía nada ni cambia nada. Si el servidor responde 404,
  se aplica RF-12: el estado vacío reemplaza todo el detalle y la ventana se cierra
  (deducción, D12).
- RF-9: MIENTRAS el rol en el detalle es inscrito no anfitrión, EL SISTEMA ofrece "Salir";
  y MIENTRAS es no inscrito, ofrece "Unirme". CUANDO el servidor responde 200 a sumarse o
  salir, EL SISTEMA muestra la sesión de juego que devuelve esa respuesta, sin recargar la
  página, y lleva el foco al botón nuevo de la zona de acciones ("Salir" tras sumarse,
  "Unirme" tras salir), cuyo nombre anuncia un lector de pantalla. No añade ningún mensaje
  nuevo ni ningún otro anuncio: los datos de la sesión de juego que cambian con la
  respuesta (los cupos, los participantes y el sello "Estás dentro", que aparece o
  desaparece) se ven en la página, pero un lector de pantalla no los anuncia (RF-3)
  (decisión del usuario, Q12; R2; regla general en RNF-2). MIENTRAS la sesión de juego mostrada está llena y el rol es no inscrito, EL
  SISTEMA muestra el botón deshabilitado con el texto "Sin cupos", como la agenda; a
  diferencia de ella, el botón sigue recibiendo el foco, un lector de pantalla anuncia
  "Sin cupos" y que no está disponible, y activarlo no envía nada (decisión del usuario,
  P1). EL SISTEMA permite sumarse aunque el usuario de la sesión no tenga cuenta en el
  juego de la sesión de juego, como hoy; el servidor tampoco lo impide (spec 006, RF-11)
  (decisión del usuario, P2).
- RF-10: SI el servidor responde a una acción con un error con mensaje distinto de 401 y
  de 404 (por ejemplo, 409 por sesión llena o ya inscrito, 409 por no estar inscrito, 400
  por cupos bajo los participantes o datos inválidos, o 403), ENTONCES EL SISTEMA muestra
  ese mensaje tal como llega (spec 007, RF-9), sin salir del detalle: el de sumarse o salir,
  en la zona de acciones, junto al botón que haya en ella; el de guardar, en el formulario
  de edición, en el mismo lugar donde el formulario de creación muestra su error, porque
  el mensaje del servidor no indica el campo; y el de cancelar, dentro de la ventana de
  confirmación de cancelar (RF-23). SI una acción falla con un error sin mensaje o un 5xx
  sin mensaje, ENTONCES EL SISTEMA muestra en ese mismo lugar el Texto de error sin
  mensaje, sin limpiar la sesión del cliente (spec 007, RF-9). Los mensajes del servidor no
  son literales de esta spec: la spec 006 (RF-8, RF-10 y RF-12) no los fija. Tras un
  rechazo 400, 403 o 409, EL SISTEMA vuelve a pedir la sesión de juego según RF-21; tras
  un error sin mensaje o un 5xx, no.
- RF-11: MIENTRAS se carga la sesión de juego al abrir el detalle (Definiciones: también
  al recargar, con "Atrás" o "Adelante" y aunque haya datos en memoria), EL SISTEMA muestra
  un estado de carga en lugar de todo el detalle, porque sus datos llegan en una sola
  petición (R1). MIENTRAS hay una acción en curso, EL SISTEMA marca como en curso el botón
  de esa acción, no permite enviarla de nuevo ni iniciar otra acción, y deja visible el
  resto del detalle (como la agenda hoy, que bloquea sus acciones mientras una está en
  curso) (deducción, D5). Mientras hay una acción en curso o dura la nueva lectura de
  RF-21, "Editar sesión" y "Cancelar sesión" tampoco se pueden pulsar, como en la agenda,
  que deshabilita todos sus botones mientras una acción está en curso (R3). Mientras
  "Guardar cambios" está en curso, "Descartar" tampoco se puede pulsar, igual que la
  ventana no se cierra mientras la cancelación está en curso (RF-23) (decisión
  recomendada, R5). Mientras dura solo la nueva lectura de RF-21, "Descartar" y cerrar la
  ventana sí funcionan, porque no envían nada; la nueva lectura sigue y su resultado se
  aplica igual al detalle (RF-21) (decisión recomendada, R4). Los botones bloqueados por
  este requisito, incluido el que está en curso, siguen pudiendo recibir el foco, como
  "Sin cupos" (RF-9): el que lo tenía lo conserva, un lector de pantalla anuncia que no
  está disponible y activarlo no hace nada, para que el foco no caiga al cuerpo de la
  página (RNF-2) (deducción, D23). La nueva lectura de RF-21 no
  muestra el estado de carga, y "Reintentar" tampoco (RF-13). CUANDO lo que reemplaza el
  estado de carga al abrir el detalle (Definiciones) es la sesión de juego, EL SISTEMA lleva el foco a su título; si es el
  estado vacío, a "Esta sesión no existe" (RF-12); y si es el error, al mensaje (RF-13)
  (decisión del usuario, Q15; regla general en RNF-2).
- RF-12: SI obtener la sesión de juego responde 400 o 404 (al abrir, al recargar, con
  "Reintentar" o en la nueva lectura de RF-21), o una acción responde 404, ENTONCES EL
  SISTEMA muestra en lugar de todo el detalle, incluidos el formulario de edición y la
  ventana de confirmación de cancelar, el estado vacío con el título "Esta sesión no
  existe", la descripción "Puede que se haya cancelado." y un enlace "Ir a la agenda" que
  lleva a la agenda (decisión del usuario, P10). Cuando aparece tras un 404 de una acción,
  tras la nueva lectura de RF-21, tras "Reintentar" o al abrir o recargar el detalle, el
  foco va al título "Esta sesión no existe" (decisiones del usuario, Q13 y Q15; regla
  general en RNF-2). Es un estado vacío y no un error mostrado,
  así que, como caso particular, prevalece sobre RF-10, RF-21 y la spec 007, RF-9. El
  detalle no valida por su cuenta el formato del identificador: lo decide el servidor
  (spec 006, RF-3; spec 003, RF-5), como la ficha (spec 008, RF-9) (deducción, D2).
- RF-13: SI obtener la sesión de juego al abrir el detalle o con "Reintentar" falla con
  un error sin mensaje, un 5xx o un error con mensaje distinto de 400, 401 y 404,
  ENTONCES EL SISTEMA muestra en lugar de todo el detalle el mensaje según la spec 007,
  RF-9 (el del servidor o, si no lo trae, el Texto de error sin mensaje), con el botón
  "Reintentar", que repite esa petición; no limpia la sesión del cliente (como la spec
  008, RF-18) (deducción, D4). Al mostrarse, el foco va al mensaje de error, que hace de
  título; y cuando "Reintentar" carga el detalle, el foco va al título de la sesión de
  juego (decisión del usuario, Q13; regla general en RNF-2). MIENTRAS "Reintentar" espera
  respuesta, EL SISTEMA no muestra el estado de carga: el error sigue visible y
  "Reintentar" aparece en curso, no se puede volver a pulsar y conserva el foco hasta que
  la respuesta, o el plazo de RF-20, reemplaza lo mostrado; entonces el foco sigue Q13
  (decisión del usuario, Q14). Un fallo así en la nueva lectura de RF-21 se trata según
  RF-21, no aquí. RF-13 solo se alcanza cuando la aplicación ya pasó su consulta de sesión
  (spec 007, RF-5) y lo que falla es obtener la sesión de juego: por ejemplo, con la
  aplicación ya cargada, si el servidor cae y se abre el detalle con "Ver detalle", o si
  solo la petición de la sesión de juego falla (bloqueada o con un 5xx) al recargar. Si al
  recargar el servidor no responde, la que falla primero es la consulta de sesión y se
  muestra la pantalla de error de la spec 007, RF-5, con su propio "Reintentar"; esa
  pantalla es de la spec 007 y esta spec no la cambia (spec 007, RNF-4) (deducción, D16).
- RF-14: SI el servidor responde 403 a una acción, ENTONCES EL SISTEMA muestra su mensaje
  según RF-10 y vuelve a pedir la sesión de juego según RF-21, sin salir del detalle. Como
  la interfaz solo ofrece editar y cancelar al anfitrión (RF-5) y el anfitrión de una
  sesión de juego no cambia nunca (spec 006, RF-15: la edición ignora el anfitrión), el
  único 403 posible llega cuando la petición viaja con la sesión iniciada de otro usuario,
  distinto del usuario de la sesión de esta pestaña: por ejemplo, si en otra pestaña se
  inició sesión con otra cuenta y esta pestaña aún no aplicó el cambio de sesión en otra
  pestaña (spec 007, RF-24). En ese caso la nueva lectura sigue mostrando al usuario de la
  sesión como anfitrión: el formulario o la ventana siguen abiertos con el mensaje del 403,
  el foco sigue la regla general (RNF-2, punto a) y repetir la acción vuelve a recibir 403
  hasta que la spec 007, RF-24, lleva a login. La rama de RF-21 en la que el usuario de la
  sesión deja de ser el anfitrión no puede ocurrir con la spec 006; se mantiene como regla
  defensiva (D13, Q10) (deducción, D18). Con la interfaz no se puede provocar en el uso
  normal (Criterios de finalización).
- RF-15: CUANDO una acción tiene éxito, EL SISTEMA hace que, en la misma pestaña, la agenda
  muestre el cambio la siguiente vez que se vea (al volver con "Atrás", por el enlace o
  tras la redirección de RF-8), sin recargar la página; esto vale para las cuatro
  acciones, y una sesión de juego cancelada ya no aparece en ella. Lo mismo vale para la
  sesión de juego que trae la nueva lectura de RF-21 (decisión del usuario, Q8) y para la
  que trae la lectura al abrir el detalle (Definiciones), de modo que la agenda de la misma
  pestaña no muestre datos más viejos que el último detalle abierto (decisión recomendada,
  R17). SI una acción responde cuando el usuario ya no está en el detalle en el que la
  inició (salió con "Atrás" o con la barra de navegación, o volvió a abrir el detalle),
  ENTONCES EL SISTEMA aplica su resultado a los datos y, si tuvo éxito, a la agenda según
  este requisito, pero no redirige, no mueve el foco ni muestra mensajes; un detalle abierto
  de nuevo muestra lo que devuelve su propia lectura (R1), no hereda la acción en curso ni
  su mensaje, y un 401 sigue la spec 007, RF-7 (decisión recomendada, R16). CUANDO el
  detalle muestra el estado vacío de RF-12, EL SISTEMA hace que la agenda de la misma
  pestaña vuelva a pedir sus sesiones de juego la siguiente vez que se vea, para que no
  muestre una sesión de juego que ya no existe, como hace la agenda tras un 404 al cancelar
  (RF-19) (decisión recomendada, R8). Otras pestañas y otros navegadores no lo ven hasta su
  siguiente lectura de la agenda o del detalle (RF-17) (deducción, D11). Como la agenda no
  recuerda su tarjeta abierta (RF-2, R7), al volver muestra "Mis sesiones".
- RF-16: EL SISTEMA obtiene todos los datos del detalle a través del contrato único, del
  servidor real o, en modo simulado, del backend simulado, nunca de los dos a la vez (spec
  007, RF-1). MIENTRAS está activo el modo simulado, el backend simulado responde a las
  operaciones de esta spec como el servidor: obtener una sesión de juego responde 200 con
  ella, 400 con "id con formato inválido" para un identificador que no tiene la forma del
  identificador del backend simulado (Definiciones; spec 003, RF-5) y 404 para uno con esa
  forma que no existe, por ejemplo `session-999999`; editar reaplica las reglas de la spec
  006, RF-6 (400 sin guardar nada), RF-8 (400 si los cupos quedan bajo los participantes,
  sin cambiar nada), RF-10 (403 si no es el anfitrión, sin cambiar nada) y RF-15 (ignora
  cualquier otro campo, incluidos juego, anfitrión, participantes y estado), recalcula el
  estado y responde 200 con la sesión de juego; editar, sumarse, salir y cancelar una
  sesión de juego inexistente responden 404. El backend simulado aplica estas reglas
  aunque el cliente ya compruebe las de RF-22, porque las repite y no las sustituye
  (RNF-6). Esta lista amplía, solo para las operaciones de esta spec, la de la spec 007,
  RF-10 (cuyo punto 10 ya alinea salir sin estar inscrito); sus datos semilla siguen la
  spec 007, RF-21 y RF-27. Como el backend simulado guarda sus datos en el navegador, un
  detalle abierto por su dirección tras recargar muestra la sesión de juego, sea semilla o
  creada desde la interfaz (deducción, D3). **Limitación declarada del modo simulado**:
  cada pestaña lee los datos guardados del backend simulado una sola vez, al cargarse la
  aplicación, y después trabaja sobre su propia copia; lo que se cambia en una pestaña no
  llega a otra abierta hasta que esta se recargue, y una escritura posterior en la otra
  pestaña puede sobrescribirlo (por ejemplo, devolver una sesión de juego cancelada). Los
  casos límite con "otra pestaña" u "otro navegador" solo se cumplen con el servidor real,
  y el modo simulado no cambia su forma de guardar por esta spec (decisión recomendada,
  R11). MIENTRAS está activo el modo simulado, el detalle, como ruta protegida, muestra el
  aviso "Datos de demostración" en la barra de navegación y en el pie, como las demás
  vistas protegidas (spec 007, RF-11), sin un aviso propio; con el servidor real no lo
  muestra (`AGENTS.md`; deducción, D19).
- RF-17: EL SISTEMA no vuelve a pedir la sesión de juego por sí solo: ni de forma
  periódica ni al volver el foco a la ventana o a la pestaña del navegador, como la spec
  008, RF-26 (decisión del usuario, P12). La pide solo al abrir el detalle (Definiciones,
  también con "Atrás" o "Adelante" y al recargar; R1), con "Reintentar" (RF-13) y tras un
  rechazo 400, 403 o 409 de una acción (RF-21). Tampoco repite por su cuenta una petición
  que falló, tampoco tras un 5xx, un error sin mensaje o la falta de respuesta: cada una de
  esas peticiones, y cada acción, se envía una sola vez, y solo "Reintentar" repite la
  lectura (deducción, D17).
- RF-18: CUANDO el usuario de la sesión abre un detalle, EL SISTEMA lo muestra sea cual sea
  su rol en el detalle: cualquier usuario con la sesión iniciada puede ver cualquier
  sesión de juego (spec 006, RF-3), de modo que la dirección del detalle se puede
  compartir con otro jugador registrado.
- RF-19: CUANDO el anfitrión pulsa "Cancelar sesión" en una tarjeta de la agenda, EL
  SISTEMA abre la misma ventana de confirmación de cancelar (RF-23) en lugar de cancelar
  directamente, como hasta ahora (decisión del usuario, P7). Si confirma y el servidor
  responde 204, la ventana se cierra y la sesión de juego desaparece de la agenda, como
  hoy, y como su botón "Cancelar sesión" ya no existe, el foco va al título del panel
  (regla general en RNF-2; deducción, D15). Si no confirma, no envía nada ni cambia nada. Si la cancelación falla, la ventana
  sigue abierta con el mensaje (RF-23); con un 404, además, la agenda vuelve a pedir sus
  sesiones de juego para que la tarjeta desaparezca (decisión del usuario, Q5). Si al
  cerrar la ventana ("Volver", Escape, su botón de cerrar o pulsar fuera) la tarjeta ya
  no está en la agenda, el foco va al título del panel de la agenda, con el texto que
  muestre en ese momento ("Mis sesiones" o "Sesión abierta"), que puede recibir el foco
  aunque no sea interactivo (RNF-2) (decisión del usuario, Q10).
- RF-20: SI una petición del detalle (obtener la sesión de juego o una acción) no recibe
  respuesta en 30 segundos desde que se envió, ENTONCES EL SISTEMA deja de esperarla, la
  trata como un error sin mensaje (RF-13 si es obtener la sesión de juego al abrir, al
  recargar o con "Reintentar", con "Reintentar"; RF-21 si es su nueva lectura; RF-10 si es
  una acción, y la acción deja de estar en curso), sin limpiar la sesión del cliente, y si
  la respuesta llega después no la muestra. Es el mismo plazo que la spec 007 (RF-20) y la
  spec 008 (RF-24) (deducción, D4 y D5). El servidor puede haber completado la acción: el
  resultado se ve en la siguiente lectura (RF-17).
- RF-21: CUANDO una acción recibe un rechazo 400, 403 o 409, EL SISTEMA vuelve a pedir la
  sesión de juego, sin estado de carga, y con su respuesta 200 muestra la sesión de juego
  actualizada, con el rol, las acciones y los cupos que correspondan a los datos nuevos,
  mientras el mensaje del rechazo sigue visible en su lugar (RF-10) (decisión del usuario,
  P11): el de la zona de acciones, hasta que se inicie otra acción (Definiciones); el del
  formulario, hasta que se inicie otra acción o el anfitrión cierre el formulario con
  "Descartar"; y el de la ventana, hasta que se inicie otra acción o el anfitrión cierre la
  ventana ("Volver", Escape, su botón de cerrar o pulsar fuera) (R3). Si el formulario
  sigue abierto, conserva lo escrito y recalcula el rango de cupos según RF-6 (decisión del
  usuario, Q4; R6). Si con los datos nuevos el usuario de la sesión ya no es el anfitrión
  (regla defensiva: con la spec 006 no ocurre, RF-14, D18), el formulario o la ventana se
  cierran solos y el mensaje pasa a la zona de acciones, donde sigue visible hasta que se
  inicie otra acción; ese cierre prevalece sobre la regla anterior y no borra el mensaje
  (deducción, D13 y D22); como "Editar sesión" y "Cancelar sesión" ya no existen, el
  foco va a ese mensaje, que puede recibir el foco aunque no sea interactivo (RNF-2)
  (decisión del usuario, Q10). Lo mismo vale para el botón de sumarse o salir: si tras un
  409 al pulsar "Unirme" la nueva lectura lo cambia a "Salir" (o, tras pulsar "Salir", a
  "Unirme"), el botón que tenía el foco ya no existe y el foco va al mensaje de la zona de
  acciones; si sigue siendo el mismo elemento, como cuando "Unirme" pasa a "Sin cupos", el
  foco se queda en él (decisión del usuario, Q11; regla general en RNF-2). Si la nueva
  lectura responde 400 o 404 se aplica RF-12; si
  falla de otro modo o no responde en 30 segundos, el detalle sigue mostrando la sesión de
  juego como estaba, con el mensaje del rechazo, sin el error de RF-13 (decisión del
  usuario, Q3). Mientras dura la nueva lectura, las acciones siguen bloqueadas como en
  RF-11, aunque "Descartar" y cerrar la ventana sí funcionan (R4).
- RF-22: CUANDO el anfitrión pulsa "Guardar cambios", o pulsa Intro en el campo "Título",
  que envía el formulario como en el formulario de creación (decisión recomendada, R9),
  EL SISTEMA comprueba en el cliente, con las reglas de la spec 006 (RF-6 y RF-8) y antes
  de enviar nada (decisión del usuario, P4):
  1. que el título tenga de 3 a 60 caracteres sin contar los espacios de los extremos; si
     no, muestra "El título debe tener entre 3 y 60 caracteres.";
  2. que las notas tengan como máximo 160 caracteres;
  3. que los cupos estén entre max(2, número de participantes de la sesión de juego
     mostrada) y 6;
  4. que día, hora de inicio y duración sean de los valores que ofrece RF-6.
  Los textos se muestran en el mismo lugar que los errores del servidor al guardar
  (RF-10). Los puntos 2 a 4 no pueden fallar desde la interfaz, porque los campos solo
  admiten esos valores (RF-6), así que no tienen texto propio (deducción, D14). Las
  comprobaciones no sustituyen las del servidor: con datos viejos, los cupos pueden pasar
  en el cliente y recibir el 400 del servidor (RF-10, RF-21).
- RF-23: EL SISTEMA confirma la cancelación, en el detalle y en la agenda, con una ventana
  que usa el mismo componente de ventana que el formulario de creación, con el título
  "¿Cancelar esta sesión?", el texto "Se borrará para todos los participantes y no se
  puede deshacer." y los botones "Sí, cancelar sesión" y "Volver" (decisión del usuario,
  P6). Al abrirse, el foco está en "Volver". Mientras está abierta, la ventana retiene el
  foco: Tab y Mayús+Tab recorren solo sus controles y no salen a la página que queda
  detrás. El formulario de creación, que usa el mismo componente, conserva su
  comportamiento de foco de hoy (decisión recomendada, R10). Escape, el botón de cerrar de la ventana y
  pulsar fuera de ella equivalen a "Volver": cierran la ventana sin enviar nada y
  devuelven el foco al botón "Cancelar sesión" que la abrió (deducción, D12), salvo que
  ese botón ya no exista: en el detalle el foco va entonces al mensaje de la zona de
  acciones (RF-21) y en la agenda, al título del panel (RF-19) (decisión del usuario,
  Q10). "Sí,
  cancelar sesión" envía la cancelación y queda marcado como en curso (RF-11); mientras
  está en curso la ventana no se puede cerrar: "Volver", Escape, el botón de cerrar y
  pulsar fuera no hacen nada hasta la respuesta o el plazo de RF-20 (decisión del usuario,
  Q7). Mientras está en curso, "Sí, cancelar sesión", en el detalle y en la agenda, sigue
  pudiendo recibir el foco y lo conserva, bloqueado y no deshabilitado, como los botones de
  RF-11 (D23; decisión recomendada, R15). Si la
  cancelación falla, la ventana sigue abierta y muestra el mensaje según RF-10, salvo un
  404 en el detalle, que aplica RF-12. Mientras dura la nueva lectura que sigue a un
  rechazo (RF-21), la ventana sí se puede cerrar (R4).

## Requisitos no funcionales
- RNF-1: Usa los componentes, tokens de diseño y patrones existentes; ningún color escrito
  a mano (`AGENTS.md`).
- RNF-2: Operable solo con teclado y con foco visible en enlaces, campos y acciones
  (`PRODUCT.md`, accesibilidad). La ventana de confirmación de cancelar se acepta y se
  rechaza con teclado, con el foco inicial en "Volver" y Escape como "Volver" (RF-23). El
  botón "Sin cupos" del detalle sigue recibiendo el foco y un lector de pantalla anuncia
  su motivo (RF-9), como en la spec 008, RNF-2. Al abrir el formulario de edición el foco
  pasa al campo "Título" y al cerrarlo (con "Guardar cambios" o "Descartar") vuelve a
  "Editar sesión" (decisión del usuario, Q1).
  Regla general del foco (decisiones del usuario, Q10 a Q15). Tras cada cambio que
  describen los puntos a, b y c, y tras la redirección del punto d, el foco nunca queda en
  el cuerpo de la página. La navegación hacia la agenda que no es esa redirección ("Ir a la
  agenda", "Atrás", "Adelante" o la barra de navegación) queda fuera de esta garantía y deja
  el foco como hoy (RF-2) (corrección, C3):
  a. CUANDO una acción termina con un rechazo o un error mostrado (RF-10, RF-14, RF-23),
     CUANDO falla una comprobación del cliente (RF-22), CUANDO llega la nueva lectura que
     sigue a un rechazo (RF-21) o la agenda vuelve a pedir sus sesiones de juego (RF-19),
     y CUANDO se cierra el formulario de edición o la ventana de confirmación de cancelar
     (también cuando la ventana de la agenda se cierra sola tras un 204, RF-19), EL
     SISTEMA deja el foco en el elemento que lo tenía (o lo devuelve al botón de origen:
     "Editar sesión" al cerrar el formulario, "Cancelar sesión" al cerrar la ventana) si
     ese elemento sigue existiendo; si ya no existe, lo lleva, en el detalle, al mensaje
     de la zona de acciones y, en la agenda, al título del panel, con el texto que muestre
     en ese momento ("Mis sesiones" o "Sesión abierta") (Q10, Q11).
  b. CUANDO sumarse o salir responde 200, EL SISTEMA lleva el foco al botón nuevo de la
     zona de acciones ("Salir" o "Unirme") y un lector de pantalla anuncia su nombre, sin
     ningún mensaje nuevo ni otro anuncio (Q12; R2; RF-3, RF-9). Guardar con éxito sigue la regla del formulario: el
     foco vuelve a "Editar sesión" (Q1; RF-7).
  c. CUANDO algo reemplaza todo el detalle, EL SISTEMA lleva el foco al título de lo que
     aparece (Q13, Q15): "Esta sesión no existe" en el estado vacío que sigue a un 404 de
     una acción, a la nueva lectura con 400 o 404, a "Reintentar" con 400 o 404 o a abrir
     el detalle con 400 o 404 (RF-12); el mensaje de error en el error de RF-13; y el
     título de la sesión de juego en el detalle que carga "Reintentar" (RF-13) o que
     reemplaza el estado de carga al abrir el detalle por cualquier camino, también con
     "Atrás" o "Adelante" y al recargar (Definiciones; RF-11; R1). MIENTRAS "Reintentar" espera
     respuesta, el error sigue visible y el foco se queda en "Reintentar", marcado en curso
     y sin poder pulsarse de nuevo (Q14; RF-13).
  d. CUANDO la cancelación desde el detalle lleva a la agenda (RF-8), EL SISTEMA lleva el
     foco al título del panel de la agenda, como en el punto a (Q15). Toda llegada al
     detalle sigue el punto c (R1); la navegación hacia la agenda distinta de esta
     redirección deja el foco como hoy (Q15; RF-2).
  Un
  elemento sigue existiendo si conserva su lugar y su función aunque cambien su texto o su
  estado: el botón de sumarse es el mismo como "Unirme" y como "Sin cupos"; "Unirme" y
  "Salir" son elementos distintos, y "Editar sesión" y "Cancelar sesión" dejan de existir
  cuando el usuario de la sesión deja de ser el anfitrión. La regla cubre, entre otros:
  1. 409 al pulsar "Unirme" con nueva lectura que muestra "Sin cupos": el foco se queda
     en el botón (Q11).
  2. 409 al pulsar "Unirme" o "Salir" con nueva lectura que cambia el botón a "Salir" o a
     "Unirme": el foco va al mensaje de la zona de acciones (Q11).
  3. Rechazo 400 o 403 al guardar, o un error sin mensaje, con el usuario de la sesión aún
     anfitrión: el formulario sigue abierto y el foco se queda en el elemento desde el que
     se envió, "Guardar cambios" o, si se envió con Intro, el campo "Título", aunque la
     nueva lectura cambie el rango de cupos (RF-21, RF-22; R9). Un 403 por la sesión
     iniciada de otro usuario sigue este caso (RF-14; D18).
  4. Rechazo cuya nueva lectura muestra que el usuario de la sesión ya no es el anfitrión
     (regla defensiva, que con la spec 006 no ocurre; RF-14, D18): el formulario o la
     ventana se cierran y el foco va al mensaje de la zona de acciones (Q10).
  5. Error sin mensaje o plazo de 30 segundos en una acción, sin nueva lectura (RF-10,
     RF-20): el botón sigue existiendo y el foco se queda en él.
  6. Ventana de la agenda que se cierra cuando su tarjeta ya desapareció, por "Volver",
     Escape, su botón de cerrar o pulsar fuera, o sola tras un 204: el foco va al título
     del panel (Q10; D15).
  7. Título que no pasa la comprobación del cliente (RF-22): el formulario sigue abierto y
     el foco se queda en "Guardar cambios" o, si se envió con Intro, en el campo "Título"
     (D15; R9).
  8. Sumarse con éxito: el foco va a "Salir"; salir con éxito: el foco va a "Unirme"
     (Q12).
  9. 404 al editar, cancelar, sumarse o salir, o nueva lectura con 400 o 404: el estado
     vacío reemplaza el detalle y el foco va a "Esta sesión no existe" (Q13).
  10. Error de RF-13 al abrir, al recargar o con "Reintentar": el foco va al mensaje de
      error; "Reintentar" con éxito: el foco va al título de la sesión de juego; con 400 o
      404: a "Esta sesión no existe" (Q13; D15).
  11. "Reintentar" en curso: el error sigue visible, el foco se queda en "Reintentar" y
      pulsarlo de nuevo no envía nada; al llegar la respuesta o el plazo de 30 segundos se
      aplica el caso 10 (Q14).
  12. Abrir el detalle por cualquier camino (Definiciones), también al recargar, con
      "Atrás" o "Adelante" y al volver tras iniciar sesión (RF-1): el foco va al título de
      la sesión de juego, a "Esta sesión no existe" o al mensaje de error, según lo que
      reemplace el estado de carga (Q15; R1).
  13. Cancelar desde el detalle con respuesta 204: en la agenda, el foco va al título del
      panel (Q15; RF-8).
  El mensaje de la zona de acciones, el título del panel, el título del estado vacío, el
  mensaje de error de RF-13 y el título de la sesión de juego no son interactivos: reciben
  el foco solo por esta regla, no entran en el recorrido con Tab, el lector de pantalla lee
  su texto al recibirlo y el foco se ve sobre ellos.
- RNF-3: Ningún contenido de otros usuarios (título, notas y nombres visibles) se inserta
  como HTML (spec 007, RNF-2; `AGENTS.md`).
- RNF-4: Construcción, comprobación de tipos y lint de la interfaz en verde (constitución,
  principio 4; spec 007, RNF-3). No se exigen pruebas automáticas en la interfaz, tampoco
  para las reglas de dominio de RNF-6: el principio 4 exige pruebas con node:test a las
  funciones de dominio y los endpoints del backend, y dice que en el frontend bastan
  construcción, tipos y lint "hasta que una spec diga otra cosa"; esta spec no lo cambia,
  como la spec 007, RNF-3 (`MEMORY.md`, decisiones) (deducción, D20).
- RNF-5: Con 360 px de ancho, la página no tiene desplazamiento horizontal, también con un
  título de 60 caracteres sin espacios y unas notas de 160, que parten línea dentro de su
  recuadro, y con el formulario de edición o la ventana de confirmación abiertos. Lo mismo
  vale para la agenda con el enlace "Ver detalle" en sus tarjetas, también con una tarjeta
  de título de 60 caracteres sin espacios, en "Sesión abierta" y en "Mis sesiones"
  (decisión recomendada, R14). Todo
  texto del detalle y de la ventana tiene un contraste de al menos 4,5:1 (3:1 en texto
  grande) en el tema claro y en el oscuro (`PRODUCT.md`, accesibilidad; como la spec 008,
  RNF-5) (deducción, D7).
- RNF-6: Son reglas puras del dominio, sin reloj ni interfaz (constitución, principio 3):
  el rol en el detalle y qué acciones se ofrecen, con el estado "Sin cupos" (RF-9); el
  rango horario mostrado; las horas de inicio de la edición y el rango de cupos (RF-6); el
  ajuste de los cupos elegidos al nuevo mínimo cuando el rango cambia con datos nuevos
  (RF-6, RF-21); la clasificación de cada respuesta según su código y la petición que la
  recibe (obtener la sesión de juego, su nueva lectura o una acción): estado vacío (RF-12),
  error de toda la página (RF-13), mensaje en su lugar con o sin nueva lectura (RF-10,
  RF-21), detalle sin cambios con el mensaje del rechazo (RF-21) o éxito; y las
  comprobaciones del cliente de RF-22, en una sola regla que no se duplica en los
  componentes y que repite, sin sustituirlas, las de la spec 006 (RF-6 y RF-8), porque
  manda el servidor (deducción, D21). El 401 no entra en esa clasificación: lo trata la
  spec 007, RF-7.

## Casos límite
- La sesión de juego se cancela (o se borra porque se eliminó a su anfitrión, spec 006,
  RF-16) mientras otro jugador tiene abierto el detalle: el detalle no lo ve hasta su
  siguiente petición (RF-17); su siguiente acción recibe 404 y se muestra el estado vacío
  de RF-12, no un mensaje junto a la acción, con el foco en "Esta sesión no existe"
  (RNF-2, Q13). Recargar también muestra el estado vacío.
- Sumarse o salir con éxito: el botón de la zona de acciones cambia ("Unirme" a "Salir" o
  al revés), el foco pasa al botón nuevo y el lector de pantalla anuncia su nombre y nada
  más; "Estás dentro" y los cupos cambian a la vista sin anunciarse (RF-3, RF-9, RNF-2,
  Q12, R2).
- "Reintentar" tras un error de carga: si carga, el foco va al título de la sesión de
  juego; si vuelve a fallar, al mensaje de error; si responde 400 o 404, a "Esta sesión no
  existe" (RF-12, RF-13, RNF-2, Q13). Mientras espera, el error sigue visible y
  "Reintentar", en curso, conserva el foco; pulsarlo de nuevo no envía otra petición
  (RF-13, Q14).
- Abrir o recargar el detalle: al terminar la carga, el foco va al título de la sesión de
  juego, a "Esta sesión no existe" o al mensaje de error (RF-11, RNF-2, Q15).
- Volver al detalle con "Atrás" o "Adelante" (por ejemplo, desde una ficha), o abrirlo
  cuando la pestaña ya tiene en memoria datos de esa sesión de juego: cuenta como abrir el
  detalle; se pide la sesión de juego, se ve el estado de carga y el foco va al título de
  lo que aparece (Definiciones; RF-11, RF-17, RNF-2; R1).
- La sesión de juego se cancela en otra pestaña del mismo anfitrión y después edita o
  cancela en esta: recibe 404 y se muestra el estado vacío (RF-12), que también cierra el
  formulario o la ventana.
- Sesión de juego que cruza la medianoche: el rango horario termina en la hora del día
  siguiente, por ejemplo "Lunes · 23:00–03:00" (RF-3; spec 006, caso límite).
- Sesión de juego cuya hora de inicio está fuera del horario de la agenda (por ejemplo, a
  las 05:00, creada contra la API): el detalle la muestra igual; la edición ofrece las
  05:00 al final de la lista, después de las 01:00, viene elegida y guardar sin tocarla la
  conserva (RF-6).
- Bajar los cupos por debajo de los participantes: la lista de cupos no lo permite
  (RF-6, RF-22); solo puede pasar con datos viejos, y entonces el servidor responde 400,
  su mensaje se muestra en el formulario y se vuelve a pedir la sesión de juego; el
  formulario conserva lo escrito y los cupos elegidos pasan al nuevo mínimo (RF-10,
  RF-21).
- Editar los cupos justo al número de participantes: el servidor responde 200 con el
  estado `full` y aparece "Cupos llenos" (RF-3; spec 006, caso límite).
- Título "ab", o de tres o más caracteres pero rodeado de espacios con menos de tres
  dentro: se muestra "El título debe tener entre 3 y 60 caracteres." y no se envía nada
  (RF-22).
- Guardar sin cambios: se envía igual, el formulario se cierra y aparece "Cambios
  guardados." (RF-7).
- "Descartar": el formulario se cierra sin enviar nada; al volver a abrirlo trae los
  valores de la sesión de juego mostrada, no los descartados (RF-6).
- El anfitrión edita con datos viejos (otro se sumó mientras tanto): el servidor reemplaza
  todos los campos con lo enviado (spec 006, RF-7); si los cupos quedan bajo los
  participantes actuales, responde 400 (RF-10, RF-21). Gana la última edición guardada
  (limitación declarada).
- Sumarse a una sesión de juego que se llenó mientras se miraba: el servidor responde 409,
  su mensaje se muestra en la zona de acciones y la nueva lectura muestra "Sin cupos" y
  "Cupos llenos" con el mensaje aún visible; el foco se queda en el botón, ahora "Sin
  cupos" (RF-10, RF-21, RNF-2).
- Sumarse estando ya inscrito desde otra pestaña: 409; la nueva lectura muestra "Estás
  dentro" y "Salir", el mensaje sigue en la zona de acciones y el foco va a ese mensaje
  porque "Unirme" ya no existe (RF-21, RNF-2; D13, Q11).
- Salir de una sesión de juego de la que ya se salió en otra pestaña: 409 "no estás
  inscrito en esta sesión" (spec 006, RF-17), mostrado en la zona de acciones; la nueva
  lectura muestra "Unirme" y el foco va al mensaje (RF-10, RF-21, RNF-2).
- Sesión de juego llena y usuario no inscrito: "Sin cupos" deshabilitado, con foco, y
  activarlo no envía nada (RF-9).
- Sumarse a una sesión de juego de un juego en el que el usuario de la sesión no tiene
  cuenta: se permite (RF-9; spec 006, RF-11).
- Doble clic o dos acciones seguidas: mientras hay una acción en curso, o su nueva
  lectura, no se puede enviar otra (RF-11, RF-21).
- Acción sin respuesta: a los 30 segundos se muestra el Texto de error sin mensaje en su
  lugar y se desbloquean las acciones; una respuesta posterior no se muestra (RF-20).
- Falla la carga del detalle con la aplicación ya cargada (servidor caído al abrirlo con
  "Ver detalle", 5xx solo en esa petición o sin respuesta en 30 segundos): todo el detalle
  muestra el mensaje con "Reintentar", sin llevar a login y sin reintentos automáticos
  (RF-13, RF-17, RF-20).
- Recargar el detalle con el servidor apagado: falla primero la consulta de sesión de la
  aplicación y aparece la pantalla de error de la spec 007, RF-5, no la de RF-13; al
  encender el servidor, su "Reintentar" carga la aplicación y el detalle se abre según
  RF-11 (RF-13; D16).
- Falla la nueva lectura tras un rechazo: el detalle sigue como estaba, con el mensaje del
  rechazo (RF-21).
- Identificador mal formado (por ejemplo `abc`) o con formato válido pero inexistente: el
  estado vacío de RF-12, con el servidor y en modo simulado (RF-16).
- Llega un 401 o un cambio de sesión en otra pestaña con el detalle abierto: login según la
  spec 007 (RF-7 o RF-24) y, al entrar, vuelta al detalle (RF-1). **Limitación declarada**
  (spec 007, P11): una edición sin guardar se pierde.
- Enlace del propio usuario entre los participantes, pulsado en el detalle: la ficha lo
  lleva a su perfil reemplazando su entrada del historial, y "Atrás" pulsado en el perfil
  vuelve al detalle, que se abre con su estado de carga y el foco en el título (RF-4, RF-11;
  spec 008, RF-15; R1).
- Salir del detalle ("Atrás" o la barra de navegación) con una acción en curso, o volver a
  abrirlo antes de que responda: la respuesta no redirige, no mueve el foco ni muestra
  mensajes; si tuvo éxito, la agenda de la pestaña la refleja, y el detalle abierto de nuevo
  muestra lo que devuelve su propia lectura, sin la acción en curso (RF-15; R1, R16).
- Abrir el detalle cuando la agenda de la pestaña tiene datos más viejos de esa sesión de
  juego: al volver a la agenda, muestra los datos que leyó el detalle (RF-15; R17).
- Participante sin cuenta en el juego de la sesión de juego: su ficha se abre en su pestaña
  inicial (RF-4; spec 008, RF-20).
- Participante eliminado (spec 006, RF-16): desaparece de la sesión de juego en la
  siguiente lectura; si antes se pulsa su enlace, la ficha muestra "Este jugador no
  existe" (RF-4; spec 008, RF-9).
- "Atrás" después de cancelar desde el detalle: no vuelve al detalle cancelado, sino a la
  página anterior a él (RF-8). Al llegar a la agenda tras cancelar, el foco está en el
  título del panel (RF-8, RNF-2, Q15).
- Escape, el botón de cerrar o pulsar fuera de la ventana de confirmación: equivalen a
  "Volver" (RF-23).
- Cancelar desde la agenda sin servidor: la ventana sigue abierta con el Texto de error
  sin mensaje y la tarjeta sigue en la agenda (RF-19, RF-23).
- Cancelar desde la agenda una sesión de juego ya cancelada en otra pestaña: el servidor
  responde 404, la ventana sigue abierta con su mensaje y la tarjeta desaparece porque la
  agenda vuelve a pedir sus sesiones de juego (RF-19); al cerrar la ventana, el foco va al
  título del panel de la agenda (RF-19, RNF-2).
- Rechazo cuya nueva lectura muestra que el usuario de la sesión ya no es el anfitrión,
  con el formulario o la ventana abiertos: se cierran, el mensaje pasa a la zona de
  acciones y el foco va a ese mensaje (RF-21, RF-23, RNF-2).
- Escape, el botón de cerrar, "Volver" o pulsar fuera mientras la cancelación está en
  curso: la ventana no se cierra hasta la respuesta o el plazo de 30 segundos (RF-23).
- Un rechazo cuya nueva lectura trae datos nuevos (por ejemplo, la sesión de juego llena):
  la agenda de la misma pestaña también los muestra la siguiente vez que se vea (RF-15).
- Volver a la agenda tras una acción: la agenda muestra el cambio sin recargar y una sesión
  de juego cancelada ya no aparece; la agenda llega con "Mis sesiones" y "Todos los
  juegos", porque no recuerda la tarjeta abierta ni el filtro (RF-2, RF-15; R7).
- "Ir a la agenda" desde el estado vacío, aunque la pestaña tuviera en memoria la agenda
  con esa sesión de juego: la agenda vuelve a pedir sus sesiones de juego y la tarjeta no
  aparece (RF-15; R8).
- "Cambios guardados." visible y el anfitrión abre la ventana de cancelar: el texto sigue
  visible; desaparece al pulsar "Sí, cancelar sesión" (RF-7; R3).
- Con una acción en curso o durante su nueva lectura: "Editar sesión" y "Cancelar sesión"
  tampoco se pueden pulsar (RF-11; R3).
- "Descartar" mientras "Guardar cambios" está en curso: no se puede pulsar; con la
  respuesta 200 el formulario se cierra según RF-7 y con un error sigue abierto con su
  mensaje (RF-10, RF-11; R5).
- "Descartar" o cerrar la ventana mientras dura la nueva lectura de un rechazo: se cierran
  sin enviar nada, con el foco en "Editar sesión" o en "Cancelar sesión"; al llegar la
  nueva lectura se muestra la sesión de juego actualizada, o el estado vacío si responde
  400 o 404 (RF-11, RF-21, RF-23; R4).
- Con el formulario abierto, el anfitrión pulsa "Cancelar sesión": la ventana se abre sobre
  el formulario; "Volver" la cierra y el formulario sigue con lo escrito; un 403 al
  cancelar hace la nueva lectura, que recalcula el rango de cupos del formulario y
  conserva lo demás (RF-6, RF-21, RF-23; R6).
- Intro en el campo "Título": envía el formulario como "Guardar cambios"; si la
  comprobación falla o el servidor rechaza, el foco se queda en el campo (RF-22, RNF-2;
  R9).
- Tab y Mayús+Tab con la ventana de confirmación abierta: el foco no sale de la ventana
  (RF-23; R10).
- 403 porque en otra pestaña se inició sesión con otra cuenta y esta pestaña aún no lo
  aplicó: el mensaje se muestra, la nueva lectura sigue mostrando al usuario de la sesión
  como anfitrión, el formulario o la ventana siguen abiertos y repetir da otro 403 hasta
  que la spec 007, RF-24, lleva a login (RF-14; D18).
- Título guardado con espacios en los extremos que, contándolos, pasa de 60 caracteres: el
  campo lo muestra completo, no admite escribir más hasta bajar de 60 y guardar sin tocarlo
  envía el título sin quitarle espacios; el valor guardado lo decide la spec 006 (RF-6,
  RF-22; R13, R18).
- Dos tarjetas de la agenda con el mismo título: sus enlaces "Ver detalle de <título>"
  tienen el mismo nombre accesible (limitación declarada, RF-2; R12).
- Modo simulado con el detalle o la agenda abiertos en dos pestañas: cancelar en una no da
  404 en la otra, que no ve el cambio hasta recargar, y una escritura posterior en la otra
  puede devolver la sesión de juego (limitación declarada, RF-16; R11).
- Tarjeta de la agenda con "Ver detalle" y un título de 60 caracteres sin espacios a 360 px:
  sin desplazamiento horizontal (RNF-5; R14).
- Modo simulado: abrir por su dirección, tras recargar, el detalle de una sesión de juego
  semilla o de una creada desde la interfaz muestra la sesión de juego (RF-16).
- Título o notas con etiquetas HTML (por ejemplo `<b>x</b>`): se muestran como texto
  literal (RNF-3).
- Título de 60 caracteres sin espacios y notas de 160 a 360 px de ancho: sin
  desplazamiento horizontal (RNF-5).

## Fuera de alcance
- Notificar a los participantes de una edición o cancelación (spec 006, fuera de alcance).
- Expulsar participantes.
- Cambiar el juego de una sesión de juego existente (spec 006, RF-15).
- Cambiar las validaciones o los textos del formulario de creación de la agenda.
- Cambiar en la agenda algo distinto de lo que enumera el Contexto: el enlace "Ver
  detalle" y su ajuste a 360 px (RF-2, RNF-5), la confirmación de cancelar (RF-19, RF-23),
  el foco en el título del panel tras cancelar, que para eso recibe el foco aunque no sea
  interactivo (RF-8, RF-19, RNF-2), el reflejo de las acciones del detalle (RF-15) y la
  nueva petición de sus sesiones de juego tras un 404 al cancelar o tras el estado vacío
  del detalle (RF-15, RF-19) (corrección, C4). En particular, el botón "Sin cupos" de la
  agenda, el sello "Estás dentro" de sus tarjetas y el hecho de que no recuerde la tarjeta
  abierta ni el filtro al salir de ella siguen como hoy (R2, R7).
- Cambiar el comportamiento de foco del formulario de creación al dar a la ventana de
  confirmación la retención del foco (RF-23; R10).
- Cambiar cómo guarda sus datos el backend simulado entre pestañas (RF-16; R11).
- Mostrar en el detalle un aviso propio de datos de demostración (RF-16; D19).
- Pruebas automáticas de la interfaz (RNF-4; D20).
- Exigir cuenta en el juego para sumarse (RF-9).
- Volver a pedir la sesión de juego al volver el foco o de forma periódica (RF-17).
- Resolver ediciones simultáneas: gana la última guardada (limitación declarada).
- Conservar una edición sin guardar al ir a login (spec 007, P11).
- Cambios en el servidor (Contexto).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde (RNF-4).
- [ ] Recorrido manual registrado paso a paso, con fecha y resultado de cada paso, en el
      registro de validación de esta spec. Condiciones: servidor real, modo simulado
      desactivado y tres integrantes A, B y C con cuentas reales, A y B con cuenta de LoL y
      C sin ella; A crea en la agenda una sesión de juego de LoL el lunes a las 23:00, de
      4 horas, con 2 cupos, el título `<b>x</b>` y notas vacías. Pasos:
      1. En la agenda, la tarjeta de "Sesión abierta" y la de "Mis sesiones" muestran
         "Ver detalle"; A abre el detalle desde una de ellas (RF-2).
      2. Se ven LoL, `<b>x</b>` como texto literal, sin notas, "Lunes · 23:00–03:00",
         "1/2 jugadores", sin sello "Cupos llenos", A con "organiza" y "La organizas", un
         "cupo libre", y "Editar sesión" y "Cancelar sesión" sin "Unirme" ni "Salir"
         (RF-3, RF-5, RNF-3).
      3. A pulsa "Editar sesión": el formulario aparece en la página con los valores
         actuales y los cupos de 2 a 6; A escribe el título `ab`, pulsa "Guardar cambios"
         y ve "El título debe tener entre 3 y 60 caracteres." sin petición en la pestaña de
         red (RF-6, RF-22); pulsa "Descartar", el formulario se cierra sin petición y, al
         reabrirlo, trae los valores de la sesión de juego (RF-6).
      4. A edita el título, las notas, el día, la hora, la duración y los cupos a 3, guarda,
         el formulario se cierra, aparece "Cambios guardados." en la zona de acciones y se
         ve la sesión de juego actualizada sin recargar (RF-7); al reabrir el formulario el
         texto desaparece, y A pulsa "Descartar".
      5. B abre la dirección del detalle que A le comparte (RF-18), se suma y ve "Estás
         dentro" y "2/3 jugadores" (RF-9); B sale y vuelve a "1/3 jugadores"; B se suma de
         nuevo.
      6. C, sin cuenta de LoL, abre el detalle en una pestaña P1 y ve "Unirme" habilitado
         (RF-9). A, con B dentro, edita los cupos: la lista va de 2 a 6; los baja a 2 y
         aparece "Cupos llenos" (RF-6; caso límite).
      7. C abre el detalle en otra pestaña P2: ve "Sin cupos" deshabilitado, lo alcanza con
         Tab y activarlo no hace peticiones (RF-9). En P1, con datos viejos, C pulsa
         "Unirme": el mensaje 409 aparece en la zona de acciones y la nueva lectura muestra
         "Sin cupos" y "Cupos llenos" con el mensaje aún visible y el foco en "Sin cupos"
         (RF-10, RF-21, RNF-2); C va a la
         agenda en P1 desde la navegación, sin recargar: la agenda muestra "Mis sesiones"
         (C no está inscrito), en la semana el bloque de la sesión de juego muestra "LoL ·
         2/2" y, al elegirlo, "Sesión abierta" la muestra con el sello "Cupos llenos" y el
         botón "Sin cupos" (RF-15).
      8. En el detalle, A pulsa su propio enlace entre los participantes y llega a su perfil
         (RF-4; spec 008, RF-15); en el perfil, A pulsa "Atrás" y vuelve al detalle: la
         pestaña de red muestra la petición de la sesión de juego, se ve el estado de carga
         y el foco queda en el título de la sesión de juego (RF-11, RF-17, RNF-2; R1).
         Después, en el detalle, A pulsa el enlace de B y su ficha se abre en la pestaña LoL
         (RF-4); en la ficha, A pulsa "Atrás" y vuelve al detalle con la misma petición,
         estado de carga y foco en el título (R1).
      9. A pulsa "Cancelar sesión": aparece "¿Cancelar esta sesión?" con su texto y el foco
         en "Volver"; "Volver" la cierra sin peticiones y el foco vuelve a "Cancelar
         sesión"; la reabre, pulsa "Sí, cancelar sesión" y llega a la agenda, donde la
         sesión de juego ya no está, sin recargar (RF-8, RF-15, RF-23); "Atrás" no vuelve
         al detalle cancelado (RF-8).
- [ ] Agenda, dentro del mismo registro: A crea otra sesión de juego y pulsa "Cancelar
      sesión" en su tarjeta: aparece la misma ventana; Escape y "Volver" no cancelan; con el
      servidor apagado, "Sí, cancelar sesión" deja la ventana abierta con "No se pudo
      conectar con el servidor. Inténtalo de nuevo." y la tarjeta sigue; con el servidor
      encendido y la red limitada a "3G lenta", mientras "Sí, cancelar sesión" está en
      curso, Escape, "Volver" y pulsar fuera no cierran la ventana y el foco sigue visible
      en "Sí, cancelar sesión", que NVDA anuncia como no disponible (D23; R15); al responder 204, la
      ventana se cierra, la tarjeta desaparece y el foco queda visible en el título del
      panel (RF-19, RF-23, RNF-2). A crea una tercera sesión
      de juego, la cancela desde su detalle en otra pestaña y, en la agenda sin recargar,
      confirma cancelarla: aparece el mensaje del 404 en la ventana y la tarjeta
      desaparece; al cerrar la ventana con Escape, el foco queda visible en el título del
      panel, NVDA lee su texto y el siguiente Tab sigue desde ahí (RF-19, RNF-2).
- [ ] Estados, dentro del mismo registro: con la red limitada a "3G lenta", al abrir el
      detalle se ve el estado de carga y, al sumarse, el botón en curso con las demás
      acciones bloqueadas (RF-11); un identificador `abc` y uno con formato válido
      inexistente muestran "Esta sesión no existe", "Puede que se haya cancelado." y "Ir a
      la agenda", que lleva a la agenda (RF-12); con la sesión cerrada, abrir un detalle
      lleva a login y, al entrar, vuelve al detalle (RF-1); con la aplicación ya cargada en
      la agenda, se apaga el servidor y se abre el detalle con "Ver detalle": se muestra
      "No se pudo conectar con el servidor. Inténtalo de nuevo." con "Reintentar" en lugar
      de todo el detalle, sin llevar a login y con una sola petición de la sesión de juego
      en la pestaña de red, y al encender el servidor "Reintentar" carga el detalle (RF-13,
      RF-17); con el servidor encendido, se bloquea en la pestaña de red de Chrome solo la
      dirección de obtener la sesión de juego y se recarga el detalle: aparece el mismo
      error de RF-13, y al desbloquearla "Reintentar" carga el detalle (RF-13; D16); con el
      servidor apagado, recargar el detalle muestra la pantalla de error de la spec 007,
      RF-5, que se anota en el registro como comportamiento de esa spec (D16); con el
      servidor apagado y el detalle abierto, sumarse muestra el Texto de error sin mensaje
      en la zona de acciones y no hace una nueva lectura (RF-10); con una limitación de red
      personalizada de 40 segundos de latencia, a los 30 segundos se muestra el Texto de
      error sin mensaje, al abrir el detalle con "Ver detalle" y en una acción (RF-20); con el detalle abierto en dos pestañas
      de A, cancelar en una y editar en la otra muestra el estado vacío (RF-12), y "Ir a la
      agenda" hace una petición de las sesiones de juego y la tarjeta no aparece (RF-15;
      R8); volver el foco a la ventana con el detalle abierto no hace peticiones (RF-17);
      con la red limitada a "3G lenta", B pulsa "Salir" en el detalle y, en curso, pulsa
      "Atrás": en la agenda no aparece ningún mensaje del detalle ni se mueve el foco, y al
      llegar la respuesta la agenda refleja la salida sin recargar (RF-15; R16); C mira la
      agenda, B se suma desde su navegador, y C, enseguida y sin recargar, abre el
      detalle con "Ver detalle" y vuelve con "Atrás": la agenda muestra los cupos que leyó
      el detalle (RF-15; R17).
- [ ] Bloqueos y formulario, dentro del mismo registro, con la red limitada a "3G lenta":
      mientras "Guardar cambios" está en curso, "Descartar" y "Cancelar sesión" no hacen
      nada y el foco sigue visible en "Guardar cambios" (RF-11; R3, R5; D23); con "Cambios
      guardados." visible, abrir la ventana de cancelar no lo oculta (RF-7; R3); con el
      formulario abierto, "Cancelar sesión" abre la ventana y "Volver" la cierra con el
      formulario intacto (RF-6, RF-23; R6); Intro en "Título" con `ab` muestra el texto de
      RF-22 sin petición y deja el foco en el campo (RF-22; R9); Tab y Mayús+Tab con la
      ventana abierta no salen de ella, y el formulario de creación de la agenda sigue
      como hoy (RF-23; R10). Para el último paso se prepara de nuevo una sesión de juego
      propia: A abre el detalle de una sesión de juego de 4 cupos en la que solo está A, B
      y C se suman desde sus navegadores, y A, sin recargar, abre el formulario, elige 2
      cupos y guarda; si A pulsa "Descartar" mientras dura la nueva lectura que sigue al
      400, el formulario se cierra sin petición, el foco va a "Editar sesión" y, al llegar
      la nueva lectura, se ve "3/4 jugadores" (RF-11, RF-21; R4).
- [ ] Cupos con datos viejos: A abre el detalle de una sesión de juego de 4 cupos en la
      que solo está A; B y C se suman desde sus navegadores (C lo logra sin cuenta de LoL,
      RF-9); A, sin recargar, edita los
      cupos a 2 (la lista lo permite con sus datos viejos) y guarda: el mensaje 400 del
      servidor aparece en el formulario, que sigue abierto, y la nueva lectura muestra
      "3/4 jugadores", la lista de cupos desde 3 con el 3 elegido y el resto de lo que
      escribió A sin cambios (RF-10, RF-21, RF-22).
- [ ] Hora fuera del horario: una sesión de juego creada contra la API a las 05:00 muestra
      las 05:00 elegidas en la edición, al final de la lista después de las 01:00, y,
      guardando sin cambios, sigue a las 05:00 (RF-6).
- [ ] Fallo de la nueva lectura tras un rechazo, que no se provoca de forma fiable desde la
      interfaz: se comprueba revisando que, si la nueva lectura falla con un error sin
      mensaje, un 5xx, otro error con mensaje o el plazo de 30 segundos, el detalle sigue
      mostrando la sesión de juego como estaba, con el mensaje del rechazo y sin el error
      de RF-13 (RF-21); el resultado queda en el registro.
- [ ] RF-14 (403) no se puede provocar desde la interfaz en el uso normal: se comprueba
      revisando que el detalle muestra el mensaje de un 403 según RF-10 sin salir de la
      página y hace la nueva lectura de RF-21, que con esa nueva lectura, en la que el
      usuario de la sesión sigue siendo el anfitrión, el formulario o la ventana siguen
      abiertos con el mensaje y el foco en el elemento que lo tenía (RF-14; D18), y que el
      backend simulado responde 403 al editar o cancelar una sesión de juego ajena (RF-16).
      En la misma revisión se comprueba la regla defensiva: si la nueva lectura mostrara
      que el usuario de la sesión ya no es el anfitrión, el formulario o la
      ventana se cierran, el mensaje queda en la zona de acciones y el foco va a ese
      mensaje, que no entra en el recorrido con Tab (RF-21, RF-23, RNF-2). El resultado
      queda en el registro.
- [ ] Con el modo simulado y la cuenta demo, sin peticiones al servidor en la pestaña de
      red: abrir el detalle de una sesión de juego semilla desde la agenda, recargarlo, y
      abrir por su dirección el de una sesión de juego recién creada (RF-16); `abc` y
      `session-999999` muestran el estado vacío; editar, sumarse, salir y cancelar (con su
      confirmación) funcionan y la agenda refleja cada cambio sin recargar (RF-15). Los
      casos de RF-16 que la interfaz no puede provocar (403, campos ignorados, datos
      inválidos y cupos bajo los participantes, que el cliente impide por RF-22) se
      comprueban revisando el backend simulado frente a la spec 006, y el resultado queda
      en el registro. El detalle muestra el aviso "Datos de demostración" en la barra y en
      el pie, y no lo muestra con el servidor real (RF-16; D19). Los casos con dos pestañas
      no se comprueban en modo simulado (limitación declarada, RF-16; R11).
- [ ] Recorrido solo con teclado y con NVDA en Chrome, registrado: se llega al detalle
      desde la agenda por "Ver detalle" (NVDA anuncia "Ver detalle de <título>", RF-2), se
      recorren enlaces, campos y acciones con el foco siempre visible, se abre el
      formulario de edición (el foco pasa a "Título") y se cierra con "Descartar" y con
      "Guardar cambios" (el foco vuelve a "Editar sesión" y NVDA anuncia "Cambios
      guardados.", RF-7), se acepta y se
      rechaza la confirmación de cancelar solo con teclado (foco inicial en "Volver";
      Escape cierra y devuelve el foco a "Cancelar sesión"), y "Sin cupos" recibe el foco
      y NVDA anuncia su motivo (RNF-2). Con el detalle abierto en dos pestañas de B, B se
      suma en una y pulsa "Unirme" en la otra: aparece el mensaje 409, el botón pasa a
      "Salir", el foco queda visible en el mensaje, NVDA lee su texto y el siguiente Tab
      sigue desde ahí; repitiendo con "Salir", el botón pasa a "Unirme" y pasa lo mismo
      (RF-21, RNF-2). B se suma con éxito solo con teclado: el foco pasa a "Salir" y NVDA
      anuncia "Salir" y ningún otro texto (no lee "Estás dentro" ni los cupos, que sí se
      ven); sale y el foco pasa a "Unirme" y NVDA anuncia solo "Unirme" (RF-3, RF-9,
      RNF-2, Q12, R2). Con la petición de la sesión de juego bloqueada en la pestaña de red
      (como en "Estados"), recargar el detalle deja el foco visible en el mensaje de error
      de RF-13 y NVDA lo lee; tras desbloquearla, "Reintentar" deja el foco en el título de
      la sesión de juego y NVDA lo lee (RF-13, RNF-2, Q13; D16); con la ventana de
      confirmación abierta, Tab y Mayús+Tab no salen de ella (RF-23; R10); volver con
      "Atrás" desde una ficha deja el foco en el título de la sesión de juego y NVDA lo lee
      (RF-11; R1); con la red limitada
      a "3G lenta", mientras "Reintentar" espera, el mensaje de error sigue visible,
      "Reintentar" aparece en curso con el foco visible y pulsarlo de nuevo no hace otra
      petición en la pestaña de red (RF-13, RNF-2, Q14). Al abrir el detalle con "Ver
      detalle" y al recargarlo, el foco queda visible en el título de la sesión de juego y
      NVDA lo lee; recargar uno con identificador `abc` deja el foco en "Esta sesión no
      existe" (RF-11, RF-12, RNF-2, Q15). Tras confirmar "Sí, cancelar sesión" en el
      detalle, la agenda aparece con el foco visible en el título del panel, que NVDA lee
      (RF-8, RNF-2, Q15). Con el detalle
      abierto en dos pestañas de A, cancelar en una y editar en la otra muestra el estado
      vacío con el foco visible en "Esta sesión no existe", que NVDA lee, y el siguiente
      Tab llega a "Ir a la agenda" (RF-12, RNF-2, Q13). En todos estos casos el título que
      recibe el foco no entra en el recorrido con Tab.
- [ ] Con 360 px de ancho y una sesión de juego con un título de 60 caracteres sin espacios
      y notas de 160, la página no se desplaza en horizontal, tampoco con el formulario de
      edición ni con la ventana abiertos, y la agenda con esa sesión de juego en "Sesión
      abierta" y en "Mis sesiones", con su enlace "Ver detalle", tampoco (RNF-5; R14); en
      los dos temas, la auditoría de accesibilidad
      de Lighthouse no da fallos de contraste, y los textos de estados que no ve (estado
      vacío, errores, "Cambios guardados.", ventana) se miden con el selector de color de
      Chrome, sin ninguno por debajo de 4,5:1 (3:1 en texto grande) (RNF-5).
- [ ] Una revisión del código nuevo no encuentra colores escritos a mano (RNF-1), ni
      llamadas a la red fuera del contrato único, y encuentra las reglas de RNF-6 en el
      dominio, sin duplicar en los componentes, incluidas el ajuste de cupos al nuevo
      mínimo y la clasificación de respuestas por código (RNF-6; D21); no se exigen pruebas
      automáticas de la interfaz (RNF-4; D20).

## Decisiones de clarificación
- Revisión QA (CAMBIOS NECESARIOS, 12 bloqueantes) incorporada. Lo que se deduce sin
  ambigüedad de la constitución, de las specs 003, 006, 007 y 008 o del código se corrigió
  directamente y se marca como deducción (D1 a D11). Las decisiones de producto fueron P1
  a P12.
- Respuesta del usuario a P1–P13: "Haz todo lo recomendado". Se aplicó la opción
  recomendada en todas:
  - P1 → RF-9, RNF-2, RNF-6: sesión llena y no inscrito, "Sin cupos" deshabilitado, con
    foco y motivo anunciado.
  - P2 → RF-9, Fuera de alcance: se puede sumar sin cuenta en el juego.
  - P3 → RF-5, RF-6, RF-7: "Editar sesión" abre el formulario en la página, con "Guardar
    cambios" y "Descartar"; al guardar se cierra y aparece "Cambios guardados.".
  - P4 → RF-6, RF-7, RF-16, RF-22, RNF-6: comprobaciones del cliente de la spec 006 (RF-6
    y RF-8), con "El título debe tener entre 3 y 60 caracteres." y cupos de max(2,
    participantes) a 6.
  - P5 → Definiciones, RF-6: horas del formulario de creación más la hora actual si queda
    fuera.
  - P6 → RF-8, RF-10, RF-23, RNF-2: ventana con el componente del formulario de creación,
    sus textos, foco en "Volver", Escape como "Volver" y error dentro de la ventana.
  - P7 → RF-19: la agenda también confirma.
  - P8 → RF-2: se mantiene "Sesión abierta" y cada tarjeta gana "Ver detalle".
  - P9 → RF-8: tras cancelar, la agenda reemplaza la entrada del historial.
  - P10 → RF-12: "Esta sesión no existe", "Puede que se haya cancelado." e "Ir a la
    agenda".
  - P11 → RF-10, RF-14, RF-21: tras 400, 403 o 409 se vuelve a pedir la sesión de juego y
    el mensaje sigue visible.
  - P12 → RF-17: no se vuelve a pedir al volver el foco.
  - P13: confirmadas D1 a D11.
- D1: "usuario de la sesión" es el de la spec 007 y la sesión de la spec 006 se llama
  "sesión de juego". Quedó en Definiciones y en todos los RF.
- D2: el cliente no valida el formato del identificador; 400 y 404 al obtener, y 404 en
  cualquier acción, muestran el mismo estado vacío, como la spec 008 (RF-9). Quedó en
  RF-10, RF-12 y Casos límite.
- D3: el identificador del backend simulado es `session-` seguido de dígitos; otro texto
  responde 400 con "id con formato inválido" (spec 003, RF-5) y uno con esa forma que no
  existe, 404; editar reaplica la spec 006 en el backend simulado. Quedó en Definiciones,
  RF-16 y Criterios de finalización.
- D4: si falla la carga del detalle, el error ocupa toda la página con "Reintentar"; plazo
  de 30 segundos y descarte de respuestas tardías, como la spec 008 (RF-18 y RF-24).
  Quedó en RF-13, RF-20, Casos límite y Criterios de finalización.
- D5: con una acción en curso se marca su botón y se bloquean las demás acciones, como la
  agenda hoy; plazo de 30 segundos, como la spec 007, RF-20. Quedó en Definiciones,
  RF-11, RF-20 y Casos límite.
- D6: esta spec no cambia el servidor y amplía el contrato único con obtener y editar una
  sesión de juego (spec 006, RF-3 y RF-7). Quedó en Contexto y Fuera de alcance.
- D7: 360 px sin desplazamiento horizontal y contraste mínimo, como la spec 008, RNF-5.
  Quedó en RNF-5, Casos límite y Criterios de finalización.
- D8: los enlaces de los participantes fijan el juego de la sesión de juego y delegan en
  la ficha los casos del propio usuario, sin cuenta en ese juego o eliminado (spec 008,
  RF-2, RF-9, RF-15 y RF-20). Quedó en RF-4 y Casos límite.
- D9: la presentación del detalle reutiliza la de la tarjeta de la agenda; a diferencia de
  ella, muestra siempre "<ocupados>/<totales> jugadores" y el sello "Cupos llenos" aunque
  el usuario esté inscrito. Quedó en RF-3.
- D10: el mensaje del servidor se muestra tal como llega y no es literal de esta spec; los
  errores sin mensaje y los 5xx usan el Texto de error sin mensaje (spec 007, RF-9). Quedó
  en RF-10.
- D11: el reflejo en la agenda es en la misma pestaña, para las cuatro acciones; las demás
  pestañas lo ven en su siguiente lectura. Quedó en RF-15.
- Deducciones nuevas al aplicar P1–P13 (confirmadas por el usuario en Q9):
  - D12: el componente de ventana del formulario de creación ya se cierra con Escape, con
    su botón de cerrar y al pulsar fuera; en la confirmación los tres equivalen a
    "Volver" y devuelven el foco al botón de origen. Un 404 al cancelar en el detalle
    cierra la ventana porque el estado vacío reemplaza todo el detalle. Quedó en RF-8,
    RF-12 y RF-23.
  - D13: tras la nueva lectura de P11 el botón de la zona de acciones puede cambiar (por
    ejemplo, de "Unirme" a "Salir" o a "Sin cupos"); el mensaje se muestra en la zona de
    acciones y no pegado a un botón concreto. Si el usuario de la sesión deja de ser
    anfitrión, el formulario o la ventana se cierran y el mensaje pasa a la zona de
    acciones. Quedó en Definiciones, RF-10 y RF-21.
  - D14: notas, cupos, día, hora y duración no pueden fallar en el cliente porque sus
    campos solo admiten valores válidos; por eso P4 solo da texto al título. Quedó en
    RF-22.
- Contradicciones resueltas al aplicar P1–P13: RF-7 ("sin una nueva lectura") frente a P11
  queda acotado al éxito, y la nueva lectura solo sigue a un rechazo (RF-21); RF-12 se
  aplica también a la nueva lectura y prevalece sobre RF-21; RF-13 no se aplica a la nueva
  lectura, para no tapar el mensaje del rechazo; RF-16 se mantiene completo aunque el
  cliente compruebe antes (P4), y el criterio del modo simulado lo revisa en el código;
  P7 cambia la agenda y tiene su propio criterio de finalización.
- Respuesta del usuario a Q1–Q9: "haz todo lo recomendado". Se aplicó la opción (a) en
  todas y se quitaron las marcas "propuesta, pendiente de Qn":
  - Q1 → RF-7, RNF-2, Criterios de finalización: "Cambios guardados." en la zona de
    acciones, anunciado por el lector de pantalla, desaparece al iniciar otra acción o al
    reabrir el formulario; foco a "Título" al abrir y a "Editar sesión" al cerrar.
  - Q2 → RF-6, Casos límite, Criterios de finalización: la hora fuera del horario va al
    final de la lista, después de las 01:00.
  - Q3 → RF-21, Criterios de finalización: si falla la nueva lectura, el detalle sigue como
    estaba, con el mensaje del rechazo.
  - Q4 → RF-21, Casos límite, Criterios de finalización: tras un 400 al guardar se conserva
    lo escrito y los cupos bajo el nuevo mínimo pasan a ese mínimo.
  - Q5 → RF-19, Casos límite, Criterios de finalización: un 404 al cancelar en la agenda
    muestra el mensaje y la agenda vuelve a pedir sus sesiones de juego.
  - Q6 → RF-2, Criterios de finalización: nombre accesible "Ver detalle de <título>".
  - Q7 → RF-23, Casos límite, Criterios de finalización: la ventana no se cierra mientras
    la cancelación está en curso.
  - Q8 → RF-15, Casos límite, Criterios de finalización: la nueva lectura tras un rechazo
    también actualiza la agenda de la misma pestaña.
  - Q9: confirmadas D12, D13 y D14.
- Respuesta del usuario a Q10: opción (a), la recomendada.
  - Q10 → RF-19, RF-21, RF-23, RNF-2, Casos límite, Criterios de finalización: si el botón
    de origen ya no existe al cerrar el formulario o la ventana, el foco va, en el
    detalle, al mensaje de la zona de acciones y, en la agenda, al título del panel ("Mis
    sesiones" o "Sesión abierta"). Los dos reciben el foco aunque no sean interactivos,
    sin entrar en el recorrido con Tab.
- Respuesta del usuario a Q11: opción (a), la recomendada.
  - Q11 → RF-21, RNF-2, Casos límite, Criterios de finalización: si tras un 409 al pulsar
    "Unirme" (o "Salir") la nueva lectura cambia el botón a "Salir" (o "Unirme"), el foco va
    al mensaje de la zona de acciones; si el botón sigue siendo el mismo elemento (por
    ejemplo, pasa a "Sin cupos"), el foco se queda en él.
  - Q10 y Q11 se formulan en RNF-2 como una sola regla general del foco: si el elemento
    que tenía el foco sigue existiendo, el foco se queda en él; si no, va al mensaje de la
    zona de acciones en el detalle o al título del panel en la agenda. Cubre también salir,
    los rechazos 400 y 403, los errores sin mensaje y el plazo de 30 segundos. El estado
    vacío de RF-12, el error de RF-13 y las acciones con éxito quedaron para Q12 y Q13.
- Respuesta del usuario a Q12 y Q13: en las dos, la opción recomendada. Resueltas.
  - Q12 → RF-9, RNF-2 (punto b y caso 8), Casos límite, Criterios de finalización: cuando
    sumarse o salir responde 200, el foco va al botón nuevo de la zona de acciones
    ("Salir" o "Unirme") y el lector de pantalla anuncia su nombre; no se añade ningún
    texto nuevo.
  - Q13 → RF-12, RF-13, RNF-2 (punto c y casos 9 y 10), Casos límite, Criterios de
    finalización: cuando algo reemplaza todo el detalle, el foco va al título de lo que
    aparece, que recibe el foco sin entrar en el recorrido con Tab, como el mensaje de la
    zona de acciones: "Esta sesión no existe" en el estado vacío tras un 404 o tras una
    nueva lectura con 400 o 404; el mensaje de error en el error de RF-13; y el título de
    la sesión de juego en el detalle cargado con "Reintentar".
  - La regla general de RNF-2 deja de excluir el estado vacío, el error de RF-13 y las
    acciones con éxito, y se reordena en tres puntos (a: el elemento sigue o no existe;
    b: sumarse o salir con éxito; c: reemplazo de todo el detalle).
- D15 (deducción al aplicar Q12 y Q13, por la regla general sin ambigüedad): la ventana de
  la agenda que se cierra sola tras un 204 sigue el punto a de RNF-2, como su cierre con
  "Volver" (el botón "Cancelar sesión" ya no existe, así que el foco va al título del
  panel); un fallo de la comprobación del cliente (RF-22) deja el foco en "Guardar
  cambios", que sigue existiendo; y "Reintentar" con 400 o 404 lleva el foco a "Esta
  sesión no existe", porque el estado vacío reemplaza todo el detalle (punto c). Quedó en
  RF-12, RF-19, RNF-2 (casos 6, 7 y 10) y Criterios de finalización.
- Respuesta del usuario a Q14 y Q15: en las dos, la opción recomendada. Resueltas.
  - Q14 → RF-11, RF-13, RNF-2 (punto c y caso 11), Casos límite, Criterios de
    finalización: mientras "Reintentar" espera respuesta no se muestra el estado de carga;
    el error sigue visible y "Reintentar" aparece en curso, no se puede volver a pulsar y
    conserva el foco hasta que la respuesta (o el plazo de RF-20) reemplaza lo mostrado;
    entonces se aplica Q13.
  - Q15 → RF-1, RF-2, RF-8, RF-11, RF-12, RNF-2 (puntos c y d, casos 12 y 13), Casos
    límite, Criterios de finalización: tras la redirección de RF-8 el foco va al título
    del panel de la agenda, como en Q10; al abrir o recargar el detalle (también al volver
    tras iniciar sesión), lo que reemplaza el estado de carga recibe el foco en su título,
    como en Q13: el título de la sesión de juego, "Esta sesión no existe" o el mensaje de
    error; el resto de la navegación ("Ver detalle", "Ir a la agenda", "Atrás") deja el
    foco como hoy. **Reemplazada en parte por R1**, ratificada por el usuario: "Ver
    detalle", "Atrás" y "Adelante" hacia el detalle cuentan como abrirlo y llevan el foco al
    título de lo que aparece; "Ir a la agenda" y la navegación hacia la agenda siguen
    dejando el foco como hoy.
- Segunda revisión QA (3 bloqueantes y hallazgos menores). Respuesta del usuario:
  "Bloqueantes + menores", con autorización para aplicar la opción recomendada en lo que
  sea decisión de producto, registrada como R1 a R14. Tras la tercera revisión QA, el
  usuario ratificó R1 a R14 ("Ratificar y pulir menores"), incluido el cambio que R1 hace
  sobre Q15.
  - R1 (B1) → Definiciones, RF-2, RF-11, RF-17, RNF-2 (puntos c y d, caso 12), Casos
    límite, Criterios: toda llegada al detalle ("Ver detalle", dirección, "Atrás",
    "Adelante", vuelta tras login, recarga) cuenta como abrirlo: pide la sesión de juego,
    muestra el estado de carga sin usar datos en memoria y lleva el foco al título de lo
    que aparece. Reemplaza la parte de Q15 según la cual "Ver detalle" y "Atrás" hacia el
    detalle dejaban el foco como hoy: ahora el foco va al título. Ratificado por el
    usuario.
  - R2 (B2) → RF-3, RF-9, RNF-2 (punto b), Casos límite, Criterios: en el detalle, el
    sello "La organizas" / "Estás dentro" no se anuncia; sumarse o salir solo anuncia el
    botón nuevo. El sello de la agenda no cambia. Q12 se mantiene.
  - R3 (A2) → Definiciones, RF-7, RF-11, RF-21, Casos límite, Criterios: iniciar una
    acción es enviar su petición; abrir el formulario o la ventana no lo es, así que no
    oculta "Cambios guardados." ni los mensajes; con una acción en curso o su nueva
    lectura, "Editar sesión" y "Cancelar sesión" también quedan bloqueados.
  - R4 (L1) → RF-11, RF-21, RF-23, Casos límite, Criterios: "Descartar" y cerrar la
    ventana funcionan durante la nueva lectura, que se aplica igual al llegar.
  - R5 (L2) → RF-11, Casos límite, Criterios: "Descartar" queda bloqueado mientras
    "Guardar cambios" está en curso, como la ventana durante la cancelación (Q7).
  - R6 (L3) → RF-6, RF-21, Casos límite, Criterios: con el formulario abierto se puede
    abrir la ventana de cancelar; el formulario sigue detrás y toda nueva lectura con el
    formulario abierto conserva lo escrito y recalcula los cupos (Q4).
  - R7 (A3) → RF-2, RF-8, RF-15, Fuera de alcance, Casos límite: la agenda no recuerda la
    tarjeta abierta ni el filtro al salir de ella, como hoy; al volver muestra "Mis
    sesiones" y "Todos los juegos". Se quitó de RF-15 la cláusula de la tarjeta abierta.
  - R8 (L5) → RF-15, Contexto, Casos límite, Criterios: tras el estado vacío del detalle,
    la agenda de la misma pestaña vuelve a pedir sus sesiones de juego la siguiente vez
    que se vea, como tras un 404 al cancelar en ella (Q5).
  - R9 (A5) → Definiciones, RF-22, RNF-2 (casos 3 y 7), Casos límite, Criterios: Intro en
    el campo "Título" envía el formulario, como en el formulario de creación, y el foco se
    queda en el campo.
  - R10 (L4) → RF-23, Fuera de alcance, Casos límite, Criterios: la ventana de
    confirmación retiene el foco con Tab y Mayús+Tab; el formulario de creación conserva
    su comportamiento de foco de hoy.
  - R11 (L6) → RF-16, Fuera de alcance, Casos límite, Criterios: limitación declarada del
    modo simulado con varias pestañas (cada una trabaja sobre su copia); los casos con
    otra pestaña solo se cumplen con el servidor real.
  - R12 (L7) → RF-2, Casos límite: dos tarjetas con el mismo título tienen el mismo nombre
    accesible "Ver detalle de <título>"; se declara como limitación y Q6 no cambia.
  - R13 (L8) → RF-6, Casos límite: el campo "Título" se rellena con el título guardado tal
    cual, aunque con sus espacios pase de 60; no admite escribir más pero sí borrar, y se
    envía sin quitar espacios, como el formulario de creación.
  - R14 (L9) → Contexto, RNF-5, Casos límite, Criterios: la agenda con "Ver detalle" no
    tiene desplazamiento horizontal a 360 px, también con un título de 60 caracteres sin
    espacios.
- Deducciones de la segunda revisión, sin ambigüedad:
  - D16 (B3) → RF-13, Casos límite, Criterios: RF-13 solo se alcanza cuando la consulta de
    sesión de la aplicación ya pasó; al recargar con el servidor apagado aparece la
    pantalla de la spec 007, RF-5, que esta spec no cambia (spec 007, RNF-4). Los
    criterios provocan RF-13 abriendo con "Ver detalle" tras apagar el servidor o
    bloqueando solo la petición de la sesión de juego.
  - D17 → RF-17, Casos límite, Criterios: por la letra de RF-17, una petición fallida no
    se repite por su cuenta, tampoco tras un 5xx, un error sin mensaje o la falta de
    respuesta; solo "Reintentar" la repite. Nota para el plan: hoy la aplicación reintenta
    por defecto dos veces las lecturas que fallan con un 5xx o sin respuesta; en las
    peticiones del detalle ese reintento queda desactivado.
  - D18 (A4) → RF-14, RF-21, RNF-2 (casos 3 y 4), Casos límite, Criterios: el anfitrión no
    cambia (spec 006, RF-15); el único 403 posible viene de la sesión iniciada de otro
    usuario en otra pestaña antes de aplicar la spec 007, RF-24; la nueva lectura lo sigue
    mostrando como anfitrión y el 403 se repite hasta ir a login. La rama "ya no es el
    anfitrión" queda como regla defensiva.
  - D19 (A10) → RF-16, Fuera de alcance, Criterios: el detalle, como ruta protegida,
    muestra el aviso "Datos de demostración" de la spec 007, RF-11, en la barra y el pie,
    sin aviso propio.
  - D20 (K1) → RNF-4, Fuera de alcance, Criterios: el principio 4 dice que en el frontend
    bastan construcción, tipos y lint "hasta que una spec diga otra cosa", y la spec 007,
    RNF-3, lo aplica también al dominio de la interfaz; no hay contradicción y esta spec no
    exige pruebas automáticas en la interfaz.
  - D21 (K2) → RNF-6, Criterios: el ajuste de cupos al nuevo mínimo y la clasificación de
    respuestas por código son reglas puras del dominio.
  - D22 (C5) → RF-21: el cierre del formulario o la ventana porque el usuario de la sesión
    deja de ser anfitrión prevalece y lleva el mensaje a la zona de acciones, donde sigue
    hasta que se inicie otra acción.
  - D23 → RF-11: los botones bloqueados, incluido el que está en curso, siguen recibiendo
    el foco, como "Sin cupos", para que la regla general del foco (RNF-2, casos 3, 5 y 7)
    se pueda cumplir.
- Correcciones directas de la segunda revisión: A6 (RF-6, punto 2: "hora de inicio actual
  de la sesión de juego"); A7 (Definiciones: se quitó "Nombre corto del juego", que no se
  usaba, y "Horario de la agenda" queda definido una sola vez); A8 (spec 008, RF-2: los
  enlaces del detalle están en el RF-4 de esta spec, no en el RF-3); A9 (Contexto: la
  validación espera a que estén implementadas las specs 006, 007 y 008 en lo que usa); C3
  (RNF-2: la garantía del foco se acota a los puntos a a d); C4 (Contexto y Fuera de
  alcance: lista completa de lo que cambia en la agenda).
- Tercera revisión QA ("SPEC LISTA", 0 bloqueantes, 7 menores). Respuesta del usuario:
  "Ratificar y pulir menores": ratifica R1 a R14 y pide corregir los menores con la opción
  recomendada, sin otra ronda de QA. Correcciones directas: paso 8 del recorrido manual
  (el enlace propio se pulsa en el detalle y "Atrás" en el perfil; la ficha de B se
  comprueba aparte); paso 7 (observación concreta en la agenda de C: "LoL · 2/2" en la
  semana y "Cupos llenos" y "Sin cupos" al elegirla); criterio "Bloqueos y formulario"
  (prepara de nuevo su caso de cupos con datos viejos); R1 a R14 marcadas como ratificadas;
  Q15 y R1 anotan que R1 reemplaza parte de Q15; D17 y RF-17 aclaran que no se reintentan
  los 5xx ni la falta de respuesta. Decisiones nuevas, con la opción recomendada,
  ratificadas por el usuario el 2026-10-18 al aprobar el contenido de la spec:
  - R15 (D23 en la agenda) → RF-23, Criterios (Agenda): mientras la cancelación está en
    curso, "Sí, cancelar sesión" sigue pudiendo recibir el foco y lo conserva, bloqueado
    y no deshabilitado, en el detalle y en la agenda.
  - R16 → RF-15, Casos límite, Criterios (Estados): si una acción responde cuando el
    usuario ya salió del detalle o lo volvió a abrir, su resultado se aplica a los datos
    y, si tuvo éxito, a la agenda, sin redirigir, mover el foco ni mostrar mensajes; el
    detalle abierto de nuevo muestra su propia lectura (R1).
  - R17 → RF-15, Casos límite, Criterios (Estados): la sesión de juego leída al abrir el
    detalle actualiza también la agenda de la misma pestaña, como la nueva lectura de Q8.
  - R18 → RF-6 (punto 5), Casos límite: "guardar sin tocarlo" solo exige que el cliente
    envíe el título sin quitarle espacios; el valor guardado lo decide la spec 006 (R13
    se mantiene).

## Dudas abiertas
- Condición previa (dependencia externa, no la resuelve el usuario de esta spec): esta spec
  no se aprueba hasta que se aprueben las specs 007 y 008, que a su vez esperan a las specs
  001 a 006, y su validación espera a que estén implementadas las specs 006, 007 y 008 en
  lo que usa (Contexto).
- Resueltas: P1–P13, Q1–Q15, D1–D23 y R1–R18 (Decisiones de clarificación); R1–R14
  ratificadas por el usuario tras la tercera revisión QA, y R15–R18 ratificadas por el
  usuario el 2026-10-18 al aprobar el contenido de la spec.
