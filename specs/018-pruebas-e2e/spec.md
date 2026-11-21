# Spec 018 — Pruebas E2E con Playwright
Estado: borrador (2026-11-21). Dudas cerradas por el usuario el 2026-11-21 (Q1 a Q7, sección
«Decisiones»). Pendiente de: (1) la enmienda de los principios 1 y 4 de la constitución, que hace
el usuario en `docs/constitution.md` con el texto de «Impacto» antes de aprobar esta spec; (2) la
revisión QA; (3) la aprobación del usuario. No pasa a plan hasta que se aprueba.

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
1. corre contra el servidor real (Express) en modo producción, que sirve la construcción de
   producción de la interfaz en un solo puerto, como en el despliegue, con una base MongoDB propia
   de las pruebas; nunca contra el modo simulado ni contra la base de desarrollo o de producción;
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
  - spec 003 (eliminar la cuenta borra en cascada lo del usuario, RF-11);
  - spec 004 (vincular una cuenta de juego sin verificar);
  - spec 006 (crear, listar, editar y cancelar sesiones de juego; RF-16: cascada; RF-27: crear
    exige una cuenta vinculada en el juego);
  - spec 007 (rutas protegidas y solo públicas, ruta de origen: RF-6, RF-8, RF-25, RF-33);
  - spec 009 (detalle, edición y cancelación con confirmación; RF-2, RF-6 a RF-8, RF-12, RF-15);
  - spec 010 (construcción de producción servida por el servidor; recarga de rutas: RF-1, RF-2);
  - spec 016 (la sesión de juego recién creada queda abierta, RF-24; la agenda vuelve a su
    estado inicial al recargar, RF-19);
  - spec 017 (textos, roles y nombres accesibles definitivos de la interfaz).
  Las specs 002 a 010 están implementadas; la 016 está aprobada sin plan y la 017 está en
  redacción. **Condición previa a la implementación**: 016 y 017 implementadas.
- Origen: enunciado del último hito, puntos 2, 3 y 5 (apéndice A de la spec 016). Decisiones del
  usuario del 2026-11-21 (sección «Decisiones», U1 a U5 y Q1 a Q7).
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
- **Suite E2E**: el conjunto de pruebas de esta spec, en `e2etests/`.
- **Escenario**: una prueba de la suite. Recorre la aplicación en un navegador como lo haría un
  jugador y comprueba lo que se ve.
- **Sistema bajo prueba**: el servidor Express real, arrancado por la suite en modo producción,
  con la base E2E, que sirve en un solo puerto local la construcción de producción de la interfaz
  y la API (Q1).
- **Base E2E**: la base de MongoDB que usa el sistema bajo prueba. Es distinta de la base de
  desarrollo (`teammatchup` en `backend/.env.example`), de la base de las pruebas del servidor
  (`teammatchup_test`) y de la base de producción (`fullstack` en el servidor del curso).
- **Ejecución**: una corrida completa de la suite, desde el comando hasta que termina.
- **Usuario de prueba**: un usuario ficticio que crea un escenario para sí mismo. Su correo y su
  nombre de usuario son únicos (no se repiten entre escenarios ni entre ejecuciones) y usan un
  dominio reservado para ejemplos (`example.com`). Su contraseña es un texto ficticio, no un
  secreto.
- **Sesión de juego** (la entidad del CRUD): la de la spec 006. **Sesión iniciada**: la de la
  spec 002. En esta spec nunca se escribe «sesión» a secas.
- **Eliminar una sesión de juego**: cancelarla. El servidor la borra y responde 204 (spec 006,
  RF-9). El usuario aceptó esta equivalencia (U3).
- **Preparar por la API**: hacer, con peticiones HTTP a la API pública del sistema bajo prueba y
  respetando sus reglas (comprobante anti-CSRF incluido), lo que un jugador haría por la interfaz
  (Q4).
- **Servicio externo**: cualquier servicio fuera del sistema bajo prueba: Steam, Riot Games,
  Data Dragon y Leetify.
- **Ruta protegida**, **ruta de origen**, **Inicio** y **login**: los de la spec 007.

## Requisitos funcionales

### Ubicación, ejecución y documentación
- RF-1: EL SISTEMA tiene la suite E2E en la carpeta `e2etests/`, en la raíz del proyecto, al lado
  de `frontend/` y `backend/` e independiente de ellas: tiene sus propias dependencias, su propia
  configuración, su propia comprobación de tipos y su propio lint. No importa código de
  `frontend/` ni de `backend/`, y llega a la aplicación solo a través del navegador y de la API
  HTTP del sistema bajo prueba.
