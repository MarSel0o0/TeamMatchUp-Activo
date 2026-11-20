# Validación 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: **parcial (2026-11-18)**. Backend completo y probado sin red; la interfaz está construida y
pasa `typecheck`, `lint` y `build`, pero **no se ha visto en un navegador** y **no hay ningún
recorrido con la cuenta real de Steam**. Esta spec no está validada hasta cerrar la sección 3.

## 1. Comprobado de forma automática (sin red, RNF-3)
Backend (`npm test --script-shell=bash`): 2592 de 2600 en verde. Los 8 fallos son de
`tests/controllers/ui.test.ts`, archivo de la spec 010 sin commitear cuyo código (`uiDir` en `app.ts`)
no está en esta rama; no pertenecen a la 013. `npm run lint` sin errores; `npm run typecheck`
solo falla en ese mismo archivo. **Actualización 2026-11-20:** con la 010 ya en la rama
(`6307b9a`) y la corrección de RF-7 (`c7afc2f`), la suite completa da 2978 pruebas, 2977 en verde,
1 omitida (de la 010) y 0 fallos; `typecheck` y `lint` sin errores.

| RF / RNF | Dónde se prueba |
|---|---|
| RF-1, RF-3 | `steam.test.ts` (abrir intento, uno por usuario, 409 con cuenta verificada), `steamAttempts.test.ts` |
| RF-2 (servidor: se puede abrir con o sin cuenta manual) | `steam.test.ts` |
| RF-4, RF-8, RF-9 | `steamComplete.test.ts` (éxito, conversión, 409, 503 y plazo) |
| RF-5 | `steamComplete.test.ts` (cancelar, volver vacío, token ajeno) |
| RF-6 | `steamComplete.test.ts` (cada causa), `steamOpenId.test.ts` (campos firmados, `return_to`) |
| RF-7 | `steamComplete.test.ts` (401 sin sesión, la cuenta no cambia y el intento de ese token se descarta; reabrir la vuelta tras entrar da RF-6; corrección `c7afc2f`); la página pide `api.steam.abandon` y no recuerda su dirección: **sin verificar en navegador** |
| RF-10, RF-11, RF-17 | `steamProfile.test.ts`, `steamClient.test.ts`, `steamComplete.test.ts` |
| RF-12 | `steamComplete.test.ts` (verificada sin perfil), `steamResync.test.ts` (sin espera) |
| RF-13 | `steamComplete.test.ts`, `steamResync.test.ts` (rango simulado, origen) |
| RF-14, RF-23 | `steamResync.test.ts` |
| RF-20 (textos literales, servidor) | `steamRules.test.ts`, `steamComplete.test.ts` |
| RF-22 (servidor) | `config.test.ts`, `steam.test.ts` (`available: false`, 503) |
| RF-26 | `steamAttemptCascade.test.ts` |
| RNF-1, RNF-2 | `steamOpenId.test.ts` (solo `openid.*`), `steamClient.test.ts` (la clave no sale ni a la consola) |
| RNF-4, RNF-6, RNF-7 | `config.test.ts`, `steam.test.ts`, `steamAttemptModel.test.ts` |

Frontend: `npm run typecheck`, `npm run lint` y `npm run build` sin errores.

## 2. Construido pero sin ver en un navegador
RF-2 (botón en la fila y sobre el formulario), RF-3 (el botón no aparece con una cuenta verificada),
RF-7 (la página de vuelta sin sesión), RF-15, RF-16, RF-18, RF-19 (bloque de Steam, formatos,
avatar de respaldo), RF-20 (avisos en el perfil), RF-21 (botón desactivado en modo simulado),
RF-22 (botón oculto sin clave), RF-24 (aviso global solo en modo simulado) y RF-25 (texto de
«Resincronizar»). El código está en `features/steam/`, `AccountRow`, `LinkAccountForm`,
`ProfilePage`, `SettingsPage`, `AppLayout` y `LandingPage`.

## 3. Pendiente (lo ejecuta el equipo, con su clave y su cuenta de Steam)
Marcar cada línea con su resultado y la fecha.

- [ ] **Modo simulado** (`VITE_USE_MOCK_API=true npm run dev`): «Verificar con Steam» desactivado con
      «No disponible en modo de demostración»; aviso global «Datos de demostración» presente.
- [ ] **Servidor sin clave** (sin `STEAM_API_KEY`): no aparece «Verificar con Steam»; sin aviso global.
- [ ] **Desarrollo local con clave** (`STEAM_API_KEY` y `PUBLIC_URL=http://localhost:5173` en
      `backend/.env`) y la cuenta real de Steam del equipo:
  - [ ] verificar: vuelve al perfil con «cuenta de Steam verificada»; se ven nombre, avatar, país y
        horas, con «Datos de Steam»; rango e historial siguen con «Datos de demostración».
  - [ ] resincronizar (texto «Al resincronizar, se vuelven a leer tus datos de Steam…»); a los
        menos de 5 minutos, el 429.
  - [ ] desvincular y volver a verificar.
  - [ ] cancelar en la página de Steam: «verificación con Steam cancelada».
  - [ ] recargar la página de vuelta: «no se pudo verificar con Steam, vuelve a intentarlo».
  - [ ] volver de Steam **sin sesión**: lleva a iniciar sesión y, tras entrar, no continúa sola.
  - [ ] perfil de Steam privado y detalles de juego privados: «perfil de Steam privado» por dato.
- [ ] **R13-1 (riesgo del plan):** anotar cómo respondió `GetOwnedGames` con el filtro de CS2 con una
      cuenta con la lista de juegos pública, con CS2, sin CS2 y privada. Si `game_count` no aparece
      como se supone, abrir un cambio: pedir la lista sin filtro.
- [ ] **Servidor del curso** con su `PUBLIC_URL` (`https`): el mismo recorrido de verificar.
- [ ] Búsqueda de la clave real en el repositorio y en `git status`: sin resultados.
