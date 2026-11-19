# Validación 015 — Rango Premier real de CS2 con Leetify
Estado: **parcial (2026-11-19)**. Backend y frontend implementados (T1–T16, incluido el cambio de
requisitos D26 a D30). Lo ejecutado está en la sección 1 (T1–T10) y en la sección 3 (T11–T16), sin
red ni clave real. **Pendiente:** la verificación visual en navegador (1280 y 375 px, tema oscuro
y claro), los dos recorridos manuales con cuentas reales, la lectura de los términos de Leetify
contra lo construido y la validación del `reviewer` (secciones 2 y 3.3). Esta spec **no** pasa a
«implementada» ni se marcan las casillas de `spec.md` hasta completar todo eso.

---

## 1. Ejecutado (2026-11-19)

### 1.1 Backend (`backend/`)
- `npm test`: **2959 pruebas, 2951 pasan, 8 fallan, 0 omitidas** (481 suites). Los 8 fallos son
  todos de `tests/controllers/ui.test.ts` (spec 010), la salvedad de entorno ya registrada en las
  validaciones de la 013 y la 014 (existía antes de esta spec). Ningún otro fallo.
- `npm run typecheck`: un único error, `tests/controllers/ui.test.ts(28,83): 'uiDir' does not exist
  in type 'AppOptions'` (la misma salvedad). Ninguno del código de la 015.
- `npm run lint`: salida 0, sin avisos.
- Pruebas nuevas de la 015: `unit/leetify.test.ts`, `unit/leetifyClient.test.ts`,
  `unit/realSources.test.ts`, `server/migration.test.ts`, `controllers/steamLeetify.test.ts`,
  `controllers/cs2Resync.test.ts` y, en T6, 14 pruebas en `controllers/matchInputs.test.ts` y
  `controllers/matches.test.ts`. En T6 las 9 pruebas de comportamiento nuevo se vieron en rojo por
  la razón correcta (200 en vez de 409; candidatas sin rating que entraban) antes de escribir el
  código.

### 1.2 Frontend (`frontend/`)
- `npm run typecheck`, `npm run lint` y `npm run build`: en verde. (El frontend no tiene pruebas:
  constitución, principio 4.)

### 1.3 Comprobaciones estáticas
- Sin `.only` en `backend/src`, `backend/tests` ni `frontend/src`.
- Sin `any` (`: any`, `<any>`, `as any`, `any[]`) en `backend/src`, `backend/tests` ni `frontend/src`.
- Sin dependencias nuevas: `git diff` de los `package.json` y los `package-lock.json` vacío (RNF-6).
- `grep -rn "_leetify_key" backend/src`: solo `services/leetifyClient.ts`. La clave no aparece en
  ningún otro archivo del código.
- `grep -rn "leetify" frontend/src/services/mock`: vacío (RF-23). El simulador solo construye
  `SIMULATED_ORIGINS`, así que nunca produce el origen `leetify`.

### 1.4 Decisión de T6: cuentas de CS2 verificadas con Steam sin `premier`
Cuentas anteriores a la 015 (sin el campo `premier`, rango simulado). En producción no existen
por la migración de T3 (RF-20), pero las pruebas antiguas las crean. El filtro del plan
(`premier: { $nin: ["unrated", "unavailable"] }`) las habría incluido como candidatas con un rango
simulado atribuido a Leetify, contra el principio 5 de la constitución. Decisión: una cuenta de
CS2 verificada con Steam solo entra como candidata con `premier: "rated"`; las de CS2 sin verificar
(sin `premier`, simuladas) siguen entrando (RF-22). Como cuenta propia, una verificada con Steam
sin `premier` recibe el 409 de «rango no disponible» hasta resincronizar. Cubierto por pruebas en
`matchInputs.test.ts` y `matches.test.ts`.

---

## 2. Pendiente

### 2.1 Navegador (Chrome DevTools, 1280 px y 375 px) — **no ejecutado**
Nada de lo siguiente se ha visto en un navegador; solo se comprobó que compila y pasa lint.
- Fila de la cuenta de CS2 (perfil y Configuración): rango «Gold · 36210 CS Rating» o «sin rango
  Premier» / «rango no disponible», con la etiqueta «Datos de Leetify» como enlace (pestaña
  nueva, `rel="noopener noreferrer"`) a `leetify.com/app/profile/<SteamID64>` (RF-4, RF-6, RF-7,
  RF-8).
- Historial: texto «aún no hay historial de rango» con 0 puntos; un punto con su fecha (RF-12).
  Revisar además la línea «Último rango registrado» de una cuenta que pasó a sin rango con
  historial (RF-9), añadida en T8 sin texto en la spec.
- Nota de RF-21 bajo «Verificar con Steam», en el perfil y en Configuración, y cómo se ve junto al
  botón desactivado del modo simulado (se muestra también ahí).
- Vuelta de Steam con Leetify caído: «cuenta de Steam verificada» y, debajo, el aviso de error de
  RF-15 (`role="alert"`), que desaparece al salir del perfil (spec 013, RF-20).
- Resincronizar con Leetify caído: aviso de RF-16 en la fila (`syncNotice`).
- Ficha de jugador y coincidencias: etiqueta enlazada junto al rango del candidato; texto de
  estado en la distancia cuando el jugador no tiene rating (RF-6, RF-7, RF-8).
