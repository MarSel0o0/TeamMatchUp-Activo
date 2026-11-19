# Spec 015 — Rango Premier real de CS2 con Leetify
Estado: aprobada (2026-11-18). Revisada el 2026-11-18 tras la clarificación (D6 a D25),
pendiente de aprobación de la revisión.

## Contexto y objetivo
Desde la spec 013, una cuenta de CS2 verificada con Steam tiene perfil y horas reales, pero su
rango, su historial y sus partidas **siguen simulados**: ni Steam ni Valve ofrecen el rango
Premier a terceros (spec 013, RF-13). Eso choca con el principio 2 de `PRODUCT.md` ("el rango
se obtiene, no se declara"): en CS2, las coincidencias cruzan un rango inventado.

Esta spec toma el **rango Premier real** (CS Rating) de las cuentas de CS2 verificadas desde
**Leetify**, un servicio de estadísticas de CS2 con una API pública y gratuita que entrega el
rango Premier de un SteamID64. Desde entonces el rango y su historial son reales y se atribuyen
a Leetify; las partidas siguen simuladas y etiquetadas (spec 012, RF-6, RF-8).

Por qué Leetify y no otra vía: el scraping de páginas como csstats.gg va contra sus términos y
se rompe con facilidad; leer el rango del coordinador de partidas de Valve exige mantener una
cuenta bot de Steam conectada; FACEIT no tiene el rango Premier, solo su propio ELO.

- Depende de: spec 013 (verificación de CS2 con Steam; en implementación), spec 012 (origen por
  bloque, resincronización, espera mínima y fuente no disponible; implementada y validada el
  2026-11-18), spec 004 (escala de CS2 y rango normalizado) y spec 005 (coincidencias).
- Origen: conversación con el usuario del 2026-11-18 (preguntas 1 a 5) y clarificación del
  mismo día (31 hallazgos, resueltos como D6 a D25).

### Decisiones del usuario
- **2026-11-18 — D1. Sin rango Premier, fuera de coincidencias.** Igual que "sin clasificar"
  en LoL (spec 014, RF-13). Nunca se le pone un rango simulado. RF-7, RF-10.
- **2026-11-18 — D2. Gold sin tope en los datos reales.** Un rating real de 35000 o más es
  Gold y se muestra tal cual; el tope de 34999 de la spec 004 (DP-34) rige solo para los datos
  simulados. RF-4.
- **2026-11-18 — D3. Solo el rango.** De Leetify solo se trae el rango Premier, y con sus
  lecturas se arma el historial. Las partidas siguen simuladas y etiquetadas. RF-13.
- **2026-11-18 — D4. Si Leetify falla, Steam sigue.** La verificación y la resincronización
  con Steam se completan igual y la espera mínima corre si Steam respondió. RF-15 a RF-18.
- **2026-11-18 — D5. El historial simulado se descarta.** Desde que la cuenta usa Leetify, el
  historial solo contiene lecturas de Leetify. RF-3, RF-11.

Clarificación del 2026-11-18 (el número entre paréntesis es el hallazgo):
- **D6 (28). Constitución, principio 5.** Se amplía: son reales los datos de la fuente oficial
  o de un tercero que los obtiene de ella y que una spec aprobada nombra; se atribuyen a quien
  los entrega, nunca a Valve. Texto aplicado en `docs/constitution.md` el 2026-11-18.
- **D7 (29). Aviso de privacidad.** Junto a "Verificar con Steam" se informa que el rango se
  obtiene de Leetify con el SteamID64; no se pide consentimiento, porque el SteamID64 ya es
  público en Steam. RF-21.
- **D8 (30). Excepciones como RF propios.** Cada cambio sobre otra spec es un RF de esta spec
  que nombra el requisito que excepciona; las otras specs no se editan. RF-2, RF-4, RF-7,
  RF-8, RF-16, RF-17. Resuelve también los hallazgos 12, 16 y 17.
- **D9 (31). Migración.** Al poner en marcha esta versión, las cuentas de CS2 verificadas que
  aún tienen rango simulado pasan a "rango no disponible". El criterio es el estado de la
  cuenta, no una fecha. RF-20. Resuelve también el hallazgo 14.
- **D10 (13). Sin perfil en Leetify no es "cuenta inexistente".** Es "sin rango Premier" y la
  operación tiene éxito; el RF-21 de la spec 012 sigue rigiendo solo para Steam. RF-2.
  Resuelve también el hallazgo 3.
- **D11 (15). Origen del rango no disponible.** Es un bloque de origen Leetify sin dato; se
  muestra con "Datos de Leetify". RF-6, RF-8. Resuelve también el hallazgo 9.
- **D12 (1, 2, 5). Qué es tener rango.** El rating Premier que Leetify entrega como actual es un
  entero de 1 o más; 0, vacío o ausente es "sin rango Premier". La plataforma no razona sobre
  temporadas. "Atribuido a Leetify" es la etiqueta "Datos de Leetify". RF-2, RF-6.
- **D13 (18). Respuestas inválidas.** Cuentan como fallo de Leetify; nunca se guarda un dato
  dudoso. RF-14.
- **D14 (4). Dónde se ve la atribución.** Igual que Steam en la spec 013 (D8). RF-6.
- **D15 (6). Avisos.** Al verificar, dos avisos en el perfil; al resincronizar, en la fila de
  la cuenta. RF-15, RF-16.
- **D16 (7). Resultado parcial.** Steam bien y Leetify mal al resincronizar es un éxito (200)
  con un indicador de rango no actualizado. RF-16.
- **D17 (8, 21). Historial por rating.** Un punto por cada cambio del rating numérico; "sin
  rango" no agrega puntos; no se detectan datos atrasados de Leetify. RF-11.
- **D18 (10). Orden de las consultas.** Primero Steam y, solo si responde, Leetify; máximo
  16 segundos en total. RF-17, RNF-4.
- **D19 (11). Límites de Leetify.** Bastan la espera mínima por cuenta y consultar solo a
  pedido del dueño; un "límite superado" de Leetify es un fallo. RNF-7.
- **D20 (19). Verificación sin perfil de Steam.** Si Steam confirmó la identidad, se consulta
  Leetify aunque falle el perfil de Steam (spec 013, RF-12). RF-1.
- **D21 (20). Resincronizaciones simultáneas.** Solo una se ejecuta. RF-19.
- **D22 (22). Coincidencias con la cuenta propia sin rango.** Mensaje explicativo con enlace al
  perfil y filtros desactivados. RF-10.
- **D23 (23). Historial corto.** Texto con 0 puntos y un solo punto con 1. RF-12.
- **D24 (25). Clave de Leetify opcional.** Sin clave se consulta igual; un rechazo por la clave
  es un fallo. Leetify nunca es una "fuente no configurada". RF-14, RNF-2. Cierra la primera
  duda abierta.
- **D25. Atribución con enlace.** "Datos de Leetify" enlaza al perfil del jugador en Leetify.
  Si los términos de Leetify exigen otra cosa, se abre un cambio de requisitos. RF-6. Cierra la
  segunda duda abierta.
- Sin decisión propia: el hallazgo 24 lo cubren RF-22 y RF-23 (los datos de demostración solo
  tienen cuentas sin verificar); los hallazgos 26 y 27 los cubren RF-1, RF-2 y RF-11.

## Usuarios
- **Jugador de CS2 con cuenta verificada**: quiere que su rango Premier real aparezca en su
  perfil y sea el que usan las coincidencias.
- **Jugador que busca compañeros de CS2**: quiere que el rango de los candidatos sea real.

## Historias de usuario
- HU-1. Como jugador de CS2 con cuenta verificada, quiero que mi rango Premier se tome de una
  fuente real para que mis coincidencias se basen en mi nivel de verdad.
- HU-2. Como jugador de CS2 con cuenta verificada, quiero resincronizar y ver mi rango
  actualizado y su evolución para seguir mi progreso.
- HU-3. Como jugador que busca compañeros, quiero ver que el rango de un candidato viene de
  Leetify para confiar en él.
- HU-4. Como jugador sin rango Premier, quiero que la plataforma lo diga en lugar de
  inventarme uno.

## Definiciones
- **Escala de CS2 para datos reales**: la de la spec 004 con Gold abierto: Grey 0–4999, Light
  Blue 5000–9999, Blue 10000–14999, Purple 15000–19999, Pink 20000–24999, Red 25000–29999 y
  Gold 30000 o más (D2). Solo se aplica al rango que viene de Leetify.
- **Lectura de Leetify**: una consulta a Leetify por el SteamID64 de una cuenta de CS2
  verificada. Termina de una de tres formas (RF-2, RF-14): **con rango** (un rating), **sin
  rango Premier** o **fallo**.
- **Sin rango Premier**: estado de una cuenta cuya última lectura que no fue un fallo terminó
  sin rango.
- **Rango no disponible**: estado de una cuenta verificada que todavía no tuvo ninguna lectura
  que no fuera un fallo (D11).

## Requisitos funcionales

### Lectura de Leetify
- RF-1: CUANDO una cuenta de CS2 queda verificada (spec 013, RF-4), aunque falle la consulta de
  su perfil de Steam (spec 013, RF-12; D20), o su dueño la resincroniza y Steam responde (spec
  012, RF-15), EL SISTEMA hace una lectura de Leetify con su SteamID64 y marca el bloque de
  rango e historial con origen Leetify (spec 012, RF-5).
- RF-2: EL SISTEMA da a una lectura de Leetify el resultado **con rango** cuando el rating
  Premier que Leetify entrega como actual es un entero de 1 a 99999, y **sin rango Premier**
  cuando ese rating es 0, viene vacío o no viene, o cuando Leetify informa que no tiene perfil
  para ese SteamID64; en este último caso, en lugar del RF-21 de la spec 012, la operación
  tiene éxito (D10, D12).

### Rango real
- RF-3: CUANDO una cuenta de CS2 queda verificada, EL SISTEMA descarta su rango y su historial
  simulados, termine como termine la lectura de Leetify (D5; spec 012, RF-8).
- RF-4: EL SISTEMA muestra el rango con rating como el escalón de la escala de CS2 para datos
  reales seguido del rating exacto (por ejemplo "Gold · 36210 CS Rating"), sin recortarlo ni
  redondearlo; en estos datos no rige el tope de Gold de la spec 004 (DP-34) (D2, D8).
- RF-5: EL SISTEMA calcula el rango normalizado de un rango con rating con la regla de la spec
  004 (DP-26), según su escalón: Gold, con cualquier rating de 30000 o más, vale 100.
- RF-6: EL SISTEMA muestra la etiqueta "Datos de Leetify", como enlace al perfil del jugador en
  Leetify, junto al rango (con rating, "sin rango Premier" o "rango no disponible") y al
  historial de toda cuenta de CS2 verificada, a cualquier usuario con sesión: en la fila de la
  cuenta de CS2 del perfil, en Configuración y en la ficha de jugador; en coincidencias, junto
  al rango del candidato (spec 012, RF-6, RF-22; spec 013, D8; D11, D12, D14, D25).

### Sin rango
- RF-7: MIENTRAS una cuenta de CS2 verificada está sin rango Premier, EL SISTEMA muestra "sin
  rango Premier" en lugar de su rango y, como excepción a la spec 005 (que supone que toda
  cuenta tiene rango), la deja fuera de las coincidencias de CS2, tanto como candidata como
  para buscar candidatos (D1, D8).
