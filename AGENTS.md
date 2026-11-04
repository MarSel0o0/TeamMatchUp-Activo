# AGENTS.md — TeamMatchUp

Registro global y estático para cualquier agente de IA. El estado actual del proyecto
no va aquí: está en `MEMORY.md`.

## Qué es

Plataforma web que empareja jugadores de League of Legends, Rainbow Six Siege y
Counter-Strike 2 cruzando tres condiciones: mismo juego, rango similar (obtenido de la
fuente del juego, no declarado) y disponibilidad en los mismos bloques horarios. El
flujo termina en una sesión agendada, no en una lista de perfiles. Detalle en
`PRODUCT.md`.

## Documentos de referencia (en orden de prioridad)

1. `docs/constitution.md` — principios innegociables. Prevalece sobre todo lo demás.
2. `PRODUCT.md` — usuarios, propósito y principios de producto.
3. `specs/NNN-nombre/{spec,plan,tasks}.md` — qué se construye, cómo y en qué orden.
4. `MEMORY.md` — estado actual. Leerlo al empezar; actualizarlo al cerrar cada fase.
5. `HITO2.md` — enunciado del hito vigente.

## Stack y estructura

- `frontend/` — React 18 + TypeScript + Vite + React Router 6 + TanStack Query.
  - `src/app/` composición, enrutado, layouts y control de acceso.
  - `src/config/` lectura de variables de entorno.
  - `src/domain/` reglas puras: tipos, catálogo de juegos y escala de rango, bloques horarios, motor de coincidencias.
  - `src/services/` acceso a datos: `apiContract.ts` (contrato único), `http/` (`httpClient.ts` y `httpApi.ts` contra Express; `transport.ts` con plazo de 30 s y clasificación de errores; `csrfStorage.ts` con el comprobante `X-CSRF-Token`; `sessionEvents.ts` con el aviso de 401), `mock/` (backend simulado que responde como el servidor: `mockApi.ts`, `simulatedProvider.ts` y datos ficticios en `seed.ts`), `api.ts` (elige la implementación: servidor real por defecto, modo simulado solo con `VITE_USE_MOCK_API=true`). La sesión va en la cookie HttpOnly; la interfaz guarda solo el comprobante CSRF, nunca un JWT.
  - `src/features/` una carpeta por dominio funcional (`auth`, `profile`, `matches`, `sessions`).
  - `src/shared/` componentes, hooks y utilidades reutilizables.
  - `src/styles/` tokens de diseño (`tokens.css`) y estilos globales.
