# Prompt para Claude Design — Presentación Hito 2 de TeamMatchUp

Copiar todo lo que está bajo la línea en Claude Design.

---

Crea una presentación de diapositivas en español (Chile) para la entrega del **Hito 2** de un
proyecto universitario de desarrollo web full stack. Se presenta en vivo ante el equipo
docente, dura **10 minutos exactos** (se corta al minuto 10) y la mitad del tiempo es una
**demo en vivo** de la aplicación, así que las slides deben ser pocas, legibles a distancia y
servir de apoyo, no de guion. Formato 16:9.

## El proyecto

**TeamMatchUp**: plataforma web que junta jugadores de League of Legends, Rainbow Six Siege
y Counter-Strike 2 que juegan el mismo título, tienen un rango parecido y están libres en
los mismos horarios, y termina en una sesión de juego agendada, no en una lista de
perfiles.

Principios de producto que deben notarse en el tono:
1. El cruce es el producto: rango + horario juntos, nunca uno solo.
2. El rango se obtiene, no se declara.
3. El flujo termina en una sesión agendada.
4. Nada inventado: todo dato de demostración se etiqueta como tal. **No inventes métricas,
   usuarios, testimonios ni porcentajes.**

## Identidad visual (respétala; es la de la propia app)

Mundo visual "Lobby": la sala de espera antes de una partida.
- Fondo grafito profundo `#0b0c0e`, superficies `#121418` / `#171a1f` / `#1e2228`, bordes
  finos de luz (no gris), algo de grano sutil.
- Un único acento volt `#cdf24b` (texto sobre volt: `#0c0f02`) que marca solo lo
  importante: la acción, la selección, el traslape.
- Tintas por juego, usadas solo cuando el juego es la información: LoL `#d3a04a`,
  R6 `#5fc2d8`, CS2 `#e08a4f`.
- Tipografía Geist (texto) y Geist Mono (rutas, métodos HTTP, código, folios numerados tipo
  "01 / 02 / 03").
- Forma: paneles con radio 22 px, elementos internos 12 px, chips y botones en píldora.
- Estética sobria y técnica, nada de clipart gamer ni logos oficiales de los juegos.

## Estructura (9 slides, en este orden)

Indica en cada slide, en notas del orador, el tiempo sugerido y quién habla
(`[Integrante]` como marcador). Presupuesto: ~4 min de slides y ~6 min de demo.

### 1. Portada (0:20)
- "TeamMatchUp" grande + la frase del tema (arriba).
- "Hito 2 · Aplicaciones Web Reactivas · Octubre 2026".
- Nombres completos de los integrantes: Constanza Torres, Daniel Ayala, Sebastián
  Valenzuela, Benjamín Estupiñán, Marcelo Zamorano, Vicente Oliva.

### 2. Qué cambió desde el Hito 1 (0:40)
Dos columnas "Hito 1 → Hito 2":
- Hito 1: 5 vistas (acceso, configuración, perfil, coincidencias, agenda) funcionando
  contra un backend simulado en el navegador, con datos semilla.
- Hito 2: backend propio en Express 5 + Mongoose + MongoDB, en TypeScript; autenticación
  con JWT en cookie HttpOnly; el cálculo de coincidencias pasa al servidor; dos vistas
  nuevas (ficha de jugador y detalle de sesión).
Recuadro destacado **"Cambio de prioridad y por qué"**:
- Se dejó de lado conectar el rango a las APIs reales (Riot, Ubisoft, Steam) y se usa un
  **proveedor de rango simulado y determinista** en todos los entornos. Razón: los
  términos de Riot no permiten un producto público con clave de desarrollo, y la app es
  para una demo en vivo, que no puede depender de servicios externos. El rango simulado se
  marca como "simulado" en la interfaz.
- Se priorizó la seguridad de la sesión: el Hito 1 guardaba el JWT en localStorage
  (vulnerable a XSS); ahora vive en una cookie HttpOnly.

