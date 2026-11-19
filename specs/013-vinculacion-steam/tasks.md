# Tareas 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: aprobado (2026-11-18, por el usuario: «apruebo las tareas»); **T1 y T2 hechas (2026-11-18)**. Plan:
`specs/013-vinculacion-steam/plan.md` (aprobado el 2026-11-18). Spec:
`specs/013-vinculacion-steam/spec.md`.

Once tareas (el plan fijó mantener la spec entera, observación O-4): T1 a T7 son el backend y
T8 a T11 la interfaz y el cierre. Una tarea cada vez, en orden. En el backend, las pruebas van
primero y se ven en rojo por la razón correcta antes de escribir el código (constitución,
principio 4); en el frontend bastan `build`, `typecheck` y `lint` en verde.

Comandos (desde `backend/`): pruebas de un archivo
`NODE_ENV=test node --test tests/<carpeta>/<archivo>.test.ts`; todo el backend
`npm test --script-shell=bash` en Windows; además `npm run typecheck` y `npm run lint`.
Desde `frontend/`: `npm run typecheck`, `npm run lint` y `npm run build`.

Ninguna tarea cierra con pruebas, typecheck o lint en rojo, ni con `.only`. Ninguna prueba
toca la red (RNF-3) y ninguna lleva una clave de Steam real: las pruebas usan una clave falsa.
No se editan las specs 002, 007 ni 012 (decisión del 2026-11-18).

- [x] **T1. Configuración de Steam.** `Config.steam: { apiKey, publicUrl } | null` en
  `backend/src/utils/config.ts` a partir de `STEAM_API_KEY` y `PUBLIC_URL` (plan, P13-6): sin
  clave → `null`; clave sin dirección → error; dirección con ruta, consulta o `#`, o sin
  `http(s)`, → error; en producción solo `https`; ningún mensaje contiene la clave. Ambas
  variables **comentadas** en `backend/.env.example`, con su explicación.
  RF-22, RNF-2, RNF-4.
  Hecho cuando: `tests/unit/config.test.ts` tiene los casos nuevos (sin variables, solo clave,
  dirección inválida, `http` en producción, configuración válida, la clave ausente de todos los
  mensajes) vistos en rojo y luego en verde; `tests/unit/envExample.test.ts` sigue viendo las
  siete variables y comprueba que las dos nuevas están comentadas; `typecheck` y `lint` en verde.
  **Resultado (2026-11-18):** `config.test.ts` y `envExample.test.ts` 119/119 en verde (11 casos
  nuevos de Steam y 1 de la plantilla, antes en rojo); `lint` y `tsc --noEmit` de `src/` sin
  errores; suite completa 2399 de 2407. **Salvedad:** los 8 fallos y el único error de
  `typecheck` (`tests/`) son de `tests/controllers/ui.test.ts`, archivo sin commitear de la spec
  010 cuyo código (`uiDir` en `app.ts`) no está en esta rama; no los causa esta tarea.

