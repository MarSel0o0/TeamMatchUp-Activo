# Tareas 003 — Perfil de usuario y disponibilidad

Estado: aprobado

Spec: `specs/003-usuarios-y-disponibilidad/spec.md` (aprobada). Plan:
`specs/003-usuarios-y-disponibilidad/plan.md`. Las referencias "§n" apuntan a secciones del
plan.

## Reglas para quien implementa

- Una tarea por llamada, en orden. Cada una empieza con las pruebas indicadas **en rojo**
  (`npm test` y se ve fallar), después el código, y termina con los tres comandos en verde
  (principio 4). Al terminar: marcar la casilla `[x]` y parar.
- Todos los comandos se ejecutan dentro de `backend/` (`cd backend`).
- No se crean archivos que el plan no nombra (§1). **No se toca `frontend/`** (spec 007).
- Sin `any`, sin `@ts-ignore`, sin `.only`, sin `console` fuera de `src/utils/logger.ts`,
  sin `Intl` para zonas horarias. `request.body` se trata como `unknown`.
- Mensajes exactamente como en §2 (español, minúscula, sin punto final; `#RRGGBB` literal).
- Sin dependencias nuevas (§1.2): `package.json` no cambia.
- Los controladores llaman a `User.findOneAndUpdate(...)` y `User.deleteOne(...)` sin
  desestructurar ni encadenar (D6, R3).
- **Prerrequisito:** MongoDB disponible en `mongodb://127.0.0.1:27017` y `backend/.env`
  (copiado de `.env.example`, con `JWT_SECRET`). Ningún agente toca `.env`.

Comandos de verificación:

```
cd backend
npm test            # NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'
npm run typecheck   # tsc --noEmit && tsc --noEmit -p tests
npm run lint        # eslint .
```

---

## Tareas

- [x] **T1. Disponibilidad en el modelo y mensajes genéricos.** RF-4, RF-11, RF-12, RNF-2, RNF-4
  - Objetivo: el usuario guarda su disponibilidad dentro de su documento (D1) sin exponerla.
  - Modifica: `backend/src/models/user.ts` (§2.5: `availability: [String]` con default `[]`,
    `UserFields.availability`, exporta `toPublicUserJson`). `backend/src/utils/errors.ts`
    (`MESSAGES.invalidId`, `MESSAGES.forbidden`, D8).
  - Tests primero: `backend/tests/unit/userModel.test.ts` (§6.2: `availability` `[]` por
    defecto; con bloques, `toJSON`/`toOwnUserJson` mantienen las claves exactas de la 002;
    `toPublicUserJson` igual a `toJSON()`). El formato RNF-4 de los dos mensajes nuevos se
    prueba en T5 (`USER_TARGET_MESSAGES` los reexporta).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde; las pruebas de la 002 siguen pasando.

