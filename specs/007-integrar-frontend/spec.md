# Spec 007 — Conectar la interfaz al servidor real
Estado: borrador

## Contexto y objetivo
Las vistas del Hito 1 funcionan contra un backend simulado en el navegador. El cliente HTTP
que existe nunca se ejecutó y asume otro esquema de sesión: guarda el JWT en un
almacenamiento del navegador legible desde la página y lo envía en una cabecera, lo que es
vulnerable a XSS y choca con el principio 5 de la constitución. El backend simulado hace lo
mismo (deuda registrada en `MEMORY.md`, que nombra a los dos).

Esta spec hace que la interfaz use por defecto el servidor de las specs 001 a 006, con el
esquema de sesión de la spec 002, que vuelva a login cuando no hay sesión y que las vistas
existentes funcionen de punta a punta. También adapta la interfaz a las fuentes oficiales
de la spec 004: R6 sin rango, cuentas sin rango, verificación de CS2 con Steam y el nuevo
significado de "cuenta verificada".

El servidor no tiene datos de demostración: la base empieza vacía y el equipo se registra
con sus cuentas reales para demostrar coincidencias (decisión del usuario). El backend
simulado del navegador queda solo como herramienta de desarrollo de la interfaz, con sus
datos de demostración etiquetados como tales.

- Depende de: specs 001 a 006, y en particular de la 004 y la 005 en su versión aprobada.
  **Condición previa**: esta spec no se aprueba ni se empieza su plan hasta que estén
  aprobadas las specs 001 a 006 (decisión del usuario, P1 ampliada por D4). La spec se
  mantiene entera, sin dividirse. Todo lo que aquí depende de ellas (esquema de sesión de
  la 002; fuentes por juego y Leetify, escala y partidas de CS2, variación de rango por
  partida y candidatos sin rango en LoL y CS2, de la 004 y la 005) remite a lo que digan
  esas specs una vez aprobadas; si al aprobarse cambian algo que esta spec cita, se revisa
  esta spec antes de aprobarla.
- Origen: HU-01 (sesión iniciada y llegada a inicio), HU-03, HU-04 y HU-05 (parte de la
  interfaz); RF-22 y RF-23 de la spec original.
- Las decisiones técnicas ya tomadas (sección 1, sección 2 —cliente, mock, rutas—, RT-15,
  sección 5.3 —variables de la interfaz— y sección 10) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec. De la
  sección 6 pasan los puntos 1 a 3 y 5 a 8, y del punto 4 solo el cambio de lo que
  devuelven el inicio de sesión y el registro; las operaciones nuevas del punto 4 son de las
  specs 008 y 009.
- Prevalece sobre la referencia: la spec 004 (RNF-3) permite que falte el rango vigente,
  por encima de la regla "mantener las formas de los tipos" de la sección 10.
- La tarea T15 de la referencia (cargar datos de demostración en la base) queda sin efecto.

## Usuarios
- Jugador que usa la aplicación contra el servidor real.
- Integrantes del equipo que trabajan la interfaz con o sin servidor.

## Historias de usuario
- HU-1. Como jugador sin cuenta, quiero que al registrarme la sesión quede iniciada y llegue
  a la pantalla de inicio.
- HU-2. Como jugador, quiero que recargar la página no me saque de la aplicación mientras mi
  sesión siga vigente (salvo la excepción de la spec 002, RF-11; ver casos límite).
- HU-3. Como jugador, quiero que al cerrar sesión no quede rastro de mis datos en la
  aplicación abierta, tampoco en otras pestañas.
- HU-4. Como jugador que dejó la pestaña abierta, quiero que al expirar la sesión la
  aplicación me lleve a login y, al volver a entrar, me devuelva a donde estaba.
- HU-5. Como jugador de CS2, quiero verificar mi cuenta iniciando sesión en Steam desde
  Configuración.
- HU-6. Como jugador de R6, quiero entender por qué mi cuenta no muestra rango.

## Definiciones
- **Vistas existentes**: las cinco del Hito 1 (`MEMORY.md`): acceso (login y registro),
  perfil, Configuración, coincidencias y agenda; más Inicio, a la que se llega tras entrar
  (referencia, HU-01), y la página de entrada pública.
- **Rutas públicas**: la página de entrada, login, registro y la vista "no encontrada", que
  se muestra con o sin sesión (decisión del usuario, D5; RF-28). Las demás son protegidas.
- **Modo simulado**: la interfaz usa el backend simulado del navegador en lugar del servidor.
- **Credencial de sesión** y **comprobante anti-CSRF**: los definidos en la spec 002.
- **Consulta de sesión**: la operación que devuelve la sesión actual (spec 002, RF-13).
- **Usuario de la sesión**: el usuario que esta pestaña tiene como sesión iniciada: el que
  devolvió la consulta de sesión con 200 (RF-5) o el del último inicio de sesión correcto
  en esta pestaña (RF-3, RF-4, RF-8), hasta que se limpia la sesión del cliente. Que "el
  cliente tiene un usuario de sesión" (RF-7) quiere decir que existe en ese momento.
  Mientras la consulta de sesión no ha respondido, no hay usuario de la sesión (decisión
  del usuario: opción recomendada aplicada por delegación, P16).
- **Comprobante de esta pestaña**: el último comprobante anti-CSRF que esta pestaña guardó
  al iniciar sesión o leyó del almacenamiento para enviarlo en una petición.
- **Limpiar la sesión del cliente**: olvidar al usuario de la sesión, descartar todos los
  datos del servidor que la aplicación guarda en memoria (referencia, HU-04 y sección 6
  punto 7) y borrar el comprobante anti-CSRF guardado solo si sigue siendo el comprobante
  de esta pestaña; si otra pestaña ya lo reemplazó o lo borró, no lo toca. Cuando la
  limpieza la provoca RF-24, nunca borra el comprobante (decisión del usuario, D1). No
  borra la preferencia de tema del dispositivo ni los datos que guarda el modo simulado,
  que hacen de servidor. Las respuestas de peticiones iniciadas antes de la limpieza se
  descartan al llegar y no vuelven a poner datos en memoria (HU-3; esta misma definición:
  "descartar todos los datos").
- **Ruta de origen**: la ruta, sin parámetros de consulta (como hoy), de la vista protegida
  que el jugador estaba viendo o pidió abrir cuando se le envió a login por RF-7, RF-24 o
  RF-25. Si llegan varios 401 a la vez, es la vista que estaba en pantalla al recibir el
  primero.
- **Error con mensaje**: respuesta del servidor con su respuesta de error (spec 001, RF-7).
- **Error sin mensaje**: fallo de red, petición interrumpida o sin respuesta, o respuesta que
  no trae una respuesta de error legible (por ejemplo, la que da el entorno de desarrollo
  cuando el servidor está apagado). Un 401 nunca es un error sin mensaje: se trata por su
  código (RF-5, RF-7 o, en el inicio de sesión, RF-9), traiga o no un cuerpo legible
  (spec 002, RF-9 a RF-12; referencia, HU-05: "cualquier 401").
- **Texto de error sin mensaje**: "No se pudo conectar con el servidor. Inténtalo de nuevo."
- **Cuenta verificada**, **cuenta sin rango** y **juego sin fuente de rango**: los definidos
  en la spec 004.
- **Mensaje de R6**: "Rango no disponible: Ubisoft no ofrece API oficial." (spec 004,
  RF-20, con el punto final).
- **Cambio de sesión en otra pestaña**: otra pestaña de la misma aplicación, en el mismo
  navegador, cierra sesión (RF-6, también cuando falla el aviso al servidor) o inicia
  sesión (con la misma cuenta o con otra). Que otra pestaña limpie su sesión del cliente
  por RF-5 o RF-7 no es un cambio de sesión: las demás pestañas lo descubren en su
  siguiente petición protegida, que recibe 401 y aplica RF-7 (decisión del usuario, D2).
  Como la cookie de la credencial es una por navegador (spec 002, RF-8), iniciar sesión en
  una pestaña sustituye la sesión de todas las demás.

## Requisitos funcionales
- RF-1: EL SISTEMA usa el servidor real por defecto y solo usa el modo simulado cuando la
  variable de configuración del modo simulado vale exactamente `true`; cualquier otro
  valor, su ausencia, o una dirección del servidor vacía o ausente no lo activan (referencia,
  sección 2 fila "Mock en el navegador" y sección 6 punto 1; la dirección del servidor tiene
  valor por defecto, sección 5.3).
