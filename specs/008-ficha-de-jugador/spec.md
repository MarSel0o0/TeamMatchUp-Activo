# Spec 008 — Vista nueva: ficha de jugador
Estado: borrador

## Contexto y objetivo
El enunciado del Hito 2 exige dos vistas completas nuevas que funcionen de punta a punta
contra el servidor real y respeten las rutas protegidas, sin nombrarlas. La spec original
(sección 7) propuso dos: esta ficha y el detalle de sesión (spec 009). El usuario confirmó
que las dos vistas nuevas del Hito 2 son esas dos (decisión del usuario, P5). `MEMORY.md`
todavía las registra como "propuesta sin confirmar" y queda pendiente de actualizar fuera
de esta spec.

Hoy, desde una coincidencia, el jugador solo ve una fila: no puede revisar el perfil
completo del otro antes de proponerle una sesión. La ficha muestra rango y horario juntos
(`PRODUCT.md`, principio 1) y lleva a proponer una sesión en la agenda (principio 3). Usa
operaciones del servidor que las vistas actuales no usan: obtener un usuario por su
identificador (spec 003, RF-3), listar las cuentas de otro usuario (spec 004, RF-2) y leer
la disponibilidad (spec 003, RF-12) y el resumen por juego (spec 004, RF-12) de otro
usuario. Todas pasan por el contrato único (constitución, principio 3).

- Depende de: spec 007 (sesión y usuario de la sesión, rutas protegidas, ruta de origen,
  reglas de presentación del rango, de la escala y de las fuentes, modo simulado, y cómo
  recibe la agenda una propuesta, su RF-30) y, de forma directa, de las specs 003 (usuario
  y disponibilidad), 004 (cuentas, resumen por juego y fuentes), 005 (distancia de rango y
  bloques en común) y 006 (agenda, a la que lleva "Proponer sesión").
  **Condición previa**: esta spec no se aprueba ni se empieza su plan hasta que esté
  aprobada la spec 007, que a su vez no se aprueba hasta que lo estén las specs 001 a 006
  (spec 007, P1 y D4; constitución, principio 2). Lo que aquí depende de dudas de la 004 y
  la 005 (escala y partidas de CS2, variación de rango por partida) remite a su versión
  aprobada; si al aprobarse cambian algo que esta spec cita, se revisa esta spec antes de
  aprobarla. Confirmado por el usuario (D11).
- Esta spec no cambia el servidor: usa solo operaciones ya definidas en las specs 003 y 004.
  Si el plan encuentra que hace falta un cambio en el servidor, primero se cambia la spec
  dueña de esa operación, y ese cambio lleva sus pruebas primero (constitución, principio 4).
  Confirmado por el usuario (D11).
