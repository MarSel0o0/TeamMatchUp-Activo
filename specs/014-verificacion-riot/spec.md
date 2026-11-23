# Spec 014 — Verificación de cuentas de League of Legends con Riot ID
Estado: implementada (2026-11-19), tras su validación (`validation.md`: revisión visual del
reviewer aprobada tras una corrección y recorrido manual con cuenta real de LoL OK); aprobada el
2026-11-18, tras la clarificación
Historial: pedida el 2026-11-04; primera clarificación (D3 a D24) y respuestas a sus dudas
(D25 a D36) el 2026-11-18; segunda revisión del QA (bloqueantes B1 a B5 y hallazgos menores)
resuelta el 2026-11-18 con D37 a D66; las dudas que dejó esa pasada se cerraron el
2026-11-18 con D67 a D75; las 4 incoherencias que señaló esa pasada, el 2026-11-18 con
D76 a D79, y las 2 que señaló la aplicación de D76 a D79, el 2026-11-18 con D80 y D81. La
tercera revisión del QA ("SPEC LISTA", 0 bloqueantes y unos 22 menores) se resolvió el
2026-11-18 con D82 a D101, y los 3 puntos que dejó marcados esa pasada, el 2026-11-18 con
D102 a D104, tras lo cual el usuario aprobó la spec (2026-11-18).

## Contexto y objetivo
Hoy un jugador de LoL escribe su Riot ID a mano y recibe rango, historial y partidas
simulados (spec 004). Esta spec le permite **verificar** su cuenta: demuestra que la controla
poniéndose en el cliente de LoL un ícono de invocador que TeamMatchUp le indica, y la
plataforma lo comprueba con Riot Games. Desde entonces el rango, el historial, las últimas
partidas y el perfil de la cuenta son datos reales de Riot (spec 012).

El inicio de sesión oficial de Riot (Riot Sign On) solo se entrega a productos aprobados por
Riot, así que no se usa. El ícono es una prueba de control conocida: solo quien tiene acceso a
la cuenta puede cambiar su ícono.

- Depende de: spec 012 (cuenta verificada, origen por bloque, exclusividad, resincronización y
  fuente no disponible; implementada y validada el 2026-11-18) y specs 002 a 005. Toma como
  modelo la spec 013 (verificación con Steam) donde se dice "como la 013"; cada requisito
  que la imita cita el RF de la 013 correspondiente.
- Origen: conversación con el usuario del 2026-11-04; clarificación del 2026-11-18 (39
  hallazgos del QA, decididos uno por uno por el usuario); respuestas del usuario a las 12
  dudas abiertas que dejó la primera corrección (2026-11-18); segunda revisión del QA (5
  bloqueantes y unos 30 menores), resuelta con las recomendaciones del coordinador que el
  usuario aprobó todas ("Sí, todas", 2026-11-18); respuestas a las 7 dudas abiertas y a las 2
  interpretaciones que dejó esa pasada, también con las recomendaciones del coordinador
  aprobadas todas ("Sí, todas", 2026-11-18); ajustes a las 4 incoherencias que señaló la
  aplicación de D67 a D75, con las recomendaciones del coordinador aprobadas por el usuario
  (2026-11-18); ajustes a las 2 incoherencias que señaló la aplicación de D76 a D79, también
  con las recomendaciones del coordinador aprobadas por el usuario (2026-11-18); tercera
  revisión del QA ("SPEC LISTA", 0 bloqueantes, unos 22 menores), resuelta con las 20
  recomendaciones del coordinador que el usuario aprobó (2026-11-18; D82 a D101); cierre de
  las 3 dudas y las 2 interpretaciones que dejó esa pasada, con las recomendaciones del
  planner aprobadas por el usuario, y aprobación de la spec (2026-11-18; D102 a D104).

### Decisiones del usuario
- **2026-11-04 — Clave de desarrollo de Riot.** Se usa la clave de desarrollo, que caduca cada
  24 horas y se renueva a mano cuando caduca. Límites conocidos: 20 consultas por segundo y
  100 cada 2 minutos. El equipo acepta que los términos de Riot no admiten un producto público
  con esa clave (spec 012, decisión P1).
- **2026-11-04 — Ícono de inicio.** El ícono pedido es siempre uno de los íconos de inicio que
  toda cuenta de LoL tiene desde que se crea, para que cualquier jugador pueda ponérselo sin
  comprarlo ni desbloquearlo, y nunca el que el jugador ya tiene puesto. Precisada por D5 y
  D25.
- **2026-11-04 — Datos reales de Riot.** Rango de la cola clasificatoria Solo/Dúo (tier,
  división y LP), historial de rango, últimas partidas y perfil (nivel e ícono).
- **2026-11-04 — D1. Cuenta verificada sin clasificar.** Queda fuera de las coincidencias de
  LoL y su perfil dice "sin clasificar". RF-13. Precisada por D13 y D33.
- **2026-11-04 — D2. Partidas.** Solo las clasificatorias Solo/Dúo, porque son las que
  explican el rango. RF-11.

### Decisiones de la clarificación (2026-11-18)
El número entre paréntesis es el del hallazgo del QA (D3 a D24), el de la duda abierta
respondida (D25 a D36), el del bloqueante de la segunda revisión del QA (D37 a D41: B1 a B5)
o "M" para sus hallazgos menores (D42 a D66), o "A" para las dudas abiertas y las
interpretaciones que dejó esa pasada (D67 a D75), o "I" para las incoherencias que señaló la
aplicación de D67 a D75 (D76 a D79) y la de D76 a D79 (D80 y D81), o "R3" para los
hallazgos menores de la tercera revisión del QA (D82 a D101), o "C" para las dudas abiertas
que dejó la aplicación de D82 a D101 (D102 a D104). D37 a D104 son recomendaciones que el
usuario aprobó el 2026-11-18.
- **D3. Formato del Riot ID (1).** Al pedir el desafío, la 014 valida con las reglas reales de
  Riot (nombre de 3 a 16 caracteres sin '#', etiqueta de 3 a 5 alfanuméricos) y responde 400
  sin consultar a Riot. La vinculación manual de la spec 004 no cambia. RF-18. Precisada por
  D44.
- **D4. "Existe en esa región" (2).** Riot encuentra el Riot ID (cuenta global) y la cuenta
  tiene perfil de LoL en la plataforma de esa región, según una tabla fija; si falla
  cualquiera de las dos, 404. Definiciones, RF-3.
- **D5. Elección del ícono (3, 22).** Uniforme entre los íconos de inicio permitidos; un
  desafío nuevo nunca repite el ícono del desafío que reemplaza ni el que la cuenta tiene
  puesto en Riot; mientras haya un desafío abierto para una cuenta de Riot, ningún otro
  desafío para esa misma cuenta recibe el mismo ícono. RF-19. Precisada por D25 y D26.
- **D6. Pantalla del desafío (4).** Imagen del ícono (o su número si no carga), cuenta atrás
  mm:ss y tres pasos fijos. RF-2. Precisada por D42 (botón "Ya puse el ícono" y qué pasa a
  las 00:00).
- **D7. Ya verificada (5).** Pedir un desafío teniendo ya una cuenta de Riot verificada da
  409; la interfaz no muestra la acción de verificar. RF-6, RF-39.
- **D8. Éxito (6, 17).** Como la 013: 200 con la cuenta verificada y sus datos; aviso
  "Cuenta de Riot verificada" y vuelta al perfil. Si Riot confirma el ícono pero falla la
  lectura de datos, la cuenta queda verificada con datos pendientes, 200 con aviso, y no
  cuenta para la espera (como la 013, RF-12). RF-7, RF-27. **Corregida por D38**: el fallo
  parcial se trata por bloques (la versión anterior dejaba pendientes todos los datos).
  Precisada por D53 (qué cuenta para la espera).
- **D9. Intentos (7, 15, 25, 32).** 10 confirmaciones contadas por desafío; la 11.ª recibe
  429. Cuenta toda confirmación que llega a consultar a Riot (también las que terminan en 400,
  409 o 503); no cuenta lo que se rechaza antes. Un ícono que no coincide gasta un intento y
  no alarga el plazo. RF-8, RF-10, RF-25, RF-37. Precisada por D55 (el 404 de la
  confirmación también cuenta).
- **D10. Partidas (8, 18).** Formato de la spec 004 (fecha dd/mm/aaaa, duración en minutos
  enteros, resumen "<campeón> · K/D/A" con el campeón como lo da Riot); los remakes se
  descartan. La variación de LP por partida se calcula solo cuando es fiable; si no, "—".
  RF-11, RF-12, RF-30. Precisada por D35, D37 y D47. **Corregida por D39** en el punto 8:
  los remakes ya no "no ocupan sitio entre las 20"; se leen las 20 más recientes y se
  descartan los remakes, así que pueden mostrarse menos de 20.
- **D11. LP sin tope en datos de Riot (19).** LP ≥ 0 sin tope superior; el tope de 999 sigue
  para la carga manual. RF-31. Precisada por D62 (LP negativos = fallo de Riot).
- **D12. Historial (10, 11).** Se construye con las lecturas propias (spec 012, RF-9); pasar
  a "sin clasificar" no añade punto. RF-32. Precisada por D52.
- **D13. Sin clasificar al buscar (9, 10).** Buscar candidatos de LoL con una cuenta
  verificada sin clasificar da 409 y la interfaz muestra el aviso. "Temporada vigente" = lo
  que Riot devuelve ahora como Solo/Dúo. RF-13, RF-33. Precisada por D57 y D61.
- **D14. Riot ID (12, 28a, 30).** Se guarda y muestra como lo devuelve Riot; la unicidad no
  distingue mayúsculas. El desafío se ata a la cuenta interna de Riot, no al texto del Riot
  ID. Al resincronizar con un Riot ID nuevo se aplica la exclusividad de la spec 012
  (RF-11) y el Riot ID antiguo queda libre. RF-7, RF-14, RF-34.
- **D15. Persistencia y ciclo de vida del desafío (13, 26, 27).** Los desafíos se guardan y
  sobreviven a un reinicio con su vencimiento original; a los 10:00 exactos ya están
  vencidos; borrar la cuenta de TeamMatchUp los borra; vincular o desvincular LoL a mano con
  un desafío abierto lo anula. RF-9, RF-28, RF-29. Precisada por D45 (retención), D59 (otros
  casos que anulan) y D63 (estado en memoria).
- **D16. Dónde se ve (14a a 14d).** Como Steam en la 013: no hace falta LoL vinculado a mano;
  marca, nivel e ícono como en la 013; texto junto a "Resincronizar" como el RF-25 de la 013.
  RF-39 a RF-41. **Corregida por D32**: la versión anterior ponía el botón solo en
  Configuración → Cuentas vinculadas y un texto "Datos de Riot Games · actualizados hace X"
  que la 013 no tiene. Precisada por D50 (coincidencias e ícono que no carga) y D75.
- **D17. Limitador propio (15).** 100 consultas cada 2 minutos por instancia; al llegar al
  límite, 503 al momento sin consultar a Riot ni cambiar nada, y no cuenta como intento.
  RF-37. **Corregida por D40**: el limitador reserva antes de empezar todas las consultas de
  la operación y espacia las consultas para no pasar de 20 por segundo. Precisada por D69
  (las reservadas que no se usan se liberan).
- **D18. Presupuesto de consultas (16).** Tope de 35 consultas por verificación completa.
  RNF-1. Precisada por D39 y D40 (el tope se mantiene).
- **D19. Orden de errores (20, 21, 23, 35).** Primero lo que no requiere a Riot, después lo
  que sí. El desafío se busca siempre entre los del usuario de la sesión (constitución,
  principio 5): uno ajeno responde 404 como si no existiera y no cuenta como intento.
  RF-22, RF-23, RF-26. Precisada por D27, D28, D41, D54, D55, D58, D60, D61, D68, D70 y
  D74.
- **D20. Límite de desafíos (24).** Máximo 5 desafíos pedidos por usuario cada hora; el 6.º
  recibe 429 con el tiempo de espera. RF-21. Precisada por D34 y D45.
- **D21. Región (28b, 29).** LoL vinculado a mano en otra región: 409 antes de consultar a
  Riot. Cuenta verificada transferida a otra región: 404 al resincronizar, como la spec 012
  (RF-21); para cambiarla, desvincular y volver a verificar. RF-20, RF-35. Precisada por D49.
- **D22. Disponibilidad de Riot (31, 33, 34).** Sin clave de Riot: 503 en la API. Nunca se
  simula nada de Riot. Todo otro fallo de Riot es 503 como RF-16, con un tiempo de espera
  fijo por consulta (spec 012, RNF-5). RF-16, RF-38, RF-42, RNF-6. **Corregida por D32** en
  lo que se ve: sin clave el botón no se muestra y en modo simulado se ve desactivado (la
  versión anterior decía lo contrario). **Corregida por D57**: el 503 sin clave solo se
  aplica a las operaciones que consultan a Riot. Precisada por D56 y D62.
- **D23. Criterios y dependencias (36, 38).** Backend con pruebas sin red y dobles de Riot;
  interfaz con build, typecheck, lint y comprobación manual en Chrome DevTools; RF-17 con dos
  arranques y claves de prueba falsas. Sin dependencias nuevas. RNF-5, criterios. Precisada
  por D65.
- **D24. Textos de Riot sin traducir (39).** Los niveles de rango, la cola y los campeones se
  muestran tal como los entrega Riot (por ejemplo, GOLD o RANKED_SOLO_5x5). RF-36.
  Precisada por D36 (lo que se muestra frente a lo que se guarda). **Corregida por D48**: la
  cola no se muestra en ninguna pantalla. Precisada por D73 (sin división en Master,
  Grandmaster y Challenger).
- **Impacto (37).** Como la 013, los ajustes a otras specs quedan en "Impacto en otras
  specs", sin editar esos archivos.
- **D25. Número de íconos de inicio (1).** Son 29 íconos, del 0 al 28. Definiciones, RF-19.
- **D26. Sin íconos libres (2).** Si tras las exclusiones de D5 no queda ningún ícono libre,
  429 con el tiempo que falta para que venza el desafío abierto más antiguo de esa cuenta de
  Riot. Se comprueba después de consultar a Riot (hace falta el ícono actual); no crea
  desafío ni cuenta para el límite de 5 por hora. RF-43.
- **D27. Orden al pedir el desafío (3a, 3b).** Sin Riot: 400 formato → 409 ya tienes una
  verificada → 409 región distinta → 429 cinco por hora → 409 otro la verificó (texto del
  Riot ID, sin distinguir mayúsculas) → 503 sin clave → 503 limitador. Con Riot: 503 fallo
  de Riot → 404 no existe → 409 otro la verificó (cuenta interna de Riot) → 429 sin íconos
  libres. "Otro la verificó" se comprueba dos veces. RF-5, RF-22. Precisada por D58 (409 de
  un pedido simultáneo) y D70 (su posición, justo después del 400 de formato).
