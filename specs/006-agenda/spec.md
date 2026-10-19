# Spec 006 — Agenda de sesiones de juego
Estado: implementada (2026-10-19); cambio RF-16 (DP6-40) aprobado (2026-10-19)
Aprobada el 2026-10-18. Cambio de requisitos del 2026-10-19, tras ajustar el plan al código
real (preguntas Q1 y Q4 del plan): la credencial válida de un usuario eliminado responde 401
"token inválido" y no "sesión no iniciada" (RF-1, RF-16, RF-18, casos límite, criterios de
finalización y DP6-17; nueva DP6-39), y se corrige la frase sobre el lint (DP6-24 y "Impacto
en otras specs"). Los textos propios de la 006 mantienen mayúscula inicial y punto final (Q2).

## Contexto y objetivo
El flujo del producto termina en una sesión de juego agendada, no en una lista de perfiles
(`PRODUCT.md`, principio 3). Hoy la agenda vive en el backend simulado del navegador; esta
spec la lleva al servidor como la tercera entidad, con sus cinco operaciones REST (listar,
obtener, crear, editar y cancelar) más sumarse y salir.

- Depende de:
  - spec 002: sesión iniciada, sus tres 401 (RF-10 a RF-12), el 401 "token inválido" de la
    credencial válida de un usuario eliminado (RF-22 y RF-24) y la identificación del usuario
    por la credencial (RF-15);
  - spec 003: el usuario, la regla de identificadores (RF-5) y la eliminación de usuarios
    (RF-11), que esta spec extiende con la cascada de RF-16;
  - spec 004: la definición de juego, los textos exactos (DP-6), el orden de errores con un
    solo error por respuesta (DP-10) y el 401 "token inválido" de un usuario eliminado
    (RF-44, DP-37), además de la cuenta vinculada que exige RF-27.
- Precedentes: spec 005. Se ubica después de ella para cerrar el flujo coincidencia →
  sesión de juego; no depende de su funcionalidad, pero se apoya en sus precedentes
  (RF-13 y DP5-16 —401 "token inválido" de un usuario eliminado—, RF-17, DP5-5, DP5-11 y
  DP5-13).
- Riesgo: las specs 002 y 003 siguen en borrador. De la 002 vienen los 401 y la
  identificación del usuario por la credencial; de la 003, la regla de identificadores, la
  eliminación de usuarios y la forma del usuario. Si cambia cualquiera de esas piezas, esta
  spec debe revisarse antes de su plan.
- Origen: HU-10 y HU-13 (sesiones); RF-07 (cascada de sesiones) y RF-17 a RF-21 de la
  referencia (`specs/_referencia/001-crear-backend-original.md`, numeración de dos dígitos).
- Convención de citas: "RF-n de la referencia" se refiere a esa spec original; un "RF-n" sin
  más se refiere a esta spec.
- Las decisiones técnicas ya tomadas (sección 2 —código 409—, RT-07 a RT-12, secciones 5.4
  —sesión—, 5.5, 5.7 y 8 —pruebas de sesiones y de la aplicación—) están en la referencia y
  pasan al plan de esta spec, con las excepciones de "Qué prevalece sobre la referencia".
- Las decisiones marcadas "(DP6-n)" salen de la clarificación del 2026-10-18 (tabla al
  final; la descripción de cada bloque está encabezando la tabla), salvo DP6-39 y DP6-40, del
  2026-10-19. Las "DP-n" sin prefijo
  son las de la spec 004 y las "DP5-n", las de la 005.

### Qué prevalece sobre la referencia
- RF-19 de la referencia ("reemplaza `title`, `notes`, …"): la edición es parcial; solo
  cambian los campos enviados (RF-7, RF-26; DP6-1).
- RF-17 de la referencia (orden solo por día y hora de inicio): se agrega el desempate de
  RF-2 (DP6-15).
- Sección 5.4 de la referencia: el largo del título y de las notas se cuenta en caracteres
  Unicode tras recortar (DP6-7, DP6-8); el título no admite saltos de línea ni caracteres
  de control internos (DP6-7, DP6-23, DP6-31); crear
  exige una cuenta vinculada en el juego (RF-27, DP6-4); los numéricos solo aceptan números
  enteros JSON (DP6-2).
- HU-10 de la referencia ("sumarse a una sesión llena o en la que ya estoy → 409"): con las
  dos condiciones a la vez manda "ya inscrito" (RF-12, DP6-10).
- Sección 5.5 de la referencia (lectura del cuerpo JSON con la configuración por defecto):
  la lectura del cuerpo debe cumplir RF-15, RF-23 y RF-28: un JSON bien formado que no es
  un objeto se ignora al listar, obtener, cancelar, sumarse y salir, y da 400 al crear y
  editar; un cuerpo enviado sin declararse como JSON se trata como si no hubiera cuerpo
  (equivale a `{}`: crear → "Juego no válido.", editar → 200 sin cambios) (DP6-36).

## Usuarios
- Jugador que organiza una sesión de juego (anfitrión).
- Jugador que se suma a sesiones de juego de otros (participante).

## Historias de usuario
- HU-1. Como jugador, quiero publicar una sesión de juego en un día y una hora de la semana
  tipo para que otros se sumen.
- HU-2. Como jugador, quiero ver las sesiones de juego de la semana tipo, de un juego o de
  todos, para elegir a cuál sumarme.
- HU-3. Como jugador, quiero sumarme a una sesión de juego con cupo y salir si ya no puedo.
- HU-4. Como anfitrión, quiero editar o cancelar mi sesión de juego, y que nadie más pueda
  hacerlo.

## Definiciones
- **Juego**: el definido en la spec 004: exactamente `lol`, `r6` o `cs2`.
- **Sesión de juego**: la entidad de esta spec: juego, título, notas, día de la semana tipo
  (0 = lunes … 6 = domingo), hora de inicio, duración en horas, cupos, anfitrión,
  participantes, estado y fecha de creación. No tiene fecha de calendario.
- **Sesión iniciada**: la credencial válida de la spec 002 (cookie y comprobante anti-CSRF).
  No es una sesión de juego. **Usuario de la sesión iniciada**: el que identifica esa
  credencial (spec 002, RF-15).
- **Anfitrión**: el usuario que creó la sesión de juego.
- **Participantes**: los usuarios inscritos en la sesión de juego, sin repetidos; el
  anfitrión es siempre el primero y los demás van en el orden en que se sumaron.
- **Estado**: `open` o `full`. La sesión de juego está **llena** cuando el número de
  participantes es mayor o igual que los cupos; entonces su estado es `full`, y si no,
  `open`. El estado se recalcula en cada operación que cambia participantes o cupos (en el
  intervalo de la cascada de RF-16, una sesión de juego de la que se eliminó un
  participante que no es el anfitrión puede verse `full` con menos participantes visibles
  que cupos, RF-24). Mientras dura ese intervalo, el número de participantes que cuentan
  "llena" (RF-12) y "cupos bajo inscritos" (RF-8) es el de los guardados, incluido el
  eliminado hasta que la cascada lo quite, no el de los visibles (DP6-38).
- **Referencia de usuario**: identificador, nombre de usuario, nombre visible y color de
  avatar. Sin correo ni hash de contraseña ni ningún otro dato.
- **Representación de la sesión de juego**: lo que una respuesta entrega como "la sesión de
  juego" (RNF-1).
- **Recortar un texto**: quitarle de los dos extremos, todos los que haya seguidos, los
  caracteres de espacio en blanco y de fin de línea siguientes, y solo esos (DP6-27):
  - espacio en blanco: tabulador (U+0009), tabulador vertical (U+000B), avance de página
    (U+000C), espacio (U+0020), espacio sin separación (U+00A0), marca de orden de bytes
    (U+FEFF) y todo carácter Unicode de la categoría Zs (separador de espacio: U+1680,
    U+2000 a U+200A, U+202F, U+205F y U+3000, además de U+0020 y U+00A0);
  - fin de línea: nueva línea (LF, U+000A), retorno de carro (CR, U+000D), separador de
    línea (U+2028) y separador de párrafo (U+2029).
  Los mismos caracteres en el interior del texto no se tocan. Cualquier otro carácter,
  como U+0085 o U+200B, no se recorta. Un texto "formado solo por espacios" es uno que el
  recorte deja vacío.
- **Largo de un texto**: número de caracteres Unicode (puntos de código), no de unidades
  UTF-16: un emoji como 🎮 cuenta 1.
- **Salto de línea**: cualquiera de los cuatro caracteres de fin de línea de "Recortar":
  LF (U+000A), CR (U+000D), U+2028 o U+2029 (DP6-27). Ningún otro carácter lo es.
- **Carácter prohibido en el título**: todo carácter de la categoría Unicode Cc (control:
  U+0000 a U+001F y U+007F a U+009F, entre ellos el tabulador U+0009, LF, U+000B, U+000C,
  CR y U+0085), además de U+2028 y U+2029 (DP6-31). Se comprueba en el título ya
  recortado: los que el recorte quita de los extremos ya no están. Las notas sí los admiten.
- **Sin cuerpo**: la petición llega con un cuerpo de 0 bytes, o con un cuerpo que no se
  declara como JSON (DP6-36). Equivale a recibir `{}`; no es JSON mal formado (DP6-29).
- **Cuerpo declarado como JSON**: el que la petición anuncia como JSON. Solo a él se aplican
  RF-23 y RF-28.
- **Número entero JSON**: un valor numérico JSON (no texto, booleano ni nulo) cuyo valor es
  entero. `3` y `3.0` valen 3; `"3"`, `3.5`, `true` y `null` no lo son (DP6-2).
- **Campo ausente**: no llega en el cuerpo. Un campo con valor nulo, vacío o de tipo
  incorrecto no está ausente.
- **Filtro de juego del listado**: lo que llega para el juego en la consulta del listado.
  Puede estar ausente (no llega), vacío (llega sin texto) o repetido (llega más de una
  vez); son casos distintos (spec 004, DP-10).
- **Identificador de sesión de juego**: tiene formato válido o no según la misma regla que
  aplica la spec 003 (RF-5) a los identificadores de usuario.

## Requisitos funcionales
Mensajes: todo error responde la respuesta de error de la spec 001 con el texto exacto que
indica cada RF (spec 004, DP-6), pensado para mostrarse tal cual al jugador (spec 007,
RF-9). Los textos propios de esta spec llevan mayúscula inicial y punto final; ese estilo
difiere del de las specs 004 (DP-6) y 005 (DP5-17), que usan minúscula inicial y no llevan
punto final, y el usuario lo mantiene (Q2, 2026-10-19). Los heredados se mantienen como
están en su origen: los 401 de la spec 002 (incluido "token inválido" para el usuario
eliminado, RF-18), "id con formato inválido" (spec 003, RF-5) y "JSON mal formado"
(referencia, sección 5.7).

- RF-1: EL SISTEMA exige sesión iniciada en todas las operaciones de esta spec: sin
  credencial, 401 "sesión no iniciada"; credencial alterada o sin comprobante anti-CSRF
  válido, 401 "token inválido"; credencial expirada, 401 "sesión expirada" (spec 002, RF-10
  a RF-12). Una credencial válida cuyo usuario ya no existe responde 401 "token inválido"
  (RF-18; spec 002, RF-22). Antes que estos 401 va el paso del cuerpo de RF-20: JSON mal
  formado en todas las operaciones (RF-23) y, al crear o editar, JSON que no es un objeto
  (RF-28) (DP6-21, DP6-35).
- RF-2: CUANDO un usuario lista sesiones de juego con un filtro de juego válido (RF-22), EL
  SISTEMA responde 200 con todas las sesiones de juego de ese juego, o de todos, incluidas
  las llenas y las que organiza o en las que participa el propio usuario, ordenadas por
  día de menor a mayor; a igual día, por hora de inicio de menor a mayor; a igual hora, por
  fecha de creación de la más antigua a la más reciente; y, si también empatan, por
  identificador comparado como texto, carácter a carácter según su código Unicode, de menor
  a mayor (DP6-15).
- RF-3: CUANDO un usuario pide una sesión de juego por su identificador, EL SISTEMA responde
  200 con ella.
- RF-4: EL SISTEMA entrega toda sesión de juego con su representación (RNF-1), con el
  anfitrión y cada participante como referencias de usuario.
- RF-5: CUANDO un usuario crea una sesión de juego con datos válidos (RF-6) y tiene una
  cuenta vinculada en ese juego (RF-27), EL SISTEMA la guarda con el título y las notas
  recortados (notas ausentes = texto vacío), lo registra como anfitrión y único
  participante, deja el estado en `open`, registra el instante actual como fecha de
  creación y responde 201 con la sesión de juego.
- RF-6: SI al crear falta el juego, el título, el día, la hora de inicio, la duración o los
  cupos, o alguno de los siete campos no es válido, ENTONCES EL SISTEMA responde 400 sin
  guardar nada, con el texto del primer campo que falla en este orden (DP6-9). Crear sin
  cuerpo equivale a `{}`, por lo que responde "Juego no válido." (DP6-29):
  - juego ausente, nulo, que no es texto o que no es exactamente un juego (incluidos
    mayúsculas, espacios y vacío): "Juego no válido.";
  - [aquí se comprueba la cuenta vinculada, RF-27];
  - título ausente, nulo, que no es texto, o que tras recortar contiene un carácter
    prohibido en el título (saltos de línea y caracteres de control, incluido el tabulador)
    o tiene un largo fuera de 3 a 60 (los que el recorte quita de los extremos no son
    error, DP6-23, DP6-31): "El título debe tener entre 3 y 60 caracteres.";
  - notas nulas, que no son texto o cuyo largo tras recortar supera 160 (las notas son
    opcionales, pueden quedar vacías y admiten en su interior saltos de línea y caracteres
    de control, DP6-31): "Las notas deben ser texto de hasta 160 caracteres." (DP6-25);
  - día ausente o que no es un número entero JSON de 0 a 6: "Día no válido: usa un entero de
    0 (lunes) a 6 (domingo).";
  - hora de inicio ausente o que no es un número entero JSON de 0 a 23: "Hora de inicio no
    válida: usa un entero de 0 a 23.";
  - duración ausente o que no es un número entero JSON de 1 a 4: "Duración no válida: usa un
    entero de 1 a 4 horas.";
  - cupos ausentes o que no son un número entero JSON de 2 a 6: "Cupos no válidos: usa un
    entero de 2 a 6.".
- RF-7: CUANDO el anfitrión edita su sesión de juego con datos válidos, EL SISTEMA cambia
  solo los campos enviados entre título, notas, día, hora de inicio, duración y cupos, con
  las reglas de RF-6 salvo las de juego y cuenta vinculada (en la edición el juego no se lee
  ni se valida, RF-15), conserva los campos ausentes, recalcula el estado y responde 200 con
  la sesión de juego (DP6-1, DP6-19). Unas notas vacías o formadas solo por espacios se
  aceptan y dejan las notas como texto vacío, igual que al crear (DP6-22).
- RF-8: SI la edición deja los cupos por debajo del número de participantes, ENTONCES EL
  SISTEMA responde 400 con "No puedes dejar menos cupos que jugadores inscritos." y no
  cambia nada. Durante la cascada de RF-16 cuentan los participantes guardados, no los
  visibles (RF-24, DP6-38).
- RF-9: CUANDO el anfitrión cancela su sesión de juego, EL SISTEMA la borra y responde 204.
  Ninguna respuesta entrega un estado distinto de `open` o `full` (DP6-16).
- RF-10: SI quien edita o cancela no es el anfitrión, ENTONCES EL SISTEMA responde 403 y no
  cambia nada, con "Solo quien organiza puede editar la sesión." al editar y "Solo quien
  organiza puede cancelar la sesión." al cancelar.
- RF-11: CUANDO un usuario se suma a una sesión de juego que no está llena y en la que no
  está inscrito, EL SISTEMA lo agrega al final de los participantes, recalcula el estado y
  responde 200 con la sesión de juego. Sumarse no exige cuenta vinculada en el juego
  (DP6-4).
- RF-12: SI el usuario ya está inscrito en la sesión de juego (incluido el anfitrión en la
  suya), ENTONCES EL SISTEMA responde 409 con "Ya estás inscrito en esta sesión.", aunque
  además esté llena; SI no está inscrito y la sesión de juego está llena, ENTONCES responde
  409 con "Esta sesión ya no admite jugadores.". En ambos casos no cambia nada (DP6-10).
  Durante la cascada de RF-16, "llena" se mide con los participantes guardados, no con los
  visibles (RF-24, DP6-38).
- RF-13: CUANDO un participante que no es el anfitrión sale de una sesión de juego, EL
  SISTEMA lo quita de los participantes, recalcula el estado y responde 200 con la sesión de
  juego.
- RF-14: SI el anfitrión intenta salir de su propia sesión de juego, ENTONCES EL SISTEMA
  responde 409 con "Eres quien organiza: cancela la sesión en lugar de salir." y no cambia
  nada.
- RF-15: EL SISTEMA ignora al crear cualquier campo distinto de juego, título, notas, día,
  hora de inicio, duración y cupos; al editar, cualquier campo distinto de título, notas,
  día, hora de inicio, duración y cupos (el juego incluido, que no se lee ni se valida); y
  al listar, obtener, cancelar, sumarse o salir, el contenido del cuerpo completo, sea cual
  sea, incluido un JSON bien formado que no es un objeto (DP6-30, DP6-32). En particular
  ignora siempre identificador, anfitrión, participantes, estado y fecha de creación.
  Ignorar el contenido no exime de que el cuerpo sea JSON bien formado: si no lo es, aplica
  RF-23 (DP6-28). Sin cuerpo es válido en todas las operaciones (DP6-29).
- RF-16: CUANDO se elimina un usuario (spec 003, RF-11), EL SISTEMA borra las sesiones de
  juego que organiza, lo quita de las sesiones de juego en las que participa y recalcula el
  estado de cada una. Al completar la eliminación no queda ninguna sesión de juego
  organizada por él ni ninguna en la que figure como participante, también si la
  eliminación coincide con una creación o un sumarse suyo. Esa otra operación responde:
  - 201 o 200 si terminó antes (y la cascada la limpia);
  - el 401 "token inválido" de RF-18 si no;
  - solo al crear, el 400 "No tienes una cuenta vinculada en este juego." de RF-27 si la
    eliminación ya borró sus cuentas vinculadas (spec 004, RF-14) antes de que la
    validación las consulte; en ese caso no se guarda nada.
  Sumarse no exige cuenta vinculada (RF-11), así que ese 400 no aplica al sumarse. En los
  tres casos, al completar la eliminación no queda ninguna sesión de juego organizada por el
  usuario ni participación suya (DP6-12, DP6-39, DP6-40).
- RF-17: SI un usuario pide salir de una sesión de juego en la que no está inscrito,
  ENTONCES EL SISTEMA responde 409 con "No estás inscrito en esta sesión." y no cambia nada.
- RF-18: SI la credencial es válida (firma, vigencia y comprobante) pero su usuario ya no
  existe (fue eliminado), ENTONCES EL SISTEMA responde 401 con "token inválido" (el mismo
  texto que la credencial alterada de RF-1; "sesión no iniciada" queda solo para la
  credencial ausente) en cualquier operación de esta spec (salvo que antes aplique RF-23 o
  RF-28) y no crea ni cambia nada (spec 002, RF-22 y RF-24; spec 004, RF-44 y DP-37; spec
  005, RF-13 y DP5-16; DP6-17 y DP6-39).
- RF-19: SI el identificador de sesión de juego al obtener, editar, cancelar, sumarse o
  salir no tiene formato válido, ENTONCES EL SISTEMA responde 400 con "id con formato
  inválido"; SI tiene formato válido pero no existe, ENTONCES responde 404 con "Sesión no
  encontrada.".
- RF-20: EL SISTEMA resuelve cada operación en este orden y responde solo el primer error
  (DP6-14). Única excepción a "401 primero": un solo paso del cuerpo, antes que la sesión
  iniciada, que comprueba en todas las operaciones que el cuerpo declarado como JSON esté
  bien formado (RF-23) y, al crear o editar, que además sea un objeto (RF-28); en ambos
  casos responde 400 "JSON mal formado" (DP6-21, DP6-32, DP6-35). Después:
  - obtener, sumarse y salir: sesión iniciada (401, RF-1 y RF-18) → formato del
    identificador (400, RF-19) → existencia (404, RF-19) → conflicto (409: al sumarse
    RF-12; al salir RF-14 y después RF-17);
  - editar: sesión iniciada → formato del identificador → existencia → anfitrión (403,
    RF-10) → datos (400: RF-6/RF-26 en su orden y después RF-8);
  - cancelar: sesión iniciada → formato del identificador → existencia → anfitrión (403,
    RF-10);
  - crear: sesión iniciada → datos (400, RF-6 con RF-27 tras el juego);
  - listar: sesión iniciada → filtro de juego (400, RF-22).
- RF-21: EL SISTEMA usa siempre al usuario de la sesión iniciada como anfitrión al crear y
  como quien se suma o sale; cualquier identificador de usuario que llegue en el cuerpo se
  ignora (constitución, principio 5; spec 002, RF-15).
- RF-22: CUANDO el filtro de juego del listado está ausente o es exactamente `all`, EL
  SISTEMA lista todas las sesiones de juego; CUANDO es exactamente un juego, solo las de
  ese juego. SI está vacío, repetido o tiene cualquier otro valor (incluidos mayúsculas y
  espacios), ENTONCES responde 400 con "Juego no válido." (DP6-3). Cualquier otro parámetro
  de la consulta se ignora (DP6-20).
- RF-23: SI cualquier operación de esta spec (listar, obtener, crear, editar, cancelar,
  sumarse o salir) recibe un cuerpo declarado como JSON que no es JSON bien formado,
  ENTONCES EL SISTEMA responde 400 con "JSON mal formado" y no crea ni cambia nada
  (referencia, sección 5.7). Vale también en las operaciones que no usan el cuerpo
  (listar, obtener, cancelar, sumarse y salir; DP6-28). Forma parte del paso del cuerpo de
  RF-20, el primero de cada operación: va antes que los 401 de RF-1 y RF-18 (DP6-21,
  DP6-37). Una petición sin cuerpo, incluido un cuerpo no declarado como JSON, no es JSON
  mal formado (DP6-29, DP6-36).
- RF-24: Durante el intervalo de la cascada de RF-16 (spec 005, RF-17 y DP5-11; DP6-18,
  DP6-34):
  - SI el anfitrión de una sesión de juego ya no existe, ENTONCES EL SISTEMA omite sin error
    esa sesión de juego del listado y responde 404 "Sesión no encontrada." al obtenerla,
    editarla, cancelarla, sumarse o salir, como si no existiera;
  - SI un participante que no es el anfitrión ya no existe, ENTONCES EL SISTEMA mantiene
    visible la sesión de juego (aparece en el listado y obtenerla responde 200) y la entrega
    sin ese participante en la lista de participantes; hasta que la cascada recalcula su
    estado, puede mostrarse `full` con menos participantes visibles que cupos (DP6-26);
  - MIENTRAS esa sesión de juego conserve guardado a un participante eliminado, EL SISTEMA
    cuenta los participantes guardados (incluido el eliminado), no los visibles, para
    decidir si está llena al sumarse (RF-12) y si los cupos quedan bajo los inscritos al
    editar (RF-8) (DP6-38).
- RF-25: CUANDO llegan a la vez varias operaciones sobre la misma sesión de juego, EL
  SISTEMA deja el resultado igual que si se hubieran procesado una después de la otra, en
  algún orden (spec 004, RF-39 y DP-29; DP6-11). En particular:
  - dos usuarios se suman al último cupo: uno recibe 200 y el otro 409 "Esta sesión ya no
    admite jugadores.";
  - el mismo usuario se suma dos veces: una recibe 200 y la otra 409 "Ya estás inscrito en
    esta sesión.";
  - el anfitrión baja los cupos mientras alguien se suma: nunca quedan más participantes que
    cupos; la operación perdedora responde 400 (RF-8) o 409 (RF-12);
  - el anfitrión cancela mientras alguien se suma: después del 204, la otra operación
    responde 404 "Sesión no encontrada." si no terminó antes, y la sesión de juego no
    vuelve a existir.
- RF-26: SI la edición incluye un campo editable con valor nulo, de tipo incorrecto o con un
  valor que RF-6 rechaza (incluido el título vacío o formado solo por espacios), ENTONCES EL
  SISTEMA responde 400 con el texto de ese campo de RF-6 y no cambia nada; CUANDO la
  edición llega sin cuerpo, con `{}` o solo con campos ignorados, EL SISTEMA responde 200
  con la sesión de juego sin cambios (DP6-1, DP6-29). La regla "vacío → 400" no aplica a las notas: `notes: ""` (o solo
  espacios, en el sentido de "Recortar") se acepta y borra las notas (RF-7, DP6-22).
- RF-27: SI al crear, con un juego válido, el usuario de la sesión iniciada no tiene una
  cuenta vinculada en ese juego (spec 004), ENTONCES EL SISTEMA responde 400 con "No tienes
  una cuenta vinculada en este juego." y no guarda nada. Se comprueba después de "Juego no
  válido." y antes del título (DP6-4, DP6-9). Desvincular la cuenta después no afecta a las
  sesiones de juego ya creadas.
- RF-28: SI al crear o editar el cuerpo es JSON bien formado pero no es un objeto (por
  ejemplo `[]`, `3`, `"x"`, `true` o `null`), ENTONCES EL SISTEMA responde 400 con "JSON mal
  formado" y no crea ni cambia nada. Se comprueba en el mismo paso del cuerpo que RF-23,
  antes que la sesión iniciada (RF-20; DP6-35). En listar, obtener, cancelar, sumarse y
  salir ese cuerpo se ignora (RF-15; DP6-32).

## Requisitos no funcionales
- RNF-1: La representación de la sesión de juego tiene exactamente los campos `id`,
  `gameId`, `hostId`, `host`, `title`, `notes`, `day`, `startHour`, `durationHours`,
  `slots`, `participants`, `status` y `createdAt`, que son los que consume hoy la agenda.
  `hostId` es el identificador del anfitrión e igual al de `host`; `host` y cada elemento
  de `participants` son referencias de usuario; `status` vale `open` o `full`; las fechas
  van en ISO 8601 y los identificadores como texto.
- RNF-2: EL SISTEMA guarda y devuelve título y notas tal como quedan tras recortarlos, sin
  interpretarlos, escaparlos ni transformarlos: un título `<script>alert(1)</script>` se
  guarda y se devuelve idéntico. Mostrarlos como texto y no como HTML es responsabilidad de
  la interfaz (spec 007, RNF-2; spec 009, RNF-3; ver "Impacto en otras specs").
- RNF-3: La validación de los datos, la lectura del filtro de juego, el cálculo del estado y
  el orden del listado son reglas puras, sin acceso a datos, transporte ni reloj; el
  instante actual llega como dato (constitución, principio 3).
- RNF-4: Esta spec no agrega dependencias ni variables de entorno (constitución, principio
  1).

## Casos límite
- Listado sin ninguna sesión de juego, de todos los juegos o de un juego concreto: 200 con
  lista vacía.
- El listado incluye las sesiones de juego llenas y las propias (como anfitrión o
  participante) (RF-2).
- Dos sesiones de juego el mismo día y a la misma hora: va primero la creada antes; con la
  misma fecha de creación, la de identificador menor como texto (RF-2).
- Filtro `all` o ausente: todas. Filtro `ALL`, `LOL`, ` lol `, vacío (`game=`), repetido
  (`game=lol&game=cs2`) o `xyz`: 400 "Juego no válido." (RF-22).
- Parámetros desconocidos en el listado (ej. `page=2`): se ignoran (RF-22).
- Una sesión de juego del domingo (día 6) a las 23 con 4 horas de duración: se guarda con
  día 6 y hora 23, sin partirse; termina el lunes de la semana tipo siguiente.
- Crear sin cuenta vinculada en el juego: 400 "No tienes una cuenta vinculada en este
  juego." (RF-27). Con juego inválido y sin cuenta: 400 "Juego no válido." (RF-6). Con
  cuenta y título inválido: 400 del título.
- Desvincular la cuenta del juego después de crear la sesión de juego: la sesión sigue
  igual (RF-27). Sumarse sin cuenta vinculada en el juego: se permite (RF-11).
- Título `"  ab  "`: tras recortar tiene 2 caracteres → 400 del título. Título de 60 emojis:
  válido; de 61: 400 (largo en puntos de código). Título `"Ranked\nnoche"`,
  `"Ranked\rnoche"`, `"Ranked\u000Bnoche"`, `"Ranked\u000Cnoche"` o `"Ranked\u0085noche"`:
  400 del título (DP6-31). Título `"Ranked\n"` o `"\r\nRanked"`: se acepta y se
  guarda `"Ranked"` (el salto se comprueba tras recortar, DP6-23).
- Tabulador en el título (DP6-31): `"Ranked\tnoche"` (tabulador interno) pasa a ser
  rechazado: 400 del título. `"\tRanked\t"`: se acepta y se guarda `"Ranked"` (el recorte
  quita los tabuladores de los extremos). Notas `"a\tb"` o con U+0085 interno: válidas.
- Recorte con espacios Unicode (DP6-27): título `" Ranked﻿"`,
  `"　Ranked "` o `" Ranked "`: se acepta y se guarda `"Ranked"`.
  Título `"　ab　"`: tras recortar tiene 2 caracteres → 400 del título. Título
  `"Ranked noche"` o `"Ranked noche"`: 400 del título (salto interno). Título
  `"Ranked noche"`: válido, se guarda con el U+00A0 interno intacto. Título
  `"​Ranked"`: U+200B no se recorta y cuenta en el largo. Notas formadas solo por
  U+00A0, U+FEFF o U+3000: quedan como texto vacío.
- Título `"<script>alert(1)</script>"`: se guarda y se devuelve idéntico (RNF-2).
- Notas ausentes: se guardan como texto vacío. Notas con saltos de línea: válidas. Notas de
  161 caracteres tras recortar, `null` o `5`: 400 "Las notas deben ser texto de hasta 160
  caracteres." (RF-6, DP6-25). Notas de 160 emojis: válidas (largo en puntos de código).
- Día `"3"`, `3.5`, `true`, `null` o `7`: 400 del día. Día `3.0`: vale 3 (RF-6).
- Hora de inicio 0 y 23: válidas; 24 y -1: 400 de la hora (RF-6).
- Varios campos inválidos a la vez: solo el error del primero según el orden de RF-6.
- Editar enviando solo `slots`: cambian los cupos y se conservan los demás campos (RF-7).
- Editar sin cuerpo, con `{}` o solo con campos ignorados (incluido un juego inexistente):
  200 sin cambios (RF-26, RF-15, DP6-29).
- Crear sin cuerpo: 400 "Juego no válido." (RF-6, DP6-29); sin cuerpo y sin credencial,
  401 (RF-20).
- Crear o editar con cuerpo `[]`, `3`, `"x"`, `true` o `null`: 400 "JSON mal formado",
  también sin credencial (RF-28). Listar, obtener, cancelar, sumarse o salir con esos
  cuerpos o sin cuerpo: se ignoran y la operación sigue normalmente (RF-15).
- Editar con `title: null`, `title: ""` o `day: "3"`: 400 con el texto de ese campo (RF-26).
- Editar con `notes: ""` o `notes: "   "`: 200 y las notas quedan como texto vacío; con
  `notes: null`: 400 "Las notas deben ser texto de hasta 160 caracteres." (RF-7, RF-26).
- Editar los cupos a exactamente el número de participantes: estado `full`. Subir los cupos
  de una sesión de juego llena: vuelve a `open` (RF-7).
- Editar con cupos `1`: 400 de los cupos (RF-6), no el de RF-8. Editar con cupos válidos por
  debajo de los participantes: 400 de RF-8.
- Sumar al último participante: estado `full`; si luego alguien sale, vuelve a `open`.
- El anfitrión se suma a su propia sesión de juego: 409 "Ya estás inscrito en esta sesión."
  (RF-12).
- Sumarse a una sesión de juego llena en la que ya se está inscrito: 409 "Ya estás inscrito
  en esta sesión." (RF-12).
- Salir de una sesión de juego en la que no se está inscrito: 409 "No estás inscrito en esta
  sesión." (RF-17).
- Crear, sumarse o salir enviando un identificador de usuario, un anfitrión o participantes
  en el cuerpo: se ignoran y se usa al usuario de la sesión iniciada (RF-15, RF-21).
- Un no anfitrión edita con datos inválidos o con cupos bajo los participantes: 403
  (RF-20).
- Editar o cancelar un identificador inexistente con datos inválidos (cuerpo JSON objeto
  bien formado con valores que incumplen RF-6 o RF-26): 404 (RF-20).
- Identificador mal formado de una sesión de juego (sea de quien sea): 400 "id con formato
  inválido" (RF-19, RF-20).
- Salir de una sesión de juego inexistente: 404 "Sesión no encontrada." (RF-19).
- Se permiten sesiones de juego duplicadas (mismos datos), solapadas con otras del mismo
  anfitrión y fuera de la disponibilidad del anfitrión; no hay regla que lo impida
  (DP6-13).
- Petición con una credencial todavía válida de un usuario ya eliminado: 401 "token
  inválido", no "sesión no iniciada" (RF-18, DP6-39).
- Sesión de juego cuyo anfitrión ya no existe durante la cascada: no aparece en el listado
  y obtenerla da 404 (RF-24). Sesión de juego con un participante (no anfitrión) que ya no
  existe: sigue en el listado y obtenerla da 200, sin ese participante en la lista, y puede
  seguir en `full` con menos participantes visibles que cupos hasta que la cascada
  recalcula el estado (RF-24, DP6-34).
- Sesión de juego de 3 cupos con anfitrión y dos participantes guardados, uno de ellos ya
  eliminado y todavía no quitado por la cascada (2 visibles): sumarse responde 409 "Esta
  sesión ya no admite jugadores." y editar los cupos a 2 responde 400 "No puedes dejar
  menos cupos que jugadores inscritos.", porque cuentan los 3 guardados, no los 2
  visibles (RF-8, RF-12, RF-24, DP6-38). Cuando la cascada lo quita, la sesión vuelve a
  `open` y ambas operaciones se resuelven con 2 participantes.
- Último cupo, doble sumarse, bajar cupos o cancelar mientras alguien se suma: RF-25.
- Eliminar un usuario mientras crea o se suma a una sesión de juego: no queda nada suyo al
  terminar la eliminación. La otra operación responde 201 o 200 si terminó antes, 401
  "token inválido" si no, o, solo al crear, 400 "No tienes una cuenta vinculada en este
  juego." si la eliminación ya borró sus cuentas antes de validar (no se guarda nada);
  sumarse nunca da ese 400 (RF-11, RF-16, RF-27, DP6-40).
- Cuerpo con JSON mal formado: 400 "JSON mal formado" (RF-23), también sin credencial, con
  credencial inválida o expirada, o con la de un usuario eliminado: el 400 va antes que el
  401 (RF-20, DP6-21).
- Listar, obtener, cancelar, sumarse o salir con un cuerpo de JSON mal formado: 400 "JSON
  mal formado", aunque esas operaciones no usen el cuerpo y aunque la petición sea válida
  en todo lo demás; no cambia nada (RF-23, RF-15, DP6-28).
- Cuerpo enviado sin declararse como JSON: se trata como sin cuerpo; crear → 400 "Juego no
  válido.", editar → 200 sin cambios, las demás operaciones siguen normalmente (DP6-36).

## Fuera de alcance
- Fechas concretas: las sesiones de juego se ubican en la semana tipo, no en el calendario.
- Notificaciones o invitaciones a otros jugadores.
- Historial de sesiones de juego canceladas y el estado `cancelled` (DP6-16).
- Cambiar el juego de una sesión de juego existente.
- Expulsar participantes o transferir el rol de anfitrión.
- Impedir sesiones de juego duplicadas, solapadas o fuera de la disponibilidad (DP6-13).
- Paginación del listado.
- Página de detalle de sesión (spec 009) y cambios en la interfaz (spec 007).

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta (con
      el texto exacto del mensaje en cada error) y, en las escrituras, la base de datos.
- [ ] Las reglas puras (RNF-3) tienen pruebas unitarias: números enteros JSON (`3`, `3.0`,
      `"3"`, `3.5`, `true`, `null`), extremos de cada rango, recorte (incluidos U+00A0,
      U+FEFF, U+3000, U+2028 y U+2029 en los extremos, y un carácter que no se recorta como
      U+200B), largo en puntos de código (60 y 61 emojis), caracteres prohibidos en el
      interior del título (LF, CR, U+2028, U+2029, tabulador, U+000B, U+000C y U+0085),
      notas con saltos de línea y caracteres de control,
      estado (llena con participantes ≥ cupos), filtro de juego (ausente, `all`, vacío,
      repetido, mayúsculas) y cada nivel de desempate del orden de RF-2.
- [ ] Hay una prueba por cada salto del orden de RF-20 y de RF-6, incluidos: no anfitrión
      con datos inválidos → 403, no anfitrión con cupos bajo los participantes → 403,
      identificador inexistente con datos inválidos → 404, identificador mal formado de una
      sesión ajena → 400, salir de una inexistente → 404, juego inválido sin cuenta
      vinculada → "Juego no válido.", JSON mal formado sin credencial → 400 "JSON mal
      formado", JSON mal formado en una operación que no usa el cuerpo (listar, obtener,
      cancelar, sumarse o salir) → 400 "JSON mal formado".