- Origen: HU-11, RF-24 (vista 1) y sección 7 (V1) de la spec original.
- Las decisiones técnicas ya tomadas (sección 6, punto 4 —operaciones nuevas del contrato:
  usuario por identificador, disponibilidad, resumen por juego y cuentas de otro usuario— y
  sección 7 —ruta, componentes y estados—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.

## Usuarios
- Jugador con la sesión iniciada que vio a alguien en sus coincidencias o en una sesión de
  la agenda y quiere decidir si jugar con esa persona.

## Historias de usuario
- HU-1. Como jugador que vio una coincidencia, quiero abrir la ficha de esa persona para
  decidir si proponerle una sesión. Confirmado por el usuario (D11).
- HU-2. Como jugador, quiero ver en la ficha el rango, su evolución y las últimas partidas
  del otro en cada juego, y cambiar de juego sin recargar.
- HU-3. Como jugador, quiero ver qué horas tenemos en común y qué tan lejos estamos de rango
  para saber si nos sirve jugar juntos.
- HU-4. Como jugador, quiero proponer una sesión desde la ficha con el juego y la hora ya
  elegidos, para no tener que armarla desde cero en la agenda.

## Definiciones
- **Ficha**: página propia de otro jugador, identificada por su identificador de usuario.
  Es una ruta protegida (spec 007, definiciones). No es el perfil propio, aunque la
  navegación rotule el perfil como "Mi ficha".
- **Jugador de la ficha**: el usuario cuya ficha se muestra. **Usuario de la sesión**: el
  de la spec 007.
- **Juego elegido**: el de la pestaña seleccionada. No existe si el jugador de la ficha no
  tiene cuentas (RF-10).
- **Pestaña inicial**: la primera pestaña según el orden de RF-4.
- **Distancia de rango** y **bloques en común**: los definidos en la spec 005, con el mismo
  criterio que usa el servidor en las coincidencias; si la copia del dominio de la interfaz
  y la del servidor divergen, manda la del servidor (spec 007, RNF-6). Los bloques se
  comparan tal como cada uno los guardó, sin convertir zonas horarias (spec 003, definición
  de bloque horario; spec 005, definición de bloques en común).
- **Tramo en común**: serie de bloques en común seguidos del mismo día, agrupados como en la
  vista de coincidencias (por ejemplo, "Mar 20:00–23:00"). Un tramo no pasa de un día al
  siguiente: el martes 23:00 y el miércoles 00:00 forman dos tramos (decisión del usuario,
  P16).
- **Horario de la agenda**: las horas de inicio que ofrecen hoy la grilla de horas y el
  formulario de la agenda: de las 12:00 a las 23:00, más las 00:00 y las 01:00.
- **Bloque proponible**: bloque en común cuya hora está en el horario de la agenda
  (decisión del usuario, P3).
- **Orden de los bloques**: por día de la semana tipo, del lunes al domingo (las sesiones no
  tienen fecha, spec 006, fuera de alcance), y dentro de un día por la hora en su orden
  literal, de las 00:00 a las 23:00, de modo que las 00:00 y las 01:00 van antes que las
  12:00 (spec 003; decisión del usuario, P9). El lunes es siempre el primer día
  (confirmado por el usuario, D11).
- **Primer bloque proponible**: el primer bloque proponible según el orden de los bloques.
- **Motivo de bloqueo**: la razón por la que "Proponer sesión" no se puede usar (RF-12).
- **Datos para proponer**: los cuatro datos de los que dependen los motivos de bloqueo y el
  primer bloque proponible: las cuentas del jugador de la ficha, las cuentas del usuario de
  la sesión, la disponibilidad del usuario de la sesión y la disponibilidad del jugador de
  la ficha (RF-23).
- **Nombre corto del juego**: "LoL", "R6" o "CS2". Es el que usan los textos que dicen
  "<juego>" (RF-12, RF-13) (decisión del usuario: opción recomendada aplicada por
  delegación, P21).
- **Identificador del backend simulado**: el texto `user-` seguido de uno o más dígitos
  (por ejemplo `user-3`), que es la forma de los identificadores de usuario que hoy da el
  backend simulado a los jugadores semilla y a los registrados (decisión del usuario:
  opción recomendada aplicada por delegación, P22).
- **Mensaje de R6**, **Texto de error sin mensaje**, **error con mensaje**, **error sin
  mensaje**, **ruta de origen** y **modo simulado**: los definidos en la spec 007. El
  Mensaje de R6 es "Rango no disponible: Ubisoft no ofrece API oficial.", con el punto
  final.
- **Cuenta verificada** y **cuenta sin rango**: las definidas en la spec 004.

## Requisitos funcionales
- RF-1: MIENTRAS no hay sesión iniciada, CUANDO el jugador abre o recarga una ficha, EL
  SISTEMA no la muestra y lleva a login recordando la ficha como ruta de origen (spec 007,
  RF-25); al iniciar sesión vuelve a ella (spec 007, RF-8), en la pestaña inicial (RF-20).
  Con la ficha abierta, un 401 se trata según la spec 007, RF-7, y un cambio de sesión en
  otra pestaña, según su RF-24.
- RF-2: EL SISTEMA ofrece un enlace a la ficha desde cada fila de la vista de coincidencias
  y desde cada participante de las sesiones que muestra la agenda; cada enlace fija en la
  dirección el juego de esa coincidencia o sesión (RF-20). Los enlaces del detalle de
  sesión son de la spec 009 (su RF-4).
- RF-3: CUANDO el jugador abre una ficha, EL SISTEMA muestra los datos públicos del jugador
  de la ficha que el perfil propio muestra hoy de su dueño: nombre visible con su color de
  avatar, nombre de usuario, zona horaria, fecha de alta y biografía (spec 002, datos
  públicos), y nunca su correo (spec 003, RF-4; constitución, principio 5). Confirmado por
  el usuario (D1). La lista es cerrada: la ficha no muestra los totales del encabezado del
  perfil ("Juegos vinculados", "Cuentas verificadas", "Horas declaradas"), porque las
  pestañas, el sello de cada cuenta y las horas en común (RF-6) ya dan esa información
  (decisión del usuario: opción recomendada aplicada por delegación, P20).
- RF-4: EL SISTEMA muestra una pestaña por cada juego en que el jugador de la ficha tiene
  cuenta, en el orden LoL, R6, CS2, y, para el juego elegido, los datos de esa cuenta que
  el perfil propio muestra de cada cuenta, sin sus acciones (resincronizar, desvincular,
  verificar): rango vigente, posición en la escala del juego con el número de lecturas
  registradas y la primera lectura (es el historial de rango), región, verificación,
  fuente, última lectura, tasa de victorias y últimas partidas. La lista es cerrada
  (decisión del usuario: opción recomendada aplicada por delegación, P20), y cada dato se
  presenta según RF-16 cuando falta el rango o la fuente. Las últimas
  partidas son todas las que trae el resumen por juego (como máximo 8, la más reciente
  primero; spec 004, definición). Además muestra el identificador de la cuenta en el juego
  (Riot ID en LoL, Ubisoft ID en R6 y SteamID64 en CS2; spec 004, RF-2), para que el
  usuario de la sesión pueda contactar con él dentro del juego (decisión del usuario, P6).
  La tasa de victorias es el único dato de rendimiento, igual que en el perfil (spec 007,
  D13). Confirmado por el usuario (D2).
- RF-5: CUANDO el jugador cambia de pestaña, EL SISTEMA muestra los datos del otro juego sin
  recargar la página y deja el juego elegido en la dirección de la ficha, como parámetro de
  consulta, de modo que recargar la ficha o volver a ella con "Atrás" conserva la pestaña
  (decisión del usuario, P7). Cambiar de pestaña reemplaza la entrada de la ficha en el
  historial del navegador en lugar de añadir una nueva, así que "Atrás" sale de la ficha y
  no recorre las pestañas elegidas (decisión del usuario, P13).
- RF-6: EL SISTEMA muestra los bloques en común entre el jugador de la ficha y el usuario de
  la sesión de dos formas (decisión del usuario, P8): la lista de tramos en común, como en
  la vista de coincidencias, que cubre las 24 horas del día, y la grilla de horas de solo
  lectura con los bloques en común destacados (referencia, sección 7, V1), que dibuja solo
  las horas de la grilla actual (de las 12:00 a las 01:00); un bloque en común fuera de esas
  horas aparece solo en la lista. Muestra también el total de horas en común y, si hay
  juego elegido, la distancia de rango en ese juego con el mismo formato que la vista de
  coincidencias ("Δ <n> pts", con n entero, o "Sin datos" cuando falta un rango, como
  coincidencias según la spec 007, RF-14, y RF-17); sin juego elegido no muestra distancia
  (decisión del usuario, P16). Para el mismo par de jugadores y el mismo
  juego, las horas en común y la distancia son las mismas que muestra la vista de
  coincidencias.
- RF-7: CUANDO el usuario de la sesión elige "Proponer sesión" y no hay motivo de bloqueo
  ni falta ninguno de los datos para proponer (RF-23), EL SISTEMA lleva a la agenda, que
  abre su formulario de nueva sesión según la spec 007, RF-30, ya rellenado con: el
  juego elegido; el día y la hora de inicio del primer bloque proponible; como duración,
  las horas que van desde el primer bloque proponible hasta el final del tramo en común que
  lo contiene, con un mínimo de 1 y un máximo de 4 (spec 006, RF-6; decisión del usuario,
  P10 y P12), aunque el tramo empiece antes del primer bloque proponible; el título "Sesión con <nombre visible del jugador de la
  ficha>" (como hoy desde coincidencias; cabe en el máximo de 60 caracteres de la spec
  006, RF-6, porque el nombre visible tiene como máximo 40); y, en cupos y notas, los
  valores por defecto del formulario (5 cupos y notas vacías). No se publica nada hasta que
  el jugador anota la sesión en el formulario, donde puede cambiar cualquier campo antes
  (spec 006, RF-5).
- RF-8: MIENTRAS se carga una sección de la ficha (datos del jugador, pestañas, datos del
  juego elegido, horas en común y distancia), EL SISTEMA muestra en esa sección un estado
  de carga; al cambiar de pestaña, solo la sección de datos del juego, y la distancia,
  muestran carga mientras llega el resumen del nuevo juego. Confirmado por el usuario (D3).
  Los datos propios que usa la ficha tienen su sección: la disponibilidad del usuario de la
  sesión, la de horas en común (como la del jugador de la ficha), y sus cuentas, la de la
  distancia; su carga y su error (RF-18) se muestran ahí (decisión del usuario: opción
  recomendada aplicada por delegación, P19).
