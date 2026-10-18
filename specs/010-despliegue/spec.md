# Spec 010 — Producción, despliegue y documentación
Estado: aprobada

## Contexto y objetivo
El enunciado del Hito 2 exige un repositorio público con `frontend/` y `backend/`, la
aplicación desplegada en el servidor del curso y un `README.md` que indique las variables
de entorno, cómo ejecutarla en local y la URL desplegada. En producción la interfaz y la
API se sirven desde el mismo origen: así la cookie de sesión de la spec 002 funciona sin
abrir el servidor a otros orígenes.

Esta spec cierra el hito: construcción de producción, despliegue y documentación.

- Depende de: specs 001 a 009. Las specs 001, 002, 004 y 007 están terminadas en otras
  ramas; quien implemente la 010 tendrá acceso a todas las specs fusionadas (D-29).
  Condiciones previas al plan:
  - que las specs 001 a 009 estén aprobadas y fusionadas (constitución, principio 2);
  - que, con todas las specs fusionadas y ANTES de redactar el `plan.md` de la 010, se
    compruebe cada supuesto de la sección "Supuestos sobre otras specs (a verificar tras
    el merge)" contra las versiones finales de esas specs, junto con las referencias a sus
    RF (ver la advertencia siguiente). Si algún supuesto no se cumple o choca con la
    versión final, se para y se resuelve con el usuario antes del plan; no se implementa
    sobre un supuesto falso (D-14, D-29). Esto incluye cómo resolvieron las specs
    finalizadas la vuelta desde Steam frente a SameSite (S-7, D-12) y la clave de Riot en
    producción, con la duda sobre sus términos de uso (S-8, D-5, D-13). Esta spec no
    modifica otras specs: cuando cita un comportamiento que depende de un supuesto (S-x),
    describe lo que la 010 supone de la versión final, no necesariamente el texto de esa
    spec en esta rama. S-2, S-12 y S-13 están retirados (D-16, D-18 y D-22);
  - que el usuario agregue al repositorio el enunciado del Hito 2 y la parte 6 del
    enunciado del Laboratorio 5 (procedimiento de despliegue). Esto se hace fuera de este
    flujo, a cargo del usuario; esta spec no transcribe su contenido (nombres de archivo en
    "Notas para el plan");
  - que el curso confirme que el servidor del curso acepta conexiones externas desde
    internet pública en el puerto público 7041 (D-23).
- Advertencia: las referencias a RF, RNF y secciones de las specs 001, 002, 004 y 007 que
  aparecen en esta spec (ej. spec 001 RF-2, RF-7 o RF-10; spec 002 RF-8 o RNF-2; spec 004
  RF-17, RF-23 o RNF-4; spec 007 RF-1 o RF-17) se tomaron de las versiones de la rama
  `cony`, que pueden no ser las finales. Al comprobar los supuestos también se comprueban
  esas referencias, antes del plan (D-29), con esta regla (D-30):
  - si una referencia solo cambió de número y el requisito dice lo mismo, el planner
    corrige la referencia en esta spec e informa al usuario, sin una aprobación aparte;
  - si cambió el contenido del requisito citado, o un supuesto no se cumple o choca con la
    versión final, se para y se lleva al usuario para que decida antes del plan.
- Origen: tareas T22 y T24 y puntos de la sección 12 (repositorio, recarga de rutas,
  README) de la spec original; requisito "Repositorio" del enunciado del Hito 2;
  procedimiento de despliegue de la parte 6 del enunciado del Laboratorio 5 del curso,
  facilitado por el usuario.
- Las decisiones técnicas ya tomadas (sección 2 —CORS y puerto—, RT-14, secciones 5.2
  —construcción de la interfaz y arranque—, 5.3 —generación del secreto—, 5.5 —archivos
  estáticos y entrega de la aplicación en las rutas de la interfaz— y 10) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
- Prevalece sobre la referencia:
  - los nombres de variables de la spec 001 (nombre de la base y dirección de escucha) en
    lugar de los de la sección 5.3 de la referencia;
  - una sola variable de puerto, la de la spec 001 (D-16): en el servidor del curso vale el
    puerto interno al que reenvía el intermediario HTTPS (RF-7), nunca el puerto público
    7041; en local vale 3001;
  - la sección 11 de la referencia en lo que la spec 004 ya dejó sin efecto (integraciones
    reales con las fuentes).
  - La tarea T23 de la referencia (hacer opcional la marca Secure si el servidor no sirve
    HTTPS) queda sin efecto y no pasa al plan: la cookie es siempre Secure en producción
    (RF-6).

### Entorno del servidor del curso
- URL pública: `https://fullstack.dcc.uchile.cl:7041/`, accesible desde internet pública
  (D-23). Un intermediario del servidor del curso atiende HTTPS en el puerto público 7041
  y reenvía las peticiones a la aplicación por HTTP en un puerto interno. El puerto interno
  no se fija en esta spec: es el valor que toma la variable de puerto de la spec 001 en el
  archivo de variables de producción, y el README explica dónde se consulta ese valor.
- Acceso por SSH en el puerto 219 con un usuario del sistema compartido por todos los
  grupos (`<usuario>` / `<contraseña>`; las credenciales reales están fuera del repositorio
  y no se escriben en ningún archivo del proyecto).
- El equipo tiene una carpeta propia en el servidor y un proceso propio en el gestor de
  procesos que ofrece el servidor del curso. Ese gestor es una herramienta del servidor, no
  una dependencia del proyecto (constitución, principio 1). Solo existe en el servidor del
  curso: la construcción de producción local se ejecuta sin él. Los nombres concretos
  están en "Notas para el plan".
- MongoDB del servidor es compartido entre grupos. Decisión del usuario: la aplicación usa
  una sola base, propia del equipo; no hay alternativa con la base común del curso. El
  equipo pide al curso un usuario de MongoDB propio, si es posible, y repite esa petición
  (D-20; ver RF-9 y casos límite).

## Usuarios
- Jugador que entra a la aplicación desplegada.
- Quien evalúa el Hito 2 y debe poder ejecutarla en local siguiendo el README, en macOS o
  Linux, con Node y MongoDB ya instalados.
- Integrantes del equipo que despliegan y preparan cada demostración.

## Historias de usuario
- HU-1. Como jugador, quiero entrar a la aplicación desde una URL pública y que recargar
  cualquier página la vuelva a cargar.
- HU-2. Como evaluador, quiero seguir el README para levantar la aplicación en local, en
  macOS o Linux y sin claves de las fuentes externas, sin pedir ayuda al equipo.
- HU-3. Como integrante del equipo, quiero un procedimiento escrito para desplegar y
  actualizar la aplicación sin afectar a los procesos de otros grupos.
- HU-4. Como integrante del equipo, quiero saber cómo renovar la clave de Riot antes de una
  demostración y qué pasa si caduca.

## Definiciones
- **Producción**: el entorno "producción" de la spec 001. Incluye la construcción de
  producción ejecutada en local y la que corre en el servidor del curso.
- **Construcción de producción**: la interfaz compilada servida por el mismo servidor que
  atiende la API.
- **Archivo compilado de la interfaz**: cada archivo que produce la compilación de la
  interfaz (la aplicación, sus scripts, estilos, iconos e imágenes).
- **Versión desplegada**: el resultado de compilar una versión identificada del
  repositorio y subirlo a la carpeta del equipo (RF-11, pasos 3 y 4).
- **Ruta de la API**: `/api` y toda ruta que empieza por `/api/`, sin distinguir mayúsculas
  de minúsculas (ej. `/API/usuarios` y `/Api` son rutas de la API).
- **Ruta de la interfaz**: cualquier ruta que no es de la API (ej. `/perfil`, `/apix`,
  `/logo-viejo.png`).
- **Petición de lectura**: petición GET o HEAD.
- **Intermediario HTTPS**: componente del servidor del curso, ajeno al proyecto, que
  atiende HTTPS en el puerto público 7041 y reenvía a la aplicación por HTTP.
- **Puerto interno**: puerto del servidor del curso al que reenvía el intermediario HTTPS.
  No es una variable propia: es el valor que toma en el servidor la variable de puerto de
  la spec 001, escrito en el archivo de variables de producción (D-16).
- **Origen público**: el origen (esquema, host y puerto) desde el que el navegador abre la
  interfaz, que la vuelta desde Steam necesita conocer (spec 004, RF-23; supuesto S-10).
  Es obligatorio en desarrollo y en producción, no en el entorno de prueba (D-24),
  admite los esquemas `http` y `https`, y vale (D-16):
  - en el servidor del curso, `https://fullstack.dcc.uchile.cl:7041`;
  - en la construcción de producción en local, `http://localhost:<puerto local>` (el
    puerto local es 3001);
  - en desarrollo, el origen de la interfaz en desarrollo.
- **Archivo de variables de producción**: el archivo real de variables de la spec 001
  (RF-9), es decir, el archivo de secretos del principio 5 de la constitución, creado a
  mano en la carpeta del equipo en el servidor del curso. Nunca se sube al repositorio y
  ninguna subida lo reemplaza ni lo borra.
