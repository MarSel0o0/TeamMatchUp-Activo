# Spec 008 — Vista nueva: ficha de jugador
Estado: aprobada (2026-10-18)

## Contexto y objetivo
El enunciado del Hito 2 exige dos vistas completas nuevas que funcionen de punta a punta
contra el servidor real y respeten las rutas protegidas, sin nombrarlas. La spec original
(sección 7) propuso dos: esta ficha y el detalle de sesión (spec 009). El usuario confirmó
que las dos vistas nuevas del Hito 2 son esas dos (decisión del usuario, P5). `MEMORY.md`
debe recoger esta decisión (P5) al cerrar la fase; esa actualización queda fuera de esta
spec.

Hoy, desde una coincidencia, el jugador solo ve una fila: no puede revisar el perfil
completo del otro antes de proponerle una sesión. La ficha muestra rango y horario juntos
(`PRODUCT.md`, principio 1) y lleva a proponer una sesión en la agenda (principio 3). Usa
operaciones del servidor que las vistas actuales no usan: obtener un usuario por su
identificador (spec 003, RF-3), listar las cuentas de otro usuario (spec 004, RF-2) y leer
la disponibilidad (spec 003, RF-12) y el resumen por juego (spec 004, RF-12) de otro
usuario. Todas pasan por el contrato único (constitución, principio 3).

En los tres juegos (LoL, R6 y CS2) el rango, el historial, las partidas y la marca de
verificada los entrega un proveedor simulado y determinista, sin ninguna fuente externa, y
toda cuenta lleva la marca de datos simulados (spec 004, RF-34, RF-37 y RF-41). Toda cuenta
tiene rango y al menos una partida (spec 004, RF-4 y RF-36), y la distancia de rango existe
en los tres juegos (spec 005, definición). La ficha los muestra como la spec 007 los
muestra en el perfil y en coincidencias, con la Etiqueta de datos simulados también con el
servidor real (RF-27).

- Depende de: spec 007 (sesión y usuario de la sesión, rutas protegidas, ruta de origen,
  reglas de presentación del rango, de la escala y de la Etiqueta de datos simulados, modo
  simulado, plazo de 30 segundos de toda petición, y cómo recibe la agenda una propuesta,
  su RF-30) y, de forma directa, de las specs 003 (usuario y disponibilidad), 004 (cuentas,
  resumen por juego, escala de rango y datos simulados), 005 (distancia de rango y bloques
  en común) y 006 (agenda, a la que lleva "Proponer sesión", y su DP6-33: las specs 007 y
  009 deben adoptar en la interfaz las mismas reglas del título que el servidor; RF-7,
  P46).
  **Condición previa (cumplida)**: esta spec no se aprobaba ni se empezaba su plan hasta que
  estuviera aprobada la spec 007, que a su vez esperaba a las specs 001 a 006 (spec 007, P1
  y D4; constitución, principio 2; confirmado por el usuario, D11). Estado al 2026-10-18:
  001 a 003 implementadas; 004 y 005 aprobadas (2026-10-17); 006 y 007 aprobadas
  (2026-10-18). Esta spec se revisó el 2026-10-18 contra esas versiones aprobadas (revisión
  QA y segunda revisión QA) y quedó alineada con ellas; si cualquiera cambia algo que esta
  spec cita, se revisa esta spec antes de seguir.
- Esta spec no cambia el servidor: usa solo operaciones ya definidas en las specs 003 y 004.
  Si el plan encuentra que hace falta un cambio en el servidor, primero se cambia la spec
  dueña de esa operación, y ese cambio lleva sus pruebas primero (constitución, principio 4).
  Confirmado por el usuario (D11). El archivo de peticiones manuales de usuarios del
  servidor (el de la carpeta de peticiones para probar la API a mano que ya tiene la
  petición de actualizar el perfil propio) es una herramienta de prueba manual y no forma
  parte del servidor: añadirle una petición no es un cambio del servidor, así que el plan
  de esta spec puede añadir la del nombre visible con tabulador (P40) (decisión del
  usuario, P45).
- Origen: HU-11, RF-24 (vista 1) y sección 7 (V1) de la spec original.
- Las decisiones técnicas ya tomadas (sección 6, punto 4 —operaciones nuevas del contrato:
  usuario por identificador, disponibilidad, resumen por juego y cuentas de otro usuario— y
  sección 7 —ruta, componentes y estados—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec, salvo
  todo lo que concierne a fuentes reales de rango, claves o verificación con Steam, que la
  spec 004 revocó.

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
  criterio que usa el servidor en las coincidencias: la distancia es la diferencia absoluta
  entre los rangos normalizados vigentes de la spec 004 (DP-26), existe en los tres juegos y
  es un dato simulado (spec 005, "Marca de datos simulados" y DP5-15; RF-27). Si la copia
  del dominio de la interfaz y la del servidor divergen, manda la del servidor (spec 007,
  RNF-6). Los bloques se comparan tal como cada uno los guardó, sin convertir zonas horarias
  (spec 003, definición de bloque horario; spec 005, definición de bloques en común).
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
  opción recomendada aplicada por delegación, P22). La forma se reconoce y el identificador
  se compara sin distinguir mayúsculas de minúsculas, como el servidor compara los
  identificadores (spec 003, Definiciones, "Identificador con formato válido"): `USER-3`,
  `User-3` y `user-3` tienen esa forma y designan al mismo jugador (decisión del usuario,
  P49).
- **Texto de error sin mensaje**, **error con mensaje**, **error sin mensaje**, **ruta de
  origen**, **modo simulado**, **marca de datos simulados** y **Etiqueta de datos
  simulados**: los definidos en la spec 007. La Etiqueta de datos simulados tiene siempre
  el texto «Datos de demostración», con el servidor real y en modo simulado (spec 007,
  definiciones y su R19). La definición "Mensaje de R6" se retira: ese mensaje ya no existe
  (decisión del usuario, P27).
- **Identificador de cuenta**: el definido en la spec 004 (Definiciones y RF-6): Riot ID en
  LoL, Ubisoft ID en R6 y SteamID64 en CS2.
- **Cuenta verificada**: la definida en la spec 004 (RF-41): marca que fija el proveedor
  simulado según el juego y el identificador; no demuestra que la cuenta sea de quien la
  vinculó y es un dato simulado. La definición "cuenta sin rango" se retira: la spec 004 no
  la define y toda cuenta tiene rango (decisión del usuario, P30).

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
  el perfil propio muestra de cada cuenta, sin sus acciones (resincronizar y desvincular;
  no existe ninguna acción para verificar, spec 007, RF-18): rango vigente; posición en la
  escala del juego con el número de lecturas registradas, la primera lectura (es el
  historial de rango) y la diferencia desde la primera lectura, igual que el perfil (spec
  007, RF-14 y su P22; decisión del usuario, P36 y P39), en una de estas dos formas, con n
  el valor absoluto de la diferencia de rango normalizado: "▲ +<n> pts desde la primera
  lectura" si el rango subió o no cambió y "▼ −<n> pts desde la primera lectura" si bajó
  (con el signo menos tipográfico "−", no el guion "-"); la regla de subida incluye el 0,
  así que con diferencia 0 (por ejemplo, una cuenta con una sola lectura o que volvió a su
  rango inicial) muestra "▲ +0 pts desde la primera lectura", igual que el perfil hoy
  (decisión del usuario, P41); región; la marca de
  verificada; la Etiqueta de datos simulados en el lugar donde iba el campo "Fuente" (RF-16;
  decisión del usuario, P28); última lectura; tasa de victorias y últimas partidas. La
  lista es cerrada (decisión del usuario: opción recomendada aplicada por delegación, P20,
  ampliada por P28 y P36), y cada dato se presenta según RF-16 y RF-27. La escala es la de
  la spec 004 (Definiciones, "Escala de rango" y "Banda de puntos"; DP-2 y DP-34): LoL de
  Iron a Challenger con LP, R6 de Copper a Champion con MMR y CS2 de Grey a Gold, sin
  división, con CS Rating; la de R6 se muestra en el bloque de posición en la escala igual
  que las otras dos (spec 007, RF-12). Las últimas partidas son todas las que trae el resumen por juego (de 1 a 8, la
  más reciente primero; spec 004, definición de resumen por juego y RF-36), cada una con su
  resultado, su resumen con el formato de la spec 004 (LoL `<campeón> ·
  <asesinatos>/<muertes>/<asistencias>`, R6 `<operador> · <bajas> bajas`, CS2 `<mapa> ·
  <rondas a favor>-<rondas en contra>`), su duración y su variación de rango, que es un
  entero y siempre llega (spec 004, definición de partida), como en el perfil. Además
  muestra el identificador de la cuenta en el juego (Riot ID en LoL, Ubisoft ID en R6 y
  SteamID64 en CS2; spec 004, Definiciones, "Identificador de cuenta", y RF-6), para que el
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
  juego elegido, la distancia de rango en ese juego, en cualquiera de los tres juegos, con
  el mismo formato que la vista de coincidencias ("Δ <n> pts", con n entero de 0 a 100) y
  con la Etiqueta de datos simulados (RF-27), salvo lo que fijan RF-13 y RF-17 de esta
  spec; sin juego elegido no muestra distancia (decisión del usuario, P16). La distancia se
  calcula con el rango vigente de la cuenta del jugador de la ficha en el juego elegido
  (la de su resumen por juego) y con el rango vigente de la cuenta del usuario de la sesión
  en ese juego tal como llega en la lista de sus cuentas, que ya es uno de los datos para
  proponer; la ficha no pide el resumen propio (decisión del usuario, P33). Para el mismo
  par de jugadores y el mismo juego, las horas en común y la distancia son las mismas que
  muestra la vista de coincidencias.
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
  (spec 006, RF-5). SI al anotar la sesión el servidor rechaza el título propuesto (por
  ejemplo, porque el nombre visible del jugador de la ficha contiene un carácter prohibido
  en el título de la spec 006, RF-6 y DP6-31, que la spec 003 no prohíbe en el nombre
  visible), ENTONCES EL SISTEMA muestra el error en el formulario según la spec 007, RF-9,
  sin anotar nada, y el jugador corrige el título y vuelve a anotar, igual que con el
  "Proponer" de coincidencias (spec 007, RF-29). La ficha no quita ni cambia caracteres del
  título propuesto (decisión del usuario, P34). La spec 006 pide que la interfaz adopte en
  el formulario las mismas reglas del título que el servidor (su DP6-33): si el formulario
  las aplica, el error que vale es el del propio formulario, mostrado antes de enviar, en
  lugar del 400 del servidor; en los dos casos no se anota nada hasta que el jugador
  corrige el título (decisión del usuario, P46).
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
  solo para un identificador que no tiene la forma del identificador del backend simulado,
  sin distinguir mayúsculas de minúsculas (Definiciones), y 404 para uno con esa forma que
  no existe, por ejemplo `user-999999` o `USER-999999` (spec 003, RF-5); 200 con el jugador
  que designa para uno con esa forma que existe, escrito en minúsculas, en mayúsculas o
  mezclando ambas (por ejemplo, `USER-5` cuando existe `user-5`) (decisión del usuario,
  P49); la referencia propia
  resuelta al usuario de la sesión, solo con el texto exacto `me`, mientras que `Me`, `ME`
  o `" me"` se revisan como identificador y dan 400 (spec 003, Definiciones y RF-6; la
  ficha propia ya se reconoce en el cliente antes de pedir el usuario, RF-15, P43); 404 "El jugador no tiene una cuenta
  vinculada en este juego." al pedir el resumen de un juego en el que el usuario no tiene
  cuenta y 404 "Usuario no encontrado." al pedir el de un usuario que no existe (spec 004,
  RF-13); y 200 con lista vacía al listar las cuentas de un usuario que no existe (spec
  004, RF-2 y DP-10). Esta lista amplía, solo para las operaciones de esta spec, la de la
  spec 007, RF-10; sus datos semilla siguen la spec 007, RF-21 (rango, historial y
  partidas en los tres juegos, marca de datos simulados y cuentas verificadas y no
  verificadas en cada juego) y RF-27. Confirmado por el usuario (D5).
