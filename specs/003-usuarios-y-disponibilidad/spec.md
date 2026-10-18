# Spec 003 — Perfil de usuario y disponibilidad
Estado: implementada
Validada por el reviewer RF por RF; 864 tests en verde.

## Contexto y objetivo
El Hito 2 exige que cada entidad exponga listar, obtener por id, crear, actualizar y
eliminar. La spec 002 cubre la creación de usuarios; esta completa el resto de la entidad
usuario y la disponibilidad semanal, que es una de las dos mitades del cruce que define el
producto (`PRODUCT.md`, principio 1). También fija, para usuarios y disponibilidad, las
reglas de propiedad (403), de identificadores inválidos o inexistentes (400 / 404) y su
orden de revisión; las specs 004 a 006 aplican el mismo criterio a sus recursos mediante
sus propios RF y pueden reutilizar el mensaje genérico de 403 (RF-10).

- Depende de: spec 002.
- Origen: HU-07 y HU-13 (perfil y disponibilidad); RF-05, RF-06, RF-07 (sin la cascada),
  RF-08 y RF-10 de la spec original.
- Referencia técnica: `specs/_referencia/001-crear-backend-original.md`. De sus secciones 2
  (alias `me`, código 403), 4.2 (RT-07, RT-09, RT-10), 5.4 (modelo de usuario), 5.6
  (autorización y resolución de `me`), 5.7 y 8 (casos de prueba de usuarios) pasan al
  `plan.md` de esta spec solo las partes que corresponden a los RF de abajo.
- Prevalencia: si la referencia y esta spec difieren, prevalece esta spec. En particular,
  no se aplican de la sección 5.4 el uso del nombre de usuario cuando el nombre visible
  llega vacío (aquí es un error, RF-15) ni la zona horaria sin validar (aquí se valida,
  RF-16); tampoco los mensajes de error de la referencia cuando esta spec fija otro texto.
- Las dependencias nuevas (por ejemplo, la que aporte los datos de zonas horarias, si hace
  falta) se justifican en el `plan.md` de esta spec, que forma parte de la spec aprobada
  (constitución, principio 1).
- Convenciones heredadas de la spec 002: sesión válida y orden de revisión de la sesión
  (RF-24), usuario inexistente con credencial válida (RF-22), datos públicos y propios,
  longitud y respuesta de error (ver Definiciones). Heredadas de la spec 001: el cuerpo se
  interpreta antes que cualquier otra revisión, con "JSON mal formado" (400), "cuerpo
  demasiado grande" (413) y "codificación no soportada" (415) (spec 001, RF-5, RF-16 y
  RF-17); un cuerpo JSON vacío es válido.
- Nota para el plan: el `plan.md` fija la versión de la base IANA (tzdata) de la que se
  toma la tabla `zone.tab` que define las zonas válidas (Definiciones) y justifica la
  dependencia o los datos incrustados que la aporten (constitución, principio 1). El
  conjunto no puede depender de la canonización del entorno de ejecución: un entorno que
  acepte `America/Buenos_Aires` o `Asia/Calcutta` como zonas no cumple esta spec.

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
- **Bloque horario**: texto exacto `"<día>-<hora>"`, con día de 0 (lunes) a 6 (domingo) y
  hora de 0 a 23, ambos sin ceros a la izquierda, sin signos y sin espacios (ej. `"2-20"`
  = miércoles 20:00). Los bloques no se recortan: un texto con espacios en cualquier
  posición no es un bloque horario. Un valor que no es texto nunca es un bloque horario.
- **Disponibilidad**: lista de bloques horarios de un usuario, sin repetidos, en el orden
  de primera aparición con que se guardó (RF-13). Un usuario que nunca la guardó tiene la
  disponibilidad vacía.
- **Identificador recibido**: el segmento de la ruta que ocupa el lugar del identificador
  de usuario, ya decodificado según la codificación por porcentaje de las URL (RFC 3986).
  Las comparaciones con la referencia propia y la revisión de formato se hacen sobre el
  texto decodificado: `m%65` es `me`, y `%20me` es `" me"`. Un segmento con codificación
  por porcentaje mal formada (por ejemplo, `%zz` o la secuencia UTF-8 incompleta `%E0%A4`)
  no se puede decodificar: no es la referencia propia ni un identificador con formato
  válido (RF-5).
- **Referencia propia**: el texto exacto `me` (en minúsculas, sin espacios), que el cliente
  puede usar en lugar de un identificador de usuario para referirse al usuario de la
  sesión.
- **Identificador con formato válido**: texto de exactamente 24 caracteres hexadecimales
  (`0`-`9`, `a`-`f`, `A`-`F`), sin espacios ni otros caracteres. Dos identificadores con
  formato válido se comparan por valor, sin distinguir mayúsculas de minúsculas: el
  identificador de un usuario escrito en mayúsculas designa al mismo usuario.
- **Identificador propio**: la referencia propia o un identificador con formato válido
  cuyo valor es el del usuario de la sesión.
