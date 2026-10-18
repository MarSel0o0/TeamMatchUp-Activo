# Spec 002 — Registro, inicio y cierre de sesión
Estado: implementada

## Contexto y objetivo
El Hito 2 exige registro, inicio de sesión, cierre de sesión y una operación que devuelva
la sesión actual, con el JWT en una cookie HttpOnly y la información complementaria en
localStorage. En esta spec, esa información complementaria es solo el comprobante
anti-CSRF (ver Definiciones); la interfaz no guarda nada más de la sesión. En la
presentación el equipo debe explicar qué ataque mitiga cada pieza.

La cookie HttpOnly impide que un script inyectado (XSS) se lleve la credencial, pero no
protege contra un script que se ejecuta dentro de la página: ese script puede leer el
comprobante anti-CSRF y hacer peticiones con la cookie. La defensa contra XSS es impedir
la inyección (no insertar como HTML contenido de usuarios, spec 007, RNF-2). Contra CSRF
protegen el comprobante y SameSite=Strict.

Esta spec agrega al servidor de la spec 001 la creación de usuarios (el "crear" de la
entidad usuario) y la sesión completa, y deja lista la protección que usarán todas las
operaciones de las specs 003 a 006. La interfaz todavía no la consume: eso es la spec 007.

- Depende de: spec 001.
- Origen: HU-01, HU-02, HU-03 y HU-04 (parte del servidor), HU-13 (regla general) y HU-15;
  RF-01 a RF-04 de la spec original.
- Referencia técnica: `specs/_referencia/001-crear-backend-original.md`. De sus secciones 2,
  4.2 (RT-07, RT-08, RT-09, RT-11, RT-16, RT-19), 5.4 (modelo de usuario), 5.6, 5.7, 8 y 10
  pasan al `plan.md` de esta spec **solo las partes que corresponden a los RF de abajo**:
  transporte de la credencial, respuesta del inicio de sesión, correo como identificador de
  inicio, registro como creación de usuario, rutas de sesión, duplicados como 400, campos
  de credenciales y perfil del modelo de usuario, flujo de inicio, verificación de sesión y
  cierre, filas de autenticación, duplicados y datos faltantes de la tabla de errores, y
  los casos de prueba de autenticación y de creación de usuario. Quedan fuera, entre otros:
  CORS y proxy, variables de la interfaz, el alias `me`, la autorización por dueño (403),
  los conflictos de estado (409), los demás recursos y todos los cambios de la interfaz.
- Prevalencia: si la referencia y esta spec difieren (por ejemplo, en los textos de los
  mensajes de error), prevalece esta spec.
- Las dependencias nuevas se justifican en el `plan.md` de esta spec (constitución,
  principio 1).
- La spec 007 (RF-3) depende del canal del comprobante anti-CSRF fijado aquí (RF-8).
- Nota: `HITO2.md` no está en el repositorio, así que esta spec no se contrastó con el
  enunciado del hito (igual que la spec 001).
- El secreto de firma es la variable `JWT_SECRET`. Esta spec la agrega a la matriz de
  variables de la spec 001, cuyo archivo de ejemplo pasa a tener siete variables (cambio
  en la spec 001, RF-9 y matriz de Definiciones).
- Limitación reconocida: el registro revela si un correo o un nombre de usuario ya están
  registrados (RF-3). Un mensaje genérico no lo evitaría, porque el nombre de usuario es
  público y el formulario necesita decir qué cambiar. El inicio de sesión no lo revela
  (RF-9).

## Usuarios
- Jugador sin cuenta, que quiere registrarse.
- Jugador registrado, que entra, sigue dentro al volver y sale.
- Equipo evaluado, que debe demostrar qué mitiga cada pieza de la autenticación.

## Historias de usuario
- HU-1. Como jugador sin cuenta, quiero registrarme con correo, nombre de usuario y
  contraseña para usar la plataforma.
- HU-2. Como jugador registrado, quiero iniciar sesión con mi correo y mi contraseña para
  ver mis coincidencias.
- HU-3. Como jugador con la sesión iniciada, quiero que la aplicación pueda confirmar quién
  soy en cualquier momento para no tener que volver a entrar al recargar.