- RF-12: MIENTRAS haya un motivo de bloqueo, EL SISTEMA muestra "Proponer sesión"
  deshabilitado y, junto a él, solo el primero que aplique de esta lista, ordenada de lo
  general a lo particular (primero las cuentas, después la disponibilidad de cada uno,
  después los bloques en común). "<juego>" es el nombre corto del juego elegido
  (Definiciones). Cada motivo se comprueba solo con sus datos ya cargados; cuando la lista
  llega a un motivo cuyo dato falta, se aplica RF-23:
  1. El jugador de la ficha no tiene cuentas vinculadas: "Este jugador no ha vinculado
     ningún juego" (decisión del usuario, P2).
  2. El usuario de la sesión no tiene cuenta en el juego elegido, sea LoL, R6 o CS2:
     "Vincula tu cuenta de <juego> para proponer una sesión", con un enlace a
     Configuración (decisión del usuario, P1 y P27).
  3. El usuario de la sesión no tiene disponibilidad: "No has marcado tus horas", con un
     enlace a Configuración.
  4. El jugador de la ficha no tiene disponibilidad: "Este jugador no ha marcado horas".
  5. No hay bloques en común: "No tienen horas en común".
  6. Hay bloques en común pero ninguno es proponible: "Sus horas en común quedan fuera del
     horario de la agenda (12:00 a 01:00)" (decisión del usuario, P3).
  Ningún juego tiene motivo por falta de rango, porque toda cuenta tiene rango en los tres
  juegos (spec 004, RF-4 y RF-36). Los textos y el orden de la lista están confirmados por
  el usuario (D6); que el motivo 2 valga igual en los tres juegos es decisión del usuario
  (P27).
- RF-13: SI el usuario de la sesión no tiene cuenta en el juego elegido, sea LoL, R6 o CS2,
  ENTONCES EL SISTEMA muestra, en lugar de la distancia, "Vincula tu cuenta de <juego>
  para ver la distancia de rango", con el nombre corto del juego (Definiciones), y un
  enlace a Configuración (decisión del usuario, P27). Que el usuario de la sesión tenga o
  no cuenta en el juego elegido se decide con la lista de sus cuentas (RF-6; decisión del
  usuario, P33).
- RF-14: retirado. Mostraba el Mensaje de R6 en lugar de la distancia en R6; R6 tiene rango
  y distancia como LoL y CS2 (spec 004, decisión "R6 con rango y partidas simuladas"; spec
  005, RF-10 retirado; spec 007, RF-12; decisión del usuario, P27). Se conserva el número
  para no renumerar.
- RF-15: CUANDO el usuario de la sesión abre una ficha cuyo jugador es él mismo, por su
  identificador o por la referencia propia (spec 003, RF-6), EL SISTEMA lo lleva a su
  perfil reemplazando la entrada de la ficha en el historial del navegador, de modo que
  "Atrás" vuelve a la página anterior a la ficha. Vale igual en modo simulado. Confirmado
  por el usuario (D7). La ficha lo decide en el cliente, antes de pedir el usuario, con dos
  reglas (decisión del usuario, P35 y P43):
  1. La referencia propia es solo el texto exacto `me` (spec 003, Definiciones y RF-6).
     `Me`, `ME` o `" me"` no son la referencia propia: se piden como identificador y la
     ficha muestra "Este jugador no existe" (RF-9), con el servidor y en modo simulado
     (RF-11).
  2. El identificador de la dirección se compara con el del usuario de la sesión sin
     distinguir mayúsculas de minúsculas, como compara el servidor los identificadores
     (spec 003, Definiciones, "Identificador con formato válido"). La comparación sin
     distinguir mayúsculas vale solo para el identificador, no para la referencia propia.
     Así, el identificador propio escrito en mayúsculas también lleva al perfil, también
     en modo simulado (por ejemplo, `USER-3` cuando el usuario de la sesión es `user-3`),
     sin llegar a pedir el usuario. El identificador de otro jugador escrito en mayúsculas
     no es la ficha propia: se pide y abre la ficha de ese jugador (RF-11, P49).
- RF-16: EL SISTEMA aplica a cada cuenta de la ficha, en los tres juegos, las mismas reglas
  de presentación que la spec 007 fija para el perfil: rango vigente, historial, tasa de
  victorias y posición en la escala de su juego como en LoL, CS2 y R6 (spec 007, RF-14 y,
  para R6, RF-12); el historial en el orden en que lo entrega el servidor, sin suponer que la fecha
  de su último elemento es la del rango vigente, y la fecha de sincronización como "Última
  lectura" (spec 007, RF-31); en el lugar donde la fila de la cuenta mostraba "Fuente", la
  Etiqueta de datos simulados (spec 007, RF-15; decisión del usuario, P28); "verificada" o
  "sin verificar" para la marca de verificada, siempre referida a la cuenta y nunca en la
  forma "verificado" (spec 004, RF-41; spec 007, RF-16); y ningún texto que atribuya el
  rango, el historial, las partidas o la verificación a una fuente real (Riot, Ubisoft,
  Valve, Steam, FACEIT, Leetify ni otra), con el servidor real ni en modo simulado (spec
  004, RNF-2; spec 007, RF-15). Las etiquetas "Riot ID", "Ubisoft ID" y "SteamID64"
  nombran el formato del identificador, no una fuente, y se mantienen (spec 007, RF-15).
  Nunca rellena con 0 ni con valores de ejemplo un dato que no llegó (spec 004, RNF-2;
  constitución, principio 5); lo que falte se trata según RF-17. Confirmado por el usuario
  (D8), con el contenido actualizado por P28 y P30.
- RF-17: SI una cuenta que usa la ficha (la del jugador de la ficha en el juego elegido o
  la del usuario de la sesión en ese juego) llega sin rango vigente, o el resumen por juego
  llega sin tasa de victorias, ENTONCES EL SISTEMA muestra "Sin datos" en lugar de ese
  valor y de todo valor calculado con él (posición en la escala, diferencia desde la
  primera lectura y distancia de rango), y nunca un número calculado con el dato que
  falta. Es una regla defensiva, igual que la de la spec 007, RF-14: el servidor de la spec
  004 no produce esos casos, porque toda cuenta tiene rango y al menos una partida (spec
  004, RF-4 y RF-36), así que la ficha no tiene estados "Sin rango" ni "R6 sin rango".
  RF-13 prevalece cuando el usuario de la sesión no tiene cuenta en ese juego (decisión del
  usuario, P30).
- RF-18: SI una petición de la ficha falla con un error sin mensaje, un 5xx o un error con
  mensaje no cubierto por RF-9 o RF-19 (o no recibe respuesta, RF-24), ENTONCES EL
  SISTEMA muestra en la sección afectada (RF-8)
  el mensaje según la spec 007, RF-9 (el del servidor o, si no lo trae, el Texto de error
  sin mensaje), con el botón "Reintentar", que repite solo esa petición; el resto de la
  ficha sigue visible. Si la que falla es obtener el usuario, el error ocupa toda la ficha.
  No limpia la sesión del cliente; un 401 sigue la spec 007, RF-7. Confirmado por el
  usuario (D9).