- RF-2: CUANDO un integrante ejecuta, desde `e2etests/`, el comando de pruebas documentado (RF-3)
  con las condiciones previas cumplidas, EL SISTEMA:
  - compila la construcción de producción de la interfaz (RF-5);
  - arranca el sistema bajo prueba con la base E2E;
  - ejecuta todos los escenarios en Chromium (Q2);
  - detiene lo que arrancó al terminar, también si un escenario falla o si se interrumpe la
    ejecución con Ctrl+C;
  - termina con código 0 si pasan todos los escenarios y con un código distinto de 0 si falla
    alguno.
- RF-3: EL SISTEMA documenta en `e2etests/README.md` cómo correr la suite, y el README raíz tiene
  una sección «Pruebas E2E» que enlaza a ese archivo (propuesta P4). El README de `e2etests/`
  indica:
  - las condiciones previas: versión de Node, MongoDB local en marcha, dependencias de
    `frontend/`, `backend/` y `e2etests/` instaladas, y Chromium de Playwright instalado, con el
    comando de cada una;
  - el comando de pruebas, cómo ejecutar un solo escenario, y los comandos de comprobación de
    tipos y de lint;
  - que cada ejecución compila la interfaz y sustituye la construcción que haya en la carpeta que
    sirve el servidor (la misma que deja `build:ui`, que no se sube al repositorio);
  - qué base usa la suite, qué queda en ella tras una ejecución (RF-12) y cómo borrarla a mano;
  - las variables opcionales, con sus valores por defecto. Ninguna es un secreto;
  - en qué puerto arranca el sistema bajo prueba;
  - que solo se prueba en Chromium, y por qué (Q1, Q2);
  - que no toca la base de desarrollo, la de producción, el modo simulado ni ningún servicio
    externo;
  - cómo ver el informe y las trazas de un escenario fallido;
  - cuánto tarda una ejecución en un equipo de desarrollo, compilación incluida.
- RF-4: SI falta una condición previa (MongoDB no responde, faltan dependencias o Chromium, o el
  puerto del sistema bajo prueba está ocupado) o falla la compilación de la interfaz, ENTONCES EL
  SISTEMA termina con un código distinto de 0 sin ejecutar ningún escenario, y la salida muestra
  un mensaje que permite saber qué falta o qué falló. Puede ser el mensaje del propio servidor o
  del compilador, por ejemplo «la base de datos no está disponible: no se pudo conectar en 10 s».

### Sistema bajo prueba y aislamiento
- RF-5: EL SISTEMA prueba siempre la interfaz de producción servida por el servidor real, nunca el
  modo simulado ni el servidor de desarrollo de la interfaz. En cada ejecución:
  - compila la construcción de producción de la interfaz, con el modo simulado desactivado aunque
    el archivo de variables de la interfaz lo active (spec 007, RF-1), en la carpeta que sirve el
    servidor (spec 010, RF-1);
  - arranca el servidor en modo producción, de modo que un solo puerto sirve la interfaz y la API,
    y la recarga de cualquier ruta de la interfaz la resuelve el servidor (spec 010, RF-2).
- RF-6: EL SISTEMA arranca el servidor con la base E2E y fuerza el nombre y la ubicación de la
  base en el entorno del proceso. Así el archivo de variables del servidor no puede llevarlo a
  otra base, porque el entorno del proceso prevalece sobre ese archivo (spec 001, RF-21). El
  nombre de la base E2E tiene un valor por defecto que contiene `e2e` y se puede cambiar con una
  variable. SI el nombre que se va a usar no contiene `e2e`, o es `teammatchup`,
  `teammatchup_test` o `fullstack`, ENTONCES EL SISTEMA no compila la interfaz, no arranca el
  servidor ni ejecuta ningún escenario, y termina con un código distinto de 0 y un mensaje que lo
  explica. La ubicación de MongoDB es `mongodb://127.0.0.1:27017` por defecto y se puede cambiar
  con una variable.
- RF-7: EL SISTEMA solo ejecuta los escenarios contra el sistema bajo prueba que arrancó él mismo:
  - nunca reutiliza un servidor que ya esté escuchando en su puerto. SI el puerto está ocupado,
    ENTONCES aplica RF-4;
  - nunca apunta a la aplicación desplegada en el servidor del curso;
  - usa un puerto propio, distinto de los de desarrollo (3001 del servidor y 5173 de la
    interfaz), para poder correr con el entorno de desarrollo en marcha. El puerto tiene un valor
    por defecto y se puede cambiar con una variable;
  - el sistema bajo prueba escucha solo en la dirección local (`127.0.0.1`), y los escenarios lo
    abren en `http://127.0.0.1:<puerto>`.
