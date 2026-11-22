# AGENTS.md — TeamMatchUp

Registro global y estático para cualquier agente de IA. El estado actual del proyecto
no va aquí: está en `MEMORY.md`.

## Qué es

Plataforma web que empareja jugadores de League of Legends, Rainbow Six Siege y
Counter-Strike 2 cruzando tres condiciones: mismo juego, rango similar (obtenido de la
fuente del juego, no declarado) y disponibilidad en los mismos bloques horarios. El
flujo termina en una sesión agendada, no en una lista de perfiles. Detalle en
`PRODUCT.md`.

## Documentos de referencia (en orden de prioridad)

1. `docs/constitution.md` — principios innegociables. Prevalece sobre todo lo demás.
2. `PRODUCT.md` — usuarios, propósito y principios de producto.
3. `specs/NNN-nombre/{spec,plan,tasks}.md` — qué se construye, cómo y en qué orden.
4. `MEMORY.md` — estado actual. Leerlo al empezar; actualizarlo al cerrar cada fase.
5. Enunciado del hito vigente: `HITO2.md` no existe en el repositorio; el texto aportado por el usuario está en el apéndice A de `specs/016-estado-global/spec.md`.

## Stack y estructura

- `frontend/` — React 18 + TypeScript + Vite + React Router 6 + TanStack Query.
  - `src/app/` composición, enrutado, layouts y control de acceso.
  - `src/config/` lectura de variables de entorno.
  - `src/domain/` reglas puras: tipos, catálogo de juegos y escala de rango, bloques horarios, motor de coincidencias.
  - `src/services/` acceso a datos: `apiContract.ts` (contrato único), `ddragon.ts` (versión cacheada e íconos de Data Dragon de Riot), `http/` (`httpClient.ts` y `httpApi.ts` contra Express; `transport.ts` con plazo de 30 s, ampliable a 65 s en operaciones con Riot, y clasificación de errores; `csrfStorage.ts` con el comprobante `X-CSRF-Token`; `sessionEvents.ts` con el aviso de 401), `mock/` (backend simulado que responde como el servidor: `mockApi.ts`, `simulatedProvider.ts` y datos ficticios en `seed.ts`), `api.ts` (elige la implementación: servidor real por defecto, modo simulado solo con `VITE_USE_MOCK_API=true`). La sesión va en la cookie HttpOnly; la interfaz guarda solo el comprobante CSRF, nunca un JWT.
  - `src/features/` una carpeta por dominio funcional (`auth`, `profile`, `matches`, `sessions`, `steam`, `riot`).
  - Estado global (spec 016, Zustand 5.0.16): dos almacenes. **Sesión iniciada**: `features/auth/createAuthStore.ts` (fábrica con dependencias inyectadas, probada) y `authStore.ts` (instancia real, devtools «TeamMatchUp · sesión iniciada»); `useAuth()` queda como fachada y `useSessionUserId` como selector; ya no existe `AuthProvider`. **Agenda** (solo estado de interfaz: filtro, sesión abierta, borrador, propuesta y visita; TanStack Query sigue siendo la caché del servidor): `features/sessions/createAgendaStore.ts` (fábrica, probada), `agendaStore.ts` (instancia real, devtools «TeamMatchUp · agenda») y `agendaResponses.ts`; reglas puras en `domain/agendaRules.ts`. `app/StoreBridge.tsx` conecta los almacenes con el router, el aviso de 401 y la caché. Las herramientas de depuración solo se activan en desarrollo.
  - `src/assets/leetify/` los dos logos oficiales «Data Provided by Leetify» (`leetify-badge-white.png` para el tema oscuro y `leetify-badge-black.png` para el claro), sin modificar. `LeetifyAttribution` (`src/shared/components/`) los pinta enlazados a leetify.com junto a «View on Leetify» (perfil del jugador) en todo rango que entrega Leetify (spec 015, RF-6).
  - `src/shared/` componentes, hooks y utilidades reutilizables.
  - `src/styles/` tokens de diseño (`tokens.css`) y estilos globales.
