# Validación 013 — Verificación de cuentas de Counter-Strike 2 con Steam
Estado: **validada salvo Steam real (2026-11-20)**. Backend probado sin red; interfaz validada en
el navegador por el `reviewer` con un Steam falso (sección 2, APROBADO tras 1 corrección de CSS).
Falta solo el recorrido con la cuenta real de Steam (sección 3, T11), que hace el equipo.

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

## 2. Validación en el navegador (2026-11-20, `reviewer`)
Chrome 157 headless por CDP, a 1280 y 375 px (`mobile: true`), con scripts desechables (no se
versionan). Tres casos: modo simulado (Vite solo); servidor sin `STEAM_API_KEY`; servidor con una
clave falsa y un **Steam falso** local. Para el Steam falso, sin tocar el código: una precarga
`node --import` que redirige el `fetch` global del backend (steamcommunity.com,
api.steampowered.com y Leetify) a un servidor local y bloquea cualquier otra red, y la intercepción
`Fetch` de CDP en el navegador (la página de Steam responde 302 a `return_to` con `id_res` o
`cancel`; el avatar se sirve o falla a voluntad). Backends arrancados con `env -i` desde una carpeta
sin `.env`, base temporal `teammatchup_rev013` (borrada). Ninguna prueba salió a la red. Medidas:
`scrollWidth/clientWidth` de la página.

| RF | Resultado |
|---|---|
| RF-2 | OK. Botón en la fila (perfil, pestaña CS2, y Configuración) con CS2 manual; sin cuenta de CS2, dentro del formulario, sobre el SteamID64, solo con CS2 elegido. |
| RF-3 | OK. Con la cuenta verificada no hay botón; `POST /steam/start` → 409. |
| RF-4, RF-20 | OK. /perfil con «cuenta de Steam verificada»; sigue tras recargar y se va al navegar. |
| RF-5 | OK. Cancelar en Steam → «verificación con Steam cancelada». |
| RF-6 | OK. Reabrir una vuelta usada → «no se pudo verificar con Steam, vuelve a intentarlo». |
| RF-7 | OK. Intento abierto, cookie borrada, vuelta con `id_res`: `POST /steam/complete` 401 → /login sin `from` (`history.state.usr = null`); tras entrar va a /inicio y no vuelve; la cuenta sigue sin verificar; reabrir la misma dirección con sesión → RF-6. |
| RF-8, RF-9 | OK. Textos literales de la spec. |
| RF-11 | OK. Perfil privado: país y horas con «perfil de Steam privado». |
| RF-15, RF-19 | OK tras la corrección. Bloque visible en perfil, Configuración y ficha de jugador; avatar que falla → monograma; nombre largo (54 caracteres) recortado con «…». **Primera vuelta:** /perfil a 375 medía 658/375 (el nombre con `nowrap` ensanchaba la columna del grid y el sello quedaba fuera). **Corrección:** `.ficha__game > * { min-width: 0; }` en `profilePage.css`. **Segunda vuelta:** /perfil a 375 y 1280, con avatar y sin él, 375/375 y 1280/1280; /configuracion y /jugadores/<id> sin regresiones. |
| RF-16 | OK. El formulario manual de CS2 sigue intacto junto al botón. |
| RF-18 | OK. «Chile»; 18745 min → «312 h»; 59 min → «0 h». |
| RF-21 | OK. Modo simulado: botón desactivado con `aria-describedby` a «No disponible en modo de demostración»; nunca «Datos de Steam». |
| RF-22 | OK. Sin clave: `{available:false}`, sin botón en la fila ni en el formulario. |
| RF-24 | OK. Aviso global en barra, pie y portada solo en modo simulado; 0 avisos globales con el servidor real. |
| RF-25 | OK. Texto de Steam en las verificadas; el de la 007 en las demás. |
| RNF-2 | OK. La clave falsa no aparece en ningún registro; `check_authentication` no la lleva. |

Consola sin excepciones ni `console.error` (solo los 4xx esperados y el fallo intencionado del
avatar). Suite del backend al terminar: 2979 en verde, 1 omitida, 0 fallos; `lint` y `tsc -b` del
frontend sin errores.

Observaciones (no bloquean):
- «Datos de Steam» aparece dos veces en la fila de una cuenta verificada, pero en bloques distintos
  (bajo el identificador y junto al nombre). Lo exige la spec 012 (RF-6: el identificador lleva la
  etiqueta de su origen). Quitar una sería un cambio de spec.
- En la ficha de jugador a 375 px el SteamID64 se parte en tres líneas (`overflow-wrap: anywhere` en
  `playerPage.css`), con el último dígito solo. Ninguna RF lo fija.
- Preexistente, fuera de la 013: /perfil a 375 con una cuenta sin verificar mide 627/375 por
  `.rank-scale__rail`; la portada 534/375 por `.rank-demo__marker`; Coincidencias 376/375. `body`
  oculta el desborde.

No se probaron en el navegador RF-12, RF-14 ni RF-23 (no estaban en esta sección; los cubren las
pruebas del backend).

## 3. Pendiente (lo ejecuta el equipo, con su clave y su cuenta de Steam)
Marcar cada línea con su resultado y la fecha.

- [x] **Modo simulado** (`VITE_USE_MOCK_API=true npm run dev`): «Verificar con Steam» desactivado con
      «No disponible en modo de demostración»; aviso global «Datos de demostración» presente.
      (2026-11-20, sección 2.)
- [x] **Servidor sin clave** (sin `STEAM_API_KEY`): no aparece «Verificar con Steam»; sin aviso global.
      (2026-11-20, sección 2.)
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
