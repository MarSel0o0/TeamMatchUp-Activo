# Spec 004 — Cuentas de juego y rango simulado
Estado: aprobada (2026-10-17)

## Contexto y objetivo
El rango es la segunda mitad del cruce (`PRODUCT.md`, principio 1). En este hito el rango,
el historial y las partidas de las cuentas de League of Legends, Rainbow Six Siege y
Counter-Strike 2 los entrega un proveedor simulado y determinista, igual en desarrollo,
prueba y producción. La aplicación se usa en una demostración en vivo y no consulta ninguna
fuente externa.

Esta spec agrega la entidad cuenta de juego con sus cinco operaciones REST, la lectura
simulada del rango, la resincronización y el resumen por juego que alimenta el perfil.

- Depende de: spec 003.
- Origen: HU-06, HU-08 y HU-13 (cuentas); RF-07 (cascada de cuentas), RF-09 y RF-11 a RF-15
  de la referencia (`specs/_referencia/001-crear-backend-original.md`, numeración de dos
  dígitos).
- Convención de citas: "RF-n de la referencia" o "RF-0n de la referencia" se refiere a esa
  spec original; un "RF-n" sin más se refiere a esta spec.
- Las decisiones técnicas ya tomadas (sección 2 —entidades, códigos 400 y 403—, RF-15 de la
  referencia —proveedor simulado y determinista—, RT-07 a RT-12, secciones 5.1 —proveedor
  simulado—, 5.4 —cuenta de juego—, 8 —`unit/` y `accounts.test.ts`— y 11 —integraciones
  reales fuera de alcance—) están en la referencia y pasan al `plan.md` de esta spec, con
  las excepciones de "Qué prevalece sobre la referencia".
- Las decisiones marcadas "(DP-n)" están aprobadas por el usuario (tabla al final): DP-18
  antes, y todas las demás el 2026-10-17 ("Apruebo todo").
