# Spec 004 — Cuentas de juego y rango desde fuentes oficiales
Estado: borrador

## Contexto y objetivo
El rango es la segunda mitad del cruce y se obtiene, no se declara (`PRODUCT.md`,
principio 2). Por decisión del usuario, la aplicación no usa rango ni cuentas simuladas:
el rango, las partidas y la identidad de cada cuenta salen de las fuentes oficiales de
cada juego, en desarrollo y en producción. Ningún entorno de ejecución tiene un proveedor
simulado.

Esta spec agrega la entidad cuenta de juego con sus cinco operaciones REST, la lectura del
rango desde la fuente de cada juego, la resincronización, la verificación de propiedad y el
resumen por juego que alimenta el perfil.

- Depende de: spec 003.
- Origen: HU-06, HU-08 y HU-13 (cuentas); RF-07 (cascada de cuentas), RF-09 y RF-11 a RF-14
  de la spec original.
- Las decisiones técnicas ya tomadas (sección 2 —entidades, códigos 400 y 403—, RT-07 a
  RT-12, secciones 5.4 —cuenta de juego—, 8 —`unit/` y `accounts.test.ts`—) están en
  `specs/_referencia/001-crear-backend-original.md` y pasan al `plan.md` de esta spec.
- Quedan sin efecto y no pasan al plan: RF-15 de la referencia (proveedor simulado y
  determinista), el `rankProvider` simulado de la sección 5.1 y la exclusión de las
  integraciones reales de la sección 11.

### Fuentes por juego
| Juego | Identidad de la cuenta | Rango | Partidas | Verificación de propiedad |
| --- | --- | --- | --- | --- |
| LoL | Riot ID, confirmado en la API oficial de Riot | API oficial de Riot | API oficial de Riot | No disponible en este hito: exige Riot Sign On con clave de producción aprobada |
| CS2 | SteamID64, confirmado en Steam | Nivel y ELO de la FACEIT Data API oficial, consultada por SteamID64 (solo jugadores con cuenta FACEIT). Rango Premier desde la API pública de Leetify solo si se confirma (ver dudas) | [NECESITA ACLARACIÓN] | Inicio de sesión en Steam (Steam OpenID) |
| R6 | Ubisoft ID declarado, sin comprobación | No disponible: Ubisoft no ofrece API oficial | No disponible | Nunca |

- LoL usa la clave de desarrollo de Riot, que caduca cada 24 horas y se renueva a mano antes
  de cada demostración o evaluación (cómo se documenta: spec 010). Mientras está caducada,
  vincular y resincronizar cuentas LoL responden "fuente no disponible" (RF-17).
- R6 se puede vincular, pero sin rango ni partidas hasta que exista una fuente oficial
  (decisión delegada por el usuario en el coordinador). Esto deja a R6 sin la mitad de
  rango del cruce, en tensión con el principio 1 de `PRODUCT.md`; cómo se comportan las
  coincidencias de R6 lo define la spec 005. La decisión es reversible si aparece una
  fuente oficial.
- Nadie ha confirmado todavía en la documentación oficial la disponibilidad, los límites ni
  las condiciones de uso de ninguna de estas fuentes. Se confirman antes del plan (ver
  dudas abiertas).

## Usuarios
- Jugador que vincula sus cuentas de League of Legends, Rainbow Six Siege y Counter-Strike 2.
- Jugador que revisa el rango y las partidas propias o de otros.

## Historias de usuario
- HU-1. Como jugador, quiero vincular mi cuenta de cada juego que juego para que la
  plataforma obtenga mi rango de la fuente oficial sin que yo lo declare.
- HU-2. Como jugador, quiero corregir la región de una cuenta y desvincularla cuando deje
  de usarla.
- HU-3. Como jugador, quiero pedir una nueva lectura del rango para que refleje mi nivel actual.
- HU-4. Como jugador, quiero ver, por juego, el rango vigente, su evolución y las últimas
  partidas, míos o de otro jugador.
- HU-5. Como jugador, quiero que nadie más pueda modificar, verificar ni desvincular mis
  cuentas.
- HU-6. Como jugador de CS2, quiero demostrar que la cuenta es mía iniciando sesión en
  Steam para que otros vean que mi cuenta está verificada.

## Definiciones
- **Juego**: uno de `lol`, `r6` o `cs2`.
- **Identificador de cuenta**: Riot ID (LoL), Ubisoft ID (R6) o SteamID64 (CS2). Se valida
  con el mismo patrón por juego que usa hoy el formulario de vinculación. No se puede
  editar: para cambiarlo se desvincula la cuenta y se vuelve a vincular (decisión del
  usuario).