- Coincidencias de CS2 con la cuenta propia sin rating: mensaje del 409, enlace «Ir a tu perfil» y
  filtros desactivados (RF-10). Coincidencias de LoL con su 409 (spec 014): sin cambios.
- Modo simulado (`VITE_USE_MOCK_API=true`): el perfil de la cuenta demo no muestra ninguna
  etiqueta de Leetify (RF-23). Comprobado solo por código y `grep`, no en pantalla.

### 2.2 Recorridos manuales con cuentas reales — **pospuestos (2026-11-19, decisión del usuario)**
Se cierra la spec sin ellos. Para hacerlos falta en `backend/.env` `STEAM_API_KEY` (la pone el
usuario) y `PUBLIC_URL=http://localhost:5173`. La pantalla con rating está validada con el
Leetify falso (§3.7 y §3.8).
**P15-3, confirmado el 2026-11-19** con autorización del usuario.
- Petición: un `GET https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=76561198000000001`,
  sin clave.
- Respuesta: **404**, `text/plain`, cuerpo `Not Found`.
- Coincide con `parseLeetifyProfile`: 404 da «sin rango Premier». El cliente no lee el cuerpo si
  no es un 200, y lo cubre la prueba «404 → sin rango Premier, aunque el cuerpo no sea JSON
  (P15-3)» de `leetifyClient.test.ts`.
- No hay que cambiar código.

Sigue pendiente del usuario:
- el recorrido con una cuenta real con rating;
- el recorrido de la app con una cuenta sin perfil (pantalla, Coincidencias y RF-10), con y sin
  `LEETIFY_API_KEY`.

1. Cuenta de Steam con rating Premier: verificar, ver el rating y su atribución, resincronizar y
   ver el punto nuevo si cambió.
2. Cuenta de Steam **sin perfil en Leetify**: confirma o corrige P15-3 (que Leetify responda 404
   para un SteamID64 sin perfil). Si el código es otro, se ajusta solo `parseLeetifyProfile` y su
   prueba.
También con una `LEETIFY_API_KEY` real, y sin ella, para ver los límites de consulta (R3).

### 2.3 Términos de Leetify — **leídos (2026-11-19): RF-6 NO basta; hay que cambiar requisitos**
Fuentes:
- La documentación de la API, https://api-public-docs.cs-prod.leetify.com/ (`swagger.json`),
  dice: «By using the public API, you agree to adhere to our Developer Guidelines».
- Esas pautas están en https://leetify.com/blog/leetify-api-developer-guidelines. Las citas
  siguientes salen de ahí.

Lo que contradice la spec:
1. **Logo obligatorio.** «On all apps and websites that include Leetify data, you must display
   the "Data Provided by Leetify" logo.» Las pautas no dejan cambiarlo («Never modify any Leetify
   Logos») y piden que el logo enlace a https://leetify.com/. RF-6 usa en cambio una etiqueta de
   texto, «Datos de Leetify», que enlaza al perfil del jugador.
2. **Texto del enlace a los datos.** Debe ser «View on Leetify». Tiene que verse como enlace
   (negrita, subrayado o el rosa `#F84982`).
3. **Almacenamiento.** Las pautas piden: «please refrain from storing any data sent by our API».
   Si un dato deja de estar disponible en la API, «you must delete that data from any copies you
   have». Esto choca con guardar el rating y el historial (RF-11), con conservar el historial al
   pasar a sin rango (RF-9) y con seguir mostrando el rating cuando una lectura falla (RF-18).
4. **Métricas.** «Please only present our metrics as they are presented in the Leetify app»,
   sin otras escalas ni recálculos. Hay que decidir si «Gold · 36210 CS Rating» (escalón de
   Valve más el número) y el rango normalizado interno de RF-5 cumplen esta pauta.
5. **Nombre.** «Data Provided by Leetify» o «Powered by Leetify» sirven para describir la
   integración. No se puede insinuar que Leetify respalde la aplicación.

Otros datos útiles:
- La API documenta la cabecera `_leetify_key` (o `Authorization: Bearer`). Sin clave, la API
  funciona con «increased rate limits». Coincide con D24 y T2.
- El campo `ranks.premier` es `number | null`. Coincide con `parseLeetifyProfile`.
- `/v3/profile` solo documenta la respuesta 200. El 404 de P15-3 sigue sin confirmar (2.2).
- https://leetify.com/blog/privacy-updates-to-our-api-and-profiles dice: «Public API will return
  data only for users registered to Leetify». La respuesta de la API a un usuario no registrado no
  está documentada.

Siguiente paso: era un cambio de requisitos; aprobado el 2026-11-19 (D26 a D30) e implementado en
T11 a T16 (sección 3). Falta releer los términos contra lo construido (3.3).

### 2.4 Validación del `reviewer` (2026-11-19) — **CAMBIOS NECESARIOS** (atendida por D26 a D30; sin repetir, ver 3.3)
- 14 archivos de prueba de la 015 (`--test-concurrency=1`): 331 pruebas, todas en verde.
- Backend: los RF-1 a RF-23 y los RNF-1 a RNF-7 cumplen. En la interfaz, RF-4, RF-6, RF-10,
  RF-12, RF-15, RF-16, RF-21 y RF-23 solo tienen evidencia por código.