- [x] **T2. Zonas horarias de `zone.tab` (tzdata 2025b).** RF-16
  - Objetivo: conjunto de zonas válidas fijado e incrustado, sin dependencia ni `Intl` (D5).
  - Crea: `backend/tests/fixtures/tzdata-2025b/zone.tab` (copia literal, §1.1 pasos 1–2;
    anotar en §1.1 los SHA-256 del `.tar.gz` y del `zone.tab`).
    `backend/src/services/zoneTab.ts` (`TZDATA_VERSION`, `ZONE_TAB_NAMES`).
    `backend/src/services/timezones.ts` (§2.2: `UTC_ZONE`, `isValidTimezone`).
  - Tests primero: `backend/tests/unit/timezones.test.ts` (§6.2: fixture = arreglo
    exactamente, sin repetidos, versión; válidas e inválidas de la spec, incluidas `CET`,
    `EST5EDT`, `EST`, `HST`, `Factory`, `Etc/…`, minúsculas y `"America/ Santiago"`).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`;
    `grep -rn "Intl\." src` sin resultados.
  - Hecho cuando: los comandos en verde y los SHA-256 anotados. Si no se puede obtener
    tzdata 2025b, parar e informar (R2).

- [x] **T3. Validación pura de la actualización del perfil.** RF-7, RF-8, RF-9, RF-15, RF-16, RF-17, RF-19, RF-21, RNF-3, RNF-4
  - Objetivo: `validateProfileUpdate` con el orden de RF-19 y el recorte de
    `String.prototype.trim`.
  - Crea: `backend/src/services/profile.ts` (§2.3: `PROFILE_LIMITS`, `AVATAR_COLOR_PATTERN`,
    `PROFILE_MESSAGES`, `isValidAvatarColor`, `validateProfileUpdate`; usa `readField` de
    `credentials.ts` e `isValidTimezone` de T2).
  - Tests primero: `backend/tests/unit/profile.test.ts` (§6.2 completo: cuerpos sin campos,
    tipos con `null` en cada campo, límites 40/41 y 200/201 con emojis, recortes con `\n`,
    `\t`, NBSP y BOM, NEL no recortado, colores, orden con varios inválidos, claves de
    `value`, formato RNF-4).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde.

- [x] **T4. Validación pura de la disponibilidad.** RF-13, RF-14, RNF-3, RNF-4
  - Objetivo: `isTimeBlock` y `validateAvailability` con orden de primera aparición.
  - Crea: `backend/src/services/availability.ts` (§2.4).
  - Tests primero: `backend/tests/unit/availability.test.ts` (§6.2: bloques válidos e
    inválidos de los casos límite, `"2-20\n"`, los tres mensajes en su orden, repetidos,
    `user` ignorado, 5 000 bloques sin tope, formato RNF-4).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde.

- [x] **T5. Identificador recibido: ruta, decodificación, `me`, formato y propiedad (puros).** RF-5, RF-6, RF-10, RF-18, RF-20, RNF-4
  - Objetivo: las tres funciones de §2.1 que fijan los pasos 2 a 4 del orden de revisión.
  - Crea: `backend/src/services/userTarget.ts` (§2.1: `SELF_ALIAS`, `OBJECT_ID_PATTERN`,
    `USER_TARGET_MESSAGES`, `matchUserRoute`, `decodeSegment`, `resolveUserTarget`).
  - Tests primero: `backend/tests/unit/userTarget.test.ts` (§6.2: tabla de rutas con `HEAD`,
    `/` final y mayúsculas en `availability`; `m%65`, `%20me`, `%zz`, `%E0%A4`, `%`; `me`,
    `Me`, `ME`, `" me"`, 12/23/25 caracteres, 24 no hexadecimales, propio en mayúsculas,
    otro válido; formato RNF-4).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde.

- [x] **T6. Guardia, listado y obtener un usuario.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-18 (pasos 1–3), RF-20, RNF-2
  - Objetivo: rutas protegidas con la guardia de D2 y las dos lecturas de usuario.
  - Modifica: `backend/src/utils/middleware.ts` (§3.1: `createUserRoutesGuard({ withUser })`).
    `backend/src/controllers/users.ts` (`createUsersRouter({ jwtSecret, nodeEnv, now })`,
    `router.use(guard)` antes de las rutas `/:id`, `GET /` §3.2, `GET /:id` §3.3; el
    registro no cambia). `backend/src/app.ts` (pasa las opciones al router).
    `backend/tests/controllers/helpers.ts` (§6.1: `signUp`, `nonExistingId`, `withSession`,
    `rawCookieRequest`, `setCreatedAt`, `ISO_MS_Z`, `HEX24_LOWER`).
    `backend/tests/controllers/app.test.ts` (§6.2: retira `GET /api/users` de los 404;
    añade `POST`/`PUT /api/users/me` → 404).
  - Tests primero: `backend/tests/controllers/userRead.test.ts` (§6.2: 401 en las 6
    operaciones aunque el id, el segmento o el cuerpo sean inválidos —las que aún no
    existen dan 401 por la guardia—; orden del listado con empate; correo solo propio;
    RNF-2; 400/404 de `GET /:id`; `me`, `m%65`, mayúsculas; `/me/` → 401 sin sesión).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde; las pruebas de la 001 y la 002 siguen
    pasando (salvo la fila de `app.test.ts` modificada, R1).

- [x] **T7. Actualizar el perfil (`PATCH /api/users/:id`).** RF-7, RF-8, RF-9, RF-10, RF-15, RF-16, RF-17, RF-18, RF-19, RF-21, RNF-1, RNF-3
  - Objetivo: actualización atómica del propio perfil con el orden de RF-18 (D4, D9).
  - Modifica: `backend/src/controllers/users.ts` (§3.4).
  - Tests primero: `backend/tests/controllers/userProfile.test.ts` (§6.2 completo: campos
    conservados, cuerpos sin campos → 200, campos ignorados, cada mensaje y orden con la
    base intacta, cada zona de los casos límite, recortes y color en minúsculas, 403 sobre
    otro / inexistente / con cuerpo inválido, 400 id y `%zz` con cuerpo inválido, `me` y
    mayúsculas → 200).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde.

- [x] **T8. Leer y reemplazar la disponibilidad (`GET`/`PUT /api/users/:id/availability`).** RF-10, RF-12, RF-13, RF-14, RF-18, RF-20, RNF-1, RNF-3
  - Objetivo: lectura de cualquier usuario y reemplazo atómico de la propia (§3.6, §3.7).
  - Modifica: `backend/src/controllers/users.ts`.
  - Tests primero: `backend/tests/controllers/userAvailability.test.ts` (§6.2: `[]` sin
    guardar y con documento sin el campo; orden de primera aparición en respuesta y base;
    `[]` vacía; `user` ajeno ignorado; mensajes y orden de RF-14 con la anterior
    conservada; 413 por encima de 102 400 bytes; 403 sobre otro / inexistente / con cuerpo
    inválido; 400/404 de la lectura; `me` → 200).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde.

- [x] **T9. Eliminar la cuenta y escrituras en curso (`DELETE /api/users/:id`).** RF-10, RF-11, RF-22
  - Objetivo: borrado idempotente del usuario con su disponibilidad y la cookie, y las
    respuestas de RF-22 sin 500 ni recreación (§3.5, §3.8).
  - Modifica: `backend/src/controllers/users.ts`.
  - Tests primero: `backend/tests/controllers/userDeletion.test.ts` (§6.2: 204 sin cuerpo,
    cookie borrada con los atributos de emisión y `Secure` en producción, usuario y
    disponibilidad fuera de la base, 401 `sesión no iniciada` con el agente, 401 `token
    inválido` con la credencial copiada en `me` y en las 6 operaciones, re-registro; 403
    sobre otro / inexistente; RF-22 después del borrado; RF-22 en curso con
    `t.mock.method` (D6): PATCH → 404, PUT → 404 —**dos pruebas separadas**—, aplicados
    antes → 200, segunda eliminación → 204 con cookie, ningún documento recreado).
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los tres comandos en verde y ninguna prueba de RF-22 recibe 500.

- [x] **T10. Peticiones manuales y verificación de los criterios de finalización.** RF-1..RF-22, RNF-1..RNF-5
  - Crea: `backend/requests/users.rest` (RT-19: login → `GET /api/users` → `GET
    /api/users/me` → `PATCH /api/users/me` → `PUT /api/users/me/availability` → `GET
    /api/users/me/availability` → `DELETE /api/users/me` → `GET /api/auth/me` 401, con
    `X-CSRF-Token` copiado del login).
  - No crea más código. Si algo falla, se informa y se vuelve a la tarea correspondiente.
  - Pasos (en `backend/`):
    1. `npm test`, `npm run typecheck` y `npm run lint` en verde.
    2. `grep -rnE '\.only\b|only:\s*true' src tests`, `grep -rn '@ts-ignore' src tests`,
       `grep -rnE ':\s*any\b|<any>|as any' src tests` y `grep -rn 'Intl\.' src` sin
       resultados; `grep -rn 'console\.' src` solo en `src/utils/logger.ts`.
    3. `git diff --stat -- ../frontend` vacío; `package.json` sin cambios.
    4. `npm audit` sin vulnerabilidades altas ni críticas.
    5. Recorrer los criterios de finalización de la spec con la tabla final de §9 del plan,
       señalando la prueba en verde de cada uno.
  - Verificación: `cd backend && npm test && npm run typecheck && npm run lint`.
  - Hecho cuando: los cinco pasos se cumplen y cada criterio de finalización tiene una
    prueba en verde.

---

## Cobertura RF/RNF → tareas

| Requisito | Tareas | Verificación principal |
| --- | --- | --- |
| RF-1 | T6 | `controllers/userRead.test.ts` |
| RF-2 | T6 | `controllers/userRead.test.ts` |
| RF-3 | T6 | `controllers/userRead.test.ts` |
| RF-4 | T1, T6 | `unit/userModel.test.ts`; `controllers/userRead.test.ts` |
| RF-5 | T1, T5, T6 | `unit/userTarget.test.ts`; `controllers/userRead.test.ts` |
| RF-6 | T5, T6 | `unit/userTarget.test.ts`; `controllers/user*.test.ts` |
| RF-7 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-8 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-9 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-10 | T1, T5, T7, T8, T9 | `controllers/userProfile.test.ts`; `userAvailability.test.ts`; `userDeletion.test.ts` |
| RF-11 | T1, T9 | `controllers/userDeletion.test.ts` |
| RF-12 | T1, T8 | `controllers/userAvailability.test.ts` |
| RF-13 | T4, T8 | `unit/availability.test.ts`; `controllers/userAvailability.test.ts` |
| RF-14 | T4, T8 | `unit/availability.test.ts`; `controllers/userAvailability.test.ts` |
| RF-15 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-16 | T2, T3, T7 | `unit/timezones.test.ts`; `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-17 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-18 | T5, T6, T7, T8 | `controllers/userRead.test.ts`; `userProfile.test.ts`; `userAvailability.test.ts` |
| RF-19 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-20 | T5, T6, T8 | `controllers/userRead.test.ts`; `controllers/userAvailability.test.ts` |
| RF-21 | T3, T7 | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-22 | T9 | `controllers/userDeletion.test.ts` |
| RNF-1 | T7, T8 | `controllers/userProfile.test.ts`; `controllers/userAvailability.test.ts` |
| RNF-2 | T1, T6 | `unit/userModel.test.ts`; `controllers/userRead.test.ts` |
| RNF-3 | T3, T4, T7, T8 | pruebas HTTP directas |
| RNF-4 | T1, T3, T4, T5 | pruebas de formato de mensajes en `unit/` |
| RNF-5 | todas, T10 | `npm test`, `npm run typecheck`, `npm run lint`; paso 2 de T10 |

---

## Pendientes para el usuario (fuera de `specs/`, no son tareas de implementación)

- Aprobar `plan.md` y `tasks.md` antes de empezar T1.
- `MEMORY.md` y `AGENTS.md`: ver plan §7.
- Tras T10 en verde: pasar `spec.md` a "implementada".
