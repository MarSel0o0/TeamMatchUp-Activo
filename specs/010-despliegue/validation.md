# Validación 010 — Producción, despliegue y documentación
Fecha de las comprobaciones locales: 2026-11-20 (rehechas; las del 2026-10-21, en Windows 10 con
Node v24.13.0, eran de un código que se perdió y se recuperó en `6307b9a`). Entorno: macOS
(Darwin 25.6.0), Node v24.19.0, MongoDB local en `127.0.0.1:27017`. Rama
`feature/vinculacion-steam-riot`, sobre `c7afc2f`. Plan: `plan.md`. Tareas: `tasks.md`.

## 1. Pruebas automáticas (T1, T2, T3, T10)

- `backend/tests/controllers/ui.test.ts`: rutas de la interfaz con `uiDir` (`/`, `/perfil`,
  `/agenda/<id>`, `/jugadores/x/lol`, ruta inexistente, `/logo-viejo.png`), `HEAD`, archivo real
  de `assets/`, métodos distintos de GET/HEAD en 404 JSON, `/api`, `/api/`, `/api/inexistente` en
  404 JSON, `/api/auth/me` sin sesión en 401, y sin `uiDir` todo sigue como antes.
- `backend/tests/server/productionUi.test.ts`: arranque de producción con y sin
  `backend/dist/index.html`. Los dos casos se excluyen según exista o no la compilación, así que
  en una misma ejecución solo corre uno (hoy, con `dist`, se omite el caso «sin dist»; ese caso se
  comprobó a mano en la sección 2).
- `backend/tests/unit/collections.test.ts` (T10, nuevo): cada modelo usa su colección con el
  prefijo `tmu_` y ningún modelo registrado queda sin él. Rojo sin `src/models/collections.ts`,
  verde después.
- Suite completa: ver la sección 4.

## 2. Recorrido de producción en local (T4)

Base temporal `teammatchup_val010` (borrada al terminar). Arranque desde una carpeta sin `.env`
(para no leer las claves locales): `NODE_ENV=production PORT=3910 HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DBNAME=teammatchup_val010 JWT_SECRET=<aleatorio>
node backend/out/index.js`, tras `npm run build:ui` y `npm run build` (los dos con código 0).

| Comprobación | Resultado |
| --- | --- |
| Arranque | `servidor escuchando en http://127.0.0.1:3910` |
| `GET /` | 200 `text/html` |
| `GET /perfil` (recarga) | 200 `text/html` (la aplicación) |
| `GET /agenda/abc` | 200 `text/html` |
| `HEAD /perfil` | 200 `text/html` |
| `GET /assets/AccountRow-….js` | 200 `text/javascript` (el archivo real) |
| `GET /logo-viejo.png` | 200 `text/html` (la aplicación, caso límite de la spec) |
| `GET /api`, `GET /api/`, `GET /api/inexistente` | 404 `application/json` `{"error":"endpoint desconocido"}` |
| `POST /perfil` | 404 `{"error":"endpoint desconocido"}` |
| `GET /api/auth/me` sin sesión | 401 `{"error":"sesión no iniciada"}` |
| `POST /api/users` | 201 |
| `POST /api/auth/login` | 200, `Set-Cookie: token=…; Path=/; HttpOnly; Secure; SameSite=Strict` y `X-CSRF-Token` |
| `GET /api/auth/me` con sesión | 200 (cookie enviada a mano: curl no reenvía una cookie `Secure` por `http`) |
| `POST /api/auth/logout` | 200, `Set-Cookie: token=; … Expires=Thu, 01 Jan 1970 …; HttpOnly; Secure; SameSite=Strict` |
| Colecciones creadas en la base temporal | `tmu_gameaccounts`, `tmu_playsessions`, `tmu_riotchallenges`, `tmu_steamattempts`, `tmu_users` (ninguna sin prefijo) |
| Arranque con `backend/dist` ausente | `falta la interfaz compilada en backend/dist: ejecuta npm run build:ui`, código de salida 1 |

## 3. Criterios de finalización de la spec

