# Plan 002 — Registro, inicio y cierre de sesión

Estado: implementado
Spec: `specs/002-autenticacion/spec.md` (implementada). Incluye el cambio aprobado de la spec 001
(siete variables con `JWT_SECRET`, RF-1, RF-2 y RF-9 de la 001).
Referencia técnica: `specs/_referencia/001-crear-backend-original.md`, solo en lo que toca a
RF-1..RF-28 y RNF-1..RNF-7 de la 002: secciones 2 (transporte, respuesta del inicio, correo
como identificador, registro como `POST /api/users`, rutas `/api/auth/*`, duplicados como
400), 4.2 (RT-07, RT-08, RT-09, RT-11, RT-16, RT-19), 5.4 (campos de credenciales y perfil
de `User`), 5.6, 5.7 (filas de autenticación, duplicados y datos faltantes), 8 (`auth.test.ts`
y la parte de creación de `users.test.ts`) y 10. Si la referencia y la spec difieren, manda
la spec (por ejemplo: mensajes en minúscula, duplicados con los textos de RF-3, cookie sin
caducidad propia, 401 «token inválido» para usuario inexistente).

Se deja fuera lo excluido por la spec: CORS y proxy, variables de la interfaz, alias `me`,
autorización por dueño (403), conflictos (409), los demás recursos (`availability`,
`accounts`), `requestLogger`, seed y **cualquier cambio en `frontend/`** (spec 007).

Cada sección indica entre corchetes los RF/RNF que cubre. La tabla de trazabilidad final
(sección 9) los reúne todos. "001-RF-n" se refiere a los RF de la spec 001.

---

## 1. Archivos y responsabilidades

Todos los archivos están en `backend/`. Se mantiene la estructura de la spec 001 y se
agregan `models/`, `services/`, `controllers/`, `types/` y `requests/`.

```
backend/
├── .env.example                      (modifica: siete variables)
├── package.json                      (modifica: dependencias nuevas)
├── requests/
│   └── auth.rest                     (nuevo)
├── src/
│   ├── index.ts                      (modifica: createApp(config))
│   ├── app.ts                        (modifica: createApp, cookieParser, routers)
│   ├── server.ts                     (modifica: prepareDatabase tras conectar)
│   ├── controllers/
│   │   ├── auth.ts                   (nuevo: login, me, logout)
│   │   └── users.ts                  (nuevo: POST / = registro)
│   ├── models/
│   │   └── user.ts                   (nuevo)
│   ├── services/
│   │   ├── credentials.ts            (nuevo: validación pura de cuerpos)
│   │   ├── passwords.ts              (nuevo: bcrypt)
│   │   └── sessionToken.ts           (nuevo: JWT, comprobante, cookie, RF-24 pasos 1–4)
│   ├── types/
│   │   └── express.d.ts              (nuevo: request.userId)
│   └── utils/
│       ├── config.ts                 (modifica: JWT_SECRET)
│       └── middleware.ts             (modifica: createWithUser)
└── tests/
    ├── unit/
    │   ├── config.test.ts            (modifica)
    │   ├── envExample.test.ts        (modifica)
    │   ├── credentials.test.ts       (nuevo)
    │   ├── passwords.test.ts         (nuevo)
    │   ├── sessionToken.test.ts      (nuevo)
    │   └── userModel.test.ts         (nuevo, sin base)
    ├── controllers/
    │   ├── app.test.ts               (modifica: createApp)
    │   ├── helpers.ts                (nuevo; no termina en .test.ts)
    │   ├── users.test.ts             (nuevo)
    │   └── auth.test.ts              (nuevo)
    └── server/
        ├── process.test.ts           (modifica: JWT_SECRET en los fixtures + RF-17/27/28)
        └── startup.test.ts           (modifica: createApp + índices)
```

| Archivo | Responsabilidad | RF/RNF |
| --- | --- | --- |
| `package.json` | Dependencias nuevas con versión exacta (§1.1). Scripts sin cambios. | RNF-6 |
| `.env.example` | Siete variables; `JWT_SECRET` con el valor de desarrollo marcado como tal (§1.3). | RF-27, RNF-5; 001-RF-9 |
| `src/utils/config.ts` | `Config.jwtSecret`, `DEV_JWT_SECRET`, `JWT_SECRET` obligatoria en los tres entornos y rechazo del valor de desarrollo en producción (§2.1, §3.1). | RF-17, RF-27, RF-28; 001-RF-1, 001-RF-2 |
| `src/services/credentials.ts` | Funciones puras: lectura segura de campos, normalización de correo y nombre de usuario, `validateRegistration`, `validateLogin`, mensajes (§2.2, §3.2). | RF-3 (clave), RF-4, RF-5, RF-6, RF-7, RF-16, RF-18, RF-19, RNF-7 |
| `src/services/passwords.ts` | `hashPassword` (bcrypt, costo 10) y `verifyPassword` (no compara si supera 72 bytes) (§2.3). | RF-2, RF-9 |
| `src/services/sessionToken.ts` | Constantes de sesión, `createCsrfToken`, `signSessionToken`, `checkSession` (RF-24 pasos 1–4, puro con "ahora" como parámetro), `sessionCookieOptions` (§2.4, §3.3). | RF-8, RF-10, RF-11, RF-12, RF-14, RF-23, RF-24, RNF-1, RNF-2, RNF-3 |
| `src/models/user.ts` | Esquema `User` con `usernameKey` único y `email` único, valores por defecto y `toJSON` en lista blanca (datos públicos); `toOwnUserJson` agrega el correo (§2.5, §3.4). | RF-1, RF-3, RF-7, RF-21, RNF-4 |
| `src/controllers/users.ts` | `createUsersRouter()`: `POST /` (registro) (§3.5). | RF-1..RF-7, RF-16, RF-19, RF-20, RF-21, RF-26 |
| `src/controllers/auth.ts` | `createAuthRouter(options)`: `POST /login`, `GET /me` (con `withUser`), `POST /logout` (§3.6–§3.8). | RF-8, RF-9, RF-13, RF-14, RF-16, RF-18, RF-19, RF-25, RF-26 |
| `src/utils/middleware.ts` | Añade `createWithUser({ jwtSecret, now })`: aplica `checkSession` y el paso 5 de RF-24 (§3.3). | RF-10, RF-11, RF-12, RF-15, RF-22, RF-23, RF-24 |
| `src/types/express.d.ts` | Declaration merging: `Express.Request.userId?: string` (RT-16). | RF-15 |
| `src/app.ts` | `createApp(options)`: `express.json`, `cookieParser()`, `/api/users`, `/api/auth`, `unknownEndpoint`, `errorHandler` (§3.9). Ya no exporta una instancia por defecto. | RF-23, RF-26 |
| `src/server.ts` | `prepareDatabase()` (`await User.init()`, índices únicos) entre conectar y escuchar (§3.10). | RF-21 |
| `src/index.ts` | `startServer(config, { app: createApp(config), log })`. | RF-17, RF-28 (vía `loadConfig`) |
| `requests/auth.rest` | Prueba manual: registro → login → `me` con `X-CSRF-Token` → logout (RT-19). Sin prueba automática. | — |
| `tests/**` | Sección 6. | ver sección 9 |

No se crea `src/domain/` (D3). No se toca `frontend/`.

### 1.1 Dependencias (todas con `npm install --save-exact`) [constitución, principio 1]

