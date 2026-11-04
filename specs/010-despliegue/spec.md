# Spec 010 — Producción, despliegue y documentación
Estado: borrador

## Contexto y objetivo
El enunciado del Hito 2 exige un repositorio público con `frontend/` y `backend/`, la
aplicación desplegada en el servidor del curso y un `README.md` que indique las variables
de entorno, cómo ejecutarla en local y la URL desplegada. En producción la interfaz y la
API se sirven desde el mismo origen, lo que mantiene la cookie de sesión con
SameSite=Strict y evita abrir el servidor a otros orígenes.

Esta spec cierra el hito: construcción de producción, despliegue y documentación.

- Depende de: specs 001 a 009.
- Origen: tareas T22 a T24 y puntos de la sección 12 (repositorio, recarga de rutas,
  README) de la spec original; requisito "Repositorio" del enunciado del Hito 2;
  procedimiento de despliegue de la parte 6 del enunciado del Laboratorio 5 del curso,
  facilitado por el usuario.
- Las decisiones técnicas ya tomadas (sección 2 —CORS y puerto—, RT-14, secciones 5.2
  —`build:ui` y `start`—, 5.5 —archivos estáticos y fallback de la interfaz— y 10) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
- Prevalece sobre la referencia: las variables `MONGODB_DBNAME` y `HOST` de la spec 001 y
  el puerto 7041 asignado al equipo en el servidor del curso.

### Entorno del servidor del curso
- URL: `https://fullstack.dcc.uchile.cl:7041/`. El servidor sirve HTTPS (confirmado por el
  usuario).
- Acceso por SSH en el puerto 219 con un usuario del sistema compartido por todos los
  grupos (`<usuario>` / `<contraseña>`; las credenciales reales están fuera del repositorio
  y no se escriben en ningún archivo del proyecto).
- Carpeta del equipo en el servidor: `teammatchup`; proceso del gestor de procesos del
  servidor (PM2): `teammatchup-7041`, según la regla `<carpeta>-<puerto>` del curso
  (nombres elegidos por el coordinador como decisión menor).
- MongoDB del servidor es compartido entre grupos. Decisión del usuario: base propia
  `teammatchup_7041`; si el usuario de MongoDB no tiene permiso para crearla, se usa la
  base `fullstack` con el prefijo `tmu_` en todas las colecciones.

## Usuarios
- Jugador que entra a la aplicación desplegada.
- Quien evalúa el Hito 2 y debe poder ejecutarla en local siguiendo el README.
- Integrantes del equipo que despliegan y preparan cada demostración.

## Historias de usuario
- HU-1. Como jugador, quiero entrar a la aplicación desde una URL pública y que recargar
  cualquier página la vuelva a cargar.
- HU-2. Como evaluador, quiero seguir el README para levantar la aplicación en local sin
  pedir ayuda al equipo.
- HU-3. Como integrante del equipo, quiero un procedimiento escrito para desplegar y
  actualizar la aplicación sin afectar a los procesos de otros grupos.
- HU-4. Como integrante del equipo, quiero saber cómo renovar la clave de Riot antes de una
  demostración y qué pasa si caduca.

## Definiciones
- **Construcción de producción**: la interfaz compilada servida por el mismo servidor que
  atiende la API.
- **Ruta de la interfaz**: cualquier ruta que no pertenece a la API (ej. `/perfil`).
- **Archivo de variables de producción**: el archivo de variables de entorno creado a mano
  en la carpeta del equipo en el servidor del curso; nunca se sube al repositorio.

## Requisitos funcionales
- RF-1: MIENTRAS corre la construcción de producción, EL SISTEMA sirve la interfaz y la API
  desde el mismo origen y puerto, tomado del entorno.
- RF-2: CUANDO se pide directamente o se recarga una ruta de la interfaz, EL SISTEMA entrega
  la aplicación y esta muestra la vista de esa ruta.
- RF-3: CUANDO se pide una ruta de la API que no existe, EL SISTEMA sigue respondiendo 404
  con la respuesta de error de la spec 001 (RF-4), no la aplicación.
- RF-4: MIENTRAS corre en producción, EL SISTEMA marca siempre la cookie de sesión como
  Secure (spec 002, RNF-2).
- RF-5: EL SISTEMA queda desplegado en el servidor del curso y accesible en
  `https://fullstack.dcc.uchile.cl:7041/`, la URL publicada en el README.