- [x] En local, la construcción de producción responde la interfaz y la API en el mismo puerto,
      y recargar `/perfil` carga la aplicación (sección 2).
- [x] Una ruta de API inexistente responde 404 en JSON en producción (sección 2).
- [ ] En `https://fullstack.dcc.uchile.cl:7041/` se completa: registro, inicio de sesión (la
      cookie llega con Secure), recarga y cierre de sesión. **Lo hace el usuario (T9).**
- [ ] El proceso `reactivoActivo-7041` aparece en la lista guardada de PM2 y la aplicación vuelve
      a responder tras reiniciarlo. **Lo hace el usuario (T9).**
- [ ] Una persona que no participó en el despliegue levanta la aplicación en local siguiendo
      solo el README. **Pendiente: que un compañero lo pruebe** (los comandos del README de
      «Construcción de producción en local» se ejecutaron arriba).
- [x] `git status` limpio de archivos de variables y de construcción; la búsqueda de credenciales
      en el repositorio no encuentra nada (sección 4).

## 4. Comprobaciones finales del repositorio (T7)

- `git status --short`: solo archivos de esta spec (y `.DS_Store` sin seguimiento, que no se
  sube); ni `.env`, ni `dist/`, ni `out/` (los tres están en `.gitignore`).
- Búsqueda de claves de Riot (`RGAPI-…`), URI de MongoDB con usuario y contraseña, claves
  privadas, `JWT_SECRET` hexadecimal y valores de `STEAM_API_KEY`, `RIOT_API_KEY` y
  `LEETIFY_API_KEY` en los archivos versionados fuera de `src/`, `tests/` y `specs/`: nada.
- Backend: `npm test` → 2978 pruebas, 2977 en verde, 1 omitida (el caso «sin dist» de
  `productionUi.test.ts`, ver sección 1), 0 fallos; `npm run typecheck` y `npm run lint` sin
  errores.
- Frontend: `npm run build` (en `build:ui`), `npm run lint` y `tsc -b` sin errores.
- T6: cada ruta de la tabla de `frontend/README.md` está en `frontend/src/services/http/httpApi.ts`
  y en `backend/requests/*.rest`; a `users.rest` se añadieron los pasos 15 y 16
  (`GET /api/users/:id/availability` y `GET /api/users/:id/games/:gameId`), que faltaban.

## 5. Lista para el despliegue (T9, la ejecuta el usuario)

Los nombres reales son los que ya usa el servidor (rama `origin/deploy`, README raíz): carpeta
`~/reactivoActivo` y proceso `reactivoActivo-7041`. Marca cada punto y anota la salida relevante
(sin credenciales):

- [ ] `node --version` en el servidor (R-1). Según `origin/deploy` es Node 20: no cumple el ≥ 22
      del plan, pero el JavaScript compilado corre (`npm` avisa `EBADENGINE`): ______
- [x] R-2 ocurrió: el usuario de MongoDB no puede crear `teammatchup_7041` (`Unauthorized`,
      código 13, visto en `origin/deploy`). T10 hecha: base `fullstack` con prefijo `tmu_`.
- [ ] Confirmar con el equipo qué colecciones `tmu_*` tienen datos hoy en `fullstack`: ______
- [ ] Subida con `tar` por `ssh` (README, «Despliegue», paso 2).
- [ ] `.env` de producción creado a mano en el servidor (con `PUBLIC_URL` en `https` si hay
      `STEAM_API_KEY`).
- [ ] `npm ci --omit=dev` termina sin errores (¿hubo que aprobar `bcrypt`?): ______
- [ ] `pm2 start npm --name reactivoActivo-7041 -- run start` (o `pm2 restart` si ya existe) y
      `pm2 save`.
- [ ] La URL responde; registro, login con cookie `HttpOnly; Secure; SameSite=Strict`, recarga de
      `/perfil` y cierre de sesión funcionan.
- [ ] `pm2 restart reactivoActivo-7041` y la aplicación vuelve a responder (los datos siguen).
- [ ] No se tocó ningún proceso ni carpeta de otros grupos (RNF-5).