Igual que en la spec 001: antes de instalar, el implementador confirma la versión con
`npm view <paquete>@<versión> version`; si no existe, usa la última de la misma versión mayor
y la anota en esta tabla al cerrar la tarea. Tras instalar, `npm audit` sin vulnerabilidades
altas o críticas (si aparece una, se para y se informa, como pasó con mongoose en la 001).

| Paquete | Tipo | Versión propuesta | Justificación (RF) | Tarea |
| --- | --- | --- | --- | --- |
| `bcrypt` | prod | 6.0.0 (mayor 6) | Hash con sal y costo 10, exigido por la constitución (principio 5) y RF-2; `compare` para RF-9. La versión 6 trae binarios precompilados (`node-gyp-build`) y no necesita compilar en Linux x64/arm64. | T2 |
| `@types/bcrypt` | dev | 6.0.0 | Tipos de bcrypt (RNF-6, sin `any`). | T2 |
| `jsonwebtoken` | prod | 9.0.2 | Firma y verificación de la credencial con HS256, expiración y `clockTimestamp` para inyectar "ahora" (RF-8, RF-11, RF-12, RF-24, RNF-1). Es la de la referencia (RT-16). | T4 |
| `@types/jsonwebtoken` | dev | 9.0.10 | Tipos de jsonwebtoken (RNF-6). | T4 |
| `cookie-parser` | prod | 1.4.7 | Lectura de la cookie de la credencial en `request.cookies` (RF-10, RF-23, RF-24). Es la de la referencia (RT-16). Se usa sin secreto (la credencial ya va firmada). | T8 |
| `@types/cookie-parser` | dev | 1.4.9 | Tipos de cookie-parser (RNF-6). | T8 |

No se instalan: `bcryptjs` (D1), `cookie` o `cookie-signature` directos, `cors`, `express-session`,
`passport`, validadores (`zod`, `joi`, `validator`), `uuid` (se usa `crypto.randomUUID`),
`node-mocks-http`.

### 1.2 Lint y tipos

Sin cambios en `eslint.config.js` ni en los `tsconfig`. `src/types/express.d.ts` queda
incluido por `"include": ["src"]` y por `tests/tsconfig.json` (`../src`). La regla
`@typescript-eslint/no-namespace` admite `declare global { namespace Express … }` en archivos
`.d.ts` (`allowDefinitionFiles: true` por defecto). `request.cookies` viene tipado como
`Record<string, any>` por `@types/cookie-parser`: el valor se asigna siempre a una variable
`unknown` antes de usarlo (sin `any` en el código propio, RNF-6).

### 1.3 `.env.example` [RF-27, RNF-5; 001-RF-9]

```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DBNAME=teammatchup
TEST_MONGODB_URI=mongodb://127.0.0.1:27017
TEST_MONGODB_DBNAME=teammatchup_test
# Valor de desarrollo, NO secreto: sirve en desarrollo y prueba; en producción el servidor
# no arranca con él. Para producción, generar uno propio: openssl rand -hex 32
JWT_SECRET=solo-desarrollo-no-usar-en-produccion
# Opcional: dirección de escucha (ej. 0.0.0.0 en el servidor del curso).
# Vacía o comentada: escucha en todas las interfaces.
# HOST=0.0.0.0
```

Copiar este archivo a `backend/.env` sin cambios basta para `npm run dev` y `npm test`
(RF-27). **El `backend/.env` local de cada integrante (ignorado por git) debe recibir la línea
`JWT_SECRET=...`**: sin ella, desde T1 la configuración de prueba es inválida y `npm test`
falla (ver §8, R2: resuelto, el usuario ya la añadió).

---

## 2. Funciones puras

La única función que depende del reloj es la verificación de la credencial: **"ahora" llega
como parámetro** (`nowSeconds`, segundos Unix), igual que "hoy" en el dominio (principio 3).
El reloj real se lee solo en el borde: `createApp` recibe `now: () => number`, por defecto
`() => Math.floor(Date.now() / 1000)`, y las pruebas pueden fijarlo.

Ninguna de estas funciones lee `process.env`, hace E/S ni lanza por casos previstos.

### 2.1 `src/utils/config.ts` (cambios) [RF-17, RF-27, RF-28; 001-RF-1, 001-RF-2]

```ts
export const DEV_JWT_SECRET = "solo-desarrollo-no-usar-en-produccion";

export interface Config {
  nodeEnv: NodeEnv;
  port: number;
  host: string | null;
  db: DatabaseConfig;
  jwtSecret: string;          // nuevo; tal como viene (sin recortar, D18 de la 001)
}
```

Mensaje nuevo (RNF-7): `JWT_SECRET tiene el valor de desarrollo, que no se admite en producción`.

### 2.2 `src/services/credentials.ts` [RF-3, RF-4, RF-5, RF-6, RF-7, RF-16, RF-18, RF-19]

```ts
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // copia de frontend/src/shared/utils/validation.ts
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
export const LIMITS = { emailMax: 254, usernameMin: 3, usernameMax: 24,
                        passwordMin: 8, passwordMaxBytes: 72, displayNameMax: 40 } as const;

export const MESSAGES = {
  emailType: "el correo debe ser un texto",
  usernameType: "el nombre de usuario debe ser un texto",
  passwordType: "la contraseña debe ser un texto",
  displayNameType: "el nombre visible debe ser un texto",
  emailMissing: "falta el correo",
  usernameMissing: "falta el nombre de usuario",
  passwordMissing: "falta la contraseña",
  emailTooLong: "el correo no puede superar 254 caracteres",
  emailFormat: "el correo no tiene un formato válido",
  usernameLength: "el nombre de usuario debe tener entre 3 y 24 caracteres",
  usernameChars: "el nombre de usuario solo admite letras, dígitos, punto, guion y guion bajo",
  passwordTooShort: "la contraseña debe tener al menos 8 caracteres",
  passwordTooLong: "la contraseña no puede superar 72 bytes",
  displayNameTooLong: "el nombre visible no puede superar 40 caracteres",
  emailTaken: "ya existe una cuenta con ese correo",
  usernameTaken: "ese nombre de usuario ya está en uso",
  badCredentials: "correo o contraseña incorrectos",
} as const;

export interface RegistrationInput { email: string; username: string; usernameKey: string;
                                     password: string; displayName: string }
export interface LoginInput { email: string; password: string }
export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function readField(body: unknown, key: string): unknown          // RF-16
export function normalizeEmail(raw: string): string                      // RF-7: trim + toLowerCase
export function usernameKey(username: string): string                    // RF-3: toLowerCase (ASCII)
// passwordByteLength se importa de passwords.ts (§2.3): una sola definición
export function validateRegistration(body: unknown): Validation<RegistrationInput>  // RF-4..RF-7, RF-19
export function validateLogin(body: unknown): Validation<LoginInput>     // RF-7, RF-18, RF-19
```

- `readField`: devuelve `undefined` si `body` no es un objeto no nulo, es un arreglo o no
  tiene la clave como **propiedad propia** (`Object.hasOwn`). Así `toString`, `__proto__` o
  `constructor` heredados nunca cuentan como campos y un cuerpo ausente (tipo de contenido
  distinto de JSON → `request.body` es `undefined` en Express 5) se trata como "todos los
  campos ausentes" (caso límite → "falta el correo").
- Solo se leen las claves `email`, `username`, `password`, `displayName` (registro) y
  `email`, `password` (inicio): todo lo demás se ignora (RF-16).

### 2.3 `src/services/passwords.ts` [RF-2, RF-9]

