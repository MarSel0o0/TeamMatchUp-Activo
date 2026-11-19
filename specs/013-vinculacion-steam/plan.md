# Plan 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: aprobado (2026-11-18, por el usuario: «apruebo el plan»). Se adoptan los valores por
defecto de las observaciones O-1 a O-4 (región «South America», los dos textos propuestos y las
11 tareas sin dividir la spec).

Spec: `specs/013-vinculacion-steam/spec.md` (aprobada el 2026-11-04, revisada y aprobada el
2026-11-18, sin dudas abiertas). Base: plan y código de la spec 012 (implementada y validada).
Rama: `feature/vinculacion-steam-riot`.

La 012 dejó el modelo (`verification`, `profile`, `handleKey`), `verifyAccount`, la resincronización
con espera y las fuentes inyectables (`realSources.ts`). Esta spec registra la **primera fuente
real** (Steam) y agrega lo que falta para llegar a ella: el recorrido de inicio de sesión de Steam,
el intento de verificación, la lectura del perfil y la interfaz. Sin dependencias nuevas (RNF-5):
Node 22 trae `fetch`, `node:crypto` y `Intl.DisplayNames`.

## 0. Estado real del código (comprobado el 2026-11-18)
- `backend/src/services/verifyAccount.ts`: ya hace exclusividad (409), conversión de la cuenta
  propia, alta y desvinculación de las no verificadas de otros. La 013 solo la llama.
- `backend/src/services/realSources.ts`: `RealSource { id, read(account, signal) }`,
  `SourceRegistry` por juego y `readWithTimeout` (8 s). `createApp` ya recibe `sources`.
- `backend/src/controllers/accounts.ts` (`POST /:id/sync`): con cuenta verificada aplica
  `syncCooldown`, consulta la fuente y responde 429, 503 o 404 `gone`. **La espera se calcula
  siempre con `lastSyncedAt`**: no distingue una verificación sin perfil (RF-12, D6).
- `backend/src/models/gameAccount.ts`: `profile` con `displayName`, `avatarUrl`, `country`,
  `hoursTotal`, `hoursRecent`, `isPrivate`; `toGameAccountJson` ya los expone (lista blanca).
- `backend/src/utils/config.ts`: `Config` sin Steam; `index.ts` pasa `result.config` a `createApp`.
- `backend/src/controllers/users.ts`: cascada de eliminación C1 a C4.
- Frontend: `AccountRow` ya muestra `OriginTag` por bloque, pero **no pinta `profile`**;
  `DemoTag` (aviso global) se muestra siempre en `AppLayout` (2 sitios) y `LandingPage`;
  `RESYNC_NOTE` es un texto único; `ApiContract` no tiene operaciones de verificación; el
  modo simulado se detecta con `env.useMockApi`. `ProtectedRoute` recuerda la ruta de origen
  (solo el `pathname`) y `AuthProvider` la recuerda para las rutas de `isProtectedPath`.
- `GameSummaryPanel` (perfil y ficha de jugador) y `SettingsPage` son los únicos que usan
  `AccountRow`; con un cambio en `AccountRow` se cubren las tres vistas de RF-15.

## 1. Cómo funciona el inicio de sesión de Steam (resumen técnico)
Steam usa **OpenID 2.0** (`https://steamcommunity.com/openid/login`). No hay secreto compartido
con el usuario: Steam devuelve al navegador a `return_to` con parámetros `openid.*` firmados.
TeamMatchUp debe (a) comprobar la respuesta localmente, (b) pedirle a Steam que confirme la firma
(`openid.mode=check_authentication`, POST) y (c) sacar el SteamID64 de `openid.claimed_id`
(`https://steamcommunity.com/openid/id/<17 dígitos>`). La clave de Steam (`STEAM_API_KEY`) solo
se usa para leer el perfil (`ISteamUser/GetPlayerSummaries`, `IPlayerService/GetOwnedGames`).

```
Navegador                 TeamMatchUp (API)                     Steam
   │ POST /api/steam/start ─▶ crea intento (token) ─────────────────│
   │ ◀── { url de Steam con return_to = PUBLIC_URL/verificar/steam?attempt=<token> }
   │ ───────────── redirección al inicio de sesión de Steam ────────▶│
   │ ◀──────────── 302 a return_to con openid.* firmados ────────────│
   │ GET /verificar/steam?attempt&openid.* (página de la app, con su sesión)
   │ POST /api/steam/complete { query } ─▶ valida, consume el intento
   │                                      ├─ check_authentication ──▶│
   │                                      ├─ perfil + horas ────────▶│
   │                                      └─ verifyAccount (012)
   │ ◀── 200 { outcome, account } o error ── navega a /perfil con el aviso
```
La cookie de sesión es `SameSite=Strict`: no viaja en la navegación que viene de Steam. Por eso
(D3) Steam no llama a la API: devuelve al usuario a una **página de la app**, y esa página (ya
con la cookie, porque es una carga de página dentro de la app) hace el `POST` con el comprobante
anti-CSRF. Ninguna regla de la spec 002 se relaja (RNF-6).

## 2. Archivos y responsabilidades