- `backend/` — Express 5 + Mongoose + TypeScript, Node ≥ 22.18 ejecutando `.ts` directo (ESM).
  Base definida en `specs/001-crear-backend`; autenticación en `specs/002-autenticacion`;
  usuarios y disponibilidad en `specs/003-usuarios-y-disponibilidad`; cuentas de juego y
  rango simulado en `specs/004-cuentas-de-juego`; coincidencias en `specs/005-coincidencias`;
  origen real de los datos y cuentas verificadas en `specs/012-origen-real-de-datos`
  (rango simulado o real según la cuenta esté verificada); verificación de CS2 con Steam en
  `specs/013-vinculacion-steam` (OpenID de Steam, intentos de 10 min, perfil y horas reales);
  verificación de League of Legends con Riot Games en `specs/014-verificacion-riot` (desafío por
  ícono de invocador de 10 min, rango Solo/Dúo, partidas y perfil reales, limitador propio y
  bloqueo por usuario); rango Premier real de CS2 desde Leetify en `specs/015-rango-premier`
  (rating leído por SteamID64, estado `premier` por cuenta, resincronización con bloqueo por cuenta
  y migración al arrancar):
  - `src/index.ts` punto de entrada: carga y valida la configuración y arranca el servidor.
  - `src/app.ts` composición de Express (cuerpo JSON, 404, manejador de errores); sin conexión a la base.
  - `src/server.ts` arranque: conectar a MongoDB y luego escuchar.
  - `src/controllers/` rutas por recurso: `users.ts` (registro, listado, obtener, actualizar perfil, eliminar cuenta con su cascada ordenada C1 → C6, disponibilidad y resumen por juego), `auth.ts` (sesión), `accounts.ts` (cuentas de juego), `matches.ts` (coincidencias), `steam.ts` (`/api/steam`: disponibilidad, inicio y vuelta de la verificación con Steam) y `riot.ts` (`/api/riot`: disponibilidad, recuperación/creación y confirmación de desafíos con Riot Games).
  - `src/models/` esquemas de Mongoose: `user.ts` (sin lista de cuentas: son las que lo tienen como dueño), `gameAccount.ts`, `steamAttempt.ts` (intento de verificación con Steam: uno por usuario, hash del token, índice TTL) y `riotChallenge.ts` (desafío de verificación con Riot Games, retención e índice TTL de 24 h tras cierre/anulación/vencimiento).
  - `src/services/` lógica sin Express: `credentials.ts` (validación), `passwords.ts` (bcrypt), `sessionToken.ts` (JWT, cookie y comprobante), `userTarget.ts` (identificador de ruta, `me`, formato y propiedad), `profile.ts` (validación del perfil), `availability.ts` (validación de bloques horarios), `timezones.ts` (zonas válidas), `zoneTab.ts` (`zone.tab` de tzdata 2025b, incrustada), `accountWrites.ts` (vincular con compensación, escritura de la cuenta propia), `accountReads.ts` (lecturas sin cuentas sin dueño), `rankProvider.ts` (proveedor de rango simulado), `realSources.ts` (fuentes reales inyectables, plazo de 8 s) y `verifyAccount.ts` (verificar una cuenta con exclusividad) y `matchInputs.ts` (datos de las coincidencias), más `steamAttempts.ts` (abrir, buscar, consumir y descartar intentos), `steamClient.ts` (única pieza con red y con `STEAM_API_KEY`; `fetch` inyectable), `steamSource.ts` (Steam como fuente real de CS2), `riotChallenges.ts` (persistencia y cierre atómico de desafíos), `riotClient.ts` (única pieza con red y con `RIOT_API_KEY`; `fetch` inyectable), `riotLimiter.ts` (limitador propio de ventanas deslizantes 20/s y 100/2 min), `riotUserLock.ts` (bloqueo por usuario en memoria), `riotSync.ts` (lectura y resincronización real de LoL), `leetifyClient.ts` (única pieza con red hacia Leetify y con `LEETIFY_API_KEY`; `fetch` inyectable), `cs2Sync.ts` (resincronización de CS2 verificada: Steam primero, Leetify solo si Steam respondió) y `accountLock.ts` (bloqueo por cuenta en memoria).
  - `src/types/` ampliaciones de tipos: `express.d.ts` (`request.userId`).
  - `src/utils/` `config.ts` (variables de entorno), `errors.ts`, `logger.ts` (único sitio con `console`), `clock.ts` (reloj inyectable) y `middleware.ts` (`createWithUser`, que responde 401 «token inválido» a la credencial de un usuario eliminado, y la guardia de rutas de usuario).
  - `src/domain/` reglas puras sin Express, Mongoose ni reloj, aisladas de `services/`, `utils/`, `models/` y `controllers/` (lo vigila `tests/unit/domainIsolation.test.ts`): `games`, `rankScale`, `rankSimulator`, `accountRules`, `accountState`, `userId` (spec 004), `matchQuery`, `availability`, `matching` (spec 005), `steamAttempt`, `steamOpenId`, `steamProfile`, `steamRules` (spec 013) y `riotRules`, `riotChallenge`, `riotRateLimiter`, `riotData`, `riotLpDelta` (spec 014) y `leetify` (spec 015: lectura del perfil, escalón y transiciones del rango Premier). Adaptación del dominio del frontend (catálogo, bloques horarios, motor), con dos diferencias propias del backend: la normalización de rango (`rankScale`, spec 004, RF-48) y el plegado de región solo ASCII (`accountRules`, DP-35). La spec 006 amplía las carpetas anteriores.
  - `requests/` archivos `.rest` para probar la API a mano (incluye `riot.rest` y `leetify.rest`; este último recibe la clave de Leetify como variable `leetifyKey`, nunca escrita).
  - Steam (spec 013): `STEAM_API_KEY` y `PUBLIC_URL` son opcionales (comentadas en `.env.example`); sin la clave no se ofrece verificar. `createApp` recibe `steamIntegration` (no `steam`, para no chocar con `Config.steam`).
  - Riot (spec 014): `RIOT_API_KEY` es opcional (comentada en `.env.example`, no requiere `PUBLIC_URL`, caduca cada 24 h); sin la clave no se ofrece verificar. `createApp` recibe `riotIntegration`.
  - Leetify (spec 015): `LEETIFY_API_KEY` es opcional (comentada en `.env.example`; vacía = sin clave, con límites de consulta más bajos); a diferencia de Steam y Riot, Leetify nunca es «fuente no configurada». `createApp` recibe `leetifyClient`; sin él, toda lectura de Leetify es un fallo, así que ninguna prueba toca la red.
  - `tests/` con `unit/`, `controllers/` (supertest; incluye `userDeletionCascade.test.ts` con fallos forzados de la cascada y `accountConcurrency.test.ts` con solapamiento determinista), `server/` (arranque y procesos hijo) y `fixtures/` (copia oficial de `zone.tab` de tzdata 2025b).
  - Variables en `backend/.env` (no se sube); plantilla en `backend/.env.example`.
