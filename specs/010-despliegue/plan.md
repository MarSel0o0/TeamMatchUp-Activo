# Plan 010 — Producción, despliegue y documentación
Estado: en implementación (2026-10-21). El usuario pidió hacer la spec; las decisiones D-1 a D-6
son del coordinador y quedan para su revisión (sección 6).
Spec: `specs/010-despliegue/spec.md` (ajustada el 2026-10-21 a las specs 004 a 009: caen HU-4 y
RF-10, y se limpian RF-7, RF-9, RF-11, RNF-4 y los casos límite). **2026-11-20:** HU-4 y RF-10
vuelven con la spec 014 (Riot) y el servidor real usa la carpeta `reactivoActivo` y el proceso
`reactivoActivo-7041` con la base `fullstack` y prefijo `tmu_` (ver «Cambios» de la spec; el
procedimiento vigente es el del README raíz).
Referencia aplicada: `specs/_referencia/001-crear-backend-original.md`, secciones 2 (CORS),
5.2 (`build:ui`, `start`), 5.5 (estáticos y fallback) y T22 a T24.

## 0. Estado real del código (comprobado el 2026-10-21)

- `backend/src/app.ts` no sirve la interfaz: `GET /perfil` responde 404 JSON y un test lo fija
  (`tests/controllers/app.test.ts`, «app: ruta desconocida»). Ese test no debe cambiar: el
  comportamiento sin interfaz sigue igual (D-1).
- RF-4 (cookie `Secure` en producción) **ya está** implementado (`sessionCookieOptions`,
  `secure: nodeEnv === "production"`) y probado (`tests/controllers/auth.test.ts`, «en producción
  la cookie lleva Secure»; `userDeletion.test.ts`). No hay tarea de código para RF-4.
- RF-6 (puerto y dirección del entorno): `PORT` y `HOST` ya se leen y validan en
  `src/utils/config.ts`. Sin cambios. `MONGODB_DBNAME` es variable obligatoria: basta poner
  `teammatchup_7041` en el archivo de producción.
- `backend/package.json` no tiene `build` ni `start`. El `tsconfig` ya emite a `out/` con
  `rewriteRelativeImportExtensions`, así que `tsc` produce JavaScript ejecutable con Node ≥ 22
  (`node out/index.js`). Los tests ejecutan `.ts` directo; producción ejecuta el compilado.
- `frontend/` ya compila con `npm run build` a `frontend/dist` (`tsc -b && vite build`), con
  rutas absolutas desde `/` (sin `base`). `dist` y `out` están en `.gitignore`.
- `frontend/README.md` está desactualizado: sigue en «cuatro vistas del Hito 1» y no lista
  `GET /users/:id/games/:gameId`, `GET|PUT /sessions/:id` ni las rutas de ficha y detalle.
- `README.md` raíz está desactualizado: dice que `backend/` está «Pendiente» y que la interfaz
  solo funciona con un servidor simulado.

## 1. Archivos

| Archivo | Cambio | RF |
| --- | --- | --- |
| `backend/src/app.ts` | Opción `uiDir?: string` en `AppOptions`. Con ella, después de las rutas de `/api/*` monta `express.static(uiDir)` y el fallback de la interfaz; antes de `unknownEndpoint`. Sin ella, nada cambia. | RF-1, RF-2, RF-3 |
| `backend/src/index.ts` | Solo en `production`: calcula `uiDir` = `backend/dist` (relativo al archivo, vale para `src/` y `out/`), comprueba que existe `index.html` y, si no, termina con código 1 y un mensaje en español. Pasa `uiDir` a `createApp`. | RF-1 |
| `backend/package.json` | Scripts `build` (`tsc`), `start` (`node out/index.js`) y `build:ui` (D-3). | RF-1, RF-9 |
| `backend/scripts/copyUi.ts` | Copia `../frontend/dist` a `backend/dist` (borra la anterior). Sin dependencias, multiplataforma. | RF-1, RF-9 |
| `backend/tests/controllers/ui.test.ts` | Pruebas de `uiDir` con una carpeta temporal (sin depender del build real). | RF-1, RF-2, RF-3 |
| `backend/.env.example` | Comentarios del archivo de producción (valores del servidor del curso, sin secretos). | RF-6, RF-9 |
| `README.md` (raíz) | Reescrito: estado, variables, requisitos, local, pruebas, producción local, despliegue en el servidor del curso, datos simulados, demostración. | RF-7, RF-9, RF-11 |
| `frontend/README.md` | Tabla de operaciones y vistas al día (specs 002 a 009). | RF-8 |
| `specs/010-despliegue/validation.md` | Registro de las comprobaciones locales y del despliegue (lo completa el usuario). | criterios |