- RF-19: SI el resumen del juego elegido responde 404 (spec 004, RF-13), ENTONCES EL SISTEMA
  vuelve a pedir el usuario de la ficha y sus cuentas y espera las dos respuestas sin
  cambiar las pestañas; mientras tanto, la sección de datos del juego muestra su estado de
  carga (RF-8) (decisión del usuario, P47). Con las dos respuestas: SI el usuario responde
  404 (por ejemplo, porque el jugador de la ficha eliminó su cuenta con la ficha abierta;
  spec 003, RF-11, y spec 004, RF-14), ENTONCES aplica RF-9 ("Este jugador no existe"),
  aunque sus cuentas respondan 200 con la lista vacía (spec 004, RF-2 y DP-10) o fallen
  (decisión del usuario, P32 y P47); si el usuario responde 200 (por ejemplo, porque el
  jugador de la ficha desvinculó esa cuenta con la ficha abierta), recalcula las pestañas
  con sus cuentas: muestra solo las que queden y elige la pestaña inicial, que pasa a ser
  la de la dirección reemplazando la entrada del historial, como en RF-5 (P13); si no queda
  ninguna, aplica RF-10. Salvo cuando el usuario responde 404, si una de esas dos
  peticiones falla de otra forma, se aplica RF-18 a la que falló. Confirmado por el usuario
  (D9), ampliado por P32 y P47. Que la corrección de la
  dirección reemplace la entrada del historial está confirmado por el usuario (P14).
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
  envió, ENTONCES EL SISTEMA aplica el plazo general de la spec 007, RF-20, que vale para
  toda petición al servidor y que las vistas nuevas heredan: deja de esperarla, la trata
  como un error sin mensaje (RF-18: Texto de error sin mensaje y "Reintentar" en su
  sección, o en toda la ficha si es la del usuario) sin limpiar la sesión del cliente, y
  si la respuesta llega después no la muestra; mientras espera, la sección muestra su
  estado de carga (RF-8) (decisión del usuario: opción recomendada aplicada por
  delegación, P24; remisión corregida por la revisión QA del 2026-10-18).
- RF-25: retirado. Trataba el 404 de una petición de datos propios del juego elegido; la
  ficha no pide el resumen propio y decide la distancia y el motivo 2 con la lista de
  cuentas propias (RF-6, RF-13; decisión del usuario, P33). Se conserva el número para no
  renumerar.
- RF-26: EL SISTEMA no vuelve a pedir por sí solo los datos de la ficha ni los propios: ni
  al volver el foco a la ventana o a la pestaña del navegador, ni de forma periódica. Solo
  los pide al abrir o recargar la ficha, al elegir una pestaña (puede mostrar sin pedirlos
  de nuevo los de una pestaña ya vista), con "Reintentar" y en RF-19. Por eso un
  cambio hecho en otra pestaña o en otro navegador no se ve hasta la siguiente de esas
  peticiones (decisión del usuario: opción recomendada aplicada por delegación, P25).
- RF-27: EL SISTEMA muestra la Etiqueta de datos simulados («Datos de demostración»), con
  el servidor real y en modo simulado, junto al rango vigente, el historial de rango (la
  posición en la escala con el número de lecturas, la primera lectura y la diferencia
  desde ella), las partidas y la marca de verificada de toda cuenta de la ficha que lleva
  la marca de datos simulados (spec 004, RF-37), y junto a la distancia de rango cuando
  muestra un valor "Δ <n> pts" y la cuenta del jugador de la ficha en ese juego lleva esa
  marca, igual que la vista de coincidencias etiqueta la distancia de cada candidato (spec
  005, "Marca de datos simulados" y DP5-15; spec 007, RF-11). MIENTRAS está activo el modo
  simulado, toda cuenta la lleva (spec 007, RF-11). El aviso global de la barra de
  navegación y del pie sigue visible en la ficha (spec 007, RF-11). Amplía a la ficha la
  lista de vistas de la spec 007, RF-11 (perfil, Configuración y coincidencias), que no la
  incluye, y cumple la convención de `AGENTS.md` ("Los datos de demostración se etiquetan
  siempre como tales en la interfaz") (decisión del usuario, P29).

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
- Juego de la ficha que el usuario de la sesión no juega, sea LoL, R6 o CS2: la pestaña se
  muestra igual (RF-4), la distancia se reemplaza por el texto de RF-13 y "Proponer sesión"
  muestra "Vincula tu cuenta de <juego> para proponer una sesión" (RF-12, motivo 2; P27).
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
- Identificador propio escrito en mayúsculas (o con mayúsculas y minúsculas mezcladas) en
  la dirección: es el mismo usuario y lleva al perfil, como con el servidor, también en
  modo simulado (`USER-3` siendo el propio `user-3`); la ficha lo decide antes de pedir el
  usuario (RF-15; spec 003, Definiciones; decisión del usuario, P35 y P43).
- Identificador de otro jugador escrito en mayúsculas (o mezclando mayúsculas y
  minúsculas) en la dirección, por ejemplo `USER-5` cuando existe `user-5`: designa a ese
  jugador y se muestra su ficha, con el servidor y en modo simulado, porque el backend
  simulado reconoce la forma y compara el identificador sin distinguir mayúsculas, como el
  servidor (Definiciones; RF-11; spec 003, Definiciones; decisión del usuario, P49). Con la
  forma pero inexistente (`USER-999999`): "Este jugador no existe" (RF-9).
- `ME`, `Me` o `" me"` en lugar del identificador: no son la referencia propia (spec 003,
  RF-6); se piden como identificador y la ficha muestra "Este jugador no existe", con el
  servidor y en modo simulado (RF-9, RF-11, RF-15; P43).
- Identificador mal formado (por ejemplo `abc`) o con formato válido pero inexistente: "Este
  jugador no existe" (RF-9), con el servidor y en modo simulado (RF-11).
- Jugador eliminado mientras otro tenía abierta su ficha o una agenda con él como
  participante (spec 003, RF-11; spec 006, RF-16): la siguiente carga de su usuario responde
  404 y se muestra "Este jugador no existe" (RF-9). Si lo primero que se pide es el resumen
  de un juego (por ejemplo, al elegir una pestaña no vista), responde 404 "Usuario no
  encontrado." (spec 004, RF-13): la ficha vuelve a pedir el usuario, que responde 404, y
  muestra "Este jugador no existe", aunque la lista de sus cuentas responda 200 vacía (spec
  004, RF-2 y DP-10), en lugar de "Este jugador no ha vinculado ningún juego" (RF-19;
  decisión del usuario, P32). Si lo que falla primero es otra petición, su sección sigue
  RF-18.
- Servidor caído o 5xx al abrir la ficha o al cambiar de pestaña: la sección afectada
  muestra el mensaje con "Reintentar" y el resto sigue visible (RF-18).
- Fallo parcial: el usuario carga y fallan su disponibilidad, sus cuentas o el resumen:
  cada sección muestra su propio error con "Reintentar" (RF-18).
- El jugador de la ficha desvincula la cuenta del juego elegido: al pedir su resumen se
  recibe 404; mientras la ficha vuelve a pedir el usuario y sus cuentas, la sección de
  datos del juego muestra su estado de carga; el usuario sigue existiendo, la pestaña
  desaparece y la dirección pasa a la pestaña inicial (RF-19; P47).
- La dirección indica un juego en el que el jugador de la ficha no tiene cuenta, o un valor
  que no es un juego: se abre en la pestaña inicial y la dirección se corrige para
  indicarla, reemplazando la entrada del historial, sin dejar la dirección inválida en él
  (RF-20; confirmado por el usuario, P14).
- Llega un 401 o un cambio de sesión en otra pestaña con la ficha abierta en R6: tras
  iniciar sesión se vuelve a la ficha en la pestaña inicial, no en R6 (RF-20; spec 007,
  definición de ruta de origen).
- Cuenta de R6: rango vigente, escala de Copper a Champion con MMR, historial, tasa de
  victorias, partidas (`<operador> · <bajas> bajas`, con su variación de rango) y
  distancia como en LoL y CS2, con la Etiqueta de datos simulados (RF-4, RF-6, RF-16,
  RF-27; spec 007, RF-12; P27). Su Ubisoft ID se muestra igual (RF-4).
- Cuenta de CS2: escala de Grey a Gold, sin división, con CS Rating en bandas de 5000
  (spec 004, DP-2 y DP-34), partidas `<mapa> · <rondas a favor>-<rondas en contra>` con su
  variación de rango, y la Etiqueta de datos simulados en el lugar donde iba el campo
  "Fuente"; ningún texto nombra FACEIT, Steam ni Valve (RF-4, RF-16; P28 y P31). Su
  SteamID64 se muestra igual (RF-4).
- Cuenta que llega sin rango vigente, o resumen sin tasa de victorias (el servidor de la
  spec 004 no lo produce): "Sin datos" en ese valor y en todo valor calculado con él
  (escala, diferencia desde la primera lectura y distancia), nunca un número (RF-17; P30).
- La marca de verificada de la cuenta del jugador de la ficha es la que fija el proveedor
  simulado por juego e identificador: si el usuario de la sesión vinculó el mismo
  identificador, las dos cuentas tienen la misma marca (spec 004, RF-41 y DP-17); la ficha
  no lo evita. Con el mismo identificador, el rango también es el mismo mientras las dos
  cuentas estén en el mismo número de lectura (spec 004, RF-43; toda cuenta nueva empieza
  en la lectura 0, RF-4), así que la distancia es 0 si ninguno de los dos resincroniza.
- Las sesiones están en la semana tipo, sin fecha (spec 006, fuera de alcance): un primer
  bloque proponible "ya pasado esta semana" no existe; el lunes es siempre el primer día
  (confirmado por el usuario, D11).
- Nombre visible de 40 caracteres: el título propuesto tiene 51 y cabe en el máximo de 60
  (RF-7).
- Nombre visible con un carácter prohibido en el título de la spec 006 (por ejemplo, un
  tabulador interior): el título propuesto lo conserva; al anotar, el servidor responde 400
  "El título debe tener entre 3 y 60 caracteres." (spec 006, RF-6), el formulario muestra
  ese mensaje (spec 007, RF-9), no se anota nada y el jugador corrige el título antes de
  volver a anotar (RF-7; decisión del usuario, P34). Si el formulario ya aplica las reglas
  del título de la spec 006 (su DP6-33), el error lo muestra el propio formulario antes de
  enviar, y tampoco se anota nada hasta corregir el título (RF-7; P46). Ese nombre visible
  se da con una petición directa a la API, no desde la interfaz (P40).
- Cuenta cuyo rango vigente es más bajo que el de su primera lectura: la escala muestra
  "▼ −<n> pts desde la primera lectura" (RF-4; P39).
- Cuenta con diferencia 0 desde la primera lectura (una sola lectura registrada, o rango
  vigente igual al de la primera lectura): la escala muestra "▲ +0 pts desde la primera
  lectura", como el perfil hoy, también en lo que anuncia el lector de pantalla; no se
  muestra un texto neutro ni se oculta la diferencia (RF-4; decisión del usuario, P41).
- Llega un 401 o cambia la sesión en otra pestaña con el formulario propuesto abierto: el
  formulario se pierde (limitación declarada; spec 007, P11).
- Se recarga la agenda con el formulario propuesto abierto, o se vuelve con "Atrás" o
  "Adelante" a la entrada de la agenda que trajo la propuesta: el formulario no se reabre
  y la agenda se muestra como si se hubiera abierto directamente, así que no hay riesgo de
  anotar dos veces la misma propuesta (RF-21; spec 007, RF-30, y sus decisiones P18 a
  P21).
- El usuario de la sesión desvinculó en otra pestaña la cuenta del juego propuesto: la
  agenda no abre el formulario (RF-21).
- La agenda recibe la propuesta mientras sus cuentas propias cargan: espera a que lleguen
  para abrir el formulario, que nunca se abre con la lista de juegos vacía; si fallan,
  muestra el error y descarta la propuesta (RF-21; spec 007, RF-30, y sus decisiones P18 a
  P21).
- El usuario de la sesión desvincula su propia cuenta del juego elegido en otra pestaña con
  la ficha abierta: la ficha no lo ve hasta su siguiente petición (RF-26); al recargar la
  ficha, la lista de sus cuentas ya no tiene ese juego y se aplican RF-13 a la distancia y
  el motivo 2 a "Proponer sesión", sin ningún error con "Reintentar" (RF-6, RF-13; P33);
  si antes pulsa "Proponer sesión", la agenda no abre el formulario (RF-21).
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
  `America/Argentina/Buenos_Aires` y `America/Sao_Paulo`, las dos en UTC−3 todo el año y
  válidas según la spec 003, Definiciones): cuentan como distintas y se muestra la nota
  (RF-22; decisión del usuario, P15).
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
- Verificar una cuenta, resincronizarla o consultar una fuente real de rango desde la
  ficha (spec 004, fuera de alcance; spec 007, RF-18).