### Backend — dominio (funciones puras, sin Express, Mongoose, red ni reloj)
| Archivo | Responsabilidad | RF |
|---|---|---|
| `domain/steamOpenId.ts` (nuevo) | `STEAM_OPENID_URL`; `buildLoginParams(returnTo, realm)` (parámetros de la petición `checkid_setup`); `parseSteamResponse(query, expectedReturnTo)` → `{ kind: "cancelled" } \| { kind: "invalid" } \| { kind: "assertion"; steamId; params }`; `buildCheckAuthBody(params)` (copia solo `openid.*` y fija `check_authentication`); `isValidCheckResponse(text)` | RF-1, RF-4, RF-5, RF-6, RNF-1, RNF-4 |
| `domain/steamAttempt.ts` (nuevo) | `ATTEMPT_TTL_MS = 10 min`; `attemptExpiry(now)`; `attemptStatus(attempt, sessionUserId, now)` → `"ok" \| "foreign" \| "expired"` | RF-1, RF-6, D11 |
| `domain/steamProfile.ts` (nuevo) | `CS2_APP_ID = 730`; `steamProfileFrom(summary, owned)` → `RealProfile` (nombre, avatar, país, horas por separado); `minutesToHours` (hacia abajo) | RF-10, RF-11, RF-17, D7, D9 |
| `domain/steamRules.ts` (nuevo) | `STEAM_ERRORS` (textos literales de RF-6 y los propios), `parseCompleteBody(body)` | RF-6, RF-20, RF-22 |
| `domain/syncCooldown.ts` | `syncCooldown(lastSyncedAt: Date \| null, now)`: `null` = «sin lectura que cuente» → permitido | RF-12, D6 |

### Backend — modelo y servicios
| Archivo | Responsabilidad | RF |
|---|---|---|
| `models/steamAttempt.ts` (nuevo) | `{ user, tokenHash, expiresAt }`; índice único en `user` (un intento abierto por usuario, D11); índice TTL en `expiresAt` (`expireAfterSeconds: 0`: Mongo los borra solo, RNF-7) | RF-1, RF-6, RNF-7 |
| `services/steamAttempts.ts` (nuevo) | `openAttempt(userId, now)` (reemplaza el anterior con `findOneAndUpdate … upsert`; devuelve el token en claro, en base solo su hash SHA-256); `findAttempt(token)`; `consumeAttempt(attempt)` (`findOneAndDelete` por `_id`, usuario y hash: solo uno gana); `discardAttempt(userId, token)` | RF-1, RF-5, RF-6, RF-7 |
| `services/steamClient.ts` (nuevo) | `SteamClient { verifyAssertion(params, signal): "valid"\|"invalid"\|"unavailable"; readProfile(steamId, signal): RealResult }` y `createSteamClient({ apiKey, fetchFn = fetch })`. Única pieza con red y con la clave; cualquier fallo se vuelve `unavailable`, sin registrar la URL ni el error (RNF-2) | RF-4, RF-9, RF-10, RF-11, RF-12, RF-23, RNF-2 |
| `services/steamSource.ts` (nuevo) | `createSteamSource(client): RealSource` (`id: "steam"`) para el registro de la 012: `read` llama a `readProfile` y entrega `RealData { handle: steamId, profile }`; sin jugador → `gone` | RF-14, RF-23 |
| `controllers/steam.ts` (nuevo) | `createSteamRouter({ jwtSecret, now, steam? })`: `GET /` (¿disponible?), `POST /start`, `POST /complete`. Todas con `withUser` (sesión y comprobante, RNF-6) | RF-1 a RF-9, RF-12, RF-22 |
| `controllers/accounts.ts` | La proyección de `/:id/sync` añade `profile`; la espera se calcula con `current.profile === undefined ? null : current.lastSyncedAt` | RF-12, D6 |
| `controllers/users.ts` | C5: `SteamAttempt.deleteMany({ user })` tras C4 | RF-26 |
| `app.ts` | `AppOptions.steamIntegration?: { publicUrl; client }` (no `steam`, para no chocar con `Config.steam`, que lleva la clave); monta `/api/steam`; si hay integración y no hay `sources.cs2`, registra `createSteamSource(client)` | RF-14, RF-22, RNF-4 |
| `index.ts` | Construye `steam` desde `config.steam` (con `createSteamClient`) y lo pasa a `createApp`; deja de pasar `result.config` entero | RF-22, RNF-2 |
| `server.ts` | `prepareDatabase()` agrega `SteamAttempt.init()` (crea los índices) | RNF-7 |
| `utils/config.ts` | `Config.steam: { apiKey; publicUrl } \| null`. Variables **opcionales** `STEAM_API_KEY` y `PUBLIC_URL`; ver 5.2 | RF-22, RNF-2, RNF-4 |
| `backend/.env.example` | Ambas variables **comentadas** (como `HOST`) con su explicación | RNF-2 |
| `backend/requests/steam.rest` (nuevo) | Pruebas a mano de `status` y `start` (`complete` necesita a Steam) | — |

