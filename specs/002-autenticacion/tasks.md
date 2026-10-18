# Tareas 002 — Registro, inicio y cierre de sesión

Estado: implementado

Spec: `specs/002-autenticacion/spec.md` (implementada). Plan: `specs/002-autenticacion/plan.md`.
Las referencias "§n" apuntan a secciones del plan. "001-RF-n" son RF de la spec 001.

## Reglas para quien implementa

- Una tarea por llamada, en orden. Cada una empieza con las pruebas indicadas **en rojo**
  (`npm test` y se ve fallar), después el código, y termina con los tres comandos en verde
  (principio 4). Al terminar: marcar la casilla `[x]` y parar.
- Todos los comandos se ejecutan dentro de `backend/`.
- No se crean archivos que el plan no nombra (§1). No se toca `frontend/`.
- Sin `any`, sin `@ts-ignore`, sin `.only`, sin `console` fuera de `src/utils/logger.ts`.
  Todo valor de `request.cookies` se asigna a `unknown` antes de usarlo (§1.2).
- Mensajes exactamente como en §2 (español, minúscula, sin punto final).
- Dependencias: confirmar cada versión con `npm view <paquete>@<versión> version`, instalar con
  `npm install --save-exact` (prod) o `npm install --save-exact --save-dev` (dev), sin `^` ni
  `~` en `package.json`, y `npm audit` sin altas ni críticas (§1.1). Si una versión no existe
  o el audit falla, anotarlo en §1.1 y parar si hay vulnerabilidad.
- **Prerrequisito desde T1:** MongoDB disponible y `backend/.env` con la línea
  `JWT_SECRET=solo-desarrollo-no-usar-en-produccion` (archivo local ignorado por git; el
  usuario ya la añadió, §8 R2 resuelto). Ningún agente toca `.env`. Sin ella, `testConfig()` falla.

Comandos de verificación:

```
npm test            # NODE_ENV=test node --test --test-concurrency=1 'tests/**/*.test.ts'
npm run typecheck   # tsc --noEmit && tsc --noEmit -p tests
npm run lint        # eslint .
```

---

## Tareas

- [x] **T1. `JWT_SECRET` en la configuración y archivo de ejemplo con siete variables.** RF-17, RF-27, RF-28, RNF-7; 001-RF-1, 001-RF-2, 001-RF-9
  - Modifica: `backend/src/utils/config.ts` (§2.1, §3.1: `DEV_JWT_SECRET`, `Config.jwtSecret`,
    `JWT_SECRET` obligatoria en los tres entornos y en la lista de faltantes en el orden
    `NODE_ENV, PORT, JWT_SECRET, base`; rechazo del valor de desarrollo recortado en
    producción). `backend/.env.example` (contenido exacto de §1.3).
  - Tests primero: `backend/tests/unit/config.test.ts` (fixtures con `JWT_SECRET`; casos de
    §6.2: matriz con `JWT_SECRET` ausente/`""`/espacios, `NODE_ENV` + `JWT_SECRET` juntas,
    RF-28 con y sin espacios, RF-27 en `development` y `test`, `jwtSecret` sin recortar;
    ajustar las aserciones exactas que cambian). `backend/tests/unit/envExample.test.ts`
    (siete claves, `JWT_SECRET === DEV_JWT_SECRET`, comentario de valor de desarrollo, válido
    en `development`/`test`, inválido en `production`). `backend/tests/server/process.test.ts`
    (`JWT_SECRET` en `DB_VARS` y en los entornos que arrancan; RF-17 en los tres entornos sin
    ella y con espacios; sin `NODE_ENV` ni `JWT_SECRET` → nombra ambas; RF-28 en producción,
    con y sin espacios → código ≠ 0 y mensaje con `JWT_SECRET`).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde; las pruebas de
    arranque de la 001 siguen pasando con el valor de desarrollo (RF-27).