- Detalle de sesión y sus enlaces a la ficha (spec 009).
- Convertir horas entre zonas horarias (specs 003 y 005).
- Proponer sesiones que empiecen fuera del horario de la agenda (P3).
- Conservar la pestaña elegida al volver a la ficha tras login (RF-20).
- Conservar el formulario propuesto al ir a login por un 401 o por un cambio de sesión en
  otra pestaña (spec 007, P11) y al recargar la agenda o volver a ella con "Atrás" o
  "Adelante" (spec 007, RF-30, y sus decisiones P18 a P21).
- El "Proponer" de la vista de coincidencias: lo fija la spec 007, RF-29, con la misma
  regla de primer bloque proponible y duración que RF-7.
- Mostrar en la ficha los totales del encabezado del perfil (RF-3, P20).
- Refrescar los datos de la ficha de forma automática (RF-26, P25).
- Cambios en el servidor (Contexto). Añadir una petición al archivo de peticiones manuales
  de usuarios no es un cambio del servidor y queda dentro del alcance (P45).
- Hacer coherente la grilla de horas con los tramos a medianoche: la grilla sigue
  mostrando las 00:00 y las 01:00 tras las 23:00 del mismo día, aunque no formen tramo con
  ellas (limitación declarada, P17).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Orden del registro de validación (decisión del usuario, P42). Los criterios con el
      servidor real se anotan en un solo registro, sobre la misma base, en este orden, y
      cada parte empieza con el estado que deja la anterior:
      1. Recorrido (criterio siguiente), sin su paso final de CS2.
      2. Estados, que termina restaurando la disponibilidad del recorrido (A y B vuelven a
         tener en común exactamente martes 20:00, 21:00, 22:00 y jueves 03:00).
      3. Agenda, con la desvinculación de LoL de A como último paso.
      4. Paso final de CS2 del recorrido.
      5. Pestaña que desaparece (RF-19).
      6. Eliminación de B, último paso del registro.
      Estado que se arrastra: desde el final de la parte 3, A no tiene cuenta de LoL y no la
      vuelve a vincular; desde la parte 4 tiene R6 y CS2. Por eso, en las partes 4 a 6 la
      pestaña LoL de la ficha de B le muestra a A el texto de RF-13 y el motivo 2, que es lo
      esperado y no se comprueba ahí. Los demás criterios con el servidor real que usan a A,
      B o C (latencia de 40 segundos, servidor apagado, teclado y NVDA, y 360 px y
      contraste) se hacen entre las partes 2 y 3, con A todavía con LoL y la disponibilidad
      del recorrido. La comprobación del título con tabulador usa sus propios jugadores (D y
      E) y puede hacerse en cualquier momento. El modo simulado y las revisiones de código
      no dependen de este orden.
- [ ] Recorrido (parte 1 del orden; su paso final de CS2 es la parte 4), registrado paso a
      paso, con fecha y resultado de cada paso, en el registro de validación de esta spec.
      Condiciones: servidor real, base vacía al
      empezar, modo simulado desactivado y sin acceso a Internet (como la spec 007; spec
      004, RF-34 y RNF-2). A tiene cuentas de LoL y R6, sin CS2; B tiene cuentas de LoL, R6
      y CS2, y la biografía `<b>x</b>`; A y B tienen la zona horaria
      `America/Argentina/Buenos_Aires`; C no tiene cuentas ni disponibilidad y tiene la zona
      `America/Sao_Paulo`, otro identificador con el mismo desfase (UTC−3 todo el año)
      (RF-22, P15; P44). Cada cuenta usa uno de los
      identificadores de ejemplo del plan de la spec 004 (sección 4.4: LoL `jugador1#las`,
      `jugador2#las`, `Jugador3#LAS` y `jugador4#las`; R6 `jugador1` a `jugador4`; CS2
      `76561190000000001` a `76561190000000004`), elegidos de modo que la distancia de
      rango de A y B en LoL sea como máximo 25; si ningún par de identificadores de ejemplo
      de LoL distintos la da, A y B vinculan el mismo identificador de LoL, que da el mismo
      rango y distancia 0 (spec 004, RF-43: el rango depende solo del juego, del
      identificador canónico y del número de lectura; RF-4: toda cuenta nueva empieza en la
      lectura 0; DP-17), siempre que ni A ni B resincronicen esa cuenta durante el
      registro, y el registro lo anota (respaldo confirmado por el usuario, P37 y P38). El
      registro anota qué identificador usó cada jugador en cada juego, cuáles salen
      verificados y la distancia en cada juego (decisión del usuario, P37). A y B tienen en
      común exactamente los bloques martes 20:00, 21:00 y 22:00 y jueves 03:00, de modo que
      B aparece en las coincidencias de LoL de A con los filtros por defecto de la spec 005
      (distancia máxima 25, mínimo 2 horas); el registro anota la disponibilidad que guardó
      cada uno, para restaurarla al final del criterio de Estados (P42). Pasos: A abre la ficha de B desde su fila en las
      coincidencias de LoL y la ficha se abre en la pestaña LoL (RF-2, RF-20); no aparece
      el correo de B y la biografía se ve como texto literal (RF-3, RNF-3); las pestañas
      están en el orden LoL, R6, CS2 y en LoL se ven el Riot ID de B, su rango, la escala
      de Iron a Challenger con la diferencia desde la primera lectura en la forma de RF-4
      ("▲ +<n> pts desde la primera lectura" o "▼ −<n> pts desde la primera lectura"), sus
      partidas con su variación de rango, la marca "verificada" o "sin verificar" que
      corresponde a su identificador y la Etiqueta de datos simulados en lugar del campo
      "Fuente" (RF-4, RF-16, RF-27); la distancia y las 4 horas en común son las mismas que
      en la fila de coincidencias, la distancia lleva la Etiqueta de datos simulados, la
      lista muestra los tramos "Mar 20:00–23:00" y "Jue 03:00–04:00", la grilla destaca
      solo los del martes, y no aparece la nota de zonas horarias (RF-6, RF-22, RF-27); en
      R6, sin recargar, se ven el rango, la escala de Copper a Champion con MMR, el
      historial, las partidas y la tasa de victorias de B con la Etiqueta de datos
      simulados, la distancia "Δ <n> pts" con la etiqueta y el Ubisoft ID de B (RF-4, RF-5,
      RF-6, RF-16, RF-27); recargar con R6 elegida mantiene R6 (RF-5); en CS2 se ven el
      rango, la escala de Grey a Gold y las partidas de B con la etiqueta, el campo
      "Fuente" no aparece y ningún texto nombra FACEIT, Steam ni Valve (RF-16), y, como A
      no tiene CS2, la distancia muestra "Vincula tu cuenta de CS2 para ver la distancia de
      rango" y "Proponer sesión" está deshabilitado con "Vincula tu cuenta de CS2 para
      proponer una sesión" (RF-12, RF-13); en LoL, "Proponer sesión" abre el formulario de
      la agenda con LoL, martes, 20:00, 3 horas, "Sesión con <nombre visible de B>", 5
      cupos y notas vacías (RF-7); A la anota, y
      "Atrás" desde la agenda vuelve a la ficha en la pestaña LoL (RF-5), y un segundo
      "Atrás" vuelve a las coincidencias, sin pasar por las pestañas CS2 ni R6 elegidas
      antes (RF-5, P13); B se suma, y A
      abre la ficha de B desde la agenda (RF-2) y su propia ficha desde la misma sesión,
      que lo lleva al perfil; "Atrás" vuelve a la agenda (RF-15). Paso final de CS2 (parte
      4 del orden, después del criterio de Agenda, cuando A ya no tiene LoL y la
      disponibilidad del recorrido está restaurada): A vincula una cuenta de CS2 con un
      identificador de ejemplo de CS2 y vuelve a abrir la ficha de B en CS2 (desde la fila
      de B en sus coincidencias de CS2 si aparece en ellas o, si no, con CS2 en la
      dirección): se ven el
      rango, la escala de Grey a Gold con CS Rating, las partidas con el formato
      `<mapa> · <rondas a favor>-<rondas en contra>` y su variación de rango, la distancia
      "Δ <n> pts" con la Etiqueta de datos simulados (la misma que la fila de B en las
      coincidencias de CS2 de A, si aparece en ellas), y "Proponer sesión" ya no muestra
      el motivo 2 y abre el formulario con CS2, martes, 20:00 y 3 horas (RF-4, RF-6, RF-7,
      RF-12, RF-27; decisión del usuario, P31). No hace falta anotar esa sesión; si se
      anota, se solapa con la de LoL del recorrido, lo que la spec 006 permite (DP6-13), y
      la desvinculación de LoL no afectó a la sesión de LoL ya creada (spec 006, RF-27).