- **D28. Orden al confirmar (4).** Sin Riot: 404 desafío ajeno o inexistente → 409 ya se está
  comprobando → 429 intentos gastados → 400 vencido → 409 otro la verificó → 503 sin clave →
  503 limitador. Con Riot (confirmación contada): 503 → 400 ícono distinto. RF-26.
  **Corregida por D41, D54 y D55**: se añaden el 409 "este desafío ya se completó" después
  del 404, y después de consultar a Riot el 404 de cuenta que ya no existe y el 409 de una
  verificación simultánea. Precisada por D74 (posición del 404 de cuenta desaparecida).
- **D29. Tiempo de espera por consulta (5).** 8 segundos, como la spec 012 (RNF-5). RNF-6.
- **D30. Textos que faltaban (6).** Los redacta el planner con el estilo de la spec 012
  (RNF-4) y el usuario los revisa al aprobar la spec: 400 de formato (RF-18), 429 por hora
  (RF-21), 429 sin íconos libres (RF-43), 404 de desafío (RF-23), aviso y bloques de datos
  pendientes (RF-27), 404 de cuenta transferida de región (RF-35). La espera usa el formato
  de la spec 012 (RF-16: minutos redondeados hacia arriba, "1 minuto" en singular). El texto
  "hace X" ya no hace falta (D32). El 400 de RF-8 sustituye al texto anterior ("el ícono de
  tu perfil todavía no coincide con el pedido"). Precisada por D41, D58, D68 y D72 (textos
  nuevos).
- **D31. Estilo de los mensajes (7).** Todos los textos de la API de esta spec, incluidos los
  ya decididos, van en español, en minúscula inicial y sin punto final (spec 012, RNF-4); los
  nombres propios (Riot Games, League of Legends, Riot ID, LoL) y los rótulos entre « »
  conservan su forma (spec 004, convenciones; spec 005, DP5-17). El 503 por fallo de Riot
  usa la forma de la spec 012, RF-19. Los textos de interfaz (avisos y botones) pueden llevar
  mayúscula, como en las specs 012 y 013. RF-6, RF-8, RF-16, RF-20, RF-25, RF-33.
- **D32. "Como la 013", según lo que la 013 dice de verdad (8).** La acción de verificar se
  ofrece donde la 013 ofrece la de Steam (RF-2 de la 013: fila de la cuenta sin verificar en
  el perfil y en Configuración, y sobre el formulario de vínculo si no hay cuenta); sin
  clave no se ofrece (RF-22 de la 013) y en modo simulado se ve desactivada (RF-21 de la
  013); el texto junto a "Resincronizar" es el del RF-25 de la 013 adaptado a Riot. RF-38,
  RF-39, RF-41, RF-42.
- **D33. Datos pendientes en coincidencias (9).** Una cuenta verificada con datos pendientes
  (RF-27) cuenta como sin clasificar en las coincidencias hasta que se lean sus datos.
  RF-44. Precisada por D38 (pendientes por bloque), D67 (solo cuenta el bloque de rango) y
  D80 (el perfil pendiente tampoco saca la cuenta).
- **D34. Qué cuenta para el límite por hora (10).** Solo los desafíos creados, no las
  peticiones rechazadas. RF-21.
- **D35. Duración en minutos enteros (11).** La spec 004 no fija redondeo (sus duraciones
  simuladas ya son enteras), así que se redondea al minuto más cercano, con las mitades hacia
  arriba (como la tasa de victorias de la spec 004, DP-11). RF-12.
- **D36. Textos de Riot: lo que se muestra y lo que se guarda (12).** En la interfaz, los
  niveles de rango, la cola y los campeones se muestran tal como los entrega Riot; por dentro,
  el tier se normaliza a la escala de la spec 004 ("Gold"…) para guardarlo y calcular la
  distancia de rango. El usuario decidió mostrar los textos sin traducir sabiendo que choca
  con el principio 6 de la constitución (ver "Conflicto con la constitución"). RF-36.
  **Corregida por D48**: se guardan el tier y la división tal como los da Riot y además el
  tier normalizado; la cola no se muestra.
- **D37. Variación de LP fiable (B1).** Una variación ya asignada a una partida no se
  recalcula ni se borra en lecturas posteriores. Los remakes no cuentan como "partida nueva"
  para la regla de "exactamente una partida nueva". En Master, Grandmaster y Challenger,
  "misma división" significa "mismo tier". RF-12, RF-30. Precisada por D78 (lecturas
  parciales) y D81 (el "—" no es una variación asignada).
- **D38. Fallo parcial por bloques (B2).** Como la 013 (RF-11): lo que se leyó bien se guarda
  y cada bloque que falló muestra "Datos pendientes de Riot Games". Si falla la consulta del
  Riot ID vigente, se guarda el Riot ID que se usó al pedir el desafío. RF-27. Precisada por
  D67 (coincidencias), D68 (resincronización), D72 y D79 (aviso) y D80 (perfil pendiente y
  aviso). **Corregida por D82** (el fallo del Riot ID vigente no deja datos pendientes ni
  aviso) y D83 (el fallo de una partida solo omite esa partida); precisada por D86 (qué Riot
  ID se guarda).
- **D39. Las 20 partidas más recientes (B3).** Se leen las 20 partidas Solo/Dúo más recientes
  y se descartan los remakes, así que pueden mostrarse menos de 20. Se mantiene el tope de 35
  consultas. Corrige el punto 8 de D10. RF-11, RNF-1.
- **D40. Reserva del limitador (B4).** Antes de empezar una operación, el limitador propio
  reserva todas las consultas que va a necesitar (una confirmación: 1 más las de la lectura,
  unas 24). Sin hueco: 503 del limitador sin consultar a Riot y sin contar como intento. Si
  después algo falla igualmente, se aplica RF-27. El limitador espacia las consultas para no
  pasar de 20 por segundo (esperas de menos de 1 s) y respeta también las 100 cada 2
  minutos. RF-37, RNF-1. Precisada por D69. **Corregida por D84** (reservas exactas, sin
  "unas") y precisada por D85 (ventanas deslizantes).
- **D41. Desafío ya completado (B5).** Confirmar un desafío que ya se cerró con éxito
  responde 409 "este desafío ya se completó" y no cuenta como intento; va después del 404 de
  desafío ajeno o inexistente y antes de consultar a Riot. RF-48, RF-26.