- [x] **T2. Contraseñas con bcrypt.** RF-2, RF-4 (bytes), RF-9, RNF-5
  - Dependencias: `bcrypt` (prod) y `@types/bcrypt` (dev) según §1.1.
  - Crea: `backend/src/services/passwords.ts` (§2.3: `BCRYPT_COST`, `MAX_PASSWORD_BYTES`,
    `passwordByteLength`, `hashPassword`, `verifyPassword` que devuelve `false` sin comparar
    si supera 72 bytes). `credentials.ts` (T3) importa `passwordByteLength` de aquí.
  - Tests primero: `backend/tests/unit/passwords.test.ts` (§6.2: hash ≠ contraseña y con
    prefijo `$2b$10$`; dos hashes distintos; verificación correcta/incorrecta; contraseña de
    72 bytes + `"a"` → `false` aunque `bcrypt.compare` a secas la aceptaría; `bcrypt.compare`
    no se llama si supera 72 bytes).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde; `npm audit` sin
    altas ni críticas.

- [x] **T3. Validación pura de registro e inicio de sesión.** RF-3 (clave), RF-4, RF-5, RF-6, RF-7, RF-16, RF-18, RF-19, RNF-7
  - Crea: `backend/src/services/credentials.ts` (§2.2, §3.2: `EMAIL_PATTERN`,
    `USERNAME_PATTERN`, `LIMITS`, `MESSAGES`, `readField`, `normalizeEmail`, `usernameKey`,
    `validateRegistration`, `validateLogin`; importa `passwordByteLength` de `passwords.ts`). Orden fino
    según D9 (confirmado por el usuario, P1: tipo → ausente → reglas; en el nombre de
    usuario, longitud antes que caracteres).
  - Tests primero: `backend/tests/unit/credentials.test.ts` (todos los casos de §6.2 para
    `readField`, registro, RF-19, inicio de sesión y formato RNF-7 de los mensajes).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde.

- [x] **T4. Credencial de sesión y comprobante anti-CSRF (puros).** RF-8, RF-10, RF-11, RF-12, RF-14, RF-24 (pasos 1–4), RNF-1, RNF-2, RNF-3
  - Dependencias: `jsonwebtoken` (prod) y `@types/jsonwebtoken` (dev) según §1.1.
  - Crea: `backend/src/services/sessionToken.ts` (§2.4, §3.3: constantes, `SESSION_MESSAGES`,
    `createCsrfToken`, `signSessionToken(claims, secret, nowSeconds)`, `checkSession({ cookie,
    csrfHeader, secret, nowSeconds })` con `algorithms: ["HS256"]`, `clockTimestamp` y
    `timingSafeEqual`, `sessionCookieOptions(nodeEnv)`).
  - Tests primero: `backend/tests/unit/sessionToken.test.ts` (§6.2: claves exactas del payload;
    cada paso y combinación de RF-24 incluidos `none`, `HS512`, cookie objeto, expirada sin
    comprobante, expirada con otro secreto, sin comprobante en ningún lado; 3599/3600 s;
    opciones de cookie por entorno sin `maxAge`/`expires`/`domain`; UUID distintos).
  - Hecho cuando: `npm test`, `npm run typecheck` y `npm run lint` en verde; `npm audit` sin
    altas ni críticas.

- [x] **T5. Modelo `User`, índices únicos y preparación de la base al arrancar.** RF-1, RF-3, RF-7, RF-21, RNF-4
  - Crea: `backend/src/models/user.ts` (§2.5, §3.4: esquema con `usernameKey` y `email` únicos,
    defaults, `timestamps` solo `createdAt`, `toJSON` en lista blanca, `toOwnUserJson`).
  - Modifica: `backend/src/server.ts` (§3.10: `prepareDatabase()` con `User.init()` entre
    conectar y escuchar; si falla, desconecta y lanza `StartupError` con el mensaje de §3.10).
  - Tests primero: `backend/tests/unit/userModel.test.ts` (sin base: defaults, claves exactas
    de `toJSON`, `toOwnUserJson` con `email`). En `backend/tests/server/startup.test.ts`: tras
    `startServer`, existen índices únicos sobre `email` y `usernameKey`.
  - Hecho cuando: con MongoDB disponible, `npm test`, `npm run typecheck` y `npm run lint` en
    verde.

