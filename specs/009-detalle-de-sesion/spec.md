# Spec 009 — Vista nueva: detalle de sesión
Estado: borrador

## Contexto y objetivo
Segunda de las dos vistas nuevas que exige el enunciado del Hito 2, propuesta por la spec
001 original y confirmada por el usuario. Hoy una sesión solo existe como tarjeta dentro
de la agenda: no tiene una dirección propia que compartir y el anfitrión no puede editarla,
solo cancelarla. El detalle cierra el flujo en la sesión agendada (`PRODUCT.md`, principio
3) y usa operaciones del servidor que las vistas actuales no usan: obtener una sesión por
id y actualizarla.

- Depende de: spec 007 y spec 008 (los participantes enlazan a su ficha).
- Origen: HU-12, RF-24 (vista 2) y sección 7 (V2) de la spec original.
- Las decisiones técnicas ya tomadas (secciones 6.4 —operaciones nuevas del contrato— y 7
  —ruta, componentes y estados—) están en `specs/_referencia/001-crear-backend-original.md`
  y pasan al `plan.md` de esta spec.

## Usuarios
- Anfitrión de una sesión.
- Participante o jugador interesado en sumarse.

## Historias de usuario
- HU-1. Como jugador, quiero una página propia para cada sesión donde ver el juego, el
  horario, los cupos y quién va.
- HU-2. Como anfitrión, quiero editar mi sesión desde esa página y cancelarla con
  confirmación.
- HU-3. Como jugador, quiero sumarme o salir de la sesión desde esa página y entender por qué
  no puedo cuando no se permite.

## Definiciones
- **Detalle de sesión**: página propia de una sesión, identificada por su identificador.
- **Sesión**, **estado** y **referencia de usuario**: los definidos en la spec 006.

## Requisitos funcionales
- RF-1: MIENTRAS no hay sesión iniciada, EL SISTEMA no muestra el detalle y lleva a login
  recordando la ruta de origen (spec 007, RF-7).
- RF-2: EL SISTEMA ofrece un acceso al detalle desde cada sesión mostrada en la agenda.
- RF-3: CUANDO el jugador abre el detalle, EL SISTEMA muestra el juego, el título, las
  notas, el día y el rango horario, los cupos ocupados y totales, el estado y los
  participantes, cada uno con acceso a su ficha (spec 008).
- RF-4: MIENTRAS el usuario de la sesión es el anfitrión, EL SISTEMA ofrece un formulario
  para editar título, notas, día, hora de inicio, duración y cupos, con las mismas
  validaciones que el formulario de creación de la agenda.
- RF-5: CUANDO el anfitrión guarda una edición válida, EL SISTEMA la envía al servidor y
  muestra la sesión actualizada sin recargar la página.
- RF-6: CUANDO el anfitrión cancela la sesión y confirma, EL SISTEMA la cancela en el servidor
  y lleva a la agenda; si no confirma, no cambia nada.
- RF-7: MIENTRAS el usuario de la sesión no es el anfitrión, EL SISTEMA ofrece sumarse si no
  está inscrito o salir si lo está.
- RF-8: SI el servidor rechaza una acción (por ejemplo, 409 por sesión llena o 400 por cupos
  bajo los participantes), ENTONCES EL SISTEMA muestra su mensaje junto a la acción.
- RF-9: MIENTRAS se cargan los datos, EL SISTEMA muestra un estado de carga.
- RF-10: SI la sesión no existe o su identificador no tiene formato válido, ENTONCES EL
  SISTEMA muestra un estado vacío que lo indica.
- RF-11: SI el servidor responde 403, ENTONCES EL SISTEMA muestra el mensaje sin salir de la
  página.
- RF-12: CUANDO una acción cambia la sesión, EL SISTEMA refleja el cambio también en la
  agenda sin recargar la página.
- RF-13: EL SISTEMA obtiene todos los datos del detalle del servidor real y funciona también
  en modo simulado.

## Requisitos no funcionales
- RNF-1: Usa los componentes, tokens de diseño y patrones existentes; ningún color escrito a
  mano (`AGENTS.md`).
- RNF-2: Operable con teclado, con foco visible; la confirmación de cancelar se puede
  aceptar o rechazar con teclado.
- RNF-3: Título y notas se muestran como texto, nunca como HTML.
- RNF-4: Construcción, comprobación de tipos y lint de la interfaz en verde.

## Casos límite
- La sesión se cancela mientras otro jugador tiene abierto su detalle: su siguiente acción
  recibe 404 y la página muestra el estado vacío (RF-10).
- Sesión que cruza la medianoche: el rango horario se muestra como hoy en la agenda (ej.
  23:00–03:00).
- Bajar los cupos por debajo de los participantes: el servidor responde 400 y se muestra el
  mensaje (RF-8).

## Fuera de alcance
- Notificar a los participantes de una edición o cancelación.
- Expulsar participantes.
- Cambiar el juego de una sesión existente.

## Criterios de finalización
- [ ] Construcción, comprobación de tipos y lint de la interfaz en verde.
- [ ] Recorrido manual contra el servidor real con cuentas reales del equipo: como anfitrión
      editar y cancelar (con y sin confirmar); como otro jugador sumarse, salir y recibir el
      mensaje de sesión llena; abrir la ficha de un participante.
- [ ] Recorrido manual de los estados: carga, sesión inexistente, identificador mal formado y
      acceso sin sesión que lleva a login.

## Dudas abiertas
- Ninguna.
