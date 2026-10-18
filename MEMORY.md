# MEMORY.md — Estado actual de TeamMatchUp

Registro dinámico. Se actualiza al cerrar cada fase SDD.

## Última actualización

2026-10-18

## Fase actual

Constitución aprobada y escrita (`docs/constitution.md`).  La spec 010 (despliegue) está aprobada.

## Estado del código

- Frontend: Hito 1 completo (acceso, configuración, perfil, coincidencias y agenda).
  Funciona contra el backend simulado en el navegador (`mockApi`, datos de demostración
  con semilla fija, cuenta `demo@teammatchup.gg`).
- Backend: no existe todavía.

## Estado de las specs

| Spec | Estado | Notas |
| --- | --- | --- |
| `001 - - 009` | Desconocido | Desconocido desde esta rama, trabajandose en otras ramas |
| `010-despliegue` | **Aprobada**, sin plan | Producción, despliegue en el servidor del curso y README. |

## Deuda conocida

- `httpApi.ts` y `mockApi.ts` guardan el JWT en `localStorage` (`tmu.token`): choca con el principio 5. La spec 002 lo corrige.
- No hay ningún test en el repositorio.
- El frontend no tiene runner de test (el principio 4 aplica solo al backend por decisión del usuario).
- `frontend/src/domain` importa sin extensión `.ts`, así que no se puede ejecutar directo con `node --test`.

## Decisiones recientes

- Los 6 principios de la constitución quedan aprobados.
- Principio 4 (tests primero) aplica solo al backend por ahora.
- Principio 6 admite una futura versión en inglés de la interfaz, mediante su propia spec.
- implementer escribe los archivos fuera de `specs/**`; planner solo escribe en `specs/**`.
- Spec 010: en producción la interfaz y la API se sirven desde el mismo origen (sin CORS); hay una sola variable de puerto (interno en el servidor, 3001 en local); la cookie es siempre Secure en producción (T23 queda sin efecto).
- Spec 010: antes del plan se comprueban sus supuestos (S-x) y sus referencias a RF contra las versiones finales de las otras specs (D-29, D-30).

## Próximo paso
Para pasar al `plan.md` de la spec 010 hay que:
1. Fusionar las specs 001 a 009 aprobadas.
2. Comprobar los supuestos y las referencias a RF de la 010 contra las versiones finales, incluidas la vuelta desde Steam frente a SameSite (S-7) y la clave de Riot en producción (S-8).
3. Agregar al repo el enunciado del Hito 2 y la parte 6 del Laboratorio 5.
4. Confirmar con el curso que el puerto público 7041 acepta conexiones externas (D-23).