- [x] **T6. `createApp` y registro (`POST /api/users`).** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-16, RF-19, RF-20 (sin cookie ni cabecera), RF-21, RF-26, RNF-4
  - Crea: `backend/src/controllers/users.ts` (§3.5: `createUsersRouter()`, `duplicateMessage`,
    traducción del E11000 repitiendo la consulta). `backend/tests/controllers/helpers.ts`
    (§6.1: `authApp`, `registerUser`, `parseSetCookie`; `loginAs` y `forgeToken` llegan en T7
    y T8).
  - Modifica: `backend/src/app.ts` (§3.9: `createApp(options)` con `AppOptions`; monta
    `/api/users`; sin `export default`). `backend/src/index.ts` (`createApp(result.config)`).
    `backend/tests/controllers/app.test.ts` y `backend/tests/server/startup.test.ts` (usan
    `createApp(...)`; casos nuevos de 404 de §6.2).
  - Tests primero: `backend/tests/controllers/users.test.ts` (§6.2 completo: RF-1, RF-2/RNF-5,
    RF-3, RF-4..RF-6, RF-19, RF-7, RF-20 sin `Set-Cookie` ni `X-CSRF-Token`, RF-21 con dos y
    con cinco registros simultáneos).
  - Hecho cuando: con MongoDB disponible, `npm test`, `npm run typecheck` y `npm run lint` en
    verde; las pruebas de la 001 siguen pasando.

- [x] **T7. Inicio y cierre de sesión (`POST /api/auth/login`, `POST /api/auth/logout`).** RF-7, RF-8, RF-9, RF-14, RF-16, RF-18, RF-19, RF-26, RNF-2, RNF-4, RNF-5
  - Crea: `backend/src/controllers/auth.ts` con `createAuthRouter({ jwtSecret, nodeEnv, now })`,
    rutas `POST /login` (§3.6) y `POST /logout` (§3.8). `me` llega en T8.
  - Modifica: `backend/src/app.ts` (monta `/api/auth`). `backend/tests/controllers/helpers.ts`
    (añade `loginAs` y `forgeToken`/`noneToken`).
  - Tests primero: `backend/tests/controllers/auth.test.ts`, casos de login y logout de §6.2:
    RF-8 (cuerpo, cabecera, credencial verificada con el secreto y comprobante coincidente,
    atributos de cookie, sin `Max-Age`/`Expires`), RNF-2 (`Secure` solo con
    `nodeEnv: "production"`), RF-7, RF-9, RF-18/RF-19 (sin consultar usuarios), RF-16, RNF-5
    (login no cambia la base), RF-14 (sin sesión, alterada sin cabecera, expirada; atributos de
    borrado iguales a los de emisión; `Secure` en producción).
  - Hecho cuando: con MongoDB disponible, `npm test`, `npm run typecheck` y `npm run lint` en
    verde.

- [x] **T8. Operaciones protegidas: `withUser` y `GET /api/auth/me`.** RF-10, RF-11, RF-12, RF-13, RF-15, RF-20, RF-22, RF-23, RF-24, RF-25, RF-26, RNF-1, RNF-4
  - Dependencias: `cookie-parser` (prod) y `@types/cookie-parser` (dev) según §1.1.
  - Crea: `backend/src/types/express.d.ts` (D12).
  - Modifica: `backend/src/utils/middleware.ts` (§3.3: `createWithUser({ jwtSecret, now })` con
    el paso 5 y `request.userId`). `backend/src/app.ts` (`cookieParser()` antes de los routers).
    `backend/src/controllers/auth.ts` (`GET /me` con `withUser`, §3.7).
  - Tests primero: en `backend/tests/controllers/auth.test.ts`, casos de §6.2 de me (RF-13),
    RF-24 por HTTP (cada paso, combinaciones y comprobante fuera de `X-CSRF-Token`), RNF-1 con
    `now` fijo (3599 / 3600), RF-23, RF-22, RF-15, RF-25, RF-20 (la sesión previa sigue válida
    tras registrar), RF-26 y logout seguido de `me` → `sesión no iniciada`.
  - Hecho cuando: con MongoDB disponible, `npm test`, `npm run typecheck` y `npm run lint` en
    verde; `npm audit` sin altas ni críticas.

