# Spec 001 — Crear el backend: servidor base, configuración y errores
Estado: borrador

## Contexto y objetivo
Hoy la interfaz funciona contra un backend simulado en el navegador y no existe ningún
servidor. El enunciado del Hito 2 exige un servidor propio en TypeScript con Express y
Mongoose sobre MongoDB (sin json-server), que todo error responda JSON con el código HTTP
del caso y que los secretos vivan en un archivo de variables no subido, con un archivo de
ejemplo en el repositorio.

Esta es la primera de diez specs que dividen la spec 001 original. Su objetivo es dejar
un servidor que arranca con la configuración del entorno, usa una base de datos de
desarrollo y otra de prueba, responde todo error con el mismo formato y se verifica con un
único comando de pruebas. Todavía no expone recursos: las specs 002 a 006 los agregan
sobre esta base.

- Origen: HU-14 y la parte general de la tabla de errores (sección 5.7) de la spec original.
- Las decisiones técnicas ya tomadas por el equipo (secciones 2, 4.2 —RT-01 a RT-06,
  RT-13, RT-17, RT-18, RT-20—, 5.1, 5.2, 5.3, 5.5, 5.7, 8 y 10) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
- Decisión del usuario que prevalece sobre la referencia (RT-05): el nombre de la base se
  toma de `MONGODB_DBNAME` y, en prueba, de `TEST_MONGODB_DBNAME` (como en el enunciado del
  curso), no de `MONGODB_DB_NAME` / `TEST_MONGODB_DB_NAME`. Se agrega además `HOST`
  (RF-10).

## Usuarios
- Integrantes del equipo, que construyen las specs siguientes sobre esta base.
- Quien evalúa el Hito 2, que revisa el repositorio y la ejecución de las pruebas.

## Historias de usuario
- HU-1. Como integrante del equipo, quiero que un solo comando ejecute todas las pruebas
  automáticas contra una base de datos de prueba para verificar el servidor sin tocar los
  datos de desarrollo.
- HU-2. Como integrante del equipo, quiero que el servidor se niegue a arrancar si falta
  configuración obligatoria para detectar el problema al inicio y no en medio de una petición.
- HU-3. Como equipo evaluado, queremos que los secretos no estén en el repositorio y que
  haya un archivo de ejemplo con los nombres de las variables para que cualquiera levante
  el proyecto sin exponerlos.
- HU-4. Como cliente del servidor (la interfaz), quiero que todo error llegue en el mismo
  formato JSON y con el código HTTP del caso para mostrar el mensaje sin casos especiales.

## Definiciones
- **Variable obligatoria**: en esta spec, el puerto, la ubicación de la base de datos y el
  nombre de la base, para desarrollo y para prueba. La spec 002 agrega el secreto de firma
  y la spec 004 las claves de las fuentes externas.
- **Dirección de escucha**: interfaz de red en la que el servidor acepta conexiones
  (ej. `0.0.0.0` en el servidor del curso). Es opcional.
- **Respuesta de error**: cuerpo JSON con un único campo de texto que contiene el mensaje
  en español. El nombre del campo se fija en el plan.
- **Entorno**: desarrollo, prueba o producción.

## Requisitos funcionales
- RF-1: EL SISTEMA lee el puerto y los datos de conexión a la base de datos desde variables
  de entorno, nunca desde valores escritos en el código.
- RF-2: SI al arrancar falta una variable obligatoria o está vacía, ENTONCES EL SISTEMA no
  arranca y muestra un mensaje en español que nombra la variable faltante.
- RF-3: MIENTRAS el entorno es de prueba, EL SISTEMA usa una base de datos distinta de la
  de desarrollo, definida por sus propias variables.
- RF-4: CUANDO llega una petición a una ruta de la API que no existe, EL SISTEMA responde
  404 con la respuesta de error "endpoint desconocido".
- RF-5: SI el cuerpo de una petición no es JSON válido, ENTONCES EL SISTEMA responde 400 con
  la respuesta de error "JSON mal formado".
- RF-6: SI ocurre un error no previsto, ENTONCES EL SISTEMA responde 500 con la respuesta de
  error "error interno del servidor", sin traza, consulta ni mensaje original, y deja el
  detalle solo en el registro del servidor.
- RF-7: EL SISTEMA responde todo error con una respuesta de error en JSON; nunca con HTML ni
  con un cuerpo vacío.
- RF-8: EL SISTEMA ofrece un único comando que ejecuta en serie todas sus pruebas
  automáticas contra la base de prueba.
- RF-9: EL SISTEMA incluye en el repositorio un archivo de ejemplo con el nombre de cada
  variable de entorno del servidor y sin valores secretos; el archivo real de variables
  queda excluido del control de versiones.
- RF-10: CUANDO la dirección de escucha está definida en el entorno, EL SISTEMA escucha en
  esa dirección; si no está definida, usa la predeterminada del entorno de ejecución.

## Requisitos no funcionales
- RNF-1: En el entorno de prueba el servidor no escribe registros en la salida, para que el
  resultado de las pruebas se lea limpio.
- RNF-2: Comprobación de tipos y pruebas en verde, sin `any` ni `@ts-ignore`
  (constitución, principio 4; `AGENTS.md`).
- RNF-3: Mensajes de error en español (constitución, principio 6).

## Casos límite
- Variable presente pero vacía: se trata como faltante (RF-2).
- Petición con JSON mal formado a una ruta inexistente: responde 400 (RF-5), porque el
  cuerpo se interpreta antes de buscar la ruta.
- Rutas que no pertenecen a la API (las de la interfaz): no las atiende esta spec; la
  spec 010 define cómo se sirven en producción.
- Ejecutar las pruebas no crea, modifica ni borra datos en la base de desarrollo.

## Fuera de alcance
- Usuarios, autenticación y cualquier recurso (specs 002 a 006).
- Servir la interfaz desde el servidor y el despliegue (spec 010).
- Variables de entorno de la interfaz (spec 007).

## Criterios de finalización
- [ ] Arrancar sin cada una de las variables obligatorias falla con un mensaje que la nombra.
- [ ] Arrancar con la dirección de escucha definida y sin definir funciona en ambos casos
      (RF-10).
- [ ] RF-4 a RF-7 tienen al menos una prueba automática cada uno, y están en verde.
- [ ] El comando de pruebas termina en verde y la base de desarrollo queda igual que antes
      de ejecutarlo.
- [ ] La comprobación de tipos termina en verde.
- [ ] El archivo de ejemplo existe y `git check-ignore` confirma que el archivo real de
      variables está ignorado.

## Dudas abiertas
- Ninguna.
