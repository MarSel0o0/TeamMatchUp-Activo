# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-10-18

## Fase actual

Specs 001 (`001-crear-backend`), 002 (`002-autenticacion`) y 003
(`003-usuarios-y-disponibilidad`) implementadas y validadas (reviewer: APROBADO).
Spec 004 (`004-cuentas-de-juego`) implementada (T1–T10, con T3b y T8b) en la rama
`marselo`, **sin validación de reviewer** por decisión del usuario ("saltate la revision
con reviewer"). Specs 005 y 006 con spec, plan y tareas aprobados, sin empezar. Spec 007
aprobada, con plan y tareas en borrador. Spec 008 con spec, plan y tareas aprobados. Spec
009 (`009-detalle-de-sesion`) con spec, plan y tareas aprobados el 2026-10-18 (fase de
tareas cerrada; su implementación espera a la 007 y a la 008). Spec 010 en borrador.
Siguiente fase SDD: implementación de la spec 005 y aprobación del plan de la 007.

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
| `005-coincidencias` | Spec, plan y tareas aprobados | Sin empezar. |
| `006-agenda` | Spec, plan y tareas aprobados (2026-10-18) | Sin empezar. |
| `007-integrar-frontend` | Spec aprobada (2026-10-18); plan y tareas en borrador | No define ningún script `seed` (la entrada anterior de esta memoria era errónea; el backend no tiene ese script). Debe incorporar la etiqueta de datos simulados de RF-37 de la 004. Por decisión de la usuaria, «no se debe cambiar nada de la 007». |
| `008-ficha-de-jugador` | Spec, plan y tareas aprobados (2026-10-18) | Precondición: plan de la 007 aprobado y sus T1–T26 hechas. Los enlaces de RF-2 son su T9. |
| `009-detalle-de-sesion` | Spec, plan y tareas aprobados (2026-10-18) | 18 tareas (T0–T17), sin dividir la spec por decisión de la usuaria. T0 exige plan de la 007 aprobado, T1–T26 de la 007 hechas y la tarea de enlaces de la 008 hecha: hoy no se cumple. La validación de reviewer espera a que estén implementadas la 006, la 007 y la 008. No cambia el backend. Sin commit. |
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

- Spec 009 (2026-10-18):
  - El dominio nuevo del frontend se prueba con scripts de Node sin versionar en el
    scratchpad (D-26): no hay script `test` en el frontend, así que esas pruebas no se
    repiten solas; su salida queda en `validation.md`.
  - En una sesión `open` con un participante eliminado aún guardado (cascada), bajar los
    cupos puede dar 400: limitación transitoria aceptada (Q22).

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

- Spec 009 (clarificación, plan y tareas; 2026-10-18):
  - Reviewer la revisó contra 003, 006, 007 y 008 aprobadas (15 hallazgos). Planner los
    corrigió en varias rondas (cuarta revisión QA: Q16–Q27, D24–D30, CR4-1 a CR4-5 y
    CR5-1 a CR5-5). Un repaso posterior encontró 1 bloqueante (U+0085) y 8 menores, todos
    corregidos.
  - Q16: el aviso global «Datos de demostración» también se muestra con el servidor real
    (como la 007 RF-11).
  - Q17/D30: el botón de una acción en curso queda deshabilitado con «Enviando…» (como la
    007 RF-20); los botones bloqueados («Sin cupos», «Editar sesión», «Cancelar sesión»,
    «Descartar», «Volver») conservan el foco.
  - Q18: una sola regla de dominio para el título (006 DP6-33: recorte Unicode,
    caracteres prohibidos, 3 a 60 caracteres Unicode), usada en la edición y en el
    formulario de creación de la agenda (RF-24 nuevo). Q23: las notas de creación también
    admiten 160 caracteres Unicode. Q27: «Sesión con <nombre>» con caracteres prohibidos
    muestra el error de RF-24 al enviar.
  - Q19: la edición envía siempre los seis campos; el modo simulado imita la edición
    parcial de la 006 (RF-7, RF-26) con sus mensajes literales.
  - Q20: en modo simulado el id de sesión no distingue mayúsculas (como la 008 P49).
  - Q21: una sesión `full` con menos participantes visibles (cascada) no muestra «cupo
    libre». Q22: si está `full`, el mínimo de cupos es el número actual de cupos.
  - Q25: mientras «Sí, cancelar sesión» está en curso, el foco va al título de la
    ventana. Q26: Tab recorre la ventana sin salir de ella.
  - Plan (D-1 a D-30): ruta `/agenda/:sessionId`; el contrato gana `sessions.get` y
    `sessions.update`; D-27: el cliente comprueba los puntos 2 a 4 de RF-22 con los textos
    de la 006 («No puedes dejar menos cupos que jugadores inscritos.»); D-28: orden de
    implementación; D-29 y D-30 en Notas técnicas.
  - Tareas: 18 (T0–T17); la usuaria prefirió no dividir la spec.
  - «No se debe cambiar nada de la 007» (decisión de la usuaria). Un planner tocó por
    error la 007 RF-20 y añadió R21; se revirtió.

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

- Frontend (spec 009): regla única del título en el dominio (`sessionRules.ts`), usada
  por la edición del detalle y por el formulario de creación de la agenda.
- `limitToCodePoints` (D-29) funciona como `maxLength` contando puntos de código: solo
  entra lo insertado que cabe y los emojis compuestos entran enteros o no entran. La
  selección se lee en el `beforeinput` nativo (D-30).
- Las pruebas del dominio del frontend usan el gancho de resolución de la 007 (por los
  imports sin `.ts`).

## Avisos

- npm bloquea los install-scripts de `bcrypt`. No afecta en linux-x64 (trae el binario ya
  compilado); en otra plataforma, ejecutar `npm install-scripts approve bcrypt`.
- Cada `backend/.env` local necesita la línea `JWT_SECRET` (copiarla de `.env.example`).
- Windows: MongoDB nativo en `127.0.0.1:27017`; `npm test --script-shell=bash`.
- La reversión de `specs/007-integrar-frontend/spec.md` está completa: a 2026-10-18
  `git status` y `git diff --stat` no lo muestran modificado (no hace falta
  `git checkout`).
- Por subir de la spec 009: `spec.md` (modificado), `plan.md` y `tasks.md` (nuevos) y este
  `MEMORY.md`. Los `.DS_Store` (raíz y `frontend/`) no deberían subirse.

## Próximo paso

Implementar la spec 005 (`005-coincidencias`) desde su T1 (`/sdd-implement 005 T1`); después
la 006. En paralelo, aprobar el plan y las tareas de la 007 e implementarla (T1–T26);
después, la tarea de enlaces de la 008 (T9) y el resto de la 008; después, la 009 desde
su T0 (`/sdd-implement 009-detalle-de-sesion T0`). Antes conviene que el usuario confirme las decisiones de T9 de la 004, decida sobre
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
