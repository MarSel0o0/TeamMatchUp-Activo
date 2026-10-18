# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-10-16

## Fase actual

Constitución aprobada y escrita (`docs/constitution.md`). Siguiente fase SDD: retomar la spec 001.

## Estado del código

- Frontend: Hito 1 completo (acceso, configuración, perfil, coincidencias y agenda).
  Funciona contra el backend simulado en el navegador (`mockApi`, datos de demostración
  con semilla fija, cuenta `demo@teammatchup.gg`).
- Backend: no existe todavía.

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001-crear-backend` | Redactada, sin implementar | Hito 2: Express + Mongoose + auth con cookie HttpOnly + CSRF + dos vistas nuevas. No sigue la plantilla SDD: las tareas están dentro de la spec y faltan `plan.md` y `tasks.md`. Las vistas nuevas (ficha de jugador, detalle de sesión) son una propuesta sin confirmar. |

## Deuda conocida

- `httpApi.ts` y `mockApi.ts` guardan el JWT en `localStorage` (`tmu.token`): choca con el principio 5. La spec 001 lo corrige.
- No hay ningún test en el repositorio.
- El frontend no tiene runner de test (el principio 4 aplica solo al backend por decisión del usuario).
- `frontend/src/domain` importa sin extensión `.ts`, así que no se puede ejecutar directo con `node --test`.

## Decisiones recientes

- Los 6 principios de la constitución quedan aprobados.
- Principio 4 (tests primero) aplica solo al backend por ahora.
- Principio 6 admite una futura versión en inglés de la interfaz, mediante su propia spec.
- implementer escribe los archivos fuera de `specs/**`; planner solo escribe en `specs/**`.

## Próximo paso

Adaptar la spec 001 a la plantilla SDD (o confirmarla tal cual) y pasar a la clarificación con reviewer.
