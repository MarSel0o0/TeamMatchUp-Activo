# Spec 011 — Datos de demostración en el servidor
Estado: borrador (las dudas D1 a D4 se cerraron el 2026-10-19; ver "Decisiones")

## Contexto y objetivo
Con el servidor real, la base de desarrollo empieza vacía: para ver coincidencias o una
agenda con gente hay que registrar varios usuarios a mano, vincular cuentas y marcar
disponibilidad. El modo simulado de la interfaz, en cambio, arranca con 16 jugadores
ficticios y la cuenta demo (`demo@teammatchup.gg` / `demo1234`), pero sus datos viven solo
en el navegador y no sirven contra el servidor.

Esta spec agrega al servidor un comando, que se ejecuta a mano y solo en desarrollo, que
carga en la base de desarrollo los mismos usuarios y cuentas de juego que el modo simulado,
y una disponibilidad con la misma forma que la suya (la de la cuenta demo, idéntica). Así el equipo puede entrar como la cuenta demo
contra el servidor real y ver coincidencias sin registrar a nadie.

- Cambia una decisión anterior: la spec 001 ("Fuera de alcance": "Carga de datos de
  demostración (seed)") y la spec 007 ("Fuera de alcance" y decisión R13; contexto: "el
  servidor no tiene datos de demostración precargados") lo dejaban fuera. Esta spec lo
  incorpora solo como herramienta de desarrollo: el servidor sigue arrancando con la base
  como esté, y la base de prueba y la de producción nunca reciben estos datos. Ver "Impacto
  en otras specs".
- Depende de:
  - spec 001: entornos, configuración, base de desarrollo y de prueba (RF-2, RF-3, RF-13,
    RF-15, RF-20) y el comando único de pruebas (RF-8);
  - spec 002: reglas del registro (nombre de usuario, correo, contraseña y su resguardo) y
    el 401 "token inválido" de la credencial de un usuario eliminado (RF-22);
  - spec 003: reglas del perfil y de la disponibilidad, y la eliminación de usuarios
    (RF-11);
  - spec 004: juegos, regiones, formato de identificadores, el proveedor simulado (lectura
    número 0, marca de verificada, marca de datos simulados) y la cascada de cuentas al
    eliminar un usuario;
  - spec 006: la cascada de sesiones de juego al eliminar un usuario (RF-16);
  - spec 007: el modo simulado de la interfaz y sus datos ficticios, que son la fuente de
    los datos de demostración (RF-21, RF-27).
- Precedente: la spec 006 decidió que la carga de demostración no incluye sesiones de juego
  (D6-3 de su `tasks.md`). Esta spec lo mantiene.
- Los datos son ficticios (constitución, principio 5; spec 007, RF-27). El rango, el
  historial, las partidas y la marca de verificada son datos simulados del proveedor de la
  spec 004 y llevan su marca, como toda cuenta del servidor.

## Usuarios
- Integrantes del equipo que desarrollan o prueban a mano la interfaz contra el servidor
  real.
- Quien evalúa el hito y quiere recorrer la aplicación con datos sin registrarse varias
  veces.

## Historias de usuario
- HU-1. Como integrante del equipo, quiero cargar con un solo comando los datos de
  demostración en la base de desarrollo para entrar como la cuenta demo y ver coincidencias
  contra el servidor real sin registrar usuarios a mano.
- HU-2. Como integrante del equipo, quiero poder repetir la carga para volver los datos de
  demostración a su estado inicial sin tocar los usuarios que registré yo.
- HU-3. Como equipo, queremos que la carga sea imposible en producción y en la base de
  prueba, para no mezclar datos de demostración con datos reales ni con las pruebas.

## Definiciones
- **Comando de carga**: el comando del servidor que define esta spec. Se ejecuta a mano;
  el servidor nunca lo ejecuta por sí solo.
- **Datos del modo simulado**: los jugadores ficticios con que arranca el modo simulado de
  la interfaz (spec 007): 16 personas, cada una con nombre de usuario, nombre visible,
  biografía y entre una y tres cuentas de juego (juego, identificador y región), 25 cuentas
  en total. La primera persona es la cuenta demo.
- **Cuenta demo**: el usuario `demo`, con correo `demo@teammatchup.gg` y contraseña
  `demo1234`.
- **Correos de demostración**: los 16 correos de los datos de demostración: el de la cuenta
  demo y, para cada una de las otras 15 personas, su nombre de usuario sin los caracteres
  que no son letras minúsculas ni dígitos, seguido de `@teammatchup.gg` (ej. `ghost.pix` →
  `ghostpix@teammatchup.gg`). Se comparan sin distinguir mayúsculas.
- **Usuario de demostración**: todo usuario de la base cuyo correo es un correo de
  demostración, lo haya creado el comando de carga o no.
- **Usuario ajeno**: todo usuario de la base que no es de demostración.
- **Lectura 0**: la primera lectura del proveedor simulado de la spec 004 para un juego y un
  identificador, la misma que produce vincular una cuenta. Fija el rango, las partidas y la
  marca de verificada; el instante de la lectura solo fija las fechas.
- **Instante de ejecución**: el momento en que se ejecuta el comando de carga. Las fechas de
  los datos de demostración son relativas a él.
- **Rechazar la carga**: el comando no escribe nada en ninguna base, escribe un mensaje en
  español en la salida de error y termina con un código de salida distinto de 0.

## Requisitos funcionales

### Dónde se puede ejecutar
- RF-1: EL SISTEMA ofrece un único comando de carga, que se ejecuta a mano, de forma
  independiente del arranque del servidor; arrancar el servidor nunca carga datos de
  demostración.
- RF-2: MIENTRAS el entorno es de desarrollo (spec 001, Definiciones), EL SISTEMA carga los
  datos de demostración en la base de desarrollo, la indicada por la configuración de
  desarrollo (spec 001, RF-3).
- RF-3: SI el entorno es de producción o de prueba, ENTONCES EL SISTEMA rechaza la carga con
  un mensaje que nombra el entorno y dice que la carga solo se permite en desarrollo.
- RF-4: SI el entorno falta, está vacío o no es exactamente uno de los tres valores
  aceptados, o la configuración de desarrollo es inválida o incompleta según las mismas
  reglas que aplica el arranque del servidor en desarrollo (incluidas las variables que la
  carga no usa, como el puerto y el secreto de las credenciales), ENTONCES EL SISTEMA
  rechaza la carga con los mismos mensajes que ese arranque (spec 001, RF-2, RF-11 y RF-20;
  DP11-5).
- RF-5: SI en desarrollo la ubicación y el nombre de la base de desarrollo son iguales a los
  de la base de prueba (los dos pares definidos, comparados tal como están escritos, como
  en la spec 001, RF-15), ENTONCES EL SISTEMA rechaza la carga con un mensaje que dice que
  la base de desarrollo no puede ser la de prueba.
- RF-6: SI el sistema no logra conectarse a la base de desarrollo dentro de 10 segundos,
  ENTONCES EL SISTEMA rechaza la carga con un mensaje que indica que la base no está
  disponible (como la spec 001, RF-13).

### Qué carga
- RF-7: CUANDO la carga se completa, EL SISTEMA deja en la base exactamente 16 usuarios de
  demostración, uno por persona de los datos del modo simulado y en su mismo orden, cada
  uno con:
  - el nombre de usuario, el nombre visible y la biografía de esa persona, idénticos;
  - su correo de demostración;
  - la contraseña `demo1234`, guardada con el mismo procedimiento de resguardo que el
    registro (spec 002), nunca en claro;
  - el color de avatar que le da el modo simulado: los 8 colores de su paleta, en su orden,
    asignados por turno desde la primera persona (la novena vuelve al primero);
  - la zona horaria `America/Santiago`;
  - una fecha de creación entre 20 y 400 días antes del instante de ejecución.
- RF-8: CUANDO la carga se completa, EL SISTEMA deja en la base exactamente 25 cuentas de
  juego de demostración, una por cuenta de los datos del modo simulado, con dueño su usuario
  de demostración y con el juego, el identificador y la región idénticos a los del modo
  simulado. Cada cuenta queda en el mismo estado que si su dueño la hubiera vinculado
  (spec 004) en un instante entre 1 y 21 horas antes del instante de ejecución: rango
  vigente, historial de rango con un único elemento igual al rango vigente, partidas,
  marca de verificada y número de lectura de la lectura 0 hecha en ese instante, fecha de
  la última lectura igual a ese instante y la marca de datos simulados.
- RF-9: CUANDO la carga se completa, EL SISTEMA deja la siguiente disponibilidad (cada
  bloque es un día de 0 a 6, con 0 = lunes y 6 = domingo, y una hora de 0 a 23 de ese mismo
  día, como en la spec 003):
  - la cuenta demo, la disponibilidad fija del modo simulado: días 0 a 4 (lunes a viernes)
    a las 19, 20, 21, 22 y 23, y días 5 y 6 (sábado y domingo) a las 15, 16, 17, 18, 19, 20,
    21 y 22; 41 bloques en total, ni uno más ni uno menos;
  - cada una de las otras 15 personas, uno de los tres perfiles horarios del modo simulado,
    cada uno con su ventana:
    - nocturno: días 0 a 4 (lunes a viernes) a las 21, 22, 23, 0 y 1 (las horas 0 y 1 son
      las del mismo día del bloque, como en el modo simulado);
    - vespertino: días 0 a 4 (lunes a viernes) a las 17, 18, 19, 20 y 21;
    - fin de semana: días 4 a 6 (viernes a domingo) a las 14, 15, 16, 17, 18, 19, 20, 21
      y 22;
  - y los bloques de cada una de esas 15 personas cumplen todo lo siguiente: al menos uno
    está en la ventana de su perfil; como mucho 4 están fuera de esa ventana, y esos tienen
    hora entre las 15 y las 23; y al menos uno es también un bloque de la cuenta demo;
  - cada uno de los tres perfiles lo tiene al menos una de las 15 personas.
  La disponibilidad de las 15 personas es la misma en cada ejecución (RNF-1), pero no tiene
  por qué coincidir bloque a bloque con la que les da el modo simulado (DP11-2).
- RF-10: EL SISTEMA carga solo datos que cumplen las reglas que el servidor aplica al
  registrar, editar el perfil, guardar la disponibilidad y vincular cuentas (specs 002, 003
  y 004): nombre de usuario de 3 a 24 caracteres permitidos y único sin distinguir
  mayúsculas, correo único, nombre visible de hasta 40 caracteres, biografía de hasta 200,
  color con la forma `#RRGGBB`, zona horaria válida, bloques de disponibilidad válidos y sin
  repetir, identificador con el formato de su juego, región válida para su juego y una sola
  cuenta por juego y usuario.
- RF-11: EL SISTEMA no usa en los datos de demostración ninguna palabra de los nombres de
  los integrantes del equipo ni sus nombres de usuario, con la misma comparación que la
  spec 007, RF-27.
- RF-12: EL SISTEMA no carga sesiones de juego de demostración (spec 006, D6-3).

### Repetir la carga y convivir con otros datos
- RF-13: CUANDO se ejecuta la carga y ya hay usuarios de demostración en la base, EL SISTEMA
  los reemplaza: primero los elimina con la misma cascada que la eliminación de un usuario
  (spec 003, RF-11; spec 004; spec 006, RF-16): sus cuentas de juego, las sesiones de juego
  que organizan y su participación en las demás, con el estado de cada sesión recalculado;
  y después crea de nuevo todos los datos de RF-7 a RF-9. No toca a nadie más (RF-14;
  DP11-1).
- RF-14: EL SISTEMA no crea, cambia ni borra ningún usuario ajeno ni ninguna de sus cuentas
  de juego; de sus sesiones de juego solo quita a los usuarios de demostración que
  participan en ellas y recalcula su estado (RF-13).
- RF-15: SI un usuario ajeno tiene un nombre de usuario igual, sin distinguir mayúsculas, al
  de alguna persona de los datos de demostración, ENTONCES EL SISTEMA rechaza la carga con
  un mensaje que nombra cada nombre de usuario en conflicto, sin escribir nada (RF-16) y
  sin borrar ni renombrar a ese usuario ajeno (DP11-3).
- RF-16: EL SISTEMA hace todas las comprobaciones que pueden rechazar la carga (RF-3 a RF-6
  y RF-15) antes de escribir nada en la base.
- RF-17: SI la carga falla después de empezar a escribir (por ejemplo, la base deja de
  responder), ENTONCES EL SISTEMA termina con un código de salida distinto de 0 y un mensaje
  en español que dice que la carga quedó incompleta y que basta con repetirla; repetirla
  con la base disponible deja los datos completos de RF-7 a RF-9 por RF-13. EL SISTEMA no
  deshace lo que alcanzó a escribir (DP11-4).

### Resultado
- RF-18: CUANDO la carga termina bien, EL SISTEMA escribe en la salida estándar cuántos
  usuarios de demostración había antes y se reemplazaron, cuántos usuarios (16) y cuántas
  cuentas de juego (25) cargó, y la credencial de la cuenta demo (`demo@teammatchup.gg` /
  `demo1234`), y termina con código de salida 0.
- RF-19: SI la carga falla o se rechaza por cualquier motivo, ENTONCES EL SISTEMA termina con
  un código de salida distinto de 0 y un mensaje en español en la salida de error que
  indica el motivo.
- RF-20: CUANDO la carga termina bien, EL SISTEMA permite usar los datos de demostración con
  las operaciones que ya existen, sin cambiarlas: iniciar sesión como la cuenta demo
  (spec 002), ver sus cuentas y su disponibilidad (specs 003 y 004), ver coincidencias en los
  tres juegos (spec 005), crear y sumarse a sesiones de juego (spec 006) y resincronizar una
  cuenta, que hace la lectura 1 como en cualquier cuenta recién vinculada (spec 004).

## Requisitos no funcionales
- RNF-1: La carga es determinista: dos ejecuciones dejan los mismos datos, incluida la
  disponibilidad de los 16 usuarios de demostración, salvo los instantes relativos al
  instante de ejecución (fechas de creación, de última lectura, del rango y de las
  partidas), los identificadores que asigna la base y el resguardo de la contraseña, que
  cambia en cada ejecución aunque la contraseña sea la misma. El rango, la división, los
  puntos, el rango normalizado, la marca de verificada y los resultados, resúmenes y
  duraciones de las partidas coinciden en cada ejecución y con el modo simulado, porque
  salen del mismo proveedor simulado (spec 007, RF-21 y RNF-6). La disponibilidad de la
  cuenta demo coincide con la del modo simulado; la de las otras 15 personas solo tiene su
  misma forma (RF-9, DP11-2).
- RNF-2: La construcción de los datos de demostración (usuarios, cuentas en su lectura 0,
  disponibilidad y fechas relativas) es una regla pura, sin acceso a datos ni reloj: el
  instante de ejecución llega como dato (constitución, principio 3).
- RNF-3: La carga tiene pruebas automáticas que se ejecutan con el comando único de pruebas
  del servidor (spec 001, RF-8) contra la base de prueba, escritas antes que el código
  (constitución, principio 4). No contradice RF-3: lo que se niega a ejecutarse en prueba
  es el comando de carga, que es la única forma de ejecutar la carga fuera de las pruebas;
  las pruebas ejercitan la propia carga sobre la base de prueba, y prueban la negativa del
  comando por separado.
- RNF-4: Esta spec no agrega dependencias ni variables de entorno y no cambia ninguna
  operación de la API (constitución, principio 1).
- RNF-5: Mensajes en español (constitución, principio 6). Pruebas, comprobación de tipos y
  lint del servidor en verde, sin `any`, sin `@ts-ignore` y sin `.only` (`AGENTS.md`).
- RNF-6: Ejecutar las pruebas no crea, modifica ni borra datos en la base de desarrollo
  (spec 001, casos límite).

## Casos límite
- Base de desarrollo vacía: carga 16 usuarios y 25 cuentas e informa 0 reemplazados
  (RF-7, RF-8, RF-18).
- Base con usuarios ajenos sin conflicto de nombre de usuario: se cargan los datos de
  demostración y los usuarios ajenos, sus cuentas y su disponibilidad quedan intactos
  (RF-14). Coincidencias de un usuario ajeno pasan a incluir a los usuarios de demostración
  que cumplan los filtros (spec 005).
- Re-ejecución sobre una base ya cargada: quedan otra vez exactamente 16 usuarios y 25
  cuentas de demostración, sin duplicados, e informa 16 reemplazados (RF-13, RF-18). Los
  cambios hechos a mano a los datos de demostración (perfil, disponibilidad, cuentas
  desvinculadas o resincronizadas) se pierden.
- Re-ejecución con sesiones de juego organizadas por usuarios de demostración (creadas a mano
  desde la aplicación): se borran. Sesiones de juego de usuarios ajenos en las que participa
  un usuario de demostración: siguen, sin él y con el estado recalculado (RF-13, RF-14).
- Re-ejecución mientras alguien tiene la sesión iniciada como la cuenta demo: su credencial
  queda de un usuario eliminado y su siguiente operación protegida responde 401 "token
  inválido" (spec 002, RF-22); debe volver a iniciar sesión.
- Re-ejecución con la base parcialmente cargada (falla anterior a mitad, RF-17): los
  usuarios de demostración que sí estaban se reemplazan y al final están todos (RF-13).
- Un usuario ajeno registrado como `NOCTURNA` o `Ghost.Pix`: conflicto de nombre de usuario
  sin distinguir mayúsculas; la carga se rechaza, nombra el conflicto y no escribe nada
  (RF-15, RF-16).
- Varios conflictos a la vez: el mensaje los nombra todos (RF-15).
- Un usuario registrado a mano con un correo de demostración (ej. `NOCTURNA@teammatchup.gg`
  o `nocturna@teammatchup.gg`, con cualquier nombre de usuario): es un usuario de
  demostración por definición y se reemplaza con sus datos (RF-13); si su nombre de usuario
  es el de otra persona de la demostración, no hay conflicto, porque él también se
  reemplaza.
- Un usuario ajeno con una cuenta del mismo juego e identificador que una de demostración
  (ej. `Jugador1#LAS`): no es conflicto; la spec 004 permite que dos usuarios vinculen el
  mismo identificador, y las dos cuentas salen con la misma marca de verificada.
- Sin MongoDB disponible: tras 10 segundos se rechaza la carga con el mensaje de base no
  disponible (RF-6).
- `NODE_ENV` ausente, vacía, solo de espacios, `dev`, `Development` o ` development `: se
  rechaza con el mensaje de la spec 001 (RF-4).
- En desarrollo, `PORT` o `JWT_SECRET` ausentes o inválidas: se rechaza con el mensaje de
  la spec 001 aunque la carga no las use (RF-4, DP11-5).
- `NODE_ENV=test` o `NODE_ENV=production`, también cuando el archivo de variables dice
  `development` y el entorno del proceso fija otro (spec 001, RF-21): se rechaza (RF-3).
- En desarrollo, `MONGODB_URI` y `MONGODB_DBNAME` iguales a `TEST_MONGODB_URI` y
  `TEST_MONGODB_DBNAME`: se rechaza (RF-5). Con la misma ubicación y otro nombre de base, o
  sin las variables de prueba definidas, la carga sigue.
- Configuración inválida y base no disponible a la vez: el mensaje es el de la
  configuración, porque se valida antes de conectar (RF-4, RF-16).
- La carga falla a mitad de la escritura: código de salida distinto de 0, mensaje de carga
  incompleta; lo ya escrito queda en la base y los usuarios ajenos siguen intactos
  (RF-14, RF-17, DP11-4).
- Coincidencias de la cuenta demo contra el servidor real distintas de las del modo
  simulado (otros candidatos, otros bloques en común u otro orden): es lo esperado, no un
  error, porque la disponibilidad de las otras 15 personas no se copia bloque a bloque
  (RF-9, DP11-2).
- Los identificadores de usuario y de cuenta los asigna la base: no son los del modo
  simulado (`user-1`, `account-user-1-lol`) ni se repiten entre ejecuciones (RNF-1).
- El servidor en marcha mientras se ejecuta la carga: se permite; las operaciones que
  lleguen sobre los usuarios de demostración durante la carga pueden ver el estado
  intermedio (como durante la cascada de la spec 006, RF-24) y se resuelven como ya fijan
  las specs 002 a 006.
- Primera resincronización de una cuenta de demostración: hace la lectura 1 y mueve el
  rango como mucho un escalón, como en cualquier cuenta recién vinculada (RF-20).

## Fuera de alcance
- Sesiones de juego de demostración (spec 006, D6-3).
- Ejecutar la carga de forma automática al arrancar el servidor o al ejecutar las pruebas.
- Cargar datos en producción o en la base de prueba, y todo lo relativo al despliegue
  (spec 010).
- Cambiar el modo simulado de la interfaz o sus datos, y cambiar la pista de la cuenta demo
  en login, que la spec 007 (RF-11) muestra solo en modo simulado.
- Cambiar cualquier operación de la API o su comportamiento.
- Mantener sincronizados de forma automática los datos del modo simulado y los de esta
  carga: si el modo simulado cambia sus personas, esta spec se revisa.
- Que la disponibilidad de las 15 personas que no son la cuenta demo, y con ella las
  coincidencias contra el servidor real, sea idéntica a la del modo simulado (DP11-2).
- Deshacer lo escrito cuando la carga falla a mitad (DP11-4).
- Garantizar que la carga y el uso simultáneo de la aplicación sobre los usuarios de
  demostración no se observen a mitad (ver casos límite).
- Opciones del comando (cargar solo parte de los datos, otro número de usuarios, otra
  contraseña).

## Criterios de finalización
- [ ] Con la base de desarrollo vacía, MongoDB disponible y `NODE_ENV=development`, el
      comando de carga termina con código 0 e informa 0 reemplazados, 16 usuarios, 25
      cuentas y la credencial de la cuenta demo (RF-18).
- [ ] Con el servidor real arrancado en desarrollo y la interfaz con el modo simulado
      desactivado, iniciar sesión como `demo@teammatchup.gg` / `demo1234` funciona; el
      perfil muestra sus tres cuentas (LoL, R6 y CS2) con rango, historial, partidas y la
      etiqueta «Datos de demostración»; Configuración muestra su disponibilidad de RF-9; y
      coincidencias muestra al menos un candidato en cada uno de los tres juegos (RF-7 a
      RF-9, RF-20).
- [ ] Resincronizar una cuenta de demostración responde 200, mueve el rango como mucho un
      escalón y añade partidas (RF-20).
- [ ] Una prueba automática compara la carga con los datos del modo simulado: los 16
      nombres de usuario, nombres visibles, biografías, correos, colores y zona horaria, las
      25 cuentas (juego, identificador y región), y el rango, los puntos, el rango
      normalizado y la marca de verificada de cada cuenta, que son los de la lectura 0
      (RF-7, RF-8, RNF-1).
- [ ] Una prueba automática comprueba que la cuenta demo tiene exactamente los 41 bloques
      de RF-9; que cada una de las otras 15 personas tiene uno de los tres perfiles, al
      menos un bloque de su ventana, como mucho 4 bloques fuera de ella y todos esos con
      hora entre las 15 y las 23, y al menos un bloque en común con la cuenta demo; que
      cada perfil lo tiene al menos una persona; y que construir los datos con dos
      instantes de ejecución distintos da la misma disponibilidad para los 16 (RF-9,
      RNF-1).
- [ ] Una prueba automática comprueba que iniciar sesión con cada usuario de demostración y
      `demo1234` responde 200 por la operación de inicio de sesión de la spec 002 y que
      ningún documento guarda la contraseña en claro (RF-7).
- [ ] Una prueba automática valida cada usuario, cada cuenta y cada disponibilidad cargados
      con las reglas de las specs 002, 003 y 004, y revisa los textos con la comparación de
      la spec 007, RF-27 (RF-10, RF-11).
- [ ] Una prueba automática comprueba las fechas: creación entre 20 y 400 días y última
      lectura entre 1 y 21 horas antes del instante de ejecución dado, con el historial de
      un solo elemento igual al rango vigente (RF-7, RF-8, RNF-2).
- [ ] Una prueba automática ejecuta la carga dos veces y comprueba que quedan 16 usuarios y
      25 cuentas de demostración, que la segunda informa 16 reemplazados y que los datos
      coinciden salvo lo que RNF-1 exceptúa (RF-13, RNF-1).
- [ ] Una prueba automática, con usuarios ajenos, cuentas y sesiones de juego en la base
      (una organizada por un usuario de demostración y otra ajena con un usuario de
      demostración como participante), comprueba que tras la re-ejecución los usuarios
      ajenos y sus cuentas no cambian, la sesión del usuario de demostración no existe y la
      ajena sigue sin él y con el estado recalculado (RF-13, RF-14).
- [ ] Una prueba automática con un usuario ajeno llamado `NOCTURNA` comprueba que la carga se
      rechaza nombrándolo y que la base queda igual que antes, documento por documento
      (RF-15, RF-16).
- [ ] Una prueba automática con un usuario registrado con un correo de demostración
      comprueba que se reemplaza (RF-13).
- [ ] Ejecutar el comando de carga con `NODE_ENV` igual a `test`, `production`, ausente,
      vacía y `dev`, con la base de desarrollo igual a la de prueba y con MongoDB
      inalcanzable termina con código distinto de 0, el mensaje correspondiente y sin
      escribir nada (RF-3 a RF-6, RF-19); lo comprueban pruebas automáticas que ejecutan el
      comando como proceso aparte.
- [ ] La construcción de los datos se prueba como regla pura, con el instante de ejecución
      como dato y sin base de datos (RNF-2).
- [ ] El comando único de pruebas termina en verde y la cantidad de documentos de cada
      colección de la base de desarrollo es la misma antes y después de ejecutarlo (RNF-6).
- [ ] La comprobación de tipos y el lint del servidor terminan en verde; no hay `.only`
      (RNF-5); no hay dependencias ni variables de entorno nuevas (RNF-4).

## Decisiones
- DP11-1 (2026-10-19, decidido por la usuaria; antes D1; RF-13). Repetir la carga
  reemplaza solo a los usuarios de demostración, identificados por su correo, con la
  cascada completa de la eliminación de un usuario, y los vuelve a crear; no toca a nadie
  más. Alternativa descartada: negarse si ya hay algún usuario de demostración y que se
  borren a mano. Consecuencias aceptadas: se pierden los cambios hechos a mano a los datos
  de demostración, y un usuario registrado a mano con un correo de demostración se
  reemplaza también.
- DP11-2 (2026-10-19, decidido por la usuaria, que no tenía preferencia; se adopta la
  alternativa más simple; antes D3; RF-9, RNF-1). La disponibilidad de la cuenta demo es
  la fija del modo simulado (41 bloques). La de las otras 15 personas es determinista (la
  misma en cada ejecución) y con la misma forma que en el modo simulado (un perfil
  nocturno, vespertino o de fin de semana, más como mucho 4 bloques sueltos), sin coincidir
  bloque a bloque. Alternativa descartada: copiar bloque a bloque la disponibilidad que el
  modo simulado da a cada persona. Consecuencia aceptada: las coincidencias contra el
  servidor real no son idénticas a las del modo simulado.
- DP11-3 (2026-10-19, decidido por la usuaria; RF-15, RF-16). La aplicación solo la usa el
  equipo en desarrollo; ante un usuario ajeno con el nombre de usuario de una persona de
  la demostración, la carga se rechaza sin escribir nada y nombra el conflicto. Es lo más
  simple y no borra cuentas del equipo. Alternativas descartadas: reemplazar o renombrar
  al usuario ajeno, o cargar sin esa persona.
- DP11-4 (2026-10-19, propuesta adoptada por defecto, pendiente de confirmar al aprobar la
  spec; antes D2; RF-17). La base local no garantiza transacciones: si la carga falla a
  mitad, se declara incompleta (código distinto de 0 y mensaje) y lo escrito queda;
  repetir la carga lo repara gracias a DP11-1. Alternativa descartada: que una falla no
  deje nada escrito (deshacer lo escrito o exigir una base con transacciones), que complica
  la carga y la configuración local.
- DP11-5 (2026-10-19, propuesta adoptada por defecto, pendiente de confirmar al aprobar la
  spec; antes D4; RF-4). El comando exige la misma configuración que el arranque del
  servidor en desarrollo (spec 001), incluidas `PORT` y `JWT_SECRET` aunque la carga no
  las use, para tener una sola validación y los mismos mensajes. Alternativa descartada:
  exigir solo `NODE_ENV` y las variables de la base de desarrollo.

## Dudas abiertas
Ninguna.

## Impacto en otras specs
No se editan desde aquí; cada cambio se hace en su spec cuando la usuaria lo apruebe.
- Spec 001: su "Fuera de alcance" ("Carga de datos de demostración (seed)") debe remitir a
  esta spec.
- Spec 007: su contexto ("El servidor no tiene datos de demostración precargados: la base
  empieza vacía"), la definición de "Datos de demostración precargados" ("solo los tiene el
  modo simulado"), su "Fuera de alcance" ("Datos de demostración precargados en el servidor
  y cualquier comando que los cargue") y la decisión R13 deben aclarar que desde esta spec
  el servidor de desarrollo puede tenerlos, solo con el comando de carga. RF-11 (pista de la
  cuenta demo solo en modo simulado) no cambia: con el servidor real la base puede no estar
  cargada. Su recorrido manual (base vacía al empezar) no cambia.
- Spec 006: la decisión D6-3 de su `tasks.md` ("El seed no carga sesiones") se mantiene
  (RF-12).
- `AGENTS.md` y `MEMORY.md`: el comando nuevo del servidor y la cuenta demo con el servidor
  real se anotan al implementar esta spec.
