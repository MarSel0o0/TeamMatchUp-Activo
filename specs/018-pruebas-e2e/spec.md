# Spec 018 — Pruebas E2E con Playwright
Estado: aprobada (2026-11-21, usuario); plan y tareas pendientes (se implementa después de la 016 y la 017).
Historial: borrador del 2026-11-21. Dudas Q1 a Q7 cerradas por el usuario el 2026-11-21. Corregida el
2026-11-21 tras la primera revisión QA (hallazgos 1 a 20), con las decisiones U6 a U9 del usuario
(sección «Decisiones»). La enmienda de los principios 1 y 4 de la constitución la hizo el usuario
el 2026-11-21 («Impacto»). Q8 cerrada y tres elecciones del planificador confirmadas por el
usuario el 2026-11-21 (U10 a U12). Corregida de nuevo el 2026-11-21 tras la segunda revisión QA
(hallazgos N1 a N4: sesión testigo, qué cuenta como «la semana muestra» y «el panel muestra», forma
EARS de RF-14, RF-18 y RF-20, y estado de la spec 016). Sin dudas abiertas. Aprobada por el
usuario el 2026-11-21, con las propuestas P1 a P6, P8 y P9 (P7 ya era la decisión U6).
Corrección de redacción del 2026-11-21, sin cambio de requisitos: el «Contexto» dice que la 017
tiene Q1 a Q8 cerradas y menciona el CR-1 de la 016, que no afecta a esta spec.

## Contexto y objetivo
El punto 3 del enunciado del último hito pide pruebas E2E con Playwright, con dos casos
mínimos: «Login + acceso protegido» y otro «como por ejemplo CRUD sobre una entidad (crear,
listar, editar, eliminar)». Las pruebas deben ubicarse en una carpeta independiente llamada
`e2etests/` dentro del proyecto, y el README global o el de `e2etests/` debe explicar cómo
correrlas. El punto 5 exige además TypeScript estricto, «sin any injustificado», y variables
sensibles en `.env`, que no se suben al repositorio. El texto íntegro está en el apéndice A de la
spec 016.

Hoy el proyecto tiene pruebas del servidor con node:test (specs 001 a 015) y la spec 016 añade
pruebas de los almacenes del frontend con Vitest. Nada comprueba de forma automática el recorrido
completo, del navegador a la base: entrar, que una ruta protegida exija sesión, ni crear, ver,
editar y cancelar una sesión de juego en la agenda. Esos recorridos se validaron a mano (registros
de validación de las specs 007, 009 y 010).

Esta spec define una suite E2E que:
1. corre contra el servidor real (Express) en modo producción, compilado en cada ejecución, que
   sirve la construcción de producción de la interfaz en un solo puerto, como en el despliegue,
   con una base MongoDB local propia de las pruebas; nunca contra el modo simulado ni contra la
   base de desarrollo o de producción;
2. cubre el caso «inicio de sesión y acceso protegido» y el CRUD de las sesiones de juego de la
   agenda (crear, listar, editar y «eliminar», que es cancelar);
3. comprueba en esos mismos recorridos «Atrás», «Adelante» y la recarga (F5) entre vistas
   (punto 2 del enunciado);
4. corre en local en Chromium con un comando documentado, sin claves ni servicios externos.

- Orden: se implementa **al final**, sobre la interfaz migrada a Mantine (spec 017) y con los
  almacenes de la spec 016. Por eso los escenarios se escriben por comportamiento observable
  (rol, nombre accesible, etiqueta y texto visible) y no por la estructura de la página, para
  que no dependan de cómo la construya la 017.
- Depende de:
  - spec 002 (registro, inicio y cierre de sesión, cookie y comprobante anti-CSRF; texto «correo
    o contraseña incorrectos»; secreto de firma propio en producción, RF-28);
  - spec 003 (eliminar el usuario, RF-11);
  - spec 004 (vincular una cuenta de juego sin verificar; la eliminación del usuario borra en
    cascada sus cuentas de juego, RF-14);
  - spec 006 (crear, listar, editar y cancelar sesiones de juego; RF-16: la eliminación del
    usuario borra en cascada sus sesiones de juego; RF-27: crear exige una cuenta vinculada en el
    juego);
  - spec 007 (página de entrada pública, rutas protegidas y solo públicas, ruta de origen y
    «llevar a una ruta por una regla de sesión»: RF-6, RF-8, RF-25, RF-33);
  - spec 009 (enlace «Ver detalle de <título>», detalle, edición y cancelación con
    confirmación; RF-2, RF-3, RF-6 a RF-8, RF-12, RF-15, RF-23);
  - spec 010 (construcción de producción servida por el servidor; recarga de rutas: RF-1, RF-2);
  - spec 016 (la agenda vuelve a su estado inicial al recargar, RF-19; «Ver las mías», RF-23; la
    sesión de juego recién creada queda abierta, RF-24 a RF-26);
  - spec 017 (textos, roles y nombres accesibles definitivos de la interfaz).

  Las specs 002 a 010 están implementadas. La 016 está aprobada por el usuario el 2026-11-21 (su
  plan y sus tareas están pendientes). La 017 es un borrador sin dudas abiertas
  (Q1 a Q8 cerradas), pendiente de su segunda revisión QA y de su aprobación. Su Q8 cambió la 016
  con el CR-1, aprobado por el usuario el 2026-11-21 (una propuesta de «Proponer» que debe
  aplicarse con una ventana abierta en la agenda espera a que esa ventana se cierre); esta spec no
  prueba «Proponer», así que ese cambio no le afecta. Los cambios de rol y de
  teclado que declara (sus Q1 a Q4) se revisaron contra los escenarios de esta spec y ninguno
  depende de ellos («Impacto»). **Condición previa a la implementación**: 016 y 017
  implementadas.
- Origen: enunciado del último hito, puntos 2, 3 y 5 (apéndice A de la spec 016). Decisiones del
  usuario del 2026-11-21 (sección «Decisiones», U1 a U12 y Q1 a Q8).
- Esta spec no cambia el comportamiento de la aplicación: no toca la interfaz ni el servidor
  (RNF-8).

## Usuarios
- Integrantes del equipo que ejecutan la suite antes de entregar o de fusionar cambios.
- Evaluador del hito, que lee el README y ejecuta la suite en su equipo.

## Historias de usuario
- HU-1. Como integrante del equipo, quiero ejecutar con un solo comando pruebas que recorran la
  aplicación en un navegador real contra el servidor real, para saber que los recorridos
  principales siguen funcionando.
- HU-2. Como integrante del equipo, quiero que las pruebas nunca toquen mi base de desarrollo ni
  la de producción, ni necesiten claves de Steam, Riot o Leetify.
- HU-3. Como evaluador, quiero seguir el README de las pruebas y verlas pasar sin pedir ayuda al
  equipo.
- HU-4. Como evaluador, quiero ver probado el inicio de sesión con el acceso a una ruta protegida
  y un CRUD completo sobre una entidad.

## Definiciones
- **EL SISTEMA**: en los RF y RNF de esta spec, la suite E2E, con su comando, su configuración y
  su documentación (el README de `e2etests/` y la sección del README raíz). Nunca designa la
  aplicación: lo que hace la aplicación se escribe siempre «el sistema bajo prueba» (o «la
  interfaz» y «el servidor» cuando se habla de una de sus partes).
- **Suite E2E**: el conjunto de pruebas de esta spec, en `e2etests/`.
- **Escenario**: una prueba de la suite. Recorre la aplicación en un navegador como lo haría un
  jugador y comprueba lo que se ve.
- **Sistema bajo prueba**: el servidor Express real, compilado y arrancado por la suite en modo
  producción, con la base E2E, que sirve en un solo puerto local la construcción de producción de
  la interfaz y la API (Q1).
- **Base E2E**: la base de MongoDB que usa el sistema bajo prueba, en un MongoDB local. Es
  distinta de la base de desarrollo (`teammatchup` en `backend/.env.example`), de la base de las
  pruebas del servidor (`teammatchup_test`) y de la base de producción (`fullstack` en el servidor
  del curso).
- **Ejecución**: una corrida completa de la suite, desde el comando hasta que termina.
- **Construcciones**: la interfaz compilada para producción (en la carpeta de salida de la
  interfaz y en la carpeta que sirve el servidor, spec 010) y el servidor compilado. Son las
  mismas carpetas que deja el procedimiento de producción de la spec 010 y ninguna se sube al
  repositorio.
- **Usuario de prueba**: un usuario ficticio que crea un escenario para sí mismo. Su correo y su
  nombre de usuario son únicos (no se repiten entre escenarios ni entre ejecuciones) y usan un
  dominio reservado para ejemplos (`example.com`). Su contraseña es un texto ficticio, no un
  secreto.
- **Título único**: el título de una sesión de juego que usa un escenario. No se repite entre
  escenarios ni entre ejecuciones, ningún título único contiene a otro (así, comprobar uno nunca
  encuentra otro que empiece igual) y cumple la regla del título de la spec 006 (de 3 a 60
  caracteres Unicode, sin caracteres prohibidos), de modo que el servidor lo guarda tal cual.
- **Sesión testigo**: una sesión de juego que el escenario prepara por la API (RF-11), organizada
  por el usuario de prueba, con un título único, y que el escenario nunca edita ni cancela. Como
  la organiza el usuario de prueba, la agenda la muestra en la semana y en el panel «Mis
  sesiones»; y como las dos cosas salen de la lista de sesiones de juego que la interfaz recibe
  del servidor, verla prueba que esa lista ya llegó. Sirve de comprobación positiva antes de
  comprobar que otra sesión de juego no aparece (RF-22). El estado vacío del panel no sirve para
  eso: la interfaz muestra «Mis sesiones» con «No estás en ninguna sesión» también mientras la
  lista carga.
- **La semana muestra <título>**: se ve un botón cuyo nombre accesible empieza por «<título>, »
  (hoy, cada bloque de la semana es un botón con el nombre «<título>, <día> <hora>, <ocupados>
  de <cupos> jugadores»). **La semana no muestra <título>**: no hay ningún botón así. La sección
  de la semana no tiene nombre accesible, así que no se acota a ella ni se usa el texto visible
  del bloque; el panel no tiene ningún botón cuyo nombre empiece así.
