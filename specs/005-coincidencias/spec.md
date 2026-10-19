# Spec 005 — Coincidencias en el servidor
Estado: implementada (2026-10-19); cambios A (RF-13) y B (textos, DP5-17) aprobados e implementados; validada por el reviewer RF por RF (T1–T10); 1567 tests en verde
- Cambio A (RF-13, por RF-44 de la spec 004): aprobado e implementado (2026-10-19, T9).
- Cambio B (textos de error, DP-6 de la 004; DP5-17): aprobado e implementado (2026-10-19,
  T10).
Pruebas sin conexión a Internet: el usuario confirmó el 2026-10-19 que ejecutó `npm test` con
la red desconectada (1567/1567 tests, 220 suites, 0 fallos, 0 cancelados, unos 100 s). Esta
spec no tiene casilla propia para ello; la cubre la de la spec 004 (RNF-1 y RNF-9), ya
marcada.
Pendiente fuera del código: la etiqueta de datos simulados con el servidor real es de la spec
007 (su casilla de "Criterios de finalización" sigue sin marcar a propósito).

Cambio A del 2026-10-19 (aprobado por el usuario el 2026-10-19): la spec 004 vigente
(reescrita el 2026-10-18; RF-44 y DP-37) responde 401 "token inválido", no "sesión no
iniciada", a la credencial de un usuario eliminado, y el usuario eligió adaptar esta spec a la
004 ("Opción A"). Cambian RF-13, un caso límite y tres criterios de finalización (reabiertos
y vueltos a marcar al terminar T9 y T10); el resto no cambia. Motivo: coherencia con RF-44 de
la 004 y con las specs 002 y 003. El plan y las tareas (T9) se aprobaron el 2026-10-19 y T9
está hecha: el código responde 401 "token inválido".

Cambio B del 2026-10-19 (aprobado por el usuario el 2026-10-19; independiente del cambio A): la spec 004
vigente fija en DP-6 que todo mensaje de error va en minúscula y sin punto final, y su
"Impacto en otras specs" dice de esta spec: "Sus mensajes deben seguir la regla de minúscula
y sin punto final." Los textos propios de esta spec (RF-5, RF-6, RF-12, RF-14, RF-15 y las
decisiones DP5-2, DP5-3, DP5-6 y DP5-12) seguían la forma anterior, con mayúscula inicial y
punto final. El cambio B los alinea con esa regla (DP5-17) y no cambia ningún otro
comportamiento. El usuario lo aprobó el 2026-10-19 ("apruebo todo con tus recomendaciones")
con las respuestas B1 a B5 de "Decisiones del usuario"; el plan y las tareas (T10) se
aprobaron el 2026-10-19 y T10 está hecha: el código responde los textos de DP5-17.

## Contexto y objetivo
El cruce de juego, rango y horario es el producto (`PRODUCT.md`, principio 1). Hoy lo
calcula la interfaz contra el backend simulado; con el servidor real, el cálculo pasa al
servidor con el mismo criterio de puntaje y la misma forma de candidato (más la marca de
datos simulados de la spec 004 y sin el correo del candidato, DP5-10), para que la vista de
coincidencias siga funcionando con los cambios mínimos que recoge "Impacto en otras specs".

Esta spec agrega la consulta de coincidencias por juego con sus filtros. Las coincidencias
se calculan en cada consulta y no se guardan.

El rango de los tres juegos lo entrega el proveedor simulado de la spec 004: toda cuenta
tiene rango, así que en LoL, R6 y CS2 las coincidencias cruzan rango y horario. Ese rango
es un dato simulado y la cuenta de cada candidato lo lleva marcado como tal (spec 004,
RF-37). Las tensiones con `PRODUCT.md` y con la constitución están en "Tensiones
reconocidas".

- Depende de: spec 004 (cuentas y rango simulado, implementada el 2026-10-19), spec 003
  (disponibilidad y datos públicos del usuario) y spec 002 (sesión y sus 401).