- RF-9: SI obtener el usuario de la ficha responde 400 o 404, ENTONCES EL SISTEMA muestra en
  lugar de toda la ficha el estado vacío "Este jugador no existe", con un enlace a
  coincidencias (referencia, sección 7, V1: "404 ('Este jugador no existe'), id mal
  formado (400 → mismo estado vacío)"). Es un estado vacío y no un error mostrado, así que,
  como caso particular, prevalece sobre la spec 007, RF-9. La ficha no valida por su
  cuenta el formato del identificador: lo decide el servidor (spec 003, RF-5). Confirmado
  por el usuario (D4).
- RF-10: SI el jugador de la ficha no tiene cuentas vinculadas, ENTONCES EL SISTEMA muestra,
  en lugar de las pestañas y de los datos de juego, el estado vacío "Este jugador no ha
  vinculado ningún juego"; sigue mostrando las horas en común (RF-6) y, solo si las zonas
  horarias son distintas, la nota de RF-22; no muestra distancia de rango porque no hay juego elegido (decisión del usuario, P16), y
  muestra "Proponer sesión"
  deshabilitado con el motivo 1 de RF-12 (decisión del usuario, P2).
- RF-11: EL SISTEMA obtiene todos los datos de la ficha a través del contrato único, del
  servidor real o, en modo simulado, del backend simulado. MIENTRAS está activo el modo
  simulado, el backend simulado responde a las operaciones de esta spec como el servidor:
  datos públicos sin correo cuando el usuario no es el de la sesión (spec 003, RF-4); 400
  para un identificador que no tiene la forma del identificador del backend simulado
  (Definiciones) y 404 para uno con esa forma que no existe, por ejemplo `user-999999`
  (spec 003, RF-5); la referencia propia
  resuelta al usuario de la sesión (spec 003, RF-6); y 404 al pedir el resumen de un juego
  en el que el usuario no tiene cuenta (spec 004, RF-13). Esta lista amplía, solo para las
  operaciones de esta spec, la de la spec 007, RF-10; sus datos semilla siguen la spec 007,
  RF-21 y RF-27. Confirmado por el usuario (D5).
- RF-12: MIENTRAS haya un motivo de bloqueo, EL SISTEMA muestra "Proponer sesión"
  deshabilitado y, junto a él, solo el primero que aplique de esta lista, ordenada de lo
  general a lo particular (primero las cuentas, después la disponibilidad de cada uno,
  después los bloques en común). "<juego>" es el nombre corto del juego elegido
  (Definiciones). Cada motivo se comprueba solo con sus datos ya cargados; cuando la lista
  llega a un motivo cuyo dato falta, se aplica RF-23:
  1. El jugador de la ficha no tiene cuentas vinculadas: "Este jugador no ha vinculado
     ningún juego" (decisión del usuario, P2).
  2. El usuario de la sesión no tiene cuenta en el juego elegido: "Vincula tu cuenta de
     <juego> para proponer una sesión", con un enlace a Configuración (decisión del
     usuario, P1).
  3. El usuario de la sesión no tiene disponibilidad: "No has marcado tus horas", con un
     enlace a Configuración.
  4. El jugador de la ficha no tiene disponibilidad: "Este jugador no ha marcado horas".
  5. No hay bloques en común: "No tienen horas en común".
  6. Hay bloques en común pero ninguno es proponible: "Sus horas en común quedan fuera del
     horario de la agenda (12:00 a 01:00)" (decisión del usuario, P3).
  En R6 no hay motivo por falta de rango: se puede proponer una sesión de R6. Los textos,
  el orden de la lista y la ausencia de motivo por rango en R6 están confirmados por el
  usuario (D6).
- RF-13: SI el usuario de la sesión no tiene cuenta en el juego elegido y ese juego no es
  R6, ENTONCES EL SISTEMA muestra, en lugar de la distancia, "Vincula tu cuenta de <juego>
  para ver la distancia de rango", con el nombre corto del juego (Definiciones), y un
  enlace a Configuración.
- RF-14: MIENTRAS el juego elegido es R6, EL SISTEMA muestra el Mensaje de R6 en lugar de la
  distancia, tenga o no cuenta en R6 el usuario de la sesión (spec 005, RF-10; spec 007,
  RF-12).
- RF-15: CUANDO el usuario de la sesión abre una ficha cuyo jugador es él mismo, por su
  identificador o por la referencia propia (spec 003, RF-6), EL SISTEMA lo lleva a su
  perfil reemplazando la entrada de la ficha en el historial del navegador, de modo que
  "Atrás" vuelve a la página anterior a la ficha. Vale igual en modo simulado. Confirmado
  por el usuario (D7).
- RF-16: EL SISTEMA aplica a cada cuenta de la ficha las mismas reglas de presentación que
  la spec 007 fija para el perfil: el Mensaje de R6 en lugar del rango y del historial de
  rango (RF-12); "Sin rango" en una cuenta de LoL o CS2 sin rango vigente, con el
  historial anterior si existe (RF-14); "Sin datos" en lugar de la tasa de victorias si la
  cuenta no tiene rango vigente o no tiene partidas, incluida toda cuenta de R6 (RF-14,
  P9 y D13); la posición en la escala, el número de lecturas registradas y la primera
  lectura en R6 y en una cuenta de LoL o CS2 sin rango vigente, según la spec 007, RF-14
  (su P13); las fuentes de la tabla de la spec 004, con el campo "Fuente" de la cuenta
  según la spec 007, RF-15 (su P14: el de la columna "Rango" y, en R6 con el servidor
  real, sin campo "Fuente"); "verificada" o "sin verificar"
  según la spec 004 (RF-16); y, en modo simulado, "Datos de demostración" como fuente de
  toda cuenta (RF-21, D3 y D11). Nunca rellena con 0 ni con valores de ejemplo un dato que
  la fuente no entregó (spec 004, RNF-2; constitución, principio 5); la variación de rango
  por partida se muestra según lo que fije la spec 004 aprobada. Confirmado por el usuario
  (D8).
- RF-17: SI el juego elegido es LoL o CS2 y el usuario de la sesión o el jugador de la ficha
  no tiene rango vigente en ese juego, ENTONCES EL SISTEMA muestra "Sin datos" en lugar de
  la distancia, como la spec 007 hace con la tasa de victorias (su RF-14 y P9), y nunca una
  distancia calculada con un rango ausente (decisión del usuario, P4). RF-13 prevalece
  cuando el usuario de la sesión no tiene cuenta en ese juego.
- RF-18: SI una petición de la ficha falla con un error sin mensaje, un 5xx o un error con
  mensaje no cubierto por RF-9, RF-19 o RF-25 (o no recibe respuesta, RF-24), ENTONCES EL
  SISTEMA muestra en la sección afectada (RF-8)
  el mensaje según la spec 007, RF-9 (el del servidor o, si no lo trae, el Texto de error
  sin mensaje), con el botón "Reintentar", que repite solo esa petición; el resto de la
  ficha sigue visible. Si la que falla es obtener el usuario, el error ocupa toda la ficha.
  No limpia la sesión del cliente; un 401 sigue la spec 007, RF-7. Confirmado por el
  usuario (D9).
- RF-19: SI el resumen del juego elegido responde 404 porque el jugador de la ficha
  desvinculó esa cuenta con la ficha abierta (spec 004, RF-13), ENTONCES EL SISTEMA vuelve
  a pedir sus cuentas, muestra solo las pestañas que queden y elige la pestaña inicial, que
  pasa a ser la de la dirección reemplazando la entrada del historial, como en RF-5 (P13);
  si no queda ninguna, aplica RF-10. Confirmado por el usuario (D9). Que la corrección de
  la dirección reemplace la entrada del historial está confirmado por el usuario (P14).
- RF-20: CUANDO se abre o se recarga una ficha, EL SISTEMA elige la pestaña del juego que
  indica la dirección si el jugador de la ficha tiene cuenta en él; si la dirección no
  indica juego, indica un valor que no es un juego o indica un juego en el que no tiene
  cuenta, elige la pestaña inicial y la dirección pasa a indicarla, reemplazando la entrada
  del historial como en RF-5 (decisión del usuario, P7, P13 y P14). Los enlaces de RF-2
  fijan el juego de la coincidencia o de la sesión de origen. Como la ruta de origen de la
  spec 007 no lleva parámetros de consulta, al volver a la ficha tras login (spec 007,
  RF-7, RF-24 o RF-25) la pestaña anterior se pierde y se usa la pestaña inicial.
  Confirmado por el usuario (D9). Que la corrección de la dirección reemplace la entrada
  del historial está confirmado por el usuario (P14).
- RF-21: CUANDO la agenda recibe una propuesta de un juego en el que el usuario de la sesión
  ya no tiene cuenta (por ejemplo, porque la desvinculó en otra pestaña), EL SISTEMA no abre
  el formulario y la agenda se muestra como si se hubiera abierto directamente. Confirmado
  por el usuario (D9). Es un caso de la regla de la agenda para toda propuesta, venga de la
  ficha o de coincidencias (spec 007, RF-30), que fija además qué hace la agenda mientras
  sus cuentas cargan o si fallan, y que la propuesta se usa una sola vez: recargar la
  agenda o volver con "Atrás" o "Adelante" a la entrada que trajo la propuesta no reabre el
  formulario.