- [ ] Estados (parte 2 del orden, con A todavía con LoL y sin CS2), dentro del mismo
      registro y en este orden: con la red limitada a "3G lenta" en las
      herramientas del navegador se ve el estado de carga de cada sección y, al cambiar de
      pestaña, solo el de los datos del juego y el de la distancia (RF-8), y mientras falta
      algún dato para proponer "Proponer sesión" está deshabilitado con "Cargando los datos
      para proponer una sesión…" (RF-23); bloqueando en las herramientas del navegador
      solo la petición de la disponibilidad de A, la sección de horas en común muestra el
      error con "Reintentar" y "Proponer sesión" muestra "No se pudieron cargar los datos
      para proponer una sesión." (RF-8, RF-18, RF-23); bloqueando solo la petición de la
      lista de cuentas propias de A (no la de las cuentas de B), el lugar de la distancia
      muestra el error con "Reintentar" y "Proponer sesión" muestra "No se pudieron cargar
      los datos para proponer una sesión."; al desbloquearla y pulsar "Reintentar", se ve la
      distancia (RF-8, RF-18, RF-23; P19 y P44); la ficha de C muestra "Este jugador
      no ha vinculado ningún juego" en lugar de las pestañas, las horas en común (0), la
      nota de zonas horarias, aunque `America/Sao_Paulo` y `America/Argentina/Buenos_Aires`
      tengan el mismo desfase, ninguna distancia de rango y "Proponer sesión" deshabilitado
      con "Este jugador no ha vinculado ningún juego" (RF-10, RF-12, RF-22; P15 y P44); un
      identificador inexistente con formato válido, el identificador `abc` y `ME` en lugar
      del identificador muestran "Este jugador no existe" (RF-9, RF-15; P43); la
      referencia propia `me` en lugar del identificador lleva al perfil, y también el
      identificador propio escrito en mayúsculas (RF-15, P35 y P43); con la sesión
      cerrada, abrir la ficha de B con R6 en la dirección lleva a login y, al entrar, de
      vuelta a la ficha en la pestaña LoL (RF-1, RF-20); con la ficha de B recién abierta
      o recargada en LoL, borrar la cookie de la credencial en las herramientas del
      navegador y elegir la pestaña R6, no vista desde la recarga (así se pide su resumen,
      RF-26), lleva a login con "Tu sesión expiró. Vuelve a entrar."
      y, al entrar, de vuelta a la ficha en la pestaña LoL (RF-1, RF-20; spec 007, RF-7;
      P44); con la ficha de B abierta en R6 en una pestaña del navegador, cerrar sesión en
      otra pestaña del mismo navegador lleva la primera a login, en menos de 5 segundos,
      con "Se cerró o cambió la sesión en otra pestaña." y, al entrar, de vuelta a la ficha
      en la pestaña LoL (RF-1, RF-20; spec 007, RF-24; P44); abrir la ficha
      de B con un valor inventado como juego en la dirección la abre en la pestaña LoL y
      la dirección pasa a indicar LoL (RF-20); B abre la ficha de A con CS2 en la
      dirección (A no tiene CS2) y se abre en la pestaña LoL con la dirección corregida a
      LoL; en ambos casos "Atrás" vuelve a la página anterior a la ficha y no a la
      dirección inválida (RF-20, P14). Al final del criterio, los motivos de
      disponibilidad, en este orden y recargando la ficha de B en LoL tras cada cambio,
      porque la ficha no vuelve a pedir los datos sola (RF-26): B borra su disponibilidad y
      el motivo es "Este jugador no ha marcado horas"; B vuelve a guardar la del recorrido,
      A borra la suya y el motivo es "No has marcado tus horas"; A guarda solo el jueves
      03:00, que queda como única hora en común, y el motivo es "Sus horas en común quedan
      fuera del horario de la agenda (12:00 a 01:00)" (RF-12). Por último, A vuelve a
      guardar la disponibilidad del recorrido y, al recargar la ficha de B, se ven otra vez
      los tramos "Mar 20:00–23:00" y "Jue 03:00–04:00" y "Proponer sesión" habilitado
      (P42).
- [ ] Etiqueta de datos simulados, con el servidor real (en el recorrido) y con el modo
      simulado: en la ficha aparece, con el texto exacto «Datos de demostración», junto al
      rango, el historial (escala, número de lecturas, primera lectura y diferencia desde
      ella), las partidas y la marca de verificada de cada cuenta de los tres juegos, en el
      lugar donde iba el campo "Fuente", y junto a la distancia "Δ <n> pts"; el aviso
      global de la barra de navegación y del pie sigue visible; ningún texto de la ficha
      nombra Riot, Ubisoft, Valve, Steam, FACEIT ni Leetify como fuente (las etiquetas
      "Riot ID", "Ubisoft ID" y "SteamID64" sí aparecen) ni usa "verificado" (RF-4, RF-16,
      RF-27; P28 y P29).
- [ ] Agenda (parte 3 del orden), dentro del mismo registro y en este orden, con A todavía
      con LoL: tras abrir el formulario desde la ficha de B en LoL, recargar
      la agenda la muestra sin formulario; volver a la ficha con "Atrás" y a la agenda con
      "Adelante" tampoco lo reabre; con "3G lenta", "Proponer sesión" abre el formulario
      con la lista de juegos ya cargada y LoL elegido; bloqueando la petición de las
      cuentas de A, la agenda muestra el error y no abre el formulario (RF-21; spec 007,
      RF-30). Ninguno de esos formularios se anota. Como último paso del criterio, con la
      ficha de B abierta en LoL, A desvincula su cuenta de LoL en otra
      pestaña y pulsa "Proponer sesión": la agenda no abre el formulario y se muestra como
      si se hubiera abierto directamente; al volver a la ficha y recargarla, la distancia
      muestra "Vincula tu cuenta de LoL para ver la distancia de rango" y "Proponer sesión"
      el motivo 2, sin ningún error con "Reintentar", porque la lista de cuentas de A ya no
      tiene LoL (RF-6, RF-13, RF-21; P33). A no vuelve a vincular LoL en el resto del
      registro (P42).
- [ ] Pestaña que desaparece y eliminación de B (partes 5 y 6 del orden, después del paso
      final de CS2, con A con R6 y CS2 y B con LoL, R6 y CS2). Parte 5: A abre la ficha de B
      en la pestaña CS2 (desde la fila de B en sus coincidencias de CS2 o con CS2 en la
      dirección), sin elegir la pestaña R6; B desvincula su cuenta de R6 en otro navegador;
      volver el foco a la ventana de A no muestra ningún cambio ni hace peticiones en la
      pestaña de red (RF-26); al elegir R6, la sección de datos del juego muestra su estado
      de carga mientras la ficha vuelve a pedir el usuario y sus cuentas, y después la
      pestaña R6 desaparece y la ficha pasa a la pestaña inicial, LoL, también en la
      dirección (RF-8, RF-19; P47). Parte 6, último paso del registro: A recarga la ficha de
      B en la pestaña LoL, de modo que la pestaña CS2 no se ha visto desde la recarga y
      elegirla pide su resumen (RF-26); B elimina su cuenta en otro navegador y A elige la
      pestaña CS2: la ficha muestra "Este jugador no existe" en lugar de toda la ficha, no
      "Este jugador no ha vinculado ningún juego" (RF-9, RF-19; P32).