- **D42. Interfaz del pedido (M).** Formulario con Riot ID y región, rellenado con los de la
  cuenta manual de LoL si existe; botón "Ya puse el ícono" para confirmar; errores junto al
  formulario o al botón, con el texto de la API; a las 00:00 el botón se desactiva y aparece
  "Pedir otro desafío". RF-2, RF-46, RF-47. Precisada por D71 (qué hace "Pedir otro
  desafío"), D77 (dónde se muestran sus errores), D99 (desafío anulado y botón "Volver"),
  D100 (cuenta atrás) y D101 (recarga con el desafío vencido).
- **D43. Recuperar el desafío abierto (M).** Una operación devuelve el desafío abierto del
  usuario de la sesión (o ninguno) para recuperarlo al recargar la página; no consulta a Riot
  ni cuenta para ningún límite. RF-45. Precisada por D76 (devuelve también el Riot ID y la
  región), D86 (qué Riot ID) y D100 (segundos que le quedan).
- **D44. Formato del Riot ID como la 004 (M).** Se recortan los extremos antes de validar;
  los caracteres se cuentan en unidades UTF-16; el nombre excluye LF, CR, U+2028 y U+2029;
  la etiqueta, solo letras y dígitos ASCII; un campo ausente o que no es texto da el mismo
  400. Se mantienen los límites de D3. Definiciones, RF-18.
- **D45. Retención de los desafíos (M).** Se borran 24 h después de vencer, anularse o
  cerrarse, lo que cubre el cómputo de 1 h de RF-21. RF-28. Precisada por D87 (lo que
  ocurra primero).
- **D46. Respuesta al crear el desafío (M).** 201 con su identificador, el número de ícono y
  el vencimiento, sin el identificador interno de Riot. RF-1. Precisada por D100 (también
  los segundos que le quedan).
- **D47. Zona horaria de las partidas (M).** La spec 004 no fija una zona horaria para
  mostrar fechas (las entrega en UTC, su RNF-3), así que la fecha de una partida se muestra
  en la zona horaria del navegador. RF-12.
- **D48. Tier y división tal como los da Riot (M).** Se guardan el tier y la división como los
  da Riot, para mostrar "GOLD II", y además el tier normalizado para los cálculos. La cola no
  se muestra en ninguna pantalla. RF-36. Precisada por D73.
- **D49. Región del 409 (M).** El `<región>` de RF-20 es la región de la cuenta manual. RF-20.
- **D50. Coincidencias e ícono (M).** En coincidencias solo se muestra la marca (con el
  origen), como la 013 (RF-15); el nivel y el ícono, no. Si la imagen del ícono de invocador
  no carga, no se muestra nada en su lugar. RF-40. Confirmada por D75.
- **D51. "Otro la verificó" por texto, sin región (M).** La comparación por texto de RF-5
  solo mira el Riot ID, sin distinguir mayúsculas y sin la región. RF-5.
- **D52. Volver a tener rango (M).** Si una cuenta vuelve a tener rango y es el mismo del
  último punto del historial, no se añade punto. RF-32.
- **D53. Verificación y espera mínima (M).** Una verificación con todos los datos leídos
  cuenta como "última resincronización exitosa" para la espera mínima de la 012; una con
  datos pendientes, no. RF-7, RF-27. Precisada por D68 (una resincronización parcial
  tampoco cuenta) y D82 (basta con el rango, las partidas y el perfil leídos, aunque falle
  la consulta del Riot ID vigente).
- **D54. Orden tras consultar a Riot al confirmar (M).** 503 → 400 ícono distinto → 409 otro
  la verificó al mismo tiempo (con el 404 de D55 entre el 503 y el 400). Se ajusta la
  definición de "Confirmación contada". RF-26. Confirmada por D74.
- **D55. Cuenta que desaparece durante la confirmación (M).** Si Riot ya no encuentra la
  cuenta o la cuenta no tiene perfil en la región: 404 con el texto de RF-3, cuenta como
  intento y el desafío se anula. RF-50, RF-26. Precisada por D95 (también si Riot no la
  encuentra al leer el Riot ID vigente tras confirmar el ícono).
- **D56. Fallo de Riot y contador (M).** RF-16 conserva cuentas y desafíos "sin cambios,
  salvo el contador de intentos". RF-16.
- **D57. Alcance del 503 sin clave (M).** Solo en las operaciones que consultan a Riot. RF-33
  responde 409 aunque no haya clave, y recuperar el desafío (RF-45) tampoco depende de la
  clave. RF-38.
- **D58. Peticiones simultáneas del mismo usuario (M).** Se atienden de una en una. Un pedido
  de desafío mientras hay otro pedido en marcha o una confirmación recibe 409 "ya se está
  comprobando" y no cuenta para el límite por hora. RF-25, RF-49. **Corregida por D90**:
  "de una en una" cubre pedir, confirmar y resincronizar.
- **D59. Más casos que anulan el desafío (M).** Editar la región de la cuenta manual de LoL
  (la spec 004 lo permite, RF-8) o que esa cuenta se desvincule sola por la spec 012 (RF-11)
  también anula el desafío abierto. RF-29.
- **D60. Orden al resincronizar (M).** 503 sin clave → 429 espera mínima (spec 012, RF-16) →
  503 limitador → 503 Riot → 404 de RF-35. RF-51. **Corregida por D68**: las lecturas
  parciales ya no "siguen RF-27"; tienen su propio requisito (RF-53).
- **D61. Orden del 409 de RF-33 (M).** Va después de los 400 de validación de los filtros de
  la spec 005. RF-33.
- **D62. Datos raros de Riot (M).** LP negativos, campos que faltan, división o resultado
  desconocidos: fallo de Riot (503, o RF-27 por bloque si el ícono ya se confirmó). Se
  mantiene que un tier fuera de la escala vale 0 al normalizar. RF-52, RF-36. Precisada por
  D68 (al resincronizar, el bloque afectado sigue RF-53) y D80 (al verificar, también el
  perfil puede quedar pendiente). **Corregida por D83** (una partida con datos raros se
  omite), **D94** (al confirmar, el 503 solo si no se puede leer el ícono) y **D96** (una
  división desconocida no es un fallo).
- **D63. Estado "ya se está comprobando" en memoria (M).** Vive solo en la memoria de la
  instancia y se pierde al reiniciar; el desafío sigue abierto. RF-25, RF-28, RF-49.
- **D64. Constitución, principio 5 (M).** RNF-4 y RF-17 dicen explícitamente que la clave de
  Riot va en `.env`.
- **D65. Constitución, principio 4 (M).** Criterios de finalización para RF-15, la parte de
  backend de RF-12, RF-45, RNF-1, RNF-3, RNF-4 y RNF-6.
- **D66. Estado (M).** La spec queda en borrador, revisada tras la clarificación, sin decir
  "aprobada". **Superada el 2026-11-18**: con D102 a D104 aplicadas, el usuario aprobó la
  spec.
- **D67. Datos pendientes y coincidencias (A).** Una cuenta verificada sale de las
  coincidencias de LoL solo si le falta el bloque de rango. Si faltan otros bloques
  (partidas, perfil), sigue en las coincidencias. Precisa D33. RF-44. Precisada por D80 (el
  perfil solo queda pendiente por datos que no se pueden interpretar, RF-52, y tampoco saca
  la cuenta de las coincidencias).
- **D68. Resincronización parcial (A).** Si falla la consulta de la cuenta o del perfil en la
  plataforma, se aplica RF-51 (404 o 503) y no cambia nada. Si solo fallan algunos bloques,
  los que se leyeron bien se actualizan y los que fallaron conservan sus datos anteriores
  (como la spec 012, RF-19), no pasan a "Datos pendientes de Riot Games"; se responde con un
  aviso de que algunos datos no se pudieron actualizar. Una resincronización parcial no
  cuenta como la última resincronización exitosa para la espera mínima. Corrige D60 y
  precisa D53 y D62. RF-51, RF-53, RF-52, RF-16.
- **D69. Reserva del limitador (A).** Las consultas reservadas que no se usan se liberan al
  terminar la operación, con éxito o con error. Precisa D40. RF-37.
- **D70. Posición del 409 de un pedido simultáneo (A).** En RF-22, el 409 "ya se está
  comprobando" (RF-49) va justo después del 400 de formato, como se dejó provisionalmente.
  Precisa D27 y D58. RF-22.
- **D71. "Pedir otro desafío" (A).** Pide directamente un desafío nuevo con el mismo Riot ID
  y la misma región; cuenta para el límite de 5 por hora (si el desafío se crea, RF-21) y
  sigue el orden de errores normal de RF-22. Precisa D42. RF-2. Precisada por D76 y D77.
- **D72. Aviso de RF-27 (A).** Si faltan todos los bloques que pueden quedar pendientes
  (rango e historial, partidas y perfil), el aviso dice "no pudimos leer sus datos" (texto
  actual); si faltan solo algunos, "no pudimos leer algunos de sus datos". Precisa D38. RF-27.
  **Corregida por D79 y D80**: "todos" son el bloque de rango (con historial) y el de
  partidas, falte o no el perfil; cualquier otra combinación con al menos un bloque
  pendiente, incluido el perfil solo, usa "algunos de sus datos".
- **D73. Master, Grandmaster y Challenger (A).** En estos tiers se muestra solo el tier
  ("MASTER"), sin la división "I" que manda Riot; en los demás, tier y división ("GOLD II").
  Precisa D48. RF-36.
- **D74. Posición del 404 de cuenta desaparecida (A).** Se confirma la interpretación del
  planner: en RF-26, el 404 de RF-50 va entre el 503 de fallo de Riot y el 400 de ícono
  distinto. Confirma D54 y D55. RF-26.
- **D75. Marca en coincidencias (A).** Se confirma la interpretación del planner: en las
  coincidencias, la marca "Verificada con Riot Games" va junto a la etiqueta de origen, como
  la 013 (RF-15). Confirma D50. RF-40.
- **D76. Recuperar el desafío con su Riot ID y su región (I).** RF-45 devuelve también el
  Riot ID y la región del desafío, además del identificador, el número del ícono y el
  vencimiento; sigue sin devolver el identificador interno de Riot (RNF-3). Así "Pedir otro
  desafío" (RF-54) funciona también tras recargar la página. Precisa D43 y D71. RF-45,
  RF-54, RNF-3.
- **D77. Errores de "Pedir otro desafío" (I).** Los errores de "Pedir otro desafío"
  (incluido el 429 de cinco por hora) se muestran junto a ese botón, en la pantalla del
  desafío, con el texto de la API; no junto al formulario de RF-46. Precisa D42 y D71. RF-47,
  RF-54.
- **D78. Variación de LP con lecturas parciales (I).** La "lectura anterior" de RF-30 es la
  última lectura en la que se leyeron bien el bloque de rango y el de partidas. La variación
  solo se calcula si la lectura actual también leyó bien esos dos bloques; si no, las
  partidas nuevas de esa lectura quedan sin variación ("—"). Una variación ya asignada nunca
  se recalcula (D37). Precisa D37. Definiciones, RF-30. Precisada por D81 (una partida con
  "—" de una lectura no completa puede recibir variación después) y D102 (una lectura con
  alguna partida omitida tampoco es completa).
- **D79. Aviso de RF-27 según rango y partidas (I).** "Faltan todos los bloques" significa
  que faltan el bloque de rango (con historial) y el de partidas. Si falta solo uno de esos
  dos, se usa el aviso de "algunos de sus datos". Corrige D72. RF-27. **Corregida por D80**:
  la versión anterior decía que el perfil no cuenta "porque se lee siempre al confirmar el
  ícono"; el perfil sí puede quedar pendiente (RF-52) y, si es el único bloque pendiente, el
  aviso es el de "algunos de sus datos".
- **D80. Perfil pendiente (I).** El bloque de perfil (nivel e ícono) puede quedar en "Datos
  pendientes de Riot Games" al verificar, solo cuando Riot entrega en el perfil datos que no
  se pueden interpretar o que faltan (RF-52). Avisos de RF-27: "no pudimos leer sus datos"
  solo cuando faltan el bloque de rango (con historial) y el de partidas, falte o no el
  perfil; "no pudimos leer algunos de sus datos" en cualquier otra combinación con al menos
  un bloque pendiente, incluido el caso de que solo falte el perfil. El perfil pendiente no
  saca la cuenta de las coincidencias; solo el rango lo hace (D67). Corrige D79 y precisa
  D38, D62, D67 y D72. Definiciones, RF-27, RF-44, RF-52. Precisada por D92 (el ícono se
  muestra aunque el perfil quede pendiente) y D94.
- **D81. El "—" no es definitivo (I).** Una partida que quedó sin variación ("—") porque
  apareció en una lectura que no era completa de rango y partidas puede recibir variación en
  una lectura completa posterior, si cumple la regla de RF-30 respecto de la lectura anterior
  (D78): ser la única partida nueva y sin cambio de división (o de tier en Master,
  Grandmaster y Challenger). Lo que nunca se recalcula es una variación ya asignada (B1,
  D37); "—" no cuenta como variación asignada. Precisa D37 y D78. Definiciones, RF-30.
- **D82. Fallo solo del Riot ID vigente (R3).** Si al verificar solo falla la consulta del
  Riot ID vigente (por un motivo que no es "no encontrado", D95), se guarda el Riot ID del
  desafío (D86) y no sale ningún aviso. La identidad no es un bloque que pueda quedar
  pendiente. La verificación cuenta para la espera mínima si se leyeron bien el rango, las
  partidas y el perfil. Corrige D38 y precisa D53. Definiciones, RF-7, RF-27.
- **D83. Fallo de una partida (R3).** Si falla la consulta del detalle de una partida, o
  trae datos que no se pueden interpretar (RF-52), se omite solo esa partida. El bloque de
  partidas queda pendiente (o conserva sus datos al resincronizar) solo si falla la consulta
  de la lista. Corrige D38 y D62. RF-11, RF-27, RF-52, RF-53. Precisada por D102 (a efectos
  de RF-30, una lectura con alguna partida omitida no es completa).
- **D84. Reservas exactas del limitador (R3).** Pedir el desafío reserva 2 consultas;
  confirmar, 24; resincronizar, 24. Corrige D40. RF-37, RNF-1.
- **D85. Ventanas deslizantes (R3).** Los límites de 100 consultas cada 2 minutos y de 20
  por segundo se cuentan en ventanas deslizantes. Precisa D17 y D40. RF-37.
- **D86. Riot ID del desafío (R3).** "El Riot ID que se usó al pedir el desafío" es la forma
  que devolvió Riot al pedirlo, guardada con el desafío, no el texto que escribió el
  usuario; así se cumple el principio 5 de la constitución (RF-34). Precisa D38 y D76.
  Definiciones, RF-7, RF-27, RF-45.
- **D87. Retención desde el cierre (R3).** Las 24 h de RF-28 se cuentan desde que el desafío
  deja de estar abierto: vence, se anula o se cierra, lo que ocurra primero. Precisa D45.
  RF-28.
- **D88. Criterios (R3).** Se añade un criterio para RNF-5 (las dependencias de los
  `package.json` del backend y del frontend no cambian) y el criterio de backend dice "sin
  red ni clave real" (RNF-2). Criterios.
- **D89. Desvinculación por la resincronización de otro (R3).** Si la resincronización de
  otro usuario desvincula la cuenta manual de LoL de un usuario (RF-14), también se anula el
  desafío abierto de ese usuario. Precisa D59. RF-29.
- **D90. Operaciones de una en una (R3).** Pedir el desafío, confirmar y resincronizar la
  cuenta verificada con Riot de un mismo usuario se atienden de una en una: mientras una
  está en curso, otra de ellas recibe 409 "ya se está comprobando" (sin cola) y no cuenta
  para ningún límite. Quedan fuera la recuperación del desafío (RF-45), la vinculación
  manual y las coincidencias. Cubre dos resincronizaciones simultáneas. Corrige D58. RF-25,
  RF-49, RF-22, RF-26, RF-51.
- **D91. 409 "otro la verificó" al confirmar (R3).** Anula el desafío. Después de consultar a
  Riot, se comprueba justo después de ver que el ícono coincide y antes de leer los datos.
  Precisa D54. RF-24, RF-26. **Interpretación confirmada por el usuario (2026-11-18, con
  D102 a D104)**: el 409 anula el desafío también cuando sale antes de consultar a Riot
  (RF-26, paso 1), aunque esa confirmación no cuente como intento.
- **D92. Ícono con el perfil pendiente (R3).** Si el perfil queda pendiente por un nivel que
  no se puede interpretar, el ícono de invocador se muestra igual, porque se leyó y se
  confirmó. Precisa D80. RF-27, RF-40.
- **D93. Imágenes de Data Dragon (R3).** Las carga el navegador directamente, con la versión
  más reciente de Data Dragon; no cuentan como consultas a Riot para RF-37 ni RNF-1. RF-2,
  RF-40, RF-37, RNF-1.
- **D94. 503 al confirmar solo sin ícono (R3).** En el paso 2 de RF-26, el 503 por datos que
  no se pueden interpretar solo se da si no se puede leer el ícono del perfil (los demás
  fallos de RF-16 siguen dando 503). Cualquier otro dato raro del perfil, con el ícono leído
  y coincidente, deja el perfil pendiente (RF-27, D80). Corrige D62. RF-26, RF-52.
- **D95. "No encontrado" al leer el Riot ID vigente (R3).** Si, tras confirmar el ícono,
  Riot no encuentra la cuenta al leer el Riot ID vigente, se aplica RF-50: 404, cuenta como
  intento y anula el desafío. D82 solo cubre los demás fallos de esa consulta. Precisa D55.
  RF-26, RF-27, RF-50.
- **D96. División desconocida (R3).** No es un fallo: se aplica la regla de la spec 004
  (DP-26, la división más baja del tier). En MASTER, GRANDMASTER y CHALLENGER la división se
  ignora. Corrige D62. RF-36, RF-52.
- **D97. Vencimiento durante una confirmación (R3).** La vigencia se comprueba al empezar la
  confirmación; si entonces era vigente, el éxito vale aunque venza mientras se consulta a
  Riot. RF-9, RF-26. Precisada por D104 (la anulación durante la confirmación sí impide el
  éxito).
- **D98. Tiempo máximo de una operación (R3).** Pedir, confirmar o resincronizar dura como
  máximo 60 s; si se supera, 503 sin cambios, o RF-27 si el ícono ya estaba confirmado.
  RNF-7, RF-16, RF-26, RF-51. **Interpretación confirmada por el usuario (2026-11-18, con
  D102 a D104)**: en una confirmación, un tiempo máximo superado antes de confirmar el ícono
  (503) cuenta como intento (RF-10, "Confirmación contada").
- **D99. Interfaz del desafío anulado y "Volver" (R3).** Tras una respuesta que anula el
  desafío (o que informa que ya venció o se anuló), la pantalla desactiva "Ya puse el ícono"
  y muestra "Pedir otro desafío" sin esperar a 00:00. Un botón "Volver" sale de la pantalla
  y deja el desafío abierto, recuperable con RF-45. No hay "Cancelar". Precisa D42. RF-2,
  RF-54. Precisada por D103 (dónde se recupera tras "Volver").
- **D100. Segundos restantes (R3).** Crear el desafío (RF-1) y recuperarlo (RF-45) devuelven
  también los segundos que le quedan; la cuenta atrás se calcula con ese dato, no con el
  reloj del navegador. Precisa D43 y D46. RF-1, RF-2, RF-45.
- **D101. Recarga con el desafío vencido (R3).** Si RF-45 no devuelve ningún desafío al
  recargar, la interfaz muestra el formulario normal de RF-46. Precisa D42. RF-45, RF-46.

### Cierre de la clarificación (2026-11-18)
Recomendaciones del planner para las 3 dudas que dejó la aplicación de D82 a D101, aprobadas
por el usuario el 2026-11-18, junto con las dos interpretaciones registradas en D91 y D98.
Con ellas aplicadas, el usuario aprobó la spec.
- **D102. Partidas omitidas y variación de LP (C1).** Una lectura en la que se omitió alguna
  partida (falló su detalle o trajo datos que no se pueden interpretar, D83) no cuenta como
  "lectura completa de rango y partidas" para RF-30: sus partidas nuevas quedan con "—" y no
  puede ser la "lectura anterior". Así se evita asignar a una partida omitida una variación
  falsa que ya no se recalcularía (D10, D37). Los remakes descartados no son partidas
  omitidas. Solo afecta a RF-30: el bloque de partidas sigue leído (D83), así que no cambian
  RF-7, RF-27 ni RF-53. Precisa D78, D81 y D83. Definiciones, RF-30.
- **D103. Desafío abierto al volver a "Verificar con Riot Games" (C2).** Se mantiene la
  interpretación provisional de D99: al volver a elegir "Verificar con Riot Games" con un
  desafío abierto, la interfaz muestra la pantalla de ese desafío (recuperado con RF-45) en
  lugar del formulario de RF-46. No hay "Cancelar". Consecuencia aceptada: si el usuario se
  equivocó de Riot ID o de región, debe esperar a que el desafío venza (hasta 10 minutos)
  para pedir otro con "Pedir otro desafío" (que usa el Riot ID y la región del desafío) o
  desde el formulario. Se descarta mostrar el formulario y anular el desafío con el pedido
  nuevo (RF-4). Precisa D99. RF-45, RF-46.
- **D104. Desafío anulado durante su confirmación (C3).** Si el desafío se anula (por
  ejemplo, por RF-29) mientras su confirmación está en curso, esa confirmación no verifica
  nada ni cambia ninguna cuenta, responde el 400 de RF-9 ("la verificación venció, pide un
  ícono nuevo") y cuenta como intento, porque ya consultó a Riot. A diferencia del
  vencimiento (D97), que solo se comprueba al empezar, la anulación se comprueba también al
  terminar la consulta a Riot, antes de verificar, y el 400 sustituye a cualquier otro
  resultado de esa confirmación. Precisa D90 y D97. Definiciones, RF-9, RF-26, RF-29.

## Usuarios
- Jugador de LoL registrado en TeamMatchUp.

## Historias de usuario
- HU-1. Como jugador de LoL, quiero verificar mi Riot ID cambiando mi ícono, para demostrar
  que la cuenta es mía.
- HU-2. Como jugador de LoL, quiero que mi rango y mis partidas sean los reales, para que las
  coincidencias me junten con gente de mi nivel.
- HU-3. Como jugador, quiero volver a mi ícono de siempre después de verificar, sin perder la
  verificación.

## Definiciones
- **Íconos de inicio**: los 29 íconos de invocador con número del 0 al 28, que toda cuenta de
  LoL tiene disponibles desde su creación (D25).
- **Riot ID con formato válido (esta spec)**: un texto que, recortado como en la spec 004
  ("Recortar", `String.prototype.trim`), tiene la forma `<nombre>#<etiqueta>`, con (D3,
  D44):
  - un nombre de 3 a 16 unidades UTF-16 que no contiene '#', LF, CR, U+2028 ni U+2029;
  - una etiqueta de 3 a 5 caracteres, todos letras ASCII (`A`-`Z`, `a`-`z`) o dígitos
    (`0`-`9`).
  Un campo ausente, nulo o que no es texto no tiene formato válido. Es más estricto que el
  patrón de la vinculación manual (spec 004), que no cambia.
- **Plataforma de una región**: tabla fija (D4): LAS = la2, LAN = la1, NA = na1, EUW = euw1,
  EUNE = eun1, BR = br1, KR = kr. Las regiones son las de LoL de la spec 004.
- **Cuenta que existe en una región**: Riot encuentra el Riot ID (cuenta global) y esa cuenta
  tiene perfil de LoL en la plataforma de la región (D4).
- **Cuenta de Riot**: la cuenta identificada por el identificador interno de Riot, que no
  cambia aunque cambie el Riot ID (spec 012, "Identificador real").
- **Bloques de una cuenta verificada con Riot**: los de la spec 012 ("Bloque de datos"):
  identidad (Riot ID), rango e historial, últimas partidas y perfil (nivel e ícono). La
  identidad nunca queda en "Datos pendientes": si al verificar falla la consulta del Riot ID
  vigente, se guarda el Riot ID del desafío, sin aviso (RF-7; D82).
- **Desafío de verificación**: pedido de un usuario para una cuenta de Riot (atado a su
  identificador interno, no al texto del Riot ID), una región y un ícono de inicio asignado.
  Se guarda y sobrevive a un reinicio del servidor con su vencimiento original (D15).
- **Riot ID del desafío** ("el que se usó al pedir el desafío"): el Riot ID en la forma que
  devolvió Riot al pedir el desafío, guardado con él; no el texto que escribió el usuario
  (RF-34; constitución, principio 5; D86).
- **Desafío creado**: desafío que el sistema llegó a crear, aunque después venza, se anule o
  se cierre. Las peticiones rechazadas no crean desafío (D34).
- **Desafío vigente**: desafío creado hace menos de 10 minutos. A los 10:00 exactos ya está
  vencido (D15). En una confirmación, la vigencia se comprueba al empezar (RF-9; D97).
- **Desafío cerrado (completado)**: desafío cuya confirmación terminó en verificación, con
  todos los datos leídos (RF-7) o con datos pendientes (RF-27) (D41).
- **Desafío abierto**: desafío vigente que no se cerró ni se anuló.
- **Confirmación contada**: confirmación de un desafío que llega a consultar a Riot, termine
  como termine: 503 (RF-16, incluido el tiempo máximo de RNF-7), 404 de cuenta que ya no
  existe (RF-50), 400 de ícono distinto (RF-8), 409 de una verificación simultánea de otro
  usuario (RF-24; spec 012, casos límite), 400 de desafío anulado mientras la confirmación
  estaba en curso (RF-9, RF-26; D104) o éxito, con o sin datos pendientes (RF-7, RF-27).
  Las rechazadas antes de consultar a Riot no cuentan (D9, D28, D54, D55, D98).
- **Rango real**: tier, división y LP de la cola clasificatoria Solo/Dúo según Riot.
- **Sin clasificar**: Riot no devuelve ahora ningún rango de Solo/Dúo para la cuenta.
  "Temporada vigente" es lo que Riot devuelve en ese momento (D13).
- **Datos pendientes**: estado de un bloque de una cuenta verificada que no se pudo leer de
  Riot al verificarla (RF-27); dura hasta que una resincronización lo lee (D33, D38). Pueden
  quedar pendientes el bloque de rango e historial, el de partidas y el de perfil; el de
  partidas, solo si falla la consulta de la lista (una partida que falla se omite, RF-11;
  D83); el de perfil, solo cuando Riot entrega en el perfil, con el ícono leído y
  coincidente, datos que no se pueden interpretar o que faltan (RF-52; D80, D94), y aun así
  el ícono se muestra (RF-40; D92). La identidad nunca queda pendiente (D82). Un fallo al
  resincronizar no deja ningún bloque pendiente: conserva
  sus datos anteriores (RF-53; D68). Una cuenta "tiene datos pendientes" si alguno de sus
  bloques lo está; solo el bloque de rango la saca de las coincidencias; las partidas o el
  perfil pendientes, no (RF-44; D67, D80).
- **Lectura**: cada obtención de datos de Riot al verificar (RF-7, RF-27) o al
  resincronizar (RF-14, RF-51, RF-53).
- **Partida anulada (remake)**: partida que Riot marca como anulada; se descarta (D10).
- **Lectura completa de rango y partidas** (solo para RF-30): lectura en la que se leyeron
  bien el bloque de rango e historial y el de partidas sin omitir ninguna partida, aunque
  haya fallado otro bloque (D78, D102). Una lectura en la que se omitió alguna partida
  porque falló su detalle o trajo datos que no se pueden interpretar (RF-11; D83) no es
  completa, aunque su bloque de partidas cuente como leído para RF-7, RF-27 y RF-53. Los
  remakes descartados no son partidas omitidas.
- **Lectura anterior (RF-30)**: la última lectura completa de rango y partidas previa a la
  actual. Las lecturas en las que falló el rango o las partidas, o en las que se omitió
  alguna partida, no cuentan como lectura anterior (D78, D102).
- **Partida nueva**: partida Solo/Dúo no anulada que trae una lectura y que no estaba entre
  las partidas de la lectura anterior. Las anuladas nunca son partidas nuevas (D37, D78).
  Como la lectura anterior es siempre una lectura completa de rango y partidas, una partida
  que apareció por primera vez en una lectura no completa (o que se omitió en ella) sigue
  siendo partida nueva en la siguiente lectura completa (D81, D102).
- **Variación asignada**: variación de LP que RF-30 dio a una partida. Una partida con "—"
  no tiene variación asignada (D81).
- **Espera en minutos (N)**: minutos que faltan, redondeados hacia arriba; con N = 1 el texto
  dice "1 minuto" (spec 012, RF-16; D30).
- **Modo simulado**: el modo de la interfaz sin servidor de la spec 007.

## Requisitos funcionales
Los textos de error van en la respuesta de error de la spec 001, en minúscula inicial y sin
punto final (spec 012, RNF-4; D31). Antes de cualquier revisión de esta spec van el paso del
cuerpo y la sesión, como en la spec 004 (RF-29).

### Pedir el desafío
- RF-1: CUANDO el usuario de la sesión pide verificar un Riot ID con una región, EL SISTEMA
  valida el formato (RF-18) y la región (spec 004, "Región válida"), comprueba con Riot que la
  cuenta existe en esa región (Definiciones), crea un desafío atado a esa cuenta de Riot con
  un ícono elegido según RF-19, guarda con él el Riot ID en la forma que devolvió Riot
  (Definiciones, "Riot ID del desafío"; D86) y responde 201 con el identificador del
  desafío, el número del ícono, su vencimiento y los segundos que le quedan (D100), sin el
  identificador interno de Riot (RNF-3; D46). No exige que el usuario tenga LoL vinculado a
  mano (D16).
- RF-18: SI el Riot ID falta, no es texto o, una vez recortado, no tiene formato válido según
  esta spec (Definiciones), ENTONCES EL SISTEMA responde 400 "Riot ID no válido: usa el
  formato Nombre#TAG, con 3 a 16 caracteres sin # antes de # y 3 a 5 letras o dígitos
  después" sin consultar a Riot y sin crear desafío (D3, D30, D44). SI la región falta o no
  es válida, ENTONCES responde 400 "región no válida para League of Legends" (spec 004, RF-6,
  "Región válida"). Si fallan los dos, solo el del Riot ID. El sistema usa el Riot ID
  recortado para consultar a Riot y para la comparación de RF-5.
- RF-3: SI la cuenta no existe en esa región (Riot no encuentra el Riot ID, o la cuenta no
  tiene perfil de LoL en la plataforma de la región), ENTONCES EL SISTEMA responde 404 "no
  existe una cuenta de League of Legends con ese Riot ID en esa región" y no crea ningún
  desafío (D4).
- RF-19: EL SISTEMA elige el ícono de un desafío nuevo de forma uniforme entre los 29 íconos
  de inicio, excluyendo: el ícono del desafío que reemplaza (RF-4), el ícono que la cuenta
  tiene puesto ahora en Riot y los íconos de los desafíos abiertos de cualquier usuario para
  esa misma cuenta de Riot (D5, D25).
- RF-43: SI tras las exclusiones de RF-19 no queda ningún ícono libre, ENTONCES EL SISTEMA
  responde 429 "no quedan íconos libres para esta cuenta, espera N minutos antes de pedir
  otro", con N = tiempo que falta para que venza el desafío abierto más antiguo de esa cuenta
  de Riot (Definiciones, "Espera en minutos"); no crea desafío, no anula el que el usuario
  tenga abierto y la petición no cuenta para el límite de RF-21 (D26, D30, D34).
- RF-4: CUANDO el usuario pide un desafío nuevo teniendo uno abierto y el nuevo se crea, EL
  SISTEMA anula el anterior. Si la petición se rechaza por cualquier motivo, el anterior
  sigue abierto.
- RF-5: SI la cuenta pedida ya está verificada por otro usuario, ENTONCES EL SISTEMA responde
  409 "esta cuenta ya está verificada por otro usuario" sin crear desafío (spec 012, RF-10).
  Se comprueba dos veces (D27): antes de consultar a Riot, comparando solo el texto del Riot
  ID, sin distinguir mayúsculas (RF-34) y sin mirar la región (D51); y después de consultar
  a Riot, comparando la cuenta interna de Riot (que detecta un Riot ID que cambió).
- RF-6: SI el usuario ya tiene una cuenta de LoL verificada, ENTONCES EL SISTEMA responde 409
  "ya tienes una cuenta de Riot verificada; usa «Resincronizar»" sin crear desafío; para
  cambiarla debe desvincularla antes (spec 012, RF-3; D7, D31).
- RF-20: SI el usuario tiene LoL vinculado a mano en una región distinta de la que pide
  verificar, ENTONCES EL SISTEMA responde 409 "desvincula primero tu cuenta de LoL de
  <región>", donde `<región>` es la región de esa cuenta vinculada a mano, sin consultar a
  Riot y sin crear desafío (D21, D31, D49). Si la región coincide, la verificación reemplaza
  la cuenta manual (spec 012, RF-13).
- RF-21: SI el usuario ya tiene 5 desafíos creados en la última hora, ENTONCES EL SISTEMA
  responde 429 "ya pediste 5 íconos en la última hora, espera N minutos antes de pedir otro",
  con N = tiempo que falta para que el más antiguo de esos 5 cumpla una hora (Definiciones,
  "Espera en minutos"), sin consultar a Riot y sin crear desafío. Solo cuentan los desafíos
  creados; las peticiones rechazadas (400, 404, 409, 429, 503) no cuentan (D20, D30, D34).
  La retención de RF-28 garantiza que los desafíos de la última hora siguen guardados.
- RF-49: MIENTRAS el usuario tiene en curso un pedido de desafío, una confirmación o una
  resincronización de su cuenta verificada con Riot, EL SISTEMA rechaza cualquier otra de
  esas tres operaciones suyas con 409 "ya se está comprobando", sin ponerla en cola, sin
  consultar a Riot, sin cambiar cuentas ni desafíos (un pedido rechazado no crea desafío ni
  anula el que tenga abierto) y sin contarla para ningún límite (RF-10, RF-21, RF-37 ni la
  espera mínima de la spec 012, RF-16). Esas tres operaciones de un mismo usuario se
  atienden de una en una; esto cubre también dos resincronizaciones simultáneas. Quedan
  fuera de esta regla la recuperación del desafío (RF-45), la vinculación manual (spec 004)
  y las coincidencias (spec 005). Ese estado vive solo en la memoria de la instancia
  (RF-28; D58, D63, D90). El 409 ocupa su lugar en el orden de RF-22, RF-26 y RF-51.
- RF-22: EL SISTEMA revisa la petición de un desafío en este orden y responde solo el primer
  fallo (D19, D27, D58, D90, D98):
  1. Sin consultar a Riot: 400 de formato (RF-18: Riot ID y después región) → 409 ya se está
     comprobando (RF-49; D70) → 409 ya tienes una verificada (RF-6) → 409 región distinta de
     tu vínculo manual (RF-20) → 429 cinco por hora (RF-21) → 409 otro la verificó, por el
     texto del Riot ID (RF-5) → 503 sin clave (RF-38) → 503 limitador propio (RF-37).
  2. Consultando a Riot: 503 fallo de Riot (RF-16, RF-52, incluido el tiempo máximo de
     RNF-7) → 404 no existe en esa región (RF-3) → 409 otro la verificó, por la cuenta
     interna de Riot (RF-5) → 429 sin íconos libres (RF-43).

### Pantalla del desafío
- RF-46: CUANDO el usuario elige "Verificar con Riot Games" (RF-39), EL SISTEMA muestra un
  formulario con el Riot ID y la región, rellenados con los de su cuenta de LoL vinculada a
  mano si la tiene (D42). SI tiene un desafío abierto, ENTONCES muestra la pantalla de ese
  desafío (RF-2), recuperado con RF-45, en lugar del formulario (D99, D103).
- RF-2: CUANDO se crea un desafío o se recupera uno abierto (RF-45), EL SISTEMA muestra (D6,
  D42):
  - la imagen del ícono asignado tomada de Data Dragon de Riot, que el navegador carga
    directamente con la versión más reciente de Data Dragon (no es una consulta a Riot para
    RF-37 ni RNF-1; D93); SI no carga, ENTONCES su número ("Ícono n.º 12");
  - una cuenta atrás en formato mm:ss, que parte de los segundos que le quedan al desafío
    según la respuesta de RF-1 o RF-45 (no del reloj del navegador comparado con el
    vencimiento) y baja sola hasta 00:00 (D100);
  - el texto fijo de 3 pasos para cambiar el ícono en el cliente de LoL: Perfil → clic en el
    ícono → elegir y guardar;
  - el botón "Ya puse el ícono", que confirma el desafío (RF-7);
  - el botón "Volver", que sale de la pantalla del desafío y lo deja abierto, recuperable
    con RF-45 (D99). No hay botón "Cancelar".
  Al llegar a 00:00 muestra "El desafío venció", desactiva "Ya puse el ícono" y muestra el
  botón "Pedir otro desafío". SI una confirmación recibe una respuesta que anula el desafío
  (429 de RF-10, 409 de RF-24, 404 de RF-50) o que informa que ya venció o se anuló (400 de
  RF-9), ENTONCES, además de mostrar su texto (RF-47), desactiva "Ya puse el ícono" y
  muestra "Pedir otro desafío" sin esperar a 00:00 (D99).
- RF-54: CUANDO el usuario pulsa "Pedir otro desafío" (RF-2), EL SISTEMA pide directamente
  un desafío nuevo con el Riot ID del desafío (Definiciones) y la misma región del desafío
  vencido o anulado, sin volver al formulario de RF-46; tras recargar la página, toma el
  Riot ID y la región que devuelve RF-45 (D76, D86, D99). La petición es un pedido de
  desafío como cualquier otro: sigue el orden de errores de RF-22 y, si el desafío se crea,
  cuenta para el límite de RF-21; sus errores se muestran junto a ese botón (RF-47) (D71,
  D77).
- RF-47: SI el pedido, la confirmación o "Pedir otro desafío" responden un error, ENTONCES
  EL SISTEMA muestra en la interfaz el texto de la API junto al formulario de RF-46 (pedido
  desde el formulario), junto al botón "Ya puse el ícono" (confirmación) o junto al botón
  "Pedir otro desafío", en la pantalla del desafío (RF-54, incluido el 429 de RF-21) (D42,
  D77).
- RF-45: CUANDO el usuario de la sesión pide su desafío abierto, EL SISTEMA responde con el
  identificador, el número del ícono, el vencimiento, los segundos que le quedan (D100), el
  Riot ID del desafío (Definiciones; D86) y la región de su desafío abierto, sin el
  identificador interno de Riot (RNF-3), o indica que no tiene ninguno; con el Riot ID y la
  región, "Pedir otro desafío" (RF-54) funciona también tras recargar la página (D76). No
  consulta a Riot, no cuenta para ningún límite (RF-10, RF-21, RF-37), no se ve afectada por
  RF-49 y no depende de la clave de Riot (RF-38). La interfaz la usa al recargar la página
  para volver a mostrar la pantalla del desafío (RF-2) (D43, D57, D76) y para recuperarlo
  tras "Volver": al volver a elegir "Verificar con Riot Games" (RF-39) con un desafío
  abierto, muestra la pantalla del desafío en lugar del formulario de RF-46 (D99, D103).
  Como no hay "Cancelar", quien se equivocó de Riot ID o de región debe esperar a que el
  desafío venza (hasta 10 minutos) para pedir otro; es una consecuencia aceptada (D103). SI
  no devuelve ningún desafío (por ejemplo, porque venció), ENTONCES la interfaz muestra el
  formulario de RF-46 (D101).

### Confirmar el desafío
- RF-7: CUANDO el usuario confirma un desafío vigente y Riot informa que la cuenta de Riot del
  desafío tiene puesto el ícono asignado, EL SISTEMA verifica la cuenta de LoL (spec 012,
  RF-1, RF-8, RF-11, RF-13), obtiene sus datos reales (RF-11), cierra el desafío y responde
  200 con la cuenta verificada y sus datos; la interfaz avisa "Cuenta de Riot verificada" y
  vuelve al perfil, donde aparecen la marca y los datos (D8). SI el Riot ID cambió desde que
  se pidió el desafío, ENTONCES verifica igual y guarda el Riot ID nuevo (D14). SI falla la
  consulta del Riot ID vigente por un motivo que no es "no encontrado" (ese caso es RF-50;
  D95), ENTONCES guarda el Riot ID del desafío (Definiciones; D86), sin aviso y sin dejar
  ningún dato pendiente: la identidad no es un bloque que pueda quedar pendiente (D82). Una
  verificación en la que se leyeron bien el rango, las partidas y el perfil cuenta como la
  última resincronización exitosa a efectos de la espera mínima (spec 012, "Espera mínima" y
  RF-16), aunque haya fallado la consulta del Riot ID vigente (D53, D82).
- RF-8: SI la cuenta todavía no tiene puesto el ícono asignado, ENTONCES EL SISTEMA responde
  400 "si ya lo cambiaste, Riot puede tardar unos minutos; vuelve a intentarlo", mantiene el
  desafío abierto con su vencimiento original y cuenta la confirmación (RF-10; D9, D31). Este
  texto sustituye al anterior ("el ícono de tu perfil todavía no coincide con el pedido";
  D30).
- RF-9: SI el desafío venció o se anuló, ENTONCES EL SISTEMA responde 400 "la verificación
  venció, pide un ícono nuevo" sin consultar a Riot (D15). La vigencia se comprueba al
  empezar la confirmación: si entonces era vigente, el éxito (RF-7, RF-27) vale aunque el
  desafío venza mientras se consulta a Riot (D97). La anulación, en cambio, se comprueba
  también al terminar la consulta a Riot: SI el desafío se anuló mientras su confirmación
  estaba en curso (por ejemplo, por RF-29), ENTONCES esa confirmación no verifica nada ni
  cambia ninguna cuenta, responde este mismo 400 en lugar de cualquier otro resultado y
  cuenta como intento, porque ya consultó a Riot (RF-26, paso 3; D104).
- RF-23: SI el desafío no existe entre los del usuario de la sesión (no existe, ya se borró
  por RF-28 o es de otro usuario), ENTONCES EL SISTEMA responde 404 "desafío de verificación
  no encontrado", como si no existiera, sin consultar a Riot y sin contarlo como intento
  (D19, D30).
- RF-48: SI el desafío ya está cerrado (Definiciones), ENTONCES EL SISTEMA responde 409 "este
  desafío ya se completó" sin consultar a Riot y sin contarlo como intento (D41).
- RF-10: SI el usuario confirma un desafío que ya tiene 10 confirmaciones contadas, ENTONCES
  EL SISTEMA responde 429 "demasiados intentos, pide un ícono nuevo" sin consultar a Riot y
  anula el desafío (D9).
- RF-24: SI la cuenta de Riot del desafío ya está verificada por otro usuario, o otro usuario
  la verifica mientras se consulta a Riot, ENTONCES EL SISTEMA responde 409 "esta cuenta ya
  está verificada por otro usuario", no cambia ninguna cuenta y anula el desafío (spec 012,
  RF-10 y casos límite; D19, D54, D91). Después de consultar a Riot, esta comprobación se
  hace justo después de ver que el ícono coincide y antes de leer los datos (RF-26).
- RF-50: SI al confirmar Riot ya no encuentra la cuenta de Riot del desafío, o esa cuenta ya
  no tiene perfil de LoL en la plataforma de la región del desafío, ENTONCES EL SISTEMA
  responde 404 "no existe una cuenta de League of Legends con ese Riot ID en esa región"
  (el texto de RF-3), cuenta la confirmación como intento, anula el desafío y no cambia
  ninguna cuenta (D55). Esto incluye el caso en que, tras confirmar el ícono, Riot responde
  "no encontrado" al leer el Riot ID vigente, aunque ya se hayan leído otros bloques; los
  demás fallos de esa consulta siguen RF-7 (se guarda el Riot ID del desafío) y no RF-50 ni
  RF-27 (D82, D95).
- RF-25: SI llega una confirmación mientras el usuario tiene en curso otra confirmación, un
  pedido de desafío o una resincronización (RF-49), ENTONCES EL SISTEMA la rechaza con el
  409 "ya se está comprobando" de RF-49, sin consultar a Riot y sin contarla como intento
  (D9, D31, D58, D90). Ese estado vive solo en la memoria de la instancia: si el servidor se
  reinicia, se pierde y el desafío sigue abierto (RF-28; D63).
- RF-26: EL SISTEMA revisa la confirmación en este orden y responde solo el primer fallo
  (D19, D28, D41, D54, D55, D90, D91, D94, D95, D97, D98, D104):
  1. Sin consultar a Riot (no cuenta como intento): 404 desafío ajeno o inexistente (RF-23)
     → 409 ya se completó (RF-48) → 409 ya se está comprobando (RF-25, RF-49) → 429
     intentos gastados (RF-10) → 400 vencido o anulado (RF-9; la vigencia se comprueba aquí,
     al empezar) → 409 otro la verificó, que anula el desafío (RF-24) → 503 sin clave
     (RF-38) → 503 limitador propio (RF-37).
  2. Consultando a Riot (confirmación contada): 503 fallo de Riot al leer el perfil (RF-16,
     también si se supera el tiempo máximo de RNF-7, o RF-52 si no se puede leer el ícono;
     D94) → 404 la cuenta ya no existe en esa región (RF-50) → 400 ícono distinto (RF-8) →
     409 otro la verificó al mismo tiempo, que anula el desafío (RF-24; justo después de
     ver que el ícono coincide y antes de leer los datos, D91) → lectura de los datos: 404
     si Riot no encuentra la cuenta al leer el Riot ID vigente (RF-50; D95). Si nada de eso
     falla, éxito (RF-7, también si solo falló la consulta del Riot ID vigente, D82) o
     verificación con datos pendientes (RF-27, también si se supera el tiempo máximo de
     RNF-7 durante la lectura de los datos, D98).
  3. Al terminar la consulta a Riot, antes de verificar (confirmación contada): SI el
     desafío se anuló mientras esta confirmación estaba en curso (RF-29), ENTONCES 400
     vencido o anulado (RF-9) en lugar de cualquier resultado del paso 2, sin verificar ni
     cambiar ninguna cuenta (D104).
- RF-27: SI Riot confirma el ícono pero falla la lectura de alguno de los bloques de rango e
  historial, partidas o perfil (RF-11), incluido porque se supera el tiempo máximo de RNF-7
  (D98), ENTONCES EL SISTEMA verifica igual la cuenta, cierra el desafío y responde 200,
  tratando cada bloque por separado (como la 013, RF-11; D8, D38, D40):
  - guarda con origen Riot Games los bloques que se leyeron bien;
  - en cada bloque que no se pudo leer (rango e historial, partidas o perfil) muestra "Datos
    pendientes de Riot Games" hasta que una resincronización lo lea;
  - SI además falla la consulta del Riot ID vigente (sin ser "no encontrado", que es RF-50),
    ENTONCES guarda el Riot ID del desafío (Definiciones), como RF-7; la identidad nunca
    queda pendiente (D82, D86).
  El bloque de partidas solo queda pendiente si falla la consulta de la lista de partidas;
  una partida cuyo detalle falla o trae datos que no se pueden interpretar se omite y el
  bloque se lee igual (RF-11; D83). El bloque de perfil solo queda pendiente cuando Riot
  entrega en el perfil, con el ícono leído y coincidente, datos que no se pueden interpretar
  o que faltan, como un nivel ilegible (RF-52; D80, D94); en ese caso el nivel muestra
  "Datos pendientes de Riot Games" y el ícono de invocador se muestra igual, porque se leyó
  y se confirmó (RF-40; D92).
  La interfaz avisa, SI no se pudo leer ni el bloque de rango e historial ni el de partidas
  (falte o no el perfil), "Cuenta de Riot verificada, pero no pudimos leer sus datos.
  Resincroniza más tarde para verlos."; en cualquier otra combinación con al menos un bloque
  pendiente (solo el rango, solo las partidas, solo el perfil, o el perfil con uno de los
  otros dos), "Cuenta de Riot verificada, pero no pudimos leer algunos de sus datos.
  Resincroniza más tarde para verlos." (D72, D79, D80). Si no queda ningún bloque pendiente
  (solo falló la consulta del Riot ID vigente), no es RF-27 sino RF-7, sin aviso (D82). Una
  verificación con datos pendientes no cuenta para la espera mínima, así que se puede
  resincronizar de inmediato (spec 012, RF-16; como la 013, RF-12; D30, D53).

### Ciclo de vida del desafío
- RF-28: EL SISTEMA guarda los desafíos de forma que sobreviven a un reinicio del servidor con
  su vencimiento original, y borra cada desafío 24 horas después de que deje de estar
  abierto: cuando vence, se anula o se cierra, lo que ocurra primero (D87); así siguen
  guardados los de la última hora que cuenta RF-21. El estado "ya se está comprobando"
  (RF-25, RF-49) no se guarda: un reinicio lo pierde y el desafío sigue abierto (D15, D45,
  D63).
- RF-29: CUANDO un usuario elimina su cuenta de TeamMatchUp (spec 003), EL SISTEMA elimina
  también sus desafíos (como la 013, RF-26). CUANDO, teniendo el usuario un desafío abierto,
  vincula o desvincula LoL a mano, edita la región de su cuenta de LoL vinculada a mano (spec
  004, RF-8) o esa cuenta se desvincula sola porque otro usuario verificó la misma cuenta
  (spec 012, RF-11) o porque la resincronización de otro usuario trajo ese mismo Riot ID
  (RF-14), EL SISTEMA anula ese desafío y el usuario debe pedir otro (D15, D59, D89). SI el
  desafío anulado tiene una confirmación en curso, ENTONCES esa confirmación no verifica
  nada, responde el 400 de RF-9 y cuenta como intento (RF-26, paso 3; D104).

### Datos reales
- RF-11: CUANDO una cuenta de LoL queda verificada o se resincroniza, EL SISTEMA obtiene de
  Riot el Riot ID vigente, el rango real, el nivel, el ícono y las 20 partidas
  clasificatorias Solo/Dúo más recientes, descarta las anuladas (así que puede mostrar menos
  de 20) y los marca con origen Riot Games (spec 012, RF-5; D10, D39). SI falla la consulta
  del detalle de una partida, o trae datos que no se pueden interpretar (RF-52), ENTONCES
  omite solo esa partida (también puede mostrar menos de 20); el bloque de partidas solo
  falla (RF-27, RF-53) si falla la consulta de la lista de partidas (D83).
- RF-12: EL SISTEMA muestra de cada partida real, con el formato de la spec 004: el resultado,
  la fecha (dd/mm/aaaa, en la zona horaria del navegador, porque la spec 004 no fija una para
  mostrar; D47), la duración en minutos enteros redondeada al minuto más cercano con las
  mitades hacia arriba (29 min 29 s → 29; 29 min 30 s → 30), el resumen "<campeón> · K/D/A"
  con el nombre del campeón tal como lo da Riot, y la variación de LP asignada por RF-30 o
  "—" si la partida no la tiene (D10, D35, D37).
- RF-30: CUANDO una lectura completa de rango y partidas (Definiciones) trae exactamente una
  partida nueva (Definiciones: las anuladas no cuentan) respecto de la lectura anterior (la
  última lectura completa de rango y partidas), y ambas lecturas tienen rango en la misma
  división (en Master, Grandmaster y Challenger, en el mismo tier), EL SISTEMA asigna a esa
  partida la variación de LP igual a los LP de la lectura nueva menos los de la anterior. En
  cualquier otro caso (primera lectura, ninguna lectura anterior completa, lectura actual en
  la que falló el rango, lectura actual en la que se omitió alguna partida (RF-11), varias
  partidas nuevas, alguna lectura sin rango, cambio de división o de tier) las partidas
  nuevas quedan sin variación ("—"). Una lectura con alguna partida omitida no es completa
  y no sirve de lectura anterior (D102). Una variación ya asignada no se recalcula ni se
  borra en lecturas posteriores (D10, D37, D78). "—" no es una variación
  asignada: una partida que quedó con "—" porque apareció en una lectura que no era completa
  de rango y partidas, o que se omitió en ella, sigue siendo partida nueva respecto de la lectura anterior y recibe
  variación en la siguiente lectura completa si cumple esta misma regla (es la única partida
  nueva y no hay cambio de división ni de tier); si no la cumple, sigue con "—" (D81).
- RF-31: EL SISTEMA acepta en los datos de origen Riot cualquier cantidad de LP mayor o igual
  que 0, sin tope superior (D11). Los LP negativos son un dato que no se puede interpretar
  (RF-52).
- RF-32: EL SISTEMA construye el historial de rango de una cuenta verificada con sus propias
  lecturas (spec 012, RF-9): tras la primera verificación tiene un solo punto (ninguno si
  está sin clasificar o su rango quedó pendiente) y crece con cada resincronización en la que
  cambia el rango. Pasar a "sin clasificar" no añade punto y el historial conserva los
  anteriores. SI la cuenta vuelve a tener rango y es el mismo del último punto del historial,
  ENTONCES no añade punto (D12, D52).
- RF-13: MIENTRAS una cuenta verificada está sin clasificar, EL SISTEMA muestra "sin
  clasificar" en lugar de su rango y la deja fuera de las coincidencias de LoL como candidata
  (D1, D13).
- RF-33: SI un usuario cuya cuenta de LoL verificada está sin clasificar busca candidatos de
  LoL, ENTONCES EL SISTEMA responde 409 "necesitas rango en Solo/Dúo para buscar en LoL" y la
  interfaz muestra ese aviso en lugar de la lista (D13, D31). Este 409 se revisa después de
  los 400 de validación de los filtros (spec 005, RF-16) y no depende de la clave de Riot
  (D57, D61).
- RF-44: MIENTRAS el bloque de rango de una cuenta verificada está en "Datos pendientes de
  Riot Games" (RF-27), EL SISTEMA la trata en las coincidencias de LoL como sin clasificar:
  queda fuera como candidata (RF-13) y su dueño recibe el 409 de RF-33 al buscar candidatos
  de LoL. Deja de hacerlo en cuanto una resincronización lee su rango. Una cuenta a la que
  solo le faltan otros bloques (partidas, perfil o los dos) sigue en las coincidencias con
  su rango (D33, D38, D67, D80).
- RF-14: CUANDO cambia el Riot ID de una cuenta verificada en Riot, EL SISTEMA muestra el
  nuevo al resincronizarla, sin perder la verificación ni el historial. SI el Riot ID nuevo
  coincide con una cuenta vinculada a mano por otro usuario, ENTONCES EL SISTEMA desvincula
  esa cuenta, igual que al verificar (spec 012, RF-11), y anula el desafío abierto que ese
  otro usuario tenga (RF-29; D89). El Riot ID antiguo queda libre para vincularlo a mano
  (D14).
- RF-34: EL SISTEMA guarda y muestra el Riot ID tal como lo devuelve Riot, con sus
  mayúsculas, y lo compara sin distinguir mayúsculas en toda regla de unicidad (D14).
- RF-35: SI al resincronizar la cuenta verificada ya no tiene perfil de LoL en la plataforma
  de su región, ENTONCES EL SISTEMA responde 404 "la cuenta ya no tiene perfil de League of
  Legends en <región>: desvincúlala y vuelve a verificarla en su región nueva", la interfaz
  muestra ese aviso y conserva la cuenta verificada con sus últimos datos (como la spec 012,
  RF-21; D21, D30). SI Riot ya no encuentra la cuenta de Riot, ENTONCES responde el 404 de
  la spec 012, RF-21 ("la cuenta ya no existe en Riot Games").
- RF-51: EL SISTEMA revisa la resincronización de una cuenta verificada con Riot, después del
  paso del cuerpo, la sesión y las revisiones de la spec 004 (RF-29: formato, existencia y
  propiedad), en este orden y responde solo el primer fallo (D60, D68, D90, D98): 409 ya se
  está comprobando (RF-49) → 503 sin clave (RF-38) → 429 espera mínima (spec 012, RF-16) →
  503 limitador propio (RF-37) → 503 fallo de Riot en la consulta de la cuenta (Riot ID
  vigente) o del perfil en la plataforma de la región (nivel e ícono) (RF-16, RF-52) → 404
  de RF-35 → 503 si la operación supera el tiempo máximo de RNF-7. En todos estos casos no
  cambia nada de la cuenta. Si la cuenta y el perfil se leen bien y no se supera el tiempo
  máximo, el fallo de cualquier otro bloque sigue RF-53.
- RF-53: SI al resincronizar una cuenta verificada con Riot se leen bien la cuenta y el
  perfil pero falla la lectura de algún otro bloque (rango e historial o la lista de
  partidas, incluidos los datos que no se pueden interpretar de RF-52; una partida suelta
  que falla solo se omite, RF-11), ENTONCES EL SISTEMA (D68, D83):
  - actualiza con origen Riot Games los bloques que se leyeron bien;
  - conserva en cada bloque que falló sus datos anteriores (como la spec 012, RF-19): no lo
    pasa a "Datos pendientes de Riot Games" (un bloque que ya estaba pendiente sigue así);
  - responde 200 con la cuenta y un aviso, y la interfaz muestra "No pudimos actualizar
    algunos de tus datos de Riot Games. Resincroniza más tarde para verlos." (texto revisado
    con la aprobación de la spec, D30);
  - no la cuenta como la última resincronización exitosa para la espera mínima (spec 012,
    RF-16), así que se puede volver a resincronizar de inmediato.