- RF-22: MIENTRAS la zona horaria del jugador de la ficha es distinta de la del usuario de
  la sesión, EL SISTEMA muestra junto a las horas en común la nota "Las horas se comparan
  tal como cada uno las marcó, sin convertir zonas horarias" (decisión del usuario, P11).
  Dos zonas son distintas cuando sus identificadores no son iguales, tal como están
  guardados, aunque tengan el mismo desfase (decisión del usuario, P15).
- RF-23: MIENTRAS la lista de RF-12 llega a un motivo cuyo dato para proponer todavía se
  está cargando, EL SISTEMA muestra "Proponer sesión" deshabilitado con el texto "Cargando
  los datos para proponer una sesión…" junto a él; SI ese dato falló (RF-18 o RF-24),
  ENTONCES lo muestra deshabilitado con "No se pudieron cargar los datos para proponer una
  sesión.", y el "Reintentar" está en la sección que falló (RF-8). Un motivo anterior de
  la lista que ya aplica con datos cargados se muestra igual, aunque falten datos de los
  siguientes (por ejemplo, el motivo 1 con la disponibilidad todavía cargando). "Proponer
  sesión" solo queda habilitado con los cuatro datos para proponer cargados y ningún
  motivo, de modo que el primer bloque proponible siempre se puede calcular (decisión del
  usuario: opción recomendada aplicada por delegación, P18).
- RF-24: SI una petición de la ficha no recibe respuesta en 30 segundos desde que se
  envió, ENTONCES EL SISTEMA deja de esperarla, la trata como un error sin mensaje (RF-18:
  Texto de error sin mensaje y "Reintentar" en su sección, o en toda la ficha si es la del
  usuario) sin limpiar la sesión del cliente, y si la respuesta llega después no la
  muestra; mientras espera, la sección muestra su estado de carga (RF-8). Es el mismo
  plazo que la spec 007 fija para vincular y resincronizar (su RF-20) y vale solo para las
  peticiones de esta vista (decisión del usuario: opción recomendada aplicada por
  delegación, P24).
- RF-25: SI una petición de datos propios del juego elegido responde 404 porque el usuario
  de la sesión ya no tiene cuenta en ese juego (por ejemplo, la desvinculó en otra
  pestaña), ENTONCES EL SISTEMA no lo trata como un error de RF-18: vuelve a pedir las
  cuentas propias y aplica RF-13 a la distancia (RF-14 en R6) y el motivo 2 de RF-12 a
  "Proponer sesión" (decisión del usuario: opción recomendada aplicada por delegación,
  P23).
- RF-26: EL SISTEMA no vuelve a pedir por sí solo los datos de la ficha ni los propios: ni
  al volver el foco a la ventana o a la pestaña del navegador, ni de forma periódica. Solo
  los pide al abrir o recargar la ficha, al elegir una pestaña (puede mostrar sin pedirlos
  de nuevo los de una pestaña ya vista), con "Reintentar" y en RF-19 y RF-25. Por eso un
  cambio hecho en otra pestaña o en otro navegador no se ve hasta la siguiente de esas
  peticiones (decisión del usuario: opción recomendada aplicada por delegación, P25).

## Requisitos no funcionales
- RNF-1: Usa los componentes, tokens de diseño y patrones existentes; ningún color escrito a
  mano (`AGENTS.md`).
- RNF-2: Operable solo con teclado y con foco visible en pestañas, enlaces y acciones
  (`PRODUCT.md`, accesibilidad). Las pestañas siguen el patrón de pestañas accesibles: las
  flechas izquierda y derecha pasan a la pestaña anterior y a la siguiente, Inicio y Fin a
  la primera y a la última, y cada pestaña está asociada al panel que muestra. "Proponer
  sesión" deshabilitado sigue recibiendo el foco, y al recibirlo un lector de pantalla
  anuncia su motivo, que también se ve junto al botón (RF-12), o el texto de RF-23.
  Confirmado por el usuario (D10).
- RNF-3: Ningún contenido de otros usuarios (nombre visible, nombre de usuario, biografía,
  identificadores de cuenta y título propuesto) se inserta como HTML (spec 007, RNF-2;
  `AGENTS.md`).
- RNF-4: Construcción, comprobación de tipos y lint de la interfaz en verde (constitución,
  principio 4; spec 007, RNF-3).
- RNF-5: Con 360 px de ancho, la página no tiene desplazamiento horizontal; si la grilla de
  horas no cabe, se desplaza dentro de su propio recuadro. Todo texto de la ficha tiene un
  contraste de al menos 4,5:1 (3:1 en texto grande) en el tema claro y en el oscuro
  (`PRODUCT.md`, accesibilidad: "piso de contraste"). Confirmado por el usuario (D10).
- RNF-6: El primer bloque proponible, la duración propuesta, los bloques y tramos en común y
  la distancia de rango son reglas puras del dominio, sin reloj ni interfaz (constitución,
  principio 3); los bloques en común y la distancia reutilizan el criterio de la spec 005 y
  no lo duplican con otro. Confirmado por el usuario (D10). También lo son, por el mismo
  principio 3, elegir el motivo de bloqueo o el estado de RF-23 según el orden de RF-12 a
  partir de los datos para proponer, y elegir la pestaña o corregirla (orden de RF-4,
  RF-19 y RF-20) a partir de las cuentas del jugador de la ficha y del juego que indica la
  dirección. La regla del primer bloque proponible y de la duración es la misma que usa el
  "Proponer" de coincidencias (spec 007, RF-29) y no se duplica.

## Casos límite
- Juego de la ficha que el usuario de la sesión no juega: la pestaña se muestra igual (RF-4),
  la distancia se reemplaza por el texto de RF-13 (en R6 manda RF-14) y "Proponer sesión"
  muestra "Vincula tu cuenta de <juego> para proponer una sesión" (RF-12, motivo 2).
- Sin bloques en común y sin cuenta propia en el juego: se aplica RF-13 a la distancia y,
  a "Proponer sesión", solo el motivo 2 de RF-12.
- Jugador de la ficha sin cuentas: estado vacío en lugar de las pestañas, horas en común
  visibles, sin distancia, y "Proponer sesión" con "Este jugador no ha vinculado ningún
  juego" (RF-10, RF-12 motivo 1), aunque además falte disponibilidad (decisión del
  usuario, P16).
- El usuario de la sesión no ha marcado horas: cero horas en común y el motivo "No has
  marcado tus horas" (RF-12, motivo 3), no "No tienen horas en común".
- Bloques en común solo entre las 02:00 y las 11:00: aparecen en la lista de tramos, no en
  la grilla, y "Proponer sesión" muestra "Sus horas en común quedan fuera del horario de la
  agenda (12:00 a 01:00)" (RF-6, RF-12 motivo 6).
- Bloques en común dentro y fuera del horario de la agenda: los de fuera se muestran en la
  lista pero no se proponen; se propone el primer bloque proponible (RF-7).
- Bloques en común el mismo día a las 00:00 y a las 12:00: se propone el de las 00:00,
  porque dentro del día vale el orden literal (Definiciones, orden de los bloques).
- Tramo en común de más de 4 horas desde el primer bloque proponible: la duración propuesta
  es 4 (RF-7).
- Primer bloque proponible que no es el inicio de su tramo (por ejemplo, tramo de 10:00 a
  14:00): se propone a las 12:00 con 2 horas, hasta el final del tramo, no 4 (RF-7;
  decisión del usuario, P12).
- Bloques en común el martes a las 23:00 y el miércoles a las 00:00 (sin otros antes): son
  dos tramos distintos; se propone el martes a las 23:00 con 1 hora (Definiciones, tramo en
  común; decisión del usuario, P16).