- RF-2: EL SISTEMA no guarda la credencial de sesión en ningún almacenamiento del navegador
  accesible desde el código de la página, y el código de la página nunca la escribe en
  cabeceras ni en cuerpos; solo viaja en la cookie que el navegador adjunta (spec 002,
  definición; referencia, sección 10 "No debe").
- RF-3: CUANDO el inicio de sesión tiene éxito, EL SISTEMA guarda el comprobante anti-CSRF
  recibido donde lo fija la spec 002, reemplazando cualquier comprobante anterior, y lo
  envía junto con las cookies en todas las peticiones posteriores al servidor, públicas o
  protegidas (spec 002, definición: un comprobante nuevo en cada inicio; referencia, RF-22).
- RF-4: CUANDO el registro tiene éxito, EL SISTEMA inicia sesión con las mismas credenciales
  y, si el inicio tiene éxito, lleva al jugador a Inicio aunque existiera una ruta de origen
  (referencia, HU-01; spec 002, caso límite "el registro no inicia sesión por sí solo"); SI
  ese inicio de sesión falla por cualquier motivo (error sin mensaje, 5xx o 401), ENTONCES
  EL SISTEMA lleva al jugador a login con el correo ya escrito y el aviso "Tu cuenta se
  creó; inicia sesión", sin ruta de origen (decisión del usuario, P2). A ese inicio de
  sesión no se le aplica RF-9 aunque el servidor traiga un mensaje: P2 cubre "cualquier
  motivo" y prevalece como caso particular.
- RF-5: CUANDO la aplicación se carga o se recarga, EL SISTEMA hace la consulta de sesión;
  si responde 200 mantiene al jugador dentro y, si responde 401, limpia la sesión del
  cliente y lo trata como sin sesión, sin aplicar RF-7 ni mostrar un error (referencia,
  sección 6 punto 5: la consulta "devuelve null ante 401"). SI la consulta falla con un
  error sin mensaje o un 5xx, ENTONCES EL SISTEMA muestra una pantalla de error con el
  mensaje según RF-9 y el botón "Reintentar" en lugar de la ruta pedida, sea cual sea
  (pública o protegida, incluidas la página de entrada y la vista "no encontrada"), sin
  mostrar login ni ninguna otra vista; "Reintentar" repite la consulta y aplica de nuevo
  este requisito a su resultado (decisión del usuario, P5 y D8). El mensaje de esa pantalla es el del servidor si lo trae y, si no, el
  Texto de error sin mensaje. Confirmado por el usuario. Cualquier respuesta de la
  consulta de sesión distinta de 200 y 401 (por ejemplo 400, 403, 404 o 429) sigue la rama
  del 5xx, porque la spec 002 (RF-10 a RF-13) solo prevé esas dos.
- RF-6: CUANDO el jugador cierra sesión, EL SISTEMA avisa al servidor, limpia la sesión del
  cliente y lleva a login; SI el aviso falla, ENTONCES EL SISTEMA limpia igual la sesión del
  cliente y lleva a login, porque sin el comprobante toda operación protegida responde 401
  (spec 002, RF-11).
- RF-7: SI una operación protegida distinta de la consulta de sesión recibe 401 mientras el
  cliente tiene un usuario de sesión, ENTONCES EL SISTEMA limpia la sesión del cliente y
  lleva a login una sola vez, recordando la ruta de origen, sin recargar la página, y login
  muestra el aviso fijo "Tu sesión expiró. Vuelve a entrar." (referencia, HU-05 y sección 6
  punto 7; decisión del usuario, P6). No se aplica al 401 del inicio de sesión por
  credenciales incorrectas (spec 002, RF-9), que se muestra según RF-9. La llegada sin
  sesión a una ruta protegida, sin un 401 previo, la cubre RF-25.
- RF-8: CUANDO el jugador inicia sesión desde login, EL SISTEMA lo lleva a la ruta de origen
  si existe y, si no, a Inicio (referencia, HU-01). Hay ruta de origen cuando llegó a login
  por RF-7, RF-24 o RF-25 (ver la definición). Pasar de login a registro descarta la ruta de
  origen (RF-4).
- RF-9: SI el servidor responde un error con mensaje, ENTONCES EL SISTEMA muestra el mensaje
  tal como llega (referencia, sección 6 punto 8), incluidos "Jugador no encontrado." y
  "Fuente no disponible, inténtalo más tarde." al vincular o resincronizar (spec 004); SI
  ocurre un error sin mensaje, ENTONCES EL SISTEMA muestra el Texto de error sin mensaje
  (decisión del usuario, P4), no lo trata como 401 y no limpia la sesión del cliente.
- RF-10: MIENTRAS está activo el modo simulado, EL SISTEMA responde como el servidor en esta
  lista cerrada de diferencias con el backend simulado actual:
  1. Correo o nombre de usuario ya registrados: 400, no 409 (spec 002, RF-3).
  2. Registrar no inicia sesión por sí solo (spec 002, caso límite).
  3. Identificador de cuenta que no cumple el patrón del juego: 400, no 422 (spec 004, RF-6).
  4. Segunda cuenta en el mismo juego: 400, no 409 (spec 004, RF-5).
  5. Desvincular o resincronizar una cuenta ajena: 403, no 404; una inexistente sigue en
     404 (spec 004, RF-11).
  6. Toda cuenta recién vinculada queda no verificada y resincronizar no cambia la
     verificación (spec 004, RF-26). Ninguna cuenta de LoL o R6 está verificada, tampoco
     en los datos semilla; una cuenta semilla de CS2 puede estar verificada (spec 004,
     definición de cuenta verificada; decisión del usuario, D3).
  7. Toda cuenta de R6, de los datos semilla o vinculada, no tiene rango vigente, tiene el
     historial y las partidas vacíos y no está verificada (spec 004, RF-19; decisión del
     usuario, D3); vincularla responde así, y resincronizarla responde 409 con el Mensaje
     de R6, "Rango no disponible: Ubisoft no ofrece API oficial." (spec 004, RF-20).
  8. Coincidencias de R6: sin distancia, sin filtro de distancia y con puntaje solo
     horario (spec 005, RF-10).
  9. Ningún candidato de coincidencias trae correo (spec 005, RF-3 y RNF-2).
  10. Salir de una sesión sin estar inscrito: 409 con "no estás inscrito en esta sesión"
      (spec 006, RF-17), no 200.
  11. Actualizar el perfil: guarda el color de avatar, y nombre visible vacío o solo con
      espacios, zona horaria no IANA, nombre visible de más de 40, biografía de más de 200
      o color sin la forma `#RRGGBB` responden 400 sin guardar nada (spec 003, RF-7, RF-8,
      RF-15 y RF-16).
  12. Los mensajes que las specs 002 a 006 fijan de forma literal son los mismos en el
      modo simulado (por ejemplo, el 401 sin sesión usa "sesión no iniciada", spec 002,
      RF-10).
  La lista vale aunque la interfaz no pueda provocar todos sus casos (referencia, sección 6
  punto 6: el backend simulado "se comporte igual que el servidor"). Desde la interfaz se
  pueden provocar o ver los puntos 1, 6 (la verificación de las cuentas semilla se ve en
  perfil, Configuración y coincidencias), 7 (vincular y ver las cuentas semilla de R6), 8 y
  11 (solo el nombre visible vacío, con espacios o de más de 40); no se pueden el 2, el 3 (el formulario valida el patrón),
  el 4 (no ofrece juegos ya vinculados), el 5 (solo se ven las cuentas propias), la
  resincronización de R6 del 7 (RF-18), el 9, el 10 ("Salir" solo aparece si está
  inscrito) y, del 11, la biografía de más de 200 (el campo la limita), la zona horaria y
  el color (no se editan). Verificar cuentas de LoL o R6 tampoco se puede provocar (RF-18)
  y queda fuera de la lista. El rango y la fuente de las cuentas del modo simulado los fija
  RF-21.
- RF-11: MIENTRAS está activo el modo simulado, EL SISTEMA muestra el aviso "Datos de
  demostración" en los lugares donde aparece hoy en las vistas protegidas (barra de
  navegación y pie, RNF-4) y la pista de la cuenta demo en login, y ningún texto del aviso
  indica una forma de conectar el servidor distinta de RF-1; MIENTRAS usa el servidor real,
  no muestra ninguno de los dos. RF-11 no afecta a la página de entrada (RF-22).
