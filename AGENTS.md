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
  - `src/services/` acceso a datos: `apiContract.ts` (contrato único), `http/` (cliente contra Express), `mock/` (backend simulado con datos semilla), `api.ts` (elige implementación según `VITE_API_URL`).
  - `src/features/` una carpeta por dominio funcional (`auth`, `profile`, `matches`, `sessions`).
  - `src/shared/` componentes, hooks y utilidades reutilizables.
  - `src/styles/` tokens de diseño (`tokens.css`) y estilos globales.
- `backend/` — Express 5 + Mongoose + TypeScript, Node ≥ 22.18 ejecutando `.ts` directo (ESM).
  Base definida en `specs/001-crear-backend`; autenticación en `specs/002-autenticacion`:
  - `src/index.ts` punto de entrada: carga y valida la configuración y arranca el servidor.
  - `src/app.ts` composición de Express (cuerpo JSON, 404, manejador de errores); sin conexión a la base.
  - `src/server.ts` arranque: conectar a MongoDB y luego escuchar.
  - `src/controllers/` rutas por recurso: `users.ts` (registro) y `auth.ts` (sesión).
  - `src/models/` esquemas de Mongoose: `user.ts`.
  - `src/services/` lógica sin Express: `credentials.ts` (validación), `passwords.ts` (bcrypt) y `sessionToken.ts` (JWT, cookie y comprobante).
  - `src/types/` ampliaciones de tipos: `express.d.ts` (`request.userId`).
  - `src/utils/` `config.ts` (variables de entorno), `errors.ts`, `logger.ts` (único sitio con `console`) y `middleware.ts`.
  - `src/domain/` reservado para la copia del dominio del frontend (specs 003 en adelante); las specs 003 a 006 amplían también las carpetas anteriores.
  - `requests/` archivos `.rest` para probar la API a mano.
  - `tests/` con `unit/`, `controllers/` (supertest) y `server/` (arranque y procesos hijo).
  - Variables en `backend/.env` (no se sube); plantilla en `backend/.env.example`.
## Comandos

- Frontend (`cd frontend`): `npm run dev | build | preview | typecheck | lint`. No tiene script de test.
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