- **Región válida**: una de la lista de regiones del juego que usa hoy el formulario.
- **Fuente**: cada fuente oficial que consulta una lectura del juego, según la tabla
  "Fuentes por juego". La fuente de identidad (Riot en LoL, Steam en CS2) decide si el
  jugador existe; que FACEIT (o Leetify) no conozca al jugador no lo hace inexistente,
  solo lo deja sin ese rango.
- **Juego sin fuente de rango**: R6.
- **Lectura**: respuesta de la fuente para una cuenta en un instante: confirma que el
  jugador existe y entrega su rango vigente (o que no tiene) y sus partidas recientes.
- **Fotografía de rango**: tier, división y puntos cuando el juego los usa, valor
  normalizado y fecha de lectura.
- **Rango normalizado**: valor de 0 a 100 dentro de la escala de cada juego; el tier más
  bajo vale 0 y el más alto 100. La escala de CS2 está pendiente (ver dudas).
- **Cuenta sin rango**: cuenta sin rango vigente, porque su juego no tiene fuente de rango
  o porque la última lectura confirmó al jugador sin rango (ej. sin clasificar en la
  temporada o sin cuenta FACEIT).
- **Fuente no disponible**: alguna de las fuentes que consulta la lectura no responde
  dentro del tiempo máximo (RNF-5), está caída, rechaza la clave (inválida o caducada) o
  rechaza la petición por límite de peticiones.
- **Cuenta verificada**: el dueño demostró que la cuenta es suya iniciando sesión en la
  plataforma del juego (decisión del usuario). En este hito solo es posible en CS2.
- **Resumen por juego**: la cuenta, sus últimas 8 partidas (la más reciente primero), la
  tasa de victorias (porcentaje redondeado de victorias en esas partidas; 0 si no hay) y la
  tendencia (normalizado vigente menos el normalizado más antiguo del historial; 0 si no
  hay rango vigente o el historial está vacío).

## Requisitos funcionales
- RF-1: EL SISTEMA exige sesión válida en todas las operaciones de esta spec.
- RF-2: CUANDO un usuario lista cuentas, EL SISTEMA responde 200 con las cuentas que cumplen
  los filtros opcionales de usuario (identificador o referencia propia) y de juego.
- RF-3: CUANDO un usuario pide una cuenta por su identificador, EL SISTEMA responde 200 con
  ella; para identificadores inválidos o inexistentes aplica la regla de la spec 003 (RF-5).
- RF-4: CUANDO un usuario vincula una cuenta de LoL o CS2 con juego, identificador y región
  válidos y la fuente entrega una lectura, EL SISTEMA crea la cuenta a nombre del usuario
  de la sesión, no verificada, guarda el rango de la lectura como rango vigente y como
  primer elemento del historial (si la lectura trae rango), guarda sus partidas, registra
  la fecha de sincronización y responde 201 con la cuenta.
- RF-5: SI el usuario ya tiene una cuenta en ese juego, ENTONCES EL SISTEMA responde 400 y no
  crea otra.
- RF-6: SI el juego no existe, el identificador no cumple el patrón del juego o la región no
  pertenece al juego, ENTONCES EL SISTEMA responde 400 con un mensaje específico, sin
  consultar la fuente.
- RF-7: EL SISTEMA ignora al vincular cualquier campo distinto de juego, identificador y
  región, y al editar cualquier campo distinto de identificador y región (incluido el
  juego); en ambos casos se ignoran dueño, rango, historial, partidas y verificación.
- RF-8: CUANDO el dueño edita la región de su cuenta con un valor válido, EL SISTEMA la
  guarda y responde 200 con la cuenta.
- RF-9: CUANDO el dueño desvincula su cuenta, EL SISTEMA la borra junto con su historial y
  sus partidas, y responde 204.
- RF-10: CUANDO el dueño pide resincronizar una cuenta de LoL o CS2 y la fuente entrega una
  lectura, EL SISTEMA agrega al historial la fotografía de rango leída (si la lectura trae
  rango), la deja como rango vigente, incorpora las partidas nuevas sin repetir las ya
  guardadas, actualiza la fecha de sincronización y responde 200 con la cuenta.
- RF-11: SI quien edita, desvincula, resincroniza o verifica una cuenta no es su dueño,
  ENTONCES EL SISTEMA responde 403 y no cambia nada.
- RF-12: CUANDO un usuario pide el resumen de un juego para cualquier usuario (o la
  referencia propia), EL SISTEMA responde 200 con el resumen por juego.
- RF-13: SI el usuario consultado no tiene cuenta en ese juego, ENTONCES EL SISTEMA responde
  404; SI el juego no existe, ENTONCES responde 400.