- [x] **T9. Archivo de peticiones manuales y verificación de los criterios de finalización.** RF-1..RF-28, RNF-1..RNF-7
  - Crea: `backend/requests/auth.rest` (RT-19: registro → login → `me` con `X-CSRF-Token`
    copiado de la respuesta → logout → `me` 401).
  - No crea más código. Si algo falla, se informa y se vuelve a la tarea correspondiente.
  - Pasos (en `backend/`):
    1. `npm test`, `npm run typecheck` y `npm run lint` en verde.
    2. RF-27: copiar `.env.example` sobre un `.env` de prueba (guardando antes el actual, con
       permiso del usuario) y `npm test` en verde; restaurar el `.env` original.
    3. `git check-ignore -v backend/.env` muestra la regla `.env`; `git status` no lista
       `backend/.env`.
    4. `grep -rnE '\.only\b|only:\s*true' src tests`, `grep -rn '@ts-ignore' src tests` y
       `grep -rnE ':\s*any\b|<any>|as any' src tests` sin resultados; `grep -rn 'console\.' src`
       solo en `src/utils/logger.ts`; `grep -rn 'solo-desarrollo' src` solo en `config.ts`.
    5. `npm audit` sin vulnerabilidades altas ni críticas.
    6. Recorrer los criterios de finalización de la spec y la tabla §6.4 (RNF-5) señalando la
       prueba de cada uno.
  - Hecho cuando: los seis pasos se cumplen y cada criterio de finalización tiene una prueba o
    comprobación en verde.

---

## Cobertura RF/RNF → tareas

| Requisito | Tareas | Verificación principal |
| --- | --- | --- |
| RF-1 | T5, T6 | `unit/userModel.test.ts`; `controllers/users.test.ts` |
| RF-2 | T2, T6 | `unit/passwords.test.ts`; `controllers/users.test.ts` |
| RF-3 | T3, T5, T6 | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-4 | T2, T3, T6 | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-5 | T3, T6 | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-6 | T3, T6 | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-7 | T3, T5, T6, T7 | `unit/credentials.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-8 | T4, T7 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-9 | T2, T7 | `unit/passwords.test.ts`; `controllers/auth.test.ts` |
| RF-10 | T4, T8 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-11 | T4, T8 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-12 | T4, T8 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-13 | T8 | `controllers/auth.test.ts` |
| RF-14 | T4, T7 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-15 | T8 | `controllers/auth.test.ts` |
| RF-16 | T3, T6, T7 | `unit/credentials.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-17 | T1 | `unit/config.test.ts`; `server/process.test.ts` |
| RF-18 | T3, T7 | `unit/credentials.test.ts`; `controllers/auth.test.ts` |
| RF-19 | T3, T6, T7 | `unit/credentials.test.ts`; `controllers/*.test.ts` |
| RF-20 | T6, T8 | `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-21 | T5, T6 | `server/startup.test.ts` (índices); `controllers/users.test.ts` |
| RF-22 | T8 | `controllers/auth.test.ts` |
| RF-23 | T8 | `controllers/auth.test.ts` |
| RF-24 | T4, T8 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-25 | T8 | `controllers/auth.test.ts` |
| RF-26 | T6, T7, T8 | `controllers/auth.test.ts` |
| RF-27 | T1, T9 | `unit/config.test.ts`; `unit/envExample.test.ts`; `server/process.test.ts`; paso 2 de T9 |
| RF-28 | T1 | `unit/config.test.ts`; `unit/envExample.test.ts`; `server/process.test.ts` |
| RNF-1 | T4, T8 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RNF-2 | T4, T7 | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RNF-3 | T4 | `unit/sessionToken.test.ts` |
| RNF-4 | T5, T6, T7, T8 | `unit/userModel.test.ts`; `controllers/*.test.ts` |
| RNF-5 | T2, T6, T7, T8, T9 | tabla §6.4 del plan; paso 6 de T9 |
| RNF-6 | todas, T9 | `npm run typecheck`, `npm run lint`, `npm test`; paso 4 de T9 |
| RNF-7 | T1, T3, T4 | `unit/credentials.test.ts`; mensajes de §2 |
| 001-RF-1, 001-RF-2, 001-RF-9 | T1 | `unit/config.test.ts`; `unit/envExample.test.ts`; `server/process.test.ts` |

---

## Pendientes para el usuario (fuera de `specs/`, no son tareas de implementación)

- Hecho: `JWT_SECRET=solo-desarrollo-no-usar-en-produccion` ya está en el `backend/.env` local (R2 resuelto).
- Decididos: P1 (orden fino de validación, confirmado) y P2 (enumeración por tiempo, limitación aceptada). R3 resuelto: bcrypt nativo 6.0.0.
- `MEMORY.md` y `AGENTS.md`: ver plan §7.
- Hecho: `spec.md` pasada a "implementada" tras T9 en verde y nota de estado de la spec 001
  retirada.