- **Datos públicos del usuario** y **datos propios del usuario**: los definidos en la
  spec 002 (públicos: identificador, nombre de usuario, nombre visible, color de avatar,
  biografía, zona horaria y fecha de creación; propios: los públicos más el correo).
- **Longitud**: la definida en la spec 002 (unidades UTF-16, un emoji puede contar como 2,
  medida después de recortar).
- **Respuesta de error**: la de la spec 002: `{ "error": "<mensaje>" }`, con el mensaje en
  español, en minúscula y sin punto final (con la salvedad de siglas y notaciones
  literales de RNF-4).
- **Campo omitido**: campo de la actualización del perfil que no viene en el cuerpo. Un
  campo que llega con cualquier valor, incluido `null`, no está omitido (RF-17). La
  definición de "campo ausente" de la spec 002 se aplica solo al registro y al inicio de
  sesión, no a esta spec.
- **Recortar**: quitar de los dos extremos de un texto exactamente los caracteres que
  quita el recorte estándar de JavaScript (`String.prototype.trim`), el mismo que ya
  aplica la implementación de la spec 002: los espacios en blanco (espacio, tabulador,
  tabulador vertical, avance de página, espacio de no separación NBSP, marca de orden de
  bytes BOM y los separadores de espacio de Unicode) y los saltos de línea (LF, CR, U+2028
  y U+2029). Ningún otro carácter se recorta; en particular, U+0085 (NEL) no se recorta.
  Los caracteres del interior del texto no se tocan.
- **Zona horaria válida**: texto que, ya recortado, es exactamente `UTC`, admitida aparte,
  o que tiene la forma `Área/Lugar` (al menos una `/`, con un área distinta de `Etc`) y
  coincide exactamente (distinguiendo mayúsculas de minúsculas) con uno de los nombres de
  zona de la tabla `zone.tab` de la base IANA, en la versión que fije el plan. Un nombre
  que no figura en esa tabla (alias, nombre obsoleto o inventado) no es válido. Un nombre
  sin `/` distinto de `UTC` nunca es válido, sea cual sea la versión de los datos de
  zonas (`CET`, `EST5EDT`, `EST`, `HST`, `Factory`). Son válidas, por ejemplo,
  `America/Santiago`, `America/Argentina/Buenos_Aires`, `Europe/Amsterdam`, `Europe/Oslo`,
  `Asia/Kuala_Lumpur` y `UTC`; no lo son `US/Eastern`, `America/Buenos_Aires`,
  `Asia/Calcutta`, `GMT`, `Etc/UTC`, `Etc/GMT-3`, `america/santiago`, `Santiago`, `GMT-3`,
  `CET`, `Factory` ni `""`.
- **Escritura en curso al eliminar la cuenta**: actualización del perfil, reemplazo de la
  disponibilidad o eliminación de la cuenta que ya había superado la revisión de la sesión
  (spec 002, RF-24) cuando se borró el usuario de la sesión. Una petición que llega
  después del borrado no está en curso: no supera la revisión de la sesión.
- **Color de avatar válido**: texto que, ya recortado, es `#` seguido de exactamente 6
  caracteres hexadecimales, en mayúsculas o minúsculas.

## Requisitos funcionales
- RF-1: EL SISTEMA exige sesión válida (spec 002, RF-24) en todas las operaciones de esta
  spec.
- RF-2: CUANDO un usuario pide el listado de usuarios, EL SISTEMA responde 200 con una
  lista de todos los usuarios registrados, ordenada por fecha de creación ascendente y, si
  dos coinciden, por identificador ascendente. Cada elemento lleva los datos públicos del
  usuario, salvo el del usuario de la sesión, que lleva sus datos propios (RF-4).
- RF-3: CUANDO un usuario pide un usuario por su identificador, sea otro usuario o él
  mismo, EL SISTEMA responde 200 con sus datos públicos o, si es el usuario de la sesión,
  con sus datos propios (RF-4).
- RF-4: EL SISTEMA incluye el correo de un usuario solo cuando el usuario consultado es el
  de la sesión, en cualquier respuesta.
- RF-5: SI un identificador de usuario no tiene formato válido o el identificador recibido
  no se puede decodificar (codificación por porcentaje mal formada, Definiciones),
  ENTONCES EL SISTEMA responde 400 con "id con formato inválido"; SI en una lectura tiene
  formato válido pero
  no corresponde a ningún usuario, ENTONCES responde 404 con "usuario no encontrado". El
  orden frente a la propiedad y al cuerpo lo fijan RF-18 y RF-19.
- RF-6: CUANDO una operación de esta spec que recibe un identificador de usuario (todas
  salvo el listado) recibe la referencia propia, EL SISTEMA la resuelve al usuario de la
  sesión antes de revisar el formato del identificador. La comparación se hace sobre el
  identificador recibido (ya decodificado). Cualquier otra variante (`Me`, `ME`, `" me"`)
  no es la referencia propia y se revisa como identificador (RF-5). Un segmento que no se
  puede decodificar tampoco es la referencia propia: responde 400 "id con formato
  inválido" en el paso del formato (RF-5, RF-18, RF-20).