No se tocan `domain/`, controladores, modelos ni el frontend (salvo su README). Sin
dependencias nuevas (principio 1).

## 2. Algoritmo del fallback (RF-1 a RF-3)

```
createApp({ ..., uiDir })
  ... express.json, cookieParser, routers de /api/* (sin cambios) ...
  si uiDir definido:
    app.use(express.static(uiDir))                       // archivos reales (assets, favicon)
    app.get(/^\/(?!api(\/|$)).*/, (req, res, next) =>
        res.sendFile(join(uiDir, "index.html"), (err) => err && next(err)))
  app.use(unknownEndpoint)    // /api/* desconocido, y cualquier método que no sea GET/HEAD
  app.use(errorHandler)
```

- `/api` y `/api/...` no entran al fallback (RF-3): llegan a `unknownEndpoint`, JSON de la 001.
- Cualquier otra ruta GET/HEAD entrega `index.html`, incluidos archivos inexistentes como
  `/logo-viejo.png` (caso límite de la spec).
- `POST /perfil` (no GET/HEAD) sigue en 404 JSON: no es una navegación.
- La coincidencia de `/api` distingue mayúsculas, igual que la expresión de la referencia;
  `/API/x` entra al fallback y los routers de Express (insensibles a mayúsculas) sí atienden
  `/API/users`. Es una rareza heredada de la referencia, aceptada (no es una ruta de la
  aplicación).
- `express.static` va **después** de los routers de la API: ningún archivo puede tapar una
  ruta de `/api`.
- Errores de `sendFile` (archivo ausente a mitad de ejecución) van a `errorHandler`: 500 JSON.

## 3. Producción (RF-1, RF-4, RF-5, RF-6, RF-9)

- Construcción: `cd backend && npm run build:ui` (instala/usa el frontend, compila, copia a
  `backend/dist`) y `npm run build` (`tsc`, a `backend/out`). Arranque: `npm start` →
  `NODE_ENV=production node out/index.js`.
- Variables de producción (archivo `.env` creado a mano en la carpeta `teammatchup` del
  servidor, nunca en el repositorio): `NODE_ENV=production`, `PORT=7041`, `HOST=0.0.0.0`,
  `MONGODB_URI`, `MONGODB_DBNAME=teammatchup_7041`, `JWT_SECRET` (`openssl rand -hex 32`; el
  servidor rechaza el valor de desarrollo, spec 001 RF-28).
- `start` es `node out/index.js`; `NODE_ENV` sale del `.env` (D-3), así funciona igual en
  Windows y en Linux.
- Subida por SSH (puerto 219) a `teammatchup/`: `out/`, `dist/`, `package.json` y
  `package-lock.json`. **Nunca `node_modules`** (se instala en el servidor con
  `npm ci --omit=dev`: `bcrypt` trae binario por plataforma). Si npm bloquea el script de
  instalación de `bcrypt`, `npm install-scripts approve bcrypt` (nota de `MEMORY.md`).
- Proceso: `pm2 start out/index.js --name teammatchup-7041 --cwd <carpeta>` y `pm2 save`;
  actualizar = subir `out/` y `dist/` y `pm2 restart teammatchup-7041`. Solo ese nombre
  (RNF-5): nunca `pm2 restart all`, `pm2 delete all` ni `pm2 kill`.
- El servidor del curso termina TLS delante de Node (el usuario confirmó HTTPS). La cookie lleva
  `Secure` por `NODE_ENV=production`, sin `trust proxy`: Express no la decide por la conexión.

## 4. Decisiones técnicas