- RF-12: EL SISTEMA muestra el Mensaje de R6 en lugar del rango, del historial de rango y de
  la distancia en toda vista existente que los muestre para una cuenta de R6 (hoy perfil,
  Configuración y coincidencias de R6; Inicio no muestra rango), y en las coincidencias de
  R6 el filtro de
  distancia no tiene efecto y se presenta según RF-23 (spec 004, RF-19; spec 005, RF-10).
  En el bloque "Posición en la escala del juego" de una cuenta de R6, el Mensaje de R6
  ocupa el lugar de la escala y no se muestran el número de lecturas registradas ni la
  primera lectura, que forman parte del historial (decisión del usuario: opción
  recomendada aplicada por delegación, P13).
- RF-13: EL SISTEMA incluye un archivo de ejemplo con los nombres de las variables de
  entorno de la interfaz, sin secretos.
- RF-14: SI una cuenta de LoL o CS2 no tiene rango vigente, ENTONCES EL SISTEMA muestra
  "Sin rango" en lugar del rango en toda vista existente que lo muestre, y sigue mostrando
  el historial de rango anterior si existe (spec 004, RF-21 y caso límite de nueva
  temporada). SI una cuenta no tiene rango vigente o no tiene partidas (incluida toda
  cuenta de R6), ENTONCES EL SISTEMA muestra "Sin datos" en lugar de la tasa de victorias
  en toda vista existente que la muestre (hoy, solo el perfil) (decisión del usuario, P9,
  corregida por D13). El perfil muestra de cada cuenta solo la tasa de victorias, sin
  tendencia (decisión del usuario, D13). La diferencia "▲ +<n> pts desde la primera
  lectura" de la escala del perfil no es la tendencia: es la diferencia real con la primera
  lectura del historial y se mantiene en las cuentas con rango vigente (decisión del
  usuario, P22). En el bloque "Posición en la escala del juego" de
  una cuenta de LoL o CS2 sin rango vigente, la escala no marca ninguna posición vigente
  ni la diferencia desde la primera lectura y en su lugar muestra "Sin rango"; si hay
  historial anterior, se muestran el número real de lecturas registradas y "Primera
  lectura: <rango de la primera lectura>"; sin historial, no se muestran ni el número de
  lecturas ni la primera lectura (decisión del usuario: opción recomendada aplicada por
  delegación, P13). SI en las coincidencias de LoL o CS2 aparece un candidato sin
  distancia de rango porque él o el usuario de la sesión no tiene rango vigente,
  ENTONCES EL SISTEMA muestra "Sin datos" en lugar de "Δ <n> pts" y "Sin rango" en lugar
  de su rango, y nunca una distancia calculada con un rango ausente. Si esos candidatos
  aparecen, con qué puntaje y cómo les afecta el filtro de distancia lo fija la spec 005
  aprobada (su duda abierta sobre candidatos sin rango); este requisito fija solo su
  presentación (decisión del usuario: opción recomendada aplicada por delegación, P17).
- RF-15: MIENTRAS usa el servidor real, EL SISTEMA nombra como fuente de cada juego
  exactamente las de la tabla "Fuentes por juego" de la spec 004 en su versión aprobada, en
  todo lugar donde la interfaz nombra una fuente (hoy: cuentas vinculadas en perfil y
  Configuración, formulario de vinculación, coincidencias y página de entrada), y no
  menciona ninguna otra. Donde la interfaz habla del rango (por ejemplo, "Leeremos tu rango
  desde…" o "rango desde…"), nombra la columna "Rango" de esa tabla (en CS2, FACEIT, y
  Leetify solo si la 004 lo confirma); donde habla de la verificación, la columna
  "Verificación de propiedad" (Steam); y nombra cada fuente como la nombra la tabla. En
  R6 no nombra ninguna fuente de rango ni dice que leerá el rango. En la fila de cada
  cuenta, el campo "Fuente" nombra la fuente de la columna "Rango" (en LoL, la API oficial
  de Riot; en CS2, FACEIT, y Leetify solo si la 004 lo confirma), no Steam, que se nombra
  solo donde se habla de la verificación; en R6, con el servidor real, la fila no muestra
  el campo "Fuente", ni vacío ni con guion (decisión del usuario: opción recomendada
  aplicada por delegación, P14). Nombrar a Ubisoft en el Mensaje de R6, o una plataforma
  en la etiqueta del identificador de cuenta ("Riot ID", "Ubisoft ID" o "SteamID64"), no
  es nombrar una fuente, con el servidor real y en modo simulado (decisión del usuario:
  opción recomendada aplicada por delegación, P15).
  En modo simulado, la fuente que se nombra para una cuenta o para la cuenta que se va a
  vincular (pista del formulario) se muestra según RF-21; la página de entrada nombra las
  fuentes reales en los dos modos (RF-22, P8).
- RF-16: EL SISTEMA usa "verificada" solo para cuentas cuyo dueño inició sesión en la
  plataforma del juego (spec 004, definición), siempre referido a la cuenta ("verificada" /
  "sin verificar"), y no presenta ningún rango como "verificado" en ninguna vista,
  incluidas Inicio y la página de entrada; ningún texto de la interfaz usa la forma
  masculina "verificado"; el filtro de coincidencias se rotula "Solo cuentas verificadas".
- RF-17: MIENTRAS usa el servidor real y una cuenta de CS2 propia no está verificada, EL
  SISTEMA ofrece en Configuración "Verificar con Steam", que lleva la página completa al
  inicio de sesión de Steam. La vuelta desde Steam llega a Configuración en la interfaz, que
  pide la verificación al servidor desde la propia página y a través del contrato único,
  de modo que la petición lleva la cookie con SameSite=Strict (spec 002, RF-8; spec 004,
  RNF-6), y muestra la cuenta verificada o el mensaje de error del servidor según RF-9
  (spec 004, RF-23 y RF-24). Una vez enviada la verificación, la interfaz retira de la
  dirección los datos de la vuelta, de modo que recargar Configuración no los reenvía. La
  dirección de inicio de sesión de Steam y la de vuelta funcionan en desarrollo y en
  producción (spec 010); cómo se construyen lo fija el plan junto con el de la spec 004.
  En modo simulado no se ofrece (fuera de alcance). Confirmado por el usuario.
- RF-18: EL SISTEMA no ofrece resincronizar ni verificar cuentas de R6, ni verificar
  cuentas de LoL.
- RF-19: MIENTRAS está activo el modo simulado, EL SISTEMA tampoco guarda en el navegador
  ningún valor que haga de credencial de sesión; de la sesión solo guarda el comprobante
  anti-CSRF, como con el servidor real (`MEMORY.md`, deuda conocida; referencia, sección 6
  puntos 1 y 6). Confirmado por el usuario.
- RF-20: MIENTRAS una vinculación o una resincronización está en curso, EL SISTEMA indica que
  está en curso y no permite enviarla de nuevo hasta recibir respuesta o hasta que pasen 30
  segundos desde el envío. SI pasan 30 segundos sin respuesta, ENTONCES EL SISTEMA deja de
  esperarla, desbloquea el botón y muestra el Texto de error sin mensaje, sin limpiar la
  sesión del cliente (RF-9), y si la respuesta llega después no la muestra (decisión del
  usuario, D6). Tampoco vuelve a pedir las cuentas de forma automática por si el servidor
  terminó la operación después (decisión del usuario, D12; ver casos límite). El servidor
  espera como máximo 10 segundos a cada fuente (spec 004, RNF-5),
  así que una lectura de CS2 que consulta varias fuentes puede tardar más de 10 segundos.
- RF-21: MIENTRAS está activo el modo simulado, EL SISTEMA aplica a toda cuenta, de los datos
  semilla (incluidas las ya vinculadas de la cuenta demo) o vinculada desde la interfaz, las
  reglas del servidor de RF-10, puntos 6 y 7: LoL y R6 sin verificar, R6 sin rango vigente,
  historial ni partidas, y CS2 verificada solo si es una cuenta semilla (decisión del
  usuario, D3). Puede inventar el rango, el historial y las partidas de las cuentas de LoL y
  CS2, pero en todo lugar donde nombraría la fuente de cualquier cuenta del modo simulado
  muestra "Datos de demostración" en lugar de Riot, FACEIT, Steam o cualquier otra fuente de
  la spec 004 (decisión del usuario, P7 y D3). Esto incluye a Steam como fuente de la
  verificación de propiedad: en modo simulado tampoco se nombra Steam como fuente (la
  etiqueta del identificador "SteamID64" no cuenta, RF-15 y P15), y la única cuenta
  verificada posible es una cuenta semilla de CS2, porque la verificación con Steam no
  existe en este modo (RF-17; decisión del usuario, D11).