- RF-7: CUANDO un usuario actualiza su propio perfil con todos los campos enviados
  válidos, EL SISTEMA modifica solo los campos enviados entre nombre visible, biografía,
  zona horaria y color de avatar, conserva los omitidos y responde 200 con los datos
  propios del usuario actualizado. Si no se envía ninguno de esos cuatro campos, no cambia
  nada y responde 200 con los datos propios actuales.
- RF-8: SI el nombre visible tiene una longitud mayor que 40, ENTONCES EL SISTEMA responde
  400 con "el nombre visible no puede superar 40 caracteres" (el mismo texto de la
  spec 002, RF-6); SI la biografía tiene una longitud mayor que 200, ENTONCES responde 400
  con "la biografía no puede superar 200 caracteres"; SI el color de avatar no es un color
  de avatar válido, ENTONCES responde 400 con "el color de avatar debe tener la forma
  #RRGGBB" (`#RRGGBB` es una notación literal, RNF-4). En los tres casos no guarda ningún
  cambio.
- RF-9: EL SISTEMA ignora al actualizar el perfil cualquier otro campo, incluidos
  identificador, correo, nombre de usuario, contraseña, hash y fecha de creación.
- RF-10: SI un usuario intenta actualizar o eliminar a otro usuario, o reemplazar la
  disponibilidad de otro usuario, ENTONCES EL SISTEMA responde 403 con "no tienes permiso
  para esta operación" y no cambia nada. El mensaje es genérico, sin nombrar el recurso,
  para que las specs 004 a 006 lo reutilicen.
- RF-11: CUANDO un usuario elimina su propia cuenta, EL SISTEMA borra el usuario y su
  disponibilidad, indica al
  navegador que elimine la cookie de la credencial con los mismos atributos con que se
  emitió (como en la spec 002, RF-14) y responde 204 sin cuerpo. Las specs 004 y 006
  agregan qué más se borra.
- RF-12: CUANDO un usuario pide la disponibilidad de un usuario existente, EL SISTEMA
  responde 200 con su lista de bloques como lista directa (no dentro de un objeto), en el
  orden guardado; si nunca la guardó, con la lista vacía.