- RF-8: MIENTRAS una cuenta de CS2 verificada tiene el rango no disponible, EL SISTEMA muestra
  "rango no disponible" en lugar de su rango y la deja fuera de las coincidencias de CS2 como
  en RF-7 (D8, D11).
- RF-9: CUANDO una lectura termina sin rango Premier para una cuenta que tenía rating, EL
  SISTEMA pasa la cuenta a sin rango Premier (RF-7) y conserva su historial.
- RF-10: MIENTRAS la cuenta de CS2 del usuario de la sesión está sin rango Premier o tiene el
  rango no disponible, EL SISTEMA muestra en Coincidencias de CS2, en lugar de la lista, "tu
  cuenta de CS2 no tiene rango Premier: resincronízala cuando lo tengas en Leetify" o "tu
  cuenta de CS2 tiene el rango no disponible: resincronízala", respectivamente, con un enlace
  a su perfil y los filtros desactivados (D22).

### Historial
- RF-11: EL SISTEMA agrega un punto al historial de una cuenta de CS2 verificada cuando una
  lectura termina con rango y la cuenta no tenía rating o tenía uno distinto, aunque el
  escalón sea el mismo; una lectura sin rango Premier o con fallo nunca agrega un punto, y el
  historial nunca contiene puntos simulados (spec 012, RF-9; D5, D17).