- RF-14: CUANDO se elimina un usuario (spec 003, RF-11), EL SISTEMA borra también todas sus
  cuentas de juego.
- RF-15: EL SISTEMA conserva como máximo 20 partidas recientes por cuenta.
- RF-16: SI la fuente de identidad responde que no existe un jugador con ese identificador
  en esa región, ENTONCES EL SISTEMA responde 404 con "Jugador no encontrado."; al vincular
  no crea la cuenta y al resincronizar conserva rango vigente, historial, partidas y fecha
  de sincronización.
- RF-17: SI la fuente no está disponible, ENTONCES EL SISTEMA responde 503 con "Fuente no
  disponible, inténtalo más tarde."; al vincular no crea la cuenta y al resincronizar
  conserva rango vigente, historial, partidas y fecha de sincronización.
- RF-18: EL SISTEMA nunca responde 401 por un rechazo de la fuente (por ejemplo, una clave
  caducada); ese caso se responde según RF-17, para que el cliente no lo confunda con una
  sesión inválida (spec 007, RF-7).
- RF-19: CUANDO un usuario vincula una cuenta de R6 con identificador y región válidos, EL
  SISTEMA la crea a nombre del usuario de la sesión sin consultar ninguna fuente, sin rango
  vigente, con historial y partidas vacíos, no verificada, y responde 201 con la cuenta.
- RF-20: SI el dueño pide resincronizar una cuenta de un juego sin fuente de rango,
  ENTONCES EL SISTEMA responde 409 con "Rango no disponible: Ubisoft no ofrece API
  oficial." y no cambia nada.
- RF-21: CUANDO la lectura confirma que el jugador existe pero no tiene rango vigente, EL
  SISTEMA deja la cuenta sin rango vigente, no agrega ningún elemento al historial y guarda
  las partidas que la lectura entregue.
- RF-22: SI la edición de una cuenta incluye un identificador distinto del actual,
  ENTONCES EL SISTEMA responde 400 con un mensaje que indica que el identificador no se
  puede editar y que hay que desvincular la cuenta y volver a vincularla, y no cambia nada.
- RF-23: CUANDO el dueño de una cuenta de CS2 completa el inicio de sesión en Steam y Steam
  confirma una identidad con el mismo SteamID64 de la cuenta, EL SISTEMA marca la cuenta
  como verificada y responde 200 con la cuenta.
- RF-24: SI Steam no confirma la identidad (respuesta inválida, alterada, ya usada o
  cancelada) o el SteamID64 confirmado es distinto del de la cuenta, ENTONCES EL SISTEMA
  responde 400 con un mensaje específico y no cambia la verificación.
- RF-25: SI se pide verificar una cuenta de LoL o R6, ENTONCES EL SISTEMA responde 409 con
  un mensaje que indica que la verificación no está disponible para ese juego.
- RF-26: EL SISTEMA solo marca una cuenta como verificada por RF-23; toda cuenta recién
  vinculada queda no verificada.

## Requisitos no funcionales
- RNF-1: Las pruebas automáticas de esta spec no hacen peticiones a las fuentes reales ni
  necesitan sus claves: verifican RF-4, RF-10, RF-16, RF-17, RF-21, RF-23 y RF-24
  sustituyendo las respuestas de la fuente dentro de las pruebas, y pasan con la red
  desactivada. Esto no introduce datos simulados en la aplicación.
- RNF-2: Nada inventado (constitución, principio 5; `PRODUCT.md`, principio 5): si la fuente
  no entrega un dato, el sistema no lo rellena con valores de ejemplo, y no existe proveedor
  simulado en ningún entorno de ejecución.
- RNF-3: Las respuestas tienen los mismos campos y formatos que consume hoy la interfaz,
  salvo que el rango vigente puede faltar (cuenta sin rango); la spec 007 adapta la interfaz.
- RNF-4: Las claves de las fuentes externas son secretos (constitución, principio 5): se leen
  de variables de entorno obligatorias en desarrollo y producción y no exigidas en prueba,
  figuran sin valor en el archivo de ejemplo de variables (spec 001, RF-9) y nunca aparecen
  en respuestas, registros ni en la interfaz.
- RNF-5: Si una fuente no responde en 10 segundos, la petición se trata como fuente no
  disponible (RF-17).
- RNF-6: La verificación con Steam no relaja la cookie SameSite=Strict ni la protección
  anti-CSRF de la spec 002.