```ts
export const BCRYPT_COST = 10;
export const MAX_PASSWORD_BYTES = 72;
export function passwordByteLength(password: string): number             // Buffer.byteLength(p, "utf8"), pura
export function hashPassword(password: string): Promise<string>          // bcrypt.hash(p, 10)
export function verifyPassword(password: string, hash: string): Promise<boolean>
```

`verifyPassword` devuelve `false` **sin llamar a `bcrypt.compare`** si
`passwordByteLength(password) > 72` (RF-9). No es pura (bcrypt es costoso y aleatorio), pero
no tiene estado ni reloj.

### 2.4 `src/services/sessionToken.ts` [RF-8, RF-11, RF-12, RF-14, RF-23, RF-24, RNF-1..RNF-3]

```ts
export const SESSION_COOKIE = "token";
export const CSRF_HEADER = "X-CSRF-Token";
export const SESSION_TTL_SECONDS = 3600;
export const JWT_ALGORITHM = "HS256";

export const SESSION_MESSAGES = {
  notLoggedIn: "sesión no iniciada",
  invalidToken: "token inválido",
  expired: "sesión expirada",
} as const;

export interface SessionClaims { id: string; username: string; csrf: string }

export interface SessionCookieOptions {
  httpOnly: true; sameSite: "strict"; secure: boolean; path: "/";
}

export type SessionCheck =
  | { ok: true; userId: string }
  | { ok: false; error: (typeof SESSION_MESSAGES)[keyof typeof SESSION_MESSAGES] };

export function createCsrfToken(): string                                   // crypto.randomUUID()
export function signSessionToken(claims: SessionClaims, secret: string, nowSeconds: number): string
export function checkSession(input: {
  cookie: unknown;              // request.cookies?.token, sin tipar
  csrfHeader: string | undefined; // request.get("X-CSRF-Token")
  secret: string;
  nowSeconds: number;           // "ahora" como parámetro
}): SessionCheck                                                            // RF-24 pasos 1–4
export function sessionCookieOptions(nodeEnv: NodeEnv): SessionCookieOptions // RF-8, RF-14, RNF-2
```

- `signSessionToken`: `jwt.sign({ id, username, csrf, iat: nowSeconds }, secret,
  { algorithm: "HS256", expiresIn: 3600 })`. jsonwebtoken calcula `exp = iat + 3600` a partir
  del `iat` del payload. El payload final tiene exactamente `id`, `username`, `csrf`, `iat` y
  `exp` (RNF-3: nunca el correo).
- `sessionCookieOptions(nodeEnv)` → `{ httpOnly: true, sameSite: "strict", secure: nodeEnv ===
  "production", path: "/" }`. **Sin `maxAge` ni `expires`** (cookie de sesión del navegador,
  RNF-1) y sin `domain`. Es la **única** fuente de atributos para emitir y para borrar (D8).

### 2.5 `src/models/user.ts` (parte pura) [RF-1, RNF-4]

```ts
export const USER_DEFAULTS = { avatarColor: "#6d5efc", bio: "", timezone: "America/Santiago" } as const;
export interface PublicUserJson { id: string; username: string; displayName: string;
  avatarColor: string; bio: string; timezone: string; createdAt: Date }
export interface OwnUserJson extends PublicUserJson { email: string }
export function toOwnUserJson(user: UserDocument): OwnUserJson   // { ...user.toJSON(), email }
```

---

## 3. Algoritmo (pseudocódigo)

### 3.1 `parseConfig` (cambios) [RF-17, RF-27, RF-28; 001-RF-2]

```
... (igual que la 001 hasta PORT)
rawSecret ← env.JWT_SECRET
si isBlank(rawSecret): missing.push("JWT_SECRET")             # RF-17: en los tres entornos,
                                                              # también sin NODE_ENV válida
... (variables de base según entorno, RF-15; igual que la 001)
si nodeEnv = "production" y no isBlank(rawSecret)
   y rawSecret.trim() = DEV_JWT_SECRET:                        # RF-28: recortado
    errors.push("JWT_SECRET tiene el valor de desarrollo, que no se admite en producción")
# en development y test el valor de desarrollo es un valor cualquiera no vacío (RF-27)
missing ← en orden NODE_ENV, PORT, JWT_SECRET, variables de base   # 001-RF-2
...
config.jwtSecret ← rawSecret                                  # sin recortar (D18 de la 001)
```

Ejemplos: sin nada → `faltan variables de entorno obligatorias: NODE_ENV, PORT, JWT_SECRET`;
sin `NODE_ENV` ni `JWT_SECRET` → `NODE_ENV, JWT_SECRET` (RF-17). Con `NODE_ENV` inválida
también se exige `JWT_SECRET`, porque es obligatoria en todos los entornos (001-RF-2).

### 3.2 Validación de cuerpos [RF-4, RF-5, RF-6, RF-7, RF-18, RF-19]

"Texto o ausente" de un campo `f` con mensaje de tipo `m`:
```
v ← readField(body, f)
si v ≠ undefined y v ≠ null y typeof v ≠ "string": error m       # RF-19 (nunca se usa como filtro)
ausente ← v = undefined o v = null o v.trim() = ""               # contraseña: v = "" solamente
```

`validateRegistration(body)` — orden de RF-5; dentro de cada campo, primero el tipo (D9):
```
1. correo:   tipo → ausente ("falta el correo") → e ← v.trim()
             e.length > 254 → emailTooLong                       # longitud antes que formato
             no EMAIL_PATTERN.test(e) → emailFormat
             email ← e.toLowerCase()                             # RF-7 (también la parte local)
2. usuario:  tipo → ausente → u ← v.trim()
             u.length < 3 o > 24 → usernameLength                # longitud antes que caracteres (D9)
             no USERNAME_PATTERN.test(u) → usernameChars
             username ← u; key ← u.toLowerCase()                 # se guarda tal como se escribió
3. contraseña: tipo → v = undefined, null o "" → passwordMissing (sin recortar)
             v.length < 8 → passwordTooShort                     # unidades UTF-16
             passwordByteLength(v) > 72 → passwordTooLong        # no pueden darse a la vez
4. nombre visible: tipo → si ausente: displayName ← username      # RF-6
             si no: d ← v.trim(); d.length > 40 → displayNameTooLong; displayName ← d
devolver ok
```

`validateLogin(body)` [RF-18, RF-19]:
```
correo: tipo → ausente → falta el correo
contraseña: tipo → v = undefined, null o "" → falta la contraseña   # solo espacios NO es ausente
email ← normalizeEmail(v)                                          # sin validar formato ni longitud
```
Si faltan ambos, el primer error es el del correo (orden de revisión).

### 3.3 Verificación de sesión: `checkSession` + `withUser` [RF-10..RF-12, RF-15, RF-22..RF-24]

