# Spec 003 — Perfil de usuario y disponibilidad
Estado: borrador

## Contexto y objetivo
El Hito 2 exige que cada entidad exponga listar, obtener por id, crear, actualizar y
eliminar. La spec 002 cubre la creación de usuarios; esta completa el resto de la entidad
usuario y la disponibilidad semanal, que es una de las dos mitades del cruce que define el
producto (`PRODUCT.md`, principio 1). También fija las reglas de propiedad (403) y de
identificadores inválidos (400 / 404) que reutilizan las specs 004 a 006.

- Depende de: spec 002.
- Origen: HU-07 y HU-13 (perfil y disponibilidad); RF-05, RF-06, RF-07 (sin la cascada),
  RF-08 y RF-10 de la spec original.
- Las decisiones técnicas ya tomadas (sección 2 —alias `me`, código 403—, RT-07, RT-09,
  RT-10, sección 5.4 —usuario—, 5.6 —autorización y `resolveMe`—, 5.7 y 8 —`users.test.ts`)
  están en `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.

## Usuarios
- Jugador con la sesión iniciada, que mantiene su perfil y su disponibilidad.
- Jugador que mira el perfil y la disponibilidad de otros para decidir con quién jugar.

## Historias de usuario
- HU-1. Como jugador, quiero ver la lista de jugadores y el perfil de cada uno para saber
  con quién podría jugar, sin ver su correo.
- HU-2. Como jugador, quiero editar mi nombre visible, biografía, zona horaria y color de
  avatar para presentarme ante otros.
- HU-3. Como jugador, quiero eliminar mi cuenta para que mis datos dejen de estar en la
  plataforma.
- HU-4. Como jugador, quiero guardar mis bloques horarios semanales para cruzarlos con los
  de otros.
- HU-5. Como jugador, quiero leer la disponibilidad de otro jugador para calcular las horas
  que tenemos en común.
- HU-6. Como jugador, quiero que nadie más pueda modificar mi perfil ni mi disponibilidad.

## Definiciones
- **Bloque horario**: texto `"<día>-<hora>"`, con día de 0 (lunes) a 6 (domingo) y hora de
  0 a 23 sin ceros a la izquierda (ej. `"2-20"` = miércoles 20:00).
- **Disponibilidad**: conjunto de bloques horarios de un usuario, sin repetidos.
- **Referencia propia**: valor especial que el cliente puede usar en lugar de su
  identificador para referirse al usuario de la sesión.
- **Datos públicos del usuario**: los definidos en la spec 002.

## Requisitos funcionales
- RF-1: EL SISTEMA exige sesión válida (spec 002) en todas las operaciones de esta spec.
- RF-2: CUANDO un usuario pide el listado de usuarios, EL SISTEMA responde 200 con los datos
  públicos de todos los usuarios registrados.
- RF-3: CUANDO un usuario pide otro usuario por su identificador, EL SISTEMA responde 200
  con sus datos públicos.
- RF-4: EL SISTEMA incluye el correo de un usuario solo cuando el usuario consultado es el
  de la sesión, en cualquier respuesta.
- RF-5: SI un identificador de usuario no tiene un formato válido, ENTONCES EL SISTEMA
  responde 400 con "id con formato inválido"; SI tiene formato válido pero no existe,
  ENTONCES responde 404.
- RF-6: CUANDO una operación de esta spec recibe la referencia propia en lugar de un
  identificador, EL SISTEMA la resuelve al usuario de la sesión.
- RF-7: CUANDO un usuario actualiza su propio perfil, EL SISTEMA modifica solo los campos
  enviados entre nombre visible, biografía, zona horaria y color de avatar, y responde 200
  con el usuario actualizado.
- RF-8: SI el nombre visible supera 40 caracteres, la biografía supera 200 o el color no
  tiene la forma `#RRGGBB` en hexadecimal, ENTONCES EL SISTEMA responde 400 y no guarda
  ningún cambio.
- RF-9: EL SISTEMA ignora al actualizar el perfil cualquier otro campo, incluidos
  identificador, correo, nombre de usuario, contraseña, hash y fecha de creación.
- RF-10: SI un usuario intenta actualizar o eliminar a otro usuario, o modificar su
  disponibilidad, ENTONCES EL SISTEMA responde 403 y no cambia nada.
- RF-11: CUANDO un usuario elimina su propia cuenta, EL SISTEMA borra el usuario, elimina la
  cookie de sesión y responde 204. Las specs 004 y 006 agregan qué más se borra.
- RF-12: CUANDO un usuario pide la disponibilidad de cualquier usuario, EL SISTEMA responde
  200 con su lista de bloques.
- RF-13: CUANDO un usuario reemplaza su propia disponibilidad con una lista de bloques
  válidos, EL SISTEMA guarda la lista sin repetidos y responde 200 con lo guardado.
- RF-14: SI algún bloque no cumple el formato o lo enviado no es una lista, ENTONCES EL
  SISTEMA responde 400 y conserva la disponibilidad anterior.
- RF-15: SI la actualización del perfil incluye el nombre visible vacío o formado solo por
  espacios, ENTONCES EL SISTEMA responde 400 con un mensaje que exige especificar el nombre
  visible y no guarda ningún cambio.
- RF-16: SI la actualización del perfil incluye una zona horaria que no es una zona IANA
  válida (ej. `America/Santiago`), ENTONCES EL SISTEMA responde 400 con un mensaje
  específico y no guarda ningún cambio.

## Requisitos no funcionales
- RNF-1: Las escrituras usan siempre el usuario de la sesión (constitución, principio 5).
- RNF-2: Las respuestas de usuario tienen los mismos campos y formatos que consume hoy la
  interfaz (fechas en ISO 8601, identificadores como texto), salvo el correo según RF-4.
- RNF-3: Los límites de largo son los mismos que valida hoy el formulario; el servidor los
  repite porque el cliente puede saltárselo.

## Casos límite
- Guardar una lista vacía deja al usuario sin disponibilidad (válido).
- `"2-05"`, `"7-10"` y `"2-24"` son bloques inválidos (RF-14).
- El listado incluye al propio usuario, con su correo (RF-4).
- Tras eliminar la cuenta, consultar la sesión actual responde 401 y el mismo correo puede
  volver a registrarse.
- Nombre visible vacío o solo con espacios al actualizar: 400 (RF-15). A diferencia del
  registro (spec 002, RF-6), aquí no se reemplaza por el nombre de usuario. Omitir el campo
  no es un error: se conserva el nombre visible actual (RF-7).
- Zona horaria: `America/Santiago` y `UTC` son válidas; `Santiago`, `GMT-3` y el texto
  vacío responden 400 (RF-16).

## Fuera de alcance
- Borrar en cascada cuentas de juego y sesiones al eliminar un usuario (specs 004 y 006).
- Cambiar correo, nombre de usuario o contraseña.
- Subir imágenes de avatar.
- Paginación del listado de usuarios.

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta y,
      en las escrituras, el estado de la base de datos.
- [ ] Una prueba confirma que la respuesta de otro usuario no incluye correo ni hash.
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
- Ninguna. Resueltas: nombre visible vacío → 400 (decisión del usuario); zona horaria solo
  IANA válida (decisión delegada en el coordinador).