### Frontend
| Archivo | Responsabilidad | RF |
|---|---|---|
| `services/apiContract.ts` | Grupo `steam`: `status(): Promise<{ available: boolean }>`, `start(): Promise<{ url: string }>`, `complete(query): Promise<SteamCompleteResult>` | RF-1, RF-4 a RF-9, RF-22 |
| `services/http/httpApi.ts` | Implementación contra `/api/steam` (usa `request`, que ya manda cookie y `X-CSRF-Token`) | RF-1, RNF-6 |
| `services/mock/mockApi.ts` | `status` → `{ available: false }`; `start` y `complete` rechazan con «No disponible en modo de demostración». Nunca simulan una verificación | RF-21 |
| `domain/steamDisplay.ts` (nuevo) | Funciones puras: `formatHours(n)` → `"312 h"`; `formatCountry(code)` (`Intl.DisplayNames(["es"], { type: "region" })`, o el código si no lo conoce); `steamProfileRows(profile)` → país y horas con `"perfil de Steam privado"` cuando faltan | RF-11, RF-17, RF-18, RF-19 |
| `shared/utils/copy.ts` | `STEAM_RESYNC_NOTE`, `STEAM_PRIVATE_TEXT`, `STEAM_NOTICES` (verificada, cancelada), `STEAM_MOCK_DISABLED_TEXT`, `STEAM_BUTTON_LABEL` | RF-4, RF-5, RF-11, RF-21, RF-25 |
| `app/routes.ts`, `app/router.tsx` | Ruta `steamReturn = "/verificar/steam"`, **fuera** de `ProtectedRoute` y de `PublicOnlyRoute`, y **no** incluida en `isProtectedPath` | RF-7 |
| `features/steam/pages/SteamReturnPage.tsx` (nuevo) | Página de vuelta: sin sesión → `<Navigate to=login replace>` sin `from`; con sesión → una sola llamada a `steam.complete`, «Verificando con Steam…» mientras tanto, y `navigate(profile, { replace, state: { steamNotice } })` | RF-4 a RF-9, RF-20, RNF-6 |
| `features/steam/hooks.ts` (nuevo) | `useSteamAvailability()` (consulta; desactivada en modo simulado) y `useStartSteamVerification()` (mutación que redirige) | RF-1, RF-22 |
| `features/steam/components/SteamVerifyButton.tsx` (nuevo) | Botón «Verificar con Steam»: desactivado con texto en modo simulado; oculto si Steam no está disponible o aún no se sabe | RF-2, RF-21, RF-22 |
| `features/steam/components/SteamProfileBlock.tsx` (nuevo) | Avatar (con respaldo), nombre recortado, país, horas total y 2 semanas, y la etiqueta `OriginTag` del bloque `profile` | RF-15, RF-18, RF-19 |
| `features/profile/components/AccountRow.tsx` | Muestra `SteamProfileBlock` si `verifiedWith === "steam"`; el botón (prop `onVerify`) en CS2 sin verificar; `RESYNC_NOTE` o `STEAM_RESYNC_NOTE` según la cuenta; prop `owner` para el avatar de respaldo | RF-2, RF-3, RF-15, RF-19, RF-25 |
| `features/profile/components/GameSummaryPanel.tsx` | Pasa `owner` y `onVerify` a `AccountRow` (la ficha de otro jugador no pasa `onVerify`) | RF-15 |
| `features/profile/components/LinkAccountForm.tsx` | Prop `aboveCs2`: se pinta sobre los campos cuando el juego elegido es CS2 | RF-2, RF-16 |
| `features/profile/pages/SettingsPage.tsx`, `ProfilePage.tsx` | Pasan `onVerify`; el perfil muestra el aviso que llega en `location.state.steamNotice` | RF-2, RF-20 |
| `app/layouts/AppLayout.tsx`, `app/pages/LandingPage.tsx` | `DemoTag` global solo si `env.useMockApi` | RF-24 |

### Documentos
| Archivo | Cambio |
|---|---|
| `AGENTS.md` | Servicios y dominio nuevos, rutas, variables, comando |
| `PRODUCT.md` | «Evidence on Hand» y «Capabilities» (RF de la spec, «Impacto») |
| `README.md` | `STEAM_API_KEY` y `PUBLIC_URL` (local y servidor del curso), sin valores |
| `MEMORY.md` | Estado de la 013 al cerrar cada fase |
| `specs/013-vinculacion-steam/spec.md` | Casillas de «Criterios de finalización» al validar. **Las specs 002, 007 y 012 no se editan** (decisión del 2026-11-18) |

## 3. Funciones puras (el instante, «hoy», llega como parámetro)

```ts
// domain/steamAttempt.ts
attemptExpiry(now: Date): Date                       // now + 10 min                      (RF-1)
attemptStatus(a: { userId; expiresAt }, sessionUserId, now): "ok" | "foreign" | "expired"
//   a.userId ≠ sessionUserId → "foreign"   (se mira primero: no revela si venció)       (RF-6)
//   now ≥ a.expiresAt        → "expired"                                                (RF-6)
//   si no                    → "ok"

// domain/syncCooldown.ts
syncCooldown(lastSyncedAt: Date | null, now: Date): CooldownResult
//   null → { allowed: true }   (verificada sin perfil: no cuenta para la espera)       (RF-12, D6)
//   igual que hoy en el resto

// domain/steamOpenId.ts   (sin reloj: la firma y el nonce los valida Steam)
parseSteamResponse(query: Record<string,string>, expectedReturnTo: string): ParsedResponse
// domain/steamProfile.ts
steamProfileFrom(summary: SteamSummary | undefined, owned: SteamOwned | undefined): RealProfile
minutesToHours(minutes: number): number              // Math.floor(minutes / 60)           (RF-18)
```

## 4. Algoritmos