- Bloques en común el miércoles a las 00:00 y a las 12:00, en tramos distintos: se propone
  el miércoles a las 00:00, porque dentro del día vale el orden literal (P9 y P16).
- Varios cambios de pestaña y después "Atrás": se sale de la ficha a la página anterior,
  sin recorrer las pestañas (RF-5; decisión del usuario, P13).
- Ficha propia abierta desde una sesión de la agenda donde participa el propio usuario, por
  su identificador o con la referencia propia: lleva al perfil y "Atrás" no vuelve a la
  ficha (RF-15).
- Identificador mal formado (por ejemplo `abc`) o con formato válido pero inexistente: "Este
  jugador no existe" (RF-9), con el servidor y en modo simulado (RF-11).
- Jugador eliminado mientras otro tenía abierta su ficha o una agenda con él como
  participante (spec 003, RF-11; spec 006, RF-16): la siguiente carga de su usuario responde
  404 y se muestra "Este jugador no existe" (RF-9); si lo que falla primero es otra
  petición, su sección sigue RF-18 o RF-19.
- Servidor caído o 5xx al abrir la ficha o al cambiar de pestaña: la sección afectada
  muestra el mensaje con "Reintentar" y el resto sigue visible (RF-18).
- Fallo parcial: el usuario carga y fallan su disponibilidad, sus cuentas o el resumen:
  cada sección muestra su propio error con "Reintentar" (RF-18).
- El jugador de la ficha desvincula la cuenta del juego elegido: al pedir su resumen se
  recibe 404, la pestaña desaparece y la dirección pasa a la pestaña inicial (RF-19).
- La dirección indica un juego en el que el jugador de la ficha no tiene cuenta, o un valor
  que no es un juego: se abre en la pestaña inicial y la dirección se corrige para
  indicarla, reemplazando la entrada del historial, sin dejar la dirección inválida en él
  (RF-20; confirmado por el usuario, P14).
- Llega un 401 o un cambio de sesión en otra pestaña con la ficha abierta en R6: tras
  iniciar sesión se vuelve a la ficha en la pestaña inicial, no en R6 (RF-20; spec 007,
  definición de ruta de origen).
- Cuenta de R6: Mensaje de R6 en rango, historial y distancia, "Sin datos" en tasa de
  victorias y la lista de partidas vacía, porque R6 no tiene partidas (spec 004, RF-19;
  RF-16). La posición en la escala muestra solo el Mensaje de R6, sin número de lecturas
  ni primera lectura, y con el servidor real la cuenta no muestra el campo "Fuente" (spec
  007, P13 y P14). Su Ubisoft ID se muestra igual (RF-4).
- Cuenta de LoL o CS2 sin rango vigente pero con historial (nueva temporada): "Sin rango",
  el historial anterior y "Sin datos" en la tasa de victorias (RF-16) y en la distancia
  (RF-17). La escala no marca posición vigente y muestra "Sin rango", con el número real
  de lecturas registradas y la primera lectura; sin historial, solo "Sin rango" (spec 007,
  P13).
- Cuenta de CS2: el campo "Fuente" nombra la fuente de la columna "Rango" de la spec 004
  (FACEIT), no Steam, que solo se nombra al hablar de la verificación (spec 007, P14).
- CS2: el rango, la escala, las partidas y la distancia siguen lo que fijen las specs 004 y
  005 aprobadas (Contexto, condición previa).
- Las sesiones están en la semana tipo, sin fecha (spec 006, fuera de alcance): un primer
  bloque proponible "ya pasado esta semana" no existe; el lunes es siempre el primer día
  (confirmado por el usuario, D11).
- Nombre visible de 40 caracteres: el título propuesto tiene 51 y cabe en el máximo de 60
  (RF-7).
- Llega un 401 o cambia la sesión en otra pestaña con el formulario propuesto abierto: el
  formulario se pierde (limitación declarada; spec 007, P11).
- Se recarga la agenda con el formulario propuesto abierto, o se vuelve con "Atrás" o
  "Adelante" a la entrada de la agenda que trajo la propuesta: el formulario no se reabre
  y la agenda se muestra como si se hubiera abierto directamente, así que no hay riesgo de
  anotar dos veces la misma propuesta (RF-21; spec 007, RF-30 y su P21).
- El usuario de la sesión desvinculó en otra pestaña la cuenta del juego propuesto: la
  agenda no abre el formulario (RF-21).
- La agenda recibe la propuesta mientras sus cuentas propias cargan: espera a que lleguen
  para abrir el formulario, que nunca se abre con la lista de juegos vacía; si fallan,
  muestra el error y descarta la propuesta (RF-21; spec 007, RF-30 y su P20).
- El usuario de la sesión desvincula su propia cuenta del juego elegido en otra pestaña con
  la ficha abierta: la ficha no lo ve hasta su siguiente petición (RF-26); si una petición
  de datos propios responde 404, se aplican RF-13 y el motivo 2, no el error de RF-18
  (RF-25); si antes pulsa "Proponer sesión", la agenda no abre el formulario (RF-21).
- Datos para proponer todavía cargando: "Proponer sesión" deshabilitado con "Cargando los
  datos para proponer una sesión…", salvo que ya aplique un motivo anterior de la lista
  (RF-23). Si uno falla: deshabilitado con "No se pudieron cargar los datos para proponer
  una sesión." y "Reintentar" en la sección que falló (RF-8, RF-18, RF-23).
- Falla solo la disponibilidad propia: el error con "Reintentar" aparece en la sección de
  horas en común; fallan solo las cuentas propias: aparece en el lugar de la distancia
  (RF-8, P19).
- Una petición de la ficha que no responde: a los 30 segundos su sección muestra el Texto
  de error sin mensaje con "Reintentar", sin llevar a login; una respuesta posterior no se
  muestra (RF-24).
- Volver el foco a la ventana con la ficha abierta no vuelve a pedir ningún dato (RF-26).
- Dos zonas horarias distintas: las horas se comparan tal como cada uno las marcó y la
  ficha muestra la nota de RF-22.
- Dos zonas con identificadores distintos y el mismo desfase (por ejemplo,
  America/Santiago y America/Buenos_Aires en ciertas fechas): cuentan como distintas y se
  muestra la nota (RF-22; decisión del usuario, P15).
- **Limitación declarada** (decisión del usuario, P6): la aplicación no avisa al jugador de
  la ficha de que se le propuso una sesión (spec 006, fuera de alcance: notificaciones o
  invitaciones). Para contactar con él, la ficha muestra su identificador en el juego
  (RF-4).
- **Limitación declarada** (decisión del usuario, P17): la grilla de horas dibuja las 00:00
  y las 01:00 después de las 23:00 del mismo día, mientras que el orden de los bloques (P9)
  y los tramos en común (P16) las cuentan como el comienzo del día. Por eso el martes 23:00
  y el martes 00:00 se ven seguidos en la grilla y no forman un tramo, y el martes 23:00
  con el miércoles 00:00 tampoco lo forman. La lista de tramos manda (RF-6, RF-7).

## Fuera de alcance
- Enviar invitaciones, mensajes o avisos al jugador de la ficha desde la aplicación (spec
  006, fuera de alcance: notificaciones o invitaciones; limitación declarada, P6).