- `backend/` — Express 5 + Mongoose + TypeScript, Node ≥ 22.18 ejecutando `.ts` directo (ESM).
  Base definida en `specs/001-crear-backend`; autenticación en `specs/002-autenticacion`;
  usuarios y disponibilidad en `specs/003-usuarios-y-disponibilidad`; cuentas de juego y
  rango simulado en `specs/004-cuentas-de-juego`; coincidencias en `specs/005-coincidencias`:
  - `src/index.ts` punto de entrada: carga y valida la configuración y arranca el servidor.
  - `src/app.ts` composición de Express (cuerpo JSON, 404, manejador de errores); sin conexión a la base.
  - `src/server.ts` arranque: conectar a MongoDB y luego escuchar.
  - `src/controllers/` rutas por recurso: `users.ts` (registro, listado, obtener, actualizar perfil, eliminar cuenta con su cascada ordenada C1 → C2 → C3, disponibilidad y resumen por juego), `auth.ts` (sesión), `accounts.ts` (cuentas de juego) y `matches.ts` (coincidencias).
  - `src/models/` esquemas de Mongoose: `user.ts` (sin lista de cuentas: son las que lo tienen como dueño) y `gameAccount.ts`.
  - `src/services/` lógica sin Express: `credentials.ts` (validación), `passwords.ts` (bcrypt), `sessionToken.ts` (JWT, cookie y comprobante), `userTarget.ts` (identificador de ruta, `me`, formato y propiedad), `profile.ts` (validación del perfil), `availability.ts` (validación de bloques horarios), `timezones.ts` (zonas válidas), `zoneTab.ts` (`zone.tab` de tzdata 2025b, incrustada), `accountWrites.ts` (vincular con compensación, escritura de la cuenta propia), `accountReads.ts` (lecturas sin cuentas sin dueño), `rankProvider.ts` (proveedor de rango simulado) y `matchInputs.ts` (datos de las coincidencias).
  - `src/types/` ampliaciones de tipos: `express.d.ts` (`request.userId`).
  - `src/utils/` `config.ts` (variables de entorno), `errors.ts`, `logger.ts` (único sitio con `console`), `clock.ts` (reloj inyectable) y `middleware.ts` (`createWithUser`, que responde 401 «token inválido» a la credencial de un usuario eliminado, y la guardia de rutas de usuario).
  - `src/domain/` reglas puras sin Express, Mongoose ni reloj, aisladas de `services/`, `utils/`, `models/` y `controllers/` (lo vigila `tests/unit/domainIsolation.test.ts`): `games`, `rankScale`, `rankSimulator`, `accountRules`, `accountState`, `userId` (spec 004) y `matchQuery`, `availability`, `matching` (spec 005). Adaptación del dominio del frontend (catálogo, bloques horarios, motor), con dos diferencias propias del backend: la normalización de rango (`rankScale`, spec 004, RF-48) y el plegado de región solo ASCII (`accountRules`, DP-35). La spec 006 amplía las carpetas anteriores.
  - `requests/` archivos `.rest` para probar la API a mano.
  - `tests/` con `unit/`, `controllers/` (supertest; incluye `userDeletionCascade.test.ts` con fallos forzados de la cascada y `accountConcurrency.test.ts` con solapamiento determinista), `server/` (arranque y procesos hijo) y `fixtures/` (copia oficial de `zone.tab` de tzdata 2025b).
  - Variables en `backend/.env` (no se sube); plantilla en `backend/.env.example`.
## Comandos

- Frontend (`cd frontend`): `npm run dev | build | preview | typecheck | lint`. No tiene script de test. Por defecto habla con el servidor real (`VITE_API_URL=/api`, proxy de Vite a `VITE_PROXY_TARGET`, puerto de `backend/.env`); modo simulado: `VITE_USE_MOCK_API=true npm run dev` (en PowerShell: `$env:VITE_USE_MOCK_API="true"; npm run dev`). Cuenta demo del modo simulado: `demo@teammatchup.gg` / `demo1234`. Si `node_modules` no coincide con el lock, `npm ci`.
- Backend (`cd backend`): `npm run dev | test | typecheck | lint`. `npm test` fija `NODE_ENV=test`, corre en serie y necesita MongoDB y `backend/.env`.
- Gestor: npm. Toda dependencia se instala con `--save-exact`.

## Flujo SDD

Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.
Ninguna fase avanza sin aprobación explícita del usuario.

| Agente | Rol |
| --- | --- |
| coordinator | Dirige el flujo y delega; no edita archivos. |
| planner | Redacta specs, planes y tareas; solo escribe en `specs/**`. |
| implementer | Ejecuta una tarea cada vez, tests primero; marca la tarea y para. |
| reviewer | Revisa y valida; no edita. |

## Convenciones

- Las de `docs/constitution.md` (stack, specs, dominio puro, tests, seguridad, idioma).
- Estilos solo desde `styles/tokens.css`; ningún color escrito a mano.
- Sin `any`, sin `@ts-ignore`, sin `dangerouslySetInnerHTML`.
- Los datos de demostración se etiquetan siempre como tales en la interfaz.

## Seguridad y git

- Nunca subir `.env`, `dist/` ni `out/`.
- Sin commits, push ni operaciones git destructivas salvo que el usuario lo pida.

## Equipo

Constanza Torres · Daniel Ayala · Sebastián Valenzuela · Benjamín Estupiñán ·
Marcelo Zamorano · Vicente Oliva
