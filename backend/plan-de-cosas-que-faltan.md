# Plan de acción

## Fase 1 — Recuperar el código de la 010 (es lo primero porque bloquea el resto)

1. implementer, T2 de la 010: añade la opción uiDir a AppOptions y al createApp de backend/src/app.ts, según el plan de la 010 (§D-1). tests/controllers/ui.test.ts ya existe y hace de prueba en rojo.
   - Listo cuando: pasan ui.test.ts y app.test.ts, desaparece el error de typecheck ui.test.ts(28,83) y la suite queda en verde. La única salvedad es process.test.ts, que falla por tu Node 22.14 y no por el código.
2. implementer, T3 de la 010: backend/src/index.ts sirve backend/dist en producción y, si falta index.html, termina con código 1 y un mensaje en español.
3. reviewer: valida la 010 requisito por requisito (RF-1 a RF-3) y repite el recorrido local en modo producción de su validation.md §2.
4. Si hay cambios que hacer, vuelvo al implementer con la lista exacta, con un máximo de 2 vueltas.

## Fase 2 — Validar la 013 (Steam) en el navegador

5. reviewer: revisa lo pendiente de validation.md §2 (RF-2, 3, 7, 15, 16, 18–22, 24 y 25) con un Steam falso y Chrome headless, a 1280 y 375 px. Prueba tres casos: modo simulado, servidor sin clave y servidor con clave falsa.
6. Si pide correcciones, van al implementer (máximo 2 vueltas). Después, T9 y T10 quedan cerradas en lo técnico. T11 sigue abierta hasta que hagas tú los recorridos con Steam real.

## Fase 3 — Validar la 007, la 008 y la 009

7. reviewer, una spec cada vez para no pisarse puertos ni bases: 007, luego 008, luego 009, con requisitos y navegador.
8. 008: el contraste (D10-1 y D10-2) ya se sabe que falla. Se corrige con el implementer y vuelve a revisarse. Antes de esa corrección te preguntaré dos cosas: qué hacer con C10-1 (texto del botón desactivado) y si la prueba con NVDA se exige o no, como ya se decidió en la 009.
9. Lo que el reviewer diga de la 007 y la 009 se corrige igual, con un máximo de 2 vueltas por spec.

## Fase 4 — Cierre

10. planner: pone al día el Estado: de las specs 010, 013, 007, 008 y 009 y sus validation.md.
11. implementer: actualiza la tabla de MEMORY.md y la sección «Próximo paso», y ejecuta graphify update ..
12. Te propongo commits separados por spec. No se hace ninguno sin tu aprobación, no se suben .DS_Store ni .env, y no se hace push.

## Queda fuera (anotado como pendiente)

- Desborde de /perfil a 375 px: mejor hacerlo en una sesión normal de Claude Code, fuera de este flujo. Es un ajuste de CSS en .rank-scale__rail y .tabs__tab.
- Spec 011: sigue en borrador.
- Lo que solo puedes hacer tú: los recorridos con Steam y Leetify reales (013 y 015), el despliegue de la 010 (posible al terminar la fase 1) y la prueba del README por un compañero.
- Entorno: actualizar Node a 22.18 o más para que pase process.test.ts.
