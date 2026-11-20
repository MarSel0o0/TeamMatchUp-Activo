# TeamMatchUp

Plataforma web que empareja jugadores de **League of Legends**, **Rainbow Six Siege**
y **Counter-Strike 2** cruzando dos condiciones que hoy nadie resuelve junta: que
tengan un **nivel competitivo similar** y que estén **disponibles en los mismos
bloques horarios**.

**Aplicación desplegada:** https://fullstack.dcc.uchile.cl:7041/

## Estado del repositorio

| Carpeta | Contenido | Estado |
| --- | --- | --- |
| `frontend/` | Aplicación React + TypeScript (Vite) | Implementada |
| `backend/` | Servidor Express 5 + MongoDB (Mongoose), TypeScript | Implementado |

En producción el backend sirve también la interfaz compilada: interfaz y API comparten
origen y puerto, así que no hay CORS y la cookie de sesión funciona con `SameSite=Strict`.

Los detalles de arquitectura, las vistas y la tabla de operaciones de la API están en
[`frontend/README.md`](frontend/README.md). El guion de la demostración está en
[`specs/010-despliegue/demo.md`](specs/010-despliegue/demo.md).

## Requisitos previos

- Node.js **22.18 o superior** para desarrollo y pruebas (el backend ejecuta los `.ts`
  directamente). En el servidor del curso basta Node 20, porque ahí corre el JavaScript compilado.
- MongoDB local (por ejemplo en `mongodb://127.0.0.1:27017`).

## Cómo levantarlo en local

**Backend** (puerto 3001):

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**Frontend** (puerto 5173, con proxy de `/api` hacia el backend):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Luego entra a http://localhost:5173 y crea una cuenta. La base empieza vacía: no hay datos
precargados en el servidor.

Para usar la interfaz sin servidor, pon `VITE_USE_MOCK_API=true` en `frontend/.env`: se
activa un backend simulado en el navegador con la cuenta `demo@teammatchup.gg` / `demo1234`.
Todo lo que viene de ese modo se marca en pantalla con «Datos de demostración».

**Pruebas del backend** (usan la base de prueba, distinta de la de desarrollo):

```bash
cd backend
npm test            # en Windows: npm test --script-shell=bash
npm run typecheck
npm run lint
```

**Construcción de producción en local** (desde `backend/`):

```bash
npm run build:ui    # compila la interfaz y la copia a backend/dist
npm run build       # compila el servidor en backend/out
NODE_ENV=production JWT_SECRET=<secreto-propio> npm start
```

