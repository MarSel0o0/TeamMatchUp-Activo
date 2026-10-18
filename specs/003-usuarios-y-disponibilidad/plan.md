# Plan 003 — Perfil de usuario y disponibilidad

Estado: aprobado
Spec: `specs/003-usuarios-y-disponibilidad/spec.md` (aprobada).
Referencia técnica: `specs/_referencia/001-crear-backend-original.md`, solo en lo que toca a
RF-1..RF-22 y RNF-1..RNF-5 de la 003: sección 2 (alias `me` resuelto en el servidor, recurso
ajeno → 403), 4.2 (RT-07 `toJSON` sin `availability`, RT-09 campos uno a uno, RT-10
actualizaciones con validación), 5.4 (campo `availability` de `User`), 5.6 (autorización y
`resolveMe`), 5.7 (filas 400 id, 403, 404) y 8 (`users.test.ts`, salvo la cascada). Si la
referencia y la spec difieren, manda la spec: mensajes propios (RF-5, RF-8, RF-10, RF-14 a
RF-17), nombre visible vacío → 400 (no se usa el nombre de usuario), zona horaria validada
contra `zone.tab`, 403 sin comprobar existencia, sin cascada (specs 004 y 006) y RT-10
sustituido por una actualización atómica (D4).

Fuera de este plan: cuentas de juego, sesiones y su cascada, `seed`, `src/domain/` y
**cualquier cambio en `frontend/`** (spec 007).

Cada sección indica entre corchetes los RF/RNF que cubre. La sección 9 reúne la
trazabilidad completa, incluidos los criterios de finalización. "002-RF-n" se refiere a los
RF de la spec 002.

---

## 1. Archivos y responsabilidades

Todo en `backend/`. Se mantiene la estructura de las specs 001 y 002.

```
backend/
├── requests/
│   └── users.rest                      (nuevo)
├── src/
│   ├── app.ts                          (modifica: createUsersRouter(options))
│   ├── controllers/
│   │   └── users.ts                    (modifica: listado, obtener, actualizar, eliminar, disponibilidad)
│   ├── models/
│   │   └── user.ts                     (modifica: availability, toPublicUserJson)
│   ├── services/
│   │   ├── userTarget.ts               (nuevo: ruta, decodificación, `me`, formato, propiedad)
│   │   ├── profile.ts                  (nuevo: validación pura de la actualización del perfil)
│   │   ├── availability.ts             (nuevo: bloques horarios y reemplazo)
│   │   ├── timezones.ts                (nuevo: isValidTimezone)
│   │   └── zoneTab.ts                  (nuevo: datos de zone.tab de tzdata 2025b, incrustados)
│   ├── types/
│   │   └── express.d.ts                (sin cambios: request.userId ya existe)
│   └── utils/
│       ├── errors.ts                   (modifica: mensajes genéricos 400 id y 403)
│       └── middleware.ts               (modifica: createUserRoutesGuard)
└── tests/
    ├── fixtures/
    │   └── tzdata-2025b/
    │       └── zone.tab                (nuevo: copia literal del archivo de IANA)
    ├── unit/
    │   ├── userModel.test.ts           (modifica)
    │   ├── userTarget.test.ts          (nuevo)
    │   ├── profile.test.ts             (nuevo)
    │   ├── availability.test.ts        (nuevo)
    │   └── timezones.test.ts           (nuevo)
    └── controllers/
        ├── app.test.ts                 (modifica: GET /api/users deja de ser 404)
        ├── helpers.ts                  (modifica: utilidades de sesión y base)
        ├── userRead.test.ts            (nuevo: listado y obtener)
        ├── userProfile.test.ts         (nuevo: actualizar)
        ├── userAvailability.test.ts    (nuevo: leer y reemplazar)
        └── userDeletion.test.ts        (nuevo: eliminar y escrituras en curso)
```