- RF-8: EL SISTEMA arranca el servidor sin claves de Steam, Riot Games ni Leetify, aunque el
  archivo de variables del servidor las tenga: las fuerza vacías en el entorno del proceso. Con
  eso, «Verificar con Steam» y «Verificar con Riot Games» no se ofrecen (specs 013, RF-22, y 014,
  RF-38). Ningún escenario verifica cuentas ni las resincroniza, y ninguno usa una cuenta de CS2
  verificada, que es la única que consultaría Leetify (spec 015).
- RF-9: MIENTRAS corre un escenario, EL SISTEMA bloquea en el navegador toda petición a un origen
  distinto del sistema bajo prueba. Los escenarios pasan igual: la interfaz ya tolera que Data
  Dragon no responda, porque usa una versión de respaldo sin mostrar ningún error (spec 014). La
  suite pasa sin conexión a Internet una vez instalados las dependencias y Chromium.
- RF-10: CUANDO arranca el servidor en modo producción, EL SISTEMA genera al azar en esa ejecución
  un secreto de firma distinto del de desarrollo (producción no arranca con este, spec 002,
  RF-28), se lo pasa al servidor por el entorno del proceso y no lo escribe en ningún archivo ni
  en la salida. EL SISTEMA no usa ningún secreto real.

### Datos de prueba
- RF-11: CUANDO un escenario necesita datos, EL SISTEMA los prepara por la API (Q4) para ese
  escenario antes de recorrer la interfaz:
  - un usuario de prueba nuevo, registrado por la API, con correo y nombre de usuario únicos;
  - la sesión iniciada de ese usuario en el navegador del escenario, iniciada por la API, salvo en
    E1 y E2, que recorren login por la interfaz porque es lo que comprueban (RF-14, RF-15);
  - si el escenario lo necesita, una cuenta de juego vinculada a ese usuario, sin verificar
    (datos simulados, spec 004). Crear una sesión de juego la exige (spec 006, RF-27);
  - en C2 y C3, la sesión de juego que el escenario edita o cancela, creada por la API con un
    título único. C1 crea la suya por la interfaz, porque es lo que comprueba (RF-18).
  Lo que el escenario comprueba se hace siempre por la interfaz (RF-21), aunque sus datos se
  preparen por la API. La suite no escribe en la base directamente. La carga de datos de
  demostración de la spec 011 no sirve para esto: solo se permite en desarrollo (spec 011, RF-3).
- RF-12: CUANDO termina un escenario, pase o falle, EL SISTEMA elimina por la API el usuario de
  prueba que creó ese escenario (Q3), lo que borra en cascada sus cuentas de juego y sus sesiones
  de juego (spec 003, RF-11; spec 006, RF-16). Si el escenario terminó sin sesión iniciada (por
  ejemplo E4, que la cierra), la inicia antes por la API. SI la eliminación falla, ENTONCES el
  escenario cuenta como fallido y el informe lo dice (propuesta P7). Si una ejecución se
  interrumpe y deja datos, la siguiente pasa igual: los usuarios de prueba son únicos (RF-11) y
  ningún escenario cuenta ni lee datos que no creó él mismo. Esos restos se borran a mano
  eliminando la base E2E (RF-3).
- RF-13: EL SISTEMA permite ejecutar cada escenario solo, en cualquier orden y repetido, con el
  mismo resultado. Ningún escenario depende de lo que haya hecho otro.

### Escenarios: inicio de sesión y acceso protegido
- RF-14 (E1, ruta protegida sin sesión): MIENTRAS el navegador no tiene sesión iniciada, CUANDO
  el escenario abre directamente la dirección de la agenda, EL SISTEMA comprueba que:
  - se ve login (los campos de correo y contraseña, encontrados por su etiqueta) y no se ve el
    contenido de la agenda;
  - al iniciar sesión por la interfaz con el usuario de prueba, la aplicación vuelve a la agenda,
    que era la ruta de origen (spec 007, RF-8 y RF-25), y se ve su contenido;
  - al pulsar «Atrás» no se vuelve al formulario de login, porque las redirecciones de sesión
    sustituyen la entrada del historial (spec 007, «Llevar a una ruta por una regla de sesión»).