- RF-13: CUANDO un usuario reemplaza su propia disponibilidad con un cuerpo de la forma
  `{ "blocks": [<bloques>] }` en el que todos los elementos son bloques horarios, EL
  SISTEMA guarda la lista sin repetidos, conservando el orden de primera aparición, y
  responde 200 con la lista guardada como lista directa. La lista no tiene un tope propio
  de elementos: solo rige el tamaño máximo del cuerpo (spec 001, RF-16: 413 "cuerpo
  demasiado grande" por encima de 102 400 bytes). Los campos del cuerpo distintos de
  `blocks` (por ejemplo, `"user"`) se ignoran, como en RF-9 y en la spec 002, RF-16: la
  escritura es siempre sobre el usuario de la sesión (RNF-1).
- RF-14: SI al reemplazar la disponibilidad el cuerpo no trae el campo `blocks`, ENTONCES
  EL SISTEMA responde 400 con "faltan los bloques"; SI `blocks` no es una lista (incluido
  `null`), ENTONCES responde 400 con "los bloques deben ser una lista"; SI algún elemento
  no es un bloque horario, ENTONCES responde 400 con "hay un bloque horario con formato
  inválido". Se revisa en ese orden y se responde con el primer error. En todos los casos
  se conserva la disponibilidad anterior.
- RF-15: SI la actualización del perfil incluye el nombre visible como texto vacío o
  formado solo por espacios, ENTONCES EL SISTEMA responde 400 con "el nombre visible no
  puede estar vacío" y no guarda ningún cambio.
- RF-16: SI la actualización del perfil incluye una zona horaria que es texto pero no es
  una zona horaria válida, ENTONCES EL SISTEMA responde 400 con "la zona horaria no es
  válida" y no guarda ningún cambio.
- RF-17: SI la actualización del perfil incluye el nombre visible, la biografía, la zona
  horaria o el color de avatar con un valor que no es texto (número, booleano, lista,
  objeto o `null`), ENTONCES EL SISTEMA responde 400 con "el nombre visible debe ser un
  texto", "la biografía debe ser un texto", "la zona horaria debe ser un texto" o "el
  color de avatar debe ser un texto", respectivamente, y no guarda ningún cambio.
- RF-18: CUANDO llega una escritura de esta spec (actualizar o eliminar un usuario,
  reemplazar una disponibilidad), EL SISTEMA la revisa en este orden y responde con el
  primer fallo: (1) sesión (spec 002, RF-24); (2) resolución de la referencia propia
  (RF-6); (3) decodificación y formato del identificador: 400 (RF-5); (4) si el
  identificador no es el
  identificador propio: 403 (RF-10), sin comprobar si ese usuario existe; (5) validación
  del cuerpo: 400 (RF-8, RF-14 a RF-17, en el orden de RF-19 para el perfil). Las
  revisiones de la spec 001 sobre la interpretación del cuerpo (400 "JSON mal formado",
  413 y 415) ocurren antes que todas estas.
- RF-19: CUANDO EL SISTEMA valida el cuerpo de una actualización del perfil, revisa los
  campos enviados en el orden nombre visible, biografía, zona horaria y color de avatar y,
  dentro de cada campo, primero el tipo (RF-17), después el vacío (RF-15 para el nombre
  visible; para la zona horaria y el color, el vacío es un valor no válido de RF-16 y
  RF-8) y después las demás reglas (RF-8, RF-16), y responde con el primer error
  encontrado.
- RF-20: CUANDO llega una lectura de esta spec por identificador (obtener un usuario, leer
  una disponibilidad), EL SISTEMA la revisa en este orden y responde con el primer fallo:
  (1) sesión (spec 002, RF-24); (2) resolución de la referencia propia (RF-6); (3)
  decodificación y formato del identificador: 400 (RF-5); (4) existencia: 404 "usuario no
  encontrado" (RF-5).
- RF-21: CUANDO EL SISTEMA guarda una actualización del perfil, guarda el nombre visible,
  la biografía y la zona horaria recortados, y el color de avatar recortado y en
  minúsculas. Una biografía vacía o formada solo por espacios es válida y deja la
  biografía vacía.
- RF-22: SI una actualización del perfil, un reemplazo de disponibilidad o una eliminación
  de la cuenta termina después de que se eliminó la cuenta del usuario, ENTONCES EL
  SISTEMA nunca vuelve a crear el usuario ni su disponibilidad y nunca responde 500, y
  responde así:
  - Si la petición llega después de la eliminación, responde el 401 que corresponda según
    la spec 002, RF-24, también en una segunda eliminación: "sesión no iniciada" si no trae
    la cookie de la credencial (por ejemplo, desde el navegador que eliminó la cuenta, que
    ya la borró), o "token inválido" si trae la credencial válida del usuario borrado
    (spec 002, RF-22; por ejemplo, una credencial copiada antes de eliminar).
  - Si es una actualización del perfil o un reemplazo de disponibilidad en curso
    (Definiciones), responde 200 si la escritura se aplicó antes del borrado (el borrado
    elimina después el usuario y su disponibilidad, con lo escrito, RF-11), o 404 "usuario
    no encontrado" sin ningún efecto si el usuario ya no existía al aplicarla. No admite
    otra respuesta.
  - Si es una segunda eliminación de la propia cuenta en curso, responde 204 sin cuerpo e
    indica al navegador que elimine la cookie de la credencial, como en RF-11.

## Requisitos no funcionales
- RNF-1: Las escrituras usan siempre el usuario de la sesión (constitución, principio 5).
- RNF-2: Toda respuesta de usuario contiene exactamente sus datos públicos (spec 002), más
  el correo solo cuando el consultado es el usuario de la sesión (RF-4), con la misma
  representación que la consulta de sesión de la spec 002: el identificador como texto de
  24 caracteres hexadecimales en minúsculas y la fecha de creación como texto ISO 8601 en
  UTC con milisegundos (`AAAA-MM-DDTHH:mm:ss.sssZ`, ej. `2026-10-18T14:05:09.123Z`).
  Nunca incluye el hash, la disponibilidad ni otros campos internos. El identificador
  devuelto es el del usuario guardado, no el texto enviado por el cliente: pedir un
  usuario con su identificador en mayúsculas devuelve el identificador en minúsculas.
- RNF-3: Los límites y formatos de RF-8 y RF-14 a RF-17 los aplica el servidor aunque el
  cliente no los valide.
- RNF-4: Mensajes de error en español, en minúscula y sin punto final, con la forma de la
  respuesta de error (constitución, principio 6; spec 002, RNF-7). "En minúscula" se
  refiere al texto en español: las siglas y las notaciones literales conservan su forma,
  como ya ocurre con "JSON mal formado" en la spec 001 y con `#RRGGBB` en RF-8.
- RNF-5: Comprobación de tipos, pruebas y lint del servidor en verde, sin `any`, sin
  `@ts-ignore` y sin ningún `.only` en las pruebas (constitución, principio 4).

## Casos límite
### Identificadores, propiedad y orden de revisión
- Escribir (actualizar, eliminar o reemplazar la disponibilidad) sobre un identificador
  con formato válido que no corresponde a ningún usuario: 403 "no tienes permiso para esta
  operación", no 404 (RF-18).
- Escribir sobre otro usuario con un cuerpo inválido: 403, no 400 (RF-18).
- Escribir sobre un identificador sin formato válido con un cuerpo inválido: 400 "id con
  formato inválido" (RF-18).
- Leer un usuario o una disponibilidad con un identificador con formato válido que no
  existe: 404 "usuario no encontrado" (RF-20).
- `aaaaaaaaaaaa` (12 caracteres), 23 o 25 caracteres hexadecimales, o 24 caracteres con
  alguno no hexadecimal: 400 "id con formato inválido" (RF-5).
- El identificador propio escrito en mayúsculas cuenta como propio: obtenerlo responde 200
  con el correo y con el identificador en minúsculas, y escribir sobre él no da 403
  (Identificador con formato válido, RF-4, RF-18, RNF-2).
- `me` en una operación de esta spec que recibe un identificador equivale al
  identificador propio; `Me`, `ME` o `" me"` se revisan como identificador y, al no tener
  formato válido, responden 400 "id con formato inválido" (RF-5, RF-6).
- `m%65` en la ruta es `me` (identificador recibido ya decodificado); `%20me` es `" me"`:
  400 "id con formato inválido" (RF-6).
- Un segmento con codificación por porcentaje mal formada (`%zz`, `%E0%A4`) en cualquier
  operación de esta spec que recibe un identificador: con sesión válida, 400 "id con
  formato inválido", antes del 403 en las escrituras (también con un cuerpo inválido) y
  antes del 404 en las lecturas; sin sesión, el 401 que corresponda (RF-5, RF-18, RF-20).
- Sin sesión, cualquier operación de esta spec responde el 401 que corresponda según la
  spec 002, RF-24, aunque el identificador sea inválido o el cuerpo no pase las
  validaciones de esta spec (RF-18, RF-20). Los fallos de interpretación del cuerpo de la
  spec 001 son la excepción: ver el caso siguiente.
- JSON mal formado, cuerpo de más de 102 400 bytes o codificación no soportada: 400 "JSON
  mal formado", 413 o 415 según la spec 001, antes que la sesión y que cualquier revisión
  de esta spec (RF-18).

### Listado
- El listado incluye al propio usuario, con su correo; los demás, sin correo (RF-2, RF-4).
- Dos usuarios con la misma fecha de creación aparecen ordenados por identificador (RF-2).

### Perfil
- Actualizar el perfil sin cuerpo (con tipo de contenido JSON y cuerpo vacío, que la
  spec 001 acepta, o sin tipo de contenido), con `{}`, solo con campos ignorados (RF-9),
  con un cuerpo que es una lista JSON o con un tipo de contenido distinto de JSON (el
  cuerpo no se interpreta, spec 001): no hay campos enviados, no cambia nada y responde 200
  con los datos propios actuales (RF-7).
- Un campo del perfil con `null`, número, booleano, lista u objeto: 400 "<campo> debe ser
  un texto" (RF-17). Solo omitir el campo conserva su valor (RF-7).
- Varios campos inválidos a la vez: responde el error del primero en el orden nombre
  visible, biografía, zona horaria y color; por ejemplo, nombre visible de 41 caracteres y
  color `#abc`: 400 "el nombre visible no puede superar 40 caracteres", y no se guarda
  ninguno (RF-19).
- Un campo válido y otro inválido en la misma actualización: 400 y no se guarda ninguno
  (RF-8, RF-15 a RF-17).
- Nombre visible de 40 caracteres tras recortar (aunque lleve espacios en los extremos):
  se acepta y se guarda recortado; de 41: 400 "el nombre visible no puede superar 40
  caracteres". Un emoji puede contar como 2 (Longitud) (RF-8, RF-21).
- Nombre visible vacío o solo con espacios al actualizar: 400 "el nombre visible no puede
  estar vacío" (RF-15). A diferencia del registro (spec 002, RF-6), aquí no se reemplaza
  por el nombre de usuario.
- Biografía de 200 caracteres tras recortar: se acepta y se guarda recortada; de 201: 400
  "la biografía no puede superar 200 caracteres" (RF-8, RF-21).
- Biografía `""` o solo de espacios: válida; la biografía queda vacía (RF-21).
- Zona horaria `America/Santiago`, `UTC` y `" America/Santiago "`: válidas; la última se
  guarda como `America/Santiago` (RF-16, RF-21).
- Zona horaria `"America/Santiago\n"` o color `"#abcdef\t"`: válidos; se guardan como
  `America/Santiago` y `#abcdef` (Recortar, RF-21). Lo mismo con NBSP o BOM en los
  extremos. Un espacio en el interior (`"America/ Santiago"`) no se quita y da 400.
- Zona horaria `US/Eastern`, `America/Buenos_Aires`, `Asia/Calcutta`, `GMT`, `Etc/UTC`,
  `Etc/GMT-3`, `america/santiago`, `Santiago`, `GMT-3`, `""` o solo de espacios: 400 "la
  zona horaria no es válida" (RF-16).
- Zona horaria `CET`, `EST5EDT`, `EST`, `HST` o `Factory` (nombres sin la forma
  `Área/Lugar`, aunque la base IANA los tenga como zonas canónicas): 400 "la zona horaria
  no es válida", sea cual sea la versión de los datos de zonas (RF-16).
- Zona horaria `Europe/Amsterdam`, `Europe/Oslo` o `Asia/Kuala_Lumpur`: válidas, porque
  figuran en `zone.tab`, aunque otras compilaciones de la base IANA las traten como alias
  (Zona horaria válida, RF-16).
- Color `#ABCDEF` o `" #AbCdEf "`: válido, se guarda como `#abcdef` (RF-21).
- Color `#abc`, `abcdef` (sin `#`), `""`, solo de espacios o `#abcdeg`: 400 "el color de
  avatar debe tener la forma #RRGGBB" (RF-8).

### Disponibilidad
- Guardar una lista vacía deja al usuario sin disponibilidad (válido).
- `["3-10", "1-5", "3-10"]` se guarda y se devuelve como `["3-10", "1-5"]` (RF-13).
- `"2-05"`, `"7-10"`, `"2-24"`, `" 2-20"`, `"2-20 "`, `"+2-5"`, `"-0-5"`, `20`, `null` y
  `{}` no son bloques horarios: 400 "hay un bloque horario con formato inválido" (RF-14).
  Una lista con repetidos y algún elemento inválido: 400 y no se guarda nada.
- Reemplazar la disponibilidad sin cuerpo, con `{}`, con un cuerpo que es una lista JSON o
  con un tipo de contenido distinto de JSON (el cuerpo no se interpreta, spec 001): 400
  "faltan los bloques" y se conserva la anterior (RF-14).
- `{ "blocks": "2-20" }` o `{ "blocks": null }`: 400 "los bloques deben ser una lista"
  (RF-14).
- `{ "blocks": ["2-20"], "user": "<id de otro usuario>" }` enviado sobre la propia
  disponibilidad: el campo `user` se ignora, responde 200 `["2-20"]`, guarda los bloques
  en el usuario de la sesión y la disponibilidad del otro usuario no cambia (RF-13,
  RNF-1). Cualquier otro campo además de `blocks` también se ignora.
- Una lista de bloques cuyo cuerpo supera 102 400 bytes: 413 "cuerpo demasiado grande";
  por debajo de ese tamaño no hay tope de elementos (RF-13).
- Pedir la disponibilidad de un usuario que nunca la guardó: 200 `[]` (RF-12).

### Eliminación de la cuenta
- Tras eliminar la cuenta, consultar la sesión actual desde el mismo navegador responde 401
  "sesión no iniciada", porque la cookie ya no está (RF-11). Una credencial copiada antes
  de eliminar (por ejemplo, desde otra pestaña que conservó la cookie) responde 401 "token
  inválido" en cualquier operación de esta spec y en la consulta de sesión (spec 002,
  RF-22 y RF-24 paso 5).