Ojo: desde `backend/` el servidor también lee `backend/.env`, así que usa la base de
desarrollo `teammatchup`. Si ese `.env` tiene `STEAM_API_KEY` con `PUBLIC_URL=http://…`, en
producción no arranca (exige `https`): comenta esas líneas o pasa `MONGODB_DBNAME` y `PUBLIC_URL`
en la misma línea del comando.
Con `NODE_ENV=production` el servidor entrega la interfaz en cualquier ruta fuera de `/api`
(recargar `/perfil` funciona) y una ruta de API inexistente responde 404 en JSON. Si falta
`backend/dist/index.html`, no arranca: termina con código 1 y pide ejecutar `npm run build:ui`.
En producción no se admite el `JWT_SECRET` de desarrollo.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NODE_ENV` | Sí | `development`, `test` o `production` |
| `PORT` | Sí | Puerto de escucha |
| `HOST` | No | Dirección de escucha; vacía = todas las interfaces. En el servidor del curso, `0.0.0.0` |
| `MONGODB_URI` | Sí (salvo en `test`) | Ubicación de MongoDB |
| `MONGODB_DBNAME` | Sí (salvo en `test`) | Nombre de la base |
| `TEST_MONGODB_URI` | Solo en `test` | Ubicación de MongoDB para las pruebas |
| `TEST_MONGODB_DBNAME` | Solo en `test` | Base de prueba; no puede coincidir con la de desarrollo |
| `JWT_SECRET` | Sí | Secreto de firma de la sesión. En producción no se admite el valor de desarrollo: generar uno con `openssl rand -hex 32` |
| `STEAM_API_KEY` | No | Clave de la API web de Steam (ver más abajo) |
| `PUBLIC_URL` | Si hay `STEAM_API_KEY` | Dirección con que el navegador abre la instancia; `https` en producción |
| `RIOT_API_KEY` | No | Clave de desarrollo de Riot Games; caduca cada 24 horas |
| `LEETIFY_API_KEY` | No | Clave de Leetify; sin ella se consulta igual, con límites más bajos |

Si falta una variable o tiene un valor inválido, el servidor no arranca y lista los errores.
`backend/.env.example` trae todas, sin secretos, y comenta los valores del servidor del curso.

Todas las colecciones llevan el prefijo `tmu_` (`tmu_users`, `tmu_gameaccounts`,
`tmu_playsessions`, `tmu_steamattempts`, `tmu_riotchallenges`), en todos los entornos, para
convivir con otros grupos en la base compartida del servidor del curso.

### Frontend (`frontend/.env`)

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | Dirección base de la API. Por defecto `/api` (relativa; no cambiarla para producción) |
| `VITE_USE_MOCK_API` | `true` activa el backend simulado; cualquier otro valor usa el servidor real |
| `VITE_PROXY_TARGET` | Destino del proxy `/api` de Vite en desarrollo (debe coincidir con `PORT` del backend) |
| `VITE_MOCK_LATENCY` | Latencia artificial (ms) del backend simulado |

Ningún valor del frontend es un secreto: todo lo que empieza con `VITE_` termina en el paquete
que descarga el navegador.

### Verificar la cuenta de CS2 con Steam (opcional)

Con el servidor (`backend/`), un jugador de CS2 puede verificar su cuenta iniciando sesión en
Steam. Es opcional: sin la clave de Steam el botón «Verificar con Steam» no aparece y todo lo
demás funciona igual. En `backend/.env` (nunca se sube al repositorio) se definen dos variables,
que `backend/.env.example` trae comentadas y sin valores:

- `STEAM_API_KEY`: la clave de la API web de Steam de la instancia.
- `PUBLIC_URL`: la dirección con que el navegador abre la instancia, sin ruta ni barra final
  (en desarrollo, la de Vite, `http://localhost:5173`; en el servidor del curso,
  `https://fullstack.dcc.uchile.cl:7041`). Steam devuelve al usuario a esa dirección.

### Rango Premier de CS2 con Leetify (clave opcional)

Una cuenta de CS2 verificada con Steam obtiene su rango Premier real de la API pública de
Leetify, consultada con su SteamID64. No hace falta configurar nada para que funcione: sin clave
Leetify responde con límites de consulta más bajos. Si quieres subirlos, en `backend/.env`
(nunca se sube al repositorio) se define una variable opcional, que `backend/.env.example` trae
comentada y sin valor:

- `LEETIFY_API_KEY`: la clave de la API de Leetify de la instancia (se genera en
  https://leetify.com/app/developer). Es un secreto: no la subas ni la pegues en un chat. Vacía
  equivale a no tenerla.

### Verificar la cuenta de League of Legends con Riot Games (opcional)

Con el servidor (`backend/`), un jugador de League of Legends puede verificar su Riot ID
cambiando temporalmente su ícono de invocador en el cliente de LoL. Es opcional: sin la clave de
Riot el botón «Verificar con Riot Games» no aparece y todo lo demás (incluida la vinculación
manual) funciona igual. En `backend/.env` (nunca se sube al repositorio) se define una única
variable opcional, que `backend/.env.example` trae comentada y sin valor (no requiere
`PUBLIC_URL`):

- `RIOT_API_KEY`: la clave de desarrollo de la API de Riot Games (caduca cada 24 horas).

#### Renovación manual de `RIOT_API_KEY` cada 24 horas (local y servidor del curso)

La clave de desarrollo de Riot Games vence a las 24 horas. Mientras está caducada, las operaciones
que consultan a Riot (verificar y resincronizar cuentas de LoL) responden `503` con el mensaje
«Riot Games no está disponible por ahora, intenta más tarde», sin cerrar la sesión y sin perder
datos ni cuentas verificadas: cada cuenta conserva su último rango. Para renovarla:

1. Entra al [portal de desarrolladores de Riot Games](https://developer.riotgames.com/) y genera
   una clave de desarrollo nueva (`RGAPI-...`).
2. En el equipo local o en el servidor del curso, edita `.env` (nunca lo subas al repositorio) y
   reemplaza el valor de `RIOT_API_KEY`:
   ```env
   RIOT_API_KEY=RGAPI-tu-nueva-clave
   ```
3. Reinicia el proceso: en desarrollo local, detén y vuelve a lanzar `npm run dev` dentro de
   `backend/`; en el servidor del curso, `pm2 restart reactivoActivo-7041`.
4. El servidor vuelve a operar con Riot Games sin otro cambio; los desafíos abiertos que aún no
   hayan cumplido 10 minutos siguen vigentes.

## Despliegue en el servidor del curso

| Dato | Valor |
| --- | --- |
| URL | https://fullstack.dcc.uchile.cl:7041/ |
| SSH | `ssh -p 219 <usuario>@fullstack.dcc.uchile.cl` (usuario compartido por todos los grupos) |
| Carpeta | `~/reactivoActivo` |
| Proceso PM2 | `reactivoActivo-7041` |
| Base de datos | `fullstack`, con el prefijo `tmu_` en las colecciones |

> El servidor es compartido. **Nunca** uses `pm2 restart all`, `pm2 stop all` ni
> `pm2 delete all`, ni toques carpetas o procesos de otros grupos: opera siempre con el nombre
> `reactivoActivo-7041`.

El servidor **no tiene `rsync`**: se sube con `tar` a través de `ssh`. Las credenciales
nunca van al repositorio.

### 1. Compilar (en tu máquina, desde `backend/`)

```bash
npm run build:ui && npm run build
```

`build:ui` compila la interfaz en `backend/dist/` y `build` compila el servidor en
`backend/out/`.

### 2. Subir (desde `backend/`)

```bash
COPYFILE_DISABLE=1 tar --no-xattrs -czf - --exclude node_modules --exclude .env --exclude tests --exclude requests --exclude .DS_Store . | ssh -p 219 <usuario>@fullstack.dcc.uchile.cl "mkdir -p ~/reactivoActivo && tar -xzf - -C ~/reactivoActivo"
```

No se suben `node_modules` ni el `.env` local, para no pisar el de producción.

### 3. Primera vez: crear el `.env` de producción (en el servidor)

```bash
cd ~/reactivoActivo && cat > .env <<EOF
NODE_ENV=production
PORT=7041
HOST=0.0.0.0
MONGODB_URI=<uri-mongodb-del-curso>/?authSource=admin
MONGODB_DBNAME=fullstack
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF
chmod 600 .env
```

El usuario de MongoDB del curso no tiene permiso para crear una base propia (responde
`Unauthorized`, código 13), por eso se usa `fullstack` con el prefijo `tmu_`.

Para las integraciones opcionales se agregan a ese mismo `.env`, a mano y sin subirlas nunca al
repositorio, `STEAM_API_KEY`, `PUBLIC_URL=https://fullstack.dcc.uchile.cl:7041`, `RIOT_API_KEY`
y `LEETIFY_API_KEY`. Después de cambiar el `.env`, `pm2 restart reactivoActivo-7041`.

### 4. Primera vez: instalar y levantar (en el servidor)

```bash
cd ~/reactivoActivo && npm ci --omit=dev
pm2 start npm --name reactivoActivo-7041 -- run start
pm2 save
```

`npm` avisa `EBADENGINE` porque el servidor tiene Node 20; no afecta, ya que se ejecuta
el JavaScript compilado.

### 5. Redespliegue

Repetir los pasos 1 y 2, y luego en el servidor:

```bash
cd ~/reactivoActivo && npm ci --omit=dev && pm2 restart reactivoActivo-7041
```

### Verificar

```bash
pm2 logs reactivoActivo-7041 --lines 30 --nostream
```

Debe aparecer `servidor escuchando en http://0.0.0.0:7041`. Si aparece
`no se pudieron preparar los índices de la base de datos`, revisa `MONGODB_DBNAME`:
la base debe ser una sobre la que el usuario de MongoDB tenga permisos.

Después, en el navegador: registro, inicio de sesión (la cookie llega con `HttpOnly; Secure;
SameSite=Strict`), recarga de `/perfil` y cierre de sesión.

El servidor **no tiene datos de demostración**: la base empieza vacía y las
coincidencias se demuestran con cuentas reales del equipo.

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