- RF-12: SI el historial de una cuenta de CS2 verificada no tiene puntos, ENTONCES EL SISTEMA
  muestra "aún no hay historial de rango" en lugar del gráfico; SI tiene un solo punto,
  ENTONCES el gráfico muestra ese punto con su fecha (D23).
- RF-13: EL SISTEMA mantiene las partidas de una cuenta de CS2 verificada con origen simulado y
  la etiqueta "Datos de demostración" (D3; spec 012, RF-6).

### Leetify no disponible
- RF-14: EL SISTEMA da a una lectura de Leetify el resultado **fallo** cuando Leetify no
  responde en 8 segundos, rechaza la consulta (también por la clave o por superar su límite de
  consultas) o entrega una respuesta que no encaja en RF-2 (D13, D24).
- RF-15: SI la lectura falla al verificar una cuenta de CS2, ENTONCES EL SISTEMA completa igual
  la verificación, deja la cuenta con el rango no disponible (RF-8) y muestra en el perfil,
  debajo de "cuenta de Steam verificada" (spec 013, RF-4) y hasta que el usuario sale de la
  página (spec 013, RF-20), el aviso "Leetify no responde: tu rango Premier se obtendrá al
  resincronizar" (D4, D15).
- RF-16: SI la lectura falla al resincronizar una cuenta de CS2 verificada y Steam respondió,
  ENTONCES EL SISTEMA, en lugar del RF-19 de la spec 012, responde con éxito (200) con los
  datos de Steam actualizados, el rango y el historial sin cambios y la indicación de que el
  rango no se actualizó, y muestra en la fila de la cuenta, donde se ve el resultado de
  "Resincronizar", el aviso "Leetify no está disponible por ahora: tu rango Premier no se
  actualizó" (D4, D8, D15, D16).