- RF-15 (E2, credenciales incorrectas): CUANDO el escenario intenta iniciar sesión por la
  interfaz con la contraseña equivocada del usuario de prueba, EL SISTEMA comprueba que login
  muestra «correo o contraseña incorrectos» (spec 002, RF-9; spec 007), que la dirección sigue
  siendo la de login y que abrir después la agenda sigue llevando a login.
- RF-16 (E3, ruta protegida con sesión y recarga): MIENTRAS hay sesión iniciada, EL SISTEMA
  comprueba que:
  - abrir directamente la agenda la muestra sin pasar por login;
  - recargar la página (F5) en la agenda la vuelve a mostrar en la misma dirección, sin pasar
    por login (spec 007, RF-5; spec 010, RF-2);
  - abrir la dirección de login lleva a Inicio sin mostrar el formulario (spec 007, RF-33).
- RF-17 (E4, cierre de sesión): CUANDO el jugador cierra sesión desde la interfaz, EL SISTEMA
  comprueba que:
  - la aplicación muestra login;
  - al pulsar «Atrás» no se ve el contenido de ninguna vista protegida, porque se muestra login
    (spec 007, RF-6 y RF-25);
  - abrir directamente la agenda lleva a login;
  - recargar en login sigue mostrando login.

### Escenarios: CRUD de sesiones de juego
- RF-18 (C1, crear y listar): MIENTRAS el usuario de prueba tiene sesión iniciada y una cuenta
  vinculada en un juego, CUANDO el escenario crea por la interfaz una sesión de juego desde la
  agenda («Anotar sesión» y el formulario «Anotar una sesión», con un título único), EL SISTEMA
  comprueba que:
  - el formulario se cierra;
  - la sesión de juego aparece en la semana con su título;
  - su tarjeta, con el enlace «Ver detalle de <título>» (spec 009, RF-2), está en el panel: en
    «Sesión abierta», donde queda la sesión recién creada (spec 016, RF-24), o en «Mis
    sesiones»;
  - tras recargar la página (F5), la sesión de juego sigue en la semana y en «Mis sesiones»
    (spec 016, RF-19: la agenda vuelve a su estado inicial). Es decir, la guardó el servidor y no
    solo la interfaz.
- RF-19 (C2, ver y editar, con «Atrás», «Adelante» y recarga): MIENTRAS el usuario de prueba
  organiza una sesión de juego creada por la API (RF-11), EL SISTEMA comprueba que:
  - desde la agenda, «Ver detalle de <título>» abre el detalle en su propia dirección, con el
    título, el día y el horario, los cupos y al usuario de prueba marcado como quien organiza
    (spec 009, RF-3);
  - «Editar sesión» abre el formulario de edición con los valores actuales; al cambiar el título
    y los cupos y pulsar «Guardar cambios», se ve «Cambios guardados.» y el detalle muestra los
    valores nuevos (spec 009, RF-6 y RF-7);
  - tras recargar (F5) en el detalle, se siguen viendo los valores nuevos;
  - «Atrás» vuelve a la agenda, que muestra el título nuevo y no el anterior (spec 009, RF-15);
  - «Adelante» vuelve al detalle de la misma sesión de juego, con los valores nuevos.
- RF-20 (C3, eliminar = cancelar): MIENTRAS el usuario de prueba organiza una sesión de juego
  creada por la API (RF-11) y tiene su detalle abierto, CUANDO pulsa «Cancelar sesión», EL
  SISTEMA comprueba que:
  - se abre la ventana de confirmación;
  - al cerrarla sin confirmar, la sesión de juego sigue en el detalle;
  - al confirmar con «Sí, cancelar sesión», la aplicación lleva a la agenda y la sesión de juego
    ya no aparece en la semana ni en el panel (spec 009, RF-8 y RF-15);
  - tras recargar (F5), sigue sin aparecer;
  - «Atrás» no muestra el detalle de la sesión cancelada (spec 009, RF-8);
  - abrir directamente la dirección de ese detalle muestra «Esta sesión no existe» con el enlace
    «Ir a la agenda» (spec 009, RF-12).

### Cómo comprueban los escenarios
- RF-21: EL SISTEMA localiza los elementos de la interfaz por su rol y su nombre accesible, por
  la etiqueta de su campo o por su texto visible, y comprueba las direcciones por su ruta (por
  ejemplo, la de login, la de la agenda o la del detalle). No usa clases de estilo, la estructura
  de la página ni atributos añadidos solo para las pruebas (propuesta P1). Los textos que
  comprueba son los que fijan las specs 002, 006, 007, 009 y 016, en la forma que les dé la spec
  017. SI un elemento que un escenario necesita no se puede localizar así, ENTONCES no se le
  añade un atributo para las pruebas: se registra como defecto de accesibilidad y se resuelve con
  un cambio de requisitos de la spec que corresponda (RNF-8).
