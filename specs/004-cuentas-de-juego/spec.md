# Spec 004 — Cuentas de juego y rango simulado
Estado: implementada (2026-10-19); cambio DP6-37 aprobado (2026-10-19); queda por marcar la
casilla de pruebas del paso del cuerpo en las operaciones de lectura (ver "Criterios de finalización")
Cambio DP6-37 (2026-10-19, aprobado por el usuario el 2026-10-19): la spec 006 (RF-20, DP6-37)
fijó que el orden de errores es global al servidor, con un único paso del cuerpo antes de la
sesión. Esta spec ya tenía ese paso (RF-29, primer punto); el cambio solo lo nombra como
excepción única en RF-1, RF-29, RF-44, dos casos límite y DP-43, sin cambiar lo que el paso
rechaza (preguntas P1 y P2 del cambio, en "Decisiones del usuario").
Validada por el reviewer RF por RF tras el rework (T10–T25); 1567 tests en verde.
Pruebas sin conexión a Internet (RNF-1, RNF-9): el usuario confirmó el 2026-10-19 que ejecutó
`npm test` con la red desconectada y con el código ya reescrito (T10–T25): 1567 tests, 220
suites, 0 fallos, 0 cancelados, unos 100 s. Su casilla de "Criterios de finalización" está
marcada.
Pendiente fuera del código: la etiqueta de datos simulados (RF-37) en la interfaz con el
servidor real es de la spec 007 ("Dependencias externas"; esta spec no tiene casilla propia
para ella). Alineada en la spec 007 el 2026-10-19 (RF-11, RF-22 y R19, con el texto «Datos de
demostración»); falta implementarla.
Historial: revisión del 2026-10-18 tras la revisión QA (hallazgos 1 a 25) y las decisiones
del usuario del 2026-10-18; retiró la aprobación del 2026-10-17 y el usuario la aprobó de
nuevo el 2026-10-18. Incluye las respuestas del usuario a P1 (hallazgo 25, 2026-10-18: se
retira la lista de cuentas del usuario) y a P2 (2026-10-18: la eliminación del usuario nunca
deja cuentas huérfanas). No quedan dudas abiertas.

## Contexto y objetivo
El rango es la segunda mitad del cruce (`PRODUCT.md`, principio 1). En este hito el rango,
el historial y las partidas de las cuentas de League of Legends, Rainbow Six Siege y
Counter-Strike 2 los entrega un proveedor simulado y determinista, igual en desarrollo,
prueba y producción. La aplicación se usa en una demostración en vivo y no consulta ninguna
fuente externa.

Esta spec agrega la entidad cuenta de juego con siete operaciones: las cinco de la entidad
que exige el hito (listar, obtener, crear = vincular, actualizar = editar la región y
eliminar = desvincular), más resincronizar una cuenta y el resumen por juego de un usuario,
que alimenta el perfil. También agrega la lectura simulada del rango.

- Depende de: specs 001, 002 y 003 (implementadas).
- Origen: HU-06, HU-08 y HU-13 (cuentas); RF-07 (cascada de cuentas), RF-09 y RF-11 a RF-15
  de la referencia (`specs/_referencia/001-crear-backend-original.md`, numeración de dos
  dígitos).
- Convención de citas: "RF-n de la referencia" o "RF-0n de la referencia" se refiere a esa
  spec original; un "RF-n" sin más se refiere a esta spec; "spec 00n, RF-m" a otra spec.
- Las decisiones técnicas ya tomadas (sección 2 —entidades, códigos 400 y 403—, RF-15 de la
  referencia —proveedor simulado y determinista—, RT-07 a RT-12, secciones 5.1 —proveedor
  simulado—, 5.4 —cuenta de juego—, 8 y 11 —integraciones reales fuera de alcance—) están
  en la referencia y pasan al `plan.md` de esta spec, con las excepciones de "Qué prevalece
  sobre la referencia".
- Convenciones heredadas, que esta spec aplica sin repetirlas salvo donde las precisa:
  - Spec 001: respuesta de error `{ "error": "<mensaje>" }`; el cuerpo se interpreta antes
    que cualquier otra revisión, con "JSON mal formado" (400), "cuerpo demasiado grande"
    (413, más de 102 400 bytes) y "codificación no soportada" (415); un cuerpo JSON válido
    es un objeto o un arreglo, y un cuerpo vacío es válido (spec 001, RF-5, RF-16, RF-17).
  - Spec 002: sesión válida y su orden de revisión (RF-24), incluida la credencial válida
    de un usuario que ya no existe: 401 "token inválido" (RF-22); "Longitud" en unidades
    UTF-16 (un emoji puede contar como 2).
  - Spec 003: "Identificador recibido" (decodificación por porcentaje), "Referencia
    propia" (`me` exacto), "Identificador con formato válido" (24 hexadecimales, sin
    distinguir mayúsculas, comparados por valor), "Recortar" (`String.prototype.trim`) y
    los mensajes "id con formato inválido", "usuario no encontrado" y "no tienes permiso
    para esta operación" (spec 003, RF-5, RF-6, RF-10).
  - Mensajes de error en español, en minúscula y sin punto final; las siglas, los nombres
    propios de formatos (`Riot ID`, `Ubisoft ID`, `SteamID64`), los nombres de los juegos y
    las notaciones literales (`Nombre#TAG`, `#`) conservan su forma (spec 002, RNF-7;
    spec 003, RNF-4).

### Dependencias externas (constitución y `AGENTS.md` resueltas; la de la spec 007 sigue abierta)
- **Constitución, principio 5** ("nada de datos reales inventados"): **resuelta.** Según la
  decisión del usuario del 2026-10-18 (abajo), etiquetar los datos simulados y no
  atribuirlos a una fuente real basta para cumplir el principio, aunque el identificador en
  el juego vinculado sea real. `docs/constitution.md` ya recoge esa interpretación en el
  principio 5: "Los datos que la plataforma simula (rango, historial, partidas y marca de
  verificada) no cuentan como datos reales inventados siempre que vayan marcados y se
  muestren etiquetados como simulados y nunca se atribuyan a una fuente real, aunque estén
  asociados a un identificador de juego real." Por tanto la spec no está en conflicto con
  el principio 5 y pudo pasar a implementación. Esta spec no edita la constitución.