- [ ] Comprobación manual, registrada, del título con tabulador (RF-7; decisión del
      usuario, P34, P40 y P46), con dos jugadores propios, D y E, que no intervienen en los
      demás pasos del registro (P42). D y E vinculan una cuenta del mismo juego y guardan
      una disponibilidad con al menos un bloque proponible en común. Primero, con una
      petición directa a la API desde el archivo de peticiones manuales de usuarios del
      servidor (el que ya tiene la petición de actualizar el perfil propio, su paso 4; spec
      003, RF-7), se actualiza el perfil de D con un nombre visible que contiene un
      tabulador interior (`\t` en el JSON); si ese archivo no tiene todavía esa petición
      con tabulador, el plan la añade, lo que no es un cambio del servidor (Contexto, P45).
      Después, en la interfaz, E abre la ficha de D y "Proponer sesión" abre el formulario
      con "Sesión con <ese nombre>"; al anotar, el formulario muestra el mensaje del
      servidor "El título debe tener entre 3 y 60 caracteres." según la spec 007, RF-9 o,
      si el formulario ya aplica las reglas del título de la spec 006 (su DP6-33), su
      propio error antes de enviar; en los dos casos no se anota nada y, tras corregir el
      título, la sesión se anota (RF-7; P46). El registro anota la petición usada, su
      respuesta, cuál de los dos errores apareció y el resultado de cada paso en la
      interfaz.
- [ ] Una revisión del código de la ficha, con el resultado en el registro, confirma que si
      una cuenta llega sin rango vigente o el resumen llega sin tasa de victorias, se
      muestra "Sin datos" en ese valor y en la escala, la diferencia desde la primera
      lectura y la distancia, nunca un número calculado con el dato ausente, y que la
      ficha no tiene estados "Sin rango" ni "R6 sin rango" (RF-17; P30).
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
- [ ] Con el modo simulado y la cuenta demo, abrir la ficha de jugadores semilla desde las
      coincidencias: sus cuentas de los tres juegos muestran rango, historial y partidas,
      con la Etiqueta de datos simulados (también en la distancia); entre las fichas de los
      jugadores semilla se ven, en cada juego, cuentas "verificada" y "sin verificar", con la
      Etiqueta de datos simulados junto a la marca (RF-16, RF-27). Que un identificador de
      ejemplo del plan de la spec 004 dé la misma marca de verificada que con el servidor
      es un control de la spec 007 (su RF-21) y no se repite aquí (P48). El identificador
      `user-999999` (con la forma del identificador del backend simulado e inexistente), el
      identificador `abc` y `ME` en lugar del identificador muestran "Este jugador no
      existe"; abrir la ficha propia por su identificador, por ese identificador escrito en
      mayúsculas (por ejemplo, `USER-3`) y por la referencia propia `me` lleva al perfil y
      "Atrás" no vuelve a la ficha (RF-15; P43); escribir en la dirección `USER-<n>`, con
      `user-<n>` el identificador de un jugador semilla, abre la ficha de ese jugador con
      los mismos datos que `user-<n>` (RF-11; P49), y la pestaña de red no muestra
      peticiones al servidor (RF-11, RF-16, RF-27). RF-19 no se puede provocar en modo
      simulado, porque desde la interfaz solo se desvinculan o eliminan cuentas propias: se
      comprueba revisando que el backend simulado responde 404 al resumen de un juego sin
      cuenta y 404 "Usuario no encontrado." al de un usuario inexistente, y 200 con lista
      vacía a sus cuentas (RF-11), y el resultado queda en el registro.
- [ ] Una revisión de las reglas puras del dominio, con los datos del recorrido y con los
      casos límite de 00:00 y 12:00 el mismo día, del tramo de más de 4 horas, del tramo
      de 10:00 a 14:00 (12:00 y 2 horas) y del martes 23:00 con el miércoles 00:00 (dos
      tramos; martes 23:00 y 1 hora), da los tramos, el primer bloque proponible y la
      duración que fijan las definiciones y RF-7, y el resultado queda en el registro de
      validación (RF-7, RNF-6, P12, P16). La misma revisión cubre la elección del motivo o
      del estado de RF-23 (cada motivo de la lista, el motivo 2 en cada uno de los tres
      juegos, el motivo 1 con datos todavía cargando y un dato fallido) y la elección o
      corrección de la pestaña (dirección sin juego, con un valor que no es un juego, con
      un juego sin cuenta, tras desaparecer la pestaña y tras un 404 del resumen con el
      usuario inexistente, que da "Este jugador no existe") (RF-12, RF-19, RF-20, RF-23,
      RNF-6; P27 y P32).
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

## Decisiones de clarificación
- Revisión QA (CAMBIOS NECESARIOS, 6 graves) incorporada en lo que ya estaba decidido, con
  la fuente citada en cada requisito.
- P1 — decisión del usuario: sin cuenta propia en el juego elegido, "Proponer sesión" se
  deshabilita con "Vincula tu cuenta de <juego> para proponer una sesión" y un enlace a
  Configuración. Quedó en RF-12 (motivo 2), Casos límite y Criterios de finalización.
  Ampliada por P27: vale en los tres juegos.
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
  **Sustituida por P30** (la P9 de la 007 cayó; "Sin datos" queda solo como regla
  defensiva en los tres juegos).
- P5 — decisión del usuario: las dos vistas nuevas del Hito 2 son la ficha de jugador
  (008) y el detalle de sesión (009). Quedó en Contexto; `MEMORY.md` debe recogerla al
  cerrar la fase, fuera de esta spec.
- P6 — decisión del usuario: no avisar al jugador de la ficha se declara como limitación,
  y la ficha muestra su identificador en el juego (Riot ID, Ubisoft ID o SteamID64; spec
  004, Definiciones, "Identificador de cuenta", y RF-6; la cita anterior a su RF-2 la
  corrigió la revisión QA del 2026-10-18). Quedó en RF-4, Casos límite, Fuera de alcance y
  Criterios de finalización.
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
  como estaban redactadas y se marcan "Confirmado por el usuario" en el texto, salvo lo que
  indica cada una.
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
    por falta de rango en R6. La parte "sin motivo por falta de rango en R6" queda
    **sustituida por P27**: ningún juego tiene motivo por falta de rango y el motivo 2
    vale en los tres.
  - D7: RF-15, la ficha propia lleva al perfil también con la referencia propia y no
    queda en el historial.
  - D8: RF-16, las reglas de presentación de la spec 007 para el perfil valen en la ficha.
    La regla se mantiene; su contenido anterior (Mensaje de R6, "Sin rango", fuentes de la
    tabla de la 004 y "Datos de demostración" como fuente) queda **sustituido por P28 y
    P30**.
  - D9: RF-18 a RF-21, error por sección con "Reintentar", pestaña que desaparece tras un
    404 del resumen, elección de pestaña según el origen y agenda que no abre el
    formulario sin cuenta en el juego. RF-19 queda **ampliado por P32** (antes de corregir
    las pestañas se vuelve a pedir el usuario).
  - D10: RNF-2, RNF-5 y RNF-6.
  - D11: condición previa encadenada a la 007, sin cambios en el servidor, enlaces del
    detalle de sesión en la 009, redacción de HU-1 y semana tipo sin fechas con el lunes
    como primer día. La condición previa queda **cumplida** (2026-10-18), y la remisión de
    CS2 y de la variación por partida a "lo que fijen las specs 004 y 005 aprobadas" queda
    **sustituida por P31** (lo fijan ya, y esta spec lo cita).
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
  simulado, RF-16 ("Sin rango" con historial), RF-17, RF-21 y RNF-1. Los criterios de
  RF-16 ("Sin rango" con historial) y RF-17 (jugador sin rango) quedan **sustituidos por
  P30** (revisión de código).
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
  RF-4, Fuera de alcance y Criterios de finalización. La lista de RF-4 queda **ampliada
  por P36** (diferencia desde la primera lectura) y su campo "fuente" **sustituido por
  P28** (Etiqueta de datos simulados).
- P21 — decisión del usuario: opción recomendada aplicada por delegación. "<juego>" en los
  textos de RF-12 y RF-13 es el nombre corto (LoL, R6, CS2). Quedó en Definiciones, RF-12 y
  RF-13.
- P22 — decisión del usuario: opción recomendada aplicada por delegación. El
  identificador del backend simulado es `user-` seguido de dígitos, la forma que ya da hoy;
  cualquier otro texto responde 400 y uno con esa forma que no existe, 404. Quedó en
  Definiciones, RF-11 y Criterios de finalización. **Precisada por P49** (la forma se
  reconoce sin distinguir mayúsculas de minúsculas).
- P23 — decisión del usuario: opción recomendada aplicada por delegación. Un 404 de datos
  propios porque el usuario de la sesión desvinculó su cuenta no es un error de RF-18: se
  vuelven a pedir las cuentas propias y se aplican RF-13 y el motivo 2. Quedó en RF-18,
  RF-25, Casos límite y Criterios de finalización. **Sustituida por P33** (la ficha no pide
  el resumen propio; RF-25 retirado).