- Origen: HU-09; RF-16 de la spec original.
- Las decisiones técnicas ya tomadas (sección 2 —entidades—, RT-12, secciones 5.1
  —`domain/`—, 8 —`unit/` y `matches.test.ts`—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
- Las decisiones marcadas "(DP5-n)" las propuso el planificador (tabla al final). DP5-1 a
  DP5-15 las aprobó el usuario el 2026-10-17 ("Apruebo todo"); DP5-16 (cambio A), el
  2026-10-19; DP5-17 (cambio B), también el 2026-10-19. Las "DP-n" sin prefijo son las de la
  spec 004, ya aprobadas.
- Dependencia explícita con la spec 007: igual que en la spec 004, la convención de
  etiquetar los datos inventados (`AGENTS.md`, "Convenciones"; `PRODUCT.md`, principio 5)
  solo se cumple con el servidor real cuando la spec 007 muestre la etiqueta de datos
  simulados. Hoy su RF-11 oculta toda etiqueta con el servidor real, así que, hasta que la
  spec 007 cambie, la distancia y el puntaje de las coincidencias se ven sin etiqueta con el
  servidor real (ver "Criterios de finalización").

### Decisiones del usuario
- **2026-10-17 — Impacto de la spec 004 aprobado** ("Apruebo"): R6 con rango, distancia
  con el rango normalizado de DP-26, verificada fijada por el simulador, marca de datos
  simulados, cuenta sin partidas y RF-10 retirado.
- **2026-10-17 — Marca de simulado en distancia y puntaje: basta la marca de la cuenta.**
  Cuando la cuenta del candidato lleva la marca de datos simulados, la interfaz etiqueta
  también como simulados su distancia de rango y su puntaje. El candidato no lleva ningún
  campo nuevo (RNF-2, "Marca de datos simulados"; alcance aclarado en DP5-15).
- **2026-10-17 — Credencial de un usuario eliminado: 401 como en la spec 004.** Esta spec
  adopta RF-44 y DP-37 de la spec 004: 401 "sesión no iniciada" sin cambiar nada, en lugar
  del 404 de RF-6 (RF-13). *Reemplazada en cuanto al texto del 401 por la decisión del
  2026-10-19 (siguiente); se conserva el 401 en lugar del 404.*
- **2026-10-19 — Credencial de un usuario eliminado: "token inválido" ("Opción A").** Al
  validar la spec 004, el reviewer encontró que su código no seguía su spec vigente
  (reescrita el 2026-10-18), cuyo RF-44 y DP-37 responden 401 "token inválido", no "sesión
  no iniciada" (texto de la versión del 2026-10-17, que la propia DP-37 descarta). Entre las
  opciones ofrecidas para el choque con esta spec, el usuario eligió la A: la 004 manda y
  esta spec se adapta. RF-13 pasa a decir "token inválido", igual que las demás operaciones
  con sesión de las specs 002 a 004. **Aprobada por el usuario el 2026-10-19** (redacción de
  RF-13, caso límite, criterios reabiertos y DP5-16). El usuario confirmó también ese día
  que, si el usuario de la sesión desaparece entre la revisión de la sesión y la lectura de
  sus datos, la consulta responde igual 401 "token inválido" (no 404 ni 500); no añade
  ningún requisito (RF-13). **A1 (2026-10-19, "apruebo todo con tus recomendaciones"):** el
  otro intervalo de carrera, si el usuario se elimina entre la lectura de su disponibilidad
  y la de su cuenta, puede dar el 404 de RF-6 en vez del 401 de RF-13 por la cascada de la
  spec 004; se **acepta como riesgo** y no se reordena la lectura de datos. RF-13 solo
  promete el 401 para el borrado anterior a la lectura de los datos; no añade ningún
  requisito.
- **2026-10-19 — Textos de error de esta spec: minúscula inicial y sin punto final (cambio
  B, aprobado por el usuario el 2026-10-19).** Al revisar el cambio A, se vio que los textos
  propios de esta spec no siguen DP-6 de la spec 004 (minúscula y sin punto final), regla
  que la 004 declara en su "Impacto en otras specs" para los mensajes de esta spec. El
  usuario pidió alinearlos y hacerlo "en un cambio aparte" ("Alinealo y hazlo en un cambio
  aparte"). La redacción está en RF-5, RF-6, RF-12, RF-14, RF-15, los casos límite y DP5-2,
  DP5-3, DP5-5, DP5-6, DP5-12 y DP5-17. El usuario aprobó el diff y sus recomendaciones ("apruebo todo con
  tus recomendaciones", 2026-10-19), que fijan:
  - **B1:** los rótulos entre « » conservan su mayúscula inicial ("Diferencia máxima de
    rango", "Horas en común por semana", "Solo cuentas con rango verificado", "Buscar
    jugador").
  - **B2:** se mantiene la forma «filtro «…» no válido…», con «filtro» en minúscula y las
    comillas « ».
  - **B3:** las decisiones del 2026-10-17 que citan los textos anteriores ("Forma de los
    mensajes de filtro confirmada" y "RF-15 alineado con el rótulo") quedan como registro
    histórico: conservan el texto que el usuario vio ese día; los textos vigentes son los de
    los RF (DP5-17).
  - **B4:** basta una tarea de implementación (T10 del plan de tareas) con aserciones por
    literal que fallen antes del cambio.
  - **B5:** los textos que la spec 007 imita (su RF-10) se anotan como pendientes de alinear
    ("Impacto en otras specs") para cuando se pueda tocar esa spec; no se modifica la 007
    ahora.
  Estas respuestas no añaden requisitos. Este cambio es independiente del cambio A.
- **2026-10-17 — Distancias distintas entre el servidor y el modo simulado del navegador:
  se acepta.** Esta spec promete la misma forma de candidato, no los mismos valores: hasta
  que la spec 007 adopte DP-26 en el modo simulado del navegador, la distancia y el puntaje
  de LoL y R6 pueden diferir entre ambos. Queda como pendiente de la spec 007 ("Impacto en
  otras specs").
- **2026-10-17 — Filtro "Solo verificadas": se mantiene y se aclara en la spec 007.** Esta
  spec no cambia el filtro (RF-8); la spec 007 debe mostrar la marca de verificada como
  simulada ("Impacto en otras specs").
- **2026-10-17 — Mensajes de error con los rótulos actuales de la interfaz** ("Rótulos
  actuales (Recomendado)"). Los mensajes de RF-12 y RF-14 nombran cada filtro con el rótulo
  que muestra hoy la vista de coincidencias: "Diferencia máxima de rango", "Horas en común
  por semana" y "Solo cuentas con rango verificado" (DP5-2). La spec 007 debe alinear su
  rótulo del filtro de verificadas ("Impacto en otras specs").
- **2026-10-17 — Spec aprobada** ("Apruebo todo"): DP5-1 a DP5-15 (DP5-2 con los rótulos
  actuales) y las tensiones reconocidas, incluida la del principio 5 de la constitución.
- **2026-10-17 — Forma de los mensajes de filtro confirmada** ("Filtro «rótulo» no válido
  (Recomendado)"): los mensajes de filtro siguen la forma "Filtro «<rótulo>» no válido: usa
  …" de RF-12 y RF-14.
- **2026-10-17 — RF-15 alineado con el rótulo de la interfaz** ("Sí, alinearlo
  (Recomendado)"; cambio aprobado tras ver el diff): el mensaje de búsqueda repetida pasa
  de "Texto de búsqueda no válido." a "Filtro «Buscar jugador» no válido.". La spec 007
  debe conservar el rótulo "Buscar jugador" ("Impacto en otras specs").

### Tensiones reconocidas
Se declaran aquí; no las resuelve el planificador. La primera ya la aceptó el usuario en la
spec 004; las demás las aceptó el usuario el 2026-10-17 al aprobar esta spec.
- `PRODUCT.md`, principio 2 ("el rango se obtiene, no se declara; la verificación es lo que
  separa esto de un mensaje en Discord"): el rango, la distancia, el puntaje y la marca de
  verificada que usa esta spec son inventados por el proveedor simulado. Aceptada por el
  usuario en la spec 004 ("Tensiones reconocidas").
- Constitución, principio 5 ("nada de datos reales inventados"): la spec 004 aceptó que un
  usuario puede vincular el identificador real de un tercero y que la plataforma le asigna
  un rango inventado y, quizá, la marca "verificada". Esta spec **amplía la exposición** de
  esa tensión: ese identificador real, con su rango y su marca inventados, aparece ahora en
  la lista de coincidencias de todos los jugadores de ese juego, y además se le calculan una
  distancia y un puntaje. La mitigación es la misma de la spec 004 (marca de datos simulados
  en la cuenta, RF-3, y ningún texto que atribuya los datos a una fuente real, spec 004
  RNF-2) y tampoco es completa: el identificador sí es real.
- `AGENTS.md` ("Los datos de demostración se etiquetan siempre como tales en la interfaz") y
  `PRODUCT.md`, principio 5: con el servidor real, la distancia y el puntaje simulados se
  muestran sin etiqueta hasta que la spec 007 cambie su RF-11 (ver "Contexto y objetivo" y
  "Criterios de finalización").
- Constitución, principio 6 (mensajes de error en español): los textos de esta spec están
  en español y nombran los filtros con el rótulo que muestra hoy la interfaz (DP5-2),
  incluida la búsqueda ("Buscar jugador", RF-15). El
  único elemento no español es el par de valores `true` / `false` del mensaje de RF-14, que
  son los valores literales que el cliente debe enviar, no identificadores del código
  (DP5-6).

## Usuarios
- Jugador con cuenta en un juego que busca con quién jugar a su nivel y en su horario.

## Historias de usuario
- HU-1. Como jugador, quiero ver los jugadores de mi juego con rango similar y horas en
  común, ordenados por qué tan bien calzan conmigo, para elegir con quién jugar.
- HU-2. Como jugador, quiero filtrar por distancia de rango, horas en común, cuentas
  verificadas y nombre para acotar la lista.

## Definiciones
- **Juego**: el definido en la spec 004 (`lol`, `r6` o `cs2`).
- **Usuario de la sesión**: el que identifica la credencial de sesión (spec 002, RF-15).
- **Candidato**: otro usuario, distinto del usuario de la sesión y que todavía existe, con
  cuenta en el juego consultado (DP5-11).
- **Datos públicos del usuario**: los definidos en la spec 002 (identificador, nombre de
  usuario, nombre visible, color de avatar, biografía, zona horaria y fecha de creación),
  sin correo. En el candidato el campo de correo no aparece (DP5-10).
- **Distancia de rango**: diferencia absoluta entre los rangos normalizados vigentes (spec
  004, "Rango normalizado", DP-26) del usuario de la sesión y del candidato. Es un entero
  de 0 a 100. Existe en los tres juegos, porque toda cuenta tiene rango (spec 004, RF-4 y
  RF-36). Los puntos no influyen: dos cuentas en el mismo escalón tienen distancia 0. En LoL
  y R6 la normalización por escalones difiere de la que aplica hoy la interfaz, así que sus
  distancias pueden diferir de las actuales; en CS2 la escala (Grey a Gold, spec 004, DP-2)
  es la de la interfaz.
- **Bloques en común**: los bloques horarios (spec 003) presentes a la vez en la
  disponibilidad del usuario de la sesión y en la del candidato, sin repetidos, ordenados
  por día de menor a mayor (0 = lunes) y, a igual día, por hora de menor a mayor (0 a 23)
  (DP5-9). Su número es la cantidad de horas en común.
- **Puntaje**: entero de 0 a 100 igual a `redondear(0,55 × R + 0,45 × H)`, con
  `R = máx(0, 100 − 4 × distancia)` y `H = mín(100, bloques en común / 8 × 100)`. El valor
  antes de redondear se calcula de forma exacta (como con fracciones, sin errores de coma
  flotante) y se redondea al entero más cercano con las mitades hacia arriba (DP5-7; mismo
  criterio que DP-11 de la spec 004). Ejemplos: distancia 0 y 4 bloques = 55 + 22,5 = 77,5
  → 78; distancia 0 y 8 o más bloques = 100; distancia 25 o más y 0 bloques = 0. Es el
  criterio que aplica hoy la interfaz: una distancia de 25 o más anula el componente de
  rango y 8 horas o más en común saturan el de horario.
- **Cuenta verificada**: la definida en la spec 004 (RF-41): marca que fija el proveedor
  simulado según el juego y el identificador, en los tres juegos. No demuestra que la
  cuenta sea de quien la vinculó y es un dato simulado.
- **Marca de datos simulados**: la definida en la spec 004 (RF-37, DP-28). En las
  coincidencias, cuando la cuenta de un candidato la lleva, la interfaz etiqueta como
  simulados, además de lo que fija la spec 004 (rango, historial, partidas y marca de
  verificada), la distancia de rango y el puntaje de ese candidato. No existe una marca
  propia para la distancia ni para el puntaje (decisión del usuario del 2026-10-17). La
  distancia y el puntaje dependen también del rango del usuario de la sesión; en este hito
  ese rango también es simulado, porque toda cuenta sale del proveedor simulado (spec 004,
  RF-34), así que la marca del candidato basta (DP5-15).
- **Valor de un filtro**: lo que llega para ese filtro en la consulta. Un filtro **ausente**
  no llega; un filtro **vacío** llega sin texto; un filtro **repetido** llega más de una
  vez. Ausente, vacío y repetido son casos distintos (spec 004, DP-10).
- **Número entero válido**: texto formado solo por uno o más dígitos decimales del 0 al 9,
  sin signo, espacios, punto, coma, exponente ni prefijo (DP5-4). Se lee en base 10 (`007`
  vale 7). No lo son, entre otros: vacío, `abc`, ` 5 `, `+5`, `-0`, `-1`, `2.5`, `12,5`,
  `1e1`, `0x10`, `Infinity`.
- **Filtros** (DP5-4, DP5-5, DP5-6, DP5-12):
  - Juego: obligatorio; un único valor, idéntico a `lol`, `r6` o `cs2` (sin espacios ni
    mayúsculas).
  - Distancia máxima de rango: número entero válido de 0 a 100, ambos incluidos; si está
    ausente, 100.
  - Mínimo de horas en común: número entero válido de 0 a 168, ambos incluidos; si está
    ausente, 0.
  - Solo cuentas verificadas: `true` (activo) o `false` (inactivo); si está ausente,
    inactivo.
  - Texto de búsqueda: un único valor de texto libre; ausente, vacío o formado solo por
    espacios no filtra.
  En la interfaz los dos filtros numéricos son barras deslizantes (distancia 0-50 en pasos
  de 5, por defecto 25; horas 0-12 en pasos de 1, por defecto 2), así que los valores
  ausentes, no enteros o fuera de rango solo llegan por llamadas directas a la API.

## Requisitos funcionales
Mensajes: todo error responde la respuesta de error de la spec 001 con el texto exacto que
indica cada RF, en minúscula y sin punto final (spec 004, DP-6; DP5-2; DP5-17, cambio B
aprobado e implementado el 2026-10-19). Conservan su forma el rótulo de la interfaz
citado entre « » y los valores literales `true` y `false`. Los textos están pensados para mostrarse tal cual al
jugador (spec 007, RF-9).

- RF-1: EL SISTEMA exige sesión válida para consultar coincidencias: sin credencial, 401
  "sesión no iniciada"; credencial alterada o sin comprobante anti-CSRF válido, 401 "token
  inválido"; credencial expirada, 401 "sesión expirada" (spec 002, RF-10 a RF-12). Una
  sesión cuyo usuario ya no existe se rige por RF-13.
- RF-2: CUANDO un usuario consulta las coincidencias de un juego con filtros válidos y tiene
  cuenta en ese juego, EL SISTEMA responde 200 con la lista de candidatos que cumplen todos
  los filtros, ordenada por puntaje de mayor a menor; a igual puntaje, por distancia de
  rango de menor a mayor; a igual distancia, por número de bloques en común de mayor a
  menor; y, si todo lo anterior empata, por nombre de usuario comparado como texto,
  carácter a carácter según su código Unicode, de menor a mayor (DP5-8).
- RF-3: EL SISTEMA entrega por cada candidato: sus datos públicos (sin el campo de correo,
  DP5-10), el juego consultado, su cuenta del juego con la representación de la spec 004
  (con la marca de datos simulados y sin partidas; spec 004, RF-37 y DP-32), la distancia
  de rango, los bloques en común (en el orden de "Bloques en común", DP5-9) y el puntaje.
- RF-4: EL SISTEMA excluye siempre al usuario de la sesión de sus propias coincidencias.
- RF-5: SI el juego está ausente, vacío, repetido o no es exactamente uno de los juegos,
  ENTONCES EL SISTEMA responde 400 con "juego no válido" (spec 004, RF-2 y RF-13; DP5-5;
  DP5-17).
- RF-6: SI el usuario de la sesión no tiene cuenta en el juego consultado, ENTONCES EL
  SISTEMA responde 404 con "no tienes una cuenta vinculada en este juego" (DP5-3; DP5-17).
  No aplica a un usuario que ya no existe (RF-13).
- RF-7: EL SISTEMA excluye a los candidatos cuya distancia de rango es mayor que la
  distancia máxima o cuyo número de bloques en común es menor que el mínimo de horas. Un
  candidato con distancia igual a la máxima o con tantos bloques como el mínimo se
  conserva.
- RF-8: MIENTRAS el filtro de solo verificadas está activo, EL SISTEMA excluye, en
  cualquiera de los tres juegos, a los candidatos cuya cuenta no está verificada (spec 004,
  RF-41).
- RF-9: CUANDO hay texto de búsqueda que no está vacío ni formado solo por espacios, EL
  SISTEMA quita los espacios de sus extremos y conserva solo a los candidatos cuyo nombre
  visible o nombre de usuario lo contiene como texto literal, sin distinguir mayúsculas de
  minúsculas (también fuera de ASCII, ej. `Ñ` y `ñ`) pero distinguiendo acentos (`a` no
  coincide con `á`). Ningún carácter del texto tiene significado especial (DP5-12).
- RF-11: CUANDO un filtro numérico está ausente, EL SISTEMA aplica su valor sin restricción
  (distancia máxima 100, mínimo de horas 0).
- RF-12: SI la distancia máxima o el mínimo de horas está vacío, repetido, no es un número
  entero válido o está fuera de su rango (0 a 100 y 0 a 168, ambos incluidos), ENTONCES EL
  SISTEMA responde 400 con (DP5-2, DP5-4):
  - distancia máxima: "filtro «Diferencia máxima de rango» no válido: usa un número entero
    de 0 a 100";
  - mínimo de horas: "filtro «Horas en común por semana» no válido: usa un número entero de
    0 a 168".
  (DP5-17 fija la minúscula inicial y la falta de punto final; el rótulo entre « » es el de
  la interfaz y conserva su forma.)
- RF-13: SI la sesión es válida pero su usuario ya no existe (fue eliminado), ENTONCES EL
  SISTEMA responde 401 con "token inválido" en cualquier operación de esta spec y no crea ni
  cambia nada, como en las demás operaciones con sesión (spec 004, RF-44 y DP-37; spec 002,
  RF-22). Es el mismo texto que el de la credencial alterada de RF-1; no hay ninguna
  comprobación de sesión adicional. Vale también si el usuario se elimina después de superar
  la revisión de la sesión y antes de que la consulta lea sus datos (borrado intercalado,
  plan P5-11): responde el mismo 401 "token inválido", no el 404 de RF-6 ni un 500. No es un
  requisito nuevo: aclara el alcance de este (decisión del usuario del 2026-10-19).
- RF-14: SI el filtro de solo verificadas está vacío, repetido o tiene un valor distinto de
  `true` o `false` (exactamente así, en minúsculas), ENTONCES EL SISTEMA responde 400 con
  "filtro «Solo cuentas con rango verificado» no válido: usa true o false" (DP5-2, DP5-6,
  DP5-17).
- RF-15: SI el texto de búsqueda está repetido, ENTONCES EL SISTEMA responde 400 con
  "filtro «Buscar jugador» no válido" (DP5-12; DP5-17; rótulo por decisión del usuario del
  2026-10-17).
- RF-16: EL SISTEMA resuelve la consulta en este orden y responde solo el primer error
  (DP5-1): sesión (401, RF-1 y RF-13) → juego (RF-5) → distancia máxima (RF-12) → mínimo de
  horas (RF-12) → solo verificadas (RF-14) → búsqueda (RF-15) → cuenta del usuario de la
  sesión en el juego (404, RF-6).
- RF-17: SI una cuenta del juego consultado pertenece a un usuario que ya no existe
  (intervalo transitorio aceptado en la spec 004, plan P-7 y P-12), ENTONCES EL SISTEMA la
  omite de la lista sin error y responde igual que si no existiera (DP5-11).
- RF-18: EL SISTEMA ignora cualquier parámetro de la consulta distinto de los cinco filtros
  (DP5-13).

Retirados: RF-10 (R6 solo horario), porque R6 tiene rango simulado como LoL y CS2 (spec 004,
decisión "R6 con rango y partidas simuladas" del 2026-10-17).

## Requisitos no funcionales
- RNF-1: La lectura y validación de filtros, la exclusión del usuario de la sesión, la
  intersección y el orden de los bloques en común, la distancia de rango, el puntaje, los
  filtros (distancia, horas, verificadas y búsqueda) y el orden de la lista son reglas
  puras, sin acceso a datos, transporte ni reloj, probadas por separado de la consulta
  (constitución, principio 3).
- RNF-2: La forma de cada candidato es la que consume hoy la vista de coincidencias, con dos
  diferencias: el usuario del candidato no trae el campo de correo (constitución, principio
  5; DP5-10) y su cuenta lleva la marca de datos simulados y no incluye partidas (spec 004,
  RF-37, RNF-3 y DP-32). Esa marca basta para que la interfaz etiquete como simulados la
  distancia de rango y el puntaje del candidato ("Marca de datos simulados"); el candidato
  no lleva ningún campo nuevo. Los valores de distancia y puntaje pueden diferir de los del
  modo simulado del navegador hasta que la spec 007 adopte DP-26 (decisión del usuario del
  2026-10-17). La adaptación de los tipos de la interfaz a la falta del correo es de la
  spec 007.
- RNF-3: Ningún mensaje ni respuesta de esta spec atribuye el rango, la distancia, el
  puntaje ni la marca de verificada a Riot, Ubisoft, Valve, FACEIT ni a ninguna fuente real
  (spec 004, RNF-2).
- RNF-4: Esta spec no agrega dependencias ni variables de entorno (constitución, principio
  1; spec 004, RNF-8 y RNF-9).

## Casos límite
- Sin candidatos o sin ninguno que cumpla los filtros: 200 con lista vacía.
- Candidato sin disponibilidad: cero bloques en común; aparece solo si el mínimo de horas es
  0, con `H = 0`.
- Usuario de la sesión sin disponibilidad: todos los candidatos tienen cero bloques en
  común; con mínimo de horas 0 aparecen todos los que cumplen los demás filtros, con puntaje
  `redondear(0,55 × R)`; con mínimo mayor que 0, lista vacía.
- Búsqueda ausente, vacía (`search=`) o solo con espacios: no filtra (DP5-12).
- Búsqueda repetida: 400 "filtro «Buscar jugador» no válido" (RF-15).
- Búsqueda `a.b`, `.*`, `(` o `[`: se busca ese texto literal; `.*` solo conserva a quien
  tenga `.*` en su nombre visible o nombre de usuario (RF-9).
- Búsqueda `ÑANDÚ` encuentra a `Ñandú`; `nandu` no lo encuentra (RF-9).
- Búsqueda más larga que cualquier nombre: no es un error; da lista vacía (DP5-12).
- R6: se calculan la distancia, el filtro de distancia máxima y el puntaje igual que en LoL
  y CS2 (spec 004, "R6 con rango").
- Filtro de solo verificadas en cualquiera de los tres juegos: conserva solo a los
  candidatos cuya cuenta marcó como verificada el proveedor simulado (spec 004, RF-41); da
  lista vacía solo si ninguno lo está.
- Solo verificadas `false` o ausente: no filtra. `abc`, `1`, `TRUE`, vacío o repetido: 400
  de RF-14.
- Candidato que vinculó el mismo identificador que el usuario de la sesión: es otro usuario
  y aparece como candidato; su marca de verificada es la misma que la del usuario de la
  sesión (spec 004, DP-17 y RF-41).
- Distancia máxima `abc`, `-1`, `101`, `2.5`, ` 5 `, `1e1`, `0x10`, `-0`, vacía o repetida:
  400 "filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100"
  (RF-12).
- Mínimo de horas `169`, `12.5`, vacío o repetido: 400 "filtro «Horas en común por semana»
  no válido: usa un número entero de 0 a 168" (RF-12).
- Distancia máxima `0`, `100` y `007`, mínimo de horas `0` y `168`: válidos (`007` vale 7).
- Distancia máxima `0`, en cualquiera de los tres juegos: solo candidatos con el mismo rango
  normalizado, es decir, en el mismo escalón aunque tengan distintos puntos (spec 004,
  DP-26).
- Mínimo de horas igual al número de bloques en común del candidato: se conserva (RF-7).
- Distancia 0 y 4 bloques en común: puntaje 78 (77,5 redondeado hacia arriba, DP5-7).
- Dos candidatos con el mismo puntaje: va primero el de menor distancia; con la misma
  distancia, el de más bloques en común; si también empatan, el de nombre de usuario menor
  como texto (RF-2).
- Juego inválido y distancia máxima `abc`: 400 "juego no válido" (RF-16).
- Distancia máxima y mínimo de horas inválidos a la vez: 400 de la distancia máxima (RF-16).
- Usuario sin cuenta en el juego y mínimo de horas `169`: 400 del mínimo de horas, no 404
  (RF-16).
- Juego `LOL` o ` lol `, repetido (`game=lol&game=cs2`) o vacío (`game=`): 400 "juego no
  válido" (RF-5).
- Parámetros desconocidos (ej. `page=2`, `user=<id>`): se ignoran (RF-18).
- Cuenta del juego cuyo dueño fue eliminado y aún no se borró (spec 004, plan P-12): no
  aparece y la consulta responde 200 (RF-17).
- Consulta con una credencial todavía válida de un usuario ya eliminado: 401 "token
  inválido", no el 404 de RF-6 (RF-13).
- Usuario de la sesión eliminado después de superar la revisión de la sesión y antes de que
  la consulta lea sus datos: 401 "token inválido", no el 404 de RF-6 ni un 500 (RF-13).

## Fuera de alcance
- Guardar coincidencias o su historial.
- Comparar rangos entre juegos distintos (sigue sin decidirse, `PRODUCT.md`).
- Paginación o límite de tamaño de la lista de coincidencias: se devuelven todos los
  candidatos que cumplen los filtros (DP5-14).
- Búsqueda sin distinguir acentos o por otros campos distintos del nombre visible y el
  nombre de usuario.
- Cambios en la vista de coincidencias y en los tipos de la interfaz, incluido el usuario
  del candidato sin correo (spec 007).

## Criterios de finalización
- [x] Todas las decisiones de la tabla "Decisiones propuestas" están aprobadas o
      reemplazadas por el usuario antes de aprobar la spec (aprobadas el 2026-10-17).
- [ ] La spec 007 incorpora, antes de su aprobación, la etiqueta de datos simulados también
      con el servidor real en la distancia de rango y el puntaje de los candidatos
      (comprobable en su texto). Hasta entonces la convención de `AGENTS.md` sobre datos de
      demostración no se cumple con el servidor real en la vista de coincidencias.
- [x] El criterio de puntaje tiene pruebas unitarias: distancia ≥ 25 anula el rango, ≥ 8
      horas saturan el horario, mitades hacia arriba (distancia 0 y 4 bloques = 78) y
      ningún caso afectado por coma flotante (se recorren todas las distancias de 0 a 100 y
      todos los bloques de 0 a 168 y se compara con el cálculo exacto).
- [x] La intersección de bloques tiene pruebas unitarias: sin traslape, con traslape
      parcial, con listas vacías y con el orden por día y hora aunque las disponibilidades
      lleguen desordenadas.
- [x] La lectura de filtros tiene pruebas unitarias: ausente, vacío, repetido, no numérico,
      decimales, signo, espacios, exponente y prefijo, en los extremos (0, 100, 168) y fuera
      de rango; juego en mayúsculas, con espacios, vacío y repetido; solo verificadas
      `true`, `false`, ausente y no reconocido; búsqueda repetida; y el orden de RF-16 con
      un caso por salto.
- [x] El orden de la lista tiene pruebas unitarias con cada nivel de desempate de RF-2.
- [x] La búsqueda tiene pruebas unitarias: texto literal con metacaracteres, mayúsculas
      fuera de ASCII, acentos distinguidos, vacía y solo espacios.
- [x] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta (con
      el texto exacto del mensaje en los errores), incluida una por filtro (el de solo
      verificadas en los tres juegos) y una de R6 con distancia y puntaje como en LoL y CS2.
      (Reabierta el 2026-10-19 por el cambio A y vuelta a marcar el 2026-10-19: la prueba de
      RF-13 verifica "token inválido" (T9) y las de RF-5, RF-6, RF-12, RF-14 y RF-15 verifican
      los textos de DP5-17 como literales (T10).)
- [x] Una prueba confirma que la distancia usa el rango normalizado de la spec 004: dos
      cuentas en el mismo escalón con distintos puntos tienen distancia 0.
- [x] Una prueba confirma que ningún candidato trae el campo de correo ni hash, y que trae
      el juego consultado.
- [x] Una prueba confirma que la cuenta de cada candidato lleva la marca de datos simulados
      y no lleva partidas (spec 004, RF-37 y DP-32).
- [x] Hay una prueba de RF-13 (credencial de un usuario ya eliminado → 401 "token
      inválido", no 404; esa prueba sustituye a la anterior, no se añade otra; el 404 de RF-6
      se conserva como caso aparte, y el borrado intercalado entre la revisión de la sesión
      y la lectura de datos también responde 401 "token inválido"). (Reabierta el 2026-10-19
      por el cambio A, cuando esperaba "sesión no iniciada"; vuelta a marcar el 2026-10-19 al
      terminar T9.)
- [x] Hay una prueba de RF-17 (cuenta de un usuario inexistente omitida, 200).
- [x] Comprobación de tipos y pruebas del servidor en verde. (Reabierta el 2026-10-19 por el
      cambio A, que también cubre el cambio B de textos; vuelta a marcar el 2026-10-19: el
      reviewer comprobó `npm run typecheck` y `npm test` en verde, 1567 tests.)

## Dudas abiertas
No quedan dudas abiertas. Las dos anteriores las cerró la spec 004 (aprobada el
2026-10-17):
- Escala de CS2: Grey a Gold con CS Rating, la de la interfaz (spec 004, DP-2 y DP-34); ni
  FACEIT ni Premier.
- Candidatos sin rango en LoL o CS2: no existen; toda cuenta tiene rango en los tres juegos
  (spec 004, RF-4 y RF-36).
Los puntos de la revisión de QA del 2026-10-17 se resuelven con las DP5 de la tabla final,
aprobadas por el usuario el 2026-10-17.

## Impacto en otras specs
No se editan desde aquí; cada cambio se hace en su spec cuando el usuario lo apruebe.
- Spec 007:
  - Pendiente: el modo simulado del navegador debe adoptar la normalización de DP-26 de la
    spec 004 (y su escala y bandas). Hasta entonces la distancia y el puntaje de LoL y R6
    pueden diferir entre el servidor y ese modo; esta spec solo promete la misma forma de
    candidato (decisión del usuario del 2026-10-17).
  - El filtro "Solo verificadas" se mantiene; la interfaz debe mostrar la marca de
    verificada de cada candidato como simulada (spec 004, RF-37 y RF-41). Su RF-16, que
    define "verificada" como inicio de sesión en la plataforma del juego, debe pasar a la
    marca fijada por el simulador (spec 004, RF-41).
  - RF-11 (oculta toda etiqueta con el servidor real) debe cambiar: con el servidor real,
    la vista de coincidencias etiqueta como simulados la distancia de rango y el puntaje de
    cada candidato cuya cuenta lleva la marca de datos simulados (RNF-2, DP5-15), además de
    lo que pide la spec 004.
  - RF-12 (desactiva el filtro de distancia en R6 o muestra el mensaje de R6) cae: en R6 el
    filtro de distancia máxima, la distancia y el puntaje funcionan como en LoL y CS2.
  - El usuario de cada candidato llega sin el campo de correo (DP5-10): el tipo de usuario
    que consume la vista de coincidencias no puede exigir el correo (hoy
    `frontend/src/domain/types.ts` lo tiene obligatorio en `User`).
  - El candidato incluye el juego consultado y los bloques en común ordenados por día y
    hora (DP5-9); la interfaz no debe depender del orden de la disponibilidad del usuario.
  - Su RF-10 (el modo simulado responde con los mismos códigos y formas que el servidor)
    obliga a que el modo simulado del navegador adopte: el orden de errores de RF-16 y sus
    códigos, la validación de filtros (DP5-4 a DP5-6, DP5-12), el desempate de RF-2
    (DP5-8), el redondeo exacto del puntaje (DP5-7; hoy usa `Math.round` sobre coma
    flotante), la omisión de cuentas sin dueño (RF-17) y el candidato sin correo.
  - La igualdad de textos no sale de su RF-10 sino de DP-6 de la spec 004 (textos exactos,
    iguales en servidor e interfaz): por ella el modo simulado debe responder los textos de
    RF-5, RF-6, RF-12, RF-14 y RF-15 de esta spec (hoy el mock responde "No tienes una
    cuenta vinculada en ese juego." y "Sesión no válida o expirada."). Cambio B (aprobado el
    2026-10-19): esos cinco textos pasan a la forma en minúscula y sin punto final de
    DP5-17, y el 401 del usuario eliminado (RF-13, cambio A) es "token inválido". Pendiente
    para cuando se pueda tocar la spec 007 (B5): alinear con DP5-17 todo texto de esta spec
    que su RF-10 o su modo simulado reproduzcan; esta spec no la modifica.
  - Su RF-9 muestra el mensaje de error tal cual: los textos de esta spec están en español
    y nombran el filtro con el rótulo que muestra hoy la interfaz (DP5-2).
  - Su RF-16 rotula el filtro como "Solo cuentas verificadas": debe alinearse con el rótulo
    actual de la interfaz, "Solo cuentas con rango verificado", que cita el mensaje de RF-14
    (DP5-2, decisión del usuario del 2026-10-17). Del mismo modo, mientras los mensajes de
    RF-12 citen "Diferencia máxima de rango" y "Horas en común por semana", la interfaz debe
    conservar esos rótulos; cambiar un rótulo exige cambiar antes el mensaje en esta spec.
    Lo mismo vale para el rótulo "Buscar jugador" de la caja de búsqueda, que cita el
    mensaje de RF-15 (decisión del usuario del 2026-10-17): la interfaz debe conservarlo.
  - Caen su duda abierta sobre los candidatos sin rango y su RF-14 ("Sin rango"): toda
    cuenta tiene rango en los tres juegos (spec 004, RF-4 y RF-36), así que ningún
    candidato llega sin rango.
- Spec 008:
  - Su definición de "Distancia de rango" remite a esta spec: pasa a ser la de rango
    normalizado de la spec 004 (DP-26), en los tres juegos, y la ficha debe etiquetarla
    como simulada igual que la vista de coincidencias (DP5-15).
  - Su caso límite "El jugador de la ficha o el usuario de la sesión no tienen rango en LoL
    o CS2…" y su duda abierta ("Qué se muestra en lugar de la distancia cuando alguno de los
    dos no tiene rango…") caen: dependían de una duda de esta spec que ya está cerrada
    (toda cuenta tiene rango en los tres juegos).
  - Su RF-14 (mensaje de R6 en lugar de la distancia) choca con el caso límite de R6 de esta
    spec y debe retirarse, junto con el "(en R6 manda RF-14)" de su primer caso límite y la
    definición "Mensaje de R6" (como ya indica la spec 004).
  - Su "Primer bloque en común" (día más temprano y, a igual día, hora más temprana) es
    coherente con el orden de "Bloques en común" de esta spec (DP5-9).

## Decisiones propuestas (DP5-1 a DP5-17 aprobadas por el usuario)
Propuestas por el planificador tras la revisión de QA del 2026-10-17, siguiendo las reglas
de la spec 004 aprobada. Numeración propia (DP5-n) para no confundirlas con las DP-n de la
spec 004. **DP5-1 a DP5-15 las aprobó el usuario el 2026-10-17** ("Apruebo todo"), DP5-2 con
los rótulos actuales de la interfaz ("Rótulos actuales (Recomendado)"). **DP5-16 la aprobó el
usuario el 2026-10-19** ("Opción A"). **DP5-17 (cambio B) la aprobó el usuario el
2026-10-19** ("apruebo todo con tus recomendaciones"; respuestas B1 a B5 en "Decisiones del
usuario"). Los textos de las filas DP5-2, DP5-3, DP5-5, DP5-6 y DP5-12 están en la forma de
DP5-17; la decisión original de cada fila (qué decir y con qué rótulo) no cambia. **DP5-16 y DP5-17
están implementadas (T9 y T10, 2026-10-19).**

| DP | Hallazgo | Decisión propuesta | Alternativa descartada |
| --- | --- | --- | --- |
| DP5-1 | Sin orden entre errores (1). | Orden fijo, primer error y nada más: sesión → juego → distancia máxima → mínimo de horas → solo verificadas → búsqueda → cuenta propia (404). La sesión va primero y sí lee datos (RF-13 comprueba que su usuario existe); después se validan todos los filtros sin leer nada más, y solo entonces se busca la cuenta del usuario y a los candidatos, como RF-13 de la spec 004 (400 del juego antes del 404). | Comprobar la cuenta antes que los filtros: un cliente con filtros rotos recibiría un 404 que oculta su error y cambiaría al vincular la cuenta. |
| DP5-2 | Mensaje de RF-12 sin texto y quizá en inglés (2, 24). | Textos exactos en español que nombran el filtro con el rótulo que muestra hoy la vista de coincidencias (decisión del usuario del 2026-10-17) e indican el valor permitido: "filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100", "filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168" y "filtro «Solo cuentas con rango verificado» no válido: usa true o false" (en minúscula y sin punto final por DP5-17, aprobada). La spec 007 alinea su rótulo del filtro de verificadas. | Nombrar el parámetro de la API (`maxRankDistance`): identificador en inglés en un mensaje que la interfaz muestra tal cual (constitución, principio 6; spec 007, RF-9). Nombrar el filtro con el término de esta spec ("Distancia máxima de rango", "Mínimo de horas en común", "solo verificadas"): el jugador no ve esos nombres en la pantalla. |
| DP5-3 | RF-5 y RF-6 sin texto (3). | RF-5 reutiliza "juego no válido" (spec 004, RF-2, RF-6 y RF-13; DP5-17). RF-6 usa "no tienes una cuenta vinculada en este juego", en segunda persona porque siempre se refiere al usuario de la sesión, con el "este juego" de la spec 004 (RF-5); el mock pasa de "ese" a "este" (spec 007, RF-10). | Reutilizar "el jugador no tiene una cuenta vinculada en este juego" (spec 004, RF-13): ese caso habla de cualquier jugador; aquí el jugador leería un mensaje en tercera persona sobre sí mismo. |
| DP5-4 | "Es un número" sin definir (4, 21, 22). | Filtro numérico válido = un único texto solo de dígitos decimales, sin signo, espacios, decimales, exponente ni prefijo, dentro de 0–100 o 0–168 con ambos extremos incluidos; vacío o repetido = 400 (DP-10). Con enteros, RF-7 conserva al candidato que iguala el máximo o el mínimo. | Convertir con la regla numérica general del lenguaje: `''` valdría 0, `0x10` 16, ` 5 ` 5 y `1e1` 10, ocultando errores del cliente. Aceptar decimales: las barras usan enteros y las horas en común son bloques enteros. |
| DP5-5 | Juego sin reglas de forma (4). | Juego = un único valor idéntico a `lol`, `r6` o `cs2`; mayúsculas, espacios, vacío o repetido dan 400 "juego no válido" (forma de DP5-17), como el filtro de juego de RF-2 de la spec 004. | Quitar espacios y pasar a minúsculas: distinto del filtro de juego de la spec 004 para el mismo dato. |
| DP5-6 | "Solo verificadas" sin forma ni valores (5). | Llega como parámetro de la consulta con `true` (activo) o `false` (inactivo), exactamente así; ausente = inactivo; vacío, repetido u otro valor (`abc`, `1`, `TRUE`) = 400 "filtro «Solo cuentas con rango verificado» no válido: usa true o false" (texto de DP5-2, en la forma de DP5-17). Es compatible con el cliente actual, que siempre envía `true` o `false`. | Tratar cualquier valor presente como activo: `false` lo activaría. Ignorar los valores no reconocidos: oculta un error del cliente (DP-10). Aceptar `1`/`0` o mayúsculas: más formas de decir lo mismo sin ningún cliente que las use. |
| DP5-7 | Redondeo del puntaje y coma flotante (6). | Cálculo exacto (como con fracciones) y redondeo al entero más cercano con las mitades hacia arriba, como DP-11 (77,5 → 78). | Redondeo sobre coma flotante: 0,55 × 100 = 55,000…01 y otros casos pueden caer al lado equivocado de la mitad. Redondeo a par o truncar: distinto de DP-11 y subestima. |
| DP5-8 | Sin desempate (7). | A igual puntaje: menor distancia, después más bloques en común, después nombre de usuario como texto por código Unicode ascendente (como DP-7 compara texto). | Sin desempate: orden no determinista y pruebas frágiles. Desempatar solo por identificador: determinista pero arbitrario para el jugador. |
| DP5-9 | Orden de los bloques en común (8). | Por día (lunes primero) y, a igual día, por hora de 0 a 23, sin repetidos; coherente con "primer bloque en común" de la spec 008. | Orden de la disponibilidad del usuario (lo que hace hoy la interfaz): la spec 003 la define como conjunto, sin orden. |
| DP5-10 | "Sin correo" contra el tipo `User` con correo obligatorio (14). | El usuario del candidato son sus datos públicos (spec 002) y el campo de correo no aparece, como en la spec 003 (RF-4); la spec 007 adapta el tipo. Se declara en RNF-2, "Fuera de alcance" e "Impacto". | Enviar el correo vacío para conservar la forma: es un valor falso que parece real y la constitución pide no exponer el correo de otro, no simularlo. |
| DP5-11 | Cuenta de un usuario que ya no existe (16). | Se omite en silencio y la consulta responde 200 (lo que hace hoy el mock). | 500: el intervalo aceptado en la spec 004 (P-12) rompería la lista de todos. Usuario nulo: rompe la forma del candidato. |
| DP5-12 | Búsqueda sin reglas (17). | Texto literal (sin metacaracteres), sin espacios en los extremos, sin distinguir mayúsculas también fuera de ASCII, distinguiendo acentos, sin largo máximo propio; repetida = 400 "filtro «Buscar jugador» no válido" (texto alineado con el rótulo de la interfaz por decisión del usuario del 2026-10-17, en la forma de DP5-17); ausente, vacía o solo espacios = no filtra. **Se aparta de DP-10 en el valor vacío**: en un buscador, el texto vacío es el estado normal de la caja, no un error del cliente. | Vacío = 400 como DP-10: castigaría un estado legítimo del buscador. Patrones: un `(` daría 500 o resultados inesperados. Sin distinguir acentos: distinto de lo que hace hoy la interfaz. Largo máximo con 400: añade un error que la interfaz nunca produce; un texto largo ya da lista vacía. |
| DP5-13 | Parámetros desconocidos (19). | Se ignoran, como los campos ignorados de RF-7 de la spec 004. | Responder 400: un cliente más nuevo o con parámetros de cache dejaría de funcionar sin motivo. |
| DP5-14 | Volumen sin límite (20). | Sin paginación ni límite en este hito; queda en "Fuera de alcance", como la paginación de usuarios de la spec 003. | Paginar: cambia la forma de la respuesta (lista) que consume la interfaz y no hay volumen que lo justifique en una demostración. |
| DP5-15 | La marca mira solo la cuenta del candidato (11). | Se mantiene la decisión del usuario (basta la marca de la cuenta del candidato) y se aclara su alcance: en este hito toda cuenta es simulada (spec 004, RF-34), incluida la del usuario de la sesión, así que la regla nunca deja sin etiqueta una distancia calculada con un rango simulado. Una spec que agregue una fuente real debe revisar esta regla. | Agregar una marca propia a la distancia y al puntaje: contradice la decisión del usuario del 2026-10-17 ("ningún campo nuevo"). |
| DP5-16 | **Aprobada por el usuario (2026-10-19, "Opción A"); implementada (T9).** Cambio A. Credencial de un usuario eliminado: la 004 vigente dice "token inválido" y esta spec decía "sesión no iniciada". | RF-13 responde 401 "token inválido", como la spec 004 (RF-44, DP-37) y las specs 002 y 003; ninguna comprobación de sesión adicional. Vale también si el borrado ocurre entre la revisión de la sesión y la lectura de los datos (confirmado por el usuario el 2026-10-19). | 401 "sesión no iniciada" (versión del 2026-10-17 de la 004 y de esta spec): contradice la 004 vigente y a las specs 002 y 003. Cambiar la 004 para que coincida con esta spec: contrario a la decisión del usuario. En la carrera de borrado, responder 404 (RF-6) o 500: el 404 diría que falta la cuenta de un usuario que ya no existe y rompería la regla de que RF-13 gana a RF-6. |
| DP5-17 | **Aprobada por el usuario (2026-10-19, "apruebo todo con tus recomendaciones"; B1 a B5); implementada (T10).** Cambio B, independiente del A. Los textos propios de esta spec (RF-5, RF-6, RF-12, RF-14, RF-15) llevan mayúscula inicial y punto final; la spec 004 (DP-6 y su "Impacto en otras specs") exige minúscula inicial y sin punto final, y el usuario pidió alinearlos ("Alinealo y hazlo en un cambio aparte"). | Todos los textos de error propios de esta spec pasan a minúscula inicial y sin punto final, conservando el resto de cada frase: "juego no válido" (igual a la 004), "no tienes una cuenta vinculada en este juego", "filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100", "filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168", "filtro «Solo cuentas con rango verificado» no válido: usa true o false" y "filtro «Buscar jugador» no válido". Las comillas « » (y los rótulos de la interfaz entre ellas, con su mayúscula) y los valores literales `true` y `false` conservan su forma, como las siglas, los nombres propios y las notaciones literales en la 004. Los 401 de RF-1 y RF-13 ya la cumplen. | Dejar los textos propios con mayúscula y punto final: contradice DP-6 y deja mensajes con dos estilos entre la 004 y la 005 en la misma interfaz. Poner también en minúscula el rótulo entre « » ("«diferencia máxima de rango»"): ya no sería el rótulo que ve el jugador (DP5-2) y obligaría a cambiar la interfaz (spec 007, RF-32). Quitar las comillas « »: pierde la forma aprobada el 2026-10-17 sin que DP-6 lo pida. |

Puntos de la revisión resueltos sin DP (corrección directa del texto): 9 (RF-3 incluye el
juego), 10 (RF-1 remite a los 401 de la spec 002), 12 y 13 ("Impacto en otras specs"), 18
(caso límite del usuario sin disponibilidad), 23 (RNF-1 amplía las reglas puras), 25
(criterio de finalización de la etiqueta en la spec 007) y 26 ("Tensiones reconocidas").
Los puntos 15 y 27 no eran defectos.