- **El panel se titula <X>**: se ve un encabezado de nombre <X> («Mis sesiones» o «Sesión
  abierta»). **El panel muestra la tarjeta de <título>**: se ve el enlace «Ver detalle de
  <título>» (spec 009, RF-2), que solo tienen las tarjetas del panel. **El panel no muestra
  <título>**: no hay ningún enlace con ese nombre. No se usa el texto visible del título de la
  tarjeta, que no distingue la tarjeta de otros textos.
- **<Título> no aparece en la agenda**: ni la semana ni el panel lo muestran, en el sentido de las
  dos definiciones anteriores.
- **Sesión de juego** (la entidad del CRUD): la de la spec 006. **Sesión iniciada**: la de la
  spec 002. En esta spec nunca se escribe «sesión» a secas.
- **Sesión iniciada de la suite**: la que el proceso de la suite abre por la API, fuera del
  navegador, con el usuario de prueba, para preparar datos (RF-11) o para limpiar (RF-12). Es
  independiente de la sesión iniciada del navegador: la credencial no tiene estado en el servidor
  (spec 002), así que iniciar o cerrar sesión en el navegador no la invalida, ni al revés.
- **Eliminar una sesión de juego**: cancelarla. El servidor la borra y responde 204 (spec 006,
  RF-9). El usuario aceptó esta equivalencia (U3).
- **Preparar por la API**: hacer, con peticiones HTTP a la API pública del sistema bajo prueba y
  respetando sus reglas (comprobante anti-CSRF incluido), lo que un jugador haría por la interfaz
  (Q4, ajustada por U8).
- **Servicio externo**: cualquier servicio fuera del sistema bajo prueba: Steam, Riot Games,
  Data Dragon y Leetify.
- **Ruta protegida**, **ruta de origen**, **Inicio**, **login**, **página de entrada** y
  **llevar a una ruta por una regla de sesión** (sustituye la entrada actual del historial): los
  de la spec 007. La página de entrada es pública y se muestra con o sin sesión iniciada: la spec
  007, RF-33, solo lleva a Inicio desde login y registro.

## Requisitos funcionales

### Ubicación, ejecución y documentación
- RF-1: EL SISTEMA vive en la carpeta `e2etests/`, en la raíz del proyecto, al lado de `frontend/`
  y `backend/` e independiente de ellas: tiene sus propias dependencias, su propia configuración,
  su propia comprobación de tipos y su propio lint. No importa código de `frontend/` ni de
  `backend/`, y llega a la aplicación solo a través del navegador y de la API HTTP del sistema
  bajo prueba.
- RF-2: CUANDO un integrante ejecuta, desde `e2etests/`, el comando de pruebas documentado
  (RF-3), EL SISTEMA hace, en este orden:
  1. comprueba, sin compilar ni arrancar nada, las condiciones previas que puede comprobar por sí
     mismo (RF-4): nombre y ubicación de la base E2E (RF-6), dependencias instaladas, Chromium de
     Playwright instalado y puerto del sistema bajo prueba libre (RF-7);
  2. compila las construcciones de la interfaz y del servidor a partir del código actual, sin
     usar ninguna construcción anterior (RF-5);
  3. arranca el sistema bajo prueba con la base E2E y espera a que responda;
  4. ejecuta todos los escenarios en Chromium (Q2), en serie: un solo escenario a la vez, nunca
     dos en paralelo (RF-13);
  5. detiene lo que arrancó al terminar, también si un escenario falla o si se interrumpe la
     ejecución con Ctrl+C;
  6. termina con código 0 si pasan todos los escenarios y con un código distinto de 0 si falla
     alguno (también por la limpieza, RF-12).
- RF-3: EL SISTEMA documenta en `e2etests/README.md` cómo correr la suite, y el README raíz tiene
  una sección «Pruebas E2E» que enlaza a ese archivo (P4). El README de `e2etests/` indica:
  - las condiciones previas: versión de Node, MongoDB local en marcha, dependencias de
    `frontend/`, `backend/` y `e2etests/` instaladas, y Chromium de Playwright instalado, con el
    comando de cada una;
  - como herramienta opcional, que no hace falta para ejecutar la suite, el intérprete de MongoDB
    (mongosh), con cómo comprobar que está instalado; con él se inspecciona o se borra a mano la
    base E2E;
  - el comando de pruebas, cómo ejecutar un solo escenario, cómo ejecutar los escenarios en orden
    inverso (RF-13), y los comandos de comprobación de tipos y de lint;
  - que cada ejecución compila la interfaz y el servidor y sustituye las construcciones que haya
    (la carpeta de salida de la interfaz, la carpeta que sirve el servidor y la del servidor
    compilado, Definiciones), que el procedimiento de producción de la spec 010 vuelve a generar;
  - un aviso de no ejecutar la suite mientras haya en marcha un servidor de producción local
    arrancado a mano desde el mismo checkout en otro puerto (por ejemplo, el procedimiento de la
    spec 010 en el 3001): la suite no lo detecta y sustituiría las construcciones que sirve
    (limitación conocida, Q8);
  - qué base usa la suite, qué queda en ella tras una ejecución (RF-12) y cómo borrarla a mano;
  - las variables opcionales, con sus valores por defecto. Ninguna es un secreto;
  - en qué puerto arranca el sistema bajo prueba;
  - que solo se prueba en Chromium, y por qué (Q1, Q2);
  - que no toca la base de desarrollo, la de producción, el modo simulado ni ningún servicio
    externo;
  - cómo ver el informe y las trazas de un escenario fallido;
  - cuánto tarda una ejecución en un equipo de desarrollo, compilación incluida;
  - en qué plataformas se ejecutó de verdad (RNF-9).
- RF-4: SI falla una condición previa del paso 1 de RF-2 (nombre o ubicación de la base no
  admitidos, faltan dependencias o Chromium, o el puerto está ocupado), ENTONCES EL SISTEMA
  termina con un código distinto de 0 sin compilar, sin arrancar el servidor y sin ejecutar
  ningún escenario, con un mensaje que dice qué condición falla. SI falla la compilación de la
  interfaz o del servidor, ENTONCES termina con un código distinto de 0 sin arrancar el servidor
  ni ejecutar escenarios, y la salida muestra el error del compilador. SI el sistema bajo prueba
  termina al arrancar, o no responde en 60 segundos desde que se arrancó, ENTONCES termina con un
  código distinto de 0 sin ejecutar escenarios, y la salida muestra el mensaje del servidor, por
  ejemplo «la base de datos no está disponible: no se pudo conectar en 10 s» con MongoDB
  apagado.

### Sistema bajo prueba y aislamiento
- RF-5: EL SISTEMA prueba siempre la interfaz de producción servida por el servidor real
  compilado, nunca el modo simulado, el servidor de desarrollo de la interfaz ni una construcción
  anterior. En cada ejecución:
  - compila la construcción de producción de la interfaz, con el modo simulado desactivado y con
    la dirección de la API relativa al mismo origen (la ruta de la API en el mismo servidor que
    sirve la interfaz), aunque los archivos de variables de la interfaz digan otra cosa (spec
    007, RF-1), y la deja en la carpeta que sirve el servidor (spec 010, RF-1);
  - compila el servidor;
  - arranca el servidor compilado en modo producción, escuchando solo en `127.0.0.1` y en el
    puerto de la suite (RF-7), de modo que un solo puerto sirve la interfaz y la API y la
    recarga de cualquier ruta de la interfaz la resuelve el servidor (spec 010, RF-2).
  Todo lo que la suite fija para compilar y arrancar (modo, puerto, dirección de escucha, base,
  secreto, claves y variables de la interfaz; RF-5, RF-6, RF-8 y RF-10) lo pasa por el entorno
  del proceso, que prevalece sobre los archivos de variables de la interfaz y del servidor (spec
  001, RF-21), y nunca modifica esos archivos (P5).
- RF-6: EL SISTEMA arranca el servidor con la base E2E, cuyo nombre y ubicación fija en el
  entorno del proceso (RF-5). El nombre tiene un valor por defecto que contiene «e2e» y la
  ubicación es `mongodb://127.0.0.1:27017` por defecto; los dos se pueden cambiar con variables
  propias de la suite (RF-3). SI, en el paso 1 de RF-2:
  - el nombre no contiene «e2e», sin distinguir mayúsculas de minúsculas («E2E» vale); o
  - el nombre coincide, sin distinguir mayúsculas de minúsculas, con el de la base de desarrollo o
    el de la base de pruebas del servidor que estén configurados (en el entorno del proceso o en
    el archivo de variables del servidor), porque MongoDB no admite en un mismo servidor dos bases
    cuyos nombres solo difieren en mayúsculas; o
  - la ubicación no es local: alguno de los servidores que nombra no es `127.0.0.1` ni
    `localhost`, o usa un esquema que busca los servidores por DNS;

  ENTONCES EL SISTEMA no compila, no arranca el servidor ni ejecuta ningún escenario, y termina
  con un código distinto de 0 y un mensaje que dice qué regla no se cumple. El mensaje nunca
  muestra la ubicación completa, que puede llevar credenciales.
- RF-7: EL SISTEMA solo ejecuta los escenarios contra el sistema bajo prueba que arrancó él mismo:
  - nunca reutiliza un servidor que ya esté escuchando en su puerto. SI el puerto está ocupado
    (por otra ejecución de la suite o por cualquier otro servidor), ENTONCES aplica RF-4 antes de
    compilar, de modo que no sustituye las construcciones que ese servidor pueda estar sirviendo.
    Esta comprobación no detecta un servidor que sirva esas construcciones en otro puerto:
    limitación conocida, que el README avisa (RF-3, Q8);
  - nunca apunta a la aplicación desplegada en el servidor del curso;
  - usa un puerto propio, distinto de los de desarrollo (3001 del servidor y 5173 de la
    interfaz), para poder correr con el entorno de desarrollo en marcha. El puerto tiene un valor
    por defecto y se puede cambiar con una variable;
  - el sistema bajo prueba escucha solo en la dirección local (`127.0.0.1`), y los escenarios lo
    abren en `http://127.0.0.1:<puerto>`.