- [ ] Hay pruebas del cuerpo (DP6-29, DP6-32): crear sin cuerpo → "Juego no válido.";
      editar sin cuerpo → 200 sin cambios; crear y editar con `[]`, `3`, `"x"`, `true` y
      `null` → 400 "JSON mal formado" (también sin credencial); una operación que ignora el
      cuerpo con un JSON que no es objeto y sin cuerpo → respuesta normal; crear y editar
      con un cuerpo no declarado como JSON → "Juego no válido." y 200 sin cambios (DP6-36).
- [ ] Hay pruebas de edición de notas (`""` y solo espacios → 200 con notas vacías; `null`
      → 400) y de título con un carácter prohibido en un extremo (se acepta recortado si el
      recorte lo quita) y en el interior (400), con LF, CR, U+2028, U+2029 y tabulador.
- [ ] Una prueba confirma que el anfitrión y cada participante traen solo los cuatro datos
      de la referencia de usuario, sin correo ni hash, y que la representación tiene
      exactamente los campos de RNF-1.
- [ ] Una prueba confirma que crear, sumarse y salir con identificadores de otro usuario en
      el cuerpo actúan sobre el usuario de la sesión iniciada (RF-21).
- [ ] Una prueba guarda un título y unas notas con `<script>` y comprueba que se devuelven
      idénticos (RNF-2).
