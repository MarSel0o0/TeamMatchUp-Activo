# TeamMatchUp — Frontend

Interfaz web de la plataforma de emparejamiento de jugadores por **rango** y **horario**
para League of Legends, Rainbow Six Siege y Counter-Strike 2.

Esta carpeta contiene **solo el frontend**. La aplicación funciona hoy de forma
completa contra un backend simulado en el navegador, y está preparada para
consumir el servidor Express cuando exista, sin tocar los componentes.

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

Mientras no haya servidor, la app arranca con datos simulados (16 jugadores,
cuentas vinculadas, rangos con historial, disponibilidades y sesiones).

```
correo:      demo@teammatchup.gg
contraseña:  demo1234
```

Los datos se guardan en `localStorage`; borrar el almacenamiento del sitio
devuelve todo al estado inicial.

## Vistas implementadas

Las cuatro vistas del Hito 1, más el control de acceso:

1. **Registro e inicio de sesión** (`/login`, `/registro`) — punto de entrada; el
   resto de la aplicación exige sesión iniciada.
2. **Configuración del perfil** (`/configuracion`) — vinculación de cuentas de
   juego y grilla de disponibilidad semanal (se pinta arrastrando el mouse).
3. **Perfil** (`/perfil`) — cuentas vinculadas, rango vigente, evolución del
   rango e historial de partidas. El cambio entre juegos ocurre **sin recargar
   la página**: solo se relanza la consulta correspondiente.
4. **Coincidencias** (`/coincidencias`) — jugadores recomendados por juego, con
   filtros dinámicos de diferencia de rango, horas en común, verificación y
   búsqueda por nombre.
5. **Agenda de sesiones** (`/agenda`) — calendario semanal donde publicar
   sesiones en bloques concretos y sumarse a las de otros.

## Arquitectura

```
src/
├── app/            Composición: proveedores, enrutado, layouts, control de acceso
├── config/         Lectura de variables de entorno
├── domain/         Reglas del problema, sin React ni HTTP
│   ├── types.ts        Tipos compartidos (usuarios, cuentas, rangos, sesiones)
│   ├── games.ts        Catálogo de juegos y escala normalizada de rangos
│   ├── availability.ts Bloques horarios, traslapes y formato
│   └── matching.ts     Motor de recomendación (rango + horario)
├── services/       Acceso a datos
│   ├── apiContract.ts  Contrato que cumple toda implementación
│   ├── http/           Cliente HTTP contra Express
│   ├── mock/           Backend simulado en memoria + datos semilla
│   └── api.ts          Elige una implementación según el entorno
├── features/       Una carpeta por dominio funcional
│   ├── auth/           Sesión, formularios de acceso
│   ├── profile/        Perfil y configuración
│   ├── matches/        Coincidencias y filtros
│   └── sessions/       Agenda semanal
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

Cuando el servidor esté disponible basta con definir la variable de entorno:

```bash
cp .env.example .env
# .env
VITE_API_URL=/api            # usa el proxy de Vite hacia VITE_PROXY_TARGET
```

Con `VITE_API_URL` definido, `services/api.ts` deja de usar el mock y pasa a
`services/http/httpApi.ts`, que espera estos endpoints:

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/register` | Crea la cuenta y devuelve `{ token, user }` |
| `POST` | `/auth/login` | Inicia sesión y devuelve `{ token, user }` |
| `GET` | `/auth/me` | Usuario de la sesión actual |
| `POST` | `/auth/logout` | Cierra la sesión |
| `PATCH` | `/profile` | Actualiza nombre, descripción y zona horaria |
| `GET` | `/profile/accounts` | Cuentas de juego vinculadas |
| `POST` | `/profile/accounts` | Vincula una cuenta (`gameId`, `handle`, `region`) |
| `DELETE` | `/profile/accounts/:id` | Desvincula una cuenta |
| `POST` | `/profile/accounts/:id/sync` | Relee el rango desde la fuente externa |
| `GET` | `/profile/availability` | Bloques de disponibilidad |
| `PUT` | `/profile/availability` | Reemplaza los bloques (`{ blocks: string[] }`) |
| `GET` | `/profile/games/:gameId` | Cuenta, rango, tendencia y partidas recientes |
| `GET` | `/matches` | Coincidencias filtradas por rango y traslape |
| `GET` | `/sessions` | Sesiones publicadas |
| `POST` | `/sessions` | Publica una sesión |
| `POST` | `/sessions/:id/join` · `/leave` | Sumarse o salir |
| `DELETE` | `/sessions/:id` | Cancela la sesión (solo quien organiza) |

Las formas exactas de cada respuesta están en `src/domain/types.ts` y
`src/services/apiContract.ts`. El backend simulado (`src/services/mock/mockApi.ts`)
sirve además como especificación ejecutable del comportamiento esperado, incluidos
los errores (401 sesión inválida, 409 cuenta duplicada, 422 identificador con
formato inválido, 403 cancelar una sesión ajena).

## Criterio de recomendación

`domain/matching.ts` combina dos componentes, ambos normalizados a 0-100:

- **Cercanía de rango** (peso 0,55). Cada juego traduce su escala propia a un
  valor 0-100 (`domain/games.ts`), lo que permite comparar títulos con escalas de
  distinto largo. Una diferencia de 25 puntos anula este componente.
- **Traslape horario** (peso 0,45). Ocho horas semanales en común se consideran
  un traslape ideal.

El criterio vive en un módulo aislado justamente porque el enunciado anticipa que
se ajustará durante el desarrollo; cuando Express implemente `GET /matches`, este
archivo queda como referencia del criterio acordado.
