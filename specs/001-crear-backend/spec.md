# Spec 001 — Crear el backend: servidor base, configuración y errores
Estado: implementada

## Contexto y objetivo
Hoy la interfaz funciona contra un backend simulado en el navegador y no existe ningún
servidor. Según la spec original (basada en el enunciado del Hito 2), hace falta un
servidor propio en TypeScript con Express y Mongoose sobre MongoDB (sin json-server), que
todo error responda JSON con el código HTTP del caso y que los secretos vivan en un archivo
de variables no subido, con un archivo de ejemplo en el repositorio.

Esta es la primera de diez specs que dividen la spec 001 original. Su objetivo es dejar
un servidor que arranca con la configuración del entorno, usa una base de datos de
desarrollo y otra de prueba, responde todo error con el mismo formato y se verifica con un
único comando de pruebas y un único comando de lint. Todavía no expone recursos: las
specs 002 a 006 los agregan sobre esta base.

- Origen: HU-14 y la parte general de la tabla de errores (sección 5.7) de la spec original.
- Referencia técnica: `specs/_referencia/001-crear-backend-original.md`. De sus secciones 2,
  4.2 (RT-01 a RT-06, RT-13, RT-17, RT-18, RT-20), 5.1, 5.2, 5.3, 5.5, 5.7, 8 y 10 pasan al
  `plan.md` de esta spec **solo las partes que corresponden a los RF de abajo**
  (configuración, registro, conexión a la base, interpretación del cuerpo JSON, 404,
  manejador de errores, comando de pruebas, lint y archivo de ejemplo). El resto queda
  para las specs siguientes (ver "Fuera de alcance").
- Las dependencias nuevas se justifican en el `plan.md` de esta spec, que forma parte de
  la spec aprobada (constitución, principio 1).
- Decisión del usuario que prevalece sobre la referencia (RT-05): el nombre de la base se
  toma de `MONGODB_DBNAME` y, en prueba, de `TEST_MONGODB_DBNAME`, no de `MONGODB_DB_NAME`
  / `TEST_MONGODB_DB_NAME`. Se agrega además `HOST` (RF-10).
- Nota: `HITO2.md` no está en el repositorio, así que esta spec no se contrastó con el
  enunciado del hito. Los nombres `MONGODB_DBNAME` y `TEST_MONGODB_DBNAME` son decisión
  del usuario.
- Precondición: para ejecutar las pruebas debe haber un servidor MongoDB disponible en la
  ubicación indicada por la configuración de prueba.

## Usuarios
- Integrantes del equipo, que construyen las specs siguientes sobre esta base.
- Quien evalúa el Hito 2, que revisa el repositorio y la ejecución de las pruebas.

## Historias de usuario
- HU-1. Como integrante del equipo, quiero que un solo comando ejecute todas las pruebas
  automáticas contra una base de datos de prueba para verificar el servidor sin tocar los
  datos de desarrollo.
- HU-2. Como integrante del equipo, quiero que el servidor se niegue a arrancar si la
  configuración falta, es inválida o la base no responde, para detectar el problema al
  inicio y no en medio de una petición.
- HU-3. Como equipo evaluado, queremos que los secretos no estén en el repositorio y que
  haya un archivo de ejemplo con los nombres de las variables para que cualquiera levante
  el proyecto sin exponerlos.
- HU-4. Como cliente del servidor (la interfaz), quiero que todo error llegue en el mismo
  formato JSON y con el código HTTP del caso para mostrar el mensaje sin casos especiales.

## Definiciones
- **Entorno**: desarrollo, prueba o producción, según el valor de `NODE_ENV`: `development`,
  `test` o `production`, comparados de forma exacta (sensible a mayúsculas y sin recortar
  espacios). `NODE_ENV` es obligatoria: no hay entorno por defecto. Si falta, está vacía o
  tiene otro valor, el servidor no arranca (RF-2, RF-20).