### 4.1 Abrir el intento (`POST /api/steam/start`) — RF-1, RF-3, RF-22
```
sesión (withUser)                                    → 401 como siempre
si steam no configurado                              → 503 STEAM_ERRORS.notConfigured       (RF-22)
si existe cuenta { user, gameId: "cs2", verification } → 409 STEAM_ERRORS.alreadyVerified    (RF-3)
token = 32 bytes aleatorios en base64url
openAttempt(userId, now) guarda { user, sha256(token), expiresAt = attemptExpiry(now) },
   reemplazando el intento anterior del usuario (upsert por user)                       (D11)
returnTo = PUBLIC_URL + "/verificar/steam?attempt=" + token
url = STEAM_OPENID_URL + "?" + buildLoginParams(returnTo, realm = PUBLIC_URL)
200 { url }
```

### 4.2 Completar (`POST /api/steam/complete`, cuerpo `{ query }`) — RF-4 a RF-9, RF-12, RF-26
`query` son los parámetros de la dirección de la página de vuelta (`attempt` y `openid.*`).
```
sesión (withUser)                                    → 401 (RF-7: la página manda a iniciar sesión)
si steam no configurado                              → 503 notConfigured
b = parseCompleteBody(body); si no es válido         → 400 RF-6
token = query.attempt
─ Cancelación ─
si query["openid.mode"] ≠ "id_res" (cancel o ausente):
    si token es texto → discardAttempt(userId, token)   // solo borra uno propio
    → 200 { outcome: "cancelled" }                                                      (RF-5)
─ Intento ─
a = findAttempt(token)
si a no existe                                       → 400 RF-6   (anulado, usado o inexistente)
estado = attemptStatus(a, userId, now)
   "foreign"  → 400 RF-6, el intento ajeno NO se toca
   "expired"  → borra el intento; 400 RF-6
consumeAttempt(a)    // findOneAndDelete: si otro lo consumió antes → null → 400 RF-6
                     // de aquí en adelante el intento queda usado pase lo que pase
─ Respuesta de Steam ─
expectedReturnTo = PUBLIC_URL + "/verificar/steam?attempt=" + token
r = parseSteamResponse(query, expectedReturnTo)
si r es "invalid" (falta un campo firmado, op_endpoint ≠ Steam, return_to distinto, claimed_id mal)
                                                     → 400 RF-6
si existe cuenta CS2 verificada del usuario          → 400 RF-6                         (RF-3, RF-6)
v = client.verifyAssertion(r.params)     // check_authentication, con plazo de 8 s
   "unavailable" → 503 sourceUnavailable("Steam")                                       (RF-9)
   "invalid"     → 400 RF-6
─ Datos reales ─
p = readWithTimeout(source, { gameId:"cs2", handle: r.steamId, externalId: r.steamId })
real = p.ok ? p.data : { handle: r.steamId }          // sin perfil si falló o "gone"     (RF-12)
─ Verificar (spec 012) ─
res = verifyAccount({ userId, gameId:"cs2", handle: r.steamId,
        verification: { source:"steam", externalId: r.steamId }, real, now })
   409 → 409 verifiedElsewhere                                                          (RF-8)
   404 → 404 (usuario eliminado entretanto)
200 { outcome: "verified", account: res.account }                                       (RF-4)
```
- La cuenta propia (vinculada a mano, con otro SteamID64 o el mismo) se **reemplaza** por la de
  Steam (spec 012, RF-13), sin código nuevo.
- `verifiedState` de la 012 deja `lastSyncedAt = now` también sin perfil; lo que cambia la espera
  es la regla de `syncCooldown(null)` (4.4).

### 4.3 Lectura del perfil (`SteamClient.readProfile`) — RF-10, RF-11, RF-17, RF-23
```
GetPlayerSummaries(steamids=id)  y  GetOwnedGames(steamid=id, appids_filter=[730],
                                                   include_played_free_games=1)   // en paralelo
cualquier error de red, estado ≠ 200, JSON ilegible o plazo vencido → { ok:false, reason:"unavailable" }
summary.response.players vacío                                     → { ok:false, reason:"gone" }  (RF-23)
si no, { ok:true, data:{ handle: id, profile: steamProfileFrom(summary, owned) } }
```
```
steamProfileFrom(summary, owned):
  displayName = summary.personaname (sin caracteres de control, máx. 128)       (RF-19)
  avatarUrl   = summary.avatarfull solo si es https y de steamstatic.com/akamaihd.net, si no se omite
  country     = summary.loccountrycode si son 2 letras A–Z, si no se omite       (RF-11)
  si owned entrega la lista (typeof owned.response.game_count === "number"):     (D7)
      g = owned.response.games?.find(appid === 730)
      hoursTotal  = minutesToHours(g?.playtime_forever ?? 0)                     (RF-17: 0 h si no tiene CS2)
      hoursRecent = minutesToHours(g?.playtime_2weeks  ?? 0)
  si no entrega la lista: sin hoursTotal ni hoursRecent                          (RF-11)
```
Cada dato ausente queda como campo ausente; la interfaz decide el texto (5.6).

### 4.4 Resincronizar (RF-14, RF-23, RF-12) — cambios mínimos sobre la 012
`POST /api/accounts/:id/sync` ya consulta la fuente registrada para CS2 (`createSteamSource`) y
aplica `applyReal` (que reemplaza `profile`). Lo nuevo:
```
cooldown = syncCooldown(current.profile === undefined ? null : current.lastSyncedAt, at)
```
El `gone` ya responde 404 «la cuenta ya no existe en Steam» y conserva la cuenta (RF-23).

### 4.5 Eliminación del usuario (RF-26)
`DELETE /api/users/:id`: tras C4, `SteamAttempt.deleteMany({ user })` (C5). Si C5 fallara, el
intento residual es inservible (`withUser` da 401 al usuario inexistente) y el TTL lo borra (RNF-7).