- **D-1. `uiDir` opcional en `createApp`, no variable de entorno ni `process.env` en `app.ts`.**
  Mantiene la regla D11 de la 001 (`app.ts` no lee el entorno) y deja intactas las 2276
  pruebas existentes. Alternativa descartada: servir siempre `dist` si existe (comportamiento
  implícito que cambiaría `GET /perfil` en desarrollo según haya o no una compilación).
- **D-2. La carpeta es `backend/dist`, fija y relativa al archivo** (`new URL("../dist", import.meta.url)`),
  como en la referencia (RT-14). Alternativa descartada: variable `UI_DIR` (una variable más que
  documentar y que equivocar en el servidor, sin ganancia).
- **D-3. Scripts multiplataforma y `NODE_ENV` desde el `.env`.** La referencia usa `rm -rf`,
  `cp -r` y `NODE_ENV=production node …`, que no funcionan en Windows sin bash. `build:ui` =
  `npm --prefix ../frontend run build && node scripts/copyUi.ts` (copia con `fs.cpSync`) y
  `start` = `node out/index.js`: `NODE_ENV` ya la fija el `.env` de producción (la 001 acepta
  `NODE_ENV` en el archivo, RF-21) y, si falta, el servidor no arranca. Alternativa descartada:
  `cross-env` (dependencia nueva sin necesidad, principio 1).
- **D-4. Fallar al arrancar si falta la interfaz en producción.** Sin `dist/index.html`, todas las
  páginas darían 500. Mejor un mensaje claro y código 1 (misma política que la configuración
  inválida). Alternativa descartada: arrancar solo con la API (el error aparece en el navegador
  del evaluador, no en la consola de quien despliega).
- **D-5. Datos de demostración: ninguno precargado** (RF-11; la 001 de la referencia pedía un
  `seed.ts` que la spec 010 descarta). Para la presentación se crean cuentas del equipo a
  mano; como el proveedor simulado es determinista por identificador de juego, el rango de cada
  cuenta es el mismo en cada ensayo.
- **D-6. RF-6, segunda rama (base `fullstack` con prefijo `tmu_`).** Implementarla exige que el
  prefijo se conozca antes de importar los modelos de Mongoose (la colección se fija al
  compilar el modelo), es decir, tocar el arranque. No se hace por adelantado: se comprueba al
  desplegar (T9) si el usuario de MongoDB puede crear `teammatchup_7041`. Si no puede, se
  abre la **T10** (cambio acotado, con test). Hasta entonces RF-6 se cumple en su rama
  principal.

## 5. Pruebas

- **Backend (node:test + supertest), primero rojas** (`tests/controllers/ui.test.ts`, carpeta
  temporal con `index.html` y `assets/app.js`): `/` y `/perfil` → `index.html`; `/assets/app.js`
  → el archivo real (tipo de contenido JavaScript, no `index.html`); `/logo-viejo.png` →
  `index.html`; `HEAD /perfil` → 200 sin cuerpo; `/api/inexistente`, `/api` y `/api/` → 404 JSON
  `{ error: "endpoint desconocido" }`; `POST /perfil` → 404 JSON; `GET /api/auth/me` sin sesión
  → 401 (la API sigue por delante); sin `uiDir`, `/perfil` → 404 JSON (el test de `app.test.ts`
  sigue en pie).
- **Manual, en validation.md:** construcción real y arranque en producción local contra una base
  temporal; recarga de `/perfil` sin sesión; cookie con `Secure` en la respuesta del login;
  arranque sin `dist` → código 1 y mensaje.
- **Frontend:** `npm run build` y `npm run lint` en verde (sin runner de pruebas).
- `npm test` completo, `typecheck` y `lint` del backend en verde al cerrar.

## 6. Riesgos y puntos para el usuario

- R-1. Versión de Node del servidor desconocida (la compilación necesita ≥ 22). Se comprueba con
  `node --version` en T9; si es menor, el procedimiento cambia y se avisa.
- R-2. Usuario de MongoDB sin permiso para crear la base (D-6 / T10).
- R-3. Credenciales y despliegue real: las ejecuta el usuario (no están en el repositorio y
  desplegar es una acción externa). El README y `validation.md` dejan los comandos listos.
- R-4. Cuenta de MongoDB compartida entre grupos: el `.env` de producción es legible por otros
  (limitación reconocida en la spec, fuera de alcance).