- HU-4. Como jugador, quiero cerrar sesión para que nadie use mi cuenta en este equipo.
- HU-5. Como jugador, quiero que nadie pueda actuar a mi nombre enviando mi identificador
  ni desde otro sitio web.
- HU-6. Como equipo evaluado, queremos que cada pieza de la autenticación tenga una prueba
  que demuestre el ataque que mitiga.

## Definiciones
- **Credencial de sesión**: JWT firmado con el secreto del servidor que identifica al
  usuario. Viaja solo en una cookie HttpOnly; el código de la página no puede leerla.
- **Cookie de sesión del navegador**: cookie sin fecha de caducidad propia (sin `Max-Age`
  ni `Expires`); el navegador la descarta al terminar su sesión. La vigencia de la sesión
  la decide la credencial que contiene (RNF-1), no la cookie.
- **Comprobante anti-CSRF**: valor aleatorio generado en cada inicio de sesión, incluido
  dentro de la credencial. El servidor lo entrega en la cabecera de respuesta
  `X-CSRF-Token` del inicio de sesión; el cliente lo guarda en localStorage y lo reenvía en
  la cabecera de petición `X-CSRF-Token` en cada petición. Un valor enviado por cualquier
  otro medio (cuerpo, parámetro de consulta, otra cabecera o cookie) no cuenta como
  comprobante.
- **Operación protegida**: la que exige una sesión válida, es decir, credencial válida y
  no expirada más un comprobante anti-CSRF que coincide con el de la credencial (RF-24).
- **Datos públicos del usuario**: identificador, nombre de usuario, nombre visible, color de
  avatar, biografía, zona horaria y fecha de creación. El correo no es público.
- **Datos propios del usuario**: sus datos públicos más su correo. Solo se entregan al
  propio usuario.
- **Campo ausente**: campo que no viene en el cuerpo, viene como `null`, viene como texto
  vacío o, salvo la contraseña, viene como texto formado solo por espacios.
- **Longitud**: cantidad de caracteres medida como la mide el formulario de la interfaz
  (unidades UTF-16: un emoji puede contar como 2). Se mide después de recortar los
  espacios de los extremos, salvo en la contraseña, que nunca se recorta.
- **Tamaño en bytes de la contraseña**: cantidad de bytes de la contraseña codificada en
  UTF-8, sin recortar (una "ñ" ocupa 2 bytes; un emoji, 4). Es el límite que admite bcrypt.
- **Valor de desarrollo del secreto**: el texto `solo-desarrollo-no-usar-en-produccion`.
  No es secreto: está publicado en el archivo de ejemplo de variables.
- **Respuesta de error**: la de la spec 001: `{ "error": "<mensaje>" }`, con el mensaje en
  español, en minúscula y sin punto final.

## Requisitos funcionales
- RF-1: CUANDO alguien se registra con correo, nombre de usuario, contraseña y, de forma
  opcional, nombre visible, todos válidos, EL SISTEMA crea el usuario con color de avatar
  `#6d5efc`, biografía vacía y zona horaria `America/Santiago`, y responde 201 con sus
  datos propios, sin la contraseña ni su hash. La zona horaria no se elige al registrarse:
  se cambia después (spec 003).
- RF-2: EL SISTEMA guarda la contraseña solo como hash bcrypt con sal y costo 10.
- RF-3: SI el correo o el nombre de usuario ya están registrados, ENTONCES EL SISTEMA
  responde 400 y no crea nada, con "ya existe una cuenta con ese correo" si se repite el
  correo, "ese nombre de usuario ya está en uso" si se repite el nombre de usuario y, si
  se repiten los dos, el del correo. El correo se compara ya normalizado (RF-7). El nombre
  de usuario se compara sin distinguir mayúsculas de minúsculas ("Ana", "ana" y "ANA" son
  el mismo), pero se guarda y se devuelve tal como se escribió, solo recortado.
- RF-4: SI la contraseña tiene una longitud menor que 8, ENTONCES EL SISTEMA responde 400
  con "la contraseña debe tener al menos 8 caracteres" y no crea nada; SI su tamaño en
  bytes supera 72, ENTONCES responde 400 con "la contraseña no puede superar 72 bytes" y no
  crea nada. La contraseña no se recorta: los espacios cuentan como cualquier otro
  carácter. Las dos condiciones no pueden darse a la vez.