- **Base con datos ajenos**: la base propia del equipo contiene colecciones que no son de
  la aplicación; en el primer despliegue, cualquier colección existente cuenta como ajena.
- **Proceso estable**: el proceso del equipo que, tras arrancar, sigue en marcha al menos
  el tiempo mínimo de estabilidad que fija el plan. Ese tiempo es siempre mayor que lo que
  tarda el proceso en terminar cuando, al arrancar, MongoDB no está disponible (S-4) o el
  puerto en que debe escuchar está ocupado (S-9), de modo que esos dos fallos cuentan
  siempre como fallos al arrancar y nunca como caídas. **Fallo al arrancar**: el proceso
  termina antes de quedar estable. **Caída**: el proceso termina por un fallo después de haber quedado
  estable (D-17).
- **Accesible** (RF-8): desde un navegador en un equipo distinto del servidor del curso,
  conectado a internet pública (sin pasar por la red de la universidad ni por su VPN), la
  URL pública carga la aplicación y se completa el recorrido del criterio CF-3 (D-23).
- **Responsable del despliegue**: el único integrante que ejecuta un despliegue o una
  actualización; mientras dura, ningún otro integrante despliega.

## Requisitos funcionales
- RF-1: MIENTRAS corre la construcción de producción, EL SISTEMA sirve la interfaz y la API
  desde el mismo origen y puerto, tomado de la variable de puerto de la spec 001 (en el
  servidor del curso, el puerto interno; en local, 3001).
- RF-2: MIENTRAS corre la construcción de producción con la interfaz compilada, CUANDO
  llega una petición de lectura a una ruta de la interfaz que no corresponde a un archivo
  compilado de la versión desplegada, ya sea pedida directamente o al recargar, EL SISTEMA
  entrega la aplicación con código de éxito. La aplicación muestra entonces la vista que
  corresponde a esa ruta según las reglas de acceso de la interfaz (spec 007): la vista de
  la ruta; el inicio de sesión si la ruta es protegida y no hay sesión; o la vista de
  página no encontrada si la ruta no existe en la interfaz. Esa elección de vista la hace
  la interfaz y se comprueba a mano (CF-1).
- RF-3: CUANDO se pide una ruta de la API que no existe, incluidas `/api`, `/api/` y las
  escritas con mayúsculas (ej. `/API/no-existe`), EL SISTEMA responde 404 con la respuesta
  de error de la spec 001 (RF-4), nunca con la aplicación.
- RF-4: MIENTRAS corre la construcción de producción con la interfaz compilada, SI llega a
  una ruta de la interfaz una petición que no es de lectura, ENTONCES EL SISTEMA responde
  404 con la respuesta de error de la spec 001 (RF-4); si su cuerpo no es JSON válido,
  responde antes 400 "JSON mal formado" (spec 001, RF-5 y su caso límite), porque el
  cuerpo se interpreta antes de buscar la ruta.
- RF-5: CUANDO el responsable del despliegue compila la interfaz de la versión que se
  despliega en el servidor del curso (RF-11, paso 3), la compila con el modo simulado
  desactivado y con la dirección de la API igual al origen público. Es un requisito del
  procedimiento de despliegue, no de la interfaz: aprovecha que la spec 007 (RF-1) deja el
  modo simulado y la dirección de la API como configurables, sin pedirle ningún cambio
  (D-18). Contrapartida aceptada: la garantía de que la versión desplegada no usa el
  backend simulado depende de seguir el procedimiento; CF-19 detecta si no se siguió.
- RF-6: MIENTRAS el entorno es producción, EL SISTEMA marca siempre la cookie de la
  credencial de sesión como Secure (spec 002, RNF-2), también cuando recibe las peticiones
  por HTTP desde el intermediario HTTPS.
- RF-7: MIENTRAS corre en el servidor del curso, EL SISTEMA escucha en el puerto interno
  (el valor de la variable de puerto de la spec 001 en el archivo de variables de
  producción) y en la dirección de escucha (spec 001, RF-10) que indica ese archivo, no en
  el puerto público 7041, y guarda sus datos solo en la base propia del equipo.
- RF-8: EL SISTEMA queda desplegado en el servidor del curso y accesible desde internet
  pública en `https://fullstack.dcc.uchile.cl:7041/`, la URL publicada en el README, al
  menos hasta la evaluación del Hito 2.
- RF-9: EL README raíz indica:
  - cada variable de entorno del servidor y de la interfaz, sin valores secretos, con su
    propósito y si es obligatoria en desarrollo, prueba y producción: las de la base de
    prueba, solo en prueba (S-1); las obligatorias en producción (S-11), entre ellas la
    variable de puerto de la spec 001 (en el servidor del curso, el puerto interno; en
    local, 3001; si falta en producción, no arranca y nombra la variable, D-27); el
    origen público, obligatorio en desarrollo y en producción y no en prueba (D-24), con
    su valor en cada entorno (S-3); las de la interfaz que RF-5 fija para la versión
    desplegada; las claves de las fuentes externas que exija la spec 004 (en la versión de
    la rama `cony`, Riot y FACEIT; la lista final es la de la spec 004 finalizada, que
    cierra sus dudas sobre Leetify y sobre si Steam exige clave), opcionales en desarrollo
    (S-6);
  - dónde se consulta en el servidor del curso el valor del puerto interno;
  - los requisitos previos, que se suponen ya instalados: la versión mínima de Node de la
    referencia (RT-01, Node ≥ 22.18) y un MongoDB local; y que los pasos cubren solo macOS
    y Linux;
  - cómo obtener cada clave de las fuentes externas, y que sin ellas, en desarrollo,
    vincular o resincronizar cuentas de los juegos afectados (hoy LoL y CS2) responde
    "Fuente no disponible, inténtalo más tarde." (spec 004, RF-17; supuesto S-6)
    mientras el resto de la aplicación funciona;
  - cómo levantar la aplicación en local en desarrollo;
  - cómo ejecutar el comando único de pruebas del servidor (spec 001, RF-8), solo en local,
    y las comprobaciones de la interfaz (constitución, principio 4: construcción, tipos y
    lint);
  - cómo levantar la construcción de producción en local, compilando la interfaz igual que
    en el servidor (RF-5): con el modo simulado desactivado y la dirección de la API igual
    al origen público local (`http://localhost:3001`), de modo que no aparece "Datos de
    demostración" (D-25; CF-1); y que se abre en `http://localhost:3001` con un
    navegador que acepte cookies Secure en esa dirección; que en Safari en macOS, y por
    `127.0.0.1` en los navegadores que no lo tratan como seguro, la cookie se descarta y
    no se puede iniciar sesión (RF-6; casos límite);
  - la URL desplegada y que es accesible desde internet pública (D-23);
  - una advertencia de que, en el servidor del curso, otros grupos pueden leer los correos
    y los hash de contraseña de los usuarios registrados en el MongoDB compartido,
    modificar o borrar la base propia del equipo, y suplantar a cualquier jugador firmando
    credenciales con el secreto de firma del archivo de variables de producción
    (limitaciones reconocidas, D-8 y D-20; ver casos límite), y de que el equipo ha pedido
    al curso un usuario de MongoDB propio.
- RF-10: EL README de la interfaz lista las operaciones de la API que consume tal como
  quedan tras las specs 002 a 009, con el formato de su tabla actual (método, ruta y
  descripción), sin las operaciones que ya no existen y remitiendo al contrato de datos
  para la forma de cada respuesta.
