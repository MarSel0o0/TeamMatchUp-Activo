# Validación 019 — Partidas reales de CS2 con Leetify
Fecha: 2026-11-22. Validó: el implementador (pendiente la revisión del `reviewer` y del usuario).

## Decisiones tomadas al implementar
El usuario pidió seguir sin parar ante cualquier duda y anotar lo decidido.
- **V-1. La guardia de usuarios reconoce la ruta nueva.** `/:id/games/:gameId/leetify-matches` pasa
  por la misma guardia que el resumen (sesión, segmentos decodificables). Sin esto la ruta quedaba
  sin sesión. Se añadió al plan (§1).
- **V-2. El modo simulado responde 404 «esta cuenta no obtiene sus partidas de Leetify».** Igual que
  el servidor con una cuenta que no es de Leetify; en el simulado nunca hay origen Leetify (RF-11).
- **V-3. Resultado en palabras con un estilo propio.** El cuadro de 26 px de «V»/«D» no admite
  «Victoria», «Derrota» ni «Empate»; se usa texto con los colores del tema (sin literales).
- **V-4. Prueba antigua actualizada.** `steamLeetify.test.ts` afirmaba RF-13 de la 015 (partidas
  simuladas, origen `simulated`); ahora afirma el origen `leetify` y que las simuladas guardadas no
  se borran. Otras seis pruebas que esperaban `matches: "simulated"` para CS2 con Steam se
  actualizaron a `"leetify"` (P19-4).

## RF por RF
| RF | Cómo se comprueba | Estado |
|---|---|---|
| RF-1 | `leetifyMatches.test.ts` (consulta con el SteamID64, sin caché); `leetifyClient.test.ts` | ✔ pruebas |
| RF-2 | `leetifyMatches.test.ts` (dominio: orden y tope de 8; ruta) | ✔ pruebas |
| RF-3 | dominio backend y `leetifyMatches.test.ts` del frontend (rótulos y marcador) | ✔ pruebas |
| RF-4 | resumen sin `winRate` (backend); el panel oculta el porcentaje (código) | ✔ pruebas / sin navegador |
| RF-5 | `sources.test.ts`; etiqueta y `LeetifyAttribution` en `LeetifyMatchList` (código) | ✔ pruebas / sin navegador |
| RF-6 | «no guarda nada» en `leetifyMatches.test.ts` | ✔ pruebas |
| RF-7 | fallo → 200 `available: false`; plazo de 8 s en `realSources.test.ts` | ✔ pruebas |
| RF-8 | 404 de Leetify y lista vacía → `available: true, matches: []` | ✔ pruebas |
| RF-9 | partidas inválidas omitidas (`leetifyMatches.test.ts` de dominio) | ✔ pruebas |
| RF-10 | consulta propia del bloque; el panel no la espera (código) | sin navegador |
| RF-11 | CS2 sin verificar: resumen como hoy y 404 en la ruta; modo simulado sin Leetify | ✔ pruebas |
| RF-12 | coincidencias sin cambios (suite completa en verde) | ✔ pruebas |

## Sin verificar
- Recorrido real en el navegador contra Leetify con una cuenta de CS2 verificada (formato real de
  `outcome`, `score` y `map_name`; riesgo R1 del plan) y la vista en tema claro y oscuro.
- `graphify update .`: el comando `graphify` no está instalado en esta máquina.