```
checkSession({ cookie, csrfHeader, secret, nowSeconds }):
  (1) si cookie = undefined o cookie = "":           → notLoggedIn          # RF-10
  (2) si typeof cookie ≠ "string":                   → invalidToken         # p. ej. cookie "j:{…}"
                                                                            # que cookie-parser convierte en objeto
      try payload ← jwt.verify(cookie, secret, { algorithms: ["HS256"], clockTimestamp: nowSeconds })
      catch e:
        si e instanceof TokenExpiredError            → expired              # (3) RF-12
        si no                                        → invalidToken         # (2) RF-11: ilegible, firma,
                                                                            # otro secreto, "none", otro alg
      # jsonwebtoken comprueba la firma y el algoritmo ANTES que la expiración: una credencial
      # expirada y firmada con otro secreto da "token inválido"; expirada y sin comprobante da
      # "sesión expirada" (casos límite).
  (4) si typeof payload ≠ objeto
       o payload.id no es string /^[0-9a-f]{24}$/i                         # sin identificador o mal formado
       o payload.csrf no es string no vacío
       o csrfHeader = undefined o csrfHeader = ""
       o no safeEqual(csrfHeader, payload.csrf):     → invalidToken         # que falten ambos no coincide
  devolver { ok: true, userId: payload.id }

createWithUser({ jwtSecret, now }) → async (request, response, next):
  cookie: unknown ← request.cookies?.[SESSION_COOKIE]                       # RF-23: solo la cookie
  check ← checkSession({ cookie, csrfHeader: request.get(CSRF_HEADER), secret: jwtSecret, nowSeconds: now() })
  si no check.ok: devolver response.status(401).json({ error: check.error })
  (5) si no await User.exists({ _id: check.userId }): 401 invalidToken      # RF-22
  request.userId ← check.userId                                             # RF-15
  next()
```

- `Authorization` y el cuerpo nunca se leen (RF-23). El comprobante solo se lee de la
  cabecera `X-CSRF-Token` (`request.get` no distingue mayúsculas en el nombre); cuerpo,
  consulta, otras cabeceras o cookies no cuentan.
- `safeEqual(a, b)`: `Buffer.from` de ambos; si las longitudes difieren → `false`; si no,
  `crypto.timingSafeEqual` (D10).
- Express 5 envía al `errorHandler` cualquier rechazo inesperado de `User.exists` (500).

### 3.4 Modelo `User` [RF-1, RF-3, RF-7, RF-21, RNF-4]

```
UserSchema = new Schema<UserFields>({
  email:        { type: String, required: true, trim: true, lowercase: true, unique: true },
  username:     { type: String, required: true, trim: true },
  usernameKey:  { type: String, required: true, unique: true },   # username en minúsculas (D5)
  passwordHash: { type: String, required: true },
  displayName:  { type: String, required: true, trim: true, maxlength: 40 },
  avatarColor:  { type: String, default: "#6d5efc" },
  bio:          { type: String, default: "" },
  timezone:     { type: String, default: "America/Santiago" },
}, { timestamps: { createdAt: true, updatedAt: false } })

toJSON.transform(doc, ret) → { id: String(ret._id), username, displayName, avatarColor,
                               bio, timezone, createdAt }               # lista blanca (D6)
toOwnUserJson(user) → { ...user.toJSON(), email: user.email }          # solo al propio usuario
User = model<UserFields>("User", UserSchema)
```

- Los validadores del esquema son una segunda línea; los mensajes al cliente salen de
  `validateRegistration` (RT-08). La longitud mínima de la contraseña se valida antes del
  hash, porque al esquema solo llega el hash.
- `toJSON` nunca incluye `passwordHash`, `usernameKey`, `email`, `_id` ni `__v` (RNF-4). Las
  specs 003+ que serialicen a otros usuarios con `toJSON` no filtran su correo.
- La disponibilidad y las cuentas (referencia 5.4) llegan con las specs 003 y 004.

### 3.5 Registro: `POST /api/users` [RF-1..RF-7, RF-16, RF-19..RF-21, RF-26]

```
handler(request, response):
  v ← validateRegistration(request.body)
  si no v.ok: 400 { error: v.error }                                   # sin consultar la base
  dup ← await duplicateMessage(v.value.email, v.value.usernameKey)
  si dup: 400 { error: dup }                                            # RF-3
  passwordHash ← await hashPassword(v.value.password)                  # RF-2
  try
    user ← await User.create({ email, username, usernameKey, passwordHash, displayName })
                                                                        # campos uno a uno (RT-09, RF-16):
                                                                        # id, hash, fechas, color, bio y zona
                                                                        # del cuerpo se ignoran → defaults (RF-1)
  catch e:
    si e es MongoServerError con code 11000:                           # carrera (RF-21)
      dup ← await duplicateMessage(email, usernameKey)
      si dup: devolver 400 { error: dup }
    throw e                                                             # → errorHandler 500
  201 toOwnUserJson(user)                                               # sin Set-Cookie ni X-CSRF-Token (RF-20)

duplicateMessage(email, key):
  si await User.exists({ email }): devolver emailTaken                  # correo primero (RF-3)
  si await User.exists({ usernameKey: key }): devolver usernameTaken
  devolver null
```

El `try/catch` no solo reenvía: traduce el E11000 de la carrera con la misma prioridad de
RF-3 (permitido por RT-03; D7). El registro no toca `request.cookies` ni escribe cookies, así
que la sesión que el navegador ya tuviera queda igual (RF-20).

### 3.6 Inicio de sesión: `POST /api/auth/login` [RF-7..RF-9, RF-16, RF-18, RF-19, RF-25]

```
v ← validateLogin(request.body)
si no v.ok: 400 { error: v.error }                                      # sin consultar usuarios (RF-18)
user ← await User.findOne({ email: v.value.email })                    # string ya normalizado
si user = null o no await verifyPassword(v.value.password, user.passwordHash):
    401 { error: "correo o contraseña incorrectos" }                    # mismo mensaje (RF-9)
csrf ← createCsrfToken()
token ← signSessionToken({ id: user.id, username: user.username, csrf }, jwtSecret, now())
response.cookie(SESSION_COOKIE, token, sessionCookieOptions(nodeEnv))   # reemplaza la anterior (RF-25)
response.setHeader(CSRF_HEADER, csrf)
200 toOwnUserJson(user)                                                 # sin hash, token ni csrf (RF-8)
```

No se escribe en la base: la credencial es sin estado (RNF-5).

### 3.7 Sesión actual: `GET /api/auth/me` [RF-13, RF-26]

```
withUser → user ← await User.findById(request.userId)
si user = null: 401 { error: "token inválido" }                         # borrado entre ambos pasos (RF-22)
200 toOwnUserJson(user)                                                 # datos guardados ahora mismo
```

### 3.8 Cierre de sesión: `POST /api/auth/logout` [RF-14, RF-26]

```
response.clearCookie(SESSION_COOKIE, sessionCookieOptions(nodeEnv))     # mismos atributos que al emitir
200 { message: "sesión cerrada" }                                       # sin withUser: no revisa nada
```

En Express 5, `clearCookie` emite `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;
HttpOnly; SameSite=Strict` (más `Secure` en producción) e ignora `maxAge`.

### 3.9 `createApp(options)` (orden) [RF-23, RF-26]

```ts
export interface AppOptions {
  jwtSecret: string;
  nodeEnv: NodeEnv;
  now?: () => number;      // segundos Unix; por defecto el reloj real
}
```
```
app ← express()
1. express.json({ limit: 102_400, strict: true })        # sin cambios (001)
2. cookieParser()                                       # sin secreto
3. app.use("/api/users", createUsersRouter())
   app.use("/api/auth", createAuthRouter({ jwtSecret, nodeEnv, now }))
4. unknownEndpoint                                      # GET /api/auth/login, etc. → 404 (001-RF-4)
5. errorHandler
```

`index.ts`: `startServer(result.config, { app: createApp(result.config), log: logger })`.
Las pruebas usan `createApp(testConfig())` o `createApp({ ...testConfig(), nodeEnv: "production" })`
para RNF-2.

### 3.10 `startServer` (cambio) [RF-21; 001-RF-14]

```
connectDatabase(config.db)          # igual que la 001 (mensaje de base no disponible)
try await prepareDatabase()         # User.init(): crea los índices únicos de email y usernameKey
catch → await mongoose.disconnect(); throw new StartupError("no se pudieron preparar los índices de la base de datos")
listen(...)                         # igual que la 001
```