- RF-22: EL SISTEMA espera siempre a un estado observable (un texto, un rol o una dirección) y
  nunca un tiempo fijo. SI un escenario falla, ENTONCES EL SISTEMA guarda una traza y una captura
  de la página del fallo, y el informe de la ejecución dice qué escenario falló y qué comprobación
  no se cumplió.

## Requisitos no funcionales
- RNF-1: Dependencias nuevas, solo en `e2etests/`, todas de desarrollo, con versión exacta
  (constitución, principio 1; `AGENTS.md`, `--save-exact`) y justificadas en el plan: Playwright
  como ejecutor de pruebas, TypeScript, los tipos de Node, y para el lint (Q6) ESLint, su
  configuración recomendada de JavaScript y typescript-eslint, con las mismas versiones exactas
  que usa hoy el servidor. Ninguna de acceso directo a la base (Q3, Q4). No se añade ninguna
  dependencia a `frontend/` ni a `backend/`. Chromium se instala con el instalador de Playwright
  y no se sube al repositorio.
- RNF-2: TypeScript estricto en `e2etests/`, sin `any`, `@ts-ignore`, `@ts-expect-error` ni
  aserciones de tipo para esquivar errores. La comprobación de tipos y el lint de `e2etests/`
  están en verde (Q6). El lint aplica las mismas reglas que el del servidor, que rechaza los `any`
  explícitos.
- RNF-3: Sin `.only`. Sin escenarios omitidos ni marcados como fallo esperado sin una razón
  escrita junto a ellos y aprobada por el usuario. Sin reintentos automáticos de escenarios
  fallidos, para no ocultar fallos intermitentes.
- RNF-4: Estabilidad: tres ejecuciones completas seguidas, en el mismo equipo y sin tocar nada
  entre medias, terminan las tres en verde.
- RNF-5: Duración: una ejecución completa, con las dependencias y Chromium ya instalados,
  termina en 5 minutos como máximo en un equipo de desarrollo del equipo, incluida la compilación
  de la interfaz. El README anota el tiempo medido.
- RNF-6: Ningún archivo del repositorio contiene secretos ni credenciales reales (constitución,
  principio 5). Si la suite admite un archivo de variables propio, ese archivo no se sube (como
  `.env`) y hay una plantilla sin secretos. Tampoco se suben los informes, las trazas, las
  capturas, los resultados de las ejecuciones ni la construcción de la interfaz.
- RNF-7: Idioma (constitución, principio 6): identificadores y nombres de archivo en inglés;
  nombres de los escenarios, comentarios, mensajes propios y README en español.
- RNF-8: Esta spec no cambia el código de `frontend/` ni de `backend/`, ni el comportamiento de
  ninguna otra spec. SI el plan encuentra que hace falta un cambio en la aplicación para poder
  probarla (por ejemplo, un nombre accesible que falta), ENTONCES ese cambio se hace primero en la
  spec que corresponda, por el flujo de cambio de requisitos.
- RNF-9: El comando de pruebas funciona igual en Linux, macOS y Windows: ni el comando ni sus
  scripts usan una sintaxis exclusiva de una consola (a diferencia de `npm test` del servidor,
  que en Windows necesita `--script-shell=bash`).
- RNF-10: El resultado no depende de la zona horaria, del idioma ni del día y la hora del equipo
  que ejecuta. Las sesiones de juego son de la semana tipo, sin fecha de calendario (spec 006).
- RNF-11: Las pruebas E2E siguen el principio 4 de la constitución en su forma enmendada (Q5):
  comprueban comportamiento ya especificado e implementado, así que no se escriben antes que el
  código; en su lugar, cada escenario se ve fallar al romper a propósito lo que comprueba (prueba
  de sensibilidad de los criterios), y ninguna tarea se cierra con ellas en rojo.

## Casos límite
- MongoDB apagado: el servidor no arranca («la base de datos no está disponible…») y la suite
  termina con un código distinto de 0 sin ejecutar escenarios (RF-4).
- La compilación de la interfaz falla (por ejemplo, un error de tipos en `frontend/`): la suite
  termina con un código distinto de 0 sin arrancar el servidor ni ejecutar escenarios (RF-4).
- Puerto del sistema bajo prueba ocupado, por ejemplo por otra ejecución en marcha: la suite no
  lo reutiliza y termina con un código distinto de 0 (RF-4, RF-7).