- Editar datos desde la ficha.
- Detalle de sesión y sus enlaces a la ficha (spec 009).
- Convertir horas entre zonas horarias (specs 003 y 005).
- Proponer sesiones que empiecen fuera del horario de la agenda (P3).
- Conservar la pestaña elegida al volver a la ficha tras login (RF-20).
- Conservar el formulario propuesto al ir a login por un 401 o por un cambio de sesión en
  otra pestaña (spec 007, P11) y al recargar la agenda o volver a ella con "Atrás" o
  "Adelante" (spec 007, RF-30 y su P21).
- El "Proponer" de la vista de coincidencias: lo fija la spec 007, RF-29, con la misma
  regla de primer bloque proponible y duración que RF-7.
- Mostrar en la ficha los totales del encabezado del perfil (RF-3, P20).
- Refrescar los datos de la ficha de forma automática (RF-26, P25).
- Cambios en el servidor (Contexto).
- Hacer coherente la grilla de horas con los tramos a medianoche: la grilla sigue
  mostrando las 00:00 y las 01:00 tras las 23:00 del mismo día, aunque no formen tramo con
  ellas (limitación declarada, P17).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Recorrido manual registrado paso a paso, con fecha y resultado de cada paso, en el
      registro de validación de esta spec. Condiciones: servidor real, base vacía al
      empezar, clave de Riot renovada el mismo día y modo simulado desactivado. A tiene
      cuentas LoL con rango y R6, sin CS2; B tiene cuentas LoL con rango, R6 y CS2, y la
      biografía `<b>x</b>`; A y B tienen la misma zona horaria; C no tiene cuentas ni
      disponibilidad y tiene otra zona horaria. A y B tienen en común exactamente los
      bloques martes 20:00, 21:00 y 22:00 y jueves 03:00, y su distancia de rango en LoL
      es como máximo 25, de modo que B aparece en las coincidencias de LoL de A con los
      filtros por defecto de la spec 005 (distancia máxima 25, mínimo 2 horas). Pasos: A abre la ficha de B
      desde su fila en las coincidencias de LoL y la ficha se abre en la pestaña LoL
      (RF-2, RF-20); no aparece el correo de B y la biografía se ve como texto literal
      (RF-3, RNF-3); las pestañas están en el orden LoL, R6, CS2 y en LoL se ve el Riot ID
      de B (RF-4); la distancia y las 4 horas en común son las mismas que en la fila de
      coincidencias, la lista muestra los tramos "Mar 20:00–23:00" y "Jue 03:00–04:00", la
      grilla destaca solo los del martes, y no aparece la nota de zonas horarias (RF-6,
      RF-22); en R6, sin recargar, el rango, el historial y la distancia muestran el
      Mensaje de R6, la tasa de victorias "Sin datos", la escala no muestra número de
      lecturas ni primera lectura, no hay campo "Fuente" y se ve el Ubisoft ID de B (RF-4,
      RF-5, RF-14, RF-16); recargar con R6 elegida mantiene R6 (RF-5); en CS2 el campo
      "Fuente" de la cuenta de B nombra FACEIT y no Steam (RF-16), y la distancia
      muestra "Vincula tu cuenta de CS2 para ver la distancia de rango" y "Proponer
      sesión" está deshabilitado con "Vincula tu cuenta de CS2 para proponer una sesión"
      (RF-12, RF-13); en LoL, "Proponer sesión" abre el formulario de la agenda con LoL,
      martes, 20:00, 3 horas, "Sesión con <nombre visible de B>", 5 cupos y notas vacías
      (RF-7); A la anota, y
      "Atrás" desde la agenda vuelve a la ficha en la pestaña LoL (RF-5), y un segundo
      "Atrás" vuelve a las coincidencias, sin pasar por las pestañas CS2 ni R6 elegidas
      antes (RF-5, P13); B se suma, y A
      abre la ficha de B desde la agenda (RF-2) y su propia ficha desde la misma sesión,
      que lo lleva al perfil; "Atrás" vuelve a la agenda (RF-15).
- [ ] Estados, dentro del mismo registro: con la red limitada a "3G lenta" en las
      herramientas del navegador se ve el estado de carga de cada sección y, al cambiar de
      pestaña, solo el de los datos del juego y el de la distancia (RF-8), y mientras falta
      algún dato para proponer "Proponer sesión" está deshabilitado con "Cargando los datos
      para proponer una sesión…" (RF-23); bloqueando en las herramientas del navegador
      solo la petición de la disponibilidad de A, la sección de horas en común muestra el
      error con "Reintentar" y "Proponer sesión" muestra "No se pudieron cargar los datos
      para proponer una sesión." (RF-8, RF-18, RF-23); la ficha de C muestra "Este jugador
      no ha vinculado ningún juego" en lugar de las pestañas, las horas en común (0), la
      nota de zonas horarias, ninguna distancia de rango y "Proponer sesión" deshabilitado con "Este jugador no ha
      vinculado ningún juego" (RF-10, RF-12, RF-22); un identificador inexistente con
      formato válido y el identificador `abc` muestran "Este jugador no existe" (RF-9); la
      referencia propia en lugar del identificador lleva al perfil (RF-15); con la sesión
      cerrada, abrir la ficha de B con R6 en la dirección lleva a login y, al entrar, de
      vuelta a la ficha en la pestaña LoL (RF-1, RF-20); con B sin disponibilidad, el
      motivo es "Este jugador no ha marcado horas", con A sin disponibilidad, "No has
      marcado tus horas", y con el jueves 03:00 como única hora en común, "Sus horas en
      común quedan fuera del horario de la agenda (12:00 a 01:00)" (RF-12); abrir la ficha
      de B con un valor inventado como juego en la dirección la abre en la pestaña LoL y
      la dirección pasa a indicar LoL (RF-20); B abre la ficha de A con CS2 en la
      dirección (A no tiene CS2) y se abre en la pestaña LoL con la dirección corregida a
      LoL; en ambos casos "Atrás" vuelve a la página anterior a la ficha y no a la
      dirección inválida (RF-20, P14).
- [ ] Con la ficha de B abierta sin haber elegido nunca la pestaña R6, B desvincula su
      cuenta de R6 en otro navegador; al elegir R6, A ve desaparecer la pestaña y la ficha
      pasa a la pestaña LoL, también en la dirección (RF-19). Antes de elegir R6, volver el
      foco a la ventana de A no muestra ningún cambio ni hace peticiones en la pestaña de
      red (RF-26).
- [ ] Agenda, dentro del mismo registro: tras abrir el formulario desde la ficha, recargar
      la agenda la muestra sin formulario; volver a la ficha con "Atrás" y a la agenda con
      "Adelante" tampoco lo reabre; con "3G lenta", "Proponer sesión" abre el formulario
      con la lista de juegos ya cargada y LoL elegido; bloqueando la petición de las
      cuentas de A, la agenda muestra el error y no abre el formulario (RF-21; spec 007,
      RF-30). Con la ficha de B abierta en LoL, A desvincula su cuenta de LoL en otra
      pestaña y pulsa "Proponer sesión": la agenda no abre el formulario y se muestra como
      si se hubiera abierto directamente; al volver a la ficha y recargarla, la distancia
      muestra "Vincula tu cuenta de LoL para ver la distancia de rango" y "Proponer sesión"
      el motivo 2, sin ningún error con "Reintentar" (RF-13, RF-21, RF-25).
- [ ] Con un jugador D con cuenta de LoL sin rango vigente (sin clasificar en la temporada)
      y bloques en común con A, abrir la ficha de D por su dirección muestra "Sin rango" en
      el rango y en la escala, "Sin datos" en la tasa de victorias y "Sin datos" en lugar
      de la distancia, nunca un número (RF-16, RF-17). Si D tiene historial anterior, se ve
      con su número de lecturas y su primera lectura; si no hay una cuenta así disponible,
      ese caso se comprueba revisando el código de la ficha y el resultado queda en el
      registro (RF-16).