- Dependencia explícita con la spec 007: la convención de etiquetar los datos inventados
  (`AGENTS.md`, "Convenciones": "Los datos de demostración se etiquetan siempre como tales
  en la interfaz"; `PRODUCT.md`, principio 5) solo se cumple con el servidor real cuando la
  spec 007 muestre la etiqueta de datos simulados guiada por RF-37. Hoy su RF-11 oculta toda
  etiqueta con el servidor real, así que, hasta que la spec 007 cambie, esa convención no se
  cumple con el servidor real (ver "Criterios de finalización").

### Decisiones del usuario
- **2026-10-17 — Todo simulado, sin fuentes.** Los tres juegos usan un proveedor simulado y
  determinista en todos los entornos (vuelve RF-15 de la referencia). Se eliminan de esta
  spec Riot, FACEIT, Steam OpenID, las claves y las dudas sobre fuentes. Motivo: los
  términos de Riot prohíben un producto público con clave de desarrollo o personal, y la
  aplicación es "solo para una demo en vivo". **Esta decisión revoca** la anterior ("la
  aplicación no usa rango ni cuentas simuladas; ningún entorno de ejecución tiene un
  proveedor simulado") y con ella la verificación con Steam y la renovación de la clave de
  Riot.
- **2026-10-17 — Cuenta verificada: la fija el simulador.** El proveedor simulado decide si
  la cuenta sale verificada según su identificador, aplicando el principio "mismo
  identificador → mismo resultado" de RF-15 de la referencia; se etiqueta como simulado y
  el filtro "Solo verificadas" sigue funcionando. Aceptado por el usuario: si dos usuarios
  vinculan el mismo identificador, los dos salen verificados (RF-41).
- **2026-10-17 — Proporción fija de cuentas verificadas.** Para que en la demostración haya
  cuentas verificadas y no verificadas, el simulador marca como verificadas aproximadamente
  la mitad de los identificadores, siguiendo una regla fija que se prueba con ejemplos
  concretos (estos salen verificados, estos no). No depende de qué cuentas vincule el
  equipo, y el equipo no elige cuáles salen verificadas (RF-41).
- **2026-10-17 — R6 con rango y partidas simuladas**, como LoL y CS2, con la escala Copper a
  Champion de la interfaz (Champion sin división). Se retiran RF-19, RF-20 y DP-27.
- **2026-10-17 — La lectura cambia en cada resincronización:** cada resincronización mueve
  el rango como mucho un escalón y añade partidas nuevas, de forma reproducible (RF-42,
  RF-43).
- El identificador de una cuenta no se puede editar (RF-22).
- DP-18 (aprobada): para cambiar el identificador se desvincula la cuenta y se vuelve a
  vincular, perdiendo el historial.

### Tensiones reconocidas
Aceptadas por el usuario el 2026-10-17 al aprobar la spec.
- `PRODUCT.md`, principio 2 ("el rango se obtiene, no se declara; la verificación es lo que
  separa esto de un mensaje en Discord") y "Positioning" ("obtiene el rango desde la fuente
  de cada juego"): en este hito el rango no se obtiene de ninguna fuente ni lo declara el
  usuario; lo inventa el proveedor simulado. Se acepta como limitación del hito. El jugador
  sigue sin poder declarar su rango (RF-7) y todo dato simulado va marcado como tal (RF-37),
  para cumplir `PRODUCT.md`, principio 5 ("Nada inventado: los datos de demostración se
  muestran como lo que son") y la convención de `AGENTS.md` citada arriba, sujeto a la
  dependencia con la spec 007.
- "Cuenta verificada" no demuestra que la cuenta sea de quien la vinculó: la fija el
  simulador por identificador (RF-41). Si dos usuarios vinculan el mismo identificador, los
  dos salen verificados (o los dos no); el usuario lo acepta. La marca va etiquetada como
  simulada (RF-37).
- Constitución, principio 5 ("nada de datos reales inventados"): un usuario puede vincular
  el identificador real de un tercero (por ejemplo, el Riot ID de un jugador conocido), y la
  plataforma le asigna a ese identificador real un rango inventado y, según la regla de
  RF-41, posiblemente la marca "verificada". Se mitiga con la marca de datos simulados
  (RF-37), que impide presentar ese rango o esa marca como reales, y con RNF-2, que prohíbe
  atribuirlos a una fuente real. No se mitiga del todo: el identificador sí es real.
- `PRODUCT.md` ("Operating Context") menciona reobtención periódica y scraping. Esta spec no
  usa ninguna de las dos (DP-24).

### Qué prevalece sobre la referencia
Esta spec prevalece sobre `specs/_referencia/001-crear-backend-original.md` en (DP-15):
- HU-06 y RF-13 de la referencia: el identificador no se puede editar (RF-22); `PUT` solo
  cambia la región.
- RF-14 de la referencia y su sección 8 (`accounts.test.ts`, "sync agrega un elemento al
  historial"): la resincronización agrega una fotografía solo según DP-9.
- RF-15 de la referencia y su sección 5.1: la lectura no es fija por identificador; depende
  además del número de lectura y evoluciona en cada resincronización (RF-42, RF-43). La
  marca de verificada sí sigue siendo fija por identificador (RF-41).
- Sección 5.4 de la referencia: el máximo de 20 partidas es una regla de la cuenta (RF-15,
  RF-28), no del proveedor; la región no interviene en la lectura y se guarda con la grafía
  de la lista (DP-5, DP-35); el identificador se guarda como lo envió el usuario, sin
  espacios en los extremos (DP-19); cada cuenta lleva la marca de datos simulados (RF-37) y
  un número de lectura interno (DP-33); las partidas guardadas no forman parte de la
  representación de la cuenta (DP-32).
- RT-07 de la referencia: la representación del usuario tampoco incluye su lista de cuentas
  (RF-33), y la de la cuenta no incluye sus partidas ni su número de lectura (DP-32,
  DP-33). Coincide con la spec 003, RNF-2, y con `frontend/src/domain/types.ts`.
- Sección 2 y tabla 5.7 de la referencia: un duplicado de cuenta responde el mensaje de
  RF-5, no el genérico "ya existe un registro con ese <campo>". Esta spec no tiene ningún
  409.
- Vuelven a aplicar tal como están en la referencia, salvo lo dicho arriba: RF-15 de la
  referencia (proveedor simulado y determinista, "mismo identificador → mismo resultado",
  que también genera partidas), de donde sale la marca de verificada fijada por
  identificador; el proveedor simulado de la sección 5.1; el campo de verificada de la
  sección 5.4 ("default false; lo fija el proveedor"), y la exclusión de las integraciones
  reales de la sección 11.

## Usuarios
- Jugador que vincula sus cuentas de League of Legends, Rainbow Six Siege y Counter-Strike 2.
- Jugador que revisa el rango y las partidas propias o de otros.
- Equipo que presenta la demostración en vivo.

## Historias de usuario
- HU-1. Como jugador, quiero vincular mi cuenta de cada juego que juego para que la
  plataforma le asigne un rango sin que yo lo declare.
- HU-2. Como jugador, quiero corregir la región de una cuenta y desvincularla cuando deje
  de usarla. (En este hito la interfaz no ofrece corregir la región, spec 007; el servidor
  sí lo permite.)
- HU-3. Como jugador, quiero pedir una nueva lectura del rango.
- HU-4. Como jugador, quiero ver, por juego, el rango vigente, su evolución y las últimas
  partidas, míos o de otro jugador.
- HU-5. Como jugador, quiero que nadie más pueda modificar, resincronizar ni desvincular mis
  cuentas.
- HU-6. Como equipo que presenta la demostración en vivo, quiero que el rango y las partidas
  sean simulados, reproducibles, que cambien al resincronizar, que haya cuentas
  verificadas y no verificadas, y que todo vaya marcado como simulado, para demostrar el
  cruce sin depender de servicios externos y sin hacer pasar datos inventados por reales.

## Definiciones
- **Juego**: uno de `lol`, `r6` o `cs2`. Nombres para mensajes: "League of Legends",
  "Rainbow Six Siege" y "Counter-Strike 2". Los tres tienen rango y partidas simulados.
- **Identificador de cuenta**: Riot ID (LoL), Ubisoft ID (R6) o SteamID64 (CS2). Se le
  quitan los espacios de los extremos y se valida con el mismo patrón por juego que usa hoy
  el formulario de vinculación. Se guarda tal como quedó tras quitar esos espacios, con sus
  mayúsculas (DP-19). No se puede editar (decisión del usuario).
- **Identificador canónico**: el identificador sin espacios en los extremos y en
  minúsculas. Dos identificadores son el mismo si sus formas canónicas coinciden (DP-19).
- **Región válida**: un texto que, sin espacios en los extremos y sin distinguir mayúsculas,
  coincide con una de la lista de regiones del juego que usa hoy el formulario. Se guarda
  con la grafía de esa lista (ej. `" las "` se guarda como `LAS`) (DP-35). Es informativa:
  no interviene en ninguna lectura (DP-5).
- **Proveedor simulado**: el componente que produce las lecturas. No consulta ningún servicio
  externo y es el mismo en todos los entornos (RF-34).
- **Instante actual**: fecha y hora del reloj del servidor al procesar la petición. Las
  reglas de esta spec lo reciben como dato, nunca lo leen ellas mismas (RNF-7).
- **Número de lectura**: dato interno de cada cuenta, guardado con ella y que no aparece en
  ninguna respuesta (DP-33). Vale 0 en la lectura de la vinculación; cada resincronización
  que responde 200 usa el número siguiente al último usado y lo deja guardado. Una
  operación que no responde 200 o 201 no lo consume (RF-45). Desvincular y volver a
  vincular empieza de nuevo en 0.
- **Lectura**: resultado del proveedor simulado para una cuenta: una fotografía de rango,
  entre 1 y 8 partidas (una de ellas, la partida principal) y la marca de verificada
  (RF-36, RF-41, RF-43).
- **Fotografía de rango**: tier (con el nombre de la escala del juego), división (solo en
  los tiers que la tienen), puntos (entero dentro de la banda del escalón, DP-34), valor
  normalizado y fecha de lectura (= instante actual).
- **Escala de rango** (DP-2, DP-26):
  - LoL: Iron, Bronze, Silver, Gold, Platinum, Emerald y Diamond, cada uno con divisiones
    IV, III, II, I; Master, Grandmaster y Challenger sin división.
  - CS2: Grey, Light Blue, Blue, Purple, Pink, Red y Gold, sin división.
  - R6: Copper, Bronze, Silver, Gold, Platinum, Emerald y Diamond, cada uno con divisiones
    V, IV, III, II, I; Champion sin división (decisión del usuario).
- **Escalón**: cada división de un tier con divisiones, o el tier entero si no las tiene.
  LoL tiene 31 escalones (7 × 4 + 3), CS2 tiene 7 y R6 tiene 36 (7 × 5 + 1). Dos
  fotografías están "a un escalón" si sus posiciones en la escala difieren en 1.
- **Banda de puntos** (DP-34): los puntos de una fotografía son un entero dentro de la banda
  de su escalón:
  - LoL (LP): 0 a 99 en los escalones con división; 0 o más en Master, Grandmaster y
    Challenger.
  - CS2 (CS Rating): Grey 0–4999, Light Blue 5000–9999, Blue 10000–14999, Purple
    15000–19999, Pink 20000–24999, Red 25000–29999, Gold 30000 o más.
  - R6 (MMR): cada tier con divisiones ocupa 500 puntos, 100 por división, desde Copper V
    1000–1099 hasta Copper I 1400–1499, Bronze 1500–1999, Silver 2000–2499, Gold
    2500–2999, Platinum 3000–3499, Emerald 3500–3999 y Diamond 4000–4499 (Diamond I
    4400–4499); Champion 4500 o más.
- **Rango normalizado** (DP-26): `redondear(posición del escalón / (escalones − 1) × 100)`,
  con el primer escalón en la posición 0 y las mitades hacia arriba. LoL: Iron IV = 0,
  Diamond I = 90, Master = 93, Grandmaster = 97, Challenger = 100. CS2: Grey = 0,
  Light Blue = 17, Purple = 50, Gold = 100. R6: Copper V = 0, Diamond I = 97, Champion = 100.
  Los puntos no influyen. Una división ausente o desconocida en un tier con divisiones
  cuenta como la más baja de ese tier; una división en un tier sin divisiones (ej.
  `Master I`, `Grey II`, `Champion V`) se ignora; un tier que no está en la escala vale 0.
- **Partida**: identificador (texto, único dentro de la cuenta), juego (el de la cuenta),
  fecha en que se jugó, resultado (victoria o derrota), resumen, duración en minutos
  (entero) y variación de rango (entero). Resumen por juego: LoL
  `<campeón> · <asesinatos>/<muertes>/<asistencias>` (ej. `Ahri · 8/2/11`); R6
  `<operador> · <bajas> bajas` (ej. `Ash · 7 bajas`); CS2
  `<mapa> · <rondas a favor>-<rondas en contra>` (ej. `Mirage · 13-9`). Es el formato que
  muestra hoy la interfaz.
- **Partida principal de una lectura**: la única partida de la lectura cuya fecha es el
  instante actual; las demás partidas de la lectura tienen fechas anteriores. En la
  lectura n ≥ 1, su identificador no aparece en ninguna de las lecturas 0 a n − 1 del mismo
  juego e identificador canónico (RF-42, RF-43, DP-31).
- **Historial de rango**: lista de fotografías en el orden en que se obtuvieron las
  lecturas que las agregaron (de la primera a la última), no ordenada por fecha (DP-36).
  Su último elemento tiene siempre el mismo tier, división, puntos y normalizado que el
  rango vigente; su fecha es la de la lectura que agregó ese valor y puede ser anterior a
  la del rango vigente cuando una resincronización no agregó fotografía (DP-9, DP-36).
- **Datos simulados**: el rango, el historial, las partidas y la marca de verificada que
  produce el proveedor simulado para cualquier cuenta, incluidas las que el equipo vincula
  con sus identificadores reales. Son datos inventados y, a efectos de `AGENTS.md`
  ("Convenciones") y `PRODUCT.md` (principio 5), se etiquetan en la interfaz como los datos
  de demostración.
- **Datos de demostración precargados**: usuarios, cuentas o sesiones cargados de antemano
  (semilla). El servidor no los tiene (decisión de la spec 007, que sigue vigente); el
  backend simulado del navegador sí. No son lo mismo que los datos simulados.
- **Marca de datos simulados**: indicación, en cada cuenta, de que su rango, su historial,
  sus partidas y su marca de verificada son datos simulados (RF-37, DP-28).
- **Cuenta verificada**: marca que fija el proveedor simulado según el juego y el
  identificador canónico (RF-41), aplicando el principio "mismo identificador → mismo
  resultado" de RF-15 de la referencia. No demuestra que la cuenta sea de quien la vinculó.
  Cambia el significado de la interfaz actual ("se pudo leer el rango").
- **Representación de la cuenta**: lo que una respuesta entrega como "la cuenta":
  identificador, dueño, juego, identificador de cuenta, región, rango vigente, historial de
  rango, fecha de sincronización, marca de verificada y marca de datos simulados. No
  incluye las partidas ni el número de lectura (DP-32, DP-33); las partidas solo se
  entregan en el resumen por juego.
- **Resumen por juego**: la representación de la cuenta, sus últimas 8 partidas (las 8
  primeras según el orden de RF-28), la tasa de victorias y la tendencia.
  - Tasa de victorias: porcentaje de victorias en esas partidas, redondeado al entero más
    cercano con las mitades hacia arriba (5 de 8 = 62,5 → 63) (DP-11). Toda cuenta tiene al
    menos una partida (RF-4, RF-36), así que la tasa siempre está presente.
  - Tendencia: normalizado vigente menos el normalizado del primer elemento del historial,
    sin ventana de tiempo (DP-30). La regla da 0 si falta el rango vigente o el historial
    está vacío, aunque con el proveedor simulado no ocurre.

## Requisitos funcionales
Mensajes: todo error responde la respuesta de error de la spec 001 con el texto exacto que
indica cada RF (DP-6). Los 401 son los de la spec 002 (RF-10 a RF-12), más el de RF-44.
"Responde con la cuenta" significa con su representación (Definiciones).

- RF-1: EL SISTEMA exige sesión válida (spec 002) en todas las operaciones de esta spec.
- RF-2: CUANDO un usuario lista cuentas, EL SISTEMA responde 200 con las cuentas que cumplen
  los filtros opcionales de usuario (identificador o referencia propia) y de juego. SI el
  filtro de usuario aparece más de una vez, está vacío o no tiene formato válido, ENTONCES
  responde 400 con "id con formato inválido"; SI no, y el filtro de juego aparece más de
  una vez, está vacío o no es un juego, ENTONCES responde 400 con "Juego no válido.". Si
  los dos filtros son inválidos, responde solo el error del filtro de usuario. Un filtro de
  usuario con formato válido que no existe da 200 con lista vacía (DP-10).
- RF-3: CUANDO un usuario pide una cuenta por su identificador, EL SISTEMA responde 200 con
  ella.
- RF-4: CUANDO un usuario vincula una cuenta de cualquiera de los tres juegos con juego,
  identificador y región válidos, EL SISTEMA obtiene la lectura número 0 (RF-35) y crea la
  cuenta a nombre del usuario de la sesión con: el identificador según las Definiciones, la
  región con la grafía de la lista, la fotografía leída como rango vigente y como único
  elemento del historial, las partidas de la lectura (RF-28), la marca de verificada de la
  lectura (RF-41), el número de lectura 0 y el instante actual como fecha de
  sincronización. Responde 201 con la cuenta.
- RF-5: SI el usuario ya tiene una cuenta en ese juego, ENTONCES EL SISTEMA responde 400 con
  "Ya tienes una cuenta vinculada en este juego." y no crea otra; si dos vinculaciones del
  mismo usuario y juego llegan a la vez, solo una crea la cuenta y la otra responde este
  mismo 400 (DP-10).
- RF-6: SI al vincular falta el juego, el identificador o la región, o alguno no es válido
  (incluidos un valor nulo, vacío, formado solo por espacios o que no es texto), ENTONCES
  EL SISTEMA responde 400 sin crear nada, con (DP-6):
  - juego: "Juego no válido.";
  - identificador de LoL: "Riot ID no válido: usa el formato Nombre#TAG.";
  - identificador de R6: "Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto,
    guion o guion bajo.";
  - identificador de CS2: "SteamID64 no válido: son 17 dígitos que empiezan por 7656119.";
  - región: "Región no válida para <nombre del juego>." (ej. "Región no válida para
    League of Legends.").
  Si hay varios errores, responde solo el primero en ese orden.
- RF-7: EL SISTEMA ignora al vincular cualquier campo distinto de juego, identificador y
  región, y al editar cualquier campo distinto de identificador y región; en particular, al
  editar no lee ni valida el juego. En ambos casos se ignoran dueño, rango, historial,
  partidas, fecha de sincronización, número de lectura, marca de verificada y marca de
  datos simulados.
- RF-8: CUANDO el dueño edita la región de una cuenta con una región válida del juego de la
  cuenta, EL SISTEMA la guarda con la grafía de la lista sin obtener ninguna lectura y sin
  cambiar rango, historial, partidas, número de lectura ni fecha de sincronización, y
  responde 200 con la cuenta (DP-5, DP-35).
- RF-9: CUANDO el dueño desvincula su cuenta, EL SISTEMA la borra junto con su historial y
  sus partidas, y responde 204.
- RF-10: CUANDO el dueño pide resincronizar una cuenta de cualquiera de los tres juegos, EL
  SISTEMA obtiene la lectura con el número siguiente al último usado (RF-35) y lo deja
  guardado, deja la fotografía leída como rango vigente y la agrega al final del historial
  solo si su tier, división o puntos difieren del rango vigente anterior (DP-9); incorpora
  las partidas según RF-28, deja la marca de verificada de la lectura (RF-41), registra el
  instante actual como fecha de sincronización y responde 200 con la cuenta.
- RF-11: SI quien edita, desvincula o resincroniza una cuenta no es su dueño, ENTONCES EL
  SISTEMA responde 403 con "No puedes modificar la cuenta de otro jugador." y no cambia
  nada.
- RF-12: CUANDO un usuario pide el resumen de un juego para cualquier usuario (o la
  referencia propia), EL SISTEMA responde 200 con el resumen por juego.
- RF-13: Al pedir el resumen, EL SISTEMA responde, en este orden (DP-10): SI el usuario no
  tiene formato válido, ENTONCES 400 con "id con formato inválido"; SI el juego no existe,
  ENTONCES 400 con "Juego no válido."; SI el usuario no existe, ENTONCES 404 con "Usuario no
  encontrado."; SI el usuario no tiene cuenta en ese juego, ENTONCES 404 con "El jugador no
  tiene una cuenta vinculada en este juego.".
- RF-14: CUANDO se elimina un usuario (spec 003, RF-11), EL SISTEMA borra también todas sus
  cuentas de juego, incluida cualquiera que se esté vinculando en ese momento (RF-39).
- RF-15: EL SISTEMA conserva como máximo 20 partidas por cuenta, elegidas según RF-28
  (DP-7).
- RF-22: SI la edición de una cuenta incluye el identificador con un valor que no es el
  mismo que el guardado (según el identificador canónico; un valor nulo, vacío o que no es
  texto nunca es el mismo), ENTONCES EL SISTEMA responde 400 con "El identificador no se
  puede editar: desvincula la cuenta y vuelve a vincularla." y no cambia nada. Si es el
  mismo, se ignora y el identificador guardado no cambia (DP-19).
- RF-28: CUANDO una lectura entrega partidas, EL SISTEMA las une a las guardadas sin repetir
  ninguna (dos partidas son la misma si tienen el mismo identificador; se conserva la ya
  guardada), las ordena de la más reciente a la más antigua según su fecha y, a igual fecha,
  por identificador comparado como texto, carácter a carácter según su código Unicode, de
  mayor a menor; y conserva las 20 primeras según ese orden, salvo que la partida principal
  de la lectura quede después de la vigésima: en ese caso conserva la partida principal y
  las 19 primeras de las demás, todas en ese mismo orden. Así la partida principal de la
  última lectura siempre queda guardada (DP-7, DP-31).
- RF-29: EL SISTEMA resuelve las operaciones sobre una cuenta existente (obtener, editar,
  desvincular, resincronizar) en este orden y responde solo el primer error (DP-10):
  sesión (401, incluido RF-44) → formato del identificador de cuenta (400 "id con formato
  inválido") → existencia (404 "Cuenta no encontrada.") → propiedad (403, RF-11; no aplica
  a obtener) → datos enviados al editar (400: primero RF-22, después RF-38). Al vincular:
  sesión → datos (RF-6) → duplicado (RF-5). Al listar: sesión → RF-2. Al pedir el resumen:
  sesión → RF-13.
- RF-33: CUANDO se vincula una cuenta, EL SISTEMA la agrega a la lista de cuentas de su
  dueño, y CUANDO se desvincula, la quita (relación de la sección 2 de la referencia); esa
  lista no aparece en ninguna respuesta de usuario (DP-16).
- RF-34: EL SISTEMA obtiene toda lectura del proveedor simulado, en desarrollo, prueba y
  producción, sin consultar ningún servicio externo ni necesitar claves (RF-15 de la
  referencia).
- RF-35: EL SISTEMA produce cada lectura como función determinista del juego, del
  identificador canónico, del número de lectura y del instante actual: las mismas entradas
  dan siempre la misma lectura, sin azar no reproducible. La región no es una entrada
  (DP-5). Qué depende de cada entrada lo fijan RF-41 y RF-43; cómo evoluciona entre
  lecturas, RF-42.
- RF-36: EL SISTEMA entrega en cada lectura: una fotografía con un tier de la escala del
  juego, división solo si el tier la tiene, puntos enteros dentro de la banda del escalón
  (DP-34), el valor normalizado de ese tier y división y la fecha = instante actual; entre
  1 y 8 partidas, con identificadores distintos entre sí, el juego de la cuenta, todos los
  campos de la definición de partida, la partida principal con fecha = instante actual y
  las demás con fecha anterior (DP-8, DP-31).
- RF-37: EL SISTEMA incluye la marca de datos simulados en toda cuenta que entrega, también
  cuando la cuenta va dentro del resumen por juego o de otra respuesta (spec 005), para que
  la interfaz pueda etiquetar como simulados el rango, el historial, las partidas y la
  marca de verificada (DP-28). El texto de la etiqueta lo fija la spec 007.
- RF-38: SI la edición incluye la región con un valor que no es una región válida del juego
  de la cuenta (incluidos un valor nulo, vacío, formado solo por espacios o que no es
  texto), ENTONCES EL SISTEMA responde 400 con "Región no válida para <nombre del juego>." y
  no cambia nada (DP-23).
- RF-39: CUANDO llegan a la vez dos resincronizaciones de la misma cuenta, EL SISTEMA deja la
  cuenta igual que si se hubieran procesado una después de la otra: cada una usa un número
  de lectura distinto y ninguna partida ni fotografía queda repetida o perdida. CUANDO una
  desvinculación coincide con una resincronización o una edición de la misma cuenta, EL
  SISTEMA nunca deja la cuenta (ni sus partidas o su historial) existiendo después de
  responder 204 a la desvinculación; la otra operación responde lo que corresponda a su
  turno (200 si terminó antes, 404 "Cuenta no encontrada." si no). CUANDO la eliminación de
  un usuario coincide con una vinculación suya, EL SISTEMA nunca deja una cuenta de ese
  usuario existiendo después de completar la eliminación; la vinculación responde 201 si
  terminó antes (y la cuenta se borra con el usuario, RF-14) o el 401 de RF-44 si no
  (DP-29, DP-37).
- RF-40: CUANDO el dueño edita una cuenta con el cuerpo vacío o solo con campos ignorados,
  EL SISTEMA responde 200 con la cuenta sin cambios (DP-23).
- RF-41: EL SISTEMA fija la marca de verificada de cada lectura con una regla fija y
  determinista que depende solo del juego y del identificador canónico, de modo que no
  cambia entre resincronizaciones y es la misma para todos los usuarios que vinculen ese
  identificador. La regla marca como verificados aproximadamente la mitad de los
  identificadores: en el conjunto de 100 identificadores válidos de cada juego que fija el
  plan, salen verificados entre 40 y 60. El plan fija la regla; las pruebas fijan, en cada
  juego, al menos dos identificadores concretos que salen verificados y dos que no. No
  existe ninguna operación para verificar una cuenta (decisión del usuario).
- RF-42: CUANDO el proveedor simulado produce la lectura número n ≥ 1 de un juego e
  identificador canónico, EL SISTEMA entrega una fotografía cuyo escalón es el mismo que el
  de la lectura n − 1 o está a un escalón de él, sin salir de la escala del juego, y una
  partida principal cuyo identificador no aparece en ninguna de las lecturas 0 a n − 1 de
  ese juego e identificador canónico (decisión del usuario).
- RF-43: EL SISTEMA hace depender solo del juego, del identificador canónico y del número de
  lectura: el tier, la división y los puntos de la fotografía; el número de partidas; el
  identificador, el resultado, el resumen, la duración y la variación de rango de cada
  partida; cuál es la partida principal, y la antigüedad de cada partida respecto del
  instante actual. El instante actual solo fija las fechas: la de la fotografía y la de la
  partida principal son el instante actual, y la de cada otra partida es el instante actual
  menos su antigüedad, que es de al menos un minuto (DP-31).
- RF-44: SI la sesión es válida pero su usuario ya no existe (fue eliminado), ENTONCES EL
  SISTEMA responde 401 con "sesión no iniciada" en cualquier operación de esta spec y no
  crea ni cambia nada (DP-37).
- RF-45: SI una operación de esta spec falla con un error inesperado (500 de la spec 001),
  ENTONCES EL SISTEMA deja la cuenta exactamente como estaba antes de la operación,
  incluidos su número de lectura, su historial y sus partidas (DP-33).

Retirados en esta versión (fuentes reales y Steam): RF-16 (jugador no encontrado en la
fuente), RF-17 y RF-18 (fuente no disponible, 503), RF-21 (lectura sin rango), RF-23 a
RF-26 y RF-30 a RF-32 (verificación con Steam), RF-27 (lectura al cambiar la región de LoL).
Retirados por la decisión "R6 con rango" del 2026-10-17: RF-19 (vincular R6 sin lectura) y
RF-20 (409 al resincronizar R6).

## Requisitos no funcionales
- RNF-1: Las pruebas automáticas de esta spec no abren conexiones a ningún servicio distinto
  de la base de datos de prueba de la spec 001 ni necesitan claves; con esa base en el
  propio equipo pasan sin conexión a Internet. Gracias a RF-35, RF-41 y RF-43, comprueban
  valores exactos de rango, partidas y marca de verificada, tanto en la vinculación como en
  resincronizaciones sucesivas (números de lectura 0, 1, 2…). El plan fija la regla
  generadora del proveedor simulado; las pruebas fijan el instante actual entregándolo
  como dato (por ejemplo, inyectándolo como parámetro), sin variables de entorno nuevas
  (RNF-9) ni dependencias nuevas (RNF-8).
- RNF-2: Nada inventado presentado como real: los únicos datos inventados son los datos
  simulados y siempre llevan la marca de datos simulados (RF-37), para cumplir la
  constitución (principio 5: "nada de datos reales inventados"), `PRODUCT.md` (principio 5:
  "Nada inventado: los datos de demostración se muestran como lo que son") y `AGENTS.md`
  ("Convenciones": "Los datos de demostración se etiquetan siempre como tales en la
  interfaz"). Ningún mensaje ni respuesta atribuye esos datos a Riot, Ubisoft, Valve,
  FACEIT ni a ninguna fuente real.
- RNF-3: Las respuestas tienen los mismos campos y formatos que consume hoy la interfaz
  (fechas en ISO 8601, identificadores como texto; la cuenta sin partidas y las partidas
  solo en el resumen), más la marca de datos simulados (RF-37); "verificada" cambia de
  significado (RF-41). La spec 007 adapta la interfaz.
- RNF-7: La lectura simulada (incluidas su evolución y la marca de verificada), la
  normalización, la decisión de agregar una fotografía al historial, la unión de partidas,
  la tasa de victorias y la tendencia son reglas puras que reciben el instante actual como
  dato cuando lo necesitan (constitución, principio 3).
- RNF-8: Esta spec no justifica ninguna dependencia nueva (constitución, principio 1). Si el
  plan necesitara una, se vuelve a esta spec antes (DP-12).
- RNF-9: Esta spec no agrega variables de entorno: el servidor arranca y funciona con las
  de las specs 001 y 002.

Retirados en esta versión: RNF-4 (claves de las fuentes), RNF-5 (tiempos máximos de las
fuentes) y RNF-6 (verificación con Steam).

## Casos límite
- Vincular la misma cuenta con el identificador en mayúsculas o minúsculas distintas da la
  misma lectura (RF-35); se guarda el identificador como lo envió cada usuario.
- El mismo identificador vinculado por dos usuarios distintos: se permite; con el mismo
  número de lectura e instante, los dos reciben la misma lectura, y en cualquier caso la
  misma marca de verificada, así que si una sale verificada las dos salen verificadas
  (DP-17, RF-41; aceptado por el usuario).
- Una cuenta verificada sigue verificada tras cualquier número de resincronizaciones, y una
  no verificada sigue no verificada (RF-41).
- El equipo no puede elegir qué cuentas salen verificadas: depende solo del juego y del
  identificador (RF-41, decisión del usuario).
- Rainbow Six Siege se comporta como LoL y CS2: vincular y resincronizar obtienen rango y
  partidas; ninguna operación de esta spec responde 409.
- Desvincular y volver a vincular: la cuenta nueva empieza en el número de lectura 0, con un
  historial de un elemento y el mismo rango que tuvo la vinculación original; el historial
  anterior se pierde (DP-18, RF-43).
- Resincronizar: el escalón queda igual o se mueve uno; en el escalón más alto
  (Challenger, Champion, Gold de CS2) nunca sube y en el más bajo (Iron IV, Copper V, Grey)
  nunca baja (RF-42). Los puntos quedan siempre dentro de la banda del nuevo escalón
  (DP-34).
- La misma lectura (juego, identificador canónico y número) hecha a horas distintas da el
  mismo tier, división, puntos y las mismas partidas (identificadores, resultados,
  resúmenes, duraciones, variaciones y número de partidas); solo cambian las fechas, que se
  desplazan con el instante actual (RF-43).
- Resincronizar con el mismo tier, división y puntos: no se agrega fotografía; el rango
  vigente lleva la fecha nueva y el último elemento del historial conserva la de la lectura
  que lo agregó; sí se actualizan partidas, número de lectura y fecha de sincronización
  (DP-9, DP-36).
- Una resincronización que entrega partidas ya guardadas (mismo identificador): no se
  repiten y se conserva la fecha guardada (RF-28); la partida principal nunca es una de
  ellas (RF-42).
- Una cuenta con más de 20 partidas tras una resincronización: se conservan 20, y la
  partida principal de esa lectura siempre está entre ellas, aunque haya más de 20
  partidas guardadas con fecha igual o posterior (RF-28).
- Resincronizar con un instante actual anterior a la fecha de sincronización previa (reloj
  del servidor atrasado): se procesa igual; la fecha de sincronización pasa a ser ese
  instante; si corresponde agregar fotografía, va al final del historial aunque su fecha
  sea anterior (DP-36); la partida principal se guarda (RF-28) aunque quede detrás de
  partidas más recientes y fuera de las 8 del resumen.
- Una resincronización que falla con 500: la cuenta queda igual, y la siguiente
  resincronización que responde 200 usa el número que habría usado la fallida (RF-45).
- Dos partidas con la misma fecha: va primero la de identificador mayor como texto (ej.
  `m-9` antes que `m-10`, porque "9" > "1") (RF-28).
- Cambiar la región: no cambia el rango, el historial ni las partidas (RF-8); no existe
  mezcla de historial entre regiones porque la región no interviene en la lectura.
- Región `" las "` o `"Las"` al vincular o editar una cuenta de LoL: es válida y se guarda
  `LAS` (DP-35).
- Editar enviando el mismo identificador actual, con otras mayúsculas o con espacios en los
  extremos, junto con una región nueva: se guarda la región y el identificador guardado no
  cambia (RF-22).
- Editar con el identificador nulo o vacío: 400 de RF-22. Editar con la región nula, vacía o
  `"   "`: 400 de RF-38. Omitir un campo no es un error.
- Editar con el cuerpo vacío o solo con campos ignorados (incluido el juego): 200 sin
  cambios (RF-40). Editar con un juego inexistente en el cuerpo: se ignora (RF-7).
- Editar con identificador distinto y región inválida: 400 de RF-22 (RF-29).
- No dueño que edita una cuenta ajena con región inválida: 403 (RF-29).
- Identificador de cuenta mal formado en obtener, editar, desvincular o resincronizar: 400
  "id con formato inválido"; con formato válido pero inexistente: 404 "Cuenta no
  encontrada." (RF-29).
- Listar con `user=abc` y `game=xyz`: 400 "id con formato inválido" (RF-2).
- Listar con `user=<id>&user=<id>` o con `user=` vacío: 400 "id con formato inválido";
  con `game=lol&game=cs2` o con `game=` vacío: 400 "Juego no válido." (RF-2, DP-10).
- Dos resincronizaciones simultáneas, una desvinculación durante una resincronización o la
  eliminación del usuario durante una vinculación suya: RF-39.
- Una petición con una credencial todavía válida de un usuario ya eliminado: 401 "sesión no
  iniciada" (RF-44).
- Tier que no está en la escala: la regla de normalización le da 0; el proveedor simulado
  nunca lo produce (RF-36).
- División en un tier sin divisiones (`Master I`, `Grey II`, `Champion V`): la regla de
  normalización la ignora (Master I = Master = 93); el proveedor simulado nunca la produce
  (RF-36).
- Master, Grandmaster y Challenger (LoL), Champion (R6) y todos los tiers de CS2: la
  fotografía no incluye división.
- Con historial de un solo elemento, la tendencia es 0.
- Obtener una cuenta o listarlas no entrega sus partidas; el resumen entrega las 8 primeras
  (DP-32).
- Dos usuarios distintos pueden vincular cuentas del mismo juego.

## Fuera de alcance
- Cualquier fuente real de rango, partidas o identidad (Riot, Ubisoft, Valve/Steam, FACEIT,
  Leetify) y el scraping de sitios de estadísticas (DP-24). Cambiar el proveedor simulado
  por una fuente real exige una spec nueva.
- Verificar la propiedad de una cuenta con la plataforma del juego (Steam OpenID, Riot Sign
  On) o con cualquier operación de verificación (RF-41).
- Elegir qué cuentas salen verificadas (RF-41).
- Resincronización periódica automática del rango (DP-24).
- Seguir automáticamente un cambio de identificador (DP-18).
- Elegir entre proveedor simulado y real según el entorno.
- Entregar las 20 partidas guardadas en alguna respuesta (DP-32).
- Coincidencias (spec 005) e interfaz (spec 007).

## Criterios de finalización
- [x] Todas las decisiones de la tabla "Decisiones propuestas" están aprobadas o
      reemplazadas por el usuario antes de aprobar la spec (aprobadas el 2026-10-17).
- [ ] La spec 007 incorpora, antes de su aprobación, la etiqueta de datos simulados guiada
      por RF-37 también con el servidor real (comprobable en su texto). Hasta entonces la
      convención de `AGENTS.md` sobre datos de demostración no se cumple con el servidor
      real.
- [ ] Las reglas de normalización tienen pruebas unitarias: Iron IV = 0, Diamond I = 90,
      Master = 93, Challenger = 100, Grey = 0, Light Blue = 17, Gold = 100, Copper V = 0,
      Diamond I de R6 = 97, Champion = 100, tier inexistente = 0, división ausente = la más
      baja, división en un tier sin divisiones ignorada (Master I = 93, Grey II = 0).
- [ ] La lectura simulada tiene pruebas unitarias en los tres juegos: mismas entradas dan la
      misma lectura; identificadores que solo difieren en mayúsculas o espacios dan la
      misma lectura; la región no la cambia; la fotografía cumple la escala y la banda de
      puntos de su escalón; hay entre 1 y 8 partidas, con el juego de la cuenta,
      identificadores distintos, una sola con fecha = instante actual y las demás
      anteriores.
- [ ] La evolución de la lectura tiene pruebas unitarias: entre las lecturas n y n + 1 el
      escalón cambia como mucho uno y nunca sale de la escala; la partida principal de la
      lectura n + 1 es nueva; el mismo número de lectura a horas distintas da todo igual
      salvo las fechas, desplazadas por la diferencia de instantes (RF-42, RF-43).
- [ ] La marca de verificada tiene pruebas unitarias: es igual en todas las lecturas de un
      identificador; en cada juego, al menos dos identificadores concretos salen
      verificados y dos no; en el conjunto de 100 identificadores del plan, entre 40 y 60
      salen verificados (RF-41).
- [ ] La tasa de victorias tiene pruebas unitarias: 5 de 8 = 63, 0 de 8 = 0. La unión de
      partidas tiene pruebas unitarias: sin repetidos, orden por fecha con desempate por
      identificador como texto, corte en 20 y partida principal conservada cuando hay más
      de 20 partidas con fecha igual o posterior. La tendencia tiene pruebas unitarias:
      historial de un elemento = 0.
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta (con
      el texto exacto del mensaje en los errores) y, en las escrituras, la base de datos.
- [ ] Una prueba confirma que vincular con un dueño, un rango, una marca de verificada, un
      número de lectura o una marca de datos simulados en el cuerpo deja la cuenta a nombre
      del usuario de la sesión, con los valores de la lectura.
- [ ] Una prueba vincula y resincroniza dos veces una cuenta de cada juego (incluido R6) con
      instantes fijos y comprueba los valores exactos de rango, historial y partidas
      (RNF-1).
- [ ] Una prueba confirma que toda cuenta entregada (listar, obtener, vincular, editar,
      resincronizar y resumen) lleva la marca de datos simulados y no lleva partidas ni
      número de lectura (RF-37, DP-32, DP-33).
- [ ] Una prueba confirma que tras una resincronización sin cambio de rango el último
      elemento del historial coincide con el vigente salvo la fecha (DP-36).
- [ ] Hay una prueba por cada salto del orden de RF-29 y de RF-2, incluidos filtros
      repetidos y vacíos.
- [ ] Hay una prueba de dos resincronizaciones simultáneas, otra de desvinculación
      simultánea a una resincronización y otra de eliminación del usuario simultánea a una
      vinculación (RF-39).
- [ ] Hay una prueba de RF-44 (credencial de un usuario eliminado) y otra de RF-45 (fallo
      forzado durante una resincronización deja la cuenta y su número de lectura igual).
- [ ] Las pruebas del servidor pasan sin conexión a Internet y sin variables de entorno
      distintas de las de las specs 001 y 002 (RNF-1, RNF-9).
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
No quedan dudas abiertas. Las anteriores (cuenta verificada, proporción de cuentas
verificadas, R6 y evolución de la lectura) se resolvieron el 2026-10-17 (ver "Decisiones
del usuario").

## Impacto en otras specs
No se editan desde aquí; cada cambio se hace en su spec cuando el usuario apruebe la
decisión correspondiente.
- Spec 001: la definición de "variable obligatoria" deja de mencionar las claves de la spec
  004 (RNF-9). La tabla de errores que pasa a su plan (sección 5.7 de la referencia) no
  incluye 503 de fuente ni ningún 409 de esta spec. Su RF-6 (500) vuelve a no tener
  excepción por fuentes.
- Spec 003: su RF-5 no fija el texto del 404; esta spec usa "Usuario no encontrado."
  (DP-6) y conviene que 003 lo adopte. Su plan debe excluir la lista de cuentas de la
  representación del usuario (RF-33, prevalece sobre RT-07 de la referencia), coherente con
  su RNF-2. Conviene que 003 adopte RF-44 (credencial de un usuario eliminado → 401) para
  sus propias operaciones.
- Spec 005: R6 cruza rango como LoL y CS2. Caen: el párrafo de contexto sobre R6 solo
  horario; la definición "Puntaje solo horario" y la frase "No existe cuando el juego no
  tiene fuente de rango" de "Distancia de rango"; RF-10 (R6 solo horario); el "(cuando
  existe)" de RF-3; el "y la distancia, que falta en R6" de RNF-2; el puntaje solo horario
  de RNF-1 y del criterio de pruebas unitarias; los dos casos límite de R6 (distancia
  máxima 0 y fuera de rango en R6); el caso límite "solo verificadas en LoL o R6 = lista
  vacía", y el criterio "una de R6 sin distancia". La definición "Cuenta verificada" pasa a
  remitir a RF-41 de esta spec (marca del simulador en los tres juegos), así que el filtro
  "solo verificadas" sigue funcionando en los tres juegos. Su duda de la escala de CS2 se
  cierra con DP-2 y DP-34 (bandas de la interfaz y de CS Rating, no FACEIT); su duda sobre
  candidatos sin rango se cierra (toda cuenta tiene rango en los tres juegos). La
  normalización de LoL y R6 (DP-26) cambia las distancias respecto de la interfaz actual.
  Cada candidato lleva la marca de datos simulados en su cuenta (RF-37) y su cuenta no
  lleva partidas (DP-32).
- Spec 007:
  - Caen por las fuentes reales y Steam: HU-5 y RF-17 (Steam); los mensajes "Jugador no
    encontrado." y "Fuente no disponible…" de RF-9; los casos límite de la clave de Riot
    caducada y de Steam; "Verificación con Steam en modo simulado" de Fuera de alcance; en
    el recorrido de los criterios, "la clave de Riot vigente" y "vincular y verificar con
    Steam una cuenta CS2" (pasa a "vincular y resincronizar una cuenta CS2").
  - Caen por R6 con rango y cuentas siempre con rango: HU-6 (R6 sin rango); en el párrafo
    de contexto, "R6 sin rango, cuentas sin rango, verificación de CS2 con Steam" (queda
    el nuevo significado de "cuenta verificada" y la marca de datos simulados); en
    Definiciones, "cuenta sin rango", "juego sin fuente de rango" y "Mensaje de R6" (esta
    spec ya no define los dos primeros); el "y R6 sin rango" de RF-10; RF-12 (mensaje de
    R6); RF-14 ("Sin rango"); RF-18 completo (no ofrecer resincronizar ni verificar R6, ni
    verificar LoL: R6 se resincroniza como los demás y no existe verificación en ningún
    juego); el criterio "ni se menciona una fuente de R6" (RF-15 pasa a mostrar "simulado"
    como fuente de los tres juegos); el paso "ver el mensaje de R6" del recorrido (pasa a
    "ver rango, historial y partidas de R6"), y su duda abierta completa (la variación por
    partida siempre llega y no hay candidatos sin rango).
  - Cambian: RF-11 y el criterio "Con el servidor real no aparecen ni la etiqueta 'Datos de
    demostración' ni la pista de la cuenta demo": con el servidor real se muestra la
    etiqueta de datos simulados en el rango, el historial, las partidas y la marca de
    verificada, guiada por RF-37 (el texto lo fija 007; puede ser "Datos de
    demostración"); la pista de la cuenta demo sigue solo en el modo simulado. RF-16 usa
    "verificada" para la marca fijada por el simulador, etiquetada como simulada (RF-41),
    no para "el dueño inició sesión en la plataforma del juego". El botón de
    resincronizar debe reflejar que el rango puede moverse un escalón y que llegan
    partidas nuevas (RF-42). El modo simulado del navegador (RF-10) debe adoptar la
    escala, las bandas y la normalización de DP-2, DP-26 y DP-34 y, si se puede, la misma
    lectura determinista y su evolución. El gráfico del historial no debe suponer que la
    fecha del último elemento es la del rango vigente (DP-36). El comentario de la
    tendencia en el contrato de la interfaz ("variación en los últimos 30 días") debe
    decir "vigente menos el primero del historial" (DP-30).
  - Terminología: la frase "El servidor no tiene datos de demostración" se mantiene con el
    sentido de "datos de demostración precargados" (Definiciones); el rango de las cuentas
    reales del equipo será igualmente simulado y etiquetado.
- Spec 008: RF-4 muestra en R6 el rango vigente, el historial y las partidas como en LoL y
  CS2 (cae "en R6 muestra el mensaje de R6"). RF-14, que muestra el mensaje de R6 en lugar
  de la distancia de rango en R6, se retira: en R6 se muestra la distancia como en los
  otros juegos. Caen también la definición "Mensaje de R6", el "(en R6 manda RF-14)" del
  primer caso límite, el caso límite de jugadores sin rango en LoL o CS2, la "pestaña R6"
  del criterio de estados (pasa a recorrerse como las demás) y su duda abierta (toda
  cuenta tiene rango). La ficha debe etiquetar el rango, el historial, las partidas y la
  marca de verificada como datos simulados (RF-37).
- Spec 010: caen HU-4, RF-10 (renovación de la clave de Riot), el caso límite de la clave
  caducada, "Renovación automática de la clave de Riot" de Fuera de alcance y su duda
  abierta sobre los términos de Riot. RF-7 y RF-9 dejan de listar claves de fuentes, y el
  caso límite de secretos legibles por otros grupos deja de mencionar las claves de Riot y
  FACEIT (RNF-9); RNF-4 deja de mencionar las fuentes externas. RF-11 debe decir además
  que el rango, el historial, las partidas y la verificación son datos simulados en todos
  los entornos, aunque no haya datos de demostración precargados.
- `PRODUCT.md` (no es una spec): el principio 2 ("el rango se obtiene, no se declara") y
  "Positioning" quedan en tensión con un rango y una verificación simulados (ver
  "Tensiones reconocidas"); "Operating Context" menciona reobtención periódica y scraping,
  excluidos por DP-24; "Evidence on Hand" sigue siendo cierto (no hay integración viva).

## Decisiones propuestas (aprobadas por el usuario)
DP-18 estaba aprobada antes. Las demás, propuestas por el planificador como la opción
conservadora, las aprobó el usuario el 2026-10-17 ("Apruebo todo").

| DP | Estado | Decisión propuesta | Alternativa descartada |
| --- | --- | --- | --- |
| DP-2 | Aprobada por el usuario (2026-10-17; cambia) | La escala de CS2 es la que usa hoy la interfaz: Grey a Gold, sin división, puntos = CS Rating. | Niveles 1 a 10 de FACEIT: solo tenían sentido con FACEIT como fuente. |
| DP-5 | Aprobada por el usuario (2026-10-17; cambia) | La región es informativa en los tres juegos: no interviene en la lectura y editarla solo la guarda. | Hacer una lectura al cambiar la región: con un proveedor que no usa la región, produciría cambios de rango sin motivo. |
| DP-6 | Aprobada por el usuario (2026-10-17) | Textos exactos de todos los errores (los de cada RF), iguales en servidor e interfaz. | Mensajes genéricos del manejador de errores: no dicen al jugador qué corregir. |
| DP-7 | Aprobada por el usuario (2026-10-17; ajusta) | Partidas identificadas por su identificador (texto); unión sin repetidos, orden por fecha con desempate por identificador como texto (código Unicode, de mayor a menor); se conservan 20, siempre con la partida principal de la última lectura. | Reemplazar la lista en cada lectura: perdería partidas guardadas. Desempate numérico: los identificadores no son números. |
| DP-8 | Aprobada por el usuario (2026-10-17; cambia) | Cada lectura entrega entre 1 y 8 partidas con todos los campos (incluido el juego), la principal con fecha = instante actual y las demás anteriores. | Hasta 20 partidas por lectura: llenaría la lista en una sola lectura. Permitir 0: dejaría resúmenes sin tasa de victorias y resincronizaciones sin partidas nuevas. |
| DP-9 | Aprobada por el usuario (2026-10-17; ajusta) | La resincronización agrega fotografía al historial solo si cambió tier, división o puntos respecto del rango vigente; el historial no tiene límite. | Agregar siempre (referencia): llena el historial de puntos repetidos. |
| DP-10 | Aprobada por el usuario (2026-10-17; cambia) | Orden de errores de RF-29 (propiedad antes que validación del cuerpo); en RF-2 el filtro de usuario antes que el de juego; un filtro repetido o vacío es inválido (400); filtro de usuario inexistente = lista vacía; RF-5 garantizado ante peticiones simultáneas. | Validar el cuerpo antes de la propiedad: daría a un no dueño detalles de validación de una cuenta ajena. Tomar el primer valor de un filtro repetido o tratar el vacío como ausente: ocultaría un error del cliente. |
| DP-11 | Aprobada por el usuario (2026-10-17) | Tasa de victorias redondeada al entero más cercano, mitades hacia arriba (62,5 → 63). | Truncar: subestima sistemáticamente. |
| DP-12 | Aprobada por el usuario (2026-10-17; ajusta) | Sin dependencias nuevas; las pruebas solo se conectan a la base de prueba y fijan el instante sin variables de entorno nuevas. | Librería de datos simulados: el proveedor es una regla pura pequeña y no la justifica. |
| DP-15 | Aprobada por el usuario (2026-10-17; cambia) | Esta spec prevalece sobre la referencia en lo listado en "Qué prevalece" (incluida la lectura que evoluciona con el número de lectura y la cuenta sin partidas); vuelven a aplicar RF-15 de la referencia (de donde sale la verificada por identificador), 5.1 (proveedor simulado), el campo verificada de 5.4 ("lo fija el proveedor") y 11. | Seguir la referencia en todo: permitiría editar el identificador, contra la decisión del usuario, y dejaría el rango fijo al resincronizar. |
| DP-16 | Aprobada por el usuario (2026-10-17; ajusta) | Se mantiene la lista de cuentas en el usuario (vincular agrega, desvincular quita), sin exponerla: prevalece sobre RT-07. | Exponerla como hace RT-07: cambia la forma de usuario que consume la interfaz (spec 003, RNF-2). |
| DP-17 | Aprobada por el usuario (2026-10-17; cambia) | El mismo identificador puede vincularlo más de un usuario; todos reciben la misma lectura simulada y la misma marca de verificada (esto último aceptado por el usuario). | Identificador único entre usuarios: un tercero podría bloquear al dueño real. |
| DP-18 | **Aprobada por el usuario** | Para cambiar el identificador se desvincula y se vuelve a vincular, perdiendo el historial. | Editar el identificador conservando el historial: choca con "identificador no editable". |
| DP-19 | Aprobada por el usuario (2026-10-17; ajusta) | El identificador se guarda como lo envió el usuario, sin espacios en los extremos; se compara y se usa en la lectura en su forma canónica (minúsculas). | Guardar la forma canónica: cambiaría lo que escribió el jugador (ej. su Riot ID). Comparación exacta: un cambio solo de mayúsculas daría un 400 confuso. |
| DP-23 | Aprobada por el usuario (2026-10-17; ajusta) | Editar con cuerpo vacío o solo campos ignorados = 200 sin cambios; región o identificador presentes con valor nulo, vacío o solo espacios son inválidos (no ausentes). | Tratar nulo o vacío como ausente: ocultaría un error del cliente. |
| DP-24 | Aprobada por el usuario (2026-10-17; cambia) | Ninguna fuente real ni scraping; resincronización solo a pedido del dueño. | Reobtención periódica: sin fuente real solo generaría cambios inventados sin que nadie los pida. |
| DP-26 | Aprobada por el usuario (2026-10-17; cambia) | Normalización por escalones: Master, Grandmaster, Challenger (LoL) y Champion (R6) sin división; los puntos no influyen; división ausente = la más baja; división en un tier sin divisiones se ignora. | Escala actual de la interfaz: inventa divisiones en tiers que no las tienen y Challenger I sería el único 100. Valer 0 ante una división en un tier sin divisiones: hundiría un Master por un dato sobrante. |
| DP-28 | Aprobada por el usuario (2026-10-17; nueva) | Cada cuenta entregada lleva la marca de datos simulados, y la interfaz etiqueta con ella el rango, el historial, las partidas y la verificación. | Que la interfaz etiquete todo siempre sin marca del servidor: si un juego tuviera una fuente real, no sabría qué etiquetar. |
| DP-29 | Aprobada por el usuario (2026-10-17; cambia) | Operaciones simultáneas sobre una cuenta dan el mismo resultado que en serie; una desvinculación nunca se deshace por otra operación en curso; eliminar un usuario nunca deja una cuenta suya creada por una vinculación simultánea. | No garantizar nada: dos resincronizaciones podrían duplicar partidas o recrear una cuenta borrada, y una vinculación podría dejar una cuenta sin dueño. |
| DP-30 | Aprobada por el usuario (2026-10-17; nueva) | Tendencia = normalizado vigente − normalizado del primer elemento del historial, sin ventana de tiempo (lo que hace hoy el backend simulado); se corrige el comentario de "30 días" del contrato de la interfaz. | Ventana de 30 días: exige el instante actual en el resumen y daría 0 en una demostración con lecturas del mismo día. |
| DP-31 | Aprobada por el usuario (2026-10-17; cambia) | Todo el contenido de una lectura (rango, número de partidas y sus campos, cuál es la principal y la antigüedad de cada partida) depende solo del juego, del identificador canónico y del número de lectura; el instante solo fija las fechas. La partida principal es nueva, lleva el instante actual y la unión de RF-28 la conserva siempre entre las 20. | Que el contenido dependa también del instante: la misma resincronización daría resultados distintos según la hora y las pruebas no serían reproducibles. Dar el instante a cualquier partida de la lectura y cortar solo por fecha: si cae en una partida ya guardada se conserva la fecha antigua y la partida realmente nueva puede quedar fuera de las 20. |
| DP-32 | Aprobada por el usuario (2026-10-17; nueva) | La representación de la cuenta no incluye sus partidas; las partidas solo se entregan en el resumen por juego (las 8 primeras). | Incluir las 20 partidas guardadas en la cuenta (como sugiere el campo de 5.4 de la referencia): cambia la forma de cuenta que consume la interfaz (`GameAccount` no tiene partidas) y las candidaturas de la spec 005. |
| DP-33 | Aprobada por el usuario (2026-10-17; nueva) | El número de lectura se guarda con la cuenta como dato interno, no aparece en ninguna respuesta y solo lo consume una resincronización que responde 200; una operación que falla deja la cuenta como estaba. | Exponerlo en la respuesta: cambia la forma que consume la interfaz sin uso para el jugador. Consumirlo aunque falle: la siguiente lectura saltaría un número y las pruebas de valores exactos dependerían de fallos. |
| DP-34 | Aprobada por el usuario (2026-10-17; nueva) | Los puntos de cada fotografía quedan dentro de la banda de su escalón: LoL 0–99 LP con división y ≥ 0 en Master+; CS2 en bandas de 5000 CS Rating (Grey 0–4999 … Gold ≥ 30000); R6 100 MMR por división desde Copper V 1000–1099 hasta Champion ≥ 4500. | Puntos libres sin relación con el tier: la interfaz podría mostrar "Grey · 28000 CS Rating" o "Copper V · 4600 MMR". |
| DP-35 | Aprobada por el usuario (2026-10-17; nueva) | La región se compara sin espacios en los extremos y sin distinguir mayúsculas, y se guarda con la grafía de la lista del juego. | Comparación exacta: rechazaría `" LAS"` o `"las"`, al revés de como se trata el identificador. Guardar lo enviado: la misma región aparecería escrita de varias formas. |
| DP-36 | Aprobada por el usuario (2026-10-17; nueva) | El historial va en el orden de las lecturas que lo agregaron, no por fecha; su último elemento coincide con el vigente en tier, división, puntos y normalizado, y puede tener una fecha anterior. | Reordenar por fecha: con el reloj atrasado el vigente dejaría de ser el último. Agregar siempre para igualar fechas: contradice DP-9. |
| DP-37 | Aprobada por el usuario (2026-10-17; nueva) | Una credencial válida cuyo usuario ya no existe responde 401 "sesión no iniciada" en esta spec, sin crear ni cambiar nada. | 404 "Usuario no encontrado.": dejaría a la interfaz dentro de la aplicación con una sesión inútil en vez de llevar a login (spec 007, RF-7). |

Retiradas en esta versión: DP-1 (cola Solo/Dúo), DP-3 (CS2 sin partidas), DP-4 (campos de
partida ausentes), DP-13 (claves opcionales), DP-14 (vuelta de Steam), DP-20 (fallos de
fuente), DP-22 (verificar una cuenta ya verificada), DP-25 (R6 sin rango, resuelta por la
decisión del usuario "R6 con rango") y DP-27 (resumen sin tasa de victorias: toda cuenta
tiene partidas). DP-21 no se usa.