- RF-22: EL SISTEMA muestra en el pie de la página de entrada el aviso "Los datos que ves
  son de demostración", tanto con el servidor real como en modo simulado, y no añade otro
  etiquetado a esa página (decisión del usuario, P8).
- RF-23: EL SISTEMA muestra deshabilitados, con una nota breve junto al control que explica
  por qué no tiene efecto, el filtro de distancia en las coincidencias de R6 (R6 no tiene
  rango del que medir distancia) y el filtro "Solo cuentas verificadas" en las
  coincidencias de LoL y R6 (en esos juegos ninguna cuenta puede verificarse) (decisión del
  usuario, P10; spec 005, RF-10).
- RF-24: CUANDO otra pestaña registra un cambio de sesión, EL SISTEMA limpia la sesión del
  cliente en esta pestaña y lleva a login una sola vez, recordando la ruta de origen (ver la
  definición), sin recargar la página, y login muestra el aviso fijo "Se cerró o cambió
  la sesión en otra pestaña.", distinto del de RF-7 (decisión del usuario, P3 y P12). Esa
  limpieza nunca borra el comprobante anti-CSRF guardado (decisión del usuario, D1). Si
  esta pestaña ya está en una ruta pública o en la pantalla de error de RF-5, solo limpia
  la sesión del cliente, sin ruta de origen nueva ni aviso; desde la pantalla de error,
  "Reintentar" sigue aplicando RF-5. Solo cerrar e iniciar sesión activan este requisito;
  las limpiezas por RF-5 o RF-7 en otra pestaña no lo activan (decisión del usuario, D2).
- RF-25: MIENTRAS no hay sesión iniciada, CUANDO el jugador abre o recarga una ruta
  protegida, EL SISTEMA no muestra esa vista y lleva a login una sola vez, recordando esa
  ruta como ruta de origen, sin aviso (referencia, HU-03, HU-05, sección 6 punto 7 y
  sección 12: "el frontend redirige a /login sin sesión"; spec 010, casos límite).