## Comandos

- Frontend (`cd frontend`): `npm run dev | build | preview | typecheck | lint | test` (`npm test` corre Vitest, entorno node, sobre `src/**/*.test.ts`: reglas puras y fábricas de los almacenes; sin `.only`). Por defecto habla con el servidor real (`VITE_API_URL=/api`, proxy de Vite a `VITE_PROXY_TARGET`, puerto de `backend/.env`); modo simulado: `VITE_USE_MOCK_API=true npm run dev` (en PowerShell: `$env:VITE_USE_MOCK_API="true"; npm run dev`). Cuenta demo del modo simulado: `demo@teammatchup.gg` / `demo1234`. Si `node_modules` no coincide con el lock, `npm ci`.
- Backend (`cd backend`): `npm run dev | test | typecheck | lint`. `npm test` fija `NODE_ENV=test`, corre en serie y necesita MongoDB y `backend/.env`.
- Producción (`cd backend`, spec 010): `npm run build:ui` (compila la interfaz y la copia a `backend/dist`), `npm run build` (servidor en `backend/out`) y `npm start` (`node out/index.js`; con `NODE_ENV=production` sirve `backend/dist` y termina con código 1 si falta `dist/index.html`). Todas las colecciones llevan el prefijo `tmu_` (`src/models/collections.ts`). Despliegue en el servidor del curso: README raíz, «Despliegue».
- Gestor: npm. Toda dependencia se instala con `--save-exact`.

## Flujo SDD

Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.
Ninguna fase avanza sin aprobación explícita del usuario.

| Agente | Rol |
| --- | --- |
| coordinator | Dirige el flujo y delega; no edita archivos. |
| planner | Redacta specs, planes y tareas; solo escribe en `specs/**`. |
| implementer | Ejecuta una tarea cada vez, tests primero; marca la tarea y para. |
| reviewer | Revisa y valida; no edita. |

## Convenciones

- Las de `docs/constitution.md` (stack, specs, dominio puro, tests, seguridad, idioma).
- Estilos solo desde `styles/tokens.css`; ningún color escrito a mano.
- Sin `any`, sin `@ts-ignore`, sin `dangerouslySetInnerHTML`.
- Los datos de demostración se etiquetan siempre como tales en la interfaz.

## Seguridad y git

- Nunca subir `.env`, `dist/` ni `out/`.
- Sin commits, push ni operaciones git destructivas salvo que el usuario lo pida.

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