- RF-5: SI en el registro falta un campo obligatorio, el correo supera la longitud de 254 o
  no tiene formato válido, o el nombre de usuario, ya recortado, no tiene una longitud
  entre 3 y 24 o contiene algo distinto de letras ASCII, dígitos, punto, guion o guion
  bajo, ENTONCES EL SISTEMA responde 400 y no crea nada, con estos mensajes: "falta el
  correo", "falta el nombre de usuario", "falta la contraseña", "el correo no puede superar
  254 caracteres", "el correo no tiene un formato válido", "el nombre de usuario debe
  tener entre 3 y 24 caracteres" y "el nombre de usuario solo admite letras, dígitos,
  punto, guion y guion bajo". Un correo tiene formato válido si, ya recortado, no contiene
  espacios, tiene una sola arroba con texto antes y después, y lo que sigue a la arroba
  incluye un punto seguido de al menos 2 caracteres (la misma regla del formulario de
  registro). Los campos se revisan en el orden correo, nombre de usuario, contraseña y
  nombre visible, y se responde con el primer error encontrado; dentro del correo, la
  longitud se revisa antes que el formato. Las repeticiones (RF-3) solo se revisan si
  todos los campos son válidos.
- RF-6: CUANDO el nombre visible llega ausente, EL SISTEMA usa el nombre de usuario; en
  otro caso, lo guarda sin espacios en los extremos. SI su longitud supera 40, ENTONCES
  EL SISTEMA responde 400 con "el nombre visible no puede superar 40 caracteres" y no crea
  nada.
- RF-7: EL SISTEMA guarda el correo sin espacios en los extremos y en minúsculas (también la
  parte anterior a la arroba), y lo compara sin distinguir mayúsculas al registrar y al
  iniciar sesión. El nombre de usuario se guarda sin espacios en los extremos.
- RF-8: CUANDO alguien inicia sesión con un correo y una contraseña correctos, EL SISTEMA
  responde 200 con los datos propios del usuario (sin hash, credencial ni comprobante en el
  cuerpo), entrega la credencial de sesión en una cookie de sesión del navegador HttpOnly
  con SameSite=Strict y entrega el comprobante anti-CSRF en la cabecera de respuesta
  `X-CSRF-Token`, legible para el cliente.
- RF-9: SI el correo no está registrado o la contraseña es incorrecta, ENTONCES EL SISTEMA
  responde 401 con el mismo mensaje en ambos casos: "correo o contraseña incorrectos". Una
  contraseña cuyo tamaño en bytes supera 72 se trata como incorrecta sin compararla, para
  que bcrypt no acepte una contraseña más larga que coincida en sus primeros 72 bytes.
- RF-10: SI una petición a una operación protegida llega sin credencial, ENTONCES EL SISTEMA
  responde 401 con "sesión no iniciada".
- RF-11: SI la credencial está alterada, firmada con otro secreto o el comprobante anti-CSRF
  falta o no coincide, ENTONCES EL SISTEMA responde 401 con "token inválido".
- RF-12: SI la credencial expiró, ENTONCES EL SISTEMA responde 401 con "sesión expirada".
- RF-13: CUANDO un usuario con sesión válida consulta la sesión actual, EL SISTEMA responde
  200 con los datos propios de ese usuario tal como están guardados en ese momento, y
  nunca con los de otro.
- RF-14: CUANDO alguien cierra sesión, EL SISTEMA indica al navegador que elimine la cookie
  de la credencial (con los mismos atributos con que se emitió) y responde 200 con
  `{ "message": "sesión cerrada" }`, sin revisar la credencial ni el comprobante: da igual
  que no haya sesión o que la credencial esté expirada, alterada o sin comprobante.
- RF-15: EL SISTEMA identifica al usuario de toda operación protegida a partir de la
  credencial de sesión y nunca a partir de un identificador enviado por el cliente.
- RF-16: EL SISTEMA ignora en el registro cualquier campo distinto de correo, nombre de
  usuario, contraseña y nombre visible, y en el inicio de sesión cualquier campo distinto
  de correo y contraseña.
- RF-17: EL SISTEMA trata `JWT_SECRET` como variable obligatoria en los tres entornos
  (spec 001, RF-2 y matriz de Definiciones): si falta o está vacía, no arranca y el mensaje
  la nombra; si falta a la vez que `NODE_ENV`, el mensaje nombra ambas.
