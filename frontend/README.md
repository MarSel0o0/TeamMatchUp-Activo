# TeamMatchUp — Frontend

Interfaz web de la plataforma de emparejamiento de jugadores por **rango** y **horario**
para League of Legends, Rainbow Six Siege y Counter-Strike 2.

Esta carpeta contiene la interfaz. Por defecto habla con el servidor Express de `backend/`; con
`VITE_USE_MOCK_API=true` funciona completa contra un backend simulado en el navegador, sin tocar
los componentes. En producción no corre aparte: `npm run build:ui` (desde `backend/`) la compila y
el servidor la entrega en el mismo puerto que la API (ver el README raíz).

## Puesta en marcha

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Scripts disponibles:

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila TypeScript y genera el paquete de producción en `dist/` |
| `npm run preview` | Sirve el paquete generado |
| `npm run typecheck` | Verifica tipos sin emitir archivos |
| `npm run lint` | ESLint sobre todo el código |

### Cuenta de demostración

Con `VITE_USE_MOCK_API=true` la app arranca con datos simulados y ficticios (16 jugadores,
cuentas vinculadas, rangos con historial, disponibilidades y sesiones). Sin esa variable habla
con el servidor real.

```
correo:      demo@teammatchup.gg
contraseña:  demo1234
```

Los datos simulados se guardan en `localStorage` (`tmu.mock-db.v3`); borrar el almacenamiento del
sitio devuelve todo al estado inicial. Todo lo que simula la plataforma (rango, partidas, marca de
verificada) se muestra con la etiqueta «Datos de demostración».

## Vistas implementadas

1. **Portada** (`/`) — presentación pública de la plataforma.
2. **Registro e inicio de sesión** (`/login`, `/registro`) — punto de entrada; el resto de la
   aplicación exige sesión iniciada.
3. **Inicio** (`/inicio`) — resumen del jugador al entrar.
4. **Configuración del perfil** (`/configuracion`) — ficha, vinculación de cuentas de juego
   (con «Verificar con Steam» y «Verificar con Riot Games» cuando el servidor tiene la clave) y
   grilla de disponibilidad semanal (se pinta arrastrando el mouse).
5. **Perfil** (`/perfil`) — cuentas vinculadas, rango vigente, evolución del rango e historial
   de partidas. El cambio entre juegos ocurre **sin recargar la página**: solo se relanza la
   consulta correspondiente.
6. **Coincidencias** (`/coincidencias`) — jugadores recomendados por juego, con filtros de
   diferencia de rango, horas en común, verificación y búsqueda por nombre.
7. **Ficha de jugador** (`/jugadores/:userId`) — perfil público de otro jugador por juego, con
   «Proponer» una sesión en las horas en común (spec 008).
8. **Agenda de sesiones** (`/agenda`) — calendario semanal donde publicar sesiones en bloques
   concretos y sumarse a las de otros.
9. **Detalle de sesión** (`/agenda/:sessionId`) — participantes, edición por quien organiza,
   sumarse, salir y cancelar (spec 009).
10. **Verificación con Riot Games** (`/verificar/riot`) — cambio temporal del ícono de invocador
    para verificar un Riot ID (spec 014).
11. **Vuelta de Steam** (`/verificar/steam`) — página fuera de las rutas protegidas que completa
    la verificación de CS2 al volver de Steam (spec 013).

## Arquitectura

```
src/
├── app/            Composición: proveedores, enrutado, layouts, control de acceso
├── config/         Lectura de variables de entorno
├── domain/         Reglas del problema, sin React ni HTTP
│   ├── types.ts        Tipos compartidos (usuarios, cuentas, rangos, sesiones)
│   ├── games.ts        Catálogo de juegos y escala normalizada de rangos
│   ├── availability.ts Bloques horarios, traslapes y formato
│   └── matching.ts     Criterio de recomendación del modo simulado (rango + horario)
├── services/       Acceso a datos
│   ├── apiContract.ts  Contrato que cumple toda implementación
│   ├── http/           Cliente HTTP contra Express
│   ├── mock/           Backend simulado en memoria + datos semilla
│   └── api.ts          Elige una implementación según el entorno
├── features/       Una carpeta por dominio funcional
│   ├── auth/           Sesión, formularios de acceso
│   ├── home/           Portada e inicio
│   ├── profile/        Perfil y configuración
│   ├── matches/        Coincidencias y filtros
│   ├── players/        Ficha de otro jugador
│   ├── sessions/       Agenda semanal y detalle de sesión
│   ├── steam/          Verificación de CS2 con Steam
│   └── riot/           Verificación de LoL con Riot Games
├── shared/         Componentes, hooks y utilidades reutilizables
└── styles/         Design tokens y estilos globales
```

Principios que sostienen la escalabilidad del proyecto:

