# Spec 007 — Conectar la interfaz al servidor real
Estado: implementada (2026-10-19; T1–T31 hechas, recorrido manual T29 en `validation.md`). Aprobada el 2026-10-18.
Alineación posterior a la implementación de las specs 004 y 005 (2026-10-19, aprobada por el
usuario; commits `9b5cc87` y `88af4cd`): solo cambia RF-10 (puntos 4, 5 y 10, y puntos nuevos
12 y 13), para que los textos que imita el modo simulado coincidan con los de las specs 004
(DP-6) y 005 (DP5-17), en minúscula inicial y sin punto final, y para que la credencial de un
usuario eliminado dé 401 «token inválido» (spec 004, RF-44; spec 005, RF-13). La Etiqueta de
datos simulados que el criterio de finalización pendiente de la spec 005 y el RF-37 de la 004
delegan en esta spec ya está en RF-11, RF-22 y en los criterios «Coincidencias» y «Etiqueta de
datos simulados» (R19), con el servidor real y en modo simulado: no se añade ningún RF. El
resto de la spec no cambia.
Ajustes menores del 2026-10-19, con aprobación expresa del usuario (decisiones R21 y R22):
(1) el literal del servidor «rango verificado» del error del filtro de verificadas lo
reproduce el modo simulado y la interfaz nunca lo muestra: excepción al RF-16 aprobada por el
usuario (RF-10 punto 12, RF-16 y R14); (2) el texto del 401 del inicio de sesión pasa a
«correo o contraseña incorrectos» (minúscula, sin punto final), como en la spec 002, RF-9 y en
el backend (caso límite de las credenciales incorrectas); (3) el estado de «Depende de» se
actualiza (004 y 005 implementadas el 2026-10-19). No cambia ningún otro requisito.

## Contexto y objetivo
Las vistas del Hito 1 funcionan contra un backend simulado en el navegador. El cliente HTTP
que existe nunca se ejecutó y asume otro esquema de sesión: guarda el JWT en un
almacenamiento del navegador legible desde la página y lo envía en una cabecera, lo que es
vulnerable a XSS y choca con el principio 5 de la constitución. El backend simulado del
navegador hace lo mismo (deuda registrada en `MEMORY.md`, que nombra a los dos).

Esta spec hace que la interfaz use por defecto el servidor de las specs 001 a 006, con el
esquema de sesión de la spec 002, que vuelva a login cuando no hay sesión y que las vistas
existentes funcionen de punta a punta. También adapta la interfaz a la spec 004 vigente
(aprobada el 2026-10-17): los tres juegos (LoL, R6 y CS2) tienen rango, historial y partidas
que entrega un proveedor simulado y determinista, en todos los entornos y sin ninguna fuente
externa; "cuenta verificada" es una marca que fija ese proveedor por identificador (spec
004, RF-41), no una comprobación de propiedad; y toda cuenta lleva la marca de datos
simulados (spec 004, RF-37), que la interfaz debe mostrar también con el servidor real.
Adapta además la vista de coincidencias a la spec 005 vigente: en los tres juegos hay
distancia de rango y los filtros funcionan, porque toda cuenta tiene rango.

El servidor no tiene datos de demostración precargados: la base empieza vacía y el equipo se
registra y vincula cuentas para demostrar coincidencias (decisión del usuario). El rango, el
historial, las partidas y la marca de verificada de esas cuentas son igualmente simulados y se
etiquetan como tales (spec 004, RNF-2). El backend simulado del navegador queda solo como
herramienta de desarrollo de la interfaz, con sus datos de demostración precargados
etiquetados como tales.

- Depende de: specs 001 a 006. Estado al 2026-10-19: 001 a 003 implementadas y validadas;
  004 y 005 implementadas (2026-10-19); 006 aprobada (2026-10-18). La condición previa que esta
  spec fijaba (aprobar las 001 a 006 antes de aprobar y planificar la 007) se cumple. Esta
  spec se revisó el 2026-10-18 contra las versiones vigentes de la 004 y la 005; quedó
  alineada con ellas y retiró lo que citaba requisitos que ya no existen. Si cualquiera de
  esas specs cambia algo que esta cita, se revisa esta spec antes de seguir.
- Origen: HU-01 (sesión iniciada y llegada a inicio), HU-03, HU-04 y HU-05 (parte de la
  interfaz); RF-22 y RF-23 de la spec original (`specs/_referencia/001-crear-backend-original.md`).
- Las decisiones técnicas de la referencia (cliente, backend simulado, rutas, variables de la
  interfaz y reglas de dominio) pasan al `plan.md` de esta spec, **salvo** todo lo que
  concierne a fuentes reales de rango, claves o verificación con Steam, que la spec 004
  revocó. De la sección 6 de la referencia pasan los puntos 1 a 3 y 5 a 8, y del punto 4
  solo el cambio de lo que devuelven el inicio de sesión y el registro; las operaciones
  nuevas del punto 4 son de las specs 008 y 009.
- Prevalece sobre la referencia: la spec 004 (todo simulado; "mantener las formas de los
  tipos" de la sección 10 cede ante los campos nuevos de la 004 y la 005: marca de datos
  simulados, candidato sin correo, cuenta sin partidas).
- La tarea T15 de la referencia (cargar datos de demostración en la base) queda sin efecto.
  Esta spec no crea ni elimina ningún comando que cargue datos de demostración en el
  servidor (ver "Fuera de alcance").
- Organización: los requisitos se agrupan en tres bloques que pueden separarse en specs
  distintas sin renumerarse: **Sesión y conexión** (RF-1 a RF-10, RF-19, RF-20, RF-24, RF-25,
  RF-28, RF-33), **Datos simulados y presentación** (RF-11 a RF-16, RF-18, RF-21 a RF-23,
  RF-26, RF-27, RF-31, RF-32) y **Proponer sesión** (RF-29, RF-30). Decisión del usuario
  (2026-10-18): la spec se mantiene entera, sin dividirse; su plan tendrá más de 10 tareas
  por esa decisión (R20).

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
- HU-5. Como jugador, quiero ver con claridad qué datos son simulados (rango, historial,
  partidas, verificación, distancia y puntaje), para no confundirlos con datos reales.
- HU-6. Como jugador de cualquiera de los tres juegos, quiero resincronizar mi cuenta y ver
  el rango y las partidas actualizados.