- RF-18: SI en el inicio de sesión el correo o la contraseña están ausentes, ENTONCES
  EL SISTEMA responde 400 con "falta el correo" o "falta la contraseña" (si faltan ambos,
  el del correo), sin consultar usuarios.
- RF-19: SI en el registro o en el inicio de sesión un campo llega con un valor que no es
  texto ni `null` (número, booleano, arreglo u objeto), ENTONCES EL SISTEMA responde 400
  con "el correo debe ser un texto", "el nombre de usuario debe ser un texto", "la
  contraseña debe ser un texto" o "el nombre visible debe ser un texto", y nunca usa ese
  valor como condición de búsqueda.
- RF-20: CUANDO alguien se registra, EL SISTEMA no entrega credencial de sesión ni
  comprobante anti-CSRF (ni cookie ni cabecera `X-CSRF-Token`) y no modifica la sesión que
  el navegador ya tuviera.
- RF-21: SI llegan a la vez dos registros con el mismo correo o el mismo nombre de usuario
  (también si solo difieren en mayúsculas), ENTONCES EL SISTEMA crea solo uno (201) y
  responde al otro como en RF-3 (400), nunca 500.
- RF-22: SI una credencial con firma válida, no expirada y con comprobante coincidente
  corresponde a un usuario que ya no existe, ENTONCES EL SISTEMA responde 401 con "token
  inválido".
- RF-23: EL SISTEMA toma la credencial de sesión solo de su cookie: una credencial enviada
  en otra cabecera (incluida `Authorization`) o en el cuerpo se ignora.
- RF-24: CUANDO llega una petición a una operación protegida, EL SISTEMA la revisa en este
  orden y responde con el primer fallo: (1) sin cookie de credencial o con la cookie vacía:
  "sesión no iniciada"; (2) cookie ilegible, firma no válida, firmada con otro secreto o
  con un algoritmo distinto del que usa el servidor (incluido "none"): "token inválido";
  (3) expirada: "sesión expirada"; (4) credencial sin identificador o sin comprobante
  dentro, o cabecera de petición `X-CSRF-Token` ausente, vacía o distinta del comprobante
  de la credencial: "token inválido" (que falte en ambos lados no cuenta como
  coincidencia); (5) usuario inexistente: RF-22.
- RF-25: CUANDO alguien inicia sesión desde un navegador que ya tiene una cookie de sesión
  (del mismo u otro usuario), EL SISTEMA entrega una credencial y un comprobante nuevos que
  reemplazan a los anteriores en ese navegador.
- RF-26: EL SISTEMA trata como operación protegida la consulta de sesión; el registro, el
  inicio de sesión y el cierre de sesión son públicos.
- RF-27: MIENTRAS el entorno es de desarrollo o de prueba, EL SISTEMA acepta como
  `JWT_SECRET` el valor de desarrollo del secreto, que es el que trae el archivo de
  ejemplo, de modo que copiar ese archivo sin cambios basta para arrancar en desarrollo y
  ejecutar las pruebas (con MongoDB disponible, precondición de la spec 001).
- RF-28: SI el entorno es de producción y `JWT_SECRET`, sin los espacios de los extremos,
  es igual al valor de desarrollo del secreto, ENTONCES EL SISTEMA no arranca (spec 001,
  "no arrancar") y muestra un mensaje en español que nombra `JWT_SECRET` e indica que el
  valor de desarrollo no se admite en producción.

## Requisitos no funcionales
- RNF-1: La credencial de sesión es válida durante 3600 segundos desde su emisión: a los
  3599 s se acepta y desde los 3600 s se rechaza como expirada, sin margen de tolerancia de
  reloj. La cookie que la transporta no tiene caducidad propia (cookie de sesión del
  navegador): si el navegador la sigue enviando pasada la hora, el servidor responde
  "sesión expirada" (RF-12).
- RNF-2: En producción la cookie se marca como Secure; en desarrollo y prueba, no. Se
  verifica con una prueba que obtiene la cookie emitida con la configuración de
  producción.
- RNF-3: Además de los datos técnicos de emisión y expiración, la credencial contiene solo
  el identificador, el nombre de usuario y el comprobante anti-CSRF; nunca el correo ni
  otros datos privados.