- RF-36: EL SISTEMA trata el rango y los textos de Riot así (D24, D36, D48):
  - Lo que se guarda y se muestra: el tier y la división tal como los entrega Riot, que la
    interfaz muestra sin traducir (por ejemplo, "GOLD II"). En MASTER, GRANDMASTER y
    CHALLENGER muestra solo el tier ("MASTER"), sin la división "I" que manda Riot (D73).
    Los nombres de campeones también se muestran tal como los entrega Riot (por ejemplo, MonkeyKing). La
    cola no se muestra en ninguna pantalla.
  - Lo que se calcula: además, el sistema guarda el tier normalizado al nombre de la escala
    de LoL de la spec 004 (GOLD → Gold, GRANDMASTER → Grandmaster…), con el que calcula el
    rango normalizado y la distancia de rango de las coincidencias (spec 004, DP-26; spec
    005). En Master, Grandmaster y Challenger el rango normalizado no lleva división (spec
    004, RNF-3). Un tier que no está en la escala vale 0 al normalizar (spec 004, "Rango
    normalizado"; D62).
  - División desconocida (D96): no es un fallo. En los tiers con división, una división
    distinta de I, II, III y IV se guarda y se muestra como la entrega Riot y, al
    normalizar, cuenta como la división más baja del tier (spec 004, DP-26). En MASTER,
    GRANDMASTER y CHALLENGER la división que entregue Riot se ignora, sea cual sea.
- RF-52: SI Riot entrega datos que no se pueden interpretar (LP negativos, campos que faltan
  o un resultado de partida desconocido), ENTONCES EL SISTEMA lo trata como un fallo de Riot
  (D62, D68, D83, D94):
  - al pedir el desafío, responde 503 (RF-16);
  - al confirmar, responde 503 (RF-16) solo si no puede leer el ícono del perfil; con el
    ícono leído, si no coincide, responde el 400 de RF-8, y si coincide, cualquier otro dato
    raro del perfil deja el perfil pendiente (RF-27; el ícono se muestra igual, RF-40); un
    dato raro en el rango o en la lista de partidas deja ese bloque pendiente (RF-27); en
    una partida, se omite solo esa partida (RF-11); en la consulta del Riot ID vigente, se
    guarda el Riot ID del desafío (RF-7);
  - al resincronizar, da 503 si afecta a la cuenta o al perfil (RF-51); si afecta al rango o
    a la lista de partidas, aplica RF-53; si afecta a una partida, la omite (RF-11).
  Un tier fuera de la escala y una división desconocida no son un fallo (RF-36; D96).
- RF-15: EL SISTEMA no exige que el jugador mantenga el ícono asignado después de verificar.

### Disponibilidad de Riot
- RF-16: SI Riot rechaza la clave (caducada o inválida), informa que se superó el límite de
  consultas, no responde, agota el tiempo de espera (RNF-6), responde con un error de
  servidor (5xx) o la operación supera su tiempo máximo (RNF-7), ENTONCES EL SISTEMA responde 503 "Riot Games no está disponible por ahora,
  intenta más tarde" en cualquier operación de esta spec que consulta a Riot y conserva
  cuentas y desafíos sin cambios, salvo el contador de intentos (spec 012, RF-19; D22, D31,
  D56); quedan aparte las lecturas parciales de RF-27 y RF-53. En una confirmación, cuenta
  como intento (RF-10).
- RF-37: EL SISTEMA usa un limitador propio por instancia que respeta los límites de la clave
  de Riot, 20 consultas por segundo y 100 cada 2 minutos, ambos contados en ventanas
  deslizantes (cualquier intervalo de 1 segundo o de 2 minutos) (D17, D40, D85). Solo cuenta
  las consultas que hace el servidor; las imágenes de Data Dragon que carga el navegador no
  son consultas a Riot (D93):
  - Antes de empezar una operación que consulta a Riot, reserva todas las consultas que va a
    necesitar: al pedir un desafío, 2 (la cuenta y el perfil); al confirmar, 24 (el perfil,
    la cuenta, el rango, la lista de partidas y las 20 partidas); al resincronizar, 24 (las
    mismas) (D84).
  - Al terminar la operación, con éxito o con error, libera las consultas reservadas que no
    llegó a usar (por ejemplo, las de la lectura en una confirmación con ícono distinto)
    (D69).
  - SI no hay hueco para la reserva completa en la ventana de 2 minutos, ENTONCES rechaza la operación
    al momento con 503 "Riot Games está ocupado, inténtalo en unos minutos", sin consultar a
    Riot, sin cambiar cuentas ni desafíos y sin contarla como intento.
  - Espacia las consultas para no pasar de 20 por segundo; cada espera es de menos de 1
    segundo.
  - SI, pese a la reserva, una consulta falla después de confirmar el ícono, ENTONCES se
    aplica la regla de esa consulta: RF-27 si es el rango, la lista de partidas o el perfil
    (verificada con datos pendientes); RF-11 si es el detalle de una partida (se omite);
    RF-7 si es el Riot ID vigente (se guarda el del desafío), o RF-50 si Riot responde "no
    encontrado" al leerlo (D82, D83, D95).
- RF-38: MIENTRAS la instancia no tiene clave de Riot, EL SISTEMA responde 503 "Riot Games no
  está disponible por ahora, intenta más tarde" (spec 012, RF-19) a las operaciones de esta
  spec que consultan a Riot (pedir un desafío, confirmarlo y resincronizar una cuenta
  verificada con Riot), y no ofrece "Verificar con Riot Games" en la interfaz; vincular a
  mano y todo lo demás sigue igual (como la 013, RF-22; spec 012, RF-20; D22, D32). El 409
  de RF-33 y la recuperación del desafío (RF-45) no dependen de la clave (D57).
- RF-17: CUANDO se reemplaza la clave de Riot en `.env` y se reinicia el servidor, EL
  SISTEMA vuelve a operar con Riot sin otro cambio (constitución, principio 5; D64).

### Interfaz
- RF-39: EL SISTEMA ofrece "Verificar con Riot Games" tanto si el usuario ya tiene una cuenta
  de LoL vinculada a mano como si no tiene ninguna: en la fila de su cuenta de LoL sin
  verificar (perfil y Configuración) y, si no tiene cuenta de LoL, sobre el formulario de
  vínculo de LoL en Configuración (como la 013, RF-2; D16, D32). SI el usuario ya tiene una
  cuenta de LoL verificada, ENTONCES no lo ofrece (como la 013, RF-3; D7). El formulario de
  vínculo manual de LoL no cambia (como la 013, RF-16).
- RF-40: EL SISTEMA muestra la marca "Verificada con Riot Games", el nivel y el ícono de
  invocador en las mismas pantallas y con el mismo estilo que la marca y los datos de Steam
  de la spec 013 (RF-15), con el nivel y el ícono en el bloque de LoL y la etiqueta "Datos de
  Riot Games" (spec 012, RF-6, RF-22; D16). En coincidencias muestra solo la marca y el
  origen, como la 013 (RF-15): ni el nivel ni el ícono. La imagen del ícono de invocador es
  la de Data Dragon, que el navegador carga directamente con la versión más reciente de
  Data Dragon y que no cuenta como consulta a Riot (RF-37, RNF-1; D93). SI la imagen no
  carga, ENTONCES no muestra nada en su lugar (D50). Con el perfil en "Datos pendientes de
  Riot Games" por un nivel que no se puede interpretar (RF-27), el ícono se muestra igual
  (D92).
- RF-41: EL SISTEMA muestra junto a "Resincronizar" de una cuenta de LoL verificada con Riot
  el texto "Al resincronizar, se vuelven a leer tus datos de Riot Games. Puedes hacerlo cada
  5 minutos."; en una cuenta sin verificar mantiene el texto de la spec 007 (como la 013,
  RF-25; D16, D32).