- **Archivo de variables**: archivo local, no subido al repositorio, del que el servidor
  toma las variables de entorno. Las variables que ya trae el entorno del proceso (por
  ejemplo, las que fija un comando al ejecutarse) prevalecen sobre las del archivo (RF-21).
- **Variable obligatoria**: variable sin la cual el servidor no arranca en un entorno dado,
  según esta matriz (la spec 002 agrega el secreto de firma y la spec 004 las claves de las
  fuentes externas):

  | Variable | Desarrollo | Producción | Prueba |
  | --- | --- | --- | --- |
  | `NODE_ENV` | obligatoria | obligatoria | obligatoria |
  | `PORT` | obligatoria | obligatoria | obligatoria |
  | `MONGODB_URI` | obligatoria | obligatoria | no se exige |
  | `MONGODB_DBNAME` | obligatoria | obligatoria | no se exige |
  | `TEST_MONGODB_URI` | no se exige | no se exige | obligatoria |
  | `TEST_MONGODB_DBNAME` | no se exige | no se exige | obligatoria |
  | `HOST` | opcional | opcional | opcional |

- **Variable vacía**: variable definida cuyo valor está vacío o solo contiene espacios. Se
  trata como no definida.
- **No arrancar**: el proceso termina con un código de salida distinto de 0, escribe el
  mensaje en español en la salida de error y no llega a aceptar conexiones.
- **Dirección de escucha**: interfaz de red en la que el servidor acepta conexiones
  (ej. `0.0.0.0` en el servidor del curso). Se toma de `HOST` y es opcional.
- **Ruta de la API**: toda ruta bajo el prefijo `/api`.
- **Cuerpo JSON**: cuerpo de una petición cuyo tipo de contenido declara JSON. Un cuerpo
  vacío es válido. Un cuerpo JSON válido debe ser un objeto o un arreglo.
- **Codificación no soportada**: el cuerpo llega comprimido con una codificación que el
  servidor no sabe descomprimir, o declara un juego de caracteres que el servidor no sabe
  leer.
- **Respuesta de error**: respuesta con tipo de contenido JSON cuyo cuerpo es exactamente
  `{ "error": "<mensaje>" }`. Los mensajes genéricos van en español, en minúscula y sin
  punto final (como en la tabla 5.7 de la referencia).
- **Registro del servidor**: salida donde el servidor escribe mensajes informativos y de
  error durante su funcionamiento. No incluye el mensaje de "no arrancar" por
  configuración inválida.

## Requisitos funcionales
- RF-1: EL SISTEMA lee el entorno (`NODE_ENV`), el puerto (`PORT`), la dirección de escucha
  (`HOST`) y los datos de conexión a la base de datos (`MONGODB_URI`, `MONGODB_DBNAME`,
  `TEST_MONGODB_URI`, `TEST_MONGODB_DBNAME`) desde variables de entorno, nunca desde
  valores escritos en el código.
- RF-2: SI al arrancar falta o está vacía alguna variable obligatoria del entorno, ENTONCES
  EL SISTEMA no arranca y muestra un mensaje en español que nombra todas las variables
  faltantes, no solo la primera. Si la que falta es `NODE_ENV`, el entorno no puede
  determinarse: el mensaje nombra `NODE_ENV` junto con las demás faltantes que son
  obligatorias en todos los entornos (hoy, `PORT`).
- RF-3: MIENTRAS el entorno es de prueba, EL SISTEMA usa la base indicada por
  `TEST_MONGODB_URI` y `TEST_MONGODB_DBNAME`; en desarrollo y producción usa la indicada
  por `MONGODB_URI` y `MONGODB_DBNAME`.
- RF-4: CUANDO llega una petición, con cualquier método, a una ruta que no existe (sea o no
  de la API), EL SISTEMA responde 404 con la respuesta de error "endpoint desconocido".
- RF-5: SI el cuerpo JSON de una petición no es JSON válido, o es JSON válido pero no es un
  objeto ni un arreglo, ENTONCES EL SISTEMA responde 400 con la respuesta de error
  "JSON mal formado".