- RF-8: EL SISTEMA arranca el servidor sin claves de Steam, Riot Games ni Leetify, aunque el
  archivo de variables del servidor las tenga: las fija vacías en el entorno del proceso. Con
  eso, «Verificar con Steam» y «Verificar con Riot Games» no se ofrecen (specs 013, RF-22, y 014,
  RF-38). Ningún escenario verifica cuentas ni las resincroniza, y ninguno usa una cuenta de CS2
  verificada, que es la única que consultaría Leetify (spec 015).
- RF-9: MIENTRAS corre un escenario, EL SISTEMA bloquea en el navegador toda petición a un origen
  distinto del sistema bajo prueba. Los escenarios pasan igual: la interfaz ya tolera que Data
  Dragon no responda, porque usa una versión de respaldo sin mostrar ningún error (spec 014). La
  suite pasa sin conexión a Internet una vez instaladas las dependencias y Chromium.
- RF-10: CUANDO arranca el servidor en modo producción, EL SISTEMA genera al azar en esa ejecución
  un secreto de firma distinto del de desarrollo (producción no arranca con este, spec 002,
  RF-28) y se lo pasa al servidor por el entorno del proceso. El secreto no aparece en ningún
  archivo ni en la salida: ni en `e2etests/`, ni en los informes de la ejecución (en ningún
  formato, también el JSON), ni en las trazas, las capturas o los resultados. EL SISTEMA no usa
  ningún secreto real. Riesgo para el plan: los informes de Playwright, sobre todo el JSON,
  pueden incluir la configuración de la ejecución, con las variables del servidor de pruebas
  («Notas para el plan»).

### Datos de prueba
- RF-11: CUANDO un escenario necesita datos, EL SISTEMA los prepara para ese escenario antes de
  recorrer la interfaz (Q4, ajustada por U8):
  - por la API, desde el proceso de la suite: un usuario de prueba nuevo, registrado con correo y
    nombre de usuario únicos; y, con la sesión iniciada de la suite (Definiciones), que lee el
    comprobante anti-CSRF de la respuesta del inicio de sesión y lo envía en cada petición (spec
    002):
    - en C1, C2 y C3, una cuenta de juego vinculada a ese usuario, sin verificar (datos simulados,
      spec 004), con un identificador que cumple el formato del juego y es único por usuario de
      prueba. Crear una sesión de juego la exige (spec 006, RF-27);
    - en C2 y C3, la sesión de juego que el escenario edita o cancela, con un título único. C1
      crea la suya por la interfaz, porque es lo que comprueba (RF-18);
    - en C1 y C3, una sesión testigo (Definiciones), que el escenario usa como comprobación
      positiva de que la lista de la agenda llegó (RF-22);
    - toda sesión de juego que prepara por la API va en el juego de la cuenta vinculada y en un
      día y una hora de inicio que la semana de la agenda muestra, de modo que la semana tiene
      su bloque;
  - por la interfaz: la sesión iniciada del navegador. Todo escenario que la necesita (E1, E3, E4,
    C1, C2 y C3) inicia sesión rellenando el formulario de login con el correo y la contraseña del
    usuario de prueba, también cuando no es lo que comprueba. E2 la intenta con una contraseña
    equivocada.

  EL SISTEMA nunca escribe en el almacenamiento del navegador ni le añade cookies: la sesión
  iniciada de la suite no pasa al navegador. Lo que el escenario comprueba se hace siempre por la
  interfaz (RF-21), aunque sus datos se preparen por la API. La suite no escribe en la base
  directamente. La carga de datos de demostración de la spec 011 no sirve para esto: solo se
  permite en desarrollo (spec 011, RF-3).
- RF-12: CUANDO termina un escenario, pase o falle, EL SISTEMA elimina el usuario de prueba que
  creó ese escenario (Q3), lo que borra en cascada sus cuentas de juego (spec 004, RF-14) y sus
  sesiones de juego (spec 006, RF-16). Para ello inicia siempre una sesión iniciada de la suite
  nueva con ese usuario (nunca reutiliza la del navegador ni depende de que el escenario la haya
  dejado abierta) y elimina el usuario por la API (spec 003, RF-11).
  - SI el usuario nunca llegó a crearse (el registro respondió con error o no se llegó a enviar),
    ENTONCES no hay nada que limpiar y no es un fallo de limpieza: el escenario ya falló en su
    preparación y el informe lo dice. SI el registro no llegó a responder, ENTONCES la limpieza
    lo intenta igual, y un 401 «correo o contraseña incorrectos» al iniciar su sesión significa
    que el usuario no existe y tampoco es un fallo de limpieza.
  - SI el inicio de sesión de la limpieza o la eliminación no responden con éxito (otro código o
    sin respuesta), ENTONCES el escenario cuenta como fallido aunque sus comprobaciones hayan
    pasado, y el informe muestra un error propio que dice: que falló la limpieza y no el
    escenario; el correo y el nombre de usuario del usuario de prueba que quedó en la base E2E; y
    el código HTTP recibido o el motivo (por ejemplo, sin respuesta). Si el escenario también
    había fallado, el informe muestra los dos fallos (U6).

  Si una ejecución se interrumpe y deja datos, la siguiente pasa igual: los usuarios y los
  títulos son únicos (RF-11) y los restos no tapan lo que usa cada escenario (RF-13). Esos restos
  se borran a mano eliminando la base E2E (RF-3).
- RF-13: EL SISTEMA ejecuta los escenarios en serie, uno a la vez (RF-2), y permite ejecutar
  cada uno solo, en cualquier orden y repetido, con el mismo resultado. Ningún escenario depende
  de lo que haya hecho otro. Además, EL SISTEMA ofrece una forma documentada (RF-3) de ejecutar
  todos los escenarios en una misma ejecución en el orden inverso al habitual (U11).

  La agenda muestra en la semana las sesiones de juego de todos los usuarios, también las de otros
  escenarios y los restos de ejecuciones interrumpidas (la lista de la spec 006 no se filtra por
  usuario). Para que esos datos no tapen lo que usa cada escenario:
  - cada escenario localiza sus sesiones de juego por su título único, en la semana y en el
    panel tal como lo definen «La semana muestra <título>» y «El panel muestra la tarjeta de
    <título>» (Definiciones), nunca por su posición, su día u hora ni por cuántas hay;
  - ningún escenario pulsa un bloque de la semana ni una sesión de juego de la semana: C1 abre
    «Anotar una sesión» con el botón de la cabecera de la agenda (RF-18) y C2 y C3 llegan al
    detalle por el enlace de la tarjeta del panel (RF-19, RF-20);
  - el panel «Mis sesiones» solo muestra las sesiones de juego del usuario de prueba, que es
    nuevo, así que su contenido depende solo del escenario (por ejemplo, la tarjeta de su sesión
    testigo);
  - ningún escenario cuenta las sesiones de juego de la semana.

### Escenarios
En RF-14 a RF-20, las viñetas numeradas son pasos que el escenario ejecuta en el orden en que
aparecen; cada paso parte del estado que dejó el anterior, y cada comprobación espera a ese estado
(RF-22). «Iniciar sesión por la interfaz» es rellenar los campos de correo y contraseña de login,
localizados por su etiqueta, con los del usuario de prueba, y pulsar el botón de enviar el
formulario («Entrar»). «Abrir una dirección» es escribirla en el navegador, lo que añade una
entrada al historial. «La semana muestra», «el panel se titula», «el panel muestra la tarjeta» y
«no aparece en la agenda» tienen el sentido de las Definiciones. Los pasos «Atrás» y «Adelante» se hacen entre entradas del historial de un
mismo documento (navegación dentro de la aplicación), salvo el de E1, que vuelve a la página de
entrada, pública, que se ve igual se recargue o la restaure el navegador.

#### Inicio de sesión y acceso protegido
- RF-14 (E1, ruta protegida sin sesión y vuelta a la ruta de origen): CUANDO se ejecuta E1,
  partiendo de un navegador sin sesión iniciada (condición previa: el paso 3 la inicia), EL
  SISTEMA:
  1. abre la página de entrada (la raíz) y comprueba que se ve: su dirección y un texto propio de
     esa página (RF-21). Es la entrada del historial a la que debe volver «Atrás» en el paso 4;
  2. abre la dirección de la agenda y comprueba que la dirección pasa a la de login, que se ven
     los campos de correo y contraseña y, con ellos a la vista, que no se ve el título de la
     agenda (spec 007, RF-25);
  3. inicia sesión por la interfaz y comprueba que la dirección es la de la agenda, que era la
     ruta de origen (spec 007, RF-8 y RF-25), y que se ve su contenido: el título de la agenda y
     el panel titulado «Mis sesiones». No comprueba el estado vacío del panel, que la interfaz
     muestra también mientras la lista carga y no prueba nada (Definiciones, «Sesión testigo»);
  4. pulsa «Atrás» y comprueba que la dirección es la de la página de entrada y que se ve su
     texto propio del paso 1; con eso a la vista, que no se ven los campos de login.

  El paso 4 falla si cualquiera de las dos redirecciones no sustituyó su entrada del historial
  (spec 007, «Llevar a una ruta por una regla de sesión»): si la de la agenda a login hubiera
  añadido una entrada, «Atrás» volvería a la agenda; si la de login a la agenda la hubiera
  añadido, «Atrás» volvería a login, que con sesión lleva a Inicio (spec 007, RF-33). En los dos
  casos la dirección no sería la de la página de entrada (RNF-11).
- RF-15 (E2, credenciales incorrectas): MIENTRAS el navegador no tiene sesión iniciada, EL
  SISTEMA:
  1. abre la dirección de login e intenta iniciar sesión por la interfaz con el correo del
     usuario de prueba y una contraseña distinta de la suya; comprueba que login muestra «correo o
     contraseña incorrectos» (spec 002, RF-9; spec 007), que la dirección sigue siendo la de login
     y que los campos de correo y contraseña siguen a la vista;
  2. abre la dirección de la agenda y comprueba que la dirección pasa a la de login y se ven sus
     campos; con ellos a la vista, que no se ve el título de la agenda.