- RF-42: MIENTRAS el modo simulado está activo, EL SISTEMA muestra "Verificar con Riot Games"
  desactivado con el texto "No disponible en modo de demostración", nunca simula una
  verificación ni un dato de Riot, ni muestra la marca "Verificada con Riot Games" ni la
  etiqueta "Datos de Riot Games"; los datos de LoL simulados siguen marcados como simulados
  (como la 013, RF-21; D22, D32).

## Requisitos no funcionales
- RNF-1: Las consultas a Riot respetan sus límites (20 por segundo y 100 cada 2 minutos, en
  ventanas deslizantes) con el limitador de RF-37; una verificación completa usa como
  máximo 35 consultas: 2 al pedir el desafío, 1 (el perfil) en cada una de hasta 9
  confirmaciones que no terminan en éxito y 24 en la confirmación con éxito (el perfil, la
  cuenta, el rango, la lista de partidas y las 20 partidas más recientes, aunque después se
  descarten las anuladas o se omitan las que fallen) (D18, D39, D40, D84). Las imágenes de
  Data Dragon que carga el navegador no cuentan (D93).
- RNF-2: Las pruebas simulan Riot y pasan sin conexión ni clave (spec 012, RNF-1).
- RNF-3: El identificador interno de Riot de una cuenta no sale en ninguna respuesta,
  incluidas las del desafío (RF-1, RF-45) (spec 012, RNF-3).