Así los índices existen antes de aceptar la primera petición (001-RF-14), y RF-21 no depende
de que Mongoose termine de crearlos en segundo plano. Las pruebas de `controllers/` llaman a
`User.init()` en su `before` por la misma razón.

---

## 4. Interfaz

Sin interfaz gráfica ni cambios en `frontend/`. Superficie HTTP:

| Método y ruta | Pública | Cuerpo aceptado | Respuesta correcta | Errores |
| --- | --- | --- | --- | --- |
| `POST /api/users` | sí | `email`, `username`, `password`, `displayName?` | 201 datos propios | 400 (RF-3..RF-6, RF-19) |
| `POST /api/auth/login` | sí | `email`, `password` | 200 datos propios + `Set-Cookie: token=…; Path=/; HttpOnly; SameSite=Strict[; Secure]` + `X-CSRF-Token: <uuid>` | 400 (RF-18, RF-19), 401 `correo o contraseña incorrectos` |
| `GET /api/auth/me` | no | — (cookie `token` + cabecera `X-CSRF-Token`) | 200 datos propios | 401 `sesión no iniciada` / `token inválido` / `sesión expirada` |
| `POST /api/auth/logout` | sí | — | 200 `{ "message": "sesión cerrada" }` + `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict[; Secure]` | — |

Datos propios: `{ id, username, email, displayName, avatarColor, bio, timezone, createdAt }`
(`createdAt` en ISO 8601). Todos los errores: `{ "error": "<mensaje>" }` (spec 001).

Arranque: con `JWT_SECRET` ausente o solo de espacios, o igual al valor de desarrollo en
producción, el proceso escribe en la salida de error el mensaje de configuración inválida y
termina con código 1 (siempre visible, también en prueba; D10 de la 001).

---

## 5. Decisiones técnicas

| # | Decisión | Alternativa descartada y por qué | RF |
| --- | --- | --- | --- |
| D1 | `bcrypt` 6 (nativo, con binarios precompilados). | `bcryptjs` (JS puro, sin compilación): la constitución y la referencia nombran bcrypt; cambiarlo requeriría una decisión del usuario. Confirmado por el usuario: bcrypt nativo 6.0.0 (§8, R3 resuelto). | RF-2 |
| D2 | `jsonwebtoken` con `algorithms: ["HS256"]` y `clockTimestamp` inyectado. | `jose` (moderna, ESM): no es la del curso y su verificación es asíncrona; implementar HMAC a mano con `node:crypto`: reinventa la validación de cabecera y algoritmo, justo donde está el ataque `none`. | RF-11, RF-12, RF-24, RNF-1 |
| D3 | Lógica pura de autenticación en `src/services/` (y la de configuración en `utils/`, como en la 001). | `src/domain/`: es la copia del dominio del frontend (D16 de la 001). Las funciones siguen cumpliendo el principio 3: puras, sin HTTP y con "ahora" como parámetro. | RF-3..RF-7, RF-24 |
| D4 | El paso RF-24 (1–4) es una función pura `checkSession` que devuelve el mensaje; `withUser` solo añade el paso 5 (base) y responde. Los errores de JWT **no** pasan por el `errorHandler`. | Dejar que `jwt.verify` lance y mapear `JsonWebTokenError`/`TokenExpiredError` en el `errorHandler` (referencia 5.7): el orden de RF-24 exige revisar el comprobante después de la expiración y antes del usuario, y un `errorHandler` genérico no puede distinguir "sin comprobante" de "firma inválida" sin acoplarse a la autenticación. | RF-10..RF-12, RF-24 |
| D5 | Unicidad del nombre de usuario sin distinguir mayúsculas con un **campo normalizado** `usernameKey` (minúsculas) con índice único; el correo ya se guarda en minúsculas y tiene índice único propio. La base garantiza que de dos inserciones simultáneas solo una gana. | Índice único sobre `username` con `collation: { locale: "en", strength: 2 }`: cada consulta de duplicados debe repetir la misma collation (si se olvida, no usa el índice y compara distinto), y el comportamiento depende de las reglas ICU. El campo normalizado es explícito, se prueba con una función pura y no depende de la collation. | RF-3, RF-21 |
| D6 | `toJSON` en **lista blanca** con los datos públicos (sin correo); `toOwnUserJson` añade el correo solo en las respuestas al propio usuario. | `toJSON` que borra campos (referencia RT-07): un campo nuevo quedaría expuesto por defecto; incluir el correo en `toJSON`: se filtraría al serializar a otros usuarios en las specs 003–006. | RF-1, RF-13, RNF-4 |
| D7 | Prevalidación de duplicados (correo primero) + traducción del E11000 de la carrera **repitiendo la misma consulta**, en el controlador. | Mapear E11000 en el `errorHandler` con `keyValue` (referencia 5.7): no aplica la prioridad "si se repiten los dos, el del correo" (MongoDB informa el primer índice que choca) y su texto genérico contradice RF-3. Solo E11000 sin prevalidación: daría el mensaje según el índice que falle primero. | RF-3, RF-21 |
| D8 | Una sola función `sessionCookieOptions(nodeEnv)` para `response.cookie` y `response.clearCookie`; sin `maxAge`, `expires` ni `domain`; `path: "/"` explícito. | Repetir el objeto en login y logout (referencia 5.6): un cambio en uno solo haría que el navegador no borre la cookie. Usar `maxAge: 3600` (como suele hacerse): contradice RNF-1 (cookie sin caducidad propia). | RF-8, RF-14, RNF-1, RNF-2 |
| D9 | Orden fino de RF-5 cuando la spec no lo fija: dentro de cada campo, **tipo (RF-19) → ausente → reglas**; en el nombre de usuario, **longitud antes que caracteres**. | Revisar todos los tipos antes que cualquier otro error: alteraría "se responde con el primer error en el orden correo, nombre de usuario, contraseña, nombre visible". **Confirmada por el usuario (§8, P1).** | RF-5, RF-19 |
| D10 | Comparación del comprobante con `crypto.timingSafeEqual` (tras igualar longitudes). | `===`: funciona, pero filtra por tiempo cuántos caracteres coinciden. Coste nulo, sin dependencia. | RF-24 |
| D11 | `createApp(options)` recibe secreto, entorno y reloj; `app.ts` deja de exportar una instancia por defecto. | Leer `process.env`/`loadConfig()` dentro de `app.ts` o de los middlewares: rompe D2 de la 001 (sin efectos al importar) e impide probar la cookie con la configuración de producción (RNF-2) sin tocar el entorno del proceso. | RF-8, RNF-2 |
| D12 | `request.userId` con declaration merging en `src/types/express.d.ts` (RT-16). | `response.locals.userId`: `Locals` es `Record<string, any>` y obligaría a leer un `any`. | RF-15 |
| D13 | `cookie-parser` sin secreto, y toda lectura de `request.cookies.token` pasa por `unknown` y un `typeof === "string"`. | Cookies firmadas de cookie-parser: la credencial ya está firmada; duplicaría el secreto. Analizar la cabecera `Cookie` a mano: más código y casos (comillas, codificación) sin beneficio. | RF-23, RF-24 |
| D14 | Índices creados con `User.init()` en `startServer` antes de escuchar. | Confiar en el `autoIndex` en segundo plano de Mongoose: durante los primeros instantes (o en una base nueva de pruebas) dos registros simultáneos podrían crear dos usuarios. | RF-21 |
| D15 | Login no hace un `bcrypt.compare` "de relleno" cuando el correo no existe. | Comparar contra un hash ficticio para igualar tiempos: la spec solo exige el mismo código y mensaje (RF-9) y deja fuera el límite de intentos; añadirlo sería comportamiento sin RF. **Confirmada por el usuario: limitación aceptada (§8, P2).** | RF-9 |
| D16 | El identificador de la credencial debe ser un ObjectId en hexadecimal de 24 caracteres; si no, "token inválido" (paso 4). | Pasarlo tal cual a `User.exists`: un id mal formado lanzaría `CastError` → 500. | RF-22, RF-24 |