- [x] **T2. Dominio puro de Steam.** Cuatro archivos nuevos en `backend/src/domain/` y un cambio:
  `steamAttempt.ts` (`ATTEMPT_TTL_MS`, `attemptExpiry`, `attemptStatus`: ajeno prevalece sobre
  vencido), `steamOpenId.ts` (`buildLoginParams`, `parseSteamResponse`, `buildCheckAuthBody`,
  `isValidCheckResponse`; plan, P13-8), `steamProfile.ts` (`steamProfileFrom`, `minutesToHours`;
  país, horas y lista de juegos por separado) y `steamRules.ts` (`STEAM_ERRORS` con los textos
  literales de RF-6 y los propios, `parseCompleteBody`); `syncCooldown.ts` acepta
  `lastSyncedAt: Date | null` (`null` = permitido). Sin Express, Mongoose, red ni reloj: «hoy»
  llega como parámetro.
  RF-1, RF-5, RF-6, RF-10, RF-11, RF-12, RF-17, RF-18, RF-19, RF-20, RNF-1, RNF-4.
  Hecho cuando: una prueba por archivo en `tests/unit/` con los casos del plan (sección 7:
  intento ok, ajeno, vencido en el límite; respuesta válida, `cancel`, sin modo, `signed` sin
  `claimed_id`, `op_endpoint` ajeno, `return_to` con otro token u otro origen, `claimed_id` de 16
  o 18 dígitos, `identity` distinta; perfil público, país ausente, sin lista de juegos, lista sin
  CS2, 61 minutos, avatar de dominio no permitido, nombre con caracteres de control;
  `syncCooldown(null)`) vista en rojo y luego en verde; `tests/unit/syncCooldown.test.ts` sigue
  verde; `domainIsolation.test.ts`, `typecheck` y `lint` en verde.
  **Resultado (2026-11-18):** los cinco archivos y `domainIsolation.test.ts` en verde (84 casos);
  `lint` sin errores y `tsc` sin errores en los archivos nuevos; suite completa 2470 de 2478.
  **Misma salvedad que la T1:** los 8 fallos y el único error de `typecheck` son de
  `tests/controllers/ui.test.ts` (spec 010, sin commitear, `uiDir` ausente de `app.ts`).

- [ ] **T3. Intentos de verificación.** `models/steamAttempt.ts` (`{ user, tokenHash, expiresAt }`,
  índice único en `user`, índice TTL con `expireAfterSeconds: 0`), `services/steamAttempts.ts`
  (`openAttempt` con reemplazo por `upsert` y token en claro solo en el retorno, `findAttempt`,
  `consumeAttempt`, `discardAttempt`), `SteamAttempt.init()` en `prepareDatabase`
  (`server.ts`) y C5 (`SteamAttempt.deleteMany({ user })`) en la cascada de
  `controllers/users.ts`.
  RF-1, RF-6, RF-26, RNF-7.
  Hecho cuando: pruebas de modelo y servicio (un solo intento por usuario, el segundo anula al
  primero, el token no queda en claro, el índice TTL existe, `consumeAttempt` solo gana una vez
  con dos llamadas simultáneas) y el caso de `userDeletion` (un usuario con intento abierto lo
  pierde al eliminarse) vistos en rojo y luego en verde; `userDeletionCascade.test.ts` y
  `startup.test.ts` siguen en verde; `typecheck` y `lint` en verde.

- [ ] **T4. Cliente y fuente de Steam.** `services/steamClient.ts` (`SteamClient`,
  `createSteamClient({ apiKey, fetchFn })`: `verifyAssertion` con `check_authentication` y
  `readProfile` con `GetPlayerSummaries` y `GetOwnedGames` en paralelo; todo fallo →
  `unavailable`, sin registrar la dirección ni el error; jugador inexistente → `gone`) y
  `services/steamSource.ts` (`createSteamSource(client): RealSource` con `id: "steam"`).
  RF-9, RF-10, RF-11, RF-14, RF-17, RF-23, RNF-2, RNF-3.
  Hecho cuando: `tests/unit/steamClient.test.ts`, con un `fetch` falso, cubre `valid`, `invalid`
  y `unavailable` (y el cuerpo enviado a Steam, solo `openid.*`); perfil público, privado, sin
  juegos, sin jugador, HTTP 500, JSON roto y plazo vencido; la clave no aparece en ningún
  mensaje ni registro. Visto en rojo y luego en verde; `typecheck` y `lint` en verde.

