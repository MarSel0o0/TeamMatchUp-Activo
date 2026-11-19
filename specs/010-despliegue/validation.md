# Validación 010 — Producción, despliegue y documentación
Fecha de las comprobaciones locales: 2026-10-21. Entorno: Windows 10, Node v24.13.0, MongoDB
local en `127.0.0.1:27017`. Plan: `plan.md`. Tareas: `tasks.md`.

## 1. Pruebas automáticas (T1, T2)

- `backend/tests/controllers/ui.test.ts` (nuevo): rutas de la interfaz con `uiDir`
  (`/`, `/perfil`, `/agenda/<id>`, `/jugadores/x/lol`, ruta inexistente, `/logo-viejo.png`),
  `HEAD`, archivo real de `assets/`, métodos distintos de GET/HEAD en 404 JSON, `/api`,
  `/api/`, `/api/inexistente` en 404 JSON, `/api/auth/me` sin sesión en 401, y sin `uiDir`
  todo sigue como antes. Se escribió antes que el código: rojo por tipo (`uiDir` no existía en
  `AppOptions`), verde tras T2.
- Con `ui.test.ts` y `app.test.ts`: 48 pruebas, 48 en verde.
- Suite completa, `typecheck` y `lint`: ver la sección 4.

## 2. Recorrido de producción en local (T4)

Base temporal `teammatchup_val010` (borrada al terminar; la lista de bases quedó en
`admin, config, local, teammatchup, teammatchup_test`). Arranque:
`NODE_ENV=production PORT=3910 HOST=127.0.0.1 … JWT_SECRET=<aleatorio> node out/index.js`
tras `npm run build:ui` y `npm run build`.

| Comprobación | Resultado |
| --- | --- |
| Arranque | `servidor escuchando en http://127.0.0.1:3910` |
| `GET /` | 200 `text/html` |
| `GET /perfil` (recarga) | 200 `text/html` (la aplicación) |
| `GET /assets/index-….js` | 200 `text/javascript` (el archivo real) |
| `GET /logo-viejo.png` | 200 `text/html` (la aplicación, caso límite de la spec) |
| `GET /api/inexistente` | 404 `application/json` `{"error":"endpoint desconocido"}` |
| `GET /api` | 404 `{"error":"endpoint desconocido"}` |
| `POST /perfil` | 404 `{"error":"endpoint desconocido"}` |
| `GET /api/auth/me` sin sesión | 401 `{"error":"sesión no iniciada"}` |
| `POST /api/users` | 201 |
| `POST /api/auth/login` | 200, `Set-Cookie: token=…; Path=/; HttpOnly; Secure; SameSite=Strict` y `X-CSRF-Token` |
| Arranque con `backend/dist` ausente | `falta la interfaz compilada en backend/dist: ejecuta npm run build:ui`, código de salida 1 |

## 3. Criterios de finalización de la spec

- [x] En local, la construcción de producción responde la interfaz y la API en el mismo puerto,
      y recargar `/perfil` carga la aplicación (sección 2).
- [x] Una ruta de API inexistente responde 404 en JSON en producción (sección 2).
- [ ] En `https://fullstack.dcc.uchile.cl:7041/` se completa: registro, inicio de sesión (la
      cookie llega con Secure), recarga y cierre de sesión. **Lo hace el usuario (T9).**
- [ ] El proceso `teammatchup-7041` aparece en la lista guardada de PM2 y la aplicación vuelve
      a responder tras reiniciarlo. **Lo hace el usuario (T9).**
- [ ] Una persona que no participó en el despliegue levanta la aplicación en local siguiendo
      solo el README. **Pendiente: que un compañero lo pruebe** (los comandos del README de
      «Construcción de producción en local» se ejecutaron arriba).
- [x] `git status` limpio de archivos de variables y de construcción; la búsqueda de credenciales
      en el repositorio no encuentra nada (sección 4).

## 4. Comprobaciones finales del repositorio (T7)

- `git status --short`: solo archivos de esta spec; ni `.env`, ni `dist/`, ni `out/` (los tres
  están en `.gitignore`).
- Búsqueda de `password|contraseña|secret|token|mongodb://…|BEGIN … KEY` fuera de `src/`,
  `tests/` y `specs/`: solo aparecen nombres de variables y texto de documentación; ningún valor.
- Backend: `npm test --script-shell=bash` → 2292 pruebas, 2292 en verde, 0 fallos (274 s; las
  2276 anteriores más las 16 de `ui.test.ts`); `npm run typecheck` y `npm run lint` sin errores.
- Frontend: `npm run build` (en `build:ui`) y `npm run lint` sin errores.

## 5. Lista para el despliegue (T9, la ejecuta el usuario)

Marca cada punto y anota la salida relevante (sin credenciales):

- [ ] `node --version` en el servidor es ≥ 22 (R-1): ______
- [ ] El usuario de MongoDB crea `teammatchup_7041` (R-2; si no, abrir la T10): ______
- [ ] Subida de `out/`, `dist/`, `package.json` y `package-lock.json` a `teammatchup/`.
- [ ] `.env` de producción creado a mano en el servidor.
- [ ] `npm ci --omit=dev` termina sin errores (¿hubo que aprobar `bcrypt`?): ______
- [ ] `pm2 start out/index.js --name teammatchup-7041` y `pm2 save`.
- [ ] La URL responde; registro, login con cookie `HttpOnly; Secure; SameSite=Strict`, recarga de
      `/perfil` y cierre de sesión funcionan.
- [ ] `pm2 restart teammatchup-7041` y la aplicación vuelve a responder (los datos siguen).
- [ ] No se tocó ningún proceso ni carpeta de otros grupos (RNF-5).