- Decisiones de implementación:
  - (a) Cuenta verificada con Steam sin `premier` → 409 de «no disponible». Aceptada: es la
    definición de «rango no disponible» (RF-8, RF-10, RF-20).
  - (b) `LEETIFY_PRIVACY_TEXT` en `copy.ts`. Aceptada (T7).
  - (c) La nota de RF-21 en el modo simulado. Aceptada: no es un rango ni la etiqueta (RF-23).
  - (d) «Último rango registrado». No aceptada: ver defecto 1.
- Defecto 1 (**bloqueante**). En `GameSummaryPanel.tsx:130-141` y `premierDisplay.ts:41`, con
  «sin rango Premier» e historial conservado no se dibuja el gráfico: aparece un texto que la spec
  no tiene. Incumple RF-12 cuando hay un solo punto. Hay que decidirlo en la spec.
- Defecto 2 (**menor**). En `cs2Sync.ts:77-78`, si al verificar falló el perfil de Steam, una
  resincronización inmediata hace una segunda lectura de Leetify en menos de 5 minutos. Va contra
  la letra de RNF-7 y choca con la D6 de la 013.
- Opcionales:
  - En `cs2Sync.ts:61`, el bloqueo se toma antes de comprobar el dueño y el id no se normaliza.
  - En `gameAccount.ts:258`, falta `premierStatus: "unavailable"` para una cuenta de Steam sin
    `premier`.
  - En `GameSummaryPanel.tsx:152`, la fecha de «Primera lectura» también sale con varios puntos.

### 2.5 Otros
- `requests/leetify.rest`: escrito en T16 (3.1); no se ha usado contra Leetify.
- Paso de `spec.md` a «implementada»: bloqueado por 2.3, 2.4 y 2.2.
- 2.1 (navegador): sin ejecutar. Se detuvo por los defectos de 2.3 y 2.4. Los scripts de
  siembra con Steam y Leetify falsos (base `tmu_015_visual`) están fuera del repo.

---

## 3. Cierre del cambio D26 a D30 (T11 a T16, 2026-11-19)

### 3.1 Ejecutado en T16 (sin red ni clave real)
- `backend/` `npm test`: **2971 pruebas, 2963 pasan, 8 fallan, 0 omitidas, 0 canceladas**
  (483 suites). Los 8 fallos son, por nombre, todos de `tests/controllers/ui.test.ts`: «GET /
  entrega la aplicación», «GET /perfil…», «GET /agenda/…», «GET /jugadores/x/lol…», «GET /ruta/que/no/existe…»,
  «un archivo inexistente fuera de la API…», «HEAD /perfil → 200 sin cuerpo» y «un archivo real
  se entrega tal cual…». Es la salvedad de la spec 010, previa a la 015. Ningún otro fallo.
- `backend/` `npm run typecheck`: un único error, `tests/controllers/ui.test.ts(28,83): 'uiDir'
  does not exist in type 'AppOptions'` (la misma salvedad).
- `backend/` `npm run lint` y `frontend/` `npm run lint`: salida 0, sin avisos.
- `frontend/` `npm run typecheck`: sin errores. `npm run build`: «built in 1.41s».
- `.only`: sin coincidencias en `backend/src`, `backend/tests` ni `frontend/src`.
- `any` (`: any`, `<any>`, `as any`, `any[]`): sin coincidencias en las mismas carpetas.
- Sin dependencias nuevas: `git diff` de `package.json` y `package-lock.json` (backend, frontend y
  raíz) vacío.
- `_leetify_key` en `backend/src`: solo `services/leetifyClient.ts`. En el resto del repo aparece en
  `specs/015-rango-premier/` (documentación), `backend/tests/unit/leetifyClient.test.ts` (la
  prueba de la cabecera) y `backend/requests/leetify.rest` (la cabecera es inevitable allí).
- Clave real: `backend/.env` no define `LEETIFY_API_KEY` (vacía), así que no había un valor real
  que buscar en el repo. `leetify.rest` la recibe como variable (`{{leetifyKey}}`, vacía) y no
  contiene ningún valor con forma de clave.
- Pruebas nuevas de T11 a T15 en backend (dominio sin historial, migración de RF-24, bloqueo y D28);
  T14 y T15 solo con typecheck, lint y build (el frontend no tiene pruebas, principio 4).

### 3.2 Documentos de T16
`backend/requests/leetify.rest` (nuevo), `AGENTS.md` (logos y `LeetifyAttribution`, `leetify.rest`),
`PRODUCT.md` (sin historial real, atribución con el logo), `MEMORY.md`. `README.md` no menciona el
historial: sin cambios.

### 3.3 Pendiente (no ejecutado)
- **Navegador (Chrome DevTools), 1280 px y 375 px, tema oscuro y tema claro.** Nada se ha visto en
  pantalla desde T14 y T15:
  - logo «Data Provided by Leetify» (blanco en oscuro, negro en claro; solo uno visible) enlazado
    a leetify.com y «View on Leetify» al perfil del jugador, ambos en pestaña nueva, en el perfil,
    Configuración, ficha de jugador y coincidencias (RF-6, RNF-8);
  - texto «Leetify solo entrega el rango vigente: no hay historial», ausencia de gráfico y ningún
    contador de lecturas junto a la atribución (RF-12, D27; el contador se ocultó el 2026-11-19 por
    decisión del usuario);
  - cuentas de LoL y CS2 sin verificar: resumen igual que antes.
  - Los puntos de 2.1 que siguen vigentes (RF-10, RF-15, RF-16, RF-21, RF-23).