- [ ] **T5. Rutas de estado y de inicio.** `controllers/steam.ts` con `createSteamRouter`
  (`withUser` en todas): `GET /` → `{ available }` y `POST /start` (plan, 4.1); `AppOptions.steam`
  en `app.ts` (monta `/api/steam` y registra `createSteamSource` como fuente de CS2 si no hay
  otra); `index.ts` construye la integración desde `config.steam` y deja de pasar `result.config`
  entero; `backend/requests/steam.rest`.
  RF-1, RF-3, RF-22, RNF-2, RNF-6.
  Hecho cuando: `tests/controllers/steam.test.ts` (con un `SteamClient` falso) cubre 401 sin
  sesión y sin comprobante, no configurado (`available: false` y 503), cuenta de CS2 ya
  verificada → 409 con el texto del plan (O-3), dos `start` seguidos (el primer token deja de
  existir) y la URL devuelta (host de Steam, `return_to` con `PUBLIC_URL` y el token); visto en
  rojo y luego en verde; `app.test.ts`, `startup.test.ts` y `process.test.ts` siguen en verde;
  `typecheck` y `lint` en verde.

- [ ] **T6. Completar la verificación.** `POST /api/steam/complete` en `controllers/steam.ts`
  (plan, 4.2): cancelación, intento (ajeno sin consumir, vencido, ya usado), validación local,
  `check_authentication`, lectura del perfil con `readWithTimeout`, `verifyAccount` de la 012 y
  las respuestas `200 { outcome, account }`, 400 (RF-6), 409 (RF-8), 503 (RF-9).
  RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-12, RF-13, RF-20, RNF-1, RNF-6.
  Hecho cuando: `tests/controllers/steam.test.ts` cubre éxito con cuenta nueva y con cuenta
  manual convertida (otro SteamID64 la reemplaza); cancelar y volver sin respuesta (el intento
  queda descartado); cada causa de RF-6 (firma inválida, sin intento, de otro usuario y el
  intento ajeno sigue, ya usado, vencido, anulado, `return_to` de otra dirección, ya tiene una
  verificada); sin sesión → 401 y nada cambia; SteamID64 de otro → 409; Steam caído → 503; perfil
  que falla o `gone` → cuenta verificada sin `profile`; dos `complete` simultáneos (uno verifica,
  el otro RF-6); los textos literales de RF-6, RF-8 y RF-9; la respuesta sin `externalId` ni
  clave. Visto en rojo y luego en verde; `typecheck` y `lint` en verde.

- [ ] **T7. Resincronizar con Steam.** En `controllers/accounts.ts`, la proyección de
  `POST /:id/sync` incluye `profile` y la espera usa
  `syncCooldown(current.profile === undefined ? null : current.lastSyncedAt, at)` (plan, 4.4).
  RF-12, RF-14, RF-23.
  Hecho cuando: pruebas en `tests/controllers/accountRealSync.test.ts` y `steam.test.ts`
  (resincronizar actualiza nombre, avatar, país y horas; sin jugador → 404 «la cuenta ya no
  existe en Steam» con la cuenta intacta; a los 4 minutos → 429 si la cuenta tiene perfil; una
  cuenta verificada sin perfil resincroniza de inmediato y queda con perfil) vistas en rojo y
  luego en verde; la suite completa del backend (`npm test --script-shell=bash`), `typecheck` y
  `lint` en verde. Con esta tarea queda cerrado el backend.

- [ ] **T8. Contrato y modo simulado en la interfaz.** Grupo `steam` en
  `frontend/src/services/apiContract.ts` (`status`, `start`, `complete` y el tipo del resultado),
  implementación en `http/httpApi.ts`, `mockApi.steam` (no disponible, rechaza con «No disponible
  en modo de demostración» y nunca simula), `domain/steamDisplay.ts` (`formatHours`,
  `formatCountry`, `steamProfileRows`), los textos nuevos en `shared/utils/copy.ts` y la ruta
  `steamReturn` en `app/routes.ts` (fuera de `isProtectedPath`).
  RF-11, RF-17, RF-18, RF-21, RF-25.
  Hecho cuando: `npm run typecheck`, `npm run lint` y `npm run build` en verde, y una revisión
  del código confirma que `mockApi.steam` no devuelve ningún dato de Steam ni una verificación.