| Archivo | Responsabilidad | RF/RNF |
| --- | --- | --- |
| `src/models/user.ts` | Campo `availability: [String]` (default `[]`) **dentro del documento del usuario** (D1). `toJSON` sigue en lista blanca (sin correo ni disponibilidad). Exporta `toPublicUserJson` (hoy `publicUserJson` privada) junto a `toOwnUserJson`. | RF-2, RF-3, RF-4, RF-11, RF-12, RNF-2 |
| `src/utils/errors.ts` | Añade a `MESSAGES` `invalidId: "id con formato inválido"` y `forbidden: "no tienes permiso para esta operación"`, genéricos para las specs 004 a 006. | RF-5, RF-10, RNF-4 |
| `src/services/userTarget.ts` | Puras: `matchUserRoute`, `decodeSegment`, `resolveUserTarget`, `USER_TARGET_MESSAGES` (§2.1). | RF-5, RF-6, RF-10, RF-18, RF-20 |
| `src/services/zoneTab.ts` | Solo datos: `TZDATA_VERSION = "2025b"` y `ZONE_TAB_NAMES` (columna TZ de `zone.tab`), §1.1. | RF-16 |
| `src/services/timezones.ts` | Pura: `isValidTimezone(trimmed)` (§2.2). | RF-16 |
| `src/services/profile.ts` | Pura: `validateProfileUpdate(body)`, `isValidAvatarColor`, `PROFILE_MESSAGES`, `PROFILE_LIMITS` (§2.3). | RF-7, RF-8, RF-9, RF-15, RF-16, RF-17, RF-19, RF-21, RNF-3, RNF-4 |
| `src/services/availability.ts` | Puras: `isTimeBlock`, `validateAvailability(body)` (con quitar repetidos), `AVAILABILITY_MESSAGES` (§2.4). | RF-13, RF-14, RNF-3, RNF-4 |
| `src/utils/middleware.ts` | Añade `createUserRoutesGuard({ withUser })`: para las rutas de esta spec aplica la sesión y, después, rechaza el segmento que no se puede decodificar (§3.1, D2). | RF-1, RF-5, RF-6, RF-18, RF-20 |
| `src/controllers/users.ts` | `createUsersRouter({ jwtSecret, nodeEnv, now })`: `POST /` (registro, sin cambios), guardia, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /:id/availability`, `PUT /:id/availability` (§3.2–§3.7). | RF-1..RF-22, RNF-1, RNF-2 |
| `src/app.ts` | `createUsersRouter({ jwtSecret, nodeEnv, now })` en lugar de `createUsersRouter()`. Orden de middlewares sin cambios. | RF-1, RF-11 |
| `requests/users.rest` | Prueba manual: login → listado → `me` → PATCH → PUT disponibilidad → GET disponibilidad → DELETE (RT-19). | — |
| `tests/fixtures/tzdata-2025b/zone.tab` | Copia literal de `zone.tab` de `tzdata2025b.tar.gz`. Solo la leen las pruebas (§1.1). | RF-16 |
| `tests/**` | Sección 6. | ver sección 9 |

No se crea `src/domain/`: estas reglas no son la copia del dominio del frontend (D3 de la
002). No se toca `frontend/`.

### 1.1 Zonas horarias: datos de `zone.tab` (Q1) [RF-16]

**Versión fijada: tzdata 2025b** (publicada por IANA en marzo de 2025). Su `zone.tab`
contiene `America/Santiago`, `America/Argentina/Buenos_Aires`, `Europe/Amsterdam`,
`Europe/Oslo` y `Asia/Kuala_Lumpur`, y no contiene `America/Buenos_Aires`,
`Asia/Calcutta` ni `US/Eastern` (están en `backward`), como exigen los ejemplos de la spec.
Incluye además `America/Coyhaique` (región de Aysén, Chile), añadida en 2025b.

**Cómo se obtienen: datos incrustados, sin dependencia nueva** (D5).

1. El implementador descarga `https://data.iana.org/time-zones/releases/tzdata2025b.tar.gz`
   en un directorio vacío propio (fuera de `backend/`), lo extrae y copia **solo**
   `zone.tab`, sin cambios, a `backend/tests/fixtures/tzdata-2025b/zone.tab`. Anota en esta
   sección el SHA-256 del `.tar.gz` y del `zone.tab` al cerrar T2.
   - SHA-256 de `tzdata2025b.tar.gz` (descargado de
     `https://data.iana.org/time-zones/releases/tzdata2025b.tar.gz`):
     `11810413345fc7805017e27ea9fa4885fd74cd61b2911711ad038f5d28d71474`.
   - SHA-256 de `zone.tab` (idéntico en su fixture
     `backend/tests/fixtures/tzdata-2025b/zone.tab`):
     `586b4207e6c76722de82adcda6bf49d761f668517f45a673f64da83b333eecc4`; 418 zonas.
2. Genera a mano (o con un comando de una línea que no queda en el repositorio) el
   arreglo `ZONE_TAB_NAMES` de `src/services/zoneTab.ts`: la tercera columna (separada por
   tabuladores) de cada línea que no empieza por `#`, en el orden del archivo.
3. La prueba `tests/unit/timezones.test.ts` lee el fixture, extrae la misma columna y
   comprueba que el conjunto es **exactamente** igual a `ZONE_TAB_NAMES` (sin faltantes ni
   sobrantes) y que `TZDATA_VERSION === "2025b"`. Así una transcripción errónea o un cambio
   del fixture se detectan en `npm test`; el código de producción nunca lee archivos.

Si no hay acceso a la red, vale el `zone.tab` del sistema **solo** si
`/usr/share/zoneinfo/tzdata.zi` declara `# version 2025b`; si no, el implementador para y
lo informa (R2).

Prohibido: `Intl.supportedValuesOf("timeZone")`, `Intl.DateTimeFormat(...).resolvedOptions()`
o cualquier canonización del entorno (la spec lo excluye: aceptaría `Asia/Calcutta` o
`America/Buenos_Aires` según la versión de ICU).

### 1.2 Dependencias

**Ninguna nueva.** No se instalan `moment-timezone`, `@vvo/tzdb`, `timezones.json`,
`countries-and-timezones`, `tzdata` (npm), validadores (`zod`, `joi`) ni `node-mocks-http`.
`package.json` no cambia (constitución, principio 1).

### 1.3 Lint y tipos

Sin cambios en `eslint.config.js` ni en los `tsconfig`. `tests/fixtures/` no tiene `.ts`.
`request.params.id` es `string` en los tipos de Express 5 para rutas `/:id`. Todo
`request.body` se trata como `unknown` (como en la 002).

---

## 2. Funciones puras

Ninguna función de esta spec depende del reloj ni de "hoy": el único tiempo en juego es el
de la credencial, que ya llega inyectado (`now`, 002). Ninguna lee `process.env`, hace E/S
ni lanza por casos previstos. Todas devuelven `Validation<T>` (de `credentials.ts`) o un
resultado discriminado.

### 2.1 `src/services/userTarget.ts` [RF-5, RF-6, RF-10, RF-18, RF-20]

```ts
export const SELF_ALIAS = "me";
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const USER_TARGET_MESSAGES = {
  invalidId: MESSAGES.invalidId,            // de utils/errors.ts
  forbidden: MESSAGES.forbidden,
  userNotFound: "usuario no encontrado",
} as const;

export type UserRoute =
  | { kind: "list" }                                       // GET /
  | { kind: "user"; rawSegment: string }                   // GET|PATCH|DELETE /<seg>
  | { kind: "availability"; rawSegment: string };          // GET|PUT /<seg>/availability

export function matchUserRoute(method: string, path: string): UserRoute | null
export function decodeSegment(raw: string): string | null           // null si URIError
export type UserTarget = { ok: true; id: string; own: boolean } | { ok: false; error: string };
export function resolveUserTarget(decoded: string, sessionUserId: string): UserTarget
```

- `matchUserRoute(method, path)`: `path` es `request.path` del router (sin decodificar).
  Reproduce cómo empareja Express 5 (`strict: false`, `caseSensitive: false`): admite una
  `/` final y `availability` sin distinguir mayúsculas; el segmento es `[^/]+`. `HEAD` se
  trata como `GET`. Tabla: `GET /` → `list`; `GET|PATCH|DELETE /<seg>` → `user`;
  `GET|PUT /<seg>/availability` → `availability`; cualquier otro par → `null` (sigue al
  404 de la spec 001: `PUT /api/users`, `DELETE /api/users`, `POST /api/users/x`).
  La `/` final admitida vale también para el listado: `GET /api/users//` llega al router
  como `//` y se trata como `list` (verificado contra Express 5.1.0).
- `decodeSegment(raw)`: `decodeURIComponent(raw)` (lo mismo que hace Express 5 con los
  parámetros), y `null` si lanza `URIError` (`%zz`, `%E0%A4`).
- `resolveUserTarget(decoded, sessionUserId)` (orden de RF-18/RF-20, pasos 2 a 4):
  ```
  si decoded = "me":                         → { ok, id: sessionUserId.toLowerCase(), own: true }  # RF-6, exacto
  si no OBJECT_ID_PATTERN.test(decoded):     → { error: invalidId }                                 # RF-5 ("Me", " me", 12 car.)
  id ← decoded.toLowerCase()                                                                         # comparación por valor
  devolver { ok, id, own: id = sessionUserId.toLowerCase() }
  ```
  El 403 (escrituras con `own = false`) y el 404 (lecturas) los decide el controlador.
  `OBJECT_ID_PATTERN` usa `^…$` sin `m`: en JavaScript `$` no admite un `\n` final.

### 2.2 `src/services/timezones.ts` [RF-16]

```ts
export const UTC_ZONE = "UTC";
export function isValidTimezone(trimmed: string): boolean
```
```
si trimmed = "UTC": true
si no contiene "/": false                       # CET, EST5EDT, EST, HST, Factory, GMT, "" (P11)
área ← parte antes de la primera "/"
si área = "Etc": false                          # Etc/UTC, Etc/GMT-3
devolver ZONE_TAB_SET.has(trimmed)              # exacto, distingue mayúsculas
```
`ZONE_TAB_SET = new Set(ZONE_TAB_NAMES)` se construye una vez al cargar el módulo (sin E/S).
Las reglas sin `/` y de `Etc` son independientes de los datos: siguen valiendo si se
cambia la versión.

### 2.3 `src/services/profile.ts` [RF-7, RF-8, RF-9, RF-15..RF-17, RF-19, RF-21]

```ts
export const PROFILE_LIMITS = { displayNameMax: 40, bioMax: 200 } as const;
export const AVATAR_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const PROFILE_MESSAGES = {
  displayNameType: "el nombre visible debe ser un texto",        // = credentials.MESSAGES.displayNameType
  displayNameEmpty: "el nombre visible no puede estar vacío",
  displayNameTooLong: "el nombre visible no puede superar 40 caracteres", // = 002-RF-6
  bioType: "la biografía debe ser un texto",
  bioTooLong: "la biografía no puede superar 200 caracteres",
  timezoneType: "la zona horaria debe ser un texto",
  timezoneInvalid: "la zona horaria no es válida",
  avatarColorType: "el color de avatar debe ser un texto",
  avatarColorFormat: "el color de avatar debe tener la forma #RRGGBB",
} as const;

export interface ProfileUpdate { displayName?: string; bio?: string; timezone?: string; avatarColor?: string }
export function isValidAvatarColor(trimmed: string): boolean
export function validateProfileUpdate(body: unknown): Validation<ProfileUpdate>
```

```
update ← {}
para (campo, reglas) en orden displayName, bio, timezone, avatarColor:      # RF-19
  v ← readField(body, campo)                  # credentials.readField: propiedad propia; cuerpo no
                                              # objeto o lista → todo omitido (RF-7, Confirmación C)
  si v = undefined: continuar                 # omitido (solo omitir conserva, RF-7)
  si typeof v ≠ "string": error <campo>Type   # incluye null (RF-17)
  t ← v.trim()                                # Recortar = String.prototype.trim (Definiciones)
  displayName: t = "" → displayNameEmpty (RF-15); t.length > 40 → displayNameTooLong (RF-8)
  bio:         t.length > 200 → bioTooLong (RF-8); "" válido (RF-21)
  timezone:    no isValidTimezone(t) → timezoneInvalid (RF-16; "" incluido)
  avatarColor: no AVATAR_COLOR_PATTERN.test(t) → avatarColorFormat (RF-8; "" incluido); t ← t.toLowerCase()
  update[campo] ← t                                                                   # RF-21
devolver ok update                            # solo esas 4 claves (RF-9); {} si no hay ninguna
```
Longitud = `.length` (UTF-16) tras recortar (Definiciones). Ningún otro campo del cuerpo se
lee (RF-9).

### 2.4 `src/services/availability.ts` [RF-13, RF-14]

```ts
export const TIME_BLOCK_PATTERN = /^[0-6]-(?:[0-9]|1[0-9]|2[0-3])$/;
export const AVAILABILITY_MESSAGES = {
  blocksMissing: "faltan los bloques",
  blocksNotList: "los bloques deben ser una lista",
  blockInvalid: "hay un bloque horario con formato inválido",
} as const;
export function isTimeBlock(value: unknown): value is string     // texto y patrón; sin recortar
export function validateAvailability(body: unknown): Validation<string[]>
```
```
v ← readField(body, "blocks")                  # sin cuerpo, {}, lista JSON, text/plain → undefined
si v = undefined: error blocksMissing
si no Array.isArray(v): error blocksNotList   # incluye null y "2-20"
si algún elemento no isTimeBlock: error blockInvalid
devolver ok [...new Set(v)]                    # Set conserva el orden de primera aparición (RF-13)
```
El patrón rechaza `"2-05"`, `"7-10"`, `"2-24"`, `" 2-20"`, `"2-20 "`, `"+2-5"`, `"-0-5"`,
`"2-20\n"`. No hay tope de elementos (RF-13).

### 2.5 `src/models/user.ts` (cambios) [RF-11, RF-12, RNF-2]

```ts
export interface UserFields { …; availability: string[] }
availability: { type: [String], default: [] }   // en el esquema
export function toPublicUserJson(user: UserDocument): PublicUserJson   // la actual publicUserJson
```
`toJSON` y `toOwnUserJson` no cambian: nunca incluyen `availability` (RT-07, RNF-2). Un
documento antiguo sin el campo se hidrata con `[]` (default de Mongoose), lo que da el
200 `[]` de RF-12.

---

## 3. Algoritmo (pseudocódigo)

Notación: `withUser` es el de la 002 (pasos 1–5 de 002-RF-24). Los 400/413/415 de la
spec 001 ocurren antes, en `express.json` a nivel de aplicación (sin cambios).

### 3.1 Guardia de las rutas de usuario [RF-1, RF-5, RF-6, RF-18, RF-20; D2]

```
createUserRoutesGuard({ withUser }) → (request, response, next):
  route ← matchUserRoute(request.method, request.path)
  si route = null: devolver next()                       # registro y rutas desconocidas, sin sesión
  withUser(request, response, () =>                      # (1) sesión: 401 de 002-RF-24
    si route.kind ≠ "list" y decodeSegment(route.rawSegment) = null:
        devolver 400 { error: invalidId }                # (3) %zz, %E0%A4: antes del 403/404
    next())                                              # Express decodifica :id sin fallar
```
Se monta con `router.use(guard)` (sin ruta) **antes** de las rutas `/:id`. Motivo (D2):
Express 5 decodifica `:id` al emparejar la capa de la ruta; con `%zz` lanza un error 400
propio **antes** de ejecutar cualquier middleware de esa ruta, así que un `withUser` por
ruta nunca correría y el cliente sin sesión recibiría 400 en vez de 401 (contra RF-18 y el
caso límite). Al responder la guardia, la capa `/:id` nunca se empareja con un segmento mal
codificado. `withUser` se ejecuta una sola vez (las rutas no lo repiten).

### 3.2 Listado: `GET /api/users` [RF-2, RF-4, RNF-2]

```
users ← await User.find().sort({ createdAt: 1, _id: 1 })
200 users.map(u → u.id = request.userId ? toOwnUserJson(u) : toPublicUserJson(u))
```

### 3.3 Obtener: `GET /api/users/:id` [RF-3, RF-4, RF-5, RF-6, RF-20, RNF-2]

```
t ← resolveUserTarget(request.params.id, request.userId)
si no t.ok: 400 { error: t.error }
user ← await User.findById(t.id)
si user = null: 404 { error: "usuario no encontrado" }
200 t.own ? toOwnUserJson(user) : toPublicUserJson(user)    # id siempre el guardado (minúsculas)
```

### 3.4 Actualizar: `PATCH /api/users/:id` [RF-7..RF-10, RF-15..RF-19, RF-21, RF-22, RNF-1]

```
t ← resolveUserTarget(request.params.id, request.userId)
si no t.ok: 400                                           # (3)
si no t.own: 403 { error: forbidden }                     # (4) sin consultar la base
v ← validateProfileUpdate(request.body)                   # (5) RF-19
si no v.ok: 400 { error: v.error }
si v.value = {}:                                          # RF-7: sin campos enviados
    user ← await User.findById(request.userId)
si no:
    user ← await User.findOneAndUpdate(
              { _id: request.userId },                    # RNF-1: siempre el de la sesión
              { $set: v.value },                          # RT-09: solo las 4 claves validadas
              { returnDocument: "after", runValidators: true, upsert: false })   # D4
si user = null: 404 { error: "usuario no encontrado" }    # RF-22: borrado en curso, sin efecto
200 toOwnUserJson(user)
```

### 3.5 Eliminar: `DELETE /api/users/:id` [RF-10, RF-11, RF-22]

```
t ← resolveUserTarget(...); si no t.ok: 400; si no t.own: 403
await User.deleteOne({ _id: request.userId })             # borra usuario y disponibilidad (D1)
                                                          # deletedCount 0 (segunda en curso) → igual (RF-22)
response.clearCookie(SESSION_COOKIE, sessionCookieOptions(nodeEnv))   # D8 de la 002
204 sin cuerpo                                            # response.status(204).end()
```

### 3.6 Leer disponibilidad: `GET /api/users/:id/availability` [RF-12, RF-20]

```
t ← resolveUserTarget(...); si no t.ok: 400
user ← await User.findById(t.id, { availability: 1 })
si user = null: 404 { error: "usuario no encontrado" }
200 [...user.availability]                                # lista directa, orden guardado
```

### 3.7 Reemplazar disponibilidad: `PUT /api/users/:id/availability` [RF-10, RF-13, RF-14, RF-18, RF-22, RNF-1]

```
t ← resolveUserTarget(...); si no t.ok: 400; si no t.own: 403
v ← validateAvailability(request.body)                    # "user" y otros campos: ignorados
si no v.ok: 400 { error: v.error }                        # la anterior se conserva
user ← await User.findOneAndUpdate({ _id: request.userId },
          { $set: { availability: v.value } },
          { returnDocument: "after", runValidators: true, upsert: false })
si user = null: 404 { error: "usuario no encontrado" }    # RF-22
200 [...user.availability]
```

### 3.8 Escrituras en curso durante el borrado (RF-22), sin transacciones [D1, D4, D6]

- **No hay recreación posible:** ninguna escritura usa `upsert` ni `save()` sobre un
  documento leído antes; la disponibilidad vive dentro del documento del usuario, así que
  no existe un segundo documento que pueda quedar huérfano o crearse aparte.
- **Una sola operación atómica por escritura:** `findOneAndUpdate` sobre un documento es
  atómico en MongoDB. Si el borrado ocurrió antes, devuelve `null` → 404 sin efecto; si
  ocurrió después, la escritura se aplicó y devuelve 200, y el borrado posterior elimina
  usuario y disponibilidad juntos (RF-11). No existe un estado intermedio que dé 500.
- **Eliminación idempotente:** `deleteOne` con `deletedCount` 0 no es error; la segunda
  eliminación en curso responde 204 y borra la cookie (Q4).
- **Después del borrado** (no en curso): `withUser` paso 5 → 401 "token inválido" con la
  credencial; sin cookie → 401 "sesión no iniciada" (002-RF-24). Nada nuevo que codificar.

---

## 4. Interfaz

Sin interfaz gráfica ni cambios en `frontend/`. Todas protegidas (cookie `token` +
`X-CSRF-Token`). `:id` = identificador de 24 hexadecimales o `me`.

| Método y ruta | Cuerpo | Correcta | Errores (en orden de revisión) |
| --- | --- | --- | --- |
| `GET /api/users` | — | 200 `[usuario]` (propio con `email`) | 401 |
| `GET /api/users/:id` | — | 200 usuario (propio con `email`) | 401, 400 id, 404 |
| `PATCH /api/users/:id` | `displayName?`, `bio?`, `timezone?`, `avatarColor?` | 200 datos propios | 401, 400 id, 403, 400 cuerpo, 404 (RF-22) |
| `DELETE /api/users/:id` | — | 204 + `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict[; Secure]` | 401, 400 id, 403 |
| `GET /api/users/:id/availability` | — | 200 `["d-h", …]` | 401, 400 id, 404 |
| `PUT /api/users/:id/availability` | `{ "blocks": [...] }` | 200 `["d-h", …]` | 401, 400 id, 403, 400 cuerpo, 404 (RF-22) |

Usuario: `{ id, username, displayName, avatarColor, bio, timezone, createdAt }` (+ `email`
si es el propio); `id` en minúsculas, `createdAt` ISO 8601 con milisegundos y `Z`
(serialización JSON de `Date`). Errores: `{ "error": "<mensaje>" }`. Antes de todo, los
400 "JSON mal formado", 413 y 415 de la spec 001.

---

## 5. Decisiones técnicas

| # | Decisión | Alternativa descartada y por qué | RF |
| --- | --- | --- | --- |
| D1 | `availability: [String]` **dentro** del documento `User` (como la referencia 5.4). | Colección `availabilities` aparte: el borrado de RF-11 necesitaría dos operaciones y, sin transacciones, una escritura en curso podría recrear la disponibilidad de un usuario ya borrado (RF-22) o dejarla huérfana. | RF-11, RF-12, RF-13, RF-22 |
| D2 | Guardia sin ruta (`router.use`) que aplica la sesión y rechaza el segmento no decodificable **antes** de que Express empareje `/:id`. | `withUser` por ruta: Express 5 decodifica `:id` al emparejar y con `%zz` responde su propio error antes del middleware → 400 sin sesión en lugar de 401, y un mensaje que no es el de la spec. Mapear ese error en el `errorHandler`: arregla el texto pero no el orden. `router.use(withUser)` incondicional: exigiría sesión al registro y cambiaría los 404 de rutas desconocidas (`PUT /api/users`). | RF-5, RF-18, RF-20 |
| D3 | Reglas en `src/services/` como funciones puras (igual que D3 de la 002). | `src/domain/`: reservado para la copia del dominio del frontend (spec 005). | todas las de validación |
| D4 | Escrituras con `findOneAndUpdate` atómico (`$set`, `upsert: false`, `runValidators: true`) sobre el usuario de la sesión. | RT-10 (`findById` → modificar → `save()`): entre leer y guardar el usuario puede borrarse; `save()` lanza `DocumentNotFoundError` (→ 500 si no se mapea) y abre una ventana de lectura-modificación-escritura. Transacciones: descartadas por el usuario (exigen réplica). | RF-7, RF-13, RF-22 |
| D5 | `zone.tab` de **tzdata 2025b incrustado** como arreglo TS + fixture literal verificado en las pruebas. **Sin dependencia nueva.** | Paquete npm (`@vvo/tzdb`, `timezones.json`, `countries-and-timezones`, `moment-timezone`): ninguno expone exactamente `zone.tab` de una versión fijada, aplican su propia canonización, añaden superficie de cadena de suministro y obligarían a justificar una dependencia (principio 1) para ~420 cadenas. `Intl.supportedValuesOf`: prohibido por la spec (depende de ICU). Leer el archivo en tiempo de ejecución: E/S al importar y rutas relativas frágiles. | RF-16 |
| D6 | Pruebas de RF-22 con `t.mock.method(User, "findOneAndUpdate" \| "deleteOne", …)` que ejecutan el borrado real dentro de la llamada (antes o después de delegar en la original). | Temporizadores o peticiones en paralelo: no deterministas. Un "gancho" de pruebas en el controlador: código de producción solo para las pruebas. El mock ya tiene precedente (002, `mock.method(User, "findOne")`). Requisito: los controladores llaman a `User.findOneAndUpdate(...)`/`User.deleteOne(...)` sin desestructurar ni encadenar (`.lean()`, `.exec()`). | RF-22 |
| D7 | `resolveUserTarget` compara en minúsculas y el controlador busca con el id en minúsculas; la respuesta usa siempre el id guardado. | Buscar con el texto recibido: funcionaría con ObjectId, pero el "propio" en mayúsculas daría 403. | RF-6, RNF-2 |
| D8 | Mensajes genéricos `invalidId` y `forbidden` en `utils/errors.ts`; `userNotFound` y los de validación en su servicio. | Todos en `users.ts`: las specs 004 a 006 tendrían que importar de un controlador. | RF-5, RF-10 |
| D9 | Sin `PATCH` vacío a la base: con `{}` se lee con `findById` y se responde. | `findOneAndUpdate` con `$set: {}`: Mongoose lo convierte en una consulta sin cambios, pero el comportamiento con actualización vacía es menos explícito. | RF-7 |
| D10 | Listado sin proyección especial: `toPublicUserJson`/`toOwnUserJson` en lista blanca. | `select("-passwordHash -email")`: el filtrado quedaría repartido entre la consulta y el modelo. | RF-2, RF-4, RNF-2 |

---

## 6. Estrategia de pruebas

### 6.1 Marco

- `node:test` + `node:assert/strict` + `supertest`/`supertest.agent`, en serie
  (`npm test`), contra la base de prueba. Tests primero en cada tarea (principio 4).
- Cada archivo de `controllers/` con base: `before` → `connectDatabase(testConfig().db)` y
  `User.init()`; `beforeEach` → `User.deleteMany({})`; `after` → `mongoose.disconnect()`.
- `tests/controllers/helpers.ts` (añade):
  - `signUp(app, data?)` → registra y hace `loginAs`; devuelve `{ agent, csrf, cookie, id, email }`.
  - `nonExistingId()` → `new mongoose.Types.ObjectId().toHexString()`.
  - `withSession(request, csrf)` → añade `X-CSRF-Token`.
  - `rawCookieRequest(app, method, path, cookie, csrf)` → petición sin agente con
    `Cookie: token=<cookie>` (credencial copiada).
  - `setCreatedAt(ids, date)` → `User.collection.updateMany(...)` (driver nativo: Mongoose
    marca `createdAt` como inmutable y descartaría el `$set`).
- `ISO_MS_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` y `HEX24_LOWER = /^[0-9a-f]{24}$/`.
- Las rutas con `%zz` se envían tal cual con supertest (la URL no se normaliza); si el
  cliente las reescribe, se usa `http.request` con `path` literal (R4).

### 6.2 Casos por archivo

**`unit/userModel.test.ts`** (modifica) [RNF-2, RF-12]
- Documento nuevo → `availability` es `[]`. Con `availability: ["2-20"]`, `toJSON()` y
  `toOwnUserJson` siguen con las claves exactas de la 002 (sin `availability`).
  `toPublicUserJson` = `toJSON()`.

**`unit/userTarget.test.ts`** [RF-5, RF-6, RF-10, RF-18, RF-20]
- `matchUserRoute`: cada fila de la tabla de §2.1, `HEAD`, `/` final, `AVAILABILITY`,
  `POST /`, `PUT /`, `DELETE /`, `POST /x`, `/x/availability/y`, `//availability` → `null`.
- `decodeSegment`: `m%65` → `me`; `%20me` → `" me"`; `%zz`, `%E0%A4`, `%` → `null`.
- `resolveUserTarget`: `me` → propio; `Me`, `ME`, `" me"`, `aaaaaaaaaaaa`, 23, 25,
  24 con `g` → `invalidId`; id propio en mayúsculas → `own: true` e `id` en minúsculas;
  otro id válido → `own: false`.
- Mensajes con formato RNF-4 (minúscula inicial, sin punto final).

**`unit/timezones.test.ts`** [RF-16]
- Fixture vs `ZONE_TAB_NAMES`: conjuntos idénticos; sin repetidos; `TZDATA_VERSION`.
- Válidas: `America/Santiago`, `America/Argentina/Buenos_Aires`, `Europe/Amsterdam`,
  `Europe/Oslo`, `Asia/Kuala_Lumpur`, `UTC`.
- Inválidas: `US/Eastern`, `America/Buenos_Aires`, `Asia/Calcutta`, `GMT`, `Etc/UTC`,
  `Etc/GMT-3`, `america/santiago`, `Santiago`, `GMT-3`, `CET`, `EST5EDT`, `EST`, `HST`,
  `Factory`, `""`, `"America/ Santiago"`.
- Sin canonización del entorno: los casos `America/Buenos_Aires` y `Asia/Calcutta` (que
  ICU acepta) dan `false`; además, `grep -rn "Intl\." src` sin resultados (6.3).

**`unit/profile.test.ts`** [RF-7..RF-9, RF-15..RF-17, RF-19, RF-21, RNF-3, RNF-4]
- Sin cuerpo, `{}`, lista JSON, texto, solo campos ignorados (`id`, `email`, `username`,
  `password`, `passwordHash`, `createdAt`) → `ok {}`.
- `null`, número, booleano, lista y objeto en cada uno de los 4 campos → su mensaje de tipo.
- Nombre visible: `""`, espacios → vacío; 40 tras recortar (con espacios alrededor) → ok
  recortado; 41 → largo; 20 emojis (40 unidades) → ok, 21 → largo.
- Biografía: 200 → ok; 201 → largo; `""` y espacios → `""`.
- Zona: `" America/Santiago "`, `"America/Santiago\n"`, NBSP y BOM en los extremos → ok
  recortada; `"\u0085UTC"` → inválida (NEL no se recorta); casos de `timezones.test.ts`
  por muestreo.
- Color: `#ABCDEF`, `" #AbCdEf "`, `"#abcdef\t"` → `#abcdef`; `#abc`, `abcdef`, `""`,
  espacios, `#abcdeg` → formato.
- Orden RF-19: nombre de 41 + color `#abc` → largo del nombre; biografía `null` + zona
  inválida → tipo de biografía; zona inválida + color inválido → zona; nombre `5` + `bio`
  de 201 → tipo del nombre.
- `value` solo contiene claves de los 4 campos enviados.
- Cada mensaje de `PROFILE_MESSAGES`: RNF-4 (salvo la notación `#RRGGBB`).

**`unit/availability.test.ts`** [RF-13, RF-14]
- `isTimeBlock`: `0-0`, `6-23`, `2-20` válidos; cada inválido del caso límite más `20`,
  `null`, `{}`, `"2-20\n"`.
- `validateAvailability`: sin cuerpo, `{}`, lista JSON → falta; `"2-20"`, `null`, `{}` →
  no lista; `["2-20", 5]` → inválido; `["3-10","1-5","3-10"]` → `["3-10","1-5"]`;
  `[]` → `[]`; repetidos + inválido → inválido; `{ blocks: [...], user: "x" }` → ignora
  `user`; 5 000 bloques válidos → ok (sin tope).

**`controllers/app.test.ts`** (modifica) [RF-1]
- Se retira `GET /api/users` de la lista de 404 (ahora es el listado, 401 sin sesión).
  Se mantienen `PUT /api/users` y `DELETE /api/users` → 404 y se añaden `POST
  /api/users/me` y `PUT /api/users/me` → 404 sin sesión (fuera de la tabla de rutas).

**`controllers/userRead.test.ts`** [RF-1..RF-6, RF-20, RNF-2]
- RF-1: sin cookie → 401 `sesión no iniciada` en las 6 operaciones (también con id
  inválido, `%zz` y cuerpo inválido); credencial alterada → `token inválido`.
- RF-2: tres usuarios → orden por `createdAt`; dos con el mismo `createdAt`
  (`setCreatedAt`) → por `_id`; el propio con `email`, los demás sin `email` ni
  `passwordHash` ni `availability` (claves exactas).
- RF-3/RF-4: otro → público; propio por id, por `me`, por `m%65` y por id en mayúsculas →
  con correo e id en minúsculas.
- RNF-2: `id` `HEX24_LOWER`, `createdAt` `ISO_MS_Z`.
- RF-5/RF-20: `aaaaaaaaaaaa`, 23, 25, 24 con `z`, `Me`, `ME`, `%20me` → 400; `%zz` y
  `%E0%A4` → 400 (no 404); válido inexistente → 404.
- Las aserciones de 400/404 de `GET /:id/availability` se movieron a
  `userAvailability.test.ts` (T8); aquí solo quedan, para esa ruta, los 400 de la guardia
  (`%zz` y `%E0%A4`).

**`controllers/userProfile.test.ts`** [RF-7..RF-10, RF-15..RF-19, RF-21, RNF-1, RNF-3]
- RF-7: un campo cambia y los demás se conservan (comprobado en la base); los 4 a la vez;
  sin cuerpo, JSON vacío, `text/plain`, `{}`, lista JSON, solo ignorados → 200 sin cambios.
- RF-9: `email`, `username`, `password`, `passwordHash`, `id`, `createdAt` en el cuerpo → la
  base no cambia en esos campos.
- RF-8, RF-15..RF-17, RF-19: un caso HTTP por mensaje (incluido `null` en cada campo) y el
  orden con varios inválidos; en cada 400 la base no cambia.
- RF-16: cada zona de los casos límite (válidas e inválidas, incluidas `CET`,
  `Europe/Amsterdam`, `Europe/Oslo`, `Asia/Kuala_Lumpur`).
- RF-21: nombre, biografía y zona guardados recortados; `"America/Santiago\n"` y
  `"#abcdef\t"` aceptados y guardados recortados; color en minúsculas.
- RF-10/RF-18: otro usuario → 403 y base intacta; válido inexistente → 403; otro usuario
  con cuerpo inválido → 403; id inválido con cuerpo inválido → 400 id; `%zz` con cuerpo
  inválido → 400 id; `me` y propio en mayúsculas → 200.
- RNF-1: el cuerpo con `id` de otro usuario no lo modifica.

**`controllers/userAvailability.test.ts`** [RF-10, RF-12..RF-14, RF-18, RNF-1]
- RF-12: nunca guardada → `[]`; documento insertado sin el campo (driver nativo) → `[]`;
  otro usuario → su lista; lista directa (es un arreglo).
- RF-13: `["3-10","1-5","3-10"]` → 200 `["3-10","1-5"]` y así en la base; `[]` vacía la
  disponibilidad; `{ blocks: ["2-20"], user: <otro> }` → solo cambia la propia.
- RF-14: cada mensaje y su orden; sin cuerpo, `{}`, lista JSON, `text/plain` → falta; en
  cada 400 se conserva la anterior.
- Cuerpo de 102 401 bytes con bloques → 413; lista grande por debajo del límite → 200.
- RF-10/RF-18: otro → 403 sin cambios; inexistente → 403; otro con cuerpo inválido → 403;
  `me` → 200.

**`controllers/userDeletion.test.ts`** [RF-10, RF-11, RF-22]
- RF-11: `DELETE /api/users/me` → 204 sin cuerpo; `Set-Cookie` de borrado con los mismos
  atributos que la emisión del login (`parseSetCookie`) y `Expires` en 1970; en
  `authApp({ nodeEnv: "production" })`, con `Secure`; el usuario y su disponibilidad ya no
  están; `me` con el mismo agente → 401 `sesión no iniciada`; credencial copiada
  (`rawCookieRequest`) en `/api/auth/me` y en las 6 operaciones → 401 `token inválido`;
  mismo correo y `ANA` pueden volver a registrarse.
- RF-10: eliminar a otro → 403 y sigue en la base; inexistente → 403.
- RF-22 (después): con la credencial copiada, PATCH, PUT disponibilidad y DELETE → 401
  `token inválido`; el usuario no reaparece y no hay disponibilidad suya.
- RF-22 (en curso, D6), cada uno en su propio `test`:
  1. PATCH: mock de `findOneAndUpdate` que borra el usuario y luego delega → 404 `usuario
     no encontrado`; la base no tiene el usuario ni su disponibilidad.
  2. PUT disponibilidad: igual → 404 y base sin usuario ni disponibilidad.
  3. PATCH y PUT con mock que delega primero y borra después → 200 con los datos
     escritos; la base no tiene el usuario.
  4. Segunda eliminación: mock de `deleteOne` que ejecuta el borrado real y luego delega
     (deletedCount 0) → 204 y `Set-Cookie` de borrado; nunca 500.
  5. Ningún caso deja documentos con el `_id` del usuario (`User.collection.countDocuments`).

### 6.3 Verificaciones fuera de `npm test`

- `npm run typecheck` y `npm run lint` en verde; búsquedas de `.only`, `any`, `@ts-ignore`
  sin resultados; `grep -rn "Intl\." src` sin resultados (D5).
- `npm audit` sin altas ni críticas (no hay dependencias nuevas; se comprueba igual).
- Recorrido manual de `requests/users.rest`.

---

## 7. Notas para otros documentos (no se editan en esta fase)

- `AGENTS.md`: `services/` gana `userTarget.ts`, `profile.ts`, `availability.ts`,
  `timezones.ts` y `zoneTab.ts`; `tests/fixtures/`. `domain/` sigue reservado.
- `MEMORY.md`: versión de tzdata (2025b) y cómo actualizarla (fixture + arreglo + prueba);
  `MESSAGES.forbidden`/`invalidId` reutilizables por 004–006; la cascada de RF-11 la
  amplían 004 y 006 dentro de `DELETE /api/users/:id`.

---

## 8. Riesgos

- **R1 (app.test.ts).** `GET /api/users → 404` de la 002 deja de ser cierto por RF-2. Se
  modifica esa prueba (no se elimina el resto). No cambia ningún RF de la 002.
- **R2 (tzdata).** Si no se puede descargar `tzdata2025b.tar.gz` ni hay un `zone.tab` del
  sistema declarado 2025b, T2 se para y se informa. Cambiar de versión es un cambio de
  plan (y, si altera ejemplos, de spec).
- **R3 (mock de Mongoose).** D6 depende de que los controladores llamen a
  `User.findOneAndUpdate`/`User.deleteOne` como métodos estáticos sin encadenar; si se
  encadena (`.exec()`), el mock debe devolver un objeto con ese método. El plan fija la
  forma de llamada para evitarlo.
- **R4 (`%zz` en las pruebas).** Si supertest reescribe la URL, se usa `node:http` con el
  `path` literal. La guardia no depende de ello.
- **R5 (paridad con Express).** `matchUserRoute` replica el emparejamiento de Express 5
  (`/` final, mayúsculas en `availability`). Las pruebas HTTP de `/me/` y
  `/me/AVAILABILITY` sin sesión → 401 (no 404) detectan cualquier desajuste.
- **R6 (respuesta 200 en curso).** En el caso "aplicado antes del borrado" la respuesta
  lleva datos de un usuario que ya no existe: es lo que RF-22 admite.

---

## 9. Trazabilidad

| Requisito | Archivo(s) | Prueba(s) |
| --- | --- | --- |
| RF-1 | `utils/middleware.ts` (guardia), `controllers/users.ts` | `controllers/userRead.test.ts` |
| RF-2 | `controllers/users.ts`, `models/user.ts` | `controllers/userRead.test.ts` |
| RF-3 | `controllers/users.ts` | `controllers/userRead.test.ts` |
| RF-4 | `models/user.ts`, `controllers/users.ts` | `unit/userModel.test.ts`; `controllers/userRead.test.ts` |
| RF-5 | `services/userTarget.ts`, `utils/middleware.ts`, `utils/errors.ts` | `unit/userTarget.test.ts`; `controllers/userRead.test.ts`; `controllers/userProfile.test.ts` |
| RF-6 | `services/userTarget.ts` | `unit/userTarget.test.ts`; `controllers/user*.test.ts` |
| RF-7 | `services/profile.ts`, `controllers/users.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-8 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-9 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-10 | `controllers/users.ts`, `utils/errors.ts` | `controllers/userProfile.test.ts`; `controllers/userAvailability.test.ts`; `controllers/userDeletion.test.ts` |
| RF-11 | `controllers/users.ts`, `models/user.ts` (D1) | `controllers/userDeletion.test.ts` |
| RF-12 | `controllers/users.ts`, `models/user.ts` | `unit/userModel.test.ts`; `controllers/userAvailability.test.ts` |
| RF-13 | `services/availability.ts`, `controllers/users.ts` | `unit/availability.test.ts`; `controllers/userAvailability.test.ts` |
| RF-14 | `services/availability.ts` | `unit/availability.test.ts`; `controllers/userAvailability.test.ts` |
| RF-15 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-16 | `services/timezones.ts`, `services/zoneTab.ts`, `services/profile.ts` | `unit/timezones.test.ts`; `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-17 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-18 | `utils/middleware.ts`, `services/userTarget.ts`, `controllers/users.ts` | `controllers/userProfile.test.ts`; `controllers/userAvailability.test.ts`; `controllers/userDeletion.test.ts`; `controllers/userRead.test.ts` (401 primero) |
| RF-19 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-20 | `utils/middleware.ts`, `services/userTarget.ts`, `controllers/users.ts` | `controllers/userRead.test.ts` |
| RF-21 | `services/profile.ts` | `unit/profile.test.ts`; `controllers/userProfile.test.ts` |
| RF-22 | `controllers/users.ts` (D1, D4), `utils/middleware.ts` (paso 5 de la 002) | `controllers/userDeletion.test.ts` |
| RNF-1 | `controllers/users.ts` (`_id: request.userId`) | `controllers/userProfile.test.ts`; `controllers/userAvailability.test.ts` |
| RNF-2 | `models/user.ts` | `unit/userModel.test.ts`; `controllers/userRead.test.ts` |
| RNF-3 | `services/profile.ts`, `services/availability.ts` | pruebas HTTP sin pasar por ningún cliente |
| RNF-4 | `services/*.ts`, `utils/errors.ts` | pruebas de formato de mensajes en `unit/` |
| RNF-5 | todos | `npm test`, `npm run typecheck`, `npm run lint`; búsquedas de 6.3 |

Criterios de finalización de la spec → prueba:

| Criterio | Prueba |
| --- | --- |
| Cada RF con prueba (respuesta y, en escrituras, base) | tabla anterior |
| Otro sin correo ni hash; propio con correo | `userRead.test.ts` (RF-4) |
| Id en minúsculas y `createdAt` `AAAA-MM-DDTHH:mm:ss.sssZ` | `userRead.test.ts` (RNF-2) |
| 403 por escritura sobre otro (base intacta), sobre inexistente y con cuerpo inválido | `userProfile.test.ts`, `userAvailability.test.ts`, `userDeletion.test.ts` |
| 404 y 400 `aaaaaaaaaaaa` en cada lectura | `userRead.test.ts` |
| `me` en cada operación, `ME` → 400, `m%65` = `me`, propio en mayúsculas → 200 con correo | `userRead.test.ts`, `userProfile.test.ts`, `userAvailability.test.ts`, `userDeletion.test.ts` |
| Mensajes de RF-8, RF-14..RF-17, orden RF-19, `null` en cada campo | `profile.test.ts`, `availability.test.ts`, `userProfile.test.ts`, `userAvailability.test.ts` |
| Recorte y color en minúsculas (RF-21) | `profile.test.ts`, `userProfile.test.ts` |
| Cada zona de los casos límite | `timezones.test.ts`, `userProfile.test.ts` |
| Orden de la disponibilidad y del listado | `userAvailability.test.ts`, `userRead.test.ts` |
| Eliminación: cookie, 401 posteriores | `userDeletion.test.ts` (RF-11) |
| Escrituras con credencial copiada tras eliminar → 401, base limpia | `userDeletion.test.ts` (RF-22 después) |
| Borrado forzado durante PATCH → 404, base limpia | `userDeletion.test.ts` (en curso 1) |
| Borrado forzado durante PUT disponibilidad → 404, base limpia | `userDeletion.test.ts` (en curso 2) |
| Borrado forzado antes de la segunda eliminación → 204 con cookie | `userDeletion.test.ts` (en curso 4) |
| `"America/Santiago\n"` y `"#abcdef\t"` recortados | `profile.test.ts`, `userProfile.test.ts` |
| Campo `user` ajeno en la disponibilidad | `userAvailability.test.ts` |
| Typecheck, pruebas y lint en verde; sin `.only` | T10 |