- RF-16 (E3, ruta protegida con sesión y recarga): EL SISTEMA:
  1. abre la dirección de login, inicia sesión por la interfaz y comprueba que llega a Inicio (su
     dirección y un texto propio de Inicio, RF-21), porque no había ruta de origen (spec 007,
     RF-8);
  2. abre la dirección de la agenda y comprueba que se ve su contenido (el título de la agenda y
     el panel «Mis sesiones») en la dirección de la agenda;
  3. recarga la página (F5) y comprueba que sigue en la dirección de la agenda y vuelve a verse
     su contenido (spec 007, RF-5; spec 010, RF-2);
  4. abre la dirección de login y comprueba que la dirección pasa a la de Inicio y se ve su texto
     propio; con eso a la vista, que no se ven los campos de login (spec 007, RF-33).
- RF-17 (E4, cierre de sesión): EL SISTEMA:
  1. abre la dirección de login, inicia sesión por la interfaz y comprueba que llega a Inicio;
  2. pulsa el enlace de la agenda de la barra de navegación y comprueba que se ve el contenido de
     la agenda en su dirección (una entrada nueva del historial, en el mismo documento);
  3. pulsa «Cerrar sesión» y comprueba que la dirección pasa a la de login y se ven sus campos
     (spec 007, RF-6). La redirección sustituye la entrada de la agenda, así que la entrada
     anterior es la de Inicio;
  4. pulsa «Atrás» y comprueba que la dirección es la de login y se ven sus campos, porque Inicio
     es una ruta protegida y ya no hay sesión iniciada (spec 007, RF-25); con eso a la vista, que
     no se ve el contenido de Inicio ni el de la agenda;
  5. inicia sesión por la interfaz y comprueba que llega a Inicio, la ruta de origen que recordó
     el paso 4 (spec 007, RF-8 y RF-25), y no a la agenda. Si el cierre de sesión hubiera añadido
     una entrada en lugar de sustituir la de la agenda, «Atrás» habría llevado a la agenda y la
     ruta de origen sería la agenda (RNF-11);
  6. cierra sesión otra vez, abre la dirección de la agenda y comprueba que lleva a login;
  7. recarga la página (F5) en login y comprueba que sigue en la dirección de login con sus
     campos a la vista.

#### CRUD de sesiones de juego
En RF-18 a RF-20, el escenario ya inició sesión por la interfaz (RF-11) antes del paso 1.
- RF-18 (C1, crear y listar): CUANDO se ejecuta C1, partiendo de un usuario de prueba con sesión
  iniciada en el navegador, una cuenta vinculada en un juego y una sesión testigo (RF-11), EL
  SISTEMA:
  1. abre la dirección de la agenda y comprueba que «Todos los juegos» está pulsado, que el
     panel se titula «Mis sesiones» y muestra la tarjeta de la sesión testigo y que la semana
     muestra la sesión testigo. Con eso, la lista de la agenda ya llegó (el panel se titula
     «Mis sesiones», con «No estás en ninguna sesión», también mientras carga);
  2. pulsa «Anotar sesión» de la cabecera de la agenda (el botón de la página, fuera de cualquier
     ventana) y comprueba que se abre la ventana modal «Anotar una sesión», localizada por su rol
     de ventana y su nombre (spec 017, RF-12);
  3. dentro de esa ventana, escribe un título único en «Título» y pulsa el botón de envío
     «Anotar sesión» de esa misma ventana. Los dos botones «Anotar sesión» se distinguen por su
     contexto: el de la cabecera está en la página y el de envío dentro de la ventana;
  4. comprueba que el panel se titula «Sesión abierta» y muestra la tarjeta de la sesión de juego
     creada, con el enlace «Ver detalle de <título>» (spec 009, RF-2), porque con el filtro
     «Todos los juegos» la sesión recién creada queda abierta (spec 016, RF-24 y RF-26); que la
     semana muestra la sesión de juego por su título; y, con eso a la vista, que la ventana
     «Anotar una sesión» ya no está abierta;
  5. pulsa «Ver las mías» y comprueba que el panel se titula «Mis sesiones» y muestra la tarjeta
     con «Ver detalle de <título>» (spec 016, RF-23), además de la de la sesión testigo;
  6. recarga la página (F5) y comprueba que la agenda vuelve a su estado inicial (spec 016,
     RF-19): «Todos los juegos» pulsado, el panel «Mis sesiones» con la tarjeta de la sesión de
     juego creada y la semana con la sesión de juego creada. Es decir, la guardó el servidor y no
     solo la interfaz.
- RF-19 (C2, ver y editar, con «Atrás», «Adelante» y recarga): MIENTRAS el usuario de prueba
  organiza una sesión de juego creada por la API con un título único (RF-11), EL SISTEMA:
  1. abre la dirección de la agenda y comprueba que el panel «Mis sesiones» muestra la tarjeta con
     «Ver detalle de <título>»;
  2. pulsa ese enlace y comprueba que el detalle se abre en su propia dirección, con el título, el
     día y el horario, los cupos («<ocupados>/<totales> jugadores») y el usuario de prueba marcado
     como quien organiza (spec 009, RF-2 y RF-3);
  3. pulsa «Editar sesión» y comprueba que el formulario de edición muestra los valores actuales
     (al menos el título y los cupos); cambia el título por otro título único y los cupos, elige
     los cupos en la lista «Cupos» por su etiqueta, pulsa «Guardar cambios» y comprueba que se ve
     «Cambios guardados.» y que el detalle muestra el título y los cupos nuevos (spec 009, RF-6 y
     RF-7);
  4. sin recargar antes, pulsa «Atrás» y comprueba que la dirección es la de la agenda, que el
     panel «Mis sesiones» muestra la tarjeta con «Ver detalle de <título nuevo>» y que la semana
     muestra el título nuevo; con eso a la vista, que el título anterior no aparece en la
     agenda. Comprueba así que la agenda refleja el cambio sin recargar (spec 009, RF-15);
  5. pulsa «Adelante» y comprueba que vuelve a la dirección del detalle de la misma sesión de
     juego, con el título y los cupos nuevos;
  6. recarga la página (F5) en el detalle y comprueba que sigue en esa dirección con el título y
     los cupos nuevos (los guardó el servidor).
- RF-20 (C3, eliminar = cancelar): CUANDO se ejecuta C3, partiendo de un usuario de prueba con
  sesión iniciada en el navegador que organiza una sesión de juego creada por la API con un
  título único y una sesión testigo (RF-11; condición previa: el paso 5 cancela la primera), EL
  SISTEMA:
  1. abre la dirección de la agenda y comprueba que el panel «Mis sesiones» muestra la tarjeta con
     «Ver detalle de <título>» y la de la sesión testigo;
  2. pulsa ese enlace y comprueba que se ve el detalle con su título en su propia dirección (una
     entrada nueva del historial; spec 009, RF-2);
  3. pulsa «Cancelar sesión» y comprueba que se abre la ventana de confirmación «¿Cancelar esta
     sesión?» (spec 009, RF-23);
  4. la cierra con «Volver», sin confirmar, y comprueba que el detalle sigue mostrando el título y
     el botón «Cancelar sesión»; con eso a la vista, que la ventana ya no está abierta;
  5. pulsa «Cancelar sesión» otra vez, confirma con «Sí, cancelar sesión» y comprueba que la
     dirección pasa a la de la agenda, que el panel se titula «Mis sesiones» y muestra la
     tarjeta de la sesión testigo y que la semana muestra la sesión testigo; con eso a la vista,
     que el título de la sesión de juego cancelada no aparece en la agenda (spec 009, RF-8 y
     RF-15);
  6. sin recargar antes, pulsa «Atrás» y comprueba que la dirección es la de la agenda, que el
     panel «Mis sesiones» muestra la tarjeta de la sesión testigo y que la semana muestra la
     sesión testigo; con eso a la vista, que el título cancelado no aparece en la agenda y que no
     se ve el detalle (su botón «Editar sesión», que las tarjetas del panel no tienen). La entrada anterior es la agenda del paso 1, porque la cancelación
     sustituyó la entrada del detalle (spec 009, RF-8). Si la hubiera añadido, «Atrás» llevaría a
     la dirección del detalle cancelado (RNF-11). «Atrás» va antes de la recarga del paso 7 (U10);
  7. recarga la página (F5) y comprueba lo mismo que en el paso 6, en el mismo orden: primero la
     sesión testigo en el panel y en la semana y, solo con ella a la vista, que el título
     cancelado no aparece. Tras recargar, la interfaz pide la lista otra vez y, mientras llega,
     muestra el panel «Mis sesiones» vacío: sin la sesión testigo, «no aparece» pasaría aunque la
     cancelación no hubiera borrado nada;
  8. abre la dirección del detalle de esa sesión de juego y comprueba que se ve «Esta sesión no
     existe» con el enlace «Ir a la agenda» (spec 009, RF-12).

### Cómo comprueban los escenarios
- RF-21: EL SISTEMA localiza los elementos de la interfaz por su rol y su nombre accesible, por
  la etiqueta de su campo o por su texto visible, acotados cuando hace falta a la región o la
  ventana que los contiene (por ejemplo, la ventana «Anotar una sesión»), y comprueba las
  direcciones por su ruta (por ejemplo, la de login, la de la agenda o la del detalle). No usa
  clases de estilo, selectores de la estructura de la página ni atributos añadidos solo para las
  pruebas (P1). Los textos que comprueba son los que fijan las specs 002, 006, 007, 009 y 016;
  si un texto que usa un escenario no lo fija ninguna spec (por ejemplo, el título de la agenda,
  el texto propio de la página de entrada o de Inicio, el nombre del enlace de la agenda de la
  barra o el nombre accesible de los bloques de la semana, «<título>, …»), el que muestra hoy la
  interfaz, que la spec 017 no cambia (su RF-19). Qué cuenta como «la semana muestra» y «el panel
  muestra» lo fijan las Definiciones, sin acotar a la sección de la semana, que no tiene nombre
  accesible. El plan lista
  cada texto con su origen (U12). SI un elemento que un escenario necesita no se puede localizar así,
  ENTONCES no se le añade un atributo para las pruebas: se registra como defecto de
  accesibilidad y se resuelve con un cambio de requisitos de la spec que corresponda (RNF-8).
