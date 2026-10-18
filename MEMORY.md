# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-10-18

## Fase actual

Specs 001 (`001-crear-backend`), 002 (`002-autenticacion`) y 003
(`003-usuarios-y-disponibilidad`) implementadas y validadas (reviewer: APROBADO).
Spec 004 (`004-cuentas-de-juego`) implementada (T1–T10, con T3b y T8b) en la rama
`marselo`, **sin validación de reviewer** por decisión del usuario ("saltate la revision
con reviewer"). Specs 005 y 006 con plan y tareas aprobados, sin empezar. Siguiente fase
SDD: implementación de la spec 005.

## Estado del código

- Frontend: Hito 1 completo (acceso, configuración, perfil, coincidencias y agenda).
  Funciona contra el backend simulado en el navegador (`mockApi`, datos de demostración
  con semilla fija, cuenta `demo@teammatchup.gg`).
- Backend (`backend/`): servidor base de la spec 001. Express 5.1.0 + Mongoose 8.24.5 +
  dotenv 17.2.3, TypeScript ejecutado directo con Node ≥ 22.18, ESM.
  - Configuración validada al arrancar (`src/utils/config.ts`): `NODE_ENV` obligatoria y
    exacta (`development` | `test` | `production`), `PORT`, `MONGODB_URI`/`MONGODB_DBNAME`
    (desarrollo y producción), `TEST_MONGODB_URI`/`TEST_MONGODB_DBNAME` (prueba), `HOST`
    opcional. El entorno del proceso prevalece sobre `.env`.
  - Arranque (`src/server.ts`, `src/index.ts`): validar → conectar (timeout 10 s) → escuchar.
  - Errores siempre `{ error: string }` en JSON: 400 «JSON mal formado», 404 «endpoint
    desconocido», 413 «cuerpo demasiado grande» (límite 102 400 bytes), 415 «codificación
    no soportada», 500 «error interno del servidor» (detalle solo en el registro).
  - Autenticación de la spec 002: registro, inicio y cierre de sesión y `/me`. JWT en
    cookie `HttpOnly` (credencial de 1 h) más comprobante CSRF en la cabecera
    `X-CSRF-Token`. `JWT_SECRET` obligatoria en los tres entornos.
  - Dependencias añadidas en la 002 (versión exacta): bcrypt 6.0.0, jsonwebtoken 9.0.2 y
    cookie-parser 1.4.7, con @types/bcrypt 6.0.0, @types/jsonwebtoken 9.0.10 y
    @types/cookie-parser 1.4.9.
  - Usuarios y disponibilidad de la spec 003 (todas protegidas, `:id` = 24 hexadecimales
    o `me`): `GET /api/users`, `GET|PATCH|DELETE /api/users/:id` y
    `GET|PUT /api/users/:id/availability`. Disponibilidad dentro del documento del usuario
    (`availability: [String]`, bloques `d-h`). Servicios nuevos sin Express en
    `src/services/`: `userTarget.ts`, `profile.ts`, `availability.ts`, `timezones.ts` y
    `zoneTab.ts`. Prueba manual en `requests/users.rest`. Sin dependencias nuevas.
  - Cuentas de juego de la spec 004 (todas con sesión y `X-CSRF-Token`):
    `GET|POST /api/accounts`, `GET|PUT|DELETE /api/accounts/:id`,
    `POST /api/accounts/:id/sync` y el resumen `GET /api/users/:id/games/:gameId`. Rango,
    partidas y marca de verificada los genera un proveedor simulado y determinista
    (`src/domain/rankSimulator.ts`, `src/services/rankProvider.ts`), sin red ni claves;
    toda cuenta sale con `"simulated": true` y sin partidas ni número de lectura. Dominio
    puro en `src/domain/` (`games`, `rankScale`, `rankSimulator`, `accountRules`,
    `accountState`, `userId`), aislado de `services/`, `utils/`, `models/` y
    `controllers/` (lo vigila `tests/unit/domainIsolation.test.ts`). Modelo
    `GameAccount`; `User.accounts`; reloj mutable `src/utils/clock.ts`; borrar un usuario
    borra sus cuentas. Prueba manual en `requests/accounts.rest` (recorrido comprobado con
    curl contra un servidor de desarrollo en una base temporal, ya borrada). Sin
    dependencias ni variables de entorno nuevas.
  - Recursos de coincidencias y agenda: specs 005 y 006.
  - 1162 tests con node:test + supertest (en serie, contra la base de prueba; ~85–120 s);
    typecheck y lint (ESLint) en verde; `npm audit` sin vulnerabilidades. Los tests de
    controlador montan el servidor en `127.0.0.1` (`listenOnLoopback`, T8b).

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas. Cambios aprobados durante la implementación: mongoose 8.19.1 → 8.24.5 (vulnerabilidad alta) y regla RFC para `HOST` (la última etiqueta no puede ser solo numérica). |
| `002-autenticacion` | Implementada y validada | 28 RF y 7 RNF cumplidos; decisiones P1–P9 abajo. |
| `003-usuarios-y-disponibilidad` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas; `spec.md` en «implementada». `requests/users.rest` probado a mano contra el servidor: todos los códigos coinciden. `AGENTS.md` actualizado. |
| `004-cuentas-de-juego` | Implementada, sin validar | Rama `marselo`, sin commit. T1–T10, T3b y T8b hechas. Sin reviewer por decisión del usuario. `spec.md` sigue en «aprobada» (no se pasó a «implementada» sin validación). Falta la prueba sin Internet (ver Deuda). |
| `005-coincidencias` | Plan y tareas aprobados | Sin empezar. |
| `006-agenda` | Plan y tareas aprobados | Sin empezar. |
| `007-integrar-frontend` | Borrador | Elimina el script `seed`. Debe incorporar la etiqueta de datos simulados de RF-37 de la 004 (criterio pendiente de la 004). |
| `008-ficha-de-jugador` | Borrador | — |
| `009-detalle-de-sesion` | Borrador | — |
| `010-despliegue` | Borrador | Servirá la interfaz desde el servidor (rutas fuera de `/api`). |

## Deuda conocida

- Spec 004 (2026-10-18):
  - `.gitattributes` en la raíz sin commit: evita que git convierta a CRLF el fixture
    `tests/fixtures/tzdata-2025b/zone.tab` en Windows (si se convierte, falla la prueba de
    zonas horarias). Decidir si se sube.
  - En Windows, `npm test` necesita `npm test --script-shell=bash` (el script usa sintaxis
    POSIX).
  - Decisiones de T9 sin confirmar por el usuario: (1) con un id inválido y el juego sin
    decodificar, el resumen responde primero "id con formato inválido"; (2) `LOL` en
    mayúsculas responde 400 "Juego no válido."; (3) `src/utils/middleware.ts` importa
    `ACCOUNT_ERRORS` de `src/domain/accountRules.ts`; (4) hay una prueba determinista extra
    de la cascada al borrar usuario.
  - Pendiente del usuario: ejecutar `npm test` con la red desconectada (criterio RNF-1/RNF-9
    de la 004). No se hizo para no tocar la red de la máquina; la búsqueda de `fetch(`,
    `http.request`, `process.env`, `Math.random` y URL externas en el código no da
    resultados.
  - Sin validación RF por RF de reviewer (decisión del usuario).
  - Quedó una copia de `.env` en el scratchpad de una sesión anterior (proto/backend):
    borrarla.
  - `npm test` tardó 121 s al cerrar T10 (antes, 83–85 s). Antes hubo dos peticiones muy
    lentas (144 s y 178 s) que no se repitieron; sin investigar.

- `httpApi.ts` y `mockApi.ts` guardan el JWT en `localStorage` (`tmu.token`): choca con el
  principio 5. Lo corrige la spec 007 (RF-2).
- El frontend no tiene runner de test (el principio 4 aplica solo al backend por decisión
  del usuario).
- `frontend/src/domain` importa sin extensión `.ts`, así que no se puede ejecutar directo
  con `node --test`.
- Mejoras menores detectadas por reviewer en la spec 001 (opcionales, requieren cambio de spec):
  - Con `MONGODB_URI` mal formada, el mensaje dice «no se pudo conectar en 10 s» aunque
    falla al instante.
  - Con `PORT` inválido no se informa a la vez de un `HOST` inválido.
  - Dos aserciones `as` sustituibles por guardas (`config.ts:65` y `as AddressInfo` en tests).
  - El lint no detecta `.only` importado con otro nombre.
  - Faltan pruebas de proceso real con `HOST=""` y con desarrollo sin `MONGODB_DBNAME`.
- Mejoras opcionales detectadas en la spec 002 (no bloquean; pendientes de decisión del usuario):
  - `/me` consulta la base dos veces.
  - El cast `as Record<string, unknown>` de `services/credentials.ts:136` se podría
    sustituir por `Reflect.get`.
  - `normalizeEmail` mide los 254 caracteres antes de pasar a minúsculas: un carácter como
    «İ» se alarga y el correo guardado podría superar 254.
- La base de desarrollo `teammatchup` no existía al validar: la verificación de «las
  pruebas no tocan la base de desarrollo» fue débil (reviewer lo confirmó revisando el código).

## Decisiones recientes

- Spec 002 (clarificación y plan):
  - P1: comprobante CSRF en la cabecera `X-CSRF-Token`, en la respuesta y en la petición.
  - P2: los mensajes de duplicado nombran el campo; si se repiten los dos, se da el del
    correo. La enumeración de cuentas por registro se acepta.
  - P3: la unicidad del nombre de usuario no distingue mayúsculas (campo `usernameKey`
    con índice único).
  - P4: el cierre de sesión es público y no exige comprobante.
  - P5: el JWT en `localStorage` del frontend lo corrige la spec 007 (RF-2).
  - P6: cookie de sesión sin caducidad; la credencial expira a 1 h.
  - P7: valores por defecto: zona `America/Santiago`, avatar `#6d5efc` y biografía vacía.
  - P8: contraseña de 72 bytes UTF-8 como máximo; correo de 254 caracteres como máximo.
  - P9: `JWT_SECRET` obligatoria en los tres entornos; valor de desarrollo
    `solo-desarrollo-no-usar-en-produccion` en `.env.example`, rechazado en producción.
  - Orden de validación por campo: tipo, luego ausente y luego reglas; en el nombre de
    usuario, la longitud antes que los caracteres.
  - El inicio de sesión tarda distinto si el correo no existe: limitación aceptada.
  - `bcrypt` nativo (no `bcryptjs`).

- Spec 001: `NODE_ENV` obligatoria y exacta, también en `.env` (si falta o es
  desconocida, no arranca).
- Spec 001: en prueba solo el mensaje de configuración inválida se muestra; los de
  base no disponible y dirección/puerto no utilizable se callan (RNF-1, opción b).
- Spec 001: backend con lint (ESLint); el registro de cada petición queda fuera de alcance.
- Spec 001: `HITO2.md` no está en el repositorio; la spec no se contrastó con el enunciado.
- Las dependencias se justifican en el `plan.md` de cada spec aprobada (principio 1).
- Los 6 principios de la constitución quedan aprobados.
- Principio 4 (tests primero) aplica solo al backend por ahora.
- implementer escribe los archivos fuera de `specs/**`; planner solo escribe en `specs/**`.

## Notas técnicas para las specs siguientes

- `createWithUser({ jwtSecret, now })` en `src/utils/middleware.ts` protege rutas y deja
  `request.userId`.
- `createApp({ jwtSecret, nodeEnv, now? })` sustituye al antiguo `export default app`.
- Las respuestas de usuario usan `toOwnUserJson` o la serialización JSON de Express, no
  los campos tipados de `toJSON()`.
- Al eliminar la cuenta (spec 003), la cookie debe borrarse con `sessionCookieOptions`,
  igual que al cerrar sesión.
- Zonas horarias (spec 003): lista fija de la columna TZ de `zone.tab` de tzdata 2025b
  (`src/services/zoneTab.ts`, sin `Intl`). Para cambiar de versión: sustituir el fixture
  `tests/fixtures/tzdata-2025b/zone.tab`, regenerar el arreglo y `TZDATA_VERSION`, y
  ajustar la prueba `tests/unit/timezones.test.ts`.
- `MESSAGES.forbidden` («no tienes permiso para esta operación») y `MESSAGES.invalidId`
  («id con formato inválido») de `src/utils/errors.ts` son reutilizables por 004–006.
- La cascada de RF-11 (borrar los datos del usuario) la amplían 004 y 006 dentro de
  `DELETE /api/users/:id`.
- Spec 007: si hay CORS con orígenes distintos, hará falta
  `Access-Control-Expose-Headers: X-CSRF-Token`.

## Avisos

- npm bloquea los install-scripts de `bcrypt`. No afecta en linux-x64 (trae el binario ya
  compilado); en otra plataforma, ejecutar `npm install-scripts approve bcrypt`.
- Cada `backend/.env` local necesita la línea `JWT_SECRET` (copiarla de `.env.example`).
- Windows: MongoDB nativo en `127.0.0.1:27017`; `npm test --script-shell=bash`.

## Próximo paso

Implementar la spec 005 (`005-coincidencias`) desde su T1 (`/sdd-implement 005 T1`); después
la 006. Antes conviene que el usuario confirme las decisiones de T9 de la 004, decida sobre
`.gitattributes` y haga la prueba sin Internet. Adaptar el frontend queda para la spec 007,
después de las 004 a 006, por decisión del usuario. Requisito local para ejecutar los tests
del backend: `backend/.env` (copiado de `.env.example`, con `JWT_SECRET`) y MongoDB en
`mongodb://127.0.0.1:27017`.

## Notas de la spec 004 (2026-10-18)

- Cambios al plan aprobados durante la implementación (ver `specs/004-cuentas-de-juego/plan.md`):
  plan alineado con el backend real de 001–003 (`helpers.ts`, `createApp`, `createWithUser`;
  no hay `test_helper.ts`); Q1: las rutas de la 004 responden 401 "sesión no iniciada" a un
  usuario eliminado (`missingUserError` + `createWithExistingUser`), las de 002/003 siguen
  con "token inválido"; Q2: reloj mutable en `src/utils/clock.ts` (P-5); T3b/P-17: `domain/`
  aislado, `domain/userId.ts` nuevo y `services/userTarget.ts` lo reexporta (salvo
  `INVALID_ID_MESSAGE`); T8b/P-18: supertest hacía `listen(0)` en `::` y conectaba a
  `127.0.0.1`, lo que daba fallos intermitentes; se arregla solo en tests con
  `listenOnLoopback` + `closeTestServers` y `getFreePort(host)`.
- Rutas: edición `PUT /api/accounts/:id`; resincronizar `POST /api/accounts/:id/sync`.
- El orden de consumo del generador (plan, 4.3) es contrato: cambiarlo cambia todas las
  lecturas de la demostración.
- La normalización de rango del backend (DP-26) difiere de `frontend/src/domain/games.ts`
  hasta que la spec 007 la adopte.
- Nada de la spec 004 está en un commit todavía.