- **Recorridos manuales con cuentas reales** (2.2): una con rating y una sin perfil en Leetify,
  con y sin `LEETIFY_API_KEY`; ahora también comprobar que el guardado queda sin historial tras
  resincronizar y tras reiniciar el servidor (migración de RF-24).
- **Términos de Leetify:** releer las Developer Guidelines contra lo construido. Siguen abiertos
  sin ejecutar: la pauta de no almacenar datos (solo se guarda el rating vigente y se borra si
  Leetify deja de entregarlo; RF-18 sigue mostrando el último si una lectura falla) y la pauta de
  métricas «como las presenta Leetify» (D30 mantiene «Gold · 36210 CS Rating» y la distancia).
- **Validación del `reviewer`** de T11 a T16, con los desvíos de `MEMORY.md` (a a d): relectura de
  la cuenta dentro del bloqueo de `cs2Sync.ts` (T13), tres pruebas existentes ajustadas a RF-8 y
  RF-24 (T12), contador «N lecturas registradas» en `GameSummaryPanel` (T15) y
  `LEETIFY_NO_HISTORY_TEXT` en `premierDisplay.ts` (T15).
- Sin commit ni `graphify update` (según `CLAUDE.md`, `graphify update .` queda pendiente).

### 3.4 Decisiones del usuario tras T16 (2026-11-19)
- Contador «N lecturas registradas»: se oculta con rango de Leetify en `GameSummaryPanel`
  (corrección dentro de T15; los casos límite piden solo el texto de RF-12).
- Relectura de la cuenta dentro del bloqueo (T13): aceptada y anotada en el plan, §12.2.
- Comprobación de la clave real en el repo: la hace el usuario más adelante (paso 4 de la guía).