- [ ] **T9. Página de vuelta, botón y avisos.** `features/steam/pages/SteamReturnPage.tsx`
  (sin sesión → login sin `from`; con sesión, una sola llamada, «Verificando con Steam…», y
  `navigate(perfil, { replace, state: { steamNotice } })`), ruta en `app/router.tsx` fuera de
  `ProtectedRoute` y `PublicOnlyRoute`, `features/steam/hooks.ts`
  (`useSteamAvailability`, `useStartSteamVerification` que comprueba el origen
  `https://steamcommunity.com` antes de redirigir), `components/SteamVerifyButton.tsx`, aviso en
  `ProfilePage` y botón en `SettingsPage` y `LinkAccountForm` (`aboveCs2`).
  RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-20, RF-21, RF-22, RNF-6.
  Hecho cuando: `typecheck`, `lint` y `build` en verde; con el servidor y una `PUBLIC_URL` de
  prueba y un `SteamClient` que no sea el real no se necesita Steam para ver que el botón no
  aparece sin clave, aparece desactivado en modo simulado, y que abrir `/verificar/steam` sin
  sesión lleva a login y, tras entrar, no vuelve a la página de vuelta (registro del recorrido en
  `validation.md`).

- [ ] **T10. Datos de Steam en la cuenta, texto de «Resincronizar» y aviso global.**
  `features/steam/components/SteamProfileBlock.tsx` (avatar con respaldo `onError` al monograma
  del dueño, nombre recortado con CSS, país y horas, «perfil de Steam privado» por dato, texto
  de RF-12 sin perfil y etiqueta «Datos de Steam»), `AccountRow` con `owner`, `onVerify` y
  `STEAM_RESYNC_NOTE` para las cuentas verificadas con Steam, `GameSummaryPanel` pasándolos, y
  `DemoTag` global solo con `env.useMockApi` en `AppLayout` (barra y pie) y `LandingPage`.
  Estilos solo con `tokens.css`.
  RF-11, RF-15, RF-16, RF-17, RF-18, RF-19, RF-24, RF-25.
  Hecho cuando: `typecheck`, `lint` y `build` en verde; con una cuenta de CS2 verificada creada
  directo en una base temporal (como en la validación de la 012) se ve el bloque en el perfil,
  Configuración y la ficha de otro jugador a 1280 y 375 px, con los tres casos de privacidad
  (todo público, país ausente, sin lista de juegos), 0 h y la verificación sin perfil; sin aviso
  global con el servidor real y con aviso en modo simulado. Capturas y resultado en
  `validation.md`.

- [ ] **T11. Cierre y recorridos manuales.** Suite completa del backend sin conexión a Internet,
  `typecheck`, `lint` y `build` de ambos lados; `AGENTS.md`, `PRODUCT.md` («Evidence on Hand» y
  «Capabilities»), `README.md` (`STEAM_API_KEY` y `PUBLIC_URL`, sin valores), `MEMORY.md` y las
  casillas de «Criterios de finalización» de `spec.md`. Recorrido manual, con la cuenta real de
  Steam y la clave que aporta el equipo (nunca en el repositorio): verificar, ver nombre, avatar
  y horas, resincronizar, desvincular, cancelar en Steam, recargar la página de vuelta y volver
  con otra sesión; el primero en desarrollo local y el segundo en el servidor del curso con su
  `PUBLIC_URL`. Anotar en `validation.md` cómo respondió `GetOwnedGames` con el filtro de CS2
  (riesgo R13-1) y, si no coincide con el plan, abrir el cambio correspondiente.
  RF-1 a RF-26 (verificación final), RNF-1 a RNF-7.
  Hecho cuando: todo en verde; una búsqueda de la clave real en el repositorio y en
  `git status` no encuentra nada; `validation.md` tiene cada comprobación con su resultado; los
  recorridos manuales los ejecuta el equipo con sus credenciales y quedan anotados.