### 3. Estado de las funcionalidades (0:30)
Tabla o tarjetas con estado (chip: "Listo" volt / "En curso" neutro):
| Funcionalidad | Spec | Estado |
| --- | --- | --- |
| Servidor base, configuración y errores JSON | 001 | Listo |
| Registro, login, logout y sesión actual | 002 | Listo |
| Perfil de usuario y disponibilidad semanal | 003 | Listo |
| Cuentas de juego y rango simulado | 004 | Listo |
| Coincidencias en el servidor | 005 | `[confirmar]` |
| Agenda de sesiones (CRUD + sumarse/salir) | 006 | `[confirmar]` |
| Interfaz conectada al servidor real | 007 | `[confirmar]` |
| Vista nueva: ficha de jugador | 008 | `[confirmar]` |
| Vista nueva: detalle de sesión | 009 | `[confirmar]` |
Nota pequeña: "Desarrollo guiado por specs: spec → plan → tareas → implementación →
validación. +1100 tests automáticos en el backend (node:test + supertest)."
Deja los estados marcados `[confirmar]` como texto editable bien visible.

### 4. Cómo funciona la autenticación (0:50)
Un diagrama de secuencia limpio Navegador ↔ Express ↔ MongoDB:
1. `POST /api/auth/login` con correo y contraseña → el servidor compara con bcrypt.
2. Respuesta: `Set-Cookie: token=<JWT>` con `HttpOnly; SameSite=Strict; Path=/`
   (`Secure` en producción), sin fecha de expiración (cookie de sesión); el JWT expira a
   la hora. Además la cabecera `X-CSRF-Token` con un comprobante anti-CSRF.
3. El frontend guarda **solo** el comprobante en `localStorage` (`tmu.csrf`) y lo reenvía
   en la cabecera `X-CSRF-Token` en cada petición. La cookie la adjunta el navegador.
4. Cada ruta protegida verifica cookie + comprobante → si falla, `401` y el frontend
   vuelve a `/login` recordando la ruta de origen.
5. `POST /api/auth/logout` borra la cookie y el frontend borra el comprobante.
Dos recuadros al costado:
- **Dónde queda el token:** en una cookie HttpOnly; JavaScript no puede leerla →
  un XSS no puede robar la credencial.
- **Qué hay en localStorage:** solo `tmu.csrf` (comprobante anti-CSRF) y
  `tmu.session-signal` (aviso de login/logout entre pestañas). Nunca el JWT.
- Línea final: "Contra CSRF: SameSite=Strict + comprobante. Contra XSS: no insertar HTML
  de usuarios (sin `dangerouslySetInnerHTML`)."

### 5. Demo en vivo (≈6:00) — slide separadora
Título grande "Demo en vivo" y, en pequeño, la checklist del recorrido (sirve de guion
para el equipo):
1. Entrar a `/agenda` sin sesión → redirige a `/login`.
2. Login → vuelve a la ruta pedida. DevTools: cookie `token` marcada HttpOnly;
   localStorage solo con `tmu.csrf`.
3. Perfil: vincular una cuenta de juego (rango simulado, etiquetado).
4. Coincidencias → abrir la **ficha de jugador** (`/jugadores/:userId`).
5. "Proponer sesión" → agenda → abrir el **detalle de sesión** (`/agenda/:sessionId`):
   editar, sumarse/salir, cancelar con confirmación.
6. Logout → intentar volver atrás a una ruta protegida → `/login`.
Nota del orador: "Frontend, backend y MongoDB ya levantados antes del turno; editor y
devtools abiertos."

### 6. Vistas nuevas (0:30)
Dos tarjetas lado a lado (pon un marco tipo navegador con un placeholder rotulado
"captura de la vista" que reemplazaremos; no inventes la interfaz en detalle):
- **Ficha de jugador** — `/jugadores/:userId`. Perfil completo de otro jugador antes de
  invitarlo: rango por juego con historial y partidas (simulados), su disponibilidad y los
  bloques en común contigo, y botón "Proponer sesión". Usa: `GET /api/users/:id`,
  `GET /api/accounts?userId=`, `GET /api/users/:id/availability`,
  `GET /api/users/:id/games/:gameId`.
