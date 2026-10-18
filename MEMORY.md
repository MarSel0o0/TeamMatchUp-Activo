 # MEMORY.md — Estado actual de TeamMatchUp

  Registro dinámico. Se actualiza al cerrar cada fase SDD.

  ## Última actualización

## Última actualización

2026-10-17

## Fase actual

Spec 001 (`001-crear-backend`) implementada y validada (reviewer: APROBADO).
Siguiente fase SDD: clarificación de la spec 002 (`002-autenticacion`).

## Estado del código

- Frontend: Hito 1 completo (acceso, configuración, perfil, coincidencias y agenda).
  Funciona contra el backend simulado en el navegador (`mockApi`, datos de demostración
  con semilla fija, cuenta `demo@teammatchup.gg`).
- Backend (`backend/`): servidor base de la spec 001. Express 5.1.0 + Mongoose 8.24.5 +
  dotenv 17.2.3, TypeScript ejecutado directo con Node ≥ 22.18, ESM.
  - Configuración validada al arrancar (`src/utils/config.ts`): `NODE_ENV` obligatoria y
    exacta (`development` | `test` | `production`), `PORT`, `MONGODB_URI`/`MONGODB_DBNAME`
    (desarrollo y producción), `TEST_MONGODB_URI`/`TEST_MONGODB_DBNAME` (prueba), `HOST`
    opcional. El entorno del proceso prevalece sobre `.env`.
  - Arranque (`src/server.ts`, `src/index.ts`): validar → conectar (timeout 10 s) → escuchar.
  - Errores siempre `{ error: string }` en JSON: 400 «JSON mal formado», 404 «endpoint
    desconocido», 413 «cuerpo demasiado grande» (límite 102 400 bytes), 415 «codificación
    no soportada», 500 «error interno del servidor» (detalle solo en el registro).
  - Todavía no expone ningún recurso: las specs 002 a 006 los agregan.
  - 160 tests con node:test + supertest (~25 s, en serie, contra la base de prueba);
    typecheck y lint (ESLint) en verde; `npm audit` sin vulnerabilidades.

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Implementada y validada | spec, plan y tasks aprobados; T1–T10 hechas. Cambios aprobados durante la implementación: mongoose 8.19.1 → 8.24.5 (vulnerabilidad alta) y regla RFC para `HOST` (la última etiqueta no puede ser solo numérica). |
| `002-autenticacion` | Redactada | Pendiente de clarificación. |
| `003-usuarios-y-disponibilidad` | Redactada | — |
| `004-cuentas-de-juego` | Redactada | — |
| `005-coincidencias` | Redactada | — |
| `006-agenda` | Redactada | — |
| `007-integrar-frontend` | Redactada | Elimina el script `seed`. |
| `008-ficha-de-jugador` | Redactada | — |
| `009-detalle-de-sesion` | Redactada | — |
| `010-despliegue` | Redactada | Servirá la interfaz desde el servidor (rutas fuera de `/api`). |

## Deuda conocida

- `httpApi.ts` y `mockApi.ts` guardan el JWT en `localStorage` (`tmu.token`): choca con el
  principio 5. Lo corrigen las specs 002 y 007.
- El frontend no tiene runner de test (el principio 4 aplica solo al backend por decisión
  del usuario).
- `frontend/src/domain` importa sin extensión `.ts`, así que no se puede ejecutar directo
  con `node --test`.
- Mejoras menores detectadas por reviewer en la spec 001 (opcionales, requieren cambio de spec):
  - Con `MONGODB_URI` mal formada, el mensaje dice «no se pudo conectar en 10 s» aunque
    falla al instante.
  - Con `PORT` inválido no se informa a la vez de un `HOST` inválido.
  - Dos aserciones `as` sustituibles por guardas (`config.ts:65` y `as AddressInfo` en tests).
  - El lint no detecta `.only` importado con otro nombre.
  - Faltan pruebas de proceso real con `HOST=""` y con desarrollo sin `MONGODB_DBNAME`.
- La base de desarrollo `teammatchup` no existía al validar: la verificación de «las
  pruebas no tocan la base de desarrollo» fue débil (reviewer lo confirmó revisando el código).

## Decisiones recientes

- Spec 001: `NODE_ENV` obligatoria y exacta, también en `.env` (si falta o es
  desconocida, no arranca).
- Spec 001: en prueba solo el mensaje de configuración inválida se muestra; los de
  base no disponible y dirección/puerto no utilizable se callan (RNF-1, opción b).
- Spec 001: backend con lint (ESLint); el registro de cada petición queda fuera de alcance.
- Spec 001: `HITO2.md` no está en el repositorio; la spec no se contrastó con el enunciado.
- Las dependencias se justifican en el `plan.md` de cada spec aprobada (principio 1).
- Los 6 principios de la constitución quedan aprobados.
- Principio 4 (tests primero) aplica solo al backend por ahora.
- implementer escribe los archivos fuera de `specs/**`; planner solo escribe en `specs/**`.

## Próximo paso

Clarificación de la spec 002 (`002-autenticacion`) con reviewer. Requisito local para
ejecutar los tests del backend: `backend/.env` (copiado de `.env.example`) y MongoDB en
`mongodb://127.0.0.1:27017`.