- RF-6: SI ocurre un error no previsto, ENTONCES EL SISTEMA responde 500 con la respuesta de
  error "error interno del servidor", sin traza, sin la consulta a la base de datos que lo
  causó y sin el mensaje original, y entrega el detalle del error solo al registro del
  servidor.
- RF-7: EL SISTEMA responde todo error con tipo de contenido JSON y una respuesta de error;
  nunca con HTML ni con un cuerpo vacío. La única excepción son las peticiones HEAD, que
  por definición no llevan cuerpo.
- RF-8: EL SISTEMA ofrece un único comando que ejecuta en serie todas sus pruebas
  automáticas contra la base de prueba, fijando por sí mismo el entorno de prueba
  (`NODE_ENV=test`) aunque el archivo de variables indique otro (RF-21). Van en serie
  porque todas comparten esa base.
- RF-9: EL SISTEMA incluye en el repositorio un archivo de ejemplo con las seis variables
  `NODE_ENV` (con valor `development`), `PORT`, `MONGODB_URI`, `MONGODB_DBNAME`,
  `TEST_MONGODB_URI` y `TEST_MONGODB_DBNAME` con valores locales no secretos (ej. `3001`,
  `mongodb://127.0.0.1:27017` y nombres de base), y `HOST` comentada como opcional; el
  archivo real de variables queda excluido del control de versiones.
- RF-10: CUANDO `HOST` está definida y no vacía, EL SISTEMA escucha en esa dirección; si no
  está definida o está vacía, escucha en todas las interfaces (valor por defecto del
  entorno de ejecución).
- RF-11: SI al arrancar `PORT` no es un número entero entre 1 y 65535, ENTONCES EL SISTEMA no
  arranca y muestra un mensaje en español que nombra `PORT` y el rango aceptado.
- RF-12: SI al arrancar `HOST` no es una dirección válida o no está asignada a la máquina, o
  el puerto ya está en uso, ENTONCES EL SISTEMA no arranca y muestra un mensaje en español
  que indica la dirección y el puerto que no pudo usar.
- RF-13: SI al arrancar el sistema no logra conectarse a la base de datos del entorno dentro
  de un tiempo de espera de conexión de 10 segundos, ENTONCES EL SISTEMA no arranca y
  muestra un mensaje en español que indica que la base no está disponible.
- RF-14: CUANDO el sistema arranca, EL SISTEMA comienza a aceptar peticiones solo después de
  validar la configuración y de conectarse a la base de datos.
- RF-15: SI el entorno es de prueba y `TEST_MONGODB_URI` y `TEST_MONGODB_DBNAME` son iguales
  a `MONGODB_URI` y `MONGODB_DBNAME` respectivamente (ambos pares definidos), ENTONCES
  EL SISTEMA no arranca y muestra un mensaje en español que indica que la base de prueba
  no puede ser la de desarrollo.
- RF-16: SI el cuerpo de una petición supera el tamaño máximo aceptado de 100 kB (102 400
  bytes), ENTONCES EL SISTEMA responde 413 con la respuesta de error "cuerpo demasiado
  grande".
- RF-17: SI el cuerpo de una petición llega con una codificación no soportada, ENTONCES
  EL SISTEMA responde 415 con la respuesta de error "codificación no soportada".
- RF-18: CUANDO el sistema queda escuchando, EL SISTEMA escribe en el registro del servidor
  un mensaje informativo con la dirección y el puerto reales de escucha.
- RF-19: EL SISTEMA ofrece un único comando de lint que revisa el código y las pruebas del
  servidor.
- RF-20: SI al arrancar `NODE_ENV` está definida y no vacía pero su valor no es exactamente
  `development`, `test` ni `production`, ENTONCES EL SISTEMA no arranca y muestra un
  mensaje en español que nombra `NODE_ENV` y los tres valores aceptados.
- RF-21: CUANDO una variable está definida a la vez en el entorno del proceso y en el
  archivo de variables, EL SISTEMA usa el valor del entorno del proceso.

