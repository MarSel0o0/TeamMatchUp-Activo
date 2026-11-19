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

## Requisitos previos

- Node.js **22.18 o superior** para desarrollo y pruebas (el backend ejecuta los `.ts`
  directamente). En el servidor basta Node 20, porque ahí corre el JavaScript compilado.
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

Luego entra a http://localhost:5173 y crea una cuenta.

Para usar la interfaz sin servidor, pon `VITE_USE_MOCK_API=true` en `frontend/.env`: se
activa un backend simulado en el navegador con la cuenta `demo@teammatchup.gg` / `demo1234`.

**Pruebas del backend** (usan la base de prueba, distinta de la de desarrollo):

```bash
cd backend
npm test
```

Los detalles de arquitectura y las vistas de la interfaz están en
[`frontend/README.md`](frontend/README.md).

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

Si falta una variable o tiene un valor inválido, el servidor no arranca y lista los errores.

Todas las colecciones llevan el prefijo `tmu_` (`tmu_users`, `tmu_gameaccounts`,
`tmu_playsessions`), para convivir con otros grupos en la base compartida del servidor
del curso.

### Frontend (`frontend/.env`)

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | Dirección base de la API. Por defecto `/api` (relativa; no cambiarla para producción) |
| `VITE_USE_MOCK_API` | `true` activa el backend simulado; cualquier otro valor usa el servidor real |
| `VITE_PROXY_TARGET` | Destino del proxy `/api` de Vite en desarrollo (debe coincidir con `PORT` del backend) |
| `VITE_MOCK_LATENCY` | Latencia artificial (ms) del backend simulado |

## Despliegue en el servidor del curso

| Dato | Valor |
| --- | --- |
| URL | https://fullstack.dcc.uchile.cl:7041/ |
| SSH | `ssh -p 219 <usuario>@fullstack.dcc.uchile.cl` (usuario compartido por todos los grupos) |
| Carpeta | `~/reactivoActivo` |
| Proceso PM2 | `reactivoActivo-7041` |
| Base de datos | `fullstack`, con el prefijo `tmu_` en las colecciones |

> El servidor es compartido. **Nunca** uses `pm2 restart all`, `pm2 stop all` ni
> `pm2 delete all`: opera siempre con el nombre `reactivoActivo-7041`.

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
`Unauthorized`), por eso se usa `fullstack`.

### 4. Primera vez: instalar y levantar (en el servidor)

```bash
cd ~/reactivoActivo && npm ci --omit=dev
pm2 start npm --name reactivoActivo-7041 -- run start
pm2 save
```

`npm` avisa `EBADENGINE` porque el servidor tiene Node 20; no afecta, ya que se ejecuta
el JavaScript compilado.

### 5. Redeploy

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

El servidor **no tiene datos de demostración**: la base empieza vacía y las
coincidencias se demuestran con cuentas reales del equipo.

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