- P24 — decisión del usuario: opción recomendada aplicada por delegación. Toda petición de
  la ficha espera como máximo 30 segundos; después se trata como un error sin mensaje y la
  respuesta tardía no se muestra. Quedó en RF-18, RF-24, Casos límite y Criterios de
  finalización. La frase "mismo plazo que vincular y resincronizar, solo para esta vista"
  la corrigió la revisión QA del 2026-10-18: el plazo es el general de la spec 007, RF-20.
- P25 — decisión del usuario: opción recomendada aplicada por delegación. La ficha no
  refresca sus datos sola, ni al volver el foco ni de forma periódica. Quedó en RF-26,
  Casos límite, Fuera de alcance y Criterios de finalización.
- P26 — decisión del usuario: opción recomendada aplicada por delegación. El recorrido con
  lector de pantalla se hace con NVDA en Chrome, y el contraste se revisa con la auditoría
  de accesibilidad de Lighthouse en los dos temas más el selector de color de las
  herramientas de Chrome para los textos de estados que la auditoría no ve. Quedó en
  Criterios de finalización.
- P27 — decisión del usuario (2026-10-18, revisión contra las specs aprobadas): R6 se trata
  igual que LoL y CS2. RF-13 ("Vincula tu cuenta de <juego> para ver la distancia de
  rango") y el motivo 2 de RF-12 valen en los tres juegos; ningún juego tiene motivo por
  falta de rango. Se retiran RF-14 (queda "RF-14: retirado") y la definición "Mensaje de
  R6". Quedó en Definiciones, RF-12, RF-13, RF-14, Casos límite (primero y cuenta de R6) y
  Criterios de finalización (paso de R6 del recorrido y revisión de reglas puras).
  Sustituye la parte de D6 sobre R6.
- P28 — decisión del usuario (2026-10-18): donde iba el campo "Fuente" de cada cuenta se
  muestra la Etiqueta de datos simulados («Datos de demostración»), igual que el perfil
  (spec 007, RF-15). Se quitan FACEIT, Steam y la clave de Riot del texto y del recorrido.
  Quedó en RF-4, RF-16, Casos límite (cuenta de CS2) y Criterios de finalización
  (condiciones y pasos del recorrido, criterio de la etiqueta).
- P29 — decisión del usuario (2026-10-18): llevan la Etiqueta de datos simulados los
  mismos elementos que en el perfil y en coincidencias: rango, historial, partidas, marca
  de verificada y distancia de rango, con el servidor real y en modo simulado. Quedó en el
  nuevo RF-27, RF-6, RF-11 y Criterios de finalización (recorrido, criterio de la etiqueta
  y modo simulado).
- P30 — decisión del usuario (2026-10-18): "Sin datos" es solo defensivo, como la spec 007,
  RF-14: si faltara un rango o la tasa de victorias, se muestra "Sin datos" y nunca una
  distancia ni un valor calculado con él; se comprueba revisando el código. Se quitan
  "Sin rango", la definición "cuenta sin rango", el caso límite de nueva temporada y el
  criterio del jugador D. Quedó en Definiciones, RF-16, RF-17, Casos límite y Criterios de
  finalización (revisión de código). Sustituye a P4 y a la parte de D8 sobre "Sin rango".
- P31 — decisión del usuario (2026-10-18): lo que la spec remitía a las specs 004 y 005
  aprobadas queda fijado aquí (escala de CS2 de Grey a Gold con CS Rating en bandas de
  5000, R6 de Copper a Champion con MMR, de 1 a 8 partidas con el resumen por juego de la
  004 y variación de rango entera siempre presente, distancia en los tres juegos), y CS2
  se valida completo como LoL: se mantiene el paso en que A, sin CS2, ve RF-13 y el
  motivo 2 en CS2, y se añade un paso final en que A vincula CS2 y comprueba rango,
  escala, partidas, distancia y la Etiqueta de datos simulados. Quedó en Contexto, RF-4,
  RF-6, Casos límite (cuentas de R6 y de CS2) y Criterios de finalización (último paso
  del recorrido; se retira el criterio "CS2 se valida igual que LoL cuando…"). Sustituye
  la remisión de D11.
- P32 — decisión del usuario (2026-10-18): ante un 404 del resumen, la ficha vuelve a pedir
  también el usuario; si responde 404, aplica RF-9 ("Este jugador no existe"); si no,
  sigue RF-19 (pestañas que quedan o RF-10). Quedó en RF-19, RF-11 (respuestas del modo
  simulado), Casos límite (jugador eliminado) y Criterios de finalización (eliminación de
  B, modo simulado y revisión de reglas puras). Amplía D9.
- P33 — decisión del usuario (2026-10-18): la distancia usa el rango vigente de la lista de
  cuentas propias, que ya es dato para proponer; la ficha no pide el resumen propio. Se
  retira RF-25 (queda "RF-25: retirado") y se ajustan RF-6, RF-13, RF-18, RF-26, el caso
  límite de desvincular la cuenta propia en otra pestaña (se ve al recargar la ficha, con
  RF-13 y el motivo 2 sin error) y el criterio de la agenda. Sustituye a P23.
- P34 — decisión del usuario (2026-10-18): un título propuesto con caracteres prohibidos
  por la spec 006 (RF-6, DP6-31) se acepta; si el servidor lo rechaza al anotar, el
  formulario muestra el error según la spec 007, RF-9, y el jugador lo corrige, igual que
  el "Proponer" de coincidencias (spec 007, RF-29). Quedó en RF-7, Casos límite y
  Criterios de finalización. Su criterio de finalización queda **precisado por P40**
  (petición directa a la API y prueba en la interfaz; se retira la alternativa de revisar
  el código), y la regla, **precisada por P46** (si el formulario adopta DP6-33 de la spec
  006, vale su propio error).
- P35 — decisión del usuario (2026-10-18): la ficha reconoce el identificador propio
  comparando sin distinguir mayúsculas de minúsculas, como el servidor (spec 003,
  Definiciones). Quedó en RF-15, Casos límite y Criterios de finalización (estados).
  **Precisada por P43** (solo para el identificador, no para la referencia propia, y
  decidida en el cliente).
- P36 — decisión del usuario (2026-10-18): la ficha muestra en la escala la diferencia
  "▲ +<n> pts desde la primera lectura", igual que el perfil (spec 007, RF-14 y su P22).
  Quedó en RF-4 (lista cerrada), RF-17, RF-27 y Criterios de finalización. Amplía P20.
  **Precisada por P39** (las dos formas, subida y bajada).
- P37 — decisión del usuario (2026-10-18): el recorrido usa los identificadores de ejemplo
  del plan de la spec 004 (sección 4.4) y el registro anota cuáles se usaron, cuáles salen
  verificados y cuáles dan una distancia en LoL de como máximo 25, como la spec 007. Se
  quita "clave de Riot renovada" y se añade "sin acceso a Internet", que la spec 007 exige
  en su recorrido y que comprueba que nada depende de una fuente externa (spec 004, RF-34
  y RNF-2). Si ningún par de identificadores de ejemplo distintos da esa distancia, A y B
  vinculan el mismo identificador de LoL (misma lectura, distancia 0; cita corregida por la
  segunda revisión QA: spec 004, RF-43, RF-4 y DP-17, y siempre que ni A ni B
  resincronicen). Quedó en Criterios de finalización (condiciones del recorrido). Ese
  respaldo, propuesto por el planner, queda **confirmado por el usuario (P38)**.
- P38 — decisión del usuario (2026-10-18): se mantiene el respaldo del recorrido de P37: si
  ningún par de identificadores de ejemplo de LoL distintos del plan de la spec 004 da una
  distancia de como máximo 25, A y B vinculan el mismo identificador de LoL (misma
  lectura, distancia 0; spec 004, RF-43, RF-4 y DP-17, sin que ninguno resincronice, según
  la segunda revisión QA), y el registro lo anota. Quedó en Criterios de
  finalización (condiciones del recorrido) y en P37.
- P39 — decisión del usuario (2026-10-18): RF-4 fija las dos formas de la diferencia desde
  la primera lectura: "▲ +<n> pts desde la primera lectura" si el rango subió y
  "▼ −<n> pts desde la primera lectura" si bajó, con n en valor absoluto y el signo menos
  tipográfico "−", que son los textos que el perfil muestra hoy en la escala de rango. El
  caso de diferencia 0 quedó como duda abierta y lo **resuelve P41**. Quedó en RF-4,
  Casos límite (rango más bajo que la primera lectura) y Criterios de finalización
  (recorrido). Precisa P36.
- P40 — decisión del usuario (2026-10-18): el caso del título con tabulador se comprueba a
  mano: primero se registra o se actualiza el jugador con un nombre visible con tabulador
  interior mediante una petición directa a la API desde el archivo de peticiones de
  usuarios del servidor (el archivo de peticiones manuales de usuarios, que ya existe; si
  no tiene la petición con tabulador, el plan la añade, lo que no es un cambio del
  servidor, P45), y después se prueba en la interfaz que el
  formulario muestra el error del servidor (spec 007, RF-9) y que la sesión se anota tras
  corregir el título. Se retira la alternativa de revisar el código. Quedó en Casos
  límite y Criterios de finalización. Precisa P34.
- P41 — decisión del usuario (2026-10-18, opción a): con diferencia 0 desde la primera
  lectura la escala muestra "▲ +0 pts desde la primera lectura", como el perfil hoy; la
  regla de subida incluye el 0. La ficha hereda ese comportamiento del perfil, también en
  el texto para lector de pantalla; no se reabre la spec 007 ni se cambia el perfil. Se
  descartan el texto neutro sin flecha (b) y ocultar la diferencia (c). Quedó en RF-4 y
  Casos límite (diferencia 0). Precisa P39.
- P42 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 1): el registro de
  validación tiene un orden fijo: Recorrido → Estados (que termina restaurando la
  disponibilidad del recorrido: martes 20:00, 21:00, 22:00 y jueves 03:00 en común) →
  Agenda (con la desvinculación de LoL de A en último lugar) → paso final de CS2 → RF-19 →
  eliminación de B. Comprobado paso a paso por el planner: los motivos de disponibilidad
  van al final de Estados y se recargan tras cada cambio (RF-26); A no vuelve a vincular
  LoL, así que en las partes 4 a 6 la pestaña LoL de B le muestra RF-13 y el motivo 2 sin
  comprobarse; el paso de CS2 abre la ficha desde las coincidencias de CS2 o por la
  dirección; RF-19 abre la ficha en CS2 para no elegir R6 antes de tiempo; la eliminación
  de B empieza recargando la ficha en LoL para que CS2 no esté vista (RF-26); los demás
  criterios con servidor real que usan a A, B o C van entre Estados y Agenda, y la
  comprobación del título con tabulador usa jugadores propios (D y E). Quedó en Criterios
  de finalización (nuevo criterio "Orden del registro de validación", Recorrido, Estados,
  Agenda, y pestaña que desaparece y eliminación de B).