- RF-22: EL SISTEMA espera siempre a un estado observable (un texto, un rol o una dirección) y
  nunca un tiempo fijo. Toda comprobación de que algo no se ve («ya no aparece», «no el
  anterior», «sin mostrar el formulario», «la ventana ya no está») se hace después de una
  comprobación positiva del mismo estado de la página (por ejemplo, la lista de la agenda ya
  recibida: la tarjeta en el panel y el bloque en la semana de una sesión de juego del
  escenario, como la sesión testigo o la que acaba de editar; o la vista de destino a la vista),
  nunca sola ni como primera comprobación tras una acción. La comprobación positiva tiene que
  ser algo que solo exista en el estado que se quiere comprobar: el estado vacío del panel («No
  estás en ninguna sesión») no vale como prueba de que la lista llegó, porque la interfaz lo
  muestra también mientras la lista carga (Definiciones, «Sesión testigo»). SI un escenario falla, ENTONCES EL SISTEMA guarda una
  traza y una captura de la página del fallo, y el informe de la ejecución dice qué escenario
  falló y qué comprobación no se cumplió (o, si falló la limpieza, lo que fija RF-12).

## Requisitos no funcionales
- RNF-1: Dependencias nuevas, solo en `e2etests/`, todas de desarrollo, con versión exacta
  (constitución, principio 1; `AGENTS.md`) y justificadas en el plan: Playwright como ejecutor de
  pruebas, TypeScript, los tipos de Node, y para el lint (Q6) ESLint, su configuración
  recomendada de JavaScript y typescript-eslint. TypeScript, los tipos de Node y las tres de lint
  van en las mismas versiones exactas que usa hoy el servidor (hoy TypeScript 5.9.3, tipos de
  Node 22.20.2, ESLint y su configuración recomendada 9.39.5, typescript-eslint 8.70.0), para que
  las reglas y la comprobación de tipos sean las mismas. Ninguna de acceso directo a la base (Q3,
  Q4). No se añade ninguna dependencia a `frontend/` ni a `backend/`. Chromium se instala con el
  instalador de Playwright y no se sube al repositorio.
- RNF-2: TypeScript estricto en `e2etests/`, sin `any`, `@ts-ignore`, `@ts-expect-error` ni
  aserciones de tipo para esquivar errores. La comprobación de tipos y el lint de `e2etests/`
  están en verde (Q6). El lint aplica las mismas reglas que el del servidor, que rechaza los `any`
  explícitos.
- RNF-3: Sin `.only`. Sin escenarios omitidos ni marcados como fallo esperado sin una razón
  escrita junto a ellos y aprobada por el usuario. Sin reintentos automáticos de escenarios
  fallidos, para no ocultar fallos intermitentes (P3).
- RNF-4: Estabilidad: tres ejecuciones completas seguidas, en el mismo equipo, en serie (RF-2) y
  sin tocar nada entre medias (tampoco la base E2E), terminan las tres en verde.
- RNF-5: Duración: una ejecución completa, con las dependencias y Chromium ya instalados,
  termina en 5 minutos como máximo en un equipo de desarrollo del equipo, incluida la compilación
  de la interfaz y del servidor. El README anota el tiempo medido.
- RNF-6: Ningún archivo del repositorio contiene secretos ni credenciales reales (constitución,
  principio 5). Si la suite admite un archivo de variables propio, ese archivo no se sube (como
  `.env`) y hay una plantilla sin secretos. Tampoco se suben los informes, las trazas, las
  capturas, los resultados de las ejecuciones ni las construcciones.
- RNF-7: Idioma (constitución, principio 6): identificadores y nombres de archivo en inglés;
  nombres de los escenarios, comentarios, mensajes propios y README en español.
- RNF-8: Esta spec no cambia el código de `frontend/` ni de `backend/`, ni el comportamiento de
  ninguna otra spec. SI el plan encuentra que hace falta un cambio en la aplicación para poder
  probarla (por ejemplo, un nombre accesible que falta), ENTONCES ese cambio se hace primero en la
  spec que corresponda, por el flujo de cambio de requisitos.
- RNF-9: Ni el comando de pruebas ni los scripts de `e2etests/` usan una sintaxis exclusiva de
  una consola (asignar variables delante del comando, comillas o comodines que solo entiende una
  consola, encadenar con operadores de una consola concreta), a diferencia de `npm test` del
  servidor, que en Windows necesita `--script-shell=bash`. Así el comando vale en Linux, macOS y
  Windows. Se comprueba de verdad, ejecutando la suite completa, en Linux y en al menos una de
  macOS o Windows; el registro de validación anota en cuáles se ejecutó y el README lo dice
  (RF-3). En la plataforma que no se ejecute, la regla se comprueba solo leyendo los scripts.
- RNF-10: El resultado no depende de la zona horaria, del idioma ni del día y la hora del equipo
  que ejecuta. Las sesiones de juego son de la semana tipo, sin fecha de calendario (spec 006).
- RNF-11: Las pruebas E2E siguen el principio 4 de la constitución en su forma enmendada (Q5):
  comprueban comportamiento ya especificado e implementado, así que no se escriben antes que el
  código; en su lugar, cada escenario se ve fallar al romper a propósito lo que comprueba (prueba
  de sensibilidad de los criterios), y ninguna tarea se cierra con ellas en rojo.

## Casos límite
- MongoDB apagado: la suite compila (no puede saberlo antes), el servidor no arranca («la base de
  datos no está disponible…») y la suite termina con un código distinto de 0 sin ejecutar
  escenarios (RF-4).
- La compilación de la interfaz o del servidor falla (por ejemplo, un error de tipos en
  `frontend/` o en `backend/`): la suite termina con un código distinto de 0 sin arrancar el
  servidor ni ejecutar escenarios (RF-4).
- Chromium de Playwright sin instalar: la suite lo dice y termina con un código distinto de 0
  antes de compilar (RF-4).
- Puerto del sistema bajo prueba ocupado, por ejemplo por otra ejecución de la suite en marcha o
  por un servidor de producción arrancado a mano en ese puerto: la segunda ejecución termina con
  un código distinto de 0 y un mensaje, sin compilar, de modo que no sustituye las construcciones
  que el otro está sirviendo (RF-4, RF-7).
- Servidor de producción arrancado a mano en otro puerto (por ejemplo, el procedimiento de la spec
  010 en el 3001) desde el mismo directorio: la comprobación del puerto no lo detecta y la suite
  sustituiría las construcciones que sirve. Limitación conocida (Q8): la suite no se protege de
  ello y el README avisa de no ejecutarla en esa situación (RF-3, RF-7).
- Entorno de desarrollo en marcha (servidor en 3001, interfaz en 5173): la suite corre igual en
  su propio puerto y no toca la base de desarrollo (RF-6, RF-7). La interfaz de desarrollo no usa
  las construcciones, así que no le afecta que se sustituyan.
- El integrante tenía construcciones previas (la interfaz en su carpeta de salida y en la que
  sirve el servidor, o el servidor compilado), por ejemplo del procedimiento de producción de la
  spec 010: la ejecución las sustituye por las suyas (RF-5). No se suben al repositorio y se
  regeneran con ese procedimiento; el README lo avisa (RF-3).
- Archivos de variables de la interfaz (`frontend/.env`, `frontend/.env.production` o
  `frontend/.env.production.local`) con el modo simulado activado (`VITE_USE_MOCK_API=true`) o con
  la dirección de la API apuntando al servidor de desarrollo (por ejemplo,
  `http://localhost:3001/api`): la suite compila igual la interfaz con el modo simulado
  desactivado y la API relativa al mismo origen (RF-5).
- `backend/.env` con `NODE_ENV=development`, `PORT=3001`, `HOST=0.0.0.0`, la base de desarrollo
  (nombre y ubicación, también remota), el secreto de desarrollo o claves de Steam, Riot o
  Leetify: la suite arranca en modo producción, en su puerto y en `127.0.0.1`, con la base E2E,
  un secreto generado y sin claves (RF-5, RF-6, RF-8, RF-10).
- Variable del nombre de la base cambiada a `teammatchup` o a otro nombre sin «e2e»: la suite no
  arranca. Cambiada a `TeamMatchUp_E2E`: vale. Cambiada al mismo nombre que la base de desarrollo
  configurada (por ejemplo, si esta se llama `teammatchup_e2e`): la suite no arranca (RF-6).
- Variable de la ubicación de MongoDB cambiada a un servidor remoto o a una ubicación que busca
  los servidores por DNS: la suite no arranca, y su mensaje no muestra la ubicación (RF-6).
- Cookie de sesión marcada como Secure (modo producción) sobre `http://127.0.0.1`: Chromium la
  acepta y la envía, y por eso la suite solo usa Chromium (Q1, Q2). La primera tarea del plan lo
  comprueba con la sesión iniciada por la interfaz (la del navegador ya no se inicia por la API,
  U8). SI no se cumple, ENTONCES la implementación se detiene y se vuelve a esta spec con el
  usuario, sin cambiar el servidor (U7, RNF-8).
- Un escenario falla a mitad: igual se elimina su usuario de prueba (RF-12).
- E4 termina sin sesión iniciada en el navegador: la limpieza no la necesita, porque siempre
  inicia su propia sesión iniciada de la suite (RF-12).
- El registro del usuario de prueba falla: el escenario falla en su preparación y no hay fallo de
  limpieza (RF-12).
- La eliminación del usuario de prueba falla (por ejemplo, responde 500): el escenario cuenta
  como fallido, y el informe dice que falló la limpieza, qué usuario quedó en la base E2E y el
  código recibido (RF-12, U6).
- Ejecución interrumpida con Ctrl+C: el sistema bajo prueba se detiene (RF-2). Los usuarios y las
  sesiones de juego que queden no hacen fallar la siguiente ejecución (RF-12, RF-13).
- La agenda muestra sesiones de juego de otros usuarios (de otros escenarios o restos de
  ejecuciones interrumpidas), incluso en el mismo bloque que la del escenario: la semana las
  reparte en el bloque y el escenario localiza la suya por su título único; «Mis sesiones» solo
  muestra las del usuario de prueba (RF-13).