- RF-11: EL README documenta el procedimiento de despliegue en el servidor del curso, con
  marcadores (`<usuario>`, `<contraseña>`) en lugar de credenciales y a cargo de un solo
  responsable del despliegue:
  1. comprobar en el servidor la versión de Node con la que el gestor de procesos
     ejecutará el proceso del equipo, que es la misma que se usa en los pasos 6 y 8; si es
     menor que la mínima (Node ≥ 22.18), el procedimiento se detiene sin subir ni cambiar
     nada;
  2. solo en el primer despliegue, comprobar que no existe en el gestor de procesos un
     proceso con el nombre del proceso del equipo; si existe, el procedimiento se detiene
     sin crear ni cambiar ningún proceso;
  3. compilar la interfaz, con el modo simulado desactivado y la dirección de la API igual
     al origen público del servidor del curso (RF-5), y el servidor, en el equipo del
     integrante, a partir de una versión identificada del repositorio, y anotar en el
     README cuál es la versión desplegada, para poder volver a ella;
  4. subir por SSH, en el puerto 219, a la carpeta del equipo, el resultado de la
     compilación junto con los archivos que describen las dependencias del servidor y sus
     versiones exactas, sin dependencias instaladas y sin ningún archivo de variables. La
     subida reemplaza por completo la versión desplegada anterior (no la mezcla: los
     archivos que la versión nueva no tiene desaparecen), salvo el archivo de variables de
     producción, que no se reemplaza ni se borra;
  5. solo en el primer despliegue, crear el archivo de variables de producción con la
     ubicación de MongoDB, el nombre de la base propia, la variable de puerto de la spec
     001 con el valor del puerto interno (y dónde se consulta), la dirección de escucha, el
     origen público, el secreto de firma (y cómo generarlo) y las claves de las fuentes;
     sin variables de la base de prueba;
  6. instalar en el servidor solo las dependencias necesarias para ejecutar la aplicación
     (no las de desarrollo ni las de pruebas), con las versiones exactas que fijan los
     archivos subidos en el paso 4;
  7. solo en el primer despliegue, antes de levantar el proceso, comprobar a mano lo que
     exige RF-18; si la comprobación falla, el procedimiento se detiene sin levantar el
     proceso;
  8. solo en el primer despliegue, levantar el proceso del equipo con el gestor de
     procesos del servidor, sin guardar la lista de procesos del gestor;
  9. en cada actualización, repetir los pasos 1, 3, 4 y 6 (instalando siempre las
     dependencias, sin decidir a mano si cambiaron) y reiniciar solo el proceso del
     equipo, sin repetir los pasos 2, 5, 7 ni 8, de modo que nunca hay dos procesos del
     equipo; tras cambiar el archivo de variables, reiniciar el proceso para que tome los
     valores nuevos;
  10. si la máquina del servidor se reinicia, levantar a mano el proceso del equipo con el
      paso 8, con la versión de Node comprobada en el paso 1;
  11. para volver atrás tras un despliegue fallido, repetir el paso 9 con la versión
      desplegada anterior anotada en el paso 3. La vuelta atrás no deshace los datos que
      la versión fallida ya escribió en la base (sin respaldos: fuera de alcance).
  Toda orden al gestor de procesos nombra el proceso del equipo; ninguna actúa sobre todos
  los procesos. Ningún paso ejecuta las pruebas automáticas en el servidor del curso.
  Aparte de los pasos, el README describe la comprobación a mano del límite de reintentos
  (CF-7): cuándo se hace (fuera de una evaluación), qué se cambia en la configuración y el
  proceso propios, y cómo se restauran después (D-31).
- RF-12: EL README documenta cómo obtener y renovar la clave de desarrollo de Riot (caduca
  cada 24 horas), dónde reemplazarla en el servidor del curso, que hay que reiniciar el
  proceso para que la tome y que, mientras está caducada o el proceso no se ha reiniciado,
  vincular y resincronizar cuentas LoL responden "Fuente no disponible, inténtalo más
  tarde." (spec 004, RF-17) sin cerrar sesión (spec 004, RF-18), y las cuentas ya guardadas
  conservan su último rango. Si los términos de Riot no permiten usar la clave de
  desarrollo en la aplicación desplegada (spec 004, dudas abiertas), el README indica en
  cambio que LoL queda sin fuente en el servidor (vincular y resincronizar cuentas LoL
  responden "Fuente no disponible, inténtalo más tarde.") y que su demostración se hace en
  local (cómo se configura ese caso lo fija la spec 004 finalizada: supuesto S-8, D-13).
- RF-13: EL README indica que el servidor no tiene datos de demostración: la base empieza
  vacía y las coincidencias se demuestran con cuentas reales del equipo.
- RF-14: EL SISTEMA trata el origen público como variable obligatoria en desarrollo y en
  producción (S-3: si falta, está vacía o no es un origen bien formado con esquema `http`
  o `https`, no arranca y nombra la variable, como en la spec 001, RF-2) y lo usa, en ambos
  entornos, como dirección de vuelta desde Steam (spec 004, RF-23; supuesto S-10).
  EL SISTEMA no exige `https`: acepta un origen `http` bien formado en cualquiera de los
  dos entornos (D-16). En el entorno de prueba no es obligatorio: si falta, arranca
  (D-24; si las pruebas de la vuelta desde Steam lo necesitan, lo define la spec 004:
  supuesto S-14). Su valor en cada entorno es el de la definición.
- RF-15: CUANDO EL SISTEMA entrega la aplicación, indica al navegador que no la reutilice
  desde su caché sin comprobar antes con el servidor que sigue siendo la versión
  desplegada, de modo que, tras publicar una versión nueva y reiniciar el proceso, recargar
  cualquier ruta de la interfaz entrega la aplicación de la versión nueva.
- RF-16: (Sin efecto: el puerto ocupado al arrancar es un comportamiento de arranque que
  la 010 supone resuelto en la spec 001, supuesto S-9. Se conserva el número para no
  romper referencias.)
- RF-17: MIENTRAS corre en el servidor del curso, SI el proceso del equipo falla al
  arrancar porque MongoDB no está disponible (S-4) o porque el puerto en que debe escuchar
  está ocupado (S-9), ENTONCES el gestor de procesos lo reintenta; solo cuentan los fallos
  al arrancar consecutivos, la cuenta vuelve a cero cuando el proceso queda estable y,
  alcanzado el número máximo fijado en el plan, el proceso queda detenido hasta que un
  integrante lo levante, sin reinicios en bucle (D-17). Para que esos fallos no se tomen
  por caídas (RF-19), el tiempo mínimo de estabilidad es mayor que lo que tarda el proceso
  en terminar en ambos casos (definición "Proceso estable"). En la construcción de producción
  local no hay gestor: el proceso termina con el mensaje de S-4 o de S-9 y no se
  reintenta.
- RF-18: SI, en el primer despliegue, la base propia es una base con datos ajenos, o el
  usuario de MongoDB no tiene permiso para crear índices en ella (los que exige la
  aplicación, como la unicidad del correo de la spec 002), ENTONCES el procedimiento de
  despliegue se detiene en el paso 7 de RF-11, antes de levantar el proceso y sin crear
  ninguna colección, índice ni documento en la base. Lo comprueba a mano el responsable
  del despliegue, revisando las colecciones existentes y los permisos del usuario de
  MongoDB, sin crear índices ni colecciones; las actualizaciones no lo repiten (D-19).
- RF-19: MIENTRAS corre en el servidor del curso, SI el proceso del equipo sufre una caída
  (termina por un fallo después de haber quedado estable), ENTONCES el gestor de procesos
  lo reinicia siempre, sin que esa caída cuente para el límite de RF-17; CUANDO el proceso
  se reinicia, EL SISTEMA vuelve a responder en la URL desplegada en un máximo de 60
  segundos. Si el reinicio falla al arrancar, se aplica RF-17 (D-17).
- RF-20: MIENTRAS corre la construcción de producción con la interfaz compilada, CUANDO
  llega una petición de lectura a una ruta de la interfaz que corresponde a un archivo
  compilado de la versión desplegada, EL SISTEMA entrega ese archivo.
- RF-21: SI MongoDB deja de estar disponible con el sistema ya en marcha, ENTONCES EL
  SISTEMA sigue en marcha sin terminar el proceso y responde 500 "error interno del
  servidor" (spec 001, RF-6) a las peticiones que necesitan la base; CUANDO MongoDB vuelve
  a estar disponible, EL SISTEMA, como máximo 60 segundos después, responde con éxito a
  esas peticiones sin que nadie reinicie el proceso (D-17, D-26).

## Requisitos no funcionales
- RNF-1: Ni el archivo real de variables, ni los archivos generados por la construcción, ni
  las dependencias instaladas se suben al repositorio (`AGENTS.md`).
- RNF-2: El servidor no autoriza a otros orígenes a leer sus respuestas: ninguna respuesta,
  tampoco a una petición que declara venir de otro origen, incluye permisos de intercambio
  entre orígenes. La protección contra peticiones enviadas desde otros sitios es la de la
  spec 002 (cookie y comprobante anti-CSRF) y esta spec no la relaja.
- RNF-3: El README raíz y el README de la interfaz están en español (constitución,
  principio 6).
- RNF-4: Ningún archivo del repositorio ni ningún commit de su historial contiene
  credenciales del servidor del curso, de MongoDB ni de las fuentes externas, porque el
  repositorio es público y su historial también se publica.
- RNF-5: El despliegue no detiene, reinicia ni modifica procesos, carpetas ni bases de otros
  grupos, ni guarda la lista de procesos del gestor. Se verifica así:
  - el procedimiento (RF-11) no contiene órdenes sobre carpetas, bases ni procesos ajenos,
    y toda orden al gestor nombra el proceso del equipo;
  - la lista de procesos del gestor tomada antes y después de cada despliegue muestra los
    mismos procesos de otros grupos; un cambio de estado o de número de reinicios en uno de
    ellos no cuenta como incumplimiento si ninguna orden del despliegue lo nombra, porque
    el gestor puede reiniciarlo por su cuenta;
  - la lista de procesos guardada del gestor no cambia durante el despliegue (cómo se
    comprueba: en el plan).