- Entorno de desarrollo en marcha (servidor en 3001, interfaz en 5173): la suite corre igual en
  su propio puerto y no toca la base de desarrollo (RF-6, RF-7).
- El integrante tenía una construcción de la interfaz en la carpeta que sirve el servidor, por
  ejemplo de `build:ui`: la ejecución la sustituye por la suya (RF-5). No se sube al repositorio
  y se regenera con `build:ui`; el README lo avisa (RF-3).
- `frontend/.env` con `VITE_USE_MOCK_API=true`: la suite compila igual la interfaz conectada al
  servidor real (RF-5).
- `backend/.env` con `NODE_ENV=development`, `MONGODB_DBNAME=teammatchup`, el secreto de
  desarrollo o claves de Steam, Riot o Leetify: la suite arranca en modo producción, con la base
  E2E, un secreto generado y sin claves (RF-5, RF-6, RF-8, RF-10).
- Variable del nombre de la base cambiada a `teammatchup` o a un nombre sin `e2e`: la suite no
  arranca (RF-6).
- Cookie de sesión marcada como Secure (modo producción) sobre `http://127.0.0.1`: Chromium la
  acepta y la envía, y por eso la suite solo usa Chromium (Q1, Q2). La primera tarea del plan lo
  comprueba, tanto para la sesión iniciada por la interfaz como para la iniciada por la API.
  SI no se cumple, ENTONCES la implementación se detiene y se vuelve a esta spec con el usuario,
  sin cambiar el servidor (RNF-8).
- Un escenario falla a mitad: igual se elimina su usuario de prueba (RF-12).
- E4 termina sin sesión iniciada: para eliminar su usuario, la suite la inicia antes por la API
  (RF-12).
- Ejecución interrumpida con Ctrl+C: el sistema bajo prueba se detiene (RF-2). Los usuarios que
  queden no hacen fallar la siguiente ejecución (RF-12).
- Sin conexión a Internet, con todo ya instalado: la suite pasa (RF-9).
- Un escenario ejecutado solo, por ejemplo el de editar, pasa sin ejecutar antes el de crear,
  porque su sesión de juego la prepara por la API (RF-11, RF-13).
- La sesión de juego recién creada queda en «Sesión abierta» y no en «Mis sesiones» (spec 016,
  RF-24): el escenario de crear la da por listada en cualquiera de los dos paneles y, tras
  recargar, la busca en «Mis sesiones» (RF-18).
- La spec 017 cambia un texto o un rol que un escenario usa: el escenario se escribe contra la
  interfaz ya migrada, porque esta spec se implementa después (Contexto). Si el cambio llega
  después, se actualiza el escenario y no la interfaz.
- Dos sesiones de juego con el mismo título: no ocurre, porque cada escenario usa un título único
  (RF-11, RF-18).
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
  recorren de paso (RF-18). Siguen en el recorrido manual de la 016 (Q7).
- Ejecutar la suite contra la aplicación desplegada (RF-7).
- Cambios en `frontend/`, `backend/` o en otras specs (RNF-8).

## Criterios de finalización
- [ ] **Condición previa a la aprobación**: el usuario editó él mismo `docs/constitution.md` y
      sustituyó los principios 1 y 4 por el texto exacto de «Impacto» (Q5). El texto vigente del
      archivo coincide con el de esta spec.
- [ ] **Condición previa a la implementación**: las specs 016 y 017 están implementadas.
- [ ] `e2etests/` existe en la raíz con sus propias dependencias, todas de desarrollo y en
      versión exacta, las de lint con las mismas versiones que el servidor, sin ninguna de acceso
      directo a la base, y no importa código de `frontend/` ni de `backend/` (RF-1, RNF-1).
- [ ] Con MongoDB en marcha y todo instalado, el comando documentado compila la interfaz, arranca
      el servidor en modo producción en un solo puerto de `127.0.0.1`, ejecuta los siete
      escenarios (E1 a E4 y C1 a C3) en Chromium y termina con código 0; con un escenario roto a
      propósito, termina con un código distinto de 0 y el informe nombra el escenario y la
      comprobación (RF-2, RF-5, RF-7, RF-14 a RF-20, RF-22).
- [ ] Prueba de sensibilidad, una por escenario: cambiar a propósito un texto o un valor esperado
      hace fallar ese escenario por esa comprobación. Se anota en el registro de validación y
      después se deshace (RNF-11).
- [ ] Con MongoDB apagado, con el puerto ocupado, con un error que rompe la compilación de la
      interfaz y con el nombre de base `teammatchup`, la suite termina con un código distinto de 0
      sin ejecutar escenarios y con un mensaje que lo explica (RF-4, RF-6, RF-7).