## 5. Decisiones técnicas

### 5.1 Dónde vive el intento y qué se guarda
- **P13-1. Intento en MongoDB, con TTL, no en memoria ni en el JWT.** Una sola instancia podría
  usar memoria, pero el intento debe sobrevivir a un reinicio (`pm2`) y a que Mongo lo limpie
  solo (RNF-7, sin tareas programadas). *Descartada:* mapa en memoria (se pierde al reiniciar;
  crecimiento sin límite); incluir el intento en la cookie de sesión (cambia la spec 002).
- **P13-2. Se guarda el hash SHA-256 del token, no el token.** El token viaja en la dirección de
  vuelta; el hash evita que una lectura de la base entregue intentos utilizables. *Descartada:*
  guardar el token en claro (más simple, sin ventaja real).
- **P13-3. Un documento por usuario (índice único en `user`).** Cumple D11 («abrir uno nuevo
  anula el anterior») con un `upsert` atómico, sin carrera. *Descartada:* varios intentos por
  usuario con «el más reciente gana» (exige ordenar y limpiar).
- **P13-4. El intento se consume antes de hablar con Steam.** El uso es único (RF-6, «ya se
  usó») aunque Steam falle: si cae (RF-9) el usuario empieza de nuevo. *Descartada:* consumir al
  final (dos pestañas con la misma dirección podrían verificar dos veces).
- **P13-5. Un intento ajeno no se consume.** Quien abre la dirección de otro con su sesión recibe
  RF-6 y el dueño legítimo conserva su intento (caso límite de la spec).

### 5.2 Configuración y dirección de vuelta
- **P13-6. `STEAM_API_KEY` y `PUBLIC_URL` opcionales y comentadas en `.env.example`.** Sin clave,
  Steam no está configurado y la verificación no se ofrece (D4, RF-22). `PUBLIC_URL` es el
  origen que ve el **navegador** (`http://localhost:5173` en desarrollo, porque Vite hace de
  proxy y la cookie es de ese origen; `https://fullstack.dcc.uchile.cl:7041` en el servidor del
  curso) y es el `return_to` y el `realm` (RNF-4). Reglas de `parseConfig`: clave sin
  `PUBLIC_URL` → error; `PUBLIC_URL` debe ser `http(s)://host[:puerto]` sin ruta, ni consulta,
  ni `#`; en producción debe ser `https`; los mensajes **nunca** incluyen la clave (RNF-2).
  `envExample.test.ts` sigue viendo siete variables porque estas van comentadas.
  *Descartada:* deducir la dirección de la cabecera `Host` de la petición (un atacante la
  controla y rompería RNF-4).
- **P13-7. La cuenta nueva de CS2 toma la primera región del catálogo («South America»).**
  Steam no entrega región y la 012 impide editar una cuenta verificada. Ver observación O-1.

### 5.3 Qué se comprueba de la respuesta de Steam
- **P13-8. Validación local y confirmación de Steam, las dos.** `check_authentication` solo
  garantiza la firma de los campos listados en `openid.signed`; si un atacante manda un
  `claimed_id` ajeno **fuera** de esa lista, Steam diría `is_valid:true`. Por eso
  `parseSteamResponse` exige que `signed` incluya `op_endpoint`, `claimed_id`, `identity`,
  `return_to`, `response_nonce` y `assoc_handle`, que `op_endpoint` sea el de Steam, que
  `claimed_id` sea `https://steamcommunity.com/openid/id/<7656119 + 10 dígitos>` e igual a
  `identity`, y que `return_to` sea **exactamente** el esperado (que además lleva el token del
  intento, firmado por Steam). *Descartada:* confiar solo en `is_valid:true`.
- **P13-9. Sin librería de OpenID.** Son tres funciones puras y un `POST`; una dependencia nueva
  exigiría justificación (constitución 1, RNF-5) y la mayoría arrastra más de lo que se usa.
- **P13-10. `fetch` inyectable en `createSteamClient`.** Las pruebas pasan un `fetch` falso y
  nunca tocan la red (RNF-3). Los controladores se prueban con un `SteamClient` falso.
  *Descartada:* interceptar `fetch` global (frágil entre archivos de prueba).

### 5.4 Datos de perfil
- **P13-11. Todo o nada en la lectura del perfil.** Si falla cualquiera de las dos consultas
  (resumen o juegos), la lectura es `unavailable`: no se guarda un perfil a medias que luego
  parezca «perfil privado». «Privado» solo significa que Steam respondió y no entregó el dato.
- **P13-12. Se guarda el código de país (ISO 3166-1 alfa-2), no su nombre.** El nombre en español
  se resuelve al pintar con `Intl.DisplayNames`. *Descartada:* guardar el nombre (depende del
  idioma; el inglés es una spec futura, constitución 6).
- **P13-13. Las horas se guardan ya enteras y hacia abajo** (`minutesToHours`), así la respuesta
  de la API y la pantalla dicen lo mismo (RF-18).
- **P13-14. Solo `https` de los dominios de Steam para el avatar.** El campo se pinta en un
  `<img>`; se descarta cualquier otra URL y la interfaz muestra el respaldo (RF-19).
- **P13-15. `isPrivate` no se usa.** El estado «privado» se deduce por dato (RF-11), no con un
  booleano único que contradiga D7.