- [ ] Con una limitación de red personalizada de 40 segundos de latencia, abrir la ficha de
      B muestra el estado de carga de cada sección y, a los 30 segundos, "No se pudo
      conectar con el servidor. Inténtalo de nuevo." con "Reintentar", sin llevar a login
      (RF-24).
- [ ] Una revisión del código nuevo de la ficha no encuentra colores escritos a mano: todos
      salen de los tokens de diseño o de los componentes existentes que reutiliza (RNF-1).
- [ ] Con la ficha de B abierta, apagar el servidor y elegir una pestaña no abierta antes
      muestra en esa sección "No se pudo conectar con el servidor. Inténtalo de nuevo." y
      "Reintentar", sin llevar a login y con el resto visible; encender el servidor y pulsar
      "Reintentar" carga la sección (RF-18).
- [ ] Con el modo simulado y la cuenta demo, abrir la ficha de un jugador semilla desde las
      coincidencias: ninguna cuenta de LoL ni de R6 aparece como verificada, la fuente de
      cada cuenta es "Datos de demostración", las cuentas de R6 muestran el Mensaje de R6,
      el identificador `user-999999` (con la forma del identificador del backend simulado
      e inexistente) y el identificador `abc` muestran "Este jugador no existe", abrir la
      ficha propia por su identificador y por la referencia propia lleva al perfil y
      "Atrás" no vuelve a la ficha (RF-15), y la pestaña de red no muestra peticiones al
      servidor (RF-11, RF-16). RF-19 no se puede provocar en modo simulado, porque desde la
      interfaz solo se desvinculan cuentas propias: se comprueba revisando que el backend
      simulado responde 404 al resumen de un juego sin cuenta (RF-11), y el resultado queda
      en el registro.
- [ ] Una revisión de las reglas puras del dominio, con los datos del recorrido y con los
      casos límite de 00:00 y 12:00 el mismo día, del tramo de más de 4 horas, del tramo
      de 10:00 a 14:00 (12:00 y 2 horas) y del martes 23:00 con el miércoles 00:00 (dos
      tramos; martes 23:00 y 1 hora), da los tramos, el primer bloque proponible y la
      duración que fijan las definiciones y RF-7, y el resultado queda en el registro de
      validación (RF-7, RNF-6, P12, P16). La misma revisión cubre la elección del motivo o
      del estado de RF-23 (cada motivo de la lista, el motivo 1 con datos todavía
      cargando y un dato fallido) y la elección o corrección de la pestaña (dirección sin
      juego, con un valor que no es un juego, con un juego sin cuenta y tras desaparecer
      la pestaña) (RF-12, RF-19, RF-20, RF-23, RNF-6).
- [ ] Recorrido solo con teclado y con el lector de pantalla NVDA en Chrome, registrado: se
      llega a la ficha desde coincidencias y desde la agenda, las pestañas se recorren con
      flechas, Inicio y Fin, el foco se ve siempre, y "Proponer sesión" deshabilitado
      recibe el foco y NVDA anuncia su motivo o el texto de RF-23 (RNF-2; decisión del
      usuario: opción recomendada aplicada por delegación, P26).
- [ ] Con 360 px de ancho en las herramientas del navegador, la página no se desplaza en
      horizontal; en los dos temas, la auditoría de accesibilidad de Lighthouse en Chrome
      sobre la ficha no da ningún fallo de contraste, y los textos que solo aparecen en
      otros estados (motivos de bloqueo, textos de RF-23, errores, estados vacíos y nota de
      zonas horarias) se miden con el selector de color de las herramientas de Chrome, sin
      ninguno por debajo de 4,5:1 (3:1 en texto grande) (RNF-5; P26).
- [ ] CS2 se valida igual que LoL cuando las specs 004 y 005 aprobadas fijen su escala y sus
      partidas (Contexto).

## Decisiones de clarificación
- Revisión QA (CAMBIOS NECESARIOS, 6 graves) incorporada en lo que ya estaba decidido, con
  la fuente citada en cada requisito.
- P1 — decisión del usuario: sin cuenta propia en el juego elegido, "Proponer sesión" se
  deshabilita con "Vincula tu cuenta de <juego> para proponer una sesión" y un enlace a
  Configuración. Quedó en RF-12 (motivo 2), Casos límite y Criterios de finalización.
- P2 — decisión del usuario: si el jugador de la ficha no tiene cuentas, se muestran las
  horas en común y "Proponer sesión" se deshabilita con "Este jugador no ha vinculado
  ningún juego". Quedó en RF-10, RF-12 (motivo 1), Casos límite y Criterios de
  finalización.
- P3 — decisión del usuario: para proponer solo cuentan los bloques entre las 12:00 y las
  01:00; los demás se muestran pero no se proponen; si no queda ninguno, el botón se
  deshabilita con "Sus horas en común quedan fuera del horario de la agenda (12:00 a
  01:00)". Quedó en Definiciones (bloque proponible), RF-7, RF-12 (motivo 6), Casos
  límite, Fuera de alcance y Criterios de finalización.
- P4 — decisión del usuario: en LoL o CS2, si uno de los dos no tiene rango vigente, la
  distancia muestra "Sin datos", como la P9 de la spec 007. Quedó en RF-17 y Casos límite.
- P5 — decisión del usuario: las dos vistas nuevas del Hito 2 son la ficha de jugador
  (008) y el detalle de sesión (009). Quedó en Contexto; `MEMORY.md` debe actualizarse
  fuera de esta spec.
- P6 — decisión del usuario: no avisar al jugador de la ficha se declara como limitación,
  y la ficha muestra su identificador en el juego (Riot ID, Ubisoft ID o SteamID64; spec
  004, RF-2). Quedó en RF-4, Casos límite, Fuera de alcance y Criterios de finalización.
- P7 — decisión del usuario: la pestaña elegida queda en la dirección, se conserva al
  recargar y con "Atrás", y los enlaces de origen la fijan; tras un 401 se pierde, porque
  la ruta de origen de la spec 007 no lleva parámetros, y se usa la pestaña inicial. Quedó
  en Definiciones (pestaña inicial), RF-1, RF-2, RF-5, RF-19, RF-20, Casos límite, Fuera de
  alcance y Criterios de finalización.
- P8 — decisión del usuario: las horas en común se muestran como lista de tramos, como en
  coincidencias (cubre las 24 h), y como grilla de solo lectura con el traslape
  (referencia, V1). Quedó en Definiciones (tramo en común), RF-6 y Criterios de
  finalización.
- P9 — decisión del usuario: dentro de un día vale el orden literal de la spec 003, con las
  00:00 antes que las 12:00. Quedó en Definiciones (orden de los bloques) y Casos límite.
- P10 — decisión del usuario: la duración propuesta es la del tramo en común que empieza en
  el primer bloque proponible, entre 1 y 4 horas (spec 006, RF-6). Quedó en RF-7, Casos
  límite y Criterios de finalización. Nota: precisada por P12 (desde el primer bloque
  proponible hasta el final de su tramo).
- P11 — decisión del usuario: con zonas horarias distintas, la ficha muestra la nota "Las
  horas se comparan tal como cada uno las marcó, sin convertir zonas horarias". Quedó en
  RF-22, Casos límite y Criterios de finalización.
