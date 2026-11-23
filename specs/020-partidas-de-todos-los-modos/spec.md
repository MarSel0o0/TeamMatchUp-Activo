# Spec 020 — Partidas de todos los modos en la ficha de LoL
Estado: aprobada (2026-11-22, usuario)

Historial: borrador del 2026-11-22. Las decisiones D1 y D2 las tomó el usuario (2026-11-22); D3 a D8 son las
opciones recomendadas por el planificador (el usuario pidió «haz todo lo recomendado»). El usuario aprobó la spec
completa el 2026-11-22, con D3 a D8 tal como están. Corrección de redacción del 2026-11-22, al leer el código para el
plan (sin cambiar ninguna decisión): la lista de partidas de una cuenta no se reemplaza en cada lectura, se une con
la guardada (specs 004 y 014), así que «las 20 leídas» pasa a llamarse «las guardadas» (Definiciones, RF-3, RF-5, RF-7,
RF-12 y el caso límite de las partidas anteriores).

## Contexto y objetivo

Hoy la ficha de una cuenta de LoL verificada con Riot solo enseña partidas clasificatorias Solo/Dúo: es lo único que se
pide a Riot (spec 014, RF-11, D39). Un jugador que juega normales, ARAM o Flex ve una lista de partidas que no refleja
lo que ha jugado, y a quien consulta su ficha le falta esa información para decidir si encaja con él.

Esta spec hace que la ficha de LoL enseñe las partidas de cualquier modo, repartidas en pestañas por modo y con una
pestaña «Todas» donde se ven juntas. No aumenta el número de partidas que se leen: se siguen leyendo las 20 más
recientes, ahora de cualquier modo, con el mismo presupuesto de consultas a Riot. El porcentaje de victorias sigue
midiendo solo la partida clasificatoria Solo/Dúo, y la variación de LP sigue existiendo solo para ella.

Corrige parcialmente la spec 014 (sección «Cambio sobre otras specs»). Solo afecta a LoL con datos reales de Riot: Steam,
CS2, R6 y las cuentas de LoL con datos simulados no cambian.

## Usuarios

- Jugador de LoL con una cuenta verificada con Riot, que ve en su ficha las partidas de todos los modos que juega.
- Cualquier jugador que consulta la ficha de otro, que ve las partidas de LoL de ese jugador por modo.

## Historias de usuario

- HU-1. Como jugador de LoL, quiero que mi ficha muestre mis partidas de normales, ARAM y Flex además de Solo/Dúo, para
  que refleje lo que realmente juego.
- HU-2. Como jugador que consulta la ficha de otro, quiero filtrar sus partidas por modo, para valorar cómo juega en el
  modo que me interesa.
- HU-3. Como jugador de LoL, quiero que mi porcentaje de victorias y mi variación de LP sigan siendo solo los de
  Solo/Dúo, para que no se mezclen con modos donde no hay rango.

## Definiciones

- **Modo de partida**: la clasificación de una partida de LoL según la cola que informa Riot. Solo hay seis valores:
  - **Solo/Dúo**: la cola clasificatoria Solo/Dúo (identificador de cola 420).
  - **Flex**: la cola clasificatoria Flexible (440).
  - **Normales**: normal con selección (400), normal a ciegas (430) y partida rápida (490).
  - **ARAM**: ARAM (450).
  - **Otros**: cualquier otra cola (Arena, URF, Clash, eventos, partidas personalizadas…) y una partida cuyo detalle no
    informa la cola.
  - (La pestaña «Todas» no es un modo: reúne los de todas las partidas.)
- **Las guardadas**: las partidas de la cuenta que el sistema conserva, hasta 20: la unión de las que ya tenía y las
  20 más recientes de cualquier modo que Riot devuelve en cada lectura (menos las anuladas y las omitidas, RF-1), sin
  repetidos y ordenadas de la más reciente a la más antigua, como en las specs 004 (RF-15, RF-28) y 014. Son las únicas
  que la ficha puede enseñar.
- **Partida nueva (para la variación de LP)**: una partida de modo Solo/Dúo, no anulada, que no estaba en la lectura
  anterior. Las partidas nuevas de otros modos no cuentan como partidas nuevas a efectos de la spec 014, RF-30.
- **Ficha**: la ficha del jugador (spec 008), propia o de otro, en la que se muestran las partidas de una cuenta.

## Requisitos funcionales

### Lectura y guardado