- Una actualización del perfil, un reemplazo de disponibilidad o una segunda eliminación
  enviados con esa credencial después de eliminar la cuenta: 401 "token inválido", el
  usuario no reaparece y no queda disponibilidad suya (RF-22).
- Una actualización del perfil o un reemplazo de disponibilidad en curso cuando se
  eliminó la cuenta: 200 si se aplicó antes del borrado (y el borrado la elimina después)
  o 404 "usuario no encontrado" sin efecto si el usuario ya no existía al aplicarla; en
  ningún caso 500 ni recreación del usuario o de su disponibilidad (RF-22).
- Dos eliminaciones simultáneas de la propia cuenta (por ejemplo, desde dos pestañas) que
  ya pasaron la revisión de la sesión: las dos responden 204 y eliminan la cookie; nunca
  500. Si la segunda llega después del borrado: el 401 de RF-22, "sesión no iniciada" si
  el navegador ya borró la cookie o "token inválido" si aún envía la credencial (RF-22).
- Tras eliminar la cuenta, el mismo correo y el mismo nombre de usuario (en cualquier
  combinación de mayúsculas) pueden volver a registrarse (spec 002, RF-3 solo compara con
  usuarios registrados).

## Fuera de alcance
- Borrar en cascada cuentas de juego y sesiones al eliminar un usuario (specs 004 y 006).
- Cambiar correo, nombre de usuario o contraseña.
- Subir imágenes de avatar.
- Paginación del listado de usuarios.
- Adaptar el contrato y los formularios de la interfaz a esta spec (correo opcional en los
  usuarios ajenos, color de avatar y zona horaria en el formulario, disponibilidad de otro
  usuario): spec 007.

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta y,
      en las escrituras, el estado de la base de datos.