- [ ] Con `frontend/.env` en modo simulado y `backend/.env` en desarrollo, con la base de
      desarrollo, el secreto de desarrollo y claves de servicios externos, la suite pasa igual, y
      la base de desarrollo no cambia: mismo número de documentos en cada colección antes y
      después (RF-5, RF-6, RF-8, RF-10).
- [ ] Una búsqueda en la salida de la ejecución, en `e2etests/` y en los informes no encuentra el
      secreto de firma generado (RF-10).
- [ ] Sin conexión a Internet, la suite pasa (RF-9).
- [ ] Cada escenario ejecutado solo pasa, y la suite pasa en orden inverso (RF-13).
- [ ] Tras una ejecución completa sin interrupciones, cada colección de la base E2E tiene el mismo
      número de documentos que antes de ejecutarla; también con un escenario roto a propósito
      (RF-12).
- [ ] Tras interrumpir una ejecución con Ctrl+C a mitad, el sistema bajo prueba ya no escucha en
      su puerto y la ejecución siguiente pasa sin borrar nada a mano (RF-2, RF-12).
- [ ] Tres ejecuciones seguidas en verde, sin reintentos (RNF-3, RNF-4), y una ejecución completa
      en 5 minutos como máximo, compilación incluida, con el tiempo anotado en el README (RNF-5).
- [ ] Comprobación de tipos y lint de `e2etests/` en verde. Sin `any`, `@ts-ignore`,
      `@ts-expect-error`, `.only` ni esperas de tiempo fijo (RNF-2, RNF-3, RF-22).
- [ ] Una búsqueda en el repositorio no encuentra secretos. `git status` tras una ejecución no
      muestra informes, trazas, capturas, la construcción de la interfaz ni archivos de
      variables (RNF-6).
- [ ] `e2etests/README.md` tiene todo lo que pide RF-3, el README raíz enlaza a él, y un
      integrante que no escribió la suite la ejecuta siguiendo solo el README (RF-3).
- [ ] El comando funciona en Linux. En Windows lo comprueba un integrante del equipo o queda
      anotado como pendiente en el registro de validación (RNF-9).
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
  juego por la interfaz; C2 y C3 parten de una creada por la API. E1 y E2 inician sesión por la
  interfaz porque es lo que comprueban. Descartadas: B, todo por la interfaz, más lento y frágil;
  C, escribir en la base, que se salta las reglas del servidor y acopla la suite a sus modelos.
- **Q5 = A. Enmendar los principios 1 y 4 de la constitución** (RNF-11, «Impacto»). El usuario
  edita él mismo `docs/constitution.md` con el texto exacto de «Impacto» antes de aprobar esta
  spec. Descartada: B, enmendar solo el principio 1 y declarar la excepción al rojo → verde en un
  RNF de esta spec.
- **Q6 = A. Comprobación de tipos y lint en `e2etests/`** (RF-1, RNF-1, RNF-2), con ESLint, su
  configuración recomendada de JavaScript y typescript-eslint en las mismas versiones exactas que
  el servidor, y sus mismas reglas. Detecta los `any` explícitos y cumple «ninguna tarea se cierra
  con lint en rojo» (principio 4). Descartada: B, solo comprobación de tipos y búsqueda manual de
  `any` en el cierre.
- **Q7 = A. Solo los siete escenarios** (E1 a E4 y C1 a C3) («Fuera de alcance»). Cubren los dos
  casos del enunciado y «Atrás», «Adelante» y F5 en ellos. Descartada: B, añadir el registro por
  la interfaz y comportamientos de la spec 016 que hoy se validan a mano. Se pueden añadir
  después con un cambio de esta spec.

Propuestas del planificador, aplicadas en el texto y pendientes de la aprobación de la spec
(cualquiera se cambia si el usuario lo pide):
- **P1. Localizar por rol, nombre accesible, etiqueta o texto, sin atributos solo para pruebas**
  (RF-21). Así los escenarios no dependen de la estructura que deje la 017 ni obligan a tocar la
  interfaz (RNF-8). Descartado: añadir identificadores de prueba a los componentes, que cambiaría
  el frontend desde esta spec y acoplaría las pruebas al marcado.
- **P2. Datos propios y únicos en cada escenario** (RF-11 a RF-13). Permite ejecutar un escenario
  solo y en cualquier orden, y tolera restos de ejecuciones interrumpidas. Descartado: una
  secuencia crear → editar → cancelar en la que cada paso dependa del anterior, que obliga a
  ejecutarlos siempre juntos y en orden.