---

## 6. Estrategia de pruebas

### 6.1 Marco

- `node:test` + `node:assert/strict` + `supertest` (y `supertest.agent` para guardar la
  cookie entre peticiones), como en la 001. `npm test` sin cambios (en serie, `NODE_ENV=test`).
- Tests primero en cada tarea (principio 4).
- Base: solo la de prueba (`testConfig()` de `tests/server/helpers.ts`). Cada archivo de
  `controllers/` que usa la base: `before` → `connectDatabase(testConfig().db)` y
  `await User.init()`; `beforeEach` → `User.deleteMany({})`; `after` → `mongoose.disconnect()`.
- `tests/controllers/helpers.ts` (nuevo, no es prueba):
  - `authApp(overrides?)` → `createApp({ ...testConfig(), ...overrides })`.
  - `registerUser(app, data?)` → `POST /api/users` con datos válidos por defecto.
  - `loginAs(app, email, password)` → `{ agent, csrf, cookie }`.
  - `forgeToken(payload, { secret?, iat?, algorithm? })` → credencial hecha a mano con
    `jsonwebtoken` (otro secreto, expirada, sin `csrf`, sin `id`) y `noneToken(payload)`
    (cabecera `{"alg":"none"}` codificada a mano, sin firma).
  - `parseSetCookie(header)` → `{ name, value, attributes: Map }` para revisar atributos.
- Los tiempos límite de RNF-1 (3599/3600 s) se prueban en `unit/sessionToken.test.ts` con
  `nowSeconds` fijo; en HTTP se usa `createApp({ ..., now: () => T })` con `T` fijo, sin
  depender del reloj real.

### 6.2 Casos por archivo

**`tests/unit/config.test.ts`** (modifica; los fixtures `devEnv`/`prodEnv`/`testEnv` y el `.env`
temporal de `loadConfig` añaden `JWT_SECRET`)
- RF-17 / 001-RF-2: matriz por entorno con `JWT_SECRET` ausente, `""` y `"   "` → la nombra.
  `{ PORT: "3001" }` → `NODE_ENV, JWT_SECRET`; `{ NODE_ENV: "  " }` → `NODE_ENV, PORT, JWT_SECRET`.
- RF-28: `production` con `DEV_JWT_SECRET`, `"  " + DEV_JWT_SECRET + " "` → error que nombra
  `JWT_SECRET` y "producción"; `production` con otro valor → válida y `jwtSecret` igual al valor.
- RF-27: `development` y `test` con `DEV_JWT_SECRET` → válidas.
- 001-RF-1: `config.jwtSecret` sale del objeto recibido (sin recortar).
- Se ajustan las aserciones exactas existentes que cambian por la variable nueva.

**`tests/unit/envExample.test.ts`** (modifica) [001-RF-9, RF-27, RF-28]
- Siete claves exactas (con `JWT_SECRET`), `JWT_SECRET === DEV_JWT_SECRET`, línea de
  comentario que lo marca como valor de desarrollo (`/desarrollo/i` antes de la clave);
  `parseConfig` válida en `development` y `test`; en `production` inválida con el mensaje
  de RF-28.

**`tests/unit/credentials.test.ts`** [RF-3..RF-7, RF-16, RF-18, RF-19]
- `readField`: claves heredadas (`toString`, `constructor`) → `undefined`; arreglo, `null`,
  `undefined`, texto → `undefined`.
- Registro: cada mensaje de RF-5, RF-4, RF-6 y RF-19 con su caso mínimo; orden con varios
  inválidos (correo y usuario inválidos → error del correo); `"  ab  "` → longitud; correo de
  254 válido / 255 → `emailTooLong` aunque además tenga formato inválido; contraseña de 7 →
  corta; 72 bytes (36 "ñ"; 18 emojis) → válida; 73 bytes (36 "ñ" + "a") → `passwordTooLong`;
  contraseña de 8 espacios → válida y sin recortar; `displayName` ausente/espacios → nombre de
  usuario; 40 tras recortar → válido; 41 → error; `josé@Dominio.CL` → `josé@dominio.cl`;
  `"  Ana  "` → `username "Ana"`, `usernameKey "ana"`; campos extra ignorados (`id`,
  `passwordHash`, `timezone`, …) no aparecen en `value`.
- RF-19: número, booleano, arreglo, objeto (`{ "$ne": null }`) en cada campo → mensaje de tipo;
  `null` → ausente.
- Inicio: faltan ambos → correo; `""`, `null`, espacios en correo → falta; contraseña `""`/`null`
  → falta; contraseña de espacios → válida; correo sin formato o de 300 caracteres → válido
  (normalizado).
- RNF-7: cada mensaje de `MESSAGES` empieza en minúscula y no termina en punto.

**`tests/unit/passwords.test.ts`** [RF-2, RF-9, RNF-5]
- `hashPassword` → distinto de la contraseña, empieza por `$2b$10$`; dos hashes de la misma
  contraseña son distintos (sal); `verifyPassword` correcta → `true`, incorrecta → `false`.
- RF-9: con el hash de una contraseña de 72 bytes, la misma + `"a"` → `false` (con bcrypt a
  secas sería `true`: se documenta en la prueba comprobando que `bcrypt.compare` sí la
  aceptaría); `mock.method(bcrypt, "compare")` no se llama si supera 72 bytes.

**`tests/unit/sessionToken.test.ts`** [RF-8, RF-10..RF-12, RF-14, RF-24, RNF-1..RNF-3]
- `signSessionToken` → `jwt.verify` con el secreto da `id`, `username`, `csrf`, `iat = T`,
  `exp = T + 3600`; claves exactas `["csrf","exp","iat","id","username"]` (RNF-3).
- `checkSession`, un caso por paso y combinación: cookie `undefined` y `""` → `sesión no
  iniciada`; cookie objeto, texto cualquiera, firma alterada (un carácter cambiado), otro
  secreto, `alg: none`, `HS512` con el mismo secreto → `token inválido`; `T + 3599` → ok,
  `T + 3600` → `sesión expirada` (RNF-1); expirada sin `csrf` → `sesión expirada`; expirada y
  otro secreto → `token inválido`; sin `id`, `id` mal formado, sin `csrf` en el payload, y
  sin `csrf` en ningún lado → `token inválido`; cabecera ausente, `""` o distinta →
  `token inválido`; correcta → `{ ok: true, userId }`.
- `sessionCookieOptions`: `development`/`test` → `secure: false`; `production` → `true`;
  nunca `maxAge`/`expires`/`domain`.
- `createCsrfToken` → dos llamadas distintas, formato UUID.

**`tests/unit/userModel.test.ts`** (sin base) [RF-1, RNF-4]
- `new User({...})` con solo los campos obligatorios → defaults `#6d5efc`, `""`,
  `America/Santiago`; `toJSON()` con claves exactas públicas (sin `passwordHash`, `usernameKey`,
  `email`, `_id`, `__v`); `toOwnUserJson` añade `email`.