- [ ] Una prueba confirma que la respuesta de otro usuario no incluye correo ni hash, y que
      la propia incluye el correo (RF-4, RNF-2).
- [ ] Una prueba comprueba que el identificador se devuelve en minúsculas y la fecha de
      creación con la forma `AAAA-MM-DDTHH:mm:ss.sssZ` (RNF-2).
- [ ] Una prueba por cada escritura sobre otro usuario (actualizar, eliminar, reemplazar la
      disponibilidad) obtiene 403 "no tienes permiso para esta operación" y comprueba que
      la base no cambió (RF-10); otra por cada escritura sobre un identificador válido
      inexistente obtiene 403, y otra sobre otro usuario con cuerpo inválido obtiene 403
      (RF-18).
- [ ] Una prueba por cada lectura por identificador obtiene 404 "usuario no encontrado"
      con un identificador válido inexistente y 400 "id con formato inválido" con
      `aaaaaaaaaaaa` (RF-5, RF-20).
- [ ] Una prueba usa `me` en cada operación de esta spec que recibe un identificador
      (todas salvo el listado), otra comprueba que `ME` responde 400 y otra que `m%65`
      equivale a `me` (RF-6), y otra que el identificador propio en mayúsculas responde
      200 con correo (Identificador con formato válido).
- [ ] Una prueba comprueba cada mensaje de RF-8 y RF-14 a RF-17 y el orden de RF-19 con
      varios campos inválidos a la vez, incluido `null` en cada campo del perfil.