- RNF-4: La clave de Riot es un secreto de la configuración de cada instancia y vive solo en
  `.env` (constitución, principio 5; D64): nunca aparece en el repositorio, en respuestas, en
  mensajes de error ni en registros (spec 012, RNF-2).
- RNF-5: Esta spec no justifica ninguna dependencia nueva (constitución, principio 1): las
  consultas a Riot usan las capacidades nativas del entorno y el limitador de RF-37 es propio
  y sencillo (como la 013, RNF-5; D23).
- RNF-6: Una consulta a Riot que no responde en 8 segundos cuenta como Riot no disponible
  (spec 012, RNF-5; RF-16; D29).
- RNF-7: Una operación completa que consulta a Riot (pedir el desafío, confirmarlo o
  resincronizar) dura como máximo 60 segundos, contados desde que empieza e incluidas las
  esperas del limitador (RF-37). SI se supera, ENTONCES responde el 503 de RF-16 sin
  cambiar cuentas ni desafíos (al resincronizar, tampoco los bloques ya leídos; en una
  confirmación cuenta como intento, RF-10), salvo que el ícono ya se hubiera confirmado al
  confirmar: entonces se aplica RF-27, con pendientes los bloques que no se llegaron a leer
  (o RF-7 si solo faltaba el Riot ID vigente) (D98).