- Sin conexión a Internet, con todo ya instalado: la suite pasa (RF-9).
- Un escenario ejecutado solo, por ejemplo el de editar, pasa sin ejecutar antes el de crear,
  porque su sesión de juego la prepara por la API (RF-11, RF-13).
- La sesión de juego recién creada en C1 está por confirmar hasta que llega la lista nueva: el
  panel muestra «Cargando…» en lugar de la tarjeta durante ese momento (spec 016, RF-25). El
  escenario espera a la tarjeta en «Sesión abierta» (RF-18, RF-22).
- Mientras la lista de la agenda carga (al abrir la agenda o tras F5), el panel ya se titula «Mis
  sesiones» y muestra «No estás en ninguna sesión», y la semana todavía no tiene bloques. Una
  comprobación de que una sesión de juego no aparece pasaría en ese momento aunque siguiera
  existiendo. Por eso C1 y C3 tienen una sesión testigo y comprueban que se ve antes de
  comprobar que otra no aparece (RF-11, RF-18, RF-20, RF-22). C2 no la necesita: su comprobación
  positiva es el título nuevo, que solo existe con la lista ya recibida.
- Una sesión de juego preparada por la API a una hora que la semana no muestra no tendría bloque
  en la semana: la suite las prepara en un día y una hora que la semana muestra (RF-11).
- «Atrás» entre documentos distintos: el navegador puede restaurar la página anterior de su
  memoria en lugar de cargarla. Por eso los pasos de «Atrás» y «Adelante» van entre entradas de
  un mismo documento, salvo el de E1, cuya página de destino es pública y se ve igual en los dos
  casos (Escenarios).
- La spec 017 cambia un texto o un rol que un escenario usa: el escenario se escribe contra la
  interfaz ya migrada, porque esta spec se implementa después (Contexto). Si el cambio llega
  después, se actualiza el escenario y no la interfaz.
- Dos sesiones de juego con el mismo título, o una cuyo título contiene el de otra: no ocurre,
  porque cada escenario usa títulos únicos y ninguno contiene a otro (Definiciones; RF-11, RF-18,
  RF-19).
- La credencial de la sesión iniciada caduca a la hora (spec 002): ningún escenario dura tanto,
  así que no se alcanza.

## Fuera de alcance
- Integración continua (GitHub Actions u otra) y ejecución automática en cada cambio.
- Firefox, WebKit y cualquier navegador distinto de Chromium (Q2). Vistas móviles y anchos de
  pantalla distintos del predeterminado.
- El servidor de desarrollo de la interfaz y la vista previa de la construcción como sistema bajo
  prueba (Q1).
- Vaciar la base E2E de forma automática y cualquier acceso directo a la base desde la suite
  (Q3, Q4).
- Iniciar la sesión del navegador por la API o escribir en el almacenamiento del navegador (U8).
- Pruebas visuales (comparar capturas), auditorías de accesibilidad automáticas y pruebas de
  rendimiento.
- Verificación con Steam o Riot Games, rango de Leetify y cualquier servicio externo (RF-8,
  RF-9).
- El modo simulado de la interfaz (RF-5).
- El CRUD de otras entidades (cuentas de juego, disponibilidad, perfil), coincidencias, ficha de
  jugador y «Proponer».
- Registro de cuentas por la interfaz, expiración de la sesión iniciada (401), cambio de sesión
  en otra pestaña y la pantalla de error de la consulta de sesión. Siguen comprobados por los
  recorridos manuales de la spec 007 (Q7). Se pueden añadir después con un cambio de esta spec.
- Los comportamientos de la spec 016 que su RNF-5 deja para «el recorrido manual y, cuando
  exista, las pruebas E2E de la spec 018» (filtro y sesión abierta conservados al volver,
  propuesta descartada al recargar, foco del panel, etc.), salvo lo que estos escenarios
  recorren de paso: la sesión recién creada queda abierta, «Ver las mías» y el estado inicial al
  recargar (RF-18). Siguen en el recorrido manual de la 016 (Q7).
- Los cambios de foco, de rol y de teclado que declara la spec 017 (sus Q1 a Q4): siguen en su
  propio recorrido de validación.
- Ejecutar la suite contra la aplicación desplegada (RF-7).
- Proteger las construcciones que sirve un servidor de producción local arrancado a mano desde el
  mismo checkout en otro puerto: la suite no lo detecta y las sustituiría. Es una limitación
  conocida que el README avisa (RF-3, Q8).
- Cambios en `frontend/`, `backend/` o en otras specs (RNF-8).

## Criterios de finalización
- [x] **Condición previa a la aprobación** (hecha por el usuario el 2026-11-21): el usuario
      enmendó él mismo los principios 1 y 4 de `docs/constitution.md` (Q5); su texto vigente está
      en «Impacto».
- [ ] **Condición previa a la implementación**: las specs 016 y 017 están implementadas.
- [ ] `e2etests/` existe en la raíz con sus propias dependencias, todas de desarrollo y en
      versión exacta, TypeScript, los tipos de Node y las de lint con las mismas versiones que el
      servidor, sin ninguna de acceso directo a la base, y no importa código de `frontend/` ni de
      `backend/` (RF-1, RNF-1).
- [ ] La primera tarea del plan comprobó que Chromium acepta y envía la cookie Secure sobre
      `http://127.0.0.1` con la sesión iniciada por la interfaz (U7).
- [ ] Con MongoDB en marcha y todo instalado, el comando documentado compila la interfaz y el
      servidor, arranca el servidor en modo producción en un solo puerto de `127.0.0.1`, ejecuta
      en serie los siete escenarios (E1 a E4 y C1 a C3) en Chromium y termina con código 0; con un
      escenario roto a propósito, termina con un código distinto de 0, el informe nombra el
      escenario y la comprobación, y la carpeta de resultados tiene su traza y su captura (RF-2,
      RF-5, RF-7, RF-14 a RF-20, RF-22).
- [ ] Prueba de sensibilidad, una por escenario: cambiar a propósito un texto, una dirección o un
      valor esperado hace fallar ese escenario por esa comprobación; en E1, E4 y C3, también la
      dirección esperada tras «Atrás»; y en C3, esperar como ausente tras la recarga del paso 7 el
      título de la sesión testigo en lugar del cancelado hace fallar ese paso (la comprobación de
      ausencia se hace con la lista ya recibida). Se anota en el registro de validación y después se deshace
      (RNF-11).
- [ ] Con Chromium sin instalar, con el puerto ocupado, con el nombre de base `teammatchup`, con
      el nombre igual al de la base de desarrollo configurada y con una ubicación de MongoDB no
      local, la suite termina con un código distinto de 0, sin compilar (la fecha de modificación
      de las construcciones no cambia), sin ejecutar escenarios y con un mensaje que dice qué
      condición falla (RF-2, RF-4, RF-6, RF-7).
- [ ] Con MongoDB apagado y con un error que rompe la compilación de la interfaz y, aparte, la
      del servidor, la suite termina con un código distinto de 0 sin ejecutar escenarios y la
      salida muestra el mensaje del servidor o del compilador (RF-4).
- [ ] Con `frontend/.env` y `frontend/.env.production.local` en modo simulado y con la API
      apuntando al servidor de desarrollo, y `backend/.env` en desarrollo, con su puerto, `HOST`
      en todas las interfaces, la base de desarrollo, el secreto de desarrollo y claves de
      servicios externos, la suite pasa igual, y la base de desarrollo no cambia: con mongosh,
      mismo número de documentos en cada colección antes y después (RF-5, RF-6, RF-8, RF-10).
- [ ] Una búsqueda en la salida de la ejecución, en `e2etests/` y en los informes (también el
      JSON), las trazas y los resultados no encuentra el secreto de firma generado (RF-10).
- [ ] Bloqueo de otros orígenes: prueba de sensibilidad en la que un escenario pide a propósito,
      desde la página, una dirección de otro origen (por ejemplo, `https://example.com`), con
      conexión a Internet, y comprueba que la petición no recibe respuesta porque se bloquea;
      después se deshace. Y, sin conexión a Internet, la suite pasa (RF-9).
- [ ] Cada escenario ejecutado solo pasa, y la suite pasa con la forma documentada de ejecutar
      los escenarios en orden inverso (RF-13).
- [ ] Tras una ejecución completa sin interrupciones, cada colección de la base E2E tiene, contado
      con mongosh, el mismo número de documentos que antes de ejecutarla (una colección que no
      existía cuenta como 0); también con un escenario roto a propósito (RF-12).
- [ ] Con la limpieza rota a propósito (por ejemplo, una contraseña equivocada al iniciar su
      sesión), el escenario falla y el informe dice que falló la limpieza, nombra el usuario de
      prueba que quedó y muestra el código recibido; después se deshace (RF-12, U6).
- [ ] Tras interrumpir una ejecución con Ctrl+C a mitad, el sistema bajo prueba ya no escucha en
      su puerto y la ejecución siguiente pasa sin borrar nada a mano (RF-2, RF-12, RF-13).
- [ ] Tres ejecuciones seguidas en verde, sin reintentos (RNF-3, RNF-4), y una ejecución completa
      en 5 minutos como máximo, compilaciones incluidas, con el tiempo anotado en el README
      (RNF-5).
- [ ] Comprobación de tipos y lint de `e2etests/` en verde. Sin `any`, `@ts-ignore`,
      `@ts-expect-error`, `.only` ni esperas de tiempo fijo (RNF-2, RNF-3, RF-22).
- [ ] Una búsqueda en `e2etests/` no encuentra localizadores por clase de estilo, por selectores
      de estructura (CSS o XPath) ni por atributos de prueba; todos son por rol y nombre, etiqueta
      o texto, y las direcciones se comprueban por su ruta (RF-21).
- [ ] Una búsqueda en el repositorio no encuentra secretos. `git status` tras una ejecución no
      muestra informes, trazas, capturas, construcciones ni archivos de variables (RNF-6).
- [ ] `e2etests/README.md` tiene todo lo que pide RF-3, el README raíz enlaza a él, y un
      integrante que no escribió la suite la ejecuta siguiendo solo el README (RF-3).