- **Detalle de sesión** — `/agenda/:sessionId`. Dirección propia para cada sesión;
  el anfitrión puede editarla y cancelarla (con confirmación); los demás se suman o
  salen; participantes enlazan a su ficha. Usa: `GET /api/sessions/:id`,
  `PUT /api/sessions/:id`, `POST /api/sessions/:id/join`, `POST /api/sessions/:id/leave`,
  `DELETE /api/sessions/:id`.

### 7. Endpoints del backend (referencia, no se recorre: 0:10)
Slide densa pero ordenada: tabla en Geist Mono con columnas **Método · Ruta · Uso**,
agrupada por recurso, con el método como chip de color (GET, POST, PUT, PATCH, DELETE).
Pie: "Todas protegidas salvo registro, login y logout. Errores siempre `{ error }` en JSON
con su código (400, 401, 403, 404, 409, 413, 415, 500)." Si no cabe en una, divídela en
7a y 7b.

**Autenticación**
- `POST /api/users` — registrar usuario
- `POST /api/auth/login` — iniciar sesión (cookie + comprobante)
- `POST /api/auth/logout` — cerrar sesión
- `GET /api/auth/me` — usuario de la sesión actual

**Usuarios y disponibilidad** (`:id` acepta `me`)
- `GET /api/users` — listar usuarios
- `GET /api/users/:id` — obtener un usuario
- `PATCH /api/users/:id` — actualizar el propio perfil
- `DELETE /api/users/:id` — eliminar la propia cuenta (en cascada)
- `GET /api/users/:id/availability` — leer bloques horarios
- `PUT /api/users/:id/availability` — reemplazar bloques horarios
- `GET /api/users/:id/games/:gameId` — resumen de rango por juego

**Cuentas de juego**
- `GET /api/accounts?userId=&gameId=` — listar cuentas
- `POST /api/accounts` — vincular cuenta (rango simulado)
- `GET /api/accounts/:id` — obtener cuenta
- `PUT /api/accounts/:id` — editar cuenta
- `DELETE /api/accounts/:id` — desvincular cuenta
- `POST /api/accounts/:id/sync` — resincronizar rango

**Coincidencias**
- `GET /api/matches?game=&maxRankDistance=&minSharedHours=&onlyVerified=&search=` —
  candidatos por juego, rango y horas en común

**Sesiones de juego (agenda)**
- `GET /api/sessions?game=` — listar sesiones
- `GET /api/sessions/:id` — detalle de una sesión
- `POST /api/sessions` — crear sesión
- `PUT /api/sessions/:id` — editar (solo anfitrión, parcial)
- `DELETE /api/sessions/:id` — cancelar (solo anfitrión)
- `POST /api/sessions/:id/join` — sumarse
- `POST /api/sessions/:id/leave` — salir

### 8. Equipo (0:10)
Los seis nombres completos en una grilla, con un espacio para el rol de cada uno
(`[frontend]` / `[backend]` / `[specs y QA]` como marcadores editables).

### 9. Reflexión sobre la forma de trabajo (1:00) — última slide
Tres bloques con espacio para que el equipo complete; da una frase de arranque en cada uno
como texto editable, en gris, claramente marcado como borrador:
- **Frontend vs. backend:** cómo se repartió el trabajo. Arranque: "Separamos por specs:
  el backend avanzó primero (001–006) y el frontend se conectó después (007–009),
  usando un contrato único de API para no bloquearnos."
- **Rol de la IA:** qué escribió la IA y cómo lo controlamos, sobre todo en la
  autenticación, donde un error no se ve en la interfaz. Arranque: "La IA redactó specs,
  planes y código con tests primero; nosotros aprobamos cada fase y verificamos la
  autenticación con tests de 401/403 y revisando cookies y localStorage en DevTools."
- **Modalidad de laboratorios:** qué nos aportó y qué nos quitó ahora que los conceptos se
  complejizan. Arranque: `[completar por el equipo]`.

## Requisitos finales
- Texto grande: nada menor a 18 pt salvo la tabla de endpoints.
- Contraste alto sobre fondo oscuro; legible en proyector.
- Notas del orador en cada slide con tiempo y responsable.
- No uses imágenes de stock ni logos de Riot, Ubisoft o Valve.