- RF-26: EL SISTEMA no afirma en ningún texto visible que el rango se vuelve a leer de forma
  automática, periódica o "cuando cambia" (spec 004, fuera de alcance: resincronización
  periódica automática). Los textos que hoy lo prometen en Configuración ("Releemos el rango
  de forma periódica"), en la página de entrada ("Se vuelve a leer cuando cambia") y en la
  pantalla de acceso de login y registro ("lo volvemos a leer cuando cambia") se sustituyen
  por un texto que dice que el rango se vuelve a leer al pulsar "Resincronizar" (decisión
  del usuario, D7). Para que ese texto nombre un control que existe, el botón que hoy se
  rotula "Volver a leer el rango" pasa a rotularse "Resincronizar", en todo lugar donde
  aparece; ningún texto visible conserva el rótulo "Volver a leer el rango" (decisión del
  usuario, D10). En R6 no se ofrece ese botón (RF-18).
- RF-27: MIENTRAS está activo el modo simulado, EL SISTEMA no usa en los datos semilla el
  nombre ni el apellido de ningún integrante del equipo (`AGENTS.md`, Equipo) en nombres
  visibles, nombres de usuario, biografías ni identificadores de cuenta, ni nombres de
  usuario derivados de ellos; usa nombres ficticios (constitución, principio 5: "nada de
  datos reales inventados"; decisión del usuario, D9).
- RF-28: CUANDO se abre una dirección que no corresponde a ninguna vista, EL SISTEMA muestra
  la vista "no encontrada", con o sin sesión, sin llevar a login ni recordar ruta de origen
  (decisión del usuario, D5), salvo que se aplique la pantalla de error de RF-5 (D8).
- RF-29: CUANDO el usuario de la sesión elige "Proponer" en una fila de coincidencias, EL
  SISTEMA lleva a la agenda (RF-30) con el formulario de nueva sesión rellenado con la
  misma regla que la ficha de jugador (spec 008, RF-7): el juego de la coincidencia; el
  día y la hora del primer bloque en común cuya hora está en el horario de la agenda (de
  las 12:00 a las 23:00, más las 00:00 y las 01:00), recorriendo los bloques del lunes al
  domingo y, dentro de un día, por la hora en su orden literal, de las 00:00 a las 23:00;
  como duración, las horas que van desde ese bloque hasta el final de la serie de bloques
  en común seguidos del mismo día que lo contiene, con un mínimo de 1 y un máximo de 4; el
  título "Sesión con <nombre visible del candidato>"; y los valores por defecto del
  formulario en cupos y notas. SI no hay ningún bloque así, ENTONCES EL SISTEMA muestra
  "Proponer" deshabilitado y, junto a él, el primero que aplique de: "No has marcado tus
  horas" (el usuario de la sesión no tiene disponibilidad), "Este jugador no ha marcado
  horas", "No tienen horas en común" y "Sus horas en común quedan fuera del horario de la
  agenda (12:00 a 01:00)"; el botón deshabilitado sigue recibiendo el foco y un lector de
  pantalla anuncia su motivo. Son los motivos 3 a 6 de la spec 008, RF-12, con sus mismos
  textos; los motivos 1 y 2 no aplican, porque un candidato siempre tiene cuenta en el
  juego consultado y el usuario de la sesión también. Sustituye el comportamiento actual,
  que propone el primer bloque en común aunque quede fuera del horario de la agenda
  (decisión del usuario: opción recomendada aplicada por delegación, P18). Elegir el
  bloque, la duración y el motivo son reglas puras del dominio, compartidas con la ficha
  y sin duplicarse (constitución, principio 3).
- RF-30: CUANDO la agenda recibe una propuesta, venga de coincidencias (RF-29) o de la
  ficha de jugador (spec 008, RF-7), EL SISTEMA aplica la misma regla (decisión del
  usuario: opción recomendada aplicada por delegación, P19): MIENTRAS las cuentas del
  usuario de la sesión se están cargando, no abre el formulario y lo abre cuando llegan,
  nunca con la lista de juegos vacía; SI esa carga falla, ENTONCES muestra el error según
  RF-9, no abre el formulario y descarta la propuesta, también si después se reintenta
  (P20); SI el usuario de la sesión ya no tiene cuenta en el juego propuesto, ENTONCES no
  abre el formulario y la agenda se muestra como si se hubiera abierto directamente (spec
  008, RF-21). La propuesta se usa una sola vez: una vez abierto el formulario o
  descartada la propuesta, recargar la agenda o volver con "Atrás" o "Adelante" a la
  entrada del historial que la trajo muestra la agenda como si se hubiera abierto
  directamente, sin reabrir el formulario (P21).

## Requisitos no funcionales
- RNF-1: Los componentes acceden a los datos solo a través del contrato único y nunca
  llaman a la red directamente (constitución, principio 3). Ir al inicio de sesión de Steam
  es una navegación de la página completa, no una llamada a la red; la nota de la referencia
  (sección 6 punto 7) que descarta recargar la página se refiere al manejo del 401 (RF-7).
- RNF-2: Ningún contenido de otros usuarios (biografía, títulos, notas) se inserta como HTML
  (`AGENTS.md`); es la defensa contra XSS que complementa la cookie HttpOnly.
- RNF-3: Construcción, comprobación de tipos y lint de la interfaz en verde (constitución,
  principio 4). En la interfaz no se exigen pruebas automáticas, tampoco para sus reglas
  de dominio: el principio 4 exige pruebas en el backend y en el frontend bastan
  construcción, tipos y lint (constitución, principio 4; `MEMORY.md`, decisiones).
- RNF-4: No se rediseña ninguna vista existente (referencia, sección 11); todos los cambios
  de esta spec que se ven en pantalla, incluidos la pantalla de error con "Reintentar"
  (RF-5) y los avisos de login (RF-4, RF-7 y RF-24), reutilizan los componentes y tokens
  de diseño existentes.
- RNF-5: Ninguna clave de fuente externa llega a la interfaz ni a sus variables de entorno.
- RNF-6: Los cambios en las reglas de dominio de la interfaz (rango vigente opcional,
  fuentes por juego) no cambian el criterio de normalización ni el de puntaje, que el
  servidor comparte como copia del dominio de la interfaz (`AGENTS.md`, estructura; spec
  005, contexto). Las dos copias quedan con el mismo criterio de normalización y de
  puntaje; si divergen, manda la del servidor, porque sus pruebas unitarias fijan el
  comportamiento (referencia, sección 5.1: "cualquier cambio de criterio se hace en ambos
  lados; los tests unitarios del backend fijan el comportamiento").

## Casos límite
- Recargar sin comprobante anti-CSRF guardado pero con cookie vigente: la consulta de
  sesión responde 401 (spec 002, RF-11) y el jugador queda sin sesión (RF-5). Es la
  excepción declarada a HU-2.
- Abrir o recargar directamente una ruta protegida sin sesión: va a login con esa ruta como
  ruta de origen (RF-25, RF-8), también en producción (spec 010, casos límite).
- Una respuesta que llega después de limpiar la sesión del cliente (por RF-6, RF-7 o RF-24)
  se descarta y no vuelve a mostrar datos de la cuenta anterior ni de la nueva (definición
  de limpiar la sesión del cliente).
- Cambio de sesión en otra pestaña mientras esta muestra la pantalla de error de RF-5: solo
  limpia la sesión del cliente, sin aviso; "Reintentar" aplica RF-5 a la sesión que haya
  entonces (RF-24).
- Dos pestañas del mismo origen usan siempre el mismo modo, porque el modo se fija al
  construir o arrancar la interfaz (RF-1) y cada servidor de desarrollo tiene su propio
  origen; no puede darse una pestaña en modo simulado y otra con el servidor real
  compartiendo el comprobante.
- Recargar Configuración después de la vuelta desde Steam no reenvía los datos de la vuelta
  (RF-17).
- La consulta de sesión responde con un código distinto de 200 y 401: pantalla de error con
  "Reintentar", como con un 5xx (RF-5).
- Varias peticiones reciben 401 a la vez: el jugador llega a login una sola vez, con un solo
  aviso de sesión expirada, y la ruta de origen es la de la vista en pantalla al recibir el
  primero (RF-7).
- Sesión expirada (una hora, spec 002, RNF-1) con la pestaña abierta: la siguiente
  operación protegida recibe 401 y se aplica RF-7, que borra el comprobante y muestra "Tu
  sesión expiró. Vuelve a entrar."; si en cambio se recarga, se aplica RF-5, que también lo
  borra y no muestra ese aviso.
- **Limitación declarada** (decisión del usuario, P11): los datos que el jugador no guardó
  (por ejemplo, la disponibilidad editada o el borrador de una sesión de la agenda) se
  pierden cuando RF-7 lo lleva a login, y también cuando RF-24 lo hace.
- Un error de red (servidor caído) no se trata como 401: se muestra el Texto de error sin
  mensaje, sin limpiar la sesión del cliente (RF-9). Lo mismo con la respuesta sin cuerpo
  legible que da el entorno de desarrollo cuando el servidor está apagado.
- Servidor caído o con 5xx al cargar la aplicación: pantalla de error con "Reintentar"
  (RF-5); si al reintentar responde 200 el jugador entra, y si responde 401 queda sin
  sesión.
- Registro correcto e inicio de sesión posterior fallido: el jugador llega a login con el
  correo escrito y "Tu cuenta se creó; inicia sesión" (RF-4); no necesita repetir el
  registro, que daría 400 por duplicado (RF-10, punto 1).
- Credenciales incorrectas en login: se muestra "Correo o contraseña incorrectos." (spec
  002, RF-9) y no se aplica RF-7.
- Cerrar sesión con el servidor caído: se limpia la sesión del cliente y se va a login
  (RF-6); la cookie queda en el navegador hasta expirar, pero sin comprobante no sirve
  (spec 002, RF-11). Las demás pestañas también van a login (RF-24).
- Iniciar sesión con otra cuenta en una pestaña mientras otra muestra los datos de la
  cuenta anterior: la otra pestaña descarta esos datos y va a login con el aviso "Se cerró
  o cambió la sesión en otra pestaña." (RF-24); al entrar de nuevo vuelve a la ruta de
  origen, con los datos de la cuenta con la que entra.
- Cambio de sesión en otra pestaña mientras esta está en una ruta protegida: va a login una
  sola vez, con el aviso de RF-24 (no el de RF-7) y con esa ruta como ruta de origen (RF-8).
  Si esta pestaña está en login o registro, solo se limpia su sesión del cliente, sin aviso.
- Cambio de sesión en otra pestaña y 401 en esta casi a la vez: se aplica solo lo que ocurre
  primero y se muestra un único aviso. Si primero llega el cambio, RF-24 deja el cliente
  sin usuario de sesión y el 401 posterior ya no aplica RF-7; si primero llega el 401, la
  pestaña ya está en login (ruta pública) y RF-24 solo limpia la sesión del cliente.
  Confirmado por el usuario.
- Clave de Riot caducada: vincular o resincronizar una cuenta LoL muestra "Fuente no
  disponible, inténtalo más tarde." y la sesión del jugador sigue iniciada (el servidor
  responde 503, no 401; spec 004, RF-18).
- Una fuente tarda hasta 10 segundos (o más en total en una lectura de CS2 con varias
  fuentes): el botón muestra que la operación está en curso y no admite un segundo envío
  (RF-20).
- Cuenta de LoL o CS2 sin rango vigente pero con historial: muestra "Sin rango", el
  historial anterior y "Sin datos" en la tasa de victorias (RF-14).
- El jugador cancela el inicio de sesión en Steam: vuelve a Configuración con la cuenta sin
  verificar y el mensaje del servidor (spec 004, RF-24).
- La vuelta desde Steam trae datos ya usados, una identidad con otro SteamID64 o llega
  cuando la cuenta ya se desvinculó: se muestra el mensaje del servidor (400 o 404; spec
  004, RF-24 y RF-3) y nada cambia.
- La vuelta desde Steam llega con la sesión expirada: se aplica RF-7 y, tras iniciar sesión,
  vuelve a Configuración sin los datos de la vuelta (la ruta de origen no lleva parámetros
  de consulta), con la cuenta sin verificar hasta repetir el paso.
- Los 403 y 409 de la spec 004 que la interfaz puede recibir se muestran según RF-9; el 409
  de resincronizar R6 (RF-20 de la 004) y el de verificar LoL o R6 (RF-25 de la 004) solo
  llegan por llamadas directas a la API, porque la interfaz no ofrece esas acciones (RF-18).
- Construcción de producción sin la variable del modo simulado: usa el servidor real (RF-1).
- Una pestaña inicia sesión (con la misma cuenta o con otra) y la otra aplica RF-24: la
  segunda no borra el comprobante nuevo y la primera sigue operando sin 401 (D1).
- Un 401 tardío (RF-7) o una recarga con 401 (RF-5) en una pestaña cuyo comprobante ya
  reemplazó otra pestaña al iniciar sesión: limpia su sesión del cliente sin borrar el
  comprobante de la otra (D1).
- La sesión expira o se borra la cookie y una pestaña recibe 401 (RF-7): las demás no
  reaccionan en ese momento y siguen mostrando su vista hasta su siguiente petición
  protegida, que recibe 401 y las lleva a login con "Tu sesión expiró. Vuelve a entrar."
  (RF-7), no con el aviso de RF-24 (D2).
- Una vinculación o resincronización sin respuesta a los 30 segundos: el botón se
  desbloquea y se muestra el Texto de error sin mensaje (RF-20). El servidor puede haber
  completado la operación: el resultado aparece la siguiente vez que la interfaz lee las
  cuentas (por ejemplo, al recargar), y un segundo intento de vincular el mismo juego recibe
  400 (spec 004, RF-5), que se muestra según RF-9.
- El servidor completa una vinculación o una resincronización después de los 30 segundos:
  la interfaz no muestra esa respuesta ni vuelve a pedir las cuentas de forma automática;
  hasta la siguiente lectura de las cuentas, Configuración y el perfil pueden mostrar la
  cuenta sin vincular o el rango anterior (decisión del usuario, D12).
- Dirección inexistente abierta sin sesión: se muestra "no encontrada", sin ir a login
  (RF-28); su enlace a Inicio, que es protegida, lleva a login por RF-25.
- Servidor caído al abrir la página de entrada o una dirección inexistente: se muestra la
  pantalla de error de RF-5 en su lugar (D8).
- Cuenta semilla de R6 en modo simulado: muestra el Mensaje de R6 en lugar del rango y
  "Sin datos" en la tasa de victorias, igual que con el servidor (RF-12, RF-14, RF-21).
- Cuenta de R6 en el perfil: la posición en la escala muestra solo el Mensaje de R6, sin
  "0 lecturas registradas" ni "Primera lectura" (RF-12, P13); con el servidor real no
  muestra el campo "Fuente" (RF-15, P14); en modo simulado muestra "Datos de
  demostración" como fuente, como toda cuenta del modo (RF-21).
- Cuenta de LoL o CS2 sin rango vigente: la escala muestra "Sin rango" sin posición
  vigente; con historial, el número real de lecturas y la primera lectura (RF-14, P13).
- Cuenta de CS2: el campo "Fuente" nombra FACEIT (la columna "Rango" de la spec 004) y no
  Steam (RF-15, P14). La etiqueta "SteamID64" del formulario de vinculación y de la cuenta
  se muestra en los dos modos y no cuenta como nombrar Steam (RF-15, RF-21, P15).
- Candidato de LoL o CS2 sin distancia en coincidencias, si la spec 005 aprobada lo
  incluye: "Sin datos" en lugar de "Δ <n> pts" (RF-14, P17).
- Coincidencia cuyas horas en común caen solo entre las 02:00 y las 11:00 (con el mínimo
  de horas bajo): "Proponer" deshabilitado con "Sus horas en común quedan fuera del
  horario de la agenda (12:00 a 01:00)" (RF-29, P18).
- Coincidencia con un tramo en común de 10:00 a 14:00: se propone a las 12:00 con 2 horas
  (RF-29, P18).
- La agenda recibe una propuesta mientras sus cuentas cargan: abre el formulario cuando
  llegan; si fallan, muestra el error y descarta la propuesta (RF-30, P20).
- Recargar la agenda con el formulario propuesto abierto, o volver con "Atrás" o
  "Adelante" a la entrada que trajo la propuesta: no se reabre el formulario, así que no se
  puede anotar dos veces por error la misma propuesta (RF-30, P21). Los datos escritos en
  ese formulario se pierden, como en la limitación de P11.
- Propuesta desde coincidencias de un juego que el usuario de la sesión desvinculó en otra
  pestaña: la agenda no abre el formulario (RF-30).

## Fuera de alcance
- Las dos vistas nuevas (specs 008 y 009) y las operaciones del contrato que solo ellas usan
  (referencia, sección 6 punto 4).
- Pruebas automáticas de la interfaz, incluidas las de sus reglas de dominio (RNF-3).
- Producción y despliegue (spec 010).
- Datos de demostración en el servidor o un comando para cargarlos.
- Verificación con Steam en modo simulado.
- Editar la región de una cuenta desde la interfaz (el servidor lo permite, spec 004).
- Conservar los datos sin guardar al ir a login por un 401 o por un cambio de sesión en otra
  pestaña (limitación declarada, P11).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Recorrido manual registrado paso a paso, con fecha y resultado de cada paso, en el
      registro de validación de esta spec. Condiciones: servidor real, base vacía al
      empezar, clave de Riot renovada el mismo día, modo simulado desactivado y dos
      integrantes A y B con sus cuentas reales. Pasos: registro de A y B (cada uno llega a
      Inicio), cierre e inicio de sesión, recarga con sesión vigente (sigue dentro), vincular,
      resincronizar y desvincular una cuenta LoL, vincular una cuenta R6 y ver el Mensaje de
      R6 en lugar del rango en perfil, Configuración y coincidencias de R6, y "Sin datos" en
      la tasa de victorias en el perfil, que no muestra tendencia (RF-12, RF-14); en el
      perfil, la escala de R6 muestra solo el Mensaje de R6, sin número de lecturas ni
      primera lectura, y la cuenta no muestra el campo "Fuente" (RF-12, RF-15, P13, P14);
      vincular
      y verificar con Steam una cuenta CS2 (solo esa cuenta aparece como verificada; recargar Configuración
      después no muestra un error nuevo; su campo "Fuente" nombra FACEIT y no Steam, P14),
      guardar disponibilidad, crear, sumarse, salir y
      cancelar una sesión de la agenda, y cierre de sesión.
- [ ] Coincidencias, dentro del mismo recorrido, con A y B con cuenta R6, cuenta LoL con
      rango y al menos 2 bloques en común: cada uno ve al otro en R6 con el mínimo de horas
      en 2, y el filtro de distancia aparece deshabilitado con su nota; en LoL y R6 el
      filtro "Solo cuentas verificadas" aparece deshabilitado con su nota; en LoL, con la
      distancia máxima en 0 el otro no aparece (salvo que tengan el mismo rango normalizado,
      spec 005), con la distancia máxima en el primer paso igual o mayor que la distancia
      entre los dos aparece, y si esa distancia supera 50 no aparece en ningún valor del
      deslizador (spec 005, filtros: 0-50 en pasos de 5); la búsqueda por nombre de usuario
      lo encuentra. CS2 se valida igual que LoL cuando la 004 y la 005 aprobadas fijen su
      escala (P1). Con A y B con bloques en común martes 20:00, 21:00 y 22:00 y jueves
      03:00, "Proponer" en la fila de B abre la agenda con el formulario rellenado con LoL,
      martes, 20:00, 3 horas y "Sesión con <nombre visible de B>"; dejando el jueves 03:00
      como única hora en común y el mínimo de horas en 1, "Proponer" está deshabilitado con
      "Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)", recibe el
      foco y un lector de pantalla anuncia ese motivo (RF-29). Si la spec 005 aprobada
      incluye candidatos sin rango en LoL, una fila así muestra "Sin datos" en lugar de la
      distancia (RF-14, P17).
- [ ] Agenda, dentro del mismo recorrido: tras abrir el formulario desde coincidencias,
      recargar la agenda la muestra sin formulario, y volver a coincidencias con "Atrás" y
      a la agenda con "Adelante" tampoco lo reabre (P21); con la red limitada a "3G lenta",
      "Proponer" abre el formulario con la lista de juegos ya cargada (P20); bloqueando en
      las herramientas del navegador la petición de las cuentas, la agenda muestra el
      error y no abre el formulario, tampoco tras "Reintentar" (P20); desvinculando la
      cuenta de LoL en otra pestaña antes de pulsar "Proponer", la agenda no abre el
      formulario (RF-30).
- [ ] Con el servidor real no aparecen en las vistas protegidas ni en login el aviso "Datos
      de demostración" ni la pista de la cuenta demo, ninguna fuente se nombra "Datos de
      demostración", y la pista del formulario de vinculación y la marquesina de la página
      de entrada nombran en cada juego la fuente de la columna "Rango" de la spec 004 (en
      R6, ninguna) (RF-15); con el modo simulado aparecen los dos en los lugares de RF-11, y la
      fuente de una cuenta LoL o CS2 recién vinculada se muestra como "Datos de
      demostración". En los dos modos el pie de la página de entrada muestra "Los datos que
      ves son de demostración" (RF-11, RF-21, RF-22).
- [ ] Con sesión iniciada en Configuración, borrar la cookie desde las herramientas del
      navegador y guardar la disponibilidad lleva a login con el aviso "Tu sesión expiró.
      Vuelve a entrar."; al entrar de nuevo vuelve a Configuración, y entre el 401 y el
      nuevo inicio el almacenamiento del navegador no tiene comprobante (RF-7, RF-8).
- [ ] Borrar la cookie y navegar por primera vez en la sesión a una vista que hace más de
      una consulta al servidor: la pestaña de red muestra más de un 401 y el historial del
      navegador una sola entrada de login.
- [ ] Con el servidor apagado y el modo simulado desactivado, guardar la disponibilidad
      muestra "No se pudo conectar con el servidor. Inténtalo de nuevo." y no lleva a
      login; recargar muestra la pantalla de error con "Reintentar" y no muestra login ni
      vistas protegidas; encender el servidor y pulsar "Reintentar" devuelve al jugador
      dentro (RF-5, RF-9). Vincular una cuenta LoL con un Riot ID inexistente muestra
      "Jugador no encontrado.".
- [ ] Con dos pestañas con sesión iniciada y la segunda en Configuración, cerrar sesión en
      la primera lleva la segunda a login sin datos de la cuenta, con el aviso "Se cerró o
      cambió la sesión en otra pestaña." (no "Tu sesión expiró. Vuelve a entrar.") y una sola
      entrada de login en su historial; al entrar de nuevo en la segunda vuelve a
      Configuración. Repetir iniciando sesión con otra cuenta en una pestaña produce lo mismo
      en la otra. Con la segunda pestaña en login, el cambio no muestra aviso (RF-8, RF-24).
- [ ] Con el servidor real, bloqueando en las herramientas del navegador solo la petición de
      inicio de sesión y registrando un jugador nuevo, el jugador llega a login con el
      correo escrito y "Tu cuenta se creó; inicia sesión", sin ruta de origen (RF-4).
- [ ] Con sesión cerrada, abrir directamente la dirección de Configuración lleva a login
      sin aviso y, al entrar, vuelve a Configuración (RF-25, RF-8).
- [ ] Cada caso de la lista de RF-10 que la interfaz puede provocar se reproduce desde la
      interfaz en modo simulado y con el servidor real con el mismo resultado visible y,
      cuando la spec lo fija, el mismo mensaje; los demás casos se comprueban revisando el
      backend simulado frente a la spec citada en cada punto. El resultado de cada caso, y
      cómo se comprobó, queda en el registro de validación.
- [ ] Una búsqueda en el código de la interfaz, sin distinguir mayúsculas, no encuentra
      `tmu.token`, `Authorization`, `Bearer`, `r6.tracker`, la palabra `verificado` (que
      incluye "rango verificado" y "Verificado") ni `dangerouslySetInnerHTML`; cada texto
      que califica una cuenta usa "verificada" o "sin verificar" (RF-16).
- [ ] Una biografía o un título con etiquetas HTML (ej. `<b>x</b>`) se muestran como texto
      literal (RNF-2).
- [ ] El archivo de ejemplo de variables de la interfaz existe y no tiene valores secretos, y
      una búsqueda en la construcción de la interfaz no encuentra el valor de ninguna clave
      de fuente configurada en el servidor (RF-13, RNF-5).
- [ ] Con el modo simulado activado y el servidor apagado, entrar con la cuenta demo y
      recorrer perfil, Configuración, coincidencias y agenda no produce ninguna petición al
      servidor en la pestaña de red ni ningún mensaje de error.
- [ ] Con dos pestañas con sesión iniciada, iniciar sesión con otra cuenta en la primera
      lleva la segunda a login (RF-24); después, el almacenamiento del navegador conserva el
      comprobante recibido por la primera y guardar la disponibilidad en la primera responde
      sin 401 (D1). Que RF-5 y RF-7 no borran un comprobante ya reemplazado por otra pestaña
      se comprueba revisando el código del cliente, y el resultado queda en el registro de
      validación.
- [ ] Con dos pestañas con sesión iniciada en Configuración, borrar la cookie y guardar la
      disponibilidad en la primera la lleva a login con "Tu sesión expiró. Vuelve a
      entrar."; la segunda sigue en Configuración sin aviso hasta que guarda la
      disponibilidad, y entonces va a login con ese mismo aviso, no con el de RF-24 (D2).
- [ ] Con el modo simulado, en perfil, Configuración y coincidencias ninguna cuenta de LoL ni
      de R6 aparece como verificada, ninguna cuenta de R6 muestra rango, historial ni
      partidas (aparece el Mensaje de R6), la fuente de toda cuenta, semilla o vinculada, se
      muestra como "Datos de demostración", ningún texto nombra Steam como fuente (la
      etiqueta del identificador "SteamID64" sí aparece y no cuenta, P15) y solo pueden
      aparecer como verificadas cuentas semilla de CS2 (RF-10 puntos 6 y 7, RF-21, D11).
- [ ] Una revisión de los datos semilla del modo simulado no encuentra el nombre ni el
      apellido de ningún integrante de `AGENTS.md`, Equipo, ni los nombres de usuario
      `vicho`, `cotito`, `dayala`, `sebav`, `benjae` ni `marzam` (RF-27).
- [ ] Ningún texto visible de la interfaz dice que el rango se lee de forma periódica,
      automática o "cuando cambia"; Configuración, la página de entrada y la pantalla de
      acceso dicen que el rango se vuelve a leer al pulsar "Resincronizar", el botón de
      relectura de una cuenta LoL o CS2 se rotula "Resincronizar", y una búsqueda en el
      código de la interfaz no encuentra el texto "Volver a leer el rango" (RF-26, D10).
- [ ] Con una limitación de red personalizada de 40 segundos de latencia en las
      herramientas del navegador, pulsar "Resincronizar" en una cuenta LoL muestra la
      operación en curso y, a los 30 segundos, desbloquea el botón y muestra "No se pudo
      conectar con el servidor. Inténtalo de nuevo." sin llevar a login (RF-20).
- [ ] Con sesión cerrada y con sesión iniciada, abrir una dirección inexistente muestra la
      vista "no encontrada" sin pasar por login (RF-28); con el servidor apagado y el modo
      simulado desactivado, abrir la página de entrada muestra la pantalla de error con
      "Reintentar" en su lugar (RF-5, D8).

## Decisiones de clarificación
- P1 — decisión del usuario: la spec se mantiene entera y no se aprueba ni se planifica
  hasta que se aprueben las specs 004 y 005, cuyos autores las están trabajando. Lo que
  depende de ellas remite a su versión aprobada. Quedó en "Depende de". Ampliada por D4.
- P2 — decisión del usuario: registro correcto e inicio fallido → login con el correo
  escrito y "Tu cuenta se creó; inicia sesión". Quedó en RF-4.
- P3 — decisión del usuario: un cambio de sesión en otra pestaña limpia la sesión del
  cliente y lleva a login. Quedó en RF-24 y en la definición correspondiente.
- P4 — decisión del usuario: texto único "No se pudo conectar con el servidor. Inténtalo de
  nuevo." para los errores sin mensaje. Quedó en Definiciones y RF-9.
- P5 — decisión del usuario: fallo de red o 5xx en la consulta de sesión → pantalla de
  error con "Reintentar", sin login ni vistas protegidas. Quedó en RF-5.
- P6 — decisión del usuario: tras RF-7, login muestra "Tu sesión expiró. Vuelve a
  entrar.". Quedó en RF-7.
- P7 — decisión del usuario: en modo simulado el rango puede inventarse, pero la fuente se
  muestra como "Datos de demostración". Quedó en RF-21 (y RF-10, RF-15).
- P8 — decisión del usuario: la página de entrada lleva solo el aviso actual del pie, en
  los dos modos; RF-11 solo afecta a la etiqueta de la app y a la pista de la cuenta demo.
  Quedó en RF-11 y RF-22.
- P9 — decisión del usuario: sin rango vigente o sin partidas, la tasa de victorias muestra
  "Sin datos". Quedó en RF-14. La mención de la tendencia se retiró por D13.
- P10 — decisión del usuario: los filtros sin efecto se muestran deshabilitados con una
  nota breve. Quedó en RF-12 y RF-23.
- P11 — decisión del usuario: los datos sin guardar se pierden al ir a login por un 401;
  limitación declarada. Quedó en Casos límite y Fuera de alcance.
- P12 — decisión del usuario: cuando RF-24 lleva a login por un cambio de sesión en otra
  pestaña, se recuerda la ruta de origen con las reglas de RF-8 y login muestra un aviso
  propio, distinto del de RF-7: "Se cerró o cambió la sesión en otra pestaña.". Quedó en
  RF-8, RF-24, Casos límite y Criterios de finalización.
- RF-5 (mensaje de la pantalla de error al cargar) — decisión del usuario: muestra el
  mensaje según RF-9, el del servidor si lo trae y, si no, "No se pudo conectar con el
  servidor. Inténtalo de nuevo.". Deducción confirmada por el usuario; quedó en RF-5.
- RF-17 (vuelta de Steam a Configuración en la interfaz) y RF-19 (el modo simulado no
  guarda credencial): deducciones confirmadas por el usuario.
- Cambio de sesión en otra pestaña (RF-24) y 401 en esta (RF-7) casi a la vez — decisión
  del usuario: solo se aplica lo que llega primero y se muestra un único aviso. Deducción
  confirmada por el usuario; quedó en Casos límite.
- D1 — decisión del usuario: limpiar la sesión del cliente borra el comprobante solo si
  sigue siendo el que usaba esta pestaña; la pestaña que reacciona por RF-24 nunca lo
  borra. Quedó en Definiciones (comprobante de esta pestaña y limpiar la sesión del
  cliente), RF-24, Casos límite y Criterios de finalización.
- D2 — decisión del usuario: RF-24 no se activa con las limpiezas por RF-5 o RF-7; solo
  cerrar o iniciar sesión cuentan como cambio, y las demás pestañas lo descubren en su
  siguiente petición, con el 401 y el aviso de RF-7. Quedó en Definiciones (cambio de
  sesión en otra pestaña), RF-24, Casos límite y Criterios de finalización.
- D3 — decisión del usuario: los datos semilla del modo simulado siguen las reglas del
  servidor (LoL y R6 sin verificar; R6 sin rango, historial ni partidas; CS2 puede estar
  verificada) y la fuente de toda cuenta del modo simulado, semilla o vinculada, se
  muestra como "Datos de demostración". Quedó en RF-10 (puntos 6 y 7), RF-21, Casos límite
  y Criterios de finalización.
- D4 — decisión del usuario: la condición previa de P1 pasa a ser que las specs 001 a 006
  estén aprobadas antes de aprobar y planificar esta spec. Quedó en "Depende de".
- D5 — decisión del usuario: la vista "no encontrada" es pública, accesible sin sesión.
  Quedó en Definiciones (rutas públicas), RF-28, Casos límite y Criterios de finalización.
- D6 — decisión del usuario: el cliente espera como máximo 30 segundos al vincular y
  resincronizar; pasado ese tiempo desbloquea el botón y muestra el Texto de error sin
  mensaje. Quedó en RF-20, Casos límite y Criterios de finalización.
- D7 — decisión del usuario: los textos que prometen una relectura automática se
  sustituyen por uno que dice que el rango se vuelve a leer al pulsar "Resincronizar".
  Quedó en RF-26 y Criterios de finalización.
- D8 — decisión del usuario: la pantalla de error de RF-5 sustituye cualquier ruta,
  incluida la página de entrada. Quedó en RF-5, RF-28, Casos límite y Criterios de
  finalización.
- D9 — decisión del usuario: los nombres reales del equipo en los datos semilla del modo
  simulado se sustituyen por nombres ficticios. Quedó en RF-27 y Criterios de finalización.
- D10 — decisión del usuario: el botón que hoy dice "Volver a leer el rango" se renombra
  "Resincronizar", y RF-26 nombra ese botón. Quedó en RF-26 y Criterios de finalización.
- D11 — decisión del usuario (confirma la lectura de RF-21 y D3): en modo simulado Steam
  también aparece como "Datos de demostración" y la verificación de CS2 solo existe en las
  cuentas semilla. Quedó en RF-21 y Criterios de finalización.
- D12 — decisión del usuario (confirma la lectura de RF-20 y D6): que el servidor termine
  después de los 30 segundos queda como caso límite, sin volver a pedir las cuentas de
  forma automática. Quedó en RF-20 y Casos límite.
- D13 — decisión del usuario: se corrige RF-14; deja de mencionar la tendencia y el perfil
  muestra solo la tasa de victorias. Quedó en RF-14, P9, Casos límite y Criterios de
  finalización.
- Deducciones de la segunda vuelta — confirmadas por el usuario: definición de "Error sin
  mensaje" (un 401 se trata siempre por su código); RF-4 prevalece sobre RF-9; RF-5 trata
  cualquier código distinto de 200 y 401 como un 5xx; RF-15 asigna las columnas de la tabla
  de la 004 y usa en modo simulado "Datos de demostración" en la pista del formulario y las
  fuentes reales en la página de entrada; RF-17 retira de la dirección los datos de la
  vuelta desde Steam; RF-24 en la pantalla de error; RF-25; RNF-6 (manda la copia del
  dominio del servidor); descarte de respuestas tardías (definición de limpiar la sesión del
  cliente); validación de RF-4 bloqueando la petición en el navegador y de los casos de
  RF-10 no provocables revisando el backend simulado; criterio de coincidencias con A y B
  con cuenta LoL con rango.
- Pasada de la spec 008 (informe QA final): solo se tocó lo que la 008 necesita. No se
  tocaron el 401 tardío tras 30 segundos, las peticiones sin respuesta en general ni los
  criterios que faltan para RF-1, RF-18, el "Sin rango" de RF-14, RNF-1 y RNF-6.
- P13 — decisión del usuario: opción recomendada aplicada por delegación. En R6, el bloque
  "Posición en la escala del juego" muestra solo el Mensaje de R6, sin número de lecturas
  ni primera lectura; en LoL o CS2 sin rango vigente, la escala muestra "Sin rango" sin
  posición vigente y, si hay historial, el número real de lecturas y la primera lectura.
  Quedó en RF-12, RF-14, Casos límite y Criterios de finalización.
- P14 — decisión del usuario: opción recomendada aplicada por delegación. El campo "Fuente"
  de la fila de una cuenta nombra la fuente de la columna "Rango" (en CS2, FACEIT, no
  Steam) y, en R6 con el servidor real, no se muestra. Quedó en RF-15, Casos límite y
  Criterios de finalización.
- P15 — decisión del usuario: opción recomendada aplicada por delegación. Las etiquetas del
  identificador ("Riot ID", "Ubisoft ID", "SteamID64") no nombran una fuente, en los dos
  modos; "SteamID64" se muestra también en modo simulado. Quedó en RF-15, RF-21, Casos
  límite y Criterios de finalización.
- P16 — decisión del usuario: opción recomendada aplicada por delegación. Se define
  "usuario de la sesión" (el de la consulta de sesión con 200 o del último inicio
  correcto en esta pestaña, hasta limpiar la sesión del cliente). Quedó en Definiciones.
- P17 — decisión del usuario: opción recomendada aplicada por delegación. Un candidato de
  LoL o CS2 sin distancia se presenta con "Sin datos" en lugar de "Δ <n> pts" y "Sin
  rango" en su rango; si aparece y con qué puntaje lo fija la spec 005. Quedó en RF-14,
  Casos límite y Criterios de finalización.
- P18 — decisión del usuario: opción recomendada aplicada por delegación. El "Proponer"
  de coincidencias usa la misma regla que la ficha (primer bloque proponible, duración
  hasta el final de su tramo entre 1 y 4, título) y se deshabilita con los motivos 3 a 6
  de la spec 008 cuando no hay bloque proponible. Quedó en RF-29, Casos límite y
  Criterios de finalización.
- P19 — decisión del usuario: opción recomendada aplicada por delegación. La agenda trata
  igual toda propuesta, venga de coincidencias o de la ficha (incluido no abrir el
  formulario sin cuenta en el juego, spec 008, RF-21). Quedó en RF-30 y Casos límite.
- P20 — decisión del usuario: opción recomendada aplicada por delegación. Con las cuentas
  propias cargando, la agenda espera para abrir el formulario; si fallan, muestra el error
  y descarta la propuesta. Quedó en RF-30, Casos límite y Criterios de finalización.
- P21 — decisión del usuario: opción recomendada aplicada por delegación. La propuesta se
  usa una sola vez: recargar, "Atrás" o "Adelante" a la entrada que la trajo no reabren el
  formulario. Quedó en RF-30, Casos límite y Criterios de finalización.
- P22 — decisión del usuario. La diferencia "▲ +<n> pts desde la primera lectura" que la
  escala del perfil muestra en las cuentas con rango vigente no cuenta como la tendencia
  retirada por D13 y se mantiene, porque es la diferencia real con la primera lectura del
  historial. En LoL o CS2 sin rango vigente sigue rigiendo P13 (sin posición vigente ni
  diferencia). Quedó en RF-14.

## Dudas abiertas
- Dependencia externa (no la resuelve el usuario de esta spec): aprobación de las specs 001
  a 006 por sus autores. Bloquea la aprobación y el plan de esta spec (P1 y D4).