- [ ] Hay pruebas de concurrencia de RF-25 (último cupo, doble sumarse, bajar cupos mientras
      alguien se suma, cancelar mientras alguien se suma) y de la cascada de RF-16 (sesiones
      organizadas borradas, participaciones quitadas con estado recalculado, y eliminación
      simultánea a una creación y a un sumarse). La prueba de la creación admite 201, 401
      "token inválido" o 400 "No tienes una cuenta vinculada en este juego." (RF-27), y la
      del sumarse admite 200 o 401; en todos los casos comprueba que no queda ninguna
      sesión de juego ni participación del usuario eliminado (DP6-40).
- [ ] Hay una prueba de RF-18 (credencial de un usuario eliminado → 401 "token inválido")
      y otras de RF-24: anfitrión inexistente → sesión omitida del listado y 404
      por id; participante inexistente → sesión visible en el listado y 200 por id, sin ese
      participante en la lista.
- [ ] Una prueba recorre todas las operaciones protegidas del servidor de las specs 002 a
      006 (las de la spec 002 son solo la consulta de la sesión actual; quedan fuera el
      registro, el inicio y el cierre de sesión) sin credencial y confirma 401 "sesión no
      iniciada" en cada una; y recorre las operaciones de esta spec con la credencial de un
      usuario eliminado y confirma 401 "token inválido" (RF-18). En ambos recorridos cada
      petición envía un objeto JSON o ningún cuerpo, porque un cuerpo mal formado (o, al
      crear o editar, uno que no es objeto) respondería antes el 400 de RF-23 o RF-28
      (DP6-21, DP6-28, DP6-32).