- P43 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 2): la comparación
  sin distinguir mayúsculas vale solo para el identificador, no para la referencia propia,
  y se decide en el cliente antes de pedir el usuario: `USER-3`, siendo el propio, lleva al
  perfil, también en modo simulado; `ME` (o `Me`, `" me"`) no es la referencia propia
  (spec 003, RF-6) y muestra "Este jugador no existe". Quedó en RF-11, RF-15, Casos límite
  (identificador propio en mayúsculas y nuevo caso de `ME`) y Criterios de finalización
  (Estados y modo simulado). Precisa P35.
- P44 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 3): RF-1 (401 y
  cambio de sesión en otra pestaña con la ficha abierta), RF-22 con P15 (zonas con
  identificadores distintos y el mismo desfase) y RF-8 con P19 (fallo de las cuentas
  propias: error con "Reintentar" en el lugar de la distancia) pasan a ser pasos manuales
  del criterio de Estados, respetando el orden de P42. Para P15, las condiciones del
  recorrido fijan las zonas: A y B en `America/Argentina/Buenos_Aires` y C en
  `America/Sao_Paulo` (las dos en UTC−3 todo el año), de modo que la ficha de C ya
  comprueba la nota. Quedó en Criterios de finalización (condiciones del recorrido y
  Estados).
- P45 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 5): el archivo de
  peticiones manuales de usuarios del servidor es una herramienta de prueba manual y no un
  cambio del servidor, así que el plan puede añadirle la petición del nombre visible con
  tabulador. La spec se refiere a él por su función y no por su ruta (skill sdd: sin
  nombres de archivo). Quedó en Contexto, Fuera de alcance, Criterios de finalización
  (título con tabulador) y P40.
- P46 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 6): la spec 006,
  DP6-33, se cita como dependencia; si la interfaz adopta en el formulario las mismas
  reglas del título que el servidor, vale el error del propio formulario en lugar del 400
  del servidor; en ambos casos no se anota nada hasta corregir el título. Quedó en
  Contexto (dependencias), RF-7, Casos límite (nombre visible con un carácter prohibido) y
  Criterios de finalización (título con tabulador). Precisa P34 y P40.
- P47 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo 7): tras el 404 del
  resumen, la ficha espera las dos respuestas (usuario y cuentas) y, mientras tanto, la
  sección de datos del juego muestra su estado de carga (RF-8); después aplica RF-9 si el
  usuario dio 404 o recalcula las pestañas. Quedó en RF-19, Casos límite (desvinculación
  de la cuenta del juego elegido) y Criterios de finalización (pestaña que desaparece).
  Amplía P32.
- P48 — decisión del usuario (2026-10-18, segunda revisión QA, hallazgo opcional): el
  criterio del modo simulado se limita a lo que se ve en la ficha (cuentas "verificada" y
  "sin verificar" en cada juego, con la Etiqueta de datos simulados); que un identificador
  de ejemplo de la spec 004 dé la misma marca que con el servidor es control de la spec
  007, RF-21. Quedó en Criterios de finalización (modo simulado).
- P49 — decisión del usuario (2026-10-18, opción a; duda surgida al aplicar P43): el
  backend simulado reconoce la forma `user-` seguida de dígitos y compara el identificador
  sin distinguir mayúsculas de minúsculas, como el servidor (spec 003, Definiciones):
  `USER-5`, existiendo `user-5`, responde 200 y la ficha de ese jugador se muestra; 400
  solo para lo que no tiene esa forma, ignorando mayúsculas, y 404 para uno con esa forma
  que no existe. Se descarta la forma exacta en minúsculas con 400 para `USER-5` (b).
  Coherente con P22 (que precisa) y con P43: la referencia propia sigue siendo solo el
  texto exacto `me` (`ME` no tiene la forma y da 400, "Este jugador no existe") y
  `USER-<propio>` lleva al perfil antes de pedir el usuario. Quedó en Definiciones
  (identificador del backend simulado), RF-11, RF-15 (regla 2), Casos límite (nuevo caso
  del identificador de otro jugador en mayúsculas) y Criterios de finalización (modo
  simulado).
- Segunda revisión QA (2026-10-18), correcciones sin decisión nueva del usuario (hallazgo
  4 y una corrección derivada de P44):
  - RF-4 cita para la escala la spec 004 (Definiciones, "Escala de rango" y "Banda de
    puntos"; DP-2 y DP-34) y la spec 007, RF-12, solo para R6; RF-16 cita la spec 007,
    RF-14, y RF-12 solo para R6.
  - El respaldo del recorrido (mismo identificador de LoL) cita la spec 004, RF-43 (mismo
    rango con el mismo número de lectura) y RF-4 (la cuenta nueva empieza en la lectura 0),
    en lugar de RF-35, y añade que la distancia 0 exige que ni A ni B resincronicen. Quedó
    en Criterios de finalización, Casos límite (marca de verificada), P37 y P38.
  - Casos límite y Fuera de alcance citan la spec 007, RF-30, y sus decisiones "P18 a P21"
    en conjunto, en lugar de "su P20" o "su P21".
  - El caso límite de zonas con el mismo desfase usaba `America/Buenos_Aires`, que no es
    una zona válida según la spec 003 (Definiciones, "Zona horaria válida"); pasa a
    `America/Argentina/Buenos_Aires` y `America/Sao_Paulo`.
- Revisión QA contra las specs aprobadas (2026-10-18), correcciones sin decisión nueva del
  usuario (hallazgos 5, 7, 8, 9 y 15):
  - Verificación: se alinea con la spec 004, RF-41 (marca fijada por el simulador; la cita
    a su RF-16, retirado, desaparece) y con la spec 007, RF-16 y RF-21 (datos precargados
    con cuentas verificadas y no verificadas en cada juego); RF-4 deja de nombrar una
    acción "verificar", que no existe (spec 007, RF-18). Quedó en Definiciones, RF-4,
    RF-11, RF-16, Casos límite y el criterio del modo simulado, que ya no dice que ninguna
    cuenta de LoL ni de R6 sale verificada ni que la fuente es "Datos de demostración".
  - Citas a la spec 007: se retiran las de sus P9, P13, P14, P17, D3 y D11 y el contenido
    anterior de su RF-21, que cayeron con la 004 y la 005 vigentes (spec 007, "Decisiones
    del usuario que caen"). Siguen vigentes y se citan sus P11, P18 a P21, P22, D13, R5 y
    R19. Quedó en RF-4, RF-6, RF-11, RF-16, RF-17, RF-24, Casos límite y el apartado
    siguiente.
  - Estado y dependencias: se mantiene "Estado: borrador"; la condición previa se marca
    cumplida; se elimina la duda abierta de dependencia; "reglas de presentación … de las
    fuentes" pasa a "de la Etiqueta de datos simulados"; y el Contexto ya no dice que
    `MEMORY.md` registra las vistas como "propuesta sin confirmar" (no contiene ese texto),
    sino que debe recoger P5 al cerrar la fase.
  - RF-24 remite al plazo general de 30 segundos de la spec 007, RF-20, que las vistas
    nuevas heredan, en lugar de "el mismo plazo que vincular y resincronizar … solo para
    esta vista".
  - Referencias: el identificador de cuenta se cita de la spec 004, Definiciones
    ("Identificador de cuenta") y RF-6, no de su RF-2 (RF-4 y P6); RF-6 aclara que RF-17 es
    de esta spec.
- Decisiones de la spec 007 que esta spec usa: P11 (formulario perdido al ir a login), P18
  a P21 (propuesta desde coincidencias y recepción de toda propuesta en la agenda), P22 y
  D13 (perfil con la diferencia desde la primera lectura y sin tendencia), R5 (plazo de 30
  segundos para toda petición, su RF-20) y R19 (texto «Datos de demostración»). Quedaron
  en RF-4, RF-7, RF-16, RF-21, RF-24, RF-27, RNF-6, Casos límite y Fuera de alcance. Ya no
  se citan sus P9, P13, P14, P17, D3 ni D11.

## Dudas abiertas
La dependencia externa (aprobación de la spec 007, que esperaba a las specs 001 a 006)
quedó cumplida el 2026-10-18 (Contexto, condición previa). P41 (diferencia 0) quedó
resuelta por el usuario (Decisiones de clarificación). El identificador de otro jugador
en mayúsculas en modo simulado quedó resuelto por P49.

Dudas abiertas: ninguna.