- [ ] La suite completa pasa en Linux y en al menos una de macOS o Windows, y el registro de
      validación y el README dicen en cuáles; los scripts no usan sintaxis exclusiva de una
      consola (RNF-9).
- [ ] `git diff` no muestra cambios en `frontend/` ni en `backend/` (RNF-8).
- [ ] `AGENTS.md` (estructura y comandos) y `MEMORY.md` describen `e2etests/` y su comando.

## Decisiones

Tomadas por el usuario (2026-11-21, transmitidas por el coordinador):
- **U1.** Tres specs: 016 (estado global con Zustand), 017 (librería de estilos Mantine) y 018
  (esta). La 018 se implementa al final, sobre la interfaz migrada y con los almacenes de la 016.
  Los RF se escriben por comportamiento observable.
- **U2.** Las E2E corren contra el servidor real (Express) con una base MongoDB de prueba, no
  contra el modo simulado.
- **U3.** El CRUD es el de las sesiones de juego de la agenda: crear, listar, editar y
  «eliminar», que es cancelar (`DELETE` → 204), equivalencia que el usuario acepta.
- **U4.** Caso mínimo: inicio de sesión y acceso protegido. Una ruta protegida sin sesión lleva a
  login y con sesión se accede.
- **U5.** Carpeta `e2etests/` en la raíz, independiente de `frontend/` y `backend/`. Instrucciones
  en el README global o en `e2etests/README.md`.

Dudas del borrador cerradas por el usuario (2026-11-21, todas con la opción recomendada):
- **Q1 = A. Construcción de producción servida por el servidor, en un solo puerto** (RF-2, RF-5,
  RF-7, RF-10). La suite compila la interfaz en cada ejecución y arranca el servidor en modo
  producción con la base E2E y un secreto de firma generado en cada ejecución. Es lo más parecido
  al despliegue y prueba la recarga de rutas que resuelve el servidor (spec 010, RF-2). El usuario
  asume las consecuencias: compila en cada ejecución (RNF-5), sustituye la construcción de la
  carpeta que sirve el servidor (RF-3, casos límite) y la cookie Secure sobre
  `http://127.0.0.1` limita la suite a Chromium (Q2). Descartadas: B, servidor en modo prueba y
  servidor de desarrollo de la interfaz, que prueba la interfaz de desarrollo y no la desplegada,
  con dos procesos; C, servidor en modo prueba y vista previa de la construcción, en la que la
  recarga de rutas la resuelve la vista previa y no el servidor.
- **Q2 = A. Solo Chromium** (RF-2, RF-3, «Fuera de alcance»). Obligada por Q1 = A. Es el
  navegador del equipo y del evaluador, y la ejecución más rápida. Descartadas: B, Chromium y
  Firefox, y C, los tres navegadores, que además no aceptan con garantía la cookie Secure sobre
  `http://127.0.0.1`.
- **Q3 = A. Cada escenario elimina por la API el usuario de prueba que creó** (RF-12). La cascada
  borra sus cuentas de juego y sus sesiones de juego. Sin dependencias nuevas. Los restos de una
  ejecución interrumpida no hacen fallar la siguiente, porque los usuarios son únicos.
  Descartadas: B, vaciar la base E2E al empezar, que exige acceso directo a MongoDB y una
  dependencia nueva; C, no borrar nada, con una base que crece en cada ejecución.
- **Q4 = A. Datos preparados por la API HTTP pública** (RF-11). Registro, inicio de sesión con el
  comprobante anti-CSRF, vincular la cuenta y crear la sesión de juego. C1 crea su sesión de
  juego por la interfaz; C2 y C3 parten de una creada por la API. **Ajustada por U8
  (2026-11-21)**: la sesión iniciada del navegador ya no se prepara por la API; todo escenario que
  la necesita inicia sesión por el formulario de login. La API sigue preparando el usuario, la
  cuenta vinculada y las sesiones de juego de C2 y C3, con la sesión iniciada de la suite.
  Descartadas: B, todo por la interfaz, más lento y frágil; C, escribir en la base, que se salta
  las reglas del servidor y acopla la suite a sus modelos.
- **Q5 = A. Enmendar los principios 1 y 4 de la constitución** (RNF-11, «Impacto»). **Hecho**: el
  usuario enmendó él mismo `docs/constitution.md` el 2026-11-21; vale el texto vigente de ese
  archivo, copiado en «Impacto». Descartada: B, enmendar solo el principio 1 y declarar la
  excepción al rojo → verde en un RNF de esta spec.
- **Q6 = A. Comprobación de tipos y lint en `e2etests/`** (RF-1, RNF-1, RNF-2), con ESLint, su
  configuración recomendada de JavaScript y typescript-eslint en las mismas versiones exactas que
  el servidor, y sus mismas reglas. Detecta los `any` explícitos y cumple «ninguna tarea se cierra
  con lint en rojo» (principio 4). Descartada: B, solo comprobación de tipos y búsqueda manual de
  `any` en el cierre.
- **Q7 = A. Solo los siete escenarios** (E1 a E4 y C1 a C3) («Fuera de alcance»). Cubren los dos
  casos del enunciado y «Atrás», «Adelante» y F5 en ellos. Descartada: B, añadir el registro por
  la interfaz y comportamientos de la spec 016 que hoy se validan a mano. Se pueden añadir
  después con un cambio de esta spec.

Tomadas por el usuario tras la primera revisión QA (2026-11-21, transmitidas por el
coordinador):
- **U6. P7 aceptada con condición** (RF-12). Si falla la eliminación del usuario de prueba, el
  escenario cuenta como fallido, y la suite avisa con un error claro: que falló la limpieza (no el
  escenario en sí), qué usuario de prueba quedó en la base y el código HTTP o el motivo.
- **U7. Supuesto de la cookie Secure aceptado** (casos límite, criterios). Chromium acepta la
  cookie Secure sobre `http://127.0.0.1`. Lo comprueba la primera tarea del plan; si no se
  cumple, la implementación se detiene y se vuelve a esta spec con el usuario.
- **U8. Sesión del navegador siempre por la interfaz** (RF-11, RF-12; ajusta Q4). Motivo
  (hallazgo 1, bloqueante): una sesión iniciada por la API no sirve en el navegador, porque el
  servidor exige el comprobante anti-CSRF en toda petición con sesión, el comprobante solo llega
  en la cabecera de la respuesta del inicio de sesión y la interfaz solo lo lee de su propio
  almacenamiento. El usuario, la cuenta vinculada y las sesiones de juego de C2 y C3 se siguen
  creando por la API desde el proceso de la suite, que sí lee esa cabecera; todo escenario que
  necesita sesión en el navegador (E1, E3, E4, C1, C2 y C3) inicia sesión rellenando el formulario
  de login. La suite nunca escribe en el almacenamiento del navegador.
- **U9. C1 comprueba la spec 016, RF-24** (RF-18). Con «Todos los juegos» y la creación
  confirmada, la sesión de juego creada queda en «Sesión abierta» y aparece en «Mis sesiones» tras
  «Ver las mías». Se retira la alternativa «en "Sesión abierta" o en "Mis sesiones"».

Tomadas por el usuario en la clarificación final (2026-11-21, transmitidas por el coordinador):
- **Q8 = A. Limitación conocida: servidor de producción local en otro puerto** (RF-3, RF-7, casos
  límite, «Fuera de alcance»). La suite no protege la construcción que sirve un servidor de
  producción arrancado a mano desde el mismo checkout en otro puerto (por ejemplo, el
  procedimiento de la spec 010 en el 3001): la sustituiría. El README de `e2etests/` avisa de no
  ejecutar la suite en esa situación. Nada más cambia. Descartadas: B, negarse a compilar si el
  puerto del archivo de variables del servidor está ocupado, que no detecta otros puertos e impide
  correr la suite con el entorno de desarrollo en marcha (contradice RF-7); C, compilar y servir
  desde una copia propia, que reabre la consecuencia de Q1 aceptada por el usuario y complica el
  arranque.
- **U10. En C3, «Atrás» antes de F5** (RF-20, pasos 6 y 7). Confirma la elección del
  planificador: tras cancelar, el escenario pulsa «Atrás» sin recargar antes, para comprobar que
  la cancelación sustituyó la entrada del detalle, y después recarga.
- **U11. Ejecución en orden inverso documentada** (RF-3, RF-13). Confirma la elección del
  planificador: la suite trae una forma documentada de ejecutar todos los escenarios en una misma
  ejecución en el orden inverso al habitual. El plan elige el mecanismo.
- **U12. Textos sin spec, tomados de la interfaz actual** (RF-21). Confirma la elección del
  planificador: los textos que comprueban los escenarios y que no fija ninguna spec (el título de
  la agenda, el texto propio de la página de entrada y de Inicio, el nombre del enlace de la agenda
  de la barra) son los que muestra hoy la interfaz, que la spec 017 no cambia (su RF-19). El plan
  lista cada uno con su origen.

Propuestas del planificador, aplicadas en el texto. P1 a P6, P8 y P9 **aceptadas por el usuario
al aprobar la spec el 2026-11-21**:
- **P1 (aceptada por el usuario, 2026-11-21). Localizar por rol, nombre accesible, etiqueta o texto, sin atributos solo para pruebas**
  (RF-21). Así los escenarios no dependen de la estructura que deje la 017 ni obligan a tocar la
  interfaz (RNF-8). Descartado: añadir identificadores de prueba a los componentes, que cambiaría
  el frontend desde esta spec y acoplaría las pruebas al marcado.
- **P2 (aceptada por el usuario, 2026-11-21). Datos propios y únicos en cada escenario** (RF-11 a RF-13). Permite ejecutar un escenario
  solo y en cualquier orden, y tolera restos de ejecuciones interrumpidas. Descartado: una
  secuencia crear → editar → cancelar en la que cada paso dependa del anterior, que obliga a
  ejecutarlos siempre juntos y en orden.
- **P3 (aceptada por el usuario, 2026-11-21). Sin reintentos automáticos** (RNF-3). Un fallo intermitente se ve y se arregla.
  Descartado: reintentar los fallidos, que oculta la inestabilidad.