## Requisitos no funcionales
- RNF-1: En el entorno de prueba el servidor no escribe nada en el registro del servidor
  (ni mensajes informativos ni de error), para que el resultado de las pruebas se lea
  limpio. El mensaje de "no arrancar" por configuración inválida queda exento y se
  muestra siempre.
- RNF-2: Comprobación de tipos, pruebas y lint en verde, sin `any`, sin `@ts-ignore` y sin
  ningún `.only` en las pruebas (constitución, principio 4; `AGENTS.md`).
- RNF-3: Mensajes de error en español (constitución, principio 6); los genéricos, en
  minúscula y sin punto final.

## Casos límite
- Variable con valor vacío o solo de espacios: se trata como faltante (RF-2).
- Faltan varias variables obligatorias a la vez: el mensaje las nombra todas (RF-2).
- En prueba no se exigen `MONGODB_URI` ni `MONGODB_DBNAME`, y en desarrollo o producción no
  se exigen las `TEST_` (matriz de Definiciones).
- `NODE_ENV` ausente, vacía o solo de espacios: no arranca y el mensaje la nombra (RF-2).
- `NODE_ENV` con un valor que no coincide exactamente, como `Test`, `TEST`, `prod`,
  `dev` o ` test` (con espacios alrededor): no arranca y el mensaje nombra `NODE_ENV` y
  los valores aceptados (RF-20).
- `NODE_ENV` inválida o ausente: no se evalúan las variables que dependen del entorno
  (las de base de datos), porque no se sabe cuáles exigir.
- El archivo de variables dice `NODE_ENV=development` y el comando de pruebas fija `test`:
  se usa `test` y la base de prueba (RF-8, RF-21).
- El entorno del proceso define una variable vacía y el archivo le da un valor: prevalece
  la del proceso, se trata como vacía y, si es obligatoria, no arranca (RF-2, RF-21).
- No existe el archivo de variables: se usan solo las del entorno del proceso; si falta
  alguna obligatoria, no arranca (RF-2).
- `PORT` con valor `0`, `65536`, `3001.5`, `-1` o `abc`: inválido, no arranca (RF-11).
- `HOST` vacío o solo de espacios: se trata como no definido y escucha en todas las
  interfaces (RF-10).
- La configuración es inválida y además la base no responde: el mensaje es el de la
  configuración, porque se valida antes de intentar conectar (RF-14).
- En prueba con solo `TEST_MONGODB_URI` igual a `MONGODB_URI` pero distinto nombre de base:
  arranca, porque la base es otra (RF-15). Si las variables de desarrollo no están
  definidas, la comparación no aplica.
- Petición con JSON mal formado, cuerpo demasiado grande o codificación no soportada a una
  ruta inexistente: responde 400, 413 o 415 respectivamente, porque el cuerpo se
  interpreta antes de buscar la ruta.
- Cuerpo JSON vacío: se acepta (no es "JSON mal formado").
- Cuerpo de exactamente 102 400 bytes: se acepta; de 102 401 bytes: 413 (RF-16).
- Cuerpo comprimido con una codificación desconocida o que declara un juego de caracteres
  no soportado: 415 (RF-17).
- Cuerpo JSON válido que es un número, un texto, `true` o `null`: 400 "JSON mal formado"
  (RF-5).
- Cuerpo con un tipo de contenido distinto de JSON: no se interpreta como JSON y no
  produce error por sí mismo.
- Rutas que no pertenecen a la API (las de la interfaz): mientras no exista la spec 010,
  también responden 404 "endpoint desconocido" (RF-4); la spec 010 las apartará para
  servir la interfaz.
- Petición HEAD a una ruta inexistente: responde 404 sin cuerpo (RF-7).
- Error ocurrido cuando la respuesta ya empezó a enviarse: no se puede reescribir; el
  detalle se resuelve en el plan.
- Ejecutar las pruebas no crea, modifica ni borra datos en la base de desarrollo.
- Ejecutar el comando de pruebas sin MongoDB disponible: el comando falla (no termina en
  verde).