**`tests/controllers/app.test.ts`** (modifica) — mismos casos de la 001 con `createApp(...)`
(sin base). Añade: `GET /api/auth/login` y `PUT /api/users` → 404 `endpoint desconocido`.

**`tests/controllers/users.test.ts`** (base de prueba) [RF-1..RF-7, RF-16, RF-19..RF-21, RNF-4, RNF-5]
- RF-1: 201, cuerpo con claves exactas de datos propios, defaults aunque el cuerpo traiga
  `timezone`, `avatarColor`, `bio`, `id`, `passwordHash`, `createdAt` (RF-16); un usuario más
  en la base.
- RF-2 / RNF-5: `passwordHash` guardado ≠ contraseña, `$2b$10$`; dos usuarios con la misma
  contraseña → hashes distintos; la respuesta no contiene el hash (RNF-4).
- RF-3: correo repetido (también con mayúsculas y espacios) → 400 correo; `Ana` y después
  `ana` → 400 usuario; ambos repetidos → 400 correo; `Ana` se devuelve como `Ana`; la base no
  cambia en ningún 400.
- RF-4, RF-5, RF-6, RF-19: un caso HTTP por mensaje (los límites finos están en unit) incluidos
  correo de 254/255, contraseña de 72/73 bytes con "ñ", `{"$ne": null}`; `text/plain` →
  400 `falta el correo`; ningún 400 crea usuarios.
- RF-7: correo `  JOSÉ@Dominio.CL ` → guardado y devuelto `josé@dominio.cl`.
- RF-20: la respuesta no tiene `Set-Cookie` ni `X-CSRF-Token`.
- RF-21: `Promise.all` de dos registros con el mismo correo → `[201, 400]` ordenados y un solo
  usuario; lo mismo con `Ana`/`ana`; además cinco simultáneos iguales → un 201, cuatro 400,
  ningún 500.

**`tests/controllers/auth.test.ts`** (base de prueba) [RF-8..RF-16, RF-18, RF-19, RF-22..RF-26, RNF-1..RNF-5]
- Login (RF-8): 200, datos propios; `X-CSRF-Token` presente; la cookie `token` verifica con
  `testConfig().jwtSecret` y su `csrf` es el de la cabecera; ni la credencial ni el
  comprobante ni `passwordHash` aparecen en el cuerpo; atributos `HttpOnly`, `SameSite=Strict`,
  `Path=/`, sin `Max-Age` ni `Expires`, sin `Secure`. Con `authApp({ nodeEnv: "production" })`
  → `Secure` (RNF-2).
- RF-7: correo en mayúsculas y con espacios inicia sesión.
- RF-9: correo inexistente y contraseña incorrecta → mismo 401 y mismo cuerpo; contraseña de
  72 bytes + 1 carácter → 401; contraseña solo de espacios incorrecta → 401; correo de formato
  inválido o de más de 254 → 401.
- RF-18 / RF-19: sin correo, sin contraseña, sin ambos, `""`, `null`, correo de espacios →
  400 con el mensaje; `{"email": {"$ne": null}}` → 400 `el correo debe ser un texto`;
  contraseña objeto → 400; con `mock.method(User, "findOne")` se comprueba que no se consultó.
- RF-16: campos extra en el login no cambian nada.
- RNF-5 (sin estado): login no cambia la cantidad de documentos ni ningún campo del usuario.
- Me (RF-13): con agente y `X-CSRF-Token` → 200 datos propios; tras cambiar `displayName`
  directamente en la base, `me` devuelve el valor nuevo; dos usuarios: cada uno recibe el suyo.
- RF-24 vía HTTP (con un caso por paso): sin cookie → `sesión no iniciada`; cookie vacía →
  `sesión no iniciada`; cookie `abc` → `token inválido`; alterada; otro secreto; `none`;
  expirada (`iat` 2 h atrás) → `sesión expirada`; expirada sin `csrf` → `sesión expirada`;
  expirada con otro secreto → `token inválido`; sin `csrf` dentro y sin cabecera →
  `token inválido`; cabecera ausente, vacía o de otra sesión → `token inválido`; comprobante
  correcto enviado en el cuerpo, en `?csrf=`, en `X-CSRF` o en una cookie → `token inválido`.
- RNF-1 vía HTTP: `authApp({ now: () => T + 3599 })` acepta una credencial emitida en `T`;
  `now: () => T + 3600` → `sesión expirada`.
- RF-23: credencial válida solo en `Authorization: Bearer` → `sesión no iniciada`; en el cuerpo
  → ignorada.
- RF-22: credencial válida de un usuario borrado de la base → `token inválido`.
- RF-15: credencial del usuario A con `?id=` / cuerpo `{ id: B }` → `me` devuelve A.
- RF-25: segundo login con el mismo agente (mismo u otro usuario) → `Set-Cookie` nuevo; el
  comprobante anterior con la cookie nueva → `token inválido`; el nuevo → 200 con el usuario
  del segundo login.
- RF-20: agente con sesión que registra otro usuario → la respuesta no trae cookie ni cabecera
  y `me` con el comprobante anterior sigue respondiendo 200 con el usuario original.
- Logout (RF-14): sin sesión; con credencial alterada sin `X-CSRF-Token`; con credencial
  expirada → 200 `{ message: "sesión cerrada" }` y `Set-Cookie` de borrado con `Path=/`,
  `HttpOnly`, `SameSite=Strict`, `Expires` en 1970; los mismos atributos que en la emisión
  (salvo `Expires`); en producción incluye `Secure`. Tras logout con el agente, `me` →
  `sesión no iniciada`.
- RF-26: registro, login y logout responden sin cookie; `me` sin cookie → 401.
- RNF-4: ninguna respuesta de este archivo contiene `passwordHash` ni el correo de otro usuario.

**`tests/server/startup.test.ts`** (modifica) [RF-21]
- Usa `createApp(testConfig())`. Añade: tras `startServer`, `User.collection.indexes()` incluye
  índices únicos sobre `email` y `usernameKey`.

**`tests/server/process.test.ts`** (modifica) [RF-17, RF-27, RF-28]
- `DB_VARS` y los entornos de los casos que arrancan añaden `JWT_SECRET` (con el valor de
  desarrollo en `development` y `test`, que demuestra RF-27).
- RF-17: en cada entorno, sin `JWT_SECRET` y con `"   "` → código ≠ 0 y mensaje que la nombra;
  sin `NODE_ENV` ni `JWT_SECRET` → nombra ambas.
- RF-28: `production` con `JWT_SECRET` igual al valor de desarrollo, con y sin espacios
  alrededor → código ≠ 0 y mensaje con `JWT_SECRET` y "producción" (falla antes de conectar,
  sin base).

### 6.3 Verificaciones fuera de `npm test` (validación)

- `npm run typecheck` y `npm run lint` en verde; búsqueda de `.only`, `any` y `@ts-ignore`
  sin resultados (RNF-6).
- `git check-ignore -v backend/.env` sigue mostrando la regla `.env` (RNF-5, secreto fuera del
  repositorio); `grep -rn "solo-desarrollo" src` solo aparece en `config.ts`.
- Copiar `backend/.env.example` a un `.env` temporal sin cambios y ejecutar `npm test` en
  verde (RF-27, criterio de finalización).
- `npm audit` sin vulnerabilidades altas o críticas.
- Recorrido manual de `requests/auth.rest` (RT-19).

### 6.4 Qué mitiga cada pieza (RNF-5) → prueba