### 5.5 Espera mínima y verificación sin perfil
- **P13-16. `syncCooldown(null)` = permitido; el controlador pasa `null` si no hay `profile`.**
  Una verificación sin perfil (RF-12) deja `lastSyncedAt = now` (lo escribe `verifiedState` de
  la 012, que no se toca) pero el usuario puede resincronizar de inmediato. Como cualquier
  lectura real exitosa entrega perfil, la regla «sin perfil → sin espera» no afecta a las
  cuentas normales. *Descartadas:* retroceder `lastSyncedAt` (falsea «Última lectura» en la
  interfaz); agregar un campo `profileReadAt` (otro dato que mantener).

### 5.6 Interfaz
- **P13-17. La página de vuelta está fuera de las rutas protegidas.** Si estuviera bajo
  `ProtectedRoute`, un usuario sin sesión iría a login recordando la ruta y, tras entrar, volvería
  a ella (RF-7 exige que la verificación **no** continúe sola). Fuera de ellas y fuera de
  `isProtectedPath`, `AuthProvider` tampoco recuerda su dirección; la propia página manda a
  login sin `from`.
- **P13-18. El aviso viaja en `location.state`, no en la dirección.** Una dirección con
  `?steam=ok` permitiría a un tercero mostrar un aviso de éxito falso; el estado de navegación
  solo lo crea la app. El aviso dura hasta que el usuario sale del perfil (RF-20) y sobrevive a
  una recarga porque el estado del historial persiste.
- **P13-19. `start` devuelve la URL y el navegador la abre**, no un `GET` con redirección: el
  `POST` lleva el comprobante anti-CSRF y la cookie, un `GET` desde un enlace no (RNF-6). Antes
  de `window.location.assign` la interfaz comprueba que el origen sea `https://steamcommunity.com`.
- **P13-20. «Disponible» por consulta, no por variable de interfaz.** La interfaz no sabe si el
  servidor tiene clave: pregunta a `GET /api/steam` (con sesión). Mientras responde o si falla,
  el botón no se muestra (RF-22). En modo simulado no se consulta y el botón sale desactivado
  (RF-21). *Descartada:* una variable `VITE_STEAM_ENABLED` (se desincroniza del servidor).
- **P13-21. Respaldo del avatar con `onError` y el monograma del dueño.** Para eso `AccountRow`
  recibe `owner` (nombre y color) y lo usa también en la ficha de otro jugador (RF-19).
- **P13-22. El nombre se recorta con CSS (`text-overflow: ellipsis`)** y se pinta como texto de
  React (nunca HTML): «tal como lo entrega Steam» (RF-19).

## 6. Cómo se pinta en la interfaz
- **Fila de la cuenta (`AccountRow`, en perfil, Configuración y ficha de jugador).** Para una
  cuenta `verifiedWith === "steam"`: sello «Verificada con Steam»; bajo el identificador
  (SteamID64) el **bloque de Steam**: avatar, nombre visible, país y «312 h en total · 18 h en
  las últimas 2 semanas», con la etiqueta «Datos de Steam». Cada dato que falta dice «perfil de
  Steam privado» en su lugar. Si no hay `profile` (RF-12) el bloque dice «Aún no tenemos tus
  datos de Steam; resincroniza para obtenerlos» (ver O-2). Rango e historial siguen con «Datos de
  demostración».
- **Botón «Verificar con Steam».** En la fila de una cuenta de CS2 sin verificar (perfil y
  Configuración) y sobre el formulario de vínculo cuando el juego elegido es CS2 y no hay cuenta
  (RF-2). Con CS2 verificada no aparece (RF-3); sin clave en el servidor no aparece (RF-22); en
  modo simulado aparece desactivado con «No disponible en modo de demostración» (RF-21). El
  formulario manual no cambia (RF-16).
- **Texto de «Resincronizar».** En una cuenta verificada con Steam: «Al resincronizar, se vuelven a
  leer tus datos de Steam. Puedes hacerlo cada 5 minutos.»; en las demás, el de la 007 (RF-25).
- **Página de vuelta.** «Verificando con Steam…» (estado `Working`) y, al terminar, `/perfil` con
  el aviso encima de «Mis juegos»: «cuenta de Steam verificada» (éxito), «verificación con Steam
  cancelada», «no se pudo verificar con Steam, vuelve a intentarlo», «esta cuenta ya está
  verificada por otro usuario» o «Steam no está disponible por ahora, intenta más tarde» (RF-20).
  Éxito y cancelada usan el aviso `notice--pen` existente; los errores, `notice--error`.
- **Aviso global «Datos de demostración».** Solo con `env.useMockApi` (barra de navegación, pie y
  portada); las etiquetas por bloque no cambian (RF-24).
- **Errores de resincronización** (429, 503, 404 «la cuenta ya no existe en Steam»): los muestra el
  `MutationNotice` existente con el texto del servidor.

## 7. Estrategia de pruebas (`node --test`, sin red; frontend: build, typecheck, lint)
**Backend, tests primero (rojo → verde):**
- **Dominio** (`tests/unit/`): `steamAttempt` (ok, ajeno, vencido justo en el límite, ajeno
  prevalece sobre vencido); `steamOpenId` (respuesta válida; `cancel`; sin modo; `signed` sin
  `claimed_id`; `op_endpoint` ajeno; `return_to` distinto, con otro token y con otro origen;
  `claimed_id` con 16 o 18 dígitos o de otro dominio; `identity` ≠ `claimed_id`;
  `buildCheckAuthBody` ignora parámetros que no son `openid.*`); `steamProfile` (público
  completo; país ausente; sin lista de juegos → sin horas; lista sin CS2 → 0 h; 61 minutos → 1 h;
  avatar con URL no permitida; nombre con caracteres de control); `syncCooldown(null)`;
  `parseCompleteBody`; `config` (clave sin dirección, dirección con ruta, `http` en producción,
  sin variables → `steam: null`, el mensaje no contiene la clave); aislamiento del dominio
  (`domainIsolation.test.ts` ya cubre los archivos nuevos de `domain/`).