- RF-17: CUANDO se resincroniza una cuenta de CS2 verificada, EL SISTEMA consulta primero Steam
  y solo si Steam responde hace la lectura de Leetify; si Steam respondió, cuenta la espera
  mínima (spec 012, RF-16) aunque la lectura falle, en lugar del RF-19 de la spec 012; si Steam
  no responde, rige el RF-19 de la spec 012 sin lectura de Leetify (D4, D8, D18).
- RF-18: MIENTRAS una cuenta de CS2 verificada conserva su rating porque la última lectura
  falló, EL SISTEMA lo sigue mostrando con "Datos de Leetify" y lo usa en las coincidencias.
- RF-19: SI llegan a la vez dos resincronizaciones de la misma cuenta de CS2 verificada,
  ENTONCES EL SISTEMA ejecuta solo una y responde a la otra con el 429 de la espera mínima
  (spec 012, RF-16) (D21).

### Migración
- RF-20: CUANDO esta versión se pone en marcha y hay cuentas de CS2 verificadas cuyo bloque de
  rango tiene origen simulado, EL SISTEMA descarta su rango y su historial simulados y las deja
  con el rango no disponible (RF-8), sin consultar Leetify (D9).

### Aviso de privacidad
- RF-21: EL SISTEMA muestra junto a "Verificar con Steam" (spec 013, D8) el texto "Tu rango
  Premier se obtiene de Leetify con tu SteamID64" (D7).

### Cuentas sin verificar y modo simulado
- RF-22: EL SISTEMA no consulta Leetify para cuentas de CS2 sin verificar: su rango, su
  historial y sus partidas siguen simulados como hoy (spec 012, RF-18).
- RF-23: MIENTRAS la interfaz funciona en modo simulado, EL SISTEMA nunca muestra un rango
  atribuido a Leetify ni la etiqueta "Datos de Leetify" (constitución, principio 5).

## Requisitos no funcionales
- RNF-1: Las pruebas simulan Leetify y pasan sin conexión y sin clave (spec 012, RNF-1).
- RNF-2: La clave de Leetify es opcional: sin ella las lecturas se hacen igual (D24). Si se
  configura, es un secreto de cada instancia: nunca aparece en el repositorio, en respuestas,
  en mensajes de error ni en registros (spec 012, RNF-2).
- RNF-3: El rango Premier solo se obtiene de la API pública de Leetify: nada de leer páginas
  web (scraping), ni bots de Steam, ni otras fuentes.
- RNF-4: Cada consulta tiene un plazo de 8 segundos (spec 012, RNF-5); una resincronización de
  CS2 nunca tarda más de 16 segundos en total, por debajo de los 30 de la interfaz (spec 007)
  (D18).
- RNF-5: Los mensajes nuevos van en español, en minúscula y sin punto final (spec 002, RNF-7),
  salvo los que empiezan por el nombre propio Leetify y el texto de interfaz de RF-21.
- RNF-6: Esta spec no justifica ninguna dependencia nueva (constitución, principio 1).
- RNF-7: Hay como máximo una lectura de Leetify por cuenta cada 5 minutos, y solo a pedido de
  su dueño o al verificar (RF-17, RF-19; spec 012, RF-17) (D19).

## Casos límite
- El jugador no tiene perfil en Leetify, o su perfil es privado: sin rango Premier, fuera de
  coincidencias, y la operación tiene éxito (RF-2, RF-7).
- Leetify entrega un rating 0 o no lo entrega (por ejemplo, al empezar una temporada): sin
  rango Premier; el historial anterior se conserva (RF-2, RF-9).