## Casos límite
- El jugador tiene puesto un ícono de inicio: el asignado es otro (RF-19).
- El jugador pide un segundo desafío: el ícono nuevo no repite el del anterior ni el que
  tiene puesto (RF-4, RF-19).
- Dos usuarios piden desafíos para la misma cuenta de Riot: reciben íconos distintos
  (RF-19); el primero que confirma gana y el otro recibe 409 al confirmar, que anula su
  desafío (RF-24); su pantalla desactiva "Ya puse el ícono" y muestra "Pedir otro desafío"
  sin esperar a 00:00 (RF-2).
- Otro usuario verifica la cuenta mientras el jugador confirma con el ícono ya puesto: el
  409 llega justo después de comprobar el ícono, antes de leer los datos, y anula el
  desafío (RF-24, RF-26).
- El jugador confirma cuando otro usuario ya verificó la cuenta: 409 antes de consultar a
  Riot, que no cuenta como intento pero anula igualmente el desafío (RF-24, RF-26; D91).
- Mientras se confirma su desafío, el jugador vincula, desvincula o cambia la región de su
  LoL manual (o esa cuenta se desvincula sola, RF-29): el desafío se anula y, al terminar
  la consulta a Riot, la confirmación no verifica nada aunque el ícono coincida, responde
  el 400 de RF-9 y cuenta como intento; la pantalla muestra "Pedir otro desafío" (RF-29,
  RF-26, RF-9, RF-2; D104).
- Todos los íconos de inicio excluidos para una cuenta de Riot: 429 con la espera hasta que
  venza el desafío abierto más antiguo de esa cuenta; no se crea desafío, el del usuario
  sigue abierto y la petición no cuenta para el límite por hora (RF-43).
- El jugador se pone el ícono, confirma, y después vuelve a su ícono: sigue verificado (RF-15).
- El jugador confirma a los 10:00 exactos o a los 10 min 5 s: vencido, 400 (RF-9).
- El jugador confirma a los 9 min 58 s y el desafío vence mientras se consulta a Riot: la
  vigencia se comprobó al empezar, así que el éxito vale (RF-9).
- Confirma justo después de cambiar el ícono y Riot aún no lo refleja: 400 de RF-8, gasta un
  intento y el plazo no se alarga.
- 11.ª confirmación de un mismo desafío: 429 (RF-10); un 404, un 409 "ya se completó", un
  409 "ya se está comprobando", un 409 "otro la verificó" antes de Riot o un 503 sin clave o
  del limitador propio no cuentan (RF-26).
- Dos confirmaciones simultáneas del mismo usuario: la segunda recibe 409 "ya se está
  comprobando" (RF-25). Un pedido de desafío mientras se confirma o mientras hay otro pedido
  en marcha: 409 "ya se está comprobando", sin contar para el límite por hora (RF-49). Dos
  resincronizaciones simultáneas de la cuenta verificada con Riot: la segunda recibe 409 "ya
  se está comprobando", sin cola y sin contar para la espera mínima (RF-49, RF-51).
  Recuperar el desafío mientras se confirma: responde normalmente (RF-45).
- Una operación (pedir, confirmar o resincronizar) supera los 60 s: 503 sin cambios; al
  confirmar, si el ícono aún no se había confirmado, ese 503 cuenta como intento (D98); si
  ya se había confirmado, verificada con datos pendientes en los bloques que no se llegaron
  a leer (RNF-7, RF-27).
- El servidor se reinicia en medio de una confirmación: el estado "ya se está comprobando" se
  pierde y el desafío sigue abierto (RF-25, RF-28).
- El usuario vuelve a confirmar un desafío que ya terminó en verificación: 409 "este desafío
  ya se completó", sin contar como intento (RF-48). Pasadas 24 h desde el cierre, el desafío
  ya no existe: 404 (RF-23, RF-28). Un desafío anulado a los 2 minutos se borra 24 h
  después de anularse, no de su vencimiento (RF-28).
- Un usuario confirma el desafío de otro: 404, como si no existiera (RF-23).
- Durante la confirmación, la cuenta de Riot ya no existe o ya no tiene perfil en la región:
  404 con el texto de RF-3, cuenta como intento y el desafío se anula (RF-50); la pantalla
  muestra "Pedir otro desafío" sin esperar a 00:00 (RF-2). Lo mismo si, con el ícono ya
  confirmado, Riot responde "no encontrado" al leer el Riot ID vigente: 404 y ninguna
  cuenta cambia (RF-50).
- El usuario recarga la página con un desafío abierto: la interfaz lo recupera y vuelve a
  mostrar el ícono y la cuenta atrás, que parte de los segundos que devuelve la
  recuperación aunque el reloj del navegador esté desajustado, sin consultar a Riot,
  también sin clave (RF-45, RF-2).
- El usuario recarga la página con el desafío ya vencido: la recuperación no devuelve
  ninguno y la interfaz muestra el formulario de RF-46 (RF-45).
- El usuario pulsa "Volver" en la pantalla del desafío: sale de ella y el desafío sigue
  abierto, recuperable con RF-45 (RF-2). No hay "Cancelar". Si vuelve a elegir "Verificar
  con Riot Games" mientras el desafío sigue abierto, ve la pantalla de ese desafío, no el
  formulario (RF-46, RF-45; D103).
- El usuario se equivocó de Riot ID o de región al pedir el desafío: no puede cancelarlo ni
  pedir otro desde el formulario mientras siga abierto; debe esperar a que venza (hasta 10
  minutos). Es una consecuencia aceptada (RF-45, RF-46; D103).
- La confirmación responde 429 de RF-10 o 400 de RF-9: "Ya puse el ícono" se desactiva y
  aparece "Pedir otro desafío" sin esperar a 00:00 (RF-2).
- El desafío llega a 00:00 en pantalla: "El desafío venció", "Ya puse el ícono" desactivado y
  "Pedir otro desafío" visible (RF-2). Al pulsarlo se pide un desafío nuevo con el mismo
  Riot ID y la misma región, sin pasar por el formulario; si ya pidió 5 en la última hora,
  429 de RF-21, que se muestra junto a "Pedir otro desafío", en la pantalla del desafío
  (RF-54, RF-47).
- El usuario recarga la página con un desafío abierto y después llega a 00:00: "Pedir otro
  desafío" usa el Riot ID y la región que devolvió la recuperación del desafío (RF-45,
  RF-54), que no incluye el identificador interno de Riot (RNF-3).
- El jugador cambia su Riot ID entre pedir y confirmar: si el ícono coincide, se verifica y se
  guarda el Riot ID nuevo (RF-7). Si en ese momento falla la consulta del Riot ID vigente
  (sin ser "no encontrado"), se guarda el Riot ID del desafío, en la forma que devolvió Riot
  al pedirlo, sin aviso; si el rango, las partidas y el perfil se leyeron bien, la
  verificación cuenta para la espera mínima (RF-7).
- El usuario escribió `jugador#las` al pedir y Riot devolvió `Jugador#LAS`: el Riot ID del
  desafío, el que devuelve RF-45 y el que se guardaría si falla la consulta del Riot ID
  vigente, es `Jugador#LAS` (RF-1, RF-34).
- Otro usuario verificó la cuenta con su Riot ID anterior y el jugador pide un desafío con el
  Riot ID nuevo: el texto no coincide, pero tras consultar a Riot la cuenta interna sí: 409
  (RF-5).
- Otro usuario tiene verificado `Jugador#LAS` en LAS y el jugador pide `jugador#las` en EUW:
  409 antes de consultar a Riot, porque la comparación por texto no mira la región (RF-5).
- Riot ID con 2 caracteres de etiqueta (válido en la spec 004): 400 al pedir el desafío, sin
  consultar a Riot (RF-18).
- Riot ID `" Jugador#LAS "`: se recorta y es válido (RF-18). Riot ID con una etiqueta `ÉLA`,
  un salto de línea en el nombre, un nombre de 17 unidades UTF-16 (un emoji cuenta como 2),
  el campo ausente o un número en lugar de texto: el mismo 400 (RF-18).
- Riot ID válido en formato pero sin perfil de LoL en la región pedida: 404 (RF-3).
- Usuario con LoL vinculado a mano en LAS que pide verificar en EUW: 409 "desvincula primero
  tu cuenta de LoL de LAS" (RF-20); en LAS, la verificación reemplaza la cuenta manual (spec
  012, RF-13).
- Sexto desafío creado en una hora: 429 con el tiempo de espera (RF-21). Cinco peticiones
  rechazadas (por ejemplo, 404) no impiden pedir uno (RF-21).
- El usuario vincula, desvincula o cambia la región de su LoL manual con un desafío abierto,
  o esa cuenta se desvincula sola porque otro usuario la verificó o porque la
  resincronización de otro usuario trajo ese Riot ID: el desafío se anula (RF-29, RF-14).
- El servidor se reinicia con un desafío abierto: sigue abierto hasta su vencimiento original
  (RF-28).
- La clave caduca entre pedir el desafío y confirmarlo: 503 (cuenta como intento); al
  renovarla, el desafío sigue vigente si no pasaron 10 minutos (RF-16, RF-17).
- El limitador no tiene hueco para las 24 consultas de una confirmación en la ventana
  deslizante de 2 minutos: 503 "Riot Games está ocupado…" al momento, sin consultar a Riot
  y sin contar como intento (RF-37).
- Confirmación con ícono distinto: usa 1 de las 24 consultas reservadas y libera el resto
  al terminar, así que varias confirmaciones fallidas seguidas no agotan las 100 de 2
  minutos (RF-37).
- Riot responde 429 a mitad de la lectura pese a la reserva: la cuenta queda verificada con
  datos pendientes en los bloques que fallaron; si el 429 llega en el detalle de una
  partida, solo se omite esa partida (RF-37, RF-27, RF-11).
- Falla la consulta del detalle de 2 de las 20 partidas: se muestran las otras (menos las
  anuladas) y el bloque de partidas no queda pendiente (RF-11). Falla la consulta de la
  lista de partidas: bloque de partidas pendiente al verificar (RF-27) o con sus datos
  anteriores al resincronizar (RF-53).
- La imagen del ícono en la pantalla del desafío o en el perfil la carga el navegador desde
  Data Dragon y no gasta consultas del limitador (RF-2, RF-40, RF-37).
- Riot confirma el ícono, lee el rango pero falla al leer las partidas: verificada, con el
  rango a la vista y "Datos pendientes de Riot Games" en las partidas; 200 con el aviso de
  "algunos de sus datos"; se puede resincronizar de inmediato (RF-27); sigue en las
  coincidencias con su rango (RF-44).
- Riot confirma el ícono pero falla al leer el rango: "Datos pendientes de Riot Games" en el
  rango; queda fuera de las coincidencias y su dueño recibe 409 al buscar candidatos de LoL
  hasta que una resincronización lea el rango (RF-44).
- Riot confirma el ícono pero fallan el rango y las partidas: aviso "no pudimos leer sus
  datos", tanto si el perfil se leyó bien como si quedó pendiente (RF-27). Si falla solo uno
  de esos dos bloques, con o sin el perfil, el aviso es el de "algunos de sus datos" (RF-27).
- Riot confirma el ícono pero entrega el nivel del perfil con un dato que no se puede
  interpretar o sin él (RF-52), y lee bien el rango y las partidas: verificada, "Datos
  pendientes de Riot Games" solo en el perfil (el ícono de invocador se muestra igual,
  RF-40), aviso de "algunos de sus datos" (RF-27); sigue en las coincidencias con su rango
  (RF-44); se puede resincronizar de inmediato.
- Al confirmar, Riot entrega el perfil sin un ícono que se pueda leer: 503, confirmación
  contada (RF-26, RF-52).
- Resincronización en la que falla la consulta de la cuenta o del perfil: 503 (o 404 de
  RF-35) y nada cambia (RF-51).