- D1 a D11 — decisión del usuario ("confirma todas las deducciones de 008"): quedan tal
  como estaban redactadas y se marcan "Confirmado por el usuario" en el texto.
  - D1: RF-3, mismos datos públicos que el perfil propio, nunca el correo.
  - D2: RF-4, pestañas LoL, R6, CS2; datos de cuenta del perfil sin sus acciones; todas
    las partidas del resumen (máximo 8); la tasa de victorias es el único dato de
    rendimiento (spec 007, D13).
  - D3: RF-8, carga por sección y, al cambiar de pestaña, solo en datos del juego y
    distancia.
  - D4: RF-9, estado vacío "Este jugador no existe" para el 400 y el 404, que prevalece
    sobre la spec 007, RF-9; el formato del identificador lo decide el servidor.
  - D5: RF-11, el backend simulado responde 400 o 404 según su forma de identificador y
    amplía la lista de la spec 007, RF-10.
  - D6: RF-12, textos de los motivos 3, 4 y 5, orden completo de la lista y sin motivo
    por falta de rango en R6.
  - D7: RF-15, la ficha propia lleva al perfil también con la referencia propia y no
    queda en el historial.
  - D8: RF-16, las reglas de presentación de la spec 007 para el perfil valen en la ficha.
  - D9: RF-18 a RF-21, error por sección con "Reintentar", pestaña que desaparece tras un
    404 del resumen, elección de pestaña según el origen y agenda que no abre el
    formulario sin cuenta en el juego.
  - D10: RNF-2, RNF-5 y RNF-6.
  - D11: condición previa encadenada a la 007, sin cambios en el servidor, enlaces del
    detalle de sesión en la 009, redacción de HU-1 y semana tipo sin fechas con el lunes
    como primer día.
- P12 — decisión del usuario: la duración va desde el primer bloque proponible hasta el
  final de su tramo, entre 1 y 4 horas (tramo de 10:00 a 14:00: 12:00 y 2 horas). Quedó en
  RF-7, Casos límite y Criterios de finalización.
- P13 — decisión del usuario: cambiar de pestaña reemplaza la entrada del historial;
  "Atrás" sale de la ficha. Quedó en RF-5, RF-19, RF-20, Casos límite y Criterios de
  finalización (nuevo paso en el recorrido).
- P14 — decisión del usuario: si la dirección indica un juego sin cuenta o un valor
  inválido, se abre la pestaña inicial y se corrige la dirección. Quedó en RF-20, Casos
  límite y Criterios de finalización (nuevo paso con juego sin cuenta). Confirmado por el
  usuario: al corregir la dirección (pestaña inválida o pestaña que desaparece) se
  reemplaza la entrada del historial. Quedó en RF-19, RF-20 y Casos límite.
- P15 — decisión del usuario: las zonas horarias se comparan por su identificador tal
  como está guardado, aunque tengan el mismo desfase. Quedó en RF-22 y Casos límite.
- P16 — decisión del usuario: los tramos no pasan de un día al siguiente, y sin cuentas
  en la ficha no se muestra distancia. Quedó en Definiciones (tramo en común), RF-6,
  RF-10, Casos límite y Criterios de finalización.
- P17 — decisión del usuario: la incoherencia entre la grilla (00:00 y 01:00 tras las
  23:00 del mismo día) y los tramos y el orden de los bloques (00:00 y 01:00 al comienzo
  del día, P9 y P16) se declara como limitación. Quedó en Casos límite y Fuera de alcance.
- Informe QA final (última corrección): incorporado sin reabrir P1-P17 ni D1-D11. Las
  correcciones sin decisión nueva son: la nota de RF-22 en RF-10 queda condicionada a
  zonas distintas; el criterio del recorrido añade la condición de distancia en LoL de
  como máximo 25 y el de estados incluye la carga de la distancia al cambiar de pestaña
  (D3); los casos límite y fuera de alcance ya no atribuyen a la spec 007, P11, la pérdida
  del formulario al recargar; RNF-6 añade, por el principio 3 de la constitución, la
  elección del motivo y de la pestaña; y se añaden criterios para RF-15 y RF-19 en modo
  simulado, RF-16 ("Sin rango" con historial), RF-17, RF-21 y RNF-1.
- P18 — decisión del usuario: opción recomendada aplicada por delegación. Mientras falta
  un dato para proponer, "Proponer sesión" se deshabilita con "Cargando los datos para
  proponer una sesión…" o, si falló, con "No se pudieron cargar los datos para proponer
  una sesión."; un motivo anterior ya determinable se muestra igual; solo se habilita con
  los cuatro datos cargados. Quedó en Definiciones (datos para proponer), RF-7, RF-12,
  RF-23, RNF-2, Casos límite y Criterios de finalización.
- P19 — decisión del usuario: opción recomendada aplicada por delegación. La carga y el
  error de la disponibilidad propia se muestran en la sección de horas en común y los de
  las cuentas propias en el lugar de la distancia. Quedó en RF-8, RF-18 y Casos límite.
- P20 — decisión del usuario: opción recomendada aplicada por delegación. Las listas de
  RF-3 y RF-4 son cerradas; la ficha no muestra los totales del encabezado del perfil y sí
  el número de lecturas registradas y la primera lectura junto a la escala. Quedó en RF-3,
  RF-4, Fuera de alcance y Criterios de finalización.
- P21 — decisión del usuario: opción recomendada aplicada por delegación. "<juego>" en los
  textos de RF-12 y RF-13 es el nombre corto (LoL, R6, CS2). Quedó en Definiciones, RF-12 y
  RF-13.
- P22 — decisión del usuario: opción recomendada aplicada por delegación. El
  identificador del backend simulado es `user-` seguido de dígitos, la forma que ya da hoy;
  cualquier otro texto responde 400 y uno con esa forma que no existe, 404. Quedó en
  Definiciones, RF-11 y Criterios de finalización.
- P23 — decisión del usuario: opción recomendada aplicada por delegación. Un 404 de datos
  propios porque el usuario de la sesión desvinculó su cuenta no es un error de RF-18: se
  vuelven a pedir las cuentas propias y se aplican RF-13 y el motivo 2. Quedó en RF-18,
  RF-25, Casos límite y Criterios de finalización.
- P24 — decisión del usuario: opción recomendada aplicada por delegación. Toda petición de
  la ficha espera como máximo 30 segundos; después se trata como un error sin mensaje y la
  respuesta tardía no se muestra. Quedó en RF-18, RF-24, Casos límite y Criterios de
  finalización.
- P25 — decisión del usuario: opción recomendada aplicada por delegación. La ficha no
  refresca sus datos sola, ni al volver el foco ni de forma periódica. Quedó en RF-26,
  Casos límite, Fuera de alcance y Criterios de finalización.
- P26 — decisión del usuario: opción recomendada aplicada por delegación. El recorrido con
  lector de pantalla se hace con NVDA en Chrome, y el contraste se revisa con la auditoría
  de accesibilidad de Lighthouse en los dos temas más el selector de color de las
  herramientas de Chrome para los textos de estados que la auditoría no ve. Quedó en
  Criterios de finalización.
- Decisiones de la spec 007 que esta spec usa (P13, P14, P17, P18, P19, P20 y P21 de la
  007): presentación de la escala sin rango y en R6, campo "Fuente" de la cuenta, "Sin
  datos" en la distancia de coincidencias, "Proponer" de coincidencias con la misma regla
  que RF-7, y recepción de toda propuesta en la agenda. Quedaron en RF-4, RF-6, RF-16,
  RF-21, RNF-6, Casos límite y Fuera de alcance.

## Dudas abiertas
- Dependencia externa (no la resuelve el usuario de esta spec): aprobación de la spec 007,
  que espera la de las specs 001 a 006 (Contexto, condición previa).