## Fuera de alcance
- Usuarios, autenticación, cookies y cualquier recurso (specs 002 a 006), incluidas sus
  pruebas.
- Carga de datos de demostración (seed).
- Servir archivos estáticos, el fallback de la interfaz y el despliegue (spec 010).
- Registro de cada petición recibida; solo se registran los errores 500 (RF-6) y el
  arranque (RF-18).
- Comportamiento ante la pérdida de conexión con la base una vez arrancado el servidor
  (reconexión, errores durante la caída).
- Detectar que dos ubicaciones de base escritas de forma distinta apuntan al mismo
  servidor (ej. `localhost` y `127.0.0.1`); RF-15 compara los valores tal como están
  escritos.
- Variables de entorno de la interfaz (spec 007).

## Criterios de finalización
- [ ] En cada entorno, arrancar sin cada una de sus variables obligatorias (y con cada una
      solo de espacios) falla con código de salida distinto de 0 y un mensaje que la
      nombra; sin dos de ellas, el mensaje nombra ambas (RF-2).
- [ ] Arrancar sin `NODE_ENV` falla con un mensaje que la nombra; sin `NODE_ENV` ni `PORT`,
      el mensaje nombra ambas (RF-2).
- [ ] Arrancar con `NODE_ENV` igual a `Test`, `TEST` y `prod` falla con código de salida
      distinto de 0 y un mensaje que nombra `NODE_ENV` y los valores `development`, `test`
      y `production` (RF-20).
- [ ] Con el archivo de variables en `NODE_ENV=development`, el comando de pruebas usa el
      entorno y la base de prueba (RF-8, RF-21).
- [ ] En prueba, arrancar sin `MONGODB_URI` ni `MONGODB_DBNAME` funciona; en desarrollo,
      arrancar sin las variables `TEST_` funciona (matriz de Definiciones).
- [ ] Arrancar con `PORT` igual a `0`, `65536` y `abc` falla con un mensaje que nombra
      `PORT` (RF-11).
- [ ] Arrancar con `HOST` definida, sin definir y vacía funciona, y la dirección real de
      escucha leída del servidor es la de `HOST` o todas las interfaces respectivamente
      (RF-10); con una dirección no asignable o con el puerto ocupado no arranca (RF-12).
- [ ] Arrancar con la base inalcanzable no arranca y muestra el mensaje de base no
      disponible; el proceso termina tras esperar 10 segundos (no antes de 10 s ni después
      de 12 s) (RF-13).
- [ ] En prueba, con la misma ubicación y el mismo nombre de base que desarrollo, el
      servidor no arranca (RF-15).
- [ ] RF-4, RF-5, RF-7, RF-16 y RF-17 tienen al menos una prueba automática cada uno que
      comprueba el código, el tipo de contenido JSON y el cuerpo exacto `{ "error": … }`;
      la de RF-16 envía un cuerpo de 102 401 bytes y comprueba además que uno de 102 400
      bytes no da 413.
- [ ] RF-6 se verifica probando el manejador de errores directamente con un error simulado
      (sin agregar una ruta solo para pruebas): responde 500 con el cuerpo exacto, sin
      traza ni mensaje original, y el detalle llega al registro del servidor.
- [ ] Con el entorno de prueba, el registro del servidor no escribe nada en la salida
      durante las pruebas, mientras que el mensaje de configuración inválida sí aparece
      (RNF-1).
- [ ] El comando de pruebas termina en verde y la cantidad de documentos de cada colección
      de la base de desarrollo es la misma antes y después de ejecutarlo.
- [ ] La comprobación de tipos y el lint (`npm run lint`) terminan en verde.
- [ ] No queda ningún `.only` en las pruebas.
- [ ] El archivo de ejemplo existe con las seis variables (`NODE_ENV=development` entre
      ellas) y `HOST` comentada, y `git check-ignore` confirma que el archivo real de
      variables está ignorado (RF-9).

## Dudas abiertas
Ninguna.