- **P4 (aceptada por el usuario, 2026-11-21). README propio en `e2etests/` y una sección breve con enlace en el README raíz** (RF-3).
  El README raíz ya es largo, y el enunciado admite cualquiera de los dos. Descartado: todo en el
  README raíz.
- **P5 (aceptada por el usuario, 2026-11-21). Entorno fijado al arrancar** (RF-5, RF-6, RF-8, RF-10): modo simulado desactivado, API
  relativa al mismo origen, modo producción, puerto y dirección de escucha de la suite, base E2E,
  secreto generado y claves vacías, pasados por el entorno del proceso, que prevalece sobre los
  archivos de variables de cada carpeta. La suite funciona igual con cualquier archivo de
  variables de desarrollo y nunca lo modifica. Descartado: pedir al integrante que edite sus
  archivos de variables antes de ejecutar.
- **P6 (aceptada por el usuario, 2026-11-21). Bloquear en el navegador las peticiones a otros orígenes** (RF-9). Garantiza que ningún
  escenario dependa de un servicio externo. Descartado: dejarlas pasar, que haría depender el
  resultado de Internet y de Data Dragon.
- P7 pasó a decisión del usuario (U6).
- **P8 (aceptada por el usuario, 2026-11-21). Sesión testigo como comprobación positiva de la lista recibida** (segunda revisión QA,
  N1; Definiciones, RF-11, RF-18, RF-20, RF-22). Hoy la interfaz muestra «Mis sesiones» con «No
  estás en ninguna sesión» también mientras la lista carga, así que el estado vacío no prueba
  nada. C1 y C3 preparan por la API una sesión de juego más, que no tocan, y la ven en el panel y
  en la semana antes de comprobar que otra no aparece. Respeta RF-21 (se comprueba por la
  interfaz, por nombre accesible) y Q4/U8 (datos por la API), y no cambia la interfaz (RNF-8).
  Descartadas: esperar la respuesta de red de la lista, que no es un estado observable de la
  interfaz (RF-22), acopla el escenario a la ruta de la API y no garantiza que la interfaz ya la
  haya pintado; y cambiar la interfaz para que no muestre el estado vacío mientras carga, que
  cambiaría el frontend desde esta spec (RNF-8).
- **P9 (aceptada por el usuario, 2026-11-21). Qué cuenta como «la semana muestra» y «el panel muestra»** (N2; Definiciones, RF-21). La
  semana, por el botón cuyo nombre accesible empieza por «<título>, »; el panel, por su
  encabezado y por el enlace «Ver detalle de <título>». Son nombres que la interfaz ya tiene y
  que la 017 no cambia. Descartadas: acotar a la sección de la semana, que no tiene nombre
  accesible y obligaría a un selector de estructura (RF-21); y buscar el título como texto, que
  aparece igual en la semana y en la tarjeta del panel.

## Dudas abiertas
Ninguna. Q8 cerrada por el usuario el 2026-11-21 (sección «Decisiones»).

## Impacto en otras specs y en la constitución (sin editarlas desde esta spec)
- **Constitución, principios 1 y 4** (Q5 = A). Enmienda hecha por el usuario en
  `docs/constitution.md` el 2026-11-21. Texto vigente, copiado del archivo:

  Principio 1:
  ```
  1. **Stack cerrado.** Frontend: React 18 + TypeScript + Vite. Backend: Express 5 + Mongoose + TypeScript. Tests: node:test en el backend; Vitest en el frontend (spec 016); Playwright para las pruebas E2E de `e2etests/`.
     Una dependencia nueva solo entra si una spec aprobada la justifica, y con versión exacta.
  ```
  Principio 4:
  ```
  4. **Tests primero en el backend.** Toda función de dominio y todo endpoint del backend tiene un test con node:test, escrito antes que el código (rojo → verde).
     Ninguna tarea se cierra con tests, typecheck o lint en rojo, ni con un .only en el código. En el frontend bastan build, typecheck y lint en verde, hasta que una spec diga otra cosa. Cuando una spec exige pruebas en el frontend, se escriben con Vitest y también antes que el código (rojo -> verde). Las pruebas E2E con Playwright comprueban comportamiento ya especificado e implementado: no se escriben antes que el código, pero cada una se ve fallar al romper a propósito lo que comprueba y ninguna tarea se cierra con ellas en rojo.
  ```
- **Spec 016, RNF-5**: deja para «el recorrido manual y, cuando exista, las pruebas E2E de la spec
  018» lo que depende del navegador. Esta spec solo cubre de ese conjunto lo que recorren sus
  escenarios (Q7 = A): RF-19, RF-23 y RF-24 a RF-26 en C1. El resto sigue en el recorrido manual
  de la 016.
- **Spec 017**: los textos, roles y nombres accesibles que usan los escenarios (RF-14 a RF-20) son
  los de las specs 002, 007, 009 y 016, que la 017 no cambia (su RF-19). Revisados sus cambios
  declarados, ningún escenario depende de ellos:
  - su Q1 (foco de «Anotar una sesión» como ventana modal estándar): C1 localiza la ventana por su
    rol y su nombre y sus campos por su etiqueta, sin depender de dónde esté el foco;
  - su Q2 («Solo cuentas verificadas» como interruptor): ningún escenario abre coincidencias;
  - su Q3 (pestañas con flechas en perfil y coincidencias): ningún escenario abre esas vistas;
  - su Q4 (desvincular en una ventana): ningún escenario desvincula cuentas; la cuenta se vincula
    por la API y se borra con el usuario.
  C2 elige los cupos en la lista «Cupos», que la 017 conserva con el comportamiento de lista
  nativa (su RF-10). Si la 017 cambia algo que usan los escenarios, la 018 se escribe contra lo
  nuevo, porque se implementa después.
- **Spec 010**: la suite compila la interfaz en las mismas carpetas que su procedimiento de
  producción, compila el servidor y lo arranca en modo producción en un puerto local (Q1 = A); no
  cambia nada de la spec 010.
- **Spec 011** (borrador): su carga de demostración no sirve para las E2E, porque solo se permite
  en desarrollo (su RF-3). No cambia.
- **README raíz**: una sección «Pruebas E2E» que enlaza a `e2etests/README.md` (RF-3, P4). La
  tabla «Estado del repositorio» gana la fila de `e2etests/`.
- **`.gitignore`**: los informes, trazas, capturas y resultados de `e2etests/` y un posible
  archivo de variables propio (RNF-6). `node_modules/`, `dist`, `out` y `.env`/`.env.*` ya están
  ignorados en todo el repositorio.
- **`AGENTS.md`** («Stack y estructura», «Comandos») y **`MEMORY.md`**: describen `e2etests/` y su
  comando en el cierre de esta spec.

## Notas para el plan (no son requisitos)
- Variables que la suite fija en el entorno del proceso (RF-5, RF-6, RF-8, RF-10):
  - interfaz: `VITE_USE_MOCK_API=false` y `VITE_API_URL=/api`. Vite da prioridad a las variables
    que ya existen en el entorno sobre `.env`, `.env.production` y `.env.production.local`; el
    plan lo confirma con la versión de Vite del proyecto;
  - servidor: `NODE_ENV=production`, `PORT=<puerto de la suite>`, `HOST=127.0.0.1`,
    `MONGODB_URI`, `MONGODB_DBNAME`, `JWT_SECRET` (generado) y `STEAM_API_KEY`, `RIOT_API_KEY` y
    `LEETIFY_API_KEY` vacías (el servidor trata vacía como no definida, spec 001, y dotenv no
    sobrescribe una clave existente aunque esté vacía). Sin clave de Steam, `PUBLIC_URL` se
    ignora.
- Para RF-6, la suite lee `MONGODB_DBNAME` y `TEST_MONGODB_DBNAME` del entorno y de
  `backend/.env` sin cargar código del servidor (RF-1).
- Procedimiento de producción de la spec 010 que la suite reproduce: compilar la interfaz y
  copiarla a la carpeta que sirve el servidor (`build:ui`), compilar el servidor (`build`, a
  `backend/out`) y arrancarlo (`node out/index.js` desde `backend/`).
- Orden de RF-2: Playwright comprueba el puerto de su servidor web antes de lanzar su comando,
  pero no comprueba Chromium ni la base antes; el plan decide si las comprobaciones y la
  compilación van en una preparación global o en el comando del servidor web, respetando el
  orden de RF-2.
- Riesgo de RF-10 (hallazgo 19): el informe JSON de Playwright incluye la configuración de la
  ejecución, también la del servidor web y sus variables; el informe HTML y las trazas pueden
  incluir también datos del entorno. El plan genera el secreto donde no acabe serializado en esa
  configuración (por ejemplo, en el proceso que arranca el servidor) y lo comprueba con la
  búsqueda de los criterios.
- Sesión iniciada de la suite: la cookie de sesión es Secure en producción; un cliente HTTP con
  almacén de cookies puede no reenviarla por `http`. La primera tarea del plan lo comprueba junto
  con U7 y, si hace falta, la suite reenvía la cookie ella misma. El comprobante va en la cabecera
  `X-CSRF-Token`.
- Configuración de Playwright prevista: un solo trabajador y sin paralelismo (RF-2, RF-13), sin
  reintentos y rechazando `.only` (RNF-3), traza y captura solo en los fallos (RF-22), sin
  reutilizar un servidor existente (RF-7) y con el bloqueo de otros orígenes en el contexto del
  navegador (RF-9). Playwright no invierte el orden por sí mismo: el plan elige la forma de RF-13
  (por ejemplo, una variable opcional de la suite).
- Localizadores previstos (RF-21): por rol, etiqueta y texto, y comprobaciones de dirección por
  ruta. El plan lista los textos con su origen (spec o interfaz actual).
- Hoy la lista de la agenda vale vacía mientras carga y el panel pinta su estado vacío; la
  semana pinta un esqueleto (P8). La semana solo muestra las horas de su rejilla: el plan elige
  para las sesiones de juego preparadas por la API un día y una hora dentro de ella (RF-11).
- Los criterios cuentan documentos con mongosh, herramienta opcional que documenta el README
  (RF-3); no es una dependencia de la suite.