- RNF-4: Ninguna respuesta incluye el hash de la contraseña ni el correo de otro usuario
  (constitución, principio 5).
- RNF-5: Cada pieza del servidor de la tabla "Qué mitiga cada pieza" de la referencia tiene
  al menos una prueba automática: firma de la credencial (credencial alterada → 401),
  credencial sin estado (iniciar sesión no crea ni modifica documentos en la base), cookie
  HttpOnly, comprobante anti-CSRF (petición sin él → 401), SameSite=Strict, Secure en
  producción (RNF-2), expiración (credencial expirada → 401), hash con sal (hash distinto
  de la contraseña y distinto entre dos usuarios con la misma contraseña), mensaje único
  ante credenciales incorrectas, ausencia del hash en las respuestas, identidad tomada de
  la credencial y secreto real fuera del repositorio (el archivo real de variables está
  ignorado y el valor de desarrollo del ejemplo no se acepta en producción, RF-28). La
  fila "React escapa el contenido" no es del servidor: la cubre la spec 007 (RNF-2).
- RNF-6: Comprobación de tipos, pruebas y lint del servidor en verde, sin `any`, sin
  `@ts-ignore` y sin ningún `.only` en las pruebas (constitución, principio 4).
- RNF-7: Mensajes de error en español, en minúscula y sin punto final (constitución,
  principio 6; spec 001).

## Casos límite
- Iniciar sesión con el correo en mayúsculas o con espacios en los extremos funciona (RF-7).
- Iniciar sesión sin correo, sin contraseña, con `""`, con `null` o con el correo solo de
  espacios: 400 "falta el correo" o "falta la contraseña" (RF-18).
- Iniciar sesión con una contraseña formada solo por espacios: no es ausente; se compara y,
  si no es la correcta, 401 (RF-9).
- Iniciar sesión con un correo de formato inválido o de más de 254 caracteres: 401 "correo
  o contraseña incorrectos" (no se valida el formato ni la longitud al iniciar sesión).
- Iniciar sesión con `{"email": {"$ne": null}, "password": "..."}` o con la contraseña como
  objeto: 400 "el correo debe ser un texto" o "la contraseña debe ser un texto" (RF-19).
- Registro o inicio de sesión con un tipo de contenido distinto de JSON: el cuerpo no se
  interpreta (spec 001), así que los campos se tratan como ausentes: 400 "falta el correo"
  (RF-5, RF-18).
- Registro con nombre de usuario `"  ab  "`: recortado tiene 2 caracteres: 400 (RF-5).
- Registro con nombre visible solo de espacios: se usa el nombre de usuario (RF-6).
- Registro con nombre visible de 40 caracteres tras recortar: se acepta; de 41: 400 (RF-6).
- Registro con correo con letras internacionales (por ejemplo `josé@dominio.cl`): se acepta
  si cumple la regla de formato (RF-5); con mayúsculas en la parte local, se guarda en
  minúsculas (RF-7).
- Registro con correo de 254 caracteres tras recortar y formato válido: se acepta; de 255:
  400 "el correo no puede superar 254 caracteres", aunque además tenga formato inválido
  (RF-5).
- Registro con contraseña de 72 bytes (por ejemplo, 36 "ñ" o 18 emojis de 4 bytes): se
  acepta; de 73 bytes (36 "ñ" y una "a"): 400 "la contraseña no puede superar 72 bytes"
  (RF-4).
- Usuario registrado con una contraseña de 72 bytes que inicia sesión con esa contraseña
  más un carácter: 401 "correo o contraseña incorrectos" (RF-9).
- Registro con varios campos inválidos: responde el error del primero en el orden de RF-5.
- Registro con correo y nombre de usuario repetidos a la vez: 400 "ya existe una cuenta
  con ese correo" (RF-3).
- Registro de "ana" cuando ya existe "Ana": 400 "ese nombre de usuario ya está en uso"
  (RF-3). Registro de "Ana" sin que exista ninguna variante: se guarda y se devuelve como
  "Ana", no como "ana".
- Dos registros simultáneos con el mismo correo, o con "Ana" y "ana": uno 201 y otro 400;
  queda un solo usuario (RF-21).