- [ ] Una prueba comprueba el recorte del nombre visible, la biografía y la zona horaria,
      y el color guardado en minúsculas (RF-21).
- [ ] Una prueba comprueba cada zona horaria de los casos límite de Perfil (válidas e
      inválidas, incluidas `CET`, `Europe/Amsterdam`, `Europe/Oslo` y
      `Asia/Kuala_Lumpur`) (RF-16).
- [ ] Una prueba comprueba el orden de primera aparición de la disponibilidad guardada
      (RF-13) y otra el orden del listado (RF-2).
- [ ] Una prueba elimina la cuenta y comprueba la eliminación de la cookie con los mismos
      atributos de emisión, el 401 "sesión no iniciada" posterior y el 401 "token inválido"
      con la credencial copiada (RF-11).
- [ ] Una prueba envía, con la credencial copiada, una actualización del perfil, un
      reemplazo de disponibilidad y una eliminación después de eliminar la cuenta, obtiene
      401 "token inválido" y comprueba que el usuario y su disponibilidad no están en la
      base (RF-22).
- [ ] Una prueba de la actualización del perfil fuerza el borrado del usuario entre la
      revisión de la sesión y la escritura, obtiene 404 "usuario no encontrado" y comprueba
      que la base no tiene ni el usuario ni su disponibilidad (RF-22).
- [ ] Una prueba del reemplazo de disponibilidad fuerza el borrado del usuario entre la
      revisión de la sesión y la escritura, obtiene 404 "usuario no encontrado" y comprueba
      que la base no tiene ni el usuario ni su disponibilidad (RF-22).
- [ ] Una prueba fuerza el borrado del usuario entre la revisión de la sesión y una
      segunda eliminación, y obtiene 204 con la eliminación de la cookie (RF-22).
- [ ] Una prueba comprueba que `"America/Santiago\n"` y `"#abcdef\t"` se aceptan y se
      guardan recortados (Recortar, RF-21).
- [ ] Una prueba reemplaza la propia disponibilidad con un campo `"user"` con el id de
      otro usuario y comprueba que solo cambia la del usuario de la sesión (RF-13).
- [ ] La comprobación de tipos, las pruebas y el lint del servidor terminan en verde.
- [ ] No queda ningún `.only` en las pruebas.

## Dudas abiertas
Ninguna.

Aprobación: el usuario aprobó la spec tras la tercera revisión de QA ("SPEC LISTA"),
eligiendo "pulir y aprobar" sin otra revisión. El pulido corrigió las 6 observaciones de
severidad baja: criterio de RF-22 dividido en dos pruebas (perfil y disponibilidad);
RF-11 borra también la disponibilidad, con la rama 200 de RF-22 coherente; texto de P5
según `zone.tab`; primera viñeta de RF-22 con el 401 de la spec 002, RF-24 ("sesión no
iniciada" sin cookie, "token inválido" con la credencial del usuario borrado); "Recortar"
igual a `String.prototype.trim` (U+0085 no se recorta); y codificación por porcentaje mal
formada → 400 "id con formato inválido" en el paso del formato (RF-5, RF-6, RF-18, RF-20).

Decisiones tomadas por el usuario:
- Decisiones previas: nombre visible vacío o solo de espacios al actualizar → 400 sin
  reemplazo (RF-15); zona horaria → solo zonas IANA válidas (RF-16).
- P1. Precedencia: en las escrituras, sesión → `me` → formato (400) → 403 sin comprobar
  existencia → cuerpo (400); en las lecturas, sesión → `me` → formato (400) → existencia
  (404) (RF-18, RF-20).
- P2. Mensajes: 403 genérico "no tienes permiso para esta operación", reutilizable por las
  specs 004 a 006 (RF-10); 404 "usuario no encontrado"; textos de RF-8 y RF-14 a RF-17;
  "JSON mal formado" se reutiliza de la spec 001. El texto "faltan los bloques" es la
  regla 1 de la confirmación C.
- P3. Cualquier valor que no sea texto, incluido `null`, da 400 "<campo> debe ser un
  texto"; solo omitir conserva el valor; orden nombre visible → biografía → zona horaria →
  color y, dentro de cada campo, tipo → vacío → reglas (RF-17, RF-19). El trato de
  `blocks: null` es la regla 2 de la confirmación C.
- P4. Nombre visible y biografía se guardan recortados y la longitud se mide tras
  recortar; la biografía vacía o solo de espacios es válida (RF-21).
- P5. Zona IANA: recorte y coincidencia exacta con un nombre de la tabla `zone.tab`, más
  `UTC` (Q1). "Canónica" y "alias" se entienden según `zone.tab`, como en la Definición:
  es válido todo nombre que figura en esa tabla (aunque otras compilaciones de la base
  IANA lo traten como alias) y no lo es ninguno que no figure (alias, obsoletos, `Etc/…`,
  minúsculas y nombres no IANA → 400). Se guarda recortada (Definiciones, RF-16, RF-21).
  La versión de los datos de zonas la fija el plan.
- P6. Color: recorte, `#RRGGBB` en mayúsculas o minúsculas, guardado en minúsculas
  (Definiciones, RF-8, RF-21).
- P7. Disponibilidad: orden de primera aparición; sin tope propio, rige el límite de
  cuerpo de la spec 001 (RF-13).
- P8. Listado por fecha de creación ascendente y, si empatan, por identificador (RF-2).
- P9. Identificador: 24 caracteres hexadecimales en mayúsculas o minúsculas, comparados
  por valor; el propio en mayúsculas cuenta como propio (Definiciones).
- P10. Una escritura que termina tras eliminar la cuenta nunca recrea el usuario ni
  responde 500: 401 "token inválido" si llega después, 404 sin efecto si ya estaba en
  curso (RF-22). Q3 y Q4 lo precisan.
- P11. Zonas canónicas sin la forma `Área/Lugar`: solo valen los nombres `Área/Lugar`
  fuera de `Etc`, más `UTC`; `CET`, `EST5EDT`, `EST`, `HST` y `Factory` → 400 "la zona
  horaria no es válida", con independencia de la versión de los datos (Definiciones,
  RF-16).