- [ ] Pruebas y comprobación de tipos del servidor en verde (el lint no se exige, DP6-24).

## Dudas abiertas
Ninguna.

## Impacto en otras specs
No se editan desde aquí; cada cambio se hace en su spec cuando el usuario lo apruebe.
- Spec 001: el servidor ya tiene un comando de lint y está en verde (comprobado el
  2026-10-19 en las specs 001 a 005). Esta spec no lo exige como criterio de finalización
  (DP6-24, decisión del usuario Q4 del 2026-10-19); exigirlo, si se quisiera, sería un
  cambio de criterio de esta spec, no de la 001.
- Specs 004 y 005: el orden de errores es global al servidor, así que deben adoptar la
  misma excepción del paso del cuerpo antes de la sesión iniciada (en la 004, su RF-29).
  Se actualizarán por el flujo de cambio de requisitos, no desde esta spec (DP6-37).
- Spec 003 (en borrador): su RF-11 remite a esta spec para la cascada (RF-16). Conviene que
  adopte el 401 de un usuario eliminado (RF-18) para sus propias operaciones, como ya
  pidió la spec 004.
- Spec 007:
  - Su RF-10 (el modo simulado responde con los mismos códigos y formas que el servidor)
    obliga a que el backend simulado del navegador adopte: 409 al salir sin estar inscrito
    (hoy responde 200 sin cambios); el recálculo del estado al salir y al editar; los
    textos exactos de esta spec (hoy usa "La sesión no existe." en vez de "Sesión no
    encontrada." y "Sesión no válida o expirada." en vez de los 401); "ya inscrito" antes
    que "llena" al sumarse (hoy comprueba primero que esté llena, DP6-10); el desempate del
    listado (RF-2); la validación de RF-6 (título, notas, números enteros, filtro de juego)
    con el texto único de notas inválidas (DP6-25), las notas vacías al editar (DP6-22) y
    la cuenta vinculada al crear (RF-27).
  - La interfaz de creación debe reflejar RF-27: un jugador sin cuenta en un juego recibe
    el 400 de RF-27 al crear; conviene ofrecer solo los juegos con cuenta vinculada o
    mostrar ese mensaje.
  - El tipo de estado de sesión del dominio del cliente incluye `cancelled`,
    que el servidor nunca emite (RF-9, DP6-16); la interfaz no debe depender de él.
  - Su RNF-2 (contenido de otros usuarios nunca como HTML) recoge la parte de interfaz de
    RNF-2 de esta spec: título y notas se muestran como texto.
  - El mínimo de 3 caracteres del título (DP6-5), el largo en puntos de código y las mismas
    reglas del servidor para el título (recorte de DP6-27, y prohibición de saltos de línea
    y caracteres de control internos tras recortar, DP6-23 y DP6-31) también deben
    aplicarse en el formulario de creación de la agenda (DP6-33).
- Spec 009:
  - Su RF-4 ("las mismas validaciones que el formulario de creación") debe incluir el mínimo
    de 3 caracteres del título, el largo en puntos de código y las mismas reglas del
    servidor para el título: recorte, y sin saltos de línea ni caracteres de control
    internos (DP6-5, DP6-7, DP6-23, DP6-27, DP6-31, DP6-33), y aceptar notas vacías al
    editar (DP6-22).
  - Su RNF-3 recoge la parte de interfaz de RNF-2 de esta spec (título y notas como texto).
  - Su caso límite de la sesión que cruza la medianoche es coherente con esta spec: el
    servidor guarda día y hora de inicio sin partir la sesión de juego.

## Decisiones de la clarificación (2026-10-18)
Bloque A: correcciones aprobadas íntegras por el usuario. Bloque B: decisiones respondidas
por el usuario. Bloque C: respuestas del usuario a las dudas de la segunda ronda (C-1 a C-5)
y puntos propuestos por el planificador que el usuario aceptó tal cual (C-6). Bloque D:
respuestas del usuario a las incoherencias de la tercera ronda (D-a y D-b; D-c es solo una
nota en los criterios de finalización). Bloque E: respuestas del usuario a los huecos de la
cuarta ronda (E-1 a E-5). Bloque F: decisiones del usuario y correcciones de coherencia de
la segunda pasada de QA del revisor (F-1 a F-4) y la última decisión del usuario antes de
aprobar la spec (F-5). Bloque G (2026-10-19): decisiones del usuario al ajustar el plan al
código real: Q1 (DP6-39, texto del 401 del usuario eliminado), Q2 (se mantiene el estilo de
texto de la 006, nota en "Mensajes"), Q3 (cascada, solo afecta al plan), Q4 (nota en DP6-24) y, tras la validación, DP6-40 (laguna
de RF-16 señalada por el reviewer: el 400 de RF-27 en la carrera eliminar + crear).

| DP | Origen | Decisión | Alternativa descartada |
| --- | --- | --- | --- |
| DP6-1 | Usuario (B-1) | Edición parcial: solo cambian los campos enviados; ausente conserva su valor; nulo, de tipo incorrecto o inválido → 400 (las notas vacías son la excepción, DP6-22); cuerpo vacío o solo con campos ignorados → 200 sin cambios (como RF-40 de la spec 004). | Reemplazo completo (RF-19 de la referencia): obliga a enviar todos los campos y un olvido borraría las notas o daría 400. |
| DP6-2 | Usuario (B-2) | Día, hora, duración y cupos solo como número entero JSON; `"3"`, `3.5`, `true` y `null` → 400; `3.0` vale 3. | Convertir texto a número o truncar decimales: oculta errores del cliente. |
| DP6-3 | Usuario (B-3) | Filtro del listado: ausente o `all` = todos; vacío, repetido o fuera del catálogo → 400 "Juego no válido." (como DP-10 y DP5-5). | Tratar vacío o repetido como "todos": oculta un error del cliente. |
| DP6-4 | Usuario (B-4) | Crear exige cuenta vinculada en el juego (400, tras el juego); sumarse no la exige; desvincular después no afecta. | No exigirla: permite organizar sesiones de un juego que el anfitrión no tiene vinculado. Exigirla también al sumarse: dejaría fuera a quien aún no vincula su cuenta. |
| DP6-5 | Usuario (B-5) | Título de al menos 3 caracteres en el servidor; la interfaz adopta el mismo mínimo. | Que el servidor acepte lo que acepte hoy la interfaz: el mínimo de la referencia (5.4) quedaría sin efecto. |
| DP6-6 | Usuario (B-6) | Hora de inicio de 0 a 23 en el servidor; la rejilla de la interfaz es presentación. | Limitar el servidor a las horas que muestra la rejilla: ata la regla a una decisión visual. |
| DP6-7 | Usuario (B-7) | Título recortado, largo en puntos de código tras recortar, sin saltos de línea ni caracteres de control internos (400 con el mensaje del título; ver DP6-23 y DP6-31). | Contar unidades UTF-16: un emoji contaría 2 y el límite dependería de la codificación. |
| DP6-8 | Usuario (B-8) | Notas opcionales (ausentes = texto vacío), recortadas, máximo 160 tras recortar, con saltos de línea; nulas o no texto → 400. | Tratar nulo como ausente: oculta un error del cliente. |
| DP6-9 | Usuario (B-9) | Textos exactos y orden de validación: juego → cuenta vinculada → título → notas → día → hora → duración → cupos; después RF-8; solo el primer error. | Mensajes genéricos o todos los errores a la vez: distinto de DP-6 y DP-10 de la spec 004. |
| DP6-10 | Usuario (B-10) | Al sumarse se comprueba primero la inscripción: inscrito y llena → "Ya estás inscrito en esta sesión.". | Comprobar primero que esté llena (lo que hace hoy el backend simulado): le diría a un inscrito que no puede entrar a una sesión en la que ya está. |
| DP6-11 | Usuario (B-11) | Operaciones simultáneas = resultado de alguna ejecución en serie (precedente RF-39 y DP-29 de la spec 004). | No garantizar nada: dos jugadores podrían ocupar el último cupo o una sesión cancelada recibir un participante. |
| DP6-12 | Usuario (B-12) | Cascada completa al eliminar un usuario, también ante una creación o un sumarse simultáneo; durante el intervalo, RF-24. | Cascada sin garantía: podrían quedar sesiones de un anfitrión inexistente. |
| DP6-13 | Usuario (B-13) | Se permiten sesiones duplicadas, solapadas y fuera de la disponibilidad del anfitrión. | Rechazarlas: regla nueva sin necesidad del producto y que la interfaz no anticipa. |
| DP6-14 | Bloque A (A12) | Orden de errores con un solo error: paso del cuerpo (JSON mal formado en todas; no objeto al crear o editar; DP6-21, DP6-35) → 401 → formato del id → existencia → anfitrión → datos → conflicto (precedente RF-29 de la spec 004). | Validar el cuerpo antes del anfitrión: daría a un no anfitrión detalles de validación de una sesión ajena. |
| DP6-15 | Bloque A (A10) | Desempate del listado: día → hora de inicio → fecha de creación → identificador como texto. | Sin desempate: orden no determinista y pruebas frágiles. |
| DP6-16 | Bloque A (A15) | Cancelar borra; el estado `cancelled` nunca se emite. | Marcar como `cancelled`: exige historial y filtros que están fuera de alcance. |
| DP6-17 | Bloque A (A3); texto precisado por DP6-39 | Credencial válida de un usuario eliminado → 401 (spec 004, DP-37); el texto es "token inválido" (DP6-39; la versión del 2026-10-18 decía "sesión no iniciada"). | 404: dejaría a la interfaz dentro de la aplicación con una sesión inútil. |
| DP6-18 | Bloque A (A18) | Sesión de juego de un anfitrión inexistente o participante inexistente se omite sin error (spec 005, DP5-11); precisado en DP6-34. | 500 o referencia nula: rompería el listado de todos o la forma de la sesión. |
| DP6-19 | Bloque A (A14) | En la edición el juego no se lee ni se valida. | Validarlo: un campo ignorado (RF-15) podría dar 400. |
| DP6-20 | Usuario (C-6) | Parámetros desconocidos del listado se ignoran (precedente DP5-13). | Responder 400: un cliente con parámetros de caché dejaría de funcionar sin motivo. |
| DP6-21 | Usuario (C-1) | Un único paso del cuerpo va primero en toda operación, antes que los 401: JSON mal formado (todas) y, al crear o editar, JSON que no es objeto (DP6-32, DP6-35); ambos 400 "JSON mal formado". Es la única excepción a "401 primero"; el usuario la mantiene en DP6-37. | Comprobar la sesión iniciada antes que el cuerpo: el usuario prefirió que un cuerpo roto se rechace igual con cualquier credencial. |
| DP6-22 | Usuario (C-2) | Al editar, `notes: ""` (o solo espacios) se acepta y borra las notas, igual que al crear; "vacío → 400" no aplica a las notas. | 400 con notas vacías: no habría forma de borrar las notas de una sesión. |
| DP6-23 | Usuario (C-3) | El salto de línea del título (LF, CR, U+2028 o U+2029; DP6-27) se comprueba tras recortar: `"Ranked\n"` se guarda como `"Ranked"`; solo un salto interno da 400 (ampliado a caracteres de control en DP6-31). | Comprobarlo antes de recortar: rechazaría un título que el recorte deja válido. |
| DP6-24 | Usuario (C-4; Q4, 2026-10-19) | Los criterios de finalización exigen solo pruebas y comprobación de tipos del servidor; el lint no se exige. Nota del 2026-10-19: la versión original decía que el servidor no tenía comando de lint; hoy existe y está en verde, y el usuario mantiene no exigirlo (Q4). | Exigir lint: añade un criterio que el usuario prefirió no exigir (Q4), aunque el comando ya existe. |
| DP6-25 | Usuario (C-5) | Un único texto para notas inválidas (nulas, no texto o más de 160): "Las notas deben ser texto de hasta 160 caracteres.". | "Las notas no pueden superar 160 caracteres.": no describe el error con `null` o un número. |
| DP6-26 | Usuario (C-6) | Aceptados tal cual: notas contadas en puntos de código; barrido del 401 de usuario eliminado limitado a las operaciones de esta spec; RF-24 con posible `full` visible con menos participantes durante la cascada (cuándo se omite la sesión y cuándo sigue visible lo precisa DP6-34); textos heredados en minúscula como en su origen; RF-27 reutiliza "No tienes una cuenta vinculada en este juego." con 400. | Recalcular el estado al leer durante la cascada o uniformar los textos heredados: cambios fuera del alcance de esta spec. |
| DP6-27 | Usuario (D-a) | Recortar quita de los extremos estos espacios en blanco y fines de línea: U+0009, U+000B, U+000C, U+0020, U+00A0, U+FEFF, toda la categoría Zs, LF, CR, U+2028 y U+2029. Salto de línea = LF, CR, U+2028 o U+2029 (un salto interno en el título → 400). | Recortar solo espacio, tabulador, LF y CR: un U+00A0 o U+3000 en un extremo pasaría el recorte y contaría en el largo, y U+2028 dentro del título no se trataría como salto. |
| DP6-28 | Usuario (D-b) | RF-23 vale en todas las operaciones: un cuerpo de JSON mal formado da 400 "JSON mal formado" también al listar, obtener, cancelar, sumarse y salir, que no usan el cuerpo; ignorar el contenido (RF-15) no exime de que esté bien formado. | Aplicar RF-23 solo a crear y editar: el resultado dependería de si la operación lee el cuerpo y rompería el orden único de RF-20. |
| DP6-29 | Usuario (E-1) | Una petición sin cuerpo (0 bytes) equivale a `{}` y no es JSON mal formado: editar sin cuerpo → 200 sin cambios (RF-26); crear sin cuerpo → 400 "Juego no válido." (primer campo de RF-6); en las demás operaciones es válido. | Tratar la falta de cuerpo como JSON mal formado: obligaría a enviar `{}` en operaciones que no usan el cuerpo. |
| DP6-30 | Usuario (E-2) | RF-15 nombra explícitamente listar, obtener, cancelar, sumarse y salir como operaciones que ignoran el contenido del cuerpo; solo debe estar bien formado (RF-23). | Dejarlo implícito: obtener, listar y cancelar no aparecían en RF-15. |
| DP6-31 | Usuario (E-3) | Todo carácter de la categoría Cc (incluidos tabulador, U+000B, U+000C, U+0085, LF y CR) y U+2028/U+2029 en el título ya recortado → 400 con el mensaje del título; el recorte sigue quitando los suyos de los extremos; las notas los admiten en su interior. El tabulador interno, antes aceptado, pasa a rechazarse. | Prohibir solo los cuatro saltos de línea: dejaría tabuladores y otros controles invisibles dentro del título. |
| DP6-32 | Usuario (E-4) | Al crear o editar, un JSON bien formado que no es un objeto (`[]`, `3`, `"x"`, `true`, `null`) → 400 "JSON mal formado" en el mismo paso del cuerpo que RF-23, antes de la sesión iniciada (RF-28, DP6-35); en las operaciones que ignoran el cuerpo se ignora. | Validarlo campo a campo: un `[]` o un `null` daría "Juego no válido." o 200 sin cambios, ocultando un cliente roto. |
| DP6-33 | Usuario (E-5) | Las specs 007 y 009 deben adoptar en la interfaz las mismas reglas del título que el servidor: recorte, salto de línea y caracteres de control (solo se anota en "Impacto en otras specs"). | Que la interfaz valide distinto: el formulario aceptaría títulos que el servidor rechaza con 400. |
| DP6-34 | Usuario (F-1) | RF-24 según quién se eliminó: si es el anfitrión, la sesión se omite del listado y por id da 404; si es solo un participante, la sesión sigue visible (listado y 200 por id) sin ese participante y puede mostrarse `full` con menos participantes visibles que cupos. | Omitir la sesión en ambos casos (lectura literal anterior de RF-24): una sesión válida desaparecería para todos solo porque se eliminó a uno de sus participantes. |
| DP6-35 | Bloque F (F-2, corrección) | Hay un único paso del cuerpo antes de la sesión iniciada: JSON mal formado (todas las operaciones) y JSON no objeto (crear y editar); RF-1, RF-20, RF-23, RF-28, DP6-14, DP6-21 y DP6-32 lo describen igual. | Dos pasos separados (mal formado antes del 401 y no objeto después): el resultado de un `[]` dependería de la credencial y contradiría RF-28. |
| DP6-36 | Usuario (F-3) | La spec prevalece sobre la sección 5.5 de la referencia: la lectura del cuerpo cumple RF-15, RF-23 y RF-28, y un cuerpo enviado sin declararse como JSON se trata como sin cuerpo (equivale a `{}`: crear → "Juego no válido.", editar → 200 sin cambios). | Aplicar la 5.5 tal cual: no rechaza el JSON no objeto de RF-28 ni define qué pasa con un cuerpo no declarado como JSON. Responder 400 o 415 a un cuerpo no declarado como JSON: regla nueva sin necesidad del producto. |
| DP6-37 | Usuario (F-4) | Se mantiene "cuerpo antes que 401". Como el orden de errores es global al servidor, las specs 004 (RF-29) y 005 deben adoptar la misma excepción; se cambian por el flujo de cambio de requisitos, no desde esta spec. | Volver a "401 primero" en esta spec: dejaría dos órdenes distintos en el mismo servidor. |
| DP6-38 | Usuario (F-5) | Mientras dura la cascada de RF-16, en una sesión de juego con un participante ya eliminado, RF-8 (cupos bajo inscritos) y RF-12 (llena) cuentan los participantes guardados, incluido el eliminado hasta que la cascada lo quite, no los visibles (RF-24). | Contar los participantes visibles: el estado guardado (`full`) y la regla de sumarse podrían contradecirse, y una edición o un sumarse podría dejar más participantes guardados que cupos antes de que la cascada termine. |
| DP6-39 | Usuario (Q1, 2026-10-19) | La credencial válida de un usuario eliminado responde 401 "token inválido" en todas las operaciones de esta spec, también en la compensación de RF-16 (crear o sumarse a la vez que se elimina al usuario). "Sesión no iniciada" queda solo para la credencial ausente (spec 002, RF-10). Alinea la 006 con la spec 002 (RF-22, RF-24), la 004 (RF-44, DP-37) y la 005 (RF-13, DP5-16), y con lo que ya responde el servidor implementado. Precisa el texto de DP6-17. | 401 "sesión no iniciada" (texto original de la 006, opción B de Q1): exigiría una comprobación propia de la 006, distinta de la de las specs 002 a 005, o cambiar la 004; y un mismo usuario eliminado recibiría textos distintos según la operación (agenda frente a cuentas, coincidencias y usuarios). |
| DP6-40 | Usuario (2026-10-19, laguna señalada por reviewer) | RF-16 contempla un tercer resultado de la operación simultánea a la eliminación del usuario: al crear, 400 "No tienes una cuenta vinculada en este juego." (RF-27) cuando la cascada de cuentas de la spec 004 ya borró la vinculación antes de que la creación valide; no se guarda nada. Se suma a 201/200 (terminó antes, la cascada lo limpia) y 401 "token inválido" (RF-18). Sumarse no exige cuenta (RF-11), así que no aplica al sumarse. En todos los casos no queda sesión ni participación del usuario eliminado. | Cambiar el orden de la cascada de cuentas de la spec 004 para que el usuario desaparezca antes que sus cuentas: fuera de alcance de esta spec (la 004 conviene que el usuario sea lo último en desaparecer, RF-14 y DP-42) y no es necesario, porque el estado final ya es correcto. |
