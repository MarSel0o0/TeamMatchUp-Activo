# Tareas 010 — Producción, despliegue y documentación
Estado: en implementación (2026-10-21). Plan: `specs/010-despliegue/plan.md`.
Spec: `specs/010-despliegue/spec.md`. Diez tareas: T1 a T8 las hace el agente; T9 (despliegue
real) la hace el usuario con sus credenciales; T10 es condicional.

**2026-11-20:** T4 a T8 estaban marcadas, pero su trabajo se había perdido con el código de T2 y
T3 (recuperado en `6307b9a`). Se rehicieron ese día: recorrido y comprobaciones en
`validation.md` (secciones 2 y 4), README raíz con producción y despliegue, `backend/.env.example`
con los valores del servidor comentados, `frontend/README.md` con las vistas y rutas actuales,
pasos 15 y 16 de `backend/requests/users.rest`, `AGENTS.md` y la fila de la 010 en `MEMORY.md`.

- [x] **T1. Pruebas del fallback (rojas).** Crear `backend/tests/controllers/ui.test.ts` con una
  carpeta temporal (`index.html`, `assets/app.js`) y los casos de la sección 5 del plan.
  RF: RF-1, RF-2, RF-3.
  Hecho cuando: el archivo existe, `npm run typecheck` pasa y los casos con `uiDir` fallan
  porque la opción aún no existe (rojo por la razón correcta).
- [x] **T2. `uiDir` en `createApp`.** Implementar la opción en `backend/src/app.ts` (plan,
  sección 2). RF: RF-1, RF-2, RF-3.
  Hecho cuando: `ui.test.ts` y `app.test.ts` en verde, `typecheck` y `lint` en verde.
- [x] **T3. Arranque de producción.** `backend/src/index.ts` calcula `uiDir` en producción, falla
  con código 1 y mensaje si falta `dist/index.html`; scripts `build`, `start` y `build:ui` y
  `backend/scripts/copyUi.ts` (D-3, D-4). RF: RF-1, RF-6.
  Hecho cuando: `npm run build:ui` y `npm run build` terminan en Windows y dejan
  `backend/dist/index.html` y `backend/out/index.js`; `typecheck` y `lint` en verde (el lint
  cubre `scripts/`).
- [x] **T4. Recorrido local de producción.** Con una base temporal (`teammatchup_val010`, se
  borra al terminar), arrancar `npm start` con `NODE_ENV=production`, un secreto propio y un
  puerto libre; comprobar con curl: `GET /` y `GET /perfil` (recarga) entregan la aplicación,
  `/assets/*.js` el archivo real, `GET /api/inexistente` 404 JSON, registro y login con
  `Set-Cookie` con `HttpOnly; SameSite=Strict; Secure`, y arranque sin `dist` → código 1.
  Registrar todo en `validation.md`. RF: RF-1 a RF-4, RF-6.
  Hecho cuando: `validation.md` tiene cada comprobación con su salida y la base temporal está
  borrada.
- [x] **T5. README raíz y `.env.example`.** Reescribir `README.md` (estado, variables de
  servidor e interfaz sin valores, requisitos, local, pruebas con la nota de Windows, producción
  local, despliegue en el servidor del curso con marcadores `<usuario>` y `<contraseña>`, datos
  simulados y sin datos precargados; el guion de la demostración va aparte, en `demo.md`). Comentar en `backend/.env.example`
  los valores de producción del servidor del curso. RF: RF-7, RF-9, RF-11; RNF-3, RNF-4.
  Hecho cuando: cada comando del README se ejecutó o se explica por qué no (los del servidor
  del curso quedan para T9) y una búsqueda de credenciales en el repositorio no encuentra nada.
- [x] **T6. README de la interfaz.** Actualizar `frontend/README.md`: vistas (ficha y detalle),
  tabla de operaciones de la API tal como están tras las specs 002 a 009, modo simulado y
  cuenta demo. RF: RF-8; RNF-3.
  Hecho cuando: cada ruta de la tabla existe en `frontend/src/services/http/httpApi.ts` y en
  `backend/requests/*.rest`.
- [x] **T7. Comprobaciones finales del repositorio.** `npm test` (con `--script-shell=bash` en
  Windows), `typecheck` y `lint` del backend; `build` y `lint` del frontend; `git status` sin
  archivos de variables ni de construcción; búsqueda de credenciales. RF: RNF-1, RNF-4.
  Hecho cuando: todo en verde y `git status` solo muestra los archivos de esta spec.
- [x] **T8. Cierre documental.** Actualizar `MEMORY.md` (estado de las 007 a 010, próximos pasos),
  `AGENTS.md` (comandos `build`, `build:ui`, `start`) y marcar T1 a T8. RF: —.
  Hecho cuando: `MEMORY.md` y `AGENTS.md` coinciden con el código.
- [ ] **T9. Despliegue en el servidor del curso (lo hace el usuario).** Seguir el README: verificar
  `node --version` (R-1) y si MongoDB deja crear `teammatchup_7041` (R-2; ya se sabe que no:
  T10); subir la carpeta `backend/` compilada con `tar` por `ssh` a `~/reactivoActivo`; crear el
  `.env`; `npm ci --omit=dev`; `pm2 start` (o `pm2 restart`) con el nombre `reactivoActivo-7041`;
  `pm2 save`; reiniciar y comprobar. Anotar el resultado en
  `validation.md`. RF: RF-5, RF-6, RF-9; RNF-5.
  Hecho cuando: en `https://fullstack.dcc.uchile.cl:7041/` se completa registro, login (cookie
  `Secure`), recarga y cierre de sesión, y el proceso sobrevive a un reinicio.
- [x] **T10. (Solo si R-2 ocurre) Prefijo `tmu_` en la base `fullstack`.** Cambio acotado del arranque
  (D-6), con test primero. RF: RF-6.
  Hecho cuando: con la variable del prefijo definida, ninguna colección sin prefijo se escribe
  en `fullstack`, probado con una base temporal. Si R-2 no ocurre, se marca como «no
  necesaria» con la comprobación de T9.
  **Resultado (2026-11-20):** R-2 ocurrió en el servidor (`not authorized on teammatchup_7041`,
  código 13; visto en la rama `origin/deploy`). Se trae de esa rama `src/models/collections.ts`
  con los mismos nombres (`tmu_users`, `tmu_gameaccounts`, `tmu_playsessions`) y se amplía a
  `tmu_steamattempts` y `tmu_riotchallenges`. **Desviación de D-6:** el prefijo es fijo en todos
  los entornos, no una variable (así lo usa ya el servidor y no hace falta tocar el arranque).
  `tests/unit/collections.test.ts`: rojo sin el módulo, verde después; comprueba también que
  ningún modelo registrado queda sin prefijo. Suite 2978 (2977 en verde, 1 omitida, 0 fallos);
  `typecheck` y `lint` sin errores. Pendiente de confirmar con el equipo qué colecciones `tmu_*`
  tienen datos hoy en `fullstack`.