- El jugador se crea un perfil en Leetify después de verificar: al resincronizar obtiene su
  rating y el primer punto del historial (RF-1, RF-11).
- Rating de 35000 o más: Gold con el rating exacto y rango normalizado 100 (RF-4, RF-5).
- Rating negativo, decimal o mayor que 99999, o un JSON roto: fallo (RF-14).
- Leetify cae justo al verificar: verificada, rango no disponible y fuera de coincidencias
  hasta que una lectura no falle (RF-8, RF-15).
- Steam confirma la identidad pero falla su perfil: se hace la lectura igual (RF-1).
- Leetify cae al resincronizar: 200, se actualizan los datos de Steam, el rango no cambia y la
  espera de 5 minutos corre igual (RF-16, RF-17).
- Steam cae al resincronizar: 503 de la spec 012, sin lectura de Leetify (RF-17).
- Clave de Leetify revocada o vencida: fallo (RF-14).
- Dos resincronizaciones a la vez desde dos pestañas: una se ejecuta y la otra recibe 429
  (RF-19).
- Dos lecturas seguidas con el mismo rating: el historial no crece (RF-11).
- Leetify entrega un rating más bajo por datos atrasados: se agrega como un punto más (RF-11).
- Cuentas de CS2 verificadas con rango simulado al poner en marcha esta versión: rango no
  disponible hasta resincronizar (RF-20).
- El usuario desvincula y vuelve a verificar su cuenta de CS2: el historial empieza de nuevo
  (spec 012, RF-3).
- El usuario de la sesión tiene su cuenta de CS2 sin rango: Coincidencias de CS2 muestra el
  mensaje de RF-10.
- Historial vacío o de un solo punto: RF-12.
- Datos de demostración: todas las cuentas sembradas están sin verificar, así que siguen
  simuladas y nunca muestran "Datos de Leetify" (RF-22, RF-23).

## Fuera de alcance
- Partidas reales de CS2 (de Leetify o de otra fuente).
- Rangos de Wingman, Competitivo por mapa, FACEIT o el puntaje propio de Leetify.
- Rango real para cuentas de CS2 sin verificar (RF-22).
- Actualizar el rango sin que el dueño lo pida (spec 012, RF-17).
- Rango Premier de temporadas anteriores y cualquier lógica de temporadas (D12).
- Detectar datos atrasados de Leetify (D17).
- Un tope global de consultas a Leetify por instancia (D19).
- Scraping, bots de Steam o lectura de demos (RNF-3).

## Criterios de finalización
- [ ] RF-1 a RF-23 cubiertos por pruebas en verde, sin red (RNF-1).
- [ ] Recorrido manual en desarrollo local con una cuenta de CS2 real que tenga rango Premier
      en Leetify: verificar, ver el rango con "Datos de Leetify" y su enlace, resincronizar y
      ver la cuenta en coincidencias.
- [ ] Recorrido manual con una cuenta sin perfil en Leetify: "sin rango Premier", fuera de
      coincidencias y mensaje de RF-10 en Coincidencias de CS2.
- [ ] Modo simulado: ningún rango atribuido a Leetify (RF-23).
- [ ] Revisados los términos de Leetify: la atribución de RF-6 basta, o se abrió un cambio de
      requisitos (D25).

## Impacto en otras specs y documentos
Los archivos de otras specs no se editan: cada excepción es un RF de esta spec (D8).
- **Constitución, principio 5**: ampliado el 2026-11-18 (D6).
- **Spec 004**: en los datos reales Gold no tiene tope (RF-4).
- **Spec 005**: las cuentas de CS2 verificadas sin rango Premier o con el rango no disponible
  no participan en coincidencias (RF-7, RF-8), y Coincidencias de CS2 muestra el mensaje de
  RF-10.
- **Spec 012**: un perfil inexistente en Leetify no es una cuenta inexistente (RF-2, en lugar
  de su RF-21); un fallo de Leetify no hace fallar la resincronización si Steam respondió
  (RF-16 y RF-17, en lugar de su RF-19).
- **Spec 013**: su RF-13 y su "Fuera de alcance" dejan de regir para el rango y el historial
  de CS2; las partidas siguen simuladas. Se agrega el texto de RF-21 junto a "Verificar con
  Steam" y un segundo aviso posible al volver de Steam (RF-15).
- **`PRODUCT.md`**: "Evidence on Hand" y "Capabilities" se actualizan al implementar esta
  spec.

## Dudas abiertas
Ninguna. Las dos dudas abiertas se cerraron en la clarificación del 2026-11-18 (D24, D25).