- RF-1: CUANDO una cuenta de LoL queda verificada con Riot o se resincroniza, EL SISTEMA obtiene de Riot las 20 partidas
  más recientes de cualquier modo, descarta las anuladas con el criterio vigente (spec 014, D10) y las marca con origen
  Riot Games. SI falla la consulta del detalle de una partida, o trae datos que no se pueden interpretar (spec 014,
  RF-52), ENTONCES omite solo esa partida. El bloque de partidas solo falla si falla la consulta de la lista (spec 014,
  RF-27, RF-53, D83). Por tanto la ficha puede mostrar menos de 20 partidas leídas.
- RF-2: EL SISTEMA guarda con cada partida real su modo de partida (Definiciones).
- RF-3: MIENTRAS una partida guardada antes de esta spec no tiene modo, EL SISTEMA la trata como de modo Solo/Dúo, porque
  todas las guardadas hasta ahora lo eran. Esas partidas conviven con las nuevas hasta que las más recientes las
  desplazan de las 20 guardadas.
- RF-4: SI una partida real no informa su cola, ENTONCES EL SISTEMA le asigna el modo Otros.

### Pestañas de la ficha

- RF-5: MIENTRAS la ficha muestra las partidas de una cuenta de LoL cuyo bloque de partidas tiene origen Riot Games y
  tiene al menos una partida, EL SISTEMA muestra sobre la lista unas pestañas con «Todas» y, de entre «Solo/Dúo»,
  «Flex», «Normales», «ARAM» y «Otros», solo las de los modos con al menos una partida entre las guardadas (D3). El orden
  es fijo: Todas, Solo/Dúo, Flex, Normales, ARAM, Otros.
- RF-6: CUANDO se abre la ficha de una cuenta de LoL, EL SISTEMA deja elegida la pestaña «Todas».
- RF-7: MIENTRAS una pestaña está elegida, EL SISTEMA muestra en la lista las 8 partidas más recientes de las guardadas
  que cumplen su filtro (en «Todas», las de cualquier modo; en las demás, las de ese modo), de la más reciente a la más
  antigua, o todas las que haya si son menos de 8 (D1). Cada partida conserva el formato de la spec 014, RF-12.
- RF-8: MIENTRAS está elegida la pestaña «Todas», EL SISTEMA indica en cada fila de partida su modo de partida, con el
  nombre de la pestaña correspondiente (D5).
- RF-9: CUANDO el usuario cambia de pestaña, EL SISTEMA actualiza la lista sin recargar la página y sin consultar de nuevo
  a Riot ni al servidor.
- RF-10: SI tras resincronizar la cuenta la pestaña elegida deja de existir (ya no hay partidas de ese modo), ENTONCES EL
  SISTEMA vuelve a la pestaña «Todas».
- RF-11: EL SISTEMA permite recorrer las pestañas de partidas solo con el teclado, con el mismo patrón que las pestañas
  de juego de la ficha (spec 008, RNF-2): flechas izquierda y derecha pasan a la anterior y a la siguiente, Inicio y Fin
  a la primera y a la última, y cada pestaña está asociada al panel que muestra, con foco visible.

### Porcentaje de victorias y variación de LP

- RF-12: EL SISTEMA calcula el porcentaje de victorias de una cuenta de LoL con origen Riot Games solo con las 8 partidas
  más recientes de modo Solo/Dúo entre las guardadas (o con las que haya si son menos), con el redondeo de la spec 004, y
  no depende de la pestaña elegida (D2). SI no hay ninguna partida de Solo/Dúo entre las guardadas, ENTONCES muestra
  «sin datos» como hoy, sin afectar al rango ni al resto de la ficha.
- RF-13: EL SISTEMA muestra la variación de LP solo en partidas de modo Solo/Dúo; en las partidas de los demás modos
  muestra «—» siempre.
- RF-14: CUANDO una lectura completa de rango y partidas (spec 014, Definiciones) trae exactamente una partida nueva
  (Definiciones: solo cuentan las de modo Solo/Dúo no anuladas) respecto de la lectura anterior, EL SISTEMA aplica la
  spec 014, RF-30 sin otro cambio. Una partida nueva de otro modo no cuenta ni impide asignar la variación, y no recibe
  nunca variación.
- RF-15: SI en una lectura se omite alguna partida (RF-1), de cualquier modo, ENTONCES la lectura no es completa a efectos
  de la spec 014, RF-30 (D4: sin su detalle no se sabe de qué modo era). Las anuladas descartadas no son partidas
  omitidas.

### Lo que no cambia