### 3.5 Paso 2: términos de Leetify contra lo construido (2026-11-19)
Releídas las pautas (https://leetify.com/blog/leetify-api-developer-guidelines) y comparadas con
`LeetifyAttribution.tsx`, `premierDisplay.ts`, `global.css`, `cs2Sync.ts`, `domain/leetify.ts`, la
migración de `server.ts` y los componentes que muestran el rango (`AccountRow`, `GameSummaryPanel`,
`RankDistanceBlock`, `MatchEntry`, `RankScale`). Solo por código; lo visual se confirma en el
paso 3. Las citas son literales.

1. **Logo obligatorio — cumple.** «On all apps and websites that include Leetify data, you must
   display the "Data Provided by Leetify" logo.» `LeetifyAttribution` sale en los cuatro sitios de
   RF-6 (perfil y Configuración por `AccountRow` y `GameSummaryPanel`, ficha por
   `RankDistanceBlock`, coincidencias por `MatchEntry`), con `alt="Data Provided by Leetify"`.
   `OriginTag` recibe `leetify` en el anillo de afinidad de Coincidencias, que muestra «Datos de
   Leetify»: **corrección del 2026-11-19, ver 3.7, defecto 1** (antes decía que nunca lo recibía).
2. **Logo sin modificar — cumple.** «Never modify any Leetify Logos.» Los dos PNG son idénticos
   byte a byte (`cmp`) a «Leetify Badge White/Black Small.png» del material oficial; el CSS solo
   fija la altura (18 px, proporción intacta), sin filtros ni animación.
3. **Versión según el fondo — cumple.** «Primary (white and pink)»: «For use on dark
   backgrounds»; «Secondary (pink and navy)»: «For use on lighter backgrounds». La insignia
   blanca va en el tema oscuro (el de defecto) y la oscura en el claro (`:root[data-theme='light']`);
   la app no usa `prefers-color-scheme`, así que no hay un tercer caso.
4. **Logo enlazado a Leetify — cumple.** «The "Data Provided by Leetify" logo should link back to
   Leetify's landing page»: `href={LEETIFY_HOME_URL}` = `https://leetify.com/`, pestaña nueva con
   `rel="noopener noreferrer"`.
5. **«View on Leetify» — cumple.** «You should link back to original Leetify data sources […]
   using the following text format, "View on Leetify"» y «Text link should be identifiable as a
   link by using one of the following type treatments: bold weight, underline, Leetify's pink
   #F84982». Texto exacto, enlazado al perfil del jugador (`leetify.com/app/profile/<SteamID64>`),
   con `font-weight: 700` y `text-decoration: underline`.
6. **Prominencia y separación — cumple (a confirmar en pantalla).** «Leetify logos can appear
   near, but must be completely separate and apart from» el nombre de la app y «should not appear
   more prominently than the name/logo of your application». El logo va junto al rango, nunca en
   la cabecera ni junto a «TeamMatchUp»; 18 px de alto.
7. **Respaldo y nombre — cumple.** «Never use Leetify logos in any manner that implies your
   application was developed or sponsored by Leetify» y «You must not use the Leetify name in
   your application name». Los textos con «Leetify» (RF-10, RF-15, RF-16, RF-21) describen hechos
   («Tu rango Premier se obtiene de Leetify con tu SteamID64»); ninguno insinúa respaldo.
8. **Almacenamiento — cumple dentro del riesgo aceptado R6.** «we ask that you please refrain from
   storing any data sent by our API» es una petición, no una prohibición expresa, así que R6 no se
   reabre. Lo obligatorio, «Should you have stored data from us, and that data ceases to be
   available from the API, […] you must delete that data from any copies you have», se cumple:
   `applyLeetifyReading` borra el rating con «sin rango Premier» (RF-9), el historial es siempre
   `[]` (RF-11) y la migración vacía el ya guardado (RF-24). Un fallo conserva el rating (RF-18):
   no es «dejar de estar disponible». Observación: el borrado solo ocurre en la siguiente lectura
   (verificación o resincronización del dueño); las pautas no fijan plazo.
9. **Métricas — NO CUMPLE (lectura literal).** «Please only present our metrics as they are
   presented in the Leetify app», «Do not use different scales for our metrics» y «Do not
   recalculate / present a different score than our API gives you».
   - El rating se muestra exacto (`points` = `ranks.premier`, sin redondeo): cumple.
   - La posición en la escala 0–100 (`RankScale`, «Posición en la escala del juego», con
     `aria-label` «Gold en la escala de CS2: 100 de 100») y la distancia «Δ n pts» de la ficha y
     de coincidencias se calculan a partir del rating de Leetify (`cs2RealStep` →
     `normalizeStep`) y se muestran **junto al logo de Leetify**. Es otra escala para su métrica
     y una cifra distinta de la que da la API. D30 lo justifica porque sale del escalón de Valve,
     pero el escalón se deriva del rating de Leetify, y la pauta no distingue.
   - «Gold · 36210 CS Rating»: el escalón y el nombre «CS Rating» no son de Leetify (D29). No se
     puede comprobar cómo lo presenta la app de Leetify (requiere sesión); queda como duda, no
     como incumplimiento.
   - Por la consigna del paso 2, se para aquí y se propone un cambio de requisitos (`/sdd-change`).
     Sin tocar código.
   - Resuelto por D31 y D32 (T17 a T20).

### 3.6 Cambio D31 y D32 (T17 a T20, 2026-11-19)
Solo frontend (T17 a T19); el backend no cambia. Ejecutado en T20, sin red ni clave real:
- `backend/` `npm test`: **2971 pruebas, 2963 pasan, 8 fallan, 0 omitidas, 0 canceladas**
  (483 suites). Los 8 fallos son, por nombre, todos de `tests/controllers/ui.test.ts`: «GET /
  entrega la aplicación», «GET /perfil…», «GET /agenda/…», «GET /jugadores/x/lol…», «GET
  /ruta/que/no/existe…», «un archivo inexistente fuera de la API…», «HEAD /perfil → 200 sin
  cuerpo» y «un archivo real se entrega tal cual…». Mismos totales que en T16 (3.1).
- `backend/` `npm run typecheck`: un único error, `tests/controllers/ui.test.ts(28,83): 'uiDir'
  does not exist in type 'AppOptions'` (la misma salvedad).
- `backend/` `npm run lint` y `frontend/` `npm run lint`: salida 0, sin avisos.
- `frontend/` `npm run typecheck`: salida 0, sin errores. `npm run build`: salida 0, «built in
  1.48s».
- `.only` y `any` (`: any`, `<any>`, `as any`, `any[]`): sin coincidencias en `backend/src`,
  `backend/tests` ni `frontend/src`.
- Sin dependencias nuevas: `git diff` de `package.json` y `package-lock.json` (backend, frontend y
  raíz) vacío.
- `grep -rni leetify frontend/src/services/mock`: vacío (RF-23: el modo simulado nunca tiene origen
  `leetify`, así que `showsRankDistance` siempre da `true` allí).
- Revisión del diff (plan, §13.5): `RankScale` solo se monta en la rama de `GameSummaryPanel` que no
  es de Leetify; `showsRankDistance` solo se usa en `playerSheet.ts` y `MatchEntry.tsx`;
  `MatchFiltersPanel.tsx` no tiene cambios de T18 (su diff es el `disabled` de RF-10, anterior).
- Decisión de T18: sin cuenta propia del juego activo, `ownRankOrigin` vale `'simulated'` por
  defecto. Solo ocurre en un render de transición (sin cuenta la lista no se pinta) y el origen del
  candidato se sigue comprobando en cada fila.
- Documentos: `PRODUCT.md` (sin escala ni distancia con rangos de Leetify, por sus pautas),
  `MEMORY.md` y esta sección. `AGENTS.md` no describe la escala ni la distancia de CS2 verificado:
  sin cambios.
- **Pendiente (no ejecutado):** navegador (paso 3 de la guía): RF-12 y RF-25 con las cuatro
  combinaciones propia/candidato (simulada o Leetify), a 1280 y 375 px, tema oscuro y claro, junto
  con lo de 3.3; y la validación del `reviewer` de T17 a T20. Sin commit ni `graphify update`.

### 3.7 Paso 3: validación del `reviewer` con navegador (2026-11-19) — **CAMBIOS NECESARIOS**
Entorno: no hay MCP de Chrome DevTools en esta sesión. Se usó Chrome headless controlado por el
protocolo de DevTools (CDP) desde un script de Node, con la base temporal `tmu_015_visual`, Steam
y Leetify falsos (servidor en 3015), Vite real en 5174 y Vite con `VITE_USE_MOCK_API=true` en 5175.
Sin red real ni claves. Scripts, capturas e inspección del DOM fuera del repo (scratchpad de la
sesión, `v015/`). La vuelta de Steam se simuló abriendo directamente la URL de vuelta, porque la
app solo navega a la URL oficial de Steam (protección correcta).

- Pruebas (reviewer): backend `npm test` 2971, 2963 pasan, 8 fallan (por nombre, todas de
  `ui.test.ts`); typecheck con solo `ui.test.ts(28,83)`; lint de backend y frontend y typecheck del
  frontend en verde; sin `.only`, `any` ni dependencias nuevas.
- RF por RF: RF-1 a RF-3, RF-5, RF-9, RF-11, RF-13, RF-14, RF-17 a RF-20, RF-22, RF-24 y RNF-1 a
  RNF-7 cubiertos por pruebas en verde.
- Navegador, 1280 y 375 px, tema oscuro y claro, sin desbordamiento horizontal y 0 errores de
  consola: cumplen RF-4, RF-6 y RNF-8 (un solo logo visible según el tema, 18 px de alto, enlazado a
  leetify.com; «View on Leetify» en negrita y subrayado al perfil; pestaña nueva y `noopener
  noreferrer`) en el perfil, Configuración, la ficha y Coincidencias; RF-7, RF-8 y RF-20 (cuenta
  «Legado» migrada al arrancar); RF-12 (solo el texto, sin escala ni contador; LoL y CS2 sin
  verificar como antes); RF-25 en la ficha (cuatro combinaciones y el caso sin rango) y en la «Δ» de
  Coincidencias; D32; RF-10 (textos, «Ir a tu perfil» y controles `disabled`); RF-15 (aviso
  `role="alert"` que desaparece al salir); RF-16 (perfil y Configuración); RF-21; RF-23 (modo
  simulado sin logo, enlace ni «Datos de Leetify»).
- Desvíos (a) a (d): aceptados. Defectos de 2.4: el bloqueante de RF-12 y el menor de RNF-7
  (D28) resueltos; los tres opcionales también. Decisión de T18 (`ownRankOrigin` por defecto
  `'simulated'`): aceptada.
- **Defecto 1 (bloqueante, visto en pantalla).** En Coincidencias, bajo el anillo de afinidad de
  un candidato con rango de Leetify aparece «Datos de Leetify» (`MatchEntry.tsx:138-142` pasa
  `origin={rankOrigin}` a `ScoreRing`, que pinta `OriginTag` en `:251`). Atribuye a Leetify un
  puntaje que calcula la plataforma, con la etiqueta que D26 retiró: incumple RF-6, RNF-8, la pauta
  §5 y el principio 5, y desmiente la premisa de R8. Con la cuenta propia de Leetify y un candidato
  simulado, el anillo dice solo «Datos de demostración». La spec no dice qué etiqueta lleva el
  anillo: cambio de requisitos. **Resuelto por D33 / RF-26 (T21); revalidado en 3.8.**
- **Defecto 2 (menor, documentación).** 3.5, punto 1, decía que `OriginTag` nunca recibe
  `leetify`: es falso (lo recibe por `ScoreRing`). Corregido abajo en 3.5.
- Opcionales: el texto del logo casi no se lee a 18 px; falta una captura del 409 de LoL (por
  código, sin cambios); rama muerta en `RankDistanceBlock.tsx:115-122`; caminos de prueba que dejan
  un rango simulado con origen `leetify` (no ocurren en producción). El logo y la rama muerta se
  atendieron en T21 (D34; 3.8).

### 3.8 Cambio D33 y D34 (T21 y T22, 2026-11-19) — **APROBADO**
T21 (solo frontend): `scoreOriginLabel` en `premierDisplay.ts` (nunca `leetify`; `simulated` si
alguno lo es; `null` si los dos son de Leetify; con Riot, el origen del candidato como antes);
`ScoreRing` de `MatchEntry.tsx` sin etiqueta con `null`; `.leetify-attribution__logo` a 24 px;
caso `value` de `RankDistanceBlock.tsx` solo con `OriginTag`. Revisados los 12 usos de
`OriginTag` en `frontend/src`: ninguno puede recibir `leetify`.

T22, revalidación del `reviewer` (mismo entorno que 3.7, Chrome headless por CDP; capturas y
scripts fuera del repo, en el scratchpad de esa sesión):
- Pruebas: backend `npm test` 2971, 2963 pasan, 8 fallan (por nombre, todas de `ui.test.ts`);
  typecheck con solo `ui.test.ts(28,83)`; lint de backend y frontend, typecheck y build del
  frontend en verde.
- RF-26: Coincidencias de GoldUno: Candidato (Leetify) sin etiqueta bajo el anillo, Simulado y
  SimuladoDos con «Datos de demostración»; de Simulado: los tres con «Datos de demostración»; de
  Candidato: GoldUno sin etiqueta y los dos simulados con «Datos de demostración». Igual en tema
  oscuro y claro, a 1280 y 375 px. «Datos de Leetify» no aparece en ninguna pantalla (perfil,
  Configuración, ficha, Coincidencias, modo simulado).
- RNF-8 / D34: logo de 24 px de alto (56×24 oscuro, 58×24 claro), uno solo visible según el tema;
  marca de la cabecera 147×30 (icono 30×30, «TeamMatchUp» 16 px, peso 650): el logo no la supera.
  A 375 px la atribución se reparte con `flex-wrap`, sin solapes ni desbordamiento. 0 errores de
  consola.
- Sin cambios frente a 3.7 salvo el logo y la etiqueta del anillo: RF-12, RF-25 y RF-23 iguales.
- Opcional (fuera de la 015): en modo simulado, `/perfil` a 375 px desborda (página de 548 px por
  `.tabs__tab` y `.rank-scale__rail`). El método de 3.7 no lo detectaba (Chrome ensancha la página
  al emular móvil), así que su «sin desbordamiento» no es fiable en pantallas con escala de rango.
  Componentes que la rama no toca; revisar en otra spec.

---

## 4. Guía de cierre, paso a paso
Orden recomendado. Cada paso dice cómo se hace y cuándo está terminado. Marca la casilla al
terminar y anota el resultado en la sección 3.

- [x] **Paso 1. Decisiones pendientes.** Contador oculto y relectura aceptada (3.4).

- [x] **Paso 2. Términos de Leetify contra lo construido.** Va primero porque es lo único que
  podría obligar a otro cambio de requisitos. **Revisado el 2026-11-19 (3.5): 8 puntos cumplen y
  las métricas no (escala 0–100 y distancia junto al logo); resuelto con el cambio D31 y D32,
  aprobado e implementado en T17 a T20 (3.6).**
  - Releer https://leetify.com/blog/leetify-api-developer-guidelines y comprobar, una por una:
    - logo «Data Provided by Leetify» sin modificar, enlazado a https://leetify.com/ (RF-6, RNF-8);
    - «View on Leetify» con aspecto de enlace (negrita y subrayado);
    - almacenamiento: solo se guarda el rating vigente y se borra si Leetify deja de entregarlo
      (RF-9, RF-24). Es el riesgo aceptado R6 (plan, §12.6): solo hay que reabrirlo si las pautas
      lo prohíben **expresamente**;
    - métricas: «Gold · 36210 CS Rating» y la distancia (D30), comparando con cómo lo muestra la
      app de Leetify;
    - ningún texto insinúa que Leetify respalda la aplicación.
  - Terminado cuando: cada punto queda anotado como «cumple» o «no cumple», con la cita. Si alguno
    no cumple, se para aquí y se abre un cambio de requisitos (`/sdd-change`).

- [x] **Paso 3. Validación del `reviewer` con navegador.** `/sdd-validate 015-rango-premier`.
  **Hecho el 2026-11-19 (3.7): CAMBIOS NECESARIOS por el defecto 1. Cambio D33–D34 hecho en T21;
  revalidado en T22: APROBADO (3.8).**
  - Pedirle que revise RF por RF, con los desvíos (a) a (d) de `MEMORY.md`, y que confirme que
    están resueltos los dos defectos de 2.4 (bloqueante de RF-12 y menor de RNF-7).
  - Navegador (Chrome DevTools) a 1280 y 375 px, en tema oscuro y claro, con los puntos de 3.3:
    - logo (solo uno visible según el tema) y «View on Leetify», en pestaña nueva, en el perfil,
      Configuración, la ficha de jugador y Coincidencias;
    - resumen de CS2 verificado: texto de RF-12, sin gráfico ni contador;
    - LoL y CS2 sin verificar: igual que antes;
    - RF-10 (409 en Coincidencias), RF-15, RF-16 y RF-21;
    - modo simulado (`VITE_USE_MOCK_API=true`): nada de Leetify en pantalla (RF-23).
  - Terminado cuando: el `reviewer` da APROBADO o una lista de cambios. Si hay cambios, se
    corrigen como tareas nuevas antes de seguir.

- [ ] **Paso 4. Recorridos manuales con cuentas reales.** Los hace el usuario con
  `backend/requests/leetify.rest` y la app en marcha. **Pospuesto el 2026-11-19 (2.2).**
  1. Sin `LEETIFY_API_KEY`: verificar una cuenta de Steam **con** rating Premier; ver el rating, el
     logo y «View on Leetify»; resincronizar; comprobar en la base que `rankHistory` queda `[]`.
  2. Lo mismo con una cuenta **sin** perfil en Leetify: «sin rango Premier» y el 409 de RF-10 en
     Coincidencias.
  3. Repetir 1 con `LEETIFY_API_KEY` real en `backend/.env` (nunca en otro archivo).
  4. Reiniciar el servidor y comprobar que la migración de RF-24 no cambia nada más.
  5. Clave real: en tu propia terminal (no dentro de Claude Code, para que no quede en la
     conversación), `git grep -n "<un trozo de la clave>"` y `git log -p -S "<un trozo>"` deben salir
     vacíos.
  - Terminado cuando: los cinco puntos quedan anotados en 2.2 con su resultado.

- [x] **Paso 5. Cerrar la spec.** Hecho el 2026-11-19, con el paso 4 pospuesto.
  - `spec.md` pasa a «Estado: implementada».
  - `MEMORY.md`: entrada de cierre y fila de la tabla de specs.
  - `graphify update .` desde la raíz (`CLAUDE.md`).
  - Terminado cuando: `npm test`, `typecheck` y `lint` del backend y `typecheck`, `lint` y `build`
    del frontend siguen en verde (salvo `ui.test.ts`).

- [ ] **Paso 6. Commits.** La rama `feature/vinculacion-steam-riot` acumula cambios sin confirmar
  de la 014 y de la 015.
  - Commits separados por spec, al estilo de los anteriores (`feat(spec-015): …`).
  - Revisar `git status` antes: no incluir `.DS_Store` ni nada de `backend/.env`.
  - Terminado cuando: `git status` queda limpio salvo lo que no va en el repo.

Pendiente aparte, fuera de la 015: los 8 fallos y el error de typecheck de `ui.test.ts` (spec 010).

---

## 5. Traspaso (2026-11-19): estado y siguiente paso para otro agente
Quien retome esto debe leer antes `CLAUDE.md`, `docs/constitution.md`, la skill `sdd`, las
entradas «Spec 015» de `MEMORY.md`, `spec.md` (D26–D34, RF-1 a RF-26), `plan.md` §12–§14,
`tasks.md` (T1–T22) y este archivo completo.

**Hecho:** pasos 1 y 2 de la guía; cambio D31–D32 implementado (T17–T20); paso 3 ejecutado
(3.7) con un defecto bloqueante; cambio D33–D34 aprobado por el usuario con spec, plan §14 y
tareas T21–T22 escritas. **Nada commiteado.**

**Actualización:** T21 y T22 hechos; el `reviewer` dio APROBADO (3.8). Siguen los puntos 3 a 5.

**Siguiente, en orden:**
1. **T21** con un `implementer` (plan §14). No requiere nueva aprobación: el usuario ya aprobó el
   cambio y las tareas.
2. **T22**: `reviewer` revalida RF-26 y RNF-8 en el navegador y da el veredicto; anotar en 3.8,
   marcar el paso 3. Si pide cambios, proponer las tareas al usuario y **no** implementar sin su
   aprobación.
3. **Paso 4** (lo hace el usuario con `backend/requests/leetify.rest`): darle una lista corta de
   qué mirar en cada recorrido (los 5 puntos del paso 4), esperar sus resultados y anotarlos en
   2.2. **Nunca** pedir ni escribir la clave; la comprobación de la clave en el repo la hace el
   usuario en su terminal.
4. **Paso 5**: `spec.md` a «Estado: implementada» (y marcar las casillas que correspondan);
   `MEMORY.md` con entrada de cierre y la fila de la tabla de specs; `graphify update .`; volver a
   correr backend `npm test`, `typecheck`, `lint` y frontend `typecheck`, `lint`, `build`, y
   comprobar **por nombre** que los únicos fallos son los 8 de `ui.test.ts` (y el error de
   typecheck `ui.test.ts(28,83)`), salvedad previa de la spec 010 que no se toca.
5. **Paso 6**: proponer al usuario el reparto en commits por spec (la rama acumula 014 y 015; el
   último commit es `6faee8d`, la 014 T1–T12), estilo `feat(spec-015): …`, con la lista de
   archivos de cada uno. **Ningún commit sin aprobación**, nunca `.DS_Store` (raíz y
   `frontend/`) ni `backend/.env`, **sin push**.

**Entorno de validación visual** (fuera del repo, en el scratchpad de la sesión anterior:
`/private/tmp/claude-501/-Users-cony-Developer-universidad-apps-web-TeamMatchUp-Activo/cbbbe887-6057-4359-9b81-92d12b298d6b/scratchpad/v015/`):
- `server.ts`: backend con Steam y Leetify falsos, base `tmu_015_visual` (Mongo en Docker
  `mongo-dev`, 127.0.0.1:27017), puerto 3015. Control de los dobles:
  `GET http://127.0.0.1:3015/__fake?leetify=rated&rating=N|unrated|failed&steamId=…&steamDown=0|1`.
  Arranque: desde `backend/`, `node <ruta>/server.ts`.
- `seed.ts`: siembra (usuarios `gold`, `hist`, `fue`, `sin`, `nodisp`, `legacy`, `simu`, `simu2`,
  `cand`, `nuevo` `@v015.gg`, contraseña `contraseña-segura`; todos con horario Mar–Jue 20–22).
  Tras sembrar, reiniciar `server.ts` para que corra la migración. «Nuevo» ya quedó verificado
  en el recorrido de RF-15 (resembrar si hace falta repetirlo).
- Vite real: desde `frontend/`, `VITE_PROXY_TARGET=http://127.0.0.1:3015 npx vite --port 5174
  --strictPort`; simulado: `VITE_USE_MOCK_API=true npx vite --port 5175 --strictPort` (demo:
  `demo@teammatchup.gg` / `demo1234`).
- Chrome headless: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --remote-debugging-port=9223 --user-data-dir=<v015>/chrome-profile`. `cdp.mjs` es el driver
  (CDP por WebSocket, `INSPECT` devuelve logos, enlaces, «Δ» y textos clave); `run.mjs`,
  `run2.mjs`, `run3.mjs` son los recorridos; las capturas y `results*.json` están en `shots/`.
  Sesión en la página: `fetch('/api/auth/login')` y guardar la cabecera `x-csrf-token` en
  `localStorage['tmu.csrf']`; tema en `localStorage['tmu.theme']`. La vuelta de Steam se simula
  abriendo la URL que devuelve `POST /api/steam/start` (la app solo navega a la URL oficial).
- Al terminar: parar los procesos (`pkill -f v015/server.ts`, los dos Vite y el Chrome del puerto
  9223) y, si se quiere, borrar la base `tmu_015_visual`.