- Un registro que incluye identificador, hash, fecha de creación, zona horaria, color de
  avatar o biografía los ignora; el usuario queda con los valores por defecto de RF-1
  (RF-16).
- Registro con una sesión ya iniciada en el navegador: crea el usuario y la sesión anterior
  sigue igual; la respuesta no trae cookie ni cabecera `X-CSRF-Token` (RF-20).
- Petición protegida con credencial válida y el comprobante correcto enviado en el cuerpo,
  en un parámetro de consulta o en otra cabecera, pero no en `X-CSRF-Token`: "token
  inválido" (RF-24).
- Cerrar sesión sin sesión iniciada: 200 y la indicación de eliminar la cookie (RF-14).
- Cerrar sesión con la credencial expirada, alterada, firmada con otro secreto o sin
  comprobante: 200 y la indicación de eliminar la cookie (RF-14).
- Otro sitio intenta forzar el cierre de sesión: SameSite=Strict hace que el navegador no
  envíe la cookie ni aplique su eliminación en peticiones iniciadas desde otro sitio; es
  comportamiento del navegador y el servidor no lo comprueba.
- Tras cerrar sesión, consultar la sesión actual desde el mismo navegador responde 401
  "sesión no iniciada" porque la cookie ya no está. Una credencial copiada antes del cierre
  sigue siendo válida hasta que expira (limitación reconocida; ver fuera de alcance).
- Iniciar sesión con otra sesión ya activa en el navegador (del mismo u otro usuario): la
  nueva credencial y el nuevo comprobante reemplazan a los anteriores; la credencial
  anterior, si alguien la copió, sigue válida hasta expirar (RF-25).
- El navegador se cierra y se vuelve a abrir: la cookie de sesión del navegador puede
  haberse descartado y la consulta de sesión responde "sesión no iniciada"; si el
  navegador restaura la sesión y la credencial tiene más de 3600 s, "sesión expirada"
  (RNF-1).
- Cookie de credencial vacía: "sesión no iniciada"; con texto que no es una credencial:
  "token inválido" (RF-24).
- Credencial expirada y además sin comprobante: "sesión expirada"; expirada y firmada con
  otro secreto: "token inválido" (RF-24).
- Credencial firmada con el secreto correcto pero sin comprobante dentro, y petición sin
  comprobante: "token inválido" (RF-24).
- Credencial con algoritmo "none" u otro distinto del del servidor: "token inválido"
  (RF-24).
- Credencial válida enviada solo en `Authorization: Bearer` y sin cookie: "sesión no
  iniciada" (RF-23).
- Credencial válida de un usuario eliminado (spec 003): 401 "token inválido" (RF-22).
- Credencial con 3599 s de antigüedad: se acepta; con 3600 s: "sesión expirada" (RNF-1).
- `JWT_SECRET` con el valor de desarrollo: arranca en desarrollo y en prueba (RF-27); en
  producción no arranca, también si el valor lleva espacios alrededor (RF-28).
- `JWT_SECRET` ausente o solo de espacios en cualquier entorno: no arranca y el mensaje la
  nombra; sin `NODE_ENV` ni `JWT_SECRET`, el mensaje nombra ambas (RF-17).

## Fuera de alcance
- Invalidar credenciales en el servidor, renovarlas o revocar sesiones.
- Recuperación de contraseña, verificación de correo y límite de intentos de inicio.
- Evitar que el registro revele qué correos o nombres de usuario existen (limitación
  reconocida, RF-3).
- Exigir una longitud o complejidad mínima a `JWT_SECRET` en producción, más allá de
  rechazar el valor de desarrollo (RF-28).
- Consultar, editar o eliminar usuarios (spec 003).
- Cambios en la interfaz (spec 007), incluida la corrección del JWT que la interfaz guarda
  hoy en localStorage, que hace la spec 007 (RF-2). Esta spec cambia solo el servidor.
- La defensa contra XSS en la interfaz (spec 007, RNF-2).

## Criterios de finalización
- [ ] Cada RF tiene al menos una prueba automática en verde.
- [ ] Cada pieza listada en RNF-5 tiene identificada la prueba que la demuestra.
- [ ] Una prueba confirma que la credencial verifica con el secreto del servidor y que su
      comprobante coincide con el de la cabecera de respuesta `X-CSRF-Token` del inicio de
      sesión, y que ni el comprobante ni la credencial aparecen en el cuerpo (RF-8).