- RF-16: MIENTRAS el bloque de partidas de una cuenta de LoL tiene origen simulado, o la cuenta es de CS2 o de R6, EL
  SISTEMA muestra las partidas, la tasa de victorias y el resumen como hasta ahora, sin pestañas (D6).
- RF-17: MIENTRAS el bloque de partidas está pendiente de lectura (spec 014, RF-27) o la cuenta no tiene ninguna partida,
  EL SISTEMA muestra el aviso de pendiente o el estado vacío de hoy, sin pestañas.
- RF-18: EL SISTEMA mantiene las etiquetas de origen de la spec 012 junto al bloque de partidas («Datos de Riot Games»).

## Requisitos no funcionales

- RNF-1: Las consultas a Riot de una lectura no aumentan: la verificación completa sigue usando como máximo 35 consultas y
  una resincronización 24 (spec 014, RNF-1, D84). No se hace ninguna consulta extra por modo; el modo sale del detalle de
  la propia partida.
- RNF-2: Las pruebas simulan Riot y pasan sin conexión ni clave (spec 012, RNF-1; spec 014, RNF-2).
- RNF-3: Los textos nuevos van en español; las pestañas no se descartan por falta de ancho: en un ancho de 360 px las seis
  pestañas siguen siendo operables y no desbordan la ficha.
- RNF-4: Las reglas que clasifican el modo y calculan el porcentaje de victorias y la variación de LP son funciones puras
  con pruebas, escritas antes que el código (constitución, principio 4).
- RNF-5: Ninguna respuesta nueva incluye el identificador interno de Riot de la cuenta ni los de las partidas más allá de
  lo que ya incluyen hoy (spec 014, RNF-3).

## Casos límite

- Las 20 partidas son de un solo modo: aparecen «Todas» y esa pestaña; ambas muestran las mismas 8 partidas.
- Ninguna de las 20 es de Solo/Dúo: no hay pestaña «Solo/Dúo»; el porcentaje de victorias dice «sin datos» y el rango
  sigue mostrándose.
- Un modo tiene más de 8 partidas entre las 20: su pestaña muestra solo las 8 más recientes; el resto no se ve en esta
  versión.
- Cola desconocida o futura (un identificador que no está en las definiciones): modo Otros.
- Partidas guardadas antes de esta spec: se tratan como Solo/Dúo mientras sigan guardadas (RF-3); su variación de LP ya
  asignada se conserva (spec 014, D37).
- Una lectura con una sola partida nueva de ARAM y ninguna de Solo/Dúo: no hay partida nueva a efectos de la variación;
  las partidas anteriores conservan la suya.
- Una partida omitida (falló su detalle): puede haber sido de Solo/Dúo; por eso la lectura no es completa (RF-15).
- Cuenta con 0 partidas leídas (todas anuladas o ninguna jugada): estado vacío, sin pestañas.
- Ficha de otro jugador: mismas pestañas y mismo cálculo; la pestaña elegida no se comparte entre fichas ni se recuerda
  entre visitas.
- Cambio de juego en la ficha (LoL → CS2 → LoL): vuelve a «Todas» (RF-6).

## Fuera de alcance

- Leer 20 partidas por modo, o más de 20 en total (opción B descartada por el usuario, 2026-11-22): exigiría rehacer los
  límites de consultas de la spec 014.
- Mostrar más de 8 partidas por pestaña, paginar o «ver más».
- Rango y LP de Flex, o cualquier rango fuera de Solo/Dúo.
- Porcentaje de victorias por pestaña o por modo.
- Recordar la pestaña elegida entre visitas o ponerla en la dirección.
- Partidas de TFT u otros juegos de Riot; historial de Steam, CS2 o R6; las cuentas de LoL con datos simulados.
- Mostrar campeón, asesinatos u otros datos nuevos por partida: el formato de fila no cambia, salvo el modo en «Todas».
- Usar los modos en las coincidencias o en las sesiones.
- Una versión en inglés de las pestañas (constitución, principio 6).

## Cambio sobre otras specs

Al aprobar esta spec, las anotaciones de abajo se aplican a la 014 (y a la ficha de la 008 y al resumen de la 004), en
este orden: primero la spec, luego plan y tareas, luego el código.