| Pieza (referencia 5.6) | Prueba que la demuestra |
| --- | --- |
| JWT firmado con `JWT_SECRET` | `auth.test.ts` y `sessionToken.test.ts`: credencial alterada / otro secreto / `none` → 401 `token inválido` |
| JWT sin estado | `auth.test.ts`: login no crea ni modifica documentos |
| Cookie `HttpOnly` | `auth.test.ts`: atributo `HttpOnly` en `Set-Cookie` |
| Comprobante anti-CSRF | `auth.test.ts`: `me` sin `X-CSRF-Token` o con el de otra sesión → 401 |
| `SameSite=Strict` | `auth.test.ts`: atributo `SameSite=Strict` |
| `Secure` en producción | `auth.test.ts`: `authApp({ nodeEnv: "production" })` → `Secure`; en test, sin `Secure` |
| Expiración de 1 h | `sessionToken.test.ts` (3599/3600) y `auth.test.ts` (expirada → `sesión expirada`) |
| bcrypt con sal y costo 10 | `passwords.test.ts` y `users.test.ts`: hash ≠ contraseña y distinto entre dos usuarios |
| Mismo 401 ante credenciales incorrectas | `auth.test.ts`: correo inexistente y contraseña incorrecta, cuerpos idénticos |
| Sin hash en las respuestas | `userModel.test.ts`, `users.test.ts`, `auth.test.ts` (RNF-4) |
| Identidad desde la credencial | `auth.test.ts` (RF-15): `id` ajeno en cuerpo/consulta no cambia el usuario |
| Secreto real fuera del repositorio | `git check-ignore` (6.3) + `config.test.ts`/`process.test.ts` (RF-28) |

---

## 7. Notas para otros documentos (no se editan en esta fase)

- `AGENTS.md`: la estructura del backend pasa a incluir `controllers/`, `models/`, `services/`,
  `types/` y `requests/`; `domain/` sigue reservado para la copia del dominio (specs 003+).
- `MEMORY.md`: ver las notas de la respuesta del planificador.
- `specs/001-crear-backend/plan.md` §1.4 y `tests/unit/envExample.test.ts` describen seis
  variables; este plan los sustituye (T1). La nota de estado de la spec 001 se puede retirar
  cuando T1 quede en verde.

---

## 8. Decisiones confirmadas y riesgos

- **P1 (D9) — confirmada.** Orden fino de validación: "tipo (RF-19) → ausente → reglas"
  dentro de cada campo y, en el nombre de usuario, longitud antes que caracteres
  (`"a!"` → "debe tener entre 3 y 24 caracteres"). El usuario lo confirmó tal como se propone.
- **P2 (D15) — confirmada como limitación aceptada.** El login responde más rápido cuando el
  correo no existe (no ejecuta bcrypt), lo que permite saber por tiempo si un correo existe.
  El usuario lo acepta como limitación conocida, coherente con la enumeración por registro
  que la spec ya admite (RF-3). No se añade ningún RF.
- **R1.** `app.ts` deja de exportar `app` por defecto (D11): cambian `index.ts`,
  `controllers/app.test.ts` y `server/startup.test.ts` de la spec 001 (pruebas existentes
  modificadas, no eliminadas).
- **R2 — resuelto.** El usuario ya añadió `JWT_SECRET=solo-desarrollo-no-usar-en-produccion`
  a su `backend/.env` local. Ningún agente toca `.env`.
- **R3 (D1) — resuelto.** El usuario confirma `bcrypt` nativo 6.0.0, no `bcryptjs`.
- **R4 (D14).** `startServer` añade un paso no descrito en la spec 001 (preparar índices) con
  un mensaje nuevo de fallo; no cambia ningún RF de la 001.

---

## 9. Trazabilidad

| Requisito | Archivo(s) | Prueba(s) |
| --- | --- | --- |
| RF-1 | `controllers/users.ts`, `models/user.ts` | `unit/userModel.test.ts`; `controllers/users.test.ts` |
| RF-2 | `services/passwords.ts`, `controllers/users.ts` | `unit/passwords.test.ts`; `controllers/users.test.ts` |
| RF-3 | `services/credentials.ts` (`usernameKey`), `controllers/users.ts`, `models/user.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-4 | `services/credentials.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-5 | `services/credentials.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-6 | `services/credentials.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts` |
| RF-7 | `services/credentials.ts`, `models/user.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-8 | `controllers/auth.ts`, `services/sessionToken.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-9 | `controllers/auth.ts`, `services/passwords.ts` | `unit/passwords.test.ts`; `controllers/auth.test.ts` |
| RF-10 | `services/sessionToken.ts`, `utils/middleware.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-11 | `services/sessionToken.ts`, `utils/middleware.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-12 | `services/sessionToken.ts`, `utils/middleware.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-13 | `controllers/auth.ts` (`me`) | `controllers/auth.test.ts` |
| RF-14 | `controllers/auth.ts` (`logout`), `services/sessionToken.ts` (`sessionCookieOptions`) | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-15 | `utils/middleware.ts`, `types/express.d.ts` | `controllers/auth.test.ts` |
| RF-16 | `services/credentials.ts` (`readField`), `controllers/users.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-17 | `utils/config.ts` | `unit/config.test.ts`; `server/process.test.ts` |
| RF-18 | `services/credentials.ts`, `controllers/auth.ts` | `unit/credentials.test.ts`; `controllers/auth.test.ts` |
| RF-19 | `services/credentials.ts` | `unit/credentials.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-20 | `controllers/users.ts` | `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RF-21 | `models/user.ts` (índices), `controllers/users.ts` (E11000), `server.ts` (`prepareDatabase`) | `controllers/users.test.ts`; `server/startup.test.ts` |
| RF-22 | `utils/middleware.ts`, `controllers/auth.ts` | `controllers/auth.test.ts` |
| RF-23 | `utils/middleware.ts`, `app.ts` (`cookieParser`) | `controllers/auth.test.ts` |
| RF-24 | `services/sessionToken.ts` (`checkSession`), `utils/middleware.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RF-25 | `controllers/auth.ts` (`login`) | `controllers/auth.test.ts` |
| RF-26 | `app.ts`, `controllers/auth.ts`, `controllers/users.ts` | `controllers/auth.test.ts` |
| RF-27 | `utils/config.ts`, `.env.example` | `unit/config.test.ts`; `unit/envExample.test.ts`; `server/process.test.ts`; 6.3 |
| RF-28 | `utils/config.ts` | `unit/config.test.ts`; `unit/envExample.test.ts`; `server/process.test.ts` |
| RNF-1 | `services/sessionToken.ts` | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RNF-2 | `services/sessionToken.ts`, `app.ts` (D11) | `unit/sessionToken.test.ts`; `controllers/auth.test.ts` |
| RNF-3 | `services/sessionToken.ts` | `unit/sessionToken.test.ts` |
| RNF-4 | `models/user.ts` (D6) | `unit/userModel.test.ts`; `controllers/users.test.ts`; `controllers/auth.test.ts` |
| RNF-5 | ver §6.4 | ver §6.4 |
| RNF-6 | todos | `npm run typecheck`, `npm run lint`, `npm test`; búsquedas de 6.3 |
| RNF-7 | `services/credentials.ts`, `services/sessionToken.ts`, `utils/config.ts` | `unit/credentials.test.ts` (formato de mensajes) |
| 001-RF-1, 001-RF-2 | `utils/config.ts` | `unit/config.test.ts`; `server/process.test.ts` |
| 001-RF-9 | `.env.example` | `unit/envExample.test.ts` |