## Casos límite
- Un tier que no existe en la escala del juego se normaliza a 0.
- Para un juego sin divisiones, la fotografía no incluye división.
- Jugador de LoL sin clasificar o de CS2 sin cuenta FACEIT (y sin Premier): la cuenta se
  vincula como cuenta sin rango (RF-21); no es un "jugador no encontrado".
- Una resincronización que encuentra al jugador sin rango (ej. nueva temporada) deja la
  cuenta sin rango vigente y conserva el historial anterior (RF-21).
- Clave de Riot caducada: vincular o resincronizar una cuenta LoL responde 503 (RF-17), nunca
  401 (RF-18); las cuentas ya guardadas siguen leyéndose con su último rango.
- El SteamID64 cumple el patrón pero no corresponde a ninguna cuenta de Steam: 404 (RF-16).
- Desvincular y volver a vincular una cuenta CS2 la deja no verificada hasta verificarla de
  nuevo (RF-26).
- Editar enviando el mismo identificador actual junto con una región nueva: se guarda la
  región (el identificador igual no es un cambio).
- Una cuenta sin partidas tiene tasa de victorias 0; con historial de un solo elemento, la
  tendencia es 0.
- Dos usuarios distintos pueden vincular cuentas del mismo juego.

## Fuera de alcance
- Fuente de rango para R6 (no existe una oficial).
- Verificación de cuentas LoL (Riot Sign On) y R6.
- Resincronización periódica automática del rango.
- Renovación automática de la clave de desarrollo de Riot.
- Coincidencias (spec 005) e interfaz, incluido el paso por Steam en el navegador (spec 007).

## Criterios de finalización
- [ ] Las condiciones de cada fuente (dudas abiertas 1 y 2) están confirmadas en la
      documentación oficial antes de aprobar el plan.
- [ ] Las reglas de normalización tienen pruebas unitarias: tier más bajo = 0, más alto =
      100, tier inexistente = 0, juego sin divisiones.
- [ ] Cada RF tiene al menos una prueba automática en verde que verifica la respuesta y,
      en las escrituras, la base de datos.
- [ ] Una prueba confirma que vincular con un dueño, un rango o una verificación en el cuerpo
      deja la cuenta a nombre del usuario de la sesión, con el rango de la lectura y no
      verificada.
- [ ] Las pruebas del servidor pasan con la red desactivada y sin claves de fuentes en el
      entorno de prueba (RNF-1).
- [ ] Un recorrido manual con la clave de Riot vigente vincula y resincroniza una cuenta LoL
      real del equipo, y verifica con Steam una cuenta CS2 real.
- [ ] Comprobación de tipos y pruebas del servidor en verde.

## Dudas abiertas
- [NECESITA ACLARACIÓN] (condición previa al plan) Confirmar en la documentación oficial,
  sin darlo por hecho: que la API de Riot entrega el rango y las partidas a partir del Riot
  ID y la región con la clave de desarrollo, y si sus límites de peticiones permiten leer
  hasta 20 partidas por vinculación; que los términos de Riot permiten usar la clave de
  desarrollo en la demostración desplegada; que la FACEIT Data API permite buscar al
  jugador por SteamID64 y entrega nivel y ELO de CS2; que Steam permite confirmar que un
  SteamID64 existe y verificar la identidad por OpenID.
- [NECESITA ACLARACIÓN] (condición previa al plan) ¿Existe una API pública de Leetify,
  usable con sus condiciones, que entregue el rango Premier por SteamID64? Si no se
  confirma, CS2 queda sin Premier y su rango sale solo de FACEIT.
- [NECESITA ACLARACIÓN] ¿Qué cola de LoL define el rango: Solo/Dúo, Flexible o la más alta
  de las dos?
- [NECESITA ACLARACIÓN] Escala de CS2: ¿el rango normalizado (y con él la distancia y el
  puntaje de la spec 005) sale de FACEIT, de Premier o de una combinación, y cómo se
  normaliza cada escala a 0-100? Afecta también a qué se guarda como tier y puntos.
- [NECESITA ACLARACIÓN] Partidas de CS2: ¿se toman las partidas de FACEIT (solo existen para
  jugadores con FACEIT), las de Leetify si se confirma, o CS2 queda sin partidas?
- [NECESITA ACLARACIÓN] Variación de rango por partida: si la fuente no la entrega (la
  interfaz muestra hoy una variación por partida), ¿se omite en la interfaz o se muestra
  como desconocida? No puede inventarse (RNF-2).
- [NECESITA ACLARACIÓN] Al cambiar la región de una cuenta LoL, ¿se hace una lectura nueva
  en el acto (y si la fuente falla, se rechaza el cambio) o solo se guarda y se aplica en
  la siguiente resincronización?