| Dónde | Hoy | Pasa a ser |
|---|---|---|
| 014, RF-11 y D39 | Las 20 partidas clasificatorias Solo/Dúo más recientes | Las 20 más recientes de cualquier modo (RF-1 de esta spec); el resto de RF-11 no cambia |
| 014, RF-12 | Formato de cada partida | Igual; en la pestaña «Todas» se añade el modo (RF-8) |
| 014, RF-30 y Definiciones («partida nueva») | Cualquier partida nueva no anulada | Solo las de modo Solo/Dúo (RF-14); la regla de omitidas (D102) se amplía a partidas de cualquier modo (RF-15) |
| 014, RNF-1 y D84 | 24 consultas por lectura: la lista y 20 detalles | Sin cambio en el número; la lista deja de filtrar por cola |
| 014, D10 (variación de LP) | Variación en las partidas leídas | Solo en las de Solo/Dúo (RF-13) |
| 004, «Resumen por juego», tasa de victorias | Sobre las 8 partidas del resumen | Para LoL real, sobre las 8 más recientes de Solo/Dúo (RF-12); para los demás, igual |
| 008, ficha | Una sola lista de partidas por cuenta | Pestañas por modo en LoL real (RF-5 a RF-11) |

## Criterios de finalización

- [ ] Una cuenta de LoL con 20 partidas de modos mezclados (Solo/Dúo, Flex, Normales, ARAM, otras) guarda cada una con su
      modo; una cola desconocida y una partida sin cola caen en «Otros».
- [ ] La lista de partidas que se pide a Riot ya no filtra por cola, y la lectura sigue usando 24 consultas (comprobado
      con el limitador simulado) y 35 como máximo en una verificación completa.
- [ ] La ficha muestra «Todas» más las pestañas de los modos con partidas, en el orden fijo, y cada pestaña muestra sus 8
      más recientes; con partidas de 3 modos solo hay 4 pestañas.
- [ ] En «Todas» cada fila dice su modo; en las demás pestañas no hace falta.
- [ ] El porcentaje de victorias no cambia al cambiar de pestaña y cuenta solo las 8 últimas de Solo/Dúo; sin Solo/Dúo
      dice «sin datos».
- [ ] Una partida de ARAM o de normales muestra «—» como variación; una partida nueva de Solo/Dúo sola en una lectura
      completa recibe su variación; una partida nueva de ARAM junto a ella no lo impide.
- [ ] Una lectura con una partida omitida no sirve de lectura anterior, aunque la omitida fuera de otro modo.
- [ ] Las partidas guardadas antes de esta spec se ven como Solo/Dúo, con la variación que ya tenían.
- [ ] Una cuenta de LoL con partidas simuladas, y las cuentas de CS2 y R6, se ven exactamente como antes, sin pestañas.
- [ ] El cambio de pestaña no recarga la página ni hace consultas; las flechas, Inicio y Fin recorren las pestañas con
      foco visible; si el modo de la pestaña elegida desaparece al resincronizar, se vuelve a «Todas».
- [ ] A 360 px de ancho las pestañas no desbordan la ficha y se pueden operar.
- [ ] Las reglas puras (clasificación del modo, porcentaje de victorias, partida nueva) tienen pruebas escritas antes que
      el código; todas las pruebas, el `typecheck`, el `lint` y la compilación pasan en verde, sin conexión ni clave.

## Dudas abiertas

Sin dudas bloqueantes. Decisiones y propuestas del planificador que el usuario confirma o cambia al aprobar:

- D1 (decidida por el usuario, 2026-11-22). Cada pestaña muestra hasta 8 partidas, sacadas de las guardadas.
- D2 (decidida por el usuario, 2026-11-22). El porcentaje de victorias cuenta solo Solo/Dúo, sobre las 8 más recientes de
  ese modo entre las 20, y no cambia con la pestaña.
- D3 (propuesta). Solo hay pestañas de los modos con al menos una partida, más «Todas»; así no hay pestañas vacías.
  Alternativa: las seis siempre, con un estado vacío en las que no tengan partidas.
- D4 (propuesta). Una partida omitida de cualquier modo vuelve incompleta la lectura para la variación de LP: es lo
  conservador, porque no se puede saber si era de Solo/Dúo.
- D5 (propuesta). En «Todas» cada fila indica su modo; en las demás pestañas no.
- D6 (propuesta). Las cuentas con partidas simuladas no tienen pestañas: no hay modos reales y inventarlos rozaría el
  principio 5 de la constitución.
- D7 (propuesta). «Normales» agrupa normal con selección, normal a ciegas y partida rápida; Clash, Arena, URF y eventos
  van a «Otros».
- D8 (propuesta). Una partida que no informa su cola se trata como «Otros» (hoy el sistema la aceptaría como Solo/Dúo).