- **P3. Sin reintentos automáticos** (RNF-3). Un fallo intermitente se ve y se arregla.
  Descartado: reintentar los fallidos, que oculta la inestabilidad.
- **P4. README propio en `e2etests/` y una sección breve con enlace en el README raíz** (RF-3).
  El README raíz ya es largo, y el enunciado admite cualquiera de los dos. Descartado: todo en el
  README raíz.
- **P5. Entorno forzado al arrancar** (RF-5, RF-6, RF-8, RF-10): modo simulado desactivado, modo
  producción, base E2E, secreto generado y claves vacías, pasados por el entorno del proceso, que
  prevalece sobre los archivos `.env` de cada carpeta. La suite funciona igual con cualquier
  `.env` de desarrollo y nunca lo modifica. Descartado: pedir al integrante que edite sus `.env`
  antes de ejecutar.
- **P6. Bloquear en el navegador las peticiones a otros orígenes** (RF-9). Garantiza que ningún
  escenario dependa de un servicio externo. Descartado: dejarlas pasar, que haría depender el
  resultado de Internet y de Data Dragon.
- **P7. Si la eliminación del usuario de prueba falla, el escenario cuenta como fallido** (RF-12).
  Un fallo al borrar delata un defecto de la API o de la suite y no debe pasar inadvertido.
  Descartado: ignorarlo, que dejaría crecer la base E2E sin aviso.

## Dudas abiertas
Ninguna.

## Impacto en otras specs y en la constitución (sin editarlas desde esta spec)
- **Constitución, principios 1 y 4** (Q5 = A). La enmienda la hace el usuario en
  `docs/constitution.md` antes de aprobar esta spec, sustituyendo cada principio completo, tal
  como está hoy en el archivo (ya enmendado para la 016), por este texto exacto:

  Principio 1 (cambia solo la última frase de la primera línea):
  ```
  1. **Stack cerrado.** Frontend: React 18 + TypeScript + Vite. Backend: Express 5 + Mongoose + TypeScript. Tests: node:test en el backend; Vitest en el frontend (spec 016); Playwright para las pruebas E2E de `e2etests/` (spec 018).
     Una dependencia nueva solo entra si una spec aprobada la justifica, y con versión exacta.
  ```
  Principio 4 (se añade solo la última frase):
  ```
  4. **Tests primero en el backend.** Toda función de dominio y todo endpoint del backend tiene un test con node:test, escrito antes que el código (rojo → verde).
     Ninguna tarea se cierra con tests, typecheck o lint en rojo, ni con un .only en el código. En el frontend bastan build, typecheck y lint en verde, hasta que una spec diga otra cosa. Cuando una spec exige pruebas en el frontend, se escriben con Vitest y también antes que el código (rojo -> verde). Las pruebas E2E con Playwright comprueban comportamiento ya especificado e implementado: no se escriben antes que el código, pero cada una se ve fallar al romper a propósito lo que comprueba y ninguna tarea se cierra con ellas en rojo.
  ```
- **Spec 016, RNF-5**: deja para «el recorrido manual y, cuando exista, las pruebas E2E de la spec
  018» lo que depende del navegador. Esta spec solo cubre de ese conjunto lo que recorren sus
  escenarios (Q7 = A). El resto sigue en el recorrido manual de la 016.
- **Spec 017**: los textos, roles y nombres accesibles que usan los escenarios (RF-14 a RF-20) son
  los de las specs 002, 007, 009 y 016. Si la 017 cambia alguno, la 018 se escribe contra el
  nuevo, porque se implementa después.
- **Spec 010**: la suite compila la interfaz en la misma carpeta que `build:ui` y arranca el
  servidor en modo producción en un puerto local (Q1 = A); no cambia nada de la spec 010.
- **Spec 011** (borrador): su carga de demostración no sirve para las E2E, porque solo se permite
  en desarrollo (su RF-3). No cambia.
- **README raíz**: una sección «Pruebas E2E» que enlaza a `e2etests/README.md` (RF-3, P4). La
  tabla «Estado del repositorio» gana la fila de `e2etests/`.
- **`.gitignore`**: los informes, trazas, capturas y resultados de `e2etests/` y un posible
  archivo de variables propio (RNF-6). `node_modules/`, `dist`, `out` y `.env`/`.env.*` ya están
  ignorados en todo el repositorio.
- **`AGENTS.md`** («Stack y estructura», «Comandos») y **`MEMORY.md`**: describen `e2etests/` y su
  comando en el cierre de esta spec.