- **Spec 007**: la convención de `AGENTS.md` ("Los datos de demostración se etiquetan
  siempre como tales en la interfaz") y `PRODUCT.md`, principio 5, solo se cumplen con el
  servidor real cuando la spec 007 muestre la etiqueta de datos simulados guiada por la
  marca de RF-37. Esta spec entrega la marca (parte del servidor); la etiqueta es de la
  spec 007, cuyo RF-11 hoy oculta toda etiqueta con el servidor real (ver "Impacto en otras
  specs").
- **`AGENTS.md`**: **resuelta.** Describía el dominio del servidor como "la copia del
  dominio del frontend"; la normalización de DP-26 difiere de la de la interfaz (RF-48).
  `AGENTS.md` ya lo matiza ("Copia del dominio del frontend, salvo la normalización de
  rango (spec 004, RF-48)"); la salvedad puede retirarse cuando la spec 007 adopte la
  normalización de esta spec.

### Decisiones del usuario
- **2026-10-19 — Paso del cuerpo antes de la sesión: se documenta lo que ya hace el servidor
  (cambio DP6-37, DP-43; preguntas P1 y P2 de ese cambio, distintas de las P1 y P2 del
  2026-10-18).** El usuario aprobó el cambio con estas dos respuestas, sin cambiar ningún
  comportamiento. P1: la interpretación del cuerpo es estricta; un cuerpo JSON que es un texto, un número, `true`, `false` o `null` responde 400
  "JSON mal formado" en todas las operaciones de esta spec, también en las que no leen el
  cuerpo, y siempre antes de la sesión. P2: un cuerpo que es un arreglo JSON (`[]`) pasa esa
  interpretación y se trata como un cuerpo sin campos, como ya dicen RF-6, RF-40 y DP-23. La
  spec 006 interpreta el cuerpo de forma distinta en sus rutas de sesiones (no estricta, para
  distinguir un JSON escalar de "sin cuerpo"); la diferencia es intencionada y no se iguala en
  ningún sentido.
- **2026-10-18 — Eliminación del usuario que falla a medias: sin cuentas huérfanas (P2).**
  Opción (a): nunca quedan cuentas cuyo dueño no exista. Si la eliminación del usuario
  responde 500, o el usuario sigue existiendo (con todas, algunas o ninguna de sus cuentas)
  y puede repetir la eliminación, o ya no existe y no queda ninguna cuenta suya. Sin
  transacciones; coherente con RF-47 y DP-29 (RF-14, DP-42). Se descartan "todo o nada"
  (exige transacciones o restaurar cuentas borradas) y "sin garantía" (cuentas sin dueño
  visibles en el listado que nadie puede editar ni desvincular).
- **2026-10-18 — Lista de cuentas del usuario: se retira (P1, hallazgo 25).** "Retirar la
  lista" (opción a): las cuentas de un usuario son simplemente las cuentas cuyo dueño es
  él. El usuario no guarda ninguna lista de cuentas, y vincular, editar, resincronizar y
  desvincular solo crean, cambian o borran la cuenta afectada, sin tocar ningún dato del
  usuario (RF-46). **Esta decisión revoca** DP-16 y retira RF-33. Motivo: sin
  transacciones, escribir la cuenta y la lista del dueño por separado podía dejarlas
  incoherentes, y una cuenta huérfana bloquearía volver a vincular ese juego (RF-5).
- **2026-10-18 — Principio 5: interpretación.** "Prefiero la primera lectura
  'Interpretación'": etiquetar como simulados el rango, el historial, las partidas y la
  marca de verificada (RF-37) y prohibir atribuirlos a una fuente real (RNF-2) cumple
  "nada de datos reales inventados" de la constitución, también cuando el identificador
  en el juego vinculado es real (por ejemplo, el Riot ID de un tercero). Deja de ser una
  tensión aceptada; la aclaración de la constitución que requería ya está hecha en su
  principio 5 (arriba).
- **2026-10-18 — Mensajes y códigos de las specs 002 y 003.** "Confirmo que la 004 debe
  utilizar los mensajes y códigos de las specs 002 y 003": credencial válida de un usuario
  que ya no existe → 401 "token inválido" (RF-44); 404 de usuario → "usuario no
  encontrado"; 403 → "no tienes permiso para esta operación"; todos los mensajes en
  minúscula y sin punto final (DP-6, DP-37).
- **2026-10-17 — Todo simulado, sin fuentes.** Los tres juegos usan un proveedor simulado y
  determinista en todos los entornos (vuelve RF-15 de la referencia). Se eliminan de esta
  spec Riot, FACEIT, Steam OpenID, las claves y las dudas sobre fuentes. Motivo: los
  términos de Riot prohíben un producto público con clave de desarrollo o personal, y la
  aplicación es "solo para una demo en vivo". **Esta decisión revoca** la anterior ("la
  aplicación no usa rango ni cuentas simuladas; ningún entorno de ejecución tiene un
  proveedor simulado") y con ella la verificación con Steam y la renovación de la clave de
  Riot.
- **2026-10-17 — Cuenta verificada: la fija el simulador.** El proveedor simulado decide si
  la cuenta sale verificada según su identificador en el juego, aplicando el principio
  "mismo identificador → mismo resultado" de RF-15 de la referencia; se etiqueta como
  simulado y el filtro "Solo verificadas" sigue funcionando. Aceptado por el usuario: si
  dos usuarios vinculan el mismo identificador, los dos salen verificados (RF-41).
- **2026-10-17 — Proporción fija de cuentas verificadas.** Para que en la demostración haya
  cuentas verificadas y no verificadas, el simulador marca como verificadas aproximadamente
  la mitad de los identificadores, siguiendo una regla fija que se prueba con ejemplos
  concretos. No depende de qué cuentas vincule el equipo, y el equipo no elige cuáles salen
  verificadas (RF-41).
- **2026-10-17 — R6 con rango y partidas simuladas**, como LoL y CS2, con la escala Copper a
  Champion de la interfaz (Champion sin división). Se retiran RF-19, RF-20 y DP-27.
- **2026-10-17 — La lectura cambia en cada resincronización:** cada resincronización mueve
  el rango como mucho un escalón y añade partidas nuevas, de forma reproducible (RF-42,
  RF-43).
- El identificador en el juego de una cuenta no se puede editar (RF-22).
- DP-18 (aprobada): para cambiar el identificador en el juego se desvincula la cuenta y se
  vuelve a vincular, perdiendo el historial.

### Tensiones reconocidas
Aceptadas por el usuario el 2026-10-17.
- `PRODUCT.md`, principio 2 ("el rango se obtiene, no se declara; la verificación es lo que
  separa esto de un mensaje en Discord") y "Positioning" ("obtiene el rango desde la fuente
  de cada juego"): en este hito el rango no se obtiene de ninguna fuente ni lo declara el
  usuario; lo inventa el proveedor simulado. Se acepta como limitación del hito. El jugador
  sigue sin poder declarar su rango (RF-7) y todo dato simulado va marcado como tal (RF-37).
- "Cuenta verificada" no demuestra que la cuenta sea de quien la vinculó: la fija el
  simulador por identificador (RF-41). Si dos usuarios vinculan el mismo identificador, los
  dos salen verificados (o los dos no); el usuario lo acepta. La marca va etiquetada como
  simulada (RF-37).
- `PRODUCT.md` ("Operating Context") menciona reobtención periódica y scraping. Esta spec no
  usa ninguna de las dos (DP-24).

La antigua tensión con la constitución, principio 5, pasó a "Decisiones del usuario"
(2026-10-18) y a "Dependencias externas".

### Qué prevalece sobre la referencia
Esta spec prevalece sobre `specs/_referencia/001-crear-backend-original.md` en (DP-15):
- HU-06 y RF-13 de la referencia: el identificador en el juego no se puede editar (RF-22);
  la edición solo cambia la región.
- RF-14 de la referencia y su sección 8 ("sync agrega un elemento al historial"): la
  resincronización agrega una fotografía solo según DP-9.
- RF-15 de la referencia y su sección 5.1: la lectura no es fija por identificador; depende
  además del número de lectura y evoluciona en cada resincronización (RF-42, RF-43). La
  marca de verificada sí sigue siendo fija por identificador (RF-41).
- Sección 5.4 de la referencia: el máximo de 20 partidas es una regla de la cuenta (RF-15,
  RF-28), no del proveedor; la región no interviene en la lectura y se guarda con la grafía
  de la lista (DP-5, DP-35); el identificador en el juego se guarda recortado y con sus
  mayúsculas (DP-19); cada cuenta lleva la marca de datos simulados (RF-37) y un número de
  lectura interno (DP-33); las partidas guardadas no forman parte de la representación de
  la cuenta (DP-32).
- RT-07 de la referencia: el usuario no tiene lista de cuentas (decisión del usuario del
  2026-10-18; DP-16 revocada, RF-33 retirado), así que su representación no la incluye, y
  la de la cuenta no incluye sus partidas ni su número de lectura (DP-32, DP-33). Coincide
  con la spec 003, RNF-2.
- Sección 2 de la referencia (relación usuario → cuentas guardada también en el usuario):
  no se aplica. La única relación entre un usuario y sus cuentas es el dueño de cada
  cuenta (Definiciones, "Cuentas de un usuario").
- Sección 2 y tabla 5.7 de la referencia: un duplicado de cuenta responde el mensaje de
  RF-5, no el genérico "ya existe un registro con ese <campo>". Esta spec no tiene ningún
  409.
- Textos de error de la referencia: prevalecen los de esta spec (DP-6).
- Vuelven a aplicar tal como están en la referencia, salvo lo dicho arriba: RF-15 de la
  referencia (proveedor simulado y determinista, "mismo identificador → mismo resultado",
  que también genera partidas), de donde sale la marca de verificada fijada por
  identificador; el proveedor simulado de la sección 5.1; el campo de verificada de la
  sección 5.4 ("default false; lo fija el proveedor"), y la exclusión de las integraciones
  reales de la sección 11.

### Nota para el plan
Decisiones que no son del QUÉ y que el plan debe respetar o fijar:
- La referencia define la edición como un reemplazo de la cuenta; esta spec solo admite
  cambiar la región (RF-8, RF-22). El verbo y las rutas de las siete operaciones los fija
  el plan, igual que el nombre de los parámetros de consulta, siempre que acepten los
  nombres `user` y `game` de RF-2.
- El patrón de cada identificador en el juego y la lista de regiones de las Definiciones
  son los que usa hoy el formulario de vinculación de la interfaz (catálogo de juegos del
  dominio de la interfaz); la normalización de ese catálogo es la antigua y no se copia
  (RF-48).
- La forma de la cuenta que consume hoy la interfaz no tiene partidas ni la marca de datos
  simulados; RNF-3 fija la forma nueva.
- El plan fija la regla generadora del proveedor simulado y la regla de verificada, que
  deben cumplir RF-35, RF-36 y RF-41 a RF-43 sobre los conjuntos fijados en RF-41.
- El usuario no guarda lista de cuentas (DP-16 revocada, RF-33 retirado). El usuario que
  dejó implementado la spec 003 no tiene ningún campo de cuentas (comprobado el
  2026-10-18) y esta spec no le agrega ninguno. El plan del 2026-10-17 sí lo agregaba
  (junto con la vinculación compensada y la retirada de la lista al desvincular) y debe
  rehacerse en esa parte. Las cuentas de un usuario se obtienen siempre por su dueño.
- El plan del 2026-10-17 tampoco fija cómo cumple la eliminación del usuario la garantía
  de RF-14 ante un 500 ni frente a una vinculación simultánea (RF-47) sin transacciones
  (decisión del usuario del 2026-10-18, P2); debe hacerlo, junto con el punto en que las
  pruebas fuerzan el fallo.

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
- **Recortar**, **Identificador recibido**, **Referencia propia**, **Identificador con
  formato válido** y **Longitud**: los de las specs 002 y 003 (ver Contexto). En
  particular, recortar quita exactamente lo que quita `String.prototype.trim` (espacio,
  tabulador, NBSP, BOM, separadores de espacio de Unicode, LF, CR, U+2028, U+2029, entre
  otros) y no quita U+0085.
- **Juego**: uno de los textos exactos `lol`, `r6` o `cs2`, en minúsculas, sin recortar:
  `" lol "`, `"LOL"` o `"Lol"` no son un juego (DP-39). Un valor que no es texto no es un
  juego. Nombres para mensajes: "League of Legends", "Rainbow Six Siege" y
  "Counter-Strike 2". Los tres tienen rango y partidas simulados.
- **Dueño de una cuenta**: el usuario a cuyo nombre se creó la cuenta al vincularla (el de
  la sesión, RF-4). No cambia nunca.
- **Cuentas de un usuario**: las cuentas de juego cuyo dueño es ese usuario. El usuario no
  guarda ninguna lista de cuentas ni ningún otro dato sobre ellas: no existe otra relación
  entre un usuario y sus cuentas que el dueño de cada cuenta (decisión del usuario del
  2026-10-18).
- **Identificador de la cuenta**: el que la plataforma asigna a cada cuenta de juego. Tiene
  la forma de un identificador con formato válido de la spec 003 (24 caracteres
  hexadecimales, en mayúsculas o minúsculas, comparados por valor) y se recibe en la ruta
  como identificador recibido (ya decodificado por porcentaje). Un segmento que no se puede
  decodificar no tiene formato válido. `me` no es un identificador de cuenta: no tiene
  formato válido (DP-10).
- **Identificador en el juego**: Riot ID (LoL), Ubisoft ID (R6) o SteamID64 (CS2). Se
  recorta y el texto recortado debe cumplir el patrón de su juego (abajo). Se guarda tal
  como quedó tras recortar, con sus mayúsculas (DP-19). No se puede editar (decisión del
  usuario). Patrones, sobre el texto ya recortado, con la longitud medida en unidades
  UTF-16:
  - LoL: `<nombre>#<etiqueta>`, donde `<etiqueta>` son de 2 a 5 letras ASCII (`A`-`Z`,
    `a`-`z`) o dígitos (`0`-`9`) al final del texto, y `<nombre>` es todo lo anterior al
    último `#`: de 3 a 16 unidades de cualquier carácter salvo LF, CR, U+2028 y U+2029
    (puede contener espacios interiores, letras no ASCII y `#`). Ej. válidos:
    `Jugador1#LAS`, `Ana Pérez#br1`, `a#b#cd` (nombre `a#b`). Ej. inválidos: `ab#LAS`
    (nombre de 2), `Jugador1#L` (etiqueta de 1), `Jugador1#LAS-1`, `Jugador1`.
  - R6: de 3 a 20 caracteres, todos letras ASCII, dígitos, punto, guion o guion bajo.
  - CS2: exactamente 17 dígitos ASCII que empiezan por `7656119`.
- **Identificador canónico**: el identificador en el juego recortado y pasado a minúsculas
  con la conversión estándar de JavaScript sin configuración regional
  (`String.prototype.toLowerCase`), la misma que ya aplica la spec 002 al correo. Dos
  identificadores en el juego son el mismo si sus formas canónicas coinciden exactamente
  (DP-19). Consecuencias de esa conversión, que se aceptan: `İ` pasa a `i̇` (dos unidades),
  `ß` no cambia (no equivale a `ss`) y `Σ` pasa a `σ`, o a `ς` al final de una palabra. La
  forma canónica no se mide: los límites de longitud del patrón se aplican al texto
  recortado, antes de pasar a minúsculas. En R6 y CS2 el patrón solo admite ASCII.
- **Región válida**: un texto que, recortado, coincide con una de las regiones de su juego
  sin distinguir mayúsculas ASCII (solo se igualan `A`-`Z` con `a`-`z`; cualquier otro
  carácter, incluidos los espacios interiores, debe coincidir exactamente) (DP-35):
  - LoL: `LAS`, `LAN`, `NA`, `EUW`, `EUNE`, `BR`, `KR`.
  - R6: `LATAM`, `NCSA`, `EMEA`, `APAC`.
  - CS2: `South America`, `North America`, `Europe`, `Asia`.
  Se guarda con la grafía de esta lista (ej. `" las "` se guarda como `LAS`; `"south
  america"` como `South America`). `"South  America"` (dos espacios) o `"KR"` (signo
  de kelvin en lugar de `K`) no son válidas. Un valor que no es texto no es una región
  válida. Es informativa: no interviene en ninguna lectura (DP-5).
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
  de su escalón, con los dos extremos incluidos:
  - LoL (LP): 0 a 99 en los escalones con división; 0 a 999 en Master, Grandmaster y
    Challenger.
  - CS2 (CS Rating): Grey 0–4999, Light Blue 5000–9999, Blue 10000–14999, Purple
    15000–19999, Pink 20000–24999, Red 25000–29999, Gold 30000–34999.
  - R6 (MMR): 100 puntos por división, desde Copper V 1000–1099 hasta Copper I 1400–1499;
    Bronze 1500–1999, Silver 2000–2499, Gold 2500–2999, Platinum 3000–3499, Emerald
    3500–3999 y Diamond 4000–4499 (Diamond I 4400–4499); Champion 4500–4999.
  Entre dos lecturas, los puntos pueden tomar cualquier valor de la banda del nuevo escalón:
  no hay otro límite de variación (DP-34).
- **Rango normalizado** (DP-26): `redondear(posición del escalón / (escalones − 1) × 100)`,
  con el primer escalón en la posición 0 y las mitades hacia arriba. LoL: Iron IV = 0,
  Diamond I = 90, Master = 93, Grandmaster = 97, Challenger = 100. CS2: Grey = 0,
  Light Blue = 17, Purple = 50, Gold = 100. R6: Copper V = 0, Diamond I = 97, Champion = 100.
  Los puntos no influyen. Tier y división se comparan con los nombres de la escala de forma
  exacta, distinguiendo mayúsculas y sin recortar: `iv` o `" IV"` son divisiones
  desconocidas y `master` es un tier que no está en la escala. Una división ausente o
  desconocida en un tier con divisiones cuenta como la más baja de ese tier; una división
  en un tier sin divisiones (ej. `Master I`, `Grey II`, `Champion V`) se ignora; un tier que
  no está en la escala vale 0. Estas reglas solo importan a la función de normalización: el
  proveedor simulado siempre produce nombres exactos de la escala (RF-36).
- **Partida**: identificador (texto, único dentro de la cuenta), juego (el de la cuenta),
  fecha en que se jugó, resultado (victoria o derrota), resumen, duración en minutos
  (entero) y variación de rango (entero). Resumen por juego: LoL
  `<campeón> · <asesinatos>/<muertes>/<asistencias>` (ej. `Ahri · 8/2/11`); R6
  `<operador> · <bajas> bajas` (ej. `Ash · 7 bajas`); CS2
  `<mapa> · <rondas a favor>-<rondas en contra>` (ej. `Mirage · 13-9`). Es el formato que
  muestra hoy la interfaz. La variación de rango de una partida es informativa y no tiene
  que cuadrar con la diferencia de puntos entre fotografías.
- **Partida principal de una lectura**: la única partida de la lectura cuya fecha es el
  instante actual; las demás partidas de la lectura tienen fechas anteriores. En la
  lectura n ≥ 1, su identificador no aparece en ninguna de las lecturas 0 a n − 1 del mismo
  juego e identificador canónico (RF-42, RF-43, DP-31).
- **Historial de rango**: lista de fotografías en el orden en que se obtuvieron las
  lecturas que las agregaron (de la primera a la última), no ordenada por fecha (DP-36).
  Su último elemento tiene siempre el mismo tier, división, puntos y normalizado que el
  rango vigente; su fecha es la de la lectura que agregó ese valor y puede ser anterior a
  la del rango vigente cuando una resincronización no agregó fotografía (DP-9, DP-36). No
  tiene límite de elementos (DP-9).
- **Datos simulados**: el rango, el historial, las partidas y la marca de verificada que
  produce el proveedor simulado para cualquier cuenta, incluidas las que el equipo vincula
  con sus identificadores reales. Son datos inventados y, a efectos de `AGENTS.md`
  ("Convenciones") y `PRODUCT.md` (principio 5), se etiquetan en la interfaz como los datos
  de demostración.
- **Datos de demostración precargados**: usuarios, cuentas o sesiones cargados de antemano
  (semilla). El servidor no los tiene (decisión de la spec 007, que sigue vigente); el
  backend simulado del navegador sí. No son lo mismo que los datos simulados.
- **Marca de datos simulados**: el campo `simulated` de la representación de la cuenta,
  booleano y siempre `true` en este hito, que indica que su rango, su historial, sus
  partidas y su marca de verificada son datos simulados (RF-37, DP-28).
- **Cuenta verificada**: el campo `verified` (booleano) que fija el proveedor simulado
  según el juego y el identificador canónico (RF-41), aplicando el principio "mismo
  identificador → mismo resultado" de RF-15 de la referencia. No demuestra que la cuenta
  sea de quien la vinculó. Cambia el significado de la interfaz actual ("se pudo leer el
  rango").
- **Representación de la cuenta** (RNF-3): lo que una respuesta entrega como "la cuenta".
  No incluye las partidas ni el número de lectura (DP-32, DP-33); las partidas solo se
  entregan en el resumen por juego.
- **Resumen por juego**: la representación de la cuenta, sus últimas 8 partidas (las 8
  primeras según el orden de RF-28; menos si tiene menos), la tasa de victorias y la
  tendencia.
  - Tasa de victorias: porcentaje de victorias en esas partidas, redondeado al entero más
    cercano con las mitades hacia arriba (5 de 8 = 62,5 → 63) (DP-11). Toda cuenta tiene al
    menos una partida (RF-4, RF-36), así que la tasa siempre está presente.
  - Tendencia: normalizado vigente menos el normalizado del primer elemento del historial,
    sin ventana de tiempo (DP-30). La regla da 0 si falta el rango vigente o el historial
    está vacío, aunque con el proveedor simulado no ocurre.
- **Operación en curso al eliminar el usuario**: operación de esta spec que ya había
  superado la revisión de la sesión (spec 002, RF-24) cuando se eliminó el usuario de la
  sesión (spec 003, RF-11). Una petición que llega después del borrado no está en curso:
  no supera la revisión de la sesión (RF-44). Misma idea que la spec 003, "Escritura en
  curso al eliminar la cuenta".

## Requisitos funcionales
Mensajes: todo error responde la respuesta de error de la spec 001 con el texto exacto que
indica cada RF, en minúscula y sin punto final (DP-6). Los 401 son los de la spec 002
(RF-10 a RF-12 y RF-22). "Responde con la cuenta" significa con su representación
(RNF-3).

- RF-1: EL SISTEMA exige sesión válida (spec 002, RF-24) en todas las operaciones de esta
  spec. Antes de la revisión de la sesión va únicamente el paso del cuerpo de RF-29, la única
  excepción a «401 primero» (DP-43).
- RF-2: CUANDO un usuario lista cuentas, EL SISTEMA responde 200 con una lista directa de
  las cuentas que cumplen los filtros opcionales `user` (identificador de usuario con
  formato válido o referencia propia, ya decodificado; selecciona las cuentas de ese
  usuario, es decir, aquellas cuyo dueño es él) y `game` (un juego), ordenada por
  identificador de la cuenta ascendente (comparado en minúsculas), sin tope ni paginación
  (DP-38). SI el filtro `user` aparece más de una vez, está vacío, no es la referencia
  propia (`me` exacto: `Me`, `ME` o `" me"` no lo son) ni tiene formato válido, o su
  codificación por porcentaje está mal formada, ENTONCES responde 400 con "id con formato
  inválido"; SI no, y el filtro `game` aparece más de una vez, está vacío o no es un juego,
  ENTONCES responde 400 con "juego no válido". Si los dos filtros son inválidos, responde
  solo el error de `user`. Un filtro `user` con formato válido que no corresponde a ningún
  usuario da 200 con lista vacía (DP-10). Los parámetros de consulta con cualquier otro
  nombre (los nombres se comparan exactamente: `User` o `user[]` son otros nombres) se
  ignoran (DP-38).
- RF-3: CUANDO un usuario pide una cuenta por su identificador de la cuenta, EL SISTEMA
  responde 200 con ella, sea suya o de otro usuario.
- RF-4: CUANDO un usuario vincula una cuenta de cualquiera de los tres juegos con juego,
  identificador en el juego y región válidos, EL SISTEMA obtiene la lectura número 0
  (RF-35) y crea la cuenta a nombre del usuario de la sesión con: el identificador en el
  juego recortado, la región con la grafía de la lista, la fotografía leída como rango
  vigente y como único elemento del historial, las partidas de la lectura (RF-28), la marca
  de verificada de la lectura (RF-41), el número de lectura 0 y el instante actual como
  fecha de sincronización. Responde 201 con la cuenta.
- RF-5: SI ya existe una cuenta de ese juego cuyo dueño es el usuario de la sesión,
  ENTONCES EL SISTEMA responde 400 con "ya tienes una cuenta vinculada en este juego" y no
  crea otra; si dos vinculaciones del mismo usuario y juego llegan a la vez, solo una crea
  la cuenta y la otra responde este mismo 400 (DP-10). Solo cuentan las cuentas que existen
  (Cuentas de un usuario): una cuenta ya desvinculada, o que no llegó a crearse por un
  fallo (RF-46), no impide vincular.
- RF-6: SI al vincular falta el juego, el identificador en el juego o la región, o alguno no
  es válido (incluidos un valor nulo, vacío, formado solo por caracteres que se recortan o
  que no es texto), ENTONCES EL SISTEMA responde 400 sin crear nada, con (DP-6):
  - juego: "juego no válido";
  - identificador de LoL: "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16
    caracteres antes de # y 2 a 5 letras o dígitos después";
  - identificador de R6: "Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto,
    guion o guion bajo";
  - identificador de CS2: "SteamID64 no válido: son 17 dígitos que empiezan por 7656119";
  - región: "región no válida para <nombre del juego>" (ej. "región no válida para
    League of Legends").
  Si hay varios errores, responde solo el primero en ese orden. Los campos del cuerpo son
  `gameId`, `handle` y `region`. Un cuerpo vacío, un cuerpo que es un arreglo JSON o un
  cuerpo con un tipo de contenido distinto de JSON (que no se interpreta, spec 001) no trae
  campos: responde "juego no válido".
- RF-7: EL SISTEMA ignora al vincular cualquier campo distinto de `gameId`, `handle` y
  `region`, y al editar cualquier campo distinto de `handle` y `region`; en particular, al
  editar no lee ni valida el juego. En ambos casos se ignoran dueño, rango, historial,
  partidas, fecha de sincronización, número de lectura, marca de verificada y marca de
  datos simulados. Al resincronizar y al desvincular se ignora el cuerpo entero.
- RF-8: CUANDO el dueño edita la región de una cuenta con una región válida del juego de la
  cuenta, EL SISTEMA la guarda con la grafía de la lista sin obtener ninguna lectura y sin
  cambiar rango, historial, partidas, número de lectura ni fecha de sincronización, y
  responde 200 con la cuenta (DP-5, DP-35).
- RF-9: CUANDO el dueño desvincula su cuenta, EL SISTEMA la borra junto con su historial y
  sus partidas, y responde 204 sin cuerpo.
- RF-10: CUANDO el dueño pide resincronizar una cuenta de cualquiera de los tres juegos, EL
  SISTEMA obtiene la lectura con el número siguiente al último usado (RF-35) y lo deja
  guardado, deja la fotografía leída como rango vigente y la agrega al final del historial
  solo si su tier, división o puntos difieren del rango vigente anterior (DP-9); incorpora
  las partidas según RF-28, deja la marca de verificada de la lectura (RF-41), registra el
  instante actual como fecha de sincronización y responde 200 con la cuenta.
- RF-11: SI quien edita, desvincula o resincroniza una cuenta no es su dueño, ENTONCES EL
  SISTEMA responde 403 con "no tienes permiso para esta operación" (el genérico de la
  spec 003, RF-10) y no cambia nada.
- RF-12: CUANDO un usuario pide el resumen de un juego para cualquier usuario (o la
  referencia propia), EL SISTEMA responde 200 con el resumen por juego.
- RF-13: Al pedir el resumen, EL SISTEMA resuelve primero la referencia propia (`me`
  exacto, sobre el identificador recibido ya decodificado, como en la spec 003, RF-6) y
  después responde, en este orden (DP-10): SI el identificador de usuario no se puede
  decodificar o no tiene formato válido (`Me`, `ME` o `" me"` incluidos), ENTONCES 400 con
  "id con formato inválido"; SI el juego (ya decodificado) no es un juego, ENTONCES 400 con
  "juego no válido"; SI el usuario no existe, ENTONCES 404 con "usuario no encontrado"; SI
  el usuario no tiene cuenta en ese juego, ENTONCES 404 con "el jugador no tiene una cuenta
  vinculada en este juego".
- RF-14: CUANDO se elimina un usuario (spec 003, RF-11), EL SISTEMA borra también todas sus
  cuentas de juego (las cuentas cuyo dueño es él, con su historial y sus partidas),
  incluida cualquiera que se esté vinculando en ese momento (RF-47), y solo responde 204
  cuando ya no queda ni el usuario ni ninguna cuenta cuyo dueño sea él. Además, nunca deja
  una cuenta cuyo dueño no exista, tampoco cuando la eliminación falla (decisión del
  usuario del 2026-10-18, P2; DP-42):
  - Orden observable: EL SISTEMA no borra el usuario mientras exista alguna cuenta cuyo
    dueño sea él; el usuario es lo último que desaparece.
  - SI la eliminación del usuario responde 500 (en cualquier punto: antes de borrar
    ninguna cuenta, tras borrar algunas, tras borrarlas todas o tras borrar el usuario),
    ENTONCES EL SISTEMA deja uno de estos dos estados y ningún otro: (1) el usuario sigue
    existiendo con su perfil y su disponibilidad, con todas, algunas o ninguna de sus
    cuentas (las que quedan, completas, RF-46), su sesión sigue siendo válida y repetir la
    eliminación con esa sesión responde 204 y deja el estado del punto siguiente; o (2) el
    usuario ya no existe y no queda ninguna cuenta cuyo dueño sea él.
  - En el estado (1), las cuentas que quedan siguen funcionando con normalidad: se pueden
    obtener, editar, resincronizar y desvincular, y vincular un juego cuya cuenta se borró
    responde 201 (RF-5).
- RF-15: EL SISTEMA conserva como máximo 20 partidas por cuenta, elegidas según RF-28
  (DP-7).
- RF-22: SI la edición de una cuenta incluye `handle` con un valor que no es el mismo
  identificador en el juego que el guardado (según el identificador canónico; un valor
  nulo, vacío, formado solo por caracteres que se recortan o que no es texto nunca es el
  mismo), ENTONCES EL SISTEMA responde 400 con "el identificador del juego no se puede
  editar: desvincula la cuenta y vuelve a vincularla" y no cambia nada. Si es el mismo, se
  ignora y el identificador guardado no cambia (DP-19).
- RF-28: CUANDO una lectura entrega partidas, EL SISTEMA las une a las guardadas sin repetir
  ninguna (dos partidas son la misma si tienen el mismo identificador; se conserva la ya
  guardada), las ordena de la más reciente a la más antigua según su fecha y, a igual fecha,
  por identificador comparado como texto, carácter a carácter según su código Unicode, de
  mayor a menor; y conserva las 20 primeras según ese orden, salvo que la partida principal
  de la lectura quede después de la vigésima: en ese caso conserva la partida principal y
  las 19 primeras de las demás, todas en ese mismo orden. Así la partida principal de la
  última lectura siempre queda guardada (DP-7, DP-31).
- RF-29: EL SISTEMA revisa cada operación en este orden y responde solo el primer fallo
  (DP-10):
  - Siempre primero, el paso del cuerpo: interpretación del cuerpo de la spec 001 (400
    "JSON mal formado", también con un cuerpo JSON que es un texto, un número, `true`,
    `false` o `null`; 413; 415), en todas las operaciones, aunque no lean el cuerpo. Es el
    único paso que va antes de la sesión y la única excepción a «401 primero»: el orden de
    errores es global al servidor y la spec 006 (RF-20, DP6-37) adopta la misma excepción
    (DP-43). Después la sesión (401 de la spec 002, RF-24, incluido "token inválido" para un
    usuario que ya no existe, RF-44).
  - Obtener, editar, desvincular, resincronizar: decodificación y formato del
    identificador de la cuenta (400 "id con formato inválido") → existencia (404 "cuenta
    no encontrada") → propiedad (403, RF-11; no aplica a obtener) → datos de la edición
    (400: primero RF-22, después RF-38). A diferencia de las escrituras de usuario de la
    spec 003, aquí la existencia va antes que la propiedad, porque el dueño solo se conoce
    al encontrar la cuenta (DP-10).
  - Vincular: datos (RF-6) → duplicado (RF-5).
  - Listar: RF-2. Resumen: RF-13.
- RF-33: Retirado el 2026-10-18 por decisión del usuario (P1, hallazgo 25). Decía que
  vincular agregaba la cuenta a una lista de cuentas guardada en el usuario y desvincular
  la quitaba. El usuario no guarda esa lista: sus cuentas son las que lo tienen como dueño
  (Definiciones; DP-16 revocada).
- RF-34: EL SISTEMA obtiene toda lectura del proveedor simulado, en desarrollo, prueba y
  producción, sin consultar ningún servicio externo ni necesitar claves (RF-15 de la
  referencia).
- RF-35: EL SISTEMA produce cada lectura como función determinista del juego, del
  identificador canónico, del número de lectura y del instante actual: las mismas entradas
  dan siempre la misma lectura, sin azar no reproducible. La región no es una entrada
  (DP-5). Qué depende de cada entrada lo fijan RF-41 y RF-43; cómo evoluciona entre
  lecturas, RF-42.
- RF-36: EL SISTEMA entrega en cada lectura: una fotografía con un tier de la escala del
  juego (nombre exacto), división solo si el tier la tiene (nombre exacto), puntos enteros
  dentro de la banda del escalón (DP-34), el valor normalizado de ese tier y división y la
  fecha = instante actual; entre 1 y 8 partidas, con identificadores distintos entre sí, el
  juego de la cuenta, todos los campos de la definición de partida, la partida principal
  con fecha = instante actual y las demás con fecha anterior (DP-8, DP-31).
- RF-37: EL SISTEMA incluye la marca de datos simulados (`simulated: true`) en toda cuenta
  que entrega, también cuando la cuenta va dentro del resumen por juego o de otra respuesta
  (spec 005), para que la interfaz pueda etiquetar como simulados el rango, el historial,
  las partidas y la marca de verificada (DP-28). Ningún dato de la petición la cambia
  (RF-7). El texto de la etiqueta lo fija la spec 007.
- RF-38: SI la edición incluye `region` con un valor que no es una región válida del juego
  de la cuenta (incluidos un valor nulo, vacío, formado solo por caracteres que se recortan
  o que no es texto), ENTONCES EL SISTEMA responde 400 con "región no válida para <nombre
  del juego>" y no cambia nada (DP-23).
- RF-39: CUANDO dos operaciones sobre la misma cuenta se solapan, EL SISTEMA deja la cuenta
  igual que si se hubieran procesado una después de la otra, en el orden en que se
  aplicaron, y cada una responde lo que le corresponde a su turno (DP-29, DP-41):
  - Dos resincronizaciones: cada una usa un número de lectura distinto y consecutivo, y
    ninguna partida ni fotografía queda repetida o perdida; las dos responden 200.
  - Una edición y una resincronización: el estado final tiene la región de la edición y la
    lectura de la resincronización; ningún cambio se pierde; las dos responden 200, cada
    una con la cuenta tal como quedó tras aplicarse ella.
  - Dos ediciones: el estado final tiene la región de la que se aplicó en último lugar; las
    dos responden 200, cada una con la cuenta tal como quedó tras aplicarse ella.
  - Una desvinculación y una edición o resincronización: tras responder 204 a la
    desvinculación, la cuenta (ni sus partidas o su historial) nunca vuelve a existir; la
    otra responde 200 si se aplicó antes o 404 "cuenta no encontrada" si no.
  - Dos desvinculaciones: exactamente una responde 204; la otra responde 404 "cuenta no
    encontrada".
- RF-40: CUANDO el dueño edita una cuenta con el cuerpo vacío, sin cuerpo, con `{}`, con un
  arreglo JSON, con un tipo de contenido distinto de JSON o solo con campos ignorados, EL
  SISTEMA responde 200 con la cuenta sin cambios (DP-23).
- RF-41: EL SISTEMA fija la marca de verificada de cada lectura con una regla fija y
  determinista que depende solo del juego y del identificador canónico, de modo que no
  cambia entre resincronizaciones ni con la región, el usuario, el número de lectura o el
  instante, y es la misma para todos los usuarios que vinculen ese identificador. La regla
  marca como verificados entre 40 y 60 identificadores (ambos incluidos) en cada uno de
  estos conjuntos de 100 identificadores válidos, fijados por esta spec (i = 1 a 100, sin
  ceros a la izquierda salvo en CS2) (DP-40):
  - LoL: `jugador<i>#las` (`jugador1#las` … `jugador100#las`);
  - R6: `jugador<i>` (`jugador1` … `jugador100`);
  - CS2: `7656119` seguido de i con ceros a la izquierda hasta 10 dígitos
    (`76561190000000001` … `76561190000000100`).
  La regla la fija el plan aprobado; no existe ninguna operación, campo de la petición,
  variable de entorno ni lista escrita a mano que decida qué identificadores salen
  verificados, y cambiar la regla exige volver a esta spec (decisión del usuario: el equipo
  no elige cuáles salen verificadas). Las pruebas fijan además, en cada juego, al menos dos
  identificadores concretos que salen verificados y dos que no.
- RF-42: CUANDO el proveedor simulado produce la lectura número n ≥ 1 de un juego e
  identificador canónico, EL SISTEMA entrega una fotografía cuyo escalón es el mismo que el
  de la lectura n − 1 o está a un escalón de él, sin salir de la escala del juego, y una
  partida principal cuyo identificador no aparece en ninguna de las lecturas 0 a n − 1 de
  ese juego e identificador canónico (decisión del usuario). Además, para que el rango
  cambie de verdad (HU-6), en cada juego y sobre el conjunto de RF-41 (DP-40):
  - para cada identificador, en al menos 5 de las lecturas 1 a 10 la fotografía difiere de
    la de la lectura anterior en tier, división o puntos;
  - al menos 50 de los 100 identificadores cambian de escalón al menos una vez entre las
    lecturas 0 y 10.
- RF-43: EL SISTEMA hace depender solo del juego, del identificador canónico y del número de
  lectura: el tier, la división y los puntos de la fotografía; el número de partidas; el
  identificador, el resultado, el resumen, la duración y la variación de rango de cada
  partida; cuál es la partida principal, y la antigüedad de cada partida respecto del
  instante actual. El instante actual solo fija las fechas: la de la fotografía y la de la
  partida principal son el instante actual, y la de cada otra partida es el instante actual
  menos su antigüedad, que es de al menos un minuto (DP-31).
- RF-44: SI la sesión trae una credencial válida (firma, vigencia y comprobante) de un
  usuario que ya no existe, ENTONCES EL SISTEMA responde 401 con "token inválido" en
  cualquier operación de esta spec (salvo que antes aplique el paso del cuerpo de RF-29) y
  no crea ni cambia nada (spec 002, RF-22; spec 003, RF-22; DP-37).
- RF-45: SI una operación de esta spec falla con un error inesperado (500 de la spec 001),
  ENTONCES EL SISTEMA deja la cuenta exactamente como estaba antes de la operación,
  incluidos su número de lectura, su historial y sus partidas (DP-33).
- RF-46: EL SISTEMA nunca deja una cuenta a medias: la cuenta, su historial y sus partidas
  existen juntos o no existen. SI una vinculación responde 500, ENTONCES no queda la cuenta
  nueva y una nueva vinculación en ese juego no responde el 400 de RF-5 por su causa; SI
  una desvinculación responde 500, ENTONCES la cuenta sigue existiendo completa. Vincular,
  editar, resincronizar y desvincular no cambian ningún dato del usuario (ni perfil, ni
  disponibilidad, ni ninguna lista de cuentas, que no existe): solo crean, cambian o borran
  la cuenta afectada, de modo que ninguna respuesta, incluida una 500, puede dejar al
  usuario y a sus cuentas en desacuerdo (decisión del usuario del 2026-10-18). La única
  operación que borra a la vez el usuario y sus cuentas es la eliminación del usuario, y
  su garantía ante un 500 la fija RF-14.
- RF-47: SI una operación de esta spec está en curso cuando se elimina el usuario de la
  sesión (Definiciones), ENTONCES EL SISTEMA nunca vuelve a crear el usuario ni deja una
  cuenta cuyo dueño sea el usuario eliminado, nunca responde 500 y responde así (DP-37,
  como la spec 003, RF-22):
  - Vincular: 201 si la cuenta se creó mientras el usuario existía (y la cuenta no
    sobrevive al borrado del usuario, RF-14, aunque se haya creado después de que la
    eliminación borrara las demás cuentas y aunque la eliminación responda 500), o 404
    "usuario no encontrado" sin dejar ninguna cuenta si el usuario ya no existía al
    crearla.
  - Editar, resincronizar o desvincular una cuenta propia: 200 (o 204) si se aplicó antes
    de que el borrado eliminara la cuenta, o 404 "cuenta no encontrada" sin efecto si la
    cuenta ya no existía al aplicarla.
  - Listar, obtener y resumen: responden según lo que existía al leer (el resumen propio
    con `me` responde 404 "usuario no encontrado" si el usuario ya no existía).
- RF-48: EL SISTEMA calcula el rango normalizado con la regla de DP-26, que prevalece sobre
  la normalización que usa hoy la interfaz (que da divisiones a Master, Grandmaster,
  Challenger y Champion y escalas de 40 escalones en LoL y R6). Las distancias de rango se
  calculan con los normalizados que entrega el servidor (spec 005); el modo simulado del
  navegador calcula distinto hasta que la spec 007 adopte esta regla.

Retirados en esta versión (fuentes reales y Steam): RF-16 (jugador no encontrado en la
fuente), RF-17 y RF-18 (fuente no disponible, 503), RF-21 (lectura sin rango), RF-23 a
RF-26 y RF-30 a RF-32 (verificación con Steam), RF-27 (lectura al cambiar la región de LoL).
Retirados por la decisión "R6 con rango" del 2026-10-17: RF-19 (vincular R6 sin lectura) y
RF-20 (409 al resincronizar R6). Retirado por la decisión "Lista de cuentas del usuario"
del 2026-10-18: RF-33 (lista de cuentas guardada en el usuario). La numeración del resto no
cambia.

## Requisitos no funcionales
- RNF-1: Las pruebas automáticas de esta spec no abren conexiones a ningún servicio distinto
  de la base de datos de prueba de la spec 001 ni necesitan claves; con esa base en el
  propio equipo pasan sin conexión a Internet. Gracias a RF-35, RF-41 y RF-43, comprueban
  valores exactos de rango, partidas y marca de verificada, tanto en la vinculación como en
  resincronizaciones sucesivas (números de lectura 0, 1, 2…). Las pruebas fijan el instante
  actual entregándolo como dato, sin variables de entorno nuevas (RNF-9) ni dependencias
  nuevas (RNF-8).
- RNF-2: Nada inventado presentado como real. La parte de esta spec (el servidor): los
  únicos datos inventados son los datos simulados, toda cuenta que los lleva lleva la marca
  de datos simulados (RF-37), y ningún mensaje ni respuesta atribuye esos datos a Riot,
  Ubisoft, Valve, FACEIT ni a ninguna fuente real ("Riot ID", "Ubisoft ID" y "SteamID64"
  nombran el formato del identificador, no una fuente de datos). Con la interpretación del
  usuario del 2026-10-18, esto cumple la constitución, principio 5, tal como lo aclara ya
  `docs/constitution.md` (Dependencias externas). `PRODUCT.md`, principio 5, y la
  convención de `AGENTS.md` sobre datos de demostración se cumplen con el servidor real
  cuando la spec 007 muestre la etiqueta (Dependencias externas).
- RNF-3: Representación (forma exacta de las respuestas):
  - Cuenta: exactamente los campos `id` (identificador de la cuenta, 24 hexadecimales en
    minúsculas), `userId` (identificador del dueño, ídem), `gameId`, `handle`
    (identificador en el juego guardado), `region`, `currentRank` (fotografía),
    `rankHistory` (lista de fotografías), `lastSyncedAt`, `verified` (booleano) y
    `simulated` (`true`). Sin partidas ni número de lectura.
  - Fotografía: `tier`, `division` (solo cuando el tier tiene divisiones; si no, el campo
    no aparece, nunca vale `null`), `points` (entero, siempre presente), `normalized`
    (entero 0–100) y `recordedAt`.
  - Partida (solo en el resumen): `id`, `gameId`, `playedAt`, `result` (`win` o `loss`),
    `summary`, `durationMinutes` y `rankDelta`.
  - Resumen por juego: `{ account, recentMatches, winRate, trend }`.
  - Fechas como texto ISO 8601 en UTC con milisegundos (`AAAA-MM-DDTHH:mm:ss.sssZ`), como
    en la spec 003, RNF-2. El identificador devuelto es el guardado, no el enviado: pedir
    una cuenta con su identificador en mayúsculas devuelve `id` en minúsculas.
  Son los campos que consume hoy la interfaz más `simulated`; "verificada" cambia de
  significado (RF-41). La spec 007 adapta la interfaz.
- RNF-7: La lectura simulada (incluidas su evolución y la marca de verificada), la
  normalización, la decisión de agregar una fotografía al historial, la unión de partidas,
  la tasa de victorias y la tendencia son reglas puras que reciben el instante actual como
  dato cuando lo necesitan (constitución, principio 3).
- RNF-8: Esta spec no justifica ninguna dependencia nueva (constitución, principio 1). Si el
  plan necesitara una, se vuelve a esta spec antes (DP-12).
- RNF-9: Esta spec no agrega variables de entorno: el servidor arranca y funciona con las
  de las specs 001 y 002.
- RNF-10: Esta spec no fija tiempos de respuesta ni tamaños máximos de respuesta. El
  historial no tiene límite (DP-9) y cada resincronización le agrega como mucho una
  fotografía; con el volumen de una demostración (decenas de resincronizaciones por cuenta)
  el tamaño de la cuenta y de las respuestas es despreciable. Ver "Fuera de alcance".

Retirados en esta versión: RNF-4 (claves de las fuentes), RNF-5 (tiempos máximos de las
fuentes) y RNF-6 (verificación con Steam).

## Casos límite
### Identificadores, filtros y orden de revisión
- Identificador de la cuenta mal formado (`abc`, 23 o 25 hexadecimales, `me`, `%zz`) en
  obtener, editar, desvincular o resincronizar: 400 "id con formato inválido"; con formato
  válido pero inexistente: 404 "cuenta no encontrada" (RF-29).
- Identificador de la cuenta en mayúsculas: designa la misma cuenta; la respuesta trae `id`
  en minúsculas (RNF-3).
- Sin sesión, cualquier operación responde el 401 de la spec 002, aunque el identificador o
  los datos del cuerpo sean inválidos; el paso del cuerpo (RF-29) va antes: JSON mal
  formado, cuerpo de más de 102 400 bytes o codificación no soportada responden 400, 413 o
  415 antes que la sesión, también con la credencial de un usuario eliminado (DP-43).
- Vincular o editar con un cuerpo JSON que es `"x"`, `5`, `true` o `null`: 400 "JSON mal
  formado" (spec 001). Con `[]`: vincular responde "juego no válido" (RF-6); editar, 200
  sin cambios (RF-40).
- Resincronizar o desvincular con un cuerpo cualquiera (objeto o arreglo): se ignora (RF-7);
  con JSON mal formado: 400 "JSON mal formado" (RF-29).
- Listar con `user=abc&game=xyz`: 400 "id con formato inválido" (RF-2).
- Listar con `user=<id>&user=<id>`, `user=`, `user=ME` o `user=%20me`: 400 "id con formato
  inválido"; con `user=me`: las cuentas del usuario de la sesión; con `user=<id en
  mayúsculas>`: las de ese usuario. Con `game=lol&game=cs2`, `game=`, `game=LOL` o
  `game=%20lol`: 400 "juego no válido" (RF-2, DP-10, DP-39).
- Listar con parámetros desconocidos (`page=2`, `User=abc`, `user[]=abc`): se ignoran
  (RF-2).
- Listar devuelve las cuentas por identificador de la cuenta ascendente; dos peticiones
  seguidas sin cambios devuelven el mismo orden (RF-2).
- Resumen con `Me`, `ME` o `%20me` como usuario: 400 "id con formato inválido"; con `m%65`:
  equivale a `me` (RF-13). Con `LOL` o `%20lol` como juego: 400 "juego no válido".
- No dueño que edita una cuenta ajena con región inválida: 403 (RF-29).
- Editar con identificador en el juego distinto y región inválida: 400 de RF-22 (RF-29).

### Vincular y editar
- Vincular `" Jugador1#LAS "` o `"Jugador1#LAS\t"`: se guarda `Jugador1#LAS` (Recortar).
  Con U+0085 en un extremo: no se recorta y, en LoL, cuenta dentro del nombre o rompe la
  etiqueta según su posición (Identificador en el juego).
- Riot ID `ab#LAS`, `Jugador1#L`, `Jugador1#ABCDEF` o un nombre de 17 unidades: 400 con el
  mensaje de LoL; nombre de 16 unidades (un emoji cuenta como 2): válido.
- Vincular con el juego `" lol "` o `"LOL"`: 400 "juego no válido" (DP-39).
- Vincular la misma cuenta con el identificador en mayúsculas o minúsculas distintas da la
  misma lectura (RF-35); se guarda el identificador como lo envió cada usuario.
- `Ñandú#LAS` y `ñandú#LAS` son el mismo identificador (forma canónica `ñandú#las`); `ß` y
  `ss` no lo son (Identificador canónico).
- Región `" las "`, `"Las"` o `"lAs"` en una cuenta de LoL: válida y se guarda `LAS`;
  `"south america"` en CS2: se guarda `South America`; `"South  America"` o `"KR"`: 400
  "región no válida para …" (DP-35).
- Editar enviando el mismo identificador actual, con otras mayúsculas o recortable, junto
  con una región nueva: se guarda la región y el identificador guardado no cambia (RF-22).
- Editar con el identificador nulo o vacío: 400 de RF-22. Editar con la región nula, vacía o
  `"   "`: 400 de RF-38. Omitir un campo no es un error.
- Editar con el cuerpo vacío o solo con campos ignorados (incluido el juego): 200 sin
  cambios (RF-40). Editar con un juego inexistente en el cuerpo: se ignora (RF-7).
- Dos usuarios distintos pueden vincular cuentas del mismo juego.

### Lecturas, verificación y evolución
- El mismo identificador vinculado por dos usuarios distintos: se permite; con el mismo
  número de lectura e instante, los dos reciben la misma lectura, y en cualquier caso la
  misma marca de verificada (DP-17, RF-41; aceptado por el usuario).
- Una cuenta verificada sigue verificada tras cualquier número de resincronizaciones, y una
  no verificada sigue no verificada (RF-41).
- Un cuerpo con `verified: true` o `simulated: false` al vincular o editar: se ignora
  (RF-7, RF-37, RF-41).
- Rainbow Six Siege se comporta como LoL y CS2: vincular y resincronizar obtienen rango y
  partidas; ninguna operación de esta spec responde 409.
- Desvincular y volver a vincular: la cuenta nueva empieza en el número de lectura 0, con un
  historial de un elemento y el mismo rango que tuvo la vinculación original; el historial
  anterior se pierde (DP-18, RF-43).
- Resincronizar: el escalón queda igual o se mueve uno; en el escalón más alto
  (Challenger, Champion, Gold de CS2) nunca sube y en el más bajo (Iron IV, Copper V, Grey)
  nunca baja (RF-42). Los puntos quedan siempre dentro de la banda cerrada del nuevo
  escalón: nunca más de 999 LP en Master+, 34999 en Gold de CS2 ni 4999 MMR en Champion
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
- Dos partidas con la misma fecha: va primero la de identificador mayor como texto (ej.
  `m-9` antes que `m-10`, porque "9" > "1") (RF-28).
- Cambiar la región: no cambia el rango, el historial ni las partidas (RF-8); no existe
  mezcla de historial entre regiones porque la región no interviene en la lectura.

### Normalización y resumen
- Tier que no está en la escala (incluido `master` en minúsculas): la regla de
  normalización le da 0; el proveedor simulado nunca lo produce (RF-36).
- División desconocida (`iv`, `" IV"`, `VI`) en un tier con divisiones: cuenta como la más
  baja de ese tier (Gold iv = Gold IV).
- División en un tier sin divisiones (`Master I`, `Grey II`, `Champion V`): la regla de
  normalización la ignora (Master I = Master = 93); el proveedor simulado nunca la produce
  (RF-36).
- Master, Grandmaster y Challenger (LoL), Champion (R6) y todos los tiers de CS2: la
  fotografía no incluye el campo `division` (RNF-3).
- Con historial de un solo elemento, la tendencia es 0.
- Obtener una cuenta o listarlas no entrega sus partidas; el resumen entrega las 8 primeras
  (DP-32).

### Concurrencia, fallos y eliminación del usuario
- Dos resincronizaciones, una edición y una resincronización, dos ediciones, una
  desvinculación con otra operación o dos desvinculaciones sobre la misma cuenta: RF-39.
- Una resincronización que falla con 500: la cuenta queda igual, y la siguiente
  resincronización que responde 200 usa el número que habría usado la fallida (RF-45).
- Una vinculación que falla con 500 después de empezar a escribir: no queda la cuenta y el
  jugador puede volver a vincular ese juego (RF-46).
- Vincular y desvincular no cambian nada guardado del usuario: su perfil y su
  disponibilidad quedan iguales y no existe lista de cuentas que actualizar (RF-46). Tras
  vincular, listar con `user=me` muestra la cuenta; tras desvincular, ya no (RF-2).
- Eliminar el usuario borra todas las cuentas cuyo dueño es él; después, listar sin filtro
  no muestra ninguna cuenta con ese dueño (RF-14).
- Eliminación del usuario que responde 500 tras borrar una de sus tres cuentas: el usuario
  sigue existiendo con las otras dos completas; su sesión sigue valiendo, puede volver a
  vincular el juego de la cuenta borrada (201) y repetir la eliminación (204, sin cuentas
  suyas) (RF-14).
- Eliminación del usuario que responde 500 tras borrar todas sus cuentas pero no el
  usuario: el usuario sigue existiendo sin cuentas y puede repetir la eliminación (RF-14).
- Eliminación del usuario que responde 500 después de borrar el usuario: no queda ninguna
  cuenta suya; su credencial responde 401 "token inválido" (RF-14, RF-44).
- Vinculación simultánea a una eliminación del usuario que crea la cuenta después de que
  la eliminación borrara las demás: la cuenta no sobrevive al usuario, también si la
  eliminación responde 500 después de borrar el usuario (RF-14, RF-47).
- En ningún momento posterior a la respuesta de una eliminación del usuario (204 o 500)
  el listado sin filtro muestra una cuenta cuyo dueño no existe (RF-14).
- Una petición con una credencial todavía válida de un usuario ya eliminado: 401 "token
  inválido" en cualquier operación de esta spec, salvo que antes aplique el paso del cuerpo
  de RF-29 (RF-44, DP-43).
- Una vinculación, edición, resincronización o desvinculación en curso cuando se elimina el
  usuario: RF-47; nunca queda una cuenta del usuario eliminado.

## Fuera de alcance
- Cualquier fuente real de rango, partidas o identidad (Riot, Ubisoft, Valve/Steam, FACEIT,
  Leetify) y el scraping de sitios de estadísticas (DP-24). Cambiar el proveedor simulado
  por una fuente real exige una spec nueva.
- Verificar la propiedad de una cuenta con la plataforma del juego (Steam OpenID, Riot Sign
  On) o con cualquier operación de verificación (RF-41).
- Elegir qué cuentas salen verificadas (RF-41).
- Resincronización periódica automática del rango (DP-24).
- Seguir automáticamente un cambio de identificador en el juego (DP-18).
- Elegir entre proveedor simulado y real según el entorno.
- Entregar las 20 partidas guardadas en alguna respuesta (DP-32).
- Paginación o tope del listado de cuentas, límite del historial y garantías de tiempo de
  respuesta o de tamaño de las respuestas (RNF-10).
- Coincidencias (spec 005) e interfaz (spec 007), incluida la etiqueta de datos simulados.
- Editar `docs/constitution.md` o `AGENTS.md` (Dependencias externas).

## Criterios de finalización
- [x] El usuario aprueba explícitamente la spec, incluidas las decisiones de la tabla
      "Decisiones propuestas" que siguen pendientes y las deducciones del planner (P1 y
      P2 quedaron respondidas el 2026-10-18; no quedan dudas abiertas).
- [x] Las reglas de normalización tienen pruebas unitarias: Iron IV = 0, Diamond I = 90,
      Master = 93, Challenger = 100, Grey = 0, Light Blue = 17, Gold = 100, Copper V = 0,
      Diamond I de R6 = 97, Champion = 100, tier inexistente = 0 (también `master`),
      división ausente o desconocida (`iv`) = la más baja, división en un tier sin
      divisiones ignorada (Master I = 93, Grey II = 0).
- [x] Las reglas de validación tienen pruebas unitarias: los patrones de los tres
      identificadores con los ejemplos válidos e inválidos de las Definiciones (incluidos
      los límites 3/16 y 2/5 de LoL y un emoji en el nombre), el recorte (tabulador, NBSP,
      BOM; U+0085 no se recorta), la forma canónica (`Ñandú` = `ñandú`, `ß` ≠ `ss`), las
      regiones (grafía de la lista, `"South  America"` y `"KR"` inválidas) y el juego
      exacto (`LOL` y `" lol "` inválidos).
- [x] La lectura simulada tiene pruebas unitarias en los tres juegos: mismas entradas dan la
      misma lectura; identificadores que solo difieren en mayúsculas o en caracteres
      recortables dan la misma lectura; la región no la cambia; la fotografía cumple la
      escala y la banda cerrada de puntos de su escalón; hay entre 1 y 8 partidas, con el
      juego de la cuenta, identificadores distintos, una sola con fecha = instante actual y
      las demás anteriores.
- [x] La evolución de la lectura tiene pruebas unitarias: entre las lecturas n y n + 1 el
      escalón cambia como mucho uno y nunca sale de la escala; la partida principal de la
      lectura n + 1 es nueva; el mismo número de lectura a horas distintas da todo igual
      salvo las fechas, desplazadas por la diferencia de instantes; y las dos medidas de
      cambio de RF-42 se cumplen en los tres conjuntos de RF-41 (RF-42, RF-43).
- [x] La marca de verificada tiene pruebas unitarias: es igual en todas las lecturas de un
      identificador; en cada juego, al menos dos identificadores concretos salen
      verificados y dos no; en cada conjunto de RF-41 salen verificados entre 40 y 60.
- [x] La tasa de victorias tiene pruebas unitarias: 5 de 8 = 63, 0 de 8 = 0. La unión de
      partidas tiene pruebas unitarias: sin repetidos, orden por fecha con desempate por
      identificador como texto, corte en 20 y partida principal conservada cuando hay más
      de 20 partidas con fecha igual o posterior. La tendencia tiene pruebas unitarias:
      historial de un elemento = 0.
- [x] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta (con
      el texto exacto del mensaje en los errores) y, en las escrituras, la base de datos.
- [x] Una prueba confirma que vincular con un dueño, un rango, una marca de verificada, un
      número de lectura o una marca de datos simulados en el cuerpo deja la cuenta a nombre
      del usuario de la sesión, con los valores de la lectura.
- [x] Una prueba vincula y resincroniza dos veces una cuenta de cada juego (incluido R6) con
      instantes fijos y comprueba los valores exactos de rango, historial y partidas
      (RNF-1).
- [x] Una prueba confirma la forma exacta de RNF-3 en toda cuenta entregada (listar,
      obtener, vincular, editar, resincronizar y resumen): `simulated: true`, sin partidas
      ni número de lectura, `division` ausente en los tiers sin división, `id` en
      minúsculas aunque se pida en mayúsculas y fechas `AAAA-MM-DDTHH:mm:ss.sssZ`.
- [x] Una prueba confirma que tras una resincronización sin cambio de rango el último
      elemento del historial coincide con el vigente salvo la fecha (DP-36).
- [x] Hay una prueba por cada salto del orden de RF-29, de RF-2 y de RF-13, incluidos el
      400 "JSON mal formado" antes del 401, filtros repetidos, vacíos y con `ME`, `me`,
      `m%65` y `%zz`, parámetros desconocidos ignorados y el orden del listado.
- [ ] Hay una prueba del paso del cuerpo de RF-29 (DP-43) en las tres operaciones de
      lectura, que no leen el cuerpo (listar, obtener una cuenta y resumen por juego): con
      JSON mal formado responde 400 "JSON mal formado" y no 401; con un cuerpo de más de
      102 400 bytes, 413; con una codificación no soportada, 415; y con un cuerpo JSON `"x"`,
      `5`, `true`, `false` o `null`, 400 "JSON mal formado"; cada caso sin sesión, con sesión
      y con la credencial de un usuario eliminado, y sin cambiar nada de lo guardado. Las
      operaciones de escritura (vincular, editar, desvincular y resincronizar) ya tienen esa
      prueba. (Añadida el 2026-10-19 con el cambio DP6-37; se marca al terminar su tarea.)
- [x] Hay una prueba por cada caso de RF-39 (dos resincronizaciones, edición y
      resincronización, dos ediciones, desvinculación con edición, desvinculación con
      resincronización y dos desvinculaciones). Cada prueba fuerza el solapamiento de forma
      determinista: detiene la primera operación después de leer la cuenta y antes de
      escribirla, ejecuta la segunda completa y después deja seguir a la primera; comprueba
      las dos respuestas y el estado final de la base.
- [x] Hay una prueba por cada rama de RF-47 que fuerza el borrado del usuario entre la
      revisión de la sesión y la escritura (vincular → 404 "usuario no encontrado" sin
      cuenta; editar y resincronizar → 404 "cuenta no encontrada") y otra en la que la
      vinculación termina antes del borrado (201 y la cuenta se borra con el usuario).
- [x] Hay una prueba de RF-44 (credencial de un usuario eliminado → 401 "token inválido"),
      otra de RF-45 (fallo forzado durante una resincronización deja la cuenta y su número
      de lectura igual) y otras de RF-46 (fallo forzado durante una vinculación no deja la
      cuenta y la vinculación siguiente responde 201; fallo forzado durante una
      desvinculación deja la cuenta completa).
- [x] Una prueba confirma que vincular, editar, resincronizar y desvincular dejan los datos
      guardados del usuario exactamente iguales (RF-46), y otra que eliminar el usuario no
      deja ninguna cuenta cuyo dueño sea él (RF-14).
- [x] Hay pruebas de RF-14 que fuerzan un 500 en la eliminación de un usuario con cuentas
      en los tres juegos en cada punto (antes de borrar ninguna cuenta, tras borrar
      algunas, tras borrarlas todas y tras borrar el usuario) y comprueban en la base que
      queda el estado (1) o el (2) de RF-14 y nunca una cuenta cuyo dueño no exista; en el
      estado (1), que repetir la eliminación con la misma sesión responde 204 y no deja
      cuentas suyas. Otra prueba fuerza una vinculación que crea la cuenta después de que
      la eliminación borrara las demás y comprueba que esa cuenta tampoco sobrevive, con
      la eliminación terminando en 204 y en 500.
- [x] Las pruebas del servidor pasan sin conexión a Internet y sin variables de entorno
      distintas de las de las specs 001 y 002 (RNF-1, RNF-9). Confirmado por el usuario el
      2026-10-19: `npm test` con la red desconectada y con el código ya reescrito
      (T10–T25), 1567 tests, 220 suites, 0 fallos, 0 cancelados, unos 100 s.
- [x] Comprobación de tipos, lint y pruebas del servidor en verde, sin `any`, sin
      `@ts-ignore` y sin ningún `.only`.

## Dudas abiertas
Ninguna.

Resueltas el 2026-10-17: cuenta verificada, proporción de cuentas verificadas, R6 y
evolución de la lectura. Resueltas el 2026-10-18: principio 5, mensajes, P1 (lista de
cuentas del usuario: se retira) y P2 (eliminación del usuario que falla a medias: sin
cuentas huérfanas, opción a; RF-14, DP-42) (ver "Decisiones del usuario").

Deducciones del planner del 2026-10-18 (sin decisión nueva del usuario; derivadas de las
specs aprobadas o del plan aprobado el 2026-10-17; el usuario puede objetarlas al aprobar):
- Identificador de la cuenta con las mismas reglas que el de usuario de la spec 003
  (formato, mayúsculas, decodificación por porcentaje) (hallazgo 1).
- `me`, recorte y decodificación heredados de la spec 003; forma canónica con la misma
  conversión a minúsculas que el correo de la spec 002 (hallazgos 2 y 5).
- Juego exacto, sin recortar y distinguiendo mayúsculas, como la referencia propia `me` de
  la spec 003 (DP-39, hallazgo 3).
- Patrones y regiones copiados literalmente del formulario actual; el mensaje de LoL añade
  los límites (hallazgo 4).
- Conjuntos de RF-41 fijados en la spec (los mismos que usaba el plan) y medidas de cambio
  de RF-42 (DP-40, hallazgos 6 y 7).
- Bandas cerradas con los rangos de generación del plan aprobado y sin límite de variación
  de puntos dentro de la banda, como hacía el plan (DP-34, hallazgo 8).
- Nombres y forma de los campos (`simulated`, `division` omitida) tomados del contrato de
  la interfaz y del plan aprobado (RNF-3, hallazgo 9).
- Orden del listado por identificador de la cuenta y parámetros desconocidos ignorados,
  como los campos ignorados del cuerpo (DP-38, hallazgo 10).
- Respuestas de las operaciones en curso al eliminar el usuario como en la spec 003, RF-22
  (RF-47, hallazgo 22).

## Impacto en otras specs
No se editan desde aquí; cada cambio se hace en su spec cuando el usuario apruebe la
decisión correspondiente.
- Constitución (no es una spec): el principio 5 ya recoge la interpretación del usuario del
  2026-10-18 (Dependencias externas); hecho.
- `AGENTS.md` (no es una spec): ya matiza que el dominio del servidor es copia del de la
  interfaz, salvo la normalización (RF-48), hasta la spec 007; hecho.
- Spec 001: la definición de "variable obligatoria" deja de mencionar las claves de la spec
  004 (RNF-9). La tabla de errores que pasa a su plan (sección 5.7 de la referencia) no
  incluye 503 de fuente ni ningún 409 de esta spec. Su RF-6 (500) vuelve a no tener
  excepción por fuentes.
- Spec 003: ningún cambio de texto. Su RF-5 ya fija "usuario no encontrado", que esta spec
  adopta (RF-13); su RF-22 ya da "token inválido" a la credencial de un usuario eliminado,
  que esta spec adopta (RF-44). Su RF-11 (eliminar la cuenta) ya anuncia que "las specs
  004 y 006 agregan qué más se borra", así que su texto no cambia, pero su comportamiento
  se amplía con RF-14: borra también las cuentas de juego, no borra el usuario mientras
  quede alguna, solo responde 204 cuando no queda nada, y ante un 500 deja el usuario
  existente con su sesión válida (y puede repetir la eliminación) o ya no deja ninguna
  cuenta suya. Las pruebas de su RF-11 siguen valiendo (un usuario sin cuentas). El
  usuario no gana ningún campo de cuentas: ni la
  spec 003 ni el usuario que implementó lo tienen (comprobado el 2026-10-18), y la
  retirada de la lista (DP-16 revocada) hace que siga así; su RNF-2 no se ve afectado.
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
  normalización de LoL y R6 (DP-26, RF-48) cambia las distancias respecto de la interfaz
  actual. Cada candidato lleva la marca `simulated` en su cuenta (RF-37) y su cuenta no
  lleva partidas (DP-32). Sus mensajes deben seguir la regla de minúscula y sin punto
  final.
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
    verificada, guiada por `simulated` (RF-37; el texto lo fija 007; puede ser "Datos de
    demostración"); la pista de la cuenta demo sigue solo en el modo simulado. RF-16 usa
    "verificada" para la marca fijada por el simulador, etiquetada como simulada (RF-41),
    no para "el dueño inició sesión en la plataforma del juego". El botón de
    resincronizar debe reflejar que el rango puede moverse un escalón y que llegan
    partidas nuevas (RF-42). El modo simulado del navegador (RF-10) debe adoptar la
    escala, las bandas cerradas y la normalización de DP-2, DP-26 y DP-34 (RF-48) y, si se
    puede, la misma lectura determinista y su evolución. El gráfico del historial no debe
    suponer que la fecha del último elemento es la del rango vigente (DP-36). El
    comentario de la tendencia en el contrato de la interfaz ("variación en los últimos 30
    días") debe decir "vigente menos el primero del historial" (DP-30). Los mensajes de
    error que la interfaz repite del servidor pasan a los textos en minúscula y sin punto
    final de esta spec (DP-6), incluidos el de Riot ID con sus límites y el 403 genérico.
    La credencial de un usuario eliminado responde 401 "token inválido" (RF-44): su RF-7
    (volver a login ante un 401) lo cubre igual.
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
  los entornos, aunque no haya datos de demostración precargados. Al retirarse la lista de
  cuentas (P1, opción a) y resolverse P2 sin transacciones (opción a) no se exige MongoDB en
  replica set.
- Spec 006 (no se edita desde aquí): cuando agregue sesiones a la eliminación del usuario,
  conviene que respete el mismo orden y la misma garantía ante un 500 que RF-14 (el
  usuario es lo último que desaparece), para que la cascada completa siga sin dejar datos
  huérfanos.
- `PRODUCT.md` (no es una spec): el principio 2 ("el rango se obtiene, no se declara") y
  "Positioning" quedan en tensión con un rango y una verificación simulados (ver
  "Tensiones reconocidas"); "Operating Context" menciona reobtención periódica y scraping,
  excluidos por DP-24; "Evidence on Hand" sigue siendo cierto (no hay integración viva).

## Decisiones propuestas
DP-18 estaba aprobada antes. Las demás, propuestas por el planificador como la opción
conservadora, las aprobó el usuario el 2026-10-17 ("Apruebo todo"). Las marcadas
"2026-10-18" cambiaron en la revisión de ese día: las que vienen de una decisión del usuario
lo indican; el resto son deducciones del planner que el usuario aprobó con la spec el
2026-10-18 (ver el encabezado), por lo que ya no figuran como pendientes.

| DP | Estado | Decisión propuesta | Alternativa descartada |
| --- | --- | --- | --- |
| DP-2 | Aprobada por el usuario (2026-10-17; cambia) | La escala de CS2 es la que usa hoy la interfaz: Grey a Gold, sin división, puntos = CS Rating. | Niveles 1 a 10 de FACEIT: solo tenían sentido con FACEIT como fuente. |
| DP-5 | Aprobada por el usuario (2026-10-17; cambia) | La región es informativa en los tres juegos: no interviene en la lectura y editarla solo la guarda. | Hacer una lectura al cambiar la región: con un proveedor que no usa la región, produciría cambios de rango sin motivo. |
| DP-6 | **Decisión del usuario (2026-10-18; cambia)** | Textos exactos de todos los errores (los de cada RF), en minúscula y sin punto final, iguales en servidor e interfaz; se reutilizan los de las specs 002 y 003 ("token inválido", "usuario no encontrado", "no tienes permiso para esta operación", "id con formato inválido"). | Textos propios con mayúscula y punto final (versión del 2026-10-17): incoherentes con las specs 001 a 003. Mensajes genéricos del manejador de errores: no dicen al jugador qué corregir. |
| DP-7 | Aprobada por el usuario (2026-10-17; ajusta) | Partidas identificadas por su identificador (texto); unión sin repetidos, orden por fecha con desempate por identificador como texto (código Unicode, de mayor a menor); se conservan 20, siempre con la partida principal de la última lectura. | Reemplazar la lista en cada lectura: perdería partidas guardadas. Desempate numérico: los identificadores no son números. |
| DP-8 | Aprobada por el usuario (2026-10-17; cambia) | Cada lectura entrega entre 1 y 8 partidas con todos los campos (incluido el juego), la principal con fecha = instante actual y las demás anteriores. | Hasta 20 partidas por lectura: llenaría la lista en una sola lectura. Permitir 0: dejaría resúmenes sin tasa de victorias y resincronizaciones sin partidas nuevas. |
| DP-9 | Aprobada por el usuario (2026-10-17; ajusta) | La resincronización agrega fotografía al historial solo si cambió tier, división o puntos respecto del rango vigente; el historial no tiene límite (RNF-10). | Agregar siempre (referencia): llena el historial de puntos repetidos. Limitar el historial descartando los más antiguos: cambiaría la tendencia, que usa el primer elemento. |
| DP-10 | Aprobada por el usuario (2026-10-17; 2026-10-18 precisa) | Orden de errores de RF-29 (cuerpo de la spec 001 → sesión → formato → existencia → propiedad → validación del cuerpo); en RF-2 el filtro de usuario antes que el de juego; un filtro repetido o vacío es inválido (400); filtro de usuario inexistente = lista vacía; RF-5 garantizado ante peticiones simultáneas; `me` no es identificador de cuenta. | Validar el cuerpo antes de la propiedad: daría a un no dueño detalles de validación de una cuenta ajena. Tomar el primer valor de un filtro repetido o tratar el vacío como ausente: ocultaría un error del cliente. |
| DP-11 | Aprobada por el usuario (2026-10-17) | Tasa de victorias redondeada al entero más cercano, mitades hacia arriba (62,5 → 63). | Truncar: subestima sistemáticamente. |
| DP-12 | Aprobada por el usuario (2026-10-17; ajusta) | Sin dependencias nuevas; las pruebas solo se conectan a la base de prueba y fijan el instante sin variables de entorno nuevas. | Librería de datos simulados: el proveedor es una regla pura pequeña y no la justifica. |
| DP-15 | Aprobada por el usuario (2026-10-17; cambia) | Esta spec prevalece sobre la referencia en lo listado en "Qué prevalece"; vuelven a aplicar RF-15 de la referencia (de donde sale la verificada por identificador), 5.1 (proveedor simulado), el campo verificada de 5.4 ("lo fija el proveedor") y 11. | Seguir la referencia en todo: permitiría editar el identificador, contra la decisión del usuario, y dejaría el rango fijo al resincronizar. |
| DP-16 | **Revocada por el usuario (2026-10-18, P1)**; había sido aprobada el 2026-10-17 | *Revocada.* Decía: se mantiene la lista de cuentas en el usuario (vincular agrega, desvincular quita), sin exponerla, prevaleciendo sobre RT-07. Motivo de la revocación: sin transacciones, vincular y desvincular escribían por separado la cuenta y la lista del dueño, y un fallo entre ambas las dejaba incoherentes (y una cuenta huérfana bloqueaba volver a vincular, RF-5). Ahora las cuentas de un usuario son las que lo tienen como dueño (Definiciones) y RF-33 queda retirado. | Mantener la lista con compensación (P1 b): la lista dejaría de ser fiable si la compensación fallara. Mantenerla con transacciones (P1 c): exige MongoDB en replica set en todos los entornos. Exponerla como hace RT-07: cambia la forma de usuario que consume la interfaz (spec 003, RNF-2). |
| DP-17 | Aprobada por el usuario (2026-10-17; cambia) | El mismo identificador en el juego puede vincularlo más de un usuario; todos reciben la misma lectura simulada y la misma marca de verificada (esto último aceptado por el usuario). | Identificador único entre usuarios: un tercero podría bloquear al dueño real. |
| DP-18 | **Aprobada por el usuario** | Para cambiar el identificador en el juego se desvincula y se vuelve a vincular, perdiendo el historial. | Editar el identificador conservando el historial: choca con "identificador no editable". |
| DP-19 | Aprobada por el usuario (2026-10-17); 2026-10-18 precisa, aprobada con la spec | El identificador en el juego se guarda recortado (`String.prototype.trim`, como "Recortar" de la spec 003) y con sus mayúsculas; se compara y se usa en la lectura en su forma canónica (`toLowerCase` sin configuración regional, como el correo de la spec 002); los límites de longitud se miden en unidades UTF-16 sobre el texto recortado. | Guardar la forma canónica: cambiaría lo que escribió el jugador. Comparación exacta: un cambio solo de mayúsculas daría un 400 confuso. Plegar solo ASCII: `Ñandú` y `ñandú` serían cuentas distintas. |
| DP-23 | Aprobada por el usuario (2026-10-17; ajusta) | Editar con cuerpo vacío o solo campos ignorados = 200 sin cambios; región o identificador presentes con valor nulo, vacío o solo caracteres recortables son inválidos (no ausentes). | Tratar nulo o vacío como ausente: ocultaría un error del cliente. |
| DP-24 | Aprobada por el usuario (2026-10-17; cambia) | Ninguna fuente real ni scraping; resincronización solo a pedido del dueño. | Reobtención periódica: sin fuente real solo generaría cambios inventados sin que nadie los pida. |
| DP-26 | Aprobada por el usuario (2026-10-17; cambia); 2026-10-18 precisa | Normalización por escalones: Master, Grandmaster, Challenger (LoL) y Champion (R6) sin división; los puntos no influyen; división ausente o desconocida = la más baja; división en un tier sin divisiones se ignora; tier y división se comparan de forma exacta. Prevalece sobre la normalización de la interfaz (RF-48). | Escala actual de la interfaz: inventa divisiones en tiers que no las tienen y Challenger I sería el único 100. Valer 0 ante una división en un tier sin divisiones: hundiría un Master por un dato sobrante. |
| DP-28 | Aprobada por el usuario (2026-10-17; nueva); 2026-10-18 precisa | Cada cuenta entregada lleva la marca de datos simulados (`simulated: true`), y la interfaz etiqueta con ella el rango, el historial, las partidas y la verificación. | Que la interfaz etiquete todo siempre sin marca del servidor: si un juego tuviera una fuente real, no sabría qué etiquetar. |
| DP-29 | Aprobada por el usuario (2026-10-17; cambia) | Operaciones simultáneas sobre una cuenta dan el mismo resultado que en serie; una desvinculación nunca se deshace por otra operación en curso; eliminar un usuario nunca deja una cuenta suya creada por una vinculación simultánea. | No garantizar nada: dos resincronizaciones podrían duplicar partidas o recrear una cuenta borrada, y una vinculación podría dejar una cuenta sin dueño. |
| DP-30 | Aprobada por el usuario (2026-10-17; nueva) | Tendencia = normalizado vigente − normalizado del primer elemento del historial, sin ventana de tiempo (lo que hace hoy el backend simulado); se corrige el comentario de "30 días" del contrato de la interfaz. | Ventana de 30 días: exige el instante actual en el resumen y daría 0 en una demostración con lecturas del mismo día. |
| DP-31 | Aprobada por el usuario (2026-10-17; cambia) | Todo el contenido de una lectura depende solo del juego, del identificador canónico y del número de lectura; el instante solo fija las fechas. La partida principal es nueva, lleva el instante actual y la unión de RF-28 la conserva siempre entre las 20. | Que el contenido dependa también del instante: la misma resincronización daría resultados distintos según la hora y las pruebas no serían reproducibles. Dar el instante a cualquier partida de la lectura y cortar solo por fecha: la partida realmente nueva podría quedar fuera de las 20. |
| DP-32 | Aprobada por el usuario (2026-10-17; nueva) | La representación de la cuenta no incluye sus partidas; las partidas solo se entregan en el resumen por juego (las 8 primeras). | Incluir las 20 partidas guardadas en la cuenta: cambia la forma de cuenta que consume la interfaz y las candidaturas de la spec 005. |
| DP-33 | Aprobada por el usuario (2026-10-17; nueva) | El número de lectura se guarda con la cuenta como dato interno, no aparece en ninguna respuesta y solo lo consume una resincronización que responde 200; una operación que falla deja la cuenta como estaba. | Exponerlo en la respuesta: cambia la forma que consume la interfaz sin uso para el jugador. Consumirlo aunque falle: la siguiente lectura saltaría un número y las pruebas de valores exactos dependerían de fallos. |
| DP-34 | Aprobada por el usuario (2026-10-17; nueva); 2026-10-18 cierra las bandas, aprobada con la spec | Los puntos de cada fotografía quedan dentro de la banda cerrada de su escalón: LoL 0–99 LP con división y 0–999 en Master+; CS2 en bandas de 5000 CS Rating (Grey 0–4999 … Gold 30000–34999); R6 100 MMR por división desde Copper V 1000–1099, Champion 4500–4999. Entre lecturas, cualquier valor de la banda del nuevo escalón. Son los rangos de generación del plan aprobado. | Bandas abiertas (versión del 2026-10-17): no se podía probar un tope. Limitar la variación de puntos entre lecturas: realismo que nadie pidió y que complica la regla. Puntos libres sin relación con el tier: "Grey · 28000 CS Rating". |
| DP-35 | Aprobada por el usuario (2026-10-17; nueva); 2026-10-18 precisa, aprobada con la spec | La región se recorta, se compara sin distinguir mayúsculas solo en letras ASCII y se guarda con la grafía de la lista del juego. | Comparación exacta: rechazaría `" LAS"` o `"las"`. Plegado de mayúsculas de Unicode: `"KR"` (signo de kelvin) valdría como `KR`. Guardar lo enviado: la misma región aparecería escrita de varias formas. |
| DP-36 | Aprobada por el usuario (2026-10-17; nueva) | El historial va en el orden de las lecturas que lo agregaron, no por fecha; su último elemento coincide con el vigente en tier, división, puntos y normalizado, y puede tener una fecha anterior. | Reordenar por fecha: con el reloj atrasado el vigente dejaría de ser el último. Agregar siempre para igualar fechas: contradice DP-9. |
| DP-37 | **Decisión del usuario (2026-10-18; cambia)** | Una credencial válida cuyo usuario ya no existe responde 401 "token inválido" (spec 002, RF-22; spec 003, RF-22), sin crear ni cambiar nada. Una operación ya en curso cuando se elimina el usuario responde como en la spec 003, RF-22: vincular, 201 o 404 "usuario no encontrado"; operar sobre una cuenta, 200/204 o 404 "cuenta no encontrada" (RF-47). | 401 "sesión no iniciada" (versión del 2026-10-17): contradice las specs 002 y 003 y lo que ya devuelve el servidor. |
| DP-38 | 2026-10-18, nueva, aprobada con la spec | Listado ordenado por identificador de la cuenta ascendente, sin tope ni paginación; parámetros de consulta desconocidos ignorados. | Ordenar por fecha de sincronización: el orden cambiaría con cada resincronización. Responder 400 ante un parámetro desconocido: más estricto que el trato de los campos del cuerpo (RF-7). |
| DP-39 | 2026-10-18, nueva, aprobada con la spec | El juego es el texto exacto `lol`, `r6` o `cs2`: no se recorta ni se pliegan mayúsculas, en el cuerpo, en el filtro y en la ruta del resumen. | Recortarlo y plegar mayúsculas como la región: el juego es un código que elige la interfaz, no un texto que escribe el jugador, igual que `me` en la spec 003. |
| DP-40 | 2026-10-18, nueva, aprobada con la spec | Los conjuntos de 100 identificadores de RF-41 los fija la spec (no el plan), y RF-42 exige que el rango cambie de verdad con dos medidas sobre esos conjuntos. | Dejar el conjunto al plan: la proporción se cumpliría por construcción. No medir el cambio: un generador constante cumpliría RF-42. |
| DP-41 | 2026-10-18, nueva, aprobada con la spec | RF-39 cubre también edición con resincronización, dos ediciones y dos desvinculaciones, con resultado igual al serial. | Cubrir solo dos resincronizaciones y desvinculación: una edición simultánea a una resincronización podría perder la región o la lectura. |
| DP-42 | **Decisión del usuario (2026-10-18; nueva, P2)** | La eliminación del usuario nunca deja cuentas cuyo dueño no exista: el usuario es lo último que se borra, y tras un 500 o el usuario sigue existiendo (con todas, algunas o ninguna de sus cuentas, y puede repetir la eliminación) o ya no queda ninguna cuenta suya (RF-14). Sin transacciones. | Todo o nada (P2 b): exige transacciones (MongoDB en replica set) o restaurar las cuentas ya borradas. Sin garantía (P2 c): cuentas sin dueño visibles en el listado que nadie puede editar ni desvincular. |
| DP-43 | Usuario (2026-10-19, DP6-37); nueva, aprobada por el usuario el 2026-10-19 (se documenta lo actual, sin cambio de código; ver "Decisiones del usuario") | El orden de errores es global al servidor: el paso del cuerpo de RF-29 (primer punto: 400 "JSON mal formado", 413 y 415, en todas las operaciones, aunque no lean el cuerpo) va antes de la sesión y es la única excepción a «401 primero», igual que en la spec 006 (RF-20, DP6-37). Este cambio solo lo nombra como excepción única en RF-1, RF-29, RF-44 y los casos límite; no cambia lo que el paso rechaza. | Pasar la sesión antes que el cuerpo («401 primero» sin excepción): contradice lo que ya hace el servidor y dejaría dos órdenes de errores distintos en el mismo servidor, uno en esta spec y otro en la 006. Igualar con la 006 el tratamiento del JSON escalar o de `[]` (en cualquier sentido): cambiaría el servidor sin que nadie lo pida; el usuario eligió documentar lo actual y mantener la diferencia. |

Retiradas en esta versión: DP-1 (cola Solo/Dúo), DP-3 (CS2 sin partidas), DP-4 (campos de
partida ausentes), DP-13 (claves opcionales), DP-14 (vuelta de Steam), DP-20 (fallos de
fuente), DP-22 (verificar una cuenta ya verificada), DP-25 (R6 sin rango, resuelta por la
decisión del usuario "R6 con rango") y DP-27 (resumen sin tasa de victorias: toda cuenta
tiene partidas). DP-21 no se usa.