- RNF-6: Pruebas automáticas del servidor, escritas antes del código (constitución,
  principio 4) y ejecutadas solo en local: la entrega de la aplicación en RF-2 (no la
  elección de vista, que hace la interfaz), RF-3 (incluidas las rutas con mayúsculas),
  RF-4 (incluido el JSON mal formado), RF-6, RF-15 (las indicaciones de caché de la
  respuesta), RF-20 y RNF-2. La elección de vista de RF-2 se comprueba con la
  construcción, los tipos y el lint de la interfaz (constitución, principio 4) y con el
  criterio CF-1, porque la interfaz no tiene pruebas automáticas; RF-5 es un paso del
  procedimiento y se comprueba con CF-19. La lectura del puerto y de la dirección de
  escucha se comprueba como indica la spec 001 (sus criterios de finalización de RF-1 y
  RF-10, a mano). Las variables obligatorias por entorno (RF-14; S-1, S-3 y S-11), MongoDB
  no disponible al arrancar (S-4) y el puerto ocupado (S-9) se comprueban con los criterios
  de finalización que la 010 supone en la spec 001 finalizada (S-11, parte b). El reintento
  limitado del gestor (RF-17), el reinicio tras una caída (RF-19), la comprobación de la
  base (RF-18) y la caída de MongoDB con el sistema en marcha (RF-21) no tienen pruebas
  automáticas: se comprueban a mano con sus criterios propios (CF-7, CF-6, CF-11 y CF-20).

## Casos límite
- Recargar una ruta protegida sin sesión en producción: carga la aplicación y esta lleva al
  inicio de sesión (RF-2, spec 007).
- Pedir una ruta que no existe en la interfaz (ej. `/no-existe`): carga la aplicación con
  la vista de página no encontrada (RF-2).
- Pedir un archivo compilado que existe (un script o un icono de la versión desplegada):
  se entrega ese archivo, no la aplicación (RF-20).
- Pedir un archivo inexistente fuera de la API (ej. `/logo-viejo.png`): entrega la
  aplicación con código de éxito, como cualquier ruta de la interfaz (decisión de la sección
  5.5 de la referencia), y la aplicación muestra la vista de página no encontrada. No es un
  error de la API (S-5).
- Pestaña abierta durante un redespliegue: si pide un archivo compilado de la versión
  anterior, que la subida ya borró (RF-11, paso 4), recibe la aplicación con código de
  éxito en lugar del archivo y esa parte de la vista falla (consecuencia de la sección 5.5
  de la referencia). Recargar carga la versión nueva (RF-15).
- `/api` y `/api/`: 404 con la respuesta de error (RF-3). `/API/no-existe` y `/Api`: también
  404 en JSON, porque son rutas de la API (RF-3). `/apix`: ruta de la interfaz.
- Crear, modificar o borrar sobre una ruta de la interfaz (ej. POST a `/perfil`): 404 con la
  respuesta de error (RF-4). Con un cuerpo JSON mal formado: 400 "JSON mal formado" (RF-4;
  spec 001, RF-5).
- Versión compilada sin desactivar el modo simulado o sin la dirección de la API: la
  interfaz usa el backend simulado y muestra "Datos de demostración". Es un incumplimiento
  del procedimiento (RF-5; RF-11, paso 3), no del sistema; CF-19 lo detecta y se corrige
  volviendo a compilar y desplegar (RF-11, paso 9).
- Construcción de producción abierta por HTTP fuera de `localhost` (ej. por la IP de la red
  local): por RF-6 el navegador descarta la cookie y no se puede iniciar sesión.
- Construcción de producción local abierta por `127.0.0.1`, o en `http://localhost` con un
  navegador que no acepta cookies Secure sin HTTPS (Safari en macOS): la cookie se descarta
  y no se puede iniciar sesión. La construcción de producción local se prueba en
  `http://localhost` con un navegador que sí las acepta, y el README lo advierte (RF-9).
  Esto no cambia RF-6 (D-1).
- En el servidor del curso la aplicación recibe HTTP del intermediario HTTPS, pero el
  navegador habla HTTPS con el puerto 7041, así que acepta la cookie Secure (RF-6).
- Subida de una versión nueva: reemplaza la versión desplegada anterior y no reemplaza ni
  borra el archivo de variables de producción (definición y RF-11, paso 4).
- Recargar tras un redespliegue: se carga la versión nueva de la interfaz, no una copia
  antigua de la caché (RF-15).
- Actualización: no se vuelve a levantar el proceso, solo se reinicia, así que nunca hay dos
  procesos del equipo (RF-11, paso 9).
- Despliegue fallido a medias: el responsable del despliegue vuelve a la versión desplegada
  anterior anotada (RF-11, paso 11); los datos ya escritos por la versión fallida se
  conservan. Dos integrantes no despliegan a la vez: cada despliegue tiene un solo
  responsable.
- Las dependencias se instalan en el servidor (RF-11, paso 6), así que ningún módulo
  compilado en el sistema operativo del integrante llega al servidor.
- Cambiar el archivo de variables sin reiniciar: el proceso sigue con los valores anteriores
  hasta reiniciarlo, porque se leen al arrancar (spec 001, RF-1 y RF-2).
- Archivo de variables de producción sin variables de la base de prueba: la aplicación
  arranca (S-1). Sin ellas el entorno de prueba no puede arrancar en el servidor, lo
  que es coherente con que las pruebas nunca se ejecuten allí.
- Archivo de variables de producción, o configuración de desarrollo, sin el origen
  público: la aplicación no arranca y el mensaje nombra la variable (RF-14; S-3).
- Entorno de prueba sin el origen público: la aplicación arranca, porque en prueba no es
  obligatorio (RF-14; S-3; D-24). Si las pruebas de la vuelta desde Steam de la spec 004
  necesitan un origen público, lo define la propia spec 004 (S-14; D-28).
- Archivo de variables de producción sin la variable de puerto: la aplicación no arranca y
  el mensaje nombra la variable; no usa 3001 por defecto (S-11; D-27).
- Origen público mal formado (valor que no es una URL, con un esquema distinto de `http` o
  `https`, con ruta o barra final, consulta o fragmento): la aplicación no arranca y el
  mensaje nombra la variable (RF-14; S-3).
- Origen público bien formado pero que no coincide con el origen real (ej. `http` u otro
  puerto en el servidor del curso): la aplicación arranca, porque no se exige `https` ni se
  compara con la URL desplegada (RF-14), y la vuelta desde Steam regresa a una dirección
  equivocada. Lo evita el valor que fija el paso 5 de RF-11 y lo detecta CF-16.
- Cambiar el secreto de firma: las sesiones abiertas dejan de valer, la siguiente petición
  protegida responde 401 "token inválido" (spec 002, RF-11) y el jugador vuelve a iniciar
  sesión.
- Clave de Riot que caduca en medio de una vinculación: responde 503 y no crea la cuenta
  (spec 004, RF-17). Clave renovada sin reiniciar el proceso: se sigue usando la caducada
  hasta reiniciarlo (RF-12).
- Clave de Riot caducada durante una evaluación: se aplica RF-12; el resto de la aplicación
  sigue funcionando.
- Evaluador que levanta la aplicación en local sin ninguna clave de las fuentes externas:
  arranca; vincular o resincronizar cuentas de los juegos afectados (hoy LoL y CS2) responde
  "Fuente no disponible, inténtalo más tarde." y el resto funciona (RF-9; S-6).
- Evaluador en Windows: fuera de alcance; el README cubre solo macOS y Linux.
- Puerto ocupado al arrancar: la aplicación no arranca, el mensaje nombra el puerto y el
  proceso termina (S-9); en el servidor del curso el gestor la reintenta con el mismo límite de fallos al
  arrancar consecutivos que MongoDB no disponible, sin reinicios en bucle (RF-17).
- MongoDB no disponible al arrancar: la aplicación no arranca, muestra un mensaje en
  español y el proceso termina (S-4); en el servidor del curso el gestor la reintenta hasta el número máximo de
  fallos al arrancar consecutivos, sin reinicios en bucle (RF-17).
- MongoDB que cae con la aplicación en marcha: el proceso sigue en marcha, las peticiones
  que necesitan la base responden 500 "error interno del servidor", las que no la necesitan
  (ej. la entrega de la aplicación) siguen respondiendo, y cuando MongoDB vuelve la
  aplicación se recupera sola, sin reinicio, en un máximo de 60 segundos (RF-21; D-26). Como el proceso no termina, el gestor
  no interviene.
- Caída después de funcionar con normalidad, aunque antes hubiera habido fallos al
  arrancar: el gestor reinicia siempre, porque la cuenta de fallos volvió a cero al quedar
  estable el proceso (RF-17, RF-19). Si ese reinicio falla al arrancar (ej. MongoDB sigue
  sin estar disponible), empieza a contar el límite de RF-17.
- Proceso con el nombre del equipo ya existente en el primer despliegue: el procedimiento se
  detiene (RF-11, paso 2).
- Node del servidor menor que 22.18: el procedimiento lo detecta antes de subir nada y se
  detiene (RF-11, paso 1). Se comprueba la versión con la que el gestor ejecuta el
  proceso, no otra instalada en el servidor.
- La base propia ya existe con datos ajenos, o el usuario de MongoDB no tiene permiso para
  crear índices (unicidad del correo), en el primer despliegue: el responsable del
  despliegue lo detecta a mano en el paso 7 y el procedimiento se detiene sin levantar el
  proceso ni crear nada en la base (RF-18). Las actualizaciones no repiten la comprobación,
  así que una colección ajena añadida después del primer despliegue no se detecta (ver la
  limitación reconocida sobre la base).