(HU-5 y HU-6 sustituyen a las anteriores, "verificar con Steam" y "entender por qué R6 no
muestra rango", que dejaron de existir con la spec 004 vigente.)

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
  en esta pestaña (RF-3, RF-4, RF-8), hasta que se limpia la sesión del cliente. Mientras la
  consulta de sesión no ha respondido, no hay usuario de la sesión (decisión del usuario,
  P16).
- **Comprobante de esta pestaña**: el último comprobante anti-CSRF que esta pestaña guardó
  al iniciar sesión o leyó del almacenamiento para enviarlo en una petición.
- **Limpiar la sesión del cliente**: olvidar al usuario de la sesión; descartar todos los
  datos del servidor que la aplicación guarda en memoria; cancelar las peticiones en vuelo
  y los reintentos pendientes (si una respuesta llega de todos modos, se descarta al llegar
  y no vuelve a poner datos en memoria; HU-3); y borrar el comprobante anti-CSRF guardado
  solo si sigue siendo el comprobante de esta pestaña (si otra pestaña ya lo reemplazó o lo
  borró, no lo toca). Cuando la limpieza la provoca RF-24, nunca borra el comprobante
  (decisión del usuario, D1). No borra la preferencia de tema del dispositivo ni los datos
  que guarda el modo simulado, que hacen de servidor.
- **Llevar a una ruta por una regla de sesión** (RF-4, RF-6, RF-7, RF-8, RF-24, RF-25 y
  RF-33): reemplaza la entrada actual del historial del navegador en vez de añadir una, de
  modo que "Atrás" no deja al jugador en una vista que acaba de descartarse y el historial
  nunca acumula más de una entrada de login por redirección.
- **Ruta de origen**: la ruta, sin parámetros de consulta, de la vista protegida que el
  jugador estaba viendo o pidió abrir cuando se le envió a login por RF-7, RF-24 o RF-25.
  Si llegan varios 401 a la vez, es la vista que estaba en pantalla al recibir el primero.
- **Error con mensaje**: respuesta no exitosa cuyo cuerpo es JSON con el campo de error de
  la spec 001 (RF-7) como texto no vacío. **Error sin mensaje**: cualquier otro fallo de una
  petición: fallo de red, petición interrumpida, sin respuesta en 30 segundos (RF-20),
  cuerpo que no es JSON (por ejemplo, HTML del entorno de desarrollo con el servidor
  apagado), JSON sin el campo de error o con un valor que no es texto, y cualquier código
  4xx o 5xx con cuerpo vacío o de otra forma. Un 401 nunca es un error sin mensaje: se
  trata por su código (RF-5, RF-7 o, en el inicio de sesión, RF-9), traiga o no cuerpo
  legible (spec 002, RF-9 a RF-12).
- **Texto de error sin mensaje**: "No se pudo conectar con el servidor. Inténtalo de nuevo."
- **Datos simulados**: el rango, el historial, las partidas y la marca de verificada que
  produce el proveedor simulado de la spec 004 para cualquier cuenta, incluidas las que el
  equipo vincula con identificadores reales, y la distancia de rango y el puntaje de las
  coincidencias que se calculan con ellos (spec 005). **Datos de demostración
  precargados**: usuarios, cuentas o sesiones cargados de antemano; solo los tiene el modo
  simulado. No son lo mismo (spec 004, Definiciones).
- **Marca de datos simulados**: la que trae toda cuenta del servidor (spec 004, RF-37).
  **Etiqueta de datos simulados**: el texto visible con que la interfaz muestra esa marca.
  Su texto es siempre «Datos de demostración», el mismo en las etiquetas por dato y en el
  aviso global (barra de navegación y pie), con el servidor real y en modo simulado (decisión
  del usuario, 2026-10-18; R19). Es un solo concepto y un solo texto: con el servidor real
  no hay datos de demostración precargados, pero el texto sigue siendo el mismo porque
  nombra la marca de datos simulados, no su origen.
- **Cuenta verificada**: la definida en la spec 004 (RF-41): marca fijada por el proveedor
  simulado según el juego y el identificador; no demuestra que la cuenta sea de quien la
  vinculó. Es un dato simulado.
- **Cambio de sesión en otra pestaña**: otra pestaña de la misma aplicación, en el mismo
  navegador, cierra sesión (RF-6, también cuando falla el aviso al servidor) o inicia
  sesión (con la misma cuenta o con otra). Que otra pestaña limpie su sesión del cliente
  por RF-5 o RF-7 no es un cambio de sesión: las demás pestañas lo descubren en su
  siguiente petición protegida, que recibe 401 y aplica RF-7 (decisión del usuario, D2).
  Como la cookie de la credencial es una por navegador (spec 002, RF-8), iniciar sesión en
  una pestaña sustituye la sesión de todas las demás.

## Requisitos funcionales

### Sesión y conexión
- RF-1: EL SISTEMA usa el servidor real por defecto y solo usa el modo simulado cuando la
  variable de configuración del modo simulado vale `true` una vez quitados los espacios de
  los extremos; cualquier otro valor (`TRUE`, `1`, vacío), su ausencia, o la ausencia de la
  dirección del servidor no lo activan (se usa el servidor real en su dirección por
  defecto). El modo se fija al construir o arrancar la interfaz (referencia, sección 6
  punto 1).
- RF-2: EL SISTEMA no guarda la credencial de sesión en ningún almacenamiento del navegador
  accesible desde el código de la página, y el código de la página nunca la lee ni la
  envía; solo viaja en la cookie que el navegador adjunta (spec 002, definición;
  constitución, principio 5). Es comprobable con las herramientas del navegador: tras
  iniciar sesión, ningún almacenamiento ni petición saliente construida por la página
  contiene la credencial.
- RF-3: CUANDO el inicio de sesión tiene éxito, EL SISTEMA guarda el comprobante anti-CSRF
  recibido, reemplazando cualquier comprobante anterior, y lo envía junto con las cookies
  en todas las peticiones posteriores al servidor, públicas o protegidas, siempre que exista
  uno guardado (spec 002, definición; el cierre de sesión lo envía si lo hay, pero el
  servidor no lo exige, spec 002, P4). SI el almacenamiento del navegador no está
  disponible (modo privado o bloqueado), ENTONCES EL SISTEMA conserva el comprobante solo
  en esta pestaña: la sesión funciona hasta recargar; al recargar queda sin sesión (RF-5) y
  no hay aviso entre pestañas (RF-24), de modo que otra pestaña lo descubre por un 401
  (RF-7).
- RF-4: CUANDO el registro tiene éxito, EL SISTEMA inicia sesión con las mismas credenciales
  y, si el inicio tiene éxito, lleva al jugador a Inicio aunque existiera una ruta de origen
  (referencia, HU-01; spec 002, caso límite "el registro no inicia sesión por sí solo"); SI
  ese inicio de sesión falla por cualquier motivo (error sin mensaje, 5xx o 401), ENTONCES
  EL SISTEMA lleva al jugador a login con el correo ya escrito y el aviso "Tu cuenta se
  creó; inicia sesión", sin ruta de origen (decisión del usuario, P2). A ese inicio de
  sesión no se le aplica RF-9 aunque el servidor traiga un mensaje.
- RF-5: CUANDO la aplicación se carga o se recarga, EL SISTEMA hace la consulta de sesión.
  MIENTRAS esa consulta está en curso, muestra solo el texto "Cargando…" en lugar de la ruta
  pedida (sea pública o protegida), sin mostrar login, ninguna vista protegida ni la
  pantalla de error, y no hace ninguna otra petición protegida. Si responde 200, mantiene al
  jugador dentro; si responde 401, limpia la sesión del cliente y lo trata como sin sesión,
  sin aplicar RF-7 ni mostrar un error (referencia, sección 6 punto 5). SI la consulta falla
  con un error sin mensaje (incluido no recibir respuesta en 30 segundos, RF-20) o un 5xx,
  ENTONCES EL SISTEMA muestra una pantalla de error con el mensaje según RF-9 y el botón
  "Reintentar" en lugar de la ruta pedida, sea cual sea (incluidas la página de entrada y la
  vista "no encontrada"), sin mostrar login ni ninguna otra vista (decisión del usuario, P5
  y D8). "Reintentar" repite la consulta, sin límite de intentos, muestra "Cargando…" y
  aplica de nuevo este requisito a su resultado. Cualquier respuesta distinta de 200 y 401
  (400, 403, 404, 429…) sigue la rama del 5xx, porque la spec 002 (RF-10 a RF-13) solo
  prevé esas dos.
- RF-6: CUANDO el jugador cierra sesión, EL SISTEMA avisa al servidor, limpia la sesión del
  cliente (lo que cancela cualquier petición en vuelo) y lleva a login; SI el aviso falla,
  ENTONCES EL SISTEMA limpia igual la sesión del cliente y lleva a login, porque sin el
  comprobante toda operación protegida responde 401 (spec 002, RF-11).
- RF-7: SI una operación protegida distinta de la consulta de sesión recibe 401 mientras el
  cliente tiene un usuario de sesión, ENTONCES EL SISTEMA limpia la sesión del cliente y
  lleva a login, recordando la ruta de origen, sin recargar la página y con una sola
  entrada de login en el historial por muchos 401 que lleguen, y login muestra el aviso fijo
  "Tu sesión expiró. Vuelve a entrar." (referencia, HU-05 y sección 6 punto 7; decisión del
  usuario, P6). SI el 401 llega sin usuario de sesión (la sesión ya se limpió por otro
  motivo), ENTONCES EL SISTEMA aplica RF-25 (login sin aviso). No se aplica al 401 del
  inicio de sesión por credenciales incorrectas (spec 002, RF-9), que se muestra según
  RF-9. La llegada sin sesión a una ruta protegida, sin un 401 previo, la cubre RF-25.
- RF-8: CUANDO el jugador inicia sesión desde login, EL SISTEMA lo lleva a la ruta de origen
  si existe y, si no, a Inicio (referencia, HU-01). Hay ruta de origen cuando llegó a login
  por RF-7, RF-24 o RF-25. Pasar de login a registro descarta la ruta de origen (RF-4).
- RF-9: SI el servidor responde un error con mensaje, ENTONCES EL SISTEMA muestra el mensaje
  tal como llega (referencia, sección 6 punto 8); SI ocurre un error sin mensaje, ENTONCES
  EL SISTEMA muestra el Texto de error sin mensaje (decisión del usuario, P4), no lo trata
  como 401 y no limpia la sesión del cliente.
- RF-10: MIENTRAS está activo el modo simulado, EL SISTEMA responde como el servidor
  (specs 002 a 006) en todo lo que la interfaz puede provocar o mostrar, incluidos los
  mensajes que esas specs fijan de forma literal. Como mínimo:
  1. Correo o nombre de usuario ya registrados: 400, no 409 (spec 002, RF-3).
  2. Registrar no inicia sesión por sí solo (spec 002, caso límite).
  3. Identificador de cuenta que no cumple el patrón del juego: 400 con el mensaje de la
     spec 004, RF-6 (no 422).
  4. Segunda cuenta en el mismo juego: 400 con "ya tienes una cuenta vinculada en este
     juego" (spec 004, RF-5), no 409.
  5. Desvincular o resincronizar una cuenta ajena: 403 con "no tienes permiso para esta
     operación" (spec 004, RF-11); una inexistente, 404 "cuenta no encontrada".
  6. Ninguna operación de la spec 004 responde 409 (spec 004, casos límite): R6 se vincula
     y se resincroniza como los demás juegos.
  7. Ningún candidato de coincidencias trae correo (spec 005, RF-3 y RNF-2).
  8. Salir de una sesión sin estar inscrito: 409 con "no estás inscrito en esta sesión"
     (spec 006, RF-17), no 200.
  9. Actualizar el perfil: guarda el color de avatar, y nombre visible vacío o solo con
     espacios, zona horaria no IANA, nombre visible de más de 40, biografía de más de 200
     o color sin la forma `#RRGGBB` responden 400 sin guardar nada (spec 003, RF-7, RF-8,
     RF-15 y RF-16).
  10. El 401 sin sesión usa "sesión no iniciada" (spec 002, RF-10) y provoca RF-7 igual que
      con el servidor real. Con el comprobante ausente o distinto, y con la credencial de un
      usuario que ya no existe, el 401 usa "token inválido" (spec 002, RF-11 y RF-22; spec
      004, RF-44; spec 005, RF-13), nunca "sesión no iniciada".
  11. Rango, historial, partidas, marca de verificada y marca de datos simulados: los fija
      RF-21.
  12. Coincidencias (spec 005): los errores con sus textos exactos. Juego ausente, vacío,
      repetido o que no es `lol`, `r6` ni `cs2`: 400 "juego no válido" (RF-5). Usuario de
      la sesión sin cuenta en el juego: 404 "no tienes una cuenta vinculada en este juego"
      (RF-6). Distancia máxima no válida: 400 "filtro «Diferencia máxima de rango» no
      válido: usa un número entero de 0 a 100" (RF-12). Mínimo de horas no válido: 400
      "filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168"
      (RF-12). Solo verificadas no válido: 400 "filtro «Solo cuentas con rango verificado»
      no válido: usa true o false" (RF-14). Búsqueda repetida: 400 "filtro «Buscar
      jugador» no válido" (RF-15). La interfaz solo envía filtros válidos, así que estos
      textos solo salen de una llamada directa al backend simulado. El del filtro de
      verificadas conserva «rango verificado» porque es el del servidor (R14). Decisión
      APROBADA por el usuario el 2026-10-19 (R21): es una excepción al RF-16; el modo
      simulado reproduce ese literal del servidor y la interfaz nunca lo muestra, de modo que
      no cuenta como texto visible a efectos de RF-16.
  13. Forma de los textos de error de las specs 004 y 005 que reproduce el modo simulado:
      minúscula inicial y sin punto final (spec 004, DP-6; spec 005, DP5-17). Conservan su
      forma las siglas y formatos «Riot ID», «Ubisoft ID» y «SteamID64», los rótulos de la
      interfaz entre « » (con su mayúscula inicial) y los valores `true` y `false`.
  La lista no exige que la interfaz pueda provocar todos los casos. Desde la interfaz se
  pueden provocar o ver los puntos 1, 4 (si se fuerza), 9 (solo nombre visible vacío, con
  espacios o de más de 40), 10 (borrando el comprobante) y 11; los demás se comprueban
  revisando el backend simulado frente a la spec citada.
- RF-19: MIENTRAS está activo el modo simulado, EL SISTEMA tampoco guarda en el navegador
  ningún valor que haga de credencial de sesión; de la sesión solo guarda el comprobante
  anti-CSRF, como con el servidor real (`MEMORY.md`, deuda conocida; referencia, sección 6
  puntos 1 y 6). Un comprobante guardado por una construcción de otro modo no identifica una
  sesión: la consulta de sesión del modo actual decide (RF-5).
- RF-20: EL SISTEMA da por fallida toda petición al servidor que no recibe respuesta en 30
  segundos desde que se envió: deja de esperarla, la trata como error sin mensaje (muestra
  el Texto de error sin mensaje), sin limpiar la sesión del cliente (RF-9), y si la
  respuesta llega después no la muestra ni la aplica (un 401 tardío tampoco; la siguiente
  operación protegida lo descubrirá según RF-7). MIENTRAS una operación de escritura iniciada
  por el jugador está en curso (registro, login, cierre de sesión, vincular, resincronizar,
  desvincular, guardar perfil, guardar disponibilidad, crear, sumarse, salir y cancelar una
  sesión de la agenda), EL SISTEMA deshabilita el botón que la inició y muestra en él
  "Enviando…", y no permite enviarla de nuevo hasta recibir respuesta o hasta que pasen los
  30 segundos; así un doble clic envía una sola petición. Si un 401 llega dentro de los 30
  segundos, se aplica RF-7. Tampoco vuelve a pedir los datos de forma automática por si el
  servidor terminó la operación después (decisión del usuario, D12; ver casos límite).
  Este plazo y este estado de "en curso" valen para las vistas existentes; las vistas
  nuevas los heredan (specs 008 y 009).
- RF-24: CUANDO otra pestaña registra un cambio de sesión, EL SISTEMA limpia la sesión del
  cliente en esta pestaña y lleva a login, recordando la ruta de origen, sin recargar la
  página, y login muestra el aviso fijo "Se cerró o cambió la sesión en otra pestaña.",
  distinto del de RF-7 (decisión del usuario, P3 y P12). Lo hace como máximo 5 segundos
  después del cambio o, si esta pestaña estaba en segundo plano o suspendida, como máximo 5
  segundos después de que vuelve a estar visible. Con tres o más pestañas, todas las demás
  reaccionan. Esa limpieza nunca borra el comprobante anti-CSRF guardado (D1). Si esta
  pestaña ya está en una ruta pública o en la pantalla de error de RF-5, solo limpia la
  sesión del cliente, sin ruta de origen nueva ni aviso; desde la pantalla de error,
  "Reintentar" sigue aplicando RF-5. Solo cerrar e iniciar sesión activan este requisito;
  las limpiezas por RF-5 o RF-7 en otra pestaña no lo activan (decisión del usuario, D2).
- RF-25: MIENTRAS no hay sesión iniciada, CUANDO el jugador abre o recarga una ruta
  protegida, EL SISTEMA no muestra esa vista y lleva a login, recordando esa ruta como ruta
  de origen, sin aviso (referencia, HU-03, HU-05 y sección 12; spec 010, casos límite).
- RF-28: CUANDO se abre una dirección que no corresponde a ninguna vista, EL SISTEMA muestra
  la vista "no encontrada", con o sin sesión, sin llevar a login ni recordar ruta de origen
  (decisión del usuario, D5), salvo que se aplique la pantalla de error de RF-5 (D8), que
  la sustituye mientras la consulta de sesión falla.
- RF-33: MIENTRAS el cliente tiene un usuario de sesión, CUANDO se abre login o registro,
  EL SISTEMA lleva a Inicio sin mostrar el formulario (decisión de la revisión R12).

### Datos simulados y presentación
- RF-11: EL SISTEMA muestra la Etiqueta de datos simulados, con el servidor real y en modo
  simulado, junto al rango, el historial de rango, las partidas y la marca de verificada
  de toda cuenta que lleva la marca de datos simulados (spec 004, RF-37), y junto a la
  distancia de rango y el puntaje de cada candidato de coincidencias cuya cuenta la lleva
  (spec 005, decisión del 2026-10-17), en perfil, Configuración y coincidencias. MIENTRAS
  está activo el modo simulado, toda cuenta, de los datos precargados o vinculada, la lleva.
  La pista de la cuenta demo en login se muestra solo en modo simulado (con el servidor
  real no existe cuenta demo). El texto de la etiqueta es siempre «Datos de demostración»
  (decisión del usuario, 2026-10-18; R19). EL SISTEMA mantiene además el aviso global con
  ese mismo texto en la barra de navegación y en el pie, con el servidor real y en modo
  simulado; no hay un segundo texto («Datos simulados» u otro) en ningún modo.
- RF-12: EL SISTEMA muestra para una cuenta de R6 el rango vigente, el historial de rango, las
  partidas, la tasa de victorias y la distancia de rango igual que para LoL y CS2, con la
  escala de R6 de la spec 004 (Copper a Champion; Champion sin división; puntos como MMR) en
  el bloque "Posición en la escala del juego". (Sustituye al anterior RF-12, "Mensaje de R6",
  retirado por la spec 004.)
- RF-13: EL SISTEMA incluye una plantilla de configuración de la interfaz, versionada y sin
  secretos, con los nombres de sus variables de entorno y con el modo simulado desactivado
  por defecto (RF-1). La plantilla anterior, que activaba el modo simulado al dejar la
  dirección vacía, deja de valer.
- RF-14: EL SISTEMA muestra de cada cuenta de cualquier juego el rango vigente, el historial,
  la tasa de victorias y, en el perfil, la diferencia "▲ +<n> pts desde la primera lectura"
  de la escala (decisión del usuario, P22), sin tendencia (D13): toda cuenta tiene rango y
  al menos una partida (spec 004, RF-4 y RF-36), así que la interfaz no tiene estados
  "Sin rango" ni "R6 sin rango". Defensivo: SI una cuenta llega sin rango vigente o sin
  tasa de victorias (el servidor de la spec 004 no lo produce), ENTONCES EL SISTEMA muestra
  "Sin datos" en lugar de ese valor y nunca una distancia ni un valor calculado con él. (El
  anterior RF-14, "Sin rango" y el caso de candidatos sin rango, queda retirado: la spec 005
  vigente no tiene candidatos sin rango.)
- RF-15: EL SISTEMA no atribuye el rango, el historial, las partidas ni la verificación a
  ninguna fuente real (Riot, Ubisoft, Valve, Steam, FACEIT, Leetify ni otra) en ningún texto
  visible, con el servidor real ni en modo simulado, incluidas la página de entrada, la
  pista del formulario de vinculación y la marquesina (spec 004, RNF-2; spec 005, RNF-3). En
  el lugar donde la fila de una cuenta mostraba "Fuente", muestra la Etiqueta de datos
  simulados (RF-11). Las etiquetas del identificador de cuenta ("Riot ID", "Ubisoft ID",
  "SteamID64") nombran el formato del identificador que pide cada juego, no una fuente, y
  se mantienen en los dos modos (spec 004, RF-6).
- RF-16: EL SISTEMA usa "verificada" para la marca de verificada (spec 004, RF-41), siempre
  referida a la cuenta ("verificada" / "sin verificar"), y la presenta como dato simulado
  (RF-11); no presenta ningún rango como "verificado" en ninguna vista, incluidas Inicio y
  la página de entrada; ningún texto de la interfaz usa la forma masculina "verificado"; el
  filtro de coincidencias se rotula "Solo cuentas verificadas" (ver RF-32 y R14). Única
  excepción, aprobada por el usuario el 2026-10-19 (R21): el literal «rango verificado» del
  error del filtro de verificadas que reproduce el modo simulado (RF-10 punto 12), porque es
  el del servidor y la interfaz nunca lo muestra.
- RF-18: EL SISTEMA ofrece "Resincronizar" en toda cuenta propia de LoL, R6 o CS2, con el
  texto "Al resincronizar, tu rango puede cambiar un escalón y pueden llegar partidas
  nuevas." junto al botón, y no ofrece ninguna acción para verificar una cuenta, cambiar su
  identificador ni editar su región. Tras responder 200, la cuenta, el historial y las
  partidas se muestran actualizados. (Sustituye al anterior RF-18, "no ofrecer resincronizar
  R6 ni verificar", retirado.)
- RF-21: MIENTRAS está activo el modo simulado, EL SISTEMA da a toda cuenta, de los datos
  precargados (incluidas las ya vinculadas de la cuenta demo) o vinculada desde la
  interfaz, lo que la spec 004 exige del proveedor simulado: rango en los tres juegos con la
  escala, las bandas de puntos y la normalización de la spec 004 (DP-2, DP-26, DP-34); entre
  1 y 8 partidas por lectura; la marca de datos simulados; y la marca de verificada fijada
  por el identificador, de modo que los identificadores de ejemplo que fije el plan de la
  spec 004 (dos verificados y dos no por juego) den el mismo resultado que con el servidor,
  y los datos precargados incluyan cuentas verificadas y no verificadas en cada juego.
  Cada resincronización mueve el rango como mucho un escalón y añade una partida nueva
  (spec 004, RF-42). Los valores exactos de rango y partidas no tienen que coincidir con
  los del servidor, salvo la normalización (RNF-6). (Sustituye al anterior RF-21, que fijaba
  "R6 sin rango", "LoL y R6 nunca verificadas" y "Datos de demostración" como fuente.)
- RF-22: EL SISTEMA muestra en el pie de la página de entrada el aviso «Datos de
  demostración» (la Etiqueta de datos simulados, RF-11), tanto con el servidor real como en
  modo simulado, y no nombra ninguna fuente en esa página (RF-15). (Sustituye al texto "Los
  datos que ves son de demostración", decisión del usuario, 2026-10-18; R19.)
- RF-23: EL SISTEMA mantiene habilitados y con efecto, en las coincidencias de los tres
  juegos, el filtro de distancia y el filtro "Solo cuentas verificadas" (spec 005, RF-7 y
  RF-8); no los deshabilita en ningún juego. (Sustituye al anterior RF-23, que los
  deshabilitaba en R6 y LoL, retirado por la spec 005 vigente.)
- RF-26: EL SISTEMA no afirma en ningún texto visible que el rango se vuelve a leer de forma
  automática, periódica o "cuando cambia" (spec 004, DP-24). Los textos que hoy lo prometen
  en Configuración, la página de entrada y la pantalla de acceso de login y registro se
  sustituyen por: El rango se vuelve a leer al pulsar "Resincronizar". (decisión del
  usuario, D7). El botón que hoy se rotula "Volver a leer el rango" pasa a rotularse
  "Resincronizar", en todo lugar donde aparece; ningún texto visible conserva el rótulo
  anterior (D10).
- RF-27: MIENTRAS está activo el modo simulado, EL SISTEMA no usa en los datos precargados
  ninguna palabra de los nombres y apellidos de los integrantes (`AGENTS.md`, Equipo), ni los
  nombres de usuario `vicho`, `cotito`, `dayala`, `sebav`, `benjae` y `marzam`, ni nombres
  de usuario derivados de ellos, en nombres visibles, nombres de usuario, biografías ni
  identificadores de cuenta; la comparación ignora mayúsculas y acentos y busca dentro del
  texto. Si un integrante usa otro apodo, se añade a la lista en el registro de validación.
  Usa nombres ficticios (constitución, principio 5; D9).
- RF-31: EL SISTEMA muestra el historial de rango en el orden en que lo entrega el servidor y
  no supone que la fecha de su último elemento es la del rango vigente (spec 004, DP-36);
  muestra la fecha de la última lectura (fecha de sincronización de la cuenta) como "Última
  lectura".
- RF-32: EL SISTEMA conserva los rótulos "Diferencia máxima de rango", "Horas en común por
  semana" y "Buscar jugador" en la vista de coincidencias, porque los mensajes de error de
  la spec 005 nombran los filtros con ellos (spec 005, RF-12, RF-14 y RF-15). El filtro
  de verificadas se rotula según RF-16.

### Proponer sesión
- RF-29: CUANDO el usuario de la sesión elige "Proponer" en una fila de coincidencias, EL
  SISTEMA lleva a la agenda (RF-30) con el formulario de nueva sesión rellenado con la
  misma regla que la ficha de jugador (spec 008, RF-7): el juego de la coincidencia; el
  día y la hora del primer bloque en común cuya hora está en el horario de la agenda (de
  las 12:00 a las 23:00, más las 00:00 y las 01:00), recorriendo los bloques del lunes al
  domingo y, dentro de un día, por la hora en su orden literal, de las 00:00 a las 23:00;
  como duración, las horas que van desde ese bloque hasta el final de la serie de bloques
  en común seguidos del mismo día que lo contiene, con un mínimo de 1 y un máximo de 4; el
  título "Sesión con <nombre visible del candidato>" (como máximo 51 caracteres, dentro de
  los 60 de la spec 006, RF-6); y los valores por defecto del formulario en cupos y notas.
  Una serie no pasa de un día al siguiente: el domingo 23:00 y el lunes 00:00 forman dos
  series (spec 008, definición de tramo en común). Los bloques se comparan tal como cada
  uno los guardó, sin convertir zonas horarias, aunque la zona del navegador o la del
  perfil sean distintas. SI no hay ningún bloque así, ENTONCES EL SISTEMA muestra "Proponer"
  deshabilitado y, junto a él, el primero que aplique de: "No has marcado tus horas" (el
  usuario de la sesión no tiene disponibilidad), "Este jugador no ha marcado horas", "No
  tienen horas en común" y "Sus horas en común quedan fuera del horario de la agenda (12:00
  a 01:00)"; el botón deshabilitado sigue recibiendo el foco y un lector de pantalla
  anuncia su motivo. Son los motivos 3 a 6 de la spec 008, RF-12, con sus mismos textos; los
  motivos 1 y 2 no aplican, porque un candidato siempre tiene cuenta en el juego consultado
  y el usuario de la sesión también. Elegir el bloque, la duración, el título y el motivo
  son reglas puras del dominio, compartidas con la ficha y sin duplicarse (constitución,
  principio 3); navegar, esperar las cuentas y descartar la propuesta son comportamiento de
  la interfaz (RF-30). Pulsar "Proponer" dos veces seguidas lleva a la agenda una sola vez.
- RF-30: CUANDO la agenda recibe una propuesta, venga de coincidencias (RF-29) o de la
  ficha de jugador (spec 008, RF-7), EL SISTEMA aplica la misma regla: MIENTRAS las cuentas
  del usuario de la sesión se están cargando, no abre el formulario y lo abre cuando llegan,
  nunca con la lista de juegos vacía; SI esa carga falla, ENTONCES muestra el error según
  RF-9, no abre el formulario y descarta la propuesta, también si después se reintenta;
  SI el usuario de la sesión ya no tiene cuenta en el juego propuesto, ENTONCES no abre el
  formulario y la agenda se muestra como si se hubiera abierto directamente (spec 008,
  RF-21). La propuesta se usa una sola vez: al abrirse el formulario o descartarse la
  propuesta, la entrada del historial queda sin propuesta, de modo que recargar la agenda o
  volver con "Atrás" o "Adelante" a esa entrada muestra la agenda sin formulario. SI llega
  un 401 mientras la propuesta espera, se aplica RF-7 y la propuesta se descarta (la ruta
  de origen no lleva datos).

## Requisitos no funcionales
- RNF-1: Los componentes acceden a los datos solo a través del contrato de datos de la
  interfaz (ApiContract) y nunca llaman a la red directamente (constitución, principio 3).
- RNF-2: Ningún contenido de otros usuarios (biografía, títulos, notas, identificadores de
  cuenta) se inserta como HTML (`AGENTS.md`); es la defensa contra XSS que complementa la
  cookie HttpOnly.
- RNF-3: Construcción, comprobación de tipos y lint de la interfaz en verde (constitución,
  principio 4). En la interfaz no se exigen pruebas automáticas, tampoco para sus reglas
  de dominio (constitución, principio 4; `MEMORY.md`, decisiones); la comprobación de esta
  spec es el recorrido manual reproducible de "Criterios de finalización".
- RNF-4: No se rediseña ninguna vista existente: su disposición (orden y agrupación de
  secciones) y sus estilos no cambian; solo cambian los textos y elementos que esta spec
  exige, incluidos la pantalla de error de RF-5 y los avisos de login, que reutilizan los
  componentes y tokens de diseño existentes y ningún color escrito a mano (`AGENTS.md`). La
  línea base son las capturas de cada vista existente, a 1280 px y a 360 px de ancho,
  tomadas antes del primer cambio de esta spec y guardadas en el registro de validación.
- RNF-5: Ninguna clave, secreto ni credencial llega a la interfaz ni a sus variables de
  entorno: la interfaz no necesita ninguna (spec 004, RNF-9).
- RNF-6: La copia del dominio de la interfaz adopta el criterio de normalización de la spec
  004 (DP-26 y DP-34: escalones, R6 con 36) y el de puntaje de la spec 005, que el servidor
  comparte como copia del dominio de la interfaz (`AGENTS.md`, estructura; spec 005,
  contexto). Si las dos copias divergen, manda la del servidor. Se verifica con una tabla de
  casos (como mínimo los ejemplos de la spec 004: Iron IV = 0, Diamond I = 90, Master = 93,
  Challenger = 100, Grey = 0, Light Blue = 17, Gold = 100, Copper V = 0, Diamond I de R6 =
  97, Champion = 100; y los de la spec 005: puntajes 78, 100 y 0) cuyo resultado en ambas
  copias, y el método usado, se anotan en el registro de validación; la interfaz no tiene
  runner de prueba (RNF-3).
- RNF-7: Los avisos de login (RF-4, RF-7, RF-24), la pantalla de error de RF-5 y los errores
  de RF-9 se anuncian a un lector de pantalla al aparecer sin que el jugador mueva el foco;
  al mostrarse la pantalla de error de RF-5, el foco queda en "Reintentar".
- RNF-8: Con 360 px de ancho, los textos, avisos, la pantalla de error y las etiquetas
  nuevas de esta spec se ven completos, sin desplazamiento horizontal de la página.

## Casos límite
- Recargar sin comprobante anti-CSRF guardado pero con cookie vigente: la consulta de
  sesión responde 401 (spec 002, RF-11) y el jugador queda sin sesión (RF-5). Es la
  excepción declarada a HU-2.
- Recargar con comprobante guardado pero cookie borrada: la consulta responde 401, el
  comprobante se borra si sigue siendo el de esta pestaña y el jugador queda sin sesión
  (RF-5).
- Abrir o recargar directamente una ruta protegida sin sesión: va a login con esa ruta como
  ruta de origen (RF-25, RF-8), también en producción (spec 010, casos límite).
- Login o registro abiertos con sesión vigente (por ejemplo, desde otra pestaña): llevan a
  Inicio (RF-33).
- Una respuesta que llega después de limpiar la sesión del cliente (por RF-6, RF-7 o
  RF-24) se descarta y no vuelve a mostrar datos de la cuenta anterior ni de la nueva.
- Consulta de sesión que nunca responde: a los 30 segundos, pantalla de error con
  "Reintentar" (RF-5, RF-20). Cualquier otra petición sin respuesta: Texto de error sin
  mensaje a los 30 segundos y sin limpiar la sesión (RF-20).
- Un 401 que llega después de los 30 segundos de una petición ya dada por fallida: se
  descarta; la siguiente operación protegida recibe su propio 401 y aplica RF-7 (RF-20).
- El comprobante o la sesión expiran (una hora, spec 002, RNF-1) durante la espera de 30
  segundos: el 401 llega dentro del plazo y se aplica RF-7; si llega después, vale el caso
  anterior.
- Cambio de sesión en otra pestaña mientras esta muestra la pantalla de error de RF-5: solo
  limpia la sesión del cliente, sin aviso; "Reintentar" aplica RF-5 a la sesión que haya
  entonces (RF-24).
- Dos pestañas del mismo origen usan siempre el mismo modo, porque el modo se fija al
  construir o arrancar la interfaz (RF-1) y cada servidor de desarrollo tiene su propio
  origen. Si la construcción cambia de modo entre recargas con un comprobante guardado, se
  aplica RF-19: la consulta de sesión del modo actual decide.
- Recargar la agenda tras una propuesta: no reabre el formulario (RF-30).
- Varias peticiones reciben 401 a la vez: el jugador llega a login una sola vez, con un
  solo aviso de sesión expirada, y la ruta de origen es la de la vista en pantalla al
  recibir el primero (RF-7).
- Sesión expirada con la pestaña abierta: la siguiente operación protegida recibe 401 y se
  aplica RF-7, que borra el comprobante y muestra "Tu sesión expiró. Vuelve a entrar."; si
  en cambio se recarga, se aplica RF-5, que también lo borra y no muestra ese aviso.
- **Limitación declarada** (decisión del usuario, P11): los datos que el jugador no guardó
  (por ejemplo, la disponibilidad editada o el borrador de una sesión de la agenda) se
  pierden cuando RF-7 lo lleva a login, y también cuando RF-24 lo hace.
- Un error de red (servidor caído) no se trata como 401: se muestra el Texto de error sin
  mensaje, sin limpiar la sesión del cliente (RF-9), igual que con una respuesta HTML, un
  JSON sin campo de error o un 4xx de otra forma.
- Servidor caído o con 5xx al cargar la aplicación: pantalla de error con "Reintentar"
  (RF-5); si al reintentar responde 200 el jugador entra, y si responde 401 queda sin
  sesión.
- Registro correcto e inicio de sesión posterior fallido: el jugador llega a login con el
  correo escrito y "Tu cuenta se creó; inicia sesión" (RF-4); no necesita repetir el
  registro, que daría 400 por duplicado (RF-10, punto 1).
- Registro sin respuesta a los 30 segundos o con la respuesta perdida: se muestra el Texto
  de error sin mensaje; el usuario puede existir, y reintentar el mismo registro da 400
  por duplicado (RF-20, RF-9); el jugador puede entrar desde login con esas credenciales.
- Credenciales incorrectas en login: se muestra "correo o contraseña incorrectos" (spec 002,
  RF-9; minúscula inicial y sin punto final, como llega del servidor, RF-9) y no se aplica
  RF-7.
- Cerrar sesión con el servidor caído: se limpia la sesión del cliente y se va a login
  (RF-6); la cookie queda en el navegador hasta expirar, pero sin comprobante no sirve
  (spec 002, RF-11). Las demás pestañas también van a login (RF-24).
- Cerrar sesión en una pestaña con una escritura en vuelo en otra: la otra pestaña limpia su
  sesión (RF-24), descarta la respuesta y no la muestra; el servidor puede haber aplicado
  la escritura antes del cierre, y eso se ve al volver a entrar.
- Iniciar sesión con otra cuenta en una pestaña mientras otra muestra los datos de la
  cuenta anterior: la otra pestaña descarta esos datos y va a login con el aviso "Se cerró
  o cambió la sesión en otra pestaña." (RF-24); al entrar de nuevo vuelve a la ruta de
  origen, con los datos de la cuenta con la que entra.
- Dos inicios de sesión casi simultáneos en dos pestañas: la cookie conserva el último
  que procesó el navegador y el comprobante guardado puede ser el del otro. Es una
  limitación aceptada: la pestaña cuyo comprobante no corresponde recibe 401 en su
  siguiente operación protegida y aplica RF-7. No se garantiza cuál sesión prevalece.
- Cambio de sesión en otra pestaña mientras esta está en una ruta protegida: va a login
  con el aviso de RF-24 (no el de RF-7) y con esa ruta como ruta de origen (RF-8). Si esta
  pestaña está en login o registro, solo se limpia su sesión del cliente, sin aviso.
- Pestaña en segundo plano o suspendida que reanuda: aplica RF-24 dentro de los 5 segundos
  desde que vuelve a estar visible.
- Cambio de sesión en otra pestaña y 401 en esta casi a la vez: se aplica solo lo que ocurre
  primero y se muestra un único aviso. Si primero llega el cambio, RF-24 deja el cliente
  sin usuario de sesión y el 401 posterior aplica RF-7 en su rama sin usuario (RF-25, sin
  aviso adicional); si primero llega el 401, la pestaña ya está en login y RF-24 solo
  limpia la sesión del cliente.
- Almacenamiento del navegador bloqueado o en modo privado: ver RF-3 (la sesión vive hasta
  recargar; sin aviso entre pestañas).
- Una pestaña inicia sesión (con la misma cuenta o con otra) y la otra aplica RF-24: la
  segunda no borra el comprobante nuevo y la primera sigue operando sin 401 (D1).
- Un 401 tardío (RF-7) o una recarga con 401 (RF-5) en una pestaña cuyo comprobante ya
  reemplazó otra pestaña al iniciar sesión: limpia su sesión del cliente sin borrar el
  comprobante de la otra (D1).
- La sesión expira o se borra la cookie y una pestaña recibe 401 (RF-7): las demás no
  reaccionan en ese momento y siguen mostrando su vista hasta su siguiente petición
  protegida, que recibe 401 y las lleva a login con "Tu sesión expiró. Vuelve a entrar."
  (RF-7), no con el aviso de RF-24 (D2).
- Operación de escritura (vincular, resincronizar, desvincular, guardar perfil o
  disponibilidad, crear, sumarse, salir, cancelar) sin respuesta a los 30 segundos: el botón
  se desbloquea y se muestra el Texto de error sin mensaje (RF-20). El servidor puede haber
  completado la operación: el resultado aparece la siguiente vez que la interfaz lee los
  datos (por ejemplo, al recargar), y un segundo intento de vincular el mismo juego recibe
  400 (spec 004, RF-5), que se muestra según RF-9. Si el servidor responde después de los 30
  segundos, la interfaz no muestra esa respuesta ni vuelve a pedir los datos; hasta la
  siguiente lectura, las vistas pueden mostrar el estado anterior (D12).
- Doble clic en "Proponer", "Guardar disponibilidad", "Crear sesión" o "Sumarse": una sola
  petición o una sola navegación (RF-20, RF-29).
- Dirección inexistente abierta sin sesión: se muestra "no encontrada", sin ir a login
  (RF-28); su enlace a Inicio, que es protegida, lleva a login por RF-25.
- Servidor caído al abrir la página de entrada o una dirección inexistente: se muestra la
  pantalla de error de RF-5 en su lugar (D8).
- Cuenta de R6: muestra rango, historial, partidas y distancia como LoL y CS2, con la
  escala Copper a Champion (RF-12); su resincronización funciona como la de los demás
  juegos (RF-18).
- Cuenta verificada de un identificador que otro usuario también vinculó: los dos salen
  verificados (spec 004, caso límite aceptado por el usuario); la interfaz no lo evita.
- Candidato con cuenta de cualquier juego: siempre trae distancia de rango; no existe el
  caso "Sin datos" en coincidencias con el servidor de la spec 005 (RF-14, defensivo).
- Coincidencia cuyas horas en común caen solo entre las 02:00 y las 11:00: "Proponer"
  deshabilitado con "Sus horas en común quedan fuera del horario de la agenda (12:00 a
  01:00)" (RF-29).
- Coincidencia con un tramo en común de 10:00 a 14:00 (bloques 10, 11, 12 y 13): se propone
  a las 12:00 con 2 horas (RF-29). Con un tramo de 10:00 a 16:00 (bloques 10 a 15): a las
  12:00 con 4 horas (máximo). Con un tramo de 00:00 a 03:00 (bloques 0, 1 y 2): a las 00:00
  con 3 horas.
- Unión domingo 23:00 con lunes 00:00 como únicas horas en común: dos series; se propone el
  lunes a las 00:00 con 1 hora, porque el lunes es el primer día (RF-29).
- Nombre visible de 40 caracteres en "Sesión con <nombre>": el título tiene 51 y cabe en los
  60 de la spec 006 (RF-29).
- La agenda recibe una propuesta mientras sus cuentas cargan: abre el formulario cuando
  llegan; si fallan, muestra el error y descarta la propuesta; con sesión expirada, RF-7
  descarta la propuesta (RF-30).
- Propuesta desde coincidencias de un juego que el usuario de la sesión desvinculó en otra
  pestaña: la agenda no abre el formulario (RF-30).
- Limpiar la sesión del cliente con consultas en vuelo o reintentando: se cancelan y, si
  una respuesta llega igual, se descarta (definición de limpiar la sesión del cliente).
- Datos de demostración precargados del modo simulado con una cuenta verificada y otra no
  en cada juego: se muestran con la Etiqueta de datos simulados como toda cuenta (RF-11,
  RF-21).

## Fuera de alcance
- Las dos vistas nuevas (specs 008 y 009) y las operaciones del contrato que solo ellas usan
  (referencia, sección 6 punto 4).
- Pruebas automáticas de la interfaz, incluidas las de sus reglas de dominio (RNF-3).
- Producción y despliegue (spec 010), incluido el servidor en un origen distinto de la
  interfaz (CORS y la cabecera expuesta del comprobante, `MEMORY.md`, notas técnicas): en
  desarrollo la interfaz y el servidor comparten origen mediante la configuración de
  desarrollo, y en producción el servidor sirve la interfaz (spec 010).
- Datos de demostración precargados en el servidor y cualquier comando que los cargue. La
  entrada de `MEMORY.md` que dice que la 007 "elimina el script `seed`" no tiene RF: el
  backend no define ningún script `seed` (`backend/package.json`). La entrada debe
  corregirse o aclararse; ver el informe de esta revisión.
- Verificar una cuenta con la plataforma del juego o con cualquier operación de
  verificación, y toda fuente real de rango (spec 004, fuera de alcance).
- Editar la región de una cuenta desde la interfaz (el servidor lo permite, spec 004).
- Conservar los datos sin guardar al ir a login por un 401 o por un cambio de sesión en otra
  pestaña (limitación declarada, P11).
- Reproducir en el modo simulado los valores exactos de rango y partidas del servidor
  (RF-21, RNF-6).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Recorrido manual reproducible, registrado paso a paso con fecha y resultado en el
      registro de validación de esta spec. Condiciones: servidor real, base vacía al
      empezar, modo simulado desactivado, sin acceso a Internet, dos jugadores A y B que se
      registran durante el recorrido, y por cada juego los identificadores de cuenta que
      fija el plan de la spec 004 (uno verificado y uno no; el registro anota cuál usó cada
      jugador). Pasos: registro de A y B (cada uno llega a Inicio), cierre e inicio de
      sesión, recarga con sesión vigente (sigue dentro), vincular una cuenta de cada juego
      (LoL, R6 y CS2) y ver rango, historial, partidas y la Etiqueta de datos simulados en
      perfil y Configuración (la de R6 con la escala Copper a Champion), resincronizar varias
      veces una cuenta (el rango se mueve como mucho un escalón y llegan partidas nuevas),
      desvincular y volver a vincular, guardar disponibilidad, crear, sumarse, salir y
      cancelar una sesión de la agenda, y cierre de sesión.
- [ ] Coincidencias, dentro del mismo recorrido, con A y B con cuenta en los tres juegos y
      al menos 2 bloques en común: cada uno ve al otro en cada juego con "Δ <n> pts" y la
      Etiqueta de datos simulados en distancia y puntaje; el filtro de distancia y "Solo
      cuentas verificadas" están habilitados en los tres juegos; con la distancia máxima en
      0 el otro no aparece (salvo que tengan el mismo rango normalizado, spec 005), con la
      distancia máxima en el primer paso igual o mayor que la distancia entre los dos
      aparece, y si esa distancia supera 50 no aparece en ningún valor del deslizador (spec
      005, filtros: 0-50 en pasos de 5); con "Solo cuentas verificadas" activo, aparece solo
      el jugador cuya cuenta del juego salió verificada; la búsqueda por nombre de usuario
      lo encuentra. Con bloques en común martes 20:00, 21:00 y 22:00 y jueves 03:00,
      "Proponer" en la fila de B abre la agenda con el formulario rellenado con LoL, martes,
      20:00, 3 horas y "Sesión con <nombre visible de B>"; dejando el jueves 03:00 como única
      hora en común, "Proponer" está deshabilitado con "Sus horas en común quedan fuera del
      horario de la agenda (12:00 a 01:00)", recibe el foco y un lector de pantalla anuncia
      ese motivo. Con el tramo de 10:00 a 16:00 se propone 12:00 con 4 horas, y con domingo
      23:00 más lunes 00:00 se propone lunes 00:00 con 1 hora (RF-29).
- [ ] Agenda, dentro del mismo recorrido: tras abrir el formulario desde coincidencias,
      recargar la agenda la muestra sin formulario, y volver a coincidencias con "Atrás" y
      a la agenda con "Adelante" tampoco lo reabre; con la red limitada a "3G lenta",
      "Proponer" abre el formulario con la lista de juegos ya cargada; bloqueando en las
      herramientas del navegador la petición de las cuentas, la agenda muestra el error y no
      abre el formulario, tampoco tras "Reintentar"; desvinculando la cuenta de LoL en otra
      pestaña antes de pulsar "Proponer", la agenda no abre el formulario (RF-30).
- [ ] Etiqueta de datos simulados: con el servidor real y con el modo simulado aparece junto
      al rango, historial, partidas y marca de verificada de toda cuenta en perfil,
      Configuración y coincidencias, y junto a la distancia y el puntaje de cada candidato
      (RF-11); la pista de la cuenta demo en login aparece solo en modo simulado; ningún
      texto de ninguna vista, incluida la página de entrada, nombra Riot, Ubisoft, Valve,
      Steam, FACEIT ni Leetify como fuente (las etiquetas "Riot ID", "Ubisoft ID" y
      "SteamID64" sí aparecen, RF-15); el pie de la página de entrada muestra el aviso de
      RF-22. En todos esos lugares, y en el aviso global de la barra de navegación y el pie,
      el texto es exactamente «Datos de demostración», igual con el servidor real y en modo
      simulado; una búsqueda en los textos visibles no encuentra «Datos simulados» ni otro
      texto para la marca (RF-11, RF-22).
- [ ] Con sesión iniciada en Configuración, borrar la cookie desde las herramientas del
      navegador y guardar la disponibilidad lleva a login con el aviso "Tu sesión expiró.
      Vuelve a entrar."; al entrar de nuevo vuelve a Configuración; entre el 401 y el nuevo
      inicio el almacenamiento del navegador no tiene comprobante, y el historial no suma
      más de una entrada de login (RF-7, RF-8).
- [ ] Borrar la cookie y navegar por primera vez en la sesión a una vista que hace más de
      una consulta al servidor: la pestaña de red muestra más de un 401 y el historial del
      navegador una sola entrada de login.
- [ ] Con el servidor apagado y el modo simulado desactivado, guardar la disponibilidad
      muestra "No se pudo conectar con el servidor. Inténtalo de nuevo." y no lleva a
      login; recargar muestra "Cargando…" y después la pantalla de error con "Reintentar"
      (sin mostrar login ni vistas protegidas, con el foco en "Reintentar"); encender el
      servidor y pulsar "Reintentar" devuelve al jugador dentro (RF-5, RF-9, RNF-7).
- [ ] Con la red limitada a "3G lenta" al recargar, solo se ve "Cargando…" hasta que
      responde la consulta de sesión: nunca se ve login ni una vista protegida antes de la
      respuesta (RF-5). Con la consulta de sesión bloqueada sin respuesta, a los 30 segundos
      aparece la pantalla de error con "Reintentar".
- [ ] Con una limitación de red personalizada de 40 segundos de latencia, pulsar
      "Resincronizar" muestra "Enviando…" con el botón deshabilitado y, a los 30 segundos,
      desbloquea el botón y muestra "No se pudo conectar con el servidor. Inténtalo de
      nuevo." sin llevar a login; el mismo resultado al guardar la disponibilidad o al
      registrar un jugador; un doble clic en cualquiera de esos botones envía una sola
      petición (RF-20).
- [ ] Con dos pestañas con sesión iniciada y la segunda en Configuración, cerrar sesión en
      la primera lleva la segunda a login, en menos de 5 segundos, sin datos de la cuenta,
      con el aviso "Se cerró o cambió la sesión en otra pestaña." (no "Tu sesión expiró.
      Vuelve a entrar.") y una sola entrada de login en su historial; al entrar de nuevo en
      la segunda vuelve a Configuración. Repetir iniciando sesión con otra cuenta en una
      pestaña produce lo mismo en la otra. Con la segunda pestaña en login, el cambio no
      muestra aviso. Con tres pestañas, las otras dos reaccionan. Con la segunda pestaña en
      segundo plano, reacciona en menos de 5 segundos tras volver a estar visible (RF-8,
      RF-24).
- [ ] Con el servidor real, bloqueando en las herramientas del navegador solo la petición de
      inicio de sesión y registrando un jugador nuevo, el jugador llega a login con el
      correo escrito y "Tu cuenta se creó; inicia sesión", sin ruta de origen (RF-4).
- [ ] Con sesión cerrada, abrir directamente la dirección de Configuración lleva a login
      sin aviso y, al entrar, vuelve a Configuración (RF-25, RF-8). Con sesión iniciada,
      abrir login o registro lleva a Inicio (RF-33).
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
- [ ] Con el almacenamiento del navegador bloqueado, iniciar sesión funciona; recargar deja
      sin sesión en login (RF-3, RF-5).
- [ ] Modo simulado, con el servidor apagado: entrar con la cuenta demo y recorrer perfil,
      Configuración, coincidencias y agenda no produce ninguna petición al servidor en la
      pestaña de red ni ningún mensaje de error; en los datos precargados hay cuentas
      verificadas y no verificadas en cada juego, las cuentas de R6 muestran rango,
      historial y partidas, los identificadores de ejemplo de la spec 004 dan el mismo
      resultado de verificada que con el servidor, y borrar el comprobante y guardar algo
      lleva a login como con el servidor real (RF-10, RF-21).
- [ ] Cada caso de la lista de RF-10 que la interfaz puede provocar se reproduce desde la
      interfaz en modo simulado y con el servidor real con el mismo resultado visible y,
      cuando la spec lo fija, el mismo mensaje; los demás casos se comprueban revisando el
      backend simulado frente a la spec citada en cada punto. El resultado de cada caso, y
      cómo se comprobó, queda en el registro de validación.
- [ ] Una revisión de los datos precargados del modo simulado no encuentra ninguna palabra
      de los nombres de los integrantes de `AGENTS.md`, Equipo, ni los nombres de usuario
      `vicho`, `cotito`, `dayala`, `sebav`, `benjae` ni `marzam`, ignorando mayúsculas y
      acentos (RF-27).
- [ ] Ningún texto visible de la interfaz dice que el rango se lee de forma periódica,
      automática o "cuando cambia"; Configuración, la página de entrada y la pantalla de
      acceso dicen que el rango se vuelve a leer al pulsar "Resincronizar", el botón de
      relectura de toda cuenta se rotula "Resincronizar" y no queda el texto "Volver a leer
      el rango" (RF-26); junto al botón aparece el texto de RF-18.
- [ ] Con sesión cerrada y con sesión iniciada, abrir una dirección inexistente muestra la
      vista "no encontrada" sin pasar por login; con el servidor apagado y el modo
      simulado desactivado, abrir la página de entrada o una dirección inexistente muestra
      la pantalla de error con "Reintentar" en su lugar (RF-28, RF-5, D8).
- [ ] En ningún momento tras iniciar sesión (con el servidor real ni en modo simulado) las
      herramientas del navegador muestran la credencial en el almacenamiento accesible a la
      página ni en las cabeceras o cuerpos de las peticiones que construye la página (RF-2,
      RF-19); una biografía o un título con etiquetas HTML (ej. `<b>x</b>`) se muestran como
      texto literal (RNF-2); ningún texto usa "verificado" ni "rango verificado" (RF-16);
      una búsqueda en el código de la interfaz no encuentra `dangerouslySetInnerHTML`.
- [ ] La plantilla de configuración existe, no tiene valores secretos y deja el modo simulado
      desactivado, y una búsqueda en la construcción de la interfaz no encuentra el valor de
      la clave de sesión del servidor (RF-13, RNF-5). Con `true`, ` true ` o `TRUE`
      en la variable del modo simulado solo los dos primeros lo activan (RF-1).
- [ ] La tabla de casos de normalización y puntaje de RNF-6 da el mismo resultado en las dos
      copias del dominio, con el método y el resultado en el registro de validación.
- [ ] Cada vista existente, a 1280 px y a 360 px, coincide con su captura de línea base salvo
      los textos y elementos que esta spec exige, sin desplazamiento horizontal a 360 px
      (RNF-4, RNF-8).

## Decisiones de clarificación
Decisiones del usuario que siguen vigentes:
- P2 (RF-4), P3 y P12 (RF-24), P4 (texto de error sin mensaje), P5 y D8 (pantalla de error
  de RF-5), P6 (aviso de RF-7), P11 (limitación de datos sin guardar), P16 (usuario de la
  sesión), D1 (comprobante entre pestañas), D2 (solo cerrar o iniciar sesión cuentan como
  cambio), D5 (vista "no encontrada" pública), D6 (30 segundos; ahora generalizado por
  R5), D7 y D10 (relectura solo con "Resincronizar"), D9 (nombres ficticios), D12 (servidor
  que termina después de los 30 segundos), D13 y P22 (perfil sin tendencia, con la
  diferencia desde la primera lectura), P18 a P21 (propuesta desde coincidencias y agenda).

Decisiones del usuario que caen por la spec 004 y 005 vigentes (ya no están en esta spec):
P1 y D4 (condición previa: cumplida); P7, D3 y D11 (fuente "Datos de demostración", R6 y
LoL sin verificar, Steam); P8 en lo que nombra fuentes reales en la página de entrada;
P9, P13 y P17 ("Sin datos" y "Sin rango" como estados normales); P10 (filtros
deshabilitados); P14 y P15 (campo "Fuente" y etiquetas como no-fuentes, salvo la parte de
RF-15 que sigue valiendo); y las referencias a Riot, FACEIT, Steam y la clave de Riot.

Decisiones de esta revisión (2026-10-18), tomadas por el planificador con criterio
conforme a la constitución. **El usuario puede revisarlas y cambiarlas**:
- R1: se mantiene el numerado; los RF retirados o reescritos conservan su número y llevan
  la nota "Sustituye a…", porque la spec 008 cita RF-9, RF-10, RF-12, RF-14, RF-15, RF-21,
  RF-27, RF-30 y RNF-6. Los RF nuevos son RF-31 a RF-33 y RNF-7 y RNF-8. Retirados sin
  sustituto: RF-17 (Steam). Reescritos con otro contenido: RF-12, RF-14, RF-15, RF-18,
  RF-21 y RF-23.
- R2: el modo simulado solo se activa con `true` tras quitar espacios de los extremos
  (RF-1); la plantilla de configuración deja el modo simulado desactivado (RF-13).
- R3: los redireccionamientos por regla de sesión reemplazan la entrada del historial
  (definición), para que "Atrás" no deje en una vista descartada.
- R4: durante la consulta de sesión se muestra "Cargando…" y "Reintentar" no tiene límite
  de intentos (RF-5).
- R5: el plazo de 30 segundos y el estado "Enviando…" valen para toda petición y toda
  escritura iniciada por el jugador, no solo para vincular y resincronizar (RF-20).
- R6: el aviso entre pestañas llega como máximo 5 segundos después (o tras volver a ser
  visible); sin almacenamiento disponible no hay aviso entre pestañas (RF-3, RF-24).
- R7: la definición de error sin mensaje cubre HTML, JSON sin campo de error y 4xx de otra
  forma (definiciones).
- R8: la limpieza de la sesión del cliente cancela las peticiones en vuelo y descarta las
  respuestas que lleguen (definición).
- R9: textos literales nuevos: "Cargando…", "Enviando…", el texto junto a "Resincronizar"
  (RF-18) y el de relectura (RF-26).
- R10: el modo simulado adopta la escala, bandas y normalización de la spec 004 y el
  mismo resultado de verificada para los identificadores de ejemplo; no copia los valores
  exactos de rango y partidas (RF-21, RNF-6).
- R11: la interfaz muestra el historial en el orden del servidor y la "Última lectura"
  (RF-31).
- R12: con sesión vigente, login y registro llevan a Inicio (RF-33).
- R13: servidor en otro origen (CORS) queda fuera de alcance y pasa a la spec 010; el
  script `seed` queda fuera de alcance y se avisa del desajuste con `MEMORY.md`.
- R14: el rótulo de la interfaz del filtro de verificadas es "Solo cuentas verificadas"
  (RF-16). El mensaje del servidor de la spec 005 (RF-14) lo llama "Solo cuentas con rango
  verificado", pero solo se ve por llamadas directas a la API; la discrepancia queda para
  un cambio de la spec 005 (sigue declarada; ver R21).
- R15: la comprobación es un recorrido manual reproducible, sin cuentas reales ni claves;
  RNF-6 se verifica con una tabla de casos anotada en el registro de validación.
- R16: se quitaron de la spec los detalles de implementación (atributos de cookie, librería
  de consultas, nombres de variables y de claves de almacenamiento, cabeceras): pasan a
  `plan.md`. Se conserva ApiContract porque la constitución (principio 3) lo nombra.
- R17: RF-27 amplía la comparación (palabras sueltas, sin mayúsculas ni acentos, dentro del
  texto) y admite apodos adicionales anotados en el registro de validación.
- R18: RNF-4 usa como línea base capturas previas; RNF-7 y RNF-8 fijan anuncio a lectores
  de pantalla, foco y vista de 360 px para los textos nuevos.

Decisiones del usuario del 2026-10-18 (cierre de la clarificación):
- R19 (decisión del usuario): la marca de datos simulados se muestra siempre con el texto
  «Datos de demostración», en las etiquetas por dato y en el aviso global (barra de
  navegación y pie, incluido el pie de la página de entrada), con el servidor real y en modo
  simulado. Un solo concepto y un solo texto; se descartan «Datos simulados», el texto «Los
  datos que ves son de demostración» y la opción de solo aviso global. Afecta a RF-11,
  RF-15, RF-22 y a los criterios de la etiqueta; cumple la spec 004, RF-37.
- R20 (decisión del usuario): la spec 007 se mantiene entera, sin dividirse. Su plan tendrá
  más de 10 tareas por decisión del usuario, que prevalece sobre la regla de la skill sdd
  de proponer dividir; las tareas se agrupan por los tres bloques de "Organización".

Decisiones del usuario del 2026-10-19 (ajustes menores tras implementar las specs 004 y 005):
- R21 (decisión del usuario, APROBADA el 2026-10-19): excepción al RF-16. El modo simulado
  reproduce el literal del servidor «rango verificado» en el error del filtro de verificadas
  (spec 005, RF-14; RF-10 punto 12) y la interfaz nunca lo muestra. El rótulo del filtro en la
  interfaz sigue siendo "Solo cuentas verificadas" (R14) y la discrepancia con el rótulo de la
  005 sigue declarada.
- R22 (decisión del usuario, 2026-10-19): el texto del 401 del inicio de sesión en la
  interfaz y en el modo simulado es «correo o contraseña incorrectos» (minúscula inicial, sin
  punto final), el de la spec 002, RF-9 y el del backend.

Ninguna de las decisiones R1 a R18 depende del texto de la etiqueta. R9 (textos literales
nuevos) no incluye la etiqueta porque ya existía como aviso global; R13 y R14 no se ven
afectadas.

## Dudas abiertas
Ninguna. Las dos preguntas pendientes (texto de la etiqueta de datos simulados y división
de la spec) quedaron resueltas por el usuario el 2026-10-18 (R19 y R20).
