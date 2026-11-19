# Guion de la demostración
Documento de trabajo del equipo (no es un requisito de la spec 010). `HITO2.md`, el enunciado,
no está en el repositorio: contrasta este guion con lo que pida la pauta (tiempo, orden,
quién habla) antes de ensayar.

## Principios

1. **Sin sorpresas.** La base del servidor empieza vacía: prepara los datos *antes* y no
   dependas de que el público vea un registro en vivo salvo en el paso 1.
2. **El producto primero, el código después.** El flujo termina en una sesión agendada; muéstralo
   completo con dos personas, y solo entonces baja al backend.
3. **Una grabación de respaldo** del recorrido completo y el modo simulado local
   (`VITE_USE_MOCK_API=true`, cuenta `demo@teammatchup.gg`) por si cae la red o el servidor.
4. **Dilo con claridad:** el rango es simulado y etiquetado «Datos de demostración». Es una
   decisión de la spec 004, no un defecto; nómbrala antes de que alguien la pregunte.

## Antes de la demostración (24 h antes y 15 min antes)

- [ ] URL desplegada responde; `pm2 list` muestra `teammatchup-7041` en línea.
- [ ] Dos cuentas de equipo creadas en el servidor (A y B), con **mismo juego, rangos cercanos y
      al menos 2 horas en común** en la grilla. El rango sale del identificador de juego, así que
      es el mismo en cada ensayo: anota qué identificadores dan buenas coincidencias.
- [ ] Una sesión ya publicada por B en un bloque compartido (para el paso de «sumarse»).
- [ ] Dos navegadores o un perfil normal y una ventana de incógnito (sesiones separadas).
- [ ] DevTools preparado en *Application → Cookies* (para el paso de seguridad).
- [ ] Terminal con `backend/` listo para `npm test` (la suite completa tarda unos 6 min:
      **córrela antes** y muestra la salida, o corre solo un archivo, p. ej.
      `NODE_ENV=test node --test tests/controllers/auth.test.ts`).
- [ ] Cierra sesión en ambas cuentas y borra el estado visual que no quieras mostrar.

## Recorrido sugerido (≈10 min)

| # | Qué muestras | Qué dices / qué prueba |
| --- | --- | --- |
| 1 | Registro de una cuenta nueva y login (cuenta C, solo para este paso) | Cookie, no `localStorage`: abre DevTools y señala `HttpOnly`, `Secure`, `SameSite=Strict`. |
| 2 | Con la cuenta A: vincular una cuenta de juego y pintar disponibilidad | El rango «se lee, no se declara» (simulado y etiquetado). La grilla se pinta arrastrando. |
| 3 | Perfil: rango, historial, partidas, cambio de juego sin recargar | Vista dinámica con TanStack Query. |
| 4 | Coincidencias de A: filtros (distancia, horas en común, solo verificadas) | Puntaje = cercanía de rango (0,55) + horas en común (0,45). |
| 5 | Ficha de B desde la coincidencia (spec 008) | Navegación entre vistas. |
| 6 | «Proponer» → agenda con la propuesta → publicar sesión | **Cierre del flujo:** la plataforma termina en una sesión agendada. |
| 7 | Cuenta B (incógnito): se suma a la sesión; detalle de sesión (spec 009), A edita/cancela | Dos usuarios, un recurso; solo el organizador edita (403 a los demás). |
| 8 | Recargar `/perfil` y `/agenda/<id>` | Mismo origen en producción + fallback (spec 010). Sin sesión: lleva a login. |
| 9 | Cerrar sesión; pegar una ruta protegida | Control de acceso. |

## Parte técnica (≈5 min): qué ataque mitiga cada pieza

Sigue la tabla de la sección 5.6 de `specs/_referencia/001-crear-backend-original.md` y,
para cada fila, **señala el test** (esa es la historia HU-15 del Hito 2).

- JWT firmado → no se falsifica editando la cookie (`tests/controllers/auth.test.ts`,
  `protectedRoutes.test.ts`).
- `HttpOnly` → `document.cookie` no la ve (DevTools, paso 1).
- `X-CSRF-Token` + `SameSite=Strict` → CSRF. Demuestra con curl: petición con la cookie pero sin
  la cabecera → 401 `token inválido`.
- `Secure` solo en producción → el test «en producción la cookie lleva Secure».
- `bcrypt`, mismo 401 para correo inexistente y contraseña errónea → enumeración de usuarios.
- `request.userId` desde el token → nadie actúa por otro (403 en cuentas y sesiones ajenas;
  `userDeletion.test.ts`, `accounts.test.ts`, `sessions.*.test.ts`).
- Errores siempre `{ error }` en JSON: `curl https://…/api/inexistente`.
- **Límite que debes reconocer** (la referencia lo pide): un XSS que ejecuta *dentro* de la
  página puede leer el comprobante CSRF y hacer peticiones; `HttpOnly` impide llevarse el token,
  pero la defensa real es no permitir la inyección (React escapa; no hay `dangerouslySetInnerHTML`).

## Preguntas que conviene tener respondidas

- ¿Por qué el rango es simulado? Términos de las fuentes y decisión de la spec 004; la
  arquitectura aísla el proveedor (`rankProvider.ts`) para reemplazarlo.
- ¿Por qué no hay datos precargados? La base del servidor empieza vacía a propósito (spec 010).
- ¿Y si caduca la sesión? Credencial de 1 h; la interfaz avisa y vuelve a login (spec 007).
- ¿Cómo se despliega y se actualiza? README, sección «Despliegue en el servidor del curso».
- ¿Qué pasa si cae el servidor? Modo simulado local como respaldo.