- **El dominio no depende de la interfaz.** Agregar un cuarto juego es añadir una
  entrada en `domain/games.ts`: selectores, pestañas, filtros y agenda se generan
  desde ese catálogo.
- **Un solo contrato de datos.** Los componentes importan siempre `services/api`
  y nunca saben si detrás hay un mock o un servidor.
- **Una carpeta por funcionalidad.** Cada `feature` agrupa sus páginas, sus
  componentes y sus hooks de datos, de modo que crecer significa añadir carpetas,
  no engordar archivos existentes.
- **Carga diferida por ruta.** Cada vista viaja en su propio paquete; la pantalla
  de acceso no descarga el código de la agenda.
- **Estilos por tokens.** Ningún componente escribe colores a mano: todo sale de
  `styles/tokens.css`.

## Conectar el backend Express

Por defecto la interfaz habla con el servidor real (spec 007). El modo simulado solo se activa con
`VITE_USE_MOCK_API=true` (exactamente `true`; se ignoran los espacios alrededor). Cualquier otro
valor, o ninguno, lo deja desactivado.

```bash
cp .env.example .env
# .env
VITE_API_URL=/api                          # base de la API (proxy de Vite a VITE_PROXY_TARGET)
VITE_USE_MOCK_API=false                    # true: backend simulado en el navegador, sin red
VITE_PROXY_TARGET=http://localhost:3001    # puerto de backend/.env
```

La sesión viaja en una cookie `HttpOnly`. La interfaz solo guarda el comprobante CSRF (`tmu.csrf`)
para enviarlo en la cabecera `X-CSRF-Token`; no guarda ningún JWT. Los errores del servidor llegan
como `{ error: string }`. `services/http/httpApi.ts` usa estas rutas (specs 002 a 009, 013 y 014;
todas bajo `/api`, y cada una con su ejemplo en `backend/requests/*.rest`):

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/users` | Crea la cuenta (no abre sesión) |
| `POST` | `/auth/login` · `/auth/logout` | Abre y cierra la sesión |
| `GET` | `/auth/me` | Usuario de la sesión actual |
| `PATCH` | `/users/me` | Actualiza la ficha |
| `GET` | `/users/:id` | Ficha pública de otro jugador |
| `GET` · `PUT` | `/users/me/availability` | Lee y reemplaza los bloques (`{ blocks: string[] }`) |
| `GET` | `/users/:id/availability` | Disponibilidad de otro jugador (la usa «Proponer») |
| `GET` · `POST` | `/accounts` | Cuentas vinculadas (`?user=me` o `?user=<id>`) y vincular |
| `DELETE` | `/accounts/:id` | Desvincula una cuenta |
| `POST` | `/accounts/:id/sync` | Resincroniza la cuenta (datos reales o simulados según su origen) |
| `GET` | `/users/me/games/:gameId` | Cuenta, rango, partidas recientes y tasa de victorias |
| `GET` | `/users/:id/games/:gameId` | Lo mismo para otro jugador (ficha de jugador) |
| `GET` | `/matches` | Coincidencias filtradas (juego, distancia, horas, verificadas, búsqueda) |
| `GET` · `POST` | `/sessions` | Sesiones (`?game=`) y publicar una |
| `GET` · `PUT` | `/sessions/:id` | Detalle de una sesión y editarla (solo quien organiza) |
| `POST` | `/sessions/:id/join` · `/leave` | Sumarse o salir |
| `DELETE` | `/sessions/:id` | Cancela la sesión (solo quien organiza) |
| `GET` | `/steam` | Si la verificación con Steam está disponible |
| `POST` | `/steam/start` · `/steam/complete` | Abre el intento y lo completa al volver de Steam |
| `GET` | `/riot` | Si la verificación con Riot Games está disponible |
| `GET` · `POST` | `/riot/challenges/current` · `/riot/challenges` | Desafío abierto y abrir uno |
| `POST` | `/riot/challenges/:id/confirm` | Confirma el cambio de ícono |

Las formas exactas de cada respuesta están en `src/domain/types.ts` y
`src/services/apiContract.ts`. El backend simulado (`src/services/mock/mockApi.ts`) responde con los
mismos códigos y textos que el servidor, de modo que sirve de especificación
ejecutable del comportamiento esperado.

## Criterio de recomendación

Las coincidencias las calcula el servidor (`backend/src/domain/matching.ts`, spec 005) y combinan
dos componentes, ambos normalizados a 0-100:

- **Cercanía de rango** (peso 0,55). Cada juego traduce su escala propia a un valor 0-100, lo que
  permite comparar títulos con escalas de distinto largo. Una diferencia de 25 puntos anula este
  componente.
- **Traslape horario** (peso 0,45). Ocho horas semanales en común se consideran un traslape
  ideal.

`frontend/src/domain/matching.ts` aplica el mismo criterio en el modo simulado.