- Reinicio de la máquina del servidor: el proceso no vuelve solo, porque no se guarda la
  lista de procesos (RNF-5); un integrante lo levanta a mano siguiendo el README (RF-11,
  paso 10).
- El proceso se cae: el gestor lo reinicia y la aplicación vuelve a responder en un máximo
  de 60 segundos (RF-19).
- Otro grupo reinicia por su cuenta un proceso suyo durante el despliegue: no incumple
  RNF-5, porque ninguna orden del despliegue lo nombra.
- Vuelta desde Steam (verificación de CS2, spec 004 RF-23): usa el origen público (RF-14;
  S-10), en producción la URL desplegada y en desarrollo el origen de la interfaz en
  desarrollo, y debe funcionar sin relajar la cookie ni el comprobante anti-CSRF (spec 004,
  RNF-6). Cómo se concilia con la cookie SameSite=Strict lo resuelven las specs 002, 004 y
  007 finalizadas; la 010 lo supone (S-7, D-12) y quien implemente comprueba tras el merge
  cómo lo resolvieron.
- Limitación reconocida por el usuario (D-20): como el usuario del sistema es compartido
  por todos los grupos, el archivo de variables de producción (secreto de firma, claves de
  las fuentes, ubicación de MongoDB) es legible por otros grupos. Con el secreto de firma,
  otro grupo puede firmar credenciales y suplantar a cualquier jugador; con la ubicación
  de MongoDB, puede modificar o borrar la base propia, no solo leerla. Se advierte en el
  README (RF-9) y el equipo repite al curso la petición de un usuario de MongoDB propio.
  Queda en tensión explícita con el principio 5 de la constitución ("secretos solo en
  .env" protege el repositorio, no al servidor compartido; "toda escritura usa el usuario
  de la sesión" no se sostiene si la sesión puede falsificarse), igual que D-8.
- Limitación reconocida por el usuario (D-8): en el MongoDB compartido, otros grupos pueden
  leer los correos y los hash de contraseña de los usuarios registrados. Esto queda en
  tensión explícita con el principio 5 de la constitución ("ninguna respuesta con el hash
  ni el correo de otro"), que la aplicación cumple en sus respuestas pero que el entorno no
  garantiza en la base. Se advierte en el README (RF-9) y el equipo pide al curso un
  usuario de MongoDB propio, si es posible.

## Fuera de alcance
- Integración continua y despliegue automático.
- Dominio propio o certificados: HTTPS lo atiende el intermediario del servidor del curso.
- Monitoreo y respaldos de la base de datos (incluida la vuelta atrás de los datos).
- Aislar los secretos de producción y los datos personales de otros grupos en el servidor
  del curso, y evitar que otros grupos modifiquen o borren la base propia o suplanten
  jugadores con el secreto de firma (limitaciones reconocidas en casos límite, D-8 y
  D-20).
- Renovación automática de la clave de Riot.
- Que el proceso vuelva solo tras un reinicio de la máquina (guardar la lista de procesos
  del gestor).
- Ejecutar las pruebas automáticas en el servidor del curso.
- README para Windows e instalación de Node o MongoDB.
- Despliegues simultáneos de varios integrantes y vuelta atrás automática.
- Qué responde el servidor a una ruta de la interfaz cuando no sirve la interfaz compilada
  (en desarrollo, o en producción sin la compilación de la interfaz), y si arranca en ese
  caso: corresponde a la spec 001 (D-22). Esta spec solo cubre producción con la interfaz
  compilada, que su procedimiento siempre genera (RF-11, paso 3).
- Que la propia interfaz impida el modo simulado o fije la dirección de la API en
  producción: la 010 no pide cambios a la spec 007; lo garantiza el procedimiento (RF-5,
  D-18).
- Cómo resuelven las specs 002, 004 y 007 la vuelta desde Steam frente a SameSite y la
  clave de Riot en producción (D-12, D-13, D-21): lo deciden sus versiones finales; la 010
  solo comprueba tras el merge lo que supone (S-7, S-8).
- Pedir cambios a las specs 001, 002, 004 y 007: están terminadas en otras ramas; la 010
  solo declara supuestos sobre ellas (D-29).
- Volver a comprobar la base con datos ajenos o los permisos de MongoDB en cada
  actualización (RF-18, D-19).

## Criterios de finalización
- [ ] CF-1. En local, la construcción de producción, compilada como indica el README
      (RF-9) y abierta en `http://localhost:3001` (con un navegador que acepta cookies Secure
      allí), responde la interfaz y la API en el mismo puerto; recargar `/perfil` con
      sesión muestra el perfil, sin sesión lleva al inicio de sesión, y `/no-existe`
      muestra la vista de página no encontrada; no aparece la etiqueta "Datos de
      demostración" en ninguna vista (RF-1, RF-2, RF-9; D-25).
- [ ] CF-2. Las pruebas automáticas de RNF-6 están en verde en local, junto con la
      comprobación de tipos y las pruebas del servidor, y la construcción, la comprobación
      de tipos y el lint de la interfaz terminan en verde (constitución, principio 4).
- [ ] CF-3. En la URL desplegada, desde un equipo distinto del servidor del curso conectado
      a internet pública (sin la red de la universidad ni su VPN), se completa: registro,
      inicio de sesión (la cookie llega con Secure), recarga de `/perfil` sin perder la
      sesión y cierre de sesión (RF-6, RF-8).
- [ ] CF-4. En la URL desplegada, `/api/no-existe` y `/API/no-existe` responden 404 en JSON
      (RF-3), y un archivo compilado de la versión desplegada se entrega como tal (RF-20).
- [ ] CF-5. Se publica una versión con un cambio visible en un texto de la interfaz y se
      reinicia el proceso; recargar la URL desplegada en un navegador que ya había cargado
      la versión anterior, sin vaciar su caché, muestra el texto nuevo (RF-15).
- [ ] CF-6. Con el proceso del equipo ya estable, se termina de forma abrupta, sin usar la
      orden de parada del gestor, más veces seguidas que el máximo de RF-17, dejándolo
      quedar estable entre una y otra; el gestor lo reinicia cada vez y la aplicación vuelve
      a responder en la URL desplegada en un máximo de 60 segundos (RF-19).
- [ ] CF-7. Comprobado a mano en el servidor del curso, fuera de una evaluación (la URL
      desplegada deja de responder unos minutos), tocando solo la configuración y el
      proceso propios del equipo; nunca se toca el MongoDB compartido ni ningún proceso
      ajeno, y toda orden al gestor nombra el proceso del equipo (RNF-5; D-31):
      - MongoDB no disponible: en el archivo de variables de producción se apunta la
        ubicación de MongoDB a una dirección en la que no responde nada y se reinicia solo
        el proceso del equipo; la aplicación no arranca, muestra el mensaje en español que
        lo indica y el gestor de procesos deja de reintentar tras el número máximo de
        fallos al arrancar consecutivos fijado en el plan, quedando el proceso detenido.
        Después se restaura el archivo de variables de producción y se vuelve a reiniciar
        el proceso del equipo;
      - puerto interno ocupado: con el proceso del equipo parado, un proceso temporal del
        equipo ocupa el puerto interno y se levanta el proceso del equipo; el resultado es
        el mismo, con el mensaje que nombra el puerto. Después se para el proceso temporal
        y se vuelve a levantar el proceso del equipo;
      - al terminar, el archivo de variables de producción está restaurado, el puerto
        interno lo usa solo el proceso del equipo, no queda ningún proceso temporal y la
        aplicación vuelve a responder en la URL desplegada (RF-17).
- [ ] CF-8. Las listas de procesos del gestor tomadas antes y después del despliegue, y la
      lista guardada del gestor, confirman RNF-5.
- [ ] CF-9. El archivo de variables de producción no contiene variables de la base de prueba
      y la aplicación arranca con él (RF-11, paso 5).
- [ ] CF-10. En el servidor del curso, la aplicación escucha en el puerto interno (el valor
      de la variable de puerto de la spec 001 en el archivo de variables de producción) y
      no en el 7041, y sus colecciones están solo en la base propia del equipo (RF-7).
- [ ] CF-11. El README describe cada parada del procedimiento (Node menor que 22.18, proceso
      con el mismo nombre, base con datos ajenos o usuario de MongoDB sin permiso para
      crear índices) con la comprobación que la detecta (RF-11); en el primer despliegue,
      el responsable del despliegue ejecuta a mano la comprobación de RF-18 en el paso 7,
      sin crear índices ni colecciones, y la misma comprobación, ejecutada antes en un
      MongoDB local contra una base con una colección ajena, detiene el procedimiento sin
      crear nada en ella (RF-18).
- [ ] CF-12. Una persona que no participó en el despliegue, en macOS o Linux, con Node ≥
      22.18 y MongoDB local ya instalados y sin ninguna clave de las fuentes externas,
      levanta la aplicación en local siguiendo solo el README; vincular LoL o CS2 responde
      "Fuente no disponible, inténtalo más tarde." y el resto funciona (RF-9).
- [ ] CF-13. El README de la interfaz lista exactamente las operaciones que expone el
      servidor tras las specs 002 a 009 (comparadas una a una), sin operaciones retiradas
      (RF-10).
- [ ] CF-14. El README documenta la renovación de la clave de Riot y el caso de RF-12 que
      corresponda según D-5; con la clave caducada, vincular una cuenta LoL en la URL
      desplegada responde "Fuente no disponible, inténtalo más tarde." sin cerrar sesión
      (RF-12).
- [ ] CF-15. El README indica que el servidor no tiene datos de demostración, y tras el
      primer despliegue la base propia no contiene ningún usuario antes del primer
      registro (RF-13).
- [ ] CF-16. En producción y en desarrollo, sin el origen público, y con un origen mal
      formado, la aplicación no arranca y el mensaje nombra la variable; con un origen
      `http` bien formado, arranca; con el origen correcto, la vuelta desde Steam regresa a
      la URL desplegada en el servidor del curso y al origen de la interfaz en desarrollo;
      en el entorno de prueba, sin el origen público, arranca (RF-14; D-24).
- [ ] CF-17. El README raíz y el README de la interfaz están escritos en español (RNF-3).
- [ ] CF-18. El control de versiones no muestra archivos de variables, de construcción ni
      dependencias como pendientes de subir, y una búsqueda en todos los archivos y en todo
      el historial del repositorio no encuentra los valores reales de ningún secreto ni
      cadenas de conexión con credenciales (RNF-1, RNF-4; los patrones de búsqueda se fijan
      en el plan).
- [ ] CF-19. En la versión desplegada no aparece la etiqueta "Datos de demostración" en
      ninguna vista, y el inicio de sesión funciona contra el servidor real: el usuario
      registrado en CF-3 existe en la base propia del equipo (RF-5).
- [ ] CF-20. En local, con la construcción de producción en marcha, se detiene MongoDB: una
      petición que necesita la base responde 500 "error interno del servidor", el proceso
      sigue en marcha y la aplicación se sigue entregando; se vuelve a levantar MongoDB y
      la misma petición responde con éxito, como máximo 60 segundos después, sin reiniciar
      el proceso (RF-21; D-26).

## Dudas abiertas
Ninguna. P-1 a P-8 están respondidas (D-16 a D-23), las cuatro preguntas de la pasada
siguiente también (D-24 a D-27), P-9 también (D-28) y P-10 también (D-31).

D-12 y D-13 las resuelven las specs 002, 004 y 007 finalizadas; la 010 lo supone (S-7 y
S-8) y lo comprueba tras el merge, antes del plan (D-21, D-29). Comprobar los supuestos no
es una duda abierta de esta spec: es una condición previa al plan.

## Supuestos sobre otras specs (a verificar tras el merge)
Esta spec no edita otras specs. Las specs 001, 002, 004 y 007 están terminadas en otras
ramas y nadie las va a modificar a petición de la 010 (D-29). Lo que sigue es lo que la 010
supone que dicen sus versiones finales.

- Numeración: cada supuesto S-x sustituye al antiguo "cambio requerido" C-x con el mismo
  número (S-1 era C-1, etc.). S-14 es nuevo (D-28). S-2, S-12 y S-13 se conservan solo
  como constancia, porque D-16, D-18 y D-22 los citan.
- Comprobación: con todas las specs fusionadas y ANTES de redactar el `plan.md` de la 010,
  quien implemente comprueba cada supuesto, y las referencias a RF que contiene, contra
  las versiones finales (ver la advertencia de "Contexto y objetivo"). Si alguno no se
  cumple o choca con la versión final, se para y se resuelve con el usuario antes del plan;
  no se implementa sobre un supuesto falso (D-14, D-29).
- Regla tras el merge (D-30):
  - si una referencia a un RF de otra spec solo cambió de número y el requisito dice lo
    mismo, el planner corrige la referencia en la 010 e informa al usuario, sin una
    aprobación aparte;
  - si cambió el contenido, o un supuesto no se cumple o choca, se para y se lleva al
    usuario para que decida antes del plan.

- S-1. La 010 supone que la spec 001 hace obligatorias las variables de la base de prueba
  (ubicación y nombre) solo en el entorno de prueba, no en desarrollo ni en producción.
  Motivo: D-3. Dependen: RF-9, RF-11 (paso 5) y CF-9.
- S-2. (Retirado por D-16: la aplicación usa una sola variable de puerto, la de la spec
  001; el puerto interno es su valor en el servidor del curso. Solo constancia.)
- S-3. La 010 supone que la spec 001 define una variable de origen público, obligatoria en
  desarrollo y en producción y no en el entorno de prueba (D-24), con el comportamiento de
  su RF-2 si falta o está vacía, y también SI su valor no es un origen bien formado
  (esquema `http` o `https`, host y puerto opcional; sin ruta, barra final, consulta ni
  fragmento): no arranca y nombra la variable. No exige `https`. Motivo: D-9 y D-16.
  Dependen: RF-9, RF-14, los casos límite del origen público y CF-16.
- S-4. La 010 supone que la spec 001 establece que, SI al arrancar MongoDB no está
  disponible, ENTONCES el servidor no arranca, muestra un mensaje en español que lo
  indica y el proceso termina, en un tiempo acotado que el plan toma de la versión final
  de la 001 (si la 001 no lo acota, el supuesto no se cumple: D-30). Motivo: D-7.
  Dependen: la definición "Proceso estable", RF-17 (que solo añade el comportamiento del
  gestor), el caso límite de MongoDB no disponible al arrancar y CF-7.
- S-5. La 010 supone que la spec 001 limita su RF-7 ("todo error en JSON") a las rutas de
  la API, porque la entrega de la aplicación en una ruta de la interfaz (incluido un
  archivo inexistente) no es un error de la API. Motivo: sección 5.5 de la referencia, que
  pasa al plan de esta spec. Dependen: RF-2, RF-4, RF-20, el caso límite del archivo
  inexistente y CF-1.
- S-6. La 010 supone que la spec 004 (RNF-4) hace opcionales en desarrollo las claves de
  las fuentes externas (en la versión de la rama `cony`, Riot y FACEIT, más las que su
  versión final añada al cerrar sus dudas sobre Leetify y Steam), y que sin la clave de una
  fuente vincular y resincronizar cuentas de ese juego responden "Fuente no disponible"
  (su RF-17). Motivo: D-2. Dependen: HU-2, RF-9, el caso límite del evaluador sin claves y
  CF-12.
- S-7. La 010 supone que las specs 002 (RF-8, RNF-5), 004 (RF-23, RNF-6) y 007 (RF-17)
  finalizadas concilian la vuelta desde Steam con la cookie SameSite=Strict, de modo que
  la vuelta funciona con el origen público (S-10) sin relajar la cookie ni el comprobante
  anti-CSRF fuera de lo que esas specs hayan decidido. Motivo: D-12 y D-21. Quien
  implemente comprueba tras el merge cómo lo resolvieron y si cambia algo de lo que esta
  spec da por hecho (en particular el atributo SameSite de la cookie, que figura en "Notas
  para el plan"). Opciones identificadas en la clarificación de la 010, solo como
  referencia para la comprobación: (1) mantener Strict y que la interfaz, ya en el mismo
  sitio, reenvíe la respuesta de Steam con una operación protegida normal; (2) pasar la
  cookie a SameSite=Lax, protegiendo la vuelta por otra vía (contradice la spec 004,
  RNF-6, en la versión de la rama `cony`); (3) mantener Strict y guardar el resultado de
  Steam ligado a un valor de un solo uso que la interfaz confirma después con una
  operación protegida. Dependen: RF-14, el caso límite de la vuelta desde Steam y CF-16.
- S-8. La 010 supone que la spec 004 finalizada (RNF-4 y, según cómo lo resuelva, la spec
  007) cierra la duda sobre si los términos de Riot permiten usar la clave de desarrollo
  en la aplicación desplegada y, si no lo permiten (D-5), fija cómo queda LoL sin fuente en
  el servidor, dado que la versión de la rama `cony` de la 004 (RNF-4) hace obligatorias en
  producción las claves de las fuentes. Motivo: D-5, D-13 y D-21. Quien implemente
  comprueba tras el merge qué caso de RF-12 aplica y cómo se configura. Opciones
  identificadas, solo como referencia: (1) clave de Riot opcional también en producción;
  (2) mantenerla obligatoria con un valor que Riot rechaza, lo que produce "Fuente no
  disponible"; (3) desactivar LoL en el servidor con un mensaje propio (RF nuevo en la 004
  y cambio en la 007). Dependen: RF-12, CF-14 y S-11 (a).
- S-9. La 010 supone que la spec 001 establece que, SI al arrancar el puerto en que debe
  escuchar está ocupado, ENTONCES el servidor no arranca, muestra un mensaje en español
  que nombra ese puerto y el proceso termina. Motivo: D-7 y el alcance de la propia 001,
  que deja a la 010 solo servir la interfaz y desplegar (antes RF-16 de esta spec).
  Dependen: la definición "Proceso estable", el caso límite del puerto ocupado, RF-17 y
  CF-7.
- S-10. La 010 supone que la spec 004 (RF-23) construye, en desarrollo y en producción, la
  dirección a la que Steam devuelve al jugador tras iniciar sesión con el origen público
  (S-3), nunca con datos de la petición. Motivo: D-9 y D-16. Dependen: la definición de
  origen público, RF-14, el caso límite de la vuelta desde Steam y CF-16.
- S-11. La 010 supone que la spec 001: (a) define qué variables son obligatorias en
  producción, al menos la ubicación de MongoDB y el nombre de la base, la variable de
  puerto (D-16; si falta, no arranca y nombra la variable, sin usar 3001 por defecto, D-27)
  y el origen público (S-3), además del secreto de firma (spec 002, RF-17) y las claves de
  las fuentes (spec 004, RNF-4, salvo lo que resulte de S-8); en la versión de la rama
  `cony` su definición de "variable obligatoria" solo cubre desarrollo y prueba; (b)
  incluye un criterio de finalización (prueba automática o comprobación a mano) para cada
  comportamiento de arranque de S-1, S-3, S-4, S-9 y la parte (a). Motivo: D-3, D-7, D-9 y
  D-27. Dependen: RF-9, RF-11 (paso 5), RNF-6 y el caso límite de la variable de puerto.
- S-12. (Retirado por D-18: la 010 no supone nada nuevo de la spec 007; que la versión
  desplegada no use el modo simulado es un paso del procedimiento, RF-5. Solo
  constancia.)
- S-13. (Retirado por D-22: qué responde el servidor sin la interfaz compilada queda fuera
  del alcance de la 010 y corresponde a la spec 001. Solo constancia.)
- S-14. La 010 supone que, como en el entorno de prueba el origen público no es
  obligatorio (D-24), si las pruebas de la vuelta desde Steam de la spec 004 (RF-23)
  necesitan un origen público, la propia spec 004 finalizada lo define; la 010 no lo fija
  ni pide cambios a la 004. Quien implemente lo comprueba tras el merge. Motivo: D-24 y
  D-28. Dependen: RF-14, el caso límite del entorno de prueba sin origen público y CF-16.

## Decisiones tomadas (resumen de la clarificación)
- D-1. HTTPS lo atiende un intermediario del servidor del curso en el puerto 7041 y reenvía
  por HTTP al puerto interno; la cookie es siempre Secure en producción; T23 sin efecto.
- D-2. Claves de Riot y FACEIT opcionales en desarrollo; README para macOS y Linux, con Node
  ≥ 22.18 y MongoDB local ya instalados, y con cómo obtener las claves.
- D-3. Variables de la base de prueba obligatorias solo en prueba; las pruebas nunca se
  ejecutan en el servidor del curso.
- D-4. Una sola base, la propia del equipo; si tiene datos ajenos o no admite índices, el
  despliegue se detiene sin escribir (cómo y cuándo se comprueba: D-19).
- D-5. Si los términos de Riot no permiten la clave de desarrollo, LoL queda sin fuente en el
  servidor y se demuestra en local; la duda de fondo es de la spec 004 (configuración:
  D-13 y S-8).
- D-6. El gestor reinicia el proceso si se cae, sin guardar la lista de procesos; tras un
  reinicio de la máquina se levanta a mano; vuelve a responder en 60 segundos como máximo;
  desplegada hasta la evaluación del Hito 2.
- D-7. MongoDB no disponible, puerto ocupado, proceso existente y Node antiguo: RF-11 y
  RF-17 (el puerto ocupado y el mensaje de MongoDB son de la spec 001: supuestos S-9 y
  S-4; RF-16 quedó sin efecto y remite a S-9).
- D-8. Datos personales en el MongoDB compartido: limitación reconocida, en tensión con el
  principio 5, advertida en el README (ver también D-20).
- D-9. Origen público como variable obligatoria de producción (RF-14); D-16 la extiende a
  desarrollo.
- D-10. El enunciado del Hito 2 y la parte 6 del Laboratorio 5 los agrega el usuario:
  condición previa al plan.
- D-11. `/API/...` es ruta de la API; recargar tras un redespliegue carga la versión nueva;
  un solo responsable por despliegue y vuelta atrás subiendo la versión anterior.
- D-12. Vuelta desde Steam frente a la cookie SameSite=Strict: decisión del usuario, "que lo
  decida el equipo de 004". La deciden las specs 002, 004 y 007 en sus versiones finales,
  ya terminadas en otras ramas; la 010 no la resuelve: supone que está resuelta (S-7) y
  quien implemente comprueba tras el merge cómo se resolvió (D-21, D-29).
- D-13. Clave de Riot obligatoria en producción frente a D-5: decisión del usuario, "que lo
  decida el equipo 004". La deciden las specs 004 y 007 en sus versiones finales, ya
  terminadas en otras ramas; la 010 no la resuelve: supone que está resuelta (S-8) y quien
  implemente comprueba tras el merge cómo se resolvió (D-21, D-29).
- D-14. Con todas las specs fusionadas y antes de redactar el `plan.md` de la 010, se
  comprueba cada supuesto vigente (S-1, S-3 a S-11 y S-14) y las referencias a RF de las
  specs 001, 002, 004 y 007 contra sus versiones finales. Si alguno no se cumple o choca,
  se para y se resuelve con el usuario antes del plan; no se implementa sobre un supuesto
  falso (ver "Contexto y objetivo"). Retirados: S-2 (D-16), S-12 (D-18) y S-13 (D-22).
  Reformulada por D-29.
- D-15. El reintento limitado del gestor (RF-17) cuenta solo los fallos al arrancar
  consecutivos, cubre MongoDB no disponible y puerto ocupado, y tiene un criterio propio
  (CF-7) comprobado a mano en el servidor del curso; una caída después de quedar estable
  se reinicia siempre (RF-19, CF-6). Ver D-17.
- D-16. (P-1) Puerto y origen público. Puerto: una sola variable de puerto, la de la spec
  001; en el servidor del curso vale el puerto interno al que reenvía el intermediario
  HTTPS y en local, 3001. Se retira S-2. Origen público: obligatorio en desarrollo y en
  producción; vale `https://fullstack.dcc.uchile.cl:7041` en el servidor del curso,
  `http://localhost:<puerto local>` en la construcción de producción local y el origen de
  la interfaz en desarrollo; se aceptan `http` y `https`, así que el servidor no exige
  `https`.
- D-17. (P-2) MongoDB y reintentos. Si MongoDB cae con la aplicación en marcha, el proceso
  sigue, las peticiones que necesitan la base responden 500 "error interno del servidor"
  (spec 001, RF-6) y la aplicación se recupera sola cuando MongoDB vuelve, sin supuesto
  nuevo sobre otras specs (RF-21). Para el límite de reintentos solo cuentan los fallos
  consecutivos al arrancar (un proceso que no llega a estar estable); una caída después de funcionar con
  normalidad reinicia siempre (RF-19); el mismo límite cubre el puerto ocupado (S-9), con
  lo que se acaba el bucle (RF-17).
- D-18. (P-3) Interfaz en producción. No se añade S-12 ni se supone nada nuevo de la spec
  007. La regla pasa al procedimiento de despliegue: la versión que se despliega en el servidor
  del curso se compila con el modo simulado desactivado y con la dirección de la API
  apuntando al origen público (RF-5; RF-11, paso 3), aprovechando que la 007 deja el modo
  simulado como opcional. Contrapartida aceptada: la garantía depende de seguir el
  procedimiento; CF-19 lo detecta.
- D-19. (P-4) La comprobación de RF-18 la hace a mano el responsable del despliegue en el
  paso 7 de RF-11 y solo en el primer despliegue, revisando las colecciones existentes y
  los permisos del usuario de MongoDB, sin crear índices ni colecciones. Las
  actualizaciones no la repiten.
- D-20. (P-5) Se aceptan como limitación reconocida la suplantación de jugadores con el
  secreto de firma y la modificación o el borrado de la base por otros grupos. Se
  advierten en el README (RF-9) y se repite al curso la petición de un usuario de MongoDB
  propio. Queda en tensión explícita con el principio 5 de la constitución, igual que
  D-8.
- D-21. (P-6) D-12 y D-13 corresponden a las specs afectadas; en palabras del usuario: "si
  eso depende de las otras specs, cosa de ellos, confia en que lo van a arreglar". Esas
  specs (002, 004 y 007) ya están terminadas en otras ramas y lo deciden sus versiones
  finales; la 010 no fija cómo lo resolvieron: deja S-7 y S-8 como supuestos que quien
  implemente comprueba tras el merge (D-29).
- D-22. (P-7) Las rutas de la interfaz sin interfaz compilada (en desarrollo, o en
  producción sin compilación) quedan fuera del alcance de la 010, que solo cubre
  producción con la interfaz compilada, que su procedimiento siempre genera; el resto
  corresponde a la spec 001. Se retira S-13. RF-2, RF-4 y RF-20 llevan la condición "con
  la interfaz compilada".
- D-23. (P-8) La URL desplegada debe ser accesible desde internet pública (definición
  "Accesible", RF-8, CF-3). Condición previa al plan: que el curso confirme que el servidor
  acepta conexiones externas.
- D-24. El origen público no es obligatorio en el entorno de prueba; solo lo es en
  desarrollo y en producción (definición "Origen público", RF-9, RF-14, S-3, caso límite
  y CF-16).
- D-25. Confirmado por el usuario: la construcción de producción local se compila igual
  que en el servidor, con el modo simulado desactivado y la dirección de la API apuntando
  al origen público local (`http://localhost:3001`); CF-1 exige que no aparezca "Datos de
  demostración" y RF-9 (README) explica cómo hacerlo. Ya se seguía de CF-1 y D-18.
- D-26. Recuperación de RF-21: como máximo 60 segundos después de que MongoDB vuelva a
  estar disponible, las peticiones que necesitan la base responden con éxito sin
  reiniciar el proceso (RF-21, caso límite y CF-20).
- D-27. La variable de puerto es obligatoria en producción: si falta, el servidor no
  arranca y nombra la variable, sin usar 3001 por defecto. Lo recoge S-11 (a), que lo
  explicita; también RF-9 y un caso límite.
- D-28. (P-9) Decisión del usuario: no cambiar la spec 004. En el entorno de prueba el
  origen público no es obligatorio (D-24); si las pruebas de la vuelta desde Steam de la
  spec 004 lo necesitan, deben definirlo ellas. Queda como supuesto (S-14) que quien
  implemente comprueba tras el merge.
- D-29. Reencuadre de dependencias, decisión del usuario ("dale, hazlo así"). Contexto, en
  sus palabras: "la 004 ya termino su review, el tema es que en otra branch… si se que al
  final una persona se va a dedicar a implementar las specs, y tendra acceso a todas las
  specs mergeadas" y "ahora no tengo acceso a las specs finalizadas, pero el equipo de
  implementación si tendra". Consecuencias: (1) la sección "Cambios requeridos en otras
  specs" pasa a ser "Supuestos sobre otras specs (a verificar tras el merge)"; cada C-x
  vigente pasa a ser S-x con el mismo número, y los retirados quedan como constancia; (2)
  la 010 ya no queda bloqueada esperando cambios en otras specs: con todas las specs
  fusionadas y antes de redactar su `plan.md`, se comprueba cada supuesto y cada
  referencia a RF de las specs 001, 002, 004 y 007 contra las versiones finales; si alguno
  no se cumple o choca, se para y se resuelve con el usuario antes del plan (D-14). No
  cambia ningún requisito de comportamiento ni ninguna decisión D-1 a D-28.
- D-30. Regla tras el merge, aprobada por el usuario ("dale"): si una referencia a un RF de
  otra spec solo cambió de número y el requisito dice lo mismo, el planner corrige la
  referencia en la 010 e informa al usuario, sin una aprobación aparte; si cambió el
  contenido, o un supuesto no se cumple o choca, se para y se lleva al usuario para que
  decida antes del plan (advertencia de "Contexto y objetivo" y "Supuestos sobre otras
  specs").
- D-31. (P-10) Decisión del usuario: opción A, "En servidor, solo config propia". CF-7 se
  comprueba en el servidor del curso tocando solo el archivo de variables de producción y
  el proceso propios: para MongoDB no disponible, se apunta la ubicación de MongoDB a una
  dirección en la que no responde nada y se reinicia solo el proceso del equipo; para el
  puerto ocupado, con el proceso del equipo parado, un proceso temporal del equipo ocupa
  el puerto interno y se levanta el proceso del equipo. En ambos casos se restaura todo
  después y la aplicación vuelve a responder, como parte del propio criterio. Nunca se
  toca el MongoDB compartido ni ningún proceso ajeno (RNF-5), y se hace fuera de una
  evaluación porque la URL desplegada cae unos minutos. El README describe la comprobación
  (RF-11). No cambia ningún requisito de comportamiento.

## Notas para el plan (no son requisitos)
Detalles de implementación ya decididos que no van en la spec y pasan a `plan.md`:
- Enunciado del Hito 2 en `HITO2.md` (raíz del repositorio); el archivo de variables de
  producción es el `.env` de la carpeta del equipo; la comprobación de CF-18 incluye
  `git status`.
- Carpeta del equipo en el servidor: `teammatchup`; proceso del gestor (PM2):
  `teammatchup-7041`, según la regla `<carpeta>-<puerto>` del curso (nombres elegidos por el
  coordinador como decisión menor).
- Dirección de escucha en el servidor del curso: `0.0.0.0`.
- Base propia: `teammatchup_7041` (única; sin base común ni prefijo de colecciones).
- Puerto: el nombre de la variable es el de la spec 001; en el servidor del curso su valor
  es el puerto interno (dónde se consulta, en el plan) y en local, 3001. Origen público
  local: `http://localhost:3001`; en desarrollo, el origen del servidor de desarrollo de
  la interfaz.
- Variables de la interfaz para RF-5: el plan usa el mecanismo que defina la spec 007
  finalizada (RF-1) para desactivar el modo simulado y apuntar la dirección de la API al
  origen público (`https://fullstack.dcc.uchile.cl:7041` en el servidor del curso;
  `http://localhost:3001` en la construcción de producción local). Solo como dato: en el
  código actual (`frontend/src/config/env.ts` y `frontend/src/services/api.ts`) el modo
  simulado se usa si `VITE_API_URL` está vacía, mientras que la 007 de la rama `cony`
  (RF-1) lo activa de forma explícita; manda la 007 finalizada.
- Fallos al arrancar y caídas en el gestor (RF-17, RF-19): el tiempo mínimo para
  considerar estable el proceso y el número máximo de fallos al arrancar consecutivos se
  fijan en el plan (en PM2, `min_uptime` y `max_restarts`, que cuenta solo los reinicios
  inestables). `min_uptime` debe ser mayor que el tiempo máximo que tarda el proceso en
  terminar con MongoDB no disponible o el puerto ocupado (S-4, S-9), tomado de la spec 001
  finalizada (por ejemplo, su tiempo de espera de conexión a MongoDB).
- Comprobación de CF-7 (D-31), con órdenes que nombran siempre `teammatchup-7041`:
  - antes de cambiar nada, copiar el `.env` de la carpeta `teammatchup` (por ejemplo, a
    `.env.cf7`, también fuera del repositorio) para restaurarlo después;
  - MongoDB no disponible: en el `.env`, apuntar la ubicación de MongoDB a una dirección
    local con un puerto en el que no escucha nada (por ejemplo,
    `mongodb://127.0.0.1:<puerto sin uso>`), de modo que la conexión se rechace dentro del
    tiempo acotado de S-4; `pm2 restart teammatchup-7041`; comprobar con
    `pm2 describe teammatchup-7041` y `pm2 logs teammatchup-7041` el mensaje y que el
    proceso queda en estado de error tras `max_restarts`; restaurar el `.env` desde la copia
    y `pm2 restart teammatchup-7041`;
  - puerto ocupado: `pm2 stop teammatchup-7041`; levantar un proceso temporal del equipo
    que escuche en el puerto interno (por ejemplo, un `node -e` con un servidor HTTP
    mínimo, fuera de PM2, para que toda orden al gestor siga nombrando solo
    `teammatchup-7041`); `pm2 restart
    teammatchup-7041`; comprobar igual que antes; parar el proceso temporal y
    `pm2 restart teammatchup-7041`;
  - al terminar: comparar el `.env` con la copia, comprobar que el puerto interno lo usa
    solo `teammatchup-7041`, borrar la copia y abrir la URL desplegada. Las órdenes
    exactas se fijan en el plan.
- Construcción y arranque: scripts `build:ui` y `start` de la sección 5.2 de la referencia;
  el entorno de producción lo fija el comando de arranque, no el archivo de variables.
- Generación del secreto de firma: la de la sección 5.3 de la referencia.
- Cookie con SameSite=Strict (spec 002, RF-8), salvo lo que hayan resuelto las specs
  finalizadas sobre la vuelta desde Steam (se comprueba con S-7 antes del plan), y sin
  paquete de CORS (sección 2 de la referencia).
- Antes de redactar este plan: comprobar los supuestos S-1, S-3 a S-11 y S-14, y las
  referencias a RF de las specs 001, 002, 004 y 007, contra las versiones fusionadas
  (D-14, D-29).
- Entrega de la aplicación en las rutas de la interfaz: fallback de la sección 5.5 de la
  referencia, después de los archivos compilados y de las rutas de la API y antes del 404;
  la comparación del prefijo `/api` no distingue mayúsculas.
- Cómo se evita que el navegador guarde en caché una versión antigua de la aplicación
  (RF-15), las órdenes para revisar a mano las colecciones existentes y los permisos del
  usuario de MongoDB (RF-18), las órdenes de comprobación de Node y del proceso existente
  (RF-11), cómo se anota la versión desplegada (RF-11, paso 3) y cómo se comprueba que la
  lista guardada del gestor no cambia (RNF-5): se fijan en el plan.