- Resincronización en la que se leen la cuenta, el perfil y el rango pero fallan las
  partidas: el rango se actualiza, las partidas conservan las anteriores (no pasan a "Datos
  pendientes"), 200 con aviso, y se puede resincronizar de inmediato (RF-53).
- Verificación con todos los datos leídos: la siguiente resincronización espera 5 minutos
  (RF-7; spec 012, RF-16).
- Las 20 partidas Solo/Dúo más recientes incluyen 3 remakes: se muestran 17 (RF-11). Cuenta
  con menos de 20 partidas Solo/Dúo: se muestran las que haya; ninguna: lista vacía. Las
  partidas de otras colas no se leen (RF-11).
- Partida de 29 min 30 s: "30 min"; de 29 min 29 s: "29 min" (RF-12).
- Dos partidas Solo/Dúo entre dos lecturas, o un ascenso de división: esas partidas muestran
  "—" (RF-30).
- Entre dos lecturas hay una partida Solo/Dúo y un remake: la partida recibe la variación
  (RF-30).
- Master 50 LP → Master 80 LP con una partida nueva: +30 (RF-30). Master → Grandmaster: "—".
- Una partida con variación +18 sigue mostrando +18 en todas las lecturas posteriores
  (RF-30).
- Lectura en la que se leen las partidas pero falla el rango (RF-27 o RF-53): sus partidas
  nuevas quedan con "—" (RF-30), de momento (ver el caso siguiente).
- Una partida queda con "—" en una lectura en la que falló el rango; la siguiente lectura
  completa la trae como única partida nueva respecto de la lectura anterior y sin cambio de
  división: recibe su variación, porque "—" no es una variación asignada (RF-30; D81). Si
  esa lectura completa trae además otra partida nueva o hay cambio de división o de tier,
  sigue con "—"; y una vez que la lectura anterior ya la incluye, deja de ser partida nueva
  y su "—" ya no cambia (RF-30).
- Verificación con el rango pendiente y las partidas leídas, seguida de una
  resincronización completa: no hay lectura anterior completa, así que las partidas siguen
  con "—" (RF-30).
- Lectura en la que fallan el rango o las partidas, seguida de una lectura completa: la
  lectura anterior para RF-30 es la última completa de rango y partidas, no la parcial
  (Definiciones, RF-30).
- Lectura B que lee el rango y la lista de partidas pero omite la partida nueva n1 (falló su
  detalle): B no es completa para RF-30, así que sus partidas nuevas quedan con "—" y no
  sirve de lectura anterior. Si la lectura completa C trae n1 como única partida nueva
  respecto de la última completa A, sin cambio de división, n1 recibe los LP de C menos los
  de A, no un +0 falso calculado contra B (RF-30; D102). El bloque de partidas de B sigue
  contando como leído para el aviso y la espera mínima (RF-7, RF-27, RF-53).
- Cuenta en Challenger con 1 450 LP: se acepta (RF-31); la interfaz muestra "CHALLENGER"
  sin la división "I" que entrega Riot, y el rango normalizado no lleva división (RF-36).
- Riot entrega LP negativos: fallo de Riot, 503 al pedir o, tras confirmar el ícono, el
  rango queda pendiente; al resincronizar, el rango conserva sus datos anteriores (RF-52,
  RF-53). Una partida sin resultado: se omite solo esa partida (RF-11, RF-52). Un tier que
  no está en la escala: se normaliza a 0 (RF-36).
- Riot entrega GOLD con una división desconocida: no es un fallo; se muestra como la
  entrega Riot y se normaliza como Gold de la división más baja (spec 004, DP-26). Riot
  entrega MASTER con cualquier división: se ignora y se muestra "MASTER" (RF-36).
- Riot entrega GOLD II: la interfaz muestra "GOLD II" y la distancia de rango se calcula con
  Gold II de la escala de la spec 004 (RF-36).
- Cuenta verificada que deja de estar clasificada al cambiar de temporada: "sin clasificar"
  (RF-13), sin punto nuevo en el historial, que conserva los anteriores (RF-32); si busca
  candidatos de LoL, 409 (RF-33), incluso sin clave de Riot; con un filtro inválido, antes el
  400 del filtro (RF-33).
- La cuenta vuelve a tener rango y es el mismo del último punto del historial: no se añade
  punto (RF-32).
- Al resincronizar, el Riot ID nuevo coincide con una cuenta vinculada a mano por otro
  usuario: esa vinculación se elimina (RF-14).
- Cuenta verificada transferida a otra región: 404 al resincronizar, la cuenta sigue
  verificada con sus últimos datos (RF-35).
- Resincronizar sin clave y dentro de la espera: 503 (RF-51).
- Instancia sin clave de Riot: "Verificar con Riot Games" no aparece y la API responde 503 en
  las operaciones que consultan a Riot (RF-38). Modo simulado: aparece desactivado con "No
  disponible en modo de demostración" (RF-42).
- La imagen del ícono de invocador no carga en el perfil: no se muestra nada en su lugar
  (RF-40).

## Fuera de alcance
- Riot Sign On (inicio de sesión oficial de Riot) y la clave de producción.
- Otras colas (Flex, ARAM) y otros juegos de Riot (Valorant, TFT).
- Renovación automática de la clave.
- Iniciar sesión o registrarse en TeamMatchUp con Riot.
- Cambiar de región una cuenta verificada sin desvincularla (RF-35).
- Cambiar la vinculación manual de la spec 004 (RF-18).
- Traducir al español los textos de Riot (RF-36; ver "Conflicto con la constitución").

## Criterios de finalización
- [x] RF de backend (RF-1, RF-3 a RF-11, RF-13, RF-14, RF-16, RF-18 a RF-38, RF-43 a RF-45 y
      RF-48 a RF-53 en su parte de API) cubiertos por pruebas con node:test en verde, sin
      red ni clave real, simulando Riot con dobles de prueba (RNF-2; D23, D88).
- [x] RF-12 en su parte de backend: pruebas con node:test de la duración redondeada (29 min
      29 s → 29; 29 min 30 s → 30) y de que una partida sin variación llega sin ella (la
      interfaz muestra "—"), incluida la que conserva su variación en lecturas posteriores
      (D65); y de RF-30 con lecturas parciales: la lectura anterior es la última completa de
      rango y partidas, y una lectura con el rango fallido deja sus partidas nuevas sin
      variación (D78); y de que una partida con "—" de una lectura no completa recibe
      variación en la siguiente lectura completa si es la única nueva y no hay cambio de
      división, mientras que una variación ya asignada no cambia (D81); y de que una lectura
      con alguna partida omitida deja sus partidas nuevas con "—" y no sirve de lectura
      anterior (D102).
- [x] RF-27 y RF-44 con el perfil pendiente: pruebas con node:test de que un perfil con
      datos que no se pueden interpretar deja solo ese bloque pendiente, con el aviso de
      "algunos de sus datos", y la cuenta sigue en las coincidencias; y de que con el rango y
      las partidas pendientes el aviso es "no pudimos leer sus datos" falte o no el perfil
      (D80).
- [x] RF-15: una prueba con node:test verifica una cuenta, la resincroniza con Riot simulado
      devolviendo otro ícono y comprueba que sigue verificada (D65).
- [x] RF-45: pruebas con node:test de la recuperación del desafío (con desafío abierto, sin
      ninguno, con uno vencido o anulado y sin clave de Riot), sin ninguna consulta al doble
      de Riot, que comprueban que la respuesta trae los segundos que le quedan, el Riot ID
      del desafío en la forma que devolvió Riot (no el texto escrito) y la región, y no el
      identificador interno de Riot (D65, D76, D86, D100).
- [x] RF-49: pruebas con node:test de que, con una operación en curso (pedir, confirmar o
      resincronizar), otra de ellas del mismo usuario recibe 409 sin consultar a Riot y sin
      contar para ningún límite, incluidas dos resincronizaciones simultáneas, y de que la
      recuperación del desafío no se ve afectada (D90).
- [x] RF-26 (paso 3) y RF-29: una prueba con node:test anula el desafío (por ejemplo,
      desvinculando el LoL manual) mientras su confirmación espera al doble de Riot con el
      ícono coincidente, y comprueba el 400 de RF-9, que ninguna cuenta queda verificada y
      que la confirmación cuenta como intento (D104).
- [x] RNF-1: una prueba con Riot simulado recorre una verificación completa (pedido, 9
      confirmaciones fallidas y una con éxito) y cuenta como máximo 35 consultas al doble de
      Riot; y pruebas del limitador con el instante controlado por la prueba: reservas de 2,
      24 y 24 y ventanas deslizantes de 1 segundo y de 2 minutos (D65, D84, D85).
- [x] RNF-3: una prueba recorre todas las respuestas de esta spec (pedir, recuperar,
      confirmar, resincronizar, cuentas y coincidencias) y comprueba que el identificador
      interno de Riot del doble no aparece en ninguna (D65).
- [x] RNF-4: una prueba con una clave de prueba falsa provoca errores de Riot y comprueba que
      la clave no aparece en los registros ni en los mensajes de error (D65).
- [x] RNF-6: una prueba con un doble de Riot que no responde comprueba el 503 a los 8
      segundos (con el instante controlado por la prueba) (D65).
- [x] RNF-7: pruebas con un doble de Riot lento y el instante controlado por la prueba: al
      pedir y al resincronizar, 503 a los 60 segundos sin cambios; al confirmar, 503 si el
      ícono aún no se había confirmado y verificación con datos pendientes (RF-27) si ya se
      había confirmado (D98).
- [x] RNF-5: las dependencias de los `package.json` del backend y del frontend no cambian
      (D88).
- [x] RF-17 cubierto por una prueba que arranca el servidor dos veces con claves de prueba
      falsas distintas (D23).
- [x] RF de interfaz (RF-2, RF-7 y RF-27 en su aviso, RF-12, RF-13 y RF-33 en su aviso,
      RF-35 en su aviso, RF-36, RF-38 en el botón oculto, RF-39 a RF-42, RF-45 al recargar la
      página, RF-46, RF-47, RF-53 en su aviso y RF-54; en RF-2, también la cuenta atrás con
      los segundos de la API, el botón "Volver" y "Pedir otro desafío" tras una respuesta que
      anula el desafío; en RF-45, la recarga con el desafío vencido; en RF-46, la pantalla
      del desafío abierto al volver a elegir "Verificar con Riot Games" tras "Volver"):
      build, typecheck y lint del frontend en verde y comprobación manual en Chrome DevTools
      durante la validación (D23, D99, D100, D101, D103).
- [x] Recorrido manual con una cuenta de LoL real: pedir el ícono, ponérselo, confirmar, ver
      rango y partidas, resincronizar, volver al ícono propio, desvincular.
- [x] Procedimiento de renovación de la clave en `.env` documentado para el servidor del
      curso.

## Impacto en otras specs y documentos
Por decisión del usuario (2026-11-18), como en la 013, los archivos de otras specs no se
editan: los ajustes quedan registrados aquí.
- **Spec 004**: la variación de rango de una partida pasa a ser opcional en las partidas de
  origen Riot (RF-30); los LP de origen Riot no tienen tope superior, y el tope de 999 de
  Master, Grandmaster y Challenger sigue solo para la carga manual (RF-31); el formato del
  Riot ID para verificar es más estricto que el de la vinculación manual, que no cambia
  (RF-18); el Riot ID de una cuenta verificada se guarda como lo devuelve Riot (RF-34); el
  tier y la división de origen Riot se guardan y se muestran como los entrega Riot, y además
  el tier normalizado a su escala (RF-36); la duración de las partidas de origen Riot se
  redondea al minuto más cercano (RF-12); editar la región de la cuenta manual de LoL (su
  RF-8) anula el desafío abierto (RF-29).
- **Spec 005**: una cuenta de LoL verificada sin clasificar o con el rango pendiente no
  participa en las coincidencias como candidata (RF-13, RF-44), y su dueño recibe 409
  "necesitas rango en Solo/Dúo para buscar en LoL" al buscar candidatos de LoL (RF-33,
  RF-44), después de los 400 de los filtros de su RF-16; la distancia de rango usa el tier
  normalizado (RF-36).
- **Spec 007**: "Verificar con Riot Games" en la fila de la cuenta de LoL sin verificar
  (perfil y Configuración) y sobre el formulario de vínculo de LoL, oculto si ya hay una
  verificada o sin clave, y desactivado en modo simulado (RF-38, RF-39, RF-42); formulario
  del pedido (RF-46); pantalla del desafío con "Ya puse el ícono" y "Pedir otro desafío"
  (RF-2), que pide directamente un desafío nuevo (RF-54) y aparece también tras una respuesta
  que anula el desafío; botón "Volver" y ningún "Cancelar"; con un desafío abierto, "Verificar
  con Riot Games" muestra su pantalla en lugar del formulario (RF-46); cuenta atrás con los segundos
  que devuelve la API (RF-2); recuperada al recargar con su Riot ID y su región, o el
  formulario si ya venció (RF-45); errores junto al formulario, a "Ya puse el ícono" o a
  "Pedir otro desafío" (RF-47); imágenes de Data Dragon cargadas por el navegador (RF-2,
  RF-40); texto junto a "Resincronizar" de las cuentas verificadas con Riot (RF-41); nivel e ícono de
  invocador en el bloque de LoL (RF-40); fecha de las partidas en la zona horaria del
  navegador y variación "—" en las partidas sin variación (RF-12); aviso de RF-33 en
  coincidencias; "Datos pendientes de Riot Games" por bloque (también el perfil, con el ícono
  visible) y aviso según
  falten el rango y las partidas o cualquier otra combinación de bloques (RF-27); aviso de resincronización parcial (RF-53); en Master, Grandmaster y
  Challenger, solo el tier (RF-36).
- **Spec 008**: la ficha de jugador muestra la marca "Verificada con Riot Games", el nivel y
  el ícono en el bloque de LoL (RF-40), "sin clasificar" (RF-13), "Datos pendientes de Riot
  Games" por bloque (RF-27) y "—" en las partidas sin variación (RF-12).
- **Spec 010**: agrega la clave de Riot como secreto del servidor en `.env` y su renovación
  manual (RNF-4).
- **Spec 012**: el historial de una cuenta de LoL verificada se construye con sus propias
  lecturas, y pasar a "sin clasificar" o volver al mismo rango no añade punto (RF-32, sobre
  su RF-9); una verificación con el rango, las partidas y el perfil leídos cuenta como la
  última resincronización exitosa aunque falle la consulta del Riot ID vigente, y una con
  datos pendientes no cuenta para la espera mínima (RF-7, RF-27, sobre su RF-16); la
  identidad nunca queda en "Datos pendientes" (RF-7); una resincronización concurrente del
  mismo usuario recibe 409 (RF-49); su RF-11 también se aplica al resincronizar cuando
  cambia el Riot ID (RF-14) y, cuando desvincula la cuenta manual de LoL de un usuario (al
  verificar o al resincronizar), anula su desafío abierto (RF-29);
  su RF-21 cubre también la cuenta transferida a otra región, con texto propio (RF-35); el
  503 del limitador propio tiene texto propio (RF-37), y los demás 503 usan el de su RF-19
  (RF-16, RF-38); una lectura parcial no es un 503 (RF-27, RF-53), y una lectura en la que
  falló el rango o las partidas, o en la que se omitió alguna partida, no sirve de lectura
  anterior para la variación de LP y una partida con "—" de esa lectura (o omitida en ella)
  puede recibir variación en la siguiente lectura completa (RF-30); al resincronizar, un
  bloque que falla conserva sus datos anteriores como en su RF-19 y esa resincronización
  parcial no cuenta como exitosa para su RF-16 (RF-53); una partida cuyo detalle falla se
  omite sin dejar el bloque fallido (RF-11); una operación con Riot dura como máximo 60 s
  (RNF-7), además del tiempo de espera por consulta de su RNF-5 (RNF-6).
- **`PRODUCT.md`**: "Evidence on Hand" y "Capabilities" se actualizan al implementar esta
  spec (spec 012, "Impacto").

## Dudas abiertas
Las 12 dudas de la primera corrección se respondieron el 2026-11-18 (D25 a D36) y las 7
dudas y 2 interpretaciones que dejó la aplicación de D37 a D66, también el 2026-11-18 (D67
a D75); las 4 incoherencias que señaló esa pasada se resolvieron el 2026-11-18 (D76 a D79),
las 2 que señaló la aplicación de D76 a D79, también el 2026-11-18 (D80 y D81), y los
hallazgos menores de la tercera revisión del QA, el 2026-11-18 (D82 a D101). Las 3 dudas
que dejó la aplicación de D82 a D101 (partidas omitidas y variación de LP, recuperación del
desafío tras "Volver" y desafío anulado durante su confirmación) y las 2 interpretaciones
de esa pasada se cerraron el 2026-11-18 (D102 a D104, D91 y D98).

Ninguna.

Los textos nuevos de D30, D41, D58, D68 (aviso de RF-53) y D72 (aviso de RF-27, ajustado por
D79 y D80) quedan revisados con la aprobación de la spec (2026-11-18). Queda aceptado, y no
abierto, el choque con el principio 6 de la constitución descrito a continuación.

### Conflicto con la constitución (aceptado por el usuario)
- **Principio 6 (idioma).** La constitución dice que la interfaz está en español por defecto.
  RF-36 muestra en la interfaz textos de Riot sin traducir (niveles de rango como GOLD II y
  nombres de campeones en inglés, como MonkeyKing), lo que choca con ese principio. El
  usuario lo decidió así a sabiendas el 2026-11-18 (D24, D36, D48) y no se cambia en esta
  spec. La constitución no se edita desde aquí.
