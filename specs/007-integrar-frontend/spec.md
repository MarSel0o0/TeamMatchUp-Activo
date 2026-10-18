# Spec 007 — Conectar la interfaz al servidor real
Estado: borrador

## Contexto y objetivo
Las cinco vistas del Hito 1 funcionan contra un backend simulado en el navegador. El
cliente HTTP que existe nunca se ejecutó y asume otro esquema de sesión: guarda el JWT en
localStorage y lo envía en una cabecera, lo que es vulnerable a XSS y choca con el
principio 5 de la constitución (deuda registrada en `MEMORY.md`).

Esta spec hace que la interfaz use por defecto el servidor de las specs 001 a 006, con el
esquema de sesión de la spec 002, que vuelva a login cuando no hay sesión y que las cinco
vistas existentes funcionen de punta a punta. También adapta la interfaz a las fuentes
oficiales de la spec 004: R6 sin rango, cuentas sin rango, verificación de CS2 con Steam y
el nuevo significado de "cuenta verificada".

El servidor no tiene datos de demostración: la base empieza vacía y el equipo se registra
con sus cuentas reales para demostrar coincidencias (decisión del usuario). El backend
simulado del navegador queda solo como herramienta de desarrollo de la interfaz, con sus
datos de demostración etiquetados como tales.

- Depende de: specs 001 a 006.
- Origen: HU-01 (sesión iniciada y llegada a inicio), HU-03, HU-04 y HU-05 (parte de la
  interfaz); RF-22 y RF-23 de la spec original.
- Las decisiones técnicas ya tomadas (sección 1, sección 2 —cliente, mock, rutas—, RT-15,
  sección 5.3 —variables de la interfaz—, sección 6 completa y sección 10) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
  La tarea T15 de la referencia (cargar datos de demostración en la base) queda sin efecto.

## Usuarios
- Jugador que usa la aplicación contra el servidor real.
- Integrantes del equipo que trabajan la interfaz con o sin servidor.

## Historias de usuario
- HU-1. Como jugador sin cuenta, quiero que al registrarme la sesión quede iniciada y llegue
  a la pantalla de inicio.
- HU-2. Como jugador, quiero que recargar la página no me saque de la aplicación mientras mi
  sesión siga vigente.
- HU-3. Como jugador, quiero que al cerrar sesión no quede rastro de mis datos en la
  aplicación abierta.
- HU-4. Como jugador que dejó la pestaña abierta, quiero que al expirar la sesión la
  aplicación me lleve a login y, al volver a entrar, me devuelva a donde estaba.
- HU-5. Como jugador de CS2, quiero verificar mi cuenta iniciando sesión en Steam desde
  Configuración.
- HU-6. Como jugador de R6, quiero entender por qué mi cuenta no muestra rango.

## Definiciones
- **Modo simulado**: la interfaz usa el backend simulado del navegador en lugar del servidor.
- **Credencial de sesión** y **comprobante anti-CSRF**: los definidos en la spec 002.
- **Ruta de origen**: la ruta protegida que el jugador intentaba ver cuando se le pidió
  iniciar sesión.
- **Cuenta verificada**, **cuenta sin rango** y **juego sin fuente de rango**: los definidos
  en la spec 004.
- **Mensaje de R6**: "Rango no disponible: Ubisoft no ofrece API oficial".

## Requisitos funcionales
- RF-1: EL SISTEMA usa el servidor real por defecto y solo usa el modo simulado cuando la
  configuración lo activa de forma explícita.
- RF-2: EL SISTEMA no guarda la credencial de sesión en ningún almacenamiento del navegador
  accesible desde el código de la página ni la envía en cabeceras o cuerpos.
- RF-3: CUANDO el inicio de sesión tiene éxito, EL SISTEMA guarda el comprobante anti-CSRF
  en localStorage y lo envía en cada petición posterior, junto con las cookies.
- RF-4: CUANDO el registro tiene éxito, EL SISTEMA inicia sesión con las mismas credenciales
  y lleva al jugador a la pantalla de inicio.
- RF-5: CUANDO la aplicación se carga o se recarga, EL SISTEMA consulta la sesión actual al
  servidor; si responde 200 mantiene al jugador dentro y, si responde 401, lo trata como
  sin sesión.
- RF-6: CUANDO el jugador cierra sesión, EL SISTEMA avisa al servidor, borra el comprobante
  anti-CSRF y todos los datos guardados en memoria de la aplicación, y lleva a login.
- RF-7: SI cualquier consulta o acción protegida recibe 401, ENTONCES EL SISTEMA limpia la
  sesión del cliente y lleva a login recordando la ruta de origen, sin recargar la página.
- RF-8: CUANDO el jugador inicia sesión después de haber sido enviado a login, EL SISTEMA lo
  devuelve a la ruta de origen.
- RF-9: SI el servidor responde un error, ENTONCES EL SISTEMA muestra el mensaje tal como
  llega en la respuesta de error, incluidos "Jugador no encontrado." y "Fuente no
  disponible, inténtalo más tarde." al vincular o resincronizar (spec 004).