- Confirmación A: `" 2-20"` es inválido; los bloques no se recortan (Definiciones).
- Confirmación B: actualizar con `{}` o solo con campos ignorados responde 200 sin
  cambios (RF-7).
- Confirmación C: el planner propuso por coherencia tres reglas y el usuario las aprobó
  como decisión suya: (1) el mensaje "faltan los bloques", con el estilo de "falta el
  correo" de la spec 002 (RF-14); (2) `{ "blocks": null }` → 400 "los bloques deben ser
  una lista" (RF-14); (3) un cuerpo que es una lista JSON equivale a no traer campos: en
  el perfil, 200 sin cambios (RF-7); en la disponibilidad, 400 "faltan los bloques"
  (RF-14).
- Q1. Zonas válidas: los nombres de la tabla `zone.tab` de la base IANA, más `UTC`
  admitida aparte; se mantienen P5 y P11. `Europe/Amsterdam`, `Europe/Oslo` y
  `Asia/Kuala_Lumpur` son válidas; `US/Eastern`, `America/Buenos_Aires` y `Asia/Calcutta`
  dan 400. El plan fija la versión de tzdata y justifica la dependencia o los datos
  incrustados (Definiciones, RF-16, nota para el plan).
- Q2. En el reemplazo de disponibilidad, los campos distintos de `blocks` se ignoran,
  como en RF-9 y en la spec 002, RF-16; la escritura es siempre sobre el usuario de la
  sesión (RF-13).
- Q3. "En curso" significa que la petición ya pasó la revisión de la sesión cuando se
  borró el usuario. Respuestas admitidas: 200 si la escritura se aplicó antes del borrado
  o 404 "usuario no encontrado" sin efecto; nunca 500 ni recreación (Definiciones,
  RF-22).
- Q4. Una segunda eliminación en curso responde 204 y elimina la cookie; si llega después
  del borrado, 401 "token inválido"; nunca 500 (RF-22).
- Q5. Recortar quita todos los espacios en blanco y saltos de línea de Unicode, igual que
  el recorte de la spec 002; `"America/Santiago\n"` y `"#abcdef\t"` son válidos y se
  guardan recortados (Definiciones, RF-21).

Deducciones del planner sin decisión nueva (derivadas de specs aprobadas; el usuario puede
objetarlas al aprobar la spec):
- El identificador recibido se compara ya decodificado (RFC 3986); RF-6 ya daba `" me"`
  como ejemplo, que en una ruta solo puede llegar codificado (RF-6, Definiciones).
- La representación del identificador (minúsculas) y de la fecha de creación
  (`AAAA-MM-DDTHH:mm:ss.sssZ`) es la que ya devuelve la consulta de sesión de la
  spec 002, para que el mismo usuario se represente igual en ambas (RNF-2).
- "En minúscula" admite siglas y notaciones literales, como "JSON mal formado" en la
  spec 001; el texto de RF-8 no cambia (RNF-4).
- Actualizar el perfil sin cuerpo equivale a `{}` (cuerpo JSON vacío válido, spec 001) y
  responde 200 sin cambios, como ya ocurre en la disponibilidad con "faltan los bloques"
  (casos límite de Perfil).