- **Modelo** (`SteamAttempt`): un solo documento por usuario, el índice TTL existe con
  `expireAfterSeconds: 0`, el token no se guarda en claro.
- **Cliente** (`steamClient.test.ts`, con `fetch` falso): `valid`/`invalid`/`unavailable` de
  `check_authentication` (cuerpo enviado, sin la clave); perfil público, privado, sin juegos,
  sin jugador (`gone`), HTTP 500, JSON roto y plazo vencido → `unavailable`; **ningún mensaje ni
  registro contiene la clave** (RNF-2).
- **Controlador** (`steam.test.ts`, con `SteamClient` falso y `createApp({ steam })`):
  - `GET /` y `POST /start`: 401 sin sesión o sin comprobante; no configurado → disponible `false`
    y 503; con CS2 verificada → 409; dos `start` seguidos → el primer token deja de servir
    (D11); la URL devuelta apunta a Steam con el `return_to` configurado.
  - `POST /complete`: éxito con cuenta nueva y con cuenta manual convertida (otro SteamID64 →
    reemplaza); cancelar y volver sin respuesta (RF-5, el intento queda descartado); una por una
    las causas de RF-6 (firma inválida, sin intento, de otro usuario —y el intento ajeno
    sigue—, ya usado, vencido, anulado, `return_to` de otra dirección, ya verificada); sin
    sesión → 401 y la cuenta no cambia (RF-7); SteamID64 verificado por otro → 409 (RF-8);
    Steam caído → 503 (RF-9); perfil que falla o `gone` tras verificar → cuenta verificada sin
    perfil y `POST /accounts/:id/sync` inmediato **no** da 429 (RF-12); perfil privado y lista
    de juegos vacía (RF-11, RF-17); los textos literales de RF-6, RF-8, RF-9; la respuesta no
    contiene `externalId` ni la clave.
  - Dos `complete` simultáneos con el mismo intento: uno verifica, el otro RF-6.
  - Cascada (`userDeletion`): borrar un usuario con intento abierto lo elimina (RF-26).
- **Resincronización con Steam** (`accountRealSync`): perfil actualizado (RF-14), `gone` → 404 con
  la cuenta intacta (RF-23), 429 a los 4 minutos si hay perfil, sin 429 si no hay perfil.
- **Frontend:** `npm run typecheck`, `lint` y `build` en verde. **Recorrido manual** (criterios de
  la spec): modo simulado (botón desactivado, sin aviso global con el servidor real y con aviso
  en modo simulado), servidor sin clave (sin botón), servidor con clave y la cuenta real de
  Steam del equipo (verificar, ver nombre, avatar y horas; resincronizar; desvincular; volver
  con otra sesión; cancelar en Steam; recargar la página de vuelta) y servidor del curso con
  `PUBLIC_URL` propia.
- Cierre: suite completa del backend sin conexión a Internet (RNF-3).

## 8. Riesgos
- **R13-1. Respuesta de `GetOwnedGames` con `appids_filter`.** Supongo que con el filtro la
  respuesta trae `game_count` (también 0) si la lista es pública y viene vacía si es privada;
  la documentación de Steam no lo asegura. Si la prueba manual con la cuenta real lo contradice,
  la alternativa es pedir la lista sin filtro (respuesta grande, mismo plazo de 8 s). Se
  comprueba en el primer recorrido manual y el resultado se anota en `validation.md`.
- **R13-2. Cuenta de Steam sin la lista de juegos visible** muestra «perfil de Steam privado»
  en las horas aunque el perfil sea público (D7): es el comportamiento pedido.
- **R13-3. `Intl.DisplayNames` en navegadores sin datos de región** devolvería el código; se
  muestra el código tal cual (no se rompe la fila).
- **R13-4. Reloj y Mongo.** El TTL de Mongo corre cada ~60 s, así que un intento vencido puede
  seguir en la base hasta un minuto: por eso `attemptStatus` decide con `now` y el TTL solo limpia.
- **R13-5. Servidor del curso con `PUBLIC_URL` mal escrita:** todas las verificaciones caerían en
  RF-6. Se mitiga con la validación de `parseConfig` y el recorrido manual del servidor del curso.

## 9. Observaciones para el usuario (no cambian la spec)
- **O-1. Región.** La spec no dice qué región tiene una cuenta de CS2 verificada con Steam: Steam
  no la entrega y la 012 prohíbe editar cuentas verificadas. El plan usa la primera del catálogo
  («South America», P13-7). Alternativa: que el formulario de vínculo mande la región elegida al
  abrir el intento (cambia la spec y el contrato de `start`). Confirmar si basta con el valor por
  defecto.
- **O-2. Texto de «sin perfil».** RF-12 deja la cuenta verificada «sin datos de perfil» pero no
  fija qué se ve. El plan propone «Aún no tenemos tus datos de Steam; resincroniza para
  obtenerlos». Confirmar el texto.
