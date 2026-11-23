# Tareas 019 — Partidas reales de CS2 con Leetify
Estado: aprobado (2026-11-22); T1–T6 hechas (sin `graphify update`, que no está instalado). Plan: `specs/019-partidas-leetify/plan.md`. Spec:
`specs/019-partidas-leetify/spec.md` (aprobada el 2026-11-22).

En el backend, las pruebas van primero y se ven en rojo antes del código (constitución,
principio 4). Comandos desde `backend/`: `npm run typecheck`, `npm run lint`, `npm test`; desde
`frontend/`: `npm test`, `npm run lint`, `npm run build`. Ninguna prueba toca la red (RNF-1).

- [x] **T1. Dominio: `parseLeetifyMatches` y origen del bloque.** Tipos, parser, orden y tope de 8
  en `domain/leetify.ts`; `matches: "leetify"` para Steam en `domain/sources.ts`; pruebas
  existentes que esperaban `matches: "simulated"` en CS2 con Steam, actualizadas. RF-2, RF-3,
  RF-5, RF-7, RF-8, RF-9.
  - Hecho cuando: `leetify.test.ts` y `sources.test.ts` cubren cada rama del §2 del plan y pasan.
- [x] **T2. Cliente y plazo.** `readRecentMatches` en `leetifyClient.ts` (misma consulta del
  perfil) y `readMatchesWithTimeout` en `realSources.ts`. RF-1, RF-7, RNF-2.
  - Hecho cuando: pruebas de consulta, clave, 404, 5xx, JSON ilegible, excepción y plazo en verde.
- [x] **T3. Ruta y resumen.** `GET /api/users/:id/games/:gameId/leetify-matches`, resumen sin
  partidas ni `winRate` para el origen Leetify, `leetifyClient` al router. RF-1, RF-2, RF-4, RF-6,
  RF-7, RF-8, RF-12.
  - Hecho cuando: `leetifyMatches.test.ts` en verde (incluye «no escribe en la base») y toda la
    suite del backend, typecheck y lint en verde.
- [x] **T4. Interfaz: contrato, cliente y simulado.** Tipos, `users.getLeetifyMatches` en el
  contrato, `httpApi` y `mockApi` (404 «esta cuenta no obtiene sus partidas de Leetify», como el servidor), clave de consulta, textos y
  `domain/leetifyMatches.ts` con su prueba Vitest. RF-1, RF-3, RF-11.
  - Hecho cuando: `npm test` y `npm run build` del frontend en verde.
- [x] **T5. Interfaz: bloque de partidas de Leetify.** `LeetifyMatchList` y cambio en
  `GameSummaryPanel` (sin porcentaje). RF-2, RF-3, RF-4, RF-5, RF-7, RF-8, RF-10.
  - Hecho cuando: build, lint y pruebas del frontend en verde.
- [x] **T6. Cierre.** Comandos completos en los dos lados, `graphify update .` y nota de lo que
  queda sin verificar (recorrido real contra Leetify).
