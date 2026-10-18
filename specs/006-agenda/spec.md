# Spec 006 — Agenda de sesiones de juego
Estado: borrador

## Contexto y objetivo
El flujo del producto termina en una sesión agendada, no en una lista de perfiles
(`PRODUCT.md`, principio 3). Hoy la agenda vive en el backend simulado; esta spec la lleva
al servidor como la tercera entidad, con sus cinco operaciones REST más sumarse y salir.

- Depende de: spec 003. Se ubica después de la 005 para cerrar el flujo coincidencia →
  sesión, pero no usa nada de ella.
- Origen: HU-10 y HU-13 (sesiones); RF-07 (cascada de sesiones) y RF-17 a RF-21 de la spec
  original.
- Las decisiones técnicas ya tomadas (sección 2 —código 409—, RT-07 a RT-12, secciones 5.4
  —sesión—, 5.7 y 8 —`sessions.test.ts` y `app.test.ts`—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.

## Usuarios
- Jugador que organiza una sesión (anfitrión).
- Jugador que se suma a sesiones de otros (participante).

## Historias de usuario
- HU-1. Como jugador, quiero publicar una sesión en un día y hora concretos para que otros
  se sumen.
- HU-2. Como jugador, quiero ver las sesiones de la semana, de un juego o de todos, para
  elegir a cuál sumarme.
- HU-3. Como jugador, quiero sumarme a una sesión con cupo y salir si ya no puedo.
- HU-4. Como anfitrión, quiero editar o cancelar mi sesión, y que nadie más pueda hacerlo.

## Definiciones
- **Sesión**: juego, título, notas, día de la semana (0 = lunes … 6 = domingo), hora de
  inicio, duración en horas, cupos, anfitrión, participantes, estado y fecha de creación.
- **Participantes**: usuarios inscritos; el anfitrión es siempre el primero.
- **Estado**: `open` mientras quedan cupos; `full` cuando los participantes igualan los cupos.
- **Referencia de usuario en una sesión**: identificador, nombre de usuario, nombre visible
  y color de avatar; sin correo.

## Requisitos funcionales
- RF-1: EL SISTEMA exige sesión válida en todas las operaciones de esta spec.
- RF-2: CUANDO un usuario lista sesiones de un juego o de todos, EL SISTEMA responde 200 con
  ellas ordenadas por día y luego por hora de inicio.
- RF-3: CUANDO un usuario pide una sesión por su identificador, EL SISTEMA responde 200 con
  ella; para identificadores inválidos o inexistentes aplica la regla de la spec 003 (RF-5).
- RF-4: EL SISTEMA entrega el anfitrión y los participantes de cada sesión como referencias
  de usuario.
- RF-5: CUANDO un usuario crea una sesión con datos válidos, EL SISTEMA lo registra como
  anfitrión y primer participante, deja el estado en `open` y responde 201 con la sesión.
- RF-6: SI el juego no existe, el título no tiene entre 3 y 60 caracteres sin contar
  espacios en los extremos, las notas superan 160, el día no es un entero de 0 a 6, la hora
  de inicio no es un entero de 0 a 23, la duración no es un entero de 1 a 4 o los cupos no
  son un entero de 2 a 6, ENTONCES EL SISTEMA responde 400 y no guarda nada.
- RF-7: CUANDO el anfitrión edita su sesión, EL SISTEMA reemplaza título, notas, día, hora
  de inicio, duración y cupos con las mismas reglas de RF-6, recalcula el estado y responde
  200 con la sesión.
- RF-8: SI la edición deja los cupos por debajo de la cantidad de participantes, ENTONCES EL
  SISTEMA responde 400 y no cambia nada.
- RF-9: CUANDO el anfitrión cancela su sesión, EL SISTEMA la borra y responde 204.
- RF-10: SI quien edita o cancela no es el anfitrión, ENTONCES EL SISTEMA responde 403 y no
  cambia nada.
- RF-11: CUANDO un usuario se suma a una sesión `open` en la que no está, EL SISTEMA lo
  agrega a los participantes, pasa el estado a `full` si se completan los cupos y responde
  200 con la sesión.
- RF-12: SI la sesión está llena o el usuario ya está inscrito, ENTONCES EL SISTEMA responde
  409 con un mensaje específico.
- RF-13: CUANDO un participante que no es el anfitrión sale de una sesión, EL SISTEMA lo
  quita, deja el estado en `open` y responde 200 con la sesión.
- RF-14: SI el anfitrión intenta salir de su propia sesión, ENTONCES EL SISTEMA responde 409
  indicando que debe cancelarla.
- RF-15: EL SISTEMA ignora al crear o editar cualquier campo distinto de los de RF-6,
  incluidos anfitrión, participantes, estado y juego en la edición.
- RF-16: CUANDO se elimina un usuario (spec 003, RF-11), EL SISTEMA borra las sesiones que
  organiza, lo quita de las sesiones donde participa y recalcula su estado.
- RF-17: SI un usuario pide salir de una sesión en la que no está inscrito, ENTONCES EL
  SISTEMA responde 409 con "no estás inscrito en esta sesión" y no cambia nada.

## Requisitos no funcionales
- RNF-1: Las respuestas tienen los mismos campos y formatos que consume hoy la agenda.
- RNF-2: Título y notas se guardan como texto y nunca se interpretan como HTML; la interfaz
  los muestra escapados (constitución; `AGENTS.md`).

## Casos límite
- Una sesión que empieza a las 23 y dura 4 horas termina al día siguiente; se acepta, como
  hoy en la interfaz.
- Sumar al último participante cambia el estado a `full`; si luego alguien sale vuelve a `open`.
- Editar los cupos a exactamente la cantidad de participantes deja el estado en `full`.
- Salir de una sesión en la que no se está inscrito: 409 (RF-17). El backend simulado
  responde hoy 200 sin cambios; la spec 007 (RF-10) lo alinea.
- El listado de todos los juegos sin sesiones: 200 con lista vacía.

## Fuera de alcance
- Fechas concretas (las sesiones se ubican en la semana tipo, no en el calendario).
- Notificaciones o invitaciones a otros jugadores.
- Historial de sesiones canceladas.
- Página de detalle de sesión (spec 009).

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta y,
      en las escrituras, la base de datos.
- [ ] Una prueba recorre todas las operaciones protegidas del servidor (specs 002 a 006)
      sin sesión y confirma 401 en cada una.
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
- Ninguna.