- **O-3. Texto de RF-3.** La spec no fija el mensaje del rechazo de `start` con una cuenta
  verificada. El plan usa «ya tienes una cuenta de CS2 verificada; desvincúlala antes de verificar
  otra».
- **O-4. Número de tareas.** Quedan 11 tareas previstas (sección 10): el flujo SDD propone dividir
  la spec si pasan de 10. Propongo mantenerla entera, con la frontera natural «backend (T1 a T7)»
  y «frontend y cierre (T8 a T11)», cada bloque con su propia validación.

## 10. Tareas previstas (detalle en `tasks.md`, tras aprobar este plan)
1. Configuración: `config.ts`, `.env.example`, pruebas de `parseConfig` (RF-22, RNF-2, RNF-4).
2. Dominio puro: `steamAttempt`, `steamOpenId`, `steamProfile`, `steamRules` y `syncCooldown(null)`
   con sus pruebas (RF-1, RF-6, RF-10, RF-11, RF-12, RF-17, RF-18).
3. Modelo `SteamAttempt`, servicio de intentos, índices en `prepareDatabase` y C5 de la cascada
   (RF-1, RF-6, RF-26, RNF-7).
4. `steamClient` y `steamSource` con `fetch` falso (RF-9, RF-10, RF-11, RF-14, RF-23, RNF-2).
5. Router `steam`: `GET /` y `POST /start`, `AppOptions.steam` e `index.ts` (RF-1, RF-3, RF-22).
6. `POST /complete` (RF-4 a RF-9, RF-12, RF-20 de textos, RNF-6).
7. Resincronización con Steam: espera sin perfil y pruebas de RF-12, RF-14 y RF-23.
8. Frontend: contrato, `httpApi`, `mockApi`, `steamDisplay`, textos y rutas (RF-21).
9. Frontend: página de vuelta, avisos del perfil y botón con su hook (RF-2, RF-3, RF-4 a RF-9,
   RF-20, RF-22).
10. Frontend: bloque de datos de Steam en `AccountRow`, ficha de jugador, texto de
    «Resincronizar», aviso global solo simulado (RF-15, RF-16, RF-18, RF-19, RF-24, RF-25).
11. Cierre: suite completa, typecheck, lint y build, `requests/steam.rest`, `AGENTS.md`,
    `PRODUCT.md`, `README.md`, `MEMORY.md` y recorridos manuales (con la cuenta real y la clave
    del equipo).

## 11. Trazabilidad
| RF | Dónde |
|---|---|
| RF-1 | 4.1, P13-1 a P13-3, `steamAttempts`, `steamAttempt`, `SteamAttempt` |
| RF-2 | `SteamVerifyButton` en `AccountRow` y `LinkAccountForm` (sección 6) |
| RF-3 | 4.1 (409), 4.2 (RF-6), el botón no se ofrece |
| RF-4 | 4.2 (`verifyAccount`), `SteamReturnPage`, aviso del perfil |
| RF-5 | 4.2 (cancelación), `parseSteamResponse`, aviso |
| RF-6 | 4.2 (todas las causas), P13-4, P13-5, P13-8 |
| RF-7 | P13-17, `SteamReturnPage` (sin `from`) |
| RF-8 | 4.2 (409 de `verifyAccount`), aviso |
| RF-9 | 4.2 (503), `SteamClient.verifyAssertion`, aviso |
| RF-10 | 4.3, `steamProfileFrom`, `SteamClient.readProfile` |
| RF-11 | `steamProfileFrom`, `steamDisplay.steamProfileRows` |
| RF-12 | 4.2 (`real` sin perfil), 4.4, P13-16, `syncCooldown(null)` |
| RF-13 | Sin cambio: `blockOrigins`/`verifiedState` de la 012 mantienen rango, historial y partidas simulados |
| RF-14 | 4.4, `createSteamSource`, `applyReal` de la 012 |
| RF-15 | `SteamProfileBlock` en `AccountRow` (perfil, Configuración, ficha) |
| RF-16 | El formulario manual no cambia; `aboveCs2` solo agrega el botón |
| RF-17 | `steamProfileFrom` (lista sin CS2 → 0 h) |
| RF-18 | `minutesToHours`, `steamDisplay.formatHours`, `formatCountry` |
| RF-19 | P13-14, P13-21, P13-22 |
| RF-20 | `STEAM_ERRORS`, `STEAM_NOTICES`, P13-18 |
| RF-21 | `SteamVerifyButton`, `mockApi.steam` |
| RF-22 | P13-6, P13-20, `config.steam`, `GET /api/steam` |
| RF-23 | 4.3 (`gone`), 4.4 |
| RF-24 | `AppLayout` y `LandingPage` con `env.useMockApi` |
| RF-25 | `STEAM_RESYNC_NOTE` en `AccountRow` |
| RF-26 | 4.5 (C5) |
| RNF-1 | P13-8: el cliente solo envía a Steam los parámetros `openid.*` recibidos; nunca hay contraseña |
| RNF-2 | P13-6, `steamClient` sin registrar URL ni error, `toGameAccountJson` ya no expone `externalId` |
| RNF-3 | P13-10 |
| RNF-4 | P13-6, `parseSteamResponse` compara `return_to` exacto |
| RNF-5 | P13-9 |
| RNF-6 | `withUser` en las tres rutas, P13-19 |
| RNF-7 | P13-1, índice TTL |