- [ ] Una prueba comprueba que la cookie emitida al iniciar sesión es HttpOnly, tiene
      SameSite=Strict y no tiene `Max-Age` ni `Expires` (RF-8, RNF-1).
- [ ] Una prueba comprueba cada paso de RF-24, incluidos los casos con dos fallos a la vez
      (expirada sin comprobante, expirada con otro secreto), el algoritmo "none" y el
      comprobante correcto enviado fuera de la cabecera `X-CSRF-Token`.
- [ ] Una prueba envía `{"$ne": null}` como correo al iniciar sesión y obtiene 400 (RF-19).
- [ ] Una prueba lanza dos registros simultáneos iguales y obtiene un 201, un 400 y un solo
      usuario en la base (RF-21); otra hace lo mismo con "Ana" y "ana".
- [ ] Una prueba registra "Ana", comprueba que se devuelve "Ana" y que registrar después
      "ana" responde 400 "ese nombre de usuario ya está en uso" (RF-3).
- [ ] Una prueba registra un correo y un nombre de usuario ya existentes a la vez y obtiene
      400 "ya existe una cuenta con ese correo" (RF-3).
- [ ] Una prueba comprueba que el registro no trae cookie de credencial ni cabecera
      `X-CSRF-Token` (RF-20).
- [ ] Una prueba comprueba que el usuario recién registrado tiene zona horaria
      `America/Santiago`, color `#6d5efc` y biografía vacía, aunque el cuerpo traiga otros
      valores (RF-1, RF-16).
- [ ] Una prueba registra contraseñas de 72 bytes (201) y de 73 bytes (400 "la contraseña
      no puede superar 72 bytes") usando caracteres de 2 bytes, y otra comprueba que la
      contraseña de 72 bytes más un carácter no inicia sesión (401) (RF-4, RF-9).
- [ ] Una prueba registra correos de 254 caracteres (201) y de 255 (400 "el correo no puede
      superar 254 caracteres") (RF-5).
- [ ] Una prueba cierra sesión con una credencial alterada y sin cabecera `X-CSRF-Token` y
      obtiene 200 `{ "message": "sesión cerrada" }` con la indicación de eliminar la cookie;
      otra hace lo mismo con una credencial expirada (RF-14).
- [ ] Una prueba de arranque en producción con `JWT_SECRET` igual al valor de desarrollo
      termina con código de salida distinto de 0 y un mensaje que nombra `JWT_SECRET`
      (RF-28); en desarrollo y en prueba, con ese valor, arranca (RF-27).
- [ ] Con el archivo real de variables copiado sin cambios del archivo de ejemplo, el
      comando de pruebas termina en verde (RF-27).
- [ ] Una prueba de arranque sin `JWT_SECRET` (y con ella solo de espacios) en cada entorno
      termina con código distinto de 0 y un mensaje que la nombra (RF-17).
- [ ] Una prueba comprueba los límites de 3599 s y 3600 s (RNF-1).
- [ ] La comprobación de tipos, las pruebas y el lint del servidor terminan en verde.
- [ ] No queda ningún `.only` en las pruebas.

## Dudas abiertas
Ninguna. Las nueve decisiones de la clarificación (P1 a P9) están resueltas por el usuario,
y estas cuatro quedaron confirmadas por el usuario al aprobar la spec:
- Decisión confirmada: la cabecera del comprobante es `X-CSRF-Token` en los dos sentidos,
  como en la referencia (sección 2 y RF-22 original). El comprobante no se repite en el
  cuerpo de la respuesta.
- Decisión confirmada: la variable se llama `JWT_SECRET` (el nombre de la referencia,
  RT-05) y el valor de desarrollo es exactamente `solo-desarrollo-no-usar-en-produccion`,
  que se compara tras recortar los espacios de los extremos.
- Decisión confirmada: al iniciar sesión, una contraseña de más de 72 bytes responde 401
  (no 400), sin compararla, para no dar un mensaje distinto del de credenciales
  incorrectas (RF-9).
- Decisión confirmada: en el registro, la longitud del correo se revisa antes que su
  formato (RF-5).