- RF-10: MIENTRAS está activo el modo simulado, EL SISTEMA responde con los mismos códigos y
  formas que el servidor (por ejemplo, 400 en vez de 409 o 422 para duplicados y formatos
  inválidos, 409 al salir de una sesión sin estar inscrito, y R6 sin rango).
- RF-11: MIENTRAS está activo el modo simulado, EL SISTEMA muestra la etiqueta "Datos de
  demostración" y la pista de la cuenta demo en login; MIENTRAS usa el servidor real, no
  muestra ninguna de las dos.
- RF-12: EL SISTEMA muestra el mensaje de R6 en lugar del rango, del historial de rango y de
  la distancia en el perfil, en Configuración y en la vista de coincidencias de R6, y en
  esa vista desactiva el filtro de distancia de rango.
- RF-13: EL SISTEMA incluye un archivo de ejemplo con los nombres de las variables de
  entorno de la interfaz, sin secretos.
- RF-14: SI una cuenta de LoL o CS2 no tiene rango vigente, ENTONCES EL SISTEMA muestra
  "Sin rango" en lugar del rango.
- RF-15: EL SISTEMA muestra como fuente de cada juego la de la spec 004 (Riot para LoL;
  Steam y FACEIT para CS2, más Leetify si se confirma; ninguna para R6) y no menciona
  fuentes que no se usan.
- RF-16: EL SISTEMA usa "verificada" solo para cuentas cuyo dueño inició sesión en la
  plataforma del juego, y no presenta ningún rango como "verificado"; el filtro de
  coincidencias se rotula "Solo cuentas verificadas".
- RF-17: MIENTRAS una cuenta de CS2 propia no está verificada, EL SISTEMA ofrece en
  Configuración "Verificar con Steam", que lleva al inicio de sesión de Steam y, al volver,
  muestra la cuenta verificada o el mensaje de error del servidor (spec 004, RF-24).
- RF-18: EL SISTEMA no ofrece resincronizar ni verificar cuentas de R6, ni verificar
  cuentas de LoL.

## Requisitos no funcionales
- RNF-1: Los componentes acceden a los datos solo a través del contrato único y nunca
  llaman a la red directamente (constitución, principio 3).
- RNF-2: Ningún contenido de otros usuarios (biografía, títulos, notas) se inserta como HTML
  (`AGENTS.md`); es la defensa contra XSS que complementa la cookie HttpOnly.
- RNF-3: Construcción, comprobación de tipos y lint de la interfaz en verde (constitución,
  principio 4).
- RNF-4: No se rediseña ninguna vista existente; los cambios de RF-12 a RF-18 reutilizan sus
  componentes y tokens de diseño.
- RNF-5: Ninguna clave de fuente externa llega a la interfaz ni a sus variables de entorno.

## Casos límite
- Recargar sin comprobante anti-CSRF guardado pero con cookie vigente: la consulta de
  sesión responde 401 y el jugador va a login.
- Varias peticiones reciben 401 a la vez: el jugador llega a login una sola vez y la ruta de
  origen es la primera.
- Un error de red (servidor caído) no se trata como 401: se muestra como error, sin cerrar
  la sesión del cliente.
- Clave de Riot caducada: vincular una cuenta LoL muestra "Fuente no disponible, inténtalo
  más tarde." y la sesión del jugador sigue iniciada (el servidor responde 503, no 401).
- El jugador cancela el inicio de sesión en Steam: vuelve a Configuración con la cuenta sin
  verificar y el mensaje del servidor.
- La vuelta desde Steam llega con la sesión expirada: se aplica RF-7 y, tras iniciar sesión,
  la cuenta sigue sin verificar hasta repetir el paso.

## Fuera de alcance
- Las dos vistas nuevas (specs 008 y 009).
- Pruebas automáticas de la interfaz.
- Producción y despliegue (spec 010).
- Datos de demostración en el servidor o un comando para cargarlos.
- Verificación con Steam en modo simulado.
- Editar la región de una cuenta desde la interfaz (el servidor lo permite, spec 004).

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Con el servidor real, la base vacía, la clave de Riot vigente y el modo simulado
      desactivado, un recorrido manual con al menos dos cuentas reales del equipo completa:
      registro, inicio de sesión, recarga, vincular, resincronizar y desvincular una cuenta
      LoL, vincular una cuenta R6 y ver el mensaje de R6, vincular y verificar con Steam una
      cuenta CS2, guardar disponibilidad, coincidencias con filtros, crear, sumarse, salir y
      cancelar sesión, y cierre de sesión.
- [ ] Con el servidor real no aparecen ni la etiqueta "Datos de demostración" ni la pista de
      la cuenta demo; con el modo simulado aparecen las dos.
- [ ] Borrar la cookie desde las herramientas del navegador y navegar lleva a login; al
      entrar de nuevo vuelve a la ruta de origen.
- [ ] Una búsqueda en el código de la interfaz confirma que ya no se guarda ni se envía la
      credencial de sesión, ni se menciona una fuente de R6.
- [ ] Con el modo simulado activado, la aplicación sigue funcionando sin servidor.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Depende de las dudas de las specs 004 y 005: qué se muestra como
  variación de rango por partida cuando la fuente no la entrega, y cómo aparecen en
  coincidencias los candidatos sin rango de LoL y CS2.