- RF-6: MIENTRAS corre en el servidor del curso, EL SISTEMA escucha en el puerto 7041 y en
  la dirección `0.0.0.0`, tomados del archivo de variables de producción, y guarda sus datos
  en la base `teammatchup_7041` o, si no puede crearse, en la base `fullstack` con el
  prefijo `tmu_` en todas sus colecciones.
- RF-7: EL README raíz indica las variables de entorno de servidor e interfaz (incluidas las
  claves de las fuentes externas de la spec 004, sin valores), los requisitos previos,
  cómo levantar la aplicación en local (desarrollo y pruebas) y la URL desplegada.
- RF-8: EL README de la interfaz lista las operaciones de la API que consume tal como quedan
  tras las specs 002 a 009.
- RF-9: EL README documenta el procedimiento de despliegue en el servidor del curso:
  compilar interfaz y servidor; subir la carpeta del servidor por SSH en el puerto 219 a la
  carpeta `teammatchup`; crear allí el archivo de variables de producción con la ubicación
  de MongoDB, el nombre de la base, el puerto 7041, la dirección `0.0.0.0`, el secreto de
  firma y las claves de las fuentes; instalar dependencias; levantar el proceso
  `teammatchup-7041` y guardar la lista de procesos; reiniciar solo ese proceso tras subir
  cambios. Usa marcadores (`<usuario>`, `<contraseña>`) en lugar de credenciales.
- RF-10: EL README documenta cómo obtener y renovar la clave de desarrollo de Riot (caduca
  cada 24 horas), dónde reemplazarla en el servidor del curso, que hay que reiniciar el
  proceso para que la tome y que mientras está caducada vincular y resincronizar cuentas
  LoL responden "Fuente no disponible, inténtalo más tarde." sin cerrar sesión, y las
  cuentas ya guardadas conservan su último rango.
- RF-11: EL README indica que el servidor no tiene datos de demostración: la base empieza
  vacía y las coincidencias se demuestran con cuentas reales del equipo.

## Requisitos no funcionales
- RNF-1: Ni el archivo real de variables ni los archivos generados por la construcción se
  suben al repositorio (`AGENTS.md`).
- RNF-2: El servidor no acepta peticiones con credenciales desde otros orígenes.
- RNF-3: El README está en español.
- RNF-4: Ningún archivo del repositorio contiene credenciales del servidor del curso, de
  MongoDB ni de las fuentes externas.
- RNF-5: El despliegue no detiene, reinicia ni modifica procesos, carpetas ni bases de otros
  grupos.

## Casos límite
- Recargar una ruta protegida sin sesión en producción: carga la aplicación y esta lleva a
  login (spec 007).
- Pedir un archivo inexistente fuera de la API (ej. `/logo-viejo.png`): entrega la
  aplicación, como cualquier ruta de la interfaz (decisión de la sección 5.5 de la referencia).
- El usuario de MongoDB no puede crear `teammatchup_7041`: se usa `fullstack` con el prefijo
  `tmu_` (RF-6) y ninguna colección sin prefijo queda escrita en `fullstack`.
- Limitación reconocida del entorno, sin arreglo desde el proyecto: como el usuario del
  sistema es compartido por todos los grupos, el archivo de variables de producción (secreto
  de firma, claves de Riot y FACEIT, ubicación de MongoDB) es legible por otros grupos.
- Clave de Riot caducada durante una evaluación: se aplica RF-10; el resto de la aplicación
  sigue funcionando.

## Fuera de alcance
- Integración continua y despliegue automático.
- Dominio propio o certificados.
- Monitoreo y respaldos de la base de datos.
- Aislar los secretos de producción de otros grupos en el servidor del curso.
- Renovación automática de la clave de Riot.

## Criterios de finalización
- [ ] En local, la construcción de producción responde la interfaz y la API en el mismo
      puerto, y recargar `/perfil` carga la aplicación.
- [ ] Una ruta de API inexistente responde 404 en JSON en producción.
- [ ] En `https://fullstack.dcc.uchile.cl:7041/` se completa: registro, inicio de sesión
      (la cookie llega con Secure), recarga y cierre de sesión.
- [ ] El proceso `teammatchup-7041` aparece en la lista guardada del gestor de procesos y
      la aplicación vuelve a responder tras reiniciarlo.
- [ ] Una persona que no participó en el despliegue levanta la aplicación en local siguiendo
      solo el README.
- [ ] `git status` limpio de archivos de variables y de construcción, y una búsqueda en el
      repositorio no encuentra credenciales.

## Dudas abiertas
- [NECESITA ACLARACIÓN] (condición previa al plan, spec 004) Confirmar que los términos de
  Riot permiten usar la clave de desarrollo en la aplicación desplegada para la
  demostración.
